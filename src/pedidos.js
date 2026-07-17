// ─────────────────────────────────────────────
// PEDIDOS / COMPRAS (DB Solicitudes) — operario/coord piden insumos; el coord ve la tab 📦 Pedidos y marca
// Comprado/Recibido/Cancelado. Extraído de main.js el 2026-07-17 (patrón puente).
// ─────────────────────────────────────────────
// pedidoState queda en main (lo tocan handlers inline oninput="pedidoState.x=…" → gen-globals publica su
// accesor vivo desde main; se accede acá por M.pedidoState). currentUser/activeCoordTab + los IDs de la DB
// también viven en main → M. El estado propio del módulo (_coordAllPedidos, filtro, consts) vive acá.
// pedidoFmtFecha se movió a i18n.js (la comparten Equipos/Historial/Documentos).

import { t, pedidoFmtFecha } from './i18n.js';
import { esc } from './util.js';
import { callNotion } from './api.js';

let M = {};
export function initPedidos(bridge) { M = bridge; }

const esVentas = (...a) => M.esVentas(...a);
const showSaving = (...a) => M.showSaving(...a);

// Estado propio del módulo.
let _coordAllPedidos = [];
let _coordPedidosFilter = 'pendientes'; // 'pendientes' | 'todos'

const PEDIDO_PRIORIDADES = ['🔴 Urgente', '🟡 Normal', '🟢 Sugerente'];
const PEDIDO_PAIS_MAP = {
  'Uruguay': '🇺🇾 UY',
  'Brasil': '🇧🇷 BR',
  'Panamá': '🇵🇦 PA',
  'Guatemala': '🇬🇹 GT',
  'México': '🇲🇽 MX',
};

export function pedidoPaisDelUser() {
  return PEDIDO_PAIS_MAP[M.currentUser?.country] || '🇺🇾 UY';
}

export function pedidoPrioClass(prio) {
  if (!prio) return '';
  if (prio.includes('Urgente')) return 'prio-urgente';
  if (prio.includes('Sugerente')) return 'prio-sugerente';
  return 'prio-normal';
}

export function pedidoEstadoClass(estado) {
  if (!estado) return 'estado-pendiente';
  if (estado.includes('Recibido')) return 'estado-comprado';
  if (estado.includes('Comprado')) return 'estado-comprado';
  if (estado.includes('Cancelado')) return 'estado-cancelado';
  return 'estado-pendiente';
}

export function openNuevoPedidoSheet() {
  if (esVentas()) return; // blindaje: Ventas no ve Pedidos, ni por un llamado directo
  M.pedidoState = { producto: '', prioridad: '🟡 Normal', cantidad: '', proveedor: '', costo: '', nota: '', saving: false, mine: null, loadingMine: true };
  document.getElementById('pedido-overlay').classList.add('open');
  renderPedidoSheet();
  loadMisPedidos();
}

export function closePedidoSheet() {
  document.getElementById('pedido-overlay').classList.remove('open');
  M.pedidoState = null;
}

export function pedidoOverlayClick(e) {
  if (e.target.id === 'pedido-overlay') closePedidoSheet();
}

export async function loadMisPedidos() {
  try {
    const data = await callNotion(`databases/${M.SOLICITUDES_DB_ID}/query`, 'POST', { page_size: 100 });
    if (!M.pedidoState) return;
    const mine = (data.results || []).filter(r =>
      (r.properties?.['Solicitado por']?.rich_text?.[0]?.plain_text || '') === M.currentUser.name
    );
    // Más recientes primero por Fecha del pedido.
    mine.sort((a, b) =>
      (b.properties?.['Fecha del pedido']?.date?.start || '').localeCompare(a.properties?.['Fecha del pedido']?.date?.start || '')
    );
    M.pedidoState.mine = mine.slice(0, 5);
    M.pedidoState.loadingMine = false;
    renderPedidoSheet();
  } catch (_) {
    if (!M.pedidoState) return;
    M.pedidoState.mine = [];
    M.pedidoState.loadingMine = false;
    renderPedidoSheet();
  }
}

