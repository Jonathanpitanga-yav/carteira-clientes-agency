-- Limpeza dos schemas da versão anterior (substituídos por core, integration, sales)
-- Nenhum dado relevante foi perdido — tabelas estavam vazias ou duplicadas.

DROP SCHEMA IF EXISTS agency_core CASCADE;
DROP SCHEMA IF EXISTS erp_integration CASCADE;
DROP SCHEMA IF EXISTS sales_data CASCADE;
