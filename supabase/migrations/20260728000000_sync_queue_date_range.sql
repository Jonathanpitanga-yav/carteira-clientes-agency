-- Add date range support to sync_queue for controlled sync periods

-- 1. Add date_from and date_to columns
ALTER TABLE jobs.sync_queue ADD COLUMN IF NOT EXISTS date_from DATE;
ALTER TABLE jobs.sync_queue ADD COLUMN IF NOT EXISTS date_to DATE;

-- 2. Drop old overloaded public wrapper before recreating with new signature
DROP FUNCTION IF EXISTS public.enqueue_sync(p_app_ids UUID[]);
DROP FUNCTION IF EXISTS public.enqueue_sync(p_app_ids UUID[], p_date_from DATE, p_date_to DATE);

-- 3. Update view to include date columns
DROP VIEW IF EXISTS jobs.sync_queue_status CASCADE;
CREATE VIEW jobs.sync_queue_status AS
SELECT
  sq.id, sq.app_id, sq.client_id, sq.status,
  sq.created_at, sq.started_at, sq.completed_at,
  sq.error, sq.retry_count,
  sq.date_from, sq.date_to,
  c.name AS client_name,
  ep.display_name AS provider_name,
  ep.name AS provider_slug,
  ca.app_name
FROM jobs.sync_queue sq
LEFT JOIN core.clients c ON c.id = sq.client_id
LEFT JOIN integration.client_applications ca ON ca.id = sq.app_id
LEFT JOIN integration.erp_providers ep ON ep.id = ca.provider_id;

-- 4. Update enqueue_sync RPC to accept date range
CREATE OR REPLACE FUNCTION jobs.enqueue_sync(
  p_app_ids UUID[],
  p_date_from DATE DEFAULT NULL,
  p_date_to DATE DEFAULT NULL
)
RETURNS SETOF jobs.sync_queue
LANGUAGE plpgsql SECURITY DEFINER
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
      INSERT INTO jobs.sync_queue (app_id, client_id, date_from, date_to)
      VALUES (v_app_id, v_client_id, p_date_from, p_date_to)
      RETURNING * INTO v_row;

      INSERT INTO core.audit_logs (action, entity_type, entity_id, payload)
      VALUES (
        'sync.enqueued', 'integration', v_app_id,
        jsonb_build_object(
          'queue_id', v_row.id, 'client_id', v_client_id,
          'date_from', p_date_from, 'date_to', p_date_to
        )
      );

      RETURN NEXT v_row;
    END IF;
  END LOOP;
  RETURN;
END;
$function$;

-- 5. Public wrapper with single clear signature
CREATE OR REPLACE FUNCTION public.enqueue_sync(
  p_app_ids UUID[],
  p_date_from DATE DEFAULT NULL,
  p_date_to DATE DEFAULT NULL
)
RETURNS SETOF jobs.sync_queue
LANGUAGE sql SECURITY DEFINER
AS $func$ SELECT * FROM jobs.enqueue_sync(p_app_ids, p_date_from, p_date_to); $func$;

-- 6. Grant permissions
GRANT USAGE ON SCHEMA jobs TO anon, authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA jobs TO anon, authenticated;
GRANT SELECT ON jobs.sync_queue_status TO anon, authenticated;
