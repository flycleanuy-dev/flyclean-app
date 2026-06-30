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

// Sincroniza las `tables` indicadas. `dry`: cuenta filas sin escribir. Cada tabla en su try/catch:
// si una falla, las demás igual se sincronizan; el resumen reporta el error por tabla.
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
    } catch (e) {
      perTable[tabla] = { ok: 0, err: 1, error: e.message };
      totalErr++;
    }
  }
  return { perTable, totalOk, totalErr, dry };
}
