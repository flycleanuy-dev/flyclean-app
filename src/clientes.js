// ─────────────────────────────────────────────
// CLIENTES (CRM) — vista Clientes unificada (coordinador + Finanzas/CEO vía renderClientesView), lista con
// buscador/secciones (mantenimiento 9m, a contactar, cartera), ficha 360 (sheet crear/editar + sectores +
// intermediarios + historial del cliente), WhatsApp/recontacto 1-toque, y el mapa id→nombre para las cards.
// Extraído de main.js el 2026-07-18 (corte #20, 1º de los 3 grandes; patrón puente initClientes).
// ─────────────────────────────────────────────
// El estado que tocan handlers inline (editingContact, contactEditState) queda en main (accesores
// gen-globals) → M. También quedan en main: _coordAllContacts (compartida con propuestas/prospección),
// _coordCliSecciones (la resetea savePropEdit), _contactHistoryCache (la limpia closeEditSheet) y
// PROP_ESTADOS_TERMINALES (la usa la lista de propuestas). contactSheetMode y _contactsContainerId son
// propios del módulo.

import { t, currentLang, pedidoFmtFecha } from './i18n.js';
import { esc, toArr, msNames } from './util.js';
import { esArchivado, fmtMoneda, montoOf, tipoServicioStr } from './calculos.js';
import { callNotion, callDb, callNotionAll, syncAfterWrite, updateServiceProps, dbFlag } from './api.js';

let M = {};
export function initClientes(bridge) { M = bridge; }

const abrirWhatsApp = (...a) => M.abrirWhatsApp(...a);
const cfgRegla = (...a) => M.cfgRegla(...a);
const cfgWa = (...a) => M.cfgWa(...a);
const esVentas = (...a) => M.esVentas(...a);
const genSectorId = (...a) => M.genSectorId(...a);
const getCountryFilter = (...a) => M.getCountryFilter(...a);
const jobRootId = (...a) => M.jobRootId(...a);
const recEnPaisNotion = (...a) => M.recEnPaisNotion(...a);
const renderJornadaGroup = (...a) => M.renderJornadaGroup(...a);
const renderCargarMasButton = (...a) => M.renderCargarMasButton(...a);
const escAttrEdit = (...a) => M.escAttrEdit(...a);

let contactSheetMode = 'edit';

// ¿El mapa id→nombre ya está cargado? (para que renderCoordList de main decida sin tocar el estado interno)
export function clienteNombresCargados() { return !!_clienteNombreById; }
// Update optimista tras crear/asignar un cliente (era setClienteNombre en main — es lógica de esta caché).
export function setClienteNombre(id, nombre) {
  if (!id || !nombre) return;
  if (!_clienteNombreById) _clienteNombreById = {};
  _clienteNombreById[(id || '').replace(/-/g, '')] = nombre;
}

// ── Mapa id→nombre de clientes (CRM interconectado) ────────────────────────────────────────────────
// Cargado UNA vez y cacheado en módulo, para pintar el cliente en las cards de servicios y resolver los
// intermediarios SIN fetchear por card. Lee del espejo (callNotion rutea a /api/db con fallback a Notion),
// con el scope de país que aplique la RLS. `clienteNombreDe` distingue "id sin resolver" (undefined) de
// "sin id" (el caller decide el placeholder).
let _clienteNombreById = null;
let _clienteNombresLoading = false;
export async function ensureClienteNombres() {
  if (_clienteNombreById) return _clienteNombreById;
  try {
    const d = await callNotion(`databases/${M.CONTACTOS_DB_ID}/query`, 'POST', {});
    const norm = x => (x || '').replace(/-/g, '');
    const map = {};
    for (const c of (d.results || [])) {
      const nm = c.properties?.['Nombre / Empresa']?.title?.[0]?.plain_text;
      if (nm) map[norm(c.id)] = nm;
    }
    _clienteNombreById = map;
  } catch (_) { return {}; } // no cacheamos el fallo → reintenta la próxima
  return _clienteNombreById;
}
export function clienteNombreDe(id) {
  if (!id || !_clienteNombreById) return undefined;
  return _clienteNombreById[(id || '').replace(/-/g, '')];
}

export function clienteNombre(c){ return c.properties?.['Nombre / Empresa']?.title?.[0]?.plain_text || ''; }
export function clientePais(c){ return c.properties?.['País']?.select?.name || ''; }

// CONTACTOS
// ─────────────────────────────────────────────
// Contenedor activo de la vista Clientes (antes "Contactos"). El coordinador usa 'coord-content';
// Finanzas/CEO la reusan vía renderClientesView con su propio contenedor. filterContacts/cargarMasContactos
// leen esta variable → la misma lista funciona en cualquier pantalla.
let _contactsContainerId = 'coord-content';

// Trae TODAS las propuestas + servicios (fuente para clasificar clientes en secciones). callDb
// primero (mirror Supabase, más liviano); si falla, cae al fallback de Notion (callNotionAll,
export async function fetchPropsYSvcsParaSecciones() {
  const safe = async (dbName, endpoint) => {
    try { return (await callDb(dbName)).results || []; }
    catch (e) { try { return (await callNotionAll(`databases/${endpoint}/query`, {})).results || []; } catch (e2) { return null; } }
  };
  const [propuestas, servicios] = await Promise.all([
    safe('propuestas', M.PROPUESTAS_DB_ID),
    safe('servicios', M.DB_ID),
  ]);
  return { propuestas, servicios };
}

// Cruza clientes × propuestas × servicios (relation 'Contacto' en ambas, ids normalizados sin
// guiones) y arma las 3 secciones especiales + la cartera activa (residual). Un cliente cae en
// UNA sola sección. Devuelve null si falta alguna fuente (propuestas/servicios == null).
export function computeClienteSecciones(contacts, propuestas, servicios) {
  if (!Array.isArray(propuestas) || !Array.isArray(servicios) || !Array.isArray(contacts)) return null;
  const norm = id => (id || '').replace(/-/g, '');
  const contactoIdsDe = rec => [
    ...(rec.properties?.['Contacto']?.relation || []),
    ...(rec.properties?.['Contactos']?.relation || []),   // fallback legacy (igual que otros matchers del archivo)
  ].map(r => norm(r.id));
  const svcFecha = s => s.properties?.['Fecha programada']?.date?.start || s.created_time || '';
  const propEstado = p => p.properties?.['Estado pipeline']?.select?.name || '';
  const svcsVivos = servicios.filter(s => !esArchivado(s));
  const propsVivas = propuestas.filter(p => !esArchivado(p));
  const hoy = Date.now();

  const mantenimiento = [], sinRespuesta = [], rechazados = [], activa = [];
  contacts.forEach(c => {
    delete c._mantMeses; // se re-deriva abajo; limpiar evita el "hace N meses" viejo si el cliente ya no es de mantenimiento
    // Los clientes en estado de prospección (🎯/📵/🤝/❌) viven en su propia tab 🎯 Prospección,
    // nunca en "Cartera activa" ni en ninguna otra sección de la tab 👥 Clientes.
    const _est = c.properties?.['Estado']?.select?.name || '';
    if (M.PROSPECCION_ESTADOS.includes(_est)) return;
    const cid = norm(c.id);
    const svcsCliente = svcsVivos.filter(s => contactoIdsDe(s).includes(cid));
    const propsCliente = propsVivas.filter(p => contactoIdsDe(p).includes(cid));
    const completados = svcsCliente.filter(s => (s.properties?.['Estado']?.select?.name || '').includes('Completado'));

    if (completados.length) {
      // Candidato a Mantenimiento: el ÚLTIMO completado hace 9+ meses, sin nada más nuevo
      // agendado (completado o no) ni propuesta abierta.
      const ultimaFecha = completados.reduce((max, s) => { const f = svcFecha(s); return f > max ? f : max; }, '');
      const diasDesde = ultimaFecha ? Math.floor((hoy - new Date(ultimaFecha).getTime()) / 86400000) : null;
      const hayMasNuevo = svcsCliente.some(s => svcFecha(s) > ultimaFecha);
      const propAbierta = propsCliente.some(p => !M.PROP_ESTADOS_TERMINALES.includes(propEstado(p)));
      // Recontactado hace poco (Ventas marcó "📞 Contactado" → 'Próximo contacto' futuro): sale de
      // "para recontactar" ese período para no pisarse el equipo; vuelve solo cuando la fecha vence.
      const proxC = (c.properties?.['Próximo contacto']?.date?.start || '').split('T')[0];
      const recontactadoReciente = proxC && proxC > new Date().toISOString().split('T')[0];
      if (diasDesde != null && diasDesde >= cfgRegla('mantenimientoDias') && !hayMasNuevo && !propAbierta && !recontactadoReciente) { c._mantMeses = Math.round(diasDesde / 30.4); mantenimiento.push(c); return; }
      activa.push(c);
      return;
    }

    // SOLO clientes SIN ningún servicio (ni en curso ni asignado — un servicio vivo = cliente activo
    // SIEMPRE, aunque sus propuestas hayan muerto): ¿su única historia son propuestas negativas?
    if (!svcsCliente.length && propsCliente.length) {
      const estados = propsCliente.map(propEstado);
      const soloNegativas = estados.every(e => e === '😶 Sin respuesta' || e === '❌ Rechazada');
      if (soloNegativas) {
        // Si tiene AMBAS (rechazada + sin respuesta) y nada más: Rechazados gana (elección explícita).
        if (estados.includes('❌ Rechazada')) { rechazados.push(c); return; }
        if (estados.includes('😶 Sin respuesta')) { sinRespuesta.push(c); return; }
      }
    }
    activa.push(c);
  });

  return { mantenimiento, sinRespuesta, rechazados, activa };
}

