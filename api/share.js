// Weft: Shareable article summary endpoint (AIX-31)
// GET  /api/share?id={articleId}  — render public HTML page with OG tags
// POST /api/share                 — save article data + summary, return share URL

const SUPABASE_URL = 'https://actadsweocnjodxfswnh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFjdGFkc3dlb2Nuam9keGZzd25oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzExNDExODMsImV4cCI6MjA4NjcxNzE4M30.5Nans_6e2uYCPVFYQCyOa-OmZMwCL32XENLfegS6H6s';
const SITE_URL = 'https://weft-web.vercel.app';

// In-memory rate limiter: ip -> { count, windowStart }
const rateLimitMap = new Map();
const RATE_LIMIT = 10;       // max saves per IP
const RATE_WINDOW = 60 * 60 * 1000; // 1 hour

function checkRateLimit(ip) {
    const now = Date.now();
    const entry = rateLimitMap.get(ip);
    if (!entry || (now - entry.windowStart) > RATE_WINDOW) {
        rateLimitMap.set(ip, { count: 1, windowStart: now });
        return true;
    }
    if (entry.count >= RATE_LIMIT) return false;
    entry.count++;
    return true;
}

// Simple hash for article ID -> short deterministic share ID
function hashId(str) {
    let h = 5381;
    for (let i = 0; i < str.length; i++) {
        h = ((h << 5) + h) ^ str.charCodeAt(i);
        h = h >>> 0;
    }
    return h.toString(36);
}

function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

async function fetchSummary(shareId) {
    const url = `${SUPABASE_URL}/rest/v1/shared_summaries?id=eq.${encodeURIComponent(shareId)}&select=*`;
    const res = await fetch(url, {
        headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        }
    });
    if (!res.ok) return null;
    const rows = await res.json();
    return rows && rows.length > 0 ? rows[0] : null;
}

async function saveSummary(shareId, data) {
    // Upsert — if already exists, increment share_count
    const url = `${SUPABASE_URL}/rest/v1/shared_summaries`;
    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'resolution=merge-duplicates',
        },
        body: JSON.stringify({
            id: shareId,
            article_url: data.url,
            article_title: data.title,
            article_source: data.source,
            article_date: data.date || null,
            category: data.category || null,
            summary: data.summary,
            summary_style: data.summaryStyle || 'newsletter',
        })
    });
    return res.ok;
}

