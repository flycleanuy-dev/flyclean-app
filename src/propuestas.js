// ─────────────────────────────────────────────
// PROPUESTAS — seguimiento comercial (parte 1/2; el sheet de crear/editar va en un corte dedicado).
// Bloque "📞 A contactar hoy" (propuestas esperando respuesta 15+ días, con reloj de vida), marcar
// "Contactado" 1-toque, y WhatsApp asistido desde la propuesta. Extraído de main.js el 2026-07-17
// (patrón puente). El estado de la lista (_coordAllProps) y el sheet (editingProp, renderCoordPropuestasList)
// quedan en main → M. Los onclick de las cards son strings → resuelven por window (gen-globals).
// ─────────────────────────────────────────────
import { t } from './i18n.js';
import { esc } from './util.js';
import { callNotion, syncAfterWrite } from './api.js';

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
