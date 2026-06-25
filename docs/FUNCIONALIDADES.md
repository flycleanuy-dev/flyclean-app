# Funcionalidades — FlyClean (catálogo feature → función)

> **FUENTE DE VERDAD** de *qué hace la app y qué función lo implementa.* Generado leyendo el código
> real (2026-06-25, sw v72) con 5 agentes en paralelo. **ANTES de construir/proponer algo: buscalo acá
> + grep del código. Reusar > reconstruir** (ya duplicamos 2 veces: Clientes/Contactos y PINs).
> Mantenerlo: actualizar este archivo tras cada feature (junto al bump de `sw.js`). Complementa a
> `ARQUITECTURA.md` (cómo está construido), `NOTION.md` (datos) y `RUNBOOK.md` (operar/deploy).

## 🗣️ Qué puede hacer la app hoy (en criollo)

**FlyClean PWA - Flujo del Operario**
- Elige tu usuario y mete el PIN para entrar a la app.
- Ves una lista de trabajos asignados, ordenados por día y hora, con sus detalles.
- El trabajo se divide en pasos secuenciales; la app te guía por cada uno.
- Marcás las 16 cosas que revisaste antes de volar.
- Sacás 2+ fotos de cómo está todo antes de empezar.
- Tocás 'Iniciar' y se graba cuándo empezaste. Opcionalmente compartís tu ubicación.
- Si te equivocaste al iniciar, podés cancelar antes de que comience de verdad.
- Elegís si el clima es óptimo, precaución o si no se puede volar.
- Tocás el botón cuando el drone realmente empieza a volar.
- La app muestra que el drone está volando; avanzás cuando termina.
- Tocás cuando el drone termina y baja a tierra.
- Marcás las 7 cosas que verificaste después de que bajen.
- Sacás 2+ fotos de cómo quedó todo después de trabajar.
- Escribís notas sobre cómo fue, marcás si fue exitoso o no, y si es jornada el % avance.
- Tocás 'CERRAR' y todo se guarda en Notion. Si no hay wifi, se guarda cuando vuelva.
- Para relevamientos, medís área, altura, qué problemas hay y qué servicio sugerir.
- Para relevamientos, sacás 3+ fotos para el comercial.
- Escribís notas comerciales (presupuestos, recomendaciones, etc).
- Si se corta la wifi, la app guarda los datos y los sincroniza cuando vuelva.
- Ves un badge en la esquina que te dice si hay datos pendientes de guardar.
- La app guarda tu progreso localmente, así si se cierra vuelves donde estabas.
- La app sincroniza datos importantes cada 3 segundos; todo se envía cuando cierras.
- Sacás foto del recibo, la app lee los datos automáticamente, editás si falta algo y guardás.
- Si dejas la app abierta >8 horas, la próxima vez pide PIN de nuevo.
- La primera vez, aceptás términos y privacidad (se guarda con fecha/hora).
- Podés cambiar tu PIN de acceso en cualquier momento.
- La app habla en español o portugués según tu país/preferencia.

**Panel del Coordinador - FlyClean**
- Pantalla principal del coordinador que ve TODOS los trabajos del mes con 3 formas de verlos (lista, tarjetas por estado, o calendario).
- Panel de estadísticas mensuales que muestra si subió o bajó cada métrica comparado al mes anterior.
- Listado de todos los trabajos pendientes y en marcha (pero no relevamientos ni pruebas).
- Listado de todos los trabajos de prueba/demostración de equipos.
- Listado de todos los relevamientos de sitio antes de hacer presupuesto.
- Panel flotante donde le asignas el piloto, ayudantes, hora y lugar de un trabajo.
- Ver y agregar drones, vehículos u otros equipos al trabajo.
- Crea un trabajo de seguimiento vinculado (Jornada 2, 3, etc) del mismo servicio.
- Genera un PDF lindo del trabajo completado con fotos antes-después para entregar al cliente.
- Historial de presupuestos enviados a clientes, ordenados por cuándo se hablaron por última vez.
- Panel para crear o actualizar un presupuesto y su estado en el pipeline de ventas.
- Crea un relevamiento de sitio directamente desde un presupuesto en estudio.
- Crea un trabajo de prueba de equipos directamente desde un presupuesto en estudio.
- Convierte un presupuesto aceptado en un trabajo real que hay que ejecutar.
- Listado de clientes con búsqueda rápida y detalle de sus intereses de servicio.
- Panel para crear o actualizar datos de un cliente y sus preferencias.
- Historial completo 360 del cliente: presupuestos, relevamientos, trabajos terminados y dinero cobrado.
- Registro de compras pendientes organizadas por urgencia.
- Tab de mensajes (aún no implementado, muestra preview de qué vendrá).
- Busca y filtra trabajos/propuestas por múltiples criterios a la vez.
- Elige cómo ver los trabajos: en fila, en columnas por estado, o como calendario mensual.
- Navega entre meses y elige qué día filtrar (o todos) para ver solo trabajos de esa fecha.
- Barra de alertas que avisa de problemas urgentes: equipos dañados, trabajos sin asignar, propuestas olvidadas, compras urgentes, documentos vencidos.
- Tablero tipo Trello donde ves trabajos por estado y clickeas para mover o editar.
- Botón al final para cargar más items sin paginar la página (scroll infinito falso).

**PANEL FINANZAS + PANEL CEO**
- Muestra un resumen de plata que entra y sale, separado por pesos o dólares, con detalles de a dónde fue cada peso.
- Dice qué servicios están pagados, cuáles pagan a mitad de camino, y cuáles falta cobrar. Permite vincular un cobro a su servicio en un clic.
- Muestra la lista de todos tus clientes con sus datos de contacto y qué servicios les ofrecés.
- Lista todos los gastos de este mes categorizados, te dice cuánto gastaste en total, y deja agregar un nuevo gasto con foto del recibo.
- Lista todos los cobros de este mes, te dice cuánto cobraste en total, y deja agregar un nuevo cobro manual sin IA.
- Abre un formulario para grabar manualmente que cobraste algo, eligiendo cliente y moneda.
- Baja PDFs con resúmenes de entrada/salida de plata por semana, mes, o por cada trabajo que hiciste.
- Filtro que cada CEO solo ve el dinero de su país (Uruguay ve sin país también).
- Lo mismo que finRecEnPais pero para Servicios y Clientes que usan nombres de país completos.
- Muestra cómo va el negocio: ganancias, cantidad de trabajos, márgenes, y si hay algo roto que revisar.
- Lista los trabajos de este mes mostrando quién hace cada uno, cuándo está listo, y permite descargar PDF si está terminado.
- Botones para ver datos de este mes, semana, año, un rango personalizado, o todo el historial.
- Muestra quién trabaja en cada país y permite a los admins cambiar o resetear el PIN de acceso de cada uno.
- Pregunta si sos diego-laxalt o eduardo-cabral (los únicos que pueden cambiar PINs).
- Abre un cuadro para poner un PIN nuevo (4 o 6 números) para resetear la clave de acceso de alguien.
- Sección solo para admins que muestra todas las cuentas de login y botón para resetear PIN de cada una.
- Selector de qué país ves y qué período: cada jefe CEO solo ve su país y el período que quiere.

**Backend API y Infraestructura Frontend de FlyClean**
- Intermediario entre app y Notion que verifica que estés logueado, reintenta si falla, y trae datos aunque Notion esté lento
- Dice a la app dónde subir fotos de vuelos y recibos de gastos, pero solo si estás logueado
- Sirve fotos del CDN en el mismo dominio para que html2canvas pueda capturarlas en PDFs
- Mira foto de recibo con IA, extrae monto/proveedor/categoria, y dice qué tan seguro está del resultado
- Dice qué versión está corriendo y si el APK necesita actualizar
- Chequea que el PIN sea correcto y, si lo es, emite un token para futuras requests
- Permite al usuario cambiar su propio PIN si sabe el actual
- Solo administradores pueden resetear el PIN de otros usuarios para gestión de equipos por país
- Cada mañana revisa propuestas viejas, las mueve a 'Sin respuesta', y avisa al coordinador si hay para re-contactar
- Cada semana (viernes/lunes) manda un email al CEO resumen de lo hecho y lo pendiente
- Sistema de login sin base de datos: firma un token en el servidor y valida en cada request
- Guarda en la nube (KV) los PINs custom que cambió cada usuario, con hash de una sola dirección
- Funciones reutilizables para que los crons conversen con Notion: traer datos paginados, hacer fallback, actualizar
- Envía emails formateados por los crons; si no hay API key, solo loguea que se habría enviado
- Sistema de idiomas: español por defecto, portugués brasileño si se activa para Brasil
- Función que envuelve cada llamada a Notion, adjunta el token de sesión y reinicia sesión si expira
- Trae TODAS las filas de una consulta grande de Notion, paginando 100 por 100
- Guarda en IndexedDB local los cambios que hace el operario sin conexión, para sincronizar después
- Cuando reconecta, intenta sincronizar todos los cambios que quedaron sin conexión
- Badge en pantalla que dice si hay cambios esperando a sincronizar y si está conexión
- Método seguro para guardar cambios: si hay conexión, envía directo; si no, encola para después
- Service worker que cachea todo offline: HTML/CSS/JS al instante, datos de Notion refresca en background
- Token de sesión guardado en el navegador que se manda en cada request a la API
- Base de datos local (IndexedDB) que guarda pendientes offline: qué actualización, cuándo, cuántos reintentos
- Solo estos dominios pueden acceder a los endpoints (previene requests desde otros sitios)
- Máximo 8 intentos de PIN por minuto por usuario, para prevenir fuerza bruta
- Máximo 60 análisis de recibos por hora global para que no exploten costos de IA
- Después que la IA extrae datos, se valida que sean coherentes: monto realista, fecha reciente, categoría válida
- La IA solo puede responder con datos del recibo en estructura fija, no puede ejecutar otras órdenes aunque el recibo pida
- Proxy de fotos que previene que alguien lo use para acceder a direcciones internas (localhost, IPs privadas)
- Solo permite ciertos formatos de imagen (jpg, png, webp, heic, heif) y PDF para recibos
- Fotos se organizan en carpetas por ID de servicio/gasto para que no se mezclen ni sobrescriban
- Si falta configuración, el servidor rechaza con error en lugar de operar en modo degradado
- Cada operación importante se loguea para debugging, sin revelar detalles sensibles
- Aunque se abran múltiples tabs, la cola offline sincroniza cada cambio UNA sola vez

