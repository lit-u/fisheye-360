// Generates remaining concept quadrants (ORG, BODY, EMO) — MIND already done
import { writeFileSync, readFileSync } from 'fs';

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.3-70b-versatile';

const CATEGORIES = [
  { angle: 0,   name: 'Mathematics' },    { angle: 10,  name: 'AI, Tech' },
  { angle: 20,  name: 'Physics, IT' },    { angle: 30,  name: 'Engineering' },
  { angle: 40,  name: 'Electronics' },    { angle: 50,  name: 'Mechanics' },
  { angle: 60,  name: 'Architecture' },   { angle: 70,  name: 'Statistics' },
  { angle: 80,  name: 'Finance' },        { angle: 90,  name: 'Law' },
  { angle: 100, name: 'Politics' },       { angle: 110, name: 'Governance' },
  { angle: 120, name: 'Writing' },        { angle: 130, name: 'Crafts' },
  { angle: 140, name: 'Construction' },   { angle: 150, name: 'Religion' },
  { angle: 160, name: 'Travel' },         { angle: 170, name: 'Aggression' },
  { angle: 180, name: 'Physical Force' }, { angle: 190, name: 'Food' },
  { angle: 200, name: 'Sex, Family' },    { angle: 210, name: 'Home' },
  { angle: 220, name: 'Cooking' },        { angle: 230, name: 'Care' },
  { angle: 240, name: 'Empathy' },        { angle: 250, name: 'Fashion' },
  { angle: 260, name: 'Music' },          { angle: 270, name: 'Drama' },
  { angle: 280, name: 'Literature' },     { angle: 290, name: 'Media, Design' },
  { angle: 300, name: 'History' },        { angle: 310, name: 'Psychology' },
  { angle: 320, name: 'Philosophy' },     { angle: 330, name: 'Biology' },
  { angle: 340, name: 'Medicine' },       { angle: 350, name: 'Chemistry' },
];

async function groq(prompt) {
  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL, temperature: 0.3, max_tokens: 3000,
      messages: [
        { role: 'system', content: 'You are a knowledge taxonomy expert. Return ONLY valid JSON array, no markdown, no explanation.' },
        { role: 'user', content: prompt }
      ]
    })
  });
  if (!res.ok) throw new Error(`Groq ${res.status}: ${await res.text()}`);
  return (await res.json()).choices[0].message.content;
}

async function generateQuadrant(name, cats) {
  const prompt = `Generate 12-15 specific concepts for EACH of these categories (${name}):
${cats.map(c => `${c.angle}°: ${c.name}`).join('\n')}

Rules:
- SPECIFIC topics only (good: "Bayesian statistics", bad: "math")
- English, 2-5 words per concept
- complexity 1-10: 1=child, 5=educated adult, 9=world expert

Return JSON array:
[{"angle":90,"concept":"contract law basics","complexity":6},...]`;

  const raw = await groq(prompt);
  return JSON.parse(raw.replace(/```json\n?/g,'').replace(/```\n?/g,'').trim());
}

const quadrants = [
  { name: 'ORG (90-170°)',   cats: CATEGORIES.filter(c => c.angle >= 90  && c.angle <= 170) },
  { name: 'BODY (180-260°)', cats: CATEGORIES.filter(c => c.angle >= 180 && c.angle <= 260) },
  { name: 'EMO (270-350°)',  cats: CATEGORIES.filter(c => c.angle >= 270 && c.angle <= 350) },
];

// Load existing MIND concepts
const existing = JSON.parse(readFileSync('D:/tmp/fisheye-360/public/concepts.json', 'utf8'));
console.log(`Loaded ${existing.length} existing MIND concepts`);

const allConcepts = [...existing];

for (let i = 0; i < quadrants.length; i++) {
  const q = quadrants[i];
  console.log(`\nGenerating ${q.name}...`);
  try {
    const concepts = await generateQuadrant(q.name, q.cats);
    allConcepts.push(...concepts);
    console.log(`  ✅ ${concepts.length} concepts`);
    // Save incrementally
    allConcepts.sort((a, b) => a.angle - b.angle);
    writeFileSync('D:/tmp/fisheye-360/public/concepts.json', JSON.stringify(allConcepts, null, 2));
  } catch(e) {
    console.error(`  ❌ Error: ${e.message}`);
  }
  if (i < quadrants.length - 1) {
    console.log('  ⏳ Waiting 20s...');
    await new Promise(r => setTimeout(r, 20000));
  }
}

console.log(`\n✅ Total: ${allConcepts.length} concepts across all categories`);
const byAngle = {};
for (const c of allConcepts) byAngle[c.angle] = (byAngle[c.angle]||0)+1;
for (const cat of CATEGORIES) {
  console.log(`  ${String(cat.angle).padStart(3)}° ${cat.name.padEnd(20)} ${byAngle[cat.angle]||0}`);
}