# PRD 04 — Painel Admin

## Visão Geral

Painel de administração da agência. Acesso restrito a usuários com papel `admin`.

## Sidebar

A sidebar utiliza accordions para agrupar itens relacionados:

| Accordion | Itens |
|---|---|
| Integrações | Central de Aplicativos, Aplicativos Conectados |
| Auditoria e Filas | Histórico de Atividades, Logs de Auditoria, Filas de Retry |

Cada accordion mantém seu estado de aberto/fechado independentemente.

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

### 2. Gestão de Usuários

**CRUD de `core.profiles` e vínculos.**

| Ação | Descrição |
|---|---|
| Listar | Todos os usuários da agência (admin, leader, analyst) + clientes |
| Criar | Convidar via email, definir papel |
| Editar | Alterar nome ou papel |
| Desativar | Bloquear acesso |

### 3. Central de Aplicativos (Integrações ERP)

**Catálogo de ERPs disponíveis, com suporte a multi-conexão.**

| Funcionalidade | Descrição |
|---|---|
| Listar ERPs | Cards com Bling, Tiny, Anymarket |
| Conectar | Botão "Conectar" sempre visível por ERP |
| Badge de conexões | Mostra "2 conectados" se houver múltiplas |
| Lista de clientes | Abaixo de cada ERP, lista de clientes conectados com status individual |

**Fluxo de conexão (OAuth2):**
1. Admin clica "Conectar" no ERP desejado
2. Dialog solicita Client ID + Client Secret (fornecidos pelo cliente)
3. Admin insere nome do cliente e confirma
4. `useCreateIntegrationClient()` cria cliente + app (status "pending") + salva credentials
5. `useGetAuthUrl()` → edge function `erp-callback?action=authorize` → retorna `{ authUrl }`
6. Frontend abre popup com auth URL do ERP
7. Usuário autoriza → ERP redireciona para edge function
8. Edge function troca code por token, salva, redireciona (302) para `/auth/oauth-callback`
9. Popup envia `postMessage` para janela principal e fecha
10. Janela principal exibe toast de sucesso

### 4. Aplicativos Conectados

**Tabela de todos os `client_applications` com status e token.**

| Coluna | Descrição |
|---|---|
| Cliente | Nome do cliente |
| ERP | Nome do provedor + badge OAuth2/API Key |
| Status | Badge colorido: Ativo (verde), Expirado (laranja), Erro (vermelho), Pendente (cinza) |
| Token | Tempo restante: `2d 5h` ou `3h` (dias + horas, nunca apenas dias) |
| Conectado desde | Data de criação formatada pt-BR |
| Ações | Desativar (delete) |

**Cores do token:**
- Verde (`text-emerald-600`): token válido
- Laranja (`text-orange-500`): expirado
- Vermelho (`text-red-500`): sem token

Sem botões de sync ou refresh (segurança — apenas edge functions gerenciam renovação).

### 5. Tokens de API (M2M)

**Gestão de `core.api_tokens` para autenticação machine-to-machine.**

| Ação | Descrição |
|---|---|
| Criar token | Gerar novo token para um cliente |
| Revogar | Invalidar token imediatamente |
| Listar | Ver todos os tokens com prefixo, status, último uso |

### 6. Histórico de Atividades

**Visão unificada de `integration.audit_logs` com 3 categorias.**

| Categoria | Cor (Badge) | Eventos incluídos |
|---|---|---|
| Credenciais | Secondary | Criação/atualização/expiração de tokens, fluxo OAuth, refresh automático |
| Acesso e Permissões | Default | (futuro) Habilitação/desabilitação de analistas, tentativas de acesso negado |
| Filas e Sincronização | Outline | Início/fim de cargas, falhas de comunicação, rate limit estourado |

**Filtros:**
- Por categoria (dropdown)
- Por tipo de evento (dropdown)
- Por data início

**Colunas:** Data, Categoria (badge), Evento (`<code>`), Detalhes (ERP, erro, payload preview)

### 7. Logs de Auditoria

**Visualização de `core.audit_logs` (sistema).**

| Coluna | Descrição |
|---|---|
| Data/Hora | Timestamp do evento |
| Ação | Tipo de ação |
| Entidade | O que foi afetado |
| Detalhes | Payload JSON truncado (60 chars) |

**Filtros:**
- Por período
- Por ação
- Por entidade

### 8. Monitoramento de Filas

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
| Histórico de Atividades | `SELECT * FROM integration.audit_logs` |
| Auditoria | `SELECT * FROM core.audit_logs` |
| Filas | View `jobs.queue_status` |
