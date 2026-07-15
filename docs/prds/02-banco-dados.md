# PRD 02 — Banco de Dados

## Schemas

| Schema | Domínio |
|---|---|
| `core` | Perfis, clientes, vínculos, auditoria, tokens M2M |
| `integration` | Provedores ERP, aplicações conectadas, credenciais, tokens OAuth, logs de atividade |
| `sales` | Faturamento, produtos, itens, views consolidadas |
| `products` | Catálogo de produtos (reservado para futura expansão) |
| `jobs` | Cron jobs, filas de retry, helpers |

## Tabelas — Schema `core`

### `core.profiles`
Estende `auth.users` com papel e nome.

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | UUID PK → auth.users | ID do usuário |
| `updated_at` | TIMESTAMPTZ | Última atualização |
| `full_name` | TEXT | Nome completo |
| `role` | ENUM('admin','leader','analyst','client') | Papel do usuário |

Trigger `on_auth_user_created` cria profile automaticamente ao cadastrar.

### `core.clients`
Empresas/clientes da agência.

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | UUID PK | ID do cliente |
| `created_at` | TIMESTAMPTZ | Data de criação |
| `name` | TEXT NOT NULL | Nome do cliente |
| `document` | TEXT UNIQUE | CNPJ |
| `status` | TEXT CHECK('active','inactive') | Status |

### `core.client_analysts`
Vínculo entre analistas e clientes (carteira).

| Coluna | Tipo | Descrição |
|---|---|---|
| `client_id` | UUID FK → core.clients | Cliente |
| `analyst_id` | UUID FK → core.profiles | Analista |

Unique: `(client_id, analyst_id)`

### `core.client_users`
Vínculo entre usuários finais (clientes) e suas empresas.

| Coluna | Tipo | Descrição |
|---|---|---|
| `client_id` | UUID FK → core.clients | Cliente |
| `user_id` | UUID FK → core.profiles | Usuário |

Unique: `(client_id, user_id)`

### `core.audit_logs`
Log centralizado de todas as ações do sistema (ações manuais e operações administrativas).

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | UUID PK | ID do log |
| `created_at` | TIMESTAMPTZ | Data do evento |
| `user_id` | UUID FK → core.profiles | Usuário que executou |
| `action` | TEXT | Ex: 'client.created', 'token.refresh' |
| `entity_type` | TEXT | Ex: 'client', 'integration' |
| `entity_id` | UUID | ID da entidade afetada |
| `payload` | JSONB | Dados adicionais |
| `ip_address` | TEXT | IP de origem |
| `user_agent` | TEXT | User-Agent |

RLS: Apenas admin visualiza.
Helper function `core.log_action(...)` para uso via service_role.

### `core.api_tokens`
Tokens de API para autenticação machine-to-machine.

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | UUID PK | ID do token |
| `client_id` | UUID FK → core.clients | Cliente dono |
| `name` | TEXT | Nome do token |
| `token_hash` | TEXT UNIQUE | Hash SHA-256 do token |
| `prefix` | TEXT | Prefixo visível (ex: "sw_abc123...") |
| `permissions` | JSONB | Permissões do token |
| `last_used_at` | TIMESTAMPTZ | Último uso |
| `expires_at` | TIMESTAMPTZ | Data de expiração |
| `status` | TEXT CHECK('active','revoked','expired') | Status |

## Tabelas — Schema `integration`

### `integration.erp_providers`
Catálogo de provedores de ERP suportados.

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | UUID PK | ID |
| `name` | TEXT UNIQUE | Código do provedor ('bling', 'tiny') |
| `display_name` | TEXT | Nome de exibição |
| `auth_type` | TEXT CHECK('oauth2','api_key') | Tipo de autenticação |
| `auth_config` | JSONB | Configuração (auth_url, token_url, scope) |

Seed:
| Provedor | Auth Type | Auth URL |
|---|---|---|
| bling | oauth2 | `https://www.bling.com.br/Api/v3/oauth/authorize` |
| tiny | oauth2 | `https://accounts.tiny.com.br/realms/tiny/protocol/openid-connect/auth` |
| anymarket | api_key | — |

