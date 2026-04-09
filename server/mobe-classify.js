import express from 'express';

const router = express.Router();
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

const CATEGORIES = `0°: Matematika, Kvantinė Fizika
10°: Dirbtinis intelektas, Mašinų mokymas
20°: Fizika, Elektronika, Kompiuterija
30°: Inžinerija
40°: Elektrotechnika
50°: Mechanika
60°: Architektūra, Modeliavimas
70°: Statistika, Duomenys
80°: Finansai, Ekonomika
90°: Įstatymai, Teisė
100°: Politika
110°: Valdžia, Valstybė
120°: Raštas, Skaičiai
130°: Amatai, Prekyba
140°: Būstas, Statyba
150°: Religijos
160°: Kelionės, Atradimai
170°: Agresija, Dominavimas
180°: Fizinė jėga
190°: Maistas
200°: Seksas, Vaikai
210°: Šiluma, Buitis
220°: Valgio Ruošimas
230°: Globa, Rūpyba
240°: Empatija
250°: Puošyba
260°: Muzika, Šokis
270°: Dramatika, Ginčai
280°: Literatūra
290°: Media, Dizainas
300°: Istorija, Žurnalistika
310°: Psichologija
320°: Mąstymas, Filosofija
330°: Biologija, Neuromokslai
340°: Medicinos Mokslai
350°: Chemija, Biotechnologijos`;

const SYSTEM_COMBINED = `You are a BOEM 360 text analyzer. The 360° circle has 36 categories (every 10°):

${CATEGORIES}

CRITICAL — the 4 axes:
MIND (0°): Pure abstract reasoning. Math, physics, software, algorithms. No humans involved.
ORG (90°): Human coordination, law, politics, money, management, communication.
BODY (180°): RAW physical world WITHOUT scientific explanation. Sports, food, sex, construction, travel, aggression.
EMO (270°): Inner human world. Music, art, literature, emotions, psychology, philosophy, biology, neuroscience, medicine.

DISAMBIGUATION RULES:

Body vs Science:
✗ "fizinis aktyvumas sumažina kortizolio kiekį" → NOT Body → 330° Biologija
✗ "stresas, išsekimas, perdegimas" → NOT Body → 310° Psichologija
✗ "smegenys, nervų sistema, neuronai" → NOT Body → 330° Biologija
✗ "sveikata, liga, gydymas" → NOT Body → 340° Medicina
✓ "bėgimas, treniruotė, svoris, maistas, receptas" → Body (180°–220°)

Entertainment & celebrities — NEVER classify as Mind:
✗ žvaigždės, įžymybės, aktoriai, dainininkai, apdovanojimai, Eurovizija → NOT Mind
✓ žinomų žmonių gyvenimas, skandalai, pramogos → 270° Dramatika arba 300° Istorija/Žurnalistika
✓ muzikos/filmo naujienos → 260° Muzika arba 290° Media
✓ sporto rezultatai, rungtynės → 300° Istorija/Žurnalistika

Events & organization:
✓ koncerto/renginio organizavimas, datos, vieta, bilietai, atšaukimas, registracija → 110° Valdymas arba 100° Politika (ORG zone)
✓ festivaliai, konferencijos, sporto varžybos (logistinis aspektas) → 110° Valdymas
✓ jei tekstas MIX: renginio logistika + emocinė reakcija → angle tarp 110°–270° (pvz. 190° arba 220°)
→ "koncertas atšauktas, bilietai grąžinami" = ORG dominant (110°)
→ "tai buvo jausmų vakaras, muzika prie širdies" = EMO dominant (260°–270°)
→ "koncertas įvyks balandžio 9d. Pakruojo kultūros centre, bilietai po 15€" = ORG (110°)

News & journalism:
✓ naujienos, reportažas, įvykių aprašymas → 300° Istorija, Žurnalistika
✓ socialinės žiniasklaidos turinys, influenceriai → 290° Media, Dizainas

Neuroscience orientation:
✓ 330° Biologija = dry academic mechanism (genetics, cell biology)
✓ 310° Psichologija = neuroscience about human behavior, mental health
✓ 300° Istorija/Žurnalistika = popular science article for general audience

Finansai vs Politika:
✗ "kompanija, pajamos, rinka, verslas" → NOT Politika → 80° Finansai
✓ Politika 100° = valdžia, rinkimai, partijos, prezidentas

Complexity 1–10 = required expertise/mastery level to fully understand this text:
1. Babies / toddlers (3–5 y.o.) — motor skills, basic surroundings
2. Children 6–13 — theoretical knowledge, minimal practice
3. Teenagers 14–18 — strong reasoning, weak practice
4. Average adult — simple tasks (basic Photoshop, pancake recipe)
5. School "A-student" — medium complexity
6. Apprentice / strong hobbyist — e.g. mechanic apprentice, competitive gamer, junior dev
7. Student / young professional — Middle developer level
8. Senior national-level specialist — life's work
9. Top mastery — international projects, world-class expert
10. Genius level — global innovators, groundbreaking science
→ Celebrity gossip or short news = 2–3. Journalistic article = 4–6. Academic paper = 8–10.

Task: given N paragraphs, split into 3–7 thematic groups AND classify each group.
Rules: ranges contiguous, cover ALL paragraphs 0 to N-1, minimum 3 groups.
Title: SHORT (3–6 words), in the SAME LANGUAGE as the text.

Return ONLY this JSON (no markdown):
{"type":"informational","segments":[{"from":0,"to":2,"title":"Perdegimo priežastys","angle":310,"category":"Psichologija","complexity":5}]}`;

