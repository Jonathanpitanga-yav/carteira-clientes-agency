# Seller Wallet — Sistema de Gestão de Carteira de Clientes

## Propósito
Sistema modular para agências gerenciarem a carteira de clientes, com foco em:
- Faturamento e vendas consolidadas de múltiplos ERPs
- Controle de acesso por papel (admin, leader, analyst, client)
- Integração padronizada via adaptadores de ERP

## Stack
- **Banco**: Supabase (PostgreSQL + RLS)
- **Backend**: Supabase Edge Functions (Deno/TypeScript)
- **Frontend**: Next.js + Tailwind CSS + shadcn/ui
- **Auth**: Supabase Auth (magic link / email-senha)

## Arquitetura de Integração (Adapter Pattern)
Cada ERP possui um adapter que implementa `IERPAdapter`:
- `exchangeCodeForToken` — fluxo OAuth
- `refreshToken` — renovação de token
- `handleWebhook` — normalização de webhooks
- `fetchOrders` — sincronização manual de dados

Edge Functions expostas:
| Function | Gatilho | Responsabilidade |
|---|---|---|
| `erp-callback` | HTTP (redirect OAuth) | Trocar code por access_token |
| `erp-refresh-token` | Cron (30 min) | Renovar tokens expirados |
| `erp-webhook` | HTTP (POST externo) | Receber dados em tempo real |
| `erp-sync-data` | HTTP (manual) | Sincronizar dados sob demanda |

## Controle de Acesso (4 Papéis)

| Papel | Acesso |
|---|---|
| **admin** | Total: CRUD clientes, usuários, integrações, logs |
| **leader** | Visão geral de todos clientes, rankings, vincular analistas |
| **analyst** | Dados completos apenas dos clientes da sua carteira |
| **client** | Apenas dados macro da própria conta |

## Estrutura do Banco (Schemas)
- `core` — perfis, clientes, vínculos, audit_logs, api_tokens
- `integration` — provedores ERP, aplicações, credenciais, tokens
- `sales` — faturas, itens, produtos, views de faturamento
- `products` — catálogo de produtos (futuro)
- `jobs` — cron jobs (pg_cron), filas de retry (pgmq), helpers

## Infraestrutura de Tarefas
- **pg_cron**: 3 jobs agendados (refresh tokens a cada 30min, retry de token a cada 5min, retry de sync a cada 10min)
- **pgmq**: 3 filas de retry com até 3 tentativas por mensagem
- **pg_net**: Chamadas HTTP assíncronas para edge functions direto do banco
- **Rate Limiting**: Bling (2 req/s), Tiny (1 req/s) com retry automático em 429

## MVP
Painel de visão completa de faturamento de clientes com dados vindos de:
1. Webhooks dos ERPs (tempo real)
2. Sincronização manual via botões no painel

## Fluxo de Dados
```
ERP (Bling/Tiny)
  │
  ├── Webhook ──► erp-webhook (Edge Function)
  │                   ├── adapter.handleWebhook(payload)
  │                   ├── normalizar dados
  │                   └── upsert em sales.*
  │
  └── Sincronização Manual (botão no painel)
                      └── erp-sync-data (Edge Function)
                           ├── adapter.fetchOrders()
                           └── upsert em sales.*
```
