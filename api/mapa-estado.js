// /api/mapa-estado — estado COMPARTIDO "ya contactado" del mapa de prospección (Bloque B del plan
// comercial 2026-07-05). El mapa (iframe estático en flyclean-mapa.vercel.app) NO llama acá directo:
// habla por postMessage con la app (renderCoordMapa), y es la APP la que pega acá autenticada con el
// token de sesión — el token nunca entra al iframe.
//
// Storage: Vercel KV / Upstash (mismo patrón que _lib/pins.js) — un hash Redis con un campo por
// objetivo: HSET mapa:contactados <id> {"por":"Nombre","fecha":"ISO"}. Atómico por campo (dos
// vendedores marcando a la vez no se pisan) y sin pasos manuales de schema (a diferencia de una
// tabla Supabase, que requiere correr SQL a mano). ~1200 objetivos máx → payload chico.
//
// GET  → { estado: { "<id>": { por, fecha }, ... } }
// POST { id, contactado:true|false } → marca/desmarca (por = nombre del usuario de la sesión) y
//       devuelve el estado completo actualizado (la app se lo reenvía al iframe).
import { verifySession, tokenFromReq, maybeRenewSession } from './_lib/session.js';
import { userById } from './_lib/users.js';

const ALLOWED_ORIGINS = [
  'https://flyclean.app',
  'https://www.flyclean.app',
  'https://flyclean-app.vercel.app',
];
const ALLOWED_ORIGIN_REGEX = /^https:\/\/flyclean-app-[a-z0-9]+-fly-clean-app-s-projects\.vercel\.app$/;
function originAllowed(o) { return !!o && (ALLOWED_ORIGINS.includes(o) || ALLOWED_ORIGIN_REGEX.test(o)); }

const KV_URL = process.env.KV_REST_API_URL || '';
const KV_TOKEN = process.env.KV_REST_API_TOKEN || '';
const KEY = 'mapa:contactados';

// Ids del mapa: "<cat>_<lat>_<lon>" (ej. "A_-34.89153_-56.15213"). Validar corta cualquier intento
// de usar el hash como storage arbitrario.
const ID_RE = /^[A-Z]{1,2}_-?\d{1,3}(\.\d+)?_-?\d{1,3}(\.\d+)?$/;

// Upstash REST: POST <url> con body ["CMD", arg, ...] (mismo patrón que api/_lib/pins.js).
async function kvCmd(cmd) {
  const r = await fetch(KV_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${KV_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmd),
  });
  if (!r.ok) throw new Error('KV ' + r.status);
  const j = await r.json();
  return j.result;
}

// HGETALL devuelve un array plano [campo1, valor1, campo2, valor2, ...] → objeto { id: {por,fecha} }.
async function leerEstado() {
  const flat = (await kvCmd(['HGETALL', KEY])) || [];
  const estado = {};
  for (let i = 0; i + 1 < flat.length; i += 2) {
    try { estado[flat[i]] = JSON.parse(flat[i + 1]); } catch (_) { estado[flat[i]] = {}; }
  }
  return estado;
}

export default async function handler(req, res) {
  const origin = req.headers.origin || '';
  res.setHeader('Access-Control-Allow-Origin', originAllowed(origin) ? origin : 'https://flyclean.app');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Vary', 'Origin');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (origin && !originAllowed(origin)) return res.status(403).json({ error: 'origin' });
  if (!['GET', 'POST'].includes(req.method)) return res.status(405).json({ error: 'Method not allowed' });

  // Misma sesión HMAC que el resto de la app (cualquier rol logueado puede ver/marcar — es una
  // herramienta operativa compartida, sin datos financieros).
  const session = verifySession(tokenFromReq(req));
  if (!session || !session.id) return res.status(401).json({ error: 'auth required' });
  maybeRenewSession(res, session);
  const u = userById(session.id);
  if (!u) return res.status(403).json({ error: 'usuario desconocido' });

  if (!KV_URL || !KV_TOKEN) return res.status(500).json({ error: 'KV no configurado' });

  try {
    if (req.method === 'GET') {
      return res.status(200).json({ estado: await leerEstado() });
    }
    // POST: marcar / desmarcar
    const body = req.body || {};
    const id = String(body.id || '');
    if (!ID_RE.test(id)) return res.status(400).json({ error: 'id inválido' });
    if (body.contactado) {
      const val = JSON.stringify({ por: u.name || session.id, fecha: new Date().toISOString().split('T')[0] });
      await kvCmd(['HSET', KEY, id, val]);
    } else {
      await kvCmd(['HDEL', KEY, id]);
    }
    return res.status(200).json({ ok: true, estado: await leerEstado() });
  } catch (e) {
    console.error('[mapa-estado]', e.message);
    return res.status(502).json({ error: 'kv error' });
  }
}
