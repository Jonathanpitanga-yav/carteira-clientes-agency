-- Fix Magalu Full logistics mapping + date parsing priority

-- 1. Add specific mapping rule for "Magalu Full" → magalu_fulfillment
--    Priority 10 (higher than generic '%magalu%' at priority 30)
INSERT INTO sales.erp_provider_mapping_rules (provider, dimension, source_kind, source_value, global_slug, priority)
SELECT 'bling', 'logistics', 'name_pattern', '%Magalu Full%', 'magalu_fulfillment', 10
WHERE NOT EXISTS (
  SELECT 1 FROM sales.erp_provider_mapping_rules
  WHERE provider = 'bling' AND dimension = 'logistics'
    AND source_kind = 'name_pattern' AND source_value = '%Magalu Full%'
);

-- 2. Backfill any existing invoices with "Magalu Full" in the logistics name
UPDATE sales.invoices
SET global_logistics_slug = 'magalu_fulfillment', synced_at = NULL
WHERE COALESCE(erp_logistics_name, '') ILIKE '%Magalu Full%'
  AND global_logistics_slug IS DISTINCT FROM 'magalu_fulfillment';

-- 3. Trigger re-sync for order 6387 to re-translate with updated rules
UPDATE sales.invoices
SET synced_at = NULL
WHERE invoice_number = '6387';
