// Weft — Pattern from noise (Web Version)
// Credits: Kristoffer Åström (idea), Johan Salo (implementation)

// ==================== SUPABASE ====================
const SUPABASE_URL = 'https://actadsweocnjodxfswnh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFjdGFkc3dlb2Nuam9keGZzd25oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzExNDExODMsImV4cCI6MjA4NjcxNzE4M30.5Nans_6e2uYCPVFYQCyOa-OmZMwCL32XENLfegS6H6s';
let _supabaseClient = null;
let currentUser = null;

// Capture ?ref= referral param immediately on page load
(function captureRef() {
    const ref = new URLSearchParams(window.location.search).get('ref');
    if (ref && /^[a-z0-9]{6,16}$/.test(ref)) {
        localStorage.setItem('weft_ref', ref);
        history.replaceState({}, '', window.location.pathname);
    }
})();

// ==================== CATEGORIES & FEEDS ====================
// Named content categories, each with curated RSS feeds.
// DEFAULT_FEEDS is derived from this structure for backward compatibility.

const CATEGORIES = {
    tech: {
        label: 'Tech & AI',
        feeds: [
            // AI newsletters & daily digests
            { name: 'The Rundown AI', url: 'https://rss.beehiiv.com/feeds/2R3C6Bt5wj.xml' },
            { name: 'Last Week in AI', url: 'https://lastweekin.ai/feed' },
            { name: 'Import AI', url: 'https://importai.substack.com/feed' },
            { name: 'The Batch', url: 'https://www.deeplearning.ai/the-batch/feed/' },
            { name: 'TLDR AI', url: 'https://tldr.tech/ai/rss' },
            // Community
            { name: 'Hacker News', url: 'https://hnrss.org/frontpage' },
            // Major publications
            { name: 'MIT Tech Review', url: 'https://www.technologyreview.com/feed/' },
            { name: 'Ars Technica', url: 'https://feeds.arstechnica.com/arstechnica/technology-lab' },
            { name: 'The Verge AI', url: 'https://www.theverge.com/ai-artificial-intelligence/rss/index.xml' },
            { name: 'Wired AI', url: 'https://www.wired.com/feed/tag/ai/latest/rss' },
            { name: 'VentureBeat AI', url: 'https://venturebeat.com/category/ai/feed/' },
            { name: 'TechCrunch AI', url: 'https://techcrunch.com/category/artificial-intelligence/feed/' },
            { name: 'The Register', url: 'https://www.theregister.com/headlines.atom' },
            { name: 'InfoQ', url: 'https://feed.infoq.com/' },
            // Thought leaders
            { name: 'Ethan Mollick', url: 'https://www.oneusefulthing.org/feed' },
            { name: 'Gary Marcus', url: 'https://garymarcus.substack.com/feed' },
            { name: 'Zvi Mowshowitz', url: 'https://thezvi.substack.com/feed' },
            { name: 'Interconnects', url: 'https://www.interconnects.ai/feed' },
            { name: 'Platformer', url: 'https://www.platformer.news/rss' },
            { name: 'Benedict Evans', url: 'https://www.ben-evans.com/benedictevans/rss.xml' },
            // Company blogs
            { name: 'OpenAI', url: 'https://openai.com/blog/rss/' },
            { name: 'Anthropic', url: 'https://www.anthropic.com/rss' },
            { name: 'Hugging Face', url: 'https://huggingface.co/blog/feed.xml' },
            { name: 'Google DeepMind', url: 'https://deepmind.google/blog/rss.xml' },
            { name: 'Meta AI', url: 'https://ai.meta.com/blog/feed/' },
            { name: 'a16z', url: 'https://a16z.com/feed/' },
        ]
    },

    world: {
        label: 'World',
        feeds: [
            { name: 'BBC World', url: 'https://feeds.bbci.co.uk/news/world/rss.xml' },
            { name: 'Reuters Top News', url: 'https://feeds.reuters.com/reuters/topNews' },
            { name: 'Al Jazeera', url: 'https://www.aljazeera.com/xml/rss/all.xml' },
            { name: 'The Guardian World', url: 'https://www.theguardian.com/world/rss' },
            { name: 'NPR News', url: 'https://feeds.npr.org/1001/rss.xml' },
            { name: 'Deutsche Welle', url: 'https://rss.dw.com/rdf/rss-en-all' },
            { name: 'France 24', url: 'https://www.france24.com/en/rss' },
            { name: 'NYT World', url: 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml' },
            { name: 'Foreign Policy', url: 'https://foreignpolicy.com/feed/' },
            { name: 'The Economist', url: 'https://www.economist.com/rss' },
            { name: 'Associated Press', url: 'https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml' },
            { name: 'Axios World', url: 'https://api.axios.com/feed/axios-world' },
        ]
    },

    business: {
        label: 'Business',
        feeds: [
            { name: 'Bloomberg Markets', url: 'https://feeds.bloomberg.com/markets/news.rss' },
            { name: 'Bloomberg Technology', url: 'https://feeds.bloomberg.com/technology/news.rss' },
            { name: 'WSJ Business', url: 'https://feeds.a.dj.com/rss/WSJcomUSBusiness.xml' },
            { name: 'Harvard Business Review', url: 'https://hbr.org/rss/all' },
            { name: 'Inc.', url: 'https://www.inc.com/rss/' },
            { name: 'Fast Company', url: 'https://www.fastcompany.com/latest/rss' },
            { name: 'TechCrunch', url: 'https://techcrunch.com/feed/' },
            { name: 'Axios Pro Rata', url: 'https://api.axios.com/feed/axios-pro-rata' },
            { name: 'CNBC Business', url: 'https://www.cnbc.com/id/10000664/device/rss/rss.html' },
            { name: 'Forbes', url: 'https://www.forbes.com/real-time/feed2/' },
            { name: 'Quartz', url: 'https://qz.com/feed' },
            { name: 'Business Insider', url: 'https://feeds.businessinsider.com/custom/all' },
        ]
    },

    science: {
        label: 'Science',
        feeds: [
            { name: 'Nature', url: 'https://www.nature.com/nature.rss' },
            { name: 'Science News', url: 'https://www.sciencenews.org/feed' },
            { name: 'New Scientist', url: 'https://www.newscientist.com/feed/home/' },
            { name: 'NASA Breaking News', url: 'https://www.nasa.gov/rss/dyn/breaking_news.rss' },
            { name: 'Scientific American', url: 'https://rss.sciam.com/Scientific-American-Global' },
            { name: 'Quanta Magazine', url: 'https://api.quantamagazine.org/feed/' },
            { name: 'Phys.org', url: 'https://phys.org/rss-feed/' },
            { name: 'Popular Science', url: 'https://www.popsci.com/rss.xml' },
            { name: 'The Scientist', url: 'https://www.the-scientist.com/rss/' },
            { name: 'Live Science', url: 'https://www.livescience.com/feeds/all' },
            { name: 'EurekAlert', url: 'https://www.eurekalert.org/rss.xml' },
            { name: 'Space.com', url: 'https://www.space.com/feeds/all' },
        ]
    },

    politics: {
        label: 'Politics',
        feeds: [
            { name: 'Politico', url: 'https://www.politico.com/rss/politicopicks.xml' },
            { name: 'The Hill', url: 'https://thehill.com/feed/' },
            { name: 'The Atlantic Politics', url: 'https://www.theatlantic.com/feed/channel/politics/' },
            { name: 'Vox', url: 'https://www.vox.com/rss/index.xml' },
            { name: 'Axios Politics', url: 'https://api.axios.com/feed/axios-politics' },
            { name: 'BBC Politics', url: 'https://feeds.bbci.co.uk/news/politics/rss.xml' },
            { name: 'The Guardian US Politics', url: 'https://www.theguardian.com/us-news/us-politics/rss' },
            { name: 'Mother Jones', url: 'https://www.motherjones.com/feed/' },
            { name: 'Reason', url: 'https://reason.com/latest/feed/' },
            { name: 'RealClearPolitics', url: 'https://www.realclearpolitics.com/index.xml' },
        ]
    },

    sports: {
        label: 'Sports',
        feeds: [
            { name: 'ESPN Top Stories', url: 'https://www.espn.com/espn/rss/news' },
            { name: 'BBC Sport', url: 'https://feeds.bbci.co.uk/sport/rss.xml' },
            { name: 'Sports Illustrated', url: 'https://www.si.com/rss/si_topstories.rss' },
            { name: 'Yahoo Sports', url: 'https://sports.yahoo.com/rss/' },
            { name: 'The Guardian Sport', url: 'https://www.theguardian.com/sport/rss' },
            { name: 'Bleacher Report', url: 'https://bleacherreport.com/articles/feed' },
            { name: 'CBS Sports', url: 'https://www.cbssports.com/rss/headlines/' },
            { name: 'Sporting News', url: 'https://www.sportingnews.com/us/rss' },
            { name: 'NBC Sports', url: 'https://nbcsports.com/rss' },
            { name: 'Sky Sports', url: 'https://www.skysports.com/rss/12040' },
        ]
    },

    culture: {
        label: 'Culture',
        feeds: [
            { name: 'The New Yorker', url: 'https://www.newyorker.com/feed/everything' },
            { name: 'Pitchfork', url: 'https://pitchfork.com/rss/news/feed.xml' },
            { name: 'The Atlantic Culture', url: 'https://www.theatlantic.com/feed/channel/entertainment/' },
            { name: 'Rolling Stone', url: 'https://www.rollingstone.com/feed/' },
            { name: 'Variety', url: 'https://variety.com/feed/' },
            { name: 'Hollywood Reporter', url: 'https://www.hollywoodreporter.com/feed/' },
            { name: 'Vulture', url: 'https://www.vulture.com/rss/index.xml' },
            { name: 'AV Club', url: 'https://www.avclub.com/rss' },
            { name: 'NPR Arts', url: 'https://feeds.npr.org/1008/rss.xml' },
            { name: 'Arts & Letters Daily', url: 'https://www.aldaily.com/feed/' },
            { name: 'The Paris Review', url: 'https://www.theparisreview.org/feed' },
            { name: 'Consequence', url: 'https://consequence.net/feed/' },
        ]
    },

    design: {
        label: 'Design & UX',
        feeds: [
            { name: 'Jakob Nielsen', url: 'https://jakobnielsenphd.substack.com/feed' },
            { name: 'UX Collective', url: 'https://uxdesign.cc/feed' },
            { name: 'Nielsen Norman', url: 'https://www.nngroup.com/feed/rss/' },
            { name: 'Smashing Magazine', url: 'https://www.smashingmagazine.com/feed/' },
            { name: 'A List Apart', url: 'https://alistapart.com/main/feed/' },
            { name: 'CSS-Tricks', url: 'https://css-tricks.com/feed/' },
            { name: 'Creative Bloq', url: 'https://www.creativebloq.com/feed' },
            { name: 'Designmodo', url: 'https://designmodo.com/feed/' },
            { name: 'Sidebar.io', url: 'https://sidebar.io/feed.xml' },
            { name: 'Muzli Design', url: 'https://medium.muz.li/feed' },
        ]
    },
};

// Flat list derived from CATEGORIES — used everywhere feeds are needed
const DEFAULT_FEEDS = Object.entries(CATEGORIES).flatMap(([catKey, cat]) =>
    cat.feeds.map(f => ({ ...f, category: catKey }))
);

// Feed management: merge defaults with user customizations
let disabledFeeds = JSON.parse(localStorage.getItem('disabledFeeds') || '[]');
let customFeeds = JSON.parse(localStorage.getItem('customFeeds') || '[]');

function getActiveFeeds() {
    const all = [...DEFAULT_FEEDS, ...customFeeds];
    return all.filter(f => !disabledFeeds.includes(f.url));
}

const CORS_PROXY = '/api/cors-proxy?url=';

// Preset prompts
const PRESET_PROMPTS = {
    newsletter: `You are an AI news analyst writing for a tech-savvy audience. Summarize this article clearly and insightfully.

Structure your response EXACTLY like this:
WHAT: [One sentence describing what happened]
WHY IT MATTERS: [One sentence on significance]
KEY INSIGHT: [One sentence takeaway]

Title: {{title}}
Content: {{content}}`,

    tldr: `Write an ultra-concise TL;DR in exactly 1-2 sentences. Cut to the core. No fluff.

Title: {{title}}
Content: {{content}}

TL;DR:`,

    bullets: `Summarize in exactly 3 bullet points:
• Main news/announcement
• Technical or business detail
• Implication or what's next

Title: {{title}}
Content: {{content}}`,

    executive: `Write a 4-sentence executive brief following this structure:
1. Context (background)
2. News (what happened)
3. Analysis (why it matters)
4. Outlook (what's next)

Title: {{title}}
Content: {{content}}`
};

let articles = [];
let currentArticle = null;
let activeCategory = null; // null = All Categories
let isMobile = window.innerWidth <= 900;
window.addEventListener('resize', () => { isMobile = window.innerWidth <= 900; });
let customStyles = JSON.parse(localStorage.getItem('customStyles') || '{}');
let settings = {
    provider: localStorage.getItem('llmProvider') || 'groq',
    apiKey: localStorage.getItem('apiKey') || '',
    useOwnKey: localStorage.getItem('useOwnKey') === 'true',
    summaryStyle: localStorage.getItem('summaryStyle') || 'newsletter',
    filterInterests: localStorage.getItem('filterInterests') || 'AI, machine learning, LLMs, generative AI, tech industry',
    filterThreshold: parseInt(localStorage.getItem('filterThreshold') || '6'),
    categoryWeights: JSON.parse(localStorage.getItem('categoryWeights') || '{}')
};

// Smart filter scores cache
let articleScores = JSON.parse(localStorage.getItem('articleScores') || '{}');

// ─── Preference Vector ─────────────────────────────────────────────────────────
// Builds a decayed preference model from all available signals:
//   - Onboarding category weights (baseline)
//   - Read times with time-decay (implicit)
//   - Likes / dislikes / bookmarks (explicit)
// Half-life: 30 days — interests decay naturally over time.
function buildPreferenceVector() {
    const now = Date.now();
    const HALF_LIFE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
    const K = Math.log(2) / HALF_LIFE_MS;
    const decay = (ts) => ts ? Math.exp(-K * Math.max(0, now - ts)) : 1;

    const sources = {};
    const keywords = {};
    const categories = {};

    // 1. Onboarding category weights as baseline (no decay — explicit user choice)
    const catWeights = settings.categoryWeights || {};
    Object.entries(catWeights).forEach(([cat, w]) => {
        const signal = (w - 1.0) * 0.5; // normalize: 1.5→+0.25, 0.5→-0.25
        if (signal !== 0) categories[cat] = (categories[cat] || 0) + signal;
    });

    // 2. Read times — implicit signal, decayed by age
    const readTimes = JSON.parse(localStorage.getItem('readTimes') || '{}');
    Object.values(readTimes).forEach(e => {
        const w = Math.min(e.seconds / 60, 2.0) * decay(e.ts); // cap at 2 min
        if (e.source) sources[e.source] = (sources[e.source] || 0) + w;
        if (e.category) categories[e.category] = (categories[e.category] || 0) + w;
        (e.keywords || []).forEach(kw => {
            keywords[kw] = (keywords[kw] || 0) + w * 0.3;
        });
    });

    // 3. Explicit signals: like +2, bookmark +1.5, dislike -1.5
    const localArticles = JSON.parse(localStorage.getItem('articles') || '[]');
    localArticles.forEach(a => {
        if (!a.liked && !a.disliked && !a.bookmarked) return;
        const ts = a.ts || (a.date ? Date.parse(a.date) : null);
        const d = decay(ts);
        let signal = 0;
        if (a.liked) signal = 2.0 * d;
        else if (a.disliked) signal = -1.5 * d;
        else if (a.bookmarked) signal = 1.5 * d;
        if (a.source) sources[a.source] = (sources[a.source] || 0) + signal;
        if (a.category) categories[a.category] = (categories[a.category] || 0) + signal;
        if (signal > 0) {
            (a.keywords || []).forEach(kw => {
                keywords[kw] = (keywords[kw] || 0) + signal * 0.4;
            });
        }
    });

    // Keep top N by absolute value
    const topN = (obj, n) => Object.fromEntries(
        Object.entries(obj).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).slice(0, n)
    );

    return {
        sources: topN(sources, 20),
        keywords: topN(keywords, 30),
        categories: topN(categories, 10),
        updatedAt: now
    };
}

