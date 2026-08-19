---
name: yav-brand
description: "Skill oficial da YAV Digital para criar qualquer material de comunicação e apresentação com identidade YAV. Use SEMPRE que alguém da YAV precisar criar: apresentações comerciais, propostas, decks estratégicos, diagnósticos de operação, posts LinkedIn/Instagram, carrosseis, relatórios operacionais, documentos internos, landing pages ou qualquer conteúdo com a marca YAV. Acione esta skill ao menor sinal de criação de conteúdo YAV — mesmo pedidos vagos como 'faz uma apresentação', 'cria um deck', 'faz um post sobre marketplace', 'preciso de uma proposta para o cliente'. Foco principal: apresentações HTML profissionais. Também suporta PPTX, posts e documentos."
---

# YAV Brand Content Creator

Skill interativa para criar materiais profissionais no padrão YAV Digital.

## Referências Disponíveis

| Material | Arquivo de referência |
|---|---|
| Apresentações HTML (foco principal) | `references/html-presentations.md` |
| Apresentações PPTX | `references/pptx-guide.md` |
| Posts e redes sociais | `references/social-posts.md` |
| Design system completo (tokens, tipografia, componentes) | `references/design-system.md` |

---

## Processo de Criação

### Etapa 1 — Entrevista Interativa

**Sempre comece perguntando ao usuário.** Nunca assuma o que ele precisa. Adapte as perguntas conforme o contexto — se já souber algumas respostas, não repita.

Faça as perguntas de forma conversacional, não como formulário. Exemplo de abertura:

> "Vou criar isso no padrão YAV. Me conta: qual é o tema central e para quem vai esse material?"

**Perguntas essenciais:**

1. **Que tipo de material você precisa?**
   - Apresentação comercial / proposta
   - Deck de estratégia ou operação
   - Diagnóstico de cliente
   - Post para LinkedIn
   - Carrossel (LinkedIn ou Instagram)
   - Relatório ou documento interno
   - Landing page ou HTML standalone
   - Outro — peça que descreva

2. **Qual é o tema ou assunto central?**
   Exemplos: "Proposta para cliente VTEX", "Diagnóstico de marketplace", "Post sobre erros de catálogo no ML", "Apresentação de serviços para novo prospect"

3. **Quem vai receber esse material?**
   Exemplos: prospect, CEO, Head de E-commerce, CFO, time interno YAV, seguidores LinkedIn

4. **Que conteúdo, dados ou pontos você quer incluir?**
   Liste tópicos, métricas, argumentos ou estrutura. Se o usuário não souber, ofereça uma estrutura padrão YAV baseada no tipo de material.

5. **Quantos slides / páginas / frames?**
   Ou pergunte se prefere que você sugira.

6. **Formato de entrega?**
   - HTML (padrão YAV — recomendado)
   - PPTX
   - Post/imagem HTML
   - Texto/documento

Se o usuário não souber responder tudo, use o que tiver e proponha o restante.

---

### Etapa 2 — Proposta de Estrutura

Com as respostas em mãos, proponha uma estrutura antes de construir. Seja específico com os títulos:

```
Material: Diagnóstico de Operação — Cliente XYZ
Formato: HTML (12 slides)

01. Capa — YAV + título + nome do cliente + data
02. Contexto — situação atual da operação
03. O que identificamos — 3 pontos críticos
04. Raiz dos problemas — por que isso acontece
05. Como a YAV resolve — processo por área
06. Plano de ação — etapas numeradas
07. Equipe — especialistas por área
08. Investimento — fee + entregáveis claros
09. Perguntas frequentes — objeções comuns
10. Próximo passo — CTA de diagnóstico ou proposta
```

Peça confirmação antes de construir. Se o usuário aprovar, siga para a Etapa 3.

---

### Etapa 3 — Construção

Leia a referência adequada para o formato escolhido e construa o material completo.

**Leia sempre antes de construir:**
- HTML → `references/html-presentations.md`
- PPTX → `references/pptx-guide.md`
- Post/carrossel → `references/social-posts.md`
- Dúvidas de token ou componente → `references/design-system.md`

Construa o material **completo** — nunca entregue um esqueleto ou placeholder. Se o usuário não forneceu o conteúdo de um slide, use copy no padrão YAV como exemplo e indique que precisa ser personalizado.

