// Weft: Push subscription manager (AIX-37)
// POST   /api/push-subscribe  — save subscription for authenticated user
// DELETE /api/push-subscribe  — remove subscription by endpoint

const SUPABASE_URL = 'https://actadsweocnjodxfswnh.supabase.co';

function cors(res) {
    res.setHeader('Access-Control-Allow-Origin', 'https://weft.news');
    res.setHeader('Access-Control-Allow-Methods', 'POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

export default async function handler(req, res) {
    cors(res);
    if (req.method === 'OPTIONS') return res.status(204).end();

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing auth' });
    }
    const userJwt = authHeader.slice(7);

    // Verify JWT and get user_id via Supabase
    const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
        headers: {
            'apikey': process.env.SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${userJwt}`,
        },
    });
    if (!userRes.ok) return res.status(401).json({ error: 'Invalid token' });
    const user = await userRes.json();
    const userId = user.id;
    if (!userId) return res.status(401).json({ error: 'No user' });

    if (req.method === 'POST') {
        const { subscription } = req.body || {};
        if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
            return res.status(400).json({ error: 'Invalid subscription' });
        }

        const upsertRes = await fetch(`${SUPABASE_URL}/rest/v1/push_subscriptions`, {
            method: 'POST',
            headers: {
                'apikey': process.env.SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${userJwt}`,
                'Content-Type': 'application/json',
                'Prefer': 'resolution=merge-duplicates',
            },
            body: JSON.stringify({
                user_id: userId,
                endpoint: subscription.endpoint,
                p256dh: subscription.keys.p256dh,
                auth_key: subscription.keys.auth,
            }),
        });

        if (!upsertRes.ok) {
            const err = await upsertRes.text();
            console.error('push-subscribe upsert error', err);
            return res.status(500).json({ error: 'Failed to save subscription' });
        }

        return res.status(200).json({ ok: true });
    }

    if (req.method === 'DELETE') {
        const { endpoint } = req.body || {};
        if (!endpoint) return res.status(400).json({ error: 'Missing endpoint' });

        const delRes = await fetch(
            `${SUPABASE_URL}/rest/v1/push_subscriptions?user_id=eq.${userId}&endpoint=eq.${encodeURIComponent(endpoint)}`,
            {
                method: 'DELETE',
                headers: {
                    'apikey': process.env.SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${userJwt}`,
                },
            }
        );

        if (!delRes.ok) {
            return res.status(500).json({ error: 'Failed to delete subscription' });
        }

        return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
