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

// Exportada para la reconciliación M1 (api/health-reconcile.js): cuenta páginas activas de una base (.length).
export async function queryAll(dbId) {
  let results = [],
    cursor;
  do {
    const { ok, json } = await notionFetch(`databases/${dbId}/query`, {
      page_size: 100,
      start_cursor: cursor,
    });
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
  let results = [],
    cursor;
  for (let i = 0; i < 5; i++) {
    results = [];
    cursor = undefined;
    do {
      const { ok, json } = await notionFetch('search', {
        page_size: 100,
        start_cursor: cursor,
        filter: { property: 'object', value: 'page' },
      });
      // Fail-closed (review 15/07): un 429/5xx a mitad de paginación devolvía un set PARCIAL en silencio →
      // reconcileDeletes veía como "stale" filas legítimas y podía borrarlas del espejo. Mejor tirar: el
      // caller (syncTables) marca la tabla con error esta corrida y el próximo ciclo (10 min) reintenta.
      if (!ok) throw new Error(`Notion search parcial (status en página ${results.length})`);
      results.push(...(json.results || []).filter(p => norm(p.parent?.database_id) === norm(dbId)));
      cursor = json.has_more ? json.next_cursor : null;
    } while (cursor);
    if (results.length) break;
    await new Promise(r => setTimeout(r, 1200));
  }
  // Marca no-enumerable de "vino por search" (índice eventualmente consistente: una página creada hace
  // segundos puede faltar) → syncTables NO reconcilia bajas sobre este resultado. No afecta a los callers
  // que solo leen el array (health-reconcile usa .length).
  Object.defineProperty(results, '_viaSearch', { value: true, enumerable: false });
  return results;
}

// resolution: 'merge-duplicates' (default, sync completo: refresca las filas existentes con Notion) o
// 'ignore-duplicates' (altas-only: NO pisar filas existentes — condición H4 de Fase 3b: en la carrera del
// back-fill uuid→realId, la fila real recién nombrada podría no estar en el snapshot previo y un
// merge-duplicates le pisaría el raw parcheado con la versión vieja de Notion; insert-only lo evita).
async function upsert(table, rows, resolution = 'merge-duplicates') {
  if (!rows.length) return 0;
  const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
  let done = 0;
  for (let i = 0; i < rows.length; i += 100) {
    const chunk = rows.slice(i, i + 100);
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?on_conflict=notion_id`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: `resolution=${resolution},return=minimal`,
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
  let ids = [],
    offset = 0;
  for (;;) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=notion_id`, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Range-Unit': 'items',
        Range: `${offset}-${offset + PAGE - 1}`,
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

// Fase 3b — filas que reconcileDeletes NO debe borrar aunque falten en Notion: los ids LOCALES de creates
// aún no propagados (su notion_id es un uuid que vive solo en el espejo) y los recién resueltos (resolved_at
// < 1h: el back-fill puso el notion_id real PERO el snapshot de queryAll de esta corrida pudo tomarse ANTES
// de que Notion lo indexara → aparecería como stale). Devuelve { ok, keep:Set(normId) }. FAIL-CLOSED: si la
// consulta a id_map falla por algo que NO sea "tabla inexistente" (pre-migración), ok=false → reconcile aborta.
async function fetchIdMapKeep(resource) {
  const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
  const norm = s => String(s || '').replace(/-/g, '').toLowerCase();
  const keep = new Set();
  const cutoff = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  try {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/id_map?resource=eq.${encodeURIComponent(resource)}&or=(notion_id.is.null,resolved_at.gt.${encodeURIComponent(cutoff)})&select=local_id,notion_id`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
    );
    if (!r.ok) {
      const t = await r.text().catch(() => '');
      // Tabla no provisionada (migración 3b sin correr) → no hay ids locales → keep vacío es CORRECTO.
      if (r.status === 404 || t.includes('PGRST205') || t.includes('does not exist')) return { ok: true, keep };
      return { ok: false, keep }; // error real → fail-closed
    }
    const rows = await r.json().catch(() => []);
    for (const x of rows || []) {
      if (!x.notion_id) keep.add(norm(x.local_id)); // pendiente: la fila del espejo usa el uuid como notion_id
      else keep.add(norm(x.notion_id)); // recién resuelto: la fila ya tiene el notion_id real
    }
    return { ok: true, keep };
  } catch (_) {
    return { ok: false, keep }; // red/parse → fail-closed
  }
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
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
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
//  (c) TOPE DURO de 20 filas por corrida (incidente 02/07: el tope porcentual original —20% de lo
//      activo— escalaba con un fetch grande-y-equivocado de Notion (search-fallback devolviendo
//      cientos de páginas ajenas) y habilitó wipes de tablas enteras que el upsert del cron siguiente
//      "reponía" → espejo oscilando lleno/vacío. Las bajas reales son de a unas pocas por día; todo
//      lo que supere 20 se reporta en skippedDelete y se audita a mano. NUNCA volver al porcentaje.
async function reconcileDeletes(table, fetchedActiveIds) {
  const norm = s =>
    String(s || '')
      .replace(/-/g, '')
      .toLowerCase();
  if (!fetchedActiveIds.length) return { deleted: 0 };
  // Fase 3b: no borrar filas locales pendientes ni recién resueltas (ver fetchIdMapKeep). FAIL-CLOSED: si
  // id_map no responde (error real), abortar el reconcile — mejor dejar fantasmas que borrar un create local.
  const guard = await fetchIdMapKeep(table);
  if (!guard.ok) return { deleted: 0, skippedDelete: 'id_map no disponible (fail-closed)' };
  const mirrorIds = await fetchMirrorIds(table);
  const activeSet = new Set(fetchedActiveIds.map(norm));
  const stale = mirrorIds.filter(id => !activeSet.has(norm(id)) && !guard.keep.has(norm(id)));
  if (!stale.length) return { deleted: 0 };
  const HARD_CAP = 20;
  if (stale.length > HARD_CAP) return { deleted: 0, skippedDelete: stale.length };
  console.log(`reconcileDeletes ${table}: borrando ${stale.length} filas`, JSON.stringify(stale));
  const deleted = await deleteRows(table, stale);
  return { deleted };
}

// Sincroniza las `tables` indicadas. `dry`: cuenta filas sin escribir (y no reconcilia bajas). Cada tabla
// en su try/catch: si una falla, las demás igual se sincronizan; el resumen reporta el error por tabla.
// Tras un upsert exitoso, reconcilia bajas (ver reconcileDeletes) — si esa reconciliación en sí falla
// (p.ej. Supabase caído en el DELETE), NO se marca la tabla como error total: el upsert ya escribió bien,
// solo queda logueado `deleteError` para la próxima corrida.
//
// `altasOnly` (pre-flip INGRESOS 2026-07-15): tablas Supabase-first — el upsert completo las pisaría
// (mergeProps fresco vs Notion atrasado), pero excluirlas del todo dejaba afuera las ALTAS hechas directo
// en Notion (el cowork de Finanzas appendea gastos/ingresos ahí) y las bajas. En este modo solo se INSERTAN
// las filas de Notion que NO existen en el espejo (una fila ausente jamás pudo ser editada por la app → no
// tiene outbox pendiente → el mapRow de Notion es la verdad; mismo razonamiento que el mirror post-create
// de api/notion.js) y reconcileDeletes sigue corriendo (bajas en Notion salen del espejo; opera por diff de
// ids, nunca toca el raw). Bonus: recupera el self-heal de un mirrorPage post-create que haya fallado.
export async function syncTables(tables, { dry = false, altasOnly = new Set() } = {}) {
  const norm = s =>
    String(s || '')
      .replace(/-/g, '')
      .toLowerCase();
  const perTable = {};
  let totalOk = 0,
    totalErr = 0;
  for (const tabla of tables) {
    try {
      const pages = await queryAll(DBS[tabla]);
      let rows = pages.map(pg => MAP[tabla](pg.properties || {}, pg));
      if (altasOnly.has(tabla)) {
        const mirror = new Set((await fetchMirrorIds(tabla)).map(norm));
        rows = rows.filter(r => !mirror.has(norm(r.notion_id)));
      }
      // altas-only usa insert-only (ignore-duplicates) para no pisar filas ya editadas por la app (H4).
      const n = dry ? rows.length : await upsert(tabla, rows, altasOnly.has(tabla) ? 'ignore-duplicates' : 'merge-duplicates');
      perTable[tabla] = { ok: n, err: 0 };
      if (altasOnly.has(tabla)) perTable[tabla].mode = 'altas-only';
      totalOk += n;
      if (!dry) {
        perTable[tabla].deleted = 0;
        // NO reconciliar bajas sobre un resultado del search fallback (review 15/07): el índice de search
        // de Notion es eventualmente consistente — una página creada hace segundos puede faltar y sería
        // borrada del espejo como "stale" (y en tablas altas-only NO se repondría con estado fresco).
        // Servicios (multi-source) siempre viene por search → sus bajas se auditan a mano; el resto de las
        // tablas usa databases/{id}/query (fail-closed) y reconcilia normal.
        if (pages._viaSearch) {
          perTable[tabla].reconcileSkipped = 'via-search';
        } else {
          try {
            const { deleted, skippedDelete } = await reconcileDeletes(
              tabla,
              pages.map(pg => pg.id)
            );
            perTable[tabla].deleted = deleted;
            if (skippedDelete) perTable[tabla].skippedDelete = skippedDelete;
          } catch (e) {
            perTable[tabla].deleteError = e.message;
          }
        }
      }
    } catch (e) {
      perTable[tabla] = { ok: 0, err: 1, error: e.message };
      totalErr++;
    }
  }
  return { perTable, totalOk, totalErr, dry };
}
