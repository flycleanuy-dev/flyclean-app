// ============================================================================
// FlyClean — Sync Notion → Supabase  ·  Fase 1  (idempotente, upsert por notion_id)
// ----------------------------------------------------------------------------
// Llena y mantiene al día la base nueva (Postgres/Supabase) desde Notion, SIN tocar
// la app en producción (que sigue leyendo de Notion). Notion = fuente de verdad en Fase 1.
//
// Uso:
//   NOTION_TOKEN=... SUPABASE_URL=https://xxx.supabase.co SUPABASE_SERVICE_KEY=... \
//     node scripts/sync-notion-supabase.mjs
//   (opcional: SYNC_ONLY=clientes,servicios  para sincronizar solo algunas tablas)
//
// Diseño: lossless. Cada fila guarda `raw` (las properties completas de Notion) +
// columnas "atajo" mapeadas. El upsert usa PostgREST (?on_conflict=notion_id,
// Prefer: resolution=merge-duplicates) → no requiere @supabase/supabase-js.
// La SERVICE KEY bypassea RLS (necesita escribir todo).
// ============================================================================

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const NOTION_VERSION = '2022-06-28';

if (!NOTION_TOKEN || !SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Faltan envs: NOTION_TOKEN, SUPABASE_URL, SUPABASE_SERVICE_KEY');
  process.exit(1);
}

// ── IDs de las bases de Notion (espejo de NOTION_DBS / docs/NOTION.md) ──
const DBS = {
  clientes:           '250115612de74e0582366549bbe5e389',
  propuestas:         '2c0a4257f4294941b994dfebc1098633',
  servicios:          'ccaf276c7f6a460caeb3d2800deab2e5',
  tareas:             'ed5509c20cdd4672aab8cc1710e7ffd5',
  registro_tiempo:    '57bc613af5d04908a9f2342cf6a1a5a7',
  equipo:             'cfff6e26dbc84eedb7eabcb6c51db1eb',
  activos:            'e75449eeb78143f1b74006a4796c1f95',
  insumos:            'd8bd0fa73356419dbcc481ac1ad7a380',
  proveedores:        '9e97dbe8fad5428d89c1b6122792399d',
  gastos:             '1e20cdabad5d41528d070ed2f6e9dad3',
  ingresos:           'd1e15376e83a408a8a52f47da33c249a',
  solicitudes_compra: '0f5cd38362ab430293a5dec7140ac18f',
  documentos:         'f888bd9c89e0497a9d2c57594aacd663',
  sops:               '0c2a129734de495a8643343d7334b907',
};

// ── Acceso defensivo a properties de Notion ──
const P = (props, name) => props?.[name];
const title  = (p, n) => (P(p, n)?.title || []).map(x => x.plain_text).join('') || null;
const sel    = (p, n) => P(p, n)?.select?.name ?? null;
const msel   = (p, n) => (P(p, n)?.multi_select || []).map(o => o.name);
const num    = (p, n) => (P(p, n)?.number ?? null);
const date   = (p, n) => (P(p, n)?.date?.start ?? null);
const phone  = (p, n) => (P(p, n)?.phone_number ?? null);
const email  = (p, n) => (P(p, n)?.email ?? null);
const url     = (p, n) => (P(p, n)?.url ?? null);
const rich   = (p, n) => (P(p, n)?.rich_text || []).map(x => x.plain_text).join('') || null;
const check  = (p, n) => !!P(p, n)?.checkbox;
const relId  = (p, n) => (P(p, n)?.relation?.[0]?.id ?? null);

// País → forma "plana" que usan las RLS policies y el JWT ('🇺🇾 Uruguay' → 'Uruguay').
const PAISES = ['Uruguay', 'Brasil', 'Panamá', 'Guatemala', 'México'];
const pais = (p, n = 'País') => {
  const v = sel(p, n);
  if (!v) return null;
  return PAISES.find(c => v.includes(c)) || null;
};

