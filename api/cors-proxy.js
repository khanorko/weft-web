const MAX_RESPONSE_SIZE = 5 * 1024 * 1024; // 5MB max response
const MAX_REDIRECTS = 5;
const ALLOWED_ORIGINS = ['https://weft-web.vercel.app'];

function isPrivateHostname(hostname) {
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '0.0.0.0' ||
    hostname === '[::1]' ||
    hostname === '::1' ||
    hostname.startsWith('10.') ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(hostname) ||
    hostname.startsWith('192.168.') ||
    hostname.startsWith('169.254.') ||
    hostname.endsWith('.internal') ||
    hostname.endsWith('.local')
  );
}

function validateUrl(urlStr) {
  let parsed;
  try {
    parsed = new URL(urlStr);
  } catch {
    return null;
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return null;
  }

  if (isPrivateHostname(parsed.hostname)) {
    return null;
  }

  return parsed;
}

export default async function handler(req, res) {
  // Restrict to same-origin or allowed origins (allow localhost for dev)
  const origin = req.headers.origin || req.headers.referer || '';
  const isAllowed = !origin || ALLOWED_ORIGINS.some(o => origin.startsWith(o)) || origin.startsWith('http://localhost');
  if (!isAllowed) {
    return res.status(403).json({ error: 'Origin not allowed' });
  }

  const url = req.query.url;
  if (!url) {
    return res.status(400).json({ error: 'Missing url parameter' });
  }

  const parsed = validateUrl(url);
  if (!parsed) {
    return res.status(400).json({ error: 'Invalid or disallowed URL' });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    // Follow redirects manually to validate each target
    let currentUrl = url;
    let response;
    for (let i = 0; i <= MAX_REDIRECTS; i++) {
      response = await fetch(currentUrl, {
        headers: {
          'User-Agent': 'Weft/1.0 RSS Reader',
          'Accept': 'application/rss+xml, application/xml, text/xml, */*',
        },
        signal: controller.signal,
        redirect: 'manual',
      });

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location');
        if (!location) break;

        // Resolve relative redirects
        const redirectUrl = new URL(location, currentUrl).toString();
        const validatedRedirect = validateUrl(redirectUrl);
        if (!validatedRedirect) {
          clearTimeout(timeout);
          return res.status(403).json({ error: 'Redirect to disallowed URL blocked' });
        }
        currentUrl = redirectUrl;
        if (i === MAX_REDIRECTS) {
          clearTimeout(timeout);
          return res.status(400).json({ error: 'Too many redirects' });
        }
        continue;
      }
      break;
    }

    clearTimeout(timeout);

    // Check Content-Length if available
    const contentLength = parseInt(response.headers.get('content-length') || '0', 10);
    if (contentLength > MAX_RESPONSE_SIZE) {
      return res.status(413).json({ error: 'Response too large' });
    }

    const text = await response.text();
    if (text.length > MAX_RESPONSE_SIZE) {
      return res.status(413).json({ error: 'Response too large' });
    }

    const allowedOrigin = origin && origin.startsWith('http://localhost') ? origin : 'https://weft-web.vercel.app';
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Content-Type', response.headers.get('content-type') || 'text/xml');
    return res.status(200).send(text);
  } catch (error) {
    if (error.name === 'AbortError') {
      return res.status(504).json({ error: 'Request timed out' });
    }
    return res.status(500).json({ error: 'Failed to fetch URL' });
  }
}
