// ─────────────────────────────────────────────
// FINANZAS operativa — tab Finanzas (listas de Gastos/Ingresos con filtros y "cargar más"), sheet ➕ nuevo
// ingreso manual (rol Finanzas, país-aware), sheet editar cobro, y Reportes PDF (semanal/mensual/por
// servicio). Extraído de main.js el 2026-07-17 (patrón puente initFinanzas).
// ─────────────────────────────────────────────
// El ESTADO que tocan handlers inline queda en main (accessors de gen-globals): activeFinanzasTab (además
// la lee gastos.js), ingresoState/cobroState, _finanzasVisibleLimit y los 3 filtros → M. Los IDs de DBs
// también (los comparten otros puentes). Estado propio del módulo: _gastosCache/_ingresosCache.
// setFinanzasTab cablea el render CEO (M._ceoContentId/_ceoRerender/ceoViewCountry + renderCEOFinanzas/
// renderPorCobrar de dashboards vía M).

import { t } from './i18n.js';
import { esc } from './util.js';
import { montoOf, sumByMoneda, kpiIncluido, kpiBadgeHTML, fmtMoneda, fmtTotalSplit } from './calculos.js';
import { callNotion, callNotionAll, syncAfterWrite } from './api.js';
import { ensureJsPDF } from './reporte.js';
import { renderReciboThumb } from './gastos.js';

let M = {};
export function initFinanzas(bridge) { M = bridge; }

const clienteNombre = (...a) => M.clienteNombre(...a);
const finRecEnPais = (...a) => M.finRecEnPais(...a);
const getCEOFinanceFilter = (...a) => M.getCEOFinanceFilter(...a);
const markUserActive = (...a) => M.markUserActive(...a);
const openReportStep = (...a) => M.openReportStep(...a);
const recEnPaisNotion = (...a) => M.recEnPaisNotion(...a);
const renderCEOFinanzas = (...a) => M.renderCEOFinanzas(...a);
const renderCargarMasButton = (...a) => M.renderCargarMasButton(...a);
const renderClientesView = (...a) => M.renderClientesView(...a);
const renderPorCobrar = (...a) => M.renderPorCobrar(...a);

// Estado propio del módulo (cachés de las listas).
let _gastosCache = null;
let _ingresosCache = null;

const INGRESO_TIPOS = ['🏢 Fachada', '🪟 Vidrio', '📋 Relevamiento', '🔧 Otro'];

export async function fetchGastosForMonth() {
  // Pagina TODO (antes se cortaba en 100 → faltaban gastos cuando hay >100).
  // Filtro SERVER-SIDE de país (Gastos no está en el espejo → sin esto el payload traía todos los países):
  // usa getCEOFinanceFilter (M.ceoViewCountry). El caché se resetea al cambiar de país (resetGastosCache).
  const paisF = getCEOFinanceFilter();
  const body = { sorts: [{ property: 'Fecha', direction: 'descending' }] };
  if (paisF) body.filter = paisF;
  const data = await callNotionAll(`databases/${M.GASTOS_DB_ID}/query`, body);
  return data.results || [];
}

// Resetea el caché de gastos de Finanzas — se llama al cambiar el país en el CEO/Finanzas para que la lista
// se re-fetchee con el filtro server-side del nuevo país (si no, mostraría el país anterior).
export function resetGastosCache() { _gastosCache = null; }

export async function fetchIngresosForMonth() {
  const data = await callNotionAll(`databases/${M.INGRESOS_DB_ID}/query`, {
    sorts: [{ property: 'Fecha', direction: 'descending' }]
  });
  // Orden defensivo client-side: con DB_FLAGS.ingresos la lectura sale del espejo (/api/db), que
  // ignora los `sorts` de Notion — sin esto la lista quedaría desordenada.
  return (data.results || []).slice().sort((a, b) =>
    (b.properties?.['Fecha']?.date?.start || '').localeCompare(a.properties?.['Fecha']?.date?.start || ''));
}

export function setFinanzasTab(tab) {
  M.activeFinanzasTab = tab;
  markUserActive();
  ['resumen', 'porcobrar', 'clientes', 'gastos', 'ingresos', 'reportes'].forEach(t => {
    const el = document.getElementById('ftab-' + t);
    if (el) el.classList.toggle('active', t === tab);
  });
  M._finanzasVisibleLimit = M.COORD_PAGE_SIZE;
  M._finanzasFilterCategoria = '';
  M._finanzasFilterClase = '';
  M._finanzasFilterTipo = '';
  if (tab === 'resumen') {
    M._ceoContentId = 'finanzas-content';
    M.ceoViewCountry = M.currentUser?.country || 'Uruguay'; // Finanzas país-aware: cada encargado ve SU país (UY incluye registros sin país)
    M._ceoRerender = renderCEOFinanzas;
    renderCEOFinanzas();
  } else if (tab === 'porcobrar') { M._ceoContentId = 'finanzas-content'; M._ceoRerender = () => renderPorCobrar('finanzas-content'); renderPorCobrar('finanzas-content'); }
  else if (tab === 'clientes') { M._ceoContentId = 'finanzas-content'; M._ceoRerender = () => renderClientesView('finanzas-content'); renderClientesView('finanzas-content'); }
  else if (tab === 'gastos') renderGastosList();
  else if (tab === 'ingresos') renderIngresosList();
  else renderReportes();
}

