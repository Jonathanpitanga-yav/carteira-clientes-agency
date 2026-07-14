# PRD 10 — Frontend Web

## Stack

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 16.2 (App Router) |
| Linguagem | TypeScript 5.x |
| Estilização | Tailwind CSS v4 |
| Componentes | shadcn/ui (Radix primitives) |
| Estado servidor | TanStack Query v5 |
| Autenticação | Supabase SSR (cookie-based) |
| Cache/DB local | Zustand (autenticação) |
| Gráficos | Recharts |
| Notificações | Sonner (toast) |
| Tabelas | TanStack Table v8 |
| Formulários | React Hook Form + Zod |
| Ícones | Lucide React |

## Rotas

### Públicas (sem autenticação)

| Path | Descrição |
|---|---|
| `/login` | Tela de login (email + senha) |
| `/auth/oauth-callback` | Página de callback OAuth — recebe params da URL, envia `postMessage` ao opener, fecha popup |

### Dashboard (autenticadas)

#### Dashboard Unificado

| Path | Descrição |
|---|---|
| `/` | **Dashboard único** que adapta o nível de zoom conforme a role do usuário |

**Níveis de zoom:**
| Papel | O que vê |
|---|---|
| Admin | `BillingOverview` (4 cards) + ranking clientes + total de usuários |
| Leader | `BillingOverview` (4 cards) + ranking clientes |
| Analyst | `PortfolioStats` (4 cards filtrados pela carteira) |
| Client | `AccountSummary` (4 cards com dados próprios + variação) |

Rotas antigas (`/admin`, `/leader`, `/analyst`, `/client`) redirecionam para `/`.

#### Módulos por papel

**Admin (`/admin/*`)**

| Path | Descrição |
|---|---|
| `/admin/clients` | CRUD de clientes |
| `/admin/clients/new` | Novo cliente |
| `/admin/clients/[id]/edit` | Editar cliente |
| `/admin/users` | Gestão de usuários com multi‑role |
| `/admin/connected-apps` | Aplicativos conectados — status efetivo, refresh manual, delete |
| `/admin/integrations` | Central de aplicativos — grid de ERPs |
| `/admin/activity-history` | Histórico de atividades — filtros por categoria, evento, data |
| `/admin/audit-logs` | Logs de auditoria do sistema |
| `/admin/queues` | Monitoramento de filas de retry |
| `/admin/api-tokens` | Tokens de API M2M |

**Líder (`/leader/*`)**

| Path | Descrição |
|---|---|
| `/leader/clients` | Gestão de carteira de clientes |
| `/leader/analysts` | Vínculo de analistas a clientes |
| `/leader/billing` | Faturamento detalhado |

**Analista (`/analyst/*`)**

| Path | Descrição |
|---|---|
| `/analyst/clients/[id]` | Detalhes do cliente — histórico de vendas, métricas |
| `/analyst/products` | Ranking de produtos |
| `/analyst/connected-apps` | Aplicativos conectados (leitura) |

**Cliente (`/client/*`)**

| Path | Descrição |
|---|---|
| `/client/invoices` | Lista de faturas |
| `/client/products` | Produtos |
| `/client/billing` | Faturamento detalhado |

## Componentes Principais

### Layout

| Componente | Descrição |
|---|---|
| `<RootLayout>` | Providers: QueryClient, Sonner, Supabase listener |
| `<Sidebar>` | Navegação com accordions (Integrações, Auditoria e Filas). Itens filtrados por **interseção** entre roles do usuário e do item. Exibe labels combinados no rodapé. |
| `<Topbar>` | Avatar + dropdown perfil/logout com labels dos múltiplos papéis |
| `<AuthGuard>` | Verifica interseção entre `allowedRoles` e `roles` do usuário. Redireciona para `/` se sem acesso. |

### Integração

| Componente | Descrição |
|---|---|
| `<ConnectDialog>` | Modal de conexão OAuth — passo único (nome do app → cria app + abre popup) |
| `<ConnectedAppsTable>` | Tabela de apps com **status efetivo** (app + token), token restante (Xd Yh), botão 🔄 refresh manual (OAuth2), delete |
| `<AppStoreGrid>` | Grid de provedores ERP com badge de conexões ativas |
| `<ClientNameDialog>` | Dialog que cria app + salva credentials + abre popup |
| `<OAuthListener>` | Hook `useOAuthListener` — escuta `postMessage` de popups OAuth, mostra toast |

