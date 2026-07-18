// ─────────────────────────────────────────────
// COORD-SERVICIOS — la maquinaria de la pantalla del coordinador (2º de los 3 cortes grandes, 2026-07-18):
// filtros (panel + chips + buscador + sort + rango fechas), toolbar, mes (‹ mes › + week strip), las TRES
// vistas de Inicio (lista cronológica / tablero Kanban con drag&drop / calendario), mover-estado, las cards
// de servicio (coordServiceCard + thumb + agrupado de jornadas jobRootId/jobGroup/jobCompleto), el fetch del
// mes (fetchCoordItemsForMonth + filtrarServicios) y los renderers de tabs (Inicio/Servicios/Pruebas/
// Relevamientos) + groupServicesByDay (compartida con el operario) + cambiarEstadoServicio.
// ─────────────────────────────────────────────
// Queda en main → M: _coordAllServices (compartida con gastos/propuestas), activeCoordTab, coordFilters
// (handler var), _coordVisibleLimit, COORD_PAGE_SIZE, currentUser/selectedCountry/USERS/mapas, editingService
// y _pvSets/_pvRegister (publicados para el visor). setCoordTab (router) y el sheet de edición del servicio
// TAMBIÉN quedan en main. Estado propio: coordMonthOffset, _coordView, filtros internos, drag del Kanban.

import { t, currentLang } from './i18n.js';
import { esc, msNames, toArr } from './util.js';
import { esArchivado, tipoServicioStr } from './calculos.js';
import { callNotion, callDb, dbFlag } from './api.js';
import { clienteNombresCargados, clienteNombreDe, ensureClienteNombres, renderContactList } from './clientes.js';
import { cargarMasFinanzas } from './finanzas.js';
import { extractServiceFiles } from './fotos.js';
import { queueableUpdateServiceProps } from './offline-queue.js';
import { loadAlerts } from './alertas.js';

let M = {};
export function initCoordServicios(bridge) { M = bridge; }

const esVentas = (...a) => M.esVentas(...a);
const esDireccion = (...a) => M.esDireccion(...a);
const markUserActive = (...a) => M.markUserActive(...a);
const showScreen = (...a) => M.showScreen(...a);
const setCoordTab = (...a) => M.setCoordTab(...a);
const getCountryFilter = (...a) => M.getCountryFilter(...a);
const getEstadoClass = (...a) => M.getEstadoClass(...a);
const servicioContinua = (...a) => M.servicioContinua(...a);
const renderCoordResumen = (...a) => M.renderCoordResumen(...a);
const renderCoordPropuestasList = (...a) => M.renderCoordPropuestasList(...a);
const _pvRegister = (...a) => M._pvRegister(...a);

let coordMonthOffset = 0;

// filtros server-side (País / Fecha programada / Estado). Por eso, CUALQUIER consulta a Servicios que
// dependa de esos filtros DEBE re-filtrar en cliente con este helper (si no, llegan datos de más / de
// otro mes / de otro estado, como pasó con la alerta y el resumen del coordinador).
export function filtrarServicios(items, { paisNotion = null, desde = null, hasta = null, incluirSinFecha = false, estados = null, incluirEnCurso = false } = {}) {
  return (items || []).filter(s => {
    const p = s.properties || {};
    if (paisNotion && (p['País']?.select?.name) !== paisNotion) return false;
    if (estados && !estados.includes(p['Estado']?.select?.name || '')) return false;
    // Trabajo EN CURSO ahora: se muestra siempre (sin importar el mes), respetando país. Red de seguridad
    // para un servicio "✈️ En curso" cuya Fecha programada cae en otro mes.
    if (incluirEnCurso && (p['Estado']?.select?.name || '').includes('En curso')) return true;
    if (desde || hasta) {
      const f = p['Fecha programada']?.date?.start || '';
      if (!f) return incluirSinFecha;
      if (desde && f < desde) return false;
      if (hasta && f > hasta) return false;
    }
    return true;
  });
}

// con encabezado de fecha por grupo (📍 Hoy · mar 8 jul / ⏭ Mañana · mié 9 jul / jue 10 jul / ⚠️ Sin
// fecha al final). Reusado por el operario (renderServices) y el coordinador (renderCoordList). Preserva
// el orden de entrada (asc o desc); "sin fecha" siempre al final. Devuelve [{ key, label, isHoy, items }].
export function groupServicesByDay(list) {
  const dateLocale = currentLang === 'pt-BR' ? 'pt-BR' : 'es-UY';
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todayISO = today.toISOString().split('T')[0];
  const tomorrowISO = new Date(today.getTime() + 86400000).toISOString().split('T')[0];
  const fmt = (iso) => {
    const d = new Date(iso + 'T00:00:00').toLocaleDateString(dateLocale, { weekday: 'short', day: 'numeric', month: 'short' });
    return d.charAt(0).toUpperCase() + d.slice(1);
  };
  const byKey = {};
  const groups = [];
  list.forEach(s => {
    const f = s.properties?.['Fecha programada']?.date?.start || '';
    const key = f || '__sinfecha__';
    if (!byKey[key]) {
      let label, isHoy = false;
      if (!f) label = '⚠️ ' + t('day.sinfecha');
      else if (f === todayISO) { label = '📍 ' + t('day.hoy') + ' · ' + fmt(f); isHoy = true; }
      else if (f === tomorrowISO) label = '⏭ ' + t('day.manana') + ' · ' + fmt(f);
      else label = fmt(f);
      byKey[key] = { key, label, isHoy, items: [] };
      groups.push(byKey[key]);
    }
    byKey[key].items.push(s);
  });
  const conFecha = groups.filter(g => g.key !== '__sinfecha__');
  const sinFecha = groups.filter(g => g.key === '__sinfecha__');
  return [...conFecha, ...sinFecha];
}

// ─────────────────────────────────────────────
// FILTROS DEL COORDINADOR — buscador + multi-select + sort + rango fechas
// Aplica client-side sobre los items ya cargados (no genera más calls a Notion).
// ─────────────────────────────────────────────

export function refreshCoordFilterSheetIfOpen() {
  if (document.getElementById('coord-filter-overlay')?.classList.contains('open')) {
    renderCoordFiltersPanel();
    updateCoordApplyBtn();
  }
}
let _coordSearchTimer = null;
// Vista de la pestaña Inicio del coord: 'list' (cronológica) o 'board' (Kanban por estado).
let _coordView = localStorage.getItem('fc_coord_view') || 'list';

export function getActiveFilterCount() {
  let n = 0;
  if (M.coordFilters.search) n++;
  if (M.coordFilters.estado.length) n++;
  if (M.coordFilters.pais.length) n++;
  if (M.coordFilters.operario.length) n++;
  if (M.coordFilters.dateFrom || M.coordFilters.dateTo) n++;
  return n;
}

export function refreshCoordFilterBadge() {
  const badge = document.getElementById('coord-filter-count');
  const btn = document.getElementById('coord-filter-btn');
  const n = getActiveFilterCount();
  if (badge) {
    if (n > 0) { badge.textContent = n; badge.style.display = 'inline-block'; }
    else { badge.style.display = 'none'; }
  }
  if (btn) btn.classList.toggle('active', n > 0);
  renderCoordChips();
}

export function isCoordToolbarVisible(tab) {
  return tab === 'inicio' || tab === 'servicios' || tab === 'relevamientos' || tab === 'propuestas' || tab === 'pruebas';
}

export function showCoordToolbar(tab) {
  const tb = document.getElementById('coord-toolbar');
  if (!tb) return;
  if (isCoordToolbarVisible(tab)) {
    tb.style.display = 'block';
    const searchEl = document.getElementById('coord-search');
    if (searchEl) searchEl.value = M.coordFilters.search;
    refreshCoordFilterBadge();
  } else {
    tb.style.display = 'none';
    closeCoordFilterSheet();
  }
}

export function onCoordSearchInput(v) {
  clearTimeout(_coordSearchTimer);
  _coordSearchTimer = setTimeout(() => {
    M.coordFilters.search = (v || '').trim().toLowerCase();
    refreshCoordFilterBadge();
    rerenderActiveCoordTab();
  }, 200);
}

export function setCoordSort(v) {
  M.coordFilters.sort = v;
  rerenderActiveCoordTab();
  updateCoordApplyBtn();
}

// v163: los filtros viven en un BOTTOM-SHEET (patrón estándar) en vez del panel inline que empujaba
// la lista. Mismo nombre de función (la llama el botón ⚙︎); misma lógica de filtros por debajo.
export function toggleCoordFiltersPanel() {
  const ov = document.getElementById('coord-filter-overlay');
  if (!ov) return;
  if (ov.classList.contains('open')) { closeCoordFilterSheet(); return; }
  renderCoordFiltersPanel();
  updateCoordApplyBtn();
  ov.classList.add('open');
}
export function closeCoordFilterSheet() { document.getElementById('coord-filter-overlay')?.classList.remove('open'); }
export function coordFilterOverlayClick(e) { if (e.target.id === 'coord-filter-overlay') closeCoordFilterSheet(); }

