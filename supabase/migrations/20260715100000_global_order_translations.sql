-- ============================================================
-- Migration: Global order translation layer (dictionary-first)
-- ============================================================

-- ------------------------------------------------------------
-- 1) Global catalogs
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sales.global_marketplaces (
  slug TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0
);

INSERT INTO sales.global_marketplaces (slug, label, sort_order) VALUES
  ('mercado_livre', 'Mercado Livre', 1),
  ('magalu', 'Magalu', 2),
  ('shopee', 'Shopee', 3),
  ('amazon', 'Amazon', 4),
  ('americanas', 'Americanas', 5),
  ('shein', 'Shein', 6),
  ('tiktok', 'TikTok Shop', 7),
  ('kwai', 'Kwai', 8),
  ('temu', 'Temu', 9),
  ('aliexpress', 'AliExpress', 10),
  ('nuvemshop', 'Nuvemshop', 11),
  ('shopify', 'Shopify', 12),
  ('woocommerce', 'WooCommerce', 13),
  ('unknown', 'Desconhecido', 99)
ON CONFLICT (slug) DO UPDATE SET label = EXCLUDED.label, sort_order = EXCLUDED.sort_order;

CREATE TABLE IF NOT EXISTS sales.global_logistics_services (
  slug TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'carrier'
    CHECK (category = ANY (ARRAY['marketplace_logistics','fulfillment','carrier','gateway','none'])),
  parent_marketplace_slug TEXT REFERENCES sales.global_marketplaces(slug),
  sort_order INTEGER DEFAULT 0
);

INSERT INTO sales.global_logistics_services (slug, label, category, parent_marketplace_slug, sort_order) VALUES
  ('mercado_envios', 'Mercado Envios', 'marketplace_logistics', 'mercado_livre', 1),
  ('mercado_envios_flex', 'Mercado Envios Flex', 'marketplace_logistics', 'mercado_livre', 2),
  ('mercado_envios_full', 'Mercado Envios Full', 'fulfillment', 'mercado_livre', 3),
  ('magalu_entregas', 'Magalu Entregas', 'marketplace_logistics', 'magalu', 4),
  ('magalu_fulfillment', 'Magalu Fulfillment', 'fulfillment', 'magalu', 5),
  ('shopee_envios', 'Shopee Envios', 'marketplace_logistics', 'shopee', 6),
  ('amazon_dba', 'Amazon DBA', 'marketplace_logistics', 'amazon', 7),
  ('correios', 'Correios', 'carrier', NULL, 8),
  ('transportadora', 'Transportadora', 'carrier', NULL, 9),
  ('gateway_logistico', 'Gateway Logístico', 'gateway', NULL, 10),
  ('sem_frete', 'Sem Frete', 'none', NULL, 11),
  ('unknown', 'Desconhecido', 'none', NULL, 99)
ON CONFLICT (slug) DO UPDATE
SET label = EXCLUDED.label, category = EXCLUDED.category,
    parent_marketplace_slug = EXCLUDED.parent_marketplace_slug, sort_order = EXCLUDED.sort_order;

CREATE TABLE IF NOT EXISTS sales.global_order_types (
  slug TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0
);

INSERT INTO sales.global_order_types (slug, label, sort_order) VALUES
  ('marketplace', 'Marketplace', 1),
  ('ecommerce', 'E-commerce', 2),
  ('physical_store', 'Loja Física / PDV', 3),
  ('wholesale', 'Atacado', 4),
  ('manual', 'Manual', 5),
  ('unknown', 'Desconhecido', 99)
ON CONFLICT (slug) DO UPDATE SET label = EXCLUDED.label, sort_order = EXCLUDED.sort_order;

-- ------------------------------------------------------------
-- 2) Provider mapping rules
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sales.erp_provider_mapping_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  dimension TEXT NOT NULL
    CHECK (dimension = ANY (ARRAY['status','logistics','marketplace','order_type'])),
  source_kind TEXT NOT NULL
    CHECK (source_kind = ANY (ARRAY['enum_code','service_id','name_pattern'])),
  source_value TEXT NOT NULL,
  global_slug TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 100,
  is_active BOOLEAN DEFAULT true,
  CONSTRAINT unique_provider_mapping_rule UNIQUE (provider, dimension, source_kind, source_value)
);

