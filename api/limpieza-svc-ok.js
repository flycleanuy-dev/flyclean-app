// /api/limpieza-svc-ok — estado COMPARTIDO "✓ Están bien" del panel 🧹 Limpieza → "Servicios a revisar".
// Cuando Dirección marca un grupo (por cliente) como legítimo, se guarda EN LA NUBE (no en el dispositivo):
// persiste y se ve igual desde cualquier equipo. No toca los servicios (no renombra ni archiva nada) —
// solo recuerda "este grupo ya lo revisé, no me lo muestres".
//
// Storage: Vercel KV / Upstash (mismo patrón que api/mapa-estado.js) — un SET Redis con un miembro por
// cliente: SADD limpieza:svc-ok <cid>. Sin pasos de schema.
//
// GET  → { ids: ["<cid>", ...] }
// POST { cid, ok:true|false } → agrega/saca el cid y devuelve { ok, ids }.
// Solo rol Dirección (es quien ve el panel Limpieza).
import { verifySession, tokenFromReq, maybeRenewSession } from './_lib/session.js';
import { userById } from './_lib/users.js';

const ALLOWED_ORIGINS = [
  'https://flyclean.app',
  'https://www.flyclean.app',
  'https://flyclean-app.vercel.app',
];
const ALLOWED_ORIGIN_REGEX = /^https:\/\/flyclean-app-[a-z0-9]+-fly-clean-app-s-projects\.vercel\.app$/;
function originAllowed(o) {
  return !!o && (ALLOWED_ORIGINS.includes(o) || ALLOWED_ORIGIN_REGEX.test(o));
}

const KV_URL = process.env.KV_REST_API_URL || '';
const KV_TOKEN = process.env.KV_REST_API_TOKEN || '';
const KEY = 'limpieza:svc-ok';
// cid = id de página Notion del cliente (uuid con/sin guiones) o el literal 'sin-cliente'. Validar corta
// cualquier intento de usar el set como storage arbitrario.
const CID_RE = /^([0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}|sin-cliente)$/i;

async function kvCmd(cmd) {
  const r = await fetch(KV_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${KV_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmd),
  });
  if (!r.ok) throw new Error('KV ' + r.status);
  return (await r.json()).result;
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

  const session = verifySession(tokenFromReq(req));
  if (!session || !session.id) return res.status(401).json({ error: 'auth required' });
  maybeRenewSession(res, session);
  const u = userById(session.id);
  if (!u) return res.status(403).json({ error: 'usuario desconocido' });
  // Solo Dirección: es el único rol que ve el panel 🧹 Limpieza.
  if (!String(u.rol || '').includes('Dirección')) return res.status(403).json({ error: 'solo Dirección' });

  if (!KV_URL || !KV_TOKEN) return res.status(500).json({ error: 'KV no configurado' });

  try {
    if (req.method === 'GET') {
      const ids = (await kvCmd(['SMEMBERS', KEY])) || [];
      return res.status(200).json({ ids });
    }
    const cid = String((req.body && req.body.cid) || '');
    if (!CID_RE.test(cid)) return res.status(400).json({ error: 'cid inválido' });
    if (req.body && req.body.ok) await kvCmd(['SADD', KEY, cid]);
    else await kvCmd(['SREM', KEY, cid]);
    const ids = (await kvCmd(['SMEMBERS', KEY])) || [];
    return res.status(200).json({ ok: true, ids });
  } catch (e) {
    console.error('[limpieza-svc-ok]', e.message);
    return res.status(502).json({ error: 'kv error' });
  }
}
