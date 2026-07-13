# PRD 04 — Painel Admin

## Visão Geral

Painel de administração da agência. Acesso restrito a usuários com papel `admin`.

## Funcionalidades

### 1. Gestão de Clientes

**CRUD completo de `core.clients`.**

| Ação | Descrição | Tabela |
|---|---|---|
| Listar | Tabela com todos os clientes, status, integrações ativas | `core.clients` |
| Criar | Formulário: nome, CNPJ, status | INSERT |
| Editar | Alterar dados do cliente | UPDATE |
| Ativar/Desativar | Mudar status entre 'active' e 'inactive' | UPDATE |
| Excluir | Exclusão cascateia para vendas, tokens, etc. | DELETE |

**Campos do formulário:**
- Nome (obrigatório)
- CNPJ (opcional, único)
- Status (active/inactive)

### 2. Gestão de Usuários

**CRUD de `core.profiles` e vínculos.**

| Ação | Descrição |
|---|---|
| Listar | Todos os usuários da agência (admin, leader, analyst) + clientes |
| Criar | Convidar via email, definir papel |
| Editar | Alterar nome ou papel |
| Desativar | Bloquear acesso |

### 3. Gestão de Integrações ERP

**Configuração de conexões com ERPs.**

| Ação | Descrição |
|---|---|
| Listar integrações | Todas as `client_applications` com status |
| Configurar credenciais | Inserir Client ID e Client Secret do ERP |
| Iniciar OAuth | Gerar URL de autorização e redirecionar |
| Desconectar | Revogar tokens e marcar como inativo |
| Sincronizar manualmente | Disparar `erp-sync-data` |

**Fluxo de conexão Bling:**
1. Admin insere Client ID + Client Secret (fornecidos pelo cliente)
2. Clica em "Conectar Bling"
3. É redirecionado para autenticação no Bling
4. Bling redireciona de volta → `erp-callback` processa e salva tokens

**Fluxo de conexão Tiny:**
1. Admin insere Client ID + Client Secret + Redirect URL (fornecidos pelo Tiny)
2. Clica em "Conectar Tiny"
3. Redirecionado para Keycloak do Tiny
4. Tiny redireciona de volta → `erp-callback` processa e salva tokens

### 4. Tokens de API (M2M)

**Gestão de `core.api_tokens` para autenticação machine-to-machine.**

| Ação | Descrição |
|---|---|
| Criar token | Gerar novo token para um cliente |
| Revogar | Invalidar token imediatamente |
| Listar | Ver todos os tokens com prefixo, status, último uso |

### 5. Auditoria

**Visualização de `core.audit_logs`.**

| Coluna | Descrição |
|---|---|
| Data/Hora | Timestamp do evento |
| Usuário | Quem executou |
| Ação | Tipo de ação |
| Entidade | O que foi afetado |
| Detalhes | Payload JSON |

**Filtros:**
- Por período
- Por ação
- Por usuário
- Por entidade

### 6. Monitoramento de Filas

**Visualização de `jobs.queue_status`.**

| Métrica | Descrição |
|---|---|
| Queue | Nome da fila pgmq |
| Messages | Mensagens pendentes |
| Archived | Mensagens arquivadas (após max retry) |

## API Calls

| Ação | Edge Function / Supabase |
|---|---|
| CRUD clientes | Supabase Table API (RLS) |
| CRUD usuários | Supabase Auth Admin API |
| Conectar ERP | `GET /erp-callback?action=authorize` |
| Sincronizar | POST `erp-sync-data` |
| Auditoria | `SELECT * FROM core.audit_logs` |
| Filas | View `jobs.queue_status` |
