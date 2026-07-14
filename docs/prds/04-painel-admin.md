# PRD 04 — Painel Admin

## Visão Geral

Painel de administração da agência. Acesso a usuários com papel `admin`, e por multi‑role,
também enxerga os módulos de líder e analista.

## Sidebar

A sidebar utiliza accordions para agrupar itens relacionados e filtra por **qualquer** role
do usuário (multi‑role):

| Accordion | Itens |
|---|---|
| — | Dashboard (único, todas as roles) |
| — | Clientes (admin, leader, analyst) |
| — | Usuários (admin) |
| Integrações | Central de Aplicativos (admin), Aplicativos Conectados (admin, analyst) |
| Auditoria e Filas | Histórico de Atividades, Logs de Auditoria, Filas de Retry (admin) |
| — | API Tokens (admin) |
| — | Faturamento (leader) |
| — | Analistas (leader) |
| — | Produtos (analyst) |
| — | Pedidos (client) |
| — | Produtos (client) |
| — | Faturamento (client) |

Cada accordion mantém seu estado de aberto/fechado independentemente.

## Dashboard Unificado

Em vez de telas separadas por perfil, há **um único dashboard** em `/` que adapta o nível
de zoom conforme a role do usuário:

| Papel | Zoom | O que vê |
|---|---|---|
| Admin | Agência (consolidado) | `BillingOverview` (4 cards: faturamento, clientes ativos, pedidos, ticket médio) + ranking de clientes + total de usuários |
| Leader | Agência (consolidado) | `BillingOverview` + ranking de clientes |
| Analyst | Carteira (apenas seus clientes) | `PortfolioStats` (4 cards filtrados pela carteira) |
| Client | Própria empresa | `AccountSummary` (4 cards com dados próprios + variação vs mês anterior) |

As rotas antigas (`/admin`, `/leader`, `/analyst`, `/client`) redirecionam para `/`.

## Multi‑role

Usuários podem ter **múltiplos papéis** armazenados na coluna `roles TEXT[]` de
`core.profiles`. O frontend:

- `AuthProvider` expõe `roles: Role[]`
- `AuthGuard` checa interseção entre `allowedRoles` e `roles`
- `Sidebar` mostra itens cujo `roles` intersecta com os do usuário
- `Header` exibe labels combinados (ex: "Administrador, Líder, Analista")
- `DashboardRoot` redireciona para `/` (único dashboard)
- Painel de edição de usuários usa checkboxes multi‑select

## Funcionalidades

### 1. Gestão de Clientes

**CRUD completo de `core.clients`.**

| Ação | Descrição | Tabela |
|---|---|---|
| Listar | Tabela com todos os clientes, status, integrações ativas | `core.clients` |
| Criar | Formulário: nome, CNPJ, status | INSERT |
| Editar | Alterar dados do cliente | UPDATE |
| Ativar/Desativar | Mudar status entre 'active' e 'inactive' | UPDATE |
| Excluir | Exclusão cascateia para vendas, tokens, etc. | DELETE |

### 2. Gestão de Usuários

**CRUD de `core.profiles` e vínculos, com suporte a multi‑role.**

| Ação | Descrição |
|---|---|
| Listar | Todos os usuários com badges de múltiplos papéis |
| Criar | Convidar via email, definir papéis |
| Editar | Alterar nome ou papéis (checkboxes multi‑select) |
| Desativar | Bloquear acesso |

### 3. Central de Aplicativos (Integrações ERP)

**Catálogo de ERPs disponíveis, com suporte a multi-conexão.**

| Funcionalidade | Descrição |
|---|---|
| Listar ERPs | Cards com Bling, Tiny, Anymarket |
| Conectar | Botão "Conectar" sempre visível por ERP |
| Badge de conexões | Mostra "2 conectados" se houver múltiplas |
| Lista de clientes | Abaixo de cada ERP, lista de clientes conectados com status individual |

**Fluxo de conexão (OAuth2):**
1. Admin clica "Conectar" no ERP desejado
2. Dialog solicita Client ID + Client Secret (fornecidos pelo cliente)
3. Admin insere nome do cliente e confirma
4. `useCreateIntegrationClient()` cria cliente + app (status "pending") + salva credentials
5. `useGetAuthUrl()` → edge function `erp-callback?action=authorize` → retorna `{ authUrl }`
6. Frontend abre popup com auth URL do ERP
7. Usuário autoriza → ERP redireciona para edge function
8. Edge function troca code por token, salva, redireciona (302) para `/auth/oauth-callback`
9. Popup envia `postMessage` para janela principal e fecha
10. Janela principal exibe toast de sucesso

