// Weft: Shared rate limiting utility (AIX-40)
// In-memory — works per serverless instance (Vercel warm instances)
// For hard distributed limits, replace backing store with KV/Redis

const stores = new Map(); // name -> Map<ip, {count, windowStart}>

/**
 * Check and increment rate limit for an IP.
 * @param {string} name  — Identifier for this limit (e.g. 'groq', 'share')
 * @param {string} ip    — Client IP
 * @param {number} limit — Max requests per window
 * @param {number} windowMs — Window size in ms
 * @returns {{ allowed: boolean, remaining: number, resetAt: number }}
 */
export function checkRateLimit(name, ip, limit, windowMs) {
    if (!stores.has(name)) stores.set(name, new Map());
    const store = stores.get(name);

    const now = Date.now();
    const entry = store.get(ip);

    if (!entry || now - entry.windowStart >= windowMs) {
        store.set(ip, { count: 1, windowStart: now });
        return { allowed: true, remaining: limit - 1, resetAt: now + windowMs };
    }

    if (entry.count >= limit) {
        return { allowed: false, remaining: 0, resetAt: entry.windowStart + windowMs };
    }

    entry.count++;
    return { allowed: true, remaining: limit - entry.count, resetAt: entry.windowStart + windowMs };
}

/**
 * Extract client IP from request, accounting for Vercel/proxy headers.
 */
export function getClientIp(req) {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) return forwarded.split(',')[0].trim();
    return req.socket?.remoteAddress || '0.0.0.0';
}

/**
 * Convenience: send 429 if rate limited, return true if request should be blocked.
 */
export function rejectIfLimited(res, result) {
    if (!result.allowed) {
        res.setHeader('Retry-After', Math.ceil((result.resetAt - Date.now()) / 1000));
        res.status(429).json({ error: 'Too many requests. Please slow down.' });
        return true;
    }
    return false;
}

/**
 * Clean up expired entries periodically (call from handler to prevent memory leak).
 * Only cleans the specified store if it has grown large.
 */
export function cleanStore(name, windowMs) {
    const store = stores.get(name);
    if (!store || store.size < 1000) return;
    const now = Date.now();
    for (const [ip, entry] of store) {
        if (now - entry.windowStart >= windowMs * 2) store.delete(ip);
    }
}
