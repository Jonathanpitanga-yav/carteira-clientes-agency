-- ============================================================
-- Migration: Enriquecimento de Pedidos (1:N + Dicionários + Status Universal)
-- ============================================================
-- Cria tabelas de dicionário, expande sales.invoices/invoice_items,
-- adiciona sistema de status universal.
-- ============================================================

-- 1. CATÁLOGO DE STATUS UNIVERSAIS
CREATE TABLE IF NOT EXISTS sales.global_order_statuses (
    slug        TEXT PRIMARY KEY,
    label       TEXT NOT NULL,
    sort_order  INT DEFAULT 0
);

INSERT INTO sales.global_order_statuses (slug, label, sort_order) VALUES
    ('draft',      'Rascunho',       1),
    ('pending',    'Pendente',       2),
    ('approved',   'Aprovado',       3),
    ('in_production', 'Em Produção', 4),
    ('invoiced',   'Faturado',       5),
    ('shipped',    'Enviado',        6),
    ('delivered',  'Entregue',       7),
    ('canceled',   'Cancelado',      8),
    ('returned',   'Devolvido',      9),
    ('refunded',   'Reembolsado',    10)
ON CONFLICT (slug) DO NOTHING;

-- 2. MAPEAMENTO ERP → GLOBAL (por app)
CREATE TABLE IF NOT EXISTS sales.erp_status_mappings (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    app_id            UUID NOT NULL REFERENCES integration.client_applications(id) ON DELETE CASCADE,
    erp_status_code   TEXT NOT NULL,
    erp_status_label  TEXT NOT NULL,
    global_status     TEXT NOT NULL REFERENCES sales.global_order_statuses(slug),
    is_active         BOOLEAN DEFAULT true,
    created_at        TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT unique_erp_status_mapping UNIQUE (app_id, erp_status_code)
);

-- 3. DICIONÁRIO DE TRANSPORTADORAS (logistics carriers)
CREATE TABLE IF NOT EXISTS sales.erp_carriers (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    app_id          UUID NOT NULL REFERENCES integration.client_applications(id) ON DELETE CASCADE,
    external_id     TEXT NOT NULL,
    name            TEXT NOT NULL,
    carrier_type    TEXT,                              -- Bling: tipoIntegracao | Tiny: tipo (0-34 mapeado)
    external_code   TEXT,                              -- Bling: servico[0].nome | Tiny: gatewayLogistico?.nome
    is_active       BOOLEAN DEFAULT true,
    services        JSONB DEFAULT '[]'::jsonb,         -- Bling: servicos array
    metadata        JSONB DEFAULT '{}'::jsonb,
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT unique_carrier_per_app UNIQUE (app_id, external_id)
);

-- 4. DICIONÁRIO DE MARKETPLACES (canais de venda)
CREATE TABLE IF NOT EXISTS sales.erp_marketplaces (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    app_id          UUID NOT NULL REFERENCES integration.client_applications(id) ON DELETE CASCADE,
    external_id     TEXT NOT NULL,
    name            TEXT NOT NULL,
    is_active       BOOLEAN DEFAULT true,
    metadata        JSONB DEFAULT '{}'::jsonb,
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT unique_marketplace_per_app UNIQUE (app_id, external_id)
);

-- 5. EXPANDIR sales.invoices
ALTER TABLE sales.invoices
    ADD COLUMN IF NOT EXISTS erp_order_number      TEXT,
    ADD COLUMN IF NOT EXISTS marketplace_id         TEXT,
    ADD COLUMN IF NOT EXISTS marketplace_name       TEXT,
    ADD COLUMN IF NOT EXISTS marketplace_order_id   TEXT,
    ADD COLUMN IF NOT EXISTS freight_value          NUMERIC(15,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS freight_paid_by        TEXT,
    ADD COLUMN IF NOT EXISTS commission_fee         NUMERIC(15,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS commission_base        NUMERIC(15,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS discount_value         NUMERIC(15,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS carrier_id             UUID REFERENCES sales.erp_carriers(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS carrier_name           TEXT,
    ADD COLUMN IF NOT EXISTS tracking_code          TEXT,
    ADD COLUMN IF NOT EXISTS tracking_url           TEXT,
    ADD COLUMN IF NOT EXISTS shipping_method        TEXT,
    ADD COLUMN IF NOT EXISTS shipping_method_external_id TEXT,
    ADD COLUMN IF NOT EXISTS global_status          TEXT REFERENCES sales.global_order_statuses(slug) DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS erp_status_code        TEXT,
    ADD COLUMN IF NOT EXISTS erp_status_label       TEXT,
    ADD COLUMN IF NOT EXISTS notes                  TEXT;

-- Remover CHECK constraint antigo de status (se existir)
ALTER TABLE sales.invoices DROP CONSTRAINT IF EXISTS invoices_status_check;

-- 6. EXPANDIR sales.invoice_items
ALTER TABLE sales.invoice_items
    ADD COLUMN IF NOT EXISTS sku TEXT;

-- 7. ÍNDICES
CREATE INDEX IF NOT EXISTS idx_invoices_global_status ON sales.invoices(global_status);
CREATE INDEX IF NOT EXISTS idx_invoices_erp_order_number ON sales.invoices(erp_order_number);
CREATE INDEX IF NOT EXISTS idx_invoices_marketplace_id ON sales.invoices(marketplace_id);
CREATE INDEX IF NOT EXISTS idx_invoices_carrier_id ON sales.invoices(carrier_id);
CREATE INDEX IF NOT EXISTS idx_erp_carriers_app_id ON sales.erp_carriers(app_id);
CREATE INDEX IF NOT EXISTS idx_erp_marketplaces_app_id ON sales.erp_marketplaces(app_id);
CREATE INDEX IF NOT EXISTS idx_erp_status_mappings_app_id ON sales.erp_status_mappings(app_id);

-- 8. RLS NAS NOVAS TABELAS
ALTER TABLE sales.erp_status_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales.erp_carriers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales.erp_marketplaces ENABLE ROW LEVEL SECURITY;

-- Leitura autenticada (via vinculo do cliente dono do app)
CREATE POLICY "leitura status mappings por vinculo" ON sales.erp_status_mappings
    FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1 FROM integration.client_applications a
        WHERE a.id = app_id AND core.can_access_client(a.client_id)
    ));

CREATE POLICY "leitura carriers por vinculo" ON sales.erp_carriers
    FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1 FROM integration.client_applications a
        WHERE a.id = app_id AND core.can_access_client(a.client_id)
    ));

CREATE POLICY "leitura marketplaces por vinculo" ON sales.erp_marketplaces
    FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1 FROM integration.client_applications a
        WHERE a.id = app_id AND core.can_access_client(a.client_id)
    ));

-- Service role gerencia tudo
CREATE POLICY "service role gerencia status mappings" ON sales.erp_status_mappings
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service role gerencia carriers" ON sales.erp_carriers
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service role gerencia marketplaces" ON sales.erp_marketplaces
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 9. ATUALIZAR VIEWS (opcional — compatibilidade)
-- client_monthly_billing permanece igual (usa status existente)
-- daily_billing permanece igual
-- product_ranking permanece igual
