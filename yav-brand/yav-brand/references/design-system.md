# Design System YAV

Guia visual e verbal para criar documentos, apresentacoes, posts, relatorios, propostas e materiais comerciais no padrao YAV.

Este documento foi derivado do site atual da YAV, dos tokens em `src/styles/global.css`, dos componentes principais e do contexto de posicionamento da marca.

---

## 1. Essencia da Marca

### Nome

Use sempre **YAV**.

Evite usar "YAV Digital" em materiais publicos, exceto quando houver necessidade juridica, historica ou de identificacao de perfil externo.

### Posicionamento

**Operacao especializada de e-commerce e marketplace. Nao e consultoria. E execucao.**

A YAV representa execucao tecnica, rotina documentada, especialistas por area e visibilidade operacional. A marca nao deve parecer uma agencia generica, uma consultoria abstrata ou uma empresa de promessas de performance.

### Personalidade

- Direta
- Tecnica quando necessario
- Austera
- Confiante sem arrogancia
- Transparente
- Pragmatica
- Orientada a processo

### Promessa central

A YAV nao promete resultado garantido. Promete processo, execucao, visibilidade, criterio de aceite e continuidade operacional.

---

## 2. Principios Visuais

### 1. Escuro primeiro

A identidade YAV nasce em fundo escuro. O visual deve transmitir operacao, tecnologia, profundidade e controle.

Use fundos escuros como base. Use superficies levemente mais claras para organizar informacao.

### 2. Gradiente como assinatura, nao como decoracao

O gradiente cyan -> azul -> roxo e a assinatura da marca. Use para destaque, linhas, numeros, palavras-chave e acentos. Nao aplique em tudo.

### 3. Tipografia forte e condensada por hierarquia

Titulos devem ser grandes, em caixa alta, pesados e com tracking negativo. Corpo deve ser limpo, respirado e legivel.

### 4. Cards com profundidade controlada

Cards YAV usam borda sutil, fundo escuro transluzido, sombra baixa e brilho radial discreto. Nao use glassmorphism exagerado.

### 5. Prova acima de promessa

Metrica, contexto, processo e evidencias devem aparecer antes de claims amplos.

---

## 3. Paleta Oficial

### Cores principais

| Token | Hex | Uso |
|---|---:|---|
| Cyan YAV | `#00F6F6` | Destaques, CTAs, links, indicadores, bordas ativas |
| Blue YAV | `#2F80FF` | Transicao de gradiente, apoio digital, graficos |
| Purple YAV | `#6E29F6` | Profundidade, contraste, assinatura visual |
| Background | `#080A0E` | Fundo principal escuro |
| Deep | `#050609` | Fundo mais profundo, rodapes, overlays |
| Surface | `#11131A` | Cards e blocos principais |
| Surface 2 | `#171A24` | Cards elevados, tabelas, modulos |
| Surface 3 | `#1E2230` | Areas secundarias ou estados destacados |

### Texto

| Token | Hex | Uso |
|---|---:|---|
| White | `#FFFFFF` | Titulos e texto de alta importancia |
| Muted | `#BFC3D1` | Corpo de texto principal em fundo escuro |
| Muted 2 | `#8A8A99` | Labels, descricoes secundarias |
| Muted 3 | `#55556A` | Texto auxiliar de baixa prioridade |

### Bordas

| Token | Valor | Uso |
|---|---|---|
| Border | `rgba(255,255,255,.10)` | Cards, tabelas, separadores |
| Border Strong | `rgba(255,255,255,.18)` | Botao secundario, estados ativos suaves |
| Cyan Border | `rgba(0,246,246,.25)` | Destaques, badges, foco |

### Gradiente oficial

```css
linear-gradient(100deg, #00F6F6 0%, #2F80FF 48%, #6E29F6 100%)
```

Use em:

- Palavra-chave do titulo
- Numero grande de metrica
- Linha divisoria premium
- Borda fina de card importante
- Capa de apresentacao
- Destaque de posts

