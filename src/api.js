// ─────────────────────────────────────────────
// CAPA DE RED — todo lo que habla con el backend (proxy Notion, espejo Supabase, R2)
// ─────────────────────────────────────────────
// Extraída de main.js el 2026-07-16. Módulo HOJA (no importa nada de la app) → cualquier módulo futuro
// puede importar callNotion/callDb sin ciclo (misma jugada que t() en i18n.js).
//
// Dependencias de main.js por INYECCIÓN (initApi):
//   · forceRelogin() → qué hacer ante un 401 (limpiar sesión y volver al login).
//   · dbIds          → ids de las 5 bases para rutear lecturas al espejo (_migResource).
// El interruptor central DB_FLAGS (qué tablas leen del espejo) VIVE ACÁ — se cambia acá y se deploya.

let _forceRelogin = () => {};
let _dbIds = {};

// main.js llama esto una vez al arrancar (después de definir sus consts de config).
export function initApi({ forceRelogin, dbIds } = {}) {
  if (forceRelogin) _forceRelogin = forceRelogin;
  if (dbIds) _dbIds = dbIds;
}

// ¿El error vino de la red (sin señal / fetch caído) y no del servidor (4xx/validación)?
export function isNetworkError(e) {
  const m = String(e && e.message || '');
  return (e instanceof TypeError) || /Failed to fetch|NetworkError|Network request failed|Load failed/i.test(m);
}

// Presign + PUT del binario a R2. Reusado por uploadPhoto (online) y processPhotoQueue (reconexión).
// Devuelve la publicUrl. Lanza en error (network o server) para que el llamador decida encolar vs marcar error.
export async function putPhotoToR2(serviceId, fotoType, blob, mime, filename) {
  const resp = await fetch('/api/upload-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + (localStorage.getItem('fc_token') || '') },
    body: JSON.stringify({ serviceId, fotoType, filename, contentType: mime, contentLength: blob.size })
  });
  if (!resp.ok) { const data = await resp.json().catch(() => ({})); const err = new Error(data.error || ('Backend ' + resp.status)); err.status = resp.status; throw err; }
  const { uploadUrl, publicUrl } = await resp.json();
  const putResp = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': mime }, body: blob });
  if (!putResp.ok) { const err = new Error('Upload ' + putResp.status); err.status = putResp.status; throw err; } // status → la cola trata 5xx de R2 como transitorio (no descarta la foto)
  return publicUrl;
}


// Fase 2 (migración): mapea el endpoint de Notion a la tabla nueva. Las LECTURAS se enrutan a Supabase (/api/db)
// cuando el flag de esa tabla está prendido. SERVICIOS: siempre seguro (el proxy descarta el filtro multi-source y
// cada pantalla re-filtra en cliente). Otras tablas: solo cuando NO hay filtro server-side (para no perderlo) → las
// de FINANZAS con filtro de fecha quedan en Notion hasta migrarlas con su filtro (los números no se tocan).
function _migResource(endpoint) {
  const m = /^databases\/([a-z0-9-]+)\/query$/i.exec(endpoint || '');
  if (!m) return null;
  const id = m[1];
  if (id === _dbIds.servicios) return 'servicios';
  if (id === _dbIds.clientes) return 'clientes';
  if (id === _dbIds.propuestas) return 'propuestas';
  if (id === _dbIds.gastos) return 'gastos';
  if (id === _dbIds.ingresos) return 'ingresos';
  return null;
}

// Interruptor CENTRAL de lecturas/sync Supabase: se cambia acá y se deploya (todos los
// dispositivos lo toman al actualizar el sw). localStorage fc_db_<x> = '1' fuerza ON y
// '0' fuerza OFF por dispositivo (override para testing/rollback); sin valor → default central.
// ingresos:true (pre-flip 15/07): las lecturas SIN filtro (Por cobrar, lista de ingresos) van al espejo →
// read-your-writes al editar cobros bajo Supabase-first. Las CON filtro de fecha (KPIs CEO/Finanzas) siguen
// en Notion hasta migrarlas con su filtro (lag ≤60s vía outbox, tolerable en dashboards). gastos queda
// afuera a propósito: la app no edita gastos (create-only) — flipearlo era todo riesgo sin beneficio.
// kpifecha (Día 26): rutea los KPIs de ingresos/gastos con filtro SOLO-fecha (+país) al espejo (/api/db con
// fecha_desde/hasta) → el tablero del CEO/Finanzas sobrevive una caída de Notion. Inerte por defecto hasta
// verificar; el operario (filtro 'Cargado por') NUNCA se rutea (parseKpiFilter lo descarta). Fallback a Notion.
const DB_FLAGS = { clientes: true, servicios: true, propuestas: true, ingresos: true, writesync: true, kpifecha: true };
export function dbFlag(name) {
  const ls = localStorage.getItem('fc_db_' + name);
  if (ls === '1') return true;
  if (ls === '0') return false;
  return !!DB_FLAGS[name];
}