export function renderPedidoSheet() {
  if (!M.pedidoState) return;
  const body = document.getElementById('pedido-sheet-body');
  if (!body) return;
  const f = M.pedidoState;

  let mineHTML;
  if (f.loadingMine) {
    mineHTML = `<div class="equipos-empty">${t('pedido.mine.loading')}</div>`;
  } else if (!f.mine || f.mine.length === 0) {
    mineHTML = `<div class="pedido-card-detail" style="padding:0 16px">${t('pedido.mine.empty')}</div>`;
  } else {
    mineHTML = f.mine.map(p => {
      const props = p.properties || {};
      const prod = props['Producto']?.title?.[0]?.plain_text || '(sin nombre)';
      const prio = props['Prioridad']?.select?.name || '';
      const estado = props['Estado']?.select?.name || '';
      const fecha = props['Fecha del pedido']?.date?.start || '';
      return `<div class="pedido-card" style="margin:0 16px 8px">
        <div class="pedido-card-producto" style="font-size:14px">${esc(prod)}</div>
        <div class="pedido-card-meta">
          ${prio ? `<span class="pedido-badge ${pedidoPrioClass(prio)}">${esc(prio)}</span>` : ''}
          ${estado ? `<span class="pedido-badge ${pedidoEstadoClass(estado)}">${esc(estado)}</span>` : ''}
          ${fecha ? `<span class="pedido-card-detail">🗓 ${esc(pedidoFmtFecha(fecha))}</span>` : ''}
        </div>
      </div>`;
    }).join('');
  }

  body.innerHTML = `
    <div class="edit-sheet-header">
      <div class="edit-sheet-title">${t('pedido.title')}</div>
      <div class="edit-sheet-sub">${t('pedido.sub')}</div>
    </div>
    <div class="gasto-form-row">
      <label>${t('pedido.field.producto')}</label>
      <input type="text" id="ped-producto" value="${esc(f.producto)}" oninput="pedidoState.producto=this.value" maxlength="120" placeholder="${t('pedido.field.producto.ph')}"/>
    </div>
    <div class="gasto-form-row">
      <label>${t('pedido.field.prioridad')}</label>
      <div class="pedido-prio-toggle">
        ${PEDIDO_PRIORIDADES.map(p =>
          `<button type="button" class="pedido-prio-btn ${f.prioridad===p?'active':''}" onclick="pedidoState.prioridad='${p}';renderPedidoSheet()">${esc(p)}</button>`
        ).join('')}
      </div>
    </div>
    <div class="gasto-form-row">
      <label>${t('pedido.field.cantidad')}</label>
      <input type="number" id="ped-cantidad" value="${esc(String(f.cantidad))}" step="1" min="0" oninput="pedidoState.cantidad=this.value" placeholder="${t('pedido.field.cantidad.ph')}"/>
    </div>
    <div class="gasto-form-row">
      <label>${t('pedido.field.proveedor')}</label>
      <input type="text" id="ped-proveedor" value="${esc(f.proveedor)}" oninput="pedidoState.proveedor=this.value" maxlength="120" placeholder="${t('pedido.field.proveedor.ph')}"/>
    </div>
    <div class="gasto-form-row">
      <label>${t('pedido.field.costo')}</label>
      <input type="number" id="ped-costo" value="${esc(String(f.costo))}" step="0.01" min="0" inputmode="decimal" oninput="pedidoState.costo=this.value" placeholder="${t('pedido.field.costo.ph')}"/>
    </div>
    <div class="gasto-form-row">
      <label>${t('pedido.field.nota')}</label>
      <textarea id="ped-nota" oninput="pedidoState.nota=this.value" maxlength="500" placeholder="${t('pedido.field.nota.ph')}">${esc(f.nota)}</textarea>
    </div>
    <div class="gasto-actions">
      <button class="edit-save-btn" id="pedido-save-btn" onclick="savePedido()" ${f.saving?'disabled':''}>${f.saving ? t('pedido.saving') : t('pedido.send')}</button>
    </div>
    <div class="pedido-mine-wrap">
      <div class="pedido-mine-title">${t('pedido.mine.title')}</div>
      ${mineHTML}
    </div>
  `;
}

