// v84: editar nombres (clientes/servicios) + Panel 🧹 Limpieza (solo Dirección): detector+fusión de clientes
//      duplicados (carga global, Servicios client-side, ingresos en el plan), revisor de servicios (renombrar en
//      lote + archivar), marca 🗄️ Archivado reversible (excluida de KPIs/Por cobrar/listas), desarchivar.
// v83: hardening de /api/db-sync (revisión adversarial Fase 3): gate de país (usuario no-global solo sincroniza
//      registros de su país, espeja /api/db), respuesta sin el campo 'archived' (no devuelve datos del registro),
//      y logging server-side ([db-sync] ...) en los caminos de error para diagnosticar en prod.
// v82: Fase 3 (piloto Clientes) — "sync tras guardar": tras guardar un cliente en Notion (la fuente), la app
//      refleja ESE registro en la base nueva vía /api/db-sync (upsert idempotente por notion_id). Fire-and-forget,
//      detrás del flag 'fc_db_writesync' (OFF por defecto) → no rompe nada. Mapeo Notion→fila compartido en
//      api/_lib/notion-map.js (lo usa también el sync batch). Writes siguen yendo a Notion.
// v81: Fase 2.4 — callNotion enruta TODAS las lecturas operativas a Supabase según flag (servicios siempre seguro;
//      otras tablas solo sin filtro server-side). Cubre operario, CEO servicios, por cobrar, etc. Finanzas con
//      filtro de fecha quedan en Notion (números intactos). Flags OFF por defecto.
// v80: Fase 2.3 — Propuestas del coordinador pueden leer de Supabase (flag 'fc_db_propuestas', fallback Notion);
//      se replica en cliente el filtro de estado/país y el orden que hacía el query de Notion. OFF por defecto.
// v79: Fase 2.2 — los Servicios del coordinador también pueden leer de Supabase (flag 'fc_db_servicios', fallback
//      Notion). /api/db amplía la allow-list (servicios/propuestas/ingresos/gastos). OFF por defecto.
// v78: Fase 2 migración (piloto) — la lista de Clientes puede leer de la base nueva (Supabase) vía /api/db
//      detrás del flag localStorage 'fc_db_clientes', con fallback a Notion. OFF por defecto (no cambia nada aún).
// v77: ficha de cliente (Finanzas/CEO) ya no sale vacía — openContactSheet blindado (trae la ficha de Notion por
//      id si la lista no cargó) + CEO en solo-lectura (ve todo, no toca; Finanzas/Coord/Dirección editan).
// v76: pilotos/ayudantes por país (solo gente de campo del país del servicio, sin Diego) + cierre de 3 fugas de
//      lectura por país (reporte por servicio, nuevo ingreso, historia de contacto) + dedup de clientes al crear +
//      OCR rate-limit a KV (global, no por instancia).
// v32: el picker reintenta hasta traer servicios COMPLETADOS (el search-fallback a veces devuelve sin Estado).
// v31: el picker 'reporte por servicio' reintenta cuando la DB Servicios devuelve vacío (search-fallback bajo carga).
// v30: fix signo del SALDO negativo en el PDF financiero (mostraba el valor absoluto).
// v29: Reportes financieros (Milestone 5) — PDF semanal/mensual (estado de cuenta) + por servicio. Tab Reportes de vuelta.
// v28: quick-wins UX — 📍 lugar en card operario, 🔗 ver servicio (quick-view) en finanzas, miniatura recibo via /api/img.
// v27: tab Gastos paginado (no se corta en 100) + limpieza de código muerto (buildReport*, html2pdf 885KB).
// v26: filtro Uruguay incluye registros sin País (ingresos cargados sin el campo) → saldo correcto.
// v25: usuario Finanzas (Administración) ahora ve el 'Estado de cuenta' del rediseño (scope Uruguay).
// v24: rediseño CEO 'Cuenta del negocio' — balance héroe, estado de cuenta, refrescar, salud, margen real.
// v23: servicios del CEO cacheados (1 fetch por sesión, aparte) → conteo confiable.
// v22: servicios del CEO en 2da tanda + reintento (evita vacíos por rate-limit de Notion).
// v21: servicios completados/activos del CEO (traer todos + filtrar en cliente).
// v20: fix clave de cache del SW (no truncar) → totales año/rango correctos; conteo servicios robusto.
// v19: CEO filtros de período (mes/semana/año/rango/todo) + KPIs nuevos + paginación + gastos desplegables.
// v18: PDF cliente+tipo descriptivo; guardia anti-tap al scrollear; fija balanceo lateral.
// v17: paso 'Observación al cliente' (+ monto en prueba/relevam) antes de generar el PDF.
// v16: PDF sin emojis raros + sin nota del operario; fotos en desplegable (lazy via proxy).
// v15: reducir tamaño de fotos en el PDF (máx 1100px) para poder enviarlo.
// v14: PDF de devolución generado con jsPDF (cliente, self-hosted) — confiable.
// v13: PDF generado en el servidor (Chrome real, api/report-pdf) — confiable.
// v12: fix PDF en blanco — render del reporte en position:absolute (no fixed) + overlay.
// v11: html2pdf self-hosted en /vendor (carga on-demand) — evita el "html2pdf no cargado" del CDN.
// v10: bump tras fix del PDF de devolución (proxy de fotos + render) + generación desde el CEO.
// v9: bump tras fix de overflow horizontal en las tab bars (coord/CEO).
// v8: bump tras fix selector de servicios recientes en alta de gasto.
// v7: bump tras claridad de monedas (UY$ vs USD separadas) + tab Equipo desde Notion.
// v6: bump tras PR #28 (fix gasto-overlay fuera de screen-coordinator).
// Sin este bump los clientes con la PWA instalada seguirían viendo el index.html
// viejo desde caché y el bug del modal de gasto se mantendría visible aun con el
// deploy live. Cache de Notion no necesita bump (solo cambió HTML).
// v62: Por cobrar excluye JORNADAS (días de trabajo que componen un servicio; se cobra la Orden una vez, no cada jornada). Evita el doble conteo.
// v61: Por cobrar consciente de moneda — el precio de la propuesta define la moneda del saldo (campo Moneda en Propuestas, default USD); nunca mezcla UY$/USD; total separado por moneda.
// v60: cola offline — guard 'processing' anti doble-sync entre pestañas + errores de IndexedDB ya no se tragan (console.warn). PATCH es idempotente; esto evita reprocesos.
// v59: fix sistémico — coord Inicio/Servicios ahora respetan el mes (fetchCoordItemsForMonth re-filtra fecha en cliente; el proxy descarta el filtro server por multi-data-source). Helper filtrarServicios() central.
// v58: seguridad — timing-safe PIN sin fuga de longitud (hash), sin fallback de clave de sesión, y /api/extract-receipt exige token de sesión (OCR no queda abierto).
// v57: fix resumen coordinador (Días trabajados/Clientes ahora respetan el mes — el filtro de fecha de Servicios se descartaba por multi-data-source, ahora se re-filtra en cliente). NOTION_CACHE v3→v4 para limpiar datos viejos (categorías recategorizadas: JP/Francarlos=Sueldos, PGZ=Vehículo).
// v56: Por cobrar — excluye también los Relevamientos (no se cobran, igual que las Pruebas).
// v55: Finanzas — cambios de moneda identificados (campo 'Tipo interno': 💱 Cambio a pesos/dólares, 🏦 Depósito propio, 🔁 Traspaso). Badge específico + sección 'Cambios de moneda' en el dashboard. No cuentan como gasto/ganancia.
// v54: Por cobrar — excluye Pruebas (demos gratis); herramienta 'asociar cobro a servicio' (un toque, paso 2); tab read-only para el coordinador (paso 3).
// v53: vista 'Por cobrar' (tab nueva en CEO y Finanzas): por servicio completado, precio (propuesta vinculada) vs cobrado (cobros vinculados) → saldo + % + total pendiente. Marca los que faltan vincular. Read-only.
// v52: Finanzas — separa FINANCIAMIENTO (préstamos socios, campo 'Financiamiento'/Neidat) del resultado operativo. Dashboard CEO: RESULTADO OPERATIVO + bloque DEUDA + CAJA del período. Badge '🏦 préstamo'.
// v51: Finanzas — KPIs excluyen movimientos internos (campo 'Excluir de KPIs'); badge '🔁 interno' en las cards. Filtro kpiIncluido en sumByMoneda + acumuladores CEO/mensual/estado de cuenta.
// v50: alerta del coord 'servicios pendientes por gestionar' (Pendiente/Asignado sin fecha u operario, re-filtrado en cliente) — reemplaza la rota 'sin operario' que contaba todos.
// v44: tablero del coord pagina por columna (15 + 'Ver mas' de a 15) — antes una columna con muchos completados quedaba gigante.
// v43: Lista de Solicitud de Compras (operario pide insumo -> coordinador gestiona, base Notion nueva).
// v42: dashboard '📊 Resumen' mensual del coordinador (KPIs + comparación mes vs mes, solo lectura).
// v41: pestaña Inicio del coordinador (centro de mando: servicios+pruebas+relevamientos en Lista/Tablero/Calendario).
// v40: versión ESCRITORIO responsive (@media ≥900px) + vista Calendario del coordinador.
// v39: TABLERO Kanban de Servicios del coordinador — toggle Lista/Tablero + arrastrar/Mover-a para cambiar estado.
// v38: coordinador — orden por defecto Proximos arriba + filtros y flechas de mes en Pruebas.
// v37: versión de la app a 1.1.0 + cartelito de versión visible en todas las pantallas.
// v36: PINs validados en el SERVIDOR (api/verify-pin) — ya NO viven en el código del cliente (auditoría #2).
// v35: IDs de Notion centralizados en NOTION_DBS (clonar = editar 1 bloque) + logs en catches de fetch del reporte.
// v34: FIX clave de cache del SW (usaba fragmento '#' que el navegador descarta → las consultas se pisaban con SWR). Ahora ?k= en el query. NOTION_CACHE v3.
// v33: VELOCIDAD — SW vuelve a stale-while-revalidate (cache al instante + revalida en bg); proxy con timeout+reintento+429; operario auto-reintenta.
// v5: cambiar estrategia de Notion API de stale-while-revalidate a NETWORK-FIRST con timeout.

