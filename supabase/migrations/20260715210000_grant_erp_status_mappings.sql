-- service_role precisa de GRANT base (RLS sozinha não basta para edge functions)
GRANT SELECT, INSERT, UPDATE, DELETE ON sales.erp_status_mappings TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON sales.erp_carriers TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON sales.erp_marketplaces TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON sales.erp_shipping_services TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON integration.dictionary_sync_state TO service_role;