**FlyClean - Capacidades Transversales & Modelo de Datos**
- Sacá foto del recibo y la IA lee el monto, fecha, proveedor y categoría automáticamente (solo Uruguay, otros países carga manual).
- Si no estás en Uruguay, el recibo se carga sin análisis automático.
- Descargá un reporte en PDF con fotos y detalles del servicio (antes, después, relevamiento).
- Convierte el monto guardado en Notion a un objeto con moneda y valor limpio.
- Muestra '$100 pesos' o '$50.50 dólares' con el formato correcto de cada país.
- Suma todos los gastos/ingresos en pesos y dólares por separado.
- Muestra el total en dos monedas separadas (UY$ 5000 · USD 150).
- Filtra gastos/ingresos que NO cuentan en el resultado operativo (internos, préstamos, cambios de moneda).
- Detecta si es un préstamo (no cuenta como gasto ni ganancia, es deuda).
- Identifica movimientos entre cuentas (cambio de moneda, depósito propio) que no son gastos reales.
- Abrí un cliente y ves TODAS sus propuestas, relevamientos, servicios completados y cobros en orden cronológico + resumen dinero.
- Muestra en la ficha del cliente cuánto le cobraste, cuánto presupuestaste y cuántos trabajos hiciste.
- Sistema de alertas: equipos en mantenimiento, servicios sin gestionar, clientes que no responden, certificados que vencen.
- Alerta automática si un certificado (DGI, inscripción, etc.) está por vencer.
- Base de datos del equipo: quién es quién, qué rol tiene, en qué país trabaja.
- Traduce nombre de país a etiqueta Notion con emoji de bandera.
- Convierte país a código corto para filtrar gastos/ingresos por país en el dashboard financiero.
- IDs de todas las bases Notion en un lugar para que clonar sea fácil.
- Define qué campos leer en Notion para saber cuánto gastamos/cobramos en cada moneda.
- Tipo de cambio por defecto (40 pesos = 1 dólar) para convertir monedas si no especifican otro.
- Préstamos de socios aparecen separados en el dashboard (no son gasto ni ganancia, es dinero que debe devolverse).
- Dashboard CEO muestra dinero que entra/sale en pesos y dólares, separado por mes, sin contar trabajos internos.
- Función server-side que trae TODOS los registros de una base Notion, incluso si tiene múltiples fuentes.
- Envío automático al CEO: viernes el resumen de la semana, lunes qué falta hacer.
- Límite de 60 extracciones por hora para evitar gastar créditos Anthropic sin control.
- Lista de categorías de gasto que Claude sugiere al leer el recibo (se puede cambiar manual).
- Chequeos de seguridad después que Claude lee el recibo: no dejar pasar datos rotos o raros.

## 📋 Catálogo técnico (feature → función · archivo:línea)

### FlyClean PWA - Flujo del Operario

- **Selección de usuario y login con PIN** — El operario selecciona su usuario de una lista filtrada por país, luego ingresa un PIN de 4-6 dígitos. El PIN se valida contra el servidor (/api/verify-pin), retorna un token de sesión que se persiste en localStorage (fc_token). Se soportan reintentos con contador de intentos fallidos.
  - `selectUser() → /index.html:3626 | pinPress() → /index.html:3638 | pinConfirm() → /index.html:5206`
- **Lista de servicios asignados** — Carga los servicios del operario desde Notion DB filtrados por rol. Auto-reintenta 1 vez si falla. Ordena por fecha programada + hora de inicio. Muestra estado (Pendiente/Asignado/En curso/Completado), nombre, fecha, lugar, tipo y país. Agrupa en tabs: Órdenes, Jornadas, Pruebas, Relevamientos.
  - `loadServices() → /index.html:5318 | renderServices() → /index.html:5364 | getMyServices() → /index.html:3328`
- **Steps/pasos del flujo del servicio** — El flujo tiene 10 steps para servicios estándar (INICIO → CHECKLIST_PRE → FOTOS_ANTES → INICIO_EFECTIVO → EJECUCIÓN → CIERRE_EFECTIVO → CHECKLIST_POST → FOTOS_DESPUÉS → OBSERVACIONES → CERRAR) y 5 para relevamientos (INICIO → RELEV_DATOS → FOTOS → NOTAS → CERRAR). Se calcula automáticamente el step actual según el progreso (si hay horaInicio, horaCierreEfectivo, etc). Permite navegar atrás pero solo hasta el step actual.
  - `renderStep() → /index.html:5543 | computeStepFromState() → /index.html:3124 | STEPS_SERVICIO/STEPS_RELEVAMIENTO → /index.html:2930-2949`
- **Checklist pre-servicio** — 16 ítems de verificación pre-vuelo (permisos, meteorología, batería, drone, hélices, brazos, manguera, satélites, zona libre, etc). Al tocar cada ítem se marca/desmarca (toggle). Muestra contador 'X/16 completados'. Los datos viven en serviceState.checklistPre (array de booleans). Se persisten en localStorage inmediato y a Notion en debounce de 3s.
  - `toggleCheck() → /index.html:6041 | CHECKLIST_PRE → /index.html:2901 | renderStep() STEP 1 → /index.html:5606`
- **Fotos pre-servicio (antes del trabajo)** — El operario sube mínimo 2 fotos antes del vuelo. Upload a R2 vía presigned URL (/api/upload-url). Validaciones: máx 10MB, tipos permitidos (jpg/png/webp/heic). Muestra estado uploading/done/error con preview local. Las fotos se asocian al serviceId capturado al inicio del upload. Persisten en localStorage en serviceState.photos.pre[] y se envían a Notion como archivos.
  - `handlePhotoSelect() → /index.html:3155 | uploadPhoto() → /index.html:3166 | renderPhotoUploader() → /index.html:3274`
- **Inicio del servicio (Hora inicio programada)** — Al tocar 'Iniciar servicio', se registra la hora local (timeNow()). Se pide permiso GPS con modal de Aviso Simplificado (LFPDPPP art.16 para México). Si acepta, captura lat/lng y guarda URL en propiedad 'Ubicación GPS'. Cambia Estado a '✈️ En curso'. Se guarda via queueableUpdateServiceProps (online/offline-aware). No permite doblar-iniciar.
  - `iniciarServicio() → /index.html:5960 | requestUserLocationWithConsent() → /index.html:5917`
- **Banner de cancelar inicio** — Entre INICIO y INICIO_EFECTIVO, muestra banner '⏱️ Iniciado a las HH:MM' con botón '↩ Cancelar inicio'. Solo válido antes de Hora Inicio Efectivo. Restaura Estado a '🔄 Asignado', limpia GPS. Vuelve currentStep a 0. Requiere confirmación.
  - `renderCancelarBanner() → /index.html:5535 | cancelarInicio() → /index.html:5993`
- **Selección de clima/condiciones antes de volar** — Step 'Inicio Efectivo': operario elige condiciones climáticas de opciones multi-select (Óptima/Precaución/Suspendido según viento km/h o índice KP). Soporta múltiples selecciones. Se persiste en serviceState.clima[] y se envía a Notion como multi_select en propiedad 'Condición climática'.
  - `selectClima() → /index.html:6076 | renderStep() STEP 3 → /index.html:5643`
- **Registro de Hora Inicio Efectivo (cuando empieza a volar)** — Botón '🕐 Inicio efectivo' → registra timestamp actual. Guarda en Notion como 'Hora Inicio Efectivo' (date field con ISO). Calcula serviceState.horaInicioEfectivo (formato HH:MM local). Se persiste via queueableUpdateServiceProps. No permite duplicar.
  - `registrarInicioEfectivo() → /index.html:6015`
