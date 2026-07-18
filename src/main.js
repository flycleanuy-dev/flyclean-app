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

import { TRANSLATIONS, t, currentLang, setCurrentLang, pedidoFmtFecha } from './i18n.js'; // diccionario + runtime de idioma — ver src/i18n.js
import { esc, toArr, msNames, compareVersions } from './util.js'; // utilidades puras — ver src/util.js
import { // lógica de dinero (pura, testeada por tests/calculos.test.mjs) — ver src/calculos.js
  tipoServicioList, tipoServicioStr, montoOf, esFinanciamiento, tipoInterno, esArchivado,
  kpiIncluido, kpiBadgeHTML, fmtMoneda, sumByMoneda, fmtTotalSplit,
} from './calculos.js';
import { // asistente IA de ayuda — ver src/ayuda-bot.js (dependencias inyectadas con initAyudaBot)
  initAyudaBot, updateAyudaFab, resetAyudaBot, openAyudaBot, closeAyudaBot, ayudaOverlayClick, sendAyuda,
} from './ayuda-bot.js';
import { initErrores } from './errores.js'; // captura global de errores → /api/reporte (Fase A Soporte)
import { // bandeja 💬 Soporte (Fase B): reportar + mis reportes + bandeja Dirección — ver src/soporte.js
  initSoporte, openSoporte, closeSoporte, renderSoporteInline, sopSetVista, sopEnviar, sopMarcar,
} from './soporte.js';
import { // PDF de devolución (núcleo) — ver src/reporte.js (dependencias inyectadas con initReporte)
  initReporte, ensureJsPDF, ensureReportBrand, buildReportDoc, generateReportPDF,
} from './reporte.js';
import { // cola offline del operario sin señal — ver src/offline-queue.js (dependencias inyectadas con initOfflineQueue)
  initOfflineQueue, enqueueCreate, enqueuePhoto, processQueue, processPhotoQueue,
  queueableUpdateServiceProps, removePhotoQueueItem, renderOfflineBadge,
} from './offline-queue.js';
import { // subsistema de fotos — ver src/fotos.js (patrón puente initFotos)
  initFotos, ensurePhotosBucket, fotoTomada, handlePhotoSelect, finalizePhotoUpload, retryPhoto, removePhoto,
  openPhotoViewer, openPhotoViewerFor, closePhotoViewer, pvNav, pvRetry, openGalleryViewer, renderPhotoUploader,
  renderSectorPhotoUploader, sectorFotos, photosToNotionFiles, renderPhotoGallery, togglePhotos, extractServiceFiles,
  PHOTO_MAX_BYTES, PHOTO_ALLOWED_MIMES,
} from './fotos.js';
import { // prospección/ventas — ver src/prospeccion.js (patrón puente initProspeccion)
  initProspeccion, renderProspeccionList, prospAccion, prospectoOverlayClick, closeProspectoSheet,
  abrirProspectoMapa, openProspectoSheet, prospectoSetOrigen, prospectoToggleInteres, saveProspecto,
} from './prospeccion.js';
import { // equipos/flota — ver src/equipos.js (patrón puente initEquipos)
  initEquipos, renderCoordEquipos, eqResolverProblema, eqSlot, eqCloseSlot, eqCheckForm, eqCheckSave,
  eqServiceForm, eqServiceSave, eqEditForm, eqDeleteEquipo, eqEditSave, eqHistToggle, closeMisEquipos,
  openMisEquipos, misEqSave, misEqToggleProblem, misEqReportProblem, eqToggleAlta, eqAltaSave,
  fetchEquiposDelServicio, renderEquiposChips, openAddEquipoSheet, closeAddEquipoSheet, addEquipoToServicio,
  removeEquipoFromServicio, fetchActivosDisponibles, eqProblemaAbierto,
} from './equipos.js';
import { // mi historial de trabajos — ver src/historial.js (patrón puente initHistorial)
  initHistorial, amHistorial, closeHistorialSheet, historialOverlayClick, histEditNota, histSaveNota,
} from './historial.js';
import { // pedidos/compras de insumos — ver src/pedidos.js (patrón puente initPedidos)
  initPedidos, pedidoPaisDelUser, pedidoPrioClass, pedidoEstadoClass, openNuevoPedidoSheet, closePedidoSheet,
  pedidoOverlayClick, loadMisPedidos, renderPedidoSheet, savePedido, renderCoordPedidos, setCoordPedidosFilter,
  renderCoordPedidosList, coordPedidoCard, marcarPedidoRecibido, marcarPedidoComprado, cancelarPedido,
} from './pedidos.js';
import { // banner de alertas/avisos por rol — ver src/alertas.js (patrón puente initAlertas)
  initAlertas, isAlertDismissed, dismissAlertKey, dismissAlert, renderAlertsBanner, toggleAlertsList, loadAlerts,
} from './alertas.js';
import { // CLIENTES/CRM: vista + ficha 360 + secciones + historial — ver src/clientes.js (initClientes)
  initClientes, ensureClienteNombres, clienteNombreDe, clienteNombre, clientePais,
  fetchPropsYSvcsParaSecciones, computeClienteSecciones, loadClienteSecciones, cargarMasContactos,
  refreshContactsView, renderClientesView, renderCoordContactos, renderContactList, filterContacts,
  abrirWhatsAppCliente, setProximoContacto, marcarClienteContactado, toggleRecontactarFecha,
  confirmarRecontactarFecha, openContactSheet, verClienteDesdeContacto, openNewContactSheet, contactSetField,
  contactToggleMulti, contactOpenMapa, renderContactSectores, contactAddSector, contactRenameSector,
  contactRemoveSector, loadContactIntermediarios, contactIntermediarioChanged, contactOverlayClick,
  closeContactSheet, saveContactEdit, loadContactHistory, clienteNombresCargados, setClienteNombre,
} from './clientes.js';
import { // maquinaria de la pantalla del coordinador — ver src/coord-servicios.js (initCoordServicios)
  initCoordServicios, applyCoordFilters, cambiarEstadoServicio, cargarMasCoord, changeCoordMonth, clearCoordFilters, closeCoordFilterSheet, closeMoverEstado, coordCardThumb, coordFilterOverlayClick, coordServiceCard, ensureMoverEstadoOverlay, fetchCoordItemsForMonth, filtrarServicios, getActiveFilterCount, getCoordMonthRange, groupServicesByDay, isCoordToolbarVisible, jobCompleto, jobGroup, jobRootId, kbAutoScrollTick, kbCleanupDrag, kbMakeGhost, kbOnPointerCancel, kbOnPointerDown, kbOnPointerMove, kbOnPointerUp, kbResolveDrop, kbSuppressNextClick, loadCoordinator, moverEstadoOverlayClick, onCoordSearchInput, openMoverEstado, refreshCoordFilterBadge, refreshCoordFilterSheetIfOpen, renderCargarMasButton, renderCoordCalendar, renderCoordChips, renderCoordFiltersPanel, renderCoordInicio, renderCoordKanban, renderCoordList, renderCoordPruebas, renderCoordRelevamientos, renderCoordServicios, renderCoordServiciosView, renderWeekStrip, rerenderActiveCoordTab, seleccionarMoverEstado, setCoordDateRange, setCoordDay, setCoordSort, setCoordView, showCoordToolbar, toggleCoordFilterValue, toggleCoordFiltersPanel, uniqueValues, updateCoordApplyBtn, verMasKanban,
} from './coord-servicios.js';
import { // MOTOR del operario — ver src/operario.js (initOperario)
  initOperario, _cierreResultadoOk, _ejecutarCierre, buildIncrementalProps, buildJornadaSiguienteProps, cancelarInicio, cerrarServicio, checklistPreContinue, cierreSectoresElegir, cierreSectoresOverlayClick, closeCierreSectoresModal, closeCreateJornadaSheet, closeSectorOverlay, computeNextJornadaNumero, computeStepFromState, continuarCierreEfectivo, continuarInicioEfectivo, fichaRelevFinalizar, fichaRelevGuardarMapa, finishAndGoBack, flushPendingPhotosIfNeeded, getEstadoClass, goBack, goToStep, hydrateServiceStateFromLocal, hydrateServiceStateFromNotion, iniciarServicio, isoNow, jornadaOverlayClick, loadPilotoAgenda, loadServices, marcarSectorHecho, nextStep, openCierreSectoresModal, openCreateJornadaSheet, openSectorOverlay, openService, persistServiceState, persistServiceStateToLocal, refreshSectorOverlayIfOpen, registrarCierreEfectivo, registrarInicioEfectivo, relevEditableHoy, relevToggleDif, relevToggleSugerido, renderCancelarBanner, renderPilotoAgenda, renderSectorOverlay, renderServices, renderStep, renderStepNav, requestUserLocationWithConsent, sectorOverlayClick, sectoresAvancePct, selectClima, selectFinalizacion, selectHerramientaManual, selectJornadaOperario, selectMetodoTrabajo, selectResultado, selectResultadoPrueba, servicioContinua, servicioTieneSectores, showDoneScreen, storageKeyForService, submitCreateJornada, timeNow, toggleCheck, togglePilotoAgenda,
} from './operario.js';
import { // propuestas — seguimiento (p1) + sheet crear/editar (p2) — ver src/propuestas.js (initPropuestas)
  initPropuestas, propDias, renderContactarHoyHTML, toggleContactarHoy, openContactarHoy,
  patchPropUltimaInteraccionHoy, marcarPropContactada, abrirWhatsAppProp,
  propClienteInputsHTML, propClienteSectionHTML, verClienteDesdePropuesta, propClienteChanged,
  loadPropContactos, openNewPropSheet, openPropSheet, deletePropuesta, linkServicioEnPropuesta,
  propTieneServicio, createServicioFromPropuesta, createPruebaFromPropuesta, createRelevamientoFromPropuesta,
  propSetField, updateCreateSvcBtnVisibility, propOverlayClick, closePropSheet, savePropEdit,
  recontacteHoyDesdeSheet,
} from './propuestas.js';
import { // pantalla Gastos + sheet de carga con OCR — ver src/gastos.js (patrón puente initGastos)
  initGastos, gastosUserPaisFilter, openGastos, closeGastos, setGastosRange, setGastosScreenTab,
  renderGastosScreen, fetchGastosDelServicio, renderGastosChipsCoord, openNuevoGastoSheet, closeGastoSheet,
  gastoOverlayClick, renderGastoSheet, onGastoReciboSelected, gastoSkipFoto, reanalyzeReceipt, saveGasto,
  renderReciboThumb,
} from './gastos.js';
import { // tab Finanzas + nuevo ingreso + editar cobro + reportes PDF — ver src/finanzas.js (initFinanzas)
  initFinanzas, fetchGastosForMonth, resetGastosCache, fetchIngresosForMonth, setFinanzasTab, renderGastosList,
  renderGastosListInner, renderIngresosList, renderIngresosListInner, ingresoOverlayClick, closeIngresoSheet,
  ingresoSetCliente, openNuevoIngresoSheet, renderIngresoSheet, saveIngreso, cobroOverlayClick, closeCobroSheet,
  openCobroSheet, cobroSetServicio, renderCobroSheet, saveCobroEdit, renderReportes, generateFinanceReportPDF,
  openServicePickerForReport, pickServiceReport, cargarMasFinanzas,
} from './finanzas.js';
import { // capa de red (proxy Notion / espejo Supabase / R2) — ver src/api.js (initApi inyecta forceRelogin + dbIds)
  initApi, callNotion, callDb, callNotionAll, updateServiceProps, syncAfterWrite,
  dbFlag, captureRenewedToken, isNetworkError, putPhotoToR2,
} from './api.js';
import { // dashboards CEO/Finanzas — ver src/dashboards.js (estado/consts quedan acá; puente initDashboards)
  initDashboards, adminAccountsHTML, adminBajaUser, adminEditUser, adminHardDeleteUser, adminNewUser,
  adminReactivarUser, adminSetPin, asignarPrecioContrato, asociarCobro, backFromCEO, closePorCobrarPlan,
  cubrirServicio, goToCEOFromCoord, isAppAdmin, nuSyncId, openServicioQuickView, refreshCEO,
  renderCEOCountryTabs, renderCEOEquipo, renderCEOFinanzas, renderCEOMetricas, renderCEOServicios, generateCEOExecPDF,
  renderCeoComBody, renderPorCobrar, setCEOCountry, setCEOFinCurrency, setCEOPeriodMode, setCEORange,
  setCEOTab, setCeoRentaView, shiftCEOPeriod, toggleBajaPanel, toggleCeoAcc, toggleEditUser, toggleFinGroup,
  toggleNewUserForm,
} from './dashboards.js';

