CREATE OR REPLACE FUNCTION sales.get_dashboard_abc(
  p_client_ids UUID[] DEFAULT NULL,
  p_date_from DATE DEFAULT NULL,
  p_date_to DATE DEFAULT NULL
)
RETURNS TABLE (
  client_id UUID,
  client_name TEXT,
  product_id UUID,
  product_name TEXT,
  sku TEXT,
  category TEXT,
  total_revenue NUMERIC,
  total_quantity NUMERIC,
  order_count BIGINT,
  rank BIGINT,
  prev_rank BIGINT,
  cumulative_pct NUMERIC,
  abc_class TEXT
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = sales, public
AS $$
DECLARE
  v_date_to DATE := COALESCE(p_date_to, timezone('utc'::text, now())::date);
  v_date_from DATE := COALESCE(p_date_from, (v_date_to - INTERVAL '30 days')::date);
  v_period_days INT := v_date_to - v_date_from + 1;
  v_prev_from DATE := v_date_from - (v_period_days || ' days')::INTERVAL;
  v_prev_to DATE := v_date_from - INTERVAL '1 day';
BEGIN
  RETURN QUERY
  WITH current_items AS (
    SELECT
      i.client_id,
      c.name AS client_name,
      p.id AS product_id,
      p.name AS product_name,
      p.sku,
      p.category,
      COALESCE(SUM(ii.total_amount), 0)::numeric(15,2) AS revenue,
      COALESCE(SUM(ii.quantity), 0)::numeric(15,4) AS quantity,
      COUNT(DISTINCT i.id)::bigint AS orders,
      ROW_NUMBER() OVER (PARTITION BY i.client_id ORDER BY SUM(ii.total_amount) DESC)::bigint AS rnk
    FROM sales.invoice_items ii
    JOIN sales.invoices i ON i.id = ii.invoice_id AND COALESCE(i.global_status, '') NOT IN ('canceled','refunded','draft')
    JOIN sales.products p ON p.id = ii.product_id
    LEFT JOIN core.clients c ON c.id = i.client_id
    WHERE i.issue_date >= v_date_from AND i.issue_date <= v_date_to
      AND (p_client_ids IS NULL OR i.client_id = ANY(p_client_ids))
    GROUP BY i.client_id, c.name, p.id, p.name, p.sku, p.category
  ),
  prev_items AS (
    SELECT
      p.id AS product_id,
      i.client_id,
      SUM(ii.total_amount)::numeric(15,2) AS revenue,
      ROW_NUMBER() OVER (PARTITION BY i.client_id ORDER BY SUM(ii.total_amount) DESC)::bigint AS rnk
    FROM sales.invoice_items ii
    JOIN sales.invoices i ON i.id = ii.invoice_id AND COALESCE(i.global_status, '') NOT IN ('canceled','refunded','draft')
    JOIN sales.products p ON p.id = ii.product_id
    WHERE i.issue_date >= v_prev_from AND i.issue_date <= v_prev_to
      AND (p_client_ids IS NULL OR i.client_id = ANY(p_client_ids))
    GROUP BY p.id, i.client_id
  ),
  ranked AS (
    SELECT ci.*,
      SUM(ci.revenue) OVER (PARTITION BY ci.client_id) AS client_total,
      SUM(ci.revenue) OVER (PARTITION BY ci.client_id ORDER BY ci.revenue DESC) / NULLIF(SUM(ci.revenue) OVER (PARTITION BY ci.client_id), 0) * 100 AS cum_pct,
      pi.rnk AS prev_rnk
    FROM current_items ci
    LEFT JOIN prev_items pi ON pi.product_id = ci.product_id AND pi.client_id = ci.client_id
  )
  SELECT
    r.client_id, r.client_name, r.product_id, r.product_name,
    r.sku, r.category, r.revenue, r.quantity, r.orders,
    r.rnk, r.prev_rnk,
    ROUND(r.cum_pct, 2),
    CASE WHEN r.cum_pct <= 80 THEN 'A' WHEN r.cum_pct <= 95 THEN 'B' ELSE 'C' END
  FROM ranked r
  WHERE r.revenue > 0
  ORDER BY r.client_name, r.rnk;
END;
$$;

GRANT EXECUTE ON FUNCTION sales.get_dashboard_abc(UUID[], DATE, DATE) TO authenticated, service_role;
