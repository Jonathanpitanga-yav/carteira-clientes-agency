-- MercadoEnvios (tipoIntegracao Bling) = Mercado Envios padrão, NÃO Full.
-- Full continua vindo de name_pattern %full% / %package% ou serviços explicitamente Full.

UPDATE sales.erp_provider_mapping_rules
SET global_slug = 'mercado_envios'
WHERE provider = 'bling'
  AND dimension = 'logistics'
  AND source_kind = 'enum_code'
  AND source_value = 'MercadoEnvios';

-- Carriers com integração Mercado Envios padrão
UPDATE sales.erp_carriers
SET global_logistics_slug = 'mercado_envios'
WHERE carrier_type = 'MercadoEnvios'
  AND (global_logistics_slug IS NULL OR global_logistics_slug = 'mercado_envios_full');

-- Recalcula catálogo de serviços (prioridade: full > flex > padrão)
UPDATE sales.erp_shipping_services
SET global_logistics_slug = CASE
  WHEN name ILIKE '%full%' OR name ILIKE '%package%' THEN 'mercado_envios_full'
  WHEN name ILIKE '%flex%' OR name ILIKE '%priorit%' THEN 'mercado_envios_flex'
  WHEN provider_logistics_type = 'MercadoEnviosFlex' THEN 'mercado_envios_flex'
  WHEN provider_logistics_type = 'MercadoEnvios' THEN 'mercado_envios'
  WHEN name ILIKE '%shopee%' OR provider_logistics_type = 'LogisticaShopee' THEN 'shopee_envios'
  WHEN name ILIKE '%magalu%' OR provider_logistics_type = 'MagaluEntregas' THEN 'magalu_entregas'
  ELSE global_logistics_slug
END
WHERE provider_logistics_type IN ('MercadoEnvios', 'MercadoEnviosFlex', 'LogisticaShopee', 'MagaluEntregas')
   OR name ILIKE '%mercado%'
   OR name ILIKE '%shopee%'
   OR name ILIKE '%magalu%'
   OR global_logistics_slug = 'mercado_envios_full';

-- Pedidos ML classificados como Full sem indicador no serviço
UPDATE sales.invoices
SET global_logistics_slug = CASE
  WHEN shipping_method ILIKE '%full%' OR shipping_method ILIKE '%package%' THEN 'mercado_envios_full'
  WHEN shipping_method ILIKE '%flex%' OR shipping_method ILIKE '%priorit%' THEN 'mercado_envios_flex'
  WHEN global_marketplace_slug = 'mercado_livre'
    OR marketplace_name ILIKE '%mercado%'
    OR sales_channel ILIKE '%mercado%' THEN 'mercado_envios'
  ELSE global_logistics_slug
END
WHERE global_logistics_slug = 'mercado_envios_full'
  AND global_marketplace_slug IS DISTINCT FROM 'shopee'
  AND NOT (shipping_method ILIKE '%full%' OR shipping_method ILIKE '%package%');