// v90: sectores Fase 0+1 — fix del selector "Operario manual" (botón +nuevo + piloto visible) + sectores reusables en el cliente y selección en el servicio/prueba/relevamiento.
// v91: Fase 2 sectores — el operario trabaja por sector (hub en el paso Trabajo + fotos antes/después por sector + marcar hecho + % automático).
// v92: fix — un cliente recién creado desde el CRM ahora aparece en el selector de cliente al crear una Propuesta (se invalida/refresca la caché _propContactos).
// v93: Fase 3 sectores — jornadas Forma 2: un servicio con sectores sin terminar se reprograma solo (elige seguir otro día o cerrar así); parte por día en Registro jornadas; badge "🔄 Continúa".
// v94: fix — el servicio creado desde una propuesta ahora aparece al instante en la lista (update optimista; el SW devolvía la lista cacheada sin el nuevo por un instante).
// v95: FIX SISTÉMICO de caché — el SW invalida NOTION_CACHE tras cada write (pages POST/PATCH), así lo creado/editado aparece al instante en la app (resuelve el patrón "en Notion sí, en la app no"). + refreshCEO borra la caché activa (no la v2 obsoleta).
// v96: fix editar servicio recién creado (update optimista en saveServiceEdit — Notion tarda en indexarlo) + botones "Guardar" (sin "en Notion") + al reprogramar (Sigo otro día) el checklist se limpia para la jornada nueva.
// v97: jornadas para servicios SIN sectores — el operario cierra con "¿Terminaste?"; si sigue otro día pone el % (acumulado) y se crea sola la ficha del día siguiente (J1/J2/…, checklist en 0, fotos por día).
// v98: jornadas Fase A — botón "Cerrar servicio" + doble confirmación al cerrar sectores incompleto + la jornada siguiente hereda las fotos "antes" + etiqueta "Jornada N completada"/badge "Servicio completo" (agrupa por Orden madre) + se oculta el botón viejo de jornada manual.
// v99: fixes coordinador — el panel siempre trae los "En curso" (aunque su fecha sea de otro mes) + al iniciar fuera de fecha la Fecha programada pasa a hoy y se guarda la planificada original (marca "Iniciado fuera de fecha" en la tarjeta) + el coordinador puede eliminar servicios completados con confirmación extra.
// v100: jornadas Fase B — desplegable de jornadas agrupadas en el historial del cliente (por Orden madre, en curso y terminadas) + badge "Servicio completo" en el panel CEO + vista agrupada en Notion.
// v101: coordinador autónomo — botón "＋ Nuevo trabajo" (Servicios + ficha del cliente) crea servicio/relevamiento/prueba SUELTO sin propuesta (elige cliente existente o nuevo) + editar Tipo de servicio, Notas pre-servicio (que el operario ahora ve en su step 0) y Observación cliente desde el sheet de edición. Objetivo: el coordinador hace todo desde la app; Notion queda de respaldo.
// v102: interruptor central de lecturas Supabase (DB_FLAGS) — piloto: Clientes desde el espejo + sync tras guardar (writesync). Servicios/Propuestas siguen en Notion hasta verificar offline/SW.
// v103: lecturas Supabase COMPLETAS — servicios y propuestas ON (DB_FLAGS) + el SW cachea /api/db
//       con stale-while-revalidate en NOTION_CACHE (mismo bucket → la purga tras writes invalida
//       ambas rutas; preserva el offline del operario en la ruta nueva).
// v104: tablero de Rentabilidad en CEO→Métricas (por cliente / por servicio / país-mes; margen = ingresos vinculados − gastos vinculados, split UY$/USD sin mezclar).
// v105: historial del cliente cuenta servicios sin 'Tipo de registro' (datos viejos) + 'Sin tipo cargado' visible en Servicios por tipo + purga de fantasmas del espejo (backend).
// v106: EMERGENCIA — lecturas Supabase APAGADAS (espejo vaciado en prod, causa en investigación); la app vuelve a leer Notion. writesync queda ON (inofensivo).
// v107/v108: lecturas Supabase RE-ENCENDIDAS con blindaje anti-vacío en callDb (espejo vacío → fallback
//       automático a Notion; la ventana transitoria al aplicar RLS ya no puede dejar la app en blanco)
//       + fix 'Invalid Date' en cards de propuestas (Última interacción con datetime) + teclado de PIN
//       espera 1200ms antes de auto-enviar a los 4 dígitos (PINs de 6 sin falsos 'PIN incorrecto').
//       Este deploy además activa SUPABASE_JWT_SECRET (RLS por usuario en /api/db).
// v109: CRM comercial — sección "📊 Comercial" en CEO→Métricas (embudo, conversión, valor del pipeline por moneda, tiempo de cierre aprox) + "📞 A contactar hoy" en Propuestas del coord con botón que registra el contacto (escribe Última interacción).
// v110: la alerta "propuestas para re-contactar" del coord es tocable (lleva directo a "📞 A contactar hoy") + urgencia "⚠️ por vencer" (40+ días, rojo) en el bloque — a los 45 el cron las mueve solo a Sin respuesta.
// v111: reloj de vida de propuestas desde FECHA DE ENVÍO (45d → Sin respuesta; Negociando exento) + Fecha de envío se estampa sola al pasar a Enviada + "☠️ quedan Nd" en A contactar hoy (rojo = ≤5d de vida) + secciones de clientes (ver v111b).
// v112: fase de Prospección (tab 🎯 para coord + rol nuevo 🧲 Ventas que SOLO ve prospección) — alta rápida de prospectos, acciones de un toque, próximo contacto planificado, y sub-bloque de prospección en las métricas comerciales del CEO.
// v113: la app ya no le nombra "Notion" al usuario (equipo app-only) — textos neutros en es+pt; y el cierre del operario pasa a "Finalizar servicio".
// v114: alertas informativas (BPS/docs) se pueden descartar con × (vuelven si urgen ≤7d o se renuevan) + Mantenimiento muestra "hace N meses del último servicio" en rojo + cards de "A contactar hoy" más compactas.
// v115: fixes de la auditoría nocturna — purga de cachés de lectura al login/logout (evita ver la lista recortada por país del usuario anterior en un dispositivo compartido) + encierro del rol Ventas completo (no crea servicios/clientes ni ve cartera/alertas/intermediarios) + la × de una alerta ya no colapsa toda la lista. (También cubre el fix de _mantMeses stale de d9c69c2 que no bumpeó.)
// v116: "📞 A contactar hoy" ahora es un desplegable (colapsado por defecto; el header muestra el contador, al tocarlo se abren las cards con su botón Contactado). El deep-link de la alerta lo abre solo.
// v117: 4 roles por servicio — el 'PILOTO' pasa a ENCARGADO DEL SERVICIO (quien ve el servicio) + nuevo slot PILOTO (del dron) + Operario manual + Ayudantes, con exclusión mutua (1 persona = 1 rol) para el conteo de jornales; el operario ve los 4 en su pantalla de inicio.
// v118: el coord agrupa Servicios/Relevamientos/Pruebas en UNA sola tab de arriba ('📋 Servicios') con un control segmentado adentro para cambiar entre las 3 → barra superior más limpia (de 11 a 9 tabs). Los 3 siguen siendo valores de tab internos (setCoordTab intacto); nada más cambia.
// v119: ciclo prospecto→cliente — botón '✅ Pasar a cliente' en el prospecto Interesado (promoción manual) + promoción AUTOMÁTICA al aceptar una propuesta vinculada (si el cliente sigue en un estado de Prospección pasa a '✅ Cliente activo' y sale de la pestaña Prospección). La promoción auto falla en silencio para no romper el guardado de la propuesta.
// v120: en el alta de prospecto, el campo de link de mapa suma un botón '🗺️ Abrir' al costado para abrir el link tipeado (mismo gesto que en otros lados).
// v121: rediseño del PDF de devolución — marca completa (logo sparkle + tipografía Exo 2 embebidas, lazy desde /vendor/report-brand.js), fotos agrupadas POR SECTOR (antes/después por sector, sin tope de 3, multipágina), + datos extra (duración real, barra de % de avance, cronología por jornada, ubicación con link al mapa) + bilingüe es/pt. buildReportDoc separado de generateReportPDF (testeable).
// v122: blindaje post-auditoría (quick wins) — caché de lecturas AISLADA POR USUARIO (clave ?u=<id> en /api/notion y /api/db; la purga al login/logout queda de 2da barrera) + token de sesión pasa a 7 días con RENOVACIÓN SILENCIOSA (header X-Session-Renew; el equipo activo nunca re-tipea el PIN, un dispositivo perdido muere en ≤7d) + rate-limit del PIN a KV (global entre instancias) + esc() en el email del cron pipeline.
// v123: blindaje del upload de fotos — el server verifica OWNERSHIP antes de presignar (el servicio existe, no está archivado, el operario figura en alguno de los 4 roles, la gestión no-global coincide en país; recibos = rol ≠ Ventas) + tope de 15MB FIRMADO en el presign (un PUT con otro tamaño falla la firma). Cache positivo 5 min por (servicio, usuario). Fail-closed 503 si la verificación no responde.
// v124: matriz de permisos por rol en /api/notion en modo MONITOR — el proxy evalúa cada query/schema/create/search contra la matriz rol→bases (api/_lib/permisos.js, del inventario real de pantallas) y loguea '[perms] DENEGARÍA' sin rechazar nada; Ventas sigue con su backstop propio. ENFORCE_PERMS se prende tras afinar la matriz con los logs.
// v125: Tipo de servicio MÚLTIPLE — la property Notion pasó a multi_select (un trabajo puede ser Fachada + Vidrios + Paneles, cualquier combinación). Botones toggle en el sheet edit del coord y en "＋ Nuevo trabajo"; lector único tipoServicioList/Str (defensivo con el select legacy) en cards/operario/CEO/PDF/historial; las jornadas heredan todos los tipos; el PDF muestra "Limpieza de fachada + Limpieza de vidrios"; espejo notion-map defensivo.
// v126: tab 🗺️ Mapa embebido en el rol Ventas — iframe al mapa de prospección "TOP 1000 objetivos"
// (flyclean-mapa.vercel.app, sitio estático aparte). Solo Ventas ve/activa la tab; CSP con frame-src al dominio.
// v127: Ventas VE propuestas (ver+seguimiento, decisión Diego 05/07) — tab 💼 país-scopeada + "A contactar
// hoy" + 📞 Contactado; sheet solo-lectura (sin guardar/eliminar/crear); backstops ampliados (notion.js:
// query Propuestas + PATCH solo 'Última interacción'; db.js: resource propuestas). + WhatsApp manual asistido
// (C-Fase 1): botón 💬 wa.me con mensaje pre-armado es/pt en "A contactar hoy", sheet de propuesta y card
// de prospecto (telToWa normaliza a E.164 por país del cliente). El bot automático es fase 2 (diferida).
// v128: tick "ya contactado" COMPARTIDO en el mapa de prospección (Bloque B) — el iframe habla por
// postMessage con la app (ensureMapaBridge) y la app pega autenticada a /api/mapa-estado (KV Upstash,
// hash HSET/HGETALL por objetivo: {por, fecha}); el token nunca entra al iframe. /api/mapa-estado NO
// se cachea (cae en el bypass de /api/* que no son notion/db).
// v129: listas más compactas para el celular (pedido Diego 06/07) — cards de Servicios (operario+coord),
// Propuestas, Prospectos y Clientes con menos padding/aire; coord junta 📍lugar+👤operario en 1 línea y
// quita "toca para editar" de propuestas; se QUITA la tira de días (week-strip, queda el ‹ mes ›); la
// fecha pasa a ENCABEZADO de grupo por día (groupServicesByDay: 📍 Hoy·8 jul / 9 jul…) en operario y coord.
// v130: la foto del servicio pasa a MINIATURA en la card del coord (coordCardThumb) en vez del desplegable
// "Ver fotos" que agrandaba la card. Carga lazy + chica; tocarla abre la foto; "+N" si hay más.
// v131: la miniatura va a la DERECHA (order:2) — con solo algunas cards con foto, así el texto queda
// alineado entre cards con y sin foto (el coord escanea por nombre/estado; la foto es complemento).
// v132: rol Ventas ve la tab 👥 Clientes (consulta + recontactar): ve la cartera (datos, sin plata, ficha
// read-only), botón 💬 WhatsApp (solo abre) + 📞 Contactado MANUAL y separado (escribe 'Próximo contacto'
// = hoy+60d → el equipo ve que ya se contactó). NO crea/edita.
// v133: Ventas también ve el destacado "🔁 para recontactar" (mantenimiento 9m) + su alerta. Requirió darle
// LECTURA de servicios (backstop: api/db.js resource 'servicios' + api/notion.js query SERVICIOS_NORM) —
// solo la lista para el cruce; NO abre servicios individuales (pages/{id} sigue bloqueado), no edita, sin plata.
const CACHE = 'flyclean-v164';
const SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-192-maskable.png',
  '/icon-512-maskable.png',
  '/splash.png',
  '/vendor/jspdf.umd.min.js'
];
const NOTION_CACHE = 'flyclean-notion-cache-v4';
// Solo aplica en cache-MISS (primera carga de una consulta): cuánto espera la red antes del
// mensaje offline. Con cache, la respuesta es INSTANTÁNEA (stale-while-revalidate) y esto no cuenta.
const NETWORK_TIMEOUT_MS = 12000;

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE && k !== NOTION_CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Distingue requests al proxy de Notion que son SOLO LECTURA y se pueden cachear:
// databases/{id}/query y databases/{id} (la lista de servicios/propuestas/etc).
// Cualquier write (pages, pages/{id} PATCH) NUNCA se cachea.
function isCacheableNotionRead(request, bodyText) {
  if (request.method !== 'POST') return false;
  if (!bodyText) return false;
  try {
    const body = JSON.parse(bodyText);
    const ep = body.endpoint || '';
    const method = (body.method || 'GET').toUpperCase();
    if (method !== 'POST' && method !== 'GET') return false;
    return /^databases\/[a-f0-9-]{32,36}\/query$/.test(ep)
        || /^databases\/[a-f0-9-]{32,36}$/.test(ep);
  } catch (_) { return false; }
}

