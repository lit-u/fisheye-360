// Generates expanded KW_MAP + concept library via Groq
// Output: public/kw-map.json + public/concepts.json

import { writeFileSync } from 'fs';

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.3-70b-versatile'; // bigger model for quality

const CATEGORIES = [
  { angle: 0,   name: 'Mathematics' },
  { angle: 10,  name: 'AI, Tech' },
  { angle: 20,  name: 'Physics, IT' },
  { angle: 30,  name: 'Engineering' },
  { angle: 40,  name: 'Electronics' },
  { angle: 50,  name: 'Mechanics' },
  { angle: 60,  name: 'Architecture' },
  { angle: 70,  name: 'Statistics' },
  { angle: 80,  name: 'Finance' },
  { angle: 90,  name: 'Law' },
  { angle: 100, name: 'Politics' },
  { angle: 110, name: 'Governance' },
  { angle: 120, name: 'Writing' },
  { angle: 130, name: 'Crafts' },
  { angle: 140, name: 'Construction' },
  { angle: 150, name: 'Religion' },
  { angle: 160, name: 'Travel' },
  { angle: 170, name: 'Aggression' },
  { angle: 180, name: 'Physical Force' },
  { angle: 190, name: 'Food' },
  { angle: 200, name: 'Sex, Family' },
  { angle: 210, name: 'Home' },
  { angle: 220, name: 'Cooking' },
  { angle: 230, name: 'Care' },
  { angle: 240, name: 'Empathy' },
  { angle: 250, name: 'Fashion' },
  { angle: 260, name: 'Music' },
  { angle: 270, name: 'Drama' },
  { angle: 280, name: 'Literature' },
  { angle: 290, name: 'Media, Design' },
  { angle: 300, name: 'History' },
  { angle: 310, name: 'Psychology' },
  { angle: 320, name: 'Philosophy' },
  { angle: 330, name: 'Biology' },
  { angle: 340, name: 'Medicine' },
  { angle: 350, name: 'Chemistry' },
];

async function groq(prompt, system) {
  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.3,
      max_tokens: 4000,
      messages: [
        { role: 'system', content: system },
        { role: 'user',   content: prompt }
      ]
    })
  });
  if (!res.ok) throw new Error(`Groq error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.choices[0].message.content;
}

// ── Step 1: Generate expanded KW_MAP ─────────────────────────────────
console.log('Generating expanded keyword map...');

const kwPrompt = `For each of these 36 Fisheye360 categories, generate 15-20 strong keyword/phrase triggers in English (lowercase).
These are used for keyword-based text classification fallback.
Categories and their angles:
${CATEGORIES.map(c => `${c.angle}°: ${c.name}`).join('\n')}

Rules:
- Keywords must be distinctive to that category (not generic)
- Include both single words and 2-word phrases
- Cover different domains/contexts within each category
- Return ONLY valid JSON, no markdown:

[
  { "angle": 0, "words": ["theorem", "calculus", "algebra", ...] },
  { "angle": 10, "words": ["machine learning", "neural network", ...] },
  ...all 36 entries...
]`;

const kwRaw = await groq(kwPrompt, 'You are a taxonomy expert. Return only valid JSON arrays.');
let kwMap;
try {
  kwMap = JSON.parse(kwRaw.replace(/```json\n?/g,'').replace(/```\n?/g,'').trim());
  console.log(`✅ KW_MAP: ${kwMap.length} categories, avg ${Math.round(kwMap.reduce((s,e)=>s+e.words.length,0)/kwMap.length)} keywords each`);
} catch(e) {
  console.error('KW_MAP parse error:', e.message);
  console.error(kwRaw.slice(0, 500));
  process.exit(1);
}

writeFileSync('D:/tmp/fisheye-360/public/kw-map.json', JSON.stringify(kwMap, null, 2));
console.log('Saved: public/kw-map.json');

// ── Step 2: Generate concept library (batch by quadrant) ─────────────
console.log('\nGenerating concept library (4 batches by quadrant)...');

const quadrants = [
  { name: 'MIND (0-80°)',    cats: CATEGORIES.filter(c => c.angle >= 0   && c.angle <= 80)  },
  { name: 'ORG (90-170°)',   cats: CATEGORIES.filter(c => c.angle >= 90  && c.angle <= 170) },
  { name: 'BODY (180-260°)', cats: CATEGORIES.filter(c => c.angle >= 180 && c.angle <= 260) },
  { name: 'EMO (270-350°)',  cats: CATEGORIES.filter(c => c.angle >= 270 && c.angle <= 350) },
];

const conceptSystem = `You are a knowledge taxonomy expert building a Fisheye360 concept library.
Each concept maps to an angle (0-350°, multiples of 10) and complexity (1-10).
Complexity: 1=child, 3=teenager, 5=educated adult, 7=professional, 9=world expert.
Return ONLY valid JSON array, no markdown.`;

const allConcepts = [];

for (const q of quadrants) {
  const conceptPrompt = `Generate 12-15 specific concepts for EACH of these categories (${q.name}):
${q.cats.map(c => `${c.angle}°: ${c.name}`).join('\n')}

For each concept include: angle, concept name (2-4 words, English), complexity (1-10).
Focus on SPECIFIC topics, not generic words. Good: "Bayesian statistics", "mortgage refinancing", "ACL reconstruction surgery". Bad: "math", "money", "health".

Return JSON array:
[
  { "angle": 0, "concept": "Euclidean geometry", "complexity": 6 },
  { "angle": 0, "concept": "Fourier transform", "complexity": 8 },
  ...
]`;

  const raw = await groq(conceptPrompt, conceptSystem);
  try {
    const parsed = JSON.parse(raw.replace(/```json\n?/g,'').replace(/```\n?/g,'').trim());
    allConcepts.push(...parsed);
    console.log(`  ✅ ${q.name}: ${parsed.length} concepts`);
  } catch(e) {
    console.error(`  ❌ ${q.name} parse error:`, e.message);
    console.error(raw.slice(0, 300));
  }
  // wait between batches to respect TPM limit
  if (q !== quadrants[quadrants.length - 1]) {
    console.log('  ⏳ Waiting 20s for rate limit...');
    await new Promise(r => setTimeout(r, 20000));
  }
}

// Sort by angle
allConcepts.sort((a, b) => a.angle - b.angle);
writeFileSync('D:/tmp/fisheye-360/public/concepts.json', JSON.stringify(allConcepts, null, 2));
console.log(`\n✅ Saved: public/concepts.json (${allConcepts.length} concepts total)`);

// ── Summary ──────────────────────────────────────────────────────────
console.log('\n── Summary ──');
const byAngle = {};
for (const c of allConcepts) byAngle[c.angle] = (byAngle[c.angle]||0)+1;
for (const cat of CATEGORIES) {
  console.log(`  ${String(cat.angle).padStart(3)}° ${cat.name.padEnd(20)} ${byAngle[cat.angle]||0} concepts`);
}