- **Step de ejecución (trabajo en curso)** — Step de transición: muestra emoji de drone 🚁 y label 'TRABAJO' (aprox. 30-60 min según servicio). No captura datos. El operario avanza manualmente cuando el trabajo termina.
  - `renderStep() STEP 4 → /index.html:5678 | nextStep() → /index.html:5524`
- **Registro de Hora Cierre Efectivo (cuando termina de volar)** — Botón '⏹ Cierre efectivo' → registra timestamp actual. Guarda en Notion como 'Hora Fin Efectivo'. Calcula serviceState.horaCierreEfectivo (HH:MM local). No permite duplicar.
  - `registrarCierreEfectivo() → /index.html:6028`
- **Checklist post-servicio** — 7 ítems post-vuelo (agua cortada, drone aterrado, equipo desmontado, zona limpia, fotos tomadas, cliente notificado, resultado marcado). Similar a pre-checklist: array de booleans en serviceState.checklistPost[], contador visual, persisten en localStorage + debounce Notion.
  - `toggleCheck() → /index.html:6041 | CHECKLIST_POST → /index.html:2920 | renderStep() STEP 6 → /index.html:5711`
- **Fotos post-servicio (después del trabajo)** — Mínimo 2 fotos después del vuelo. Mismo flujo upload que pre-servicio: presigned URL, validaciones, state uploading/done/error. Se almacenan en serviceState.photos.post[].
  - `handlePhotoSelect() → /index.html:3155 | uploadPhoto() → /index.html:3166 | renderPhotoUploader() → /index.html:3274 (mismo flujo, fotoType='post')`
- **Observaciones y notas post-servicio** — Textarea para notas libres (max 1000 chars aprox). Para jornadas, agrega campo numérico '% avance' (0-100). Selección de resultado: radio-group con 3 opciones ('✅ Exitoso', '⚠️ Con incidencia', '❌ Fallido') o para pruebas ('Avanza', 'No interesado', 'Recontactar'). Se persisten en serviceState.notasPost, serviceState.avance, serviceState.resultado/resultadoPrueba.
  - `renderStep() STEP 8 → /index.html:5747`
- **Cierre y envío de servicio a Notion** — Valida que no haya fotos en upload. Valida resultado obligatorio (excepto relevamientos). Envía a Notion: Estado='✅ Completado', Hora Fin, notas post, resultado, clima, fotos (pre/post/relevamiento), avance (jornadas), datos relevamiento (si aplica). Si falla por red, encola en IndexedDB. Limpia localStorage del servicio. Muestra pantalla 'Done' con resumen.
  - `cerrarServicio() → /index.html:6097 | buildIncrementalProps() → /index.html:3040 | persistServiceState() → /index.html:3059`
- **Relevamientos: captura de datos (m², altura, dificultades, servicios sugeridos)** — Para servicios tipo Relevamiento, step especial 'DATOS' con 4 campos: m² aproximados (número), altura/pisos (número), dificultades (multi-select de 8 opciones: acceso restringido, sin agua, sin electricidad, riesgo eléctrico, vientos, andamios, altura >5 pisos, coordinación especial), servicios sugeridos (radio-group: fachada, vidrios, paneles solares, combinado). Persisten en serviceState.relevamiento{}.
  - `renderStep() 'relev_datos' STEP 1-2 → /index.html:5790 | relevToggleDif() + relevToggleSugerido() → /index.html:6060-6073`
- **Fotos de relevamiento** — Mínimo 3 fotos de relevamiento (más que pre/post). Mismo upload a R2. Se almacenan en serviceState.photos.relevamiento[].
  - `renderPhotoUploader() → /index.html:3274 (fotoType='relevamiento') | renderStep() 'fotos_relevamiento' → /index.html:5829`
- **Notas comerciales para relevamientos** — Textarea para notas comerciales (campo 'Notas pre-servicio' en Notion, aunque sea post-relevamiento). Persisten en serviceState.relevamiento.notasComercial.
  - `renderStep() 'relev_notas' → /index.html:5842`
- **Cola offline (IndexedDB) para updates fallidos** — Si no hay conexión, queueableUpdateServiceProps() encola el PATCH en IndexedDB (OFFLINE_DB_NAME, object store OFFLINE_STORE). openOfflineDB() crea la DB si no existe. processQueue() se ejecuta cada 30s o al recuperar conexión. Cada item retiene pageId, properties, retries (máx 10 antes de descartar), processing flag para evitar duplicados multi-tab. renderOfflineBadge() muestra contador '📴 N pendiente' o '🔄 N sincronizando'.
  - `enqueueWrite() → /index.html:3408 | getQueueItems() → /index.html:3425 | processQueue() → /index.html:3472 | queueableUpdateServiceProps() → /index.html:3528`
- **Badge/indicador de offline** — Elemento sticky .offline-badge en la esquina. Mostrado si hay items en cola. Si online, rojo con icono 📴 'N pendiente sin conexión'. Si online pero sincronizando, amarillo con 🔄. Auto-actualiza al cambiar estado de conexión.
  - `renderOfflineBadge() → /index.html:3506 | window.addEventListener('online'/'offline') → /index.html:3548`
- **Persistencia en localStorage de estado del servicio** — Cada servicio tiene clave 'fc_service_[ID]' en localStorage. Guarda serviceState (checklist pre/post, notas, avance, relevamiento data, horaInicio, horas, clima), currentStep, timestamp. Se escribe inmediato en cada cambio. Al abrir servicio nuevamente, hydrateServiceStateFromLocal() restaura checklist, notas, avance, relevamiento. Notion trae fotos, clima, resultado, horas efectivas.
  - `persistServiceStateToLocal() → /index.html:3028 | hydrateServiceStateFromLocal() → /index.html:3105 | storageKeyForService() → /index.html:3026`
- **Sincronización incremental a Notion con debounce** — Al cambiar clima, resultado, foto, etc., persistServiceState() debouncea 3s para enviar a Notion solo propiedades relevantes (fotos, clima, resultado, resultadoPrueba). Checklist y notas quedan en localStorage hasta cerrar (cerrarServicio() commitea todo de una). Si hay fotos en localStorage sin sincronizar al reabrir, detecta y hace flush inmediato.
  - `persistServiceState() → /index.html:3059 | buildIncrementalProps() → /index.html:3040 | flushPendingPhotosIfNeeded() → /index.html:5488`
- **Carga de gasto con foto del recibo** — Flujo de 3 steps: (1) 'select-photo' → file input aceptando imagen/PDF (máx 10MB, MIME validados). (2) 'analyzing' → sube a R2 vía /api/upload-url, luego llama /api/extract-receipt para OCR (extrae concepto, monto, moneda, fecha, proveedor). (3) 'edit-form' → formulario editable (concepto, monto, moneda, fecha, proveedor, categoría, clase Directo/Indirecto, opcional servicio vinculado). gastoState mantiene form, ocr result, reciboUrl/reciboPreview.
  - `openNuevoGastoSheet() → /index.html:4536 | uploadReceiptPhoto() → /index.html:4244 | extractReceiptViaAI() → /index.html:4265 | renderGastoSheet() → /index.html:4587`
- **Sesión con timeout y re-autenticación** — Al entrar y en cada acción (markUserActive()), se registra timestamp en 'fc_last_active'. Si reabres app dentro de 8 horas, skipea PIN. Pasado ese tiempo, pide PIN nuevamente. Protección contra: app olvidada en dispositivo compartido.
  - `markUserActive() → /index.html:3668 | isSessionFresh() → /index.html:3671 | SESSION_MAX_MS=8h → /index.html:3667`
- **Consentimiento legal (privacy + terms)** — Modal de consentimiento por primera vez en dispositivo. Guarda en localStorage 'fc_consent' con versión + timestamp ISO (auditable para LGPD/LFPDPPP). Se valida solo una vez por dispositivo. Overlay que bloquea la app hasta aceptar.
  - `checkConsent() → /index.html:10296 | acceptConsent() → /index.html:10301 | CONSENT_VERSION → /index.html:10295`
- **Cambio de PIN por el operario** — Overlay con 3 campos: PIN actual (validación server), PIN nuevo, confirmación. Validaciones: formato 4-6 dígitos, que coincidan, que no sea igual al actual. Llamada a /api/set-pin (exige token + PIN actual). El nuevo PIN se guarda hasheado en KV server-side (no en cliente). Mensajes de error específicos.
  - `openPinChange() → /index.html:10196 | saveNewPin() → /index.html:10233 | verifyPin() → /index.html:10216`
- **Multi-idioma (español/portugués brasileño)** — Soporte para 'es' (español) y 'pt-BR' (portugués). Se aplica por país: Brasil default pt-BR (override a 'es' si usuario prefiere). Las claves i18n usan data-i18n en HTML y función t(). Se persiste en localStorage 'fc_lang_[País]'.
  - `initLang() → /index.html:2753 | setLang() → /index.html:2764 | applyTranslations() → /index.html:2776 | t() → /index.html:2749`