// Trae propuestas+servicios y reclasifica M._coordAllContacts en las secciones especiales. Se llama
// tras cada (re)carga de la tab Clientes (renderClientesView / renderCoordContactos), ANTES de
// renderContactList. Best-effort: si falla, M._coordCliSecciones queda null (fallback a lista plana).
export async function loadClienteSecciones() {
  M._coordCliSecciones = null;
  try {
    const { propuestas, servicios } = await fetchPropsYSvcsParaSecciones();
    M._coordCliSecciones = computeClienteSecciones(M._coordAllContacts, propuestas, servicios);
  } catch (e) { M._coordCliSecciones = null; }
}

export function cargarMasContactos() {
  M._coordVisibleLimit += M.COORD_PAGE_SIZE;
  renderContactList(M._coordAllContacts, true);
}
export function refreshContactsView() {
  // Re-render tras guardar/crear, en el contenedor donde se está mirando.
  return _contactsContainerId === 'coord-content' ? renderCoordContactos() : renderClientesView(_contactsContainerId);
}
// Vista "Clientes" unificada para Finanzas/CEO: misma lista + buscador + crear/editar + ficha 360 que el
// coordinador (renderContactList + openContactSheet). Sin filtro de país (ven todos los clientes).
export async function renderClientesView(containerId) {
  _contactsContainerId = containerId;
  const content = document.getElementById(containerId);
  if (!content) return;
  content.innerHTML = '<div style="text-align:center;padding:40px 0"><div class="spinner" style="margin:0 auto"></div></div>';
  try {
    // Fase 2 (piloto): si el flag está prendido, leer de la base nueva (Supabase); si falla → fallback a Notion.
    const notionQuery = () => callNotion(`databases/${M.CONTACTOS_DB_ID}/query`, 'POST', { sorts: [{ property: 'Nombre / Empresa', direction: 'ascending' }] });
    let data;
    if (dbFlag('clientes')) {
      try { data = await callDb('clientes'); } catch (e) { data = await notionQuery(); }
    } else {
      data = await notionQuery();
    }
    M._coordAllContacts = (data.results || []).filter(c => !esArchivado(c)).filter(recEnPaisNotion); // aislar clientes por país (socios)
    await loadClienteSecciones(); // best-effort: si falla, renderContactList cae a la lista plana
    renderContactList(M._coordAllContacts);
  } catch (e) {
    content.innerHTML = `<div class="coord-empty">No se pudieron cargar los clientes<br><small>${esc(e.message)}</small></div>`;
  }
}

export async function renderCoordContactos() {
  // Ventas VE la cartera desde 2026-07-06 (consulta + recontactar): datos de contacto y "para
  // recontactar" (mantenimiento), SIN la plata (la ficha ya es read-only sin 360 para Ventas). NO crea
  // ni edita clientes (el coord agrega manual). Botones de recontactar en la card (solo Ventas).
  _contactsContainerId = 'coord-content';
  const content = document.getElementById('coord-content');
  content.innerHTML = '<div style="text-align:center;padding:40px 0"><div class="spinner" style="margin:0 auto"></div></div>';
  const myTab = 'contactos';
  try {
    const cf = getCountryFilter();
    const queryBody = { sorts: [{ property: 'Nombre / Empresa', direction: 'ascending' }] };
    if (cf) queryBody.filter = cf;
    const data = await callNotion(`databases/${M.CONTACTOS_DB_ID}/query`, 'POST', queryBody);
    if (M.activeCoordTab !== myTab) return;
    M._coordAllContacts = (data.results || []).filter(c => !esArchivado(c));
    // Ventas también computa las secciones desde 2026-07-06 (tiene lectura de servicios → ve el destacado
    // "🔁 para recontactar"). best-effort: si falla, renderContactList cae a la lista plana.
    await loadClienteSecciones();
    if (M.activeCoordTab !== myTab) return; // el tab pudo cambiar durante el await de arriba
    renderContactList(M._coordAllContacts);
  } catch (e) {
    if (M.activeCoordTab !== myTab) return;
    content.innerHTML = `<div class="coord-empty">${t('coord.error.contactos')}<br><small>${esc(e.message)}</small></div>`;
  }
}

export function renderContactList(contacts, keepLimit) {
  if (!keepLimit) M._coordVisibleLimit = M.COORD_PAGE_SIZE;
  const content = document.getElementById(_contactsContainerId);
  if (!content) return;
  const searchVal = document.getElementById('contact-search-input')?.value?.toLowerCase() || '';
  const matchesSearch = c => {
    const nombre = (c.properties?.['Nombre / Empresa']?.title?.[0]?.plain_text || '').toLowerCase();
    const ciudad = (c.properties?.['Ciudad / Zona']?.rich_text?.[0]?.plain_text || '').toLowerCase();
    return nombre.includes(searchVal) || ciudad.includes(searchVal);
  };
  const searchWrap = `<div class="contact-search-wrap"><input class="contact-search" id="contact-search-input" type="text" placeholder="${t('coord.search.contacts.placeholder')}" oninput="filterContacts(this.value)" value="${searchVal}"/></div>`;
  const newBtn = esVentas() ? '' : `<div style="padding:10px 16px 0"><button class="nueva-prop-btn" onclick="openNewContactSheet()">${t('coord.new.contact')}</button></div>`;
  const cargarMasBtn = remaining => `<div class="cargar-mas-wrap"><button class="cargar-mas-btn" onclick="cargarMasContactos()">↓ ${t('coord.cargar.mas').replace('{n}', Math.min(M.COORD_PAGE_SIZE, remaining))} · ${t('coord.restantes').replace('{n}', remaining)}</button></div>`;

  // Buscando (o sin datos para clasificar en secciones): lista plana de siempre, sin agrupar —
  // el buscador sigue mirando TODOS los clientes, no solo la cartera activa (spec 2026-07-02).
  if (searchVal || !M._coordCliSecciones) {
    const filteredAll = searchVal ? contacts.filter(matchesSearch) : contacts;
    const total = filteredAll.length;
    const filtered = filteredAll.slice(0, M._coordVisibleLimit);
    const remaining = total - filtered.length;
    const listHTML = filtered.length
      ? filtered.map(c => coordContactCard(c)).join('') + (remaining > 0 ? cargarMasBtn(remaining) : '')
      : `<div class="coord-empty" style="margin-top:0">${t('coord.empty.search')}</div>`;
    content.innerHTML = searchWrap + newBtn + `<div style="height:4px"></div>` + listHTML;
  } else {
    // Vista por defecto con secciones: 🔁 Mantenimiento (arriba, expandida) → Cartera activa (look
    // de siempre, con su paginación) → 😶 Sin respuesta / ❌ Rechazados (colapsadas, al fondo).
    // Un cliente cae en UNA sola sección (computeClienteSecciones). Reusa el acordeón genérico
    // (toggleCeoAcc + .ceo-acc-head/.ceo-acc-body) que ya usa el panel financiero.
    const seccionHTML = (id, key, items, expandedDefault) => {
      if (!items.length) return '';
      return `<div id="${id}">` +
        `<button class="ceo-acc-head" onclick="toggleCeoAcc(this)"><span>${t(key)} (${items.length})</span><span class="fin-arrow">${expandedDefault ? '▴' : '▾'}</span></button>` +
        `<div class="ceo-acc-body" style="display:${expandedDefault ? 'block' : 'none'}">${items.map(c => coordContactCard(c)).join('')}</div>` +
        `</div>`;
    };
    const totalActiva = M._coordCliSecciones.activa.length;
    const activaVisible = M._coordCliSecciones.activa.slice(0, M._coordVisibleLimit);
    const remaining = totalActiva - activaVisible.length;
    const carteraHTML = activaVisible.length ? activaVisible.map(c => coordContactCard(c)).join('') + (remaining > 0 ? cargarMasBtn(remaining) : '') : '';
    const todoVacio = !M._coordCliSecciones.mantenimiento.length && !totalActiva && !M._coordCliSecciones.sinRespuesta.length && !M._coordCliSecciones.rechazados.length;

    content.innerHTML = searchWrap + newBtn + `<div style="height:4px"></div>` + (todoVacio
      ? `<div class="coord-empty" style="margin-top:0">${t('coord.empty.search')}</div>`
      : seccionHTML('clientes-mantenimiento-block', 'coord.cli.seccion.mantenimiento', M._coordCliSecciones.mantenimiento, true) +
        carteraHTML +
        seccionHTML('clientes-sinrespuesta-block', 'coord.cli.seccion.sinrespuesta', M._coordCliSecciones.sinRespuesta, false) +
        seccionHTML('clientes-rechazados-block', 'coord.cli.seccion.rechazados', M._coordCliSecciones.rechazados, false));
  }
  // Re-foco al input para no perder cursor durante search
  const inp = document.getElementById('contact-search-input');
  if (inp && document.activeElement !== inp && searchVal) {
    inp.focus();
    inp.setSelectionRange(searchVal.length, searchVal.length);
  }
}