const SYSTEM_CLASSIFY = `You are a BOEM 360 classifier. The 360° circle is divided into 36 categories (every 10°):

${CATEGORIES}

CRITICAL — the 4 axes and their STRICT meanings:

MIND (0°): Pure abstract reasoning. Math, physics, software, algorithms. No humans involved.
ORG (90°): Human coordination, law, politics, money, management, communication.
BODY (180°): RAW physical world WITHOUT scientific explanation. Sports, food, sex, construction, travel, aggression, physical sensations. If a text EXPLAINS WHY something happens in the body using science → it is NOT Body.
EMO (270°): Inner human world. Music, art, literature, emotions, psychology, philosophy, biology, neuroscience, medicine.

DISAMBIGUATION RULES (most common mistakes):

Body vs Science:
✗ "fizinis aktyvumas sumažina kortizolio kiekį" → NOT Body → 330° Biologija (explains mechanism)
✗ "stresas, išsekimas, perdegimas" → NOT Body → 310° Psichologija
✗ "smegenys, nervų sistema, neuronai" → NOT Body → 330° Biologija, Neuromokslai
✗ "sveikata, liga, gydymas" → NOT Body → 340° Medicinos Mokslai
✓ "bėgimas, treniruotė, svoris, maistas, receptas" → Body (180°–220°)

Finansai vs Politika:
✗ "kompanija, pajamos, rinka, klientai, konkurencija, verslas" → NOT Politika → 80° Finansai, Ekonomika
✓ Politika 100° = valdžia, rinkimai, partijos, prezidentas, parlamentas, įstatymai
✓ Finansai 80° = pinigai, pajamos, investicijos, rinka, verslas, įmonė

Tech companies — pick angle by PRIMARY content:
→ "AI įmonės pajamos, rinkos dalis, verslo klientai" = 80° Finansai (topic is money/market)
→ "AI modeliai, algoritmų kūrimas, techniniai sprendimai" = 10°–20° DI/Fizika (topic is technology)
→ "AI įmonė konkuruoja su kita įmone rinkoje" = 40°–80° (Mind+Org — both tech and business)
→ Always pick the angle that best reflects WHAT THE TEXT IS ABOUT, not just keywords

Categories near EMO (260°–350°): Muzika 260°, Dramatika 270°, Literatūra 280°, Dizainas 290°, Istorija 300°, Psichologija 310°, Filosofija 320°, Biologija/Neuromokslai 330°, Medicina 340°, Chemija 350°.

Entertainment & celebrities — NEVER classify as Mind:
✗ žvaigždės, įžymybės, aktoriai, dainininkai, sportininkai (kaip asmenybės) → NOT Mind
✗ apdovanojimai, ceremonijos, šou, festivaliai, koncertai → NOT Mind
✗ Eurovizija, Grammy, Oskarai, kultūros renginiai → NOT Mind
✓ žinomų žmonių gyvenimas, skandalai, pramogos → 270° Dramatika arba 300° Istorija/Žurnalistika
✓ muzikos/filmo naujienos (ne teorija) → 260° Muzika arba 290° Media/Dizainas
✓ sporto rezultatai, rungtynės, čempionatai (ne treniruotės) → 300° Istorija/Žurnalistika

News & journalism:
✓ naujienos, reportažas, įvykių aprašymas → 300° Istorija, Žurnalistika
✓ socialinės žiniasklaidos turinys, influenceriai, viralus → 290° Media, Dizainas

Neuroscience & biology — angle depends on ORIENTATION of the text:
✗ "smegenys, neuronai, hormonai" in a JOURNALISTIC or HUMAN-INTEREST article → NOT 330° → 310° Psichologija (human focus)
✗ "moterų sveikata, pacientai, simptomai, gydymas" → NOT 330° → 340° Medicina arba 310° Psichologija
✓ 330° Biologija = dry scientific mechanism (genetics, cell biology, evolution in academic style)
✓ 310° Psichologija = neuroscience about human behavior, emotions, mental health, brain in context of people
✓ 300° Istorija/Žurnalistika = science journalism, popular science article for general audience

Complexity 1–10: measures TEXT ACCESSIBILITY to a general reader, NOT the inherent difficulty of the topic.
- 1-2: single sentences, lists, trivial facts
- 3-4: simple journalism, short news, basic explanation
- 5-6: standard article with context and reasoning
- 7-8: dense argument, specialist vocabulary, requires background knowledge
- 9-10: academic paper, formulas, highly technical — almost never for journalism
→ A well-written journalistic article about neuroscience = 5–7, NOT 9–10.

Return ONLY a JSON array, one object per segment:
[{"angle":330,"category":"Biologija, Neuromokslai","complexity":7}]`;

