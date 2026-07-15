DROP VIEW IF EXISTS sales.client_item_abc_curve CASCADE;
DROP FUNCTION IF EXISTS sales.get_dashboard_abc(UUID[], DATE, DATE);

CREATE VIEW sales.client_item_abc_curve
WITH (security_invoker = true)
AS
WITH item_revenue AS (
  SELECT
    i.client_id,
    c.name AS client_name,
    p.id AS product_id,
    p.name AS product_name,
    p.sku,
    p.category,
    to_char(COALESCE(i.issue_date, i.created_at::date), 'YYYY-MM') AS year_month,
    COALESCE(SUM(ii.total_amount), 0)::numeric(15,2) AS total_revenue,
    COALESCE(SUM(ii.quantity), 0)::numeric(15,4) AS total_quantity,
    COUNT(DISTINCT i.id)::bigint AS order_count
  FROM sales.invoice_items ii
  JOIN sales.invoices i ON i.id = ii.invoice_id
    AND COALESCE(i.global_status, '') NOT IN ('canceled', 'refunded', 'draft')
  JOIN sales.products p ON p.id = ii.product_id
  LEFT JOIN core.clients c ON c.id = i.client_id
  GROUP BY i.client_id, c.name, p.id, p.name, p.sku, p.category,
    to_char(COALESCE(i.issue_date, i.created_at::date), 'YYYY-MM')
),
current_month AS (
  SELECT MAX(year_month) AS ym FROM item_revenue
),
ranked AS (
  SELECT ir.*,
    SUM(ir.total_revenue) OVER (
      PARTITION BY ir.client_id, ir.year_month
      ORDER BY ir.total_revenue DESC
    ) / NULLIF(SUM(ir.total_revenue) OVER (PARTITION BY ir.client_id, ir.year_month), 0) * 100 AS cumulative_pct,
    ROW_NUMBER() OVER (
      PARTITION BY ir.client_id, ir.year_month
      ORDER BY ir.total_revenue DESC
    )::bigint AS rank
  FROM item_revenue ir
  WHERE ir.total_revenue > 0
),
prev_month AS (
  SELECT
    ir.client_id,
    ir.product_id,
    ir.year_month,
    ROW_NUMBER() OVER (
      PARTITION BY ir.client_id, ir.year_month
      ORDER BY ir.total_revenue DESC
    )::bigint AS prev_rank
  FROM item_revenue ir
  WHERE ir.total_revenue > 0
)
SELECT
  r.client_id,
  r.client_name,
  r.product_id,
  r.product_name,
  r.sku,
  r.category,
  r.year_month,
  r.total_revenue,
  r.total_quantity,
  r.order_count,
  r.rank,
  pm.prev_rank,
  ROUND(r.cumulative_pct, 2) AS cumulative_pct,
  CASE
    WHEN r.cumulative_pct <= 80 THEN 'A'
    WHEN r.cumulative_pct <= 95 THEN 'B'
    ELSE 'C'
  END AS abc_class
FROM ranked r
LEFT JOIN prev_month pm
  ON pm.client_id = r.client_id
  AND pm.product_id = r.product_id
  AND pm.year_month = to_char(
    (date_trunc('month', (r.year_month || '-01')::date) - INTERVAL '1 month')::date,
    'YYYY-MM'
  )
WHERE r.year_month = (SELECT ym FROM current_month);

GRANT SELECT ON sales.client_item_abc_curve TO authenticated, service_role;
