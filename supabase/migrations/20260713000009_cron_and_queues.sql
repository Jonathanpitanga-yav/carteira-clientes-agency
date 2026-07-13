-- ============================================================
-- Migration: Cron, Filas e Retry (pg_cron + pgmq)
-- ============================================================

-- 1. Instalar pg_net (chamadas HTTP assíncronas do Postgres)
CREATE EXTENSION IF NOT EXISTS "pg_net";

-- 2. Schema para objetos de cron e jobs
CREATE SCHEMA IF NOT EXISTS jobs;

-- 3. Filas pgmq para retry
SELECT pgmq.create('erp_token_retry');
SELECT pgmq.create('erp_sync_retry');
SELECT pgmq.create('erp_webhook_retry');

-- 4. Função que chama a edge function erp-refresh-token via pg_net
CREATE OR REPLACE FUNCTION jobs.trigger_refresh_tokens()
RETURNS text AS $$
DECLARE
  v_project_ref text;
  v_anon_key text;
  v_url text;
  v_headers jsonb;
  v_result bigint;
BEGIN
  v_project_ref := current_setting('app.settings.project_ref', true);
  v_anon_key := current_setting('app.settings.service_key', true);

  IF v_project_ref IS NULL THEN
    v_project_ref := 'tnbruzzlgissagxsqrge';
  END IF;

  v_url := 'https://' || v_project_ref || '.supabase.co/functions/v1/erp-refresh-token';

  v_headers := jsonb_build_object(
    'Content-Type', 'application/json'
  );

  SELECT net.http_post(
    url := v_url,
    body := '{}'::jsonb,
    params := '{}'::jsonb,
    headers := v_headers,
    timeout_milliseconds := 120000
  ) INTO v_result;

  RETURN 'Job disparado. Request ID: ' || v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Função que processa retry da fila de tokens
CREATE OR REPLACE FUNCTION jobs.process_token_retry()
RETURNS text AS $$
DECLARE
  v_msg record;
  v_result text;
  v_retry_count int;
  v_max_retries int := 3;
BEGIN
  LOOP
    SELECT * INTO v_msg FROM pgmq.read('erp_token_retry', 30, 1);

    EXIT WHEN v_msg IS NULL;

    v_retry_count := (v_msg.message->>'retry_count')::int;

    IF v_retry_count >= v_max_retries THEN
      PERFORM pgmq.archive('erp_token_retry', v_msg.msg_id);
      CONTINUE;
    END IF;

    v_msg.message := jsonb_set(v_msg.message, '{retry_count}', to_jsonb(v_retry_count + 1));

    PERFORM pgmq.delete('erp_token_retry', v_msg.msg_id);

    INSERT INTO core.audit_logs (action, entity_type, entity_id, payload)
    VALUES (
      'token.retry',
      'integration',
      (v_msg.message->>'app_id')::uuid,
      jsonb_build_object('retry_count', v_retry_count + 1, 'payload', v_msg.message)
    );
  END LOOP;

  RETURN 'Processamento de retry concluído.';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Função que processa retry da fila de sincronização
CREATE OR REPLACE FUNCTION jobs.process_sync_retry()
RETURNS text AS $$
DECLARE
  v_msg record;
  v_retry_count int;
  v_max_retries int := 3;
BEGIN
  LOOP
    SELECT * INTO v_msg FROM pgmq.read('erp_sync_retry', 30, 1);
    EXIT WHEN v_msg IS NULL;

    v_retry_count := (v_msg.message->>'retry_count')::int;

    IF v_retry_count >= v_max_retries THEN
      PERFORM pgmq.archive('erp_token_retry', v_msg.msg_id);
      CONTINUE;
    END IF;

    v_msg.message := jsonb_set(v_msg.message, '{retry_count}', to_jsonb(v_retry_count + 1));
    PERFORM pgmq.delete('erp_sync_retry', v_msg.msg_id);

    INSERT INTO core.audit_logs (action, entity_type, entity_id, payload)
    VALUES (
      'sync.retry',
      'integration',
      (v_msg.message->>'app_id')::uuid,
      jsonb_build_object('retry_count', v_retry_count + 1, 'payload', v_msg.message)
    );
  END LOOP;

  RETURN 'Processamento de retry concluído.';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Agendar cron jobs
SELECT cron.schedule(
  'refresh-tokens',
  '*/30 * * * *',
  'SELECT jobs.trigger_refresh_tokens()'
);

SELECT cron.schedule(
  'process-token-retry',
  '*/5 * * * *',
  'SELECT jobs.process_token_retry()'
);

SELECT cron.schedule(
  'process-sync-retry',
  '*/10 * * * *',
  'SELECT jobs.process_sync_retry()'
);

-- 8. Helper para enfileirar retry (usado pelas edge functions)
CREATE OR REPLACE FUNCTION jobs.enqueue_retry(
  p_queue text,
  p_app_id uuid,
  p_error text,
  p_payload jsonb DEFAULT '{}'::jsonb
) RETURNS bigint AS $$
DECLARE
  v_msg_id bigint;
  v_message jsonb;
BEGIN
  v_message := jsonb_build_object(
    'app_id', p_app_id,
    'error', p_error,
    'retry_count', 0,
    'payload', p_payload,
    'created_at', now()
  );

  v_msg_id := pgmq.send(p_queue, v_message);

  INSERT INTO core.audit_logs (action, entity_type, entity_id, payload)
  VALUES (
    'retry.enqueued',
    'integration',
    p_app_id,
    jsonb_build_object('queue', p_queue, 'msg_id', v_msg_id, 'error', p_error)
  );

  RETURN v_msg_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. View para monitoramento das filas
CREATE OR REPLACE VIEW jobs.queue_status AS
SELECT
  queue_name,
  pgmq.metrics(queue_name) as metrics
FROM (
  SELECT unnest(ARRAY['erp_token_retry', 'erp_sync_retry', 'erp_webhook_retry']) AS queue_name
) q;
