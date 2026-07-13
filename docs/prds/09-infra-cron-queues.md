# PRD 09 — Infraestrutura: Cron, Filas e Deploy

## pg_cron — Jobs Agendados

3 jobs configurados via extensão `pg_cron`:

### Job 1: `refresh-tokens`

| Propriedade | Valor |
|---|---|
| Schedule | `*/30 * * * *` (a cada 30 min) |
| Função | `jobs.trigger_refresh_tokens()` |
| Ação | Chama edge function via `net.http_post()` |

```sql
SELECT cron.schedule('refresh-tokens', '*/30 * * * *',
  'SELECT jobs.trigger_refresh_tokens()'
);
```

A função `trigger_refresh_tokens()` usa `pg_net.http_post()` para disparar a edge function de forma assíncrona (não bloqueia o banco).

### Job 2: `process-token-retry`

| Propriedade | Valor |
|---|---|
| Schedule | `*/5 * * * *` (a cada 5 min) |
| Função | `jobs.process_token_retry()` |
| Ação | Lê fila `erp_token_retry` e processa |

### Job 3: `process-sync-retry`

| Propriedade | Valor |
|---|---|
| Schedule | `*/10 * * * *` (a cada 10 min) |
| Função | `jobs.process_sync_retry()` |
| Ação | Lê fila `erp_sync_retry` e processa |

## pgmq — Filas de Retry

3 filas criadas com extensão `pgmq`:

| Fila | Criada por | Max Retry | Cron associado |
|---|---|---|---|
| `erp_token_retry` | `SELECT pgmq.create('erp_token_retry')` | 3 | process-token-retry (5min) |
| `erp_sync_retry` | `SELECT pgmq.create('erp_sync_retry')` | 3 | process-sync-retry (10min) |
| `erp_webhook_retry` | `SELECT pgmq.create('erp_webhook_retry')` | 3 | — (uso futuro) |

### Estrutura da Mensagem

```json
{
  "app_id": "uuid",
  "error": "mensagem de erro",
  "retry_count": 0,
  "payload": { },
  "created_at": "2026-07-13T..."
}
```

### Fluxo de Retry

```
Edge function falha
  └── enqueueRetry('erp_token_retry', appId, error)
       └── pgmq.send('erp_token_retry', message)
            └── pg_cron (5min) → process_token_retry()
                 └── pgmq.read('erp_token_retry', vt=30, limit=1)
                      ├── retry_count < 3 → apaga da fila + log
                      └── retry_count >= 3 → pgmq.archive() + log
```

### Limpeza de Mensagens

- Mensagens com `retry_count >= 3` são arquivadas (não excluídas)
- Arquivo pode ser consultado para auditoria
- Nenhuma mensagem é perdida — sempre logada em `core.audit_logs`

## Helper Functions (Schema `jobs`)

| Função | Descrição |
|---|---|
| `jobs.trigger_refresh_tokens()` | Dispara edge function via `net.http_post()` |
| `jobs.process_token_retry()` | Processa fila de retry de tokens |
| `jobs.process_sync_retry()` | Processa fila de retry de sincronização |
| `jobs.enqueue_retry(queue, app_id, error, payload)` | Enfileira mensagem de retry + log |

## View de Monitoramento

```sql
CREATE VIEW jobs.queue_status AS
SELECT queue_name, pgmq.metrics(queue_name) as metrics
FROM (
  SELECT unnest(ARRAY['erp_token_retry', 'erp_sync_retry', 'erp_webhook_retry']) AS queue_name
) q;
```

Retorna métricas como: `queue_name`, `queue_length`, `newest_msg_age_sec`, `oldest_msg_age_sec`, `total_messages`, `scanned_messages`.

## Rate Limiting

### Bling

| Limite | Valor | Implementação |
|---|---|---|
| Requisições/segundo | 3 req/s | Limitado a 2 req/s (folga) |
| Requisições/dia | 120.000 | — |
| `/oauth/token` | 20 req/min | Limitado a 15 req/min |
| Bloqueio IP | 300 erros/10s → 10min | Evitado pelo retry inteligente |
| Filtro período | Máx 1 ano | Validação no frontend |

### Tiny

| Limite | Valor | Implementação |
|---|---|---|
| Plano Básico/Crescer | 60 req/min | Limitado a 1 req/s |
| Plano Essencial/Evoluir | 120 req/min | — |
| Plano Grande/Potencializar | 240 req/min | — |

### Comportamento em 429

```
throttledFetch()
├── Response 429?
│   ├── Retry-After header? → usa o valor
│   └── Sem header? → backoff: 2s, 4s, 10s (3 tentativas)
├── Network error?
│   └── Espera 1s, 2s, 3s (3 tentativas)
└── Todas falharam?
    └── Throw Error → capturado pela edge → enqueueRetry()
```

## Estrutura de Deploy

### Migrations (10 arquivos)

| # | Arquivo | Conteúdo |
|---|---|---|
| 00 | `init_schemas.sql` | Criar schemas core, integration, sales, products |
| 01 | `core_tables.sql` | profiles, clients, client_analysts, client_users + trigger |
| 02 | `integration_tables.sql` | erp_providers, client_applications, credentials, tokens + seed |
| 03 | `security_rls.sql` | RLS policies, can_access_client(), get_my_role() |
| 04 | `cleanup_old_schemas.sql` | Remover agency_core, erp_integration, sales_data |
| 05 | `sales_tables.sql` | products, invoices, invoice_items + RLS |
| 06 | `audit_logs.sql` | audit_logs + RLS + log_action() |
| 07 | `api_tokens.sql` | api_tokens + RLS |
| 08 | `billing_views.sql` | client_monthly_billing, product_ranking, daily_billing |
| 09 | `cron_and_queues.sql` | pg_net, pgmq queues, pg_cron jobs, helpers |

### Edge Functions (4 functions)

| Function | Endpoint | JWT |
|---|---|---|
| `erp-callback` | `POST/GET /erp-callback` | ❌ |
| `erp-refresh-token` | `POST /erp-refresh-token` | ❌ |
| `erp-webhook` | `POST /erp-webhook` | ❌ |
| `erp-sync-data` | `POST /erp-sync-data` | ❌ |

### Deploy via CLI

```bash
# Migration (aplicar SQL remoto)
supabase db query --linked --file supabase/migrations/arquivo.sql

# Registrar no histórico
supabase migration repair --status applied 20260713000000

# Deploy edge function
supabase functions deploy erp-callback --no-verify-jwt

# Listar functions
supabase functions list
```
