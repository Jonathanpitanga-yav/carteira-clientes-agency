-- Tabela de catálogo de produtos (alimentada pelos dados dos ERPs)
CREATE TABLE sales.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    client_id UUID NOT NULL REFERENCES core.clients(id) ON DELETE CASCADE,
    app_id UUID NOT NULL REFERENCES integration.client_applications(id) ON DELETE CASCADE,
    external_id TEXT NOT NULL,
    name TEXT NOT NULL,
    sku TEXT,
    price NUMERIC(15,2) DEFAULT 0,
    category TEXT,
    raw_payload JSONB DEFAULT '{}'::jsonb NOT NULL,
    CONSTRAINT unique_external_product UNIQUE (app_id, external_id)
);

-- Tabela de faturas/pedidos importados dos ERPs
CREATE TABLE sales.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    client_id UUID NOT NULL REFERENCES core.clients(id) ON DELETE CASCADE,
    app_id UUID NOT NULL REFERENCES integration.client_applications(id) ON DELETE CASCADE,
    external_id TEXT NOT NULL,
    invoice_number TEXT,
    issue_date DATE NOT NULL,
    total_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
    status TEXT DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'approved', 'canceled', 'refunded')),
    raw_payload JSONB DEFAULT '{}'::jsonb NOT NULL,
    synced_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_external_invoice UNIQUE (app_id, external_id)
);

-- Tabela de itens de cada fatura
CREATE TABLE sales.invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    invoice_id UUID NOT NULL REFERENCES sales.invoices(id) ON DELETE CASCADE,
    product_id UUID REFERENCES sales.products(id) ON DELETE SET NULL,
    external_product_id TEXT,
    description TEXT,
    quantity NUMERIC(15,4) NOT NULL DEFAULT 1,
    unit_price NUMERIC(15,2) NOT NULL DEFAULT 0,
    total_amount NUMERIC(15,2) NOT NULL DEFAULT 0
);

-- Índices para performance nas consultas dos painéis
CREATE INDEX idx_invoices_client_id ON sales.invoices(client_id);
CREATE INDEX idx_invoices_issue_date ON sales.invoices(issue_date);
CREATE INDEX idx_invoices_status ON sales.invoices(status);
CREATE INDEX idx_invoice_items_invoice_id ON sales.invoice_items(invoice_id);
CREATE INDEX idx_products_client_id ON sales.products(client_id);

-- RLS nas tabelas de vendas
ALTER TABLE sales.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso a faturas baseado no vinculo do cliente" ON sales.invoices
    FOR SELECT TO authenticated
    USING (core.can_access_client(client_id));

CREATE POLICY "Itens das faturas seguem a mesma regra" ON sales.invoice_items
    FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM sales.invoices i WHERE i.id = invoice_id AND core.can_access_client(i.client_id)));

CREATE POLICY "Acesso a produtos baseado no vinculo do cliente" ON sales.products
    FOR SELECT TO authenticated
    USING (core.can_access_client(client_id));

-- Edge Functions com service_role podem inserir/atualizar dados
CREATE POLICY "Service role gerencia faturas" ON sales.invoices
    FOR ALL TO service_role
    USING (true) WITH CHECK (true);

CREATE POLICY "Service role gerencia itens" ON sales.invoice_items
    FOR ALL TO service_role
    USING (true) WITH CHECK (true);

CREATE POLICY "Service role gerencia produtos" ON sales.products
    FOR ALL TO service_role
    USING (true) WITH CHECK (true);
