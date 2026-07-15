// Admin: alta / edición / baja de un usuario en la tabla `usuarios` de Supabase (Fase 3.0: gente sin deploy).
// Exige (1) sesión válida y (2) que el llamante sea admin (allow-list ADMIN_IDS) — mismo modelo que
// admin-set-pin. Upsert por `id` (PK). NO toca el PIN (eso es /api/admin-set-pin). Cuando USERS_FROM_DB=1,
// /api/users-roster (login) y userById/resolveUser (permisos) leen esta tabla → el alta aplica sin deploy.
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

// Los rol/país DEBEN ser exactamente estos strings (esGlobal/esVentas/checkPermiso dependen de los substrings).
const ROLES = ['🎯 Dirección', '🔧 Coordinador', '🛠️ Operario', '👔 CEO', '📊 Administración', '🧲 Ventas'];
const PAISES = ['Uruguay', 'Brasil', 'Panamá', 'Guatemala', 'México'];

const SB_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SB_KEY = process.env.SUPABASE_SERVICE_KEY || '';

export default async function handler(req, res) {
  const origin = req.headers.origin || '';
  res.setHeader('Access-Control-Allow-Origin', originAllowed(origin) ? origin : 'https://flyclean.app');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Vary', 'Origin');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false });
  if (!originAllowed(origin)) return res.status(403).json({ ok: false, error: 'origin' });
  if (!SB_URL || !SB_KEY) return res.status(503).json({ ok: false, error: 'base no configurada' });

  // (1) sesión válida + (2) el llamante es admin.
  const session = verifySession(tokenFromReq(req));
  if (!session || !session.id) return res.status(401).json({ ok: false, error: 'sesión requerida' });
  if (!adminIds().includes(session.id))
    return res.status(403).json({ ok: false, error: 'solo un admin puede gestionar usuarios' });

  const { id, nombre, rol, pais, activo } = req.body || {};
  // upsert=true (edición/baja explícita, futuro) permite pisar una fila existente. Por defecto es ALTA
  // CREATE-ONLY: si el id ya existe → 409, para que un slug colisionado NO cambie rol/país ni reactive a
  // un usuario dado de baja sin querer.
  const upsert = (req.body || {}).upsert === true;
  if (typeof id !== 'string' || !/^[a-z0-9-]{2,60}$/.test(id))
    return res.status(400).json({ ok: false, error: 'id inválido (minúsculas, números y guiones, 2–60)' });
  if (typeof nombre !== 'string' || !nombre.trim() || nombre.trim().length > 80)
    return res.status(400).json({ ok: false, error: 'nombre inválido' });
  if (/[<>]/.test(nombre))
    return res.status(400).json({ ok: false, error: 'el nombre no puede contener < o >' });
  if (!ROLES.includes(rol)) return res.status(400).json({ ok: false, error: 'rol inválido' });
  if (!PAISES.includes(pais)) return res.status(400).json({ ok: false, error: 'país inválido' });
  const act = activo === false ? false : true; // default activo=true

  try {
    // Create-only: POST sin on_conflict → PostgREST responde 409 si la PK ya existe. upsert=true agrega
    // on_conflict=id + merge-duplicates (edición). created_at se preserva en el update (no va en el body).
    const url = `${SB_URL}/rest/v1/usuarios` + (upsert ? '?on_conflict=id' : '');
    const prefer = (upsert ? 'resolution=merge-duplicates,' : '') + 'return=minimal';
    const r = await fetch(url, {
      method: 'POST',
      headers: {
        apikey: SB_KEY,
        Authorization: 'Bearer ' + SB_KEY,
        'Content-Type': 'application/json',
        Prefer: prefer,
      },
      body: JSON.stringify({
        id,
        nombre: nombre.trim(),
        rol,
        pais,
        activo: act,
        updated_at: new Date().toISOString(),
      }),
    });
    if (r.status === 409)
      return res.status(409).json({ ok: false, error: 'ya existe un usuario con ese id (elegí otro id)' });
    if (!r.ok) {
      const t = await r.text().catch(() => '');
      console.warn('admin-set-user supabase', r.status, t.slice(0, 200));
      return res.status(500).json({ ok: false, error: 'no se pudo guardar (supabase ' + r.status + ')' });
    }
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ ok: false, error: 'no se pudo guardar' });
  }
}
