// Admin: lista TODOS los usuarios de la tabla `usuarios` (activos + dados de baja) para el panel de gestión.
// A diferencia de /api/users-roster (público, solo activos), este exige sesión + admin y expone `activo`
// para poder mostrar la sección "Dados de baja" con el botón Reactivar. Solo lectura.
import { verifySession, tokenFromReq } from './_lib/session.js';

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

const SB_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SB_KEY = process.env.SUPABASE_SERVICE_KEY || '';

export default async function handler(req, res) {
  const origin = req.headers.origin || '';
  res.setHeader('Access-Control-Allow-Origin', originAllowed(origin) ? origin : 'https://flyclean.app');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Vary', 'Origin');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ ok: false });
  // Los GET same-origin del navegador NO mandan header Origin → si viene vacío, es same-origin y se permite
  // (la seguridad real es el token de sesión + admin). Solo rechazamos un Origin presente y NO permitido.
  if (origin && !originAllowed(origin)) return res.status(403).json({ ok: false, error: 'origin' });
  if (!SB_URL || !SB_KEY) return res.status(503).json({ ok: false, error: 'base no configurada' });

  const session = verifySession(tokenFromReq(req));
  if (!session || !session.id) return res.status(401).json({ ok: false, error: 'sesión requerida' });
  if (!adminIds().includes(session.id)) return res.status(403).json({ ok: false, error: 'solo un admin' });

  try {
    const r = await fetch(
      `${SB_URL}/rest/v1/usuarios?select=id,nombre,rol,pais,emoji,activo&order=activo.desc,nombre.asc`,
      {
        headers: { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY },
      }
    );
    if (!r.ok) return res.status(500).json({ ok: false, error: 'supabase ' + r.status });
    const rows = await r.json();
    return res.status(200).json({ ok: true, users: rows });
  } catch (e) {
    return res.status(500).json({ ok: false, error: 'no se pudo listar' });
  }
}
