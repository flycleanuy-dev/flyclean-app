// Valida el PIN de un usuario del lado del SERVIDOR (auditoría #2): los PINs ya NO viven en el
// código del cliente. El front manda { id, pin } y acá se compara contra process.env.USER_PINS
// (un JSON { "<id>": "<pin>", ... }). Devuelve { ok: true|false } — nunca el PIN.
import crypto from 'node:crypto';
import { signSession } from './_lib/session.js';
import { getUserPinHash, verifyPinHash } from './_lib/pins.js';

export const config = { maxDuration: 10 };

// Comparación de tiempo constante SIN filtrar la longitud: se compara el hash SHA-256 (largo fijo 32B)
// de ambos valores → mismo tiempo siempre, no se filtra ni el largo del PIN ni el resultado.
function safeEqual(a, b) {
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}
const FAIL_DELAY_MS = 500; // demora en cada intento fallido → ralentiza el brute-force

const ALLOWED_ORIGINS = [
  'https://flyclean.app',
  'https://www.flyclean.app',
  'https://flyclean-app.vercel.app',
  /^https:\/\/flyclean-app-[a-z0-9]+-fly-clean-app-s-projects\.vercel\.app$/,
];

// Rate-limit de intentos de PIN. Primario: Vercel KV (INCR+EXPIRE atómico, GLOBAL entre instancias —
// no se evade con cold starts ni múltiples lambdas; mismo patrón que api/extract-receipt.js).
// Fallback si KV no está configurado o falla: el Map en memoria por instancia de siempre.
const attempts = new Map(); // id → { count, ts } (fallback)
const WINDOW_MS = 60_000;
const MAX_ATTEMPTS = 8;
const KV_URL = process.env.KV_REST_API_URL || '';
const KV_TOKEN = process.env.KV_REST_API_TOKEN || '';

async function kvCmd(cmd) {
  const r = await fetch(KV_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${KV_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmd),
  });
  if (!r.ok) throw new Error('KV ' + r.status);
  return (await r.json()).result;
}

// Cuenta el intento FALLIDO y responde si el id superó el límite en la ventana actual.
// Se llama solo en fallos (el login correcto no consume cupo ni se demora).
async function registerFailedAttempt(id) {
  if (KV_URL && KV_TOKEN) {
    try {
      const bucket = Math.floor(Date.now() / WINDOW_MS);
      const key = `rl:pin:${id}:${bucket}`;
      const count = Number(await kvCmd(['INCR', key]));
      if (count === 1) { try { await kvCmd(['EXPIRE', key, Math.ceil(WINDOW_MS / 1000) + 30]); } catch (_) {} }
      return; // el conteo vive en KV; blocked() lo consulta
    } catch (_) { /* KV caído → fallback abajo */ }
  }
  const now = Date.now();
  const prev = attempts.get(id);
  const windowed = prev && (now - prev.ts) < WINDOW_MS;
  attempts.set(id, { count: (windowed ? prev.count : 0) + 1, ts: now });
}

// ¿Este id ya agotó los intentos de la ventana? (KV global; fallback Map por instancia).
async function isRateLimited(id) {
  if (KV_URL && KV_TOKEN) {
    try {
      const bucket = Math.floor(Date.now() / WINDOW_MS);
      const count = Number(await kvCmd(['GET', `rl:pin:${id}:${bucket}`]));
      return Number.isFinite(count) && count >= MAX_ATTEMPTS;
    } catch (_) { /* KV caído → fallback abajo */ }
  }
  const prev = attempts.get(id);
  return !!(prev && (Date.now() - prev.ts) < WINDOW_MS && prev.count >= MAX_ATTEMPTS);
}

export default async function handler(req, res) {
  const origin = req.headers.origin || '';
  const originAllowed = ALLOWED_ORIGINS.some(o => (typeof o === 'string' ? o === origin : o.test(origin)));
  res.setHeader('Access-Control-Allow-Origin', originAllowed ? origin : 'https://flyclean.app');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Vary', 'Origin');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false });

  const { id, pin } = req.body || {};
  if (typeof id !== 'string' || typeof pin !== 'string' || id.length > 60 || pin.length > 12) {
    return res.status(400).json({ ok: false });
  }

  if (await isRateLimited(id)) {
    return res.status(429).json({ ok: false, error: 'demasiados intentos, esperá un momento' });
  }

  // PIN custom (cambiado por el usuario) vive hasheado en KV y tiene prioridad; si no, el default de USER_PINS.
  let valid = false;
  const customHash = await getUserPinHash(id);
  if (customHash) {
    valid = verifyPinHash(pin, customHash);
  } else {
    let map = {};
    try { map = JSON.parse(process.env.USER_PINS || '{}'); } catch (_) { map = {}; }
    const expected = map[id];
    valid = typeof expected === 'string' && expected.length > 0 && safeEqual(pin, expected);
  }

  if (!valid) {
    await registerFailedAttempt(id);
    await new Promise(r => setTimeout(r, FAIL_DELAY_MS)); // solo en fallo: el login correcto no se demora
    return res.status(200).json({ ok: false });
  }
  attempts.delete(id); // limpia el fallback in-memory (la ventana de KV expira sola)
  // Token de sesión: el cliente lo manda en cada pedido al proxy (cierra el agujero #1).
  return res.status(200).json({ ok: true, token: signSession({ id }) });
}