// Captura global de errores lo más TEMPRANO posible (así cubre incluso fallos del propio arranque de
// main). Los getters del puente son perezosos → no hay problema de TDZ con lets declarados más abajo
// (y errores.js envuelve todo acceso en try/catch).
initErrores({
  get APP_VERSION() { return APP_VERSION; },
  get activeCoordTab() { return activeCoordTab; },
  _activeScreenId: (...a) => _activeScreenId(...a),
});

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
// filtrarServicios → src/coord-servicios.js (importada arriba).

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
// Filtro Notion de país para la pantalla "💸 Gastos" (operario/coord/CEO). Basado en el país del USUARIO
// gastosUserPaisFilter → src/gastos.js (filtro país de la pantalla Gastos).
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

// STEPS_* del wizard del operario → src/operario.js.

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
// Estado de "Por cobrar" (los renderers viven en src/dashboards.js y lo acceden vía el puente M; se declara
// ACÁ porque los handlers inline lo usan → necesita su accesor de window, que solo main puede publicar).
let _porCobrarCtx = null;
let _porCobrarData = null; // dataset indexado del último render (lo usan cubrirServicio/asignarPrecioContrato)
let _porCobrarOnConfirm = null;
let currentService = null;
let currentStep = 0;
// Normaliza a array de strings: array→igual, string→[string], null/''→[]. Usado por los campos que
// pasaron de select (string) a multi_select (array): metodoTrabajo, herramientaManual (tolera legacy).
let serviceState = {};
let activeTab = 'ordenes';
let _allServices = [];
let activeCoordTab = 'inicio';
let selectedCoordDay = null;
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
let contactEditState = {};
let editingService = null;
let editState = {};
let editingProp = null;
let propEditState = {};
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

