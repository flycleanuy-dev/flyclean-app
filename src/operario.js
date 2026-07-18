// ─────────────────────────────────────────────
// OPERARIO — el MOTOR del flujo de campo (3º y ÚLTIMO corte grande, 2026-07-18): lista de servicios del
// operario + agenda del piloto, openService (rehidratación desde Notion+local), el wizard de pasos completo
// (renderStep + navegación + checklists + clima + método + resultado + ficha de relevamiento), GPS con
// consentimiento, iniciar/cancelar inicio/cierre (con sectores y "¿terminaste?" de jornadas), persistencia
// (localStorage inmediato + Notion con debounce), pantalla "listo", creación de jornada siguiente, y los
// overlays de sector/cierre-sectores. CRÍTICO DE CAMPO: si esto se rompe, un operario pierde trabajo en una
// azotea — verificación reforzada + detector de errores de guardia.
// ─────────────────────────────────────────────
// Queda en main → M: serviceState/currentService/currentStep/jornadaState (handler vars, accesores
// gen-globals; además serviceState/currentService los puentea fotos.js) + currentUser/USERS/mapas/IDs +
// _activosCache/_equiposDelServicio (los comparte equipos.js). STEPS_* y STEPS son propios del módulo.

import { t, currentLang, pedidoFmtFecha } from './i18n.js';
import { esc, toArr, msNames } from './util.js';
import { esArchivado, tipoServicioStr, tipoServicioList } from './calculos.js';
import { callNotion, syncAfterWrite, updateServiceProps, isNetworkError } from './api.js';
import { queueableUpdateServiceProps, enqueueCreate } from './offline-queue.js';
import { photosToNotionFiles, fotoTomada, renderPhotoUploader, renderSectorPhotoUploader, sectorFotos, ensurePhotosBucket } from './fotos.js';
import { groupServicesByDay, renderCoordServicios } from './coord-servicios.js';
import { fetchEquiposDelServicio, fetchActivosDisponibles } from './equipos.js';
import { clienteNombre } from './clientes.js';
import { loadAlerts } from './alertas.js';

let M = {};
export function initOperario(bridge) { M = bridge; }

const showScreen = (...a) => M.showScreen(...a);
const showSaving = (...a) => M.showSaving(...a);
const markUserActive = (...a) => M.markUserActive(...a);
const escAttrEdit = (...a) => M.escAttrEdit(...a);
const closeEditSheet = (...a) => M.closeEditSheet(...a);
const participaEn = (...a) => M.participaEn(...a);
const getMyServices = (...a) => M.getMyServices(...a);
const operariosDePais = (...a) => M.operariosDePais(...a);
const resolveMapsUrl = (...a) => M.resolveMapsUrl(...a);
const resetServiceState = (...a) => M.resetServiceState(...a);
const crearJornadaSiguiente = (...a) => M.crearJornadaSiguiente(...a);
const _ckAligned = (...a) => M._ckAligned(...a);

let sectorOverlayState = null; // { sectorId } — estado del overlay de sector (propio del módulo)

const STEPS_SERVICIO = [
  { id: 'inicio', label: 'INICIAR', icon: '▶' },
  { id: 'checklist_pre', label: 'PRE', icon: '✅' },
  { id: 'fotos_antes', label: 'FOTOS', icon: '📸' },
  { id: 'inicio_efectivo', label: 'INICIO EF.', icon: '🕐' },
  { id: 'ejecucion', label: 'TRABAJO', icon: '🚁' },
  { id: 'cierre_efectivo', label: 'CIERRE EF.', icon: '⏹' },
  { id: 'checklist_post', label: 'POST', icon: '✅' },
  { id: 'fotos_despues', label: 'FOTOS', icon: '📸' },
  { id: 'observaciones', label: 'NOTAS', icon: '📝' },
  { id: 'cerrar', label: 'CERRAR', icon: '🏁' }
];

// Relevamiento = FICHA ÚNICA (pedido Diego 16/07): no es un servicio ni una prueba — es recolección de
// información para presupuestar. Sin clima, sin checklist, sin "iniciar": una sola pantalla tipo planilla
// que se llena libre (los datos se guardan solos), las fotos pueden subirse después desde la galería, y la
// ubicación se puede pegar como link de Google Maps sin estar en el lugar. "Finalizar" cierra y con esa
// info el coordinador arma el presupuesto (los campos van a las mismas properties Notion de siempre).
const STEPS_RELEVAMIENTO = [
  { id: 'ficha_relev', label: 'FICHA', icon: '🔍' }
];

// Flujo del operario cuando el servicio tiene SECTORES: igual al normal pero SIN los pasos
// de fotos globales (las fotos antes/después son por sector, dentro del hub). El checklist
// PRE (al llegar) y POST (al cierre) se mantienen, 1 vez por jornada.
const STEPS_SECTORES = [
  { id: 'inicio', label: 'INICIAR', icon: '▶' },
  { id: 'checklist_pre', label: 'PRE', icon: '✅' },
  { id: 'inicio_efectivo', label: 'INICIO EF.', icon: '🕐' },
  { id: 'ejecucion', label: 'SECTORES', icon: '🏢' },
  { id: 'cierre_efectivo', label: 'CIERRE EF.', icon: '⏹' },
  { id: 'checklist_post', label: 'POST', icon: '✅' },
  { id: 'observaciones', label: 'NOTAS', icon: '📝' },
  { id: 'cerrar', label: 'CERRAR', icon: '🏁' }
];

let STEPS = STEPS_SERVICIO;

export function storageKeyForService(id) { return 'fc_service_' + id; }

export function persistServiceStateToLocal() {
  if (!M.currentService?.id) return;
  try {
    localStorage.setItem(storageKeyForService(M.currentService.id), JSON.stringify({
      state: M.serviceState,
      step: M.currentStep,
      ts: Date.now()
    }));
  } catch (e) { console.warn('local persist failed', e); }
}

let _notionFlushTimer = null;
export function buildIncrementalProps(s) {
  const properties = {};
  const preFiles = photosToNotionFiles(s.photos?.pre, 'pre');
  const postFiles = photosToNotionFiles(s.photos?.post, 'post');
  const relevFiles = photosToNotionFiles(s.photos?.relevamiento, 'relev');
  if (preFiles.length) properties['📸 Fotos pre-servicio'] = { files: preFiles };
  if (postFiles.length) properties['📸 Fotos post-servicio'] = { files: postFiles };
  if (relevFiles.length) properties['📸 Fotos relevamiento'] = { files: relevFiles };
  const climaArr = Array.isArray(s.clima) ? s.clima : (s.clima ? [s.clima] : []);
  if (climaArr.length) properties['Condición climática'] = { multi_select: climaArr.map(name => ({ name })) };
  const tipoReg = M.currentService?.properties?.['Tipo de registro']?.select?.name || '';
  if (tipoReg.includes('Prueba')) {
    if (s.resultadoPrueba) properties['Resultado prueba'] = { select: { name: s.resultadoPrueba } };
  } else if (s.resultado) {
    properties['Resultado'] = { select: { name: s.resultado } };
  }
  // Blindaje del checklist (Punto 5b): persistir pre/post a Notion en cada auto-save.
  // Solo escribir si hay al menos un ítem marcado (evita pisar con "{}" un servicio sin tocar).
  const _ck = { pre: s.checklistPre || {}, post: s.checklistPost || {} };
  if (Object.keys(_ck.pre).length || Object.keys(_ck.post).length) {
    properties['Estado checklist'] = { rich_text: [{ text: { content: JSON.stringify(_ck) } }] };
  }
  const _met = toArr(s.metodoTrabajo);
  if (_met.length) {
    properties['Método de trabajo'] = { multi_select: _met.map(name => ({ name })) };
    const _herr = toArr(s.herramientaManual);
    if (_met.includes('💪 Manual') && _herr.length) {
      properties['Herramienta manual'] = { multi_select: _herr.map(name => ({ name })) };
    }
  }
  // Sectores: el operario actualiza el estado de cada sector (en_curso/hecho). Preserva id+nombre
  // (los puso el coordinador), solo cambia 'estado'. Se escribe la lista completa que se hidrató al abrir.
  if (Array.isArray(s.sectores) && s.sectores.length) {
    const secs = s.sectores.map(x => ({ id: x.id, nombre: String(x.nombre || '').trim(), estado: x.estado || 'pendiente' })).filter(x => x.nombre);
    properties['Estado sectores'] = { rich_text: secs.length ? [{ text: { content: JSON.stringify(secs) } }] : [] };
  }
  return properties;
}

export function persistServiceState({ immediateNotion = false } = {}) {
  persistServiceStateToLocal();
  if (!M.currentService?.id) return;
  clearTimeout(_notionFlushTimer);
  const flush = async () => {
    try {
      const props = buildIncrementalProps(M.serviceState);
      if (Object.keys(props).length) await queueableUpdateServiceProps(M.currentService.id, props);
    } catch (e) { console.warn('Notion auto-save failed (will retry next change):', e); }
  };
  if (immediateNotion) flush();
  else _notionFlushTimer = setTimeout(flush, 3000);
}

export function hydrateServiceStateFromNotion(svc) {
  const props = svc.properties || {};
  const fmtTime = iso => iso ? new Date(iso).toLocaleTimeString('es-UY', { hour: '2-digit', minute: '2-digit' }) : null;
  // `Hora Inicio` en Notion ahora es la hora programada del coord. NO la usamos para
  // rehidratar M.serviceState.horaInicio (ese campo refleja cuándo el operario apretó
  // "Iniciar servicio" en su sesión, vive en localStorage).
  const hie = props['Hora Inicio Efectivo']?.date?.start;
  const hfe = props['Hora Fin Efectivo']?.date?.start;
  if (hie) M.serviceState.horaInicioEfectivo = fmtTime(hie);
  if (hfe) M.serviceState.horaCierreEfectivo = fmtTime(hfe);

  const climaArr = (props['Condición climática']?.multi_select || []).map(o => o.name).filter(Boolean);
  if (climaArr.length) M.serviceState.clima = climaArr;
  const resultadoPrueba = props['Resultado prueba']?.select?.name;
  if (resultadoPrueba) M.serviceState.resultadoPrueba = resultadoPrueba;
  const resultado = props['Resultado']?.select?.name;
  if (resultado) M.serviceState.resultado = resultado;

  const metodoTrabajo = msNames(props['Método de trabajo']);
  if (metodoTrabajo.length) M.serviceState.metodoTrabajo = metodoTrabajo;
  const herramientaManual = msNames(props['Herramienta manual']);
  if (herramientaManual.length) M.serviceState.herramientaManual = herramientaManual;

  const collect = prop => (prop?.files || [])
    .map(f => {
      const nm = f.name || 'foto.jpg';
      const sectorId = nm.includes('__') ? nm.split('__')[0] : null;
      return {
        id: 'notion-' + Math.random().toString(36).slice(2, 9),
        sectorId,
        filename: nm,
        status: 'done',
        publicUrl: f.external?.url || f.file?.url || null,
        previewUrl: f.external?.url || f.file?.url || null
      };
    })
    .filter(f => f.publicUrl);
  M.serviceState.photos.pre = collect(props['📸 Fotos pre-servicio']);
  M.serviceState.photos.post = collect(props['📸 Fotos post-servicio']);
  M.serviceState.photos.relevamiento = collect(props['📸 Fotos relevamiento']);
  // Fallback del checklist desde Notion (Punto 5b): si localStorage se perdió
  // (caché borrada / reinstalación), reconstruir pre/post desde la property.
  // hydrateServiceStateFromLocal corre DESPUÉS y, si tiene datos, los superpone (gana lo local).
  try {
    const ckRaw = props['Estado checklist']?.rich_text?.[0]?.plain_text;
    if (ckRaw) {
      const ck = JSON.parse(ckRaw);
      if (ck && typeof ck === 'object') {
        if (ck.pre && Object.keys(ck.pre).length && _ckAligned(ck.pre, M.CHECKLIST_PRE)) M.serviceState.checklistPre = ck.pre;
        if (ck.post && Object.keys(ck.post).length && _ckAligned(ck.post, M.CHECKLIST_POST)) M.serviceState.checklistPost = ck.post;
      }
    }
  } catch (_) { /* JSON corrupto → ignorar, el checklist arranca vacío */ }
}

export function hydrateServiceStateFromLocal(id) {
  try {
    const raw = localStorage.getItem(storageKeyForService(id));
    if (!raw) return false;
    const d = JSON.parse(raw);
    const ls = d.state || {};
    if (ls.checklistPre && Object.keys(ls.checklistPre).length && _ckAligned(ls.checklistPre, M.CHECKLIST_PRE)) M.serviceState.checklistPre = ls.checklistPre;
    if (ls.checklistPost && Object.keys(ls.checklistPost).length && _ckAligned(ls.checklistPost, M.CHECKLIST_POST)) M.serviceState.checklistPost = ls.checklistPost;
    if (ls.notasPost) M.serviceState.notasPost = ls.notasPost;
    if (ls.avance) M.serviceState.avance = ls.avance;
    if (ls.relevamiento) M.serviceState.relevamiento = { ...M.serviceState.relevamiento, ...ls.relevamiento };
    // Si Notion no trajo hora pero localStorage sí (caso degradado), tomarla
    if (!M.serviceState.horaInicio && ls.horaInicio) M.serviceState.horaInicio = ls.horaInicio;
    if (!M.serviceState.horaInicioEfectivo && ls.horaInicioEfectivo) M.serviceState.horaInicioEfectivo = ls.horaInicioEfectivo;
    if (!M.serviceState.horaCierreEfectivo && ls.horaCierreEfectivo) M.serviceState.horaCierreEfectivo = ls.horaCierreEfectivo;
    if (!toArr(M.serviceState.metodoTrabajo).length && ls.metodoTrabajo) M.serviceState.metodoTrabajo = toArr(ls.metodoTrabajo);
    if (!toArr(M.serviceState.herramientaManual).length && ls.herramientaManual) M.serviceState.herramientaManual = toArr(ls.herramientaManual);

    // Rehidratar FOTOS desde localStorage (auditoría 2026-07-09): hydrateServiceStateFromNotion corrió
    // antes y trae solo las 'done' ya commiteadas a Notion. Una foto recién subida cuyo flush (debounce 3s)
    // no llegó, o una 'queued' offline, viven solo en localStorage → sin esto se perdían de la vista aunque
    // la publicUrl fuera válida. Merge dedup por publicUrl (done) o por id (resto). El previewUrl guardado
    // es un blob: de la sesión anterior (muerto tras recargar) → descartarlo y usar la publicUrl del CDN.
    // 'uploading' zombie (su subida murió con la sesión, sin binario en cola) → 'error' para que se re-tome.
    if (ls.photos && typeof ls.photos === 'object') {
      ['pre', 'post', 'relevamiento'].forEach(ft => {
        const local = Array.isArray(ls.photos[ft]) ? ls.photos[ft] : [];
        if (!local.length) return;
        ensurePhotosBucket(ft);
        const existing = M.serviceState.photos[ft];
        const urls = new Set(existing.map(p => p.publicUrl).filter(Boolean));
        const ids = new Set(existing.map(p => p.id));
        local.forEach(lp => {
          if (!lp || (lp.publicUrl && urls.has(lp.publicUrl)) || ids.has(lp.id)) return;
          const base = { ...lp, previewUrl: lp.publicUrl || null };
          const photo = lp.status === 'uploading' ? { ...base, status: 'error', error: 'Se cortó la subida — reintentá' } : base;
          existing.push(photo);
          if (photo.publicUrl) urls.add(photo.publicUrl);
          ids.add(photo.id);
        });
      });
    }
    return true;
  } catch (e) { return false; }
}

