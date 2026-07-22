// Mapeo Notion → fila Postgres. COMPARTIDO por el sync batch (scripts/sync-notion-supabase.mjs) y por el
// re-sync puntual tras guardar (api/db-sync.js). Una sola fuente de verdad del mapeo (evita drift).

// IDs de las bases de Notion (espejo de NOTION_DBS / docs/NOTION.md).
export const DBS = {
  clientes: '250115612de74e0582366549bbe5e389',
  propuestas: '2c0a4257f4294941b994dfebc1098633',
  servicios: 'ccaf276c7f6a460caeb3d2800deab2e5',
  tareas: 'ed5509c20cdd4672aab8cc1710e7ffd5',
  registro_tiempo: '57bc613af5d04908a9f2342cf6a1a5a7',
  equipo: 'cfff6e26dbc84eedb7eabcb6c51db1eb',
  activos: 'e75449eeb78143f1b74006a4796c1f95',
  insumos: 'd8bd0fa73356419dbcc481ac1ad7a380',
  proveedores: '9e97dbe8fad5428d89c1b6122792399d',
  gastos: '1e20cdabad5d41528d070ed2f6e9dad3',
  ingresos: 'd1e15376e83a408a8a52f47da33c249a',
  solicitudes_compra: '0f5cd38362ab430293a5dec7140ac18f',
  documentos: 'f888bd9c89e0497a9d2c57594aacd663',
  sops: '0c2a129734de495a8643343d7334b907',
};

// Acceso defensivo a properties de Notion.
const P = (props, name) => props?.[name];
const title = (p, n) => (P(p, n)?.title || []).map(x => x.plain_text).join('') || null;
const sel = (p, n) => P(p, n)?.select?.name ?? null;
const msel = (p, n) => (P(p, n)?.multi_select || []).map(o => o.name);
const num = (p, n) => P(p, n)?.number ?? null;
const date = (p, n) => P(p, n)?.date?.start ?? null;
const phone = (p, n) => P(p, n)?.phone_number ?? null;
const email = (p, n) => P(p, n)?.email ?? null;
const url = (p, n) => P(p, n)?.url ?? null;
const rich = (p, n) => (P(p, n)?.rich_text || []).map(x => x.plain_text).join('') || null;
const check = (p, n) => !!P(p, n)?.checkbox;
const relId = (p, n) => P(p, n)?.relation?.[0]?.id ?? null;

// País → forma "plana" que usan las RLS policies y el JWT ('🇺🇾 Uruguay' → 'Uruguay').
// Fix pre-flip INGRESOS (2026-07-15): Gastos/Ingresos/Activos/Solicitudes/Documentos guardan País en CÓDIGO
// CORTO ('🇺🇾 UY') — la versión solo-nombre devolvía null para TODAS esas filas (pais nunca poblado → el
// filtro por país de /api/db dejaba a UY viendo todo y al resto viendo nada). Misma familia que el fix
// paisCoincide de users.js (2026-07-12).
const PAISES = ['Uruguay', 'Brasil', 'Panamá', 'Guatemala', 'México'];
const PAIS_CODE = { UY: 'Uruguay', BR: 'Brasil', PA: 'Panamá', GT: 'Guatemala', MX: 'México' };
// Normaliza CUALQUIER forma de país ('🇵🇦 PA', '🇵🇦 Panamá', 'Panamá') → nombre BARE ('Panamá'). Usada por
// mapRow (para poblar la columna plana `pais`) y por /api/db (para que el filtro por país del cliente, que
// viene en código corto, matchee la columna bare — fix H1 del review Día 26 parte B).
export function paisBare(v) {
  if (!v) return null;
  const porNombre = PAISES.find(c => v.includes(c));
  if (porNombre) return porNombre;
  const m = String(v).match(/\b(UY|BR|PA|GT|MX)\b/);
  return m ? PAIS_CODE[m[1]] : null;
}
const pais = (p, n = 'País') => paisBare(sel(p, n));

