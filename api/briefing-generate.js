// Weft: Daily briefing generator (AIX-32)
// Called by Vercel cron at 07:00 UTC daily, or manually via POST with secret
// Fetches top RSS feeds, scores + summarises with Groq, stores in Supabase

const SUPABASE_URL = 'https://actadsweocnjodxfswnh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFjdGFkc3dlb2Nuam9keGZzd25oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzExNDExODMsImV4cCI6MjA4NjcxNzE4M30.5Nans_6e2uYCPVFYQCyOa-OmZMwCL32XENLfegS6H6s';

// Curated subset of feeds for daily briefing — broad coverage, reliable sources
const BRIEFING_FEEDS = [
  { name: 'The Rundown AI',   url: 'https://rss.beehiiv.com/feeds/2R3C6Bt5wj.xml',              category: 'AI' },
  { name: 'MIT Tech Review',  url: 'https://www.technologyreview.com/feed/',                     category: 'Tech' },
  { name: 'Ars Technica',     url: 'https://feeds.arstechnica.com/arstechnica/technology-lab',   category: 'Tech' },
  { name: 'TechCrunch AI',    url: 'https://techcrunch.com/category/artificial-intelligence/feed/', category: 'AI' },
  { name: 'BBC World',        url: 'https://feeds.bbci.co.uk/news/world/rss.xml',                category: 'World' },
  { name: 'Reuters',          url: 'https://feeds.reuters.com/reuters/topNews',                  category: 'World' },
  { name: 'TechCrunch',       url: 'https://techcrunch.com/feed/',                               category: 'Business' },
  { name: 'The Verge',        url: 'https://www.theverge.com/rss/index.xml',                     category: 'Tech' },
  { name: 'Science News',     url: 'https://www.sciencenews.org/feed',                           category: 'Science' },
  { name: 'Hacker News',      url: 'https://news.ycombinator.com/rss',                           category: 'Tech' },
];

const ARTICLES_PER_FEED = 5;
const TOP_STORIES = 15;

// ==================== XML PARSER ====================

function unescapeXML(str) {
  return str
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'");
}

function getXMLTag(xml, tag) {
  // CDATA variant
  const cdata = xml.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>`, 'i'));
  if (cdata) return cdata[1].trim();
  const plain = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'));
  return plain ? unescapeXML(plain[1]).trim() : '';
}

function getXMLAttr(xml, tag, attr) {
  const m = xml.match(new RegExp(`<${tag}[^>]*\\s${attr}=['"]([^'"]*?)['"]`, 'i'));
  return m ? m[1] : '';
}

function stripHTML(str) {
  return str.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function parseFeed(xml, feed) {
  const isAtom = /<feed[\s>]/.test(xml) || xml.includes('<entry>') || xml.includes('<entry ');
  const pattern = isAtom ? /<entry[\s>]([\s\S]*?)<\/entry>/g : /<item[\s>]([\s\S]*?)<\/item>/g;
  const articles = [];
  let m;

  while ((m = pattern.exec(xml)) !== null && articles.length < ARTICLES_PER_FEED) {
    const item = m[1];

    const title = stripHTML(getXMLTag(item, 'title'));
    let link = isAtom
      ? (getXMLAttr(item, 'link', 'href') || getXMLTag(item, 'link'))
      : getXMLTag(item, 'link');
    const description = stripHTML(
      getXMLTag(item, 'description') ||
      getXMLTag(item, 'summary') ||
      getXMLTag(item, 'content')
    ).slice(0, 400);
    const pubDate = getXMLTag(item, 'pubDate') || getXMLTag(item, 'published') || getXMLTag(item, 'updated') || new Date().toISOString();

    if (!title || !link) continue;
    // Skip duplicates within this feed
    if (articles.some(a => a.title === title)) continue;

    articles.push({ title, link, description, pubDate, source: feed.name, category: feed.category });
  }

  return articles;
}

// ==================== RSS FETCHING ====================

async function fetchFeed(feed) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(feed.url, {
      headers: { 'User-Agent': 'Weft/1.0 RSS Reader', 'Accept': 'application/rss+xml, application/xml, text/xml, */*' },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return [];
    const xml = await res.text();
    return parseFeed(xml, feed);
  } catch {
    clearTimeout(timeout);
    return [];
  }
}

// ==================== GROQ AI ====================

async function groqRequest(messages, maxTokens = 2000) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY not set');

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages,
      max_tokens: maxTokens,
      temperature: 0.3,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Groq error ${res.status}: ${err}`);
  }
  const data = await res.json();
  return data.choices[0].message.content;
}