export function computeStepFromState() {
  if (!STEPS || !STEPS.length) return 0;
  if (STEPS.length === 1) return 0; // ficha única (relevamiento): no hay a dónde saltar
  const idxOf = id => STEPS.findIndex(s => s.id === id);
  if (M.serviceState.horaCierreEfectivo) {
    const t = idxOf('fotos_despues');
    if (t >= 0) return t;
    // STEPS_SECTORES no tiene 'fotos_despues' (las fotos son por sector): tras el cierre efectivo
    // el paso natural es el checklist post, no saltar hasta Notas.
    const cp = idxOf('checklist_post');
    return cp >= 0 ? cp : Math.max(0, STEPS.length - 2);
  }
  if (M.serviceState.horaInicioEfectivo) {
    const t = idxOf('inicio_efectivo');
    return t >= 0 ? t : 1;
  }
  if (M.serviceState.horaInicio) {
    const t = idxOf('checklist_pre');
    return t >= 0 ? t : 1;
  }
  return 0;
}

export function servicioTieneSectores() {
  return Array.isArray(M.serviceState.sectores) && M.serviceState.sectores.length > 0;
}

// Un servicio "continúa" en otra jornada si tiene sectores, no están todos hechos, y ya se registró al menos una jornada.
export function servicioContinua(svc) {
  const p = svc?.properties || {};
  let sectores = []; let reg = [];
  try { sectores = JSON.parse(p['Estado sectores']?.rich_text?.[0]?.plain_text || '[]'); } catch (_) {}
  try { reg = JSON.parse(p['Registro jornadas']?.rich_text?.[0]?.plain_text || '[]'); } catch (_) {}
  const total = Array.isArray(sectores) ? sectores.length : 0;
  const hechos = Array.isArray(sectores) ? sectores.filter(s => s.estado === 'hecho').length : 0;
  const continua = total > 0 && hechos < total && Array.isArray(reg) && reg.length > 0;
  return { continua, hechos, total };
}

export function sectoresAvancePct() {
  const arr = M.serviceState.sectores || [];
  if (!arr.length) return 0;
  const hechos = arr.filter(s => s.estado === 'hecho').length;
  return Math.round((hechos / arr.length) * 100);
}

// PHOTO_MAX_BYTES + PHOTO_ALLOWED_MIMES viven en src/fotos.js (config de fotos, importada arriba).

// (initFotos se quedó en main — cablea fotos.js con serviceState/currentService de main.)

// Una foto cuenta como "tomada" si está subida ('done') o encolada offline ('queued'): en ambos casos
// el operario YA la sacó y se subirá al reconectar. Los gates de avance usan esto para NO trabar el
// trabajo sin señal. photosToNotionFiles sigue exigiendo 'done' (solo lo subido va a Notion).


// Aplica el resultado final de un upload al photo identificado por id, sin importar
// si el operario sigue en el mismo servicio o se movió a otro. Si está en el mismo,
// muta in-memory + persiste + re-renderiza. Si cambió, parchea solo el localStorage
// del servicio original (la mutación se hace visible al reabrirlo).



// Src de la miniatura: el blob LOCAL si existe (recién sacada); si no, la publicUrl POR EL PROXY /api/img.
// El <img> directo al CDN falla dentro de la app → por eso al reabrir un servicio ya subido "se veía 1 de N".
// Abre el visor grande con las fotos de ESE tipo (pre/post/relevamiento), empezando en la tocada.

// Fotos de un sector (filtradas de M.serviceState.photos[fotoType] por sectorId).

// Uploader de fotos para un sector: igual a renderPhotoUploader pero filtra por sectorId
// y el input pasa el sectorId al handler. id del input único por sector+fase.

export function refreshSectorOverlayIfOpen() {
  const ov = document.getElementById('sector-overlay');
  if (ov && ov.classList.contains('open')) renderSectorOverlay();
}

export async function loadServices() {
  if (!M.currentUser) { showScreen('login'); return; }
  markUserActive();
  showScreen('services');
  document.getElementById('header-user-name').textContent = (M.currentUser.emoji + ' ' + M.currentUser.name.split(' ')[0]);
  document.getElementById('services-sub').textContent = t('services.sub.loading2');
  loadAlerts(M.currentUser.role, 'alerts-banner-services');
  loadPilotoAgenda(); // agenda del piloto/participante — async aparte, no bloquea la lista principal
  document.getElementById('services-list').innerHTML = '<div style="text-align:center;padding:40px 0"><div class="spinner" style="margin:0 auto"></div></div>';
  document.getElementById('error-banner').classList.remove('visible');

  // Auto-reintento: Notion suele estar lento (no caído). Reintentamos 1 vez en silencio antes de
  // mostrar el error, así se va el "primero nada → error → datos".
  let services = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      services = await getMyServices(M.currentUser.id);
      break;
    } catch (err) {
      if (attempt === 0) {
        document.getElementById('services-sub').textContent = t('services.sub.loading2');
        await new Promise(r => setTimeout(r, 1200));
        continue;
      }
      document.getElementById('error-banner').classList.add('visible');
      document.getElementById('services-sub').textContent = t('services.sub.error');
      document.getElementById('services-list').innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">⚠️</div>
          <div class="empty-title">${t('services.connect.title')}</div>
          <div class="empty-text">${t('services.connect.text')}</div>
          <button class="refresh-btn" onclick="loadServices()">${t('services.retry')}</button>
        </div>`;
      return;
    }
  }
  if (services !== null) renderServices(services);
}

// ── 🚁 AGENDA DEL PILOTO (Fase 2A) ───────────────────────────────────────────
// Servicios activos donde el usuario participa SIN ser el encargado (piloto / operario manual / ayudante).
// Hoy no los ve en "Mis servicios" (getMyServices filtra por Operario App) → se entera por WhatsApp.
// READ-ONLY estricto: cards informativas (fecha/hora/lugar/encargado + mapa), sin abrir la ficha ejecutable.
// Fetch DIRECTO al proxy (patrón de openHistorialSheet): /api/db filtra operario=solo-encargado.
let _pilotoAgendaOpen = true; // expandido por default; el toggle se recuerda durante la sesión
export async function loadPilotoAgenda() {
  const cont = document.getElementById('piloto-agenda');
  if (!cont) return;
  try {
    const tok = localStorage.getItem('fc_token') || '';
    const resp = await fetch('/api/notion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + tok },
      body: JSON.stringify({ endpoint: `databases/${M.DB_ID}/query`, method: 'POST', body: { page_size: 100 } }),
    });
    if (!resp.ok) { cont.style.display = 'none'; return; } // fail silently — bloque secundario
    const data = await resp.json();
    const nombre = M.currentUser?.name || '';
    const paisNotion = M.COUNTRY_NOTION_MAP[M.currentUser?.country] || null;
    const validStates = ['📋 Pendiente', '🔄 Asignado', '✈️ En curso'];
    const items = (data.results || []).filter(r => {
      if (esArchivado(r)) return false;
      const p = r.properties || {};
      if (!validStates.includes(p['Estado']?.select?.name || '')) return false;
      const pais = p['País']?.select?.name || '';
      if (paisNotion && pais && pais !== paisNotion) return false; // cinturón país (patrón getMyServices)
      if ((p['Operario App']?.select?.name || '') === nombre) return false; // encargado: ya está en su lista
      return !!participaEn(p, nombre); // piloto / manual / ayudante
    }).sort((a, b) => {
      const fa = (a.properties?.['Fecha programada']?.date?.start || '9999') + (a.properties?.['Hora Inicio']?.date?.start || '');
      const fb = (b.properties?.['Fecha programada']?.date?.start || '9999') + (b.properties?.['Hora Inicio']?.date?.start || '');
      return fa.localeCompare(fb);
    });
    renderPilotoAgenda(items);
  } catch (_) { cont.style.display = 'none'; } // sin conexión / error: no molestar
}
export function togglePilotoAgenda() { _pilotoAgendaOpen = !_pilotoAgendaOpen; const b = document.getElementById('piloto-agenda-body'); const c = document.getElementById('piloto-agenda-chev'); if (b) b.style.display = _pilotoAgendaOpen ? 'block' : 'none'; if (c) c.textContent = _pilotoAgendaOpen ? '▾' : '▸'; }
export function renderPilotoAgenda(items) {
  const cont = document.getElementById('piloto-agenda');
  if (!cont) return;
  if (!items || !items.length) { cont.style.display = 'none'; cont.innerHTML = ''; return; }
  const nombre = M.currentUser?.name || '';
  const dateLocale = currentLang === 'pt-BR' ? 'pt-BR' : 'es-UY';
  const cards = items.map(r => {
    const p = r.properties || {};
    const svcNombre = p['Nombre del servicio']?.title?.[0]?.plain_text || t('common.sinnombre');
    const rol = participaEn(p, nombre) || '';
    const fecha = p['Fecha programada']?.date?.start || '';
    const fechaFmt = fecha ? new Date(fecha + 'T00:00:00').toLocaleDateString(dateLocale, { weekday: 'short', day: 'numeric', month: 'short' }) : '';
    const hora = (p['Hora Inicio']?.date?.start || '').slice(11, 16);
    const lugar = p['Lugar']?.rich_text?.[0]?.plain_text || '';
    const encargado = p['Operario App']?.select?.name || '';
    const mapa = (p['Mapa']?.url || '').trim();
    const mapaOk = /^https?:\/\//i.test(mapa); // solo http(s) — nunca javascript: u otros esquemas
    return '<div style="background:var(--card);border:1px solid var(--border);border-radius:12px;padding:10px 12px;margin-bottom:7px">' +
      '<div style="display:flex;justify-content:space-between;gap:8px;align-items:baseline">' +
        '<div style="font-size:13px;font-weight:700;min-width:0">' + esc(svcNombre) + '</div>' +
        '<span class="gasto-tag" style="flex:none">' + esc(rol) + '</span></div>' +
      '<div style="font-size:11.5px;color:var(--text2);margin-top:3px">' +
        (fechaFmt ? '📅 ' + esc(fechaFmt) : '') + (hora ? ' · 🕐 ' + esc(hora) : '') +
        (lugar ? ' · 📍 ' + esc(lugar) : '') + '</div>' +
      (encargado ? '<div style="font-size:11px;color:var(--text3);margin-top:2px">👤 ' + esc(t('piloto.agenda.encargado')) + ': ' + esc(encargado) + '</div>' : '') +
      (mapaOk ? '<a href="' + esc(mapa) + '" target="_blank" rel="noopener" style="display:inline-block;margin-top:7px;font-size:12px;color:#4da3ff;text-decoration:none">🗺️ ' + esc(t('step.info.abrirmapa')) + '</a>' : '') +
      '</div>';
  }).join('');
  cont.innerHTML =
    '<div style="margin:8px 16px 0">' +
      '<div onclick="togglePilotoAgenda()" style="display:flex;justify-content:space-between;align-items:center;cursor:pointer;padding:8px 12px;background:rgba(77,163,255,0.08);border:1px solid rgba(77,163,255,0.3);border-radius:10px">' +
        '<span style="font-size:12px;font-weight:700;color:#4da3ff">🚁 ' + esc(t('piloto.agenda.title')) + ' (' + items.length + ')</span>' +
        '<span id="piloto-agenda-chev" style="color:#4da3ff">' + (_pilotoAgendaOpen ? '▾' : '▸') + '</span></div>' +
      '<div id="piloto-agenda-body" style="margin-top:7px;display:' + (_pilotoAgendaOpen ? 'block' : 'none') + '">' + cards + '</div>' +
    '</div>';
  cont.style.display = 'block';
}

export function getEstadoClass(estado) {
  if (estado.includes('Pendiente')) return 'estado-pendiente';
  if (estado.includes('Asignado')) return 'estado-asignado';
  if (estado.includes('curso')) return 'estado-en-curso';
  if (estado.includes('Completado')) return 'estado-completado';
  return 'estado-pendiente';
}

// Agrupa una lista de servicios (YA ordenada por el caller) por día exacto de 'Fecha programada',

export function renderServices(services) {
  M._allServices = services;
  services = M._allServices.filter(s => {
    const tipoReg = s.properties?.['Tipo de registro']?.select?.name || '';
    const jornadaN = s.properties?.['Jornada N°']?.number;
    const isJornada = (jornadaN != null) || tipoReg.includes('Jornada');
    const isRelev = tipoReg.includes('Relevamiento');
    const isPrueba = tipoReg.includes('Prueba');
    if (M.activeTab === 'jornadas') return isJornada;
    if (M.activeTab === 'relevamientos') return isRelev;
    if (M.activeTab === 'pruebas') return isPrueba;
    // 'ordenes' (default): ni jornada ni relevamiento → solo órdenes de trabajo
    return !isJornada && !isRelev && !isPrueba;
  });
  const sub = document.getElementById('services-sub');
  const list = document.getElementById('services-list');

  if (services.length === 0) {
    sub.textContent = t('services.empty.sub');
// groupServicesByDay → src/coord-servicios.js (importada arriba; la usa también el operario).
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🚁</div>
        <div class="empty-title">${t('services.empty.title')}</div>
        <div class="empty-text">${t('services.empty.text')}</div>
        <button class="refresh-btn" onclick="loadServices()">${t('services.refresh')}</button>
      </div>`;
    return;
  }

  sub.textContent = `${services.length} ${services.length > 1 ? t('services.assigned.many') : t('services.assigned.one')}`;

  // Sort por fecha programada + hora programada (asc). Servicios sin hora van al final del día.
  services = services.slice().sort((a, b) => {
    const fA = a.properties?.['Fecha programada']?.date?.start || '9999-12-31';
    const fB = b.properties?.['Fecha programada']?.date?.start || '9999-12-31';
    if (fA !== fB) return fA.localeCompare(fB);
    const hA = a.properties?.['Hora Inicio']?.date?.start || '';
    const hB = b.properties?.['Hora Inicio']?.date?.start || '';
    if (!hA && hB) return 1;
    if (hA && !hB) return -1;
    return hA.localeCompare(hB);
  });

  // Store services globally for access (openService usa el índice sobre esta lista ordenada)
  window._services = services;
  const idxOf = new Map(services.map((s, i) => [s, i]));

  // La FECHA va como encabezado de grupo (groupServicesByDay); dentro de la card queda solo la hora
  // (no se duplica la fecha). Card por índice GLOBAL para que openService(i) siga apuntando bien.
  const cardHTML = (s, i) => {
    const props = s.properties;
    const nombre = props['Nombre del servicio']?.title?.[0]?.plain_text || t('common.sinnombre');
    const estado = props['Estado']?.select?.name || '📋 Pendiente';
    const horaInicio = props['Hora Inicio']?.date?.start || '';
    const tipo = tipoServicioStr(props);
    const pais = props['País']?.select?.name || '';
    const tipoReg = props['Tipo de registro']?.select?.name || '';
    const jornadaN = props['Jornada N°']?.number;
    const isJornada = tipoReg.includes('Jornada');
    const isPrueba = tipoReg.includes('Prueba');
    const horaFmt = (horaInicio && horaInicio.includes('T')) ? new Date(horaInicio).toTimeString().slice(0, 5) : '';
    const lugar = props['Lugar']?.rich_text?.[0]?.plain_text || '';
    return `
      <div class="service-card" onclick="openService(${i})" data-idx="${i}">
        <div class="service-estado ${getEstadoClass(estado)}">${estado}</div>
        <div class="service-nombre">${isPrueba ? `<span class="service-prueba-badge">${t('prueba.badge')}</span>` : ''}${esc(nombre)}</div>
        <div class="service-meta">
          ${horaFmt ? `<span class="service-tag">🕐 ${horaFmt}</span>` : ''}
          ${lugar ? `<span class="service-tag">📍 ${esc(lugar)}</span>` : ''}
          ${tipo ? `<span class="service-tag">${tipo}</span>` : ''}
          ${pais ? `<span class="service-tag">${pais}</span>` : ''}
        </div>
        ${isJornada && jornadaN ? `<div class="service-jornada-badge">📅 ${t('jornada.badge')} ${jornadaN}</div>` : ''}
        ${(() => { const c = servicioContinua(s); return c.continua ? `<span class="coord-tag" style="background:var(--amber-dark,#7c5300);color:var(--amber,#f59e0b)">${t('badge.continua').replace('{h}', c.hechos).replace('{t}', c.total)}</span>` : ''; })()}
      </div>`;
  };
  list.innerHTML = groupServicesByDay(services).map(g =>
    `<div class="day-group"><div class="day-label ${g.isHoy ? 'today' : ''}">${g.label} (${g.items.length})</div>${g.items.map(s => cardHTML(s, idxOf.get(s))).join('')}</div>`
  ).join('');
}

