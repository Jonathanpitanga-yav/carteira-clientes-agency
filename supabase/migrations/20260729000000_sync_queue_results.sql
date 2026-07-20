-- Add synced_count to sync_queue for tracking results per item

ALTER TABLE jobs.sync_queue ADD COLUMN IF NOT EXISTS synced_count INT DEFAULT 0;

CREATE OR REPLACE FUNCTION jobs.complete_sync(
  p_id UUID,
  p_status TEXT,
  p_error TEXT DEFAULT NULL,
  p_synced_count INT DEFAULT 0
) RETURNS void AS $func$
BEGIN
  UPDATE jobs.sync_queue
  SET
    status = p_status,
    completed_at = now(),
    error = p_error,
    synced_count = p_synced_count,
    retry_count = CASE WHEN p_status = 'failed' THEN retry_count + 1 ELSE retry_count END
  WHERE id = p_id;
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION complete_sync(
  p_id UUID,
  p_status TEXT,
  p_error TEXT DEFAULT NULL,
  p_synced_count INT DEFAULT 0
) RETURNS void AS
'SELECT jobs.complete_sync(p_id, p_status, p_error, p_synced_count);'
LANGUAGE sql SECURITY DEFINER;

DROP VIEW IF EXISTS jobs.sync_queue_status CASCADE;
CREATE VIEW jobs.sync_queue_status AS
SELECT
  sq.id, sq.app_id, sq.client_id, sq.status,
  sq.created_at, sq.started_at, sq.completed_at,
  sq.error, sq.retry_count,
  sq.date_from, sq.date_to,
  sq.synced_count,
  c.name AS client_name,
  ep.display_name AS provider_name,
  ep.name AS provider_slug,
  ca.app_name
FROM jobs.sync_queue sq
LEFT JOIN core.clients c ON c.id = sq.client_id
LEFT JOIN integration.client_applications ca ON ca.id = sq.app_id
LEFT JOIN integration.erp_providers ep ON ep.id = ca.provider_id;

GRANT SELECT ON jobs.sync_queue_status TO anon, authenticated;