// Mapeo por tabla (props de Notion + page → fila Postgres). Cada fila guarda `raw` (lossless).
export const MAP = {
  clientes: (props, page) => ({
    notion_id: page.id,
    nombre_empresa: title(props, 'Nombre / Empresa'),
    estado: sel(props, 'Estado'),
    tipo_cliente: sel(props, 'Tipo de cliente'),
    pais: pais(props),
    canal_captacion: sel(props, 'Canal de captación'),
    telefono: phone(props, 'Teléfono / WhatsApp'),
    email: email(props, 'Email'),
    ciudad: rich(props, 'Ciudad / Zona'),
    interlocutor: rich(props, 'Interlocutor'),
    notas: rich(props, 'Notas'),
    servicio_interes: msel(props, 'Servicio de interés'),
    intermediario_notion_id: relId(props, 'Intermediario'),
    raw: props,
  }),
  propuestas: (props, page) => ({
    notion_id: page.id,
    nombre: title(props, 'Nombre de propuesta'),
    estado_pipeline: sel(props, 'Estado pipeline'),
    pais: pais(props),
    tipo: sel(props, 'Tipo'),
    importe_estimado: num(props, 'Importe estimado'),
    servicios_por_anio: num(props, 'Servicios por año'),
    comision_pct: num(props, 'Comisión %'),
    aprobacion_interna: sel(props, 'Aprobación interna'),
    fecha_envio: date(props, 'Fecha de envío'),
    ultima_interaccion: date(props, 'Última interacción'),
    aviso_recontacto: check(props, 'Aviso re-contacto'),
    mapa: url(props, 'Mapa'),
    cliente_notion_id: relId(props, 'Contacto'),
    raw: props,
  }),
  servicios: (props, page) => ({
    notion_id: page.id,
    nombre_servicio: title(props, 'Nombre del servicio'),
    // Tipo de servicio pasó a multi_select (2026-07-04) — defensivo select||multi, join a texto
    // para no cambiar el tipo de la columna del espejo.
    tipo_registro: sel(props, 'Tipo de registro'),
    tipo_servicio: sel(props, 'Tipo de servicio') ?? (msel(props, 'Tipo de servicio').join(', ') || null),
    estado: sel(props, 'Estado'),
    pais: pais(props),
    operario_app: sel(props, 'Operario App'),
    operarios_participantes: msel(props, 'Operarios participantes'),
    operario_manual: sel(props, 'Operario manual'),
    fecha_programada: date(props, 'Fecha programada'),
    fecha_planificada: date(props, 'Fecha planificada'),
    hora_inicio: date(props, 'Hora Inicio'),
    hora_inicio_efectivo: date(props, 'Hora Inicio Efectivo'),
    hora_fin_efectivo: date(props, 'Hora Fin Efectivo'),
    lugar: rich(props, 'Lugar'),
    mapa: url(props, 'Mapa'),
    condicion_climatica: msel(props, 'Condición climática'),
    resultado: sel(props, 'Resultado'),
    resultado_prueba: sel(props, 'Resultado prueba'),
    ubicacion_gps: url(props, 'Ubicación GPS'),
    observacion_cliente: rich(props, 'Observación cliente'),
    notas_pre_servicio: rich(props, 'Notas pre-servicio'),
    // Método de trabajo + Herramienta manual pasaron a multi_select (2026-07-12) — defensivo select||multi,
    // join a texto para no cambiar el tipo de la columna del espejo (mismo patrón que tipo_servicio).
    metodo_trabajo: sel(props, 'Método de trabajo') ?? (msel(props, 'Método de trabajo').join(', ') || null),
    herramienta_manual:
      sel(props, 'Herramienta manual') ?? (msel(props, 'Herramienta manual').join(', ') || null),
    jornada_n: num(props, 'Jornada N°'),
    avance_pct: num(props, '% de avance'),
    excluir_kpis: check(props, 'Excluir de KPIs'),
    cliente_notion_id: relId(props, 'Contacto'),
    propuesta_notion_id: relId(props, 'Propuesta'),
    orden_madre_notion_id: relId(props, 'Orden madre'),
    raw: props,
  }),
  ingresos: (props, page) => ({
    notion_id: page.id,
    titulo: title(props, 'Nombre') || title(props, 'Servicio') || null,
    monto_uy: num(props, 'Monto UY$'),
    monto_usd: num(props, 'Monto USD'),
    fecha: date(props, 'Fecha'),
    pais: pais(props),
    tipo_ingreso: sel(props, 'Tipo de ingreso'),
    facturado: check(props, 'Facturado'),
    cliente_notion_id: relId(props, 'Cuenta') || relId(props, 'Cliente'),
    servicio_notion_id: relId(props, 'Servicio vinculado') || relId(props, 'Servicio'),
    raw: props,
  }),
  gastos: (props, page) => ({
    notion_id: page.id,
    descripcion: title(props, 'Descripción') || rich(props, 'Descripción'),
    categoria: sel(props, 'Categoría'),
    monto_uy: num(props, 'Monto UY$'),
    monto_usd: num(props, 'Monto USD'),
    fecha: date(props, 'Fecha'),
    pais: pais(props),
    forma_pago: sel(props, 'Forma de pago'),
    cargado_por: sel(props, 'Cargado por'),
    facturado: check(props, 'Facturado'),
    excluir_kpis: check(props, 'Excluir de KPIs'),
    proveedor_notion_id: relId(props, 'Proveedor'),
    servicio_notion_id: relId(props, 'Servicio vinculado') || relId(props, 'Servicio'),
    raw: props,
  }),
  equipo: (props, page) => ({
    notion_id: page.id,
    nombre: title(props, 'Nombre'),
    rol: sel(props, 'Rol'),
    pais: pais(props),
    raw: props,
  }),
  activos: (props, page) => ({
    notion_id: page.id,
    nombre: title(props, 'Nombre'),
    estado: sel(props, 'Estado'),
    pais: pais(props),
    equipo_notion_id: relId(props, 'Equipo'),
    raw: props,
  }),
  proveedores: (props, page) => ({
    notion_id: page.id,
    nombre: title(props, 'Nombre'),
    pais: pais(props),
    raw: props,
  }),
  documentos: (props, page) => ({
    notion_id: page.id,
    nombre: title(props, 'Nombre'),
    tipo: sel(props, 'Tipo'),
    vencimiento: date(props, 'Vencimiento'),
    dias_aviso: num(props, 'Días de aviso'),
    pais: pais(props),
    raw: props,
  }),
  tareas: (props, page) => ({
    notion_id: page.id,
    nombre: title(props, 'Nombre') || title(props, 'Tarea'),
    estado: sel(props, 'Estado'),
    pais: pais(props),
    servicio_notion_id: relId(props, 'Servicio'),
    raw: props,
  }),
  registro_tiempo: (props, page) => ({
    notion_id: page.id,
    pais: pais(props),
    servicio_notion_id: relId(props, 'Servicio'),
    tarea_notion_id: relId(props, 'Tarea'),
    raw: props,
  }),
  insumos: (props, page) => ({
    notion_id: page.id,
    nombre: title(props, 'Nombre'),
    pais: pais(props),
    raw: props,
  }),
  solicitudes_compra: (props, page) => ({ notion_id: page.id, pais: pais(props), raw: props }),
  sops: (props, page) => ({
    notion_id: page.id,
    nombre: title(props, 'Nombre'),
    pais: pais(props),
    raw: props,
  }),
};