### Panel del Coordinador - FlyClean

- **Inicio (Centro de Mando)** — Carga todos los servicios/jornadas/pruebas/relevamientos del mes sin filtrar por tipo. Muestra toggle entre Vista Lista, Tablero (Kanban) y Calendario. Renderiza con strip semanal de días. Aplica filtros dinámicos.
  - `renderCoordInicio() + renderCoordServiciosView() | index.html:9015-9035, 7403-7419`
- **Resumen (KPIs mensuales)** — Muestra 7 KPIs: Días trabajados, Clientes únicos, Presupuestos enviados, Propuestas recibidas, Aceptadas/Enviadas (tasa), Pendientes. Cada una con delta comparativo al mes anterior (▲/▼). Filtra por país del coordinador y período mensual con navegación de meses.
  - `renderCoordResumen() | index.html:8869-8982`
- **Servicios** — Tab que muestra solo Órdenes de Trabajo (excluyendo Pruebas y Relevamientos). Lista cronológica ordenada por Fecha Programada. Incluye strip semanal, filtros, búsqueda. Click en card abre openEditSheet.
  - `renderCoordServicios() + renderCoordList() | index.html:9037-9061, 7545-7650`
- **Pruebas** — Tab que filtra items con 'Tipo de registro' = 'Prueba'. Lista cronológica con las mismas opciones de vista/filtros/búsqueda que Servicios.
  - `renderCoordPruebas() | index.html:9063-9084`
- **Relevamientos** — Tab que filtra items con 'Tipo de registro' = 'Relevamiento'. Misma estructura de renderizado que Servicios y Pruebas.
  - `renderCoordRelevamientos() | index.html:9086-9107`
- **Sheet de edición de servicio (Asignar piloto/ayudantes, hora, lugar, mapa)** — Modal que abre desde card de servicio. Permite editar: Estado (Pendiente/Asignado/En curso/Completado/Cancelado), Operario principal (select), Operarios participantes (multi_select), Fecha, Hora Inicio (tipo time), Lugar (rich_text), Mapa (URL). Guarda en Notion con PATCH. Cierra con closeEditSheet().
  - `openEditSheet() + saveServiceEdit() | index.html:8082-8521`
- **Equipos asignados al servicio** — Dentro del edit sheet, muestra equipos ya asignados (DB RUE - Registro de Uso de Equipo) con su tipo, serie, marca. Botón 'Agregar equipo' abre overlay para seleccionar de Activos disponibles del mismo país, filtrando ya asignados. Crear entry en RUE vincula Equipo ↔ Servicio.
  - `fetchEquiposDelServicio() + renderEquiposChips() + openAddEquipoSheet() + addEquipoToServicio() + removeEquipoFromServicio() | index.html:8235-8349`
- **Crear jornada (sub-modal)** — Sub-modal dentro del edit sheet que permite crear una 'Jornada N' a partir de un servicio. Calcula automáticamente el número (incrementa desde Jornada 1 implícita). Selecciona operario. Crea nuevo página de tipo 'Jornada' vinculada a la propuesta/contacto del padre. Solo aparece si el tipo NO es Relevamiento.
  - `openCreateJornadaSheet() + submitCreateJornada() | index.html:8385-8471`
- **PDF de devolución (Reporte completado)** — Botón que aparece solo si Estado = Completado. Abre step intermedio para capturar observación cliente + monto estimado (si Prueba/Relevamiento). Luego genera PDF con jsPDF (sin canvas) con: header FlyClean + datos generales (cliente, servicio, tipo, lugar, m², país, piloto, ayudantes) + resultado + fotos pre/post (máx 3 antes, máx 3 después) + observaciones. Descarga automáticamente.
  - `openReportStep() + generateReportPDF() | index.html:8596-8832`
- **Propuestas** — Tab de propuestas (presupuestos). Filtra 'Rechazada' y 'Sin respuesta'. Ordena por 'Última interacción' descendente. Muestra nombre, estado pipeline, país, importe, días sin respuesta (formula), última interacción. Alerta si >14 días sin respuesta. Click abre openPropSheet.
  - `renderCoordPropuestas() + renderCoordPropuestasList() | index.html:9913-9995`
- **Sheet de edición de propuesta** — Modal para crear o editar propuesta. Campos: Nombre, Estado pipeline (🆕 Nuevo lead → 🔄 Reactivo), País, Tipo (Puntual/Recurrente), Aprobación interna, Importe estimado, Fecha de envío, Última interacción, Observaciones. En modo edit muestra 3 botones dinámicos: 'Crear relevamiento', 'Crear prueba', 'Crear servicio' (visibilidad según estado pipeline).
  - `openPropSheet() + openNewPropSheet() + savePropEdit() | index.html:9153-9464`
- **Crear relevamiento desde propuesta** — Botón que aparece en propuesta si estado in ['Nuevo lead', 'Contactado', 'Relevamiento', 'En preparación']. Crea servicio de tipo '🔍 Relevamiento' con nombre '🔍 Relevamiento — <nombre propuesta>', Estado Pendiente, Fecha hoy, vinculado a propuesta + contacto. Abre el edit sheet del nuevo relevamiento.
  - `createRelevamientoFromPropuesta() | index.html:9333-9372`
- **Crear prueba desde propuesta** — Botón que aparece en propuesta si estado in ['Nuevo lead', 'Contactado', 'Relevamiento', 'En preparación']. Crea servicio de tipo '🧪 Prueba' con nombre '🧪 Prueba — <nombre propuesta>', Estado Pendiente, Fecha hoy, vinculado a propuesta + contacto. Abre edit sheet del nuevo servicio.
  - `createPruebaFromPropuesta() | index.html:9293-9331`
- **Crear servicio desde propuesta** — Botón que aparece en propuesta si estado in ['✅ Aceptada'] o si ya tiene servicios vinculados. Crea nuevo servicio '📋 Orden de trabajo' con nombre de propuesta, Estado Pendiente, Fecha hoy, vinculado a propuesta + contacto. Abre el edit sheet para asignar operario.
  - `createServicioFromPropuesta() | index.html:9246-9291`
- **Contactos** — Tab de clientes. Filtra por país del coordinador. Búsqueda por nombre o ciudad. Muestra nombre, estado (Lead/Cliente activo/Inactivo), tipo (Administración/Constructora/Particular), país, servicios de interés, teléfono, email. Buscador recalcula lista en vivo. Click abre openContactSheet.
  - `renderCoordContactos() + renderContactList() | index.html:9500-9558`
- **Sheet de contacto (crear/editar)** — Modal para crear/editar contacto. Campos: Nombre/Empresa, Estado (Lead/Cliente activo/Inactivo), Tipo de cliente (select), País, Canal de captación, Servicios de interés (multi_select), Teléfono, Email, Ciudad/Zona, Interlocutor, Notas. En edit mode muestra historial async del cliente.
  - `openContactSheet() + openNewContactSheet() + saveContactEdit() | index.html:9638-9730`
- **Historial del cliente (propuestas + relevamientos + servicios completados + ingresos)** — Dentro del edit sheet de contacto, carga async 4 queries en paralelo (propuestas, relevamientos, servicios completados, ingresos). Filtra cliente-side por contactId + tipoReg. Ordena por fecha desc. Muestra: cobrado en USD/UY$, presupuestado, # servicios completados, timeline de items clickeables que abren el servicio/propuesta.
  - `loadContactHistory() + renderContactHistory() | index.html:9737-9798`
- **Pedidos (Solicitud de compras)** — Tab de pedidos de compra. Filtra por país del coordinador (excepto Dirección/CEO que ven todos). Toggle Pendientes/Todos. Ordena por Prioridad (Urgente → Normal → Sugerente) + Fecha desc. Muestra producto, cantidad, prioridad, estado, solicitante, fecha pedido, fecha compra, nota. Botones: Marcar comprado (set Estado='Comprado' + Fecha compra), Cancelar.
  - `renderCoordPedidos() + renderCoordPedidosList() | index.html:5077-5136`
- **Mensajes (Comunicaciones)** — Placeholder que muestra 3 features futuras: Notificaciones broadcast (📣), Reporte automático (📊), Integración con bases de datos (🏢). Texto de 'Próximamente'.
  - `renderComunicaciones() | index.html:10175-10191`
- **Filtros y búsqueda** — Panel lateral que filtra servicios/propuestas por: nombre (búsqueda text full), estado (multi-select dinamicar con valores únicos), país (multi-select), operario (multi-select, solo servicios), fecha desde-hasta. Aplica con AND entre dimensiones. Ordena por alfabético asc/desc o fecha asc/desc. 'Limpiar todo' resetea.
  - `renderCoordFiltersPanel() + applyCoordFilters() + setCoordSearch() | index.html:7172-7282`