// Renovación silenciosa de sesión (token 7d sliding): el server manda X-Session-Renew con un token
// fresco cuando al vigente le queda <mitad de vida → lo pisamos en localStorage. El equipo activo
// nunca vuelve a tipear el PIN; un dispositivo inactivo expira solo a los 7 días.
// GUARD: solo pisar si el token nuevo expira DESPUÉS que el actual — el SW cachea respuestas con
// headers, y una respuesta cacheada vieja podría traer un X-Session-Renew más viejo (o vencido).
export function captureRenewedToken(response) {
  try {
    const nt = response.headers.get('X-Session-Renew');
    if (!nt) return;
    const expOf = (tk) => {
      try {
        const b = String(tk).split('.')[0].replace(/-/g, '+').replace(/_/g, '/');
        return JSON.parse(atob(b + '='.repeat((4 - b.length % 4) % 4))).exp || 0;
      } catch (_) { return 0; }
    };
    if (expOf(nt) > expOf(localStorage.getItem('fc_token') || '')) localStorage.setItem('fc_token', nt);
  } catch (_) {}
}

// ⚠️ REGLA (bug 14-15/07): `callDb` NO acepta filtros — devuelve la tabla entera. Rutear al espejo una query
// CON `body.filter` significa DESCARTAR el filtro en silencio. Solo se rutea:
//   · servicios → el proxy YA descarta el filtro (base multi-source) y cada pantalla re-filtra en cliente;
//   · cualquier tabla SIN filtro server-side.
// 'clientes' estuvo en la lista de excepción (fix del flip, 14/07) y rompió los DEDUP de clientes: las 3
// queries "¿existe un cliente con este tel/email?" recibían TODOS los clientes → resolveOrCreateClienteId
// vinculaba el servicio/propuesta a un cliente ARBITRARIO y saveContactEdit bloqueaba toda alta con
// "ya existe un cliente...". Read-your-writes de clientes NO necesita esa excepción: las listas se leen sin
// filtro (ya van al espejo) y cada write hace syncAfterWrite del registro.
// Día 26 — detecta un filtro "solo fecha (+país)" de un KPI de ingresos/gastos → ruteable al espejo con
// params. Cualquier OTRA condición (ej. 'Cargado por' del operario, o un 'or') → null = NO ruteable (se
// queda en el proxy, que aplica ese filtro server-side). Devuelve { fechaDesde, fechaHasta, pais } o null.
export function parseKpiFilter(body) {
  const f = body && body.filter;
  if (!f) return null;
  const conds = Array.isArray(f.and) ? f.and : (f.and || f.or) ? null : [f];
  if (!conds) return null;
  let fechaDesde, fechaHasta, pais;
  for (const c of conds) {
    if (c && c.property === 'Fecha' && c.date?.on_or_after) fechaDesde = c.date.on_or_after;
    else if (c && c.property === 'Fecha' && c.date?.on_or_before) fechaHasta = c.date.on_or_before;
    else if (c && c.property === 'País' && c.select?.equals) pais = c.select.equals;
    else return null; // condición no soportada por el espejo → no rutear
  }
  if (!fechaDesde && !fechaHasta) return null; // sin rango de fecha no es un KPI ruteable
  return { fechaDesde, fechaHasta, pais };
}

// Como callDb pero con params de filtro (fecha/país) y SIN el guard "vacío→throw": un KPI filtrado por un
// período puede volver legítimamente vacío (un mes sin gastos). Cae a Notion solo ante ERROR (red/500), no ante [].
async function callDbFiltered(resource, { fechaDesde, fechaHasta, pais }) {
  const qs = new URLSearchParams({ resource });
  if (fechaDesde) qs.set('fecha_desde', String(fechaDesde).slice(0, 10));
  if (fechaHasta) qs.set('fecha_hasta', String(fechaHasta).slice(0, 10));
  if (pais) qs.set('pais', pais);
  const response = await fetch('/api/db?' + qs.toString(), {
    headers: { 'Authorization': 'Bearer ' + (localStorage.getItem('fc_token') || '') },
  });
  if (response.status === 401) { _forceRelogin(); throw new Error('Sesión expirada'); }
  if (!response.ok) throw new Error('DB error ' + response.status);
  captureRenewedToken(response);
  const j = await response.json();
  if (!j || !Array.isArray(j.results)) throw new Error('DB respuesta inválida');
  return j; // [] es legítimo para un filtro por período
}

