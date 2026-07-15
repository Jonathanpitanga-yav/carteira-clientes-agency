-- Bling: enum de tipo de logística + correção marketplace/logística Mercado Livre

INSERT INTO sales.erp_provider_mapping_rules (provider, dimension, source_kind, source_value, global_slug, priority) VALUES
  ('bling', 'logistics', 'enum_code', 'MercadoEnvios', 'mercado_envios_full', 10),
  ('bling', 'logistics', 'enum_code', 'MercadoEnviosFlex', 'mercado_envios_flex', 10),
  ('bling', 'logistics', 'enum_code', 'MagaluEntregas', 'magalu_entregas', 10),
  ('bling', 'logistics', 'enum_code', 'LogisticaShopee', 'shopee_envios', 10)
ON CONFLICT (provider, dimension, source_kind, source_value) DO UPDATE
SET global_slug = EXCLUDED.global_slug, priority = EXCLUDED.priority, is_active = true;

-- Corrige Magalu Full mapeado incorretamente para mercado_envios_full
UPDATE sales.erp_carriers
SET global_logistics_slug = 'magalu_fulfillment'
WHERE app_id IN (
  SELECT ca.id FROM integration.client_applications ca
  JOIN integration.erp_providers ep ON ep.id = ca.provider_id
  WHERE ep.name = 'bling'
) AND name ILIKE '%magalu%full%';

-- Loja Mercado Livre (CNPJ intermediador 03.007.331/0001-41)
UPDATE sales.erp_marketplaces
SET name = 'Mercado Livre',
    canal_venda = 'Mercado Livre',
    global_marketplace_slug = 'mercado_livre'
WHERE app_id = '594b3e65-05c2-457b-a0a1-ff638078f97c'
  AND external_id = '206029062';

-- Recalcula slug de serviços Prioritario vinculados à integração Mercado Envios (não Flex)
UPDATE sales.erp_shipping_services s
SET global_logistics_slug = 'mercado_envios_full'
FROM sales.erp_carriers c
WHERE s.app_id = c.app_id
  AND s.logistics_external_id = c.external_id
  AND s.app_id = '594b3e65-05c2-457b-a0a1-ff638078f97c'
  AND c.carrier_type = 'MercadoEnvios';

UPDATE sales.erp_shipping_services s
SET global_logistics_slug = 'mercado_envios_flex'
FROM sales.erp_carriers c
WHERE s.app_id = c.app_id
  AND s.logistics_external_id = c.external_id
  AND s.app_id = '594b3e65-05c2-457b-a0a1-ff638078f97c'
  AND c.carrier_type = 'MercadoEnviosFlex';
