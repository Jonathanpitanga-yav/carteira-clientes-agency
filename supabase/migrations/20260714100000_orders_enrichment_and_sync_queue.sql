-- ============================================================
-- Migration: Orders enrichment + jobs sync queue
-- Documents schema already applied on project tnbruzzlgissagxsqrge
-- Idempotent (ADD COLUMN IF NOT EXISTS / CREATE IF NOT EXISTS)
-- ============================================================

CREATE SCHEMA IF NOT EXISTS jobs;
CREATE SCHEMA IF NOT EXISTS sales;

-- ------------------------------------------------------------
-- 1) sales.global_order_statuses
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sales.global_order_statuses (
  slug TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0
);

INSERT INTO sales.global_order_statuses (slug, label, sort_order) VALUES
  ('draft', 'Rascunho', 1),
  ('pending', 'Pendente', 2),
  ('approved', 'Aprovado', 3),
  ('in_production', 'Em Produção', 4),
  ('invoiced', 'Faturado', 5),
  ('shipped', 'Enviado', 6),
  ('delivered', 'Entregue', 7),
  ('canceled', 'Cancelado', 8),
  ('returned', 'Devolvido', 9),
  ('refunded', 'Reembolsado', 10)
ON CONFLICT (slug) DO UPDATE
SET label = EXCLUDED.label,
    sort_order = EXCLUDED.sort_order;

-- ------------------------------------------------------------
-- 2) Dictionary tables
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sales.erp_carriers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id UUID NOT NULL REFERENCES integration.client_applications(id) ON DELETE CASCADE,
  external_id TEXT NOT NULL,
  name TEXT NOT NULL,
  carrier_type TEXT,
  external_code TEXT,
  is_active BOOLEAN DEFAULT true,
  services JSONB DEFAULT '[]'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_carrier_per_app UNIQUE (app_id, external_id)
);

CREATE INDEX IF NOT EXISTS idx_erp_carriers_app_id ON sales.erp_carriers (app_id);

CREATE TABLE IF NOT EXISTS sales.erp_marketplaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id UUID NOT NULL REFERENCES integration.client_applications(id) ON DELETE CASCADE,
  external_id TEXT NOT NULL,
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_marketplace_per_app UNIQUE (app_id, external_id)
);

CREATE INDEX IF NOT EXISTS idx_erp_marketplaces_app_id ON sales.erp_marketplaces (app_id);

CREATE TABLE IF NOT EXISTS sales.erp_status_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id UUID NOT NULL REFERENCES integration.client_applications(id) ON DELETE CASCADE,
  erp_status_code TEXT NOT NULL,
  erp_status_label TEXT NOT NULL,
  global_status TEXT NOT NULL REFERENCES sales.global_order_statuses(slug),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_erp_status_mapping UNIQUE (app_id, erp_status_code)
);

CREATE INDEX IF NOT EXISTS idx_erp_status_mappings_app_id ON sales.erp_status_mappings (app_id);

-- ------------------------------------------------------------
-- 3) jobs.settings / jobs.sync_queue
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS jobs.settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS jobs.sync_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id UUID NOT NULL,
  client_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status = ANY (ARRAY['pending'::text, 'processing'::text, 'completed'::text, 'failed'::text])),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0
);

-- ------------------------------------------------------------
-- 4) sales.invoices enrichment columns
-- ------------------------------------------------------------
ALTER TABLE sales.invoices ADD COLUMN IF NOT EXISTS erp_order_number TEXT;
ALTER TABLE sales.invoices ADD COLUMN IF NOT EXISTS marketplace_id TEXT;
ALTER TABLE sales.invoices ADD COLUMN IF NOT EXISTS marketplace_name TEXT;
ALTER TABLE sales.invoices ADD COLUMN IF NOT EXISTS marketplace_order_id TEXT;
ALTER TABLE sales.invoices ADD COLUMN IF NOT EXISTS freight_value NUMERIC(15,2) DEFAULT 0;
ALTER TABLE sales.invoices ADD COLUMN IF NOT EXISTS freight_paid_by TEXT;
ALTER TABLE sales.invoices ADD COLUMN IF NOT EXISTS commission_fee NUMERIC(15,2) DEFAULT 0;
ALTER TABLE sales.invoices ADD COLUMN IF NOT EXISTS commission_base NUMERIC(15,2) DEFAULT 0;
ALTER TABLE sales.invoices ADD COLUMN IF NOT EXISTS discount_value NUMERIC(15,2) DEFAULT 0;
ALTER TABLE sales.invoices ADD COLUMN IF NOT EXISTS carrier_id UUID;
ALTER TABLE sales.invoices ADD COLUMN IF NOT EXISTS carrier_name TEXT;
ALTER TABLE sales.invoices ADD COLUMN IF NOT EXISTS tracking_code TEXT;
ALTER TABLE sales.invoices ADD COLUMN IF NOT EXISTS tracking_url TEXT;
ALTER TABLE sales.invoices ADD COLUMN IF NOT EXISTS shipping_method TEXT;
ALTER TABLE sales.invoices ADD COLUMN IF NOT EXISTS shipping_method_external_id TEXT;
ALTER TABLE sales.invoices ADD COLUMN IF NOT EXISTS global_status TEXT DEFAULT 'pending';
ALTER TABLE sales.invoices ADD COLUMN IF NOT EXISTS erp_status_code TEXT;
ALTER TABLE sales.invoices ADD COLUMN IF NOT EXISTS erp_status_label TEXT;
ALTER TABLE sales.invoices ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE sales.invoices ADD COLUMN IF NOT EXISTS order_type TEXT;
ALTER TABLE sales.invoices ADD COLUMN IF NOT EXISTS sales_channel TEXT;

