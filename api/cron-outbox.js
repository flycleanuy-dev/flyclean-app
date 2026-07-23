// Fase 3a.2 — Worker del outbox: propaga a Notion (async) las ediciones que ya se guardaron Supabase-first.
// Corre cada 1 min (vercel.json). Auth CRON_SECRET (falla cerrado). INERTE mientras no haya filas encoladas
// (con SUPAFIRST_TABLES vacío nadie encola → este worker no hace nada).
//
// Por corrida: (0) resetea 'processing' colgados; (1) claim atómico (SKIP LOCKED); (2) coalescing por notion_id
// (mergea los payloads pendientes en orden created_at → UN PATCH por página); (3) éxito→done, transitorio→
// reintento con backoff, permanente/veneno(≥8)→error; (4) re-espejo post-propagación (ver abajo).
import { sendEmail, emailLayout } from './_lib/email.js';
import { getRecipients } from './_lib/recipients.js';
import { mirrorPage, deleteRowByNotionId } from './_lib/mirror.js';
import { idMapLookup, idMapResolve, collectRelationIds, substituteRelationIds, splitCreateGroup } from './_lib/supafirst.js';
import { DBS } from './_lib/notion-map.js';

const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
const NOTION_TOKEN = process.env.NOTION_TOKEN || '';
const NOTION_VERSION = '2022-06-28';
// Vercel Pro: el worker puede tardar (dedup con reintentos + paginación del search de servicios). Techo
// explícito para no cortarse a mitad de un create (dejaría filas 'processing' hasta el rescate de 5min).
export const config = { maxDuration: 60 };

const CLAIM_LIMIT = 100;
const MAX_ATTEMPTS = 8;
// Los creates tienen el MISMO techo que los patches (MEDIUM-4 del review): el fallback existe justamente para
// sobrevivir a Notion caído → un create no debe envenenarse por una caída de minutos (el dato vive en el
// espejo mientras tanto). Con el backoff (cap 30min) 8 intentos cubren ~2h; si igual se agota, salta el email.
const MAX_ATTEMPTS_CREATE = 8;
const STALE_PROCESSING_MS = 5 * 60 * 1000;
const APP_UID_PROP = 'App UID'; // property rich_text en Notion (Diego la crea por tabla antes de prender el flag) — idempotencia
// Fase 3b: si el CSV está vacío (hoy), NO hay creates ni ids locales → el worker resuelve patches SIN tocar
// id_map (idéntico a antes, cero overhead). Con el flag prendido activa la resolución local→real de patches.
const CREATE_FALLBACK = new Set((process.env.CREATE_FALLBACK_TABLES || '').split(',').map(s => s.trim()).filter(Boolean));

const sbHeaders = () => ({
  apikey: SERVICE_KEY,
  Authorization: 'Bearer ' + SERVICE_KEY,
  'Content-Type': 'application/json',
});
const sleep = ms => new Promise(r => setTimeout(r, ms));

// PATCH a Notion con backoff ante 429/5xx. 4xx (property inexistente / página borrada) = permanente.
// Si ok, devuelve también la PÁGINA actualizada (el response del PATCH) para el re-espejo post-propagación.
async function notionPatch(pageId, properties) {
  for (let i = 0; i < 3; i++) {
    const r = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
      method: 'PATCH',
      headers: {
        Authorization: 'Bearer ' + NOTION_TOKEN,
        'Notion-Version': NOTION_VERSION,
        'Content-Type': 'application/json',
      },
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
    method: 'PATCH',
    headers: { ...sbHeaders(), Prefer: 'return=minimal' },
    body: JSON.stringify(patch),
  });
}

// ── Fase 3b: helpers de CREATE ──────────────────────────────────────────────
const notionHeaders = () => ({
  Authorization: 'Bearer ' + NOTION_TOKEN,
  'Notion-Version': NOTION_VERSION,
  'Content-Type': 'application/json',
});

