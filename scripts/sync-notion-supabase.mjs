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

// ── Mapeo compartido (IDs de bases + accessors + MAP por tabla) ──
// Única fuente de verdad: lo usa también el re-sync puntual api/db-sync.js (Fase 3).
import { DBS, MAP } from '../api/_lib/notion-map.js';

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