- **Vistas del Inicio: Lista, Tablero Kanban, Calendario** — Toggle en Inicio (solo) entre: Lista cronológica (renderCoordList), Tablero Kanban por Estado (columnas Pendiente/Asignado/En curso/Completado), Calendario mensual 7×7 con eventos clickeables. Cada vista aplica filtros y respeta fecha/día seleccionado. Persiste preferencia en localStorage fc_coord_view.
  - `renderCoordServiciosView() + renderCoordKanban() + renderCoordCalendar() | index.html:7403-7550`
- **Month Navigation (Navegar meses)** — Navegación de meses con botones < / mes actual / > que muta coordMonthOffset. Renderiza strip semanal de 31 días + pill 'Todos'. Hoy destaca. Contador de servicios por día. Al cambiar mes, refresca la tab activa (Inicio/Servicios/Pruebas/Relevamientos/Resumen). Select Día cambia selectedCoordDay.
  - `changeCoordMonth() + getCoordMonthRange() + renderWeekStrip() | index.html:7302-7349, 7351-7361`
- **Alertas (equipment maintenance, servicios pendientes, propuestas vencidas, pedidos urgentes, documentos)** — Banner de alertas que carga async al abrir coordinator. Revisa: Equipo en mantenimiento (Activos BD), Servicios sin operario/fecha (Estado Pendiente/Asignado), Propuestas >15 días sin respuesta, Pedidos pendientes urgentes, Documentos a punto de vencer (Documentos BD con aviso + días). Agrupa por critical/warn, collapse/expand con contador.
  - `loadAlerts() + renderAlertsBanner() | index.html:10033-10170`
- **Drag-and-drop Kanban (mover tarjetas entre estados)** — Tablero Kanban con columnas dinámicas por estado (Pendiente/Asignado/En curso/Completado/Cancelado). Cada card muestra servicio en col según su Estado. Paginado por columna (_kbColLimits). Click card abre openEditSheet. Sin drag visual explícito pero estructura ready para handlers onclick.
  - `renderCoordKanban() | index.html:7476-7549 (drag-drop delegado en CSS + data-attrs)`
- **Paginación (Cargar más)** — Botón 'Cargar más' al final de lista servicios/propuestas/contactos. Incrementa _coordVisibleLimit por COORD_PAGE_SIZE. Re-renderiza la tab activa manteniendo el nuevo limit (sin resetear a inicio). Muestra cuántos restantes.
  - `cargarMasCoord() + renderCargarMasButton() | index.html:7371-7391`

### PANEL FINANZAS + PANEL CEO

- **Resumen de Finanzas** — Renderiza el resumen financiero del período seleccionado mostrando resultado operativo (ingresos - gastos), financiamiento con socios (Neidat), caja del período, y gastos/ingresos agrupados por categoría/tipo con cards desplegables. Filtra por moneda (UY$/USD) y período. Aísla datos por país (finRecEnPais).
  - `renderCEOFinanzas (index.html:6642)`
- **Por cobrar** — Vista de solo lectura: cruza servicios completados con propuestas (precio) e ingresos (cobrado) para calcular saldo. Agrupa por estado (a cobrar, parcial, cobrado, sin precio). Permite asociar cobros sin servicios vinculados (optsFor ofrece dropdown de servicios del cliente; asociarCobro hace PATCH a Notion). Filtra por país (recEnPaisNotion).
  - `renderPorCobrar (index.html:6801) + optsFor (index.html:6873) + asociarCobro (index.html:6918)`
- **Clientes** — Lista todos los contactos/clientes activos filtrados por país (recEnPaisNotion). Renderiza tarjetas con nombre, estado, tipo, país, servicios de interés, teléfono, email. Permite buscar por nombre/ciudad (filterContacts) y cargar más (cargarMasContactos). Reutilizada por Coordinador (coordinador) y CEO.
  - `renderClientesView (index.html:9486) + renderContactList (index.html:9519) + coordContactCard (index.html:9560)`
- **Gastos** — Carga y renderiza gastos del mes actual (fetchGastosForMonth). Filtra por país (finRecEnPais), categoría y clase (directo/indirecto) via select. Muestra cards con concepto, moneda, monto, proveedor, fecha, usuario que cargó. Permite cargar más con paginación. Incluye botón para agregar nuevo gasto (openNuevoGastoSheet). Sumas por moneda (sumByMoneda).
  - `renderGastosList (index.html:3744) + renderGastosListInner (index.html:3758)`
- **Ingresos** — Carga y renderiza ingresos/cobros del mes actual (fetchIngresosForMonth). Filtra por país (finRecEnPais) y tipo (dropdown). Muestra cards con nombre servicio, tipo, cliente, fecha, monto, facturación. Permite cargar más con paginación. Botón para nuevo ingreso manual (openNuevoIngresoSheet). Sumas por moneda (sumByMoneda).
  - `renderIngresosList (index.html:3826) + renderIngresosListInner (index.html:3840)`
- **Nuevo Ingreso Manual** — Sheet modal para cargar ingreso/pago manual: elige cliente (dropdown de contactos), servicio vinculado (opcional, filtra por cliente), moneda (UY$/USD), monto, fecha, tipo, detalle, facturación. openNuevoIngresoSheet carga datos async. renderIngresoSheet renderiza formulario dinámicamente. saveIngreso valida, mapea país según currentUser.country, crea registro en Notion (INGRESOS_DS_ID) y recarga lista.
  - `openNuevoIngresoSheet (index.html:3906) + renderIngresoSheet (index.html:3922) + saveIngreso (index.html:3955)`
- **Reportes** — Tab con 3 botones: reporte semanal (últimos 7 días), reporte mensual (mes en curso), reporte por servicio (elige servicio completado). Genera PDF con jsPDF. Filtra por país Uruguay (paisF). Agrupa gastos por categoría e ingresos por tipo. Incluye estado de cuenta, balance, detalles de movimientos. Solo Uruguay (hardcoded).
  - `renderReportes (index.html:3991) + generateFinanceReportPDF (index.html:4003)`
- **Aislamiento por País (Gastos/Ingresos)** — Función client-side que filtra registros de Finanzas (Gastos/Ingresos) por país. Si ceoViewCountry === 'Uruguay', incluye registros sin País + País='UY'. Otros países solo incluyen su código. Reutilizada por renderGastosList, renderIngresosList, renderCEOFinanzas, renderPorCobrar.
  - `finRecEnPais (index.html:2884)`
- **Aislamiento por País (Servicios/Contactos)** — Versión Notion de finRecEnPais: filtra por COUNTRY_NOTION_MAP (nombres completos tipo '🇺🇾 Uruguay'). Aplica a Por cobrar (servicios) y Clientes (contactos). Si ceoViewCountry === 'Uruguay', incluye sin País.
  - `recEnPaisNotion (index.html:2893)`
- **Métricas CEO** — Dashboard de KPIs del período (mes/semana/año/rango/todo): balance por moneda con delta vs mes anterior, ticket promedio, servicios completados, margen real (por moneda) y unificado (USD approx), pipeline activo, propuestas. Sparkline de 6 últimos meses. Servicios por tipo (chart barras). Alertas (A revisar): ingresos sin servicio vinculado, servicios completados sin fecha. Cachea servicios (_ceoServiciosAll) por sesión. Filtra por período (getCEOPeriodRange) y país.
  - `renderCEOMetricas (index.html:6289)`
- **Servicios CEO** — Lista servicios del mes en adelante, agrupados por país. Muestra estado (✅ Completado, ✈️ En curso, 🔄 Asignado), tipo, fecha programada, operario. Botón para PDF si completado (generateReportPDFFromCEO). Filtra por país (País select name === COUNTRY_NOTION_MAP). Cache opcional (_ceoServiciosCache).
  - `renderCEOServicios (index.html:6430)`
- **Selector de Período CEO** — UI con chips (Mes/Semana/Año/Rango/Todo) para cambiar período. getCEOPeriodRange retorna {start, end, label} en ISO-8601. Rango permite 2 date inputs. Reutilizada por Métricas y Finanzas (estado compartido ceoPeriod). Funciones: setCEOPeriodMode, shiftCEOPeriod, setCEORange, rerenderCEOActive.
  - `renderCEOPeriodSelector (index.html:6505) + getCEOPeriodRange (index.html:6478)`
- **Equipo** — Muestra roster de equipo de Notion (EQUIPO_DB_ID, filtrado por país y estado activo). Agrupa por país con flags. adminAccountsHTML renderiza cuentas de login (USERS) con botón Set/Reset PIN (adminSetPin) solo para admins (isAppAdmin). Fallback local (renderCEOEquipoLocal) si Notion falla. Cache opcional (_ceoEquipoCache).
  - `renderCEOEquipo (index.html:6991) + renderCEOEquipoLocal (index.html:7032) + adminAccountsHTML (index.html:6970)`