// Botón "Ver N resultados": N = total filtrado (pre-paginación), lo deja applyCoordFilters en M._coordFilteredCount.
export function updateCoordApplyBtn() {
  const btn = document.getElementById('coord-filter-apply');
  if (!btn) return;
  const n = (typeof M._coordFilteredCount === 'number') ? M._coordFilteredCount : null;
  const noun = M.activeCoordTab === 'propuestas' ? t('flt.noun.propuestas') : t('flt.noun.servicios');
  btn.textContent = (n != null) ? t('flt.ver').replace('{n}', n).replace('{que}', noun) : t('flt.listo');
}

// Chips de filtros ACTIVOS bajo el buscador (se sacan con un toque). Único hook: refreshCoordFilterBadge.
export function renderCoordChips() {
  const row = document.getElementById('coord-chips');
  if (!row) return;
  const escA = v => String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const chips = [];
  const mk = (label, dim, val) => chips.push('<span class="coord-chip-active" data-dim="' + dim + '" data-val="' + escA(val) + '" onclick="toggleCoordFilterValue(this.dataset.dim, this.dataset.val)">' + escA(label) + ' <span class="x">✕</span></span>');
  M.coordFilters.estado.forEach(v => mk(v, 'estado', v));
  M.coordFilters.pais.forEach(v => mk(v, 'pais', v));
  M.coordFilters.operario.forEach(v => mk('👤 ' + v, 'operario', v));
  if (M.coordFilters.dateFrom || M.coordFilters.dateTo) {
    const fmt = (d) => d ? d.slice(8, 10) + '/' + d.slice(5, 7) : '…';
    chips.push('<span class="coord-chip-active" onclick="setCoordDateRange(\'\', \'\')">📅 ' + fmt(M.coordFilters.dateFrom) + ' → ' + fmt(M.coordFilters.dateTo) + ' <span class="x">✕</span></span>');
  }
  if (!chips.length) { row.style.display = 'none'; row.innerHTML = ''; return; }
  chips.push('<button class="coord-chip-clear" onclick="clearCoordFilters()">' + t('flt.chips.clear') + '</button>');
  row.innerHTML = chips.join('');
  row.style.display = 'flex';
}

export function toggleCoordFilterValue(dim, val) {
  const arr = M.coordFilters[dim];
  const i = arr.indexOf(val);
  if (i === -1) arr.push(val); else arr.splice(i, 1);
  refreshCoordFilterBadge();
  renderCoordFiltersPanel();
  rerenderActiveCoordTab();
  updateCoordApplyBtn();
}

export function setCoordDateRange(from, to) {
  M.coordFilters.dateFrom = from || '';
  M.coordFilters.dateTo = to || '';
  refreshCoordFilterBadge();
  renderCoordFiltersPanel();
  rerenderActiveCoordTab();
  updateCoordApplyBtn();
}

export function clearCoordFilters() {
  M.coordFilters.search = '';
  M.coordFilters.estado = [];
  M.coordFilters.pais = [];
  M.coordFilters.operario = [];
  M.coordFilters.dateFrom = '';
  M.coordFilters.dateTo = '';
  const searchEl = document.getElementById('coord-search');
  if (searchEl) searchEl.value = '';
  refreshCoordFilterBadge();
  renderCoordFiltersPanel();
  rerenderActiveCoordTab();
  updateCoordApplyBtn();
}

export function uniqueValues(items, getter) {
  const seen = new Set();
  items.forEach(it => { const v = getter(it); if (v) seen.add(v); });
  return [...seen].sort();
}

export function renderCoordFiltersPanel() {
  const panel = document.getElementById('coord-filter-sheet-content');
  if (!panel) return;
  const isProps = M.activeCoordTab === 'propuestas';
  const items = isProps ? M._coordAllProps : M._coordAllServices;
  const estadoKey = isProps ? 'Estado pipeline' : 'Estado';
  const estados = uniqueValues(items, it => it.properties?.[estadoKey]?.select?.name);
  const paises = uniqueValues(items, it => it.properties?.['País']?.select?.name);
  const operarios = isProps ? [] : uniqueValues(items, it => it.properties?.['Operario App']?.select?.name);

  const dateLabel = isProps ? 'Última interacción' : 'Fecha programada';

  // Escape para usar el valor dentro de un atributo HTML (data-val="..."). Sin esto, valores
  // con comillas (o el propio JSON.stringify) cierran el atributo y rompen el click handler.
  const escAttr = s => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const chip = (dim, value, active) =>
    `<span class="coord-filter-chip ${active ? 'active' : ''}" data-dim="${dim}" data-val="${escAttr(value)}" onclick="toggleCoordFilterValue(this.dataset.dim, this.dataset.val)">${escAttr(value)}</span>`;

  // Orden adentro del sheet (antes era un <select> suelto que comía lugar en la barra)
  const SORTS = [
    ['date-desc', t('flt.sort.proximos')], ['date-asc', t('flt.sort.pasados')],
    ['alpha-asc', '🔤 A → Z'], ['alpha-desc', '🔤 Z → A'],
  ];
  let html = `<div class="coord-filter-section">
    <div class="coord-filter-label">${t('flt.sort')}</div>
    <div class="coord-filter-chips">${SORTS.map(([v, l]) => `<span class="coord-filter-chip ${M.coordFilters.sort === v ? 'active' : ''}" onclick="setCoordSort('${v}');renderCoordFiltersPanel()">${l}</span>`).join('')}</div>
  </div>`;
  if (estados.length) {
    html += `<div class="coord-filter-section">
      <div class="coord-filter-label">Estado</div>
      <div class="coord-filter-chips">${estados.map(e => chip('estado', e, M.coordFilters.estado.includes(e))).join('')}</div>
    </div>`;
  }
  if (paises.length) {
    html += `<div class="coord-filter-section">
      <div class="coord-filter-label">País</div>
      <div class="coord-filter-chips">${paises.map(p => chip('pais', p, M.coordFilters.pais.includes(p))).join('')}</div>
    </div>`;
  }
  if (operarios.length) {
    html += `<div class="coord-filter-section">
      <div class="coord-filter-label">Operario</div>
      <div class="coord-filter-chips">${operarios.map(o => chip('operario', o, M.coordFilters.operario.includes(o))).join('')}</div>
    </div>`;
  }
  html += `<div class="coord-filter-section">
    <div class="coord-filter-label">${dateLabel}</div>
    <div class="coord-filter-date-row">
      <input type="date" class="coord-filter-date-input" value="${M.coordFilters.dateFrom}" onchange="setCoordDateRange(this.value, coordFilters.dateTo)" placeholder="Desde"/>
      <span style="color:var(--text3);font-size:12px">→</span>
      <input type="date" class="coord-filter-date-input" value="${M.coordFilters.dateTo}" onchange="setCoordDateRange(coordFilters.dateFrom, this.value)" placeholder="Hasta"/>
    </div>
  </div>`;
  panel.innerHTML = html;
}

export function rerenderActiveCoordTab() {
  if (M.activeCoordTab === 'inicio') {
    renderCoordServiciosView(); // respeta el toggle Lista/Tablero/Calendario
  } else if (M.activeCoordTab === 'servicios' || M.activeCoordTab === 'relevamientos' || M.activeCoordTab === 'pruebas') {
    renderCoordList();
  } else if (M.activeCoordTab === 'propuestas') {
    renderCoordPropuestasList();
  }
}

