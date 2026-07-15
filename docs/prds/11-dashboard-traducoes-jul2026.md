# PRD 11 — Dashboard, traduções universais e enriquecimento de pedidos

> **Versão:** 1.5.0  
> **Data:** 2026-07-18  
> **Status:** Implementado (Supabase + web deployados)

---

## 1. Contexto e problemas resolvidos

| Problema | Impacto | Solução |
|---|---|---|
| KPIs do dashboard zerados | Views filtravam `status = 'approved'`, mas `invoices.status` guarda código ERP | Views passam a usar `global_status` |
| Mesmo código ERP com significados diferentes entre tenants | Status incorretos (ex.: situação custom Bling) | Catálogo universal + `erp_status_label_rules` |
| Shopify/Magalu sem canal/logística na listagem | Colunas Canal e Logística com `—` | Camada de tradução + backfill + fallbacks no front |
| Dashboard sem visão por marketplace/e-commerce | Só ranking de clientes | Cards de ranking marketplace, e-commerce e tipo de loja |
| Sem tendência mês a mês | Impossível ver evolução | `PeriodComparison` nos KPIs e `RankPosition` nos rankings |
| OAuth Bling 401 | `erp-callback` com JWT obrigatório | Deploy com `verify_jwt: false` |

---

## 2. Dashboard unificado

### 2.1 KPIs (`DashboardKpiRow`)

Três cards com comparação vs mês anterior:

| Card | Fonte | Indicador |
|---|---|---|
| Faturamento do mês | `sales.client_monthly_billing` agregado | % vs mês anterior |
| Pedidos no mês | `approved_count` agregado | Δ absoluto vs mês anterior |
| Ticket médio | `faturamento / pedidos` | % vs mês anterior |

Componente: `web/src/modules/dashboard/components/period-comparison.tsx`

### 2.2 Rankings (grid 3 colunas — leader/admin/analyst)

| Card | View SQL | Movimento |
|---|---|---|
| Ranking de clientes | `sales.client_monthly_ranking` | `prev_rank` via `LAG(rank)` |
| Ranking de marketplaces | `sales.marketplace_monthly_ranking` | Exclui Shopify/Nuvemshop/WooCommerce |
| Ranking de e-commerce | `sales.ecommerce_monthly_ranking` | Shopify, Nuvemshop, WooCommerce, loja própria |

**Indicador de posição:** seta à esquerda do número (`RankPosition` + `RankMovement`)

- ↑ verde — subiu posição  
- ↓ vermelho — desceu posição  
- — cinza — manteve ou novo no ranking  

### 2.3 Tipo de loja (`ChannelRankingCard`)

View: `sales.channel_monthly_revenue`

- Barra proporcional marketplace vs e-commerce  
- Cards com faturamento, pedidos, % e tendência vs mês anterior  

**Regra de classificação:**
- `shopify`, `nuvemshop`, `woocommerce` → e-commerce  
- Demais marketplaces → marketplace  
- Fallback: `global_order_type_slug = 'ecommerce'`

### 2.4 Admin extras

`BillingOverview` com 5 colunas quando admin: KPIs + clientes ativos + usuários cadastrados.

---

## 3. Views SQL (migrations)

| Migration | Objetos |
|---|---|
| `20260718100000_dashboard_billing_views.sql` | `client_monthly_billing`, `daily_billing`, `client_monthly_ranking`, `marketplace_monthly_ranking`, `channel_monthly_revenue` |
| `20260718110000_dashboard_store_type_views.sql` | Recria marketplace ranking (exclui e-commerce) + channel por tipo de loja |
| `20260718120000_ecommerce_monthly_ranking.sql` | `ecommerce_monthly_ranking` |
| `20260718130000_ranking_prev_rank.sql` | `prev_rank` em marketplace e e-commerce |
| `20260718140000_backfill_3kam_marketplace_logistics.sql` | Backfill Magalu/Shopee/ML para pedidos 3KAM |

Todas as views de faturamento consideram pedidos com `global_status NOT IN ('canceled', 'refunded')`.

---

## 4. Listagem de pedidos (front)

### Colunas

| Coluna | Lógica |
|---|---|
| Canal | `getGlobalMarketplaceDisplay(slug, marketplace_name, order_type, erp_marketplace_name)` |
| Tipo de loja | `getStoreTypeDisplay` — Shopify/Nuvem/Woo → E-commerce |
| Status | Badge com label do catálogo universal + cor por `global_status` |
| Logística | `getGlobalLogisticsDisplay` + inferência por marketplace quando sem transporte |

