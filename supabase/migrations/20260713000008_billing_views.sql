-- View: Faturamento mensal consolidado por cliente
CREATE OR REPLACE VIEW sales.client_monthly_billing AS
SELECT
    i.client_id,
    c.name AS client_name,
    date_trunc('month', i.issue_date)::date AS month,
    COUNT(DISTINCT i.id) AS total_invoices,
    COUNT(DISTINCT i.id) FILTER (WHERE i.status = 'approved') AS approved_invoices,
    COUNT(DISTINCT i.id) FILTER (WHERE i.status = 'canceled') AS canceled_invoices,
    SUM(i.total_amount) FILTER (WHERE i.status = 'approved') AS total_approved,
    SUM(i.total_amount) AS total_gross
FROM sales.invoices i
JOIN core.clients c ON c.id = i.client_id
GROUP BY i.client_id, c.name, date_trunc('month', i.issue_date)
ORDER BY month DESC, client_name;

-- View: Ranking de produtos mais vendidos
CREATE OR REPLACE VIEW sales.product_ranking AS
SELECT
    p.id AS product_id,
    p.name AS product_name,
    p.sku,
    p.client_id,
    c.name AS client_name,
    COUNT(DISTINCT ii.invoice_id) AS total_orders,
    SUM(ii.quantity) AS total_quantity_sold,
    SUM(ii.total_amount) AS total_revenue
FROM sales.products p
JOIN sales.invoice_items ii ON ii.product_id = p.id
JOIN sales.invoices i ON i.id = ii.invoice_id AND i.status = 'approved'
JOIN core.clients c ON c.id = p.client_id
GROUP BY p.id, p.name, p.sku, p.client_id, c.name
ORDER BY total_revenue DESC;

-- View: Faturamento diário (últimos 30 dias) para gráficos
CREATE OR REPLACE VIEW sales.daily_billing AS
SELECT
    i.client_id,
    c.name AS client_name,
    i.issue_date AS date,
    COUNT(DISTINCT i.id) AS invoices_count,
    SUM(i.total_amount) FILTER (WHERE i.status = 'approved') AS daily_revenue,
    SUM(i.total_amount) AS daily_gross
FROM sales.invoices i
JOIN core.clients c ON c.id = i.client_id
WHERE i.issue_date >= timezone('utc'::text, now())::date - INTERVAL '30 days'
GROUP BY i.client_id, c.name, i.issue_date
ORDER BY date DESC;
