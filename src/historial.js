// ─────────────────────────────────────────────
// MI HISTORIAL DE TRABAJOS — lista solo-lectura de servicios en que participó el usuario + editar su nota
// ─────────────────────────────────────────────
// Se abre desde el menú de cuenta (📋 Mi historial). Extraído de main.js el 2026-07-16 (patrón puente).
// currentUser queda en main (vía M/initHistorial); participaEn y las demás funcs de main llegan como alias.

import { t } from './i18n.js';
import { esc, msNames } from './util.js';
import { esArchivado } from './calculos.js';
import { callNotion } from './api.js';

let M = {};
export function initHistorial(bridge) { M = bridge; }

const showSaving = (...a) => M.showSaving(...a);
const closeAccountMenu = (...a) => M.closeAccountMenu(...a);
const forceRelogin = (...a) => M.forceRelogin(...a);
const getMyServices = (...a) => M.getMyServices(...a);
const pedidoFmtFecha = (...a) => M.pedidoFmtFecha(...a);
const participaEn = (...a) => M.participaEn(...a);

let _histItems = null;
export function amHistorial() { closeAccountMenu(); openHistorialSheet(); }
export function closeHistorialSheet() { document.getElementById('historial-overlay').classList.remove('open'); }
export function historialOverlayClick(e) { if (e.target.id === 'historial-overlay') closeHistorialSheet(); }