export async function renderGastosList() {
  const myTab = 'gastos';
  const content = document.getElementById('finanzas-content');
  content.innerHTML = '<div style="text-align:center;padding:40px 0"><div class="spinner" style="margin:0 auto"></div></div>';
  try {
    if (!_gastosCache) _gastosCache = await fetchGastosForMonth();
    if (M.activeFinanzasTab !== myTab) return;
    renderGastosListInner();
  } catch (e) {
    if (M.activeFinanzasTab !== myTab) return;
    content.innerHTML = `<div class="coord-empty">${t('coord.error.load')}<br><small>${esc(e.message)}</small></div>`;
  }
}

export function renderGastosListInner() {
  const content = document.getElementById('finanzas-content');
  let items = (_gastosCache || []).filter(finRecEnPais);
  if (M._finanzasFilterCategoria) items = items.filter(g => g.properties?.['Categoría']?.select?.name === M._finanzasFilterCategoria);
  if (M._finanzasFilterClase) items = items.filter(g => g.properties?.['Clase']?.select?.name === M._finanzasFilterClase);
  const total = items.length;
  const visible = items.slice(0, M._finanzasVisibleLimit);
  const remaining = total - visible.length;

  const totalSplit = sumByMoneda(items, 'gasto');

  const categorias = [...new Set((_gastosCache || []).map(g => g.properties?.['Categoría']?.select?.name).filter(Boolean))].sort();
  const filtersHTML = `
    <div class="finanzas-filters">
      <select class="finanzas-filter-select" onchange="_finanzasFilterCategoria=this.value;_finanzasVisibleLimit=COORD_PAGE_SIZE;renderGastosListInner()">
        <option value="">📂 Todas las categorías</option>
        ${categorias.map(c => `<option value="${esc(c)}" ${M._finanzasFilterCategoria===c?'selected':''}>${esc(c)}</option>`).join('')}
      </select>
      <select class="finanzas-filter-select" onchange="_finanzasFilterClase=this.value;_finanzasVisibleLimit=COORD_PAGE_SIZE;renderGastosListInner()">
        <option value="">🏷 Todas (directos + indirectos)</option>
        <option value="📌 Directo" ${M._finanzasFilterClase==='📌 Directo'?'selected':''}>📌 Solo Directos</option>
        <option value="🔁 Indirecto" ${M._finanzasFilterClase==='🔁 Indirecto'?'selected':''}>🔁 Solo Indirectos</option>
      </select>
    </div>
    <div class="finanzas-summary">${t('finanzas.gastos.total')} ${fmtTotalSplit(totalSplit)} <span style="color:var(--text3);font-size:12px">(${total} ${total===1?'gasto':'gastos'})</span></div>
  `;

  const cards = visible.map(g => {
    const props = g.properties || {};
    const concepto = props['Concepto']?.title?.[0]?.plain_text || '(sin concepto)';
    const categoria = props['Categoría']?.select?.name || '';
    const clase = props['Clase']?.select?.name || '';
    const { moneda, monto } = montoOf(props, 'gasto');
    const fecha = props['Fecha']?.date?.start || '';
    const proveedor = props['Tienda / Proveedor']?.rich_text?.[0]?.plain_text || '';
    const cargadoPor = props['Cargado por']?.select?.name || '';
    const servicioVinculado = (props['Servicio']?.relation || []).length > 0;
    const fotoFiles = props['Foto del recibo']?.files || [];
    const fotoUrl = fotoFiles[0]?.external?.url || fotoFiles[0]?.file?.url || '';
    return `<div class="gasto-card">
      <div class="gasto-card-main">
        <div class="gasto-card-concepto">${esc(concepto)}${kpiBadgeHTML(props)}</div>
        <div class="gasto-card-meta">
          ${categoria ? `<span class="gasto-tag">${esc(categoria)}</span>` : ''}
          ${clase ? `<span class="gasto-tag gasto-tag-clase">${esc(clase)}</span>` : ''}
          ${servicioVinculado ? `<span class="gasto-tag gasto-tag-svc">🔗 Servicio</span>` : ''}
          ${cargadoPor ? `<span class="gasto-tag">👤 ${esc(cargadoPor)}</span>` : ''}
        </div>
        <div class="gasto-card-bottom">
          ${proveedor ? `<span style="font-size:11px;color:var(--text3)">${esc(proveedor)}</span>` : ''}
          <span style="font-size:11px;color:var(--text3)">${esc(fecha)}</span>
        </div>
      </div>
      <div class="gasto-card-monto">
        <div class="gasto-monto-val">${fmtMoneda(monto, moneda)}</div>
        ${renderReciboThumb(fotoUrl)}
      </div>
    </div>`;
  }).join('');

  const empty = total === 0 ? `<div class="coord-empty">${t('finanzas.gastos.none')}</div>` : '';
  const cargarMas = remaining > 0 ? renderCargarMasButton(remaining) : '';
  // M3 usaba un FAB con position:fixed que rompía dentro del scroll container en
  // iOS (Safari quirk). Reemplazado por botón inline al tope (mismo UX que CEO).
  const addBtn = `<div style="padding:12px 16px 4px"><button class="edit-save-btn" onclick="openNuevoGastoSheet()">📷 + ${t('finanzas.gastos.add')}</button></div>`;
  content.innerHTML = addBtn + filtersHTML + (cards || empty) + cargarMas;
}

