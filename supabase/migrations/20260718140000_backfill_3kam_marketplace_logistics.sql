-- Backfill marketplace/logistics para pedidos com slug unknown (ex.: 3KAM)

UPDATE sales.erp_marketplaces em
SET global_marketplace_slug = CASE
  WHEN lower(em.name) LIKE '%mercado%' THEN 'mercado_livre'
  WHEN lower(em.name) LIKE '%magalu%' THEN 'magalu'
  WHEN lower(em.name) LIKE '%shopee%' THEN 'shopee'
  WHEN lower(em.name) LIKE '%amazon%' THEN 'amazon'
  WHEN lower(em.name) LIKE '%shopify%' THEN 'shopify'
  WHEN lower(em.name) LIKE '%nuvem%' THEN 'nuvemshop'
  WHEN lower(em.name) LIKE '%woocommerce%' THEN 'woocommerce'
  WHEN lower(em.name) LIKE '%loja propria%' OR lower(em.name) LIKE '%loja própria%' THEN 'shopify'
  ELSE em.global_marketplace_slug
END
WHERE em.global_marketplace_slug IS NULL
  AND (
    lower(em.name) LIKE '%mercado%'
    OR lower(em.name) LIKE '%magalu%'
    OR lower(em.name) LIKE '%shopee%'
    OR lower(em.name) LIKE '%amazon%'
    OR lower(em.name) LIKE '%shopify%'
    OR lower(em.name) LIKE '%nuvem%'
    OR lower(em.name) LIKE '%woocommerce%'
    OR lower(em.name) LIKE '%loja propria%'
    OR lower(em.name) LIKE '%loja própria%'
  );

UPDATE sales.invoices i
SET
  marketplace_name = COALESCE(i.marketplace_name, em.name),
  global_marketplace_slug = COALESCE(
    NULLIF(i.global_marketplace_slug, 'unknown'),
    em.global_marketplace_slug,
    CASE
      WHEN lower(em.name) LIKE '%mercado%' THEN 'mercado_livre'
      WHEN lower(em.name) LIKE '%magalu%' THEN 'magalu'
      WHEN lower(em.name) LIKE '%shopee%' THEN 'shopee'
      WHEN lower(em.name) LIKE '%amazon%' THEN 'amazon'
      WHEN lower(em.name) LIKE '%shopify%' THEN 'shopify'
      WHEN lower(em.name) LIKE '%nuvem%' THEN 'nuvemshop'
      WHEN lower(em.name) LIKE '%woocommerce%' THEN 'woocommerce'
      ELSE i.global_marketplace_slug
    END
  )
FROM sales.erp_marketplaces em
WHERE i.marketplace_id = em.id
  AND (
    i.marketplace_name IS NULL
    OR i.global_marketplace_slug IS NULL
    OR i.global_marketplace_slug = 'unknown'
  );

UPDATE sales.invoices i
SET global_logistics_slug = CASE
  WHEN i.global_logistics_slug IS NULL OR i.global_logistics_slug = 'unknown' THEN
    CASE i.global_marketplace_slug
      WHEN 'mercado_livre' THEN 'mercado_envios'
      WHEN 'magalu' THEN 'magalu_entregas'
      WHEN 'shopee' THEN 'shopee_envios'
      WHEN 'amazon' THEN 'amazon_dba'
      ELSE i.global_logistics_slug
    END
  ELSE i.global_logistics_slug
END
WHERE i.global_marketplace_slug IN ('mercado_livre', 'magalu', 'shopee', 'amazon')
  AND (i.global_logistics_slug IS NULL OR i.global_logistics_slug = 'unknown');
