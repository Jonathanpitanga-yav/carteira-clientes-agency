-- ============================================================
-- Migration: Add order_type and sales_channel to invoices
-- ============================================================

ALTER TABLE sales.invoices
  ADD COLUMN IF NOT EXISTS order_type TEXT,
  ADD COLUMN IF NOT EXISTS sales_channel TEXT;

COMMENT ON COLUMN sales.invoices.order_type IS 'Tipo do pedido: marketplace | store';
COMMENT ON COLUMN sales.invoices.sales_channel IS 'Canal de venda (ex: Magalu, Shopee, Mercado Livre)';