export function applyCoordFilters(items, opts) {
  opts = opts || {};
  const isProps = opts.isProps === true;
  const estadoKey = isProps ? 'Estado pipeline' : 'Estado';
  const dateKey = isProps ? 'Última interacción' : 'Fecha programada';
  const search = M.coordFilters.search;

  let out = items.filter(it => {
    const props = it.properties || {};
    if (search) {
      const titleKey = isProps ? 'Nombre de propuesta' : 'Nombre del servicio';
      const nombre = (props[titleKey]?.title?.[0]?.plain_text || '').toLowerCase();
      // También por nombre de cliente (relación Contacto → map cacheado; degrada a '' si aún no cargó) y por Lugar.
      const cliNombre = (clienteNombreDe(props['Contacto']?.relation?.[0]?.id || props['Contactos']?.relation?.[0]?.id) || '').toLowerCase();
      const lugar = (props['Lugar']?.rich_text?.[0]?.plain_text || '').toLowerCase();
      if (!nombre.includes(search) && !cliNombre.includes(search) && !lugar.includes(search)) return false;
    }
    if (M.coordFilters.estado.length) {
      const v = props[estadoKey]?.select?.name || '';
      if (!M.coordFilters.estado.includes(v)) return false;
    }
    if (M.coordFilters.pais.length) {
      const v = props['País']?.select?.name || '';
      if (!M.coordFilters.pais.includes(v)) return false;
    }
    if (!isProps && M.coordFilters.operario.length) {
      const v = props['Operario App']?.select?.name || '';
      if (!M.coordFilters.operario.includes(v)) return false;
    }
    if (M.coordFilters.dateFrom || M.coordFilters.dateTo) {
      const f = props[dateKey]?.date?.start || '';
      if (!f) return false;
      if (M.coordFilters.dateFrom && f < M.coordFilters.dateFrom) return false;
      if (M.coordFilters.dateTo && f > M.coordFilters.dateTo) return false;
    }
    return true;
  });

  const titleKey = isProps ? 'Nombre de propuesta' : 'Nombre del servicio';
  const getName = it => (it.properties?.[titleKey]?.title?.[0]?.plain_text || '').toLowerCase();
  const getDate = it => it.properties?.[dateKey]?.date?.start || '';

  const sortFn = {
    'alpha-asc':  (a, b) => getName(a).localeCompare(getName(b)),
    'alpha-desc': (a, b) => getName(b).localeCompare(getName(a)),
    'date-asc':   (a, b) => (getDate(a) || '9999').localeCompare(getDate(b) || '9999'),
    'date-desc':  (a, b) => (getDate(b) || '0000').localeCompare(getDate(a) || '0000'),
  }[M.coordFilters.sort] || ((a, b) => 0);

  M._coordFilteredCount = out.length; // total filtrado (pre-paginación) — lo lee el botón "Ver N resultados"
  return [...out].sort(sortFn);
}

export async function loadCoordinator() {
  if (!M.currentUser) { showScreen('login'); return; }
  markUserActive();
  showScreen('coordinator');
  document.getElementById('coord-user-name').textContent = M.currentUser.emoji + ' ' + M.currentUser.name.split(' ')[0];
  const flagMap = { 'Uruguay': '🇺🇾', 'Brasil': '🇧🇷', 'Panamá': '🇵🇦', 'Guatemala': '🇬🇹', 'México': '🇲🇽' };
  const flag = flagMap[M.selectedCountry] || '';
  const rolLabel = M.currentUser.role.includes('Dirección') ? t('coord.brand.direccion') : (esVentas() ? t('coord.brand.ventas') : t('coord.brand.coord'));
  document.getElementById('coord-logo-title').innerHTML = '<svg class="fly-mark" style="color:#00C98D"><use href="#fc-mark"/></svg>FlyClean ' + flag + ' — ' + rolLabel;
  const ceoBtnEl = document.getElementById('coord-ceo-btn');
  if (ceoBtnEl) ceoBtnEl.style.display = M.currentUser.role.includes('Dirección') ? 'block' : 'none';
  M._operarioOptions = null;
  loadAlerts(M.currentUser.role, 'alerts-banner-coord');
  // Arrancamos en 🏠 Inicio (centro de mando, tab default). setCoordTab deja todo
  // consistente: tab activo, toolbar, month-nav, view-toggle visible y el render.
  const limpiezaTab = document.getElementById('ctab-limpieza');
  if (limpiezaTab) limpiezaTab.style.display = esDireccion() ? '' : 'none';
  // Tab 🗺️ Mapa: SOLO para Ventas (mapa de prospección embebido). NO va en el array de
  // ocultar-para-Ventas de abajo; se muestra explícitamente solo si esVentas().
  const mapaTab = document.getElementById('ctab-mapa');
  if (mapaTab) mapaTab.style.display = esVentas() ? '' : 'none';
  // Rol 🧲 Ventas (spec 2026-07-02 B2 + apertura 2026-07-05): oculta la tab bar salvo 🎯 Prospección,
  // 🗺️ Mapa y 💼 Propuestas (ver+seguimiento — 'propuestas' ya NO está en este array) y arranca en
  // Prospección — nunca ve Servicios/Clientes de cartera/Pedidos/Mensajes. Para Coordinador/
  // Dirección esto es un no-op (queda todo visible igual que antes).
  ['inicio', 'resumen', 'servicios', 'pruebas', 'relevamientos', 'pedidos', 'equipos', 'comunicaciones'].forEach(tb => {
    const el = document.getElementById('ctab-' + tb);
    if (el) el.style.display = esVentas() ? 'none' : '';
  });
  // Mismo blindaje para los botones 💸 Gastos y 📦 Pedidos del header: Ventas no debe
  // poder llegar a ellos ni con un tap directo (además del guard en cada función).
  const gastosBtnEl = document.getElementById('coord-btn-gastos');
  if (gastosBtnEl) gastosBtnEl.style.display = esVentas() ? 'none' : '';
  const pedidosBtnEl = document.getElementById('coord-btn-pedidos');
  if (pedidosBtnEl) pedidosBtnEl.style.display = esVentas() ? 'none' : '';
  setCoordTab(esVentas() ? 'prospeccion' : 'inicio');
}

export function getCoordMonthRange() {
  const now = new Date();
  const base = new Date(now.getFullYear(), now.getMonth() + coordMonthOffset, 1);
  const start = base.toISOString().split('T')[0];
  const end = new Date(base.getFullYear(), base.getMonth() + 1, 0).toISOString().split('T')[0];
  const dateLocale = currentLang === 'pt-BR' ? 'pt-BR' : 'es-UY';
  const label = base.toLocaleDateString(dateLocale, { month: 'long', year: 'numeric' });
  return { start, end, label, base };
}

export function renderWeekStrip(services) {
  const strip = document.getElementById('coord-week-strip');
  if (!strip) return;
  const { start, end, label, base } = getCoordMonthRange();
  const daysInMonth = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();
  const today = new Date(); today.setHours(0,0,0,0);
  const todayISO = today.toISOString().split('T')[0];
  const serviceDates = {};
  services.forEach(s => { const f = s.properties?.['Fecha programada']?.date?.start; if (f) serviceDates[f] = (serviceDates[f] || 0) + 1; });
  const dayNames = currentLang === 'pt-BR'
    ? ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']
    : ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
  const monthNav = document.getElementById('coord-month-nav');
  if (monthNav) {
    monthNav.classList.add('visible');
    const labelEl = document.getElementById('coord-month-label');
    if (labelEl) labelEl.textContent = label;
  }
  const days = Array.from({length: daysInMonth}, (_, i) => new Date(base.getFullYear(), base.getMonth(), i + 1));
  strip.innerHTML = days.map(d => {
    const iso = d.toISOString().split('T')[0];
    const isActive = M.selectedCoordDay === iso;
    const isToday = iso === todayISO;
    const count = serviceDates[iso] || 0;
    return `<div class="day-pill ${isActive ? 'active' : ''} ${isToday ? 'is-today' : ''}" onclick="setCoordDay('${iso}')">
      <div class="day-pill-name">${dayNames[d.getDay()]}</div>
      <div class="day-pill-num">${d.getDate()}</div>
      <div class="day-pill-dot">${count > 0 ? '<div class="day-dot"></div>' + (count > 1 ? '<div class="day-dot"></div>' : '') : ''}</div>
    </div>`;
  }).join('') + `<div class="day-pill ${M.selectedCoordDay === 'all' ? 'active' : ''}" onclick="setCoordDay('all')" style="flex:0 0 52px">
    <div class="day-pill-name">${t('coord.day.all')}</div>
    <div class="day-pill-num" style="font-size:11px;margin-top:4px">▼</div>
    <div class="day-pill-dot"></div>
  </div>`;
  if (M.selectedCoordDay && M.selectedCoordDay !== 'all' && (M.selectedCoordDay < start || M.selectedCoordDay > end)) {
    M.selectedCoordDay = 'all';
  }
}

export function changeCoordMonth(delta) {
  coordMonthOffset += delta;
  M.selectedCoordDay = 'all';
  // El month-nav se ve en Inicio + Servicios + Pruebas + Relevamientos. Re-fetch del nuevo mes
  // según la tab activa (cada una aplica su propio filtro de tipo; Inicio no filtra).
  if (M.activeCoordTab === 'resumen') renderCoordResumen();
  else if (M.activeCoordTab === 'pruebas') renderCoordPruebas();
  else if (M.activeCoordTab === 'relevamientos') renderCoordRelevamientos();
  else if (M.activeCoordTab === 'servicios') renderCoordServicios();
  else renderCoordInicio();
}

export function setCoordDay(day) {
  M.selectedCoordDay = day;
  renderWeekStrip(M._coordAllServices);
  // En Inicio respetamos el toggle Lista/Tablero/Calendario; el resto de tabs usa la lista cronológica.
  if (M.activeCoordTab === 'inicio') renderCoordServiciosView();
  else renderCoordList();
}

