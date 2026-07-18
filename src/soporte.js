// ─────────────────────────────────────────────
// 💬 SOPORTE — Fase B del sistema de reportes (2026-07-18, Fase CEO 2 pieza 1). Cierra el círculo:
// · CUALQUIER usuario logueado: escribe un problema/limitación ("reportar") y ve SUS reportes con estado.
// · DIRECCIÓN (admins): además ve la BANDEJA completa (errores automáticos + mensajes del equipo) y marca
//   visto/resuelto. Los mismos datos que reviso yo (Claude) en cada sesión — ahora visibles en la app.
// Entradas: fila "💬 Soporte" del menú de cuenta (todos los roles) + la tab Mensajes del coordinador
// (el placeholder "próximamente" por fin cobra vida). Backend: /api/reporte GET/PATCH/POST tipo 'manual'.
// ─────────────────────────────────────────────
import { t } from './i18n.js';
import { esc } from './util.js';

let M = {};
export function initSoporte(bridge) { M = bridge; }

const isAppAdmin = (...a) => M.isAppAdmin(...a);

let _sopVista = 'mios'; // 'mios' | 'bandeja' (bandeja solo admins)
let _sopRows = [];
let _sopInlineContainer = null; // si está abierto inline (tab Mensajes del coord) en vez de overlay

function _token() { return localStorage.getItem('fc_token') || ''; }

function ensureSoporteOverlay() {
  let ov = document.getElementById('soporte-overlay');
  if (!ov) {
    ov = document.createElement('div');
    ov.id = 'soporte-overlay';
    ov.className = 'edit-overlay';
    ov.onclick = e => { if (e.target.id === 'soporte-overlay') closeSoporte(); };
    ov.innerHTML = `<div class="edit-sheet">
      <button class="sheet-close-btn" type="button" aria-label="Cerrar" onclick="closeSoporte()">×</button>
      <div class="edit-sheet-handle"></div>
      <div class="edit-sheet-header">
        <div class="edit-sheet-title">💬 ${t('sop.title')}</div>
        <div class="edit-sheet-sub">${t('sop.sub')}</div>
      </div>
      <div id="soporte-body" style="padding:4px 16px 18px"></div>
    </div>`;
    document.body.appendChild(ov);
  }
  return ov;
}

export function openSoporte() {
  _sopInlineContainer = null;
  ensureSoporteOverlay().classList.add('open');
  renderSoporte();
  cargarReportes();
}
export function closeSoporte() {
  document.getElementById('soporte-overlay')?.classList.remove('open');
}

// Render inline (la tab Mensajes del coordinador reusa exactamente el mismo contenido).
export function renderSoporteInline(containerId) {
  _sopInlineContainer = containerId;
  renderSoporte();
  cargarReportes();
}

function _sopBody() {
  return _sopInlineContainer ? document.getElementById(_sopInlineContainer) : document.getElementById('soporte-body');
}

export function sopSetVista(v) {
  _sopVista = v === 'bandeja' && isAppAdmin() ? 'bandeja' : 'mios';
  renderSoporte();
  cargarReportes();
}

async function cargarReportes() {
  const cont = _sopBody();
  if (!cont) return;
  const list = cont.querySelector('#sop-list');
  if (list) list.innerHTML = `<div style="text-align:center;padding:20px 0"><div class="spinner" style="margin:0 auto"></div></div>`;
  try {
    const mine = _sopVista !== 'bandeja';
    const r = await fetch('/api/reporte' + (mine ? '?mine=1' : ''), { headers: { Authorization: 'Bearer ' + _token() } });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const d = await r.json();
    _sopRows = d.rows || [];
    renderSoporteLista();
  } catch (e) {
    const l2 = cont.querySelector('#sop-list');
    if (l2) l2.innerHTML = `<div class="coord-empty">${t('sop.error.load')}<br><small>${esc(e.message)}</small></div>`;
  }
}

const SOP_ESTADO = {
  nuevo: { chip: '🔴', label: 'sop.estado.nuevo' },
  visto: { chip: '🟡', label: 'sop.estado.visto' },
  resuelto: { chip: '✅', label: 'sop.estado.resuelto' },
};
const SOP_TIPO = { auto: '🐞', manual: '💬', detalle: '📝' };

