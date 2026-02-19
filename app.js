// Weft — Pattern from noise (Web Version)
// Credits: Kristoffer Åström (idea), Johan Salo (implementation)

// Safe JSON parse from localStorage (prevents crash on corrupted data)
function safeParse(key, fallback) {
    try {
        const raw = localStorage.getItem(key);
        if (raw === null) return fallback;
        return JSON.parse(raw);
    } catch (e) {
        console.warn(`Corrupt localStorage key "${key}", resetting.`, e);
        localStorage.removeItem(key);
        return fallback;
    }
}

const DEFAULT_FEEDS = [
    // Tier 1: Daily News
    { name: 'The Rundown AI', url: 'https://rss.beehiiv.com/feeds/2R3C6Bt5wj.xml', category: 'daily' },
    { name: 'Hacker News', url: 'https://hnrss.org/frontpage', category: 'daily' },
    { name: 'Last Week in AI', url: 'https://lastweekin.ai/feed', category: 'daily' },
    { name: 'Import AI', url: 'https://importai.substack.com/feed', category: 'daily' },
    { name: 'The Batch', url: 'https://www.deeplearning.ai/the-batch/feed/', category: 'daily' },

    // Tier 2: Major Publications
    { name: 'MIT Tech Review', url: 'https://www.technologyreview.com/feed/', category: 'publication' },
    { name: 'Ars Technica', url: 'https://feeds.arstechnica.com/arstechnica/technology-lab', category: 'publication' },
    { name: 'The Verge AI', url: 'https://www.theverge.com/ai-artificial-intelligence/rss/index.xml', category: 'publication' },
    { name: 'Wired AI', url: 'https://www.wired.com/feed/tag/ai/latest/rss', category: 'publication' },
    { name: 'VentureBeat AI', url: 'https://venturebeat.com/category/ai/feed/', category: 'publication' },
    { name: 'TechCrunch AI', url: 'https://techcrunch.com/category/artificial-intelligence/feed/', category: 'publication' },

    // Tier 3: Thought Leaders (Substack - reliable feeds)
    { name: 'Ethan Mollick', url: 'https://www.oneusefulthing.org/feed', category: 'thought-leader' },
    { name: 'Gary Marcus', url: 'https://garymarcus.substack.com/feed', category: 'thought-leader' },
    { name: 'Zvi Mowshowitz', url: 'https://thezvi.substack.com/feed', category: 'thought-leader' },
    { name: 'Interconnects', url: 'https://www.interconnects.ai/feed', category: 'thought-leader' },

    // Tier 4: Design & UX
    { name: 'Jakob Nielsen', url: 'https://jakobnielsenphd.substack.com/feed', category: 'design' },
    { name: 'UX Collective', url: 'https://uxdesign.cc/feed', category: 'design' },
    { name: 'Nielsen Norman', url: 'https://www.nngroup.com/feed/rss/', category: 'design' },

    // Tier 5: Company Blogs & Research
    { name: 'OpenAI', url: 'https://openai.com/blog/rss/', category: 'company' },
    { name: 'Hugging Face', url: 'https://huggingface.co/blog/feed.xml', category: 'company' },
];

// Feed management: merge defaults with user customizations
let disabledFeeds = safeParse('disabledFeeds', []);
let customFeeds = safeParse('customFeeds', []);

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
let isMobile = window.innerWidth <= 900;
window.addEventListener('resize', () => { isMobile = window.innerWidth <= 900; });
let customStyles = safeParse('customStyles', {});
let settings = {
    provider: localStorage.getItem('llmProvider') || 'groq',
    apiKey: localStorage.getItem('apiKey') || '',
    useOwnKey: localStorage.getItem('useOwnKey') === 'true',
    summaryStyle: localStorage.getItem('summaryStyle') || 'newsletter',
    filterInterests: localStorage.getItem('filterInterests') || 'AI, machine learning, LLMs, generative AI, tech industry',
    filterThreshold: parseInt(localStorage.getItem('filterThreshold') || '6')
};