// POST /v1/pages. ⚠️ Un POST NO es idempotente (a diferencia de un PATCH): reintentar ante 5xx/408/409
// puede crear una SEGUNDA página si el primer POST creó la página pero respondió error (HIGH-1 del review).
// Por eso SOLO reintentamos 429 (rate-limit = la request fue rechazada ANTES de crear, seguro). Cualquier
// 5xx/408/409 → devolvemos transitorio-SIN-reintento: la próxima corrida re-deduplica por App UID antes de
// re-POSTear. 4xx (validación) = permanente. Devuelve { ok, id?, page?, permanent?, status }.
async function notionCreate(parent, properties) {
  for (let i = 0; i < 3; i++) {
    const r = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: notionHeaders(),
      body: JSON.stringify({ parent, properties }),
    });
    if (r.ok) { const page = await r.json().catch(() => null); return { ok: true, id: page?.id || null, page }; }
    if (r.status === 429) { // rechazado antes de crear → reintento seguro
      const ra = parseInt(r.headers.get('retry-after') || '0', 10);
      await sleep(ra ? ra * 1000 : 400 * (i + 1));
      continue;
    }
    if (r.status === 408 || r.status === 409 || r.status >= 500) {
      // pudo haber creado la página → NO reintentar en esta corrida; diferir y re-deduplicar en la próxima.
      return { ok: false, status: r.status, permanent: false };
    }
    const detail = await r.text().catch(() => '');
    return { ok: false, status: r.status, permanent: true, detail: detail.slice(0, 200) };
  }
  return { ok: false, status: 0, permanent: false };
}

// Una pasada de búsqueda por App UID. Devuelve { found:true, id } · { found:false } (recorrió y no está) ·
// { unknown:true } (no se pudo saber: error/rate-limit). Servicios es multi-data-source → la query directa
// falla y se cae al search API + filtro cliente (mismo patrón que el proxy y jornadaYaExiste).
async function _findByAppUidOnce(resource, dbId, uid) {
  const norm = s => (s || '').replace(/-/g, '');
  const filter = { property: APP_UID_PROP, rich_text: { equals: uid } };
  try {
    const r = await fetch(`https://api.notion.com/v1/databases/${dbId}/query`, {
      method: 'POST',
      headers: notionHeaders(),
      body: JSON.stringify({ filter, page_size: 5 }),
    });
    if (r.ok) {
      const d = await r.json().catch(() => null);
      if (!d || !Array.isArray(d.results)) return { unknown: true };
      return d.results.length ? { found: true, id: d.results[0].id } : { found: false };
    }
    const t = await r.text().catch(() => '');
    if (!(r.status === 400 && /multiple_data_sources|multiple data sources/i.test(t))) return { unknown: true };
    // Multi-data-source (Servicios) → search API + filtro client-side por App UID.
    let cursor = null, seen = 0;
    do {
      const body = { filter: { property: 'object', value: 'page' }, page_size: 100 };
      if (cursor) body.start_cursor = cursor;
      const sr = await fetch('https://api.notion.com/v1/search', { method: 'POST', headers: notionHeaders(), body: JSON.stringify(body) });
      if (!sr.ok) return { unknown: true };
      const sd = await sr.json().catch(() => null);
      const results = (sd && sd.results) || [];
      seen += results.length;
      for (const p of results) {
        if (norm(p.parent?.database_id) !== norm(dbId)) continue;
        const val = (p.properties?.[APP_UID_PROP]?.rich_text || []).map(x => x.plain_text || '').join('');
        if (val === uid) return { found: true, id: p.id };
      }
      cursor = sd?.has_more ? sd.next_cursor : null;
    } while (cursor);
    return seen > 0 ? { found: false } : { unknown: true }; // [] total = lag/rate-limit → no sé
  } catch (_) {
    return { unknown: true };
  }
}