// ─────────────────────────────────────────────
// SERVICE DETAIL
// ─────────────────────────────────────────────
export async function openService(idx) {
  M.currentService = window._services[idx];
  M.currentStep = 0;
  resetServiceState();

  // Elegir el array de STEPS según el tipo de registro
  const tipoReg = M.currentService.properties?.['Tipo de registro']?.select?.name || '';
  STEPS = tipoReg.includes('Relevamiento') ? STEPS_RELEVAMIENTO : STEPS_SERVICIO;

  // Rehidratar progreso previo: Notion (hora, fotos, clima, resultado) + localStorage (checklist, notas).
  // Sin esto, reabrir un servicio iniciado pierde Hora Inicio y muestra "Iniciar" otra vez.
  hydrateServiceStateFromNotion(M.currentService);
  const hadLocal = hydrateServiceStateFromLocal(M.currentService.id);

  // Sectores: el coordinador los guardó en 'Estado sectores' como [{id,nombre,estado}].
  // El operario hereda esa lista; el estado de cada sector lo va actualizando. Si localStorage
  // tiene un estado más avanzado (reapertura), gana lo local (igual criterio que el checklist).
  try {
    const baseSec = JSON.parse(M.currentService.properties?.['Estado sectores']?.rich_text?.[0]?.plain_text || '[]');
    let localSec = [];
    try {
      const rawLs = localStorage.getItem(storageKeyForService(M.currentService.id));
      if (rawLs) localSec = JSON.parse(rawLs).state?.sectores || [];
    } catch (_) {}
    M.serviceState.sectores = (Array.isArray(baseSec) ? baseSec : []).map(s => {
      const ls = localSec.find(x => x.id === s.id);
      return { id: s.id, nombre: s.nombre, estado: (ls && ls.estado) || s.estado || 'pendiente' };
    });
  } catch (_) { M.serviceState.sectores = []; }
  // Snapshot de los sectores al abrir (para el parte por día: qué se completó HOY vs jornadas anteriores).
  M.serviceState.sectoresAlAbrir = (M.serviceState.sectores || []).map(s => ({ id: s.id, estado: s.estado }));
  // Parte por día acumulado (jornadas anteriores).
  try {
    M.serviceState.registroJornadas = JSON.parse(M.currentService.properties?.['Registro jornadas']?.rich_text?.[0]?.plain_text || '[]');
    if (!Array.isArray(M.serviceState.registroJornadas)) M.serviceState.registroJornadas = [];
  } catch (_) { M.serviceState.registroJornadas = []; }

  // Si tiene sectores (y no es relevamiento), usar el flujo recortado por sectores.
  if (!tipoReg.includes('Relevamiento') && servicioTieneSectores()) STEPS = STEPS_SECTORES;

  // Pre-cargar m² aproximados si ya existe en el servicio (útil para relevamientos)
  const m2Existing = M.currentService.properties?.['m² aproximados']?.number;
  if (m2Existing != null && !M.serviceState.relevamiento.m2) {
    M.serviceState.relevamiento.m2 = String(m2Existing);
  }
  // Hidratar el resto de la FICHA de relevamiento desde Notion (re-edición del mismo día: al finalizar se
  // limpia el localStorage, así que lo ya guardado vuelve de las properties — solo si el campo está vacío).
  if (tipoReg.includes('Relevamiento')) {
    const pr = M.currentService.properties || {};
    const rr = M.serviceState.relevamiento;
    const alturaEx = pr['Altura / Pisos']?.number;
    if (alturaEx != null && !rr.altura) rr.altura = String(alturaEx);
    if (!rr.dificultades.length) rr.dificultades = (pr['Dificultad de acceso']?.multi_select || []).map(o => o.name).filter(Boolean);
    if (!rr.servicioSugerido.length) rr.servicioSugerido = (pr['Servicio sugerido']?.multi_select || []).map(o => o.name).filter(Boolean);
    if (!rr.notasComercial) rr.notasComercial = pr['Notas pre-servicio']?.rich_text?.[0]?.plain_text || '';
  }

  // Saltar al paso correcto según el progreso ya hecho
  if (M.serviceState.horaInicio) {
    const computed = computeStepFromState();
    if (computed > 0) M.currentStep = Math.min(computed, STEPS.length - 1);
  }

  // A2 — Reintento de fotos huérfanas: si tenemos fotos en M.serviceState (localStorage o R2)
  // que no aparecen en las properties de Notion, disparar un flush inmediato a Notion.
  // Esto cubre el caso donde el operario subió fotos a R2, el debounce de 3s no alcanzó
  // a hacer flush, y la app se cerró antes.
  if (hadLocal) {
    flushPendingPhotosIfNeeded();
  }

  // Heredar URL de mapa del cliente y la propuesta vinculada (si el servicio no tiene override propio).
  // Se hace en paralelo antes del primer renderStep para que el botón 🗺️ aparezca correctamente
  // cuando la ubicación viene del cliente (caso de uso central de la Fase B).
  // Envuelto en try/catch: si falla no bloquea ni rompe el flujo del operario.
  try {
    const props = M.currentService.properties || {};
    const contactoId = props['Contacto']?.relation?.[0]?.id || props['Contactos']?.relation?.[0]?.id || '';
    const propId = props['Propuesta']?.relation?.[0]?.id || '';
    const svcId = M.currentService.id;
    await Promise.all([
      contactoId
        ? callNotion('pages/' + contactoId, 'GET')
            .then(c => { if (M.currentService?.id === svcId) { M.serviceState.clienteMapa = c?.properties?.['Mapa']?.url || ''; M.serviceState.clienteNombre = clienteNombre(c) || ''; } })
            .catch(() => {})
        : Promise.resolve(),
      propId
        ? callNotion('pages/' + propId, 'GET')
            .then(p => { if (M.currentService?.id === svcId) M.serviceState.propMapa = p?.properties?.['Mapa']?.url || ''; })
            .catch(() => {})
        : Promise.resolve()
    ]);
  } catch (_) {}

  const nombre = M.currentService.properties['Nombre del servicio']?.title?.[0]?.plain_text || t('detail.title.default');
  document.getElementById('detail-title').textContent = nombre;

  renderStepNav();
  renderStep();
  showScreen('detail');
}

export function flushPendingPhotosIfNeeded() {
  if (!M.currentService?.properties) return;
  const props = M.currentService.properties;
  const countLocal = (M.serviceState.photos?.pre?.length || 0)
                   + (M.serviceState.photos?.post?.length || 0)
                   + (M.serviceState.photos?.relevamiento?.length || 0);
  const countNotion = (props['📸 Fotos pre-servicio']?.files?.length || 0)
                    + (props['📸 Fotos post-servicio']?.files?.length || 0)
                    + (props['📸 Fotos relevamiento']?.files?.length || 0);
  if (countLocal > countNotion) {
    console.info(`[fc] flush fotos huérfanas: local=${countLocal} notion=${countNotion}`);
    persistServiceState({ immediateNotion: true });
  }
}

export function goBack() {
  showScreen('services');
}

export function renderStepNav() {
  const nav = document.getElementById('step-nav');
  if (STEPS.length === 1) { nav.innerHTML = ''; return; } // ficha única (relevamiento): sin barra de pasos
  nav.innerHTML = STEPS.map((s, i) => {
    let cls = '';
    if (i < M.currentStep) cls = 'done';
    else if (i === M.currentStep) cls = 'active';
    return `<div class="step-pill ${cls}" onclick="goToStep(${i})">${i < M.currentStep ? '✓' : i + 1}</div>`;
  }).join('');

  const fill = Math.round(((M.currentStep) / STEPS.length) * 100);
  document.getElementById('progress-fill').style.width = fill + '%';
}

export function goToStep(idx) {
  if (idx <= M.currentStep) { M.currentStep = idx; renderStepNav(); renderStep(); }
}

export function nextStep() {
  if (M.currentStep < STEPS.length - 1) {
    M.currentStep++;
    renderStepNav();
    renderStep();
    document.querySelector('.steps-container').scrollTop = 0;
  }
}

// Continuar desde el checklist PRE de vuelo (decisión Diego 2026-07-09 — "advertir pero dejar seguir"):
// el texto dice que los 16 ítems son obligatorios, pero antes se podía avanzar sin marcarlos y sin aviso.
// Ahora, si faltan ítems, se pide confirmación explícita; el operario decide (no lo bloqueamos en el campo).
export function checklistPreContinue() {
  const total = M.CHECKLIST_PRE.length;
  const done = Object.values(M.serviceState.checklistPre || {}).filter(Boolean).length;
  if (done < total && !confirm(t('checklist.pre.incomplete.confirm').replace('{n}', total - done))) return;
  nextStep();
}

// Renderiza el banner de "Cancelar inicio" cuando el operario inició el servicio
// pero todavía no apretó "Inicio efectivo" (la ventana donde des-iniciar es seguro).
export function renderCancelarBanner() {
  if (!M.serviceState.horaInicio || M.serviceState.horaInicioEfectivo) return '';
  return `<div class="cancelar-inicio-banner">
    <span>⏱️ ${t('step.iniciado.a.las')} <strong>${M.serviceState.horaInicio}</strong></span>
    <button onclick="cancelarInicio()">↩ ${t('btn.cancelar.inicio')}</button>
  </div>`;
}