export function filterContacts(val) {
  // Cambio de búsqueda → reset paginación + re-render unificado (reusa renderContactList).
  M._coordVisibleLimit = M.COORD_PAGE_SIZE;
  renderContactList(M._coordAllContacts, true);
}

// Rol Ventas — WhatsApp a un cliente de la cartera (2026-07-06): solo ABRE el canal (no marca nada).
export function abrirWhatsAppCliente(id) {
  const c = (M._coordAllContacts || []).find(x => x.id === id);
  if (!c) return;
  const props = c.properties || {};
  const tel = props['Teléfono / WhatsApp']?.phone_number || '';
  const pais = props['País']?.select?.name || '';
  const persona = props['Interlocutor']?.rich_text?.[0]?.plain_text || '';
  abrirWhatsApp(tel, pais, cfgWa('cliente').replace('{n}', persona ? ' ' + persona : ''));
}

// Rol Ventas — "📞 Contactado" en un cliente de la cartera: MANUAL y separado del WhatsApp (se marca solo
// cuando de verdad se habló/envió). Escribe 'Próximo contacto' = hoy + cfgRegla('ventasSnoozeDias') → el cliente SALE
// de "para recontactar" ese período (computeClienteSecciones lo respeta) y el equipo ve que ya fue
// contactado (no se pisan). Optimista: muta en memoria + re-clasifica; revierte si el write falla.
// Los días del snooze de Ventas viven en cfgRegla('ventasSnoozeDias') (60 por defecto, editable en ⚙️).
// Núcleo único de escritura del snooze: PATCH 'Próximo contacto' + espejo + optimista + re-clasificación.
// Lo usan el "📞 Contactado" de Ventas (hoy+60 fijo) y el "📅 Recontactar a partir de…" del coord (fecha libre).
export async function setProximoContacto(id, fechaISO) {
  await callNotion('pages/' + id, 'PATCH', { properties: { 'Próximo contacto': { date: { start: fechaISO } } } });
  if (typeof syncAfterWrite === 'function') { try { syncAfterWrite(id, 'clientes'); } catch (_) {} }
  const c = (M._coordAllContacts || []).find(x => x.id === id);
  if (c) { c.properties = c.properties || {}; c.properties['Próximo contacto'] = { date: { start: fechaISO } }; }
  await loadClienteSecciones(); // recomputa: el cliente sale de "🔁 para recontactar" (Próximo contacto futuro)
  renderContactList(M._coordAllContacts, true);
}
export async function marcarClienteContactado(id) {
  const btn = document.getElementById('cli-cont-btn-' + id);
  if (btn) { if (btn.disabled) return; btn.disabled = true; btn.textContent = '⏳'; }
  try {
    const prox = new Date(Date.now() + cfgRegla('ventasSnoozeDias') * 86400000).toISOString().split('T')[0];
    await setProximoContacto(id, prox);
  } catch (e) {
    if (btn) { btn.disabled = false; btn.textContent = '📞 ' + t('coord.cli.contactado'); }
    alert(t('sheet.alert.save.error2') + e.message);
  }
}
// "📅 Recontactar a partir de…" (coord/Dirección): muestra el date-picker inline en la card de mantenimiento.
export function toggleRecontactarFecha(id) {
  const box = document.getElementById('recont-fecha-' + id);
  if (box) box.style.display = box.style.display === 'none' ? 'flex' : 'none';
}
export async function confirmarRecontactarFecha(id) {
  const inp = document.getElementById('recont-fecha-input-' + id);
  const fecha = (inp?.value || '').trim();
  const hoy = new Date().toISOString().split('T')[0];
  if (!fecha || fecha <= hoy) { alert(t('coord.cli.recontactar.invalida')); return; }
  const btn = document.getElementById('recont-fecha-ok-' + id);
  if (btn) { if (btn.disabled) return; btn.disabled = true; btn.textContent = '⏳'; }
  try {
    await setProximoContacto(id, fecha);
  } catch (e) {
    if (btn) { btn.disabled = false; btn.textContent = 'OK'; }
    alert(t('sheet.alert.save.error2') + e.message);
  }
}