ALTER TABLE sales.invoices DROP CONSTRAINT IF EXISTS invoices_status_check;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'invoices_carrier_id_fkey'
      AND conrelid = 'sales.invoices'::regclass
  ) THEN
    ALTER TABLE sales.invoices
      ADD CONSTRAINT invoices_carrier_id_fkey
      FOREIGN KEY (carrier_id) REFERENCES sales.erp_carriers(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'invoices_global_status_fkey'
      AND conrelid = 'sales.invoices'::regclass
  ) THEN
    ALTER TABLE sales.invoices
      ADD CONSTRAINT invoices_global_status_fkey
      FOREIGN KEY (global_status) REFERENCES sales.global_order_statuses(slug);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_invoices_carrier_id ON sales.invoices (carrier_id);
CREATE INDEX IF NOT EXISTS idx_invoices_erp_order_number ON sales.invoices (erp_order_number);
CREATE INDEX IF NOT EXISTS idx_invoices_global_status ON sales.invoices (global_status);
CREATE INDEX IF NOT EXISTS idx_invoices_marketplace_id ON sales.invoices (marketplace_id);

-- ------------------------------------------------------------
-- 5) RPC: sync queue
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION jobs.enqueue_sync(p_app_ids uuid[])
RETURNS SETOF jobs.sync_queue
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_app_id UUID;
  v_client_id UUID;
  v_row jobs.sync_queue%ROWTYPE;
BEGIN
  FOREACH v_app_id IN ARRAY p_app_ids
  LOOP
    SELECT client_id INTO v_client_id
    FROM integration.client_applications
    WHERE id = v_app_id AND status = 'active';

    IF v_client_id IS NOT NULL THEN
      INSERT INTO jobs.sync_queue (app_id, client_id)
      VALUES (v_app_id, v_client_id)
      RETURNING * INTO v_row;

      INSERT INTO core.audit_logs (action, entity_type, entity_id, payload)
      VALUES (
        'sync.enqueued', 'integration', v_app_id,
        jsonb_build_object('queue_id', v_row.id, 'client_id', v_client_id)
      );

      RETURN NEXT v_row;
    END IF;
  END LOOP;
  RETURN;
END;
$function$;

CREATE OR REPLACE FUNCTION jobs.acquire_pending_syncs(p_limit integer DEFAULT 2)
RETURNS SETOF jobs.sync_queue
LANGUAGE sql
SECURITY DEFINER
AS $function$
  UPDATE jobs.sync_queue
  SET status = 'processing', started_at = now()
  WHERE id IN (
    SELECT id
    FROM jobs.sync_queue
    WHERE status = 'pending'
    ORDER BY created_at ASC
    LIMIT p_limit
    FOR UPDATE SKIP LOCKED
  )
  RETURNING *;
$function$;

CREATE OR REPLACE FUNCTION jobs.complete_sync(
  p_id uuid,
  p_status text,
  p_error text DEFAULT NULL::text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  UPDATE jobs.sync_queue
  SET
    status = p_status,
    completed_at = now(),
    error = p_error,
    retry_count = CASE WHEN p_status = 'failed' THEN retry_count + 1 ELSE retry_count END
  WHERE id = p_id;
END;
$function$;

CREATE OR REPLACE FUNCTION jobs.trigger_process_sync_queue()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_project_ref text;
  v_service_key text;
  v_url text;
  v_result bigint;
BEGIN
  v_project_ref := current_setting('app.settings.project_ref', true);
  SELECT value INTO v_service_key FROM jobs.settings WHERE key = 'service_key';

  IF v_project_ref IS NULL THEN
    v_project_ref := 'tnbruzzlgissagxsqrge';
  END IF;

  v_url := 'https://' || v_project_ref || '.supabase.co/functions/v1/erp-process-sync-queue';

  SELECT net.http_post(
    url := v_url,
    body := '{}'::jsonb,
    params := '{}'::jsonb,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || COALESCE(v_service_key, '')
    ),
    timeout_milliseconds := 240000
  ) INTO v_result;

  RETURN 'Sync queue processamento disparado. Request ID: ' || v_result;
END;
$function$;

CREATE OR REPLACE FUNCTION jobs.recover_stuck_syncs()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_count INT;
BEGIN
  UPDATE jobs.sync_queue
  SET status = 'pending', started_at = NULL
  WHERE status = 'processing'
    AND started_at < now() - interval '30 minutes';

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count || ' item(s) recuperados para pending.';
END;
$function$;

