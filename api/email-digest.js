// Weft: Email digest sender (AIX-36)
// Vercel cron: runs at 08:00 UTC daily (after briefing-generate at 07:00)
// Also handles GET /api/unsubscribe?token=<uuid>
//
// Required env vars:
//   SUPABASE_SERVICE_ROLE_KEY  — Supabase service role (for auth admin API)
//   RESEND_API_KEY             — Resend transactional email API key
//   DIGEST_CRON_SECRET         — Optional: protects POST from unauthorized triggers

const SUPABASE_URL = 'https://actadsweocnjodxfswnh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFjdGFkc3dlb2Nuam9keGZzd25oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzExNDExODMsImV4cCI6MjA4NjcxNzE4M30.5Nans_6e2uYCPVFYQCyOa-OmZMwCL32XENLfegS6H6s';
const SITE_URL = 'https://weft.news';
const FROM_EMAIL = 'digest@weft.news';

function escHtml(str) {
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

function isMonday() {
    return new Date().getUTCDay() === 1;
}

function formatDisplayDate(dateStr) {
    const d = new Date(dateStr + 'T12:00:00Z');
    return d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
}

// ==================== SUPABASE HELPERS ====================

async function fetchTodayBriefing(date) {
    const res = await fetch(
        `${SUPABASE_URL}/rest/v1/daily_briefings?date=eq.${date}&select=*`,
        { headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` } }
    );
    if (!res.ok) return null;
    const rows = await res.json();
    return rows.length > 0 ? rows[0] : null;
}

async function fetchDigestProfiles(frequency, serviceKey) {
    // Fetch profiles with the given digest frequency
    const res = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?email_digest=eq.${frequency}&select=id,filter_interests,category_weights,email_digest,unsubscribe_token`,
        { headers: { 'apikey': serviceKey, 'Authorization': `Bearer ${serviceKey}` } }
    );
    if (!res.ok) return [];
    return res.json();
}

async function fetchUserEmail(userId, serviceKey) {
    // Auth Admin API — requires service role key
    const res = await fetch(
        `${SUPABASE_URL}/auth/v1/admin/users/${userId}`,
        { headers: { 'apikey': serviceKey, 'Authorization': `Bearer ${serviceKey}` } }
    );
    if (!res.ok) return null;
    const user = await res.json();
    return user.email || null;
}

async function markUnsubscribed(token, serviceKey) {
    const res = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?unsubscribe_token=eq.${token}`,
        {
            method: 'PATCH',
            headers: {
                'apikey': serviceKey,
                'Authorization': `Bearer ${serviceKey}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal',
            },
            body: JSON.stringify({ email_digest: 'off' })
        }
    );
    return res.ok;
}

// ==================== STORY SELECTION ====================

function scoreStoryForUser(story, profile) {
    const categoryWeights = profile.category_weights || {};
    const interests = (profile.filter_interests || '').toLowerCase();

    let score = story.score || 0;

    // Boost by category weight
    const catWeight = categoryWeights[story.category] ?? 1.0;
    score *= catWeight;

    // Boost if title/summary matches user interests
    const titleLower = (story.title || '').toLowerCase();
    const summaryLower = (story.summary || '').toLowerCase();
    const interestTerms = interests.split(',').map(t => t.trim()).filter(Boolean);
    const matchCount = interestTerms.filter(t => titleLower.includes(t) || summaryLower.includes(t)).length;
    score += matchCount * 0.5;

    return score;
}

function selectStoriesForUser(allStories, profile, count = 7) {
    return allStories
        .map(s => ({ ...s, _userScore: scoreStoryForUser(s, profile) }))
        .sort((a, b) => b._userScore - a._userScore)
        .slice(0, count);
}

// ==================== EMAIL TEMPLATE ====================

