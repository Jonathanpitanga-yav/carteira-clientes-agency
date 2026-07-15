-- Tipo de loja: Shopify/Nuvemshop/WooCommerce = ecommerce; demais marketplaces = marketplace

DROP VIEW IF EXISTS sales.marketplace_monthly_ranking;
DROP VIEW IF EXISTS sales.channel_monthly_revenue;

CREATE VIEW sales.marketplace_monthly_ranking AS
WITH agg AS (
  SELECT
    COALESCE(NULLIF(i.global_marketplace_slug, ''), 'unknown') AS marketplace_slug,
    to_char(COALESCE(i.issue_date, i.created_at::date), 'YYYY-MM') AS year_month,
    COALESCE(
      SUM(i.total_amount) FILTER (
        WHERE COALESCE(i.global_status, '') NOT IN ('canceled', 'refunded')
      ),
      0
    )::numeric AS total_revenue,
    COUNT(*) FILTER (
      WHERE COALESCE(i.global_status, '') NOT IN ('canceled', 'refunded', 'draft')
    )::bigint AS order_count
  FROM sales.invoices i
  GROUP BY 1, 2
)
SELECT
  marketplace_slug,
  year_month,
  total_revenue,
  order_count,
  ROW_NUMBER() OVER (
    PARTITION BY year_month
    ORDER BY total_revenue DESC, order_count DESC
  )::int AS rank
FROM agg
WHERE order_count > 0
  AND marketplace_slug NOT IN ('unknown', 'shopify', 'nuvemshop', 'woocommerce');

CREATE VIEW sales.channel_monthly_revenue AS
SELECT
  CASE
    WHEN COALESCE(i.global_marketplace_slug, '') IN ('shopify', 'nuvemshop', 'woocommerce') THEN 'ecommerce'
    WHEN COALESCE(i.global_order_type_slug, '') = 'ecommerce' THEN 'ecommerce'
    ELSE 'marketplace'
  END AS channel_slug,
  to_char(COALESCE(i.issue_date, i.created_at::date), 'YYYY-MM') AS year_month,
  COALESCE(
    SUM(i.total_amount) FILTER (
      WHERE COALESCE(i.global_status, '') NOT IN ('canceled', 'refunded')
    ),
    0
  )::numeric AS total_revenue,
  COUNT(*) FILTER (
    WHERE COALESCE(i.global_status, '') NOT IN ('canceled', 'refunded', 'draft')
  )::bigint AS order_count
FROM sales.invoices i
WHERE COALESCE(i.global_status, '') NOT IN ('canceled', 'refunded', 'draft')
GROUP BY 1, 2;

GRANT SELECT ON sales.marketplace_monthly_ranking TO authenticated, service_role;
GRANT SELECT ON sales.channel_monthly_revenue TO authenticated, service_role;