function renderSharePage(summary, shareUrl) {
    const title = escapeHtml(summary.article_title);
    const source = escapeHtml(summary.article_source);
    const category = escapeHtml(summary.category || '');
    const articleUrl = escapeHtml(summary.article_url);
    const summaryText = escapeHtml(summary.summary);
    const date = summary.article_date
        ? new Date(summary.article_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
        : '';
    const ogDesc = summary.summary.slice(0, 200).replace(/\n/g, ' ');

    // Format summary: convert markdown-like bullet points
    const formattedSummary = summary.summary
        .split('\n')
        .map(line => {
            const escaped = escapeHtml(line);
            if (escaped.startsWith('• ') || escaped.startsWith('- ')) {
                return `<li>${escaped.slice(2)}</li>`;
            }
            if (escaped.startsWith('**') && escaped.endsWith('**')) {
                return `<h3>${escaped.slice(2, -2)}</h3>`;
            }
            return escaped ? `<p>${escaped}</p>` : '';
        })
        .join('\n');

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} — Weft AI Summary</title>
    <meta name="description" content="${escapeHtml(ogDesc)}">
    <meta name="robots" content="index, follow">
    <link rel="canonical" href="${escapeHtml(shareUrl)}">
    <meta name="theme-color" content="#0a0a0b">

    <!-- Open Graph -->
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${escapeHtml(ogDesc)}">
    <meta property="og:type" content="article">
    <meta property="og:url" content="${escapeHtml(shareUrl)}">
    <meta property="og:site_name" content="Weft">
    <meta property="og:image" content="${SITE_URL}/icon-512.png">
    <meta property="og:image:width" content="512">
    <meta property="og:image:height" content="512">
    ${summary.article_date ? `<meta property="article:published_time" content="${summary.article_date}">` : ''}

    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${title}">
    <meta name="twitter:description" content="${escapeHtml(ogDesc)}">
    <meta name="twitter:image" content="${SITE_URL}/icon-512.png">

    <!-- Schema.org NewsArticle -->
    <script type="application/ld+json">
    {
        "@context": "https://schema.org",
        "@type": "NewsArticle",
        "headline": ${JSON.stringify(summary.article_title)},
        "description": ${JSON.stringify(ogDesc)},
        "url": ${JSON.stringify(summary.article_url)},
        "datePublished": ${summary.article_date ? JSON.stringify(summary.article_date) : 'null'},
        "publisher": {
            "@type": "Organization",
            "name": ${JSON.stringify(summary.article_source)},
            "url": ${JSON.stringify(summary.article_url)}
        }
    }
    </script>

    <style>
        :root {
            --bg: #0a0a0b;
            --surface: #141416;
            --border: #232328;
            --text: #e8e8ea;
            --muted: #8888a0;
            --accent: #7c6af7;
            --accent-light: #9d8ff9;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: var(--bg);
            color: var(--text);
            min-height: 100vh;
            line-height: 1.6;
        }
        header {
            border-bottom: 1px solid var(--border);
            padding: 16px 24px;
            display: flex;
            align-items: center;
            gap: 12px;
        }
        header a {
            display: flex;
            align-items: center;
            gap: 10px;
            text-decoration: none;
            color: var(--text);
            font-weight: 700;
            font-size: 18px;
            letter-spacing: -0.02em;
        }
        header .logo-dot {
            width: 8px; height: 8px;
            background: var(--accent);
            border-radius: 50%;
        }
        main {
            max-width: 720px;
            margin: 0 auto;
            padding: 48px 24px 80px;
        }
        .meta {
            display: flex;
            align-items: center;
            gap: 10px;
            flex-wrap: wrap;
            margin-bottom: 16px;
        }
        .source {
            font-size: 13px;
            color: var(--muted);
            font-weight: 500;
        }
        .date {
            font-size: 13px;
            color: var(--muted);
        }
        .category-badge {
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.06em;
            background: rgba(124, 106, 247, 0.15);
            color: var(--accent-light);
            border: 1px solid rgba(124, 106, 247, 0.3);
            border-radius: 4px;
            padding: 2px 8px;
        }
        h1 {
            font-size: clamp(22px, 4vw, 30px);
            font-weight: 700;
            line-height: 1.25;
            letter-spacing: -0.02em;
            margin-bottom: 24px;
        }
        .summary-label {
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            color: var(--accent-light);
            margin-bottom: 16px;
            display: flex;
            align-items: center;
            gap: 6px;
        }
        .summary-label::before {
            content: '';
            display: inline-block;
            width: 3px;
            height: 14px;
            background: var(--accent);
            border-radius: 2px;
        }
        .summary-box {
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: 12px;
            padding: 28px 32px;
            margin-bottom: 32px;
        }
        .summary-box p {
            margin-bottom: 12px;
            color: var(--text);
            font-size: 16px;
        }
        .summary-box p:last-child { margin-bottom: 0; }
        .summary-box h3 {
            font-size: 15px;
            font-weight: 600;
            color: var(--accent-light);
            margin: 20px 0 8px;
        }
        .summary-box ul {
            padding-left: 0;
            list-style: none;
        }
        .summary-box li {
            padding: 4px 0 4px 20px;
            position: relative;
            color: var(--text);
            font-size: 16px;
        }
        .summary-box li::before {
            content: '•';
            position: absolute;
            left: 0;
            color: var(--accent);
        }
        .actions {
            display: flex;
            gap: 12px;
            flex-wrap: wrap;
        }
        .btn-primary {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            background: var(--accent);
            color: #fff;
            border: none;
            border-radius: 8px;
            padding: 12px 24px;
            font-size: 15px;
            font-weight: 600;
            text-decoration: none;
            cursor: pointer;
            transition: opacity 0.15s;
        }
        .btn-primary:hover { opacity: 0.85; }
        .btn-secondary {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            background: transparent;
            color: var(--text);
            border: 1px solid var(--border);
            border-radius: 8px;
            padding: 12px 24px;
            font-size: 15px;
            font-weight: 500;
            text-decoration: none;
            cursor: pointer;
            transition: border-color 0.15s;
        }
        .btn-secondary:hover { border-color: var(--muted); }
        .divider {
            height: 1px;
            background: var(--border);
            margin: 40px 0;
        }
        .cta-section {
            text-align: center;
        }
        .cta-section h2 {
            font-size: 22px;
            font-weight: 700;
            margin-bottom: 12px;
            letter-spacing: -0.02em;
        }
        .cta-section p {
            color: var(--muted);
            margin-bottom: 24px;
            font-size: 15px;
        }
        footer {
            text-align: center;
            padding: 24px;
            border-top: 1px solid var(--border);
            color: var(--muted);
            font-size: 13px;
        }
        footer a { color: var(--muted); }
    </style>
</head>
<body>
    <header>
        <a href="${SITE_URL}/">
            <span class="logo-dot"></span>
            Weft
        </a>
    </header>

    <main>
        <div class="meta">
            ${source ? `<span class="source">${source}</span>` : ''}
            ${date ? `<span class="date">${date}</span>` : ''}
            ${category ? `<span class="category-badge">${category}</span>` : ''}
        </div>

        <h1>${title}</h1>

        <div class="summary-label">AI Summary</div>
        <div class="summary-box">
            ${formattedSummary}
        </div>

        <div class="actions">
            <a href="${articleUrl}" class="btn-secondary" target="_blank" rel="noopener noreferrer">
                Read original article ↗
            </a>
        </div>

        <div class="divider"></div>

        <div class="cta-section">
            <h2>Get AI summaries for every story</h2>
            <p>Weft scores and summarizes news from 100+ sources — automatically, every day.</p>
            <a href="${SITE_URL}/" class="btn-primary">Try Weft free →</a>
        </div>
    </main>

    <footer>
        <p>AI summary generated by <a href="${SITE_URL}/">Weft</a> · <a href="${articleUrl}" target="_blank" rel="noopener noreferrer">Original article</a></p>
    </footer>
</body>
</html>`;
}

export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // GET — render public share page
    if (req.method === 'GET') {
        const { id } = req.query;
        if (!id || typeof id !== 'string' || id.length > 20) {
            return res.status(400).send('Invalid share ID.');
        }

        const summary = await fetchSummary(id);
        if (!summary) {
            return res.status(404).send(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Summary not found — Weft</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: -apple-system, sans-serif; background: #0a0a0b; color: #e8e8ea;
               display: flex; align-items: center; justify-content: center; min-height: 100vh; }
        .box { text-align: center; }
        h1 { font-size: 24px; margin-bottom: 12px; }
        p { color: #8888a0; margin-bottom: 24px; }
        a { color: #7c6af7; }
    </style>
</head>
<body>
    <div class="box">
        <h1>Summary not found</h1>
        <p>This shared summary may have expired or been removed.</p>
        <a href="${SITE_URL}/">Go to Weft →</a>
    </div>
</body>
</html>`);
        }

        const shareUrl = `${SITE_URL}/share?id=${id}`;
        const html = renderSharePage(summary, shareUrl);

        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
        return res.status(200).send(html);
    }

    // POST — save article data and return share URL
    if (req.method === 'POST') {
        const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';

        if (!checkRateLimit(ip)) {
            return res.status(429).json({ error: 'Rate limit exceeded. Try again later.' });
        }

        const { articleId, url, title, source, date, category, summary, summaryStyle } = req.body || {};

        // Validate required fields
        if (!articleId || !url || !title || !source || !summary) {
            return res.status(400).json({ error: 'Missing required fields: articleId, url, title, source, summary' });
        }

        if (typeof articleId !== 'string' || typeof url !== 'string' ||
            typeof title !== 'string' || typeof source !== 'string' ||
            typeof summary !== 'string') {
            return res.status(400).json({ error: 'Fields must be strings' });
        }

        if (title.length > 500 || source.length > 200 || summary.length > 10000 || url.length > 2000) {
            return res.status(400).json({ error: 'Field too long' });
        }

        // Validate URL
        try {
            const parsed = new URL(url);
            if (!['http:', 'https:'].includes(parsed.protocol)) {
                return res.status(400).json({ error: 'Invalid URL' });
            }
        } catch {
            return res.status(400).json({ error: 'Invalid URL' });
        }

        const shareId = hashId(articleId);

        const ok = await saveSummary(shareId, { url, title, source, date, category, summary, summaryStyle });
        if (!ok) {
            return res.status(500).json({ error: 'Failed to save summary' });
        }

        const shareUrl = `${SITE_URL}/share?id=${shareId}`;
        return res.status(200).json({ shareId, shareUrl });
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