### Activity History / Audit Logs

| Componente | Descrição |
|---|---|
| `<ActivityHistoryTable>` | Tabela com filtro de categoria (badge colorido), evento, data, payload preview |
| `<AuditLogsTable>` | Tabela com filtro de período, ação, entidade |
| `<BadgeCategory>` | Badge por categoria (credentials=secondary, access=default, queues=outline) |

### Dashboard

| Componente | Descrição |
|---|---|
| `<UnifiedDashboard>` | Componente único que renderiza o zoom adequado conforme `roles`: `BillingOverview` (admin/leader), `PortfolioStats` (analyst), `AccountSummary` (client) |
| `<BillingOverview>` | 4 StatCards: faturamento do mês, clientes ativos, pedidos, ticket médio (consolidado) |
| `<ClientRanking>` | Top 10 clientes ativos (leader/admin) |
| `<PortfolioStats>` | 4 StatCards filtrados pela carteira do analista |
| `<AccountSummary>` | 4 StatCards do próprio cliente + variação vs mês anterior |
| `<AdminCards>` | Card extra: total de usuários cadastrados (admin) |
| `<StatCard>` | Card de métrica genérico com ícone, valor, label, loading state |
| `<InvoicesTable>` | Tabela de faturas com status |
| `<ClientsTable>` | Tabela de clientes |
| `<UsersTable>` | Tabela de usuários com badges de múltiplos papéis |

## Hooks

| Hook | Descrição |
|---|---|
| `auth-provider.tsx` | `useAuth()` → expõe `{ user, session, roles: Role[], isLoading, signOut }`. `roles` é array (multi‑role). |
| `use-clients.ts` | `useClients()`, `useClient(id)`, `useCreateClient()`, `useUpdateClient()`, `useDeleteClient()` |
| `use-users.ts` | `useUsers()`, `useUser(id)`, `useUpdateUser()` com `roles: string[]`, `useUsersStats()` contando por array |
| `use-integrations.ts` | `useProviders()`, `useGetAuthUrl(appId, provider)`, `useCreateIntegrationClient()`, `useDeleteIntegration(appId)`, `useConnectedApps()`, `useRefreshToken(appId)` — refresh manual |
| `use-invoices.ts` | `useInvoices(clientId?, period?)`, `useSyncInvoices(appId, dateRange)` |
| `use-products.ts` | `useProducts(clientId?)`, `useProductRanking()` |
| `use-billing.ts` | `useBillingSummary()`, `useMonthlyBilling(clientId?, months)`, `useDailyBilling(clientId?, days)` |
| `use-activity-logs.ts` | `useActivityLogs(filters)` — query `integration.audit_logs`, `useActivityEventTypes()` — distinct event types |
| `use-audit-logs.ts` | `useAuditLogs(filters)` — query `core.audit_logs` |
| `use-queues.ts` | `useQueueStatus()` — query `jobs.queue_status` |
| `use-o-auth-listener.ts` | `useOAuthListener()` — escuta `postMessage` de popups OAuth |

## Tema

| Variável CSS | Valor |
|---|---|
| `--background` | `#FFFFFF` |
| `--foreground` | `#09090B` |
| `--card` | `#FFFFFF` |
| `--popover` | `#FFFFFF` |
| `--primary` | `#18181B` |
| `--primary-foreground` | `#FAFAFA` |
| `--secondary` | `#F4F4F5` |
| `--muted` | `#F4F4F5` |
| `--accent` | `#F4F4F5` |
| `--destructive` | `#EF4444` |
| `--ring` | `#D4D4D8` |
| `--radius` | `0.625rem` |

## Middleware

| Path | Excluído de auth | Descrição |
|---|---|---|
| `/login` | Sim | Página pública |
| `/auth/oauth-callback` | Sim | Callback OAuth público (auto-close popup) |
| `/_next/static` | Sim | Assets estáticos |
| `/favicon.ico` | Sim | Favicon |

O middleware usa `updateSession()` do `@supabase/ssr` para gerenciar sessão. Redireciona para `/login` se não autenticado.

Carregamento de dados do perfil na raiz usa `Suspense` boundary:
```tsx
<Suspense fallback={<FullScreenLoader />}>
  {children}
</Suspense>
```