// Trending detection cache
let trendingMeta = {}; // articleId -> { trending, breaking, groupSize, groupKeyword }

function computeTrendingAndBreaking(allArticles) {
    trendingMeta = {};
    if (allArticles.length === 0) return;

    const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
    const now = Date.now();

    // keyword -> [{ id, source }]
    const keywordMap = {};
    allArticles.forEach(a => {
        (a.keywords || []).forEach(kw => {
            if (!keywordMap[kw]) keywordMap[kw] = [];
            keywordMap[kw].push({ id: a.id, source: a.source });
        });
    });

    // Keep only keywords with 3+ distinct sources
    const trendingKeywords = {};
    Object.entries(keywordMap).forEach(([kw, entries]) => {
        const sources = new Set(entries.map(e => e.source));
        if (sources.size >= 3) trendingKeywords[kw] = sources.size;
    });

    allArticles.forEach(a => {
        const kws = a.keywords || [];
        let maxGroupSize = 0;
        let groupKeyword = null;

        kws.forEach(kw => {
            if (trendingKeywords[kw] && trendingKeywords[kw] > maxGroupSize) {
                maxGroupSize = trendingKeywords[kw];
                groupKeyword = kw;
            }
        });

        const isTrending = maxGroupSize >= 3;
        const articleTs = new Date(a.date).getTime();
        const isBreaking = !isNaN(articleTs) && (now - articleTs) <= TWO_HOURS_MS;

        if (isTrending || isBreaking) {
            trendingMeta[a.id] = { trending: isTrending, breaking: isBreaking, groupSize: maxGroupSize, groupKeyword };
        }
    });
}

// DOM Elements
const articleList = document.getElementById('articleList');
const articleContent = document.getElementById('articleContent');
const articleCount = document.getElementById('articleCount');
const searchInput = document.getElementById('searchInput');
const refreshBtn = document.getElementById('refreshBtn');
const settingsBtn = document.getElementById('settingsBtn');
const settingsModal = document.getElementById('settingsModal');
const closeSettings = document.getElementById('closeSettings');
const saveSettingsBtn = document.getElementById('saveSettings');
const summaryStyleSelect = document.getElementById('summaryStyle');
const promptTemplate = document.getElementById('promptTemplate');
const deleteStyleBtn = document.getElementById('deleteStyleBtn');
const saveAsNewStyleBtn = document.getElementById('saveAsNewStyle');
const customStyleNameInput = document.getElementById('customStyleName');

// ==================== SUPABASE INIT & AUTH ====================

function initSupabase() {
    if (SUPABASE_URL.includes('YOUR_PROJECT_REF')) {
        console.log('Supabase not configured, running in offline mode');
        return;
    }

    // The CDN sets window.supabase — find createClient
    const sb = window.supabase;
    const createClient = sb && (sb.createClient || sb.default?.createClient);

    if (!createClient) {
        console.warn('Supabase SDK not available. window.supabase =', typeof sb, sb);
        return;
    }

    try {
        _supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    } catch (e) {
        console.error('Supabase init failed:', e);
        return;
    }

    _supabaseClient.auth.onAuthStateChange((event, session) => {
        handleAuthStateChange(event, session);
    });

    // Check existing session
    _supabaseClient.auth.getSession().then(({ data: { session } }) => {
        if (session) {
            currentUser = session.user;
            updateAuthUI();
            loadFromSupabase();
        }
    });
}

function handleAuthStateChange(event, session) {
    if (event === 'SIGNED_IN' && session) {
        currentUser = session.user;
        updateAuthUI();
        // First login: push localStorage data to Supabase
        syncToSupabase();
        loadFromSupabase().then(() => {
            showOnboardingIfNeeded();
        });
        showToast('Signed in');
        // Track referral if user arrived via invite link
        const storedRef = localStorage.getItem('weft_ref');
        if (storedRef) {
            trackReferral(storedRef, currentUser.id);
        }
    } else if (event === 'SIGNED_OUT') {
        currentUser = null;
        updateAuthUI();
        showToast('Signed out');
    }
}

function updateAuthUI() {
    const authBtn = document.getElementById('authBtn');
    if (!authBtn) return;

    if (currentUser) {
        const email = currentUser.email || '';
        const initial = email.charAt(0).toUpperCase() || '?';
        authBtn.innerHTML = `<span class="auth-initial">${escapeHTML(initial)}</span>`;
        authBtn.title = email;
        authBtn.classList.add('authenticated');
    } else {
        authBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
        authBtn.title = 'Sign in';
        authBtn.classList.remove('authenticated');
    }

    updateInviteSection();
}

// ==================== ONBOARDING ====================

function showOnboardingIfNeeded() {
    if (localStorage.getItem('onboarding_done') === 'true') return;
    openOnboardingModal();
}

function openOnboardingModal() {
    const modal = document.getElementById('onboardingModal');
    if (!modal) return;
    _onboardingGoToStep(1);
    modal.classList.add('open');
    _initOnboardingListeners();
}

function closeOnboardingModal() {
    const modal = document.getElementById('onboardingModal');
    if (modal) modal.classList.remove('open');
}

let _onboardingListenersInit = false;
function _initOnboardingListeners() {
    if (_onboardingListenersInit) return;
    _onboardingListenersInit = true;

    // Category toggle
    document.querySelectorAll('.onboarding-cat-btn').forEach(btn => {
        btn.addEventListener('click', () => btn.classList.toggle('selected'));
    });

    // Pace selection (single-select)
    document.querySelectorAll('.onboarding-pace-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.onboarding-pace-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
        });
    });

    // Step 1 → 2
    document.getElementById('onboardingNextStep1').addEventListener('click', () => {
        _onboardingGoToStep(2);
    });

    // Skip
    document.getElementById('onboardingSkip').addEventListener('click', () => {
        _finishOnboarding(true);
    });

    // Step 2 back
    document.getElementById('onboardingBackStep2').addEventListener('click', () => {
        _onboardingGoToStep(1);
    });

    // Step 2 → 3
    document.getElementById('onboardingNextStep2').addEventListener('click', () => {
        _onboardingApplyPreferences();
        _onboardingGoToStep(3);
    });

    // Finish
    document.getElementById('onboardingFinish').addEventListener('click', () => {
        _finishOnboarding(false);
    });
}

function _onboardingGoToStep(step) {
    document.getElementById('onboardingStep1').style.display = step === 1 ? '' : 'none';
    document.getElementById('onboardingStep2').style.display = step === 2 ? '' : 'none';
    document.getElementById('onboardingStep3').style.display = step === 3 ? '' : 'none';
    const bar = document.getElementById('onboardingProgressBar');
    if (bar) bar.style.width = (step / 3 * 100) + '%';
}

