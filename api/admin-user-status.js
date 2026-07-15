// Admin: CICLO DE VIDA de un usuario (Fase 3.0, sin deploy). Tres acciones sobre la tabla `usuarios`:
//   • BAJA suave   { id, activo:false }  → PATCH activo=false + borra el PIN de KV. La fila QUEDA (historial
//                                          intacto) pero sale del login y de los permisos. Reversible.
//   • REACTIVAR    { id, activo:true }   → PATCH activo=true (el PIN se pone aparte con 🔑, ya que la baja lo borró).
//   • BORRADO def. { id, hard:true }     → DELETE la fila + PIN. Permanente (para basura/pruebas, NO empleados reales).
// Exige (1) sesión válida y (2) que el llamante sea admin (ADMIN_IDS). GUARDIA anti-lockout: NUNCA se puede
// dar de baja/eliminar a un admin (ni a uno mismo) → los dueños no se traban solos.
import { verifySession, tokenFromReq } from './_lib/session.js';
import { deleteUserPin, blockUserPin } from './_lib/pins.js';

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
const SB_HEADERS = () => ({
  apikey: SB_KEY,
  Authorization: 'Bearer ' + SB_KEY,
  'Content-Type': 'application/json',
  Prefer: 'return=minimal',
});

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

  const session = verifySession(tokenFromReq(req));
  if (!session || !session.id) return res.status(401).json({ ok: false, error: 'sesión requerida' });
  if (!adminIds().includes(session.id))
    return res.status(403).json({ ok: false, error: 'solo un admin puede gestionar usuarios' });

  const { id, activo, hard } = req.body || {};
  if (typeof id !== 'string' || !/^[a-z0-9-]{2,60}$/.test(id))
    return res.status(400).json({ ok: false, error: 'id inválido' });
  // Anti-lockout: a un admin no se lo puede dar de baja ni eliminar (a reactivar sí no aplica: ya está activo).
  if (adminIds().includes(id) && (hard === true || activo === false)) {
    return res.status(403).json({ ok: false, error: 'no se puede dar de baja/eliminar a un administrador' });
  }

  try {
    if (hard === true) {
      // Borrado permanente: fila + PIN.
      const r = await fetch(`${SB_URL}/rest/v1/usuarios?id=eq.${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: SB_HEADERS(),
      });
      if (!r.ok && r.status !== 404) return sbFail(res, r, 'eliminar');
      try {
        await deleteUserPin(id);
      } catch (_) {}
      return res.status(200).json({ ok: true, action: 'deleted' });
    }

    if (activo === false || activo === true) {
      // Baja suave o reactivación: solo togglea el flag (nombre/rol/país/created_at intactos).
      // return=representation (NO minimal): PostgREST devuelve 204 aunque el id no matchee ninguna fila
      // → una baja "exitosa" que no actualizó nada. Con representation vemos las filas afectadas y, si son 0,
      // devolvemos 404 en vez de mentir "dado de baja" (el usuario no aparecería nunca en Dados de baja).
      const r = await fetch(`${SB_URL}/rest/v1/usuarios?id=eq.${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: {
          apikey: SB_KEY,
          Authorization: 'Bearer ' + SB_KEY,
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
        },
        body: JSON.stringify({ activo, updated_at: new Date().toISOString() }),
      });
      if (!r.ok) return sbFail(res, r, 'actualizar');
      const rows = await r.json().catch(() => []);
      if (!Array.isArray(rows) || rows.length === 0) {
        return res
          .status(404)
          .json({ ok: false, error: 'no se encontró el usuario en la base (id: ' + id + ')' });
      }
      // Baja = cortar acceso: BLOQUEAR el PIN (centinela), no borrarlo — si solo se borrara, verify-pin caería
      // al default de USER_PINS y un usuario original podría volver a entrar. Reactivar/🔑 lo pisan con uno nuevo.
      if (activo === false) {
        try {
          await blockUserPin(id);
        } catch (_) {}
      }
      // Devolvemos la fila actualizada para que el front haga el update OPTIMISTA (sin esperar el roster cacheado 60s).
      return res
        .status(200)
        .json({ ok: true, action: activo ? 'reactivated' : 'deactivated', user: rows[0] });
    }

    return res.status(400).json({ ok: false, error: 'falta activo (true/false) o hard' });
  } catch (e) {
    return res.status(500).json({ ok: false, error: 'no se pudo aplicar el cambio' });
  }
}

async function sbFail(res, r, verbo) {
  const t = await r.text().catch(() => '');
  console.warn('admin-user-status supabase', r.status, t.slice(0, 200));
  return res.status(500).json({ ok: false, error: 'no se pudo ' + verbo + ' (supabase ' + r.status + ')' });
}