function coordContactCard(c) {
  const props = c.properties || {};
  const nombreRaw = props['Nombre / Empresa']?.title?.[0]?.plain_text;
  let nombreHTML;
  if (nombreRaw) {
    nombreHTML = esc(nombreRaw);
  } else {
    const idShort = esc((c.id || '').slice(0, 8));
    nombreHTML = `<span style="color:#c67e25">⚠️ Contacto sin nombre (${idShort})</span>`;
    console.warn('[fc] coord: contacto sin nombre', c.id, 'properties keys:', Object.keys(props));
  }
  const estado = props['Estado']?.select?.name || '';
  const tipo = props['Tipo de cliente']?.select?.name || '';
  const pais = props['País']?.select?.name || '';
  const tel = props['Teléfono / WhatsApp']?.phone_number || '';
  const email = props['Email']?.email || '';
  const servicios = (props['Servicio de interés']?.multi_select || []).map(s => s.name).join(' · ');
  const estadoClass = estado.includes('activo') ? 'activo' : estado.includes('Inactivo') ? 'inactivo' : '';
  // R4: chip "🤝 vía X" si el cliente llegó por un intermediario (nombre resuelto desde la cartera ya cargada).
  // Ventas NO ve el modelo de intermediarios (igual que el 360) → no mostrarle "quién trajo a quién".
  const intId = props['Intermediario']?.relation?.[0]?.id || '';
  let viaBadge = '';
  if (intId && !esVentas()) {
    const im = (M._coordAllContacts || []).find(x => x.id === intId);
    const intNombre = (im?.properties?.['Nombre / Empresa']?.title?.[0]?.plain_text) || clienteNombreDe(intId) || '';
    viaBadge = `<span class="coord-tag">🤝 ${t('sheet.contact.via')} ${esc(intNombre || '…')}</span>`;
  }
  const proxContacto = (props['Próximo contacto']?.date?.start || '').split('T')[0];
  const recontactadoReciente = proxContacto && proxContacto > new Date().toISOString().split('T')[0];
  // Botones de recontactar SOLO para Ventas (es su trabajo). 💬 solo ABRE el canal; 📞 Contactado es
  // MANUAL y separado (se marca cuando de verdad se habló/envió — no al abrir WhatsApp). stopPropagation
  // para no abrir la ficha al tocarlos.
  const botonesVentas = (esVentas() && tel) ? `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">
      <button class="estado-btn" style="color:#25D366;border-color:#25D366" onclick="event.stopPropagation();abrirWhatsAppCliente('${esc(c.id)}')">💬 WhatsApp</button>
      <button class="estado-btn" id="cli-cont-btn-${esc(c.id)}" onclick="event.stopPropagation();marcarClienteContactado('${esc(c.id)}')">📞 ${t('coord.cli.contactado')}</button>
    </div>` : '';
  // Botón "→ Crear propuesta" para el COORD en clientes de mantenimiento (9 meses sin trabajo): abre una
  // propuesta nueva ya asociada al cliente. Al guardarla, el cliente sale SOLO de la sección (la lógica
  // !propAbierta de computeClienteSecciones lo pasa a "Cartera activa"). Comercial 2026-07-09.
  // Coord/Dirección en clientes de mantenimiento: "→ Crear propuesta" + "📅 Recontactar a partir de…"
  // (posponer con fecha libre — ej. el vidrio sigue limpio y no tiene sentido vender a los 9 meses).
  const mananaISO = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const botonCoordMant = (!esVentas() && Number.isFinite(c._mantMeses)) ? `<div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap" onclick="event.stopPropagation()">
      <button class="estado-btn" style="color:var(--green);border-color:var(--green)" onclick="openNewPropSheet('${esc(c.id)}')">→ ${t('coord.cli.crearprop')}</button>
      <button class="estado-btn" onclick="toggleRecontactarFecha('${esc(c.id)}')">📅 ${t('coord.cli.recontactar.btn')}</button>
    </div>
    <div id="recont-fecha-${esc(c.id)}" style="display:none;gap:6px;align-items:center;margin-top:6px" onclick="event.stopPropagation()">
      <input type="date" id="recont-fecha-input-${esc(c.id)}" class="edit-date-input" style="flex:1;margin:0" min="${mananaISO}"/>
      <button class="estado-btn" id="recont-fecha-ok-${esc(c.id)}" onclick="confirmarRecontactarFecha('${esc(c.id)}')">OK</button>
    </div>` : '';
  // Badge del snooze CON la fecha: se ve hasta cuándo está pospuesto (antes decía solo "Recontactado").
  const proxFmt = recontactadoReciente ? `${proxContacto.slice(8, 10)}/${proxContacto.slice(5, 7)}/${proxContacto.slice(0, 4)}` : '';
  return `<div class="contact-card" onclick="openContactSheet('${esc(c.id)}')">
    <div class="contact-name">${nombreHTML}</div>
    <div class="contact-badges">
      ${estado ? `<span class="contact-estado ${estadoClass}">${esc(estado)}</span>` : ''}
      ${tipo ? `<span class="coord-tag">${esc(tipo)}</span>` : ''}
      ${pais ? `<span class="coord-tag">${esc(pais)}</span>` : ''}
      ${viaBadge}
    </div>
    ${servicios ? `<div class="contact-detail">🛠 ${esc(servicios)}</div>` : ''}
    ${tel ? `<div class="contact-detail">📞 ${esc(tel)}</div>` : ''}
    ${email ? `<div class="contact-detail">✉️ ${esc(email)}</div>` : ''}
    ${Number.isFinite(c._mantMeses) ? `<div class="contact-detail" style="color:var(--red);font-weight:600">🔴 ${t('coord.cli.mant.meses').replace('{n}', c._mantMeses)}</div>` : ''}
    ${recontactadoReciente ? `<div class="contact-detail" style="color:var(--green);font-weight:600">⏸ ${t('coord.cli.recontactar.desde').replace('{f}', proxFmt)}</div>` : ''}
    ${botonesVentas}
    ${botonCoordMant}
  </div>`;
}

