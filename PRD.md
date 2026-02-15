# Weft — Product Requirements Document

> **Version:** 1.0 → 3.0 Roadmap
> **Datum:** 2026-02-15
> **Produkt:** [weft-web.vercel.app](https://weft-web.vercel.app)
> **Skapare:** Johan Salo, Kristoffer Åström
> **Baserat på:** Strategisk analys av C-suite + Advisory Board (17 AI-agenter)

---

## Del 1: Strategisk PRD

### 1.1 Vision & Positionering

**Weft är en AI News Analyst — inte en RSS-läsare.**

Traditionella RSS-läsare (Feedly, Inoreader) presenterar kronologiska listor. Weft analyserar, prioriterar och sammanfattar — som en personlig nyhetsanalytiker som läser allt åt dig och berättar vad som faktiskt spelar roll.

**Core value proposition:**
- "200 artiklar → 10 som faktiskt betyder något för dig"
- Varje artikel scorad 1-10 med motivering
- AI-genererade sammanfattningar i ditt föredragna format
- Noll konfiguration krävs — fungerar direkt

**Tagline:** *Pattern from noise.*

### 1.2 Competitive Landscape

| Produkt | Styrka | Svaghet | Wefts fördel |
|---------|--------|---------|--------------|
| Feedly | Stort ekosystem, AI-features i Pro | Dyrt ($18/mån), komplext UI | Gratis, enklare, bättre AI-scoring |
| Inoreader | Kraftfulla regler/filter | Inget AI-stöd, dated design | AI-native från grunden |
| Google News | Massiv reach | Ingen kontroll, algoritmisk bubbla | Full transparens i scoring |
| The Rundown AI | Bra AI-nyhetskurering | Bara deras urval, ingen personalisering | Personlig scoring + egna feeds |
| Artifact (nedlagd) | Var bäst i klassen | Stängt 2024 | Lever och utvecklas aktivt |
| Perplexity Discover | AI-driven nyhetsyta | Generisk, inte personligt | Djupare personalisering |

**Wefts moat:** Kombination av transparenta AI-scores med motivering + anpassningsbara sammanfattningar + öppna RSS-sources. Ingen konkurrent erbjuder alla tre.

### 1.3 Målgrupp & Personas

**Primär: "The AI Professional" (70%)**
- Jobbar med/kring AI (utvecklare, PMs, researchers, founders)
- Läser 5-15 AI-nyhetskällor dagligen
- Vill hålla sig uppdaterad utan att drunkna i content
- Värderar tid högt, vill ha signal-to-noise

**Sekundär: "The Tech Executive" (20%)**
- C-level, VP, styrelseledamöter
- Behöver executive briefings, inte detaljer
- Vill kunna svara "vad händer inom AI?" på möten
- Använder executive summary-formatet

**Tertiär: "The Curious Generalist" (10%)**
- Teknikintresserad men inte AI-specialist
- Vill förstå AI-trender utan jargong
- Drivs av discovery, inte effektivitet

### 1.4 Versionsroadmap

```
v1.0 ████████████████████ LIVE (feb 2026)
v1.1 ░░░░░░░░░░░░░░░░░░░░ Quick Wins (mar 2026)
v2.0 ░░░░░░░░░░░░░░░░░░░░ Intelligence (maj 2026)
v3.0 ░░░░░░░░░░░░░░░░░░░░ Platform (aug 2026)
```

| Version | Tema | Mål |
|---------|------|-----|
| v1.0 | Foundation | Fungerande MVP med AI-scoring + sammanfattningar |
| v1.1 | Quick Wins | Snabbare, billigare, mer transparent — ingen ny backend |
| v2.0 | Intelligence | Användarkonton, lärande system, answer engine |
| v3.0 | Platform | Monetarisering, community, multi-device |

### 1.5 KPI:er per version

| KPI | v1.0 (nu) | v1.1 mål | v2.0 mål | v3.0 mål |
|-----|-----------|----------|----------|----------|
| MAU | ~10 | 100 | 1 000 | 10 000 |
| Dagliga sessioner/user | 1.2 | 1.5 | 2.0 | 2.5 |
| Genomsn. sessionstid | 3 min | 5 min | 8 min | 10 min |
| Artiklar lästa/session | 2 | 4 | 6 | 8 |
| Summary-generering/dag | ~20 | 200 | 2 000 | 20 000 |
| API-kostnad/user/mån | — | $0.02 | $0.05 | $0.03 (cachad) |
| MRR | $0 | $0 | $0 | $5 000 |

### 1.6 Monetarisering (v3.0)

**Freemium-modell:**

| | Free | Pro ($9/mån) | Team ($29/mån) |
|---|------|--------------|----------------|
| Feeds | 10 | Obegränsat | Obegränsat + delade |
| Smart filter | ✓ | ✓ + motivering | ✓ + motivering |
| Sammanfattningar | 10/dag | Obegränsat | Obegränsat |
| Summary-stilar | 4 presets | + custom prompts | + team-delade prompts |
| Daily briefing | Webb | + e-post/push | + Slack-integration |
| Answer engine | — | ✓ | ✓ |
| Feed-samlingar | — | ✓ | ✓ + kurerade |
| OPML import | ✓ | ✓ | ✓ |
| Multi-device sync | — | ✓ | ✓ |
| Teamfunktioner | — | — | ✓ |

**Revenue targets:**
- v3.0 launch: 500 free → 50 Pro → 5 Team = ~$600 MRR
- v3.0 +6 mån: 5 000 free → 500 Pro → 20 Team = ~$5 100 MRR
- Break-even: ~$2 000 MRR (API-kostnader + hosting)

### 1.7 Risker

| Risk | Sannolikhet | Impact | Mitigation |
|------|-------------|--------|------------|
| Groq rate limits / prisändringar | Hög | Hög | Summary-cache, batch-scoring, multi-provider fallback |
| RSS-feeds ändrar format/stängs | Medium | Medium | Fler feeds per kategori, felhantering |
| localStorage-gräns (5-10 MB) | Medium | Medium | v2.0: server-side persistence |
| Låg retention utan konton | Hög | Hög | v2.0: auth + sync |
| Konkurrent med större budget | Medium | Hög | Nischfokus (AI-proffs), community moat |
| AI-hallucination i summaries | Låg | Medium | Temperatur 0.3, fast model, user-editable prompts |
| GDPR vid konton (v2.0+) | Låg | Medium | Välj EU-baserad auth, minimal data |

---

## Del 2: Teknisk Implementationsplan

---

## v1.1 — Quick Wins

> **Tema:** Snabbare, billigare, mer transparent — ingen ny backend
> **Tidsram:** 2-3 veckor
> **Princip:** Bara frontend + nya serverless functions, ingen databas

---

### Feature 1.1.1: Summary Cache (Server-side)

**Problem:** Varje summary-generering kostar ett API-anrop. Samma artikel kan sammanfattas av flera användare → onödiga kostnader.

**Lösning:** Server-side cache via Vercel KV (Redis) som lagrar summaries per artikel-hash + summary-style.

#### Ny fil: `api/summary-cache.js`

```
GET  /api/summary-cache?id={articleId}&style={styleName}
POST /api/summary-cache
     Body: { id, style, summary, title }
```

**GET-flöde:**
1. Ta emot `id` (article hash) + `style` (t.ex. "newsletter")
2. Lookup i Vercel KV: nyckel = `summary:${id}:${style}`
3. Om hit → returnera `{ summary, cached: true }`
4. Om miss → returnera `{ cached: false }`

**POST-flöde:**
1. Ta emot `id`, `style`, `summary`, `title`
2. Validera: summary max 5000 tecken, style max 50 tecken
3. Spara i Vercel KV med TTL 7 dagar
4. Returnera `{ saved: true }`

**Ändringar i `app.js`:**

Funktion `generateSummary(id)` (rad ~780):
```javascript
// FÖRE: callLLM direkt
// EFTER:
async function generateSummary(id) {
    const article = articles.find(a => a.id === id);
    const style = settings.summaryStyle || 'newsletter';

    // 1. Check server cache first
    try {
        const cacheRes = await fetch(
            `/api/summary-cache?id=${id}&style=${style}`
        );
        const cacheData = await cacheRes.json();
        if (cacheData.cached) {
            article.summary = cacheData.summary;
            saveArticles();
            displaySummary(article);
            return;
        }
    } catch (e) { /* cache miss, continue */ }

    // 2. Generate via LLM (existing logic)
    const summary = await callLLM(prompt);

    // 3. Save to server cache (fire-and-forget)
    fetch('/api/summary-cache', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, style, summary, title: article.title })
    }).catch(() => {});

    // 4. Save locally + display (existing logic)
    article.summary = summary;
    saveArticles();
    displaySummary(article);
}
```

**Dependencies:**
- Vercel KV (Redis) — Hobby plan: 256 MB, 30k requests/dag, gratis
- `@vercel/kv` package

**Verifiering:**
- Första summary-gen → cache miss → LLM call → cache save
- Andra request (annan användare, samma artikel+style) → cache hit → ingen LLM call
- Kontrollera TTL (7 dagar) fungerar

---

### Feature 1.1.2: Batch Scoring Optimization

**Problem:** `runSmartFilter()` scorar max 20 artiklar per anrop. Med 34 feeds × 8 artiklar = ~270 artiklar, krävs ~14 API-anrop. Dyrt och långsamt.

**Lösning:** Öka batch-size, cache scores server-side, skip redan scorade.

#### Ändringar i `app.js` → `runSmartFilter()`

Nuvarande implementation (rad ~640):
- Hämtar 20 unscored articles
- Skickar till Groq `llama-3.1-8b-instant`
- Parsear JSON-svar med scores

**Ny implementation:**

```javascript
async function runSmartFilter() {
    const unscored = articles.filter(a => articleScores[a.id] === undefined);
    if (unscored.length === 0) return;

    // Batch i grupper om 40 (8b-modellen hanterar detta)
    const BATCH_SIZE = 40;
    const batches = [];
    for (let i = 0; i < unscored.length; i += BATCH_SIZE) {
        batches.push(unscored.slice(i, i + BATCH_SIZE));
    }

    // Kör batchar sekventiellt (inte parallellt — rate limits)
    for (const batch of batches) {
        try {
            await scoreBatch(batch);
            renderArticles(); // Uppdatera UI efter varje batch
        } catch (e) {
            console.error('Batch scoring failed:', e);
            break; // Avbryt vid fel, visa det vi har
        }
    }
}

async function scoreBatch(batch) {
    const filterInterests = settings.filterInterests ||
        'AI, machine learning, LLMs, generative AI, tech industry';

    // Kompaktare prompt — titel + källa räcker för scoring
    const articleList = batch.map((a, i) =>
        `[${i}] ${a.title} (${a.source})`
    ).join('\n');

    const prompt = `Score these articles 1-10 for someone interested in: ${filterInterests}

${articleList}

Return JSON: {"articles":[{"i":0,"s":7,"r":"reason","t":"tl;dr"},...]}
- i: index, s: score (1-10), r: one-sentence reason for score, t: one-sentence summary
ONLY valid JSON.`;

    const response = await callLLM(prompt, {
        model: 'llama-3.1-8b-instant',
        max_tokens: 3000,
        temperature: 0.3
    });

    const data = JSON.parse(response);

    data.articles.forEach(scored => {
        const article = batch[scored.i];
        if (article) {
            articleScores[article.id] = scored.s;
            article.groqSummary = scored.t;
            article.scoreReason = scored.r; // NY: motivering
        }
    });

    localStorage.setItem('articleScores', JSON.stringify(articleScores));
    saveArticles();
}
```

**Viktiga ändringar:**
1. Batch-size 20 → 40 (halverar API-anrop)
2. Kompaktare prompt (kortare property-namn i JSON: `i`, `s`, `r`, `t`)
3. Score-motivering (`r`) inkluderad i samma anrop (Feature 1.1.3)
4. `callLLM()` behöver acceptera options-parameter (se nedan)

#### Ändring i `callLLM()`

Nuvarande signatur: `callLLM(prompt)` — hardcodat till `llama-3.3-70b-versatile`.

Ny signatur:
```javascript
async function callLLM(prompt, options = {}) {
    const model = options.model || 'llama-3.3-70b-versatile';
    const max_tokens = options.max_tokens || 400;
    const temperature = options.temperature || 0.7;
    // ... resten av befintlig logik med nya parametrar
}
```

**OBS:** `api/groq.js` tillåter redan `llama-3.1-8b-instant` som modell (validering på rad 18).

**Verifiering:**
- 270 artiklar → ~7 batch-anrop (40/batch) istället för ~14
- UI uppdateras progressivt efter varje batch
- Score-motiveringar sparas korrekt

---

### Feature 1.1.3: Score-motivering

**Problem:** Användaren ser en score (t.ex. "7") men förstår inte varför. Bygger inte tillit.

**Lösning:** Visa en kort motivering under score-badgen. Data hämtas redan i batch-scoring (Feature 1.1.2, fältet `r`).

#### Ändringar i `app.js`

**I `renderArticles()` (artikellistan):**

Nuvarande: Visar score-badge + groqSummary.

Tillägg: Visa `article.scoreReason` som en rad under titeln i artikelkortet.

```javascript
// I renderArticles(), inuti article card HTML:
${article.scoreReason ?
    `<div class="article-score-reason">${escapeHtml(article.scoreReason)}</div>`
    : ''}
```

**I `showArticle()` (artikeldetalj):**

Visa motivering bredvid/under score-badgen:

```javascript
// I showArticle(), efter score badge:
${article.scoreReason ?
    `<span class="score-reason">${escapeHtml(article.scoreReason)}</span>`
    : ''}
```

#### Ändringar i `style.css`

```css
.article-score-reason {
    font-size: 0.75rem;
    color: var(--text-tertiary);
    font-style: italic;
    margin-top: 2px;
    line-height: 1.3;
}

.score-reason {
    display: block;
    font-size: 0.8rem;
    color: var(--text-secondary);
    font-style: italic;
    margin-top: 4px;
}
```

#### Datamodell

Existerande artikel-objekt utökas:
```javascript
article.scoreReason = "Directly covers new LLM architecture from Google"
```

Sparas i localStorage via `saveArticles()`.

**Verifiering:**
- Score-badge "8" visar "Directly relevant to LLM development" under sig
- Motivering visas i både lista och detaljvy
- Gamla artiklar utan motivering visar inget (graceful degradation)

---

### Feature 1.1.4: Share-funktion

**Problem:** Ingen möjlighet att dela en artikel + AI-sammanfattning.

**Lösning:** Share-knapp som kopierar en formaterad text med titel + sammanfattning + länk. Använder Web Share API (mobil) med fallback till clipboard.

#### Ändringar i `app.js`

**Ny funktion:**
```javascript
async function shareArticle(article) {
    const summary = article.summary || article.groqSummary || '';
    const score = articleScores[article.id];

    const text = [
        article.title,
        '',
        summary ? `AI Summary:\n${summary}` : '',
        score ? `Relevance: ${score}/10` : '',
        '',
        `Read more: ${article.link}`,
        '',
        '— Shared via Weft (weft-web.vercel.app)'
    ].filter(Boolean).join('\n');

    // Try Web Share API first (mobile)
    if (navigator.share) {
        try {
            await navigator.share({
                title: article.title,
                text: text,
                url: article.link
            });
            return;
        } catch (e) {
            if (e.name === 'AbortError') return; // User cancelled
        }
    }

    // Fallback: copy to clipboard
    try {
        await navigator.clipboard.writeText(text);
        showToast('Copied to clipboard');
    } catch (e) {
        // Final fallback: textarea trick
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        showToast('Copied to clipboard');
    }
}

function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('toast--visible'), 10);
    setTimeout(() => {
        toast.classList.remove('toast--visible');
        setTimeout(() => toast.remove(), 300);
    }, 2000);
}
```

**I `showArticle()` — lägg till Share-knapp bland action buttons:**

Nuvarande action buttons: Like, Dislike, Bookmark, Read Original.

Tillägg efter Bookmark-knappen:
```html
<button class="action-btn" onclick="shareArticle(currentArticle)"
        title="Share article">
    <svg><!-- share icon --></svg>
    Share
</button>
```

#### Ändringar i `style.css`

```css
.toast {
    position: fixed;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%) translateY(20px);
    background: var(--accent);
    color: var(--bg-primary);
    padding: 10px 20px;
    border-radius: 8px;
    font-size: 0.85rem;
    font-weight: 600;
    opacity: 0;
    transition: opacity 0.3s, transform 0.3s;
    z-index: 10000;
    pointer-events: none;
}

.toast--visible {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
}
```

**Verifiering:**
- Desktop: Klick → text kopierad till clipboard → toast "Copied to clipboard"
- Mobil (iOS/Android): Öppnar native share sheet
- Utan summary: Delar titel + länk
- Med summary: Delar titel + summary + score + länk

---

### Feature 1.1.5: Daily Briefing-vy

**Problem:** Användaren måste scrolla igenom alla artiklar. Ingen "vad hände idag?"-sammanfattning.

**Lösning:** Ny filtervy "Briefing" som visar en AI-genererad sammanfattning av dagens topp-artiklar.

#### Ändringar i `index.html`

Lägg till Briefing-knapp i filter-raden (efter Saved-knappen):
```html
<button class="filter-btn" data-filter="briefing">Briefing</button>
```

#### Ändringar i `app.js`

**I `renderArticles()` — hantera `briefing` filter:**

```javascript
if (activeFilter === 'briefing') {
    renderBriefing();
    return;
}
```

**Ny funktion:**
```javascript
async function renderBriefing() {
    const content = document.getElementById('article-content');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Hämta dagens artiklar, sorterade efter score
    const todayArticles = articles
        .filter(a => new Date(a.pubDate) >= today)
        .sort((a, b) => (articleScores[b.id] || 0) - (articleScores[a.id] || 0));

    const topArticles = todayArticles.slice(0, 10);

    if (topArticles.length === 0) {
        content.innerHTML = `
            <div class="briefing">
                <h2>Daily Briefing</h2>
                <p class="briefing-empty">No articles from today yet. Check back later.</p>
            </div>`;
        return;
    }

    // Check cache
    const cacheKey = `briefing_${today.toISOString().split('T')[0]}`;
    const cached = localStorage.getItem(cacheKey);

    if (cached) {
        displayBriefing(cached, topArticles);
        return;
    }

    // Show loading
    content.innerHTML = `
        <div class="briefing">
            <h2>Daily Briefing</h2>
            <p class="briefing-date">${today.toLocaleDateString('en-US', {
                weekday: 'long', month: 'long', day: 'numeric'
            })}</p>
            <div class="briefing-loading">
                <div class="spinner"></div>
                <p>Analyzing today's top stories...</p>
            </div>
        </div>`;

    // Generate briefing
    const articleList = topArticles.map((a, i) => {
        const score = articleScores[a.id] || '?';
        return `[${i+1}] "${a.title}" (${a.source}, score: ${score}/10)\n    ${a.description?.substring(0, 150) || ''}`;
    }).join('\n\n');

    const prompt = `You are a senior tech news analyst writing a daily briefing.

Today's top ${topArticles.length} articles (scored by AI relevance):

${articleList}

Write a concise daily briefing with:
1. **HEADLINE** — The single most important story in one sentence
2. **KEY STORIES** — 3-5 bullet points covering the most significant developments
3. **PATTERN** — One sentence on what theme or trend connects today's news
4. **WORTH WATCHING** — One emerging story that might become bigger

Keep it under 300 words. Be specific, cite article titles. No filler.`;

    try {
        const briefing = await callLLM(prompt, {
            model: 'llama-3.3-70b-versatile',
            max_tokens: 800,
            temperature: 0.5
        });
        localStorage.setItem(cacheKey, briefing);
        displayBriefing(briefing, topArticles);
    } catch (e) {
        content.innerHTML = `
            <div class="briefing">
                <h2>Daily Briefing</h2>
                <p class="briefing-error">Failed to generate briefing. <a href="#" onclick="renderBriefing()">Retry</a></p>
            </div>`;
    }
}

function displayBriefing(text, topArticles) {
    const content = document.getElementById('article-content');
    const today = new Date();

    // Parse markdown-ish formatting
    const formatted = text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/^## (.*$)/gm, '<h3>$1</h3>')
        .replace(/^- (.*$)/gm, '<li>$1</li>')
        .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
        .split('\n\n')
        .map(p => p.startsWith('<') ? p : `<p>${p}</p>`)
        .join('');

    const articleLinks = topArticles.map(a => {
        const score = articleScores[a.id] || '?';
        return `<li>
            <a href="#" onclick="showArticle(articles.find(x=>x.id==='${a.id}'));return false">
                ${escapeHtml(a.title)}
            </a>
            <span class="briefing-source">${a.source} · ${score}/10</span>
        </li>`;
    }).join('');

    content.innerHTML = `
        <div class="briefing">
            <h2>Daily Briefing</h2>
            <p class="briefing-date">${today.toLocaleDateString('en-US', {
                weekday: 'long', month: 'long', day: 'numeric'
            })}</p>
            <div class="briefing-content">${formatted}</div>
            <h3>Sources</h3>
            <ol class="briefing-sources">${articleLinks}</ol>
        </div>`;
}
```

#### Ändringar i `style.css`

```css
.briefing {
    max-width: 680px;
    margin: 0 auto;
    padding: 40px 24px;
}

.briefing h2 {
    font-family: var(--font-display);
    font-size: 2rem;
    margin-bottom: 4px;
}

.briefing-date {
    color: var(--text-tertiary);
    font-size: 0.9rem;
    margin-bottom: 32px;
}

.briefing-content {
    font-size: 1rem;
    line-height: 1.7;
    color: var(--text-primary);
}

.briefing-content h3 {
    color: var(--accent);
    font-size: 0.85rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-top: 28px;
    margin-bottom: 12px;
}

.briefing-content ul {
    padding-left: 20px;
    margin: 12px 0;
}

.briefing-content li {
    margin-bottom: 8px;
    line-height: 1.6;
}

.briefing-content p {
    margin-bottom: 16px;
}

.briefing-sources {
    padding-left: 20px;
    margin-top: 12px;
}

.briefing-sources li {
    margin-bottom: 10px;
}

.briefing-sources a {
    color: var(--accent);
    text-decoration: none;
}

.briefing-sources a:hover {
    text-decoration: underline;
}

.briefing-source {
    display: block;
    font-size: 0.75rem;
    color: var(--text-tertiary);
    margin-top: 2px;
}

.briefing-loading {
    text-align: center;
    padding: 60px 0;
    color: var(--text-tertiary);
}

.briefing-empty,
.briefing-error {
    text-align: center;
    color: var(--text-tertiary);
    padding: 60px 0;
}
```

**Verifiering:**
- Klick på "Briefing" → AI-genererad sammanfattning av dagens top-artiklar
- Cachad per dag (en briefing per dag)
- Klick på artikeltitel i sources → öppnar artikeln
- Om inga artiklar idag → "No articles from today yet"
- Briefing under 300 ord, strukturerad med HEADLINE / KEY STORIES / PATTERN / WORTH WATCHING

---

## v2.0 — Användarkonton & Intelligence

> **Tema:** Server-side state, lärande system, nya AI-capabilities
> **Tidsram:** 6-8 veckor
> **Kräver:** Databas (Supabase), auth-provider, nytt API-lager

---

### Feature 2.0.1: Authentication (Supabase Auth)

**Problem:** Ingen persistens mellan enheter/browsers. Ingen identitet.

**Lösning:** Supabase Auth med email magic link + Google OAuth.

#### Arkitektur

```
Användare → Supabase Auth → JWT token
                              ↓
                     API routes validerar token
                              ↓
                     Supabase PostgreSQL (user data)
```

#### Databas-schema (Supabase)

```sql
-- Användarprofiler (utökar Supabase auth.users)
CREATE TABLE profiles (
    id UUID REFERENCES auth.users PRIMARY KEY,
    display_name TEXT,
    filter_interests TEXT DEFAULT 'AI, machine learning, LLMs',
    filter_threshold INTEGER DEFAULT 6,
    summary_style TEXT DEFAULT 'newsletter',
    llm_provider TEXT DEFAULT 'groq',
    custom_styles JSONB DEFAULT '{}',
    disabled_feeds TEXT[] DEFAULT '{}',
    custom_feeds JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Artikelinteraktioner
CREATE TABLE article_interactions (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES profiles(id),
    article_id TEXT NOT NULL,
    article_title TEXT,
    article_source TEXT,
    score INTEGER,
    score_reason TEXT,
    read BOOLEAN DEFAULT false,
    read_duration_seconds INTEGER,  -- implicit feedback
    bookmarked BOOLEAN DEFAULT false,
    liked BOOLEAN,                  -- true/false/null
    summary TEXT,
    summary_style TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, article_id)
);

-- Index för snabba queries
CREATE INDEX idx_interactions_user ON article_interactions(user_id);
CREATE INDEX idx_interactions_article ON article_interactions(article_id);
CREATE INDEX idx_interactions_bookmarked ON article_interactions(user_id, bookmarked)
    WHERE bookmarked = true;
```

#### Nya filer

- `api/auth.js` — Supabase auth helper (verify JWT)
- `api/user-settings.js` — GET/PUT user preferences
- `api/user-articles.js` — GET/PUT article interactions
- `lib/supabase.js` — Supabase client init (frontend)

#### Ändringar i `app.js`

- `loadSettings()` → Om inloggad: hämta från Supabase, annars localStorage (fallback)
- `saveSettings()` → Om inloggad: spara till Supabase + localStorage (offline cache)
- `saveArticles()` → Om inloggad: synka interactions till Supabase
- Ny: `syncOnLogin()` → Migrera localStorage-data till konto vid första inloggning
- Ny: `AuthModal` — Login/signup UI i settings

#### Ändringar i `index.html`

- User avatar / login-knapp i sidebar header
- Auth modal (email + Google login)

**Verifiering:**
- Email magic link: skicka → klicka → inloggad
- Google OAuth: klick → consent → inloggad
- Settings synkas: ändra på enhet A → syns på enhet B
- Utloggad: localStorage fungerar som förut (v1.x-kompatibelt)

---

### Feature 2.0.2: Server-side Persistence

**Problem:** localStorage begränsat till ~5-10 MB, ej delat mellan enheter, försvinner vid rensning.

**Lösning:** Supabase PostgreSQL (via Feature 2.0.1) ersätter localStorage som primär storage för inloggade användare.

#### Data-migration

```javascript
async function syncOnLogin() {
    // 1. Läs all localStorage-data
    const localArticles = JSON.parse(localStorage.getItem('articles') || '[]');
    const localScores = JSON.parse(localStorage.getItem('articleScores') || '{}');

    // 2. Skapa interactions i Supabase
    const interactions = localArticles
        .filter(a => a.read || a.bookmarked || a.liked || a.summary)
        .map(a => ({
            article_id: a.id,
            article_title: a.title,
            article_source: a.source,
            score: localScores[a.id],
            read: a.read || false,
            bookmarked: a.bookmarked || false,
            liked: a.liked || null,
            summary: a.summary,
            summary_style: settings.summaryStyle
        }));

    // 3. Upsert till Supabase
    await supabase.from('article_interactions').upsert(interactions, {
        onConflict: 'user_id,article_id'
    });

    // 4. Synka settings
    await supabase.from('profiles').upsert({
        id: user.id,
        filter_interests: settings.filterInterests,
        filter_threshold: settings.filterThreshold,
        summary_style: settings.summaryStyle,
        custom_styles: settings.customStyles,
        disabled_feeds: settings.disabledFeeds,
        custom_feeds: settings.customFeeds
    });
}
```

#### Offline-first strategi

```
Alltid: Läs/skriv localStorage (snabbt, offline)
Om online + inloggad: Synka till Supabase i bakgrunden
Vid konflikt: Senaste timestamp vinner
```

**Verifiering:**
- Första login migrerar all lokal data
- Fungerar offline (localStorage)
- Synkar automatiskt när connection återställs
- Clear browser data → login → all data tillbaka

---

### Feature 2.0.3: Implicit Feedback Loop

**Problem:** AI-scoring baseras bara på topic-match. Ingen learning från användarbeteende.

**Lösning:** Mät implicit feedback (lästid, scrolldjup, bokmärken, likes) och använd som signal för bättre scoring.

#### Data som samlas

| Signal | Vikt | Mätning |
|--------|------|---------|
| Lästid > 30s | Hög | `performance.now()` diff vid showArticle → leavearticle |
| Bokmärke | Hög | Explicit klick |
| Like | Hög | Explicit klick |
| Dislike | Hög (negativ) | Explicit klick |
| Klick "Read Original" | Medium | Explicit klick |
| Summary genererad | Låg | Implicit (auto-gen) |

#### Ändringar i `app.js`

```javascript
// Track read time
let articleViewStart = null;

function showArticle(article) {
    // Spara tid för föregående artikel
    if (currentArticle && articleViewStart) {
        const duration = Math.round((performance.now() - articleViewStart) / 1000);
        if (duration > 5) { // Ignorera <5s (misstag/scrollade förbi)
            saveInteraction(currentArticle.id, { read_duration_seconds: duration });
        }
    }
    articleViewStart = performance.now();
    currentArticle = article;
    // ... existing showArticle logic
}
```

#### Scoring-boost

Ny funktion i `runSmartFilter()`:

```javascript
function calculatePersonalBoost(article) {
    // Hämta liknande artiklar användaren interagerat med
    const interactions = getInteractions(); // from Supabase/localStorage

    // Hitta artiklar med liknande keywords/source som användaren gillade
    const liked = interactions.filter(i => i.liked || i.read_duration_seconds > 60);
    const disliked = interactions.filter(i => i.liked === false);

    let boost = 0;

    // Source-preferens
    const likedSources = liked.map(i => i.article_source);
    if (likedSources.includes(article.source)) boost += 1;

    // Keyword-overlap
    const likedKeywords = new Set(liked.flatMap(i => i.article_keywords || []));
    const overlap = article.keywords?.filter(k => likedKeywords.has(k)).length || 0;
    boost += overlap * 0.5;

    // Negativ signal
    const dislikedSources = disliked.map(i => i.article_source);
    if (dislikedSources.includes(article.source)) boost -= 1;

    return Math.max(-2, Math.min(2, boost)); // Clampa till [-2, +2]
}
```

**Modifierad scoring-prompt:**
```
Score adjusted by personal preferences:
- User tends to engage more with: ${topSources.join(', ')}
- User tends to skip: ${bottomSources.join(', ')}
- Popular keywords from reading history: ${topKeywords.join(', ')}
Adjust scores accordingly (max ±2 points from base relevance).
```

**Verifiering:**
- Läs 5 artiklar från "MIT Tech Review" > 60s → MIT-artiklar börjar boostas
- Dislike 3 artiklar från källa X → X-artiklar tappar score
- Feedback loop syns efter ~20 interaktioner

---

### Feature 2.0.4: Answer Engine

**Problem:** Användaren kan bara läsa vad som publiceras. Kan inte ställa frågor.

**Lösning:** Sökfält som besvarar frågor baserat på dagens artiklar (RAG-liknande over cached articles).

#### UI

Sökfältet i sidebaren transformeras:
- Vanligt sök → filtrerar artiklar (nuvarande beteende)
- Fråga (slutar med `?` eller börjar med "what/why/how/when/who") → answer engine

#### Ändringar i `app.js`

```javascript
function handleSearch(query) {
    const isQuestion = query.endsWith('?') ||
        /^(what|why|how|when|who|which|is|are|will|can|does|do|should)\b/i.test(query);

    if (isQuestion && query.length > 10) {
        answerQuestion(query);
    } else {
        // Existing search/filter logic
        renderArticles();
    }
}

async function answerQuestion(question) {
    const content = document.getElementById('article-content');

    // Hämta relevanta artiklar
    const relevant = findRelevantArticles(question, 8);

    content.innerHTML = `
        <div class="answer-engine">
            <div class="answer-question">${escapeHtml(question)}</div>
            <div class="answer-loading">
                <div class="spinner"></div>
                <p>Searching across ${articles.length} articles...</p>
            </div>
        </div>`;

    const context = relevant.map((a, i) =>
        `[${i+1}] "${a.title}" (${a.source}, ${formatDate(a.pubDate)}):\n${a.description}`
    ).join('\n\n');

    const prompt = `Based on these recent tech/AI news articles, answer the question.

ARTICLES:
${context}

QUESTION: ${question}

Rules:
- Answer based ONLY on the provided articles
- Cite sources as [1], [2] etc.
- If the articles don't contain enough info, say so
- Be concise (max 200 words)
- If multiple articles discuss this, synthesize them`;

    try {
        const answer = await callLLM(prompt, {
            max_tokens: 600,
            temperature: 0.3
        });
        displayAnswer(question, answer, relevant);
    } catch (e) {
        content.innerHTML = `
            <div class="answer-engine">
                <div class="answer-question">${escapeHtml(question)}</div>
                <p class="answer-error">Failed to generate answer. <a href="#" onclick="answerQuestion('${escapeHtml(question)}')">Retry</a></p>
            </div>`;
    }
}

function findRelevantArticles(question, limit) {
    const queryWords = question.toLowerCase()
        .replace(/[?.,!]/g, '')
        .split(' ')
        .filter(w => w.length > 3);

    return articles
        .map(a => {
            const text = `${a.title} ${a.description} ${a.keywords?.join(' ')}`.toLowerCase();
            const matches = queryWords.filter(w => text.includes(w)).length;
            return { ...a, relevance: matches };
        })
        .filter(a => a.relevance > 0)
        .sort((a, b) => b.relevance - a.relevance)
        .slice(0, limit);
}

function displayAnswer(question, answer, sources) {
    const content = document.getElementById('article-content');

    const formatted = answer
        .replace(/\[(\d+)\]/g, '<sup class="answer-ref">[$1]</sup>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .split('\n\n')
        .map(p => `<p>${p}</p>`)
        .join('');

    const sourceLinks = sources.map((a, i) =>
        `<li>
            <a href="#" onclick="showArticle(articles.find(x=>x.id==='${a.id}'));return false">
                [${i+1}] ${escapeHtml(a.title)}
            </a>
            <span class="answer-source-meta">${a.source} · ${formatDate(a.pubDate)}</span>
        </li>`
    ).join('');

    content.innerHTML = `
        <div class="answer-engine">
            <div class="answer-question">${escapeHtml(question)}</div>
            <div class="answer-text">${formatted}</div>
            <h4>Sources</h4>
            <ol class="answer-sources">${sourceLinks}</ol>
        </div>`;
}
```

**Verifiering:**
- "What is Claude 4?" → Svar baserat på artiklar som nämner Claude
- Citat med [1], [2] som klickbara referenser
- Inga artiklar matchar → "I couldn't find articles about this topic"
- Vanlig sökning (utan ?) → fortfarande filtrerar som förut

---

### Feature 2.0.5: Push/E-post Daily Briefing

**Problem:** Användaren måste aktivt besöka Weft. Ingen push.

**Lösning:** Daglig briefing skickad via e-post (Resend) eller push (Web Push API).

#### Arkitektur

```
Vercel Cron (06:00 UTC) → api/cron-briefing.js
    ↓
    Fetch RSS feeds → Score → Generate briefing
    ↓
    For each subscribed user:
        → Resend email API
        → Web Push notification
```

#### Nya filer

- `api/cron-briefing.js` — Daglig cron job
- `api/subscribe-push.js` — Registrera push-prenumeration
- `api/subscribe-email.js` — Registrera e-post-prenumeration

#### Databasutökning

```sql
ALTER TABLE profiles ADD COLUMN
    briefing_email BOOLEAN DEFAULT false,
    briefing_push BOOLEAN DEFAULT false,
    push_subscription JSONB,
    briefing_time TEXT DEFAULT '08:00'; -- Användarens prefererade tid (UTC)
```

#### `vercel.json` utökning

```json
{
    "crons": [{
        "path": "/api/cron-briefing",
        "schedule": "0 6 * * *"
    }]
}
```

**Verifiering:**
- Aktivera e-post briefing → Får mail 08:00 med dagens brief
- Aktivera push → Får browser notification med sammanfattning
- Avaktivera → Inga notifikationer

---

### Feature 2.0.6: Discovery Mode

**Problem:** Smart filter skapar filterbubblor — användaren ser bara det de redan gillar.

**Lösning:** "Discovery"-filter som medvetet visar artiklar utanför användarens comfort zone.

#### Ändringar i `index.html`

Ny filter-knapp:
```html
<button class="filter-btn" data-filter="discover">Discover</button>
```

#### Ändringar i `app.js`

```javascript
// I renderArticles():
if (activeFilter === 'discover') {
    // Visa artiklar med score 3-6 som INTE matchar användarens vanliga sources
    const userTopSources = getTopSources(5); // Sources med flest reads
    filtered = articles
        .filter(a => {
            const score = articleScores[a.id];
            return score !== undefined &&
                   score >= 3 && score <= 6 &&
                   !userTopSources.includes(a.source);
        })
        .sort(() => Math.random() - 0.5) // Shuffle
        .slice(0, 15);
}

function getTopSources(limit) {
    const sourceCounts = {};
    articles.filter(a => a.read).forEach(a => {
        sourceCounts[a.source] = (sourceCounts[a.source] || 0) + 1;
    });
    return Object.entries(sourceCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([source]) => source);
}
```

**Verifiering:**
- Discovery visar artiklar användaren normalt inte ser
- Ingen duplikering med Smart-filtret
- Artiklarna roteras (shuffle)

---

## v3.0 — Platform & Monetarisering

> **Tema:** Revenue, community, multi-device
> **Tidsram:** 8-12 veckor
> **Kräver:** Stripe, utökad Supabase, CDN

---

### Feature 3.0.1: Freemium-modell

**Problem:** Ingen intäktsmodell.

**Lösning:** Free/Pro/Team-tiers med Stripe Checkout.

#### Arkitektur

```
Stripe Checkout → Webhook → api/stripe-webhook.js
    ↓
    Uppdatera profiles.tier i Supabase
    ↓
    Frontend läser tier → enable/disable features
```

#### Databasutökning

```sql
ALTER TABLE profiles ADD COLUMN
    tier TEXT DEFAULT 'free' CHECK (tier IN ('free', 'pro', 'team')),
    stripe_customer_id TEXT,
    subscription_id TEXT,
    subscription_status TEXT,
    subscription_end TIMESTAMPTZ;
```

#### Nya filer

- `api/stripe-webhook.js` — Hanterar Stripe events
- `api/create-checkout.js` — Skapar Stripe Checkout session
- `api/manage-subscription.js` — Kundportal-länk

#### Gating-logik i `app.js`

```javascript
function canUse(feature) {
    const tier = user?.tier || 'free';
    const limits = {
        free: {
            feeds: 10,
            summaries_per_day: 10,
            answer_engine: false,
            push_briefing: false,
            custom_styles: false,
            multi_device: false
        },
        pro: {
            feeds: Infinity,
            summaries_per_day: Infinity,
            answer_engine: true,
            push_briefing: true,
            custom_styles: true,
            multi_device: true
        },
        team: {
            feeds: Infinity,
            summaries_per_day: Infinity,
            answer_engine: true,
            push_briefing: true,
            custom_styles: true,
            multi_device: true,
            shared_feeds: true,
            slack_integration: true
        }
    };
    return limits[tier][feature];
}
```

**Verifiering:**
- Free user: 10 feeds, 10 summaries/dag, kan inte använda answer engine
- Pro: Allt öppet efter betalning
- Stripe webhook uppdaterar tier i realtid

---

### Feature 3.0.2: Community Prompts

**Problem:** Bra summary-stilar är svåra att skriva. Användare borde kunna dela.

**Lösning:** Galleri med community-skapade summary-prompts.

#### Databasutökning

```sql
CREATE TABLE community_prompts (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES profiles(id),
    name TEXT NOT NULL,
    description TEXT,
    prompt TEXT NOT NULL,
    uses INTEGER DEFAULT 0,
    likes INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_prompts_popular ON community_prompts(likes DESC);
```

#### Nya filer

- `api/community-prompts.js` — CRUD + browse/search
- UI: Ny sektion i settings: "Community Styles" med galleri

**Verifiering:**
- Användare kan publicera sin custom style
- Andra kan browse, preview, och använda
- Populäraste promptsen visas först

---

### Feature 3.0.3: Topic Clustering

**Problem:** Många artiklar handlar om samma ämne (t.ex. 5 artiklar om "GPT-5 release"). Redundant.

**Lösning:** Klustra artiklar efter topic, visa en kluster-vy.

#### Implementation

```javascript
async function clusterArticles(articles) {
    // Skicka titlar till LLM för clustering
    const titles = articles.map((a, i) => `[${i}] ${a.title}`).join('\n');

    const prompt = `Group these article titles into topic clusters.
Return JSON: {"clusters":[{"topic":"short label","articles":[0,2,5]},...]}.
Articles that don't fit a cluster go in "Other". Min 2 articles per cluster.

${titles}`;

    const response = await callLLM(prompt, {
        model: 'llama-3.1-8b-instant',
        max_tokens: 1500,
        temperature: 0.2
    });

    return JSON.parse(response).clusters;
}
```

#### UI

Ny vy som visar:
```
[GPT-5 Release] (5 artiklar)
  → Top article: "OpenAI announces GPT-5..."
  → +4 more

[EU AI Act] (3 artiklar)
  → Top article: "New EU regulations..."
  → +2 more
```

**Verifiering:**
- Artiklar om samma topic grupperas
- Klick på cluster → visar alla artiklar i clustret
- Top-artikel (högsta score) visas som representant

---

### Feature 3.0.4: OPML Import/Export

**Problem:** Power users vill importera sina befintliga feed-listor.

**Lösning:** OPML-parser (import) och OPML-generator (export).

#### Ändringar i `app.js`

```javascript
function importOPML(xmlText) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, 'text/xml');
    const outlines = doc.querySelectorAll('outline[xmlUrl]');

    const feeds = Array.from(outlines).map(el => ({
        name: el.getAttribute('title') || el.getAttribute('text') || 'Unknown',
        url: el.getAttribute('xmlUrl'),
        category: el.parentElement?.getAttribute('text') || 'Imported'
    }));

    return feeds;
}

function exportOPML() {
    const allFeeds = [...DEFAULT_FEEDS, ...settings.customFeeds];
    const opml = `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
<head><title>Weft Feeds</title></head>
<body>
${allFeeds.map(f => `  <outline text="${escapeXml(f.name)}" xmlUrl="${escapeXml(f.url)}" />`).join('\n')}
</body>
</opml>`;

    const blob = new Blob([opml], { type: 'text/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'weft-feeds.opml';
    a.click();
    URL.revokeObjectURL(url);
}
```

#### UI i settings

- "Import OPML" — file input som accepterar .opml/.xml
- "Export OPML" — knapp som laddar ner feed-lista

**Verifiering:**
- Import .opml från Feedly → feeds läggs till som custom feeds
- Export → .opml-fil som kan importeras i andra läsare
- Dubblett-feeds filtreras bort vid import

---

### Feature 3.0.5: Feed-samlingar (Curated Packs)

**Problem:** Nya användare vet inte vilka feeds som är bra för deras nisch.

**Lösning:** Kurerade feed-paket per ämne som kan aktiveras med ett klick.

#### Data

```javascript
const FEED_COLLECTIONS = {
    'ai-research': {
        name: 'AI Research',
        description: 'Papers, breakthroughs, and technical deep dives',
        feeds: [
            { name: 'Papers With Code', url: '...' },
            { name: 'Arxiv CS.AI', url: '...' },
            // ...
        ]
    },
    'startup-tech': {
        name: 'Startup & Tech',
        description: 'Funding, launches, and industry moves',
        feeds: [
            { name: 'TechCrunch', url: '...' },
            { name: 'Product Hunt', url: '...' },
            // ...
        ]
    },
    'design-ux': {
        name: 'Design & UX',
        description: 'UI/UX trends, tools, and thought leadership',
        feeds: [/* ... */]
    }
};
```

#### UI

I settings under "RSS Sources":
- "Browse Collections" → modal med kurerade paket
- Varje paket: namn, beskrivning, antal feeds, "Add All"-knapp
- Pro-feature: community-skapade samlingar

**Verifiering:**
- Klick "Add All" → alla feeds i paketet läggs till som custom feeds
- Redan tillagda feeds skippas (dedup)
- Free: bara default collections. Pro: community collections

---

### Feature 3.0.6: Multi-device Sync

**Problem:** Data lever i localStorage — försvinner vid byte av enhet/browser.

**Lösning:** Redan löst via Feature 2.0.1 (Supabase Auth) + Feature 2.0.2 (server-side persistence). Denna feature handlar om realtidssynk.

#### Implementation

Supabase Realtime:
```javascript
// Lyssna på ändringar i article_interactions
supabase
    .channel('sync')
    .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'article_interactions',
        filter: `user_id=eq.${user.id}`
    }, (payload) => {
        // Uppdatera lokal state
        mergeInteraction(payload.new);
        renderArticles();
    })
    .subscribe();
```

**Verifiering:**
- Bokmärk artikel på laptop → syns på telefon inom 5s
- Läs artikel på telefon → markerad som läst på laptop
- Offline-ändring → synkas vid reconnect

---

## Sammanfattning: Filer per version

### v1.1
| Fil | Typ | Beskrivning |
|-----|-----|-------------|
| `api/summary-cache.js` | Ny | Summary-cache med Vercel KV |
| `app.js` | Ändra | Batch-scoring, score-motivering, share, briefing, callLLM options |
| `index.html` | Ändra | Briefing-knapp, share-knapp |
| `style.css` | Ändra | Briefing-vy, score-reason, toast, share-styling |
| `package.json` | Ny/Ändra | @vercel/kv dependency |

### v2.0
| Fil | Typ | Beskrivning |
|-----|-----|-------------|
| `api/auth.js` | Ny | Supabase auth helper |
| `api/user-settings.js` | Ny | CRUD user preferences |
| `api/user-articles.js` | Ny | CRUD article interactions |
| `api/cron-briefing.js` | Ny | Daglig briefing cron job |
| `api/subscribe-push.js` | Ny | Push-prenumeration |
| `api/subscribe-email.js` | Ny | E-post-prenumeration |
| `lib/supabase.js` | Ny | Supabase client |
| `app.js` | Ändra | Auth, sync, feedback loop, answer engine, discovery |
| `index.html` | Ändra | Auth UI, search-upgrade, discover-knapp |
| `style.css` | Ändra | Auth modal, answer engine, discovery |
| `vercel.json` | Ändra | Cron config |

### v3.0
| Fil | Typ | Beskrivning |
|-----|-----|-------------|
| `api/stripe-webhook.js` | Ny | Stripe webhook handler |
| `api/create-checkout.js` | Ny | Checkout session |
| `api/manage-subscription.js` | Ny | Kundportal |
| `api/community-prompts.js` | Ny | CRUD community prompts |
| `app.js` | Ändra | Freemium gating, OPML, clustering, collections, realtime sync |
| `index.html` | Ändra | Pricing UI, OPML import, collections browser |
| `style.css` | Ändra | Pricing, community gallery, cluster view |

---

## Tekniska beroenden per version

### v1.1
- Vercel KV (Redis) — Hobby plan (gratis)

### v2.0
- Supabase (PostgreSQL + Auth + Realtime) — Free tier
- Resend (email) — Free tier (100 mail/dag)
- Web Push API (inbyggt i browser)

### v3.0
- Stripe (betalningar) — Pay-as-you-go
- Supabase Pro ($25/mån) — Mer storage/connections

---

*Senast uppdaterad: 2026-02-15*
