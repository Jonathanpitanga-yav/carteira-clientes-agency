-- Remove filtro de mês único da Curva ABC
-- A view agora expõe todos os meses; o filtro por período é feito no frontend
-- Isso permite que os filtros de data (dateFrom/dateTo) funcionem corretamente

DROP VIEW IF EXISTS sales.client_item_abc_curve CASCADE;

CREATE VIEW sales.client_item_abc_curve
WITH (security_invoker = true)
AS
WITH item_revenue AS (
  SELECT
    i.client_id,
    c.name AS client_name,
    p.sku AS product_sku,
    COALESCE(p.name, p.sku, 'Produto ' || p.sku) AS product_name,
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
  GROUP BY i.client_id, c.name, p.sku, COALESCE(p.name, p.sku, 'Produto ' || p.sku), p.category,
    to_char(COALESCE(i.issue_date, i.created_at::date), 'YYYY-MM')
),
monthly_rank AS (
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
prev_ranks AS (
  SELECT client_id, product_sku, year_month, rank AS prev_rank
  FROM monthly_rank
)
SELECT
  r.client_id,
  r.client_name,
  r.product_sku AS sku,
  r.product_name,
  r.category,
  r.year_month,
  r.total_revenue,
  r.total_quantity,
  r.order_count,
  r.rank,
  pr.prev_rank,
  ROUND(r.cumulative_pct, 2) AS cumulative_pct,
  CASE
    WHEN r.cumulative_pct <= 80 THEN 'A'
    WHEN r.cumulative_pct <= 95 THEN 'B'
    ELSE 'C'
  END AS abc_class
FROM monthly_rank r
LEFT JOIN prev_ranks pr
  ON pr.client_id = r.client_id
  AND pr.product_sku = r.product_sku
  AND pr.year_month = to_char(
    (date_trunc('month', (r.year_month || '-01')::date) - INTERVAL '1 month')::date,
    'YYYY-MM'
  );

GRANT SELECT ON sales.client_item_abc_curve TO authenticated, service_role;
