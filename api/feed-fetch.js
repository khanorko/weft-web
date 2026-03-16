// Weft: Server-side feed fetcher (AIX-39)
// Vercel cron: runs every hour (requires Pro plan for sub-daily crons)
// Also callable via POST for manual triggers (protected by FEED_FETCH_SECRET).
//
// Required env vars:
//   SUPABASE_SERVICE_ROLE_KEY  — Supabase service role key (bypasses RLS)
//   FEED_FETCH_SECRET          — Optional: protects manual POST triggers

import { ALL_FEEDS } from './feeds-config.js';

const SUPABASE_URL = 'https://actadsweocnjodxfswnh.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// How many articles to keep per feed per fetch
const MAX_ARTICLES_PER_FEED = 10;
// Delete articles older than this many days
const MAX_ARTICLE_AGE_DAYS = 7;
// Fetch timeout per feed (ms)
const FEED_TIMEOUT_MS = 12000;

// ==================== XML PARSER ====================

function decodeCdata(str) {
    return str.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
}

function stripTags(str) {
    return str.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function decodeEntities(str) {
    return str
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&apos;/g, "'")
        .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)));
}

function cleanText(raw) {
    return decodeEntities(stripTags(decodeCdata(raw || ''))).trim();
}

function extractTagContent(xml, tag) {
    // Handles both <tag>content</tag> and CDATA inside
    const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
    const m = re.exec(xml);
    return m ? decodeCdata(m[1]).trim() : '';
}

function extractAtomLink(entryXml) {
    // Prefer rel="alternate", fall back to first <link href="...">
    const altMatch = /\<link[^>]+rel=["']alternate["'][^>]*href=["']([^"']+)["']/.exec(entryXml)
        || /\<link[^>]+href=["']([^"']+)["'][^>]*rel=["']alternate["']/.exec(entryXml);
    if (altMatch) return altMatch[1];
    const hrefMatch = /\<link[^>]+href=["']([^"']+)["']/.exec(entryXml);
    if (hrefMatch) return hrefMatch[1];
    return extractTagContent(entryXml, 'link');
}

function parseRssDate(raw) {
    if (!raw) return new Date();
    const d = new Date(raw);
    return isNaN(d.getTime()) ? new Date() : d;
}

function extractKeywords(title) {
    const stopWords = new Set([
        'the','a','an','is','are','was','were','it','its','in','on','at','to','for',
        'of','and','or','but','with','by','from','as','be','this','that','how','what',
        'why','when','where','who','new','first','just','now','get','can','will','one',
        'all','has','have','been','more','your','out','up','about','says','said',
    ]);
    return title
        .split(/\s+/)
        .map(w => w.replace(/[^\w]/g, '').toLowerCase())
        .filter(w => w.length > 2 && !stopWords.has(w))
        .slice(0, 4);
}

function parseFeed(text, feed) {
    const isAtom = /<feed[\s>]/i.test(text);
    const items = [];

    if (isAtom) {
        const entryRe = /<entry[\s>]([\s\S]*?)<\/entry>/gi;
        let m;
        while ((m = entryRe.exec(text)) !== null && items.length < MAX_ARTICLES_PER_FEED) {
            const e = m[1];
            const title = cleanText(extractTagContent(e, 'title'));
            const link = extractAtomLink(e).trim();
            const description = cleanText(extractTagContent(e, 'summary') || extractTagContent(e, 'content'));
            const pubDate = parseRssDate(
                extractTagContent(e, 'published') || extractTagContent(e, 'updated')
            );
            const guid = (extractTagContent(e, 'id') || link).trim();
            if (!title || !link) continue;
            items.push({ title, link, description, pubDate, guid });
        }
    } else {
        const itemRe = /<item[\s>]([\s\S]*?)<\/item>/gi;
        let m;
        while ((m = itemRe.exec(text)) !== null && items.length < MAX_ARTICLES_PER_FEED) {
            const e = m[1];
            const title = cleanText(extractTagContent(e, 'title'));
            // <link> in RSS 2.0 is a text node; it can also appear as <link>url</link>
            let link = extractTagContent(e, 'link').trim();
            // Some feeds use <link href="..."/>
            if (!link) {
                const hm = /<link[^>]+href=["']([^"']+)["']/.exec(e);
                if (hm) link = hm[1];
            }
            const description = cleanText(
                extractTagContent(e, 'description') ||
                extractTagContent(e, 'content:encoded')
            );
            const pubDate = parseRssDate(extractTagContent(e, 'pubDate'));
            const guid = (extractTagContent(e, 'guid') || link).trim();
            if (!title || !link) continue;
            items.push({ title, link, description, pubDate, guid });
        }
    }

    return items.map(item => ({
        guid:        item.guid.slice(0, 2048),
        title:       item.title.slice(0, 512),
        description: item.description.slice(0, 500),
        link:        item.link.slice(0, 2048),
        pub_date:    item.pubDate.toISOString(),
        source:      feed.name,
        category:    feed.category,
        feed_url:    feed.url,
        keywords:    extractKeywords(item.title),
    }));
}

// ==================== SUPABASE HELPERS ====================

function sbHeaders() {
    return {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates,return=minimal',
    };
}

async function upsertArticles(articles) {
    if (!articles.length) return;
    const res = await fetch(`${SUPABASE_URL}/rest/v1/articles`, {
        method: 'POST',
        headers: sbHeaders(),
        body: JSON.stringify(articles),
    });
    if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Supabase upsert failed: ${res.status} ${txt}`);
    }
}

async function upsertFeedHealth(record) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/feed_health`, {
        method: 'POST',
        headers: sbHeaders(),
        body: JSON.stringify(record),
    });
    if (!res.ok) {
        // Non-fatal: log but don't throw
        console.error('feed_health upsert failed:', res.status, await res.text());
    }
}

async function deleteOldArticles() {
    const cutoff = new Date(Date.now() - MAX_ARTICLE_AGE_DAYS * 86400 * 1000).toISOString();
    const res = await fetch(
        `${SUPABASE_URL}/rest/v1/articles?pub_date=lt.${cutoff}`,
        { method: 'DELETE', headers: sbHeaders() }
    );
    if (!res.ok) {
        console.error('Failed to delete old articles:', res.status);
    }
}

// ==================== FEED FETCHER ====================

async function fetchOneFeed(feed) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FEED_TIMEOUT_MS);
    try {
        const res = await fetch(feed.url, {
            headers: {
                'User-Agent': 'Weft/1.0 RSS Reader (+https://weft.news)',
                'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
            },
            signal: controller.signal,
            redirect: 'follow',
        });
        clearTimeout(timer);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const text = await res.text();
        const articles = parseFeed(text, feed);
        return { feed, articles, error: null };
    } catch (err) {
        clearTimeout(timer);
        return { feed, articles: [], error: err.message };
    }
}

