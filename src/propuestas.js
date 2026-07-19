// ─────────────────────────────────────────────
// PROPUESTAS — seguimiento comercial (parte 1/2; el sheet de crear/editar va en un corte dedicado).
// Bloque "📞 A contactar hoy" (propuestas esperando respuesta 15+ días, con reloj de vida), marcar
// "Contactado" 1-toque, y WhatsApp asistido desde la propuesta. Extraído de main.js el 2026-07-17
// (patrón puente). El estado de la lista (_coordAllProps) y el sheet (editingProp, renderCoordPropuestasList)
// quedan en main → M. Los onclick de las cards son strings → resuelven por window (gen-globals).
// ─────────────────────────────────────────────
import { t } from './i18n.js';
import { esc } from './util.js';
import { callNotion, syncAfterWrite, updateServiceProps } from './api.js';

let M = {};
export function initPropuestas(bridge) { M = bridge; }

const abrirWhatsApp = (...a) => M.abrirWhatsApp(...a);
const cfgRegla = (...a) => M.cfgRegla(...a);
const cfgWa = (...a) => M.cfgWa(...a);
const renderCoordPropuestasList = (...a) => M.renderCoordPropuestasList(...a);

export function propDias(props) {
  const ui = (props?.['Última interacción']?.date?.start || '').split('T')[0];
  if (ui) {
    const d = Math.floor((Date.now() - new Date(ui + 'T00:00:00').getTime()) / 86400000);
    return d >= 0 ? d : 0;
  }
  return props?.['Días sin respuesta']?.formula?.number ?? null;
}

// Bloque "📞 A contactar hoy" (arriba de la lista de Propuestas del coord): propuestas esperando
// respuesta del cliente hace 15+ días — mismo criterio que loadAlerts()/el cron diario
// (api/cron-pipeline.js): estado en ESPERANDO + días sin respuesta >= 15 (propDias, espejo-safe).
// Devuelve '' si no hay ninguna (no se renderiza bloque vacío).
export function renderContactarHoyHTML() {
  const ESPERANDO = ['📞 Contactado', '📤 Enviada al cliente', '🤝 Negociando'];
  const hoyISO = new Date().toISOString().split('T')[0];
  const items = (M._coordAllProps || []).filter(p => {
    const props = p.properties || {};
    const estado = props['Estado pipeline']?.select?.name || '';
    const dias = propDias(props);
    // Snooze por registro: 'Posponer aviso hasta' futuro = no molestar hasta esa fecha (vuelve sola al vencer).
    const posp = (props['Posponer aviso hasta']?.date?.start || '').split('T')[0];
    if (posp && posp > hoyISO) return false;
    return ESPERANDO.includes(estado) && dias != null && dias >= cfgRegla('pipelineAviso');
  }).sort((a, b) => (propDias(b.properties) || 0) - (propDias(a.properties) || 0));
  if (!items.length) return '';
  // Reloj de VIDA (spec dos-relojes 2026-07-02): días restantes antes de que el cron diario
  // (api/cron-pipeline.js) la mueva sola a 😶 Sin respuesta a los 45, contados desde 'Fecha de envío'
  // (fallback: fecha de creación de la página). NO aplica a Negociando — esa no muere por envío.
  const vidaRestante = (p) => {
    const fechaEnvio = p.properties?.['Fecha de envío']?.date?.start || p.created_time;
    if (!fechaEnvio) return null;
    const diasDesdeEnvio = Math.floor((Date.now() - new Date(fechaEnvio).getTime()) / 86400000);
    return Math.max(0, cfgRegla('pipelineSinRespuesta') - diasDesdeEnvio);
  };
  // Tier de urgencia ("por vencer", rojo): Contactado/Enviada se re-ancla a la VIDA restante (≤5d);
  // Negociando (sin reloj de vida) mantiene el criterio de siempre — 40+ días sin respuesta.
  const esVencer = (p) => {
    const estado = p.properties?.['Estado pipeline']?.select?.name || '';
    if (estado.includes('Negociando')) return (propDias(p.properties) || 0) >= 40;
    const vida = vidaRestante(p);
    return vida != null && vida <= 5;
  };
  const vencerCount = items.filter(esVencer).length;
  const rows = items.map(p => {
    const props = p.properties || {};
    const nombre = props['Nombre de propuesta']?.title?.[0]?.plain_text || t('common.sinnombre');
    const estado = props['Estado pipeline']?.select?.name || '';
    const dias = propDias(props);
    const negociando = estado.includes('Negociando');
    const vencido = esVencer(p);
    // Negociando: sin reloj de vida — muestra solo la línea de seguimiento, igual que siempre.
    // Contactado/Enviada: suma "☠️ quedan Nd" (vida restante), siempre visible en estos estados.
    const vida = negociando ? null : vidaRestante(p);
    const extraLinea = negociando
      ? (vencido ? ' · ⚠️ ' + t('coord.prop.contactar.vencer') : '')
      : (vida != null ? ' · ☠️ ' + t('coord.prop.contactar.vida').replace('{n}', vida) : '');
    const estadoClass = negociando ? 'negociando' : estado.toLowerCase().includes('enviada') ? 'enviada' : '';
    const idAttr = esc(p.id);
    return `<div class="prop-card compact${vencido ? ' vencer' : ''}">
      <div class="prop-nombre">${esc(nombre)}</div>
      <div class="prop-dias alert${vencido ? ' vencer' : ''}"><span class="prop-estado ${estadoClass}">${esc(estado)}</span> · ${dias}${t('coord.prop.days.suffix')}${extraLinea}</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        <button class="estado-btn prop-compact-btn" style="color:#25D366;border-color:#25D366" onclick="abrirWhatsAppProp('${idAttr}')">💬 WhatsApp</button>
        <button class="estado-btn active prop-compact-btn" id="contactar-btn-${idAttr}" onclick="marcarPropContactada('${idAttr}')">${t('coord.prop.contactar.btn')}</button>
      </div>
    </div>`;
  }).join('');
  const countSuffix = ' (' + items.length + ')' + (vencerCount ? ' · ' + vencerCount + ' ⚠️' : '');
  // Desplegable (colapsado por defecto): el header muestra el contador; al tocarlo se abren las cards.
  return `<div id="coord-contactar-block">`
    + `<button class="ceo-acc-head${vencerCount ? ' warn' : ''}" onclick="toggleContactarHoy(this)"><span>${t('coord.prop.contactar.title')}${countSuffix}</span><span class="fin-arrow">▾</span></button>`
    + `<div class="ceo-acc-body" id="contactar-hoy-body" style="display:none">` + rows + '<div style="height:4px"></div></div>'
    + '</div>';
}
export function toggleContactarHoy(el) {
  const body = document.getElementById('contactar-hoy-body');
  if (!body) return;
  const abrir = body.style.display === 'none';
  body.style.display = abrir ? 'block' : 'none';
  const arrow = el.querySelector('.fin-arrow');
  if (arrow) arrow.textContent = abrir ? '▴' : '▾';
}
// Abre el desplegable (idempotente) — lo usa el deep-link de la alerta "para re-contactar".
export function openContactarHoy() {
  const body = document.getElementById('contactar-hoy-body');
  if (body) body.style.display = 'block';
  const arrow = document.querySelector('#coord-contactar-block .fin-arrow');
  if (arrow) arrow.textContent = '▴';
}

// Botón «📞 Contactado» del bloque "A contactar hoy": registra el contacto de HOY escribiendo
// 'Última interacción' (mismo patrón hoyISO que openNewServiceSheet) — 1 tap, sin abrir el sheet.
// Núcleo compartido (2026-07-09): marca 'Última interacción' = hoy en una propuesta, espeja al mirror
// (syncAfterWrite) y actualiza el registro en memoria (para que el bloque "A contactar hoy" / la alerta se
// recalculen sin esperar la fórmula de Notion). Lo usan el botón 1-toque de la card compacta
// (marcarPropContactada) Y el botón "Recontacté hoy" del sheet → una sola fuente de verdad, todo sincronizado.
export async function patchPropUltimaInteraccionHoy(id) {
  const today = new Date();
  const hoyISO = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  await callNotion('pages/' + id, 'PATCH', { properties: { 'Última interacción': { date: { start: hoyISO } } } });
  if (typeof syncAfterWrite === 'function') { try { syncAfterWrite(id, 'propuestas'); } catch (_) {} }
  const p = (M._coordAllProps || []).find(x => x.id === id);
  if (p) {
    p.properties = p.properties || {};
    p.properties['Última interacción'] = { date: { start: hoyISO } };
    p.properties['Días sin respuesta'] = { formula: { number: 0 } };
  }
  return hoyISO;
}

