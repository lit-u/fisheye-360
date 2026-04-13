// Fisheye-360 — POST /api/classify
// Vercel serverless function (ESM)
// Body: { text: string } or { segments: string[] }
// Returns: { article, segments }

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

const CATEGORIES_EN = [
  'Mathematics','AI, Tech','Physics, IT','Engineering','Electronics','Mechanics',
  'Architecture','Statistics','Finance','Law','Politics','Governance',
  'Writing','Crafts','Construction','Religion','Travel','Aggression',
  'Physical Force','Food','Sex, Family','Home','Cooking','Care',
  'Empathy','Fashion','Music','Drama','Literature','Media, Design',
  'History','Psychology','Philosophy','Biology','Medicine','Chemistry',
];

const SYSTEM_PROMPT = `You are a Fisheye 360 text analyzer. The 360° circle has 36 categories (every 10°):
0: Mathematics, 10: AI/Tech, 20: Physics/IT, 30: Engineering, 40: Electronics, 50: Mechanics,
60: Architecture, 70: Statistics, 80: Finance, 90: Law, 100: Politics, 110: Governance,
120: Writing, 130: Crafts, 140: Construction, 150: Religion, 160: Travel, 170: Aggression,
180: Physical Force, 190: Food, 200: Sex/Family, 210: Home, 220: Cooking, 230: Care,
240: Empathy, 250: Fashion, 260: Music, 270: Drama, 280: Literature, 290: Media/Design,
300: History/Journalism, 310: Psychology, 320: Philosophy, 330: Biology, 340: Medicine, 350: Chemistry

4 axes: MIND(0°)=abstract reasoning, math, algorithms. ORG(90°)=law, politics, money, management. BODY(180°)=physical world, sports, food. EMO(270°)=music, art, psychology, philosophy.

Rules:
- Celebrities, awards, entertainment → 270° Drama or 300° History/Journalism, NEVER Mind
- Event logistics (tickets, dates) → 110° Governance
- Neuroscience about behavior/mental health → 310° Psychology
- Journalistic science article → 300° History/Journalism
- company, revenue, market, business → 80° Finance, NOT Politics

Complexity 1–10: 1=child, 3=teenager, 5=educated adult, 7=professional, 9=world expert. News=2-3, journalism=4-6, academic=8-10.
Task: split N paragraphs into 3–7 thematic groups. Ranges contiguous, cover ALL paragraphs 0 to N-1. Title: 3–6 words in the SAME LANGUAGE as the text.
Return ONLY JSON (no markdown): {"type":"informational","segments":[{"from":0,"to":2,"title":"Short title","angle":310,"category":"Psychology","complexity":5}]}`;

// ── Keyword fallback (no LLM) ─────────────────────────────────────────
const KW_MAP = [
  { angle: 0,   words: ['math','algebra','theorem','calculus','formula','logic'] },
  { angle: 10,  words: ['machine learning','neural network','artificial intelligence','ai','llm','algorithm','gpt','deep learning'] },
  { angle: 20,  words: ['programming','code','software','hardware','server','javascript','python','physics'] },
  { angle: 30,  words: ['engineering','infrastructure','robotics','automation','system design'] },
  { angle: 80,  words: ['finance','investment','economy','market','business','revenue','company','stock'] },
  { angle: 90,  words: ['law','legal','contract','court','regulation','attorney','legislation'] },
  { angle: 100, words: ['politics','election','president','parliament','government','nato','geopolitics'] },
  { angle: 110, words: ['administration','ministry','management','governance','institution','policy'] },
  { angle: 160, words: ['travel','tourism','nature','holiday','destination','country'] },
  { angle: 170, words: ['war','violence','aggression','conflict','weapon','military'] },
  { angle: 180, words: ['sport','training','athlete','champion','match','fitness','race'] },
  { angle: 190, words: ['food','restaurant','recipe','nutrition','meal','diet'] },
  { angle: 260, words: ['music','song','concert','rhythm','dance','singer','band','album'] },
  { angle: 270, words: ['drama','film','series','actor','celebrity','award','entertainment'] },
  { angle: 280, words: ['literature','book','novel','poetry','author','story'] },
  { angle: 290, words: ['media','design','video','content','influencer','social media'] },
  { angle: 300, words: ['news','report','journalism','journalist','history','celebrity'] },
  { angle: 310, words: ['psychology','behavior','trauma','therapy','stress','burnout','brain','mental health'] },
  { angle: 320, words: ['philosophy','ethics','meaning','existence','values','morality'] },
  { angle: 330, words: ['biology','genetics','evolution','cell','organism','bacteria','dna'] },
  { angle: 340, words: ['medicine','health','disease','treatment','doctor','symptom','diagnosis'] },
  { angle: 350, words: ['chemistry','molecule','reaction','laboratory','enzyme','biotech'] },
];

