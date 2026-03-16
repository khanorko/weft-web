// Weft: Public daily briefing page (AIX-32)
// GET /briefing/today  → redirects to today's date URL
// GET /briefing/:date  → server-rendered HTML briefing page
// Query param: ?date=YYYY-MM-DD (set by vercel.json rewrites)

const SUPABASE_URL = 'https://actadsweocnjodxfswnh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFjdGFkc3dlb2Nuam9keGZzd25oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzExNDExODMsImV4cCI6MjA4NjcxNzE4M30.5Nans_6e2uYCPVFYQCyOa-OmZMwCL32XENLfegS6H6s';
const SITE_URL = 'https://weft.news';

const CATEGORY_ORDER = ['AI', 'Tech', 'World', 'Business', 'Science', 'Politics', 'Culture', 'Sports'];

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function todayUTC() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00Z');
  return d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
}

function prevDay(dateStr) {
  const d = new Date(dateStr + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

function nextDay(dateStr) {
  const d = new Date(dateStr + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

// ==================== SUPABASE ====================

async function fetchBriefing(date) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/daily_briefings?date=eq.${date}&select=*`,
    { headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` } }
  );
  if (!res.ok) return null;
  const rows = await res.json();
  return rows.length > 0 ? rows[0] : null;
}

async function fetchRecentDates(limit = 7) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/daily_briefings?select=date&order=date.desc&limit=${limit}`,
    { headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` } }
  );
  if (!res.ok) return [];
  return (await res.json()).map(r => r.date);
}

// ==================== HTML RENDERING ====================

function renderStoriesByCategory(stories) {
  const grouped = {};
  for (const s of stories) {
    const cat = s.category || 'Other';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(s);
  }

  const orderedCats = [
    ...CATEGORY_ORDER.filter(c => grouped[c]),
    ...Object.keys(grouped).filter(c => !CATEGORY_ORDER.includes(c)),
  ];

  return orderedCats.map(cat => {
    const catStories = grouped[cat];
    const items = catStories.map((s, idx) => {
      const globalIdx = stories.indexOf(s) + 1;
      return `
    <article class="story" itemscope itemtype="https://schema.org/NewsArticle">
      <meta itemprop="datePublished" content="${escapeHtml(s.pubDate || '')}">
      <meta itemprop="author" content="${escapeHtml(s.source)}">
      <div class="story-meta">
        <span class="story-source">${escapeHtml(s.source)}</span>
        ${s.trending ? '<span class="story-trending">Trending</span>' : ''}
        ${s.score >= 9 ? '<span class="story-breaking">Breaking</span>' : ''}
      </div>
      <h3 class="story-title" itemprop="headline">
        <a href="${escapeHtml(s.url || s.link || '#')}" rel="noopener noreferrer" target="_blank" itemprop="url">${escapeHtml(s.title)}</a>
      </h3>
      <p class="story-summary" itemprop="description">${escapeHtml(s.summary || s.description || '')}</p>
    </article>`;
    }).join('');

    return `
  <section class="category-section">
    <h2 class="category-title">${escapeHtml(cat)}</h2>
    <div class="stories-grid">${items}
    </div>
  </section>`;
  }).join('');
}

function renderStructuredData(date, stories) {
  const itemList = stories.slice(0, 15).map((s, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    item: {
      '@type': 'NewsArticle',
      headline: s.title,
      description: s.summary || s.description || '',
      url: s.url || s.link || '',
      datePublished: s.pubDate || date,
      publisher: { '@type': 'Organization', name: s.source },
    }
  }));

  return JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        url: `${SITE_URL}/briefing/${date}`,
        name: `Daily News Briefing — ${formatDate(date)} | Weft`,
        description: `Today's top stories across AI, tech, business, world news and science. AI-powered summaries by Weft.`,
        isPartOf: { '@type': 'WebSite', name: 'Weft', url: SITE_URL },
      },
      {
        '@type': 'ItemList',
        name: `Top stories for ${formatDate(date)}`,
        numberOfItems: stories.length,
        itemListElement: itemList,
      }
    ]
  });
}

