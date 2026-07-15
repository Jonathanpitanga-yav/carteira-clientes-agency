DELETE FROM sales.invoice_items;
DELETE FROM sales.products;

WITH items_data AS (
  SELECT
    i.id AS invoice_id,
    i.client_id,
    i.app_id,
    item ->> 'codigo' AS sku,
    item ->> 'descricao' AS description,
    item ->> 'id' AS external_product_id,
    COALESCE((item ->> 'quantidade')::numeric, 0) AS quantity,
    COALESCE((item ->> 'valor')::numeric, 0) AS total_amount
  FROM sales.invoices i,
  LATERAL jsonb_array_elements(
    CASE WHEN raw_payload ? 'itens'
      THEN raw_payload -> 'itens'
      ELSE '[]'::jsonb END
  ) AS item
  WHERE i.raw_payload ? 'itens'
),
upserted_products AS (
  INSERT INTO sales.products (client_id, app_id, external_id, name, sku, price)
  SELECT DISTINCT
    idata.client_id,
    idata.app_id,
    idata.external_product_id,
    COALESCE(idata.description, idata.sku, 'Produto ' || idata.external_product_id),
    idata.sku,
    0
  FROM items_data idata
  ON CONFLICT (app_id, external_id) DO NOTHING
)
INSERT INTO sales.invoice_items (invoice_id, product_id, external_product_id, description, quantity, total_amount)
SELECT
  idata.invoice_id,
  p.id,
  idata.external_product_id,
  idata.description,
  idata.quantity,
  idata.total_amount
FROM items_data idata
JOIN sales.products p ON p.app_id = idata.app_id AND p.external_id = idata.external_product_id
ON CONFLICT DO NOTHING;
