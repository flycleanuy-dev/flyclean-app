// GET/POST /api/app-config — configuración del negocio (reglas/checklist/plantillas WhatsApp).
// GET: cualquier sesión VÁLIDA (el operario necesita el checklist, el coord los umbrales — no son secretos).
// POST: ESTRICTAMENTE admin-only (ADMIN_IDS), mismas guardas fail-closed que admin-set-pin/email-recipients.
// Este endpoint NO toca nada más (ni Notion, ni Supabase, ni la IA): solo la clave KV config:app:v1.
import { verifySession, tokenFromReq } from './_lib/session.js';
import { kvConfigured } from './_lib/pins.js';
import { getAppConfig, setAppConfig, validateAppConfig } from './_lib/appconfig.js';

export const config = { maxDuration: 10 };

const ALLOWED_ORIGINS = [
  'https://flyclean.app',
  'https://www.flyclean.app',
  'https://flyclean-app.vercel.app',
];
const ALLOWED_ORIGIN_REGEX = /^https:\/\/flyclean-app-[a-z0-9]+-fly-clean-app-s-projects\.vercel\.app$/;
function originAllowed(o) {
  return !!o && (ALLOWED_ORIGINS.includes(o) || ALLOWED_ORIGIN_REGEX.test(o));
}

function adminIds() {
  return String(process.env.ADMIN_IDS || 'diego-laxalt,eduardo-cabral')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}

export default async function handler(req, res) {
  const origin = req.headers.origin || '';
  res.setHeader('Access-Control-Allow-Origin', originAllowed(origin) ? origin : 'https://flyclean.app');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Vary', 'Origin');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).json({ ok: false });
  // GET same-origin no manda Origin → permitido solo si NO hay header; un origin presente y extraño = 403.
  if (origin && !originAllowed(origin)) return res.status(403).json({ ok: false, error: 'origin' });
  if (!kvConfigured()) return res.status(503).json({ ok: false, error: 'almacén no configurado' });

  const session = verifySession(tokenFromReq(req));
  if (!session || !session.id) return res.status(401).json({ ok: false, error: 'sesión requerida' });

  if (req.method === 'GET') {
    const cfg = await getAppConfig();
    return res.status(200).json({ ok: true, config: cfg });
  }

  // POST: REEMPLAZA la config completa. Solo admins.
  if (!adminIds().includes(session.id))
    return res.status(403).json({ ok: false, error: 'solo un admin puede cambiar la configuración' });
  const incoming = (req.body || {}).config;
  if (!incoming || typeof incoming !== 'object')
    return res.status(400).json({ ok: false, error: 'config inválida' });
  if (JSON.stringify(incoming).length > 20000)
    return res.status(400).json({ ok: false, error: 'config demasiado grande' });
  const err = validateAppConfig(incoming);
  if (err) return res.status(400).json({ ok: false, error: err });

  try {
    const saved = await setAppConfig(incoming);
    console.log('[app-config] actualizado por', session.id, JSON.stringify(Object.keys(saved)));
    return res.status(200).json({ ok: true, config: saved });
  } catch (e) {
    return res.status(502).json({ ok: false, error: 'no se pudo guardar (KV)' });
  }
}