function _onboardingApplyPreferences() {
    // Apply category weights from selections
    const selectedCats = Array.from(document.querySelectorAll('.onboarding-cat-btn.selected'))
        .map(b => b.dataset.cat);

    if (selectedCats.length > 0) {
        const weights = {};
        Object.keys(CATEGORIES).forEach(k => {
            weights[k] = selectedCats.includes(k) ? 1.5 : 0.5;
        });
        settings.categoryWeights = weights;
        localStorage.setItem('categoryWeights', JSON.stringify(weights));
    }

    // Apply reading pace → filterThreshold
    const selectedPace = document.querySelector('.onboarding-pace-btn.selected');
    const pace = selectedPace ? selectedPace.dataset.pace : 'balanced';
    const thresholdMap = { quick: 7, balanced: 6, deep: 4 };
    const threshold = thresholdMap[pace] || 6;
    settings.filterThreshold = threshold;
    localStorage.setItem('filterThreshold', threshold.toString());
    localStorage.setItem('reading_pace', pace);

    // Refresh article scores so new weights take effect
    articleScores = {};
    localStorage.removeItem('articleScores');
}

function _finishOnboarding(skipped) {
    if (!skipped) {
        // preferences already applied in step 2
    }
    localStorage.setItem('onboarding_done', 'true');
    closeOnboardingModal();
    saveProfileToSupabase().catch(() => {});
    // Re-render article list with new preferences
    renderArticles();
}

