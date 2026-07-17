// ─────────────────────────────────────────────
// GASTOS — pantalla 💸 Gastos (coord/CEO/Finanzas, filtro país server-side v205) + sheet de carga con foto
// del recibo y OCR IA (solo Uruguay) + chips de gastos del servicio en el sheet del coord. Extraído de
// main.js el 2026-07-17 (patrón puente initGastos).
// ─────────────────────────────────────────────
// gastoState QUEDA en main (handlers inline oninput="gastoState.form.x=…" → gen-globals publica su accesor
// vivo desde main; acá se usa por M.gastoState). La tab Finanzas (fetchGastosForMonth/renderGastosList/
// _gastosCache + ingresos) también queda en main → el módulo la refresca vía alias (renderGastosList,
// resetGastosCache, setFinanzasTab). RECIBO_ALLOWED_MIMES deriva de PHOTO_ALLOWED_MIMES (fotos.js, sin ciclo).

import { t } from './i18n.js';
import { esc } from './util.js';
import { montoOf, fmtMoneda, sumByMoneda, fmtTotalSplit, kpiBadgeHTML } from './calculos.js';
import { callNotion } from './api.js';
import { PHOTO_ALLOWED_MIMES, PHOTO_MAX_BYTES } from './fotos.js';

let M = {};
export function initGastos(bridge) { M = bridge; }

const esVentas = (...a) => M.esVentas(...a);
const fetchCoordItemsForMonth = (...a) => M.fetchCoordItemsForMonth(...a);
const markUserActive = (...a) => M.markUserActive(...a);
const renderGastosList = (...a) => M.renderGastosList(...a);
const resetGastosCache = (...a) => M.resetGastosCache(...a);
const setFinanzasTab = (...a) => M.setFinanzasTab(...a);
const showSaving = (...a) => M.showSaving(...a);
const showScreen = (...a) => M.showScreen(...a);

// (no en ceoViewCountry, que es el selector del CEO). Global (Dirección / CEO Uruguay) = null (ve todos).
// Gastos NO está en el espejo → sin este filtro, la query trae los gastos de TODOS los países (fuga).
export function gastosUserPaisFilter() {
  const isGlobal = M.currentUser?.role?.includes('Dirección') ||
                   (M.currentUser?.role?.includes('CEO') && M.currentUser?.country === 'Uruguay');
  if (isGlobal) return null;
  const c = M.currentUser?.country || M.selectedCountry;
  const val = M.COUNTRY_FINANCE_MAP[c];
  if (!val) return null;
  if (c === 'Uruguay') return { or: [{ property: 'País', select: { equals: val } }, { property: 'País', select: { is_empty: true } }] };
  return { property: 'País', select: { equals: val } };
}


// Recibos aceptan también PDF (factura formal); las fotos de servicio NO.
const RECIBO_ALLOWED_MIMES = [...PHOTO_ALLOWED_MIMES, 'application/pdf'];

const GASTO_MONEDA_MAP = {
  'USD': '🇺🇸 USD',
  'UYU': '🇺🇾 UY$',
  'BRL': '🇺🇸 USD',  // BRL no está en el enum Notion, se mapea a USD con TC = 0
  'PAB': '🇺🇸 USD',
  'GTQ': '🇺🇸 USD',
  'MXN': '🇺🇸 USD',
  'PYG': '🇺🇸 USD',
  'ARS': '🇺🇸 USD',
  'OTRO': '🇺🇸 USD',
};

const GASTO_FORMA_PAGO = ['💳 Débito', '🏦 Transferencia', '💵 Efectivo'];
const GASTO_CATEGORIAS = [
  '⛽ Combustible', '👥 Sueldos', '🧴 Productos', '🔧 Herramientas',
  '🛡️ Seguros', '📣 Marketing', '🔩 Repuestos', '🏛️ Impuestos',
  '🍔 Comida', '✈️ Viajes', '🚗 Patente', '🏢 Alquiler',
  '🛡️ Insumos limpieza', '📝 Servicios profesionales', '🏠 Otros',
];

