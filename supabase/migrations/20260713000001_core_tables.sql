-- Criar tipo enum para os papéis dos usuários
CREATE TYPE core.user_role AS ENUM ('admin', 'leader', 'analyst', 'client');

-- Criar tabela de perfis que estende auth.users
CREATE TABLE core.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    full_name TEXT,
    role core.user_role DEFAULT 'client'::core.user_role NOT NULL
);

-- Habilitar replicação em perfis (opcional, para realtime)
ALTER TABLE core.profiles REPLICA IDENTITY FULL;

-- Criar tabela de clientes (empresas) da agência
CREATE TABLE core.clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    name TEXT NOT NULL,
    document TEXT UNIQUE, -- CNPJ ou outro documento
    status TEXT DEFAULT 'active' NOT NULL CHECK (status IN ('active', 'inactive'))
);

-- Tabela de vínculo entre analistas e clientes (carteira)
CREATE TABLE core.client_analysts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES core.clients(id) ON DELETE CASCADE,
    analyst_id UUID NOT NULL REFERENCES core.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_client_analyst UNIQUE (client_id, analyst_id)
);

-- Tabela de vínculo entre usuários finais (clientes) e suas empresas
CREATE TABLE core.client_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES core.clients(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES core.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_client_user UNIQUE (client_id, user_id)
);

-- Trigger para criar perfil automaticamente ao cadastrar um novo usuário no auth
CREATE OR REPLACE FUNCTION core.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO core.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE((NEW.raw_user_meta_data->>'role')::core.user_role, 'client'::core.user_role)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION core.handle_new_user();