export function renderStep() {
  const step = STEPS[M.currentStep];
  const props = M.currentService.properties;
  const nombre = props['Nombre del servicio']?.title?.[0]?.plain_text || '';
  const fecha = props['Fecha programada']?.date?.start || '';
  const horaInicio = props['Hora Inicio']?.date?.start || '';
  const horaFmt = (horaInicio && horaInicio.includes('T')) ? new Date(horaInicio).toTimeString().slice(0, 5) : '';
  const lugar = props['Lugar']?.rich_text?.[0]?.plain_text || '';
  const mapa = resolveMapsUrl({ svcMapa: props['Mapa']?.url || '', propMapa: M.serviceState.propMapa || '', clienteMapa: M.serviceState.clienteMapa || '' });
  const tipo = tipoServicioStr(props);
  const pais = props['País']?.select?.name || '';
  const tipoReg = props['Tipo de registro']?.select?.name || '';
  const encargadoNombre = props['Operario App']?.select?.name || '';
  const pilotoNombre = props['Piloto']?.select?.name || '';
  const operarioManualNombre = props['Operario manual']?.select?.name || '';
  const ayudantesNombres = (props['Operarios participantes']?.multi_select || []).map(o => o.name).join(', ');
  const notasPre = props['Notas pre-servicio']?.rich_text?.[0]?.plain_text || '';
  const m2 = props['m² aproximados']?.number || '';
  const dateLocale = currentLang === 'pt-BR' ? 'pt-BR' : 'es-UY';
  const fechaFmt = fecha ? new Date(fecha + 'T00:00:00').toLocaleDateString(dateLocale, { weekday: 'long', day: 'numeric', month: 'long' }) : t('step.info.nofecha');

  const content = document.getElementById('step-content');
  const bar = document.getElementById('bottom-bar');

  // ── STEP 0: INICIAR ──
  if (step.id === 'inicio') {
    content.innerHTML = `
      <div class="step-title">${t('step.inicio.title')}</div>
      <div class="step-sub">${t('step.inicio.sub')}</div>
      <div class="hint hint-blue">${t('step.inicio.hint')}</div>
      <div class="info-block">
        <div class="info-row"><span class="info-label">${t('step.info.nombre')}</span><span class="info-val">${esc(nombre)}</span></div>
        ${M.serviceState.clienteNombre ? `<div class="info-row"><span class="info-label">${t('step.info.cliente')}</span><span class="info-val">🏢 ${esc(M.serviceState.clienteNombre)}</span></div>` : ''}
        <div class="info-row"><span class="info-label">${t('step.info.fecha')}</span><span class="info-val">${fechaFmt}${horaFmt ? ' · ' + horaFmt : ''}</span></div>
        ${lugar ? `<div class="info-row"><span class="info-label">${t('step.info.lugar')}</span><span class="info-val">${esc(lugar)}</span></div>` : ''}
        <div class="info-row"><span class="info-label">${t('step.info.tipo')}</span><span class="info-val">${esc(tipo)}</span></div>
        <div class="info-row"><span class="info-label">${t('step.info.pais')}</span><span class="info-val">${esc(pais)}</span></div>
        ${m2 ? `<div class="info-row"><span class="info-label">${t('step.info.m2')}</span><span class="info-val">${m2} m²</span></div>` : ''}
        <div class="info-row"><span class="info-label">${t('step.info.tiporeg')}</span><span class="info-val">${esc(tipoReg)}</span></div>
        ${encargadoNombre ? `<div class="info-row"><span class="info-label">${t('step.info.encargado')}</span><span class="info-val">${esc(encargadoNombre)}</span></div>` : ''}
        ${pilotoNombre ? `<div class="info-row"><span class="info-label">${t('step.info.piloto')}</span><span class="info-val">${esc(pilotoNombre)}</span></div>` : ''}
        ${operarioManualNombre ? `<div class="info-row"><span class="info-label">${t('step.info.manual')}</span><span class="info-val">${esc(operarioManualNombre)}</span></div>` : ''}
        ${ayudantesNombres ? `<div class="info-row"><span class="info-label">${t('step.info.ayudantes')}</span><span class="info-val">${esc(ayudantesNombres)}</span></div>` : ''}
      </div>
      ${(notasPre && !tipoReg.includes('Relevamiento')) ? `<div class="hint hint-amber" style="white-space:pre-wrap;margin-top:10px"><strong>${t('step.info.notaspre')}</strong><br>${esc(notasPre)}</div>` : ''}
      ${mapa ? `<a href="${mapa}" target="_blank" rel="noopener" class="btn-main btn-blue" style="display:block;text-align:center;text-decoration:none;margin:12px 0">🗺️ ${t('step.info.abrirmapa')}</a>` : ''}
      ${M.serviceState.horaInicio ? `<div class="ts-recorded"><div class="ts-label">${t('step.inicio.recorded')}</div><div class="ts-value">${M.serviceState.horaInicio}</div></div>` : ''}
      <div id="op-equipos-section" style="margin-top:14px"></div>
    `;
    // Equipos asignados (read-only para el operario, solo si no es relevamiento)
    const tipoRegOp = M.currentService?.properties?.['Tipo de registro']?.select?.name || '';
    if (!tipoRegOp.includes('Relevamiento')) {
      Promise.all([fetchEquiposDelServicio(M.currentService.id), fetchActivosDisponibles()])
        .then(([equipos]) => {
          const sec = document.getElementById('op-equipos-section');
          if (!sec || !equipos.length) return;
          const byId = new Map((M._activosCache?.items || []).map(a => [a.id, a]));
          sec.innerHTML = `<div class="edit-section-label" style="font-size:11px;color:var(--text3);margin-bottom:6px">${t('op.equipos.label')}</div>` +
            equipos.map(e => {
              const a = byId.get(e.activoId);
              const name = a ? a.name : e.activoName;
              const meta = a ? [a.tipo, a.serie ? `S/N ${a.serie}` : '', a.marca].filter(Boolean).join(' · ') : '';
              return `<div class="equipo-chip"><div class="equipo-chip-info"><div class="equipo-chip-name">${esc(name)}</div>${meta ? `<div class="equipo-chip-meta">${esc(meta)}</div>` : ''}</div></div>`;
            }).join('');
        });
    }

    if (!M.serviceState.horaInicio) {
      bar.innerHTML = `<button class="btn-main btn-green" onclick="iniciarServicio()">${t('step.inicio.btn')}</button>`;
    } else {
      bar.innerHTML = `<button class="btn-main btn-green" onclick="nextStep()">${t('step.inicio.continue')}</button>`;
    }
  }

  // ── STEP 1: CHECKLIST PRE ──
  else if (step.id === 'checklist_pre') {
    const done = Object.values(M.serviceState.checklistPre).filter(Boolean).length;
    content.innerHTML = `
      ${renderCancelarBanner()}
      <div class="step-title">${t('step.pre.title')}</div>
      <div class="step-sub">${t('step.pre.sub')}</div>
      <div class="hint hint-green">${t('step.pre.hint')}</div>
      <div class="check-count">${done} / ${M.CHECKLIST_PRE.length} ${t('step.checklist.completed')}</div>
      ${M.CHECKLIST_PRE.map((item, i) => `
        <div class="check-item ${M.serviceState.checklistPre[i] ? 'checked' : ''}" onclick="toggleCheck('pre', ${i})">
          <div class="checkbox">${M.serviceState.checklistPre[i] ? '✓' : ''}</div>
          <span class="check-label">${esc(item)}</span>
        </div>`).join('')}
      <div style="height:20px"></div>
    `;
    bar.innerHTML = `
      <button class="btn-secondary" onclick="goToStep(currentStep - 1)">${t('btn.back')}</button>
      <button class="btn-main btn-green" onclick="checklistPreContinue()">${t('btn.continue')}</button>
    `;
  }

  // ── STEP 2: FOTOS ANTES ──
  else if (step.id === 'fotos_antes') {
    content.innerHTML = `
      ${renderCancelarBanner()}
      <div class="step-title">${t('step.fotos.antes.title')}</div>
      <div class="step-sub">${t('step.fotos.antes.sub')}</div>
      <div class="hint hint-amber">${t('step.fotos.antes.hint')}</div>
      ${renderPhotoUploader('pre', 2)}
    `;
    bar.innerHTML = `
      <button class="btn-secondary" onclick="goToStep(currentStep - 1)">${t('btn.back')}</button>
      <button class="btn-main btn-green" onclick="nextStep()">${t('btn.continue')}</button>
    `;
  }

  // ── STEP 3: INICIO EFECTIVO ──
  else if (step.id === 'inicio_efectivo') {
    const climaOpts = [
      { val: '🟢 Óptima Viento 0 a 20kmh', label: '🟢 Óptima — Viento 0-20 km/h', cls: 'green' },
      { val: '🟡 Precaución Viento 20 a 25kmh', label: '🟡 Precaución — Viento 20-25 km/h', cls: 'yellow' },
      { val: '🔴 Suspendido 25 a 50kmh', label: '🔴 Suspendido — Viento +25 km/h', cls: 'red' },
      { val: '🟢 Óptima KP 0-2', label: '🟢 Óptima — KP 0-2', cls: 'green' },
      { val: '🟡 Precaución KP 2-4', label: '🟡 Precaución — KP 2-4', cls: 'yellow' },
      { val: '🔴 Suspendido +KP4', label: '🔴 Suspendido — KP +4', cls: 'red' },
    ];
    const herrOpts = [
      { val: 'Lanzas', key: 'step.metodo.herr.lanzas' },
      { val: 'Manguera', key: 'step.metodo.herr.manguera' },
      { val: 'Hidrolavadora', key: 'step.metodo.herr.hidro' },
      { val: 'Otro', key: 'step.metodo.herr.otro' },
    ];
    const metodoArr = toArr(M.serviceState.metodoTrabajo);
    const herrArr = toArr(M.serviceState.herramientaManual);
    const esManual = metodoArr.includes('💪 Manual');
    content.innerHTML = `
      ${renderCancelarBanner()}
      <div class="step-title">${t('step.inicioef.title')}</div>
      <div class="step-sub">${t('step.inicioef.sub')}</div>

      <div class="field-group">
        <div class="form-label">${t('step.clima.label')}</div>
        <div class="hint hint-blue" style="margin-bottom:10px">${t('step.clima.hint')}</div>
        <div class="clima-group">
          ${climaOpts.map(o => `<div class="clima-opt ${o.cls} ${(Array.isArray(M.serviceState.clima) ? M.serviceState.clima : []).includes(o.val) ? 'selected' : ''}" onclick="selectClima('${o.val}')">${o.label}</div>`).join('')}
        </div>
      </div>

      <div class="field-group">
        <div class="form-label">${t('step.metodo.label')}</div>
        <div class="hint hint-blue" style="margin-bottom:10px">${t('step.metodo.hint')}</div>
        <div class="metodo-group">
          <button type="button" class="metodo-btn ${metodoArr.includes('🚁 Dron') ? 'active' : ''}" onclick="selectMetodoTrabajo('🚁 Dron')">${t('step.metodo.dron')}</button>
          <button type="button" class="metodo-btn ${esManual ? 'active' : ''}" onclick="selectMetodoTrabajo('💪 Manual')">${t('step.metodo.manual')}</button>
        </div>
        ${esManual ? `
          <div class="form-label" style="margin-top:12px">${t('step.metodo.herramienta.label')}</div>
          <div class="herr-group">
            ${herrOpts.map(o => `<button type="button" class="herr-btn ${herrArr.includes(o.val) ? 'active' : ''}" onclick="selectHerramientaManual('${o.val}')">${t(o.key)}</button>`).join('')}
          </div>` : ''}
      </div>

      <div class="hint hint-amber" style="margin-top:12px">${t('step.inicioef.hint')}</div>
      ${M.serviceState.horaInicioEfectivo
        ? `<div class="ts-recorded"><div class="ts-label">${t('step.inicioef.recorded')}</div><div class="ts-value">${M.serviceState.horaInicioEfectivo}</div></div>`
        : `<button class="btn-main btn-purple" style="margin-top:16px" onclick="registrarInicioEfectivo()">${t('step.inicioef.btn')}</button>`
      }
    `;
    // "Continuar" AUTO-REGISTRA el inicio si falta (fix 2026-07-12: antes se podía avanzar sin registrar
    // → ningún servicio quedaba con Hora Inicio Efectivo y el historial/jornales daban 0).
    bar.innerHTML = `
      <button class="btn-secondary" onclick="goToStep(currentStep - 1)">${t('btn.back')}</button>
      <button class="btn-main btn-green" onclick="continuarInicioEfectivo()">${t('btn.continue')}</button>
    `;
  }

  // ── STEP 4: EJECUCIÓN ──
  else if (step.id === 'ejecucion') {
    if (servicioTieneSectores()) {
      const arr = M.serviceState.sectores || [];
      const pct = sectoresAvancePct();
      const hechos = arr.filter(s => s.estado === 'hecho').length;
      const iconFor = e => e === 'hecho' ? '✅' : (e === 'en_curso' ? '🔵' : '⚪');
      content.innerHTML = `
        <div class="step-title">${t('step.sectores.title')}</div>
        <div class="step-sub">${t('step.sectores.sub')}</div>
        <div class="sectores-progress">
          <div class="sectores-progress-bar"><div class="sectores-progress-fill" style="width:${pct}%"></div></div>
          <div class="sectores-progress-label">${hechos} / ${arr.length} ${t('step.sectores.hechos')} · ${pct}%</div>
        </div>
        <div class="sectores-list">
          ${arr.map(s => `
            <button type="button" class="sector-row sector-${s.estado}" data-id="${escAttrEdit(s.id)}" onclick="openSectorOverlay(this.dataset.id)">
              <span class="sector-row-icon">${iconFor(s.estado)}</span>
              <span class="sector-row-name">${esc(s.nombre)}</span>
              <span class="sector-row-estado">${t('sector.estado.' + s.estado)}</span>
            </button>`).join('')}
        </div>
        <div style="height:20px"></div>
      `;
      bar.innerHTML = `
        <button class="btn-secondary" onclick="goToStep(currentStep - 1)">${t('btn.back')}</button>
        <button class="btn-main btn-orange" onclick="nextStep()">${t('step.ejec.continue')}</button>
      `;
    } else {
      content.innerHTML = `
        <div class="step-title">${t('step.ejec.title')}</div>
        <div class="step-sub">${t('step.ejec.sub')}</div>
        <div class="hint hint-green">${t('step.ejec.hint')}</div>
        ${M.serviceState.horaInicioEfectivo ? `<div class="ts-recorded"><div class="ts-label">${t('step.ejec.tsLabel')}</div><div class="ts-value">${M.serviceState.horaInicioEfectivo}</div></div>` : ''}
        <div style="text-align:center;padding:40px 0;font-size:64px">🚁</div>
      `;
      bar.innerHTML = `
        <button class="btn-secondary" onclick="goToStep(currentStep - 1)">${t('btn.back')}</button>
        <button class="btn-main btn-orange" onclick="nextStep()">${t('step.ejec.continue')}</button>
      `;
    }
  }

  // ── STEP 5: CIERRE EFECTIVO ──
  else if (step.id === 'cierre_efectivo') {
    content.innerHTML = `
      <div class="step-title">${t('step.cierreef.title')}</div>
      <div class="step-sub">${t('step.cierreef.sub')}</div>
      <div class="hint hint-amber">${t('step.cierreef.hint')}</div>
      ${M.serviceState.horaInicioEfectivo ? `<div class="ts-recorded"><div class="ts-label">${t('step.ejec.tsLabel')}</div><div class="ts-value">${M.serviceState.horaInicioEfectivo}</div></div>` : ''}
      ${M.serviceState.horaCierreEfectivo
        ? `<div class="ts-recorded"><div class="ts-label">${t('step.cierreef.recorded')}</div><div class="ts-value">${M.serviceState.horaCierreEfectivo}</div></div>`
        : `<button class="btn-main btn-orange" style="margin-top:16px" onclick="registrarCierreEfectivo()">${t('step.cierreef.btn')}</button>`
      }
    `;
    // Idem inicio: "Continuar" auto-registra el cierre si falta (mismo agujero, mismo fix).
    bar.innerHTML = `
      <button class="btn-secondary" onclick="goToStep(currentStep - 1)">${t('btn.back')}</button>
      <button class="btn-main btn-green" onclick="continuarCierreEfectivo()">${t('btn.continue')}</button>
    `;
  }

  // ── STEP 6: CHECKLIST POST ──
  else if (step.id === 'checklist_post') {
    const done = Object.values(M.serviceState.checklistPost).filter(Boolean).length;
    content.innerHTML = `
      <div class="step-title">${t('step.post.title')}</div>
      <div class="step-sub">${t('step.post.sub')}</div>
      <div class="hint hint-blue">${t('step.post.hint')}</div>
      <div class="check-count">${done} / ${M.CHECKLIST_POST.length} ${t('step.checklist.completed')}</div>
      ${M.CHECKLIST_POST.map((item, i) => `
        <div class="check-item ${M.serviceState.checklistPost[i] ? 'checked' : ''}" onclick="toggleCheck('post', ${i})">
          <div class="checkbox">${M.serviceState.checklistPost[i] ? '✓' : ''}</div>
          <span class="check-label">${esc(item)}</span>
        </div>`).join('')}
      <div style="height:20px"></div>
    `;
    bar.innerHTML = `
      <button class="btn-secondary" onclick="goToStep(currentStep - 1)">${t('btn.back')}</button>
      <button class="btn-main btn-green" onclick="nextStep()">${t('btn.continue')}</button>
    `;
  }

  // ── STEP 7: FOTOS DESPUÉS ──
  else if (step.id === 'fotos_despues') {
    content.innerHTML = `
      <div class="step-title">${t('step.fotos.despues.title')}</div>
      <div class="step-sub">${t('step.fotos.despues.sub')}</div>
      <div class="hint hint-amber">${t('step.fotos.despues.hint')}</div>
      ${renderPhotoUploader('post', 2)}
    `;
    bar.innerHTML = `
      <button class="btn-secondary" onclick="goToStep(currentStep - 1)">${t('btn.back')}</button>
      <button class="btn-main btn-green" onclick="nextStep()">${t('btn.continue')}</button>
    `;
  }

  // ── STEP 8: OBSERVACIONES ──
  else if (step.id === 'observaciones') {
    const tipoReg = M.currentService?.properties?.['Tipo de registro']?.select?.name || '';
    const conSectores = servicioTieneSectores();
    const isPrueba = tipoReg.includes('Prueba');
    content.innerHTML = `
      <div class="step-title">${t('step.obs.title')}</div>
      <div class="step-sub">${t('step.obs.sub')}</div>

      <div class="field-group">
        <div class="form-label">${t('step.obs.notas.label')}</div>
        <textarea rows="3" placeholder="${t('step.obs.notas.placeholder')}" id="notas-input" oninput="serviceState.notasPost=this.value; persistServiceStateToLocal();">${esc(M.serviceState.notasPost || '')}</textarea>
      </div>

      ${conSectores ? `
    <div class="field-group">
      <div class="form-label">${t('step.obs.avance.label')}</div>
      <div class="hint hint-blue" style="margin-bottom:6px">${t('step.obs.avance.auto')}</div>
      <div style="font-size:24px;font-weight:800;text-align:center;color:var(--green)">${sectoresAvancePct()}%</div>
      <div style="font-size:12px;color:var(--text3);text-align:center;margin-top:4px">${M.serviceState.sectores.filter(s=>s.estado==='hecho').length} / ${M.serviceState.sectores.length} ${t('step.sectores.hechos')}</div>
    </div>
    ` : ''}

      ${(!conSectores && !isPrueba && !tipoReg.includes('Relevamiento')) ? `
    <div class="field-group">
      <div class="form-label">${t('close.termino.label')}</div>
      <div class="radio-group">
        <div class="radio-opt ${M.serviceState.finalizacion === 'termino' ? 'selected' : ''}" onclick="selectFinalizacion('termino')">${t('close.termino.si')}</div>
        <div class="radio-opt ${M.serviceState.finalizacion === 'continua' ? 'selected' : ''}" onclick="selectFinalizacion('continua')">${t('close.termino.no')}</div>
      </div>
    </div>
    ${M.serviceState.finalizacion === 'continua' ? `
    <div class="field-group">
      <div class="form-label">${t('close.jornada.pct.label')}</div>
      <div class="hint hint-blue" style="margin-bottom:10px">${t('close.jornada.pct.hint')}</div>
      <input type="number" min="1" max="99" placeholder="${t('close.jornada.pct.placeholder')}" id="avance-input" value="${M.serviceState.avance}" oninput="serviceState.avance=this.value; persistServiceStateToLocal();" style="font-size:18px;text-align:center;font-weight:700"/>
    </div>
    ` : ''}
    ` : ''}

      ${(!conSectores && !isPrueba && !tipoReg.includes('Relevamiento') && M.serviceState.finalizacion !== 'termino') ? '' : `
      <div class="field-group">
        <div class="form-label">${isPrueba ? t('step.obs.resultado.prueba.label') : t('step.obs.resultado.label')}</div>
        <div class="radio-group">
          ${(isPrueba
              ? [t('prueba.resultado.avanza'), t('prueba.resultado.nointeresado'), t('prueba.resultado.recontactar')]
              : ['✅ Exitoso', '⚠️ Con incidencia', '❌ Fallido']
            ).map(r => `
            <div class="radio-opt ${(isPrueba ? M.serviceState.resultadoPrueba : M.serviceState.resultado) === r ? 'selected' : ''}" onclick="${isPrueba ? `selectResultadoPrueba('${r}')` : `selectResultado('${r}')`}">${r}</div>
          `).join('')}
        </div>
      </div>
      `}
      <div style="height:20px"></div>
    `;
    bar.innerHTML = `
      <button class="btn-secondary" onclick="goToStep(currentStep - 1)">${t('btn.back')}</button>
      <button class="btn-main btn-green" onclick="nextStep()">${t('btn.continue')}</button>
    `;
  }

  // ── FICHA DE RELEVAMIENTO (pantalla única, pedido Diego 16/07) ──
  // No es servicio ni prueba: es una PLANILLA que se llena libre y con la que después se arma el
  // presupuesto. Todo se auto-guarda (localStorage + Notion con debounce); puede salir y volver.
  else if (step.id === 'ficha_relev') {
    const r = M.serviceState.relevamiento;
    const DIFICULTADES = ['🚧 Acceso restringido','💧 Sin agua disponible','⚡ Sin electricidad','⚠️ Riesgo eléctrico','🌬️ Vientos frecuentes','🏗️ Andamios necesarios','🪜 Altura significativa (>5 pisos)','🔒 Requiere coordinación especial'];
    const SUGERIDOS = ['🏢 Fachada','🪟 Vidrios','☀️ Paneles solares','🔄 Combinado'];
    const fotosOk = (M.serviceState.photos?.relevamiento || []).filter(fotoTomada).length;
    content.innerHTML = `
      <div class="step-title">🔍 ${t('relev.ficha.title')}</div>
      <div class="step-sub">${esc(nombre)}${M.serviceState.clienteNombre ? ' · 🏢 ' + esc(M.serviceState.clienteNombre) : ''}</div>
      ${relevEditableHoy() ? `<div class="hint hint-amber">${t('relev.ficha.editable.banner')}</div>` : `<div class="hint hint-blue">${t('relev.ficha.autosave')}</div>`}

      <div class="info-block" style="margin-bottom:14px">
        <div class="info-row"><span class="info-label">${t('step.info.fecha')}</span><span class="info-val">${fechaFmt}</span></div>
        ${lugar ? `<div class="info-row"><span class="info-label">${t('step.info.lugar')}</span><span class="info-val">${esc(lugar)}</span></div>` : ''}
        <div class="info-row"><span class="info-label">${t('step.info.pais')}</span><span class="info-val">${esc(pais)}</span></div>
      </div>

      <div class="field-group">
        <div class="form-label">📍 ${t('relev.ficha.ubicacion')}</div>
        ${mapa ? `<a href="${mapa}" target="_blank" rel="noopener" class="btn-main btn-blue" style="display:block;text-align:center;text-decoration:none;margin-bottom:8px">🗺️ ${t('step.info.abrirmapa')}</a>` : ''}
        <input type="url" id="relev-mapa-input" class="edit-date-input" placeholder="${t('relev.ficha.ubicacion.ph')}" value="${esc(M.currentService?.properties?.['Mapa']?.url || '')}"/>
        <button type="button" class="btn-secondary" style="width:100%;margin-top:6px" onclick="fichaRelevGuardarMapa()">${t('relev.ficha.ubicacion.guardar')}</button>
      </div>

      <div class="field-group">
        <div class="form-label">📐 ${t('relev.m2.label')}</div>
        <input type="number" min="0" placeholder="${t('relev.m2.placeholder')}" value="${r.m2}" oninput="serviceState.relevamiento.m2=this.value; persistServiceStateToLocal();" style="font-size:18px;text-align:center;font-weight:700"/>
      </div>

      <div class="field-group">
        <div class="form-label">${t('relev.altura.label')}</div>
        <input type="number" min="0" placeholder="${t('relev.altura.placeholder')}" value="${r.altura}" oninput="serviceState.relevamiento.altura=this.value; persistServiceStateToLocal();" style="font-size:18px;text-align:center;font-weight:700"/>
      </div>

      <div class="field-group">
        <div class="form-label">${t('relev.dificultad.label')}</div>
        <div class="clima-group">
          ${DIFICULTADES.map(d => `<div class="clima-opt yellow ${r.dificultades.includes(d) ? 'selected' : ''}" onclick="relevToggleDif('${d.replace(/'/g,"\\'")}')">${d}</div>`).join('')}
        </div>
      </div>

      <div class="field-group">
        <div class="form-label">${t('relev.sugerido.label')}</div>
        <div class="radio-group">
          ${SUGERIDOS.map(s => `<div class="radio-opt ${r.servicioSugerido.includes(s) ? 'selected' : ''}" onclick="relevToggleSugerido('${s.replace(/'/g,"\\'")}')">${s}</div>`).join('')}
        </div>
      </div>

      <div class="field-group">
        <div class="form-label">📸 ${t('relev.step.fotos.title')}</div>
        <div class="hint hint-amber">${t('relev.ficha.fotos.hint')}</div>
        ${renderPhotoUploader('relevamiento', 0, { gallery: true })}
      </div>

      <div class="field-group">
        <div class="form-label">📝 ${t('relev.notas.label')}</div>
        <textarea rows="5" placeholder="${t('relev.notas.placeholder')}" oninput="serviceState.relevamiento.notasComercial=this.value; persistServiceStateToLocal();">${esc(M.serviceState.relevamiento.notasComercial || '')}</textarea>
      </div>

      <div class="summary-card" style="margin-top:6px">
        <div class="summary-title">${t('relev.summary.title')}</div>
        <div class="summary-row"><span class="summary-key">📐 ${t('relev.m2.label')}</span><span class="summary-val">${r.m2 ? r.m2 + ' m²' : '—'}</span></div>
        <div class="summary-row"><span class="summary-key">${t('relev.altura.label')}</span><span class="summary-val">${r.altura || '—'}</span></div>
        <div class="summary-row"><span class="summary-key">📸 ${t('relev.fotos.label')}</span><span class="summary-val">${fotosOk}</span></div>
        <div class="summary-row"><span class="summary-key">📝 ${t('relev.notas.label')}</span><span class="summary-val">${r.notasComercial ? '✓' : '—'}</span></div>
      </div>
      <div style="height:20px"></div>
    `;
    bar.innerHTML = `
      <button id="ficha-finalizar-btn" class="btn-main btn-green" onclick="fichaRelevFinalizar()">${relevEditableHoy() ? '💾 ' + t('relev.ficha.guardar') : '✅ ' + t('relev.ficha.finalizar')}</button>
    `;
  }

  // ── STEP 9: CERRAR ──
  else if (step.id === 'cerrar') {
    const isRelev = STEPS === STEPS_RELEVAMIENTO;
    let summaryRows = '';

    if (isRelev) {
      const r = M.serviceState.relevamiento;
      const fotosCount = (M.serviceState.photos?.relevamiento || []).filter(fotoTomada).length;
      summaryRows = `
        <div class="summary-row"><span class="summary-key">📐 ${t('relev.m2.label')}</span><span class="summary-val">${r.m2 ? r.m2 + ' m²' : '—'}</span></div>
        <div class="summary-row"><span class="summary-key">${t('relev.altura.label')}</span><span class="summary-val">${r.altura || '—'}</span></div>
        <div class="summary-row"><span class="summary-key">${t('relev.dificultad.label')}</span><span class="summary-val">${r.dificultades.length || '—'}</span></div>
        <div class="summary-row"><span class="summary-key">${t('relev.sugerido.label')}</span><span class="summary-val">${r.servicioSugerido.join(', ') || '—'}</span></div>
        <div class="summary-row"><span class="summary-key">📸 ${t('relev.fotos.label')}</span><span class="summary-val">${fotosCount}</span></div>
        <div class="summary-row"><span class="summary-key">📝 ${t('relev.notas.label')}</span><span class="summary-val">${r.notasComercial ? '✓' : '—'}</span></div>
      `;
    } else {
      const preCount = Object.values(M.serviceState.checklistPre).filter(Boolean).length;
      const postCount = Object.values(M.serviceState.checklistPost).filter(Boolean).length;
      summaryRows = `
        <div class="summary-row"><span class="summary-key">${t('summary.horainicio')}</span><span class="summary-val">${M.serviceState.horaInicio || '—'}</span></div>
        <div class="summary-row"><span class="summary-key">${t('summary.inicioef')}</span><span class="summary-val">${M.serviceState.horaInicioEfectivo || '—'}</span></div>
        <div class="summary-row"><span class="summary-key">${t('summary.cierreef')}</span><span class="summary-val">${M.serviceState.horaCierreEfectivo || '—'}</span></div>
        <div class="summary-row"><span class="summary-key">${t('summary.checklist.pre')}</span><span class="summary-val">${preCount} / ${M.CHECKLIST_PRE.length}</span></div>
        <div class="summary-row"><span class="summary-key">${t('summary.checklist.post')}</span><span class="summary-val">${postCount} / ${M.CHECKLIST_POST.length}</span></div>
        <div class="summary-row"><span class="summary-key">${t('summary.avance')}</span><span class="summary-val">${M.serviceState.avance ? M.serviceState.avance + '%' : '—'}</span></div>
        <div class="summary-row"><span class="summary-key">${t('summary.resultado')}</span><span class="summary-val">${(M.currentService?.properties?.['Tipo de registro']?.select?.name || '').includes('Prueba') ? (M.serviceState.resultadoPrueba || '—') : (M.serviceState.resultado || '—')}</span></div>
        <div class="summary-row"><span class="summary-key">${t('summary.clima')}</span><span class="summary-val">${(Array.isArray(M.serviceState.clima) ? M.serviceState.clima : (M.serviceState.clima ? [M.serviceState.clima] : [])).join(', ') || '—'}</span></div>
      `;
    }

    content.innerHTML = `
      <div class="step-title">${isRelev ? t('relev.step.cerrar.title') : t('step.cerrar.title')}</div>
      <div class="step-sub">${t('step.cerrar.sub')}</div>
      <div class="hint hint-green">${t('step.cerrar.hint')}</div>

      <div class="summary-card">
        <div class="summary-title">${isRelev ? t('relev.summary.title') : t('summary.title')}</div>
        ${summaryRows}
      </div>
      <div style="height:20px"></div>
    `;
    bar.innerHTML = `
      <button class="btn-secondary" onclick="goToStep(${M.currentStep - 1})">${t('btn.back')}</button>
      <button class="btn-main btn-red" onclick="cerrarServicio()">${t('btn.close.notion')}</button>
    `;
  }
}

// ─────────────────────────────────────────────
// ACTIONS
// ─────────────────────────────────────────────
export function isoNow() { return new Date().toISOString(); }
export function timeNow() { return new Date().toLocaleTimeString('es-UY', { hour: '2-digit', minute: '2-digit' }); }

// M10 — Pedir ubicación GPS al operario con Aviso de Privacidad Simplificado previo
// (requisito México LFPDPPP art. 16). Si rechaza, devuelve null y se continúa sin GPS.
export function requestUserLocationWithConsent(timeoutMs = 10000) {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    // Recordar el consentimiento (auditoría 2026-07-09): antes se mostraba el Aviso Simplificado en CADA
    // inicio de servicio. Si el operario ya dio OK una vez, saltamos el modal y localizamos directo. El
    // consentimiento queda REGISTRADO (auditable) en localStorage con su timestamp — cumple el aviso previo.
    const overlay = document.createElement('div');
    overlay.className = 'gps-overlay';
    const cleanup = () => { try { document.body.removeChild(overlay); } catch (_) {} };
    // Localiza mostrando el spinner (el GPS frío puede tardar varios segundos → sin esto la pantalla "cuelga").
    const locate = () => {
      const modal = overlay.querySelector('.gps-modal');
      if (modal) {
        modal.innerHTML = `
          <div class="gps-emoji">📍</div>
          <div class="gps-title">${t('gps.locating.title')}</div>
          <div class="gps-body">${t('gps.locating.body')}</div>
          <div style="margin:18px 0"><div class="spinner" style="margin:0 auto"></div></div>
        `;
      }
      navigator.geolocation.getCurrentPosition(
        pos => { cleanup(); resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }); },
        err => { cleanup(); console.warn('[gps] denied or failed:', err.message); resolve(null); },
        { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 60000 }
      );
    };

    // Ya consintió antes → sin re-preguntar: solo spinner + localizar.
    if (localStorage.getItem('fc_gps_consent') === 'allow') {
      overlay.innerHTML = `<div class="gps-modal"></div>`;
      document.body.appendChild(overlay);
      locate();
      return;
    }

    // Primera vez (o nunca aceptó) → Aviso Simplificado.
    overlay.innerHTML = `
      <div class="gps-modal">
        <div class="gps-emoji">📍</div>
        <div class="gps-title">Compartir ubicación</div>
        <div class="gps-body">FlyClean usa tu ubicación GPS sólo para registrar dónde se realiza el servicio. La info queda en el registro del servicio (no se comparte con terceros, no se usa para rastreo).</div>
        <div class="gps-actions">
          <button class="gps-btn gps-btn-skip" id="gps-skip">Omitir</button>
          <button class="gps-btn gps-btn-allow" id="gps-allow">Permitir</button>
        </div>
        <div class="gps-fineprint">Podés cambiar esta decisión luego en los ajustes del sistema.<br>Ver <a href="/privacy" target="_blank" rel="noopener">Política de Privacidad</a>.</div>
      </div>
    `;
    document.body.appendChild(overlay);
    document.getElementById('gps-skip').onclick = () => { cleanup(); resolve(null); };
    document.getElementById('gps-allow').onclick = () => {
      // Registrar el consentimiento (auditable) → no volver a preguntar en los próximos servicios.
      try { localStorage.setItem('fc_gps_consent', 'allow'); localStorage.setItem('fc_gps_consent_ts', new Date().toISOString()); } catch (_) {}
      locate();
    };
  });
}

export async function iniciarServicio() {
  // Prevenir doble-iniciar: si ya hay hora, sólo avanzar (no sobreescribir el dato real).
  if (M.serviceState.horaInicio) {
    nextStep();
    return;
  }
  M.serviceState.horaInicio = timeNow();

  // M10 — Pedir GPS (no bloqueante: si lo rechaza, sigue sin GPS)
  const gps = await requestUserLocationWithConsent();
  // `Hora Inicio` queda como hora PROGRAMADA por el coord (datetime).
  // La hora real de inicio del operario se registra en `Hora Inicio Efectivo`
  // via registrarInicioEfectivo(). Por eso acá solo movemos el Estado.
  const props = {
    'Estado': { select: { name: '✈️ En curso' } }
  };
  if (gps) {
    // Property `Ubicación GPS` (tipo URL) en la DB Servicios.
    // Si no existe la property en Notion, Notion ignora silenciosamente esa key.
    props['Ubicación GPS'] = { url: `https://maps.google.com/?q=${gps.lat},${gps.lng}` };
    M.serviceState.gpsInicio = `${gps.lat.toFixed(6)},${gps.lng.toFixed(6)}`;
  }

  // Si el servicio se inicia en un día DISTINTO al programado, la Fecha programada pasa a HOY (para que
  // aparezca en el mes actual del coordinador). `Fecha programada` es property existente → seguro escribirla.
  // HOY en hora LOCAL (no UTC): evita que un inicio nocturno (después de ~21h en UY/BR, la ventana en que
  // UTC ya rodó al día siguiente) se marque erróneamente como "fuera de fecha" y mute la Fecha programada.
  const _hoy = new Date();
  const hoyISO = `${_hoy.getFullYear()}-${String(_hoy.getMonth() + 1).padStart(2, '0')}-${String(_hoy.getDate()).padStart(2, '0')}`;
  const fProgOrig = (M.currentService?.properties?.['Fecha programada']?.date?.start || '').split('T')[0];
  const desvioFecha = !!fProgOrig && fProgOrig !== hoyISO;
  if (desvioFecha) props['Fecha programada'] = { date: { start: hoyISO } };

  try {
    await queueableUpdateServiceProps(M.currentService.id, props);
    // Guardar la fecha planificada ORIGINAL en la property nueva `Fecha planificada`, en un write SEPARADO
    // best-effort: si la property no existiera o falla, el inicio NO se rompe (solo no se muestra la marca).
    if (desvioFecha && !M.currentService?.properties?.['Fecha planificada']?.date?.start) {
      try {
        await updateServiceProps(M.currentService.id, { 'Fecha planificada': { date: { start: fProgOrig } } });
      } catch (_) { /* property inexistente / red: se ignora, no bloquea el inicio */ }
    }
    showSaving();
    persistServiceStateToLocal();
  } catch (e) { console.warn('Error al guardar inicio:', e); }
  renderStep();
}