// Smart filter scores cache
let articleScores = safeParse('articleScores', {});

// Debounced localStorage save for articles (avoids excessive serialization)
let articleSaveTimer = null;
function saveArticlesDebounced() {
    clearTimeout(articleSaveTimer);
    articleSaveTimer = setTimeout(() => {
        localStorage.setItem('articles', JSON.stringify(articles));
    }, 300);
}

// Immediate save for critical changes (cache after fresh load)
function saveArticlesNow() {
    clearTimeout(articleSaveTimer);
    localStorage.setItem('articles', JSON.stringify(articles));
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

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadCustomStyles();
    loadSettings();
    loadArticles();
    setupEventListeners();
    setupSidebarResize();
    setupThemeToggle();
    setupKeyboardShortcuts();
});

function setupEventListeners() {
    refreshBtn.addEventListener('click', () => loadArticles(true));
    settingsBtn.addEventListener('click', openSettings);
    closeSettings.addEventListener('click', () => settingsModal.classList.remove('open'));
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

    // Keyboard support for article list (Enter/Space to select)
    articleList.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            const item = e.target.closest('.article-item');
            if (item) {
                e.preventDefault();
                const article = articles.find(a => a.id === item.dataset.id);
                if (article) showArticle(article);
            }
        }
    });

    // Add feed button
    document.getElementById('addFeedBtn').addEventListener('click', addCustomFeed);
}

// ==================== FEED MANAGER ====================

function renderFeedManager() {
    const container = document.getElementById('feedManager');
    const allFeeds = [...DEFAULT_FEEDS.map(f => ({ ...f, isDefault: true })), ...customFeeds.map(f => ({ ...f, isDefault: false }))];

    container.innerHTML = allFeeds.map(feed => {
        const enabled = !disabledFeeds.includes(feed.url);
        return `
            <div class="feed-item">
                <input type="checkbox" ${enabled ? 'checked' : ''} data-url="${escapeHTML(feed.url)}" onchange="toggleFeed(this)">
                <span class="feed-name">${escapeHTML(feed.name)}</span>
                <span class="feed-category">${escapeHTML(feed.category)}</span>
                ${!feed.isDefault ? `<button class="feed-remove" onclick="removeCustomFeed('${escapeJSString(feed.url)}')" title="Remove">&times;</button>` : ''}
            </div>
        `;
    }).join('');
}

function toggleFeed(checkbox) {
    const url = checkbox.dataset.url;
    if (checkbox.checked) {
        disabledFeeds = disabledFeeds.filter(u => u !== url);
    } else {
        disabledFeeds.push(url);
    }
    localStorage.setItem('disabledFeeds', JSON.stringify(disabledFeeds));
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
}

function removeCustomFeed(url) {
    customFeeds = customFeeds.filter(f => f.url !== url);
    disabledFeeds = disabledFeeds.filter(u => u !== url);
    localStorage.setItem('customFeeds', JSON.stringify(customFeeds));
    localStorage.setItem('disabledFeeds', JSON.stringify(disabledFeeds));
    renderFeedManager();
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
        showToast('Please enter a name for your custom style');
        return;
    }

    const prompt = promptTemplate.value.trim();
    if (!prompt) {
        showToast('Please enter a prompt template');
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

    showToast(`Style "${name}" saved`);
}

function deleteCustomStyle() {
    const style = summaryStyleSelect.value;
    if (!style.startsWith('custom_')) return;

    const name = style.replace('custom_', '');

    // Use a simple inline confirm via the settings modal
    showConfirmDialog(`Delete custom style "${name}"?`, () => {
        delete customStyles[name];
        localStorage.setItem('customStyles', JSON.stringify(customStyles));

        // Reload dropdown and select default
        loadCustomStyles();
        summaryStyleSelect.value = 'newsletter';
        onStyleChange();
        showToast(`Style "${name}" deleted`);
    });
}