function buildContactSheetBody(mode) {
  const s = M.contactEditState;
  const ESTADOS = ['🆕 Lead', '✅ Cliente activo', '⏸️ Inactivo'];
  const TIPOS = ['🏢 Administración', '🏗️ Constructora', '🏠 Particular'];
  const PAISES = ['🇺🇾 Uruguay', '🇧🇷 Brasil', '🇵🇦 Panamá', '🇬🇹 Guatemala', '🇲🇽 México'];
  const CANALES = ['💬 WhatsApp', '📱 Redes sociales', '🤝 Recomendación', '🚶 Captación proactiva', '📧 Email'];
  const SERVICIOS = ['🏢 Fachada', '🪟 Vidrios', '☀️ Paneles solares', '🏠 Techos/Tejas', '🌴 Ducha a palmeras'];

  function btnGroup(label, key, options) {
    return `<div class="edit-section"><div class="edit-section-label">${label}</div><div class="estado-btns">${
      options.map(o => `<button class="estado-btn ${s[key] === o ? 'active' : ''}" onclick="contactSetField('${key}',this,'${o.replace(/'/g,"\\'")}')">${o}</button>`).join('')
    }</div></div>`;
  }

  function multiGroup(label, key, options) {
    const arr = s[key] || [];
    return `<div class="edit-section"><div class="edit-section-label">${label}</div><div class="multi-toggle-grid">${
      options.map(o => `<button class="multi-toggle-btn ${arr.includes(o) ? 'active' : ''}" onclick="contactToggleMulti('${key}',this,'${o.replace(/'/g,"\\'")}')">${o}</button>`).join('')
    }</div></div>`;
  }

  return `<div class="edit-section"><div class="edit-section-label">${t('sheet.contact.section.nombre')}</div>
        <input type="text" id="contact-nombre-input" class="edit-date-input" placeholder="${t('sheet.contact.nombre.placeholder')}" value="${esc(s.nombre || '')}" oninput="contactEditState.nombre=this.value" style="font-size:14px"/></div>` +
    btnGroup(t('sheet.contact.section.estado'), 'estado', ESTADOS) +
    btnGroup(t('sheet.contact.section.tipo'), 'tipo', TIPOS) +
    btnGroup(t('sheet.contact.section.pais'), 'pais', PAISES) +
    btnGroup(t('sheet.contact.section.canal'), 'canal', CANALES) +
    multiGroup(t('sheet.contact.section.servicios'), 'servicios', SERVICIOS) +
    `<div class="edit-section"><div class="edit-section-label">${t('sheet.contact.section.tel')}</div>
      <input type="tel" class="edit-date-input" placeholder="${t('sheet.contact.tel.placeholder')}" value="${s.tel || ''}" oninput="contactEditState.tel=this.value"/></div>` +
    `<div class="edit-section"><div class="edit-section-label">${t('sheet.contact.section.email')}</div>
      <input type="email" class="edit-date-input" placeholder="${t('sheet.contact.email.placeholder')}" value="${s.email || ''}" oninput="contactEditState.email=this.value"/></div>` +
    `<div class="edit-section"><div class="edit-section-label">${t('sheet.contact.section.ciudad')}</div>
      <input type="text" class="edit-date-input" placeholder="${t('sheet.contact.ciudad.placeholder')}" value="${s.ciudad || ''}" oninput="contactEditState.ciudad=this.value"/></div>` +
    `<div class="edit-section"><div class="edit-section-label">${t('sheet.contact.section.mapa')}</div>
      <div style="display:flex;gap:8px;align-items:center">
        <input type="url" id="contact-mapa-input" class="edit-date-input" style="flex:1" placeholder="${t('sheet.contact.mapa.placeholder')}" value="${esc(s.mapa || '')}" oninput="contactEditState.mapa=this.value"/>
        <button type="button" class="estado-btn" style="white-space:nowrap" onclick="contactOpenMapa()">${t('sheet.contact.mapa.abrir')}</button>
      </div></div>` +
    (mode === 'edit'
      ? `<div class="edit-section"><div class="edit-section-label">${t('sheet.contact.section.recontacto')}</div>
          <div class="edit-section-hint" style="font-size:11px;color:var(--text3);margin-bottom:6px">${t('sheet.contact.recontacto.hint')}</div>
          <input type="date" class="edit-date-input" value="${esc(s.proximoContacto || '')}" onchange="contactEditState.proximoContacto=this.value"/></div>
         <div class="edit-section"><div class="edit-section-label">${t('sheet.contact.section.intermediario')}</div>
          <div id="contact-traidopor-row"></div>
          <select id="contact-intermediario-select" class="edit-date-input" onchange="contactIntermediarioChanged(this.value)">
            <option value="">${t('sheet.contact.intermediario.none')}</option>
            <option value="__loading__" disabled>${t('sheet.contact.intermediario.loading')}</option>
          </select></div>
         <div id="contact-traidos-container"></div>`
      : '') +
    `<div class="edit-section"><div class="edit-section-label">${t('sheet.contact.section.interlocutor')}</div>
      <input type="text" class="edit-date-input" placeholder="${t('sheet.contact.interlocutor.placeholder')}" value="${s.interlocutor || ''}" oninput="contactEditState.interlocutor=this.value"/></div>` +
    `<div class="edit-section"><div class="edit-section-label">${t('sheet.contact.section.notas')}</div>
      <textarea class="edit-date-input" rows="3" style="resize:none;height:80px" placeholder="${t('sheet.contact.notas.placeholder')}" oninput="contactEditState.notas=this.value">${esc(s.notas || '')}</textarea></div>` +
    `<div class="edit-section"><div class="edit-section-label">${t('sheet.contact.section.sectores')}</div>
      <div class="edit-section-hint" style="font-size:11px;color:var(--text3);margin-bottom:8px">${t('sheet.contact.sectores.hint')}</div>
      <div id="contact-sectores-list"></div>
      <div style="display:flex;gap:8px;margin-top:8px">
        <input type="text" id="contact-sector-input" class="edit-date-input" style="flex:1;margin-bottom:0" placeholder="${t('sheet.contact.sectores.placeholder')}" onkeydown="if(event.key==='Enter'){event.preventDefault();contactAddSector();}"/>
        <button type="button" class="estado-btn" style="white-space:nowrap" onclick="contactAddSector()">${t('sheet.contact.sectores.add')}</button>
      </div></div>` +
    (mode === 'edit'
      ? ((!esVentas() ? `<div class="edit-section"><button class="nueva-prop-btn" style="width:100%" onclick="openNewServiceSheetForContact(editingContact && editingContact.id)">${t('sheet.contact.new.servicio')}</button></div>` : '')) +
        `<div class="edit-section" style="padding-bottom:0"><div class="edit-section-label">${t('contact.history.title')}</div>
          <div id="contact-history-container"><div class="history-loading">${t('contact.history.loading')}</div></div>
         </div>`
      : '');
}

export async function openContactSheet(pageId) {
  contactSheetMode = 'edit';
  M.editingContact = (M._coordAllContacts || []).find(c => c.id === pageId);
  // Blindaje: si la lista todavía no terminó de cargar (race en Finanzas/CEO), traer la ficha de Notion por id
  // → la ficha NUNCA sale vacía, sin importar el timing.
  if (!M.editingContact) {
    try { M.editingContact = await callNotion('pages/' + pageId, 'GET'); } catch (_) {}
  }
  if (!M.editingContact || !M.editingContact.properties) return;
  const props = M.editingContact.properties || {};
  M.contactEditState = {
    nombre: props['Nombre / Empresa']?.title?.[0]?.plain_text || '',
    estado: props['Estado']?.select?.name || '',
    tipo: props['Tipo de cliente']?.select?.name || '',
    pais: props['País']?.select?.name || '',
    canal: props['Canal de captación']?.select?.name || '',
    servicios: (props['Servicio de interés']?.multi_select || []).map(s => s.name),
    tel: props['Teléfono / WhatsApp']?.phone_number || '',
    email: props['Email']?.email || '',
    ciudad: props['Ciudad / Zona']?.rich_text?.[0]?.plain_text || '',
    interlocutor: props['Interlocutor']?.rich_text?.[0]?.plain_text || '',
    notas: props['Notas']?.rich_text?.[0]?.plain_text || '',
    mapa: props['Mapa']?.url || '',
    intermediario: props['Intermediario']?.relation?.[0]?.id || '',
    proximoContacto: (props['Próximo contacto']?.date?.start || '').split('T')[0],
    _proximoContactoOrig: (props['Próximo contacto']?.date?.start || '').split('T')[0], // para escribir solo si cambió
    sectores: (() => { try { return JSON.parse(props['Sectores']?.rich_text?.[0]?.plain_text || '[]'); } catch (_) { return []; } })()
  };
  // F1 (escribir SOLO lo cambiado): snapshot de los originales para que al guardar no se re-escriban campos que el
  // usuario no tocó → evita el "echo-back" que pisaría datos buenos cuando la tabla clientes pase a Supabase-first.
  Object.assign(M.contactEditState, {
    _nombreOrig: M.contactEditState.nombre, _estadoOrig: M.contactEditState.estado, _tipoOrig: M.contactEditState.tipo,
    _paisOrig: M.contactEditState.pais, _canalOrig: M.contactEditState.canal, _telOrig: M.contactEditState.tel,
    _emailOrig: M.contactEditState.email, _ciudadOrig: M.contactEditState.ciudad, _interlocutorOrig: M.contactEditState.interlocutor,
    _notasOrig: M.contactEditState.notas, _mapaOrig: M.contactEditState.mapa, _intermediarioOrig: M.contactEditState.intermediario,
    _serviciosOrig: JSON.stringify(M.contactEditState.servicios || []), _sectoresOrig: JSON.stringify(M.contactEditState.sectores || []),
  });
  const nombre = props['Nombre / Empresa']?.title?.[0]?.plain_text || t('common.sinnombre');
  document.getElementById('contact-sheet-title').textContent = nombre;
  document.getElementById('contact-sheet-sub').textContent = M.contactEditState.tipo || t('sheet.contact.title.default');
  document.getElementById('contact-sheet-body').innerHTML = buildContactSheetBody('edit');
  renderContactSectores();
  // Permisos: CEO = solo lectura (ve TODO, no toca, salvo el nombre). Finanzas / Coordinador /
  // Dirección = pueden editar. Ventas también solo lectura, pero SIN la excepción de CEO: la
  // ficha de un prospecto queda 100% no-editable (junta/madura prospectos, no edita el 360).
  const esCEOSoloLectura = (M.currentUser?.role || '').includes('CEO');
  const soloLectura = esCEOSoloLectura || esVentas();
  const btn = document.getElementById('contact-save-btn');
  const body = document.getElementById('contact-sheet-body');
  if (soloLectura) {
    if (btn) btn.style.display = 'none';
    body.querySelectorAll('input, select, textarea').forEach(el => { el.disabled = true; });
    body.querySelectorAll('.estado-btn').forEach(el => { el.style.pointerEvents = 'none'; el.style.opacity = '0.6'; });
    if (esCEOSoloLectura) {
      // El CEO puede editar SOLO el nombre (no el resto). Ventas no entra acá: para Ventas
      // la ficha queda completamente bloqueada, botón Guardar incluido.
      const nombreInput = document.getElementById('contact-nombre-input');
      if (nombreInput) nombreInput.disabled = false;
      if (btn) { btn.style.display = ''; btn.textContent = t('btn.save.notion'); btn.disabled = false; }
    }
  } else if (btn) {
    btn.style.display = ''; btn.textContent = t('btn.save.notion'); btn.disabled = false;
  }
  document.getElementById('contact-overlay').classList.add('open');

  // Cargar historial e intermediarios async (no bloquean apertura del sheet)
  // Ventas nunca ve el historial financiero (propuestas/servicios/ingresos) del cliente:
  // ni se lanza el fetch ni queda el spinner de "Cargando..." colgado en la ficha.
  if (esVentas()) {
    const historyContainer = document.getElementById('contact-history-container');
    const historySection = historyContainer?.closest('.edit-section');
    if (historySection) historySection.style.display = 'none';
  } else {
    loadContactHistory(pageId);
  }
  // Ventas tampoco carga los intermediarios (traería toda la cartera como <option> al DOM).
  if (!esVentas()) loadContactIntermediarios(pageId);
  // R4: "Traído por" (directo) + "Clientes traídos" (inverso). Solo no-Ventas (no ve el 360).
  if (!esVentas()) renderIntermediarioVistas(pageId);
}

// R4: vistas de intermediario en la carta del cliente (ambos sentidos), resueltas con el mapa id→nombre.
async function renderIntermediarioVistas(pageId) {
  try {
    await ensureClienteNombres();
    // "Traído por X" (lado directo, read-only clickeable) arriba del selector.
    const row = document.getElementById('contact-traidopor-row');
    if (row) {
      const intId = M.contactEditState.intermediario;
      row.innerHTML = intId
        ? `<div style="font-size:12px;color:var(--text2);margin-bottom:6px;cursor:pointer" onclick="verClienteDesdeContacto('${esc(intId)}')">🤝 ${t('sheet.contact.traidopor')}: <span style="text-decoration:underline">${esc(clienteNombreDe(intId) || '…')}</span> ↗</div>`
        : '';
    }
    // "Clientes traídos (N)" (lado inverso del dual Intermediario↔Clientes traídos). Se COMPUTA escaneando la lista
    // de clientes por su Intermediario (lado DIRECTO, siempre fresco en el espejo) en vez de leer la relación inversa
    // del raw del intermediario: ese lado inverso no se re-mapea cuando clientes es Supabase-first → quedaría stale.
    const box = document.getElementById('contact-traidos-container');
    if (!box) return;
    const _normId = x => (x || '').replace(/-/g, '');
    const traidos = (M._coordAllContacts || []).filter(c => _normId(c.properties?.['Intermediario']?.relation?.[0]?.id) === _normId(pageId));
    if (!traidos.length) { box.innerHTML = ''; return; }
    const rows = traidos.map(c => {
      const nm = c.properties?.['Nombre / Empresa']?.title?.[0]?.plain_text || '(cliente)';
      return `<div class="equipo-card" style="cursor:pointer" onclick="verClienteDesdeContacto('${esc(c.id)}')"><div style="flex:1;min-width:0"><div class="equipo-name">🏢 ${esc(nm)}</div></div><span class="user-arrow">↗</span></div>`;
    }).join('');
    box.innerHTML = `<div class="edit-section"><div class="edit-section-label">🤝 ${t('sheet.contact.traidos.title')} (${traidos.length})</div>${rows}</div>`;
  } catch (_) {}
}
// Navegar de una ficha de cliente a otra (mismo overlay): cerrar → delay → reabrir con el id destino.
export function verClienteDesdeContacto(id) { if (!id) return; closeContactSheet(); setTimeout(() => openContactSheet(id), 250); }

export function openNewContactSheet() {
  contactSheetMode = 'create';
  M.editingContact = null;
  M.contactEditState = { nombre: '', estado: '🆕 Lead', tipo: '', pais: '🇺🇾 Uruguay', canal: '', servicios: [], tel: '', email: '', ciudad: '', interlocutor: '', notas: '', mapa: '', intermediario: '', sectores: [] };
  document.getElementById('contact-sheet-title').textContent = t('sheet.contact.title.nuevo');
  document.getElementById('contact-sheet-sub').textContent = t('sheet.contact.subtitle.nuevo');
  document.getElementById('contact-sheet-body').innerHTML = buildContactSheetBody('create');
  renderContactSectores();
  const btn = document.getElementById('contact-save-btn');
  btn.textContent = t('btn.create.notion'); btn.disabled = false;
  document.getElementById('contact-overlay').classList.add('open');
}

export function contactSetField(key, el, val) {
  // País y Estado obligatorios; el resto: tocar el activo lo vacía (toggle / deseleccionar).
  const obligatorio = (key === 'pais' || key === 'estado');
  if (!obligatorio && el.classList.contains('active')) {
    M.contactEditState[key] = '';
    el.classList.remove('active');
  } else {
    M.contactEditState[key] = val;
    el.closest('.estado-btns').querySelectorAll('.estado-btn').forEach(b => b.classList.remove('active'));
    el.classList.add('active');
  }
}

export function contactToggleMulti(key, el, val) {
  const arr = M.contactEditState[key] || [];
  const idx = arr.indexOf(val);
  if (idx === -1) arr.push(val); else arr.splice(idx, 1);
  M.contactEditState[key] = arr;
  el.classList.toggle('active', arr.includes(val));
}

export function contactOpenMapa() {
  const u = (M.contactEditState.mapa || '').trim();
  if (!u) { alert(t('sheet.contact.mapa.none')); return; }
  window.open(u, '_blank', 'noopener');
}

export function renderContactSectores() {
  const box = document.getElementById('contact-sectores-list');
  if (!box) return;
  const arr = Array.isArray(M.contactEditState.sectores) ? M.contactEditState.sectores : [];
  box.innerHTML = arr.length
    ? arr.map(sec => `<div class="sector-row" style="display:flex;gap:6px;align-items:center;margin-bottom:6px">
        <input type="text" class="edit-date-input" style="flex:1;margin-bottom:0" value="${escAttrEdit(sec.nombre)}" oninput="contactRenameSector('${sec.id}',this.value)"/>
        <button type="button" class="estado-btn" style="padding:8px 10px;color:var(--danger,#e5484d)" onclick="contactRemoveSector('${sec.id}')">✕</button>
      </div>`).join('')
    : `<div style="font-size:12px;color:var(--text3);font-style:italic">${t('sheet.contact.sectores.empty')}</div>`;
}

export function contactAddSector() {
  const input = document.getElementById('contact-sector-input');
  const nombre = (input?.value || '').trim();
  if (!nombre) return;
  if (!Array.isArray(M.contactEditState.sectores)) M.contactEditState.sectores = [];
  M.contactEditState.sectores.push({ id: genSectorId(), nombre });
  if (input) input.value = '';
  renderContactSectores();
}

export function contactRenameSector(id, value) {
  const sec = (M.contactEditState.sectores || []).find(s => s.id === id);
  if (sec) sec.nombre = value;
}

export function contactRemoveSector(id) {
  M.contactEditState.sectores = (M.contactEditState.sectores || []).filter(s => s.id !== id);
  renderContactSectores();
}

let _contactIntermediarios = null;
export async function loadContactIntermediarios(selfId) {
  const sel = document.getElementById('contact-intermediario-select');
  if (!sel) return;
  try {
    if (!_contactIntermediarios) {
      if (Array.isArray(M._coordAllContacts) && M._coordAllContacts.length) {
        _contactIntermediarios = M._coordAllContacts;
      } else {
        const d = await callNotion(`databases/${M.CONTACTOS_DB_ID}/query`, 'POST', { sorts: [{ property: 'Nombre / Empresa', direction: 'ascending' }] });
        _contactIntermediarios = d.results || [];
      }
    }
    const tit = c => c.properties?.['Nombre / Empresa']?.title?.[0]?.plain_text || '(sin nombre)';
    const cur = M.contactEditState.intermediario || '';
    sel.innerHTML = `<option value="">${t('sheet.contact.intermediario.none')}</option>` +
      _contactIntermediarios.slice()
        .filter(c => c.id !== selfId)
        .sort((a, b) => tit(a).localeCompare(tit(b)))
        .map(c => `<option value="${esc(c.id)}">${esc(tit(c))}</option>`).join('');
    sel.value = cur;
    // CEO solo lectura: el bloque soloLectura de openContactSheet ya deshabilita selects del body,
    // pero ese bloque corre ANTES de poblar este select async → re-aplicar el disabled si corresponde.
    if (M.currentUser?.role && M.currentUser.role.includes('CEO')) sel.disabled = true;
  } catch (_) { /* el form sirve igual: queda "Directo" */ }
}
export function contactIntermediarioChanged(val) {
  M.contactEditState.intermediario = val || '';
}

export function contactOverlayClick(e) { if (e.target.id === 'contact-overlay') closeContactSheet(); }
export function closeContactSheet() { document.getElementById('contact-overlay').classList.remove('open'); M.editingContact = null; }

export async function saveContactEdit() {
  const esCEO = !!(M.currentUser?.role && M.currentUser.role.includes('CEO'));
  const s = M.contactEditState;
  const nombre = String(s.nombre || '').trim();
  if (!nombre) { alert(t('sheet.contact.error.nombre')); return; }
  const btn = document.getElementById('contact-save-btn');
  btn.textContent = t('btn.saving'); btn.disabled = true;
  try {
    // CEO: SOLO el nombre (el resto de la ficha es solo-lectura).
    if (esCEO) {
      if (contactSheetMode !== 'edit' || !M.editingContact) { btn.disabled = false; return; }
      await updateServiceProps(M.editingContact.id, { 'Nombre / Empresa': { title: [{ text: { content: nombre } }] } });
      syncAfterWrite(M.editingContact.id, 'clientes');
      closeContactSheet(); await refreshContactsView(); return;
    }
    const props = {};
    // F1: en EDICIÓN cada campo se escribe SOLO si cambió vs su snapshot (_XOrig) → nunca re-escribe un valor
    // que el usuario no tocó. En CREATE se escribe todo (registro nuevo, no hay echo-back). chg() decide.
    const edit = contactSheetMode === 'edit';
    const chg = (cur, orig) => !edit || cur !== orig;
    if (chg(s.estado, s._estadoOrig) && s.estado) props['Estado'] = { select: { name: s.estado } };
    if (chg(s.tipo, s._tipoOrig)) props['Tipo de cliente'] = { select: s.tipo ? { name: s.tipo } : null };
    if (chg(s.pais, s._paisOrig) && s.pais) props['País'] = { select: { name: s.pais } };
    if (chg(s.canal, s._canalOrig)) props['Canal de captación'] = { select: s.canal ? { name: s.canal } : null };
    if (chg(JSON.stringify(s.servicios || []), s._serviciosOrig)) props['Servicio de interés'] = { multi_select: (s.servicios || []).map(n => ({ name: n })) };
    if (chg(s.tel, s._telOrig)) props['Teléfono / WhatsApp'] = { phone_number: s.tel || null };
    if (chg(s.email, s._emailOrig)) props['Email'] = { email: s.email || null };
    if (chg(s.ciudad, s._ciudadOrig)) props['Ciudad / Zona'] = { rich_text: s.ciudad ? [{ text: { content: s.ciudad } }] : [] };
    if (chg(s.mapa, s._mapaOrig)) props['Mapa'] = { url: s.mapa && s.mapa.trim() ? s.mapa.trim() : null };
    if (contactSheetMode !== 'create' && chg(s.intermediario, s._intermediarioOrig))
      props['Intermediario'] = { relation: s.intermediario ? [{ id: s.intermediario }] : [] };
    // Recontacto: escribir SOLO si el usuario lo cambió (así no pisamos el snooze de Ventas sin querer).
    if (contactSheetMode !== 'create' && s.proximoContacto !== s._proximoContactoOrig)
      props['Próximo contacto'] = s.proximoContacto ? { date: { start: s.proximoContacto } } : { date: null };
    if (chg(s.interlocutor, s._interlocutorOrig)) props['Interlocutor'] = { rich_text: s.interlocutor ? [{ text: { content: s.interlocutor } }] : [] };
    if (chg(s.notas, s._notasOrig)) props['Notas'] = { rich_text: s.notas ? [{ text: { content: s.notas } }] : [] };
    {
      const secs = (Array.isArray(s.sectores) ? s.sectores : [])
        .map(x => ({ id: x.id, nombre: String(x.nombre || '').trim() }))
        .filter(x => x.nombre);
      if (chg(JSON.stringify(s.sectores || []), s._sectoresOrig)) props['Sectores'] = { rich_text: secs.length ? [{ text: { content: JSON.stringify(secs) } }] : [] };
    }
    if (chg(nombre, s._nombreOrig)) props['Nombre / Empresa'] = { title: [{ text: { content: nombre } }] };

    if (contactSheetMode === 'create') {
      const orf = [];
      if (s.tel) orf.push({ property: 'Teléfono / WhatsApp', phone_number: { equals: s.tel } });
      if (s.email) orf.push({ property: 'Email', email: { equals: s.email } });
      if (orf.length) {
        const dup = await callNotion(`databases/${M.CONTACTOS_DB_ID}/query`, 'POST', { filter: orf.length === 1 ? orf[0] : { or: orf }, page_size: 1 }).catch(() => ({ results: [] }));
        if (dup.results && dup.results.length) {
          const exNom = dup.results[0].properties?.['Nombre / Empresa']?.title?.[0]?.plain_text || 'otro cliente';
          btn.textContent = t('btn.create.notion'); btn.disabled = false;
          alert('Ya existe un cliente con ese teléfono o email: "' + exNom + '". Editá el existente en vez de duplicar.');
          return;
        }
      }
      const created = await callNotion('pages', 'POST', { parent: { database_id: M.CONTACTOS_DB_ID }, properties: props });
      syncAfterWrite(created?.id, 'clientes');
    } else {
      await updateServiceProps(M.editingContact.id, props);
      syncAfterWrite(M.editingContact.id, 'clientes');
    }
    _contactIntermediarios = null; // forzar recarga: cambió la lista/relaciones
    M._propContactos = null;         // idem para el selector de cliente en Propuestas (un cliente nuevo debe aparecer ahí)
    closeContactSheet();
    await refreshContactsView();
  } catch (e) {
    btn.textContent = contactSheetMode === 'create' ? t('btn.create.notion') : t('btn.save.notion');
    btn.disabled = false;
    alert(t('sheet.alert.save.error2') + e.message);
  }
}

// ─────────────────────────────────────────────
// HISTORIAL DEL CLIENTE — propuestas + relevamientos + servicios + ingresos
// ─────────────────────────────────────────────

export async function loadContactHistory(contactId) {
  if (!contactId) return;
  const container = document.getElementById('contact-history-container');
  if (!container) return;

  // Usar cache si existe
  if (M._contactHistoryCache[contactId]) {
    renderContactHistory(M._contactHistoryCache[contactId]);
    return;
  }

  // Lanzar las 4 queries en paralelo
  const propFilter = { property: 'Contacto', relation: { contains: contactId } };
  const svcRelevFilter = { and: [
    { property: 'Contacto', relation: { contains: contactId } },
    { property: 'Tipo de registro', select: { equals: '🔍 Relevamiento' } }
  ]};
  // Sin filtro de Estado (auditoría 2026-07-09): el historial del cliente mostraba SOLO Completados y
  // escondía lo agendado (Pendiente/Asignado/En curso). Traemos la orden de trabajo en cualquier estado.
  const svcCompletoFilter = { and: [
    { property: 'Contacto', relation: { contains: contactId } },
    { property: 'Tipo de registro', select: { equals: '📋 Orden de trabajo' } }
  ]};
  const ingresoFilter = { property: 'Cuenta', relation: { contains: contactId } };

  try {
    const [propRes, relevRes, svcRes, ingRes] = await Promise.all([
      callNotion(`databases/${M.PROPUESTAS_DB_ID}/query`, 'POST', { filter: propFilter }).catch(() => ({ results: [] })),
      callNotion(`databases/${M.DB_ID}/query`, 'POST', { filter: svcRelevFilter }).catch(() => ({ results: [] })),
      callNotion(`databases/${M.DB_ID}/query`, 'POST', { filter: svcCompletoFilter }).catch(() => ({ results: [] })),
      callNotion(`databases/${M.INGRESOS_DB_ID}/query`, 'POST', { filter: ingresoFilter }).catch(() => ({ results: [] }))
    ]);

    // El proxy hace search fallback para Servicios (multi-source) que ignora el filter
    // → filtrar cliente-side por contactId Y tipoReg
    // Además del contacto/tipo, filtramos por país (recEnPaisNotion) para que un usuario de un país no vea
    // servicios de otro aunque entre por un id de contacto ajeno.
    const relevs = (relevRes.results || []).filter(s => {
      const tipoReg = s.properties?.['Tipo de registro']?.select?.name || '';
      const contactos = s.properties?.['Contacto']?.relation || [];
      return tipoReg.includes('Relevamiento') && contactos.some(r => r.id === contactId) && recEnPaisNotion(s);
    });
    const svcs = (svcRes.results || []).filter(s => {
      const tipoReg = s.properties?.['Tipo de registro']?.select?.name || '';
      const estado = s.properties?.['Estado']?.select?.name || '';
      const contactos = s.properties?.['Contacto']?.relation || [];
      // Datos viejos: registros sin Tipo de registro cargado cuentan como Orden de trabajo normal
      // (nunca como Jornada/Relevamiento/Prueba, que exigen su propio tipo explícito más abajo).
      const esOrdenOSinTipo = !tipoReg || tipoReg.includes('Orden de trabajo');
      // Cualquier estado (agendado + completado) MENOS Cancelado, excluyendo papelera. El render muestra el estado.
      return esOrdenOSinTipo && !estado.includes('Cancelado') && !esArchivado(s) && contactos.some(r => r.id === contactId) && recEnPaisNotion(s);
    });
    // Fase B: las jornadas (📅 Jornada) del cliente, en CUALQUIER estado. El render (renderContactHistory)
    // las agrupa por "trabajo madre" (Orden madre) en un desplegable. Salen del mismo svcRes (search-fallback).
    const jornadas = (svcRes.results || []).filter(s => {
      const tipoReg = s.properties?.['Tipo de registro']?.select?.name || '';
      const contactos = s.properties?.['Contacto']?.relation || [];
      return tipoReg.includes('Jornada') && contactos.some(r => r.id === contactId) && recEnPaisNotion(s);
    });

    const items = [
      ...(propRes.results || []).map(r => ({ type: 'propuesta', data: r, date: r.properties?.['Fecha de creación']?.created_time || r.created_time || '' })),
      ...relevs.map(r => ({ type: 'relevamiento', data: r, date: r.properties?.['Fecha programada']?.date?.start || r.created_time || '' })),
      ...svcs.map(r => ({ type: 'servicio', data: r, date: r.properties?.['Fecha programada']?.date?.start || r.created_time || '' })),
      ...jornadas.map(r => ({ type: 'servicio', data: r, date: r.properties?.['Fecha programada']?.date?.start || r.created_time || '' })),
      ...(ingRes.results || []).map(r => ({ type: 'ingreso', data: r, date: r.properties?.['Fecha']?.date?.start || r.created_time || '' }))
    ];

    // Ordenar por fecha desc
    items.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    M._contactHistoryCache[contactId] = items;
    renderContactHistory(items);
  } catch (e) {
    container.innerHTML = `<div class="history-empty">${t('contact.history.error')} ${esc(e.message)}</div>`;
  }
}

function renderContactHistory(items) {
  const container = document.getElementById('contact-history-container');
  if (!container) return;

  if (!items.length) {
    container.innerHTML = `<div class="history-empty">${t('contact.history.empty')}</div>`;
    return;
  }

  const dateLocale = currentLang === 'pt-BR' ? 'pt-BR' : 'es-UY';
  const fmtDate = (d) => d ? new Date(d.length === 10 ? d + 'T00:00:00' : d).toLocaleDateString(dateLocale, { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

  // Resumen financiero 360 del cliente (reusa lo que ya se cargó: ingresos + propuestas + servicios).
  let cobUSD = 0, cobUY = 0, presupUSD = 0;
  items.forEach(it => {
    if (it.type === 'ingreso') { const { moneda, monto } = montoOf(it.data.properties || {}, 'ingreso'); if (/UY/.test(moneda)) cobUY += monto || 0; else cobUSD += monto || 0; }
    else if (it.type === 'propuesta') { presupUSD += it.data.properties?.['Importe estimado']?.number || 0; }
  });
  const nServ = items.filter(it => it.type === 'servicio').length;
  // Conteo de COMPLETADOS aparte (auditoría 2026-07-09): desde que el historial incluye lo agendado,
  // la fila "Servicios completados" debe contar solo los completados, no todos los servicios.
  const nServCompl = items.filter(it => it.type === 'servicio' && /Completado/.test(it.data.properties?.['Estado']?.select?.name || '')).length;
  const propItems = items.filter(it => it.type === 'propuesta');
  const nProps = propItems.length;
  const nPropsAcc = propItems.filter(it => /Aceptada/.test(it.data.properties?.['Estado pipeline']?.select?.name || '')).length;
  const countHeader =
    `<div class="ec-saldo" style="margin-bottom:6px;font-size:13px">` +
      `<span>📄 ${nProps} ${t('sheet.contact.count.props')}${nPropsAcc ? ` (${nPropsAcc} ${t('sheet.contact.count.props.accepted')})` : ''}</span>` +
      `<span>🧰 ${nServ} ${t('sheet.contact.count.svcs')}</span>` +
    `</div>`;
  const cobStr = [cobUSD ? fmtMoneda(cobUSD, '🇺🇸 USD') : '', cobUY ? fmtMoneda(cobUY, '🇺🇾 UY$') : ''].filter(Boolean).join(' · ') || '—';
  // Contrato recurrente: si hay una propuesta 🔄 Recurrente con "Servicios por año" → esperado/año + comisión + neto.
  const contrato = items.find(it => it.type === 'propuesta'
    && /Recurrente/.test(it.data.properties?.['Tipo']?.select?.name || '')
    && (it.data.properties?.['Servicios por año']?.number));
  let contratoHTML = '';
  if (contrato) {
    const cp = contrato.data.properties || {};
    const sa = cp['Servicios por año'].number || 0;
    const imp = cp['Importe estimado']?.number || 0;
    const com = cp['Comisión %']?.number || 0;
    const comUSD = cobUSD * com / 100, comUY = cobUY * com / 100;
    const comStr = [comUSD ? fmtMoneda(comUSD, '🇺🇸 USD') : '', comUY ? fmtMoneda(comUY, '🇺🇾 UY$') : ''].filter(Boolean).join(' · ') || '—';
    const netoStr = [cobUSD ? fmtMoneda(cobUSD - comUSD, '🇺🇸 USD') : '', cobUY ? fmtMoneda(cobUY - comUY, '🇺🇾 UY$') : ''].filter(Boolean).join(' · ') || '—';
    contratoHTML =
      `<div class="ec-section-total"><span>📑 CONTRATO RECURRENTE</span><span></span></div>` +
      `<div class="ec-row" style="font-size:12px"><span>Esperado/año (${sa} × ${fmtMoneda(imp, '🇺🇸 USD')})</span><span>${fmtMoneda(sa * imp, '🇺🇸 USD')}</span></div>` +
      (com ? `<div class="ec-row" style="font-size:12px"><span>Comisión intermediario (${com}%)</span><span style="color:var(--red)">− ${comStr}</span></div>` +
             `<div class="ec-row" style="font-size:12px;font-weight:700"><span>Neto FlyClean</span><span style="color:var(--green)">${netoStr}</span></div>` : '');
  }
  const summaryHTML = countHeader +
    `<div class="ec-saldo" style="margin-bottom:6px;font-size:13px"><span>💵 Cobrado</span><span style="color:var(--green);font-weight:700">${cobStr}</span></div>` +
    (presupUSD ? `<div class="ec-row" style="font-size:12px;margin-bottom:4px"><span>📄 Presupuestado</span><span>${fmtMoneda(presupUSD, '🇺🇸 USD')}</span></div>` : '') +
    (nServCompl ? `<div class="ec-row" style="font-size:12px;margin-bottom:8px"><span>🛠️ Servicios completados</span><span>${nServCompl}</span></div>` : '') +
    contratoHTML;

  // Fase B: agrupar las jornadas (📅 Jornada) de un mismo trabajo por Orden madre → un desplegable.
  const esJornadaItem = (it) => it.type === 'servicio' && (it.data.properties?.['Tipo de registro']?.select?.name || '').includes('Jornada');
  const _jornadaGroups = {};
  items.forEach(it => { if (esJornadaItem(it)) { const root = jobRootId(it.data); (_jornadaGroups[root] = _jornadaGroups[root] || []).push(it); } });
  const _renderedJobRoots = new Set();

  container.innerHTML = summaryHTML + items.map(item => {
    const p = item.data.properties || {};
    const id = item.data.id;
    const fecha = fmtDate(item.date);

    if (item.type === 'propuesta') {
      const nombre = p['Nombre de propuesta']?.title?.[0]?.plain_text || t('common.sinnombre');
      const estado = p['Estado pipeline']?.select?.name || '—';
      const importe = p['Importe estimado']?.number;
      return `<div class="history-item" onclick="openHistoryItem('propuesta','${id}')">
        <div class="history-icon">🧾</div>
        <div class="history-content">
          <div class="history-title">${t('contact.history.propuesta')}: ${esc(nombre)}</div>
          <div class="history-meta">${estado}${importe ? ' · $' + importe.toLocaleString() : ''} · ${fecha}</div>
        </div>
      </div>`;
    }
    if (item.type === 'relevamiento') {
      const nombre = p['Nombre del servicio']?.title?.[0]?.plain_text || '—';
      const op = p['Operario App']?.select?.name || '—';
      return `<div class="history-item" onclick="openHistoryItem('servicio','${id}')">
        <div class="history-icon">🔍</div>
        <div class="history-content">
          <div class="history-title">${t('contact.history.relevamiento')}</div>
          <div class="history-meta">${esc(nombre)} · ${esc(op)} · ${fecha}</div>
        </div>
      </div>`;
    }
    if (esJornadaItem(item)) {
      const root = jobRootId(item.data);
      if (_renderedJobRoots.has(root)) return '';   // el grupo ya se dibujó en su fecha más reciente
      _renderedJobRoots.add(root);
      return renderJornadaGroup(_jornadaGroups[root] || [item], fmtDate);
    }
    if (item.type === 'servicio') {
      const nombre = p['Nombre del servicio']?.title?.[0]?.plain_text || '—';
      const tipo = tipoServicioStr(p);
      // Mostrar el estado (auditoría 2026-07-09): el historial ahora incluye lo agendado, no solo lo
      // completado → el ícono y el texto distinguen agendado (📅) / en curso (✈️) / completado (✅).
      const estado = p['Estado']?.select?.name || '';
      const icon = estado.includes('Completado') ? '✅' : (estado.includes('En curso') ? '✈️' : '📅');
      return `<div class="history-item" onclick="openHistoryItem('servicio','${id}')">
        <div class="history-icon">${icon}</div>
        <div class="history-content">
          <div class="history-title">${t('contact.history.servicio')}: ${esc(nombre)}</div>
          <div class="history-meta">${estado ? esc(estado) + ' · ' : ''}${tipo ? tipo + ' · ' : ''}${fecha}</div>
        </div>
      </div>`;
    }
    if (item.type === 'ingreso') {
      const { moneda, monto } = montoOf(p, 'ingreso');
      const detalle = p['Servicio']?.title?.[0]?.plain_text || p['Cliente']?.rich_text?.[0]?.plain_text || '—';
      return `<div class="history-item history-item-ingreso">
        <div class="history-icon">💰</div>
        <div class="history-content">
          <div class="history-title">${t('contact.history.ingreso')}: ${monto ? fmtMoneda(monto, moneda) : '—'}</div>
          <div class="history-meta">${detalle} · ${fecha}</div>
        </div>
      </div>`;
    }
    return '';
  }).join('');
}