function renderPage({ date, briefing, today, recentDates }) {
  const stories = briefing?.stories || [];
  const narrative = briefing?.narrative || '';
  const isToday = date === today;
  const isFuture = date > today;
  const hasBriefing = stories.length > 0;
  const formattedDate = formatDate(date);
  const prev = prevDay(date);
  const next = nextDay(date);
  const hasNext = next <= today && recentDates.includes(next);
  const hasPrev = recentDates.includes(prev);

  const pageTitle = `Daily News Briefing — ${formattedDate} | Weft`;
  const pageDesc = hasBriefing
    ? `Today's top ${stories.length} stories across AI, tech, business, and world news. AI-powered summaries by Weft.`
    : `Daily AI-curated news briefing for ${formattedDate}. AI-powered summaries by Weft.`;

  const ogImage = `${SITE_URL}/icon-512.png`;
  const canonicalUrl = `${SITE_URL}/briefing/${date}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(pageTitle)}</title>
  <meta name="description" content="${escapeHtml(pageDesc)}">
  <meta name="robots" content="${isFuture ? 'noindex' : 'index, follow'}">
  <link rel="canonical" href="${canonicalUrl}">

  <!-- Open Graph -->
  <meta property="og:title" content="${escapeHtml(pageTitle)}">
  <meta property="og:description" content="${escapeHtml(pageDesc)}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${canonicalUrl}">
  <meta property="og:site_name" content="Weft">
  <meta property="og:image" content="${ogImage}">
  <meta property="og:image:width" content="512">
  <meta property="og:image:height" content="512">

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(pageTitle)}">
  <meta name="twitter:description" content="${escapeHtml(pageDesc)}">
  <meta name="twitter:image" content="${ogImage}">

  <!-- Structured Data -->
  <script type="application/ld+json">${renderStructuredData(date, stories)}</script>

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&display=swap">
  <link rel="icon" href="/icon.svg" type="image/svg+xml">
  <link rel="apple-touch-icon" href="/icon-192.png">

  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --bg: #0a0a0b;
      --surface: #111113;
      --surface2: #18181b;
      --border: #27272a;
      --text: #fafafa;
      --text-muted: #a1a1aa;
      --text-subtle: #52525b;
      --accent: #e4e4e7;
      --green: #22c55e;
      --blue: #3b82f6;
      --yellow: #eab308;
      --red: #ef4444;
      --serif: 'Instrument Serif', Georgia, serif;
      --sans: 'DM Sans', system-ui, sans-serif;
    }

    html { font-size: 16px; }

    body {
      background: var(--bg);
      color: var(--text);
      font-family: var(--sans);
      font-weight: 400;
      line-height: 1.6;
      -webkit-font-smoothing: antialiased;
      min-height: 100vh;
    }

    a { color: inherit; text-decoration: none; }
    a:hover { color: var(--text-muted); }

    /* ---- Header ---- */
    .site-header {
      position: sticky;
      top: 0;
      z-index: 100;
      background: rgba(10,10,11,0.88);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border-bottom: 1px solid rgba(255,255,255,0.05);
      padding: 0.75rem 1.5rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
    }

    .site-logo {
      font-family: var(--serif);
      font-size: 1.2rem;
      letter-spacing: -0.02em;
      color: var(--text);
    }

    .header-cta {
      background: var(--text);
      color: var(--bg);
      font-size: 0.8125rem;
      font-weight: 500;
      padding: 0.4rem 0.9rem;
      border-radius: 6px;
      white-space: nowrap;
      transition: opacity 0.15s;
    }
    .header-cta:hover { opacity: 0.85; color: var(--bg); }

    /* ---- Page layout ---- */
    .page-container {
      max-width: 860px;
      margin: 0 auto;
      padding: 2rem 1.5rem 4rem;
    }

    /* ---- Briefing header ---- */
    .briefing-header {
      margin-bottom: 2.5rem;
      padding-bottom: 1.5rem;
      border-bottom: 1px solid var(--border);
    }

    .briefing-label {
      display: inline-block;
      font-size: 0.75rem;
      font-weight: 500;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--text-muted);
      margin-bottom: 0.75rem;
      background: var(--surface2);
      border: 1px solid var(--border);
      border-radius: 100px;
      padding: 0.2rem 0.7rem;
    }

    .briefing-title {
      font-family: var(--serif);
      font-size: clamp(1.8rem, 5vw, 2.6rem);
      line-height: 1.15;
      letter-spacing: -0.02em;
      color: var(--text);
      margin-bottom: 0.5rem;
    }

    .briefing-date {
      color: var(--text-muted);
      font-size: 0.9rem;
    }

    /* ---- Date navigation ---- */
    .date-nav {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-top: 1.25rem;
      flex-wrap: wrap;
    }

    .date-nav a {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      font-size: 0.8125rem;
      color: var(--text-muted);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 0.3rem 0.7rem;
      transition: border-color 0.15s, color 0.15s;
    }
    .date-nav a:hover { border-color: var(--text-subtle); color: var(--text); }
    .date-nav-sep { color: var(--text-subtle); font-size: 0.75rem; }

    /* ---- Share button ---- */
    .share-btn {
      margin-left: auto;
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      font-size: 0.8125rem;
      color: var(--text-muted);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 0.3rem 0.7rem;
      background: none;
      cursor: pointer;
      font-family: var(--sans);
      transition: border-color 0.15s, color 0.15s;
    }
    .share-btn:hover { border-color: var(--text-subtle); color: var(--text); }

    /* ---- Narrative ---- */
    .narrative {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 1.25rem 1.5rem;
      margin-bottom: 2.5rem;
      color: var(--accent);
      font-size: 1rem;
      line-height: 1.7;
      font-style: italic;
      position: relative;
    }

    .narrative::before {
      content: 'Today\00B4s Overview';
      display: block;
      font-style: normal;
      font-size: 0.7rem;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--text-subtle);
      margin-bottom: 0.6rem;
    }

    /* ---- Category sections ---- */
    .category-section { margin-bottom: 2.5rem; }

    .category-title {
      font-size: 0.7rem;
      font-weight: 600;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--text-subtle);
      margin-bottom: 1rem;
      padding-bottom: 0.5rem;
      border-bottom: 1px solid var(--border);
    }

    .stories-grid { display: flex; flex-direction: column; gap: 0; }

    /* ---- Individual story ---- */
    .story {
      padding: 1rem 0;
      border-bottom: 1px solid rgba(39,39,42,0.6);
    }
    .story:last-child { border-bottom: none; }

    .story-meta {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.35rem;
    }

    .story-source {
      font-size: 0.75rem;
      color: var(--text-muted);
      font-weight: 500;
    }

    .story-trending, .story-breaking {
      font-size: 0.65rem;
      font-weight: 600;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      border-radius: 4px;
      padding: 0.1rem 0.45rem;
    }

    .story-trending {
      background: rgba(59,130,246,0.12);
      color: var(--blue);
      border: 1px solid rgba(59,130,246,0.25);
    }

    .story-breaking {
      background: rgba(239,68,68,0.12);
      color: var(--red);
      border: 1px solid rgba(239,68,68,0.25);
    }

    .story-title {
      font-family: var(--serif);
      font-size: 1.1rem;
      line-height: 1.35;
      font-weight: 400;
      margin-bottom: 0.4rem;
    }

    .story-title a {
      color: var(--text);
      transition: color 0.15s;
    }
    .story-title a:hover { color: var(--text-muted); }

    .story-summary {
      font-size: 0.875rem;
      color: var(--text-muted);
      line-height: 1.6;
    }

    /* ---- Empty state ---- */
    .empty-state {
      text-align: center;
      padding: 3rem 1rem;
      color: var(--text-muted);
    }

    .empty-state h2 {
      font-family: var(--serif);
      font-size: 1.5rem;
      margin-bottom: 0.75rem;
      color: var(--text);
    }

    .empty-state p { font-size: 0.9rem; margin-bottom: 1.5rem; }

    /* ---- CTA section ---- */
    .cta-section {
      margin-top: 3rem;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 2rem 1.5rem;
      text-align: center;
    }

    .cta-title {
      font-family: var(--serif);
      font-size: 1.6rem;
      margin-bottom: 0.5rem;
    }

    .cta-desc {
      color: var(--text-muted);
      font-size: 0.9rem;
      margin-bottom: 1.25rem;
      max-width: 420px;
      margin-left: auto;
      margin-right: auto;
    }

    .cta-btn {
      display: inline-block;
      background: var(--text);
      color: var(--bg);
      font-size: 0.9375rem;
      font-weight: 500;
      padding: 0.65rem 1.5rem;
      border-radius: 8px;
      transition: opacity 0.15s;
    }
    .cta-btn:hover { opacity: 0.88; color: var(--bg); }

    /* ---- Footer ---- */
    .site-footer {
      border-top: 1px solid var(--border);
      padding: 1.5rem;
      text-align: center;
      font-size: 0.8rem;
      color: var(--text-subtle);
    }

    .site-footer a { color: var(--text-muted); }
    .site-footer a:hover { color: var(--text); }

    /* ---- Archive nav ---- */
    .archive-nav {
      margin-top: 2rem;
      padding-top: 1.5rem;
      border-top: 1px solid var(--border);
    }

    .archive-nav h3 {
      font-size: 0.7rem;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--text-subtle);
      margin-bottom: 0.75rem;
    }

    .archive-list {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      list-style: none;
    }

    .archive-list a {
      font-size: 0.8125rem;
      color: var(--text-muted);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 0.25rem 0.6rem;
      transition: border-color 0.15s, color 0.15s;
    }
    .archive-list a:hover { border-color: var(--text-subtle); color: var(--text); }
    .archive-list .current { color: var(--text); border-color: var(--text-subtle); }

    @media (max-width: 600px) {
      .page-container { padding: 1.5rem 1rem 3rem; }
      .site-header { padding: 0.6rem 1rem; }
      .narrative { padding: 1rem 1.1rem; }
    }
  </style>
</head>
<body>

<header class="site-header">
  <a class="site-logo" href="/">Weft</a>
  <a class="header-cta" href="/">Personalize your briefing</a>
</header>

<main class="page-container" itemscope itemtype="https://schema.org/WebPage">
  <div class="briefing-header">
    <span class="briefing-label">Daily Briefing</span>
    <h1 class="briefing-title">Today's top stories</h1>
    <p class="briefing-date">${escapeHtml(formattedDate)}</p>

    <nav class="date-nav" aria-label="Briefing navigation">
      ${hasPrev ? `<a href="/briefing/${prev}">&#8592; ${formatDate(prev).split(',')[0].split(' ').slice(0,2).join(' ')}</a>` : ''}
      ${hasNext ? `<a href="/briefing/${next}">${formatDate(next).split(',')[0].split(' ').slice(0,2).join(' ')} &#8594;</a>` : ''}
      ${isToday ? '' : `<a href="/briefing/today">Today</a>`}
      <button class="share-btn" onclick="shareIt()" type="button">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
        Share
      </button>
    </nav>
  </div>

  ${isFuture ? `
  <div class="empty-state">
    <h2>Not yet available</h2>
    <p>This briefing hasn't been generated yet. Check back later.</p>
    <a class="cta-btn" href="/briefing/today">Today's briefing</a>
  </div>` : !hasBriefing ? `
  <div class="empty-state">
    <h2>Briefing coming soon</h2>
    <p>Today's AI-curated briefing is being prepared. Check back in a few minutes.</p>
    <p style="margin-top:0.5rem;font-size:0.8rem;">Briefings are generated daily at 07:00 UTC.</p>
  </div>` : `

  ${narrative ? `<div class="narrative">${escapeHtml(narrative)}</div>` : ''}

  ${renderStoriesByCategory(stories)}

  `}

  <!-- Archive nav -->
  ${recentDates.length > 1 ? `
  <nav class="archive-nav">
    <h3>Recent briefings</h3>
    <ul class="archive-list">
      ${recentDates.map(d => `<li><a href="/briefing/${d}" class="${d === date ? 'current' : ''}" ${d === date ? 'aria-current="page"' : ''}>${formatDate(d).split(',')[0]}</a></li>`).join('')}
    </ul>
  </nav>` : ''}

  <!-- CTA -->
  <section class="cta-section">
    <h2 class="cta-title">Make it yours</h2>
    <p class="cta-desc">Get a personalized daily briefing tuned to your interests. Filter by category, score by relevance, and get AI summaries on demand.</p>
    <a class="cta-btn" href="/">Sign up free</a>
  </section>
</main>

<footer class="site-footer">
  <p>
    <a href="/">Weft</a> &middot;
    AI-curated news &middot;
    <a href="/briefing/today">Today's briefing</a>
  </p>
</footer>

<script>
  function shareIt() {
    const url = window.location.href;
    const title = document.title;
    if (navigator.share) {
      navigator.share({ title, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url).then(() => {
        const btn = document.querySelector('.share-btn');
        const orig = btn.textContent;
        btn.textContent = 'Copied!';
        setTimeout(() => { btn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg> Share'; }, 2000);
      });
    }
  }
</script>

</body>
</html>`;
}

// ==================== MAIN HANDLER ====================

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const today = todayUTC();
  let date = req.query?.date || 'today';

  if (date === 'today') {
    // Redirect to canonical date URL
    res.setHeader('Location', `/briefing/${today}`);
    res.setHeader('Cache-Control', 'public, max-age=300');
    return res.status(302).end();
  }

  // Validate date format YYYY-MM-DD
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    res.setHeader('Location', `/briefing/${today}`);
    return res.status(302).end();
  }

  // Cache: 10 min for today, 24h for past days
  const isToday = date === today;
  const cacheControl = isToday
    ? 'public, max-age=600, stale-while-revalidate=300'
    : 'public, max-age=86400, stale-while-revalidate=3600';

  try {
    const [briefing, recentDates] = await Promise.all([
      fetchBriefing(date),
      fetchRecentDates(7),
    ]);

    const html = renderPage({ date, briefing, today, recentDates });

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', cacheControl);
    return res.status(200).send(html);
  } catch (err) {
    console.error('Briefing render error:', err);
    return res.status(500).send(`<!DOCTYPE html><html><body><h1>Error loading briefing</h1><p>${escapeHtml(err.message)}</p><a href="/">Back to Weft</a></body></html>`);
  }
}
