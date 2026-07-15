-- Corrige mapeamentos de status customizados do Bling (códigos padrão reutilizados com outros rótulos)
UPDATE sales.erp_status_mappings
SET
  global_status = CASE
    WHEN LOWER(erp_status_label) ~ '(atendido|enviado|completo|pronto envio)' THEN 'shipped'
    WHEN LOWER(erp_status_label) ~ 'entregue' THEN 'delivered'
    WHEN LOWER(erp_status_label) ~ 'cancelad' THEN 'canceled'
    WHEN LOWER(erp_status_label) ~ 'devolvid' THEN 'refunded'
    WHEN LOWER(erp_status_label) ~ 'faturad' THEN 'invoiced'
    WHEN LOWER(erp_status_label) ~ 'aprovad' THEN 'approved'
    WHEN LOWER(erp_status_label) ~ 'rascunho|digita' THEN 'draft'
    ELSE global_status
  END
WHERE app_id = '594b3e65-05c2-457b-a0a1-ff638078f97c';

-- Situações customizadas do módulo Pedidos de Venda (API Bling)
INSERT INTO sales.erp_status_mappings (app_id, erp_status_code, erp_status_label, global_status, is_active)
VALUES
  ('594b3e65-05c2-457b-a0a1-ff638078f97c', '6', 'Em aberto', 'pending', true),
  ('594b3e65-05c2-457b-a0a1-ff638078f97c', '9', 'Atendido', 'shipped', true),
  ('594b3e65-05c2-457b-a0a1-ff638078f97c', '12', 'Cancelado', 'canceled', true),
  ('594b3e65-05c2-457b-a0a1-ff638078f97c', '15', 'Em andamento', 'pending', true),
  ('594b3e65-05c2-457b-a0a1-ff638078f97c', '18', 'Venda Agenciada', 'pending', true),
  ('594b3e65-05c2-457b-a0a1-ff638078f97c', '21', 'Em digitação', 'draft', true),
  ('594b3e65-05c2-457b-a0a1-ff638078f97c', '24', 'Verificado', 'approved', true),
  ('594b3e65-05c2-457b-a0a1-ff638078f97c', '449109', 'Enviado G8', 'shipped', true),
  ('594b3e65-05c2-457b-a0a1-ff638078f97c', '451573', 'FULLFILMENT', 'pending', true),
  ('594b3e65-05c2-457b-a0a1-ff638078f97c', '451579', 'ENVIADO G8 FULL', 'shipped', true),
  ('594b3e65-05c2-457b-a0a1-ff638078f97c', '455865', 'Faturamento MELI FULL', 'invoiced', true),
  ('594b3e65-05c2-457b-a0a1-ff638078f97c', '455866', 'Faturamento MAGALU FULL', 'invoiced', true),
  ('594b3e65-05c2-457b-a0a1-ff638078f97c', '455867', 'Faturamento AMAZON FULL', 'invoiced', true),
  ('594b3e65-05c2-457b-a0a1-ff638078f97c', '468826', 'B2B Consignacao', 'approved', true),
  ('594b3e65-05c2-457b-a0a1-ff638078f97c', '750378', 'Pagamento aprovado', 'approved', true),
  ('594b3e65-05c2-457b-a0a1-ff638078f97c', '750379', 'Em devolução', 'refunded', true)
ON CONFLICT (app_id, erp_status_code) DO UPDATE SET
  erp_status_label = EXCLUDED.erp_status_label,
  global_status = EXCLUDED.global_status,
  is_active = true;

-- Pedidos com código 9 = Atendido neste tenant
UPDATE sales.invoices
SET
  erp_status_label = 'Atendido',
  global_status = 'shipped'
WHERE app_id = '594b3e65-05c2-457b-a0a1-ff638078f97c'
  AND erp_status_code = '9';

UPDATE sales.invoices
SET erp_status_label = 'Cancelado', global_status = 'canceled'
WHERE app_id = '594b3e65-05c2-457b-a0a1-ff638078f97c' AND erp_status_code = '12';

UPDATE sales.invoices
SET erp_status_label = 'Em aberto', global_status = 'pending'
WHERE app_id = '594b3e65-05c2-457b-a0a1-ff638078f97c' AND erp_status_code = '6';

-- Marketplace ML
UPDATE sales.invoices
SET
  marketplace_name = 'Mercado Livre',
  sales_channel = 'Mercado Livre',
  global_marketplace_slug = 'mercado_livre'
WHERE app_id = '594b3e65-05c2-457b-a0a1-ff638078f97c'
  AND (
    marketplace_name LIKE 'ST%'
    OR raw_payload->'loja'->>'id' = '206029062'
    OR (raw_payload->>'numeroLoja') ~ '^2000'
  );