export async function renderIngresosList() {
  const myTab = 'ingresos';
  const content = document.getElementById('finanzas-content');
  content.innerHTML = '<div style="text-align:center;padding:40px 0"><div class="spinner" style="margin:0 auto"></div></div>';
  try {
    if (!_ingresosCache) _ingresosCache = await fetchIngresosForMonth();
    if (M.activeFinanzasTab !== myTab) return;
    renderIngresosListInner();
  } catch (e) {
    if (M.activeFinanzasTab !== myTab) return;
    content.innerHTML = `<div class="coord-empty">${t('coord.error.load')}<br><small>${esc(e.message)}</small></div>`;
  }
}

export function renderIngresosListInner() {
  const content = document.getElementById('finanzas-content');
  let items = (_ingresosCache || []).filter(finRecEnPais);
  if (M._finanzasFilterTipo) items = items.filter(i => i.properties?.['Tipo']?.select?.name === M._finanzasFilterTipo);
  const total = items.length;
  const visible = items.slice(0, M._finanzasVisibleLimit);
  const remaining = total - visible.length;

  const totalSplit = sumByMoneda(items, 'ingreso');

  const tipos = [...new Set((_ingresosCache || []).map(i => i.properties?.['Tipo']?.select?.name).filter(Boolean))].sort();
  const filtersHTML = `
    <div class="finanzas-filters">
      <select class="finanzas-filter-select" onchange="_finanzasFilterTipo=this.value;_finanzasVisibleLimit=COORD_PAGE_SIZE;renderIngresosListInner()">
        <option value="">🛠 Todos los tipos</option>
        ${tipos.map(tp => `<option value="${esc(tp)}" ${M._finanzasFilterTipo===tp?'selected':''}>${esc(tp)}</option>`).join('')}
      </select>
    </div>
    <div class="finanzas-summary">${t('finanzas.ingresos.total')} ${fmtTotalSplit(totalSplit, {sign:'+'})} <span style="color:var(--text3);font-size:12px">(${total} ${total===1?'cobro':'cobros'})</span></div>
  `;

  const cards = visible.map(i => {
    const props = i.properties || {};
    const cliente = props['Cliente']?.rich_text?.[0]?.plain_text || '';
    // El título "Servicio" suele venir vacío (cowork + automatización Notion) → caer al Cliente.
    const servicioTitle = props['Servicio']?.title?.[0]?.plain_text || cliente || '(sin nombre)';
    const tipo = props['Tipo']?.select?.name || '';
    const { moneda, monto } = montoOf(props, 'ingreso');
    const fecha = props['Fecha']?.date?.start || '';
    const facturado = props['Facturado']?.checkbox || false;
    return `<div class="gasto-card">
      <div class="gasto-card-main">
        <div class="gasto-card-concepto">${esc(servicioTitle)}${kpiBadgeHTML(props)}</div>
        <div class="gasto-card-meta">
          ${tipo ? `<span class="gasto-tag">${esc(tipo)}</span>` : ''}
          ${facturado ? `<span class="gasto-tag gasto-tag-svc">📄 Facturado</span>` : ''}
        </div>
        <div class="gasto-card-bottom">
          ${cliente && cliente !== servicioTitle ? `<span style="font-size:11px;color:var(--text3)">${esc(cliente)}</span>` : ''}
          <span style="font-size:11px;color:var(--text3)">${esc(fecha)}</span>
        </div>
      </div>
      <div class="gasto-card-monto">
        <div class="gasto-monto-val" style="color:var(--green)">+${fmtMoneda(monto, moneda)}</div>
      </div>
    </div>`;
  }).join('');

  const empty = total === 0 ? `<div class="coord-empty">${t('finanzas.ingresos.none')}</div>` : '';
  const cargarMas = remaining > 0 ? renderCargarMasButton(remaining) : '';
  const addBtn = `<div style="padding:12px 16px 4px"><button class="edit-save-btn" onclick="openNuevoIngresoSheet()">💵 + Nuevo ingreso / pago</button></div>`;
  content.innerHTML = addBtn + filtersHTML + (cards || empty) + cargarMas;
}


