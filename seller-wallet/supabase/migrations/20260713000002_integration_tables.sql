-- Criar tabela de provedores de ERP
CREATE TABLE integration.erp_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    name TEXT UNIQUE NOT NULL, -- ex: 'bling', 'tiny', 'anymarket'
    display_name TEXT NOT NULL, -- ex: 'Bling', 'Tiny ERP', 'Anymarket'
    auth_type TEXT NOT NULL CHECK (auth_type IN ('oauth2', 'api_key')),
    auth_config JSONB DEFAULT '{}'::jsonb NOT NULL
);

-- Criar tabela de instâncias de aplicativos conectados por cliente
CREATE TABLE integration.client_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    client_id UUID NOT NULL REFERENCES core.clients(id) ON DELETE CASCADE,
    provider_id UUID NOT NULL REFERENCES integration.erp_providers(id) ON DELETE CASCADE,
    app_name TEXT NOT NULL,
    status TEXT DEFAULT 'pending' NOT NULL CHECK (status IN ('active', 'expired', 'error', 'pending')),
    CONSTRAINT unique_client_provider_app UNIQUE (client_id, provider_id, app_name)
);

-- Criar tabela de credenciais (criptografada)
CREATE TABLE integration.credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    app_id UUID UNIQUE NOT NULL REFERENCES integration.client_applications(id) ON DELETE CASCADE,
    client_identifier TEXT, -- OAuth Client ID ou similar
    client_secret TEXT -- Armazenado criptografado (via app ou pgcrypto)
);

-- Criar tabela de tokens de acesso e refresh (criptografada)
CREATE TABLE integration.tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    app_id UUID UNIQUE NOT NULL REFERENCES integration.client_applications(id) ON DELETE CASCADE,
    access_token TEXT NOT NULL, -- Armazenado criptografado
    refresh_token TEXT, -- Armazenado criptografado
    expires_at TIMESTAMP WITH TIME ZONE,
    raw_payload_response JSONB DEFAULT '{}'::jsonb NOT NULL
);

-- Inserir alguns ERPs padrão
INSERT INTO integration.erp_providers (name, display_name, auth_type, auth_config) VALUES
('bling', 'Bling ERP', 'oauth2', '{"auth_url": "https://www.bling.com.br/Api/v3/oauth/authorize", "token_url": "https://www.bling.com.br/Api/v3/oauth/token"}'::jsonb),
('tiny', 'Tiny ERP', 'api_key', '{}'::jsonb),
('anymarket', 'Anymarket', 'api_key', '{}'::jsonb)
ON CONFLICT (name) DO NOTHING;