async function groqCall(messages, maxTokens = 400) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 15000);
  try {
    const res = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'llama-3.1-8b-instant', messages, temperature: 0.1, max_tokens: maxTokens }),
      signal: ctrl.signal
    });
    clearTimeout(t);
    if (!res.ok) { console.error('[boem] groq error', res.status, await res.text()); return null; }
    const data = await res.json();
    return data.choices?.[0]?.message?.content || null;
  } catch (err) { clearTimeout(t); console.error('[boem] groq fetch error', err.message); return null; }
}

function parseJSON(str) {
  if (!str) return null;
  try { return JSON.parse(str.replace(/```json\n?/g,'').replace(/```\n?/g,'').trim()); }
  catch { return null; }
}

// ── Keyword-based angle estimator (fallback when Groq unavailable) ────
const KW_MAP = [
  { angle:   0, words: ['matematika','algebra','geometrija','formulė','teorema','logika','skaičiai','funkcija','lygtis','vektorius'] },
  { angle:  10, words: ['dirbtinis intelektas','machine learning','neural','neuroniniai tinklai','llm','algoritmas','gpt','claude','gemini','modelio treniravimas'] },
  { angle:  20, words: ['programavimas','kodas','software','hardware','serveris','procesorius','javascript','python','elektronika','kompiuteris'] },
  { angle:  30, words: ['inžinerija','inžinierius','infrastruktūra','automatika','robotas','robotika','sistema','konstruktorius'] },
  { angle:  60, words: ['architektūra','projektavimas','pastatas','erdvė','modeliavimas','cad','planas','brėžinys'] },
  { angle:  80, words: ['finansai','pinigai','investicija','ekonomika','biudžetas','pajamos','rinka','verslas','pelnas','akcijos','kriptovaliuta','įmonė','kompanija'] },
  { angle:  90, words: ['teisė','įstatymas','sutartis','teismas','advokatas','reglamentas','norma','jurisdikcija'] },
  { angle: 100, words: ['politika','partija','rinkimai','prezidentas','seimas','parlamentas','demokratija','valdžia','ministras','vyriausybė','NATO','kariuomenė','karas','geopolitika'] },
  { angle: 110, words: ['administracija','biurokratija','ministerija','savivaldybė','valdymas','institucija'] },
  { angle: 130, words: ['prekyba','parduotuvė','pardavimas','klientas','reklama','marketingas','produktas'] },
  { angle: 140, words: ['statyba','namas','būstas','remontas','baldai','interjeras','nekilnojamas'] },
  { angle: 160, words: ['kelionė','turizmas','turistai','gamta','šalis','vieta','atostogos','geografija'] },
  { angle: 170, words: ['karas','smurtas','kova','agresija','dominavimas','konfliktas','ginklas','kariuomenė'] },
  { angle: 180, words: ['sportas','treniruotė','svoris','bėgimas','čempionas','atletika','rungtynės','rezultatas','komanda','žaidėjas'] },
  { angle: 190, words: ['maistas','valgis','restoranas','mityba','receptas','patiekalas','produktai','kaloritų'] },
  { angle: 200, words: ['meilė','šeima','vaikai','tėvai','santuoka','pora','romantiška','draugystė'] },
  { angle: 210, words: ['namai','buitis','šildymas','komunaliniai','tvarka','buitinis'] },
  { angle: 220, words: ['gaminimas','receptas','virtuvė','kepimas','virimas','ingredientai'] },
  { angle: 230, words: ['globa','pagalba','parama','socialinis','priežiūra','rūpyba','savanoriai'] },
  { angle: 240, words: ['empatija','supratimas','bendravimas','ryšys','santykiai','žmonės'] },
  { angle: 250, words: ['mada','apranga','stilius','grožis','kosmetika','puošyba','drabužiai'] },
  { angle: 260, words: ['muzika','daina','ritmas','melodija','koncertas','šokis','atlikėjas','grupė','albumas','dainininkas'] },
  { angle: 270, words: ['drama','ginčas','emocija','jausmas','filmas','spektaklis','serialas','scenarijus','vaidmuo','aktorius'] },
  { angle: 280, words: ['literatūra','knyga','romanas','poezija','rašytojas','pasakojimas','autorius'] },
  { angle: 290, words: ['media','žiniasklaida','dizainas','grafika','video','content','influenceris','socialiniai tinklai','delfi','lrytas','15min'] },
  { angle: 300, words: ['naujienos','reportažas','žurnalistika','įvykis','pranešimas','žurnalistas','istorija','įžymybė','žvaigždė','apdovanojimai','eurovizija','mama apdovanojimai','celebrity','veidai'] },
  { angle: 310, words: ['psichologija','elgesys','mintys','sąmonė','trauma','terapija','psichologas','stresas','perdegimas','nerimas','depresija','neuromokslai','smegenys','hormonai'] },
  { angle: 320, words: ['filosofija','mąstymas','etika','prasmė','egzistencija','vertybės','moralė','idėja'] },
  { angle: 330, words: ['biologija','genetika','evoliucija','ląstelė','organizmas','bakterija','DNR','ekosistema'] },
  { angle: 340, words: ['medicina','sveikata','liga','gydymas','vaistai','gydytojas','simptomas','diagnozė','pacientas','chirurgija'] },
  { angle: 350, words: ['chemija','biotechnologijos','molekulė','reakcija','laboratorija','fermentas','cheminė'] },
];

