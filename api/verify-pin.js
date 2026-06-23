// Valida el PIN de un usuario del lado del SERVIDOR (auditoría #2): los PINs ya NO viven en el
// código del cliente. El front manda { id, pin } y acá se compara contra process.env.USER_PINS
// (un JSON { "<id>": "<pin>", ... }). Devuelve { ok: true|false } — nunca el PIN.
import crypto from 'node:crypto';
import { signSession } from './_lib/session.js';

export const config = { maxDuration: 10 };

// Comparación de tiempo constante: evita filtrar info por cuánto tarda el === (timing attack).
function safeEqual(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ba.length !== bb.length) { crypto.timingSafeEqual(ba, ba); return false; }
  return crypto.timingSafeEqual(ba, bb);
}
const FAIL_DELAY_MS = 500; // demora en cada intento fallido → ralentiza el brute-force

const ALLOWED_ORIGINS = [
  'https://flyclean.app',
  'https://www.flyclean.app',
  'https://flyclean-app.vercel.app',
  /^https:\/\/flyclean-app-[a-z0-9]+-fly-clean-app-s-projects\.vercel\.app$/,
];

// Rate-limit simple en memoria (por id). Es por-instancia (se resetea en cold start), pero frena
// el brute-force obvio sobre un PIN de 4 dígitos. Para algo robusto, usar Vercel KV.
const attempts = new Map(); // id → { count, ts }
const WINDOW_MS = 60_000;
const MAX_ATTEMPTS = 8;

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

  const now = Date.now();
  const prev = attempts.get(id);
  const windowed = prev && (now - prev.ts) < WINDOW_MS;
  if (windowed && prev.count >= MAX_ATTEMPTS) {
    return res.status(429).json({ ok: false, error: 'demasiados intentos, esperá un momento' });
  }

  let map = {};
  try { map = JSON.parse(process.env.USER_PINS || '{}'); } catch (_) { map = {}; }
  const expected = map[id];
  const valid = typeof expected === 'string' && expected.length > 0 && safeEqual(pin, expected);

  if (!valid) {
    attempts.set(id, { count: (windowed ? prev.count : 0) + 1, ts: now });
    await new Promise(r => setTimeout(r, FAIL_DELAY_MS)); // solo en fallo: el login correcto no se demora
    return res.status(200).json({ ok: false });
  }
  attempts.delete(id);
  // Token de sesión: el cliente lo manda en cada pedido al proxy (cierra el agujero #1).
  return res.status(200).json({ ok: true, token: signSession({ id }) });
}
