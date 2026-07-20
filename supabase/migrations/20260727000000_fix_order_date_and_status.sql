-- Fix date: prefer data (order creation) over dataEmissao (invoice issue)
-- The customer purchase date is more relevant for client-facing views

-- Fix status: code 6 label "Em aberto" should map to "pending", not "delivered"
-- In Bling, status code 6 means "Entregue" by default, but many clients customize
-- it to "Em aberto". The label rule catches this dynamically.

-- 1. Universal status label rule for "Em aberto"
INSERT INTO sales.erp_status_label_rules (pattern, global_status, priority)
SELECT '%Em aberto%', 'pending', 10
WHERE NOT EXISTS (
  SELECT 1 FROM sales.erp_status_label_rules
  WHERE pattern = '%Em aberto%' AND global_status = 'pending'
);

-- 2. Fix erp_status_mappings where code 6 has label "Entregue" but the actual
--    Bling label for that app is "Em aberto" (already updated by dictionary sync,
--    but the global_status mapping lagged behind)
UPDATE sales.erp_status_mappings
SET global_status = 'pending'
WHERE erp_status_code = '6'
  AND erp_status_label ILIKE '%Em aberto%'
  AND global_status IS DISTINCT FROM 'pending';

-- 3. Backfill invoices with wrong global_status
--    Orders with erp_status_code = 6 that should be "pending" not "delivered"
UPDATE sales.invoices
SET global_status = 'pending'
WHERE erp_status_code = '6'
  AND global_status = 'delivered';