// Mapea una page de Notion a su fila Postgres para el resource dado.
export function mapRow(resource, page) {
  const fn = MAP[resource];
  if (!fn) return null;
  return fn(page.properties || {}, page);
}

// ── Inverso: derivar el `resource` de una página (para el mirror inline del proxy — 3a.1) ──────────────
// Solo las 5 tablas espejadas. La app crea servicios/gastos/ingresos por data_source_id (multi-data-source),
// así que la página devuelta puede reportar el parent como database_id O como data_source_id → cubrimos ambos.
const _norm = s =>
  String(s || '')
    .replace(/-/g, '')
    .toLowerCase();
const _MIRRORED = ['clientes', 'propuestas', 'servicios', 'ingresos', 'gastos'];
export const RESOURCE_BY_DB = Object.fromEntries(_MIRRORED.map(r => [_norm(DBS[r]), r]));
const RESOURCE_BY_DS = {
  [_norm('2fbc8a03-5c4f-445c-8516-71dd9b2eea78')]: 'servicios',
  [_norm('58fd9475-9baf-4d0e-9128-486185bf7ed8')]: 'gastos',
  [_norm('6bb3da36-1865-4668-9d43-cc6bb9966784')]: 'ingresos',
};
export function resourceFromPage(page) {
  const par = page?.parent || {};
  return RESOURCE_BY_DB[_norm(par.database_id)] || RESOURCE_BY_DS[_norm(par.data_source_id)] || null;
}
