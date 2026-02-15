// In-memory summary cache for Weft
// Reduces redundant LLM calls when multiple users view the same article
// Cache is per-instance (lost on cold start), but helps during warm periods

const cache = new Map();
const MAX_CACHE_SIZE = 500;
const TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

function cleanExpired() {
    const now = Date.now();
    for (const [key, entry] of cache) {
        if (now - entry.ts > TTL_MS) cache.delete(key);
    }
}

function evictIfNeeded() {
    if (cache.size <= MAX_CACHE_SIZE) return;
    // Remove oldest entries
    const entries = [...cache.entries()].sort((a, b) => a[1].ts - b[1].ts);
    const toRemove = entries.slice(0, cache.size - MAX_CACHE_SIZE + 50);
    for (const [key] of toRemove) cache.delete(key);
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method === 'GET') {
        const { id, style } = req.query;
        if (!id || !style) {
            return res.status(400).json({ error: 'Missing id or style parameter' });
        }
        if (id.length > 100 || style.length > 100) {
            return res.status(400).json({ error: 'Parameter too long' });
        }

        cleanExpired();
        const key = `${id}:${style}`;
        const entry = cache.get(key);

        if (entry && (Date.now() - entry.ts < TTL_MS)) {
            return res.status(200).json({ cached: true, summary: entry.summary });
        }

        return res.status(200).json({ cached: false });
    }

    if (req.method === 'POST') {
        const { id, style, summary } = req.body || {};

        if (!id || !style || !summary) {
            return res.status(400).json({ error: 'Missing id, style, or summary' });
        }

        if (typeof id !== 'string' || typeof style !== 'string' || typeof summary !== 'string') {
            return res.status(400).json({ error: 'Parameters must be strings' });
        }

        if (id.length > 100 || style.length > 100) {
            return res.status(400).json({ error: 'Parameter too long' });
        }

        if (summary.length > 5000) {
            return res.status(400).json({ error: 'Summary too long (max 5000 chars)' });
        }

        cleanExpired();
        evictIfNeeded();

        const key = `${id}:${style}`;
        cache.set(key, { summary, ts: Date.now() });

        return res.status(200).json({ saved: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
