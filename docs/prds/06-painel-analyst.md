# PRD 06 — Painel Analista

## Visão Geral

Painel para analistas da agência. Acesso a usuários com papel `analyst`. Cada analista vê **apenas os clientes da sua carteira** (definida em `core.client_analysts`).

## Funcionalidades

### 1. Dashboard do Analista

**Visão consolidada dos clientes da carteira.**

| Card | Fonte |
|---|---|
| Clientes na carteira | `core.client_analysts WHERE analyst_id = auth.uid()` |
| Faturamento total (mês) | `sales.client_monthly_billing` (filtrado pela carteira) |
| Total de pedidos | `sales.invoices` (filtrado pela carteira) |
| Ticket médio | Cálculo no frontend |
| Cliente com maior faturamento | Ranking filtrado |

**Gráfico:**
- Faturamento mensal dos últimos 6 meses por cliente
- Pizza: distribuição de faturamento entre clientes da carteira

### 2. Detalhes dos Clientes

**Dados completos de cada cliente da carteira.**

| Seção | Conteúdo |
|---|---|
| Informações gerais | Nome, CNPJ, status, integrações |
| Faturamento mensal | Gráfico de faturamento mês a mês |
| Pedidos recentes | Lista dos últimos pedidos aprovados |
| Produtos mais vendidos | Top produtos do cliente |
| Status da integração | Se o ERP está conectado e ativo |

### 3. Ranking de Produtos

**Top produtos vendidos nos clientes da carteira.**

| Coluna | Descrição |
|---|---|
| Produto | Nome |
| SKU | Código |
| Cliente | Nome do cliente |
| Total pedidos | Quantidade de pedidos |
| Qtd vendida | Unidades vendidas |
| Receita | Valor total |

Fonte: `sales.product_ranking` (filtrado pela carteira do analista).

**Filtros:**
- Por cliente
- Por período
- Por categoria

### 4. Status das Integrações

**Visão das conexões ERP dos clientes da carteira.**

| Coluna | Descrição |
|---|---|
| Cliente | Nome |
| ERP | Bling/Tiny |
| Status | Ativo/Erro/Pendente |
| Última sincronização | Data do último sync |
| Ações | Sincronizar manualmente |

**Ações:**
- Sincronizar dados manualmente via `erp-sync-data`
- Ver logs de erro da integração
- Notificar admin se integração estiver com erro

## API Calls

| Ação | Endpoint |
|---|---|
| Listar carteira | Supabase: `client_analysts + clients` |
| Faturamento | `sales.client_monthly_billing` (filtrado) |
| Ranking produtos | `sales.product_ranking` (filtrado) |
| Sincronizar | POST `erp-sync-data` |

## Permissões RLS

- Analista vê **apenas** clientes onde existe registro em `core.client_analysts` com `analyst_id = auth.uid()`
- A função `core.can_access_client(client_uuid)` gerencia esse filtro automaticamente
- Analista **não** tem acesso a `integration.credentials`, `integration.tokens`