function renderSoporte() {
  const cont = _sopBody();
  if (!cont) return;
  const admin = isAppAdmin();
  const toggle = admin
    ? `<div class="pedido-tab-toggle" style="margin:8px 0 10px">
        <button class="${_sopVista === 'mios' ? 'active' : ''}" onclick="sopSetVista('mios')">${t('sop.vista.mios')}</button>
        <button class="${_sopVista === 'bandeja' ? 'active' : ''}" onclick="sopSetVista('bandeja')">${t('sop.vista.bandeja')}</button>
      </div>`
    : '';
  cont.innerHTML =
    (_sopInlineContainer ? `<div class="ceo-section-title" style="margin-top:10px">💬 ${t('sop.title')}</div>` : '') +
    `<div class="gasto-form-row" style="margin-top:6px">
      <label>${t('sop.form.label')}</label>
      <textarea id="sop-texto" maxlength="500" placeholder="${t('sop.form.ph')}" style="min-height:74px"></textarea>
    </div>
    <div class="gasto-actions" style="margin-bottom:6px">
      <button class="edit-save-btn" id="sop-send-btn" onclick="sopEnviar()">${t('sop.form.send')}</button>
    </div>` +
    toggle +
    `<div id="sop-list"></div>`;
}

function renderSoporteLista() {
  const cont = _sopBody();
  const list = cont && cont.querySelector('#sop-list');
  if (!list) return;
  const admin = _sopVista === 'bandeja';
  if (!_sopRows.length) {
    list.innerHTML = `<div class="coord-empty" style="padding:16px">${t(admin ? 'sop.empty.bandeja' : 'sop.empty.mios')}</div>`;
    return;
  }
  list.innerHTML = _sopRows.map(r => {
    const est = SOP_ESTADO[r.estado] || SOP_ESTADO.nuevo;
    const cuando = (r.creado || '').slice(0, 16).replace('T', ' · ');
    const quien = admin ? `<span style="color:var(--text2)">${esc(r.usuario || t('sop.anon'))}${r.rol ? ' · ' + esc(r.rol) : ''}</span><br>` : '';
    const ctx = [r.pantalla, r.version ? 'v' + r.version : ''].filter(Boolean).join(' · ');
    const botones = admin
      ? `<div style="display:flex;gap:6px;margin-top:7px">` +
          (r.estado !== 'visto' ? `<button class="estado-btn prop-compact-btn" onclick="sopMarcar(${r.id},'visto')">🟡 ${t('sop.marcar.visto')}</button>` : '') +
          (r.estado !== 'resuelto' ? `<button class="estado-btn prop-compact-btn" style="color:var(--green);border-color:var(--green)" onclick="sopMarcar(${r.id},'resuelto')">✅ ${t('sop.marcar.resuelto')}</button>` : '') +
        `</div>`
      : '';
    return `<div class="pedido-card" style="margin:0 0 8px" id="sop-row-${r.id}">
      <div class="pedido-card-meta" style="margin-bottom:4px">
        <span class="pedido-badge">${SOP_TIPO[r.tipo] || '🐞'} ${esc(r.tipo)}</span>
        <span class="pedido-badge">${est.chip} ${t(est.label)}</span>
        <span class="pedido-card-detail">${esc(cuando)}</span>
      </div>
      ${quien}
      <div style="font-size:13px">${esc(r.mensaje || '')}</div>
      ${r.detalle ? `<div class="pedido-card-detail" style="margin-top:4px">📝 ${esc(r.detalle)}</div>` : ''}
      ${ctx ? `<div class="pedido-card-detail" style="margin-top:3px">${esc(ctx)}</div>` : ''}
      ${botones}
    </div>`;
  }).join('');
}

export async function sopEnviar() {
  const cont = _sopBody();
  const ta = cont && cont.querySelector('#sop-texto');
  const btn = cont && cont.querySelector('#sop-send-btn');
  const texto = (ta?.value || '').trim();
  if (!texto) { alert(t('sop.form.vacio')); return; }
  if (btn) { btn.disabled = true; btn.textContent = '⏳'; }
  try {
    const r = await fetch('/api/reporte', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + _token() },
      body: JSON.stringify({ tipo: 'manual', mensaje: texto, version: M.APP_VERSION || '', pantalla: 'soporte', online: navigator.onLine }),
    });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    if (ta) ta.value = '';
    if (btn) { btn.disabled = false; btn.textContent = '✓ ' + t('sop.form.enviado'); setTimeout(() => { btn.textContent = t('sop.form.send'); }, 2200); }
    cargarReportes(); // el nuevo aparece arriba de "Mis reportes"
  } catch (e) {
    if (btn) { btn.disabled = false; btn.textContent = t('sop.form.send'); }
    alert(t('sop.error.send') + ' ' + e.message);
  }
}

export async function sopMarcar(id, estado) {
  try {
    const r = await fetch('/api/reporte', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + _token() },
      body: JSON.stringify({ id, estado }),
    });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const row = _sopRows.find(x => x.id === id);
    if (row) row.estado = estado;
    renderSoporteLista(); // update optimista con el dato confirmado
  } catch (e) {
    alert(t('sop.error.send') + ' ' + e.message);
  }
}
