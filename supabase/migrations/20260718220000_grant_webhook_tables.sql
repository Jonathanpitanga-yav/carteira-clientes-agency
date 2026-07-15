-- service_role precisa de GRANT base nas tabelas de webhook (RLS sozinha não basta)
GRANT SELECT, INSERT, UPDATE, DELETE ON integration.erp_company_mappings TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON jobs.webhook_invoices_queue TO service_role;