export function renderCargarMasButton(remaining) {
  if (remaining <= 0) return '';
  const next = Math.min(M.COORD_PAGE_SIZE, remaining);
  return `<div class="cargar-mas-wrap">
    <button class="cargar-mas-btn" onclick="cargarMasCoord()">↓ ${t('coord.cargar.mas').replace('{n}', next)} · ${t('coord.restantes').replace('{n}', remaining)}</button>
  </div>`;
}

export function cargarMasCoord() {
  // Router: delega a finanzas si esa pantalla está activa.
  const finanzasScreen = document.getElementById('screen-finanzas');
  if (finanzasScreen && finanzasScreen.classList.contains('active')) {
    if (typeof cargarMasFinanzas === 'function') cargarMasFinanzas();
    return;
  }
  M._coordVisibleLimit += M.COORD_PAGE_SIZE;
  // Re-render según tab activa, manteniendo el limit incrementado.
  if (M.activeCoordTab === 'propuestas') renderCoordPropuestasList(true);
  else if (M.activeCoordTab === 'contactos') renderContactList(M._coordAllContacts, true);
  else renderCoordList(true);
}


// Toggle Lista / Tablero (solo pestaña Inicio). Persiste la elección y re-renderiza.
export function setCoordView(v) {
  _coordView = v;
  localStorage.setItem('fc_coord_view', v);
  markUserActive();
  renderCoordServiciosView();
}

// Render del control segmentado + del cuerpo (lista o tablero) según _coordView.
// Solo se usa desde la pestaña Inicio; Pruebas y Relevamientos siguen usando renderCoordList directo.
export function renderCoordServiciosView() {
  _kbColLimits = {}; // reset del paginado por columna del tablero al cambiar vista/filtros/mes
  const toggle = document.getElementById('coord-view-toggle');
  if (toggle) {
    toggle.style.display = 'flex';
    toggle.innerHTML =
      `<button class="${_coordView === 'list' ? 'active' : ''}" onclick="setCoordView('list')">📋 Lista</button>` +
      `<button class="${_coordView === 'board' ? 'active' : ''}" onclick="setCoordView('board')">▣ Tablero</button>` +
      `<button class="${_coordView === 'calendar' ? 'active' : ''}" onclick="setCoordView('calendar')">📅 Calendario</button>`;
  }
  // La tira de días (week-strip) se quitó (2026-07-06): en todas las vistas la referencia temporal
  // es la agrupación por fecha (headers Hoy/8 jul…) + el navegador de mes ‹ ›. La ocultamos siempre.
  const strip = document.getElementById('coord-week-strip');
  if (strip) strip.style.display = 'none';
  if (_coordView === 'board') renderCoordKanban();
  else if (_coordView === 'calendar') renderCoordCalendar();
  else renderCoordList();
}

// Vista Calendario — grilla mensual de 7 columnas (estilo Notion básico). Usa el mes activo
// (coordMonthOffset, vía getCoordMonthRange), respeta los filtros del coord y linkea cada
// evento a openEditSheet. Pinta en #coord-content (scroll vertical natural del contenedor).
export function renderCoordCalendar() {
  const content = document.getElementById('coord-content');
  if (!content) return;
  const { base } = getCoordMonthRange();
  const y = base.getFullYear();
  const m = base.getMonth();

  // Filtramos con los mismos filtros que list/board y agrupamos por Fecha programada.
  const items = applyCoordFilters(M._coordAllServices, { isProps: false });
  const byDay = {};
  items.forEach(s => {
    const f = s.properties?.['Fecha programada']?.date?.start;
    if (!f) return;
    (byDay[f] = byDay[f] || []).push(s);
  });
  // Orden dentro de cada día por hora programada (sin hora va al final).
  const horaOf = s => {
    const h = s.properties?.['Hora Inicio']?.date?.start;
    return h ? new Date(h).toTimeString().slice(0, 5) : '';
  };
  // Orden por hora ascendente; los sin hora ('') van al final (sentinel '99:99' solo para ordenar).
  const sortKey = s => horaOf(s) || '99:99';
  Object.values(byDay).forEach(arr => arr.sort((a, b) => sortKey(a).localeCompare(sortKey(b))));

  const dayNames = currentLang === 'pt-BR'
    ? ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
    : ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  const firstWeekday = new Date(y, m, 1).getDay(); // 0=Dom
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todayISO = today.toISOString().split('T')[0];

  const pad = n => String(n).padStart(2, '0');

  const headHTML = dayNames.map(d => `<div class="cal-weekday">${d}</div>`).join('');

  let cellsHTML = '';
  // Celdas vacías para alinear el día 1 con su columna de semana.
  for (let i = 0; i < firstWeekday; i++) cellsHTML += `<div class="cal-cell empty"></div>`;

  for (let day = 1; day <= daysInMonth; day++) {
    const iso = `${y}-${pad(m + 1)}-${pad(day)}`;
    const isToday = iso === todayISO;
    const evts = byDay[iso] || [];
    const MAX = 3;
    const shown = evts.slice(0, MAX);
    const more = evts.length - shown.length;

    const eventsHTML = shown.map(s => {
      const estado = s.properties?.['Estado']?.select?.name || '';
      const cls = getEstadoClass(estado);
      const nombre = s.properties?.['Nombre del servicio']?.title?.[0]?.plain_text || '(sin nombre)';
      const hora = horaOf(s);
      const horaTxt = hora ? `<span class="cal-event-time">${hora}</span> ` : '';
      return `<button type="button" class="cal-event ${cls}" onclick="openEditSheet('${esc(s.id)}')">${horaTxt}${esc(nombre)}</button>`;
    }).join('');
    const moreHTML = more > 0 ? `<div class="cal-more">+${more} más</div>` : '';

    cellsHTML += `<div class="cal-cell${isToday ? ' today' : ''}">
      <div class="cal-daynum">${day}</div>
      ${eventsHTML}${moreHTML}
    </div>`;
  }

  content.innerHTML = `<div class="cal-grid cal-head">${headHTML}</div><div class="cal-grid cal-body">${cellsHTML}</div>`;
}

// Estados del Kanban en orden fijo (con emoji, como se guardan en Notion). Única fuente
// de verdad para las columnas del tablero + la hoja "Mover a". Cada uno trae el "núcleo"
// para matchear con includes() y tolerar variaciones de emoji en el valor guardado.
const KANBAN_ESTADOS = [
  { estado: '📋 Pendiente',  core: 'Pendiente'  },
  { estado: '🔄 Asignado',   core: 'Asignado'   },
  { estado: '✈️ En curso',   core: 'curso'      },
  { estado: '✅ Completado', core: 'Completado' },
  { estado: '❌ Cancelado',  core: 'Cancelado'  },
];

// Tablero (Kanban) base — Tarea 1: 5 columnas por estado, scroll horizontal, SIN arrastre.
// El cambio de estado se hace por toque con la hoja "Mover a" (Tarea 2).
// Límite de tarjetas visibles por columna del tablero (paginado "Ver más", de a M.COORD_PAGE_SIZE).
// Se resetea en renderCoordServiciosView (al cambiar vista/filtros/mes); verMasKanban lo sube.
let _kbColLimits = {};
export function verMasKanban(core) {
  _kbColLimits[core] = (_kbColLimits[core] || M.COORD_PAGE_SIZE) + M.COORD_PAGE_SIZE;
  renderCoordKanban();
}
export function renderCoordKanban() {
  const content = document.getElementById('coord-content');
  if (!content) return;
  const items = applyCoordFilters(M._coordAllServices, { isProps: false });

  // 5 columnas en orden fijo (única fuente de verdad: KANBAN_ESTADOS). El "núcleo"
  // se matchea con includes() para tolerar variaciones de emoji en el valor guardado.
  const columns = KANBAN_ESTADOS;
  const buckets = columns.map(() => []);

  items.forEach(it => {
    const estado = it.properties?.['Estado']?.select?.name || '';
    let idx = columns.findIndex(c => estado.includes(c.core));
    if (idx === -1) idx = 0; // sin estado / desconocido → Pendiente
    buckets[idx].push(it);
  });

  const cols = columns.map((c, i) => {
    const list = buckets[i];
    // Paginado por columna: mostramos hasta el límite (15 por defecto) + botón "Ver más".
    const lim = _kbColLimits[c.core] || M.COORD_PAGE_SIZE;
    const shown = list.slice(0, lim);
    const remaining = list.length - shown.length;
    const cardsHTML = list.length
      ? shown.map(s => `<div class="kb-card" data-id="${esc(s.id)}" data-estado="${esc(c.estado)}">` +
          // Botón "Mover" discreto en la esquina; stopPropagation evita disparar openEditSheet de la card.
          `<button class="kb-move-btn" title="Mover a otro estado" onclick="event.stopPropagation(); openMoverEstado('${esc(s.id)}')">↔</button>` +
          coordServiceCard(s) +
        `</div>`).join('')
        + (remaining > 0 ? `<button class="cargar-mas-btn kb-mas-btn" onclick="verMasKanban('${esc(c.core)}')">↓ Ver ${Math.min(M.COORD_PAGE_SIZE, remaining)} más · quedan ${remaining}</button>` : '')
      : `<div class="kb-col-empty">Sin servicios</div>`;
    return `<div class="kb-col" data-estado="${esc(c.estado)}">
      <div class="kb-col-head">${esc(c.estado)} <span class="kb-count">(${list.length})</span></div>
      ${cardsHTML}
    </div>`;
  }).join('');

  // Preservar el scroll al re-pintar: tras mover una card (drop o "Mover a") el board se
  // reconstruye con innerHTML → el scroll horizontal del tablero y el vertical de cada
  // columna se resetean. Capturamos ANTES y restauramos DESPUÉS por data-estado.
  const prevBoard = content.querySelector('.kb-board');
  let prevScrollLeft = 0;
  const prevColScroll = {};
  if (prevBoard) {
    prevScrollLeft = prevBoard.scrollLeft;
    prevBoard.querySelectorAll('.kb-col').forEach(col => {
      const est = col.getAttribute('data-estado');
      if (est != null) prevColScroll[est] = col.scrollTop;
    });
  }

  content.innerHTML = `<div class="kb-board">${cols}</div>`;

  if (prevBoard) {
    const newBoard = content.querySelector('.kb-board');
    if (newBoard) {
      newBoard.scrollLeft = prevScrollLeft;
      newBoard.querySelectorAll('.kb-col').forEach(col => {
        const est = col.getAttribute('data-estado');
        if (est != null && prevColScroll[est] != null) col.scrollTop = prevColScroll[est];
      });
    }
  }
}