// Permite al operario "des-iniciar" un servicio si tocó iniciar por error.
// Solo válido antes de Hora Inicio Efectivo (después hay datos reales del trabajo).
export async function cancelarInicio() {
  if (M.serviceState.horaInicioEfectivo) {
    alert(t('cancelar.inicio.blocked'));
    return;
  }
  if (!confirm(t('cancelar.inicio.confirm'))) return;

  M.serviceState.horaInicio = null;
  M.serviceState.gpsInicio = null;
  M.currentStep = 0;

  try {
    await queueableUpdateServiceProps(M.currentService.id, {
      'Estado': { select: { name: '🔄 Asignado' } },
      'Ubicación GPS': { url: null }
    });
    showSaving();
  } catch (e) { console.warn('Error al cancelar inicio:', e); }
  persistServiceStateToLocal();
  renderStep();
}

// Fix 2026-07-12 — el "Continuar" de los pasos inicio/cierre efectivo AUTO-REGISTRA la hora si falta.
// Antes nextStep() avanzaba sin validar → el equipo salteaba los botones violeta/naranja y NINGÚN servicio
// quedaba con horas efectivas (el historial y los jornales daban 0). registrarInicioEfectivo valida el
// método de trabajo (alert) → si no pasa, NO se avanza.
export async function continuarInicioEfectivo() {
  if (!M.serviceState.horaInicioEfectivo) {
    await registrarInicioEfectivo();
    if (!M.serviceState.horaInicioEfectivo) return; // no pasó la validación (falta método) → no avanzar
  }
  nextStep();
}
export async function continuarCierreEfectivo() {
  if (!M.serviceState.horaCierreEfectivo) await registrarCierreEfectivo();
  nextStep();
}