// ¿Es un WRITE de Notion vía el proxy? (crear página = POST pages; editar / mover a papelera =
// PATCH pages/{id}). Tras uno, la caché de lecturas (listas) queda vieja → hay que invalidarla.
function isNotionWrite(bodyText) {
  if (!bodyText) return false;
  try {
    const b = JSON.parse(bodyText);
    const ep = b.endpoint || '';
    const m = (b.method || 'GET').toUpperCase();
    if (m === 'POST' && /^pages$/.test(ep)) return true;
    if (m === 'PATCH' && /^pages\/[a-f0-9-]{32,36}$/.test(ep)) return true;
    return false;
  } catch (_) { return false; }
}

// Estrategia STALE-WHILE-REVALIDATE para las lecturas de Notion:
// 1. Si hay copia en cache → la devuelve AL INSTANTE (cero espera) y revalida en segundo plano
//    (actualiza el cache para la próxima vez). Esto mata el "esperar 5s mirando la pantalla en
//    blanco y después el error" cuando Notion está lento.
// 2. Si NO hay cache (primera vez de esa consulta) → espera la red (timeout 12s) y recién ahí,
//    si falla, el mensaje offline.
// Los writes (pages/PATCH) y /api/upload-url, /api/img NUNCA pasan por acá (network-only).
// Nota: tras un write, la próxima lectura puede venir del cache viejo por un instante; la
// revalidación en background lo corrige enseguida y la app ya usa estado local optimista.
async function handleNotionApi(event) {
  let bodyText = '';
  try { bodyText = await event.request.clone().text(); } catch (_) {}
  const cacheable = isCacheableNotionRead(event.request, bodyText);
  if (!cacheable) {
    // Los writes (pages POST/PATCH) van a la red. TRAS un write exitoso, invalidamos la caché de
    // lecturas (NOTION_CACHE) para que la próxima consulta de una lista traiga los datos frescos
    // → mata el bug "lo creé/edité pero no aparece en la app". La app siempre hace await del write
    // ANTES de re-pedir la lista, así que la caché queda limpia justo a tiempo (sin race). Solo se
    // paga red en la PRIMERA lectura después de un cambio; la navegación normal sigue instantánea.
    const res = await fetch(event.request);
    if (res && res.ok && isNotionWrite(bodyText)) {
      try { await caches.delete(NOTION_CACHE); } catch (_) {}
    }
    return res;
  }

  // Clave por CUERPO COMPLETO en el QUERY STRING (?k=...), NO en un fragmento (#...): el navegador
  // descarta el fragmento de los Request, así que con '#' TODAS las consultas compartían la misma
  // clave y se pisaban (ej. gastos devolvía el cache de ingresos). Con network-first no se notaba
  // (casi no usaba cache); con stale-while-revalidate sí. El query string sí se respeta en el match.
  // v122: la clave suma ?u=<id del usuario> → en un dispositivo compartido un usuario no recibe
  // la lista cacheada de otro (antes solo lo mitigaba la purga al login/logout, que se mantiene).
  const cacheKey = new Request(event.request.url + '?u=' + userKeyOf(event.request) + '&k=' + encodeURIComponent(btoa(unescape(encodeURIComponent(bodyText)))), { method: 'GET' });
  const cache = await caches.open(NOTION_CACHE);
  const cached = await cache.match(cacheKey);

  // Revalidación: trae fresco y actualiza el cache. Se usa en background (cache hit) o se espera (miss).
  const revalidate = fetch(event.request).then(res => {
    if (res && res.ok) cache.put(cacheKey, res.clone()).catch(() => {});
    return res;
  });

  // Cache HIT → respuesta instantánea + revalida en background sin bloquear.
  if (cached) {
    event.waitUntil(revalidate.catch(() => {}));
    return cached;
  }

  // Cache MISS → esperar la red (con timeout) y recién ahí el fallback offline.
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('network timeout')), NETWORK_TIMEOUT_MS)
  );
  try {
    const res = await Promise.race([revalidate, timeoutPromise]);
    if (res) return res;
  } catch (e) {
    // la red falló/timeout y no hay copia en cache → offline
  }

  return new Response(JSON.stringify({ error: 'offline', message: 'No hay conexión y no hay copia cacheada de esta consulta.' }), {
    status: 503,
    headers: { 'Content-Type': 'application/json' }
  });
}

