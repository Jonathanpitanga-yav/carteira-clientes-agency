-- Chat Assistant Performance Indexes
-- These composite indexes accelerate the SQL queries made by the chat assistant tools.
-- All queries filter by client_id, issue_date range, and global_status.

-- 1. get_dashboard_kpis (RPC) & get_recent_orders tool
-- Filters: client_id IN (...), issue_date BETWEEN, global_status NOT IN ('canceled','refunded','draft')
-- INCLUDE makes this a covering index (reads only total_amount from the leaf)
CREATE INDEX IF NOT EXISTS idx_invoices_chat_perf
  ON sales.invoices (client_id, issue_date DESC, global_status)
  INCLUDE (total_amount);

-- 2. client_item_abc_curve view: invoice_items -> invoices JOIN
CREATE INDEX IF NOT EXISTS idx_invoice_items_chat_abc
  ON sales.invoice_items (invoice_id, product_id)
  INCLUDE (total_amount, quantity);

-- 3. client_item_abc_curve view: products JOIN
CREATE INDEX IF NOT EXISTS idx_products_chat_abc
  ON sales.products (id, client_id)
  INCLUDE (name, sku, category);

-- 4. client lookup for all views that JOIN with core.clients
CREATE INDEX IF NOT EXISTS idx_clients_chat_lookup
  ON core.clients (id)
  INCLUDE (name);
