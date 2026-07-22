// Refleja una página de Notion en su tabla espejo de Supabase (upsert idempotente por notion_id).
// Fuente única del upsert Notion→Supabase, usada por: api/db-sync.js (sync tras guardar client-driven),
// el mirror INLINE del proxy (Fase 3a.1, api/notion.js) y —a futuro— el worker del outbox (Fase 3a.2).
// NO aplica gate de país: el caller decide (db-sync lo hace; el proxy ya autorizó la escritura).
import { mapRow } from './notion-map.js';

const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

export function mirrorConfigured() {
  return !!(SUPABASE_URL && SERVICE_KEY);
}

// Upsert de una fila YA mapeada (por notion_id). Devuelve { ok, status }.
export async function upsertRow(table, row) {
  if (!mirrorConfigured() || !row || !table) return { ok: false, status: 0, reason: 'config/row' };
  const ur = await fetch(`${SUPABASE_URL}/rest/v1/${table}?on_conflict=notion_id`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: 'Bearer ' + SERVICE_KEY,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify([row]),
  });
  if (ur.ok) return { ok: true, status: ur.status };
  const detail = await ur.text().catch(() => '');
  return { ok: false, status: ur.status, detail: detail.slice(0, 200) };
}

// Mapea la página COMPLETA de Notion y la espeja. `resource` == nombre de la tabla (clientes/servicios/…).
// Robusto: resource desconocido o página sin properties → no-op silencioso (no lanza).
export async function mirrorPage(resource, page) {
  if (!resource || !page) return { ok: false, status: 0, reason: 'args' };
  let row;
  try {
    row = mapRow(resource, page);
  } catch (_) {
    return { ok: false, status: 0, reason: 'map' };
  }
  if (!row) return { ok: false, status: 0, reason: 'map' };
  return upsertRow(resource, row);
}

// Lee TODAS las páginas de una tabla espejo en formato Notion ({ id: notion_id, properties: raw }). Paginado
// por Range (PostgREST cappea sin Range). Usado por los crons para leer del espejo en vez de Notion (así el
// email semanal / el pipeline sobreviven una caída de Notion). ⚠️ El `raw` NO trae `created_time` (es un
// top-level de Notion, no una property) → un cron que dependa de created_time debe contemplar su ausencia; y
// las FÓRMULAS del raw quedan CONGELADAS al último write → recomputar desde sus dates (ej. días desde
// 'Última interacción'), nunca leer `.formula.number` del espejo.
export async function queryMirrorPages(resource) {
  if (!mirrorConfigured()) throw new Error('espejo no configurado');
  const PAGE = 1000;
  let out = [],
    offset = 0;
  for (;;) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${resource}?select=notion_id,raw`, {
      headers: {
        apikey: SERVICE_KEY,
        Authorization: 'Bearer ' + SERVICE_KEY,
        'Range-Unit': 'items',
        Range: `${offset}-${offset + PAGE - 1}`,
      },
    });
    if (!r.ok) throw new Error(`espejo ${resource}: ${r.status} ${await r.text().catch(() => '')}`.slice(0, 200));
    const page = await r.json();
    out.push(...page.filter(x => x.raw).map(x => ({ id: x.notion_id, properties: x.raw })));
    if (page.length < PAGE) break;
    offset += PAGE;
  }
  return out;
}

// Borra la fila del espejo (para páginas mandadas a la papelera/archivadas: el espejo no debe re-servirlas).
export async function deleteRowByNotionId(table, notionId) {
  if (!mirrorConfigured() || !table || !notionId) return { ok: false, status: 0 };
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?notion_id=eq.${encodeURIComponent(notionId)}`, {
    method: 'DELETE',
    headers: { apikey: SERVICE_KEY, Authorization: 'Bearer ' + SERVICE_KEY, Prefer: 'return=minimal' },
  });
  return { ok: r.ok, status: r.status };
}
