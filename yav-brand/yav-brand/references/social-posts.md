# Posts e Redes Sociais — YAV Digital

Guia para criar posts, carrosseis e conteúdo visual para LinkedIn e Instagram no padrão YAV.

---

## Formatos e Dimensões

| Formato | Dimensões | Uso |
|---|---|---|
| Post quadrado | 1080 × 1080px | Instagram, LinkedIn |
| Post retangular | 1200 × 628px | LinkedIn link preview |
| Stories / Reels cover | 1080 × 1920px | Instagram Stories |
| Carrossel (slide) | 1080 × 1080px | Instagram carrossel, LinkedIn doc |

---

## Como criar: HTML → Screenshot

Posts YAV são criados como HTML e depois capturados como imagem.

```html
<!-- Estrutura padrão para post 1080x1080 -->
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;700;800;900&family=Outfit:wght@400;500;600&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    width: 1080px; height: 1080px;
    background: #080A0E;
    font-family: 'Outfit', sans-serif;
    overflow: hidden;
  }
  /* Escale para visualização no browser: transform: scale(0.5); */
</style>
</head>
<body>
  <!-- Conteúdo do post aqui -->
</body>
</html>
```

---

## Fórmulas de Post — Exemplos YAV

### Fórmula 1: Tese provocativa + lista + CTA

**Estrutura de copy:**
```
[Afirmação direta que provoca reflexão]

[Item 1 que valida a afirmação]
[Item 2 que valida]
[Item 3 que valida]
[Item 4 que valida]

[Virada: o que realmente resolve]

[CTA direto]
```

**Exemplo:**
```
Marketplace não quebra de uma vez.

Quebra quando cada canal vira uma exceção.
Quebra quando catálogo depende de uma pessoa.
Quebra quando Ads roda sem margem.
Quebra quando ninguém registra decisão.

Operação digital não precisa de mais promessa.
Precisa de rotina documentada.

→ Diagnóstico gratuito no link da bio.
```

---

### Fórmula 2: Dado + contexto + conclusão

```
[Número ou dado impactante]

[Contexto: por que esse número existe]
[Consequência operacional]

[O que a YAV faz diferente]
```

**Exemplo:**
```
15+ marketplaces. Uma operação só.

Cada plataforma tem regra diferente, algoritmo próprio e rotina de manutenção específica.
Tratar todos igual é o primeiro erro.

Operação por canal. Processo documentado. Especialista dedicado.
```

---

### Fórmula 3: Erro comum + explicação + solução

```
[Nome do erro comum]

[Por que as pessoas cometem esse erro]
[Consequência real]

[Como evitar / solução YAV]
```

**Exemplo:**
```
Não é problema de tráfego. É problema de catálogo.

Título genérico, atributo vazio, categoria errada.
O Mercado Livre já enterrou o seu SKU antes do Ads começar a rodar.

Catálogo vem antes de tráfego. Sempre.
```

---

## Template HTML: Post Estático (1080×1080)

