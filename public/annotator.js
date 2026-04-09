// BOEM Text Annotator — 36-category 360° system
const FISH_PATH = 'M 30 116 C 88 100, 97 26, 50 5 C 3 26, 12 100, 70 116';

// 36 categories × 10° each
const CATEGORIES = [
  'Matematika',        // 0
  'DI, ML',            // 10
  'Fizika, IT',        // 20
  'Inžinerija',        // 30
  'Elektrotechnika',   // 40
  'Mechanika',         // 50
  'Architektūra',      // 60
  'Statistika',        // 70
  'Finansai',          // 80
  'Teisė',             // 90
  'Politika',          // 100
  'Valdžia',           // 110
  'Raštas',            // 120
  'Amatai',            // 130
  'Statyba',           // 140
  'Religija',          // 150
  'Kelionės',          // 160
  'Agresija',          // 170
  'Fizinė jėga',       // 180
  'Maistas',           // 190
  'Seksas',            // 200
  'Buitis',            // 210
  'Virtuvė',           // 220
  'Globa',             // 230
  'Empatija',          // 240
  'Puošyba',           // 250
  'Muzika',            // 260
  'Dramatika',         // 270
  'Literatūra',        // 280
  'Dizainas',          // 290
  'Istorija',          // 300
  'Psichologija',      // 310
  'Filosofija',        // 320
  'Biologija',         // 330
  'Medicina',          // 340
  'Chemija',           // 350
];

// Pure zones: ±15° around each axis (30° wide)
// Transition zones: 60° between each pure pair
function angleToDir8(angle) {
  const a = ((angle % 360) + 360) % 360;
  if (a <= 15  || a > 345)  return { label: 'Mind',       color: '#3b82f6' };
  if (a <= 75)              return { label: 'Mind + Org',  color: '#6ba827' };
  if (a <= 105)             return { label: 'Org',         color: '#d97706' };
  if (a <= 165)             return { label: 'Org + Body',  color: '#c4680e' };
  if (a <= 195)             return { label: 'Body',        color: '#16a34a' };
  if (a <= 255)             return { label: 'Body + Emo',  color: '#9333ea' };
  if (a <= 285)             return { label: 'Emo',         color: '#db2777' };
  return                           { label: 'Emo + Mind',  color: '#7c3aed' };
}

// Smooth color around the circle (interpolate between BOEM quadrant colors)
function angleToColor(deg) {
  const a = ((deg % 360) + 360) % 360;
  // Saturated key colors at quadrant centers
  const stops = [
    { a:   0, r: 59,  g: 130, b: 246 },  // M blue  (stronger)
    { a:  90, r: 234, g: 170, b:  10 },  // O amber (stronger)
    { a: 180, r:  34, g: 197, b:  94 },  // B green (stronger)
    { a: 270, r: 236, g: 72,  b: 153 },  // E pink  (stronger)
    { a: 360, r: 59,  g: 130, b: 246 },  // back to M
  ];
  let i = 0;
  while (i < stops.length - 1 && stops[i + 1].a <= a) i++;
  const s1 = stops[i], s2 = stops[i + 1] || stops[0];
  const t  = (a - s1.a) / (s2.a - s1.a);
  const r  = Math.round(s1.r + t * (s2.r - s1.r));
  const g  = Math.round(s1.g + t * (s2.g - s1.g));
  const b  = Math.round(s1.b + t * (s2.b - s1.b));
  return `rgb(${r},${g},${b})`;
}

// ── Fish SVG ──────────────────────────────────────────────────────────
function fishSVG(angle, px, extraClass = 'boem-fish') {
  const w    = (px * 100 / 120).toFixed(1);
  const eyeR = (1.4 * 100 / px).toFixed(2);
  const col  = angleToColor(angle);
  return `<svg class="${extraClass}" width="${w}" height="${px}" viewBox="0 0 100 120" aria-hidden="true">
    <g transform="rotate(${angle} 50 60)">
      <path d="${FISH_PATH}" fill="none" stroke="#1c1c1c"
        stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"
        vector-effect="non-scaling-stroke"/>
      <circle cx="50" cy="34" r="${eyeR}" fill="${col}"/>
    </g>
  </svg>`;
}

