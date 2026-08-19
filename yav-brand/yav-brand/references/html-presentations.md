# Apresentações HTML — YAV Digital

Guia técnico completo para criar apresentações HTML profissionais no padrão YAV.

---

## Estrutura de Arquivo

Cada apresentação é um único arquivo `.html` standalone — funciona sem servidor, sem dependências locais. Use CDNs para tudo.

**CDNs obrigatórias:**
- Google Fonts (Sora, Outfit, JetBrains Mono)
- Chart.js se houver gráficos: `https://cdn.jsdelivr.net/npm/chart.js`

---

## Boilerplate Base

Use este template como ponto de partida para toda apresentação HTML:

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>YAV — [Título da Apresentação]</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;700;800;900&family=Outfit:wght@400;500;600&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet">
<style>
  /* ── Reset ── */
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  /* ── Tokens YAV ── */
  :root {
    --cyan:       #00F6F6;
    --blue:       #2F80FF;
    --purple:     #6E29F6;
    --bg:         #080A0E;
    --deep:       #050609;
    --surface:    #11131A;
    --surface2:   #171A24;
    --surface3:   #1E2230;
    --white:      #FFFFFF;
    --muted:      #BFC3D1;
    --muted2:     #8A8A99;
    --muted3:     #55556A;
    --border:     rgba(255,255,255,.10);
    --border-s:   rgba(255,255,255,.18);
    --border-c:   rgba(0,246,246,.25);
    --grad:       linear-gradient(100deg, #00F6F6 0%, #2F80FF 48%, #6E29F6 100%);
    --card-bg:    linear-gradient(180deg, rgba(23,26,36,.76), rgba(12,14,20,.72));
    --shadow:     0 12px 60px rgba(0,0,0,.24);
    --shadow-lg:  0 22px 76px rgba(0,0,0,.30);
  }

  /* ── Base ── */
  html { scroll-snap-type: y mandatory; overflow-y: scroll; height: 100%; }
  body { background: var(--bg); color: var(--white); font-family: 'Outfit', sans-serif; }

  /* ── Slides ── */
  .slide {
    min-height: 100vh;
    scroll-snap-align: start;
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 72px 96px;
    position: relative;
    overflow: hidden;
  }

  /* ── Tipografia ── */
  .kicker {
    font-family: 'Sora', sans-serif;
    font-size: 11px;
    font-weight: 900;
    letter-spacing: .18em;
    text-transform: uppercase;
    color: var(--cyan);
    margin-bottom: 16px;
  }
  .hero-title {
    font-family: 'Sora', sans-serif;
    font-size: clamp(42px, 6vw, 80px);
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: -.03em;
    line-height: 1.0;
    color: var(--white);
    margin-bottom: 24px;
  }
  .section-title {
    font-family: 'Sora', sans-serif;
    font-size: clamp(28px, 4vw, 52px);
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: -.02em;
    line-height: 1.05;
    color: var(--white);
    margin-bottom: 16px;
  }
  .subtitle {
    font-family: 'Outfit', sans-serif;
    font-size: clamp(16px, 1.8vw, 20px);
    font-weight: 400;
    color: var(--muted);
    line-height: 1.6;
    max-width: 640px;
    margin-bottom: 40px;
  }
  .body-text {
    font-family: 'Outfit', sans-serif;
    font-size: 16px;
    font-weight: 400;
    color: var(--muted);
    line-height: 1.7;
  }
  .label {
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: .08em;
    text-transform: uppercase;
    color: var(--muted2);
  }

  /* ── Gradiente em texto ── */
  .grad-text {
    background: var(--grad);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  /* ── Card YAV ── */
  .card {
    background: var(--card-bg);
    border: 1px solid var(--border);
    border-radius: 24px;
    box-shadow: var(--shadow);
    padding: 32px;
  }
  .card-premium {
    background: var(--card-bg);
    border-radius: 24px;
    box-shadow: var(--shadow-lg);
    padding: 32px;
    position: relative;
  }
  .card-premium::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 24px;
    padding: 1px;
    background: var(--grad);
    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    pointer-events: none;
  }

  /* ── Linha divisória com gradiente ── */
  .grad-line {
    height: 1px;
    background: var(--grad);
    border: none;
    margin: 40px 0;
    opacity: .6;
  }

  /* ── Badge / Tag ── */
  .badge {
    display: inline-block;
    border: 1px solid rgba(255,255,255,.12);
    background: rgba(255,255,255,.04);
    border-radius: 999px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    letter-spacing: .08em;
    text-transform: uppercase;
    color: rgba(255,255,255,.55);
    padding: 5px 12px;
  }

  /* ── Métrica grande ── */
  .metric-number {
    font-family: 'Sora', sans-serif;
    font-size: clamp(48px, 7vw, 96px);
    font-weight: 900;
    line-height: 1.0;
  }
  .metric-label {
    font-family: 'Outfit', sans-serif;
    font-size: 16px;
    color: var(--muted);
    margin-top: 8px;
  }

  /* ── Botões ── */
  .btn-primary {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: var(--grad);
    color: #030507;
    border-radius: 999px;
    font-family: 'Sora', sans-serif;
    font-size: 13px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: .075em;
    padding: 14px 32px;
    border: none;
    cursor: pointer;
    text-decoration: none;
  }
  .btn-secondary {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: rgba(255,255,255,.04);
    border: 1px solid var(--border-s);
    color: var(--white);
    border-radius: 999px;
    font-family: 'Sora', sans-serif;
    font-size: 13px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .075em;
    padding: 14px 32px;
    cursor: pointer;
    text-decoration: none;
  }

  /* ── Grid layouts ── */
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
  .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 24px; }
  .grid-4 { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 20px; }

  /* ── Número de etapa ── */
  .step-number {
    font-family: 'JetBrains Mono', monospace;
    font-size: 13px;
    font-weight: 700;
    color: var(--cyan);
    margin-bottom: 12px;
    letter-spacing: .08em;
  }

  /* ── Tabela comparativa ── */
  .compare-table { width: 100%; border-collapse: collapse; }
  .compare-table th {
    font-family: 'Sora', sans-serif;
    font-size: 12px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: .1em;
    padding: 16px 20px;
    text-align: left;
    border-bottom: 1px solid var(--border);
    color: var(--muted2);
  }
  .compare-table th.highlight { color: var(--cyan); }
  .compare-table td {
    font-family: 'Outfit', sans-serif;
    font-size: 15px;
    padding: 14px 20px;
    border-bottom: 1px solid var(--border);
    color: var(--muted);
  }
  .compare-table tr:last-child td { border-bottom: none; }
  .compare-table td.highlight { color: var(--white); font-weight: 600; }

  /* ── Decoração de fundo ── */
  .bg-glow {
    position: absolute;
    border-radius: 50%;
    filter: blur(120px);
    pointer-events: none;
    z-index: 0;
  }
  .bg-glow-cyan  { background: rgba(0,246,246,.06); }
  .bg-glow-purple { background: rgba(110,41,246,.06); }

  /* ── Conteúdo acima da decoração ── */
  .slide > *:not(.bg-glow) { position: relative; z-index: 1; }

  /* ── Navegação ── */
  .nav {
    position: fixed;
    bottom: 32px;
    right: 40px;
    display: flex;
    align-items: center;
    gap: 12px;
    z-index: 100;
  }
  .nav-btn {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: rgba(255,255,255,.06);
    border: 1px solid var(--border-s);
    color: var(--white);
    font-size: 18px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all .2s;
  }
  .nav-btn:hover { background: rgba(255,255,255,.12); }
  .nav-counter {
    font-family: 'JetBrains Mono', monospace;
    font-size: 12px;
    color: var(--muted2);
    min-width: 40px;
    text-align: center;
  }

  /* ── Progress bar ── */
  .progress {
    position: fixed;
    top: 0;
    left: 0;
    height: 2px;
    background: var(--grad);
    z-index: 100;
    transition: width .3s;
  }

  /* ── Slide número (canto superior) ── */
  .slide-num {
    position: absolute;
    top: 32px;
    right: 40px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    color: var(--muted3);
    letter-spacing: .08em;
  }

  /* ── Print / Export ── */
  @media print {
    html { scroll-snap-type: none; }
    .slide { min-height: 100vh; page-break-after: always; }
    .nav, .progress { display: none; }
  }