export async function callNotion(endpoint, method = 'GET', body = null) {
  if (method === 'POST') {
    const resource = _migResource(endpoint);
    // KPI de ingresos/gastos con filtro solo-fecha (+país) → espejo con params (Día 26, gated por kpifecha).
    if ((resource === 'ingresos' || resource === 'gastos') && dbFlag('kpifecha') && body?.filter) {
      const kpi = parseKpiFilter(body);
      if (kpi) { try { return await callDbFiltered(resource, kpi); } catch (_) { /* fallback a Notion abajo */ } }
    }
    if (resource && dbFlag(resource) && (resource === 'servicios' || !body || !body.filter)) {
      try { return await callDb(resource); } catch (e) { /* fallback a Notion abajo */ }
    }
  }
  const response = await fetch('/api/notion', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + (localStorage.getItem('fc_token') || '') },
    body: JSON.stringify({ endpoint, method, body })
  });
  if (response.status === 401) { _forceRelogin(); throw new Error('Sesión expirada'); }
  if (!response.ok) {
    // Incluir el MOTIVO de Notion/proxy en el error (antes solo "API error 400" → imposible diagnosticar).
    let motivo = '';
    try { const j = await response.json(); motivo = j?.message || j?.error || ''; } catch (_) {}
    throw new Error('API error ' + response.status + (motivo ? ': ' + String(motivo).slice(0, 140) : ''));
  }
  captureRenewedToken(response);
  return response.json();
}

// Lee de la base NUEVA (Supabase) vía /api/db, devolviendo el MISMO formato que Notion. Fase 2 (piloto Clientes).
export async function callDb(resource) {
  const response = await fetch('/api/db?resource=' + encodeURIComponent(resource), {
    headers: { 'Authorization': 'Bearer ' + (localStorage.getItem('fc_token') || '') }
  });
  if (response.status === 401) { _forceRelogin(); throw new Error('Sesión expirada'); }
  if (!response.ok) throw new Error('DB error ' + response.status);
  captureRenewedToken(response);
  const j = await response.json();
  // Blindaje (incidente 02/07): un espejo VACÍO (RLS mal aplicada, tabla recreada, wipe) devolvía
  // 200 + [] y la app mostraba todo en blanco sin caer a Notion. Estas listas nunca son legítimamente
  // vacías (clientes/servicios/propuestas siempre tienen filas); si vuelve vacío => throw => fallback.
  if (!j || !Array.isArray(j.results) || j.results.length === 0) throw new Error('DB espejo vacío — fallback a Notion');
  return j;
}

// Fase 3 ("sync tras guardar"): después de un guardado EXITOSO en Notion (la fuente), refleja ESE
// registro en la base nueva (Supabase) vía /api/db-sync (upsert idempotente por notion_id). Es
// fire-and-forget: si falla, NO rompe nada (Notion ya guardó; el sync batch lo recupera después).
// Detrás del flag localStorage.fc_db_writesync (OFF por defecto). resource ∈ {clientes,servicios,propuestas,gastos,ingresos}.
export function syncAfterWrite(notionId, resource) {
  try {
    if (!dbFlag('writesync')) return;
    if (!notionId || !resource) return;
    fetch('/api/db-sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + (localStorage.getItem('fc_token') || '') },
      body: JSON.stringify({ resource, notion_id: notionId }),
    }).catch(() => {});
  } catch (_) {}
}

// Igual que callNotion pero PAGINA (sigue next_cursor) y junta todos los resultados.
// Necesario para sumar año/rango con >100 filas (Gastos/Ingresos). No usar en Servicios
// (multi-data-source: la paginación del fallback de búsqueda no aplica).
export async function callNotionAll(endpoint, body = {}) {
  let all = [], cursor = null, guard = 0;
  do {
    const b = Object.assign({}, body, { page_size: 100 }, cursor ? { start_cursor: cursor } : {});
    const data = await callNotion(endpoint, 'POST', b);
    all = all.concat(data.results || []);
    cursor = data.has_more ? data.next_cursor : null;
    guard++;
  } while (cursor && guard < 40);
  return { results: all };
}

export async function updateServiceProps(pageId, properties) {
  return callNotion(`pages/${pageId}`, 'PATCH', { properties });
}