// ── Compute BOEM mix from angle (cosine projection onto 4 axes) ───────
function angleToBoemMix(angle) {
  const axes = { M: 0, O: 90, B: 180, E: 270 };
  const raw = {};
  for (const [k, a] of Object.entries(axes)) {
    const diff = ((angle - a + 540) % 360) - 180; // -180..180
    raw[k] = Math.max(0, Math.cos(diff * Math.PI / 180));
  }
  const total = Object.values(raw).reduce((s, v) => s + v, 0) || 1;
  const mix = {};
  for (const k of Object.keys(raw)) mix[k] = raw[k] / total;
  return mix; // { M:0..1, O:0..1, B:0..1, E:0..1 }
}

// ── Helpers ───────────────────────────────────────────────────────────
function boemToXY(angleDeg, r, cx, cy) {
  const rad = (angleDeg - 90) * Math.PI / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function categoryForAngle(angle) {
  return CATEGORIES[Math.round(((angle % 360) + 360) % 360 / 10) % 36] || '';
}

// ── Segment splitter ──────────────────────────────────────────────────
function splitSegments(text) {
  // Try double newlines first (clean pasted text)
  let parts = text.split(/\n\s*\n/);
  // If too few, fall back to single newlines (copied from web — no empty lines)
  if (parts.length < 3) parts = text.split(/\n/);
  return parts
    .map((p, i) => ({ text: p.trim(), paraIndex: i }))
    .filter(s => s.text.length > 40)
    .slice(0, 40);
}

// ── API ───────────────────────────────────────────────────────────────
async function classify(segments, fullText) {
  const res = await fetch('/api/boem/classify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ segments: segments.map(s => s.text || s), fullText })
  });
  if (!res.ok) throw new Error('classify failed');
  return res.json();
}

// ── Article summary ───────────────────────────────────────────────────
function renderArticleSummary(article) {
  const angle = article.dominant_angle ?? 0;
  const dir   = angleToDir8(angle);
  const cat   = article.dominant_category || categoryForAngle(angle);
  // Use pre-computed boem sum from server if available, else compute from single angle
  const rawBoem = article.boem;
  const mix = rawBoem
    ? { M: rawBoem.M / 100, O: rawBoem.O / 100, B: rawBoem.B / 100, E: rawBoem.E / 100 }
    : angleToBoemMix(angle);
  const cx    = article.complexity ?? 5;

  const bars = [
    { k: 'M', label: 'Mind', col: '#3b82f6' },
    { k: 'O', label: 'Org',  col: '#d97706' },
    { k: 'B', label: 'Body', col: '#16a34a' },
    { k: 'E', label: 'Emo',  col: '#db2777' },
  ]
  .sort((a, b) => mix[b.k] - mix[a.k])
  .map(({ k, label, col }) => {
    const pct = Math.round(mix[k] * 100);
    return `<div class="tooltip-row">
      <span class="tooltip-label" style="color:${col}">${label}</span>
      <div class="tooltip-bar-bg"><div class="tooltip-bar-fill" style="width:${pct}%;background:${col}"></div></div>
      <span class="tooltip-pct">${pct}%</span>
    </div>`;
  }).join('');

  const dots = [1,2,3,4,5,6,7,8,9,10].map(i =>
    `<span class="complexity-dot ${i <= cx ? 'active' : ''}"></span>`
  ).join('');

  const bar = document.createElement('div');
  bar.className = 'article-summary';
  bar.innerHTML = `
    <div class="art-fish">${fishSVG(angle, 44)}</div>
    <div class="art-body">
      <div class="tooltip-dominant" style="color:${dir.color}">${dir.label}</div>
      <div class="tooltip-meta">${article.dominant_angle ?? angle}° · ${cat}${article.type && article.type !== 'unknown' ? ` · <em>${article.type}</em>` : ''}</div>
      ${bars}
      <div class="tooltip-complexity"><span>Sudėtingumas ${cx}/10</span><div class="complexity-dots">${dots}</div></div>
    </div>`;
  document.getElementById('output').appendChild(bar);
}