// ─────────────────────────────────────────────
// NOTION API
// ─────────────────────────────────────────────
// ── CAPA DE RED — movida a src/api.js el 16/07 (callNotion/callDb/callNotionAll/updateServiceProps/
// syncAfterWrite/dbFlag/captureRenewedToken/putPhotoToR2/isNetworkError). initApi le inyecta forceRelogin
// y los IDs de bases para el ruteo al espejo. El interruptor central DB_FLAGS vive ahora en api.js.
// ── FOTOS — cableado (el estado serviceState/currentService vive acá; los helpers ahora vienen de operario.js).
initFotos({
  get serviceState() { return serviceState; }, set serviceState(v) { serviceState = v; },
  get currentService() { return currentService; }, set currentService(v) { currentService = v; },
  escAttrEdit, persistServiceState, refreshSectorOverlayIfOpen, renderStep, storageKeyForService,
});

initApi({
  forceRelogin: () => forceRelogin(),
  dbIds: { servicios: DB_ID, clientes: CONTACTOS_DB_ID, propuestas: PROPUESTAS_DB_ID, gastos: GASTOS_DB_ID, ingresos: INGRESOS_DB_ID },
});

// Mapa id→nombre de clientes (ensureClienteNombres/clienteNombreDe) → src/clientes.js (importadas arriba).
// setClienteNombre → src/clientes.js (importada arriba).


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
            { property: 'Estado', select: { equals: '✈️ En curso' } },
            // Relevamientos finalizados HOY: siguen visibles para su operario hasta fin del día (re-edición).
            { property: 'Estado', select: { equals: '✅ Completado' } }
// persistencia/hidratación del serviceState + computeStep + servicioContinua → src/operario.js.
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
    const editableHoy = relevEditableHoy(props); // relevamiento ✅ de HOY: editable por su operario hasta fin del día
    return (validStates.includes(estado) || editableHoy) && esAsignado && paisOk;
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
// ── COLA OFFLINE — movida a src/offline-queue.js el 16/07. Guarda writes y fotos del operario SIN SEÑAL
// (IndexedDB) y los drena al reconectar. main le inyecta lo que necesita para hablar con Notion/R2 y
// refrescar la vista. initOfflineQueue arranca además los listeners online/offline y el reintento de 30s.
initOfflineQueue({ callNotion, DB_ID, putPhotoToR2, finalizePhotoUpload, updateServiceProps, isNetworkError });

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
let _finanzasFilterCategoria = '';
let _finanzasFilterClase = '';
let _finanzasFilterTipo = '';

// FINANZAS operativa (tab listas + nuevo ingreso + editar cobro + reportes PDF) → src/finanzas.js (initFinanzas).
// ── Nuevo ingreso / pago manual (Finanzas) — sin IA, carga 100% manual. ──
let ingresoState = null;
let cobroState = null;


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
// ─────────────────────────────────────────────
// MONEDA — fuente de verdad única para leer / formatear / sumar montos.
// Antes la app guardaba todo en "Monto USD" e ignoraba la moneda al mostrar
// (los pesos se veían como dólares). Estos helpers respetan la moneda real.
// Fallback a "Monto USD" para registros legacy aún no migrados.
// ─────────────────────────────────────────────
// (Bloque de dinero movido a src/calculos.js el 16/07 — importado arriba. Test: tests/calculos.test.mjs)


let gastoState = null;



// ─────────────────────────────────────────────
// SOLICITUD DE COMPRAS (pedidos de insumos)
// El operario (o coord) pide un insumo → se guarda en Notion.
// El coordinador lo ve en la tab 📦 Pedidos y lo marca como comprado.
// ─────────────────────────────────────────────
let pedidoState = null;
// PEDIDOS / COMPRAS → src/pedidos.js (patrón puente initPedidos). Solo queda acá `pedidoState` (arriba,
// lo tocan handlers inline → gen-globals publica su accesor) y los IDs SOLICITUDES_DB_ID/DS_ID.

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
// clienteNombre/clientePais → src/clientes.js (importadas arriba).
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
  renderCEOCountryTabs();
  // Fase CEO 1 (2026-07-18): el panel arranca en 🏠 Inicio (el puesto de mando). setCEOTab hace todo
  // el toggle de tabs + ocultar los country-tabs globales (Inicio trae selector propio).
  await setCEOTab('inicio');
}

// ── DASHBOARDS CEO/Finanzas — movidos a src/dashboards.js el 16/07. El estado y las consts quedan
// ACÁ (los accesores de window de los handlers no cambian); el módulo los accede vía este puente.
initDashboards({
  get _ceoComData() { return _ceoComData; }, set _ceoComData(v) { _ceoComData = v; },
  get _ceoContentId() { return _ceoContentId; }, set _ceoContentId(v) { _ceoContentId = v; },
  get _ceoProspData() { return _ceoProspData; }, set _ceoProspData(v) { _ceoProspData = v; },
  get _ceoRentaData() { return _ceoRentaData; }, set _ceoRentaData(v) { _ceoRentaData = v; },
  get _ceoRentaView() { return _ceoRentaView; }, set _ceoRentaView(v) { _ceoRentaView = v; },
  get _ceoRerender() { return _ceoRerender; }, set _ceoRerender(v) { _ceoRerender = v; },
  get _ceoServiciosAll() { return _ceoServiciosAll; }, set _ceoServiciosAll(v) { _ceoServiciosAll = v; },
  get _ceoServiciosCache() { return _ceoServiciosCache; }, set _ceoServiciosCache(v) { _ceoServiciosCache = v; },
  get _porCobrarCtx() { return _porCobrarCtx; }, set _porCobrarCtx(v) { _porCobrarCtx = v; },
  get _porCobrarData() { return _porCobrarData; }, set _porCobrarData(v) { _porCobrarData = v; },
  get _porCobrarOnConfirm() { return _porCobrarOnConfirm; }, set _porCobrarOnConfirm(v) { _porCobrarOnConfirm = v; },
  get activeCEOTab() { return activeCEOTab; }, set activeCEOTab(v) { activeCEOTab = v; },
  get ceoFinCurrency() { return ceoFinCurrency; }, set ceoFinCurrency(v) { ceoFinCurrency = v; },
  get ceoPeriod() { return ceoPeriod; }, set ceoPeriod(v) { ceoPeriod = v; },
  get ceoViewCountry() { return ceoViewCountry; }, set ceoViewCountry(v) { ceoViewCountry = v; },
  get currentUser() { return currentUser; }, set currentUser(v) { currentUser = v; },
  get CONTACTOS_DB_ID() { return CONTACTOS_DB_ID; },
  get COUNTRY_FINANCE_MAP() { return COUNTRY_FINANCE_MAP; },
  get COUNTRY_NOTION_MAP() { return COUNTRY_NOTION_MAP; }, get DB_ID() { return DB_ID; },
  get DB_ID() { return DB_ID; },
  get EQUIPO_DB_ID() { return EQUIPO_DB_ID; },
  get GASTOS_DB_ID() { return GASTOS_DB_ID; },
  get DOCUMENTOS_DB_ID() { return DOCUMENTOS_DB_ID; },
  get INGRESOS_DB_ID() { return INGRESOS_DB_ID; },
  get PROPUESTAS_DB_ID() { return PROPUESTAS_DB_ID; },
  get USERS() { return USERS; },
  get PROSPECCION_ESTADOS() { return PROSPECCION_ESTADOS; },
  clienteNombreDe, ensureClienteNombres, finRecEnPais, generateReportPDFFromCEO, getCEOFilter, getCEOFinanceFilter, jobCompleto, loadCEO, loadRoster, logout, openAccountMenu, openCobroSheet, openContactSheet, openEditSheetFromFinanzas, openNuevoGastoSheet, propTieneServicio, recEnPaisNotion, renderClientesView, resetGastosCache, saveCobroEdit, showScreen, translateRole,
});

