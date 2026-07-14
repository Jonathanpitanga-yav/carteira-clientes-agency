# PRD 03 — Edge Functions

## Visão Geral

Todas as edge functions são escritas em **Deno/TypeScript** e compartilham:
- `shared/adapters/` — Adapter pattern para ERPs
- `shared/db.ts` — Helpers de banco (getClient, upsertInvoice, enqueueRetry, createAuditLog, CORS)
- `shared/utils/` — Utilitários (rate-limiter, crypto)

## Functions

### `erp-callback`

**Propósito:** Gerenciar o fluxo OAuth2 dos ERPs.

**Endpoints:**

| Método | Path | Descrição |
|---|---|---|
| GET | `/erp-callback?action=authorize&app_id=x&provider=bling` | Retorna URL de autorização (JSON) |
| GET | `/erp-callback?code=X&state=Y` | Callback OAuth → 302 redirect para frontend |

**Fluxo OAuth (autorização):**
1. Frontend chama `GET ?action=authorize&app_id=X&provider=bling`
2. Edge function valida app + credenciais no banco
3. Retorna JSON `{ authUrl }` com URL de autorização do ERP
4. Frontend abre popup com essa URL

**Fluxo OAuth (callback):**
1. ERP redireciona para `/erp-callback?code=X&state=APP_ID`
2. Edge function:
   - Busca app + provider + credentials pelo `state` (app_id)
   - `adapter.exchangeCodeForToken(code, redirectUri, credentials)`
   - `saveTokens()` → upsert em `integration.tokens`
   - Atualiza `client_applications.status = 'active'`
   - Redireciona (302) para `{APP_URL}/auth/oauth-callback?erp_callback=success&app_id=...`
3. Em caso de erro: redirect para `{APP_URL}/auth/oauth-callback?erp_callback=error&message=...`

**Callback URL:** `https://{project}.supabase.co/functions/v1/erp-callback` (força HTTPS + caminho completo)

**Auditoria:** Cada etapa do fluxo registra log em `integration.audit_logs` com `category: "credentials"`.

---

### `erp-refresh-token`

**Propósito:** Renovar tokens prestes a expirar. Suporta batch (cron) e app única (manual).

**Gatilho:** `pg_cron` a cada 30 minutos via `jobs.trigger_refresh_tokens()`.

**Modos de operação:**

| Modo | Chamada | Comportamento |
|---|---|---|
| Batch | GET (cron) ou POST sem body | Busca tokens com `expires_at ≤ now + 31min` (antecipa 30 min), limite 50 |
| Single | POST com `{ appId }` | Renova token de uma app específica (refresh manual) |

**Fluxo (batch):**
1. Busca tokens com `expires_at ≤ now + 31min` (antecipa vencimento, evita janela sem token)
2. Para cada token:
   - Busca `client_applications` + `credentials` + `erp_providers` separadamente (sem FK joins)
   - Obtém o adapter pelo `provider.name`
   - `adapter.refreshToken(refreshToken, credentials)`
   - `saveTokens()` — salva novo token + loga `tokens.updated`
   - Em caso de erro → `enqueueRetry('erp_token_retry')` + marca app como 'error'
3. Ao final: registra `refresh_batch_complete` em audit_logs

**Fluxo (single):**
1. Busca token da `appId` específica
2. Mesmo fluxo de refresh do batch
3. Retorna resultado individual

**Auditoria:** Cada token processado registra log em `integration.audit_logs` com `category: "credentials"`.
Eventos: `refresh_single_start`, `refresh_single_complete`, `refresh_batch_start`, `refresh_batch_complete`.

---

### `erp-webhook`

**Propósito:** Receber dados em tempo real dos ERPs.

**Headers obrigatórios:**
| Header | Descrição |
|---|---|
| `x-erp-provider` | Nome do provedor (ex: 'bling', 'tiny') |
| `x-app-id` | UUID da aplicação no sistema |

**Fluxo:**
1. Lê headers `x-erp-provider` e `x-app-id`
2. Obtém adapter e chama `adapter.handleWebhook(payload, headers)`
3. Normaliza evento → `ERPOrder`
4. `upsertInvoice()`, `upsertInvoiceItems()`, `upsertProduct()`
5. Retorna `{ success, eventType, invoiceId, itemsCount }`

---

### `erp-sync-data`

**Propósito:** Sincronização manual de dados históricos.