function openAuthModal() {
    const modal = document.getElementById('authModal');
    const formView = document.getElementById('authFormView');
    const checkView = document.getElementById('authCheckEmailView');
    const userView = document.getElementById('authUserView');

    if (currentUser) {
        formView.style.display = 'none';
        checkView.style.display = 'none';
        userView.style.display = '';
        document.getElementById('authModalTitle').textContent = 'Account';
        document.getElementById('authUserEmail').textContent = currentUser.email;
        document.getElementById('authAvatar').textContent = (currentUser.email || '?').charAt(0).toUpperCase();
        const created = new Date(currentUser.created_at);
        document.getElementById('authUserSince').textContent = `Member since ${created.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
    } else {
        formView.style.display = '';
        checkView.style.display = 'none';
        userView.style.display = 'none';
        document.getElementById('authModalTitle').textContent = 'Sign in';
    }

    modal.classList.add('open');
}

async function signInWithEmail() {
    if (!_supabaseClient) {
        showToast('Supabase not configured');
        return;
    }
    const emailInput = document.getElementById('authEmail');
    const email = emailInput.value.trim();
    if (!email) {
        showToast('Enter your email');
        return;
    }

    const btn = document.getElementById('authSubmitBtn');
    btn.disabled = true;
    btn.textContent = 'Sending...';

    const { error } = await _supabaseClient.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: window.location.origin }
    });

    btn.disabled = false;
    btn.textContent = 'Send magic link';

    if (error) {
        showToast('Error: ' + error.message);
        return;
    }

    // Show "check email" view
    document.getElementById('authFormView').style.display = 'none';
    document.getElementById('authCheckEmailView').style.display = '';
    document.getElementById('authSentEmail').textContent = email;
}

async function signOut() {
    if (!_supabaseClient) return;
    await _supabaseClient.auth.signOut();
    document.getElementById('authModal').classList.remove('open');
}

// ==================== SUPABASE SYNC ====================

async function syncToSupabase() {
    if (!_supabaseClient || !currentUser) return;
    try {
        await saveProfileToSupabase();
        await syncInteractionsToSupabase();
    } catch (e) {
        console.error('Sync to Supabase failed:', e);
    }
}

async function loadFromSupabase() {
    if (!_supabaseClient || !currentUser) return;
    try {
        await loadProfileFromSupabase();
        await loadInteractionsFromSupabase();
    } catch (e) {
        console.error('Load from Supabase failed:', e);
    }
}

async function savePreferenceVector() {
    const vector = buildPreferenceVector();
    localStorage.setItem('preferenceVector', JSON.stringify(vector));
    if (!_supabaseClient || !currentUser) return;
    const { error } = await _supabaseClient
        .from('profiles')
        .update({ preference_vector: vector })
        .eq('id', currentUser.id);
    if (error) console.error('Save preference vector error:', error);
}

async function saveProfileToSupabase() {
    if (!_supabaseClient || !currentUser) return;
    const profile = {
        id: currentUser.id,
        filter_interests: settings.filterInterests,
        filter_threshold: settings.filterThreshold,
        summary_style: settings.summaryStyle,
        llm_provider: settings.provider,
        use_own_key: settings.useOwnKey,
        custom_styles: customStyles,
        disabled_feeds: disabledFeeds,
        custom_feeds: customFeeds,
        category_weights: settings.categoryWeights,
        theme: localStorage.getItem('theme') || 'dark',
        sidebar_width: parseInt(localStorage.getItem('sidebarWidth') || '400'),
        onboarding_done: localStorage.getItem('onboarding_done') === 'true',
        reading_pace: localStorage.getItem('reading_pace') || 'balanced'
    };

    const { error } = await _supabaseClient
        .from('profiles')
        .upsert(profile, { onConflict: 'id' });

    if (error) console.error('Save profile error:', error);
}

async function loadProfileFromSupabase() {
    if (!_supabaseClient || !currentUser) return;

    const { data, error } = await _supabaseClient
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single();

    if (error || !data) return;

    // Only apply if Supabase has non-default data
    if (data.filter_interests) {
        settings.filterInterests = data.filter_interests;
        localStorage.setItem('filterInterests', data.filter_interests);
    }
    if (data.filter_threshold) {
        settings.filterThreshold = data.filter_threshold;
        localStorage.setItem('filterThreshold', data.filter_threshold.toString());
    }
    if (data.summary_style) {
        settings.summaryStyle = data.summary_style;
        localStorage.setItem('summaryStyle', data.summary_style);
    }
    if (data.llm_provider) {
        settings.provider = data.llm_provider;
        localStorage.setItem('llmProvider', data.llm_provider);
    }
    if (data.use_own_key !== null) {
        settings.useOwnKey = data.use_own_key;
        localStorage.setItem('useOwnKey', data.use_own_key.toString());
    }
    if (data.custom_styles && Object.keys(data.custom_styles).length > 0) {
        customStyles = data.custom_styles;
        localStorage.setItem('customStyles', JSON.stringify(customStyles));
        loadCustomStyles();
    }
    if (data.disabled_feeds && data.disabled_feeds.length > 0) {
        disabledFeeds = data.disabled_feeds;
        localStorage.setItem('disabledFeeds', JSON.stringify(disabledFeeds));
    }
    if (data.custom_feeds && data.custom_feeds.length > 0) {
        customFeeds = data.custom_feeds;
        localStorage.setItem('customFeeds', JSON.stringify(customFeeds));
    }
    if (data.category_weights && Object.keys(data.category_weights).length > 0) {
        settings.categoryWeights = data.category_weights;
        localStorage.setItem('categoryWeights', JSON.stringify(data.category_weights));
    }
    if (data.theme) {
        localStorage.setItem('theme', data.theme);
        document.documentElement.setAttribute('data-theme', data.theme);
        updateThemeIcon(data.theme);
    }
    if (data.sidebar_width && data.sidebar_width !== 400) {
        localStorage.setItem('sidebarWidth', data.sidebar_width.toString());
        const sidebar = document.querySelector('.sidebar');
        if (sidebar && !isMobile) {
            sidebar.style.width = data.sidebar_width + 'px';
            sidebar.style.minWidth = data.sidebar_width + 'px';
            document.documentElement.style.setProperty('--sidebar-width', data.sidebar_width + 'px');
        }
    }
    if (data.onboarding_done) {
        localStorage.setItem('onboarding_done', 'true');
    }
    if (data.reading_pace) {
        localStorage.setItem('reading_pace', data.reading_pace);
    }
    if (data.preference_vector && Object.keys(data.preference_vector).length > 0) {
        // Merge server vector with local (server may be more recent from another device)
        const local = JSON.parse(localStorage.getItem('preferenceVector') || '{}');
        const serverTs = data.preference_vector.updatedAt || 0;
        const localTs = local.updatedAt || 0;
        if (serverTs > localTs) {
            localStorage.setItem('preferenceVector', JSON.stringify(data.preference_vector));
        }
    }
}

async function saveInteractionToSupabase(articleId, data) {
    if (!_supabaseClient || !currentUser) return;

    const row = {
        user_id: currentUser.id,
        article_id: articleId,
        ...data
    };

    const { error } = await _supabaseClient
        .from('article_interactions')
        .upsert(row, { onConflict: 'user_id,article_id' });

    if (error) console.error('Save interaction error:', error);
}

async function syncInteractionsToSupabase() {
    if (!_supabaseClient || !currentUser) return;

    // Gather all interactions from localStorage articles
    const localArticles = JSON.parse(localStorage.getItem('articles') || '[]');
    const localScores = JSON.parse(localStorage.getItem('articleScores') || '{}');
    const readTimes = JSON.parse(localStorage.getItem('readTimes') || '{}');

    const rows = [];
    const seen = new Set();

    localArticles.forEach(a => {
        if (seen.has(a.id)) return;
        const hasInteraction = a.liked || a.disliked || a.bookmarked || a.read || a.summary || localScores[a.id] !== undefined;
        if (!hasInteraction) return;
        seen.add(a.id);

        rows.push({
            user_id: currentUser.id,
            article_id: a.id,
            score: localScores[a.id] ?? null,
            score_reason: a.scoreReason || null,
            groq_summary: a.groqSummary || null,
            read: a.read || false,
            read_duration_seconds: readTimes[a.id]?.seconds || 0,
            bookmarked: a.bookmarked || false,
            liked: a.liked || false,
            disliked: a.disliked || false,
            summary: a.summary || null,
            summary_style: a.summary ? (settings.summaryStyle || null) : null
        });
    });

    if (rows.length === 0) return;

    // Batch upsert in chunks of 50
    for (let i = 0; i < rows.length; i += 50) {
        const chunk = rows.slice(i, i + 50);
        const { error } = await _supabaseClient
            .from('article_interactions')
            .upsert(chunk, { onConflict: 'user_id,article_id' });
        if (error) console.error('Batch sync error:', error);
    }
}

async function loadInteractionsFromSupabase() {
    if (!_supabaseClient || !currentUser) return;

    const { data, error } = await _supabaseClient
        .from('article_interactions')
        .select('*')
        .eq('user_id', currentUser.id);

    if (error || !data || data.length === 0) return;

    // Merge into local state
    const localScores = JSON.parse(localStorage.getItem('articleScores') || '{}');
    const readTimes = JSON.parse(localStorage.getItem('readTimes') || '{}');

    data.forEach(row => {
        // Update article scores
        if (row.score !== null) {
            localScores[row.article_id] = row.score;
        }

        // Update read times
        if (row.read_duration_seconds > 0) {
            readTimes[row.article_id] = {
                seconds: row.read_duration_seconds,
                ts: new Date(row.updated_at).getTime()
            };
        }

        // Update article in articles array
        const article = articles.find(a => a.id === row.article_id);
        if (article) {
            if (row.liked) article.liked = true;
            if (row.disliked) article.disliked = true;
            if (row.bookmarked) article.bookmarked = true;
            if (row.read) article.read = true;
            if (row.summary) article.summary = row.summary;
            if (row.score_reason) article.scoreReason = row.score_reason;
            if (row.groq_summary) article.groqSummary = row.groq_summary;
        }
    });

    articleScores = localScores;
    localStorage.setItem('articleScores', JSON.stringify(articleScores));
    localStorage.setItem('readTimes', JSON.stringify(readTimes));
    localStorage.setItem('articles', JSON.stringify(articles));

    renderArticles();
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initSupabase();
    loadCustomStyles();
    loadSettings();
    loadArticles();
    setupEventListeners();
    setupSidebarResize();
    setupThemeToggle();
});

function setupEventListeners() {
    refreshBtn.addEventListener('click', () => loadArticles(true));
    settingsBtn.addEventListener('click', openSettings);
    closeSettings.addEventListener('click', () => settingsModal.classList.remove('open'));

    // Auth events
    document.getElementById('authBtn').addEventListener('click', openAuthModal);
    document.getElementById('closeAuth').addEventListener('click', () => document.getElementById('authModal').classList.remove('open'));
    document.getElementById('authSubmitBtn').addEventListener('click', signInWithEmail);
    document.getElementById('authEmail').addEventListener('keydown', (e) => { if (e.key === 'Enter') signInWithEmail(); });
    document.getElementById('authSignOutBtn').addEventListener('click', signOut);
    document.getElementById('authSyncNowBtn').addEventListener('click', async () => {
        document.getElementById('authSyncStatus').textContent = 'Syncing...';
        await syncToSupabase();
        await loadFromSupabase();
        document.getElementById('authSyncStatus').textContent = 'Synced just now';
    });
    document.getElementById('authModal').addEventListener('click', (e) => {
        if (e.target === document.getElementById('authModal')) document.getElementById('authModal').classList.remove('open');
    });
    // Onboarding modal — backdrop click does NOT close it (intentional: requires explicit choice)
    saveSettingsBtn.addEventListener('click', saveSettings);
    searchInput.addEventListener('input', handleSearch);
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleSearch();
    });

    // Summary style change - show prompt
    summaryStyleSelect.addEventListener('change', onStyleChange);

    // Save as new style
    saveAsNewStyleBtn.addEventListener('click', saveAsNewStyle);

    // Delete custom style
    deleteStyleBtn.addEventListener('click', deleteCustomStyle);

    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            filterArticles();
        });
    });

    document.querySelectorAll('.cat-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            activeCategory = e.target.dataset.category || null;
            renderArticles();
        });
    });

    settingsModal.addEventListener('click', (e) => {
        if (e.target === settingsModal) settingsModal.classList.remove('open');
    });

    // Event delegation for article clicks
    articleList.addEventListener('click', (e) => {
        const item = e.target.closest('.article-item');
        if (item) {
            const article = articles.find(a => a.id === item.dataset.id);
            if (article) showArticle(article);
        }
    });

    // Add feed button
    document.getElementById('addFeedBtn').addEventListener('click', addCustomFeed);
}

// ==================== FEED MANAGER ====================

function renderFeedManager() {
    const container = document.getElementById('feedManager');
    let html = '';

    // Built-in feeds grouped by category
    Object.entries(CATEGORIES).forEach(([catKey, cat]) => {
        const enabledCount = cat.feeds.filter(f => !disabledFeeds.includes(f.url)).length;
        html += `
            <div class="feed-category-section">
                <div class="feed-category-header">
                    <span class="feed-category-label">${escapeHTML(cat.label)}</span>
                    <span class="feed-category-count">${enabledCount}/${cat.feeds.length}</span>
                </div>
                ${cat.feeds.map(feed => {
                    const enabled = !disabledFeeds.includes(feed.url);
                    return `
                        <div class="feed-item">
                            <input type="checkbox" ${enabled ? 'checked' : ''} data-url="${escapeHTML(feed.url)}" onchange="toggleFeed(this)">
                            <span class="feed-name">${escapeHTML(feed.name)}</span>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    });

    // Custom feeds section
    if (customFeeds.length > 0) {
        html += `
            <div class="feed-category-section">
                <div class="feed-category-header">
                    <span class="feed-category-label">Custom</span>
                    <span class="feed-category-count">${customFeeds.filter(f => !disabledFeeds.includes(f.url)).length}/${customFeeds.length}</span>
                </div>
                ${customFeeds.map(feed => {
                    const enabled = !disabledFeeds.includes(feed.url);
                    return `
                        <div class="feed-item">
                            <input type="checkbox" ${enabled ? 'checked' : ''} data-url="${escapeHTML(feed.url)}" onchange="toggleFeed(this)">
                            <span class="feed-name">${escapeHTML(feed.name)}</span>
                            <button class="feed-remove" onclick="removeCustomFeed('${escapeJSString(feed.url)}')" title="Remove">&times;</button>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    container.innerHTML = html;
}

function toggleFeed(checkbox) {
    const url = checkbox.dataset.url;
    if (checkbox.checked) {
        disabledFeeds = disabledFeeds.filter(u => u !== url);
    } else {
        disabledFeeds.push(url);
    }
    localStorage.setItem('disabledFeeds', JSON.stringify(disabledFeeds));
    saveProfileToSupabase().catch(() => {});
}

function addCustomFeed() {
    const nameInput = document.getElementById('newFeedName');
    const urlInput = document.getElementById('newFeedUrl');
    const name = nameInput.value.trim();
    const url = urlInput.value.trim();

    if (!name || !url) {
        showToast('Enter both name and URL');
        return;
    }

    const allUrls = [...DEFAULT_FEEDS, ...customFeeds].map(f => f.url);
    if (allUrls.includes(url)) {
        showToast('Feed already exists');
        return;
    }

    customFeeds.push({ name, url, category: 'custom' });
    localStorage.setItem('customFeeds', JSON.stringify(customFeeds));
    nameInput.value = '';
    urlInput.value = '';
    renderFeedManager();
    showToast(`Added "${name}"`);
    saveProfileToSupabase().catch(() => {});
}

function removeCustomFeed(url) {
    customFeeds = customFeeds.filter(f => f.url !== url);
    disabledFeeds = disabledFeeds.filter(u => u !== url);
    localStorage.setItem('customFeeds', JSON.stringify(customFeeds));
    localStorage.setItem('disabledFeeds', JSON.stringify(disabledFeeds));
    renderFeedManager();
    saveProfileToSupabase().catch(() => {});
}

function loadCustomStyles() {
    const customStylesGroup = document.getElementById('customStylesGroup');
    customStylesGroup.innerHTML = '';

    Object.keys(customStyles).forEach(name => {
        const option = document.createElement('option');
        option.value = `custom_${name}`;
        option.textContent = name;
        customStylesGroup.appendChild(option);
    });
}

function openSettings() {
    settingsModal.classList.add('open');
    onStyleChange();
    renderFeedManager();
}

function onStyleChange() {
    const style = summaryStyleSelect.value;
    const isCustom = style.startsWith('custom_');

    // Show/hide delete button
    deleteStyleBtn.style.display = isCustom ? 'flex' : 'none';

    // Load prompt
    if (isCustom) {
        const customName = style.replace('custom_', '');
        promptTemplate.value = customStyles[customName] || '';
    } else {
        promptTemplate.value = PRESET_PROMPTS[style] || PRESET_PROMPTS.newsletter;
    }
}

function saveAsNewStyle() {
    const name = customStyleNameInput.value.trim();
    if (!name) {
        alert('Please enter a name for your custom style');
        return;
    }

    const prompt = promptTemplate.value.trim();
    if (!prompt) {
        alert('Please enter a prompt template');
        return;
    }

    // Save to custom styles
    customStyles[name] = prompt;
    localStorage.setItem('customStyles', JSON.stringify(customStyles));

    // Reload dropdown
    loadCustomStyles();

    // Select the new style
    summaryStyleSelect.value = `custom_${name}`;
    onStyleChange();

    // Clear input
    customStyleNameInput.value = '';

    alert(`Style "${name}" saved!`);
}

function deleteCustomStyle() {
    const style = summaryStyleSelect.value;
    if (!style.startsWith('custom_')) return;

    const name = style.replace('custom_', '');
    if (!confirm(`Delete custom style "${name}"?`)) return;

    delete customStyles[name];
    localStorage.setItem('customStyles', JSON.stringify(customStyles));

    // Reload dropdown and select default
    loadCustomStyles();
    summaryStyleSelect.value = 'newsletter';
    onStyleChange();
}

function loadSettings() {
    document.getElementById('llmProvider').value = settings.provider;
    document.getElementById('apiKey').value = settings.apiKey;
    document.getElementById('filterInterests').value = settings.filterInterests;
    document.getElementById('filterThreshold').value = settings.filterThreshold;
    document.getElementById('thresholdValue').textContent = `${settings.filterThreshold}/10`;
    summaryStyleSelect.value = settings.summaryStyle;

    // Load category weights
    Object.keys(CATEGORIES).forEach(catKey => {
        const sel = document.getElementById(`catWeight_${catKey}`);
        if (sel) sel.value = (settings.categoryWeights[catKey] ?? 1.0).toString();
    });

    const useOwnKeyCheckbox = document.getElementById('useOwnKey');
    const ownKeyGroup = document.getElementById('ownKeyGroup');
    useOwnKeyCheckbox.checked = settings.useOwnKey;
    ownKeyGroup.style.display = settings.useOwnKey ? '' : 'none';
    useOwnKeyCheckbox.addEventListener('change', () => {
        ownKeyGroup.style.display = useOwnKeyCheckbox.checked ? '' : 'none';
    });

    // Setup threshold slider
    document.getElementById('filterThreshold').addEventListener('input', (e) => {
        document.getElementById('thresholdValue').textContent = `${e.target.value}/10`;
    });
}

function saveSettings() {
    settings.provider = document.getElementById('llmProvider').value;
    settings.apiKey = document.getElementById('apiKey').value;
    settings.useOwnKey = document.getElementById('useOwnKey').checked;
    settings.filterInterests = document.getElementById('filterInterests').value;
    settings.filterThreshold = parseInt(document.getElementById('filterThreshold').value);
    settings.summaryStyle = summaryStyleSelect.value;

    // Save category weights and invalidate cached scores if weights changed
    const prevWeights = JSON.stringify(settings.categoryWeights);
    const newWeights = {};
    Object.keys(CATEGORIES).forEach(catKey => {
        const sel = document.getElementById(`catWeight_${catKey}`);
        if (sel) newWeights[catKey] = parseFloat(sel.value);
    });
    settings.categoryWeights = newWeights;
    if (JSON.stringify(newWeights) !== prevWeights) {
        // Invalidate scores for categories whose weight changed
        const changedCats = Object.keys(CATEGORIES).filter(k => {
            const prev = JSON.parse(prevWeights || '{}')[k] ?? 1.0;
            return (newWeights[k] ?? 1.0) !== prev;
        });
        if (changedCats.length > 0) {
            articles.forEach(a => {
                if (changedCats.includes(a.category)) delete articleScores[a.id];
            });
            localStorage.setItem('articleScores', JSON.stringify(articleScores));
        }
    }

    // Also save current prompt if it's a preset (allowing customization)
    const currentPrompt = promptTemplate.value.trim();
    if (currentPrompt && !settings.summaryStyle.startsWith('custom_')) {
        // User modified a preset - offer to save as custom
        const presetPrompt = PRESET_PROMPTS[settings.summaryStyle];
        if (currentPrompt !== presetPrompt) {
            // Modified preset - just keep using it (will be used via getCurrentPrompt)
            localStorage.setItem('modifiedPrompt_' + settings.summaryStyle, currentPrompt);
        }
    }

    localStorage.setItem('llmProvider', settings.provider);
    localStorage.setItem('apiKey', settings.apiKey);
    localStorage.setItem('useOwnKey', settings.useOwnKey.toString());
    localStorage.setItem('filterInterests', settings.filterInterests);
    localStorage.setItem('filterThreshold', settings.filterThreshold.toString());
    localStorage.setItem('summaryStyle', settings.summaryStyle);
    localStorage.setItem('categoryWeights', JSON.stringify(settings.categoryWeights));

    settingsModal.classList.remove('open');

    // Re-render articles with new threshold
    renderArticles();

    // Sync to Supabase (fire-and-forget)
    saveProfileToSupabase().catch(() => {});
}

async function loadArticles(forceRefresh = false) {
    refreshBtn.classList.add('loading');
    articleList.innerHTML = `
        <div class="loading">
            <div class="loading-dots"><span></span><span></span><span></span></div>
            <p style="margin-top: 16px;">Fetching articles...</p>
        </div>`;

    // Try to load from cache first
    const cached = localStorage.getItem('articles');
    const cacheTime = localStorage.getItem('articlesTime');
    const oneHour = 60 * 60 * 1000;

    if (!forceRefresh && cached && cacheTime && (Date.now() - parseInt(cacheTime)) < oneHour) {
        articles = JSON.parse(cached);
        computeTrendingAndBreaking(articles);
        renderArticles();
        refreshBtn.classList.remove('loading');

        // Run smart filter on unscored articles
        runSmartFilter();
        return;
    }

    try {
        const allArticles = [];
        const feedPromises = getActiveFeeds().map(feed =>
            fetchFeed(feed).catch(e => {
                console.error(`Error fetching ${feed.name}:`, e);
                return [];
            })
        );

        const results = await Promise.all(feedPromises);
        results.forEach(feedArticles => allArticles.push(...feedArticles));

        // Sort by date
        articles = allArticles.sort((a, b) => new Date(b.date) - new Date(a.date));

        // Cache
        localStorage.setItem('articles', JSON.stringify(articles));
        localStorage.setItem('articlesTime', Date.now().toString());

        // Compute trending/breaking
        computeTrendingAndBreaking(articles);

        renderArticles();
        
        // Run smart filter in background
        runSmartFilter();
    } catch (error) {
        articleList.innerHTML = '<div class="loading">Error loading articles. Try again.</div>';
        console.error(error);
    }

    refreshBtn.classList.remove('loading');
}

async function fetchFeed(feed) {
    const response = await fetch(CORS_PROXY + encodeURIComponent(feed.url));
    const text = await response.text();
    const parser = new DOMParser();
    const xml = parser.parseFromString(text, 'text/xml');

    // Check for RSS items or Atom entries
    let items = xml.querySelectorAll('item');
    const isAtom = items.length === 0;

    if (isAtom) {
        items = xml.querySelectorAll('entry');
    }

    const articles = [];

    items.forEach((item, index) => {
        if (index >= 8) return; // Limit per feed

        let title, link, description, pubDate;

        if (isAtom) {
            // Atom format
            title = item.querySelector('title')?.textContent || '';
            link = item.querySelector('link[rel="alternate"]')?.getAttribute('href') ||
                   item.querySelector('link')?.getAttribute('href') || '';
            description = item.querySelector('summary')?.textContent ||
                         item.querySelector('content')?.textContent || '';
            pubDate = item.querySelector('published')?.textContent ||
                     item.querySelector('updated')?.textContent || new Date().toISOString();
        } else {
            // RSS format
            title = item.querySelector('title')?.textContent || '';
            link = item.querySelector('link')?.textContent || '';
            description = item.querySelector('description')?.textContent ||
                         item.querySelector('content\\:encoded')?.textContent || '';
            pubDate = item.querySelector('pubDate')?.textContent || new Date().toISOString();
        }

        // Skip if no title or link
        if (!title || !link) return;

        // Extract keywords from title
        const keywords = extractKeywords(title);

        // Create unique ID from link hash
        const uniqueId = 'art_' + hashCode(link + feed.name);

        articles.push({
            id: uniqueId,
            title: cleanHTML(title),
            description: cleanHTML(description).slice(0, 300),
            link,
            date: pubDate,
            source: feed.name,
            category: feed.category,
            keywords,
            summary: null,
            liked: false,
            disliked: false,
            bookmarked: false,
            read: false
        });
    });

    return articles;
}

function extractKeywords(title) {
    const stopWords = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'it', 'its', 'in', 'on', 'at', 'to', 'for', 'of', 'and', 'or', 'but', 'with', 'by', 'from', 'as', 'be', 'this', 'that', 'how', 'what', 'why', 'when', 'where', 'who', 'new', 'first', 'just', 'now', 'get', 'can', 'will', 'one', 'all', 'has', 'have', 'been', 'more', 'your', 'out', 'up', 'about']);
    return title
        .split(/\s+/)
        .map(w => w.replace(/[^\w]/g, '').toLowerCase())
        .filter(w => w.length > 2 && !stopWords.has(w))
        .slice(0, 4);
}

function cleanHTML(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || '';
}

function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// Escape a string for safe embedding inside a JS string literal within an HTML attribute
function escapeJSString(str) {
    return str
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/"/g, '&quot;')
        .replace(/</g, '\\x3c')
        .replace(/>/g, '\\x3e')
        .replace(/`/g, '\\`')
        .replace(/\$/g, '\\$')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r');
}

// Sanitize URL: only allow http/https to prevent javascript: XSS
function sanitizeURL(url) {
    try {
        const parsed = new URL(url);
        if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
            return escapeHTML(url);
        }
    } catch (e) {}
    return '#';
}

// Generate unique hash from string
function hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
}

function renderArticles() {
    const filter = document.querySelector('.filter-btn.active')?.dataset.filter || 'smart';
    const search = searchInput.value.toLowerCase();

    if (filter === 'briefing') {
        renderBriefing();
        return;
    }

    let filtered = articles;

    if (filter === 'smart') {
        // Smart filter: show articles with score >= threshold OR not yet scored
        filtered = filtered.filter(a => {
            const score = articleScores[a.id];
            if (score === undefined) return true; // Not scored yet
            return score >= settings.filterThreshold;
        });
        // Sort by score (scored first, then by date)
        filtered.sort((a, b) => {
            const scoreA = articleScores[a.id] ?? -1;
            const scoreB = articleScores[b.id] ?? -1;
            if (scoreA >= 0 && scoreB >= 0) {
                if (scoreA !== scoreB) return scoreB - scoreA;
            }
            if (scoreA >= 0 && scoreB < 0) return -1;
            if (scoreB >= 0 && scoreA < 0) return 1;
            return new Date(b.date) - new Date(a.date);
        });
    } else if (filter === 'top') {
        filtered = filtered
            .filter(a => articleScores[a.id] >= 8)
            .sort((a, b) => (articleScores[b.id] || 0) - (articleScores[a.id] || 0));
    } else if (filter === 'unread') {
        filtered = filtered.filter(a => !a.read);
    } else if (filter === 'bookmarked') {
        filtered = filtered.filter(a => a.bookmarked);
    } else if (filter === 'trending') {
        // Show articles that are trending (3+ sources) or breaking (< 2h old)
        filtered = filtered.filter(a => trendingMeta[a.id]);
        // Sort: breaking first, then by group size desc, then by date
        filtered.sort((a, b) => {
            const ma = trendingMeta[a.id] || {};
            const mb = trendingMeta[b.id] || {};
            if (mb.breaking !== ma.breaking) return mb.breaking ? 1 : -1;
            if ((mb.groupSize || 0) !== (ma.groupSize || 0)) return (mb.groupSize || 0) - (ma.groupSize || 0);
            return new Date(b.date) - new Date(a.date);
        });
    } else if (filter === 'discover') {
        const topSources = getTopReadSources(5);
        filtered = filtered
            .filter(a => {
                const score = articleScores[a.id];
                return score !== undefined && score >= 3 && score <= 7 &&
                    !topSources.includes(a.source);
            })
            .sort(() => Math.random() - 0.5)
            .slice(0, 15);
    }

    if (activeCategory) {
        filtered = filtered.filter(a => a.category === activeCategory);
    }

    if (search) {
        filtered = filtered.filter(a =>
            a.title.toLowerCase().includes(search) ||
            a.description.toLowerCase().includes(search) ||
            a.source.toLowerCase().includes(search)
        );
    }

    if (filtered.length === 0) {
        articleList.innerHTML = `
            <div class="empty-state" style="padding: 48px 24px;">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="opacity: 0.3; margin-bottom: 16px;">
                    <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
                </svg>
                <p style="color: var(--text-muted);">No articles found</p>
            </div>`;
        articleCount.textContent = '0 articles';
        return;
    }

    articleList.innerHTML = filtered.map(article => {
        const score = articleScores[article.id];
        const scoreBadge = score !== undefined
            ? `<span class="score-badge ${getScoreBadgeClass(score)}">⚡ ${score}</span>`
            : '';

        const meta = trendingMeta[article.id];
        const breakingBadge = meta?.breaking ? `<span class="badge-breaking">BREAKING</span>` : '';
        const trendingBadge = meta?.trending && !meta?.breaking
            ? `<span class="badge-trending">TRENDING ${meta.groupSize}+</span>`
            : (meta?.trending ? `<span class="badge-trending">TRENDING ${meta.groupSize}+</span>` : '');

        return `
            <div class="article-item ${article.id === currentArticle?.id ? 'active' : ''} ${article.read ? 'read' : ''}" data-id="${article.id}">
                <div class="article-item-header">
                    <div class="article-tags">
                        ${breakingBadge}${trendingBadge}
                        ${article.keywords.slice(0, 2).map(k => `<span class="tag">${escapeHTML(k)}</span>`).join('')}
                    </div>
                    ${scoreBadge}
                </div>
                <h3>${escapeHTML(article.title)}</h3>
                ${article.scoreReason ? `<p class="score-reason-preview">${escapeHTML(article.scoreReason)}</p>` : ''}
                ${article.groqSummary ? `<p class="groq-summary">${escapeHTML(article.groqSummary)}</p>` : ''}
                <div class="article-meta">
                    <span>${escapeHTML(article.source)}</span>
                    <span>${formatDate(article.date)}</span>
                    ${article.bookmarked ? '<span style="color: var(--accent);">★</span>' : ''}
                </div>
            </div>
        `;
    }).join('');

    articleCount.textContent = `${filtered.length} articles`;
}

let searchDebounceTimer = null;

function handleSearch() {
    const query = searchInput.value.trim();

    clearTimeout(searchDebounceTimer);

    const isQuestion = query.length > 10 && (
        query.endsWith('?') ||
        /^(what|why|how|when|who|which|is|are|will|can|does|do|should|tell|explain|compare)\b/i.test(query)
    );

    if (isQuestion) {
        // Debounce questions (wait for user to stop typing)
        searchDebounceTimer = setTimeout(() => answerQuestion(query), 600);
    } else {
        renderArticles();
    }
}

function findRelevantArticles(question, limit) {
    const queryWords = question.toLowerCase()
        .replace(/[?.,!]/g, '')
        .split(/\s+/)
        .filter(w => w.length > 3);

    return articles
        .map(a => {
            const text = `${a.title} ${a.description} ${(a.keywords || []).join(' ')}`.toLowerCase();
            const matches = queryWords.filter(w => text.includes(w)).length;
            return { ...a, relevance: matches };
        })
        .filter(a => a.relevance > 0)
        .sort((a, b) => b.relevance - a.relevance)
        .slice(0, limit);
}

async function answerQuestion(question) {
    const relevant = findRelevantArticles(question, 8);

    articleContent.innerHTML = `
        <div class="answer-engine">
            <div class="answer-question">${escapeHTML(question)}</div>
            <div class="answer-loading">
                <div class="loading-dots"><span></span><span></span><span></span></div>
                <p>Searching across ${articles.length} articles...</p>
            </div>
        </div>`;

    if (relevant.length === 0) {
        articleContent.innerHTML = `
            <div class="answer-engine">
                <div class="answer-question">${escapeHTML(question)}</div>
                <p class="answer-empty">No relevant articles found for this question. Try different keywords.</p>
            </div>`;
        return;
    }

    const context = relevant.map((a, i) =>
        `[${i+1}] "${a.title}" (${a.source}, ${formatDate(a.date)}):\n${a.description}`
    ).join('\n\n');

    const prompt = `Based on these recent tech/AI news articles, answer the question.

ARTICLES:
${context}

QUESTION: ${question}

Rules:
- Answer based ONLY on the provided articles
- Cite sources as [1], [2] etc.
- If the articles don't contain enough info, say so
- Be concise (max 200 words)
- If multiple articles discuss this, synthesize them`;

    try {
        const answer = await callLLM(prompt, { max_tokens: 600, temperature: 0.3 });
        displayAnswer(question, answer, relevant);
    } catch (e) {
        articleContent.innerHTML = `
            <div class="answer-engine">
                <div class="answer-question">${escapeHTML(question)}</div>
                <p class="answer-error">Failed to generate answer. <a href="#" onclick="answerQuestion('${escapeJSString(question)}'); return false;">Retry</a></p>
            </div>`;
    }
}

function displayAnswer(question, answer, sources) {
    const formatted = escapeHTML(answer)
        .replace(/\[(\d+)\]/g, '<sup class="answer-ref">[$1]</sup>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .split('\n\n')
        .map(p => `<p>${p}</p>`)
        .join('');

    const sourceLinks = sources.map((a, i) =>
        `<li>
            <a href="#" onclick="showArticle(articles.find(x=>x.id==='${a.id}'));return false">
                [${i+1}] ${escapeHTML(a.title)}
            </a>
            <span class="answer-source-meta">${escapeHTML(a.source)} · ${formatDate(a.date)}</span>
        </li>`
    ).join('');

    articleContent.innerHTML = `
        <div class="answer-engine">
            <div class="answer-question">${escapeHTML(question)}</div>
            <div class="answer-text">${formatted}</div>
            <h4 class="answer-sources-header">Sources</h4>
            <ol class="answer-sources">${sourceLinks}</ol>
        </div>`;
}

function filterArticles() {
    renderArticles();
}

let articleViewStart = null;
let articleMaxScrollPct = 0; // 0–100, max scroll depth for current article

function _onArticleScroll() {
    const el = articleContent;
    const scrollable = el.scrollHeight - el.clientHeight;
    if (scrollable > 0) {
        const pct = Math.round((el.scrollTop / scrollable) * 100);
        if (pct > articleMaxScrollPct) articleMaxScrollPct = pct;
    }
}

function trackReadTime() {
    if (currentArticle && articleViewStart) {
        const duration = Math.round((performance.now() - articleViewStart) / 1000);
        if (duration >= 5) {
            // Save read time per article
            const readTimes = JSON.parse(localStorage.getItem('readTimes') || '{}');
            readTimes[currentArticle.id] = {
                seconds: duration,
                scrollDepth: articleMaxScrollPct,
                source: currentArticle.source,
                category: currentArticle.category || null,
                keywords: currentArticle.keywords || [],
                ts: Date.now()
            };
            localStorage.setItem('readTimes', JSON.stringify(readTimes));

            // Sync to Supabase (fire-and-forget)
            saveInteractionToSupabase(currentArticle.id, {
                read: true,
                read_duration_seconds: duration,
                scroll_depth_pct: articleMaxScrollPct
            }).catch(() => {});

            // Rebuild preference vector after meaningful read
            if (duration >= 30 || articleMaxScrollPct >= 50) {
                savePreferenceVector().catch(() => {});
            }
        }
    }
    articleMaxScrollPct = 0;
}

function showArticle(article) {
    // Track time spent on previous article
    trackReadTime();
    articleViewStart = performance.now();
    articleMaxScrollPct = 0;

    currentArticle = article;
    article.read = true;

    // Save read state
    localStorage.setItem('articles', JSON.stringify(articles));

    // Update sidebar
    document.querySelectorAll('.article-item').forEach(item => {
        item.classList.toggle('active', item.dataset.id === article.id);
    });

    // Track scroll depth for this article
    articleContent.removeEventListener('scroll', _onArticleScroll);
    articleContent.addEventListener('scroll', _onArticleScroll, { passive: true });

    const score = articleScores[article.id];
    const backBtn = document.getElementById('backBtn');

    articleContent.innerHTML = `
        ${backBtn ? backBtn.outerHTML : ''}
        <div class="article-detail">
            <div id="articleImage"></div>

            <div class="tags">
                ${article.keywords.map(k => `<span class="tag">${escapeHTML(k)}</span>`).join('')}
                ${score !== undefined ? `<span class="tag tag--score ${getScoreBadgeClass(score)}">⚡ ${score}/10</span>` : ''}
            </div>
            ${article.scoreReason ? `<p class="score-reason-detail">${escapeHTML(article.scoreReason)}</p>` : ''}

            <h1>${escapeHTML(article.title)}</h1>

            <div class="meta">
                <span>${escapeHTML(article.source)}</span>
                <span>${formatDate(article.date)}</span>
            </div>

            <div class="article-actions">
                <button class="action-btn ${article.liked ? 'liked' : ''}" onclick="toggleLike('${article.id}')" title="Like">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="${article.liked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
                        <path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3zM7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3"/>
                    </svg>
                </button>
                <button class="action-btn ${article.disliked ? 'disliked' : ''}" onclick="toggleDislike('${article.id}')" title="Dislike">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="${article.disliked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
                        <path d="M10 15v4a3 3 0 003 3l4-9V2H5.72a2 2 0 00-2 1.7l-1.38 9a2 2 0 002 2.3zm7-13h2.67A2.31 2.31 0 0122 4v7a2.31 2.31 0 01-2.33 2H17"/>
                    </svg>
                </button>
                <button class="action-btn ${article.bookmarked ? 'bookmarked' : ''}" onclick="toggleBookmark('${article.id}')" title="Bookmark">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="${article.bookmarked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
                        <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/>
                    </svg>
                </button>
                <button class="action-btn" onclick="copyArticleLink(currentArticle)" title="Copy link">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
                        <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
                    </svg>
                </button>
                <div style="flex:1"></div>
                <a href="${sanitizeURL(article.link)}" target="_blank" rel="noopener noreferrer" class="btn-primary">Read Original</a>
            </div>

            <div class="summary-section">
                <h3>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                    </svg>
                    AI Summary
                </h3>
                <div id="summaryContent">
                    ${article.summary ? `
                        ${formatSummary(article.summary)}
                        <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:12px;">
                            <button class="btn-secondary copy-btn" onclick="copySummary()">
                                Copy Summary
                            </button>
                            <button class="btn-secondary share-btn" onclick="shareSummary()" id="shareSummaryBtn">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:5px">
                                    <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                                    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                                </svg>
                                Share Summary
                            </button>
                        </div>
                    ` : `
                        <p style="color: var(--text-muted); margin-bottom: 16px;">Generate an AI-powered summary of this article</p>
                        <button class="btn-primary generate-btn" onclick="generateSummary('${article.id}')">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 8px;">
                                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                            </svg>
                            Generate Summary
                        </button>
                    `}
                </div>
            </div>

            <div class="article-body">
                <h4>Article Preview</h4>
                <p>${escapeHTML(article.description || 'No preview available. Click "Read Original" to view the full article.')}</p>
            </div>
        </div>
    `;

    // Show mobile content panel
    showMobileContent();

    // Auto-generate summary if not already cached
    if (!article.summary) {
        generateSummary(article.id);
    }

    // Fetch and display OG image with fade-in, fallback to AI-generated image
    fetchOGImage(article.link).then(async imageUrl => {
        const imageContainer = document.getElementById('articleImage');
        if (!imageContainer) return;

        if (!imageUrl) {
            // Try AI-generated fallback image
            imageUrl = await fetchGeminiImage(article.title, article.keywords);
        }

        if (imageUrl) {
            const img = document.createElement('img');
            img.className = 'hero-image';
            img.alt = '';
            img.onload = () => img.classList.add('loaded');
            img.src = imageUrl;
            imageContainer.appendChild(img);
        }
    });
}

function formatSummary(summary) {
    const e = escapeHTML;

    // Try to parse structured summary (WHAT: / WHY IT MATTERS: / KEY INSIGHT:)
    const whatMatch = summary.match(/WHAT:\s*(.+?)(?=WHY IT MATTERS:|$)/is);
    const whyMatch = summary.match(/WHY IT MATTERS:\s*(.+?)(?=KEY INSIGHT:|$)/is);
    const insightMatch = summary.match(/KEY INSIGHT:\s*(.+?)$/is);

    if (whatMatch || whyMatch || insightMatch) {
        return `
            <div class="summary-structured">
                ${whatMatch ? `
                    <div class="summary-point">
                        <span class="point-label">What</span>
                        <span class="point-content">${e(whatMatch[1].trim())}</span>
                    </div>
                ` : ''}
                ${whyMatch ? `
                    <div class="summary-point">
                        <span class="point-label">Why it matters</span>
                        <span class="point-content">${e(whyMatch[1].trim())}</span>
                    </div>
                ` : ''}
                ${insightMatch ? `
                    <div class="key-insight">
                        <div class="key-insight-label">Key Insight</div>
                        <p>${e(insightMatch[1].trim())}</p>
                    </div>
                ` : ''}
            </div>
        `;
    }

    // Check for bullet points
    if (summary.includes('\u2022') || summary.includes('-')) {
        const lines = summary.split(/\n/).filter(l => l.trim());
        const bullets = lines.map(line => {
            const cleaned = line.replace(/^[\u2022\-\*]\s*/, '').trim();
            return cleaned ? `<li>${e(cleaned)}</li>` : '';
        }).join('');
        return `<ul style="list-style: none; padding: 0; margin: 0;">${bullets}</ul>`;
    }

    // Default: escape and add line breaks
    return `<p>${e(summary).replace(/\n\n/g, '</p><p style="margin-top: 12px;">').replace(/\n/g, '<br>')}</p>`;
}

function toggleLike(id) {
    const article = articles.find(a => a.id === id);
    if (article) {
        article.liked = !article.liked;
        if (article.liked) article.disliked = false;
        localStorage.setItem('articles', JSON.stringify(articles));
        showArticle(article);
        saveInteractionToSupabase(id, { liked: article.liked, disliked: article.disliked }).catch(() => {});
        savePreferenceVector().catch(() => {});
    }
}

function toggleDislike(id) {
    const article = articles.find(a => a.id === id);
    if (article) {
        article.disliked = !article.disliked;
        if (article.disliked) article.liked = false;
        localStorage.setItem('articles', JSON.stringify(articles));
        showArticle(article);
        saveInteractionToSupabase(id, { disliked: article.disliked, liked: article.liked }).catch(() => {});
        savePreferenceVector().catch(() => {});
    }
}

function toggleBookmark(id) {
    const article = articles.find(a => a.id === id);
    if (article) {
        article.bookmarked = !article.bookmarked;
        localStorage.setItem('articles', JSON.stringify(articles));
        showToast(article.bookmarked ? 'Bookmarked' : 'Bookmark removed');
        showArticle(article);
        renderArticles();
        saveInteractionToSupabase(id, { bookmarked: article.bookmarked }).catch(() => {});
        savePreferenceVector().catch(() => {});
    }
}

function getCurrentPrompt(article) {
    const style = settings.summaryStyle;

    // Check for custom style
    if (style.startsWith('custom_')) {
        const customName = style.replace('custom_', '');
        const template = customStyles[customName] || PRESET_PROMPTS.newsletter;
        return template.replace('{{title}}', article.title).replace('{{content}}', article.description);
    }

    // Check for modified preset
    const modifiedPrompt = localStorage.getItem('modifiedPrompt_' + style);
    const template = modifiedPrompt || PRESET_PROMPTS[style] || PRESET_PROMPTS.newsletter;

    return template.replace('{{title}}', article.title).replace('{{content}}', article.description);
}

async function generateSummary(id) {
    const article = articles.find(a => a.id === id);
    if (!article) return;

    if (settings.useOwnKey && !settings.apiKey) {
        alert('Please set your API key in Settings, or uncheck "Use my own API key" to use the shared key.');
        settingsModal.classList.add('open');
        return;
    }

    const summaryContent = document.getElementById('summaryContent');
    if (!summaryContent) return;

    summaryContent.innerHTML = `
        <div class="loading-state">
            <div class="loading-dots"><span></span><span></span><span></span></div>
            <span>Generating summary...</span>
        </div>
    `;

    const style = settings.summaryStyle || 'newsletter';

    // 1. Check server-side cache first
    try {
        const cacheRes = await fetch(`/api/summary-cache?id=${encodeURIComponent(id)}&style=${encodeURIComponent(style)}`);
        const cacheData = await cacheRes.json();
        if (cacheData.cached && cacheData.summary) {
            article.summary = cacheData.summary;
            localStorage.setItem('articles', JSON.stringify(articles));
            summaryContent.innerHTML = formatSummary(article.summary);
            return;
        }
    } catch (e) { /* cache miss, continue */ }

    // 2. Generate via LLM
    try {
        const prompt = getCurrentPrompt(article);
        const summary = await callLLM(prompt);
        article.summary = summary;

        // Save to localStorage
        localStorage.setItem('articles', JSON.stringify(articles));

        // 3. Save to server cache (fire-and-forget)
        fetch('/api/summary-cache', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, style, summary })
        }).catch(() => {});

        // 4. Save to Supabase (fire-and-forget)
        saveInteractionToSupabase(id, { summary, summary_style: style }).catch(() => {});

        summaryContent.innerHTML = formatSummary(summary);
    } catch (error) {
        summaryContent.innerHTML = `
            <p style="color: var(--danger); margin-bottom: 16px;">Error: ${escapeHTML(error.message)}</p>
            <button class="btn-primary generate-btn" onclick="generateSummary('${article.id}')">Try Again</button>
        `;
    }
}

async function callLLM(prompt, options = {}) {
    const maxTokens = options.max_tokens || 400;
    const temperature = options.temperature;

    // Use proxy (shared key) unless user has their own key
    if (!settings.useOwnKey || !settings.apiKey) {
        const body = {
            model: options.model || 'llama-3.3-70b-versatile',
            max_tokens: maxTokens,
            messages: [{ role: 'user', content: prompt }]
        };
        if (temperature !== undefined) body.temperature = temperature;
        return callGroqProxy(body);
    }

    const configs = {
        groq: {
            url: 'https://api.groq.com/openai/v1/chat/completions',
            model: 'llama-3.3-70b-versatile',
            headers: { 'Authorization': `Bearer ${settings.apiKey}` }
        },
        openai: {
            url: 'https://api.openai.com/v1/chat/completions',
            model: 'gpt-4o-mini',
            headers: { 'Authorization': `Bearer ${settings.apiKey}` }
        },
        anthropic: {
            url: 'https://api.anthropic.com/v1/messages',
            model: 'claude-3-haiku-20240307',
            headers: {
                'x-api-key': settings.apiKey,
                'anthropic-version': '2023-06-01'
            }
        }
    };

    const config = configs[settings.provider];
    const requestBody = {
        model: config.model,
        max_tokens: maxTokens,
        messages: [{ role: 'user', content: prompt }]
    };
    if (temperature !== undefined) requestBody.temperature = temperature;

    if (settings.provider === 'anthropic') {
        const response = await fetch(config.url, {
            method: 'POST',
            headers: { ...config.headers, 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });
        const data = await response.json();
        if (data.error) throw new Error(data.error.message);
        return data.content[0].text;
    } else {
        const response = await fetch(config.url, {
            method: 'POST',
            headers: { ...config.headers, 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });
        const data = await response.json();
        if (data.error) throw new Error(data.error.message || data.error);
        return data.choices[0].message.content;
    }
}

async function callGroqProxy(body) {
    const response = await fetch('/api/groq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    const data = await response.json();
    if (data.error) {
        if (response.status === 429 || response.status === 503) {
            throw new Error('Shared API key limit reached. Go to Settings and add your own free key from console.groq.com');
        }
        throw new Error(data.error.message || data.error);
    }
    return data.choices[0].message.content;
}

function formatDate(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ==================== SMART FILTER ====================

async function runSmartFilter() {
    const unscored = articles.filter(a => articleScores[a.id] === undefined);
    if (unscored.length === 0) return;

    const BATCH_SIZE = 40;
    const batches = [];
    for (let i = 0; i < unscored.length; i += BATCH_SIZE) {
        batches.push(unscored.slice(i, i + BATCH_SIZE));
    }

    console.log(`🔍 Smart filtering ${unscored.length} articles in ${batches.length} batch(es)...`);

    for (const batch of batches) {
        try {
            await scoreBatch(batch);
            renderArticles();
        } catch (e) {
            console.error('Batch scoring failed:', e);
            break;
        }
    }
}

async function scoreBatch(batch) {
    const filterInterests = settings.filterInterests || 'AI, machine learning, LLMs, generative AI, tech industry';

    const articleList = batch.map((a, i) => {
        const catLabel = a.category && CATEGORIES[a.category] ? CATEGORIES[a.category].label : null;
        return `[${i}] ${a.title} (${a.source})${catLabel ? ` — ${catLabel}` : ''}`;
    }).join('\n');

    // Build preference context from learned preference vector
    const prefVec = buildPreferenceVector();
    let prefContext = '';

    const posSources = Object.entries(prefVec.sources)
        .filter(([, v]) => v > 0.3).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([s]) => s);
    const negSources = Object.entries(prefVec.sources)
        .filter(([, v]) => v < -0.3).sort((a, b) => a[1] - b[1]).slice(0, 3).map(([s]) => s);
    const posKw = Object.entries(prefVec.keywords)
        .filter(([, v]) => v > 0.2).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([k]) => k);

    const ctxParts = [];
    if (posSources.length > 0) ctxParts.push(`prefers sources: ${posSources.join(', ')}`);
    if (posKw.length > 0) ctxParts.push(`interested in topics: ${posKw.join(', ')}`);
    if (negSources.length > 0) ctxParts.push(`less interested in sources: ${negSources.join(', ')}`);
    if (ctxParts.length > 0) prefContext = `\nLearned user preferences: ${ctxParts.join('. ')}.`;

    // Build category weight context — blend onboarding + learned signals
    const blendedWeights = { ...(settings.categoryWeights || {}) };
    Object.entries(prefVec.categories).forEach(([cat, score]) => {
        if (score > 0.3) blendedWeights[cat] = Math.min(2.0, (blendedWeights[cat] || 1.0) + score * 0.2);
        else if (score < -0.3) blendedWeights[cat] = Math.max(0.3, (blendedWeights[cat] || 1.0) + score * 0.15);
    });
    const weightLines = Object.entries(blendedWeights)
        .filter(([k, v]) => v !== 1.0 && CATEGORIES[k])
        .map(([k, v]) => `${CATEGORIES[k].label}: ${v >= 1.5 ? 'High priority' : v >= 1.0 ? 'Normal' : 'Low priority'}`);
    const catWeightContext = weightLines.length > 0
        ? `\nCategory priorities (adjust score accordingly): ${weightLines.join(', ')}.`
        : '';

    const prompt = `You are a news relevance filter. Score these articles 1-10 for someone interested in: ${filterInterests}${prefContext}${catWeightContext}

${articleList}

Return JSON: {"articles":[{"i":0,"s":7,"r":"reason for score","t":"one sentence summary"},...]}"
- i: index, s: score (1=irrelevant, 10=must read), r: one-sentence reason for the score, t: one-sentence TL;DR
Respond with ONLY valid JSON.`;

    const text = await callGroqProxy({
        model: 'llama-3.1-8b-instant',
        max_tokens: 3000,
        temperature: 0.3,
        messages: [{ role: 'user', content: prompt }]
    });

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in response');

    const result = JSON.parse(jsonMatch[0]);

    result.articles.forEach(scored => {
        const article = batch[scored.i];
        if (article) {
            // Use blended weights (onboarding + learned) for post-scoring adjustment
            const weight = blendedWeights[article.category] ?? 1.0;
            const weightedScore = Math.min(10, Math.max(1, Math.round(scored.s * weight)));
            articleScores[article.id] = weightedScore;
            article.groqSummary = scored.t;
            article.scoreReason = scored.r;
        }
    });

    localStorage.setItem('articleScores', JSON.stringify(articleScores));
    localStorage.setItem('articles', JSON.stringify(articles));
    console.log(`✅ Scored ${result.articles.length} articles`);

    // Sync scores to Supabase (fire-and-forget)
    if (_supabaseClient && currentUser) {
        const rows = result.articles.map(scored => {
            const article = batch[scored.i];
            if (!article) return null;
            return {
                user_id: currentUser.id,
                article_id: article.id,
                score: scored.s,
                score_reason: scored.r || null,
                groq_summary: scored.t || null
            };
        }).filter(Boolean);

        if (rows.length > 0) {
            _supabaseClient.from('article_interactions')
                .upsert(rows, { onConflict: 'user_id,article_id' })
                .then(({ error }) => { if (error) console.error('Score sync error:', error); });
        }
    }
}

// Fetch Open Graph image
async function fetchOGImage(url) {
    try {
        const response = await fetch(CORS_PROXY + encodeURIComponent(url));
        const html = await response.text();
        
        const patterns = [
            /<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i,
            /<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i,
            /<meta[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i
        ];
        
        for (const pattern of patterns) {
            const match = html.match(pattern);
            if (match && match[1]) {
                return match[1];
            }
        }
    } catch (e) {
        console.log('Could not fetch OG image:', e);
    }
    return null;
}

// Fetch AI-generated image via Gemini
async function fetchGeminiImage(title, keywords) {
    try {
        const response = await fetch('/api/gemini-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, keywords }),
        });
        if (!response.ok) return null;
        const data = await response.json();
        return data.image || null;
    } catch (e) {
        console.log('Could not generate AI image:', e);
        return null;
    }
}

// Copy to clipboard
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showToast('Copied to clipboard');
    });
}

// Copy current article summary (avoids embedding summary text in onclick attributes)
function copySummary() {
    if (currentArticle && currentArticle.summary) {
        copyToClipboard(currentArticle.summary);
    }
}

async function shareSummary() {
    if (!currentArticle || !currentArticle.summary) return;

    const btn = document.getElementById('shareSummaryBtn');
    if (btn) { btn.disabled = true; btn.textContent = 'Sharing…'; }

    try {
        const res = await fetch('/api/share', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                articleId: currentArticle.id,
                url: currentArticle.link || currentArticle.url || '',
                title: currentArticle.title || '',
                source: currentArticle.source || '',
                date: currentArticle.date || null,
                category: currentArticle.category || null,
                summary: currentArticle.summary,
                summaryStyle: settings.summaryStyle || 'newsletter',
            })
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || `HTTP ${res.status}`);
        }

        const { shareUrl } = await res.json();
        const shareTitle = currentArticle.title || 'Weft';
        const shareText = (currentArticle.summary || '').slice(0, 180);
        if (navigator.share) {
            try {
                await navigator.share({ title: shareTitle, text: shareText, url: shareUrl });
            } catch (shareErr) {
                if (shareErr.name !== 'AbortError') {
                    await copyToClipboard(shareUrl);
                    showToast('Share link copied!');
                }
            }
        } else {
            await copyToClipboard(shareUrl);
            showToast('Share link copied!');
        }
    } catch (e) {
        console.error('Share error:', e);
        showToast('Could not create share link. Try again.');
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:5px"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>Share Summary`; }
    }
}

