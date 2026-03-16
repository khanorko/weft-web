import { checkRateLimit, getClientIp, rejectIfLimited, cleanStore } from './_rate-limit.js';

const ALLOWED_MODELS = [
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
];

const MAX_TOKENS_LIMIT = 4000;
const RATE_LIMIT = 20;          // requests per window
const RATE_WINDOW = 60 * 1000;  // 1 minute

export default async function handler(req, res) {
  // CORS — only allow same origin and the app domain
  const origin = req.headers['origin'] || '';
  const allowedOrigins = ['https://weft.news', 'https://weft-web.vercel.app'];
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Rate limiting: 20 LLM calls per IP per minute
  const ip = getClientIp(req);
  cleanStore('groq', RATE_WINDOW);
  const rl = checkRateLimit('groq', ip, RATE_LIMIT, RATE_WINDOW);
  if (rejectIfLimited(res, rl)) return;

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: 'Service temporarily unavailable' });
  }

  const { model, messages, max_tokens, temperature } = req.body || {};

  // Validate model
  if (!model || !ALLOWED_MODELS.includes(model)) {
    return res.status(400).json({ error: `Invalid model. Allowed: ${ALLOWED_MODELS.join(', ')}` });
  }

  // Validate messages
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > 10) {
    return res.status(400).json({ error: 'Messages must be an array of 1-10 items' });
  }

  for (const msg of messages) {
    if (!msg.role || !msg.content || typeof msg.content !== 'string') {
      return res.status(400).json({ error: 'Each message must have role and content (string)' });
    }
    if (msg.content.length > 50000) {
      return res.status(400).json({ error: 'Message content too long (max 50000 chars)' });
    }
    if (!['user', 'assistant', 'system'].includes(msg.role)) {
      return res.status(400).json({ error: 'Invalid message role' });
    }
  }

  // Build sanitized body
  const body = {
    model,
    messages: messages.map(m => ({ role: m.role, content: m.content })),
    max_tokens: Math.min(Number(max_tokens) || 400, MAX_TOKENS_LIMIT),
  };

  if (typeof temperature === 'number') {
    body.temperature = Math.max(0, Math.min(2, temperature));
  }

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to reach Groq API' });
  }
}
