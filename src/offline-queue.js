// ─────────────────────────────────────────────
// COLA OFFLINE — writes y fotos del operario SIN SEÑAL (IndexedDB fc-offline-v1)
// ─────────────────────────────────────────────
// La red de seguridad del operario en la azotea: si no hay datos, encola la escritura/foto y la drena al
// reconectar (auto: evento 'online' + cada 30s). Extraído de main.js el 2026-07-16.
//
// Dependencias de main.js por INYECCIÓN (initOfflineQueue), sin import circular — el orden importa: init
// también arranca los listeners y el intervalo, así que las deps ya están seteadas cuando disparan:
//   · callNotion(endpoint, method, body)  → POST/PATCH a Notion al drenar la cola.
//   · DB_ID                                → id de la DB Servicios (dedup de jornadas contra el proxy).
//   · putPhotoToR2(...)                    → sube el binario de la foto a R2.
//   · finalizePhotoUpload(...)             → refresca la vista del servicio abierto tras subir.
//   · updateServiceProps(pageId, props)    → PATCH online (queueableUpdateServiceProps intenta esto primero).
//   · isNetworkError(e)                    → distingue "se cayó la señal" (reintentar) de error real (descartar).

let _callNotion = () => Promise.reject(new Error('offline-queue: callNotion no inyectado'));
let _DB_ID = null;
let _putPhotoToR2 = () => Promise.reject(new Error('offline-queue: putPhotoToR2 no inyectado'));
let _finalizePhotoUpload = () => {};
let _updateServiceProps = () => Promise.reject(new Error('offline-queue: updateServiceProps no inyectado'));
let _isNetworkError = () => false;

// Status TRANSITORIOS (reintentar sin gastar reintentos): timeout/rate-limit/servidor no disponible.
// Reconoce tanto e.status (lo adjunta putPhotoToR2) como el código embebido en el mensaje de callNotion
// ("API error 503: ...", "Backend 429"). Un 400/401/403/404 NO es transitorio (validación/permiso real).
const _TRANSIENT = new Set([408, 425, 429, 500, 502, 503, 504]);
function _isTransientStatus(e) {
  if (e && _TRANSIENT.has(e.status)) return true;
  // Solo el código en la POSICIÓN del status ("API error 503: ...", "Backend 429") — NO cualquier número
  // que aparezca en el texto del motivo (un "API error 400: ... 503 ..." NO es transitorio).
  const m = String(e?.message || '').match(/(?:error|backend)\s+(\d{3})/i);
  return !!m && _TRANSIENT.has(Number(m[1]));
}

// main.js llama esto UNA vez al arrancar. Setea las deps Y arranca el auto-drenado (listeners + intervalo).
export function initOfflineQueue(deps = {}) {
  if (deps.callNotion) _callNotion = deps.callNotion;
  if (deps.DB_ID) _DB_ID = deps.DB_ID;
  if (deps.putPhotoToR2) _putPhotoToR2 = deps.putPhotoToR2;
  if (deps.finalizePhotoUpload) _finalizePhotoUpload = deps.finalizePhotoUpload;
  if (deps.updateServiceProps) _updateServiceProps = deps.updateServiceProps;
  if (deps.isNetworkError) _isNetworkError = deps.isNetworkError;
  // Auto-process al recuperar conexión + cada 30s mientras haya items (writes y fotos).
  window.addEventListener('online', () => { processQueue(); processPhotoQueue(); renderOfflineBadge(); });
  window.addEventListener('offline', () => { renderOfflineBadge(); });
  setInterval(() => { if (navigator.onLine) { processQueue(); processPhotoQueue(); } }, 30000);
}

const OFFLINE_DB_NAME = 'fc-offline-v1';
const OFFLINE_STORE = 'writeQueue';
const PHOTO_STORE = 'photoQueue';

