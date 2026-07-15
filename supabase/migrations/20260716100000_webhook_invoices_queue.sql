-- ============================================================
-- Migration: Webhook invoices queue (two-stage ingest + process)
-- ============================================================

-- ------------------------------------------------------------
-- 1) integration.erp_company_mappings
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS integration.erp_company_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  company_external_id TEXT NOT NULL,
  app_id UUID NOT NULL REFERENCES integration.client_applications(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES core.clients(id) ON DELETE CASCADE,
  company_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider, company_external_id)
);

CREATE INDEX IF NOT EXISTS idx_erp_company_mappings_lookup
  ON integration.erp_company_mappings (provider, company_external_id);

-- ------------------------------------------------------------
-- 2) jobs.webhook_invoices_queue
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS jobs.webhook_invoices_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id UUID REFERENCES integration.client_applications(id) ON DELETE SET NULL,
  client_id UUID REFERENCES core.clients(id) ON DELETE SET NULL,
  provider TEXT NOT NULL,
  company_external_id TEXT,
  event_type TEXT,
  idempotency_key TEXT NOT NULL,
  payload JSONB NOT NULL,
  headers JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status = ANY (ARRAY[
      'pending'::text, 'processing'::text, 'processed'::text,
      'failed'::text, 'dead_letter'::text, 'unmapped'::text
    ])),
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 5,
  next_retry_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  error TEXT,
  invoice_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  UNIQUE (provider, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_webhook_invoices_queue_acquire
  ON jobs.webhook_invoices_queue (status, next_retry_at, created_at)
  WHERE status IN ('pending', 'failed');

CREATE INDEX IF NOT EXISTS idx_webhook_invoices_queue_app_status
  ON jobs.webhook_invoices_queue (app_id, status);

CREATE INDEX IF NOT EXISTS idx_webhook_invoices_queue_company
  ON jobs.webhook_invoices_queue (provider, company_external_id);

-- ------------------------------------------------------------
-- 3) RPCs
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION jobs.enqueue_webhook_invoice(
  p_app_id uuid,
  p_client_id uuid,
  p_provider text,
  p_company_external_id text,
  p_event_type text,
  p_idempotency_key text,
  p_payload jsonb,
  p_headers jsonb DEFAULT '{}'::jsonb,
  p_status text DEFAULT 'pending'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO jobs.webhook_invoices_queue (
    app_id, client_id, provider, company_external_id,
    event_type, idempotency_key, payload, headers, status
  )
  VALUES (
    p_app_id, p_client_id, p_provider, p_company_external_id,
    p_event_type, p_idempotency_key, p_payload, p_headers, p_status
  )
  ON CONFLICT (provider, idempotency_key) DO NOTHING
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$function$;

CREATE OR REPLACE FUNCTION jobs.acquire_pending_webhook_invoices(
  p_limit integer DEFAULT 20
)
RETURNS SETOF jobs.webhook_invoices_queue
LANGUAGE sql
SECURITY DEFINER
AS $function$
  WITH candidates AS (
    SELECT DISTINCT ON (app_id) id
    FROM jobs.webhook_invoices_queue
    WHERE status = 'pending'
      AND next_retry_at <= now()
      AND app_id IS NOT NULL
    ORDER BY app_id, created_at ASC
  ),
  selected AS (
    SELECT id FROM candidates
    ORDER BY id
    LIMIT p_limit
  )
  UPDATE jobs.webhook_invoices_queue
  SET status = 'processing', started_at = now()
  WHERE id IN (
    SELECT sq.id
    FROM jobs.webhook_invoices_queue sq
    WHERE sq.id IN (SELECT id FROM selected)
    FOR UPDATE SKIP LOCKED
  )
  RETURNING *;
$function$;

CREATE OR REPLACE FUNCTION jobs.complete_webhook_invoice(
  p_id uuid,
  p_status text,
  p_error text DEFAULT NULL::text,
  p_invoice_id uuid DEFAULT NULL::uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_row jobs.webhook_invoices_queue%ROWTYPE;
  v_new_retry_count integer;
BEGIN
  SELECT * INTO v_row FROM jobs.webhook_invoices_queue WHERE id = p_id;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF p_status = 'failed' THEN
    v_new_retry_count := v_row.retry_count + 1;
    IF v_new_retry_count >= v_row.max_retries THEN
      UPDATE jobs.webhook_invoices_queue
      SET
        status = 'dead_letter',
        completed_at = now(),
        error = p_error,
        retry_count = v_new_retry_count
      WHERE id = p_id;
    ELSE
      UPDATE jobs.webhook_invoices_queue
      SET
        status = 'pending',
        started_at = NULL,
        error = p_error,
        retry_count = v_new_retry_count,
        next_retry_at = now() + (power(2, v_new_retry_count) * interval '30 seconds')
      WHERE id = p_id;
    END IF;
  ELSIF p_status = 'processed' THEN
    UPDATE jobs.webhook_invoices_queue
    SET
      status = 'processed',
      completed_at = now(),
      error = NULL,
      invoice_id = p_invoice_id
    WHERE id = p_id;
  ELSE
    UPDATE jobs.webhook_invoices_queue
    SET
      status = p_status,
      completed_at = CASE
        WHEN p_status IN ('processed', 'dead_letter') THEN now()
        ELSE completed_at
      END,
      error = p_error,
      invoice_id = COALESCE(p_invoice_id, invoice_id)
    WHERE id = p_id;
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION jobs.recover_stuck_webhook_invoices()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_count integer;
BEGIN
  UPDATE jobs.webhook_invoices_queue
  SET status = 'pending', started_at = NULL
  WHERE status = 'processing'
    AND started_at < now() - interval '10 minutes';

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count || ' webhook(s) recuperado(s) para pending.';
END;
$function$;

CREATE OR REPLACE FUNCTION jobs.reprocess_unmapped_webhooks(
  p_provider text,
  p_company_external_id text,
  p_app_id uuid,
  p_client_id uuid
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_count integer;
BEGIN
  UPDATE jobs.webhook_invoices_queue
  SET
    app_id = p_app_id,
    client_id = p_client_id,
    status = 'pending',
    next_retry_at = now()
  WHERE provider = p_provider
    AND company_external_id = p_company_external_id
    AND status = 'unmapped';

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$function$;

CREATE OR REPLACE FUNCTION jobs.trigger_process_webhook_queue()
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

  v_url := 'https://' || v_project_ref || '.supabase.co/functions/v1/erp-process-webhook-queue';

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

  RETURN 'Webhook queue processamento disparado. Request ID: ' || v_result;
END;
$function$;

CREATE OR REPLACE FUNCTION jobs.webhook_invoices_queue_count()
RETURNS TABLE(status text, count bigint)
LANGUAGE plpgsql
STABLE
AS $function$
BEGIN
  RETURN QUERY
  SELECT wq.status::text, COUNT(*)::bigint
  FROM jobs.webhook_invoices_queue wq
  GROUP BY wq.status;
END;
$function$;

-- Public wrappers
CREATE OR REPLACE FUNCTION public.enqueue_webhook_invoice(
  p_app_id uuid,
  p_client_id uuid,
  p_provider text,
  p_company_external_id text,
  p_event_type text,
  p_idempotency_key text,
  p_payload jsonb,
  p_headers jsonb DEFAULT '{}'::jsonb,
  p_status text DEFAULT 'pending'
)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
AS $function$
  SELECT jobs.enqueue_webhook_invoice(
    p_app_id, p_client_id, p_provider, p_company_external_id,
    p_event_type, p_idempotency_key, p_payload, p_headers, p_status
  );
$function$;

CREATE OR REPLACE FUNCTION public.acquire_pending_webhook_invoices(p_limit integer DEFAULT 20)
RETURNS SETOF jobs.webhook_invoices_queue
LANGUAGE sql
SECURITY DEFINER
AS $function$
  SELECT * FROM jobs.acquire_pending_webhook_invoices(p_limit);
$function$;

CREATE OR REPLACE FUNCTION public.complete_webhook_invoice(
  p_id uuid,
  p_status text,
  p_error text DEFAULT NULL::text,
  p_invoice_id uuid DEFAULT NULL::uuid
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $function$
  SELECT jobs.complete_webhook_invoice(p_id, p_status, p_error, p_invoice_id);
$function$;

CREATE OR REPLACE FUNCTION public.reprocess_unmapped_webhooks(
  p_provider text,
  p_company_external_id text,
  p_app_id uuid,
  p_client_id uuid
)
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
AS $function$
  SELECT jobs.reprocess_unmapped_webhooks(
    p_provider, p_company_external_id, p_app_id, p_client_id
  );
$function$;

GRANT EXECUTE ON FUNCTION public.enqueue_webhook_invoice(uuid, uuid, text, text, text, text, jsonb, jsonb, text)
  TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.acquire_pending_webhook_invoices(integer)
  TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.complete_webhook_invoice(uuid, text, text, uuid)
  TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reprocess_unmapped_webhooks(text, text, uuid, uuid)
  TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.webhook_invoices_queue_count()
RETURNS TABLE(status text, count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $function$
  SELECT * FROM jobs.webhook_invoices_queue_count();
$function$;

GRANT EXECUTE ON FUNCTION public.webhook_invoices_queue_count()
  TO anon, authenticated, service_role;

-- ------------------------------------------------------------
-- 4) View + grants
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW jobs.webhook_invoices_queue_status AS
SELECT
  wq.id,
  wq.app_id,
  wq.client_id,
  wq.provider,
  wq.company_external_id,
  wq.event_type,
  wq.status,
  wq.retry_count,
  wq.error,
  wq.invoice_id,
  wq.created_at,
  wq.started_at,
  wq.completed_at,
  c.name AS client_name,
  ep.display_name AS provider_name,
  ep.name AS provider_slug,
  ca.app_name
FROM jobs.webhook_invoices_queue wq
LEFT JOIN core.clients c ON c.id = wq.client_id
LEFT JOIN integration.client_applications ca ON ca.id = wq.app_id
LEFT JOIN integration.erp_providers ep ON ep.id = ca.provider_id;

GRANT SELECT ON jobs.webhook_invoices_queue TO anon, authenticated;
GRANT SELECT ON jobs.webhook_invoices_queue_status TO anon, authenticated;

-- ------------------------------------------------------------
-- 5) RLS
-- ------------------------------------------------------------
ALTER TABLE integration.erp_company_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs.webhook_invoices_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service role gerencia company mappings" ON integration.erp_company_mappings;
CREATE POLICY "service role gerencia company mappings" ON integration.erp_company_mappings
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated read company mappings" ON integration.erp_company_mappings;
CREATE POLICY "authenticated read company mappings" ON integration.erp_company_mappings
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "authenticated_can_select_webhook_queue" ON jobs.webhook_invoices_queue;
CREATE POLICY "authenticated_can_select_webhook_queue" ON jobs.webhook_invoices_queue
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "service role gerencia webhook queue" ON jobs.webhook_invoices_queue;
CREATE POLICY "service role gerencia webhook queue" ON jobs.webhook_invoices_queue
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ------------------------------------------------------------
-- 6) Cron jobs
-- ------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'process-webhook-queue') THEN
    PERFORM cron.unschedule('process-webhook-queue');
  END IF;
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'recover-stuck-webhooks') THEN
    PERFORM cron.unschedule('recover-stuck-webhooks');
  END IF;
END $$;

SELECT cron.schedule(
  'process-webhook-queue',
  '* * * * *',
  'SELECT jobs.trigger_process_webhook_queue()'
);

SELECT cron.schedule(
  'recover-stuck-webhooks',
  '*/10 * * * *',
  'SELECT jobs.recover_stuck_webhook_invoices()'
);