// ── Mapeo Notion → fila Postgres (una función por tabla) ──
const MAP = {
  clientes: (props, page) => ({
    notion_id: page.id, nombre_empresa: title(props, 'Nombre / Empresa'),
    estado: sel(props, 'Estado'), tipo_cliente: sel(props, 'Tipo de cliente'),
    pais: pais(props), canal_captacion: sel(props, 'Canal de captación'),
    telefono: phone(props, 'Teléfono / WhatsApp'), email: email(props, 'Email'),
    ciudad: rich(props, 'Ciudad / Zona'), interlocutor: rich(props, 'Interlocutor'),
    notas: rich(props, 'Notas'), servicio_interes: msel(props, 'Servicio de interés'),
    intermediario_notion_id: relId(props, 'Intermediario'), raw: props,
  }),
  propuestas: (props, page) => ({
    notion_id: page.id, nombre: title(props, 'Nombre de propuesta'),
    estado_pipeline: sel(props, 'Estado pipeline'), pais: pais(props), tipo: sel(props, 'Tipo'),
    importe_estimado: num(props, 'Importe estimado'), servicios_por_anio: num(props, 'Servicios por año'),
    comision_pct: num(props, 'Comisión %'), aprobacion_interna: sel(props, 'Aprobación interna'),
    fecha_envio: date(props, 'Fecha de envío'), ultima_interaccion: date(props, 'Última interacción'),
    aviso_recontacto: check(props, 'Aviso re-contacto'), cliente_notion_id: relId(props, 'Contacto'),
    raw: props,
  }),
  servicios: (props, page) => ({
    notion_id: page.id, nombre_servicio: title(props, 'Nombre del servicio'),
    tipo_registro: sel(props, 'Tipo de registro'), estado: sel(props, 'Estado'), pais: pais(props),
    operario_app: sel(props, 'Operario App'), operarios_participantes: msel(props, 'Operarios participantes'),
    fecha_programada: date(props, 'Fecha programada'), hora_inicio: date(props, 'Hora Inicio'),
    hora_inicio_efectivo: date(props, 'Hora Inicio Efectivo'), hora_fin_efectivo: date(props, 'Hora Fin Efectivo'),
    lugar: rich(props, 'Lugar'), mapa: url(props, 'Mapa'), condicion_climatica: msel(props, 'Condición climática'),
    resultado: sel(props, 'Resultado'), resultado_prueba: sel(props, 'Resultado prueba'),
    ubicacion_gps: url(props, 'Ubicación GPS'), observacion_cliente: rich(props, 'Observación cliente'),
    excluir_kpis: check(props, 'Excluir de KPIs'), cliente_notion_id: relId(props, 'Contacto'),
    propuesta_notion_id: relId(props, 'Propuesta'), raw: props,
  }),
  ingresos: (props, page) => ({
    notion_id: page.id, titulo: title(props, 'Nombre') || title(props, 'Servicio') || null,
    monto_uy: num(props, 'Monto UY$'), monto_usd: num(props, 'Monto USD'), fecha: date(props, 'Fecha'),
    pais: pais(props), tipo_ingreso: sel(props, 'Tipo de ingreso'), facturado: check(props, 'Facturado'),
    cliente_notion_id: relId(props, 'Cuenta') || relId(props, 'Cliente'),
    servicio_notion_id: relId(props, 'Servicio vinculado') || relId(props, 'Servicio'), raw: props,
  }),
  gastos: (props, page) => ({
    notion_id: page.id, descripcion: title(props, 'Descripción') || rich(props, 'Descripción'),
    categoria: sel(props, 'Categoría'), monto_uy: num(props, 'Monto UY$'), monto_usd: num(props, 'Monto USD'),
    fecha: date(props, 'Fecha'), pais: pais(props), forma_pago: sel(props, 'Forma de pago'),
    cargado_por: sel(props, 'Cargado por'), facturado: check(props, 'Facturado'),
    excluir_kpis: check(props, 'Excluir de KPIs'), proveedor_notion_id: relId(props, 'Proveedor'),
    servicio_notion_id: relId(props, 'Servicio vinculado') || relId(props, 'Servicio'), raw: props,
  }),
  equipo:      (props, page) => ({ notion_id: page.id, nombre: title(props, 'Nombre'), rol: sel(props, 'Rol'), pais: pais(props), raw: props }),
  activos:     (props, page) => ({ notion_id: page.id, nombre: title(props, 'Nombre'), estado: sel(props, 'Estado'), pais: pais(props), equipo_notion_id: relId(props, 'Equipo'), raw: props }),
  proveedores: (props, page) => ({ notion_id: page.id, nombre: title(props, 'Nombre'), pais: pais(props), raw: props }),
  documentos:  (props, page) => ({ notion_id: page.id, nombre: title(props, 'Nombre'), tipo: sel(props, 'Tipo'), vencimiento: date(props, 'Vencimiento'), dias_aviso: num(props, 'Días de aviso'), pais: pais(props), raw: props }),
  tareas:      (props, page) => ({ notion_id: page.id, nombre: title(props, 'Nombre') || title(props, 'Tarea'), estado: sel(props, 'Estado'), pais: pais(props), servicio_notion_id: relId(props, 'Servicio'), raw: props }),
  registro_tiempo:    (props, page) => ({ notion_id: page.id, pais: pais(props), servicio_notion_id: relId(props, 'Servicio'), tarea_notion_id: relId(props, 'Tarea'), raw: props }),
  insumos:            (props, page) => ({ notion_id: page.id, nombre: title(props, 'Nombre'), pais: pais(props), raw: props }),
  solicitudes_compra: (props, page) => ({ notion_id: page.id, pais: pais(props), raw: props }),
  sops:               (props, page) => ({ notion_id: page.id, nombre: title(props, 'Nombre'), pais: pais(props), raw: props }),
};

