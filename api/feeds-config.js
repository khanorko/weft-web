// Shared feed configuration — used by feed-fetch.js (server) and articles.js
// Mirrors the CATEGORIES object in app.js. Keep in sync when adding feeds.

export const CATEGORIES = {
    tech: {
        label: 'Tech & AI',
        feeds: [
            { name: 'The Rundown AI',    url: 'https://rss.beehiiv.com/feeds/2R3C6Bt5wj.xml' },
            { name: 'Last Week in AI',   url: 'https://lastweekin.ai/feed' },
            { name: 'Import AI',         url: 'https://importai.substack.com/feed' },
            { name: 'The Batch',         url: 'https://www.deeplearning.ai/the-batch/feed/' },
            { name: 'TLDR AI',           url: 'https://tldr.tech/ai/rss' },
            { name: 'Hacker News',       url: 'https://hnrss.org/frontpage' },
            { name: 'MIT Tech Review',   url: 'https://www.technologyreview.com/feed/' },
            { name: 'Ars Technica',      url: 'https://feeds.arstechnica.com/arstechnica/technology-lab' },
            { name: 'The Verge AI',      url: 'https://www.theverge.com/ai-artificial-intelligence/rss/index.xml' },
            { name: 'Wired AI',          url: 'https://www.wired.com/feed/tag/ai/latest/rss' },
            { name: 'VentureBeat AI',    url: 'https://venturebeat.com/category/ai/feed/' },
            { name: 'TechCrunch AI',     url: 'https://techcrunch.com/category/artificial-intelligence/feed/' },
            { name: 'The Register',      url: 'https://www.theregister.com/headlines.atom' },
            { name: 'InfoQ',             url: 'https://feed.infoq.com/' },
            { name: 'Ethan Mollick',     url: 'https://www.oneusefulthing.org/feed' },
            { name: 'Gary Marcus',       url: 'https://garymarcus.substack.com/feed' },
            { name: 'Zvi Mowshowitz',    url: 'https://thezvi.substack.com/feed' },
            { name: 'Interconnects',     url: 'https://www.interconnects.ai/feed' },
            { name: 'Platformer',        url: 'https://www.platformer.news/rss' },
            { name: 'Benedict Evans',    url: 'https://www.ben-evans.com/benedictevans/rss.xml' },
            { name: 'OpenAI',            url: 'https://openai.com/blog/rss/' },
            { name: 'Anthropic',         url: 'https://www.anthropic.com/rss' },
            { name: 'Hugging Face',      url: 'https://huggingface.co/blog/feed.xml' },
            { name: 'Google DeepMind',   url: 'https://deepmind.google/blog/rss.xml' },
            { name: 'Meta AI',           url: 'https://ai.meta.com/blog/feed/' },
            { name: 'a16z',              url: 'https://a16z.com/feed/' },
        ]
    },
    world: {
        label: 'World',
        feeds: [
            { name: 'BBC World',           url: 'https://feeds.bbci.co.uk/news/world/rss.xml' },
            { name: 'Reuters Top News',    url: 'https://feeds.reuters.com/reuters/topNews' },
            { name: 'Al Jazeera',          url: 'https://www.aljazeera.com/xml/rss/all.xml' },
            { name: 'The Guardian World',  url: 'https://www.theguardian.com/world/rss' },
            { name: 'NPR News',            url: 'https://feeds.npr.org/1001/rss.xml' },
            { name: 'Deutsche Welle',      url: 'https://rss.dw.com/rdf/rss-en-all' },
            { name: 'France 24',           url: 'https://www.france24.com/en/rss' },
            { name: 'NYT World',           url: 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml' },
            { name: 'Foreign Policy',      url: 'https://foreignpolicy.com/feed/' },
            { name: 'The Economist',       url: 'https://www.economist.com/rss' },
            { name: 'Associated Press',    url: 'https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml' },
            { name: 'Axios World',         url: 'https://api.axios.com/feed/axios-world' },
        ]
    },
    business: {
        label: 'Business',
        feeds: [
            { name: 'Bloomberg Markets',    url: 'https://feeds.bloomberg.com/markets/news.rss' },
            { name: 'Bloomberg Technology', url: 'https://feeds.bloomberg.com/technology/news.rss' },
            { name: 'WSJ Business',         url: 'https://feeds.a.dj.com/rss/WSJcomUSBusiness.xml' },
            { name: 'Harvard Business Review', url: 'https://hbr.org/rss/all' },
            { name: 'Inc.',                 url: 'https://www.inc.com/rss/' },
            { name: 'Fast Company',         url: 'https://www.fastcompany.com/latest/rss' },
            { name: 'TechCrunch',           url: 'https://techcrunch.com/feed/' },
            { name: 'Axios Pro Rata',       url: 'https://api.axios.com/feed/axios-pro-rata' },
            { name: 'CNBC Business',        url: 'https://www.cnbc.com/id/10000664/device/rss/rss.html' },
            { name: 'Forbes',               url: 'https://www.forbes.com/real-time/feed2/' },
            { name: 'Quartz',               url: 'https://qz.com/feed' },
            { name: 'Business Insider',     url: 'https://feeds.businessinsider.com/custom/all' },
        ]
    },
    science: {
        label: 'Science',
        feeds: [
            { name: 'Nature',             url: 'https://www.nature.com/nature.rss' },
            { name: 'Science News',       url: 'https://www.sciencenews.org/feed' },
            { name: 'New Scientist',      url: 'https://www.newscientist.com/feed/home/' },
            { name: 'NASA Breaking News', url: 'https://www.nasa.gov/rss/dyn/breaking_news.rss' },
            { name: 'Scientific American',url: 'https://rss.sciam.com/Scientific-American-Global' },
            { name: 'Quanta Magazine',    url: 'https://api.quantamagazine.org/feed/' },
            { name: 'Phys.org',           url: 'https://phys.org/rss-feed/' },
            { name: 'Popular Science',    url: 'https://www.popsci.com/rss.xml' },
            { name: 'The Scientist',      url: 'https://www.the-scientist.com/rss/' },
            { name: 'Live Science',       url: 'https://www.livescience.com/feeds/all' },
            { name: 'EurekAlert',         url: 'https://www.eurekalert.org/rss.xml' },
            { name: 'Space.com',          url: 'https://www.space.com/feeds/all' },
        ]
    },
    politics: {
        label: 'Politics',
        feeds: [
            { name: 'Politico',               url: 'https://www.politico.com/rss/politicopicks.xml' },
            { name: 'The Hill',               url: 'https://thehill.com/feed/' },
            { name: 'The Atlantic Politics',  url: 'https://www.theatlantic.com/feed/channel/politics/' },
            { name: 'Vox',                    url: 'https://www.vox.com/rss/index.xml' },
            { name: 'Axios Politics',         url: 'https://api.axios.com/feed/axios-politics' },
            { name: 'BBC Politics',           url: 'https://feeds.bbci.co.uk/news/politics/rss.xml' },
            { name: 'The Guardian US Politics', url: 'https://www.theguardian.com/us-news/us-politics/rss' },
            { name: 'Mother Jones',           url: 'https://www.motherjones.com/feed/' },
            { name: 'Reason',                 url: 'https://reason.com/latest/feed/' },
            { name: 'RealClearPolitics',      url: 'https://www.realclearpolitics.com/index.xml' },
        ]
    },
    sports: {
        label: 'Sports',
        feeds: [
            { name: 'ESPN Top Stories', url: 'https://www.espn.com/espn/rss/news' },
            { name: 'BBC Sport',        url: 'https://feeds.bbci.co.uk/sport/rss.xml' },
            { name: 'Sports Illustrated', url: 'https://www.si.com/rss/si_topstories.rss' },
            { name: 'Yahoo Sports',     url: 'https://sports.yahoo.com/rss/' },
            { name: 'The Guardian Sport', url: 'https://www.theguardian.com/sport/rss' },
            { name: 'Bleacher Report',  url: 'https://bleacherreport.com/articles/feed' },
            { name: 'CBS Sports',       url: 'https://www.cbssports.com/rss/headlines/' },
            { name: 'Sporting News',    url: 'https://www.sportingnews.com/us/rss' },
            { name: 'NBC Sports',       url: 'https://nbcsports.com/rss' },
            { name: 'Sky Sports',       url: 'https://www.skysports.com/rss/12040' },
        ]
    },
    culture: {
        label: 'Culture',
        feeds: [
            { name: 'The New Yorker',       url: 'https://www.newyorker.com/feed/everything' },
            { name: 'Pitchfork',            url: 'https://pitchfork.com/rss/news/feed.xml' },
            { name: 'The Atlantic Culture', url: 'https://www.theatlantic.com/feed/channel/entertainment/' },
            { name: 'Rolling Stone',        url: 'https://www.rollingstone.com/feed/' },
            { name: 'Variety',              url: 'https://variety.com/feed/' },
            { name: 'Hollywood Reporter',   url: 'https://www.hollywoodreporter.com/feed/' },
            { name: 'Vulture',              url: 'https://www.vulture.com/rss/index.xml' },
            { name: 'AV Club',              url: 'https://www.avclub.com/rss' },
            { name: 'NPR Arts',             url: 'https://feeds.npr.org/1008/rss.xml' },
            { name: 'Arts & Letters Daily', url: 'https://www.aldaily.com/feed/' },
            { name: 'The Paris Review',     url: 'https://www.theparisreview.org/feed' },
            { name: 'Consequence',          url: 'https://consequence.net/feed/' },
        ]
    },
    design: {
        label: 'Design & UX',
        feeds: [
            { name: 'Jakob Nielsen',    url: 'https://jakobnielsenphd.substack.com/feed' },
            { name: 'UX Collective',    url: 'https://uxdesign.cc/feed' },
            { name: 'Nielsen Norman',   url: 'https://www.nngroup.com/feed/rss/' },
            { name: 'Smashing Magazine',url: 'https://www.smashingmagazine.com/feed/' },
            { name: 'A List Apart',     url: 'https://alistapart.com/main/feed/' },
            { name: 'CSS-Tricks',       url: 'https://css-tricks.com/feed/' },
            { name: 'Creative Bloq',    url: 'https://www.creativebloq.com/feed' },
            { name: 'Designmodo',       url: 'https://designmodo.com/feed/' },
            { name: 'Sidebar.io',       url: 'https://sidebar.io/feed.xml' },
            { name: 'Muzli Design',     url: 'https://medium.muz.li/feed' },
        ]
    },

    americas: {
        label: 'Americas',
        feeds: [
            { name: 'CBC News',             url: 'https://www.cbc.ca/cmlink/rss-topstories' },
            { name: 'The Globe and Mail',   url: 'https://www.theglobeandmail.com/rss/article/category/news/' },
            { name: 'Buenos Aires Herald',  url: 'https://buenosairesherald.com/feed/' },
            { name: 'Merco Press',          url: 'https://en.mercopress.com/rss.xml' },
            { name: 'Rio Times Online',     url: 'https://riotimesonline.com/feed/' },
            { name: 'Tico Times',           url: 'https://ticotimes.net/feed' },
            { name: 'Global Voices Americas', url: 'https://globalvoices.org/category/world/americas/feed/' },
            { name: 'Latin America Reports', url: 'https://www.latinamericareports.com/feed/' },
        ]
    },

    europe: {
        label: 'Europe',
        feeds: [
            { name: 'EURACTIV',             url: 'https://www.euractiv.com/feed/' },
            { name: 'Der Spiegel Intl',     url: 'https://www.spiegel.de/international/index.rss' },
            { name: 'Politico EU',          url: 'https://www.politico.eu/rss' },
            { name: 'EUobserver',           url: 'https://euobserver.com/articles.rss' },
            { name: 'Balkan Insight',       url: 'https://balkaninsight.com/feed/' },
            { name: 'The Local',            url: 'https://www.thelocal.com/feed/' },
            { name: 'Irish Times',          url: 'https://www.irishtimes.com/rss/' },
            { name: 'Emerging Europe',      url: 'https://emerging-europe.com/feed/' },
        ]
    },

    asia: {
        label: 'Asia',
        feeds: [
            { name: 'NHK World',            url: 'https://www3.nhk.or.jp/rss/news/cat0.xml' },
            { name: 'The Hindu',            url: 'https://www.thehindu.com/feeder/default.rss' },
            { name: 'Nikkei Asia',          url: 'https://asia.nikkei.com/rss/feed/nar' },
            { name: 'Korea JoongAng Daily', url: 'https://koreajoongangdaily.joins.com/rss/feed' },
            { name: 'The Jakarta Post',     url: 'https://www.thejakartapost.com/feed/' },
            { name: 'VnExpress Intl',       url: 'https://e.vnexpress.net/rss/news/latest.rss' },
            { name: 'Asia Times',           url: 'https://asiatimes.com/feed/' },
            { name: 'Global Voices Asia',   url: 'https://globalvoices.org/category/world/east-asia/feed/' },
        ]
    },

    mideast: {
        label: 'Middle East',
        feeds: [
            { name: 'Arab News',            url: 'https://www.arabnews.com/rss.xml' },
            { name: 'Middle East Eye',      url: 'https://www.middleeasteye.net/rss' },
            { name: 'The Times of Israel',  url: 'https://www.timesofisrael.com/feed/' },
            { name: 'Al-Monitor',           url: 'https://www.al-monitor.com/rss.xml' },
            { name: 'Jerusalem Post',       url: 'https://www.jpost.com/Rss' },
            { name: 'Daily Sabah',          url: 'https://www.dailysabah.com/rss' },
            { name: 'Iran International',   url: 'https://www.iranintl.com/en/rss' },
        ]
    },

    africa: {
        label: 'Africa',
        feeds: [
            { name: 'Daily Maverick',       url: 'https://www.dailymaverick.co.za/feed/' },
            { name: 'Mail & Guardian',      url: 'https://mg.co.za/feed/' },
            { name: 'The East African',     url: 'https://www.theeastafrican.co.ke/tea/feed' },
            { name: 'Punch Nigeria',        url: 'https://punchng.com/feed/' },
            { name: 'The Africa Report',    url: 'https://www.theafricareport.com/feed/' },
            { name: 'RFI Africa',           url: 'https://www.rfi.fr/en/africa/rss' },
            { name: 'AllAfrica',            url: 'https://allafrica.com/tools/headlines/rdf/latest/headlines.rdf' },
            { name: 'Global Voices Africa', url: 'https://globalvoices.org/category/world/sub-saharan-africa/feed/' },
        ]
    },
};

// Flat list: [{ name, url, category }]
export const ALL_FEEDS = Object.entries(CATEGORIES).flatMap(([catKey, cat]) =>
    cat.feeds.map(f => ({ name: f.name, url: f.url, category: catKey }))
);
