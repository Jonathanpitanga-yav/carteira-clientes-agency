-- Universal status label rules (semantic, cross-ERP, cross-tenant)
-- Replaces enum_code status rules in erp_provider_mapping_rules

CREATE TABLE IF NOT EXISTS sales.erp_status_label_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern TEXT NOT NULL,
  global_status TEXT NOT NULL REFERENCES sales.global_order_statuses(slug),
  priority INTEGER NOT NULL DEFAULT 100,
  exclude_pattern TEXT,
  is_active BOOLEAN DEFAULT true,
  CONSTRAINT unique_status_label_rule UNIQUE (pattern, global_status)
);

CREATE INDEX IF NOT EXISTS idx_erp_status_label_rules_active
  ON sales.erp_status_label_rules (is_active, priority);

-- Remove cross-ERP enum_code status rules (invalid for multi-tenant)
DELETE FROM sales.erp_provider_mapping_rules
WHERE dimension = 'status' AND source_kind = 'enum_code';

-- Remove legacy status name_pattern rules (migrated to erp_status_label_rules)
DELETE FROM sales.erp_provider_mapping_rules
WHERE dimension = 'status' AND source_kind = 'name_pattern';

-- Universal semantic label rules (lower priority number = higher precedence)
INSERT INTO sales.erp_status_label_rules (pattern, global_status, priority, exclude_pattern) VALUES
  ('%dados incomplet%', 'draft', 10, NULL),
  ('%em digita%', 'draft', 10, NULL),
  ('%rascunho%', 'draft', 10, NULL),
  ('%não entregue%', 'pending', 15, NULL),
  ('%nao entregue%', 'pending', 15, NULL),
  ('%em aberto%', 'pending', 20, NULL),
  ('%aberta%', 'pending', 20, NULL),
  ('%pendente%', 'pending', 25, NULL),
  ('%em andamento%', 'pending', 25, NULL),
  ('%venda agenciada%', 'pending', 25, NULL),
  ('%fullfilment%', 'pending', 25, NULL),
  ('%pagamento aprovado%', 'approved', 30, NULL),
  ('%aprovad%', 'approved', 35, NULL),
  ('%verificado%', 'approved', 35, NULL),
  ('%preparando%', 'in_production', 40, NULL),
  ('%faturamento%', 'invoiced', 45, NULL),
  ('%faturad%', 'invoiced', 50, NULL),
  ('%atendido%', 'shipped', 55, NULL),
  ('%enviado%', 'shipped', 55, NULL),
  ('%enviad%', 'shipped', 60, NULL),
  ('%pronto envio%', 'shipped', 60, NULL),
  ('%completo%', 'shipped', 65, '%incompleto%'),
  ('%entregue%', 'delivered', 70, '%não entregue%|%nao entregue%'),
  ('%cancelad%', 'canceled', 75, NULL),
  ('%devolvid%', 'returned', 80, NULL),
  ('%em devolu%', 'refunded', 85, NULL)
ON CONFLICT (pattern, global_status) DO UPDATE
SET priority = EXCLUDED.priority,
    exclude_pattern = EXCLUDED.exclude_pattern,
    is_active = true;

-- Marketplace rules (Shopify, Nuvemshop, WooCommerce)
INSERT INTO sales.erp_provider_mapping_rules (provider, dimension, source_kind, source_value, global_slug, priority) VALUES
  ('bling', 'marketplace', 'name_pattern', '%shopify%', 'shopify', 25),
  ('bling', 'marketplace', 'name_pattern', '%nuvem%', 'nuvemshop', 25),
  ('bling', 'marketplace', 'name_pattern', '%woocommerce%', 'woocommerce', 25),
  ('tiny', 'marketplace', 'name_pattern', '%shopify%', 'shopify', 25),
  ('tiny', 'marketplace', 'name_pattern', '%nuvem%', 'nuvemshop', 25),
  ('tiny', 'marketplace', 'name_pattern', '%woocommerce%', 'woocommerce', 25)
ON CONFLICT (provider, dimension, source_kind, source_value) DO UPDATE
SET global_slug = EXCLUDED.global_slug, priority = EXCLUDED.priority, is_active = true;

-- Logistics name patterns
INSERT INTO sales.erp_provider_mapping_rules (provider, dimension, source_kind, source_value, global_slug, priority) VALUES
  ('bling', 'logistics', 'name_pattern', '%package%', 'mercado_envios_full', 18),
  ('bling', 'logistics', 'name_pattern', '%retirada%', 'sem_frete', 18),
  ('tiny', 'logistics', 'name_pattern', '%package%', 'mercado_envios_full', 18),
  ('tiny', 'logistics', 'name_pattern', '%retirada%', 'sem_frete', 18)
ON CONFLICT (provider, dimension, source_kind, source_value) DO UPDATE
SET global_slug = EXCLUDED.global_slug, priority = EXCLUDED.priority, is_active = true;

GRANT SELECT ON sales.erp_status_label_rules TO service_role;
GRANT SELECT ON sales.erp_status_label_rules TO authenticated;