// ==================== INVITE & REFERRAL ====================

function getInviteLink() {
    if (!currentUser) return null;
    const refCode = currentUser.id.replace(/-/g, '').slice(0, 8);
    return `${window.location.origin}?ref=${refCode}`;
}

async function copyInviteLink() {
    const link = getInviteLink();
    if (!link) {
        showToast('Sign in to get your invite link');
        return;
    }
    if (navigator.share) {
        try {
            await navigator.share({
                title: 'Weft — AI-curated news',
                text: 'Check out Weft — an AI news aggregator that actually filters the noise.',
                url: link,
            });
            return;
        } catch (e) {
            if (e.name === 'AbortError') return;
        }
    }
    await copyToClipboard(link);
    showToast('Invite link copied!');
}

function updateInviteSection() {
    const section = document.getElementById('inviteSection');
    const input = document.getElementById('inviteLink');
    if (!section || !input) return;
    if (currentUser) {
        section.style.display = '';
        input.value = getInviteLink() || '';
    } else {
        section.style.display = 'none';
    }
}

async function trackReferral(refCode, newUserId) {
    try {
        await fetch('/api/referral', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refCode, newUserId }),
        });
        localStorage.removeItem('weft_ref');
    } catch {
        // Silent fail — referral tracking is non-critical
    }
}

