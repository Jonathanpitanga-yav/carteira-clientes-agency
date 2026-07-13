---
name: yav-earth-manager
description: >
  Sistema Nervoso Central da Operação YAV no LiveSEO Earth. Gerencia, padroniza,
  audita, diagnostica e alerta em tempo real. Serve do assistente ao CEO:
  (1) Criar tarefas com quality gates automáticos e detecção anti-duplicidade;
  (2) Auditar projetos — score de qualidade, naming, descrições, órfãos, recorrências;
  (3) Corrigir em lote com confirmação;
  (4) Gerenciar recorrências com auto-detecção de padrões manuais;
  (5) Diagnóstico Executivo — varre TODOS os projetos, calcula score geral YAV,
  destaca alertas, gargalos e quick wins para o CEO;
  (6) Radar de Riscos — antecede problemas antes de virarem crise.
  SEMPRE usar quando o usuário mencionar Earth, LiveSEO, liveseo, task, tarefa,
  subtask, kanban, estratégia, projeto, auditoria, recorrência, calendário de tarefas,
  painel YAV, saúde dos projetos, diagnóstico de projetos, criar tarefa no Earth,
  gerenciar projeto no Earth, ou pedir para organizar/padronizar algo no LiveSEO Earth.
  Esta skill SUBSTITUI a antiga yav-project-manager.
  Entrada: código do projeto (ex: YD101) ou nome do cliente. Saída: tarefas criadas/auditadas
  no Earth + relatório markdown. Usa MCP liveseo-earth-mcp. Todos os campos ficam
  visíveis ao cliente — qualidade é contrato.
---

# yav-earth-manager 🪐 — Sistema Nervoso Central da Operação YAV

Gerencia projetos no LiveSEO Earth com o DNA de operação da YAV Digital. Tudo que é criado aqui o cliente vê — então cada tarefa precisa ser clara, estruturada e executável sem dúvidas.

Serve **do assistente ao CEO**. A skill infere o nível de profundidade pelo que o usuário pede.

---