// Dedup por App UID con TOLERANCIA A LAG (HIGH-2 del review): el índice de Notion (sobre todo el search de
// servicios) es eventualmente consistente → una página recién creada puede NO aparecer aún. Concluir "no
// existe" de más = crear un DUPLICADO (la dedup es la ÚNICA barrera). Por eso reintentamos la búsqueda con
// delay ANTES de devolver found:false; found (existe) y unknown (error) cortan al toque. Solo se llama cuando
// un POST previo PUDO haber creado la página (ver mustDedup en applyCreateGroup), no en cada alta.
async function findByAppUid(resource, uid) {
  const dbId = DBS[resource];
  if (!dbId) return { unknown: true };
  const ATTEMPTS = 3, DELAY = 1200;
  let last = { unknown: true };
  for (let a = 0; a < ATTEMPTS; a++) {
    if (a) await sleep(DELAY);
    last = await _findByAppUidOnce(resource, dbId, uid);
    if (last.found || last.unknown) return last; // existe (usar) o no sé (diferir) → no seguir reintentando
    // found:false → reintentar por si el índice todavía no reflejó la página recién creada
  }
  return last; // tras los reintentos con delay sigue sin aparecer → tratar como no existe (crear)
}


// Difiere un grupo entero (vuelve a pending con next_attempt_at futuro, SIN gastar attempts) → claim_outbox v2
// no lo reclama hasta entonces (y su guarda 'processing'/'pending diferido' bloquea el grupo completo).
async function deferGroup(rows, ms, reason) {
  const next = new Date(Date.now() + ms).toISOString();
  await sbPatch(`id=in.(${rows.map(r => r.id).join(',')})`, { status: 'pending', next_attempt_at: next, last_error: String(reason).slice(0, 300) });
}
async function poisonGroup(rows, reason) {
  await sbPatch(`id=in.(${rows.map(r => r.id).join(',')})`, { status: 'error', last_error: String(reason).slice(0, 300) });
}