</style>
</head>
<body>

<!-- Progress bar -->
<div class="progress" id="progress"></div>

<!-- Navegação -->
<nav class="nav">
  <button class="nav-btn" id="prev" onclick="navigate(-1)">←</button>
  <span class="nav-counter" id="counter">1 / 1</span>
  <button class="nav-btn" id="next" onclick="navigate(1)">→</button>
</nav>

<!-- SLIDES AQUI -->

<script>
  const slides = document.querySelectorAll('.slide');
  let current = 0;

  function navigate(dir) {
    current = Math.max(0, Math.min(slides.length - 1, current + dir));
    slides[current].scrollIntoView({ behavior: 'smooth' });
    update();
  }

  function update() {
    document.getElementById('counter').textContent = `${current + 1} / ${slides.length}`;
    document.getElementById('progress').style.width = `${((current + 1) / slides.length) * 100}%`;
  }

  // Intersection observer para atualizar contador ao scrollar
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        current = Array.from(slides).indexOf(e.target);
        update();
      }
    });
  }, { threshold: 0.5 });

  slides.forEach(s => observer.observe(s));

  // Teclado
  document.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') navigate(1);
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') navigate(-1);
  });

  update();
</script>
</body>
</html>
```

---

## Templates de Slides

### Slide de Capa

```html
<section class="slide" style="background: var(--bg);">
  <!-- Decoração de fundo -->
  <div class="bg-glow bg-glow-cyan" style="width:600px;height:600px;top:-200px;right:-100px;"></div>
  <div class="bg-glow bg-glow-purple" style="width:400px;height:400px;bottom:-100px;left:100px;"></div>

  <!-- Linha superior com gradiente -->
  <div style="position:absolute;top:0;left:0;right:0;height:2px;background:var(--grad);"></div>

  <!-- Logo placeholder -->
  <div style="margin-bottom:64px;">
    <span style="font-family:'Sora',sans-serif;font-size:22px;font-weight:900;color:var(--white);letter-spacing:-.02em;">YAV</span>
  </div>

  <!-- Kicker -->
  <p class="kicker">OPERAÇÃO DIGITAL</p>

  <!-- Título hero -->
  <h1 class="hero-title">
    DIAGNÓSTICO<br>
    DE <span class="grad-text">OPERAÇÃO</span><br>
    DE MARKETPLACE
  </h1>

  <!-- Subtítulo -->
  <p class="subtitle">
    Como estruturar rotina, reduzir dependência operacional e criar visibilidade real sobre o canal.
  </p>

  <!-- Meta info -->
  <div style="display:flex;gap:32px;align-items:center;margin-top:16px;">
    <div>
      <p class="label">Cliente</p>
      <p style="font-family:'Outfit',sans-serif;font-size:15px;color:var(--white);margin-top:4px;">Nome do Cliente</p>
    </div>
    <div style="width:1px;height:32px;background:var(--border);"></div>
    <div>
      <p class="label">Data</p>
      <p style="font-family:'Outfit',sans-serif;font-size:15px;color:var(--white);margin-top:4px;">Maio 2026</p>
    </div>
  </div>

  <!-- Linha rodapé -->
  <div style="position:absolute;bottom:0;left:0;right:0;height:1px;background:var(--grad);opacity:.4;"></div>
