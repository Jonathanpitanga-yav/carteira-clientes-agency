# PRD 10 — Frontend (Web)

> Documentação completa do frontend da Seller Wallet
> **Versão:** 1.0.0 — MVP  
> **Última atualização:** 2026-07-13

---

## 1. Stack Tecnológica

| Camada | Tecnologia | Versão |
|---|---|---|
| Framework | Next.js (App Router) | 16.2.10 |
| Linguagem | TypeScript | 5.x |
| Estilização | Tailwind CSS | v4 |
| Componentes | shadcn/ui (base-ui/react) | 4.13.0 |
| State/Cache | @tanstack/react-query | 5.101 |
| Formulários | react-hook-form + zod | 4.x |
| Autenticação | @supabase/ssr | 0.12 |
| Gráficos | Recharts | 3.9 |
| Toast | Sonner | 2.0 |
| Tema | next-themes | 0.4 |
| Ícones | Lucide React | 1.24 |
| Data | date-fns | 4.4 |

---

## 2. Arquitetura de Pastas

```
web/src/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Grupo de rotas públicas
│   │   ├── login/page.tsx        # Tela de login
│   │   └── layout.tsx            # Layout limpo (sem sidebar)
│   ├── (dashboard)/              # Grupo de rotas protegidas
│   │   ├── layout.tsx            # Sidebar + Header + AuthGuard
│   │   ├── page.tsx              # Redirect por role
│   │   ├── admin/...             # 9 páginas do admin
│   │   ├── leader/...            # 5 páginas do líder
│   │   ├── analyst/...           # 5 páginas do analista
│   │   └── client/...            # 4 páginas do cliente
│   ├── layout.tsx                # Providers globais + fonts
│   └── globals.css               # Tema YAV + variáveis shadcn/ui
│
├── components/
│   ├── ui/                       # shadcn/ui primitives
│   ├── layout/                   # Sidebar, Header, AuthGuard, PageContainer
│   ├── feedback/                 # ErrorBoundary, EmptyState
│   └── shared/                   # PageHeader, StatCard
│
├── modules/                      # Componentes por domínio
│   ├── auth/                     # login-form, use-auth-form
│   ├── admin/                    # client/, user/, integration/, audit-logs/, api-tokens/, queues/, overview/
│   ├── leader/                   # billing-overview, client-ranking
│   ├── analyst/                  # portfolio-stats, integration-status-list, product-ranking-table
│   └── client/                   # account-summary
│
├── hooks/                        # Custom hooks (data fetching + mutations)
│   ├── use-clients.ts            # CRUD clientes
│   ├── use-users.ts              # CRUD usuários
│   ├── use-billing.ts            # Faturamento (monthly + daily)
│   ├── use-products.ts           # Ranking de produtos
│   ├── use-integrations.ts       # Integrações ERP
│   ├── use-audit-logs.ts         # Auditoria
│   ├── use-api-tokens.ts         # Tokens M2M
│   └── use-queues.ts             # Monitoramento de filas
│
├── providers/
│   ├── auth-provider.tsx         # Sessão + role do Supabase
│   ├── theme-provider.tsx        # next-themes (dark default)
│   └── query-provider.tsx        # TanStack Query
│
├── lib/
│   ├── supabase/                 # client.ts, server.ts, middleware.ts
│   ├── utils/                    # cn.ts, format.ts, errors.ts
│   └── constants/                # Roles, query keys, routes
│
├── types/
│   └── database.ts               # Tipos das tabelas/views
│
└── middleware.ts                 # Next.js Proxy (autenticação)
```

---

## 3. Mapa de Rotas (24 páginas)

| Rota | Papel | Descrição | Componentes |
|---|---|---|---|
| `/login` | Público | Login email/senha + magic link | LoginForm, MagicLinkForm |
| `/` | Todos | Redirect para home por role | — |
| `/admin` | admin | Dashboard com stats | StatsGrid |
| `/admin/clients` | admin | CRUD clientes | ClientList, ClientFormDialog, ClientDeleteDialog |
| `/admin/clients/[id]` | admin | Detalhe do cliente | StatCard (faturamento) |
| `/admin/users` | admin | CRUD usuários | UserList, UserFormDialog |
| `/admin/users/[id]` | admin | Detalhe do usuário | — |
| `/admin/integrations` | admin | Lista integrações ERP | IntegrationList |
| `/admin/audit-logs` | admin | Auditoria com filtros | AuditLogTable |
| `/admin/api-tokens` | admin | Tokens M2M | TokenList, TokenCreateDialog |
| `/admin/queues` | admin | Filas pgmq | QueueMonitor |
| `/leader` | leader | Overview faturamento | BillingOverview, ClientRanking |
| `/leader/clients` | leader | Lista clientes | Table |
| `/leader/clients/[id]` | leader | Detalhe do cliente | StatCard |
| `/leader/billing` | leader | Gráfico + tabela | BarChart (Recharts), Table |
| `/leader/analysts` | leader | Placeholder | — |
| `/analyst` | analyst | Stats da carteira | PortfolioStats |
| `/analyst/clients` | analyst | Grid clientes | Card grid |
| `/analyst/clients/[id]` | analyst | Detalhe do cliente | StatCard |
| `/analyst/integrations` | analyst | Status + sync manual | IntegrationStatusList |
| `/analyst/products` | analyst | Ranking produtos | ProductRankingTable |
| `/client` | client | Overview da conta | AccountSummary |
| `/client/billing` | client | Histórico faturamento | BarChart, Table |
| `/client/products` | client | Produtos vendidos | Table |
| `/client/orders` | client | Pedidos recentes | Table |
| `/_not-found` | Todos | 404 | — |