Nao use em:

- Paragrafos longos
- Todo o fundo do material
- Todos os cards de uma pagina
- Texto pequeno demais para leitura

---

## 4. Tipografia

### Fontes oficiais

| Funcao | Fonte | Peso recomendado |
|---|---|---:|
| Display / Titulos | Sora | 800-900 |
| Corpo | Outfit | 400-600 |
| Metadados / Numeros / Labels | JetBrains Mono | 400-700 |

### Hierarquia para materiais

#### Titulo hero / capa

- Fonte: Sora
- Peso: 900
- Caixa: alta
- Tracking: negativo
- Linha: compacta
- Uso: capa de apresentacao, abertura de relatorio, headline de post

Exemplo:

```text
NAO E CONSULTORIA.
E EXECUCAO.
```

#### Titulo de secao

- Fonte: Sora
- Peso: 800-900
- Caixa: alta
- Linha: curta
- Use uma quebra intencional e um trecho em gradiente quando fizer sentido.

Exemplo:

```text
OPERACAO DE E-COMMERCE
DE PONTA A PONTA.
```

#### Subtitulo

- Fonte: Outfit
- Peso: 400-500
- Cor: `#BFC3D1`
- Linha: 1.45 a 1.7
- Funcao: explicar sem vender demais.

#### Label / kicker

- Fonte: Sora ou JetBrains Mono
- Peso: 700-900
- Caixa: alta
- Tracking: aberto
- Cor: `#00F6F6`

Exemplo:

```text
OPERACAO REGISTRADA
```

---

## 5. Layout e Composicao

### Grid

Use composicoes com estrutura clara:

- 1 coluna para documentos textuais
- 2 colunas para comparativos e apresentacoes executivas
- 3 colunas para cards de servicos, beneficios e etapas
- Bento grid apenas quando houver informacao densa e hierarquia real

### Espacamento

O padrao YAV usa respiro generoso.

Escala recomendada:

| Tamanho | Uso |
|---:|---|
| 8px | Micro espacamentos internos |
| 12px | Gaps pequenos entre labels e texto |
| 16px | Gaps entre itens relacionados |
| 24px | Padding minimo de cards |
| 32px | Padding premium de cards e modulos |
| 48px | Separacao entre blocos |
| 72px | Separacao entre secoes em documentos longos |
| 96px+ | Aberturas, capas e secoes hero |

### Bordas e raios

| Elemento | Raio |
|---|---:|
| Botao | `999px` |
| Badge | `999px` |
| Card pequeno | `18px` a `20px` |
| Card principal | `24px` |
| Bloco hero / CTA | `32px` |

### Sombra

Use sombra escura e difusa, nunca sombra clara generica.

```css
box-shadow: 0 12px 60px rgba(0,0,0,.24);
```

Para cards importantes:

```css
box-shadow: 0 22px 76px rgba(0,0,0,.30);
```

---

## 6. Componentes Visuais

### Card YAV

Use para servicos, insights, blocos de argumento e modulos de relatorio.

Caracteristicas:

- Fundo em gradiente vertical escuro
- Borda branca com baixa opacidade
- Raio entre 20px e 24px
- Sombra escura suave
- Pequeno brilho cyan ou roxo, quando necessario

CSS base:

```css
background: linear-gradient(180deg, rgba(23,26,36,.76), rgba(12,14,20,.72));
border: 1px solid rgba(255,255,255,.10);
border-radius: 24px;
box-shadow: 0 12px 60px rgba(0,0,0,.24);
```

### Card com borda premium

Use para o card mais importante da tela, nao para todos.

Visual:

- Mesma base do card YAV
- Borda com gradiente discreto
- Destaque visual sem gritar

### Botao primario

Use para a acao principal.

Texto recomendado:

- `Agendar Diagnostico`
- `Diagnosticar Minha Operacao`
- `Receber Proposta`
- `Falar com a YAV`