function buildEmailHtml({ stories, briefingDate, narrative, unsubscribeToken, isWeekly }) {
    const displayDate = formatDisplayDate(briefingDate);
    const subject = isWeekly
        ? `Your weekly Weft digest — ${displayDate}`
        : `Today on Weft — ${displayDate}`;

    const unsubUrl = `${SITE_URL}/api/unsubscribe?token=${unsubscribeToken}`;
    const briefingUrl = `${SITE_URL}/briefing/${briefingDate}`;

    const storyCards = stories.map((s, i) => `
        <tr>
            <td style="padding: 0 0 24px 0;">
                <table cellpadding="0" cellspacing="0" border="0" width="100%">
                    <tr>
                        <td style="padding-bottom: 4px;">
                            <span style="font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: #9d8ff9;">${escHtml(s.category || '')}</span>
                            <span style="font-size: 11px; color: #6b6b80; margin-left: 8px;">${escHtml(s.source || '')}</span>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding-bottom: 8px;">
                            <a href="${escHtml(s.url || s.link || '#')}" style="font-size: 17px; font-weight: 600; color: #e8e8ea; text-decoration: none; line-height: 1.35;">${escHtml(s.title)}</a>
                        </td>
                    </tr>
                    ${s.summary ? `
                    <tr>
                        <td style="padding-bottom: 8px;">
                            <p style="margin: 0; font-size: 14px; color: #a0a0b4; line-height: 1.55;">${escHtml(s.summary.slice(0, 280))}${s.summary.length > 280 ? '…' : ''}</p>
                        </td>
                    </tr>` : ''}
                    <tr>
                        <td>
                            <a href="${escHtml(s.url || s.link || '#')}" style="font-size: 13px; color: #7c6af7; text-decoration: none;">Read article →</a>
                        </td>
                    </tr>
                </table>
                ${i < stories.length - 1 ? `<hr style="border: none; border-top: 1px solid #232328; margin: 24px 0 0 0;">` : ''}
            </td>
        </tr>
    `).join('');

    return {
        subject,
        html: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escHtml(subject)}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #0a0a0b;">
        <tr>
            <td align="center" style="padding: 32px 16px 0;">
                <!-- Header -->
                <table cellpadding="0" cellspacing="0" border="0" width="600" style="max-width: 600px;">
                    <tr>
                        <td style="padding-bottom: 32px; border-bottom: 1px solid #232328;">
                            <table cellpadding="0" cellspacing="0" border="0" width="100%">
                                <tr>
                                    <td>
                                        <a href="${SITE_URL}" style="text-decoration: none; color: #e8e8ea; font-size: 20px; font-weight: 700; letter-spacing: -0.02em;">
                                            ● Weft
                                        </a>
                                    </td>
                                    <td align="right">
                                        <span style="font-size: 13px; color: #6b6b80;">${displayDate}</span>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Narrative / intro -->
                    ${narrative ? `
                    <tr>
                        <td style="padding: 28px 0 24px;">
                            <p style="margin: 0 0 8px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: #9d8ff9;">Today's Theme</p>
                            <p style="margin: 0; font-size: 15px; color: #c0c0d0; line-height: 1.6;">${escHtml(narrative)}</p>
                        </td>
                    </tr>
                    <tr><td><hr style="border: none; border-top: 1px solid #232328; margin: 0 0 28px;"></td></tr>
                    ` : `<tr><td style="height: 28px;"></td></tr>`}

                    <!-- Stories -->
                    <tr>
                        <td>
                            <p style="margin: 0 0 20px; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.07em; color: #7c6af7;">
                                ${isWeekly ? 'Top stories this week' : "Today's top picks for you"}
                            </p>
                            <table cellpadding="0" cellspacing="0" border="0" width="100%">
                                ${storyCards}
                            </table>
                        </td>
                    </tr>

                    <!-- CTA -->
                    <tr>
                        <td style="padding: 32px 0 24px;">
                            <hr style="border: none; border-top: 1px solid #232328; margin: 0 0 28px;">
                            <table cellpadding="0" cellspacing="0" border="0" width="100%">
                                <tr>
                                    <td align="center">
                                        <a href="${briefingUrl}" style="display: inline-block; background: #7c6af7; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; padding: 12px 28px; border-radius: 8px;">
                                            Read full briefing →
                                        </a>
                                    </td>
                                </tr>
                                <tr>
                                    <td align="center" style="padding-top: 16px;">
                                        <a href="${SITE_URL}/app" style="font-size: 13px; color: #7c6af7; text-decoration: none;">Open Weft</a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="padding: 0 0 32px;">
                            <hr style="border: none; border-top: 1px solid #1a1a1f; margin: 0 0 20px;">
                            <p style="margin: 0; font-size: 12px; color: #4a4a5a; text-align: center; line-height: 1.7;">
                                You're receiving this because you enabled Weft email digest.<br>
                                <a href="${unsubUrl}" style="color: #6b6b80; text-decoration: underline;">Unsubscribe</a>
                                &nbsp;·&nbsp;
                                <a href="${SITE_URL}" style="color: #6b6b80; text-decoration: none;">weft.news</a>
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`,
        text: `${subject}\n\n${narrative ? narrative + '\n\n' : ''}${stories.map(s => `${s.title}\n${s.url || s.link || ''}\n${s.summary ? s.summary.slice(0, 200) : ''}`).join('\n\n---\n\n')}\n\nFull briefing: ${briefingUrl}\nUnsubscribe: ${unsubUrl}`
    };
}

// ==================== EMAIL SENDING ====================

async function sendEmail({ to, subject, html, text }) {
    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) throw new Error('RESEND_API_KEY not configured');

    const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${resendKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ from: FROM_EMAIL, to, subject, html, text })
    });

    if (!res.ok) {
        const err = await res.text();
        throw new Error(`Resend error ${res.status}: ${err}`);
    }

    return res.json();
}

// ==================== MAIN HANDLER ====================

export default async function handler(req, res) {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    // GET /api/unsubscribe?token=<uuid> — public, no auth needed
    if (req.method === 'GET' && req.query.token) {
        if (!serviceKey) return res.status(500).send('Service not configured.');
        const token = String(req.query.token).replace(/[^a-f0-9-]/g, '');
        if (token.length < 36) return res.status(400).send('Invalid token.');

        const ok = await markUnsubscribed(token, serviceKey);
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.status(ok ? 200 : 404).send(`<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>${ok ? 'Unsubscribed' : 'Not found'} — Weft</title>
<style>body{font-family:-apple-system,sans-serif;background:#0a0a0b;color:#e8e8ea;display:flex;align-items:center;justify-content:center;min-height:100vh;}
.box{text-align:center;}h1{font-size:24px;margin-bottom:12px;}p{color:#8888a0;margin-bottom:24px;}a{color:#7c6af7;}</style>
</head>
<body><div class="box">
<h1>${ok ? '✓ Unsubscribed' : 'Token not found'}</h1>
<p>${ok ? "You've been unsubscribed from Weft email digests." : "That unsubscribe link is invalid or already used."}</p>
<a href="${SITE_URL}/">Back to Weft</a>
</div></body>
</html>`);
    }

    // POST (cron or manual trigger) — send digests
    if (req.method !== 'GET' && req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Validate cron secret if configured
    const cronSecret = process.env.DIGEST_CRON_SECRET;
    if (cronSecret) {
        const auth = req.headers['authorization'] || '';
        if (auth !== `Bearer ${cronSecret}`) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
    }

    if (!serviceKey) {
        return res.status(500).json({ error: 'SUPABASE_SERVICE_ROLE_KEY not configured' });
    }

    const today = todayUTC();
    const monday = isMonday();

    // Fetch today's briefing
    const briefing = await fetchTodayBriefing(today);
    if (!briefing || !Array.isArray(briefing.stories) || briefing.stories.length === 0) {
        return res.status(200).json({ sent: 0, message: "No briefing available for today" });
    }

    const results = { daily: 0, weekly: 0, errors: 0 };

    // Send daily digests
    const dailyProfiles = await fetchDigestProfiles('daily', serviceKey);
    for (const profile of dailyProfiles) {
        try {
            const email = await fetchUserEmail(profile.id, serviceKey);
            if (!email) continue;

            const stories = selectStoriesForUser(briefing.stories, profile, 7);
            const { subject, html, text } = buildEmailHtml({
                stories,
                briefingDate: today,
                narrative: briefing.narrative,
                unsubscribeToken: profile.unsubscribe_token,
                isWeekly: false
            });

            await sendEmail({ to: email, subject, html, text });
            results.daily++;
        } catch (e) {
            console.error(`Daily digest error for ${profile.id}:`, e.message);
            results.errors++;
        }
    }

    // Send weekly digests only on Mondays
    if (monday) {
        const weeklyProfiles = await fetchDigestProfiles('weekly', serviceKey);
        for (const profile of weeklyProfiles) {
            try {
                const email = await fetchUserEmail(profile.id, serviceKey);
                if (!email) continue;

                const stories = selectStoriesForUser(briefing.stories, profile, 10);
                const { subject, html, text } = buildEmailHtml({
                    stories,
                    briefingDate: today,
                    narrative: briefing.narrative,
                    unsubscribeToken: profile.unsubscribe_token,
                    isWeekly: true
                });

                await sendEmail({ to: email, subject, html, text });
                results.weekly++;
            } catch (e) {
                console.error(`Weekly digest error for ${profile.id}:`, e.message);
                results.errors++;
            }
        }
    }

    return res.status(200).json({
        date: today,
        sent: results.daily + results.weekly,
        daily: results.daily,
        weekly: monday ? results.weekly : 'skipped (not Monday)',
        errors: results.errors,
    });
}
