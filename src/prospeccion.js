// ─────────────────────────────────────────────
// PROSPECCIÓN / VENTAS — lista de prospectos, tarjeta, sheet de alta, acciones (contactar/descartar/convertir)
// ─────────────────────────────────────────────
// Rol 🧲 Ventas. Extraído de main.js el 2026-07-16 (patrón puente, como dashboards.js/fotos.js).
// El ESTADO (prospectoState, _coordAllProspectos, _propContactos, currentUser, selectedCountry) queda en main
// y se accede vía M (initProspeccion); las FUNCIONES de main que este módulo llama llegan como alias.

import { t, currentLang } from './i18n.js';
import { esc } from './util.js';
import { callNotion, syncAfterWrite, updateServiceProps } from './api.js';
import { toggleCeoAcc } from './dashboards.js';

let M = {};
export function initProspeccion(bridge) { M = bridge; }

const ORIGEN_LEAD_OPTIONS = ['🧲 Vendedor', '🤝 Referido', '🌐 Web/Redes', '📞 Entrante', '🚶 Puerta fría'];
const INTERES_OPTIONS = ['🏢 Fachada', '🪟 Vidrios', '☀️ Paneles solares'];

// HTML del sheet de alta de prospecto. Los handlers oninput="prospectoState.x=…" resuelven por window
// (prospectoState vive en main y se publica como accesor); el resto del estado se accede vía M.
function buildProspectoSheetBody() {
  const s = M.prospectoState;
  const origenBtns = ORIGEN_LEAD_OPTIONS.map(o => `<button class="estado-btn ${s.origen === o ? 'active' : ''}" onclick="prospectoSetOrigen(this,'${o.replace(/'/g, "\\'")}')">${o}</button>`).join('');
  const interesBtns = INTERES_OPTIONS.map(o => `<button class="multi-toggle-btn ${s.interes.includes(o) ? 'active' : ''}" onclick="prospectoToggleInteres(this,'${o.replace(/'/g, "\\'")}')">${o}</button>`).join('');
  return `<div class="edit-section"><div class="edit-section-label">${t('prosp.sheet.section.empresa')}</div>
      <input type="text" class="edit-date-input" placeholder="${t('prosp.sheet.empresa.placeholder')}" oninput="prospectoState.nombre=this.value" style="font-size:14px"/></div>` +
    `<div class="edit-section"><div class="edit-section-label">${t('prosp.sheet.section.contacto')}</div>
      <input type="text" class="edit-date-input" placeholder="${t('prosp.sheet.contacto.placeholder')}" oninput="prospectoState.persona=this.value"/></div>` +
    `<div class="edit-section"><div class="edit-section-label">${t('sheet.contact.section.tel')}</div>
      <input type="tel" class="edit-date-input" placeholder="${t('sheet.contact.tel.placeholder')}" oninput="prospectoState.tel=this.value"/></div>` +
    `<div class="edit-section"><div class="edit-section-label">${t('sheet.contact.section.email')}</div>
      <input type="email" class="edit-date-input" placeholder="${t('sheet.contact.email.placeholder')}" oninput="prospectoState.email=this.value"/></div>` +
    `<div class="edit-section"><div class="edit-section-label">${t('prosp.sheet.section.mapa')}</div>
      <div style="display:flex;gap:6px;align-items:stretch">
        <input type="url" class="edit-date-input" style="flex:1;margin-bottom:0" placeholder="${t('prosp.sheet.mapa.placeholder')}" oninput="prospectoState.mapa=this.value"/>
        <button type="button" class="estado-btn" style="flex:0 0 auto;white-space:nowrap" onclick="abrirProspectoMapa()">${t('prosp.sheet.mapa.abrir')}</button>
      </div></div>` +
    `<div class="edit-section"><div class="edit-section-label">${t('prosp.sheet.section.origen')}</div><div class="estado-btns">${origenBtns}</div></div>` +
    `<div class="edit-section"><div class="edit-section-label">${t('prosp.sheet.section.interes')}</div><div class="multi-toggle-grid">${interesBtns}</div></div>` +
    `<div class="edit-section"><div class="edit-section-label">${t('prosp.sheet.section.proximo')}</div>
      <input type="date" class="edit-date-input" value="${esc(s.proximo)}" onchange="prospectoState.proximo=this.value"/></div>` +
    `<div class="edit-section" style="padding-bottom:0"><div class="edit-section-label">${t('prosp.sheet.section.nota')}</div>
      <textarea class="edit-date-input" rows="3" style="resize:none;height:80px" placeholder="${t('prosp.sheet.nota.placeholder')}" oninput="prospectoState.nota=this.value"></textarea></div>`;
}