// Lecturas de la base nueva (/api/db, solo GET): misma estrategia stale-while-revalidate que
// /api/notion y MISMO bucket (NOTION_CACHE) → la purga tras cada write invalida ambas rutas a
// la vez. Sin esto, con las lecturas Supabase prendidas la ruta nueva era network-only y el
// operario perdía el offline (la caché Notion de respaldo se vacía tras cada write y ya no se
// re-puebla al no usarse esa ruta). La clave es la URL (GET sin body). Nota: igual que con
// /api/notion, la respuesta cacheada se comparte entre usuarios del mismo dispositivo; el
// re-filtro por país/rol del cliente aplica al renderizar (mismo modelo que la ruta Notion).
// Aísla la caché de lecturas POR USUARIO (auditoría 2026-07-04): saca el id del payload del token
// de sesión (Authorization: Bearer <base64url(payload)>.<sig>) y lo mete en la clave de caché.
// El id es estable entre renovaciones del token (cambia el exp, no el id) → renovar NO invalida
// la caché. Sin token → 'anon'. La purga al login/logout (v115) queda como segunda barrera.
function userKeyOf(request) {
  try {
    const h = request.headers.get('Authorization') || '';
    const tk = h.startsWith('Bearer ') ? h.slice(7) : '';
    if (!tk) return 'anon';
    const b = tk.split('.')[0].replace(/-/g, '+').replace(/_/g, '/');
    const id = JSON.parse(atob(b + '='.repeat((4 - b.length % 4) % 4))).id;
    return encodeURIComponent(String(id || 'anon'));
  } catch (_) { return 'anon'; }
}

