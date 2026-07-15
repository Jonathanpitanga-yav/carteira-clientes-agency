-- integration.audit_logs: tabela usada pelo painel /admin/logs (fonte ERP/OAuth/filas)
-- A tabela já existe em produção; CREATE IF NOT EXISTS garante reprodutibilidade em novos ambientes.

CREATE TABLE IF NOT EXISTS integration.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  event_type TEXT NOT NULL,
  app_id UUID REFERENCES integration.client_applications(id) ON DELETE SET NULL,
  provider TEXT,
  actor_id UUID REFERENCES core.profiles(id) ON DELETE SET NULL,
  category TEXT,
  erp_error_code TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_category ON integration.audit_logs(category);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON integration.audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_event ON integration.audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON integration.audit_logs(created_at DESC);

ALTER TABLE integration.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin pode ver tudo" ON integration.audit_logs;
CREATE POLICY "Admin pode ver tudo" ON integration.audit_logs
  FOR SELECT TO authenticated
  USING (core.get_my_role() = 'admin');

-- PostgREST exige GRANT além da policy RLS
GRANT SELECT ON integration.audit_logs TO anon, authenticated;
GRANT INSERT ON integration.audit_logs TO service_role;