// ── Annotated text ────────────────────────────────────────────────────
function renderAnnotated(segments, classifications, fontSize = 17) {
  const container = document.getElementById('output');

  for (let ci = 0; ci < classifications.length; ci++) {
    const item  = classifications[ci];
    const start = item.paraStart ?? ci;
    const end   = Math.min(item.paraEnd ?? ci, segments.length - 1);
    const col   = angleToColor(item.angle);

    // Card with tinted background
    const chunkDiv = document.createElement('div');
    chunkDiv.className = 'boem-chunk';
    chunkDiv.style.setProperty('--chunk-col', col);
    // Derive light bg and border from rgb color
    const bgCol    = col.replace('rgb(', 'rgba(').replace(')', ', 0.08)');
    const borderCol = col.replace('rgb(', 'rgba(').replace(')', ', 0.22)');
    chunkDiv.style.setProperty('--chunk-bg', bgCol);
    chunkDiv.style.setProperty('--chunk-border', borderCol);

    // Header row: title (uppercase) + fish on the right
    const header = document.createElement('div');
    header.className = 'boem-chunk-header';

    const titleText = item.title || item.category || categoryForAngle(item.angle);
    const lbl = document.createElement('span');
    lbl.className = 'boem-chunk-title';
    lbl.textContent = titleText;
    header.appendChild(lbl);

    const tmp = document.createElement('span');
    tmp.innerHTML = fishSVG(item.angle, fontSize * 1.6);
    const svg = tmp.firstElementChild;
    svg.dataset.boem  = JSON.stringify(item);
    svg.dataset.index = ci;
    svg.addEventListener('mouseenter', showTooltip);
    svg.addEventListener('mouseleave', hideTooltip);
    svg.addEventListener('mousemove',  moveTooltip);
    svg.addEventListener('click', () => {
      const all = Array.from(document.querySelectorAll('.boem-fish[data-boem]'))
        .map(el => JSON.parse(el.dataset.boem));
      openCompass(item, ci, all);
    });
    header.appendChild(svg);

    chunkDiv.appendChild(header);

    // All paragraphs of this chunk
    for (let pi = start; pi <= end; pi++) {
      const paraDiv = document.createElement('div');
      paraDiv.className = 'boem-para';
      paraDiv.appendChild(document.createTextNode(segments[pi].text));
      chunkDiv.appendChild(paraDiv);
    }

    container.appendChild(chunkDiv);
  }
}

