-- Tabela central de auditoria para todas as ações do sistema
CREATE TABLE core.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    user_id UUID REFERENCES core.profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL, -- ex: 'client.created', 'integration.synced', 'user.assigned'
    entity_type TEXT NOT NULL, -- ex: 'client', 'integration', 'profile'
    entity_id UUID,
    payload JSONB DEFAULT '{}'::jsonb NOT NULL,
    ip_address TEXT,
    user_agent TEXT
);

CREATE INDEX idx_audit_logs_created_at ON core.audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_user_id ON core.audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON core.audit_logs(action);
CREATE INDEX idx_audit_logs_entity ON core.audit_logs(entity_type, entity_id);

-- Habilitar RLS
ALTER TABLE core.audit_logs ENABLE ROW LEVEL SECURITY;

-- Apenas admin pode ler logs
CREATE POLICY "Apenas admin visualiza logs" ON core.audit_logs
    FOR SELECT TO authenticated
    USING (core.get_my_role() = 'admin');

-- Função helper para registrar logs (usada por Edge Functions com service_role)
CREATE OR REPLACE FUNCTION core.log_action(
    p_user_id UUID,
    p_action TEXT,
    p_entity_type TEXT,
    p_entity_id UUID DEFAULT NULL,
    p_payload JSONB DEFAULT '{}'::jsonb,
    p_ip_address TEXT DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_log_id UUID;
BEGIN
    INSERT INTO core.audit_logs (user_id, action, entity_type, entity_id, payload, ip_address, user_agent)
    VALUES (p_user_id, p_action, p_entity_type, p_entity_id, p_payload, p_ip_address, p_user_agent)
    RETURNING id INTO v_log_id;
    RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