## Índice
1. [Pré-requisitos](#pré-requisitos)
2. [Filosofia Operacional YAV](#filosofia-operacional-yav)
3. [Como a Skill se Adapta](#como-a-skill-se-adapta)
4. [Padrão de Nomenclatura](#padrão-de-nomenclatura)
5. [Template de Descrição](#template-de-descrição)
6. [Regras de Prioridade, Executor, Deadline, Tag](#regras)
7. [Regra Universal: Confirmação Obrigatória](#regra-universal-confirmação-obrigatória)
8. [Quality Gates](#quality-gates)
9. [Memória de Contexto do Projeto](#memória-de-contexto-do-projeto)
10. [Modo 0: Detectar Natureza da Tarefa](#modo-0-detectar-natureza-da-tarefa)
11. [Modo 1: Criar Tarefa 🆕](#modo-1-criar-tarefa)
12. [Modo 2: Auditar Projeto 🔍](#modo-2-auditar-projeto)
13. [Modo 3: Corrigir em Lote 🛠️](#modo-3-corrigir-em-lote)
14. [Modo 4: Gerenciar Recorrências 🔄](#modo-4-gerenciar-recorrências)
15. [Modo 5: Diagnóstico Executivo 🧠](#modo-5-diagnóstico-executivo)
16. [Modo 6: Radar de Riscos 🚨](#modo-6-radar-de-riscos)
17. [Regras de Comunicação](#regras-de-comunicação)
18. [MCP Tools](#mcp-tools)
19. [Skills Relacionadas](#skills-relacionadas)

---

## Pré-requisitos

- MCP **liveseo-earth-mcp** ativo e configurado
- Antes de qualquer operação, use `get_projects_list` para descobrir o `projectCode` se o usuário não informou o código
- Para projetos sem dados completos (descrições, etc), use `get_subtask_by_id` para detalhar

---

## Filosofia Operacional YAV

- **Cliente vê TUDO.** Cada descrição, comentário, nota interna — o cliente tem acesso. Qualidade é contrato.
- **"Não entregamos PDF. Entregamos OPERAÇÃO."** Tarefa no Earth = execução, não intenção.
- **Padronização liberta.** Quando tudo segue o mesmo padrão, qualquer pessoa cobre qualquer projeto sem curva de aprendizado.
- **Recorrência não é exceção, é regra.** Se repetiu uma vez, registre como recorrência.
- **Dados de 16 projetos reais embasam esta skill.** Foram auditados ~2.500+ tarefas para identificar 17 cenários de melhoria.

---

## Como a Skill se Adapta

Esta skill serve qualquer pessoa — **do assistente ao CEO**. Ela infere o nível pelo pedido:

| Se você disser... | A skill age como... | Comportamento |
|-------------------|---------------------|---------------|
| *"cria uma tarefa de cadastro de produtos"* | 🟢 Operacional | Pede detalhes, aplica padrões, pergunta recorrência |
| *"audita o projeto", "corrige as prioridades"* | 🔴 Gestão | Auditoria, score, sugere correções |
| *"como está a operação?", "saúde dos projetos"* | 🧠 **CEO** | Varre TODOS os projetos, score geral, alertas estratégicos, quick wins |

---

## Padrão de Nomenclatura

Toda tarefa deve seguir:

```
[Canal / Pilar] Ação com verbo no infinitivo + Objeto + Contexto (opcional)
```

### Exemplos

| Certo ✅ | Errado ❌ |
|----------|-----------|
| `[Mercado Livre] Cadastrar 50 SKUs da linha ShockLight` | `Cadastro ML` |
| `[Shopee] Criar campanha de Dia dos Namorados - Junho` | `Campanha` |
| `[Geral] Reporte Mensal de Vendas - Maio/26` | `Report Semanal` |
| `[Marketing] Elaborar calendário de campanhas - Julho` | `Calendário` |
| `[ERP] Validar integração de pedidos entre VTEX e Bling` | `Integração` |
| `[Analytics] Configurar eventos de conversão no GTM` | `Tags` |

### Regras

- **Sempre** começar com `[Canal/Pilar]`. Canais padrão: `Mercado Livre`, `Shopee`, `Amazon`, `TikTok Shop`, `Magazine Luiza`, `RD`, `Ifood`, `Rappi`, `Geral`, `Marketing`, `ERP`, `Analytics`, `Site`, `Design`, `Ads`, `Estoque`, `Logística`, `Integração`, `Financeiro`, `ERP`, `Full`
- **Sempre** usar verbo no infinitivo
- **Nunca** nomes genéricos: `Fluxos`, `Selo`, `Item`, `Ajustes`, `Melhorias`, `Amazon`, `Shopee` (sozinhos)
- Se for recorrente, incluir referência temporal: `- Junho`, `- 22.07`, `- 2026-07`
- **Case consistente no prefixo:** `[Amazon]` e `[Shopee]` (capitalizados), nunca `[AMAZON]` nem `[tiktok]`

### Nomes proibidos detectados em auditoria real

| Nome proibido | Por quê | Sugestão |
|---------------|---------|----------|
| `Amazon` (sozinho) | Não diz a ação | `[Amazon] Cadastrar produtos X` |
| `Shopee`, `Estoque`, `ADs` | Idem | Sempre com `[Canal]` + verbo |
| `Fluxos`, `Selo`, `Item` | Genérico demais | Adicionar contexto |
| `Diagnostico`, `Simulador` | Sem ação definida | Objeto + resultado esperado |
| `Proximos passos` | Vago | Listar os passos no nome |

---

## Template de Descrição

Toda tarefa **DEVE** ter descrição. A descrição é o que permite qualquer pessoa executar sem depender do criador.

### Template Obrigatório

```markdown
## Objetivo
[Por que essa tarefa existe? Qual o resultado esperado?]

## O que precisa ser feito
[Passo a passo claro. Numerar se ajudar.]

## Critérios de Aceite (DoD)
- [ ] [Condição 1 para considerar concluído]
- [ ] [Condição 2]
- [ ] [Condição 3]

## Canais / Sistemas envolvidos
[Canais, plataformas, sistemas: Mercado Livre, Shopee, VTEX, Tiny, Bling, Anymarket...]

## Referências
- [Links úteis: planilhas, contratos, documentos, prints]
```

### Exemplo Real

```markdown
## Objetivo
Criar calendário de campanhas promocionais de Julho na Shopee para garantir que todas as datas comerciais do mês estejam programadas com antecedência.

## O que precisa ser feito
1. Revisar o calendário comercial de Julho
2. Mapear produtos elegíveis para cada campanha
3. Criar as Flash Sales no painel Shopee
4. Programar cupons e ações promocionais

## Critérios de Aceite (DoD)
- [ ] Calendário de Julho completo e aprovado pelo cliente
- [ ] Flash Sales criadas e agendadas na Shopee
- [ ] Cupons programados

## Canais / Sistemas envolvidos
Shopee, Anymarket

## Referências
- Calendário comercial 2026: [link]
- Planilha de margens: [link]
```

---

## Regras

### Prioridade

| Valor | Nome | Quando usar |
|-------|------|-------------|
| `1` | Alta | Bloqueante, urgente, impacto imediato em vendas, prazo apertado, impedimento de operação |
| `2` | Média | Normal, prazo definido mas folgado, melhoria com deadline (padrão se não informado) |
| `3` | Baixa | Melhoria contínua, sem prazo, estudo, análise exploratória |

### Executor

| Valor | Quando usar |
|-------|-------------|
| `YAV_DIGITAL` | Tarefas operacionais do time YAV (padrão) |
| `liveSEO` | Tarefas de SEO técnico, configuração de plataforma |
| `PROJETOS` | Tarefas de implantação, configuração de e-commerce |
| `AGENCIA_FRONTEND` | Tarefas que dependem da agência de layout/front |
| `AGENCIA_MARKETING` | Tarefas com agência de marketing/conteúdo |
| `DESIGN` | Criação de artes, banners, material visual |
| `BACKOFFICE` | Tarefas de backoffice, gateways, certificados |
| `Cliente` | Tarefas que dependem de ação do cliente (enviar base, aprovar) |

### Responsável

- **Sempre** atribuir o `user_id` da pessoa que criou a tarefa
- Use `get_project_users` para descobrir o `user_id` pelo nome/e-mail
- Se não souber quem criou, pergunte ao usuário
- **NUNCA** criar tarefa sem responsável (quality gate)

### Tag Automática

A skill deve escolher a **tag mais adequada** entre as tags existentes fazendo match semântico com o conteúdo da tarefa:

| Se a tarefa é sobre... | Tag sugerida |
|------------------------|-------------|
| Cadastro de produtos em marketplace | `Cadastro de Produtos` (id:8) |
| Criação de campanhas promocionais | `Criação de Campanhas` (id:36) |
| Configuração de analytics/GTM/GA4 | `Configuração de Analytics` (id:9) |
| Relatório de vendas/KPIs | `Relatório de Vendas` (id:24) |
| Reunião de qualquer tipo | `Reunião Interna` (id:15) ou `Reunião Cliente` (id:16) |
| Integração entre sistemas | `Integração com ERP` (id:6) ou `Integração Marketplace` (id:85) |
| Estoque / logística | `Configuração de Frete` (id:7) |
| Testes / homologação | `Testes, Ajustes e Homologação` (id:10) |
| Go-live / lançamento | `Go-Live (Lançamento)` (id:11) |
| Suporte / ajuda | `Suporte` (id:13) |
| Anúncios / ads | `Gestão Ads Marketplaces` (id:25) |
| Planejamento / estratégia | `Planejamento` (id:2) |
| Design / banners / artes | `Criação de Banners` (id:50) |
| Migração de plataforma | `Migração de Plataforma` (id:14) |
| Análise de concorrência | `Análise de Concorrência` (id:22) |
| Treinamento | `Treinamentos` (id:26) |
| Call / daily / squad | `Daily` (id:28) ou `Reunião Squad` (id:27) |

Se nenhuma tag encaixar perfeitamente, pergunte ao usuário.

### Demais Campos

| Campo | Padrão | Observação |
|-------|--------|------------|
| **Coluna (step)** | `Backlog` (id:1) | Mover via `move_subtask_kanban_step` após criar |
| **Deadline** | Perguntar se tem prazo | Formato ISO: `2026-07-15T23:59:59.000Z` |
| **Carga (chtr)** | Perguntar estimativa em minutos | 60 = 1h, 480 = 1 dia. Se não souber, colocar 0 |
| **Status** | `WAITING` | Criação sempre como pendente |

---

## Regra Universal: Confirmação Obrigatória

**Toda ação que cria, edita, altera ou exclui algo no Earth exige confirmação explícita do usuário.** Essa regra vale para todos os modos, todos os níveis de usuário, sempre.

### O padrão é sempre o mesmo

1. Mostrar o preview do que vai fazer
2. Perguntar: "Confirmar? (s/n)"
3. Só executar se o usuário disser sim

### O que a skill NUNCA faz

- **NUNCA** cria tarefa sem confirmação
- **NUNCA** edita/altera tarefa sem confirmação
- **NUNCA** exclui tarefa sem confirmação explícita (e aviso de irreversibilidade)
- **NUNCA** move tarefa de coluna sem confirmação
- **Só executa** após receber um "sim" do usuário

---

## Quality Gates

### Pré-criação (Modo 1)

Toda tarefa nova passa por estes gates **antes de ser criada**:

| Gate | Regra | Ação |
|------|-------|------|
| 🏷️ **Natureza** | É ação ou informativo? | Se info → Modo 0. Se ação → segue |
| 📛 **Naming** | Tem `[Canal]` + verbo? | Bloquear e sugerir correção |
| 📄 **Descrição** | ≥ 3 linhas no template? | Perguntar "só isso?" e sugerir template |
| 👤 **Responsável** | user_name preenchido? | Bloquear — perguntar "quem executa?" |
| ⏱️ **Carga** | chtr > 0? | Perguntar estimativa |
| 🔁 **Duplicidade** | Nome similar já existe? | Alertar e oferecer opções |
| 📅 **Recorrência** | Se repete? | Perguntar frequência e quantos períodos |

### Regra especial para CEO

Quando o CEO estiver criando, os gates **não bloqueiam** — apenas alertam e sugerem:

```
⚠️ Atenção: esta tarefa não tem `[Canal]`.
Sugiro: "[Shopee] Cadastrar 50 SKUs da linha ShockLight"
Continuar mesmo assim? (s/N)
```

### Anti-Duplicidade (check pré-criação)

Antes de criar, buscar no projeto por:
- Nome similar (80%+ match)
- Mesmo canal + mesmo verbo
- Descrição similar

Se detectado:

```
🔁 Já existe uma tarefa parecida no Backlog:
  "Otimização de Anúncios - Shopee e Mercado Livre" (#18324, FINISHED)

Deseja:
1. Criar mesmo assim (pode ser novo ciclo)
2. Reabrir a existente
3. Criar como recorrência vinculada
```

---

## Memória de Contexto do Projeto

A skill mantém um arquivo de contexto por projeto para adaptar comportamento sem precisar perguntar toda vez.

Localização: `contexto/[projectCode].json`

```json
{
  "projectCode": "YD105",
  "projectName": "Arantz",
  "modelo_negocio": "E-commerce direto (óculos)",
  "plataforma": "VTEX + Tiny",
  "canais_ativos": ["Mercado Livre", "Shopee", "TikTok Shop", "Magazine Luiza"],
  "tipo_onboarding": "VTEX",
  "stakeholders": {
    "cliente": "Arantz",
    "ka": "Tabata Vidotto",
    "agencia_front": "SerieA"
  },
  "padrao_nomenclatura": "[Canal] Verbo + Objeto (capitalizado)"
}
```

### Como usar

- **Antes de criar tarefa:** ler o contexto do projeto para saber quais canais existem, qual o modelo, quem são os stakeholders
- **Na auditoria:** usar o `padrao_nomenclatura` como referência de comparação
- **No diagnóstico executivo:** usar `modelo_negocio` para filtrar alertas relevantes

### Quando criar/atualizar

- Na **primeira interação** com um projeto, se o arquivo não existir, criar com dados básicos
- Após detectar novos canais/nomes na auditoria, **oferecer** atualização
- A skill pergunta antes de criar/atualizar

---

## Modo 0: Detectar Natureza da Tarefa

### Gatilho

**SEMPRE** antes do Modo 1. Detecta se o que o usuário quer é ação ou informativo.

### Por que existe

Auditoria real revelou **informativos** criados como tarefa operacional em 3 projetos diferentes (Arantz, 3KAM, Boca Rosa). Eles travam no Backlog sem ação.

### Fluxo

**Passo 1 — Classificar**
Ao receber um pedido de criação, analisar:

```
É ação executável → Modo 1 (fluxo normal)
É informativo/referência → fluxo abaixo
```

**Como distinguir:**

| É ação se... | É informativo se... |
|-------------|--------------------|
| "Cadastrar produtos" | "Segue o link da planilha" |
| "Criar campanha" | "Informativo sobre horário de corte" |
| "Validar integração" | "Drive de fotos dos produtos" |
| "Configurar ferramenta" | "Base de produtos cadastrados" |
| "Analisar dados" | "Documentação de referência" |

**Passo 2 — Se for informativo:**
1. Usar `get_project_strategies` para verificar se a estratégia `📎 Informativos e Referências` existe
2. Se não existir: perguntar se quer criar a estratégia
3. Criar tarefa na estratégia de informativos
4. Mover direto para **Concluído** (step_id da coluna "Concluído")
5. **Não pergunta** recorrência, responsável, carga horária, deadline
6. Apenas registra o conteúdo (descrição com links)

```
📎 Tarefa criada como Informativo!
- Projeto: Arantz (YD105)
- Estratégia: 📎 Informativos e Referências
- Tarefa: [Geral] Compartilhar drive de fotos dos produtos
- Coluna: Concluído → disponível para consulta
```

---

## Modo 1: Criar Tarefa 🆕

### Gatilho
Usuário diz algo como: *"cria uma tarefa de [o quê] para [projeto]"*, *"preciso de uma tarefa de..."*, *"adiciona [tarefa] no projeto..."*

### Fluxo

**Passo 0 — Detectar natureza** (ver Modo 0)
Se for informativo → rota alternativa. Se for ação → continua.

**Passo 1 — Descobrir projeto**
Se o usuário não informou o `projectCode`, use `get_projects_list` e peça confirmação.

**Passo 2 — Carregar contexto**
Leia `contexto/[projectCode].json`. Use as informações para:
- Saber canais ativos e sugerir o mais relevante
- Saber o modelo de negócio (adapta template se for marketplace, se for SaaS...)
- Saber quem são os stakeholders (sugerir KA, agência)

**Passo 3 — Descobrir estratégia**
Use `get_project_strategies` para listar as estratégias. Escolha a mais adequada.

**Passo 4 — Coletar detalhes (o que faltar)**
- O que precisa ser feito?
- Qual o canal/pilar?
- Tem prazo? Estimativa de horas?
- Tags, referências?

**Passo 5 — Aplicar quality gates**
- Nome: `[Canal] Verbo + Objeto + Contexto` (gate: bloquear se sem `[Canal]`)
- Descrição: template completo (gate: alertar se < 3 linhas)
- Responsável: obrigatório (gate: bloquear se vazio)
- Carga horária: perguntar (gate: sugerir se 0)
- Anti-duplicidade: verificar similaridades (gate: alertar se encontrar)
- Prioridade: 2 se não informado
- Executor: YAV_DIGITAL se não informado
- Tag: match automático

**Passo 6 — Perguntar sobre recorrência**
```
Skill: "Essa tarefa se repete? (s/n)"
Usuário: "s"
Skill: "Qual a frequência? (diária / semanal / quinzenal / mensal / trimestral / semestral / anual)"
Usuário: "mensal"
Skill: "Quer que eu crie para os próximos meses também? Quantos? (0 = só essa)"
Usuário: "3"
```

**Passo 7 — Confirmação**
Mostrar preview completo e confirmar.

**Passo 8 — Executar**
1. Cria a tarefa com `create_new_subtask` na estratégia escolhida
2. Move para Backlog com `move_subtask_kanban_step` (step_id: 1)
3. Atribui responsável com `update_subtask_data` (user_id)
4. Se for recorrente: registra em `recorrencias/[projectCode].json`
5. Se pediu para criar adiantado: itera criando as futuras

### Pós-criação

```
✅ Tarefa criada!
- Projeto: [Nome] (YDxxx)
- Tarefa: [Shopee] Cadastrar 50 SKUs da linha X
- Estratégia: [Estratégia escolhida]
- Prioridade: 2 | Executor: YAV_DIGITAL | Responsável: [nome]
- Tag: Cadastro de Produtos
- Coluna: Backlog
- Recorrência: Mensal (criado até [período])
```

---

## Modo 2: Auditar Projeto 🔍

### Gatilho
Usuário diz: *"audita o projeto [projeto]"*, *"como está a saúde do [projeto]"*, *"verifica a qualidade das tarefas"*

### Regra importante: concluídos são conhecimento

A auditoria **só analisa tarefas ativas** (`WAITING`, `PROGRESS`, etc). Tarefas **concluídas** geram estatísticas mas **não viram issues para correção**.

### Fluxo

**Passo 1 — Coletar dados**
Use `get_all_project_subtasks` para obter todas as tarefas.
Use `get_kanban_columns` para mapear colunas e identificar as ativas.

**Passo 2 — Rodar auditoria**
Analisar manualmente as tarefas ativas contra estes critérios:

| Critério | O que verificar | Peso |
|----------|----------------|:----:|
| Descrição vazia/minimalista | < 3 linhas ou sem template | 🔴 Alto |
| Naming inadequado | Sem `[Canal]`, < 3 palavras, genérico | 🟡 Médio |
| Sem responsável | user_name = null | 🔴 Alto |
| Sem deadline | deadline = null | 🟡 Médio |
| Sem carga horária | cthr = 0 ou null | 🔵 Baixo |
| Duplicatas | Nomes similares (mesmo projeto) | 🟡 Médio |
| Nomes de 1 palavra | Apenas canal sem ação | 🟡 Médio |
| Case inconsistente | `[AMAZON]` vs `[Amazon]` | 🔵 Baixo |

**Passo 3 — Detectar recorrências órfãs**
Leia o arquivo `recorrencias/[projectCode].json`. Verifique se alguma recorrência está vencida.

**Passo 4 — Detectar gargalos**
Se alguma pessoa tiver >5 tarefas WAITING, marcar como gargalo.

**Passo 5 — Gerar relatório**

```markdown
# Auditoria de Tarefas — [Nome] ([ProjectCode]) — [data]

## Score Geral Ativas: 72/100 🟡

| Indicador | Ativas | Impacto |
|-----------|--------|---------|
| Sem descrição | 3 de 12 | 🔴 Alto |
| Naming inadequado | 2 de 12 | 🟡 Médio |
| Sem responsável | 0 de 12 | ✅ |
| Sem deadline | 8 de 12 | 🟡 Médio |
| Sem carga horária | 10 de 12 | 🔵 Baixo |
| Duplicatas | 2 | 🟡 Médio |

## 🔴 Issues (precisam de ação)

### Sem descrição
1. [ID 18363] Nome da tarefa

### 🟡 Naming inadequado
1. [ID 18122] Nome (sugestão: "[Canal] Ação + Objeto")

### 🔄 Recorrências pendentes
- "[Tarefa]" — venceu em Junho, não criado para Julho

## 👤 Gargalos detectados
- Isabella Kuhl: 8 tarefas WAITING (limite: 5)

## ⚡ Quick Wins
1. [Ação] — estimar [tempo]
2. [Ação] (recorrência pendente)

## 📖 Concluídas (referência)
As [N] tarefas concluídas servem de histórico.
```

**Passo 6 — Atualizar contexto do projeto**
Se descobrir novos canais ou padrões, oferecer atualização em `contexto/[projectCode].json`.

**Passo 7 — Publicar**
Registre `post_subtask_internal_note` na primeira tarefa do projeto com link/sumário.

---

## Modo 3: Corrigir em Lote 🛠️

### Gatilho
Usuário diz: *"corrige as tarefas sem descrição do [projeto]"*, *"arruma as prioridades"*, *"preenche o que falta no [projeto]"*

### Fluxo

**Passo 1 — Rodar auditoria** (Modo 2) para identificar problemas.

**Passo 2 — Para cada tarefa com problema:**
1. Mostre o problema específico e a sugestão de correção
2. **Pergunte confirmação** antes de alterar
3. Se confirmado, use `update_subtask_data`
4. Se não confirmado, pule

**Passo 3 — Correção inteligente**
Ao renomear, aprenda o padrão do projeto:

```
Projeto detectado: usa `[Amazon]` (capitalizado)
Sugiro padronizar: `[Amazon]`, `[Shopee]`
Aplicar em todas as [N] tarefas com naming genérico?
```

**Passo 4 — Relatório final**

```
🛠️ Correções aplicadas no [Projeto]:
- [N] tarefas com descrição adicionada ✅
- [N] tarefas com prioridade ajustada ✅
- [N] tarefas com executor definido ✅
- [N] tarefas renomeadas ✅
```

---

## Modo 4: Gerenciar Recorrências 🔄

### Gatilho
Usuário diz: *"verifica recorrências"*, *"o que precisa criar esse mês?"*, *"cria as recorrências pendentes"*, *"registra [tarefa] como recorrência"*

### Arquivo de Recorrências

Localização: `recorrencias/[projectCode].json`

```json
{
  "projectCode": "YD105",
  "projectName": "Arantz",
  "recorrencias": [
    {
      "id": "rec-001",
      "nome_base": "[Marketing] Elaborar calendário de campanhas",
      "descricao": "Template markdown da descrição",
      "frequencia": "mensal",
      "criadas_ate": "2026-07-01",
      "estrategia_id": 858,
      "prioridade": 1,
      "executor": "YAV_DIGITAL",
      "tag_id": 36,
      "dias_antecedencia": 5
    }
  ]
}
```

### 4a — Detecção automática de padrões manuais (novo!)

Na auditoria, identificar padrões como estes (descobertos em projetos reais):

| Padrão detectado | Exemplo real | Onde | Sugestão |
|-----------------|-------------|------|----------|
| "Estoque 15.07", "22.07", "25.08" | Boca Rosa | 6 ocorrências | Registrar recorrência quinzenal |
| "Campanhas Black" x8 | Ictus | 8 ocorrências | Registrar recorrência anual |
| "Informativo corte" x4 | 3KAM | 4 ocorrências | Consolidar como informativo fixo |
| "Reporte Mensal - Abril", "- Maio" | Múltiplos | N projetos | Registrar recorrência mensal |
| "Criação de campanhas" x3 | Anna Zogbi | 3 ocorrências | Registrar recorrência mensal |

### 4b — Verificar pendências
- Lê o arquivo de recorrências
- Para cada recorrência, calcula se o período atual já está coberto
- Se `criadas_ate` < data atual: a tarefa do período está pendente

### 4c — Criar adiantado
Oferece criar N períodos de uma só vez.

### 4d — Registrar nova recorrência
Se no Modo 1 o usuário disser que a tarefa é recorrente mas não quiser criar adiantado agora, registre mesmo assim.

### 4e — Editar recorrência
Permite alterar frequência, escopo, tag, executor de uma recorrência existente.

---

## Modo 5: Diagnóstico Executivo 🧠

### Gatilho
CEO diz: *"como está a operação?"*, *"saúde dos projetos"*, *"painel YAV"*, *"o que precisa de atenção"*, *"diagnóstico geral"*

### Fluxo

**Passo 1 — Varrer todos os projetos**
Use `get_projects_list` para obter todos. Depois, para cada projeto com tarefas, use `get_all_project_subtasks`.

**Passo 2 — Calcular Score Geral YAV**

Para cada projeto, calcular:

| Indicador | Fórmula | Peso |
|-----------|---------|:----:|
| 🟢 % Concluídas | FINISHED / Total | 30% |
| 🟡 % WAITING sem dono | WAITING + user_name=null / Total WAITING | 25% |
| 🔴 Gargalo humano | Pessoa com mais WAITING (se >5) | 20% |
| 🟡 Recorrências vencidas | Recorrência com `criadas_ate` vencido | 15% |
| 🟢 Projeto parado | Sem activity há >30 dias | 10% |

Score YAV geral = média ponderada de todos os projetos.

**Passo 3 — Gerar Painel Executivo**

```
📊 Painel YAV — [data]

Score Geral: 62/100 🟡

┌──────────────┬───────┬────────┬──────────┐
│ Projeto      │ Score │ Status │ Alerta   │
├──────────────┼───────┼────────┼──────────┤
│ Ictus        │ 35    │ 🔴     │ 72% órfã │
│ Chocolat     │ 48    │ 🟡     │ gargalo  │
│ Boca Rosa    │ 72    │ 🟢     │ ok       │
│ Arantz       │ 68    │ 🟢     │ ok       │
│ Noivah       │ 40    │ 🔴     │ gargalo  │
│ Anna Zogbi   │ 30    │ 🔴     │ parado   │
│ ...          │       │        │          │
└──────────────┴───────┴────────┴──────────┘

🔴 Top 3 Alertas Críticos
1. Ictus (YD012): 72% das tarefas sem responsável — 450 órfãs
2. Noivah (YD059): Anna Geyer com 33 WAITING — gargalo extremo
3. Anna Zogbi (YD068): 70% das tarefas em WAITING — projeto parado

🟢 Destaques
- Anna Zogbi: 100% das tarefas com dono atribuído ✅
- Arantz: Sistema de prefixos bem aplicado ✅

⚡ Quick Wins
- Ictus: Rodar limpeza de 40 duplicatas (est. 2h)
- 3KAM: Consolidar 4 "Informativos" em 1 (est. 30min)

📌 Projetos vazios/abandonados
- YAV Interno (YD040): 0 tarefas
- Lyco (YD075): 0 tarefas
```

**Passo 4 — Sugerir próximos passos**

Oferecer ao CEO:

```
Quer que eu:
1. Aprofunde em algum projeto específico?
2. Gere plano de ação para os 3 alertas críticos?
3. Agende diagnóstico semanal recorrente?
```

---

## Modo 6: Radar de Riscos 🚨

### Gatilho
**Proativo** — executado automaticamente durante qualquer interação. Se detectar um risco, **informe imediatamente** antes de continuar.

### Riscos monitorados

| Risco | Gatilho | Alerta |
|-------|---------|--------|
| 🔴 Gargalo humano | 1 pessoa com >5 WAITING | "Anna Geyer está com 33 tarefas paradas" |
| 🟡 Projeto parado | Sem atividade >30 dias | "Anna Zogbi não avança há 2 meses" |
| 🟡 Onboarding estagnado | WAITING > 50% das tarefas | "70% das tarefas em WAITING" |
| ⚠️ Recorrência vencida | `criadas_ate` < hoje | "Calendário de Julho não foi criado" |
| 📌 Duplicata frequente | Mesmo nome 3x+ | "'Criação de campanhas' já foi usado 3x" |
| 🟢 Projeto vazio | 0 tarefas | "YAV Interno está sem tarefas" |

### Como usar

**Exemplo durante diagnóstico:**

```
Antes de continuar com a auditoria do Arantz...

🚨 Radar de Riscos detectou:
1. Noivah (YD059): Anna Geyer com 33 WAITING — gargalo extremo
2. Ictus (YD012): 72% das tarefas sem responsável
3. Anna Zogbi (YD068): 50+ tarefas paradas no onboarding

Quer que eu priorize algum desses? (s/N)
```

**Exemplo durante criação de tarefa:**

```
Só um alerta rápido: Isabella Kuhl já tem 8 tarefas WAITING.
Essa nova vai para ela? Talvez redistribuir ajude.
```

---

## Regras de Comunicação

A skill **NUNCA** escreve direto no Earth sem confirmar (ver [Regra Universal](#regra-universal-confirmação-obrigatória)).

### Comentário público vs Nota interna

| Tipo | Tool | Quem vê | Quando usar |
|------|------|---------|-------------|
| Comentário | `post_subtask_comment` | Cliente + Equipe YAV | Atualizações de andamento, solicitações de aprovação, entregas concluídas, feedback do cliente |
| Nota interna | `post_subtask_internal_note` | Só equipe YAV | Diagnóstico de auditoria, observações técnicas, contexto operacional, alinhamentos internos |

### Tom para o CEO

Quando o usuário for o CEO, o tom é:
- **Direto e estratégico** — sem detalhes operacionais a menos que pedido
- Foco em **decisões, riscos e oportunidades**
- Alertas são **informativo**, não pergunta (a menos que precise de decisão)
- Quick wins são **sugestão**, não tarefa

---

## MCP Tools

| Tool | Modo | Uso |
|------|------|-----|
| `get_projects_list` | 🆕🔍🧠 | Descobrir projectCode |
| `get_project_strategies` | 🆕 | Descobrir estratégias (task_id) |
| `get_project_users` | 🆕 | Descobrir user_id do responsável |
| `get_all_project_subtasks` | 🔍🛠️🧠 | Ler todas as tarefas |
| `get_kanban_columns` | 🆕🔍 | Descobrir step_id do Backlog / Concluído |
| `get_tracking_tags` | 🆕 | Referência para match de tags |
| `get_subtask_by_id` | 🔍 | Detalhar tarefa (descrição, deadline, etc) |
| `create_new_subtask` | 🆕🔄 | Criar tarefa |
| `update_subtask_data` | 🆕🛠️ | Atribuir responsável, corrigir campos |
| `move_subtask_kanban_step` | 🆕🛠️ | Mover para Backlog / Concluído |
| `post_subtask_comment` | 🆕🔍 | Comunicar com cliente |
| `post_subtask_internal_note` | 🔍 | Registrar auditoria/diagnóstico |

---

## Skills Relacionadas

- **Antes:** `yav-prospeccao`, `yav-lead-scout` (descobrem leads que viram projetos no Earth)
- **Depois:** Nenhuma — esta skill cobre a gestão contínua do projeto
- **Complementar:** `yav-pipeline-audit` (audita funil de pré-vendas no Exact, não o Earth)
- **Fundamento:** Esta skill foi evoluída com base em auditoria real de 16 projetos e ~2.500+ tarefas, documentando 17 cenários de melhoria.
