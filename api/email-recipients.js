// GET/POST /api/email-recipients — gestiona QUIÉN recibe los reportes por email (⚙️ Configuración).
// ESTRICTAMENTE admin-only (mismas guardas fail-closed que api/admin-set-pin.js): sesión HMAC válida +
// id ∈ ADMIN_IDS. El GET también es admin-only (los emails del equipo son dato personal). Este endpoint
// NO toca nada más (ni Notion, ni Supabase, ni la IA): solo lee/escribe la clave KV de destinatarios.
import { verifySession, tokenFromReq } from './_lib/session.js';
import { kvConfigured } from './_lib/pins.js';
import { getAllRecipients, setAllRecipients, RECIPIENT_TYPES, MAX_PER_TYPE, isValidEmail } from './_lib/recipients.js';

export const config = { maxDuration: 10 };

const ALLOWED_ORIGINS = ['https://flyclean.app', 'https://www.flyclean.app', 'https://flyclean-app.vercel.app'];
const ALLOWED_ORIGIN_REGEX = /^https:\/\/flyclean-app-[a-z0-9]+-fly-clean-app-s-projects\.vercel\.app$/;
function originAllowed(o) { return !!o && (ALLOWED_ORIGINS.includes(o) || ALLOWED_ORIGIN_REGEX.test(o)); }

function adminIds() {
  return String(process.env.ADMIN_IDS || 'diego-laxalt,eduardo-cabral').split(',').map(s => s.trim()).filter(Boolean);
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
  // GET same-origin no manda header Origin → permitirlo solo si NO hay origin (mismo criterio que
  // admin-list-users tras el fix "Dados de baja 403"); un origin PRESENTE y no permitido = 403.
  if (origin && !originAllowed(origin)) return res.status(403).json({ ok: false, error: 'origin' });
  if (!kvConfigured()) return res.status(503).json({ ok: false, error: 'almacén no configurado' });

  const session = verifySession(tokenFromReq(req));
  if (!session || !session.id) return res.status(401).json({ ok: false, error: 'sesión requerida' });
  if (!adminIds().includes(session.id)) return res.status(403).json({ ok: false, error: 'solo un admin puede gestionar destinatarios' });

  if (req.method === 'GET') {
    const recipients = await getAllRecipients();
    return res.status(200).json({ ok: true, recipients, types: RECIPIENT_TYPES, max: MAX_PER_TYPE });
  }

  // POST: REEMPLAZA el mapa completo {semanal:[...], lunes:[...], pipeline:[...]} — no es merge: un tipo
  // ausente queda []. El front siempre hidrata con GET antes de editar y postea el mapa entero.
  const body = req.body || {};
  const incoming = body.recipients;
  if (!incoming || typeof incoming !== 'object' || Array.isArray(incoming)) {
    return res.status(400).json({ ok: false, error: 'recipients inválido' });
  }
  if (JSON.stringify(incoming).length > 5000) return res.status(400).json({ ok: false, error: 'payload demasiado grande' });
  for (const [t, arr] of Object.entries(incoming)) {
    if (!RECIPIENT_TYPES.includes(t)) return res.status(400).json({ ok: false, error: `tipo desconocido: ${String(t).slice(0, 30)}` });
    if (!Array.isArray(arr)) return res.status(400).json({ ok: false, error: `lista inválida en ${t}` });
    if (arr.length > MAX_PER_TYPE) return res.status(400).json({ ok: false, error: `máximo ${MAX_PER_TYPE} destinatarios por reporte` });
    for (const e of arr) {
      if (!isValidEmail(e)) return res.status(400).json({ ok: false, error: `email inválido: ${String(e).slice(0, 60)}` });
    }
  }

  try {
    const saved = await setAllRecipients(incoming);
    console.log('[email-recipients] actualizado por', session.id, JSON.stringify(Object.fromEntries(Object.entries(saved).map(([k, v]) => [k, v.length]))));
    return res.status(200).json({ ok: true, recipients: saved });
  } catch (e) {
    return res.status(502).json({ ok: false, error: 'no se pudo guardar (KV)' });
  }
}