// UUID v4 client-side para path R2 del recibo + idempotency.
function uuidV4() {
  if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
  // Fallback simple para browsers viejos.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Renderiza el thumbnail del recibo: <img> para imagen, icono 📄 para PDF.
// Querystring (`?X-Amz-...`) en R2 presigned URLs no afecta el match — usamos
// el path. Si no hay URL retorna string vacío.
export function renderReciboThumb(url) {
  if (!url) return '';
  const safeUrl = esc(url);
  const isPdf = /\.pdf(\?|$)/i.test(url);
  if (isPdf) {
    return `<div class="gasto-recibo-pdf-thumb" title="PDF" onclick="event.stopPropagation();window.open('${safeUrl}','_blank')">📄</div>`;
  }
  // src por el proxy same-origin /api/img (el <img> directo al CDN falla → miniatura rota).
  return `<img src="/api/img?u=${encodeURIComponent(url)}" loading="lazy" class="gasto-recibo-thumb" onclick="event.stopPropagation();window.open('${safeUrl}','_blank')"/>`;
}

// Sube una foto del recibo a R2. Retorna { publicUrl }.
async function uploadReceiptPhoto(file, gastoId) {
  // Recibo acepta imagen O PDF (validado también server-side en /api/upload-url).
  if (file.size > PHOTO_MAX_BYTES) throw new Error(t('photo.error.maxsize') || 'Archivo >10MB');
  const mime = (file.type || '').toLowerCase();
  if (!RECIBO_ALLOWED_MIMES.includes(mime)) throw new Error(t('gasto.recibo.error.mime') || t('photo.error.mime') || 'Tipo no permitido');
  const resp = await fetch('/api/upload-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + (localStorage.getItem('fc_token') || '') },
    body: JSON.stringify({ gastoId, fotoType: 'recibo', filename: file.name, contentType: mime, contentLength: file.size }),
  });
  if (!resp.ok) {
    const data = await resp.json().catch(() => ({}));
    throw new Error(data.error || ('Backend ' + resp.status));
  }
  const { uploadUrl, publicUrl } = await resp.json();
  const put = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': mime }, body: file });
  if (!put.ok) throw new Error('Upload ' + put.status);
  return { publicUrl };
}

// Llama el endpoint OCR. Retorna el JSON estructurado.
async function extractReceiptViaAI(imageUrl) {
  const _tk = (() => { try { return localStorage.getItem('fc_token') || ''; } catch (_) { return ''; } })();
  const resp = await fetch('/api/extract-receipt', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(_tk ? { 'Authorization': 'Bearer ' + _tk } : {}) },
    body: JSON.stringify({ imageUrl }),
  });
  if (!resp.ok) {
    const data = await resp.json().catch(() => ({}));
    throw new Error(data.error || 'OCR failed');
  }
  return resp.json();
}

// ─────────────────────────────────────────────
// SCREEN-GASTOS — panel dedicado por rol
// ─────────────────────────────────────────────
// Operario: solo sus gastos (Cargado por === M.currentUser.name).
// Coord: 2 secciones (Equipo / Míos).
// CEO/Dirección: 3 tabs (Todos / Equipo / Míos).
// Finanzas: el botón 💸 NO está en su panel (ya tiene tab Gastos directamente).
//
// Tiempo relativo y rango de días son helpers compartidos con futuras pantallas
// que necesiten visualizar timestamps en formato humano.

let _gastosScreenRangeDays = 7;
let _gastosScreenPrevScreen = 'coordinator';
let _gastosScreenTab = 'todos';
let _gastosScreenCache = null;

export function openGastos() {
  if (esVentas()) return; // blindaje: Ventas no ve Gastos, ni por un llamado directo
  if (document.getElementById('screen-coordinator')?.classList.contains('active')) _gastosScreenPrevScreen = 'coordinator';
  else if (document.getElementById('screen-services')?.classList.contains('active')) _gastosScreenPrevScreen = 'services';
  else if (document.getElementById('screen-ceo')?.classList.contains('active')) _gastosScreenPrevScreen = 'ceo';
  else _gastosScreenPrevScreen = 'coordinator';
  // Finanzas tiene su propio panel — el botón 💸 no debería estar visible para
  // ese rol, pero por defensa: si llega acá, redirigir al panel Finanzas.
  if (M.currentUser?.role?.includes('Administración')) {
    showScreen('finanzas');
    setFinanzasTab('gastos');
    return;
  }
  _gastosScreenCache = null;
  _gastosScreenTab = 'todos';
  showScreen('gastos');
  setGastosRange(_gastosScreenRangeDays);
}

export function closeGastos() {
  showScreen(_gastosScreenPrevScreen);
}

export function setGastosRange(days) {
  _gastosScreenRangeDays = days;
  markUserActive();
  [7, 30, 90].forEach(d => {
    const el = document.getElementById('grange-' + d);
    if (el) el.classList.toggle('active', d === days);
  });
  _gastosScreenCache = null;
  renderGastosScreen();
}

export function setGastosScreenTab(tab) {
  _gastosScreenTab = tab;
  markUserActive();
  ['todos', 'equipo', 'mios'].forEach(t => {
    const el = document.getElementById('gstab-' + t);
    if (el) el.classList.toggle('active', t === tab);
  });
  renderGastosScreen(true);
}