const abrirWhatsAppProspecto = (...a) => M.abrirWhatsAppProspecto(...a);
const cambiarEstadoServicio = (...a) => M.cambiarEstadoServicio(...a);
const cfgRegla = (...a) => M.cfgRegla(...a);
const esDireccion = (...a) => M.esDireccion(...a);
const esVentas = (...a) => M.esVentas(...a);
const markUserActive = (...a) => M.markUserActive(...a);
const openContactSheet = (...a) => M.openContactSheet(...a);
const openNewPropSheet = (...a) => M.openNewPropSheet(...a);

export function renderProspeccionList() {
  const content = document.getElementById('coord-content');
  if (!content) return;
  const newBtn = `<div style="padding:10px 16px 0"><button class="nueva-prop-btn" onclick="openProspectoSheet()">${t('coord.new.prospecto')}</button></div>`;
  if (!M._coordAllProspectos.length) {
    content.innerHTML = newBtn + `<div class="coord-empty">${t('prosp.empty')}</div>`;
    return;
  }
  const activos = M._coordAllProspectos.filter(c => (c.properties?.['Estado']?.select?.name || '') !== '❌ Descartado');
  const descartados = M._coordAllProspectos.filter(c => (c.properties?.['Estado']?.select?.name || '') === '❌ Descartado');

  // Orden de urgencia (spec): 1º Próximo contacto vencido/hoy, 2º por estado (Interesado > Contactado
  // > Prospecto), 3º sin fecha al final de su grupo de urgencia.
  const estadoRank = { '🤝 Interesado': 0, '📵 Prospecto contactado': 1, '🎯 Prospecto': 2 };
  const hoyISO = new Date().toISOString().split('T')[0];
  const urgenciaDe = c => {
    const prox = c.properties?.['Próximo contacto']?.date?.start || '';
    if (!prox) return 2; // sin fecha planificada: al final
    return prox <= hoyISO ? 0 : 1; // vencido/hoy primero, agendado a futuro después
  };
  const sorted = activos.slice().sort((a, b) => {
    const ua = urgenciaDe(a), ub = urgenciaDe(b);
    if (ua !== ub) return ua - ub;
    const ea = estadoRank[a.properties?.['Estado']?.select?.name || ''] ?? 3;
    const eb = estadoRank[b.properties?.['Estado']?.select?.name || ''] ?? 3;
    if (ea !== eb) return ea - eb;
    const pa = a.properties?.['Próximo contacto']?.date?.start || '9999';
    const pb = b.properties?.['Próximo contacto']?.date?.start || '9999';
    return pa.localeCompare(pb);
  });

  // Descartados: colapsados al fondo (mismo patrón acordeón que 😶 Sin respuesta / ❌ Rechazados
  // en la tab Clientes — toggleCeoAcc + .ceo-acc-head/.ceo-acc-body).
  const descartadosHTML = descartados.length
    ? `<div id="prosp-descartados-block">` +
        `<button class="ceo-acc-head" onclick="toggleCeoAcc(this)"><span>${t('prosp.section.descartados')} (${descartados.length})</span><span class="fin-arrow">▾</span></button>` +
        `<div class="ceo-acc-body" style="display:none">${descartados.map(c => prospectoCard(c)).join('')}</div>` +
      `</div>`
    : '';

  content.innerHTML = newBtn + `<div style="height:4px"></div>` +
    sorted.map(c => prospectoCard(c)).join('') +
    descartadosHTML;
}
export function prospectoCard(c) {
  const props = c.properties || {};
  const id = c.id;
  const nombreRaw = props['Nombre / Empresa']?.title?.[0]?.plain_text;
  const nombreHTML = nombreRaw ? esc(nombreRaw) : `<span style="color:#c67e25">⚠️ ${t('common.sinnombre')}</span>`;
  const estado = props['Estado']?.select?.name || '';
  const persona = props['Contacto (persona)']?.rich_text?.[0]?.plain_text || '';
  const origen = props['Origen del lead']?.select?.name || '';
  const interes = (props['Interés']?.multi_select || []).map(s => s.name);
  const proximo = props['Próximo contacto']?.date?.start || '';
  const nota = props['Notas prospección']?.rich_text?.[0]?.plain_text || '';
  const notaTrunc = nota.length > 90 ? nota.slice(0, 90) + '…' : nota;

  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const proxDate = proximo ? new Date(proximo + 'T00:00:00') : null;
  const vencido = !!(proxDate && proxDate.getTime() < hoy.getTime());
  const esHoy = !!(proxDate && proxDate.getTime() === hoy.getTime());
  const proxStyle = vencido ? 'color:var(--red,#e5484d);font-weight:700' : (esHoy ? 'color:#F5A623;font-weight:700' : '');
  const dateLocale = currentLang === 'pt-BR' ? 'pt-BR' : 'es-UY';
  const proxLabel = proximo
    ? new Date(proximo + 'T00:00:00').toLocaleDateString(dateLocale, { day: 'numeric', month: 'short' }) + (vencido ? ' · ' + t('prosp.list.vencido') : (esHoy ? ' · ' + t('prosp.list.hoy') : ''))
    : t('prosp.list.sinfecha');

  const esDescartado = estado === '❌ Descartado';
  // "→ Crear propuesta" solo Coordinador/Dirección (decisión del dueño del producto: Ventas junta y
  // madura, el coord cotiza — desde 2026-07-05 Ventas VE propuestas para seguimiento, pero no las crea).
  const puedeCrearProp = !esVentas() && (esDireccion() || (M.currentUser?.role || '').includes('Coordinador'));
  const telProsp = props['Teléfono / WhatsApp']?.phone_number || '';

  const acciones = esDescartado ? '' : `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">
      ${telProsp ? `<button class="estado-btn" style="color:#25D366;border-color:#25D366" onclick="event.stopPropagation();abrirWhatsAppProspecto('${esc(id)}')">💬 WhatsApp</button>` : ''}
      <button class="estado-btn" onclick="event.stopPropagation();prospAccion('${esc(id)}','contactado')">${t('prosp.action.contactado')}</button>
      <button class="estado-btn" onclick="event.stopPropagation();prospAccion('${esc(id)}','interesado')">${t('prosp.action.interesado')}</button>
      <button class="estado-btn" style="color:var(--red,#e5484d)" onclick="event.stopPropagation();prospAccion('${esc(id)}','descartar')">${t('prosp.action.descartar')}</button>
      ${(estado === '🤝 Interesado' && puedeCrearProp) ? `<button class="estado-btn active" onclick="event.stopPropagation();openNewPropSheet('${esc(id)}')">${t('prosp.action.crearpropuesta')}</button>` : ''}
      ${(estado === '🤝 Interesado') ? `<button class="estado-btn" style="color:var(--green)" onclick="event.stopPropagation();prospAccion('${esc(id)}','cliente')">${t('prosp.action.cliente')}</button>` : ''}
    </div>`;

  return `<div class="contact-card" onclick="openContactSheet('${esc(id)}')">
    <div class="contact-name">${nombreHTML}</div>
    <div class="contact-badges">
      ${estado ? `<span class="contact-estado">${esc(estado)}</span>` : ''}
      ${origen ? `<span class="coord-tag">${esc(origen)}</span>` : ''}
      ${interes.map(i => `<span class="coord-tag">${esc(i)}</span>`).join('')}
    </div>
    ${persona ? `<div class="contact-detail">👤 ${esc(persona)}</div>` : ''}
    <div class="contact-detail" style="${proxStyle}">🗓 ${esc(proxLabel)}</div>
    ${notaTrunc ? `<div class="contact-detail">📝 ${esc(notaTrunc)}</div>` : ''}
    ${acciones}
  </div>`;
}
export async function prospAccion(id, tipo) {
  const c = (M._coordAllProspectos || []).find(x => x.id === id);
  if (!c) return;
  if (tipo === 'descartar' && !confirm(t('prosp.confirm.descartar'))) return;
  if (tipo === 'cliente' && !confirm(t('prosp.confirm.cliente'))) return;
  if (!c.properties) c.properties = {};
  const estadoAnterior = c.properties['Estado']?.select?.name || '';
  const proxAnterior = c.properties['Próximo contacto']?.date?.start || null;

  const props = {};
  if (tipo === 'contactado') {
    // SIEMPRE reprograma el próximo contacto (+cfgRegla('prospectoDias') días); el estado
    // solo AVANZA si estaba recién creado (🎯 Prospecto) — si ya estaba contactado/interesado no retrocede.
    const proxima = new Date(Date.now() + cfgRegla('prospectoDias') * 86400000).toISOString().split('T')[0];
    props['Próximo contacto'] = { date: { start: proxima } };
    if (estadoAnterior === '🎯 Prospecto') props['Estado'] = { select: { name: '📵 Prospecto contactado' } };
  } else if (tipo === 'interesado') {
    props['Estado'] = { select: { name: '🤝 Interesado' } };
  } else if (tipo === 'descartar') {
    props['Estado'] = { select: { name: '❌ Descartado' } };
  } else if (tipo === 'cliente') {
    // Promoción manual: el prospecto pasa a la cartera como cliente activo (sale de Prospección).
    props['Estado'] = { select: { name: '✅ Cliente activo' } };
  } else {
    return;
  }

  Object.entries(props).forEach(([k, v]) => { c.properties[k] = v; });
  // '✅ Cliente activo' NO está en PROSPECCION_ESTADOS → el renderer no lo agruparía en ninguna
  // sección y quedaría colgado como "activo". Lo sacamos de la lista optimista (se lo repone en el
  // catch si el write falla). El resto de acciones dejan un estado que sí es de prospección.
  if (tipo === 'cliente') M._coordAllProspectos = (M._coordAllProspectos || []).filter(x => x.id !== id);
  renderProspeccionList();
  markUserActive();

  try {
    await updateServiceProps(id, props);
    syncAfterWrite(id, 'clientes');
  } catch (e) {
    // Revertir el optimista en error duro + avisar (mismo criterio que cambiarEstadoServicio).
    if (estadoAnterior) c.properties['Estado'] = { select: { name: estadoAnterior } }; else delete c.properties['Estado'];
    if (proxAnterior) c.properties['Próximo contacto'] = { date: { start: proxAnterior } }; else delete c.properties['Próximo contacto'];
    if (tipo === 'cliente' && !(M._coordAllProspectos || []).some(x => x.id === id)) (M._coordAllProspectos = M._coordAllProspectos || []).push(c);
    renderProspeccionList();
    alert(t('prosp.error.accion') + e.message);
  }
}
export function prospectoOverlayClick(e) { if (e.target.id === 'prospecto-overlay') closeProspectoSheet(); }
export function closeProspectoSheet() { document.getElementById('prospecto-overlay').classList.remove('open'); }