Estilo:

```css
background: linear-gradient(100deg, #00F6F6 0%, #2F80FF 48%, #6E29F6 100%);
color: #030507;
border-radius: 999px;
font-family: Sora;
font-weight: 900;
text-transform: uppercase;
letter-spacing: .075em;
```

### Botao secundario

Use para acao alternativa.

Estilo:

```css
background: rgba(255,255,255,.04);
border: 1px solid rgba(255,255,255,.18);
color: #FFFFFF;
```

### Kicker

Use acima de titulos para situar o leitor.

Exemplos:

- `PROXIMO PASSO`
- `OPERACAO REGISTRADA`
- `CASES SELECIONADOS`
- `O QUE EXECUTAMOS`
- `DIAGNOSTICO`

Estilo:

```css
font-family: Sora;
font-size: 11px;
font-weight: 900;
letter-spacing: .18em;
text-transform: uppercase;
color: #00F6F6;
```

### Metricas

Numeros devem ter peso visual alto e contexto objetivo.

Exemplos aprovados:

- `250+` Projetos estruturados
- `R$ 1bi+` Volume gerenciado
- `7+` Anos de operacao
- `15+` Marketplaces ativos

Regra: nunca usar metrica como promessa de resultado futuro.

### Badges e tags

Use para plataformas, canais, temas e status.

Exemplos:

- `VTEX`
- `SHOPIFY`
- `MERCADO LIVRE`
- `CATALOGO`
- `ADS`
- `RELATORIO`

Estilo:

```css
border: 1px solid rgba(255,255,255,.12);
background: rgba(255,255,255,.04);
border-radius: 999px;
font-family: JetBrains Mono;
font-size: 11px;
letter-spacing: .08em;
text-transform: uppercase;
color: rgba(255,255,255,.55);
```

### Tabelas comparativas

Use para mostrar YAV vs. alternativas, custo interno vs. fee, antes vs. depois, ou operacao atual vs. operacao recomendada.

Regras:

- Fundo escuro
- Bordas finas
- Texto secundario em muted
- Coluna YAV com leve destaque cyan ou gradiente discreto
- Nao usar verde de "certo" e vermelho de "errado" como padrao principal

### Depoimentos

Use monogramas, nao fotos.

Padrao:

- Card escuro premium
- Aspas ou sinal grafico em cyan
- Nome em Sora uppercase
- Cargo em Outfit muted
- Monograma em caixa com borda cyan

---

## 7. Diretrizes para Documentos

### Estrutura recomendada

1. Capa escura com logo YAV, titulo forte e um detalhe em gradiente.
2. Contexto objetivo: problema, cenario, canal, operacao atual.
3. Diagnostico ou leitura tecnica.
4. Plano de acao ou recomendacao.
5. Evidencias, metricas, exemplos e criterios.
6. Proximo passo claro.

### Capa de documento

Use:

- Fundo `#080A0E`
- Logo YAV em branco, no topo esquerdo ou inferior esquerdo
- Titulo em Sora 900 uppercase
- Uma palavra ou linha em gradiente
- Linha fina com gradiente como assinatura

Modelo:

```text
YAV

DIAGNOSTICO DE OPERACAO
DE MARKETPLACE

Cliente: [Nome]
Data: [Mes/Ano]
```

### Paginas internas

Use fundo claro apenas se o material exigir impressao. Mesmo assim, preserve acentos YAV com cyan, roxo e tipografia forte.

Para documentos digitais, prefira:

- Fundo escuro
- Cards por secao
- Blocos de resumo executivo
- Tabelas com destaque na recomendacao YAV

---

## 8. Diretrizes para Apresentacoes

### Slide de abertura

Composicao recomendada:

- Logo pequeno
- Kicker em cyan
- Titulo grande em duas ou tres linhas
- Palavra-chave em gradiente
- Rodape com data, cliente ou contexto