// Núcleo del cambio de estado (lo reusa la Tarea 3 de arrastre). Optimista: actualiza
// M._coordAllServices + re-pinta el tablero al instante; persiste con cola offline.
// Errores de red NO revierten (quedan encolados); un error "duro" sí revierte + avisa.
export async function cambiarEstadoServicio(id, nuevoEstado) {
  const item = (M._coordAllServices || []).find(s => s.id === id);
  if (!item) return;
  const estadoActual = item.properties?.['Estado']?.select?.name || '';
  if (estadoActual === nuevoEstado) return; // sin cambios

  // Update optimista
  if (!item.properties) item.properties = {};
  item.properties['Estado'] = { select: { name: nuevoEstado } };
  renderCoordKanban(); // la card salta de columna y los contadores se recalculan solos
  markUserActive();

  try {
    await queueableUpdateServiceProps(id, { 'Estado': { select: { name: nuevoEstado } } });
  } catch (e) {
    // Solo llega acá con error "duro" (no de red — esos los encola queueableUpdateServiceProps).
    // Revertimos el optimista y avisamos.
    if (estadoActual) item.properties['Estado'] = { select: { name: estadoActual } };
    else delete item.properties['Estado'];
    renderCoordKanban();
    console.error('[kanban] no se pudo cambiar el estado:', e);
    alert('No se pudo cambiar el estado. Probá de nuevo.');
  }
}

// Hoja "Mover a": elige el estado destino del servicio. Overlay SIBLING del body
// (regla del proyecto: los modales deben ser hijos directos de body para que
// position:fixed funcione). Se crea on-demand.
export function ensureMoverEstadoOverlay() {
  let ov = document.getElementById('mover-estado-overlay');
  if (!ov) {
    ov = document.createElement('div');
    ov.id = 'mover-estado-overlay';
    ov.className = 'edit-overlay';
    ov.onclick = moverEstadoOverlayClick;
    ov.innerHTML = `<div class="edit-sheet" id="mover-estado-sheet">
      <button class="sheet-close-btn" type="button" aria-label="Cerrar" onclick="closeMoverEstado()">×</button>
      <div class="edit-sheet-handle"></div>
      <div class="edit-sheet-header">
        <div class="edit-sheet-title">↔ Mover a</div>
        <div class="edit-sheet-sub" id="mover-estado-sub"></div>
      </div>
      <div id="mover-estado-body" style="padding:16px 20px 8px"></div>
    </div>`;
    document.body.appendChild(ov);
  }
  return ov;
}

export function openMoverEstado(id) {
  const svc = (M._coordAllServices || []).find(s => s.id === id);
  if (!svc) return;
  const ov = ensureMoverEstadoOverlay();
  const nombre = svc.properties?.['Nombre del servicio']?.title?.[0]?.plain_text || '';
  const actual = svc.properties?.['Estado']?.select?.name || '';
  const sub = document.getElementById('mover-estado-sub');
  if (sub) sub.textContent = nombre ? `${nombre} — elegí el nuevo estado` : 'Elegí el nuevo estado';
  const body = document.getElementById('mover-estado-body');
  if (body) {
    body.innerHTML = KANBAN_ESTADOS.map(c => {
      // Resaltamos (check + deshabilitado) el estado actual del servicio.
      const esActual = actual.includes(c.core);
      return `<button class="mover-estado-btn ${esActual ? 'current' : ''}" ${esActual ? 'disabled' : ''}` +
        ` onclick="seleccionarMoverEstado('${esc(id)}','${esc(c.estado)}')">` +
        `<span>${esc(c.estado)}</span>${esActual ? '<span class="mover-estado-check">✓</span>' : ''}</button>`;
    }).join('');
  }
  ov.classList.add('open');
  markUserActive();
}

export function seleccionarMoverEstado(id, estado) {
  closeMoverEstado();
  cambiarEstadoServicio(id, estado);
}

export function closeMoverEstado() {
  const ov = document.getElementById('mover-estado-overlay');
  if (ov) ov.classList.remove('open');
}

export function moverEstadoOverlayClick(e) {
  if (e.target.id === 'mover-estado-overlay') closeMoverEstado();
}

// ── Tarea 3 — Arrastre long-press de cards del Kanban entre columnas ───────────
// Mecánica mobile: long-press (~250ms quieto) para "agarrar" la card; si el dedo se
// mueve >10px ANTES del timer, es scroll de columnas (no se agarra). Tap sin agarrar
// = se deja pasar el onclick normal (openEditSheet). Al soltar sobre otra columna →
// se REUSA cambiarEstadoServicio(id, estadoDestino) (única lógica de escritura).
// Listeners de move/up/cancel se enganchan en window SOLO durante el gesto y se
// remueven SIEMPRE al terminar (sin listeners colgados). Un único pointerdown
// delegado en document filtra por .kb-board (el board se re-renderiza con innerHTML).
const KB_HOLD_MS = 250;     // long-press para agarrar
const KB_MOVE_TOL = 10;     // px: deslizar más que esto antes del timer = scroll
const KB_EDGE = 48;         // px: zona de auto-scroll cerca del borde del board
const KB_EDGE_SPEED = 14;   // px por frame de auto-scroll

let _kbDrag = null; // estado del gesto en curso (null si no hay)

export function kbCleanupDrag() {
  if (!_kbDrag) return;
  const d = _kbDrag;
  if (d.holdTimer) clearTimeout(d.holdTimer);
  if (d.rafId) cancelAnimationFrame(d.rafId);
  if (d.ghost && d.ghost.parentNode) d.ghost.parentNode.removeChild(d.ghost);
  if (d.card) d.card.classList.remove('dragging');
  if (d.dropTarget) d.dropTarget.classList.remove('drop-target');
  // Soltar pointer capture si lo tomamos
  if (d.captureEl && d.pointerId != null) {
    try { d.captureEl.releasePointerCapture(d.pointerId); } catch (_) {}
  }
  window.removeEventListener('pointermove', kbOnPointerMove, { passive: false });
  window.removeEventListener('pointerup', kbOnPointerUp, true);
  window.removeEventListener('pointercancel', kbOnPointerCancel, true);
  _kbDrag = null;
}

// Crea el clon flotante que sigue al dedo.
export function kbMakeGhost(card, x, y) {
  const rect = card.getBoundingClientRect();
  const ghost = card.cloneNode(true);
  ghost.classList.add('kb-ghost');
  ghost.classList.remove('dragging');
  ghost.style.width = rect.width + 'px';
  ghost.style.left = rect.left + 'px';
  ghost.style.top = rect.top + 'px';
  // Offset del dedo dentro de la card, para que no "salte" al agarrar.
  _kbDrag.offX = x - rect.left;
  _kbDrag.offY = y - rect.top;
  document.body.appendChild(ghost);
  return ghost;
}

// Loop de auto-scroll horizontal mientras el dedo está cerca de un borde del board.
export function kbAutoScrollTick() {
  const d = _kbDrag;
  if (!d || !d.grabbed || !d.board) return;
  const r = d.board.getBoundingClientRect();
  let dx = 0;
  if (d.lastX < r.left + KB_EDGE) dx = -KB_EDGE_SPEED;
  else if (d.lastX > r.right - KB_EDGE) dx = KB_EDGE_SPEED;
  if (dx !== 0) d.board.scrollLeft += dx;
  d.rafId = requestAnimationFrame(kbAutoScrollTick);
}

