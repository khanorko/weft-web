// Weft: Articles endpoint (AIX-39)
// Serves pre-fetched articles from Supabase to the client.
// Replaces direct client-side RSS fetching via cors-proxy.
//
// GET /api/articles
//   ?category=tech        — filter by category key (optional)
//   ?since=ISO8601        — only articles newer than this (optional, default: 72h ago)
//   ?limit=N              — max articles (default 200, max 500)
//   ?sources=true         — include list of unique sources/feeds with article counts
//
// Returns:
//   { articles: [...], fetchedAt: ISO8601, total: N }

const SUPABASE_URL = 'https://actadsweocnjodxfswnh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFjdGFkc3dlb2Nuam9keGZzd25oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzExNDExODMsImV4cCI6MjA4NjcxNzE4M30.5Nans_6e2uYCPVFYQCyOa-OmZMwCL32XENLfegS6H6s';

const DEFAULT_LIMIT = 200;
const MAX_LIMIT = 500;
const DEFAULT_WINDOW_HOURS = 72;

function hashCode(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
        h = Math.imul(31, h) + str.charCodeAt(i) | 0;
    }
    return (h >>> 0).toString(36);
}

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { category, since, limit: limitParam } = req.query;

    const limit = Math.min(parseInt(limitParam || DEFAULT_LIMIT, 10) || DEFAULT_LIMIT, MAX_LIMIT);

    const sinceDate = since
        ? new Date(since)
        : new Date(Date.now() - DEFAULT_WINDOW_HOURS * 3600 * 1000);

    if (isNaN(sinceDate.getTime())) {
        return res.status(400).json({ error: 'Invalid since parameter' });
    }

    // Build Supabase query
    let url = `${SUPABASE_URL}/rest/v1/articles?pub_date=gte.${sinceDate.toISOString()}&order=pub_date.desc&limit=${limit}`;
    if (category) {
        url += `&category=eq.${encodeURIComponent(category)}`;
    }
    url += '&select=guid,title,description,link,pub_date,source,category,feed_url,keywords';

    const supaRes = await fetch(url, {
        headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
    });

    if (!supaRes.ok) {
        const err = await supaRes.text();
        console.error('Supabase articles fetch error:', supaRes.status, err);
        return res.status(502).json({ error: 'Failed to fetch articles from database' });
    }

    const rows = await supaRes.json();

    // Transform to client-expected shape (mirrors what app.js builds from RSS)
    const articles = rows.map(row => ({
        id:          'art_' + hashCode(row.link + row.source),
        title:       row.title,
        description: row.description,
        link:        row.link,
        date:        row.pub_date,
        source:      row.source,
        category:    row.category,
        feedUrl:     row.feed_url,
        keywords:    row.keywords || [],
        // User-state fields — client overlays these from localStorage/Supabase
        summary:     null,
        liked:       false,
        disliked:    false,
        bookmarked:  false,
        read:        false,
    }));

    // Cache for 5 minutes at CDN edge
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=60');
    res.setHeader('Vary', 'Accept-Encoding');

    return res.status(200).json({
        articles,
        fetchedAt: new Date().toISOString(),
        total: articles.length,
    });
}
