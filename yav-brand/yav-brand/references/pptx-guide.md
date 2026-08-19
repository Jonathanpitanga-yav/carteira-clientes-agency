# Apresentações PPTX — YAV Digital

Guia para criar arquivos `.pptx` no padrão YAV usando `pptxgenjs`.

---

## Quando usar PPTX

Use quando o cliente/destinatário precisar editar a apresentação no PowerPoint ou quando o formato HTML não for viável. Para apresentações YAV padrão, prefira HTML.

---

## Setup

```bash
npm install pptxgenjs
# ou
npm install -g pptxgenjs
```

Script base:
```bash
node yav-presentation.js
```

---

## Cores YAV para pptxgenjs

```js
const YAV = {
  cyan:     '00F6F6',
  blue:     '2F80FF',
  purple:   '6E29F6',
  bg:       '080A0E',
  surface:  '11131A',
  surface2: '171A24',
  white:    'FFFFFF',
  muted:    'BFC3D1',
  muted2:   '8A8A99',
  muted3:   '55556A',
};
```

---

## Boilerplate Base

```js
const PptxGenJS = require('pptxgenjs');
const pptx = new PptxGenJS();

// Configuração de slide
pptx.layout = 'LAYOUT_WIDE'; // 16:9 — 33.87cm × 19.05cm
pptx.author = 'YAV Digital';

const YAV = {
  cyan: '00F6F6', blue: '2F80FF', purple: '6E29F6',
  bg: '080A0E', surface: '11131A', surface2: '171A24',
  white: 'FFFFFF', muted: 'BFC3D1', muted2: '8A8A99',
};

// Função helper: adiciona fundo escuro padrão YAV
function addDarkBg(slide) {
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: '100%', h: '100%',
    fill: { color: YAV.bg }
  });
}

// Função helper: adiciona linha gradiente (topo ou rodapé)
function addGradLine(slide, y = 0) {
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: y, w: '100%', h: 0.04,
    fill: { type: 'gradient', gradientType: 'linear', angle: 90,
      stops: [
        { position: 0,   color: YAV.cyan   },
        { position: 48,  color: YAV.blue   },
        { position: 100, color: YAV.purple },
      ]
    },
    line: { type: 'none' }
  });
}

// Função helper: kicker (label acima do título)
function addKicker(slide, text, x = 0.6, y = 1.4) {
  slide.addText(text, {
    x, y, w: 8, h: 0.3,
    font_face: 'Sora', font_size: 9, bold: true,
    color: YAV.cyan, charSpacing: 3, align: 'left',
  });
}
```

---

## Templates de Slides PPTX

### Slide de Capa

```js
const slideCover = pptx.addSlide();
addDarkBg(slideCover);
addGradLine(slideCover, 0);
addGradLine(slideCover, 19.01);

// Logo
slideCover.addText('YAV', {
  x: 0.6, y: 0.5, w: 3, h: 0.5,
  font_face: 'Sora', font_size: 20, bold: true,
  color: YAV.white,
});

// Kicker
addKicker(slideCover, 'OPERAÇÃO DIGITAL', 0.6, 1.5);

// Título principal
slideCover.addText([
  { text: 'DIAGNÓSTICO DE OPERAÇÃO\nDE ', options: { color: YAV.white } },
  { text: 'MARKETPLACE', options: {
    color: YAV.cyan,
    // pptxgenjs não suporta gradiente em texto diretamente — use cyan como destaque
  }},
], {
  x: 0.6, y: 2.0, w: 18, h: 5,
  font_face: 'Sora', font_size: 44, bold: true,
  align: 'left', valign: 'top',
  paraSpaceBefore: 0, paraSpaceAfter: 6,
});

// Subtítulo
slideCover.addText(
  'Como estruturar rotina, reduzir dependência operacional\ne criar visibilidade real sobre o canal.',
  {
    x: 0.6, y: 7.0, w: 14, h: 1.5,
    font_face: 'Outfit', font_size: 16,
    color: YAV.muted, align: 'left',
  }
);

// Meta info
slideCover.addText('Cliente: Nome do Cliente  ·  Maio 2026', {
  x: 0.6, y: 8.5, w: 10, h: 0.4,
  font_face: 'Outfit', font_size: 12,
  color: YAV.muted2,
});
```

---

### Slide de Conteúdo com Cards

```js
function addCard(slide, x, y, w, h, stepNum, title, body) {
  // Fundo do card
  slide.addShape(pptx.ShapeType.roundRect, {
    x, y, w, h,
    rectRadius: 0.25,
    fill: { color: YAV.surface },
    line: { color: 'FFFFFF', transparency: 90, width: 0.5 },
  });
  // Número da etapa
  slide.addText(stepNum, {
    x: x + 0.25, y: y + 0.25, w: 1, h: 0.35,
    font_face: 'JetBrains Mono', font_size: 10, bold: true,
    color: YAV.cyan,
  });
  // Título
  slide.addText(title, {
    x: x + 0.25, y: y + 0.7, w: w - 0.5, h: 0.5,
    font_face: 'Sora', font_size: 13, bold: true,
    color: YAV.white,
  });
  // Corpo
  slide.addText(body, {
    x: x + 0.25, y: y + 1.3, w: w - 0.5, h: h - 1.6,
    font_face: 'Outfit', font_size: 11,
    color: YAV.muted, wrap: true,
  });
}

const slideContent = pptx.addSlide();
addDarkBg(slideContent);

addKicker(slideContent, 'DIAGNÓSTICO');
slideContent.addText('O QUE IDENTIFICAMOS', {
  x: 0.6, y: 1.7, w: 20, h: 1.2,
  font_face: 'Sora', font_size: 36, bold: true,
  color: YAV.white,
});

// 3 cards lado a lado
addCard(slideContent, 0.6,  3.2, 10.5, 4.5, '01', 'CATÁLOGO FRAGMENTADO',   'Títulos, descrições e atributos inconsistentes entre canais, gerando queda de indexação.');
addCard(slideContent, 11.5, 3.2, 10.5, 4.5, '02', 'ADS SEM MARGEM',          'Campanhas rodando sem critério de ACOS ou margem mínima definida.');
addCard(slideContent, 22.4, 3.2, 10.5, 4.5, '03', 'REPORTE SEM CONTEXTO',   'Números existem mas não há cadência, responsável ou critério de aceite.');
```