export function ingresoOverlayClick(e) { if (e.target?.id === 'ingreso-overlay') closeIngresoSheet(); }
export function closeIngresoSheet() { document.getElementById('ingreso-overlay')?.classList.remove('open'); M.ingresoState = null; }
export function ingresoSetCliente(id) {
  if (!M.ingresoState) return;
  M.ingresoState.form.clienteId = id;
  const c = M.ingresoState.contactos.find(x => x.id === id);
  M.ingresoState.form.clienteNombre = c ? (c.properties?.['Nombre / Empresa']?.title?.[0]?.plain_text || '') : '';
  M.ingresoState.form.servicioId = '';
  renderIngresoSheet();
}
export async function openNuevoIngresoSheet() {
  const hoy = new Date().toISOString().slice(0, 10);
  M.ingresoState = { saving: false, loading: true, contactos: [], servicios: [], form: { clienteId: '', clienteNombre: '', servicioId: '', monto: 0, moneda: '🇺🇸 USD', fecha: hoy, tipo: '🔧 Otro', detalle: '', facturado: false } };
  document.getElementById('ingreso-overlay')?.classList.add('open');
  renderIngresoSheet();
  try {
    const [cont, svc] = await Promise.all([
      callNotion(`databases/${M.CONTACTOS_DB_ID}/query`, 'POST', { sorts: [{ property: 'Nombre / Empresa', direction: 'ascending' }] }),
      callNotion(`databases/${M.DB_ID}/query`, 'POST', {})
    ]);
    if (!M.ingresoState) return; // se cerró mientras cargaba
    // Aislamiento por país: cada Finanzas ve solo clientes/servicios de su país (el proxy descarta el filtro
    // de servidor en Servicios multi-source, así que filtramos cliente-side con el mismo helper del resto de la app).
    M.ingresoState.contactos = (cont.results || []).filter(recEnPaisNotion);
    M.ingresoState.servicios = (svc.results || []).filter(recEnPaisNotion);
  } catch (e) { /* el form igual sirve sin dropdowns */ }
  if (M.ingresoState) { M.ingresoState.loading = false; renderIngresoSheet(); }
}
export function renderIngresoSheet() {
  const body = document.getElementById('ingreso-sheet-body');
  if (!body || !M.ingresoState) return;
  const s = M.ingresoState, f = s.form;
  if (s.saving) { body.innerHTML = '<div style="text-align:center;padding:40px 0"><div class="spinner" style="margin:0 auto"></div><div style="margin-top:10px;color:var(--text3)">Guardando…</div></div>'; return; }
  const tit = c => c.properties?.['Nombre / Empresa']?.title?.[0]?.plain_text || '(sin nombre)';
  const contactOpts = s.contactos.slice().sort((a, b) => tit(a).localeCompare(tit(b)))
    .map(c => `<option value="${esc(c.id)}" ${f.clienteId === c.id ? 'selected' : ''}>${esc(tit(c))}</option>`).join('');
  const svcTit = sv => sv.properties?.['Nombre del servicio']?.title?.[0]?.plain_text || '(servicio)';
  const norm = x => (x || '').replace(/-/g, '');
  const svcsDelCliente = f.clienteId ? s.servicios.filter(sv => (sv.properties?.['Contacto']?.relation || []).some(r => norm(r.id) === norm(f.clienteId))) : [];
  const svcOpts = svcsDelCliente.map(sv => `<option value="${esc(sv.id)}" ${f.servicioId === sv.id ? 'selected' : ''}>${esc(svcTit(sv))}</option>`).join('');
  const monedas = ['🇺🇸 USD', '🇺🇾 UY$'];
  const clienteSection = s.loading
    ? `<div class="edit-section"><div class="edit-section-label">Cliente</div><div style="color:var(--text3);font-size:13px;padding:6px 0">Cargando clientes…</div></div>`
    : `<div class="edit-section"><div class="edit-section-label">Cliente</div>
         <select class="finanzas-filter-select" style="width:100%" onchange="ingresoSetCliente(this.value)">
           <option value="">— Elegí un cliente —</option>${contactOpts}
         </select></div>` +
      (f.clienteId ? `<div class="edit-section"><div class="edit-section-label">Servicio vinculado (opcional)</div>
         <select class="finanzas-filter-select" style="width:100%" onchange="ingresoState.form.servicioId=this.value">
           <option value="">— Sin servicio —</option>${svcOpts}
         </select></div>` : '');
  body.innerHTML =
    clienteSection +
    `<div class="edit-section"><div class="edit-section-label">Moneda</div><div class="estado-btns">${monedas.map(m => `<button class="estado-btn ${f.moneda === m ? 'active' : ''}" onclick="ingresoState.form.moneda='${m}';renderIngresoSheet()">${m}</button>`).join('')}</div></div>` +
    `<div class="edit-section"><div class="edit-section-label">Monto</div><input type="number" inputmode="decimal" class="edit-date-input" value="${f.monto || ''}" oninput="ingresoState.form.monto=parseFloat(this.value)||0" placeholder="0"/></div>` +
    `<div class="edit-section"><div class="edit-section-label">Fecha</div><input type="date" class="edit-date-input" value="${f.fecha}" oninput="ingresoState.form.fecha=this.value"/></div>` +
    `<div class="edit-section"><div class="edit-section-label">Tipo</div><div class="estado-btns">${INGRESO_TIPOS.map(tp => `<button class="estado-btn ${f.tipo === tp ? 'active' : ''}" onclick="ingresoState.form.tipo='${tp.replace(/'/g, "\\'")}';renderIngresoSheet()">${tp}</button>`).join('')}</div></div>` +
    `<div class="edit-section"><div class="edit-section-label">Detalle (opcional)</div><textarea class="edit-date-input" rows="2" style="resize:none;height:60px" oninput="ingresoState.form.detalle=this.value" placeholder="Nota…">${esc(f.detalle || '')}</textarea></div>` +
    `<div class="edit-section"><label style="display:flex;align-items:center;gap:8px;cursor:pointer"><input type="checkbox" ${f.facturado ? 'checked' : ''} onchange="ingresoState.form.facturado=this.checked"/> <span style="font-size:14px">Facturado</span></label></div>` +
    `<div style="padding:14px 16px"><button class="edit-save-btn" style="width:100%" onclick="saveIngreso()">💾 Guardar ingreso</button></div>`;
}
export async function saveIngreso() {
  if (!M.ingresoState || M.ingresoState.saving) return;
  const f = M.ingresoState.form;
  if (!f.monto || f.monto <= 0) { alert('Ingresá un monto mayor a 0.'); return; }
  if (!f.fecha) { alert('Ingresá la fecha.'); return; }
  M.ingresoState.saving = true; renderIngresoSheet();
  const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const [yy, mm] = f.fecha.split('-').map(Number);
  const mesLabel = `${meses[mm - 1]} ${yy}`;
  const countryMap = { 'Uruguay': '🇺🇾 UY', 'Brasil': '🇧🇷 BR', 'Panamá': '🇵🇦 PA', 'Guatemala': '🇬🇹 GT', 'México': '🇲🇽 MX' };
  const props = {
    'Servicio': { title: [{ text: { content: f.clienteNombre || 'Cobro manual' } }] },
    'Fecha': { date: { start: f.fecha } },
    'Mes': { select: { name: mesLabel } },
    'Tipo': { select: { name: f.tipo } },
    'Moneda cobro': { select: { name: f.moneda } },
    'País': { select: { name: countryMap[M.currentUser?.country] || '🇺🇾 UY' } },
    'Facturado': { checkbox: !!f.facturado },
  };
  if (f.moneda === '🇺🇾 UY$') props['Monto UY$ cobrado'] = { number: f.monto };
  else props['Monto USD'] = { number: f.monto };
  if (f.clienteId) props['Cuenta'] = { relation: [{ id: f.clienteId }] };
  if (f.clienteNombre) props['Cliente'] = { rich_text: [{ text: { content: f.clienteNombre } }] };
  if (f.servicioId) props['Servicio vinculado'] = { relation: [{ id: f.servicioId }] };
  if (f.detalle) props['Detalle'] = { rich_text: [{ text: { content: f.detalle } }] };
  try {
    await callNotion('pages', 'POST', { parent: { type: 'data_source_id', data_source_id: M.INGRESOS_DS_ID }, properties: props });
    _ingresosCache = null;
    closeIngresoSheet();
    if (M.activeFinanzasTab === 'ingresos') renderIngresosList();
  } catch (e) {
    if (M.ingresoState) { M.ingresoState.saving = false; renderIngresoSheet(); }
    alert('No se pudo guardar el ingreso: ' + e.message);
  }
}

