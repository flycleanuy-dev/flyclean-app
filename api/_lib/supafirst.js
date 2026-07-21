// Fase 3a.2 — "Supabase-first" para EDICIONES (PATCH). Escribe PRIMERO en el espejo (merge atómico vía RPC)
// y encola la propagación a Notion en outbox_notion (la drena api/cron-outbox.js). Detrás del env
// SUPAFIRST_TABLES (CSV por tabla). Con el CSV vacío, NADA de esto se ejecuta (inerte).
const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
const _H = () => ({
  apikey: SERVICE_KEY,
  Authorization: 'Bearer ' + SERVICE_KEY,
  'Content-Type': 'application/json',
});

// Conjunto de tablas Supabase-first (env CSV). Vacío = 3a.2 apagado.
export function supafirstSet() {
  return new Set(
    (process.env.SUPAFIRST_TABLES || '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
  );
}
export function supafirstConfigured() {
  return !!(SUPABASE_URL && SERVICE_KEY);
}

// HOTFIX 2026-07-11: el front escribe en FORMATO DE ESCRITURA de Notion (title/rich_text = [{text:{content}}],
// SIN plain_text). En Notion-first la respuesta volvía normalizada por Notion; bajo Supabase-first el patch va
// TAL CUAL al raw → el front (que lee `plain_text`) veía el título/lugar/notas vacíos ("Servicio sin nombre").
// Normalizamos ANTES de mergear: cada item de title/rich_text gana plain_text (desde text.content). El OUTBOX
// sigue mandando el patch ORIGINAL a Notion (el caller pasa body.properties crudo a enqueueOutbox).
export function normalizePatchForRaw(patch) {
  const out = {};
  for (const [k, v] of Object.entries(patch || {})) {
    if (v && Array.isArray(v.title)) {
      out[k] = {
        ...v,
        title: v.title.map(x => ({
          type: 'text',
          ...x,
          plain_text: x?.plain_text ?? x?.text?.content ?? '',
        })),
      };
    } else if (v && Array.isArray(v.rich_text)) {
      out[k] = {
        ...v,
        rich_text: v.rich_text.map(x => ({
          type: 'text',
          ...x,
          plain_text: x?.plain_text ?? x?.text?.content ?? '',
        })),
      };
    } else {
      out[k] = v; // select/date/multi_select/relation/number/url/checkbox: formato write == lo que lee el front
    }
  }
  return out;
}

// Merge atómico del PATCH parcial sobre la fila del espejo (RPC merge_props). Sin lost-update (todo en la base).
// Devuelve { ok, found, raw }: found=false si el notion_id no existe en el espejo → el caller cae a Notion-first.
export async function mergeProps(table, notionId, patch) {
  if (!supafirstConfigured()) return { ok: false, found: false, reason: 'config' };
  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/merge_props`, {
    method: 'POST',
    headers: _H(),
    body: JSON.stringify({ p_table: table, p_notion_id: notionId, p_patch: normalizePatchForRaw(patch) }),
  });
  if (!r.ok) {
    const detail = await r.text().catch(() => '');
    return { ok: false, found: false, status: r.status, detail: detail.slice(0, 200) };
  }
  const raw = await r.json().catch(() => null); // la RPC devuelve el raw mergeado, o null si 0 filas
  if (raw == null) return { ok: true, found: false };
  return { ok: true, found: true, raw };
}

// Encola la propagación a Notion (outbox durable). Best-effort: el caller decide qué hacer si falla.
// op: 'patch' (default, edición) o 'create' (Fase 3b: alta que se propaga a Notion desde el espejo).
export async function enqueueOutbox(notionId, resource, patch, op = 'patch') {
  if (!supafirstConfigured()) return { ok: false };
  const r = await fetch(`${SUPABASE_URL}/rest/v1/outbox_notion`, {
    method: 'POST',
    headers: { ..._H(), Prefer: 'return=minimal' },
    body: JSON.stringify([{ notion_id: notionId, resource, op, payload: patch }]),
  });
  return { ok: r.ok, status: r.status };
}

// ── Fase 3b: id_map (ids LOCALES de creates con fallback → notion_id real) ──
// Resuelve un lote de ids: devuelve { ok, map:Map<localId,{ notion_id, errored }> }. Un id que NO está en el
// mapa NO es local (= id real de Notion). notion_id=null → create aún pendiente. `errored` = su create ya está
// envenenado (para romper deadlocks). ⚠️ `ok` DISTINGUE (MEDIUM-3 del review): tabla inexistente (pre-3b) o
// sin matches → ok:true (seguro tratar como "no local"); un ERROR real de Supabase → ok:false → el caller
// DIFIERE (no envenena ni crea a ciegas basándose en una resolución que falló por un blip de infra).
export async function idMapLookup(localIds) {
  const out = new Map();
  if (!supafirstConfigured() || !localIds || !localIds.length) return { ok: true, map: out };
  const uniq = [...new Set(localIds.filter(Boolean))];
  if (!uniq.length) return { ok: true, map: out };
  const inList = uniq.map(encodeURIComponent).join(',');
  try {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/id_map?local_id=in.(${inList})&select=local_id,notion_id`,
      { headers: _H() }
    );
    if (!r.ok) {
      const t = await r.text().catch(() => '');
      // Tabla no provisionada (migración 3b sin correr) → no hay ids locales → ok:true, mapa vacío.
      if (r.status === 404 || t.includes('PGRST205') || t.includes('does not exist')) return { ok: true, map: out };
      return { ok: false, map: out }; // error real → el caller difiere
    }
    const rows = await r.json().catch(() => null);
    if (rows == null) return { ok: false, map: out };
    if (!rows.length) return { ok: true, map: out };
    // ¿cuáles de los pendientes (notion_id null) tienen su create ENVENENADO? (para romper deadlocks)
    const pendientes = rows.filter(x => !x.notion_id).map(x => x.local_id);
    let errored = new Set();
    if (pendientes.length) {
      const el = pendientes.map(encodeURIComponent).join(',');
      const er = await fetch(
        `${SUPABASE_URL}/rest/v1/outbox_notion?op=eq.create&status=eq.error&notion_id=in.(${el})&select=notion_id`,
        { headers: _H() }
      );
      if (!er.ok) return { ok: false, map: out }; // no pudimos saber si hay envenenados → diferir
      const erows = await er.json().catch(() => null);
      if (erows == null) return { ok: false, map: out };
      errored = new Set(erows.map(x => x.notion_id));
    }
    for (const x of rows) out.set(x.local_id, { notion_id: x.notion_id || null, errored: errored.has(x.local_id) });
    return { ok: true, map: out };
  } catch (_) {
    return { ok: false, map: out }; // red/parse → diferir
  }
}