```html
<div style="
  width:1080px; height:1080px;
  background:#080A0E;
  padding:80px;
  display:flex; flex-direction:column; justify-content:space-between;
  position:relative; overflow:hidden;
">
  <!-- Decoração de fundo -->
  <div style="position:absolute;top:-200px;right:-200px;width:600px;height:600px;
    background:radial-gradient(circle,rgba(0,246,246,.06),transparent 70%);
    border-radius:50%;pointer-events:none;"></div>
  <div style="position:absolute;bottom:-150px;left:-100px;width:500px;height:500px;
    background:radial-gradient(circle,rgba(110,41,246,.06),transparent 70%);
    border-radius:50%;pointer-events:none;"></div>

  <!-- Linha topo -->
  <div style="position:absolute;top:0;left:0;right:0;height:3px;
    background:linear-gradient(100deg,#00F6F6 0%,#2F80FF 48%,#6E29F6 100%);"></div>

  <!-- Header: logo + badge -->
  <div style="display:flex;justify-content:space-between;align-items:center;">
    <span style="font-family:'Sora',sans-serif;font-size:24px;font-weight:900;color:#fff;">YAV</span>
    <span style="border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.04);
      border-radius:999px;font-family:'JetBrains Mono',monospace;font-size:11px;
      letter-spacing:.08em;text-transform:uppercase;color:rgba(255,255,255,.55);
      padding:6px 14px;">MARKETPLACE</span>
  </div>

  <!-- Conteúdo central -->
  <div style="flex:1;display:flex;flex-direction:column;justify-content:center;padding:40px 0;">
    <!-- Kicker -->
    <p style="font-family:'Sora',sans-serif;font-size:13px;font-weight:900;
      letter-spacing:.18em;text-transform:uppercase;color:#00F6F6;margin-bottom:24px;">
      OPERAÇÃO DIGITAL
    </p>

    <!-- Título principal -->
    <h1 style="font-family:'Sora',sans-serif;font-size:72px;font-weight:900;
      text-transform:uppercase;letter-spacing:-.03em;line-height:1.0;
      color:#fff;margin-bottom:32px;">
      CATÁLOGO<br>
      <span style="background:linear-gradient(100deg,#00F6F6 0%,#2F80FF 48%,#6E29F6 100%);
        -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;">
        VEM ANTES
      </span><br>
      DE TRÁFEGO.
    </h1>

    <!-- Corpo -->
    <p style="font-family:'Outfit',sans-serif;font-size:22px;
      color:#BFC3D1;line-height:1.6;max-width:800px;">
      Título genérico, atributo vazio, categoria errada.<br>
      O algoritmo enterra o SKU antes do Ads começar.
    </p>
  </div>

  <!-- Footer -->
  <div style="display:flex;justify-content:space-between;align-items:center;">
    <p style="font-family:'JetBrains Mono',monospace;font-size:13px;
      letter-spacing:.08em;text-transform:uppercase;color:#55556A;">
      yavdigital.com.br
    </p>
    <p style="font-family:'Outfit',sans-serif;font-size:14px;color:#8A8A99;">
      Operação de e-commerce & marketplace
    </p>
  </div>
</div>
```

---

## Template HTML: Carrossel — Capa

```html
<!-- Slide 1 de 6: Capa com tese forte -->
<div style="
  width:1080px; height:1080px; background:#080A0E;
  padding:80px; display:flex; flex-direction:column;
  justify-content:center; position:relative; overflow:hidden;
">
  <div style="position:absolute;top:0;left:0;right:0;height:3px;
    background:linear-gradient(100deg,#00F6F6,#2F80FF,#6E29F6);"></div>

  <span style="font-family:'Sora',sans-serif;font-size:24px;font-weight:900;
    color:#fff;margin-bottom:64px;">YAV</span>

  <p style="font-family:'Sora',sans-serif;font-size:13px;font-weight:900;
    letter-spacing:.18em;text-transform:uppercase;color:#00F6F6;margin-bottom:20px;">
    OPERAÇÃO DIGITAL — FIO
  </p>

  <h1 style="font-family:'Sora',sans-serif;font-size:80px;font-weight:900;
    text-transform:uppercase;letter-spacing:-.03em;line-height:1.0;color:#fff;">
    6 ERROS<br>QUE
    <span style="background:linear-gradient(100deg,#00F6F6,#2F80FF,#6E29F6);
      -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;">
      DERRUBAM
    </span><br>SUA OPERAÇÃO.
  </h1>

  <p style="font-family:'Outfit',sans-serif;font-size:22px;color:#BFC3D1;
    line-height:1.6;margin-top:32px;max-width:700px;">
    Swipe para ver os erros mais comuns em operações de e-commerce e marketplace — e como corrigir.
  </p>

  <!-- Indicador de carrossel -->
  <div style="position:absolute;bottom:60px;right:80px;
    display:flex;align-items:center;gap:8px;">
    <span style="font-family:'JetBrains Mono',monospace;font-size:13px;color:#55556A;">
      1 / 6
    </span>
    <span style="color:#00F6F6;font-size:18px;">→</span>
  </div>
</div>
```