let settingsListenersAttached = false;

function loadSettings() {
    document.getElementById('llmProvider').value = settings.provider;
    document.getElementById('apiKey').value = settings.apiKey;
    document.getElementById('filterInterests').value = settings.filterInterests;
    document.getElementById('filterThreshold').value = settings.filterThreshold;
    document.getElementById('thresholdValue').textContent = `${settings.filterThreshold}/10`;
    summaryStyleSelect.value = settings.summaryStyle;

    const useOwnKeyCheckbox = document.getElementById('useOwnKey');
    const ownKeyGroup = document.getElementById('ownKeyGroup');
    useOwnKeyCheckbox.checked = settings.useOwnKey;
    ownKeyGroup.style.display = settings.useOwnKey ? '' : 'none';

    // Only attach these listeners once
    if (!settingsListenersAttached) {
        useOwnKeyCheckbox.addEventListener('change', () => {
            ownKeyGroup.style.display = useOwnKeyCheckbox.checked ? '' : 'none';
        });

        document.getElementById('filterThreshold').addEventListener('input', (e) => {
            document.getElementById('thresholdValue').textContent = `${e.target.value}/10`;
        });

        settingsListenersAttached = true;
    }
}

function saveSettings() {
    settings.provider = document.getElementById('llmProvider').value;
    settings.apiKey = document.getElementById('apiKey').value;
    settings.useOwnKey = document.getElementById('useOwnKey').checked;
    settings.filterInterests = document.getElementById('filterInterests').value;
    settings.filterThreshold = parseInt(document.getElementById('filterThreshold').value);
    settings.summaryStyle = summaryStyleSelect.value;

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

    settingsModal.classList.remove('open');
    
    // Re-render articles with new threshold
    renderArticles();
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
        articles = safeParse('articles', []);
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
    if (!response.ok) {
        console.warn(`Feed ${feed.name}: HTTP ${response.status}`);
        return [];
    }

    const text = await response.text();
    const parser = new DOMParser();
    const xml = parser.parseFromString(text, 'text/xml');

    // Check for XML parse errors
    const parseError = xml.querySelector('parsererror');
    if (parseError) {
        console.warn(`Feed ${feed.name}: XML parse error`);
        return [];
    }

    // Check for RSS items or Atom entries
    let items = xml.querySelectorAll('item');
    const isAtom = items.length === 0;

    if (isAtom) {
        items = xml.querySelectorAll('entry');
    }

    const feedArticles = [];

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

        feedArticles.push({
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

    return feedArticles;
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

        return `
            <div class="article-item ${article.id === currentArticle?.id ? 'active' : ''} ${article.read ? 'read' : ''}" data-id="${article.id}" role="option" aria-selected="${article.id === currentArticle?.id}" tabindex="0">
                <div class="article-item-header">
                    <div class="article-tags">
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
let articleViewVersion = 0; // Guards against image loading race conditions

function trackReadTime() {
    if (currentArticle && articleViewStart) {
        const duration = Math.round((performance.now() - articleViewStart) / 1000);
        if (duration >= 5) {
            // Save read time per article
            const readTimes = safeParse('readTimes', {});
            readTimes[currentArticle.id] = {
                seconds: duration,
                source: currentArticle.source,
                keywords: currentArticle.keywords || [],
                ts: Date.now()
            };
            localStorage.setItem('readTimes', JSON.stringify(readTimes));
        }
    }
}

function showArticle(article) {
    // Track time spent on previous article
    trackReadTime();
    articleViewStart = performance.now();

    currentArticle = article;
    article.read = true;

    // Save read state (debounced - frequent during navigation)
    saveArticlesDebounced();

    // Update sidebar
    document.querySelectorAll('.article-item').forEach(item => {
        item.classList.toggle('active', item.dataset.id === article.id);
    });

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
                <button class="action-btn" onclick="shareArticle(currentArticle)" title="Share">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98"/>
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
                        <button class="btn-secondary copy-btn" onclick="copySummary()" style="margin-top: 12px;">
                            Copy Summary
                        </button>
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
    const thisViewVersion = ++articleViewVersion;
    fetchOGImage(article.link).then(async imageUrl => {
        // Abort if user navigated to a different article
        if (articleViewVersion !== thisViewVersion) return;

        const imageContainer = document.getElementById('articleImage');
        if (!imageContainer) return;

        if (!imageUrl) {
            imageUrl = await fetchGeminiImage(article.title, article.keywords);
        }

        // Re-check after async fallback
        if (articleViewVersion !== thisViewVersion) return;

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
        saveArticlesDebounced();
        showArticle(article);
    }
}

function toggleDislike(id) {
    const article = articles.find(a => a.id === id);
    if (article) {
        article.disliked = !article.disliked;
        if (article.disliked) article.liked = false;
        saveArticlesDebounced();
        showArticle(article);
    }
}

function toggleBookmark(id) {
    const article = articles.find(a => a.id === id);
    if (article) {
        article.bookmarked = !article.bookmarked;
        saveArticlesDebounced();
        showToast(article.bookmarked ? 'Bookmarked' : 'Bookmark removed');
        showArticle(article);
        renderArticles();
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
        showToast('Set your API key in Settings, or uncheck "Use my own API key"');
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
            saveArticlesNow();
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
        saveArticlesNow();

        // 3. Save to server cache (fire-and-forget)
        fetch('/api/summary-cache', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, style, summary })
        }).catch(() => {});

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

    const batchList = batch.map((a, i) =>
        `[${i}] ${a.title} (${a.source})`
    ).join('\n');

    // Build preference context from implicit feedback
    let prefContext = '';
    const readTimes = safeParse('readTimes', {});
    const entries = Object.values(readTimes);
    if (entries.length >= 5) {
        const engaged = entries.filter(e => e.seconds >= 30);
        const sourceCounts = {};
        const kwCounts = {};
        engaged.forEach(e => {
            sourceCounts[e.source] = (sourceCounts[e.source] || 0) + 1;
            (e.keywords || []).forEach(k => { kwCounts[k] = (kwCounts[k] || 0) + 1; });
        });
        const topSources = Object.entries(sourceCounts).sort((a,b) => b[1]-a[1]).slice(0,3).map(e => e[0]);
        const topKw = Object.entries(kwCounts).sort((a,b) => b[1]-a[1]).slice(0,5).map(e => e[0]);
        if (topSources.length > 0) {
            prefContext = `\nUser reading patterns: prefers ${topSources.join(', ')}. Frequent topics: ${topKw.join(', ')}. Boost these slightly (max +1).`;
        }
    }

    const prompt = `You are a news relevance filter. Score these articles 1-10 for someone interested in: ${filterInterests}${prefContext}

${batchList}

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
            articleScores[article.id] = scored.s;
            article.groqSummary = scored.t;
            article.scoreReason = scored.r;
        }
    });

    localStorage.setItem('articleScores', JSON.stringify(articleScores));
    saveArticlesNow();
    console.log(`✅ Scored ${result.articles.length} articles`);
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

