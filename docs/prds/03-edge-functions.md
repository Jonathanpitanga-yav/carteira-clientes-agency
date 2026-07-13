# PRD 03 — Edge Functions

## Visão Geral

Todas as edge functions são escritas em **Deno/TypeScript** e compartilham:
- `shared/adapters/` — Adapter pattern para ERPs
- `shared/db.ts` — Helpers de banco (getClient, upsertInvoice, enqueueRetry, CORS)
- `shared/utils/` — Utilitários (rate-limiter, crypto)

## Functions

### `erp-callback`

**Propósito:** Gerenciar o fluxo OAuth2 dos ERPs.

**Endpoints:**

| Método | Path | Descrição |
|---|---|---|
| GET | `/erp-callback` | Callback OAuth (recebe code + state) |
| GET | `/erp-callback?action=authorize&app_id=x&provider=bling` | Retorna URL de autorização |

**Fluxo OAuth:**
1. Frontend solicita URL de autorização → `GET ?action=authorize`
2. Redireciona usuário para o ERP (Bling ou Tiny)
3. Usuário autoriza → ERP redireciona para `/erp-callback?code=X&state=Y`
4. Lê `integration.credentials` pelo `app_id` (state)
5. `adapter.exchangeCodeForToken(code, redirectUri, credentials)`
6. Salva tokens em `integration.tokens` com `saveTokens()`
7. Atualiza `client_applications.status = 'active'`

**Headers esperados:** Nenhum específico.

---

### `erp-refresh-token`

**Propósito:** Renovar tokens expirados em lote.

**Gatilho:** `pg_cron` a cada 30 minutos via `jobs.trigger_refresh_tokens()`.

**Fluxo:**
1. Busca tokens com `expires_at <= now()` ou `expires_at IS NULL` (limite 50)
2. Para cada token:
   - Obtém o adapter pelo `provider.name`
   - `adapter.refreshToken(refreshToken, credentials)`
   - Salva novo token
   - Em caso de erro → `enqueueRetry('erp_token_retry')` + marca app como 'error'

**Rate Limit:** Tokens endpoint respeita limite de 15 req/min (Bling).

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
5. Em caso de erro por pedido: `enqueueRetry('erp_sync_retry')`
6. Retorna `{ syncedOrders, errors }`

---

## Shared Utils

### `shared/db.ts`

| Função | Descrição |
|---|---|
| `getClient(req)` | Cria cliente Supabase com service_role |
| `getAppCredentials(appId)` | Busca app + provider + credentials + tokens |
| `saveTokens(appId, access, refresh, expires, raw)` | Upsert tokens na tabela |
| `upsertInvoice(clientId, appId, order)` | Insert ou update de fatura |
| `upsertInvoiceItems(invoiceId, items)` | Insert de itens da fatura |
| `upsertProduct(clientId, appId, item)` | Insert de produto (se não existir) |
| `enqueueRetry(supabase, queue, appId, error, payload)` | Enfileira mensagem de retry no pgmq |
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
