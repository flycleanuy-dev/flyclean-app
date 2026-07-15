// /api/users-roster — roster PÚBLICO de usuarios para la pantalla de LOGIN (Fase 3.0: alta sin deploy).
//
// El roster (nombres/roles/países) YA es público hoy: viene embebido en el JS del cliente (const USERS en
// index.html). Este endpoint lo mueve a la base para que un usuario NUEVO agregado a la tabla `usuarios`
// aparezca en el login SIN deploy. NO expone PINs (no viven acá; siguen hasheados en KV/scrypt).
//
// Semántica (consistente con userById en api/_lib/users.js):
//   - flag USERS_FROM_DB ON  + DB cargó → sirve el roster de la DB (usuarios activos).
//   - flag OFF, o DB falló             → sirve el array hardcodeado (fallback duro / anti-lockout).
// El front SIEMPRE cae a su propio array embebido si este endpoint falla → nunca se queda sin pantalla de login.
import { USERS, loadUsersFromDb } from './_lib/users.js';

const USERS_FROM_DB = process.env.USERS_FROM_DB === '1';
const ALLOWED_ORIGINS = [
  'https://flyclean.app',
  'https://www.flyclean.app',
  'https://flyclean-app.vercel.app',
  /^https:\/\/flyclean-app-[a-z0-9]+-fly-clean-app-s-projects\.vercel\.app$/,
];

function hardcodedRoster() {
  return Object.entries(USERS).map(([id, u]) => ({
    id,
    nombre: u.nombre,
    rol: u.rol,
    pais: u.pais,
    emoji: null,
  }));
}

let _cache = null,
  _cacheAt = 0;
const TTL = 60_000;

export default async function handler(req, res) {
  const origin = req.headers.origin || '';
  const originAllowed = ALLOWED_ORIGINS.some(o => (typeof o === 'string' ? o === origin : o.test(origin)));
  res.setHeader('Access-Control-Allow-Origin', originAllowed ? origin : 'https://flyclean.app');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Vary', 'Origin');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const probe = String(req.query?.probe || '') === '1';
  // Lee la DB (cacheado 60s) SOLO si el flag está prendido o si es un probe (verificación): con flag OFF y sin
  // probe NO pegamos a Supabase (servimos hardcoded directo). Si el fetch falla, dbRoster queda null → hardcoded.
  let dbRoster = null;
  if (USERS_FROM_DB || probe) {
    if (_cache && Date.now() - _cacheAt < TTL) {
      dbRoster = _cache;
    } else {
      try {
        const map = await loadUsersFromDb();
        dbRoster = Object.entries(map).map(([id, u]) => ({
          id,
          nombre: u.nombre,
          rol: u.rol,
          pais: u.pais,
          emoji: u.emoji || null,
        }));
        _cache = dbRoster;
        _cacheAt = Date.now();
      } catch (_) {
        /* Supabase caído → servimos hardcoded */
      }
    }
  }

  const useDb = USERS_FROM_DB && dbRoster;
  const users = useDb ? dbRoster : hardcodedRoster();
  res.setHeader('Cache-Control', 'no-store');
  const body = { users, source: useDb ? 'db' : 'hardcoded' };
  // ?probe=1 → SOLO el conteo de usuarios activos que ve la DB (público-seguro: el roster ya es público).
  // NO exponemos el mensaje de error ni el estado del flag (no filtrar infra).
  if (probe) body.dbCount = dbRoster ? dbRoster.length : null;
  return res.status(200).json(body);
}