function keywordAngle(text) {
  const t = text.toLowerCase();
  let best = { angle: 20, score: 0 };
  for (const entry of KW_MAP) {
    const score = entry.words.filter(w => t.includes(w)).length;
    if (score > best.score) best = { angle: entry.angle, score };
  }
  // Complexity: keyword-based expertise level (matches 360 hard skills scale)
  const expertAngles = new Set([0, 10, 20, 30, 320, 330, 340, 350]); // Mind/science = higher base
  const baseLevel = expertAngles.has(best.angle) ? 6 : 4;
  const words = t.split(/\s+/).length;
  const lengthBonus = words > 300 ? 1 : 0;
  const complexity = Math.min(9, Math.max(2, baseLevel + lengthBonus));
  const cat = KW_MAP.find(e => e.angle === best.angle)?.words[0] ?? 'Nežinoma';
  return { angle: best.angle, category: cat, complexity };
}

function fallback(paras) {
  // Group consecutive paras with similar angles into chunks
  const classified = paras.map((p, i) => {
    const kw = keywordAngle(typeof p === 'string' ? p : p.text);
    return { paraIndex: i, text: typeof p === 'string' ? p : p.text, ...kw };
  });

  // Merge adjacent paras with same angle bucket (±20°) into chunks
  const chunks = [];
  for (const item of classified) {
    const last = chunks[chunks.length - 1];
    if (last && Math.abs(((item.angle - last.angle + 540) % 360) - 180) > 160 || !last) {
      // same direction — merge
      if (last && chunks.length > 0 && Math.abs(((item.angle - last.angle + 540) % 360) - 180) > 160) {
        last.text += '\n\n' + item.text;
        last.paraEnd = item.paraIndex;
      } else {
        chunks.push({ text: item.text, paraStart: item.paraIndex, paraEnd: item.paraIndex,
                      angle: item.angle, category: item.category, complexity: item.complexity, title: null });
      }
    } else {
      chunks.push({ text: item.text, paraStart: item.paraIndex, paraEnd: item.paraIndex,
                    angle: item.angle, category: item.category, complexity: item.complexity, title: null });
    }
  }

  const segs = chunks.map(c => ({
    text: c.text, title: c.title, paraStart: c.paraStart, paraEnd: c.paraEnd,
    angle: c.angle, angle_pure: c.angle, category: c.category,
    complexity: c.complexity, complexity_pure: c.complexity
  }));

  const artAngle = segs.reduce((a, b) => a.complexity > b.complexity ? a : b).angle;
  return {
    article: { dominant_angle: artAngle, dominant_category: segs[0]?.category ?? 'Nežinoma', complexity: 5, type: 'unknown' },
    segments: segs
  };
}