let _coordFilteredCount = null; // total tras applyCoordFilters (lo escriben el módulo coord-servicios Y renderCoordPropuestasList)
let coordFilters = {
  search: '',
  estado: [],         // multi-select de estados a INCLUIR; vacío = todos
  pais: [],           // multi-select de países a INCLUIR; vacío = todos
  operario: [],       // multi-select de operarios; vacío = todos
  dateFrom: '',       // YYYY-MM-DD
  dateTo: '',         // YYYY-MM-DD
  sort: 'date-desc'   // por defecto: próximos arriba → hoy → pasados → sin fecha al final
};
let _pvSets = {}, _pvSetSeq = 0;
function _pvRegister(fotos) { if (_pvSetSeq > 800) { _pvSets = {}; } const k = 'pv' + (_pvSetSeq++); _pvSets[k] = fotos; return k; }

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
// COORD-SERVICIOS (filtros + vistas lista/Kanban/calendario + cards + fetch mes + renderers de tabs) → src/coord-servicios.js.
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
// MOTOR DEL OPERARIO (lista + wizard de pasos + iniciar/cerrar + jornadas + sectores) → src/operario.js (initOperario).
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
  // Fix F1 (extendido, auditoría 16/07): tipo de servicio y piloto/operarios TAMBIÉN se escriben solo si
  // cambiaron — antes se escribían siempre, así que abrir un servicio con el raw incompleto (lectura del
  // espejo) y guardar OTRA cosa (ej. asignar un piloto) borraba el Tipo de servicio a vacío en Notion.
  editState._tipoServiciosOrigJson = JSON.stringify(editState.tipoServicios || []);
  editState._operarioOrig = editState.operario || '';
  editState._pilotoOrig = editState.piloto || '';
  editState._operarioManualOrig = editState.operarioManual || '';
  editState._participantesOrigJson = JSON.stringify(editState.participantes || []);
  // Precio acordado + moneda (16/07): darle precio a los trabajos SUELTOS (sin propuesta) para "Por cobrar".
  // Moneda default por país (Uruguay→UY$, resto→USD), editable. F1: escribir solo si cambió.
  editState.precioAcordado = (props['Precio acordado']?.number != null) ? String(props['Precio acordado'].number) : '';
  editState.moneda = props['Moneda']?.select?.name || ((editState.pais || '').includes('Uruguay') ? '🇺🇾 UY$' : '🇺🇸 USD');
  editState._precioOrig = editState.precioAcordado;
  editState._monedaOrig = editState.moneda;
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
  const precioEl = document.getElementById('edit-precio'); if (precioEl) precioEl.value = editState.precioAcordado || '';
  renderEditMonedaBtns();
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


// ─────────────────────────────────────────────
// FEATURE B — EQUIPOS ASIGNADOS AL SERVICIO
// ─────────────────────────────────────────────
// La DB Notion 'Activos / Equipamiento' contiene drones, vehículos, etc.
// La DB intermedia 'Registro de Uso de Equipo' (RUE) vincula Activos ↔ Servicios.
// Cada page en RUE = 1 asignación de equipo a un servicio.

const ACTIVOS_DB_ID = NOTION_DBS.activos;
const RUE_DB_ID = NOTION_DBS.regTiempo;

let _activosCache = null; // { items, byPais: Map<pais, items[]> }
let _equiposDelServicio = []; // [{ rueId, activoId, activoName, activoTipo, activoSerie }]

// Trae todos los activos operativos. Cache simple (no cambian seguido).
// ── EQUIPOS/FLOTA — movido a src/equipos.js el 16/07 (patrón puente). _activosCache y _equiposDelServicio
// quedan acá (los usa el flujo del operario/coord); el módulo los accede vía initEquipos.
initEquipos({
  get COUNTRY_FINANCE_MAP() { return COUNTRY_FINANCE_MAP; }, get ACTIVOS_DB_ID() { return ACTIVOS_DB_ID; },
  get RUE_DB_ID() { return RUE_DB_ID; }, get USERS() { return USERS; },
  get _activosCache() { return _activosCache; }, set _activosCache(v) { _activosCache = v; },
  get _equiposDelServicio() { return _equiposDelServicio; }, set _equiposDelServicio(v) { _equiposDelServicio = v; },
  get currentUser() { return currentUser; }, set currentUser(v) { currentUser = v; },
  get activeCoordTab() { return activeCoordTab; }, set activeCoordTab(v) { activeCoordTab = v; },
  get editingService() { return editingService; }, set editingService(v) { editingService = v; },
  esDireccion, esVentas, showSaving,
});

// Trae los equipos ya asignados a un servicio. Filtra por relation Servicio.
// ═══════════════════════════════════════════════════════════════════════════
// 🔧 EQUIPOS (flota) — v167. Tab del coordinador (país-scoped; Dirección global; Ventas bloqueada).
// Inventario + check mensual + services + estado + historial por equipo (JSON en 'Historial equipo').
// La ÚNICA base es Activos (ya existía); el coord tiene create/patch en la matriz server-side.
// ═══════════════════════════════════════════════════════════════════════════

// Equipos v2 — reporte de PROBLEMA del piloto: vive en el historial como evento 'problema' (lo abre el piloto)
// y 'resuelto' (lo cierra el coordinador). Abierto = el último 'problema' es posterior al último 'resuelto'.
// Cero property/permiso nuevo: 'Historial equipo' ya lo escriben tanto el operario (misEqSave) como el coord (eqPatch).



// escribe historial + optimista + re-render). El helper eqProblemaAbierto deja de verlo abierto.