export async function marcarPropContactada(id) {
  const btn = document.getElementById('contactar-btn-' + id);
  if (!btn || btn.disabled) return;
  btn.disabled = true;
  const prevText = btn.textContent;
  btn.textContent = '⏳';
  try {
    await patchPropUltimaInteraccionHoy(id);
    renderCoordPropuestasList(true);
  } catch (e) {
    btn.disabled = false;
    btn.textContent = prevText;
    alert(t('sheet.alert.save.error2') + e.message);
  }
}

// Desde una propuesta ("A contactar hoy" o el sheet): resuelve el teléfono vía la relación Contacto
// (1 fetch por contacto, cacheado en memoria). Para Ventas el backstop del proxy permite el GET
// (pages/{id} de un contacto). El saludo usa el Interlocutor de la ficha si existe.
const _waContactCache = {};
export async function abrirWhatsAppProp(propId) {
  const p = (M._coordAllProps || []).find(x => x.id === propId) || (M.editingProp && M.editingProp.id === propId ? M.editingProp : null);
  if (!p) return;
  const props = p.properties || {};
  const contactId = props['Contacto']?.relation?.[0]?.id;
  const propNombre = props['Nombre de propuesta']?.title?.[0]?.plain_text || '';
  if (!contactId) { alert(t('wa.sin.tel')); return; }
  try {
    if (!_waContactCache[contactId]) _waContactCache[contactId] = await callNotion('pages/' + contactId, 'GET');
    const c = _waContactCache[contactId];
    const tel = c?.properties?.['Teléfono / WhatsApp']?.phone_number || '';
    const pais = c?.properties?.['País']?.select?.name || props['País']?.select?.name || '';
    const persona = c?.properties?.['Interlocutor']?.rich_text?.[0]?.plain_text || '';
    const msg = cfgWa('prop').replace('{n}', persona ? ' ' + persona : '').replace('{prop}', () => propNombre);
    abrirWhatsApp(tel, pais, msg);
  } catch (e) { alert(t('wa.sin.tel')); }
}

// ─────────────────────────────────────────────
// PARTE 2 — EL SHEET de propuesta (2026-07-17): crear/editar/borrar, selector de cliente compartido,
// botones "crear servicio/prueba/relevamiento desde la propuesta" y "Recontacté hoy". El estado que tocan
// handlers inline (propEditState, editingProp) queda en main → M; propSheetMode y el modo create/edit son
// propios del módulo. _propContactos queda en main (lo comparte prospección).
// ─────────────────────────────────────────────
let propSheetMode = 'edit';

const esVentas = (...a) => M.esVentas(...a);
const openContactSheet = (...a) => M.openContactSheet(...a);
const openEditSheet = (...a) => M.openEditSheet(...a);
const renderCoordList = (...a) => M.renderCoordList(...a);
const renderCoordPropuestas = (...a) => M.renderCoordPropuestas(...a);
const renderCoordPruebas = (...a) => M.renderCoordPruebas(...a);
const renderCoordRelevamientos = (...a) => M.renderCoordRelevamientos(...a);
const renderCoordServicios = (...a) => M.renderCoordServicios(...a);
const setCoordTab = (...a) => M.setCoordTab(...a);

export function propClienteInputsHTML() {
  const s = M.propEditState;
  const esNuevo = !s.clienteSel || s.clienteSel === '__new__';
  const inp = (ph, key, type) => `<input type="${type}" class="edit-date-input" style="margin-top:6px" placeholder="${ph}" value="${esc(s[key] || '')}" oninput="propEditState.${key}=this.value"/>`;
  return (esNuevo ? inp('Nombre del cliente', 'nombreCliente', 'text') : '') +
    inp('📞 Teléfono / WhatsApp', 'tel', 'tel') +
    inp('✉️ Email', 'email', 'email') +
    `<div style="font-size:11px;color:var(--text3);margin-top:4px">${esNuevo ? 'Se crea el cliente con estos datos.' : 'Tel/email se guardan en la ficha del cliente.'}</div>`;
}
export function propClienteSectionHTML() {
  return `<div class="edit-section"><div class="edit-section-label">👤 Cliente</div>
    <select id="prop-cliente-select" class="edit-date-input" onchange="propClienteChanged(this.value)">
      <option value="__new__">➕ Nuevo cliente</option>
      <option value="" disabled>cargando clientes…</option>
    </select>
    <div id="prop-cliente-fields">${propClienteInputsHTML()}</div>
    <button type="button" onclick="verClienteDesdePropuesta()" style="background:none;border:none;color:var(--accent,#00C98D);font-size:12px;text-decoration:underline;cursor:pointer;padding:6px 0">${t('sheet.prop.vercliente')}</button></div>`;
}
// R3: abrir la ficha del cliente vinculado a la propuesta (cerrar prop-sheet → delay → abrir contact-sheet).
export function verClienteDesdePropuesta() {
  const id = M.propEditState?.clienteSel;
  if (!id || id === '__new__') { alert(t('sheet.prop.vercliente.none')); return; }
  closePropSheet();
  setTimeout(() => openContactSheet(id), 250);
}
export function propClienteChanged(val) {
  M.propEditState.clienteSel = val || '__new__';
  if (val && val !== '__new__') {
    const c = (M._propContactos || []).find(x => x.id === val);
    if (c) {
      M.propEditState.nombreCliente = c.properties?.['Nombre / Empresa']?.title?.[0]?.plain_text || '';
      M.propEditState.tel = c.properties?.['Teléfono / WhatsApp']?.phone_number || '';
      M.propEditState.email = c.properties?.['Email']?.email || '';
    }
  } else {
    M.propEditState.nombreCliente = ''; M.propEditState.tel = ''; M.propEditState.email = '';
  }
  const w = document.getElementById('prop-cliente-fields');
  if (w) w.innerHTML = propClienteInputsHTML();
}
export async function loadPropContactos() {
  try {
    if (!M._propContactos) {
      // Preferir la lista fresca en memoria (refreshContactsView la mantiene al día e incluye clientes
      // recién creados desde el CRM). Fallback al query si todavía no se cargó la vista de clientes.
      // Mismo patrón que loadContactIntermediarios — así un cliente nuevo aparece sin recargar la app.
      if (Array.isArray(M._coordAllContacts) && M._coordAllContacts.length) {
        M._propContactos = M._coordAllContacts;
      } else {
        const d = await callNotion(`databases/${M.CONTACTOS_DB_ID}/query`, 'POST', { sorts: [{ property: 'Nombre / Empresa', direction: 'ascending' }] });
        M._propContactos = d.results || [];
      }
    }
    const sel = document.getElementById('prop-cliente-select');
    if (!sel) return;
    const cur = M.propEditState.clienteSel || '__new__';
    const tit = c => c.properties?.['Nombre / Empresa']?.title?.[0]?.plain_text || '(sin nombre)';
    const estadoC = c => c.properties?.['Estado']?.select?.name || '';
    // '❌ Descartado' no se ofrece como cliente cotizable (salvo que ya venga prefillado, ej. un
    // deep-link viejo) — el resto de los estados de prospección (🎯/📵/🤝) sí quedan disponibles,
    // el coord legítimamente cotiza un 🤝 Interesado vía "→ Crear propuesta".
    sel.innerHTML = '<option value="__new__">➕ Nuevo cliente</option>' +
      M._propContactos.slice()
        .filter(c => estadoC(c) !== '❌ Descartado' || c.id === cur)
        .sort((a, b) => tit(a).localeCompare(tit(b)))
        .map(c => `<option value="${esc(c.id)}">${esc(tit(c))}</option>`).join('');
    sel.value = cur;
    if (cur !== '__new__') propClienteChanged(cur); // prefill tel/email del cliente ya linkeado
  } catch (e) { /* el form sirve igual (queda solo "Nuevo cliente") */ }
}