// Toast notification
function showToast(message) {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 2200);
}

// Confirm dialog (replaces native confirm())
function showConfirmDialog(message, onConfirm) {
    const overlay = document.createElement('div');
    overlay.className = 'confirm-overlay';
    overlay.innerHTML = `
        <div class="confirm-dialog">
            <p>${escapeHTML(message)}</p>
            <div class="confirm-actions">
                <button class="btn-secondary confirm-cancel">Cancel</button>
                <button class="btn-primary confirm-ok" style="background:var(--danger);">Delete</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);

    overlay.querySelector('.confirm-cancel').addEventListener('click', () => overlay.remove());
    overlay.querySelector('.confirm-ok').addEventListener('click', () => {
        overlay.remove();
        onConfirm();
    });
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.remove();
    });
}

// Score badge helper
function getScoreBadgeClass(score) {
    if (score >= 8) return 'score-badge--high';
    if (score >= 6) return 'score-badge--mid';
    if (score >= 4) return 'score-badge--low';
    return 'score-badge--min';
}

// ==================== SHARE ====================

async function shareArticle(article) {
    if (!article) return;
    const summary = article.summary || article.groqSummary || '';
    const score = articleScores[article.id];

    const text = [
        article.title,
        '',
        summary ? `AI Summary:\n${summary}` : '',
        score ? `Relevance: ${score}/10` : '',
        '',
        article.link,
        '',
        'Shared via Weft (weft-web.vercel.app)'
    ].filter(Boolean).join('\n');

    if (navigator.share) {
        try {
            await navigator.share({ title: article.title, text: text, url: article.link });
            return;
        } catch (e) {
            if (e.name === 'AbortError') return;
        }
    }

    try {
        await navigator.clipboard.writeText(text);
        showToast('Copied to clipboard');
    } catch (e) {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        showToast('Copied to clipboard');
    }
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

    const briefingList = topArticles.map((a, i) => {
        const score = articleScores[a.id] || '?';
        return `[${i+1}] "${a.title}" (${a.source}, score: ${score}/10)\n    ${a.description?.substring(0, 150) || ''}`;
    }).join('\n\n');

    const prompt = `You are a senior tech news analyst writing a daily briefing.

Today's top ${topArticles.length} articles (scored by AI relevance):

${briefingList}

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

// ==================== KEYBOARD SHORTCUTS ====================

function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Skip if user is typing in an input/textarea/select
        const tag = e.target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

        // Skip if modal is open
        if (settingsModal.classList.contains('open')) {
            if (e.key === 'Escape') settingsModal.classList.remove('open');
            return;
        }

        switch (e.key) {
            case 'j': // Next article
            case 'ArrowDown': {
                e.preventDefault();
                navigateArticle(1);
                break;
            }
            case 'k': // Previous article
            case 'ArrowUp': {
                e.preventDefault();
                navigateArticle(-1);
                break;
            }
            case 'Enter': { // Open selected article
                if (currentArticle) {
                    showArticle(currentArticle);
                }
                break;
            }
            case 'b': { // Toggle bookmark
                if (currentArticle) {
                    toggleBookmark(currentArticle.id);
                }
                break;
            }
            case 'o': { // Open original
                if (currentArticle) {
                    window.open(currentArticle.link, '_blank', 'noopener,noreferrer');
                }
                break;
            }
            case 'r': { // Refresh feeds
                loadArticles(true);
                break;
            }
            case '/': { // Focus search
                e.preventDefault();
                searchInput.focus();
                break;
            }
            case 'Escape': { // Go back (mobile) or deselect
                if (isMobile && articleContent.classList.contains('mobile-visible')) {
                    hideMobileContent();
                }
                break;
            }
            case '?': { // Show keyboard shortcuts help
                showToast('Keys: j/k navigate, Enter open, b bookmark, o original, r refresh, / search');
                break;
            }
        }
    });
}

function navigateArticle(direction) {
    const filter = document.querySelector('.filter-btn.active')?.dataset.filter || 'smart';
    if (filter === 'briefing') return;

    const visibleItems = [...document.querySelectorAll('.article-item')];
    if (visibleItems.length === 0) return;

    const currentIndex = visibleItems.findIndex(item => item.dataset.id === currentArticle?.id);
    const nextIndex = Math.max(0, Math.min(visibleItems.length - 1, currentIndex + direction));

    const nextItem = visibleItems[nextIndex];
    if (nextItem) {
        const article = articles.find(a => a.id === nextItem.dataset.id);
        if (article) {
            showArticle(article);
            nextItem.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
    }
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