-- Bling status
INSERT INTO sales.erp_provider_mapping_rules (provider, dimension, source_kind, source_value, global_slug, priority) VALUES
  ('bling', 'status', 'enum_code', '0', 'draft', 10),
  ('bling', 'status', 'enum_code', '1', 'approved', 10),
  ('bling', 'status', 'enum_code', '2', 'canceled', 10),
  ('bling', 'status', 'enum_code', '3', 'returned', 10),
  ('bling', 'status', 'enum_code', '4', 'invoiced', 10),
  ('bling', 'status', 'enum_code', '5', 'shipped', 10),
  ('bling', 'status', 'enum_code', '6', 'delivered', 10),
  ('bling', 'status', 'enum_code', '7', 'shipped', 10),
  ('bling', 'status', 'enum_code', '9', 'pending', 10),
  ('bling', 'status', 'enum_code', '10', 'canceled', 10),
  ('bling', 'status', 'enum_code', '11', 'returned', 10),
  ('bling', 'status', 'enum_code', '12', 'shipped', 10)
ON CONFLICT (provider, dimension, source_kind, source_value) DO NOTHING;

INSERT INTO sales.erp_provider_mapping_rules (provider, dimension, source_kind, source_value, global_slug, priority) VALUES
  ('bling', 'status', 'name_pattern', '%atendido%', 'shipped', 15),
  ('bling', 'status', 'name_pattern', '%completo%', 'shipped', 15),
  ('bling', 'status', 'name_pattern', '%enviado%', 'shipped', 15)
ON CONFLICT (provider, dimension, source_kind, source_value) DO NOTHING;

-- Tiny status
INSERT INTO sales.erp_provider_mapping_rules (provider, dimension, source_kind, source_value, global_slug, priority) VALUES
  ('tiny', 'status', 'enum_code', '0', 'pending', 10),
  ('tiny', 'status', 'enum_code', '1', 'invoiced', 10),
  ('tiny', 'status', 'enum_code', '2', 'canceled', 10),
  ('tiny', 'status', 'enum_code', '3', 'approved', 10),
  ('tiny', 'status', 'enum_code', '4', 'in_production', 10),
  ('tiny', 'status', 'enum_code', '5', 'shipped', 10),
  ('tiny', 'status', 'enum_code', '6', 'delivered', 10),
  ('tiny', 'status', 'enum_code', '7', 'shipped', 10),
  ('tiny', 'status', 'enum_code', '8', 'draft', 10),
  ('tiny', 'status', 'enum_code', '9', 'pending', 10)
ON CONFLICT (provider, dimension, source_kind, source_value) DO NOTHING;

-- Tiny logistics tipo (formas-envio)
INSERT INTO sales.erp_provider_mapping_rules (provider, dimension, source_kind, source_value, global_slug, priority) VALUES
  ('tiny', 'logistics', 'enum_code', '0', 'sem_frete', 10),
  ('tiny', 'logistics', 'enum_code', '1', 'correios', 10),
  ('tiny', 'logistics', 'enum_code', '2', 'transportadora', 10),
  ('tiny', 'logistics', 'enum_code', '3', 'mercado_envios', 10),
  ('tiny', 'logistics', 'enum_code', '10', 'gateway_logistico', 10),
  ('tiny', 'logistics', 'enum_code', '11', 'magalu_entregas', 10),
  ('tiny', 'logistics', 'enum_code', '12', 'shopee_envios', 10),
  ('tiny', 'logistics', 'enum_code', '19', 'amazon_dba', 10),
  ('tiny', 'logistics', 'enum_code', '20', 'magalu_fulfillment', 10)
ON CONFLICT (provider, dimension, source_kind, source_value) DO NOTHING;

