-- Remove cliente de teste "Yav teste" e todos os dados associados
-- Este cliente foi criado durante o desenvolvimento e não é um cliente real

DO $$
DECLARE
  v_client_id UUID := '9c136576-e4de-488d-b78e-313cfae3cea6';
  v_app_id UUID := '259c7e46-990e-445a-b246-260b09b03b08';
BEGIN

  -- 1. Dados de integração do app
  DELETE FROM integration.audit_logs WHERE app_id = v_app_id;
  DELETE FROM sales.erp_shipping_services WHERE app_id = v_app_id;
  DELETE FROM sales.erp_carriers WHERE app_id = v_app_id;
  DELETE FROM sales.erp_status_mappings WHERE app_id = v_app_id;
  DELETE FROM integration.erp_company_mappings WHERE app_id = v_app_id;
  DELETE FROM integration.dictionary_sync_state WHERE app_id = v_app_id;

  -- 2. Tokens e credenciais
  DELETE FROM integration.credentials WHERE app_id = v_app_id;
  DELETE FROM integration.tokens WHERE app_id = v_app_id;

  -- 3. App do cliente
  DELETE FROM integration.client_applications WHERE id = v_app_id;

  -- 4. Vínculos do cliente
  DELETE FROM core.client_analysts WHERE client_id = v_client_id;

  -- 5. Cliente
  DELETE FROM core.clients WHERE id = v_client_id;

  RAISE NOTICE 'Yav teste removido com sucesso.';

END $$;
