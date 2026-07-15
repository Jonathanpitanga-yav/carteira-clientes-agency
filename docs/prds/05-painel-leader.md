# PRD 05 — Painel Líder

## Visão Geral

Painel para líderes da agência. Acesso a usuários com papel `leader`. Visão consolidada de **todos os clientes** da agência, sem restrição por carteira.

## Funcionalidades

### 1. Dashboard de Faturamento

**Visão macro do faturamento da agência.**

| Card | Fonte |
|---|---|
| Faturamento total (mês) | `sales.client_monthly_billing` |
| Faturamento total (ano) | `sales.client_monthly_billing` |
| Total de clientes ativos | `core.clients WHERE status = 'active'` |
| Total de pedidos no mês | `sales.invoices` |
| Ticket médio | `total_approved / approved_invoices` |
| Comparativo mês anterior | `PeriodComparison` em cada KPI (% ou Δ absoluto) |

**Gráfico:**
- Faturamento diário (últimos 30 dias) — `sales.daily_billing`
- Faturamento mensal por cliente — `sales.client_monthly_billing`

### 2. Rankings (clientes, marketplaces, e-commerce)

Grid de 3 colunas no dashboard. Detalhes em [PRD 11](./11-dashboard-traducoes-jul2026.md).

| Card | View | Indicador de posição |
|---|---|---|
| Clientes | `sales.client_monthly_ranking` | ↑↓ à esquerda da posição (`prev_rank`) |
| Marketplaces | `sales.marketplace_monthly_ranking` | Exclui lojas próprias |
| E-commerce | `sales.ecommerce_monthly_ranking` | Shopify, Nuvemshop, WooCommerce |

**Ranking de clientes — colunas:**

| Coluna | Descrição |
|---|---|
| Posição + tendência | Ordem no mês + seta vs mês anterior |
| Cliente | Nome (link para detalhe) |
| Pedidos | Quantidade no mês |
| Faturamento mês | Valor aprovado no mês |

### 2.1 Tipo de loja

Card `ChannelRankingCard`: marketplace vs e-commerce com barra proporcional e tendência mês a mês.

### 3. Carteira de Clientes

**Lista completa de clientes da agência.**

| Coluna | Descrição |
|---|---|
| Nome | Nome do cliente |
| CNPJ | Documento |
| Status | Ativo/Inativo |
| Integrações | ERPs conectados |
| Analistas | Analistas vinculados |
| Faturamento (mês) | Último mês com dados |

**Ações:**
- Ver detalhes do cliente
- Vincular/desvincular analistas (→ `core.client_analysts`)
- Ver integrações ativas

### 4. Vinculação de Analistas

**Gerenciamento de `core.client_analysts`.**

| Ação | Descrição |
|---|---|
| Listar analistas | Usuários com papel 'analyst' |
| Vincular | Associar analista a um cliente |
| Desvincular | Remover associação |
| Ver carteira | Todos os clientes de um analista específico |

**Fluxo:**
1. Seleciona cliente na lista
2. Clica em "Vincular Analista"
3. Seleciona analista da lista
4. Confirma → INSERT em `core.client_analysts`

### 5. Vinculação de Usuários Clientes

**Gerenciamento de `core.client_users`.**

| Ação | Descrição |
|---|---|
| Listar usuários clientes | Usuários com papel 'client' |
| Vincular | Associar usuário a um cliente |
| Desvincular | Remover associação |

## Views Consultadas

| View | Frequência |
|---|---|
| `sales.client_monthly_billing` | KPIs e agregações |
| `sales.daily_billing` | Gráficos (quando habilitado) |
| `sales.client_monthly_ranking` | Ranking clientes |
| `sales.marketplace_monthly_ranking` | Ranking marketplaces |
| `sales.ecommerce_monthly_ranking` | Ranking e-commerce |
| `sales.channel_monthly_revenue` | Card tipo de loja |

## Permissões RLS

- Leader tem acesso **SELECT** a **todos** os registros de `core.clients`, `sales.*`
- Leader tem **CRUD** em `core.client_analysts` e `core.client_users`
- Leader **não** tem acesso a `core.api_tokens`, `core.audit_logs`, `integration.credentials`, `integration.tokens`