-- Name patterns (both providers)
INSERT INTO sales.erp_provider_mapping_rules (provider, dimension, source_kind, source_value, global_slug, priority) VALUES
  ('bling', 'logistics', 'name_pattern', '%flex%', 'mercado_envios_flex', 20),
  ('bling', 'logistics', 'name_pattern', '%full%', 'mercado_envios_full', 20),
  ('bling', 'logistics', 'name_pattern', '%priorit%', 'mercado_envios_flex', 20),
  ('bling', 'logistics', 'name_pattern', '%mercado%', 'mercado_envios', 30),
  ('bling', 'logistics', 'name_pattern', '%magalu%', 'magalu_entregas', 30),
  ('bling', 'logistics', 'name_pattern', '%shopee%', 'shopee_envios', 30),
  ('tiny', 'logistics', 'name_pattern', '%flex%', 'mercado_envios_flex', 20),
  ('tiny', 'logistics', 'name_pattern', '%full%', 'mercado_envios_full', 20),
  ('tiny', 'logistics', 'name_pattern', '%mercado%', 'mercado_envios', 30),
  ('tiny', 'logistics', 'name_pattern', '%magalu%', 'magalu_entregas', 30),
  ('tiny', 'logistics', 'name_pattern', '%shopee%', 'shopee_envios', 30),
  ('bling', 'marketplace', 'name_pattern', '%mercado%', 'mercado_livre', 30),
  ('bling', 'marketplace', 'name_pattern', '%magalu%', 'magalu', 30),
  ('bling', 'marketplace', 'name_pattern', '%shopee%', 'shopee', 30),
  ('bling', 'marketplace', 'name_pattern', '%amazon%', 'amazon', 30),
  ('tiny', 'marketplace', 'name_pattern', '%mercado%', 'mercado_livre', 30),
  ('tiny', 'marketplace', 'name_pattern', '%magalu%', 'magalu', 30),
  ('tiny', 'marketplace', 'name_pattern', '%shopee%', 'shopee', 30),
  ('tiny', 'marketplace', 'name_pattern', '%amazon%', 'amazon', 30)
ON CONFLICT (provider, dimension, source_kind, source_value) DO NOTHING;

-- ------------------------------------------------------------
-- 3) Dictionary sync state (cold path TTL)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS integration.dictionary_sync_state (
  app_id UUID PRIMARY KEY REFERENCES integration.client_applications(id) ON DELETE CASCADE,
  last_synced_at TIMESTAMPTZ,
  ttl_days INTEGER NOT NULL DEFAULT 7,
  sync_status TEXT NOT NULL DEFAULT 'stale'
    CHECK (sync_status = ANY (ARRAY['ok','failed','stale'])),
  last_error TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ------------------------------------------------------------
-- 4) Enrich ERP dictionary tables
-- ------------------------------------------------------------
ALTER TABLE sales.erp_carriers ADD COLUMN IF NOT EXISTS provider_logistics_type TEXT;
ALTER TABLE sales.erp_carriers ADD COLUMN IF NOT EXISTS global_logistics_slug TEXT REFERENCES sales.global_logistics_services(slug);
ALTER TABLE sales.erp_carriers ADD COLUMN IF NOT EXISTS source_kind TEXT;

ALTER TABLE sales.erp_marketplaces ADD COLUMN IF NOT EXISTS global_marketplace_slug TEXT REFERENCES sales.global_marketplaces(slug);
ALTER TABLE sales.erp_marketplaces ADD COLUMN IF NOT EXISTS canal_venda TEXT;

CREATE TABLE IF NOT EXISTS sales.erp_shipping_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id UUID NOT NULL REFERENCES integration.client_applications(id) ON DELETE CASCADE,
  logistics_external_id TEXT,
  service_external_id TEXT NOT NULL,
  name TEXT NOT NULL,
  aliases TEXT[] DEFAULT '{}',
  provider_logistics_type TEXT,
  global_logistics_slug TEXT REFERENCES sales.global_logistics_services(slug),
  last_seen_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_shipping_service_per_app UNIQUE (app_id, service_external_id)
);

CREATE INDEX IF NOT EXISTS idx_erp_shipping_services_app_id ON sales.erp_shipping_services (app_id);
CREATE INDEX IF NOT EXISTS idx_erp_shipping_services_lookup ON sales.erp_shipping_services (app_id, service_external_id);

-- ------------------------------------------------------------
-- 5) Invoice global translation columns
-- ------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'sales' AND table_name = 'invoices' AND column_name = 'marketplace_id'
      AND data_type = 'text'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'sales' AND table_name = 'invoices' AND column_name = 'erp_marketplace_external_id'
  ) THEN
    ALTER TABLE sales.invoices RENAME COLUMN marketplace_id TO erp_marketplace_external_id;
  END IF;
