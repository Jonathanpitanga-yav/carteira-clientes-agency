-- Fix Magalu Fulfillment detection
-- When notaFiscal.id = 0 AND transport service contains "Magalu", it's Fulfillment
-- (Magalu handles invoicing in Fulfillment, so seller's ERP shows no NF-e)

-- Backfill existing Fulfillment orders
UPDATE sales.invoices
SET
  erp_logistics_name = 'Magalu Full',
  shipping_method = 'Magalu Full',
  global_logistics_slug = 'magalu_fulfillment'
WHERE raw_payload->'notaFiscal'->>'id' = '0'
  AND raw_payload->'transporte'->'volumes'->0->>'servico' ILIKE '%magalu%'
  AND global_logistics_slug IS DISTINCT FROM 'magalu_fulfillment';