export async function registrarInicioEfectivo() {
  if (M.serviceState.horaInicioEfectivo) { renderStep(); return; }
  // Método de trabajo obligatorio antes de registrar el inicio efectivo. Multi: al menos uno; si incluye
  // Manual, al menos una herramienta.
  const _met = toArr(M.serviceState.metodoTrabajo);
  const _herr = toArr(M.serviceState.herramientaManual);
  if (!_met.length) { alert(t('step.metodo.required')); return; }
  if (_met.includes('💪 Manual') && !_herr.length) {
    alert(t('step.metodo.required.herr')); return;
  }
  M.serviceState.horaInicioEfectivo = timeNow();
  try {
    await queueableUpdateServiceProps(M.currentService.id, {
      'Hora Inicio Efectivo': { date: { start: isoNow()} },
      'Método de trabajo': { multi_select: _met.map(name => ({ name })) },
      ...(_met.includes('💪 Manual') && _herr.length
        ? { 'Herramienta manual': { multi_select: _herr.map(name => ({ name })) } }
        : {})
    });
    showSaving();
    persistServiceStateToLocal();
  } catch (e) { console.warn('Error al guardar inicio efectivo:', e); }
  renderStep();
}

export async function registrarCierreEfectivo() {
  if (M.serviceState.horaCierreEfectivo) { renderStep(); return; }
  M.serviceState.horaCierreEfectivo = timeNow();
  try {
    await queueableUpdateServiceProps(M.currentService.id, {
      'Hora Fin Efectivo': { date: { start: isoNow()} }
    });
    showSaving();
    persistServiceStateToLocal();
  } catch (e) { console.warn('Error al guardar cierre efectivo:', e); }
  renderStep();
}

export function toggleCheck(list, idx) {
  const key = list === 'pre' ? 'checklistPre' : 'checklistPost';
  M.serviceState[key][idx] = !M.serviceState[key][idx];
  persistServiceState();
  renderStep();
}

export function selectResultadoPrueba(val) {
  M.serviceState.resultadoPrueba = val;
  persistServiceState();
  renderStep();
}

export function selectFinalizacion(val) {
  M.serviceState.finalizacion = val;
  if (val === 'termino') { M.serviceState.avance = ''; }   // si terminó, el % no aplica
  persistServiceStateToLocal();   // local only — cerrarServicio lo lee al cerrar; no escribir a Notion acá
  renderStep();
}

export function selectResultado(val) {
  M.serviceState.resultado = val;
  persistServiceState();
  renderStep();
}

export function relevToggleDif(val) {
  const arr = M.serviceState.relevamiento.dificultades;
  const idx = arr.indexOf(val);
  if (idx === -1) arr.push(val); else arr.splice(idx, 1);
  persistServiceState();
  renderStep();
}

// ¿Este relevamiento está Completado pero todavía dentro de su ventana de edición del operario?
// Regla (Diego 16/07): el operario que lo finalizó puede editar/agregar HASTA EL FIN DE ESE DÍA
// (fecha local de 'Hora Fin'); después, solo el coordinador. Devuelve false para no-relevamientos.
export function relevEditableHoy(props) {
  const p = props || M.currentService?.properties || {};
  if (!(p['Tipo de registro']?.select?.name || '').includes('Relevamiento')) return false;
  if ((p['Estado']?.select?.name || '') !== '✅ Completado') return false;
  const fin = p['Hora Fin']?.date?.start;
  if (!fin) return false;
  const d = new Date(fin);
  const hoy = new Date();
  return d.getFullYear() === hoy.getFullYear() && d.getMonth() === hoy.getMonth() && d.getDate() === hoy.getDate();
}

// Finalizar la ficha con confirmación (pedido Diego 16/07). Si ya estaba finalizada (re-edición del mismo
// día), el texto es de "guardar cambios" — cerrarServicio re-escribe las mismas properties, es idempotente.
export async function fichaRelevFinalizar() {
  // Auto-guardar el link de ubicación si el operario lo pegó pero NO tocó "Guardar ubicación": todo lo demás
  // de la ficha autoguarda, así que el link también debe (antes se perdía en silencio al finalizar).
  const inp = document.getElementById('relev-mapa-input');
  const link = (inp?.value || '').trim();
  const saved = (M.currentService?.properties?.['Mapa']?.url || '').trim();
  if (link && link !== saved) {
    if (!/^https?:\/\//i.test(link)) { alert(t('relev.ficha.ubicacion.invalido')); return; }
    try {
      await queueableUpdateServiceProps(M.currentService.id, { 'Mapa': { url: link } });
      if (M.currentService?.properties) M.currentService.properties['Mapa'] = { url: link };
      syncAfterWrite(M.currentService.id, 'servicios');
    } catch (e) { alert(t('relev.ficha.ubicacion.error') + ' ' + esc(e.message || '')); return; }
  }
  const yaCerrado = (M.currentService?.properties?.['Estado']?.select?.name || '') === '✅ Completado';
  if (!confirm(t(yaCerrado ? 'relev.ficha.confirm.editar' : 'relev.ficha.confirm'))) return;
  await cerrarServicio();
}

// Ficha de relevamiento: guardar el link de Google Maps como property 'Mapa' del servicio (no hace falta
// estar en el lugar — el operario/coordinador pega el link compartido). Va por la cola offline si no hay señal.
export async function fichaRelevGuardarMapa() {
  const inp = document.getElementById('relev-mapa-input');
  const link = (inp?.value || '').trim();
  if (!link) { alert(t('relev.ficha.ubicacion.vacio')); return; }
  if (!/^https?:\/\//i.test(link)) { alert(t('relev.ficha.ubicacion.invalido')); return; }
  try {
    await queueableUpdateServiceProps(M.currentService.id, { 'Mapa': { url: link } });
    if (M.currentService?.properties) M.currentService.properties['Mapa'] = { url: link };
    syncAfterWrite(M.currentService.id, 'servicios');
    renderStep(); // re-pinta: aparece el botón "Abrir mapa" con el link nuevo
  } catch (e) {
    alert(t('relev.ficha.ubicacion.error') + ' ' + esc(e.message || ''));
  }
}

export function relevToggleSugerido(val) {
  const arr = M.serviceState.relevamiento.servicioSugerido;
  const idx = arr.indexOf(val);
  if (idx === -1) arr.push(val); else arr.splice(idx, 1);
  persistServiceState();
  renderStep();
}

export function selectClima(val) {
  if (!Array.isArray(M.serviceState.clima)) {
    M.serviceState.clima = M.serviceState.clima ? [M.serviceState.clima] : [];
  }
  const idx = M.serviceState.clima.indexOf(val);
  if (idx === -1) M.serviceState.clima.push(val);
  else M.serviceState.clima.splice(idx, 1);
  persistServiceState();
  renderStep();
}

export function selectMetodoTrabajo(val) {
  // Toggle: se pueden marcar Dron Y Manual a la vez (ej. dron arriba + lanzas abajo).
  const arr = toArr(M.serviceState.metodoTrabajo);
  M.serviceState.metodoTrabajo = arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val];
  // Si el método ya NO incluye Manual, las herramientas no aplican → limpiar.
  if (!M.serviceState.metodoTrabajo.includes('💪 Manual')) M.serviceState.herramientaManual = [];
  persistServiceState();
  renderStep();
}

export function selectHerramientaManual(val) {
  // Toggle: varias herramientas a la vez (ej. lanzas + manguera).
  const arr = toArr(M.serviceState.herramientaManual);
  M.serviceState.herramientaManual = arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val];
  persistServiceState();
  renderStep();
}