- **Admin: Validación de Admins** — Retorna true si currentUser.id está en whitelist hardcoded ['diego-laxalt', 'eduardo-cabral']. Controlador de acceso para adminSetPin y adminAccountsHTML.
  - `isAppAdmin (index.html:6949)`
- **Admin: Set/Reset PIN** — Prompt para nuevo PIN (4 o 6 dígitos). POST a /api/admin-set-pin con {targetId, newPin} + token. Espejo de ADMIN_IDS en backend (server valida). No requiere PIN anterior. Alertas de éxito/error.
  - `adminSetPin (index.html:6952)`
- **Admin: Cuentas de Acceso** — Renderiza solo si isAppAdmin() === true. Sección 🔑 Cuentas de acceso agrupada por país (COUNTRY_FINANCE_MAP short codes) listando USERS con nombre, rol traducido, botón 🔑 PIN para adminSetPin. Visible en renderCEOEquipo.
  - `adminAccountsHTML (index.html:6970)`
- **Filtros CEO (País + Período)** — ceoViewCountry (variable global) controla filtro de país. COUNTRY_FINANCE_MAP traduce país a Notion select value (UY/BR/PA/GT/MX). Período se maneja via ceoPeriod.mode + getCEOPeriodRange. Aplicado en servidor (Notion filter) y cliente (finRecEnPais, recEnPaisNotion).
  - `getCEOFilter (implicit via ceoViewCountry + COUNTRY_FINANCE_MAP) + getCEOFinanceFilter (implicit via finRecEnPais)`

### Backend API y Infraestructura Frontend de FlyClean