export async function savePedido() {
  if (!M.pedidoState || M.pedidoState.saving) return;
  const f = M.pedidoState;
  if (!f.producto.trim()) { alert(t('pedido.error.producto')); return; }

  f.saving = true;
  renderPedidoSheet();

  const hoy = new Date().toISOString().slice(0, 10);
  const cantNum = f.cantidad !== '' && f.cantidad != null ? Number(f.cantidad) : null;
  const properties = {
    'Producto': { title: [{ text: { content: f.producto.trim() } }] },
    'Prioridad': { select: { name: f.prioridad } },
    'Solicitado por': { rich_text: [{ text: { content: M.currentUser.name } }] },
    'Fecha del pedido': { date: { start: hoy } },
    'Estado': { select: { name: '🆕 Pendiente' } },
    'País': { select: { name: pedidoPaisDelUser() } },
  };
  if (cantNum != null && !isNaN(cantNum)) properties['Cantidad'] = { number: cantNum };
  const costoNum = f.costo !== '' && f.costo != null ? Number(f.costo) : null;
  if (costoNum != null && !isNaN(costoNum) && costoNum >= 0) properties['Costo estimado'] = { number: costoNum };
  if (f.proveedor.trim()) properties['Tienda / Proveedor'] = { rich_text: [{ text: { content: f.proveedor.trim() } }] };
  if (f.nota.trim()) properties['Nota'] = { rich_text: [{ text: { content: f.nota.trim() } }] };

  try {
    await callNotion('pages', 'POST', {
      parent: { type: 'data_source_id', data_source_id: M.SOLICITUDES_DS_ID },
      properties,
    });
    f.saving = false;
    // Limpiar el form y refrescar "Mis pedidos" sin cerrar (para ver el nuevo).
    f.producto = '';
    f.prioridad = '🟡 Normal';
    f.cantidad = '';
    f.proveedor = '';
    f.costo = '';
    f.nota = '';
    f.loadingMine = true;
    renderPedidoSheet();
    showSaving();
    loadMisPedidos();
    // Si el coord tiene la tab Pedidos abierta, refrescar la lista.
    if (M.activeCoordTab === 'pedidos' && typeof renderCoordPedidos === 'function') {
      renderCoordPedidos();
    }
  } catch (e) {
    f.saving = false;
    renderPedidoSheet();
    alert((t('pedido.error.save') || 'Error al guardar:') + ' ' + e.message);
  }
}

// ── Coordinador: tab 📦 Pedidos ──────────────────
export async function renderCoordPedidos() {
  if (esVentas()) return; // blindaje: Ventas no ve Pedidos, ni por un llamado directo
  const content = document.getElementById('coord-content');
  if (!content) return;
  content.innerHTML = '<div style="text-align:center;padding:40px 0"><div class="spinner" style="margin:0 auto"></div></div>';
  const myTab = 'pedidos';
  try {
    const data = await callNotion(`databases/${M.SOLICITUDES_DB_ID}/query`, 'POST', { page_size: 100 });
    if (M.activeCoordTab !== myTab) return;
    let results = data.results || [];
    // Filtrar por país del coord (los de Dirección/HQ ven todos).
    const paisUser = pedidoPaisDelUser();
    const isGlobal = M.currentUser?.role?.includes('Dirección') ||
                     (M.currentUser?.role === '👔 CEO' && M.currentUser?.country === 'Uruguay');
    if (!isGlobal) {
      results = results.filter(r => (r.properties?.['País']?.select?.name || '') === paisUser);
    }
    _coordAllPedidos = results;
    renderCoordPedidosList();
  } catch (e) {
    if (M.activeCoordTab !== myTab) return;
    content.innerHTML = `<div class="coord-empty">${t('pedido.coord.error')}<br><small>${esc(e.message)}</small></div>`;
  }
}

export function setCoordPedidosFilter(val) {
  _coordPedidosFilter = val;
  renderCoordPedidosList();
}

export function renderCoordPedidosList() {
  const content = document.getElementById('coord-content');
  if (!content) return;
  const prioRank = { '🔴 Urgente': 0, '🟡 Normal': 1, '🟢 Sugerente': 2 };

  let items = _coordAllPedidos.slice();
  if (_coordPedidosFilter === 'pendientes') {
    items = items.filter(p => (p.properties?.['Estado']?.select?.name || '').includes('Pendiente'));
  }
  // Orden: Urgente → Normal → Sugerente; dentro, Fecha del pedido desc.
  items.sort((a, b) => {
    const ra = prioRank[a.properties?.['Prioridad']?.select?.name] ?? 9;
    const rb = prioRank[b.properties?.['Prioridad']?.select?.name] ?? 9;
    if (ra !== rb) return ra - rb;
    const fa = a.properties?.['Fecha del pedido']?.date?.start || '';
    const fb = b.properties?.['Fecha del pedido']?.date?.start || '';
    return fb.localeCompare(fa);
  });

  const toggle =
    `<div class="pedido-tab-toggle">
      <button class="${_coordPedidosFilter==='pendientes'?'active':''}" onclick="setCoordPedidosFilter('pendientes')">${t('pedido.coord.filter.pending')}</button>
      <button class="${_coordPedidosFilter==='todos'?'active':''}" onclick="setCoordPedidosFilter('todos')">${t('pedido.coord.filter.all')}</button>
    </div>`;

  const cards = items.length
    ? items.map(p => coordPedidoCard(p)).join('')
    : `<div class="coord-empty" style="margin-top:0">${t('pedido.coord.empty')}</div>`;

  content.innerHTML = toggle + '<div style="height:6px"></div>' + cards;
}

