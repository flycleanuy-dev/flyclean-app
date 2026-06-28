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
};

export function userById(id) { return USERS[id] || null; }

// ¿Ve global? Dirección, o CEO de Uruguay (espejo de la lógica client-side ceoViewCountry='all').
export function esGlobal(u) {
  if (!u) return false;
  const r = String(u.rol || '');
  return r.includes('Direcci') || (r.includes('CEO') && u.pais === 'Uruguay');
}
