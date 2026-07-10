// Fase 3a.2 — "Supabase-first" para EDICIONES (PATCH). Escribe PRIMERO en el espejo (merge atómico vía RPC)
// y encola la propagación a Notion en outbox_notion (la drena api/cron-outbox.js). Detrás del env
// SUPAFIRST_TABLES (CSV por tabla). Con el CSV vacío, NADA de esto se ejecuta (inerte).
const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_KEY || '';
const _H = () => ({ apikey: SERVICE_KEY, Authorization: 'Bearer ' + SERVICE_KEY, 'Content-Type': 'application/json' });

// Conjunto de tablas Supabase-first (env CSV). Vacío = 3a.2 apagado.
export function supafirstSet() {
  return new Set((process.env.SUPAFIRST_TABLES || '').split(',').map(s => s.trim()).filter(Boolean));
}
export function supafirstConfigured() { return !!(SUPABASE_URL && SERVICE_KEY); }

// Merge atómico del PATCH parcial sobre la fila del espejo (RPC merge_props). Sin lost-update (todo en la base).
// Devuelve { ok, found, raw }: found=false si el notion_id no existe en el espejo → el caller cae a Notion-first.
export async function mergeProps(table, notionId, patch) {
  if (!supafirstConfigured()) return { ok: false, found: false, reason: 'config' };
  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/merge_props`, {
    method: 'POST', headers: _H(),
    body: JSON.stringify({ p_table: table, p_notion_id: notionId, p_patch: patch }),
  });
  if (!r.ok) { const detail = await r.text().catch(() => ''); return { ok: false, found: false, status: r.status, detail: detail.slice(0, 200) }; }
  const raw = await r.json().catch(() => null); // la RPC devuelve el raw mergeado, o null si 0 filas
  if (raw == null) return { ok: true, found: false };
  return { ok: true, found: true, raw };
}

// Encola la propagación a Notion (outbox durable). Best-effort: el caller decide qué hacer si falla.
export async function enqueueOutbox(notionId, resource, patch) {
  if (!supafirstConfigured()) return { ok: false };
  const r = await fetch(`${SUPABASE_URL}/rest/v1/outbox_notion`, {
    method: 'POST', headers: { ..._H(), Prefer: 'return=minimal' },
    body: JSON.stringify([{ notion_id: notionId, resource, op: 'patch', payload: patch }]),
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
      const r = await fetch(`${SUPABASE_URL}/rest/v1/${t}?notion_id=eq.${encodeURIComponent(notionId)}&select=raw&limit=1`, { headers: _H() });
      if (!r.ok) continue;
      const rows = await r.json().catch(() => []);
      if (Array.isArray(rows) && rows.length && rows[0].raw) return { resource: t, raw: rows[0].raw };
    } catch (_) { /* probar la siguiente tabla */ }
  }
  return null;
}

// Cancela las filas pendientes del outbox de una página (fix review #3: la página se mandó a la papelera →
// propagar sus patches viejos a Notion fallaría con 400 y quedarían envenenadas; mejor cancelarlas).
export async function cancelOutboxForPage(notionId) {
  if (!supafirstConfigured() || !notionId) return { ok: false };
  const r = await fetch(`${SUPABASE_URL}/rest/v1/outbox_notion?notion_id=eq.${encodeURIComponent(notionId)}&status=in.(pending,processing)`, {
    method: 'PATCH', headers: { ..._H(), Prefer: 'return=minimal' },
    body: JSON.stringify({ status: 'done', last_error: 'cancelada: página archivada/borrada' }),
  });
  return { ok: r.ok, status: r.status };
}