// prefillContactId (spec 2026-07-02 B2): abrir la propuesta con un cliente YA elegido — lo usa el

// botón "→ Crear propuesta" de un prospecto 🤝 Interesado (solo Coordinador/Dirección; Ventas no
// crea propuestas). Sin argumento se comporta exactamente igual que antes ("➕ Nuevo cliente").
export function openNewPropSheet(prefillContactId = null) {
  propSheetMode = 'create';
  M.editingProp = null;
  M.propEditState = { nombre: '', estado: '🆕 Nuevo lead', pais: '🇺🇾 Uruguay', tipo: '', aprobacion: '⏳ Pendiente', importe: '', moneda: '🇺🇾 UY$', fechaEnvio: '', ultimaInt: new Date().toISOString().split('T')[0], obs: '', serviciosAnio: '', comision: '', clienteSel: prefillContactId || '__new__', nombreCliente: '', tel: '', email: '' };

  document.getElementById('prop-sheet-title').textContent = t('sheet.prop.title.nueva');
  document.getElementById('prop-sheet-sub').textContent = t('sheet.prop.subtitle.nueva');

  const PIPELINE = ['🆕 Nuevo lead','📞 Contactado','🔍 Relevamiento','⏳ En preparación','✅ Aprobada internamente','📤 Enviada al cliente','🤝 Negociando','✅ Aceptada','❌ Rechazada','😶 Sin respuesta','🔄 Reactivo'];
  const PAISES = ['🇺🇾 Uruguay','🇧🇷 Brasil','🇵🇦 Panamá','🇬🇹 Guatemala','🇲🇽 México'];
  const TIPOS = ['📌 Puntual','🔄 Recurrente'];
  const APROBACIONES = ['⏳ Pendiente','✅ Aprobada','🔁 Revisar'];

  function btnGroup(label, key, options) {
    return `<div class="edit-section"><div class="edit-section-label">${label}</div><div class="estado-btns">${
      options.map(o => `<button class="estado-btn ${M.propEditState[key] === o ? 'active' : ''}" onclick="propSetField('${key}',this,'${o.replace(/'/g,"\\'")}')">${o}</button>`).join('')
    }</div></div>`;
  }

  document.getElementById('prop-sheet-body').innerHTML =
    `<div class="edit-section"><div class="edit-section-label">${t('sheet.prop.section.nombre')}</div>
      <input type="text" class="edit-date-input" placeholder="${t('sheet.prop.nombre.placeholder')}" oninput="propEditState.nombre=this.value" style="font-size:14px"/></div>` +
    propClienteSectionHTML() +
    btnGroup(t('sheet.prop.section.estado'), 'estado', PIPELINE) +
    btnGroup(t('sheet.prop.section.pais'), 'pais', PAISES) +
    btnGroup(t('sheet.prop.section.tipo'), 'tipo', TIPOS) +
    btnGroup(t('sheet.prop.section.aprobacion'), 'aprobacion', APROBACIONES) +
    `<div class="edit-section"><div class="edit-section-label">${t('sheet.prop.section.importe')}</div>
      <div style="display:flex;gap:8px;align-items:center">
        <input type="number" id="prop-importe-input" class="edit-date-input" placeholder="${t('sheet.prop.importe.placeholder')}" step="100" style="flex:1" oninput="propEditState.importe=this.value"/>
        ${['🇺🇾 UY$','🇺🇸 USD'].map(m => `<button type="button" class="estado-btn ${(M.propEditState.moneda||'🇺🇾 UY$')===m?'active':''}" style="flex:none;padding:9px 10px" onclick="propSetMoneda(this,'${m}')">${m}</button>`).join('')}
        <button type="button" onclick="calcularPrecioPropuesta()" title="${t('calc.title')}" style="flex:none;background:var(--card);border:1px solid var(--border2);border-radius:9px;color:var(--text2);font-size:13px;padding:9px 12px;cursor:pointer;font-family:'Exo 2',sans-serif">🧮</button>
      </div></div>` +
    `<div class="edit-section"><div class="edit-section-label">🔄 Contrato recurrente (si aplica)</div>
      <input type="number" class="edit-date-input" placeholder="Servicios por año (ej. 6)" value="${M.propEditState.serviciosAnio ?? ''}" oninput="propEditState.serviciosAnio=this.value"/>
      <input type="number" class="edit-date-input" style="margin-top:6px" placeholder="Comisión % del intermediario (ej. 10)" value="${M.propEditState.comision ?? ''}" oninput="propEditState.comision=this.value"/></div>` +
    `<div class="edit-section"><div class="edit-section-label">${t('sheet.prop.section.fechaenvio')}</div>
      <input type="date" class="edit-date-input" onchange="propEditState.fechaEnvio=this.value"/></div>` +
    `<div class="edit-section"><div class="edit-section-label">${t('sheet.prop.section.ultimaint')}</div>
      <input type="date" class="edit-date-input" value="${M.propEditState.ultimaInt}" onchange="propEditState.ultimaInt=this.value"/></div>` +
    `<div class="edit-section" style="padding-bottom:0"><div class="edit-section-label">${t('sheet.prop.section.obs')}</div>
      <textarea class="edit-date-input" rows="3" style="resize:none;height:80px" placeholder="${t('sheet.prop.obs.placeholder')}" oninput="propEditState.obs=this.value"></textarea></div>`;

  const btn = document.getElementById('prop-save-btn');
  btn.textContent = t('btn.create.notion');
  btn.disabled = false;
  // En modo "create" no se muestra eliminar ni el PDF (la propuesta no existe aún)
  const delBtn = document.getElementById('delete-prop-btn');
  if (delBtn) delBtn.style.display = 'none';
  const pdfBtn = document.getElementById('prop-pdf-btn');
  if (pdfBtn) pdfBtn.style.display = 'none';
  document.getElementById('prop-overlay').classList.add('open');
  loadPropContactos();
}

export function openPropSheet(pageId) {
  propSheetMode = 'edit';
  M.editingProp = M._coordAllProps.find(p => p.id === pageId);
  if (!M.editingProp) return;
  const props = M.editingProp.properties || {};
  const nombre = props['Nombre de propuesta']?.title?.[0]?.plain_text || t('common.sinnombre');
  const estado = props['Estado pipeline']?.select?.name || '';
  const pais = props['País']?.select?.name || '';
  const tipo = props['Tipo']?.select?.name || '';
  const aprobacion = props['Aprobación interna']?.select?.name || '';
  const importe = props['Importe estimado']?.number ?? '';
  // G1 (visión finanzas 19/07): la MONEDA de la propuesta por fin editable — el campo existía en la base
  // pero la app nunca lo mostró y todo se asumía USD (Por cobrar heredaba el error). Default por país.
  const monedaProp = props['Moneda']?.select?.name || (pais.includes('Uruguay') ? '🇺🇾 UY$' : '🇺🇸 USD');
  const fechaEnvio = props['Fecha de envío']?.date?.start || '';
  // Normalizamos a YYYY-MM-DD: automatizaciones/crons escriben datetime completo ("2026-07-02T09:00:00-03:00")
  // y eso rompía el <input type="date"> (quedaba vacío) y el render de la card ("Invalid Date").
  const ultimaInt = (props['Última interacción']?.date?.start || '').split('T')[0];
  const obs = props['Observaciones']?.rich_text?.[0]?.plain_text || '';
  const serviciosAnio = props['Servicios por año']?.number ?? '';
  const comision = props['Comisión %']?.number ?? '';
  const clienteSel = props['Contacto']?.relation?.[0]?.id || '__new__';
  const mapaProp = props['Mapa']?.url || '';
  // El campo se muestra SOLO si la property ya existe en el esquema (las páginas de Notion traen TODAS las
  // properties del schema, aunque estén vacías) → si falta la clave, esconder el input evita un PATCH con
  // property desconocida (Notion rechazaría el guardado ENTERO con 400). Al crearla, aparece solo.
  const posponerExiste = ('Posponer aviso hasta' in props);
  const posponerHasta = (props['Posponer aviso hasta']?.date?.start || '').split('T')[0];

  M.propEditState = { estado, pais, tipo, aprobacion, importe, moneda: monedaProp, fechaEnvio, ultimaInt, obs, serviciosAnio, comision, clienteSel, nombreCliente: '', tel: '', email: '', mapa: mapaProp, posponerHasta, _posponerHastaOrig: posponerHasta };
  // F1 (escribir SOLO lo cambiado): snapshot de originales → al guardar no se re-escribe un campo que el usuario no
  // tocó (evita el echo-back que pisaría datos cuando propuestas pase a Supabase-first). Números como String() para
  // comparar sin falsos "cambió" por number-vs-string del input.
  Object.assign(M.propEditState, {
    _estadoOrig: estado, _paisOrig: pais, _tipoOrig: tipo, _aprobacionOrig: aprobacion,
    _importeOrig: String(importe ?? ''), _monedaOrig: monedaProp, _serviciosAnioOrig: String(serviciosAnio ?? ''), _comisionOrig: String(comision ?? ''),
    _fechaEnvioOrig: fechaEnvio, _ultimaIntOrig: ultimaInt, _obsOrig: obs, _mapaOrig: mapaProp,
  });

  document.getElementById('prop-sheet-title').textContent = nombre;
  document.getElementById('prop-sheet-sub').textContent = pais || t('sheet.prop.subtitle.default');

  const PIPELINE = ['🆕 Nuevo lead','📞 Contactado','🔍 Relevamiento','⏳ En preparación','✅ Aprobada internamente','📤 Enviada al cliente','🤝 Negociando','✅ Aceptada','❌ Rechazada','😶 Sin respuesta','🔄 Reactivo'];
  const PAISES = ['🇺🇾 Uruguay','🇧🇷 Brasil','🇵🇦 Panamá','🇬🇹 Guatemala','🇲🇽 México'];
  const TIPOS = ['📌 Puntual','🔄 Recurrente'];
  const APROBACIONES = ['⏳ Pendiente','✅ Aprobada','🔁 Revisar'];

  function btnGroup(label, key, options) {
    return `<div class="edit-section"><div class="edit-section-label">${label}</div><div class="estado-btns">${
      options.map(o => `<button class="estado-btn ${M.propEditState[key] === o ? 'active' : ''}" onclick="propSetField('${key}',this,'${o.replace(/'/g,"\\'")}')">${o}</button>`).join('')
    }</div></div>`;
  }

  document.getElementById('prop-sheet-body').innerHTML =
    propClienteSectionHTML() +
    `<div class="edit-section" style="padding-bottom:0;display:flex;gap:8px">
      <button class="estado-btn" data-wa-btn="1" style="flex:1;color:#25D366;border-color:#25D366" onclick="abrirWhatsAppProp('${pageId}')">💬 ${t('wa.btn')}</button>
      <button class="estado-btn" data-wa-btn="1" style="flex:1;color:var(--blue);border-color:var(--blue)" onclick="recontacteHoyDesdeSheet('${pageId}', this)">📞 ${t('sheet.prop.recontacte')}</button>
    </div>` +
    btnGroup(t('sheet.prop.section.estado'), 'estado', PIPELINE) +
    btnGroup(t('sheet.prop.section.pais'), 'pais', PAISES) +
    btnGroup(t('sheet.prop.section.tipo'), 'tipo', TIPOS) +
    btnGroup(t('sheet.prop.section.aprobacion'), 'aprobacion', APROBACIONES) +
    `<div class="edit-section"><div class="edit-section-label">${t('sheet.prop.section.importe')}</div>
      <div style="display:flex;gap:8px;align-items:center">
        <input type="number" id="prop-importe-input" class="edit-date-input" value="${importe}" placeholder="${t('sheet.prop.importe.placeholder')}" step="100" style="flex:1" oninput="propEditState.importe=this.value"/>
        ${['🇺🇾 UY$','🇺🇸 USD'].map(m => `<button type="button" class="estado-btn ${(M.propEditState.moneda||'🇺🇾 UY$')===m?'active':''}" style="flex:none;padding:9px 10px" onclick="propSetMoneda(this,'${m}')">${m}</button>`).join('')}
        <button type="button" onclick="calcularPrecioPropuesta()" title="${t('calc.title')}" style="flex:none;background:var(--card);border:1px solid var(--border2);border-radius:9px;color:var(--text2);font-size:13px;padding:9px 12px;cursor:pointer;font-family:'Exo 2',sans-serif">🧮</button>
      </div></div>` +
    `<div class="edit-section"><div class="edit-section-label">🔄 Contrato recurrente (si aplica)</div>
      <input type="number" class="edit-date-input" placeholder="Servicios por año (ej. 6)" value="${serviciosAnio}" oninput="propEditState.serviciosAnio=this.value"/>
      <input type="number" class="edit-date-input" style="margin-top:6px" placeholder="Comisión % del intermediario (ej. 10)" value="${comision}" oninput="propEditState.comision=this.value"/></div>` +
    `<div class="edit-section"><div class="edit-section-label">${t('sheet.prop.section.fechaenvio')}</div>
      <input type="date" class="edit-date-input" value="${fechaEnvio}" onchange="propEditState.fechaEnvio=this.value"/></div>` +
    `<div class="edit-section"><div class="edit-section-label">${t('sheet.prop.section.ultimaint')}</div>
      <input type="date" id="prop-ultimaint-input" class="edit-date-input" value="${ultimaInt}" onchange="propEditState.ultimaInt=this.value"/></div>` +
    (posponerExiste ? `<div class="edit-section"><div class="edit-section-label">${t('sheet.prop.section.posponer')}</div>
      <div class="edit-section-hint" style="font-size:11px;color:var(--text3);margin-bottom:6px">${t('sheet.prop.posponer.hint')}</div>
      <input type="date" class="edit-date-input" value="${posponerHasta}" onchange="propEditState.posponerHasta=this.value"/></div>` : '') +
    `<div class="edit-section"><div class="edit-section-label">${t('sheet.prop.section.obs')}</div>
      <textarea class="edit-date-input" rows="3" style="resize:none;height:80px" placeholder="${t('sheet.prop.obs.placeholder')}" oninput="propEditState.obs=this.value">${esc(obs || '')}</textarea></div>` +
    `<div class="edit-section" id="prop-ubicacion-override-box" data-override="${mapaProp ? '1' : '0'}">
      <button type="button" onclick="togglePropUbicacionOverride()" style="background:none;border:none;color:var(--text3);font-size:11px;text-decoration:underline;cursor:pointer;padding:2px 0">${t('sheet.prop.ubicacion.override')}</button>
      ${mapaProp ? `<div class="prop-override-content"><div class="edit-section-label" style="margin-top:8px">${t('sheet.prop.ubicacion.override.label')}</div>
       <div class="edit-section-hint" style="font-size:11px;color:var(--text3);margin-bottom:6px">${t('sheet.prop.ubicacion.override.hint')}</div>
       <input type="url" class="edit-date-input" placeholder="https://maps.app.goo.gl/..." value="${esc(mapaProp)}" oninput="propEditState.mapa=this.value"/></div>` : ''}
     </div>` +
    `<div class="edit-section" id="create-relev-section" style="padding-bottom:0;display:none">
      <button class="create-relev-btn" id="create-relev-btn" onclick="createRelevamientoFromPropuesta('${pageId}')"></button>
     </div>` +
    `<div class="edit-section" id="create-prueba-section" style="padding-bottom:0;display:none">
      <button class="create-prueba-btn" id="create-prueba-btn" onclick="createPruebaFromPropuesta('${pageId}')"></button>
     </div>` +
    `<div class="edit-section" id="create-svc-section" style="padding-bottom:0;display:none">
      <button class="create-svc-btn" id="create-svc-btn" onclick="createServicioFromPropuesta('${pageId}')"></button>
     </div>`;

  // Los botones aparecen/desaparecen según el estado pipeline (reactivo a cambios dentro del sheet)
  updateCreateSvcBtnVisibility();

  // Rol 🧲 Ventas — propuestas en modo VER + SEGUIMIENTO (decisión Diego 2026-07-05): lee todo y
  // puede abrir WhatsApp (data-wa-btn queda activo), pero NO edita campos ni crea/elimina. Mismo
  // patrón soloLectura que la ficha de contacto (openContactSheet). El backstop del proxy además
  // solo le acepta PATCH de 'Última interacción' — esto es la capa UI.
  const propSoloLectura = esVentas();
  if (propSoloLectura) {
    const bodyEl = document.getElementById('prop-sheet-body');
    bodyEl.querySelectorAll('input, select, textarea').forEach(el => { el.disabled = true; });
    bodyEl.querySelectorAll('.estado-btn').forEach(el => {
      if (el.dataset.waBtn) return; // el botón 💬 WhatsApp es acción de seguimiento, no edición
      el.style.pointerEvents = 'none'; el.style.opacity = '0.6';
    });
    // Sin selector de cartera (no cargar todos los clientes como <option> para Ventas)
    const cliSel = document.getElementById('prop-cliente-select');
    const cliSec = cliSel && cliSel.closest('.edit-section');
    if (cliSec) cliSec.style.display = 'none';
    ['create-relev-section', 'create-prueba-section', 'create-svc-section', 'prop-ubicacion-override-box'].forEach(sid => {
      const s = document.getElementById(sid); if (s) s.style.display = 'none';
    });
  }

  const btn = document.getElementById('prop-save-btn');
  btn.textContent = t('btn.save.notion');
  btn.disabled = false;
  btn.style.display = propSoloLectura ? 'none' : '';
  const delPropBtn = document.getElementById('delete-prop-btn');
  if (delPropBtn) {
    delPropBtn.style.display = propSoloLectura ? 'none' : '';
    delPropBtn.textContent = '🗑️ ' + t('sheet.prop.delete');
    delPropBtn.disabled = false;
  }
  // Botón "📄 Generar propuesta PDF": visible en TODOS los roles que abren el sheet (incluida Ventas —
  // generar el PDF es solo-lectura, no escribe en Notion). Requiere que la propuesta tenga importe.
  const pdfBtn = document.getElementById('prop-pdf-btn');
  if (pdfBtn) {
    const tieneImporte = (M.editingProp?.properties?.['Importe estimado']?.number) != null;
    pdfBtn.style.display = (M.editingProp && M.editingProp.id && tieneImporte) ? 'block' : 'none';
    pdfBtn.disabled = false;
  }
  document.getElementById('prop-overlay').classList.add('open');
  if (!propSoloLectura) loadPropContactos();
}

export async function deletePropuesta() {
  if (esVentas()) return; // Ventas: solo lectura + seguimiento — nunca elimina
  if (!M.editingProp) return;
  const props = M.editingProp.properties || {};
  const nombre = props['Nombre de propuesta']?.title?.[0]?.plain_text || t('common.sinnombre');
  const servCount = (props['Servicios']?.relation || []).length;

  // Si tiene servicios vinculados, avisar — el archive de la propuesta NO afecta a los servicios
  const confirmMsg = servCount > 0
    ? t('sheet.prop.delete.confirm.with.svc').replace('{name}', nombre).replace('{n}', servCount)
    : t('sheet.prop.delete.confirm').replace('{name}', nombre);
  if (!confirm(confirmMsg)) return;

  const btn = document.getElementById('delete-prop-btn');
  if (btn) { btn.textContent = '⏳ ' + t('sheet.prop.deleting'); btn.disabled = true; }
  try {
    await callNotion('pages/' + M.editingProp.id, 'PATCH', { in_trash: true });
    closePropSheet();
    await renderCoordPropuestas();
  } catch (e) {
    if (btn) { btn.textContent = '🗑️ ' + t('sheet.prop.delete'); btn.disabled = false; }
    alert(t('sheet.prop.delete.error') + ' ' + e.message);
  }
}

export async function linkServicioEnPropuesta(prop, svcId) {
  try {
    const rel = (prop.properties?.['Servicios']?.relation || []).map(r => ({ id: r.id }));
    if (!rel.some(r => r.id === svcId)) rel.push({ id: svcId });
    prop.properties['Servicios'] = { relation: rel }; // solo memoria — NUNCA escribir esta relación
  } catch (_) { /* best-effort */ }
}
// ¿La propuesta tiene al menos un servicio creado? Mira la relación (congelada al flip pero con lo
// histórico) + los servicios en memoria (frescos del espejo: su property 'Propuesta' la escribe la app).
export function propTieneServicio(propId, props) {
  if ((props?.['Servicios']?.relation || []).length > 0) return true;
  const nid = String(propId || '').replace(/-/g, ''); // normalizar (patrón norm() del resto del archivo)
  return Array.isArray(M._coordAllServices) && M._coordAllServices.some(s =>
    (s.properties?.['Propuesta']?.relation || []).some(r => String(r.id || '').replace(/-/g, '') === nid));
}

export async function createServicioFromPropuesta(propPageId) {
  const prop = (M.editingProp && M.editingProp.id === propPageId) ? M.editingProp : M._coordAllProps?.find(p => p.id === propPageId);
  if (!prop) { alert('Propuesta no encontrada en memoria. Recargá la lista.'); return; }
  const pp = prop.properties || {};
  const nombrePropuesta = pp['Nombre de propuesta']?.title?.[0]?.plain_text || t('common.sinnombre');
  const pais = pp['País']?.select?.name || '';
  const tipo = pp['Tipo']?.select?.name || '';
  const contactRel = pp['Contacto']?.relation?.[0]?.id;

  // G3 (visión finanzas): aviso SUAVE si la propuesta no tiene importe — el servicio nacería sin precio
  // y caería en Por cobrar como "sin precio". Se puede seguir igual (confirm), pero queda avisado.
  if (!(pp['Importe estimado']?.number > 0) && !confirm(t('prop.create.sinprecio.confirm'))) return;

  const btn = document.getElementById('create-svc-btn');
  if (btn) { btn.textContent = '⏳ ' + t('sheet.prop.creating.svc'); btn.disabled = true; }

  try {
    const today = new Date().toISOString().split('T')[0];
    const properties = {
      'Nombre del servicio': { title: [{ text: { content: nombrePropuesta } }] },
      'Estado': { select: { name: '📋 Pendiente' } },
      'Tipo de registro': { select: { name: '📋 Orden de trabajo' } },
      'Fecha programada': { date: { start: today } },
      'Propuesta': { relation: [{ id: propPageId }] }
    };
    if (pais) properties['País'] = { select: { name: pais } };
    if (tipo) properties['Tipo'] = { select: { name: tipo } };
    if (contactRel) properties['Contacto'] = { relation: [{ id: contactRel }] };

    // La base Servicios tiene multiple data sources → Notion exige data_source_id
    // (no database_id) en el parent al crear páginas. Si usás database_id, devuelve
    // validation_error y el proxy fallback dispara un search (incorrecto para creates).
    const created = await callNotion('pages', 'POST', {
      parent: { type: 'data_source_id', data_source_id: M.SERVICIOS_DS_ID },
      properties
    });
    // Refrescar el espejo del lado propuesta (su relación Servicios) para que el badge "falta crear el
    // servicio" se apague pronto y una futura oferta no lea 0 servicios stale (auditoría 2026-07-09).
    if (typeof syncAfterWrite === 'function') { try { syncAfterWrite(propPageId, 'propuestas'); syncAfterWrite(created.id, 'servicios'); } catch (_) {} }
    await linkServicioEnPropuesta(prop, created.id); // espejo-safe bajo el flip (ver helper)

    closePropSheet();
    // Cambiar a tab Servicios y refrescar
    if (typeof setCoordTab === 'function') setCoordTab('servicios');
    await renderCoordServicios();
    // Update optimista: el SW (stale-while-revalidate) puede devolver la lista de servicios cacheada SIN el
    // recién creado por un instante (la revalidación en background lo corrige, pero la pantalla ya se pintó).
    // Lo agregamos a la lista en memoria y re-renderizamos → aparece al toque. Bonus: así openEditSheet lo
    // encuentra en M._coordAllServices para abrir su sheet.
    if (Array.isArray(M._coordAllServices) && !M._coordAllServices.some(s => s.id === created.id)) {
      M._coordAllServices.unshift(created);
      if (typeof renderCoordList === 'function') renderCoordList();
    }
    // Abrir el edit sheet del servicio recién creado para asignar operario
    setTimeout(() => {
      if (typeof openEditSheet === 'function') openEditSheet(created.id);
    }, 400);
  } catch (e) {
    if (btn) { btn.textContent = '→ ' + t('sheet.prop.create.svc'); btn.disabled = false; }
    alert(t('sheet.prop.create.error') + ' ' + e.message);
  }
}

export async function createPruebaFromPropuesta(propPageId) {
  const prop = (M.editingProp && M.editingProp.id === propPageId) ? M.editingProp : M._coordAllProps?.find(p => p.id === propPageId);
  if (!prop) { alert('Propuesta no encontrada en memoria. Recargá la lista.'); return; }
  const pp = prop.properties || {};
  const nombrePropuesta = pp['Nombre de propuesta']?.title?.[0]?.plain_text || t('common.sinnombre');
  const pais = pp['País']?.select?.name || '';
  const contactRel = pp['Contacto']?.relation?.[0]?.id;

  const btn = document.getElementById('create-prueba-btn');
  if (btn) { btn.textContent = '⏳ ' + t('sheet.prop.creating.prueba'); btn.disabled = true; }

  try {
    const today = new Date().toISOString().split('T')[0];
    const properties = {
      'Nombre del servicio': { title: [{ text: { content: '🧪 Prueba — ' + nombrePropuesta } }] },
      'Estado': { select: { name: '📋 Pendiente' } },
      'Tipo de registro': { select: { name: '🧪 Prueba' } },
      'Fecha programada': { date: { start: today } },
      'Propuesta': { relation: [{ id: propPageId }] }
    };
    if (pais) properties['País'] = { select: { name: pais } };
    if (contactRel) properties['Contacto'] = { relation: [{ id: contactRel }] };

    const created = await callNotion('pages', 'POST', {
      parent: { type: 'data_source_id', data_source_id: M.SERVICIOS_DS_ID },
      properties
    });
    await linkServicioEnPropuesta(prop, created.id); // espejo-safe bajo el flip (ver helper)

    closePropSheet();
    // Un solo render de la tab correcta + update optimista + M.editingService poblado (mismo patrón que
    // submitNewService). Antes: doble render + el sheet no abría porque el registro no estaba en memoria
    // (auditoría 2026-07-09).
    if (typeof setCoordTab === 'function') setCoordTab('pruebas', true);
    await renderCoordPruebas();
    if (Array.isArray(M._coordAllServices) && !M._coordAllServices.some(x => x.id === created.id)) {
      M._coordAllServices.unshift(created);
      if (typeof renderCoordList === 'function') renderCoordList();
    }
    M.editingService = created; M._editFromPorCobrar = false;
    if (typeof openEditSheet === 'function') openEditSheet(created.id);
  } catch (e) {
    if (btn) { btn.textContent = '🧪 ' + t('sheet.prop.pedir.prueba'); btn.disabled = false; }
    alert(t('sheet.prop.create.error') + ' ' + e.message);
  }
}

export async function createRelevamientoFromPropuesta(propPageId) {
  const prop = (M.editingProp && M.editingProp.id === propPageId) ? M.editingProp : M._coordAllProps?.find(p => p.id === propPageId);
  if (!prop) { alert('Propuesta no encontrada en memoria. Recargá la lista.'); return; }
  const pp = prop.properties || {};
  const nombrePropuesta = pp['Nombre de propuesta']?.title?.[0]?.plain_text || t('common.sinnombre');
  const pais = pp['País']?.select?.name || '';
  const contactRel = pp['Contacto']?.relation?.[0]?.id;

  const btn = document.getElementById('create-relev-btn');
  if (btn) { btn.textContent = '⏳ ' + t('sheet.prop.creating.relev'); btn.disabled = true; }

  try {
    const today = new Date().toISOString().split('T')[0];
    const properties = {
      'Nombre del servicio': { title: [{ text: { content: '🔍 Relevamiento — ' + nombrePropuesta } }] },
      'Estado': { select: { name: '📋 Pendiente' } },
      'Tipo de registro': { select: { name: '🔍 Relevamiento' } },
      'Fecha programada': { date: { start: today } },
      'Propuesta': { relation: [{ id: propPageId }] }
    };
    if (pais) properties['País'] = { select: { name: pais } };
    if (contactRel) properties['Contacto'] = { relation: [{ id: contactRel }] };

    // Multi-source DB → data_source_id obligatorio
    const created = await callNotion('pages', 'POST', {
      parent: { type: 'data_source_id', data_source_id: M.SERVICIOS_DS_ID },
      properties
    });
    await linkServicioEnPropuesta(prop, created.id); // espejo-safe bajo el flip (ver helper)

    closePropSheet();
    // BUG arreglado (auditoría 2026-07-09): iba a la tab 'servicios' (que FILTRA afuera los
    // relevamientos) y no poblaba el registro → el relevamiento no aparecía y el sheet no abría.
    // Ahora: tab 'relevamientos' + un solo render + optimista + M.editingService (patrón submitNewService).
    if (typeof setCoordTab === 'function') setCoordTab('relevamientos', true);
    await renderCoordRelevamientos();
    if (Array.isArray(M._coordAllServices) && !M._coordAllServices.some(x => x.id === created.id)) {
      M._coordAllServices.unshift(created);
      if (typeof renderCoordList === 'function') renderCoordList();
    }
    M.editingService = created; M._editFromPorCobrar = false;
    if (typeof openEditSheet === 'function') openEditSheet(created.id);
  } catch (e) {
    if (btn) { btn.textContent = '🔍 ' + t('sheet.prop.pedir.relev'); btn.disabled = false; }
    alert(t('sheet.prop.create.error') + ' ' + e.message);
  }
}

// G1: selector de moneda del importe (UY$/USD). La moneda es obligatoria — no se deselecciona.
export function propSetMoneda(el, m) {
  M.propEditState.moneda = m;
  el.closest('div').querySelectorAll('.estado-btn').forEach(b => b.classList.toggle('active', b === el));
}

export function propSetField(key, el, val) {
  // País y Estado son obligatorios (no se deseleccionan); el resto: tocar el activo lo vacía (toggle).
  const obligatorio = (key === 'pais' || key === 'estado');
  if (!obligatorio && el.classList.contains('active')) {
    M.propEditState[key] = '';
    el.classList.remove('active');
  } else {
    M.propEditState[key] = val;
    el.closest('.estado-btns').querySelectorAll('.estado-btn').forEach(b => b.classList.remove('active'));
    el.classList.add('active');
  }
  if (key === 'estado') updateCreateSvcBtnVisibility();
}

export function updateCreateSvcBtnVisibility() {
  if (!M.editingProp) return;
  const estado = M.propEditState.estado || '';
  // Estados donde se puede crear servicio (ya vendida)
  const ESTADOS_VENDIDO = ['✅ Aceptada', 'Concretado', 'Servicio Pendiente'];
  // Estados donde tiene sentido pedir un relevamiento o prueba previa (antes de cotizar)
  const ESTADOS_PRE_VENTA = ['🆕 Nuevo lead', '📞 Contactado', '🔍 Relevamiento', '⏳ En preparación'];

  const showSvc = ESTADOS_VENDIDO.includes(estado);
  const showRelev = ESTADOS_PRE_VENTA.includes(estado);
  const showPrueba = ESTADOS_PRE_VENTA.includes(estado);

  // Hint corto bajo el botón deshabilitado (en qué estado se activa).
  function setHint(sectionEl, show, msgKey) {
    if (!sectionEl) return;
    let hint = sectionEl.querySelector('.create-btn-hint');
    if (show) { if (hint) hint.remove(); return; }
    if (!hint) {
      hint = document.createElement('div');
      hint.className = 'edit-section-hint create-btn-hint';
      hint.style.cssText = 'font-size:11px;color:var(--text3);margin-top:6px';
      sectionEl.appendChild(hint);
    }
    hint.textContent = t(msgKey);
  }

  // Crear servicio (verde) — siempre visible, habilitado solo si vendida.
  const svcSection = document.getElementById('create-svc-section');
  const svcBtn = document.getElementById('create-svc-btn');
  if (svcSection && svcBtn) {
    svcSection.style.display = '';
    const servCount = (M.editingProp.properties?.['Servicios']?.relation || []).length;
    svcBtn.textContent = servCount > 0
      ? '+ ' + t('sheet.prop.create.another.svc') + ' (' + servCount + ' ' + t('sheet.prop.svc.already') + ')'
      : '→ ' + t('sheet.prop.create.svc');
    svcBtn.disabled = !showSvc;
    setHint(svcSection, showSvc, 'sheet.prop.create.svc.hint');
  }

  // Pedir relevamiento (violeta) — siempre visible, habilitado solo en pre-venta.
  const relevSection = document.getElementById('create-relev-section');
  const relevBtn = document.getElementById('create-relev-btn');
  if (relevSection && relevBtn) {
    relevSection.style.display = '';
    relevBtn.textContent = '🔍 ' + t('sheet.prop.pedir.relev');
    relevBtn.disabled = !showRelev;
    setHint(relevSection, showRelev, 'sheet.prop.pedir.relev.hint');
  }

  // Hacer prueba demo (rosa) — siempre visible, habilitado solo en pre-venta.
  const pruebaSection = document.getElementById('create-prueba-section');
  const pruebaBtn = document.getElementById('create-prueba-btn');
  if (pruebaSection && pruebaBtn) {
    pruebaSection.style.display = '';
    pruebaBtn.textContent = '🧪 ' + t('sheet.prop.pedir.prueba');
    pruebaBtn.disabled = !showPrueba;
    setHint(pruebaSection, showPrueba, 'sheet.prop.pedir.prueba.hint');
  }
}

export function propOverlayClick(e) { if (e.target.id === 'prop-overlay') closePropSheet(); }
export function closePropSheet() { document.getElementById('prop-overlay').classList.remove('open'); M.editingProp = null; if (typeof M._contactHistoryCache !== 'undefined') Object.keys(M._contactHistoryCache).forEach(k => delete M._contactHistoryCache[k]); }

// Al aceptar una propuesta, si el cliente vinculado sigue en un estado de PROSPECCIÓN, se lo promueve
// solo a "✅ Cliente activo" (cierra el ciclo prospecto→cliente). Falla en silencio: la propuesta ya
// se guardó, y una promoción fallida no debe romper ese guardado. No toca clientes que ya están en la
// cartera (Lead/Activo/Inactivo) — solo los que todavía viven en la pestaña Prospección.
async function promoteClienteIfAceptada(clienteId, estadoPipeline) {
  if (!clienteId || !estadoPipeline || !estadoPipeline.includes('Aceptada')) return;
  try {
    const cli = await callNotion('pages/' + clienteId, 'GET');
    const cliEstado = cli?.properties?.['Estado']?.select?.name || '';
    if (!M.PROSPECCION_ESTADOS.includes(cliEstado)) return;
    await updateServiceProps(clienteId, { 'Estado': { select: { name: '✅ Cliente activo' } } });
    if (typeof syncAfterWrite === 'function') { try { syncAfterWrite(clienteId, 'clientes'); } catch (_) {} }
  } catch (_) { /* no romper el guardado de la propuesta */ }
}

export async function savePropEdit() {
  if (esVentas()) return; // Ventas: solo lectura + seguimiento — nunca guarda ediciones
  const btn = document.getElementById('prop-save-btn');
  btn.textContent = t('btn.saving'); btn.disabled = true;
  try {
    if (propSheetMode === 'create' && !M.propEditState.nombre.trim()) {
      btn.textContent = t('btn.create.notion'); btn.disabled = false;
      alert(t('sheet.prop.error.nombre')); return;
    }
    // Resolver/crear el cliente → dejar su id en clienteId. La propuesta se linkea (Contacto) y, vía la
    // propagación que ya existe, los servicios creados desde la propuesta heredan el cliente → CRM interconectado.
    let clienteId = (M.propEditState.clienteSel && M.propEditState.clienteSel !== '__new__') ? M.propEditState.clienteSel : null;
    if (clienteId) {
      const upd = {};
      if (M.propEditState.tel) upd['Teléfono / WhatsApp'] = { phone_number: M.propEditState.tel };
      if (M.propEditState.email) upd['Email'] = { email: M.propEditState.email };
      if (Object.keys(upd).length) { try { await updateServiceProps(clienteId, upd); } catch (_) {} }
    } else if ((M.propEditState.nombreCliente || '').trim() || M.propEditState.tel || M.propEditState.email) {
      // Dedup: buscar un cliente con ese teléfono o email antes de crear uno nuevo (evita duplicados).
      let existing = null;
      const orf = [];
      if (M.propEditState.tel) orf.push({ property: 'Teléfono / WhatsApp', phone_number: { equals: M.propEditState.tel } });
      if (M.propEditState.email) orf.push({ property: 'Email', email: { equals: M.propEditState.email } });
      if (orf.length) {
        const dup = await callNotion(`databases/${M.CONTACTOS_DB_ID}/query`, 'POST', { filter: orf.length === 1 ? orf[0] : { or: orf }, page_size: 1 }).catch(() => ({ results: [] }));
        if (dup.results && dup.results.length) existing = dup.results[0];
      }
      if (existing) {
        // Ya existe → linkear ese cliente y completar tel/email si le faltaban.
        clienteId = existing.id;
        const upd = {};
        if (M.propEditState.tel && !existing.properties?.['Teléfono / WhatsApp']?.phone_number) upd['Teléfono / WhatsApp'] = { phone_number: M.propEditState.tel };
        if (M.propEditState.email && !existing.properties?.['Email']?.email) upd['Email'] = { email: M.propEditState.email };
        if (Object.keys(upd).length) { try { await updateServiceProps(existing.id, upd); } catch (_) {} }
      } else {
        const cprops = {
          'Nombre / Empresa': { title: [{ text: { content: (M.propEditState.nombreCliente || M.propEditState.nombre || 'Cliente s/n').trim() } }] },
          'Estado': { select: { name: '🆕 Lead' } },
        };
        if (M.propEditState.pais) cprops['País'] = { select: { name: M.propEditState.pais } };
        if (M.propEditState.tel) cprops['Teléfono / WhatsApp'] = { phone_number: M.propEditState.tel };
        if (M.propEditState.email) cprops['Email'] = { email: M.propEditState.email };
        const nc = await callNotion('pages', 'POST', { parent: { database_id: M.CONTACTOS_DB_ID }, properties: cprops });
        clienteId = nc && nc.id;
        // Espejo al toque (ver resolveOrCreateClienteId): que el cliente nuevo no tarde 10 min en las listas.
        if (clienteId && typeof syncAfterWrite === 'function') { try { syncAfterWrite(clienteId, 'clientes'); } catch (_) {} }
      }
      M._propContactos = null;
    }
    // Relación Servicios FRESCA del PATCH (Notion autoritativo) para la guardia anti-duplicado de la
    // oferta #4: leerla del espejo Supabase (M._coordAllProps) puede venir stale y ofrecer crear un 2º servicio.
    let _freshServiciosLen = null;
    if (propSheetMode === 'create') {
      const props = { 'Nombre de propuesta': { title: [{ text: { content: M.propEditState.nombre.trim() } }] } };
      if (M.propEditState.estado) props['Estado pipeline'] = { select: { name: M.propEditState.estado } };
      if (M.propEditState.pais) props['País'] = { select: { name: M.propEditState.pais } };
      props['Tipo'] = { select: M.propEditState.tipo ? { name: M.propEditState.tipo } : null };
      props['Aprobación interna'] = { select: M.propEditState.aprobacion ? { name: M.propEditState.aprobacion } : null };
      props['Importe estimado'] = { number: parseFloat(M.propEditState.importe) || null };
      if (M.propEditState.moneda) props['Moneda'] = { select: { name: M.propEditState.moneda } };
      props['Servicios por año'] = { number: parseFloat(M.propEditState.serviciosAnio) || null };
      props['Comisión %'] = { number: parseFloat(M.propEditState.comision) || null };
      if (M.propEditState.fechaEnvio) props['Fecha de envío'] = { date: { start: M.propEditState.fechaEnvio } };
      else if (M.propEditState.estado === '📤 Enviada al cliente') {
        // Reloj de vida (spec dos-relojes 2026-07-02): al nacer ya en "Enviada" sin fecha propia,
        // se estampa hoy — mismo patrón hoyISO que openNewServiceSheet (fecha LOCAL, no UTC).
        const _hoy = new Date();
        const hoyISO = `${_hoy.getFullYear()}-${String(_hoy.getMonth() + 1).padStart(2, '0')}-${String(_hoy.getDate()).padStart(2, '0')}`;
        props['Fecha de envío'] = { date: { start: hoyISO } };
      }
      if (M.propEditState.ultimaInt) props['Última interacción'] = { date: { start: M.propEditState.ultimaInt } };
      if (M.propEditState.obs) props['Observaciones'] = { rich_text: [{ text: { content: M.propEditState.obs } }] };
      if (clienteId) props['Contacto'] = { relation: [{ id: clienteId }] };
      const _nuevaProp = await callNotion('pages', 'POST', { parent: { database_id: M.PROPUESTAS_DB_ID }, properties: props });
      // Espejar la propuesta nueva al mirror Supabase (las secciones de Clientes lo leen) para que el
      // cliente salga de "Mantenimiento (9 meses)" sin esperar el sync batch (~10 min). Comercial 2026-07-09.
      if (_nuevaProp?.id && typeof syncAfterWrite === 'function') { try { syncAfterWrite(_nuevaProp.id, 'propuestas'); } catch (_) {} }
      await promoteClienteIfAceptada(clienteId, M.propEditState.estado);
    } else {
      const props = {};
      // F1: en EDICIÓN cada campo se escribe SOLO si cambió vs su snapshot (_XOrig). Este bloque es solo edit.
      const p = M.propEditState;
      const chg = (cur, orig) => cur !== orig;
      if (p.estado && chg(p.estado, p._estadoOrig)) props['Estado pipeline'] = { select: { name: p.estado } };
      if (p.pais && chg(p.pais, p._paisOrig)) props['País'] = { select: { name: p.pais } };
      if (chg(p.tipo, p._tipoOrig)) props['Tipo'] = { select: p.tipo ? { name: p.tipo } : null };
      if (chg(p.aprobacion, p._aprobacionOrig)) props['Aprobación interna'] = { select: p.aprobacion ? { name: p.aprobacion } : null };
      if (chg(String(p.importe ?? ''), p._importeOrig)) props['Importe estimado'] = { number: parseFloat(p.importe) || null };
      if (p.moneda && p.moneda !== p._monedaOrig) props['Moneda'] = { select: { name: p.moneda } };
      if (chg(String(p.serviciosAnio ?? ''), p._serviciosAnioOrig)) props['Servicios por año'] = { number: parseFloat(p.serviciosAnio) || null };
      if (chg(String(p.comision ?? ''), p._comisionOrig)) props['Comisión %'] = { number: parseFloat(p.comision) || null };
      // Fecha de envío: escribir si el usuario la cambió; o auto-estampar hoy al pasar a "Enviada" sin fecha previa
      // (reloj de vida, spec dos-relojes 2026-07-02) — el auto-estampado es acción del sistema, no echo-back.
      if (chg(p.fechaEnvio, p._fechaEnvioOrig) && p.fechaEnvio) props['Fecha de envío'] = { date: { start: p.fechaEnvio } };
      else if (!p.fechaEnvio && p.estado === '📤 Enviada al cliente') {
        const _hoy = new Date();
        const hoyISO = `${_hoy.getFullYear()}-${String(_hoy.getMonth() + 1).padStart(2, '0')}-${String(_hoy.getDate()).padStart(2, '0')}`;
        props['Fecha de envío'] = { date: { start: hoyISO } };
      }
      if (chg(p.ultimaInt, p._ultimaIntOrig) && p.ultimaInt) props['Última interacción'] = { date: { start: p.ultimaInt } };
      // Posponer aviso: escribir SOLO si cambió (defensivo: si la property no existe en Notion aún, no se manda).
      if (p.posponerHasta !== p._posponerHastaOrig)
        props['Posponer aviso hasta'] = p.posponerHasta ? { date: { start: p.posponerHasta } } : { date: null };
      if (chg(p.obs, p._obsOrig)) props['Observaciones'] = { rich_text: p.obs ? [{ text: { content: p.obs } }] : [] };
      if (chg(p.mapa, p._mapaOrig)) props['Mapa'] = { url: (p.mapa && p.mapa.trim()) ? p.mapa.trim() : null };
      // Contacto: linkear si hay clienteId y DIFIERE del vínculo actual. Comparar contra el vínculo real (no
      // clienteSel): en un alta inline/dedup, clienteSel queda en '__new__' aunque clienteId ya se resolvió a un id
      // → mirar clienteSel dejaría la propuesta huérfana. Igual respeta F1 (no re-escribe si el vínculo no cambió).
      const _contactoPrev = M.editingProp?.properties?.['Contacto']?.relation?.[0]?.id || M.editingProp?.properties?.['Contactos']?.relation?.[0]?.id || null;
      if (clienteId && clienteId !== _contactoPrev) props['Contacto'] = { relation: [{ id: clienteId }] };
      const _updatedProp = await updateServiceProps(M.editingProp.id, props);
      _freshServiciosLen = (_updatedProp?.properties?.['Servicios']?.relation || M.editingProp?.properties?.['Servicios']?.relation || []).length;
      // En edición el cliente puede venir del selector (clienteId) o del vínculo previo de la propuesta.
      const clienteVinculado = clienteId || M.editingProp?.properties?.['Contacto']?.relation?.[0]?.id || M.editingProp?.properties?.['Contactos']?.relation?.[0]?.id || null;
      await promoteClienteIfAceptada(clienteVinculado, M.propEditState.estado);
    }
    // #4 (auditoría 2026-07-09): al ACEPTAR una propuesta que todavía no tiene servicio, ofrecer crearlo en
    // el acto (antes había que abrir la propuesta y buscar el botón). Solo en la TRANSICIÓN a Aceptada (no
    // re-ofrece si se re-guarda una ya aceptada; el badge de la card cubre ese recordatorio persistente).
    const _svcLen = (_freshServiciosLen != null) ? _freshServiciosLen : (M.editingProp?.properties?.['Servicios']?.relation || []).length;
    const _ofrecerSvcId = (propSheetMode !== 'create'
      && /Aceptada/.test(M.propEditState.estado || '')
      && !/Aceptada/.test(M.editingProp?.properties?.['Estado pipeline']?.select?.name || '')
      && _svcLen === 0)
      ? M.editingProp.id : null;
    closePropSheet();
    // Invalidar la clasificación de secciones de Clientes: crear/editar una propuesta cambia si el cliente
    // tiene "propuesta abierta" → al volver a la tab Clientes se recomputa y sale de "9 meses" (Comercial 2026-07-09).
    M._coordCliSecciones = null;
    await renderCoordPropuestas();
    if (_ofrecerSvcId && confirm(t('sheet.prop.aceptada.offer'))) {
      await createServicioFromPropuesta(_ofrecerSvcId);
    }
  } catch (e) {
    btn.textContent = propSheetMode === 'create' ? t('btn.create.notion') : t('btn.save.notion');
    btn.disabled = false;
    alert(t('sheet.alert.save.error2') + e.message);
  }
}

export async function recontacteHoyDesdeSheet(id, btn) {
  if (!btn || btn.disabled) return;
  const prev = btn.textContent;
  btn.disabled = true; btn.textContent = '⏳';
  try {
    const hoyISO = await patchPropUltimaInteraccionHoy(id);
    if (typeof M.propEditState !== 'undefined' && M.propEditState) M.propEditState.ultimaInt = hoyISO;
    const inp = document.getElementById('prop-ultimaint-input');
    if (inp) inp.value = hoyISO;
    btn.textContent = '✓ ' + t('sheet.prop.recontacte.ok');
  } catch (e) {
    btn.disabled = false; btn.textContent = prev;
    alert(t('sheet.alert.save.error2') + e.message);
  }
}