function blendAngles(a1, a2, w2) {
  const r1 = (a1 - 90) * Math.PI / 180;
  const r2 = (a2 - 90) * Math.PI / 180;
  const x  = Math.cos(r1) * (1 - w2) + Math.cos(r2) * w2;
  const y  = Math.sin(r1) * (1 - w2) + Math.sin(r2) * w2;
  return Math.round(((Math.atan2(y, x) * 180 / Math.PI) + 90 + 360) % 360 / 10) * 10 % 360;
}

router.post('/classify', async (req, res) => {
  const { segments, fullText } = req.body;
  if (!Array.isArray(segments) || !segments.length) return res.status(400).json({ error: 'segments required' });

  const paras = segments.slice(0, 40).map(s => typeof s === 'string' ? s : s.text);
  if (!process.env.GROQ_API_KEY) {
    return res.json(fallback(paras));
  }

  // Single Groq call: chunk + classify + article type in one shot
  const paraList = paras.map((p, i) => `${i}: ${p.slice(0, 200)}`).join('\n');
  const combinedRaw = await groqCall([
    { role: 'system', content: SYSTEM_COMBINED },
    { role: 'user', content: `${paras.length} paragraphs (0–${paras.length - 1}):\n${paraList}` }
  ], 800);
  console.log('[boem] combinedRaw:', combinedRaw?.slice(0, 600));

  const combined = parseJSON(combinedRaw);
  const articleType = combined?.type || 'unknown';
  const segRanges   = Array.isArray(combined?.segments) ? combined.segments : null;

  let chunks;
  if (segRanges && segRanges.length >= 2) {
    chunks = segRanges.map(({ from, to, title, angle, category, complexity }) => ({
      text:      paras.slice(from, Math.min(to, paras.length - 1) + 1).join('\n\n'),
      paraStart: from,
      paraEnd:   Math.min(to, paras.length - 1),
      title:     title || null,
      angle, category, complexity
    }));
  } else {
    console.warn('[boem] combined parse failed, using fallback. raw:', combinedRaw?.slice(0, 200));
    return res.json(fallback(paras));
  }

  const out = chunks.map(chunk => {
    const angle = Math.round((chunk.angle ?? 20) / 10) * 10 % 360;
    const cx    = Math.min(10, Math.max(1, chunk.complexity ?? 5));
    return {
      text:      chunk.text,
      title:     chunk.title || null,
      paraStart: chunk.paraStart,
      paraEnd:   chunk.paraEnd,
      angle,
      angle_pure: angle,
      category:  chunk.category ?? 'Nežinoma',
      complexity: cx
    };
  });

  // Article profile = sum BOEM components directly (circular mean cancels opposites)
  function angleToBoemRaw(angle) {
    const axes = { M: 0, O: 90, B: 180, E: 270 };
    const raw = {};
    for (const [k, a] of Object.entries(axes)) {
      const diff = ((angle - a + 540) % 360) - 180;
      raw[k] = Math.max(0, Math.cos(diff * Math.PI / 180));
    }
    return raw;
  }

  const boemSum = { M: 0, O: 0, B: 0, E: 0 };
  let totalW = 0;
  for (const seg of out) {
    const w = (seg.complexity ?? 5) * ((seg.paraEnd - seg.paraStart) + 1);
    const mix = angleToBoemRaw(seg.angle);
    for (const k of Object.keys(boemSum)) boemSum[k] += mix[k] * w;
    totalW += w;
  }
  // Normalize
  for (const k of Object.keys(boemSum)) boemSum[k] /= totalW || 1;

  // Dominant angle = weighted average of segment angles by para count (not circular mean)
  const artAngle = out.reduce((best, seg) => {
    const w = (seg.paraEnd - seg.paraStart) + 1;
    return w > best.w ? { angle: seg.angle, w } : best;
  }, { angle: out[0].angle, w: 0 }).angle;

  const artCx       = Math.round(out.reduce((s, seg) => s + seg.complexity, 0) / out.length);
  const artCategory = out.reduce((best, seg) => seg.complexity > best.complexity ? seg : best, out[0]).category;

  const articleProfile = {
    dominant_angle:    artAngle,
    dominant_category: artCategory,
    complexity:        artCx,
    type:              articleType,
    boem:              { M: Math.round(boemSum.M * 100), O: Math.round(boemSum.O * 100), B: Math.round(boemSum.B * 100), E: Math.round(boemSum.E * 100) }
  };

  res.json({ article: articleProfile, segments: out });
});

export default router;