export function coordPedidoCard(p) {
  const props = p.properties || {};
  const prod = props['Producto']?.title?.[0]?.plain_text || '(sin nombre)';
  const prio = props['Prioridad']?.select?.name || '';
  const estado = props['Estado']?.select?.name || '';
  const cant = props['Cantidad']?.number;
  const solicitante = props['Solicitado por']?.rich_text?.[0]?.plain_text || '';
  const nota = props['Nota']?.rich_text?.[0]?.plain_text || '';
  const proveedor = props['Tienda / Proveedor']?.rich_text?.[0]?.plain_text || '';
  const costo = props['Costo estimado']?.number;
  const fechaPedido = props['Fecha del pedido']?.date?.start || '';
  const fechaCompra = props['Fecha de compra']?.date?.start || '';
  const isPendiente = estado.includes('Pendiente');
  const isComprado = estado.includes('Comprado');

  return `<div class="pedido-card">
    <div class="pedido-card-producto">${esc(prod)}${cant != null ? ` <span style="font-weight:600;color:var(--text3);font-size:13px">×${esc(String(cant))}</span>` : ''}</div>
    <div class="pedido-card-meta">
      ${prio ? `<span class="pedido-badge ${pedidoPrioClass(prio)}">${esc(prio)}</span>` : ''}
      ${estado ? `<span class="pedido-badge ${pedidoEstadoClass(estado)}">${esc(estado)}</span>` : ''}
    </div>
    ${solicitante ? `<div class="pedido-card-detail">👤 ${esc(solicitante)}</div>` : ''}
    ${proveedor ? `<div class="pedido-card-detail">🏪 ${esc(proveedor)}</div>` : ''}
    ${costo != null ? `<div class="pedido-card-detail">💲 ${esc(String(costo))}</div>` : ''}
    ${fechaPedido ? `<div class="pedido-card-detail">🗓 ${esc(pedidoFmtFecha(fechaPedido))}</div>` : ''}
    ${fechaCompra ? `<div class="pedido-card-detail">🛒 ${t('pedido.bought.prefix')}${esc(pedidoFmtFecha(fechaCompra))}</div>` : ''}
    ${nota ? `<div class="pedido-card-detail">📝 ${esc(nota)}</div>` : ''}
    ${isPendiente ? `<div class="pedido-card-actions">
      <button class="pedido-btn-comprar" onclick="marcarPedidoComprado('${esc(p.id)}')">${t('pedido.btn.comprado')}</button>
      <button class="pedido-btn-cancelar" onclick="cancelarPedido('${esc(p.id)}')">${t('pedido.btn.cancelar')}</button>
    </div>` : ''}
    ${isComprado ? `<div class="pedido-card-actions">
      <button class="pedido-btn-comprar" onclick="marcarPedidoRecibido('${esc(p.id)}')">${t('pedido.btn.recibido')}</button>
    </div>` : ''}
  </div>`;
}

export async function marcarPedidoRecibido(id) {
  // Confirma la RECEPCIÓN del insumo (paso posterior a "Comprado"). No toca Fecha de compra.
  const item = _coordAllPedidos.find(p => p.id === id);
  if (item) { item.properties['Estado'] = { select: { name: '📦 Recibido' } }; renderCoordPedidosList(); }
  try {
    await callNotion(`pages/${id}`, 'PATCH', { properties: { 'Estado': { select: { name: '📦 Recibido' } } } });
    showSaving();
  } catch (e) {
    alert((t('pedido.error.save') || 'Error al guardar:') + ' ' + e.message);
    renderCoordPedidos();
  }
}

export async function marcarPedidoComprado(id) {
  const hoy = new Date().toISOString().slice(0, 10);
  // Update optimista en memoria.
  const item = _coordAllPedidos.find(p => p.id === id);
  if (item) {
    item.properties['Estado'] = { select: { name: '🛒 Comprado' } };
    item.properties['Fecha de compra'] = { date: { start: hoy } };
    renderCoordPedidosList();
  }
  try {
    await callNotion(`pages/${id}`, 'PATCH', { properties: {
      'Estado': { select: { name: '🛒 Comprado' } },
      'Fecha de compra': { date: { start: hoy } },
    }});
    showSaving();
  } catch (e) {
    alert((t('pedido.error.save') || 'Error al guardar:') + ' ' + e.message);
    renderCoordPedidos();
  }
}

export async function cancelarPedido(id) {
  if (!confirm(t('pedido.confirm.cancelar'))) return;
  const item = _coordAllPedidos.find(p => p.id === id);
  if (item) {
    item.properties['Estado'] = { select: { name: '❌ Cancelado' } };
    renderCoordPedidosList();
  }
  try {
    await callNotion(`pages/${id}`, 'PATCH', { properties: {
      'Estado': { select: { name: '❌ Cancelado' } },
    }});
    showSaving();
  } catch (e) {
    alert((t('pedido.error.save') || 'Error al guardar:') + ' ' + e.message);
    renderCoordPedidos();
  }
}