### `integration.client_applications`
Instâncias de aplicativos conectados por cliente.

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | UUID PK | ID |
| `client_id` | UUID FK → core.clients | Cliente |
| `provider_id` | UUID FK → integration.erp_providers | Provedor ERP |
| `app_name` | TEXT | Nome do aplicativo |
| `status` | TEXT CHECK('active','expired','error','pending') | Status |

Unique: `(client_id, provider_id, app_name)`

### `integration.credentials`
Credenciais dos aplicativos (client_id, client_secret).

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | UUID PK | ID |
| `app_id` | UUID FK → client_applications | Aplicação |
| `client_identifier` | TEXT | Client ID |
| `client_secret` | TEXT | Client Secret (criptografado) |

Unique: `app_id`

### `integration.tokens`
Tokens de acesso e refresh.

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | UUID PK | ID |
| `app_id` | UUID FK → client_applications | Aplicação |
| `access_token` | TEXT | Access token (criptografado) |
| `refresh_token` | TEXT | Refresh token (criptografado) |
| `expires_at` | TIMESTAMPTZ | Data de expiração |
| `raw_payload_response` | JSONB | Payload completo do ERP |

Unique: `app_id`

### `integration.audit_logs`
Log de atividades do sistema de integração (rastreabilidade de OAuth, filas, etc).

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | UUID PK | ID do log |
| `created_at` | TIMESTAMPTZ | Data do evento |
| `event_type` | TEXT | Tipo do evento (ex: 'erp_callback.authorize_success', 'tokens.created') |
| `app_id` | UUID FK → client_applications | Aplicação afetada |
| `provider` | TEXT | Nome do provedor (bling, tiny) |
| `actor_id` | UUID FK → core.profiles | Quem executou a ação |
| `category` | TEXT | Categoria: 'credentials' \| 'access' \| 'queues' |
| `erp_error_code` | TEXT | Código de erro retornado pelo ERP (se houver) |
| `payload` | JSONB | Dados adicionais do evento |

RLS: Apenas admin visualiza.
Índices: `(category)`, `(actor_id)`, `(event_type)`.

## Tabelas — Schema `sales`

### `sales.products`
Catálogo de produtos extraídos dos ERPs.

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | UUID PK | ID |
| `client_id` | UUID FK → core.clients | Cliente |
| `app_id` | UUID FK → client_applications | Aplicação |
| `external_id` | TEXT | ID no ERP |
| `name` | TEXT NOT NULL | Nome do produto |
| `sku` | TEXT | SKU/Código |
| `price` | NUMERIC(15,2) | Preço |
| `category` | TEXT | Categoria |
| `raw_payload` | JSONB | Dados originais do ERP |

Unique: `(app_id, external_id)`

### `sales.invoices`
Faturas/pedidos importados dos ERPs.

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | UUID PK | ID |
| `client_id` | UUID FK → core.clients | Cliente |
| `app_id` | UUID FK → client_applications | Aplicação |
| `external_id` | TEXT NOT NULL | ID no ERP |
| `erp_order_number` | TEXT | Número do pedido no ERP |
| `invoice_number` | TEXT | Número da nota fiscal |
| `issue_date` | DATE NOT NULL | Data de emissão |
| `total_amount` | NUMERIC(15,2) | Valor total |
| `status` | TEXT | Código bruto do status no ERP |
| `global_status` | TEXT FK → sales.global_order_statuses.slug | Status universal normalizado |
| `erp_status_code` | TEXT | Código do status no ERP |
| `erp_status_label` | TEXT | Label do status no ERP |
| `freight_value` | NUMERIC(10,2) | Valor do frete |
| `freight_paid_by` | TEXT | Tipo de frete (CIF/FOB/terceiros) |
| `commission_fee` | NUMERIC(10,2) | Taxa de comissão (%) |
| `commission_base` | NUMERIC(10,2) | Base de cálculo da comissão |
| `discount_value` | NUMERIC(10,2) | Valor do desconto |
| `marketplace_id` | UUID FK → sales.erp_marketplaces | Marketplace |
| `marketplace_name` | TEXT | Nome do marketplace |
| `marketplace_order_id` | TEXT | ID do pedido no marketplace |
| `carrier_id` | UUID FK → sales.erp_carriers | Transportadora |
| `carrier_name` | TEXT | Nome da transportadora |
| `tracking_code` | TEXT | Código de rastreio |
| `tracking_url` | TEXT | URL de rastreio |
| `shipping_method` | TEXT | Método de envio |
| `notes` | TEXT | Observações do pedido |
| `raw_payload` | JSONB | Dados originais |
| `synced_at` | TIMESTAMPTZ | Última sincronização |

