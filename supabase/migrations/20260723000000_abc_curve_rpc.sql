-- RPC para Curva ABC com filtro por período e clientes
-- Substitui a consulta direta à view client_item_abc_curve que era fixa no mês atual

CREATE OR REPLACE FUNCTION sales.get_client_abc_curve(
  p_client_ids UUID[] DEFAULT NULL,
  p_date_from DATE DEFAULT NULL,
  p_date_to DATE DEFAULT NULL
)
RETURNS TABLE (
  client_id UUID,
  client_name TEXT,
  sku TEXT,
  product_name TEXT,
  category TEXT,
  total_revenue NUMERIC,
  total_quantity NUMERIC,
  order_count BIGINT,
  rank BIGINT,
  cumulative_pct NUMERIC,
  abc_class TEXT
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = sales, public
AS $$
DECLARE
  v_date_to DATE := COALESCE(p_date_to, timezone('utc'::text, now())::date);
  v_date_from DATE := COALESCE(p_date_from, date_trunc('month', v_date_to)::date);
BEGIN
  RETURN QUERY
  WITH item_revenue AS (
    SELECT
      i.client_id,
      c.name::text AS client_name,
      p.sku::text AS product_sku,
      COALESCE(p.name, p.sku, 'Produto ' || p.sku)::text AS product_name,
      p.category::text,
      COALESCE(SUM(ii.total_amount), 0)::numeric(15,2) AS total_revenue,
      COALESCE(SUM(ii.quantity), 0)::numeric(15,4) AS total_quantity,
      COUNT(DISTINCT i.id)::bigint AS order_count
    FROM sales.invoice_items ii
    JOIN sales.invoices i ON i.id = ii.invoice_id
      AND COALESCE(i.global_status, '') NOT IN ('canceled', 'refunded', 'draft')
      AND i.issue_date >= v_date_from
      AND i.issue_date <= v_date_to
    JOIN sales.products p ON p.id = ii.product_id
    LEFT JOIN core.clients c ON c.id = i.client_id
    WHERE ii.product_id IS NOT NULL
      AND (p_client_ids IS NULL OR i.client_id = ANY(p_client_ids))
    GROUP BY i.client_id, c.name, p.sku, COALESCE(p.name, p.sku, 'Produto ' || p.sku), p.category
    HAVING SUM(ii.total_amount) > 0
  ),
  ranked AS (
    SELECT ir.*,
      SUM(ir.total_revenue) OVER (
        PARTITION BY ir.client_id
        ORDER BY ir.total_revenue DESC
      ) / NULLIF(SUM(ir.total_revenue) OVER (PARTITION BY ir.client_id), 0) * 100 AS cumulative_pct,
      ROW_NUMBER() OVER (
        PARTITION BY ir.client_id
        ORDER BY ir.total_revenue DESC
      )::bigint AS rank
    FROM item_revenue ir
  )
  SELECT
    r.client_id,
    r.client_name,
    r.product_sku,
    r.product_name,
    r.category,
    r.total_revenue,
    r.total_quantity,
    r.order_count,
    r.rank,
    ROUND(r.cumulative_pct, 2),
    CASE
      WHEN r.cumulative_pct <= 80 THEN 'A'::text
      WHEN r.cumulative_pct <= 95 THEN 'B'::text
      ELSE 'C'::text
    END
  FROM ranked r
  ORDER BY r.client_id, r.rank;
END;
$$;

GRANT EXECUTE ON FUNCTION sales.get_client_abc_curve(UUID[], DATE, DATE) TO authenticated, service_role;