</section>
```

---

### Slide de Conteúdo (com cards)

```html
<section class="slide" style="background:var(--bg);">
  <div class="bg-glow bg-glow-purple" style="width:500px;height:500px;top:-150px;right:-150px;"></div>

  <span class="slide-num">02</span>
  <p class="kicker">DIAGNÓSTICO</p>
  <h2 class="section-title">O QUE<br><span class="grad-text">IDENTIFICAMOS</span></h2>

  <div class="grid-3" style="margin-top:40px;">
    <div class="card">
      <div class="step-number">01</div>
      <h3 style="font-family:'Sora',sans-serif;font-size:18px;font-weight:800;color:var(--white);text-transform:uppercase;margin-bottom:12px;">Catálogo fragmentado</h3>
      <p class="body-text" style="font-size:15px;">Títulos, descrições e atributos inconsistentes entre canais, gerando queda de indexação e aumento de rejeição.</p>
    </div>
    <div class="card">
      <div class="step-number">02</div>
      <h3 style="font-family:'Sora',sans-serif;font-size:18px;font-weight:800;color:var(--white);text-transform:uppercase;margin-bottom:12px;">Ads sem margem</h3>
      <p class="body-text" style="font-size:15px;">Campanhas rodando sem critério de ACOS ou margem mínima definida, gerando volume sem rentabilidade.</p>
    </div>
    <div class="card">
      <div class="step-number">03</div>
      <h3 style="font-family:'Sora',sans-serif;font-size:18px;font-weight:800;color:var(--white);text-transform:uppercase;margin-bottom:12px;">Reporte sem contexto</h3>
      <p class="body-text" style="font-size:15px;">Números existem mas não há cadência, responsável ou critério de aceite para tomar decisão com base neles.</p>
    </div>
  </div>
