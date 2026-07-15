-- Bling: Atendido (12) e Completo (status customizado) indicam pedido impresso/enviado → shipped

UPDATE sales.erp_provider_mapping_rules
SET global_slug = 'shipped'
WHERE provider = 'bling'
  AND dimension = 'status'
  AND source_kind = 'enum_code'
  AND source_value = '12';

INSERT INTO sales.erp_provider_mapping_rules (provider, dimension, source_kind, source_value, global_slug, priority) VALUES
  ('bling', 'status', 'name_pattern', '%atendido%', 'shipped', 15),
  ('bling', 'status', 'name_pattern', '%completo%', 'shipped', 15),
  ('bling', 'status', 'name_pattern', '%enviado%', 'shipped', 15)
ON CONFLICT (provider, dimension, source_kind, source_value) DO UPDATE
SET global_slug = EXCLUDED.global_slug, priority = EXCLUDED.priority, is_active = true;

-- Status customizado "Completo" (conta Bling atual)
INSERT INTO sales.erp_provider_mapping_rules (provider, dimension, source_kind, source_value, global_slug, priority) VALUES
  ('bling', 'status', 'enum_code', '449109', 'shipped', 10)
ON CONFLICT (provider, dimension, source_kind, source_value) DO UPDATE
SET global_slug = EXCLUDED.global_slug, is_active = true;

UPDATE sales.erp_status_mappings
SET global_status = 'shipped'
WHERE erp_status_code = '12'
  AND app_id IN (
    SELECT ca.id
    FROM integration.client_applications ca
    JOIN integration.erp_providers ep ON ep.id = ca.provider_id
    WHERE ep.name = 'bling'
  );