Unique: `(app_id, external_id)`

### `sales.invoice_items`
Itens de cada fatura.

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | UUID PK | ID |
| `invoice_id` | UUID FK → sales.invoices | Fatura |
| `product_id` | UUID FK → sales.products | Produto (opcional) |
| `external_product_id` | TEXT | ID do produto no ERP |
| `description` | TEXT | Descrição |
| `sku` | TEXT | SKU/Código do produto |
| `quantity` | NUMERIC(15,4) | Quantidade |
| `unit_price` | NUMERIC(15,2) | Preço unitário |
| `total_amount` | NUMERIC(15,2) | Valor total |

### `sales.global_order_statuses`
Catálogo universal de status de pedido, normalizado entre ERPs.

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | UUID PK | ID |
| `slug` | TEXT UNIQUE NOT NULL | Identificador único (ex: 'pending', 'approved', 'invoiced', 'shipped', 'delivered', 'canceled', 'refunded', 'draft', 'in_production') |
| `display_name` | TEXT NOT NULL | Nome de exibição |
| `color` | TEXT | Cor hexadecimal para UI |
| `sort_order` | INTEGER | Ordem de exibição |

Seed: 10 status universais (draft, pending, approved, in_production, invoiced, shipped, delivered, canceled, returned, refunded).

### `sales.global_marketplaces`
Catálogo universal de marketplaces (slug estável entre ERPs).

Colunas: `slug` PK, `label`, `sort_order`. Seeds: mercado_livre, magalu, shopee, amazon, etc.

### `sales.global_logistics_services`
Catálogo universal de logísticas/serviços de envio.

Colunas: `slug` PK, `label`, `category` (marketplace_logistics | fulfillment | carrier | gateway | none), `parent_marketplace_slug` FK opcional.

### `sales.global_order_types`
Tipos universais de pedido: marketplace, ecommerce, physical_store, wholesale, manual, unknown.

### `sales.erp_provider_mapping_rules`
Regras de tradução por provider (bling/tiny): status, logistics, marketplace, order_type via `enum_code` ou `name_pattern`.

### `sales.erp_shipping_services`
Serviços de envio por app (Bling servicos, Tiny formasFrete). Lookup por `(app_id, service_external_id)` no hot path — evita chamadas API por pedido.

### `integration.dictionary_sync_state`
TTL do sync frio de dicionários: `last_synced_at`, `ttl_days` (default 7), `sync_status`.

### Colunas globais em `sales.invoices`
- `global_marketplace_slug`, `global_logistics_slug`, `global_order_type_slug`
- `erp_marketplace_external_id` (ID externo ERP)
- `marketplace_id` UUID FK → erp_marketplaces
- `erp_logistics_external_id`, `erp_logistics_name`

### `sales.erp_status_mappings`
Mapeamento entre status de cada ERP e o status universal.

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | UUID PK | ID |
| `provider` | TEXT NOT NULL | Nome do provedor ('bling', 'tiny') |
| `erp_status_code` | TEXT NOT NULL | Código do status no ERP |
| `erp_status_label` | TEXT | Label do status no ERP |
| `global_status_slug` | TEXT FK → sales.global_order_statuses.slug | Status universal correspondente |

Unique: `(provider, erp_status_code)`

### `sales.erp_carriers`
Catálogo de transportadoras extraídas dos ERPs.

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | UUID PK | ID |
| `app_id` | UUID FK → client_applications | Aplicação |
| `external_id` | TEXT | ID da transportadora no ERP |
| `name` | TEXT NOT NULL | Nome da transportadora |
| `raw_payload` | JSONB | Dados originais |

