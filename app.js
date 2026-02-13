// Weft — Pattern from noise (Web Version)
// Credits: Kristoffer Åström (idea), Johan Salo (implementation)

const RSS_FEEDS = [
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

const CORS_PROXY = 'https://api.allorigins.win/raw?url=';

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
let customStyles = JSON.parse(localStorage.getItem('customStyles') || '{}');
let settings = {
    provider: localStorage.getItem('llmProvider') || 'groq',
    apiKey: localStorage.getItem('apiKey') || '',
    useOwnKey: localStorage.getItem('useOwnKey') === 'true',
    summaryStyle: localStorage.getItem('summaryStyle') || 'newsletter',
    filterInterests: localStorage.getItem('filterInterests') || 'AI, machine learning, LLMs, generative AI, tech industry',
    filterThreshold: parseInt(localStorage.getItem('filterThreshold') || '6')
};

// Smart filter scores cache
let articleScores = JSON.parse(localStorage.getItem('articleScores') || '{}');

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
});

function setupEventListeners() {
    refreshBtn.addEventListener('click', () => loadArticles(true));
    settingsBtn.addEventListener('click', openSettings);
    closeSettings.addEventListener('click', () => settingsModal.classList.remove('open'));
    saveSettingsBtn.addEventListener('click', saveSettings);
    searchInput.addEventListener('input', filterArticles);

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
    onStyleChange(); // Load current prompt
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
        articles = JSON.parse(cached);
        renderArticles();
        refreshBtn.classList.remove('loading');
        
        // Run smart filter on unscored articles
        runSmartFilter();
        return;
    }

    try {
        const allArticles = [];
        const feedPromises = RSS_FEEDS.map(feed =>
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
            <div class="article-item ${article.id === currentArticle?.id ? 'active' : ''} ${article.read ? 'read' : ''}" data-id="${article.id}">
                <div class="article-item-header">
                    <div class="article-tags">
                        ${article.keywords.slice(0, 2).map(k => `<span class="tag">${k}</span>`).join('')}
                    </div>
                    ${scoreBadge}
                </div>
                <h3>${article.title}</h3>
                ${article.groqSummary ? `<p class="groq-summary">${article.groqSummary}</p>` : ''}
                <div class="article-meta">
                    <span>${article.source}</span>
                    <span>${formatDate(article.date)}</span>
                    ${article.bookmarked ? '<span style="color: var(--accent);">★</span>' : ''}
                </div>
            </div>
        `;
    }).join('');

    articleCount.textContent = `${filtered.length} articles`;
}

function filterArticles() {
    renderArticles();
}

function showArticle(article) {
    currentArticle = article;
    article.read = true;

    // Save read state
    localStorage.setItem('articles', JSON.stringify(articles));

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
                ${article.keywords.map(k => `<span class="tag">${k}</span>`).join('')}
                ${score !== undefined ? `<span class="tag tag--score ${getScoreBadgeClass(score)}">⚡ ${score}/10</span>` : ''}
            </div>

            <h1>${article.title}</h1>

            <div class="meta">
                <span>${article.source}</span>
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
                <div style="flex:1"></div>
                <a href="${article.link}" target="_blank" class="btn-primary">Read Original</a>
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
                        <button class="btn-secondary copy-btn" onclick="copyToClipboard(\`${article.summary.replace(/`/g, '\\`').replace(/\n/g, '\\n')}\`)" style="margin-top: 12px;">
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
                <p>${article.description || 'No preview available. Click "Read Original" to view the full article.'}</p>
            </div>
        </div>
    `;

    // Show mobile content panel
    showMobileContent();

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
                        <span class="point-content">${whatMatch[1].trim()}</span>
                    </div>
                ` : ''}
                ${whyMatch ? `
                    <div class="summary-point">
                        <span class="point-label">Why it matters</span>
                        <span class="point-content">${whyMatch[1].trim()}</span>
                    </div>
                ` : ''}
                ${insightMatch ? `
                    <div class="key-insight">
                        <div class="key-insight-label">Key Insight</div>
                        <p>${insightMatch[1].trim()}</p>
                    </div>
                ` : ''}
            </div>
        `;
    }

    // Check for bullet points
    if (summary.includes('•') || summary.includes('-')) {
        const lines = summary.split(/\n/).filter(l => l.trim());
        const bullets = lines.map(line => {
            const cleaned = line.replace(/^[•\-\*]\s*/, '').trim();
            return cleaned ? `<li>${cleaned}</li>` : '';
        }).join('');
        return `<ul style="list-style: none; padding: 0; margin: 0;">${bullets}</ul>`;
    }

    // Default: just show as paragraph with better line breaks
    return `<p>${summary.replace(/\n\n/g, '</p><p style="margin-top: 12px;">').replace(/\n/g, '<br>')}</p>`;
}