export async function cerrarServicio() {
  // Bloquear si hay fotos en upload todavía
  const allPhotos = [
    ...(M.serviceState.photos?.pre || []),
    ...(M.serviceState.photos?.post || []),
    ...(M.serviceState.photos?.relevamiento || [])
  ];
  if (allPhotos.filter(p => p.status === 'uploading').length > 0) { alert(t('photos.wait.uploading')); return; }

  // Si tiene sectores y NO están todos hechos → dejar elegir (seguir otro día / cerrar así). No cerrar aún.
  if (servicioTieneSectores() && !M.serviceState.sectores.every(s => s.estado === 'hecho')) {
    const pend = M.serviceState.sectores.filter(s => s.estado !== 'hecho').length;
    openCierreSectoresModal(pend);
    return;
  }

  // Servicio de trabajo SIN sectores: decidir según la pregunta "¿Terminaste?".
  const tipoReg = M.currentService?.properties?.['Tipo de registro']?.select?.name || '';
  const esTrabajo = !tipoReg.includes('Prueba') && !tipoReg.includes('Relevamiento');
  if (esTrabajo && !servicioTieneSectores()) {
    if (M.serviceState.finalizacion === 'continua') {
      // Sin señal YA NO bloquea (auditoría 2026-07-09): el cierre-continuación se encola y la ficha del
      // día siguiente se crea al reconectar (con dedup anti-duplicado). Ver _ejecutarCierre + processQueue.
      const pct = parseInt(M.serviceState.avance, 10);
      if (isNaN(pct) || pct <= 0 || pct >= 100) {
        alert(pct >= 100 ? t('close.jornada.pct.is100') : t('close.jornada.need.pct'));
        return;
      }
      await _ejecutarCierre('continuar');
      return;
    }
    if (M.serviceState.finalizacion !== 'termino') { alert(t('close.jornada.need.choice')); return; }
    // 'termino' → cae al flujo normal de completar (valida resultado).
  }

  // Sin sectores + terminó (o Prueba/Relevamiento) → completar (valida resultado como hoy).
  if (!_cierreResultadoOk()) return;
  await _ejecutarCierre('completar');
}

// Validación de resultado obligatorio (Órdenes/Jornadas usan 'Resultado'; Pruebas 'Resultado prueba'; Relevamientos no).
export function _cierreResultadoOk() {
  const tipoReg = M.currentService?.properties?.['Tipo de registro']?.select?.name || '';
  if (tipoReg.includes('Relevamiento')) return true;
  const isPrueba = tipoReg.includes('Prueba');
  const valor = isPrueba ? M.serviceState.resultadoPrueba : M.serviceState.resultado;
  if (!valor) { alert(t(isPrueba ? 'close.prueba.need.resultado' : 'close.need.resultado')); return false; }
  return true;
}

// modo: 'completar' (Estado → ✅ Completado) | 'continuar' (reprograma a mañana como 🔄 Asignado).
export async function _ejecutarCierre(modo) {
  const tipoReg = M.currentService?.properties?.['Tipo de registro']?.select?.name || '';
  const isPrueba = tipoReg.includes('Prueba');
  const jornadaN = M.currentService?.properties?.['Jornada N°']?.number;
  const conSectores = servicioTieneSectores();

  const btn = document.querySelector('.btn-red, #ficha-finalizar-btn');
  if (btn) { btn.textContent = t('btn.saving.notion'); btn.disabled = true; }

  const properties = {};

  // ── Estado + fechas + parte por día ──
  if (conSectores) {
    properties['% de avance'] = { number: sectoresAvancePct() };
    const secs = M.serviceState.sectores.map(x => ({ id: x.id, nombre: String(x.nombre || '').trim(), estado: x.estado || 'pendiente' })).filter(x => x.nombre);
    properties['Estado sectores'] = { rich_text: secs.length ? [{ text: { content: JSON.stringify(secs) } }] : [] };

    // Parte del día: sectores que pasaron a 'hecho' HOY (vs snapshot al abrir).
    const antes = new Map((M.serviceState.sectoresAlAbrir || []).map(s => [s.id, s.estado]));
    const hechosHoy = M.serviceState.sectores.filter(s => s.estado === 'hecho' && antes.get(s.id) !== 'hecho').map(s => s.id);
    const hoy = new Date().toISOString().split('T')[0];
    const reg = Array.isArray(M.serviceState.registroJornadas) ? M.serviceState.registroJornadas.slice() : [];
    reg.push({ fecha: hoy, ini: M.serviceState.horaInicioEfectivo || '', fin: M.serviceState.horaCierreEfectivo || '', hechos: hechosHoy });
    properties['Registro jornadas'] = { rich_text: [{ text: { content: JSON.stringify(reg) } }] };

    if (modo === 'continuar') {
      // Reprogramar: sigue visible (Asignado), fecha mañana (tentativa, el coord ajusta), horas efectivas limpias para el día siguiente.
      const man = new Date(); man.setDate(man.getDate() + 1);
      properties['Estado'] = { select: { name: '🔄 Asignado' } };
      properties['Fecha programada'] = { date: { start: man.toISOString().split('T')[0] } };
      properties['Hora Inicio Efectivo'] = { date: null };
      properties['Hora Fin Efectivo'] = { date: null };
      properties['Hora Fin'] = { date: null };
    } else {
      properties['Estado'] = { select: { name: '✅ Completado' } };
      properties['Hora Fin'] = { date: { start: isoNow() } };
    }
  } else {
    // Sin sectores.
    properties['Estado'] = { select: { name: '✅ Completado' } };
    properties['Hora Fin'] = { date: { start: isoNow() } };
    if (modo === 'continuar') {
      // Sigo otro día: guardar % acumulado + marcar esta ficha como jornada (la ficha del día siguiente se crea abajo).
      properties['% de avance'] = { number: parseInt(M.serviceState.avance, 10) };
      properties['Tipo de registro'] = { select: { name: '📅 Jornada' } };
      const curN = M.currentService?.properties?.['Jornada N°']?.number;
      properties['Jornada N°'] = { number: (typeof curN === 'number' ? curN : 1) };
    } else if ((jornadaN != null) || tipoReg.includes('Jornada')) {
      // Jornada que termina: si el operario dejó un %, usarlo; si eligió "terminado", es 100%.
      properties['% de avance'] = { number: M.serviceState.avance !== '' ? parseFloat(M.serviceState.avance) : 100 };
    }
  }

  // ── Campos comunes (igual que el cierre de siempre) ──
  if (M.serviceState.notasPost) properties['Notas post-servicio'] = { rich_text: [{ text: { content: M.serviceState.notasPost } }] };
  if (isPrueba) { if (M.serviceState.resultadoPrueba) properties['Resultado prueba'] = { select: { name: M.serviceState.resultadoPrueba } }; }
  else if (M.serviceState.resultado) properties['Resultado'] = { select: { name: M.serviceState.resultado } };
  const climaArr = Array.isArray(M.serviceState.clima) ? M.serviceState.clima : (M.serviceState.clima ? [M.serviceState.clima] : []);
  if (climaArr.length) properties['Condición climática'] = { multi_select: climaArr.map(name => ({ name })) };
  const metodoArrC = toArr(M.serviceState.metodoTrabajo);
  if (metodoArrC.length) {
    properties['Método de trabajo'] = { multi_select: metodoArrC.map(name => ({ name })) };
    const herrArrC = toArr(M.serviceState.herramientaManual);
    if (metodoArrC.includes('💪 Manual') && herrArrC.length) properties['Herramienta manual'] = { multi_select: herrArrC.map(name => ({ name })) };
  }
  const preFiles = photosToNotionFiles(M.serviceState.photos?.pre, 'pre');
  const postFiles = photosToNotionFiles(M.serviceState.photos?.post, 'post');
  const relevFiles = photosToNotionFiles(M.serviceState.photos?.relevamiento, 'relev');
  if (preFiles.length) properties['📸 Fotos pre-servicio'] = { files: preFiles };
  if (postFiles.length) properties['📸 Fotos post-servicio'] = { files: postFiles };
  if (relevFiles.length) properties['📸 Fotos relevamiento'] = { files: relevFiles };
  const _ckClose = { pre: M.serviceState.checklistPre || {}, post: M.serviceState.checklistPost || {} };
  if (Object.keys(_ckClose.pre).length || Object.keys(_ckClose.post).length) properties['Estado checklist'] = { rich_text: [{ text: { content: JSON.stringify(_ckClose) } }] };
  if (tipoReg.includes('Relevamiento')) {
    const r = M.serviceState.relevamiento || {};
    if (r.m2 !== '' && r.m2 != null) { const n = parseFloat(r.m2); if (!isNaN(n)) properties['m² aproximados'] = { number: n }; }
    if (r.altura !== '' && r.altura != null) { const n = parseFloat(r.altura); if (!isNaN(n)) properties['Altura / Pisos'] = { number: n }; }
    if (Array.isArray(r.dificultades) && r.dificultades.length) properties['Dificultad de acceso'] = { multi_select: r.dificultades.map(d => ({ name: d })) };
    if (Array.isArray(r.servicioSugerido) && r.servicioSugerido.length) properties['Servicio sugerido'] = { multi_select: r.servicioSugerido.map(s => ({ name: s })) };
    if (r.notasComercial) properties['Notas pre-servicio'] = { rich_text: [{ text: { content: r.notasComercial } }] };
  }

  // Al reprogramar (otro día = jornada nueva), el checklist se rehace: limpiamos el guardado para que el
  // operario NO lo encuentre marcado del día anterior (el checklist PRE de llegada y POST de cierre son por jornada).
  if (modo === 'continuar' && conSectores) properties['Estado checklist'] = { rich_text: [] };

  try {
    const result = await queueableUpdateServiceProps(M.currentService.id, properties);
    if (!result?.queued) { try { localStorage.removeItem(storageKeyForService(M.currentService.id)); } catch (_) {} }
    // Servicio sin sectores que sigue otro día → crear la ficha del día siguiente (J+1).
    if (!conSectores && modo === 'continuar') {
      const man = new Date(); man.setDate(man.getDate() + 1);
      const fecha = man.toISOString().split('T')[0];
      const curN = M.currentService?.properties?.['Jornada N°']?.number;
      const siguienteN = (typeof curN === 'number' ? curN : 1) + 1;
      if (result?.queued || !navigator.onLine) {
        // Sin señal: el cierre ya se encoló → encolar también el CREATE de la J+1 (se crea al reconectar,
        // con dedup). Congelamos props+rootId ahora (snapshot del padre). Auditoría 2026-07-09.
        const { properties: jProps, rootId } = buildJornadaSiguienteProps(M.currentService, siguienteN, fecha);
        await enqueueCreate(M.SERVICIOS_DS_ID, jProps, { rootId, jornadaN: siguienteN });
      } else {
        try {
          await crearJornadaSiguiente(M.currentService, siguienteN, fecha);
        } catch (e) {
          // Si fue por red, encolar (no perder la J+1); otro error → avisar (se guardó el día, falta la ficha).
          if (isNetworkError(e)) {
            const { properties: jProps, rootId } = buildJornadaSiguienteProps(M.currentService, siguienteN, fecha);
            await enqueueCreate(M.SERVICIOS_DS_ID, jProps, { rootId, jornadaN: siguienteN });
          } else alert(t('close.jornada.next.error'));
        }
      }
    }
    showDoneScreen(modo === 'continuar');
  } catch (e) {
    if (btn) { btn.textContent = t('btn.close.notion'); btn.disabled = false; }
    alert(t('sheet.alert.save.error'));
  }
}

export function showDoneScreen(continua) {
  const preCount = Object.values(M.serviceState.checklistPre).filter(Boolean).length;
  const postCount = Object.values(M.serviceState.checklistPost).filter(Boolean).length;

  document.getElementById('done-stats').innerHTML = `
    <div class="done-stat-row"><span style="color:var(--text3)">${t('done.stat.inicio')}</span><span>${M.serviceState.horaInicio || '—'}</span></div>
    <div class="done-stat-row"><span style="color:var(--text3)">${t('done.stat.inicioef')}</span><span>${M.serviceState.horaInicioEfectivo || '—'}</span></div>
    <div class="done-stat-row"><span style="color:var(--text3)">${t('done.stat.cierreef')}</span><span>${M.serviceState.horaCierreEfectivo || '—'}</span></div>
    <div class="done-stat-row"><span style="color:var(--text3)">${t('done.stat.resultado')}</span><span>${(M.currentService?.properties?.['Tipo de registro']?.select?.name || '').includes('Prueba') ? (M.serviceState.resultadoPrueba || '—') : (M.serviceState.resultado || '—')}</span></div>
    <div class="done-stat-row"><span style="color:var(--text3)">${t('done.stat.checklists')}</span><span>${preCount}/${M.CHECKLIST_PRE.length} · ${postCount}/${M.CHECKLIST_POST.length}</span></div>
  `;
  if (continua) {
    const titleEl = document.querySelector('#screen-done .done-title');
    const subEl = document.querySelector('#screen-done .done-sub');
    if (titleEl) titleEl.textContent = t('done.continua.title');
    if (subEl) subEl.textContent = t('done.continua.sub');
  } else {
    const titleEl = document.querySelector('#screen-done .done-title');
    const subEl = document.querySelector('#screen-done .done-sub');
    if (titleEl) titleEl.textContent = t('done.title');
    if (subEl) subEl.textContent = t('done.sub');
  }
  // Reporte PDF de devolución: el operario puede generarlo él mismo al cerrar (antes solo el coord podía).
  // Oculto en jornada que sigue otro día (no hay cierre final que reportar).
  const pdfBtn = document.getElementById('done-pdf-btn');
  if (pdfBtn) pdfBtn.style.display = continua ? 'none' : 'block';
  showScreen('done');
}

export async function finishAndGoBack() {
  await loadServices();
}

export function jornadaOverlayClick(e) { if (e.target.id === 'jornada-overlay') closeCreateJornadaSheet(); }
export function closeCreateJornadaSheet() { document.getElementById('jornada-overlay').classList.remove('open'); }