export function abrirProspectoMapa() {
  const u = (M.prospectoState.mapa || '').trim();
  if (!u) { alert(t('prosp.sheet.mapa.vacio')); return; }
  const url = /^https?:\/\//i.test(u) ? u : 'https://' + u;
  window.open(url, '_blank', 'noopener');
}
export function openProspectoSheet() {
  const en3dias = new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0];
  M.prospectoState = { nombre: '', persona: '', tel: '', email: '', mapa: '', origen: '', interes: [], proximo: en3dias, nota: '' };
  document.getElementById('prospecto-sheet-body').innerHTML = buildProspectoSheetBody();
  const btn = document.getElementById('prospecto-save-btn');
  btn.textContent = t('btn.create.notion'); btn.disabled = false;
  document.getElementById('prospecto-overlay').classList.add('open');
}
export function prospectoSetOrigen(el, val) {
  if (el.classList.contains('active')) { M.prospectoState.origen = ''; el.classList.remove('active'); return; }
  M.prospectoState.origen = val;
  el.closest('.estado-btns').querySelectorAll('.estado-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
}
export function prospectoToggleInteres(el, val) {
  const arr = M.prospectoState.interes;
  const idx = arr.indexOf(val);
  if (idx === -1) arr.push(val); else arr.splice(idx, 1);
  el.classList.toggle('active', arr.includes(val));
}
export async function saveProspecto() {
  const s = M.prospectoState;
  const nombre = String(s.nombre || '').trim();
  if (!nombre) { alert(t('prosp.sheet.error.empresa')); return; }
  const btn = document.getElementById('prospecto-save-btn');
  btn.textContent = t('btn.saving'); btn.disabled = true;
  try {
    // País del prospecto: el del usuario que lo carga (Ventas/Coordinador son país-aware desde el login).
    const paisNotion = M.COUNTRY_NOTION_MAP[M.currentUser?.country] || M.COUNTRY_NOTION_MAP[M.selectedCountry] || '🇺🇾 Uruguay';
    const props = {
      'Nombre / Empresa': { title: [{ text: { content: nombre } }] },
      'Estado': { select: { name: '🎯 Prospecto' } },
      'País': { select: { name: paisNotion } },
      'Contacto (persona)': { rich_text: s.persona ? [{ text: { content: s.persona } }] : [] },
      'Teléfono / WhatsApp': { phone_number: s.tel || null },
      'Email': { email: s.email || null },
      'Mapa': { url: s.mapa && s.mapa.trim() ? s.mapa.trim() : null },
      'Origen del lead': { select: s.origen ? { name: s.origen } : null },
      'Interés': { multi_select: s.interes.map(n => ({ name: n })) },
      'Próximo contacto': { date: s.proximo ? { start: s.proximo } : null },
      'Notas prospección': { rich_text: s.nota ? [{ text: { content: s.nota } }] : [] },
    };
    const created = await callNotion('pages', 'POST', { parent: { database_id: M.CONTACTOS_DB_ID }, properties: props });
    syncAfterWrite(created?.id, 'clientes');
    // Update optimista: el prospecto recién creado aparece al toque en su lista, sin esperar un refetch.
    if (created?.id) M._coordAllProspectos = [created, ...M._coordAllProspectos];
    M._propContactos = null; // idem selector de cliente en Propuestas: un cliente nuevo debe verse ahí
    closeProspectoSheet();
    renderProspeccionList();
  } catch (e) {
    btn.textContent = t('btn.create.notion'); btn.disabled = false;
    alert(t('sheet.alert.save.error2') + e.message);
  }
}