// ── 360 Diagram (36 sectors, 10 rings) ────────────────────────────────
function renderBoemCircle(classifications, article) {
  const wrap = document.getElementById('boem-circle-container');
  wrap.innerHTML = '';

  // Extra padding for side labels
  const S = 760, cx = 380, cy = 380;
  const rMin = 30, rMax = 240;
  const ringStep = (rMax - rMin) / 10;

  let p = [`<svg width="${S}" height="${S}" viewBox="0 0 ${S} ${S}" xmlns="http://www.w3.org/2000/svg">`];

  // ── 4 quadrant fills — boundaries at 45°,135°,225°,315° ──────────────
  // Each quadrant: 90° arc centered on BOEM axis (0°=M,90°=O,180°=B,270°=E)
  const quadrants = [
    { center: 0,   color: '#2563eb', name: 'MIND' },
    { center: 90,  color: '#d97706', name: 'ORG'  },
    { center: 180, color: '#16a34a', name: 'BODY' },
    { center: 270, color: '#db2777', name: 'EMO'  },
  ];
  for (const q of quadrants) {
    const aStart = (q.center - 45 - 90) * Math.PI / 180;
    const aEnd   = (q.center + 45 - 90) * Math.PI / 180;
    const x1 = cx + rMax * Math.cos(aStart), y1 = cy + rMax * Math.sin(aStart);
    const x2 = cx + rMax * Math.cos(aEnd),   y2 = cy + rMax * Math.sin(aEnd);
    p.push(`<path d="M${cx},${cy} L${x1.toFixed(2)},${y1.toFixed(2)} A${rMax},${rMax} 0 0,1 ${x2.toFixed(2)},${y2.toFixed(2)} Z" fill="${q.color}" opacity="0.28"/>`);
  }

  // Complexity rings (1-10)
  for (let c = 1; c <= 10; c++) {
    const r = rMin + c * ringStep;
    p.push(`<circle cx="${cx}" cy="${cy}" r="${r.toFixed(1)}" fill="none" stroke="${c % 5 === 0 ? '#bbb' : '#ddd'}" stroke-width="${c % 5 === 0 ? 1.5 : 0.7}"/>`);
  }

  // Spoke lines (36)
  for (let i = 0; i < 36; i++) {
    const rad     = (i * 10 - 90) * Math.PI / 180;
    const x2      = cx + rMax * Math.cos(rad), y2 = cy + rMax * Math.sin(rad);
    const isMajor = i % 9 === 0;
    p.push(`<line x1="${cx}" y1="${cy}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}" stroke="${isMajor ? '#aaa' : '#ddd'}" stroke-width="${isMajor ? 1.3 : 0.6}"/>`);
  }

  // Diagonal boundary lines at 45°,135°,225°,315°
  for (const a of [45, 135, 225, 315]) {
    const rad = (a - 90) * Math.PI / 180;
    p.push(`<line x1="${cx}" y1="${cy}" x2="${(cx + rMax * Math.cos(rad)).toFixed(2)}" y2="${(cy + rMax * Math.sin(rad)).toFixed(2)}" stroke="#aaa" stroke-width="1.3" stroke-dasharray="4,3"/>`);
  }

  // Category labels (outer ring, every 2nd)
  for (let i = 0; i < 36; i++) {
    if (i % 2 !== 0) continue;
    const deg = i * 10;
    const rad = (deg - 90) * Math.PI / 180;
    const rLbl = rMax + 14;
    const lx   = cx + rLbl * Math.cos(rad);
    const ly   = cy + rLbl * Math.sin(rad);
    const col  = angleToColor(deg);
    const anchor = lx < cx - 6 ? 'end' : lx > cx + 6 ? 'start' : 'middle';
    p.push(`<text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="${anchor}" dominant-baseline="middle" font-size="8.5" font-family="sans-serif" fill="${col}" font-weight="600">${CATEGORIES[i]}</text>`);
  }

  // Complexity ring labels
  for (const c of [1, 5, 10]) {
    const r = rMin + c * ringStep;
    p.push(`<text x="${(cx + 4).toFixed(1)}" y="${(cy - r - 3).toFixed(1)}" font-size="7.5" font-family="sans-serif" fill="#aaa">${c}</text>`);
  }

  // ── BOEM side labels with full descriptions ───────────────────────
  const lblDefs = [
    {
      a: 0, col: '#3b82f6',
      title: 'MIND',
      lines: ['Loginis · Analitinis', 'Mokslinis · Techninis'],
      anchor: 'middle', x: cx, y: cy - rMax - 52
    },
    {
      a: 90, col: '#d97706',
      title: 'ORG',
      lines: ['Socialinis · Koordinacinis', 'Valdymas · Komunikacija'],
      anchor: 'start', x: cx + rMax + 28, y: cy
    },
    {
      a: 180, col: '#16a34a',
      title: 'BODY',
      lines: ['Fizinis · Vykdomasis', 'Operacinis · Logistika'],
      anchor: 'middle', x: cx, y: cy + rMax + 52
    },
    {
      a: 270, col: '#db2777',
      title: 'EMO',
      lines: ['Kūrybinis · Emocinis', 'Intuityvus · Dizainas'],
      anchor: 'end', x: cx - rMax - 28, y: cy
    },
  ];
  for (const lbl of lblDefs) {
    const dy = lbl.a === 0 ? -1 : lbl.a === 180 ? 1 : 0;
    p.push(`<text x="${lbl.x}" y="${lbl.y + dy * 0}" text-anchor="${lbl.anchor}" dominant-baseline="middle" font-size="15" font-family="sans-serif" fill="${lbl.col}" font-weight="800">${lbl.title}</text>`);
    p.push(`<text x="${lbl.x}" y="${lbl.y + (lbl.a === 0 ? 20 : lbl.a === 180 ? -20 : -10)}" text-anchor="${lbl.anchor}" dominant-baseline="middle" font-size="9.5" font-family="sans-serif" fill="${lbl.col}" opacity="0.85">${lbl.lines[0]}</text>`);
    p.push(`<text x="${lbl.x}" y="${lbl.y + (lbl.a === 0 ? 33 : lbl.a === 180 ? -33 : 6)}" text-anchor="${lbl.anchor}" dominant-baseline="middle" font-size="9.5" font-family="sans-serif" fill="${lbl.col}" opacity="0.85">${lbl.lines[1]}</text>`);
  }

  // Article average dot (larger, semi-transparent)
  if (article) {
    const aAngle = article.dominant_angle ?? 0;
    const aCx    = article.complexity ?? 5;
    const aR     = rMin + aCx * ringStep;
    const aPos   = boemToXY(aAngle, aR, cx, cy);
    const aCol   = angleToColor(aAngle);
    p.push(`<circle cx="${aPos.x.toFixed(1)}" cy="${aPos.y.toFixed(1)}" r="12" fill="${aCol}" opacity="0.25" stroke="${aCol}" stroke-width="1.5"/>`);
    // mini fish at article position
    const fPx = 18, fW = fPx * 100/120;
    p.push(`<g transform="translate(${(aPos.x - fW/2).toFixed(1)}, ${(aPos.y - fPx/2).toFixed(1)}) scale(${(fPx/120).toFixed(4)})">
      <g transform="rotate(${aAngle} 50 60)">
        <path d="${FISH_PATH}" fill="none" stroke="#555" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
        <circle cx="50" cy="34" r="8" fill="#555"/>
      </g></g>`);
  }

  // Segment dots
  for (let i = 0; i < classifications.length; i++) {
    const item = classifications[i];
    const r    = rMin + (item.complexity ?? 5) * ringStep;
    const pos  = boemToXY(item.angle, r, cx, cy);
    const col  = angleToColor(item.angle);
    p.push(`<circle class="circle-dot" cx="${pos.x.toFixed(1)}" cy="${pos.y.toFixed(1)}" r="5.5"
      fill="${col}" stroke="#fff" stroke-width="1.5" opacity="0.88"
      data-index="${i}" style="cursor:pointer">
      <title>${item.category} · complexity ${item.complexity}</title>
    </circle>`);
  }

  p.push('</svg>');
  wrap.innerHTML = p.join('');

  wrap.querySelectorAll('.circle-dot').forEach(dot => {
    dot.addEventListener('click', () => {
      const idx = parseInt(dot.dataset.index, 10);
      const all = classifications;
      openCompass(classifications[idx], idx, all);
    });
  });
}