export function selectJornadaOperario(name, el) {
  M.jornadaState.operario = name;
  document.querySelectorAll('#jornada-operario-btns .operario-btn').forEach(b => b.classList.remove('active'));
  if (el) el.classList.add('active');
}

export function computeNextJornadaNumero(parentService) {
  if (!parentService) return 2;
  const parentProps = parentService.properties || {};
  const parentPropuestaId = parentProps['Propuesta']?.relation?.[0]?.id;
  const parentContactoId = parentProps['Contacto']?.relation?.[0]?.id;
  const parentJornadaN = parentProps['Jornada N°']?.number;

  // Buscar todos los servicios linkeados a la misma propuesta o contacto, ya en memoria
  const relacionados = (M._coordAllServices || []).filter(s => {
    const sProps = s.properties || {};
    if (parentPropuestaId && sProps['Propuesta']?.relation?.[0]?.id === parentPropuestaId) return true;
    if (!parentPropuestaId && parentContactoId && sProps['Contacto']?.relation?.[0]?.id === parentContactoId) return true;
    return false;
  });

  // Máximo Jornada N° entre los relacionados
  const maxN = relacionados.reduce((max, s) => {
    const n = s.properties?.['Jornada N°']?.number;
    return (typeof n === 'number' && n > max) ? n : max;
  }, 0);

  // Si el padre ya tiene Jornada N°, el next es padre.N + 1.
  // Si no hay ninguna jornada todavía, default = 2 (asumiendo orden original = jornada 1 implícita).
  if (maxN > 0) return maxN + 1;
  if (typeof parentJornadaN === 'number') return parentJornadaN + 1;
  return 2;
}

export async function openCreateJornadaSheet() {
  if (!M.editingService) return;
  const props = M.editingService.properties || {};
  const nombre = props['Nombre del servicio']?.title?.[0]?.plain_text || '';

  // Setear defaults
  M.jornadaState.numero = computeNextJornadaNumero(M.editingService);
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  M.jornadaState.fecha = tomorrow.toISOString().split('T')[0];
  M.jornadaState.operario = props['Operario App']?.select?.name || null;

  // Renderizar inputs
  document.getElementById('jornada-numero').value = M.jornadaState.numero;
  document.getElementById('jornada-fecha').value = M.jornadaState.fecha;
  document.getElementById('jornada-sheet-sub').textContent = nombre;

  // Botones de operario — solo pilotos del país del servicio padre (mismo criterio que el sheet de edición).
  let options = operariosDePais(props['País']?.select?.name || '');
  if (M.jornadaState.operario && !options.includes(M.jornadaState.operario)) options = [M.jornadaState.operario, ...options];
  document.getElementById('jornada-operario-btns').innerHTML =
    `<button class="operario-btn ${!M.jornadaState.operario ? 'active' : ''}" onclick="selectJornadaOperario(null,this)">${t('sheet.edit.operario.sinasignar')}</button>` +
    options.map(name => `<button class="operario-btn ${M.jornadaState.operario === name ? 'active' : ''}" onclick="selectJornadaOperario(${JSON.stringify(name)},this)">${name}</button>`).join('');

  // Reset estado del botón submit
  const btn = document.getElementById('jornada-save-btn');
  btn.textContent = '✦ ' + t('sheet.jornada.btn.crear.short');
  btn.disabled = false;

  document.getElementById('jornada-overlay').classList.add('open');
}

export async function submitCreateJornada() {
  if (!M.editingService) { alert('No hay servicio padre activo.'); return; }
  const numero = parseInt(document.getElementById('jornada-numero').value, 10);
  const fecha = document.getElementById('jornada-fecha').value;
  if (!numero || numero < 1) { alert(t('sheet.jornada.error.numero')); return; }
  if (!fecha) { alert(t('sheet.jornada.error.fecha')); return; }

  const btn = document.getElementById('jornada-save-btn');
  btn.textContent = '⏳ ' + t('sheet.jornada.creating');
  btn.disabled = true;

  const parentProps = M.editingService.properties || {};
  const nombreOriginal = parentProps['Nombre del servicio']?.title?.[0]?.plain_text || 'Servicio';
  const nombreLimpio = nombreOriginal.replace(/—\s*Jornada\s*\d+\s*$/, '').trim();
  const nombreNueva = `${nombreLimpio} — Jornada ${numero}`;

  try {
    const properties = {
      'Nombre del servicio': { title: [{ text: { content: nombreNueva } }] },
      'Estado': { select: { name: '📋 Pendiente' } },
      'Tipo de registro': { select: { name: '📅 Jornada' } },
      'Jornada N°': { number: numero },
      'Fecha programada': { date: { start: fecha } }
    };
    const pais = parentProps['País']?.select?.name;
    if (pais) properties['País'] = { select: { name: pais } };
    const tipoSvc = tipoServicioList(parentProps);
    if (tipoSvc.length) properties['Tipo de servicio'] = { multi_select: tipoSvc.map(name => ({ name })) };
    const propuestaRel = parentProps['Propuesta']?.relation?.[0]?.id;
    if (propuestaRel) properties['Propuesta'] = { relation: [{ id: propuestaRel }] };
    const contactoRel = parentProps['Contacto']?.relation?.[0]?.id;
    if (contactoRel) properties['Contacto'] = { relation: [{ id: contactoRel }] };
    if (M.jornadaState.operario) {
      properties['Operario App'] = { select: { name: M.jornadaState.operario } };
      const userForOp = M.USERS.find(u => u.name === M.jornadaState.operario);
      if (userForOp?.notionId) {
        properties['Operario(s)'] = { people: [{ object: 'user', id: userForOp.notionId }] };
      }
    }

    // La base Servicios usa data_source_id (multiple data sources)
    await callNotion('pages', 'POST', {
      parent: { type: 'data_source_id', data_source_id: M.SERVICIOS_DS_ID },
      properties
    });

    closeCreateJornadaSheet();
    closeEditSheet();
    await renderCoordServicios();
    alert(t('sheet.jornada.success'));
  } catch (e) {
    btn.textContent = '✦ ' + t('sheet.jornada.btn.crear.short');
    btn.disabled = false;
    alert(t('sheet.jornada.error.crear') + ' ' + (e.message || ''));
  }
}

// Crea programáticamente la ficha del día siguiente (jornada N) heredando datos del padre.
// La usa el cierre del operario cuando un servicio de trabajo SIN sectores "sigue otro día".
// A diferencia de submitCreateJornada (manual, del coord), no lee del DOM y hereda además
// ayudantes/lugar/mapa, arranca 🔄 Asignado si hay piloto, y vincula la Orden madre (raíz).
// Arma las properties de la ficha "Jornada siguiente" (J+1) desde el servicio padre. Extraído para
// reusarlo ONLINE (crearJornadaSiguiente) y OFFLINE (se congela + encola; ver _ejecutarCierre + processQueue).
// Devuelve { properties, rootId } — rootId = Orden madre (raíz del trabajo multi-día), clave del dedup.
export function buildJornadaSiguienteProps(parentService, numero, fecha) {
  const p = parentService.properties || {};
  const nombreOriginal = p['Nombre del servicio']?.title?.[0]?.plain_text || 'Servicio';
  const nombreLimpio = nombreOriginal.replace(/—\s*Jornada\s*\d+\s*$/, '').trim();
  const nombreNueva = `${nombreLimpio} — Jornada ${numero}`;
  const operarioApp = p['Operario App']?.select?.name || null;

  const properties = {
    'Nombre del servicio': { title: [{ text: { content: nombreNueva } }] },
    'Estado': { select: { name: operarioApp ? '🔄 Asignado' : '📋 Pendiente' } },
    'Tipo de registro': { select: { name: '📅 Jornada' } },
    'Jornada N°': { number: numero },
    'Fecha programada': { date: { start: fecha } }
  };
  const pais = p['País']?.select?.name;
  if (pais) properties['País'] = { select: { name: pais } };
  const tipoSvc = tipoServicioList(p);
  if (tipoSvc.length) properties['Tipo de servicio'] = { multi_select: tipoSvc.map(name => ({ name })) };
  const propuestaRel = p['Propuesta']?.relation?.[0]?.id;
  if (propuestaRel) properties['Propuesta'] = { relation: [{ id: propuestaRel }] };
  const contactoRel = p['Contacto']?.relation?.[0]?.id;
  if (contactoRel) properties['Contacto'] = { relation: [{ id: contactoRel }] };
  if (operarioApp) {
    properties['Operario App'] = { select: { name: operarioApp } };
    const userForOp = M.USERS.find(u => u.name === operarioApp);
    if (userForOp?.notionId) properties['Operario(s)'] = { people: [{ object: 'user', id: userForOp.notionId }] };
  }
  // La jornada del día siguiente hereda TODA la cuadrilla (mismo equipo, otro día) para que el
  // conteo de jornales del tablero no subcontabilice piloto/manual en los días 2+.
  const pilotoJ = p['Piloto']?.select?.name;
  if (pilotoJ) properties['Piloto'] = { select: { name: pilotoJ } };
  const operarioManualJ = p['Operario manual']?.select?.name;
  if (operarioManualJ) properties['Operario manual'] = { select: { name: operarioManualJ } };
  const ayudantes = (p['Operarios participantes']?.multi_select || []).map(o => o.name);
  if (ayudantes.length) properties['Operarios participantes'] = { multi_select: ayudantes.map(name => ({ name })) };
  const lugar = p['Lugar']?.rich_text?.[0]?.plain_text;
  if (lugar) properties['Lugar'] = { rich_text: [{ text: { content: lugar } }] };
  const mapa = p['Mapa']?.url;
  if (mapa) properties['Mapa'] = { url: mapa };
  // Vínculo padre↔jornadas: la raíz es la Orden madre del padre, o el padre mismo si es la J1.
  const rootId = p['Orden madre']?.relation?.[0]?.id || parentService.id;
  properties['Orden madre'] = { relation: [{ id: rootId }] };

  // Heredar las fotos "ANTES" del día anterior (que ya las heredó de la Orden madre; el estado inicial
  // del edificio ya está fotografiado; el operario suma las que falten). Las fotos "DESPUÉS" NO se
  // heredan (son el resultado de cada día).
  const prePhotos = p['📸 Fotos pre-servicio']?.files;
  if (Array.isArray(prePhotos) && prePhotos.length) {
    const preFiles = prePhotos
      .map(f => ({ type: 'external', name: f.name || 'foto.jpg', external: { url: f.external?.url || f.file?.url || null } }))
      .filter(f => f.external.url);
    if (preFiles.length) properties['📸 Fotos pre-servicio'] = { files: preFiles };
  }
  return { properties, rootId };
}

export function openSectorOverlay(id) {
  const sec = (M.serviceState.sectores || []).find(s => s.id === id);
  if (!sec) return;
  sectorOverlayState = { sectorId: id };
  // Al abrir, si estaba pendiente pasa a "en curso".
  if (sec.estado === 'pendiente') { sec.estado = 'en_curso'; persistServiceState(); }
  document.getElementById('sector-overlay').classList.add('open');
  renderSectorOverlay();
}

export function renderSectorOverlay() {
  const st = sectorOverlayState;
  if (!st) return;
  const sec = (M.serviceState.sectores || []).find(s => s.id === st.sectorId);
  if (!sec) { closeSectorOverlay(); return; }
  document.getElementById('sector-overlay-title').textContent = '🏢 ' + sec.nombre;
  document.getElementById('sector-overlay-sub').textContent = t('sector.overlay.sub');
  const preOk = sectorFotos(sec.id, 'pre').filter(fotoTomada).length;
  const postOk = sectorFotos(sec.id, 'post').filter(fotoTomada).length;
  const puedeCerrar = preOk >= 1 && postOk >= 1;
  document.getElementById('sector-overlay-body').innerHTML = `
    <div class="form-label">${t('sector.fotos.antes')}</div>
    ${renderSectorPhotoUploader(sec.id, 'pre', 1)}
    <div class="form-label" style="margin-top:8px">${t('sector.fotos.despues')}</div>
    ${renderSectorPhotoUploader(sec.id, 'post', 1)}
    <button class="btn-main btn-green" style="width:100%;margin-top:8px${puedeCerrar ? '' : ';opacity:.5'}" ${puedeCerrar ? '' : 'disabled'} onclick="marcarSectorHecho()">${t('sector.marcar.hecho')}</button>
    ${puedeCerrar ? '' : `<div style="font-size:11px;color:var(--text3);text-align:center;margin-top:6px">${t('sector.fotos.min')}</div>`}
  `;
}

export function marcarSectorHecho() {
  const st = sectorOverlayState;
  if (!st) return;
  const sec = (M.serviceState.sectores || []).find(s => s.id === st.sectorId);
  if (!sec) return;
  const preOk = sectorFotos(sec.id, 'pre').filter(fotoTomada).length;
  const postOk = sectorFotos(sec.id, 'post').filter(fotoTomada).length;
  if (preOk < 1 || postOk < 1) { alert(t('sector.fotos.min')); return; }
  sec.estado = 'hecho';
  persistServiceState();
  closeSectorOverlay();
  renderStep(); // refresca el hub (estado + %)
}

export function closeSectorOverlay() {
  const ov = document.getElementById('sector-overlay');
  if (ov) ov.classList.remove('open');
  sectorOverlayState = null;
}

export function sectorOverlayClick(e) { if (e.target.id === 'sector-overlay') closeSectorOverlay(); }

export function openCierreSectoresModal(pendientes) {
  const sub = document.getElementById('cierre-sectores-sub');
  if (sub) sub.textContent = t('cierre.sectores.sub').replace('{n}', pendientes);
  document.getElementById('cierre-sectores-overlay').classList.add('open');
}
export function closeCierreSectoresModal() {
  document.getElementById('cierre-sectores-overlay').classList.remove('open');
}
export function cierreSectoresOverlayClick(e) { if (e.target.id === 'cierre-sectores-overlay') closeCierreSectoresModal(); }
export async function cierreSectoresElegir(modo) {
  // 'completar' exige resultado (el servicio termina); 'continuar' no (sigue otro día).
  if (modo === 'completar' && !_cierreResultadoOk()) return;
  // Cerrar un servicio con sectores SIN terminar es excepcional → doble confirmación (algo pasó;
  // lo normal sería "seguir otro día"). Recuento de sectores pendientes para el mensaje.
  if (modo === 'completar') {
    const pend = (M.serviceState.sectores || []).filter(s => s.estado !== 'hecho').length;
    if (!confirm(t('cierre.sectores.confirm.cerrar').replace('{n}', pend))) return;
  }
  closeCierreSectoresModal();
  await _ejecutarCierre(modo);
}