---

## Template HTML: Carrossel — Slide de Conteúdo

```html
<!-- Slide N: Erro + explicação + solução -->
<div style="
  width:1080px; height:1080px; background:#080A0E;
  padding:80px; display:flex; flex-direction:column;
  justify-content:space-between; position:relative; overflow:hidden;
">
  <!-- Número do erro -->
  <div style="display:flex;justify-content:space-between;align-items:center;">
    <span style="font-family:'JetBrains Mono',monospace;font-size:16px;font-weight:700;
      letter-spacing:.08em;color:#8A8A99;">ERRO 02</span>
    <span style="font-family:'JetBrains Mono',monospace;font-size:13px;color:#55556A;">
      2 / 6
    </span>
  </div>

  <!-- Conteúdo central -->
  <div>
    <p style="font-family:'Sora',sans-serif;font-size:13px;font-weight:900;
      letter-spacing:.18em;text-transform:uppercase;color:#00F6F6;margin-bottom:24px;">
      ADS SEM MARGEM
    </p>
    <h2 style="font-family:'Sora',sans-serif;font-size:60px;font-weight:900;
      text-transform:uppercase;letter-spacing:-.02em;line-height:1.0;
      color:#fff;margin-bottom:32px;">
      VENDER<br>
      <span style="background:linear-gradient(100deg,#00F6F6,#2F80FF,#6E29F6);
        -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;">
        COM VOLUME
      </span><br>
      SEM LUCRO.
    </h2>

    <!-- Card de detalhe -->
    <div style="background:linear-gradient(180deg,rgba(23,26,36,.76),rgba(12,14,20,.72));
      border:1px solid rgba(255,255,255,.10);border-radius:24px;
      box-shadow:0 12px 60px rgba(0,0,0,.24);padding:32px;margin-top:8px;">
      <p style="font-family:'Outfit',sans-serif;font-size:20px;
        color:#BFC3D1;line-height:1.7;">
        Campanha rodando sem ACOS máximo definido, sem margem mínima por SKU e sem critério de pausa.
        <br><br>
        <strong style="color:#fff;">Resultado:</strong> mais pedidos, menos caixa.
      </p>
    </div>
  </div>

  <!-- Footer com logo -->
  <div style="display:flex;justify-content:space-between;align-items:center;">
    <span style="font-family:'Sora',sans-serif;font-size:20px;
      font-weight:900;color:#fff;">YAV</span>
    <p style="font-family:'JetBrains Mono',monospace;font-size:12px;
      letter-spacing:.08em;text-transform:uppercase;color:#55556A;">
      yavdigital.com.br
    </p>
  </div>
</div>
```

---

## Temas que combinam com a YAV

Priorize esses temas ao sugerir pautas:

- Erros de operação de e-commerce / marketplace
- Catálogo, ERP, integrações e como cada um afeta vendas
- Diferença entre agência generalista e operação especializada
- O que é custo real de montar time interno
- Por que catálogo vem antes de tráfego
- Ads com e sem critério de margem
- O que é visibilidade operacional de verdade
- Reporte com contexto vs. screenshot de dashboard
- Dependência de pessoa vs. processo documentado
- Como escolher marketplace por canal

---

## Regras de Copy para Posts

- Primeira frase deve parar o scroll — direta, provocativa ou com dado
- Parágrafos curtos — máximo 3 linhas
- Sem emojis excessivos — no máximo 1 a 2 por post se usados
- CTA no final: sempre diagnóstico, proposta ou link da bio
- Nunca prometer resultado garantido no copy
- Tom de quem opera, não de quem vende