export function kbOnPointerDown(e) {
  // Solo gesto primario táctil/mouse, no si ya hay uno en curso.
  if (_kbDrag) return;
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  const card = e.target.closest && e.target.closest('.kb-card');
  if (!card) return;
  const board = card.closest('.kb-board');
  if (!board) return;
  // No agarrar si el toque arranca sobre el botón "Mover" (tiene su propia acción).
  if (e.target.closest('.kb-move-btn')) return;

  _kbDrag = {
    card, board,
    id: card.getAttribute('data-id'),
    estadoActual: card.getAttribute('data-estado') || '',
    startX: e.clientX, startY: e.clientY,
    lastX: e.clientX, lastY: e.clientY,
    pointerId: e.pointerId,
    captureEl: board,
    grabbed: false, ghost: null, dropTarget: null,
    offX: 0, offY: 0, holdTimer: null, rafId: null,
  };

  // Timer de long-press: si el dedo sigue quieto al dispararse → agarramos.
  _kbDrag.holdTimer = setTimeout(() => {
    const d = _kbDrag;
    if (!d || d.grabbed) return;
    d.grabbed = true;
    d.holdTimer = null;
    if (navigator.vibrate) { try { navigator.vibrate(15); } catch (_) {} }
    d.card.classList.add('dragging');
    d.ghost = kbMakeGhost(d.card, d.lastX, d.lastY);
    // Capturamos el pointer para seguir recibiendo move/up aunque salga del board.
    try { d.captureEl.setPointerCapture(d.pointerId); } catch (_) {}
    // Arrancamos el loop de auto-scroll (no scrollea hasta estar cerca de un borde).
    d.rafId = requestAnimationFrame(kbAutoScrollTick);
  }, KB_HOLD_MS);

  // move debe ser {passive:false} para poder preventDefault una vez agarrado.
  window.addEventListener('pointermove', kbOnPointerMove, { passive: false });
  window.addEventListener('pointerup', kbOnPointerUp, true);
  window.addEventListener('pointercancel', kbOnPointerCancel, true);
}

export function kbOnPointerMove(e) {
  const d = _kbDrag;
  if (!d) return;
  d.lastX = e.clientX;
  d.lastY = e.clientY;

  if (!d.grabbed) {
    // Antes de agarrar: si se desliza más que la tolerancia, es scroll → cancelamos
    // el timer y abandonamos el gesto (dejamos que el board scrollee normal).
    if (Math.abs(e.clientX - d.startX) > KB_MOVE_TOL || Math.abs(e.clientY - d.startY) > KB_MOVE_TOL) {
      kbCleanupDrag();
    }
    return;
  }

  // Agarrado: evitamos que el board scrollee con el dedo y movemos el ghost.
  e.preventDefault();
  if (d.ghost) {
    d.ghost.style.left = (e.clientX - d.offX) + 'px';
    d.ghost.style.top = (e.clientY - d.offY) + 'px';
  }
  // Detectar columna bajo el dedo (el ghost tiene pointer-events:none, no estorba).
  const col = document.elementFromPoint(e.clientX, e.clientY);
  const targetCol = col && col.closest ? col.closest('.kb-col') : null;
  if (targetCol !== d.dropTarget) {
    if (d.dropTarget) d.dropTarget.classList.remove('drop-target');
    d.dropTarget = targetCol || null;
    // Resaltar solo si es una columna distinta a la del estado actual.
    if (d.dropTarget && (d.dropTarget.getAttribute('data-estado') || '') !== d.estadoActual) {
      d.dropTarget.classList.add('drop-target');
    } else if (d.dropTarget) {
      // Misma columna: no resaltar como destino válido.
      d.dropTarget.classList.remove('drop-target');
    }
  }
}

// Resuelve el drop: devuelve el estado destino válido o null. Extraído para poder
// testearlo sin un gesto real (recibe la columna destino y el estado actual).
export function kbResolveDrop(targetCol, estadoActual) {
  if (!targetCol) return null;
  const destino = targetCol.getAttribute ? (targetCol.getAttribute('data-estado') || '') : '';
  if (!destino || destino === estadoActual) return null;
  return destino;
}

export function kbOnPointerUp() {
  const d = _kbDrag;
  if (!d) return;
  const grabbed = d.grabbed;
  const id = d.id;
  const estadoActual = d.estadoActual;
  const dropTarget = d.dropTarget;
  // Limpiamos PRIMERO (saca ghost / dragging / drop-target / listeners) para que el
  // re-render de cambiarEstadoServicio pinte sobre un DOM ya limpio.
  kbCleanupDrag();
  if (!grabbed) return; // fue un tap (o scroll abortado): dejamos pasar el onclick normal
  // Hubo grab: el navegador disparará un click sintético sobre la card (incluso si se
  // soltó en el mismo lugar, sin mover >10px → la guarda global _gMoved no se activa).
  // Lo suprimimos acá, robustamente, para que soltar la card NO abra el edit sheet.
  kbSuppressNextClick();
  const destino = kbResolveDrop(dropTarget, estadoActual);
  if (destino) cambiarEstadoServicio(id, destino);
}

export function kbOnPointerCancel() {
  // Abortar limpio (igual que soltar fuera): no se cambia estado.
  kbCleanupDrag();
}

// Suprime el click sintético que el navegador dispara después de un pointerup tras un grab,
// para que soltar una card (aunque sea en el mismo lugar) NO abra el edit sheet.
export function kbSuppressNextClick() {
  function eat(ev) { ev.stopPropagation(); ev.preventDefault(); cleanup(); }
  function cleanup() { window.removeEventListener('click', eat, true); clearTimeout(tid); }
  const tid = setTimeout(cleanup, 500); // red de seguridad por si no llega ningún click
  window.addEventListener('click', eat, true);
}

// Un único pointerdown delegado en document (capture) filtrado a .kb-board, porque
// el board se re-renderiza con innerHTML y los listeners por-card se perderían.
document.addEventListener('pointerdown', kbOnPointerDown, true);

let _cliNombresPedidos = false; // guarda anti-reentrada de la carga del mapa id→nombre
export function renderCoordList(keepLimit) {
  if (!keepLimit) M._coordVisibleLimit = M.COORD_PAGE_SIZE;
  // El nombre del cliente en las cards sale del mapa id→nombre (una carga, cacheada). Si aún no está,
  // lo pedimos y re-renderizamos cuando llega (fire-and-forget; reintenta en el próximo render si falla).
  if (!clienteNombresCargados() && !_cliNombresPedidos) {
    _cliNombresPedidos = true;
    // re-render con keepLimit=true → no colapsa el "cargar más" que el usuario haya expandido mientras cargaba.
    ensureClienteNombres().finally(() => { _cliNombresPedidos = false; if (clienteNombresCargados()) renderCoordList(true); });
  }
  const content = document.getElementById('coord-content');
  const dateLocale = currentLang === 'pt-BR' ? 'pt-BR' : 'es-UY';
  const isRelevTab = M.activeCoordTab === 'relevamientos';
  const isPruebasTab = M.activeCoordTab === 'pruebas';
  const emptyMonthKey = isPruebasTab ? 'coord.empty.month.pruebas' : isRelevTab ? 'coord.empty.month.relev' : 'coord.empty.month';

  const nuevoTrabajoBtn = M.activeCoordTab === 'servicios'
    ? `<div style="padding:12px 16px 0"><button class="nueva-prop-btn" onclick="openNewServiceSheet()">${t('coord.new.servicio')}</button></div>`
    : '';

  const filteredAll = applyCoordFilters(M._coordAllServices, { isProps: false });
  if (!filteredAll.length) {
    content.innerHTML = nuevoTrabajoBtn + `<div class="coord-empty">${getActiveFilterCount() ? '🔎 Sin resultados para los filtros actuales' : t(emptyMonthKey)}</div>`;
    return;
  }
  const total = filteredAll.length;
  const filtered = filteredAll.slice(0, M._coordVisibleLimit);
  const remaining = total - filtered.length;

  // La FECHA agrupa las cards (encabezado por día exacto: 📍 Hoy · 8 jul / ⏭ Mañana · 9 jul / 10 jul…)
  // cuando el sort es cronológico. Con sort alfabético = lista plana sin headers. El orden (asc/desc) ya
  // lo aplicó applyCoordFilters, así que groupServicesByDay solo agrupa preservándolo; "sin fecha" al final.
  const isChronological = M.coordFilters.sort === 'date-asc' || M.coordFilters.sort === 'date-desc';
  if (!isChronological) {
    content.innerHTML = nuevoTrabajoBtn + '<div class="day-group">' + filtered.map(coordServiceCard).join('') + '</div>' + renderCargarMasButton(remaining);
    return;
  }
  const html = groupServicesByDay(filtered).map(g =>
    `<div class="day-group"><div class="day-label ${g.isHoy ? 'today' : ''}">${g.label} (${g.items.length})</div>${g.items.map(coordServiceCard).join('')}</div>`
  ).join('');
  content.innerHTML = nuevoTrabajoBtn + (html || `<div class="coord-empty">${t(emptyMonthKey)}</div>`) + renderCargarMasButton(remaining);
}


