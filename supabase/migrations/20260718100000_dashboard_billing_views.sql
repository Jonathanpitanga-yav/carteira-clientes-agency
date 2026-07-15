-- Dashboard billing views: use global_status (not legacy erp status codes)

DROP VIEW IF EXISTS sales.client_monthly_ranking;
DROP VIEW IF EXISTS sales.marketplace_monthly_ranking;
DROP VIEW IF EXISTS sales.channel_monthly_revenue;
DROP VIEW IF EXISTS sales.daily_billing;
DROP VIEW IF EXISTS sales.client_monthly_billing;

CREATE VIEW sales.client_monthly_billing AS
SELECT
  i.client_id,
  c.name AS client_name,
  to_char(COALESCE(i.issue_date, i.created_at::date), 'YYYY-MM') AS year_month,
  COALESCE(
    SUM(i.total_amount) FILTER (
      WHERE COALESCE(i.global_status, '') NOT IN ('canceled', 'refunded')
    ),
    0
  )::numeric AS total_approved,
  COALESCE(
    SUM(i.total_amount) FILTER (WHERE i.global_status = 'canceled'),
    0
  )::numeric AS total_canceled,
  COALESCE(SUM(i.total_amount), 0)::numeric AS total_gross,
  COUNT(*) FILTER (
    WHERE COALESCE(i.global_status, '') NOT IN ('canceled', 'refunded', 'draft')
  )::bigint AS approved_count
FROM sales.invoices i
LEFT JOIN core.clients c ON c.id = i.client_id
GROUP BY i.client_id, c.name, to_char(COALESCE(i.issue_date, i.created_at::date), 'YYYY-MM');

CREATE VIEW sales.daily_billing AS
SELECT
  i.client_id,
  c.name AS client_name,
  COALESCE(i.issue_date, i.created_at::date) AS date,
  COUNT(*)::bigint AS order_count,
  COALESCE(
    SUM(i.total_amount) FILTER (
      WHERE COALESCE(i.global_status, '') NOT IN ('canceled', 'refunded')
    ),
    0
  )::numeric AS total_approved,
  COALESCE(SUM(i.total_amount), 0)::numeric AS daily_gross
FROM sales.invoices i
LEFT JOIN core.clients c ON c.id = i.client_id
WHERE COALESCE(i.issue_date, i.created_at::date) >= (timezone('utc', now())::date - INTERVAL '30 days')
GROUP BY i.client_id, c.name, COALESCE(i.issue_date, i.created_at::date);

CREATE VIEW sales.client_monthly_ranking AS
WITH monthly AS (
  SELECT
    client_id,
    client_name,
    year_month,
    total_approved,
    approved_count,
    ROW_NUMBER() OVER (
      PARTITION BY year_month
      ORDER BY total_approved DESC, approved_count DESC, client_name
    )::int AS rank
  FROM sales.client_monthly_billing
  WHERE approved_count > 0
)
SELECT
  client_id,
  client_name,
  year_month,
  total_approved,
  approved_count,
  rank,
  LAG(rank) OVER (PARTITION BY client_id ORDER BY year_month)::int AS prev_rank
FROM monthly;

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
WHERE order_count > 0;

CREATE VIEW sales.channel_monthly_revenue AS
SELECT
  COALESCE(NULLIF(i.global_order_type_slug, ''), 'unknown') AS channel_slug,
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
WHERE COALESCE(i.global_order_type_slug, '') IN ('marketplace', 'ecommerce')
GROUP BY 1, 2;

GRANT SELECT ON sales.client_monthly_billing TO authenticated, service_role;
GRANT SELECT ON sales.daily_billing TO authenticated, service_role;
GRANT SELECT ON sales.client_monthly_ranking TO authenticated, service_role;
GRANT SELECT ON sales.marketplace_monthly_ranking TO authenticated, service_role;
GRANT SELECT ON sales.channel_monthly_revenue TO authenticated, service_role;