// ── Compass modal ─────────────────────────────────────────────────────
function openCompass(item, activeIdx, all) {
  const modal = document.getElementById('compass-modal');
  const S = 260, cx = 130, cy = 130;
  const rMin = 22, rMax = 96, ringStep = (rMax - rMin) / 10;

  let p = [`<svg width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">`];

  // Sector tints
  for (let i = 0; i < 36; i++) {
    const a1 = (i*10 - 90 - 5) * Math.PI / 180;
    const a2 = (i*10 - 90 + 5) * Math.PI / 180;
    const col = angleToColor(i * 10);
    const x1 = cx + rMax*Math.cos(a1), y1 = cy + rMax*Math.sin(a1);
    const x2 = cx + rMax*Math.cos(a2), y2 = cy + rMax*Math.sin(a2);
    p.push(`<path d="M${cx},${cy} L${x1.toFixed(2)},${y1.toFixed(2)} A${rMax},${rMax} 0 0,1 ${x2.toFixed(2)},${y2.toFixed(2)} Z" fill="${col}" opacity="0.07"/>`);
  }
  for (let c = 1; c <= 10; c++) {
    const r = rMin + c * ringStep;
    p.push(`<circle cx="${cx}" cy="${cy}" r="${r.toFixed(1)}" fill="none" stroke="${c%5===0?'#bbb':'#ddd'}" stroke-width="${c%5===0?1.2:0.5}"/>`);
  }
  for (let i = 0; i < 36; i++) {
    const rad = (i*10-90)*Math.PI/180;
    p.push(`<line x1="${cx}" y1="${cy}" x2="${(cx+rMax*Math.cos(rad)).toFixed(1)}" y2="${(cy+rMax*Math.sin(rad)).toFixed(1)}" stroke="${i%9===0?'#aaa':'#ddd'}" stroke-width="${i%9===0?1.2:0.5}"/>`);
  }

  // BOEM labels
  for (const [a, lbl, col] of [[0,'M','#3b82f6'],[90,'O','#d97706'],[180,'B','#16a34a'],[270,'E','#db2777']]) {
    const rad = (a-90)*Math.PI/180;
    const r   = rMax + 12;
    p.push(`<text x="${(cx+r*Math.cos(rad)).toFixed(1)}" y="${(cy+r*Math.sin(rad)).toFixed(1)}" text-anchor="middle" dominant-baseline="middle" font-size="11" font-family="sans-serif" fill="${col}" font-weight="700">${lbl}</text>`);
  }

  // Other dots (faint)
  for (let i = 0; i < all.length; i++) {
    if (i === activeIdx) continue;
    const r   = rMin + (all[i].complexity ?? 5) * ringStep;
    const pos = boemToXY(all[i].angle, r, cx, cy);
    p.push(`<circle cx="${pos.x.toFixed(1)}" cy="${pos.y.toFixed(1)}" r="3.5" fill="${angleToColor(all[i].angle)}" opacity="0.22"/>`);
  }

  // Active fish
  const r   = rMin + (item.complexity ?? 5) * ringStep;
  const pos = boemToXY(item.angle, r, cx, cy);
  const col = angleToColor(item.angle);
  p.push(`<circle cx="${pos.x.toFixed(1)}" cy="${pos.y.toFixed(1)}" r="14" fill="${col}" opacity="0.15"/>`);
  const fPx = 19, fW = fPx*100/120;
  p.push(`<g transform="translate(${(pos.x - fW/2).toFixed(1)}, ${(pos.y - fPx/2).toFixed(1)}) scale(${(fPx/120).toFixed(4)})">
    <g transform="rotate(${item.angle} 50 60)">
      <path d="${FISH_PATH}" fill="none" stroke="#1c1c1c" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="50" cy="34" r="8" fill="#1c1c1c"/>
    </g></g>`);
  p.push('</svg>');

  const mix    = angleToBoemMix(item.angle);
  const sorted = [
    { k: 'M', label: 'Mind', col: '#3b82f6' },
    { k: 'O', label: 'Org',  col: '#d97706' },
    { k: 'B', label: 'Body', col: '#16a34a' },
    { k: 'E', label: 'Emo',  col: '#db2777' },
  ].sort((a, b) => mix[b.k] - mix[a.k]);

  const dominantLabel = mix[sorted[1].k] > 0.20
    ? `${sorted[0].label} + ${sorted[1].label}` : sorted[0].label;

  const bars = sorted.map(({ k, label, col: c }) => {
    const pct = Math.round(mix[k] * 100);
    return `<div class="tooltip-row">
      <span class="tooltip-label" style="color:${c}">${label}</span>
      <div class="tooltip-bar-bg"><div class="tooltip-bar-fill" style="width:${pct}%;background:${c}"></div></div>
      <span class="tooltip-pct">${pct}%</span>
    </div>`;
  }).join('');

  const cxDots = [1,2,3,4,5,6,7,8,9,10].map(i =>
    `<span class="complexity-dot ${i <= item.complexity ? 'active' : ''}"></span>`
  ).join('');

  document.getElementById('compass-svg').innerHTML  = p.join('');
  document.getElementById('compass-text').textContent = item.text;
  document.getElementById('compass-category').innerHTML = `<span style="color:${sorted[0].col};font-weight:700">${dominantLabel}</span> <span style="color:#888;font-size:.75rem">${item.angle_pure ?? item.angle}° · ${item.category || categoryForAngle(item.angle)}</span>`;
  document.getElementById('compass-bars').innerHTML = bars;
  document.getElementById('compass-complexity').innerHTML = cxDots;

  modal.style.display = 'flex';
}