### Hook `useOrders`

- Join com `sales.erp_marketplaces` para nome do catálogo quando `marketplace_name` é null  
- Paginação server-side  

---

## 5. Camada de tradução (edge functions)

### 5.1 Módulo `shared/translations/`

| Arquivo | Responsabilidade |
|---|---|
| `resolve.ts` | `resolveStatus`, `resolveMarketplace`, `resolveLogistics`, `resolveOrderType`, `inferLogisticsFromMarketplace` |
| `load-dictionary.ts` | Carrega regras, mappings, carriers, marketplaces, shipping services |
| `index.ts` | `resolveOrderTranslations` — orquestra tradução por pedido |
| `dictionary-sync.ts` | Sync batch de dicionários via adapters |

**Ordem de resolução de status:** label rules → status mappings → fallback  

**Marketplace:** slug do catálogo → nome do catálogo ERP → name_pattern rules  

**Logística:** serviço → carrier → enum → name_pattern → inferência por marketplace  

### 5.2 Adapters Bling (`bling.ts`)

- Situações custom via API `/situacoes/modulos`  
- `MARKETPLACE_BY_LOJA_ID`: ML, Magalu, Shopee  
- Frete via `taxas.custoFrete`  
- Service ID extraído do parênteses em `volumes[0].servico`  

### 5.3 Migrations de tradução

| Migration | Conteúdo |
|---|---|
| `20260715100000_global_order_translations.sql` | Colunas globais, regras provider, dicionários |
| `20260717100000_erp_status_label_rules.sql` | `erp_status_label_rules`, regras marketplace/logística |
| `20260718140000_backfill_3kam_marketplace_logistics.sql` | Correção dados históricos 3KAM |

### 5.4 Edge functions novas/atualizadas

| Function | `verify_jwt` | Mudança principal |
|---|---|---|
| `erp-callback` | **false** | OAuth authorize + callback; sync dicionários pós-OAuth |
| `erp-retranslate-invoices` | true | Retraduz pedidos em lote |
| `erp-process-webhook-queue` | false | Processa fila de webhooks |
| `erp-fetch-dictionaries` | true | Usa `dictionary-sync` |
| `erp-sync-data` / `erp-process-sync-queue` | mixed | Tradução no upsert |

---

## 6. OAuth Bling (`erp-callback`)

### Fluxo

```
Frontend → GET ?action=authorize&app_id&provider=bling
         → { authUrl }
         → Popup Bling
Bling    → GET ?code&state=APP_ID
         → saveTokens + status active + redirect frontend
```

### Requisitos de deploy

- **`verify_jwt: false`** — Bling e o passo `authorize` não enviam JWT Supabase  
- `APP_URL` configurado para redirect pós-OAuth  
- Credenciais (`client_identifier` + `client_secret`) salvas antes de autorizar  

### Auditoria

Eventos em `integration.audit_logs` com prefixo `erp_callback.*`.

---

## 7. Hooks frontend

| Hook | Novidades |
|---|---|
| `useBillingSummary` | `previousMonthOrders`, `avgTicket`, variações |
| `useClientRanking` | `prev_rank` |
| `useMarketplaceRanking` | `prev_rank` |
| `useEcommerceRanking` | novo |
| `useChannelRevenue` | `{ current, previous }` por mês |

---

## 8. Componentes novos

```
web/src/modules/dashboard/components/
├── dashboard-kpi-row.tsx
├── marketplace-ranking-card.tsx
├── ecommerce-ranking-card.tsx
├── channel-ranking-card.tsx
├── period-comparison.tsx
└── rank-movement.tsx      # RankPosition + RankMovement
```

---

## 9. Testes manuais recomendados

- [ ] Dashboard leader: KPIs com setas vs mês anterior  
- [ ] Rankings: setas à esquerda da posição  
- [ ] Pedidos 3KAM: Canal Magalu/Shopee/ML preenchido  
- [ ] OAuth Bling: authorize 200 + callback success  
- [ ] Webhook Bling: pedido atualizado com `global_*` preenchido  

---

## 10. Referências cruzadas

- Views e tabelas: [02-banco-dados.md](./02-banco-dados.md)  
- Edge functions: [03-edge-functions.md](./03-edge-functions.md)  
- Fluxos ERP: [08-fluxos-erp.md](./08-fluxos-erp.md)  
- Painel leader: [05-painel-leader.md](./05-painel-leader.md)  
- Frontend: [10-frontend-web.md](./10-frontend-web.md)  
