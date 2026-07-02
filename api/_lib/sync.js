// api/_lib/sync.js — lógica de sincronización Notion → Supabase, COMPARTIDA por
// el cron (api/cron-db-sync.js) y el batch a mano (scripts/sync-notion-supabase.mjs).
// Idempotente (upsert por notion_id). La service key bypassea RLS (solo corre server-side).
import { DBS, MAP } from './notion-map.js';

const NOTION_VERSION = '2022-06-28';

async function notionFetch(path, body) {
  const r = await fetch(`https://api.notion.com/v1/${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.NOTION_TOKEN}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body || {}),
  });
  return { ok: r.ok, status: r.status, json: await r.json().catch(() => ({})) };
}

async function queryAll(dbId) {
  let results = [], cursor;
  do {
    const { ok, json } = await notionFetch(`databases/${dbId}/query`, { page_size: 100, start_cursor: cursor });
    if (!ok) {
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
  for (let i = 0; i < 5; i++) {
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

async function upsert(table, rows) {
  if (!rows.length) return 0;
  const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
  let done = 0;
  for (let i = 0; i < rows.length; i += 100) {
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

// Trae TODOS los notion_id que hoy están en el espejo (Supabase) para una tabla, paginando de a 1000
// (PostgREST cappea las respuestas sin Range explícito). Usado por reconcileDeletes para saber qué filas
// del espejo ya no tienen contraparte activa en Notion (archivada/borrada/trashed).
async function fetchMirrorIds(table) {
  const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
  const PAGE = 1000;
  let ids = [], offset = 0;
  for (;;) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=notion_id`, {
      headers: {
        apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`,
        'Range-Unit': 'items', Range: `${offset}-${offset + PAGE - 1}`,
      },
    });
    if (!r.ok) throw new Error(`Supabase ${table} (mirror ids): ${r.status} ${await r.text()}`);
    const page = await r.json();
    ids.push(...page.map(x => x.notion_id).filter(Boolean));
    if (page.length < PAGE) break;
    offset += PAGE;
  }
  return ids;
}

// Borra filas del espejo por notion_id, en lotes de <=50 (URL-encoded, PostgREST `in.(...)`).
async function deleteRows(table, notionIds) {
  const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
  let deleted = 0;
  for (let i = 0; i < notionIds.length; i += 50) {
    const batch = notionIds.slice(i, i + 50);
    const list = batch.map(id => encodeURIComponent(id)).join(',');
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?notion_id=in.(${list})`, {
      method: 'DELETE',
      headers: {
        apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`,
        Prefer: 'return=minimal',
      },
    });
    if (!r.ok) throw new Error(`Supabase ${table} delete: ${r.status} ${await r.text()}`);
    deleted += batch.length;
  }
  return deleted;
}

// Da de baja en el espejo las filas que ya no aparecen como activas en Notion (archivadas/trashed/borradas).
// SOLO se llama desde el sync completo (syncTables) — nunca desde el re-sync puntual de un registro
// (api/db-sync.js), que no trae el universo completo de IDs activos y por lo tanto no puede distinguir
// "borrado en Notion" de "simplemente no tocado en este request".
//
// Guardas de seguridad (un fetch parcial/caído a Notion NUNCA debe poder vaciar el espejo):
//  (a) esta función solo se invoca después de que `queryAll` de la tabla terminó SIN tirar excepción
//      (ver el try/catch en syncTables: si queryAll falla, nunca llegamos a llamar reconcileDeletes);
//  (b) si `fetchedActiveIds` vino vacío, no borramos nada (un 0 activos legítimo es indistinguible de un
//      fetch roto que devolvió vacío por error — mejor dejar fantasmas que vaciar la tabla);
//  (c) si lo que parece "stale" es más del 20% de lo activo (mínimo 20 filas), tampoco borramos — eso
//      huele a fetch parcial de Notion, no a bajas reales — y lo reportamos en skippedDelete para auditar.
async function reconcileDeletes(table, fetchedActiveIds) {
  const norm = s => String(s || '').replace(/-/g, '').toLowerCase();
  if (!fetchedActiveIds.length) return { deleted: 0 };
  const mirrorIds = await fetchMirrorIds(table);
  const activeSet = new Set(fetchedActiveIds.map(norm));
  const stale = mirrorIds.filter(id => !activeSet.has(norm(id)));
  if (!stale.length) return { deleted: 0 };
  const limit = Math.max(20, fetchedActiveIds.length * 0.2);
  if (stale.length > limit) return { deleted: 0, skippedDelete: stale.length };
  const deleted = await deleteRows(table, stale);
  return { deleted };
}

// Sincroniza las `tables` indicadas. `dry`: cuenta filas sin escribir (y no reconcilia bajas). Cada tabla
// en su try/catch: si una falla, las demás igual se sincronizan; el resumen reporta el error por tabla.
// Tras un upsert exitoso, reconcilia bajas (ver reconcileDeletes) — si esa reconciliación en sí falla
// (p.ej. Supabase caído en el DELETE), NO se marca la tabla como error total: el upsert ya escribió bien,
// solo queda logueado `deleteError` para la próxima corrida.
export async function syncTables(tables, { dry = false } = {}) {
  const perTable = {};
  let totalOk = 0, totalErr = 0;
  for (const tabla of tables) {
    try {
      const pages = await queryAll(DBS[tabla]);
      const rows = pages.map(pg => MAP[tabla](pg.properties || {}, pg));
      const n = dry ? rows.length : await upsert(tabla, rows);
      perTable[tabla] = { ok: n, err: 0 };
      totalOk += n;
      if (!dry) {
        perTable[tabla].deleted = 0;
        try {
          const { deleted, skippedDelete } = await reconcileDeletes(tabla, pages.map(pg => pg.id));
          perTable[tabla].deleted = deleted;
          if (skippedDelete) perTable[tabla].skippedDelete = skippedDelete;
        } catch (e) {
          perTable[tabla].deleteError = e.message;
        }
      }
    } catch (e) {
      perTable[tabla] = { ok: 0, err: 1, error: e.message };
      totalErr++;
    }
  }
  return { perTable, totalOk, totalErr, dry };
}
