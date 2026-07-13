# PRD 08 — Fluxos ERP

## Visão Geral

Cada ERP possui um adapter que implementa a interface `IERPAdapter`. O sistema roteia chamadas para o adapter correto via `registry.ts`.

## Fluxo de Autorização OAuth2

### Bling

```
[Admin] → Insere Client ID + Secret no painel
        → Clica "Conectar Bling"
        → Frontend chama GET /erp-callback?action=authorize&app_id=X&provider=bling
        → Adapter.getAuthUrl() → URL de autorização
        → Redireciona para: https://www.bling.com.br/Api/v3/oauth/authorize
        → Usuário autoriza no Bling
        → Bling redireciona para: /erp-callback?code=XYZ&state=APP_ID
        → Adapter.exchangeCodeForToken() → Basic Auth (clientId:secret base64)
        → Retorna: { access_token, refresh_token, expires_in }
        → saveTokens() em integration.tokens
        → client_applications.status = 'active'
```

**Detalhes Bling:**
- Authorization: Basic base64(client_id:client_secret)
- Code expira em 1 minuto
- Access token: sem expiração pública definida
- Refresh token: 30 dias
- Refresh usa mesmo endpoint `/oauth/token` com `grant_type=refresh_token`

### Tiny (OpenID Connect / Keycloak)

```
[Admin] → Insere Client ID + Secret do Tiny
        → Clica "Conectar Tiny"
        → Frontend chama GET /erp-callback?action=authorize&app_id=X&provider=tiny
        → Adapter.getAuthUrl() → URL de autorização
        → Redireciona para: https://accounts.tiny.com.br/realms/tiny/protocol/openid-connect/auth
        → Usuário autoriza no Tiny
        → Tiny redireciona para: /erp-callback?code=XYZ&state=APP_ID
        → Adapter.exchangeCodeForToken() → POST com client_id + client_secret no body
        → Retorna: { access_token, refresh_token, expires_in }
        → saveTokens() em integration.tokens
        -> client_applications.status = 'active'
```

**Detalhes Tiny:**
- Scope obrigatório: `openid`
- Access token expira em 4 horas
- Refresh token expira em 1 dia
- Autenticação: client_id + client_secret no body da requisição (não Basic Auth)

## Fluxo de Sincronização de Dados

### Webhook (Tempo Real)

```
ERP → POST /erp-webhook
     Headers: x-erp-provider, x-app-id
     Body: payload do ERP

1. adapter.handleWebhook(payload, headers)
2. Normaliza para ERPOrder
3. upsertInvoice(client_id, app_id, order)
4. upsertInvoiceItems(invoiceId, order.items)
5. upsertProduct(client_id, app_id, item)
6. Retorna { success, eventType, invoiceId, itemsCount }
```

### Sincronização Manual (Pull)

```
Frontend → POST /erp-sync-data
           Body: { appId, fromDate?, toDate? }

1. Valida appId e status
2. adapter.fetchOrders(accessToken, { fromDate, toDate })
3. Para cada página:
   3.1 Para cada pedido:
       - upsertInvoice
       - upsertInvoiceItems
       - upsertProduct
   3.2 Próxima página (hasMore)

Em caso de erro:
- Por pedido → enqueueRetry('erp_sync_retry')
- Por página → enqueueRetry + break
```

### Refresh de Token (Cron)

```
pg_cron (a cada 30 min) → jobs.trigger_refresh_tokens()
                        → pg_net.http_post() → erp-refresh-token

1. Busca tokens expirados (LIMIT 50)
2. Para cada token com refresh_token válido:
   - adapter.refreshToken()
   - saveTokens()
   - client_applications.status = 'active'
3. Se falhar:
   - enqueueRetry('erp_token_retry')
   - client_applications.status = 'error'
```

## Estrutura dos Adapters

### `shared/adapters/`

```
adapters/
├── base.ts          → Interface IERPAdapter + tipos (ERPOrder, ERPTokenResponse)
├── bling.ts         → BlingAdapter (OAuth2, API v3)
├── tiny.ts          → TinyAdapter (OpenID Connect, API v3)
└── registry.ts      → Registro central (getAdapter('bling') → BlingAdapter)
```

### Para adicionar um novo ERP:

1. Criar `novo-erp.ts` implementando `IERPAdapter`
2. Registrar em `registry.ts`
3. Adicionar seed em `integration.erp_providers`
4. Testar o fluxo OAuth e fetchOrders

## Mapeamento de Status

### Bling → Sistema

| Bling | Sistema |
|---|---|
| 0 (Pendente) | pending |
| 1 (Aprovado) | approved |
| 2 (Cancelado) | canceled |
| 3 (Devolvido) | refunded |
| 9 (Em andamento) | pending |

### Tiny → Sistema

| Tiny | Sistema |
|---|---|
| 0 (Aberta) | pending |
| 3 (Aprovada) | approved |
| 1 (Faturada) | approved |
| 4 (Preparando Envio) | approved |
| 5 (Enviada) | approved |
| 6 (Entregue) | approved |
| 7 (Pronto Envio) | approved |
| 2 (Cancelada) | canceled |
| 8 (Dados Incompletos) | pending |
| 9 (Não Entregue) | pending |
