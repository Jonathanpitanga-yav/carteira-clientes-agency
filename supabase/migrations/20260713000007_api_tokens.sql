-- Tabela de tokens de API para autenticação machine-to-machine
-- Cada cliente pode ter múltiplos tokens (um por aplicativo)
CREATE TABLE core.api_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    client_id UUID NOT NULL REFERENCES core.clients(id) ON DELETE CASCADE,
    name TEXT NOT NULL, -- ex: "App Mobile", "Integração Shopify"
    token_hash TEXT NOT NULL UNIQUE, -- hash SHA-256 do token
    prefix TEXT NOT NULL, -- prefixo visível (ex: "sw_" + primeiros 8 chars)
    permissions JSONB DEFAULT '["read:billing"]'::jsonb NOT NULL,
    last_used_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'active' NOT NULL CHECK (status IN ('active', 'revoked', 'expired'))
);

CREATE INDEX idx_api_tokens_client_id ON core.api_tokens(client_id);
CREATE INDEX idx_api_tokens_status ON core.api_tokens(status);

ALTER TABLE core.api_tokens ENABLE ROW LEVEL SECURITY;

-- Apenas admin pode gerenciar tokens
CREATE POLICY "Apenas admin gerencia tokens de API" ON core.api_tokens
    FOR SELECT TO authenticated
    USING (core.get_my_role() = 'admin');

CREATE POLICY "Apenas admin pode modificar tokens de API" ON core.api_tokens
    FOR ALL TO authenticated
    USING (core.get_my_role() = 'admin');
