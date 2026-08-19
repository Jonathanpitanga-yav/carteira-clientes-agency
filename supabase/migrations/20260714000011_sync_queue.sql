-- ============================================================
-- Migration: Sync Queue — fila de sincronização de pedidos
-- ============================================================

-- 1. Tabela de fila de sincronização
CREATE TABLE IF NOT EXISTS jobs.sync_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id UUID NOT NULL,
  client_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error TEXT,
  retry_count INT NOT NULL DEFAULT 0
);

-- 2. View de status da fila para o frontend
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

-- 3. Função para enfileirar sincronização de apps
CREATE OR REPLACE FUNCTION jobs.enqueue_sync(p_app_ids UUID[])
RETURNS SETOF jobs.sync_queue AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Função para obter os próximos pendentes (com lock via FOR UPDATE SKIP LOCKED)
CREATE OR REPLACE FUNCTION jobs.acquire_pending_syncs(p_limit INT DEFAULT 3)
RETURNS SETOF jobs.sync_queue AS $$
BEGIN
  RETURN QUERY
  UPDATE jobs.sync_queue
  SET status = 'processing', started_at = now()
  WHERE id IN (
    SELECT id FROM jobs.sync_queue
    WHERE status = 'pending'
    ORDER BY created_at ASC
    LIMIT p_limit
    FOR UPDATE SKIP LOCKED
  )
  RETURNING *;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Função para atualizar status de um item da fila
CREATE OR REPLACE FUNCTION jobs.complete_sync(
  p_id UUID,
  p_status TEXT,
  p_error TEXT DEFAULT NULL
) RETURNS void AS $$
BEGIN
  UPDATE jobs.sync_queue
  SET
    status = p_status,
    completed_at = now(),
    error = p_error,
    retry_count = CASE WHEN p_status = 'failed' THEN retry_count + 1 ELSE retry_count END
  WHERE id = p_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5b. Tabela de configuração (armazena service_key para pg_net)
CREATE TABLE IF NOT EXISTS jobs.settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);

COMMENT ON TABLE jobs.settings IS 'Configurações internas para jobs. Ex: service_key para autenticar chamadas pg_net a edge functions.';

INSERT INTO jobs.settings (key, value)
VALUES ('service_key', 'REDACTED_SERVICE_KEY')
ON CONFLICT (key) DO NOTHING;

-- 6. Função chamada pelo cron para disparar o processamento
CREATE OR REPLACE FUNCTION jobs.trigger_process_sync_queue()
RETURNS text LANGUAGE plpgsql SECURITY DEFINER AS $$
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
      'Authorization', 'Bearer ' || v_service_key
    ),
    timeout_milliseconds := 240000
  ) INTO v_result;

  RETURN 'Sync queue processamento disparado. Request ID: ' || v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Agendar cron (a cada 2 minutos)
SELECT cron.schedule(
  'process-sync-queue',
  '*/2 * * * *',
  'SELECT jobs.trigger_process_sync_queue()'
);

-- 8. Função para contar pendentes na sync_queue
CREATE OR REPLACE FUNCTION jobs.sync_queue_count()
RETURNS TABLE(status TEXT, count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT sq.status::TEXT, COUNT(*)::BIGINT
  FROM jobs.sync_queue sq
  GROUP BY sq.status;
END;
$$ LANGUAGE plpgsql STABLE;

-- 9. Public wrappers para edge functions (evita schema scoping no Supabase client)
CREATE OR REPLACE FUNCTION enqueue_sync(p_app_ids UUID[])
RETURNS SETOF jobs.sync_queue AS 'SELECT * FROM jobs.enqueue_sync(p_app_ids);' LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION acquire_pending_syncs(p_limit INT DEFAULT 3)
RETURNS SETOF jobs.sync_queue AS 'SELECT * FROM jobs.acquire_pending_syncs(p_limit);' LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION complete_sync(p_id UUID, p_status TEXT, p_error TEXT DEFAULT NULL)
RETURNS void AS 'SELECT jobs.complete_sync(p_id, p_status, p_error);' LANGUAGE sql SECURITY DEFINER;

-- 10. Função de recuperação de itens travados (stuck recovery)
-- Reverte itens em 'processing' há mais de 30 minutos para 'pending'
CREATE OR REPLACE FUNCTION jobs.recover_stuck_syncs()
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_count INT;
BEGIN
  UPDATE jobs.sync_queue
  SET status = 'pending', started_at = NULL
  WHERE status = 'processing' AND started_at < now() - interval '30 minutes';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count || ' item(s) recuperados para pending.';
END;
$$;

-- Cron: a cada 15 min, recupera itens stuck
SELECT cron.schedule(
  'recover-stuck-syncs',
  '*/15 * * * *',
  'SELECT jobs.recover_stuck_syncs()'
);

-- 11. Permissões de acesso para frontend
GRANT USAGE ON SCHEMA jobs TO anon, authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA jobs TO anon, authenticated;