// Registro de sets de fotos para el visor de galería de las cards del coord (pvRetry + el visor viven en
// src/fotos.js; esto se queda acá porque lo usa coordCardThumb, que es del coordinador).

// Abre el visor con TODAS las fotos de una galería, leyendo los thumbs del DOM (sin estado global).


// Miniatura de la primera foto a la DERECHA de la card (2026-07-06, pedido Diego): en vez del
// desplegable "Ver fotos" que agrandaba la card, una miniatura del alto de la card (NO la agranda).
// A la derecha (order:2 en CSS) para que el texto de todas las cards quede alineado (con y sin foto).
// Carga lazy (solo las visibles) y chica → no enlentece la lista. Tocarla abre la foto en pestaña
// nueva; "+N" si hay más (el resto se ve al abrir el servicio). Reemplaza renderPhotoGallery en las cards.
export function coordCardThumb(props) {
  const files = extractServiceFiles(props);
  const px = (u) => '/api/img?u=' + encodeURIComponent(u);
  const fotos = [
    ...files.pre.map(u => ({ url: px(u), seccion: t('foto.sec.antes') })),
    ...files.post.map(u => ({ url: px(u), seccion: t('foto.sec.despues') })),
    ...files.relevamiento.map(u => ({ url: px(u), seccion: t('foto.sec.relev') })),
  ];
  if (!fotos.length) return '';
  // Tocar la miniatura abre el VISOR con TODAS las fotos del servicio (antes: abría 1 en pestaña nueva).
  const key = _pvRegister(fotos);
  const more = fotos.length > 1 ? `<span class="thumb-more">+${fotos.length - 1}</span>` : '';
  return `<a class="coord-card-thumb" style="cursor:zoom-in" onclick="event.stopPropagation();openPhotoViewer(_pvSets['${key}'],0)"><img loading="lazy" src="${fotos[0].url}" alt="">${more}</a>`;
}


// ── Agrupación de jornadas por "trabajo madre" (LEE la relación Orden madre) ──
// Un trabajo multi-día = varias fichas que comparten la misma raíz (Orden madre, o la ficha misma si es J1).
export function jobRootId(svc) {
  const p = svc?.properties || {};
  return p['Orden madre']?.relation?.[0]?.id || svc?.id;
}
export function jobGroup(svc, pool) {
  const root = jobRootId(svc);
  if (!root) return svc ? [svc] : [];
  return (pool || []).filter(f => f.id === root || (f.properties?.['Orden madre']?.relation?.[0]?.id === root));
}
// El trabajo está "completo" si alguna ficha del grupo quedó Completada al 100% (la jornada final).
export function jobCompleto(svc, pool) {
  return jobGroup(svc, pool).some(f => (f.properties?.['Estado']?.select?.name || '').includes('Completado') && f.properties?.['% de avance']?.number === 100);
}

export function coordServiceCard(s) {
  const props = s.properties || {};
  const nombreRaw = props['Nombre del servicio']?.title?.[0]?.plain_text;
  let nombreHTML;
  if (nombreRaw) {
    nombreHTML = esc(nombreRaw);
  } else {
    const idShort = esc((s.id || '').slice(0, 8));
    nombreHTML = `<span style="color:#c67e25">⚠️ Servicio sin nombre (${idShort})</span>`;
    console.warn('[fc] coord: servicio sin nombre', s.id, 'properties keys:', Object.keys(props));
  }
  const estado = props['Estado']?.select?.name || '';
  const tipo = tipoServicioStr(props);
  const operarioAppName = props['Operario App']?.select?.name || '';
  const legacyOpsNames = (props['Operario(s)']?.people || []).map(p => p.name).join(', ');
  const participantes = (props['Operarios participantes']?.multi_select || []).map(o => o.name);
  const baseOp = operarioAppName || legacyOpsNames || t('coord.unassigned');
  const ops = participantes.length > 0
    ? `${esc(baseOp)} <span style="color:var(--text3);font-size:11px">+${participantes.length} ayudante${participantes.length > 1 ? 's' : ''}</span>`
    : esc(baseOp);
  const jornadaN = props['Jornada N°']?.number;
  const tipoReg = props['Tipo de registro']?.select?.name || '';
  const esJornada = jornadaN != null || tipoReg.includes('Jornada');
  const esPrueba = tipoReg.includes('Prueba');
  const esRelev = tipoReg.includes('Relevamiento');
  const pctAvance = props['% de avance']?.number;
  // Marca "fuera de fecha": si la fecha planificada original difiere de la programada actual (se inició otro día).
  const _fPlan = (props['Fecha planificada']?.date?.start || '').split('T')[0];
  const _fProg = (props['Fecha programada']?.date?.start || '').split('T')[0];
  const fueraDeFecha = !!_fPlan && !!_fProg && _fPlan !== _fProg;
  const fPlanFmt = fueraDeFecha ? `${_fPlan.slice(8, 10)}/${_fPlan.slice(5, 7)}` : '';
  // Chip de tipo: SOLO en 🏠 Inicio, donde conviven los 4 tipos en una misma lista.
  // En las otras tabs todas las cards son del mismo tipo → el chip sería ruido.
  // Para Prueba NO agregamos chip: ya lleva su badge rosa PRUEBA (evita doble distintivo).
  let tipoChip = '';
  if (M.activeCoordTab === 'inicio' && !esPrueba) {
    if (esRelev) tipoChip = '<span class="coord-tipo-chip">🔍 Relevamiento</span>';
    else if (esJornada) tipoChip = '<span class="coord-tipo-chip">🗓️ Jornada</span>';
    else tipoChip = '<span class="coord-tipo-chip">🏢 Servicio</span>';
  }
  const horaInicio = props['Hora Inicio']?.date?.start || '';
  const horaFmt = (horaInicio && horaInicio.includes('T')) ? new Date(horaInicio).toTimeString().slice(0, 5) : '';
  const lugar = props['Lugar']?.rich_text?.[0]?.plain_text || '';
  const estadoClass = estado.includes('Completado') ? 'estado-completado' : estado.includes('En curso') ? 'estado-en-curso' : estado.includes('Asignado') ? 'estado-asignado' : 'estado-pendiente';
  // Etiqueta por día: una jornada completada se lee "🗓️ Jornada N completada" (conserva el color verde).
  const estadoDisplay = (esJornada && jornadaN != null && estado.includes('Completado')) ? t('estado.jornada.completada').replace('{n}', jornadaN) : estado;
  // Badge "Servicio completo": el trabajo entero (grupo de jornadas) llegó al 100% (calculado agrupando).
  const jobDone = jobCompleto(s, M._coordAllServices);
  const thumb = coordCardThumb(props);
  // Cliente: id sin resolver (mapa aún cargando) → blanco (no mentir "sin cliente"); sin id → placeholder.
  const contactoId = props['Contacto']?.relation?.[0]?.id || props['Contactos']?.relation?.[0]?.id || '';
  const _cli = clienteNombreDe(contactoId);
  const cliLine = contactoId
    ? (_cli ? `<div class="coord-cliente" style="font-size:12px;color:var(--text2);margin-top:1px">🏢 ${esc(_cli)}</div>` : '')
    : `<div class="coord-cliente" style="font-size:12px;color:var(--amber,#f59e0b);margin-top:1px">${t('svc.cliente.placeholder')}</div>`;
  return `<div class="coord-service-card${thumb ? ' has-thumb' : ''}" style="cursor:pointer" onclick="openEditSheet('${esc(s.id)}')">
    ${thumb}
    <div class="coord-card-body">
    <div class="coord-service-name">${tipoChip}${esPrueba ? `<span class="service-prueba-badge">${t('prueba.badge')}</span>` : ''}${nombreHTML}${esJornada && jornadaN != null ? ` <span style="color:var(--purple);font-size:12px">J${jornadaN}</span>` : ''}</div>
    ${cliLine}
    <div class="coord-service-meta"><span class="service-estado ${estadoClass}">${esc(estadoDisplay)}</span>${fueraDeFecha ? `<span class="coord-tag" style="background:var(--amber-dark,#7c5300);color:var(--amber,#f59e0b)">${t('badge.fueradefecha').replace('{d}', fPlanFmt)}</span>` : ''}${(esJornada && typeof pctAvance === 'number') ? `<span class="coord-tag">${Math.round(pctAvance)}%</span>` : ''}${jobDone ? `<span class="coord-tag" style="background:var(--green-dark,#14532d);color:var(--green,#22c55e)">${t('badge.servicio.completo')}</span>` : ''}${horaFmt ? `<span class="coord-tag">🕐 ${esc(horaFmt)}</span>` : ''}${tipo ? `<span class="coord-tag">${esc(tipo)}</span>` : ''}${(() => { const c = servicioContinua(s); return c.continua ? `<span class="coord-tag" style="background:var(--amber-dark,#7c5300);color:var(--amber,#f59e0b)">${t('badge.continua').replace('{h}', c.hechos).replace('{t}', c.total)}</span>` : ''; })()}</div>
    <div class="coord-ops">${lugar ? `📍 ${esc(lugar)} · ` : ''}👤 ${ops}</div>
    </div>
  </div>`;
}

