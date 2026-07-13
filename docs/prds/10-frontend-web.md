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

#### Admin (`/admin/*`)

| Path | Descrição |
|---|---|
| `/admin` | Dashboard admin — cards de faturamento global, clientes ativos, integrações |
| `/admin/clients` | CRUD de clientes |
| `/admin/clients/new` | Novo cliente |
| `/admin/clients/[id]/edit` | Editar cliente |
| `/admin/users` | Gestão de usuários |
| `/admin/connected-apps` | Aplicativos conectados — tabela com status, token restante, ações |
| `/admin/app-store` | Central de aplicativos — grid de ERPs com botão "Conectar" |
| `/admin/activity-history` | Histórico de atividades — filtros por categoria, evento, data |
| `/admin/audit-logs` | Logs de auditoria do sistema |
| `/admin/queues` | Monitoramento de filas de retry |

#### Líder (`/leader/*`)

| Path | Descrição |
|---|---|
| `/leader` | Dashboard líder — faturamento total, comparativo mensal, tabela de clientes |
| `/leader/clients` | Gestão de carteira de clientes |
| `/leader/analysts` | Vínculo de analistas a clientes |

#### Analista (`/analyst/*`)

| Path | Descrição |
|---|---|
| `/analyst` | Dashboard analista — carteira de clientes, faturamento total, ranking de produtos |
| `/analyst/clients/[id]` | Detalhes do cliente — histórico de vendas, métricas |
| `/analyst/invoices` | Faturas |
| `/analyst/products` | Ranking de produtos |
| `/analyst/connected-apps` | Aplicativos conectados (leitura) |

#### Cliente (`/client/*`)

| Path | Descrição |
|---|---|
| `/client` | Dashboard cliente — faturamento mensal, produtos mais vendidos, faturas recentes |
| `/client/invoices` | Lista de faturas |
| `/client/products` | Produtos |

## Componentes Principais

### Layout

| Componente | Descrição |
|---|---|
| `<RootLayout>` | Providers: QueryClient, Sonner, Supabase listener |
| `<Sidebar>` | Navegação com accordions (Integrações, Auditoria e Filas) |
| `<Topbar>` | Avatar + dropdown perfil/logout, breadcrumb |
| `<ProtectedLayout>` | Verifica role e redireciona se acesso negado |

### Integração

| Componente | Descrição |
|---|---|
| `<ConnectDialog>` | Modal de conexão OAuth — passo único (nome do app → cria app + abre popup) |
| `<ConnectedAppsTable>` | Tabela de apps com badge de status, token restante (dias+horas), delete |
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
| `<BillingChart>` | Gráfico de barras (faturamento mensal) |
| `<ProductRanking>` | Top 5 produtos |
| `<ClientCard>` | Card de cliente com métricas |
| `<MetricCard>` | Card de métrica com ícone, valor, label |
| `<InvoicesTable>` | Tabela de faturas com status |
| `<ClientsTable>` | Tabela de clientes |
| `<UsersTable>` | Tabela de usuários |

## Hooks

| Hook | Descrição |
|---|---|
| `use-profile.ts` | `useProfile()` — busca perfil do usuário logado por role |
| `use-clients.ts` | `useClients()`, `useClient(id)`, `useCreateClient()`, `useUpdateClient()`, `useDeleteClient()` |
| `use-users.ts` | `useUsers()`, `useCreateUser()`, `useUpdateUser()`, `useDeactivateUser()` |
| `use-integrations.ts` | `useProviders()`, `useGetAuthUrl(appId, provider)`, `useCreateIntegrationClient()`, `useDeleteIntegration(appId)`, `useListConnectedApps()` |
| `use-invoices.ts` | `useInvoices(clientId?, period?)`, `useSyncInvoices(appId, dateRange)` |
| `use-products.ts` | `useProducts(clientId?)`, `useProductRanking()` |
| `use-dashboard.ts` | `useAdminDashboard()`, `useLeaderDashboard(period)`, `useAnalystDashboard()`, `useClientDashboard()` |
| `use-billing.ts` | `useMonthlyBilling(clientId?, months)`, `useDailyBilling(clientId?, days)` |
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