// Toast notification
function showToast(message) {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 2200);
}

// Score badge helper
function getScoreBadgeClass(score) {
    if (score >= 8) return 'score-badge--high';
    if (score >= 6) return 'score-badge--mid';
    if (score >= 4) return 'score-badge--low';
    return 'score-badge--min';
}

// ==================== SHARE ====================

function copyArticleLink(article) {
    if (!article || !article.link) return;
    navigator.clipboard.writeText(article.link).then(() => {
        showToast('Link copied');
    }).catch(() => {
        const ta = document.createElement('textarea');
        ta.value = article.link;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        showToast('Link copied');
    });
}

// ==================== DAILY BRIEFING ====================

async function renderBriefing() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayArticles = articles
        .filter(a => new Date(a.date) >= today)
        .sort((a, b) => (articleScores[b.id] || 0) - (articleScores[a.id] || 0));

    const topArticles = todayArticles.slice(0, 10);

    if (topArticles.length === 0) {
        articleContent.innerHTML = `
            <div class="briefing">
                <h2>Daily Briefing</h2>
                <p class="briefing-empty">No articles from today yet. Check back later.</p>
            </div>`;
        return;
    }

    const cacheKey = `briefing_${today.toISOString().split('T')[0]}`;
    const cached = localStorage.getItem(cacheKey);

    if (cached) {
        displayBriefing(cached, topArticles);
        return;
    }

    articleContent.innerHTML = `
        <div class="briefing">
            <h2>Daily Briefing</h2>
            <p class="briefing-date">${today.toLocaleDateString('en-US', {
                weekday: 'long', month: 'long', day: 'numeric'
            })}</p>
            <div class="briefing-loading">
                <div class="loading-dots"><span></span><span></span><span></span></div>
                <p>Analyzing today's top stories...</p>
            </div>
        </div>`;

    const articleList = topArticles.map((a, i) => {
        const score = articleScores[a.id] || '?';
        return `[${i+1}] "${a.title}" (${a.source}, score: ${score}/10)\n    ${a.description?.substring(0, 150) || ''}`;
    }).join('\n\n');

    const prompt = `You are a senior tech news analyst writing a daily briefing.

Today's top ${topArticles.length} articles (scored by AI relevance):

${articleList}

Write a concise daily briefing with:
1. **HEADLINE** — The single most important story in one sentence
2. **KEY STORIES** — 3-5 bullet points covering the most significant developments
3. **PATTERN** — One sentence on what theme or trend connects today's news
4. **WORTH WATCHING** — One emerging story that might become bigger

Keep it under 300 words. Be specific, cite article titles. No filler.`;

    try {
        const briefing = await callLLM(prompt, { max_tokens: 800, temperature: 0.5 });
        localStorage.setItem(cacheKey, briefing);
        displayBriefing(briefing, topArticles);
    } catch (e) {
        articleContent.innerHTML = `
            <div class="briefing">
                <h2>Daily Briefing</h2>
                <p class="briefing-error">Failed to generate briefing. <a href="#" onclick="renderBriefing(); return false;">Retry</a></p>
            </div>`;
    }
}

