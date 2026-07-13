# PRD 07 — Painel Cliente

## Visão Geral

Painel para clientes (empresas). Acesso a usuários com papel `client`. Cada cliente vê **apenas dados macro da sua própria conta** (definido em `core.client_users`).

## Funcionalidades

### 1. Dashboard da Conta

**Visão macro do faturamento do próprio cliente.**

| Card | Descrição |
|---|---|
| Faturamento do mês | Total aprovado no mês atual |
| Faturamento do mês anterior | Comparativo |
| Pedidos no mês | Quantidade de pedidos aprovados |
| Pedidos pendentes | Pedidos com status 'pending' |
| Ticket médio | Valor médio por pedido |

**Gráficos:**
- Faturamento diário (últimos 30 dias)
- Faturamento mensal (últimos 12 meses)
- Status dos pedidos (pizza: pending/approved/canceled)

### 2. Pedidos Recentes

**Lista dos últimos pedidos com detalhes básicos.**

| Coluna | Descrição |
|---|---|
| Número | Número do pedido/nota |
| Data | Data de emissão |
| Valor | Valor total |
| Status | Aprovado/Pendente/Cancelado |
| Itens | Quantidade de itens |

**Ações:**
- Ver detalhes do pedido (itens, valores)
- Filtrar por período
- Exportar lista (CSV)

### 3. Produtos

**Lista de produtos vendidos.**

| Coluna | Descrição |
|---|---|
| Produto | Nome |
| SKU | Código |
| Quantidade vendida | Total de unidades |
| Receita total | Valor total |

### 4. Status da Integração

**Informações sobre a integração ERP.**

| Informação | Descrição |
|---|---|
| ERP conectado | Bling/Tiny |
| Status | Ativo/Erro |
| Última atualização | Data da última sincronização |
| Próxima atualização | Previsão do próximo cron |

## API Calls

| Ação | Endpoint |
|---|---|
| Dashboard | Supabase: `sales.client_monthly_billing` (filtrado por client_id) |
| Pedidos recentes | Supabase: `sales.invoices` |
| Produtos | Supabase: `sales.products` (filtrado por client_id) |

## Permissões RLS

- Cliente vê **apenas** dados da empresa onde existe registro em `core.client_users` com `user_id = auth.uid()`
- A função `core.can_access_client(client_uuid)` gerencia esse filtro automaticamente
- Cliente **não** tem acesso a nenhuma tabela de `integration` (nem sabe quais ERPs estão configurados)
- Cliente **não** vê dados de outros clientes

## Observações

- MVP: o cliente tem um "aplicativo" próprio (ainda não um portal único da agência)
- Futuro: quando houver um app único, cada cliente verá apenas seus dados através de `core.api_tokens`