### 4. Aplicativos Conectados

**Tabela de todos os `client_applications` com status efetivo e token.**

| Coluna | Descrição |
|---|---|
| Cliente | Nome do cliente |
| ERP | Nome do provedor + badge OAuth2/API Key |
| Status | Badge **efetivo** combinando `app.status` + `token.expires_at` |
| Token | Tempo restante: `2d 5h` ou `3h` (dias + horas, nunca apenas dias) |
| Conectado desde | Data de criação formatada pt-BR |
| Ações | Renovar token (🔄) + Desativar (🗑️) |

**Status efetivo** (derivado do app + token):

| app.status | token.expires_at | Badge |
|---|---|---|
| active | válido | **Ativo** (verde) |
| active | expirado | **Token Expirado** (laranja + tooltip "aguarda renovação") |
| active | null | **Sem Token** (vermelho) |
| expired | qualquer | **Expirado** (laranja) |
| error | qualquer | **Erro** (vermelho) |
| pending | qualquer | **Pendente** (cinza) |

**Refresh manual:** Botão 🔄 na coluna Ações (apenas OAuth2) que chama a edge function
`erp-refresh-token` com `{ appId }` para renovar o token sob demanda.

### 5. Tokens de API (M2M)

**Gestão de `core.api_tokens` para autenticação machine-to-machine.**

| Ação | Descrição |
|---|---|
| Criar token | Gerar novo token para um cliente |
| Revogar | Invalidar token imediatamente |
| Listar | Ver todos os tokens com prefixo, status, último uso |

### 6. Histórico de Atividades

**Visão unificada de `integration.audit_logs` com 3 categorias.**

| Categoria | Cor (Badge) | Eventos incluídos |
|---|---|---|
| Credenciais | Secondary | Criação/atualização/expiração de tokens, fluxo OAuth, refresh automático |
| Acesso e Permissões | Default | (futuro) Habilitação/desabilitação de analistas, tentativas de acesso negado |
| Filas e Sincronização | Outline | Início/fim de cargas, falhas de comunicação, rate limit estourado |

**Filtros:**
- Por categoria (dropdown)
- Por tipo de evento (dropdown)
- Por data início

**Colunas:** Data, Categoria (badge), Evento (`<code>`), Detalhes (ERP, erro, payload preview)

### 7. Logs de Auditoria

**Visualização de `core.audit_logs` (sistema).**

| Coluna | Descrição |
|---|---|
| Data/Hora | Timestamp do evento |
| Ação | Tipo de ação |
| Entidade | O que foi afetado |
| Detalhes | Payload JSON truncado (60 chars) |

**Filtros:**
- Por período
- Por ação
- Por entidade

### 8. Monitoramento de Filas

**Visualização de `jobs.queue_status`.**

| Métrica | Descrição |
|---|---|
| Queue | Nome da fila pgmq |
| Messages | Mensagens pendentes |
| Archived | Mensagens arquivadas (após max retry) |

## Refresh Automático de Tokens

| Ação | Quando | Gatilho |
|---|---|---|
| Verificar tokens a expirar | A cada 30 min | `pg_cron` → `SELECT jobs.trigger_refresh_tokens()` |
| Busca tokens com `expires_at ≤ now + 31min` | Antecipa 30 min antes do vencimento | Edge function `erp-refresh-token` |
| Refresh manual | Sob demanda (clique do admin) | Edge function com `{ appId }` |
| Marcar como 'error' | Se refresh falhar | `enqueueRetry('erp_token_retry')` + log `queue.enqueued` |
| Auditoria | Cada token processado | `createAuditLog()` com `category: 'credentials'` |

## API Calls

| Ação | Edge Function / Supabase |
|---|---|
| CRUD clientes | Supabase Table API (RLS) |
| CRUD usuários | Supabase Auth Admin API |
| Conectar ERP | `GET /erp-callback?action=authorize` |
| Refresh manual | POST `erp-refresh-token` com `{ appId }` |
| Sincronizar | POST `erp-sync-data` |
| Histórico de Atividades | `SELECT * FROM integration.audit_logs` |
| Auditoria | `SELECT * FROM core.audit_logs` |
| Filas | View `jobs.queue_status` |
