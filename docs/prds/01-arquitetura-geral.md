# PRD 01 — Arquitetura Geral

## Stack Tecnológica

| Camada | Tecnologia | Versão |
|---|---|---|
| Banco de Dados | Supabase (PostgreSQL) | 17.6.1 |
| Backend | Supabase Edge Functions (Deno) | 2.x |
| Frontend | Next.js + Tailwind CSS + shadcn/ui | — |
| Autenticação | Supabase Auth | — |
| Extensões DB | pg_cron, pgmq, pg_net, pgcrypto | — |

## Princípios Arquiteturais

1. **Monólito Modular** — Schemas separados por domínio (`core`, `integration`, `sales`, `jobs`) dentro do mesmo banco
2. **Adapter Pattern** — Cada ERP tem seu próprio adaptador implementando `IERPAdapter`; adicionar um novo ERP = criar uma classe
3. **Data-Driven** — Primeiro modelamos o banco, depois as edge functions, depois o frontend
4. **Role-Based Access** — 4 papéis (admin, leader, analyst, client) com RLS rígido no banco
5. **Resiliente** — Rate limiting, filas de retry (pgmq), cron jobs (pg_cron), 3 tentativas com backoff

## Visão Macro

```
┌─────────────────────────────────────────────────────┐
│                    Frontend Next.js                  │
│  ┌──────────┐  ┌──────────┐  ┌──────┐  ┌────────┐  │
│  │  Admin   │  │  Leader  │  │Analyst│  │ Client │  │
│  └────┬─────┘  └────┬─────┘  └──┬───┘  └───┬────┘  │
│       └──────────────┴──────────┴──────────┘        │
│                      Supabase Auth                    │
└────────────────────────┬────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────┐
│              Supabase Edge Functions                 │
│  ┌──────────┐ ┌──────────┐ ┌────────┐ ┌──────────┐  │
│  │erp-callback│erp-refresh│erp-webhook│erp-sync-data││
│  └────┬─────┘ └────┬─────┘ └───┬────┘ └─────┬────┘  │
│       └────────────┴───────────┴────────────┘        │
│                    Adapters Layer                      │
│         ┌──────────┐  ┌──────────────────┐            │
│         │  Bling   │  │  Tiny (Keycloak) │            │
│         └──────────┘  └──────────────────┘            │
└────────────────────────┬────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────┐
│              Supabase PostgreSQL                      │
│  core/ ── profiles, clients, audit_logs, api_tokens   │
│  integration/ ── erp_providers, apps, credentials     │
│  sales/ ── invoices, products, invoice_items          │
│  jobs/ ── cron jobs (pg_cron), queues (pgmq)          │
└─────────────────────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────┐
│              ERPs Externos                            │
│  ┌─────────────────┐  ┌──────────────────┐           │
│  │  Bling (OAuth2) │  │  Tiny (OpenID)   │           │
│  └─────────────────┘  └──────────────────┘           │
└─────────────────────────────────────────────────────┘
```

## Fluxo de Dados

```
ERP → Webhook ──► erp-webhook ──► adapter.handleWebhook ──► sales.*
ERP → Pull Manual ──► erp-sync-data ──► adapter.fetchOrders ──► sales.*
ERP → OAuth ──► erp-callback ──► adapter.exchangeCodeForToken ──► integration.tokens
Cron (30min) ──► erp-refresh-token ──► adapter.refreshToken ──► integration.tokens
```

## Controle de Acesso

| Papel | Acesso |
|---|---|
| **admin** | Total: CRUD clientes, usuários, integrações, logs, api_tokens |
| **leader** | Visão geral de todos clientes, rankings, vincular analistas |
| **analyst** | Dados completos apenas dos clientes da sua carteira |
| **client** | Apenas dados macro da própria conta |

Função `core.can_access_client(client_uuid)` no banco gerencia o RLS para todos os papéis.
