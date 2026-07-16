// ─────────────────────────────────────────────
// FOTOS — subida a R2, cola offline de fotos, uploader por servicio/sector, visor (lightbox), galería
// ─────────────────────────────────────────────
// Primer pedazo del área OPERARIO extraído de main.js el 2026-07-16 (patrón PUENTE, como dashboards.js).
// El ESTADO compartido (serviceState, currentService) QUEDA en main y se accede por M (initFotos); las
// FUNCIONES de main que este módulo llama llegan como alias del mismo nombre. _pv (estado del visor) es
// EXCLUSIVO de este módulo → vive acá. Hojas importadas: t/esc + putPhotoToR2/isNetworkError (api) +
// enqueuePhoto/removePhotoQueueItem (offline-queue).

import { t } from './i18n.js';
import { esc } from './util.js';
import { isNetworkError, putPhotoToR2 } from './api.js';
import { enqueuePhoto, removePhotoQueueItem } from './offline-queue.js';

// Config de fotos (compartida con los recibos de main). 10 MB máx; MIMEs de imagen (recibos suman PDF en main).
export const PHOTO_MAX_BYTES = 10 * 1024 * 1024;
export const PHOTO_ALLOWED_MIMES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

let M = {};
export function initFotos(bridge) { M = bridge; }

// Alias de funciones de main (mismo nombre → ni el código ni los ${…} de los templates cambian).
const escAttrEdit = (...a) => M.escAttrEdit(...a);
const persistServiceState = (...a) => M.persistServiceState(...a);
const refreshSectorOverlayIfOpen = (...a) => M.refreshSectorOverlayIfOpen(...a);
const renderStep = (...a) => M.renderStep(...a);
const storageKeyForService = (...a) => M.storageKeyForService(...a);

export function ensurePhotosBucket(fotoType) {
  if (!M.serviceState.photos) M.serviceState.photos = { pre: [], post: [], relevamiento: [] };
  if (!M.serviceState.photos[fotoType]) M.serviceState.photos[fotoType] = [];
}
export function fotoTomada(p) { return p && (p.status === 'done' || p.status === 'queued'); }