function toggleLike(id) {
    const article = articles.find(a => a.id === id);
    if (article) {
        article.liked = !article.liked;
        if (article.liked) article.disliked = false;
        localStorage.setItem('articles', JSON.stringify(articles));
        showArticle(article);
    }
}

function toggleDislike(id) {
    const article = articles.find(a => a.id === id);
    if (article) {
        article.disliked = !article.disliked;
        if (article.disliked) article.liked = false;
        localStorage.setItem('articles', JSON.stringify(articles));
        showArticle(article);
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
    summaryContent.innerHTML = `
        <div class="loading-state">
            <div class="loading-dots"><span></span><span></span><span></span></div>
            <span>Generating summary...</span>
        </div>
    `;

    try {
        const prompt = getCurrentPrompt(article);
        const summary = await callLLM(prompt);
        article.summary = summary;

        // Save to cache
        localStorage.setItem('articles', JSON.stringify(articles));

        summaryContent.innerHTML = formatSummary(summary);
    } catch (error) {
        summaryContent.innerHTML = `
            <p style="color: var(--danger); margin-bottom: 16px;">Error: ${error.message}</p>
            <button class="btn-primary generate-btn" onclick="generateSummary('${article.id}')">Try Again</button>
        `;
    }
}

async function callLLM(prompt) {
    // Use proxy (shared key) unless user has their own key
    if (!settings.useOwnKey || !settings.apiKey) {
        return callGroqProxy({
            model: 'llama-3.3-70b-versatile',
            max_tokens: 400,
            messages: [{ role: 'user', content: prompt }]
        });
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

    if (settings.provider === 'anthropic') {
        const response = await fetch(config.url, {
            method: 'POST',
            headers: { ...config.headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: config.model,
                max_tokens: 400,
                messages: [{ role: 'user', content: prompt }]
            })
        });
        const data = await response.json();
        if (data.error) throw new Error(data.error.message);
        return data.content[0].text;
    } else {
        const response = await fetch(config.url, {
            method: 'POST',
            headers: { ...config.headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: config.model,
                max_tokens: 400,
                messages: [{ role: 'user', content: prompt }]
            })
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
    // Get unscored articles
    const unscored = articles.filter(a => articleScores[a.id] === undefined).slice(0, 20);
    if (unscored.length === 0) return;

    console.log(`🔍 Smart filtering ${unscored.length} articles...`);

    const articleListText = unscored.map((a, i) => `[${i}] ${a.title}\n${a.description?.slice(0, 150) || ''}`).join('\n\n');

    const prompt = `You are a news relevance filter. Analyze these articles for someone interested in: ${settings.filterInterests}

For each article, return:
- score: 1-10 (10 = must read, 1 = irrelevant/spam)
- summary: One sentence TL;DR

ARTICLES:
${articleListText}

Respond with ONLY valid JSON in this exact format:
{"articles": [{"index": 0, "score": 7, "summary": "..."}, ...]}`;

    try {
        const text = await callGroqProxy({
            model: 'llama-3.1-8b-instant',
            max_tokens: 2000,
            temperature: 0.3,
            messages: [{ role: 'user', content: prompt }]
        });
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('No JSON in response');
        
        const result = JSON.parse(jsonMatch[0]);
        
        result.articles.forEach(r => {
            if (r.index < unscored.length) {
                const article = unscored[r.index];
                articleScores[article.id] = r.score;
                article.groqSummary = r.summary;
            }
        });
        
        localStorage.setItem('articleScores', JSON.stringify(articleScores));
        localStorage.setItem('articles', JSON.stringify(articles));
        console.log(`✅ Smart filtered ${result.articles.length} articles`);
        renderArticles();
    } catch (error) {
        console.error('Smart filter error:', error);
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

// Mobile navigation
function showMobileContent() {
    if (isMobile) {
        articleContent.classList.add('mobile-visible');
    }
}

function hideMobileContent() {
    articleContent.classList.remove('mobile-visible');
}
