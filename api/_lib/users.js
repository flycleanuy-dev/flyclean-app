// Mapa server-side de usuarios (id → país/rol/nombre) para resolver permisos en api/db.js.
// Espejo de la const USERS de index.html (mantener en sync; a futuro, leer de la tabla `equipo` de Supabase).
export const USERS = {
  'diego-laxalt':         { nombre: 'Diego Laxalt',         rol: '🎯 Dirección',      pais: 'Uruguay' },
  'federico-maciel':      { nombre: 'Federico Maciel',      rol: '🔧 Coordinador',    pais: 'Uruguay' },
  'juan-pablo':           { nombre: 'Juan Pablo',           rol: '🛠️ Operario',       pais: 'Uruguay' },
  'francisco-rocha':      { nombre: 'Francisco Rocha',      rol: '🛠️ Operario',       pais: 'Uruguay' },
  'coord-brasil':         { nombre: 'Coordinador Brasil',   rol: '🔧 Coordinador',    pais: 'Brasil' },
  'operario-brasil-1':    { nombre: 'Operario Brasil',      rol: '🛠️ Operario',       pais: 'Brasil' },
  'coord-panama':         { nombre: 'Coordinador Panamá',   rol: '🔧 Coordinador',    pais: 'Panamá' },
  'operario-panama-1':    { nombre: 'Operario Panamá',      rol: '🛠️ Operario',       pais: 'Panamá' },
  'coord-guatemala':      { nombre: 'Coordinador Guatemala',rol: '🔧 Coordinador',    pais: 'Guatemala' },
  'operario-guatemala-1': { nombre: 'Operario Guatemala',   rol: '🛠️ Operario',       pais: 'Guatemala' },
  'coord-mexico':         { nombre: 'Coordinador México',   rol: '🔧 Coordinador',    pais: 'México' },
  'operario-mexico-1':    { nombre: 'Operario México',      rol: '🛠️ Operario',       pais: 'México' },
  'eduardo-cabral':       { nombre: 'Eduardo Cabral',       rol: '👔 CEO',            pais: 'Uruguay' },
  'ceo-brasil':           { nombre: 'CEO Brasil',           rol: '👔 CEO',            pais: 'Brasil' },
  'ceo-panama':           { nombre: 'CEO Panamá',           rol: '👔 CEO',            pais: 'Panamá' },
  'ceo-guatemala':        { nombre: 'CEO Guatemala',        rol: '👔 CEO',            pais: 'Guatemala' },
  'ceo-mexico':           { nombre: 'CEO México',           rol: '👔 CEO',            pais: 'México' },
  'finanzas-uy':          { nombre: 'Finanzas',             rol: '📊 Administración', pais: 'Uruguay' },
  'finanzas-brasil':      { nombre: 'Finanzas Brasil',      rol: '📊 Administración', pais: 'Brasil' },
  'finanzas-panama':      { nombre: 'Finanzas Panamá',      rol: '📊 Administración', pais: 'Panamá' },
  'finanzas-guatemala':   { nombre: 'Finanzas Guatemala',   rol: '📊 Administración', pais: 'Guatemala' },
  'finanzas-mexico':      { nombre: 'Finanzas México',      rol: '📊 Administración', pais: 'México' },
  'ventas-uy':            { nombre: 'Ventas UY',            rol: '🧲 Ventas',         pais: 'Uruguay' },
};

// ── Fase 3.0: identidad desde la tabla `usuarios` de Supabase (login sin deploy) ────────────────────
// Detrás del flag USERS_FROM_DB (OFF por defecto). Semántica de FALLBACK (anti-lockout):
//   - flag OFF                      → array hardcodeado (comportamiento actual, cero cambio).
//   - flag ON + DB cargó OK         → la DB MANDA (un id ausente = inexistente/inactivo → sin fallback,
//                                      si no la baja lógica no tendría efecto para los 23 originales).
//   - flag ON + DB no cargó / falló → fallback DURO al array (si Supabase se cae, los 23 siguen entrando).
// ⚠️ BAJA DE UN USUARIO: `activo=false` (o borrarlo de la tabla) hace que userById/resolveUser devuelvan
//    null → corta /api/db al instante, y /api/notion SOLO cuando ENFORCE_PERMS=true (hasta entonces loguea
//    pero no rechaza). Como verify-pin NO consulta esta tabla, la baja REAL de acceso = BORRAR EL PIN del
//    usuario (KV/USER_PINS): sin PIN no obtiene token. Regla operativa: dar de baja = activo=false + borrar PIN.
const USERS_FROM_DB = process.env.USERS_FROM_DB === '1';
const _SB_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const _SB_KEY = process.env.SUPABASE_SERVICE_KEY || '';
const DB_USERS_TTL = 60_000;