async function scoreAndSummariseArticles(articles) {
  const list = articles
    .map((a, i) => `${i + 1}. "${a.title}" (${a.source}, ${a.category})\n   ${a.description || '(no description)'}`)
    .join('\n\n');

  const prompt = `You are a senior news editor. Score each article 1–10 for newsworthiness and global reader interest (10 = major breaking news; 1 = minor niche item). Also write a 1–2 sentence plain-English summary for each.

Return ONLY a JSON array with objects: { "index": number, "score": number, "summary": string }. No markdown, no explanation, just JSON.

Articles:
${list}`;

  const raw = await groqRequest([{ role: 'user', content: prompt }], 3000);

  // Extract JSON array from response
  const jsonMatch = raw.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error('No JSON array in Groq response');
  return JSON.parse(jsonMatch[0]);
}

async function generateNarrative(topStories) {
  const headlines = topStories.slice(0, 8).map((s, i) => `${i + 1}. ${s.title} (${s.source})`).join('\n');

  const prompt = `Write a 3–4 sentence narrative intro for today's news briefing. Cover the key themes and what readers should pay attention to. Be concise, journalistic, and informative. Do not use bullet points.

Today's top stories:
${headlines}`;

  return groqRequest([{ role: 'user', content: prompt }], 300);
}

// ==================== SUPABASE ====================

async function saveBriefing(date, stories, narrative, meta) {
  // Group story indices by category
  const categoryMap = {};
  stories.forEach((s, i) => {
    if (!categoryMap[s.category]) categoryMap[s.category] = [];
    categoryMap[s.category].push(i);
  });

  const body = JSON.stringify({ date, stories, narrative, categories: categoryMap, meta });

  const res = await fetch(`${SUPABASE_URL}/rest/v1/daily_briefings`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates,return=minimal',
    },
    body,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Supabase insert error ${res.status}: ${err}`);
  }
}

async function briefingExists(date) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/daily_briefings?date=eq.${date}&select=date`,
    { headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` } }
  );
  if (!res.ok) return false;
  const rows = await res.json();
  return rows.length > 0;
}

// ==================== MAIN HANDLER ====================

export default async function handler(req, res) {
  // Allow GET (for Vercel cron) and POST (manual trigger)
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Auth: Vercel cron sends Authorization header with CRON_SECRET, or callers pass ?secret=
  const cronSecret = process.env.BRIEFING_CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers['authorization'] || '';
    const querySecret = req.query?.secret || '';
    const provided = authHeader.replace('Bearer ', '') || querySecret;
    if (provided !== cronSecret) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  const date = req.query?.date || new Date().toISOString().slice(0, 10);

  // Skip if already generated (unless ?force=1)
  const force = req.query?.force === '1';
  if (!force && await briefingExists(date)) {
    return res.status(200).json({ ok: true, message: `Briefing for ${date} already exists`, date });
  }

  try {
    // 1. Fetch all feeds in parallel
    const feedResults = await Promise.all(BRIEFING_FEEDS.map(f => fetchFeed(f)));
    const allArticles = feedResults.flat();

    if (allArticles.length === 0) {
      return res.status(503).json({ error: 'Failed to fetch any articles' });
    }

    // 2. Deduplicate by title similarity
    const seen = new Set();
    const deduplicated = allArticles.filter(a => {
      const key = a.title.toLowerCase().slice(0, 50);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // 3. Score and summarise with Groq
    const scored = await scoreAndSummariseArticles(deduplicated);

    // 4. Merge scores back, sort descending, take top N
    const merged = deduplicated.map((a, i) => {
      const match = scored.find(s => s.index === i + 1);
      return { ...a, score: match?.score ?? 5, summary: match?.summary ?? a.description };
    });

    const topStories = merged
      .sort((a, b) => b.score - a.score)
      .slice(0, TOP_STORIES)
      .map(s => ({ ...s, trending: s.score >= 8 }));

    // 5. Generate narrative intro
    const narrative = await generateNarrative(topStories);

    // 6. Save to Supabase
    const meta = {
      feedsFetched: BRIEFING_FEEDS.length,
      articlesConsidered: deduplicated.length,
      generatedAt: new Date().toISOString(),
      model: 'llama-3.3-70b-versatile',
    };

    await saveBriefing(date, topStories, narrative, meta);

    return res.status(200).json({ ok: true, date, storiesCount: topStories.length });
  } catch (err) {
    console.error('Briefing generation error:', err);
    return res.status(500).json({ error: err.message });
  }
}