function gastosDaysAgo(days) {
  const d = new Date(Date.now() - days * 24 * 3600 * 1000);
  return d.toISOString().slice(0, 10);
}

function gastosRelativeTime(iso) {
  if (!iso) return '';
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diff = now - then;
  if (diff < 60000) return 'hace unos seg';
  if (diff < 3600000) return `hace ${Math.floor(diff/60000)} min`;
  if (diff < 86400000) return `hace ${Math.floor(diff/3600000)} h`;
  const days = Math.floor(diff/86400000);
  if (days === 1) return 'ayer';
  if (days < 7) return `hace ${days} días`;
  if (days < 30) return `hace ${Math.floor(days/7)} sem`;
  return new Date(iso).toLocaleDateString('es-UY', { day: 'numeric', month: 'short' });
}

export async function renderGastosScreen(skipFetch) {
  const content = document.getElementById('gastos-screen-content');
  const tabsBar = document.getElementById('gastos-tabs-bar');
  if (!content) return;

  const role = M.currentUser?.role || '';
  const isOperario = role.includes('Operario');
  const isCoord = role.includes('Coordinador');
  const isCEO = role.includes('CEO') || role.includes('Dirección');

  // Blindaje: Ventas no matchea isOperario/isCoord/isCEO y caería en el fallback de
  // "lista plana sin agrupación" (TODOS los gastos, sin filtrar) — cortamos acá antes
  // de cualquier fetch/render y lo mandamos de vuelta al panel coordinador.
  if (esVentas()) { content.innerHTML = ''; showScreen('coordinator'); return; }

  // Tabs solo para CEO/Dirección. Coord muestra 2 secciones inline.
  if (isCEO) {
    tabsBar.innerHTML = `
      <div class="historial-filters" style="border-top:1px solid var(--border);background:var(--bg)">
        <button class="historial-range-btn ${_gastosScreenTab==='todos'?'active':''}" id="gstab-todos" onclick="setGastosScreenTab('todos')">${t('gastos.tab.todos')}</button>
        <button class="historial-range-btn ${_gastosScreenTab==='equipo'?'active':''}" id="gstab-equipo" onclick="setGastosScreenTab('equipo')">${t('gastos.tab.equipo')}</button>
        <button class="historial-range-btn ${_gastosScreenTab==='mios'?'active':''}" id="gstab-mios" onclick="setGastosScreenTab('mios')">${t('gastos.tab.mios')}</button>
      </div>
    `;
  } else {
    tabsBar.innerHTML = '';
  }

  if (!skipFetch || !_gastosScreenCache) {
    content.innerHTML = '<div style="text-align:center;padding:40px 0"><div class="spinner" style="margin:0 auto"></div></div>';
    try {
      const dateFrom = gastosDaysAgo(_gastosScreenRangeDays);
      // Filtro SERVER-SIDE (antes solo se escondía en cliente → el payload traía TODOS los gastos de la
      // empresa, sueldos incluidos): el operario solo los SUYOS; coord/CEO no-global, solo los de SU país.
      const conds = [{ property: 'Fecha', date: { on_or_after: dateFrom } }];
      if (isOperario) conds.push({ property: 'Cargado por', select: { equals: M.currentUser?.name || '' } });
      else { const pf = gastosUserPaisFilter(); if (pf) conds.push(pf); }
      const data = await callNotion(`databases/${M.GASTOS_DB_ID}/query`, 'POST', {
        filter: conds.length === 1 ? conds[0] : { and: conds },
        sorts: [{ property: 'Fecha', direction: 'descending' }],
        page_size: 100,
      });
      _gastosScreenCache = data.results || [];
    } catch (e) {
      content.innerHTML = `<div class="coord-empty">${t('gastos.error')}<br><small>${esc(e.message)}</small></div>`;
      return;
    }
  }

  const items = _gastosScreenCache || [];
  const myName = M.currentUser?.name || '';

  // Operario: filtra solo SUS gastos.
  if (isOperario) {
    const mine = items.filter(g => g.properties?.['Cargado por']?.select?.name === myName);
    content.innerHTML = renderGastosListSimple(mine, t('gastos.operario.empty'));
    return;
  }

  // Coord: 2 secciones inline.
  if (isCoord) {
    const equipo = items.filter(g => {
      const autor = g.properties?.['Cargado por']?.select?.name || '';
      return autor && autor !== myName && !autor.includes('CEO') && !autor.includes('Coordinador') && autor !== 'Finanzas';
    });
    const mios = items.filter(g => g.properties?.['Cargado por']?.select?.name === myName);
    let html = '';
    html += `<div class="gastos-section-title">👥 ${t('gastos.coord.equipo')} (${equipo.length})</div>`;
    html += equipo.length ? equipo.map(renderGastoCard).join('') : `<div class="coord-empty" style="padding:20px 16px;font-size:13px">${t('gastos.coord.equipo.empty')}</div>`;
    html += `<div class="gastos-section-title">🙋 ${t('gastos.coord.mios')} (${mios.length})</div>`;
    html += mios.length ? mios.map(renderGastoCard).join('') : `<div class="coord-empty" style="padding:20px 16px;font-size:13px">${t('gastos.coord.mios.empty')}</div>`;
    content.innerHTML = html;
    return;
  }

  // CEO: filter por tab seleccionada.
  if (isCEO) {
    let filtered;
    if (_gastosScreenTab === 'equipo') {
      filtered = items.filter(g => {
        const autor = g.properties?.['Cargado por']?.select?.name || '';
        return autor && autor !== myName && !autor.includes('CEO') && !autor.includes('Dirección') && autor !== 'Finanzas';
      });
    } else if (_gastosScreenTab === 'mios') {
      filtered = items.filter(g => g.properties?.['Cargado por']?.select?.name === myName);
    } else {
      filtered = items;
    }
    content.innerHTML = renderGastosListSimple(filtered, t('gastos.ceo.empty'));
    return;
  }

  // Fallback: lista plana sin agrupación.
  content.innerHTML = renderGastosListSimple(items, t('gastos.empty'));
}

