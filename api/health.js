// Health-check de la propagación Supabase→Notion (outbox de servicios) — observabilidad de la migración.
// GET protegido por CRON_SECRET (Bearer). Devuelve los conteos de outbox_notion por estado + la edad del
// pending más viejo. Auditoría 2026-07-13 (R1/R2): sin esto, un outbox atascado o envenenado (filas
// status='error') no se detecta salvo inspeccionando el SQL a mano. Solo lectura; nunca muta nada.
const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
const sbHeaders = () => ({
  apikey: SERVICE_KEY,
  Authorization: 'Bearer ' + SERVICE_KEY,
  'Content-Type': 'application/json',
});

// Cuenta filas por filtro usando el count exacto de PostgREST (Content-Range: "*/N"). Sin traer datos.
async function countBy(query) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/outbox_notion?${query}&select=id`, {
    headers: { ...sbHeaders(), Prefer: 'count=exact', Range: '0-0' },
  });
  if (r.status === 404) return { missing: true };
  const total = parseInt((r.headers.get('content-range') || '').split('/')[1] || '0', 10);
  return { count: Number.isFinite(total) ? total : 0 };
}

export default async function handler(req, res) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return res.status(500).json({ error: 'CRON_SECRET not configured' });
  if (req.headers.authorization !== `Bearer ${secret}`)
    return res.status(401).json({ error: 'unauthorized' });
  if (!SUPABASE_URL || !SERVICE_KEY) return res.status(500).json({ error: 'supabase no configurada' });
  try {
    const pending = await countBy('status=eq.pending');
    if (pending.missing)
      return res
        .status(200)
        .json({ ok: true, note: 'outbox no provisionado', pending: 0, error: 0, oldest_pending_min: 0 });
    const errored = await countBy('status=eq.error');
    // Edad (minutos) del pending más viejo — indica si la propagación se atascó.
    let oldest_pending_min = 0;
    const or = await fetch(
      `${SUPABASE_URL}/rest/v1/outbox_notion?status=eq.pending&order=created_at.asc&limit=1&select=created_at`,
      { headers: sbHeaders() }
    );
    const rows = await or.json().catch(() => []);
    if (Array.isArray(rows) && rows[0]?.created_at)
      oldest_pending_min = Math.round((Date.now() - new Date(rows[0].created_at).getTime()) / 60000);
    const healthy = (errored.count || 0) === 0 && oldest_pending_min < 30;
    return res.status(200).json({
      ok: true,
      healthy,
      pending: pending.count || 0,
      error: errored.count || 0,
      oldest_pending_min,
    });
  } catch (e) {
    return res.status(502).json({ error: 'health failed', detail: String(e?.message || e).slice(0, 120) });
  }
}