// ── Notion: traer TODAS las páginas de una DB (con fallback multi-source vía search) ──
async function notionFetch(path, body) {
  const r = await fetch(`https://api.notion.com/v1/${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${NOTION_TOKEN}`, 'Notion-Version': NOTION_VERSION, 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {}),
  });
  return { ok: r.ok, status: r.status, json: await r.json().catch(() => ({})) };
}

async function queryAll(dbId) {
  let results = [], cursor;
  // Camino normal: databases/{id}/query
  do {
    const { ok, json } = await notionFetch(`databases/${dbId}/query`, { page_size: 100, start_cursor: cursor });
    if (!ok) {
      // Multi-source (ej. Servicios) → fallback a search filtrando por parent.database_id
      if ((json?.code || '').includes('multiple_data_sources') || json?.message?.includes('data source')) {
        return await searchByParent(dbId);
      }
      throw new Error(`Notion ${dbId}: ${json?.code || json?.message || 'error'}`);
    }
    results.push(...(json.results || []));
    cursor = json.has_more ? json.next_cursor : null;
  } while (cursor);
  return results;
}

async function searchByParent(dbId) {
  const norm = s => (s || '').replace(/-/g, '');
  let results = [], cursor;
  for (let i = 0; i < 5; i++) {     // reintentos: la search devuelve vacío bajo rate-limit
    results = []; cursor = undefined;
    do {
      const { json } = await notionFetch('search', { page_size: 100, start_cursor: cursor, filter: { property: 'object', value: 'page' } });
      results.push(...(json.results || []).filter(p => norm(p.parent?.database_id) === norm(dbId)));
      cursor = json.has_more ? json.next_cursor : null;
    } while (cursor);
    if (results.length) break;
    await new Promise(r => setTimeout(r, 1200));
  }
  return results;
}

// ── Supabase: upsert por notion_id (PostgREST) ──
async function upsert(table, rows) {
  if (!rows.length) return 0;
  let done = 0;
  for (let i = 0; i < rows.length; i += 100) {     // de a 100
    const chunk = rows.slice(i, i + 100);
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?on_conflict=notion_id`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify(chunk),
    });
    if (!r.ok) throw new Error(`Supabase ${table}: ${r.status} ${await r.text()}`);
    done += chunk.length;
  }
  return done;
}

// ── Main ──
const only = (process.env.SYNC_ONLY || '').split(',').map(s => s.trim()).filter(Boolean);
const tablas = Object.keys(DBS).filter(t => !only.length || only.includes(t));

console.log(`Sync Notion → Supabase · ${tablas.length} tabla(s)\n`);
let totalOk = 0, totalErr = 0;
for (const tabla of tablas) {
  try {
    const pages = await queryAll(DBS[tabla]);
    const rows = pages.map(pg => MAP[tabla](pg.properties || {}, pg));
    const n = await upsert(tabla, rows);
    console.log(`  ✓ ${tabla.padEnd(20)} ${n} fila(s)`);
    totalOk += n;
  } catch (e) {
    console.error(`  ✗ ${tabla.padEnd(20)} ${e.message}`);
    totalErr++;
  }
}
console.log(`\nListo. ${totalOk} fila(s) sincronizadas · ${totalErr} tabla(s) con error.`);
process.exit(totalErr ? 1 : 0);
