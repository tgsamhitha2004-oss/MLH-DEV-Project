import 'dotenv/config';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleAuth } from 'google-auth-library';

const root = fileURLToPath(new URL('.', import.meta.url));
const port = Number(process.env.PORT || 3000);
const googleProject = process.env.GOOGLE_CLOUD_PROJECT || process.env.GEMINI_PROJECT_ID;
const model = process.env.GEMMA_MODEL || 'gemma-4-26b-a4b-it';
const googleAuth = new GoogleAuth({
  scopes: [
    'https://www.googleapis.com/auth/cloud-platform',
    'https://www.googleapis.com/auth/generative-language.retriever',
  ],
});
const maxImageBytes = 10 * 1024 * 1024;
const maxRequestBytes = 15 * 1024 * 1024;
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml' };

function reply(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
}

async function parseBody(req) {
  const chunks = [];
  let bytes = 0;
  for await (const chunk of req) {
    bytes += chunk.length;
    if (bytes > maxRequestBytes) throw Object.assign(new Error('Request is too large. Choose a smaller photo.'), { status: 413 });
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw Object.assign(new Error('The request could not be read. Try again.'), { status: 400 }); }
}

function buildPrompt(description) {
  return `You are FixItLocal, a cautious home troubleshooting guide. Analyze the attached photo together with the user's description. Do not claim certainty from an image. Identify a visible component only when reasonably clear; if it is unclear, say so and ask for a model number. Prefer observation, simple reversible checks, and manufacturer manuals. Never instruct a user to open an electrical enclosure, handle live wiring, bypass a safety feature, mix chemicals, work on gas lines, or perform plumbing/electrical work that requires a licensed professional. Do not invent an error-code meaning, replacement part, or model-specific procedure. Avoid telling a user to buy parts before verifying the exact model. If the image or description indicates gas, smoke, fire, sparks, shock, or water near electrics, set risk to high and direct them to stop; for gas smell, smoke, or fire tell them to leave and contact emergency/utility services from a safe location. If they cannot safely proceed, recommend a qualified professional.

Return only a valid JSON object, no markdown, with exactly these fields: {"component":"short visible component or uncertain","summary":"what the photo seems to show and what remains uncertain","risk":"low|medium|high","safety":"specific safety warning and safe boundary","steps":["2 to 5 concise beginner-safe actions"],"parts":["only verified generic supplies or model info, otherwise empty array"],"time":"short estimate or STOP NOW","confidence":"plain language uncertainty label","proNote":"short handoff summary a user can show a professional"}. Keep every action grounded in the provided image and description. Do not state that the issue is fixed.

User description: ${description}`;
}

async function diagnose(req, res) {
  if (!googleProject) return reply(res, 503, { error: 'Google Cloud project is missing. Set GOOGLE_CLOUD_PROJECT in .env.' });
  const data = await parseBody(req);
  if (typeof data.description !== 'string' || data.description.trim().length < 3 || data.description.length > 500) return reply(res, 400, { error: 'Add a short description of what happened (up to 500 characters).' });
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(data.mimeType)) return reply(res, 415, { error: 'Choose a JPG, PNG or WEBP photo.' });
  if (typeof data.image !== 'string' || data.image.length > Math.ceil(maxImageBytes * 4 / 3) + 16) return reply(res, 413, { error: 'That photo is over 10 MB. Choose a smaller image.' });
  let imageBytes;
  try { imageBytes = Buffer.from(data.image, 'base64'); }
  catch { return reply(res, 400, { error: 'Could not read that photo. Try another image.' }); }
  if (!imageBytes.length || imageBytes.length > maxImageBytes) return reply(res, 413, { error: 'That photo is over 10 MB. Choose a smaller image.' });

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  let upstream;
  try {
    const authClient = await googleAuth.getClient();
    const authHeaders = new Headers(await authClient.getRequestHeaders(endpoint));
    authHeaders.set('Content-Type', 'application/json');
    authHeaders.set('x-goog-user-project', googleProject);
    upstream = await fetch(endpoint, {
      method: 'POST', headers: authHeaders,
      body: JSON.stringify({
        contents: [{ parts: [{ text: buildPrompt(data.description.trim()) }, { inlineData: { mimeType: data.mimeType, data: data.image } }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 1200 },
      }),
      signal: AbortSignal.timeout(60000),
    });
  } catch (error) {
    if (error.code === 'ENOENT' || /default credentials|credentials were not found|could not load the default credentials/i.test(error.message || '')) {
      return reply(res, 503, { error: 'Google ADC credentials were not found. Set them up with gcloud auth application-default login, then restart the server.' });
    }
    return reply(res, 502, { error: error.name === 'TimeoutError' ? 'The visual check took too long. Please try again.' : 'Could not reach the Gemma service. Check your connection and try again.' });
  }
  const result = await upstream.json().catch(() => ({}));
  if (!upstream.ok) {
    const status = upstream.status;
    const message = status === 401 ? 'Google ADC authentication failed. Refresh your ADC login and try again.'
      : status === 403 ? 'Google denied this request. Check that the Generative Language API is enabled and your ADC identity can use it.'
        : status === 404 ? 'This Gemma model is unavailable to the current Google project.'
          : result.error?.message || 'The Gemma service could not complete the check.';
    return reply(res, status === 429 ? 429 : status === 401 || status === 403 ? 403 : 502, { error: message.slice(0, 300) });
  }
  const text = result.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('').trim();
  if (!text) return reply(res, 502, { error: 'Gemma returned no repair guidance. Please try a clearer photo.' });
  const jsonText = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  try {
    const parsed = JSON.parse(jsonText);
    return reply(res, 200, parsed);
  } catch {
    return reply(res, 502, { error: 'Gemma could not format a safe repair plan. Please try again with a clearer description.' });
  }
}

const server = createServer(async (req, res) => {
  if (req.method === 'POST' && req.url === '/api/diagnose') return diagnose(req, res).catch((error) => reply(res, error.status || 500, { error: error.status ? error.message : 'The repair check hit an unexpected issue. Please try again.' }));
  if (req.method !== 'GET' && req.method !== 'HEAD') return reply(res, 405, { error: 'Method not allowed.' });
  const rawPath = (req.url || '/').split('?')[0];
  let decoded;
  try { decoded = decodeURIComponent(rawPath); } catch { res.writeHead(400).end(); return; }
  const requested = decoded === '/' ? 'index.html' : decoded.replace(/^\/+/, '');
  const filePath = normalize(join(root, requested));
  if (!filePath.startsWith(root) || requested.startsWith('.')) { res.writeHead(404).end('Not found'); return; }
  try {
    const content = await readFile(filePath);
    res.writeHead(200, { 'Content-Type': types[extname(filePath)] || 'application/octet-stream', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin' });
    res.end(req.method === 'HEAD' ? undefined : content);
  } catch { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Not found'); }
});

server.listen(port, () => console.log(`FixItLocal is running at http://localhost:${port}`));