function renderGastosListSimple(items, emptyMsg) {
  if (!items.length) return `<div class="coord-empty" style="padding:20px 16px">${emptyMsg}</div>`;
  // Total al tope.
  const totalSplit = sumByMoneda(items, 'gasto');
  const header = `<div class="finanzas-summary">${t('gastos.total')} ${fmtTotalSplit(totalSplit)} <span style="color:var(--text3);font-size:12px">(${items.length})</span></div>`;
  return header + items.map(renderGastoCard).join('');
}

function renderGastoCard(g) {
  const props = g.properties || {};
  const concepto = props['Concepto']?.title?.[0]?.plain_text || '(sin concepto)';
  const categoria = props['Categoría']?.select?.name || '';
  const clase = props['Clase']?.select?.name || '';
  const { moneda, monto } = montoOf(props, 'gasto');
  const fecha = props['Fecha']?.date?.start || '';
  const proveedor = props['Tienda / Proveedor']?.rich_text?.[0]?.plain_text || '';
  const cargadoPor = props['Cargado por']?.select?.name || t('gasto.sinasignar');
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
        <span class="gasto-tag" style="background:rgba(150,150,150,0.1)">👤 ${esc(cargadoPor)}</span>
      </div>
      <div class="gasto-card-bottom">
        ${proveedor ? `<span style="font-size:11px;color:var(--text3)">${esc(proveedor)}</span>` : ''}
        <span style="font-size:11px;color:var(--text3)">${esc(gastosRelativeTime(fecha))}</span>
      </div>
    </div>
    <div class="gasto-card-monto">
      <div class="gasto-monto-val">${fmtMoneda(monto, moneda)}</div>
      ${renderReciboThumb(fotoUrl)}
    </div>
  </div>`;
}

// ─────────────────────────────────────────────
// HISTORIAL VIEJO — ELIMINADO en el rework de Gastos.
// Funciones openHistorial / closeHistorial / setHistorialRange /
// renderHistorialList / openHistorialItem reemplazadas por screen-gastos.
// El operario ve historial de servicios filtrando por Estado=Completado en
// sus tabs principales (ya existe).
// ─────────────────────────────────────────────


// Trae los gastos vinculados a un servicio específico (filter por relation).
export async function fetchGastosDelServicio(serviceId) {
  if (!serviceId) return [];
  try {
    const data = await callNotion(`databases/${M.GASTOS_DB_ID}/query`, 'POST', {
      filter: { property: 'Servicio', relation: { contains: serviceId } },
      sorts: [{ property: 'Fecha', direction: 'descending' }],
      page_size: 50,
    });
    return data.results || [];
  } catch (e) {
    console.warn('[gastos] fetchGastosDelServicio error:', e.message);
    return [];
  }
}

// Render de chips de gastos vinculados en el sheet edit del coord.
export function renderGastosChipsCoord(gastos) {
  const container = document.getElementById('edit-gastos-chips');
  if (!container) return;
  if (!gastos.length) {
    container.innerHTML = `<div class="equipos-empty">${t('gasto.coord.empty')}</div>`;
    return;
  }
  const totalSplit = sumByMoneda(gastos, 'gasto');
  container.innerHTML = `<div style="font-size:11px;color:var(--text2);margin-bottom:6px">${t('gasto.coord.total')} ${fmtTotalSplit(totalSplit)}</div>` +
    gastos.map(g => {
      const props = g.properties || {};
      const concepto = props['Concepto']?.title?.[0]?.plain_text || '(sin concepto)';
      const { moneda, monto } = montoOf(props, 'gasto');
      const categoria = props['Categoría']?.select?.name || '';
      const fecha = props['Fecha']?.date?.start || '';
      return `<div class="gasto-chip-coord">
        <div class="gasto-chip-coord-info">
          <div class="gasto-chip-coord-name">${esc(concepto)}</div>
          <div class="gasto-chip-coord-meta">${esc(categoria)} · ${esc(fecha)}</div>
        </div>
        <div class="gasto-chip-coord-monto">${fmtMoneda(monto, moneda)}</div>
      </div>`;
    }).join('');
}

export function openNuevoGastoSheet(opts = {}) {
  M.gastoState = {
    step: 'select-photo',
    gastoId: uuidV4(),
    reciboUrl: null,
    reciboPreview: null,
    ocr: null,
    form: {
      concepto: '',
      monto: 0,
      moneda: '🇺🇾 UY$',
      fecha: new Date().toISOString().slice(0, 10),
      proveedor: '',
      categoria: '🏠 Otros',
      clase: opts.defaultClase || '🔁 Indirecto',
      servicioId: opts.servicioId || null,
      detalle: '',
      formaPago: '💳 Débito',
      factura: false,
    },
    saving: false,
  };
  document.getElementById('gasto-overlay').classList.add('open');
  renderGastoSheet();
  // Pre-cargar servicios del último mes para el dropdown de vinculación.
  // Si M._coordAllServices ya está poblado (porque el user vino del panel coord),
  // se reutiliza. Si no, fetch en background.
  if (!M._coordAllServices || M._coordAllServices.length === 0) {
    if (typeof fetchCoordItemsForMonth === 'function') {
      fetchCoordItemsForMonth().then(items => {
        M._coordAllServices = items || [];
        if (M.gastoState && M.gastoState.step === 'edit-form' && M.gastoState.form.clase === '📌 Directo') {
          renderGastoSheet();
        }
      }).catch(() => {});
    }
  }
}

export function closeGastoSheet() {
  document.getElementById('gasto-overlay').classList.remove('open');
  if (M.gastoState?.reciboPreview) {
    try { URL.revokeObjectURL(M.gastoState.reciboPreview); } catch (_) {}
  }
  M.gastoState = null;
}

export function gastoOverlayClick(e) {
  if (e.target.id === 'gasto-overlay') closeGastoSheet();
}

export function renderGastoSheet() {
  if (!M.gastoState) return;
  const body = document.getElementById('gasto-sheet-body');
  if (!body) return;

  if (M.gastoState.step === 'select-photo') {
    body.innerHTML = `
      <div class="gasto-step-photo">
        <div class="gasto-step-photo-emoji">📷</div>
        <div class="gasto-step-photo-title">${t('gasto.foto.title')}</div>
        <div class="gasto-step-photo-sub">${t('gasto.foto.sub')}</div>
        <button class="gasto-photo-btn" onclick="document.getElementById('gasto-recibo-input-camera').click()">${t('gasto.foto.btn')}</button>
        <button class="gasto-photo-btn-file" onclick="document.getElementById('gasto-recibo-input-file').click()">${t('gasto.foto.btn.file')}</button>
        <div><button class="gasto-photo-btn-secondary" onclick="gastoSkipFoto()">${t('gasto.foto.skip')}</button></div>
      </div>
    `;
    return;
  }

  if (M.gastoState.step === 'analyzing') {
    body.innerHTML = `
      <div class="gasto-step-analyzing">
        <div class="spinner"></div>
        <div style="font-weight:700;margin-bottom:6px">${t('gasto.analyzing.title')}</div>
        <div style="font-size:12px;color:var(--text2)">${t('gasto.analyzing.sub')}</div>
      </div>
    `;
    return;
  }

  // Step 'edit-form'
  const f = M.gastoState.form;
  const ocr = M.gastoState.ocr;
  const warnBanner = ocr && ocr.confianza !== 'alta'
    ? `<div class="gasto-confianza-warn">
        <div style="font-size:18px">⚠️</div>
        <div><strong>${t('gasto.warn.title')}</strong><br>
        ${esc(t('gasto.warn.motivo.' + (ocr.motivo_baja_confianza || 'ilegible')) || '')}
        — ${t('gasto.warn.check')}</div>
      </div>`
    : '';

  const warnClass = ocr && ocr.confianza !== 'alta' ? 'warn' : '';

  // PDF → icono clickeable (abre el PDF en R2 ya subido). Imagen → thumbnail.
  let thumb = '';
  if (M.gastoState.isPdf && M.gastoState.reciboUrl) {
    thumb = `<div class="gasto-thumb-wrap"><div class="gasto-pdf-preview" onclick="window.open('${esc(M.gastoState.reciboUrl)}','_blank')"><span class="gasto-pdf-preview-emoji">📄</span><span>PDF</span></div></div>`;
  } else if (M.gastoState.reciboPreview) {
    thumb = `<div class="gasto-thumb-wrap"><img src="${esc(M.gastoState.reciboPreview)}" onclick="window.open('${esc(M.gastoState.reciboPreview)}','_blank')"/></div>`;
  }

  const reanalyzeBtn = M.gastoState.reciboUrl
    ? `<button class="gasto-reanalyze-btn" onclick="reanalyzeReceipt()">🔄 ${t('gasto.reanalyze')}</button>`
    : '';

  // Mostrar los servicios MÁS RECIENTES arriba (los últimos primero) para que sea
  // fácil encontrar el servicio a asociar. Ordenamos una COPIA (no mutar
  // M._coordAllServices, que el calendario del coord usa en orden ascendente).
  const _svcFecha = (s) => s.properties?.['Fecha programada']?.date?.start || s.created_time || '';
  const servicios = (M._coordAllServices && M._coordAllServices.length > 0)
    ? [...M._coordAllServices].sort((a, b) => _svcFecha(b).localeCompare(_svcFecha(a))).slice(0, 30)
    : [];

  body.innerHTML = `
    ${warnBanner}
    ${thumb}
    <div class="gasto-form-row ${warnClass}">
      <label>${t('gasto.field.concepto')}</label>
      <input type="text" id="g-concepto" value="${esc(f.concepto)}" oninput="gastoState.form.concepto=this.value" maxlength="120"/>
    </div>
    <div class="gasto-form-row ${warnClass}" style="display:flex;gap:8px">
      <div style="flex:1">
        <label>${t('gasto.field.monto')}</label>
        <input type="number" id="g-monto" value="${f.monto}" step="0.01" min="0" oninput="gastoState.form.monto=parseFloat(this.value)||0"/>
      </div>
      <div style="width:120px">
        <label>${t('gasto.field.moneda')}</label>
        <select id="g-moneda" onchange="gastoState.form.moneda=this.value">
          <option value="🇺🇸 USD" ${f.moneda==='🇺🇸 USD'?'selected':''}>USD</option>
          <option value="🇺🇾 UY$" ${f.moneda==='🇺🇾 UY$'?'selected':''}>UY$</option>
        </select>
      </div>
    </div>
    <div class="gasto-form-row ${warnClass}">
      <label>${t('gasto.field.fecha')}</label>
      <input type="date" id="g-fecha" value="${esc(f.fecha)}" oninput="gastoState.form.fecha=this.value"/>
    </div>
    <div class="gasto-form-row">
      <label>${t('gasto.field.proveedor')}</label>
      <input type="text" id="g-proveedor" value="${esc(f.proveedor)}" oninput="gastoState.form.proveedor=this.value" maxlength="80"/>
    </div>
    <div class="gasto-form-row">
      <label>${t('gasto.field.categoria')}</label>
      <select id="g-categoria" onchange="gastoState.form.categoria=this.value">
        ${GASTO_CATEGORIAS.map(c => `<option value="${esc(c)}" ${f.categoria===c?'selected':''}>${esc(c)}</option>`).join('')}
      </select>
    </div>
    <div class="gasto-form-row">
      <label>${t('gasto.field.clase')}</label>
      <div class="gasto-clase-toggle">
        <button type="button" class="gasto-clase-btn ${f.clase==='📌 Directo'?'active':''}" onclick="gastoState.form.clase='📌 Directo';renderGastoSheet()">📌 ${t('gasto.clase.directo')}</button>
        <button type="button" class="gasto-clase-btn ${f.clase==='🔁 Indirecto'?'active':''}" onclick="gastoState.form.clase='🔁 Indirecto';gastoState.form.servicioId=null;renderGastoSheet()">🔁 ${t('gasto.clase.indirecto')}</button>
      </div>
    </div>
    ${f.clase === '📌 Directo' ? `
      <div class="gasto-form-row">
        <label>${t('gasto.field.servicio')}</label>
        <select id="g-servicio" onchange="gastoState.form.servicioId=this.value||null">
          <option value="">${t('gasto.servicio.none')}</option>
          ${servicios.map(s => {
            const name = s.properties?.['Nombre del servicio']?.title?.[0]?.plain_text || '(sin nombre)';
            return `<option value="${esc(s.id)}" ${f.servicioId===s.id?'selected':''}>${esc(name)}</option>`;
          }).join('')}
        </select>
        ${servicios.length === 0 ? `<div style="font-size:11px;color:var(--text3);margin-top:6px">${t('gasto.servicio.empty')}</div>` : ''}
      </div>
    ` : ''}
    <div class="gasto-form-row">
      <label>${t('gasto.field.formapago')}</label>
      <select id="g-formapago" onchange="gastoState.form.formaPago=this.value">
        ${GASTO_FORMA_PAGO.map(fp => `<option value="${esc(fp)}" ${f.formaPago===fp?'selected':''}>${esc(fp)}</option>`).join('')}
      </select>
    </div>
    <div class="gasto-form-row">
      <label>${t('gasto.field.detalle')}</label>
      <textarea id="g-detalle" oninput="gastoState.form.detalle=this.value" maxlength="500">${esc(f.detalle)}</textarea>
    </div>
    <div class="gasto-checkbox-row">
      <input type="checkbox" id="g-factura" ${f.factura?'checked':''} onchange="gastoState.form.factura=this.checked"/>
      <label for="g-factura">${t('gasto.field.factura')}</label>
    </div>
    <div class="gasto-actions">
      ${reanalyzeBtn}
      <button class="edit-save-btn" id="gasto-save-btn" onclick="saveGasto()" ${M.gastoState.saving?'disabled':''}>${M.gastoState.saving ? t('gasto.saving') : ('💾 ' + t('gasto.save'))}</button>
    </div>
  `;
}

export async function onGastoReciboSelected(input) {
  const file = input.files && input.files[0];
  input.value = ''; // reset para permitir re-elegir el mismo archivo
  if (!file || !M.gastoState) return;
  if (file.size > PHOTO_MAX_BYTES) { alert(t('photo.error.maxsize') || 'Archivo >10MB'); return; }
  const mime = (file.type || '').toLowerCase();
  if (!RECIBO_ALLOWED_MIMES.includes(mime)) { alert(t('gasto.recibo.error.mime') || t('photo.error.mime') || 'Tipo no permitido'); return; }
  M.gastoState.isPdf = mime === 'application/pdf';
  // Preview: para PDF no se renderiza inline (se muestra icono); para imagen sí.
  M.gastoState.reciboPreview = M.gastoState.isPdf ? null : URL.createObjectURL(file);
  M.gastoState.reciboFilename = file.name || (M.gastoState.isPdf ? 'recibo.pdf' : 'recibo.jpg');
  M.gastoState.step = 'analyzing';
  renderGastoSheet();
  try {
    const { publicUrl } = await uploadReceiptPhoto(file, M.gastoState.gastoId);
    M.gastoState.reciboUrl = publicUrl;
    // IA/OCR: por ahora SOLO Uruguay. Fuera de UY → carga manual (la foto igual quedó subida como respaldo).
    if (M.currentUser?.country !== 'Uruguay') {
      M.gastoState.ocr = { confianza: 'manual' };
      M.gastoState.step = 'edit-form';
      renderGastoSheet();
      return;
    }
    const ocr = await extractReceiptViaAI(publicUrl);
    M.gastoState.ocr = ocr;
    // Mapear OCR al form.
    M.gastoState.form.concepto = ocr.descripcion || M.gastoState.form.concepto;
    M.gastoState.form.monto = ocr.monto || 0;
    M.gastoState.form.moneda = GASTO_MONEDA_MAP[ocr.moneda] || '🇺🇸 USD';
    M.gastoState.form.fecha = ocr.fecha || M.gastoState.form.fecha;
    M.gastoState.form.proveedor = ocr.proveedor || '';
    M.gastoState.form.categoria = ocr.categoria_sugerida || '🏠 Otros';
    M.gastoState.step = 'edit-form';
    renderGastoSheet();
  } catch (e) {
    console.warn('[gasto] OCR error:', e.message);
    // Fallback: ir al form con datos en blanco. El usuario carga manual.
    M.gastoState.ocr = { confianza: 'baja', motivo_baja_confianza: 'ilegible' };
    M.gastoState.step = 'edit-form';
    renderGastoSheet();
    alert(t('gasto.ocr.error'));
  }
}

export function gastoSkipFoto() {
  // Salto de foto → form vacío, sin OCR ni recibo subido.
  if (!M.gastoState) return;
  M.gastoState.step = 'edit-form';
  renderGastoSheet();
}

export async function reanalyzeReceipt() {
  if (!M.gastoState || !M.gastoState.reciboUrl) return;
  M.gastoState.step = 'analyzing';
  renderGastoSheet();
  try {
    const ocr = await extractReceiptViaAI(M.gastoState.reciboUrl);
    M.gastoState.ocr = ocr;
    M.gastoState.form.concepto = ocr.descripcion || M.gastoState.form.concepto;
    M.gastoState.form.monto = ocr.monto || M.gastoState.form.monto;
    M.gastoState.form.moneda = GASTO_MONEDA_MAP[ocr.moneda] || M.gastoState.form.moneda;
    M.gastoState.form.fecha = ocr.fecha || M.gastoState.form.fecha;
    M.gastoState.form.proveedor = ocr.proveedor || M.gastoState.form.proveedor;
    M.gastoState.form.categoria = ocr.categoria_sugerida || M.gastoState.form.categoria;
    M.gastoState.step = 'edit-form';
    renderGastoSheet();
  } catch (e) {
    M.gastoState.step = 'edit-form';
    renderGastoSheet();
    alert(t('gasto.ocr.error'));
  }
}

export async function saveGasto() {
  if (!M.gastoState || M.gastoState.saving) return;
  const f = M.gastoState.form;
  if (!f.concepto.trim()) { alert(t('gasto.error.concepto')); return; }
  if (!f.monto || f.monto <= 0) { alert(t('gasto.error.monto')); return; }
  if (!f.fecha) { alert(t('gasto.error.fecha')); return; }

  M.gastoState.saving = true;
  renderGastoSheet();

  // Calcular Mes desde fecha (no desde new Date()).
  const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const [yy, mm] = f.fecha.split('-').map(Number);
  const mesLabel = `${meses[mm-1]} ${yy}`;

  const countryMap = {
    'Uruguay': '🇺🇾 UY',
    'Brasil': '🇧🇷 BR',
    'Panamá': '🇵🇦 PA',
    'Guatemala': '🇬🇹 GT',
    'México': '🇲🇽 MX',
  };

  const properties = {
    'Concepto': { title: [{ text: { content: f.concepto.trim() } }] },
    'Fecha': { date: { start: f.fecha } },
    'Mes': { select: { name: mesLabel } },
    'Categoría': { select: { name: f.categoria } },
    'Clase': { select: { name: f.clase } },
    'Moneda': { select: { name: f.moneda } },
    'Forma de pago': { select: { name: f.formaPago } },
    'Factura': { checkbox: !!f.factura },
    'País': { select: { name: countryMap[M.currentUser.country] || '🇺🇾 UY' } },
    'Cargado por': { select: { name: M.currentUser.name } },
  };
  // Guardar el monto en el campo de su moneda (no mezclar pesos en "Monto USD").
  if (f.moneda === '🇺🇾 UY$') properties['Monto UY$'] = { number: f.monto };
  else properties['Monto USD'] = { number: f.monto };
  if (f.proveedor) properties['Tienda / Proveedor'] = { rich_text: [{ text: { content: f.proveedor } }] };
  if (f.detalle) properties['Detalle'] = { rich_text: [{ text: { content: f.detalle } }] };
  if (f.servicioId && f.clase === '📌 Directo') {
    properties['Servicio'] = { relation: [{ id: f.servicioId }] };
  }
  if (M.gastoState.reciboUrl) {
    const reciboName = M.gastoState.reciboFilename || (M.gastoState.isPdf ? 'recibo.pdf' : 'recibo.jpg');
    properties['Foto del recibo'] = {
      files: [{ type: 'external', name: reciboName, external: { url: M.gastoState.reciboUrl } }],
    };
  }

  try {
    await callNotion('pages', 'POST', {
      parent: { type: 'data_source_id', data_source_id: M.GASTOS_DS_ID },
      properties,
    });
    // Invalidar cache para que la próxima vez Gastos se refresque.
    resetGastosCache();
    _gastosScreenCache = null;
    // Capturar referencias antes de closeGastoSheet() las limpie.
    const servicioVinculado = f.servicioId;
    closeGastoSheet();
    // Refresh contextual según dónde estamos:
    // - Panel Finanzas tab Gastos → renderGastosList.
    // - Coord sheet edit abierto sobre el mismo servicio → refresh chips.
    // - Operario en panel detail → flash discreto, sin refresh estructural.
    if (typeof renderGastosList === 'function' && M.activeFinanzasTab === 'gastos') {
      renderGastosList();
    }
    if (servicioVinculado && M.editingService?.id === servicioVinculado) {
      const chips = document.getElementById('edit-gastos-chips');
      if (chips) {
        chips.innerHTML = `<div class="equipos-empty">${t('equipos.loading')}</div>`;
        fetchGastosDelServicio(servicioVinculado).then(gastos => {
          if (M.editingService?.id === servicioVinculado) renderGastosChipsCoord(gastos);
        }).catch(() => {});
      }
    }
    showSaving();
  } catch (e) {
    M.gastoState.saving = false;
    renderGastoSheet();
    alert((t('gasto.error.save') || 'Error al guardar:') + ' ' + e.message);
  }
}