function displayBriefing(text, topArticles) {
    const today = new Date();

    const formatted = escapeHTML(text)
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/^## (.*)$/gm, '<h3>$1</h3>')
        .replace(/^- (.*)$/gm, '<li>$1</li>')
        .split('\n\n')
        .map(p => {
            if (p.includes('<li>')) return `<ul>${p}</ul>`;
            if (p.startsWith('<h3>')) return p;
            return `<p>${p}</p>`;
        })
        .join('');

    const articleLinks = topArticles.map(a => {
        const score = articleScores[a.id] || '?';
        return `<li>
            <a href="#" onclick="showArticle(articles.find(x=>x.id==='${a.id}'));return false">
                ${escapeHTML(a.title)}
            </a>
            <span class="briefing-source">${escapeHTML(a.source)} · ${score}/10</span>
        </li>`;
    }).join('');

    articleContent.innerHTML = `
        <div class="briefing">
            <h2>Daily Briefing</h2>
            <p class="briefing-date">${today.toLocaleDateString('en-US', {
                weekday: 'long', month: 'long', day: 'numeric'
            })}</p>
            <div class="briefing-content">${formatted}</div>
            <div class="briefing-actions">
                <button class="btn-primary" onclick="generateLinkedInPost()">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 8px;">
                        <path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-4 0v7h-4v-7a6 6 0 016-6zM2 9h4v12H2zM4 6a2 2 0 100-4 2 2 0 000 4z"/>
                    </svg>
                    Copy as LinkedIn post
                </button>
            </div>
            <h3 class="briefing-sources-header">Sources</h3>
            <ol class="briefing-sources">${articleLinks}</ol>
        </div>`;
}