// ==================== HANDLER ====================

export default async function handler(req, res) {
    // Allow GET (Vercel cron) and POST (manual trigger)
    if (req.method !== 'GET' && req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Protect manual POST with optional secret
    if (req.method === 'POST') {
        const secret = process.env.FEED_FETCH_SECRET;
        if (secret && req.headers['x-feed-fetch-secret'] !== secret) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
    }

    if (!SUPABASE_SERVICE_KEY) {
        return res.status(500).json({ error: 'SUPABASE_SERVICE_ROLE_KEY not set' });
    }

    const start = Date.now();

    // Fetch all feeds concurrently (batched to avoid overwhelming targets)
    const BATCH = 10;
    const results = [];
    for (let i = 0; i < ALL_FEEDS.length; i += BATCH) {
        const batch = ALL_FEEDS.slice(i, i + BATCH);
        const batchResults = await Promise.all(batch.map(fetchOneFeed));
        results.push(...batchResults);
    }

    // Upsert articles + update feed health
    let totalArticles = 0;
    let successFeeds = 0;
    let failedFeeds = 0;

    // Collect all articles for a single batch upsert
    const allArticles = [];
    for (const { feed, articles, error } of results) {
        if (error) {
            failedFeeds++;
            await upsertFeedHealth({
                feed_url:          feed.url,
                feed_name:         feed.name,
                category:          feed.category,
                last_fetch_at:     new Date().toISOString(),
                last_error:        error.slice(0, 500),
                // Increment consecutive_errors via DB expression not supported via REST — set to -1 as marker
                consecutive_errors: 1,
            });
        } else {
            successFeeds++;
            totalArticles += articles.length;
            allArticles.push(...articles);
            await upsertFeedHealth({
                feed_url:          feed.url,
                feed_name:         feed.name,
                category:          feed.category,
                last_fetch_at:     new Date().toISOString(),
                last_success_at:   new Date().toISOString(),
                last_error:        null,
                consecutive_errors: 0,
                total_articles:    articles.length,
            });
        }
    }

    // Batch upsert all articles at once
    if (allArticles.length > 0) {
        try {
            // Supabase REST upsert max ~500 rows at a time
            const UPSERT_BATCH = 400;
            for (let i = 0; i < allArticles.length; i += UPSERT_BATCH) {
                await upsertArticles(allArticles.slice(i, i + UPSERT_BATCH));
            }
        } catch (err) {
            console.error('Batch upsert error:', err.message);
        }
    }

    // Prune old articles
    await deleteOldArticles();

    const elapsed = Date.now() - start;
    console.log(`feed-fetch done: ${successFeeds} ok, ${failedFeeds} failed, ${totalArticles} articles in ${elapsed}ms`);

    return res.status(200).json({
        success: true,
        feeds: { ok: successFeeds, failed: failedFeeds },
        articles: totalArticles,
        ms: elapsed,
    });
}
