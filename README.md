# Carteira de Clientes Agency

Sistema de gestão de carteira de clientes com integração a múltiplos ERPs via padrão Adapter.

## Estrutura do Projeto

```
seller-wallet/
├── CORE_OBJECTIVE.md              # Documento de visão central do sistema
├── supabase/
│   ├── config.toml                # Configuração do projeto Supabase
    │   ├── migrations/            # Migrations SQL versionadas (10 arquivos)
│   └── functions/                 # Edge Functions (Deno/TypeScript)
│       ├── erp-callback/          # Callback OAuth para ERPs
│       ├── erp-refresh-token/     # Renovação automática de tokens (cron)
│       ├── erp-webhook/           # Webhook para dados em tempo real
│       ├── erp-sync-data/         # Sincronização manual sob demanda
│       └── shared/
│           ├── adapters/          # Padrão Adapter para ERPs
│           │   ├── base.ts        # Interface IERPAdapter + tipos
│           │   ├── bling.ts       # Bling ERP (OAuth2)
│           │   ├── tiny.ts        # Tiny ERP (API Key)
│           │   └── registry.ts    # Registro central de adapters
│           ├── db.ts              # Helper de banco compartilhado
│           └── utils/
│               ├── crypto.ts      # Criptografia AES-GCM
│               └── crypto_test.ts # Teste de criptografia
```

## Schemas do Banco (Monólito Modular)

| Schema | Tabelas | Descrição |
|---|---|---|
| `core` | profiles, clients, client_analysts, client_users, audit_logs, api_tokens | Perfis, clientes, vínculos, auditoria, tokens M2M |
| `integration` | erp_providers, client_applications, credentials, tokens | Conexões com ERPs |
| `sales` | products, invoices, invoice_items + 3 views | Faturamento e vendas |
| `products` | _(reservado)_ | Catálogo de produtos |
| `jobs` | funções + views pg_cron/pgmq | Cron jobs e filas de retry |

## Edge Functions

| Function | JWT | Gatilho | Descrição |
|---|---|---|---|
| `erp-callback` | ❌ | HTTP (redirect OAuth) | Troca code por access_token + salva no DB |
| `erp-refresh-token` | ❌ | `pg_cron` (30 min) | Renova tokens expirados em lote + enfileira retries |
| `erp-webhook` | ❌ | HTTP (POST externo) | Recebe dados em tempo real dos ERPs |
| `erp-sync-data` | ❌ | HTTP (manual) | Sincroniza dados históricos sob demanda |

## Cron Jobs (pg_cron)

| Job | Schedule | Função |
|---|---|---|
| `refresh-tokens` | `*/30 * * * *` | Dispara `erp-refresh-token` via `pg_net.http_post()` |
| `process-token-retry` | `*/5 * * * *` | Processa fila de retry de tokens com até 3 tentativas |
| `process-sync-retry` | `*/10 * * * *` | Processa fila de retry de sincronização |

## Filas de Retry (pgmq)

| Fila | Uso | Max Retry |
|---|---|---|
| `erp_token_retry` | Tokens que falharam renovação | 3 tentativas |
| `erp_sync_retry` | Pedidos que falharam sincronização | 3 tentativas |
| `erp_webhook_retry` | Webhooks que falharam processamento | 3 tentativas |

## Rate Limiting

| ERP | Limite | Implementação |
|---|---|---|
| Bling | 3 req/s, 20 req/min `/oauth/token` | `throttledFetch` com 2 req/s + retry 429 |
| Tiny | 60-240 req/min (por plano) | `throttledFetch` com 1 req/s + retry 429 |

## Adapter Pattern

```
IERPAdapter (interface)
├── BlingAdapter      — OAuth2, API v3 (Basic Auth)
├── TinyAdapter       — OpenID Connect / Keycloak (OAuth2)
└── (fácil adicionar novos)
```

Métodos: `getAuthUrl` | `exchangeCodeForToken` | `refreshToken` | `fetchOrders` | `handleWebhook`

## ERPs Suportados

| ERP | Tipo Auth | Auth URL | Status |
|---|---|---|---|
| Bling | OAuth2 | `bling.com.br/Api/v3/oauth/authorize` | ✅ |
| Tiny | OpenID Connect | `accounts.tiny.com.br/realms/tiny/protocol/openid-connect/auth` | ✅ |
| Anymarket | API Key | — | 🔜 Pendente |

## Extensões PostgreSQL Ativas

| Extensão | Versão | Uso |
|---|---|---|
| `pg_cron` | 1.6.4 | Agendamento de jobs |
| `pgmq` | 1.5.1 | Filas de retry |
| `pg_net` | 0.20.3 | Chamadas HTTP assíncronas do banco |
| `pgcrypto` | 1.3 | Criptografia de tokens |

## Conexão Supabase

- **Project Ref**: `tnbruzzlgissagxsqrge`
- **Região**: `ca-central-1`
- **Versão Postgres**: `17.6.1.141`
