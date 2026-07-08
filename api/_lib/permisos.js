// Matriz de permisos por rol para el proxy /api/notion (modo MONITOR→ENFORCE, ver ENFORCE_PERMS ahí).
// Gobierna SOLO: queries por DB (databases/{id}/query), schema por DB (GET databases/{id}),
// creates (POST pages, por parent.database_id o parent.data_source_id) y search directo del cliente.
// pages/{id} GET/PATCH quedan FUERA de la matriz (residual documentado: se accede por id de página,
// no por base; el backstop de Ventas sí los verifica porque ese rol tiene su propio bloque).
//
// ── Cómo se armó la matriz (inventario 2026-07-04, grep de callNotion( en index.html) ──
// Cada rol entra por routeByRole() (index.html ~4463):
//   '🎯 Dirección' + '🔧 Coordinador' + '🧲 Ventas' → loadCoordinator() · '👔 CEO' → loadCEO()
//   '📊 Administración' → loadFinanzas() · resto ('🛠️ Operario') → loadServices()
//
// 🎯 Dirección → '*' (todo): usa el panel coordinador COMPLETO, entra al panel CEO (ceoBtn,
//   index.html ~9404) y es el único rol con el Panel 🧹 Limpieza (loadAllClientesGlobal,
//   renderLimpiezaDuplicados, buildMergePlan → query masiva de contactos/servicios/propuestas/
//   ingresos + renderLimpiezaServicios/bulkRenameServices). Enumerar no aporta: toca todas las bases.
//
// 👔 CEO → '*' (todo): el inventario le da query sobre 8 de 10 bases —
//   servicios (renderCEOMetricas, renderCEOServicios), contactos (renderCEOMetricas,
//   renderClientesView), propuestas (renderCEOMetricas, loadAlerts), ingresos+gastos
//   (renderCEOFinanzas, renderPorCobrar readonly), equipo (renderCEOEquipo), activos+documentos
//   (loadAlerts). Solo le faltarían solicitudes y regTiempo; el panel CEO crece rápido
//   (badges/vistas nuevas) → '*' evita romper flujos por una base olvidada. Afinable post-monitor.
//
// 🔧 Coordinador:
//   query: servicios (fetchCoordItemsForMonth, renderCoordResumen, loadAlerts, loadContactHistory),
//     propuestas (renderCoordPropuestas, loadAlerts, loadContactHistory),
//     contactos (renderCoordContactos, loadPropContactos, loadNewSvcContactos, renderCoordProspeccion,
//       loadContactIntermediarios, dedup de resolveOrCreateClienteId/savePropEdit/saveContactEdit, loadAlerts),
//     ingresos (loadContactHistory — pagos del cliente 360, read-only),
//     gastos (renderGastosScreen rama isCoord, fetchGastosDelServicio en openEditSheet),
//     solicitudes (renderCoordPedidos, loadAlerts),
//     activos (loadAlerts — corre para todos los roles; fetchActivosDisponibles en openEditSheet),
//     regTiempo (fetchEquiposDelServicio en openEditSheet),
//     documentos (loadAlerts, rama isCoord||isCEO).
//   create: servicios (submitNewService, createServicioFromPropuesta, createPruebaFromPropuesta,
//       createRelevamientoFromPropuesta, submitCreateJornada — todos por data_source_id),
//     contactos (resolveOrCreateClienteId, savePropEdit, saveContactEdit, saveProspecto),
//     propuestas (savePropEdit), gastos (saveGasto — botón 💸 del header coord + "＋ Agregar gasto"
//       del sheet edit), solicitudes (savePedido — botón 📦 del header coord),
//     regTiempo (addEquipoToServicio, por database_id).
//
// 🛠️ Operario:
//   query: servicios (getMyServices), gastos (renderGastosScreen rama isOperario + botón 💸 del
//       header de screen-services; fetchGastosDelServicio dentro de saveGasto),
//     solicitudes (loadMisPedidos), activos (loadAlerts corre en screen-services para todos;
//       fetchActivosDisponibles en renderStep — equipos asignados read-only),
//     regTiempo (fetchEquiposDelServicio en renderStep).
//   create: servicios (crearJornadaSiguiente en _ejecutarCierre — "sigo otro día" crea la J2, por
//       data_source_id), gastos (saveGasto — carga diaria por foto), solicitudes (savePedido —
//       botón 📦 del header operario).
//
// 📊 Administración (Finanzas):
//   query: gastos (fetchGastosForMonth/renderGastosList, generateFinanceReportPDF),
//     ingresos (fetchIngresosForMonth/renderIngresosList, renderCEOFinanzas — tab resumen,
//       renderPorCobrar, loadContactHistory),
//     servicios (renderPorCobrar, openServicePickerForReport, openNuevoIngresoSheet, openCobroSheet),
//     propuestas (renderPorCobrar, loadContactHistory), contactos (renderPorCobrar,
//       renderClientesView — tab clientes, openNuevoIngresoSheet),
//     activos + regTiempo (openEditSheetFromFinanzas abre openEditSheet → fetchActivosDisponibles +
//       fetchEquiposDelServicio; "solo Finanzas opera", index.html ~10388).
//   create: ingresos (saveIngreso — nuevo ingreso/pago manual, solo Finanzas, por data_source_id),
//     gastos (saveGasto — atribución/carga de gastos, botones en renderGastosList y renderCEOFinanzas),
//     servicios (submitCreateJornada vía el sheet edit compartido — dudoso pero incluido: matriz
//       generosa > romper flujo), contactos (saveContactEdit desde la tab Clientes — el bloqueo
//       solo-lectura aplica a CEO, no a Finanzas; dudoso pero incluido).
//
// 🧲 Ventas: NO está en esta matriz. Su backstop dedicado en api/notion.js (esVentas) corta primero
//   y gobierna TODO su acceso, incluido pages/{id}. Desde 2026-07-05 (ver+seguimiento): Clientes/
//   Contactos (como siempre) + LEER Propuestas + PATCH de propuestas restringido a la property
//   'Última interacción'. En /api/db: resources 'clientes' y 'propuestas'. No tocar acá.
//
// search: el cliente NUNCA llama search directo (grep: cero callNotion('search'...) en index.html).
//   El fallback multi-data-source de la DB Servicios usa search SERVER-SIDE dentro del propio proxy
//   (el request del cliente sigue siendo databases/{id}/query) → la matriz evalúa el endpoint PEDIDO,
//   así que search queda en false para todos los roles enumerados.