---

## 4. Limites de Linhas

| Tipo | Limite | Status |
|---|---|---|
| Páginas (page.tsx) | ≤ 50 linhas | ✅ Todas respeitam |
| Componentes visuais | ≤ 150 linhas | ✅ Maioria ~60-120 linhas |
| Hooks customizados | ≤ 100 linhas | ✅ Todos abaixo |

---

## 5. Tema de Cores (YAV)

```
Light mode:
  Background:  #FFFFFF
  Foreground:  #0F172A (slate 900)
  Primary:     #00F6F6 (cyan)
  Secondary:   #6E29F6 (purple)

Dark mode (default):
  Background:  #080A0E (deep dark)
  Foreground:  #FFFFFF
  Primary:     #00F6F6 (cyan)
  Secondary:   #6E29F6 (purple)
  Surface:     rgba(255,255,255,0.02-0.06)
  Borders:     rgba(255,255,255,0.10)
```

Implementado via variáveis CSS `oklch` no `globals.css`, seguindo o padrão shadcn/ui.

---

## 6. Sistema de Feedback

### Toast (Sonner)
| Tipo | Fundo | Mensagem |
|---|---|---|
| Success | Verde | "Cliente cadastrado com sucesso!" |
| Error | Vermelho | "Não foi possível salvar. Tente novamente." |
| Warning | Laranja | "A sincronização pode levar alguns minutos." |

### Error Handling
- `lib/utils/errors.ts` mapeia códigos de erro → mensagens humanas
- `components/feedback/error-boundary.tsx` captura erros não tratados
- Nunca expõe detalhes técnicos ao usuário

### Empty States
- `components/feedback/empty-state.tsx` com título + descrição + action opcional

---

## 7. Proteção de Dados Sensíveis

| Prática | Implementação |
|---|---|
| RLS obrigatório | Toda query passa pelo Supabase RLS |
| Service role nunca no front | Apenas anon key + RLS |
| Tokens M2M | Mostrar apenas prefixo (`sw_abc...`). Valor completo nunca exposto |
| Credenciais ERP | Nunca enviadas ao frontend |
| Auditoria | Payloads exibidos truncados (60 chars) |

---

## 8. Autenticação

- **Fluxo**: Supabase Auth (email/senha + magic link)
- **Middleware**: `proxy` (Next.js 16) protege todas as rotas `(dashboard)/*`
- **Role Guard**: `AuthGuard` component redireciona baseado na role do usuário
- **Rotas públicas**: apenas `/login`
- **Redirect**: `/` detecta role e redireciona para `/admin`, `/leader`, `/analyst` ou `/client`

---

## 9. Hooks (Data Fetching)

Cada hook encapsula TanStack Query (`useQuery`/`useMutation`) com:

| Hook | Tabelas/Views | Operações |
|---|---|---|
| `use-clients` | `clients` | Listar, criar, atualizar, deletar, stats |
| `use-users` | `profiles` | Listar, buscar por id, atualizar, stats |
| `use-billing` | `client_monthly_billing`, `daily_billing` | Consultar por cliente ou geral |
| `use-products` | `product_ranking` | Listar ranking |
| `use-integrations` | `client_applications` | Listar, desativar, sync manual |
| `use-audit-logs` | `audit_logs` | Listar com filtros |
| `use-api-tokens` | `api_tokens` | Listar, criar, revogar |
| `use-queues` | `pgmq_queues` / `get_queue_status` | Listar status das filas |

---

## 10. Fases de Implementação

| Fase | Descrição | Status |
|---|---|---|
| 1 | Scaffold + Auth (Next.js, shadcn/ui, tema, providers, login, layout) | ✅ |
| 2 | Admin CRUDs (clientes, usuários, overview) | ✅ |
| 3 | Admin Técnico (integrações, audit logs, API tokens, filas) | ✅ |
| 4 | Leader (dashboard, rankings, billing consolidado) | ✅ |
| 5 | Analyst (carteira, status integrações, ranking produtos) | ✅ |
| 6 | Client (dashboard próprio, billing, produtos, pedidos) | ✅ |
| 7 | Polimento (ErrorBoundary, EmptyState, responsividade) | ✅ |

---

## 11. Estrutura de Dependências

```json
{
  "dependencies": {
    "@supabase/ssr": "^0.12.1",
    "@supabase/supabase-js": "^2.110.3",
    "@tanstack/react-query": "^5.101.2",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "date-fns": "^4.4.0",
    "lucide-react": "^1.24.0",
    "next": "16.2.10",
    "next-themes": "^0.4.6",
    "react": "19.2.4",
    "react-dom": "19.2.4",
    "react-hook-form": "^7.55.0",
    "@hookform/resolvers": "^5.0.0",
    "recharts": "^3.9.2",
    "sonner": "^2.0.7",
    "tailwind-merge": "^3.6.0",
    "zod": "^4.4.3"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "tailwindcss": "^4",
    "typescript": "^5"
  }
}
```

---

## 12. Próximos Passos (Pós MVP)

- [ ] Vincular analistas a clientes (página `/leader/analysts`)
- [ ] Página de erro 404 customizada
- [ ] Testes E2E com Playwright
- [ ] PWA / mobile-first improvements
- [ ] Exportar dados (CSV)
- [ ] Filtros avançados por período nos gráficos
- [ ] Notificações em tempo real via Supabase Realtime
