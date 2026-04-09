# 🐟 Fisheye 360 — Text Classifier

**Fisheye 360** is an open-source tool that classifies any text across a **360° semantic compass** divided into 36 categories — and visualizes the result as a swimming fish glyph pointing toward the dominant theme.

![Fisheye 360 diagram](public/fish-eye_diagram.jpg)

> Paste a political article → fish points toward `Org/Politics (100°)`  
> Paste a recipe → fish points toward `Body/Food (190°)`  
> Paste a philosophy essay → fish points toward `Emo/Philosophy (320°)`  
> Paste a scientific paper → fish points toward `Mind/Biology (330°)` with complexity 9–10

![Fisheye 360](public/fish-eye.jpg)

---

## The 360° Circle

The compass is organized around **4 primary axes**, each spanning 90°:

| Axis | Angle | Domain |
|------|-------|--------|
| **MIND** | 0° | Abstract reasoning — Math, Physics, AI, Algorithms |
| **ORG** | 90° | Human coordination — Law, Politics, Finance, Management |
| **BODY** | 180° | Physical world — Sports, Food, Construction, Travel |
| **EMO** | 270° | Inner world — Music, Art, Psychology, Philosophy, Medicine |

Between axes are **32 transition categories** at every 10°:

`0° Math` → `10° AI/ML` → `20° Physics/IT` → `30° Engineering` → `40° Electronics` → `50° Mechanics` → `60° Architecture` → `70° Statistics` → `80° Finance` → `90° Law` → `100° Politics` → `110° Governance` → `120° Writing` → `130° Crafts/Trade` → `140° Construction` → `150° Religion` → `160° Travel` → `170° Aggression` → `180° Physical Force` → `190° Food` → `200° Sex/Family` → `210° Home` → `220° Cooking` → `230° Care` → `240° Empathy` → `250° Fashion` → `260° Music` → `270° Drama` → `280° Literature` → `290° Media/Design` → `300° History/Journalism` → `310° Psychology` → `320° Philosophy` → `330° Biology` → `340° Medicine` → `350° Chemistry`

---

## Complexity Scale (1–10)

Complexity measures the **expertise level required** to understand the text:

| Level | Description |
|-------|-------------|
| 1 | Toddler level — motor skills, basic surroundings |
| 2 | Children 6–13 — theoretical knowledge, minimal practice |
| 3 | Teenagers 14–18 — strong reasoning, weak practice |
| 4 | Average adult — basic tasks (simple Photoshop, a recipe) |
| 5 | School A-student — medium complexity |
| 6 | Apprentice / strong hobbyist — junior developer, competitive gamer |
| 7 | Young professional — Middle developer level |
| 8 | Senior specialist — national-level expert |
| 9 | Top mastery — international projects, world-class |
| 10 | Genius level — global innovators, groundbreaking science |

---

## How It Works

1. **Paste text** into the textarea (any language)
2. An LLM (Groq by default) segments the text into **3–7 thematic chunks**
3. Each chunk is classified: `angle` (0–350°), `category`, `complexity`
4. A **fish glyph** rotates to point in the direction of the dominant theme
5. The **360° circle diagram** shows all segments as dots on the compass

All in a **single LLM API call** — fast and cost-efficient.

---

## Getting Started

### Self-host (Node.js)

```bash
git clone https://github.com/lit-u/fisheye-360.git
cd fisheye-360
npm install
cp .env.example .env
# Add your GROQ_API_KEY to .env
npm start
# Open http://localhost:3000/annotator.html
```

### Frontend only (no server)

Open `public/annotator-standalone.html` in any browser.  
Enter your Groq API key in the settings panel — it's stored in `localStorage`.

---

## Stack

- **Frontend:** Vanilla JS, SVG, no framework
- **Backend:** Node.js + Express (minimal — one route)
- **LLM:** [Groq](https://groq.com) (`llama-3.1-8b-instant`) — fast, free tier available
- **Fallback:** Keyword-based classifier (works offline, no API needed)

---

## Project Structure

```
fisheye-360/
├── public/
│   ├── annotator.html      # Main UI
│   ├── annotator.js        # Fish glyph, rendering, 360° diagram
│   └── annotator.css       # Styles
├── server/
│   └── mobe-classify.js    # LLM classification route
├── .env.example
└── README.md
```

---

## Customization

**Change the LLM provider:**  
Edit `server/mobe-classify.js` — replace Groq with any OpenAI-compatible API.

**Add languages:**  
The category labels are in Lithuanian by default.  
English category names are included as comments — PR welcome.

**Embed the fish glyph:**  
The SVG fish is defined by a single path constant:
```js
const FISH_PATH = 'M 30 116 C 88 100, 97 26, 50 5 C 3 26, 12 100, 70 116';
```
Rotate it to any angle — it always points its nose in the direction of the theme.

---

## Related

- [sekmes.lt/360](https://www.sekmes.lt/360) — interactive 36-category hard skills self-assessment wheel (the same compass, applied to career development)

---

## License

MIT © [oldboy_palanga](https://github.com/lit-u)

---

## Contributing

PRs welcome. Especially interested in:
- English category translations
- Standalone frontend version (no server)
- Additional LLM provider adapters
- Improved disambiguation rules for edge cases