function closeCompass() { document.getElementById('compass-modal').style.display = 'none'; }

// ── Tooltip ───────────────────────────────────────────────────────────
const tooltip = document.getElementById('boem-tooltip');

function showTooltip(e) {
  const item = JSON.parse(e.currentTarget.dataset.boem);
  const mix  = angleToBoemMix(item.angle);
  const cx10 = [1,2,3,4,5,6,7,8,9,10].map(i =>
    `<span class="complexity-dot ${i <= item.complexity ? 'active' : ''}"></span>`
  ).join('');
  const sorted = [
    { k: 'M', label: 'Mind', col: '#3b82f6' },
    { k: 'O', label: 'Org',  col: '#d97706' },
    { k: 'B', label: 'Body', col: '#16a34a' },
    { k: 'E', label: 'Emo',  col: '#db2777' },
  ].sort((a, b) => mix[b.k] - mix[a.k]);

  // Dominant label: top 1 or top 2 if second > 20%
  const dominantLabel = mix[sorted[1].k] > 0.20
    ? `${sorted[0].label} + ${sorted[1].label}`
    : sorted[0].label;
  const dominantCol = sorted[0].col;

  const bars = sorted.map(({ k, label, col }) => {
    const pct = Math.round(mix[k] * 100);
    return `<div class="tooltip-row">
      <span class="tooltip-label" style="color:${col}">${label}</span>
      <div class="tooltip-bar-bg"><div class="tooltip-bar-fill" style="width:${pct}%;background:${col}"></div></div>
      <span class="tooltip-pct">${pct}%</span>
    </div>`;
  }).join('');

  tooltip.innerHTML = `
    <div class="tooltip-dominant" style="color:${dominantCol}">${dominantLabel}</div>
    <div class="tooltip-meta">${item.angle_pure ?? item.angle}° · ${item.category || ''}</div>
    ${bars}
    <div class="tooltip-complexity">
      <span>Sudėtingumas ${item.complexity}/10</span>
      <div class="complexity-dots">${cx10}</div>
    </div>`;
  tooltip.style.display = 'block';
  positionTooltip(e);
}

