const fs = require('fs');
const path = require('path');

// One client for every AI feature, using the Ollama chat API (same setup as Ekagra).
//   Ollama Cloud (default): AI_API_URL=https://ollama.com/api/chat  AI_API_KEY=<key from ollama.com/settings/keys>
//   Local Ollama:           AI_API_URL=http://localhost:11434/api/chat  (no key needed)
// Pick models from https://ollama.com/search?c=cloud — AI_VISION_MODEL must accept images.
const AI_API_URL = process.env.AI_API_URL || 'https://ollama.com/api/chat';
const AI_API_KEY = process.env.AI_API_KEY || '';
const AI_MODEL = process.env.AI_MODEL || 'gpt-oss:20b';
const AI_VISION_MODEL = process.env.AI_VISION_MODEL || 'gemma4:31b';
const AI_TIMEOUT_MS = Number(process.env.AI_TIMEOUT_MS) || 180000;

const isLocalUrl = /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/)/i.test(AI_API_URL);
// Hosted APIs need a key; a local Ollama does not. AI_ENABLED=false turns everything off.
const AI_ENABLED = process.env.AI_ENABLED !== 'false' && Boolean(AI_API_KEY || isLocalUrl);

class AIUnavailableError extends Error {
  constructor(message) {
    super(message);
    this.status = 503;
  }
}

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const uploadsDir = path.join(__dirname, '..', 'uploads');
const IMAGE_EXT = /\.(jpe?g|png|webp)$/i;

const isPdf = (url) => typeof url === 'string' && /\.pdf($|\?)/i.test(url);

// Ask Cloudinary for a smaller copy; vision models are slow on full-size photos.
const shrinkCloudinaryUrl = (url) =>
  url.replace('/image/upload/', '/image/upload/w_1024,c_limit,q_auto/');

// Turns a stored upload URL into a base64 image for the model. Only URLs this backend
// produced are read: Cloudinary (https) or files in our own uploads folder.
// Returns null for PDFs, unsupported types or anything unreadable.
async function imageFromUrl(url) {
  if (!url || isPdf(url)) return null;
  try {
    const parsed = new URL(url);

    if (parsed.pathname.startsWith('/uploads/')) {
      const filename = path.basename(decodeURIComponent(parsed.pathname));
      const filePath = path.join(uploadsDir, filename);
      if (!IMAGE_EXT.test(filename) || !fs.existsSync(filePath)) return null;
      const data = fs.readFileSync(filePath);
      return data.length > MAX_IMAGE_BYTES ? null : data.toString('base64');
    }

    if (parsed.protocol !== 'https:' || parsed.hostname !== 'res.cloudinary.com') return null;
    const res = await fetch(shrinkCloudinaryUrl(url));
    const type = (res.headers.get('content-type') || '').toLowerCase();
    if (!res.ok || !/image\/(jpeg|png|webp)/.test(type)) return null;
    const data = Buffer.from(await res.arrayBuffer());
    return data.length > MAX_IMAGE_BYTES ? null : data.toString('base64');
  } catch (error) {
    console.warn('AI: could not load image', url, error.message);
    return null;
  }
}

// Sends one request to the Ollama chat API and returns the assistant message
// ({ role, content, tool_calls? }). Throws AIUnavailableError with a readable reason.
async function chat({ model = AI_MODEL, messages, tools, format }) {
  if (!AI_ENABLED) {
    throw new AIUnavailableError('AI is not configured. Set AI_API_KEY in backend/.env.');
  }

  let response;
  try {
    response = await fetch(AI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(AI_API_KEY ? { Authorization: `Bearer ${AI_API_KEY}` } : {})
      },
      body: JSON.stringify({ model, messages, tools, format, stream: false }),
      signal: AbortSignal.timeout(AI_TIMEOUT_MS)
    });
  } catch (error) {
    if (error.name === 'TimeoutError') throw new AIUnavailableError('AI took too long to answer. Try again.');
    throw new AIUnavailableError('Could not reach the AI provider.');
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    console.error(`AI provider returned ${response.status}:`, detail.slice(0, 300));
    if (response.status === 401 || response.status === 403) {
      throw new AIUnavailableError('AI API key is missing or invalid.');
    }
    if (response.status === 404) {
      throw new AIUnavailableError(`AI model "${model}" was not found. Check AI_MODEL / AI_VISION_MODEL.`);
    }
    if (response.status === 429) {
      throw new AIUnavailableError('AI is busy right now (rate limit). Try again in a moment.');
    }
    throw new AIUnavailableError(`AI provider returned ${response.status}.`);
  }

  const data = await response.json();
  if (!data?.message) throw new AIUnavailableError('AI provider sent an unexpected response.');
  return data.message;
}

// Strips reasoning some models inline in their reply.
const cleanText = (text) => String(text || '').replace(/<think>[\s\S]*?<\/think>/g, '').trim();

// Pulls the first JSON object out of a model reply (tolerates ```json fences and chatter).
function parseJSON(text) {
  const cleaned = cleanText(text).replace(/```(?:json)?/gi, '');
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return null;
  }
}

// Sends a prompt (plus optional base64 images) and returns the parsed JSON reply, or null.
async function askJSON({ system, prompt, images = [] }) {
  const message = await chat({
    model: images.length ? AI_VISION_MODEL : AI_MODEL,
    format: 'json',
    messages: [
      { role: 'system', content: `${system}\nReply with a single JSON object only, no other text.` },
      { role: 'user', content: prompt, ...(images.length ? { images } : {}) }
    ]
  });
  return parseJSON(message.content);
}

module.exports = {
  AI_ENABLED,
  AI_MODEL,
  AI_VISION_MODEL,
  AIUnavailableError,
  chat,
  askJSON,
  cleanText,
  imageFromUrl,
  isPdf
};