const norm = (s) => String(s || '').replace(/-/g, '').toLowerCase();

// IDs normalizados (sin guiones, lowercase). db = database_id · ds = data_source_id (los creates
// de servicios/gastos/ingresos/solicitudes van por data_source_id; el resto por database_id).
export const DB = {
  serviciosDb:   'ccaf276c7f6a460caeb3d2800deab2e5',
  serviciosDs:   '2fbc8a035c4f445c851671dd9b2eea78',
  gastosDb:      '1e20cdabad5d41528d070ed2f6e9dad3',
  gastosDs:      '58fd94759baf4d0e9128486185bf7ed8',
  ingresosDb:    'd1e15376e83a408a8a52f47da33c249a',
  ingresosDs:    '6bb3da36186546689d43cc6bb9966784',
  propuestas:    '2c0a4257f4294941b994dfebc1098633',
  contactos:     '250115612de74e0582366549bbe5e389',
  activos:       'e75449eeb78143f1b74006a4796c1f95',
  equipo:        'cfff6e26dbc84eedb7eabcb6c51db1eb',
  regTiempo:     '57bc613af5d04908a9f2342cf6a1a5a7',
  solicitudesDb: '0f5cd38362ab430293a5dec7140ac18f',
  solicitudesDs: '0d49d6121fea40d78b94d2b0dcae1b12',
  documentosDb:  'f888bd9c89e0497a9d2c57594aacd663',
};

// Clave de rol → permisos. La clave se matchea por .includes() contra u.rol de api/_lib/users.js
// (así '🎯 Dirección' matchea 'Dirección', etc.). '*' = todo permitido (query/schema/create/search).
// En los creates se listan db id Y ds id: el cliente crea con data_source_id en unas bases y con
// database_id en otras — aceptar ambos evita falsos DENEGARÍA por la forma del parent.
export const PERMISOS = {
  'Dirección': '*',
  'CEO': '*',
  'Coordinador': {
    query: [DB.serviciosDb, DB.propuestas, DB.contactos, DB.ingresosDb, DB.gastosDb,
            DB.solicitudesDb, DB.activos, DB.regTiempo, DB.documentosDb],
    create: [DB.serviciosDb, DB.serviciosDs, DB.contactos, DB.propuestas,
             DB.gastosDb, DB.gastosDs, DB.solicitudesDb, DB.solicitudesDs, DB.regTiempo],
    search: false,
  },
  'Operario': {
    query: [DB.serviciosDb, DB.gastosDb, DB.solicitudesDb, DB.activos, DB.regTiempo],
    create: [DB.serviciosDb, DB.serviciosDs, DB.gastosDb, DB.gastosDs,
             DB.solicitudesDb, DB.solicitudesDs],
    search: false,
  },
  'Administración': {
    query: [DB.gastosDb, DB.ingresosDb, DB.serviciosDb, DB.propuestas, DB.contactos,
            DB.activos, DB.regTiempo],
    create: [DB.ingresosDb, DB.ingresosDs, DB.gastosDb, DB.gastosDs,
             DB.serviciosDb, DB.serviciosDs, DB.contactos],
    search: false,
  },
};

// checkPermiso(u, { tipo, dbId }) → { ok: true } | { ok: false, motivo }
//   u: usuario de userById() ({ nombre, rol, pais }) o null.
//   tipo: 'query' | 'schema' | 'create' | 'search'. 'schema' (GET databases/{id}) usa la MISMA
//   lista que 'query' (leer el esquema no expone más que leer las filas).
//   dbId: database_id o data_source_id del request (con o sin guiones; se normaliza acá).
export function checkPermiso(u, { tipo, dbId } = {}) {
  const rol = String(u?.rol || '');
  const clave = Object.keys(PERMISOS).find((k) => rol.includes(k));
  if (!u || !clave) return { ok: false, motivo: 'rol desconocido' };
  const p = PERMISOS[clave];
  if (p === '*') return { ok: true };
  if (tipo === 'search') {
    return p.search ? { ok: true } : { ok: false, motivo: `search no permitido para ${clave}` };
  }
  const lista = tipo === 'create' ? p.create : p.query; // 'query' y 'schema' comparten lista
  const id = norm(dbId);
  if (!id) return { ok: false, motivo: 'sin dbId identificable' };
  if (lista.includes(id)) return { ok: true };
  return { ok: false, motivo: `${clave} sin ${tipo} sobre esa base` };
}