END $$;

ALTER TABLE sales.invoices ADD COLUMN IF NOT EXISTS erp_marketplace_external_id TEXT;
ALTER TABLE sales.invoices ADD COLUMN IF NOT EXISTS marketplace_id UUID;
ALTER TABLE sales.invoices ADD COLUMN IF NOT EXISTS global_marketplace_slug TEXT REFERENCES sales.global_marketplaces(slug);
ALTER TABLE sales.invoices ADD COLUMN IF NOT EXISTS global_logistics_slug TEXT REFERENCES sales.global_logistics_services(slug);
ALTER TABLE sales.invoices ADD COLUMN IF NOT EXISTS global_order_type_slug TEXT REFERENCES sales.global_order_types(slug);
ALTER TABLE sales.invoices ADD COLUMN IF NOT EXISTS erp_logistics_external_id TEXT;
ALTER TABLE sales.invoices ADD COLUMN IF NOT EXISTS erp_logistics_name TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'invoices_marketplace_id_fkey'
  ) THEN
    ALTER TABLE sales.invoices
      ADD CONSTRAINT invoices_marketplace_id_fkey
      FOREIGN KEY (marketplace_id) REFERENCES sales.erp_marketplaces(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_invoices_global_marketplace ON sales.invoices (global_marketplace_slug);
CREATE INDEX IF NOT EXISTS idx_invoices_global_logistics ON sales.invoices (global_logistics_slug);
CREATE INDEX IF NOT EXISTS idx_invoices_global_order_type ON sales.invoices (global_order_type_slug);

-- ------------------------------------------------------------
-- 6) RLS for new tables
-- ------------------------------------------------------------
ALTER TABLE sales.global_marketplaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales.global_logistics_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales.global_order_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales.erp_provider_mapping_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales.erp_shipping_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration.dictionary_sync_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_read_global_marketplaces" ON sales.global_marketplaces;
CREATE POLICY "authenticated_read_global_marketplaces" ON sales.global_marketplaces
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "authenticated_read_global_logistics" ON sales.global_logistics_services;
CREATE POLICY "authenticated_read_global_logistics" ON sales.global_logistics_services
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "authenticated_read_global_order_types" ON sales.global_order_types;
CREATE POLICY "authenticated_read_global_order_types" ON sales.global_order_types
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "authenticated_read_mapping_rules" ON sales.erp_provider_mapping_rules;
CREATE POLICY "authenticated_read_mapping_rules" ON sales.erp_provider_mapping_rules
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "service_role_manage_global_marketplaces" ON sales.global_marketplaces;
CREATE POLICY "service_role_manage_global_marketplaces" ON sales.global_marketplaces
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_manage_global_logistics" ON sales.global_logistics_services;
CREATE POLICY "service_role_manage_global_logistics" ON sales.global_logistics_services
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_manage_global_order_types" ON sales.global_order_types;
CREATE POLICY "service_role_manage_global_order_types" ON sales.global_order_types
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_manage_mapping_rules" ON sales.erp_provider_mapping_rules;
CREATE POLICY "service_role_manage_mapping_rules" ON sales.erp_provider_mapping_rules
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_manage_shipping_services" ON sales.erp_shipping_services;
CREATE POLICY "service_role_manage_shipping_services" ON sales.erp_shipping_services
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_manage_dictionary_sync_state" ON integration.dictionary_sync_state;
CREATE POLICY "service_role_manage_dictionary_sync_state" ON integration.dictionary_sync_state
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ------------------------------------------------------------
-- 7) RPC: retranslate invoices (backfill, no ERP API)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION sales.retranslate_invoices(p_app_id uuid DEFAULT NULL)
RETURNS TABLE(updated_count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_count bigint := 0;
BEGIN
  -- Backfill is performed by edge function; this marks invoices for re-sync
  -- by touching synced_at so batch jobs can pick them up.
  UPDATE sales.invoices
  SET synced_at = NULL
  WHERE (p_app_id IS NULL OR app_id = p_app_id)
    AND raw_payload IS NOT NULL;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN QUERY SELECT v_count;
END;
$function$;
