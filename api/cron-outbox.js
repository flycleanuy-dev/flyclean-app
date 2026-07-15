// Fase 3a.2 — Worker del outbox: propaga a Notion (async) las ediciones que ya se guardaron Supabase-first.
// Corre cada 1 min (vercel.json). Auth CRON_SECRET (falla cerrado). INERTE mientras no haya filas encoladas
// (con SUPAFIRST_TABLES vacío nadie encola → este worker no hace nada).
//
// Por corrida: (0) resetea 'processing' colgados; (1) claim atómico (SKIP LOCKED); (2) coalescing por notion_id
// (mergea los payloads pendientes en orden created_at → UN PATCH por página); (3) éxito→done, transitorio→
// reintento con backoff, permanente/veneno(≥8)→error; (4) re-espejo post-propagación (ver abajo).
import { sendEmail, emailLayout } from './_lib/email.js';
import { getRecipients } from './_lib/recipients.js';
import { mirrorPage } from './_lib/mirror.js';

const SUPABASE_URL  = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SERVICE_KEY   = process.env.SUPABASE_SERVICE_KEY || '';
const NOTION_TOKEN  = process.env.NOTION_TOKEN || '';
const NOTION_VERSION = '2022-06-28';
const CLAIM_LIMIT = 100;
const MAX_ATTEMPTS = 8;
const STALE_PROCESSING_MS = 5 * 60 * 1000;

const sbHeaders = () => ({ apikey: SERVICE_KEY, Authorization: 'Bearer ' + SERVICE_KEY, 'Content-Type': 'application/json' });
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// PATCH a Notion con backoff ante 429/5xx. 4xx (property inexistente / página borrada) = permanente.
// Si ok, devuelve también la PÁGINA actualizada (el response del PATCH) para el re-espejo post-propagación.
async function notionPatch(pageId, properties) {
  for (let i = 0; i < 3; i++) {
    const r = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
      method: 'PATCH',
      headers: { Authorization: 'Bearer ' + NOTION_TOKEN, 'Notion-Version': NOTION_VERSION, 'Content-Type': 'application/json' },
      body: JSON.stringify({ properties }),
    });
    if (r.ok) return { ok: true, status: r.status, page: await r.json().catch(() => null) };
    // Transitorio: 429 (rate-limit), 5xx, y 409 conflict_error / 408 timeout (Notion los marca reintentables).
    if (r.status === 429 || r.status === 409 || r.status === 408 || r.status >= 500) {
      const ra = parseInt(r.headers.get('retry-after') || '0', 10);
      await sleep(ra ? ra * 1000 : 400 * (i + 1));
      continue;
    }
    const detail = await r.text().catch(() => '');
    return { ok: false, status: r.status, permanent: true, detail: detail.slice(0, 200) };
  }
  return { ok: false, status: 0, permanent: false };
}

async function sbPatch(query, patch) {
  return fetch(`${SUPABASE_URL}/rest/v1/outbox_notion?${query}`, {
    method: 'PATCH', headers: { ...sbHeaders(), Prefer: 'return=minimal' }, body: JSON.stringify(patch),
  });
}

