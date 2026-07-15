CREATE MATERIALIZED VIEW sales.agency_portfolio_overview AS
SELECT
  year_month,
  COUNT(*)::int AS active_clients,
  SUM(approved_count)::bigint AS total_orders,
  SUM(total_approved)::numeric(15,2) AS total_gmv,
  SUM(total_canceled)::numeric(15,2) AS total_canceled,
  SUM(total_gross)::numeric(15,2) AS total_gross,
  CASE WHEN SUM(approved_count) > 0
    THEN ROUND(SUM(total_approved) / SUM(approved_count), 2)
    ELSE 0
  END AS avg_ticket
FROM sales.client_monthly_billing
GROUP BY year_month
ORDER BY year_month DESC;

CREATE UNIQUE INDEX idx_agency_portfolio_overview_ym ON sales.agency_portfolio_overview (year_month);

CREATE MATERIALIZED VIEW sales.agency_client_concentration AS
SELECT
  client_id,
  client_name,
  year_month,
  total_approved AS revenue,
  approved_count AS orders,
  ROUND(total_approved / NULLIF(SUM(total_approved) OVER (PARTITION BY year_month), 0) * 100, 2) AS share_pct,
  ROW_NUMBER() OVER (PARTITION BY year_month ORDER BY total_approved DESC) AS rank
FROM sales.client_monthly_billing
WHERE total_approved > 0;

CREATE UNIQUE INDEX idx_agency_client_conc_ym_client ON sales.agency_client_concentration (year_month, client_id);

CREATE MATERIALIZED VIEW sales.agency_erp_distribution AS
SELECT
  COALESCE(p.name, 'unknown') AS erp_provider,
  to_char(COALESCE(i.issue_date, i.created_at::date), 'YYYY-MM') AS year_month,
  COUNT(DISTINCT i.client_id)::int AS client_count,
  COUNT(*) FILTER (WHERE COALESCE(i.global_status, '') NOT IN ('canceled','refunded','draft'))::bigint AS order_count,
  COALESCE(SUM(i.total_amount) FILTER (WHERE COALESCE(i.global_status, '') NOT IN ('canceled','refunded','draft')), 0)::numeric(15,2) AS total_revenue
FROM sales.invoices i
LEFT JOIN integration.client_applications ca ON ca.id = i.app_id
LEFT JOIN integration.erp_providers p ON p.id = ca.provider_id
GROUP BY 1, 2
ORDER BY year_month DESC, total_revenue DESC;

CREATE UNIQUE INDEX idx_agency_erp_dist_ym_provider ON sales.agency_erp_distribution (year_month, erp_provider);

CREATE MATERIALIZED VIEW sales.agency_channel_benchmarks AS
WITH channel AS (
  SELECT
    COALESCE(NULLIF(i.global_marketplace_slug, ''), 'unknown') AS channel_slug,
    i.client_id,
    i.total_amount
  FROM sales.invoices i
  WHERE COALESCE(i.global_status, '') NOT IN ('canceled','refunded','draft')
)
SELECT
  channel_slug,
  COUNT(DISTINCT client_id)::int AS client_count,
  COUNT(*)::bigint AS total_orders,
  SUM(total_amount)::numeric(15,2) AS total_revenue,
  CASE WHEN COUNT(*) > 0
    THEN ROUND(SUM(total_amount) / COUNT(*), 2)
    ELSE 0
  END AS avg_ticket
FROM channel
GROUP BY channel_slug
ORDER BY total_revenue DESC;

CREATE UNIQUE INDEX idx_agency_channel_bench_slug ON sales.agency_channel_benchmarks (channel_slug);

CREATE OR REPLACE FUNCTION sales.refresh_agency_analytics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = sales, public
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY sales.agency_portfolio_overview;
  REFRESH MATERIALIZED VIEW CONCURRENTLY sales.agency_client_concentration;
  REFRESH MATERIALIZED VIEW CONCURRENTLY sales.agency_erp_distribution;
  REFRESH MATERIALIZED VIEW CONCURRENTLY sales.agency_channel_benchmarks;
END;
$$;

GRANT SELECT ON sales.agency_portfolio_overview TO authenticated, service_role;
GRANT SELECT ON sales.agency_client_concentration TO authenticated, service_role;
GRANT SELECT ON sales.agency_erp_distribution TO authenticated, service_role;
GRANT SELECT ON sales.agency_channel_benchmarks TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION sales.refresh_agency_analytics() TO authenticated, service_role;
