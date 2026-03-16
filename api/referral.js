// Weft: Referral tracking endpoint (AIX-33)
// POST /api/referral — records a referral when a new user signs up via invite link

const SUPABASE_URL = 'https://actadsweocnjodxfswnh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFjdGFkc3dlb2Nuam9keGZzd25oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzExNDExODMsImV4cCI6MjA4NjcxNzE4M30.5Nans_6e2uYCPVFYQCyOa-OmZMwCL32XENLfegS6H6s';

// Simple rate limiter: IP -> { count, windowStart }
const rateLimitMap = new Map();
function checkRateLimit(ip) {
    const now = Date.now();
    const entry = rateLimitMap.get(ip);
    if (!entry || now - entry.windowStart > 3600_000) {
        rateLimitMap.set(ip, { count: 1, windowStart: now });
        return true;
    }
    if (entry.count >= 5) return false;
    entry.count++;
    return true;
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const ip = req.headers['x-forwarded-for']?.split(',')[0] || 'unknown';
    if (!checkRateLimit(ip)) {
        return res.status(429).json({ error: 'Rate limit exceeded' });
    }

    const { refCode, newUserId } = req.body || {};

    // Validate inputs
    if (!refCode || !/^[a-z0-9]{6,16}$/.test(refCode)) {
        return res.status(400).json({ error: 'Invalid ref code' });
    }
    if (!newUserId || !/^[0-9a-f-]{36}$/.test(newUserId)) {
        return res.status(400).json({ error: 'Invalid user ID' });
    }

    // Don't allow self-referral
    const userRefCode = newUserId.replace(/-/g, '').slice(0, 8);
    if (userRefCode === refCode) {
        return res.status(400).json({ error: 'Self-referral not allowed' });
    }

    try {
        // Insert referral record (unique constraint prevents duplicates)
        const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/referrals`, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal',
            },
            body: JSON.stringify({ referrer_code: refCode, new_user_id: newUserId }),
        });

        // 409 = already recorded (unique constraint), that's OK
        if (!insertRes.ok && insertRes.status !== 409) {
            const err = await insertRes.text();
            return res.status(500).json({ error: 'Failed to record referral', detail: err });
        }

        // Also store ref on the new user's profile for easy lookup
        await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(newUserId)}`, {
            method: 'PATCH',
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal',
            },
            body: JSON.stringify({ referred_by: refCode }),
        });

        return res.status(200).json({ ok: true });
    } catch (err) {
        console.error('Referral tracking error:', err);
        return res.status(500).json({ error: err.message });
    }
}
