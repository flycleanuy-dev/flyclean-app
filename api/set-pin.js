// Cambio de PIN SEGURO, server-side (#3). Reemplaza el viejo override en localStorage (bypasseable).
// Exige: (1) sesión válida (token de verify-pin → solo cambiás TU propio PIN) y (2) el PIN actual
// correcto. Guarda el nuevo PIN hasheado (scrypt) en KV. Acepta PIN de 4 o 6 dígitos.
import crypto from 'node:crypto';
import { verifySession, tokenFromReq } from './_lib/session.js';
import { kvConfigured, getUserPinHash, setUserPinHash, hashPin, verifyPinHash } from './_lib/pins.js';

export const config = { maxDuration: 10 };

const ALLOWED_ORIGINS = [
  'https://flyclean.app',
  'https://www.flyclean.app',
  'https://flyclean-app.vercel.app',
];
const ALLOWED_ORIGIN_REGEX = /^https:\/\/flyclean-app-[a-z0-9]+-fly-clean-app-s-projects\.vercel\.app$/;
function originAllowed(o) { return !!o && (ALLOWED_ORIGINS.includes(o) || ALLOWED_ORIGIN_REGEX.test(o)); }
function safeEqual(a, b) {
  const ba = Buffer.from(String(a)); const bb = Buffer.from(String(b));
  if (ba.length !== bb.length) { crypto.timingSafeEqual(ba, ba); return false; }
  return crypto.timingSafeEqual(ba, bb);
}

export default async function handler(req, res) {
  const origin = req.headers.origin || '';
  res.setHeader('Access-Control-Allow-Origin', originAllowed(origin) ? origin : 'https://flyclean.app');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Vary', 'Origin');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false });
  if (!originAllowed(origin)) return res.status(403).json({ ok: false, error: 'origin' });
  if (!kvConfigured()) return res.status(503).json({ ok: false, error: 'almacén de PIN no configurado' });

  // Requiere sesión válida → solo se cambia el PIN del propio usuario del token.
  const session = verifySession(tokenFromReq(req));
  if (!session || !session.id) return res.status(401).json({ ok: false, error: 'sesión requerida' });
  const id = session.id;

  const { currentPin, newPin } = req.body || {};
  if (typeof currentPin !== 'string' || typeof newPin !== 'string') return res.status(400).json({ ok: false });
  if (!/^(\d{4}|\d{6})$/.test(newPin)) return res.status(400).json({ ok: false, error: 'El PIN debe ser de 4 o 6 dígitos' });

  // Validar el PIN ACTUAL: contra el custom (KV) si existe, si no contra el default (USER_PINS).
  let okCurrent = false;
  const customHash = await getUserPinHash(id);
  if (customHash) {
    okCurrent = verifyPinHash(currentPin, customHash);
  } else {
    let map = {}; try { map = JSON.parse(process.env.USER_PINS || '{}'); } catch (_) {}
    const expected = map[id];
    okCurrent = typeof expected === 'string' && expected.length > 0 && safeEqual(currentPin, expected);
  }
  if (!okCurrent) {
    await new Promise(r => setTimeout(r, 400)); // demora anti fuerza-bruta
    return res.status(403).json({ ok: false, error: 'PIN actual incorrecto' });
  }

  try {
    await setUserPinHash(id, hashPin(newPin));
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ ok: false, error: 'no se pudo guardar el PIN' });
  }
}
