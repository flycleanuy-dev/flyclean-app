// Reconciliación M1 — compara los conteos de cada tabla espejada entre Notion y Supabase y AVISA por email
// si hay drift más allá de una tolerancia. GET protegido por CRON_SECRET. SOLO LECTURA: nunca borra ni repara
// (la reparación real la hace cron-db-sync: upsert repone faltantes, reconcileDeletes borra stale con cap 20).
// Auditoría 2026-07-13 (R4): no había NINGUNA detección de drift; el cap 20 de reconcileDeletes deja pasar
// desajustes sin que nadie se entere. Esto es la red que faltaba antes de flipear más tablas a Supabase-first.
import { DBS } from './_lib/notion-map.js';
import { queryAll } from './_lib/sync.js';
import { sendEmail, emailLayout } from './_lib/email.js';
import { getRecipients } from './_lib/recipients.js';

const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
const TABLES = ['clientes', 'propuestas', 'servicios', 'ingresos', 'gastos'];
// Tolerancia por tabla: `servicios` es Supabase-first (Notion downstream) → el lag del outbox puede hacer
// diferir los conteos transitoriamente, damos más margen. El resto debería cuadrar salvo el cap 20 de bajas
// no propagadas. Valores conservadores para NO spamear; se ajustan con la experiencia.
const TOLERANCIA = { servicios: 30, _default: 15 };

// Conteo exacto de filas de una tabla del espejo (PostgREST count=exact → header content-range "*/N"). No trae datos.
async function countSupabase(table) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=notion_id`, {
    headers: {
      apikey: SERVICE_KEY,
      Authorization: 'Bearer ' + SERVICE_KEY,
      Prefer: 'count=exact',
      Range: '0-0',
    },
  });
  if (!r.ok) return null;
  const total = parseInt((r.headers.get('content-range') || '').split('/')[1] || '', 10);
  return Number.isFinite(total) ? total : null;
}

export default async function handler(req, res) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return res.status(500).json({ error: 'CRON_SECRET not configured' });
  if (req.headers.authorization !== `Bearer ${secret}`)
    return res.status(401).json({ error: 'unauthorized' });
  if (!SUPABASE_URL || !SERVICE_KEY) return res.status(500).json({ error: 'supabase no configurada' });
  const quiet = ['1', 'true', 'yes'].includes(String(req.query?.quiet || '').toLowerCase()); // ?quiet=1: no manda email (para probar)

  const perTable = {};
  const drift = [];
  for (const t of TABLES) {
    try {
      const notion = (await queryAll(DBS[t])).length; // páginas activas en Notion
      const supabase = await countSupabase(t);
      // FAIL-OPEN: si Notion vino vacío (rate-limit / fetch roto) o Supabase no contó, NO alarmar — un fetch
      // roto es indistinguible de "0 filas" y no debe leerse como wipe (misma guarda que reconcileDeletes).
      if (!notion || supabase == null) {
        perTable[t] = { notion, supabase, skipped: true };
        continue;
      }
      const diff = supabase - notion;
      const tol = TOLERANCIA[t] ?? TOLERANCIA._default;
      perTable[t] = { notion, supabase, diff };
      if (Math.abs(diff) > tol) drift.push({ t, notion, supabase, diff });
    } catch (e) {
      perTable[t] = { error: String(e?.message || e).slice(0, 120) }; // fail-open: un error NO cuenta como drift
    }
  }

  // Alerta por email SOLO si hay drift sostenido (fail-safe: nunca rompe el endpoint).
  if (drift.length && !quiet) {
    try {
      const to = (await getRecipients('pipeline')) || ['federicomaciel939@gmail.com', 'ihodieego@gmail.com'];
      const rows = drift
        .map(
          d =>
            `<li><b>${d.t}</b>: Notion ${d.notion} vs espejo ${d.supabase} (dif ${d.diff > 0 ? '+' : ''}${d.diff})</li>`
        )
        .join('');
      const body =
        `<p>El espejo Supabase difiere de Notion más allá de la tolerancia en <b>${drift.length}</b> tabla(s):</p><ul>${rows}</ul>` +
        `<p style="color:#93a89f;font-size:13px">Revisar los logs de <code>cron-db-sync</code> y el SQL editor. La reparación automática NO se aplicó (M1 es solo lectura).</p>`;
      await sendEmail({
        to,
        subject: `⚠️ FlyClean · Espejo desincronizado (${drift.length} tabla/s)`,
        html: emailLayout('Reconciliación del espejo', body),
      });
    } catch (e) {
      console.warn('[reconcile] alerta falló', String(e?.message || e).slice(0, 120));
    }
  }
  return res.status(200).json({ ok: true, drift: drift.length, perTable });
}
