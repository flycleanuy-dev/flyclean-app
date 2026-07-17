// ─────────────────────────────────────────────
// EQUIPOS / FLOTA (DB Activos) — tab del coordinador (check mensual, km, horas, problemas), "Mis equipos" del
// operario, equipos asignados a un servicio, alta de equipo. Extraído de main.js el 2026-07-16 (patrón puente).
// ─────────────────────────────────────────────
// _activosCache y _equiposDelServicio quedan en main (los usan renderStep/openEditSheet) → vía M/initEquipos;
// _coordAllActivos/_misEquipos/_eqInp son propios del módulo. Funcs de main que usa = alias.

import { t } from './i18n.js';
import { esc } from './util.js';
import { callNotion } from './api.js';

let M = {};
export function initEquipos(bridge) { M = bridge; }

const EQ_ESTADOS = ['✅ Operativo', '🔧 En mantenimiento', '🚨 En reparación', '❌ Fuera de servicio'];
const ACTIVOS_DS_ID = 'c3cf41a0-a160-4166-8d3d-1bbd90af45ff'; // data source (para crear activos)
const EQ_TIPOS = ['🚁 Drone', '🚗 Vehículo', '💧 Hidrolavadora', '🔬 Ósmosis', '🚛 Trailer', '🖨️ Electrónico', '🔧 Herramienta', '🦺 Seguridad'];
const EQ_CHECK_DIAS = 30; // check mensual
const MISEQ_PROB_TIPOS = ['⚠️ Anda mal', '🔧 Necesita mantenimiento', '🔄 Hay que actualizarlo', '📝 Otro'];

const esDireccion = (...a) => M.esDireccion(...a);
const esVentas = (...a) => M.esVentas(...a);
const pedidoFmtFecha = (...a) => M.pedidoFmtFecha(...a);
const showSaving = (...a) => M.showSaving(...a);

