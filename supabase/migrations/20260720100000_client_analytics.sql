CREATE VIEW sales.client_channel_breakdown AS
SELECT
  i.client_id,
  c.name AS client_name,
  COALESCE(NULLIF(i.global_marketplace_slug, ''), 'unknown') AS channel_slug,
  to_char(COALESCE(i.issue_date, i.created_at::date), 'YYYY-MM') AS year_month,
  COUNT(*) FILTER (WHERE COALESCE(i.global_status, '') NOT IN ('canceled','refunded','draft'))::bigint AS order_count,
  COALESCE(SUM(i.total_amount) FILTER (WHERE COALESCE(i.global_status, '') NOT IN ('canceled','refunded','draft')), 0)::numeric(15,2) AS total_revenue,
  CASE WHEN COUNT(*) FILTER (WHERE COALESCE(i.global_status, '') NOT IN ('canceled','refunded','draft')) > 0
    THEN ROUND(
      SUM(i.total_amount) FILTER (WHERE COALESCE(i.global_status, '') NOT IN ('canceled','refunded','draft'))
      / NULLIF(COUNT(*) FILTER (WHERE COALESCE(i.global_status, '') NOT IN ('canceled','refunded','draft')), 0), 2
    ) ELSE 0
  END AS avg_ticket
FROM sales.invoices i
LEFT JOIN core.clients c ON c.id = i.client_id
WHERE COALESCE(i.global_status, '') NOT IN ('canceled','refunded','draft')
GROUP BY i.client_id, c.name, 3, 4;

GRANT SELECT ON sales.client_channel_breakdown TO authenticated, service_role;

CREATE VIEW sales.client_logistics_breakdown AS
SELECT
  i.client_id,
  c.name AS client_name,
  COALESCE(NULLIF(i.global_logistics_slug, ''), 'unknown') AS logistics_slug,
  to_char(COALESCE(i.issue_date, i.created_at::date), 'YYYY-MM') AS year_month,
  COUNT(*) FILTER (WHERE COALESCE(i.global_status, '') NOT IN ('canceled','refunded','draft'))::bigint AS order_count,
  COALESCE(SUM(i.total_amount) FILTER (WHERE COALESCE(i.global_status, '') NOT IN ('canceled','refunded','draft')), 0)::numeric(15,2) AS total_revenue
FROM sales.invoices i
LEFT JOIN core.clients c ON c.id = i.client_id
WHERE COALESCE(i.global_status, '') NOT IN ('canceled','refunded','draft')
  AND COALESCE(NULLIF(i.global_logistics_slug, ''), 'unknown') IS DISTINCT FROM 'unknown'
GROUP BY i.client_id, c.name, 3, 4;

GRANT SELECT ON sales.client_logistics_breakdown TO authenticated, service_role;

CREATE VIEW sales.client_item_abc_curve AS
WITH item_revenue AS (
  SELECT
    i.client_id,
    c.name AS client_name,
    p.id AS product_id,
    p.name AS product_name,
    p.sku,
    p.category,
    SUM(ii.total_amount)::numeric(15,2) AS total_revenue,
    SUM(ii.quantity)::numeric(15,4) AS total_quantity,
    COUNT(DISTINCT i.id)::bigint AS order_count
  FROM sales.invoice_items ii
  JOIN sales.invoices i ON i.id = ii.invoice_id
  JOIN sales.products p ON p.id = ii.product_id
  LEFT JOIN core.clients c ON c.id = i.client_id
  WHERE COALESCE(i.global_status, '') NOT IN ('canceled','refunded','draft')
  GROUP BY i.client_id, c.name, p.id, p.name, p.sku, p.category
),
ranked AS (
  SELECT *,
    SUM(total_revenue) OVER (PARTITION BY client_id ORDER BY total_revenue DESC) / NULLIF(SUM(total_revenue) OVER (PARTITION BY client_id), 0) * 100 AS cumulative_pct,
    SUM(total_revenue) OVER (PARTITION BY client_id) AS client_total_revenue,
    ROW_NUMBER() OVER (PARTITION BY client_id ORDER BY total_revenue DESC) AS rank
  FROM item_revenue
)
SELECT
  client_id,
  client_name,
  product_id,
  product_name,
  sku,
  category,
  total_revenue,
  total_quantity,
  order_count,
  rank,
  ROUND(cumulative_pct, 2) AS cumulative_pct,
  CASE
    WHEN cumulative_pct <= 80 THEN 'A'
    WHEN cumulative_pct <= 95 THEN 'B'
    ELSE 'C'
  END AS abc_class
FROM ranked
WHERE total_revenue > 0;

GRANT SELECT ON sales.client_item_abc_curve TO authenticated, service_role;