- **notion.js - Proxy Notion con autenticación y reintentos** — Proxy de Notion API que valida sesión con token HMAC (ENFORCE_AUTH cierra agujero #1), reintenta ante 429/5xx con backoff, y fallback a search API para DBs con múltiples data sources
  - `api/notion.js:52-158 (handler + notionFetch)`
- **upload-url.js - Generación de URLs presignadas R2** — Genera URLs presignadas de Cloudflare R2 para subir fotos (servicios pre/post/relevamiento) y recibos (gastos). Valida sesión, MIME types (img/pdf), y namespacing de keys (servicios/{id}/{tipo}/ vs gastos/{id})
  - `api/upload-url.js:70-150 (handler)`
- **img.js - Proxy de imágenes para PDFs** — Proxy same-origin que carga imágenes desde cdn.flyclean.app para html2canvas (PDF generation). Bloquea redirects (defensa SSRF) y solo sirve del CDN propio
  - `api/img.js:5-27 (handler)`
- **extract-receipt.js - OCR de recibos con Claude Haiku** — OCR defensivo: Haiku 4.5 con tool_use estructurado (previene prompt injection), sólo CDN R2 validado, rate-limit 60 calls/hora in-memory, sanitización server-side (monto ≤100k, fecha ±365d, moneda enum), devuelve confianza+motivo
  - `api/extract-receipt.js:188-283 (handler + sanitizeAndCap)`
- **version.js - Version gate para TWA/APK** — Endpoint público que devuelve versión web actual (APP_VERSION) y mínima de APK requerida (MIN_APK_VERSION_REQUIRED). Cache 60s. Sin auth, usado por PWA/APK para detectar updates
  - `api/version.js:10-33 (handler)`
- **verify-pin.js - Validación de PIN y emisión de token** — Valida PIN server-side contra USER_PINS env o hash custom en KV (prioridad KV). Timing-safe comparison (SHA256 hashes, no filtra longitud). Rate-limit 8 intentos/min por usuario (in-memory). Devuelve token HMAC si válido
  - `api/verify-pin.js:32-75 (handler + safeEqual)`
- **set-pin.js - Cambio de PIN seguro por el usuario** — Cambio de PIN user-initiated: requiere sesión válida + PIN actual correcto (timing-safe). Guarda nuevo PIN hasheado (scrypt s2) en KV. Acepta 4 o 6 dígitos. Demora 400ms en fallo (anti brute-force)
  - `api/set-pin.js:24-66 (handler)`
- **admin-set-pin.js - Reset de PIN por admin** — Reset de PIN de otro usuario: requiere sesión + que caller sea en ADMIN_IDS env (default diego-laxalt,eduardo-cabral). NO pide PIN anterior. Guarda en KV, aplica al instante (verify-pin da prioridad a KV)
  - `api/admin-set-pin.js:23-50 (handler)`
- **cron-pipeline.js - Automatización de propuestas (45d sin respuesta)** — Cron diario (11:00 UTC = 8:00 UY) que: (1) mueve propuestas a '😶 Sin respuesta' después de 45 días sin respuesta, (2) marca '📞 Para re-contactar' a los 15 días (1 sola vez), (3) limpia marcador si vuelven a estar frescas. Email a Federico + Diego solo si hay novedades. Modo dry=1 simula sin escribir
  - `api/cron-pipeline.js:23-81 (handler)`
- **cron-report.js - Resumen automático para CEO** — Cron programable (default: viernes 21:00 UTC, lunes 11:00 UTC). Viernes: servicios completados, equipo de la semana (piloto+ayudantes tally), propuestas viejas. Lunes: próximos servicios, sin operario, para re-contactar. Email autosuficiente con HTML formateado. Soporta override ?tipo=viernes|lunes ?to=
  - `api/cron-report.js:53-115 (handler + svcCard + section)`
- **session.js - Tokens HMAC stateless (v1)** — Token firmado HMAC-SHA256 sin base/KV. Payload: {id, exp: +30 días}. Clave derivada de CRON_SECRET (si rota, usuarios reingresan). Devuelve null si inválido/expirado (fail-safe). Extrae de 'Authorization: Bearer <token>'
  - `api/_lib/session.js:12-49 (signSession + verifySession + tokenFromReq)`
- **pins.js - Store de PINs custom en Upstash KV** — Hash scrypt s2 (salteado 16B, derivación 32B). KV storage via Upstash REST API. Si KV no disponible, degrada a USER_PINS env (nadie queda trancado). getUserPinHash retorna null si no existe, verify usa timingSafeEqual
  - `api/_lib/pins.js:25-49 (hashPin + verifyPinHash + getUserPinHash + setUserPinHash)`
- **notion.js (_lib) - Helpers server-side para Notion** — queryAll: paginación automática (cursor, page_size:100, cap 2000). Fallback a search si multiple_data_sources_for_database (normaliza sin guiones). updatePage: PATCH de propiedades. Usa NOTION_TOKEN env
  - `api/_lib/notion.js:17-61 (queryAll + searchByParent + updatePage)`
- **email.js (_lib) - Envío vía Resend** — sendEmail: POST a Resend API con Bearer token. Fallback graceful si RESEND_API_KEY no existe (loguea, no falla el cron). FROM default: onboarding@resend.dev (para PROD: avisos@flyclean.app tras verificar dominio). emailLayout: HTML con marca verde #00C98D
  - `api/_lib/email.js:10-34 (sendEmail + emailLayout)`
- **TRANSLATIONS - i18n (es/pt-BR)** — Diccionario JSON anidado {es: {...}, pt-BR: {...}}. currentLang es 'es' por defecto, sobrescrito si país=Brasil && localStorage fc_lang_Brasil='pt-BR'. Fallback a 'es' si key falta. Función t(key) retorna traducción
  - `index.html:1646-2751 (TRANSLATIONS obj + currentLang + t())`
- **callNotion - Llamada a proxy Notion** — POST a /api/notion con {endpoint, method, body}. Headers: 'Authorization': 'Bearer ' + fc_token localStorage. Si 401 → forceRelogin(). Si !ok → error. Retorna response.json()
  - `index.html:3302-3311 (callNotion async)`
- **callNotionAll - Paginación de Notion** — Envuelve callNotion en loop while cursor (page_size:100). Concatena results. Guard < 40 iteraciones (cap ≈4000 filas). Necesario para Gastos/Ingresos (sumar año/rango). NO usar en Servicios (multi-data-source: fallback search no pagina)
  - `index.html:3316-3326 (callNotionAll async + loop cursor)`
- **enqueueWrite - Encola escritura para offline** — Abre IndexedDB fc-offline-v1, añade item {pageId, properties, queuedAt, retries:0}. Fallback a memory si IndexedDB falla. Lanza renderOfflineBadge() al añadir
  - `index.html:3408-3423 (enqueueWrite async)`
- **processQueue - Sincroniza cola offline** — Si online y no _queueProcessing: lee queue, saltea ítems con processing reciente (<90s, contra doble-sync entre tabs). PATCH cada pageId. Si ok → remove; si error → retry+1 (cap 10), si >10 → discard. Rompe loop en primer error (sin conexión probable)
  - `index.html:3472-3504 (processQueue async + loop items)`
- **renderOfflineBadge - Badge de sincronización** — Lee queue, muestra/oculta badge #offline-badge según items.length. Online: amber dot '🔄 N sincronizando…'. Offline: red dot '📴 N pendientes sin conexión'
  - `index.html:3506-3525 (renderOfflineBadge async)`
- **queueableUpdateServiceProps - Wrapper inteligente** — Intenta updateServiceProps; si falla por red (no online u error 'Network*'), encola vía enqueueWrite. Otros errores (validación 4xx) se propagan. Retorna {queued:true} si encolado
  - `index.html:3528-3540+ (queueableUpdateServiceProps async)`
- **Service Worker (sw.js) - Cache strategy** — Cache v72 (SHELL: /, /manifest, /icon-*, jspdf). Notion queries: STALE-WHILE-REVALIDATE (cache instant si existe, revalida bg). Miss: espera 12s red, luego offline JSON. Writes/uploads: network-only. Clave por ?k=base64(bodyText) en query (no #fragment)
  - `sw.js:58-174 (install/activate/fetch handlers)`
- **Session token - Authorization header** — Token HMAC guardado en localStorage.fc_token post-login (verify-pin.js). Cada callNotion() lo adjunta en header Authorization. Si falla 401 en callNotion → forceRelogin() borra token y resetea sesión
  - `index.html:3305 (localStorage fc_token + 'Authorization': 'Bearer ' + token)`
- **Offline Queue (IndexedDB)** — DB fc-offline-v1, store writeQueue con keyPath 'id' autoIncrement. Items: {id, pageId, properties, queuedAt, retries, processing}. getQueueItems, removeQueueItem, updateQueueItem con transacciones read/readwrite
  - `index.html:3391-3405 (openOfflineDB + OFFLINE_DB_NAME=fc-offline-v1, OFFLINE_STORE=writeQueue)`
- **CORS allow-list - Política de origen** — Endpoints permite: https://flyclean.app, https://www.flyclean.app, https://flyclean-app.vercel.app, y regex ^https://flyclean-app-[a-z0-9]+-fly-clean-app-s-projects\.vercel\.app$. Fallback origin siempre flyclean.app. Vary: Origin en headers
  - `api/notion.js:54-67, upload-url.js:11-67, extract-receipt.js:16-28`
- **Rate limit - PIN verification** — In-memory map id → {count, ts}. 8 intentos/60s por usuario. Si excede → 429. In-memory solo (per-instance cold-start reset) pero frena brute-force obvio sobre 4 dígitos. Para robusto: usar KV
  - `api/verify-pin.js:26-31 (attempts Map, WINDOW_MS=60s, MAX_ATTEMPTS=8)`
- **Rate limit - OCR (extract-receipt)** — In-memory circular buffer. 60 calls/hora global (equipo ≈7 personas). Shift viejos antes de push. Devuelve false si lleno → 429. Para prod: usar Vercel KV + sliding window
  - `api/extract-receipt.js:33-42 (rlBuffer, RL_WINDOW_MS=3600000, RL_MAX_CALLS=60)`
- **Validation - Sanitización post-LLM** — Post-LLM sanity checks: monto ≤100k (si >100k → 100k), fecha ±365d (si fuera → today), moneda al enum, confianza al enum, motivo al enum. Nunca error → siempre devuelve estructura válida (worst-case: confianza=baja, monto=0, proveedor='')
  - `api/extract-receipt.js:136-186 (sanitizeAndCap)`
- **Prompt injection defense - Tool use** — Claude con tool_choice={type:'tool', name:'guardar_datos_recibo'} OBLIGA devolver estructura exacta. Si texto en recibo dice 'ignorá esto y haz X', la respuesta sigue siendo el tool (imposible inyectar). SYSTEM_PROMPT advierte ignorar instrucciones en imagen
  - `api/extract-receipt.js:66-111 (EXTRACT_TOOL schema + tool_choice)`
- **SSRF defense - Proxy img.js** — Whitelist solo cdn.flyclean.app, bloquea otros hosts. redirect:'manual' → no sigue 30x (si upstream redirige a localhost/169.254 no lo sigue). Solo host directo, sin redirects
  - `api/img.js:10-17 (redirect:'manual', hostname check, 30x block)`
- **Image validation - MIME type enforcement** — Servicios: jpg/png/webp/heic/heif. Recibos: jpg/png/webp/heic/heif/pdf. Valida contentType en request.body, rechaza si no está en set
  - `api/upload-url.js:18-42 (ALLOWED_IMAGE_MIMES, ALLOWED_RECIBO_MIMES)`
- **Key namespacing - R2 buckets** — Servicios: servicios/{serviceId}/fotoType/{timestamp}-{rand}.{ext}. Gastos: gastos/{gastoId}/{timestamp}-{rand}.{ext}. UUIDs validados (servicios: 32-36 hex-dash, gastos: 8-36 alphanum-dash). Imposible collisionar ni acceder otro ID
  - `api/upload-url.js:122-133 (key construction)`
- **Fail-closed behavior - Config checks** — Sin CRON_SECRET env → 500. Sin NOTION_TOKEN → 500/error. Sin KV → 503 (en set-pin/admin). Sin R2 creds → 500. Sin Anthropic key → 500. Cada parte crítica falla cerrado, no silencioso
  - `api/cron-pipeline.js:26-27, cron-report.js:55-57, verify-pin.js líneas múltiples`
- **Audit trail - Logging** — Logs en console.warn/error: [cron-pipeline], [cron-report], [extract-receipt]. Detalles cortos, nunca SDK objects/headers. Errores genéricos al cliente (no exponer internals)
  - `api/cron-pipeline.js:76, cron-report.js:111, extract-receipt.js:280`
- **Idempotence - Offline sync** — Queue item tiene .processing timestamp. Si < 90s → skip (otra tab la está sincronizando). Si >90s → reclama y reintenta. PATCH es idempotente naturalmente (Notion API), así que retries no duplican
  - `index.html:3480-3482 (processQueue item.processing check)`

### FlyClean - Capacidades Transversales & Modelo de Datos

- **OCR de Recibos con IA (Claude Vision)** — Endpoint /api/extract-receipt procesa imágenes/PDFs de recibos via Claude Haiku 4.5 con tool_use estructurado. Tool schema inmutable previene prompt injection. Validaciones defensivas: monto ≤100k, fecha ±365 días, moneda en enum. Retorna confianza (alta/media/baja) + motivo.
  - `extractReceiptViaAI() @ index.html:4265 + /api/extract-receipt.js:1-283`
- **Gate OCR solo Uruguay** — Condición hardcodeada: if (currentUser?.country !== 'Uruguay') → carga manual sin OCR. La foto se sube igual a R2 como respaldo.
  - `uploadReceiptPhoto() @ index.html:4740-4743`
- **PDF de Devolución/Reporte de Servicio** — Genera PDF A4 con jsPDF (self-hosted /vendor/jspdf.umd.min.js, carga on-demand). Incluye datos generales, resultado, fotos (máx 1100px, JPEG 0.82 para peso). Proxy fetchReportImg() reduce imágenes. On-demand load previene overhead.
  - `generateReportPDF() @ index.html:8680 + ensureJsPDF() @ 8552`
- **Helpers Dinero/Moneda: montoOf** — Extrae { moneda, esUY, monto } leyendo campos MONTO_FIELDS por kind (gasto/ingreso). Lógica: etiqueta explícita > inferencia (legacy) > default UY$. Resuelve ambigüedad moneda en historiales antiguos.
  - `montoOf() @ index.html:4154`
- **Helpers Dinero: fmtMoneda** — Formatea número con etiqueta: UY$ sin decimales (es-UY locale), USD con hasta 2. Usa MONEDA_LABEL enum. Soporta valores negativos (Math.abs).
  - `fmtMoneda() @ index.html:4186`
- **Helpers Dinero: sumByMoneda** — Suma resultados filtrando con kpiIncluido(). Retorna { uyu, usd }. Nunca mezcla monedas. Excluye internos/financiamiento/marcados 'Excluir de KPIs'.
  - `sumByMoneda() @ index.html:4192`
- **Helpers Dinero: fmtTotalSplit** — Formatea HTML con dos líneas de monto (UY$ · USD). Omite línea si total=0. Soporta opts.sign ('+' para ingresos). Default muestra UY$ 0 si ambos vacíos.
  - `fmtTotalSplit() @ index.html:4199`
- **Exclusión de KPIs: kpiIncluido** — Predicate: return !(Excluir de KPIs checkbox || esFinanciamiento() || tipoInterno()). Usado en sumByMoneda, acumuladores CEO/mensual. Badge muestra '🔁 interno'.
  - `kpiIncluido() @ index.html:4176`
- **Exclusión de KPIs: esFinanciamiento** — Retorna !!r?.properties?.['Financiamiento']?.select?.name. Identifica préstamos de socios (ej. Neidat). Se muestran aparte en sección 'DEUDA', badge '🏦 préstamo'.
  - `esFinanciamiento() @ index.html:4173`
- **Exclusión de KPIs: tipoInterno** — Lee r?.properties?.['Tipo interno']?.select?.name. Valores: 💱 Cambio, 🏦 Depósito, 🔁 Traspaso. NO es gasto/ingreso real.
  - `tipoInterno() @ index.html:4175`
- **Cliente 360 - Historial Completo** — 4 queries en paralelo: propuestas, relevamientos, servicios completados, ingresos vinculados a contacto. Cachea en _contactHistoryCache. Resumen financiero: cobrado UY$/USD, presupuestado, nº servicios.
  - `loadContactHistory() @ index.html:9737 + renderContactHistory() @ 9800`
- **Cliente 360 - Resumen Financiero** — Calcula dentro del historial: cobUSD, cobUY (sumando ingresos), presupUSD (propuestas), nServ (servicios completados). HTML con 💵 Cobrado (moneda separada), 📄 Presupuestado, 🛠️ Servicios.
  - `renderContactHistory() @ index.html:9812-9823`
- **Alertas Dinámicas (loadAlerts)** — Carga 3 tipos de alertas según rol: (1) Equipos con mantenimiento vencido/próximo (Activos DB), (2) Servicios pendientes sin fecha/operario (Coord+CEO), (3) Propuestas 15+ días sin respuesta (Coord+CEO), (4) Documentos certificados por vencer.
  - `loadAlerts() @ index.html:10033`
- **Alertas - Documentos & Certificados** — Query a base Documentos (DOCUMENTOS_DB_ID). Filtra por país (Coord) o global (CEO). Calcula días hasta vencimiento. Alerta crítica si fecha ≤ hoy, warning si ≤30 días.
  - `loadAlerts() @ index.html:10136-10167`
- **Const USERS (equipo + roles)** — Array de 23 usuarios con { id, name, role, emoji, notionId, country }. Roles: 🎯 Dirección, 🔧 Coordinador, 🛠️ Operario, 👔 CEO, 📊 Administración. País-aware (UY, BR, PA, GT, MX). Diego Laxalt único con notionId.
  - `const USERS @ index.html:1610-1632`
- **COUNTRY_NOTION_MAP (mapa países)** — Map: 'Uruguay' → '🇺🇾 Uruguay', 'Brasil' → '🇧🇷 Brasil', 'Panamá' → '🇵🇦 Panamá', 'Guatemala' → '🇬🇹 Guatemala', 'México' → '🇲🇽 México'. Usado en filtros Notion (Servicios, Contactos, Propuestas).
  - `const COUNTRY_NOTION_MAP @ index.html:1635-1641`
- **COUNTRY_FINANCE_MAP (moneda x país)** — Map: 'Uruguay' → '🇺🇾 UY', 'Brasil' → '🇧🇷 BR', 'Panamá' → '🇵🇦 PA', 'Guatemala' → '🇬🇹 GT', 'México' → '🇲🇽 MX'. Usado en filtros finanzas (CEO, Administración).
  - `const COUNTRY_FINANCE_MAP @ index.html:2873`
- **NOTION_DBS (bases centralizadas)** — Objeto con 10 UUIDs: servicios, gastos, ingresos, propuestas, contactos, activos, equipo, regTiempo, solicitudes, documentos. Clonar DB = editar 1 bloque. Fallback queryAll() → search si multi-data-source.
  - `const NOTION_DBS @ index.html:1594-1605`
- **MONTO_FIELDS (schema de moneda por tipo)** — { gasto: { moneda:'Moneda', uy:'Monto UY$', usd:'Monto USD' }, ingreso: { moneda:'Moneda cobro', uy:'Monto UY$ cobrado', usd:'Monto USD' } }. Centraliza schema para montoOf().
  - `const MONTO_FIELDS @ index.html:4149-4151`
- **TC_FB (tipo de cambio fallback)** — TC_FB = 40 (pesos x dólar, fallback). Usado en conversión UY→USD si campo 'TC usado'/'TC aplicado' vacío. Cálculo: monto / tc.
  - `const TC_FB @ index.html:6348`
- **Financiamiento/Deuda Neidat** — Campo 'Financiamiento' marca préstamos (ej. Neidat). Dashboard CEO: separa RESULTADO OPERATIVO + bloque DEUDA. Cálculo: deuda = finRecTot - finDevTot (acumulada). No entra en KPIs.
  - `loadAlerts() + estado de cuenta CEO @ index.html:6654-6780`
- **Estado de Cuenta Multi-Moneda (CEO)** — CEO ve balance period: ingreso USD/UY, gasto USD/UY. Conversión a USD via TC. Sparkline últimos 6 meses. Filtra kpiIncluido, excluye Jornadas, Pruebas, Relevamientos.
  - `renderContactHistory() acumuladores @ index.html:6336-6362`
- **Notion Helpers Server-side (queryAll)** — Paginación automática (50-100 items/página). Fallback a searchByParent() si multi-data-source. Retorna ALL results. Usado por crons (cron-report, cron-pipeline).
  - `queryAll() @ /api/_lib/notion.js:17-34`
- **Cron Reporte CEO (viernes/lunes)** — POST /api/cron-report ?tipo=viernes|lunes. Viernes: resumen semana (servicios hecho, equipo). Lunes: pendientes (servicios sin gestionar, propuestas sin respuesta). Email autosuficiente. Require CRON_SECRET.
  - `cron-report.js @ /api/cron-report.js:1-115`
- **Rate Limit OCR** — In-memory naive: 60 calls/hora total. Sliding window RL_WINDOW_MS=3.6M. Buffer círculo (shift viejos). Para production: KV/Upstash. Bloquea abuso, cubre equipo chico.
  - `rateLimitCheck() @ /api/extract-receipt.js:36-42`
- **Categorías Gastos (enum)** — 15 categorías: ⛽ Combustible, 👥 Sueldos, 🧴 Productos, 🔧 Herramientas, 🛡️ Seguros, 📣 Marketing, 🔩 Repuestos, 🏛️ Impuestos, 🍔 Comida, ✈️ Viajes, 🚗 Patente, 🏢 Alquiler, Insumos limpieza, Servicios profesionales, Otros.
  - `CATEGORIAS @ /api/extract-receipt.js:46-62 + GASTO_CATEGORIAS @ index.html:4209-4213`
- **Validaciones OCR Server-side** — Post-LLM: monto >0 < 100k, fecha ±365 días (valida ISO), moneda forzado a enum, proveedor 80 chars, categoría map a enum, confianza enum, motivo enum. Nunca expone mensajes internos.
  - `sanitizeAndCap() @ /api/extract-receipt.js:136-186`

## ➕ Agregado después de la generación (fundir al regenerar)

- **Botones deseleccionables + reflejo en Notion (bilateral)** (sw v75) — los selects de una sola opción en
  los sheets de **Cliente** y **Propuesta** ahora se deseleccionan al tocar el activo (`propSetField`/
  `contactSetField`), EXCEPTO `País` y `Estado` (obligatorios). Y al guardar, los campos opcionales vacíos se
  escriben como **`null`** (`saveContactEdit`/`savePropEdit`) → **deseleccionar en la app BORRA en Notion**
  (antes solo agregaba; era el único agujero one-way). El resto ya era bilateral (la app lee Notion en cada
  pantalla y escribe al guardar). _En criollo: si te arrepentís de un dato y lo deseleccionás, se borra también
  en Notion; País y Estado siempre quedan marcados._

- **Propuesta ligada a Cliente (CRM interconectado)** (sw v74) — el sheet de propuesta (crear/editar) tiene
  un selector **👤 Cliente** (elegir existente o "➕ Nuevo cliente") + **Teléfono** + **Email**. Al guardar
  (`savePropEdit`): si es nuevo crea el Contacto (nombre+tel+email+país, Estado Lead), si es existente actualiza
  su tel/email, y **linkea `propuesta.Contacto`**. Helpers: `propClienteSectionHTML`/`propClienteChanged`/
  `loadPropContactos` (reusa patrón del alta de ingreso). Como `createServicio/Prueba/RelevamientoFromPropuesta`
  ya propagan el Contacto, **toda la cadena queda interconectada** (Cliente ← Propuestas ← Servicios ← Cobros).
  _En criollo: cuando Federico crea una propuesta, elige o crea el cliente con su tel/email; eso queda en la
  ficha del cliente y todo lo que venga después (servicios, cobros) queda colgado de ese cliente._

- **Contratos recurrentes + comisiones** (sw v73) — una propuesta `Tipo = 🔄 Recurrente` con `Servicios por
  año` + `Comisión %` (Notion) funciona como contrato. El sheet de propuesta (crear/editar) tiene esos 2
  campos (`openNewPropSheet`/`openPropSheet`/`savePropEdit`). El **Cliente 360** (`renderContactHistory`)
  muestra **Esperado/año** (servicios×importe), **Comisión** del intermediario y **Neto FlyClean** sobre lo
  cobrado. _En criollo: cargás "6 servicios/año, 10% de comisión" en el contrato del cliente y ves cuánto
  esperás cobrar, cuánto se lleva el intermediario y cuánto te queda neto._

---
_Generado automáticamente del código (workflow `inventario-funcionalidades`). Si algo no coincide con el código, gana el código → regenerar._