export async function fetchActivosDisponibles() {
  if (M._activosCache) return M._activosCache.items;
  try {
    const data = await callNotion(`databases/${M.ACTIVOS_DB_ID}/query`, 'POST', {
      filter: { property: 'Estado', select: { equals: '✅ Operativo' } },
      page_size: 100
    });
    const items = (data.results || []).map(r => {
      const props = r.properties || {};
      const titleProp = Object.values(props).find(p => p.type === 'title');
      const name = titleProp?.title?.[0]?.plain_text || '(sin nombre)';
      return {
        id: r.id,
        name,
        tipo: props['Tipo']?.select?.name || '',
        serie: props['Nro. Serie']?.rich_text?.[0]?.plain_text || props['Número de serie']?.rich_text?.[0]?.plain_text || '',
        marca: props['Marca/Modelo']?.rich_text?.[0]?.plain_text || props['Marca']?.rich_text?.[0]?.plain_text || '',
        pais: props['País']?.select?.name || ''
      };
    });
    M._activosCache = { items, time: Date.now() };
    return items;
  } catch (e) {
    console.warn('[equipos] fetchActivosDisponibles error:', e.message);
    return [];
  }
}
let _coordAllActivos = null;
export function eqHistParse(props) {
  try { const v = JSON.parse(props['Historial equipo']?.rich_text?.[0]?.plain_text || '[]'); return Array.isArray(v) ? v : []; } catch (_) { return []; }
}
export function eqProblemaAbierto(props) {
  const hist = eqHistParse(props);
  let iP = -1, iR = -1;
  hist.forEach((e, i) => { if (e.t === 'problema') iP = i; else if (e.t === 'resuelto') iR = i; });
  return iP > iR ? hist[iP] : null;
}
export function eqDiasDesdeCheck(props) {
  const f = props['Último check']?.date?.start || '';
  if (!f) return null;
  return Math.floor((Date.now() - new Date(f + (f.length === 10 ? 'T00:00:00' : '')).getTime()) / 86400000);
}
export async function renderCoordEquipos() {
  if (esVentas()) return; // blindaje: Ventas no gestiona equipos
  const content = document.getElementById('coord-content');
  if (!content) return;
  content.innerHTML = '<div style="text-align:center;padding:40px 0"><div class="spinner" style="margin:0 auto"></div></div>';
  const myTab = 'equipos';
  try {
    const data = await callNotion(`databases/${M.ACTIVOS_DB_ID}/query`, 'POST', {});
    if (M.activeCoordTab !== myTab) return;
    let items = data.results || [];
    // País: coord ve SU país; Dirección ve todos.
    if (!esDireccion()) {
      const short = M.COUNTRY_FINANCE_MAP[M.currentUser?.country] || null;
      if (short) items = items.filter(a => (a.properties?.['País']?.select?.name || '') === short);
    }
    _coordAllActivos = items;
    renderCoordEquiposList();
  } catch (e) {
    if (M.activeCoordTab !== myTab) return;
    content.innerHTML = `<div class="coord-empty">${t('coord.error.load')}<br><small>${esc(e.message)}</small></div>`;
  }
}
export function renderCoordEquiposList() {
  if (M.activeCoordTab !== 'equipos') return; // un save tardío no debe pisar la tab activa (review)
  const content = document.getElementById('coord-content');
  if (!content || !_coordAllActivos) return;
  const items = _coordAllActivos;
  const sinCheck = items.filter(a => {
    const est = a.properties?.['Estado']?.select?.name || '';
    if (est.includes('Fuera de servicio')) return false;
    const d = eqDiasDesdeCheck(a.properties || {});
    return d == null || d > EQ_CHECK_DIAS;
  }).length;

  let h = '<div style="padding:12px 16px 4px;display:flex;gap:8px;align-items:center">' +
    '<button class="edit-save-btn" style="flex:1;margin:0" onclick="eqToggleAlta()">' + esc(t('eq.add')) + '</button></div>' +
    '<div id="eq-alta-form" style="display:none;margin:8px 16px"></div>' +
    (sinCheck ? '<div style="margin:6px 16px;padding:8px 12px;background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.4);border-radius:10px;font-size:12px;color:var(--amber,#f59e0b)">⚠️ ' + esc(t('eq.sincheck.banner').replace('{n}', sinCheck)) + '</div>' : '');

  if (!items.length) { content.innerHTML = h + '<div class="coord-empty">' + esc(t('eq.empty')) + '</div>'; return; }

  // Agrupar por Tipo (orden EQ_TIPOS); Dirección además ve el país en la card.
  const byTipo = {};
  items.forEach(a => { const tp = a.properties?.['Tipo']?.select?.name || '❓'; (byTipo[tp] = byTipo[tp] || []).push(a); });
  const tiposOrden = [...EQ_TIPOS.filter(tp => byTipo[tp]), ...Object.keys(byTipo).filter(tp => !EQ_TIPOS.includes(tp))];

  for (const tp of tiposOrden) {
    h += '<div style="font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--text3);padding:12px 16px 4px">' + esc(tp) + ' (' + byTipo[tp].length + ')</div>';
    for (const a of byTipo[tp]) {
      const p = a.properties || {};
      const nombre = p['Activo']?.title?.[0]?.plain_text || t('common.sinnombre');
      const marca = p['Marca / Modelo']?.rich_text?.[0]?.plain_text || '';
      const matricula = p['Nro. Serie / Matrícula']?.rich_text?.[0]?.plain_text || '';
      const estado = p['Estado']?.select?.name || '';
      const km = p['Km actuales']?.number;
      const hs = p['Horas de vuelo']?.number;
      const proxMant = p['Próximo mantenimiento']?.date?.start || '';
      const dCheck = eqDiasDesdeCheck(p);
      const esVehiculo = tp.includes('Vehículo'), esDrone = tp.includes('Drone');
      // Semáforo del reporte SEMANAL (Equipos v2): verde ≤7 días · amarillo 8-14 · rojo >14/nunca.
      const semaforo = dCheck == null ? '🔴' : (dCheck <= 7 ? '🟢' : (dCheck <= 14 ? '🟡' : '🔴'));
      const checkTxt = dCheck == null ? semaforo + ' ' + t('eq.check.nunca') : semaforo + ' ' + t('eq.check.hace').replace('{d}', dCheck);
      const histN = eqHistParse(p).length;
      const resp = p['Responsable App']?.select?.name || '';
      const paisTxt = esDireccion() ? ' · ' + esc(p['País']?.select?.name || '') : '';
      const prob = eqProblemaAbierto(p); // problema reportado por el piloto, sin resolver
      h += '<div style="background:var(--card);border:1px solid var(--border);border-radius:12px;padding:11px 12px;margin:0 16px 8px">' +
        '<div style="display:flex;justify-content:space-between;gap:8px;align-items:baseline">' +
          '<div style="font-size:13.5px;font-weight:700;color:var(--text);min-width:0">' + esc(nombre) + '</div>' +
          '<span class="gasto-tag" style="flex:none">' + esc(estado) + '</span></div>' +
        '<div style="font-size:11px;color:var(--text3);margin-top:3px">' + esc(marca) + (matricula ? ' · 🪪 ' + esc(matricula) : ' · <i>' + esc(t('eq.sinmatricula')) + '</i>') + (resp ? ' · 👤 ' + esc(resp) : '') + paisTxt + '</div>' +
        '<div style="font-size:11.5px;color:var(--text2);margin-top:4px">' +
          (esVehiculo ? '🛣️ ' + (km != null ? Number(km).toLocaleString('es-UY') + ' km' : '— km') + ' · ' : '') +
          (esDrone ? '🚁 ' + (hs != null ? hs + ' hs' : '— hs') + ' · ' : '') +
          esc(checkTxt) + (proxMant ? ' · 🔧 ' + esc(pedidoFmtFecha(proxMant)) : '') + '</div>' +
        (prob ? '<div style="font-size:11.5px;color:#f59e0b;background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.35);border-radius:8px;padding:6px 9px;margin-top:6px">⚠️ ' + esc(prob.n || '') + ' <span style="opacity:.7">· ' + esc(t('eq.prob.byPiloto')) + '</span></div>' : '') +
        '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">' +
          (prob ? '<button class="fin-svc-link" style="color:#00C98D" onclick="eqResolverProblema(\'' + esc(a.id) + '\')">✓ ' + esc(t('eq.prob.resolver')) + '</button>' : '') +
          '<button class="fin-svc-link" onclick="eqCheckForm(\'' + esc(a.id) + '\')">✅ ' + esc(t('eq.btn.check')) + '</button>' +
          '<button class="fin-svc-link" onclick="eqServiceForm(\'' + esc(a.id) + '\')">🔧 ' + esc(t('eq.btn.service')) + '</button>' +
          '<button class="fin-svc-link" onclick="eqEditForm(\'' + esc(a.id) + '\')">✏️</button>' +
          (histN ? '<button class="fin-svc-link" onclick="eqHistToggle(\'' + esc(a.id) + '\')">📜 ' + histN + '</button>' : '') +
        '</div>' +
        '<div id="eq-slot-' + esc(a.id) + '" style="display:none;margin-top:8px"></div>' +
        '</div>';
    }
  }
  content.innerHTML = h + '<div style="height:16px"></div>';
}
export function eqFind(id) { return (_coordAllActivos || []).find(x => x.id === id); }
// Coordinador cierra un problema reportado por el piloto: evento 'resuelto' en el historial (eqPatch ya
export async function eqResolverProblema(id) {
  const a = eqFind(id); if (!a) return;
  const prob = eqProblemaAbierto(a.properties || {}); if (!prob) return;
  if (!confirm(t('eq.prob.resolver.confirm'))) return;
  await eqPatch(id, {}, { f: new Date().toISOString().slice(0, 10), t: 'resuelto', por: M.currentUser?.name || '', n: prob.n || '' });
}
export function eqSlot(id) { return document.getElementById('eq-slot-' + id); }
export function eqCloseSlot(id) { const sl = eqSlot(id); if (sl) { sl.style.display = 'none'; sl.innerHTML = ''; } }
const _eqInp = 'width:100%;box-sizing:border-box;padding:9px 11px;margin-bottom:7px;border:1px solid var(--border);border-radius:9px;background:var(--bg);color:var(--text);font-size:13px;font-family:inherit';
export async function eqPatch(id, props, evento) {
  const a = eqFind(id);
  if (!a) return false;
  if (evento) {
    const hist = eqHistParse(a.properties || {});
    hist.push(evento);
    const recorte = hist.slice(-100); // cap: últimos 100 eventos
    props['Historial equipo'] = { rich_text: [{ text: { content: JSON.stringify(recorte) } }] };
  }
  try {
    await callNotion('pages/' + id, 'PATCH', { properties: props });
    // Update optimista local (shape read con plain_text para re-render inmediato)
    for (const [k, v] of Object.entries(props)) {
      if (v.rich_text) a.properties[k] = { rich_text: v.rich_text.length ? [{ plain_text: v.rich_text[0].text.content, text: v.rich_text[0].text }] : [] };
      else a.properties[k] = v;
    }
    showSaving();
    renderCoordEquiposList();
    return true;
  } catch (e) { alert(t('sheet.alert.save.error2') + e.message); return false; }
}
export function eqCheckForm(id) {
  const sl = eqSlot(id); const a = eqFind(id);
  if (!sl || !a) return;
  if (sl.style.display !== 'none') { eqCloseSlot(id); return; }
  const tp = a.properties?.['Tipo']?.select?.name || '';
  const esVeh = tp.includes('Vehículo'), esDrone = tp.includes('Drone');
  sl.innerHTML = '<div style="background:var(--bg);border:1px solid var(--border2);border-radius:10px;padding:10px">' +
    '<div style="font-size:11px;font-weight:700;color:var(--text2);margin-bottom:7px">✅ ' + esc(t('eq.check.title')) + '</div>' +
    (esVeh ? '<input id="eq-km-' + esc(id) + '" type="number" min="0" placeholder="' + esc(t('eq.f.km')) + '" style="' + _eqInp + '">' : '') +
    (esDrone ? '<input id="eq-hs-' + esc(id) + '" type="number" min="0" step="0.1" placeholder="' + esc(t('eq.f.hs')) + '" style="' + _eqInp + '">' : '') +
    '<input id="eq-nota-' + esc(id) + '" maxlength="200" placeholder="' + esc(t('eq.f.nota')) + '" style="' + _eqInp + '">' +
    '<button class="pin-change-btn" style="margin-top:2px" onclick="eqCheckSave(\'' + esc(id) + '\', this)">' + esc(t('eq.check.save')) + '</button></div>';
  sl.style.display = 'block';
}
export async function eqCheckSave(id, btn) {
  const hoy = new Date().toISOString().slice(0, 10);
  const km = parseFloat(document.getElementById('eq-km-' + id)?.value);
  const hs = parseFloat(document.getElementById('eq-hs-' + id)?.value);
  const nota = (document.getElementById('eq-nota-' + id)?.value || '').trim();
  if (/[<>]/.test(nota)) { alert(t('eq.err.nota')); return; }
  const props = { 'Último check': { date: { start: hoy } } };
  const ev = { f: hoy, t: 'check', por: M.currentUser?.name || '' };
  if (Number.isFinite(km) && km >= 0) { props['Km actuales'] = { number: km }; ev.km = km; }
  if (Number.isFinite(hs) && hs >= 0) { props['Horas de vuelo'] = { number: hs }; ev.hs = hs; }
  if (nota) ev.n = nota;
  btn.disabled = true; btn.textContent = '⏳';
  if (await eqPatch(id, props, ev)) return; // re-render cierra el slot
  btn.disabled = false; btn.textContent = t('eq.check.save');
}
export function eqServiceForm(id) {
  const sl = eqSlot(id); if (!sl) return;
  if (sl.style.display !== 'none') { eqCloseSlot(id); return; }
  sl.innerHTML = '<div style="background:var(--bg);border:1px solid var(--border2);border-radius:10px;padding:10px">' +
    '<div style="font-size:11px;font-weight:700;color:var(--text2);margin-bottom:7px">🔧 ' + esc(t('eq.service.title')) + '</div>' +
    '<label style="font-size:10px;color:var(--text3)">' + esc(t('eq.f.proximo')) + '</label>' +
    '<input id="eq-prox-' + esc(id) + '" type="date" style="' + _eqInp + '">' +
    '<input id="eq-snota-' + esc(id) + '" maxlength="200" placeholder="' + esc(t('eq.f.snota')) + '" style="' + _eqInp + '">' +
    '<button class="pin-change-btn" style="margin-top:2px" onclick="eqServiceSave(\'' + esc(id) + '\', this)">' + esc(t('eq.service.save')) + '</button></div>';
  sl.style.display = 'block';
}
export async function eqServiceSave(id, btn) {
  const hoy = new Date().toISOString().slice(0, 10);
  const prox = document.getElementById('eq-prox-' + id)?.value || '';
  const nota = (document.getElementById('eq-snota-' + id)?.value || '').trim();
  if (/[<>]/.test(nota)) { alert(t('eq.err.nota')); return; }
  const props = { 'Último mantenimiento': { date: { start: hoy } } };
  if (prox) props['Próximo mantenimiento'] = { date: { start: prox } };
  const ev = { f: hoy, t: 'service', por: M.currentUser?.name || '' };
  if (prox) ev.prox = prox;
  if (nota) ev.n = nota;
  btn.disabled = true; btn.textContent = '⏳';
  if (await eqPatch(id, props, ev)) return;
  btn.disabled = false; btn.textContent = t('eq.service.save');
}
export function eqEditForm(id) {
  const sl = eqSlot(id); const a = eqFind(id);
  if (!sl || !a) return;
  if (sl.style.display !== 'none') { eqCloseSlot(id); return; }
  const p = a.properties || {};
  const nombre = p['Activo']?.title?.[0]?.plain_text || '';
  const marca = p['Marca / Modelo']?.rich_text?.[0]?.plain_text || '';
  const matricula = p['Nro. Serie / Matrícula']?.rich_text?.[0]?.plain_text || '';
  const estado = p['Estado']?.select?.name || EQ_ESTADOS[0];
  // Responsable (Equipos v2): la persona de campo que reporta km/horas cada semana. Solo gente del país del equipo.
  const respAct = p['Responsable App']?.select?.name || '';
  const shortPais = p['País']?.select?.name || '';
  const respPool = M.USERS.filter(u => /Operario|Coordinador|Dirección/.test(u.role) && (!shortPais || M.COUNTRY_FINANCE_MAP[u.country] === shortPais));
  sl.innerHTML = '<div style="background:var(--bg);border:1px solid var(--border2);border-radius:10px;padding:10px">' +
    '<input id="eq-enombre-' + esc(id) + '" value="' + esc(nombre) + '" maxlength="80" placeholder="' + esc(t('eq.f.nombre')) + '" style="' + _eqInp + '">' +
    '<input id="eq-emarca-' + esc(id) + '" value="' + esc(marca) + '" maxlength="80" placeholder="' + esc(t('eq.f.marca')) + '" style="' + _eqInp + '">' +
    '<input id="eq-emat-' + esc(id) + '" value="' + esc(matricula) + '" maxlength="40" placeholder="' + esc(t('eq.f.matricula')) + '" style="' + _eqInp + '">' +
    '<select id="eq-eestado-' + esc(id) + '" style="' + _eqInp + '">' + EQ_ESTADOS.map(x => '<option' + (x === estado ? ' selected' : '') + '>' + esc(x) + '</option>').join('') + '</select>' +
    '<label style="font-size:10px;color:var(--text3)">👤 ' + esc(t('eq.f.resp')) + '</label>' +
    '<select id="eq-eresp-' + esc(id) + '" style="' + _eqInp + '"><option value="">' + esc(t('eq.resp.none')) + '</option>' +
      respPool.map(u => '<option' + (u.name === respAct ? ' selected' : '') + '>' + esc(u.name) + '</option>').join('') + '</select>' +
    '<button class="pin-change-btn" style="margin-top:2px" onclick="eqEditSave(\'' + esc(id) + '\', this)">' + esc(t('cfg.user.save')) + '</button>' +
    '<button class="pin-change-link" style="width:100%;text-align:center;color:#e5484d;margin-top:8px" onclick="eqDeleteEquipo(\'' + esc(id) + '\')">🗑️ ' + esc(t('eq.delete.btn')) + '</button>' +
    '<div style="font-size:10px;color:var(--text3);text-align:center;margin-top:2px">' + esc(t('eq.delete.hint')) + '</div></div>';
  sl.style.display = 'block';
}
export async function eqDeleteEquipo(id) {
  const a = eqFind(id); if (!a) return;
  const nombre = a.properties?.['Activo']?.title?.[0]?.plain_text || t('common.sinnombre');
  if (!confirm(t('eq.delete.confirm').replace('{name}', nombre))) return;
  try {
    await callNotion('pages/' + id, 'PATCH', { in_trash: true });
    // Update optimista: sacarlo de la lista al instante.
    _coordAllActivos = (_coordAllActivos || []).filter(x => x.id !== id);
    renderCoordEquiposList();
    showSaving();
  } catch (e) { alert(t('sheet.alert.save.error2') + e.message); }
}
export async function eqEditSave(id, btn) {
  const a = eqFind(id); if (!a) return;
  const nombre = (document.getElementById('eq-enombre-' + id)?.value || '').trim();
  const marca = (document.getElementById('eq-emarca-' + id)?.value || '').trim();
  const matricula = (document.getElementById('eq-emat-' + id)?.value || '').trim();
  const estado = document.getElementById('eq-eestado-' + id)?.value;
  if (!nombre || /[<>]/.test(nombre + marca + matricula)) { alert(t('eq.err.nota')); return; }
  if (!EQ_ESTADOS.includes(estado)) { return; }
  const estadoPrev = a.properties?.['Estado']?.select?.name || '';
  const resp = document.getElementById('eq-eresp-' + id)?.value || '';
  const respPrev = a.properties?.['Responsable App']?.select?.name || '';
  const props = {
    'Activo': { title: [{ text: { content: nombre } }] },
    'Marca / Modelo': { rich_text: marca ? [{ text: { content: marca } }] : [] },
    'Nro. Serie / Matrícula': { rich_text: matricula ? [{ text: { content: matricula } }] : [] },
    'Estado': { select: { name: estado } },
    'Responsable App': { select: resp ? { name: resp } : null },
  };
  const hoyEv = new Date().toISOString().slice(0, 10);
  const ev = (estado !== estadoPrev) ? { f: hoyEv, t: 'estado', por: M.currentUser?.name || '', n: estadoPrev + ' → ' + estado }
    : (resp !== respPrev) ? { f: hoyEv, t: 'resp', por: M.currentUser?.name || '', n: (respPrev || '—') + ' → ' + (resp || '—') } : null;
  btn.disabled = true; btn.textContent = '⏳';
  // Update optimista del title (eqPatch cubre rich_text/select; el title lo seteamos a mano)
  if (await eqPatch(id, props, ev)) { a.properties['Activo'] = { title: [{ plain_text: nombre, text: { content: nombre } }] }; renderCoordEquiposList(); return; }
  btn.disabled = false; btn.textContent = t('cfg.user.save');
}
export function eqHistToggle(id) {
  const sl = eqSlot(id); const a = eqFind(id);
  if (!sl || !a) return;
  if (sl.style.display !== 'none') { eqCloseSlot(id); return; }
  const hist = eqHistParse(a.properties || {}).slice().reverse();
  const tipoTxt = { check: '✅ Check', service: '🔧 Service', estado: '🔄 Estado', alta: '➕ Alta', reporte: '📆 Reporte', resp: '👤 Responsable', problema: '⚠️ Problema', resuelto: '✅ Resuelto' };
  sl.innerHTML = '<div style="background:var(--bg);border:1px solid var(--border2);border-radius:10px;padding:10px;max-height:220px;overflow-y:auto">' +
    hist.map(e => '<div style="font-size:11px;color:var(--text2);padding:4px 0;border-bottom:1px solid var(--border)">' +
      '<b>' + esc(e.f || '') + '</b> · ' + esc(tipoTxt[e.t] || e.t || '') + (e.por ? ' · ' + esc(e.por) : '') +
      (e.km != null ? ' · ' + esc(String(e.km)) + ' km' : '') + (e.hs != null ? ' · ' + esc(String(e.hs)) + ' hs' : '') +
      (e.prox ? ' · próx: ' + esc(e.prox) : '') + (e.n ? '<br><span style="color:var(--text3)">' + esc(e.n) + '</span>' : '') +
      '</div>').join('') + '</div>';
  sl.style.display = 'block';
}
let _misEquipos = null;
export function closeMisEquipos() { document.getElementById('miseq-overlay')?.classList.remove('open'); }
export async function openMisEquipos() {
  const ov = document.getElementById('miseq-overlay');
  const list = document.getElementById('miseq-list');
  if (!ov || !list) return;
  ov.classList.add('open');
  list.innerHTML = '<div class="spinner" style="margin:16px auto"></div>';
  try {
    const short = M.COUNTRY_FINANCE_MAP[M.currentUser?.country] || null;
    const d = await callNotion(`databases/${M.ACTIVOS_DB_ID}/query`, 'POST', short ? { filter: { property: 'País', select: { equals: short } } } : {});
    _misEquipos = (d.results || []).filter(a => {
      const p = a.properties || {};
      if ((p['Responsable App']?.select?.name || '') !== (M.currentUser?.name || '')) return false;
      return !(p['Estado']?.select?.name || '').includes('Fuera de servicio');
    });
    renderMisEquipos();
  } catch (e) { list.innerHTML = '<div style="color:var(--red);font-size:12px;padding:12px">⚠️ ' + esc(e.message) + '</div>'; }
}
export function renderMisEquipos() {
  const list = document.getElementById('miseq-list');
  if (!list) return;
  if (!_misEquipos || !_misEquipos.length) { list.innerHTML = '<div style="text-align:center;color:var(--text3);font-size:13px;padding:24px 12px">' + esc(t('miseq.empty')) + '</div>'; return; }
  list.innerHTML = _misEquipos.map(a => {
    const p = a.properties || {};
    const tp = p['Tipo']?.select?.name || '';
    const esVeh = tp.includes('Vehículo'), esDrone = tp.includes('Drone');
    const nombre = p['Activo']?.title?.[0]?.plain_text || t('common.sinnombre');
    const km = p['Km actuales']?.number, hs = p['Horas de vuelo']?.number;
    const d = eqDiasDesdeCheck(p);
    const prevTxt = esVeh ? (km != null ? Number(km).toLocaleString('es-UY') + ' km' : '—') : (esDrone ? (hs != null ? hs + ' hs' : '—') : '');
    const dTxt = d == null ? t('eq.check.nunca') : t('eq.check.hace').replace('{d}', d);
    const prob = eqProblemaAbierto(p);
    return '<div style="background:var(--card);border:1px solid var(--border);border-radius:12px;padding:11px 12px;margin-bottom:9px">' +
      '<div style="font-size:13.5px;font-weight:700">' + esc(nombre) + '</div>' +
      '<div style="font-size:11px;color:var(--text3);margin:2px 0 8px">' + (prevTxt ? esc(t('miseq.antes').replace('{v}', prevTxt)) + ' · ' : '') + esc(dTxt) + '</div>' +
      (prob ? '<div style="font-size:11px;color:#f59e0b;background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.35);border-radius:8px;padding:6px 9px;margin-bottom:8px">⚠️ ' + esc(t('miseq.prob.abierto')) + ': ' + esc(prob.n || '') + '</div>' : '') +
      (esVeh ? '<input id="meq-val-' + esc(a.id) + '" type="number" min="0" inputmode="numeric" placeholder="' + esc(t('miseq.ph.km')) + '" style="' + _eqInp + '">' : '') +
      (esDrone ? '<input id="meq-val-' + esc(a.id) + '" type="number" min="0" step="0.1" inputmode="decimal" placeholder="' + esc(t('miseq.ph.hs')) + '" style="' + _eqInp + '">' : '') +
      '<input id="meq-nota-' + esc(a.id) + '" maxlength="200" placeholder="' + esc(t('miseq.nota.ph')) + '" style="' + _eqInp + '">' +
      '<button class="pin-change-btn" style="margin-top:2px" onclick="misEqSave(\'' + esc(a.id) + '\', this)">' + esc(t('miseq.save')) + '</button>' +
      '<button class="fin-svc-link" style="margin-top:8px;color:#f59e0b" onclick="misEqToggleProblem(\'' + esc(a.id) + '\')">⚠️ ' + esc(t('miseq.prob.btn')) + '</button>' +
      '<div id="meq-slot-' + esc(a.id) + '" style="display:none;margin-top:8px"></div>' +
      '</div>';
  }).join('');
}
export async function misEqSave(id, btn) {
  const a = (_misEquipos || []).find(x => x.id === id); if (!a) return;
  const p = a.properties || {};
  const tp = p['Tipo']?.select?.name || '';
  const esVeh = tp.includes('Vehículo'), esDrone = tp.includes('Drone');
  const val = parseFloat(document.getElementById('meq-val-' + id)?.value);
  const nota = (document.getElementById('meq-nota-' + id)?.value || '').trim();
  if (/[<>]/.test(nota)) { alert(t('eq.err.nota')); return; }
  const prev = esVeh ? p['Km actuales']?.number : (esDrone ? p['Horas de vuelo']?.number : null);
  const tiene = Number.isFinite(val) && val >= 0;
  if ((esVeh || esDrone) && !tiene && !nota) { alert(t('miseq.err.vacio')); return; }
  // El contador solo sube: un valor menor al anterior suele ser error de tipeo.
  if (tiene && prev != null && val < prev && !confirm(t('miseq.confirm.menor').replace('{v}', String(prev)))) return;
  const hoy = new Date().toISOString().slice(0, 10);
  const props = { 'Último check': { date: { start: hoy } } };
  const ev = { f: hoy, t: 'reporte', por: M.currentUser?.name || '' };
  if (esVeh && tiene) { props['Km actuales'] = { number: val }; ev.km = val; }
  if (esDrone && tiene) { props['Horas de vuelo'] = { number: val }; ev.hs = val; }
  if (nota) ev.n = nota;
  const hist = eqHistParse(p); hist.push(ev);
  const histJson = JSON.stringify(hist.slice(-100));
  props['Historial equipo'] = { rich_text: [{ text: { content: histJson } }] };
  btn.disabled = true; btn.textContent = '⏳';
  try {
    await callNotion('pages/' + id, 'PATCH', { properties: props });
    // Update optimista local (shape read con plain_text) + feedback.
    if (props['Km actuales']) a.properties['Km actuales'] = props['Km actuales'];
    if (props['Horas de vuelo']) a.properties['Horas de vuelo'] = props['Horas de vuelo'];
    a.properties['Último check'] = { date: { start: hoy } };
    a.properties['Historial equipo'] = { rich_text: [{ plain_text: histJson, text: { content: histJson } }] };
    showSaving();
    btn.textContent = '✅ ' + t('miseq.saved');
    setTimeout(() => renderMisEquipos(), 1100);
  } catch (e) { alert(t('sheet.alert.save.error2') + e.message); btn.disabled = false; btn.textContent = t('miseq.save'); }
}
export function misEqToggleProblem(id) {
  const sl = document.getElementById('meq-slot-' + id);
  if (!sl) return;
  if (sl.style.display !== 'none') { sl.style.display = 'none'; sl.innerHTML = ''; return; }
  sl.innerHTML = '<div style="background:var(--bg);border:1px solid var(--border2);border-radius:10px;padding:10px">' +
    '<div style="font-size:11px;font-weight:700;color:var(--text2);margin-bottom:7px">⚠️ ' + esc(t('miseq.prob.title')) + '</div>' +
    '<select id="meq-ptipo-' + esc(id) + '" style="' + _eqInp + '">' + MISEQ_PROB_TIPOS.map(x => '<option>' + esc(x) + '</option>').join('') + '</select>' +
    '<input id="meq-pdesc-' + esc(id) + '" maxlength="200" placeholder="' + esc(t('miseq.prob.ph')) + '" style="' + _eqInp + '">' +
    '<button class="pin-change-btn" style="margin-top:2px" onclick="misEqReportProblem(\'' + esc(id) + '\', this)">' + esc(t('miseq.prob.send')) + '</button></div>';
  sl.style.display = 'block';
}
export async function misEqReportProblem(id, btn) {
  const a = (_misEquipos || []).find(x => x.id === id); if (!a) return;
  const tipo = document.getElementById('meq-ptipo-' + id)?.value || '';
  const desc = (document.getElementById('meq-pdesc-' + id)?.value || '').trim();
  if (/[<>]/.test(desc)) { alert(t('eq.err.nota')); return; }
  if (!desc) { alert(t('miseq.prob.err.vacio')); return; }
  const hoy = new Date().toISOString().slice(0, 10);
  // "Otro" no aporta prefijo útil → solo la descripción.
  const texto = (tipo && !tipo.includes('Otro')) ? tipo + ': ' + desc : desc;
  const ev = { f: hoy, t: 'problema', por: M.currentUser?.name || '', n: texto };
  const hist = eqHistParse(a.properties || {}); hist.push(ev);
  const histJson = JSON.stringify(hist.slice(-100));
  btn.disabled = true; btn.textContent = '⏳';
  try {
    await callNotion('pages/' + id, 'PATCH', { properties: { 'Historial equipo': { rich_text: [{ text: { content: histJson } }] } } });
    a.properties['Historial equipo'] = { rich_text: [{ plain_text: histJson, text: { content: histJson } }] };
    showSaving();
    btn.textContent = '✅ ' + t('miseq.saved');
    setTimeout(() => renderMisEquipos(), 1100);
  } catch (e) { alert(t('sheet.alert.save.error2') + e.message); btn.disabled = false; btn.textContent = t('miseq.prob.send'); }
}
export function eqToggleAlta() {
  const f = document.getElementById('eq-alta-form');
  if (!f) return;
  if (f.style.display !== 'none') { f.style.display = 'none'; f.innerHTML = ''; return; }
  f.innerHTML = '<div style="background:var(--card);border:1px solid var(--border2);border-radius:12px;padding:12px">' +
    '<select id="eq-ntipo" style="' + _eqInp + '"><option value="" disabled selected>' + esc(t('eq.f.tipo')) + '</option>' + EQ_TIPOS.map(x => '<option>' + esc(x) + '</option>').join('') + '</select>' +
    '<input id="eq-nnombre" maxlength="80" placeholder="' + esc(t('eq.f.nombre')) + '" style="' + _eqInp + '">' +
    '<input id="eq-nmarca" maxlength="80" placeholder="' + esc(t('eq.f.marca')) + '" style="' + _eqInp + '">' +
    '<input id="eq-nmat" maxlength="40" placeholder="' + esc(t('eq.f.matricula')) + '" style="' + _eqInp + '">' +
    '<button class="pin-change-btn" style="margin-top:2px" onclick="eqAltaSave(this)">' + esc(t('eq.alta.save')) + '</button></div>';
  f.style.display = 'block';
}
export async function eqAltaSave(btn) {
  const tipo = document.getElementById('eq-ntipo')?.value;
  const nombre = (document.getElementById('eq-nnombre')?.value || '').trim();
  const marca = (document.getElementById('eq-nmarca')?.value || '').trim();
  const matricula = (document.getElementById('eq-nmat')?.value || '').trim();
  if (!EQ_TIPOS.includes(tipo)) { alert(t('eq.err.tipo')); return; }
  if (!nombre || /[<>]/.test(nombre + marca + matricula)) { alert(t('eq.err.nota')); return; }
  const short = M.COUNTRY_FINANCE_MAP[M.currentUser?.country] || '🇺🇾 UY';
  const hoy = new Date().toISOString().slice(0, 10);
  const props = {
    'Activo': { title: [{ text: { content: nombre } }] },
    'Tipo': { select: { name: tipo } },
    'Estado': { select: { name: '✅ Operativo' } },
    'País': { select: { name: short } },
    'Historial equipo': { rich_text: [{ text: { content: JSON.stringify([{ f: hoy, t: 'alta', por: M.currentUser?.name || '' }]) } }] },
  };
  if (marca) props['Marca / Modelo'] = { rich_text: [{ text: { content: marca } }] };
  if (matricula) props['Nro. Serie / Matrícula'] = { rich_text: [{ text: { content: matricula } }] };
  btn.disabled = true; btn.textContent = '⏳';
  try {
    await callNotion('pages', 'POST', { parent: { type: 'data_source_id', data_source_id: ACTIVOS_DS_ID }, properties: props });
    showSaving();
    renderCoordEquipos(); // refetch (trae el nuevo con su id real)
  } catch (e) {
    btn.disabled = false; btn.textContent = t('eq.alta.save');
    alert(t('sheet.alert.save.error2') + e.message);
  }
}
export async function fetchEquiposDelServicio(serviceId) {
  if (!serviceId) return [];
  try {
    const data = await callNotion(`databases/${M.RUE_DB_ID}/query`, 'POST', {
      filter: { property: 'Servicio', relation: { contains: serviceId } },
      page_size: 50
    });
    return (data.results || []).map(r => {
      const props = r.properties || {};
      const equipoRel = props['Equipo']?.relation?.[0]?.id || null;
      const titleProp = Object.values(props).find(p => p.type === 'title');
      return {
        rueId: r.id,
        activoId: equipoRel,
        activoName: titleProp?.title?.[0]?.plain_text || '(equipo)',
        archived: r.archived || false
      };
    }).filter(x => !x.archived && x.activoId);
  } catch (e) {
    console.warn('[equipos] fetchEquiposDelServicio error:', e.message);
    return [];
  }
}
export function renderEquiposChips() {
  const container = document.getElementById('edit-equipos-chips');
  if (!container) return;
  if (!M._equiposDelServicio.length) {
    container.innerHTML = `<div class="equipos-empty">${t('equipos.empty')}</div>`;
    return;
  }
  // Lookup name + tipo desde el cache de Activos (si está cargado)
  const byId = new Map((M._activosCache?.items || []).map(a => [a.id, a]));
  container.innerHTML = M._equiposDelServicio.map(e => {
    const a = byId.get(e.activoId);
    const name = a ? a.name : e.activoName;
    const meta = a ? [a.tipo, a.serie ? `S/N ${a.serie}` : '', a.marca].filter(Boolean).join(' · ') : '';
    return `<div class="equipo-chip">
      <div class="equipo-chip-info">
        <div class="equipo-chip-name">${esc(name)}</div>
        ${meta ? `<div class="equipo-chip-meta">${esc(meta)}</div>` : ''}
      </div>
      <button class="equipo-chip-remove" onclick="removeEquipoFromServicio('${esc(e.rueId)}')">${t('equipos.remove')}</button>
    </div>`;
  }).join('');
}
export async function openAddEquipoSheet() {
  if (!M.editingService) return;
  document.getElementById('equipo-overlay').classList.add('open');
  const list = document.getElementById('equipo-options-list');
  list.innerHTML = `<div class="equipos-empty">${t('equipos.loading')}</div>`;
  const activos = await fetchActivosDisponibles();
  const pais = M.editingService.properties?.['País']?.select?.name || '';
  const yaAsignados = new Set(M._equiposDelServicio.map(e => e.activoId));
  // Filtrar por país del servicio si los activos tienen país. Si un activo no
  // tiene país, lo mostramos igual (puede ser equipo compartido entre países).
  const disponibles = activos.filter(a => (!a.pais || !pais || a.pais === pais) && !yaAsignados.has(a.id));
  if (!disponibles.length) {
    list.innerHTML = `<div class="equipos-empty">${t('equipos.none.available')}</div>`;
    return;
  }
  list.innerHTML = disponibles.map(a => {
    const meta = [a.tipo, a.serie ? `S/N ${a.serie}` : '', a.marca].filter(Boolean).join(' · ');
    return `<div class="equipo-option" onclick="addEquipoToServicio('${esc(a.id)}', '${esc(a.name).replace(/'/g, '\\\'')}')">
      <div class="equipo-chip-name">${esc(a.name)}</div>
      ${meta ? `<div class="equipo-chip-meta">${esc(meta)}</div>` : ''}
    </div>`;
  }).join('');
}
export function closeAddEquipoSheet() { document.getElementById('equipo-overlay').classList.remove('open'); }

