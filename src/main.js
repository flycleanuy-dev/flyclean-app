// ─────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────
// Versionado web/APK. Cuando cambie funcionalidad significativa de la web,
// bump APP_VERSION. Cuando algo requiera versión mínima de APK, bump MIN_APK_VERSION_REQUIRED.
// La app instalada (TWA) compara su versión nativa contra MIN_APK_VERSION_REQUIRED.
const APP_VERSION = '1.2.9';
const MIN_APK_VERSION_REQUIRED = '1.0.0';

// El APK puede exponer su versión nativa vía un meta tag inyectado por el wrapper TWA,
// o vía Digital Asset Links / navigator.getInstalledRelatedApps. Si no hay info, asumimos
// "running on web" y no hay version-gate.
function getApkInstalledVersion() {
  // Convención: el TWA inyecta un meta <meta name="fc-apk-version" content="1.2.3"> al cargar.
  const meta = document.querySelector('meta[name="fc-apk-version"]');
  return meta?.content || null;
}

function checkApkOutdated() {
  const apkVer = getApkInstalledVersion();
  if (!apkVer) return false; // no estamos en APK o no se inyectó la versión
  return compareVersions(apkVer, MIN_APK_VERSION_REQUIRED) < 0;
}

// ── Bases de Notion — ÚNICO lugar para cambiar al clonar a otro workspace/país. ──
const NOTION_DBS = {
  servicios:  'ccaf276c-7f6a-460c-aeb3-d2800deab2e5',
  gastos:     '1e20cdab-ad5d-4152-8d07-0ed2f6e9dad3',
  ingresos:   'd1e15376-e83a-408a-8a52-f47da33c249a',
  propuestas: '2c0a4257-f429-4941-b994-dfebc1098633',
  contactos:  '250115612de74e0582366549bbe5e389',
  activos:    'e75449eeb78143f1b74006a4796c1f95',
  equipo:     'cfff6e26dbc84eedb7eabcb6c51db1eb',
  regTiempo:  '57bc613af5d04908a9f2342cf6a1a5a7',
  solicitudes:'0f5cd38362ab430293a5dec7140ac18f',
  documentos: 'f888bd9c89e0497a9d2c57594aacd663',
};
const DB_ID = NOTION_DBS.servicios;
const PROPUESTAS_DB_ID = NOTION_DBS.propuestas;
const CONTACTOS_DB_ID = NOTION_DBS.contactos;
const EQUIPO_DB_ID = NOTION_DBS.equipo;
const USERS = [
  { id: 'diego-laxalt',      name: 'Diego Laxalt',       role: '🎯 Dirección',   emoji: '👨‍✈️', notionId: '69fce11a-3828-4780-ba22-af79a887b9e3', country: 'Uruguay' },
  { id: 'federico-maciel',   name: 'Federico Maciel',    role: '🔧 Coordinador', emoji: '👷',  notionId: null, country: 'Uruguay' },
  { id: 'juan-pablo',        name: 'Juan Pablo',         role: '🛠️ Operario',    emoji: '👨‍🔧', notionId: null, country: 'Uruguay' },
  { id: 'francisco-rocha',   name: 'Francisco Rocha',    role: '🛠️ Operario',    emoji: '🧑‍🔧', notionId: null, country: 'Uruguay' },
  { id: 'francarlos-velazquez', name: 'Francarlos Velázquez', role: '🛠️ Operario', emoji: '🧑‍✈️', notionId: null, country: 'Uruguay' }, // piloto habitual del dron (alta 2026-07-12)
  { id: 'coord-brasil',      name: 'Coordinador Brasil', role: '🔧 Coordinador', emoji: '👷',  notionId: null, country: 'Brasil' },
  { id: 'operario-brasil-1', name: 'Operario Brasil',    role: '🛠️ Operario',    emoji: '👨‍🔧', notionId: null, country: 'Brasil' },
  { id: 'coord-panama',      name: 'Coordinador Panamá', role: '🔧 Coordinador', emoji: '👷',  notionId: null, country: 'Panamá' },
  { id: 'operario-panama-1', name: 'Operario Panamá',    role: '🛠️ Operario',    emoji: '👨‍🔧', notionId: null, country: 'Panamá' },
  { id: 'coord-guatemala',   name: 'Coordinador Guatemala', role: '🔧 Coordinador', emoji: '👷',  notionId: null, country: 'Guatemala' },
  { id: 'operario-guatemala-1', name: 'Operario Guatemala', role: '🛠️ Operario',  emoji: '👨‍🔧', notionId: null, country: 'Guatemala' },
  { id: 'coord-mexico',      name: 'Coordinador México', role: '🔧 Coordinador', emoji: '👷',  notionId: null, country: 'México' },
  { id: 'operario-mexico-1', name: 'Operario México',    role: '🛠️ Operario',    emoji: '👨‍🔧', notionId: null, country: 'México' },
  { id: 'eduardo-cabral',   name: 'Eduardo Cabral',     role: '👔 CEO',          emoji: '🧑‍💼', notionId: null, country: 'Uruguay' },
  { id: 'ceo-brasil',       name: 'CEO Brasil',         role: '👔 CEO',          emoji: '🧑‍💼', notionId: null, country: 'Brasil' },
  { id: 'ceo-panama',       name: 'CEO Panamá',         role: '👔 CEO',          emoji: '🧑‍💼', notionId: null, country: 'Panamá' },
  { id: 'ceo-guatemala',    name: 'CEO Guatemala',      role: '👔 CEO',          emoji: '🧑‍💼', notionId: null, country: 'Guatemala' },
  { id: 'ceo-mexico',       name: 'CEO México',         role: '👔 CEO',          emoji: '🧑‍💼', notionId: null, country: 'México' },
  { id: 'finanzas-uy',      name: 'Finanzas',           role: '📊 Administración', emoji: '💼', notionId: null, country: 'Uruguay' },
  { id: 'finanzas-brasil',    name: 'Finanzas Brasil',    role: '📊 Administración', emoji: '💼', notionId: null, country: 'Brasil' },
  { id: 'finanzas-panama',    name: 'Finanzas Panamá',    role: '📊 Administración', emoji: '💼', notionId: null, country: 'Panamá' },
  { id: 'finanzas-guatemala', name: 'Finanzas Guatemala', role: '📊 Administración', emoji: '💼', notionId: null, country: 'Guatemala' },
  { id: 'finanzas-mexico',    name: 'Finanzas México',    role: '📊 Administración', emoji: '💼', notionId: null, country: 'México' },
  // Rol 🧲 Ventas (spec 2026-07-02 B2): entra al panel coordinador pero SOLO ve la tab 🎯 Prospección
  // (gating en loadCoordinator/setCoordTab). Nombre placeholder hasta contratar; PIN vía CEO→Equipo→🔑.
  { id: 'ventas-uy',        name: 'Ventas UY',          role: '🧲 Ventas',         emoji: '🧲', notionId: null, country: 'Uruguay' }
];

const COUNTRY_NOTION_MAP = {
  'Uruguay':   '🇺🇾 Uruguay',
  'Brasil':    '🇧🇷 Brasil',
  'Panamá':    '🇵🇦 Panamá',
  'Guatemala': '🇬🇹 Guatemala',
  'México':    '🇲🇽 México'
};

import { TRANSLATIONS, t, currentLang, setCurrentLang } from './i18n.js'; // diccionario + runtime de idioma — ver src/i18n.js
import { esc, toArr, msNames, compareVersions } from './util.js'; // utilidades puras — ver src/util.js
import { // lógica de dinero (pura, testeada por tests/calculos.test.mjs) — ver src/calculos.js
  tipoServicioList, tipoServicioStr, montoOf, esFinanciamiento, tipoInterno, esArchivado,
  kpiIncluido, kpiBadgeHTML, fmtMoneda, sumByMoneda, fmtTotalSplit,
} from './calculos.js';
import { // asistente IA de ayuda — ver src/ayuda-bot.js (dependencias inyectadas con initAyudaBot)
  initAyudaBot, updateAyudaFab, resetAyudaBot, openAyudaBot, closeAyudaBot, ayudaOverlayClick, sendAyuda,
} from './ayuda-bot.js';
import { // PDF de devolución (núcleo) — ver src/reporte.js (dependencias inyectadas con initReporte)
  initReporte, ensureJsPDF, ensureReportBrand, buildReportDoc, generateReportPDF,
} from './reporte.js';

// currentLang, t() y setCurrentLang viven en src/i18n.js (importados arriba). currentLang es un binding
// vivo de solo lectura: para CAMBIARLO se llama setCurrentLang(). setLang() (abajo) es el cambio "rico".

function initLang() {
  const savedCountry = localStorage.getItem('fc_country');
  if (savedCountry === 'Brasil') {
    const savedBr = localStorage.getItem('fc_lang_Brasil');
    setCurrentLang(savedBr === 'es' ? 'es' : 'pt-BR');
  } else {
    setCurrentLang('es');
  }
}

function setLang(lang) {
  if (lang !== 'pt-BR' && lang !== 'es') return;
  setCurrentLang(lang);
  if (selectedCountry === 'Brasil') {
    localStorage.setItem('fc_lang_Brasil', lang);
  }
  applyTranslations();
  updateLangToggleUI();
  rerenderActiveContent();
}

function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });
  document.querySelectorAll('[data-i18n-html]').forEach(el => {
    el.innerHTML = t(el.dataset.i18nHtml);
  });
}

function updateLangToggleUI() {
  const toggle = document.getElementById('lang-toggle');
  if (!toggle) return;
  const isBrasil = selectedCountry === 'Brasil';
  toggle.style.display = isBrasil ? 'flex' : 'none';
  const ptBtn = document.getElementById('lang-pt');
  const esBtn = document.getElementById('lang-es');
  if (ptBtn) ptBtn.classList.toggle('active', currentLang === 'pt-BR');
  if (esBtn) esBtn.classList.toggle('active', currentLang === 'es');
}

function rerenderActiveContent() {
  const active = document.querySelector('.screen.active');
  if (!active) return;
  const id = active.id;
  try {
    if (id === 'screen-login' && selectedCountry) {
      renderLogin();
    } else if (id === 'screen-pin' && pinUser) {
      // re-render pin labels (emoji/name unchanged but sub label may be data-i18n)
    } else if (id === 'screen-services' && currentUser) {
      if (typeof _allServices !== 'undefined' && _allServices) renderServices(_allServices);
    } else if (id === 'screen-detail' && typeof currentService !== 'undefined' && currentService) {
      renderStepNav();
      renderStep();
    } else if (id === 'screen-coordinator' && currentUser) {
      if (activeCoordTab === 'inicio') renderCoordInicio();
      else if (activeCoordTab === 'servicios') renderCoordServicios();
      else if (activeCoordTab === 'pruebas') renderCoordPruebas();
      else if (activeCoordTab === 'relevamientos') renderCoordRelevamientos();
      else if (activeCoordTab === 'propuestas' && typeof renderCoordPropuestas === 'function') renderCoordPropuestas();
      else if (activeCoordTab === 'contactos') renderCoordContactos();
      else if (activeCoordTab === 'prospeccion') renderCoordProspeccion();
      else if (activeCoordTab === 'mapa') renderCoordMapa();
    } else if (id === 'screen-ceo' && currentUser && puedeVerCEO()) {
      renderCEOCountryTabs();
      if (activeCEOTab === 'metricas') renderCEOMetricas();
      else if (activeCEOTab === 'servicios') renderCEOServicios();
      else if (activeCEOTab === 'finanzas') renderCEOFinanzas();
      else if (activeCEOTab === 'equipo') renderCEOEquipo();
    }
  } catch (e) { console.warn('rerenderActiveContent error', e); }
}

function translateRole(role) {
  const map = {
    '🎯 Dirección': 'role.direccion',
    '🔧 Coordinador': 'role.coordinador',
    '🛠️ Operario': 'role.operario',
    '👔 CEO': 'role.ceo',
    '🧲 Ventas': 'role.ventas'
  };
  return map[role] ? t(map[role]) : role;
}

function getCountryFilter() {
  const isGlobal = currentUser?.role?.includes('Dirección') ||
                   (currentUser?.role === '👔 CEO' && currentUser?.country === 'Uruguay');
  if (isGlobal) return null;
  const notionVal = COUNTRY_NOTION_MAP[selectedCountry];
  return notionVal ? { property: 'País', select: { equals: notionVal } } : null;
}

// ⚠️ La DB Servicios es "multi-data-source": el proxy hace fallback a la API search y DESCARTA los
// filtros server-side (País / Fecha programada / Estado). Por eso, CUALQUIER consulta a Servicios que
// dependa de esos filtros DEBE re-filtrar en cliente con este helper (si no, llegan datos de más / de
// otro mes / de otro estado, como pasó con la alerta y el resumen del coordinador).
function filtrarServicios(items, { paisNotion = null, desde = null, hasta = null, incluirSinFecha = false, estados = null, incluirEnCurso = false } = {}) {
  return (items || []).filter(s => {
    const p = s.properties || {};
    if (paisNotion && (p['País']?.select?.name) !== paisNotion) return false;
    if (estados && !estados.includes(p['Estado']?.select?.name || '')) return false;
    // Trabajo EN CURSO ahora: se muestra siempre (sin importar el mes), respetando país. Red de seguridad
    // para un servicio "✈️ En curso" cuya Fecha programada cae en otro mes.
    if (incluirEnCurso && (p['Estado']?.select?.name || '').includes('En curso')) return true;
    if (desde || hasta) {
      const f = p['Fecha programada']?.date?.start || '';
      if (!f) return incluirSinFecha;
      if (desde && f < desde) return false;
      if (hasta && f > hasta) return false;
    }
    return true;
  });
}

function getCEOFilter() {
  if (ceoViewCountry === 'all') return null;
  const notionVal = COUNTRY_NOTION_MAP[ceoViewCountry];
  return notionVal ? { property: 'País', select: { equals: notionVal } } : null;
}

const COUNTRY_FINANCE_MAP = { 'Uruguay': '🇺🇾 UY', 'Brasil': '🇧🇷 BR', 'Panamá': '🇵🇦 PA', 'Guatemala': '🇬🇹 GT', 'México': '🇲🇽 MX' };
function getCEOFinanceFilter() {
  if (ceoViewCountry === 'all') return null;
  const val = COUNTRY_FINANCE_MAP[ceoViewCountry];
  if (!val) return null;
  // Uruguay (HQ): incluir también los registros SIN País (algunos cobros se cargaron sin el campo; todo es UY).
  if (ceoViewCountry === 'Uruguay') return { or: [{ property: 'País', select: { equals: val } }, { property: 'País', select: { is_empty: true } }] };
  return { property: 'País', select: { equals: val } };
}
// Espejo cliente-side de getCEOFinanceFilter: ¿este gasto/ingreso pertenece al país que se está viendo?
// Aísla las listas de Gastos/Ingresos por país (socios). UY (HQ) incluye los registros sin País.
function finRecEnPais(r) {
  if (ceoViewCountry === 'all') return true;
  const val = COUNTRY_FINANCE_MAP[ceoViewCountry];
  if (!val) return true;
  const p = r.properties?.['País']?.select?.name || '';
  return ceoViewCountry === 'Uruguay' ? (p === val || p === '') : (p === val);
}
// Igual, pero con el esquema de NOMBRES COMPLETOS (Servicios/Contactos usan '🇺🇾 Uruguay', no '🇺🇾 UY').
// Aísla Por cobrar (servicios) y Clientes (contactos) por país. UY (HQ) incluye los registros sin País.
function recEnPaisNotion(r) {
  if (ceoViewCountry === 'all') return true;
  const val = COUNTRY_NOTION_MAP[ceoViewCountry];
  if (!val) return true;
  const p = r.properties?.['País']?.select?.name || '';
  return ceoViewCountry === 'Uruguay' ? (p === val || p === '') : (p === val);
}

// `let` (no const): si hay checklist editada en ⚙️ Configuración, loadAppConfig() la reemplaza al login.
// Estos valores de código son el DEFAULT (y el fallback si KV está vacío/caído).
let CHECKLIST_PRE = [
  '✈️ Permiso de operador vigente verificado',
  '🌤️ Meteorología consultada y apta para volar',
  '📡 Índice KP verificado en SpaceWeatherLive (≤ 4)',
  '🗺️ Ruta de vuelo definida y revisada',
  '🚁 Drone inspeccionado (sin daños visibles)',
  '🔋 Baterías del drone al 100%',
  '🎮 Batería del mando cargada',
  '🌀 Hélices revisadas (sin roturas)',
  '💪 Brazos desplegados y asegurados (x4)',
  '🔩 Soporte de lanza colocado y fijado',
  '⚡ Patas del drone instaladas (x2)',
  '💧 Manguera desenrollada, lanza y pico ajustado',
  '🔌 Encendido: mando primero → drone → enlace OK',
  '🛰️ Satélites verificados (mínimo 10)',
  '⬜ Zona de despegue libre (radio 2m)',
  '🧪 Vuelo de prueba a 3m — estabilidad OK'
];

let CHECKLIST_POST = [
  '💧 Agua cortada con drone a +3m del área trabajada',
  '🛬 Drone aterrizado en zona segura',
  '📦 Equipo desmontado y guardado correctamente',
  '🧹 Zona limpia, sin rastros de operación',
  '📸 Fotos post-servicio tomadas (mínimo 2)',
  '🤝 Cliente notificado del trabajo realizado',
  '✅ Resultado guardado'
];

// ─────────────────────────────────────────────
// CONFIG DEL NEGOCIO (⚙️ Configuración, editable por admins — /api/app-config, KV)
// Las REGLAS/checklist/plantillas dejan de vivir en el código: el código guarda solo los DEFAULTS
// históricos y cada consumidor pregunta por cfgRegla()/cfgWa()/CHECKLIST_* (pisadas al login).
// Fail-safe total: sin config o sin red, la app se comporta EXACTO como siempre.
// ─────────────────────────────────────────────
const APP_CFG_DEFAULTS = {
  reglas: {
    pipelineAviso: 15,        // días sin respuesta → marcar "para re-contactar" (cron + alerta in-app)
    pipelineSinRespuesta: 45, // días → auto-mover a 😶 Sin respuesta (cron + reloj de vida en card)
    mantenimientoDias: 270,   // ~9 meses desde el último servicio → cliente entra a 🔁 Mantenimiento
    ventasSnoozeDias: 60,     // "📞 Contactado" de Ventas pospone el recontacto estos días
    prospectoDias: 7,         // prospección: próximo contacto sugerido tras una acción
  },
};
let _appCfg = null; // config viva del server ({} si no hay overrides)

function cfgRegla(k) {
  const v = Number(_appCfg?.reglas?.[k]);
  return (Number.isInteger(v) && v >= 1) ? v : APP_CFG_DEFAULTS.reglas[k];
}
// Plantilla de WhatsApp editada (por idioma), con fallback al texto i18n de siempre.
function cfgWa(key) {
  const lang = currentLang === 'pt-BR' ? 'pt' : 'es';
  const s = _appCfg?.waTemplates?.[key]?.[lang];
  return (typeof s === 'string' && s.trim()) ? s : t('wa.msg.' + key);
}
// #6 Tarifas de jornales: rate por operario y método (dron/manual). 0 si no está cargada (cajón vacío).
function cfgTarifa(operarioId, metodo) {
  const v = _appCfg?.tarifas?.[operarioId]?.[metodo === 'manual' ? 'manual' : 'dron'];
  return (typeof v === 'number' && isFinite(v) && v >= 0) ? v : 0;
}
function tarifasCargadas() { return !!(_appCfg?.tarifas && Object.keys(_appCfg.tarifas).length); }
// #7 Costos del servicio: parámetro escalar de la calculadora. null si no está cargado.
function cfgCosto(k) {
  const v = _appCfg?.costos?.[k];
  return (typeof v === 'number' && isFinite(v) && v >= 0) ? v : null;
}
function costosCargados() { return !!(_appCfg?.costos && Object.keys(_appCfg.costos).length); }
// Carga la config al login (best-effort: si falla, defaults del código). Pisa las checklists si hay editadas.
// Guard (review): los ticks se guardan POR ÍNDICE. Si un admin acortó la checklist con un servicio en
// curso, un mapa con índices fuera de rango se DESCARTA (mejor re-tildar que un ✓ en el ítem equivocado).
function _ckAligned(map, list) {
  const ks = Object.keys(map || {}).map(Number).filter(Number.isFinite);
  return !ks.length || Math.max(...ks) < list.length;
}

async function loadAppConfig() {
  try {
    // Timeout 3s (review): en "lie-fi" (conectado sin datos) un fetch sin límite congelaría el LOGIN,
    // porque completarLogin/init lo esperan. Al abortar → defaults del código, idéntico a estar offline.
    const ctl = new AbortController();
    const tid = setTimeout(() => ctl.abort(), 3000);
    const r = await fetch('/api/app-config', { headers: { 'Authorization': 'Bearer ' + (localStorage.getItem('fc_token') || '') }, signal: ctl.signal });
    clearTimeout(tid);
    const j = await r.json().catch(() => ({}));
    if (r.ok && j.ok && j.config) {
      _appCfg = j.config;
      if (Array.isArray(_appCfg.checklistPre) && _appCfg.checklistPre.length) CHECKLIST_PRE = _appCfg.checklistPre;
      if (Array.isArray(_appCfg.checklistPost) && _appCfg.checklistPost.length) CHECKLIST_POST = _appCfg.checklistPost;
    }
  } catch (_) { /* sin red/KV → defaults del código */ }
}

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

const STEPS_RELEVAMIENTO = [
  { id: 'inicio', label: 'LUGAR', icon: '📍' },
  { id: 'relev_datos', label: 'DATOS', icon: '🔍' },
  { id: 'fotos_relevamiento', label: 'FOTOS', icon: '📸' },
  { id: 'relev_notas', label: 'NOTAS', icon: '📝' },
  { id: 'cerrar', label: 'CERRAR', icon: '🏁' }
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

// ─────────────────────────────────────────────
// STATE
// ─────────────────────────────────────────────
let selectedCountry = 'Uruguay';
let currentUser = null;
let activeCEOTab = 'metricas';
let ceoViewCountry = 'all';
let ceoPeriod = { mode: 'mes', off: 0, from: '', to: '' }; // selector de período del CEO (Métricas + Finanzas)
let _ceoServiciosAll = null; // cache de TODOS los servicios (no cambia por período; el fetch del multi-data-source es frágil)
let _ceoContentId = 'ceo-content'; // contenedor donde renderiza Métricas/Finanzas (CEO: ceo-content; panel Finanzas: finanzas-content)
let _ceoRerender = renderCEOMetricas; // qué re-renderiza el selector de período / refrescar según el contexto
let ceoFinCurrency = 'uyu'; // moneda activa en el tab Finanzas del CEO: 'uyu' | 'usd'
let _ceoServiciosCache = []; // servicios del CEO (para generar PDF por id)
// Tablero de Rentabilidad (CEO→Métricas, desplegable "📈 Rentabilidad"): agregados calculados por
// renderCEOMetricas y guardados acá para que el switch de chips (cliente/servicio/país-mes) SOLO
// re-renderice el contenedor #ceo-renta-body — nunca vuelve a llamar renderCEOMetricas ni refetchea.
let _ceoRentaData = null;
let _ceoRentaView = 'cliente'; // 'cliente' | 'servicio' | 'paismes'
// CRM comercial (CEO→Métricas, desplegable "📊 Comercial"): embudo/conversión/valor de pipeline/tiempo
// de cierre, calculados por renderCEOMetricas sobre TODAS las propuestas (no solo las abiertas del
// propFilter de arriba). Guardado acá — no dispara refetch al reabrir el desplegable.
let _ceoComData = null;
// Sub-bloque 🎯 Prospección (spec 2026-07-02 B2), pintado al final de renderCeoComBody: conteos por
// estado de prospección + "nuevos esta semana" (best-effort). Guardado acá por el mismo motivo que
// _ceoComData — null si el fetch falló, y renderCeoComBody simplemente no pinta el sub-bloque.
let _ceoProspData = null;
let currentService = null;
let currentStep = 0;
// Normaliza a array de strings: array→igual, string→[string], null/''→[]. Usado por los campos que
// pasaron de select (string) a multi_select (array): metodoTrabajo, herramientaManual (tolera legacy).
let serviceState = {};
let activeTab = 'ordenes';
let _allServices = [];
let activeCoordTab = 'inicio';
let selectedCoordDay = null;
let coordMonthOffset = 0;
// Paginación lazy del coord: solo se renderizan los primeros N items + botón "Cargar más".
// Se resetea automáticamente al cambiar tab/filtro/sort (todos los renderCoord* lo reset
// cuando se llaman sin keepLimit=true). cargarMasCoord() es el único que mantiene el limit.
const COORD_PAGE_SIZE = 15;
let _coordVisibleLimit = COORD_PAGE_SIZE;

let _coordAllServices = [];
let _operarioOptions = null;
let _coordAllProps = [];
let _coordAllContacts = [];
let editingContact = null;
let contactSheetMode = 'edit';
let contactEditState = {};
let editingService = null;
let editState = {};
let editingProp = null;
let propEditState = {};
let propSheetMode = 'edit';
let pinBuffer = '';
let pinUser = null;
let pinAttempts = 0;

function resetServiceState() {
  serviceState = {
    horaInicio: null,
    horaInicioEfectivo: null,
    horaCierreEfectivo: null,
    checklistPre: {},
    checklistPost: {},
    notasPost: '',
    avance: '',
    finalizacion: '',                            // '' | 'termino' | 'continua' — ¿terminaste? (servicios de trabajo sin sectores)
    resultado: '',
    resultadoPrueba: '',
    clima: [],
    metodoTrabajo: [],       // multi: ['🚁 Dron','💪 Manual'] (puede ser uno, ambos o ninguno)
    herramientaManual: [],   // multi: ['Lanzas','Manguera','Hidrolavadora','Otro'] (solo si incluye Manual)
    isSaving: false,
    photos: { pre: [], post: [], relevamiento: [] },
    relevamiento: {
      m2: '',
      altura: '',
      dificultades: [],
      servicioSugerido: [],
      notasComercial: ''
    },
    sectores: [],   // [{id, nombre, estado:'pendiente'|'en_curso'|'hecho'}] — solo si el servicio tiene sectores
    sectoresAlAbrir: [],   // snapshot [{id,estado}] al abrir — para saber qué sectores se hicieron HOY (parte por día)
    registroJornadas: [],  // parte por día [{fecha,ini,fin,hechos:[ids]}] — read-append-write en el cierre
    // Cache de URLs de mapa heredadas del cliente y la propuesta vinculada.
    // Poblado en openService() antes del primer renderStep().
    clienteMapa: '',
    propMapa: ''
  };
}

// ─────────────────────────────────────────────
// PERSISTENCIA DE serviceState
// localStorage inmediato + debounce 3s a Notion para los campos seguros.
// Notion guarda fotos, clima, resultado. Checklist y notas viven en localStorage
// hasta el cierre del servicio (cerrarServicio commitea todo de una).
// ─────────────────────────────────────────────
function storageKeyForService(id) { return 'fc_service_' + id; }

function persistServiceStateToLocal() {
  if (!currentService?.id) return;
  try {
    localStorage.setItem(storageKeyForService(currentService.id), JSON.stringify({
      state: serviceState,
      step: currentStep,
      ts: Date.now()
    }));
  } catch (e) { console.warn('local persist failed', e); }
}

let _notionFlushTimer = null;
function buildIncrementalProps(s) {
  const properties = {};
  const preFiles = photosToNotionFiles(s.photos?.pre, 'pre');
  const postFiles = photosToNotionFiles(s.photos?.post, 'post');
  const relevFiles = photosToNotionFiles(s.photos?.relevamiento, 'relev');
  if (preFiles.length) properties['📸 Fotos pre-servicio'] = { files: preFiles };
  if (postFiles.length) properties['📸 Fotos post-servicio'] = { files: postFiles };
  if (relevFiles.length) properties['📸 Fotos relevamiento'] = { files: relevFiles };
  const climaArr = Array.isArray(s.clima) ? s.clima : (s.clima ? [s.clima] : []);
  if (climaArr.length) properties['Condición climática'] = { multi_select: climaArr.map(name => ({ name })) };
  const tipoReg = currentService?.properties?.['Tipo de registro']?.select?.name || '';
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

function persistServiceState({ immediateNotion = false } = {}) {
  persistServiceStateToLocal();
  if (!currentService?.id) return;
  clearTimeout(_notionFlushTimer);
  const flush = async () => {
    try {
      const props = buildIncrementalProps(serviceState);
      if (Object.keys(props).length) await queueableUpdateServiceProps(currentService.id, props);
    } catch (e) { console.warn('Notion auto-save failed (will retry next change):', e); }
  };
  if (immediateNotion) flush();
  else _notionFlushTimer = setTimeout(flush, 3000);
}

function hydrateServiceStateFromNotion(svc) {
  const props = svc.properties || {};
  const fmtTime = iso => iso ? new Date(iso).toLocaleTimeString('es-UY', { hour: '2-digit', minute: '2-digit' }) : null;
  // `Hora Inicio` en Notion ahora es la hora programada del coord. NO la usamos para
  // rehidratar serviceState.horaInicio (ese campo refleja cuándo el operario apretó
  // "Iniciar servicio" en su sesión, vive en localStorage).
  const hie = props['Hora Inicio Efectivo']?.date?.start;
  const hfe = props['Hora Fin Efectivo']?.date?.start;
  if (hie) serviceState.horaInicioEfectivo = fmtTime(hie);
  if (hfe) serviceState.horaCierreEfectivo = fmtTime(hfe);

  const climaArr = (props['Condición climática']?.multi_select || []).map(o => o.name).filter(Boolean);
  if (climaArr.length) serviceState.clima = climaArr;
  const resultadoPrueba = props['Resultado prueba']?.select?.name;
  if (resultadoPrueba) serviceState.resultadoPrueba = resultadoPrueba;
  const resultado = props['Resultado']?.select?.name;
  if (resultado) serviceState.resultado = resultado;

  const metodoTrabajo = msNames(props['Método de trabajo']);
  if (metodoTrabajo.length) serviceState.metodoTrabajo = metodoTrabajo;
  const herramientaManual = msNames(props['Herramienta manual']);
  if (herramientaManual.length) serviceState.herramientaManual = herramientaManual;

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
  serviceState.photos.pre = collect(props['📸 Fotos pre-servicio']);
  serviceState.photos.post = collect(props['📸 Fotos post-servicio']);
  serviceState.photos.relevamiento = collect(props['📸 Fotos relevamiento']);
  // Fallback del checklist desde Notion (Punto 5b): si localStorage se perdió
  // (caché borrada / reinstalación), reconstruir pre/post desde la property.
  // hydrateServiceStateFromLocal corre DESPUÉS y, si tiene datos, los superpone (gana lo local).
  try {
    const ckRaw = props['Estado checklist']?.rich_text?.[0]?.plain_text;
    if (ckRaw) {
      const ck = JSON.parse(ckRaw);
      if (ck && typeof ck === 'object') {
        if (ck.pre && Object.keys(ck.pre).length && _ckAligned(ck.pre, CHECKLIST_PRE)) serviceState.checklistPre = ck.pre;
        if (ck.post && Object.keys(ck.post).length && _ckAligned(ck.post, CHECKLIST_POST)) serviceState.checklistPost = ck.post;
      }
    }
  } catch (_) { /* JSON corrupto → ignorar, el checklist arranca vacío */ }
}

function hydrateServiceStateFromLocal(id) {
  try {
    const raw = localStorage.getItem(storageKeyForService(id));
    if (!raw) return false;
    const d = JSON.parse(raw);
    const ls = d.state || {};
    if (ls.checklistPre && Object.keys(ls.checklistPre).length && _ckAligned(ls.checklistPre, CHECKLIST_PRE)) serviceState.checklistPre = ls.checklistPre;
    if (ls.checklistPost && Object.keys(ls.checklistPost).length && _ckAligned(ls.checklistPost, CHECKLIST_POST)) serviceState.checklistPost = ls.checklistPost;
    if (ls.notasPost) serviceState.notasPost = ls.notasPost;
    if (ls.avance) serviceState.avance = ls.avance;
    if (ls.relevamiento) serviceState.relevamiento = { ...serviceState.relevamiento, ...ls.relevamiento };
    // Si Notion no trajo hora pero localStorage sí (caso degradado), tomarla
    if (!serviceState.horaInicio && ls.horaInicio) serviceState.horaInicio = ls.horaInicio;
    if (!serviceState.horaInicioEfectivo && ls.horaInicioEfectivo) serviceState.horaInicioEfectivo = ls.horaInicioEfectivo;
    if (!serviceState.horaCierreEfectivo && ls.horaCierreEfectivo) serviceState.horaCierreEfectivo = ls.horaCierreEfectivo;
    if (!toArr(serviceState.metodoTrabajo).length && ls.metodoTrabajo) serviceState.metodoTrabajo = toArr(ls.metodoTrabajo);
    if (!toArr(serviceState.herramientaManual).length && ls.herramientaManual) serviceState.herramientaManual = toArr(ls.herramientaManual);

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
        const existing = serviceState.photos[ft];
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

function computeStepFromState() {
  if (!STEPS || !STEPS.length) return 0;
  const idxOf = id => STEPS.findIndex(s => s.id === id);
  if (serviceState.horaCierreEfectivo) {
    const t = idxOf('fotos_despues');
    if (t >= 0) return t;
    // STEPS_SECTORES no tiene 'fotos_despues' (las fotos son por sector): tras el cierre efectivo
    // el paso natural es el checklist post, no saltar hasta Notas.
    const cp = idxOf('checklist_post');
    return cp >= 0 ? cp : Math.max(0, STEPS.length - 2);
  }
  if (serviceState.horaInicioEfectivo) {
    const t = idxOf('inicio_efectivo');
    return t >= 0 ? t : 1;
  }
  if (serviceState.horaInicio) {
    const t = idxOf('checklist_pre');
    return t >= 0 ? t : 1;
  }
  return 0;
}

function servicioTieneSectores() {
  return Array.isArray(serviceState.sectores) && serviceState.sectores.length > 0;
}

// Un servicio "continúa" en otra jornada si tiene sectores, no están todos hechos, y ya se registró al menos una jornada.
function servicioContinua(svc) {
  const p = svc?.properties || {};
  let sectores = []; let reg = [];
  try { sectores = JSON.parse(p['Estado sectores']?.rich_text?.[0]?.plain_text || '[]'); } catch (_) {}
  try { reg = JSON.parse(p['Registro jornadas']?.rich_text?.[0]?.plain_text || '[]'); } catch (_) {}
  const total = Array.isArray(sectores) ? sectores.length : 0;
  const hechos = Array.isArray(sectores) ? sectores.filter(s => s.estado === 'hecho').length : 0;
  const continua = total > 0 && hechos < total && Array.isArray(reg) && reg.length > 0;
  return { continua, hechos, total };
}

function sectoresAvancePct() {
  const arr = serviceState.sectores || [];
  if (!arr.length) return 0;
  const hechos = arr.filter(s => s.estado === 'hecho').length;
  return Math.round((hechos / arr.length) * 100);
}

// ─────────────────────────────────────────────
// FOTOS — upload directo a Cloudflare R2 vía presigned URL
// ─────────────────────────────────────────────
const PHOTO_MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const PHOTO_ALLOWED_MIMES = ['image/jpeg','image/jpg','image/png','image/webp','image/heic','image/heif'];
// Recibos aceptan también PDF (factura formal); las fotos de servicio NO.
const RECIBO_ALLOWED_MIMES = [...PHOTO_ALLOWED_MIMES, 'application/pdf'];

function ensurePhotosBucket(fotoType) {
  if (!serviceState.photos) serviceState.photos = { pre: [], post: [], relevamiento: [] };
  if (!serviceState.photos[fotoType]) serviceState.photos[fotoType] = [];
}

// Una foto cuenta como "tomada" si está subida ('done') o encolada offline ('queued'): en ambos casos
// el operario YA la sacó y se subirá al reconectar. Los gates de avance usan esto para NO trabar el
// trabajo sin señal. photosToNotionFiles sigue exigiendo 'done' (solo lo subido va a Notion).
function fotoTomada(p) { return p && (p.status === 'done' || p.status === 'queued'); }

// ¿El error vino de la red (sin señal / fetch caído) y no del servidor (4xx/validación)?
function isNetworkError(e) {
  const m = String(e && e.message || '');
  return (e instanceof TypeError) || /Failed to fetch|NetworkError|Network request failed|Load failed/i.test(m);
}

// Presign + PUT del binario a R2. Reusado por uploadPhoto (online) y processPhotoQueue (reconexión).
// Devuelve la publicUrl. Lanza en error (network o server) para que el llamador decida encolar vs marcar error.
async function putPhotoToR2(serviceId, fotoType, blob, mime, filename) {
  const resp = await fetch('/api/upload-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + (localStorage.getItem('fc_token') || '') },
    body: JSON.stringify({ serviceId, fotoType, filename, contentType: mime, contentLength: blob.size })
  });
  if (!resp.ok) { const data = await resp.json().catch(() => ({})); throw new Error(data.error || ('Backend ' + resp.status)); }
  const { uploadUrl, publicUrl } = await resp.json();
  const putResp = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': mime }, body: blob });
  if (!putResp.ok) throw new Error('Upload ' + putResp.status);
  return publicUrl;
}

async function handlePhotoSelect(inputEl, fotoType, sectorId) {
  const files = Array.from(inputEl.files || []);
  inputEl.value = ''; // reset para permitir re-seleccionar la misma foto
  if (!files.length) return;

  ensurePhotosBucket(fotoType);

  // Subir todas en paralelo
  await Promise.all(files.map(file => uploadPhoto(file, fotoType, sectorId)));
}

async function uploadPhoto(file, fotoType, sectorId) {
  const id = Date.now() + '-' + Math.random().toString(36).slice(2, 7);
  ensurePhotosBucket(fotoType);

  if (file.size > PHOTO_MAX_BYTES) {
    serviceState.photos[fotoType].push({ id, fotoType, sectorId: sectorId || null, filename: file.name, status: 'error', error: 'Foto >10MB' });
    renderStep();
    refreshSectorOverlayIfOpen();
    return;
  }
  const mime = (file.type || '').toLowerCase();
  if (!PHOTO_ALLOWED_MIMES.includes(mime)) {
    serviceState.photos[fotoType].push({ id, fotoType, sectorId: sectorId || null, filename: file.name, status: 'error', error: 'Tipo no permitido' });
    renderStep();
    refreshSectorOverlayIfOpen();
    return;
  }

  const previewUrl = URL.createObjectURL(file);
  const photo = { id, fotoType, sectorId: sectorId || null, filename: file.name, contentType: mime, status: 'uploading', publicUrl: null, error: null, previewUrl };
  serviceState.photos[fotoType].push(photo);
  renderStep();
  refreshSectorOverlayIfOpen();

  // Capturamos el serviceId al inicio del upload para que el resultado se
  // asocie al servicio correcto aunque el operario cambie de servicio durante
  // el PUT a R2. Si al volver currentService es otro, no mutamos el state
  // visible — la foto queda guardada al servicio original via persistServiceState.
  const targetServiceId = currentService?.id;
  if (!targetServiceId) { finalizePhotoUpload(targetServiceId, fotoType, id, { status: 'error', error: 'Sin servicio activo' }); return; }

  const queueItem = { id, serviceId: targetServiceId, fotoType, sectorId: sectorId || null, filename: file.name, contentType: mime, blob: file };

  // Sin conexión → encolar el binario directo y marcar 'queued' (NO se pierde; se sube al reconectar).
  // Si el encolado FALLA (cuota IDB, modo privado) → marcar 'error', no 'queued': una foto marcada
  // "encolada" sin binario sería una pérdida silenciosa con falsa tranquilidad.
  if (!navigator.onLine) {
    const ok = await enqueuePhoto(queueItem);
    finalizePhotoUpload(targetServiceId, fotoType, id, ok ? { status: 'queued' } : { status: 'error', error: 'No se pudo guardar offline' });
    return;
  }

  try {
    const publicUrl = await putPhotoToR2(targetServiceId, fotoType, file, mime, file.name);
    finalizePhotoUpload(targetServiceId, fotoType, id, { status: 'done', publicUrl });
  } catch (e) {
    if (isNetworkError(e)) {
      // La señal se cayó a mitad del upload → encolar en vez de perder la foto (mismo guard que arriba).
      const ok = await enqueuePhoto(queueItem);
      finalizePhotoUpload(targetServiceId, fotoType, id, ok ? { status: 'queued' } : { status: 'error', error: 'No se pudo guardar offline' });
    } else {
      finalizePhotoUpload(targetServiceId, fotoType, id, { status: 'error', error: e.message || 'Error' });
    }
  }
}

// Aplica el resultado final de un upload al photo identificado por id, sin importar
// si el operario sigue en el mismo servicio o se movió a otro. Si está en el mismo,
// muta in-memory + persiste + re-renderiza. Si cambió, parchea solo el localStorage
// del servicio original (la mutación se hace visible al reabrirlo).
function finalizePhotoUpload(targetServiceId, fotoType, photoId, patch) {
  if (currentService?.id === targetServiceId) {
    const arr = serviceState.photos?.[fotoType] || [];
    const ph = arr.find(p => p.id === photoId);
    if (ph) Object.assign(ph, patch);
    persistServiceState();
    renderStep();
    refreshSectorOverlayIfOpen();
    return;
  }
  try {
    const key = storageKeyForService(targetServiceId);
    const raw = localStorage.getItem(key);
    if (!raw) return;
    const st = JSON.parse(raw);
    const arr = st.photos?.[fotoType] || [];
    const idx = arr.findIndex(p => p.id === photoId);
    if (idx >= 0) arr[idx] = { ...arr[idx], ...patch };
    localStorage.setItem(key, JSON.stringify(st));
  } catch (_) {}
}

function retryPhoto(fotoType, photoId) {
  const arr = serviceState.photos?.[fotoType] || [];
  const p = arr.find(x => x.id === photoId);
  if (!p) return;
  // No tenemos el File original; pedimos al usuario que lo seleccione de nuevo
  arr.splice(arr.indexOf(p), 1);
  renderStep();
  // Disparar el file input
  setTimeout(() => {
    const inp = document.getElementById('photo-input-' + fotoType);
    if (inp) inp.click();
  }, 50);
}

function removePhoto(fotoType, photoId) {
  if (!serviceState.photos?.[fotoType]) return;
  if (!confirm(t('foto.borrar.confirm'))) return;
  const p = serviceState.photos[fotoType].find(x => x.id === photoId);
  if (p?.previewUrl) URL.revokeObjectURL(p.previewUrl);
  // Si estaba encolada offline, sacar también el binario de IndexedDB (evita que se suba una foto borrada).
  if (p?.status === 'queued') removePhotoQueueItem(photoId).catch(() => {});
  serviceState.photos[fotoType] = serviceState.photos[fotoType].filter(x => x.id !== photoId);
  persistServiceState();
  renderStep();
  refreshSectorOverlayIfOpen();
}

// Src de la miniatura: el blob LOCAL si existe (recién sacada); si no, la publicUrl POR EL PROXY /api/img.
// El <img> directo al CDN falla dentro de la app → por eso al reabrir un servicio ya subido "se veía 1 de N".
function photoThumbSrc(p) {
  if (p.previewUrl) return p.previewUrl;
  if (p.publicUrl) return '/api/img?u=' + encodeURIComponent(p.publicUrl);
  return '';
}
// Abre el visor grande con las fotos de ESE tipo (pre/post/relevamiento), empezando en la tocada.
function openPhotoViewerFor(fotoType, photoId) {
  const arr = (serviceState.photos?.[fotoType] || []);
  const fotos = arr.map(p => ({ url: photoThumbSrc(p), seccion: seccionLabel(fotoType) })).filter(f => f.url);
  if (!fotos.length) return;
  const idx = arr.findIndex(p => p.id === photoId);
  openPhotoViewer(fotos, idx < 0 ? 0 : Math.min(idx, fotos.length - 1));
}
function renderPhotoUploader(fotoType, minPhotos) {
  const photos = serviceState.photos?.[fotoType] || [];
  const doneCount = photos.filter(p => p.status === 'done').length;
  const queuedCount = photos.filter(p => p.status === 'queued').length;
  const minLabel = minPhotos ? ` (mínimo ${minPhotos})` : '';
  const queuedLabel = queuedCount ? ` · ${queuedCount} ⏳ ${t('photos.queued')}` : '';
  return `
    <div class="photo-uploader">
      <input type="file" accept="image/*" capture="environment" multiple id="photo-input-${fotoType}" onchange="handlePhotoSelect(this, '${fotoType}')" style="display:none">
      <button type="button" class="photo-add-btn" onclick="document.getElementById('photo-input-${fotoType}').click()">📷 ${t('photos.add')}</button>
      <div class="photo-count">${doneCount} ${doneCount === 1 ? t('photos.uploaded.one') : t('photos.uploaded.many')}${minLabel}${queuedLabel}</div>
      <div class="photo-grid">
        ${photos.map(p => `
          <div class="photo-thumb status-${p.status}">
            ${photoThumbSrc(p) ? `<img src="${photoThumbSrc(p)}" alt="" style="cursor:zoom-in" onclick="openPhotoViewerFor('${fotoType}','${p.id}')">` : '<div class="photo-thumb-empty">📷</div>'}
            ${p.status === 'uploading' ? '<div class="photo-overlay"><div class="spinner-sm"></div></div>' : ''}
            ${p.status === 'done' ? '<div class="photo-badge photo-badge-ok">✓</div>' : ''}
            ${p.status === 'queued' ? `<div class="photo-badge" style="background:var(--amber)" title="${t('photos.queued')}">⏳</div>` : ''}
            ${p.status === 'error' ? `<div class="photo-overlay photo-overlay-error" title="${p.error || ''}">⚠️<div class="photo-error-text">${p.error || 'Error'}</div></div>` : ''}
            ${p.status !== 'uploading' ? `<button type="button" class="photo-remove" onclick="removePhoto('${fotoType}','${p.id}')">×</button>` : ''}
            ${p.status === 'error' ? `<button type="button" class="photo-retry" onclick="retryPhoto('${fotoType}','${p.id}')">${t('photos.retry')}</button>` : ''}
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

// Fotos de un sector (filtradas de serviceState.photos[fotoType] por sectorId).
function sectorFotos(sectorId, fotoType) {
  return (serviceState.photos?.[fotoType] || []).filter(p => p.sectorId === sectorId);
}

// Uploader de fotos para un sector: igual a renderPhotoUploader pero filtra por sectorId
// y el input pasa el sectorId al handler. id del input único por sector+fase.
function renderSectorPhotoUploader(sectorId, fotoType, minPhotos) {
  const photos = sectorFotos(sectorId, fotoType);
  const doneCount = photos.filter(p => p.status === 'done').length;
  const queuedCount = photos.filter(p => p.status === 'queued').length;
  const minLabel = minPhotos ? ` (mínimo ${minPhotos})` : '';
  const queuedLabel = queuedCount ? ` · ${queuedCount} ⏳ ${t('photos.queued')}` : '';
  const inputId = `photo-input-${fotoType}-${sectorId}`;
  return `
    <div class="photo-uploader">
      <input type="file" accept="image/*" capture="environment" multiple id="${inputId}" onchange="handlePhotoSelect(this, '${fotoType}', '${escAttrEdit(sectorId)}')" style="display:none">
      <button type="button" class="photo-add-btn" onclick="document.getElementById('${inputId}').click()">📷 ${t('photos.add')}</button>
      <div class="photo-count">${doneCount} ${doneCount === 1 ? t('photos.uploaded.one') : t('photos.uploaded.many')}${minLabel}${queuedLabel}</div>
      <div class="photo-grid">
        ${photos.map(p => `
          <div class="photo-thumb status-${p.status}">
            ${photoThumbSrc(p) ? `<img src="${photoThumbSrc(p)}" alt="" style="cursor:zoom-in" onclick="openPhotoViewerFor('${fotoType}','${p.id}')">` : '<div class="photo-thumb-empty">📷</div>'}
            ${p.status === 'uploading' ? '<div class="photo-overlay"><div class="spinner-sm"></div></div>' : ''}
            ${p.status === 'done' ? '<div class="photo-badge photo-badge-ok">✓</div>' : ''}
            ${p.status === 'queued' ? `<div class="photo-badge" style="background:var(--amber)" title="${t('photos.queued')}">⏳</div>` : ''}
            ${p.status === 'error' ? `<div class="photo-overlay photo-overlay-error" title="${p.error || ''}">⚠️<div class="photo-error-text">${p.error || 'Error'}</div></div>` : ''}
            ${p.status !== 'uploading' ? `<button type="button" class="photo-remove" onclick="removePhoto('${fotoType}','${p.id}')">×</button>` : ''}
            ${p.status === 'error' ? `<button type="button" class="photo-retry" onclick="retryPhoto('${fotoType}','${p.id}')">${t('photos.retry')}</button>` : ''}
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function refreshSectorOverlayIfOpen() {
  const ov = document.getElementById('sector-overlay');
  if (ov && ov.classList.contains('open')) renderSectorOverlay();
}

// ─────────────────────────────────────────────
// NOTION API
// ─────────────────────────────────────────────
// Fase 2 (migración): mapea el endpoint de Notion a la tabla nueva. Las LECTURAS se enrutan a Supabase (/api/db)
// cuando el flag de esa tabla está prendido. SERVICIOS: siempre seguro (el proxy descarta el filtro multi-source y
// cada pantalla re-filtra en cliente). Otras tablas: solo cuando NO hay filtro server-side (para no perderlo) → las
// de FINANZAS con filtro de fecha quedan en Notion hasta migrarlas con su filtro (los números no se tocan).
function _migResource(endpoint) {
  const m = /^databases\/([a-z0-9-]+)\/query$/i.exec(endpoint || '');
  if (!m) return null;
  const id = m[1];
  if (id === DB_ID) return 'servicios';
  if (id === CONTACTOS_DB_ID) return 'clientes';
  if (id === PROPUESTAS_DB_ID) return 'propuestas';
  if (id === GASTOS_DB_ID) return 'gastos';
  if (id === INGRESOS_DB_ID) return 'ingresos';
  return null;
}

// Interruptor CENTRAL de lecturas/sync Supabase: se cambia acá y se deploya (todos los
// dispositivos lo toman al actualizar el sw). localStorage fc_db_<x> = '1' fuerza ON y
// '0' fuerza OFF por dispositivo (override para testing/rollback); sin valor → default central.
// ingresos:true (pre-flip 15/07): las lecturas SIN filtro (Por cobrar, lista de ingresos) van al espejo →
// read-your-writes al editar cobros bajo Supabase-first. Las CON filtro de fecha (KPIs CEO/Finanzas) siguen
// en Notion hasta migrarlas con su filtro (lag ≤60s vía outbox, tolerable en dashboards). gastos queda
// afuera a propósito: la app no edita gastos (create-only) — flipearlo era todo riesgo sin beneficio.
const DB_FLAGS = { clientes: true, servicios: true, propuestas: true, ingresos: true, writesync: true };
function dbFlag(name) {
  const ls = localStorage.getItem('fc_db_' + name);
  if (ls === '1') return true;
  if (ls === '0') return false;
  return !!DB_FLAGS[name];
}

// Renovación silenciosa de sesión (token 7d sliding): el server manda X-Session-Renew con un token
// fresco cuando al vigente le queda <mitad de vida → lo pisamos en localStorage. El equipo activo
// nunca vuelve a tipear el PIN; un dispositivo inactivo expira solo a los 7 días.
// GUARD: solo pisar si el token nuevo expira DESPUÉS que el actual — el SW cachea respuestas con
// headers, y una respuesta cacheada vieja podría traer un X-Session-Renew más viejo (o vencido).
function captureRenewedToken(response) {
  try {
    const nt = response.headers.get('X-Session-Renew');
    if (!nt) return;
    const expOf = (tk) => {
      try {
        const b = String(tk).split('.')[0].replace(/-/g, '+').replace(/_/g, '/');
        return JSON.parse(atob(b + '='.repeat((4 - b.length % 4) % 4))).exp || 0;
      } catch (_) { return 0; }
    };
    if (expOf(nt) > expOf(localStorage.getItem('fc_token') || '')) localStorage.setItem('fc_token', nt);
  } catch (_) {}
}

// ⚠️ REGLA (bug 14-15/07): `callDb` NO acepta filtros — devuelve la tabla entera. Rutear al espejo una query
// CON `body.filter` significa DESCARTAR el filtro en silencio. Solo se rutea:
//   · servicios → el proxy YA descarta el filtro (base multi-source) y cada pantalla re-filtra en cliente;
//   · cualquier tabla SIN filtro server-side.
// 'clientes' estuvo en la lista de excepción (fix del flip, 14/07) y rompió los DEDUP de clientes: las 3
// queries "¿existe un cliente con este tel/email?" recibían TODOS los clientes → resolveOrCreateClienteId
// vinculaba el servicio/propuesta a un cliente ARBITRARIO y saveContactEdit bloqueaba toda alta con
// "ya existe un cliente...". Read-your-writes de clientes NO necesita esa excepción: las listas se leen sin
// filtro (ya van al espejo) y cada write hace syncAfterWrite del registro.
async function callNotion(endpoint, method = 'GET', body = null) {
  if (method === 'POST') {
    const resource = _migResource(endpoint);
    if (resource && dbFlag(resource) && (resource === 'servicios' || !body || !body.filter)) {
      try { return await callDb(resource); } catch (e) { /* fallback a Notion abajo */ }
    }
  }
  const response = await fetch('/api/notion', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + (localStorage.getItem('fc_token') || '') },
    body: JSON.stringify({ endpoint, method, body })
  });
  if (response.status === 401) { forceRelogin(); throw new Error('Sesión expirada'); }
  if (!response.ok) {
    // Incluir el MOTIVO de Notion/proxy en el error (antes solo "API error 400" → imposible diagnosticar).
    let motivo = '';
    try { const j = await response.json(); motivo = j?.message || j?.error || ''; } catch (_) {}
    throw new Error('API error ' + response.status + (motivo ? ': ' + String(motivo).slice(0, 140) : ''));
  }
  captureRenewedToken(response);
  return response.json();
}

// Lee de la base NUEVA (Supabase) vía /api/db, devolviendo el MISMO formato que Notion. Fase 2 (piloto Clientes).
async function callDb(resource) {
  const response = await fetch('/api/db?resource=' + encodeURIComponent(resource), {
    headers: { 'Authorization': 'Bearer ' + (localStorage.getItem('fc_token') || '') }
  });
  if (response.status === 401) { forceRelogin(); throw new Error('Sesión expirada'); }
  if (!response.ok) throw new Error('DB error ' + response.status);
  captureRenewedToken(response);
  const j = await response.json();
  // Blindaje (incidente 02/07): un espejo VACÍO (RLS mal aplicada, tabla recreada, wipe) devolvía
  // 200 + [] y la app mostraba todo en blanco sin caer a Notion. Estas listas nunca son legítimamente
  // vacías (clientes/servicios/propuestas siempre tienen filas); si vuelve vacío => throw => fallback.
  if (!j || !Array.isArray(j.results) || j.results.length === 0) throw new Error('DB espejo vacío — fallback a Notion');
  return j;
}

// Fase 3 ("sync tras guardar"): después de un guardado EXITOSO en Notion (la fuente), refleja ESE
// registro en la base nueva (Supabase) vía /api/db-sync (upsert idempotente por notion_id). Es
// fire-and-forget: si falla, NO rompe nada (Notion ya guardó; el sync batch lo recupera después).
// Detrás del flag localStorage.fc_db_writesync (OFF por defecto). resource ∈ {clientes,servicios,propuestas,gastos,ingresos}.
function syncAfterWrite(notionId, resource) {
  try {
    if (!dbFlag('writesync')) return;
    if (!notionId || !resource) return;
    fetch('/api/db-sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + (localStorage.getItem('fc_token') || '') },
      body: JSON.stringify({ resource, notion_id: notionId }),
    }).catch(() => {});
  } catch (_) {}
}

// ── Mapa id→nombre de clientes (CRM interconectado) ────────────────────────────────────────────────
// Cargado UNA vez y cacheado en módulo, para pintar el cliente en las cards de servicios y resolver los
// intermediarios SIN fetchear por card. Lee del espejo (callNotion rutea a /api/db con fallback a Notion),
// con el scope de país que aplique la RLS. `clienteNombreDe` distingue "id sin resolver" (undefined) de
// "sin id" (el caller decide el placeholder).
let _clienteNombreById = null;
let _clienteNombresLoading = false;
async function ensureClienteNombres() {
  if (_clienteNombreById) return _clienteNombreById;
  try {
    const d = await callNotion(`databases/${CONTACTOS_DB_ID}/query`, 'POST', {});
    const norm = x => (x || '').replace(/-/g, '');
    const map = {};
    for (const c of (d.results || [])) {
      const nm = c.properties?.['Nombre / Empresa']?.title?.[0]?.plain_text;
      if (nm) map[norm(c.id)] = nm;
    }
    _clienteNombreById = map;
  } catch (_) { return {}; } // no cacheamos el fallo → reintenta la próxima
  return _clienteNombreById;
}
function clienteNombreDe(id) {
  if (!id || !_clienteNombreById) return undefined;
  return _clienteNombreById[(id || '').replace(/-/g, '')];
}
function setClienteNombre(id, nombre) { // update optimista tras crear/asignar
  if (!id || !nombre) return;
  if (!_clienteNombreById) _clienteNombreById = {};
  _clienteNombreById[(id || '').replace(/-/g, '')] = nombre;
}

// Igual que callNotion pero PAGINA (sigue next_cursor) y junta todos los resultados.
// Necesario para sumar año/rango con >100 filas (Gastos/Ingresos). No usar en Servicios
// (multi-data-source: la paginación del fallback de búsqueda no aplica).
async function callNotionAll(endpoint, body = {}) {
  let all = [], cursor = null, guard = 0;
  do {
    const b = Object.assign({}, body, { page_size: 100 }, cursor ? { start_cursor: cursor } : {});
    const data = await callNotion(endpoint, 'POST', b);
    all = all.concat(data.results || []);
    cursor = data.has_more ? data.next_cursor : null;
    guard++;
  } while (cursor && guard < 40);
  return { results: all };
}

async function getMyServices(userId) {
  const user = USERS.find(u => u.id === userId);
  const userName = user?.name || '';
  const legacyId = user?.notionId || '';

  const data = await callNotion(`databases/${DB_ID}/query`, 'POST', {
    filter: {
      and: [
        {
          or: [
            { property: 'Operario App', select: { equals: userName } },
            ...(legacyId ? [{ property: 'Operario(s)', people: { contains: legacyId } }] : [])
          ]
        },
        {
          or: [
            { property: 'Estado', select: { equals: '📋 Pendiente' } },
            { property: 'Estado', select: { equals: '🔄 Asignado' } },
            { property: 'Estado', select: { equals: '✈️ En curso' } }
          ]
        }
      ]
    },
    sorts: [{ property: 'Fecha programada', direction: 'ascending' }]
  });

  const validStates = ['📋 Pendiente', '🔄 Asignado', '✈️ En curso'];
  const userCountryNotion = COUNTRY_NOTION_MAP[user?.country] || null;
  let results = (data.results || []).filter(r => {
    if (esArchivado(r)) return false;
    const props = r.properties || {};
    const estado = props['Estado']?.select?.name || '';
    const operarioApp = props['Operario App']?.select?.name || '';
    const operarios = props['Operario(s)']?.people || [];
    const paisServicio = props['País']?.select?.name || null;
    const esAsignado = operarioApp === userName ||
      (legacyId && operarios.some(p => p.id === legacyId));
    const paisOk = userCountryNotion ? paisServicio === userCountryNotion : true;
    return validStates.includes(estado) && esAsignado && paisOk;
  });

  results.sort((a, b) => {
    const a1 = a.properties?.['Fecha programada']?.date?.start || '';
    const b1 = b.properties?.['Fecha programada']?.date?.start || '';
    return a1.localeCompare(b1);
  });

  return results;
}

// Precedencia de ubicación (Fase B): el override del SERVICIO gana sobre el de la PROPUESTA,
// que gana sobre el del CLIENTE. Devuelve la primera URL no vacía, o null si no hay ninguna.
// Reusado por el sheet del servicio (botón Ubicación) y por el step 0 del operario.
function resolveMapsUrl({ svcMapa, propMapa, clienteMapa } = {}) {
  const pick = (v) => (typeof v === 'string' && v.trim()) ? v.trim() : null;
  return pick(svcMapa) || pick(propMapa) || pick(clienteMapa) || null;
}

async function updateServiceProps(pageId, properties) {
  return callNotion(`pages/${pageId}`, 'PATCH', { properties });
}

// ─────────────────────────────────────────────
// OFFLINE WRITE QUEUE (M1)
// Cuando el operario está sin conexión (azotea sin señal), las escrituras a
// Notion se encolan en IndexedDB y se reintentan automáticamente al recuperar
// la conexión. Esto evita perder marcas de hora, checklist o cierre de servicio.
//
// Reads siguen yendo por sw.js con stale-while-revalidate. Solo writes son la queue.
// FOTOS (auditoría 2026-07-09): antes se perdían sin señal (el File no se guardaba). Ahora el
// BINARIO se encola en el store `photoQueue` (IndexedDB) y se sube al reconectar (processPhotoQueue),
// escribiendo la publicUrl a Notion. La metadata de la foto vive también en localStorage (rehidratada
// al reabrir); el binario en IDB sobrevive a recargas.
// ─────────────────────────────────────────────
const OFFLINE_DB_NAME = 'fc-offline-v1';
const OFFLINE_STORE = 'writeQueue';
const PHOTO_STORE = 'photoQueue';

function openOfflineDB() {
  return new Promise((resolve, reject) => {
    // v2: agrega el store de fotos offline. onupgradeneeded corre también para clientes que abrieron v1.
    const req = indexedDB.open(OFFLINE_DB_NAME, 2);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(OFFLINE_STORE)) {
        db.createObjectStore(OFFLINE_STORE, { keyPath: 'id', autoIncrement: true });
      }
      // keyPath 'id' = el id string de la foto (mismo que en serviceState.photos), así se localiza/borra por id.
      if (!db.objectStoreNames.contains(PHOTO_STORE)) {
        db.createObjectStore(PHOTO_STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// ── Cola de FOTOS offline (binarios) ──
async function enqueuePhoto(item) {
  // item: { id, serviceId, fotoType, sectorId, filename, contentType, blob }
  try {
    const db = await openOfflineDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(PHOTO_STORE, 'readwrite');
      tx.objectStore(PHOTO_STORE).put({ ...item, queuedAt: Date.now(), retries: 0 });
      tx.oncomplete = () => { renderOfflineBadge(); resolve(true); };
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) { console.warn('[offline] enqueuePhoto falló', e); return false; }
}

async function getPhotoQueueItems() {
  try {
    const db = await openOfflineDB();
    return await new Promise((resolve, reject) => {
      const req = db.transaction(PHOTO_STORE, 'readonly').objectStore(PHOTO_STORE).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch (e) { return []; }
}

async function removePhotoQueueItem(id) {
  try {
    const db = await openOfflineDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(PHOTO_STORE, 'readwrite');
      tx.objectStore(PHOTO_STORE).delete(id);
      tx.oncomplete = () => { renderOfflineBadge(); resolve(true); };
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) { console.warn('[offline] removePhotoQueueItem falló', e); return false; }
}

async function updatePhotoQueueItem(id, patch) {
  try {
    const db = await openOfflineDB();
    return await new Promise((resolve) => {
      const store = db.transaction(PHOTO_STORE, 'readwrite').objectStore(PHOTO_STORE);
      const getReq = store.get(id);
      getReq.onsuccess = () => {
        const cur = getReq.result;
        if (!cur) return resolve(false);
        Object.assign(cur, patch);
        store.put(cur);
        resolve(true);
      };
      getReq.onerror = () => resolve(false);
    });
  } catch (e) { return false; }
}

async function enqueueWrite(pageId, properties) {
  try {
    const db = await openOfflineDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(OFFLINE_STORE, 'readwrite');
      const store = tx.objectStore(OFFLINE_STORE);
      const item = { pageId, properties, queuedAt: Date.now(), retries: 0 };
      const req = store.add(item);
      req.onsuccess = () => { renderOfflineBadge(); resolve(req.result); };
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.warn('enqueueWrite fallback to memory:', e);
    return null;
  }
}

// Encola un CREATE (crear página en Notion) en la misma writeQueue, con un discriminador type:'create'
// (auditoría 2026-07-09 — "seguir otro día" sin señal). `dedup` = { rootId, jornadaN } permite chequear
// antes del POST si la ficha ya existe (idempotencia entre reintentos). Las properties se CONGELAN al
// encolar (snapshot del servicio padre); processQueue las postea tal cual al reconectar.
async function enqueueCreate(dsId, properties, dedup) {
  try {
    const db = await openOfflineDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(OFFLINE_STORE, 'readwrite');
      tx.objectStore(OFFLINE_STORE).add({ type: 'create', dsId, properties, dedup: dedup || null, queuedAt: Date.now(), retries: 0 });
      tx.oncomplete = () => { renderOfflineBadge(); resolve(true); };
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) { console.warn('[offline] enqueueCreate falló', e); return false; }
}

// Dedup client-side de una jornada J+1 antes de crearla. Devuelve true si ya existe una ficha con esa
// Orden madre + Jornada N°. LANZA si la query falla → processQueue reintenta (nunca crea a ciegas).
// ⚠️ CRÍTICO: pegamos DIRECTO al proxy Notion (la FUENTE), NO por callNotion — callNotion rutea las
// lecturas de Servicios al espejo Supabase, que se sincroniza cada ~10 min y por ende NUNCA reflejaría la
// J+1 recién creada dentro de la ventana de reintentos (30s) → daría false-negative → ficha DUPLICADA en el
// caso "POST OK pero respuesta perdida". El índice de Notion tiene lag de segundos (<< 30s) → sí la ve.
// Orden last_edited_time desc: la página recién creada/editada entra en la primera página (mitiga el tope 100).
async function jornadaYaExiste(dedup) {
  if (!dedup || !dedup.rootId || dedup.jornadaN == null) return false;
  const resp = await fetch('/api/notion', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + (localStorage.getItem('fc_token') || '') },
    body: JSON.stringify({ endpoint: `databases/${DB_ID}/query`, method: 'POST', body: { page_size: 100, sorts: [{ timestamp: 'last_edited_time', direction: 'descending' }] } })
  });
  if (!resp.ok) throw new Error('API error ' + resp.status); // red/servidor → reintentar, no crear a ciegas
  const d = await resp.json();
  const pool = d.results || [];
  // Un pool VACÍO = "no sé" (el search-fallback puede devolver [] bajo carga/rate-limit), NO "no existe":
  // Servicios nunca está legítimamente vacío. Tratarlo como "no existe" crearía a ciegas → duplicado.
  if (!pool.length) throw new Error('pool vacío — reintentar');
  const nrm = id => (id || '').replace(/-/g, '');
  const root = nrm(dedup.rootId);
  return pool.some(s => {
    const om = s.properties?.['Orden madre']?.relation?.[0]?.id;
    const jn = s.properties?.['Jornada N°']?.number;
    return om && nrm(om) === root && jn === dedup.jornadaN;
  });
}

async function getQueueItems() {
  try {
    const db = await openOfflineDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(OFFLINE_STORE, 'readonly');
      const store = tx.objectStore(OFFLINE_STORE);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch (e) { return []; }
}

async function removeQueueItem(id) {
  try {
    const db = await openOfflineDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(OFFLINE_STORE, 'readwrite');
      const store = tx.objectStore(OFFLINE_STORE);
      const req = store.delete(id);
      req.onsuccess = () => { renderOfflineBadge(); resolve(true); };
      req.onerror = () => reject(req.error);
    });
  } catch (e) { console.warn('[offline] removeQueueItem falló', e); return false; }
}

async function updateQueueItem(id, patch) {
  try {
    const db = await openOfflineDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(OFFLINE_STORE, 'readwrite');
      const store = tx.objectStore(OFFLINE_STORE);
      const getReq = store.get(id);
      getReq.onsuccess = () => {
        const cur = getReq.result;
        if (!cur) return resolve(false);
        Object.assign(cur, patch);
        const putReq = store.put(cur);
        putReq.onsuccess = () => resolve(true);
        putReq.onerror = () => { console.warn('[offline] updateQueueItem put falló', putReq.error); resolve(false); };
      };
      getReq.onerror = () => reject(getReq.error);
    });
  } catch (e) { console.warn('[offline] updateQueueItem falló', e); return false; }
}

let _queueProcessing = false;
async function processQueue() {
  if (_queueProcessing) return;
  if (!navigator.onLine) return;
  _queueProcessing = true;
  try {
    const items = await getQueueItems();
    const ahora = Date.now();
    for (const item of items) {
      // Idempotencia: saltar ítems "reclamados" hace < 90s (ej. otra pestaña los está sincronizando).
      // Si quedaron colgados (>90s), se re-reclaman. El PATCH es idempotente igual, esto evita reprocesos.
      if (item.processing && (ahora - item.processing) < 90000) continue;
      await updateQueueItem(item.id, { processing: ahora });
      try {
        if (item.type === 'create') {
          // Dedup ANTES de crear → idempotente entre reintentos (ej. si el POST se ejecutó pero se
          // perdió la respuesta): si la J+1 ya existe en Notion, no la re-creamos. jornadaYaExiste lanza
          // si la query falla por red → cae al catch y se reintenta (nunca crea a ciegas).
          if (!(await jornadaYaExiste(item.dedup))) {
            await callNotion('pages', 'POST', { parent: { type: 'data_source_id', data_source_id: item.dsId }, properties: item.properties });
          }
        } else {
          await callNotion(`pages/${item.pageId}`, 'PATCH', { properties: item.properties });
        }
        await removeQueueItem(item.id);
      } catch (e) {
        // Si falla, liberar (processing:null) e incrementar retries; si excede 10, descartar.
        const newRetries = (item.retries || 0) + 1;
        if (newRetries > 10) {
          console.warn('[offline] queue item discarded after 10 retries', item);
          await removeQueueItem(item.id);
        } else {
          await updateQueueItem(item.id, { retries: newRetries, processing: null });
        }
        // Romper el loop — si una falla, probablemente todas fallarán (sin conexión).
        break;
      }
    }
  } finally {
    _queueProcessing = false;
    renderOfflineBadge();
  }
}

async function renderOfflineBadge() {
  const [items, photos] = await Promise.all([getQueueItems(), getPhotoQueueItems()]);
  const total = items.length + photos.length;
  let badge = document.getElementById('offline-badge');
  if (!total && !badge) return;
  if (!badge) {
    badge = document.createElement('div');
    badge.id = 'offline-badge';
    badge.className = 'offline-badge';
    document.body.appendChild(badge);
  }
  if (!total) {
    badge.style.display = 'none';
    return;
  }
  badge.style.display = 'flex';
  const isOnline = navigator.onLine;
  // Detallar las fotos aparte (lo que más le importa al operario: "no perdí mis fotos").
  const label = photos.length ? `${total} pendiente${total > 1 ? 's' : ''} (${photos.length} 📷)` : `${total} pendiente${total > 1 ? 's' : ''}`;
  badge.innerHTML = isOnline
    ? `<span class="offline-badge-dot" style="background:var(--amber)"></span><span>🔄 ${label} sincronizando…</span>`
    : `<span class="offline-badge-dot" style="background:#ff6b6b"></span><span>📴 ${label} sin conexión</span>`;
}

// Wrapper que prueba escribir directo; si falla por red, encola.
async function queueableUpdateServiceProps(pageId, properties) {
  if (!navigator.onLine) {
    // Sin conexión: encolar directo.
    await enqueueWrite(pageId, properties);
    return { queued: true };
  }
  try {
    return await updateServiceProps(pageId, properties);
  } catch (e) {
    // Si fue por red, encolar; otros errores (validación, 4xx) se propagan.
    const msg = String(e?.message || '');
    if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('Network request failed')) {
      await enqueueWrite(pageId, properties);
      return { queued: true };
    }
    throw e;
  }
}

// Drena la cola de fotos en DOS FASES para no perder ni duplicar (auditoría 2026-07-09):
//   Fase 1 — subir cada binario a R2 UNA vez y guardar su publicUrl en el propio item (el reintento NO
//            re-sube → no genera URLs nuevas ni duplicados en Notion).
//   Fase 2 — escribir a Notion (append que preserva lo existente) agrupado por servicio; el item se borra
//            SOLO si el write CONFIRMA. Si el GET/PATCH falla, el item queda encolado y se reintenta.
let _photoQueueProcessing = false;
async function processPhotoQueue() {
  if (_photoQueueProcessing || !navigator.onLine) return;
  _photoQueueProcessing = true;
  try {
    // ── Fase 1: R2 ──
    let items = await getPhotoQueueItems();
    for (const it of items) {
      if (!navigator.onLine) break;
      if (it.publicUrl) continue;                                   // ya subido a R2 en una corrida previa
      if (!it.blob) { await removePhotoQueueItem(it.id); continue; } // defensivo: item sin binario
      try {
        const publicUrl = await putPhotoToR2(it.serviceId, it.fotoType, it.blob, it.contentType, it.filename);
        finalizePhotoUpload(it.serviceId, it.fotoType, it.id, { status: 'done', publicUrl }); // refresca la vista si el servicio está abierto
        await updatePhotoQueueItem(it.id, { publicUrl });           // persistir la URL: no re-subir en el reintento
      } catch (e) {
        if (isNetworkError(e)) break;                               // se cayó la señal → reintentar en la próxima
        const r = (it.retries || 0) + 1;                           // error permanente (4xx/validación)
        if (r > 5) { finalizePhotoUpload(it.serviceId, it.fotoType, it.id, { status: 'error', error: 'No se pudo subir' }); await removePhotoQueueItem(it.id); }
        else await updatePhotoQueueItem(it.id, { retries: r });
      }
    }
    // ── Fase 2: Notion ── (solo los que ya tienen publicUrl; agrupados por servicio)
    items = await getPhotoQueueItems();
    const byService = {};
    for (const it of items) { if (it.publicUrl) (byService[it.serviceId] = byService[it.serviceId] || []).push(it); }
    for (const [sid, its] of Object.entries(byService)) {
      if (!navigator.onLine) break;
      try {
        await appendPhotosToNotion(sid, its.map(it => ({ fotoType: it.fotoType, filename: it.filename, sectorId: it.sectorId || null, publicUrl: it.publicUrl })));
        for (const it of its) await removePhotoQueueItem(it.id);    // recién ahora: Notion confirmó
      } catch (e) {
        if (isNetworkError(e)) continue;                           // sin señal → reintentar sin gastar reintentos
        for (const it of its) {                                    // Notion rechaza persistentemente (¿página borrada?)
          const r = (it.retries || 0) + 1;
          if (r > 8) { finalizePhotoUpload(it.serviceId, it.fotoType, it.id, { status: 'error', error: 'No se pudo adjuntar' }); await removePhotoQueueItem(it.id); }
          else await updatePhotoQueueItem(it.id, { retries: r });
        }
      }
    }
  } finally {
    _photoQueueProcessing = false;
    renderOfflineBadge();
  }
}

// Escribe a Notion las fotos recién subidas de un servicio, AGREGÁNDOLAS a las que ya están en la página
// (lee los files actuales y hace union por URL). NO pisa fotos existentes. Si el GET falla (red o server
// 429/5xx/401) LANZA: sin conocer el estado actual, un replace con existing=[] borraría fotos previas →
// mejor abortar y reintentar (el llamador mantiene los items encolados).
async function appendPhotosToNotion(serviceId, uploads) {
  const PROP = { pre: '📸 Fotos pre-servicio', post: '📸 Fotos post-servicio', relevamiento: '📸 Fotos relevamiento' };
  const page = await callNotion('pages/' + serviceId, 'GET'); // lanza ante cualquier error → no escribir a ciegas
  const props = {};
  ['pre', 'post', 'relevamiento'].forEach(ft => {
    const ups = uploads.filter(u => u.fotoType === ft && u.publicUrl);
    if (!ups.length) return;
    // Normalizamos los files existentes de Notion a formato external con su URL (todas nuestras fotos son external).
    const existing = ((page && page.properties && page.properties[PROP[ft]] && page.properties[PROP[ft]].files) || [])
      .map(f => ({ type: 'external', name: f.name || 'foto.jpg', external: { url: f.external?.url || f.file?.url || '' } }))
      .filter(f => f.external.url);
    const urls = new Set(existing.map(f => f.external.url));
    const additions = [];
    ups.forEach(u => {
      if (urls.has(u.publicUrl)) return; // ya está en Notion → no duplicar
      urls.add(u.publicUrl);
      const ext = (u.filename?.split('.').pop() || 'jpg').toLowerCase();
      const name = `${u.sectorId ? u.sectorId + '__' : ''}${ft}-${existing.length + additions.length + 1}.${ext}`;
      additions.push({ type: 'external', name, external: { url: u.publicUrl } });
    });
    if (additions.length) props[PROP[ft]] = { files: [...existing, ...additions] };
  });
  if (Object.keys(props).length) await queueableUpdateServiceProps(serviceId, props);
}

// Auto-process al recuperar conexión + cada 30s mientras haya items (writes y fotos).
window.addEventListener('online', () => { processQueue(); processPhotoQueue(); renderOfflineBadge(); });
window.addEventListener('offline', () => { renderOfflineBadge(); });
let _processQueueIntervalId = setInterval(() => { if (navigator.onLine) { processQueue(); processPhotoQueue(); } }, 30000);

// ─────────────────────────────────────────────
// SCREENS
// ─────────────────────────────────────────────
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-' + id).classList.add('active');
  // Banner de instalación: aparece solo en pantallas home, se retira al entrar al flujo de trabajo/login.
  try { updateInstallBanner(); } catch (_) {}
  try { updateAyudaFab(); } catch (_) {} // 🤖 FAB del asistente: solo en paneles de rol, con sesión
}

// Auto-refresco al volver a la app (auditoría 2026-07-09): antes, si el coordinador asignaba/movía algo,
// el operario no lo veía hasta recargar a mano (y viceversa). Al volver el foco tras >25s oculta, se
// re-fetch de la pantalla ACTIVA. Guards: nunca con un sheet abierto (perdería la edición) ni en las
// pantallas de trabajo del operario (detail/done). El SW (stale-while-revalidate) hace el refetch casi
// instantáneo. Solo lista/paneles, no re-abre nada.
let _hiddenSince = 0;
function refreshCurrentScreen() {
  if (document.querySelector('.edit-overlay.open, #pin-change-overlay.open')) return; // sheet abierto → no tocar
  const scr = (document.querySelector('.screen.active') || {}).id || '';
  try {
    if (scr === 'screen-services') { if (typeof loadServices === 'function') loadServices(); }
    else if (scr === 'screen-coordinator') {
      // Solo las tabs de listas que sincronizan coord↔operario (asignaciones/propuestas); el resto se salta.
      const rf = { inicio: renderCoordInicio, servicios: renderCoordServicios, pruebas: renderCoordPruebas, relevamientos: renderCoordRelevamientos, propuestas: renderCoordPropuestas }[typeof activeCoordTab !== 'undefined' ? activeCoordTab : ''];
      if (typeof rf === 'function') rf();
    }
    else if (scr === 'screen-ceo') { if (typeof loadCEO === 'function') loadCEO(); }
    else if (scr === 'screen-finanzas') { if (typeof loadFinanzas === 'function') loadFinanzas(); }
  } catch (_) { /* un refresh que falla nunca debe romper la vista actual */ }
}
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { _hiddenSince = Date.now(); return; }
  if (_hiddenSince && (Date.now() - _hiddenSince) > 25000) refreshCurrentScreen();
  _hiddenSince = 0;
});

function showSaving() {
  const bar = document.getElementById('savingBar');
  bar.classList.add('visible');
  setTimeout(() => bar.classList.remove('visible'), 2000);
}

// ─────────────────────────────────────────────
// LOGIN
// ─────────────────────────────────────────────
function selectCountry(country) {
  selectedCountry = country;
  localStorage.setItem('fc_country', country);
  applyLangForCountry(country);
  renderLogin();
  showScreen('login');
}

function applyLangForCountry(country) {
  if (country === 'Brasil') {
    const saved = localStorage.getItem('fc_lang_Brasil');
    setCurrentLang(saved === 'es' ? 'es' : 'pt-BR');
  } else {
    setCurrentLang('es');
  }
  applyTranslations();
  updateLangToggleUI();
}

function backToCountry() {
  localStorage.removeItem('fc_country');
  localStorage.removeItem('fc_user');
  selectedCountry = null;
  pinUser = null;
  currentUser = null;
  setCurrentLang('es');
  applyTranslations();
  updateLangToggleUI();
  showScreen('country');
}

function backToLogin() {
  localStorage.removeItem('fc_user');
  pinUser = null;
  currentUser = null;
  pinBuffer = '';
  renderLogin();
  showScreen('login');
}

// Fase 3.0 (login sin deploy): pobla el array USERS desde /api/users-roster (la base), preservando emoji y
// notionId del array embebido por id (la DB no los trae). FALLBACK DURO: si el fetch falla/timeout o vuelve
// vacío, se mantiene el array embebido → la pantalla de login NUNCA queda sin usuarios. Con el flag del server
// apagado, el endpoint devuelve los 23 hardcodeados → reemplaza por los mismos (sin cambio visible). Devuelve
// true si reemplazó el array. No bloquea el arranque (se llama en background desde init).
async function loadRoster() {
  try {
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), 3500);
    let r;
    try { r = await fetch('/api/users-roster', { cache: 'no-store', signal: ctrl.signal }); }
    finally { clearTimeout(to); }
    if (!r.ok) return false;
    const data = await r.json();
    // Con el flag OFF (o Supabase caído) el endpoint sirve el hardcoded del SERVER → NO pisamos el array
    // embebido del cliente: ese embebido es el piso anti-lockout hasta que se prenda el modo base (source='db').
    if (data.source !== 'db') return false;
    if (!Array.isArray(data.users) || !data.users.length) return false;
    const prev = Object.fromEntries(USERS.map(u => [u.id, u]));
    const firstTok = s => String(s || '').trim().split(/\s+/)[0] || '👤';
    const mapped = data.users.map(u => ({
      id: u.id, name: u.nombre, role: u.rol, country: u.pais,
      emoji: prev[u.id]?.emoji || u.emoji || firstTok(u.rol),
      notionId: prev[u.id]?.notionId || null,
    })).filter(u => u.id && u.name && u.role && u.country);
    if (!mapped.length) return false;
    USERS.length = 0; USERS.push(...mapped);
    return true;
  } catch (_) { return false; }
}

// Login v2 (2026-07-11, pedido de Diego): SIN lista pública de usuarios — se entra escribiendo el
// NOMBRE (o email cuando el roster lo tenga) + PIN. Los PINs no cambiaron. La pantalla de re-PIN
// (screen-pin, usuario ya conocido en este dispositivo tras 8h) sigue igual — esto es solo el alta de sesión.
function renderLogin() {
  const list = document.getElementById('users-list');
  list.innerHTML = `
    <div class="login-form">
      <div class="login-field-label" data-i18n="login.user.label">${esc(t('login.user.label'))}</div>
      <input class="login-input" id="login-user" type="text" autocomplete="username" autocapitalize="words"
        placeholder="${esc(t('login.user.ph'))}"
        onkeydown="if(event.key==='Enter'){document.getElementById('login-pin').focus()}"/>
      <div class="login-field-label" data-i18n="login.pin.label">${esc(t('login.pin.label'))}</div>
      <input class="login-input login-input-pin" id="login-pin" type="password" inputmode="numeric"
        autocomplete="current-password" maxlength="6" placeholder="••••"
        oninput="this.value=this.value.replace(/\\D/g,'').slice(0,6)"
        onkeydown="if(event.key==='Enter'){loginSubmit()}"/>
      <div class="pin-error" id="login-error" style="min-height:16px;margin:6px 0 2px"></div>
      <button class="login-btn" id="login-btn" onclick="loginSubmit()">${esc(t('login.btn'))}</button>
    </div>`;
}

// Matching tolerante del identificador (case/acentos/espacios-insensible), SIEMPRE dentro del país elegido:
// nombre completo exacto → primer nombre único → prefijo único ("federico m") → id → email (si el roster lo trae).
function _normName(s) { return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/\s+/g, ' '); }
function resolveLoginUser(txt) {
  const q = _normName(txt);
  if (!q) return null;
  const pool = USERS.filter(u => u.country === selectedCountry);
  let m = pool.filter(u => _normName(u.name) === q || String(u.id).toLowerCase() === q || (u.email && _normName(u.email) === q));
  if (m.length === 1) return m[0];
  m = pool.filter(u => _normName(u.name).split(' ')[0] === q);
  if (m.length === 1) return m[0];
  if (q.length >= 3) { // prefijo: mínimo 3 letras (evita que 2 letras sueltas matcheen a alguien)
    m = pool.filter(u => _normName(u.name).startsWith(q));
    if (m.length === 1) return m[0];
  }
  return null; // ambiguo o inexistente → el caller muestra el error GENÉRICO (no se revela nada)
}

async function loginSubmit() {
  const errEl = document.getElementById('login-error');
  const btn = document.getElementById('login-btn');
  const pinEl = document.getElementById('login-pin');
  const user = resolveLoginUser(document.getElementById('login-user')?.value);
  const pin = String(pinEl?.value || '');
  errEl.textContent = '';
  // Error GENÉRICO idéntico para usuario inexistente/ambiguo y PIN mal → no se filtra quién existe.
  if (!user || !/^(\d{4}|\d{6})$/.test(pin)) { errEl.textContent = t('login.err'); return; }
  btn.disabled = true; btn.textContent = '···';
  let ok = false;
  try { ok = await verifyPin(user.id, pin); } catch (_) { ok = false; }
  btn.disabled = false; btn.textContent = t('login.btn');
  if (!ok) { errEl.textContent = t('login.err'); pinEl.value = ''; return; }
  await completarLogin(user);
}

// Camino único post-autenticación (lo usan el login nuevo Y el re-PIN de screen-pin).
async function completarLogin(u) {
  pinAttempts = 0;
  await purgeReadCaches(); // sesión nueva → no servir cachés de lectura del usuario anterior
  resetAyudaBot();         // ídem para el chat del bot (cinturón: logout ya lo limpia, esto cubre cualquier otra ruta)
  currentUser = { id: u.id, name: u.name, role: u.role, emoji: u.emoji, country: u.country };
  localStorage.setItem('fc_user', JSON.stringify(currentUser));
  markUserActive();
  await loadAppConfig(); // reglas/checklist/plantillas editadas (best-effort, nunca bloquea)
  await routeByRole(currentUser.role);
  // El banner de instalación lo maneja showScreen (via routeByRole) según la pantalla — no molesta si ya
  // está instalada, si el usuario lo descartó, ni en el flujo de trabajo/login.
}

function selectUser(userId) {
  pinUser = USERS.find(u => u.id === userId);
  if (!pinUser) return;
  document.getElementById('pin-emoji').textContent = pinUser.emoji;
  document.getElementById('pin-name').textContent = pinUser.name;
  pinBuffer = '';
  updatePinDots();
  document.getElementById('pin-error').textContent = '';
  showScreen('pin');
}

let _pinTimer = null;
function pinPress(digit) {
  if (pinBuffer.length >= 6) return;
  pinBuffer += digit;
  updatePinDots();
  if (_pinTimer) { clearTimeout(_pinTimer); _pinTimer = null; }
  // Soporta PIN de 4 o 6 dígitos: a los 6 envía ya; a los 4 espera un toque por si el PIN sigue
  // hasta 6 (si no llega otro dígito, auto-envía). El ✓ también envía (ver pinConfirm).
  // 1200ms: con 500ms, un tecleo humano normal de un PIN de 6 disparaba el envío a los 4 dígitos
  // y daba "PIN incorrecto" falso (hallazgo del barrido 02/07).
  if (pinBuffer.length === 6) pinConfirm();
  else if (pinBuffer.length === 4) _pinTimer = setTimeout(pinConfirm, 1200);
}

function pinDelete() {
  if (_pinTimer) { clearTimeout(_pinTimer); _pinTimer = null; }
  if (pinBuffer.length > 0) { pinBuffer = pinBuffer.slice(0, -1); updatePinDots(); }
}

function updatePinDots() {
  const c = document.getElementById('pin-dots');
  if (!c) return;
  const slots = Math.max(4, pinBuffer.length); // 4 a 6 puntos visibles según lo tipeado
  let html = '';
  for (let i = 0; i < slots; i++) html += '<div class="pin-dot' + (i < pinBuffer.length ? ' filled' : '') + '"></div>';
  c.innerHTML = html;
}

// ─────────────────────────────────────────────
// Sesión: la app permite reabrir sin pedir PIN si la última actividad
// está dentro de SESSION_MAX_MS. Pasado ese umbral, se vuelve a pedir PIN.
// ─────────────────────────────────────────────
const SESSION_MAX_MS = 8 * 60 * 60 * 1000;
function markUserActive() {
  try { localStorage.setItem('fc_last_active', String(Date.now())); } catch (_) {}
}
function isSessionFresh() {
  try {
    const ts = parseInt(localStorage.getItem('fc_last_active') || '0', 10);
    return ts > 0 && (Date.now() - ts) < SESSION_MAX_MS;
  } catch (_) { return false; }
}
async function routeByRole(role) {
  if (role === '🔧 Coordinador' || role === '🎯 Dirección') return loadCoordinator();
  // 🧲 Ventas (spec 2026-07-02 B2): comparte la screen del coordinador, pero loadCoordinator()
  // le oculta todas las tabs salvo 🎯 Prospección (ver gating ahí + en setCoordTab).
  if (role === '🧲 Ventas') return loadCoordinator();
  if (role === '👔 CEO') return loadCEO();
  if (role === '📊 Administración') return loadFinanzas();
  return loadServices();
}

async function loadFinanzas() {
  if (!currentUser) { showScreen('login'); return; }
  if (!puedeVerFinanzas()) { return routeByRole(currentUser.role); } // solo Finanzas/CEO/Dirección
  markUserActive();
  showScreen('finanzas');
  document.getElementById('finanzas-header-user').textContent = (currentUser.emoji + ' ' + currentUser.name);
  ceoViewCountry = currentUser?.country || 'Uruguay'; // Finanzas país-aware: cada encargado ve SU país (UY incluye registros sin país)
  ceoPeriod = { mode: 'mes', off: 0, from: '', to: '' };
  setFinanzasTab('resumen');
}

let activeFinanzasTab = 'gastos';
const GASTOS_DB_ID = NOTION_DBS.gastos;
const INGRESOS_DB_ID = NOTION_DBS.ingresos;
let _finanzasVisibleLimit = COORD_PAGE_SIZE;
let _gastosCache = null;
let _ingresosCache = null;
let _finanzasFilterCategoria = '';
let _finanzasFilterClase = '';
let _finanzasFilterTipo = '';

async function fetchGastosForMonth() {
  // Trae los gastos del mes actual. Para v1 sin filtro server-side de mes
  // (Notion devuelve max 100 sin paginar) — toda la lista del último mes.
  // Pagina TODO (antes se cortaba en 100 → faltaban gastos cuando hay >100).
  const data = await callNotionAll(`databases/${GASTOS_DB_ID}/query`, {
    sorts: [{ property: 'Fecha', direction: 'descending' }]
  });
  return data.results || [];
}

async function fetchIngresosForMonth() {
  const data = await callNotionAll(`databases/${INGRESOS_DB_ID}/query`, {
    sorts: [{ property: 'Fecha', direction: 'descending' }]
  });
  // Orden defensivo client-side: con DB_FLAGS.ingresos la lectura sale del espejo (/api/db), que
  // ignora los `sorts` de Notion — sin esto la lista quedaría desordenada.
  return (data.results || []).slice().sort((a, b) =>
    (b.properties?.['Fecha']?.date?.start || '').localeCompare(a.properties?.['Fecha']?.date?.start || ''));
}

function setFinanzasTab(tab) {
  activeFinanzasTab = tab;
  markUserActive();
  ['resumen', 'porcobrar', 'clientes', 'gastos', 'ingresos', 'reportes'].forEach(t => {
    const el = document.getElementById('ftab-' + t);
    if (el) el.classList.toggle('active', t === tab);
  });
  _finanzasVisibleLimit = COORD_PAGE_SIZE;
  _finanzasFilterCategoria = '';
  _finanzasFilterClase = '';
  _finanzasFilterTipo = '';
  if (tab === 'resumen') {
    _ceoContentId = 'finanzas-content';
    ceoViewCountry = currentUser?.country || 'Uruguay'; // Finanzas país-aware: cada encargado ve SU país (UY incluye registros sin país)
    _ceoRerender = renderCEOFinanzas;
    renderCEOFinanzas();
  } else if (tab === 'porcobrar') { _ceoContentId = 'finanzas-content'; _ceoRerender = () => renderPorCobrar('finanzas-content'); renderPorCobrar('finanzas-content'); }
  else if (tab === 'clientes') { _ceoContentId = 'finanzas-content'; _ceoRerender = () => renderClientesView('finanzas-content'); renderClientesView('finanzas-content'); }
  else if (tab === 'gastos') renderGastosList();
  else if (tab === 'ingresos') renderIngresosList();
  else renderReportes();
}

async function renderGastosList() {
  const myTab = 'gastos';
  const content = document.getElementById('finanzas-content');
  content.innerHTML = '<div style="text-align:center;padding:40px 0"><div class="spinner" style="margin:0 auto"></div></div>';
  try {
    if (!_gastosCache) _gastosCache = await fetchGastosForMonth();
    if (activeFinanzasTab !== myTab) return;
    renderGastosListInner();
  } catch (e) {
    if (activeFinanzasTab !== myTab) return;
    content.innerHTML = `<div class="coord-empty">${t('coord.error.load')}<br><small>${esc(e.message)}</small></div>`;
  }
}

function renderGastosListInner() {
  const content = document.getElementById('finanzas-content');
  let items = (_gastosCache || []).filter(finRecEnPais);
  if (_finanzasFilterCategoria) items = items.filter(g => g.properties?.['Categoría']?.select?.name === _finanzasFilterCategoria);
  if (_finanzasFilterClase) items = items.filter(g => g.properties?.['Clase']?.select?.name === _finanzasFilterClase);
  const total = items.length;
  const visible = items.slice(0, _finanzasVisibleLimit);
  const remaining = total - visible.length;

  const totalSplit = sumByMoneda(items, 'gasto');

  const categorias = [...new Set((_gastosCache || []).map(g => g.properties?.['Categoría']?.select?.name).filter(Boolean))].sort();
  const filtersHTML = `
    <div class="finanzas-filters">
      <select class="finanzas-filter-select" onchange="_finanzasFilterCategoria=this.value;_finanzasVisibleLimit=COORD_PAGE_SIZE;renderGastosListInner()">
        <option value="">📂 Todas las categorías</option>
        ${categorias.map(c => `<option value="${esc(c)}" ${_finanzasFilterCategoria===c?'selected':''}>${esc(c)}</option>`).join('')}
      </select>
      <select class="finanzas-filter-select" onchange="_finanzasFilterClase=this.value;_finanzasVisibleLimit=COORD_PAGE_SIZE;renderGastosListInner()">
        <option value="">🏷 Todas (directos + indirectos)</option>
        <option value="📌 Directo" ${_finanzasFilterClase==='📌 Directo'?'selected':''}>📌 Solo Directos</option>
        <option value="🔁 Indirecto" ${_finanzasFilterClase==='🔁 Indirecto'?'selected':''}>🔁 Solo Indirectos</option>
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

async function renderIngresosList() {
  const myTab = 'ingresos';
  const content = document.getElementById('finanzas-content');
  content.innerHTML = '<div style="text-align:center;padding:40px 0"><div class="spinner" style="margin:0 auto"></div></div>';
  try {
    if (!_ingresosCache) _ingresosCache = await fetchIngresosForMonth();
    if (activeFinanzasTab !== myTab) return;
    renderIngresosListInner();
  } catch (e) {
    if (activeFinanzasTab !== myTab) return;
    content.innerHTML = `<div class="coord-empty">${t('coord.error.load')}<br><small>${esc(e.message)}</small></div>`;
  }
}

function renderIngresosListInner() {
  const content = document.getElementById('finanzas-content');
  let items = (_ingresosCache || []).filter(finRecEnPais);
  if (_finanzasFilterTipo) items = items.filter(i => i.properties?.['Tipo']?.select?.name === _finanzasFilterTipo);
  const total = items.length;
  const visible = items.slice(0, _finanzasVisibleLimit);
  const remaining = total - visible.length;

  const totalSplit = sumByMoneda(items, 'ingreso');

  const tipos = [...new Set((_ingresosCache || []).map(i => i.properties?.['Tipo']?.select?.name).filter(Boolean))].sort();
  const filtersHTML = `
    <div class="finanzas-filters">
      <select class="finanzas-filter-select" onchange="_finanzasFilterTipo=this.value;_finanzasVisibleLimit=COORD_PAGE_SIZE;renderIngresosListInner()">
        <option value="">🛠 Todos los tipos</option>
        ${tipos.map(tp => `<option value="${esc(tp)}" ${_finanzasFilterTipo===tp?'selected':''}>${esc(tp)}</option>`).join('')}
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

// ── Nuevo ingreso / pago manual (Finanzas) — sin IA, carga 100% manual. ──
let ingresoState = null;
function ingresoOverlayClick(e) { if (e.target?.id === 'ingreso-overlay') closeIngresoSheet(); }
function closeIngresoSheet() { document.getElementById('ingreso-overlay')?.classList.remove('open'); ingresoState = null; }
function ingresoSetCliente(id) {
  if (!ingresoState) return;
  ingresoState.form.clienteId = id;
  const c = ingresoState.contactos.find(x => x.id === id);
  ingresoState.form.clienteNombre = c ? (c.properties?.['Nombre / Empresa']?.title?.[0]?.plain_text || '') : '';
  ingresoState.form.servicioId = '';
  renderIngresoSheet();
}
async function openNuevoIngresoSheet() {
  const hoy = new Date().toISOString().slice(0, 10);
  ingresoState = { saving: false, loading: true, contactos: [], servicios: [], form: { clienteId: '', clienteNombre: '', servicioId: '', monto: 0, moneda: '🇺🇸 USD', fecha: hoy, tipo: '🔧 Otro', detalle: '', facturado: false } };
  document.getElementById('ingreso-overlay')?.classList.add('open');
  renderIngresoSheet();
  try {
    const [cont, svc] = await Promise.all([
      callNotion(`databases/${CONTACTOS_DB_ID}/query`, 'POST', { sorts: [{ property: 'Nombre / Empresa', direction: 'ascending' }] }),
      callNotion(`databases/${DB_ID}/query`, 'POST', {})
    ]);
    if (!ingresoState) return; // se cerró mientras cargaba
    // Aislamiento por país: cada Finanzas ve solo clientes/servicios de su país (el proxy descarta el filtro
    // de servidor en Servicios multi-source, así que filtramos cliente-side con el mismo helper del resto de la app).
    ingresoState.contactos = (cont.results || []).filter(recEnPaisNotion);
    ingresoState.servicios = (svc.results || []).filter(recEnPaisNotion);
  } catch (e) { /* el form igual sirve sin dropdowns */ }
  if (ingresoState) { ingresoState.loading = false; renderIngresoSheet(); }
}
function renderIngresoSheet() {
  const body = document.getElementById('ingreso-sheet-body');
  if (!body || !ingresoState) return;
  const s = ingresoState, f = s.form;
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
async function saveIngreso() {
  if (!ingresoState || ingresoState.saving) return;
  const f = ingresoState.form;
  if (!f.monto || f.monto <= 0) { alert('Ingresá un monto mayor a 0.'); return; }
  if (!f.fecha) { alert('Ingresá la fecha.'); return; }
  ingresoState.saving = true; renderIngresoSheet();
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
    'País': { select: { name: countryMap[currentUser?.country] || '🇺🇾 UY' } },
    'Facturado': { checkbox: !!f.facturado },
  };
  if (f.moneda === '🇺🇾 UY$') props['Monto UY$ cobrado'] = { number: f.monto };
  else props['Monto USD'] = { number: f.monto };
  if (f.clienteId) props['Cuenta'] = { relation: [{ id: f.clienteId }] };
  if (f.clienteNombre) props['Cliente'] = { rich_text: [{ text: { content: f.clienteNombre } }] };
  if (f.servicioId) props['Servicio vinculado'] = { relation: [{ id: f.servicioId }] };
  if (f.detalle) props['Detalle'] = { rich_text: [{ text: { content: f.detalle } }] };
  try {
    await callNotion('pages', 'POST', { parent: { type: 'data_source_id', data_source_id: INGRESOS_DS_ID }, properties: props });
    _ingresosCache = null;
    closeIngresoSheet();
    if (activeFinanzasTab === 'ingresos') renderIngresosList();
  } catch (e) {
    if (ingresoState) { ingresoState.saving = false; renderIngresoSheet(); }
    alert('No se pudo guardar el ingreso: ' + e.message);
  }
}

// ── C7: Editar cobro existente (Finanzas) ───────────────────────────────────
// openCobroSheet(ingId) carga el cobro desde Notion + servicios del país y abre el sheet.
// renderCobroSheet() dibuja los campos (Servicio, Moneda, Monto, Fecha).
// saveCobroEdit() lo implementa B-5.
let cobroState = null;
function cobroOverlayClick(e) { if (e.target?.id === 'cobro-overlay') closeCobroSheet(); }
function closeCobroSheet() { document.getElementById('cobro-overlay')?.classList.remove('open'); cobroState = null; }
async function openCobroSheet(ingId) {
  if (!currentUser?.role?.includes('Administración')) return; // solo Finanzas
  document.getElementById('cobro-overlay')?.classList.add('open');
  cobroState = { saving: false, loading: true, servicios: [], ing: null, form: null };
  renderCobroSheet();
  try {
    const [page, svc] = await Promise.all([
      callNotion('pages/' + ingId, 'GET'),
      callNotion(`databases/${DB_ID}/query`, 'POST', {})
    ]);
    if (!cobroState) return; // cerrado mientras cargaba
    const p = page.properties || {};
    const { moneda } = montoOf(p, 'ingreso');
    const montoReal = (moneda === '🇺🇾 UY$') ? (p['Monto UY$ cobrado']?.number || 0) : (p['Monto USD']?.number || 0);
    cobroState.ing = page;
    cobroState.servicios = (svc.results || []).filter(recEnPaisNotion);
    cobroState.form = {
      id: ingId,
      fecha: p['Fecha']?.date?.start ? p['Fecha'].date.start.slice(0, 10) : '',
      moneda,                                           // '🇺🇸 USD' | '🇺🇾 UY$'
      monto: montoReal,                                 // monto real en la moneda etiquetada
      servicioId: (p['Servicio vinculado']?.relation || [])[0]?.id || '',
      clienteId: (p['Cuenta']?.relation || [])[0]?.id || '',
      tc: p['TC aplicado']?.number ?? null,             // re-derivado/limpiado en B-5 (P6)
    };
    cobroState.loading = false;
    renderCobroSheet();
  } catch (e) {
    if (cobroState) cobroState.loading = false;
    const b = document.getElementById('cobro-sheet-body');
    if (b) b.innerHTML = '<div class="coord-empty" style="padding:20px">No se pudo cargar el cobro: ' + esc(e.message || String(e)) + '</div>';
  }
}
function cobroSetServicio(id) { if (cobroState?.form) cobroState.form.servicioId = id; }
function renderCobroSheet() {
  const body = document.getElementById('cobro-sheet-body');
  if (!body || !cobroState) return;
  const s = cobroState, f = s.form;
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
async function saveCobroEdit() {
  if (!cobroState || cobroState.saving || !cobroState.form) return;
  const f = cobroState.form;
  if (!f.monto || f.monto <= 0) { alert('Ingresá un monto mayor a 0.'); return; }
  if (!f.fecha) { alert('Ingresá la fecha del cobro.'); return; }
  cobroState.saving = true; renderCobroSheet();
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
    if (_porCobrarCtx) await renderPorCobrar(_porCobrarCtx.containerId, _porCobrarCtx.opts);
  } catch (e) {
    if (cobroState) { cobroState.saving = false; renderCobroSheet(); }
    alert('No se pudo guardar el cobro: ' + esc(e.message || String(e)));
  }
}
// ────────────────────────────────────────────────────────────────────────────

function renderReportes() {
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
async function generateFinanceReportPDF(tipo, btn) {
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
      callNotionAll(`databases/${GASTOS_DB_ID}/query`, { filter: mkF() }),
      callNotionAll(`databases/${INGRESOS_DB_ID}/query`, { filter: mkF() }),
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
async function openServicePickerForReport() {
  const content = document.getElementById('finanzas-content');
  content.innerHTML = '<div style="text-align:center;padding:40px 0"><div class="spinner" style="margin:0 auto"></div></div>';
  // La DB Servicios (multi-data-source) bajo carga devuelve resultados vacíos o SIN la property
  // Estado por el search-fallback → reintentar hasta obtener servicios COMPLETADOS (sabemos que existen).
  let comp = [];
  for (let i = 0; i < 8 && !comp.length; i++) {
    let res = null;
    try { const d = await callNotion(`databases/${DB_ID}/query`, 'POST', { page_size: 100 }); res = d.results || []; }
    catch (e) { res = null; }
    if (res && res.length) comp = res.filter(s => ((s.properties?.['Estado']?.select?.name) || '').includes('Completado') && recEnPaisNotion(s));
    if (!comp.length) await new Promise(r => setTimeout(r, 1100));
  }
  if (activeFinanzasTab !== 'reportes') return;
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
function pickServiceReport(i) {
  const svc = (window._repServicios || [])[i];
  if (svc) openReportStep(svc);
}

// Override de cargarMasCoord para finanzas
const _originalCargarMasCoord = typeof cargarMasCoord === 'function' ? cargarMasCoord : null;
function cargarMasFinanzas() {
  _finanzasVisibleLimit += COORD_PAGE_SIZE;
  if (activeFinanzasTab === 'gastos') renderGastosListInner();
  else if (activeFinanzasTab === 'ingresos') renderIngresosListInner();
}

// ─────────────────────────────────────────────
// MODAL NUEVO GASTO (M3) — captura foto + OCR Claude + guardar Notion
// ─────────────────────────────────────────────

// Reusa constants definidas para fotos de servicios (~línea 2417).
// Si en el futuro se refactoriza, mantener nombres canónicos.
const GASTOS_DS_ID = '58fd9475-9baf-4d0e-9128-486185bf7ed8';
const INGRESOS_DS_ID = '6bb3da36-1865-4668-9d43-cc6bb9966784'; // data source de Ingresos (para crear cobros a mano)
const INGRESO_TIPOS = ['🏢 Fachada', '🪟 Vidrio', '📋 Relevamiento', '🔧 Otro'];
const SOLICITUDES_DB_ID = NOTION_DBS.solicitudes;
const SOLICITUDES_DS_ID = '0d49d612-1fea-40d7-8b94-d2b0dcae1b12';
const DOCUMENTOS_DB_ID = NOTION_DBS.documentos;
const DOCUMENTOS_DS_ID = '30ae5cdd-b259-4b3e-ac76-7cbb89354253';
const SERVICIOS_DS_ID = '2fbc8a03-5c4f-445c-8516-71dd9b2eea78'; // data source de la DB Servicios (multi-data-source)
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
// ─────────────────────────────────────────────
// MONEDA — fuente de verdad única para leer / formatear / sumar montos.
// Antes la app guardaba todo en "Monto USD" e ignoraba la moneda al mostrar
// (los pesos se veían como dólares). Estos helpers respetan la moneda real.
// Fallback a "Monto USD" para registros legacy aún no migrados.
// ─────────────────────────────────────────────
// (Bloque de dinero movido a src/calculos.js el 16/07 — importado arriba. Test: tests/calculos.test.mjs)

const GASTO_FORMA_PAGO = ['💳 Débito', '🏦 Transferencia', '💵 Efectivo'];
const GASTO_CATEGORIAS = [
  '⛽ Combustible', '👥 Sueldos', '🧴 Productos', '🔧 Herramientas',
  '🛡️ Seguros', '📣 Marketing', '🔩 Repuestos', '🏛️ Impuestos',
  '🍔 Comida', '✈️ Viajes', '🚗 Patente', '🏢 Alquiler',
  '🛡️ Insumos limpieza', '📝 Servicios profesionales', '🏠 Otros',
];

let gastoState = null;

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
function renderReciboThumb(url) {
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
// Operario: solo sus gastos (Cargado por === currentUser.name).
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

function openGastos() {
  if (esVentas()) return; // blindaje: Ventas no ve Gastos, ni por un llamado directo
  if (document.getElementById('screen-coordinator')?.classList.contains('active')) _gastosScreenPrevScreen = 'coordinator';
  else if (document.getElementById('screen-services')?.classList.contains('active')) _gastosScreenPrevScreen = 'services';
  else if (document.getElementById('screen-ceo')?.classList.contains('active')) _gastosScreenPrevScreen = 'ceo';
  else _gastosScreenPrevScreen = 'coordinator';
  // Finanzas tiene su propio panel — el botón 💸 no debería estar visible para
  // ese rol, pero por defensa: si llega acá, redirigir al panel Finanzas.
  if (currentUser?.role?.includes('Administración')) {
    showScreen('finanzas');
    setFinanzasTab('gastos');
    return;
  }
  _gastosScreenCache = null;
  _gastosScreenTab = 'todos';
  showScreen('gastos');
  setGastosRange(_gastosScreenRangeDays);
}

function closeGastos() {
  showScreen(_gastosScreenPrevScreen);
}

function setGastosRange(days) {
  _gastosScreenRangeDays = days;
  markUserActive();
  [7, 30, 90].forEach(d => {
    const el = document.getElementById('grange-' + d);
    if (el) el.classList.toggle('active', d === days);
  });
  _gastosScreenCache = null;
  renderGastosScreen();
}

function setGastosScreenTab(tab) {
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

async function renderGastosScreen(skipFetch) {
  const content = document.getElementById('gastos-screen-content');
  const tabsBar = document.getElementById('gastos-tabs-bar');
  if (!content) return;

  const role = currentUser?.role || '';
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
      const data = await callNotion(`databases/${GASTOS_DB_ID}/query`, 'POST', {
        filter: { property: 'Fecha', date: { on_or_after: dateFrom } },
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
  const myName = currentUser?.name || '';

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
async function fetchGastosDelServicio(serviceId) {
  if (!serviceId) return [];
  try {
    const data = await callNotion(`databases/${GASTOS_DB_ID}/query`, 'POST', {
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
function renderGastosChipsCoord(gastos) {
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

function openNuevoGastoSheet(opts = {}) {
  gastoState = {
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
  // Si _coordAllServices ya está poblado (porque el user vino del panel coord),
  // se reutiliza. Si no, fetch en background.
  if (!_coordAllServices || _coordAllServices.length === 0) {
    if (typeof fetchCoordItemsForMonth === 'function') {
      fetchCoordItemsForMonth().then(items => {
        _coordAllServices = items || [];
        if (gastoState && gastoState.step === 'edit-form' && gastoState.form.clase === '📌 Directo') {
          renderGastoSheet();
        }
      }).catch(() => {});
    }
  }
}

function closeGastoSheet() {
  document.getElementById('gasto-overlay').classList.remove('open');
  if (gastoState?.reciboPreview) {
    try { URL.revokeObjectURL(gastoState.reciboPreview); } catch (_) {}
  }
  gastoState = null;
}

function gastoOverlayClick(e) {
  if (e.target.id === 'gasto-overlay') closeGastoSheet();
}

function renderGastoSheet() {
  if (!gastoState) return;
  const body = document.getElementById('gasto-sheet-body');
  if (!body) return;

  if (gastoState.step === 'select-photo') {
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

  if (gastoState.step === 'analyzing') {
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
  const f = gastoState.form;
  const ocr = gastoState.ocr;
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
  if (gastoState.isPdf && gastoState.reciboUrl) {
    thumb = `<div class="gasto-thumb-wrap"><div class="gasto-pdf-preview" onclick="window.open('${esc(gastoState.reciboUrl)}','_blank')"><span class="gasto-pdf-preview-emoji">📄</span><span>PDF</span></div></div>`;
  } else if (gastoState.reciboPreview) {
    thumb = `<div class="gasto-thumb-wrap"><img src="${esc(gastoState.reciboPreview)}" onclick="window.open('${esc(gastoState.reciboPreview)}','_blank')"/></div>`;
  }

  const reanalyzeBtn = gastoState.reciboUrl
    ? `<button class="gasto-reanalyze-btn" onclick="reanalyzeReceipt()">🔄 ${t('gasto.reanalyze')}</button>`
    : '';

  // Mostrar los servicios MÁS RECIENTES arriba (los últimos primero) para que sea
  // fácil encontrar el servicio a asociar. Ordenamos una COPIA (no mutar
  // _coordAllServices, que el calendario del coord usa en orden ascendente).
  const _svcFecha = (s) => s.properties?.['Fecha programada']?.date?.start || s.created_time || '';
  const servicios = (_coordAllServices && _coordAllServices.length > 0)
    ? [..._coordAllServices].sort((a, b) => _svcFecha(b).localeCompare(_svcFecha(a))).slice(0, 30)
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
      <button class="edit-save-btn" id="gasto-save-btn" onclick="saveGasto()" ${gastoState.saving?'disabled':''}>${gastoState.saving ? t('gasto.saving') : ('💾 ' + t('gasto.save'))}</button>
    </div>
  `;
}

async function onGastoReciboSelected(input) {
  const file = input.files && input.files[0];
  input.value = ''; // reset para permitir re-elegir el mismo archivo
  if (!file || !gastoState) return;
  if (file.size > PHOTO_MAX_BYTES) { alert(t('photo.error.maxsize') || 'Archivo >10MB'); return; }
  const mime = (file.type || '').toLowerCase();
  if (!RECIBO_ALLOWED_MIMES.includes(mime)) { alert(t('gasto.recibo.error.mime') || t('photo.error.mime') || 'Tipo no permitido'); return; }
  gastoState.isPdf = mime === 'application/pdf';
  // Preview: para PDF no se renderiza inline (se muestra icono); para imagen sí.
  gastoState.reciboPreview = gastoState.isPdf ? null : URL.createObjectURL(file);
  gastoState.reciboFilename = file.name || (gastoState.isPdf ? 'recibo.pdf' : 'recibo.jpg');
  gastoState.step = 'analyzing';
  renderGastoSheet();
  try {
    const { publicUrl } = await uploadReceiptPhoto(file, gastoState.gastoId);
    gastoState.reciboUrl = publicUrl;
    // IA/OCR: por ahora SOLO Uruguay. Fuera de UY → carga manual (la foto igual quedó subida como respaldo).
    if (currentUser?.country !== 'Uruguay') {
      gastoState.ocr = { confianza: 'manual' };
      gastoState.step = 'edit-form';
      renderGastoSheet();
      return;
    }
    const ocr = await extractReceiptViaAI(publicUrl);
    gastoState.ocr = ocr;
    // Mapear OCR al form.
    gastoState.form.concepto = ocr.descripcion || gastoState.form.concepto;
    gastoState.form.monto = ocr.monto || 0;
    gastoState.form.moneda = GASTO_MONEDA_MAP[ocr.moneda] || '🇺🇸 USD';
    gastoState.form.fecha = ocr.fecha || gastoState.form.fecha;
    gastoState.form.proveedor = ocr.proveedor || '';
    gastoState.form.categoria = ocr.categoria_sugerida || '🏠 Otros';
    gastoState.step = 'edit-form';
    renderGastoSheet();
  } catch (e) {
    console.warn('[gasto] OCR error:', e.message);
    // Fallback: ir al form con datos en blanco. El usuario carga manual.
    gastoState.ocr = { confianza: 'baja', motivo_baja_confianza: 'ilegible' };
    gastoState.step = 'edit-form';
    renderGastoSheet();
    alert(t('gasto.ocr.error'));
  }
}

function gastoSkipFoto() {
  // Salto de foto → form vacío, sin OCR ni recibo subido.
  if (!gastoState) return;
  gastoState.step = 'edit-form';
  renderGastoSheet();
}

async function reanalyzeReceipt() {
  if (!gastoState || !gastoState.reciboUrl) return;
  gastoState.step = 'analyzing';
  renderGastoSheet();
  try {
    const ocr = await extractReceiptViaAI(gastoState.reciboUrl);
    gastoState.ocr = ocr;
    gastoState.form.concepto = ocr.descripcion || gastoState.form.concepto;
    gastoState.form.monto = ocr.monto || gastoState.form.monto;
    gastoState.form.moneda = GASTO_MONEDA_MAP[ocr.moneda] || gastoState.form.moneda;
    gastoState.form.fecha = ocr.fecha || gastoState.form.fecha;
    gastoState.form.proveedor = ocr.proveedor || gastoState.form.proveedor;
    gastoState.form.categoria = ocr.categoria_sugerida || gastoState.form.categoria;
    gastoState.step = 'edit-form';
    renderGastoSheet();
  } catch (e) {
    gastoState.step = 'edit-form';
    renderGastoSheet();
    alert(t('gasto.ocr.error'));
  }
}

async function saveGasto() {
  if (!gastoState || gastoState.saving) return;
  const f = gastoState.form;
  if (!f.concepto.trim()) { alert(t('gasto.error.concepto')); return; }
  if (!f.monto || f.monto <= 0) { alert(t('gasto.error.monto')); return; }
  if (!f.fecha) { alert(t('gasto.error.fecha')); return; }

  gastoState.saving = true;
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
    'País': { select: { name: countryMap[currentUser.country] || '🇺🇾 UY' } },
    'Cargado por': { select: { name: currentUser.name } },
  };
  // Guardar el monto en el campo de su moneda (no mezclar pesos en "Monto USD").
  if (f.moneda === '🇺🇾 UY$') properties['Monto UY$'] = { number: f.monto };
  else properties['Monto USD'] = { number: f.monto };
  if (f.proveedor) properties['Tienda / Proveedor'] = { rich_text: [{ text: { content: f.proveedor } }] };
  if (f.detalle) properties['Detalle'] = { rich_text: [{ text: { content: f.detalle } }] };
  if (f.servicioId && f.clase === '📌 Directo') {
    properties['Servicio'] = { relation: [{ id: f.servicioId }] };
  }
  if (gastoState.reciboUrl) {
    const reciboName = gastoState.reciboFilename || (gastoState.isPdf ? 'recibo.pdf' : 'recibo.jpg');
    properties['Foto del recibo'] = {
      files: [{ type: 'external', name: reciboName, external: { url: gastoState.reciboUrl } }],
    };
  }

  try {
    await callNotion('pages', 'POST', {
      parent: { type: 'data_source_id', data_source_id: GASTOS_DS_ID },
      properties,
    });
    // Invalidar cache para que la próxima vez Gastos se refresque.
    _gastosCache = null;
    _gastosScreenCache = null;
    // Capturar referencias antes de closeGastoSheet() las limpie.
    const servicioVinculado = f.servicioId;
    closeGastoSheet();
    // Refresh contextual según dónde estamos:
    // - Panel Finanzas tab Gastos → renderGastosList.
    // - Coord sheet edit abierto sobre el mismo servicio → refresh chips.
    // - Operario en panel detail → flash discreto, sin refresh estructural.
    if (typeof renderGastosList === 'function' && activeFinanzasTab === 'gastos') {
      renderGastosList();
    }
    if (servicioVinculado && editingService?.id === servicioVinculado) {
      const chips = document.getElementById('edit-gastos-chips');
      if (chips) {
        chips.innerHTML = `<div class="equipos-empty">${t('equipos.loading')}</div>`;
        fetchGastosDelServicio(servicioVinculado).then(gastos => {
          if (editingService?.id === servicioVinculado) renderGastosChipsCoord(gastos);
        }).catch(() => {});
      }
    }
    showSaving();
  } catch (e) {
    gastoState.saving = false;
    renderGastoSheet();
    alert((t('gasto.error.save') || 'Error al guardar:') + ' ' + e.message);
  }
}

// ─────────────────────────────────────────────
// SOLICITUD DE COMPRAS (pedidos de insumos)
// El operario (o coord) pide un insumo → se guarda en Notion.
// El coordinador lo ve en la tab 📦 Pedidos y lo marca como comprado.
// ─────────────────────────────────────────────
let pedidoState = null;
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

function pedidoPaisDelUser() {
  return PEDIDO_PAIS_MAP[currentUser?.country] || '🇺🇾 UY';
}

function pedidoPrioClass(prio) {
  if (!prio) return '';
  if (prio.includes('Urgente')) return 'prio-urgente';
  if (prio.includes('Sugerente')) return 'prio-sugerente';
  return 'prio-normal';
}

function pedidoEstadoClass(estado) {
  if (!estado) return 'estado-pendiente';
  if (estado.includes('Recibido')) return 'estado-comprado';
  if (estado.includes('Comprado')) return 'estado-comprado';
  if (estado.includes('Cancelado')) return 'estado-cancelado';
  return 'estado-pendiente';
}

function pedidoFmtFecha(iso) {
  if (!iso) return '';
  try {
    return new Date(iso + 'T00:00:00').toLocaleDateString(currentLang === 'pt-BR' ? 'pt-BR' : 'es', { day: 'numeric', month: 'short' });
  } catch (_) { return iso; }
}

function openNuevoPedidoSheet() {
  if (esVentas()) return; // blindaje: Ventas no ve Pedidos, ni por un llamado directo
  pedidoState = { producto: '', prioridad: '🟡 Normal', cantidad: '', proveedor: '', costo: '', nota: '', saving: false, mine: null, loadingMine: true };
  document.getElementById('pedido-overlay').classList.add('open');
  renderPedidoSheet();
  loadMisPedidos();
}

function closePedidoSheet() {
  document.getElementById('pedido-overlay').classList.remove('open');
  pedidoState = null;
}

function pedidoOverlayClick(e) {
  if (e.target.id === 'pedido-overlay') closePedidoSheet();
}

async function loadMisPedidos() {
  try {
    const data = await callNotion(`databases/${SOLICITUDES_DB_ID}/query`, 'POST', { page_size: 100 });
    if (!pedidoState) return;
    const mine = (data.results || []).filter(r =>
      (r.properties?.['Solicitado por']?.rich_text?.[0]?.plain_text || '') === currentUser.name
    );
    // Más recientes primero por Fecha del pedido.
    mine.sort((a, b) =>
      (b.properties?.['Fecha del pedido']?.date?.start || '').localeCompare(a.properties?.['Fecha del pedido']?.date?.start || '')
    );
    pedidoState.mine = mine.slice(0, 5);
    pedidoState.loadingMine = false;
    renderPedidoSheet();
  } catch (_) {
    if (!pedidoState) return;
    pedidoState.mine = [];
    pedidoState.loadingMine = false;
    renderPedidoSheet();
  }
}

function renderPedidoSheet() {
  if (!pedidoState) return;
  const body = document.getElementById('pedido-sheet-body');
  if (!body) return;
  const f = pedidoState;

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

async function savePedido() {
  if (!pedidoState || pedidoState.saving) return;
  const f = pedidoState;
  if (!f.producto.trim()) { alert(t('pedido.error.producto')); return; }

  f.saving = true;
  renderPedidoSheet();

  const hoy = new Date().toISOString().slice(0, 10);
  const cantNum = f.cantidad !== '' && f.cantidad != null ? Number(f.cantidad) : null;
  const properties = {
    'Producto': { title: [{ text: { content: f.producto.trim() } }] },
    'Prioridad': { select: { name: f.prioridad } },
    'Solicitado por': { rich_text: [{ text: { content: currentUser.name } }] },
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
      parent: { type: 'data_source_id', data_source_id: SOLICITUDES_DS_ID },
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
    if (activeCoordTab === 'pedidos' && typeof renderCoordPedidos === 'function') {
      renderCoordPedidos();
    }
  } catch (e) {
    f.saving = false;
    renderPedidoSheet();
    alert((t('pedido.error.save') || 'Error al guardar:') + ' ' + e.message);
  }
}

// ── Coordinador: tab 📦 Pedidos ──────────────────
async function renderCoordPedidos() {
  if (esVentas()) return; // blindaje: Ventas no ve Pedidos, ni por un llamado directo
  const content = document.getElementById('coord-content');
  if (!content) return;
  content.innerHTML = '<div style="text-align:center;padding:40px 0"><div class="spinner" style="margin:0 auto"></div></div>';
  const myTab = 'pedidos';
  try {
    const data = await callNotion(`databases/${SOLICITUDES_DB_ID}/query`, 'POST', { page_size: 100 });
    if (activeCoordTab !== myTab) return;
    let results = data.results || [];
    // Filtrar por país del coord (los de Dirección/HQ ven todos).
    const paisUser = pedidoPaisDelUser();
    const isGlobal = currentUser?.role?.includes('Dirección') ||
                     (currentUser?.role === '👔 CEO' && currentUser?.country === 'Uruguay');
    if (!isGlobal) {
      results = results.filter(r => (r.properties?.['País']?.select?.name || '') === paisUser);
    }
    _coordAllPedidos = results;
    renderCoordPedidosList();
  } catch (e) {
    if (activeCoordTab !== myTab) return;
    content.innerHTML = `<div class="coord-empty">${t('pedido.coord.error')}<br><small>${esc(e.message)}</small></div>`;
  }
}

function setCoordPedidosFilter(val) {
  _coordPedidosFilter = val;
  renderCoordPedidosList();
}

function renderCoordPedidosList() {
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

function coordPedidoCard(p) {
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

async function marcarPedidoRecibido(id) {
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

async function marcarPedidoComprado(id) {
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

async function cancelarPedido(id) {
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

// Borra las cachés de LECTURAS (/api/notion + /api/db) del Service Worker. Se llama al login y
// al logout: /api/db devuelve la lista YA filtrada por país server-side pero el SW la cachea por
// URL pelada (sin el país) → sin esta purga, en un dispositivo compartido el siguiente usuario
// (ej. CEO global) podría ver la lista recortada del usuario anterior (ej. coord de Panamá).
async function purgeReadCaches() {
  try {
    if (window.caches) {
      const ks = await caches.keys();
      await Promise.all(ks.filter(k => k.startsWith('flyclean-notion-cache')).map(k => caches.delete(k)));
    }
  } catch (_) {}
}

async function pinConfirm() {
  if (_pinTimer) { clearTimeout(_pinTimer); _pinTimer = null; }
  if (pinBuffer.length < 4) return; // necesita al menos 4 dígitos (soporta 4 o 6)
  if (!(await verifyPin(pinUser.id, pinBuffer))) {
    pinAttempts++;
    pinBuffer = '';
    updatePinDots();
    // Mensaje con contador para que el operario sepa qué le pasó.
    const msg = t('pin.error.wrong.attempt').replace('{n}', pinAttempts);
    document.getElementById('pin-error').textContent = msg;
    const dots = document.getElementById('pin-dots');
    dots.classList.add('shake');
    setTimeout(() => dots.classList.remove('shake'), 400);
    return;
  }
  await completarLogin(pinUser); // camino único post-autenticación (compartido con el login nuevo)
}

function setTab(tab) {
  activeTab = tab;
  ['ordenes', 'jornadas', 'pruebas', 'relevamientos'].forEach(t => {
    const el = document.getElementById('tab-' + t);
    if (el) el.classList.toggle('active', t === tab);
  });
  renderServices(_allServices);
}

function esDireccion(u = currentUser) { return !!(u?.role && u.role.includes('Dirección')); }
function puedeEditarNombre(u = currentUser) { return !!(u?.role && (u.role.includes('Coordinador') || u.role.includes('CEO') || u.role.includes('Dirección'))); }
// Rol 🧲 Ventas (spec 2026-07-02 B2): junta y madura prospectos, NUNCA ve cartera/servicios/finanzas
// ni crea propuestas (decisión explícita del dueño del producto — el coord es quien cotiza).
function esVentas(u = currentUser) { return !!(u?.role && u.role.includes('Ventas')); }
// Gating de pantallas financieras (defensa en profundidad — el candado server ya bloquea el dato):
// solo estos roles pueden VER el panel CEO / Finanzas; a cualquier otro se lo devuelve a su panel.
function puedeVerCEO(u = currentUser) { return !!(u?.role && (u.role.includes('CEO') || u.role.includes('Dirección'))); }
function puedeVerFinanzas(u = currentUser) { return !!(u?.role && (u.role.includes('Administración') || u.role.includes('CEO') || u.role.includes('Dirección'))); }

// Control segmentado de las sub-vistas de Servicios (reusa el estilo de coord-view-toggle).
// Cada botón vuelve a llamar a setCoordTab con el valor de tab interno correspondiente.
function renderServiciosSubtabBar(active) {
  const bar = document.getElementById('coord-subtab-bar');
  if (!bar) return;
  bar.innerHTML =
    `<button class="${active === 'servicios' ? 'active' : ''}" onclick="setCoordTab('servicios')">${t('coord.tab.servicios')}</button>` +
    `<button class="${active === 'relevamientos' ? 'active' : ''}" onclick="setCoordTab('relevamientos')">${t('coord.tab.relevamientos')}</button>` +
    `<button class="${active === 'pruebas' ? 'active' : ''}" onclick="setCoordTab('pruebas')">${t('coord.tab.pruebas')}</button>`;
}

function setCoordTab(tab, skipRender) {
  if (tab === 'limpieza' && !esDireccion()) return;
  if (tab === 'mapa' && !esVentas()) return;
  // Blindaje: Ventas solo puede tener activas Prospección, Mapa o Propuestas (ver+seguimiento,
  // decisión Diego 2026-07-05), aunque se invoque setCoordTab a mano (consola/otro código) con
  // cualquier otro valor — nunca debe ver cartera/servicios/finanzas.
  if (!['prospeccion', 'mapa', 'propuestas', 'contactos'].includes(tab) && esVentas()) return;
  const _prevCoordTabForFilters = activeCoordTab; // para decidir si resetear filtros (solo al cambiar de dominio)
  activeCoordTab = tab;
  markUserActive();
  // Servicios/Relevamientos/Pruebas comparten UNA tab de arriba ('📋 Servicios') + un control
  // segmentado adentro; los 3 siguen siendo valores de tab internos, así que el top-tab 'servicios'
  // queda activo para cualquiera de los 3.
  const SERV_SUBTABS = ['servicios', 'relevamientos', 'pruebas'];
  ['inicio', 'resumen', 'servicios', 'pruebas', 'relevamientos', 'propuestas', 'contactos', 'pedidos', 'equipos', 'comunicaciones', 'limpieza', 'prospeccion', 'mapa'].forEach(t => {
    const el = document.getElementById('ctab-' + t);
    if (el) el.classList.toggle('active', t === tab || (t === 'servicios' && SERV_SUBTABS.includes(tab)));
  });
  // Reset de filtros SOLO al cambiar de DOMINIO (auditoría 2026-07-09): antes se borraban en CADA
  // setCoordTab → perdías el filtro al togglear sub-tabs de Servicios o al volver a la misma tab (ej.
  // tras cerrar un sheet). Servicios/Relevamientos/Pruebas comparten dominio de filtros.
  const _domFilt = tt => SERV_SUBTABS.includes(tt) ? 'servicios' : tt;
  if (_domFilt(tab) !== _domFilt(_prevCoordTabForFilters)) {
    coordFilters.search = '';
    coordFilters.estado = [];
    coordFilters.pais = [];
    coordFilters.operario = [];
    coordFilters.dateFrom = '';
    coordFilters.dateTo = '';
  }
  showCoordToolbar(tab);

  // Week-strip queda escondido por default; el coordinador ahora trabaja con la lista cronológica.
  const strip = document.getElementById('coord-week-strip');
  if (strip) strip.style.display = 'none';
  const monthNav = document.getElementById('coord-month-nav');
  if (monthNav) monthNav.classList.toggle('visible', tab === 'inicio' || tab === 'resumen' || tab === 'servicios' || tab === 'relevamientos' || tab === 'pruebas');
  // El toggle Lista/Tablero solo aplica a Inicio (centro de mando). Lo ocultamos por default; renderCoordInicio lo re-muestra.
  const viewToggle = document.getElementById('coord-view-toggle');
  if (viewToggle) viewToggle.style.display = tab === 'inicio' ? 'flex' : 'none';
  // Control segmentado Servicios | Relevamientos | Pruebas: visible solo dentro del grupo Servicios.
  const subBar = document.getElementById('coord-subtab-bar');
  if (subBar) {
    if (SERV_SUBTABS.includes(tab)) { subBar.style.display = 'flex'; renderServiciosSubtabBar(tab); }
    else subBar.style.display = 'none';
  }

  // skipRender: el caller hará su propio render (evita un 2º fetch concurrente que pisaría la lista;
  // ej. submitNewService fija la tab y luego awaitea UN solo render + update optimista).
  if (skipRender) return;
  if (tab === 'inicio') renderCoordInicio();
  else if (tab === 'resumen') renderCoordResumen();
  else if (tab === 'servicios') renderCoordServicios();
  else if (tab === 'pruebas') renderCoordPruebas();
  else if (tab === 'relevamientos') renderCoordRelevamientos();
  else if (tab === 'propuestas') renderCoordPropuestas();
  else if (tab === 'contactos') renderCoordContactos();
  else if (tab === 'pedidos') renderCoordPedidos();
  else if (tab === 'equipos') renderCoordEquipos();
  else if (tab === 'prospeccion') renderCoordProspeccion();
  else if (tab === 'mapa') renderCoordMapa();
  else if (tab === 'limpieza') renderLimpieza();
  else renderComunicaciones();
}

// ── Pestaña Limpieza (solo Dirección) ──────────────────────────────────────
let limpiezaSubtab = 'clientes';
function renderLimpieza() {
  if (!esDireccion()) return;
  const cont = document.getElementById('coord-content');
  if (!cont) return;
  cont.innerHTML = `
    <div style="display:flex;gap:8px;padding:12px 4px">
      <button class="estado-btn ${limpiezaSubtab==='clientes'?'active':''}" onclick="setLimpiezaSubtab('clientes')">👥 Clientes duplicados</button>
      <button class="estado-btn ${limpiezaSubtab==='servicios'?'active':''}" onclick="setLimpiezaSubtab('servicios')">📋 Servicios a revisar</button>
      <label style="margin-left:auto;font-size:12px;color:var(--text3);display:flex;align-items:center;gap:6px"><input type="checkbox" id="limpieza-show-archived" onchange="renderLimpieza()"> Mostrar archivados</label>
    </div>
    <div id="limpieza-body"><div class="spinner" style="margin:24px auto"></div></div>`;
  if (limpiezaSubtab === 'clientes') renderLimpiezaDuplicados();
  else renderLimpiezaServicios();
}
function setLimpiezaSubtab(t) { limpiezaSubtab = t; renderLimpieza(); }
async function loadAllClientesGlobal() {
  const data = await callNotionAll(`databases/${CONTACTOS_DB_ID}/query`, {});
  return (data.results || []).filter(c => !esArchivado(c));
}
function normName(s){ return (s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/\s+/g,' ').trim(); }
function normTel(s){ return (s||'').replace(/\D/g,''); }
function clienteNombre(c){ return c.properties?.['Nombre / Empresa']?.title?.[0]?.plain_text || ''; }
function clientePais(c){ return c.properties?.['País']?.select?.name || ''; }
// Agrupa por mismo teléfono, mismo email, o nombre igual normalizado. Devuelve solo grupos de 2+.
function detectDuplicateClients(list){
  const byKey = {};
  const add = (k, c) => { if(!k) return; (byKey[k] = byKey[k] || []).push(c); };
  list.forEach(c => {
    const p = c.properties || {};
    add('tel:'+normTel(p['Teléfono / WhatsApp']?.phone_number), c);
    add('mail:'+((p['Email']?.email||'').toLowerCase().trim()), c);
    add('name:'+normName(clienteNombre(c)), c);
  });
  // dedup de grupos por set de ids
  const seen = new Set(), groups = [];
  Object.entries(byKey).forEach(([k, arr]) => {
    if (k.endsWith(':') || arr.length < 2) return;
    const ids = arr.map(c=>c.id).sort().join('|');
    if (seen.has(ids)) return; seen.add(ids);
    // Motivo del grupo (por qué se juntaron): tel | mail | name + un valor legible.
    // Se adjunta al array (chooseWinner/startMerge lo siguen leyendo como lista de clientes).
    const tipo = k.slice(0, k.indexOf(':'));
    const p0 = arr[0].properties || {};
    arr._motivo = {
      tipo,
      valor: tipo === 'tel' ? (p0['Teléfono / WhatsApp']?.phone_number || '')
           : tipo === 'mail' ? (p0['Email']?.email || '')
           : clienteNombre(arr[0]),
    };
    groups.push(arr);
  });
  return groups;
}
async function renderLimpiezaDuplicados(){
  const body = document.getElementById('limpieza-body');
  const showArch = document.getElementById('limpieza-show-archived')?.checked;
  body.innerHTML = '<div class="spinner" style="margin:24px auto"></div>';
  try {
    const list = await loadAllClientesGlobal();
    const groups = detectDuplicateClients(list);
    let archivedHtml = '';
    if (showArch) {
      const allData = await callNotionAll(`databases/${CONTACTOS_DB_ID}/query`, {});
      const archived = (allData.results || []).filter(c => esArchivado(c));
      if (archived.length) {
        archivedHtml = `<div style="margin-top:16px">
          <div style="font-weight:700;margin-bottom:8px;color:var(--text3)">🗄️ Archivados (${archived.length})</div>
          ${archived.map(c=>`<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-top:1px solid var(--border2)">
            <span>${esc(clienteNombre(c)||'(sin nombre)')} <span style="color:var(--text3);font-size:11px">${esc(clientePais(c))}</span></span>
            <button class="estado-btn" onclick="unarchive('${esc(c.id)}','clientes')">Desarchivar</button>
          </div>`).join('')}
        </div>`;
      }
    }
    if (!groups.length){
      body.innerHTML = '<div style="padding:24px;color:var(--text3);text-align:center">✅ Sin clientes duplicados ('+list.length+' clientes revisados).</div>' + archivedHtml;
      return;
    }
    body.innerHTML = groups.map((g,gi)=>{
      const m = g._motivo || {};
      // Por qué la app los juntó — evita confundir "3 clientes con el mismo portero" con un duplicado real.
      const motivo = m.tipo === 'tel'  ? '📞 Comparten teléfono' + (m.valor ? ': ' + esc(m.valor) : '')
                   : m.tipo === 'mail' ? '✉️ Comparten email' + (m.valor ? ': ' + esc(m.valor) : '')
                   : '📝 Mismo nombre';
      return `
      <div style="border:1px solid var(--border2);border-radius:12px;padding:12px;margin:10px 4px">
        <div style="font-weight:700;margin-bottom:2px">Posible duplicado (${g.length})</div>
        <div style="font-size:12px;color:var(--text3);margin-bottom:8px">${motivo}</div>
        ${g.map(c=>`<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0">
          <span>${esc(clienteNombre(c)||'(sin nombre)')} <span style="color:var(--text3);font-size:11px">${esc(clientePais(c))}</span></span>
          <button class="estado-btn" onclick="chooseWinner('${gi}','${esc(c.id)}')">Queda este</button>
        </div>`).join('')}
      </div>`;
    }).join('') + archivedHtml;
    window._limpiezaGroups = groups; // para chooseWinner/startMerge
  } catch(e){ body.innerHTML = '<div style="padding:24px;color:#c45">Error: '+esc(e.message)+'</div>'; }
}
function chooseWinner(gi, winnerId){
  const g = (window._limpiezaGroups||[])[gi]; if(!g) return;
  const losers = g.filter(c=>c.id!==winnerId);
  startMerge(winnerId, losers.map(c=>c.id)); // Task 6
}
function closeMergePlan(){ document.getElementById('merge-plan-overlay').classList.remove('open'); }
async function buildMergePlan(winnerId, loserIds){
  const norm = id => (id||'').replace(/-/g,'');
  const loserSet = new Set(loserIds.map(norm));
  const rel0 = r => norm(r?.relation?.[0]?.id);
  const relHas = (arr, set) => (arr||[]).some(x => set.has(norm(x.id)));
  // Servicios: el proxy descarta el filtro server-side → traer TODO y filtrar client-side por Contacto.
  const [svcAll, propAll, ingAll] = await Promise.all([
    callNotionAll(`databases/${DB_ID}/query`, {}),
    callNotionAll(`databases/${PROPUESTAS_DB_ID}/query`, {}),
    callNotionAll(`databases/${INGRESOS_DB_ID}/query`, {}),
  ]);
  const servicios = (svcAll.results||[]).filter(s => relHas(s.properties?.['Contacto']?.relation, loserSet));
  const svcIds = new Set(servicios.map(s=>norm(s.id)));
  const propuestas = (propAll.results||[]).filter(p => relHas(p.properties?.['Contacto']?.relation, loserSet));
  const ingresos = (ingAll.results||[]).filter(i =>
    relHas(i.properties?.['Cuenta']?.relation, loserSet) ||
    svcIds.has(rel0(i.properties?.['Servicio vinculado']))
  );
  return { servicios, propuestas, ingresos };
}
async function startMerge(winnerId, loserIds){
  if (!esDireccion()) return;
  const ov = document.getElementById('merge-plan-overlay');
  const body = document.getElementById('merge-plan-body');
  ov.classList.add('open');
  body.innerHTML = '<div class="spinner" style="margin:24px auto"></div>';
  const all = window._limpiezaGroups ? window._limpiezaGroups.flat() : [];
  const winner = all.find(c=>c.id===winnerId);
  const losers = loserIds.map(id => all.find(c=>c.id===id)).filter(Boolean);
  const plan = await buildMergePlan(winnerId, loserIds);
  const paisW = clientePais(winner);
  const cruzaPais = losers.some(l => (clientePais(l) || '') !== (paisW || ''));
  window._mergeCtx = { winnerId, loserIds, plan };
  document.getElementById('merge-plan-sub').textContent = 'Revisá antes de confirmar.';
  body.innerHTML = `
    <p>Queda: <b>${esc(clienteNombre(winner))}</b> ${esc(paisW)}</p>
    <p>Se archivan: ${losers.map(l=>'<b>'+esc(clienteNombre(l))+'</b> '+esc(clientePais(l))).join(', ')}</p>
    <p>Se reapuntan al que queda:</p>
    <ul>
      <li>${plan.servicios.length} servicios</li>
      <li>${plan.propuestas.length} propuestas</li>
      <li>${plan.ingresos.length} ingresos/cobros</li>
    </ul>
    ${cruzaPais ? '<p style="color:#c45;font-weight:700">⚠️ Países distintos — no se puede fusionar entre países.</p>' : ''}
    <button class="estado-btn" onclick="closeMergePlan()">Cancelar</button>
    ${cruzaPais ? '' : '<button class="estado-btn active" onclick="executeMerge()">Confirmar fusión</button>'}`;
}
async function executeMerge(){
  if (!esDireccion()) return;
  const ctx = window._mergeCtx; if(!ctx) return;
  const norm = id => (id||'').replace(/-/g,'');
  const loserSet = new Set(ctx.loserIds.map(norm));
  const repoint = arr => { // reemplaza ids perdedores por el ganador, sin duplicar, conservando otros
    const ids = (arr||[]).map(x=>x.id).filter(id => !loserSet.has(norm(id)));
    if (!ids.map(norm).includes(norm(ctx.winnerId))) ids.push(ctx.winnerId);
    return ids.map(id => ({ id }));
  };
  const relHasLoser = arr => (arr||[]).some(x => loserSet.has(norm(x.id)));
  const body = document.getElementById('merge-plan-body');
  const steps = [
    ...ctx.plan.servicios.map(s => ({ id:s.id, res:'servicios', prop:'Contacto', cur:s.properties?.['Contacto']?.relation })),
    ...ctx.plan.propuestas.map(p => ({ id:p.id, res:'propuestas', prop:'Contacto', cur:p.properties?.['Contacto']?.relation })),
    ...ctx.plan.ingresos.filter(i => relHasLoser(i.properties?.['Cuenta']?.relation)).map(i => ({ id:i.id, res:'ingresos', prop:'Cuenta', cur:i.properties?.['Cuenta']?.relation })),
  ];
  try {
    for (let k=0;k<steps.length;k++){
      const st = steps[k];
      body.innerHTML = `<div class="spinner" style="margin:8px auto"></div><p>Reapuntando ${k+1}/${steps.length}…</p>`;
      await updateServiceProps(st.id, { [st.prop]: { relation: repoint(st.cur) } });
      syncAfterWrite(st.id, st.res);
    }
    // Archivar perdedores al final
    for (const lid of ctx.loserIds){ await updateServiceProps(lid, { '🗄️ Archivado': { checkbox: true } }); syncAfterWrite(lid, 'clientes'); }
    body.innerHTML = '<p>✅ Fusión completa.</p><button class="estado-btn" onclick="closeMergePlan();renderLimpieza()">Cerrar</button>';
  } catch(e){
    body.innerHTML = '<p style="color:#c45">❌ Se detuvo: '+esc(e.message)+'. Lo ya hecho quedó; podés reintentar (es idempotente).</p><button class="estado-btn" onclick="closeMergePlan()">Cerrar</button>';
  }
}
// "Servicios a revisar" — grupos que Dirección marcó "✓ Están bien" (legítimos): se ocultan SIN tocar los
// servicios (no se renombran ni archivan). Se guarda EN LA NUBE (api/limpieza-svc-ok, KV) → persiste y se
// ve igual desde cualquier dispositivo. _limpSvcOk = Set de cids ocultos (se recarga del server al abrir).
let _limpSvcOk = new Set();
async function limpSvcOkLoad(){
  try {
    const tok = localStorage.getItem('fc_token') || '';
    const r = await fetch('/api/limpieza-svc-ok', { headers: { 'Authorization': 'Bearer ' + tok } });
    if (r.ok) { const d = await r.json(); _limpSvcOk = new Set(d.ids || []); }
  } catch(_) { /* sin conexión → usa lo último en memoria */ }
}
async function limpSvcSetOk(cid, ok){
  const tok = localStorage.getItem('fc_token') || '';
  // Update optimista (para que responda al instante) + confirmación del server.
  if (ok) _limpSvcOk.add(cid); else _limpSvcOk.delete(cid);
  renderLimpieza();
  try {
    const r = await fetch('/api/limpieza-svc-ok', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + tok }, body: JSON.stringify({ cid, ok }) });
    if (r.ok) { const d = await r.json(); _limpSvcOk = new Set(d.ids || []); }
    else { alert('No se pudo guardar en la nube. Reintentá.'); await limpSvcOkLoad(); renderLimpieza(); }
  } catch(_) { alert('Sin conexión — no se guardó. Reintentá.'); }
}
async function renderLimpiezaServicios(){
  const body = document.getElementById('limpieza-body');
  const showArch = document.getElementById('limpieza-show-archived')?.checked;
  body.innerHTML = '<div class="spinner" style="margin:24px auto"></div>';
  const [data] = await Promise.all([ callNotionAll(`databases/${DB_ID}/query`, {}), limpSvcOkLoad() ]);
  let svc = (data.results||[]);
  if (!showArch) svc = svc.filter(s => !esArchivado(s));
  // Agrupar por cliente (Contacto[0]); marcar nombres inconsistentes dentro del grupo.
  const byCli = {};
  svc.forEach(s => { const cid = s.properties?.['Contacto']?.relation?.[0]?.id || 'sin-cliente'; (byCli[cid] = byCli[cid] || []).push(s); });
  const okSet = _limpSvcOk;
  const todos = Object.entries(byCli).filter(([,arr]) => arr.length>1 || arr.some(s => /\s{2,}|\s$/.test(s.properties?.['Nombre del servicio']?.title?.[0]?.plain_text||'')));
  const grupos = todos.filter(([cid]) => !okSet.has(cid));
  const ocultos = todos.filter(([cid]) => okSet.has(cid));
  const ocultosHtml = ocultos.length ? `<div style="margin:16px 4px 0;border-top:1px solid var(--border2);padding-top:12px">
    <div style="font-size:12px;color:var(--text3);margin-bottom:8px">✓ ${ocultos.length} grupo(s) marcados «Están bien» (ocultos):</div>
    ${ocultos.map(([cid,arr]) => `<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding:5px 0">
      <span style="font-size:12px;color:var(--text3)">${arr.length} servicios</span>
      <button class="estado-btn" onclick="limpSvcSetOk('${esc(cid)}',false)">↩ Volver a revisar</button>
    </div>`).join('')}
  </div>` : '';
  body.innerHTML = (grupos.map(([cid,arr]) => {
    const nombres = [...new Set(arr.map(s => (s.properties?.['Nombre del servicio']?.title?.[0]?.plain_text||'').trim()))];
    const inconsistente = nombres.length > 1;
    return `<div style="border:1px solid var(--border2);border-radius:12px;padding:12px;margin:10px 4px">
      <div style="font-weight:700">${arr.length} servicios ${inconsistente?'· ⚠️ nombres distintos':''}</div>
      ${arr.map(s=>{
        const archivado = esArchivado(s);
        return `<div style="display:flex;justify-content:space-between;gap:8px;padding:4px 0${archivado?';opacity:0.6':''}">
          <input class="edit-date-input" style="flex:1" value="${esc((s.properties?.['Nombre del servicio']?.title?.[0]?.plain_text||''))}" onchange="renameOneService('${esc(s.id)}',this.value)"${archivado?' disabled':''}/>
          ${archivado
            ? `<button class="estado-btn" onclick="unarchive('${esc(s.id)}','servicios')">Desarchivar</button>`
            : `<button class="estado-btn" onclick="archiveService('${esc(s.id)}')">🗄️</button>`
          }
        </div>`;
      }).join('')}
      <div style="display:flex;gap:8px;margin-top:8px">
        <input id="bulk-${esc(cid)}" class="edit-date-input" placeholder="Renombrar TODOS a…" style="flex:1"/>
        <button class="estado-btn active" onclick="bulkRenameServices('${esc(cid)}')">Aplicar</button>
      </div>
      <button class="estado-btn" style="width:100%;margin-top:8px;color:#00C98D" onclick="limpSvcSetOk('${esc(cid)}',true)">✓ Están bien — sacar de la lista (no cambia nada)</button>
    </div>`;
  }).join('') || '<div style="padding:24px;color:var(--text3);text-align:center">✅ Nada para revisar.</div>') + ocultosHtml;
}
async function renameOneService(id, nombre){
  const n = String(nombre||'').trim(); if(!n) return;
  await updateServiceProps(id, { 'Nombre del servicio': { title: [{ text: { content: n } }] } });
  syncAfterWrite(id, 'servicios');
}
async function bulkRenameServices(cid){
  const n = String(document.getElementById('bulk-'+cid)?.value||'').trim(); if(!n){ alert('Escribí el nombre.'); return; }
  const data = await callNotionAll(`databases/${DB_ID}/query`, {});
  const arr = (data.results||[]).filter(s => (s.properties?.['Contacto']?.relation?.[0]?.id||'')===cid && !esArchivado(s));
  if (!confirm(`Renombrar ${arr.length} servicios a "${n}"?`)) return;
  for (const s of arr){ await updateServiceProps(s.id, { 'Nombre del servicio': { title: [{ text: { content: n } }] } }); syncAfterWrite(s.id, 'servicios'); }
  renderLimpieza();
}
async function archiveService(id){
  if (!confirm('Archivar este servicio? (reversible)')) return;
  await updateServiceProps(id, { '🗄️ Archivado': { checkbox: true } });
  syncAfterWrite(id, 'servicios');
  renderLimpieza();
}
async function unarchive(id, resource){
  if (!confirm('Desarchivar este registro?')) return;
  await updateServiceProps(id, { '🗄️ Archivado': { checkbox: false } });
  syncAfterWrite(id, resource);
  renderLimpieza();
}

// Sesión inválida o expirada (el proxy respondió 401): limpiar token y volver al login.
let _reloggingIn = false;
function forceRelogin() {
  try { localStorage.removeItem('fc_token'); } catch (_) {}
  if (_reloggingIn) return;
  _reloggingIn = true;
  logout();
  setTimeout(() => { _reloggingIn = false; }, 1500);
}

function logout() {
  purgeReadCaches(); // fire-and-forget: al cerrar sesión, limpiar cachés de lectura (país/usuario)
  try { localStorage.removeItem('fc_token'); } catch (_) {}
  // M8 — Reset de variables globales en memoria para que el siguiente login
  // no vea data residual. localStorage de servicios (fc_service_*) se mantiene
  // porque pertenece al operario, no a la sesión.
  localStorage.removeItem('fc_user');
  currentUser = null;
  _coordAllServices = [];
  _coordAllProps = [];
  _coordAllContacts = [];
  _coordAllProspectos = []; // spec 2026-07-02 B2 — mismo criterio M8: no dejar data residual entre sesiones
  _allServices = [];
  editingService = null;
  editingProp = null;
  editState = {};
  propEditState = {};
  serviceState = {};
  currentService = null;
  currentStep = 0;
  activeTab = 'ordenes';
  activeCoordTab = 'inicio';
  _coordVisibleLimit = COORD_PAGE_SIZE;
  pinAttempts = 0;
  resetAyudaBot(); // 🤖 el chat del bot es de ESA sesión: no debe sobrevivir al cambio de usuario
  // M10 — Limpiar interval de processQueue. Se vuelve a crear al próximo login
  // si hace falta, pero por simplicidad lo dejamos vivo (es cheap).
  // No clearInterval acá para que la queue siga procesándose offline-online
  // incluso sin user logueado (puede haber writes pendientes del user anterior
  // que esperan reconectarse).
  renderLogin();
  showScreen('login');
}

// ─────────────────────────────────────────────
// SERVICES
// ─────────────────────────────────────────────
async function loadServices() {
  if (!currentUser) { showScreen('login'); return; }
  markUserActive();
  showScreen('services');
  document.getElementById('header-user-name').textContent = (currentUser.emoji + ' ' + currentUser.name.split(' ')[0]);
  document.getElementById('services-sub').textContent = t('services.sub.loading2');
  loadAlerts(currentUser.role, 'alerts-banner-services');
  loadPilotoAgenda(); // agenda del piloto/participante — async aparte, no bloquea la lista principal
  document.getElementById('services-list').innerHTML = '<div style="text-align:center;padding:40px 0"><div class="spinner" style="margin:0 auto"></div></div>';
  document.getElementById('error-banner').classList.remove('visible');

  // Auto-reintento: Notion suele estar lento (no caído). Reintentamos 1 vez en silencio antes de
  // mostrar el error, así se va el "primero nada → error → datos".
  let services = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      services = await getMyServices(currentUser.id);
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
async function loadPilotoAgenda() {
  const cont = document.getElementById('piloto-agenda');
  if (!cont) return;
  try {
    const tok = localStorage.getItem('fc_token') || '';
    const resp = await fetch('/api/notion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + tok },
      body: JSON.stringify({ endpoint: `databases/${DB_ID}/query`, method: 'POST', body: { page_size: 100 } }),
    });
    if (!resp.ok) { cont.style.display = 'none'; return; } // fail silently — bloque secundario
    const data = await resp.json();
    const nombre = currentUser?.name || '';
    const paisNotion = COUNTRY_NOTION_MAP[currentUser?.country] || null;
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
function togglePilotoAgenda() { _pilotoAgendaOpen = !_pilotoAgendaOpen; const b = document.getElementById('piloto-agenda-body'); const c = document.getElementById('piloto-agenda-chev'); if (b) b.style.display = _pilotoAgendaOpen ? 'block' : 'none'; if (c) c.textContent = _pilotoAgendaOpen ? '▾' : '▸'; }
function renderPilotoAgenda(items) {
  const cont = document.getElementById('piloto-agenda');
  if (!cont) return;
  if (!items || !items.length) { cont.style.display = 'none'; cont.innerHTML = ''; return; }
  const nombre = currentUser?.name || '';
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

function getEstadoClass(estado) {
  if (estado.includes('Pendiente')) return 'estado-pendiente';
  if (estado.includes('Asignado')) return 'estado-asignado';
  if (estado.includes('curso')) return 'estado-en-curso';
  if (estado.includes('Completado')) return 'estado-completado';
  return 'estado-pendiente';
}

// Agrupa una lista de servicios (YA ordenada por el caller) por día exacto de 'Fecha programada',
// con encabezado de fecha por grupo (📍 Hoy · mar 8 jul / ⏭ Mañana · mié 9 jul / jue 10 jul / ⚠️ Sin
// fecha al final). Reusado por el operario (renderServices) y el coordinador (renderCoordList). Preserva
// el orden de entrada (asc o desc); "sin fecha" siempre al final. Devuelve [{ key, label, isHoy, items }].
function groupServicesByDay(list) {
  const dateLocale = currentLang === 'pt-BR' ? 'pt-BR' : 'es-UY';
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todayISO = today.toISOString().split('T')[0];
  const tomorrowISO = new Date(today.getTime() + 86400000).toISOString().split('T')[0];
  const fmt = (iso) => {
    const d = new Date(iso + 'T00:00:00').toLocaleDateString(dateLocale, { weekday: 'short', day: 'numeric', month: 'short' });
    return d.charAt(0).toUpperCase() + d.slice(1);
  };
  const byKey = {};
  const groups = [];
  list.forEach(s => {
    const f = s.properties?.['Fecha programada']?.date?.start || '';
    const key = f || '__sinfecha__';
    if (!byKey[key]) {
      let label, isHoy = false;
      if (!f) label = '⚠️ ' + t('day.sinfecha');
      else if (f === todayISO) { label = '📍 ' + t('day.hoy') + ' · ' + fmt(f); isHoy = true; }
      else if (f === tomorrowISO) label = '⏭ ' + t('day.manana') + ' · ' + fmt(f);
      else label = fmt(f);
      byKey[key] = { key, label, isHoy, items: [] };
      groups.push(byKey[key]);
    }
    byKey[key].items.push(s);
  });
  const conFecha = groups.filter(g => g.key !== '__sinfecha__');
  const sinFecha = groups.filter(g => g.key === '__sinfecha__');
  return [...conFecha, ...sinFecha];
}

function renderServices(services) {
  _allServices = services;
  services = _allServices.filter(s => {
    const tipoReg = s.properties?.['Tipo de registro']?.select?.name || '';
    const jornadaN = s.properties?.['Jornada N°']?.number;
    const isJornada = (jornadaN != null) || tipoReg.includes('Jornada');
    const isRelev = tipoReg.includes('Relevamiento');
    const isPrueba = tipoReg.includes('Prueba');
    if (activeTab === 'jornadas') return isJornada;
    if (activeTab === 'relevamientos') return isRelev;
    if (activeTab === 'pruebas') return isPrueba;
    // 'ordenes' (default): ni jornada ni relevamiento → solo órdenes de trabajo
    return !isJornada && !isRelev && !isPrueba;
  });
  const sub = document.getElementById('services-sub');
  const list = document.getElementById('services-list');

  if (services.length === 0) {
    sub.textContent = t('services.empty.sub');
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
async function openService(idx) {
  currentService = window._services[idx];
  currentStep = 0;
  resetServiceState();

  // Elegir el array de STEPS según el tipo de registro
  const tipoReg = currentService.properties?.['Tipo de registro']?.select?.name || '';
  STEPS = tipoReg.includes('Relevamiento') ? STEPS_RELEVAMIENTO : STEPS_SERVICIO;

  // Rehidratar progreso previo: Notion (hora, fotos, clima, resultado) + localStorage (checklist, notas).
  // Sin esto, reabrir un servicio iniciado pierde Hora Inicio y muestra "Iniciar" otra vez.
  hydrateServiceStateFromNotion(currentService);
  const hadLocal = hydrateServiceStateFromLocal(currentService.id);

  // Sectores: el coordinador los guardó en 'Estado sectores' como [{id,nombre,estado}].
  // El operario hereda esa lista; el estado de cada sector lo va actualizando. Si localStorage
  // tiene un estado más avanzado (reapertura), gana lo local (igual criterio que el checklist).
  try {
    const baseSec = JSON.parse(currentService.properties?.['Estado sectores']?.rich_text?.[0]?.plain_text || '[]');
    let localSec = [];
    try {
      const rawLs = localStorage.getItem(storageKeyForService(currentService.id));
      if (rawLs) localSec = JSON.parse(rawLs).state?.sectores || [];
    } catch (_) {}
    serviceState.sectores = (Array.isArray(baseSec) ? baseSec : []).map(s => {
      const ls = localSec.find(x => x.id === s.id);
      return { id: s.id, nombre: s.nombre, estado: (ls && ls.estado) || s.estado || 'pendiente' };
    });
  } catch (_) { serviceState.sectores = []; }
  // Snapshot de los sectores al abrir (para el parte por día: qué se completó HOY vs jornadas anteriores).
  serviceState.sectoresAlAbrir = (serviceState.sectores || []).map(s => ({ id: s.id, estado: s.estado }));
  // Parte por día acumulado (jornadas anteriores).
  try {
    serviceState.registroJornadas = JSON.parse(currentService.properties?.['Registro jornadas']?.rich_text?.[0]?.plain_text || '[]');
    if (!Array.isArray(serviceState.registroJornadas)) serviceState.registroJornadas = [];
  } catch (_) { serviceState.registroJornadas = []; }

  // Si tiene sectores (y no es relevamiento), usar el flujo recortado por sectores.
  if (!tipoReg.includes('Relevamiento') && servicioTieneSectores()) STEPS = STEPS_SECTORES;

  // Pre-cargar m² aproximados si ya existe en el servicio (útil para relevamientos)
  const m2Existing = currentService.properties?.['m² aproximados']?.number;
  if (m2Existing != null && !serviceState.relevamiento.m2) {
    serviceState.relevamiento.m2 = String(m2Existing);
  }

  // Saltar al paso correcto según el progreso ya hecho
  if (serviceState.horaInicio) {
    const computed = computeStepFromState();
    if (computed > 0) currentStep = Math.min(computed, STEPS.length - 1);
  }

  // A2 — Reintento de fotos huérfanas: si tenemos fotos en serviceState (localStorage o R2)
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
    const props = currentService.properties || {};
    const contactoId = props['Contacto']?.relation?.[0]?.id || props['Contactos']?.relation?.[0]?.id || '';
    const propId = props['Propuesta']?.relation?.[0]?.id || '';
    const svcId = currentService.id;
    await Promise.all([
      contactoId
        ? callNotion('pages/' + contactoId, 'GET')
            .then(c => { if (currentService?.id === svcId) { serviceState.clienteMapa = c?.properties?.['Mapa']?.url || ''; serviceState.clienteNombre = clienteNombre(c) || ''; } })
            .catch(() => {})
        : Promise.resolve(),
      propId
        ? callNotion('pages/' + propId, 'GET')
            .then(p => { if (currentService?.id === svcId) serviceState.propMapa = p?.properties?.['Mapa']?.url || ''; })
            .catch(() => {})
        : Promise.resolve()
    ]);
  } catch (_) {}

  const nombre = currentService.properties['Nombre del servicio']?.title?.[0]?.plain_text || t('detail.title.default');
  document.getElementById('detail-title').textContent = nombre;

  renderStepNav();
  renderStep();
  showScreen('detail');
}

function flushPendingPhotosIfNeeded() {
  if (!currentService?.properties) return;
  const props = currentService.properties;
  const countLocal = (serviceState.photos?.pre?.length || 0)
                   + (serviceState.photos?.post?.length || 0)
                   + (serviceState.photos?.relevamiento?.length || 0);
  const countNotion = (props['📸 Fotos pre-servicio']?.files?.length || 0)
                    + (props['📸 Fotos post-servicio']?.files?.length || 0)
                    + (props['📸 Fotos relevamiento']?.files?.length || 0);
  if (countLocal > countNotion) {
    console.info(`[fc] flush fotos huérfanas: local=${countLocal} notion=${countNotion}`);
    persistServiceState({ immediateNotion: true });
  }
}

function goBack() {
  showScreen('services');
}

function renderStepNav() {
  const nav = document.getElementById('step-nav');
  nav.innerHTML = STEPS.map((s, i) => {
    let cls = '';
    if (i < currentStep) cls = 'done';
    else if (i === currentStep) cls = 'active';
    return `<div class="step-pill ${cls}" onclick="goToStep(${i})">${i < currentStep ? '✓' : i + 1}</div>`;
  }).join('');

  const fill = Math.round(((currentStep) / STEPS.length) * 100);
  document.getElementById('progress-fill').style.width = fill + '%';
}

function goToStep(idx) {
  if (idx <= currentStep) { currentStep = idx; renderStepNav(); renderStep(); }
}

function nextStep() {
  if (currentStep < STEPS.length - 1) {
    currentStep++;
    renderStepNav();
    renderStep();
    document.querySelector('.steps-container').scrollTop = 0;
  }
}

// Continuar desde el checklist PRE de vuelo (decisión Diego 2026-07-09 — "advertir pero dejar seguir"):
// el texto dice que los 16 ítems son obligatorios, pero antes se podía avanzar sin marcarlos y sin aviso.
// Ahora, si faltan ítems, se pide confirmación explícita; el operario decide (no lo bloqueamos en el campo).
function checklistPreContinue() {
  const total = CHECKLIST_PRE.length;
  const done = Object.values(serviceState.checklistPre || {}).filter(Boolean).length;
  if (done < total && !confirm(t('checklist.pre.incomplete.confirm').replace('{n}', total - done))) return;
  nextStep();
}

// Renderiza el banner de "Cancelar inicio" cuando el operario inició el servicio
// pero todavía no apretó "Inicio efectivo" (la ventana donde des-iniciar es seguro).
function renderCancelarBanner() {
  if (!serviceState.horaInicio || serviceState.horaInicioEfectivo) return '';
  return `<div class="cancelar-inicio-banner">
    <span>⏱️ ${t('step.iniciado.a.las')} <strong>${serviceState.horaInicio}</strong></span>
    <button onclick="cancelarInicio()">↩ ${t('btn.cancelar.inicio')}</button>
  </div>`;
}

function renderStep() {
  const step = STEPS[currentStep];
  const props = currentService.properties;
  const nombre = props['Nombre del servicio']?.title?.[0]?.plain_text || '';
  const fecha = props['Fecha programada']?.date?.start || '';
  const horaInicio = props['Hora Inicio']?.date?.start || '';
  const horaFmt = (horaInicio && horaInicio.includes('T')) ? new Date(horaInicio).toTimeString().slice(0, 5) : '';
  const lugar = props['Lugar']?.rich_text?.[0]?.plain_text || '';
  const mapa = resolveMapsUrl({ svcMapa: props['Mapa']?.url || '', propMapa: serviceState.propMapa || '', clienteMapa: serviceState.clienteMapa || '' });
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
        ${serviceState.clienteNombre ? `<div class="info-row"><span class="info-label">${t('step.info.cliente')}</span><span class="info-val">🏢 ${esc(serviceState.clienteNombre)}</span></div>` : ''}
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
      ${serviceState.horaInicio ? `<div class="ts-recorded"><div class="ts-label">${t('step.inicio.recorded')}</div><div class="ts-value">${serviceState.horaInicio}</div></div>` : ''}
      <div id="op-equipos-section" style="margin-top:14px"></div>
    `;
    // Equipos asignados (read-only para el operario, solo si no es relevamiento)
    const tipoRegOp = currentService?.properties?.['Tipo de registro']?.select?.name || '';
    if (!tipoRegOp.includes('Relevamiento')) {
      Promise.all([fetchEquiposDelServicio(currentService.id), fetchActivosDisponibles()])
        .then(([equipos]) => {
          const sec = document.getElementById('op-equipos-section');
          if (!sec || !equipos.length) return;
          const byId = new Map((_activosCache?.items || []).map(a => [a.id, a]));
          sec.innerHTML = `<div class="edit-section-label" style="font-size:11px;color:var(--text3);margin-bottom:6px">${t('op.equipos.label')}</div>` +
            equipos.map(e => {
              const a = byId.get(e.activoId);
              const name = a ? a.name : e.activoName;
              const meta = a ? [a.tipo, a.serie ? `S/N ${a.serie}` : '', a.marca].filter(Boolean).join(' · ') : '';
              return `<div class="equipo-chip"><div class="equipo-chip-info"><div class="equipo-chip-name">${esc(name)}</div>${meta ? `<div class="equipo-chip-meta">${esc(meta)}</div>` : ''}</div></div>`;
            }).join('');
        });
    }

    if (!serviceState.horaInicio) {
      bar.innerHTML = `<button class="btn-main btn-green" onclick="iniciarServicio()">${t('step.inicio.btn')}</button>`;
    } else {
      bar.innerHTML = `<button class="btn-main btn-green" onclick="nextStep()">${t('step.inicio.continue')}</button>`;
    }
  }

  // ── STEP 1: CHECKLIST PRE ──
  else if (step.id === 'checklist_pre') {
    const done = Object.values(serviceState.checklistPre).filter(Boolean).length;
    content.innerHTML = `
      ${renderCancelarBanner()}
      <div class="step-title">${t('step.pre.title')}</div>
      <div class="step-sub">${t('step.pre.sub')}</div>
      <div class="hint hint-green">${t('step.pre.hint')}</div>
      <div class="check-count">${done} / ${CHECKLIST_PRE.length} ${t('step.checklist.completed')}</div>
      ${CHECKLIST_PRE.map((item, i) => `
        <div class="check-item ${serviceState.checklistPre[i] ? 'checked' : ''}" onclick="toggleCheck('pre', ${i})">
          <div class="checkbox">${serviceState.checklistPre[i] ? '✓' : ''}</div>
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
    const metodoArr = toArr(serviceState.metodoTrabajo);
    const herrArr = toArr(serviceState.herramientaManual);
    const esManual = metodoArr.includes('💪 Manual');
    content.innerHTML = `
      ${renderCancelarBanner()}
      <div class="step-title">${t('step.inicioef.title')}</div>
      <div class="step-sub">${t('step.inicioef.sub')}</div>

      <div class="field-group">
        <div class="form-label">${t('step.clima.label')}</div>
        <div class="hint hint-blue" style="margin-bottom:10px">${t('step.clima.hint')}</div>
        <div class="clima-group">
          ${climaOpts.map(o => `<div class="clima-opt ${o.cls} ${(Array.isArray(serviceState.clima) ? serviceState.clima : []).includes(o.val) ? 'selected' : ''}" onclick="selectClima('${o.val}')">${o.label}</div>`).join('')}
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
      ${serviceState.horaInicioEfectivo
        ? `<div class="ts-recorded"><div class="ts-label">${t('step.inicioef.recorded')}</div><div class="ts-value">${serviceState.horaInicioEfectivo}</div></div>`
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
      const arr = serviceState.sectores || [];
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
        ${serviceState.horaInicioEfectivo ? `<div class="ts-recorded"><div class="ts-label">${t('step.ejec.tsLabel')}</div><div class="ts-value">${serviceState.horaInicioEfectivo}</div></div>` : ''}
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
      ${serviceState.horaInicioEfectivo ? `<div class="ts-recorded"><div class="ts-label">${t('step.ejec.tsLabel')}</div><div class="ts-value">${serviceState.horaInicioEfectivo}</div></div>` : ''}
      ${serviceState.horaCierreEfectivo
        ? `<div class="ts-recorded"><div class="ts-label">${t('step.cierreef.recorded')}</div><div class="ts-value">${serviceState.horaCierreEfectivo}</div></div>`
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
    const done = Object.values(serviceState.checklistPost).filter(Boolean).length;
    content.innerHTML = `
      <div class="step-title">${t('step.post.title')}</div>
      <div class="step-sub">${t('step.post.sub')}</div>
      <div class="hint hint-blue">${t('step.post.hint')}</div>
      <div class="check-count">${done} / ${CHECKLIST_POST.length} ${t('step.checklist.completed')}</div>
      ${CHECKLIST_POST.map((item, i) => `
        <div class="check-item ${serviceState.checklistPost[i] ? 'checked' : ''}" onclick="toggleCheck('post', ${i})">
          <div class="checkbox">${serviceState.checklistPost[i] ? '✓' : ''}</div>
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
    const tipoReg = currentService?.properties?.['Tipo de registro']?.select?.name || '';
    const conSectores = servicioTieneSectores();
    const isPrueba = tipoReg.includes('Prueba');
    content.innerHTML = `
      <div class="step-title">${t('step.obs.title')}</div>
      <div class="step-sub">${t('step.obs.sub')}</div>

      <div class="field-group">
        <div class="form-label">${t('step.obs.notas.label')}</div>
        <textarea rows="3" placeholder="${t('step.obs.notas.placeholder')}" id="notas-input" oninput="serviceState.notasPost=this.value; persistServiceStateToLocal();">${esc(serviceState.notasPost || '')}</textarea>
      </div>

      ${conSectores ? `
    <div class="field-group">
      <div class="form-label">${t('step.obs.avance.label')}</div>
      <div class="hint hint-blue" style="margin-bottom:6px">${t('step.obs.avance.auto')}</div>
      <div style="font-size:24px;font-weight:800;text-align:center;color:var(--green)">${sectoresAvancePct()}%</div>
      <div style="font-size:12px;color:var(--text3);text-align:center;margin-top:4px">${serviceState.sectores.filter(s=>s.estado==='hecho').length} / ${serviceState.sectores.length} ${t('step.sectores.hechos')}</div>
    </div>
    ` : ''}

      ${(!conSectores && !isPrueba && !tipoReg.includes('Relevamiento')) ? `
    <div class="field-group">
      <div class="form-label">${t('close.termino.label')}</div>
      <div class="radio-group">
        <div class="radio-opt ${serviceState.finalizacion === 'termino' ? 'selected' : ''}" onclick="selectFinalizacion('termino')">${t('close.termino.si')}</div>
        <div class="radio-opt ${serviceState.finalizacion === 'continua' ? 'selected' : ''}" onclick="selectFinalizacion('continua')">${t('close.termino.no')}</div>
      </div>
    </div>
    ${serviceState.finalizacion === 'continua' ? `
    <div class="field-group">
      <div class="form-label">${t('close.jornada.pct.label')}</div>
      <div class="hint hint-blue" style="margin-bottom:10px">${t('close.jornada.pct.hint')}</div>
      <input type="number" min="1" max="99" placeholder="${t('close.jornada.pct.placeholder')}" id="avance-input" value="${serviceState.avance}" oninput="serviceState.avance=this.value; persistServiceStateToLocal();" style="font-size:18px;text-align:center;font-weight:700"/>
    </div>
    ` : ''}
    ` : ''}

      ${(!conSectores && !isPrueba && !tipoReg.includes('Relevamiento') && serviceState.finalizacion !== 'termino') ? '' : `
      <div class="field-group">
        <div class="form-label">${isPrueba ? t('step.obs.resultado.prueba.label') : t('step.obs.resultado.label')}</div>
        <div class="radio-group">
          ${(isPrueba
              ? [t('prueba.resultado.avanza'), t('prueba.resultado.nointeresado'), t('prueba.resultado.recontactar')]
              : ['✅ Exitoso', '⚠️ Con incidencia', '❌ Fallido']
            ).map(r => `
            <div class="radio-opt ${(isPrueba ? serviceState.resultadoPrueba : serviceState.resultado) === r ? 'selected' : ''}" onclick="${isPrueba ? `selectResultadoPrueba('${r}')` : `selectResultado('${r}')`}">${r}</div>
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

  // ── STEPS RELEVAMIENTO ──
  else if (step.id === 'relev_datos') {
    const r = serviceState.relevamiento;
    const DIFICULTADES = ['🚧 Acceso restringido','💧 Sin agua disponible','⚡ Sin electricidad','⚠️ Riesgo eléctrico','🌬️ Vientos frecuentes','🏗️ Andamios necesarios','🪜 Altura significativa (>5 pisos)','🔒 Requiere coordinación especial'];
    const SUGERIDOS = ['🏢 Fachada','🪟 Vidrios','☀️ Paneles solares','🔄 Combinado'];
    content.innerHTML = `
      <div class="step-title">${t('relev.step.datos.title')}</div>
      <div class="step-sub">${t('relev.step.datos.sub')}</div>

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
      <div style="height:20px"></div>
    `;
    bar.innerHTML = `
      <button class="btn-secondary" onclick="goToStep(${currentStep - 1})">${t('btn.back')}</button>
      <button class="btn-main btn-green" onclick="nextStep()">${t('btn.continue')}</button>
    `;
  }

  else if (step.id === 'fotos_relevamiento') {
    content.innerHTML = `
      <div class="step-title">${t('relev.step.fotos.title')}</div>
      <div class="step-sub">${t('relev.step.fotos.sub')}</div>
      <div class="hint hint-amber">${t('relev.step.fotos.hint')}</div>
      ${renderPhotoUploader('relevamiento', 3)}
    `;
    bar.innerHTML = `
      <button class="btn-secondary" onclick="goToStep(${currentStep - 1})">${t('btn.back')}</button>
      <button class="btn-main btn-green" onclick="nextStep()">${t('btn.continue')}</button>
    `;
  }

  else if (step.id === 'relev_notas') {
    content.innerHTML = `
      <div class="step-title">${t('relev.step.notas.title')}</div>
      <div class="step-sub">${t('relev.step.notas.sub')}</div>
      <div class="hint hint-blue">${t('relev.step.notas.hint')}</div>

      <div class="field-group">
        <div class="form-label">📝 ${t('relev.notas.label')}</div>
        <textarea rows="6" placeholder="${t('relev.notas.placeholder')}" oninput="serviceState.relevamiento.notasComercial=this.value; persistServiceStateToLocal();">${esc(serviceState.relevamiento.notasComercial || '')}</textarea>
      </div>
      <div style="height:20px"></div>
    `;
    bar.innerHTML = `
      <button class="btn-secondary" onclick="goToStep(${currentStep - 1})">${t('btn.back')}</button>
      <button class="btn-main btn-green" onclick="nextStep()">${t('btn.continue')}</button>
    `;
  }

  // ── STEP 9: CERRAR ──
  else if (step.id === 'cerrar') {
    const isRelev = STEPS === STEPS_RELEVAMIENTO;
    let summaryRows = '';

    if (isRelev) {
      const r = serviceState.relevamiento;
      const fotosCount = (serviceState.photos?.relevamiento || []).filter(fotoTomada).length;
      summaryRows = `
        <div class="summary-row"><span class="summary-key">📐 ${t('relev.m2.label')}</span><span class="summary-val">${r.m2 ? r.m2 + ' m²' : '—'}</span></div>
        <div class="summary-row"><span class="summary-key">${t('relev.altura.label')}</span><span class="summary-val">${r.altura || '—'}</span></div>
        <div class="summary-row"><span class="summary-key">${t('relev.dificultad.label')}</span><span class="summary-val">${r.dificultades.length || '—'}</span></div>
        <div class="summary-row"><span class="summary-key">${t('relev.sugerido.label')}</span><span class="summary-val">${r.servicioSugerido.join(', ') || '—'}</span></div>
        <div class="summary-row"><span class="summary-key">📸 ${t('relev.fotos.label')}</span><span class="summary-val">${fotosCount}</span></div>
        <div class="summary-row"><span class="summary-key">📝 ${t('relev.notas.label')}</span><span class="summary-val">${r.notasComercial ? '✓' : '—'}</span></div>
      `;
    } else {
      const preCount = Object.values(serviceState.checklistPre).filter(Boolean).length;
      const postCount = Object.values(serviceState.checklistPost).filter(Boolean).length;
      summaryRows = `
        <div class="summary-row"><span class="summary-key">${t('summary.horainicio')}</span><span class="summary-val">${serviceState.horaInicio || '—'}</span></div>
        <div class="summary-row"><span class="summary-key">${t('summary.inicioef')}</span><span class="summary-val">${serviceState.horaInicioEfectivo || '—'}</span></div>
        <div class="summary-row"><span class="summary-key">${t('summary.cierreef')}</span><span class="summary-val">${serviceState.horaCierreEfectivo || '—'}</span></div>
        <div class="summary-row"><span class="summary-key">${t('summary.checklist.pre')}</span><span class="summary-val">${preCount} / ${CHECKLIST_PRE.length}</span></div>
        <div class="summary-row"><span class="summary-key">${t('summary.checklist.post')}</span><span class="summary-val">${postCount} / ${CHECKLIST_POST.length}</span></div>
        <div class="summary-row"><span class="summary-key">${t('summary.avance')}</span><span class="summary-val">${serviceState.avance ? serviceState.avance + '%' : '—'}</span></div>
        <div class="summary-row"><span class="summary-key">${t('summary.resultado')}</span><span class="summary-val">${(currentService?.properties?.['Tipo de registro']?.select?.name || '').includes('Prueba') ? (serviceState.resultadoPrueba || '—') : (serviceState.resultado || '—')}</span></div>
        <div class="summary-row"><span class="summary-key">${t('summary.clima')}</span><span class="summary-val">${(Array.isArray(serviceState.clima) ? serviceState.clima : (serviceState.clima ? [serviceState.clima] : [])).join(', ') || '—'}</span></div>
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
      <button class="btn-secondary" onclick="goToStep(${currentStep - 1})">${t('btn.back')}</button>
      <button class="btn-main btn-red" onclick="cerrarServicio()">${t('btn.close.notion')}</button>
    `;
  }
}

// ─────────────────────────────────────────────
// ACTIONS
// ─────────────────────────────────────────────
function isoNow() { return new Date().toISOString(); }
function timeNow() { return new Date().toLocaleTimeString('es-UY', { hour: '2-digit', minute: '2-digit' }); }

// M10 — Pedir ubicación GPS al operario con Aviso de Privacidad Simplificado previo
// (requisito México LFPDPPP art. 16). Si rechaza, devuelve null y se continúa sin GPS.
function requestUserLocationWithConsent(timeoutMs = 10000) {
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

async function iniciarServicio() {
  // Prevenir doble-iniciar: si ya hay hora, sólo avanzar (no sobreescribir el dato real).
  if (serviceState.horaInicio) {
    nextStep();
    return;
  }
  serviceState.horaInicio = timeNow();

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
    serviceState.gpsInicio = `${gps.lat.toFixed(6)},${gps.lng.toFixed(6)}`;
  }

  // Si el servicio se inicia en un día DISTINTO al programado, la Fecha programada pasa a HOY (para que
  // aparezca en el mes actual del coordinador). `Fecha programada` es property existente → seguro escribirla.
  // HOY en hora LOCAL (no UTC): evita que un inicio nocturno (después de ~21h en UY/BR, la ventana en que
  // UTC ya rodó al día siguiente) se marque erróneamente como "fuera de fecha" y mute la Fecha programada.
  const _hoy = new Date();
  const hoyISO = `${_hoy.getFullYear()}-${String(_hoy.getMonth() + 1).padStart(2, '0')}-${String(_hoy.getDate()).padStart(2, '0')}`;
  const fProgOrig = (currentService?.properties?.['Fecha programada']?.date?.start || '').split('T')[0];
  const desvioFecha = !!fProgOrig && fProgOrig !== hoyISO;
  if (desvioFecha) props['Fecha programada'] = { date: { start: hoyISO } };

  try {
    await queueableUpdateServiceProps(currentService.id, props);
    // Guardar la fecha planificada ORIGINAL en la property nueva `Fecha planificada`, en un write SEPARADO
    // best-effort: si la property no existiera o falla, el inicio NO se rompe (solo no se muestra la marca).
    if (desvioFecha && !currentService?.properties?.['Fecha planificada']?.date?.start) {
      try {
        await updateServiceProps(currentService.id, { 'Fecha planificada': { date: { start: fProgOrig } } });
      } catch (_) { /* property inexistente / red: se ignora, no bloquea el inicio */ }
    }
    showSaving();
    persistServiceStateToLocal();
  } catch (e) { console.warn('Error al guardar inicio:', e); }
  renderStep();
}

// Permite al operario "des-iniciar" un servicio si tocó iniciar por error.
// Solo válido antes de Hora Inicio Efectivo (después hay datos reales del trabajo).
async function cancelarInicio() {
  if (serviceState.horaInicioEfectivo) {
    alert(t('cancelar.inicio.blocked'));
    return;
  }
  if (!confirm(t('cancelar.inicio.confirm'))) return;

  serviceState.horaInicio = null;
  serviceState.gpsInicio = null;
  currentStep = 0;

  try {
    await queueableUpdateServiceProps(currentService.id, {
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
async function continuarInicioEfectivo() {
  if (!serviceState.horaInicioEfectivo) {
    await registrarInicioEfectivo();
    if (!serviceState.horaInicioEfectivo) return; // no pasó la validación (falta método) → no avanzar
  }
  nextStep();
}
async function continuarCierreEfectivo() {
  if (!serviceState.horaCierreEfectivo) await registrarCierreEfectivo();
  nextStep();
}

async function registrarInicioEfectivo() {
  if (serviceState.horaInicioEfectivo) { renderStep(); return; }
  // Método de trabajo obligatorio antes de registrar el inicio efectivo. Multi: al menos uno; si incluye
  // Manual, al menos una herramienta.
  const _met = toArr(serviceState.metodoTrabajo);
  const _herr = toArr(serviceState.herramientaManual);
  if (!_met.length) { alert(t('step.metodo.required')); return; }
  if (_met.includes('💪 Manual') && !_herr.length) {
    alert(t('step.metodo.required.herr')); return;
  }
  serviceState.horaInicioEfectivo = timeNow();
  try {
    await queueableUpdateServiceProps(currentService.id, {
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

async function registrarCierreEfectivo() {
  if (serviceState.horaCierreEfectivo) { renderStep(); return; }
  serviceState.horaCierreEfectivo = timeNow();
  try {
    await queueableUpdateServiceProps(currentService.id, {
      'Hora Fin Efectivo': { date: { start: isoNow()} }
    });
    showSaving();
    persistServiceStateToLocal();
  } catch (e) { console.warn('Error al guardar cierre efectivo:', e); }
  renderStep();
}

function toggleCheck(list, idx) {
  const key = list === 'pre' ? 'checklistPre' : 'checklistPost';
  serviceState[key][idx] = !serviceState[key][idx];
  persistServiceState();
  renderStep();
}

function selectResultadoPrueba(val) {
  serviceState.resultadoPrueba = val;
  persistServiceState();
  renderStep();
}

function selectFinalizacion(val) {
  serviceState.finalizacion = val;
  if (val === 'termino') { serviceState.avance = ''; }   // si terminó, el % no aplica
  persistServiceStateToLocal();   // local only — cerrarServicio lo lee al cerrar; no escribir a Notion acá
  renderStep();
}

function selectResultado(val) {
  serviceState.resultado = val;
  persistServiceState();
  renderStep();
}

function relevToggleDif(val) {
  const arr = serviceState.relevamiento.dificultades;
  const idx = arr.indexOf(val);
  if (idx === -1) arr.push(val); else arr.splice(idx, 1);
  persistServiceState();
  renderStep();
}

function relevToggleSugerido(val) {
  const arr = serviceState.relevamiento.servicioSugerido;
  const idx = arr.indexOf(val);
  if (idx === -1) arr.push(val); else arr.splice(idx, 1);
  persistServiceState();
  renderStep();
}

function selectClima(val) {
  if (!Array.isArray(serviceState.clima)) {
    serviceState.clima = serviceState.clima ? [serviceState.clima] : [];
  }
  const idx = serviceState.clima.indexOf(val);
  if (idx === -1) serviceState.clima.push(val);
  else serviceState.clima.splice(idx, 1);
  persistServiceState();
  renderStep();
}

function selectMetodoTrabajo(val) {
  // Toggle: se pueden marcar Dron Y Manual a la vez (ej. dron arriba + lanzas abajo).
  const arr = toArr(serviceState.metodoTrabajo);
  serviceState.metodoTrabajo = arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val];
  // Si el método ya NO incluye Manual, las herramientas no aplican → limpiar.
  if (!serviceState.metodoTrabajo.includes('💪 Manual')) serviceState.herramientaManual = [];
  persistServiceState();
  renderStep();
}

function selectHerramientaManual(val) {
  // Toggle: varias herramientas a la vez (ej. lanzas + manguera).
  const arr = toArr(serviceState.herramientaManual);
  serviceState.herramientaManual = arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val];
  persistServiceState();
  renderStep();
}

function photosToNotionFiles(arr, baseName) {
  return (arr || [])
    .filter(p => p.status === 'done' && p.publicUrl)
    .map((p, i) => ({
      type: 'external',
      name: `${p.sectorId ? p.sectorId + '__' : ''}${baseName}-${i + 1}.${(p.filename?.split('.').pop() || 'jpg').toLowerCase()}`,
      external: { url: p.publicUrl }
    }));
}

async function cerrarServicio() {
  // Bloquear si hay fotos en upload todavía
  const allPhotos = [
    ...(serviceState.photos?.pre || []),
    ...(serviceState.photos?.post || []),
    ...(serviceState.photos?.relevamiento || [])
  ];
  if (allPhotos.filter(p => p.status === 'uploading').length > 0) { alert(t('photos.wait.uploading')); return; }

  // Si tiene sectores y NO están todos hechos → dejar elegir (seguir otro día / cerrar así). No cerrar aún.
  if (servicioTieneSectores() && !serviceState.sectores.every(s => s.estado === 'hecho')) {
    const pend = serviceState.sectores.filter(s => s.estado !== 'hecho').length;
    openCierreSectoresModal(pend);
    return;
  }

  // Servicio de trabajo SIN sectores: decidir según la pregunta "¿Terminaste?".
  const tipoReg = currentService?.properties?.['Tipo de registro']?.select?.name || '';
  const esTrabajo = !tipoReg.includes('Prueba') && !tipoReg.includes('Relevamiento');
  if (esTrabajo && !servicioTieneSectores()) {
    if (serviceState.finalizacion === 'continua') {
      // Sin señal YA NO bloquea (auditoría 2026-07-09): el cierre-continuación se encola y la ficha del
      // día siguiente se crea al reconectar (con dedup anti-duplicado). Ver _ejecutarCierre + processQueue.
      const pct = parseInt(serviceState.avance, 10);
      if (isNaN(pct) || pct <= 0 || pct >= 100) {
        alert(pct >= 100 ? t('close.jornada.pct.is100') : t('close.jornada.need.pct'));
        return;
      }
      await _ejecutarCierre('continuar');
      return;
    }
    if (serviceState.finalizacion !== 'termino') { alert(t('close.jornada.need.choice')); return; }
    // 'termino' → cae al flujo normal de completar (valida resultado).
  }

  // Sin sectores + terminó (o Prueba/Relevamiento) → completar (valida resultado como hoy).
  if (!_cierreResultadoOk()) return;
  await _ejecutarCierre('completar');
}

// Validación de resultado obligatorio (Órdenes/Jornadas usan 'Resultado'; Pruebas 'Resultado prueba'; Relevamientos no).
function _cierreResultadoOk() {
  const tipoReg = currentService?.properties?.['Tipo de registro']?.select?.name || '';
  if (tipoReg.includes('Relevamiento')) return true;
  const isPrueba = tipoReg.includes('Prueba');
  const valor = isPrueba ? serviceState.resultadoPrueba : serviceState.resultado;
  if (!valor) { alert(t(isPrueba ? 'close.prueba.need.resultado' : 'close.need.resultado')); return false; }
  return true;
}

// modo: 'completar' (Estado → ✅ Completado) | 'continuar' (reprograma a mañana como 🔄 Asignado).
async function _ejecutarCierre(modo) {
  const tipoReg = currentService?.properties?.['Tipo de registro']?.select?.name || '';
  const isPrueba = tipoReg.includes('Prueba');
  const jornadaN = currentService?.properties?.['Jornada N°']?.number;
  const conSectores = servicioTieneSectores();

  const btn = document.querySelector('.btn-red');
  if (btn) { btn.textContent = t('btn.saving.notion'); btn.disabled = true; }

  const properties = {};

  // ── Estado + fechas + parte por día ──
  if (conSectores) {
    properties['% de avance'] = { number: sectoresAvancePct() };
    const secs = serviceState.sectores.map(x => ({ id: x.id, nombre: String(x.nombre || '').trim(), estado: x.estado || 'pendiente' })).filter(x => x.nombre);
    properties['Estado sectores'] = { rich_text: secs.length ? [{ text: { content: JSON.stringify(secs) } }] : [] };

    // Parte del día: sectores que pasaron a 'hecho' HOY (vs snapshot al abrir).
    const antes = new Map((serviceState.sectoresAlAbrir || []).map(s => [s.id, s.estado]));
    const hechosHoy = serviceState.sectores.filter(s => s.estado === 'hecho' && antes.get(s.id) !== 'hecho').map(s => s.id);
    const hoy = new Date().toISOString().split('T')[0];
    const reg = Array.isArray(serviceState.registroJornadas) ? serviceState.registroJornadas.slice() : [];
    reg.push({ fecha: hoy, ini: serviceState.horaInicioEfectivo || '', fin: serviceState.horaCierreEfectivo || '', hechos: hechosHoy });
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
      properties['% de avance'] = { number: parseInt(serviceState.avance, 10) };
      properties['Tipo de registro'] = { select: { name: '📅 Jornada' } };
      const curN = currentService?.properties?.['Jornada N°']?.number;
      properties['Jornada N°'] = { number: (typeof curN === 'number' ? curN : 1) };
    } else if ((jornadaN != null) || tipoReg.includes('Jornada')) {
      // Jornada que termina: si el operario dejó un %, usarlo; si eligió "terminado", es 100%.
      properties['% de avance'] = { number: serviceState.avance !== '' ? parseFloat(serviceState.avance) : 100 };
    }
  }

  // ── Campos comunes (igual que el cierre de siempre) ──
  if (serviceState.notasPost) properties['Notas post-servicio'] = { rich_text: [{ text: { content: serviceState.notasPost } }] };
  if (isPrueba) { if (serviceState.resultadoPrueba) properties['Resultado prueba'] = { select: { name: serviceState.resultadoPrueba } }; }
  else if (serviceState.resultado) properties['Resultado'] = { select: { name: serviceState.resultado } };
  const climaArr = Array.isArray(serviceState.clima) ? serviceState.clima : (serviceState.clima ? [serviceState.clima] : []);
  if (climaArr.length) properties['Condición climática'] = { multi_select: climaArr.map(name => ({ name })) };
  const metodoArrC = toArr(serviceState.metodoTrabajo);
  if (metodoArrC.length) {
    properties['Método de trabajo'] = { multi_select: metodoArrC.map(name => ({ name })) };
    const herrArrC = toArr(serviceState.herramientaManual);
    if (metodoArrC.includes('💪 Manual') && herrArrC.length) properties['Herramienta manual'] = { multi_select: herrArrC.map(name => ({ name })) };
  }
  const preFiles = photosToNotionFiles(serviceState.photos?.pre, 'pre');
  const postFiles = photosToNotionFiles(serviceState.photos?.post, 'post');
  const relevFiles = photosToNotionFiles(serviceState.photos?.relevamiento, 'relev');
  if (preFiles.length) properties['📸 Fotos pre-servicio'] = { files: preFiles };
  if (postFiles.length) properties['📸 Fotos post-servicio'] = { files: postFiles };
  if (relevFiles.length) properties['📸 Fotos relevamiento'] = { files: relevFiles };
  const _ckClose = { pre: serviceState.checklistPre || {}, post: serviceState.checklistPost || {} };
  if (Object.keys(_ckClose.pre).length || Object.keys(_ckClose.post).length) properties['Estado checklist'] = { rich_text: [{ text: { content: JSON.stringify(_ckClose) } }] };
  if (tipoReg.includes('Relevamiento')) {
    const r = serviceState.relevamiento || {};
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
    const result = await queueableUpdateServiceProps(currentService.id, properties);
    if (!result?.queued) { try { localStorage.removeItem(storageKeyForService(currentService.id)); } catch (_) {} }
    // Servicio sin sectores que sigue otro día → crear la ficha del día siguiente (J+1).
    if (!conSectores && modo === 'continuar') {
      const man = new Date(); man.setDate(man.getDate() + 1);
      const fecha = man.toISOString().split('T')[0];
      const curN = currentService?.properties?.['Jornada N°']?.number;
      const siguienteN = (typeof curN === 'number' ? curN : 1) + 1;
      if (result?.queued || !navigator.onLine) {
        // Sin señal: el cierre ya se encoló → encolar también el CREATE de la J+1 (se crea al reconectar,
        // con dedup). Congelamos props+rootId ahora (snapshot del padre). Auditoría 2026-07-09.
        const { properties: jProps, rootId } = buildJornadaSiguienteProps(currentService, siguienteN, fecha);
        await enqueueCreate(SERVICIOS_DS_ID, jProps, { rootId, jornadaN: siguienteN });
      } else {
        try {
          await crearJornadaSiguiente(currentService, siguienteN, fecha);
        } catch (e) {
          // Si fue por red, encolar (no perder la J+1); otro error → avisar (se guardó el día, falta la ficha).
          if (isNetworkError(e)) {
            const { properties: jProps, rootId } = buildJornadaSiguienteProps(currentService, siguienteN, fecha);
            await enqueueCreate(SERVICIOS_DS_ID, jProps, { rootId, jornadaN: siguienteN });
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

function showDoneScreen(continua) {
  const preCount = Object.values(serviceState.checklistPre).filter(Boolean).length;
  const postCount = Object.values(serviceState.checklistPost).filter(Boolean).length;

  document.getElementById('done-stats').innerHTML = `
    <div class="done-stat-row"><span style="color:var(--text3)">${t('done.stat.inicio')}</span><span>${serviceState.horaInicio || '—'}</span></div>
    <div class="done-stat-row"><span style="color:var(--text3)">${t('done.stat.inicioef')}</span><span>${serviceState.horaInicioEfectivo || '—'}</span></div>
    <div class="done-stat-row"><span style="color:var(--text3)">${t('done.stat.cierreef')}</span><span>${serviceState.horaCierreEfectivo || '—'}</span></div>
    <div class="done-stat-row"><span style="color:var(--text3)">${t('done.stat.resultado')}</span><span>${(currentService?.properties?.['Tipo de registro']?.select?.name || '').includes('Prueba') ? (serviceState.resultadoPrueba || '—') : (serviceState.resultado || '—')}</span></div>
    <div class="done-stat-row"><span style="color:var(--text3)">${t('done.stat.checklists')}</span><span>${preCount}/${CHECKLIST_PRE.length} · ${postCount}/${CHECKLIST_POST.length}</span></div>
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

async function finishAndGoBack() {
  await loadServices();
}

// ─────────────────────────────────────────────
// COORDINATOR
// ─────────────────────────────────────────────
// ─────────────────────────────────────────────
// CEO DASHBOARD
// ─────────────────────────────────────────────
async function loadCEO() {
  if (!currentUser) { showScreen('login'); return; }
  if (!puedeVerCEO()) { return routeByRole(currentUser.role); } // ningún otro rol entra al panel CEO
  markUserActive();
  showScreen('ceo');
  document.getElementById('ceo-user-name').textContent = currentUser.emoji + ' ' + currentUser.name.split(' ')[0];
  const flagMap = { 'Uruguay': '🇺🇾', 'Brasil': '🇧🇷', 'Panamá': '🇵🇦', 'Guatemala': '🇬🇹', 'México': '🇲🇽' };
  document.getElementById('ceo-brand-title').innerHTML = '<svg class="fly-mark" style="color:#00C98D"><use href="#fc-mark"/></svg>FlyClean ' + (flagMap[currentUser.country] || '') + ' — ' + t('ceo.user.fallback');
  ceoViewCountry = (currentUser.country === 'Uruguay') ? 'all' : currentUser.country;
  ceoPeriod = { mode: 'mes', off: 0, from: '', to: '' };
  _ceoContentId = 'ceo-content';
  _ceoRerender = renderCEOMetricas;
  loadAlerts(currentUser.role, 'alerts-banner-ceo');
  activeCEOTab = 'metricas';
  ['metricas','servicios','finanzas','equipo'].forEach(t =>
    document.getElementById('ceotab-' + t).classList.toggle('active', t === 'metricas')
  );
  renderCEOCountryTabs();
  // Métricas has its own sub-tabs — hide global tabs on load
  const globalTabs = document.getElementById('ceo-country-tabs');
  if (globalTabs) globalTabs.style.display = 'none';
  await renderCEOMetricas();
}

function renderCEOCountryTabs() {
  const container = document.getElementById('ceo-country-tabs');
  const isGlobalCEO = currentUser.country === 'Uruguay';
  if (!isGlobalCEO) { container.innerHTML = ''; return; }
  const options = [['all','🌎 Todos'],['Uruguay','🇺🇾 UY'],['Brasil','🇧🇷 BR'],['Panamá','🇵🇦 PA'],['Guatemala','🇬🇹 GT'],['México','🇲🇽 MX']];
  container.innerHTML = options.map(([val, label]) =>
    `<button class="ceo-country-tab ${ceoViewCountry === val ? 'active' : ''}" onclick="setCEOCountry('${val}')">${label}</button>`
  ).join('');
}

async function setCEOCountry(country) {
  ceoViewCountry = country;
  renderCEOCountryTabs();
  if (activeCEOTab === 'metricas') await renderCEOMetricas();
  else if (activeCEOTab === 'servicios') await renderCEOServicios();
  else if (activeCEOTab === 'finanzas') await renderCEOFinanzas();
  else await renderCEOEquipo();
}

async function setCEOTab(tab) {
  activeCEOTab = tab;
  _ceoContentId = 'ceo-content';
  ['metricas','servicios','finanzas','porcobrar','clientes','equipo'].forEach(t =>
    document.getElementById('ceotab-' + t)?.classList.toggle('active', t === tab)
  );
  // Global country tabs: hidden en Métricas (tiene sub-tabs propias), Por cobrar y Clientes (muestran todo).
  const globalTabs = document.getElementById('ceo-country-tabs');
  if (globalTabs) globalTabs.style.display = (tab === 'metricas' || tab === 'porcobrar' || tab === 'clientes') ? 'none' : '';
  if (tab === 'metricas') { _ceoRerender = renderCEOMetricas; await renderCEOMetricas(); }
  else if (tab === 'servicios') await renderCEOServicios();
  else if (tab === 'finanzas') { _ceoRerender = renderCEOFinanzas; await renderCEOFinanzas(); }
  else if (tab === 'porcobrar') { _ceoRerender = () => renderPorCobrar('ceo-content', { readonly: true }); await renderPorCobrar('ceo-content', { readonly: true }); }
  else if (tab === 'clientes') { _ceoRerender = () => renderClientesView('ceo-content'); await renderClientesView('ceo-content'); }
  else if (tab === 'equipo') await renderCEOEquipo();
}

function backFromCEO() {
  if (!currentUser) { logout(); return; }
  if (currentUser.role.includes('Dirección')) {
    showScreen('coordinator');
  } else {
    // CEO puro: nada de logout directo de un toque — abre el menú de cuenta (salir vive ahí, con confirmación).
    openAccountMenu();
  }
}

function goToCEOFromCoord() {
  loadCEO();
}

async function renderCEOMetricas() {
  const content = document.getElementById(_ceoContentId);
  content.innerHTML = '<div style="text-align:center;padding:40px 0"><div class="spinner" style="margin:0 auto"></div></div>';
  try {
    const isUruguayCEO = currentUser.country === 'Uruguay';
    const cf  = getCEOFilter();
    const fcf = getCEOFinanceFilter();
    const now = new Date();
    const { start, end, label: periodLabel } = getCEOPeriodRange();
    const yearStart = now.getFullYear() + '-01-01';
    const yearEnd   = now.getFullYear() + '-12-31';
    const dFilter = (s, e) => ({ and: [ ...(fcf ? [fcf] : []), { property: 'Fecha', date: { on_or_after: s } }, { property: 'Fecha', date: { on_or_before: e } } ] });
    const propFilter    = { and: [ ...(cf ? [cf] : []), { property: 'Estado pipeline', select: { does_not_equal: '❌ Rechazada' } }, { property: 'Estado pipeline', select: { does_not_equal: '😶 Sin respuesta' } } ] };
    const contactFilter = cf ? { and: [cf, { property: 'Estado', select: { equals: '✅ Cliente activo' } }] } : { property: 'Estado', select: { equals: '✅ Cliente activo' } };

    // Gastos/Ingresos PAGINADOS (año/rango pueden tener >100 filas). Servicios/props/contactos: 1 página (pocos).
    // Servicios (multi-data-source → fallback de búsqueda, frágil bajo carga concurrente): se trae
    // SOLO, aparte y UNA vez por sesión (se cachea; no cambia por período) + reintento si vuelve vacío.
    if (!_ceoServiciosAll || !_ceoServiciosAll.length) {
      let r = await callNotion(`databases/${DB_ID}/query`, 'POST', { page_size: 100 });
      if (!(r.results || []).length) { await new Promise(x => setTimeout(x, 600)); r = await callNotion(`databases/${DB_ID}/query`, 'POST', { page_size: 100 }); }
      _ceoServiciosAll = r.results || [];
    }
    const svcAllData = { results: _ceoServiciosAll };
    // Nombres de cliente para el Tablero de Rentabilidad: dispara en paralelo con lo demás (no agrega
    // latencia secuencial); guardado — si el espejo Supabase no responde, se cae a contactData (activos).
    const clientesPromise = callDb('clientes').catch(() => null);
    // CRM comercial (📊, ver más abajo): TODAS las propuestas (no solo las abiertas del propFilter de
    // abajo) — dispara en paralelo, nunca rompe Métricas si falla (try/catch propio + fallback a Notion).
    const propAllPromise = (async () => {
      try { return await callDb('propuestas'); }
      catch (e) { try { return await callNotionAll(`databases/${PROPUESTAS_DB_ID}/query`, {}); } catch (e2) { return null; } }
    })();
    // Sub-bloque 🎯 Prospección (📊 Comercial, ver más abajo): clientes en estados de prospección,
    // scopeados al país que se está viendo (getCEOFilter). Dispara en paralelo — null si falla,
    // nunca rompe Métricas/Comercial (guard en el try/catch de _ceoComData más abajo).
    const prospClientesPromise = (async () => {
      try {
        const cfp = getCEOFilter();
        const estadoOr = { or: PROSPECCION_ESTADOS.map(e => ({ property: 'Estado', select: { equals: e } })) };
        const filter = cfp ? { and: [cfp, estadoOr] } : estadoOr;
        const data = await callNotion(`databases/${CONTACTOS_DB_ID}/query`, 'POST', { filter });
        return (data.results || []).filter(c => !esArchivado(c));
      } catch (e) { return null; }
    })();
    // Finanzas paginadas + propuestas + contactos en paralelo.
    const [ingData, gasData, ingYearData, gasYearData, propData, contactData] = await Promise.all([
      callNotionAll(`databases/${INGRESOS_DB_ID}/query`, { filter: dFilter(start, end) }),
      callNotionAll(`databases/${GASTOS_DB_ID}/query`, { filter: dFilter(start, end) }),
      callNotionAll(`databases/${INGRESOS_DB_ID}/query`, { filter: dFilter(yearStart, yearEnd) }),
      callNotionAll(`databases/${GASTOS_DB_ID}/query`, { filter: dFilter(yearStart, yearEnd) }),
      callNotion(`databases/${PROPUESTAS_DB_ID}/query`, 'POST', { filter: propFilter }),
      callNotion(`databases/${CONTACTOS_DB_ID}/query`, 'POST', { filter: contactFilter })
    ]);

    // Servicios: apply client-side country filter (search API fallback ignores server filter)
    const applyCountryFilter = (results) => {
      if (!cf || ceoViewCountry === 'all') return results;
      const notionVal = COUNTRY_NOTION_MAP[ceoViewCountry];
      return results.filter(s => s.properties?.['País']?.select?.name === notionVal);
    };
    // El fallback de búsqueda de Servicios ignora el filtro del server → filtramos por Estado en el cliente.
    const estadoDe = s => (s.properties?.['Estado']?.select?.name) || '';
    const enPeriodo = s => { const f = s.properties?.['Fecha programada']?.date?.start || ''; return f ? (f >= start && f <= end) : (ceoPeriod.mode === 'todo'); };
    const svcComp   = applyCountryFilter(svcAllData.results || []).filter(s => !esArchivado(s) && estadoDe(s).includes('Completado') && enPeriodo(s));
    const svcActivo = applyCountryFilter(svcAllData.results || []).filter(s => !esArchivado(s) && (estadoDe(s).includes('En curso') || estadoDe(s).includes('Asignado')));

    _ceoDataTime = Date.now();
    const ingSplit = sumByMoneda(ingData.results, 'ingreso');
    const gasSplit = sumByMoneda(gasData.results, 'gasto');
    const balSplit = { uyu: ingSplit.uyu - gasSplit.uyu, usd: ingSplit.usd - gasSplit.usd };
    const svcCount = svcComp.length, svcActivos = svcActivo.length;
    const propCount = (propData.results || []).length;

    // Margen REAL por moneda (sin mezclar) — el principal.
    const margenReal = {
      uyu: ingSplit.uyu > 0 ? Math.round((ingSplit.uyu - gasSplit.uyu) / ingSplit.uyu * 100) : null,
      usd: ingSplit.usd > 0 ? Math.round((ingSplit.usd - gasSplit.usd) / ingSplit.usd * 100) : null,
    };
    // Margen unificado aprox (secundario, rotulado): convierte a USD con el TC del registro (fallback 40).
    const TC_FB = 40;
    const toUSD = (props, kind) => { const { esUY, monto } = montoOf(props, kind); if (!esUY) return monto; const tc = props?.[kind === 'gasto' ? 'TC usado' : 'TC aplicado']?.number || TC_FB; return tc ? monto / tc : 0; };
    const ingUSDc = (ingData.results || []).filter(kpiIncluido).reduce((s, r) => s + toUSD(r.properties || {}, 'ingreso'), 0);
    const gasUSDc = (gasData.results || []).filter(kpiIncluido).reduce((s, r) => s + toUSD(r.properties || {}, 'gasto'), 0);
    const margenUnif = ingUSDc > 0 ? Math.round((ingUSDc - gasUSDc) / ingUSDc * 100) : null;

    const ticketSplit = svcCount ? { uyu: ingSplit.uyu / svcCount, usd: ingSplit.usd / svcCount } : null;

    // Mensual del año (para sparkline + delta vs mes anterior).
    const ms = {};
    const accM = (results, kind) => (results || []).filter(kpiIncluido).forEach(r => { const m = (r.properties?.['Fecha']?.date?.start || '').slice(0, 7); if (!m) return; const { esUY, monto } = montoOf(r.properties || {}, kind); (ms[m] = ms[m] || { iu: 0, id: 0, gu: 0, gd: 0 }); if (kind === 'ingreso') { if (esUY) ms[m].iu += monto; else ms[m].id += monto; } else { if (esUY) ms[m].gu += monto; else ms[m].gd += monto; } });
    accM(ingYearData.results, 'ingreso'); accM(gasYearData.results, 'gasto');
    const monthKeys = Object.keys(ms).sort();
    const balU = m => (ms[m] ? ms[m].iu - ms[m].gu : 0), balD = m => (ms[m] ? ms[m].id - ms[m].gd : 0);
    const spark = monthKeys.slice(-6).map(m => balD(m) + balU(m) / TC_FB);
    let deltaU = null, deltaD = null;
    if (ceoPeriod.mode === 'mes') {
      const curM = start.slice(0, 7), idx = monthKeys.indexOf(curM), prevM = idx > 0 ? monthKeys[idx - 1] : null;
      const pct = (c, p) => (p ? Math.max(-999, Math.min(999, Math.round((c - p) / Math.abs(p) * 100))) : null);
      if (prevM) { deltaU = pct(balU(curM), balU(prevM)); deltaD = pct(balD(curM), balD(prevM)); }
    }

    const balOk = balSplit.uyu >= 0 && balSplit.usd >= 0;
    const salud = balOk ? { t: '🟢 Sana', c: 'var(--green)' } : ((balSplit.uyu < 0 && balSplit.usd < 0) ? { t: '🔴 Atención', c: 'var(--red)' } : { t: '🟡 Ojo', c: '#F5A623' });

    const ingSinVinc = (ingYearData.results || []).filter(r => !(r.properties?.['Servicio vinculado']?.relation || []).length).length;
    const svcSinFecha = applyCountryFilter(svcAllData.results || []).filter(s => estadoDe(s).includes('Completado') && !(s.properties?.['Fecha programada']?.date?.start)).length;
    const aRevisar = [];
    if (ingSinVinc) aRevisar.push(ingSinVinc + ' cobros sin servicio vinculado');
    if (svcSinFecha) aRevisar.push(svcSinFecha + ' servicios completados sin fecha programada');

    const tipoCount = {};
    // multi_select: un servicio Fachada+Vidrios cuenta en AMBAS barras (mide trabajo por tipo, no servicios)
    svcComp.forEach(s => { const tps = tipoServicioList(s.properties); (tps.length ? tps : [t('ceo.tipos.sintipo')]).forEach(tp => { tipoCount[tp] = (tipoCount[tp] || 0) + 1; }); });
    const maxTipo = Math.max(1, ...Object.values(tipoCount));
    const tipoHTML = Object.entries(tipoCount).sort((a, b) => b[1] - a[1]).map(([k, v]) => '<div class="tipo-row"><span class="tipo-name">' + esc(k) + '</span><span class="tipo-bar"><span style="width:' + Math.round(v / maxTipo * 100) + '%"></span></span><span class="tipo-val">' + v + '</span></div>').join('') || '<div class="kpi-sub" style="padding:8px 16px">— sin servicios completados en este período —</div>';

    // Tablero de Rentabilidad (📈, desplegable debajo de "Servicios por tipo"): margen v1 = ingresos
    // vinculados − gastos vinculados (NO jornales, NO prorrateo). Nombres de cliente: contactData
    // (activos) primero, completado con el espejo Supabase 'clientes' (todos) si llegó a tiempo.
    const normId = s => (s || '').replace(/-/g, '');
    const clienteNombreById = {};
    (contactData.results || []).forEach(c => { clienteNombreById[normId(c.id)] = c.properties?.['Nombre / Empresa']?.title?.[0]?.plain_text || ''; });
    const cliData = await clientesPromise; // guardada arriba (.catch(()=>null)) — nunca relanza
    (cliData?.results || []).forEach(c => { const nm = c.properties?.['Nombre / Empresa']?.title?.[0]?.plain_text; if (nm) clienteNombreById[normId(c.id)] = nm; });
    _ceoRentaData = computeRentabilidad({ svcAll: svcAllData.results, ingResults: ingData.results, gasResults: gasData.results, ms, clienteNombreById });

    // CRM comercial (📊, desplegable debajo de Rentabilidad): defensivo — un fallo acá NUNCA debe
    // tirar abajo Métricas ya calculada arriba (render "—" en vez de romper el panel).
    try {
      const propAllData = await propAllPromise;
      let allPropsCom = (propAllData?.results || []).slice();
      if (cf && ceoViewCountry !== 'all') {
        const notionVal = COUNTRY_NOTION_MAP[ceoViewCountry];
        if (notionVal) allPropsCom = allPropsCom.filter(p => p.properties?.['País']?.select?.name === notionVal);
      }
      _ceoComData = computeComercial(allPropsCom);
    } catch (e) { _ceoComData = null; }

    // Sub-bloque 🎯 Prospección (spec 2026-07-02 B2): mismo criterio defensivo — un fallo acá
    // nunca debe tirar abajo Métricas ni Comercial ya calculados arriba.
    try {
      const prospClientes = await prospClientesPromise;
      _ceoProspData = prospClientes ? computeProspeccionMetrics(prospClientes) : null;
    } catch (e) { _ceoProspData = null; }

    // valor monetario tipo HÉROE (2 líneas UY$ / USD), con delta opcional.
    const heroLines = (split, opts = {}) => {
      const rows = [];
      const push = (n, mon, delta) => {
        const neg = n < 0, col = opts.bal ? (neg ? 'var(--red)' : 'var(--green)') : (opts.color || 'var(--text)');
        const sgn = opts.bal ? (neg ? '−' : '+') : '';
        const d = (delta != null) ? ' <span class="hero-delta ' + (delta >= 0 ? 'up' : 'dn') + '">' + (delta >= 0 ? '▲' : '▼') + ' ' + Math.abs(delta) + '%</span>' : '';
        rows.push('<div class="hero-line" style="color:' + col + '">' + sgn + fmtMoneda(n, mon) + d + '</div>');
      };
      if (split.uyu || (!split.uyu && !split.usd)) push(split.uyu, '🇺🇾 UY$', opts.deltaU);
      if (split.usd) push(split.usd, '🇺🇸 USD', opts.deltaD);
      return rows.join('');
    };
    const kpiLines = (split) => {
      const rows = [];
      const push = (n, mon) => rows.push('<div class="kpi-num">' + fmtMoneda(n, mon) + '</div>');
      if (split.uyu || (!split.uyu && !split.usd)) push(split.uyu, '🇺🇾 UY$');
      if (split.usd) push(split.usd, '🇺🇸 USD');
      return rows.join('');
    };
    const margenCard = (margenReal.uyu == null && margenReal.usd == null)
      ? '<div class="kpi-num" style="color:var(--text3)">—</div>'
      : ((margenReal.uyu != null ? '<div class="kpi-num" style="color:' + (margenReal.uyu >= 0 ? 'var(--green)' : 'var(--red)') + '">UY$ ' + (margenReal.uyu >= 0 ? '+' : '') + margenReal.uyu + '%</div>' : '') + (margenReal.usd != null ? '<div class="kpi-num" style="color:' + (margenReal.usd >= 0 ? 'var(--green)' : 'var(--red)') + '">USD ' + (margenReal.usd >= 0 ? '+' : '') + margenReal.usd + '%</div>' : ''));

    if (activeCEOTab !== 'metricas') return; // cambió de tab mientras cargaba → NO pisar el contenido nuevo
    content.innerHTML = ceoHeaderHTML('Métricas') + renderCEOPeriodSelector() +
      '<div class="acct">' +
        '<div class="salud-band" style="color:' + salud.c + '">SALUD DEL NEGOCIO<span class="salud-chip">' + salud.t + '</span></div>' +
        '<div class="hero-block"><div class="hero-label">BALANCE · ' + periodLabel + '</div>' +
          heroLines(balSplit, { bal: true, deltaU, deltaD }) +
          (spark.length >= 2 ? '<div class="hero-spark">' + buildSparkline(spark) + '<div class="hero-spark-cap">tendencia ' + spark.length + ' meses</div></div>' : '') +
        '</div>' +
        '<div class="kpi-grid">' +
          '<div class="kpi-card"><div class="kpi-label">Ticket promedio</div>' + (ticketSplit ? kpiLines(ticketSplit) : '<div class="kpi-num" style="color:var(--text3)">—</div>') + '<div class="kpi-sub">por servicio</div></div>' +
          '<div class="kpi-card"><div class="kpi-label">Servicios</div><div class="kpi-num big">' + svcCount + '</div><div class="kpi-sub">completados</div></div>' +
          '<div class="kpi-card"><div class="kpi-label">Margen real</div>' + margenCard + '<div class="kpi-sub">' + (margenUnif != null ? '~' + margenUnif + '% unif. (aprox)' : 'por moneda') + '</div></div>' +
          '<div class="kpi-card"><div class="kpi-label">Pipeline</div><div class="kpi-num big">' + svcActivos + ' <span class="kpi-unit">en curso</span></div><div class="kpi-num" style="font-size:15px">' + propCount + ' <span class="kpi-unit">propuestas</span></div></div>' +
        '</div>' +
        '<button class="ceo-acc-head" onclick="toggleCeoAcc(this)"><span>🧰 Servicios por tipo</span><span class="fin-arrow">▾</span></button>' +
        '<div class="ceo-acc-body" style="display:none">' + tipoHTML + '</div>' +
        '<button class="ceo-acc-head" onclick="toggleCeoAcc(this)"><span>📈 ' + t('ceo.renta.title') + '</span><span class="fin-arrow">▾</span></button>' +
        '<div class="ceo-acc-body" style="display:none"><div id="ceo-renta-body"></div></div>' +
        '<button class="ceo-acc-head" onclick="toggleCeoAcc(this)"><span>📊 ' + t('ceo.com.title') + '</span><span class="fin-arrow">▾</span></button>' +
        '<div class="ceo-acc-body" style="display:none"><div id="ceo-com-body"></div></div>' +
        (aRevisar.length ? '<button class="ceo-acc-head warn" onclick="toggleCeoAcc(this)"><span>⚠️ A revisar (' + aRevisar.length + ')</span><span class="fin-arrow">▾</span></button><div class="ceo-acc-body" style="display:none">' + aRevisar.map(x => '<div class="fin-detail-row"><div class="fin-detail-main"><div class="fin-detail-title">• ' + esc(x) + '</div></div></div>').join('') + '<div class="kpi-sub" style="padding:8px 16px 4px">Completalos desde el proyecto FlyClean-Finanzas para KPIs exactos por período y por cliente.</div></div>' : '') +
      '</div>';
    // Defensivo: un fallo pintando Rentabilidad no debe tirar abajo el panel de Métricas ya renderizado.
    try { renderCeoRentaBody(); } catch (_) {}
    try { renderCeoComBody(); } catch (_) {}
  } catch (e) {
    if (activeCEOTab === 'metricas') content.innerHTML = '<div class="coord-empty">' + t('ceo.error.metricas') + '<br><small>' + esc(e.message) + '</small></div>';
  }
}

// ── Tablero de Rentabilidad v1 (CEO→Métricas → desplegable "📈 Rentabilidad") ──────────────────────
// Margen v1 = ingresos vinculados − gastos vinculados. NO jornales, NO prorrateo (eso queda para v2).
// UY$ y USD NUNCA se mezclan ni convierten: todo agregado se guarda y se muestra separado por moneda.
//
// Vinculación (property names verificados en el código real, no asumidos):
//   servicio → cliente:  props['Contacto']?.relation (fallback legacy 'Contactos')
//   ingreso  → servicio: props['Servicio vinculado']?.relation   (NO 'Servicio' — ese es el título)
//   ingreso  → cliente:  props['Cuenta']?.relation                (fallback directo si no hay servicio)
//   gasto    → servicio: props['Servicio']?.relation               (Gastos NO usa 'Servicio vinculado')
//   gasto    → cliente:  no existe fallback directo (por diseño — ver spec) → sin servicio = sin vincular
//
// "Sin vincular" es un total DISTINTO por vista (cliente vs servicio): la plata sin cliente resuelto
// cae en el total de la vista Cliente; la plata sin servicio resuelto cae en el total de la vista
// Servicio — cada vista reconcilia con el Balance del período sumando sus filas + su línea "sin vincular".
function computeRentabilidad({ svcAll, ingResults, gasResults, ms, clienteNombreById }) {
  const norm = s => (s || '').replace(/-/g, '');
  const NOTION_TO_KEY = {}; Object.entries(COUNTRY_NOTION_MAP).forEach(([k, v]) => { NOTION_TO_KEY[v] = k; });
  const FIN_TO_KEY = {}; Object.entries(COUNTRY_FINANCE_MAP).forEach(([k, v]) => { FIN_TO_KEY[v] = k; });

  // Metadata de servicios: id normalizado (sin guiones) → nombre / cliente / país.
  const svcMeta = {};
  (svcAll || []).forEach(s => {
    const p = s.properties || {};
    const clienteIdRaw = p['Contacto']?.relation?.[0]?.id || p['Contactos']?.relation?.[0]?.id || '';
    svcMeta[norm(s.id)] = {
      nombre: p['Nombre del servicio']?.title?.[0]?.plain_text || t('common.sinnombre'),
      clienteId: clienteIdRaw ? norm(clienteIdRaw) : '',
      paisKey: NOTION_TO_KEY[p['País']?.select?.name || ''] || ''
    };
  });

  const mkMoney = () => ({ uyu: 0, usd: 0 });
  const addMoney = (m, esUY, monto) => { if (esUY) m.uyu += monto; else m.usd += monto; };
  const withMargen = o => { o.margen = { uyu: o.ing.uyu - o.gas.uyu, usd: o.ing.usd - o.gas.usd }; return o; };

  const byCliente = {}, byServicio = {}, byPais = {};
  const ensureCliente = id => (byCliente[id] = byCliente[id] || { nombre: clienteNombreById[id] || t('ceo.renta.cliente.generico'), ing: mkMoney(), gas: mkMoney() });
  const ensureServicio = id => (byServicio[id] = byServicio[id] || { nombre: (svcMeta[id] && svcMeta[id].nombre) || t('common.sinnombre'), ing: mkMoney(), gas: mkMoney() });
  const ensurePais = key => (byPais[key] = byPais[key] || { ing: mkMoney(), gas: mkMoney() });
  const sinVincCliente = { ing: mkMoney(), gas: mkMoney() };
  const sinVincServicio = { ing: mkMoney(), gas: mkMoney() };

  // Ingresos (servicio vía 'Servicio vinculado'; cliente directo vía 'Cuenta' si no hay servicio).
  (ingResults || []).filter(kpiIncluido).forEach(r => {
    const p = r.properties || {};
    const { esUY, monto } = montoOf(p, 'ingreso');
    const svcIdRaw = p['Servicio vinculado']?.relation?.[0]?.id || '';
    const svcId = svcIdRaw ? norm(svcIdRaw) : '';
    const cuentaIdRaw = p['Cuenta']?.relation?.[0]?.id || '';
    const cuentaId = cuentaIdRaw ? norm(cuentaIdRaw) : '';
    const meta = svcId ? svcMeta[svcId] : null;

    if (svcId) addMoney(ensureServicio(svcId).ing, esUY, monto);
    else addMoney(sinVincServicio.ing, esUY, monto);

    // Cliente: si hay svcId, SIEMPRE vía el cliente del servicio (aunque el servicio no tenga uno
    // cargado → cae a "sin vincular", nunca se usa la 'Cuenta' del ingreso como desempate). El
    // fallback directo a 'Cuenta' es SOLO para ingresos sin servicio vinculado en absoluto.
    const clienteId = svcId ? ((meta && meta.clienteId) || '') : cuentaId;
    if (clienteId) addMoney(ensureCliente(clienteId).ing, esUY, monto);
    else addMoney(sinVincCliente.ing, esUY, monto);

    const paisKey = (meta && meta.paisKey) || FIN_TO_KEY[p['País']?.select?.name || ''] || '';
    addMoney(ensurePais(paisKey || 'sin-pais').ing, esUY, monto);
  });

  // Gastos (servicio vía 'Servicio'; SIN fallback directo a cliente — sin servicio = sin vincular).
  (gasResults || []).filter(kpiIncluido).forEach(r => {
    const p = r.properties || {};
    const { esUY, monto } = montoOf(p, 'gasto');
    const svcIdRaw = p['Servicio']?.relation?.[0]?.id || '';
    const svcId = svcIdRaw ? norm(svcIdRaw) : '';
    const meta = svcId ? svcMeta[svcId] : null;

    if (svcId) addMoney(ensureServicio(svcId).gas, esUY, monto);
    else addMoney(sinVincServicio.gas, esUY, monto);

    const clienteId = (meta && meta.clienteId) || '';
    if (clienteId) addMoney(ensureCliente(clienteId).gas, esUY, monto);
    else addMoney(sinVincCliente.gas, esUY, monto);

    const paisKey = (meta && meta.paisKey) || FIN_TO_KEY[p['País']?.select?.name || ''] || '';
    addMoney(ensurePais(paisKey || 'sin-pais').gas, esUY, monto);
  });

  // Evolución mensual: reusa `ms` (ya calculado en renderCEOMetricas para el sparkline, mismo filtro
  // kpiIncluido) en vez de re-iterar ingYearData/gasYearData — mismos números, cero fetch extra.
  const meses = Object.keys(ms || {}).sort().map(m => {
    const v = ms[m];
    const o = { mes: m, ing: { uyu: v.iu, usd: v.id }, gas: { uyu: v.gu, usd: v.gd } };
    return withMargen(o);
  }).filter(o => o.ing.uyu || o.ing.usd || o.gas.uyu || o.gas.usd);

  Object.values(byCliente).forEach(withMargen);
  Object.values(byServicio).forEach(withMargen);
  Object.values(byPais).forEach(withMargen);
  withMargen(sinVincCliente); withMargen(sinVincServicio);

  return {
    cliente: Object.entries(byCliente).map(([id, v]) => ({ id, ...v })),
    servicio: Object.entries(byServicio).map(([id, v]) => ({ id, ...v })),
    pais: Object.entries(byPais).map(([key, v]) => ({ key, nombre: COUNTRY_NOTION_MAP[key] || t('ceo.renta.sinpais'), ...v })),
    sinVincCliente, sinVincServicio, meses
  };
}

// Chips de sub-vista (mismo patrón visual que el toggle UY$/USD de Finanzas). Cambiar de vista SOLO
// re-renderiza #ceo-renta-body (no vuelve a llamar renderCEOMetricas ni refetchea nada).
function setCeoRentaView(v) { _ceoRentaView = v; renderCeoRentaBody(); }
function ceoRentaChipsHTML() {
  const views = [['cliente', t('ceo.renta.chip.cliente')], ['servicio', t('ceo.renta.chip.servicio')], ['paismes', t('ceo.renta.chip.paismes')]];
  return '<div style="display:flex;gap:6px;padding:0 16px 10px;flex-wrap:wrap">' +
    views.map(([k, lbl]) => '<button class="ceo-country-tab ' + (_ceoRentaView === k ? 'active' : '') + '" onclick="setCeoRentaView(\'' + k + '\')">' + esc(lbl) + '</button>').join('') +
    '</div>';
}
// Mes 'YYYY-MM' → etiqueta corta localizada ("jul 2026" / "jul de 2026").
function fmtMesRentaLabel(m) {
  const parts = (m || '').split('-').map(Number);
  const d = new Date(parts[0] || 2000, (parts[1] || 1) - 1, 1);
  const loc = currentLang === 'pt-BR' ? 'pt-BR' : 'es-UY';
  return d.toLocaleDateString(loc, { month: 'short', year: 'numeric' });
}
// Fila de una entidad (cliente/servicio/país/mes): una línea por moneda con ingresos/gastos/margen.
// opts.muted → estilo atenuado (usado para las líneas "sin vincular").
function rentaRowHTML(nombre, bucket, opts = {}) {
  const dot = ' <span style="color:var(--text3)">·</span> ';
  const linea = (mon, ing, gas, margen) => {
    if (!ing && !gas) return '';
    const color = margen >= 0 ? 'var(--green)' : 'var(--red)';
    const sgn = margen < 0 ? '−' : '+';
    const pct = ing > 0 ? Math.round(margen / ing * 100) : null;
    const pctTxt = pct != null ? ' (' + (pct >= 0 ? '+' : '') + pct + '%)' : '';
    return '<div style="font-size:11.5px;color:var(--text3);margin-top:1px">↑ ' + fmtMoneda(ing, mon) + dot + '↓ ' + fmtMoneda(gas, mon) +
      dot + '<span style="color:' + color + ';font-weight:700">= ' + sgn + fmtMoneda(Math.abs(margen), mon) + pctTxt + '</span></div>';
  };
  const lines = [];
  if (bucket.ing.uyu || bucket.gas.uyu) lines.push(linea('🇺🇾 UY$', bucket.ing.uyu, bucket.gas.uyu, bucket.margen.uyu));
  if (bucket.ing.usd || bucket.gas.usd) lines.push(linea('🇺🇸 USD', bucket.ing.usd, bucket.gas.usd, bucket.margen.usd));
  if (!lines.length) return '';
  return '<div class="ec-row" style="flex-direction:column;align-items:flex-start;gap:0;padding:8px 16px' + (opts.muted ? ';opacity:.7' : '') + '">' +
    '<div style="font-weight:700;font-size:13px' + (opts.muted ? ';color:var(--text3)' : '') + '">' + esc(nombre) + '</div>' +
    lines.join('') + '</div>';
}
// Re-renderiza SOLO el contenedor de Rentabilidad (usa _ceoRentaData ya calculado — sin refetch).
function renderCeoRentaBody() {
  const el = document.getElementById('ceo-renta-body');
  if (!el) return;
  const d = _ceoRentaData;
  if (!d) { el.innerHTML = ceoRentaChipsHTML() + '<div class="coord-empty" style="padding:12px 16px">' + t('ceo.renta.empty') + '</div>'; return; }
  const sortByMargen = (a, b) => (b.margen.uyu - a.margen.uyu) || (b.margen.usd - a.margen.usd);
  let body = '';
  if (_ceoRentaView === 'cliente') {
    const arr = d.cliente.slice().sort(sortByMargen);
    body = arr.map(c => rentaRowHTML(c.nombre, c)).join('') + rentaRowHTML(t('ceo.renta.sinvincular.cliente'), d.sinVincCliente, { muted: true });
  } else if (_ceoRentaView === 'servicio') {
    const arr = d.servicio.slice().sort(sortByMargen);
    body = arr.map(s => rentaRowHTML(s.nombre, s)).join('') + rentaRowHTML(t('ceo.renta.sinvincular.servicio'), d.sinVincServicio, { muted: true });
  } else {
    const arr = d.pais.slice().sort(sortByMargen);
    const paisHTML = arr.map(p => rentaRowHTML(p.nombre, p)).join('');
    const mesesHTML = d.meses.length ? ('<div class="ec-title" style="padding:10px 16px 2px">' + t('ceo.renta.evolucion') + '</div>' + d.meses.map(m => rentaRowHTML(fmtMesRentaLabel(m.mes), m)).join('')) : '';
    body = paisHTML + mesesHTML;
  }
  if (!body.trim()) body = '<div class="coord-empty" style="padding:12px 16px">' + t('ceo.renta.empty') + '</div>';
  el.innerHTML = ceoRentaChipsHTML() + body;
}

// ── CRM comercial v1 (📊, desplegable debajo de "📈 Rentabilidad") ─────────────────────────────────
// Sobre TODAS las propuestas (no solo las abiertas — ver propAllPromise en renderCEOMetricas):
//   1) Embudo por etapa: conteo por 'Estado pipeline', ordenado por el pipeline real (estados
//      desconocidos/legacy van al final — nunca se descartan, solo pierden orden).
//   2) Conversión: % Aceptadas / (Aceptadas + Rechazadas + Sin respuesta) ("de las cerradas") +
//      "N aceptadas de M totales" (M = TODAS las propuestas, no solo las cerradas).
//   3) Valor del pipeline: suma de 'Importe estimado' por estado, SOLO estados abiertos (excluye
//      Aceptada/Rechazada/Sin respuesta), separado por 'Moneda' — UY$ y USD NUNCA se mezclan.
//   4) Tiempo de cierre (aprox): promedio de días entre 'Fecha de envío' y 'Última interacción' para
//      las Aceptadas que tengan ambas fechas (se saltean las que falten alguna).
const PIPELINE_ESTADOS = ['🆕 Nuevo lead', '📞 Contactado', '🔍 Relevamiento', '⏳ En preparación', '✅ Aprobada internamente', '📤 Enviada al cliente', '🤝 Negociando', '✅ Aceptada', '❌ Rechazada', '😶 Sin respuesta', '🔄 Reactivo'];
function computeComercial(allProps) {
  const orderIdx = e => { const i = PIPELINE_ESTADOS.indexOf(e); return i === -1 ? PIPELINE_ESTADOS.length : i; };
  const estadoDeProp = p => p.properties?.['Estado pipeline']?.select?.name || t('ceo.com.sinestado');
  const isAceptada  = est => est.includes('Aceptada');
  const isRechazada = est => est.includes('Rechazada');
  const isSinResp   = est => est.includes('Sin respuesta');

  const estCount = {};
  (allProps || []).forEach(p => { const est = estadoDeProp(p); estCount[est] = (estCount[est] || 0) + 1; });
  const embudo = Object.entries(estCount).sort((a, b) => orderIdx(a[0]) - orderIdx(b[0]));

  const total = (allProps || []).length;
  let nAcept = 0, nCerradas = 0;
  (allProps || []).forEach(p => {
    const est = estadoDeProp(p);
    if (isAceptada(est)) { nAcept++; nCerradas++; }
    else if (isRechazada(est) || isSinResp(est)) nCerradas++;
  });
  const conv = nCerradas > 0 ? Math.round(nAcept / nCerradas * 100) : null;

  const valueByEstado = {};
  (allProps || []).forEach(p => {
    const est = estadoDeProp(p);
    if (isAceptada(est) || isRechazada(est) || isSinResp(est)) return; // solo estados abiertos
    const importe = p.properties?.['Importe estimado']?.number;
    if (!importe) return;
    const moneda = p.properties?.['Moneda']?.select?.name || '🇺🇸 USD';
    const esUY = moneda === '🇺🇾 UY$';
    const b = (valueByEstado[est] = valueByEstado[est] || { uyu: 0, usd: 0 });
    if (esUY) b.uyu += importe; else b.usd += importe;
  });
  const valueEntries = Object.entries(valueByEstado).sort((a, b) => orderIdx(a[0]) - orderIdx(b[0]));

  const diffs = [];
  (allProps || []).forEach(p => {
    if (!isAceptada(estadoDeProp(p))) return;
    const fe = (p.properties?.['Fecha de envío']?.date?.start || '').split('T')[0];
    const ui = (p.properties?.['Última interacción']?.date?.start || '').split('T')[0];
    if (!fe || !ui) return;
    const days = Math.round((new Date(ui + 'T00:00:00') - new Date(fe + 'T00:00:00')) / 86400000);
    // days<0 = fechas cargadas al revés (mala carga): se excluye para no ensuciar el promedio.
    if (!isNaN(days) && days >= 0) diffs.push(days);
  });
  const avgDays = diffs.length ? Math.round(diffs.reduce((a, b) => a + b, 0) / diffs.length) : null;

  return { embudo, total, nAcept, conv, valueEntries, avgDays };
}

// Sub-bloque 🎯 Prospección (spec 2026-07-02 B2): SOLO conteos por estado + "nuevos esta semana"
// best-effort (created_time no siempre disponible — degrada mostrando solo los conteos, nunca rompe).
function computeProspeccionMetrics(clientes) {
  const estadoDe = c => c.properties?.['Estado']?.select?.name || '';
  const porEstado = {};
  PROSPECCION_ESTADOS.forEach(e => { porEstado[e] = 0; });
  (clientes || []).forEach(c => { const e = estadoDe(c); if (PROSPECCION_ESTADOS.includes(e)) porEstado[e]++; });
  const total = (clientes || []).length;
  // "Nuevos esta semana": requiere created_time (el path Notion lo trae; un espejo/mirror podría no
  // traerlo) — si ningún registro lo tiene, degradamos a null y el render omite esa línea.
  const haceUnaSemana = Date.now() - 7 * 86400000;
  const conCreatedTime = (clientes || []).filter(c => !!c.created_time);
  const nuevosSemana = conCreatedTime.length
    ? conCreatedTime.filter(c => new Date(c.created_time).getTime() >= haceUnaSemana).length
    : null;
  return { porEstado, total, nuevosSemana };
}

// HTML del sub-bloque Prospección — independiente del resto de Comercial (se pinta aunque
// _ceoComData sea null, y viceversa: guardado en ambos sentidos, spec "nunca rompe").
function prospeccionSubBlockHTML() {
  const pd = _ceoProspData;
  if (!pd) return '';
  const filas = PROSPECCION_ESTADOS.map(e => '<div class="ec-row"><span>' + esc(e) + '</span><span>' + (pd.porEstado[e] || 0) + '</span></div>').join('');
  const nuevosHTML = pd.nuevosSemana != null ? '<div class="kpi-sub" style="padding-top:4px">' + pd.nuevosSemana + ' ' + t('ceo.com.prosp.nuevos') + '</div>' : '';
  return '<div class="ec-title" style="padding:14px 16px 2px">' + t('ceo.com.prosp.title') + '</div><div style="padding:0 16px 8px">' + filas + nuevosHTML + '</div>';
}

// Re-renderiza SOLO el contenedor de Comercial (usa _ceoComData/_ceoProspData ya calculados — sin refetch).
function renderCeoComBody() {
  const el = document.getElementById('ceo-com-body');
  if (!el) return;
  const d = _ceoComData;
  let html;
  if (!d) {
    html = '<div class="coord-empty" style="padding:12px 16px">' + t('ceo.com.empty') + '</div>';
  } else {
    const maxEmbudo = Math.max(1, ...d.embudo.map(([, v]) => v));
    const embudoHTML = d.embudo.length
      ? d.embudo.map(([k, v]) => '<div class="tipo-row"><span class="tipo-name">' + esc(k) + '</span><span class="tipo-bar"><span style="width:' + Math.round(v / maxEmbudo * 100) + '%"></span></span><span class="tipo-val">' + v + '</span></div>').join('')
      : '<div class="kpi-sub" style="padding:8px 16px">' + t('ceo.com.embudo.empty') + '</div>';

    const convHTML = d.conv != null
      ? '<div class="ec-row"><span>' + d.conv + '% ' + t('ceo.com.conversion.label') + '</span></div><div class="kpi-sub">' + t('ceo.com.conversion.sub').replace('{n}', d.nAcept).replace('{t}', d.total) + '</div>'
      : '<div class="kpi-sub">—</div>';

    const pipelineHTML = d.valueEntries.length
      ? d.valueEntries.map(([k, v]) => '<div class="ec-row"><span>' + esc(k) + '</span><span>' + fmtTotalSplit(v) + '</span></div>').join('')
      : '<div class="kpi-sub" style="padding:8px 0">' + t('ceo.com.pipeline.empty') + '</div>';

    const cierreHTML = d.avgDays != null
      ? '<div class="ec-row"><span>' + t('ceo.com.cierre.label') + '</span><span>' + d.avgDays + ' ' + t('ceo.com.cierre.dias') + '</span></div>'
      : '<div class="kpi-sub">—</div>';

    html =
      '<div class="ec-title" style="padding:10px 16px 2px">' + t('ceo.com.embudo.title') + '</div>' + embudoHTML +
      '<div class="ec-title" style="padding:14px 16px 2px">' + t('ceo.com.conversion.title') + '</div><div style="padding:0 16px 8px">' + convHTML + '</div>' +
      '<div class="ec-title" style="padding:6px 16px 2px">' + t('ceo.com.pipeline.title') + '</div><div style="padding:0 16px 8px">' + pipelineHTML + '</div>' +
      '<div class="ec-title" style="padding:6px 16px 2px">' + t('ceo.com.cierre.title') + '</div><div style="padding:0 16px 10px">' + cierreHTML + '</div>';
  }
  // Sub-bloque Prospección al final (spec): independiente de si Comercial arriba tuvo datos o no.
  el.innerHTML = html + prospeccionSubBlockHTML();
}

async function renderCEOServicios() {
  const content = document.getElementById('ceo-content');
  content.innerHTML = '<div style="text-align:center;padding:40px 0"><div class="spinner" style="margin:0 auto"></div></div>';
  try {
    const cf = getCEOFilter();
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const dateFilter = { property: 'Fecha programada', date: { on_or_after: monthStart } };
    const data = await callNotion(`databases/${DB_ID}/query`, 'POST', {
      filter: cf ? { and: [cf, dateFilter] } : dateFilter,
      sorts: [{ property: 'Fecha programada', direction: 'descending' }]
    });
    let results = data.results || [];
    if (cf) {
      const notionVal = COUNTRY_NOTION_MAP[ceoViewCountry];
      results = results.filter(s => s.properties?.['País']?.select?.name === notionVal);
    }
    results = results.filter(s => !esArchivado(s));
    if (!results.length) { content.innerHTML = `<div class="coord-empty">${t('ceo.empty.servicios')}</div>`; return; }
    const ESTADO_CLASS = { '✅ Completado': 'estado-completado', '✈️ En curso': 'estado-en-curso', '🔄 Asignado': 'estado-asignado' };
    const paiFlag = { '🇺🇾 Uruguay': '🇺🇾', '🇧🇷 Brasil': '🇧🇷', '🇵🇦 Panamá': '🇵🇦', '🇬🇹 Guatemala': '🇬🇹', '🇲🇽 México': '🇲🇽' };
    const dateLocaleCeo = currentLang === 'pt-BR' ? 'pt-BR' : 'es-UY';
    _ceoServiciosCache = results;
    await ensureClienteNombres(); // el CEO ve 'all' → el mapa resuelve el cliente de cualquier país
    if (activeCEOTab !== 'servicios') return; // cambió de tab mientras cargaba → NO pisar
    content.innerHTML = `<div class="ceo-section-title">${t('ceo.servicios.title')}</div>` + results.map(s => {
      const props = s.properties || {};
      const nombre = props['Nombre del servicio']?.title?.[0]?.plain_text || t('common.sinnombre');
      const estado = props['Estado']?.select?.name || '';
      const tipo = tipoServicioStr(props);
      const fecha = props['Fecha programada']?.date?.start || '';
      const pais = props['País']?.select?.name || '';
      const operario = props['Operario App']?.select?.name || (props['Operario(s)']?.people?.[0]?.name || '');
      const fechaFmt = fecha ? new Date(fecha + 'T00:00:00').toLocaleDateString(dateLocaleCeo, { day:'numeric', month:'short' }) : '';
      const _contactoId = props['Contacto']?.relation?.[0]?.id || props['Contactos']?.relation?.[0]?.id || '';
      const _cliN = clienteNombreDe(_contactoId);
      const cliLine = _contactoId
        ? (_cliN ? `<div style="font-size:12px;color:var(--text2);margin-top:2px">🏢 ${esc(_cliN)}</div>` : '')
        : `<div style="font-size:12px;color:var(--amber,#f59e0b);margin-top:2px">${t('svc.cliente.placeholder')}</div>`;
      return `<div class="ceo-service-card">
        <div class="ceo-service-name">${esc(nombre)} ${paiFlag[pais] || ''}</div>
        ${cliLine}
        <div class="ceo-service-meta">
          <span class="service-estado ${ESTADO_CLASS[estado] || 'estado-pendiente'}">${estado}</span>
          ${jobCompleto(s, _ceoServiciosCache) ? `<span class="coord-tag" style="background:var(--green-dark,#14532d);color:var(--green,#22c55e)">${t('badge.servicio.completo')}</span>` : ''}
          ${tipo ? `<span class="coord-tag">${tipo}</span>` : ''}
          ${fechaFmt ? `<span class="coord-tag">📅 ${fechaFmt}</span>` : ''}
          ${operario ? `<span class="coord-tag">👤 ${operario}</span>` : ''}
        </div>
        ${estado.includes('Completado') ? `<button class="report-pdf-btn" style="margin:8px 0 0;width:auto;padding:8px 14px;font-size:12px" onclick="generateReportPDFFromCEO('${s.id}')">📄 ${t('pdf.btn.servicio')}</button>` : ''}
      </div>`;
    }).join('');
  } catch (e) {
    content.innerHTML = `<div class="coord-empty">${t('ceo.error.servicios')}<br><small>${esc(e.message)}</small></div>`;
  }
}

// Rango de fechas según el selector de período del CEO (mes / semana / año / rango / todo).
function getCEOPeriodRange() {
  const now = new Date();
  const loc = currentLang === 'pt-BR' ? 'pt-BR' : 'es-UY';
  const iso = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const p = ceoPeriod;
  if (p.mode === 'semana') {
    const b = new Date(now); b.setHours(0, 0, 0, 0); b.setDate(b.getDate() + p.off * 7);
    const dow = (b.getDay() + 6) % 7; // lunes = 0
    const mon = new Date(b); mon.setDate(b.getDate() - dow);
    const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
    return { start: iso(mon), end: iso(sun), label: mon.toLocaleDateString(loc, { day: '2-digit', month: 'short' }) + ' – ' + sun.toLocaleDateString(loc, { day: '2-digit', month: 'short' }) };
  }
  if (p.mode === 'anio') {
    const y = now.getFullYear() + p.off;
    return { start: y + '-01-01', end: y + '-12-31', label: 'Año ' + y };
  }
  if (p.mode === 'rango') {
    return { start: p.from || '2000-01-01', end: p.to || '2999-12-31', label: (p.from || '…') + ' → ' + (p.to || '…') };
  }
  if (p.mode === 'todo') {
    return { start: '2000-01-01', end: '2999-12-31', label: 'Todo el historial' };
  }
  const base = new Date(now.getFullYear(), now.getMonth() + p.off, 1);
  return { start: iso(base), end: iso(new Date(base.getFullYear(), base.getMonth() + 1, 0)), label: base.toLocaleDateString(loc, { month: 'long', year: 'numeric' }) };
}

// Selector de período reutilizado por Métricas y Finanzas (estado compartido `ceoPeriod`).
function renderCEOPeriodSelector() {
  const p = ceoPeriod;
  const { label } = getCEOPeriodRange();
  const modes = [['mes', 'Mes'], ['semana', 'Semana'], ['anio', 'Año'], ['rango', 'Rango'], ['todo', 'Todo']];
  const chips = modes.map(([m, lbl]) => '<button class="period-chip ' + (p.mode === m ? 'active' : '') + '" onclick="setCEOPeriodMode(\'' + m + '\')">' + lbl + '</button>').join('');
  let nav;
  if (p.mode === 'rango') {
    nav = '<div class="period-range"><input type="date" class="coord-filter-date-input" value="' + (p.from || '') + '" onchange="setCEORange(this.value, ceoPeriod.to)"/><span style="color:var(--text3);font-size:12px">→</span><input type="date" class="coord-filter-date-input" value="' + (p.to || '') + '" onchange="setCEORange(ceoPeriod.from, this.value)"/></div>';
  } else if (p.mode === 'todo') {
    nav = '<div class="finance-month-nav" style="justify-content:center"><div class="finance-month-label">' + label + '</div></div>';
  } else {
    nav = '<div class="finance-month-nav"><button class="month-nav-btn" onclick="shiftCEOPeriod(-1)">‹</button><div class="finance-month-label">' + label + '</div><button class="month-nav-btn" onclick="shiftCEOPeriod(1)">›</button></div>';
  }
  return '<div class="period-selector"><div class="period-chips">' + chips + '</div>' + nav + '</div>';
}
function setCEOPeriodMode(m) { ceoPeriod.mode = m; if (m !== 'rango' && m !== 'todo') ceoPeriod.off = 0; rerenderCEOActive(); }
function shiftCEOPeriod(d) { ceoPeriod.off += d; rerenderCEOActive(); }
function setCEORange(from, to) { ceoPeriod.from = from || ''; ceoPeriod.to = to || ''; rerenderCEOActive(); }
function rerenderCEOActive() { return (_ceoRerender || renderCEOMetricas)(); }

// ── Rediseño "Cuenta del negocio": frescura de datos + refrescar + header + sparkline + acordeón ──
let _ceoDataTime = 0;
function ceoFreshHTML() {
  if (!_ceoDataTime) return '';
  const mins = Math.floor((Date.now() - _ceoDataTime) / 60000);
  const txt = mins < 1 ? 'recién' : 'hace ' + mins + ' min';
  const col = mins < 5 ? 'var(--green)' : (mins < 30 ? 'var(--text3)' : '#F5A623');
  return '<span class="ceo-fresh" style="color:' + col + '">● ' + txt + '</span>';
}
async function refreshCEO(btn) {
  if (btn) btn.classList.add('ceo-spin');
  // Borrar la(s) caché(s) de lecturas de Notion (la activa es flyclean-notion-cache-v4; NO hardcodear
  // la versión → borrar todas las que empiecen con ese prefijo) para forzar datos frescos al refrescar.
  try {
    if (window.caches) {
      const _ks = await caches.keys();
      await Promise.all(_ks.filter(k => k.startsWith('flyclean-notion-cache')).map(k => caches.delete(k)));
    }
  } catch (_) {}
  _ceoServiciosAll = null;
  await rerenderCEOActive();
}
// Header común: título + país (dropdown, no 6 chips) + frescura + botón refrescar.
function ceoHeaderHTML(titulo) {
  const isU = (currentUser?.role === '👔 CEO' && currentUser?.country === 'Uruguay') || (currentUser?.role || '').includes('Dirección');
  const opts = [['all', '🌎 Global'], ['Uruguay', '🇺🇾 UY'], ['Brasil', '🇧🇷 BR'], ['Panamá', '🇵🇦 PA'], ['Guatemala', '🇬🇹 GT'], ['México', '🇲🇽 MX']];
  const pais = isU ? '<select class="ceo-pais-select" onchange="setCEOCountry(this.value)">' + opts.map(([v, l]) => '<option value="' + v + '"' + (ceoViewCountry === v ? ' selected' : '') + '>' + l + '</option>').join('') + '</select>' : '';
  return '<div class="ceo-header"><div class="ceo-header-title">' + titulo + '</div><div class="ceo-header-right">' + pais + ceoFreshHTML() + '<button class="ceo-refresh-btn" onclick="refreshCEO(this)" aria-label="Actualizar">↻</button></div></div>';
}
// Mini-gráfico de tendencia (línea) — solo la FORMA, sin números.
function buildSparkline(values) {
  const vals = (values || []).filter(v => typeof v === 'number' && isFinite(v));
  if (vals.length < 2) return '';
  const W = 200, H = 32, P = 3;
  const min = Math.min(...vals, 0), max = Math.max(...vals, 0), rng = (max - min) || 1;
  const pts = vals.map((v, i) => { const x = P + i * ((W - 2 * P) / (vals.length - 1)); const y = H - P - ((v - min) / rng) * (H - 2 * P); return x.toFixed(0) + ',' + y.toFixed(0); }).join(' ');
  const col = vals[vals.length - 1] >= 0 ? '#00C98D' : '#FF5C5C';
  return '<svg viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" style="width:100%;height:32px;display:block"><polyline points="' + pts + '" fill="none" stroke="' + col + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
}
// Acordeón genérico (header + detalle oculto, mismo patrón que toggleFinGroup).
function toggleCeoAcc(btn) {
  const d = btn.nextElementSibling; if (!d) return;
  const open = d.style.display === 'none';
  d.style.display = open ? 'block' : 'none';
  const a = btn.querySelector('.fin-arrow'); if (a) a.textContent = open ? '▴' : '▾';
}

function buildFinanceChart(ingByMonth, gasByMonth, year, activeMonth) {
  const months = Array.from({length:12}, (_, i) => year + '-' + String(i+1).padStart(2,'0'));
  const ingVals = months.map(m => ingByMonth[m] || 0);
  const gasVals = months.map(m => gasByMonth[m] || 0);
  const maxVal  = Math.max(...ingVals, ...gasVals, 1);
  const W=360, H=150, PL=36, PR=8, PT=10, PB=28;
  const cW = W-PL-PR, cH = H-PT-PB;
  const colW = cW/12, bW = colW*0.33;
  const MN = (currentLang === 'pt-BR') ? ['J','F','M','A','M','J','J','A','S','O','N','D'] : ['E','F','M','A','M','J','J','A','S','O','N','D'];
  const fmtY = v => v >= 1000 ? (v/1000).toFixed(0)+'k' : v.toFixed(0);

  let s = '<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" style="width:100%;display:block;padding:0 0 4px">';

  const GRID = '#ddeae4';      // border color
  const LABEL = '#456b5e';     // text2 color
  const LABEL_DIM = '#8aada3'; // text3 color
  const ACTIVE_BG = '#00C98D'; // brand green

  // Grid lines + Y labels
  for (let i = 0; i <= 4; i++) {
    const y = PT + cH*(1 - i/4);
    s += '<line x1="' + PL + '" y1="' + y + '" x2="' + (W-PR) + '" y2="' + y + '" stroke="' + GRID + '" stroke-width="1"/>';
    if (i > 0) s += '<text x="' + (PL-3) + '" y="' + (y+3) + '" text-anchor="end" font-size="7.5" fill="' + LABEL_DIM + '" font-family="Exo 2,sans-serif">' + fmtY(maxVal*i/4) + '</text>';
  }

  // Bars
  months.forEach((m, i) => {
    const x  = PL + i*colW;
    const iH = (ingVals[i]/maxVal)*cH;
    const gH = (gasVals[i]/maxVal)*cH;
    const isActive = m === activeMonth;
    if (isActive) s += '<rect x="' + (x+1) + '" y="' + PT + '" width="' + (colW-2) + '" height="' + cH + '" fill="' + ACTIVE_BG + '" fill-opacity="0.12" rx="2"/>';
    // income bar
    if (iH > 0) s += '<rect x="' + (x+colW/2-bW-1) + '" y="' + (PT+cH-iH) + '" width="' + bW + '" height="' + iH + '" fill="#00C98D" rx="2" fill-opacity="' + (isActive?'1':'0.75') + '"/>';
    // expense bar
    if (gH > 0) s += '<rect x="' + (x+colW/2+1) + '" y="' + (PT+cH-gH) + '" width="' + bW + '" height="' + gH + '" fill="#dc2626" rx="2" fill-opacity="' + (isActive?'1':'0.75') + '"/>';
    // month label
    s += '<text x="' + (x+colW/2) + '" y="' + (H-PB+11) + '" text-anchor="middle" font-size="7.5" fill="' + (isActive ? '#00C98D' : LABEL) + '" font-weight="' + (isActive?'700':'400') + '" font-family="Exo 2,sans-serif">' + MN[i] + '</text>';
  });

  // Legend
  s += '<rect x="' + PL + '" y="' + (H-PB+16) + '" width="7" height="7" fill="#00C98D" rx="1"/>';
  s += '<text x="' + (PL+9) + '" y="' + (H-PB+22) + '" font-size="7.5" fill="' + LABEL + '" font-family="Exo 2,sans-serif">' + t('chart.ingresos') + '</text>';
  s += '<rect x="' + (PL+55) + '" y="' + (H-PB+16) + '" width="7" height="7" fill="#dc2626" rx="1"/>';
  s += '<text x="' + (PL+64) + '" y="' + (H-PB+22) + '" font-size="7.5" fill="' + LABEL + '" font-family="Exo 2,sans-serif">' + t('chart.gastos') + '</text>';
  s += '<text x="' + (W-PR) + '" y="' + (H-PB+22) + '" text-anchor="end" font-size="7.5" fill="' + LABEL_DIM + '" font-family="Exo 2,sans-serif">' + year + '</text>';

  s += '</svg>';
  return s;
}

// Quick-view del servicio vinculado a un gasto/ingreso (desde el estado de cuenta).
async function openServicioQuickView(id) {
  let ov = document.getElementById('svc-qv-overlay');
  if (!ov) {
    ov = document.createElement('div');
    ov.id = 'svc-qv-overlay';
    ov.className = 'svc-qv-overlay';
    ov.addEventListener('click', (e) => { if (e.target === ov) ov.classList.remove('active'); });
    document.body.appendChild(ov);
  }
  const close = '<button class="svc-qv-x" onclick="document.getElementById(\'svc-qv-overlay\').classList.remove(\'active\')">✕</button>';
  ov.innerHTML = '<div class="svc-qv-card"><div style="text-align:center;padding:34px"><div class="spinner" style="margin:0 auto"></div></div></div>';
  ov.classList.add('active');
  try {
    const data = await callNotion('pages/' + id, 'GET');
    const p = data.properties || {};
    const g = (k) => (p[k]?.title?.[0]?.plain_text) || (p[k]?.rich_text?.[0]?.plain_text) || (p[k]?.select?.name) || (p[k]?.date?.start) || '';
    const nombre = g('Nombre del servicio') || '(servicio)';
    const rows = [['Estado', g('Estado')], ['Tipo', tipoServicioStr(p) || g('Tipo de servicio')], ['Fecha', (g('Fecha programada') || '').slice(0, 10)], ['Lugar', g('Lugar')], ['Operario', g('Operario App')]].filter(x => x[1]);
    ov.innerHTML = '<div class="svc-qv-card"><div class="svc-qv-head"><span>' + esc(nombre) + '</span>' + close + '</div>' +
      (rows.map(x => '<div class="svc-qv-row"><span class="svc-qv-k">' + x[0] + '</span><span class="svc-qv-v">' + esc(x[1]) + '</span></div>').join('') || '<div class="svc-qv-row">— sin datos —</div>') + '</div>';
  } catch (e) {
    ov.innerHTML = '<div class="svc-qv-card"><div class="svc-qv-head"><span>Servicio</span>' + close + '</div><div class="svc-qv-row" style="color:var(--text3)">No se pudo cargar el servicio.</div></div>';
  }
}

async function renderCEOFinanzas() {
  const content = document.getElementById(_ceoContentId);
  content.innerHTML = '<div style="text-align:center;padding:40px 0"><div class="spinner" style="margin:0 auto"></div></div>';
  try {
    const fcf = getCEOFinanceFilter();
    const { start, end, label: periodLabelF } = getCEOPeriodRange();
    const now = new Date();
    const yearStart = now.getFullYear() + '-01-01';
    const yearEnd   = now.getFullYear() + '-12-31';
    const mkFilter  = (s, e, extra) => ({ and: [ ...(extra ? [extra] : []), { property: 'Fecha', date: { on_or_after: s } }, { property: 'Fecha', date: { on_or_before: e } } ] });

    // PAGINADO (año/rango pueden tener >100 filas → si no, los totales quedan cortos).
    // finIng/finGas = financiamiento de TODO el tiempo (deuda acumulada, no solo el período).
    const finF = { property: 'Financiamiento', select: { is_not_empty: true } };
    const [ingData, gasData, ingYear, gasYear, finIng, finGas] = await Promise.all([
      callNotionAll(`databases/${INGRESOS_DB_ID}/query`, { filter: mkFilter(start, end, fcf) }),
      callNotionAll(`databases/${GASTOS_DB_ID}/query`, { filter: mkFilter(start, end, fcf) }),
      callNotionAll(`databases/${INGRESOS_DB_ID}/query`, { filter: mkFilter(yearStart, yearEnd, fcf) }),
      callNotionAll(`databases/${GASTOS_DB_ID}/query`, { filter: mkFilter(yearStart, yearEnd, fcf) }),
      callNotionAll(`databases/${INGRESOS_DB_ID}/query`, { filter: finF }),
      callNotionAll(`databases/${GASTOS_DB_ID}/query`, { filter: finF })
    ]);
    _ceoDataTime = Date.now();

    const cur = ceoFinCurrency;                       // 'uyu' | 'usd'
    const monedaTag = cur === 'uyu' ? '🇺🇾 UY$' : '🇺🇸 USD';
    // Devuelve el monto del registro SOLO si su moneda coincide con la seleccionada (si no, 0).
    const amt = (r, kind) => { if (!kpiIncluido(r)) return 0; const { esUY, monto } = montoOf(r.properties || {}, kind); return ((cur === 'uyu') === esUY) ? monto : 0; };
    const fmt = n => fmtMoneda(n, monedaTag);
    const fechaCorta = (iso) => { if (!iso) return ''; const pp = iso.slice(0,10).split('-'); return pp[2] + '/' + pp[1]; };

    // Chart anual (siempre el año, moneda seleccionada)
    const ingByMonth = {}, gasByMonth = {};
    (ingYear.results || []).forEach(r => { const m = (r.properties?.['Fecha']?.date?.start || '').substring(0,7); if (m) ingByMonth[m] = (ingByMonth[m]||0) + amt(r,'ingreso'); });
    (gasYear.results || []).forEach(r => { const m = (r.properties?.['Fecha']?.date?.start || '').substring(0,7); if (m) gasByMonth[m] = (gasByMonth[m]||0) + amt(r,'gasto'); });

    // Totales del período (moneda seleccionada). amt() ya excluye financiamiento y "Excluir de KPIs"
    // → balance = RESULTADO OPERATIVO (negocio puro: ingresos de clientes − gastos reales).
    const ingresos = (ingData.results||[]).reduce((s,r) => s + amt(r,'ingreso'), 0);
    const gastos   = (gasData.results||[]).reduce((s,r) => s + amt(r,'gasto'), 0);
    const balance  = ingresos - gastos;

    // FINANCIAMIENTO (préstamos de socios, ej. Neidat): NO entra en el resultado operativo.
    // Monto del registro en la moneda activa SOLO si está marcado Financiamiento.
    const finAmt = (r, kind) => { if (!esFinanciamiento(r)) return 0; const { esUY, monto } = montoOf(r.properties || {}, kind); return ((cur === 'uyu') === esUY) ? monto : 0; };
    const finRecTot = (finIng.results||[]).reduce((s,r) => s + finAmt(r,'ingreso'), 0);  // recibido (todo el tiempo)
    const finDevTot = (finGas.results||[]).reduce((s,r) => s + finAmt(r,'gasto'), 0);     // devuelto (todo el tiempo)
    const deuda     = finRecTot - finDevTot;                                              // deuda acumulada
    const finRecPer = (ingData.results||[]).reduce((s,r) => s + finAmt(r,'ingreso'), 0);  // recibido en el período
    const finDevPer = (gasData.results||[]).reduce((s,r) => s + finAmt(r,'gasto'), 0);    // devuelto en el período
    const caja      = balance + finRecPer - finDevPer;                                    // flujo de caja del período

    // CAMBIOS DE MONEDA + internos (Tipo interno): NO son gasto/ingreso → se listan aparte para que
    // SIEMPRE se vean como lo que son (la misma plata cambiada de moneda), no como gasto/ganancia.
    const internos = [];
    (gasData.results || []).forEach(r => { if (tipoInterno(r)) internos.push({ r, kind: 'gasto' }); });
    (ingData.results || []).forEach(r => { if (tipoInterno(r)) internos.push({ r, kind: 'ingreso' }); });
    internos.sort((a, b) => (a.r.properties?.['Fecha']?.date?.start || '').localeCompare(b.r.properties?.['Fecha']?.date?.start || ''));
    const internosHTML = internos.length ?
      '<div class="estado-cuenta" style="margin-top:10px">' +
        '<div class="ec-title">💱 CAMBIOS DE MONEDA E INTERNOS · ' + periodLabelF + '</div>' +
        internos.map(({ r, kind }) => {
          const ti = tipoInterno(r);
          const m = montoOf(r.properties || {}, kind);
          const fch = (r.properties?.['Fecha']?.date?.start || '').slice(0, 10);
          return '<div class="ec-row"><span>' + esc(ti) + ' <span style="color:var(--text3);font-size:11px">' + fch + '</span></span><span style="white-space:nowrap">' + (kind === 'gasto' ? '−' : '+') + fmtMoneda(m.monto, m.esUY ? '🇺🇾 UY$' : '🇺🇸 USD') + '</span></div>';
        }).join('') +
        '<div class="ec-counts">No es gasto ni ganancia: es la misma plata cambiada de moneda (o movida entre cuentas propias).</div>' +
      '</div>' : '';

    // Agrupar CON items para cards desplegables (solo registros en la moneda activa).
    const groupBy = (results, kind, keyFn) => { const g = {}; (results||[]).forEach(r => { const a = amt(r, kind); if (!a) return; const k = keyFn(r) || 'Otros'; (g[k] = g[k] || { total: 0, items: [] }); g[k].total += a; g[k].items.push(r); }); return g; };
    const gasGroups = groupBy(gasData.results, 'gasto', r => r.properties?.['Categoría']?.select?.name);
    const ingGroups = groupBy(ingData.results, 'ingreso', r => r.properties?.['Tipo']?.select?.name);

    const itemHTML = (r, kind, color) => {
      const p = r.properties || {};
      let titulo, subParts, svcId;
      if (kind === 'gasto') {
        titulo = p['Concepto']?.title?.[0]?.plain_text || '(sin concepto)';
        const prov = p['Tienda / Proveedor']?.rich_text?.[0]?.plain_text || '';
        const fp = p['Forma de pago']?.select?.name || '';
        svcId = p['Servicio']?.relation?.[0]?.id || '';
        subParts = [fechaCorta(p['Fecha']?.date?.start), prov, fp];
      } else {
        titulo = p['Servicio']?.title?.[0]?.plain_text || p['Cliente']?.rich_text?.[0]?.plain_text || '(cobro)';
        const cli = p['Cliente']?.rich_text?.[0]?.plain_text || '';
        svcId = p['Servicio vinculado']?.relation?.[0]?.id || '';
        subParts = [fechaCorta(p['Fecha']?.date?.start), cli];
      }
      const sub = subParts.filter(Boolean).join(' · ');
      const svcBtn = svcId ? '<button class="fin-svc-link" onclick="event.stopPropagation();openServicioQuickView(\'' + esc(svcId) + '\')">🔗 ver servicio</button>' : '';
      const subHTML = (sub || svcBtn) ? '<div class="fin-detail-sub">' + esc(sub) + (svcBtn ? (sub ? ' · ' : '') + svcBtn : '') + '</div>' : '';
      return '<div class="fin-detail-row"><div class="fin-detail-main"><div class="fin-detail-title">' + esc(titulo) + '</div>' + subHTML + '</div><div class="fin-detail-amt" style="color:' + color + '">' + fmt(amt(r, kind)) + '</div></div>';
    };
    const renderGroups = (groups, kind, color, emptyMsg) => {
      const entries = Object.entries(groups).sort((a, b) => b[1].total - a[1].total);
      if (!entries.length) return '<div class="coord-empty" style="padding:12px 16px;font-size:13px">' + emptyMsg + '</div>';
      return entries.map(([k, g]) => {
        const ordered = g.items.slice().sort((a, b) => (b.properties?.['Fecha']?.date?.start || '').localeCompare(a.properties?.['Fecha']?.date?.start || ''));
        const first = ordered.slice(0, 8).map(r => itemHTML(r, kind, color)).join('');
        const rest = ordered.slice(8);
        const restHTML = rest.length ? '<button class="ver-mas" type="button" onclick="toggleCeoAcc(this)">+ ' + rest.length + ' movimientos más ▾</button><div style="display:none">' + rest.map(r => itemHTML(r, kind, color)).join('') + '</div>' : '';
        return '<div class="fin-group"><button class="fin-group-head" type="button" onclick="toggleFinGroup(this)"><span class="finance-row-label">' + esc(k) + ' <span style="color:var(--text3);font-weight:400">(' + g.items.length + ')</span></span><span class="fin-group-right"><span class="finance-row-value" style="color:' + color + '">' + fmt(g.total) + '</span><span class="fin-arrow">▾</span></span></button><div class="fin-group-detail" style="display:none">' + first + restHTML + '</div></div>';
      }).join('');
    };

    const monedaLabel = cur === 'uyu' ? 'UY$' : 'USD';
    const saldoCol = balance >= 0 ? 'var(--green)' : 'var(--red)';
    content.innerHTML =
      ceoHeaderHTML('Finanzas') +
      '<div style="display:flex;gap:6px;padding:8px 14px 4px">' +
        '<button class="ceo-country-tab ' + (cur === 'uyu' ? 'active' : '') + '" onclick="setCEOFinCurrency(\'uyu\')">🇺🇾 UY$</button>' +
        '<button class="ceo-country-tab ' + (cur === 'usd' ? 'active' : '') + '" onclick="setCEOFinCurrency(\'usd\')">🇺🇸 USD</button>' +
      '</div>' +
      renderCEOPeriodSelector() +
      '<div class="acct">' +
        '<div class="estado-cuenta">' +
          '<div class="ec-title">RESULTADO OPERATIVO · ' + monedaLabel + ' · ' + periodLabelF + '</div>' +
          '<div class="ec-row"><span>Ingresos de clientes</span><span style="color:var(--green)">+ ' + fmt(ingresos) + '</span></div>' +
          '<div class="ec-row"><span>Gastos reales</span><span style="color:var(--red)">− ' + fmt(gastos) + '</span></div>' +
          '<div class="ec-sep"></div>' +
          '<div class="ec-saldo"><span>RESULTADO OPERATIVO</span><span style="color:' + saldoCol + '">' + (balance < 0 ? '−' : '') + fmt(balance) + ' ' + (balance >= 0 ? '🟢' : '🔴') + '</span></div>' +
          '<div class="ec-counts">' + (balance >= 0 ? 'El negocio se sostiene solo' : 'El negocio NO se cubre solo — se financia (ver abajo)') + '</div>' +
        '</div>' +
        // FINANCIAMIENTO (préstamos de socios) — aparte del negocio. Deuda acumulada.
        ((deuda || finRecPer || finDevPer) ?
        '<div class="estado-cuenta" style="margin-top:10px">' +
          '<div class="ec-title">🏦 FINANCIAMIENTO · préstamos de socios (Neidat)</div>' +
          (finRecPer ? '<div class="ec-row"><span>Recibido (período)</span><span>+ ' + fmt(finRecPer) + '</span></div>' : '') +
          (finDevPer ? '<div class="ec-row"><span>Devuelto (período)</span><span>− ' + fmt(finDevPer) + '</span></div>' : '') +
          '<div class="ec-sep"></div>' +
          '<div class="ec-saldo"><span>DEUDA con Neidat</span><span style="color:var(--text)">' + (deuda < 0 ? '−' : '') + fmt(deuda) + '</span></div>' +
          '<div class="ec-counts">No es ingreso ni gasto: es deuda a devolver.</div>' +
        '</div>' : '') +
        // CAJA del período = resultado operativo + financiamiento neto.
        '<div class="estado-cuenta" style="margin-top:10px">' +
          '<div class="ec-saldo"><span>💵 CAJA del período</span><span style="color:' + (caja >= 0 ? 'var(--green)' : 'var(--red)') + '">' + (caja < 0 ? '−' : '') + fmt(caja) + '</span></div>' +
          '<div class="ec-counts">operativo ' + (balance < 0 ? '−' : '+') + fmt(balance) + ' + financiamiento neto del período</div>' +
        '</div>' +
        internosHTML +
        '<button class="ceo-acc-head" onclick="toggleCeoAcc(this)"><span>📊 Ingresos vs Gastos ' + now.getFullYear() + '</span><span class="fin-arrow">▾</span></button>' +
        '<div class="ceo-acc-body" style="display:none;padding:4px 14px">' + buildFinanceChart(ingByMonth, gasByMonth, now.getFullYear(), start.substring(0, 7)) + '</div>' +
        '<div class="ec-section-total"><span>GASTOS POR RUBRO</span><span style="color:var(--red)">− ' + fmt(gastos) + '</span></div>' +
        renderGroups(gasGroups, 'gasto', 'var(--red)', t('ceo.fin.empty.gastos')) +
        '<div class="ec-section-total"><span>INGRESOS POR TIPO</span><span style="color:var(--green)">+ ' + fmt(ingresos) + '</span></div>' +
        renderGroups(ingGroups, 'ingreso', 'var(--green)', t('ceo.fin.empty.ingresos')) +
        // El botón de cargar gasto es tarea de Finanzas, no del CEO (que solo mira).
        (_ceoContentId === 'finanzas-content' ? '<div style="padding:14px"><button class="ceo-nuevo-gasto-btn" style="width:100%" onclick="openNuevoGastoSheet({ defaultClase: \'🔁 Indirecto\' })">+ ' + t('ceo.gasto.add') + '</button></div>' : '') +
      '</div>';
  } catch (e) {
    content.innerHTML = '<div class="coord-empty">' + t('ceo.error.finanzas') + '<br><small>' + esc(e.message) + '</small></div>';
  }
}

// Vista "Por cobrar" (solo lectura): por cada servicio Completado cruza el PRECIO (de la propuesta
// vinculada, Importe estimado) con lo COBRADO (suma de los cobros vinculados) → saldo y % cobrado.
// Cálculo en cliente (join servicios+propuestas+ingresos en memoria) → no toca el esquema de Servicios.
var _porCobrarCtx = null;
var _porCobrarData = null; // dataset indexado del último render (lo usan cubrirServicio/asignarPrecioContrato)
async function renderPorCobrar(containerId, opts = {}) {
  const readonly = !!opts.readonly;        // coordinador = solo ve, no asocia
  _porCobrarCtx = { containerId, opts };
  const content = document.getElementById(containerId);
  if (!content) return;
  content.innerHTML = '<div style="text-align:center;padding:40px 0"><div class="spinner" style="margin:0 auto"></div></div>';
  try {
    const [svc, prop, ing, cli] = await Promise.all([
      callNotionAll(`databases/${DB_ID}/query`, {}),
      callNotionAll(`databases/${PROPUESTAS_DB_ID}/query`, {}),
      callNotionAll(`databases/${INGRESOS_DB_ID}/query`, {}),
      callNotionAll(`databases/${CONTACTOS_DB_ID}/query`, {})
    ]);
    const norm = s => (s || '').replace(/-/g, '');
    const precioBy = {};
    (prop.results || []).forEach(p => { precioBy[norm(p.id)] = { monto: p.properties?.['Importe estimado']?.number || 0, moneda: p.properties?.['Moneda']?.select?.name || '🇺🇸 USD' }; });
    const ingBy = {};
    // Índice FORWARD ingreso→servicio ('Servicio vinculado' del ingreso). ⚠️ NO usar la relación INVERSA
    // 'Ingresos' del servicio: bajo Supabase-first el raw del servicio solo recibe el delta de SUS PATCHes,
    // así que la inversa (que la autogenera Notion) quedó CONGELADA al momento del flip → los cobros
    // asociados después no se contaban y el servicio figuraba impago (bug detectado 15/07). El lado forward
    // lo escribe la app en cada asociación (asociarCobro/saveCobroEdit) → siempre fresco. Mismo patrón que
    // propTieneServicio (regla: derivar SIEMPRE del lado forward, nunca del inverso).
    const ingBySvc = {};
    (ing.results || []).forEach(i => {
      const v = { usd: i.properties?.['Monto USD']?.number || 0, uy: i.properties?.['Monto UY$ cobrado']?.number || 0 };
      ingBy[norm(i.id)] = v;
      const svcId = norm(i.properties?.['Servicio vinculado']?.relation?.[0]?.id || '');
      if (svcId) (ingBySvc[svcId] = ingBySvc[svcId] || []).push({ id: norm(i.id), ...v });
    });
    const clientesById = {};
    (cli.results || []).forEach(c => {
      clientesById[norm(c.id)] = {
        nombre: c.properties?.['Nombre / Empresa']?.title?.[0]?.plain_text || '(cliente)',
        pais: c.properties?.['País']?.select?.name || ''
      };
    });

    // Solo servicios facturables: Completados que NO son Pruebas, Relevamientos ni JORNADAS.
    // Las jornadas son días de trabajo que componen UN servicio (la Orden de trabajo); el servicio se
    // cobra una vez (su precio), NO se cobra cada jornada aparte → contar la Orden, nunca las jornadas.
    // Filtra por Tipo de registro y, por las dudas, también por el nombre (algunos tienen el tipo vacío).
    const comp = (svc.results || []).filter(s => {
      if (!recEnPaisNotion(s)) return false; // aislar Por cobrar por país (socios)
      if ((s.properties?.['Estado']?.select?.name || '') !== '✅ Completado') return false;
      const ti = s.properties?.['Tipo de registro']?.select?.name || '';
      if (ti === '🧪 Prueba' || ti === '🔍 Relevamiento' || ti === '📅 Jornada') return false;
      const nm = s.properties?.['Nombre del servicio']?.title?.[0]?.plain_text || '';
      if (/relevamiento|prueba|jornada/i.test(nm)) return false;
      return kpiIncluido(s); // por las dudas: no contar internos/financiamiento como cobrables
    });
    const rows = comp.map(s => {
      const p = s.properties || {};
      const nombre = p['Nombre del servicio']?.title?.[0]?.plain_text || '(servicio)';
      const clienteId = norm(p['Contacto']?.relation?.[0]?.id || '');
      const propId = p['Propuesta']?.relation?.[0]?.id;
      const pr = propId ? precioBy[norm(propId)] : null;
      const precio = pr ? pr.monto : 0;
      const esUY = !!pr && pr.moneda === '🇺🇾 UY$';        // moneda del PRECIO (default USD)
      let cobUSD = 0, cobUY = 0;
      (ingBySvc[norm(s.id)] || []).forEach(v => { cobUSD += v.usd; cobUY += v.uy; }); // forward (ver ingBySvc)
      const cobrado = esUY ? cobUY : cobUSD;               // cobrado EN LA MONEDA DEL PRECIO (no mezclar)
      const cobradoOtra = esUY ? cobUSD : cobUY;           // lo cobrado en la otra moneda (informativo)
      const saldo = precio - cobrado;
      let estado;
      if (!precio) estado = 'sinprecio';
      else if (cobrado >= precio - 0.5) estado = 'cobrado';
      else if (cobrado > 0) estado = 'parcial';
      else estado = 'acobrar';
      const fecha = p['Fecha programada']?.date?.start || '';
      return { id: s.id, clienteId, nombre, precio, esUY, cobrado, cobradoOtra, saldo,
               pct: precio ? Math.round(cobrado / precio * 100) : 0, estado, fecha };
    });

    // Agrupar visitas facturables por cliente (A-2: vista por cliente/contrato).
    const fU = n => fmtMoneda(n, '🇺🇸 USD');
    const fMon = (n, esUY) => fmtMoneda(n, esUY ? '🇺🇾 UY$' : '🇺🇸 USD');
    const byCli = {};
    rows.forEach(r => { (byCli[r.clienteId || 'sin-cliente'] = byCli[r.clienteId || 'sin-cliente'] || []).push(r); });
    // Propuesta recurrente por cliente (contrato): Tipo === '🔄 Recurrente'.
    const norm2 = s => (s || '').replace(/-/g, '');
    const contratoByCli = {};
    (prop.results || []).forEach(p => {
      if ((p.properties?.['Tipo']?.select?.name || '') !== '🔄 Recurrente') return;
      const cid = norm2(p.properties?.['Contacto']?.relation?.[0]?.id || '');
      if (!cid) return;
      (contratoByCli[cid] = contratoByCli[cid] || []).push(p);
    });
    // Saldo por cliente separado por moneda (NUNCA mezcla pesos con dólares).
    const saldoCli = arr => arr.reduce((a, r) => { if (r.precio && r.saldo > 0) { if (r.esUY) a.uyu += r.saldo; else a.usd += r.saldo; } return a; }, { uyu: 0, usd: 0 });
    const splitStr = tt => [tt.usd ? fU(tt.usd) : '', tt.uyu ? fMon(tt.uyu, true) : ''].filter(Boolean).join(' · ');
    // Orden: clientes con saldo (🔴) primero; dentro, mayor saldo arriba.
    const cliIds = Object.keys(byCli).sort((a, b) => {
      const sa = saldoCli(byCli[a]), sb = saldoCli(byCli[b]);
      const ta = sa.usd + sa.uyu, tb = sb.usd + sb.uyu;
      if ((tb > 0) !== (ta > 0)) return (tb > 0) - (ta > 0);
      return tb - ta;
    });

    // Helper de fila-visita con saldo coloreado (acciones se cablearán en A-3/A-4/A-5).
    const saldoColor = r => r.estado === 'cobrado' ? 'var(--green)' : (r.estado === 'parcial' ? '#E6A700' : 'var(--red)');
    const saldoTxt = r => !r.precio ? 'sin precio' : (r.saldo > 0 ? (r.estado === 'parcial' ? '🟡 falta ' : '🔴 falta ') + fMon(r.saldo, r.esUY) : '✅ cobrado');
    const fmtVisitaFecha = iso => { if (!iso) return ''; const pp = iso.slice(0, 10).split('-'); return pp[2] + '/' + pp[1] + '/' + pp[0].slice(2); };
    const visitaHTML = r =>
      '<div class="ec-row" style="align-items:flex-start;gap:10px">' +
        '<div style="min-width:0">' +
          (r.fecha ? '<div style="font-size:11px;color:var(--text3);margin-bottom:2px">' + fmtVisitaFecha(r.fecha) + '</div>' : '') +
          '<div style="font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(r.nombre) + '</div>' +
          '<div style="font-size:11px;color:var(--text3)">' + (r.precio ? 'Precio ' + fMon(r.precio, r.esUY) + ' · Cobrado ' + fMon(r.cobrado, r.esUY) + (r.cobradoOtra ? ' (+ ' + fMon(r.cobradoOtra, !r.esUY) + ' en otra moneda)' : '') : 'sin precio vinculado') + '</div>' +
          (!readonly && r.id ? '<button type="button" class="fin-svc-link" style="margin-top:4px" onclick="openEditSheetFromFinanzas(\'' + esc(r.id) + '\')">✏️ ' + t('porcobrar.editsvc') + '</button>' : '') +
        '</div>' +
        '<div style="text-align:right;font-weight:700;white-space:nowrap;color:' + saldoColor(r) + '">' + saldoTxt(r) + '<span class="pc-cubre-slot" data-svc="' + esc(r.id) + '"></span></div>' +
      '</div>';

    // Herramienta de asociación: cobros sin vincular a servicio (reusados dentro de cada tarjeta de cliente).
    const sinAsociar = (ing.results || []).filter(i => finRecEnPais(i) && !((i.properties?.['Servicio vinculado']?.relation || []).length) && !((i.properties?.['Servicio']?.relation || []).length) && !esFinanciamiento(i) && !(i.properties?.['Excluir de KPIs']?.checkbox === true));
    // Opciones de servicio para asociar un cobro: los del cliente van primero;
    // si tiene exactamente uno, queda pre-seleccionado (asociar en 1 clic).
    const nrm = x => (x || '').replace(/-/g, '');
    const svcNombre = s => s.properties?.['Nombre del servicio']?.title?.[0]?.plain_text || '?';
    const compSorted = comp.slice().sort((a, b) => svcNombre(a).localeCompare(svcNombre(b)));
    const optsFor = i => {
      const cliId = nrm((i.properties?.['Cuenta']?.relation || [])[0]?.id || '');
      const matches = cliId ? compSorted.filter(s => (s.properties?.['Contacto']?.relation || []).some(r => nrm(r.id) === cliId)) : [];
      const matchIds = new Set(matches.map(s => s.id));
      const rest = compSorted.filter(s => !matchIds.has(s.id));
      const opt = (s, sel) => '<option value="' + s.id + '"' + (sel ? ' selected' : '') + '>' + esc(svcNombre(s)) + '</option>';
      const preSel = matches.length === 1;
      return (preSel ? '' : '<option value="">— elegí servicio —</option>') +
        (matches.length ? matches.map((s, idx) => opt(s, preSel && idx === 0)).join('') + (rest.length ? '<option value="" disabled>────────</option>' : '') : '') +
        rest.map(s => opt(s, false)).join('');
    };
    const ingCli = i => i.properties?.['Cliente']?.rich_text?.[0]?.plain_text || i.properties?.['Servicio']?.title?.[0]?.plain_text || '(cobro)';
    const ingMonto = i => { const u = i.properties?.['Monto USD']?.number, y = i.properties?.['Monto UY$ cobrado']?.number; return u ? fU(u) : (y ? 'UY$ ' + y.toLocaleString('es-UY') : '—'); };

    // Tarjeta por cliente: header (nombre + país + saldo) + contrato + visitas + sin-precio + cobros sin asociar.
    const tarjetaCliente = cid => {
      const arr = byCli[cid];
      const info = clientesById[cid] || { nombre: cid === 'sin-cliente' ? '(sin cliente)' : '(cliente)', pais: '' };
      const sc = saldoCli(arr);
      const saldoHdr = (sc.usd || sc.uyu) ? '<span style="color:var(--red);font-weight:700">' + splitStr(sc) + '</span>' : '<span style="color:var(--green);font-weight:700">al día ✅</span>';
      // Header: tap a ficha cliente (A-3/A-4/A-5: openContactSheet ya existe, slot listo).
      const headTap = cid !== 'sin-cliente' ? ' onclick="openContactSheet(\'' + cid + '\')" style="cursor:pointer"' : '';
      let h = '<div class="estado-cuenta" style="margin-top:10px">' +
        '<div class="ec-saldo"' + headTap + '><span>' + esc(info.nombre) + (info.pais ? ' <span style="font-size:11px;color:var(--text3)">' + esc(info.pais) + '</span>' : '') + '</span>' + saldoHdr + '</div>';
      // Contrato recurrente (si hay).
      const contratos = contratoByCli[cid] || [];
      if (contratos.length) {
        const c0 = contratos[0].properties || {};
        const imp = c0['Importe estimado']?.number || 0;
        const sa = c0['Servicios por año']?.number || 0;
        h += '<div class="ec-row" style="font-size:12px;color:var(--text3)">📑 Contrato: ' + (imp ? fU(imp) + ' / visita' : 'sin importe') + (sa ? ' · ' + sa + '/año' : '') + (contratos.length > 1 ? ' · ' + contratos.length + ' contratos' : '') + '</div>';
      }
      // Visitas con precio — orden cronológico ascendente (más natural para visitas de contrato recurrente).
      const sortFecha = (a, b) => (a.fecha || '9999-12-31').localeCompare(b.fecha || '9999-12-31');
      arr.filter(r => r.precio).slice().sort(sortFecha).forEach(r => { h += visitaHTML(r); });
      // Sin precio → placeholder para A-4 (asignarPrecioContrato).
      const sinPrecio = arr.filter(r => !r.precio);
      if (sinPrecio.length) {
        h += '<div class="ec-section-total"><span>⚠️ SIN PRECIO (' + sinPrecio.length + ')</span><span style="color:var(--text3);font-size:11px">¿del contrato?</span></div>';
        sinPrecio.slice().sort(sortFecha).forEach(r => { h += visitaHTML(r); });
        // Slot A-4: botón asignarPrecioContrato (función a cablear en A-4).
        if (!readonly && contratos.length && cid !== 'sin-cliente') {
          h += '<div style="padding:8px 16px"><button class="fin-svc-link" onclick="asignarPrecioContrato(\'' + cid + '\')">📑 Asignar el precio del contrato a estas ' + sinPrecio.length + ' visita(s)</button></div>';
        }
      }
      // Cobros sin asociar de ESTE cliente: filtrado por Cuenta relation → slot A-3 (asociarCobro ya existe).
      const cobrosCli = (!readonly) ? sinAsociar.filter(i => norm2((i.properties?.['Cuenta']?.relation || [])[0]?.id || '') === cid) : [];
      // C3: servicios con precio de este cliente (candidatos para "✓ cubre").
      const candCubre = arr.filter(r => r.precio);
      if (cobrosCli.length) {
        h += '<div class="ec-section-total"><span>🔗 COBROS SIN ASOCIAR (' + cobrosCli.length + ')</span><span style="color:var(--text3);font-size:11px">asociá a su visita</span></div>';
        cobrosCli.forEach(i => {
          // C3: botón "✓ cubre" solo cuando hay exactamente 1 servicio con precio para este cliente
          // y el cobro tiene monto en la moneda OPUESTA al precio (cruce de monedas detectado).
          let cubreBtn = '';
          if (candCubre.length === 1) {
            const cand = candCubre[0];
            const im = ingBy[norm2(i.id)] || { usd: 0, uy: 0 };
            const tieneEnOtra = cand.esUY ? im.usd > 0 : im.uy > 0;
            if (tieneEnOtra) {
              cubreBtn = '<button class="fin-svc-link" style="white-space:nowrap;margin-left:4px" onclick="cubrirServicio(\'' + esc(i.id) + '\',\'' + esc(cand.id) + '\')">✓ cubre</button>';
            }
          }
          h += '<div class="ec-row" style="flex-direction:column;align-items:stretch;gap:6px;padding:8px 16px">' +
            '<div style="display:flex;justify-content:space-between;gap:8px"><span style="font-weight:600">' + esc(ingCli(i)) + '</span><span style="font-weight:700;white-space:nowrap">' + ingMonto(i) + ' <span style="color:var(--text3);font-weight:400;font-size:11px">' + (i.properties?.['Fecha']?.date?.start || '').slice(0, 10) + '</span></span></div>' +
            // Slot A-3: select #assoc-<ingId> + botón asociarCobro + botón C7 editar + botón C3 ✓ cubre (si aplica).
            '<div style="display:flex;gap:6px"><select id="assoc-' + i.id + '" style="flex:1;min-width:0;padding:6px;border-radius:6px;background:var(--bg);color:var(--text);border:1px solid var(--border);font-size:12px;font-family:inherit">' + optsFor(i) + '</select>' +
            '<button class="fin-svc-link" style="white-space:nowrap" onclick="asociarCobro(\'' + i.id + '\')">Asociar</button>' +
            '<button class="fin-svc-link" style="white-space:nowrap" onclick="openCobroSheet(\'' + esc(i.id) + '\')">✏️</button>' +
            cubreBtn + '</div>' +
          '</div>';
        });
      }
      return h + '</div>';
    };

    // Total general por moneda (suma sólo los saldos positivos).
    const totalPC = rows.reduce((a, r) => { if (r.precio && r.saldo > 0) { if (r.esUY) a.uyu += r.saldo; else a.usd += r.saldo; } return a; }, { uyu: 0, usd: 0 });
    const nCli = cliIds.filter(c => { const s = saldoCli(byCli[c]); return s.usd || s.uyu; }).length;

    _porCobrarData = { svc, prop, ing, clientesById, precioBy, ingBy, ingBySvc, comp, readonly };

    content.innerHTML =
      (opts.headerless ? '' : ceoHeaderHTML('Por cobrar')) +
      '<div class="acct">' +
        '<div class="estado-cuenta">' +
          '<div class="ec-title">💰 TOTAL POR COBRAR</div>' +
          '<div class="ec-saldo"><span>Pendiente de cobro</span><span style="color:var(--red)">' + (splitStr(totalPC) || fU(0)) + '</span></div>' +
          '<div class="ec-counts">' + nCli + ' cliente(s) con saldo · ' + rows.length + ' visitas</div>' +
        '</div>' +
        cliIds.map(tarjetaCliente).join('') +
        '<div style="padding:12px 14px;font-size:11px;color:var(--text3)">El precio sale de la propuesta vinculada; lo cobrado, de los cobros vinculados. Reconciliá monedas o asigná el precio del contrato con un toque.</div>' +
      '</div>';

    // A-5: cablear slots pc-cubre-slot para visitas con cobro asociado en moneda cruzada.
    // Para cada visita que tiene precio + cobradoOtra > 0 (cobro en la otra moneda) y no está fully cobrada
    // en la moneda del precio, buscamos el cobro cruzado y ponemos el botón "✓ cubre" en el slot.
    if (!readonly) {
      const normS = x => (x || '').replace(/-/g, '');
      rows.forEach(r => {
        if (!r.precio || !r.cobradoOtra) return;      // no hay cruce de moneda → sin botón
        if (r.cobrado >= r.precio - 0.5) return;      // ya cobrado en la moneda correcta → sin botón
        const slot = content.querySelector('.pc-cubre-slot[data-svc="' + r.id + '"]');
        if (!slot) return;
        // Encontrar el primer cobro vinculado que tenga monto en la moneda OPUESTA al precio del servicio.
        // Desde el índice FORWARD (ingBySvc): la inversa 'Ingresos' del servicio está congelada bajo el flip.
        const linkedIds = (ingBySvc[normS(r.id)] || []).map(x => x.id);
        const ingCruzado = linkedIds.find(iid => {
          const im = ingBy[iid] || { usd: 0, uy: 0 };
          return r.esUY ? im.usd > 0 : im.uy > 0;
        });
        if (!ingCruzado) return;
        // Encontrar el id "original" (con guiones) del cobro para pasarlo a cubrirServicio.
        const ingEntry = (ing.results || []).find(x => normS(x.id) === ingCruzado);
        if (!ingEntry) return;
        slot.innerHTML = ' <button class="fin-svc-link" style="white-space:nowrap;font-size:11px;margin-left:4px" onclick="cubrirServicio(\'' + esc(ingEntry.id) + '\',\'' + esc(r.id) + '\')">✓ cubre</button>';
      });
    }
  } catch (e) {
    content.innerHTML = '<div class="coord-empty">No se pudo cargar Por cobrar<br><small>' + esc(e.message) + '</small></div>';
  }
}

// Asocia un cobro (ingreso) a un servicio: setea "Servicio vinculado" → el precio/cobrado se vuelve real.
// Reversible (se puede desvincular). Re-renderiza la vista al terminar.
async function asociarCobro(ingId) {
  const sel = document.getElementById('assoc-' + ingId);
  const svcId = sel && sel.value;
  if (!svcId) { alert('Elegí un servicio primero.'); return; }
  if (sel) sel.disabled = true;
  try {
    await callNotion('pages/' + ingId, 'PATCH', { properties: { 'Servicio vinculado': { relation: [{ id: svcId }] } } });
    if (typeof syncAfterWrite === 'function') { try { await syncAfterWrite(ingId, 'ingresos'); } catch (_) {} }
    // C5: si el cobro está en moneda cruzada o $0 en la moneda del precio → ofrecer reconciliar (C3).
    const D = _porCobrarData;
    if (D) {
      const nrm = x => (x || '').replace(/-/g, '');
      const sObj = (D.svc.results || []).find(x => x.id === svcId);
      const propId = sObj?.properties?.['Propuesta']?.relation?.[0]?.id;
      const pr = propId ? D.precioBy[nrm(propId)] : null;
      const im = D.ingBy[nrm(ingId)] || { usd: 0, uy: 0 };
      if (pr) {
        const precioEsUY = pr.moneda === '🇺🇾 UY$';
        const enPrecio = precioEsUY ? im.uy : im.usd;   // monto del cobro EN la moneda del precio
        const enOtra   = precioEsUY ? im.usd : im.uy;   // monto en la otra moneda
        if (!enPrecio && enOtra) {                       // pagado sólo en la otra moneda → reconciliar
          if (_porCobrarCtx) await renderPorCobrar(_porCobrarCtx.containerId, _porCobrarCtx.opts);
          if (confirm(t('porcobrar.asociar.reconciliar'))) cubrirServicio(ingId, svcId);
          return;
        }
      }
    }
    if (_porCobrarCtx) await renderPorCobrar(_porCobrarCtx.containerId, _porCobrarCtx.opts);
  } catch (e) {
    if (sel) sel.disabled = false;
    alert('No se pudo asociar: ' + esc(e.message || String(e)));
  }
}

// C3 — Overlay "plan antes de tocar": muestra qué va a pasar y ejecuta onConfirm solo al confirmar.
// Patrón idéntico a report-step-overlay / merge-plan-overlay (sibling de body).
var _porCobrarOnConfirm = null;
function openPorCobrarPlan(title, bodyHTML, onConfirm) {
  _porCobrarOnConfirm = onConfirm;
  document.getElementById('por-cobrar-plan-title').textContent = title;
  document.getElementById('por-cobrar-plan-body').innerHTML = bodyHTML +
    '<div style="display:flex;gap:10px;margin-top:20px">' +
      '<button type="button" onclick="closePorCobrarPlan()" style="flex:1;padding:13px;background:var(--bg);border:1px solid var(--border);border-radius:12px;color:var(--text2);font-family:inherit;font-size:14px;font-weight:600;cursor:pointer">' + t('porcobrar.plan.cancel') + '</button>' +
      '<button type="button" id="pc-plan-confirm" onclick="if(_porCobrarOnConfirm)_porCobrarOnConfirm()" style="flex:2;padding:13px;background:#00C98D;border:none;border-radius:12px;color:#04130d;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer">' + t('porcobrar.plan.confirm') + '</button>' +
    '</div>';
  document.getElementById('por-cobrar-plan-overlay').classList.add('open');
}
function closePorCobrarPlan() {
  document.getElementById('por-cobrar-plan-overlay').classList.remove('open');
  _porCobrarOnConfirm = null;
}

// C3 — cubrirServicio: arma el modal de plan SIMÉTRICO mostrando qué va a escribir ANTES de hacerlo.
// SIMÉTRICA (P3): moneda objetivo = moneda del PRECIO (si precio USD → escribe Monto USD;
//   si precio UY$ → escribe Monto UY$ cobrado). El monto real del pago (Moneda cobro) NO se toca.
// cubierto por defecto = saldo RESTANTE (precio − ya cobrado en la moneda del precio).
// TC = montoOtra / cubierto, solo si cubierto > 0 y hay monto en la otra moneda (NUNCA /0).
function cubrirServicio(ingId, svcId) {
  const D = _porCobrarData; if (!D) return;
  const norm = s => (s || '').replace(/-/g, '');
  const s = (D.svc.results || []).find(x => x.id === svcId);
  const i = (D.ing.results || []).find(x => x.id === ingId);
  if (!s || !i) { alert('No encontré el servicio o el cobro (refrescá).'); return; }
  const propId = s.properties?.['Propuesta']?.relation?.[0]?.id;
  const pr = propId ? D.precioBy[norm(propId)] : null;
  if (!pr || !pr.monto) { alert('Este servicio no tiene precio (propuesta). Asigná el precio primero.'); return; }
  const precioEsUY = pr.moneda === '🇺🇾 UY$';
  // Suma de cobros ya registrados en la moneda del PRECIO para este servicio.
  // Desde el índice FORWARD (ingBySvc): la inversa 'Ingresos' del servicio está congelada bajo el flip.
  let cobEnPrecio = 0;
  (D.ingBySvc?.[norm(svcId)] || []).forEach(v => { cobEnPrecio += precioEsUY ? v.uy : v.usd; });
  // Monto real de ESTE cobro en la OTRA moneda (lo que se pagó de verdad en la moneda distinta al precio).
  const im = D.ingBy[norm(ingId)] || { usd: 0, uy: 0 };
  const montoOtra = precioEsUY ? im.usd : im.uy;
  // Saldo restante = precio − ya cobrado en la moneda del precio (nunca negativo).
  const saldoRest = Math.max(0, pr.monto - cobEnPrecio);
  // Por defecto cubrir el saldo restante; si ya estaba todo cobrado, ofrecer el precio completo.
  const cubiertoDef = saldoRest > 0 ? saldoRest : pr.monto;
  const fP = n => fmtMoneda(n, pr.moneda);
  const fO = n => fmtMoneda(n, precioEsUY ? '🇺🇸 USD' : '🇺🇾 UY$');
  const monedaPrecioLabel = precioEsUY ? 'UY$' : 'USD';
  const body =
    '<div style="font-size:14px;line-height:1.5;margin-bottom:12px">' +
      'Este cobro' + (montoOtra ? ' de <b>' + esc(fO(montoOtra)) + '</b>' : '') +
      ' cubre el servicio <b>' + esc(s.properties?.['Nombre del servicio']?.title?.[0]?.plain_text || '(servicio)') + '</b>' +
      ' (' + esc(fP(pr.monto)) + '). Saldo restante: <b>' + esc(fP(saldoRest)) + '</b>.' +
    '</div>' +
    '<div class="gasto-form-row"><label>' + t('porcobrar.cubrir.label') + ' (' + esc(monedaPrecioLabel) + ')</label>' +
      '<input type="number" id="pc-cubierto" step="0.01" min="0" inputmode="decimal" value="' + cubiertoDef + '" style="width:100%;padding:10px;background:var(--bg2);border:1px solid var(--border);border-radius:8px;color:var(--text);font-family:inherit;font-size:15px"/></div>' +
    '<div style="font-size:11px;color:var(--text3);margin-top:6px">Se guarda en <b>' + (precioEsUY ? 'Monto UY$ cobrado' : 'Monto USD') + '</b>. El monto real del pago (Moneda cobro) no se toca.</div>';
  openPorCobrarPlan(t('porcobrar.cubrir.title'), body, () => {
    const v = parseFloat(document.getElementById('pc-cubierto').value);
    const cubierto = isFinite(v) ? v : 0;
    confirmCubrirServicio(ingId, svcId, cubierto);
  });
}

// C3 — confirmCubrirServicio: ejecuta el PATCH SIMÉTRICO con validación cubierto>0 antes del TC.
// NUNCA divide por 0 ni escribe Infinity/NaN en TC aplicado.
// Reversible: cubierto=0 escribe 0 en el campo de monto de la moneda del precio (quita la cobertura),
// y en ese caso NO escribe TC (no hay nada que derivar).
async function confirmCubrirServicio(ingId, svcId, cubierto) {
  const D = _porCobrarData; if (!D) return;
  const norm = s => (s || '').replace(/-/g, '');
  const s = (D.svc.results || []).find(x => x.id === svcId);
  const propId = s?.properties?.['Propuesta']?.relation?.[0]?.id;
  const pr = propId ? D.precioBy[norm(propId)] : null;
  if (!pr) { alert('Sin precio vinculado.'); return; }
  const precioEsUY = pr.moneda === '🇺🇾 UY$';
  const im = D.ingBy[norm(ingId)] || { usd: 0, uy: 0 };
  const montoOtra = precioEsUY ? im.usd : im.uy;   // monto real en la moneda OPUESTA al precio
  const props = {};
  // P3 SIMÉTRICO: setea el campo en la moneda del PRECIO (NO en la moneda del pago real).
  // Si cubierto<=0 → escribe 0 (reversible: quita la cobertura).
  props[precioEsUY ? 'Monto UY$ cobrado' : 'Monto USD'] = { number: cubierto > 0 ? cubierto : 0 };
  // Asegura el vínculo al servicio (por si el cobro no estaba asociado aún).
  props['Servicio vinculado'] = { relation: [{ id: svcId }] };
  // TC derivado SOLO si hay monto en la otra moneda Y cubierto>0 (NUNCA /0 ni Infinity/NaN).
  if (montoOtra && cubierto > 0) {
    props['TC aplicado'] = { number: Math.round((montoOtra / cubierto) * 100) / 100 };
  }
  const btn = document.getElementById('pc-plan-confirm');
  if (btn) btn.disabled = true;
  try {
    await callNotion('pages/' + ingId, 'PATCH', { properties: props });
    if (typeof syncAfterWrite === 'function') { try { await syncAfterWrite(ingId, 'ingresos'); } catch (_) {} }
    closePorCobrarPlan();
    if (_porCobrarCtx) await renderPorCobrar(_porCobrarCtx.containerId, _porCobrarCtx.opts);
  } catch (e) {
    if (btn) btn.disabled = false;
    alert('No se pudo reconciliar: ' + esc(e.message || String(e)));
  }
}

// C4 — asignarPrecioContrato: vincula la propuesta recurrente del cliente a las visitas SIN precio.
// P4: precio POR VISITA (cada visita hereda Importe estimado de la propuesta).
// Si hay >1 contrato recurrente → muestra selector primero (propIdSel ausente).
// NO pisa visitas que ya tienen propuesta vinculada. Reversible/idempotente.
function asignarPrecioContrato(clienteId, propIdSel) {
  const D = _porCobrarData; if (!D) return;
  const norm = s => (s || '').replace(/-/g, '');
  // Contratos recurrentes del cliente.
  const contratos = (D.prop.results || []).filter(p =>
    (p.properties?.['Tipo']?.select?.name || '') === '🔄 Recurrente' &&
    norm(p.properties?.['Contacto']?.relation?.[0]?.id || '') === norm(clienteId));
  if (!contratos.length) { alert('Este cliente no tiene un contrato recurrente con precio.'); return; }
  // P4: si hay >1 contrato y no se eligió, pedir cuál aplicar.
  if (contratos.length > 1 && !propIdSel) {
    const opts = contratos.map(p =>
      '<option value="' + esc(p.id) + '">' +
        esc(p.properties?.['Nombre de propuesta']?.title?.[0]?.plain_text || p.id) +
        ' — ' + fmtMoneda(p.properties?.['Importe estimado']?.number || 0, p.properties?.['Moneda']?.select?.name || '🇺🇸 USD') + '/visita' +
      '</option>'
    ).join('');
    const body =
      '<div style="font-size:14px;margin-bottom:10px">' + t('porcobrar.contrato.choose') + '</div>' +
      '<select id="pc-contrato-sel" style="width:100%;padding:8px;border-radius:8px;background:var(--bg);color:var(--text);border:1px solid var(--border);font-family:inherit">' + opts + '</select>';
    openPorCobrarPlan(t('porcobrar.contrato.title'), body, () => {
      const pid = document.getElementById('pc-contrato-sel').value;
      closePorCobrarPlan();
      asignarPrecioContrato(clienteId, pid);
    });
    return;
  }
  const prop = propIdSel ? contratos.find(p => p.id === propIdSel) : contratos[0];
  if (!prop) { alert('No se encontró el contrato seleccionado.'); return; }
  const imp = prop.properties?.['Importe estimado']?.number || 0;
  const mon = prop.properties?.['Moneda']?.select?.name || '🇺🇸 USD';
  // P4: solo visitas Completadas del cliente SIN propuesta vinculada (no pisar las que ya tienen una).
  const visitas = (D.comp || []).filter(s =>
    norm(s.properties?.['Contacto']?.relation?.[0]?.id || '') === norm(clienteId) &&
    !(s.properties?.['Propuesta']?.relation || []).length);
  if (!visitas.length) { alert('No hay visitas sin precio para este cliente.'); return; }
  const lista = visitas.map(s =>
    '<li>' + esc(s.properties?.['Nombre del servicio']?.title?.[0]?.plain_text || '(servicio)') + '</li>'
  ).join('');
  const bodyMsg = t('porcobrar.contrato.body')
    .replace('{precio}', fmtMoneda(imp, mon))
    .replace('{n}', visitas.length);
  const body =
    '<div style="font-size:14px;line-height:1.5;margin-bottom:10px">' + bodyMsg + '</div>' +
    '<ul style="margin:0 0 4px 18px;font-size:13px;color:var(--text2)">' + lista + '</ul>';
  openPorCobrarPlan(t('porcobrar.contrato.title'), body, () => confirmAsignarPrecio(clienteId, prop.id));
}

// C4 — confirmAsignarPrecio: ejecuta el vínculo Servicios.Propuesta secuencial, idempotente, reintentable.
// Solo actúa sobre visitas que siguen sin propuesta → correr dos veces no duplica.
async function confirmAsignarPrecio(clienteId, propId) {
  const D = _porCobrarData; if (!D) return;
  const norm = s => (s || '').replace(/-/g, '');
  // Re-filtra en el momento de ejecutar (idempotente: si alguna ya se vinculó, la salta).
  const visitas = (D.comp || []).filter(s =>
    norm(s.properties?.['Contacto']?.relation?.[0]?.id || '') === norm(clienteId) &&
    !(s.properties?.['Propuesta']?.relation || []).length);
  const btn = document.getElementById('pc-plan-confirm');
  if (btn) btn.disabled = true;
  let ok = 0;
  try {
    for (const s of visitas) {
      await callNotion('pages/' + s.id, 'PATCH', { properties: { 'Propuesta': { relation: [{ id: propId }] } } });
      if (typeof syncAfterWrite === 'function') { try { await syncAfterWrite(s.id, 'servicios'); } catch (_) {} }
      ok++;
    }
    closePorCobrarPlan();
    if (_porCobrarCtx) await renderPorCobrar(_porCobrarCtx.containerId, _porCobrarCtx.opts);
  } catch (e) {
    if (btn) btn.disabled = false;
    alert('Se asignaron ' + ok + ' de ' + visitas.length + '. Falló: ' + esc(e.message || String(e)) + '. Podés reintentar (no duplica).');
  }
}

async function setCEOFinCurrency(cur) {
  ceoFinCurrency = cur;
  await renderCEOFinanzas();
}

// Despliega/oculta el detalle de una categoría/tipo en Finanzas (cards desplegables).
function toggleFinGroup(btn) {
  const d = btn.nextElementSibling;
  if (!d) return;
  const open = d.style.display === 'none';
  d.style.display = open ? 'block' : 'none';
  const ar = btn.querySelector('.fin-arrow');
  if (ar) ar.textContent = open ? '▴' : '▾';
}

let _ceoEquipoCache = null;
// Admins que pueden resetear PINs ajenos (espejo de ADMIN_IDS en api/admin-set-pin.js; el server igual valida).
// ⚠️ Acoplado a la env ADMIN_IDS del server (default idéntico). Si se cambia ADMIN_IDS en Vercel,
// actualizar también acá (esto solo gobierna VISIBILIDAD; el server re-valida cada acción → fail-safe).
function isAppAdmin() { return ['diego-laxalt', 'eduardo-cabral'].includes(currentUser?.id); }

// Admin: setear/resetear el PIN de un usuario (escribe en KV vía endpoint). No pide el PIN anterior.
async function adminSetPin(targetId) {
  const nombre = _userName(targetId);
  const newPin = prompt('Nuevo PIN para ' + nombre + ' (4 o 6 dígitos):');
  if (newPin == null) return;
  if (!/^(\d{4}|\d{6})$/.test(newPin.trim())) { alert('El PIN debe ser de 4 o 6 dígitos.'); return; }
  try {
    const r = await fetch('/api/admin-set-pin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + (localStorage.getItem('fc_token') || '') },
      body: JSON.stringify({ targetId, newPin: newPin.trim() })
    });
    const j = await r.json().catch(() => ({}));
    if (j.ok) alert('✅ PIN actualizado para ' + nombre + '.');
    else alert('❌ No se pudo: ' + (j.error || ('error ' + r.status)));
  } catch (e) { alert('❌ Error: ' + e.message); }
}

// Alta de usuario sin deploy: escribe la tabla `usuarios` (Supabase) vía /api/admin-set-user + le pone PIN.
function toggleNewUserForm() {
  const f = document.getElementById('new-user-form');
  if (f) f.style.display = f.style.display === 'none' ? 'block' : 'none';
}
function nuSlug(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
}
function nuSyncId() {
  const idEl = document.getElementById('nu-id');
  if (!idEl || idEl.dataset.touched) return; // no pisar si el admin editó el id a mano
  idEl.value = nuSlug(document.getElementById('nu-nombre')?.value);
}
async function adminNewUser() {
  const nombre = (document.getElementById('nu-nombre')?.value || '').trim();
  const id = (document.getElementById('nu-id')?.value || '').trim();
  const rol = document.getElementById('nu-rol')?.value;
  const pais = document.getElementById('nu-pais')?.value;
  if (!nombre || !id || !rol || !pais) { alert('Completá nombre, id, rol y país.'); return; }
  if (!/^[a-z0-9-]{2,60}$/.test(id)) { alert('El id debe ser minúsculas, números y guiones (2–60).'); return; }
  if (window._creatingUser) return; // anti doble-submit
  window._creatingUser = true;
  const tok = localStorage.getItem('fc_token') || '';
  try {
    const r = await fetch('/api/admin-set-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + tok },
      body: JSON.stringify({ id, nombre, rol, pais, activo: true })
    });
    const j = await r.json().catch(() => ({}));
    if (!j.ok) { alert('❌ No se pudo crear: ' + (j.error || ('error ' + r.status))); return; }
    // Sin PIN no puede entrar aunque exista en la tabla → lo pedimos en el acto.
    const pin = prompt('✅ ' + nombre + ' creado. Poné su PIN de 4 o 6 dígitos:');
    if (pin != null && /^(\d{4}|\d{6})$/.test(pin.trim())) {
      const rp = await fetch('/api/admin-set-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + tok },
        body: JSON.stringify({ targetId: id, newPin: pin.trim() })
      });
      const jp = await rp.json().catch(() => ({}));
      if (!jp.ok) alert('⚠️ Usuario creado, pero el PIN falló (' + (jp.error || rp.status) + '). Ponelo con el botón 🔑.');
      else alert('✅ Listo. ' + nombre + ' ya puede entrar (aparece en el login con el modo base activo).');
    } else {
      alert('⚠️ Usuario creado SIN PIN. No puede entrar hasta que le pongas uno con el botón 🔑.');
    }
    await loadRoster();   // refresca el array local del login (solo aplica si el modo base está activo)
    renderCEOEquipo();    // re-render del panel (adminAccountsHTML)
  } catch (e) { alert('❌ Error: ' + e.message); }
  finally { window._creatingUser = false; }
}

// Ciclo de vida del usuario (baja suave / reactivar / borrado definitivo) — todo vía /api/admin-user-status.
// Resuelve el nombre visible desde el id (así los onclick pasan SOLO el id, charset seguro → sin XSS ni escaping frágil).
function _userName(id) {
  const a = Array.isArray(USERS) && USERS.find(u => u.id === id);
  if (a) return a.name;
  return (window._bajaUsers && window._bajaUsers[id]) || id;
}
async function _userStatusCall(body) {
  const tok = localStorage.getItem('fc_token') || '';
  const r = await fetch('/api/admin-user-status', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + tok },
    body: JSON.stringify(body)
  });
  return { r, j: await r.json().catch(() => ({})) };
}

// BAJA suave: sale del login y pierde el PIN, pero la ficha y su historial QUEDAN → se puede reactivar.
async function adminBajaUser(id) {
  const nombre = _userName(id);
  if (!confirm('Dar de baja a ' + nombre + '.\n\nSale del login y se le corta el acceso, pero su ficha e historial quedan guardados. Podés reactivarlo cuando vuelva.\n\n¿Continuar?')) return;
  try {
    const { r, j } = await _userStatusCall({ id, activo: false });
    if (!j.ok) { alert('❌ No se pudo: ' + (j.error || ('error ' + r.status))); return; }
    alert('✅ ' + nombre + ' quedó dado de baja (guardado en «Dados de baja»).');
    // Update OPTIMISTA: sacar de activos AL INSTANTE (el roster server cachea 60s → no esperar el refetch).
    const i = USERS.findIndex(u => u.id === id); if (i >= 0) USERS.splice(i, 1);
    renderCEOEquipo(); // re-arma activos sin el usuario + loadInactiveUsers lo trae fresco a Dados de baja
  } catch (e) { alert('❌ Error: ' + e.message); }
}

// REACTIVAR un usuario dado de baja: vuelve activo + se le pone un PIN nuevo (la baja se lo había borrado).
async function adminReactivarUser(id) {
  const nombre = _userName(id);
  if (!confirm('Reactivar a ' + nombre + ' con toda su información previa.\n\n¿Continuar?')) return;
  try {
    const { r, j } = await _userStatusCall({ id, activo: true });
    if (!j.ok) { alert('❌ No se pudo: ' + (j.error || ('error ' + r.status))); return; }
    const tok = localStorage.getItem('fc_token') || '';
    const pin = prompt('✅ ' + nombre + ' reactivado. Poné su PIN de 4 o 6 dígitos:');
    if (pin != null && /^(\d{4}|\d{6})$/.test(pin.trim())) {
      const rp = await fetch('/api/admin-set-pin', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + tok }, body: JSON.stringify({ targetId: id, newPin: pin.trim() }) });
      const jp = await rp.json().catch(() => ({}));
      if (!jp.ok) alert('⚠️ Reactivado, pero el PIN falló (' + (jp.error || rp.status) + '). Ponelo con el botón 🔑.');
    } else {
      alert('⚠️ Reactivado SIN PIN. No puede entrar hasta que le pongas uno con el botón 🔑.');
    }
    // Update OPTIMISTA: volver a activos AL INSTANTE desde la fila devuelta (sin esperar el roster cacheado).
    if (j.user && !USERS.some(u => u.id === id)) {
      const uu = j.user, firstTok = s => String(s || '').trim().split(/\s+/)[0] || '👤';
      USERS.push({ id: uu.id, name: uu.nombre, role: uu.rol, country: uu.pais, emoji: uu.emoji || firstTok(uu.rol), notionId: uu.notion_id || null });
    }
    renderCEOEquipo(); // muestra al usuario en activos + loadInactiveUsers lo saca de Dados de baja
  } catch (e) { alert('❌ Error: ' + e.message); }
}

// ✏️ EDITAR usuario existente (nombre/rol/país) — server: admin-set-user con upsert:true (ya soportado).
// El id NO se cambia (es la PK del login/permisos); activo:true explícito para no tocar el estado.
function toggleEditUser(id) {
  const slot = document.getElementById('eu-slot-' + id);
  if (!slot) return;
  if (slot.style.display !== 'none') { slot.style.display = 'none'; slot.innerHTML = ''; return; }
  const u = USERS.find(x => x.id === id);
  if (!u) return;
  const ROLES_UI = ['🎯 Dirección', '🔧 Coordinador', '🛠️ Operario', '👔 CEO', '📊 Administración', '🧲 Ventas'];
  const PAISES_UI = ['Uruguay', 'Brasil', 'Panamá', 'Guatemala', 'México'];
  const _inp = 'width:100%;box-sizing:border-box;padding:9px 11px;margin-bottom:7px;border:1px solid var(--border);border-radius:9px;background:var(--bg);color:var(--text);font-size:14px';
  slot.innerHTML = '<div style="background:var(--card);border:1px solid var(--border);border-radius:12px;padding:12px">' +
    '<input id="eu-nombre-' + esc(id) + '" value="' + esc(u.name) + '" maxlength="80" style="' + _inp + '">' +
    '<select id="eu-rol-' + esc(id) + '" style="' + _inp + '">' + ROLES_UI.map(r => '<option' + (r === u.role ? ' selected' : '') + '>' + r + '</option>').join('') + '</select>' +
    '<select id="eu-pais-' + esc(id) + '" style="' + _inp + '">' + PAISES_UI.map(pp => '<option' + (pp === u.country ? ' selected' : '') + '>' + pp + '</option>').join('') + '</select>' +
    '<div style="display:flex;gap:8px">' +
      '<button onclick="adminEditUser(\'' + esc(id) + '\')" style="flex:1;padding:10px;border:none;border-radius:10px;background:var(--accent,#00C98D);color:#03231a;font-weight:700;font-size:13px">' + esc(t('cfg.user.save')) + '</button>' +
      '<button onclick="toggleEditUser(\'' + esc(id) + '\')" style="flex:1;padding:10px;border:1px solid var(--border);border-radius:10px;background:transparent;color:var(--text2);font-size:13px">' + esc(t('btn.cancel')) + '</button>' +
    '</div></div>';
  slot.style.display = 'block';
}

async function adminEditUser(id) {
  const nombre = String(document.getElementById('eu-nombre-' + id)?.value || '').trim();
  const rol = document.getElementById('eu-rol-' + id)?.value;
  const pais = document.getElementById('eu-pais-' + id)?.value;
  if (!nombre || nombre.length > 80 || /[<>]/.test(nombre)) { alert(t('cfg.user.nombre.invalid')); return; }
  // Guard anti-lockout: un admin no puede sacarse a sí mismo el rol de Dirección/CEO por accidente.
  if (id === currentUser?.id && !(rol.includes('Dirección') || rol.includes('CEO'))) {
    alert(t('cfg.user.self.rol')); return;
  }
  try {
    const tok = localStorage.getItem('fc_token') || '';
    const r = await fetch('/api/admin-set-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + tok },
      body: JSON.stringify({ id, nombre, rol, pais, activo: true, upsert: true }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.ok) { alert('❌ ' + (j.error || ('error ' + r.status))); return; }
    // Update OPTIMISTA (el roster server tiene caché 60s): USERS + currentUser si se editó a sí mismo.
    const u = USERS.find(x => x.id === id);
    if (u) { u.name = nombre; u.role = rol; u.country = pais; }
    if (currentUser?.id === id) {
      currentUser.name = nombre; currentUser.role = rol; currentUser.country = pais;
      localStorage.setItem('fc_user', JSON.stringify(currentUser));
    }
    renderCEOEquipo();
    alert('✅ ' + t('cfg.user.saved'));
  } catch (e) { alert('❌ ' + e.message); }
}

// BORRADO DEFINITIVO (solo para basura/pruebas — NO empleados reales, se pierde todo).
async function adminHardDeleteUser(id) {
  const nombre = _userName(id);
  if (!confirm('⚠️ ELIMINAR DEFINITIVAMENTE a ' + nombre + '.\n\nSe borra la ficha por completo, sin vuelta atrás. Usar solo para usuarios de prueba/basura. Para un empleado real usá «Baja» (conserva el historial).\n\n¿Eliminar para siempre?')) return;
  try {
    const { r, j } = await _userStatusCall({ id, hard: true });
    if (!j.ok) { alert('❌ No se pudo: ' + (j.error || ('error ' + r.status))); return; }
    alert('✅ ' + nombre + ' eliminado definitivamente.');
    // Update OPTIMISTA: sacar de USERS por si estuviera + re-render (loadInactiveUsers lo saca de Dados de baja).
    const i = USERS.findIndex(u => u.id === id); if (i >= 0) USERS.splice(i, 1);
    renderCEOEquipo();
  } catch (e) { alert('❌ Error: ' + e.message); }
}

// Muestra/oculta el panel de dados de baja (y lo recarga al abrir para traer datos frescos).
function toggleBajaPanel() {
  const p = document.getElementById('baja-users-panel');
  if (!p) return;
  const show = p.style.display === 'none';
  p.style.display = show ? 'block' : 'none';
  if (show) loadInactiveUsers();
}

// Carga los usuarios dados de baja (inactivos) en el panel «Dados de baja» + actualiza el conteo del botón.
// Corre tras renderizar (para el conteo) y al abrir el panel (para refrescar). Degrada en silencio.
async function loadInactiveUsers() {
  const box = document.getElementById('baja-users-panel');
  const btn = document.getElementById('baja-toggle-btn');
  if (!box) return;
  try {
    const tok = localStorage.getItem('fc_token') || '';
    const r = await fetch('/api/admin-list-users', { headers: { 'Authorization': 'Bearer ' + tok } });
    if (!r.ok) {
      // Ya NO en silencio: mostramos el error para poder diagnosticar (antes quedaba el panel en blanco).
      const body = await r.text().catch(() => '');
      console.warn('[baja] admin-list-users', r.status, body.slice(0, 200));
      box.innerHTML = '<div style="font-size:12px;color:var(--amber,#f59e0b);padding:10px 2px">⚠️ No se pudo cargar la lista (error ' + r.status + ').</div>';
      return;
    }
    const j = await r.json();
    const inactivos = (j.users || []).filter(u => u.activo === false);
    window._bajaUsers = Object.fromEntries(inactivos.map(u => [u.id, u.nombre || u.id])); // _userName lee de acá
    if (btn) btn.textContent = '🗂️ Dados de baja' + (inactivos.length ? ' (' + inactivos.length + ')' : '');
    if (!inactivos.length) {
      box.innerHTML = '<div style="font-size:12px;color:var(--text3);padding:10px 2px">No hay usuarios dados de baja.</div>';
      return;
    }
    let h = '';
    inactivos.forEach(u => {
      h += '<div class="equipo-card" style="opacity:.78">' +
        '<div class="equipo-emoji">' + esc(u.emoji || '👤') + '</div>' +
        '<div style="flex:1;min-width:0"><div class="equipo-name">' + esc(u.nombre || u.id) + '</div><div class="equipo-role">' + esc(translateRole(u.rol) || '') + ' · ' + esc(u.pais || '') + '</div></div>' +
        '<button class="fin-svc-link" style="white-space:nowrap;color:var(--accent,#00C98D)" onclick="adminReactivarUser(\'' + esc(u.id) + '\')">♻️ Reactivar</button>' +
        '<button class="fin-svc-link" style="white-space:nowrap;color:#e5484d" onclick="adminHardDeleteUser(\'' + esc(u.id) + '\')">🗑️</button>' +
        '</div>';
    });
    box.innerHTML = h;
  } catch (_) { /* silencioso */ }
}

// Sección admin (solo admins): cuentas de acceso (login) por país, con botón Set/Reset PIN.
// Se arma desde USERS (que tienen el id de login + PIN), no desde el roster de Notion.
function adminAccountsHTML() {
  if (!isAppAdmin()) return '';
  const ADMIN_IDS_UI = ['diego-laxalt', 'eduardo-cabral']; // no se pueden eliminar (anti-lockout de los dueños)
  const flagByCountry = { 'Uruguay': '🇺🇾', 'Brasil': '🇧🇷', 'Panamá': '🇵🇦', 'Guatemala': '🇬🇹', 'México': '🇲🇽' };
  const isGlobal = ceoViewCountry === 'all';
  const scoped = isGlobal ? USERS : USERS.filter(u => u.country === ceoViewCountry);
  const byC = {};
  scoped.forEach(u => { (byC[u.country] = byC[u.country] || []).push(u); });
  let h = '<div class="ceo-section-title">🔑 Cuentas de acceso (PINs)</div>';
  // Alta de usuario SIN deploy: escribe la tabla `usuarios` de Supabase. Aplica al login cuando USERS_FROM_DB=1.
  const ROLES_UI = ['🎯 Dirección', '🔧 Coordinador', '🛠️ Operario', '👔 CEO', '📊 Administración', '🧲 Ventas'];
  const PAISES_UI = ['Uruguay', 'Brasil', 'Panamá', 'Guatemala', 'México'];
  const defPais = isGlobal ? 'Uruguay' : ceoViewCountry;
  const _inp = 'width:100%;box-sizing:border-box;padding:9px 11px;margin-bottom:7px;border:1px solid var(--border);border-radius:9px;background:var(--bg);color:var(--text);font-size:14px';
  h += '<div style="padding:0 16px 10px">' +
    '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
      '<button class="fin-svc-link" onclick="toggleNewUserForm()">➕ Agregar usuario</button>' +
      '<button class="fin-svc-link" id="baja-toggle-btn" onclick="toggleBajaPanel()">🗂️ Dados de baja</button>' +
    '</div>' +
    '<div id="new-user-form" style="display:none;margin-top:8px;background:var(--card);border:1px solid var(--border);border-radius:12px;padding:12px">' +
      '<input id="nu-nombre" placeholder="Nombre y apellido" oninput="nuSyncId()" style="' + _inp + '">' +
      '<input id="nu-id" placeholder="id de login (se genera solo)" oninput="this.dataset.touched=1" style="' + _inp + '">' +
      '<select id="nu-rol" style="' + _inp + '"><option value="" disabled selected>Elegí el rol…</option>' + ROLES_UI.map(r => '<option>' + r + '</option>').join('') + '</select>' +
      '<select id="nu-pais" style="' + _inp + '">' + PAISES_UI.map(p => '<option' + (p === defPais ? ' selected' : '') + '>' + p + '</option>').join('') + '</select>' +
      '<div style="font-size:11px;color:var(--text3);margin:2px 0 8px">Se crea el usuario y te pide un PIN. Aparece en el login cuando el modo base esté activo.</div>' +
      '<button onclick="adminNewUser()" style="width:100%;padding:11px;border:none;border-radius:10px;background:var(--accent,#00C98D);color:#03231a;font-weight:700;font-size:14px">Crear usuario + poner PIN</button>' +
    '</div>' +
    '<div id="baja-users-panel" style="display:none;margin-top:8px"></div>' +
  '</div>';
  for (const [c, list] of Object.entries(byC)) {
    h += '<div style="font-size:11px;color:var(--text3);padding:2px 16px 4px">' + (flagByCountry[c] || '') + ' ' + esc(c) + '</div>';
    list.forEach(u => {
      const isAdm = ADMIN_IDS_UI.includes(u.id);
      h += '<div class="equipo-card">' +
        '<div class="equipo-emoji">' + esc(u.emoji || '👤') + '</div>' +
        '<div style="flex:1;min-width:0"><div class="equipo-name">' + esc(u.name) + '</div><div class="equipo-role">' + esc(translateRole(u.role)) + '</div></div>' +
        '<button class="fin-svc-link" style="white-space:nowrap" onclick="toggleEditUser(\'' + esc(u.id) + '\')">✏️</button>' +
        '<button class="fin-svc-link" style="white-space:nowrap" onclick="adminSetPin(\'' + esc(u.id) + '\')">🔑 PIN</button>' +
        (isAdm ? '' : '<button class="fin-svc-link" style="white-space:nowrap;color:#e5484d" onclick="adminBajaUser(\'' + esc(u.id) + '\')">Baja</button>') +
        '</div>' +
        '<div id="eu-slot-' + esc(u.id) + '" style="display:none;margin:0 16px 8px"></div>';
    });
  }
  return h + '<div style="height:16px"></div>';
}

async function renderCEOEquipo() {
  const content = document.getElementById('ceo-content');
  // Spinner solo en la 1ª carga (sin caché); en el re-render tras baja/reactivar NO parpadea → más ágil.
  if (!_ceoEquipoCache) content.innerHTML = '<div style="text-align:center;padding:40px 0"><div class="spinner" style="margin:0 auto"></div></div>';
  const flagMap = { '🇺🇾 UY': '🇺🇾', '🇧🇷 BR': '🇧🇷', '🇵🇦 PA': '🇵🇦', '🇬🇹 GT': '🇬🇹', '🇲🇽 MX': '🇲🇽' };
  const roleEmoji = { '🎯 Dirección': '🎯', '💼 Comercial': '💼', '✈️ Operario': '👨‍✈️', '📊 Administración': '📊', '🔧 Técnico': '🔧' };
  try {
    if (!_ceoEquipoCache) {
      const data = await callNotion(`databases/${EQUIPO_DB_ID}/query`, 'POST', { page_size: 100 });
      _ceoEquipoCache = data.results || [];
    }
    let members = _ceoEquipoCache.filter(m => (m.properties?.['Estado']?.select?.name || '✅ Activo') !== '❌ Inactivo');
    if (ceoViewCountry !== 'all') {
      const short = COUNTRY_FINANCE_MAP[ceoViewCountry];
      members = members.filter(m => m.properties?.['País']?.select?.name === short);
    }
    if (!members.length) { content.innerHTML = `<div class="coord-empty">${t('ceo.equipo.empty')}</div>`; return; }
    const isGlobal = ceoViewCountry === 'all';
    const grouped = {};
    members.forEach(m => { const p = m.properties?.['País']?.select?.name || '—'; (grouped[p] = grouped[p] || []).push(m); });
    let html = '';
    for (const [pais, list] of Object.entries(grouped)) {
      html += '<div class="ceo-section-title">' + esc(pais) + '</div>';
      for (const m of list) {
        const props = m.properties || {};
        const nombre = props['Nombre']?.title?.[0]?.plain_text || '—';
        const rol = props['Rol']?.select?.name || '';
        const countryTag = isGlobal ? '<div class="equipo-country">' + (flagMap[pais] || '') + '</div>' : '';
        html += '<div class="equipo-card">' +
          '<div class="equipo-emoji">' + (roleEmoji[rol] || '👤') + '</div>' +
          '<div><div class="equipo-name">' + esc(nombre) + '</div><div class="equipo-role">' + esc(rol) + '</div></div>' +
          countryTag + '</div>';
      }
    }
    if (activeCEOTab !== 'equipo') return; // cambió de tab mientras cargaba → NO pisar
    content.innerHTML = adminAccountsHTML() + html;
    if (isAppAdmin()) loadInactiveUsers();
  } catch (e) {
    console.warn('[ceo] equipo Notion fetch falló, uso lista local:', e.message);
    renderCEOEquipoLocal();
  }
}

// Fallback: render desde el array USERS local si la query a Notion falla.
function renderCEOEquipoLocal() {
  const content = document.getElementById('ceo-content');
  const isGlobal = ceoViewCountry === 'all';
  const flagMap = { 'Uruguay': '🇺🇾', 'Brasil': '🇧🇷', 'Panamá': '🇵🇦', 'Guatemala': '🇬🇹', 'México': '🇲🇽' };
  const users = isGlobal ? USERS : USERS.filter(u => u.country === ceoViewCountry);
  if (!users.length) { content.innerHTML = `<div class="coord-empty">${t('ceo.equipo.empty')}</div>`; return; }
  const grouped = {};
  users.forEach(u => { if (!grouped[u.country]) grouped[u.country] = []; grouped[u.country].push(u); });
  let html = '';
  for (const [country, members] of Object.entries(grouped)) {
    html += '<div class="ceo-section-title">' + (flagMap[country] || '') + ' ' + country.toUpperCase() + '</div>';
    for (const u of members) {
      const countryTag = isGlobal ? '<div class="equipo-country">' + (flagMap[u.country] || '') + '</div>' : '';
      html += '<div class="equipo-card">' +
        '<div class="equipo-emoji">' + u.emoji + '</div>' +
        '<div><div class="equipo-name">' + u.name + '</div><div class="equipo-role">' + translateRole(u.role) + '</div></div>' +
        countryTag + '</div>';
    }
  }
  content.innerHTML = adminAccountsHTML() + html;
  if (isAppAdmin()) loadInactiveUsers();
}

// ─────────────────────────────────────────────
// FILTROS DEL COORDINADOR — buscador + multi-select + sort + rango fechas
// Aplica client-side sobre los items ya cargados (no genera más calls a Notion).
// ─────────────────────────────────────────────
let _coordFilteredCount = null; // total tras applyCoordFilters (para el botón del sheet)
let coordFilters = {
  search: '',
  estado: [],         // multi-select de estados a INCLUIR; vacío = todos
  pais: [],           // multi-select de países a INCLUIR; vacío = todos
  operario: [],       // multi-select de operarios; vacío = todos
  dateFrom: '',       // YYYY-MM-DD
  dateTo: '',         // YYYY-MM-DD
  sort: 'date-desc'   // por defecto: próximos arriba → hoy → pasados → sin fecha al final
};
function refreshCoordFilterSheetIfOpen() {
  if (document.getElementById('coord-filter-overlay')?.classList.contains('open')) {
    renderCoordFiltersPanel();
    updateCoordApplyBtn();
  }
}
let _coordSearchTimer = null;
// Vista de la pestaña Inicio del coord: 'list' (cronológica) o 'board' (Kanban por estado).
let _coordView = localStorage.getItem('fc_coord_view') || 'list';

function getActiveFilterCount() {
  let n = 0;
  if (coordFilters.search) n++;
  if (coordFilters.estado.length) n++;
  if (coordFilters.pais.length) n++;
  if (coordFilters.operario.length) n++;
  if (coordFilters.dateFrom || coordFilters.dateTo) n++;
  return n;
}

function refreshCoordFilterBadge() {
  const badge = document.getElementById('coord-filter-count');
  const btn = document.getElementById('coord-filter-btn');
  const n = getActiveFilterCount();
  if (badge) {
    if (n > 0) { badge.textContent = n; badge.style.display = 'inline-block'; }
    else { badge.style.display = 'none'; }
  }
  if (btn) btn.classList.toggle('active', n > 0);
  renderCoordChips();
}

function isCoordToolbarVisible(tab) {
  return tab === 'inicio' || tab === 'servicios' || tab === 'relevamientos' || tab === 'propuestas' || tab === 'pruebas';
}

function showCoordToolbar(tab) {
  const tb = document.getElementById('coord-toolbar');
  if (!tb) return;
  if (isCoordToolbarVisible(tab)) {
    tb.style.display = 'block';
    const searchEl = document.getElementById('coord-search');
    if (searchEl) searchEl.value = coordFilters.search;
    refreshCoordFilterBadge();
  } else {
    tb.style.display = 'none';
    closeCoordFilterSheet();
  }
}

function onCoordSearchInput(v) {
  clearTimeout(_coordSearchTimer);
  _coordSearchTimer = setTimeout(() => {
    coordFilters.search = (v || '').trim().toLowerCase();
    refreshCoordFilterBadge();
    rerenderActiveCoordTab();
  }, 200);
}

function setCoordSort(v) {
  coordFilters.sort = v;
  rerenderActiveCoordTab();
  updateCoordApplyBtn();
}

// v163: los filtros viven en un BOTTOM-SHEET (patrón estándar) en vez del panel inline que empujaba
// la lista. Mismo nombre de función (la llama el botón ⚙︎); misma lógica de filtros por debajo.
function toggleCoordFiltersPanel() {
  const ov = document.getElementById('coord-filter-overlay');
  if (!ov) return;
  if (ov.classList.contains('open')) { closeCoordFilterSheet(); return; }
  renderCoordFiltersPanel();
  updateCoordApplyBtn();
  ov.classList.add('open');
}
function closeCoordFilterSheet() { document.getElementById('coord-filter-overlay')?.classList.remove('open'); }
function coordFilterOverlayClick(e) { if (e.target.id === 'coord-filter-overlay') closeCoordFilterSheet(); }

// Botón "Ver N resultados": N = total filtrado (pre-paginación), lo deja applyCoordFilters en _coordFilteredCount.
function updateCoordApplyBtn() {
  const btn = document.getElementById('coord-filter-apply');
  if (!btn) return;
  const n = (typeof _coordFilteredCount === 'number') ? _coordFilteredCount : null;
  const noun = activeCoordTab === 'propuestas' ? t('flt.noun.propuestas') : t('flt.noun.servicios');
  btn.textContent = (n != null) ? t('flt.ver').replace('{n}', n).replace('{que}', noun) : t('flt.listo');
}

// Chips de filtros ACTIVOS bajo el buscador (se sacan con un toque). Único hook: refreshCoordFilterBadge.
function renderCoordChips() {
  const row = document.getElementById('coord-chips');
  if (!row) return;
  const escA = v => String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const chips = [];
  const mk = (label, dim, val) => chips.push('<span class="coord-chip-active" data-dim="' + dim + '" data-val="' + escA(val) + '" onclick="toggleCoordFilterValue(this.dataset.dim, this.dataset.val)">' + escA(label) + ' <span class="x">✕</span></span>');
  coordFilters.estado.forEach(v => mk(v, 'estado', v));
  coordFilters.pais.forEach(v => mk(v, 'pais', v));
  coordFilters.operario.forEach(v => mk('👤 ' + v, 'operario', v));
  if (coordFilters.dateFrom || coordFilters.dateTo) {
    const fmt = (d) => d ? d.slice(8, 10) + '/' + d.slice(5, 7) : '…';
    chips.push('<span class="coord-chip-active" onclick="setCoordDateRange(\'\', \'\')">📅 ' + fmt(coordFilters.dateFrom) + ' → ' + fmt(coordFilters.dateTo) + ' <span class="x">✕</span></span>');
  }
  if (!chips.length) { row.style.display = 'none'; row.innerHTML = ''; return; }
  chips.push('<button class="coord-chip-clear" onclick="clearCoordFilters()">' + t('flt.chips.clear') + '</button>');
  row.innerHTML = chips.join('');
  row.style.display = 'flex';
}

function toggleCoordFilterValue(dim, val) {
  const arr = coordFilters[dim];
  const i = arr.indexOf(val);
  if (i === -1) arr.push(val); else arr.splice(i, 1);
  refreshCoordFilterBadge();
  renderCoordFiltersPanel();
  rerenderActiveCoordTab();
  updateCoordApplyBtn();
}

function setCoordDateRange(from, to) {
  coordFilters.dateFrom = from || '';
  coordFilters.dateTo = to || '';
  refreshCoordFilterBadge();
  renderCoordFiltersPanel();
  rerenderActiveCoordTab();
  updateCoordApplyBtn();
}

function clearCoordFilters() {
  coordFilters.search = '';
  coordFilters.estado = [];
  coordFilters.pais = [];
  coordFilters.operario = [];
  coordFilters.dateFrom = '';
  coordFilters.dateTo = '';
  const searchEl = document.getElementById('coord-search');
  if (searchEl) searchEl.value = '';
  refreshCoordFilterBadge();
  renderCoordFiltersPanel();
  rerenderActiveCoordTab();
  updateCoordApplyBtn();
}

function uniqueValues(items, getter) {
  const seen = new Set();
  items.forEach(it => { const v = getter(it); if (v) seen.add(v); });
  return [...seen].sort();
}

function renderCoordFiltersPanel() {
  const panel = document.getElementById('coord-filter-sheet-content');
  if (!panel) return;
  const isProps = activeCoordTab === 'propuestas';
  const items = isProps ? _coordAllProps : _coordAllServices;
  const estadoKey = isProps ? 'Estado pipeline' : 'Estado';
  const estados = uniqueValues(items, it => it.properties?.[estadoKey]?.select?.name);
  const paises = uniqueValues(items, it => it.properties?.['País']?.select?.name);
  const operarios = isProps ? [] : uniqueValues(items, it => it.properties?.['Operario App']?.select?.name);

  const dateLabel = isProps ? 'Última interacción' : 'Fecha programada';

  // Escape para usar el valor dentro de un atributo HTML (data-val="..."). Sin esto, valores
  // con comillas (o el propio JSON.stringify) cierran el atributo y rompen el click handler.
  const escAttr = s => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const chip = (dim, value, active) =>
    `<span class="coord-filter-chip ${active ? 'active' : ''}" data-dim="${dim}" data-val="${escAttr(value)}" onclick="toggleCoordFilterValue(this.dataset.dim, this.dataset.val)">${escAttr(value)}</span>`;

  // Orden adentro del sheet (antes era un <select> suelto que comía lugar en la barra)
  const SORTS = [
    ['date-desc', t('flt.sort.proximos')], ['date-asc', t('flt.sort.pasados')],
    ['alpha-asc', '🔤 A → Z'], ['alpha-desc', '🔤 Z → A'],
  ];
  let html = `<div class="coord-filter-section">
    <div class="coord-filter-label">${t('flt.sort')}</div>
    <div class="coord-filter-chips">${SORTS.map(([v, l]) => `<span class="coord-filter-chip ${coordFilters.sort === v ? 'active' : ''}" onclick="setCoordSort('${v}');renderCoordFiltersPanel()">${l}</span>`).join('')}</div>
  </div>`;
  if (estados.length) {
    html += `<div class="coord-filter-section">
      <div class="coord-filter-label">Estado</div>
      <div class="coord-filter-chips">${estados.map(e => chip('estado', e, coordFilters.estado.includes(e))).join('')}</div>
    </div>`;
  }
  if (paises.length) {
    html += `<div class="coord-filter-section">
      <div class="coord-filter-label">País</div>
      <div class="coord-filter-chips">${paises.map(p => chip('pais', p, coordFilters.pais.includes(p))).join('')}</div>
    </div>`;
  }
  if (operarios.length) {
    html += `<div class="coord-filter-section">
      <div class="coord-filter-label">Operario</div>
      <div class="coord-filter-chips">${operarios.map(o => chip('operario', o, coordFilters.operario.includes(o))).join('')}</div>
    </div>`;
  }
  html += `<div class="coord-filter-section">
    <div class="coord-filter-label">${dateLabel}</div>
    <div class="coord-filter-date-row">
      <input type="date" class="coord-filter-date-input" value="${coordFilters.dateFrom}" onchange="setCoordDateRange(this.value, coordFilters.dateTo)" placeholder="Desde"/>
      <span style="color:var(--text3);font-size:12px">→</span>
      <input type="date" class="coord-filter-date-input" value="${coordFilters.dateTo}" onchange="setCoordDateRange(coordFilters.dateFrom, this.value)" placeholder="Hasta"/>
    </div>
  </div>`;
  panel.innerHTML = html;
}

function rerenderActiveCoordTab() {
  if (activeCoordTab === 'inicio') {
    renderCoordServiciosView(); // respeta el toggle Lista/Tablero/Calendario
  } else if (activeCoordTab === 'servicios' || activeCoordTab === 'relevamientos' || activeCoordTab === 'pruebas') {
    renderCoordList();
  } else if (activeCoordTab === 'propuestas') {
    renderCoordPropuestasList();
  }
}

function applyCoordFilters(items, opts) {
  opts = opts || {};
  const isProps = opts.isProps === true;
  const estadoKey = isProps ? 'Estado pipeline' : 'Estado';
  const dateKey = isProps ? 'Última interacción' : 'Fecha programada';
  const search = coordFilters.search;

  let out = items.filter(it => {
    const props = it.properties || {};
    if (search) {
      const titleKey = isProps ? 'Nombre de propuesta' : 'Nombre del servicio';
      const nombre = (props[titleKey]?.title?.[0]?.plain_text || '').toLowerCase();
      // También por nombre de cliente (relación Contacto → map cacheado; degrada a '' si aún no cargó) y por Lugar.
      const cliNombre = (clienteNombreDe(props['Contacto']?.relation?.[0]?.id || props['Contactos']?.relation?.[0]?.id) || '').toLowerCase();
      const lugar = (props['Lugar']?.rich_text?.[0]?.plain_text || '').toLowerCase();
      if (!nombre.includes(search) && !cliNombre.includes(search) && !lugar.includes(search)) return false;
    }
    if (coordFilters.estado.length) {
      const v = props[estadoKey]?.select?.name || '';
      if (!coordFilters.estado.includes(v)) return false;
    }
    if (coordFilters.pais.length) {
      const v = props['País']?.select?.name || '';
      if (!coordFilters.pais.includes(v)) return false;
    }
    if (!isProps && coordFilters.operario.length) {
      const v = props['Operario App']?.select?.name || '';
      if (!coordFilters.operario.includes(v)) return false;
    }
    if (coordFilters.dateFrom || coordFilters.dateTo) {
      const f = props[dateKey]?.date?.start || '';
      if (!f) return false;
      if (coordFilters.dateFrom && f < coordFilters.dateFrom) return false;
      if (coordFilters.dateTo && f > coordFilters.dateTo) return false;
    }
    return true;
  });

  const titleKey = isProps ? 'Nombre de propuesta' : 'Nombre del servicio';
  const getName = it => (it.properties?.[titleKey]?.title?.[0]?.plain_text || '').toLowerCase();
  const getDate = it => it.properties?.[dateKey]?.date?.start || '';

  const sortFn = {
    'alpha-asc':  (a, b) => getName(a).localeCompare(getName(b)),
    'alpha-desc': (a, b) => getName(b).localeCompare(getName(a)),
    'date-asc':   (a, b) => (getDate(a) || '9999').localeCompare(getDate(b) || '9999'),
    'date-desc':  (a, b) => (getDate(b) || '0000').localeCompare(getDate(a) || '0000'),
  }[coordFilters.sort] || ((a, b) => 0);

  _coordFilteredCount = out.length; // total filtrado (pre-paginación) — lo lee el botón "Ver N resultados"
  return [...out].sort(sortFn);
}

async function loadCoordinator() {
  if (!currentUser) { showScreen('login'); return; }
  markUserActive();
  showScreen('coordinator');
  document.getElementById('coord-user-name').textContent = currentUser.emoji + ' ' + currentUser.name.split(' ')[0];
  const flagMap = { 'Uruguay': '🇺🇾', 'Brasil': '🇧🇷', 'Panamá': '🇵🇦', 'Guatemala': '🇬🇹', 'México': '🇲🇽' };
  const flag = flagMap[selectedCountry] || '';
  const rolLabel = currentUser.role.includes('Dirección') ? t('coord.brand.direccion') : (esVentas() ? t('coord.brand.ventas') : t('coord.brand.coord'));
  document.getElementById('coord-logo-title').innerHTML = '<svg class="fly-mark" style="color:#00C98D"><use href="#fc-mark"/></svg>FlyClean ' + flag + ' — ' + rolLabel;
  const ceoBtnEl = document.getElementById('coord-ceo-btn');
  if (ceoBtnEl) ceoBtnEl.style.display = currentUser.role.includes('Dirección') ? 'block' : 'none';
  _operarioOptions = null;
  loadAlerts(currentUser.role, 'alerts-banner-coord');
  // Arrancamos en 🏠 Inicio (centro de mando, tab default). setCoordTab deja todo
  // consistente: tab activo, toolbar, month-nav, view-toggle visible y el render.
  const limpiezaTab = document.getElementById('ctab-limpieza');
  if (limpiezaTab) limpiezaTab.style.display = esDireccion() ? '' : 'none';
  // Tab 🗺️ Mapa: SOLO para Ventas (mapa de prospección embebido). NO va en el array de
  // ocultar-para-Ventas de abajo; se muestra explícitamente solo si esVentas().
  const mapaTab = document.getElementById('ctab-mapa');
  if (mapaTab) mapaTab.style.display = esVentas() ? '' : 'none';
  // Rol 🧲 Ventas (spec 2026-07-02 B2 + apertura 2026-07-05): oculta la tab bar salvo 🎯 Prospección,
  // 🗺️ Mapa y 💼 Propuestas (ver+seguimiento — 'propuestas' ya NO está en este array) y arranca en
  // Prospección — nunca ve Servicios/Clientes de cartera/Pedidos/Mensajes. Para Coordinador/
  // Dirección esto es un no-op (queda todo visible igual que antes).
  ['inicio', 'resumen', 'servicios', 'pruebas', 'relevamientos', 'pedidos', 'equipos', 'comunicaciones'].forEach(tb => {
    const el = document.getElementById('ctab-' + tb);
    if (el) el.style.display = esVentas() ? 'none' : '';
  });
  // Mismo blindaje para los botones 💸 Gastos y 📦 Pedidos del header: Ventas no debe
  // poder llegar a ellos ni con un tap directo (además del guard en cada función).
  const gastosBtnEl = document.getElementById('coord-btn-gastos');
  if (gastosBtnEl) gastosBtnEl.style.display = esVentas() ? 'none' : '';
  const pedidosBtnEl = document.getElementById('coord-btn-pedidos');
  if (pedidosBtnEl) pedidosBtnEl.style.display = esVentas() ? 'none' : '';
  setCoordTab(esVentas() ? 'prospeccion' : 'inicio');
}

function getCoordMonthRange() {
  const now = new Date();
  const base = new Date(now.getFullYear(), now.getMonth() + coordMonthOffset, 1);
  const start = base.toISOString().split('T')[0];
  const end = new Date(base.getFullYear(), base.getMonth() + 1, 0).toISOString().split('T')[0];
  const dateLocale = currentLang === 'pt-BR' ? 'pt-BR' : 'es-UY';
  const label = base.toLocaleDateString(dateLocale, { month: 'long', year: 'numeric' });
  return { start, end, label, base };
}

function renderWeekStrip(services) {
  const strip = document.getElementById('coord-week-strip');
  if (!strip) return;
  const { start, end, label, base } = getCoordMonthRange();
  const daysInMonth = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();
  const today = new Date(); today.setHours(0,0,0,0);
  const todayISO = today.toISOString().split('T')[0];
  const serviceDates = {};
  services.forEach(s => { const f = s.properties?.['Fecha programada']?.date?.start; if (f) serviceDates[f] = (serviceDates[f] || 0) + 1; });
  const dayNames = currentLang === 'pt-BR'
    ? ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']
    : ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
  const monthNav = document.getElementById('coord-month-nav');
  if (monthNav) {
    monthNav.classList.add('visible');
    const labelEl = document.getElementById('coord-month-label');
    if (labelEl) labelEl.textContent = label;
  }
  const days = Array.from({length: daysInMonth}, (_, i) => new Date(base.getFullYear(), base.getMonth(), i + 1));
  strip.innerHTML = days.map(d => {
    const iso = d.toISOString().split('T')[0];
    const isActive = selectedCoordDay === iso;
    const isToday = iso === todayISO;
    const count = serviceDates[iso] || 0;
    return `<div class="day-pill ${isActive ? 'active' : ''} ${isToday ? 'is-today' : ''}" onclick="setCoordDay('${iso}')">
      <div class="day-pill-name">${dayNames[d.getDay()]}</div>
      <div class="day-pill-num">${d.getDate()}</div>
      <div class="day-pill-dot">${count > 0 ? '<div class="day-dot"></div>' + (count > 1 ? '<div class="day-dot"></div>' : '') : ''}</div>
    </div>`;
  }).join('') + `<div class="day-pill ${selectedCoordDay === 'all' ? 'active' : ''}" onclick="setCoordDay('all')" style="flex:0 0 52px">
    <div class="day-pill-name">${t('coord.day.all')}</div>
    <div class="day-pill-num" style="font-size:11px;margin-top:4px">▼</div>
    <div class="day-pill-dot"></div>
  </div>`;
  if (selectedCoordDay && selectedCoordDay !== 'all' && (selectedCoordDay < start || selectedCoordDay > end)) {
    selectedCoordDay = 'all';
  }
}

function changeCoordMonth(delta) {
  coordMonthOffset += delta;
  selectedCoordDay = 'all';
  // El month-nav se ve en Inicio + Servicios + Pruebas + Relevamientos. Re-fetch del nuevo mes
  // según la tab activa (cada una aplica su propio filtro de tipo; Inicio no filtra).
  if (activeCoordTab === 'resumen') renderCoordResumen();
  else if (activeCoordTab === 'pruebas') renderCoordPruebas();
  else if (activeCoordTab === 'relevamientos') renderCoordRelevamientos();
  else if (activeCoordTab === 'servicios') renderCoordServicios();
  else renderCoordInicio();
}

function setCoordDay(day) {
  selectedCoordDay = day;
  renderWeekStrip(_coordAllServices);
  // En Inicio respetamos el toggle Lista/Tablero/Calendario; el resto de tabs usa la lista cronológica.
  if (activeCoordTab === 'inicio') renderCoordServiciosView();
  else renderCoordList();
}

function renderCargarMasButton(remaining) {
  if (remaining <= 0) return '';
  const next = Math.min(COORD_PAGE_SIZE, remaining);
  return `<div class="cargar-mas-wrap">
    <button class="cargar-mas-btn" onclick="cargarMasCoord()">↓ ${t('coord.cargar.mas').replace('{n}', next)} · ${t('coord.restantes').replace('{n}', remaining)}</button>
  </div>`;
}

function cargarMasCoord() {
  // Router: delega a finanzas si esa pantalla está activa.
  const finanzasScreen = document.getElementById('screen-finanzas');
  if (finanzasScreen && finanzasScreen.classList.contains('active')) {
    if (typeof cargarMasFinanzas === 'function') cargarMasFinanzas();
    return;
  }
  _coordVisibleLimit += COORD_PAGE_SIZE;
  // Re-render según tab activa, manteniendo el limit incrementado.
  if (activeCoordTab === 'propuestas') renderCoordPropuestasList(true);
  else if (activeCoordTab === 'contactos') renderContactList(_coordAllContacts, true);
  else renderCoordList(true);
}

// Toggle Lista / Tablero (solo pestaña Inicio). Persiste la elección y re-renderiza.
function setCoordView(v) {
  _coordView = v;
  localStorage.setItem('fc_coord_view', v);
  markUserActive();
  renderCoordServiciosView();
}

// Render del control segmentado + del cuerpo (lista o tablero) según _coordView.
// Solo se usa desde la pestaña Inicio; Pruebas y Relevamientos siguen usando renderCoordList directo.
function renderCoordServiciosView() {
  _kbColLimits = {}; // reset del paginado por columna del tablero al cambiar vista/filtros/mes
  const toggle = document.getElementById('coord-view-toggle');
  if (toggle) {
    toggle.style.display = 'flex';
    toggle.innerHTML =
      `<button class="${_coordView === 'list' ? 'active' : ''}" onclick="setCoordView('list')">📋 Lista</button>` +
      `<button class="${_coordView === 'board' ? 'active' : ''}" onclick="setCoordView('board')">▣ Tablero</button>` +
      `<button class="${_coordView === 'calendar' ? 'active' : ''}" onclick="setCoordView('calendar')">📅 Calendario</button>`;
  }
  // La tira de días (week-strip) se quitó (2026-07-06): en todas las vistas la referencia temporal
  // es la agrupación por fecha (headers Hoy/8 jul…) + el navegador de mes ‹ ›. La ocultamos siempre.
  const strip = document.getElementById('coord-week-strip');
  if (strip) strip.style.display = 'none';
  if (_coordView === 'board') renderCoordKanban();
  else if (_coordView === 'calendar') renderCoordCalendar();
  else renderCoordList();
}

// Vista Calendario — grilla mensual de 7 columnas (estilo Notion básico). Usa el mes activo
// (coordMonthOffset, vía getCoordMonthRange), respeta los filtros del coord y linkea cada
// evento a openEditSheet. Pinta en #coord-content (scroll vertical natural del contenedor).
function renderCoordCalendar() {
  const content = document.getElementById('coord-content');
  if (!content) return;
  const { base } = getCoordMonthRange();
  const y = base.getFullYear();
  const m = base.getMonth();

  // Filtramos con los mismos filtros que list/board y agrupamos por Fecha programada.
  const items = applyCoordFilters(_coordAllServices, { isProps: false });
  const byDay = {};
  items.forEach(s => {
    const f = s.properties?.['Fecha programada']?.date?.start;
    if (!f) return;
    (byDay[f] = byDay[f] || []).push(s);
  });
  // Orden dentro de cada día por hora programada (sin hora va al final).
  const horaOf = s => {
    const h = s.properties?.['Hora Inicio']?.date?.start;
    return h ? new Date(h).toTimeString().slice(0, 5) : '';
  };
  // Orden por hora ascendente; los sin hora ('') van al final (sentinel '99:99' solo para ordenar).
  const sortKey = s => horaOf(s) || '99:99';
  Object.values(byDay).forEach(arr => arr.sort((a, b) => sortKey(a).localeCompare(sortKey(b))));

  const dayNames = currentLang === 'pt-BR'
    ? ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
    : ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  const firstWeekday = new Date(y, m, 1).getDay(); // 0=Dom
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todayISO = today.toISOString().split('T')[0];

  const pad = n => String(n).padStart(2, '0');

  const headHTML = dayNames.map(d => `<div class="cal-weekday">${d}</div>`).join('');

  let cellsHTML = '';
  // Celdas vacías para alinear el día 1 con su columna de semana.
  for (let i = 0; i < firstWeekday; i++) cellsHTML += `<div class="cal-cell empty"></div>`;

  for (let day = 1; day <= daysInMonth; day++) {
    const iso = `${y}-${pad(m + 1)}-${pad(day)}`;
    const isToday = iso === todayISO;
    const evts = byDay[iso] || [];
    const MAX = 3;
    const shown = evts.slice(0, MAX);
    const more = evts.length - shown.length;

    const eventsHTML = shown.map(s => {
      const estado = s.properties?.['Estado']?.select?.name || '';
      const cls = getEstadoClass(estado);
      const nombre = s.properties?.['Nombre del servicio']?.title?.[0]?.plain_text || '(sin nombre)';
      const hora = horaOf(s);
      const horaTxt = hora ? `<span class="cal-event-time">${hora}</span> ` : '';
      return `<button type="button" class="cal-event ${cls}" onclick="openEditSheet('${esc(s.id)}')">${horaTxt}${esc(nombre)}</button>`;
    }).join('');
    const moreHTML = more > 0 ? `<div class="cal-more">+${more} más</div>` : '';

    cellsHTML += `<div class="cal-cell${isToday ? ' today' : ''}">
      <div class="cal-daynum">${day}</div>
      ${eventsHTML}${moreHTML}
    </div>`;
  }

  content.innerHTML = `<div class="cal-grid cal-head">${headHTML}</div><div class="cal-grid cal-body">${cellsHTML}</div>`;
}

// Estados del Kanban en orden fijo (con emoji, como se guardan en Notion). Única fuente
// de verdad para las columnas del tablero + la hoja "Mover a". Cada uno trae el "núcleo"
// para matchear con includes() y tolerar variaciones de emoji en el valor guardado.
const KANBAN_ESTADOS = [
  { estado: '📋 Pendiente',  core: 'Pendiente'  },
  { estado: '🔄 Asignado',   core: 'Asignado'   },
  { estado: '✈️ En curso',   core: 'curso'      },
  { estado: '✅ Completado', core: 'Completado' },
  { estado: '❌ Cancelado',  core: 'Cancelado'  },
];

// Tablero (Kanban) base — Tarea 1: 5 columnas por estado, scroll horizontal, SIN arrastre.
// El cambio de estado se hace por toque con la hoja "Mover a" (Tarea 2).
// Límite de tarjetas visibles por columna del tablero (paginado "Ver más", de a COORD_PAGE_SIZE).
// Se resetea en renderCoordServiciosView (al cambiar vista/filtros/mes); verMasKanban lo sube.
let _kbColLimits = {};
function verMasKanban(core) {
  _kbColLimits[core] = (_kbColLimits[core] || COORD_PAGE_SIZE) + COORD_PAGE_SIZE;
  renderCoordKanban();
}
function renderCoordKanban() {
  const content = document.getElementById('coord-content');
  if (!content) return;
  const items = applyCoordFilters(_coordAllServices, { isProps: false });

  // 5 columnas en orden fijo (única fuente de verdad: KANBAN_ESTADOS). El "núcleo"
  // se matchea con includes() para tolerar variaciones de emoji en el valor guardado.
  const columns = KANBAN_ESTADOS;
  const buckets = columns.map(() => []);

  items.forEach(it => {
    const estado = it.properties?.['Estado']?.select?.name || '';
    let idx = columns.findIndex(c => estado.includes(c.core));
    if (idx === -1) idx = 0; // sin estado / desconocido → Pendiente
    buckets[idx].push(it);
  });

  const cols = columns.map((c, i) => {
    const list = buckets[i];
    // Paginado por columna: mostramos hasta el límite (15 por defecto) + botón "Ver más".
    const lim = _kbColLimits[c.core] || COORD_PAGE_SIZE;
    const shown = list.slice(0, lim);
    const remaining = list.length - shown.length;
    const cardsHTML = list.length
      ? shown.map(s => `<div class="kb-card" data-id="${esc(s.id)}" data-estado="${esc(c.estado)}">` +
          // Botón "Mover" discreto en la esquina; stopPropagation evita disparar openEditSheet de la card.
          `<button class="kb-move-btn" title="Mover a otro estado" onclick="event.stopPropagation(); openMoverEstado('${esc(s.id)}')">↔</button>` +
          coordServiceCard(s) +
        `</div>`).join('')
        + (remaining > 0 ? `<button class="cargar-mas-btn kb-mas-btn" onclick="verMasKanban('${esc(c.core)}')">↓ Ver ${Math.min(COORD_PAGE_SIZE, remaining)} más · quedan ${remaining}</button>` : '')
      : `<div class="kb-col-empty">Sin servicios</div>`;
    return `<div class="kb-col" data-estado="${esc(c.estado)}">
      <div class="kb-col-head">${esc(c.estado)} <span class="kb-count">(${list.length})</span></div>
      ${cardsHTML}
    </div>`;
  }).join('');

  // Preservar el scroll al re-pintar: tras mover una card (drop o "Mover a") el board se
  // reconstruye con innerHTML → el scroll horizontal del tablero y el vertical de cada
  // columna se resetean. Capturamos ANTES y restauramos DESPUÉS por data-estado.
  const prevBoard = content.querySelector('.kb-board');
  let prevScrollLeft = 0;
  const prevColScroll = {};
  if (prevBoard) {
    prevScrollLeft = prevBoard.scrollLeft;
    prevBoard.querySelectorAll('.kb-col').forEach(col => {
      const est = col.getAttribute('data-estado');
      if (est != null) prevColScroll[est] = col.scrollTop;
    });
  }

  content.innerHTML = `<div class="kb-board">${cols}</div>`;

  if (prevBoard) {
    const newBoard = content.querySelector('.kb-board');
    if (newBoard) {
      newBoard.scrollLeft = prevScrollLeft;
      newBoard.querySelectorAll('.kb-col').forEach(col => {
        const est = col.getAttribute('data-estado');
        if (est != null && prevColScroll[est] != null) col.scrollTop = prevColScroll[est];
      });
    }
  }
}

// Núcleo del cambio de estado (lo reusa la Tarea 3 de arrastre). Optimista: actualiza
// _coordAllServices + re-pinta el tablero al instante; persiste con cola offline.
// Errores de red NO revierten (quedan encolados); un error "duro" sí revierte + avisa.
async function cambiarEstadoServicio(id, nuevoEstado) {
  const item = (_coordAllServices || []).find(s => s.id === id);
  if (!item) return;
  const estadoActual = item.properties?.['Estado']?.select?.name || '';
  if (estadoActual === nuevoEstado) return; // sin cambios

  // Update optimista
  if (!item.properties) item.properties = {};
  item.properties['Estado'] = { select: { name: nuevoEstado } };
  renderCoordKanban(); // la card salta de columna y los contadores se recalculan solos
  markUserActive();

  try {
    await queueableUpdateServiceProps(id, { 'Estado': { select: { name: nuevoEstado } } });
  } catch (e) {
    // Solo llega acá con error "duro" (no de red — esos los encola queueableUpdateServiceProps).
    // Revertimos el optimista y avisamos.
    if (estadoActual) item.properties['Estado'] = { select: { name: estadoActual } };
    else delete item.properties['Estado'];
    renderCoordKanban();
    console.error('[kanban] no se pudo cambiar el estado:', e);
    alert('No se pudo cambiar el estado. Probá de nuevo.');
  }
}

// Hoja "Mover a": elige el estado destino del servicio. Overlay SIBLING del body
// (regla del proyecto: los modales deben ser hijos directos de body para que
// position:fixed funcione). Se crea on-demand.
function ensureMoverEstadoOverlay() {
  let ov = document.getElementById('mover-estado-overlay');
  if (!ov) {
    ov = document.createElement('div');
    ov.id = 'mover-estado-overlay';
    ov.className = 'edit-overlay';
    ov.onclick = moverEstadoOverlayClick;
    ov.innerHTML = `<div class="edit-sheet" id="mover-estado-sheet">
      <button class="sheet-close-btn" type="button" aria-label="Cerrar" onclick="closeMoverEstado()">×</button>
      <div class="edit-sheet-handle"></div>
      <div class="edit-sheet-header">
        <div class="edit-sheet-title">↔ Mover a</div>
        <div class="edit-sheet-sub" id="mover-estado-sub"></div>
      </div>
      <div id="mover-estado-body" style="padding:16px 20px 8px"></div>
    </div>`;
    document.body.appendChild(ov);
  }
  return ov;
}

function openMoverEstado(id) {
  const svc = (_coordAllServices || []).find(s => s.id === id);
  if (!svc) return;
  const ov = ensureMoverEstadoOverlay();
  const nombre = svc.properties?.['Nombre del servicio']?.title?.[0]?.plain_text || '';
  const actual = svc.properties?.['Estado']?.select?.name || '';
  const sub = document.getElementById('mover-estado-sub');
  if (sub) sub.textContent = nombre ? `${nombre} — elegí el nuevo estado` : 'Elegí el nuevo estado';
  const body = document.getElementById('mover-estado-body');
  if (body) {
    body.innerHTML = KANBAN_ESTADOS.map(c => {
      // Resaltamos (check + deshabilitado) el estado actual del servicio.
      const esActual = actual.includes(c.core);
      return `<button class="mover-estado-btn ${esActual ? 'current' : ''}" ${esActual ? 'disabled' : ''}` +
        ` onclick="seleccionarMoverEstado('${esc(id)}','${esc(c.estado)}')">` +
        `<span>${esc(c.estado)}</span>${esActual ? '<span class="mover-estado-check">✓</span>' : ''}</button>`;
    }).join('');
  }
  ov.classList.add('open');
  markUserActive();
}

function seleccionarMoverEstado(id, estado) {
  closeMoverEstado();
  cambiarEstadoServicio(id, estado);
}

function closeMoverEstado() {
  const ov = document.getElementById('mover-estado-overlay');
  if (ov) ov.classList.remove('open');
}

function moverEstadoOverlayClick(e) {
  if (e.target.id === 'mover-estado-overlay') closeMoverEstado();
}

// ── Tarea 3 — Arrastre long-press de cards del Kanban entre columnas ───────────
// Mecánica mobile: long-press (~250ms quieto) para "agarrar" la card; si el dedo se
// mueve >10px ANTES del timer, es scroll de columnas (no se agarra). Tap sin agarrar
// = se deja pasar el onclick normal (openEditSheet). Al soltar sobre otra columna →
// se REUSA cambiarEstadoServicio(id, estadoDestino) (única lógica de escritura).
// Listeners de move/up/cancel se enganchan en window SOLO durante el gesto y se
// remueven SIEMPRE al terminar (sin listeners colgados). Un único pointerdown
// delegado en document filtra por .kb-board (el board se re-renderiza con innerHTML).
const KB_HOLD_MS = 250;     // long-press para agarrar
const KB_MOVE_TOL = 10;     // px: deslizar más que esto antes del timer = scroll
const KB_EDGE = 48;         // px: zona de auto-scroll cerca del borde del board
const KB_EDGE_SPEED = 14;   // px por frame de auto-scroll

let _kbDrag = null; // estado del gesto en curso (null si no hay)

function kbCleanupDrag() {
  if (!_kbDrag) return;
  const d = _kbDrag;
  if (d.holdTimer) clearTimeout(d.holdTimer);
  if (d.rafId) cancelAnimationFrame(d.rafId);
  if (d.ghost && d.ghost.parentNode) d.ghost.parentNode.removeChild(d.ghost);
  if (d.card) d.card.classList.remove('dragging');
  if (d.dropTarget) d.dropTarget.classList.remove('drop-target');
  // Soltar pointer capture si lo tomamos
  if (d.captureEl && d.pointerId != null) {
    try { d.captureEl.releasePointerCapture(d.pointerId); } catch (_) {}
  }
  window.removeEventListener('pointermove', kbOnPointerMove, { passive: false });
  window.removeEventListener('pointerup', kbOnPointerUp, true);
  window.removeEventListener('pointercancel', kbOnPointerCancel, true);
  _kbDrag = null;
}

// Crea el clon flotante que sigue al dedo.
function kbMakeGhost(card, x, y) {
  const rect = card.getBoundingClientRect();
  const ghost = card.cloneNode(true);
  ghost.classList.add('kb-ghost');
  ghost.classList.remove('dragging');
  ghost.style.width = rect.width + 'px';
  ghost.style.left = rect.left + 'px';
  ghost.style.top = rect.top + 'px';
  // Offset del dedo dentro de la card, para que no "salte" al agarrar.
  _kbDrag.offX = x - rect.left;
  _kbDrag.offY = y - rect.top;
  document.body.appendChild(ghost);
  return ghost;
}

// Loop de auto-scroll horizontal mientras el dedo está cerca de un borde del board.
function kbAutoScrollTick() {
  const d = _kbDrag;
  if (!d || !d.grabbed || !d.board) return;
  const r = d.board.getBoundingClientRect();
  let dx = 0;
  if (d.lastX < r.left + KB_EDGE) dx = -KB_EDGE_SPEED;
  else if (d.lastX > r.right - KB_EDGE) dx = KB_EDGE_SPEED;
  if (dx !== 0) d.board.scrollLeft += dx;
  d.rafId = requestAnimationFrame(kbAutoScrollTick);
}

function kbOnPointerDown(e) {
  // Solo gesto primario táctil/mouse, no si ya hay uno en curso.
  if (_kbDrag) return;
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  const card = e.target.closest && e.target.closest('.kb-card');
  if (!card) return;
  const board = card.closest('.kb-board');
  if (!board) return;
  // No agarrar si el toque arranca sobre el botón "Mover" (tiene su propia acción).
  if (e.target.closest('.kb-move-btn')) return;

  _kbDrag = {
    card, board,
    id: card.getAttribute('data-id'),
    estadoActual: card.getAttribute('data-estado') || '',
    startX: e.clientX, startY: e.clientY,
    lastX: e.clientX, lastY: e.clientY,
    pointerId: e.pointerId,
    captureEl: board,
    grabbed: false, ghost: null, dropTarget: null,
    offX: 0, offY: 0, holdTimer: null, rafId: null,
  };

  // Timer de long-press: si el dedo sigue quieto al dispararse → agarramos.
  _kbDrag.holdTimer = setTimeout(() => {
    const d = _kbDrag;
    if (!d || d.grabbed) return;
    d.grabbed = true;
    d.holdTimer = null;
    if (navigator.vibrate) { try { navigator.vibrate(15); } catch (_) {} }
    d.card.classList.add('dragging');
    d.ghost = kbMakeGhost(d.card, d.lastX, d.lastY);
    // Capturamos el pointer para seguir recibiendo move/up aunque salga del board.
    try { d.captureEl.setPointerCapture(d.pointerId); } catch (_) {}
    // Arrancamos el loop de auto-scroll (no scrollea hasta estar cerca de un borde).
    d.rafId = requestAnimationFrame(kbAutoScrollTick);
  }, KB_HOLD_MS);

  // move debe ser {passive:false} para poder preventDefault una vez agarrado.
  window.addEventListener('pointermove', kbOnPointerMove, { passive: false });
  window.addEventListener('pointerup', kbOnPointerUp, true);
  window.addEventListener('pointercancel', kbOnPointerCancel, true);
}

function kbOnPointerMove(e) {
  const d = _kbDrag;
  if (!d) return;
  d.lastX = e.clientX;
  d.lastY = e.clientY;

  if (!d.grabbed) {
    // Antes de agarrar: si se desliza más que la tolerancia, es scroll → cancelamos
    // el timer y abandonamos el gesto (dejamos que el board scrollee normal).
    if (Math.abs(e.clientX - d.startX) > KB_MOVE_TOL || Math.abs(e.clientY - d.startY) > KB_MOVE_TOL) {
      kbCleanupDrag();
    }
    return;
  }

  // Agarrado: evitamos que el board scrollee con el dedo y movemos el ghost.
  e.preventDefault();
  if (d.ghost) {
    d.ghost.style.left = (e.clientX - d.offX) + 'px';
    d.ghost.style.top = (e.clientY - d.offY) + 'px';
  }
  // Detectar columna bajo el dedo (el ghost tiene pointer-events:none, no estorba).
  const col = document.elementFromPoint(e.clientX, e.clientY);
  const targetCol = col && col.closest ? col.closest('.kb-col') : null;
  if (targetCol !== d.dropTarget) {
    if (d.dropTarget) d.dropTarget.classList.remove('drop-target');
    d.dropTarget = targetCol || null;
    // Resaltar solo si es una columna distinta a la del estado actual.
    if (d.dropTarget && (d.dropTarget.getAttribute('data-estado') || '') !== d.estadoActual) {
      d.dropTarget.classList.add('drop-target');
    } else if (d.dropTarget) {
      // Misma columna: no resaltar como destino válido.
      d.dropTarget.classList.remove('drop-target');
    }
  }
}

// Resuelve el drop: devuelve el estado destino válido o null. Extraído para poder
// testearlo sin un gesto real (recibe la columna destino y el estado actual).
function kbResolveDrop(targetCol, estadoActual) {
  if (!targetCol) return null;
  const destino = targetCol.getAttribute ? (targetCol.getAttribute('data-estado') || '') : '';
  if (!destino || destino === estadoActual) return null;
  return destino;
}

function kbOnPointerUp() {
  const d = _kbDrag;
  if (!d) return;
  const grabbed = d.grabbed;
  const id = d.id;
  const estadoActual = d.estadoActual;
  const dropTarget = d.dropTarget;
  // Limpiamos PRIMERO (saca ghost / dragging / drop-target / listeners) para que el
  // re-render de cambiarEstadoServicio pinte sobre un DOM ya limpio.
  kbCleanupDrag();
  if (!grabbed) return; // fue un tap (o scroll abortado): dejamos pasar el onclick normal
  // Hubo grab: el navegador disparará un click sintético sobre la card (incluso si se
  // soltó en el mismo lugar, sin mover >10px → la guarda global _gMoved no se activa).
  // Lo suprimimos acá, robustamente, para que soltar la card NO abra el edit sheet.
  kbSuppressNextClick();
  const destino = kbResolveDrop(dropTarget, estadoActual);
  if (destino) cambiarEstadoServicio(id, destino);
}

function kbOnPointerCancel() {
  // Abortar limpio (igual que soltar fuera): no se cambia estado.
  kbCleanupDrag();
}

// Suprime el click sintético que el navegador dispara después de un pointerup tras un grab,
// para que soltar una card (aunque sea en el mismo lugar) NO abra el edit sheet.
function kbSuppressNextClick() {
  function eat(ev) { ev.stopPropagation(); ev.preventDefault(); cleanup(); }
  function cleanup() { window.removeEventListener('click', eat, true); clearTimeout(tid); }
  const tid = setTimeout(cleanup, 500); // red de seguridad por si no llega ningún click
  window.addEventListener('click', eat, true);
}

// Un único pointerdown delegado en document (capture) filtrado a .kb-board, porque
// el board se re-renderiza con innerHTML y los listeners por-card se perderían.
document.addEventListener('pointerdown', kbOnPointerDown, true);

function renderCoordList(keepLimit) {
  if (!keepLimit) _coordVisibleLimit = COORD_PAGE_SIZE;
  // El nombre del cliente en las cards sale del mapa id→nombre (una carga, cacheada). Si aún no está,
  // lo pedimos y re-renderizamos cuando llega (fire-and-forget; reintenta en el próximo render si falla).
  if (!_clienteNombreById && !_clienteNombresLoading) {
    _clienteNombresLoading = true;
    // re-render con keepLimit=true → no colapsa el "cargar más" que el usuario haya expandido mientras cargaba.
    ensureClienteNombres().finally(() => { _clienteNombresLoading = false; if (_clienteNombreById) renderCoordList(true); });
  }
  const content = document.getElementById('coord-content');
  const dateLocale = currentLang === 'pt-BR' ? 'pt-BR' : 'es-UY';
  const isRelevTab = activeCoordTab === 'relevamientos';
  const isPruebasTab = activeCoordTab === 'pruebas';
  const emptyMonthKey = isPruebasTab ? 'coord.empty.month.pruebas' : isRelevTab ? 'coord.empty.month.relev' : 'coord.empty.month';

  const nuevoTrabajoBtn = activeCoordTab === 'servicios'
    ? `<div style="padding:12px 16px 0"><button class="nueva-prop-btn" onclick="openNewServiceSheet()">${t('coord.new.servicio')}</button></div>`
    : '';

  const filteredAll = applyCoordFilters(_coordAllServices, { isProps: false });
  if (!filteredAll.length) {
    content.innerHTML = nuevoTrabajoBtn + `<div class="coord-empty">${getActiveFilterCount() ? '🔎 Sin resultados para los filtros actuales' : t(emptyMonthKey)}</div>`;
    return;
  }
  const total = filteredAll.length;
  const filtered = filteredAll.slice(0, _coordVisibleLimit);
  const remaining = total - filtered.length;

  // La FECHA agrupa las cards (encabezado por día exacto: 📍 Hoy · 8 jul / ⏭ Mañana · 9 jul / 10 jul…)
  // cuando el sort es cronológico. Con sort alfabético = lista plana sin headers. El orden (asc/desc) ya
  // lo aplicó applyCoordFilters, así que groupServicesByDay solo agrupa preservándolo; "sin fecha" al final.
  const isChronological = coordFilters.sort === 'date-asc' || coordFilters.sort === 'date-desc';
  if (!isChronological) {
    content.innerHTML = nuevoTrabajoBtn + '<div class="day-group">' + filtered.map(coordServiceCard).join('') + '</div>' + renderCargarMasButton(remaining);
    return;
  }
  const html = groupServicesByDay(filtered).map(g =>
    `<div class="day-group"><div class="day-label ${g.isHoy ? 'today' : ''}">${g.label} (${g.items.length})</div>${g.items.map(coordServiceCard).join('')}</div>`
  ).join('');
  content.innerHTML = nuevoTrabajoBtn + (html || `<div class="coord-empty">${t(emptyMonthKey)}</div>`) + renderCargarMasButton(remaining);
}

function extractServiceFiles(props) {
  const collect = (key) => {
    const files = props[key]?.files || [];
    return files.map(f => f.external?.url || f.file?.url).filter(Boolean);
  };
  return {
    pre: collect('📸 Fotos pre-servicio'),
    post: collect('📸 Fotos post-servicio'),
    relevamiento: collect('📸 Fotos relevamiento')
  };
}

// ── Visor de fotos (lightbox) — navegación ◀▶, secciones y manejo del error de conexión (2026-07-14) ──
let _pv = { fotos: [], idx: 0, x0: null };
let _pvSets = {}, _pvSetSeq = 0;
function _pvRegister(fotos) { if (_pvSetSeq > 800) { _pvSets = {}; } const k = 'pv' + (_pvSetSeq++); _pvSets[k] = fotos; return k; }
function seccionLabel(fotoType) {
  return fotoType === 'post' ? t('foto.sec.despues') : fotoType === 'relevamiento' ? t('foto.sec.relev') : t('foto.sec.antes');
}
function openPhotoViewer(fotos, startIdx) {
  fotos = (fotos || []).filter(f => f && f.url);
  if (!fotos.length) return;
  _pv = { fotos, idx: Math.max(0, Math.min(startIdx || 0, fotos.length - 1)), x0: null };
  const ov = document.getElementById('photo-viewer-overlay');
  if (!ov._pvBound) {
    ov._pvBound = true;
    const stage = document.getElementById('pv-stage');
    stage.addEventListener('touchstart', e => { _pv.x0 = e.touches[0].clientX; }, { passive: true });
    stage.addEventListener('touchend', e => { if (_pv.x0 == null) return; const dx = e.changedTouches[0].clientX - _pv.x0; if (Math.abs(dx) > 45) pvNav(dx < 0 ? 1 : -1); _pv.x0 = null; }, { passive: true });
    ov.addEventListener('click', e => { if (e.target === ov) closePhotoViewer(); }); // tocar el fondo cierra
  }
  ov.classList.add('open');
  renderPhotoViewer();
  document.addEventListener('keydown', _pvKey);
}
function closePhotoViewer() {
  document.getElementById('photo-viewer-overlay').classList.remove('open');
  document.removeEventListener('keydown', _pvKey);
  _pv = { fotos: [], idx: 0, x0: null };
}
function _pvKey(e) {
  if (e.key === 'ArrowLeft') pvNav(-1);
  else if (e.key === 'ArrowRight') pvNav(1);
  else if (e.key === 'Escape') closePhotoViewer();
}
function pvNav(d) {
  if (_pv.fotos.length < 2) return;
  _pv.idx = (_pv.idx + d + _pv.fotos.length) % _pv.fotos.length;
  renderPhotoViewer();
}
function pvRetry() {
  const img = document.getElementById('pv-img'); const f = _pv.fotos[_pv.idx];
  if (!img || !f) return;
  document.getElementById('pv-stage').classList.remove('pv-failed');
  const n = parseInt(img.dataset.r || '0', 10) + 1; img.dataset.r = n;
  img.src = f.url + (f.url.includes('?') ? '&' : '?') + 'r=' + n;
}
function renderPhotoViewer() {
  const f = _pv.fotos[_pv.idx]; if (!f) return;
  const img = document.getElementById('pv-img');
  document.getElementById('pv-stage').classList.remove('pv-failed');
  img.dataset.r = '0'; img.src = f.url;
  document.getElementById('pv-caption').innerHTML = esc(f.seccion || '') + ' <span class="pv-count">· ' + (_pv.idx + 1) + ' / ' + _pv.fotos.length + '</span>';
  const multi = _pv.fotos.length > 1;
  document.getElementById('pv-prev').style.display = multi ? '' : 'none';
  document.getElementById('pv-next').style.display = multi ? '' : 'none';
}
// Abre el visor con TODAS las fotos de una galería, leyendo los thumbs del DOM (sin estado global).
function openGalleryViewer(a) {
  const gallery = a.closest('.photo-gallery') || a.parentElement;
  const thumbs = [...gallery.querySelectorAll('a[data-url]')];
  const fotos = thumbs.map(el => ({ url: el.dataset.url, seccion: el.dataset.seccion || '' }));
  openPhotoViewer(fotos, Math.max(0, thumbs.indexOf(a)));
}

function renderPhotoGallery(props) {
  const files = extractServiceFiles(props);
  const px = (url) => '/api/img?u=' + encodeURIComponent(url);
  // Secciones SEPARADAS (antes / después / relevamiento) — antes iban todas mezcladas en una fila.
  const secs = [
    { label: t('foto.sec.antes'), urls: files.pre },
    { label: t('foto.sec.despues'), urls: files.post },
    { label: t('foto.sec.relev'), urls: files.relevamiento },
  ].filter(s => s.urls.length);
  const total = secs.reduce((n, s) => n + s.urls.length, 0);
  if (!total) return '';
  // Cada thumb abre el VISOR (no una pestaña nueva); el <img> carga perezoso al desplegar. La sección va en data-*.
  const groups = secs.map(s => {
    const thumbs = s.urls.map(url => `<a data-url="${px(url)}" data-seccion="${esc(s.label)}" onclick="openGalleryViewer(this);event.stopPropagation()"><img loading="lazy" data-src="${px(url)}" alt=""></a>`).join('');
    return `<div class="pg-sec-label">${esc(s.label)} · ${s.urls.length}</div>${thumbs}`;
  }).join('');
  return `<div class="photo-collapse">` +
    `<button type="button" class="photo-toggle" onclick="togglePhotos(this, event)">📷 ${t('foto.vertodas')} (${total}) <span class="photo-arrow">▾</span></button>` +
    `<div class="photo-gallery" style="display:none">${groups}</div>` +
    `</div>`;
}

// Miniatura de la primera foto a la DERECHA de la card (2026-07-06, pedido Diego): en vez del
// desplegable "Ver fotos" que agrandaba la card, una miniatura del alto de la card (NO la agranda).
// A la derecha (order:2 en CSS) para que el texto de todas las cards quede alineado (con y sin foto).
// Carga lazy (solo las visibles) y chica → no enlentece la lista. Tocarla abre la foto en pestaña
// nueva; "+N" si hay más (el resto se ve al abrir el servicio). Reemplaza renderPhotoGallery en las cards.
function coordCardThumb(props) {
  const files = extractServiceFiles(props);
  const px = (u) => '/api/img?u=' + encodeURIComponent(u);
  const fotos = [
    ...files.pre.map(u => ({ url: px(u), seccion: t('foto.sec.antes') })),
    ...files.post.map(u => ({ url: px(u), seccion: t('foto.sec.despues') })),
    ...files.relevamiento.map(u => ({ url: px(u), seccion: t('foto.sec.relev') })),
  ];
  if (!fotos.length) return '';
  // Tocar la miniatura abre el VISOR con TODAS las fotos del servicio (antes: abría 1 en pestaña nueva).
  const key = _pvRegister(fotos);
  const more = fotos.length > 1 ? `<span class="thumb-more">+${fotos.length - 1}</span>` : '';
  return `<a class="coord-card-thumb" style="cursor:zoom-in" onclick="event.stopPropagation();openPhotoViewer(_pvSets['${key}'],0)"><img loading="lazy" src="${fotos[0].url}" alt="">${more}</a>`;
}

function togglePhotos(btn, ev) {
  ev.stopPropagation(); ev.preventDefault();
  const g = btn.nextElementSibling;
  if (!g) return;
  const open = g.style.display === 'none';
  g.style.display = open ? 'flex' : 'none';
  const arrow = btn.querySelector('.photo-arrow');
  if (arrow) arrow.textContent = open ? '▴' : '▾';
  if (open) g.querySelectorAll('img[data-src]').forEach(im => { im.src = im.dataset.src; im.removeAttribute('data-src'); });
}

// ── Agrupación de jornadas por "trabajo madre" (LEE la relación Orden madre) ──
// Un trabajo multi-día = varias fichas que comparten la misma raíz (Orden madre, o la ficha misma si es J1).
function jobRootId(svc) {
  const p = svc?.properties || {};
  return p['Orden madre']?.relation?.[0]?.id || svc?.id;
}
function jobGroup(svc, pool) {
  const root = jobRootId(svc);
  if (!root) return svc ? [svc] : [];
  return (pool || []).filter(f => f.id === root || (f.properties?.['Orden madre']?.relation?.[0]?.id === root));
}
// El trabajo está "completo" si alguna ficha del grupo quedó Completada al 100% (la jornada final).
function jobCompleto(svc, pool) {
  return jobGroup(svc, pool).some(f => (f.properties?.['Estado']?.select?.name || '').includes('Completado') && f.properties?.['% de avance']?.number === 100);
}

function coordServiceCard(s) {
  const props = s.properties || {};
  const nombreRaw = props['Nombre del servicio']?.title?.[0]?.plain_text;
  let nombreHTML;
  if (nombreRaw) {
    nombreHTML = esc(nombreRaw);
  } else {
    const idShort = esc((s.id || '').slice(0, 8));
    nombreHTML = `<span style="color:#c67e25">⚠️ Servicio sin nombre (${idShort})</span>`;
    console.warn('[fc] coord: servicio sin nombre', s.id, 'properties keys:', Object.keys(props));
  }
  const estado = props['Estado']?.select?.name || '';
  const tipo = tipoServicioStr(props);
  const operarioAppName = props['Operario App']?.select?.name || '';
  const legacyOpsNames = (props['Operario(s)']?.people || []).map(p => p.name).join(', ');
  const participantes = (props['Operarios participantes']?.multi_select || []).map(o => o.name);
  const baseOp = operarioAppName || legacyOpsNames || t('coord.unassigned');
  const ops = participantes.length > 0
    ? `${esc(baseOp)} <span style="color:var(--text3);font-size:11px">+${participantes.length} ayudante${participantes.length > 1 ? 's' : ''}</span>`
    : esc(baseOp);
  const jornadaN = props['Jornada N°']?.number;
  const tipoReg = props['Tipo de registro']?.select?.name || '';
  const esJornada = jornadaN != null || tipoReg.includes('Jornada');
  const esPrueba = tipoReg.includes('Prueba');
  const esRelev = tipoReg.includes('Relevamiento');
  const pctAvance = props['% de avance']?.number;
  // Marca "fuera de fecha": si la fecha planificada original difiere de la programada actual (se inició otro día).
  const _fPlan = (props['Fecha planificada']?.date?.start || '').split('T')[0];
  const _fProg = (props['Fecha programada']?.date?.start || '').split('T')[0];
  const fueraDeFecha = !!_fPlan && !!_fProg && _fPlan !== _fProg;
  const fPlanFmt = fueraDeFecha ? `${_fPlan.slice(8, 10)}/${_fPlan.slice(5, 7)}` : '';
  // Chip de tipo: SOLO en 🏠 Inicio, donde conviven los 4 tipos en una misma lista.
  // En las otras tabs todas las cards son del mismo tipo → el chip sería ruido.
  // Para Prueba NO agregamos chip: ya lleva su badge rosa PRUEBA (evita doble distintivo).
  let tipoChip = '';
  if (activeCoordTab === 'inicio' && !esPrueba) {
    if (esRelev) tipoChip = '<span class="coord-tipo-chip">🔍 Relevamiento</span>';
    else if (esJornada) tipoChip = '<span class="coord-tipo-chip">🗓️ Jornada</span>';
    else tipoChip = '<span class="coord-tipo-chip">🏢 Servicio</span>';
  }
  const horaInicio = props['Hora Inicio']?.date?.start || '';
  const horaFmt = (horaInicio && horaInicio.includes('T')) ? new Date(horaInicio).toTimeString().slice(0, 5) : '';
  const lugar = props['Lugar']?.rich_text?.[0]?.plain_text || '';
  const estadoClass = estado.includes('Completado') ? 'estado-completado' : estado.includes('En curso') ? 'estado-en-curso' : estado.includes('Asignado') ? 'estado-asignado' : 'estado-pendiente';
  // Etiqueta por día: una jornada completada se lee "🗓️ Jornada N completada" (conserva el color verde).
  const estadoDisplay = (esJornada && jornadaN != null && estado.includes('Completado')) ? t('estado.jornada.completada').replace('{n}', jornadaN) : estado;
  // Badge "Servicio completo": el trabajo entero (grupo de jornadas) llegó al 100% (calculado agrupando).
  const jobDone = jobCompleto(s, _coordAllServices);
  const thumb = coordCardThumb(props);
  // Cliente: id sin resolver (mapa aún cargando) → blanco (no mentir "sin cliente"); sin id → placeholder.
  const contactoId = props['Contacto']?.relation?.[0]?.id || props['Contactos']?.relation?.[0]?.id || '';
  const _cli = clienteNombreDe(contactoId);
  const cliLine = contactoId
    ? (_cli ? `<div class="coord-cliente" style="font-size:12px;color:var(--text2);margin-top:1px">🏢 ${esc(_cli)}</div>` : '')
    : `<div class="coord-cliente" style="font-size:12px;color:var(--amber,#f59e0b);margin-top:1px">${t('svc.cliente.placeholder')}</div>`;
  return `<div class="coord-service-card${thumb ? ' has-thumb' : ''}" style="cursor:pointer" onclick="openEditSheet('${esc(s.id)}')">
    ${thumb}
    <div class="coord-card-body">
    <div class="coord-service-name">${tipoChip}${esPrueba ? `<span class="service-prueba-badge">${t('prueba.badge')}</span>` : ''}${nombreHTML}${esJornada && jornadaN != null ? ` <span style="color:var(--purple);font-size:12px">J${jornadaN}</span>` : ''}</div>
    ${cliLine}
    <div class="coord-service-meta"><span class="service-estado ${estadoClass}">${esc(estadoDisplay)}</span>${fueraDeFecha ? `<span class="coord-tag" style="background:var(--amber-dark,#7c5300);color:var(--amber,#f59e0b)">${t('badge.fueradefecha').replace('{d}', fPlanFmt)}</span>` : ''}${(esJornada && typeof pctAvance === 'number') ? `<span class="coord-tag">${Math.round(pctAvance)}%</span>` : ''}${jobDone ? `<span class="coord-tag" style="background:var(--green-dark,#14532d);color:var(--green,#22c55e)">${t('badge.servicio.completo')}</span>` : ''}${horaFmt ? `<span class="coord-tag">🕐 ${esc(horaFmt)}</span>` : ''}${tipo ? `<span class="coord-tag">${esc(tipo)}</span>` : ''}${(() => { const c = servicioContinua(s); return c.continua ? `<span class="coord-tag" style="background:var(--amber-dark,#7c5300);color:var(--amber,#f59e0b)">${t('badge.continua').replace('{h}', c.hechos).replace('{t}', c.total)}</span>` : ''; })()}</div>
    <div class="coord-ops">${lugar ? `📍 ${esc(lugar)} · ` : ''}👤 ${ops}</div>
    </div>
  </div>`;
}

async function fetchOperarioOptions() {
  if (_operarioOptions !== null) return _operarioOptions;
  try {
    const data = await callNotion(`databases/${DB_ID}`, 'GET');
    _operarioOptions = (data.properties?.['Operario App']?.select?.options || []).map(o => o.name);
  } catch (e) {
    _operarioOptions = USERS.map(u => u.name);
  }
  return _operarioOptions;
}

// Operarios/coordinadores (gente de campo) de un país — fuente del selector de PILOTO y AYUDANTES.
// Filtra por el país del servicio y excluye Dirección/CEO/Administración (no son pilotos → Diego Laxalt NO aparece).
// El país viene en formato Notion ('🇺🇾 Uruguay') o pelado; vacío → Uruguay (HQ).
function paisToCountry(paisNotion) {
  if (!paisNotion) return 'Uruguay';
  for (const country of Object.keys(COUNTRY_NOTION_MAP)) {
    if (paisNotion === COUNTRY_NOTION_MAP[country] || paisNotion === country || paisNotion.includes(country)) return country;
  }
  return 'Uruguay';
}
function operariosDePais(paisNotion) {
  const target = paisToCountry(paisNotion);
  return USERS
    .filter(u => u.country === target && (String(u.role || '').includes('Operario') || String(u.role || '').includes('Coordinador')))
    .map(u => u.name);
}
// Operarios agregados a mano (botón "+ nuevo") durante la sesión — se suman al selector.
let _extraOperarios = [];

function renderOperarioBtns(current) {
  let options = operariosDePais(editState.pais).filter(name => name !== editState.operarioManual);
  if (current && !options.includes(current)) options = [current, ...options]; // no perder la asignación actual
  _extraOperarios.forEach(n => { if (n !== editState.operarioManual && !options.includes(n)) options.push(n); });
  document.getElementById('edit-operario-btns').innerHTML =
    `<button class="operario-btn ${!current ? 'active' : ''}" onclick="selectEditOperario(null,this)">${t('sheet.edit.operario.sinasignar')}</button>` +
    options.map(name => `<button class="operario-btn ${current === name ? 'active' : ''}" onclick="selectEditOperario('${name.replace(/'/g,"\\'")}',this)">${name}</button>`).join('') +
    `<button class="operario-btn" style="border-style:dashed;color:var(--green);font-weight:600" onclick="showNewOperarioInput()">${t('sheet.edit.operario.nuevo')}</button>` +
    `<div id="new-op-wrap" style="display:none;gap:6px;margin-top:2px">
      <input id="new-op-input" type="text" class="edit-date-input" placeholder="${t('sheet.edit.operario.nombre')}" style="margin-bottom:0"/>
      <button onclick="confirmNewOperario()" style="width:100%;padding:10px;background:var(--green-dark);border:1px solid var(--green);border-radius:var(--radius-sm);color:var(--green);font-weight:700;font-family:inherit;font-size:13px;cursor:pointer">${t('sheet.edit.operario.agregar')}</button>
    </div>`;
}

function showNewOperarioInput() {
  const wrap = document.getElementById('new-op-wrap');
  if (wrap) { wrap.style.display = 'flex'; wrap.style.flexDirection = 'column'; document.getElementById('new-op-input')?.focus(); }
}

function confirmNewOperario() {
  const input = document.getElementById('new-op-input');
  const name = input?.value.trim();
  if (!name) return;
  if (!_extraOperarios.includes(name)) _extraOperarios.push(name);
  editState.operario = name;
  renderOperarioBtns(name);
  renderParticipantesBtns(); // refresh ayudantes para excluir al nuevo piloto
  if (document.getElementById('edit-operario-manual-btns')) renderOperarioManualBtns(editState.operarioManual);
}

function renderOperarioManualBtns(current) {
  const container = document.getElementById('edit-operario-manual-btns');
  if (!container) return;
  let options = operariosDePais(editState.pais);
  if (current && !options.includes(current)) options = [current, ...options]; // no perder la asignación actual
  _extraOperarios.forEach(n => { if (!options.includes(n)) options.push(n); });
  container.innerHTML =
    `<button class="operario-btn ${!current ? 'active' : ''}" onclick="selectEditOperarioManual(null,this)">${t('sheet.edit.operario.sinasignar')}</button>` +
    options.map(name => `<button class="operario-btn ${current === name ? 'active' : ''}" data-name="${escAttrEdit(name)}" onclick="selectEditOperarioManual(this.dataset.name,this)">${name}</button>`).join('') +
    `<button class="operario-btn" style="border-style:dashed;color:var(--green);font-weight:600" onclick="showNewOperarioManualInput()">${t('sheet.edit.operario.nuevo')}</button>` +
    `<div id="new-op-manual-wrap" style="display:none;gap:6px;margin-top:2px">
      <input id="new-op-manual-input" type="text" class="edit-date-input" placeholder="${t('sheet.edit.operario.nombre')}" style="margin-bottom:0"/>
      <button onclick="confirmNewOperarioManual()" style="width:100%;padding:10px;background:var(--green-dark);border:1px solid var(--green);border-radius:var(--radius-sm);color:var(--green);font-weight:700;font-family:inherit;font-size:13px;cursor:pointer">${t('sheet.edit.operario.agregar')}</button>
    </div>`;
}

function showNewOperarioManualInput() {
  const wrap = document.getElementById('new-op-manual-wrap');
  if (wrap) { wrap.style.display = 'flex'; wrap.style.flexDirection = 'column'; document.getElementById('new-op-manual-input')?.focus(); }
}

function confirmNewOperarioManual() {
  const input = document.getElementById('new-op-manual-input');
  const name = input?.value.trim();
  if (!name) return;
  if (!_extraOperarios.includes(name)) _extraOperarios.push(name);
  editState.operarioManual = name;
  renderOperarioManualBtns(name);
  renderParticipantesBtns(); // refresh ayudantes para excluir al nuevo operario manual
  if (document.getElementById('edit-operario-btns')) renderOperarioBtns(editState.operario);
}

function selectEditOperarioManual(name, el) {
  // Toggle: si se toca el que ya está activo, deseleccionar (queda opcional).
  if (name && editState.operarioManual === name) name = null;
  editState.operarioManual = name;
  document.querySelectorAll('#edit-operario-manual-btns .operario-btn').forEach(b => b.classList.remove('active'));
  if (el && name) el.classList.add('active');
  else document.querySelector('#edit-operario-manual-btns .operario-btn')?.classList.add('active'); // marca "— Sin asignar"
  // Si el nuevo operario manual estaba en ayudantes, quitarlo.
  if (name && Array.isArray(editState.participantes)) {
    editState.participantes = editState.participantes.filter(p => p !== name);
  }
  // Si el nuevo operario manual era el encargado, limpiar (no puede ser ambos).
  if (name && editState.operario === name) {
    editState.operario = null;
    renderOperarioBtns(null);
  }
  // Si el nuevo operario manual era el piloto, limpiar (no puede ser ambos — 1 persona = 1 rol).
  if (name && editState.piloto === name) {
    editState.piloto = '';
    renderPilotoBtns();
  }
  renderParticipantesBtns();
}

// ── Rol PILOTO (del dron) ── property Notion "Piloto" (select). Slot independiente del
// Operario App (ahora "Encargado del servicio") — un dron puede volarlo alguien distinto
// de quien coordina/ve el servicio en su app. Exclusión mutua con los otros 3 roles para
// que el conteo de jornales no duplique a la misma persona.
function renderPilotoBtns() {
  const container = document.getElementById('edit-piloto-btns');
  if (!container) return;
  const current = editState.piloto;
  let options = operariosDePais(editState.pais);
  if (current && !options.includes(current)) options = [current, ...options]; // no perder la asignación actual
  _extraOperarios.forEach(n => { if (!options.includes(n)) options.push(n); });
  container.innerHTML =
    `<button class="operario-btn ${!current ? 'active' : ''}" onclick="selectEditPiloto('')">${t('sheet.edit.operario.sinasignar')}</button>` +
    options.map(name => `<button class="operario-btn ${current === name ? 'active' : ''}" data-name="${escAttrEdit(name)}" onclick="selectEditPiloto(this.dataset.name)">${name}</button>`).join('') +
    `<button class="operario-btn" style="border-style:dashed;color:var(--green);font-weight:600" onclick="showNewPilotoInput()">${t('sheet.edit.operario.nuevo')}</button>` +
    `<div id="new-op-piloto-wrap" style="display:none;gap:6px;margin-top:2px">
      <input id="new-op-piloto-input" type="text" class="edit-date-input" placeholder="${t('sheet.edit.operario.nombre')}" style="margin-bottom:0"/>
      <button onclick="confirmNewPiloto()" style="width:100%;padding:10px;background:var(--green-dark);border:1px solid var(--green);border-radius:var(--radius-sm);color:var(--green);font-weight:700;font-family:inherit;font-size:13px;cursor:pointer">${t('sheet.edit.operario.agregar')}</button>
    </div>`;
}

function showNewPilotoInput() {
  const wrap = document.getElementById('new-op-piloto-wrap');
  if (wrap) { wrap.style.display = 'flex'; wrap.style.flexDirection = 'column'; document.getElementById('new-op-piloto-input')?.focus(); }
}

function confirmNewPiloto() {
  const input = document.getElementById('new-op-piloto-input');
  const name = input?.value.trim();
  if (!name) return;
  if (!_extraOperarios.includes(name)) _extraOperarios.push(name);
  selectEditPiloto(name);
}

// Toggle: tocar al que ya está activo lo deselecciona (queda "sin asignar").
// Al elegir a alguien, se lo saca de los otros 3 roles (exclusión mutua: 1 persona = 1 rol)
// y se re-renderizan los 4 grupos de botones para que las exclusiones se reflejen en pantalla.
function selectEditPiloto(name) {
  editState.piloto = (editState.piloto === name ? '' : name);
  if (editState.piloto) {
    if (editState.operario === editState.piloto) editState.operario = null;
    if (editState.operarioManual === editState.piloto) editState.operarioManual = null;
    editState.participantes = (editState.participantes || []).filter(p => p !== editState.piloto);
  }
  renderOperarioBtns(editState.operario);
  renderPilotoBtns();
  renderOperarioManualBtns(editState.operarioManual);
  renderParticipantesBtns();
}

// Renderiza los botones de "Ayudantes" (multi-select). Excluye al encargado, al piloto
// y al operario manual (no permitir asignar a la misma persona a más de un rol).
function renderParticipantesBtns() {
  const container = document.getElementById('edit-participantes-btns');
  if (!container) return;
  let options = operariosDePais(editState.pais).filter(name => name !== editState.operario && name !== editState.operarioManual && name !== editState.piloto);
  // incluir ayudantes ya seleccionados / agregados a mano aunque no sean del país (no perder datos)
  (editState.participantes || []).forEach(n => { if (n !== editState.operario && n !== editState.operarioManual && n !== editState.piloto && !options.includes(n)) options.push(n); });
  _extraOperarios.forEach(n => { if (n !== editState.operario && n !== editState.operarioManual && n !== editState.piloto && !options.includes(n)) options.push(n); });
  const selected = editState.participantes || [];
  container.innerHTML = options.map(name => {
    const isActive = selected.includes(name);
    return `<button class="operario-btn ${isActive ? 'active' : ''}" data-name="${escAttrEdit(name)}" onclick="toggleParticipante(this.dataset.name, this)">${name}</button>`;
  }).join('') || `<div style="font-size:12px;color:var(--text3);font-style:italic">Sin operarios disponibles en este país.</div>`;
}

// Escape simple para atributo HTML
function escAttrEdit(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Escape para texto HTML — usar SIEMPRE al interpolar strings que vienen de
// Notion (nombres de servicio/contacto/propuesta, notas, lugar, etc) dentro de
// innerHTML. Sin esto un usuario con acceso a Notion puede romper la app o
// inyectar HTML metiendo `<img>` o `<script>` en un campo de texto.

// Id corto y único para un sector (solo para distinguir filas en el JSON de sectores).
function genSectorId() {
  return 'sec-' + Math.random().toString(36).slice(2, 8);
}

function toggleParticipante(name, btnEl) {
  if (!editState.participantes) editState.participantes = [];
  const idx = editState.participantes.indexOf(name);
  if (idx === -1) {
    editState.participantes.push(name);
    // Exclusión mutua: si a este ayudante lo tenía asignado como piloto, sacarlo de ahí
    // (1 persona = 1 rol, para no duplicarlo en el conteo de jornales).
    if (editState.piloto === name) {
      editState.piloto = '';
      renderPilotoBtns();
    }
  } else {
    editState.participantes.splice(idx, 1);
  }
  if (btnEl) btnEl.classList.toggle('active');
}

// Abre el sheet de edición del servicio desde el flujo Finanzas→"Por cobrar".
// openEditSheet() depende de _coordAllServices.find(...), que NO se puebla en Finanzas → haría return
// silencioso. Acá poblamos editingService con el objeto del servicio directo (P5) y cableamos el contexto
// de cliente para que renderSvcClienteUbicacion/resolveSvcUbicacion funcionen, ANTES de delegar en
// openEditSheet por su id (que ya lo encontrará en editingService).
let _editFromPorCobrar = false; // dónde re-renderizar al cerrar (true = Por cobrar, false = panel coord)
async function openEditSheetFromFinanzas(svcId) {
  if (currentUser?.role && !currentUser.role.includes('Administración')) return; // solo Finanzas opera
  let svc = (Array.isArray(_coordAllServices) ? _coordAllServices : []).find(s => s.id === svcId);
  if (!svc && _porCobrarData?.svc?.results) {
    svc = _porCobrarData.svc.results.find(s => s.id === svcId);
  }
  if (!svc) {
    try { svc = await callNotion('pages/' + svcId, 'GET'); } catch (e) { alert('No se pudo abrir el servicio: ' + (e.message || e)); return; }
  }
  if (!svc) return;
  editingService = svc;            // P5: poblar editingService directo (openEditSheet lo reusa por id)
  _editFromPorCobrar = true;       // B-3 redirige el post-save a renderPorCobrar
  await openEditSheet(svcId);
}

async function openEditSheet(pageId) {
  // Si ya viene poblado desde openEditSheetFromFinanzas (flujo Finanzas→Por cobrar), lo respetamos;
  // si no, lo buscamos en la lista del coord (flujo normal) y reseteamos el flag de contexto.
  if (!(editingService && editingService.id === pageId)) {
    editingService = _coordAllServices.find(s => s.id === pageId);
    _editFromPorCobrar = false; // no venimos de Finanzas; B-3 usará el flujo coord normal
  }
  if (!editingService) return;
  const props = editingService.properties || {};
  // SIN fallback de display acá (fix F1, incidente 2026-07-11): si el título no se puede leer, nombre = ''.
  // Antes caía a t('common.sinnombre') y saveServiceEdit ESCRIBÍA ese literal como nombre real del servicio.
  const nombre = props['Nombre del servicio']?.title?.[0]?.plain_text || '';
  const fecha = props['Fecha programada']?.date?.start || '';
  const estadoActual = props['Estado']?.select?.name || '';
  const operarioApp = props['Operario App']?.select?.name || '';
  const legacyOps = (props['Operario(s)']?.people || []).map(p => p.name);
  const operarioActual = operarioApp || legacyOps[0] || null;
  const operarioManualActual = props['Operario manual']?.select?.name || null;
  const pilotoActual = props['Piloto']?.select?.name || '';
  const participantesActuales = (props['Operarios participantes']?.multi_select || []).map(o => o.name);
  // Hora Inicio (datetime) almacena la hora programada (ej. "2026-05-27T14:00:00.000Z").
  // Extraemos solo HH:mm para el input type=time. Si no es datetime, hora queda vacía.
  const horaInicioStart = props['Hora Inicio']?.date?.start || '';
  let hora = '';
  if (horaInicioStart && horaInicioStart.includes('T')) {
    const d = new Date(horaInicioStart);
    if (!isNaN(d)) hora = d.toTimeString().slice(0, 5);
  }
  const lugar = props['Lugar']?.rich_text?.[0]?.plain_text || '';
  const mapa = props['Mapa']?.url || '';
  const contactoId = props['Contacto']?.relation?.[0]?.id || props['Contactos']?.relation?.[0]?.id || '';
  const propuestaId = props['Propuesta']?.relation?.[0]?.id || '';
  editState = { estado: estadoActual, operario: operarioActual, operarioManual: operarioManualActual, piloto: pilotoActual, fecha, hora, lugar, mapa, participantes: participantesActuales, pais: props['País']?.select?.name || '', nombre,
    contactoId, propuestaId, clienteNombre: '', clienteMapa: '', propMapa: '',
    // R2 (asignar/cambiar cliente): sub-form reusado del alta de servicio suelto. _clienteDirty gatilla el write.
    clienteForm: { clienteSel: contactoId || '__new__', nombreCliente: '', tel: '', email: '', pais: props['País']?.select?.name || '' },
    _clienteDirty: false,
    sectoresCliente: [],
    sectores: (() => { try { return JSON.parse(props['Estado sectores']?.rich_text?.[0]?.plain_text || '[]'); } catch (_) { return []; } })(),
    _sectoresClienteDirty: false, _sectoresClienteLoaded: false,
    tipoServicios: tipoServicioList(props), // multi: un servicio puede ser Fachada + Vidrios (+ Paneles)
    notasPreServicio: props['Notas pre-servicio']?.rich_text?.[0]?.plain_text || '',
    observacionCliente: props['Observación cliente']?.rich_text?.[0]?.plain_text || '' };
  // Originales (fix F1): los campos de texto/sectores se ESCRIBEN solo si cambiaron — así una lectura rota
  // (raw sin plain_text) jamás puede pisar el dato bueno al guardar otra cosa (ej. asignar piloto).
  editState._nombreOrig = nombre;
  editState._lugarOrig = editState.lugar || '';
  editState._notasPreOrig = editState.notasPreServicio || '';
  editState._obsCliOrig = editState.observacionCliente || '';
  editState._sectoresOrigJson = JSON.stringify((editState.sectores || []).map(x => ({ id: x.id, nombre: String(x.nombre || '').trim(), estado: x.estado || 'pendiente' })).filter(x => x.nombre));
  document.getElementById('edit-sheet-title').textContent = nombre || t('common.sinnombre');
  const dateLocale = currentLang === 'pt-BR' ? 'pt-BR' : 'es-UY';
  document.getElementById('edit-sheet-sub').textContent = fecha ? new Date(fecha + 'T00:00:00').toLocaleDateString(dateLocale, { weekday: 'long', day: 'numeric', month: 'long' }) : t('sheet.alert.fecha');
  const estados = ['📋 Pendiente', '🔄 Asignado', '✈️ En curso', '✅ Completado', '❌ Cancelado'];
  document.getElementById('edit-estado-btns').innerHTML = estados.map(e =>
    `<button class="estado-btn ${editState.estado === e ? 'active' : ''}" onclick="selectEditEstado('${e}')">${e}</button>`
  ).join('');
  document.getElementById('edit-fecha').value = fecha;
  document.getElementById('edit-hora').value = hora;
  document.getElementById('edit-lugar').value = lugar;
  const TIPOS_SVC_EDIT = ['🏢 Fachada', '🪟 Vidrios', '☀️ Paneles solares'];
  const tsEl = document.getElementById('edit-tiposervicio-btns');
  if (tsEl) tsEl.innerHTML = TIPOS_SVC_EDIT.map(o => `<button class="estado-btn ${editState.tipoServicios.includes(o) ? 'active' : ''}" onclick="selectEditTipoServicio('${o.replace(/'/g,"\\'")}')">${o}</button>`).join('');
  const npEl = document.getElementById('edit-notaspre'); if (npEl) npEl.value = editState.notasPreServicio || '';
  const ocEl = document.getElementById('edit-obscliente'); if (ocEl) ocEl.value = editState.observacionCliente || '';
  const nombreInput = document.getElementById('edit-nombre'); if (nombreInput) { nombreInput.value = nombre; nombreInput.placeholder = t('common.sinnombre'); }
  document.getElementById('edit-save-btn').textContent = t('btn.save.notion');
  document.getElementById('edit-save-btn').disabled = false;
  const esFin = !!(currentUser?.role && currentUser.role.includes('Administración'));
  const isCompletado = estadoActual.includes('Completado');
  const delBtn = document.getElementById('delete-svc-btn');
  if (delBtn) {
    // Todos (Coord/Dirección/Finanzas) pueden eliminar; los completados piden confirmación extra en deleteService.
    delBtn.style.display = '';
    delBtn.textContent = '🗑️ ' + t('sheet.edit.delete');
    delBtn.disabled = false;
  }
  const archBtn = document.getElementById('archive-svc-btn');
  if (archBtn) { archBtn.style.display = esFin ? '' : 'none'; archBtn.disabled = false; archBtn.textContent = '🗄️ Archivar servicio'; }
  const reportBtn = document.getElementById('report-pdf-btn');
  if (reportBtn) {
    const tipoReg = props['Tipo de registro']?.select?.name || '';
    const isCompletado = estadoActual.includes('Completado');
    reportBtn.style.display = isCompletado ? '' : 'none';
    if (isCompletado) {
      let labelKey = 'pdf.btn.servicio';
      if (tipoReg.includes('Relevamiento')) labelKey = 'pdf.btn.relevamiento';
      else if (tipoReg.includes('Jornada')) labelKey = 'pdf.btn.jornada';
      reportBtn.textContent = '📄 ' + t(labelKey);
      reportBtn.disabled = false;
    }
  }
  // Sistema viejo de "Crear jornada" manual: OCULTO. Lo reemplaza el flujo automático (el operario
  // cierra "sigo otro día" y la jornada del día siguiente se crea sola). Funciones quedan muertas.
  const jornadaCTA = document.getElementById('edit-jornada-cta');
  if (jornadaCTA) jornadaCTA.style.display = 'none';
  // Mostrar sección Equipos si NO es relevamiento (no se llevan equipos a relevar).
  const equiposSection = document.getElementById('edit-equipos-section');
  if (equiposSection) {
    const tipoReg = props['Tipo de registro']?.select?.name || '';
    const isRelev = tipoReg.includes('Relevamiento');
    equiposSection.style.display = isRelev ? 'none' : '';
    _equiposDelServicio = [];
    document.getElementById('edit-equipos-chips').innerHTML = `<div class="equipos-empty">${t('equipos.loading')}</div>`;
    if (!isRelev) {
      // Cargar equipos asignados en paralelo (no bloqueante).
      Promise.all([fetchEquiposDelServicio(pageId), fetchActivosDisponibles()])
        .then(([equipos]) => {
          if (editingService?.id !== pageId) return; // sheet cerrado / cambió de servicio
          _equiposDelServicio = equipos;
          renderEquiposChips();
        });
    }
  }
  // Mostrar sección Gastos vinculados si NO es relevamiento.
  const gastosSection = document.getElementById('edit-gastos-section');
  if (gastosSection) {
    const tipoReg = props['Tipo de registro']?.select?.name || '';
    const isRelev = tipoReg.includes('Relevamiento');
    gastosSection.style.display = isRelev ? 'none' : '';
    document.getElementById('edit-gastos-chips').innerHTML = `<div class="equipos-empty">${t('equipos.loading')}</div>`;
    if (!isRelev) {
      fetchGastosDelServicio(pageId).then(gastos => {
        if (editingService?.id !== pageId) return;
        renderGastosChipsCoord(gastos);
      }).catch(() => {});
    }
  }

  document.getElementById('edit-overlay').classList.add('open');
  renderOperarioBtns(operarioActual);
  renderPilotoBtns();
  renderOperarioManualBtns(operarioManualActual);
  renderParticipantesBtns();
  renderEditSectores();
  // Fix 2: resetear el flag data-override antes de renderizar, para que no quede
  // expandido de un servicio previo que sí tenía override.
  const _ubicBox = document.getElementById('edit-cliente-ubicacion');
  if (_ubicBox) _ubicBox.removeAttribute('data-override');
  renderSvcClienteUbicacion(); // estado inicial (muestra lo que ya hay sin esperar el fetch)
  resolveSvcUbicacion(pageId); // completa cliente/maps async
}

// ─────────────────────────────────────────────
// BLOQUE CLIENTE + UBICACIÓN en el sheet de edición del servicio (B-5 / B-6)
// ─────────────────────────────────────────────

async function resolveSvcUbicacion(svcId) {
  const svc = editingService;
  if (!svc || svc.id !== svcId) return;
  const p = svc.properties || {};
  // Cliente: nombre + su Mapa heredable.
  const contactoId = editState.contactoId;
  if (contactoId) {
    try {
      const c = await callNotion('pages/' + contactoId, 'GET');
      if (editingService?.id !== svcId) return;
      const cp = c?.properties || {};
      let nom = '';
      for (const k in cp) { const tt = cp[k]?.title; if (Array.isArray(tt) && tt.length) { nom = tt.map(x => x.plain_text).join(''); break; } }
      editState.clienteNombre = nom || '';
      editState.clienteMapa = cp['Mapa']?.url || '';
      try {
        const cargados = JSON.parse(cp['Sectores']?.rich_text?.[0]?.plain_text || '[]');
        const previos = Array.isArray(editState.sectoresCliente) ? editState.sectoresCliente : [];
        const extra = previos.filter(p => !cargados.some(c => c.id === p.id));
        editState.sectoresCliente = cargados.concat(extra);
      } catch (_) { if (!Array.isArray(editState.sectoresCliente)) editState.sectoresCliente = []; }
      editState._sectoresClienteLoaded = true;
      renderEditSectores();
    } catch (_) {}
  }
  // Propuesta vinculada: su Mapa (precede al del cliente, no al del servicio).
  const propId = p['Propuesta']?.relation?.[0]?.id;
  if (propId) {
    try {
      const prop = await callNotion('pages/' + propId, 'GET');
      if (editingService?.id !== svcId) return;
      editState.propMapa = prop?.properties?.['Mapa']?.url || '';
    } catch (_) {}
  }
  renderSvcClienteUbicacion();
}

function renderSvcClienteUbicacion() {
  const box = document.getElementById('edit-cliente-ubicacion');
  if (!box) return;
  const url = resolveMapsUrl({ svcMapa: editState.mapa, propMapa: editState.propMapa, clienteMapa: editState.clienteMapa });
  const cid = editState.contactoId || '';
  const nombre = editState.clienteNombre || clienteNombreDe(cid) || '';
  const puedeAsignar = puedeAsignarCliente();
  // Fila del cliente: nombre clickeable → su ficha 360; sin cliente → placeholder (abre el selector si puede asignar).
  let clienteRow;
  if (cid) {
    const label = nombre ? esc(nombre) : t('sheet.svc.vercliente');
    clienteRow = `<div class="info-row" style="margin-bottom:6px"><span class="info-label">${t('sheet.svc.cliente.label')}:</span> <span class="info-val" style="text-decoration:underline;cursor:pointer" onclick="verClienteDesdeServicio('${esc(cid)}')">🏢 ${label} ↗</span></div>`;
  } else {
    const ph = `<span class="info-val" style="color:var(--amber,#f59e0b)${puedeAsignar ? ';cursor:pointer' : ''}"${puedeAsignar ? ' onclick="toggleEditClienteSelector(true)"' : ''}>${t('svc.cliente.placeholder')}</span>`;
    clienteRow = `<div class="info-row" style="margin-bottom:6px">${ph}</div>`;
  }
  // Acciones solo para coord/Dirección: cambiar cliente + ver propuesta vinculada.
  let actions = '';
  if (puedeAsignar) {
    const cambiarBtn = `<button type="button" onclick="toggleEditClienteSelector()" style="background:none;border:none;color:var(--accent,#00C98D);font-size:12px;text-decoration:underline;cursor:pointer;padding:4px 0">${t('sheet.edit.cliente.cambiar')}</button>`;
    const verPropBtn = editState.propuestaId
      ? `<button type="button" onclick="verPropuestaDesdeServicio('${esc(editState.propuestaId)}')" style="background:none;border:none;color:var(--text3);font-size:12px;text-decoration:underline;cursor:pointer;padding:4px 0;margin-left:14px">${t('sheet.svc.verpropuesta')}</button>`
      : '';
    actions = `<div style="margin-bottom:6px">${cambiarBtn}${verPropBtn}</div>`;
  }
  const selectorBox = puedeAsignar ? `<div id="edit-cliente-selector" style="display:none;margin:8px 0">${editClienteSectionHTML()}</div>` : '';
  const ubicBtn = url
    ? `<button type="button" class="estado-btn" onclick="openSvcUbicacion()">${t('sheet.svc.ubicacion.btn')}</button>`
    : `<button type="button" class="estado-btn" disabled style="opacity:.5">${t('sheet.svc.ubicacion.btn')}</button>
       <div style="font-size:11px;color:var(--text3);margin-top:4px">${t('sheet.svc.ubicacion.none')}</div>`;
  const hasOverride = !!(editState.mapa && editState.mapa.trim());
  const overrideShown = box.getAttribute('data-override') === '1' || hasOverride;
  const overrideLink = `<button type="button" onclick="toggleSvcUbicacionOverride()" style="background:none;border:none;color:var(--text3);font-size:11px;text-decoration:underline;cursor:pointer;padding:6px 0">${t('sheet.svc.ubicacion.override')}</button>`;
  const overrideInput = overrideShown
    ? `<div class="edit-section-label" style="margin-top:8px">${t('sheet.svc.ubicacion.override.label')}</div>
       <div class="edit-section-hint" style="font-size:11px;color:var(--text3);margin-bottom:6px">${t('sheet.svc.ubicacion.override.hint')}</div>
       <input type="url" class="edit-date-input" placeholder="https://maps.app.goo.gl/..." value="${esc(editState.mapa || '')}" oninput="editState.mapa=this.value"/>`
    : '';
  const secLabel = `<div class="edit-section-label">${t('sheet.svc.cliente.label').toUpperCase()}</div>`;
  box.innerHTML = secLabel + clienteRow + actions + selectorBox + ubicBtn + ' ' + overrideLink + overrideInput;
}

// ── R2/R3: cliente en el sheet del servicio (asignar/cambiar + navegar) ─────────────────────────────
function puedeAsignarCliente() { const r = currentUser?.role || ''; return r.includes('Coordinador') || r.includes('Dirección'); }
function toggleEditClienteSelector(forceOpen) {
  const box = document.getElementById('edit-cliente-selector');
  if (!box) return;
  const open = forceOpen === true ? true : box.style.display === 'none';
  box.style.display = open ? 'block' : 'none';
  if (open) loadEditContactos();
}
function editClienteInputsHTML() {
  const s = editState.clienteForm || (editState.clienteForm = { clienteSel: '__new__', nombreCliente: '', tel: '', email: '', pais: editState.pais || '' });
  const esNuevo = !s.clienteSel || s.clienteSel === '__new__';
  const inp = (ph, key, type) => `<input type="${type}" class="edit-date-input" style="margin-top:6px" placeholder="${ph}" value="${esc(s[key] || '')}" oninput="editState.clienteForm.${key}=this.value; editState._clienteDirty=true"/>`;
  return (esNuevo ? inp('Nombre del cliente', 'nombreCliente', 'text') : '') + inp('📞 Teléfono / WhatsApp', 'tel', 'tel') + inp('✉️ Email', 'email', 'email');
}
function editClienteSectionHTML() {
  return `<div class="edit-section" style="background:var(--card);border:1px solid var(--border);border-radius:10px;padding:10px">
    <div class="edit-section-label">👤 ${t('sheet.svc.cliente.label')}</div>
    <select id="edit-cliente-select" class="edit-date-input" onchange="editClienteChanged(this.value)">
      <option value="__new__">➕ Nuevo cliente</option>
      <option value="" disabled>cargando clientes…</option>
    </select>
    <div id="edit-cliente-fields">${editClienteInputsHTML()}</div></div>`;
}
function editClienteChanged(val) {
  const s = editState.clienteForm;
  s.clienteSel = val || '__new__';
  editState._clienteDirty = true;
  if (val && val !== '__new__') {
    const c = (_propContactos || _coordAllContacts || []).find(x => x.id === val);
    if (c) {
      s.nombreCliente = c.properties?.['Nombre / Empresa']?.title?.[0]?.plain_text || '';
      s.tel = c.properties?.['Teléfono / WhatsApp']?.phone_number || '';
      s.email = c.properties?.['Email']?.email || '';
    }
  } else { s.nombreCliente = ''; s.tel = ''; s.email = ''; }
  const w = document.getElementById('edit-cliente-fields');
  if (w) w.innerHTML = editClienteInputsHTML();
}
async function loadEditContactos() {
  try {
    if (!_propContactos) {
      if (Array.isArray(_coordAllContacts) && _coordAllContacts.length) _propContactos = _coordAllContacts;
      else { const d = await callNotion(`databases/${CONTACTOS_DB_ID}/query`, 'POST', { sorts: [{ property: 'Nombre / Empresa', direction: 'ascending' }] }); _propContactos = d.results || []; }
    }
    const sel = document.getElementById('edit-cliente-select');
    if (!sel) return;
    const cur = editState.clienteForm?.clienteSel || '__new__';
    const tit = c => c.properties?.['Nombre / Empresa']?.title?.[0]?.plain_text || '(sin nombre)';
    const estadoC = c => c.properties?.['Estado']?.select?.name || '';
    sel.innerHTML = '<option value="__new__">➕ Nuevo cliente</option>' +
      _propContactos.slice().filter(c => estadoC(c) !== '❌ Descartado' || c.id === cur).sort((a, b) => tit(a).localeCompare(tit(b))).map(c => `<option value="${esc(c.id)}">${esc(tit(c))}</option>`).join('');
    sel.value = cur;
  } catch (e) { /* el form sirve igual */ }
}
// Navegación entre overlays: cerrar → delay → abrir (no se apilan). Capturar el id ANTES de cerrar.
function verClienteDesdeServicio(id) { if (!id) return; closeEditSheet(); setTimeout(() => openContactSheet(id), 250); }
function verPropuestaDesdeServicio(id) {
  if (!id) return;
  closeEditSheet();
  setTimeout(async () => {
    try {
      let prop = _coordAllProps?.find(p => p.id === id);
      if (!prop) { const d = await callNotion('pages/' + id, 'GET'); if (!_coordAllProps) _coordAllProps = []; _coordAllProps.push(d); }
    } catch (_) {}
    if (typeof setCoordTab === 'function' && document.getElementById('screen-coordinator')?.classList.contains('active')) { try { setCoordTab('propuestas'); } catch (_) {} }
    setTimeout(() => openPropSheet(id), 200);
  }, 250);
}

function toggleSvcUbicacionOverride() {
  const box = document.getElementById('edit-cliente-ubicacion');
  if (!box) return;
  box.setAttribute('data-override', box.getAttribute('data-override') === '1' ? '0' : '1');
  renderSvcClienteUbicacion();
}

// Sectores del trabajo: muestra los del cliente (toggle seleccionado) + los ya elegidos en el servicio.
function renderEditSectores() {
  const box = document.getElementById('edit-sectores-btns');
  if (!box) return;
  const delCliente = Array.isArray(editState.sectoresCliente) ? editState.sectoresCliente : [];
  const elegidos = Array.isArray(editState.sectores) ? editState.sectores : [];
  // Universo = sectores del cliente + los ya elegidos que (por algún motivo) no estén en la lista del cliente.
  const universo = delCliente.slice();
  elegidos.forEach(e => { if (!universo.some(u => u.id === e.id)) universo.push({ id: e.id, nombre: e.nombre }); });
  box.innerHTML = universo.length
    ? universo.map(sec => {
        const isActive = elegidos.some(e => e.id === sec.id);
        return `<button class="operario-btn ${isActive ? 'active' : ''}" data-id="${escAttrEdit(sec.id)}" onclick="toggleEditSector(this.dataset.id)">${esc(sec.nombre)}</button>`;
      }).join('')
    : `<div style="font-size:12px;color:var(--text3);font-style:italic">${t('sheet.edit.sectores.none')}</div>`;
}

function toggleEditSector(id) {
  if (!Array.isArray(editState.sectores)) editState.sectores = [];
  const idx = editState.sectores.findIndex(e => e.id === id);
  if (idx >= 0) {
    editState.sectores.splice(idx, 1);
  } else {
    const src = (editState.sectoresCliente || []).find(s => s.id === id);
    if (src) editState.sectores.push({ id: src.id, nombre: src.nombre, estado: 'pendiente' });
  }
  renderEditSectores();
}

// Agrega un sector nuevo: lo suma a la lista del cliente (se persiste al guardar) y lo deja seleccionado.
function editAddSector() {
  const input = document.getElementById('edit-sector-input');
  const nombre = (input?.value || '').trim();
  if (!nombre) return;
  const id = genSectorId();
  if (!Array.isArray(editState.sectoresCliente)) editState.sectoresCliente = [];
  if (!Array.isArray(editState.sectores)) editState.sectores = [];
  editState.sectoresCliente.push({ id, nombre });
  editState.sectores.push({ id, nombre, estado: 'pendiente' });
  editState._sectoresClienteDirty = true;
  if (input) input.value = '';
  renderEditSectores();
}

function togglePropUbicacionOverride() {
  const box = document.getElementById('prop-ubicacion-override-box');
  if (!box) return;
  const open = box.getAttribute('data-override') !== '1';
  box.setAttribute('data-override', open ? '1' : '0');
  // Re-render la parte expandible dentro del box sin tocar el link
  const existing = box.querySelector('.prop-override-content');
  if (existing) existing.remove();
  if (open) {
    const div = document.createElement('div');
    div.className = 'prop-override-content';
    div.innerHTML = `<div class="edit-section-label" style="margin-top:8px">${t('sheet.prop.ubicacion.override.label')}</div>
       <div class="edit-section-hint" style="font-size:11px;color:var(--text3);margin-bottom:6px">${t('sheet.prop.ubicacion.override.hint')}</div>
       <input type="url" class="edit-date-input" placeholder="https://maps.app.goo.gl/..." value="${esc(propEditState.mapa || '')}" oninput="propEditState.mapa=this.value"/>`;
    box.appendChild(div);
  }
  // Colapsar solo oculta el input; el valor persiste en propEditState.mapa
  // para que guardar con campo vacío → null sea decisión explícita del usuario.
}

function openSvcUbicacion() {
  const url = resolveMapsUrl({ svcMapa: editState.mapa, propMapa: editState.propMapa, clienteMapa: editState.clienteMapa });
  if (!url) { alert(t('sheet.svc.ubicacion.none')); return; }
  window.open(url, '_blank', 'noopener');
}

// ─────────────────────────────────────────────
// CREAR JORNADA — sub-modal sobre el sheet edit del coord
// ─────────────────────────────────────────────
let jornadaState = { numero: 2, fecha: '', operario: null };

function jornadaOverlayClick(e) { if (e.target.id === 'jornada-overlay') closeCreateJornadaSheet(); }
function closeCreateJornadaSheet() { document.getElementById('jornada-overlay').classList.remove('open'); }

// ─────────────────────────────────────────────
// FEATURE B — EQUIPOS ASIGNADOS AL SERVICIO
// ─────────────────────────────────────────────
// La DB Notion 'Activos / Equipamiento' contiene drones, vehículos, etc.
// La DB intermedia 'Registro de Uso de Equipo' (RUE) vincula Activos ↔ Servicios.
// Cada page en RUE = 1 asignación de equipo a un servicio.

const ACTIVOS_DB_ID = NOTION_DBS.activos;
const ACTIVOS_DS_ID = 'c3cf41a0-a160-4166-8d3d-1bbd90af45ff'; // data source (para crear activos)
const RUE_DB_ID = NOTION_DBS.regTiempo;

let _activosCache = null; // { items, byPais: Map<pais, items[]> }
let _equiposDelServicio = []; // [{ rueId, activoId, activoName, activoTipo, activoSerie }]

// Trae todos los activos operativos. Cache simple (no cambian seguido).
async function fetchActivosDisponibles() {
  if (_activosCache) return _activosCache.items;
  try {
    const data = await callNotion(`databases/${ACTIVOS_DB_ID}/query`, 'POST', {
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
    _activosCache = { items, time: Date.now() };
    return items;
  } catch (e) {
    console.warn('[equipos] fetchActivosDisponibles error:', e.message);
    return [];
  }
}

// Trae los equipos ya asignados a un servicio. Filtra por relation Servicio.
// ═══════════════════════════════════════════════════════════════════════════
// 🔧 EQUIPOS (flota) — v167. Tab del coordinador (país-scoped; Dirección global; Ventas bloqueada).
// Inventario + check mensual + services + estado + historial por equipo (JSON en 'Historial equipo').
// La ÚNICA base es Activos (ya existía); el coord tiene create/patch en la matriz server-side.
// ═══════════════════════════════════════════════════════════════════════════
let _coordAllActivos = null;
const EQ_TIPOS = ['🚁 Drone', '🚗 Vehículo', '💧 Hidrolavadora', '🔬 Ósmosis', '🚛 Trailer', '🖨️ Electrónico', '🔧 Herramienta', '🦺 Seguridad'];
const EQ_ESTADOS = ['✅ Operativo', '🔧 En mantenimiento', '🚨 En reparación', '❌ Fuera de servicio'];
const EQ_CHECK_DIAS = 30; // check mensual

function eqHistParse(props) {
  try { const v = JSON.parse(props['Historial equipo']?.rich_text?.[0]?.plain_text || '[]'); return Array.isArray(v) ? v : []; } catch (_) { return []; }
}
// Equipos v2 — reporte de PROBLEMA del piloto: vive en el historial como evento 'problema' (lo abre el piloto)
// y 'resuelto' (lo cierra el coordinador). Abierto = el último 'problema' es posterior al último 'resuelto'.
// Cero property/permiso nuevo: 'Historial equipo' ya lo escriben tanto el operario (misEqSave) como el coord (eqPatch).
function eqProblemaAbierto(props) {
  const hist = eqHistParse(props);
  let iP = -1, iR = -1;
  hist.forEach((e, i) => { if (e.t === 'problema') iP = i; else if (e.t === 'resuelto') iR = i; });
  return iP > iR ? hist[iP] : null;
}
function eqDiasDesdeCheck(props) {
  const f = props['Último check']?.date?.start || '';
  if (!f) return null;
  return Math.floor((Date.now() - new Date(f + (f.length === 10 ? 'T00:00:00' : '')).getTime()) / 86400000);
}

async function renderCoordEquipos() {
  if (esVentas()) return; // blindaje: Ventas no gestiona equipos
  const content = document.getElementById('coord-content');
  if (!content) return;
  content.innerHTML = '<div style="text-align:center;padding:40px 0"><div class="spinner" style="margin:0 auto"></div></div>';
  const myTab = 'equipos';
  try {
    const data = await callNotion(`databases/${ACTIVOS_DB_ID}/query`, 'POST', {});
    if (activeCoordTab !== myTab) return;
    let items = data.results || [];
    // País: coord ve SU país; Dirección ve todos.
    if (!esDireccion()) {
      const short = COUNTRY_FINANCE_MAP[currentUser?.country] || null;
      if (short) items = items.filter(a => (a.properties?.['País']?.select?.name || '') === short);
    }
    _coordAllActivos = items;
    renderCoordEquiposList();
  } catch (e) {
    if (activeCoordTab !== myTab) return;
    content.innerHTML = `<div class="coord-empty">${t('coord.error.load')}<br><small>${esc(e.message)}</small></div>`;
  }
}

function renderCoordEquiposList() {
  if (activeCoordTab !== 'equipos') return; // un save tardío no debe pisar la tab activa (review)
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

function eqFind(id) { return (_coordAllActivos || []).find(x => x.id === id); }
// Coordinador cierra un problema reportado por el piloto: evento 'resuelto' en el historial (eqPatch ya
// escribe historial + optimista + re-render). El helper eqProblemaAbierto deja de verlo abierto.
async function eqResolverProblema(id) {
  const a = eqFind(id); if (!a) return;
  const prob = eqProblemaAbierto(a.properties || {}); if (!prob) return;
  if (!confirm(t('eq.prob.resolver.confirm'))) return;
  await eqPatch(id, {}, { f: new Date().toISOString().slice(0, 10), t: 'resuelto', por: currentUser?.name || '', n: prob.n || '' });
}
function eqSlot(id) { return document.getElementById('eq-slot-' + id); }
function eqCloseSlot(id) { const sl = eqSlot(id); if (sl) { sl.style.display = 'none'; sl.innerHTML = ''; } }
const _eqInp = 'width:100%;box-sizing:border-box;padding:9px 11px;margin-bottom:7px;border:1px solid var(--border);border-radius:9px;background:var(--bg);color:var(--text);font-size:13px;font-family:inherit';

// Append de un evento al historial del equipo + PATCH de las properties dadas (una sola escritura).
async function eqPatch(id, props, evento) {
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

// ✅ Check mensual: km (vehículo) / horas (drone) + nota → Último check + valores + historial.
function eqCheckForm(id) {
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
async function eqCheckSave(id, btn) {
  const hoy = new Date().toISOString().slice(0, 10);
  const km = parseFloat(document.getElementById('eq-km-' + id)?.value);
  const hs = parseFloat(document.getElementById('eq-hs-' + id)?.value);
  const nota = (document.getElementById('eq-nota-' + id)?.value || '').trim();
  if (/[<>]/.test(nota)) { alert(t('eq.err.nota')); return; }
  const props = { 'Último check': { date: { start: hoy } } };
  const ev = { f: hoy, t: 'check', por: currentUser?.name || '' };
  if (Number.isFinite(km) && km >= 0) { props['Km actuales'] = { number: km }; ev.km = km; }
  if (Number.isFinite(hs) && hs >= 0) { props['Horas de vuelo'] = { number: hs }; ev.hs = hs; }
  if (nota) ev.n = nota;
  btn.disabled = true; btn.textContent = '⏳';
  if (await eqPatch(id, props, ev)) return; // re-render cierra el slot
  btn.disabled = false; btn.textContent = t('eq.check.save');
}

// 🔧 Service: registra el mantenimiento hecho + agenda el próximo.
function eqServiceForm(id) {
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
async function eqServiceSave(id, btn) {
  const hoy = new Date().toISOString().slice(0, 10);
  const prox = document.getElementById('eq-prox-' + id)?.value || '';
  const nota = (document.getElementById('eq-snota-' + id)?.value || '').trim();
  if (/[<>]/.test(nota)) { alert(t('eq.err.nota')); return; }
  const props = { 'Último mantenimiento': { date: { start: hoy } } };
  if (prox) props['Próximo mantenimiento'] = { date: { start: prox } };
  const ev = { f: hoy, t: 'service', por: currentUser?.name || '' };
  if (prox) ev.prox = prox;
  if (nota) ev.n = nota;
  btn.disabled = true; btn.textContent = '⏳';
  if (await eqPatch(id, props, ev)) return;
  btn.disabled = false; btn.textContent = t('eq.service.save');
}

// ✏️ Editar datos base + estado.
function eqEditForm(id) {
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
  const respPool = USERS.filter(u => /Operario|Coordinador|Dirección/.test(u.role) && (!shortPais || COUNTRY_FINANCE_MAP[u.country] === shortPais));
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

// 🗑️ Eliminar equipo: archiva la página en Notion (in_trash) — mismo patrón que deleteService. Sale de la
// lista pero es recuperable 30 días en la papelera de Notion (no se pierde el historial). Para apartar un
// equipo SIN sacarlo, está el estado "❌ Fuera de servicio" en el select.
async function eqDeleteEquipo(id) {
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
async function eqEditSave(id, btn) {
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
  const ev = (estado !== estadoPrev) ? { f: hoyEv, t: 'estado', por: currentUser?.name || '', n: estadoPrev + ' → ' + estado }
    : (resp !== respPrev) ? { f: hoyEv, t: 'resp', por: currentUser?.name || '', n: (respPrev || '—') + ' → ' + (resp || '—') } : null;
  btn.disabled = true; btn.textContent = '⏳';
  // Update optimista del title (eqPatch cubre rich_text/select; el title lo seteamos a mano)
  if (await eqPatch(id, props, ev)) { a.properties['Activo'] = { title: [{ plain_text: nombre, text: { content: nombre } }] }; renderCoordEquiposList(); return; }
  btn.disabled = false; btn.textContent = t('cfg.user.save');
}

// 📜 Historial del equipo (eventos del JSON).
function eqHistToggle(id) {
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

// ── 🔧 MIS EQUIPOS (Equipos v2) — reporte semanal del RESPONSABLE (operario/piloto): carga el TOTAL del
// contador (km vehículo / horas dron) + nota opcional. Vence el viernes; la alerta la trae loadAlerts.
let _misEquipos = null;
function miseqOverlayClick(ev) { if (ev.target === ev.currentTarget) closeMisEquipos(); }
function closeMisEquipos() { document.getElementById('miseq-overlay')?.classList.remove('open'); }
async function openMisEquipos() {
  const ov = document.getElementById('miseq-overlay');
  const list = document.getElementById('miseq-list');
  if (!ov || !list) return;
  ov.classList.add('open');
  list.innerHTML = '<div class="spinner" style="margin:16px auto"></div>';
  try {
    const short = COUNTRY_FINANCE_MAP[currentUser?.country] || null;
    const d = await callNotion(`databases/${ACTIVOS_DB_ID}/query`, 'POST', short ? { filter: { property: 'País', select: { equals: short } } } : {});
    _misEquipos = (d.results || []).filter(a => {
      const p = a.properties || {};
      if ((p['Responsable App']?.select?.name || '') !== (currentUser?.name || '')) return false;
      return !(p['Estado']?.select?.name || '').includes('Fuera de servicio');
    });
    renderMisEquipos();
  } catch (e) { list.innerHTML = '<div style="color:var(--red);font-size:12px;padding:12px">⚠️ ' + esc(e.message) + '</div>'; }
}
function renderMisEquipos() {
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
async function misEqSave(id, btn) {
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
  const ev = { f: hoy, t: 'reporte', por: currentUser?.name || '' };
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

// Reporte de un PROBLEMA del dron/equipo por el piloto responsable (canal separado del reporte de horas).
// Queda como evento 'problema' en el Historial equipo → alerta al coordinador (loadAlerts) hasta que lo resuelva.
const MISEQ_PROB_TIPOS = ['⚠️ Anda mal', '🔧 Necesita mantenimiento', '🔄 Hay que actualizarlo', '📝 Otro'];
function misEqToggleProblem(id) {
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
async function misEqReportProblem(id, btn) {
  const a = (_misEquipos || []).find(x => x.id === id); if (!a) return;
  const tipo = document.getElementById('meq-ptipo-' + id)?.value || '';
  const desc = (document.getElementById('meq-pdesc-' + id)?.value || '').trim();
  if (/[<>]/.test(desc)) { alert(t('eq.err.nota')); return; }
  if (!desc) { alert(t('miseq.prob.err.vacio')); return; }
  const hoy = new Date().toISOString().slice(0, 10);
  // "Otro" no aporta prefijo útil → solo la descripción.
  const texto = (tipo && !tipo.includes('Otro')) ? tipo + ': ' + desc : desc;
  const ev = { f: hoy, t: 'problema', por: currentUser?.name || '', n: texto };
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

// ＋ Alta de equipo nuevo.
function eqToggleAlta() {
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
async function eqAltaSave(btn) {
  const tipo = document.getElementById('eq-ntipo')?.value;
  const nombre = (document.getElementById('eq-nnombre')?.value || '').trim();
  const marca = (document.getElementById('eq-nmarca')?.value || '').trim();
  const matricula = (document.getElementById('eq-nmat')?.value || '').trim();
  if (!EQ_TIPOS.includes(tipo)) { alert(t('eq.err.tipo')); return; }
  if (!nombre || /[<>]/.test(nombre + marca + matricula)) { alert(t('eq.err.nota')); return; }
  const short = COUNTRY_FINANCE_MAP[currentUser?.country] || '🇺🇾 UY';
  const hoy = new Date().toISOString().slice(0, 10);
  const props = {
    'Activo': { title: [{ text: { content: nombre } }] },
    'Tipo': { select: { name: tipo } },
    'Estado': { select: { name: '✅ Operativo' } },
    'País': { select: { name: short } },
    'Historial equipo': { rich_text: [{ text: { content: JSON.stringify([{ f: hoy, t: 'alta', por: currentUser?.name || '' }]) } }] },
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

async function fetchEquiposDelServicio(serviceId) {
  if (!serviceId) return [];
  try {
    const data = await callNotion(`databases/${RUE_DB_ID}/query`, 'POST', {
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

function renderEquiposChips() {
  const container = document.getElementById('edit-equipos-chips');
  if (!container) return;
  if (!_equiposDelServicio.length) {
    container.innerHTML = `<div class="equipos-empty">${t('equipos.empty')}</div>`;
    return;
  }
  // Lookup name + tipo desde el cache de Activos (si está cargado)
  const byId = new Map((_activosCache?.items || []).map(a => [a.id, a]));
  container.innerHTML = _equiposDelServicio.map(e => {
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

async function openAddEquipoSheet() {
  if (!editingService) return;
  document.getElementById('equipo-overlay').classList.add('open');
  const list = document.getElementById('equipo-options-list');
  list.innerHTML = `<div class="equipos-empty">${t('equipos.loading')}</div>`;
  const activos = await fetchActivosDisponibles();
  const pais = editingService.properties?.['País']?.select?.name || '';
  const yaAsignados = new Set(_equiposDelServicio.map(e => e.activoId));
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

function equipoOverlayClick(e) { if (e.target.id === 'equipo-overlay') closeAddEquipoSheet(); }
function closeAddEquipoSheet() { document.getElementById('equipo-overlay').classList.remove('open'); }

async function addEquipoToServicio(activoId, activoName) {
  if (!editingService) return;
  const pais = editingService.properties?.['País']?.select?.name || '';
  const properties = {
    'Equipo': { relation: [{ id: activoId }] },
    'Servicio': { relation: [{ id: editingService.id }] }
  };
  if (pais) properties['País'] = { select: { name: pais } };
  // Persona = piloto asignado si tiene notionId
  const operarioName = editingService.properties?.['Operario App']?.select?.name;
  const user = operarioName ? USERS.find(u => u.name === operarioName) : null;
  if (user?.notionId) {
    properties['Persona'] = { people: [{ object: 'user', id: user.notionId }] };
  }
  // Fecha programada del servicio
  const fecha = editingService.properties?.['Fecha programada']?.date?.start;
  if (fecha) properties['Fecha'] = { date: { start: fecha } };

  closeAddEquipoSheet();
  try {
    const created = await callNotion('pages', 'POST', {
      parent: { database_id: RUE_DB_ID },
      properties
    });
    _equiposDelServicio.push({ rueId: created.id, activoId, activoName, archived: false });
    renderEquiposChips();
  } catch (e) {
    alert((t('equipos.add.error') || 'Error al agregar equipo: ') + e.message);
  }
}

async function removeEquipoFromServicio(rueId) {
  if (!confirm(t('equipos.remove.confirm'))) return;
  try {
    await callNotion('pages/' + rueId, 'PATCH', { archived: true });
    _equiposDelServicio = _equiposDelServicio.filter(e => e.rueId !== rueId);
    renderEquiposChips();
  } catch (e) {
    alert((t('equipos.remove.error') || 'Error al quitar equipo: ') + e.message);
  }
}

function selectJornadaOperario(name, el) {
  jornadaState.operario = name;
  document.querySelectorAll('#jornada-operario-btns .operario-btn').forEach(b => b.classList.remove('active'));
  if (el) el.classList.add('active');
}

function computeNextJornadaNumero(parentService) {
  if (!parentService) return 2;
  const parentProps = parentService.properties || {};
  const parentPropuestaId = parentProps['Propuesta']?.relation?.[0]?.id;
  const parentContactoId = parentProps['Contacto']?.relation?.[0]?.id;
  const parentJornadaN = parentProps['Jornada N°']?.number;

  // Buscar todos los servicios linkeados a la misma propuesta o contacto, ya en memoria
  const relacionados = (_coordAllServices || []).filter(s => {
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

async function openCreateJornadaSheet() {
  if (!editingService) return;
  const props = editingService.properties || {};
  const nombre = props['Nombre del servicio']?.title?.[0]?.plain_text || '';

  // Setear defaults
  jornadaState.numero = computeNextJornadaNumero(editingService);
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  jornadaState.fecha = tomorrow.toISOString().split('T')[0];
  jornadaState.operario = props['Operario App']?.select?.name || null;

  // Renderizar inputs
  document.getElementById('jornada-numero').value = jornadaState.numero;
  document.getElementById('jornada-fecha').value = jornadaState.fecha;
  document.getElementById('jornada-sheet-sub').textContent = nombre;

  // Botones de operario — solo pilotos del país del servicio padre (mismo criterio que el sheet de edición).
  let options = operariosDePais(props['País']?.select?.name || '');
  if (jornadaState.operario && !options.includes(jornadaState.operario)) options = [jornadaState.operario, ...options];
  document.getElementById('jornada-operario-btns').innerHTML =
    `<button class="operario-btn ${!jornadaState.operario ? 'active' : ''}" onclick="selectJornadaOperario(null,this)">${t('sheet.edit.operario.sinasignar')}</button>` +
    options.map(name => `<button class="operario-btn ${jornadaState.operario === name ? 'active' : ''}" onclick="selectJornadaOperario(${JSON.stringify(name)},this)">${name}</button>`).join('');

  // Reset estado del botón submit
  const btn = document.getElementById('jornada-save-btn');
  btn.textContent = '✦ ' + t('sheet.jornada.btn.crear.short');
  btn.disabled = false;

  document.getElementById('jornada-overlay').classList.add('open');
}

async function submitCreateJornada() {
  if (!editingService) { alert('No hay servicio padre activo.'); return; }
  const numero = parseInt(document.getElementById('jornada-numero').value, 10);
  const fecha = document.getElementById('jornada-fecha').value;
  if (!numero || numero < 1) { alert(t('sheet.jornada.error.numero')); return; }
  if (!fecha) { alert(t('sheet.jornada.error.fecha')); return; }

  const btn = document.getElementById('jornada-save-btn');
  btn.textContent = '⏳ ' + t('sheet.jornada.creating');
  btn.disabled = true;

  const parentProps = editingService.properties || {};
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
    if (jornadaState.operario) {
      properties['Operario App'] = { select: { name: jornadaState.operario } };
      const userForOp = USERS.find(u => u.name === jornadaState.operario);
      if (userForOp?.notionId) {
        properties['Operario(s)'] = { people: [{ object: 'user', id: userForOp.notionId }] };
      }
    }

    // La base Servicios usa data_source_id (multiple data sources)
    await callNotion('pages', 'POST', {
      parent: { type: 'data_source_id', data_source_id: SERVICIOS_DS_ID },
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
function buildJornadaSiguienteProps(parentService, numero, fecha) {
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
    const userForOp = USERS.find(u => u.name === operarioApp);
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

async function crearJornadaSiguiente(parentService, numero, fecha) {
  const { properties } = buildJornadaSiguienteProps(parentService, numero, fecha);
  await callNotion('pages', 'POST', {
    parent: { type: 'data_source_id', data_source_id: SERVICIOS_DS_ID },
    properties
  });
}

function overlayClick(e) { if (e.target.id === 'edit-overlay') closeEditSheet(); }
function closeEditSheet() { document.getElementById('edit-overlay').classList.remove('open'); editingService = null; _editFromPorCobrar = false; if (typeof _contactHistoryCache !== 'undefined') Object.keys(_contactHistoryCache).forEach(k => delete _contactHistoryCache[k]); }
function selectEditEstado(estado) {
  editState.estado = estado;
  document.querySelectorAll('#edit-estado-btns .estado-btn').forEach(b => b.classList.toggle('active', b.textContent.trim() === estado));
}
// Multi-toggle: un servicio puede tener varios tipos (Fachada + Vidrios + Paneles). Tocar agrega/saca.
function selectEditTipoServicio(val) {
  if (!Array.isArray(editState.tipoServicios)) editState.tipoServicios = [];
  const i = editState.tipoServicios.indexOf(val);
  if (i === -1) editState.tipoServicios.push(val); else editState.tipoServicios.splice(i, 1);
  document.querySelectorAll('#edit-tiposervicio-btns .estado-btn').forEach(b => b.classList.toggle('active', editState.tipoServicios.includes(b.textContent.trim())));
}
function selectEditOperario(name, el) {
  editState.operario = name;
  document.querySelectorAll('#edit-operario-btns .operario-btn').forEach(b => b.classList.remove('active'));
  if (el) el.classList.add('active');
  // Si el nuevo encargado estaba en ayudantes, quitarlo (no puede ser ambos).
  if (name && Array.isArray(editState.participantes)) {
    editState.participantes = editState.participantes.filter(p => p !== name);
  }
  // Si el nuevo encargado era el operario manual, limpiar (no puede ser ambos).
  if (name && editState.operarioManual === name) {
    editState.operarioManual = null;
    renderOperarioManualBtns(null);
  }
  // Si el nuevo encargado era el piloto, limpiar (no puede ser ambos — 1 persona = 1 rol).
  if (name && editState.piloto === name) {
    editState.piloto = '';
    renderPilotoBtns();
  }
  renderParticipantesBtns();
}
async function saveServiceEdit() {
  const btn = document.getElementById('edit-save-btn');
  btn.textContent = t('btn.saving'); btn.disabled = true;
  try {
    const props = {};
    const nombreSvc = String(editState.nombre || '').trim();
    // Fix F1: el título se escribe SOLO si hay texto. Bloquear únicamente si el usuario BORRÓ un nombre que
    // existía; si la lectura vino rota (nombre vacío de origen), se puede guardar el resto sin tocar el título.
    if (!nombreSvc && editState._nombreOrig) { btn.textContent = t('btn.save.notion'); btn.disabled = false; alert('El nombre del servicio no puede quedar vacío.'); return; }
    if (nombreSvc && nombreSvc !== editState._nombreOrig) props['Nombre del servicio'] = { title: [{ text: { content: nombreSvc } }] };
    if (editState.estado) props['Estado'] = { select: { name: editState.estado } };
    if (editState.fecha) props['Fecha programada'] = { date: { start: editState.fecha } };
    // Hora Inicio: combinar fecha + hora en ISO con time. Si no hay hora, limpiar la property.
    // Notamos la hora como "<fecha>T<hora>:00" sin Z (timezone local del cliente). Notion lo acepta como datetime.
    if (editState.hora && editState.fecha) {
      props['Hora Inicio'] = { date: { start: `${editState.fecha}T${editState.hora}:00` } };
    } else if (!editState.hora) {
      props['Hora Inicio'] = { date: null };
    }
    if ((editState.lugar || '') !== editState._lugarOrig) // fix F1: solo si cambió (una lectura rota no borra el dato)
      props['Lugar'] = editState.lugar ? { rich_text: [{ text: { content: editState.lugar } }] } : { rich_text: [] };
    props['Mapa'] = editState.mapa ? { url: editState.mapa } : { url: null };
    props['Operario App'] = editState.operario ? { select: { name: editState.operario } } : { select: null };
    props['Piloto'] = editState.piloto ? { select: { name: editState.piloto } } : { select: null };
    props['Operario manual'] = editState.operarioManual ? { select: { name: editState.operarioManual } } : { select: null };
    const userForOp = editState.operario ? USERS.find(u => u.name === editState.operario) : null;
    if (userForOp?.notionId) {
      props['Operario(s)'] = { people: [{ object: 'user', id: userForOp.notionId }] };
    }
    // Operarios participantes (multi_select). Si la property no existe en Notion,
    // Notion ignora la key silenciosamente sin romper el resto del PATCH.
    const participantes = Array.isArray(editState.participantes) ? editState.participantes : [];
    props['Operarios participantes'] = { multi_select: participantes.map(name => ({ name })) };
    // Al asignar un operario, si el servicio seguía Pendiente, moverlo a 🔄 Asignado (auditoría 2026-07-09):
    // antes el coord tenía que cambiar el estado a mano y a veces quedaba Pendiente con piloto puesto. Solo
    // promovemos Pendiente→Asignado; NO tocamos En curso/Completado/Cancelado (estados fijados a propósito).
    {
      const _estadoActual = editState.estado || (editingService.properties?.['Estado']?.select?.name || '');
      if (editState.operario && (!_estadoActual || _estadoActual.includes('Pendiente'))) {
        props['Estado'] = { select: { name: '🔄 Asignado' } };
      }
    }
    {
      const secs = (Array.isArray(editState.sectores) ? editState.sectores : [])
        .map(x => ({ id: x.id, nombre: String(x.nombre || '').trim(), estado: x.estado || 'pendiente' }))
        .filter(x => x.nombre);
      // Fix F1: solo si cambió — una lectura rota del JSON (→ []) no debe BORRAR los sectores al guardar otra cosa.
      if (JSON.stringify(secs) !== editState._sectoresOrigJson)
        props['Estado sectores'] = { rich_text: secs.length ? [{ text: { content: JSON.stringify(secs) } }] : [] };
    }
    // Si se agregó un sector nuevo desde el servicio, persistirlo a la lista reusable del cliente.
    if (editState._sectoresClienteDirty && editState.contactoId && editState._sectoresClienteLoaded) {
      try {
        const cli = (Array.isArray(editState.sectoresCliente) ? editState.sectoresCliente : [])
          .map(x => ({ id: x.id, nombre: String(x.nombre || '').trim() }))
          .filter(x => x.nombre);
        await updateServiceProps(editState.contactoId, { 'Sectores': { rich_text: cli.length ? [{ text: { content: JSON.stringify(cli) } }] : [] } });
        if (typeof syncAfterWrite === 'function') { try { syncAfterWrite(editState.contactoId, 'clientes'); } catch (_) {} }
      } catch (_) { /* no bloquear el guardado del servicio si el cliente falla */ }
    }
    // multi_select desde 2026-07-04 (antes select). Se escribe SIEMPRE: array vacío = limpiar el campo.
    props['Tipo de servicio'] = { multi_select: (editState.tipoServicios || []).map(name => ({ name })) };
    if ((editState.notasPreServicio || '') !== editState._notasPreOrig) // fix F1: solo si cambió
      props['Notas pre-servicio'] = editState.notasPreServicio ? { rich_text: [{ text: { content: editState.notasPreServicio } }] } : { rich_text: [] };
    if ((editState.observacionCliente || '') !== editState._obsCliOrig) // fix F1: solo si cambió
      props['Observación cliente'] = editState.observacionCliente ? { rich_text: [{ text: { content: editState.observacionCliente } }] } : { rich_text: [] };
    // Cliente (R2): si se cambió desde el selector, resolver/crear y setear la relación Contacto del servicio.
    // Si resolveOrCreateClienteId devuelve null (nada ingresado), NO tocamos Contacto → no borra el existente.
    let _assignedCid = null;
    if (editState._clienteDirty && puedeAsignarCliente()) {
      try {
        const cid = await resolveOrCreateClienteId(editState.clienteForm || {});
        if (cid) {
          props['Contacto'] = { relation: [{ id: cid }] };
          _assignedCid = cid;
          const nm = editState.clienteForm?.nombreCliente || clienteNombreDe(cid) || '';
          if (nm) setClienteNombre(cid, nm);
        }
      } catch (_) { /* si falla, no tocar Contacto */ }
    }
    const updated = await updateServiceProps(editingService.id, props);
    // Optimista SOLO tras el PATCH exitoso (si fallaba, la card no debe mostrar un cliente no guardado).
    if (_assignedCid) editingService.properties['Contacto'] = { relation: [{ id: _assignedCid }] };
    syncAfterWrite(editingService.id, 'servicios');
    // Update optimista: garantizar que el servicio recién editado quede visible en la lista tras el
    // re-render. Notion puede tardar en indexar un servicio recién CREADO en los queries de lista, así
    // que el re-fetch podría no traerlo → sin esto, editarlo (ej. asignar piloto) lo hace desaparecer.
    // Usamos la página que devuelve el PATCH (formato completo, con los cambios); fallback al objeto en memoria.
    const _saved = (updated && updated.properties) ? updated : editingService;
    const _fromPC = _editFromPorCobrar;
    closeEditSheet();
    if (_fromPC && _porCobrarCtx) { await renderPorCobrar(_porCobrarCtx.containerId, _porCobrarCtx.opts); }
    else {
      // Refrescar la tab donde está parado el coord (Inicio/Servicios/Pruebas/Relevamientos). Antes
      // hardcodeaba renderCoordServicios: si editó desde 🏠 Inicio, el race-guard de esa función
      // abortaba y dejaba el spinner colgado (auditoría 2026-07-09). Cada render pasa su propio guard
      // porque activeCoordTab coincide.
      const rf = { inicio: renderCoordInicio, servicios: renderCoordServicios, pruebas: renderCoordPruebas, relevamientos: renderCoordRelevamientos }[activeCoordTab] || renderCoordServicios;
      await rf();
      if (Array.isArray(_coordAllServices) && _saved?.id && !_coordAllServices.some(s => s.id === _saved.id)) {
        _coordAllServices.unshift(_saved);
        if (typeof renderCoordList === 'function') renderCoordList();
      }
    }
  } catch (e) {
    btn.textContent = t('btn.save.notion'); btn.disabled = false;
    alert(t('sheet.alert.save.error2') + e.message);
  }
}

async function deleteService() {
  if (!editingService) return;
  const props = editingService.properties || {};
  const estado = props['Estado']?.select?.name || '';
  const esFin = !!(currentUser?.role && currentUser.role.includes('Administración'));
  const nombre = props['Nombre del servicio']?.title?.[0]?.plain_text || t('common.sinnombre');
  if (!confirm(t('sheet.edit.delete.confirm').replace('{name}', nombre))) return;
  // Coord/Dirección + Completado: registro histórico → confirmación EXTRA (antes estaba bloqueado).
  if (estado.includes('Completado') && !esFin && !confirm(t('sheet.edit.delete.confirm.completed').replace('{name}', nombre))) return;
  // Doble confirmación para Finanzas (papelera de Notion).
  if (esFin && !confirm('Confirmá de nuevo: "' + nombre + '" se va a la PAPELERA (recuperable 30 días). ¿Eliminar?')) return;

  const btn = document.getElementById('delete-svc-btn');
  if (btn) { btn.textContent = '⏳ ' + t('sheet.edit.deleting'); btn.disabled = true; }
  try {
    // Archive en Notion (in_trash=true). No es delete permanente — recuperable desde la papelera.
    await callNotion('pages/' + editingService.id, 'PATCH', { in_trash: true });
    syncAfterWrite(editingService.id, 'servicios');
    const _fromPC = _editFromPorCobrar;
    closeEditSheet();
    if (_fromPC && _porCobrarCtx) { await renderPorCobrar(_porCobrarCtx.containerId, _porCobrarCtx.opts); }
    else await renderCoordServicios();
  } catch (e) {
    if (btn) { btn.textContent = '🗑️ ' + t('sheet.edit.delete'); btn.disabled = false; }
    alert(t('sheet.edit.delete.error') + ' ' + e.message);
  }
}

async function archivarServicioFinanzas() {
  if (!editingService) return;
  if (!(currentUser?.role && currentUser.role.includes('Administración'))) return;
  const p = editingService.properties || {};
  const nombre = p['Nombre del servicio']?.title?.[0]?.plain_text || t('common.sinnombre');
  if (!confirm('Vas a ARCHIVAR "' + nombre + '".\n\nSale de "Por cobrar" pero NO se borra — Dirección lo puede desarchivar cuando quiera. ¿Confirmás?')) return;
  const btn = document.getElementById('archive-svc-btn');
  if (btn) { btn.textContent = '⏳ Archivando…'; btn.disabled = true; }
  try {
    await updateServiceProps(editingService.id, { '🗄️ Archivado': { checkbox: true } });
    syncAfterWrite(editingService.id, 'servicios');
    const _fromPC = _editFromPorCobrar;
    closeEditSheet();
    if (_fromPC && _porCobrarCtx) { await renderPorCobrar(_porCobrarCtx.containerId, _porCobrarCtx.opts); }
    else await renderCoordServicios();
  } catch (e) {
    if (btn) { btn.textContent = '🗄️ Archivar servicio'; btn.disabled = false; }
    alert('No se pudo archivar: ' + esc(e.message || String(e)));
  }
}

// ─────────────────────────────────────────────
// PDF Reports — movido a src/reporte.js el 16/07 (núcleo: jsPDF/marca/buildReportDoc/generateReportPDF).
// Acá quedan el modal previo (openReportStep/renderReportStep/submitReportStep) y la variante CEO,
// que dependen de flujos del coord/CEO. initReporte() le inyecta callNotion y el servicio en edición.
initReporte({ callNotion: (...a) => callNotion(...a), getEditingService: () => editingService });
// ─────────────────────────────────────────────
let reportStepState = null;

async function openReportStep(svc) {
  svc = svc || editingService;
  if (!svc) return;
  const props = svc.properties || {};
  const tipoReg = props['Tipo de registro']?.select?.name || '';
  const preSale = /Prueba|Relevamiento/.test(tipoReg);
  const obs = props['Observación cliente']?.rich_text?.[0]?.plain_text || '';
  reportStepState = { svc, obs, monto: null, moneda: '🇺🇸 USD', preSale, loadingMonto: preSale };
  document.getElementById('report-step-overlay').classList.add('open');
  renderReportStep();
  // Trae el importe de la propuesta vinculada (solo Prueba/Relevamiento) para pre-cargar el monto.
  if (preSale) {
    const propId = props['Propuesta']?.relation?.[0]?.id;
    if (propId) {
      try {
        const prop = await callNotion('pages/' + propId, 'GET');
        const imp = prop?.properties?.['Importe estimado']?.number;
        if (imp != null && reportStepState) reportStepState.monto = imp;
      } catch (e) { console.warn('[reporte] no se pudo traer el Importe estimado de la propuesta:', e); }
    }
    if (reportStepState) { reportStepState.loadingMonto = false; renderReportStep(); }
  }
}

function renderReportStep() {
  const s = reportStepState;
  if (!s) return;
  const body = document.getElementById('report-step-body');
  if (!body) return;
  const montoBlock = s.preSale ? `
    <div class="gasto-form-row" style="margin-top:14px">
      <label>${t('report.step.monto.label')}</label>
      <div style="display:flex;gap:8px">
        <input type="number" id="rs-monto" step="0.01" min="0" inputmode="decimal" placeholder="${s.loadingMonto ? '…' : '0'}" value="${s.monto != null ? s.monto : ''}" oninput="reportStepState.monto = this.value === '' ? null : (parseFloat(this.value) || 0)" style="flex:1"/>
        <select id="rs-moneda" onchange="reportStepState.moneda=this.value" style="width:108px">
          <option value="🇺🇸 USD" ${s.moneda === '🇺🇸 USD' ? 'selected' : ''}>USD</option>
          <option value="🇺🇾 UY$" ${s.moneda === '🇺🇾 UY$' ? 'selected' : ''}>UY$</option>
        </select>
      </div>
    </div>` : '';
  body.innerHTML = `
    <div class="gasto-form-row">
      <label>${t('report.step.obs.label')}</label>
      <textarea id="rs-obs" rows="4" placeholder="${esc(t('report.step.obs.hint'))}" oninput="reportStepState.obs=this.value" style="resize:vertical;min-height:84px">${esc(s.obs || '')}</textarea>
    </div>
    ${montoBlock}
    <div style="display:flex;gap:10px;margin-top:20px">
      <button type="button" onclick="closeReportStep()" style="flex:1;padding:13px;background:var(--bg);border:1px solid var(--border);border-radius:12px;color:var(--text2);font-family:'Exo 2',sans-serif;font-size:14px;font-weight:600;cursor:pointer">${t('report.step.cancel')}</button>
      <button type="button" id="rs-generate-btn" onclick="submitReportStep()" style="flex:2;padding:13px;background:#00C98D;border:none;border-radius:12px;color:#04130d;font-family:'Exo 2',sans-serif;font-size:14px;font-weight:700;cursor:pointer">📄 ${t('report.step.generate')}</button>
    </div>`;
}

function closeReportStep() {
  const ov = document.getElementById('report-step-overlay');
  if (ov) ov.classList.remove('open');
  reportStepState = null;
}

function reportStepOverlayClick(e) {
  if (e.target.id === 'report-step-overlay') closeReportStep();
}

// ─────────────────────────────────────────────
// SECTOR OVERLAY (mini-flujo: fotos antes/después + marcar hecho)
// ─────────────────────────────────────────────
let sectorOverlayState = null; // { sectorId }

function openSectorOverlay(id) {
  const sec = (serviceState.sectores || []).find(s => s.id === id);
  if (!sec) return;
  sectorOverlayState = { sectorId: id };
  // Al abrir, si estaba pendiente pasa a "en curso".
  if (sec.estado === 'pendiente') { sec.estado = 'en_curso'; persistServiceState(); }
  document.getElementById('sector-overlay').classList.add('open');
  renderSectorOverlay();
}

function renderSectorOverlay() {
  const st = sectorOverlayState;
  if (!st) return;
  const sec = (serviceState.sectores || []).find(s => s.id === st.sectorId);
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

function marcarSectorHecho() {
  const st = sectorOverlayState;
  if (!st) return;
  const sec = (serviceState.sectores || []).find(s => s.id === st.sectorId);
  if (!sec) return;
  const preOk = sectorFotos(sec.id, 'pre').filter(fotoTomada).length;
  const postOk = sectorFotos(sec.id, 'post').filter(fotoTomada).length;
  if (preOk < 1 || postOk < 1) { alert(t('sector.fotos.min')); return; }
  sec.estado = 'hecho';
  persistServiceState();
  closeSectorOverlay();
  renderStep(); // refresca el hub (estado + %)
}

function closeSectorOverlay() {
  const ov = document.getElementById('sector-overlay');
  if (ov) ov.classList.remove('open');
  sectorOverlayState = null;
}

function sectorOverlayClick(e) { if (e.target.id === 'sector-overlay') closeSectorOverlay(); }

function openCierreSectoresModal(pendientes) {
  const sub = document.getElementById('cierre-sectores-sub');
  if (sub) sub.textContent = t('cierre.sectores.sub').replace('{n}', pendientes);
  document.getElementById('cierre-sectores-overlay').classList.add('open');
}
function closeCierreSectoresModal() {
  document.getElementById('cierre-sectores-overlay').classList.remove('open');
}
function cierreSectoresOverlayClick(e) { if (e.target.id === 'cierre-sectores-overlay') closeCierreSectoresModal(); }
async function cierreSectoresElegir(modo) {
  // 'completar' exige resultado (el servicio termina); 'continuar' no (sigue otro día).
  if (modo === 'completar' && !_cierreResultadoOk()) return;
  // Cerrar un servicio con sectores SIN terminar es excepcional → doble confirmación (algo pasó;
  // lo normal sería "seguir otro día"). Recuento de sectores pendientes para el mensaje.
  if (modo === 'completar') {
    const pend = (serviceState.sectores || []).filter(s => s.estado !== 'hecho').length;
    if (!confirm(t('cierre.sectores.confirm.cerrar').replace('{n}', pend))) return;
  }
  closeCierreSectoresModal();
  await _ejecutarCierre(modo);
}

async function submitReportStep() {
  const s = reportStepState;
  if (!s) return;
  const svc = s.svc;
  const obs = (s.obs || '').trim();
  const monto = (s.preSale && s.monto != null && s.monto !== '') ? Number(s.monto) : null;
  const moneda = s.moneda || '🇺🇸 USD';
  const genBtn = document.getElementById('rs-generate-btn');
  if (genBtn) { genBtn.textContent = '⏳ ' + t('pdf.generating'); genBtn.disabled = true; }
  // Guarda la observación en Notion (persiste) + en memoria para que al reabrir aparezca.
  if (svc && svc.id) {
    const rt = obs ? [{ text: { content: obs } }] : [];
    svc.properties = svc.properties || {};
    svc.properties['Observación cliente'] = { rich_text: rt };
    callNotion('pages/' + svc.id, 'PATCH', { properties: { 'Observación cliente': { rich_text: rt } } }).catch(() => {});
  }
  await generateReportPDF(svc, { obs, monto, moneda });
  closeReportStep();
}

function generateReportPDFFromCEO(id) {
  const svc = (_ceoServiciosCache || []).find(s => s.id === id);
  if (svc) openReportStep(svc);
}

// ── PDF de PROPUESTA comercial al cliente (#5) — reusa el motor jsPDF + marca del reporte de devolución.
// Condiciones comerciales por defecto (bilingüe); a futuro editables en ⚙️ como las plantillas de WhatsApp.
const PROPOSAL_LBL = {
  es: { titulo: 'Propuesta comercial', datos: 'Datos de la propuesta', cliente: 'Cliente', prop: 'Propuesta', tipo: 'Modalidad', pais: 'País', fecha: 'Fecha', importe: 'Inversión estimada', porano: 'Servicios por año', obs: 'Detalle', cond: 'Condiciones', pagina: 'Página', de: 'de', generado: 'Generado el',
    puntual: 'Servicio puntual', recurrente: 'Servicio recurrente',
    terminos: ['Validez de la propuesta: 15 días desde su emisión.', 'Los valores no incluyen impuestos, salvo indicación expresa.', 'Coordinación de fecha sujeta a condiciones climáticas aptas para el vuelo.', 'Formas de pago a convenir. Consultas: www.flyclean.app'] },
  ptBR: { titulo: 'Proposta comercial', datos: 'Dados da proposta', cliente: 'Cliente', prop: 'Proposta', tipo: 'Modalidade', pais: 'País', fecha: 'Data', importe: 'Investimento estimado', porano: 'Serviços por ano', obs: 'Detalhe', cond: 'Condições', pagina: 'Página', de: 'de', generado: 'Gerado em',
    puntual: 'Serviço pontual', recurrente: 'Serviço recorrente',
    terminos: ['Validade da proposta: 15 dias a partir da emissão.', 'Os valores não incluem impostos, salvo indicação expressa.', 'Agendamento sujeito a condições climáticas adequadas para o voo.', 'Formas de pagamento a combinar. Contato: www.flyclean.app'] },
};

async function buildProposalDoc(prop, extra = {}) {
  if (!prop) throw new Error('sin propuesta');
  const JS = await ensureJsPDF();
  if (!JS) throw new Error(t('pdf.notloaded'));
  const brand = await ensureReportBrand();
  const ptLang = currentLang === 'pt-BR';
  const L = PROPOSAL_LBL[ptLang ? 'ptBR' : 'es'];
  const locale = ptLang ? 'pt-BR' : 'es-UY';
  const p = prop.properties || {};
  const clean = (s) => String(s || '').replace(/[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}️‍]/gu, '').replace(/\s+/g, ' ').trim();
  const sel = (k) => clean(p[k]?.select?.name || '');
  const nombre = clean(p['Nombre de propuesta']?.title?.[0]?.plain_text || 'Propuesta');
  const importe = p['Importe estimado']?.number;
  const monedaTag = sel('Moneda') || 'USD'; // 'USD' | 'UY$'
  const esRecurrente = /Recurrente/.test(p['Tipo']?.select?.name || '');
  const porAno = p['Servicios por año']?.number;
  const obs = p['Observaciones']?.rich_text?.[0]?.plain_text || '';
  const fechaEnvio = p['Fecha de envío']?.date?.start;
  const fmtDate = (iso) => { if (!iso) return '—'; const d = new Date(iso.length === 10 ? iso + 'T00:00:00' : iso); return isNaN(d) ? iso : d.toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' }); };
  const hoy = new Date().toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' });
  const fmtMonto = (n) => (monedaTag.includes('UY') ? 'UYU ' : 'USD ') + Number(n).toLocaleString(locale, { minimumFractionDigits: 0, maximumFractionDigits: 2 });

  // Cliente vinculado (mismo patrón que buildReportDoc).
  let clienteName = '—';
  const rel = p['Contacto']?.relation || [];
  if (rel[0]?.id) {
    try {
      const c = await callNotion('pages/' + rel[0].id, 'GET');
      const cp = c?.properties || {};
      for (const k in cp) { const tt = cp[k]?.title; if (Array.isArray(tt) && tt.length) { clienteName = tt.map(x => x.plain_text).join('') || '—'; break; } }
    } catch (e) { console.warn('[propuesta] cliente:', e); }
  }

  const doc = new JS({ unit: 'mm', format: 'a4' });
  let useExo = false;
  if (brand) { try { brand.register(doc); useExo = true; } catch (_) {} }
  const FONT = useExo ? 'Exo2' : 'helvetica';
  const F = (st) => doc.setFont(FONT, st);
  const PW = 210, M = 14, BOT = 282;
  const GREEN = [0, 201, 141], SECT = [0, 165, 120], DARK = [20, 31, 25], LBLC = [70, 107, 94], MUTE = [150, 160, 156];
  let y = 0;
  const topStrip = () => { doc.setFillColor(...GREEN); doc.rect(0, 0, PW, 3, 'F'); if (brand?.logo) { try { doc.addImage(brand.logo, 'PNG', M, 6, 6, 6); } catch (_) {} } doc.setTextColor(...SECT); F('bold'); doc.setFontSize(10); doc.text('FlyClean', brand?.logo ? M + 8 : M, 10.5); };
  const newPageIf = (need) => { if (y + need > BOT) { doc.addPage(); topStrip(); y = 20; } };

  // Header
  doc.setFillColor(...GREEN); doc.rect(0, 0, PW, 40, 'F');
  if (brand?.logo) { try { doc.addImage(brand.logo, 'PNG', M, 9, 18, 18); } catch (_) {} }
  const tx = brand?.logo ? M + 23 : M;
  doc.setTextColor(255, 255, 255); F('bold'); doc.setFontSize(24); doc.text('FlyClean', tx, 19);
  F('normal'); doc.setFontSize(13); doc.text(L.titulo, tx, 28);
  doc.setFontSize(9); doc.text(fmtDate(fechaEnvio) !== '—' ? fmtDate(fechaEnvio) : hoy, PW - M, 12, { align: 'right' });
  y = 50;

  const section = (title) => { newPageIf(12); F('bold'); doc.setFontSize(11); doc.setTextColor(...SECT); doc.text(String(title).toUpperCase(), M, y); doc.setDrawColor(179, 237, 217); doc.setLineWidth(0.3); doc.line(M, y + 1.5, PW - M, y + 1.5); y += 7; };
  const row = (label, value) => { if (value == null || value === '') return; const vl = doc.splitTextToSize(String(value), 118); newPageIf(5.5 * vl.length + 2); F('normal'); doc.setFontSize(10.5); doc.setTextColor(...LBLC); doc.text(String(label), M, y); F('bold'); doc.setTextColor(...DARK); doc.text(vl, PW - M, y, { align: 'right' }); y += 5.5 * vl.length + 1.5; doc.setDrawColor(232, 240, 236); doc.setLineWidth(0.2); doc.line(M, y - 1.5, PW - M, y - 1.5); };

  section(L.datos);
  row(L.cliente, clienteName);
  row(L.prop, nombre);
  row(L.tipo, esRecurrente ? L.recurrente : L.puntual);
  if (esRecurrente && porAno != null) row(L.porano, String(porAno));
  row(L.pais, sel('País'));
  row(L.fecha, fmtDate(fechaEnvio) !== '—' ? fmtDate(fechaEnvio) : hoy);

  // Importe destacado
  if (importe != null) {
    newPageIf(24);
    doc.setFillColor(240, 250, 246); doc.setDrawColor(...GREEN); doc.setLineWidth(0.5); doc.roundedRect(M, y, PW - M * 2, 18, 2, 2, 'FD');
    F('normal'); doc.setFontSize(10); doc.setTextColor(...LBLC); doc.text(L.importe.toUpperCase(), M + 5, y + 7);
    F('bold'); doc.setFontSize(18); doc.setTextColor(...DARK); doc.text(fmtMonto(importe), PW - M - 5, y + 12, { align: 'right' });
    y += 24;
  }

  if (obs) { section(L.obs); F('normal'); doc.setFontSize(10.5); doc.setTextColor(...DARK); const nl = doc.splitTextToSize(obs, PW - M * 2 - 8); newPageIf(nl.length * 5 + 8); doc.setFillColor(247, 250, 249); doc.setDrawColor(224, 235, 231); doc.roundedRect(M, y, PW - M * 2, nl.length * 5 + 8, 2, 2, 'FD'); doc.text(nl, M + 4, y + 6); y += nl.length * 5 + 12; }

  // Condiciones
  section(L.cond);
  (extra.terminos || L.terminos).forEach(txt => { const ls = doc.splitTextToSize('•  ' + txt, PW - M * 2 - 4); newPageIf(ls.length * 5 + 2); F('normal'); doc.setFontSize(9.5); doc.setTextColor(...DARK); doc.text(ls, M + 2, y); y += ls.length * 5 + 2; });

  // Footer
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) { doc.setPage(i); F('normal'); doc.setFontSize(8); doc.setTextColor(...MUTE); doc.text(L.generado + ' ' + hoy + ' — FlyClean SAS · www.flyclean.app', PW / 2, 290, { align: 'center' }); doc.text(L.pagina + ' ' + i + ' ' + L.de + ' ' + pages, PW - M, 290, { align: 'right' }); }
  return { doc, nombre };
}

// #7 — Calculadora de precio sugerido: usa los costos de ⚙️ + m² + método. Rellena el campo Importe.
// Fórmula: base = m² × costo_m²(método); precio = base × (1 + margen%); piso = mínimo. Redondea a $50.
function calcularPrecioPropuesta() {
  if (!costosCargados()) { alert(t('calc.nocfg')); return; }
  const m2raw = prompt(t('calc.m2'));
  if (m2raw == null) return;
  const m2 = parseFloat(String(m2raw).replace(',', '.'));
  if (!Number.isFinite(m2) || m2 <= 0) { alert(t('calc.m2.invalid')); return; }
  const usarManual = confirm(t('calc.metodo')); // OK = Manual, Cancelar = Dron
  const costoM2 = cfgCosto(usarManual ? 'm2Manual' : 'm2Dron');
  if (costoM2 == null || costoM2 <= 0) { alert(t('calc.nocfg')); return; }
  const margen = cfgCosto('margen') || 0;
  const minimo = cfgCosto('minimo') || 0;
  let precio = m2 * costoM2 * (1 + margen / 100);
  precio = Math.round(precio / 50) * 50; // redondeo comercial
  const piso = Math.ceil(minimo / 50) * 50;
  if (precio < piso) precio = piso; // el piso se aplica DESPUÉS del redondeo (no queda por debajo del mínimo)
  propEditState.importe = String(precio);
  const inp = document.getElementById('prop-importe-input');
  if (inp) inp.value = precio;
  alert(t('calc.result').replace('{m2}', m2).replace('{metodo}', usarManual ? t('calc.manual') : t('calc.dron')).replace('{precio}', '$ ' + precio.toLocaleString('es-UY')));
}

async function generateProposalPDF(prop) {
  prop = prop || editingProp;
  if (!prop) return;
  const btn = document.getElementById('prop-pdf-btn');
  const orig = btn?.textContent;
  if (btn) { btn.textContent = '⏳ ' + t('pdf.generating'); btn.disabled = true; }
  try {
    const { doc, nombre } = await buildProposalDoc(prop);
    const fname = (nombre || 'propuesta').replace(/[^a-z0-9-_ ]/gi, '').trim().replace(/\s+/g, '-') || 'propuesta';
    const filename = 'FlyClean-Propuesta-' + fname + '.pdf';
    // Compartir nativo si el dispositivo lo soporta (mandar el PDF sin descargar); si no, descarga.
    let shared = false;
    if (navigator.canShare && navigator.share) {
      try {
        const blob = doc.output('blob');
        const file = new File([blob], filename, { type: 'application/pdf' });
        if (navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: nombre }); shared = true; }
      } catch (e) { if (e && e.name === 'AbortError') shared = true; } // el usuario canceló el share → no descargar
    }
    if (!shared) doc.save(filename);
  } catch (e) {
    console.error('PDF propuesta', e);
    alert(t('pdf.error') + ' ' + (e.message || ''));
  } finally {
    if (btn && orig) { btn.textContent = orig; btn.disabled = false; }
  }
}

// ─────────────────────────────────────────────
// 📊 RESUMEN — dashboard mensual del coordinador (SOLO LECTURA).
// KPIs del mes + comparación vs el mes anterior. No escribe nada en Notion.
// Navega meses con el month-nav (coordMonthOffset, vía getCoordMonthRange()).
// ─────────────────────────────────────────────

// Rango {start,end} del mes ANTERIOR al que muestra el month-nav, SIN mutar coordMonthOffset.
function getCoordPrevMonthRange() {
  const { base } = getCoordMonthRange();
  const prev = new Date(base.getFullYear(), base.getMonth() - 1, 1);
  const start = prev.toISOString().split('T')[0];
  const end = new Date(prev.getFullYear(), prev.getMonth() + 1, 0).toISOString().split('T')[0];
  return { start, end, base: prev };
}

// Filtro de país para Servicios/Propuestas (DB con label COUNTRY_NOTION_MAP: '🇺🇾 Uruguay').
// Devuelve null si el coordinador es global (Dirección / CEO Uruguay).
function coordResumenServicePaisFilter() {
  return getCountryFilter(); // { property:'País', select:{ equals:'🇺🇾 Uruguay' } } | null
}

// Trae todas las propuestas del workspace una sola vez (DB chica) y filtra cliente-side.
// Se hace en cliente porque algunos filtros (created_time + estado + país con search-fallback)
// son frágiles server-side; preferimos una sola query paginada y cortar acá.
async function fetchAllPropuestas() {
  const data = await callNotionAll(`databases/${PROPUESTAS_DB_ID}/query`, {});
  return data.results || [];
}

async function renderCoordResumen() {
  if (esVentas()) return; // blindaje: Ventas no ve Resumen, ni por un llamado directo
  const content = document.getElementById('coord-content');
  if (!content) return;
  content.innerHTML = '<div style="text-align:center;padding:40px 0"><div class="spinner" style="margin:0 auto"></div></div>';
  // El month-nav muestra el mes activo. El label normalmente lo setea renderWeekStrip,
  // pero acá el week-strip está oculto → lo seteamos a mano.
  const cur = getCoordMonthRange();
  const labelEl = document.getElementById('coord-month-label');
  if (labelEl) labelEl.textContent = cur.label;
  const myTab = 'resumen';

  try {
    const prev = getCoordPrevMonthRange();
    const svcCF = coordResumenServicePaisFilter();
    const svcCountryNotion = svcCF ? COUNTRY_NOTION_MAP[selectedCountry] : null;

    // Filtro Servicios por mes (Fecha programada) + país server-side (best-effort).
    const svcMonthFilter = (s, e) => ({ and: [
      ...(svcCF ? [svcCF] : []),
      { property: 'Fecha programada', date: { on_or_after: s } },
      { property: 'Fecha programada', date: { on_or_before: e } }
    ]});
    // El coordinador NO ve métricas financieras (Facturado/Ticket/Jornada) → no se piden Ingresos.
    const [svcCurRaw, svcPrevRaw, allProps] = await Promise.all([
      callNotion(`databases/${DB_ID}/query`, 'POST', { filter: svcMonthFilter(cur.start, cur.end) }),
      callNotion(`databases/${DB_ID}/query`, 'POST', { filter: svcMonthFilter(prev.start, prev.end) }),
      fetchAllPropuestas()
    ]);
    if (activeCoordTab !== myTab) return; // tab cambió mientras se cargaba → abortar

    // ── Servicios: re-filtrar país cliente-side (el search-fallback ignora el filtro server). ──
    const inPais = s => !svcCountryNotion || (s.properties?.['País']?.select?.name === svcCountryNotion);
    // El search-fallback de la DB Servicios IGNORA el filtro de fecha server-side → re-filtrar por mes
    // en CLIENTE (si no, "Días trabajados" y "Clientes" mostraban TODO y no se movían al cambiar de mes).
    const inRango = (s, st, en) => { const f = s.properties?.['Fecha programada']?.date?.start || ''; return !!f && f >= st && f <= en; };
    const svcCur = (svcCurRaw.results || []).filter(inPais).filter(s => !esArchivado(s) && inRango(s, cur.start, cur.end));
    const svcPrev = (svcPrevRaw.results || []).filter(inPais).filter(s => !esArchivado(s) && inRango(s, prev.start, prev.end));

    // Helpers de lectura de servicios.
    const estadoDe = s => s.properties?.['Estado']?.select?.name || '';
    const tipoRegDe = s => s.properties?.['Tipo de registro']?.select?.name || '';
    const fechaDe = s => s.properties?.['Fecha programada']?.date?.start || '';
    const esOrdenOJornada = s => { const tr = tipoRegDe(s); return !tr.includes('Prueba') && !tr.includes('Relevamiento'); };

    // 1) Días trabajados: fechas distintas entre Orden/Jornada, Estado ≠ Cancelado.
    const diasSet = (arr) => {
      const set = new Set();
      arr.filter(s => esOrdenOJornada(s) && !estadoDe(s).includes('Cancelado')).forEach(s => { const f = fechaDe(s); if (f) set.add(f); });
      return set.size;
    };
    const diasCur = diasSet(svcCur), diasPrev = diasSet(svcPrev);

    // 2) Clientes distintos: ids de Contacto (relation) en los servicios del mes (todos los tipos).
    const clientesSet = (arr) => {
      const set = new Set();
      arr.forEach(s => (s.properties?.['Contacto']?.relation || []).forEach(r => { if (r.id) set.add(r.id); }));
      return set.size;
    };
    const cliCur = clientesSet(svcCur), cliPrev = clientesSet(svcPrev);

    // ── Propuestas (cliente-side desde allProps). ──
    const propPaisOk = p => !svcCountryNotion || (p.properties?.['País']?.select?.name === svcCountryNotion);
    const propsScoped = allProps.filter(propPaisOk);
    const inMonth = (val, s, e) => !!val && val.slice(0, 10) >= s && val.slice(0, 10) <= e;
    const fEnvio = p => p.properties?.['Fecha de envío']?.date?.start || '';
    const fCreado = p => p.created_time || p.properties?.['Fecha de creación']?.created_time || '';
    const estadoPipe = p => p.properties?.['Estado pipeline']?.select?.name || '';

    // 4) Presupuestos enviados (Fecha de envío en el mes).
    const enviadasCur = propsScoped.filter(p => inMonth(fEnvio(p), cur.start, cur.end));
    const enviadasPrevN = propsScoped.filter(p => inMonth(fEnvio(p), prev.start, prev.end)).length;
    const enviadasCurN = enviadasCur.length;

    // 5) Propuestas recibidas (created_time en el mes).
    const recibidasCurN = propsScoped.filter(p => inMonth(fCreado(p), cur.start, cur.end)).length;
    const recibidasPrevN = propsScoped.filter(p => inMonth(fCreado(p), prev.start, prev.end)).length;

    // 6) Aceptadas / enviadas: de las enviadas del mes, cuántas están en estado Aceptada.
    const aceptadasN = enviadasCur.filter(p => estadoPipe(p).includes('Aceptada')).length;
    const tasaAceptPct = enviadasCurN ? Math.round(aceptadasN / enviadasCurN * 100) : null;

    // 7) Pendientes (snapshot actual, no por mes): Enviada al cliente / Negociando.
    const pendientesN = propsScoped.filter(p => { const e = estadoPipe(p); return e.includes('Enviada al cliente') || e.includes('Negociando'); }).length;

    // ── Delta helper: ▲/▼ + diferencia absoluta. unit opcional ('UY$'/'USD' o número). ──
    const deltaCount = (c, p) => {
      const diff = c - p;
      if (diff === 0) return '<div class="kpi-delta flat">＝ igual ' + t('coord.resumen.vsmesant') + '</div>';
      const up = diff > 0;
      return '<div class="kpi-delta ' + (up ? 'up' : 'down') + '">' + (up ? '▲' : '▼') + ' ' + (up ? '+' : '−') + Math.abs(diff) + ' ' + t('coord.resumen.vsmesant') + '</div>';
    };
    // ── Render de la grilla. ──
    const cards = [];
    // 1 Días trabajados
    cards.push('<div class="metric-card"><div class="metric-label">' + t('coord.resumen.diastrab') + '</div><div class="metric-value">' + diasCur + '</div><div class="metric-sub">' + t('coord.resumen.diastrab.sub') + '</div>' + deltaCount(diasCur, diasPrev) + '</div>');
    // 2 Clientes
    cards.push('<div class="metric-card"><div class="metric-label">' + t('coord.resumen.clientes') + '</div><div class="metric-value">' + cliCur + '</div><div class="metric-sub">' + t('coord.resumen.clientes.sub') + '</div>' + deltaCount(cliCur, cliPrev) + '</div>');
    // 4 Presupuestos enviados
    cards.push('<div class="metric-card"><div class="metric-label">' + t('coord.resumen.presupuestos') + '</div><div class="metric-value">' + enviadasCurN + '</div><div class="metric-sub">' + t('coord.resumen.presupuestos.sub') + '</div>' + deltaCount(enviadasCurN, enviadasPrevN) + '</div>');
    // 5 Propuestas recibidas
    cards.push('<div class="metric-card"><div class="metric-label">' + t('coord.resumen.recibidas') + '</div><div class="metric-value">' + recibidasCurN + '</div><div class="metric-sub">' + t('coord.resumen.recibidas.sub') + '</div>' + deltaCount(recibidasCurN, recibidasPrevN) + '</div>');
    // 6 Aceptadas / enviadas
    const aceptVal = enviadasCurN ? (aceptadasN + '/' + enviadasCurN) : '—';
    const aceptSub = (tasaAceptPct != null) ? (tasaAceptPct + '% ' + t('coord.resumen.aceptadas.sub')) : t('coord.resumen.aceptadas.sub');
    cards.push('<div class="metric-card"><div class="metric-label">' + t('coord.resumen.aceptadas') + '</div><div class="metric-value">' + aceptVal + '</div><div class="metric-sub">' + aceptSub + '</div></div>');
    // 7 Pendientes (snapshot)
    cards.push('<div class="metric-card"><div class="metric-label">' + t('coord.resumen.pendientes') + '</div><div class="metric-value">' + pendientesN + '</div><div class="metric-sub">' + t('coord.resumen.pendientes.sub') + '</div></div>');

    content.innerHTML = '<div class="metric-grid">' + cards.join('') + '</div>';
  } catch (e) {
    if (activeCoordTab !== myTab) return;
    content.innerHTML = `<div class="coord-empty">${t('coord.error.load')}<br><small>${esc(e.message)}</small></div>`;
  }
}

async function fetchCoordItemsForMonth() {
  const { start, end } = getCoordMonthRange();
  const cf = getCountryFilter();
  const filter = {
    or: [
      { and: [
        ...(cf ? [cf] : []),
        { property: 'Fecha programada', date: { on_or_after: start } },
        { property: 'Fecha programada', date: { on_or_before: end } }
      ]},
      ...(cf
        ? [{ and: [cf, { property: 'Fecha programada', date: { is_empty: true } }] }]
        : [{ property: 'Fecha programada', date: { is_empty: true } }]
      )
    ]
  };
  // Fase 2: si el flag está prendido, leer servicios de la base NUEVA (Supabase, más confiable que el search-fallback
  // multi-source de Notion); si falla → fallback a Notion. El re-filtro cliente (filtrarServicios) es el mismo.
  const notionFetch = () => callNotion(`databases/${DB_ID}/query`, 'POST', { filter, sorts: [{ property: 'Fecha programada', direction: 'ascending' }] });
  let data;
  if (dbFlag('servicios')) {
    try { data = await callDb('servicios'); } catch (e) { data = await notionFetch(); }
  } else {
    data = await notionFetch();
  }
  // El proxy descarta el filtro server-side (multi-data-source) → re-filtrar SIEMPRE en cliente:
  // país + mes (incluyendo los servicios SIN fecha, que se muestran en todos los meses, igual que el filtro server).
  const notionVal = getCountryFilter() ? COUNTRY_NOTION_MAP[selectedCountry] : null;
  return filtrarServicios(data.results || [], { paisNotion: notionVal, desde: start, hasta: end, incluirSinFecha: true, incluirEnCurso: true });
}

// 🏠 Inicio — centro de mando. Muestra TODO junto (servicios + jornadas + pruebas +
// relevamientos) en las 3 vistas (Lista / Tablero / Calendario), SIN filtrar por
// Tipo de registro. La única diferencia con renderCoordServicios es justamente eso:
// acá _coordAllServices queda con todos los items del mes. El chip de tipo en la card
// (coordServiceCard) solo aparece en esta tab para distinguirlos.
async function renderCoordInicio() {
  if (esVentas()) return; // blindaje: Ventas no ve Inicio, ni por un llamado directo
  const content = document.getElementById('coord-content');
  content.innerHTML = '<div style="text-align:center;padding:40px 0"><div class="spinner" style="margin:0 auto"></div></div>';
  document.getElementById('coord-week-strip').style.display = 'none'; // tira de días quitada (2026-07-06): se usa la agrupación por fecha + el ‹ mes ›
  // Guard de race condition: si el usuario cambia de tab mientras este fetch está en vuelo,
  // cuando termine NO sobrescribir el content del tab nuevo.
  const myTab = 'inicio';
  try {
    const items = await fetchCoordItemsForMonth();
    if (activeCoordTab !== myTab) return; // tab cambió → abortar
    _coordAllServices = items.filter(s => !esArchivado(s)); // SIN filtro de tipo → todos (servicios + jornadas + pruebas + relevamientos)
    if (!selectedCoordDay) selectedCoordDay = 'all';
    renderWeekStrip(_coordAllServices);
    // El toggle Lista/Tablero/Calendario solo se ve en Inicio. renderCoordServiciosView lo muestra (display:flex) y decide qué pintar.
    renderCoordServiciosView();
    refreshCoordFilterSheetIfOpen();
  } catch (e) {
    if (activeCoordTab !== myTab) return;
    content.innerHTML = `<div class="coord-empty">${t('coord.error.load')}<br><small>${esc(e.message)}</small></div>`;
  }
}

async function renderCoordServicios() {
  if (esVentas()) return; // blindaje: Ventas no ve Servicios, ni por un llamado directo
  const content = document.getElementById('coord-content');
  content.innerHTML = '<div style="text-align:center;padding:40px 0"><div class="spinner" style="margin:0 auto"></div></div>';
  document.getElementById('coord-week-strip').style.display = 'none'; // tira de días quitada (2026-07-06): se usa la agrupación por fecha + el ‹ mes ›
  document.getElementById('coord-view-toggle').style.display = 'none'; // toggle Lista/Tablero solo en Inicio
  // Guard de race condition: si el usuario cambia de tab mientras este fetch está en vuelo,
  // cuando termine NO sobrescribir el content del tab nuevo.
  const myTab = 'servicios';
  try {
    const items = await fetchCoordItemsForMonth();
    if (activeCoordTab !== myTab) return; // tab cambió → abortar
    _coordAllServices = items.filter(s => {
      if (esArchivado(s)) return false;
      const tipoReg = s.properties?.['Tipo de registro']?.select?.name || '';
      return !tipoReg.includes('Relevamiento') && !tipoReg.includes('Prueba');
    });
    if (!selectedCoordDay) selectedCoordDay = 'all';
    renderWeekStrip(_coordAllServices);
    // Servicios = lista cronológica simple (sin toggle de vistas; eso vive en Inicio).
    renderCoordList();
    refreshCoordFilterSheetIfOpen();
  } catch (e) {
    if (activeCoordTab !== myTab) return;
    content.innerHTML = `<div class="coord-empty">${t('coord.error.load')}<br><small>${esc(e.message)}</small></div>`;
  }
}

async function renderCoordPruebas() {
  if (esVentas()) return; // blindaje: Ventas no ve Pruebas, ni por un llamado directo
  const content = document.getElementById('coord-content');
  content.innerHTML = '<div style="text-align:center;padding:40px 0"><div class="spinner" style="margin:0 auto"></div></div>';
  document.getElementById('coord-week-strip').style.display = 'none'; // tira de días quitada (2026-07-06): se usa la agrupación por fecha + el ‹ mes ›
  document.getElementById('coord-view-toggle').style.display = 'none'; // toggle Lista/Tablero solo en Inicio
  const myTab = 'pruebas';
  try {
    const items = await fetchCoordItemsForMonth();
    if (activeCoordTab !== myTab) return;
    _coordAllServices = items.filter(s => {
      if (esArchivado(s)) return false;
      const tipoReg = s.properties?.['Tipo de registro']?.select?.name || '';
      return tipoReg.includes('Prueba');
    });
    if (!selectedCoordDay) selectedCoordDay = 'all';
    renderWeekStrip(_coordAllServices);
    renderCoordList();
    refreshCoordFilterSheetIfOpen();
  } catch (e) {
    if (activeCoordTab !== myTab) return;
    content.innerHTML = `<div class="coord-empty">${t('coord.error.load')}<br><small>${esc(e.message)}</small></div>`;
  }
}

async function renderCoordRelevamientos() {
  if (esVentas()) return; // blindaje: Ventas no ve Relevamientos, ni por un llamado directo
  const content = document.getElementById('coord-content');
  content.innerHTML = '<div style="text-align:center;padding:40px 0"><div class="spinner" style="margin:0 auto"></div></div>';
  document.getElementById('coord-week-strip').style.display = 'none'; // tira de días quitada (2026-07-06): se usa la agrupación por fecha + el ‹ mes ›
  document.getElementById('coord-view-toggle').style.display = 'none'; // toggle Lista/Tablero solo en Inicio
  const myTab = 'relevamientos';
  try {
    const items = await fetchCoordItemsForMonth();
    if (activeCoordTab !== myTab) return;
    _coordAllServices = items.filter(s => {
      if (esArchivado(s)) return false;
      const tipoReg = s.properties?.['Tipo de registro']?.select?.name || '';
      return tipoReg.includes('Relevamiento');
    });
    if (!selectedCoordDay) selectedCoordDay = 'all';
    renderWeekStrip(_coordAllServices);
    renderCoordList();
    refreshCoordFilterSheetIfOpen();
  } catch (e) {
    if (activeCoordTab !== myTab) return;
    content.innerHTML = `<div class="coord-empty">${t('coord.error.load')}<br><small>${esc(e.message)}</small></div>`;
  }
}

// ── Propuesta ligada a Cliente (Federico): elegir cliente existente o crear uno nuevo con tel/email.
// El tel/email van a la ficha del Cliente (fuente única) y la propuesta queda linkeada → todo el CRM se
// interconecta (los servicios creados desde la propuesta ya heredan el Contacto).
let _propContactos = null;
function propClienteInputsHTML() {
  const s = propEditState;
  const esNuevo = !s.clienteSel || s.clienteSel === '__new__';
  const inp = (ph, key, type) => `<input type="${type}" class="edit-date-input" style="margin-top:6px" placeholder="${ph}" value="${esc(s[key] || '')}" oninput="propEditState.${key}=this.value"/>`;
  return (esNuevo ? inp('Nombre del cliente', 'nombreCliente', 'text') : '') +
    inp('📞 Teléfono / WhatsApp', 'tel', 'tel') +
    inp('✉️ Email', 'email', 'email') +
    `<div style="font-size:11px;color:var(--text3);margin-top:4px">${esNuevo ? 'Se crea el cliente con estos datos.' : 'Tel/email se guardan en la ficha del cliente.'}</div>`;
}
function propClienteSectionHTML() {
  return `<div class="edit-section"><div class="edit-section-label">👤 Cliente</div>
    <select id="prop-cliente-select" class="edit-date-input" onchange="propClienteChanged(this.value)">
      <option value="__new__">➕ Nuevo cliente</option>
      <option value="" disabled>cargando clientes…</option>
    </select>
    <div id="prop-cliente-fields">${propClienteInputsHTML()}</div>
    <button type="button" onclick="verClienteDesdePropuesta()" style="background:none;border:none;color:var(--accent,#00C98D);font-size:12px;text-decoration:underline;cursor:pointer;padding:6px 0">${t('sheet.prop.vercliente')}</button></div>`;
}
// R3: abrir la ficha del cliente vinculado a la propuesta (cerrar prop-sheet → delay → abrir contact-sheet).
function verClienteDesdePropuesta() {
  const id = propEditState?.clienteSel;
  if (!id || id === '__new__') { alert(t('sheet.prop.vercliente.none')); return; }
  closePropSheet();
  setTimeout(() => openContactSheet(id), 250);
}
function propClienteChanged(val) {
  propEditState.clienteSel = val || '__new__';
  if (val && val !== '__new__') {
    const c = (_propContactos || []).find(x => x.id === val);
    if (c) {
      propEditState.nombreCliente = c.properties?.['Nombre / Empresa']?.title?.[0]?.plain_text || '';
      propEditState.tel = c.properties?.['Teléfono / WhatsApp']?.phone_number || '';
      propEditState.email = c.properties?.['Email']?.email || '';
    }
  } else {
    propEditState.nombreCliente = ''; propEditState.tel = ''; propEditState.email = '';
  }
  const w = document.getElementById('prop-cliente-fields');
  if (w) w.innerHTML = propClienteInputsHTML();
}
async function loadPropContactos() {
  try {
    if (!_propContactos) {
      // Preferir la lista fresca en memoria (refreshContactsView la mantiene al día e incluye clientes
      // recién creados desde el CRM). Fallback al query si todavía no se cargó la vista de clientes.
      // Mismo patrón que loadContactIntermediarios — así un cliente nuevo aparece sin recargar la app.
      if (Array.isArray(_coordAllContacts) && _coordAllContacts.length) {
        _propContactos = _coordAllContacts;
      } else {
        const d = await callNotion(`databases/${CONTACTOS_DB_ID}/query`, 'POST', { sorts: [{ property: 'Nombre / Empresa', direction: 'ascending' }] });
        _propContactos = d.results || [];
      }
    }
    const sel = document.getElementById('prop-cliente-select');
    if (!sel) return;
    const cur = propEditState.clienteSel || '__new__';
    const tit = c => c.properties?.['Nombre / Empresa']?.title?.[0]?.plain_text || '(sin nombre)';
    const estadoC = c => c.properties?.['Estado']?.select?.name || '';
    // '❌ Descartado' no se ofrece como cliente cotizable (salvo que ya venga prefillado, ej. un
    // deep-link viejo) — el resto de los estados de prospección (🎯/📵/🤝) sí quedan disponibles,
    // el coord legítimamente cotiza un 🤝 Interesado vía "→ Crear propuesta".
    sel.innerHTML = '<option value="__new__">➕ Nuevo cliente</option>' +
      _propContactos.slice()
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
function openNewPropSheet(prefillContactId = null) {
  propSheetMode = 'create';
  editingProp = null;
  propEditState = { nombre: '', estado: '🆕 Nuevo lead', pais: '🇺🇾 Uruguay', tipo: '', aprobacion: '⏳ Pendiente', importe: '', fechaEnvio: '', ultimaInt: new Date().toISOString().split('T')[0], obs: '', serviciosAnio: '', comision: '', clienteSel: prefillContactId || '__new__', nombreCliente: '', tel: '', email: '' };

  document.getElementById('prop-sheet-title').textContent = t('sheet.prop.title.nueva');
  document.getElementById('prop-sheet-sub').textContent = t('sheet.prop.subtitle.nueva');

  const PIPELINE = ['🆕 Nuevo lead','📞 Contactado','🔍 Relevamiento','⏳ En preparación','✅ Aprobada internamente','📤 Enviada al cliente','🤝 Negociando','✅ Aceptada','❌ Rechazada','😶 Sin respuesta','🔄 Reactivo'];
  const PAISES = ['🇺🇾 Uruguay','🇧🇷 Brasil','🇵🇦 Panamá','🇬🇹 Guatemala','🇲🇽 México'];
  const TIPOS = ['📌 Puntual','🔄 Recurrente'];
  const APROBACIONES = ['⏳ Pendiente','✅ Aprobada','🔁 Revisar'];

  function btnGroup(label, key, options) {
    return `<div class="edit-section"><div class="edit-section-label">${label}</div><div class="estado-btns">${
      options.map(o => `<button class="estado-btn ${propEditState[key] === o ? 'active' : ''}" onclick="propSetField('${key}',this,'${o.replace(/'/g,"\\'")}')">${o}</button>`).join('')
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
        <button type="button" onclick="calcularPrecioPropuesta()" title="${t('calc.title')}" style="flex:none;background:var(--card);border:1px solid var(--border2);border-radius:9px;color:var(--text2);font-size:13px;padding:9px 12px;cursor:pointer;font-family:'Exo 2',sans-serif">🧮</button>
      </div></div>` +
    `<div class="edit-section"><div class="edit-section-label">🔄 Contrato recurrente (si aplica)</div>
      <input type="number" class="edit-date-input" placeholder="Servicios por año (ej. 6)" value="${propEditState.serviciosAnio ?? ''}" oninput="propEditState.serviciosAnio=this.value"/>
      <input type="number" class="edit-date-input" style="margin-top:6px" placeholder="Comisión % del intermediario (ej. 10)" value="${propEditState.comision ?? ''}" oninput="propEditState.comision=this.value"/></div>` +
    `<div class="edit-section"><div class="edit-section-label">${t('sheet.prop.section.fechaenvio')}</div>
      <input type="date" class="edit-date-input" onchange="propEditState.fechaEnvio=this.value"/></div>` +
    `<div class="edit-section"><div class="edit-section-label">${t('sheet.prop.section.ultimaint')}</div>
      <input type="date" class="edit-date-input" value="${propEditState.ultimaInt}" onchange="propEditState.ultimaInt=this.value"/></div>` +
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

function openPropSheet(pageId) {
  propSheetMode = 'edit';
  editingProp = _coordAllProps.find(p => p.id === pageId);
  if (!editingProp) return;
  const props = editingProp.properties || {};
  const nombre = props['Nombre de propuesta']?.title?.[0]?.plain_text || t('common.sinnombre');
  const estado = props['Estado pipeline']?.select?.name || '';
  const pais = props['País']?.select?.name || '';
  const tipo = props['Tipo']?.select?.name || '';
  const aprobacion = props['Aprobación interna']?.select?.name || '';
  const importe = props['Importe estimado']?.number ?? '';
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

  propEditState = { estado, pais, tipo, aprobacion, importe, fechaEnvio, ultimaInt, obs, serviciosAnio, comision, clienteSel, nombreCliente: '', tel: '', email: '', mapa: mapaProp, posponerHasta, _posponerHastaOrig: posponerHasta };
  // F1 (escribir SOLO lo cambiado): snapshot de originales → al guardar no se re-escribe un campo que el usuario no
  // tocó (evita el echo-back que pisaría datos cuando propuestas pase a Supabase-first). Números como String() para
  // comparar sin falsos "cambió" por number-vs-string del input.
  Object.assign(propEditState, {
    _estadoOrig: estado, _paisOrig: pais, _tipoOrig: tipo, _aprobacionOrig: aprobacion,
    _importeOrig: String(importe ?? ''), _serviciosAnioOrig: String(serviciosAnio ?? ''), _comisionOrig: String(comision ?? ''),
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
      options.map(o => `<button class="estado-btn ${propEditState[key] === o ? 'active' : ''}" onclick="propSetField('${key}',this,'${o.replace(/'/g,"\\'")}')">${o}</button>`).join('')
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
    const tieneImporte = (editingProp?.properties?.['Importe estimado']?.number) != null;
    pdfBtn.style.display = (editingProp && editingProp.id && tieneImporte) ? 'block' : 'none';
    pdfBtn.disabled = false;
  }
  document.getElementById('prop-overlay').classList.add('open');
  if (!propSoloLectura) loadPropContactos();
}

async function deletePropuesta() {
  if (esVentas()) return; // Ventas: solo lectura + seguimiento — nunca elimina
  if (!editingProp) return;
  const props = editingProp.properties || {};
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
    await callNotion('pages/' + editingProp.id, 'PATCH', { in_trash: true });
    closePropSheet();
    await renderCoordPropuestas();
  } catch (e) {
    if (btn) { btn.textContent = '🗑️ ' + t('sheet.prop.delete'); btn.disabled = false; }
    alert(t('sheet.prop.delete.error') + ' ' + e.message);
  }
}

// ── Alta de TRABAJO suelto (servicio/relevamiento/prueba) SIN propuesta ──
let newSvcState = null;

function newSvcClienteInputsHTML() {
  const s = newSvcState;
  const esNuevo = !s.clienteSel || s.clienteSel === '__new__';
  const inp = (ph, key, type) => `<input type="${type}" class="edit-date-input" style="margin-top:6px" placeholder="${ph}" value="${esc(s[key] || '')}" oninput="newSvcState.${key}=this.value"/>`;
  return (esNuevo ? inp('Nombre del cliente', 'nombreCliente', 'text') : '') +
    inp('📞 Teléfono / WhatsApp', 'tel', 'tel') +
    inp('✉️ Email', 'email', 'email');
}

function newSvcClienteSectionHTML() {
  return `<div class="edit-section"><div class="edit-section-label">👤 Cliente</div>
    <select id="newsvc-cliente-select" class="edit-date-input" onchange="newSvcClienteChanged(this.value)">
      <option value="__new__">➕ Nuevo cliente</option>
      <option value="" disabled>cargando clientes…</option>
    </select>
    <div id="newsvc-cliente-fields">${newSvcClienteInputsHTML()}</div></div>`;
}

function newSvcClienteChanged(val) {
  newSvcState.clienteSel = val || '__new__';
  if (val && val !== '__new__') {
    const c = (_propContactos || _coordAllContacts || []).find(x => x.id === val);
    if (c) {
      newSvcState.nombreCliente = c.properties?.['Nombre / Empresa']?.title?.[0]?.plain_text || '';
      newSvcState.tel = c.properties?.['Teléfono / WhatsApp']?.phone_number || '';
      newSvcState.email = c.properties?.['Email']?.email || '';
      newSvcState.pais = c.properties?.['País']?.select?.name || newSvcState.pais;
    }
  } else {
    newSvcState.nombreCliente = ''; newSvcState.tel = ''; newSvcState.email = '';
  }
  const w = document.getElementById('newsvc-cliente-fields');
  if (w) w.innerHTML = newSvcClienteInputsHTML();
}

async function loadNewSvcContactos() {
  try {
    if (!_propContactos) {
      if (Array.isArray(_coordAllContacts) && _coordAllContacts.length) _propContactos = _coordAllContacts;
      else { const d = await callNotion(`databases/${CONTACTOS_DB_ID}/query`, 'POST', { sorts: [{ property: 'Nombre / Empresa', direction: 'ascending' }] }); _propContactos = d.results || []; }
    }
    const sel = document.getElementById('newsvc-cliente-select');
    if (!sel) return;
    const cur = newSvcState.clienteSel || '__new__';
    const tit = c => c.properties?.['Nombre / Empresa']?.title?.[0]?.plain_text || '(sin nombre)';
    const estadoC = c => c.properties?.['Estado']?.select?.name || '';
    // '❌ Descartado' no se ofrece como cliente para un trabajo suelto (salvo prefill ya elegido).
    sel.innerHTML = '<option value="__new__">➕ Nuevo cliente</option>' +
      _propContactos.slice()
        .filter(c => estadoC(c) !== '❌ Descartado' || c.id === cur)
        .sort((a, b) => tit(a).localeCompare(tit(b)))
        .map(c => `<option value="${esc(c.id)}">${esc(tit(c))}</option>`).join('');
    sel.value = cur;
    if (cur !== '__new__') newSvcClienteChanged(cur);
  } catch (e) { /* el form sirve igual (queda "Nuevo cliente") */ }
}

// Resuelve el cliente elegido, o dedup/crea uno nuevo. Devuelve su id (o null si no hay datos).
async function resolveOrCreateClienteId(s) {
  // Normalizamos tel/email antes de dedupear y crear: ' 099…' no debe fallar el match contra '099…'
  // y generar un duplicado. Email a minúsculas para consistencia del equals.
  const tel = (s.tel || '').trim();
  const email = (s.email || '').trim().toLowerCase();
  if (s.clienteSel && s.clienteSel !== '__new__') {
    const upd = {};
    if (tel) upd['Teléfono / WhatsApp'] = { phone_number: tel };
    if (email) upd['Email'] = { email };
    if (Object.keys(upd).length) { try { await updateServiceProps(s.clienteSel, upd); } catch (_) {} }
    return s.clienteSel;
  }
  const nombreCli = (s.nombreCliente || '').trim();
  if (!nombreCli && !tel && !email) return null;
  // Dedup por tel/email
  const orf = [];
  if (tel) orf.push({ property: 'Teléfono / WhatsApp', phone_number: { equals: tel } });
  if (email) orf.push({ property: 'Email', email: { equals: email } });
  if (orf.length) {
    const dup = await callNotion(`databases/${CONTACTOS_DB_ID}/query`, 'POST', { filter: orf.length === 1 ? orf[0] : { or: orf }, page_size: 1 }).catch(() => ({ results: [] }));
    if (dup.results && dup.results.length) return dup.results[0].id;
  }
  const cprops = {
    'Nombre / Empresa': { title: [{ text: { content: nombreCli || 'Cliente s/n' } }] },
    'Estado': { select: { name: '🆕 Lead' } },
  };
  if (s.pais) cprops['País'] = { select: { name: s.pais } };
  if (tel) cprops['Teléfono / WhatsApp'] = { phone_number: tel };
  if (email) cprops['Email'] = { email };
  const nc = await callNotion('pages', 'POST', { parent: { database_id: CONTACTOS_DB_ID }, properties: cprops });
  // Espejo al toque: con lecturas de clientes desde Supabase, sin esto el cliente nuevo
  // tardaría hasta 10 min (cron) en aparecer en los selectores que leen del espejo.
  if (nc?.id && typeof syncAfterWrite === 'function') { try { syncAfterWrite(nc.id, 'clientes'); } catch (_) {} }
  _propContactos = null;
  return nc && nc.id;
}

function newServiceOverlayClick(e) { if (e.target.id === 'new-service-overlay') closeNewServiceSheet(); }
function closeNewServiceSheet() { document.getElementById('new-service-overlay').classList.remove('open'); }

function openNewServiceSheet(prefillContactId = null) {
  if (esVentas()) return; // Ventas nunca crea servicios/relevamientos/pruebas (encierro rol B2)
  const today = new Date();
  const hoyISO = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const paisCoord = COUNTRY_NOTION_MAP[selectedCountry] || '';
  newSvcState = { tipoRegistro: '📋 Orden de trabajo', clienteSel: prefillContactId || '__new__', nombreCliente: '', tel: '', email: '', nombre: '', tipoServicios: [], fecha: hoyISO, pais: paisCoord };

  const TIPOS_REG = [
    { label: '🏢 Servicio', val: '📋 Orden de trabajo' },
    { label: '🔍 Relevamiento', val: '🔍 Relevamiento' },
    { label: '🧪 Prueba', val: '🧪 Prueba' },
  ];
  const TIPOS_SVC = ['🏢 Fachada', '🪟 Vidrios', '☀️ Paneles solares'];
  const tipoRegBtns = TIPOS_REG.map(o => `<button class="estado-btn ${newSvcState.tipoRegistro === o.val ? 'active' : ''}" onclick="newSvcSetTipoReg(this,'${o.val.replace(/'/g,"\\'")}')">${o.label}</button>`).join('');
  const tipoSvcBtns = TIPOS_SVC.map(o => `<button class="estado-btn ${newSvcState.tipoServicios.includes(o) ? 'active' : ''}" onclick="newSvcSetTipoSvc(this,'${o.replace(/'/g,"\\'")}')">${o}</button>`).join('');

  document.getElementById('new-service-sheet-body').innerHTML =
    `<div class="edit-section"><div class="edit-section-label">${t('sheet.newsvc.section.tipo')}</div><div class="estado-btns" id="newsvc-tiporeg-btns">${tipoRegBtns}</div></div>` +
    newSvcClienteSectionHTML() +
    `<div class="edit-section"><div class="edit-section-label">${t('sheet.newsvc.section.nombre')}</div>
      <input type="text" class="edit-date-input" placeholder="${t('sheet.newsvc.nombre.placeholder')}" oninput="newSvcState.nombre=this.value" style="font-size:14px"/></div>` +
    `<div class="edit-section"><div class="edit-section-label">${t('sheet.newsvc.section.tiposervicio')}</div><div class="estado-btns" id="newsvc-tiposvc-btns">${tipoSvcBtns}</div></div>` +
    `<div class="edit-section"><div class="edit-section-label">${t('sheet.newsvc.section.fecha')}</div>
      <input type="date" class="edit-date-input" value="${newSvcState.fecha}" onchange="newSvcState.fecha=this.value"/></div>`;

  const btn = document.getElementById('new-service-save-btn');
  btn.textContent = t('btn.create.notion'); btn.disabled = false;
  document.getElementById('new-service-overlay').classList.add('open');
  loadNewSvcContactos();
}

function openNewServiceSheetForContact(contactId) {
  if (esVentas()) return; // Ventas no crea trabajos desde la ficha del prospecto (encierro rol B2)
  closeContactSheet();
  setTimeout(() => openNewServiceSheet(contactId || null), 250);
}

function newSvcSetTipoReg(el, val) {
  newSvcState.tipoRegistro = val;
  document.querySelectorAll('#newsvc-tiporeg-btns .estado-btn').forEach(b => b.classList.remove('active'));
  if (el) el.classList.add('active');
}
// Multi-toggle (igual que en el sheet edit): un trabajo puede ser Fachada + Vidrios (+ Paneles).
function newSvcSetTipoSvc(el, val) {
  if (!Array.isArray(newSvcState.tipoServicios)) newSvcState.tipoServicios = [];
  const i = newSvcState.tipoServicios.indexOf(val);
  if (i === -1) newSvcState.tipoServicios.push(val); else newSvcState.tipoServicios.splice(i, 1);
  if (el) el.classList.toggle('active');
}

async function submitNewService() {
  if (esVentas()) return; // backstop: Ventas no crea trabajos (encierro rol B2)
  const btn = document.getElementById('new-service-save-btn');
  const s = newSvcState;
  if (!(s.nombre || '').trim()) { alert(t('sheet.newsvc.error.nombre')); return; }
  const clienteNuevoSinDatos = (s.clienteSel === '__new__') && !(s.nombreCliente || '').trim() && !s.tel && !s.email;
  if (clienteNuevoSinDatos) { alert(t('sheet.newsvc.error.cliente')); return; }
  btn.textContent = t('btn.saving.notion'); btn.disabled = true;
  try {
    const clienteId = await resolveOrCreateClienteId(s);
    const properties = {
      'Nombre del servicio': { title: [{ text: { content: s.nombre.trim() } }] },
      'Estado': { select: { name: '📋 Pendiente' } },
      'Tipo de registro': { select: { name: s.tipoRegistro } },
      'Fecha programada': { date: { start: s.fecha } },
    };
    if ((s.tipoServicios || []).length) properties['Tipo de servicio'] = { multi_select: s.tipoServicios.map(name => ({ name })) };
    if (s.pais) properties['País'] = { select: { name: s.pais } };
    if (clienteId) properties['Contacto'] = { relation: [{ id: clienteId }] };
    const created = await callNotion('pages', 'POST', { parent: { type: 'data_source_id', data_source_id: SERVICIOS_DS_ID }, properties });
    closeNewServiceSheet();
    const tab = s.tipoRegistro.includes('Relevamiento') ? 'relevamientos' : (s.tipoRegistro.includes('Prueba') ? 'pruebas' : 'servicios');
    // setCoordTab con skipRender=true: fija la tab SIN disparar su render, así hacemos UN solo
    // render (no dos fetches concurrentes que se pisan y dropean el ítem optimista). Awaiteamos el
    // render de LA tab correcta (renderCoordServicios filtra afuera Relevamiento/Prueba).
    if (typeof setCoordTab === 'function') setCoordTab(tab, true);
    const renderFn = tab === 'relevamientos' ? renderCoordRelevamientos
                   : tab === 'pruebas' ? renderCoordPruebas
                   : renderCoordServicios;
    await renderFn();
    if (Array.isArray(_coordAllServices) && !_coordAllServices.some(x => x.id === created.id)) {
      _coordAllServices.unshift(created);
      if (typeof renderCoordList === 'function') renderCoordList();
    }
    // Poblar editingService con el objeto recién creado: openEditSheet lo respeta por id y así NO
    // depende de que el ítem siga en _coordAllServices (una revalidación del SW podría rebarrer la
    // lista antes del setTimeout). _editFromPorCobrar=false = flujo coord normal (no Por cobrar).
    editingService = created;
    _editFromPorCobrar = false;
    setTimeout(() => { if (typeof openEditSheet === 'function') openEditSheet(created.id); }, 400);
  } catch (e) {
    btn.textContent = t('btn.create.notion'); btn.disabled = false;
    alert(t('sheet.prop.create.error') + ' ' + (e.message || ''));
  }
}

// Pre-flip PROPUESTAS Supabase-first (2026-07-15): al crear un servicio/prueba/relevamiento desde una
// propuesta, Notion autogenera la relación inversa 'Servicios' — pero bajo el flip esa inversa NO vuelve
// al espejo (cron-db-sync excluye las tablas flipeadas). ⚠️ NO se debe PATCHear 'Servicios' con la lista
// del espejo: es un REEMPLAZO total y el espejo puede tener menos que Notion (jornadas, vínculos de Por
// cobrar) → borraría relaciones en Notion (lost-update, hallazgo del review 15/07). En cambio:
// (1) update EN MEMORIA (apaga el badge y actualiza el contador en la sesión), y (2) el badge/contador
// además derivan del lado SERVICIOS del espejo (que sí está fresco) — ver propTieneServicio().
async function linkServicioEnPropuesta(prop, svcId) {
  try {
    const rel = (prop.properties?.['Servicios']?.relation || []).map(r => ({ id: r.id }));
    if (!rel.some(r => r.id === svcId)) rel.push({ id: svcId });
    prop.properties['Servicios'] = { relation: rel }; // solo memoria — NUNCA escribir esta relación
  } catch (_) { /* best-effort */ }
}
// ¿La propuesta tiene al menos un servicio creado? Mira la relación (congelada al flip pero con lo
// histórico) + los servicios en memoria (frescos del espejo: su property 'Propuesta' la escribe la app).
function propTieneServicio(propId, props) {
  if ((props?.['Servicios']?.relation || []).length > 0) return true;
  const nid = String(propId || '').replace(/-/g, ''); // normalizar (patrón norm() del resto del archivo)
  return Array.isArray(_coordAllServices) && _coordAllServices.some(s =>
    (s.properties?.['Propuesta']?.relation || []).some(r => String(r.id || '').replace(/-/g, '') === nid));
}

async function createServicioFromPropuesta(propPageId) {
  const prop = (editingProp && editingProp.id === propPageId) ? editingProp : _coordAllProps?.find(p => p.id === propPageId);
  if (!prop) { alert('Propuesta no encontrada en memoria. Recargá la lista.'); return; }
  const pp = prop.properties || {};
  const nombrePropuesta = pp['Nombre de propuesta']?.title?.[0]?.plain_text || t('common.sinnombre');
  const pais = pp['País']?.select?.name || '';
  const tipo = pp['Tipo']?.select?.name || '';
  const contactRel = pp['Contacto']?.relation?.[0]?.id;

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
      parent: { type: 'data_source_id', data_source_id: SERVICIOS_DS_ID },
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
    // encuentra en _coordAllServices para abrir su sheet.
    if (Array.isArray(_coordAllServices) && !_coordAllServices.some(s => s.id === created.id)) {
      _coordAllServices.unshift(created);
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

async function createPruebaFromPropuesta(propPageId) {
  const prop = (editingProp && editingProp.id === propPageId) ? editingProp : _coordAllProps?.find(p => p.id === propPageId);
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
      parent: { type: 'data_source_id', data_source_id: SERVICIOS_DS_ID },
      properties
    });
    await linkServicioEnPropuesta(prop, created.id); // espejo-safe bajo el flip (ver helper)

    closePropSheet();
    // Un solo render de la tab correcta + update optimista + editingService poblado (mismo patrón que
    // submitNewService). Antes: doble render + el sheet no abría porque el registro no estaba en memoria
    // (auditoría 2026-07-09).
    if (typeof setCoordTab === 'function') setCoordTab('pruebas', true);
    await renderCoordPruebas();
    if (Array.isArray(_coordAllServices) && !_coordAllServices.some(x => x.id === created.id)) {
      _coordAllServices.unshift(created);
      if (typeof renderCoordList === 'function') renderCoordList();
    }
    editingService = created; _editFromPorCobrar = false;
    if (typeof openEditSheet === 'function') openEditSheet(created.id);
  } catch (e) {
    if (btn) { btn.textContent = '🧪 ' + t('sheet.prop.pedir.prueba'); btn.disabled = false; }
    alert(t('sheet.prop.create.error') + ' ' + e.message);
  }
}

async function createRelevamientoFromPropuesta(propPageId) {
  const prop = (editingProp && editingProp.id === propPageId) ? editingProp : _coordAllProps?.find(p => p.id === propPageId);
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
      parent: { type: 'data_source_id', data_source_id: SERVICIOS_DS_ID },
      properties
    });
    await linkServicioEnPropuesta(prop, created.id); // espejo-safe bajo el flip (ver helper)

    closePropSheet();
    // BUG arreglado (auditoría 2026-07-09): iba a la tab 'servicios' (que FILTRA afuera los
    // relevamientos) y no poblaba el registro → el relevamiento no aparecía y el sheet no abría.
    // Ahora: tab 'relevamientos' + un solo render + optimista + editingService (patrón submitNewService).
    if (typeof setCoordTab === 'function') setCoordTab('relevamientos', true);
    await renderCoordRelevamientos();
    if (Array.isArray(_coordAllServices) && !_coordAllServices.some(x => x.id === created.id)) {
      _coordAllServices.unshift(created);
      if (typeof renderCoordList === 'function') renderCoordList();
    }
    editingService = created; _editFromPorCobrar = false;
    if (typeof openEditSheet === 'function') openEditSheet(created.id);
  } catch (e) {
    if (btn) { btn.textContent = '🔍 ' + t('sheet.prop.pedir.relev'); btn.disabled = false; }
    alert(t('sheet.prop.create.error') + ' ' + e.message);
  }
}

function propSetField(key, el, val) {
  // País y Estado son obligatorios (no se deseleccionan); el resto: tocar el activo lo vacía (toggle).
  const obligatorio = (key === 'pais' || key === 'estado');
  if (!obligatorio && el.classList.contains('active')) {
    propEditState[key] = '';
    el.classList.remove('active');
  } else {
    propEditState[key] = val;
    el.closest('.estado-btns').querySelectorAll('.estado-btn').forEach(b => b.classList.remove('active'));
    el.classList.add('active');
  }
  if (key === 'estado') updateCreateSvcBtnVisibility();
}

function updateCreateSvcBtnVisibility() {
  if (!editingProp) return;
  const estado = propEditState.estado || '';
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
    const servCount = (editingProp.properties?.['Servicios']?.relation || []).length;
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

function propOverlayClick(e) { if (e.target.id === 'prop-overlay') closePropSheet(); }
function closePropSheet() { document.getElementById('prop-overlay').classList.remove('open'); editingProp = null; if (typeof _contactHistoryCache !== 'undefined') Object.keys(_contactHistoryCache).forEach(k => delete _contactHistoryCache[k]); }

// Al aceptar una propuesta, si el cliente vinculado sigue en un estado de PROSPECCIÓN, se lo promueve
// solo a "✅ Cliente activo" (cierra el ciclo prospecto→cliente). Falla en silencio: la propuesta ya
// se guardó, y una promoción fallida no debe romper ese guardado. No toca clientes que ya están en la
// cartera (Lead/Activo/Inactivo) — solo los que todavía viven en la pestaña Prospección.
async function promoteClienteIfAceptada(clienteId, estadoPipeline) {
  if (!clienteId || !estadoPipeline || !estadoPipeline.includes('Aceptada')) return;
  try {
    const cli = await callNotion('pages/' + clienteId, 'GET');
    const cliEstado = cli?.properties?.['Estado']?.select?.name || '';
    if (!PROSPECCION_ESTADOS.includes(cliEstado)) return;
    await updateServiceProps(clienteId, { 'Estado': { select: { name: '✅ Cliente activo' } } });
    if (typeof syncAfterWrite === 'function') { try { syncAfterWrite(clienteId, 'clientes'); } catch (_) {} }
  } catch (_) { /* no romper el guardado de la propuesta */ }
}

async function savePropEdit() {
  if (esVentas()) return; // Ventas: solo lectura + seguimiento — nunca guarda ediciones
  const btn = document.getElementById('prop-save-btn');
  btn.textContent = t('btn.saving'); btn.disabled = true;
  try {
    if (propSheetMode === 'create' && !propEditState.nombre.trim()) {
      btn.textContent = t('btn.create.notion'); btn.disabled = false;
      alert(t('sheet.prop.error.nombre')); return;
    }
    // Resolver/crear el cliente → dejar su id en clienteId. La propuesta se linkea (Contacto) y, vía la
    // propagación que ya existe, los servicios creados desde la propuesta heredan el cliente → CRM interconectado.
    let clienteId = (propEditState.clienteSel && propEditState.clienteSel !== '__new__') ? propEditState.clienteSel : null;
    if (clienteId) {
      const upd = {};
      if (propEditState.tel) upd['Teléfono / WhatsApp'] = { phone_number: propEditState.tel };
      if (propEditState.email) upd['Email'] = { email: propEditState.email };
      if (Object.keys(upd).length) { try { await updateServiceProps(clienteId, upd); } catch (_) {} }
    } else if ((propEditState.nombreCliente || '').trim() || propEditState.tel || propEditState.email) {
      // Dedup: buscar un cliente con ese teléfono o email antes de crear uno nuevo (evita duplicados).
      let existing = null;
      const orf = [];
      if (propEditState.tel) orf.push({ property: 'Teléfono / WhatsApp', phone_number: { equals: propEditState.tel } });
      if (propEditState.email) orf.push({ property: 'Email', email: { equals: propEditState.email } });
      if (orf.length) {
        const dup = await callNotion(`databases/${CONTACTOS_DB_ID}/query`, 'POST', { filter: orf.length === 1 ? orf[0] : { or: orf }, page_size: 1 }).catch(() => ({ results: [] }));
        if (dup.results && dup.results.length) existing = dup.results[0];
      }
      if (existing) {
        // Ya existe → linkear ese cliente y completar tel/email si le faltaban.
        clienteId = existing.id;
        const upd = {};
        if (propEditState.tel && !existing.properties?.['Teléfono / WhatsApp']?.phone_number) upd['Teléfono / WhatsApp'] = { phone_number: propEditState.tel };
        if (propEditState.email && !existing.properties?.['Email']?.email) upd['Email'] = { email: propEditState.email };
        if (Object.keys(upd).length) { try { await updateServiceProps(existing.id, upd); } catch (_) {} }
      } else {
        const cprops = {
          'Nombre / Empresa': { title: [{ text: { content: (propEditState.nombreCliente || propEditState.nombre || 'Cliente s/n').trim() } }] },
          'Estado': { select: { name: '🆕 Lead' } },
        };
        if (propEditState.pais) cprops['País'] = { select: { name: propEditState.pais } };
        if (propEditState.tel) cprops['Teléfono / WhatsApp'] = { phone_number: propEditState.tel };
        if (propEditState.email) cprops['Email'] = { email: propEditState.email };
        const nc = await callNotion('pages', 'POST', { parent: { database_id: CONTACTOS_DB_ID }, properties: cprops });
        clienteId = nc && nc.id;
        // Espejo al toque (ver resolveOrCreateClienteId): que el cliente nuevo no tarde 10 min en las listas.
        if (clienteId && typeof syncAfterWrite === 'function') { try { syncAfterWrite(clienteId, 'clientes'); } catch (_) {} }
      }
      _propContactos = null;
    }
    // Relación Servicios FRESCA del PATCH (Notion autoritativo) para la guardia anti-duplicado de la
    // oferta #4: leerla del espejo Supabase (_coordAllProps) puede venir stale y ofrecer crear un 2º servicio.
    let _freshServiciosLen = null;
    if (propSheetMode === 'create') {
      const props = { 'Nombre de propuesta': { title: [{ text: { content: propEditState.nombre.trim() } }] } };
      if (propEditState.estado) props['Estado pipeline'] = { select: { name: propEditState.estado } };
      if (propEditState.pais) props['País'] = { select: { name: propEditState.pais } };
      props['Tipo'] = { select: propEditState.tipo ? { name: propEditState.tipo } : null };
      props['Aprobación interna'] = { select: propEditState.aprobacion ? { name: propEditState.aprobacion } : null };
      props['Importe estimado'] = { number: parseFloat(propEditState.importe) || null };
      props['Servicios por año'] = { number: parseFloat(propEditState.serviciosAnio) || null };
      props['Comisión %'] = { number: parseFloat(propEditState.comision) || null };
      if (propEditState.fechaEnvio) props['Fecha de envío'] = { date: { start: propEditState.fechaEnvio } };
      else if (propEditState.estado === '📤 Enviada al cliente') {
        // Reloj de vida (spec dos-relojes 2026-07-02): al nacer ya en "Enviada" sin fecha propia,
        // se estampa hoy — mismo patrón hoyISO que openNewServiceSheet (fecha LOCAL, no UTC).
        const _hoy = new Date();
        const hoyISO = `${_hoy.getFullYear()}-${String(_hoy.getMonth() + 1).padStart(2, '0')}-${String(_hoy.getDate()).padStart(2, '0')}`;
        props['Fecha de envío'] = { date: { start: hoyISO } };
      }
      if (propEditState.ultimaInt) props['Última interacción'] = { date: { start: propEditState.ultimaInt } };
      if (propEditState.obs) props['Observaciones'] = { rich_text: [{ text: { content: propEditState.obs } }] };
      if (clienteId) props['Contacto'] = { relation: [{ id: clienteId }] };
      const _nuevaProp = await callNotion('pages', 'POST', { parent: { database_id: PROPUESTAS_DB_ID }, properties: props });
      // Espejar la propuesta nueva al mirror Supabase (las secciones de Clientes lo leen) para que el
      // cliente salga de "Mantenimiento (9 meses)" sin esperar el sync batch (~10 min). Comercial 2026-07-09.
      if (_nuevaProp?.id && typeof syncAfterWrite === 'function') { try { syncAfterWrite(_nuevaProp.id, 'propuestas'); } catch (_) {} }
      await promoteClienteIfAceptada(clienteId, propEditState.estado);
    } else {
      const props = {};
      // F1: en EDICIÓN cada campo se escribe SOLO si cambió vs su snapshot (_XOrig). Este bloque es solo edit.
      const p = propEditState;
      const chg = (cur, orig) => cur !== orig;
      if (p.estado && chg(p.estado, p._estadoOrig)) props['Estado pipeline'] = { select: { name: p.estado } };
      if (p.pais && chg(p.pais, p._paisOrig)) props['País'] = { select: { name: p.pais } };
      if (chg(p.tipo, p._tipoOrig)) props['Tipo'] = { select: p.tipo ? { name: p.tipo } : null };
      if (chg(p.aprobacion, p._aprobacionOrig)) props['Aprobación interna'] = { select: p.aprobacion ? { name: p.aprobacion } : null };
      if (chg(String(p.importe ?? ''), p._importeOrig)) props['Importe estimado'] = { number: parseFloat(p.importe) || null };
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
      const _contactoPrev = editingProp?.properties?.['Contacto']?.relation?.[0]?.id || editingProp?.properties?.['Contactos']?.relation?.[0]?.id || null;
      if (clienteId && clienteId !== _contactoPrev) props['Contacto'] = { relation: [{ id: clienteId }] };
      const _updatedProp = await updateServiceProps(editingProp.id, props);
      _freshServiciosLen = (_updatedProp?.properties?.['Servicios']?.relation || editingProp?.properties?.['Servicios']?.relation || []).length;
      // En edición el cliente puede venir del selector (clienteId) o del vínculo previo de la propuesta.
      const clienteVinculado = clienteId || editingProp?.properties?.['Contacto']?.relation?.[0]?.id || editingProp?.properties?.['Contactos']?.relation?.[0]?.id || null;
      await promoteClienteIfAceptada(clienteVinculado, propEditState.estado);
    }
    // #4 (auditoría 2026-07-09): al ACEPTAR una propuesta que todavía no tiene servicio, ofrecer crearlo en
    // el acto (antes había que abrir la propuesta y buscar el botón). Solo en la TRANSICIÓN a Aceptada (no
    // re-ofrece si se re-guarda una ya aceptada; el badge de la card cubre ese recordatorio persistente).
    const _svcLen = (_freshServiciosLen != null) ? _freshServiciosLen : (editingProp?.properties?.['Servicios']?.relation || []).length;
    const _ofrecerSvcId = (propSheetMode !== 'create'
      && /Aceptada/.test(propEditState.estado || '')
      && !/Aceptada/.test(editingProp?.properties?.['Estado pipeline']?.select?.name || '')
      && _svcLen === 0)
      ? editingProp.id : null;
    closePropSheet();
    // Invalidar la clasificación de secciones de Clientes: crear/editar una propuesta cambia si el cliente
    // tiene "propuesta abierta" → al volver a la tab Clientes se recomputa y sale de "9 meses" (Comercial 2026-07-09).
    _coordCliSecciones = null;
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

// ─────────────────────────────────────────────
// CONTACTOS
// ─────────────────────────────────────────────
// Contenedor activo de la vista Clientes (antes "Contactos"). El coordinador usa 'coord-content';
// Finanzas/CEO la reusan vía renderClientesView con su propio contenedor. filterContacts/cargarMasContactos
// leen esta variable → la misma lista funciona en cualquier pantalla.
let _contactsContainerId = 'coord-content';

// ── Secciones especiales de la vista Clientes (spec 2026-07-02) ────────────────────────────
// 9 meses sin trabajo. Constante fija en v1 (sin configuración por cliente todavía).
// El umbral de mantenimiento vive en cfgRegla('mantenimientoDias') (270 = ~9 meses por defecto, editable en ⚙️).
// Estados terminales del pipeline de Propuestas — cualquier otro estado se considera "abierto"
// (en curso), mismo criterio que usa el cron diario (api/cron-pipeline.js) y loadAlerts().
const PROP_ESTADOS_TERMINALES = ['✅ Aceptada', '❌ Rechazada', '😶 Sin respuesta'];

// Clasificación cacheada de _coordAllContacts en las 3 secciones especiales + cartera activa.
// null = no se pudo calcular (faltan propuestas/servicios) → renderContactList cae a la lista
// plana de siempre (grouping es un plus, nunca un bloqueo). La recalcula loadClienteSecciones()
// cada vez que se (re)carga la tab Clientes; renderContactList (search/paginado) la reusa tal cual.
let _coordCliSecciones = null;

// Trae TODAS las propuestas + servicios (fuente para clasificar clientes en secciones). callDb
// primero (mirror Supabase, más liviano); si falla, cae al fallback de Notion (callNotionAll,
// mismo patrón que ya usa 'Limpieza' para traer TODO y cruzar cliente-side). Devuelve null en el
// campo que no se pudo traer — nunca tira: el caller decide qué hacer con lo que falte.
async function fetchPropsYSvcsParaSecciones() {
  const safe = async (dbName, endpoint) => {
    try { return (await callDb(dbName)).results || []; }
    catch (e) { try { return (await callNotionAll(`databases/${endpoint}/query`, {})).results || []; } catch (e2) { return null; } }
  };
  const [propuestas, servicios] = await Promise.all([
    safe('propuestas', PROPUESTAS_DB_ID),
    safe('servicios', DB_ID),
  ]);
  return { propuestas, servicios };
}

// Cruza clientes × propuestas × servicios (relation 'Contacto' en ambas, ids normalizados sin
// guiones) y arma las 3 secciones especiales + la cartera activa (residual). Un cliente cae en
// UNA sola sección. Devuelve null si falta alguna fuente (propuestas/servicios == null).
function computeClienteSecciones(contacts, propuestas, servicios) {
  if (!Array.isArray(propuestas) || !Array.isArray(servicios) || !Array.isArray(contacts)) return null;
  const norm = id => (id || '').replace(/-/g, '');
  const contactoIdsDe = rec => [
    ...(rec.properties?.['Contacto']?.relation || []),
    ...(rec.properties?.['Contactos']?.relation || []),   // fallback legacy (igual que otros matchers del archivo)
  ].map(r => norm(r.id));
  const svcFecha = s => s.properties?.['Fecha programada']?.date?.start || s.created_time || '';
  const propEstado = p => p.properties?.['Estado pipeline']?.select?.name || '';
  const svcsVivos = servicios.filter(s => !esArchivado(s));
  const propsVivas = propuestas.filter(p => !esArchivado(p));
  const hoy = Date.now();

  const mantenimiento = [], sinRespuesta = [], rechazados = [], activa = [];
  contacts.forEach(c => {
    delete c._mantMeses; // se re-deriva abajo; limpiar evita el "hace N meses" viejo si el cliente ya no es de mantenimiento
    // Los clientes en estado de prospección (🎯/📵/🤝/❌) viven en su propia tab 🎯 Prospección,
    // nunca en "Cartera activa" ni en ninguna otra sección de la tab 👥 Clientes.
    const _est = c.properties?.['Estado']?.select?.name || '';
    if (PROSPECCION_ESTADOS.includes(_est)) return;
    const cid = norm(c.id);
    const svcsCliente = svcsVivos.filter(s => contactoIdsDe(s).includes(cid));
    const propsCliente = propsVivas.filter(p => contactoIdsDe(p).includes(cid));
    const completados = svcsCliente.filter(s => (s.properties?.['Estado']?.select?.name || '').includes('Completado'));

    if (completados.length) {
      // Candidato a Mantenimiento: el ÚLTIMO completado hace 9+ meses, sin nada más nuevo
      // agendado (completado o no) ni propuesta abierta.
      const ultimaFecha = completados.reduce((max, s) => { const f = svcFecha(s); return f > max ? f : max; }, '');
      const diasDesde = ultimaFecha ? Math.floor((hoy - new Date(ultimaFecha).getTime()) / 86400000) : null;
      const hayMasNuevo = svcsCliente.some(s => svcFecha(s) > ultimaFecha);
      const propAbierta = propsCliente.some(p => !PROP_ESTADOS_TERMINALES.includes(propEstado(p)));
      // Recontactado hace poco (Ventas marcó "📞 Contactado" → 'Próximo contacto' futuro): sale de
      // "para recontactar" ese período para no pisarse el equipo; vuelve solo cuando la fecha vence.
      const proxC = (c.properties?.['Próximo contacto']?.date?.start || '').split('T')[0];
      const recontactadoReciente = proxC && proxC > new Date().toISOString().split('T')[0];
      if (diasDesde != null && diasDesde >= cfgRegla('mantenimientoDias') && !hayMasNuevo && !propAbierta && !recontactadoReciente) { c._mantMeses = Math.round(diasDesde / 30.4); mantenimiento.push(c); return; }
      activa.push(c);
      return;
    }

    // SOLO clientes SIN ningún servicio (ni en curso ni asignado — un servicio vivo = cliente activo
    // SIEMPRE, aunque sus propuestas hayan muerto): ¿su única historia son propuestas negativas?
    if (!svcsCliente.length && propsCliente.length) {
      const estados = propsCliente.map(propEstado);
      const soloNegativas = estados.every(e => e === '😶 Sin respuesta' || e === '❌ Rechazada');
      if (soloNegativas) {
        // Si tiene AMBAS (rechazada + sin respuesta) y nada más: Rechazados gana (elección explícita).
        if (estados.includes('❌ Rechazada')) { rechazados.push(c); return; }
        if (estados.includes('😶 Sin respuesta')) { sinRespuesta.push(c); return; }
      }
    }
    activa.push(c);
  });

  return { mantenimiento, sinRespuesta, rechazados, activa };
}

// Trae propuestas+servicios y reclasifica _coordAllContacts en las secciones especiales. Se llama
// tras cada (re)carga de la tab Clientes (renderClientesView / renderCoordContactos), ANTES de
// renderContactList. Best-effort: si falla, _coordCliSecciones queda null (fallback a lista plana).
async function loadClienteSecciones() {
  _coordCliSecciones = null;
  try {
    const { propuestas, servicios } = await fetchPropsYSvcsParaSecciones();
    _coordCliSecciones = computeClienteSecciones(_coordAllContacts, propuestas, servicios);
  } catch (e) { _coordCliSecciones = null; }
}

// ── 🎯 Prospección (spec 2026-07-02 B2) ─────────────────────────────────────────────────────
// Reusa la DB Clientes (nada de bases nuevas): el prospecto ES un cliente en uno de estos 4
// estados nuevos del select "Estado" (las opciones "de cartera" — 🆕 Lead / ✅ Cliente activo /
// ⏸️ Inactivo — ya existían y no se tocan). Notion crea las opciones nuevas solo con escribirlas.
// Fix pass (revisión adversarial, ver task-prospeccion-report.md): computeClienteSecciones ahora
// excluye estos estados al toque (return temprano en el forEach) → un prospecto NUNCA contamina
// "Cartera activa" ni ninguna otra sección de la tab 👥 Clientes; vive y se opera solo desde 🎯.
const PROSPECCION_ESTADOS = ['🎯 Prospecto', '📵 Prospecto contactado', '🤝 Interesado', '❌ Descartado'];
const ORIGEN_LEAD_OPTIONS = ['🧲 Vendedor', '🤝 Referido', '🌐 Web/Redes', '📞 Entrante', '🚶 Puerta fría'];
const INTERES_OPTIONS = ['🏢 Fachada', '🪟 Vidrios', '☀️ Paneles solares'];
// Heurística fija v1 (sin configuración por usuario/base): días que suma "📞 Contactado hoy" al
// campo "Próximo contacto". Mismo espíritu que el umbral de mantenimiento (cfgRegla).
// Los días del próximo contacto viven en cfgRegla('prospectoDias') (7 por defecto, editable en ⚙️).
let _coordAllProspectos = [];

// Tab 🗺️ Mapa (solo Ventas): mapa de prospección "TOP 1000 objetivos" embebido como iframe
// (sitio estático aparte en flyclean-mapa.vercel.app). Requiere frame-src en la CSP (vercel.json).
// Se crea recién al abrir la tab (no penaliza el arranque). Encierro defensivo como renderLimpieza.
function renderCoordMapa() {
  if (!esVentas()) return;
  const content = document.getElementById('coord-content');
  if (!content) return;
  ensureMapaBridge();
  content.innerHTML =
    `<iframe id="mapa-iframe" src="https://flyclean-mapa.vercel.app" title="${t('coord.mapa.title')}" loading="lazy" `
    + `style="width:100%;height:calc(100dvh - 150px);border:0;display:block" `
    + `sandbox="allow-scripts allow-same-origin allow-popups"></iframe>`;
}

// ── Bridge del tick "contactado" compartido del mapa (Bloque B, 2026-07-05) ──
// El iframe del mapa NO tiene el token de sesión (otro origen): pide/avisa por postMessage y es la
// APP la que llama autenticada a /api/mapa-estado (KV compartido). El token nunca entra al iframe.
// Mensajes: {type:'fc-mapa-get'} → responde {type:'fc-mapa-estado', estado} ·
//           {type:'fc-mapa-set', id, contactado} → escribe y responde el estado actualizado.
const MAPA_ORIGIN = 'https://flyclean-mapa.vercel.app';
let _mapaBridgeOn = false;
function ensureMapaBridge() {
  if (_mapaBridgeOn) return;
  _mapaBridgeOn = true;
  window.addEventListener('message', async (ev) => {
    if (ev.origin !== MAPA_ORIGIN) return;
    const d = ev.data || {};
    if (d.type !== 'fc-mapa-get' && d.type !== 'fc-mapa-set') return;
    const iframe = document.getElementById('mapa-iframe');
    const reply = (msg) => { try { iframe && iframe.contentWindow && iframe.contentWindow.postMessage(msg, MAPA_ORIGIN); } catch (_) {} };
    try {
      let r;
      if (d.type === 'fc-mapa-set' && d.id) {
        r = await fetch('/api/mapa-estado', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + (localStorage.getItem('fc_token') || '') },
          body: JSON.stringify({ id: d.id, contactado: !!d.contactado })
        });
      } else {
        r = await fetch('/api/mapa-estado', {
          headers: { 'Authorization': 'Bearer ' + (localStorage.getItem('fc_token') || '') }
        });
      }
      if (!r.ok) return; // sin red/sesión el mapa sigue con su localStorage — degradación silenciosa
      captureRenewedToken(r);
      const j = await r.json();
      reply({ type: 'fc-mapa-estado', estado: j.estado || {} });
    } catch (_) { /* offline: el mapa queda con su caché local */ }
  });
}

async function renderCoordProspeccion() {
  const content = document.getElementById('coord-content');
  if (!content) return;
  content.innerHTML = '<div style="text-align:center;padding:40px 0"><div class="spinner" style="margin:0 auto"></div></div>';
  const myTab = 'prospeccion';
  try {
    // Reusa _coordAllContacts si la tab Clientes ya cargó esta sesión (evita un fetch de más);
    // si no, trae la lista igual que renderCoordContactos (mismo filtro de país server-side).
    let contacts;
    if (Array.isArray(_coordAllContacts) && _coordAllContacts.length) {
      contacts = _coordAllContacts;
    } else {
      const cf = getCountryFilter();
      const queryBody = { sorts: [{ property: 'Nombre / Empresa', direction: 'ascending' }] };
      if (cf) queryBody.filter = cf;
      const data = await callNotion(`databases/${CONTACTOS_DB_ID}/query`, 'POST', queryBody);
      contacts = (data.results || []).filter(c => !esArchivado(c));
    }
    if (activeCoordTab !== myTab) return; // tab cambió mientras cargaba → abortar
    _coordAllProspectos = contacts.filter(c => PROSPECCION_ESTADOS.includes(c.properties?.['Estado']?.select?.name || ''));
    renderProspeccionList();
  } catch (e) {
    if (activeCoordTab !== myTab) return;
    content.innerHTML = `<div class="coord-empty">${t('prosp.error')}<br><small>${esc(e.message)}</small></div>`;
  }
}

function renderProspeccionList() {
  const content = document.getElementById('coord-content');
  if (!content) return;
  const newBtn = `<div style="padding:10px 16px 0"><button class="nueva-prop-btn" onclick="openProspectoSheet()">${t('coord.new.prospecto')}</button></div>`;
  if (!_coordAllProspectos.length) {
    content.innerHTML = newBtn + `<div class="coord-empty">${t('prosp.empty')}</div>`;
    return;
  }
  const activos = _coordAllProspectos.filter(c => (c.properties?.['Estado']?.select?.name || '') !== '❌ Descartado');
  const descartados = _coordAllProspectos.filter(c => (c.properties?.['Estado']?.select?.name || '') === '❌ Descartado');

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

function prospectoCard(c) {
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
  const puedeCrearProp = !esVentas() && (esDireccion() || (currentUser?.role || '').includes('Coordinador'));
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

// Acciones de un toque (spec): 'contactado' | 'interesado' | 'descartar'. Optimista (mismo patrón que
// cambiarEstadoServicio): muta en memoria + re-pinta al instante; revierte + avisa si el write falla.
async function prospAccion(id, tipo) {
  const c = (_coordAllProspectos || []).find(x => x.id === id);
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
  if (tipo === 'cliente') _coordAllProspectos = (_coordAllProspectos || []).filter(x => x.id !== id);
  renderProspeccionList();
  markUserActive();

  try {
    await updateServiceProps(id, props);
    syncAfterWrite(id, 'clientes');
  } catch (e) {
    // Revertir el optimista en error duro + avisar (mismo criterio que cambiarEstadoServicio).
    if (estadoAnterior) c.properties['Estado'] = { select: { name: estadoAnterior } }; else delete c.properties['Estado'];
    if (proxAnterior) c.properties['Próximo contacto'] = { date: { start: proxAnterior } }; else delete c.properties['Próximo contacto'];
    if (tipo === 'cliente' && !(_coordAllProspectos || []).some(x => x.id === id)) (_coordAllProspectos = _coordAllProspectos || []).push(c);
    renderProspeccionList();
    alert(t('prosp.error.accion') + e.message);
  }
}

// ── Alta rápida de prospecto (sheet, overlay sibling de body: ver comentario junto a
// #prospecto-overlay) — 20 segundos por prospecto, spec 2026-07-02 B2. ──────────────────────
let prospectoState = {};
function prospectoOverlayClick(e) { if (e.target.id === 'prospecto-overlay') closeProspectoSheet(); }
function closeProspectoSheet() { document.getElementById('prospecto-overlay').classList.remove('open'); }

// Abre el link de mapa recién tipeado en el alta de prospecto (mismo gesto que 'Abrir mapa' en otros lados).
function abrirProspectoMapa() {
  const u = (prospectoState.mapa || '').trim();
  if (!u) { alert(t('prosp.sheet.mapa.vacio')); return; }
  const url = /^https?:\/\//i.test(u) ? u : 'https://' + u;
  window.open(url, '_blank', 'noopener');
}

function openProspectoSheet() {
  const en3dias = new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0];
  prospectoState = { nombre: '', persona: '', tel: '', email: '', mapa: '', origen: '', interes: [], proximo: en3dias, nota: '' };
  document.getElementById('prospecto-sheet-body').innerHTML = buildProspectoSheetBody();
  const btn = document.getElementById('prospecto-save-btn');
  btn.textContent = t('btn.create.notion'); btn.disabled = false;
  document.getElementById('prospecto-overlay').classList.add('open');
}

function buildProspectoSheetBody() {
  const s = prospectoState;
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

function prospectoSetOrigen(el, val) {
  if (el.classList.contains('active')) { prospectoState.origen = ''; el.classList.remove('active'); return; }
  prospectoState.origen = val;
  el.closest('.estado-btns').querySelectorAll('.estado-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
}
function prospectoToggleInteres(el, val) {
  const arr = prospectoState.interes;
  const idx = arr.indexOf(val);
  if (idx === -1) arr.push(val); else arr.splice(idx, 1);
  el.classList.toggle('active', arr.includes(val));
}

async function saveProspecto() {
  const s = prospectoState;
  const nombre = String(s.nombre || '').trim();
  if (!nombre) { alert(t('prosp.sheet.error.empresa')); return; }
  const btn = document.getElementById('prospecto-save-btn');
  btn.textContent = t('btn.saving'); btn.disabled = true;
  try {
    // País del prospecto: el del usuario que lo carga (Ventas/Coordinador son país-aware desde el login).
    const paisNotion = COUNTRY_NOTION_MAP[currentUser?.country] || COUNTRY_NOTION_MAP[selectedCountry] || '🇺🇾 Uruguay';
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
    const created = await callNotion('pages', 'POST', { parent: { database_id: CONTACTOS_DB_ID }, properties: props });
    syncAfterWrite(created?.id, 'clientes');
    // Update optimista: el prospecto recién creado aparece al toque en su lista, sin esperar un refetch.
    if (created?.id) _coordAllProspectos = [created, ..._coordAllProspectos];
    _propContactos = null; // idem selector de cliente en Propuestas: un cliente nuevo debe verse ahí
    closeProspectoSheet();
    renderProspeccionList();
  } catch (e) {
    btn.textContent = t('btn.create.notion'); btn.disabled = false;
    alert(t('sheet.alert.save.error2') + e.message);
  }
}

function cargarMasContactos() {
  _coordVisibleLimit += COORD_PAGE_SIZE;
  renderContactList(_coordAllContacts, true);
}
function refreshContactsView() {
  // Re-render tras guardar/crear, en el contenedor donde se está mirando.
  return _contactsContainerId === 'coord-content' ? renderCoordContactos() : renderClientesView(_contactsContainerId);
}
// Vista "Clientes" unificada para Finanzas/CEO: misma lista + buscador + crear/editar + ficha 360 que el
// coordinador (renderContactList + openContactSheet). Sin filtro de país (ven todos los clientes).
async function renderClientesView(containerId) {
  _contactsContainerId = containerId;
  const content = document.getElementById(containerId);
  if (!content) return;
  content.innerHTML = '<div style="text-align:center;padding:40px 0"><div class="spinner" style="margin:0 auto"></div></div>';
  try {
    // Fase 2 (piloto): si el flag está prendido, leer de la base nueva (Supabase); si falla → fallback a Notion.
    const notionQuery = () => callNotion(`databases/${CONTACTOS_DB_ID}/query`, 'POST', { sorts: [{ property: 'Nombre / Empresa', direction: 'ascending' }] });
    let data;
    if (dbFlag('clientes')) {
      try { data = await callDb('clientes'); } catch (e) { data = await notionQuery(); }
    } else {
      data = await notionQuery();
    }
    _coordAllContacts = (data.results || []).filter(c => !esArchivado(c)).filter(recEnPaisNotion); // aislar clientes por país (socios)
    await loadClienteSecciones(); // best-effort: si falla, renderContactList cae a la lista plana
    renderContactList(_coordAllContacts);
  } catch (e) {
    content.innerHTML = `<div class="coord-empty">No se pudieron cargar los clientes<br><small>${esc(e.message)}</small></div>`;
  }
}

async function renderCoordContactos() {
  // Ventas VE la cartera desde 2026-07-06 (consulta + recontactar): datos de contacto y "para
  // recontactar" (mantenimiento), SIN la plata (la ficha ya es read-only sin 360 para Ventas). NO crea
  // ni edita clientes (el coord agrega manual). Botones de recontactar en la card (solo Ventas).
  _contactsContainerId = 'coord-content';
  const content = document.getElementById('coord-content');
  content.innerHTML = '<div style="text-align:center;padding:40px 0"><div class="spinner" style="margin:0 auto"></div></div>';
  const myTab = 'contactos';
  try {
    const cf = getCountryFilter();
    const queryBody = { sorts: [{ property: 'Nombre / Empresa', direction: 'ascending' }] };
    if (cf) queryBody.filter = cf;
    const data = await callNotion(`databases/${CONTACTOS_DB_ID}/query`, 'POST', queryBody);
    if (activeCoordTab !== myTab) return;
    _coordAllContacts = (data.results || []).filter(c => !esArchivado(c));
    // Ventas también computa las secciones desde 2026-07-06 (tiene lectura de servicios → ve el destacado
    // "🔁 para recontactar"). best-effort: si falla, renderContactList cae a la lista plana.
    await loadClienteSecciones();
    if (activeCoordTab !== myTab) return; // el tab pudo cambiar durante el await de arriba
    renderContactList(_coordAllContacts);
  } catch (e) {
    if (activeCoordTab !== myTab) return;
    content.innerHTML = `<div class="coord-empty">${t('coord.error.contactos')}<br><small>${esc(e.message)}</small></div>`;
  }
}

function renderContactList(contacts, keepLimit) {
  if (!keepLimit) _coordVisibleLimit = COORD_PAGE_SIZE;
  const content = document.getElementById(_contactsContainerId);
  if (!content) return;
  const searchVal = document.getElementById('contact-search-input')?.value?.toLowerCase() || '';
  const matchesSearch = c => {
    const nombre = (c.properties?.['Nombre / Empresa']?.title?.[0]?.plain_text || '').toLowerCase();
    const ciudad = (c.properties?.['Ciudad / Zona']?.rich_text?.[0]?.plain_text || '').toLowerCase();
    return nombre.includes(searchVal) || ciudad.includes(searchVal);
  };
  const searchWrap = `<div class="contact-search-wrap"><input class="contact-search" id="contact-search-input" type="text" placeholder="${t('coord.search.contacts.placeholder')}" oninput="filterContacts(this.value)" value="${searchVal}"/></div>`;
  const newBtn = esVentas() ? '' : `<div style="padding:10px 16px 0"><button class="nueva-prop-btn" onclick="openNewContactSheet()">${t('coord.new.contact')}</button></div>`;
  const cargarMasBtn = remaining => `<div class="cargar-mas-wrap"><button class="cargar-mas-btn" onclick="cargarMasContactos()">↓ ${t('coord.cargar.mas').replace('{n}', Math.min(COORD_PAGE_SIZE, remaining))} · ${t('coord.restantes').replace('{n}', remaining)}</button></div>`;

  // Buscando (o sin datos para clasificar en secciones): lista plana de siempre, sin agrupar —
  // el buscador sigue mirando TODOS los clientes, no solo la cartera activa (spec 2026-07-02).
  if (searchVal || !_coordCliSecciones) {
    const filteredAll = searchVal ? contacts.filter(matchesSearch) : contacts;
    const total = filteredAll.length;
    const filtered = filteredAll.slice(0, _coordVisibleLimit);
    const remaining = total - filtered.length;
    const listHTML = filtered.length
      ? filtered.map(c => coordContactCard(c)).join('') + (remaining > 0 ? cargarMasBtn(remaining) : '')
      : `<div class="coord-empty" style="margin-top:0">${t('coord.empty.search')}</div>`;
    content.innerHTML = searchWrap + newBtn + `<div style="height:4px"></div>` + listHTML;
  } else {
    // Vista por defecto con secciones: 🔁 Mantenimiento (arriba, expandida) → Cartera activa (look
    // de siempre, con su paginación) → 😶 Sin respuesta / ❌ Rechazados (colapsadas, al fondo).
    // Un cliente cae en UNA sola sección (computeClienteSecciones). Reusa el acordeón genérico
    // (toggleCeoAcc + .ceo-acc-head/.ceo-acc-body) que ya usa el panel financiero.
    const seccionHTML = (id, key, items, expandedDefault) => {
      if (!items.length) return '';
      return `<div id="${id}">` +
        `<button class="ceo-acc-head" onclick="toggleCeoAcc(this)"><span>${t(key)} (${items.length})</span><span class="fin-arrow">${expandedDefault ? '▴' : '▾'}</span></button>` +
        `<div class="ceo-acc-body" style="display:${expandedDefault ? 'block' : 'none'}">${items.map(c => coordContactCard(c)).join('')}</div>` +
        `</div>`;
    };
    const totalActiva = _coordCliSecciones.activa.length;
    const activaVisible = _coordCliSecciones.activa.slice(0, _coordVisibleLimit);
    const remaining = totalActiva - activaVisible.length;
    const carteraHTML = activaVisible.length ? activaVisible.map(c => coordContactCard(c)).join('') + (remaining > 0 ? cargarMasBtn(remaining) : '') : '';
    const todoVacio = !_coordCliSecciones.mantenimiento.length && !totalActiva && !_coordCliSecciones.sinRespuesta.length && !_coordCliSecciones.rechazados.length;

    content.innerHTML = searchWrap + newBtn + `<div style="height:4px"></div>` + (todoVacio
      ? `<div class="coord-empty" style="margin-top:0">${t('coord.empty.search')}</div>`
      : seccionHTML('clientes-mantenimiento-block', 'coord.cli.seccion.mantenimiento', _coordCliSecciones.mantenimiento, true) +
        carteraHTML +
        seccionHTML('clientes-sinrespuesta-block', 'coord.cli.seccion.sinrespuesta', _coordCliSecciones.sinRespuesta, false) +
        seccionHTML('clientes-rechazados-block', 'coord.cli.seccion.rechazados', _coordCliSecciones.rechazados, false));
  }
  // Re-foco al input para no perder cursor durante search
  const inp = document.getElementById('contact-search-input');
  if (inp && document.activeElement !== inp && searchVal) {
    inp.focus();
    inp.setSelectionRange(searchVal.length, searchVal.length);
  }
}

function filterContacts(val) {
  // Cambio de búsqueda → reset paginación + re-render unificado (reusa renderContactList).
  _coordVisibleLimit = COORD_PAGE_SIZE;
  renderContactList(_coordAllContacts, true);
}

// Rol Ventas — WhatsApp a un cliente de la cartera (2026-07-06): solo ABRE el canal (no marca nada).
function abrirWhatsAppCliente(id) {
  const c = (_coordAllContacts || []).find(x => x.id === id);
  if (!c) return;
  const props = c.properties || {};
  const tel = props['Teléfono / WhatsApp']?.phone_number || '';
  const pais = props['País']?.select?.name || '';
  const persona = props['Interlocutor']?.rich_text?.[0]?.plain_text || '';
  abrirWhatsApp(tel, pais, cfgWa('cliente').replace('{n}', persona ? ' ' + persona : ''));
}

// Rol Ventas — "📞 Contactado" en un cliente de la cartera: MANUAL y separado del WhatsApp (se marca solo
// cuando de verdad se habló/envió). Escribe 'Próximo contacto' = hoy + cfgRegla('ventasSnoozeDias') → el cliente SALE
// de "para recontactar" ese período (computeClienteSecciones lo respeta) y el equipo ve que ya fue
// contactado (no se pisan). Optimista: muta en memoria + re-clasifica; revierte si el write falla.
// Los días del snooze de Ventas viven en cfgRegla('ventasSnoozeDias') (60 por defecto, editable en ⚙️).
// Núcleo único de escritura del snooze: PATCH 'Próximo contacto' + espejo + optimista + re-clasificación.
// Lo usan el "📞 Contactado" de Ventas (hoy+60 fijo) y el "📅 Recontactar a partir de…" del coord (fecha libre).
async function setProximoContacto(id, fechaISO) {
  await callNotion('pages/' + id, 'PATCH', { properties: { 'Próximo contacto': { date: { start: fechaISO } } } });
  if (typeof syncAfterWrite === 'function') { try { syncAfterWrite(id, 'clientes'); } catch (_) {} }
  const c = (_coordAllContacts || []).find(x => x.id === id);
  if (c) { c.properties = c.properties || {}; c.properties['Próximo contacto'] = { date: { start: fechaISO } }; }
  await loadClienteSecciones(); // recomputa: el cliente sale de "🔁 para recontactar" (Próximo contacto futuro)
  renderContactList(_coordAllContacts, true);
}
async function marcarClienteContactado(id) {
  const btn = document.getElementById('cli-cont-btn-' + id);
  if (btn) { if (btn.disabled) return; btn.disabled = true; btn.textContent = '⏳'; }
  try {
    const prox = new Date(Date.now() + cfgRegla('ventasSnoozeDias') * 86400000).toISOString().split('T')[0];
    await setProximoContacto(id, prox);
  } catch (e) {
    if (btn) { btn.disabled = false; btn.textContent = '📞 ' + t('coord.cli.contactado'); }
    alert(t('sheet.alert.save.error2') + e.message);
  }
}
// "📅 Recontactar a partir de…" (coord/Dirección): muestra el date-picker inline en la card de mantenimiento.
function toggleRecontactarFecha(id) {
  const box = document.getElementById('recont-fecha-' + id);
  if (box) box.style.display = box.style.display === 'none' ? 'flex' : 'none';
}
async function confirmarRecontactarFecha(id) {
  const inp = document.getElementById('recont-fecha-input-' + id);
  const fecha = (inp?.value || '').trim();
  const hoy = new Date().toISOString().split('T')[0];
  if (!fecha || fecha <= hoy) { alert(t('coord.cli.recontactar.invalida')); return; }
  const btn = document.getElementById('recont-fecha-ok-' + id);
  if (btn) { if (btn.disabled) return; btn.disabled = true; btn.textContent = '⏳'; }
  try {
    await setProximoContacto(id, fecha);
  } catch (e) {
    if (btn) { btn.disabled = false; btn.textContent = 'OK'; }
    alert(t('sheet.alert.save.error2') + e.message);
  }
}

function coordContactCard(c) {
  const props = c.properties || {};
  const nombreRaw = props['Nombre / Empresa']?.title?.[0]?.plain_text;
  let nombreHTML;
  if (nombreRaw) {
    nombreHTML = esc(nombreRaw);
  } else {
    const idShort = esc((c.id || '').slice(0, 8));
    nombreHTML = `<span style="color:#c67e25">⚠️ Contacto sin nombre (${idShort})</span>`;
    console.warn('[fc] coord: contacto sin nombre', c.id, 'properties keys:', Object.keys(props));
  }
  const estado = props['Estado']?.select?.name || '';
  const tipo = props['Tipo de cliente']?.select?.name || '';
  const pais = props['País']?.select?.name || '';
  const tel = props['Teléfono / WhatsApp']?.phone_number || '';
  const email = props['Email']?.email || '';
  const servicios = (props['Servicio de interés']?.multi_select || []).map(s => s.name).join(' · ');
  const estadoClass = estado.includes('activo') ? 'activo' : estado.includes('Inactivo') ? 'inactivo' : '';
  // R4: chip "🤝 vía X" si el cliente llegó por un intermediario (nombre resuelto desde la cartera ya cargada).
  // Ventas NO ve el modelo de intermediarios (igual que el 360) → no mostrarle "quién trajo a quién".
  const intId = props['Intermediario']?.relation?.[0]?.id || '';
  let viaBadge = '';
  if (intId && !esVentas()) {
    const im = (_coordAllContacts || []).find(x => x.id === intId);
    const intNombre = (im?.properties?.['Nombre / Empresa']?.title?.[0]?.plain_text) || clienteNombreDe(intId) || '';
    viaBadge = `<span class="coord-tag">🤝 ${t('sheet.contact.via')} ${esc(intNombre || '…')}</span>`;
  }
  const proxContacto = (props['Próximo contacto']?.date?.start || '').split('T')[0];
  const recontactadoReciente = proxContacto && proxContacto > new Date().toISOString().split('T')[0];
  // Botones de recontactar SOLO para Ventas (es su trabajo). 💬 solo ABRE el canal; 📞 Contactado es
  // MANUAL y separado (se marca cuando de verdad se habló/envió — no al abrir WhatsApp). stopPropagation
  // para no abrir la ficha al tocarlos.
  const botonesVentas = (esVentas() && tel) ? `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">
      <button class="estado-btn" style="color:#25D366;border-color:#25D366" onclick="event.stopPropagation();abrirWhatsAppCliente('${esc(c.id)}')">💬 WhatsApp</button>
      <button class="estado-btn" id="cli-cont-btn-${esc(c.id)}" onclick="event.stopPropagation();marcarClienteContactado('${esc(c.id)}')">📞 ${t('coord.cli.contactado')}</button>
    </div>` : '';
  // Botón "→ Crear propuesta" para el COORD en clientes de mantenimiento (9 meses sin trabajo): abre una
  // propuesta nueva ya asociada al cliente. Al guardarla, el cliente sale SOLO de la sección (la lógica
  // !propAbierta de computeClienteSecciones lo pasa a "Cartera activa"). Comercial 2026-07-09.
  // Coord/Dirección en clientes de mantenimiento: "→ Crear propuesta" + "📅 Recontactar a partir de…"
  // (posponer con fecha libre — ej. el vidrio sigue limpio y no tiene sentido vender a los 9 meses).
  const mananaISO = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const botonCoordMant = (!esVentas() && Number.isFinite(c._mantMeses)) ? `<div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap" onclick="event.stopPropagation()">
      <button class="estado-btn" style="color:var(--green);border-color:var(--green)" onclick="openNewPropSheet('${esc(c.id)}')">→ ${t('coord.cli.crearprop')}</button>
      <button class="estado-btn" onclick="toggleRecontactarFecha('${esc(c.id)}')">📅 ${t('coord.cli.recontactar.btn')}</button>
    </div>
    <div id="recont-fecha-${esc(c.id)}" style="display:none;gap:6px;align-items:center;margin-top:6px" onclick="event.stopPropagation()">
      <input type="date" id="recont-fecha-input-${esc(c.id)}" class="edit-date-input" style="flex:1;margin:0" min="${mananaISO}"/>
      <button class="estado-btn" id="recont-fecha-ok-${esc(c.id)}" onclick="confirmarRecontactarFecha('${esc(c.id)}')">OK</button>
    </div>` : '';
  // Badge del snooze CON la fecha: se ve hasta cuándo está pospuesto (antes decía solo "Recontactado").
  const proxFmt = recontactadoReciente ? `${proxContacto.slice(8, 10)}/${proxContacto.slice(5, 7)}/${proxContacto.slice(0, 4)}` : '';
  return `<div class="contact-card" onclick="openContactSheet('${esc(c.id)}')">
    <div class="contact-name">${nombreHTML}</div>
    <div class="contact-badges">
      ${estado ? `<span class="contact-estado ${estadoClass}">${esc(estado)}</span>` : ''}
      ${tipo ? `<span class="coord-tag">${esc(tipo)}</span>` : ''}
      ${pais ? `<span class="coord-tag">${esc(pais)}</span>` : ''}
      ${viaBadge}
    </div>
    ${servicios ? `<div class="contact-detail">🛠 ${esc(servicios)}</div>` : ''}
    ${tel ? `<div class="contact-detail">📞 ${esc(tel)}</div>` : ''}
    ${email ? `<div class="contact-detail">✉️ ${esc(email)}</div>` : ''}
    ${Number.isFinite(c._mantMeses) ? `<div class="contact-detail" style="color:var(--red);font-weight:600">🔴 ${t('coord.cli.mant.meses').replace('{n}', c._mantMeses)}</div>` : ''}
    ${recontactadoReciente ? `<div class="contact-detail" style="color:var(--green);font-weight:600">⏸ ${t('coord.cli.recontactar.desde').replace('{f}', proxFmt)}</div>` : ''}
    ${botonesVentas}
    ${botonCoordMant}
  </div>`;
}

function buildContactSheetBody(mode) {
  const s = contactEditState;
  const ESTADOS = ['🆕 Lead', '✅ Cliente activo', '⏸️ Inactivo'];
  const TIPOS = ['🏢 Administración', '🏗️ Constructora', '🏠 Particular'];
  const PAISES = ['🇺🇾 Uruguay', '🇧🇷 Brasil', '🇵🇦 Panamá', '🇬🇹 Guatemala', '🇲🇽 México'];
  const CANALES = ['💬 WhatsApp', '📱 Redes sociales', '🤝 Recomendación', '🚶 Captación proactiva', '📧 Email'];
  const SERVICIOS = ['🏢 Fachada', '🪟 Vidrios', '☀️ Paneles solares'];

  function btnGroup(label, key, options) {
    return `<div class="edit-section"><div class="edit-section-label">${label}</div><div class="estado-btns">${
      options.map(o => `<button class="estado-btn ${s[key] === o ? 'active' : ''}" onclick="contactSetField('${key}',this,'${o.replace(/'/g,"\\'")}')">${o}</button>`).join('')
    }</div></div>`;
  }

  function multiGroup(label, key, options) {
    const arr = s[key] || [];
    return `<div class="edit-section"><div class="edit-section-label">${label}</div><div class="multi-toggle-grid">${
      options.map(o => `<button class="multi-toggle-btn ${arr.includes(o) ? 'active' : ''}" onclick="contactToggleMulti('${key}',this,'${o.replace(/'/g,"\\'")}')">${o}</button>`).join('')
    }</div></div>`;
  }

  return `<div class="edit-section"><div class="edit-section-label">${t('sheet.contact.section.nombre')}</div>
        <input type="text" id="contact-nombre-input" class="edit-date-input" placeholder="${t('sheet.contact.nombre.placeholder')}" value="${esc(s.nombre || '')}" oninput="contactEditState.nombre=this.value" style="font-size:14px"/></div>` +
    btnGroup(t('sheet.contact.section.estado'), 'estado', ESTADOS) +
    btnGroup(t('sheet.contact.section.tipo'), 'tipo', TIPOS) +
    btnGroup(t('sheet.contact.section.pais'), 'pais', PAISES) +
    btnGroup(t('sheet.contact.section.canal'), 'canal', CANALES) +
    multiGroup(t('sheet.contact.section.servicios'), 'servicios', SERVICIOS) +
    `<div class="edit-section"><div class="edit-section-label">${t('sheet.contact.section.tel')}</div>
      <input type="tel" class="edit-date-input" placeholder="${t('sheet.contact.tel.placeholder')}" value="${s.tel || ''}" oninput="contactEditState.tel=this.value"/></div>` +
    `<div class="edit-section"><div class="edit-section-label">${t('sheet.contact.section.email')}</div>
      <input type="email" class="edit-date-input" placeholder="${t('sheet.contact.email.placeholder')}" value="${s.email || ''}" oninput="contactEditState.email=this.value"/></div>` +
    `<div class="edit-section"><div class="edit-section-label">${t('sheet.contact.section.ciudad')}</div>
      <input type="text" class="edit-date-input" placeholder="${t('sheet.contact.ciudad.placeholder')}" value="${s.ciudad || ''}" oninput="contactEditState.ciudad=this.value"/></div>` +
    `<div class="edit-section"><div class="edit-section-label">${t('sheet.contact.section.mapa')}</div>
      <div style="display:flex;gap:8px;align-items:center">
        <input type="url" id="contact-mapa-input" class="edit-date-input" style="flex:1" placeholder="${t('sheet.contact.mapa.placeholder')}" value="${esc(s.mapa || '')}" oninput="contactEditState.mapa=this.value"/>
        <button type="button" class="estado-btn" style="white-space:nowrap" onclick="contactOpenMapa()">${t('sheet.contact.mapa.abrir')}</button>
      </div></div>` +
    (mode === 'edit'
      ? `<div class="edit-section"><div class="edit-section-label">${t('sheet.contact.section.recontacto')}</div>
          <div class="edit-section-hint" style="font-size:11px;color:var(--text3);margin-bottom:6px">${t('sheet.contact.recontacto.hint')}</div>
          <input type="date" class="edit-date-input" value="${esc(s.proximoContacto || '')}" onchange="contactEditState.proximoContacto=this.value"/></div>
         <div class="edit-section"><div class="edit-section-label">${t('sheet.contact.section.intermediario')}</div>
          <div id="contact-traidopor-row"></div>
          <select id="contact-intermediario-select" class="edit-date-input" onchange="contactIntermediarioChanged(this.value)">
            <option value="">${t('sheet.contact.intermediario.none')}</option>
            <option value="__loading__" disabled>${t('sheet.contact.intermediario.loading')}</option>
          </select></div>
         <div id="contact-traidos-container"></div>`
      : '') +
    `<div class="edit-section"><div class="edit-section-label">${t('sheet.contact.section.interlocutor')}</div>
      <input type="text" class="edit-date-input" placeholder="${t('sheet.contact.interlocutor.placeholder')}" value="${s.interlocutor || ''}" oninput="contactEditState.interlocutor=this.value"/></div>` +
    `<div class="edit-section"><div class="edit-section-label">${t('sheet.contact.section.notas')}</div>
      <textarea class="edit-date-input" rows="3" style="resize:none;height:80px" placeholder="${t('sheet.contact.notas.placeholder')}" oninput="contactEditState.notas=this.value">${esc(s.notas || '')}</textarea></div>` +
    `<div class="edit-section"><div class="edit-section-label">${t('sheet.contact.section.sectores')}</div>
      <div class="edit-section-hint" style="font-size:11px;color:var(--text3);margin-bottom:8px">${t('sheet.contact.sectores.hint')}</div>
      <div id="contact-sectores-list"></div>
      <div style="display:flex;gap:8px;margin-top:8px">
        <input type="text" id="contact-sector-input" class="edit-date-input" style="flex:1;margin-bottom:0" placeholder="${t('sheet.contact.sectores.placeholder')}" onkeydown="if(event.key==='Enter'){event.preventDefault();contactAddSector();}"/>
        <button type="button" class="estado-btn" style="white-space:nowrap" onclick="contactAddSector()">${t('sheet.contact.sectores.add')}</button>
      </div></div>` +
    (mode === 'edit'
      ? ((!esVentas() ? `<div class="edit-section"><button class="nueva-prop-btn" style="width:100%" onclick="openNewServiceSheetForContact(editingContact && editingContact.id)">${t('sheet.contact.new.servicio')}</button></div>` : '')) +
        `<div class="edit-section" style="padding-bottom:0"><div class="edit-section-label">${t('contact.history.title')}</div>
          <div id="contact-history-container"><div class="history-loading">${t('contact.history.loading')}</div></div>
         </div>`
      : '');
}

async function openContactSheet(pageId) {
  contactSheetMode = 'edit';
  editingContact = (_coordAllContacts || []).find(c => c.id === pageId);
  // Blindaje: si la lista todavía no terminó de cargar (race en Finanzas/CEO), traer la ficha de Notion por id
  // → la ficha NUNCA sale vacía, sin importar el timing.
  if (!editingContact) {
    try { editingContact = await callNotion('pages/' + pageId, 'GET'); } catch (_) {}
  }
  if (!editingContact || !editingContact.properties) return;
  const props = editingContact.properties || {};
  contactEditState = {
    nombre: props['Nombre / Empresa']?.title?.[0]?.plain_text || '',
    estado: props['Estado']?.select?.name || '',
    tipo: props['Tipo de cliente']?.select?.name || '',
    pais: props['País']?.select?.name || '',
    canal: props['Canal de captación']?.select?.name || '',
    servicios: (props['Servicio de interés']?.multi_select || []).map(s => s.name),
    tel: props['Teléfono / WhatsApp']?.phone_number || '',
    email: props['Email']?.email || '',
    ciudad: props['Ciudad / Zona']?.rich_text?.[0]?.plain_text || '',
    interlocutor: props['Interlocutor']?.rich_text?.[0]?.plain_text || '',
    notas: props['Notas']?.rich_text?.[0]?.plain_text || '',
    mapa: props['Mapa']?.url || '',
    intermediario: props['Intermediario']?.relation?.[0]?.id || '',
    proximoContacto: (props['Próximo contacto']?.date?.start || '').split('T')[0],
    _proximoContactoOrig: (props['Próximo contacto']?.date?.start || '').split('T')[0], // para escribir solo si cambió
    sectores: (() => { try { return JSON.parse(props['Sectores']?.rich_text?.[0]?.plain_text || '[]'); } catch (_) { return []; } })()
  };
  // F1 (escribir SOLO lo cambiado): snapshot de los originales para que al guardar no se re-escriban campos que el
  // usuario no tocó → evita el "echo-back" que pisaría datos buenos cuando la tabla clientes pase a Supabase-first.
  Object.assign(contactEditState, {
    _nombreOrig: contactEditState.nombre, _estadoOrig: contactEditState.estado, _tipoOrig: contactEditState.tipo,
    _paisOrig: contactEditState.pais, _canalOrig: contactEditState.canal, _telOrig: contactEditState.tel,
    _emailOrig: contactEditState.email, _ciudadOrig: contactEditState.ciudad, _interlocutorOrig: contactEditState.interlocutor,
    _notasOrig: contactEditState.notas, _mapaOrig: contactEditState.mapa, _intermediarioOrig: contactEditState.intermediario,
    _serviciosOrig: JSON.stringify(contactEditState.servicios || []), _sectoresOrig: JSON.stringify(contactEditState.sectores || []),
  });
  const nombre = props['Nombre / Empresa']?.title?.[0]?.plain_text || t('common.sinnombre');
  document.getElementById('contact-sheet-title').textContent = nombre;
  document.getElementById('contact-sheet-sub').textContent = contactEditState.tipo || t('sheet.contact.title.default');
  document.getElementById('contact-sheet-body').innerHTML = buildContactSheetBody('edit');
  renderContactSectores();
  // Permisos: CEO = solo lectura (ve TODO, no toca, salvo el nombre). Finanzas / Coordinador /
  // Dirección = pueden editar. Ventas también solo lectura, pero SIN la excepción de CEO: la
  // ficha de un prospecto queda 100% no-editable (junta/madura prospectos, no edita el 360).
  const esCEOSoloLectura = (currentUser?.role || '').includes('CEO');
  const soloLectura = esCEOSoloLectura || esVentas();
  const btn = document.getElementById('contact-save-btn');
  const body = document.getElementById('contact-sheet-body');
  if (soloLectura) {
    if (btn) btn.style.display = 'none';
    body.querySelectorAll('input, select, textarea').forEach(el => { el.disabled = true; });
    body.querySelectorAll('.estado-btn').forEach(el => { el.style.pointerEvents = 'none'; el.style.opacity = '0.6'; });
    if (esCEOSoloLectura) {
      // El CEO puede editar SOLO el nombre (no el resto). Ventas no entra acá: para Ventas
      // la ficha queda completamente bloqueada, botón Guardar incluido.
      const nombreInput = document.getElementById('contact-nombre-input');
      if (nombreInput) nombreInput.disabled = false;
      if (btn) { btn.style.display = ''; btn.textContent = t('btn.save.notion'); btn.disabled = false; }
    }
  } else if (btn) {
    btn.style.display = ''; btn.textContent = t('btn.save.notion'); btn.disabled = false;
  }
  document.getElementById('contact-overlay').classList.add('open');

  // Cargar historial e intermediarios async (no bloquean apertura del sheet)
  // Ventas nunca ve el historial financiero (propuestas/servicios/ingresos) del cliente:
  // ni se lanza el fetch ni queda el spinner de "Cargando..." colgado en la ficha.
  if (esVentas()) {
    const historyContainer = document.getElementById('contact-history-container');
    const historySection = historyContainer?.closest('.edit-section');
    if (historySection) historySection.style.display = 'none';
  } else {
    loadContactHistory(pageId);
  }
  // Ventas tampoco carga los intermediarios (traería toda la cartera como <option> al DOM).
  if (!esVentas()) loadContactIntermediarios(pageId);
  // R4: "Traído por" (directo) + "Clientes traídos" (inverso). Solo no-Ventas (no ve el 360).
  if (!esVentas()) renderIntermediarioVistas(pageId);
}

// R4: vistas de intermediario en la carta del cliente (ambos sentidos), resueltas con el mapa id→nombre.
async function renderIntermediarioVistas(pageId) {
  try {
    await ensureClienteNombres();
    // "Traído por X" (lado directo, read-only clickeable) arriba del selector.
    const row = document.getElementById('contact-traidopor-row');
    if (row) {
      const intId = contactEditState.intermediario;
      row.innerHTML = intId
        ? `<div style="font-size:12px;color:var(--text2);margin-bottom:6px;cursor:pointer" onclick="verClienteDesdeContacto('${esc(intId)}')">🤝 ${t('sheet.contact.traidopor')}: <span style="text-decoration:underline">${esc(clienteNombreDe(intId) || '…')}</span> ↗</div>`
        : '';
    }
    // "Clientes traídos (N)" (lado inverso del dual Intermediario↔Clientes traídos). Se COMPUTA escaneando la lista
    // de clientes por su Intermediario (lado DIRECTO, siempre fresco en el espejo) en vez de leer la relación inversa
    // del raw del intermediario: ese lado inverso no se re-mapea cuando clientes es Supabase-first → quedaría stale.
    const box = document.getElementById('contact-traidos-container');
    if (!box) return;
    const _normId = x => (x || '').replace(/-/g, '');
    const traidos = (_coordAllContacts || []).filter(c => _normId(c.properties?.['Intermediario']?.relation?.[0]?.id) === _normId(pageId));
    if (!traidos.length) { box.innerHTML = ''; return; }
    const rows = traidos.map(c => {
      const nm = c.properties?.['Nombre / Empresa']?.title?.[0]?.plain_text || '(cliente)';
      return `<div class="equipo-card" style="cursor:pointer" onclick="verClienteDesdeContacto('${esc(c.id)}')"><div style="flex:1;min-width:0"><div class="equipo-name">🏢 ${esc(nm)}</div></div><span class="user-arrow">↗</span></div>`;
    }).join('');
    box.innerHTML = `<div class="edit-section"><div class="edit-section-label">🤝 ${t('sheet.contact.traidos.title')} (${traidos.length})</div>${rows}</div>`;
  } catch (_) {}
}
// Navegar de una ficha de cliente a otra (mismo overlay): cerrar → delay → reabrir con el id destino.
function verClienteDesdeContacto(id) { if (!id) return; closeContactSheet(); setTimeout(() => openContactSheet(id), 250); }

function openNewContactSheet() {
  contactSheetMode = 'create';
  editingContact = null;
  contactEditState = { nombre: '', estado: '🆕 Lead', tipo: '', pais: '🇺🇾 Uruguay', canal: '', servicios: [], tel: '', email: '', ciudad: '', interlocutor: '', notas: '', mapa: '', intermediario: '', sectores: [] };
  document.getElementById('contact-sheet-title').textContent = t('sheet.contact.title.nuevo');
  document.getElementById('contact-sheet-sub').textContent = t('sheet.contact.subtitle.nuevo');
  document.getElementById('contact-sheet-body').innerHTML = buildContactSheetBody('create');
  renderContactSectores();
  const btn = document.getElementById('contact-save-btn');
  btn.textContent = t('btn.create.notion'); btn.disabled = false;
  document.getElementById('contact-overlay').classList.add('open');
}

function contactSetField(key, el, val) {
  // País y Estado obligatorios; el resto: tocar el activo lo vacía (toggle / deseleccionar).
  const obligatorio = (key === 'pais' || key === 'estado');
  if (!obligatorio && el.classList.contains('active')) {
    contactEditState[key] = '';
    el.classList.remove('active');
  } else {
    contactEditState[key] = val;
    el.closest('.estado-btns').querySelectorAll('.estado-btn').forEach(b => b.classList.remove('active'));
    el.classList.add('active');
  }
}

function contactToggleMulti(key, el, val) {
  const arr = contactEditState[key] || [];
  const idx = arr.indexOf(val);
  if (idx === -1) arr.push(val); else arr.splice(idx, 1);
  contactEditState[key] = arr;
  el.classList.toggle('active', arr.includes(val));
}

function contactOpenMapa() {
  const u = (contactEditState.mapa || '').trim();
  if (!u) { alert(t('sheet.contact.mapa.none')); return; }
  window.open(u, '_blank', 'noopener');
}

function renderContactSectores() {
  const box = document.getElementById('contact-sectores-list');
  if (!box) return;
  const arr = Array.isArray(contactEditState.sectores) ? contactEditState.sectores : [];
  box.innerHTML = arr.length
    ? arr.map(sec => `<div class="sector-row" style="display:flex;gap:6px;align-items:center;margin-bottom:6px">
        <input type="text" class="edit-date-input" style="flex:1;margin-bottom:0" value="${escAttrEdit(sec.nombre)}" oninput="contactRenameSector('${sec.id}',this.value)"/>
        <button type="button" class="estado-btn" style="padding:8px 10px;color:var(--danger,#e5484d)" onclick="contactRemoveSector('${sec.id}')">✕</button>
      </div>`).join('')
    : `<div style="font-size:12px;color:var(--text3);font-style:italic">${t('sheet.contact.sectores.empty')}</div>`;
}

function contactAddSector() {
  const input = document.getElementById('contact-sector-input');
  const nombre = (input?.value || '').trim();
  if (!nombre) return;
  if (!Array.isArray(contactEditState.sectores)) contactEditState.sectores = [];
  contactEditState.sectores.push({ id: genSectorId(), nombre });
  if (input) input.value = '';
  renderContactSectores();
}

function contactRenameSector(id, value) {
  const sec = (contactEditState.sectores || []).find(s => s.id === id);
  if (sec) sec.nombre = value;
}

function contactRemoveSector(id) {
  contactEditState.sectores = (contactEditState.sectores || []).filter(s => s.id !== id);
  renderContactSectores();
}

let _contactIntermediarios = null;
async function loadContactIntermediarios(selfId) {
  const sel = document.getElementById('contact-intermediario-select');
  if (!sel) return;
  try {
    if (!_contactIntermediarios) {
      if (Array.isArray(_coordAllContacts) && _coordAllContacts.length) {
        _contactIntermediarios = _coordAllContacts;
      } else {
        const d = await callNotion(`databases/${CONTACTOS_DB_ID}/query`, 'POST', { sorts: [{ property: 'Nombre / Empresa', direction: 'ascending' }] });
        _contactIntermediarios = d.results || [];
      }
    }
    const tit = c => c.properties?.['Nombre / Empresa']?.title?.[0]?.plain_text || '(sin nombre)';
    const cur = contactEditState.intermediario || '';
    sel.innerHTML = `<option value="">${t('sheet.contact.intermediario.none')}</option>` +
      _contactIntermediarios.slice()
        .filter(c => c.id !== selfId)
        .sort((a, b) => tit(a).localeCompare(tit(b)))
        .map(c => `<option value="${esc(c.id)}">${esc(tit(c))}</option>`).join('');
    sel.value = cur;
    // CEO solo lectura: el bloque soloLectura de openContactSheet ya deshabilita selects del body,
    // pero ese bloque corre ANTES de poblar este select async → re-aplicar el disabled si corresponde.
    if (currentUser?.role && currentUser.role.includes('CEO')) sel.disabled = true;
  } catch (_) { /* el form sirve igual: queda "Directo" */ }
}
function contactIntermediarioChanged(val) {
  contactEditState.intermediario = val || '';
}

function contactOverlayClick(e) { if (e.target.id === 'contact-overlay') closeContactSheet(); }
function closeContactSheet() { document.getElementById('contact-overlay').classList.remove('open'); editingContact = null; }

async function saveContactEdit() {
  const esCEO = !!(currentUser?.role && currentUser.role.includes('CEO'));
  const s = contactEditState;
  const nombre = String(s.nombre || '').trim();
  if (!nombre) { alert(t('sheet.contact.error.nombre')); return; }
  const btn = document.getElementById('contact-save-btn');
  btn.textContent = t('btn.saving'); btn.disabled = true;
  try {
    // CEO: SOLO el nombre (el resto de la ficha es solo-lectura).
    if (esCEO) {
      if (contactSheetMode !== 'edit' || !editingContact) { btn.disabled = false; return; }
      await updateServiceProps(editingContact.id, { 'Nombre / Empresa': { title: [{ text: { content: nombre } }] } });
      syncAfterWrite(editingContact.id, 'clientes');
      closeContactSheet(); await refreshContactsView(); return;
    }
    const props = {};
    // F1: en EDICIÓN cada campo se escribe SOLO si cambió vs su snapshot (_XOrig) → nunca re-escribe un valor
    // que el usuario no tocó. En CREATE se escribe todo (registro nuevo, no hay echo-back). chg() decide.
    const edit = contactSheetMode === 'edit';
    const chg = (cur, orig) => !edit || cur !== orig;
    if (chg(s.estado, s._estadoOrig) && s.estado) props['Estado'] = { select: { name: s.estado } };
    if (chg(s.tipo, s._tipoOrig)) props['Tipo de cliente'] = { select: s.tipo ? { name: s.tipo } : null };
    if (chg(s.pais, s._paisOrig) && s.pais) props['País'] = { select: { name: s.pais } };
    if (chg(s.canal, s._canalOrig)) props['Canal de captación'] = { select: s.canal ? { name: s.canal } : null };
    if (chg(JSON.stringify(s.servicios || []), s._serviciosOrig)) props['Servicio de interés'] = { multi_select: (s.servicios || []).map(n => ({ name: n })) };
    if (chg(s.tel, s._telOrig)) props['Teléfono / WhatsApp'] = { phone_number: s.tel || null };
    if (chg(s.email, s._emailOrig)) props['Email'] = { email: s.email || null };
    if (chg(s.ciudad, s._ciudadOrig)) props['Ciudad / Zona'] = { rich_text: s.ciudad ? [{ text: { content: s.ciudad } }] : [] };
    if (chg(s.mapa, s._mapaOrig)) props['Mapa'] = { url: s.mapa && s.mapa.trim() ? s.mapa.trim() : null };
    if (contactSheetMode !== 'create' && chg(s.intermediario, s._intermediarioOrig))
      props['Intermediario'] = { relation: s.intermediario ? [{ id: s.intermediario }] : [] };
    // Recontacto: escribir SOLO si el usuario lo cambió (así no pisamos el snooze de Ventas sin querer).
    if (contactSheetMode !== 'create' && s.proximoContacto !== s._proximoContactoOrig)
      props['Próximo contacto'] = s.proximoContacto ? { date: { start: s.proximoContacto } } : { date: null };
    if (chg(s.interlocutor, s._interlocutorOrig)) props['Interlocutor'] = { rich_text: s.interlocutor ? [{ text: { content: s.interlocutor } }] : [] };
    if (chg(s.notas, s._notasOrig)) props['Notas'] = { rich_text: s.notas ? [{ text: { content: s.notas } }] : [] };
    {
      const secs = (Array.isArray(s.sectores) ? s.sectores : [])
        .map(x => ({ id: x.id, nombre: String(x.nombre || '').trim() }))
        .filter(x => x.nombre);
      if (chg(JSON.stringify(s.sectores || []), s._sectoresOrig)) props['Sectores'] = { rich_text: secs.length ? [{ text: { content: JSON.stringify(secs) } }] : [] };
    }
    if (chg(nombre, s._nombreOrig)) props['Nombre / Empresa'] = { title: [{ text: { content: nombre } }] };

    if (contactSheetMode === 'create') {
      const orf = [];
      if (s.tel) orf.push({ property: 'Teléfono / WhatsApp', phone_number: { equals: s.tel } });
      if (s.email) orf.push({ property: 'Email', email: { equals: s.email } });
      if (orf.length) {
        const dup = await callNotion(`databases/${CONTACTOS_DB_ID}/query`, 'POST', { filter: orf.length === 1 ? orf[0] : { or: orf }, page_size: 1 }).catch(() => ({ results: [] }));
        if (dup.results && dup.results.length) {
          const exNom = dup.results[0].properties?.['Nombre / Empresa']?.title?.[0]?.plain_text || 'otro cliente';
          btn.textContent = t('btn.create.notion'); btn.disabled = false;
          alert('Ya existe un cliente con ese teléfono o email: "' + exNom + '". Editá el existente en vez de duplicar.');
          return;
        }
      }
      const created = await callNotion('pages', 'POST', { parent: { database_id: CONTACTOS_DB_ID }, properties: props });
      syncAfterWrite(created?.id, 'clientes');
    } else {
      await updateServiceProps(editingContact.id, props);
      syncAfterWrite(editingContact.id, 'clientes');
    }
    _contactIntermediarios = null; // forzar recarga: cambió la lista/relaciones
    _propContactos = null;         // idem para el selector de cliente en Propuestas (un cliente nuevo debe aparecer ahí)
    closeContactSheet();
    await refreshContactsView();
  } catch (e) {
    btn.textContent = contactSheetMode === 'create' ? t('btn.create.notion') : t('btn.save.notion');
    btn.disabled = false;
    alert(t('sheet.alert.save.error2') + e.message);
  }
}

// ─────────────────────────────────────────────
// HISTORIAL DEL CLIENTE — propuestas + relevamientos + servicios + ingresos
// ─────────────────────────────────────────────
const _contactHistoryCache = {};

async function loadContactHistory(contactId) {
  if (!contactId) return;
  const container = document.getElementById('contact-history-container');
  if (!container) return;

  // Usar cache si existe
  if (_contactHistoryCache[contactId]) {
    renderContactHistory(_contactHistoryCache[contactId]);
    return;
  }

  // Lanzar las 4 queries en paralelo
  const propFilter = { property: 'Contacto', relation: { contains: contactId } };
  const svcRelevFilter = { and: [
    { property: 'Contacto', relation: { contains: contactId } },
    { property: 'Tipo de registro', select: { equals: '🔍 Relevamiento' } }
  ]};
  // Sin filtro de Estado (auditoría 2026-07-09): el historial del cliente mostraba SOLO Completados y
  // escondía lo agendado (Pendiente/Asignado/En curso). Traemos la orden de trabajo en cualquier estado.
  const svcCompletoFilter = { and: [
    { property: 'Contacto', relation: { contains: contactId } },
    { property: 'Tipo de registro', select: { equals: '📋 Orden de trabajo' } }
  ]};
  const ingresoFilter = { property: 'Cuenta', relation: { contains: contactId } };

  try {
    const [propRes, relevRes, svcRes, ingRes] = await Promise.all([
      callNotion(`databases/${PROPUESTAS_DB_ID}/query`, 'POST', { filter: propFilter }).catch(() => ({ results: [] })),
      callNotion(`databases/${DB_ID}/query`, 'POST', { filter: svcRelevFilter }).catch(() => ({ results: [] })),
      callNotion(`databases/${DB_ID}/query`, 'POST', { filter: svcCompletoFilter }).catch(() => ({ results: [] })),
      callNotion(`databases/${INGRESOS_DB_ID}/query`, 'POST', { filter: ingresoFilter }).catch(() => ({ results: [] }))
    ]);

    // El proxy hace search fallback para Servicios (multi-source) que ignora el filter
    // → filtrar cliente-side por contactId Y tipoReg
    // Además del contacto/tipo, filtramos por país (recEnPaisNotion) para que un usuario de un país no vea
    // servicios de otro aunque entre por un id de contacto ajeno.
    const relevs = (relevRes.results || []).filter(s => {
      const tipoReg = s.properties?.['Tipo de registro']?.select?.name || '';
      const contactos = s.properties?.['Contacto']?.relation || [];
      return tipoReg.includes('Relevamiento') && contactos.some(r => r.id === contactId) && recEnPaisNotion(s);
    });
    const svcs = (svcRes.results || []).filter(s => {
      const tipoReg = s.properties?.['Tipo de registro']?.select?.name || '';
      const estado = s.properties?.['Estado']?.select?.name || '';
      const contactos = s.properties?.['Contacto']?.relation || [];
      // Datos viejos: registros sin Tipo de registro cargado cuentan como Orden de trabajo normal
      // (nunca como Jornada/Relevamiento/Prueba, que exigen su propio tipo explícito más abajo).
      const esOrdenOSinTipo = !tipoReg || tipoReg.includes('Orden de trabajo');
      // Cualquier estado (agendado + completado) MENOS Cancelado, excluyendo papelera. El render muestra el estado.
      return esOrdenOSinTipo && !estado.includes('Cancelado') && !esArchivado(s) && contactos.some(r => r.id === contactId) && recEnPaisNotion(s);
    });
    // Fase B: las jornadas (📅 Jornada) del cliente, en CUALQUIER estado. El render (renderContactHistory)
    // las agrupa por "trabajo madre" (Orden madre) en un desplegable. Salen del mismo svcRes (search-fallback).
    const jornadas = (svcRes.results || []).filter(s => {
      const tipoReg = s.properties?.['Tipo de registro']?.select?.name || '';
      const contactos = s.properties?.['Contacto']?.relation || [];
      return tipoReg.includes('Jornada') && contactos.some(r => r.id === contactId) && recEnPaisNotion(s);
    });

    const items = [
      ...(propRes.results || []).map(r => ({ type: 'propuesta', data: r, date: r.properties?.['Fecha de creación']?.created_time || r.created_time || '' })),
      ...relevs.map(r => ({ type: 'relevamiento', data: r, date: r.properties?.['Fecha programada']?.date?.start || r.created_time || '' })),
      ...svcs.map(r => ({ type: 'servicio', data: r, date: r.properties?.['Fecha programada']?.date?.start || r.created_time || '' })),
      ...jornadas.map(r => ({ type: 'servicio', data: r, date: r.properties?.['Fecha programada']?.date?.start || r.created_time || '' })),
      ...(ingRes.results || []).map(r => ({ type: 'ingreso', data: r, date: r.properties?.['Fecha']?.date?.start || r.created_time || '' }))
    ];

    // Ordenar por fecha desc
    items.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    _contactHistoryCache[contactId] = items;
    renderContactHistory(items);
  } catch (e) {
    container.innerHTML = `<div class="history-empty">${t('contact.history.error')} ${esc(e.message)}</div>`;
  }
}

function renderContactHistory(items) {
  const container = document.getElementById('contact-history-container');
  if (!container) return;

  if (!items.length) {
    container.innerHTML = `<div class="history-empty">${t('contact.history.empty')}</div>`;
    return;
  }

  const dateLocale = currentLang === 'pt-BR' ? 'pt-BR' : 'es-UY';
  const fmtDate = (d) => d ? new Date(d.length === 10 ? d + 'T00:00:00' : d).toLocaleDateString(dateLocale, { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

  // Resumen financiero 360 del cliente (reusa lo que ya se cargó: ingresos + propuestas + servicios).
  let cobUSD = 0, cobUY = 0, presupUSD = 0;
  items.forEach(it => {
    if (it.type === 'ingreso') { const { moneda, monto } = montoOf(it.data.properties || {}, 'ingreso'); if (/UY/.test(moneda)) cobUY += monto || 0; else cobUSD += monto || 0; }
    else if (it.type === 'propuesta') { presupUSD += it.data.properties?.['Importe estimado']?.number || 0; }
  });
  const nServ = items.filter(it => it.type === 'servicio').length;
  // Conteo de COMPLETADOS aparte (auditoría 2026-07-09): desde que el historial incluye lo agendado,
  // la fila "Servicios completados" debe contar solo los completados, no todos los servicios.
  const nServCompl = items.filter(it => it.type === 'servicio' && /Completado/.test(it.data.properties?.['Estado']?.select?.name || '')).length;
  const propItems = items.filter(it => it.type === 'propuesta');
  const nProps = propItems.length;
  const nPropsAcc = propItems.filter(it => /Aceptada/.test(it.data.properties?.['Estado pipeline']?.select?.name || '')).length;
  const countHeader =
    `<div class="ec-saldo" style="margin-bottom:6px;font-size:13px">` +
      `<span>📄 ${nProps} ${t('sheet.contact.count.props')}${nPropsAcc ? ` (${nPropsAcc} ${t('sheet.contact.count.props.accepted')})` : ''}</span>` +
      `<span>🧰 ${nServ} ${t('sheet.contact.count.svcs')}</span>` +
    `</div>`;
  const cobStr = [cobUSD ? fmtMoneda(cobUSD, '🇺🇸 USD') : '', cobUY ? fmtMoneda(cobUY, '🇺🇾 UY$') : ''].filter(Boolean).join(' · ') || '—';
  // Contrato recurrente: si hay una propuesta 🔄 Recurrente con "Servicios por año" → esperado/año + comisión + neto.
  const contrato = items.find(it => it.type === 'propuesta'
    && /Recurrente/.test(it.data.properties?.['Tipo']?.select?.name || '')
    && (it.data.properties?.['Servicios por año']?.number));
  let contratoHTML = '';
  if (contrato) {
    const cp = contrato.data.properties || {};
    const sa = cp['Servicios por año'].number || 0;
    const imp = cp['Importe estimado']?.number || 0;
    const com = cp['Comisión %']?.number || 0;
    const comUSD = cobUSD * com / 100, comUY = cobUY * com / 100;
    const comStr = [comUSD ? fmtMoneda(comUSD, '🇺🇸 USD') : '', comUY ? fmtMoneda(comUY, '🇺🇾 UY$') : ''].filter(Boolean).join(' · ') || '—';
    const netoStr = [cobUSD ? fmtMoneda(cobUSD - comUSD, '🇺🇸 USD') : '', cobUY ? fmtMoneda(cobUY - comUY, '🇺🇾 UY$') : ''].filter(Boolean).join(' · ') || '—';
    contratoHTML =
      `<div class="ec-section-total"><span>📑 CONTRATO RECURRENTE</span><span></span></div>` +
      `<div class="ec-row" style="font-size:12px"><span>Esperado/año (${sa} × ${fmtMoneda(imp, '🇺🇸 USD')})</span><span>${fmtMoneda(sa * imp, '🇺🇸 USD')}</span></div>` +
      (com ? `<div class="ec-row" style="font-size:12px"><span>Comisión intermediario (${com}%)</span><span style="color:var(--red)">− ${comStr}</span></div>` +
             `<div class="ec-row" style="font-size:12px;font-weight:700"><span>Neto FlyClean</span><span style="color:var(--green)">${netoStr}</span></div>` : '');
  }
  const summaryHTML = countHeader +
    `<div class="ec-saldo" style="margin-bottom:6px;font-size:13px"><span>💵 Cobrado</span><span style="color:var(--green);font-weight:700">${cobStr}</span></div>` +
    (presupUSD ? `<div class="ec-row" style="font-size:12px;margin-bottom:4px"><span>📄 Presupuestado</span><span>${fmtMoneda(presupUSD, '🇺🇸 USD')}</span></div>` : '') +
    (nServCompl ? `<div class="ec-row" style="font-size:12px;margin-bottom:8px"><span>🛠️ Servicios completados</span><span>${nServCompl}</span></div>` : '') +
    contratoHTML;

  // Fase B: agrupar las jornadas (📅 Jornada) de un mismo trabajo por Orden madre → un desplegable.
  const esJornadaItem = (it) => it.type === 'servicio' && (it.data.properties?.['Tipo de registro']?.select?.name || '').includes('Jornada');
  const _jornadaGroups = {};
  items.forEach(it => { if (esJornadaItem(it)) { const root = jobRootId(it.data); (_jornadaGroups[root] = _jornadaGroups[root] || []).push(it); } });
  const _renderedJobRoots = new Set();

  container.innerHTML = summaryHTML + items.map(item => {
    const p = item.data.properties || {};
    const id = item.data.id;
    const fecha = fmtDate(item.date);

    if (item.type === 'propuesta') {
      const nombre = p['Nombre de propuesta']?.title?.[0]?.plain_text || t('common.sinnombre');
      const estado = p['Estado pipeline']?.select?.name || '—';
      const importe = p['Importe estimado']?.number;
      return `<div class="history-item" onclick="openHistoryItem('propuesta','${id}')">
        <div class="history-icon">🧾</div>
        <div class="history-content">
          <div class="history-title">${t('contact.history.propuesta')}: ${esc(nombre)}</div>
          <div class="history-meta">${estado}${importe ? ' · $' + importe.toLocaleString() : ''} · ${fecha}</div>
        </div>
      </div>`;
    }
    if (item.type === 'relevamiento') {
      const nombre = p['Nombre del servicio']?.title?.[0]?.plain_text || '—';
      const op = p['Operario App']?.select?.name || '—';
      return `<div class="history-item" onclick="openHistoryItem('servicio','${id}')">
        <div class="history-icon">🔍</div>
        <div class="history-content">
          <div class="history-title">${t('contact.history.relevamiento')}</div>
          <div class="history-meta">${esc(nombre)} · ${esc(op)} · ${fecha}</div>
        </div>
      </div>`;
    }
    if (esJornadaItem(item)) {
      const root = jobRootId(item.data);
      if (_renderedJobRoots.has(root)) return '';   // el grupo ya se dibujó en su fecha más reciente
      _renderedJobRoots.add(root);
      return renderJornadaGroup(_jornadaGroups[root] || [item], fmtDate);
    }
    if (item.type === 'servicio') {
      const nombre = p['Nombre del servicio']?.title?.[0]?.plain_text || '—';
      const tipo = tipoServicioStr(p);
      // Mostrar el estado (auditoría 2026-07-09): el historial ahora incluye lo agendado, no solo lo
      // completado → el ícono y el texto distinguen agendado (📅) / en curso (✈️) / completado (✅).
      const estado = p['Estado']?.select?.name || '';
      const icon = estado.includes('Completado') ? '✅' : (estado.includes('En curso') ? '✈️' : '📅');
      return `<div class="history-item" onclick="openHistoryItem('servicio','${id}')">
        <div class="history-icon">${icon}</div>
        <div class="history-content">
          <div class="history-title">${t('contact.history.servicio')}: ${esc(nombre)}</div>
          <div class="history-meta">${estado ? esc(estado) + ' · ' : ''}${tipo ? tipo + ' · ' : ''}${fecha}</div>
        </div>
      </div>`;
    }
    if (item.type === 'ingreso') {
      const { moneda, monto } = montoOf(p, 'ingreso');
      const detalle = p['Servicio']?.title?.[0]?.plain_text || p['Cliente']?.rich_text?.[0]?.plain_text || '—';
      return `<div class="history-item history-item-ingreso">
        <div class="history-icon">💰</div>
        <div class="history-content">
          <div class="history-title">${t('contact.history.ingreso')}: ${monto ? fmtMoneda(monto, moneda) : '—'}</div>
          <div class="history-meta">${detalle} · ${fecha}</div>
        </div>
      </div>`;
    }
    return '';
  }).join('');
}

// Fase B: dibuja un trabajo multi-día (grupo de jornadas) como una línea desplegable en el historial.
function renderJornadaGroup(group, fmtDate) {
  const sorted = group.slice().sort((a, b) => {
    const na = a.data.properties?.['Jornada N°']?.number, nb = b.data.properties?.['Jornada N°']?.number;
    if (typeof na === 'number' && typeof nb === 'number') return na - nb;
    return (a.date || '').localeCompare(b.date || '');
  });
  const pages = sorted.map(g => g.data);
  const p0 = pages[0]?.properties || {};
  const nombreBase = (p0['Nombre del servicio']?.title?.[0]?.plain_text || '—').replace(/—\s*Jornada\s*\d+\s*$/, '').trim();
  const n = sorted.length;
  const completo = pages.some(p => (p.properties?.['Estado']?.select?.name || '').includes('Completado') && p.properties?.['% de avance']?.number === 100);
  const maxPct = Math.max(0, ...pages.map(p => (typeof p.properties?.['% de avance']?.number === 'number' ? p.properties['% de avance'].number : 0)));
  const estadoStr = completo
    ? t('contact.history.trabajo.completo').replace('{p}', 100)
    : t('contact.history.trabajo.encurso').replace('{p}', Math.round(maxPct));
  const rows = sorted.map(g => {
    const pp = g.data.properties || {};
    const jn = pp['Jornada N°']?.number;
    const pct = pp['% de avance']?.number;
    const done = (pp['Estado']?.select?.name || '').includes('Completado');
    return `<div class="jornada-row" onclick="openHistoryItem('servicio','${esc(g.data.id)}')">J${jn != null ? jn : '?'} · ${fmtDate(g.date)}${typeof pct === 'number' ? ' · ' + Math.round(pct) + '%' : ''}${done ? ' ✅' : ''}</div>`;
  }).join('');
  return `<div class="jornada-group">
    <button type="button" class="photo-toggle" onclick="toggleJornadas(this, event)">
      <span>🛠️ ${esc(nombreBase)} · ${t('contact.history.trabajo.jornadas').replace('{n}', n)} — ${estadoStr}</span>
      <span class="photo-arrow">▾</span>
    </button>
    <div class="jornada-detail" style="display:none">${rows}</div>
  </div>`;
}

function toggleJornadas(btn, ev) {
  ev.stopPropagation(); ev.preventDefault();
  const d = btn.nextElementSibling;
  if (!d) return;
  const open = d.style.display === 'none';
  d.style.display = open ? 'block' : 'none';
  const ar = btn.querySelector('.photo-arrow');
  if (ar) ar.textContent = open ? '▴' : '▾';
}

async function openHistoryItem(type, id) {
  // Cerrar el sheet de contacto y abrir el del item correspondiente
  closeContactSheet();
  // Pequeño delay para evitar conflicto de overlays
  await new Promise(r => setTimeout(r, 250));
  if (type === 'propuesta') {
    // Asegurar que la propuesta esté cargada en _coordAllProps; si no, hacer fetch directo
    let prop = _coordAllProps?.find(p => p.id === id);
    if (!prop) {
      try {
        const data = await callNotion('pages/' + id, 'GET');
        if (!_coordAllProps) _coordAllProps = [];
        _coordAllProps.push(data);
      } catch (e) { console.warn('No se pudo cargar propuesta', e); return; }
    }
    if (typeof setCoordTab === 'function') setCoordTab('propuestas');
    setTimeout(() => openPropSheet(id), 300);
  } else if (type === 'servicio') {
    let svc = _coordAllServices?.find(s => s.id === id);
    if (!svc) {
      try {
        const data = await callNotion('pages/' + id, 'GET');
        if (!_coordAllServices) _coordAllServices = [];
        _coordAllServices.push(data);
      } catch (e) { console.warn('No se pudo cargar servicio', e); return; }
    }
    // Si es relevamiento, abrir tab relevamientos; si no, servicios
    const tipoReg = (_coordAllServices.find(s => s.id === id)?.properties?.['Tipo de registro']?.select?.name) || '';
    const targetTab = tipoReg.includes('Relevamiento') ? 'relevamientos' : 'servicios';
    if (typeof setCoordTab === 'function') setCoordTab(targetTab);
    setTimeout(() => openEditSheet(id), 300);
  }
}

async function renderCoordPropuestas() {
  // Ventas SÍ ve propuestas desde 2026-07-05 (ver+seguimiento): lista país-scopeada + "A contactar
  // hoy" + marcarPropContactada. Lo que NO puede: crear/editar/eliminar (guards en openPropSheet/
  // savePropEdit/deletePropuesta + backstop del proxy que solo le acepta PATCH de 'Última interacción').
  const content = document.getElementById('coord-content');
  content.innerHTML = '<div style="text-align:center;padding:40px 0"><div class="spinner" style="margin:0 auto"></div></div>';
  const myTab = 'propuestas';
  try {
    const cf = getCountryFilter();
    const andConditions = [
      { property: 'Estado pipeline', select: { does_not_equal: '❌ Rechazada' } },
      { property: 'Estado pipeline', select: { does_not_equal: '😶 Sin respuesta' } }
    ];
    if (cf) andConditions.push(cf);
    const notionFetch = () => callNotion(`databases/${PROPUESTAS_DB_ID}/query`, 'POST', {
      filter: { and: andConditions },
      sorts: [{ property: 'Última interacción', direction: 'descending' }]
    });
    // Fase 2: si el flag está prendido, leer propuestas de Supabase; si falla → fallback a Notion. Como /api/db trae
    // las propuestas país-filtradas pero sin el filtro de estado/orden, lo replicamos en cliente (igual que el query de Notion).
    let data;
    if (dbFlag('propuestas')) {
      try {
        const all = await callDb('propuestas');
        const excl = ['❌ Rechazada', '😶 Sin respuesta'];
        const paisVal = cf ? COUNTRY_NOTION_MAP[selectedCountry] : null;
        const results = (all.results || []).filter(p => {
          const estado = p.properties?.['Estado pipeline']?.select?.name || '';
          if (excl.includes(estado)) return false;
          if (paisVal && (p.properties?.['País']?.select?.name || '') !== paisVal) return false;
          return true;
        }).sort((a, b) => (b.properties?.['Última interacción']?.date?.start || '').localeCompare(a.properties?.['Última interacción']?.date?.start || ''));
        data = { results };
      } catch (e) { data = await notionFetch(); }
    } else {
      data = await notionFetch();
    }
    if (activeCoordTab !== myTab) return;
    _coordAllProps = data.results || [];
    renderCoordPropuestasList();
    refreshCoordFilterSheetIfOpen();
  } catch (e) {
    if (activeCoordTab !== myTab) return;
    content.innerHTML = `<div class="coord-empty">${t('coord.error.props')}<br><small>${esc(e.message)}</small></div>`;
  }
}

function renderCoordPropuestasList(keepLimit) {
  if (!keepLimit) _coordVisibleLimit = COORD_PAGE_SIZE;
  const content = document.getElementById('coord-content');
  // "📞 A contactar hoy" — se computa desde _coordAllProps (país-scoped, YA fetcheado) sin importar
  // los filtros de búsqueda/estado activos: es una lista de pendientes, no un resultado filtrado.
  const contactarHoyHTML = renderContactarHoyHTML();
  // Ventas no crea propuestas (el coord cotiza) → sin botón de alta.
  const nuevaPropBtnHTML = esVentas() ? '' :
    `<div style="padding:12px 16px 0"><button class="nueva-prop-btn" onclick="openNewPropSheet()">${t('coord.new.prop')}</button></div>`;
  if (!_coordAllProps.length) {
    _coordFilteredCount = 0; // review: sin propuestas, el botón del sheet debe decir 0 (no heredar otro count)
    content.innerHTML = contactarHoyHTML + nuevaPropBtnHTML +
      `<div class="coord-empty">${t('coord.empty.props')}</div>`;
    return;
  }
  const filteredAll = applyCoordFilters(_coordAllProps, { isProps: true });
  if (!filteredAll.length) {
    content.innerHTML = contactarHoyHTML + nuevaPropBtnHTML +
      `<div class="coord-empty">${getActiveFilterCount() ? '🔎 Sin propuestas para los filtros actuales' : t('coord.empty.props')}</div>`;
    return;
  }
  const total = filteredAll.length;
  const filtered = filteredAll.slice(0, _coordVisibleLimit);
  const remaining = total - filtered.length;
  const dateLocale = currentLang === 'pt-BR' ? 'pt-BR' : 'es-UY';
  const cards = filtered.map(p => {
    const props = p.properties || {};
    const nombreRaw = props['Nombre de propuesta']?.title?.[0]?.plain_text;
    let nombreHTML;
    if (nombreRaw) {
      nombreHTML = esc(nombreRaw);
    } else {
      const idShort = esc((p.id || '').slice(0, 8));
      nombreHTML = `<span style="color:#c67e25">⚠️ Propuesta sin nombre (${idShort})</span>`;
      console.warn('[fc] coord: propuesta sin nombre', p.id, 'properties keys:', Object.keys(props));
    }
    const estado = props['Estado pipeline']?.select?.name || '—';
    const pais = props['País']?.select?.name || '';
    const importe = props['Importe estimado']?.number;
    const dias = propDias(props);
    const ultimaInteraccion = (props['Última interacción']?.date?.start || '').split('T')[0];
    const ultimaFmt = ultimaInteraccion ? new Date(ultimaInteraccion + 'T00:00:00').toLocaleDateString(dateLocale, { day: 'numeric', month: 'short' }) : '';
    const estadoClass = estado.includes('Aceptada') ? 'aceptada' :
      estado.includes('Negociando') ? 'negociando' :
      estado.toLowerCase().includes('enviada') ? 'enviada' : '';
    // Propuesta CERRADA (ganada/perdida/muerta + estados legacy pre-limpieza): el contador "N días sin
    // respuesta" no aplica — el trato ya no espera respuesta de nadie. Mostrarlo asustaba ("¿qué estamos
    // haciendo mal?") en tratos GANADOS (caso Ava La Caleta, 2026-07-15). Solo se muestra la última
    // interacción como dato histórico, sin contador ni alarma.
    const propCerrada = PROP_ESTADOS_TERMINALES.includes(estado) || estado === '✅ Completado' || estado === 'Servicio Pendiente';
    // Badge recordatorio (auditoría 2026-07-09): propuesta Aceptada que todavía NO generó servicio.
    const aceptadaSinSvc = estado.includes('Aceptada') && !propTieneServicio(p.id, props); // espejo-safe (flip)
    // Snooze por registro: pospuesta hasta una fecha futura → badge para entender por qué no avisa.
    const _pospProp = (props['Posponer aviso hasta']?.date?.start || '').split('T')[0];
    const _hoyProp = new Date().toISOString().split('T')[0];
    const pospuestaBadge = (_pospProp && _pospProp > _hoyProp)
      ? `<div style="margin-top:5px;font-size:11px;font-weight:600;color:var(--text3)">⏸ ${t('coord.prop.pospuesta').replace('{f}', `${_pospProp.slice(8,10)}/${_pospProp.slice(5,7)}/${_pospProp.slice(0,4)}`)}</div>`
      : '';

    return `<div class="prop-card" style="cursor:pointer" onclick="openPropSheet('${esc(p.id)}')">
      <div class="prop-nombre">${nombreHTML}</div>
      <div class="prop-meta">
        <span class="prop-estado ${estadoClass}">${esc(estado)}</span>
        ${pais ? `<span class="coord-tag">${esc(pais)}</span>` : ''}
        ${importe ? `<span class="prop-importe">$${importe.toLocaleString()}</span>` : ''}
      </div>
      <div class="prop-dias ${!propCerrada && dias != null && dias > 14 ? 'alert' : ''}">
        ${ultimaFmt ? `${t('coord.prop.lastint.prefix')}${ultimaFmt}` : ''}${!propCerrada && dias != null ? ` · ${dias}${t('coord.prop.days.suffix')}` : ''}
      </div>
      ${pospuestaBadge}
      ${aceptadaSinSvc ? `<div style="margin-top:5px;font-size:11px;font-weight:700;color:var(--amber)">⚠️ ${t('coord.prop.falta.svc')}</div>` : ''}
    </div>`;
  }).join('');
  content.innerHTML = contactarHoyHTML + nuevaPropBtnHTML +
    '<div style="height:8px"></div>' + cards + renderCargarMasButton(remaining);
}

// Días sin respuesta de una propuesta — versión ESPEJO-safe (pre-flip propuestas Supabase-first 2026-07-15).
// Bajo el flip, la fórmula 'Días sin respuesta' del espejo queda CONGELADA (Notion no recalcula el raw
// espejado y cron-db-sync excluye las tablas flipeadas). 'Última interacción' SÍ está fresca (la escribe la
// app vía el espejo) → calcular desde ahí; fallback a la fórmula para propuestas sin 'Última interacción'.
// La fórmula de Notion cuenta desde 'Última interacción' (CLAUDE/spec dos-relojes) → mismo criterio.
function propDias(props) {
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
function renderContactarHoyHTML() {
  const ESPERANDO = ['📞 Contactado', '📤 Enviada al cliente', '🤝 Negociando'];
  const hoyISO = new Date().toISOString().split('T')[0];
  const items = (_coordAllProps || []).filter(p => {
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
function toggleContactarHoy(el) {
  const body = document.getElementById('contactar-hoy-body');
  if (!body) return;
  const abrir = body.style.display === 'none';
  body.style.display = abrir ? 'block' : 'none';
  const arrow = el.querySelector('.fin-arrow');
  if (arrow) arrow.textContent = abrir ? '▴' : '▾';
}
// Abre el desplegable (idempotente) — lo usa el deep-link de la alerta "para re-contactar".
function openContactarHoy() {
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
async function patchPropUltimaInteraccionHoy(id) {
  const today = new Date();
  const hoyISO = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  await callNotion('pages/' + id, 'PATCH', { properties: { 'Última interacción': { date: { start: hoyISO } } } });
  if (typeof syncAfterWrite === 'function') { try { syncAfterWrite(id, 'propuestas'); } catch (_) {} }
  const p = (_coordAllProps || []).find(x => x.id === id);
  if (p) {
    p.properties = p.properties || {};
    p.properties['Última interacción'] = { date: { start: hoyISO } };
    p.properties['Días sin respuesta'] = { formula: { number: 0 } };
  }
  return hoyISO;
}

async function marcarPropContactada(id) {
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

// Botón "📞 Recontacté hoy" del sheet de propuesta (2026-07-09): marca última interacción = hoy sin abrir el
// date-picker ni esperar a los 15 días. Reusa el mismo núcleo (memoria + mirror sincronizados). Actualiza el
// input de fecha visible + propEditState para que un Guardar posterior NO pise la fecha con el valor viejo.
async function recontacteHoyDesdeSheet(id, btn) {
  if (!btn || btn.disabled) return;
  const prev = btn.textContent;
  btn.disabled = true; btn.textContent = '⏳';
  try {
    const hoyISO = await patchPropUltimaInteraccionHoy(id);
    if (typeof propEditState !== 'undefined' && propEditState) propEditState.ultimaInt = hoyISO;
    const inp = document.getElementById('prop-ultimaint-input');
    if (inp) inp.value = hoyISO;
    btn.textContent = '✓ ' + t('sheet.prop.recontacte.ok');
  } catch (e) {
    btn.disabled = false; btn.textContent = prev;
    alert(t('sheet.alert.save.error2') + e.message);
  }
}

// ── WhatsApp manual asistido (C-Fase 1 del plan comercial 2026-07-05) ──────
// Primer wa.me de la app: el HUMANO manda el mensaje con un toque (el bot automático es fase 2).
// telToWa normaliza 'Teléfono / WhatsApp' (formatos mixtos) a dígitos wa.me: respeta +CC explícito;
// si es local, antepone el código del país del cliente (default UY 598) y saca el 0 inicial (09x→9x).
function telToWa(tel, pais) {
  let d = String(tel || '').trim();
  if (!d) return null;
  const conPlus = d.startsWith('+');
  d = d.replace(/\D/g, '');
  if (!d) return null;
  if (conPlus) return d;
  d = d.replace(/^00/, '');
  const p = String(pais || '');
  const cc = p.includes('Brasil') ? '55' : p.includes('Panamá') ? '507' : p.includes('Guatemala') ? '502' : p.includes('México') ? '52' : '598';
  if (d.startsWith(cc)) return d;
  if (d.startsWith('0')) d = d.replace(/^0+/, '');
  return cc + d;
}
function abrirWhatsApp(tel, pais, msg) {
  const wa = telToWa(tel, pais);
  if (!wa) { alert(t('wa.sin.tel')); return false; }
  window.open('https://wa.me/' + wa + (msg ? '?text=' + encodeURIComponent(msg) : ''), '_blank', 'noopener');
  return true;
}
// Desde una propuesta ("A contactar hoy" o el sheet): resuelve el teléfono vía la relación Contacto
// (1 fetch por contacto, cacheado en memoria). Para Ventas el backstop del proxy permite el GET
// (pages/{id} de un contacto). El saludo usa el Interlocutor de la ficha si existe.
const _waContactCache = {};
async function abrirWhatsAppProp(propId) {
  const p = (_coordAllProps || []).find(x => x.id === propId) || (editingProp && editingProp.id === propId ? editingProp : null);
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
// Desde la card de prospecto (tab Prospección): el teléfono está en la propia ficha.
function abrirWhatsAppProspecto(id) {
  const c = (_coordAllProspectos || []).find(x => x.id === id);
  if (!c) return;
  const props = c.properties || {};
  const tel = props['Teléfono / WhatsApp']?.phone_number || '';
  const pais = props['País']?.select?.name || '';
  const persona = props['Contacto (persona)']?.rich_text?.[0]?.plain_text || '';
  const msg = cfgWa('prospecto').replace('{n}', persona ? ' ' + persona : '');
  abrirWhatsApp(tel, pais, msg);
}

// ─────────────────────────────────────────────
// ALERTS
// ─────────────────────────────────────────────
// Alertas informativas (sin onclick, ej. Documentos & Certificados) se pueden descartar con
// una × — se persiste en localStorage por dismissKey. Las críticas (≤7 días / vencido) SIEMPRE
// se muestran igual, aunque estén descartadas, para no esconder algo urgente.
const _alertsByContainer = {};

function _alertsDismissedSet() {
  try { return new Set(JSON.parse(localStorage.getItem('fc_alertsDismissed') || '[]')); }
  catch (e) { return new Set(); }
}
function isAlertDismissed(key) {
  return _alertsDismissedSet().has(key);
}
function dismissAlertKey(key) {
  const set = _alertsDismissedSet();
  set.add(key);
  try { localStorage.setItem('fc_alertsDismissed', JSON.stringify(Array.from(set))); } catch (e) {}
}
function dismissAlert(containerId, key) {
  // Preservar si la lista estaba abierta: renderAlertsBanner reconstruye el banner con la
  // lista colapsada, así que sin esto tocar la × cerraba TODA la lista (regresión v114).
  const prevList = document.getElementById(containerId + '_list');
  const estabaAbierta = prevList && prevList.style.display !== 'none';
  dismissAlertKey(key);
  renderAlertsBanner(containerId, _alertsByContainer[containerId] || []);
  if (estabaAbierta) {
    const list = document.getElementById(containerId + '_list');
    const toggle = document.getElementById(containerId + '_list_toggle');
    if (list) list.style.display = 'block';
    if (toggle) toggle.textContent = t('alerts.close');
  }
}

function renderAlertsBanner(containerId, alerts) {
  const el = document.getElementById(containerId);
  if (!el) return;
  _alertsByContainer[containerId] = alerts;
  const visible = alerts.filter(a => !(a.dismissKey && isAlertDismissed(a.dismissKey) && a.level !== 'critical'));
  if (!visible.length) { el.innerHTML = ''; return; }
  const hasCritical = visible.some(a => a.level === 'critical');
  const id = containerId + '_list';
  const labelAlertas = visible.length > 1 ? t('alerts.alertas') : t('alerts.alerta');
  const labelActivas = visible.length > 1 ? t('alerts.activas') : t('alerts.activa');
  el.innerHTML =
    '<div class="alerts-banner">' +
      '<div class="alerts-header ' + (hasCritical ? 'critical' : '') + '" onclick="toggleAlertsList(\'' + id + '\', this)">' +
        '<div class="alerts-header-left">' +
          (hasCritical ? '🔴' : '⚠️') + ' ' + visible.length + ' ' + labelAlertas + ' ' + labelActivas +
        '</div>' +
        '<span class="alerts-toggle" id="' + id + '_toggle">' + t('alerts.see') + '</span>' +
      '</div>' +
      '<div class="alerts-list ' + (hasCritical ? 'critical' : '') + '" id="' + id + '" style="display:none">' +
        visible.map(a =>
          '<div class="alert-item"' + (a.onclick ? ' style="cursor:pointer" onclick="' + a.onclick.replace(/"/g, '&quot;') + '"' : '') + '><div class="alert-icon">' + a.icon + '</div><div>' + a.message + (a.onclick ? ' <span style="opacity:0.6">›</span>' : '') + '</div>' +
          (a.dismissKey ? '<span class="alert-dismiss" onclick="event.stopPropagation(); dismissAlert(\'' + containerId + '\',\'' + esc(a.dismissKey) + '\')">×</span>' : '') +
          '</div>'
        ).join('') +
      '</div>' +
    '</div>';
}

function toggleAlertsList(id, header) {
  const list = document.getElementById(id);
  const toggle = document.getElementById(id + '_toggle');
  if (!list) return;
  const open = list.style.display === 'none';
  list.style.display = open ? 'block' : 'none';
  if (toggle) toggle.textContent = open ? t('alerts.close') : t('alerts.see');
}

async function loadAlerts(role, bannerId) {
  if (!currentUser) { const el = document.getElementById(bannerId); if (el) el.innerHTML = ''; return; }
  // Ventas (apertura 2026-07-05): banner reducido — ve SOLO la alerta "propuestas para re-contactar"
  // (su trabajo de seguimiento). Equipos se saltea abajo con esVentasRol; el resto de bloques
  // (servicios/mantenimiento clientes/compras/documentos) ya excluyen a Ventas vía isCoord/isCEO.
  const esVentasRol = esVentas();
  const alerts = [];
  const today = new Date().toISOString().split('T')[0];
  const warnDate = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
  const isCoord = role === '🔧 Coordinador' || role === '🎯 Dirección';
  const isCEO = role === '👔 CEO';
  const isOperario = !isCoord && !isCEO;

  // Country filter for Activos — usa el mapa GLOBAL de 5 países (review v167: el local de 3 dejaba
  // a GT/MX viendo activos de todos los países y el conteo de la alerta no coincidía con la tab).
  const financeCountryMap = COUNTRY_FINANCE_MAP;
  const userCountry = currentUser.country;
  const actCountryVal = financeCountryMap[userCountry];
  const actFilter = actCountryVal ? { property: 'País', select: { equals: actCountryVal } } : null;

  // La alerta DGI hardcodeada se reemplazó por la query real a la base
  // 📑 Documentos & Certificados (más abajo, dentro del try).

  try {
    // Equipment maintenance alerts (all roles menos Ventas — no gestiona equipos)
    // v167: se traen TODOS los activos del país (sin filtro de fecha server) y se computan las DOS
    // alertas client-side: mantenimiento próximo/vencido + equipos SIN CHECK mensual. Cambio consciente:
    // "En reparación"/"En mantenimiento" ahora alertan SIEMPRE (antes solo si además tenían fecha próxima).
    const actData = esVentasRol ? { results: [] } : await callNotion(`databases/${ACTIVOS_DB_ID}/query`, 'POST', {
      ...(actFilter ? { filter: actFilter } : {})
    });
    let sinCheckN = 0;
    (actData.results || []).forEach(r => {
      const nombre = r.properties?.['Activo']?.title?.[0]?.plain_text || 'Equipo';
      const fecha = r.properties?.['Próximo mantenimiento']?.date?.start || '';
      const estado = r.properties?.['Estado']?.select?.name || '';
      // Check mensual: equipos activos sin check en 30 días (o nunca) — se agrupa en UNA alerta abajo.
      if (!estado.includes('Fuera de servicio')) {
        const uc = r.properties?.['Último check']?.date?.start || '';
        const dias = uc ? Math.floor((Date.now() - new Date(uc + (uc.length === 10 ? 'T00:00:00' : '')).getTime()) / 86400000) : null;
        if (dias == null || dias > 30) sinCheckN++;
      }
      if (estado === '🚨 En reparación') {
        alerts.push({ level: 'critical', icon: '🔴', message: nombre + ' — en reparación' });
      } else if (estado === '🔧 En mantenimiento') {
        alerts.push({ level: 'warn', icon: '🔧', message: nombre + ' — en mantenimiento' });
      } else if (fecha && fecha <= today) {
        alerts.push({ level: 'critical', icon: '🔴', message: nombre + ' — mantenimiento vencido desde ' + fecha });
      } else if (fecha && fecha <= warnDate) {
        const days = Math.round((new Date(fecha) - new Date()) / 86400000);
        alerts.push({ level: 'warn', icon: '⚠️', message: nombre + ' — mantenimiento en ' + days + ' días (' + fecha + ')' });
      }
      // Equipos v2 — problema reportado por el piloto (evento 'problema' abierto en el historial): avisa a
      // quien gestiona la flota (coord/CEO). esc() en el texto libre del piloto (defensa; el input ya rechaza <>).
      if ((isCoord || isCEO) && !estado.includes('Fuera de servicio')) {
        const prob = eqProblemaAbierto(r.properties || {});
        if (prob) {
          const clickable = (role.includes('Coordinador') || role.includes('Dirección'));
          alerts.push({ level: 'warn', icon: '⚠️', message: esc(nombre) + ' — ' + esc(prob.n || '') + ' · ' + t('eq.prob.byPiloto'),
            ...(clickable ? { onclick: "setCoordTab('equipos')" } : {}) });
        }
      }
    });
    if (sinCheckN > 0 && (isCoord || isCEO)) {
      // Tocable solo donde existe la tab (pantalla del coordinador; Dirección también la tiene).
      const clickable = (role.includes('Coordinador') || role.includes('Dirección'));
      alerts.push({ level: 'warn', icon: '🔧', message: t('eq.alert.sincheck').replace('{n}', sinCheckN),
        ...(clickable ? { onclick: "setCoordTab('equipos')" } : {}) });
    }

    // Equipos v2 — reporte SEMANAL del RESPONSABLE (operario/piloto): de viernes a domingo, si algún equipo
    // suyo no tiene reporte/check esta semana (desde el lunes), alerta tocable que abre "🔧 Mis equipos".
    if (isOperario && !esVentasRol) {
      const dow = new Date().getDay(); // 5=vie · 6=sáb · 0=dom
      if (dow === 5 || dow === 6 || dow === 0) {
        const lunes = new Date(Date.now() - ((new Date().getDay() + 6) % 7) * 86400000).toISOString().split('T')[0];
        const pendRep = (actData.results || []).filter(r => {
          const p = r.properties || {};
          if ((p['Responsable App']?.select?.name || '') !== (currentUser?.name || '')) return false;
          if ((p['Estado']?.select?.name || '').includes('Fuera de servicio')) return false;
          const uc = (p['Último check']?.date?.start || '').slice(0, 10);
          return !uc || uc < lunes;
        }).length;
        if (pendRep) alerts.push({ level: 'warn', icon: '🔧', message: t('miseq.alert').replace('{n}', pendRep), onclick: 'openMisEquipos()' });
      }
    }

    // Servicios pendientes por gestionar: en Pendiente/Asignado que les falta fecha U operario (coord + CEO).
    // OJO: el proxy descarta el filtro server-side de la base Servicios (multi-data-source) → hay que
    // re-filtrar SIEMPRE en el cliente (antes solo se filtraba por país → contaba TODOS los servicios).
    if (isCoord || isCEO) {
      const cf = isCoord ? getCountryFilter() : getCEOFilter();
      const svcData = await callNotion(`databases/${DB_ID}/query`, 'POST',
        { filter: { and: [ ...(cf ? [cf] : []), { property: 'Estado', select: { equals: '📋 Pendiente' } } ] } });
      const notionVal = COUNTRY_NOTION_MAP[isCoord ? selectedCountry : ceoViewCountry === 'all' ? null : ceoViewCountry];
      const EST_GESTION = ['📋 Pendiente', '🔄 Asignado'];
      const pend = (svcData.results || []).filter(s => {
        const est = s.properties?.['Estado']?.select?.name || '';
        if (!EST_GESTION.includes(est)) return false;            // excluye completados/cancelados/plantillas
        if (notionVal && s.properties?.['País']?.select?.name !== notionVal) return false;
        const sinOp = !s.properties?.['Operario App']?.select?.name;
        const sinFecha = !s.properties?.['Fecha programada']?.date?.start;
        return sinOp || sinFecha;                                 // "por gestionar" = le falta algo
      });
      if (pend.length) {
        const gestAlert = { level: 'warn', icon: '📋',
          message: pend.length + ' servicio' + (pend.length > 1 ? 's' : '') + ' pendiente' + (pend.length > 1 ? 's' : '') + ' por gestionar (falta fecha u operario)' };
        // Deep-link (auditoría 2026-07-09): tocar la alerta lleva a la lista de Servicios para gestionarlos.
        if (bannerId === 'alerts-banner-coord') gestAlert.onclick = "setCoordTab('servicios')";
        else if (bannerId === 'alerts-banner-ceo') gestAlert.onclick = "setCEOTab('servicios')";
        alerts.push(gestAlert);
      }

    }

    // Pipeline: propuestas para re-contactar (esperando respuesta del cliente, +15 días) — coord + CEO
    // + Ventas (2026-07-05: es SU alerta de trabajo; getCountryFilter la scopea a su país).
    if (isCoord || isCEO || esVentasRol) {
      const cf = isCEO ? getCEOFilter() : getCountryFilter();
      // Mismos estados "esperando respuesta" que usa el cron diario (api/cron-pipeline.js).
      const ESPERANDO = ['📞 Contactado', '📤 Enviada al cliente', '🤝 Negociando'];
      const propFilter = { and: [
        ...(cf ? [cf] : []),
        { or: ESPERANDO.map(s => ({ property: 'Estado pipeline', select: { equals: s } })) }
      ]};
      const propData = await callNotion(`databases/${PROPUESTAS_DB_ID}/query`, 'POST', { filter: propFilter });
      const hoyISOProp = new Date().toISOString().split('T')[0];
      const vencidas = (propData.results || []).filter(r => {
        const dias = r.properties?.['Días sin respuesta']?.formula?.number;
        // Snooze por registro (mismo criterio que "A contactar hoy" y el cron): pospuesta = no cuenta.
        const posp = (r.properties?.['Posponer aviso hasta']?.date?.start || '').split('T')[0];
        if (posp && posp > hoyISOProp) return false;
        return dias != null && dias >= cfgRegla('pipelineAviso');
      });
      if (vencidas.length) {
        const max = Math.max(...vencidas.map(r => r.properties?.['Días sin respuesta']?.formula?.number || 0));
        const propAlert = { level: max >= 45 ? 'critical' : 'warn', icon: '📞', message: vencidas.length + ' propuesta' + (vencidas.length > 1 ? 's' : '') + ' para re-contactar (máx ' + max + ' días sin respuesta)' };
        // Tocable SOLO en el banner del coord: lleva a la tab Propuestas y scrollea al bloque
        // "📞 A contactar hoy" (id coord-contactar-block). En CEO/operario queda informativa (sin acción).
        if (bannerId === 'alerts-banner-coord') {
          propAlert.onclick = "setCoordTab('propuestas'); setTimeout(function(){ if (typeof openContactarHoy === 'function') openContactarHoy(); var el = document.getElementById('coord-contactar-block'); if (el) el.scrollIntoView({behavior:'smooth'}); }, 600)";
        }
        alerts.push(propAlert);
      }
    }

    // Clientes para ofrecer mantenimiento (9+ meses sin trabajo, spec 2026-07-02) — coord + CEO + Ventas.
    // Reusa el mismo cruce clientes×propuestas×servicios de la tab Clientes (computeClienteSecciones);
    // fetch propio (no depende de que la tab Clientes ya haya cargado _coordAllContacts). Ventas la ve
    // (2026-07-06): es su lista de clientes para recontactar (país-scoped, deep-link a la tab Clientes).
    if (isCoord || isCEO || esVentasRol) {
      // Try/catch propio: es una alerta informativa, nunca debe tumbar las que vienen después
      // (Solicitud de compras, Documentos) si algo de este cruce falla.
      try {
        const { propuestas, servicios } = await fetchPropsYSvcsParaSecciones();
        if (propuestas && servicios) {
          const notionQuery = () => callNotion(`databases/${CONTACTOS_DB_ID}/query`, 'POST', {});
          let contactos;
          try { contactos = (await callDb('clientes')).results || []; } catch (e) { contactos = (await notionQuery()).results || []; }
          contactos = (contactos || []).filter(c => !esArchivado(c));
          const secciones = computeClienteSecciones(contactos, propuestas, servicios);
          if (secciones && secciones.mantenimiento.length) {
            const cf = isCEO ? getCEOFilter() : getCountryFilter();
            const notionVal = cf?.select?.equals || null;
            const mant = notionVal ? secciones.mantenimiento.filter(c => (c.properties?.['País']?.select?.name || '') === notionVal) : secciones.mantenimiento;
            if (mant.length) {
              const mantAlert = { level: 'warn', icon: '🔁', message: mant.length + ' cliente' + (mant.length > 1 ? 's' : '') + ' para ofrecer mantenimiento (9+ meses del último trabajo)' };
              // Tocable SOLO en el banner del coord: lleva a la tab Clientes y scrollea al bloque
              // "🔁 Mantenimiento" (id clientes-mantenimiento-block). En CEO queda informativa (sin acción).
              if (bannerId === 'alerts-banner-coord') {
                mantAlert.onclick = "setCoordTab('contactos'); setTimeout(function(){ var el = document.getElementById('clientes-mantenimiento-block'); if (el) el.scrollIntoView({behavior:'smooth'}); }, 600)";
              }
              alerts.push(mantAlert);
            }
          }
        }
      } catch (e) { /* alerta no crítica — fail silently */ }
    }

    // Solicitud de compras: pedidos pendientes del país del coord (coord only)
    if (isCoord) {
      const pedData = await callNotion(`databases/${SOLICITUDES_DB_ID}/query`, 'POST', { page_size: 100 });
      let pedidos = (pedData.results || []).filter(r => (r.properties?.['Estado']?.select?.name || '').includes('Pendiente'));
      const isGlobal = currentUser?.role?.includes('Dirección');
      if (!isGlobal) {
        const paisUser = pedidoPaisDelUser();
        pedidos = pedidos.filter(r => (r.properties?.['País']?.select?.name || '') === paisUser);
      }
      if (pedidos.length) {
        const urgentes = pedidos.filter(r => (r.properties?.['Prioridad']?.select?.name || '').includes('Urgente')).length;
        let msg = pedidos.length + ' pedido' + (pedidos.length > 1 ? 's' : '') + ' pendiente' + (pedidos.length > 1 ? 's' : '');
        if (urgentes) msg += ' (' + urgentes + ' urgente' + (urgentes > 1 ? 's' : '') + ')';
        alerts.push({ level: urgentes ? 'critical' : 'warn', icon: '📦', message: msg, onclick: "setCoordTab('pedidos')" });
      }
    }

    // Documentos & Certificados por vencer (coord + CEO) — base 📑 Documentos & Certificados.
    // Cada documento define su antelación en "Días de aviso" (ej. DGI 60, BPS 15). El histórico no avisa.
    if (isCoord || isCEO) {
      const docData = await callNotion(`databases/${DOCUMENTOS_DB_ID}/query`, 'POST', { page_size: 100 });
      const isGlobalDoc = role === '🎯 Dirección';
      const paisDoc = financeCountryMap[userCountry]; // '🇺🇾 UY' / '🇧🇷 BR' / '🇵🇦 PA'
      (docData.results || []).forEach(r => {
        const p = r.properties || {};
        const estado = p['Estado']?.select?.name || '';
        // Solo documentos activos: vigentes / por vencer / vencidos sin reemplazar. El histórico se ignora.
        if (!(estado.includes('Vigente') || estado.includes('Por vencer') || estado.includes('Vencido'))) return;
        if (!isGlobalDoc && paisDoc) {
          const pais = p['País']?.select?.name || '';
          if (pais && pais !== paisDoc) return;
        }
        const vence = p['Vence']?.date?.start || '';
        if (!vence) return;
        const aviso = p['Días de aviso']?.number;
        const umbral = (aviso != null) ? aviso : 30;
        const daysLeft = Math.round((new Date(vence) - new Date()) / 86400000);
        if (daysLeft > umbral) return; // todavía dentro de su ventana sana
        const nombre = p['Documento']?.title?.[0]?.plain_text || 'Documento';
        const dismissKey = 'doc:' + r.id + ':' + vence;
        if (daysLeft < 0) {
          alerts.push({ level: 'critical', icon: '🔴', message: nombre + ' VENCIDO (venció ' + vence + ')', dismissKey });
        } else {
          alerts.push({ level: daysLeft <= 7 ? 'critical' : 'warn', icon: '📑', message: nombre + ' vence en ' + daysLeft + ' día' + (daysLeft === 1 ? '' : 's') + ' (' + vence + ')', dismissKey });
        }
      });
    }
  } catch (e) {
    // Fail silently — alerts are non-critical
  }

  renderAlertsBanner(bannerId, alerts);
}

// ─────────────────────────────────────────────
// COMUNICACIONES (placeholder)
// ─────────────────────────────────────────────
function renderComunicaciones() {
  if (esVentas()) return; // blindaje: Ventas no ve Mensajes, ni por un llamado directo
  const isCEO = currentUser?.role === '👔 CEO' || currentUser?.role === '🎯 Dirección';
  const content = document.getElementById(isCEO ? 'ceo-content' : 'coord-content');
  if (!content) return;
  content.innerHTML =
    '<div class="comms-placeholder">' +
      '<div class="comms-icon">💬</div>' +
      '<div class="comms-title">' + t('comms.title') + '</div>' +
      '<div class="comms-sub">' + t('comms.sub') + '</div>' +
      '<div class="comms-badge">' + t('comms.badge') + '</div>' +
      '<div class="comms-features">' +
        '<div class="comms-feature"><div class="comms-feature-icon">📣</div><div><div class="comms-feature-title">' + t('comms.f1.title') + '</div><div class="comms-feature-text">' + t('comms.f1.text') + '</div></div></div>' +
        '<div class="comms-feature"><div class="comms-feature-icon">📊</div><div><div class="comms-feature-title">' + t('comms.f2.title') + '</div><div class="comms-feature-text">' + t('comms.f2.text') + '</div></div></div>' +
        '<div class="comms-feature"><div class="comms-feature-icon">🏢</div><div><div class="comms-feature-title">' + t('comms.f3.title') + '</div><div class="comms-feature-text">' + t('comms.f3.text') + '</div></div></div>' +
      '</div>' +
    '</div>';
}

// ─────────────────────────────────────────────
// CAMBIO DE PIN
// ─────────────────────────────────────────────
function openPinChange() {
  document.getElementById('pin-current').value = '';
  document.getElementById('pin-new1').value = '';
  document.getElementById('pin-new2').value = '';
  document.getElementById('pin-change-error').textContent = '';
  document.getElementById('pin-change-overlay').classList.add('open');
  setTimeout(() => document.getElementById('pin-current').focus(), 100);
}

function closePinChange() {
  document.getElementById('pin-change-overlay').classList.remove('open');
}

function pinChangeOverlayClick(e) {
  if (e.target.id === 'pin-change-overlay') closePinChange();
}

// Valida el PIN. Si el usuario lo cambió en este dispositivo, usa el override local (fc_pin_<id>);
// si no, lo valida contra el servidor (/api/verify-pin) — los PINs base ya NO viven en el código
// del cliente (auditoría #2).
async function verifyPin(userId, pin) {
  // Auth #1/#3: SIEMPRE valida en el servidor. Se sacó el override de localStorage (era bypasseable
  // por consola y no entregaba token). En PIN correcto, guarda el token de sesión que el proxy exige.
  try {
    const r = await fetch('/api/verify-pin', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: userId, pin }),
    });
    const j = await r.json().catch(() => ({}));
    if (j && j.ok === true) {
      if (j.token) { try { localStorage.setItem('fc_token', j.token); } catch (_) {} }
      return true;
    }
    return false;
  } catch (e) { console.warn('[login] /api/verify-pin falló:', e); return false; }
}

async function saveNewPin() {
  if (!currentUser) { closePinChange(); return; }
  const errEl = document.getElementById('pin-change-error');
  if (!errEl) return;
  const current = document.getElementById('pin-current')?.value?.trim() || '';
  const new1    = document.getElementById('pin-new1')?.value?.trim() || '';
  const new2    = document.getElementById('pin-new2')?.value?.trim() || '';

  if (!/^(\d{4}|\d{6})$/.test(new1)) { errEl.textContent = t('pinchange.error.format'); return; }
  if (new1 !== new2) { errEl.textContent = t('pinchange.error.match'); return; }
  if (new1 === current) { errEl.textContent = t('pinchange.error.same'); return; }

  // Cambio SEGURO server-side: exige la sesión (token) + el PIN actual. El nuevo se guarda hasheado en KV.
  try {
    const r = await fetch('/api/set-pin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + (localStorage.getItem('fc_token') || '') },
      body: JSON.stringify({ currentPin: current, newPin: new1 }),
    });
    if (r.status === 401) { forceRelogin(); return; }
    const j = await r.json().catch(() => ({}));
    if (!j.ok) { errEl.textContent = j.error || t('pinchange.error.current'); return; }
  } catch (e) { errEl.textContent = t('pinchange.error.conn') || 'Error de conexión'; return; }

  errEl.style.color = 'var(--green)';
  errEl.textContent = t('pinchange.success');
  setTimeout(closePinChange, 1200);
  setTimeout(() => { errEl.style.color = 'var(--red)'; errEl.textContent = ''; }, 1500);
}

// ─────────────────────────────────────────────
// MENÚ DE CUENTA (⋯) + CONFIGURACIÓN (admin)
// El chip de usuario de todos los headers abre este menú (antes hacía logout DIRECTO — peligroso).
// Salir y cambiar región SIEMPRE piden confirmación. ⚙️ Configuración se muestra solo a isAppAdmin()
// (cosmético: el server re-valida cada acción contra ADMIN_IDS — la seguridad NUNCA depende del front).
// ─────────────────────────────────────────────
const PAIS_FLAG = { 'Uruguay': '🇺🇾', 'Brasil': '🇧🇷', 'Panamá': '🇵🇦', 'Guatemala': '🇬🇹', 'México': '🇲🇽' };

function openAccountMenu() {
  if (!currentUser) return;
  document.getElementById('am-avatar').textContent = currentUser.emoji || '👤';
  document.getElementById('am-name').textContent = currentUser.name || '';
  document.getElementById('am-role').textContent = translateRole(currentUser.role || '');
  const pais = currentUser.country || selectedCountry || '';
  document.getElementById('am-country').textContent = ((PAIS_FLAG[pais] || '🌎') + ' FlyClean ' + pais).trim();
  document.getElementById('am-version').textContent = 'v' + APP_VERSION;
  document.getElementById('am-row-config').style.display = isAppAdmin() ? 'flex' : 'none';
  // Mi historial: solo roles de CAMPO (los que suman jornales). Ventas/CEO/Finanzas no operan.
  const rowHist = document.getElementById('am-row-hist');
  if (rowHist) rowHist.style.display = /Operario|Coordinador|Dirección/.test(currentUser.role || '') ? 'flex' : 'none';
  // Mis equipos (reporte semanal): solo el OPERARIO — el coordinador ya tiene la tab 🔧 Equipos completa.
  const rowMisEq = document.getElementById('am-row-miseq');
  if (rowMisEq) rowMisEq.style.display = /Operario/.test(currentUser.role || '') ? 'flex' : 'none';
  _amRefreshLang();
  document.getElementById('account-menu-overlay').classList.add('open');
  markUserActive();
}
function closeAccountMenu() { document.getElementById('account-menu-overlay').classList.remove('open'); }
function accountMenuOverlayClick(e) { if (e.target.id === 'account-menu-overlay') closeAccountMenu(); }

// Idioma: misma regla que el toggle del login — solo Brasil alterna es/pt (la persistencia es fc_lang_Brasil).
function _amRefreshLang() {
  const esBrasil = (currentUser?.country || selectedCountry) === 'Brasil';
  const val = document.getElementById('am-lang-val');
  if (val) val.textContent = (currentLang === 'pt-BR') ? 'Português (BR)' : 'Español';
  const row = document.getElementById('am-row-lang');
  if (row) row.style.opacity = esBrasil ? '1' : '0.5';
  const chev = document.getElementById('am-lang-chev');
  if (chev) chev.style.visibility = esBrasil ? 'visible' : 'hidden';
}
function amLang() {
  if ((currentUser?.country || selectedCountry) !== 'Brasil') return;
  setLang(currentLang === 'es' ? 'pt-BR' : 'es');
  _amRefreshLang();
}
function amPin() { closeAccountMenu(); openPinChange(); }
function amRegion() {
  if (!confirm(t('am.confirm.region'))) return;
  closeAccountMenu();
  backToCountry();
}
function amUpdate() {
  closeAccountMenu();
  try { navigator.serviceWorker?.getRegistration?.().then(r => { try { r && r.update(); } catch (_) {} }); } catch (_) {}
  setTimeout(() => { try { (window.__flycleanReload || (() => location.reload()))(); } catch (_) { location.reload(); } }, 200);
}
function amLogout() {
  if (!confirm(t('am.confirm.logout'))) return;
  closeAccountMenu();
  logout();
}
function amConfig() {
  if (!isAppAdmin()) return;
  closeAccountMenu();
  openConfigSheet();
}
function amHelp() { closeAccountMenu(); openHelpSheet(); }

// Manuales publicados (PDF servidos estáticos desde el repo). Hoy solo Ventas; operario/coord están en
// preparación → la hoja de ayuda muestra solo los que EXISTEN (nada de links rotos). `roles` = a qué roles
// les aparece destacado por ser el suyo (igual todos pueden abrir cualquiera).
const MANUALES = [
  { file: '/docs/manuales/Manual_Operario_v3.pdf', label: 'Manual del Operario', roles: ['Operario'] },
  { file: '/docs/manuales/Manual_Coordinador_v3.pdf', label: 'Manual del Coordinador', roles: ['Coordinador'] },
  { file: '/docs/manuales/Manual_CEO_v1.pdf', label: 'Manual del CEO / Dirección', roles: ['CEO', 'Dirección'] },
  { file: '/docs/manuales/Manual_Finanzas_v1.pdf', label: 'Manual de Finanzas', roles: ['Administración'] },
  { file: '/docs/manuales/Manual_Ventas_v3.pdf', label: 'Manual de Ventas y Prospección', roles: ['Ventas'] },
];
function openHelpSheet() {
  const body = document.getElementById('help-body');
  const rol = currentUser?.role || '';
  const mine = (m) => m.roles.some(r => rol.includes(r));
  // Cada rol ve SOLO su manual (pedido de Diego). Fallback defensivo: si un rol no tuviera manual asignado,
  // se muestran todos para que nadie quede sin ayuda.
  let items = MANUALES.filter(mine);
  if (!items.length) items = MANUALES.slice();
  body.innerHTML = items.map(m =>
    '<div class="am-row" style="border:1px solid var(--border2);border-radius:12px;margin-bottom:8px" onclick="window.open(\'' + m.file + '\',\'_blank\')">' +
    '<span class="am-ic">📄</span><span class="am-lbl">' + esc(m.label) + '</span><span class="am-chev">↗</span></div>'
  ).join('');
  document.getElementById('help-version').textContent = 'FlyClean v' + APP_VERSION;
  document.getElementById('help-overlay').classList.add('open');
}
function closeHelpSheet() { document.getElementById('help-overlay').classList.remove('open'); }
function helpOverlayClick(e) { if (e.target.id === 'help-overlay') closeHelpSheet(); }

// ── 🤖 ASISTENTE IA — movido a src/ayuda-bot.js el 16/07. main.js le inyecta sus 2 dependencias:
// quién es el usuario logueado (getter lazy, para el FAB) y qué hacer ante un 401 (forceRelogin).
// El getter lee currentUser en cada llamada → refleja el usuario actual aunque cambie de sesión.
initAyudaBot({ getUser: () => currentUser, onRelogin: forceRelogin });

// ── 📋 MI HISTORIAL DE TRABAJOS ──────────────────────────────────────────────
// SOLO LECTURA estricta: las cards NO abren el servicio (imposible reabrir/recomenzar por error).
// Única acción permitida: editar la PROPIA nota (property existente 'Notas post-servicio').
let _histItems = null;

function amHistorial() { closeAccountMenu(); openHistorialSheet(); }
function amMisEquipos() { closeAccountMenu(); openMisEquipos(); }
function closeHistorialSheet() { document.getElementById('historial-overlay').classList.remove('open'); }
function historialOverlayClick(e) { if (e.target.id === 'historial-overlay') closeHistorialSheet(); }

// ¿Participó esta persona en el servicio? (encargado / piloto / operario manual / ayudante)
function participaEn(props, nombre) {
  if ((props['Operario App']?.select?.name || '') === nombre) return t('hist.rol.encargado');
  if ((props['Piloto']?.select?.name || '') === nombre) return t('hist.rol.piloto');
  if ((props['Operario manual']?.select?.name || '') === nombre) return t('hist.rol.manual');
  if ((props['Operarios participantes']?.multi_select || []).some(o => o.name === nombre)) return t('hist.rol.ayudante');
  return null;
}

// Duración efectiva en minutos (Hora Inicio Efectivo → Hora Fin Efectivo), o null.
function _histDurMin(props) {
  const ini = props['Hora Inicio Efectivo']?.date?.start, fin = props['Hora Fin Efectivo']?.date?.start;
  if (!ini || !fin) return null;
  const di = new Date(ini), df = new Date(fin);
  if (isNaN(di) || isNaN(df) || df <= di) return null;
  return Math.round((df - di) / 60000);
}
function _histFmtMin(mins) {
  if (!mins) return '0 min';
  const h = Math.floor(mins / 60), m = mins % 60;
  return (h ? h + ' h ' : '') + (m ? m + ' min' : '') || '0 min';
}

async function openHistorialSheet() {
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
      body: JSON.stringify({ endpoint: `databases/${DB_ID}/query`, method: 'POST', body: { page_size: 100 } }),
    });
    if (resp.status === 401) { forceRelogin(); return; }
    if (!resp.ok) throw new Error('API error ' + resp.status);
    const data = await resp.json();
    const nombre = currentUser?.name || '';
    const paisNotion = COUNTRY_NOTION_MAP[currentUser?.country] || null;
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

function renderHistorial() {
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

function histEditNota(id) {
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

async function histSaveNota(id, btn) {
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

// ── Configuración (sheet admin) ──
function openConfigSheet() {
  if (!isAppAdmin()) return;
  document.getElementById('config-overlay').classList.add('open');
  loadEmailRecipients();
  loadAppCfgUI();
}
function closeConfigSheet() { document.getElementById('config-overlay').classList.remove('open'); }
function configOverlayClick(e) { if (e.target.id === 'config-overlay') closeConfigSheet(); }

// ── 📑 Documentos & Certificados (#12) — alta desde la app (admin). Escribe una page nueva en la DB
// Documentos con los nombres EXACTOS del esquema (verificado por MCP). PDF adjunto = paso futuro (por
// ahora se carga la metadata y la app avisa el vencimiento; el archivo se adjunta en Notion si hace falta).
const DOC_TIPOS = ['Certificado fiscal', 'Certificado seguridad social', 'Seguro', 'Permiso/Habilitación', 'Contrato', 'Licencia drone', 'Otro'];
const DOC_ENTIDADES = ['DGI', 'BPS', 'DINACIA', 'MTSS', 'Aseguradora', 'Otro'];
const DOC_PAISES = ['🇺🇾 UY', '🇧🇷 BR', '🇵🇦 PA', '🇬🇹 GT', '🇲🇽 MX'];
let _docState = null;

function openDocumentosSheet() {
  if (!isAppAdmin()) return;
  document.getElementById('doc-form').style.display = 'none';
  document.getElementById('documentos-overlay').classList.add('open');
  loadDocumentos();
}
function closeDocumentosSheet() { document.getElementById('documentos-overlay').classList.remove('open'); }
function documentosOverlayClick(e) { if (e.target.id === 'documentos-overlay') closeDocumentosSheet(); }

async function loadDocumentos() {
  const box = document.getElementById('doc-list');
  if (!box) return;
  box.innerHTML = '<div class="spinner" style="margin:14px auto"></div>';
  try {
    const data = await callNotion(`databases/${DOCUMENTOS_DB_ID}/query`, 'POST', { page_size: 100 });
    const docs = (data.results || []).map(r => r.properties || {})
      .filter(p => !(p['Estado']?.select?.name || '').includes('Histórico'))
      .map(p => ({
        nombre: p['Documento']?.title?.[0]?.plain_text || '(sin nombre)',
        estado: p['Estado']?.select?.name || '',
        entidad: p['Entidad emisora']?.select?.name || '',
        pais: p['País']?.select?.name || '',
        vence: p['Vence']?.date?.start || '',
      }))
      .sort((a, b) => (a.vence || '9999').localeCompare(b.vence || '9999'));
    if (!docs.length) { box.innerHTML = '<div style="font-size:12.5px;color:var(--text3);padding:10px 2px">' + esc(t('doc.empty')) + '</div>'; return; }
    const hoy = Date.now();
    box.innerHTML = '<div style="font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:.04em;margin:6px 2px">' + esc(t('doc.list.title')) + '</div>' +
      docs.map(d => {
        const dl = d.vence ? Math.round((new Date(d.vence) - hoy) / 86400000) : null;
        const venceTxt = d.vence ? (dl < 0 ? '🔴 ' + t('doc.expired') : (dl <= 30 ? '🟡 ' : '🟢 ') + dl + ' ' + t('doc.days')) : '—';
        return '<div style="background:var(--card);border:1px solid var(--border);border-radius:11px;padding:11px 12px;margin-bottom:7px">' +
          '<div style="font-size:13.5px;font-weight:600;color:var(--text)">' + esc(d.nombre) + '</div>' +
          '<div style="font-size:11.5px;color:var(--text3);margin-top:3px">' + esc([d.entidad, d.pais].filter(Boolean).join(' · ')) + '</div>' +
          '<div style="font-size:12px;color:var(--text2);margin-top:3px">' + esc(d.vence ? pedidoFmtFecha(d.vence) + ' · ' + venceTxt : t('doc.novence')) + '</div></div>';
      }).join('');
  } catch (e) {
    box.innerHTML = '<div style="font-size:12px;color:var(--red);padding:10px 2px">⚠️ ' + esc(e.message) + '</div>';
  }
}

function docToggleForm() {
  const f = document.getElementById('doc-form');
  if (f.style.display !== 'none') { f.style.display = 'none'; return; }
  _docState = { nombre: '', tipo: '', entidad: '', pais: DOC_PAISES[0], emision: '', vence: '', aviso: '30', notas: '' };
  const _inp = 'width:100%;box-sizing:border-box;padding:10px 12px;margin-bottom:8px;border:1px solid var(--border);border-radius:9px;background:var(--bg);color:var(--text);font-size:14px;font-family:inherit';
  f.innerHTML = '<div style="background:var(--card);border:1px solid var(--border2);border-radius:12px;padding:13px;margin-bottom:12px">' +
    '<input id="doc-nombre" placeholder="' + esc(t('doc.f.nombre')) + '" maxlength="120" oninput="_docState.nombre=this.value" style="' + _inp + '">' +
    '<select id="doc-tipo" oninput="_docState.tipo=this.value" style="' + _inp + '"><option value="" disabled selected>' + esc(t('doc.f.tipo')) + '</option>' + DOC_TIPOS.map(x => '<option>' + esc(x) + '</option>').join('') + '</select>' +
    '<select id="doc-entidad" oninput="_docState.entidad=this.value" style="' + _inp + '"><option value="" disabled selected>' + esc(t('doc.f.entidad')) + '</option>' + DOC_ENTIDADES.map(x => '<option>' + esc(x) + '</option>').join('') + '</select>' +
    '<select id="doc-pais" oninput="_docState.pais=this.value" style="' + _inp + '">' + DOC_PAISES.map(x => '<option>' + esc(x) + '</option>').join('') + '</select>' +
    '<label style="font-size:11px;color:var(--text3)">' + esc(t('doc.f.emision')) + '</label>' +
    '<input id="doc-emision" type="date" oninput="_docState.emision=this.value" style="' + _inp + '">' +
    '<label style="font-size:11px;color:var(--text3)">' + esc(t('doc.f.vence')) + '</label>' +
    '<input id="doc-vence" type="date" oninput="_docState.vence=this.value" style="' + _inp + '">' +
    '<label style="font-size:11px;color:var(--text3)">' + esc(t('doc.f.aviso')) + '</label>' +
    '<input id="doc-aviso" type="number" min="0" value="30" oninput="_docState.aviso=this.value" style="' + _inp + '">' +
    '<textarea id="doc-notas" placeholder="' + esc(t('doc.f.notas')) + '" maxlength="500" oninput="_docState.notas=this.value" style="' + _inp + ';resize:vertical" rows="2"></textarea>' +
    '<button class="pin-change-btn" style="margin-top:2px" onclick="saveDocumento(this)">' + esc(t('doc.f.save')) + '</button></div>';
  f.style.display = 'block';
}

async function saveDocumento(btn) {
  const s = _docState;
  if (!s.nombre.trim()) { alert(t('doc.err.nombre')); return; }
  if (/[<>]/.test(s.nombre)) { alert(t('doc.err.nombre')); return; }
  if (!s.tipo || !s.entidad) { alert(t('doc.err.tipo')); return; }
  // Defensa: los selects solo pueden ser valores de la allow-list del esquema (no ensuciar Notion aunque
  // alguien fuerce el valor por consola). País cae al 1º válido si viniera raro.
  if (!DOC_TIPOS.includes(s.tipo) || !DOC_ENTIDADES.includes(s.entidad)) { alert(t('doc.err.tipo')); return; }
  if (!DOC_PAISES.includes(s.pais)) s.pais = DOC_PAISES[0];
  const props = {
    'Documento': { title: [{ text: { content: s.nombre.trim() } }] },
    'Tipo': { select: { name: s.tipo } },
    'Entidad emisora': { select: { name: s.entidad } },
    'País': { select: { name: s.pais } },
    'Estado': { select: { name: '🟢 Vigente' } },
    'Cargado por': { select: { name: 'Técnico' } },
  };
  if (s.emision) props['Fecha emisión'] = { date: { start: s.emision } };
  if (s.vence) props['Vence'] = { date: { start: s.vence } };
  const av = parseInt(s.aviso, 10);
  if (Number.isFinite(av) && av >= 0) props['Días de aviso'] = { number: av };
  if (s.notas.trim()) props['Notas'] = { rich_text: [{ text: { content: s.notas.trim() } }] };
  const orig = btn.textContent; btn.disabled = true; btn.textContent = '⏳';
  try {
    await callNotion('pages', 'POST', { parent: { type: 'data_source_id', data_source_id: DOCUMENTOS_DS_ID }, properties: props });
    document.getElementById('doc-form').style.display = 'none';
    loadDocumentos();
    showSaving();
  } catch (e) {
    btn.disabled = false; btn.textContent = orig;
    alert(t('sheet.alert.save.error2') + e.message);
  }
}
async function amGoCuentas() {
  // El panel "🔑 Cuentas de acceso" vive en CEO → Equipo (adminAccountsHTML). Navegamos ahí.
  // await encadenado (no setTimeout): si loadCEO tarda, Equipo se pinta DESPUÉS y nadie lo pisa (review).
  closeConfigSheet();
  if (currentUser?.role?.includes('Dirección')) { await loadCEO(); }
  setCEOTab('equipo');
}

// ── 📬 Destinatarios de reportes (KV vía /api/email-recipients, admin-only server-side) ──
const REC_META = [
  { tipo: 'semanal', icon: '📊', lbl: 'cfg.rec.semanal', when: 'cfg.rec.semanal.when' },
  { tipo: 'lunes', icon: '📌', lbl: 'cfg.rec.lunes', when: 'cfg.rec.lunes.when' },
  { tipo: 'pipeline', icon: '🔔', lbl: 'cfg.rec.pipeline', when: 'cfg.rec.pipeline.when' },
];
let _recData = null;
const REC_EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

async function loadEmailRecipients() {
  const el = document.getElementById('rec-body');
  if (!el) return;
  el.innerHTML = '<div class="spinner" style="margin:14px auto"></div>';
  try {
    const r = await fetch('/api/email-recipients', { headers: { 'Authorization': 'Bearer ' + (localStorage.getItem('fc_token') || '') } });
    if (r.status === 401) { forceRelogin(); return; }
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.ok) throw new Error(j.error || ('HTTP ' + r.status));
    _recData = j.recipients || {};
    renderRecipients();
  } catch (e) {
    el.innerHTML = '<div style="color:var(--red);font-size:12px;padding:12px">⚠️ ' + esc(e.message) + '</div>';
  }
}
function renderRecipients() {
  const el = document.getElementById('rec-body');
  if (!el || !_recData) return;
  el.innerHTML = REC_META.map(m => {
    const arr = _recData[m.tipo] || [];
    const chips = arr.map(e =>
      `<span class="am-chip">${esc(e)}<button class="am-chip-x" aria-label="Quitar" onclick="recRemove('${m.tipo}','${esc(e)}')">✕</button></span>`
    ).join('');
    const vacio = arr.length ? '' : `<span style="font-size:11px;color:var(--text3);align-self:center">${esc(t('cfg.rec.fallback'))}</span>`;
    return `<div class="am-rep"><div class="am-rep-h"><span>${m.icon}</span><b>${esc(t(m.lbl))}</b><span class="am-rep-when">${esc(t(m.when))}</span></div>` +
      `<div class="am-chips">${chips}${vacio}<button class="am-chip am-chip-add" onclick="recAdd('${m.tipo}')">+ ${esc(t('cfg.rec.add'))}</button></div></div>`;
  }).join('');
}
async function recAdd(tipo) {
  const e = prompt(t('cfg.rec.prompt'));
  if (!e) return;
  const email = String(e).trim().toLowerCase();
  if (!REC_EMAIL_RE.test(email) || email.length > 120) { alert(t('cfg.rec.invalid')); return; }
  if (!_recData[tipo]) _recData[tipo] = [];
  if (_recData[tipo].includes(email)) return;
  if (_recData[tipo].length >= 10) { alert(t('cfg.rec.max')); return; }
  _recData[tipo].push(email);
  renderRecipients();
  await saveRecipients();
}
async function recRemove(tipo, email) {
  if (!confirm(t('cfg.rec.confirm.del').replace('{e}', email))) return;
  _recData[tipo] = (_recData[tipo] || []).filter(x => x !== email);
  renderRecipients();
  await saveRecipients();
}
async function saveRecipients() {
  try {
    const r = await fetch('/api/email-recipients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + (localStorage.getItem('fc_token') || '') },
      body: JSON.stringify({ recipients: _recData }),
    });
    if (r.status === 401) { forceRelogin(); return; }
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.ok) throw new Error(j.error || ('HTTP ' + r.status));
    _recData = j.recipients;
    renderRecipients();
  } catch (e) {
    alert(t('sheet.alert.save.error2') + e.message);
    loadEmailRecipients(); // recargar el estado real del server (el optimista pudo quedar desfasado)
  }
}

// ── ⚙️ Reglas del negocio + Checklist + Plantillas WhatsApp (POST admin-only server-side) ──
const REGLAS_UI = [
  { k: 'pipelineAviso', lbl: 'cfg.regla.aviso' },
  { k: 'pipelineSinRespuesta', lbl: 'cfg.regla.sinresp' },
  { k: 'mantenimientoDias', lbl: 'cfg.regla.mant' },
  { k: 'ventasSnoozeDias', lbl: 'cfg.regla.ventas' },
  { k: 'prospectoDias', lbl: 'cfg.regla.prospecto' },
];
const WA_UI = [
  { k: 'prop', lbl: 'cfg.wa.prop', i18n: 'wa.msg.prop' },
  { k: 'prospecto', lbl: 'cfg.wa.prospecto', i18n: 'wa.msg.prospecto' },
  { k: 'cliente', lbl: 'cfg.wa.cliente', i18n: 'wa.msg.cliente' },
];
const _cfgInp = 'width:100%;box-sizing:border-box;padding:9px 11px;border:1px solid var(--border);border-radius:9px;background:var(--bg);color:var(--text);font-size:14px;font-family:inherit';

async function loadAppCfgUI() {
  const el = document.getElementById('appcfg-body');
  if (!el) return;
  el.innerHTML = '<div class="spinner" style="margin:14px auto"></div>';
  await loadAppConfig(); // refresca _appCfg (y las checklists vivas)
  renderAppCfgUI();
}

function renderAppCfgUI() {
  const el = document.getElementById('appcfg-body');
  if (!el) return;
  // ⏱️ Reglas — inputs numéricos con el valor VIVO (override o default)
  let h = '<div class="am-card"><div class="am-card-h">⏱️ <b>' + esc(t('cfg.reglas.title')) + '</b></div><div style="padding:11px 13px">';
  REGLAS_UI.forEach(r => {
    h += '<div style="display:flex;align-items:center;gap:10px;margin-bottom:9px">' +
      '<span style="flex:1;font-size:12.5px;color:var(--text2)">' + esc(t(r.lbl)) + '</span>' +
      '<input id="cfg-regla-' + r.k + '" type="number" min="1" max="3650" value="' + cfgRegla(r.k) + '" style="' + _cfgInp + ';width:84px;text-align:center;flex:none">' +
      '</div>';
  });
  h += '<div style="font-size:11px;color:var(--text3);margin:2px 0 10px">' + esc(t('cfg.reglas.hint')) + '</div>' +
    '<button class="pin-change-btn" style="margin-top:0" onclick="saveAppCfgReglas(this)">' + esc(t('cfg.btn.save')) + '</button></div></div>';

  // ✅ Checklist del operario — 1 ítem por línea
  h += '<div class="am-card"><div class="am-card-h">✅ <b>' + esc(t('cfg.ck.title')) + '</b></div><div style="padding:11px 13px">' +
    '<div class="login-field-label" style="margin-top:0">' + esc(t('cfg.ck.pre')) + '</div>' +
    '<textarea id="cfg-ck-pre" rows="8" style="' + _cfgInp + ';resize:vertical">' + esc(CHECKLIST_PRE.join('\n')) + '</textarea>' +
    '<div class="login-field-label">' + esc(t('cfg.ck.post')) + '</div>' +
    '<textarea id="cfg-ck-post" rows="5" style="' + _cfgInp + ';resize:vertical">' + esc(CHECKLIST_POST.join('\n')) + '</textarea>' +
    '<div style="font-size:11px;color:var(--text3);margin:6px 0 10px">' + esc(t('cfg.ck.hint')) + '</div>' +
    '<button class="pin-change-btn" style="margin-top:0" onclick="saveAppCfgChecklist(this)">' + esc(t('cfg.btn.save')) + '</button></div></div>';

  // 💬 Plantillas de WhatsApp — texto vivo (override o i18n) por idioma
  h += '<div class="am-card"><div class="am-card-h">💬 <b>' + esc(t('cfg.wa.title')) + '</b></div><div style="padding:11px 13px">';
  WA_UI.forEach(w => {
    const vEs = _appCfg?.waTemplates?.[w.k]?.es || TRANSLATIONS['es'][w.i18n] || '';
    const vPt = _appCfg?.waTemplates?.[w.k]?.pt || TRANSLATIONS['pt-BR'][w.i18n] || '';
    h += '<div class="login-field-label" style="margin-top:0">' + esc(t(w.lbl)) + ' · ES</div>' +
      '<textarea id="cfg-wa-' + w.k + '-es" rows="3" style="' + _cfgInp + ';resize:vertical">' + esc(vEs) + '</textarea>' +
      '<div class="login-field-label">' + esc(t(w.lbl)) + ' · PT</div>' +
      '<textarea id="cfg-wa-' + w.k + '-pt" rows="3" style="' + _cfgInp + ';resize:vertical;margin-bottom:10px">' + esc(vPt) + '</textarea>';
  });
  h += '<div style="font-size:11px;color:var(--text3);margin:2px 0 10px">' + esc(t('cfg.wa.hint')) + '</div>' +
    '<button class="pin-change-btn" style="margin-top:0" onclick="saveAppCfgWa(this)">' + esc(t('cfg.btn.save')) + '</button></div></div>';

  // 💰 Tarifas de jornales (#6) — un rate dron/manual por operario del país (gente de campo).
  const opsCampo = USERS.filter(u => /Operario|Coordinador|Dirección/.test(u.role));
  h += '<div class="am-card"><div class="am-card-h">💰 <b>' + esc(t('cfg.tar.title')) + '</b></div><div style="padding:11px 13px">' +
    '<div style="display:flex;gap:8px;font-size:10.5px;color:var(--text3);text-transform:uppercase;letter-spacing:.04em;margin-bottom:6px">' +
    '<span style="flex:1"></span><span style="width:84px;text-align:center">🚁 Dron</span><span style="width:84px;text-align:center">💪 Manual</span></div>';
  opsCampo.forEach(u => {
    const tr = _appCfg?.tarifas?.[u.id] || {};
    h += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:7px">' +
      '<span style="flex:1;font-size:12.5px;color:var(--text)">' + esc(u.emoji || '👤') + ' ' + esc(u.name) + '</span>' +
      '<input id="cfg-tar-' + esc(u.id) + '-dron" type="number" min="0" step="1" value="' + (tr.dron != null ? tr.dron : '') + '" placeholder="0" style="' + _cfgInp + ';width:84px;text-align:center;flex:none">' +
      '<input id="cfg-tar-' + esc(u.id) + '-manual" type="number" min="0" step="1" value="' + (tr.manual != null ? tr.manual : '') + '" placeholder="0" style="' + _cfgInp + ';width:84px;text-align:center;flex:none"></div>';
  });
  h += '<div style="font-size:11px;color:var(--text3);margin:2px 0 10px">' + esc(t('cfg.tar.hint')) + '</div>' +
    '<button class="pin-change-btn" style="margin-top:0" onclick="saveAppCfgTarifas(this)">' + esc(t('cfg.btn.save')) + '</button>' +
    '<div id="cfg-tar-preview" style="margin-top:10px"></div></div></div>';

  // 🧮 Costos del servicio (#7) — parámetros de la calculadora de precio de la propuesta.
  const c = _appCfg?.costos || {};
  const cField = (k, lbl, suf) => '<div style="display:flex;align-items:center;gap:10px;margin-bottom:9px">' +
    '<span style="flex:1;font-size:12.5px;color:var(--text2)">' + esc(t(lbl)) + '</span>' +
    '<input id="cfg-costo-' + k + '" type="number" min="0" step="0.01" value="' + (c[k] != null ? c[k] : '') + '" placeholder="0" style="' + _cfgInp + ';width:100px;text-align:center;flex:none">' +
    (suf ? '<span style="font-size:11px;color:var(--text3);width:16px">' + suf + '</span>' : '<span style="width:16px"></span>') + '</div>';
  h += '<div class="am-card"><div class="am-card-h">🧮 <b>' + esc(t('cfg.costo.title')) + '</b></div><div style="padding:11px 13px">' +
    cField('m2Dron', 'cfg.costo.m2dron', '') + cField('m2Manual', 'cfg.costo.m2manual', '') +
    cField('margen', 'cfg.costo.margen', '%') + cField('minimo', 'cfg.costo.minimo', '') +
    '<div style="font-size:11px;color:var(--text3);margin:2px 0 10px">' + esc(t('cfg.costo.hint')) + '</div>' +
    '<button class="pin-change-btn" style="margin-top:0" onclick="saveAppCfgCostos(this)">' + esc(t('cfg.btn.save')) + '</button></div></div>';

  el.innerHTML = h;
  renderJornalesPreview();
}

// POST de la config ENTERA (mismo patrón que recipients: _appCfg es el estado, cada sección lo muta y postea todo)
async function _postAppCfg(btn) {
  const orig = btn.textContent;
  btn.disabled = true; btn.textContent = '⏳';
  try {
    const r = await fetch('/api/app-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + (localStorage.getItem('fc_token') || '') },
      body: JSON.stringify({ config: _appCfg || {} }),
    });
    if (r.status === 401) { forceRelogin(); return false; }
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.ok) throw new Error(j.error || ('HTTP ' + r.status));
    _appCfg = j.config;
    if (Array.isArray(_appCfg.checklistPre) && _appCfg.checklistPre.length) CHECKLIST_PRE = _appCfg.checklistPre;
    if (Array.isArray(_appCfg.checklistPost) && _appCfg.checklistPost.length) CHECKLIST_POST = _appCfg.checklistPost;
    btn.textContent = '✅';
    setTimeout(() => { btn.textContent = orig; btn.disabled = false; }, 900);
    return true;
  } catch (e) {
    btn.textContent = orig; btn.disabled = false;
    alert(t('sheet.alert.save.error2') + e.message);
    return false;
  }
}

async function saveAppCfgReglas(btn) {
  const reglas = {};
  for (const r of REGLAS_UI) {
    const v = parseInt(document.getElementById('cfg-regla-' + r.k)?.value, 10);
    if (!Number.isInteger(v) || v < 1 || v > 3650) { alert(t('cfg.reglas.invalid')); return; }
    reglas[r.k] = v;
  }
  if (reglas.pipelineAviso >= reglas.pipelineSinRespuesta) { alert(t('cfg.reglas.orden')); return; }
  _appCfg = _appCfg || {};
  _appCfg.reglas = reglas;
  await _postAppCfg(btn);
}

async function saveAppCfgChecklist(btn) {
  const parse = (id) => (document.getElementById(id)?.value || '').split('\n').map(x => x.trim()).filter(Boolean);
  const pre = parse('cfg-ck-pre'), post = parse('cfg-ck-post');
  if (!pre.length || !post.length) { alert(t('cfg.ck.vacia')); return; }
  if (pre.length > 40 || post.length > 40) { alert(t('cfg.ck.max')); return; }
  for (const it of [...pre, ...post]) {
    if (it.length > 140 || /[<>]/.test(it)) { alert(t('cfg.ck.invalid')); return; }
  }
  _appCfg = _appCfg || {};
  _appCfg.checklistPre = pre;
  _appCfg.checklistPost = post;
  await _postAppCfg(btn);
}

async function saveAppCfgWa(btn) {
  const wa = {};
  for (const w of WA_UI) {
    const es = (document.getElementById('cfg-wa-' + w.k + '-es')?.value || '').trim();
    const pt = (document.getElementById('cfg-wa-' + w.k + '-pt')?.value || '').trim();
    if (es.length > 400 || pt.length > 400) { alert(t('cfg.wa.max')); return; }
    if (/[<>]/.test(es) || /[<>]/.test(pt)) { alert(t('cfg.wa.invalid')); return; }
    const o = {};
    if (es) o.es = es;
    if (pt) o.pt = pt;
    if (Object.keys(o).length) wa[w.k] = o;
  }
  _appCfg = _appCfg || {};
  if (Object.keys(wa).length) _appCfg.waTemplates = wa; else delete _appCfg.waTemplates;
  await _postAppCfg(btn);
}

// #6 — guardar tarifas de jornales (solo las que tienen algún valor > 0).
async function saveAppCfgTarifas(btn) {
  const opsCampo = USERS.filter(u => /Operario|Coordinador|Dirección/.test(u.role));
  const tarifas = {};
  for (const u of opsCampo) {
    const dron = parseFloat(document.getElementById('cfg-tar-' + u.id + '-dron')?.value);
    const manual = parseFloat(document.getElementById('cfg-tar-' + u.id + '-manual')?.value);
    const o = {};
    if (Number.isFinite(dron) && dron >= 0) o.dron = dron;
    if (Number.isFinite(manual) && manual >= 0) o.manual = manual;
    if ((o.dron || o.manual)) {
      if ((o.dron || 0) > 10000000 || (o.manual || 0) > 10000000) { alert(t('cfg.tar.max')); return; }
      tarifas[u.id] = o;
    }
  }
  _appCfg = _appCfg || {};
  if (Object.keys(tarifas).length) _appCfg.tarifas = tarifas; else delete _appCfg.tarifas;
  if (await _postAppCfg(btn)) renderJornalesPreview();
}

// #7 — guardar parámetros de costos.
async function saveAppCfgCostos(btn) {
  const costos = {};
  for (const k of ['m2Dron', 'm2Manual', 'margen', 'minimo']) {
    const v = parseFloat(document.getElementById('cfg-costo-' + k)?.value);
    if (document.getElementById('cfg-costo-' + k)?.value === '') continue;
    if (!Number.isFinite(v) || v < 0) { alert(t('cfg.costo.invalid')); return; }
    if (k === 'margen' && v > 100) { alert(t('cfg.costo.margen.invalid')); return; }
    costos[k] = v;
  }
  _appCfg = _appCfg || {};
  if (Object.keys(costos).length) _appCfg.costos = costos; else delete _appCfg.costos;
  await _postAppCfg(btn);
}

// #6 — TABLERO de jornales del MES en curso: recorre servicios/jornadas y suma jornal×tarifa por operario.
// Un "jornal" = una persona en un servicio/jornada de un día (encargado + piloto + manual + ayudantes,
// deduplicados). El método (dron/manual) sale del servicio; si falta, usa dron. Cajón vacío → aviso.
async function renderJornalesPreview() {
  const box = document.getElementById('cfg-tar-preview');
  if (!box) return;
  if (!tarifasCargadas()) { box.innerHTML = '<div style="font-size:11.5px;color:var(--text3)">' + esc(t('cfg.tar.empty')) + '</div>'; return; }
  box.innerHTML = '<div class="spinner" style="margin:10px auto"></div>';
  const ym = new Date().toISOString().slice(0, 7); // 'YYYY-MM'
  try {
    const data = await callNotion(`databases/${DB_ID}/query`, 'POST', {});
    const items = (data.results || []).filter(s => {
      const p = s.properties || {};
      const tipo = p['Tipo de registro']?.select?.name || '';
      // Vacío/Orden/Jornada = trabajo real (misma convención que el resto de la app); excluir solo Relev/Prueba.
      if (/Relevamiento|Prueba/.test(tipo)) return false;
      const est = p['Estado']?.select?.name || '';
      if (/Cancelado/.test(est) || p['🗄️ Archivado']?.checkbox) return false;
      const f = (p['Fecha programada']?.date?.start || '').slice(0, 7);
      return f === ym;
    });
    // Acumular jornales por operario (nombre) y método.
    const acc = {}; // name → { dron:count, manual:count }
    for (const s of items) {
      const p = s.properties || {};
      const metodo = msNames(p['Método de trabajo']).includes('💪 Manual') ? 'manual' : 'dron';
      const gente = new Set();
      [p['Operario App']?.select?.name, p['Piloto']?.select?.name, p['Operario manual']?.select?.name].forEach(n => { if (n) gente.add(n); });
      (p['Operarios participantes']?.multi_select || []).forEach(o => { if (o.name) gente.add(o.name); });
      gente.forEach(name => { acc[name] = acc[name] || { dron: 0, manual: 0 }; acc[name][metodo]++; });
    }
    // Cruzar con tarifas (por id → name).
    const idByName = {}; USERS.forEach(u => { idByName[u.name] = u.id; });
    let total = 0; const rows = [];
    for (const [name, cnt] of Object.entries(acc)) {
      const id = idByName[name];
      const pago = id ? (cnt.dron * cfgTarifa(id, 'dron') + cnt.manual * cfgTarifa(id, 'manual')) : 0;
      total += pago;
      rows.push({ name, jornales: cnt.dron + cnt.manual, pago, sinTarifa: !id || (!cfgTarifa(id, 'dron') && !cfgTarifa(id, 'manual')) });
    }
    rows.sort((a, b) => b.pago - a.pago);
    if (!rows.length) { box.innerHTML = '<div style="font-size:11.5px;color:var(--text3)">' + esc(t('cfg.tar.nomes')) + '</div>'; return; }
    const fmt = (n) => '$ ' + Number(n).toLocaleString('es-UY');
    box.innerHTML = '<div style="border-top:1px solid var(--border);padding-top:8px">' +
      '<div style="font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:.04em;margin-bottom:6px">' + esc(t('cfg.tar.preview')) + '</div>' +
      rows.map(r => '<div style="display:flex;justify-content:space-between;font-size:12.5px;padding:3px 0;color:var(--text)">' +
        '<span>' + esc(r.name) + ' <span style="color:var(--text3)">· ' + r.jornales + ' j</span>' + (r.sinTarifa ? ' <span style="color:var(--amber,#f59e0b);font-size:10px">⚠️ sin tarifa</span>' : '') + '</span>' +
        '<b>' + esc(fmt(r.pago)) + '</b></div>').join('') +
      '<div style="display:flex;justify-content:space-between;font-size:13.5px;padding:8px 0 0;margin-top:4px;border-top:1px solid var(--border);color:var(--text)"><b>' + esc(t('cfg.tar.total')) + '</b><b style="color:var(--accent,#00C98D)">' + esc(fmt(total)) + '</b></div>' +
      '<div style="font-size:10px;color:var(--text3);margin-top:4px">' + esc(t('cfg.tar.paisnote')) + '</div></div>';
  } catch (e) {
    box.innerHTML = '<div style="font-size:11px;color:var(--red)">⚠️ ' + esc(e.message) + '</div>';
  }
}

// ─────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────
function renderVersionLabel() {
  // Cartelito de versión visible en todas las pantallas.
  const badge = document.getElementById('app-version-badge');
  if (badge) badge.textContent = 'v' + APP_VERSION;
  const el = document.getElementById('login-version');
  if (!el) return;
  const apkVer = getApkInstalledVersion();
  const outdated = checkApkOutdated();
  if (outdated) {
    el.classList.add('outdated');
    el.innerHTML = `⚠ APK v${apkVer} desactualizado · web v${APP_VERSION} requiere ≥ v${MIN_APK_VERSION_REQUIRED}`;
  } else if (apkVer) {
    el.classList.remove('outdated');
    el.textContent = `APK v${apkVer} · web v${APP_VERSION}`;
  } else {
    el.classList.remove('outdated');
    el.textContent = `v${APP_VERSION}`;
  }
}

// Guardia anti-tap: si el dedo se desliza (>10px) antes de soltar, se cancela el click —
// evita asignar operarios / tocar botones sin querer al scrollear. (Tap real = sin movimiento.)
let _gMoved = false, _gx = 0, _gy = 0;
document.addEventListener('touchstart', e => { _gMoved = false; const tt = e.touches[0]; if (tt) { _gx = tt.clientX; _gy = tt.clientY; } }, { passive: true, capture: true });
document.addEventListener('touchmove', e => { const tt = e.touches[0]; if (tt && (Math.abs(tt.clientX - _gx) > 10 || Math.abs(tt.clientY - _gy) > 10)) _gMoved = true; }, { passive: true, capture: true });
document.addEventListener('click', e => { if (_gMoved) { e.stopPropagation(); e.preventDefault(); _gMoved = false; } }, { capture: true });

// Consentimiento legal (una sola vez por dispositivo). Registra versión + timestamp
// para que el consentimiento quede demostrable (LGPD/LFPDPPP).
const CONSENT_VERSION = 'privacy-1.2+terms-1.1';
function checkConsent() {
  let ok = false;
  try { const c = JSON.parse(localStorage.getItem('fc_consent') || 'null'); ok = !!(c && c.v === CONSENT_VERSION); } catch (_) {}
  if (!ok) { const ov = document.getElementById('consent-overlay'); if (ov) ov.style.display = 'flex'; }
}
function acceptConsent() {
  try { localStorage.setItem('fc_consent', JSON.stringify({ v: CONSENT_VERSION, at: new Date().toISOString() })); } catch (_) {}
  const ov = document.getElementById('consent-overlay'); if (ov) ov.style.display = 'none';
}

async function init() {
  initLang();
  applyTranslations();
  renderVersionLabel();
  checkConsent();
  // Fase 3.0 (login sin deploy): pobla el roster de usuarios desde la base EN BACKGROUND (fallback al array
  // embebido). NO bloquea el arranque — el fast-path del operario (sesión fresca) usa el embebido y entra al
  // instante. Al terminar, si estamos en la pantalla de login, la re-renderiza para que aparezcan usuarios nuevos.
  loadRoster().then(changed => { if (changed && document.getElementById('screen-login')?.classList.contains('active')) renderLogin(); });
  // Si hay writes o fotos pendientes de una sesión anterior, mostrar badge y procesar.
  renderOfflineBadge();
  if (navigator.onLine) { processQueue(); processPhotoQueue(); }
  const savedCountry = localStorage.getItem('fc_country');
  if (savedCountry) {
    selectedCountry = savedCountry;
    updateLangToggleUI();
  } else {
    updateLangToggleUI();
    showScreen('country');
    return;
  }
  renderLogin();
  const saved = localStorage.getItem('fc_user');
  if (saved) {
    try {
      const u = JSON.parse(saved);
      pinUser = USERS.find(p => p.id === u.id) ||
                USERS.find(p => p.notionId === u.id) ||
                USERS.find(p => p.name === u.name);
      if (pinUser) {
        // Si la sesión está fresca (< 8h desde última actividad), saltar PIN y entrar directo.
        if (isSessionFresh()) {
          currentUser = { id: pinUser.id, name: pinUser.name, role: pinUser.role, emoji: pinUser.emoji, country: pinUser.country };
          markUserActive();
          await loadAppConfig(); // config editable también en el fast-path (checklist/reglas frescas)
          await routeByRole(currentUser.role);
          return;
        }
        // Sesión expirada: pedir PIN como antes
        document.getElementById('pin-emoji').textContent = pinUser.emoji;
        document.getElementById('pin-name').textContent = pinUser.name;
        pinBuffer = '';
        updatePinDots();
        document.getElementById('pin-error').textContent = '';
        showScreen('pin');
        return;
      }
    } catch (e) { localStorage.removeItem('fc_user'); }
  }
  showScreen('login');
}

init();

// --- Service Worker + aviso de versión nueva (auditoría 2026-07-09) ---
// Antes el registro era fire-and-forget: nadie se enteraba de un deploy nuevo hasta cerrar la app del
// todo. Ahora, cuando entra un SW nuevo y ya había uno controlando la pestaña, mostramos un banner
// "Nueva versión — Actualizar" que recarga cuando el usuario decide (nunca en medio de su trabajo).
if ('serviceWorker' in navigator) {
  let _swReloading = false;
  window.__flycleanReload = () => { _swReloading = true; location.reload(); };
  navigator.serviceWorker.register('/sw.js').then(reg => {
    reg.addEventListener('updatefound', () => {
      const nw = reg.installing;
      if (!nw) return;
      nw.addEventListener('statechange', () => {
        // 'installed' + ya hay controller = ACTUALIZACIÓN (no la primera instalación).
        if (nw.state === 'installed' && navigator.serviceWorker.controller) showUpdateBanner();
      });
    });
    // Al volver el foco a la app, chequear si salió un deploy (sin recargar nada).
    document.addEventListener('visibilitychange', () => { if (!document.hidden) reg.update().catch(() => {}); });
  }).catch(() => {});
  // El SW nuevo hace skipWaiting()+claim → dispara controllerchange. Solo recargamos si el usuario
  // pidió actualizar (evita recargas sorpresa mientras un operario sube fotos, etc.).
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (_swReloading) location.reload(); });
}

// ── Guía para instalar la app (PWA) — banner discreto, dismissable, NUNCA si ya está instalada ──
let _deferredInstallPrompt = null;
// Solo pantallas "home" (sin barra de acciones fija abajo). Se EXCLUYEN a propósito: detail (flujo de
// trabajo, tiene .bottom-bar), done (botones), pin (login) → ahí el banner taparía botones.
const _INSTALL_SAFE_SCREENS = ['services', 'coordinator', 'ceo', 'finanzas', 'ventas'];
function _isStandalone() { return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true; }
function _isIOS() { return /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream; }
function _installWanted() {
  if (_isStandalone()) return false;                                       // ya instalada (incluye la APK/TWA)
  try { if (localStorage.getItem('fc_install_dismissed') === '1') return false; } catch (_) {}
  return _isIOS() || !!_deferredInstallPrompt;                             // iOS = instrucciones; Android = prompt
}
function _activeScreenId() { return ((document.querySelector('.screen.active') || {}).id || '').replace(/^screen-/, ''); }
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); _deferredInstallPrompt = e; try { updateInstallBanner(); } catch (_) {} });
window.addEventListener('appinstalled', () => {
  _deferredInstallPrompt = null;
  try { localStorage.setItem('fc_install_dismissed', '1'); } catch (_) {}
  document.getElementById('install-banner')?.remove();
});
function dismissInstallBanner() {
  try { localStorage.setItem('fc_install_dismissed', '1'); } catch (_) {}
  document.getElementById('install-banner')?.remove();
}
async function doInstall() {
  if (!_deferredInstallPrompt) return;
  _deferredInstallPrompt.prompt();
  try { await _deferredInstallPrompt.userChoice; } catch (_) {}
  _deferredInstallPrompt = null;
  dismissInstallBanner();
}
// Muestra/oculta el banner según la pantalla activa. z-index 99 < overlays (100) → un bottom-sheet abierto
// lo tapa (no bloquea sus botones). Llamado desde showScreen y beforeinstallprompt.
function updateInstallBanner() {
  const existing = document.getElementById('install-banner');
  const show = _installWanted() && _INSTALL_SAFE_SCREENS.includes(_activeScreenId());
  if (!show) { existing?.remove(); return; }
  if (existing) return;
  const ios = _isIOS();
  const banner = document.createElement('div');
  banner.id = 'install-banner';
  banner.style.cssText = 'position:fixed;left:12px;right:12px;bottom:12px;max-width:406px;margin:0 auto;z-index:99;background:var(--card);border:1px solid var(--border2);border-radius:14px;padding:12px 14px;display:flex;align-items:center;gap:10px;box-shadow:0 8px 24px rgba(0,0,0,.45);font-family:\'Exo 2\',sans-serif';
  banner.innerHTML =
    '<div style="font-size:22px">📲</div>' +
    '<div style="flex:1;min-width:0">' +
      '<div style="font-size:13px;font-weight:700;color:var(--text)">' + esc(t('install.title')) + '</div>' +
      '<div style="font-size:11.5px;color:var(--text3);line-height:1.3">' + esc(ios ? t('install.ios') : t('install.android')) + '</div>' +
    '</div>' +
    (ios ? '' : '<button id="install-do-btn" style="background:var(--green);border:none;border-radius:8px;color:#04231a;font-size:12px;font-weight:700;padding:8px 12px;cursor:pointer;font-family:inherit;white-space:nowrap">' + esc(t('install.btn')) + '</button>') +
    '<button id="install-x-btn" aria-label="Cerrar" style="background:none;border:none;color:var(--text3);font-size:18px;cursor:pointer;padding:2px 4px">✕</button>';
  document.body.appendChild(banner);
  document.getElementById('install-do-btn')?.addEventListener('click', doInstall);
  document.getElementById('install-x-btn')?.addEventListener('click', dismissInstallBanner);
}

function showUpdateBanner() {
  if (document.getElementById('sw-update-banner')) return;
  const pt = currentLang === 'pt-BR';
  const b = document.createElement('div');
  b.id = 'sw-update-banner';
  b.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);bottom:calc(74px + env(safe-area-inset-bottom));z-index:9999;background:#00C98D;color:#04150f;font-family:inherit;font-weight:700;font-size:14px;padding:11px 15px;border-radius:14px;box-shadow:0 6px 20px rgba(0,0,0,.35);display:flex;align-items:center;gap:12px;max-width:calc(100% - 24px)';
  const txt = document.createElement('span');
  txt.textContent = pt ? '🔄 Nova versão disponível' : '🔄 Nueva versión disponible';
  const btn = document.createElement('button');
  btn.textContent = pt ? 'Atualizar' : 'Actualizar';
  btn.style.cssText = 'background:#04150f;color:#fff;border:0;border-radius:9px;padding:7px 13px;font-weight:700;font-size:13px;cursor:pointer;font-family:inherit;flex:0 0 auto';
  btn.onclick = () => (window.__flycleanReload ? window.__flycleanReload() : location.reload());
  b.appendChild(txt); b.appendChild(btn);
  document.body.appendChild(b);
}

// --- Botón atrás del teléfono cierra el sheet abierto, en vez de salir de la app (auditoría 2026-07-09) ---
// Casi todos los sheets comparten .edit-overlay y abren con .open. Cuando se abre uno empujamos UN
// estado "colchón" al historial; el "atrás" lo consume cerrando el sheet (clic en su × real, que corre
// el cleanup propio de cada cierre). Si el sheet se cierra con la ×, devolvemos el colchón para no
// dejar basura en el historial. La app no usaba history → no hay colisión.
(function backClosesSheets() {
  const anyOpenSheet = () => document.querySelector('.edit-overlay.open, #pin-change-overlay.open');
  let guardActive = false;
  const obs = new MutationObserver((muts) => {
    // Solo miramos cambios de clase en los propios overlays (barato: ignora los toggles de tabs/cards).
    if (!muts.some(m => m.target && m.target.classList &&
        (m.target.classList.contains('edit-overlay') || m.target.id === 'pin-change-overlay'))) return;
    const open = !!anyOpenSheet();
    if (open && !guardActive) { guardActive = true; try { history.pushState({ fcSheet: 1 }, ''); } catch (_) {} }
    else if (!open && guardActive) {
      guardActive = false;
      if (history.state && history.state.fcSheet) { try { history.back(); } catch (_) {} }
    }
  });
  obs.observe(document.body, { subtree: true, attributes: true, attributeFilter: ['class'] });
  window.addEventListener('popstate', () => {
    const open = anyOpenSheet();
    if (!open) return;
    guardActive = false; // este popstate ya consumió el colchón
    const closeBtn = open.querySelector('[onclick^="close"]');
    if (closeBtn) closeBtn.click(); else open.classList.remove('open');
  });
})();

/* @globals:start — GENERADO por scripts/gen-globals.cjs · NO editar a mano */
// Los handlers inline (onclick="…") buscan estas FUNCIONES en window. Ver scripts/gen-globals.cjs.
Object.assign(window, {
  abrirProspectoMapa,
  abrirWhatsAppCliente,
  abrirWhatsAppProp,
  abrirWhatsAppProspecto,
  acceptConsent,
  accountMenuOverlayClick,
  addEquipoToServicio,
  adminBajaUser,
  adminEditUser,
  adminHardDeleteUser,
  adminNewUser,
  adminReactivarUser,
  adminSetPin,
  amConfig,
  amGoCuentas,
  amHelp,
  amHistorial,
  amLang,
  amLogout,
  amMisEquipos,
  amPin,
  amRegion,
  amUpdate,
  archivarServicioFinanzas,
  archiveService,
  asignarPrecioContrato,
  asociarCobro,
  ayudaOverlayClick,
  backFromCEO,
  backToCountry,
  backToLogin,
  bulkRenameServices,
  calcularPrecioPropuesta,
  cancelarInicio,
  cancelarPedido,
  cargarMasContactos,
  cargarMasCoord,
  cerrarServicio,
  changeCoordMonth,
  checklistPreContinue,
  chooseWinner,
  cierreSectoresElegir,
  cierreSectoresOverlayClick,
  clearCoordFilters,
  closeAccountMenu,
  closeAddEquipoSheet,
  closeAyudaBot,
  closeCierreSectoresModal,
  closeCobroSheet,
  closeConfigSheet,
  closeContactSheet,
  closeCoordFilterSheet,
  closeCreateJornadaSheet,
  closeDocumentosSheet,
  closeEditSheet,
  closeGastoSheet,
  closeGastos,
  closeHelpSheet,
  closeHistorialSheet,
  closeIngresoSheet,
  closeMergePlan,
  closeMisEquipos,
  closeMoverEstado,
  closeNewServiceSheet,
  closePedidoSheet,
  closePhotoViewer,
  closePinChange,
  closePorCobrarPlan,
  closePropSheet,
  closeProspectoSheet,
  closeReportStep,
  closeSectorOverlay,
  cobroOverlayClick,
  cobroSetServicio,
  configOverlayClick,
  confirmNewOperario,
  confirmNewOperarioManual,
  confirmNewPiloto,
  confirmarRecontactarFecha,
  contactAddSector,
  contactIntermediarioChanged,
  contactOpenMapa,
  contactOverlayClick,
  contactRemoveSector,
  contactRenameSector,
  contactSetField,
  contactToggleMulti,
  continuarCierreEfectivo,
  continuarInicioEfectivo,
  coordFilterOverlayClick,
  createPruebaFromPropuesta,
  createRelevamientoFromPropuesta,
  createServicioFromPropuesta,
  cubrirServicio,
  deletePropuesta,
  deleteService,
  dismissAlert,
  docToggleForm,
  documentosOverlayClick,
  editAddSector,
  editClienteChanged,
  eqAltaSave,
  eqCheckForm,
  eqCheckSave,
  eqDeleteEquipo,
  eqEditForm,
  eqEditSave,
  eqHistToggle,
  eqResolverProblema,
  eqServiceForm,
  eqServiceSave,
  eqToggleAlta,
  equipoOverlayClick,
  esc,
  executeMerge,
  filterContacts,
  finishAndGoBack,
  gastoOverlayClick,
  gastoSkipFoto,
  generateFinanceReportPDF,
  generateProposalPDF,
  generateReportPDFFromCEO,
  goBack,
  goToCEOFromCoord,
  goToStep,
  handlePhotoSelect,
  helpOverlayClick,
  histEditNota,
  histSaveNota,
  historialOverlayClick,
  ingresoOverlayClick,
  ingresoSetCliente,
  iniciarServicio,
  jornadaOverlayClick,
  limpSvcSetOk,
  loadServices,
  loginSubmit,
  marcarClienteContactado,
  marcarPedidoComprado,
  marcarPedidoRecibido,
  marcarPropContactada,
  marcarSectorHecho,
  misEqReportProblem,
  misEqSave,
  misEqToggleProblem,
  miseqOverlayClick,
  newServiceOverlayClick,
  newSvcClienteChanged,
  newSvcSetTipoReg,
  newSvcSetTipoSvc,
  nextStep,
  nuSyncId,
  onCoordSearchInput,
  onGastoReciboSelected,
  openAccountMenu,
  openAddEquipoSheet,
  openAyudaBot,
  openCobroSheet,
  openContactSheet,
  openContactarHoy,
  openCreateJornadaSheet,
  openDocumentosSheet,
  openEditSheet,
  openEditSheetFromFinanzas,
  openGalleryViewer,
  openGastos,
  openHistoryItem,
  openMoverEstado,
  openNewContactSheet,
  openNewPropSheet,
  openNewServiceSheet,
  openNewServiceSheetForContact,
  openNuevoGastoSheet,
  openNuevoIngresoSheet,
  openNuevoPedidoSheet,
  openPhotoViewer,
  openPhotoViewerFor,
  openPropSheet,
  openProspectoSheet,
  openReportStep,
  openSectorOverlay,
  openService,
  openServicePickerForReport,
  openServicioQuickView,
  openSvcUbicacion,
  overlayClick,
  pedidoOverlayClick,
  persistServiceStateToLocal,
  pickServiceReport,
  pinChangeOverlayClick,
  pinConfirm,
  pinDelete,
  pinPress,
  propClienteChanged,
  propOverlayClick,
  propSetField,
  prospAccion,
  prospectoOverlayClick,
  prospectoSetOrigen,
  prospectoToggleInteres,
  pvNav,
  pvRetry,
  reanalyzeReceipt,
  recAdd,
  recRemove,
  recontacteHoyDesdeSheet,
  refreshCEO,
  registrarCierreEfectivo,
  registrarInicioEfectivo,
  relevToggleDif,
  relevToggleSugerido,
  removeEquipoFromServicio,
  removePhoto,
  renameOneService,
  renderCobroSheet,
  renderCoordFiltersPanel,
  renderGastoSheet,
  renderGastosListInner,
  renderIngresoSheet,
  renderIngresosListInner,
  renderLimpieza,
  renderPedidoSheet,
  reportStepOverlayClick,
  retryPhoto,
  saveAppCfgChecklist,
  saveAppCfgCostos,
  saveAppCfgReglas,
  saveAppCfgTarifas,
  saveAppCfgWa,
  saveCobroEdit,
  saveContactEdit,
  saveDocumento,
  saveGasto,
  saveIngreso,
  saveNewPin,
  savePedido,
  savePropEdit,
  saveProspecto,
  saveServiceEdit,
  sectorOverlayClick,
  seleccionarMoverEstado,
  selectClima,
  selectCountry,
  selectEditEstado,
  selectEditOperario,
  selectEditOperarioManual,
  selectEditPiloto,
  selectEditTipoServicio,
  selectFinalizacion,
  selectHerramientaManual,
  selectJornadaOperario,
  selectMetodoTrabajo,
  selectResultado,
  selectResultadoPrueba,
  sendAyuda,
  setCEOCountry,
  setCEOFinCurrency,
  setCEOPeriodMode,
  setCEORange,
  setCEOTab,
  setCeoRentaView,
  setCoordDateRange,
  setCoordDay,
  setCoordPedidosFilter,
  setCoordSort,
  setCoordTab,
  setCoordView,
  setFinanzasTab,
  setGastosRange,
  setGastosScreenTab,
  setLang,
  setLimpiezaSubtab,
  setTab,
  shiftCEOPeriod,
  showNewOperarioInput,
  showNewOperarioManualInput,
  showNewPilotoInput,
  submitCreateJornada,
  submitNewService,
  submitReportStep,
  toggleAlertsList,
  toggleBajaPanel,
  toggleCeoAcc,
  toggleCheck,
  toggleContactarHoy,
  toggleCoordFilterValue,
  toggleCoordFiltersPanel,
  toggleEditClienteSelector,
  toggleEditSector,
  toggleEditUser,
  toggleFinGroup,
  toggleJornadas,
  toggleNewUserForm,
  toggleParticipante,
  togglePhotos,
  togglePilotoAgenda,
  togglePropUbicacionOverride,
  toggleRecontactarFecha,
  toggleSvcUbicacionOverride,
  unarchive,
  verClienteDesdeContacto,
  verClienteDesdePropuesta,
  verClienteDesdeServicio,
  verMasKanban,
  verPropuestaDesdeServicio,
});
// ESTADO de módulo usado por handlers inline (oninput="editState.x=this.value"): accesores VIVOS,
// no copias — leen y escriben la variable ACTUAL del módulo aunque se reasigne (editState = {...}).
Object.defineProperties(window, {
  COORD_PAGE_SIZE: { get: () => COORD_PAGE_SIZE, configurable: true },
  _docState: { get: () => _docState, set: v => { _docState = v; }, configurable: true },
  _finanzasFilterCategoria: { get: () => _finanzasFilterCategoria, set: v => { _finanzasFilterCategoria = v; }, configurable: true },
  _finanzasFilterClase: { get: () => _finanzasFilterClase, set: v => { _finanzasFilterClase = v; }, configurable: true },
  _finanzasFilterTipo: { get: () => _finanzasFilterTipo, set: v => { _finanzasFilterTipo = v; }, configurable: true },
  _finanzasVisibleLimit: { get: () => _finanzasVisibleLimit, set: v => { _finanzasVisibleLimit = v; }, configurable: true },
  _porCobrarOnConfirm: { get: () => _porCobrarOnConfirm, set: v => { _porCobrarOnConfirm = v; }, configurable: true },
  _pvSets: { get: () => _pvSets, set: v => { _pvSets = v; }, configurable: true },
  ceoPeriod: { get: () => ceoPeriod, set: v => { ceoPeriod = v; }, configurable: true },
  cobroState: { get: () => cobroState, set: v => { cobroState = v; }, configurable: true },
  contactEditState: { get: () => contactEditState, set: v => { contactEditState = v; }, configurable: true },
  coordFilters: { get: () => coordFilters, set: v => { coordFilters = v; }, configurable: true },
  currentService: { get: () => currentService, set: v => { currentService = v; }, configurable: true },
  currentStep: { get: () => currentStep, set: v => { currentStep = v; }, configurable: true },
  editState: { get: () => editState, set: v => { editState = v; }, configurable: true },
  editingContact: { get: () => editingContact, set: v => { editingContact = v; }, configurable: true },
  editingProp: { get: () => editingProp, set: v => { editingProp = v; }, configurable: true },
  editingService: { get: () => editingService, set: v => { editingService = v; }, configurable: true },
  gastoState: { get: () => gastoState, set: v => { gastoState = v; }, configurable: true },
  ingresoState: { get: () => ingresoState, set: v => { ingresoState = v; }, configurable: true },
  jornadaState: { get: () => jornadaState, set: v => { jornadaState = v; }, configurable: true },
  newSvcState: { get: () => newSvcState, set: v => { newSvcState = v; }, configurable: true },
  pedidoState: { get: () => pedidoState, set: v => { pedidoState = v; }, configurable: true },
  propEditState: { get: () => propEditState, set: v => { propEditState = v; }, configurable: true },
  prospectoState: { get: () => prospectoState, set: v => { prospectoState = v; }, configurable: true },
  reportStepState: { get: () => reportStepState, set: v => { reportStepState = v; }, configurable: true },
  serviceState: { get: () => serviceState, set: v => { serviceState = v; }, configurable: true },
});
/* @globals:end */