function openOfflineDB() {
  return new Promise((resolve, reject) => {
    // v2: agrega el store de fotos offline. onupgradeneeded corre también para clientes que abrieron v1.
    const req = indexedDB.open(OFFLINE_DB_NAME, 2);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(OFFLINE_STORE)) {
        db.createObjectStore(OFFLINE_STORE, { keyPath: 'id', autoIncrement: true });
      }
      // keyPath 'id' = el id string de la foto (mismo que en serviceState.photos), así se localiza/borra por id.
      if (!db.objectStoreNames.contains(PHOTO_STORE)) {
        db.createObjectStore(PHOTO_STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// ── Cola de FOTOS offline (binarios) ──
export async function enqueuePhoto(item) {
  // item: { id, serviceId, fotoType, sectorId, filename, contentType, blob }
  try {
    const db = await openOfflineDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(PHOTO_STORE, 'readwrite');
      tx.objectStore(PHOTO_STORE).put({ ...item, queuedAt: Date.now(), retries: 0 });
      tx.oncomplete = () => { renderOfflineBadge(); resolve(true); };
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) { console.warn('[offline] enqueuePhoto falló', e); return false; }
}

async function getPhotoQueueItems() {
  try {
    const db = await openOfflineDB();
    return await new Promise((resolve, reject) => {
      const req = db.transaction(PHOTO_STORE, 'readonly').objectStore(PHOTO_STORE).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch (e) { return []; }
}

export async function removePhotoQueueItem(id) {
  try {
    const db = await openOfflineDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(PHOTO_STORE, 'readwrite');
      tx.objectStore(PHOTO_STORE).delete(id);
      tx.oncomplete = () => { renderOfflineBadge(); resolve(true); };
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) { console.warn('[offline] removePhotoQueueItem falló', e); return false; }
}

async function updatePhotoQueueItem(id, patch) {
  try {
    const db = await openOfflineDB();
    return await new Promise((resolve) => {
      const store = db.transaction(PHOTO_STORE, 'readwrite').objectStore(PHOTO_STORE);
      const getReq = store.get(id);
      getReq.onsuccess = () => {
        const cur = getReq.result;
        if (!cur) return resolve(false);
        Object.assign(cur, patch);
        store.put(cur);
        resolve(true);
      };
      getReq.onerror = () => resolve(false);
    });
  } catch (e) { return false; }
}

async function enqueueWrite(pageId, properties) {
  try {
    const db = await openOfflineDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(OFFLINE_STORE, 'readwrite');
      const store = tx.objectStore(OFFLINE_STORE);
      const item = { pageId, properties, queuedAt: Date.now(), retries: 0 };
      const req = store.add(item);
      req.onsuccess = () => { renderOfflineBadge(); resolve(req.result); };
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.warn('enqueueWrite fallback to memory:', e);
    return null;
  }
}

// Encola un CREATE (crear página en Notion) en la misma writeQueue, con un discriminador type:'create'
// (auditoría 2026-07-09 — "seguir otro día" sin señal). `dedup` = { rootId, jornadaN } permite chequear
// antes del POST si la ficha ya existe (idempotencia entre reintentos). Las properties se CONGELAN al
// encolar (snapshot del servicio padre); processQueue las postea tal cual al reconectar.
export async function enqueueCreate(dsId, properties, dedup) {
  try {
    const db = await openOfflineDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(OFFLINE_STORE, 'readwrite');
      tx.objectStore(OFFLINE_STORE).add({ type: 'create', dsId, properties, dedup: dedup || null, queuedAt: Date.now(), retries: 0 });
      tx.oncomplete = () => { renderOfflineBadge(); resolve(true); };
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) { console.warn('[offline] enqueueCreate falló', e); return false; }
}

// Dedup client-side de una jornada J+1 antes de crearla. Devuelve true si ya existe una ficha con esa
// Orden madre + Jornada N°. LANZA si NO se pudo concluir → processQueue reintenta (nunca crea a ciegas).
// Consulta DOS fuentes (fix MEDIUM-1 del review de servicios):
//   (1) ESPEJO Supabase (/api/db) — una J+1 creada por create-fallback (Notion caído) vive SOLO acá + outbox
//       hasta que el worker la propaga (~1min). Sin esto el dedup no la ve → re-POST → J+1 DUPLICADA.
//   (2) NOTION directo (la FUENTE, índice de segundos) — cubre las J+1 creadas Notion-first. _nocache evita
//       el caché stale-while-revalidate del SW (mismo cuerpo → misma clave → devolvía el pool pre-create).
// Hit en cualquiera → existe. Ninguna la encuentra Y ambas respondieron → no existe (crear). Si alguna falló
// sin hit → no sabemos → reintentar.
async function jornadaYaExiste(dedup) {
  if (!dedup || !dedup.rootId || dedup.jornadaN == null) return false;
  const nrm = id => (id || '').replace(/-/g, '');
  const root = nrm(dedup.rootId);
  const auth = { 'Authorization': 'Bearer ' + (localStorage.getItem('fc_token') || '') };
  const match = pool => (pool || []).some(s => {
    const om = s.properties?.['Orden madre']?.relation?.[0]?.id;
    const jn = s.properties?.['Jornada N°']?.number;
    return om && nrm(om) === root && jn === dedup.jornadaN;
  });
  // (1) Espejo
  let espejoOk = false;
  try {
    const r = await fetch('/api/db?resource=servicios', { headers: auth });
    if (r.ok) { const d = await r.json(); espejoOk = true; if (match(d.results)) return true; }
  } catch (_) { /* espejo no disponible */ }
  // (2) Notion (la fuente)
  let notionOk = false;
  try {
    const resp = await fetch('/api/notion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...auth },
      body: JSON.stringify({ endpoint: `databases/${_DB_ID}/query`, method: 'POST', _nocache: Date.now(), body: { page_size: 100, sorts: [{ timestamp: 'last_edited_time', direction: 'descending' }] } })
    });
    if (resp.ok) { const d = await resp.json(); const pool = d.results || []; if (pool.length) { notionOk = true; if (match(pool)) return true; } }
    // pool vacío (search-fallback bajo carga) = "no sé" → notionOk queda false → se reintenta abajo.
  } catch (_) { /* Notion no disponible */ }
  if (espejoOk && notionOk) return false;                 // ambas respondieron y ninguna la tiene → crear
  throw new Error('dedup no concluyente (espejo/Notion) — reintentar'); // no crear a ciegas
}

async function getQueueItems() {
  try {
    const db = await openOfflineDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(OFFLINE_STORE, 'readonly');
      const store = tx.objectStore(OFFLINE_STORE);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch (e) { return []; }
}

async function removeQueueItem(id) {
  try {
    const db = await openOfflineDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(OFFLINE_STORE, 'readwrite');
      const store = tx.objectStore(OFFLINE_STORE);
      const req = store.delete(id);
      req.onsuccess = () => { renderOfflineBadge(); resolve(true); };
      req.onerror = () => reject(req.error);
    });
  } catch (e) { console.warn('[offline] removeQueueItem falló', e); return false; }
}

async function updateQueueItem(id, patch) {
  try {
    const db = await openOfflineDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(OFFLINE_STORE, 'readwrite');
      const store = tx.objectStore(OFFLINE_STORE);
      const getReq = store.get(id);
      getReq.onsuccess = () => {
        const cur = getReq.result;
        if (!cur) return resolve(false);
        Object.assign(cur, patch);
        const putReq = store.put(cur);
        putReq.onsuccess = () => resolve(true);
        putReq.onerror = () => { console.warn('[offline] updateQueueItem put falló', putReq.error); resolve(false); };
      };
      getReq.onerror = () => reject(getReq.error);
    });
  } catch (e) { console.warn('[offline] updateQueueItem falló', e); return false; }
}

let _queueProcessing = false;
export async function processQueue() {
  if (_queueProcessing) return;
  if (!navigator.onLine) return;
  _queueProcessing = true;
  try {
    const items = await getQueueItems();
    const ahora = Date.now();
    for (const item of items) {
      // Idempotencia: saltar ítems "reclamados" hace < 90s (ej. otra pestaña los está sincronizando).
      // Si quedaron colgados (>90s), se re-reclaman. El PATCH es idempotente igual, esto evita reprocesos.
      if (item.processing && (ahora - item.processing) < 90000) continue;
      await updateQueueItem(item.id, { processing: ahora });
      try {
        if (item.type === 'create') {
          // Dedup ANTES de crear → idempotente entre reintentos (ej. si el POST se ejecutó pero se
          // perdió la respuesta): si la J+1 ya existe en Notion, no la re-creamos. jornadaYaExiste lanza
          // si la query falla por red → cae al catch y se reintenta (nunca crea a ciegas).
          if (!(await jornadaYaExiste(item.dedup))) {
            await _callNotion('pages', 'POST', { parent: { type: 'data_source_id', data_source_id: item.dsId }, properties: item.properties });
          }
        } else {
          await _callNotion(`pages/${item.pageId}`, 'PATCH', { properties: item.properties });
        }
        await removeQueueItem(item.id);
      } catch (e) {
        // Si falla, liberar (processing:null) e incrementar retries; si excede 10, descartar.
        const newRetries = (item.retries || 0) + 1;
        if (newRetries > 10) {
          console.warn('[offline] queue item discarded after 10 retries', item);
          await removeQueueItem(item.id);
        } else {
          await updateQueueItem(item.id, { retries: newRetries, processing: null });
        }
        // Romper el loop — si una falla, probablemente todas fallarán (sin conexión).
        break;
      }
    }
  } finally {
    _queueProcessing = false;
    renderOfflineBadge();
  }
}

export async function renderOfflineBadge() {
  const [items, photos] = await Promise.all([getQueueItems(), getPhotoQueueItems()]);
  const total = items.length + photos.length;
  let badge = document.getElementById('offline-badge');
  if (!total && !badge) return;
  if (!badge) {
    badge = document.createElement('div');
    badge.id = 'offline-badge';
    badge.className = 'offline-badge';
    document.body.appendChild(badge);
  }
  if (!total) {
    badge.style.display = 'none';
    return;
  }
  badge.style.display = 'flex';
  const isOnline = navigator.onLine;
  // Detallar las fotos aparte (lo que más le importa al operario: "no perdí mis fotos").
  const label = photos.length ? `${total} pendiente${total > 1 ? 's' : ''} (${photos.length} 📷)` : `${total} pendiente${total > 1 ? 's' : ''}`;
  badge.innerHTML = isOnline
    ? `<span class="offline-badge-dot" style="background:var(--amber)"></span><span>🔄 ${label} sincronizando…</span>`
    : `<span class="offline-badge-dot" style="background:#ff6b6b"></span><span>📴 ${label} sin conexión</span>`;
}

// Wrapper que prueba escribir directo; si falla por red, encola.
export async function queueableUpdateServiceProps(pageId, properties) {
  if (!navigator.onLine) {
    // Sin conexión: encolar directo.
    await enqueueWrite(pageId, properties);
    return { queued: true };
  }
  try {
    return await _updateServiceProps(pageId, properties);
  } catch (e) {
    // Si fue por red, encolar; otros errores (validación, 4xx) se propagan.
    const msg = String(e?.message || '');
    if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('Network request failed')) {
      await enqueueWrite(pageId, properties);
      return { queued: true };
    }
    throw e;
  }
}

// Drena la cola de fotos en DOS FASES para no perder ni duplicar (auditoría 2026-07-09):
//   Fase 1 — subir cada binario a R2 UNA vez y guardar su publicUrl en el propio item (el reintento NO
//            re-sube → no genera URLs nuevas ni duplicados en Notion).
//   Fase 2 — escribir a Notion (append que preserva lo existente) agrupado por servicio; el item se borra
//            SOLO si el write CONFIRMA. Si el GET/PATCH falla, el item queda encolado y se reintenta.
let _photoQueueProcessing = false;
export async function processPhotoQueue() {
  if (_photoQueueProcessing || !navigator.onLine) return;
  _photoQueueProcessing = true;
  try {
    // ── Fase 1: R2 ──
    let items = await getPhotoQueueItems();
    for (const it of items) {
      if (!navigator.onLine) break;
      if (it.publicUrl) continue;                                   // ya subido a R2 en una corrida previa
      if (!it.blob) { await removePhotoQueueItem(it.id); continue; } // defensivo: item sin binario
      try {
        const publicUrl = await _putPhotoToR2(it.serviceId, it.fotoType, it.blob, it.contentType, it.filename);
        _finalizePhotoUpload(it.serviceId, it.fotoType, it.id, { status: 'done', publicUrl }); // refresca la vista si el servicio está abierto
        await updatePhotoQueueItem(it.id, { publicUrl });           // persistir la URL: no re-subir en el reintento
      } catch (e) {
        // TRANSITORIOS no gastan reintentos ni descartan la foto: sin señal (red), o el presign devolvió
        // 503/429/408 (ownership no verificable = Notion+espejo caídos, o rate-limit). Solo un 4xx REAL
        // (validación/permiso: 400/403/404) es permanente → cuenta reintento y descarta a los 5 (bug H5:
        // antes un 503 por Notion caído descartaba fotos válidas del operario).
        if (_isNetworkError(e) || _isTransientStatus(e)) break;      // reintentar en la próxima corrida
        const r = (it.retries || 0) + 1;                           // error permanente (4xx/validación)
        if (r > 5) { _finalizePhotoUpload(it.serviceId, it.fotoType, it.id, { status: 'error', error: 'No se pudo subir' }); await removePhotoQueueItem(it.id); }
        else await updatePhotoQueueItem(it.id, { retries: r });
      }
    }
    // ── Fase 2: Notion ── (solo los que ya tienen publicUrl; agrupados por servicio)
    items = await getPhotoQueueItems();
    const byService = {};
    for (const it of items) { if (it.publicUrl) (byService[it.serviceId] = byService[it.serviceId] || []).push(it); }
    for (const [sid, its] of Object.entries(byService)) {
      if (!navigator.onLine) break;
      try {
        await appendPhotosToNotion(sid, its.map(it => ({ fotoType: it.fotoType, filename: it.filename, sectorId: it.sectorId || null, publicUrl: it.publicUrl })));
        for (const it of its) await removePhotoQueueItem(it.id);    // recién ahora: Notion confirmó
      } catch (e) {
        if (_isNetworkError(e) || _isTransientStatus(e)) continue;  // sin señal / 5xx/429 → reintentar sin gastar reintentos
        for (const it of its) {                                    // Notion rechaza persistentemente (¿página borrada?)
          const r = (it.retries || 0) + 1;
          if (r > 8) { _finalizePhotoUpload(it.serviceId, it.fotoType, it.id, { status: 'error', error: 'No se pudo adjuntar' }); await removePhotoQueueItem(it.id); }
          else await updatePhotoQueueItem(it.id, { retries: r });
        }
      }
    }
  } finally {
    _photoQueueProcessing = false;
    renderOfflineBadge();
  }
}

// Escribe a Notion las fotos recién subidas de un servicio, AGREGÁNDOLAS a las que ya están en la página
// (lee los files actuales y hace union por URL). NO pisa fotos existentes. Si el GET falla (red o server
// 429/5xx/401) LANZA: sin conocer el estado actual, un replace con existing=[] borraría fotos previas →
// mejor abortar y reintentar (el llamador mantiene los items encolados).
async function appendPhotosToNotion(serviceId, uploads) {
  const PROP = { pre: '📸 Fotos pre-servicio', post: '📸 Fotos post-servicio', relevamiento: '📸 Fotos relevamiento' };
  const page = await _callNotion('pages/' + serviceId, 'GET'); // lanza ante cualquier error → no escribir a ciegas
  const props = {};
  ['pre', 'post', 'relevamiento'].forEach(ft => {
    const ups = uploads.filter(u => u.fotoType === ft && u.publicUrl);
    if (!ups.length) return;
    // Normalizamos los files existentes de Notion a formato external con su URL (todas nuestras fotos son external).
    const existing = ((page && page.properties && page.properties[PROP[ft]] && page.properties[PROP[ft]].files) || [])
      .map(f => ({ type: 'external', name: f.name || 'foto.jpg', external: { url: f.external?.url || f.file?.url || '' } }))
      .filter(f => f.external.url);
    const urls = new Set(existing.map(f => f.external.url));
    const additions = [];
    ups.forEach(u => {
      if (urls.has(u.publicUrl)) return; // ya está en Notion → no duplicar
      urls.add(u.publicUrl);
      const ext = (u.filename?.split('.').pop() || 'jpg').toLowerCase();
      const name = `${u.sectorId ? u.sectorId + '__' : ''}${ft}-${existing.length + additions.length + 1}.${ext}`;
      additions.push({ type: 'external', name, external: { url: u.publicUrl } });
    });
    if (additions.length) props[PROP[ft]] = { files: [...existing, ...additions] };
  });
  if (Object.keys(props).length) await queueableUpdateServiceProps(serviceId, props);
}