export async function fetchCoordItemsForMonth() {
  const { start, end } = getCoordMonthRange();
  const cf = getCountryFilter();
  const filter = {
    or: [
      { and: [
        ...(cf ? [cf] : []),
        { property: 'Fecha programada', date: { on_or_after: start } },
        { property: 'Fecha programada', date: { on_or_before: end } }
      ]},
      ...(cf
        ? [{ and: [cf, { property: 'Fecha programada', date: { is_empty: true } }] }]
        : [{ property: 'Fecha programada', date: { is_empty: true } }]
      )
    ]
  };
  // Fase 2: si el flag está prendido, leer servicios de la base NUEVA (Supabase, más confiable que el search-fallback
  // multi-source de Notion); si falla → fallback a Notion. El re-filtro cliente (filtrarServicios) es el mismo.
  const notionFetch = () => callNotion(`databases/${M.DB_ID}/query`, 'POST', { filter, sorts: [{ property: 'Fecha programada', direction: 'ascending' }] });
  let data;
  if (dbFlag('servicios')) {
    try { data = await callDb('servicios'); } catch (e) { data = await notionFetch(); }
  } else {
    data = await notionFetch();
  }
  // El proxy descarta el filtro server-side (multi-data-source) → re-filtrar SIEMPRE en cliente:
  // país + mes (incluyendo los servicios SIN fecha, que se muestran en todos los meses, igual que el filtro server).
  const notionVal = getCountryFilter() ? M.COUNTRY_NOTION_MAP[M.selectedCountry] : null;
  return filtrarServicios(data.results || [], { paisNotion: notionVal, desde: start, hasta: end, incluirSinFecha: true, incluirEnCurso: true });
}

// 🏠 Inicio — centro de mando. Muestra TODO junto (servicios + jornadas + pruebas +
// relevamientos) en las 3 vistas (Lista / Tablero / Calendario), SIN filtrar por
// Tipo de registro. La única diferencia con renderCoordServicios es justamente eso:
// acá M._coordAllServices queda con todos los items del mes. El chip de tipo en la card
// (coordServiceCard) solo aparece en esta tab para distinguirlos.
export async function renderCoordInicio() {
  if (esVentas()) return; // blindaje: Ventas no ve Inicio, ni por un llamado directo
  const content = document.getElementById('coord-content');
  content.innerHTML = '<div style="text-align:center;padding:40px 0"><div class="spinner" style="margin:0 auto"></div></div>';
  document.getElementById('coord-week-strip').style.display = 'none'; // tira de días quitada (2026-07-06): se usa la agrupación por fecha + el ‹ mes ›
  // Guard de race condition: si el usuario cambia de tab mientras este fetch está en vuelo,
  // cuando termine NO sobrescribir el content del tab nuevo.
  const myTab = 'inicio';
  try {
    const items = await fetchCoordItemsForMonth();
    if (M.activeCoordTab !== myTab) return; // tab cambió → abortar
    M._coordAllServices = items.filter(s => !esArchivado(s)); // SIN filtro de tipo → todos (servicios + jornadas + pruebas + relevamientos)
    if (!M.selectedCoordDay) M.selectedCoordDay = 'all';
    renderWeekStrip(M._coordAllServices);
    // El toggle Lista/Tablero/Calendario solo se ve en Inicio. renderCoordServiciosView lo muestra (display:flex) y decide qué pintar.
    renderCoordServiciosView();
    refreshCoordFilterSheetIfOpen();
  } catch (e) {
    if (M.activeCoordTab !== myTab) return;
    content.innerHTML = `<div class="coord-empty">${t('coord.error.load')}<br><small>${esc(e.message)}</small></div>`;
  }
}

export async function renderCoordServicios() {
  if (esVentas()) return; // blindaje: Ventas no ve Servicios, ni por un llamado directo
  const content = document.getElementById('coord-content');
  content.innerHTML = '<div style="text-align:center;padding:40px 0"><div class="spinner" style="margin:0 auto"></div></div>';
  document.getElementById('coord-week-strip').style.display = 'none'; // tira de días quitada (2026-07-06): se usa la agrupación por fecha + el ‹ mes ›
  document.getElementById('coord-view-toggle').style.display = 'none'; // toggle Lista/Tablero solo en Inicio
  // Guard de race condition: si el usuario cambia de tab mientras este fetch está en vuelo,
  // cuando termine NO sobrescribir el content del tab nuevo.
  const myTab = 'servicios';
  try {
    const items = await fetchCoordItemsForMonth();
    if (M.activeCoordTab !== myTab) return; // tab cambió → abortar
    M._coordAllServices = items.filter(s => {
      if (esArchivado(s)) return false;
      const tipoReg = s.properties?.['Tipo de registro']?.select?.name || '';
      return !tipoReg.includes('Relevamiento') && !tipoReg.includes('Prueba');
    });
    if (!M.selectedCoordDay) M.selectedCoordDay = 'all';
    renderWeekStrip(M._coordAllServices);
    // Servicios = lista cronológica simple (sin toggle de vistas; eso vive en Inicio).
    renderCoordList();
    refreshCoordFilterSheetIfOpen();
  } catch (e) {
    if (M.activeCoordTab !== myTab) return;
    content.innerHTML = `<div class="coord-empty">${t('coord.error.load')}<br><small>${esc(e.message)}</small></div>`;
  }
}

export async function renderCoordPruebas() {
  if (esVentas()) return; // blindaje: Ventas no ve Pruebas, ni por un llamado directo
  const content = document.getElementById('coord-content');
  content.innerHTML = '<div style="text-align:center;padding:40px 0"><div class="spinner" style="margin:0 auto"></div></div>';
  document.getElementById('coord-week-strip').style.display = 'none'; // tira de días quitada (2026-07-06): se usa la agrupación por fecha + el ‹ mes ›
  document.getElementById('coord-view-toggle').style.display = 'none'; // toggle Lista/Tablero solo en Inicio
  const myTab = 'pruebas';
  try {
    const items = await fetchCoordItemsForMonth();
    if (M.activeCoordTab !== myTab) return;
    M._coordAllServices = items.filter(s => {
      if (esArchivado(s)) return false;
      const tipoReg = s.properties?.['Tipo de registro']?.select?.name || '';
      return tipoReg.includes('Prueba');
    });
    if (!M.selectedCoordDay) M.selectedCoordDay = 'all';
    renderWeekStrip(M._coordAllServices);
    renderCoordList();
    refreshCoordFilterSheetIfOpen();
  } catch (e) {
    if (M.activeCoordTab !== myTab) return;
    content.innerHTML = `<div class="coord-empty">${t('coord.error.load')}<br><small>${esc(e.message)}</small></div>`;
  }
}

export async function renderCoordRelevamientos() {
  if (esVentas()) return; // blindaje: Ventas no ve Relevamientos, ni por un llamado directo
  const content = document.getElementById('coord-content');
  content.innerHTML = '<div style="text-align:center;padding:40px 0"><div class="spinner" style="margin:0 auto"></div></div>';
  document.getElementById('coord-week-strip').style.display = 'none'; // tira de días quitada (2026-07-06): se usa la agrupación por fecha + el ‹ mes ›
  document.getElementById('coord-view-toggle').style.display = 'none'; // toggle Lista/Tablero solo en Inicio
  const myTab = 'relevamientos';
  try {
    const items = await fetchCoordItemsForMonth();
    if (M.activeCoordTab !== myTab) return;
    M._coordAllServices = items.filter(s => {
      if (esArchivado(s)) return false;
      const tipoReg = s.properties?.['Tipo de registro']?.select?.name || '';
      return tipoReg.includes('Relevamiento');
    });
    if (!M.selectedCoordDay) M.selectedCoordDay = 'all';
    renderWeekStrip(M._coordAllServices);
    renderCoordList();
    refreshCoordFilterSheetIfOpen();
  } catch (e) {
    if (M.activeCoordTab !== myTab) return;
    content.innerHTML = `<div class="coord-empty">${t('coord.error.load')}<br><small>${esc(e.message)}</small></div>`;
  }
}