</section>
```

---

### Slide de Métricas

```html
<section class="slide" style="background:var(--bg);">
  <div class="bg-glow bg-glow-cyan" style="width:700px;height:700px;top:-300px;right:-200px;"></div>

  <span class="slide-num">03</span>
  <p class="kicker">NÚMEROS QUE IMPORTAM</p>
  <h2 class="section-title" style="margin-bottom:48px;">OPERAÇÃO<br><span class="grad-text">COMPROVADA</span></h2>

  <div class="grid-4">
    <div class="card" style="text-align:center;">
      <div class="metric-number grad-text">250+</div>
      <p class="metric-label">projetos estruturados</p>
    </div>
    <div class="card" style="text-align:center;">
      <div class="metric-number grad-text">R$1bi+</div>
      <p class="metric-label">volume gerenciado</p>
    </div>
    <div class="card" style="text-align:center;">
      <div class="metric-number grad-text">15+</div>
      <p class="metric-label">marketplaces ativos</p>
    </div>
    <div class="card" style="text-align:center;">
      <div class="metric-number grad-text">7+</div>
      <p class="metric-label">anos de operação</p>
    </div>
  </div>

  <p class="subtitle" style="margin-top:40px;font-size:15px;">
    Experiência acumulada em implantação, marketplace, Ads, catálogo e gestão contínua.
  </p>
</section>
```

---

### Slide de Plano de Ação (etapas numeradas)

```html
<section class="slide" style="background:var(--bg);">
  <span class="slide-num">05</span>
  <p class="kicker">COMO EXECUTAMOS</p>
  <h2 class="section-title" style="margin-bottom:48px;">PLANO DE<br><span class="grad-text">AÇÃO</span></h2>

  <div style="display:flex;flex-direction:column;gap:16px;max-width:800px;">
    <!-- Etapa -->
    <div style="display:flex;align-items:flex-start;gap:24px;padding:24px;background:var(--surface);border-radius:18px;border:1px solid var(--border);">
      <div style="font-family:'JetBrains Mono',monospace;font-size:28px;font-weight:700;background:var(--grad);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;min-width:48px;">01</div>
      <div>
        <h3 style="font-family:'Sora',sans-serif;font-size:17px;font-weight:800;text-transform:uppercase;color:var(--white);margin-bottom:6px;">Imersão</h3>
        <p class="body-text" style="font-size:15px;">Mapeamento completo da operação atual: canais, catálogo, integrações, equipe e processos existentes.</p>
      </div>
    </div>
    <div style="display:flex;align-items:flex-start;gap:24px;padding:24px;background:var(--surface);border-radius:18px;border:1px solid var(--border);">
      <div style="font-family:'JetBrains Mono',monospace;font-size:28px;font-weight:700;background:var(--grad);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;min-width:48px;">02</div>
      <div>
        <h3 style="font-family:'Sora',sans-serif;font-size:17px;font-weight:800;text-transform:uppercase;color:var(--white);margin-bottom:6px;">Priorização</h3>
        <p class="body-text" style="font-size:15px;">Critério objetivo para definir o que corrigir primeiro — por impacto operacional e financeiro.</p>
      </div>
    </div>
    <div style="display:flex;align-items:flex-start;gap:24px;padding:24px;background:var(--surface);border-radius:18px;border:1px solid var(--border);">
      <div style="font-family:'JetBrains Mono',monospace;font-size:28px;font-weight:700;background:var(--grad);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;min-width:48px;">03</div>
      <div>
        <h3 style="font-family:'Sora',sans-serif;font-size:17px;font-weight:800;text-transform:uppercase;color:var(--white);margin-bottom:6px;">Execução registrada</h3>
        <p class="body-text" style="font-size:15px;">Cada entrega documentada. Responsável por tarefa. Critério de aceite definido antes de começar.</p>
      </div>
    </div>
    <div style="display:flex;align-items:flex-start;gap:24px;padding:24px;background:var(--surface);border-radius:18px;border:1px solid var(--border);">
      <div style="font-family:'JetBrains Mono',monospace;font-size:28px;font-weight:700;background:var(--grad);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;min-width:48px;">04</div>
      <div>
        <h3 style="font-family:'Sora',sans-serif;font-size:17px;font-weight:800;text-transform:uppercase;color:var(--white);margin-bottom:6px;">Reporte com contexto</h3>
        <p class="body-text" style="font-size:15px;">Cadência de acompanhamento com número, contexto e decisão — não só screenshot de dashboard.</p>
      </div>
    </div>
  </div>