let _dbUsers = null;        // { id: { nombre, rol, pais, emoji } } o null (nunca cargó / falló)
let _dbUsersAt = 0;
let _dbUsersLoading = false;

// Lee los usuarios ACTIVOS de Supabase (service_role, tabla chica → sin paginar). Lanza ante fallo.
export async function loadUsersFromDb() {
  if (!_SB_URL || !_SB_KEY) throw new Error('supabase no configurada');
  const r = await fetch(`${_SB_URL}/rest/v1/usuarios?select=id,nombre,rol,pais,emoji,activo`, {
    headers: { apikey: _SB_KEY, Authorization: 'Bearer ' + _SB_KEY },
  });
  if (!r.ok) throw new Error('supabase usuarios ' + r.status);
  const rows = await r.json();
  const map = {};
  for (const x of rows) {
    if (x && x.id && x.activo !== false) map[x.id] = { nombre: x.nombre, rol: x.rol, pais: x.pais, emoji: x.emoji || null };
  }
  return map;
}

// Refresco fire-and-forget (nunca bloquea ni tira al caller). Guardado por TTL + flag de "cargando".
function refreshDbUsersIfStale() {
  if (!USERS_FROM_DB || _dbUsersLoading || (Date.now() - _dbUsersAt) < DB_USERS_TTL) return;
  _dbUsersLoading = true;
  loadUsersFromDb()
    .then(map => { _dbUsers = map; _dbUsersAt = Date.now(); })
    .catch(e => { console.warn('[users] loadUsersFromDb falló → fallback hardcoded:', e.message); })
    .finally(() => { _dbUsersLoading = false; });
}
if (USERS_FROM_DB) refreshDbUsersIfStale(); // warm-up en el cold start (reduce el hueco del 1er request)

export function userById(id) {
  refreshDbUsersIfStale();
  if (USERS_FROM_DB && _dbUsers) return _dbUsers[id] || null;   // DB cargó → es la fuente
  return USERS[id] || null;                                     // flag off / DB no lista → array (anti-lockout)
}

// Igual que userById pero ASYNC con RESCATE: si el flag está ON, la DB aún no cargó (cold start) y el id no
// está en el hardcoded (típico de un usuario NUEVO), carga la DB al momento y reintenta → evita el 403
// transitorio del primer request. Rescate OK → la DB manda (baja lógica efectiva); rescate falla → fallback
// duro al hardcoded (anti-lockout). Usar en los endpoints de datos (db.js / notion.js).
export async function resolveUser(id) {
  const u = userById(id);
  if (u || !USERS_FROM_DB || _dbUsers) return u;                // resolvió, o flag off, o DB ya cargada (miss real)
  try { _dbUsers = await loadUsersFromDb(); _dbUsersAt = Date.now(); }
  catch (_) { return USERS[id] || null; }                       // rescate falló → fallback duro
  return _dbUsers[id] || null;                                  // rescate OK → DB autoritativa
}

// ¿Ve global? Dirección, o CEO de Uruguay (espejo de la lógica client-side ceoViewCountry='all').
export function esGlobal(u) {
  if (!u) return false;
  const r = String(u.rol || '');
  return r.includes('Direcci') || (r.includes('CEO') && u.pais === 'Uruguay');
}

// Código corto por país. Las bases de Notion usan DOS convenciones de País: nombre completo
// ("🇺🇾 Uruguay" en Servicios/Contactos/Propuestas) y código corto ("🇺🇾 UY" en Activos/Solicitudes/
// Documentos/Gastos/Ingresos). El candado de país debe reconocer ambas.
const PAIS_CODE = { Uruguay: 'UY', Brasil: 'BR', Panamá: 'PA', Guatemala: 'GT', México: 'MX', Paraguay: 'PY', Argentina: 'AR' };

// ¿La página (su valor de select 'País') pertenece al país del usuario? Acepta el nombre completo O el
// código corto. NO afloja el candado: un usuario de otro país no matchea ni por nombre ni por código
// (los códigos son de 2 letras mayúsculas al final del select y no colisionan entre países).
export function paisCoincide(paisPagina, userPais) {
  if (!userPais) return true;            // sin país de usuario → no bloquear (comportamiento previo)
  const pp = String(paisPagina || '');
  if (pp.includes(userPais)) return true; // nombre completo ("🇺🇾 Uruguay")
  const code = PAIS_CODE[userPais];
  return !!(code && pp.includes(code));   // código corto ("🇺🇾 UY")
}

// ¿Rol Ventas? Usado para el backstop server-side: Ventas solo accede a Clientes/Contactos
// (ver docs/superpowers/specs/2026-07-03-backstop-ventas-serverside-design.md).
export function esVentas(u) { return !!(u && String(u.rol || '').includes('Ventas')); }
