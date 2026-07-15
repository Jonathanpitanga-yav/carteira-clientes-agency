WITH items_data AS (
  SELECT
    i.id AS invoice_id,
    i.client_id,
    i.app_id,
    item ->> 'codigo' AS sku,
    item ->> 'descricao' AS description,
    item ->> 'id' AS external_item_id,
    COALESCE((item ->> 'quantidade')::numeric, 0) AS quantity,
    COALESCE((item ->> 'valor')::numeric, 0) AS total_amount,
    COALESCE((item ->> 'desconto')::numeric, 0) AS discount,
    ((item -> 'comissao') ->> 'base')::numeric AS commission_base,
    ((item -> 'comissao') ->> 'valor')::numeric AS commission_value
  FROM sales.invoices i,
  LATERAL jsonb_array_elements(
    CASE WHEN raw_payload ? 'itens'
      THEN raw_payload -> 'itens'
      ELSE '[]'::jsonb END
  ) AS item
  WHERE i.raw_payload ? 'itens'
),
upserted_products AS (
  INSERT INTO sales.products (client_id, app_id, external_id, name, sku)
  SELECT DISTINCT
    idata.client_id,
    idata.app_id,
    idata.sku,
    COALESCE(idata.description, idata.sku, 'Produto ' || idata.sku),
    idata.sku
  FROM items_data idata
  ON CONFLICT (app_id, external_id) DO NOTHING
  RETURNING id AS product_id, external_id AS product_sku
)
INSERT INTO sales.invoice_items (invoice_id, product_id, external_product_id, description, quantity, total_amount)
SELECT
  idata.invoice_id,
  p.id AS product_id,
  idata.external_item_id,
  idata.description,
  idata.quantity,
  idata.total_amount
FROM items_data idata
LEFT JOIN sales.products p ON p.app_id = idata.app_id AND p.external_id = idata.sku
ON CONFLICT DO NOTHING;