export function _histDurMin(props) {
  const ini = props['Hora Inicio Efectivo']?.date?.start, fin = props['Hora Fin Efectivo']?.date?.start;
  if (!ini || !fin) return null;
  const di = new Date(ini), df = new Date(fin);
  if (isNaN(di) || isNaN(df) || df <= di) return null;
  return Math.round((df - di) / 60000);
}
export function _histFmtMin(mins) {
  if (!mins) return '0 min';
  const h = Math.floor(mins / 60), m = mins % 60;
  return (h ? h + ' h ' : '') + (m ? m + ' min' : '') || '0 min';
}
export async function openHistorialSheet() {
  document.getElementById('historial-overlay').classList.add('open');
  const list = document.getElementById('hist-list');
  const stats = document.getElementById('hist-stats');
  list.innerHTML = '<div class="spinner" style="margin:16px auto"></div>';
  stats.innerHTML = '';
  try {
    // Fetch DIRECTO al proxy (como jornadaYaExiste): el camino /api/db le filtra al operario solo los
    // servicios donde es ENCARGADO — acá necesitamos TODA su participación (piloto/manual/ayudante).
    // El proxy pagina y la matriz permite query de servicios a los roles de campo. País: filtro client-side.
    const tok = localStorage.getItem('fc_token') || '';
    const resp = await fetch('/api/notion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + tok },
      body: JSON.stringify({ endpoint: `databases/${M.DB_ID}/query`, method: 'POST', body: { page_size: 100 } }),
    });
    if (resp.status === 401) { forceRelogin(); return; }
    if (!resp.ok) throw new Error('API error ' + resp.status);
    const data = await resp.json();
    const nombre = M.currentUser?.name || '';
    const paisNotion = M.COUNTRY_NOTION_MAP[M.currentUser?.country] || null;
    const items = (data.results || []).filter(r => !esArchivado(r)).map(r => {
      const p = r.properties || {};
      const estado = p['Estado']?.select?.name || '';
      if (/Cancelado/.test(estado)) return null;
      const pais = p['País']?.select?.name || '';
      if (paisNotion && pais && pais !== paisNotion) return null; // cinturón país (patrón getMyServices)
      const rol = participaEn(p, nombre);
      if (!rol) return null;
      return { id: r.id, p, rol, estado, fecha: p['Fecha programada']?.date?.start || '', dur: _histDurMin(p) };
    }).filter(Boolean).sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
    _histItems = items;
    renderHistorial();
  } catch (e) {
    list.innerHTML = '<div style="color:var(--red);font-size:12px;padding:12px">⚠️ ' + esc(e.message) + '</div>';
  }
}
export function renderHistorial() {
  const list = document.getElementById('hist-list');
  const stats = document.getElementById('hist-stats');
  if (!list || !_histItems) return;
  const items = _histItems;
  const ym = new Date().toISOString().slice(0, 7);
  const esJornal = (it) => { const tipo = it.p['Tipo de registro']?.select?.name || ''; return !/Relevamiento|Prueba/.test(tipo); };
  // Multi: un servicio puede tener Dron Y Manual → suma en ambas categorías (no se registra el split de tiempo).
  const esDron = (it) => msNames(it.p['Método de trabajo']).includes('🚁 Dron');
  const esManualM = (it) => msNames(it.p['Método de trabajo']).includes('💪 Manual');
  const calc = (arr) => ({
    servicios: arr.length,
    jornales: arr.filter(esJornal).length,
    minutos: arr.reduce((acc, it) => acc + (it.dur || 0), 0),
    minutosDron: arr.reduce((acc, it) => acc + (esDron(it) ? (it.dur || 0) : 0), 0),
    minutosManual: arr.reduce((acc, it) => acc + (esManualM(it) ? (it.dur || 0) : 0), 0),
    conTiempo: arr.filter(it => it.dur).length,
  });
  const mes = calc(items.filter(it => (it.fecha || '').slice(0, 7) === ym));
  const tot = calc(items);
  const cell = (val, lbl, wide) => '<span style="flex:' + (wide ? '1.25' : '1') + ';background:var(--card);border:1px solid var(--border);border-radius:10px;padding:7px 3px;text-align:center;min-width:0"><b style="font-size:13.5px;white-space:nowrap">' + val + '</b><br><span style="font-size:9px;color:var(--text3)">' + esc(lbl) + '</span></span>';
  const statRow = (lbl, c) => '<div style="margin-bottom:8px">' +
    '<div style="font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:var(--text3);margin-bottom:4px">' + esc(lbl) + '</div>' +
    '<div style="display:flex;gap:5px">' +
      cell(String(c.servicios), t('hist.stat.servicios')) +
      cell(String(c.jornales), t('hist.stat.jornales')) +
      cell(esc(_histFmtMin(c.minutos)), t('hist.stat.tiempo'), true) +
    '</div>' +
    '<div style="font-size:10.5px;color:var(--text2);margin-top:4px">🚁 ' + esc(t('hist.stat.dron.inline')) + ': <b>' + esc(_histFmtMin(c.minutosDron)) + '</b> · 💪 ' + esc(t('hist.stat.manual.inline')) + ': <b>' + esc(_histFmtMin(c.minutosManual)) + '</b></div>' +
    '</div>';
  stats.innerHTML = statRow(t('hist.mes'), mes) + statRow(t('hist.total'), tot) +
    '<div style="font-size:10px;color:var(--text3);margin:2px 0 10px">' +
    esc(t('hist.stat.contiempo').replace('{n}', tot.conTiempo).replace('{m}', tot.servicios)) + ' ' + esc(t('hist.stat.hint')) +
    '</div>';

  if (!items.length) { list.innerHTML = '<div style="font-size:12.5px;color:var(--text3);padding:10px 2px">' + esc(t('hist.empty')) + '</div>'; return; }
  const MAX = 50;
  list.innerHTML = items.slice(0, MAX).map(it => {
    const nom = esc(it.p['Nombre del servicio']?.title?.[0]?.plain_text || t('common.sinnombre'));
    const nota = it.p['Notas post-servicio']?.rich_text?.[0]?.plain_text || '';
    const fechaTxt = it.fecha ? esc(pedidoFmtFecha(it.fecha)) : '—';
    return '<div style="background:var(--card);border:1px solid var(--border);border-radius:12px;padding:10px 12px;margin-bottom:8px">' +
      '<div style="font-size:13px;font-weight:700;color:var(--text)">' + nom + '</div>' +
      '<div style="font-size:11px;color:var(--text3);margin-top:3px">' + fechaTxt + ' · ' + esc(it.estado) + ' · ' + esc(it.rol) + (it.dur ? ' · ⏱️ ' + esc(_histFmtMin(it.dur)) : '') + '</div>' +
      (nota ? '<div style="font-size:11.5px;color:var(--text2);margin-top:5px">📝 ' + esc(nota) + '</div>' : '') +
      '<div style="margin-top:7px"><button class="fin-svc-link" onclick="histEditNota(\'' + esc(it.id) + '\')">📝 ' + esc(t('hist.nota.btn')) + '</button></div>' +
      '<div id="hist-nota-' + esc(it.id) + '" style="display:none;margin-top:7px"></div>' +
      '</div>';
  }).join('') + (items.length > MAX ? '<div style="font-size:11px;color:var(--text3);text-align:center;padding:6px">' + esc(t('hist.mas').replace('{n}', items.length - MAX)) + '</div>' : '');
}
export function histEditNota(id) {
  const slot = document.getElementById('hist-nota-' + id);
  if (!slot) return;
  if (slot.style.display !== 'none') { slot.style.display = 'none'; slot.innerHTML = ''; return; }
  const it = (_histItems || []).find(x => x.id === id);
  if (!it) return;
  const nota = it.p['Notas post-servicio']?.rich_text?.[0]?.plain_text || '';
  slot.innerHTML = '<textarea id="hist-nota-input-' + esc(id) + '" rows="3" maxlength="800" style="width:100%;box-sizing:border-box;padding:9px 11px;border:1px solid var(--border);border-radius:9px;background:var(--bg);color:var(--text);font-size:13px;font-family:inherit;resize:vertical">' + esc(nota) + '</textarea>' +
    '<div style="display:flex;gap:8px;margin-top:6px">' +
    '<button onclick="histSaveNota(\'' + esc(id) + '\', this)" style="flex:1;padding:9px;border:none;border-radius:9px;background:var(--accent,#00C98D);color:#03231a;font-weight:700;font-size:12.5px;font-family:inherit">' + esc(t('hist.nota.save')) + '</button>' +
    '<button onclick="histEditNota(\'' + esc(id) + '\')" style="flex:1;padding:9px;border:1px solid var(--border);border-radius:9px;background:transparent;color:var(--text2);font-size:12.5px;font-family:inherit">' + esc(t('btn.cancel')) + '</button></div>';
  slot.style.display = 'block';
}
export async function histSaveNota(id, btn) {
  const inp = document.getElementById('hist-nota-input-' + id);
  const it = (_histItems || []).find(x => x.id === id);
  if (!inp || !it) return;
  const texto = inp.value.trim();
  btn.disabled = true; btn.textContent = '⏳';
  try {
    // ÚNICA escritura permitida desde el historial: la nota propia. Nada más se toca.
    await callNotion('pages/' + id, 'PATCH', { properties: { 'Notas post-servicio': texto ? { rich_text: [{ text: { content: texto } }] } : { rich_text: [] } } });
    it.p['Notas post-servicio'] = texto ? { rich_text: [{ plain_text: texto, text: { content: texto } }] } : { rich_text: [] };
    renderHistorial();
    showSaving();
  } catch (e) {
    btn.disabled = false; btn.textContent = t('hist.nota.save');
    alert(t('sheet.alert.save.error2') + e.message);
  }
}
