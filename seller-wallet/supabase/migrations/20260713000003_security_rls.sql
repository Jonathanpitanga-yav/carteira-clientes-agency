-- Função helper de controle de acesso aos clientes
CREATE OR REPLACE FUNCTION core.can_access_client(client_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_role core.user_role;
BEGIN
  -- Obter a role do usuário logado
  SELECT role INTO user_role FROM core.profiles WHERE id = auth.uid();
  
  -- Se for admin ou leader, tem acesso a qualquer cliente
  IF user_role = 'admin' OR user_role = 'leader' THEN
    RETURN TRUE;
  END IF;
  
  -- Se for analista, verifica se o cliente está na sua carteira
  IF user_role = 'analyst' THEN
    RETURN EXISTS (
      SELECT 1 FROM core.client_analysts 
      WHERE client_id = client_uuid AND analyst_id = auth.uid()
    );
  END IF;
  
  -- Se for cliente, verifica se o usuário está associado a este cliente
  IF user_role = 'client' THEN
    RETURN EXISTS (
      SELECT 1 FROM core.client_users 
      WHERE client_id = client_uuid AND user_id = auth.uid()
    );
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função helper para obter o papel do usuário atual
CREATE OR REPLACE FUNCTION core.get_my_role()
RETURNS core.user_role AS $$
  SELECT role FROM core.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- Habilitar RLS em todas as tabelas
ALTER TABLE core.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.client_analysts ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.client_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration.erp_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration.client_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration.credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration.tokens ENABLE ROW LEVEL SECURITY;

--------------------------------------------------------------------------------
-- Políticas para core.profiles
--------------------------------------------------------------------------------
CREATE POLICY "Qualquer um lê seu próprio perfil ou admins/leaders lêem todos" ON core.profiles
    FOR SELECT TO authenticated
    USING (id = auth.uid() OR core.get_my_role() IN ('admin', 'leader'));

CREATE POLICY "Admins podem atualizar qualquer perfil" ON core.profiles
    FOR ALL TO authenticated
    USING (core.get_my_role() = 'admin');

--------------------------------------------------------------------------------
-- Políticas para core.clients
--------------------------------------------------------------------------------
CREATE POLICY "Acesso de leitura baseado no vinculo do cliente" ON core.clients
    FOR SELECT TO authenticated
    USING (core.can_access_client(id));

CREATE POLICY "Admins e Leaders gerenciam clientes" ON core.clients
    FOR ALL TO authenticated
    USING (core.get_my_role() IN ('admin', 'leader'));

--------------------------------------------------------------------------------
-- Políticas para core.client_analysts (Carteira)
--------------------------------------------------------------------------------
CREATE POLICY "Admins e Leaders visualizam carteira" ON core.client_analysts
    FOR SELECT TO authenticated
    USING (core.get_my_role() IN ('admin', 'leader') OR analyst_id = auth.uid());

CREATE POLICY "Admins e Leaders gerenciam carteira" ON core.client_analysts
    FOR ALL TO authenticated
    USING (core.get_my_role() IN ('admin', 'leader'));

--------------------------------------------------------------------------------
-- Políticas para core.client_users
--------------------------------------------------------------------------------
CREATE POLICY "Visualização de vinculo de usuarios de clientes" ON core.client_users
    FOR SELECT TO authenticated
    USING (core.get_my_role() IN ('admin', 'leader') OR user_id = auth.uid());

CREATE POLICY "Admins e Leaders gerenciam vinculos de usuarios de clientes" ON core.client_users
    FOR ALL TO authenticated
    USING (core.get_my_role() IN ('admin', 'leader'));

--------------------------------------------------------------------------------
-- Políticas para integration.erp_providers
--------------------------------------------------------------------------------
CREATE POLICY "Qualquer usuario autenticado visualiza provedores de erp" ON integration.erp_providers
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Apenas admins gerenciam provedores" ON integration.erp_providers
    FOR ALL TO authenticated
    USING (core.get_my_role() = 'admin');

--------------------------------------------------------------------------------
-- Políticas para integration.client_applications
--------------------------------------------------------------------------------
CREATE POLICY "Leitura de aplicacoes conectadas baseada no vinculo" ON integration.client_applications
    FOR SELECT TO authenticated
    USING (core.can_access_client(client_id));

CREATE POLICY "Admins e Leaders gerenciam aplicacoes de clientes" ON integration.client_applications
    FOR ALL TO authenticated
    USING (core.get_my_role() IN ('admin', 'leader'));

--------------------------------------------------------------------------------
-- Políticas para integration.credentials e integration.tokens (Apenas Admin/Service Role)
--------------------------------------------------------------------------------
-- NOTA: O fluxo de Edge Functions usará service_role (ignorando RLS)
-- para gerenciar credenciais e tokens com segurança absoluta.
CREATE POLICY "Apenas admin visualiza credenciais" ON integration.credentials
    FOR SELECT TO authenticated
    USING (core.get_my_role() = 'admin');

CREATE POLICY "Apenas admin gerencia credenciais" ON integration.credentials
    FOR ALL TO authenticated
    USING (core.get_my_role() = 'admin');

CREATE POLICY "Apenas admin visualiza tokens" ON integration.tokens
    FOR SELECT TO authenticated
    USING (core.get_my_role() = 'admin');

CREATE POLICY "Apenas admin gerencia tokens" ON integration.tokens
    FOR ALL TO authenticated
    USING (core.get_my_role() = 'admin');