// Append de un evento al historial del equipo + PATCH de las properties dadas (una sola escritura).

// ✅ Check mensual: km (vehículo) / horas (drone) + nota → Último check + valores + historial.

// 🔧 Service: registra el mantenimiento hecho + agenda el próximo.

// ✏️ Editar datos base + estado.

// 🗑️ Eliminar equipo: archiva la página en Notion (in_trash) — mismo patrón que deleteService. Sale de la
// lista pero es recuperable 30 días en la papelera de Notion (no se pierde el historial). Para apartar un
// equipo SIN sacarlo, está el estado "❌ Fuera de servicio" en el select.

// 📜 Historial del equipo (eventos del JSON).

// ── 🔧 MIS EQUIPOS (Equipos v2) — reporte semanal del RESPONSABLE (operario/piloto): carga el TOTAL del
// contador (km vehículo / horas dron) + nota opcional. Vence el viernes; la alerta la trae loadAlerts.
function miseqOverlayClick(ev) { if (ev.target === ev.currentTarget) closeMisEquipos(); }

// Reporte de un PROBLEMA del dron/equipo por el piloto responsable (canal separado del reporte de horas).
// Queda como evento 'problema' en el Historial equipo → alerta al coordinador (loadAlerts) hasta que lo resuelva.

// ＋ Alta de equipo nuevo.