// ── C7: Editar cobro existente (Finanzas) ───────────────────────────────────
// openCobroSheet(ingId) carga el cobro desde Notion + servicios del país y abre el sheet.
// renderCobroSheet() dibuja los campos (Servicio, Moneda, Monto, Fecha).
// saveCobroEdit() lo implementa B-5.

export function cobroOverlayClick(e) { if (e.target?.id === 'cobro-overlay') closeCobroSheet(); }
export function closeCobroSheet() { document.getElementById('cobro-overlay')?.classList.remove('open'); M.cobroState = null; }
export async function openCobroSheet(ingId) {
  if (!M.currentUser?.role?.includes('Administración')) return; // solo Finanzas
  document.getElementById('cobro-overlay')?.classList.add('open');
  M.cobroState = { saving: false, loading: true, servicios: [], ing: null, form: null };
  renderCobroSheet();
  try {
    const [page, svc] = await Promise.all([
      callNotion('pages/' + ingId, 'GET'),
      callNotion(`databases/${M.DB_ID}/query`, 'POST', {})
    ]);
    if (!M.cobroState) return; // cerrado mientras cargaba
    const p = page.properties || {};
    const { moneda } = montoOf(p, 'ingreso');
    const montoReal = (moneda === '🇺🇾 UY$') ? (p['Monto UY$ cobrado']?.number || 0) : (p['Monto USD']?.number || 0);
    M.cobroState.ing = page;
    M.cobroState.servicios = (svc.results || []).filter(recEnPaisNotion);
    M.cobroState.form = {
      id: ingId,
      fecha: p['Fecha']?.date?.start ? p['Fecha'].date.start.slice(0, 10) : '',
      moneda,                                           // '🇺🇸 USD' | '🇺🇾 UY$'
      monto: montoReal,                                 // monto real en la moneda etiquetada
      servicioId: (p['Servicio vinculado']?.relation || [])[0]?.id || '',
      clienteId: (p['Cuenta']?.relation || [])[0]?.id || '',
      tc: p['TC aplicado']?.number ?? null,             // re-derivado/limpiado en B-5 (P6)
    };
    M.cobroState.loading = false;
    renderCobroSheet();
  } catch (e) {
    if (M.cobroState) M.cobroState.loading = false;
    const b = document.getElementById('cobro-sheet-body');
    if (b) b.innerHTML = '<div class="coord-empty" style="padding:20px">No se pudo cargar el cobro: ' + esc(e.message || String(e)) + '</div>';
  }
}
export function cobroSetServicio(id) { if (M.cobroState?.form) M.cobroState.form.servicioId = id; }
export function renderCobroSheet() {
  const body = document.getElementById('cobro-sheet-body');
  if (!body || !M.cobroState) return;
  const s = M.cobroState, f = s.form;
  if (s.loading || !f) {
    body.innerHTML = '<div style="text-align:center;padding:40px 0"><div class="spinner" style="margin:0 auto"></div></div>';
    return;
  }
  if (s.saving) {
    body.innerHTML = '<div style="text-align:center;padding:40px 0"><div class="spinner" style="margin:0 auto"></div><div style="margin-top:10px;color:var(--text3)">Guardando…</div></div>';
    return;
  }
  const svcTit = sv => sv.properties?.['Nombre del servicio']?.title?.[0]?.plain_text || '(servicio)';
  const nrm = x => (x || '').replace(/-/g, '');
  // Servicios del cliente del cobro primero (si hay clienteId); el resto después.
  const delCliente = f.clienteId ? s.servicios.filter(sv => (sv.properties?.['Contacto']?.relation || []).some(r => nrm(r.id) === nrm(f.clienteId))) : [];
  const ids = new Set(delCliente.map(x => x.id));
  const resto = s.servicios.filter(sv => !ids.has(sv.id));
  const opt = sv => '<option value="' + esc(sv.id) + '"' + (nrm(f.servicioId) === nrm(sv.id) ? ' selected' : '') + '>' + esc(svcTit(sv)) + '</option>';
  const svcOpts = '<option value="">— Sin servicio —</option>' +
    delCliente.map(opt).join('') +
    (delCliente.length && resto.length ? '<option value="" disabled>────────</option>' : '') +
    resto.map(opt).join('');
  const monedas = ['🇺🇸 USD', '🇺🇾 UY$'];
  body.innerHTML =
    `<div class="edit-section"><div class="edit-section-label">Servicio vinculado</div>` +
    `<select class="finanzas-filter-select" style="width:100%" onchange="cobroSetServicio(this.value)">${svcOpts}</select></div>` +
    `<div class="edit-section"><div class="edit-section-label">Moneda</div><div class="estado-btns">${monedas.map(m => `<button class="estado-btn ${f.moneda === m ? 'active' : ''}" onclick="cobroState.form.moneda='${m}';renderCobroSheet()">${m}</button>`).join('')}</div></div>` +
    `<div class="edit-section"><div class="edit-section-label">Monto cobrado (real)</div><input type="number" inputmode="decimal" class="edit-date-input" value="${f.monto || ''}" oninput="cobroState.form.monto=parseFloat(this.value)||0" placeholder="0"/></div>` +
    `<div class="edit-section"><div class="edit-section-label">Fecha de cobro</div><input type="date" class="edit-date-input" value="${esc(f.fecha)}" oninput="cobroState.form.fecha=this.value"/></div>` +
    `<div style="padding:0 16px 4px;font-size:11px;color:var(--text3)">El monto es lo que entró de verdad, en su moneda. (La cobertura cruzada de un servicio en otra moneda se hace con "✓ cubre este servicio".)</div>` +
    `<div style="padding:14px 16px"><button class="edit-save-btn" style="width:100%" onclick="saveCobroEdit()">💾 Guardar cambios</button></div>`;
}
export async function saveCobroEdit() {
  if (!M.cobroState || M.cobroState.saving || !M.cobroState.form) return;
  const f = M.cobroState.form;
  if (!f.monto || f.monto <= 0) { alert('Ingresá un monto mayor a 0.'); return; }
  if (!f.fecha) { alert('Ingresá la fecha del cobro.'); return; }
  M.cobroState.saving = true; renderCobroSheet();
  const esUY = f.moneda === '🇺🇾 UY$';
  const props = {
    'Fecha': { date: { start: f.fecha } },
    'Moneda cobro': { select: { name: f.moneda } },
  };
  // P6: escribir el monto en el campo de la moneda real y LIMPIAR el campo de la OTRA moneda.
  // MONTO_FIELDS.ingreso nunca limpia el otro campo; si Finanzas cambia la moneda queda
  // un valor viejo que contamina la lectura (doble-conteo / saldo incorrecto).
  if (esUY) {
    props['Monto UY$ cobrado'] = { number: f.monto };
    props['Monto USD']         = { number: null };    // limpiar la otra moneda
  } else {
    props['Monto USD']         = { number: f.monto };
    props['Monto UY$ cobrado'] = { number: null };    // limpiar la otra moneda
  }
  // P6: el TC aplicado fue derivado para el monto anterior (reconciliación C3 previa).
  // Al editar el monto real (C7) el TC viejo ya no aplica → limpiarlo.
  // C3 ("✓ cubre este servicio") lo vuelve a derivar si hace falta.
  props['TC aplicado'] = { number: null };
  // Servicio vinculado: actualizar o desvincular.
  props['Servicio vinculado'] = f.servicioId ? { relation: [{ id: f.servicioId }] } : { relation: [] };
  try {
    await callNotion('pages/' + f.id, 'PATCH', { properties: props });
    await syncAfterWrite(f.id, 'ingresos');
    _ingresosCache = null;
    closeCobroSheet();
    if (M._porCobrarCtx) await renderPorCobrar(M._porCobrarCtx.containerId, M._porCobrarCtx.opts);
  } catch (e) {
    if (M.cobroState) { M.cobroState.saving = false; renderCobroSheet(); }
    alert('No se pudo guardar el cobro: ' + esc(e.message || String(e)));
  }
}
// ────────────────────────────────────────────────────────────────────────────