// Back-fill del notion_id real en la fila del espejo (uid → realId). Si choca con unique (el sync altas-only
// insertó la fila real en la carrera) → borra la local y re-espeja la página creada para dejar el raw fresco.
async function backfillNotionId(resource, uid, realId, createdPage) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${resource}?notion_id=eq.${encodeURIComponent(uid)}`, {
    method: 'PATCH',
    headers: { ...sbHeaders(), Prefer: 'return=minimal' },
    body: JSON.stringify({ notion_id: realId }),
  });
  if (r.ok) return;
  if (r.status === 409) {
    try { await deleteRowByNotionId(resource, uid); } catch (_) { /* best-effort */ }
    if (createdPage) { try { await mirrorPage(resource, createdPage); } catch (_) { /* best-effort */ } }
  }
  // otro error → dejar la fila local; el re-espejo/sync la reconciliará (el create ya se propagó, no se aborta).
}

// Re-keyea los OTROS registros del outbox de esta página (los patches encolados contra el uid local) al
// notion_id real, para que se procesen contra la página ya creada. Excluye la propia fila del create.
async function rekeyOutbox(uid, realId, createRowId) {
  await sbPatch(`notion_id=eq.${encodeURIComponent(uid)}&status=in.(pending,processing)&id=neq.${createRowId}`, { notion_id: realId });
}

// Aplica un grupo de PATCHES coalescidos a una página (targetId ya resuelto a un id real de Notion).
async function applyPatchesTo(targetId, resource, rows) {
  let done = 0, errored = 0, retried = 0;
  const merged = Object.assign({}, ...rows.map(r => r.payload || {}));
  const ids = rows.map(r => r.id);
  const pr = await notionPatch(targetId, merged);
  if (pr.ok) {
    await sbPatch(`id=in.(${ids.join(',')})`, { status: 'done', last_error: null });
    done += ids.length;
    if (pr.page) {
      try {
        const chk = await fetch(
          `${SUPABASE_URL}/rest/v1/outbox_notion?notion_id=eq.${encodeURIComponent(targetId)}&status=in.(pending,processing)&select=id&limit=1`,
          { headers: sbHeaders() }
        );
        const conPendientes = chk.ok && (await chk.json().catch(() => [])).length > 0;
        if (!conPendientes) await mirrorPage(resource, pr.page);
      } catch (e) {
        console.warn('[outbox] re-espejo falló (no crítico)', String(e?.message || e).slice(0, 120));
      }
    }
  } else if (pr.permanent) {
    await sbPatch(`id=in.(${ids.join(',')})`, { status: 'error', last_error: `notion ${pr.status}: ${pr.detail || ''}`.slice(0, 300) });
    errored += ids.length;
  } else {
    for (const row of rows) {
      const att = (row.attempts || 0) + 1;
      if (att >= MAX_ATTEMPTS) {
        await sbPatch(`id=eq.${row.id}`, { status: 'error', attempts: att, last_error: `notion ${pr.status} (agotado)` });
        errored++;
      } else {
        const backoff = Math.min(30 * 1000 * Math.pow(2, att), 60 * 60 * 1000);
        await sbPatch(`id=eq.${row.id}`, { status: 'pending', attempts: att, next_attempt_at: new Date(Date.now() + backoff).toISOString(), last_error: `notion ${pr.status}` });
        retried++;
      }
    }
  }
  return { done, errored, retried, deferred: 0 };
}

// Grupo de PATCHES cuyo notion_id puede ser LOCAL (create con fallback). Resuelve el target contra id_map
// (solo si CREATE_FALLBACK está activo): resuelto → realId · pendiente → diferir · envenenado → veneno.
async function applyPatchGroup(notionId, rows) {
  let targetId = notionId;
  if (CREATE_FALLBACK.size) {
    const { ok, map } = await idMapLookup([notionId]);
    if (!ok) { await deferGroup(rows, 30 * 1000, 'id_map no disponible — reintentar'); return { done: 0, errored: 0, retried: 0, deferred: rows.length }; }
    const e = map.get(notionId);
    if (e) {
      if (e.notion_id) targetId = e.notion_id;
      else if (e.errored) { await poisonGroup(rows, 'patch sobre un create envenenado'); return { done: 0, errored: rows.length, retried: 0, deferred: 0 }; }
      else { await deferGroup(rows, 30 * 1000, 'patch esperando que su create se propague'); return { done: 0, errored: 0, retried: 0, deferred: rows.length }; }
    }
  }
  return applyPatchesTo(targetId, rows[0].resource, rows);
}

// Grupo que EMPIEZA con un create (op:'create'). Resuelve relaciones locales → dedup por App UID → crea en
// Notion (o reusa si el dedup la encontró) → back-fill + resolve id_map + re-key → aplica los patches restantes.
async function applyCreateGroup(rows) {
  // LOW-1: colapsar filas op:'create' DUPLICADAS del mismo uid (doble enqueue por blip de infra) → done, sin
  // re-crear ni tratarlas como patch. `group` = create canónica + patches reales (lo que se procesa/poisonea/
  // difiere). Ver splitCreateGroup en supafirst.js.
  const { createRow, dupCreates, patchRows, group } = splitCreateGroup(rows);
  if (dupCreates.length) {
    await sbPatch(`id=in.(${dupCreates.map(r => r.id).join(',')})`, { status: 'done', last_error: 'create duplicado colapsado (LOW-1)' });
  }
  const uid = createRow.notion_id;
  const resource = createRow.resource;
  const payload = createRow.payload || {};
  const parent = payload.parent;
  const properties = payload.properties || {};
  if (!parent || !properties || !Object.keys(properties).length) {
    await poisonGroup(group, 'create sin parent/properties');
    return { done: 0, errored: group.length, retried: 0, deferred: 0 };
  }

  // 1) Resolver relaciones locales
  const relIds = collectRelationIds(properties);
  const { ok: idmapOk, map: idmap } = await idMapLookup(relIds);
  if (!idmapOk) { await deferGroup(group, 30 * 1000, 'id_map no disponible — reintentar'); return { done: 0, errored: 0, retried: 0, deferred: group.length }; }
  const resolved = new Map();
  let pendingErrored = 0, pendingOpen = 0;
  for (const id of relIds) {
    const e = idmap.get(id);
    if (!e) continue;               // no local → id real de Notion
    if (e.notion_id) resolved.set(id, e.notion_id);
    else if (e.errored) pendingErrored++;
    else pendingOpen++;
  }
  if (pendingErrored) { await poisonGroup(group, 'relación local depende de un create envenenado'); return { done: 0, errored: group.length, retried: 0, deferred: 0 }; }
  if (pendingOpen) { await deferGroup(group, 30 * 1000, 'esperando relación local sin propagar'); return { done: 0, errored: 0, retried: 0, deferred: group.length }; }

  // 2) Dedup por App UID — SOLO si un POST previo PUDO haber creado la página: el POST primario del proxy
  // timeouteó (reason='timeout'), o el worker ya intentó antes (attempts>0). Si el primario falló limpio
  // (reason='down', típico: Notion 503) y es el primer intento del worker, nada se creó → saltear el dedup
  // (rápido) y crear directo. Así el dedup lento (tolerante a lag) solo se paga en los casos ambiguos.
  const mustDedup = (createRow.attempts || 0) > 0 || payload.reason === 'timeout';
  let realId = null, createdPage = null;
  if (mustDedup) {
    const dd = await findByAppUid(resource, uid);
    if (dd.unknown) { await deferGroup(group, 60 * 1000, 'dedup App UID no concluyente'); return { done: 0, errored: 0, retried: 0, deferred: group.length }; }
    if (dd.found) realId = dd.id;
  }

  // 3) Crear si el dedup no la encontró
  if (!realId) {
    const cr = await notionCreate(parent, substituteRelationIds(properties, resolved));
    if (cr.ok && cr.id) { realId = cr.id; createdPage = cr.page; }
    else if (cr.permanent) { await poisonGroup(group, `notion create ${cr.status}: ${cr.detail || ''}`); return { done: 0, errored: group.length, retried: 0, deferred: 0 }; }
    else {
      // transitorio → reintentar el create; los patches se difieren con él (no gastan attempts)
      const att = (createRow.attempts || 0) + 1;
      if (att >= MAX_ATTEMPTS_CREATE) { await poisonGroup(group, `notion create ${cr.status} (agotado)`); return { done: 0, errored: group.length, retried: 0, deferred: 0 }; }
      const next = new Date(Date.now() + Math.min(30 * 1000 * Math.pow(2, att), 30 * 60 * 1000)).toISOString();
      await sbPatch(`id=eq.${createRow.id}`, { status: 'pending', attempts: att, next_attempt_at: next, last_error: `notion create ${cr.status}` });
      if (patchRows.length) await sbPatch(`id=in.(${patchRows.map(r => r.id).join(',')})`, { status: 'pending', next_attempt_at: next });
      return { done: 0, errored: 0, retried: 1, deferred: patchRows.length };
    }
  }

  // 4) Back-fill + resolve id_map + re-key del outbox pendiente + marcar el create done
  await backfillNotionId(resource, uid, realId, createdPage);
  await idMapResolve(uid, realId, resource);
  await rekeyOutbox(uid, realId, createRow.id);
  await sbPatch(`id=eq.${createRow.id}`, { status: 'done', last_error: null });
  let acc = { done: 1, errored: 0, retried: 0, deferred: 0 };

  // 5) Aplicar los patches restantes del grupo contra el realId
  if (patchRows.length) {
    const r = await applyPatchesTo(realId, resource, patchRows);
    acc = { done: acc.done + r.done, errored: r.errored, retried: r.retried, deferred: 0 };
  }
  return acc;
}

export default async function handler(req, res) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return res.status(500).json({ error: 'CRON_SECRET not configured' });
  if (req.headers.authorization !== `Bearer ${secret}`)
    return res.status(401).json({ error: 'unauthorized' });
  if (!SUPABASE_URL || !SERVICE_KEY || !NOTION_TOKEN)
    return res.status(500).json({ error: 'no configurado' });
  const dry = ['1', 'true', 'yes'].includes(String(req.query?.dry || '').toLowerCase());

  try {
    // 0) Reponer 'processing' colgados (un worker que murió a mitad) → vuelven a 'pending'.
    const staleISO = new Date(Date.now() - STALE_PROCESSING_MS).toISOString();
    await sbPatch(`status=eq.processing&updated_at=lt.${encodeURIComponent(staleISO)}`, {
      status: 'pending',
    });

    // 1) Claim atómico (FOR UPDATE SKIP LOCKED en la RPC). En dry-run no reclamamos (solo reportamos pendientes).
    let claimed = [];
    if (dry) {
      const r = await fetch(
        `${SUPABASE_URL}/rest/v1/outbox_notion?status=eq.pending&next_attempt_at=lte.${encodeURIComponent(new Date().toISOString())}&select=*&order=created_at&limit=${CLAIM_LIMIT}`,
        { headers: sbHeaders() }
      );
      claimed = await r.json().catch(() => []);
      return res.status(200).json({ dry: true, pending: claimed.length });
    }
    const cr = await fetch(`${SUPABASE_URL}/rest/v1/rpc/claim_outbox`, {
      method: 'POST',
      headers: sbHeaders(),
      body: JSON.stringify({ p_limit: CLAIM_LIMIT }),
    });
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

    let done = 0,
      errored = 0,
      retried = 0,
      deferred = 0;
    for (const [notionId, rows] of byPage) {
      // Un grupo que EMPIEZA con un create (rows ya ordenadas por created_at) va al flujo de creates;
      // el resto (todo patches) al flujo normal, que resuelve el target si es un id local (Fase 3b).
      const r = rows[0]?.op === 'create'
        ? await applyCreateGroup(rows)
        : await applyPatchGroup(notionId, rows);
      done += r.done;
      errored += r.errored;
      retried += r.retried;
      deferred += r.deferred || 0;
    }
    // Alerta de observabilidad (auditoría 2026-07-13, R1): si el outbox envenenó filas (4xx permanente o
    // reintentos agotados), avisar por email — esos servicios quedan atrás en Notion y hoy nadie se enteraría.
    // Fail-safe: nunca rompe el cron.
    if (errored > 0) {
      try {
        // Fallback a los mails del equipo si la lista editable (KV) está vacía — igual que cron-pipeline/report,
        // sino la alerta quedaría muerta justo cuando más importa.
        const to = (await getRecipients('pipeline')) || [
          'federicomaciel939@gmail.com',
          'ihodieego@gmail.com',
        ];
        if (to.length) {
          const body =
            `<p>El outbox Supabase→Notion marcó <b>${errored}</b> fila(s) como <b>error</b> en la última corrida ` +
            `(propagación permanente fallida). Esos servicios quedan desincronizados en Notion hasta revisarlos.</p>` +
            `<p style="color:#93a89f;font-size:13px">Revisar: <code>select * from outbox_notion where status='error'</code></p>`;
          await sendEmail({
            to,
            subject: `⚠️ FlyClean · Outbox: ${errored} fila(s) sin propagar a Notion`,
            html: emailLayout('Alerta de sincronización', body),
          });
        }
      } catch (e) {
        console.warn('[outbox] alerta falló', String(e?.message || e).slice(0, 120));
      }
    }
    return res.status(200).json({ ok: true, claimed: claimed.length, done, retried, errored, deferred });
  } catch (e) {
    console.error('[outbox] error', String(e?.message || e).slice(0, 200));
    return res.status(502).json({ error: 'outbox failed' });
  }
}