async function handleDbApi(event) {
  const cache = await caches.open(NOTION_CACHE);
  // v122: clave por usuario (ver userKeyOf) — /api/db?resource=... ya trae query string → sumamos &u=.
  const dbKey = event.request.url + '&u=' + userKeyOf(event.request);
  const cached = await cache.match(dbKey);
  const revalidate = fetch(event.request).then(res => {
    if (res && res.ok) cache.put(dbKey, res.clone()).catch(() => {});
    return res;
  });
  if (cached) {
    event.waitUntil(revalidate.catch(() => {}));
    return cached;
  }
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('network timeout')), NETWORK_TIMEOUT_MS)
  );
  try {
    const res = await Promise.race([revalidate, timeoutPromise]);
    if (res) return res;
  } catch (e) {
    // sin red y sin copia → 503 (el caller callDb hace fallback a la ruta Notion)
  }
  return new Response(JSON.stringify({ error: 'offline', message: 'No hay conexión y no hay copia cacheada de esta consulta.' }), {
    status: 503,
    headers: { 'Content-Type': 'application/json' }
  });
}

self.addEventListener('fetch', e => {
  const url = e.request.url;

  if (url.includes('/api/notion')) {
    e.respondWith(handleNotionApi(e));
    return;
  }
  // /api/db (lecturas Supabase, GET). OJO: /api/db-sync NO entra acá (pathname exacto).
  if (e.request.method === 'GET' && new URL(url).pathname === '/api/db') {
    e.respondWith(handleDbApi(e));
    return;
  }
  if (url.includes('/api/')) return;

  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(cached => {
      const network = fetch(e.request).then(res => {
        if (res.ok) caches.open(CACHE).then(c => c.put(e.request, res.clone())).catch(() => {});
        return res;
      });
      return cached || network;
    })
  );
});
