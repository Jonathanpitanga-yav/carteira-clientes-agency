CREATE OR REPLACE FUNCTION sales.get_dashboard_kpis(
  p_client_ids UUID[] DEFAULT NULL,
  p_date_from DATE DEFAULT NULL,
  p_date_to DATE DEFAULT NULL
)
RETURNS TABLE (
  total_revenue NUMERIC,
  total_orders BIGINT,
  avg_ticket NUMERIC,
  prev_total_revenue NUMERIC,
  prev_total_orders BIGINT,
  prev_avg_ticket NUMERIC
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = sales, public
AS $$
DECLARE
  v_date_to DATE := COALESCE(p_date_to, timezone('utc'::text, now())::date);
  v_date_from DATE := COALESCE(p_date_from, date_trunc('month', v_date_to)::date);
  v_prev_to DATE := v_date_from - INTERVAL '1 day';
  v_prev_from DATE := date_trunc('month', v_prev_to)::date;
BEGIN
  RETURN QUERY
  WITH current_p AS (
    SELECT
      COALESCE(SUM(i.total_amount) FILTER (WHERE COALESCE(i.global_status, '') NOT IN ('canceled','refunded','draft')), 0)::numeric(15,2) AS revenue,
      COUNT(*) FILTER (WHERE COALESCE(i.global_status, '') NOT IN ('canceled','refunded','draft'))::bigint AS orders
    FROM sales.invoices i
    WHERE COALESCE(i.global_status, '') NOT IN ('canceled','refunded','draft')
      AND i.issue_date >= v_date_from AND i.issue_date <= v_date_to
      AND (p_client_ids IS NULL OR i.client_id = ANY(p_client_ids))
  ),
  previous_p AS (
    SELECT
      COALESCE(SUM(i.total_amount) FILTER (WHERE COALESCE(i.global_status, '') NOT IN ('canceled','refunded','draft')), 0)::numeric(15,2) AS revenue,
      COUNT(*) FILTER (WHERE COALESCE(i.global_status, '') NOT IN ('canceled','refunded','draft'))::bigint AS orders
    FROM sales.invoices i
    WHERE COALESCE(i.global_status, '') NOT IN ('canceled','refunded','draft')
      AND i.issue_date >= v_prev_from AND i.issue_date <= v_prev_to
      AND (p_client_ids IS NULL OR i.client_id = ANY(p_client_ids))
  )
  SELECT
    c.revenue, c.orders,
    CASE WHEN c.orders > 0 THEN ROUND(c.revenue / c.orders, 2) ELSE 0 END,
    p.revenue, p.orders,
    CASE WHEN p.orders > 0 THEN ROUND(p.revenue / p.orders, 2) ELSE 0 END
  FROM current_p c, previous_p p;
END;
$$;

CREATE OR REPLACE FUNCTION sales.get_dashboard_channels(
  p_client_ids UUID[] DEFAULT NULL,
  p_date_from DATE DEFAULT NULL,
  p_date_to DATE DEFAULT NULL
)
RETURNS TABLE (
  channel_slug TEXT,
  client_count BIGINT,
  order_count BIGINT,
  total_revenue NUMERIC,
  avg_ticket NUMERIC
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = sales, public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(NULLIF(i.global_marketplace_slug, ''), 'unknown') AS channel_slug,
    COUNT(DISTINCT i.client_id)::bigint AS client_count,
    COUNT(*)::bigint AS order_count,
    COALESCE(SUM(i.total_amount), 0)::numeric(15,2) AS total_revenue,
    CASE WHEN COUNT(*) > 0 THEN ROUND(SUM(i.total_amount) / COUNT(*), 2) ELSE 0 END AS avg_ticket
  FROM sales.invoices i
  WHERE COALESCE(i.global_status, '') NOT IN ('canceled','refunded','draft')
    AND (p_client_ids IS NULL OR i.client_id = ANY(p_client_ids))
    AND (p_date_from IS NULL OR i.issue_date >= p_date_from)
    AND (p_date_to IS NULL OR i.issue_date <= p_date_to)
  GROUP BY 1
  ORDER BY total_revenue DESC;
END;
$$;

CREATE OR REPLACE FUNCTION sales.get_dashboard_logistics(
  p_client_ids UUID[] DEFAULT NULL,
  p_date_from DATE DEFAULT NULL,
  p_date_to DATE DEFAULT NULL
)
RETURNS TABLE (
  logistics_slug TEXT,
  client_count BIGINT,
  order_count BIGINT,
  total_revenue NUMERIC
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = sales, public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(NULLIF(i.global_logistics_slug, ''), 'unknown') AS logistics_slug,
    COUNT(DISTINCT i.client_id)::bigint AS client_count,
    COUNT(*)::bigint AS order_count,
    COALESCE(SUM(i.total_amount), 0)::numeric(15,2) AS total_revenue
  FROM sales.invoices i
  WHERE COALESCE(i.global_status, '') NOT IN ('canceled','refunded','draft')
    AND COALESCE(NULLIF(i.global_logistics_slug, ''), 'unknown') IS DISTINCT FROM 'unknown'
    AND (p_client_ids IS NULL OR i.client_id = ANY(p_client_ids))
    AND (p_date_from IS NULL OR i.issue_date >= p_date_from)
    AND (p_date_to IS NULL OR i.issue_date <= p_date_to)
  GROUP BY 1
  ORDER BY total_revenue DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION sales.get_dashboard_kpis(UUID[], DATE, DATE) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION sales.get_dashboard_channels(UUID[], DATE, DATE) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION sales.get_dashboard_logistics(UUID[], DATE, DATE) TO authenticated, service_role;