// ==================== LINKEDIN POST ====================

async function generateLinkedInPost() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const topArticles = articles
        .filter(a => new Date(a.date) >= today)
        .sort((a, b) => (articleScores[b.id] || 0) - (articleScores[a.id] || 0))
        .slice(0, 10);

    if (topArticles.length === 0) {
        showToast('No articles from today');
        return;
    }

    const btn = document.querySelector('.briefing-actions .btn-primary');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = `
            <div class="loading-dots" style="display:inline-flex;gap:3px;margin-right:8px;"><span></span><span></span><span></span></div>
            Generating...`;
    }

    const articleList = topArticles.map((a, i) =>
        `${i+1}. "${a.title}" (${a.source}) — ${a.groqSummary || a.description?.substring(0, 100) || ''}`
    ).join('\n');

    const prompt = `Write a LinkedIn post based on today's top AI/tech news. The post should position the author as someone who stays on top of the industry.

Today's articles:
${articleList}

Rules:
- Start with a strong hook line (question or bold statement) — NO emoji
- Then a line break
- Then 4-6 short bullet points with the key stories (use plain dash -, no emoji)
- Then a line break
- End with a short takeaway or reflection (1-2 sentences, personal tone)
- Add 3-5 relevant hashtags on the last line
- Total length: 150-250 words
- Tone: insightful, professional, not salesy
- Do NOT use any emoji anywhere in the post
- Use plain text only (no markdown, no bold, no asterisks)`;

    try {
        const post = await callLLM(prompt, { max_tokens: 600, temperature: 0.7 });

        try {
            await navigator.clipboard.writeText(post);
            showToast('LinkedIn post copied!');
        } catch (e) {
            const ta = document.createElement('textarea');
            ta.value = post;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
            showToast('LinkedIn post copied!');
        }
    } catch (e) {
        showToast('Failed to generate post');
    }

    if (btn) {
        btn.disabled = false;
        btn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 8px;">
                <path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-4 0v7h-4v-7a6 6 0 016-6zM2 9h4v12H2zM4 6a2 2 0 100-4 2 2 0 000 4z"/>
            </svg>
            Copy as LinkedIn post`;
    }
}

// ==================== DISCOVERY HELPERS ====================

function getTopReadSources(limit) {
    const counts = {};
    articles.filter(a => a.read).forEach(a => {
        counts[a.source] = (counts[a.source] || 0) + 1;
    });
    return Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([source]) => source);
}

// ==================== SIDEBAR RESIZE ====================

function setupSidebarResize() {
    const handle = document.getElementById('sidebarResize');
    const sidebar = document.querySelector('.sidebar');
    if (!handle || !sidebar || isMobile) return;

    const saved = localStorage.getItem('sidebarWidth');
    if (saved) {
        const w = parseInt(saved);
        sidebar.style.width = w + 'px';
        sidebar.style.minWidth = w + 'px';
        document.documentElement.style.setProperty('--sidebar-width', w + 'px');
    }

    let dragging = false;

    handle.addEventListener('mousedown', (e) => {
        e.preventDefault();
        dragging = true;
        handle.classList.add('dragging');
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
    });

    document.addEventListener('mousemove', (e) => {
        if (!dragging) return;
        const w = Math.max(320, Math.min(700, e.clientX));
        sidebar.style.width = w + 'px';
        sidebar.style.minWidth = w + 'px';
        document.documentElement.style.setProperty('--sidebar-width', w + 'px');
    });

    document.addEventListener('mouseup', () => {
        if (!dragging) return;
        dragging = false;
        handle.classList.remove('dragging');
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        localStorage.setItem('sidebarWidth', parseInt(sidebar.style.width));
        saveProfileToSupabase().catch(() => {});
    });
}

// ==================== OPML IMPORT/EXPORT ====================

function exportOPML() {
    const allFeeds = [...DEFAULT_FEEDS, ...customFeeds];
    const escXml = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    const opml = `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
<head><title>Weft Feeds</title><dateCreated>${new Date().toUTCString()}</dateCreated></head>
<body>
${allFeeds.map(f => `  <outline text="${escXml(f.name)}" title="${escXml(f.name)}" xmlUrl="${escXml(f.url)}" type="rss" category="${escXml(f.category)}" />`).join('\n')}
</body>
</opml>`;

    const blob = new Blob([opml], { type: 'text/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'weft-feeds.opml';
    a.click();
    URL.revokeObjectURL(url);
    showToast('OPML exported');
}

function importOPML(input) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(e.target.result, 'text/xml');
            const outlines = doc.querySelectorAll('outline[xmlUrl]');

            const existingUrls = new Set([...DEFAULT_FEEDS, ...customFeeds].map(f => f.url));
            let added = 0;

            outlines.forEach(el => {
                const url = el.getAttribute('xmlUrl');
                const name = el.getAttribute('title') || el.getAttribute('text') || 'Unknown';

                if (url && !existingUrls.has(url)) {
                    customFeeds.push({ name, url, category: 'imported' });
                    existingUrls.add(url);
                    added++;
                }
            });

            if (added > 0) {
                localStorage.setItem('customFeeds', JSON.stringify(customFeeds));
                renderFeedManager();
                showToast(`Imported ${added} feed${added > 1 ? 's' : ''}`);
            } else {
                showToast('No new feeds found in OPML');
            }
        } catch (err) {
            showToast('Invalid OPML file');
            console.error('OPML import error:', err);
        }

        // Reset input so same file can be re-imported
        input.value = '';
    };
    reader.readAsText(file);
}

// Mobile navigation
function showMobileContent() {
    if (isMobile) {
        articleContent.classList.add('mobile-visible');
    }
}

function hideMobileContent() {
    articleContent.classList.remove('mobile-visible');
}

// ==================== THEME TOGGLE ====================

function setupThemeToggle() {
    const toggle = document.getElementById('themeToggle');
    if (!toggle) return;

    const saved = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', saved);
    updateThemeIcon(saved);

    toggle.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme') || 'dark';
        const next = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('theme', next);
        updateThemeIcon(next);
        saveProfileToSupabase().catch(() => {});
    });
}

function updateThemeIcon(theme) {
    const toggle = document.getElementById('themeToggle');
    if (!toggle) return;
    if (theme === 'light') {
        toggle.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>';
        toggle.title = 'Switch to dark mode';
    } else {
        toggle.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>';
        toggle.title = 'Switch to light mode';
    }
}