---

### Slide de Métricas

```js
const slideMetrics = pptx.addSlide();
addDarkBg(slideMetrics);

addKicker(slideMetrics, 'NÚMEROS QUE IMPORTAM');
slideMetrics.addText('OPERAÇÃO COMPROVADA', {
  x: 0.6, y: 1.7, w: 20, h: 1.2,
  font_face: 'Sora', font_size: 36, bold: true,
  color: YAV.white,
});

const metrics = [
  { num: '250+', label: 'projetos estruturados' },
  { num: 'R$1bi+', label: 'volume gerenciado' },
  { num: '15+', label: 'marketplaces ativos' },
  { num: '7+', label: 'anos de operação' },
];

metrics.forEach((m, i) => {
  const x = 0.6 + i * 8.2;
  // Card fundo
  slideMetrics.addShape(pptx.ShapeType.roundRect, {
    x, y: 3.2, w: 7.8, h: 4,
    rectRadius: 0.25,
    fill: { color: YAV.surface },
    line: { color: 'FFFFFF', transparency: 90, width: 0.5 },
  });
  // Número em destaque
  slideMetrics.addText(m.num, {
    x: x + 0.3, y: 3.5, w: 7.2, h: 2.0,
    font_face: 'Sora', font_size: 48, bold: true,
    color: YAV.cyan, // pptxgenjs não suporta gradiente em texto; use cyan
    align: 'center',
  });
  // Label
  slideMetrics.addText(m.label, {
    x: x + 0.3, y: 5.6, w: 7.2, h: 0.8,
    font_face: 'Outfit', font_size: 12,
    color: YAV.muted, align: 'center',
  });
});
```

---

### Slide CTA Final

```js
const slideCta = pptx.addSlide();
addDarkBg(slideCta);
addGradLine(slideCta, 0);
addGradLine(slideCta, 19.01);

// Glow decorativo (retângulo desfocado aproximado)
slideCta.addShape(pptx.ShapeType.ellipse, {
  x: 8, y: 2, w: 16, h: 16,
  fill: { color: '001A1A', transparency: 60 },
  line: { type: 'none' },
});

// Logo
slideCta.addText('YAV', {
  x: 0, y: 0.5, w: '100%', h: 0.8,
  font_face: 'Sora', font_size: 20, bold: true,
  color: YAV.white, align: 'center',
});

addKicker(slideCta, 'PRÓXIMO PASSO', 10, 2.2);

// Título
slideCta.addText('DIAGNÓSTICO\nGRATUITO', {
  x: 0, y: 3.0, w: '100%', h: 4,
  font_face: 'Sora', font_size: 52, bold: true,
  color: YAV.cyan, align: 'center',
});

// Subtítulo
slideCta.addText(
  '30 minutos para entender onde está o gargalo e o que priorizar.\nSem apresentação pronta, sem proposta empurrada.',
  {
    x: 4, y: 7.5, w: 24, h: 1.5,
    font_face: 'Outfit', font_size: 16,
    color: YAV.muted, align: 'center',
  }
);

// CTA
slideCta.addShape(pptx.ShapeType.roundRect, {
  x: 11, y: 9.5, w: 10, h: 0.8,
  rectRadius: 0.4,
  fill: { type: 'gradient', gradientType: 'linear', angle: 90,
    stops: [
      { position: 0,   color: YAV.cyan   },
      { position: 48,  color: YAV.blue   },
      { position: 100, color: YAV.purple },
    ]
  },
  line: { type: 'none' },
});
slideCta.addText('AGENDAR DIAGNÓSTICO', {
  x: 11, y: 9.5, w: 10, h: 0.8,
  font_face: 'Sora', font_size: 11, bold: true,
  color: '030507', align: 'center', valign: 'middle',
  charSpacing: 1.5,
});

// Salvar
pptx.writeFile({ fileName: 'yav-apresentacao.pptx' })
  .then(() => console.log('✓ yav-apresentacao.pptx gerado'));
```

---

## Notas importantes

- pptxgenjs **não suporta gradiente em texto** — use `YAV.cyan` (`#00F6F6`) como alternativa ao gradiente em números e palavras-chave
- Para fontes Sora/Outfit/JetBrains Mono funcionarem no PPTX, elas precisam estar instaladas no sistema do usuário ou no computador onde a apresentação será aberta
- **Alternativa de fonte segura**: se as fontes não estiverem disponíveis, use `Calibri` para corpo e `Arial Black` para títulos
- Prefira criar o arquivo via `node script.js` no diretório corrente