**Gatilho:** Chamada HTTP via botão no frontend.

**Body:**
```json
{
  "appId": "uuid",
  "fromDate": "2026-01-01",
  "toDate": "2026-07-13"
}
```

**Fluxo:**
1. Valida `appId` e status da aplicação
2. `adapter.fetchOrders(accessToken, { fromDate, toDate })`
3. Itera páginas (100 por página)
4. Para cada pedido: `upsertInvoice()`, `upsertInvoiceItems()`, `upsertProduct()`
5. Em caso de erro por pedido: `enqueueRetry('erp_sync_retry')` + loga `queue.enqueued`
6. Retorna `{ syncedOrders, errors }`

---

## Shared Utils

### `shared/db.ts`

| Função | Descrição |
|---|---|
| `getClient(req)` | Cria cliente Supabase com service_role |
| `getIntegrationClient(req)` | Cria cliente no schema `integration` |
| `getCoreClient(req)` | Cria cliente no schema `core` |
| `getSalesClient(req)` | Cria cliente no schema `sales` |
| `getAppCredentials(appId)` | Busca app + provider + credentials + tokens (queries separadas, sem FK joins) |
| `saveTokens(appId, access, refresh, expires, raw)` | Upsert tokens + loga `tokens.created` ou `tokens.updated` |
| `createAuditLog(event, appId, provider, metadata, options)` | Insere log em `integration.audit_logs` com suporte a `actorId`, `category`, `erpErrorCode` |
| `upsertInvoice(clientId, appId, order)` | Insert ou update de fatura |
| `upsertInvoiceItems(invoiceId, items)` | Insert de itens da fatura |
| `upsertProduct(clientId, appId, item)` | Insert de produto (se não existir) |
| `enqueueRetry(queue, appId, error, payload)` | Enfileira mensagem de retry no pgmq + loga `queue.enqueued` em audit_logs |
| `handleCors(req)` | Intercepta OPTIONS, retorna CORS headers |
| `jsonResponse(data, status)` | Response JSON padronizado |

### `shared/utils/rate-limiter.ts`

**`throttledFetch(url, options, provider, isTokenEndpoint?)`**

- Rate limit por provedor: Bling (2 req/s), Tiny (1 req/s)
- Token endpoint: limite extra de 15 req/min
- Em 429: lê `Retry-After` ou backoff exponencial (2s, 4s, 10s)
- 3 tentativas máximas antes de lançar erro

### `shared/utils/crypto.ts`

Criptografia AES-GCM para tokens armazenados no banco.

| Função | Descrição |
|---|---|
| `encrypt(text, secret)` | Criptografa string → Base64 |
| `decrypt(encryptedBase64, secret)` | Decriptografa Base64 → string |

---

## Adapters

### `shared/adapters/base.ts`

```typescript
interface IERPAdapter {
  name: string;
  getAuthUrl(clientId, redirectUri, state): string;
  exchangeCodeForToken(code, redirectUri, credentials): ERPTokenResponse;
  refreshToken(refreshToken, credentials): ERPTokenResponse;
  fetchOrders(accessToken, options): { orders: ERPOrder[], hasMore: boolean };
  handleWebhook(payload, headers): { eventType, data: ERPOrder };
}
```

### BlingAdapter

| Aspecto | Detalhe |
|---|---|
| Auth Type | OAuth2 (Basic Auth) |
| Auth URL | `https://www.bling.com.br/Api/v3/oauth/authorize` |
| Token URL | `https://www.bling.com.br/Api/v3/oauth/token` |
| Orders API | `GET /Api/v3/pedidos/vendas` |
| Paginação | `pagina` + `limite` (max 100) |
| Rate Limit | 3 req/s, 120k req/dia, 20 req/min `/oauth/token` |

### TinyAdapter

| Aspecto | Detalhe |
|---|---|
| Auth Type | OpenID Connect (Keycloak) |
| Auth URL | `https://accounts.tiny.com.br/realms/tiny/protocol/openid-connect/auth` |
| Token URL | `https://accounts.tiny.com.br/realms/tiny/protocol/openid-connect/token` |
| Scope | `openid` |
| Orders API | `GET /public-api/v3/pedidos` |
| Paginação | `limit` + `offset` (max 100) |
| Rate Limit | 60-240 req/min (por plano) |
| Token Expiry | Access: 4h, Refresh: 1 dia |