export async function handlePhotoSelect(inputEl, fotoType, sectorId) {
  const files = Array.from(inputEl.files || []);
  inputEl.value = ''; // reset para permitir re-seleccionar la misma foto
  if (!files.length) return;

  ensurePhotosBucket(fotoType);

  // Subir todas en paralelo
  await Promise.all(files.map(file => uploadPhoto(file, fotoType, sectorId)));
}
export async function uploadPhoto(file, fotoType, sectorId) {
  const id = Date.now() + '-' + Math.random().toString(36).slice(2, 7);
  ensurePhotosBucket(fotoType);

  if (file.size > PHOTO_MAX_BYTES) {
    M.serviceState.photos[fotoType].push({ id, fotoType, sectorId: sectorId || null, filename: file.name, status: 'error', error: 'Foto >10MB' });
    renderStep();
    refreshSectorOverlayIfOpen();
    return;
  }
  const mime = (file.type || '').toLowerCase();
  if (!PHOTO_ALLOWED_MIMES.includes(mime)) {
    M.serviceState.photos[fotoType].push({ id, fotoType, sectorId: sectorId || null, filename: file.name, status: 'error', error: 'Tipo no permitido' });
    renderStep();
    refreshSectorOverlayIfOpen();
    return;
  }

  const previewUrl = URL.createObjectURL(file);
  const photo = { id, fotoType, sectorId: sectorId || null, filename: file.name, contentType: mime, status: 'uploading', publicUrl: null, error: null, previewUrl };
  M.serviceState.photos[fotoType].push(photo);
  renderStep();
  refreshSectorOverlayIfOpen();

  // Capturamos el serviceId al inicio del upload para que el resultado se
  // asocie al servicio correcto aunque el operario cambie de servicio durante
  // el PUT a R2. Si al volver M.currentService es otro, no mutamos el state
  // visible — la foto queda guardada al servicio original via persistServiceState.
  const targetServiceId = M.currentService?.id;
  if (!targetServiceId) { finalizePhotoUpload(targetServiceId, fotoType, id, { status: 'error', error: 'Sin servicio activo' }); return; }

  const queueItem = { id, serviceId: targetServiceId, fotoType, sectorId: sectorId || null, filename: file.name, contentType: mime, blob: file };

  // Sin conexión → encolar el binario directo y marcar 'queued' (NO se pierde; se sube al reconectar).
  // Si el encolado FALLA (cuota IDB, modo privado) → marcar 'error', no 'queued': una foto marcada
  // "encolada" sin binario sería una pérdida silenciosa con falsa tranquilidad.
  if (!navigator.onLine) {
    const ok = await enqueuePhoto(queueItem);
    finalizePhotoUpload(targetServiceId, fotoType, id, ok ? { status: 'queued' } : { status: 'error', error: 'No se pudo guardar offline' });
    return;
  }

  try {
    const publicUrl = await putPhotoToR2(targetServiceId, fotoType, file, mime, file.name);
    finalizePhotoUpload(targetServiceId, fotoType, id, { status: 'done', publicUrl });
  } catch (e) {
    if (isNetworkError(e)) {
      // La señal se cayó a mitad del upload → encolar en vez de perder la foto (mismo guard que arriba).
      const ok = await enqueuePhoto(queueItem);
      finalizePhotoUpload(targetServiceId, fotoType, id, ok ? { status: 'queued' } : { status: 'error', error: 'No se pudo guardar offline' });
    } else {
      finalizePhotoUpload(targetServiceId, fotoType, id, { status: 'error', error: e.message || 'Error' });
    }
  }
}
export function finalizePhotoUpload(targetServiceId, fotoType, photoId, patch) {
  if (M.currentService?.id === targetServiceId) {
    const arr = M.serviceState.photos?.[fotoType] || [];
    const ph = arr.find(p => p.id === photoId);
    if (ph) Object.assign(ph, patch);
    persistServiceState();
    renderStep();
    refreshSectorOverlayIfOpen();
    return;
  }
  try {
    const key = storageKeyForService(targetServiceId);
    const raw = localStorage.getItem(key);
    if (!raw) return;
    const st = JSON.parse(raw);
    const arr = st.photos?.[fotoType] || [];
    const idx = arr.findIndex(p => p.id === photoId);
    if (idx >= 0) arr[idx] = { ...arr[idx], ...patch };
    localStorage.setItem(key, JSON.stringify(st));
  } catch (_) {}
}
export function retryPhoto(fotoType, photoId) {
  const arr = M.serviceState.photos?.[fotoType] || [];
  const p = arr.find(x => x.id === photoId);
  if (!p) return;
  // No tenemos el File original; pedimos al usuario que lo seleccione de nuevo
  arr.splice(arr.indexOf(p), 1);
  renderStep();
  // Disparar el file input
  setTimeout(() => {
    const inp = document.getElementById('photo-input-' + fotoType);
    if (inp) inp.click();
  }, 50);
}
export function removePhoto(fotoType, photoId) {
  if (!M.serviceState.photos?.[fotoType]) return;
  if (!confirm(t('foto.borrar.confirm'))) return;
  const p = M.serviceState.photos[fotoType].find(x => x.id === photoId);
  if (p?.previewUrl) URL.revokeObjectURL(p.previewUrl);
  // Si estaba encolada offline, sacar también el binario de IndexedDB (evita que se suba una foto borrada).
  if (p?.status === 'queued') removePhotoQueueItem(photoId).catch(() => {});
  M.serviceState.photos[fotoType] = M.serviceState.photos[fotoType].filter(x => x.id !== photoId);
  persistServiceState();
  renderStep();
  refreshSectorOverlayIfOpen();
}
export function photoThumbSrc(p) {
  if (p.previewUrl) return p.previewUrl;
  if (p.publicUrl) return '/api/img?u=' + encodeURIComponent(p.publicUrl);
  return '';
}
export function openPhotoViewerFor(fotoType, photoId) {
  const arr = (M.serviceState.photos?.[fotoType] || []);
  const fotos = arr.map(p => ({ url: photoThumbSrc(p), seccion: seccionLabel(fotoType) })).filter(f => f.url);
  if (!fotos.length) return;
  const idx = arr.findIndex(p => p.id === photoId);
  openPhotoViewer(fotos, idx < 0 ? 0 : Math.min(idx, fotos.length - 1));
}
export function renderPhotoUploader(fotoType, minPhotos, opts = {}) {
  const photos = M.serviceState.photos?.[fotoType] || [];
  const doneCount = photos.filter(p => p.status === 'done').length;
  const queuedCount = photos.filter(p => p.status === 'queued').length;
  const minLabel = minPhotos ? ` (mínimo ${minPhotos})` : '';
  const queuedLabel = queuedCount ? ` · ${queuedCount} ⏳ ${t('photos.queued')}` : '';
  // opts.gallery (relevamiento): segundo input SIN capture → el navegador ofrece la galería (subir fotos
  // sacadas antes, sin estar en el lugar). El input con capture="environment" va directo a la cámara.
  const galleryHtml = opts.gallery ? `
      <input type="file" accept="image/*" multiple id="photo-input-${fotoType}-gal" onchange="handlePhotoSelect(this, '${fotoType}')" style="display:none">
      <button type="button" class="photo-add-btn" style="margin-top:8px" onclick="document.getElementById('photo-input-${fotoType}-gal').click()">🖼️ ${t('photos.add.gallery')}</button>` : '';
  return `
    <div class="photo-uploader">
      <input type="file" accept="image/*" capture="environment" multiple id="photo-input-${fotoType}" onchange="handlePhotoSelect(this, '${fotoType}')" style="display:none">
      <button type="button" class="photo-add-btn" onclick="document.getElementById('photo-input-${fotoType}').click()">📷 ${t('photos.add')}</button>${galleryHtml}
      <div class="photo-count">${doneCount} ${doneCount === 1 ? t('photos.uploaded.one') : t('photos.uploaded.many')}${minLabel}${queuedLabel}</div>
      <div class="photo-grid">
        ${photos.map(p => `
          <div class="photo-thumb status-${p.status}">
            ${photoThumbSrc(p) ? `<img src="${photoThumbSrc(p)}" alt="" style="cursor:zoom-in" onclick="openPhotoViewerFor('${fotoType}','${p.id}')">` : '<div class="photo-thumb-empty">📷</div>'}
            ${p.status === 'uploading' ? '<div class="photo-overlay"><div class="spinner-sm"></div></div>' : ''}
            ${p.status === 'done' ? '<div class="photo-badge photo-badge-ok">✓</div>' : ''}
            ${p.status === 'queued' ? `<div class="photo-badge" style="background:var(--amber)" title="${t('photos.queued')}">⏳</div>` : ''}
            ${p.status === 'error' ? `<div class="photo-overlay photo-overlay-error" title="${p.error || ''}">⚠️<div class="photo-error-text">${p.error || 'Error'}</div></div>` : ''}
            ${p.status !== 'uploading' ? `<button type="button" class="photo-remove" onclick="removePhoto('${fotoType}','${p.id}')">×</button>` : ''}
            ${p.status === 'error' ? `<button type="button" class="photo-retry" onclick="retryPhoto('${fotoType}','${p.id}')">${t('photos.retry')}</button>` : ''}
          </div>
        `).join('')}
      </div>
    </div>
  `;
}
export function sectorFotos(sectorId, fotoType) {
  return (M.serviceState.photos?.[fotoType] || []).filter(p => p.sectorId === sectorId);
}
export function renderSectorPhotoUploader(sectorId, fotoType, minPhotos) {
  const photos = sectorFotos(sectorId, fotoType);
  const doneCount = photos.filter(p => p.status === 'done').length;
  const queuedCount = photos.filter(p => p.status === 'queued').length;
  const minLabel = minPhotos ? ` (mínimo ${minPhotos})` : '';
  const queuedLabel = queuedCount ? ` · ${queuedCount} ⏳ ${t('photos.queued')}` : '';
  const inputId = `photo-input-${fotoType}-${sectorId}`;
  return `
    <div class="photo-uploader">
      <input type="file" accept="image/*" capture="environment" multiple id="${inputId}" onchange="handlePhotoSelect(this, '${fotoType}', '${escAttrEdit(sectorId)}')" style="display:none">
      <button type="button" class="photo-add-btn" onclick="document.getElementById('${inputId}').click()">📷 ${t('photos.add')}</button>
      <div class="photo-count">${doneCount} ${doneCount === 1 ? t('photos.uploaded.one') : t('photos.uploaded.many')}${minLabel}${queuedLabel}</div>
      <div class="photo-grid">
        ${photos.map(p => `
          <div class="photo-thumb status-${p.status}">
            ${photoThumbSrc(p) ? `<img src="${photoThumbSrc(p)}" alt="" style="cursor:zoom-in" onclick="openPhotoViewerFor('${fotoType}','${p.id}')">` : '<div class="photo-thumb-empty">📷</div>'}
            ${p.status === 'uploading' ? '<div class="photo-overlay"><div class="spinner-sm"></div></div>' : ''}
            ${p.status === 'done' ? '<div class="photo-badge photo-badge-ok">✓</div>' : ''}
            ${p.status === 'queued' ? `<div class="photo-badge" style="background:var(--amber)" title="${t('photos.queued')}">⏳</div>` : ''}
            ${p.status === 'error' ? `<div class="photo-overlay photo-overlay-error" title="${p.error || ''}">⚠️<div class="photo-error-text">${p.error || 'Error'}</div></div>` : ''}
            ${p.status !== 'uploading' ? `<button type="button" class="photo-remove" onclick="removePhoto('${fotoType}','${p.id}')">×</button>` : ''}
            ${p.status === 'error' ? `<button type="button" class="photo-retry" onclick="retryPhoto('${fotoType}','${p.id}')">${t('photos.retry')}</button>` : ''}
          </div>
        `).join('')}
      </div>
    </div>
  `;
}
export function photosToNotionFiles(arr, baseName) {
  return (arr || [])
    .filter(p => p.status === 'done' && p.publicUrl)
    .map((p, i) => ({
      type: 'external',
      name: `${p.sectorId ? p.sectorId + '__' : ''}${baseName}-${i + 1}.${(p.filename?.split('.').pop() || 'jpg').toLowerCase()}`,
      external: { url: p.publicUrl }
    }));
}
export function extractServiceFiles(props) {
  const collect = (key) => {
    const files = props[key]?.files || [];
    return files.map(f => f.external?.url || f.file?.url).filter(Boolean);
  };
  return {
    pre: collect('📸 Fotos pre-servicio'),
    post: collect('📸 Fotos post-servicio'),
    relevamiento: collect('📸 Fotos relevamiento')
  };
}
let _pv = { fotos: [], idx: 0, x0: null };
export function seccionLabel(fotoType) {
  return fotoType === 'post' ? t('foto.sec.despues') : fotoType === 'relevamiento' ? t('foto.sec.relev') : t('foto.sec.antes');
}
export function openPhotoViewer(fotos, startIdx) {
  fotos = (fotos || []).filter(f => f && f.url);
  if (!fotos.length) return;
  _pv = { fotos, idx: Math.max(0, Math.min(startIdx || 0, fotos.length - 1)), x0: null };
  const ov = document.getElementById('photo-viewer-overlay');
  if (!ov._pvBound) {
    ov._pvBound = true;
    const stage = document.getElementById('pv-stage');
    stage.addEventListener('touchstart', e => { _pv.x0 = e.touches[0].clientX; }, { passive: true });
    stage.addEventListener('touchend', e => { if (_pv.x0 == null) return; const dx = e.changedTouches[0].clientX - _pv.x0; if (Math.abs(dx) > 45) pvNav(dx < 0 ? 1 : -1); _pv.x0 = null; }, { passive: true });
    ov.addEventListener('click', e => { if (e.target === ov) closePhotoViewer(); }); // tocar el fondo cierra
  }
  ov.classList.add('open');
  renderPhotoViewer();
  document.addEventListener('keydown', _pvKey);
}
export function closePhotoViewer() {
  document.getElementById('photo-viewer-overlay').classList.remove('open');
  document.removeEventListener('keydown', _pvKey);
  _pv = { fotos: [], idx: 0, x0: null };
}
export function _pvKey(e) {
  if (e.key === 'ArrowLeft') pvNav(-1);
  else if (e.key === 'ArrowRight') pvNav(1);
  else if (e.key === 'Escape') closePhotoViewer();
}
export function pvNav(d) {
  if (_pv.fotos.length < 2) return;
  _pv.idx = (_pv.idx + d + _pv.fotos.length) % _pv.fotos.length;
  renderPhotoViewer();
}
// Reintenta cargar la foto actual del visor (botón que aparece al fallar la conexión).
export function pvRetry() {
  const img = document.getElementById('pv-img'); const f = _pv.fotos[_pv.idx];
  if (!img || !f) return;
  document.getElementById('pv-stage').classList.remove('pv-failed');
  const n = parseInt(img.dataset.r || '0', 10) + 1; img.dataset.r = n;
  img.src = f.url + (f.url.includes('?') ? '&' : '?') + 'r=' + n;
}
export function renderPhotoViewer() {
  const f = _pv.fotos[_pv.idx]; if (!f) return;
  const img = document.getElementById('pv-img');
  document.getElementById('pv-stage').classList.remove('pv-failed');
  img.dataset.r = '0'; img.src = f.url;
  document.getElementById('pv-caption').innerHTML = esc(f.seccion || '') + ' <span class="pv-count">· ' + (_pv.idx + 1) + ' / ' + _pv.fotos.length + '</span>';
  const multi = _pv.fotos.length > 1;
  document.getElementById('pv-prev').style.display = multi ? '' : 'none';
  document.getElementById('pv-next').style.display = multi ? '' : 'none';
}
export function openGalleryViewer(a) {
  const gallery = a.closest('.photo-gallery') || a.parentElement;
  const thumbs = [...gallery.querySelectorAll('a[data-url]')];
  const fotos = thumbs.map(el => ({ url: el.dataset.url, seccion: el.dataset.seccion || '' }));
  openPhotoViewer(fotos, Math.max(0, thumbs.indexOf(a)));
}
export function renderPhotoGallery(props) {
  const files = extractServiceFiles(props);
  const px = (url) => '/api/img?u=' + encodeURIComponent(url);
  // Secciones SEPARADAS (antes / después / relevamiento) — antes iban todas mezcladas en una fila.
  const secs = [
    { label: t('foto.sec.antes'), urls: files.pre },
    { label: t('foto.sec.despues'), urls: files.post },
    { label: t('foto.sec.relev'), urls: files.relevamiento },
  ].filter(s => s.urls.length);
  const total = secs.reduce((n, s) => n + s.urls.length, 0);
  if (!total) return '';
  // Cada thumb abre el VISOR (no una pestaña nueva); el <img> carga perezoso al desplegar. La sección va en data-*.
  const groups = secs.map(s => {
    const thumbs = s.urls.map(url => `<a data-url="${px(url)}" data-seccion="${esc(s.label)}" onclick="openGalleryViewer(this);event.stopPropagation()"><img loading="lazy" data-src="${px(url)}" alt=""></a>`).join('');
    return `<div class="pg-sec-label">${esc(s.label)} · ${s.urls.length}</div>${thumbs}`;
  }).join('');
  return `<div class="photo-collapse">` +
    `<button type="button" class="photo-toggle" onclick="togglePhotos(this, event)">📷 ${t('foto.vertodas')} (${total}) <span class="photo-arrow">▾</span></button>` +
    `<div class="photo-gallery" style="display:none">${groups}</div>` +
    `</div>`;
}
export function togglePhotos(btn, ev) {
  ev.stopPropagation(); ev.preventDefault();
  const g = btn.nextElementSibling;
  if (!g) return;
  const open = g.style.display === 'none';
  g.style.display = open ? 'flex' : 'none';
  const arrow = btn.querySelector('.photo-arrow');
  if (arrow) arrow.textContent = open ? '▴' : '▾';
  if (open) g.querySelectorAll('img[data-src]').forEach(im => { im.src = im.dataset.src; im.removeAttribute('data-src'); });
}