function hideTooltip() { tooltip.style.display = 'none'; }
function moveTooltip(e) { positionTooltip(e); }

function positionTooltip(e) {
  const tw = tooltip.offsetWidth || 200, th = tooltip.offsetHeight || 80;
  const tx = e.clientX + 14, ty = e.clientY + 14;
  tooltip.style.left = (tx + tw > window.innerWidth  ? tx - tw - 28 : tx) + 'px';
  tooltip.style.top  = (ty + th > window.innerHeight ? ty - th - 28 : ty) + 'px';
}

// ── Main ──────────────────────────────────────────────────────────────
document.getElementById('analyzeBtn').addEventListener('click', async () => {
  const text = document.getElementById('textInput').value.trim();
  if (!text) return;

  const btn    = document.getElementById('analyzeBtn');
  const status = document.getElementById('status');
  btn.disabled = true;
  status.textContent = 'Analizuojama...';
  document.getElementById('output').innerHTML = '';
  document.getElementById('boem-circle-container').innerHTML = '';

  try {
    const segments = splitSegments(text);
    if (!segments.length) { status.textContent = 'Tekstas per trumpas.'; return; }

    const result     = await classify(segments, text);
    const article    = result?.article ?? null;
    const classified = Array.isArray(result) ? result : (result?.segments ?? []);

    renderAnnotated(segments, classified);
    if (article) renderArticleSummary(article);
    renderBoemCircle(classified, article);

    status.textContent = `${classified.length} segmentai anotuoti`;
  } catch (err) {
    status.textContent = 'Klaida: ' + err.message;
    console.error(err);
  } finally {
    btn.disabled = false;
  }
});

document.getElementById('textInput').addEventListener('keydown', e => {
  if (e.key === 'Enter' && e.ctrlKey) document.getElementById('analyzeBtn').click();
});

document.getElementById('compass-close').addEventListener('click', closeCompass);
document.getElementById('compass-modal').addEventListener('click', e => {
  if (e.target === e.currentTarget) closeCompass();
});
