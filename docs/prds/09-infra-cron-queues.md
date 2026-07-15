# PRD 09 — Infraestrutura: Cron Jobs, Filas, Deploy

## Estrutura de Deploy

### Plataformas

| Serviço | Tecnologia |
|---|---|
| Frontend | Vercel (Next.js SSR) |
| Banco de dados | Supabase PostgreSQL + pgmq + pg_cron + pg_net |
| Edge Functions | Supabase Edge Functions (Deno) |
| Domínio | `sellervault.app` (DNS Vercel) |

### Secrets

| Secret | Local | Origem |
|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel + Supabase | Supabase |
| `SUPABASE_DB_URL` | Supabase | Supabase |
| `SUPABASE_PROJECT_REF` | Vercel | Supabase |
| `SUPABASE_ANON_KEY` | Vercel | Supabase |
| `APP_URL` | Supabase (secrets) | Vercel (atualizado manualmente após deploy) |
| `CRYPTO_SECRET` | Supabase (secrets) | Gerado localmente |

## Cron Jobs

Todos os cron jobs são gerenciados via `pg_cron` no Supabase.

### `jobs.trigger_refresh_tokens()`

```
SELECT cron.schedule(
  'refresh-tokens',
  '*/30 * * * *',
  $$SELECT jobs.trigger_refresh_tokens()$$
);
```

**Função:**
1. Seleciona tokens expirados (`expires_at <= now()`), limite 50
2. Para cada token:
   - Busca `client_applications` + `credentials` + `erp_providers`
   - Chama edge function `erp-refresh-token` via `pg_net.http_post()`
3. Retorna contagem de tokens processados

### `jobs.trigger_retry_queue()`

```
SELECT cron.schedule(
  'retry-queue',
  '*/5 * * * *',
  $$SELECT jobs.trigger_retry_queue()$$
);
```

**Função:**
1. Lê da fila `erp_token_retry` (pgmq)
2. Para cada mensagem:
   - Verifica quantidade de `read_ct` (até 3 tentativas)
   - Se <= 3: chama `erp-refresh-token` novamente
   - Se > 3: arquiva mensagem (`pgmq.archive()`)
3. Se sucesso: deleta mensagem (`pgmq.delete()`)

### `jobs.trigger_process_webhook_queue()`

```
SELECT cron.schedule(
  'process-webhook-queue',
  '* * * * *',
  $$SELECT jobs.trigger_process_webhook_queue()$$
);
```

**Função:**
1. Dispara `erp-process-webhook-queue` via `pg_net.http_post()`
2. Worker adquire até 20 itens com `SKIP LOCKED` (máx. 1 por `app_id`)
3. Processa webhooks: `handleWebhook` → `upsertInvoice` → `complete_webhook_invoice`
4. Retry com backoff exponencial (até 5 tentativas → `dead_letter`)

### `jobs.recover_stuck_webhook_invoices()`

```
SELECT cron.schedule(
  'recover-stuck-webhooks',
  '*/10 * * * *',
  $$SELECT jobs.recover_stuck_webhook_invoices()$$
);
```

Reseta itens em `processing` há mais de 10 minutos para `pending`.

### `jobs.trigger_webhook_retry()` (legado pgmq)

```
SELECT cron.schedule(
  'retry-webhook',
  '*/5 * * * *',
  $$SELECT jobs.trigger_webhook_retry()$$
);
```

Fila pgmq legada. O processamento principal usa `jobs.webhook_invoices_queue` com retry nativo.

## Helper Functions

### `jobs.enqueue_retry()`

| Parâmetro | Tipo | Descrição |
|---|---|---|
| `p_queue` | TEXT | Nome da fila pgmq |
| `p_app_id` | UUID | App ID (opcional) |
| `p_error` | TEXT | Mensagem de erro |
| `p_payload` | JSONB | Dados da operação |

**Comportamento:**
- Chama `pgmq.send(p_queue, payload_json)` com retry_delay=300 (5 min)
- Registra log em `integration.audit_logs` com `category: 'queues'` e `event_type: 'queue.enqueued'`

### `jobs.prune_old_logs()`

**Agendamento:** 1º de cada mês (`0 0 1 * *`)

**Ação:** Deleta registros de `core.audit_logs` e `integration.audit_logs` mais antigos que 90 dias.

### `jobs.queue_status` (View)

| Coluna | Tipo | Descrição |
|---|---|---|
| `queue_name` | TEXT | Nome da fila pgmq |
| `msg_count` | BIGINT | Mensagens pendentes |
| `archived_count` | BIGINT | Mensagens arquivadas (falhas) |

## Estrutura de Filas

### Fila Postgres: `jobs.webhook_invoices_queue`

| Status | Descrição |
|---|---|
| `pending` | Aguardando processamento |
| `processing` | Adquirido pelo worker (SKIP LOCKED) |
| `processed` | Pedido persistido em `sales.invoices` |
| `failed` | Falha transitória (retry com backoff) |
| `dead_letter` | Esgotou max_retries (5) |
| `unmapped` | `companyId` sem mapping (reprocessado após OAuth) |

**Cron:** `process-webhook-queue` (1 min) + `recover-stuck-webhooks` (10 min)

### Filas pgmq (retry legado)

| Fila pgmq | Finalidade | Max Retry | Cron |
|---|---|---|---|
| `erp_token_retry` | Retry de refresh de token expirado | 3 | A cada 5 min |
| `erp_webhook_retry` | Retry legado (substituído por webhook_invoices_queue) | 3 | — |
| `erp_sync_retry` | Retry de sync manual | 3 | A cada 5 min |