export async function addEquipoToServicio(activoId, activoName) {
  if (!M.editingService) return;
  const pais = M.editingService.properties?.['País']?.select?.name || '';
  const properties = {
    'Equipo': { relation: [{ id: activoId }] },
    'Servicio': { relation: [{ id: M.editingService.id }] }
  };
  if (pais) properties['País'] = { select: { name: pais } };
  // Persona = piloto asignado si tiene notionId
  const operarioName = M.editingService.properties?.['Operario App']?.select?.name;
  const user = operarioName ? M.USERS.find(u => u.name === operarioName) : null;
  if (user?.notionId) {
    properties['Persona'] = { people: [{ object: 'user', id: user.notionId }] };
  }
  // Fecha programada del servicio
  const fecha = M.editingService.properties?.['Fecha programada']?.date?.start;
  if (fecha) properties['Fecha'] = { date: { start: fecha } };

  closeAddEquipoSheet();
  try {
    const created = await callNotion('pages', 'POST', {
      parent: { database_id: M.RUE_DB_ID },
      properties
    });
    M._equiposDelServicio.push({ rueId: created.id, activoId, activoName, archived: false });
    renderEquiposChips();
  } catch (e) {
    alert((t('equipos.add.error') || 'Error al agregar equipo: ') + e.message);
  }
}
export async function removeEquipoFromServicio(rueId) {
  if (!confirm(t('equipos.remove.confirm'))) return;
  try {
    await callNotion('pages/' + rueId, 'PATCH', { archived: true });
    M._equiposDelServicio = M._equiposDelServicio.filter(e => e.rueId !== rueId);
    renderEquiposChips();
  } catch (e) {
    alert((t('equipos.remove.error') || 'Error al quitar equipo: ') + e.message);
  }
}