---

## Tokens de Design Rápidos

Estes valores são suficientes para a maioria dos materiais. Para detalhes completos, leia `references/design-system.md`.

### Paleta de cores
```
Cyan YAV:    #00F6F6   ← destaque principal, CTAs, bordas ativas
Blue YAV:    #2F80FF   ← transição de gradiente
Purple YAV:  #6E29F6   ← profundidade, contraste
Background:  #080A0E   ← fundo principal de todos os materiais
Surface:     #11131A   ← cards e blocos principais
Surface 2:   #171A24   ← cards elevados, tabelas
Surface 3:   #1E2230   ← áreas secundárias, estados destacados
Branco:      #FFFFFF   ← títulos e texto de alta importância
Muted:       #BFC3D1   ← corpo de texto principal
Muted 2:     #8A8A99   ← labels e descrições secundárias
```

### Gradiente oficial YAV
```css
linear-gradient(100deg, #00F6F6 0%, #2F80FF 48%, #6E29F6 100%)
```
Use em: palavras-chave no título, números grandes de métrica, linhas divisórias premium, bordas de card de destaque, capa.
**Não use em:** parágrafos, fundo inteiro, todos os cards da mesma tela.

### Google Fonts (sempre incluir)
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;700;800;900&family=Outfit:wght@400;500;600&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet">
```

| Função | Fonte | Peso |
|---|---|---|
| Títulos / Display | Sora | 800–900 |
| Corpo / Subtítulo | Outfit | 400–600 |
| Métricas / Labels / Código | JetBrains Mono | 400–700 |

### Card base YAV
```css
background: linear-gradient(180deg, rgba(23,26,36,.76), rgba(12,14,20,.72));
border: 1px solid rgba(255,255,255,.10);
border-radius: 24px;
box-shadow: 0 12px 60px rgba(0,0,0,.24);
padding: 32px;
```

### Botão primário
```css
background: linear-gradient(100deg, #00F6F6 0%, #2F80FF 48%, #6E29F6 100%);
color: #030507;
border-radius: 999px;
font-family: 'Sora', sans-serif;
font-weight: 900;
font-size: 13px;
text-transform: uppercase;
letter-spacing: .075em;
padding: 14px 32px;
border: none;
cursor: pointer;
```

### Kicker (label acima de títulos)
```css
font-family: 'Sora', sans-serif;
font-size: 11px;
font-weight: 900;
letter-spacing: .18em;
text-transform: uppercase;
color: #00F6F6;
```

---

## Princípios YAV — Nunca Esquecer

### Visual
- **Escuro primeiro**: fundo #080A0E como base de tudo
- **Gradiente como assinatura**: use em 1–2 elementos por tela, não em tudo
- **Títulos fortes**: Sora 900, caixa alta, tracking negativo
- **Cards com profundidade**: borda sutil branca, sombra escura, sem glassmorphism exagerado
- **Espaço generoso**: padding mínimo de 24px em cards, 48px entre blocos

### Verbal
- **Execução, não consultoria**
- **Processo, não promessa**
- Frases curtas — como falaria quem opera, não quem vende
- **Nunca prometer**: resultado garantido, ROAS, crescimento percentual, ranking, escala garantida
- **Prometer**: processo, clareza, execução, documentação, especialistas, continuidade

**Palavras da marca**: operação, execução, especialista, processo, critério de aceite, visibilidade, reporte, estruturado, rotina, responsável, decisão com contexto

**Evitar**: performance incrível, resultados extraordinários, solução inovadora, potencializamos sua marca, método secreto

---

## Checklist Final

Antes de entregar qualquer material:

- [ ] Nome como **YAV** (não "YAV Digital" sem necessidade)
- [ ] Fundo escuro (#080A0E) como base
- [ ] Gradiente usado com moderação (não em tudo)
- [ ] Tipografia: título forte em Sora 900, corpo em Outfit legível
- [ ] Nenhuma promessa de resultado garantido
- [ ] CTA coerente: diagnóstico, proposta ou conversa
- [ ] Cards e bordas discretos — sem excesso de efeitos
- [ ] Linguagem clara para CEO, Head de Operações ou e-commerce manager
- [ ] Material completo — sem placeholders abandonados