function equipoOverlayClick(e) { if (e.target.id === 'equipo-overlay') closeAddEquipoSheet(); }



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
// Selector de moneda del precio acordado (UY$/USD) en el sheet de edición.
function renderEditMonedaBtns() {
  const el = document.getElementById('edit-moneda-btns'); if (!el) return;
  el.innerHTML = ['🇺🇾 UY$', '🇺🇸 USD'].map(m =>
    `<button class="estado-btn ${editState.moneda === m ? 'active' : ''}" onclick="selectEditMoneda('${m}')">${m}</button>`).join('');
}
function selectEditMoneda(m) {
  editState.moneda = m;
  document.querySelectorAll('#edit-moneda-btns .estado-btn').forEach(b => b.classList.toggle('active', b.textContent.trim() === m));
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
    // Fix F1: piloto/operarios solo si cambiaron (una lectura rota no los borra al guardar otra cosa).
    if ((editState.operario || '') !== editState._operarioOrig)
      props['Operario App'] = editState.operario ? { select: { name: editState.operario } } : { select: null };
    if ((editState.piloto || '') !== editState._pilotoOrig)
      props['Piloto'] = editState.piloto ? { select: { name: editState.piloto } } : { select: null };
    if ((editState.operarioManual || '') !== editState._operarioManualOrig)
      props['Operario manual'] = editState.operarioManual ? { select: { name: editState.operarioManual } } : { select: null };
    if ((editState.operario || '') !== editState._operarioOrig) {
      const userForOp = editState.operario ? USERS.find(u => u.name === editState.operario) : null;
      if (userForOp?.notionId) props['Operario(s)'] = { people: [{ object: 'user', id: userForOp.notionId }] };
    }
    // Operarios participantes (multi_select), solo si cambiaron. Si la property no existe en Notion,
    // Notion ignora la key silenciosamente sin romper el resto del PATCH.
    const participantes = Array.isArray(editState.participantes) ? editState.participantes : [];
    if (JSON.stringify(participantes) !== editState._participantesOrigJson)
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
    // multi_select desde 2026-07-04 (antes select). Fix F1 (16/07): solo si cambió — antes se escribía
    // SIEMPRE, y abrir un servicio con lectura rota (tipo → []) + guardar otra cosa lo borraba en Notion.
    if (JSON.stringify(editState.tipoServicios || []) !== editState._tipoServiciosOrigJson)
      props['Tipo de servicio'] = { multi_select: (editState.tipoServicios || []).map(name => ({ name })) };
    // Precio acordado + Moneda (16/07): trabajos sueltos sin propuesta pueden tener precio para Por cobrar. F1: solo si cambió.
    if ((editState.precioAcordado || '') !== editState._precioOrig) {
      const nPrecio = parseFloat(editState.precioAcordado);
      props['Precio acordado'] = (editState.precioAcordado !== '' && !isNaN(nPrecio)) ? { number: nPrecio } : { number: null };
    }
    if ((editState.moneda || '') !== editState._monedaOrig)
      props['Moneda'] = editState.moneda ? { select: { name: editState.moneda } } : { select: null };
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


// ── Propuesta ligada a Cliente (Federico): elegir cliente existente o crear uno nuevo con tel/email.
// El tel/email van a la ficha del Cliente (fuente única) y la propuesta queda linkeada → todo el CRM se
// interconecta (los servicios creados desde la propuesta ya heredan el Contacto).
let _propContactos = null;
// SHEET de propuesta (crear/editar/borrar + selector cliente + creates + recontacté hoy) → src/propuestas.js parte 2.

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
  newSvcState = { tipoRegistro: '📋 Orden de trabajo', clienteSel: prefillContactId || '__new__', nombreCliente: '', tel: '', email: '', nombre: '', tipoServicios: [], fecha: hoyISO, pais: paisCoord, precioAcordado: '', moneda: (paisCoord.includes('Uruguay') ? '🇺🇾 UY$' : '🇺🇸 USD') };

  const TIPOS_REG = [
    { label: '🏢 Servicio', val: '📋 Orden de trabajo' },
    { label: '🔍 Relevamiento', val: '🔍 Relevamiento' },
    { label: '🧪 Prueba', val: '🧪 Prueba' },
  ];
  const TIPOS_SVC = ['🏢 Fachada', '🪟 Vidrios', '☀️ Paneles solares'];
  const tipoRegBtns = TIPOS_REG.map(o => `<button class="estado-btn ${newSvcState.tipoRegistro === o.val ? 'active' : ''}" onclick="newSvcSetTipoReg(this,'${o.val.replace(/'/g,"\\'")}')">${o.label}</button>`).join('');
  const tipoSvcBtns = TIPOS_SVC.map(o => `<button class="estado-btn ${newSvcState.tipoServicios.includes(o) ? 'active' : ''}" onclick="newSvcSetTipoSvc(this,'${o.replace(/'/g,"\\'")}')">${o}</button>`).join('');
  const monedaBtns = ['🇺🇾 UY$', '🇺🇸 USD'].map(m => `<button class="estado-btn ${newSvcState.moneda === m ? 'active' : ''}" onclick="newSvcSetMoneda(this,'${m}')">${m}</button>`).join('');

  document.getElementById('new-service-sheet-body').innerHTML =
    `<div class="edit-section"><div class="edit-section-label">${t('sheet.newsvc.section.tipo')}</div><div class="estado-btns" id="newsvc-tiporeg-btns">${tipoRegBtns}</div></div>` +
    newSvcClienteSectionHTML() +
    `<div class="edit-section"><div class="edit-section-label">${t('sheet.newsvc.section.nombre')}</div>
      <input type="text" class="edit-date-input" placeholder="${t('sheet.newsvc.nombre.placeholder')}" oninput="newSvcState.nombre=this.value" style="font-size:14px"/></div>` +
    `<div class="edit-section"><div class="edit-section-label">${t('sheet.newsvc.section.tiposervicio')}</div><div class="estado-btns" id="newsvc-tiposvc-btns">${tipoSvcBtns}</div></div>` +
    `<div class="edit-section"><div class="edit-section-label">${t('sheet.newsvc.section.fecha')}</div>
      <input type="date" class="edit-date-input" value="${newSvcState.fecha}" onchange="newSvcState.fecha=this.value"/></div>` +
    `<div class="edit-section"><div class="edit-section-label">${t('sheet.newsvc.section.precio')}</div>
      <input type="number" min="0" step="1" class="edit-date-input" placeholder="${t('sheet.newsvc.precio.placeholder')}" oninput="newSvcState.precioAcordado=this.value"/>
      <div class="estado-btns" id="newsvc-moneda-btns" style="margin-top:6px">${monedaBtns}</div></div>`;

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
function newSvcSetMoneda(el, m) {
  newSvcState.moneda = m;
  document.querySelectorAll('#newsvc-moneda-btns .estado-btn').forEach(b => b.classList.remove('active'));
  if (el) el.classList.add('active');
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
    // Precio acordado (trabajos sueltos): si se cargó, va con su moneda → Por cobrar lo toma sin propuesta.
    const nPrecioNew = parseFloat(s.precioAcordado);
    if ((s.precioAcordado || '') !== '' && !isNaN(nPrecioNew)) {
      properties['Precio acordado'] = { number: nPrecioNew };
      properties['Moneda'] = { select: { name: s.moneda || '🇺🇸 USD' } };
    }
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

// mismo patrón que ya usa 'Limpieza' para traer TODO y cruzar cliente-side). Devuelve null en el
// campo que no se pudo traer — nunca tira: el caller decide qué hacer con lo que falte.
// ─────────────────────────────────────────────

// ── Secciones especiales de la vista Clientes (spec 2026-07-02) ────────────────────────────
// 9 meses sin trabajo. Constante fija en v1 (sin configuración por cliente todavía).
// El umbral de mantenimiento vive en cfgRegla('mantenimientoDias') (270 = ~9 meses por defecto, editable en ⚙️).
// Estados terminales del pipeline de Propuestas — cualquier otro estado se considera "abierto"
// (en curso), mismo criterio que usa el cron diario (api/cron-pipeline.js) y loadAlerts().
const PROP_ESTADOS_TERMINALES = ['✅ Aceptada', '❌ Rechazada', '😶 Sin respuesta'];

// Clasificación cacheada de M._coordAllContacts en las 3 secciones especiales + cartera activa.
// null = no se pudo calcular (faltan propuestas/servicios) → renderContactList cae a la lista
// plana de siempre (grouping es un plus, nunca un bloqueo). La recalcula loadClienteSecciones()
// cada vez que se (re)carga la tab Clientes; renderContactList (search/paginado) la reusa tal cual.
let _coordCliSecciones = null;

// Secciones de la vista Clientes (fetch/compute/load) → src/clientes.js.

// ── 🎯 Prospección (spec 2026-07-02 B2) ─────────────────────────────────────────────────────
// Reusa la DB Clientes (nada de bases nuevas): el prospecto ES un cliente en uno de estos 4
// estados nuevos del select "Estado" (las opciones "de cartera" — 🆕 Lead / ✅ Cliente activo /
// ⏸️ Inactivo — ya existían y no se tocan). Notion crea las opciones nuevas solo con escribirlas.
// Fix pass (revisión adversarial, ver task-prospeccion-report.md): computeClienteSecciones ahora
// excluye estos estados al toque (return temprano en el forEach) → un prospecto NUNCA contamina
// "Cartera activa" ni ninguna otra sección de la tab 👥 Clientes; vive y se opera solo desde 🎯.
const PROSPECCION_ESTADOS = ['🎯 Prospecto', '📵 Prospecto contactado', '🤝 Interesado', '❌ Descartado'];
// ORIGEN_LEAD_OPTIONS, INTERES_OPTIONS y buildProspectoSheetBody se movieron a src/prospeccion.js (16/07).
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

// ── PROSPECCIÓN/VENTAS — movida a src/prospeccion.js el 16/07 (patrón puente). El estado (prospectoState,
// etc.) y las funciones que usa quedan acá; el módulo los accede vía initProspeccion.
initProspeccion({
  get COUNTRY_NOTION_MAP() { return COUNTRY_NOTION_MAP; }, get CONTACTOS_DB_ID() { return CONTACTOS_DB_ID; },
  get _coordAllProspectos() { return _coordAllProspectos; }, set _coordAllProspectos(v) { _coordAllProspectos = v; },
  get _propContactos() { return _propContactos; }, set _propContactos(v) { _propContactos = v; },
  get currentUser() { return currentUser; }, set currentUser(v) { currentUser = v; },
  get selectedCountry() { return selectedCountry; }, set selectedCountry(v) { selectedCountry = v; },
  get prospectoState() { return prospectoState; }, set prospectoState(v) { prospectoState = v; },
  abrirWhatsAppProspecto, cambiarEstadoServicio, cfgRegla, esDireccion, esVentas, markUserActive, openContactSheet, openNewPropSheet,
});


// Acciones de un toque (spec): 'contactado' | 'interesado' | 'descartar'. Optimista (mismo patrón que
// cambiarEstadoServicio): muta en memoria + re-pinta al instante; revierte + avisa si el write falla.

// ── Alta rápida de prospecto (sheet, overlay sibling de body: ver comentario junto a
// #prospecto-overlay) — 20 segundos por prospecto, spec 2026-07-02 B2. ──────────────────────
let prospectoState = {};
// Abre el link de mapa recién tipeado en el alta de prospecto (mismo gesto que 'Abrir mapa' en otros lados).


// CLIENTES (vista + ficha 360 + historial) → src/clientes.js (initClientes). La caché del historial
// queda ACÁ (la limpia closeEditSheet):
const _contactHistoryCache = {};

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
// PROPUESTAS (seguimiento comercial: A contactar hoy, marcar contactado, WhatsApp) → src/propuestas.js (initPropuestas).
// Botón "📞 Recontacté hoy" del sheet de propuesta (2026-07-09): marca última interacción = hoy sin abrir el
// date-picker ni esperar a los 15 días. Reusa el mismo núcleo (memoria + mirror sincronizados). Actualiza el
// input de fecha visible + propEditState para que un Guardar posterior NO pise la fecha con el valor viejo.

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
// ALERTAS (banner de avisos por rol) → src/alertas.js (patrón puente initAlertas).

// ─────────────────────────────────────────────
// COMUNICACIONES (placeholder)
// ─────────────────────────────────────────────
function renderComunicaciones() {
  // Fase B Soporte (2026-07-18): la tab Mensajes deja de ser placeholder — es la bandeja 💬 Soporte
  // (reportar problema + mis reportes; Dirección además ve la bandeja completa con visto/resuelto).
  const isCEO = currentUser?.role === '👔 CEO' || currentUser?.role === '🎯 Dirección';
  const contentId = isCEO && document.querySelector('#screen-ceo.active') ? 'ceo-content' : 'coord-content';
  renderSoporteInline(contentId);
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
function amSoporte() { closeAccountMenu(); openSoporte(); }
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
// ── MI HISTORIAL — movido a src/historial.js el 16/07 (patrón puente).
initHistorial({
  get COUNTRY_NOTION_MAP() { return COUNTRY_NOTION_MAP; },
  get currentUser() { return currentUser; }, set currentUser(v) { currentUser = v; },
  closeAccountMenu, forceRelogin, getMyServices, participaEn, showSaving,
});
initPedidos({
  get currentUser() { return currentUser; },
  get activeCoordTab() { return activeCoordTab; },
  get pedidoState() { return pedidoState; }, set pedidoState(v) { pedidoState = v; },
  get SOLICITUDES_DB_ID() { return SOLICITUDES_DB_ID; },
  get SOLICITUDES_DS_ID() { return SOLICITUDES_DS_ID; },
  esVentas, showSaving,
});
initSoporte({
  get currentUser() { return currentUser; },
  get APP_VERSION() { return APP_VERSION; },
  isAppAdmin,
});
initAlertas({
  get currentUser() { return currentUser; },
  get selectedCountry() { return selectedCountry; },
  get ceoViewCountry() { return ceoViewCountry; },
  get COUNTRY_FINANCE_MAP() { return COUNTRY_FINANCE_MAP; },
  get COUNTRY_NOTION_MAP() { return COUNTRY_NOTION_MAP; },
  get ACTIVOS_DB_ID() { return ACTIVOS_DB_ID; },
  get DB_ID() { return DB_ID; },
  get PROPUESTAS_DB_ID() { return PROPUESTAS_DB_ID; },
  get CONTACTOS_DB_ID() { return CONTACTOS_DB_ID; },
  get SOLICITUDES_DB_ID() { return SOLICITUDES_DB_ID; },
  get DOCUMENTOS_DB_ID() { return DOCUMENTOS_DB_ID; },
  esVentas, cfgRegla, getCountryFilter, getCEOFilter, computeClienteSecciones, fetchPropsYSvcsParaSecciones,
});
initClientes({
  get _coordAllContacts() { return _coordAllContacts; }, set _coordAllContacts(v) { _coordAllContacts = v; },
  get editingContact() { return editingContact; }, set editingContact(v) { editingContact = v; },
  get contactEditState() { return contactEditState; }, set contactEditState(v) { contactEditState = v; },
  get _coordCliSecciones() { return _coordCliSecciones; }, set _coordCliSecciones(v) { _coordCliSecciones = v; },
  get _coordVisibleLimit() { return _coordVisibleLimit; }, set _coordVisibleLimit(v) { _coordVisibleLimit = v; },
  get _propContactos() { return _propContactos; }, set _propContactos(v) { _propContactos = v; },
  get _contactHistoryCache() { return _contactHistoryCache; },
  get currentUser() { return currentUser; },
  get activeCoordTab() { return activeCoordTab; },
  get CONTACTOS_DB_ID() { return CONTACTOS_DB_ID; },
  get COORD_PAGE_SIZE() { return COORD_PAGE_SIZE; },
  get DB_ID() { return DB_ID; },
  get PROPUESTAS_DB_ID() { return PROPUESTAS_DB_ID; },
  get PROP_ESTADOS_TERMINALES() { return PROP_ESTADOS_TERMINALES; },
  get PROSPECCION_ESTADOS() { return PROSPECCION_ESTADOS; },
  get INGRESOS_DB_ID() { return INGRESOS_DB_ID; },
  abrirWhatsApp, cfgRegla, cfgWa, esVentas, genSectorId, getCountryFilter, jobRootId, recEnPaisNotion,
  renderJornadaGroup, renderCargarMasButton, escAttrEdit,
});
initCoordServicios({
  get _coordAllServices() { return _coordAllServices; }, set _coordAllServices(v) { _coordAllServices = v; },
  get activeCoordTab() { return activeCoordTab; }, set activeCoordTab(v) { activeCoordTab = v; },
  get coordFilters() { return coordFilters; }, set coordFilters(v) { coordFilters = v; },
  get _coordVisibleLimit() { return _coordVisibleLimit; }, set _coordVisibleLimit(v) { _coordVisibleLimit = v; },
  get COORD_PAGE_SIZE() { return COORD_PAGE_SIZE; },
  get currentUser() { return currentUser; },
  get selectedCountry() { return selectedCountry; },
  get COUNTRY_NOTION_MAP() { return COUNTRY_NOTION_MAP; },
  get USERS() { return USERS; },
  get DB_ID() { return DB_ID; },
  get editingService() { return editingService; }, set editingService(v) { editingService = v; },
  get selectedCoordDay() { return selectedCoordDay; }, set selectedCoordDay(v) { selectedCoordDay = v; },
  get _coordFilteredCount() { return _coordFilteredCount; }, set _coordFilteredCount(v) { _coordFilteredCount = v; },
  get _operarioOptions() { return _operarioOptions; }, set _operarioOptions(v) { _operarioOptions = v; },
  get _coordAllProps() { return _coordAllProps; }, set _coordAllProps(v) { _coordAllProps = v; },
  get _coordAllContacts() { return _coordAllContacts; }, set _coordAllContacts(v) { _coordAllContacts = v; },
  esVentas, esDireccion, markUserActive, showScreen, setCoordTab, getCountryFilter, getEstadoClass,
  servicioContinua, renderCoordResumen, renderCoordPropuestasList, _pvRegister,
});
initOperario({
  get serviceState() { return serviceState; }, set serviceState(v) { serviceState = v; },
  get currentService() { return currentService; }, set currentService(v) { currentService = v; },
  get currentStep() { return currentStep; }, set currentStep(v) { currentStep = v; },
  get jornadaState() { return jornadaState; }, set jornadaState(v) { jornadaState = v; },
  get currentUser() { return currentUser; },
  get USERS() { return USERS; },
  get selectedCountry() { return selectedCountry; },
  get DB_ID() { return DB_ID; },
  get SERVICIOS_DS_ID() { return SERVICIOS_DS_ID; },
  get COUNTRY_NOTION_MAP() { return COUNTRY_NOTION_MAP; },
  get _activosCache() { return _activosCache; }, set _activosCache(v) { _activosCache = v; },
  get _equiposDelServicio() { return _equiposDelServicio; }, set _equiposDelServicio(v) { _equiposDelServicio = v; },
  get editingService() { return editingService; }, set editingService(v) { editingService = v; },
  get activeCoordTab() { return activeCoordTab; },
  get _allServices() { return _allServices; }, set _allServices(v) { _allServices = v; },
  get _coordAllServices() { return _coordAllServices; }, set _coordAllServices(v) { _coordAllServices = v; },
  get activeTab() { return activeTab; }, set activeTab(v) { activeTab = v; },
  get CHECKLIST_PRE() { return CHECKLIST_PRE; },
  get CHECKLIST_POST() { return CHECKLIST_POST; },
  showScreen, showSaving, markUserActive, escAttrEdit, closeEditSheet, participaEn, getMyServices,
  operariosDePais, resolveMapsUrl, resetServiceState, crearJornadaSiguiente, _ckAligned,
});
initPropuestas({
  get _coordAllProps() { return _coordAllProps; }, set _coordAllProps(v) { _coordAllProps = v; },
  get editingProp() { return editingProp; }, set editingProp(v) { editingProp = v; },
  get propEditState() { return propEditState; }, set propEditState(v) { propEditState = v; },
  get _propContactos() { return _propContactos; }, set _propContactos(v) { _propContactos = v; },
  get editingService() { return editingService; }, set editingService(v) { editingService = v; },
  get _editFromPorCobrar() { return _editFromPorCobrar; }, set _editFromPorCobrar(v) { _editFromPorCobrar = v; },
  get _coordCliSecciones() { return _coordCliSecciones; }, set _coordCliSecciones(v) { _coordCliSecciones = v; },
  get _contactHistoryCache() { return _contactHistoryCache; },
  get _coordAllContacts() { return _coordAllContacts; },
  get _coordAllServices() { return _coordAllServices; },
  get CONTACTOS_DB_ID() { return CONTACTOS_DB_ID; },
  get PROPUESTAS_DB_ID() { return PROPUESTAS_DB_ID; },
  get PROSPECCION_ESTADOS() { return PROSPECCION_ESTADOS; },
  get SERVICIOS_DS_ID() { return SERVICIOS_DS_ID; },
  abrirWhatsApp, cfgRegla, cfgWa, renderCoordPropuestasList,
  esVentas, openContactSheet, openEditSheet, renderCoordList, renderCoordPropuestas, renderCoordPruebas,
  renderCoordRelevamientos, renderCoordServicios, setCoordTab,
});
initGastos({
  get gastoState() { return gastoState; }, set gastoState(v) { gastoState = v; },
  get _coordAllServices() { return _coordAllServices; }, set _coordAllServices(v) { _coordAllServices = v; },
  get currentUser() { return currentUser; },
  get selectedCountry() { return selectedCountry; },
  get editingService() { return editingService; },
  get activeFinanzasTab() { return activeFinanzasTab; },
  get COUNTRY_FINANCE_MAP() { return COUNTRY_FINANCE_MAP; },
  get GASTOS_DB_ID() { return GASTOS_DB_ID; },
  get GASTOS_DS_ID() { return GASTOS_DS_ID; },
  esVentas, fetchCoordItemsForMonth, markUserActive, renderGastosList, resetGastosCache, setFinanzasTab,
  showSaving, showScreen,
});
initFinanzas({
  get activeFinanzasTab() { return activeFinanzasTab; }, set activeFinanzasTab(v) { activeFinanzasTab = v; },
  get ingresoState() { return ingresoState; }, set ingresoState(v) { ingresoState = v; },
  get cobroState() { return cobroState; }, set cobroState(v) { cobroState = v; },
  get _finanzasVisibleLimit() { return _finanzasVisibleLimit; }, set _finanzasVisibleLimit(v) { _finanzasVisibleLimit = v; },
  get _finanzasFilterCategoria() { return _finanzasFilterCategoria; }, set _finanzasFilterCategoria(v) { _finanzasFilterCategoria = v; },
  get _finanzasFilterClase() { return _finanzasFilterClase; }, set _finanzasFilterClase(v) { _finanzasFilterClase = v; },
  get _finanzasFilterTipo() { return _finanzasFilterTipo; }, set _finanzasFilterTipo(v) { _finanzasFilterTipo = v; },
  get _ceoContentId() { return _ceoContentId; }, set _ceoContentId(v) { _ceoContentId = v; },
  get _ceoRerender() { return _ceoRerender; }, set _ceoRerender(v) { _ceoRerender = v; },
  get ceoViewCountry() { return ceoViewCountry; }, set ceoViewCountry(v) { ceoViewCountry = v; },
  get currentUser() { return currentUser; },
  get COORD_PAGE_SIZE() { return COORD_PAGE_SIZE; },
  get GASTOS_DB_ID() { return GASTOS_DB_ID; },
  get INGRESOS_DB_ID() { return INGRESOS_DB_ID; },
  get INGRESOS_DS_ID() { return INGRESOS_DS_ID; },
  get DB_ID() { return DB_ID; },
  get CONTACTOS_DB_ID() { return CONTACTOS_DB_ID; },
  get _porCobrarCtx() { return _porCobrarCtx; }, set _porCobrarCtx(v) { _porCobrarCtx = v; },
  clienteNombre, finRecEnPais, getCEOFinanceFilter, markUserActive, openReportStep, recEnPaisNotion,
  renderCEOFinanzas, renderCargarMasButton, renderClientesView, renderPorCobrar,
});

function amMisEquipos() { closeAccountMenu(); openMisEquipos(); }
// ¿Participó esta persona en el servicio? (encargado / piloto / operario manual / ayudante)
function participaEn(props, nombre) {
  if ((props['Operario App']?.select?.name || '') === nombre) return t('hist.rol.encargado');
  if ((props['Piloto']?.select?.name || '') === nombre) return t('hist.rol.piloto');
  if ((props['Operario manual']?.select?.name || '') === nombre) return t('hist.rol.manual');
  if ((props['Operarios participantes']?.multi_select || []).some(o => o.name === nombre)) return t('hist.rol.ayudante');
  return null;
}

// Duración efectiva en minutos (Hora Inicio Efectivo → Hora Fin Efectivo), o null.





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
  amSoporte,
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
  closeSoporte,
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
  fichaRelevFinalizar,
  fichaRelevGuardarMapa,
  filterContacts,
  finishAndGoBack,
  gastoOverlayClick,
  gastoSkipFoto,
  generateCEOExecPDF,
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
  newSvcSetMoneda,
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
  openCreateJornadaSheet,
  openDocumentosSheet,
  openEditSheet,
  openEditSheetFromFinanzas,
  openGalleryViewer,
  openGastos,
  openHistoryItem,
  openMisEquipos,
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
  selectEditMoneda,
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
  sopEnviar,
  sopMarcar,
  sopSetVista,
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
  openContactarHoy: { get: () => openContactarHoy, configurable: true },
  pedidoState: { get: () => pedidoState, set: v => { pedidoState = v; }, configurable: true },
  propEditState: { get: () => propEditState, set: v => { propEditState = v; }, configurable: true },
  prospectoState: { get: () => prospectoState, set: v => { prospectoState = v; }, configurable: true },
  reportStepState: { get: () => reportStepState, set: v => { reportStepState = v; }, configurable: true },
  serviceState: { get: () => serviceState, set: v => { serviceState = v; }, configurable: true },
});
/* @globals:end */