### Slide de metrica

Modelo:

```text
250+
projetos estruturados

Experiencia acumulada em implantacao, marketplace, Ads, catalogo e gestao continua.
```

Use o numero em gradiente. O texto deve explicar o que a metrica significa.

### Slide de comparativo

Use tabela escura com coluna YAV destacada.

Exemplo de colunas:

- Time interno
- Agencia generalista
- Freelancer
- YAV

### Slide de plano de acao

Use cards numerados:

- `01` Imersao
- `02` Priorizacao
- `03` Execucao registrada
- `04` Reporte com contexto

Numeros em JetBrains Mono ou Sora com gradiente discreto.

---

## 9. Diretrizes para Posts e Redes Sociais

### Visual

Posts YAV devem parecer tecnicos, premium e objetivos. Evite aparencia motivacional, stock photo generica ou excesso de elementos.

Use:

- Fundo escuro
- Titulo grande
- Uma frase central forte
- Linha ou detalhe em gradiente
- Poucos elementos
- Cards com dados ou etapas

### Temas que combinam com a marca

- Operacao de e-commerce
- Marketplace por canal
- Erros de agencia generalista
- Dependencia de especialista interno
- Catálogo, ERP, integracoes, Ads e CRO
- Visibilidade de tarefas
- Reporte com contexto
- Custo real de montar time interno

### Formula para post estatico

```text
Kicker: OPERACAO DIGITAL
Headline: O problema nao e vender online. E sustentar a rotina.
Body curto: Marketplace, catalogo, Ads e plataforma quebram quando ninguem registra o processo.
Assinatura: YAV
```

### Formula para carrossel

1. Capa com tese forte.
2. Problema real em uma frase.
3. Por que alternativas falham.
4. Como uma operacao registrada resolve.
5. Exemplo pratico.
6. CTA direto para diagnostico ou conversa.

---

## 10. Voz e Copy

### Tom

Direto, tecnico quando necessario, sem enrolacao.

### Frases curtas

Prefira frases que parecem ditas por quem opera, nao por quem vende.

Bom:

```text
Nao entregamos PDF. Entregamos operacao.
```

Bom:

```text
Marketplace nao e um canal unico. Cada plataforma tem regra, algoritmo e rotina.
```

Evite:

```text
Transformamos sua presenca digital com solucoes inovadoras de alta performance.
```

### Palavras para usar

- Operacao
- Execucao
- Especialista
- Canal
- Documentado
- Ferramenta
- Processo
- Criterio de aceite
- Visibilidade
- Reporte
- Profundidade
- Estruturado
- Rotina
- Responsavel
- Decisao com contexto
- Ecossistema operacional

### Palavras e frases para evitar

- Performance incrivel
- Resultados extraordinarios
- Garantimos crescimento
- Solucao inovadora
- Potencializamos sua marca
- Agencia full service
- Crescimento explosivo
- Metodo secreto
- Escala garantida

### Regra de promessa

Nunca prometa receita, ROAS, ranking, crescimento percentual ou resultado garantido.

Prometa:

- Processo
- Clareza
- Execucao
- Documentacao
- Especialistas
- Continuidade
- Criterios objetivos

---

## 11. Logo

### Arquivo oficial

Use sempre:

```text
/assets/yav-logo.svg
```

### Regras

- Nao recriar o logo manualmente.
- Nao redesenhar em texto.
- Nao aplicar efeitos exagerados.
- Nao distorcer proporcao.
- Nao colocar o logo sobre fundo claro sem contraste suficiente.
- Nao usar fotos de clientes nos depoimentos; use monogramas.

---

## 12. Imagens e Elementos Graficos

### Padrao grafico

A marca usa mais sistema visual do que fotografia.

Elementos recomendados:

- Linhas diagonais finas
- Grid pontilhado sutil
- Ruido discreto
- Radiais cyan e roxo com baixa opacidade
- Monogramas tipograficos
- Numeros grandes como marcas d'agua
- Cards e tabelas como objetos principais