export default async function handler(req, res) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return res.status(500).json({ error: 'CRON_SECRET not configured' });
  if (req.headers.authorization !== `Bearer ${secret}`) return res.status(401).json({ error: 'unauthorized' });
  if (!SUPABASE_URL || !SERVICE_KEY || !NOTION_TOKEN) return res.status(500).json({ error: 'no configurado' });
  const dry = ['1', 'true', 'yes'].includes(String(req.query?.dry || '').toLowerCase());

  try {
    // 0) Reponer 'processing' colgados (un worker que murió a mitad) → vuelven a 'pending'.
    const staleISO = new Date(Date.now() - STALE_PROCESSING_MS).toISOString();
    await sbPatch(`status=eq.processing&updated_at=lt.${encodeURIComponent(staleISO)}`, { status: 'pending' });

    // 1) Claim atómico (FOR UPDATE SKIP LOCKED en la RPC). En dry-run no reclamamos (solo reportamos pendientes).
    let claimed = [];
    if (dry) {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/outbox_notion?status=eq.pending&next_attempt_at=lte.${encodeURIComponent(new Date().toISOString())}&select=*&order=created_at&limit=${CLAIM_LIMIT}`, { headers: sbHeaders() });
      claimed = await r.json().catch(() => []);
      return res.status(200).json({ dry: true, pending: claimed.length });
    }
    const cr = await fetch(`${SUPABASE_URL}/rest/v1/rpc/claim_outbox`, { method: 'POST', headers: sbHeaders(), body: JSON.stringify({ p_limit: CLAIM_LIMIT }) });
    if (!cr.ok) {
      const t = await cr.text().catch(() => '');
      // Outbox aún NO provisionado (migración sin correr) → no es error: nada que drenar (período dormido de 3a.2).
      if (cr.status === 404 || t.includes('PGRST202') || t.includes('does not exist')) {
        return res.status(200).json({ ok: true, processed: 0, note: 'outbox no provisionado' });
      }
      console.error('[outbox] claim', cr.status, t.slice(0, 200));
      return res.status(502).json({ error: 'claim', status: cr.status });
    }
    claimed = await cr.json().catch(() => []);
    if (!claimed.length) return res.status(200).json({ ok: true, processed: 0 });

    // 2) Agrupar por notion_id, ordenar por created_at, coalescer (último gana por property).
    const byPage = new Map();
    for (const row of claimed.sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)))) {
      if (!byPage.has(row.notion_id)) byPage.set(row.notion_id, []);
      byPage.get(row.notion_id).push(row);
    }

    let done = 0, errored = 0, retried = 0;
    for (const [notionId, rows] of byPage) {
      const merged = Object.assign({}, ...rows.map(r => r.payload || {}));
      const ids = rows.map(r => r.id);
      const pr = await notionPatch(notionId, merged);
      if (pr.ok) {
        await sbPatch(`id=in.(${ids.join(',')})`, { status: 'done', last_error: null });
        done += ids.length;
        // (4) RE-ESPEJO post-propagación (pulido 2026-07-15): bajo el flip, cron-db-sync excluye la tabla →
        // mergeProps solo mantiene fresco lo EDITADO; columnas planas (mapRow), fórmulas y relaciones
        // inversas del raw quedaban RANCIAS para siempre. El response del PATCH ya trae la página completa
        // actualizada → mirrorPage la re-espeja (upsert full: raw + columnas) gratis, sin requests extra.
        // Guarda anti-carrera: si entró OTRO write pendiente para esta página después del claim, NO espejar
        // (pisaría ese merge más nuevo del raw) — el drain de ese write hará el re-espejo. Best-effort.
        if (pr.page) {
          try {
            const chk = await fetch(`${SUPABASE_URL}/rest/v1/outbox_notion?notion_id=eq.${encodeURIComponent(notionId)}&status=in.(pending,processing)&select=id&limit=1`, { headers: sbHeaders() });
            const conPendientes = chk.ok && (await chk.json().catch(() => [])).length > 0;
            if (!conPendientes) await mirrorPage(rows[0].resource, pr.page);
          } catch (e) { console.warn('[outbox] re-espejo falló (no crítico)', String(e?.message || e).slice(0, 120)); }
        }
      } else if (pr.permanent) {
        // 4xx: no tiene sentido reintentar → veneno directo (inspección: status='error').
        await sbPatch(`id=in.(${ids.join(',')})`, { status: 'error', last_error: `notion ${pr.status}: ${pr.detail || ''}`.slice(0, 300) });
        errored += ids.length;
      } else {
        // Transitorio: reintentar con backoff. Cada fila: attempts+1; ≥MAX → error.
        for (const row of rows) {
          const att = (row.attempts || 0) + 1;
          if (att >= MAX_ATTEMPTS) {
            await sbPatch(`id=eq.${row.id}`, { status: 'error', attempts: att, last_error: `notion ${pr.status} (agotado)` });
            errored++;
          } else {
            const backoff = Math.min(30 * 1000 * Math.pow(2, att), 60 * 60 * 1000); // 30s→…→1h
            const next = new Date(Date.now() + backoff).toISOString();
            await sbPatch(`id=eq.${row.id}`, { status: 'pending', attempts: att, next_attempt_at: next, last_error: `notion ${pr.status}` });
            retried++;
          }
        }
      }
    }
    // Alerta de observabilidad (auditoría 2026-07-13, R1): si el outbox envenenó filas (4xx permanente o
    // reintentos agotados), avisar por email — esos servicios quedan atrás en Notion y hoy nadie se enteraría.
    // Fail-safe: nunca rompe el cron.
    if (errored > 0) {
      try {
        // Fallback a los mails del equipo si la lista editable (KV) está vacía — igual que cron-pipeline/report,
        // sino la alerta quedaría muerta justo cuando más importa.
        const to = (await getRecipients('pipeline')) || ['federicomaciel939@gmail.com', 'ihodieego@gmail.com'];
        if (to.length) {
          const body = `<p>El outbox Supabase→Notion marcó <b>${errored}</b> fila(s) como <b>error</b> en la última corrida ` +
            `(propagación permanente fallida). Esos servicios quedan desincronizados en Notion hasta revisarlos.</p>` +
            `<p style="color:#93a89f;font-size:13px">Revisar: <code>select * from outbox_notion where status='error'</code></p>`;
          await sendEmail({ to, subject: `⚠️ FlyClean · Outbox: ${errored} fila(s) sin propagar a Notion`, html: emailLayout('Alerta de sincronización', body) });
        }
      } catch (e) { console.warn('[outbox] alerta falló', String(e?.message || e).slice(0, 120)); }
    }
    return res.status(200).json({ ok: true, claimed: claimed.length, done, retried, errored });
  } catch (e) {
    console.error('[outbox] error', String(e?.message || e).slice(0, 200));
    return res.status(502).json({ error: 'outbox failed' });
  }
}