CREATE OR REPLACE FUNCTION jobs.sync_queue_count()
RETURNS TABLE(status text, count bigint)
LANGUAGE plpgsql
STABLE
AS $function$
BEGIN
  RETURN QUERY
  SELECT sq.status::TEXT, COUNT(*)::BIGINT
  FROM jobs.sync_queue sq
  GROUP BY sq.status;
END;
$function$;

CREATE OR REPLACE FUNCTION public.enqueue_sync(p_app_ids uuid[])
RETURNS SETOF jobs.sync_queue
LANGUAGE sql
SECURITY DEFINER
AS $function$
  SELECT * FROM jobs.enqueue_sync(p_app_ids);
$function$;

CREATE OR REPLACE FUNCTION public.acquire_pending_syncs(p_limit integer DEFAULT 3)
RETURNS SETOF jobs.sync_queue
LANGUAGE sql
SECURITY DEFINER
AS $function$
  SELECT * FROM jobs.acquire_pending_syncs(p_limit);
$function$;

CREATE OR REPLACE FUNCTION public.complete_sync(
  p_id uuid,
  p_status text,
  p_error text DEFAULT NULL::text
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $function$
  SELECT jobs.complete_sync(p_id, p_status, p_error);
$function$;

GRANT EXECUTE ON FUNCTION public.enqueue_sync(uuid[]) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.acquire_pending_syncs(integer) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.complete_sync(uuid, text, text) TO anon, authenticated, service_role;

-- ------------------------------------------------------------
-- 6) View + grants
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW jobs.sync_queue_status AS
SELECT
  sq.id,
  sq.app_id,
  sq.client_id,
  sq.status,
  sq.created_at,
  sq.started_at,
  sq.completed_at,
  sq.error,
  sq.retry_count,
  c.name AS client_name,
  ep.display_name AS provider_name,
  ep.name AS provider_slug,
  ca.app_name
FROM jobs.sync_queue sq
LEFT JOIN core.clients c ON c.id = sq.client_id
LEFT JOIN integration.client_applications ca ON ca.id = sq.app_id
LEFT JOIN integration.erp_providers ep ON ep.id = ca.provider_id;

GRANT SELECT ON jobs.sync_queue TO anon, authenticated;
GRANT SELECT ON jobs.sync_queue_status TO anon, authenticated;

-- ------------------------------------------------------------
-- 7) RLS
-- ------------------------------------------------------------
ALTER TABLE sales.global_order_statuses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_read_global_statuses" ON sales.global_order_statuses;
CREATE POLICY "authenticated_read_global_statuses" ON sales.global_order_statuses
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "service_role_manage_global_statuses" ON sales.global_order_statuses;
CREATE POLICY "service_role_manage_global_statuses" ON sales.global_order_statuses
  FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE sales.erp_carriers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales.erp_marketplaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales.erp_status_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs.sync_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "leitura carriers por vinculo" ON sales.erp_carriers;
CREATE POLICY "leitura carriers por vinculo" ON sales.erp_carriers
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM integration.client_applications a
      WHERE a.id = erp_carriers.app_id
        AND core.can_access_client(a.client_id)
    )
  );

DROP POLICY IF EXISTS "service role gerencia carriers" ON sales.erp_carriers;
CREATE POLICY "service role gerencia carriers" ON sales.erp_carriers
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "leitura marketplaces por vinculo" ON sales.erp_marketplaces;
CREATE POLICY "leitura marketplaces por vinculo" ON sales.erp_marketplaces
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM integration.client_applications a
      WHERE a.id = erp_marketplaces.app_id
        AND core.can_access_client(a.client_id)
    )
  );

DROP POLICY IF EXISTS "service role gerencia marketplaces" ON sales.erp_marketplaces;
CREATE POLICY "service role gerencia marketplaces" ON sales.erp_marketplaces
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "leitura status mappings por vinculo" ON sales.erp_status_mappings;
CREATE POLICY "leitura status mappings por vinculo" ON sales.erp_status_mappings
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM integration.client_applications a
      WHERE a.id = erp_status_mappings.app_id
        AND core.can_access_client(a.client_id)
    )
  );

DROP POLICY IF EXISTS "service role gerencia status mappings" ON sales.erp_status_mappings;
CREATE POLICY "service role gerencia status mappings" ON sales.erp_status_mappings
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_can_select_sync_queue" ON jobs.sync_queue;
CREATE POLICY "authenticated_can_select_sync_queue" ON jobs.sync_queue
  FOR SELECT TO authenticated
  USING (true);

-- ------------------------------------------------------------
-- 8) Cron jobs (sync queue)
-- ------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'process-sync-queue') THEN
    PERFORM cron.unschedule('process-sync-queue');
  END IF;
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'recover-stuck-syncs') THEN
    PERFORM cron.unschedule('recover-stuck-syncs');
  END IF;
END $$;

SELECT cron.schedule(
  'process-sync-queue',
  '*/2 * * * *',
  'SELECT jobs.trigger_process_sync_queue()'
);

SELECT cron.schedule(
  'recover-stuck-syncs',
  '*/15 * * * *',
  'SELECT jobs.recover_stuck_syncs()'
);