function keywordAngle(text) {
  const t = text.toLowerCase();
  let best = { angle: 300, score: 0 };
  for (const e of KW_MAP) {
    const score = e.words.filter(w => t.includes(w)).length;
    if (score > best.score) best = { angle: e.angle, score };
  }
  const expertAngles = new Set([0,10,20,30,320,330,340,350]);
  const base = expertAngles.has(best.angle) ? 6 : 4;
  const words = t.split(/\s+/).length;
  return { angle: best.angle, category: CATEGORIES_EN[best.angle/10], complexity: Math.min(9, Math.max(2, base + (words > 300 ? 1 : 0))) };
}

function fallback(paras) {
  const segs = [];
  for (let i = 0; i < paras.length; i++) {
    const kw = keywordAngle(paras[i]);
    const last = segs[segs.length - 1];
    if (last && last.angle === kw.angle) { last.paraEnd = i; last.text += '\n\n' + paras[i]; }
    else segs.push({ text: paras[i], paraStart: i, paraEnd: i, title: null, ...kw, angle_pure: kw.angle });
  }
  const best = segs.reduce((a, b) => b.complexity > a.complexity ? b : a, segs[0]);
  return { article: { dominant_angle: best.angle, dominant_category: best.category, complexity: best.complexity, type: 'unknown' }, segments: segs };
}

// ── Groq call ─────────────────────────────────────────────────────────
async function groqClassify(paras) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return fallback(paras);

  const paraList = paras.map((p, i) => `${i}: ${p.slice(0, 200)}`).join('\n');
  const res = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant', temperature: 0.1, max_tokens: 1200,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user',   content: `${paras.length} paragraphs (0–${paras.length-1}):\n${paraList}` }
      ]
    })
  });
  if (!res.ok) throw new Error('Groq error ' + res.status);
  const data   = await res.json();
  const raw    = data.choices?.[0]?.message?.content || '';
  const parsed = JSON.parse(raw.replace(/```json\n?/g,'').replace(/```\n?/g,'').trim());
  const ranges = parsed?.segments;
  if (!Array.isArray(ranges) || ranges.length < 1) throw new Error('bad response');

  const out = ranges.map(({ from, to, title, angle, complexity }) => {
    const a = Math.round((angle ?? 300) / 10) * 10 % 360;
    return {
      text: paras.slice(from, Math.min(to, paras.length-1)+1).join('\n\n'),
      paraStart: from, paraEnd: Math.min(to, paras.length-1),
      title: title || null, angle: a, angle_pure: a,
      category: CATEGORIES_EN[a/10] || 'Unknown',
      complexity: Math.min(10, Math.max(1, complexity ?? 5))
    };
  });

  // Article BOEM profile
  function boemRaw(angle) {
    const axes = { M:0, O:90, B:180, E:270 }, r = {};
    for (const [k,a] of Object.entries(axes)) { const d=((angle-a+540)%360)-180; r[k]=Math.max(0,Math.cos(d*Math.PI/180)); }
    return r;
  }
  const bs = {M:0,O:0,B:0,E:0}; let tw = 0;
  for (const s of out) {
    const w = (s.complexity??5)*((s.paraEnd-s.paraStart)+1);
    const m = boemRaw(s.angle);
    for (const k of Object.keys(bs)) bs[k] += m[k]*w;
    tw += w;
  }
  for (const k of Object.keys(bs)) bs[k] = Math.round(bs[k]/tw*100);
  const artAngle = out.reduce((b,s)=>((s.paraEnd-s.paraStart)+1)>((b.paraEnd-b.paraStart)+1)?s:b, out[0]).angle;
  const artCx    = Math.round(out.reduce((s,seg)=>s+seg.complexity,0)/out.length);
  const artCat   = out.reduce((b,s)=>s.complexity>b.complexity?s:b, out[0]).category;

  return { article: { dominant_angle: artAngle, dominant_category: artCat, complexity: artCx, type: parsed.type||'unknown', boem: bs }, segments: out };
}

// ── Vercel handler ────────────────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  try {
    const body = req.body || {};
    let paras;

    if (typeof body.text === 'string' && body.text.trim()) {
      // Simple text input — split into paragraphs
      let parts = body.text.split(/\n\s*\n/);
      if (parts.length < 3) parts = body.text.split(/\n/);
      paras = parts.map(p => p.trim()).filter(p => p.length > 20).slice(0, 40);
      if (!paras.length) paras = [body.text.trim()];
    } else if (Array.isArray(body.segments)) {
      paras = body.segments.map(s => typeof s === 'string' ? s : s.text).filter(Boolean).slice(0, 40);
    } else {
      return res.status(400).json({ error: 'Provide text or segments[]' });
    }

    const result = await groqClassify(paras);
    res.status(200).json(result);
  } catch (err) {
    console.error('[classify]', err.message);
    res.status(500).json({ error: err.message });
  }
}