</section>
```

---

### Slide Comparativo (YAV vs. alternativas)

```html
<section class="slide" style="background:var(--bg);">
  <span class="slide-num">06</span>
  <p class="kicker">POR QUE A YAV</p>
  <h2 class="section-title" style="margin-bottom:40px;"><span class="grad-text">ESPECIALIZAÇÃO</span><br>QUE FAZ DIFERENÇA</h2>

  <div class="card" style="overflow:hidden;padding:0;">
    <table class="compare-table">
      <thead>
        <tr>
          <th>Critério</th>
          <th>Time interno</th>
          <th>Agência generalista</th>
          <th class="highlight">YAV</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong style="color:var(--white);">Especialidade</strong></td>
          <td>Generalista</td>
          <td>Multi-vertical</td>
          <td class="highlight">E-commerce & marketplace</td>
        </tr>
        <tr>
          <td><strong style="color:var(--white);">Documentação</strong></td>
          <td>Depende da pessoa</td>
          <td>Relatório pontual</td>
          <td class="highlight">Processo registrado</td>
        </tr>
        <tr>
          <td><strong style="color:var(--white);">Continuidade</strong></td>
          <td>Risco de saída</td>
          <td>Alta rotatividade</td>
          <td class="highlight">Equipe dedicada</td>
        </tr>
        <tr>
          <td><strong style="color:var(--white);">Visibilidade</strong></td>
          <td>Reunião eventual</td>
          <td>Dashboard genérico</td>
          <td class="highlight">Reporte com contexto</td>
        </tr>
      </tbody>
    </table>
  </div>
</section>
```

---

### Slide de CTA Final

```html
<section class="slide" style="background:var(--deep);text-align:center;align-items:center;">
  <!-- Linha topo -->
  <div style="position:absolute;top:0;left:0;right:0;height:2px;background:var(--grad);"></div>
  <div class="bg-glow bg-glow-cyan" style="width:600px;height:600px;top:50%;left:50%;transform:translate(-50%,-50%);"></div>
  <div class="bg-glow bg-glow-purple" style="width:400px;height:400px;bottom:-100px;right:0;"></div>

  <!-- Logo -->
  <div style="margin-bottom:48px;">
    <span style="font-family:'Sora',sans-serif;font-size:22px;font-weight:900;color:var(--white);">YAV</span>
  </div>

  <p class="kicker" style="text-align:center;">PRÓXIMO PASSO</p>
  <h2 class="hero-title" style="text-align:center;font-size:clamp(32px,5vw,64px);">
    DIAGNÓSTICO<br><span class="grad-text">GRATUITO</span>
  </h2>

  <p class="subtitle" style="text-align:center;margin:0 auto 40px;">
    30 minutos para entender onde está o gargalo e o que priorizar.<br>Sem apresentação pronta, sem proposta empurrada.
  </p>

  <div style="display:flex;gap:16px;justify-content:center;">
    <a href="#" class="btn-primary">Agendar Diagnóstico</a>
    <a href="#" class="btn-secondary">Falar com a YAV</a>
  </div>

  <!-- Rodapé -->
  <div style="position:absolute;bottom:32px;left:0;right:0;text-align:center;">
    <p class="label">yavdigital.com.br</p>
  </div>
</section>
```

---

## Gráficos com Chart.js

Adicione no `<head>`:
```html
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
```

### Gráfico de barras (padrão YAV)
```html
<canvas id="myChart" style="max-height:300px;"></canvas>
<script>
new Chart(document.getElementById('myChart'), {
  type: 'bar',
  data: {
    labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai'],
    datasets: [{
      label: 'GMV',
      data: [120, 190, 170, 240, 280],
      backgroundColor: 'rgba(0,246,246,.15)',
      borderColor: '#00F6F6',
      borderWidth: 1.5,
      borderRadius: 6,
    }]
  },
  options: {
    plugins: { legend: { labels: { color: '#BFC3D1', font: { family: 'Outfit' } } } },
    scales: {
      x: { ticks: { color: '#8A8A99' }, grid: { color: 'rgba(255,255,255,.06)' } },
      y: { ticks: { color: '#8A8A99' }, grid: { color: 'rgba(255,255,255,.06)' } }
    }
  }
});
</script>
```

---

## Boas Práticas

- **Sempre full-screen**: cada slide ocupa 100vh — nunca corte conteúdo
- **Máximo 6 cards por slide**: se precisar de mais, divida em dois slides
- **Textos curtos**: títulos até 6 palavras, corpo até 3 linhas por bloco
- **Uma cor de destaque por slide**: não misture cyan e roxo como destaques no mesmo slide
- **Decoração sutil**: os `bg-glow` devem ter opacidade baixa (4–8%), nunca chamativa
- **Teste em 1920×1080**: é o formato padrão de apresentação em tela
- **Inclua print CSS**: sempre inclua o bloco `@media print` para exportação em PDF