export function renderReportes() {
  const content = document.getElementById('finanzas-content');
  content.innerHTML =
    '<div style="padding:14px 16px">' +
      '<div class="rep-intro">Generá un PDF con un toque — se descarga directo. (Datos de Uruguay.)</div>' +
      '<button class="rep-btn" onclick="generateFinanceReportPDF(\'semana\', this)"><span class="rep-ic">📄</span><span class="rep-tx"><span class="rep-t">Reporte semanal</span><span class="rep-s">Entradas, salidas y saldo de los últimos 7 días</span></span></button>' +
      '<button class="rep-btn" onclick="generateFinanceReportPDF(\'mes\', this)"><span class="rep-ic">📅</span><span class="rep-tx"><span class="rep-t">Reporte mensual</span><span class="rep-s">Estado de cuenta del mes en curso</span></span></button>' +
      '<button class="rep-btn" onclick="openServicePickerForReport()"><span class="rep-ic">📊</span><span class="rep-tx"><span class="rep-t">Reporte por servicio</span><span class="rep-s">Elegí un servicio completado y bajá su PDF</span></span></button>' +
    '</div>';
}

// Reporte financiero (estado de cuenta del período) en PDF con jsPDF. Uruguay, UY$/USD separados.
export async function generateFinanceReportPDF(tipo, btn) {
  const orig = btn ? btn.style.opacity : null;
  if (btn) { btn.style.opacity = '0.55'; btn.disabled = true; }
  try {
    const JS = await ensureJsPDF();
    if (!JS) { alert(t('pdf.notloaded')); return; }
    const now = new Date();
    const iso = (d) => d.toISOString().slice(0, 10);
    const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    let start, end, periodoLabel;
    if (tipo === 'semana') {
      const d0 = new Date(now); d0.setDate(d0.getDate() - 6);
      start = iso(d0); end = iso(now); periodoLabel = 'Semana ' + start + ' a ' + end;
    } else {
      start = iso(new Date(now.getFullYear(), now.getMonth(), 1));
      end = iso(new Date(now.getFullYear(), now.getMonth() + 1, 0));
      periodoLabel = MESES[now.getMonth()] + ' ' + now.getFullYear();
    }
    const paisF = { or: [{ property: 'País', select: { equals: '🇺🇾 UY' } }, { property: 'País', select: { is_empty: true } }] };
    const mkF = () => ({ and: [paisF, { property: 'Fecha', date: { on_or_after: start } }, { property: 'Fecha', date: { on_or_before: end } }] });
    const [gas, ing] = await Promise.all([
      callNotionAll(`databases/${M.GASTOS_DB_ID}/query`, { filter: mkF() }),
      callNotionAll(`databases/${M.INGRESOS_DB_ID}/query`, { filter: mkF() }),
    ]);
    const ingS = sumByMoneda(ing.results, 'ingreso'), gasS = sumByMoneda(gas.results, 'gasto');
    const sal = { uyu: ingS.uyu - gasS.uyu, usd: ingS.usd - gasS.usd };
    const groupBy = (results, kind, prop, def) => { const o = {}; (results || []).filter(kpiIncluido).forEach(r => { const c = (r.properties?.[prop]?.select?.name) || def; const { esUY, monto } = montoOf(r.properties || {}, kind); o[c] = o[c] || { uyu: 0, usd: 0 }; if (esUY) o[c].uyu += monto; else o[c].usd += monto; }); return o; };
    const gasCat = groupBy(gas.results, 'gasto', 'Categoría', 'Otros');
    const ingTipo = groupBy(ing.results, 'ingreso', 'Tipo', 'Otro');
    const clean = (s) => String(s || '').replace(/[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}️‍]/gu, '').replace(/\s+/g, ' ').trim();
    const fM = (n, esUY) => (esUY ? 'UY$ ' : 'USD ') + Math.abs(n).toLocaleString(esUY ? 'es-UY' : 'en-US', { maximumFractionDigits: esUY ? 0 : 2 });
    const sg = (n) => n < 0 ? '-' : '';
    const splitStr = (s, sign) => { const p = []; if (s.uyu) p.push((sign != null ? sign : sg(s.uyu)) + fM(s.uyu, true)); if (s.usd) p.push((sign != null ? sign : sg(s.usd)) + fM(s.usd, false)); return p.join('   ') || (sign != null ? sign : '') + fM(0, true); };

    const doc = new JS({ unit: 'mm', format: 'a4' });
    const PW = 210, M = 14, BOT = 285; let y = 0;
    const newPageIf = (need) => { if (y + need > BOT) { doc.addPage(); y = 18; } };
    doc.setFillColor(0, 201, 141); doc.rect(0, 0, PW, 38, 'F');
    doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold');
    doc.setFontSize(26); doc.text('FlyClean', M, 18);
    doc.setFontSize(14); doc.text('Reporte financiero', M, 28);
    doc.setFontSize(9); doc.setFont('helvetica', 'normal');
    doc.text(periodoLabel, PW - M, 14, { align: 'right' });
    doc.text('Uruguay', PW - M, 19, { align: 'right' });
    y = 48;
    const section = (title) => { newPageIf(12); doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(0, 165, 120); doc.text(title.toUpperCase(), M, y); doc.setDrawColor(179, 237, 217); doc.setLineWidth(0.3); doc.line(M, y + 1.5, PW - M, y + 1.5); y += 7; };
    const row = (label, value, opts = {}) => { if (value == null || value === '') return; newPageIf(8); doc.setFont('helvetica', 'normal'); doc.setFontSize(opts.big ? 12 : 10.5); const c = opts.color || [70, 107, 94]; doc.setTextColor(c[0], c[1], c[2]); doc.text(String(label), M, y); doc.setFont('helvetica', 'bold'); if (!opts.color) doc.setTextColor(20, 31, 25); doc.text(String(value), PW - M, y, { align: 'right' }); y += opts.big ? 8.5 : 6; doc.setDrawColor(232, 240, 236); doc.setLineWidth(0.2); doc.line(M, y - 2, PW - M, y - 2); };

    section('Estado de cuenta · ' + periodoLabel);
    row('Entradas', splitStr(ingS, '+'), { color: [0, 150, 100] });
    row('Salidas', splitStr(gasS, '-'), { color: [200, 60, 60] });
    row('SALDO', splitStr(sal), { big: true, color: (sal.uyu >= 0 && sal.usd >= 0) ? [0, 150, 100] : [200, 60, 60] });
    const nC = (ing.results || []).length, nG = (gas.results || []).length;
    row('Movimientos', nC + (nC === 1 ? ' cobro' : ' cobros') + '  ·  ' + nG + (nG === 1 ? ' gasto' : ' gastos'));

    section('Gastos por rubro');
    const gc = Object.entries(gasCat).sort((a, b) => (b[1].uyu + b[1].usd) - (a[1].uyu + a[1].usd));
    if (!gc.length) row('—', 'Sin gastos en el período'); else gc.forEach(([k, v]) => row(clean(k), splitStr(v)));

    section('Ingresos por tipo');
    const it = Object.entries(ingTipo).sort((a, b) => (b[1].uyu + b[1].usd) - (a[1].uyu + a[1].usd));
    if (!it.length) row('—', 'Sin ingresos en el período'); else it.forEach(([k, v]) => row(clean(k), splitStr(v)));

    newPageIf(16); y += 6;
    doc.setDrawColor(179, 237, 217); doc.line(M, y, PW - M, y); y += 6;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(140, 150, 146);
    doc.text('FlyClean · Generado el ' + now.toLocaleDateString('es-UY') + ' · UY$ y USD por separado (no se mezclan).', M, y);

    doc.save('FlyClean_Reporte_' + tipo + '_' + end + '.pdf');
  } catch (e) {
    alert('No se pudo generar el reporte: ' + (e?.message || e));
  } finally {
    if (btn) { btn.style.opacity = orig || '1'; btn.disabled = false; }
  }
}