// Traduce un id que PODRÍA ser local (uuid de un create con fallback). Devuelve { ok, localRow }:
//   localRow = { notion_id } si el id está en id_map (notion_id=null → create aún pendiente),
//   localRow = null        si el id NO es local (= id real de Notion, usar tal cual).
// ok=false → error de infra (el caller degrada: seguir con el id tal cual). Tabla inexistente (pre-3b) → ok, null.
export async function resolveLocalId(localId) {
  if (!supafirstConfigured() || !localId) return { ok: true, localRow: null };
  try {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/id_map?local_id=eq.${encodeURIComponent(localId)}&select=notion_id&limit=1`,
      { headers: _H() }
    );
    if (!r.ok) {
      const t = await r.text().catch(() => '');
      if (r.status === 404 || t.includes('PGRST205') || t.includes('does not exist')) return { ok: true, localRow: null };
      return { ok: false, localRow: null };
    }
    const rows = await r.json().catch(() => null);
    if (rows == null) return { ok: false, localRow: null };
    return { ok: true, localRow: rows.length ? { notion_id: rows[0].notion_id || null } : null };
  } catch (_) {
    return { ok: false, localRow: null };
  }
}

// Alta LOCAL cuando Notion no pudo crear la página (fallback de creates). (1) escribe la fila del espejo
// (read-your-writes del cliente; best-effort — si falla, el sync la reconcilia); (2) registra id_map+outbox
// ATÓMICAMENTE vía la RPC enqueue_create. Devuelve { ok }: ok=false si el registro atómico falló → el proxy
// devuelve el error ORIGINAL de Notion (nunca un "medio fallback" que perdería el dato o duplicaría).
export async function createFallback(resource, localId, row, payload) {
  if (!supafirstConfigured()) return { ok: false };
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/${resource}?on_conflict=notion_id`, {
      method: 'POST',
      headers: { ..._H(), Prefer: 'resolution=ignore-duplicates,return=minimal' },
      body: JSON.stringify([row]),
    });
  } catch (_) {
    /* best-effort: el sync reconcilia la fila del espejo */
  }
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/enqueue_create`, {
      method: 'POST',
      headers: _H(),
      body: JSON.stringify({ p_local_id: localId, p_resource: resource, p_payload: payload }),
    });
    return { ok: r.ok };
  } catch (_) {
    return { ok: false };
  }
}

// Marca un id_map como resuelto (back-fill del notion_id real tras crear la página en Notion). UPSERT: si
// la fila no existiera (insert inicial perdido en una carrera de infra), la crea igual → self-heal.
export async function idMapResolve(localId, realId, resource) {
  if (!supafirstConfigured()) return { ok: false };
  const r = await fetch(`${SUPABASE_URL}/rest/v1/id_map?on_conflict=local_id`, {
    method: 'POST',
    headers: { ..._H(), Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify([{ local_id: localId, resource: resource || 'unknown', notion_id: realId, resolved_at: new Date().toISOString() }]),
  });
  return { ok: r.ok, status: r.status };
}

// Lee el `raw` de una página desde el espejo, probando las tablas flipeadas (fix review #2: bajo Supabase-first
// las lecturas por id también salen del espejo — la MISMA fuente que ve la app — para que ningún
// read-modify-write del front, como el de fotos, se base en un Notion atrasado). Devuelve { resource, raw } o null.
export async function getMirrorRaw(tables, notionId) {
  if (!supafirstConfigured() || !notionId) return null;
  for (const t of tables) {
    try {
      const r = await fetch(
        `${SUPABASE_URL}/rest/v1/${t}?notion_id=eq.${encodeURIComponent(notionId)}&select=raw&limit=1`,
        { headers: _H() }
      );
      if (!r.ok) continue;
      const rows = await r.json().catch(() => []);
      if (Array.isArray(rows) && rows.length && rows[0].raw) return { resource: t, raw: rows[0].raw };
    } catch (_) {
      /* probar la siguiente tabla */
    }
  }
  return null;
}

// ETAPA 0 (2026-07-21) — meta ESPEJO-FIRST. El proxy necesita el "meta" (parent + properties) de una página
// para los checks de permisos ANTES de cada PATCH; hasta hoy lo pedía a Notion con un GET → con Notion caído
// los PATCH de tablas flipeadas también morían (hallazgo crítico del plan de cierre de migración).
// Este helper busca la página en las tablas flipeadas del espejo, EN PARALELO, con presupuesto TOTAL de
// tiempo y errores tragados (condiciones H1/M2/M4 del review adversarial): cualquier fallo/timeout devuelve
// null y el caller cae al GET de Notion como siempre — el espejo jamás puede EMPEORAR el camino actual.
export async function getMirrorMeta(tables, notionId, { budgetMs = 2000 } = {}) {
  if (!supafirstConfigured() || !notionId || !tables || !tables.length) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), budgetMs);
  try {
    const results = await Promise.all(
      tables.map(async t => {
        try {
          const r = await fetch(
            `${SUPABASE_URL}/rest/v1/${t}?notion_id=eq.${encodeURIComponent(notionId)}&select=raw&limit=1`,
            { headers: _H(), signal: controller.signal }
          );
          if (!r.ok) return null;
          const rows = await r.json().catch(() => []);
          return Array.isArray(rows) && rows.length && rows[0].raw ? { resource: t, raw: rows[0].raw } : null;
        } catch (_) {
          return null; // timeout/red/parse: esta tabla no responde → cuenta como miss
        }
      })
    );
    return results.find(Boolean) || null;
  } catch (_) {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// Cancela las filas pendientes del outbox de una página (fix review #3: la página se mandó a la papelera →
// propagar sus patches viejos a Notion fallaría con 400 y quedarían envenenadas; mejor cancelarlas).
export async function cancelOutboxForPage(notionId) {
  if (!supafirstConfigured() || !notionId) return { ok: false };
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/outbox_notion?notion_id=eq.${encodeURIComponent(notionId)}&status=in.(pending,processing)`,
    {
      method: 'PATCH',
      headers: { ..._H(), Prefer: 'return=minimal' },
      body: JSON.stringify({ status: 'done', last_error: 'cancelada: página archivada/borrada' }),
    }
  );
  return { ok: r.ok, status: r.status };
}
