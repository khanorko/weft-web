// Weft: Web Push sender (AIX-37)
// POST /api/push-notify — fetch user's push subscriptions and send notification
//
// Required env vars:
//   SUPABASE_ANON_KEY    — Supabase anon key
//   VAPID_PUBLIC_KEY     — base64url VAPID public key
//   VAPID_PRIVATE_KEY    — base64url VAPID private key (scalar d)
//   VAPID_SUBJECT        — mailto: or https: subject for VAPID JWT

import webpush from 'web-push';

const SUPABASE_URL = 'https://actadsweocnjodxfswnh.supabase.co';

function cors(res) {
    res.setHeader('Access-Control-Allow-Origin', 'https://weft.news');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

export default async function handler(req, res) {
    cors(res);
    if (req.method === 'OPTIONS') return res.status(204).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing auth' });
    }
    const userJwt = authHeader.slice(7);

    // Get user identity
    const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
        headers: {
            'apikey': process.env.SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${userJwt}`,
        },
    });
    if (!userRes.ok) return res.status(401).json({ error: 'Invalid token' });
    const user = await userRes.json();
    if (!user?.id) return res.status(401).json({ error: 'No user' });

    const { articles } = req.body || {};
    if (!articles?.length) return res.status(400).json({ error: 'No articles' });

    // Configure VAPID
    const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
    const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@weft.news';

    if (!vapidPublicKey || !vapidPrivateKey) {
        return res.status(503).json({ error: 'Push not configured' });
    }

    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

    // Fetch user's push subscriptions
    const subRes = await fetch(
        `${SUPABASE_URL}/rest/v1/push_subscriptions?user_id=eq.${user.id}&select=endpoint,p256dh,auth_key`,
        {
            headers: {
                'apikey': process.env.SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${userJwt}`,
            },
        }
    );
    if (!subRes.ok) return res.status(500).json({ error: 'Failed to fetch subscriptions' });
    const subs = await subRes.json();

    if (!subs.length) return res.status(200).json({ sent: 0, reason: 'no subscriptions' });

    // Pick the most newsworthy article to notify about
    const article = articles.sort((a, b) => {
        if (b.isBreaking !== a.isBreaking) return b.isBreaking ? 1 : -1;
        return (b.score || 0) - (a.score || 0);
    })[0];

    const payload = JSON.stringify({
        title: article.isBreaking ? `Breaking: ${article.title}` : article.title,
        body: article.source ? `via ${article.source}` : 'Weft News',
        url: article.url,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: article.isBreaking ? 'breaking' : `score-${article.score}`,
    });

    let sent = 0;
    const staleEndpoints = [];

    await Promise.all(subs.map(async sub => {
        const pushSub = {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth_key },
        };
        try {
            await webpush.sendNotification(pushSub, payload, { TTL: 3600 });
            sent++;
        } catch (err) {
            // 404/410 = subscription expired → mark for removal
            if (err.statusCode === 404 || err.statusCode === 410) {
                staleEndpoints.push(sub.endpoint);
            } else {
                console.error('push send error', err.statusCode, err.message);
            }
        }
    }));

    // Clean up stale subscriptions
    if (staleEndpoints.length) {
        await Promise.all(staleEndpoints.map(ep =>
            fetch(
                `${SUPABASE_URL}/rest/v1/push_subscriptions?user_id=eq.${user.id}&endpoint=eq.${encodeURIComponent(ep)}`,
                {
                    method: 'DELETE',
                    headers: {
                        'apikey': process.env.SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${userJwt}`,
                    },
                }
            ).catch(() => {})
        ));
    }

    return res.status(200).json({ sent, staleRemoved: staleEndpoints.length });
}