// Picker de servicio completado → genera su PDF de devolución (reusa openReportStep).
export async function openServicePickerForReport() {
  const content = document.getElementById('finanzas-content');
  content.innerHTML = '<div style="text-align:center;padding:40px 0"><div class="spinner" style="margin:0 auto"></div></div>';
  // La DB Servicios (multi-data-source) bajo carga devuelve resultados vacíos o SIN la property
  // Estado por el search-fallback → reintentar hasta obtener servicios COMPLETADOS (sabemos que existen).
  let comp = [];
  for (let i = 0; i < 8 && !comp.length; i++) {
    let res = null;
    try { const d = await callNotion(`databases/${M.DB_ID}/query`, 'POST', { page_size: 100 }); res = d.results || []; }
    catch (e) { res = null; }
    if (res && res.length) comp = res.filter(s => ((s.properties?.['Estado']?.select?.name) || '').includes('Completado') && recEnPaisNotion(s));
    if (!comp.length) await new Promise(r => setTimeout(r, 1100));
  }
  if (M.activeFinanzasTab !== 'reportes') return;
  if (!comp.length) { content.innerHTML = '<div style="padding:14px 16px"><button class="rep-back" onclick="setFinanzasTab(\'reportes\')">‹ Volver</button><div class="coord-empty" style="padding:20px">No se pudieron cargar los servicios ahora. Reintentá en un momento.</div></div>'; return; }
  comp.sort((a, b) => ((b.properties?.['Fecha programada']?.date?.start) || '').localeCompare((a.properties?.['Fecha programada']?.date?.start) || ''));
  window._repServicios = comp;
  const cards = comp.map((s, i) => {
    const nom = s.properties?.['Nombre del servicio']?.title?.[0]?.plain_text || '(servicio)';
    const f = (s.properties?.['Fecha programada']?.date?.start || '').slice(0, 10);
    return '<button class="rep-svc" onclick="pickServiceReport(' + i + ')"><span class="rep-svc-n">' + esc(nom) + '</span><span class="rep-svc-f">' + (f || '') + ' ›</span></button>';
  }).join('') || '<div class="coord-empty">No hay servicios completados.</div>';
  content.innerHTML = '<div style="padding:12px 16px"><button class="rep-back" onclick="setFinanzasTab(\'reportes\')">‹ Volver</button><div class="rep-intro" style="margin:10px 0 8px">Elegí un servicio para bajar su PDF de devolución:</div>' + cards + '</div>';
}
export function pickServiceReport(i) {
  const svc = (window._repServicios || [])[i];
  if (svc) openReportStep(svc);
}

// Override de cargarMasCoord para finanzas

export function cargarMasFinanzas() {
  M._finanzasVisibleLimit += M.COORD_PAGE_SIZE;
  if (M.activeFinanzasTab === 'gastos') renderGastosListInner();
  else if (M.activeFinanzasTab === 'ingresos') renderIngresosListInner();
}
