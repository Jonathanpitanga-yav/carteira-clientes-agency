-- Ranking de plataformas e-commerce (Shopify, Nuvemshop, WooCommerce, loja própria)

DROP VIEW IF EXISTS sales.ecommerce_monthly_ranking;

CREATE VIEW sales.ecommerce_monthly_ranking AS
WITH classified AS (
  SELECT
    i.total_amount,
    i.global_status,
    i.global_marketplace_slug,
    i.global_order_type_slug,
    i.marketplace_name,
    to_char(COALESCE(i.issue_date, i.created_at::date), 'YYYY-MM') AS year_month,
    CASE
      WHEN COALESCE(i.global_marketplace_slug, '') IN ('shopify', 'nuvemshop', 'woocommerce')
        THEN i.global_marketplace_slug
      WHEN lower(COALESCE(i.marketplace_name, '')) LIKE '%shopify%' THEN 'shopify'
      WHEN lower(COALESCE(i.marketplace_name, '')) LIKE '%nuvem%' THEN 'nuvemshop'
      WHEN lower(COALESCE(i.marketplace_name, '')) LIKE '%woocommerce%' THEN 'woocommerce'
      WHEN COALESCE(i.global_order_type_slug, '') = 'ecommerce' THEN 'loja_propria'
      ELSE NULL
    END AS ecommerce_slug
  FROM sales.invoices i
),
agg AS (
  SELECT
    ecommerce_slug,
    year_month,
    COALESCE(
      SUM(total_amount) FILTER (
        WHERE COALESCE(global_status, '') NOT IN ('canceled', 'refunded')
      ),
      0
    )::numeric AS total_revenue,
    COUNT(*) FILTER (
      WHERE COALESCE(global_status, '') NOT IN ('canceled', 'refunded', 'draft')
    )::bigint AS order_count
  FROM classified
  WHERE ecommerce_slug IS NOT NULL
  GROUP BY ecommerce_slug, year_month
)
SELECT
  ecommerce_slug,
  year_month,
  total_revenue,
  order_count,
  ROW_NUMBER() OVER (
    PARTITION BY year_month
    ORDER BY total_revenue DESC, order_count DESC
  )::int AS rank
FROM agg
WHERE order_count > 0;

GRANT SELECT ON sales.ecommerce_monthly_ranking TO authenticated, service_role;