Unique: `(app_id, external_id)`

### `sales.erp_marketplaces`
Catálogo de marketplaces extraídos dos ERPs.

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | UUID PK | ID |
| `app_id` | UUID FK → client_applications | Aplicação |
| `external_id` | TEXT | ID do marketplace no ERP |
| `name` | TEXT NOT NULL | Nome do marketplace |
| `raw_payload` | JSONB | Dados originais |

Unique: `(app_id, external_id)`

## Views — Schema `sales`

### `sales.client_monthly_billing`
Faturamento mensal consolidado por cliente.

| Coluna | Descrição |
|---|---|
| `client_id` | ID do cliente |
| `client_name` | Nome do cliente |
| `month` | Mês (agrupado) |
| `total_invoices` | Total de faturas |
| `approved_invoices` | Faturas aprovadas |
| `canceled_invoices` | Faturas canceladas |
| `total_approved` | Valor aprovado |
| `total_gross` | Valor bruto |

### `sales.product_ranking`
Ranking de produtos mais vendidos.

| Coluna | Descrição |
|---|---|
| `product_id` | ID do produto |
| `product_name` | Nome |
| `sku` | SKU |
| `client_id` | Cliente |
| `client_name` | Nome do cliente |
| `total_orders` | Total de pedidos |
| `total_quantity_sold` | Quantidade vendida |
| `total_revenue` | Receita total |

### `sales.daily_billing`
Faturamento diário (últimos 30 dias).

| Coluna | Descrição |
|---|---|
| `client_id` | ID do cliente |
| `client_name` | Nome do cliente |
| `date` | Data |
| `invoices_count` | Quantidade de faturas |
| `daily_revenue` | Receita do dia (aprovadas) |
| `daily_gross` | Valor bruto do dia |

## Row Level Security (RLS)

### Funções Helper

- `core.get_my_role()` → Retorna papel do usuário logado
- `core.can_access_client(client_uuid)` → Verifica se usuário tem acesso ao cliente

### Regras por Papel

| Tabela | admin | leader | analyst | client | service_role |
|---|---|---|---|---|---|
| `core.profiles` | CRUD | SELECT | SELECT (próprio) | SELECT (próprio) | — |
| `core.clients` | CRUD | CRUD | via carteira | via vínculo | — |
| `core.client_analysts` | CRUD | CRUD | SELECT (próprio) | — | — |
| `core.client_users` | CRUD | CRUD | — | SELECT (próprio) | — |
| `core.audit_logs` | SELECT | — | — | — | INSERT |
| `core.api_tokens` | CRUD | — | — | — | — |
| `integration.erp_providers` | CRUD | SELECT | SELECT | SELECT | — |
| `integration.client_applications` | CRUD | CRUD | — | — | — |
| `integration.audit_logs` | SELECT | — | — | — | INSERT |
| `integration.credentials` | CRUD | — | — | — | CRUD |
| `integration.tokens` | CRUD | — | — | — | CRUD |
| `sales.invoices` | via cliente | via cliente | via carteira | via vínculo | CRUD |
| `sales.invoice_items` | via cliente | via cliente | via carteira | via vínculo | CRUD |
| `sales.products` | via cliente | via cliente | via carteira | via vínculo | CRUD |
| `sales.global_order_statuses` | SELECT | SELECT | SELECT | SELECT | CRUD |
| `sales.erp_status_mappings` | SELECT | SELECT | SELECT | SELECT | CRUD |
| `sales.erp_carriers` | via cliente | via cliente | via carteira | via vínculo | CRUD |
| `sales.erp_marketplaces` | via cliente | via cliente | via carteira | via vínculo | CRUD |

## Extensões PostgreSQL

| Extensão | Versão | Uso |
|---|---|---|
| `pg_cron` | 1.6.4 | Agendamento de jobs |
| `pgmq` | 1.5.1 | Filas de retry |
| `pg_net` | 0.20.3 | Chamadas HTTP assíncronas |
| `pgcrypto` | 1.3 | Criptografia AES-GCM |