### Evitar

- Fotos stock genericas de escritorio
- Pessoas apontando para graficos
- Mockups muito chamativos
- Glassmorphism exagerado
- Gradiente roxo-azul generico sem cyan
- Icones 3D coloridos demais
- Elementos decorativos sem relacao com operacao

---

## 13. Acessibilidade e Legibilidade

### Contraste

Em fundo escuro, use:

- Titulo: branco
- Corpo: `#BFC3D1`
- Texto secundario: `rgba(255,255,255,.55)` ou similar
- Destaque: `#00F6F6`

### Tamanho minimo

- Posts: texto principal com leitura confortavel em mobile
- Apresentacoes: nenhum texto critico abaixo de 18px
- Documentos: corpo entre 14px e 18px dependendo do formato
- Labels: pequenos, mas sempre com alto contraste

### Movimento

Use animacoes discretas apenas em materiais digitais. O site usa reveal suave e microinteracoes, nao animacao gratuita.

---

## 14. Templates Praticos

### Template de capa de apresentacao

```text
[Logo YAV]

DIAGNOSTICO DE OPERACAO
DE E-COMMERCE

Como reduzir dependencia operacional e estruturar rotina com visibilidade.

[Cliente] · [Mes/Ano]
```

Visual:

- Fundo `#080A0E`
- Titulo branco com uma linha em gradiente
- Kicker cyan no topo
- Linha gradiente no rodape

### Template de resumo executivo

```text
RESUMO EXECUTIVO

O problema central nao esta no produto. Esta na rotina operacional: catalogo, canais, Ads, integracoes e reporte ainda dependem de acompanhamento manual.

Prioridade YAV:
01. Organizar visibilidade
02. Reduzir retrabalho
03. Padronizar criterio de aceite
04. Criar cadencia de execucao
```

### Template de post LinkedIn

```text
Marketplace nao quebra de uma vez.

Quebra quando cada canal vira uma excecao.
Quebra quando catalogo depende de uma pessoa.
Quebra quando Ads roda sem margem.
Quebra quando ninguem registra decisao.

Operacao digital nao precisa de mais promessa.
Precisa de rotina documentada.
```

### Template de card de metrica

```text
15+
marketplaces ativos

Operacao simultanea exige processo por canal, nao uma rotina generica.
```

### Template de CTA

```text
Diagnostico gratuito da sua operacao digital.

30 minutos para entender onde esta o gargalo e o que priorizar. Sem apresentacao pronta, sem proposta empurrada.

[Agendar Diagnostico]
```

---

## 15. Checklist de Qualidade YAV

Antes de publicar qualquer material, revise:

- O nome esta como YAV?
- O material parece uma operacao tecnica, nao uma agencia generica?
- O fundo principal respeita a base escura da marca?
- O gradiente foi usado como assinatura, nao como enfeite excessivo?
- A tipografia tem titulo forte e corpo legivel?
- Ha prova, processo ou contexto antes de promessa?
- Alguma frase promete resultado garantido? Se sim, remover.
- O CTA e direto e coerente com diagnostico, proposta ou conversa?
- Os cards, bordas e sombras estao discretos?
- O texto esta claro para CEO, Head de Operacoes, e-commerce manager ou CFO?
- O material evita fotos genericas e icones decorativos sem funcao?
- O logo oficial foi usado sem recriacao?

---

## 16. Resumo Rapido

YAV visualmente e:

- Escura
- Tecnica
- Premium
- Direta
- Operacional
- Com gradiente cyan/azul/roxo como assinatura
- Com tipografia forte e caixa alta em titulos
- Com cards densos, bordas sutis e profundidade controlada

YAV verbalmente e:

- Execucao, nao consultoria
- Processo, nao promessa
- Especialista, nao generalista
- Visibilidade, nao relatorio de screenshot
- Continuidade, nao acao pontual
