# Sectores — Fase 2 (operativa del operario) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Que el operario trabaje un servicio CON sectores edificio por edificio: ve la lista de sectores en el paso "Trabajo", entra a cada uno, saca fotos antes/después y lo marca hecho; el % de avance se calcula solo. Un servicio SIN sectores se comporta idéntico a hoy.

**Architecture:** Todo en `index.html` (PWA de un archivo). Cuando un servicio tiene `Estado sectores` no vacío, se usa un array de pasos recortado (`STEPS_SECTORES`, sin los pasos de fotos globales) y el paso `ejecucion` se convierte en un HUB que lista los sectores. Tocar un sector abre un overlay (sibling del `<body>`) con su mini-flujo de fotos. Las fotos de cada sector se suben con la maquinaria existente (`uploadPhoto`, fotoType `pre`/`post` — el backend no cambia) etiquetando cada foto con `sectorId`, y se guardan en las properties de fotos existentes con el `name` prefijado por sector. El estado de cada sector vive en `Estado sectores` (el operario solo actualiza el campo `estado`, preservando lo que puso el coordinador).

**Tech Stack:** HTML/CSS/JS vanilla; Notion API vía `callNotion`/`queueableUpdateServiceProps`; fotos a R2 vía `/api/upload-url` (sin cambios); i18n por `TRANSLATIONS` (es + pt-BR).

## Global Constraints

- **Un solo archivo de frontend:** todos los cambios en `index.html`. **No tocar `api/upload-url.js`** ni ningún backend (las fotos por sector usan fotoType `pre`/`post`, que el backend ya acepta; el sector se distingue por `sectorId` en el objeto y por el prefijo del `name` en Notion).
- **Retrocompatibilidad ABSOLUTA del wizard:** un servicio sin sectores (`Estado sectores` ausente/vacío → `serviceState.sectores` = `[]`) debe usar `STEPS_SERVICIO` y comportarse EXACTArmente como hoy. La presencia de sectores (`serviceState.sectores.length > 0`) es el único interruptor.
- **i18n obligatorio en los DOS bloques** (`es` ~línea 2100 y `pt-BR` ~línea 2700): cada string visible nueva como key, usada vía `t('key')`. Buscar un marcador como `'step.ejec.title'` para ubicar la zona de `es`.
- **Escapado:** `esc(...)` en texto dentro de `innerHTML`, `escAttrEdit(...)` dentro de atributos.
- **Persistencia de sectores = JSON en rich_text** `Estado sectores`: `[{id,nombre,estado}]`, `estado ∈ 'pendiente'|'en_curso'|'hecho'`. El operario preserva `id` y `nombre` (los puso el coordinador); solo cambia `estado`.
- **Fotos por sector mínimo: 1 antes + 1 después** para poder marcar un sector como hecho.
- **Sin suite de tests unitarios.** Verificación de cada tarea = `cd ~/repos/flyclean-app && npm run check` (valida que el JS de index.html parsea) en verde. La verificación funcional/visual la hace Diego. NO inventar tests.
- **Commits frecuentes** (uno por tarea) en la rama `feat/sectores-fase2`. Cerrar cada mensaje con:
  `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`
- **Spec:** `docs/superpowers/specs/2026-06-30-sectores-design.md`. La **continuidad entre jornadas (Forma 2) es Fase 3** — fuera de alcance acá. En esta fase, un servicio con sectores se cierra como hoy (`cerrarServicio`); el % se calcula automático.

## Estructuras y referencias existentes (NO redefinir)

- `STEPS_SERVICIO` (~3099), `STEPS_RELEVAMIENTO` (~3110), `let STEPS = STEPS_SERVICIO` (~3120). `STEPS` es global y reasignable; `openService` la setea (~6062).
- `resetServiceState()` (~3165): objeto `serviceState`. `renderStep()` (~6175). `renderStepNav()` (~6139), `goToStep(idx)` (~6152, solo retrocede), `nextStep()` (~6156), `currentStep` (~3136), `computeStepFromState()` (~3331).
- `renderPhotoUploader(fotoType, minPhotos)` (~3481), `handlePhotoSelect(inputEl, fotoType)` (~3362), `uploadPhoto(file, fotoType)` (~3373), `finalizePhotoUpload(...)` (~3437), `removePhoto(fotoType, photoId)` (~3472), `retryPhoto(...)`. Foto object: `{id, fotoType, filename, contentType, status, publicUrl, error, previewUrl}`.
- `photosToNotionFiles(arr, baseName)` (~6763), y el `collect` interno de `hydrateServiceStateFromNotion` (~3283).
- `toggleCheck(list, idx)` (~6703), `CHECKLIST_PRE`/`CHECKLIST_POST` (~3070).
- `cerrarServicio()` (~6773), `buildIncrementalProps(s)` (~3215), `persistServiceState()` (~3246), `persistServiceStateToLocal()` (~3201), `hydrateServiceStateFromNotion`/`...FromLocal` (~3260/3310).
- Overlay pattern: `report-step-overlay` HTML (~1452), `openReportStep`/`renderReportStep`/`closeReportStep`/`reportStepOverlayClick` (~9924). CSS `.edit-overlay`/`.edit-overlay.open` (~656).
- Coordinador ya lee/escribe `Estado sectores` (~9226 / ~9799) como `[{id,nombre,estado}]`.

---

## Task 1: `STEPS_SECTORES` + navegación robusta + detección/hidratación en `openService`

**Files:** Modify `index.html` — agregar `STEPS_SECTORES` (tras `STEPS_RELEVAMIENTO`), `serviceState.sectores` en `resetServiceState`, cambiar los botones "atrás" de `renderStep` a navegación relativa, y en `openService` detectar sectores + hidratar + elegir STEPS.

**Interfaces:**
- Produces: `serviceState.sectores` = `[{id,nombre,estado}]`; `STEPS_SECTORES`; `servicioTieneSectores()` → bool.

- [ ] **Step 1: Definir `STEPS_SECTORES`.** Después de la definición de `STEPS_RELEVAMIENTO` (termina ~3118, antes de `let STEPS = STEPS_SERVICIO;`):

```javascript
// Flujo del operario cuando el servicio tiene SECTORES: igual al normal pero SIN los pasos
// de fotos globales (las fotos antes/después son por sector, dentro del hub). El checklist
// PRE (al llegar) y POST (al cierre) se mantienen, 1 vez por jornada.
const STEPS_SECTORES = [
  { id: 'inicio', label: 'INICIAR', icon: '▶' },
  { id: 'checklist_pre', label: 'PRE', icon: '✅' },
  { id: 'inicio_efectivo', label: 'INICIO EF.', icon: '🕐' },
  { id: 'ejecucion', label: 'SECTORES', icon: '🏢' },
  { id: 'cierre_efectivo', label: 'CIERRE EF.', icon: '⏹' },
  { id: 'checklist_post', label: 'POST', icon: '✅' },
  { id: 'observaciones', label: 'NOTAS', icon: '📝' },
  { id: 'cerrar', label: 'CERRAR', icon: '🏁' }
];
```

- [ ] **Step 2: Agregar `sectores: []` a `resetServiceState`.** En el objeto `serviceState = { ... }` (~3165), agregar como un campo más (después de `relevamiento: {...}` y antes de `clienteMapa`):

```javascript
    sectores: [],   // [{id, nombre, estado:'pendiente'|'en_curso'|'hecho'}] — solo si el servicio tiene sectores
```

- [ ] **Step 3: Helper `servicioTieneSectores()`.** Agregar cerca de `computeStepFromState` (después de su cierre, ~3345):

```javascript
function servicioTieneSectores() {
  return Array.isArray(serviceState.sectores) && serviceState.sectores.length > 0;
}
```

- [ ] **Step 4: Navegación relativa (retrocompat).** En `renderStep` los botones "atrás" usan índices absolutos que SIEMPRE equivalen a `currentStep - 1`. Cambiarlos a `goToStep(currentStep - 1)` desacopla la navegación del array de pasos sin cambiar el comportamiento actual. Reemplazar, en cada branch de `renderStep`, estos `onclick`:
  - `onclick="goToStep(0)"` (en `checklist_pre`) → `onclick="goToStep(currentStep - 1)"`
  - `onclick="goToStep(1)"` (en `fotos_antes`) → `onclick="goToStep(currentStep - 1)"`
  - `onclick="goToStep(3)"` (en `ejecucion`) → `onclick="goToStep(currentStep - 1)"`
  - `onclick="goToStep(5)"` (en `checklist_post`) → `onclick="goToStep(currentStep - 1)"`
  - `onclick="goToStep(6)"` (en `fotos_despues`) → `onclick="goToStep(currentStep - 1)"`
  - `onclick="goToStep(7)"` (en `observaciones`) → `onclick="goToStep(currentStep - 1)"`

  (No tocar `goToStep(idx)` en `renderStepNav` ni en ningún otro lado — solo estos 6 botones "atrás" del bottom-bar de `renderStep`.)

- [ ] **Step 5: Detectar + hidratar sectores + elegir STEPS en `openService`.** En `openService` (~6055), DESPUÉS de `hydrateServiceStateFromNotion(currentService);` y `hydrateServiceStateFromLocal(currentService.id);`, y ANTES del bloque que salta al paso (`if (serviceState.horaInicio) {...}`), insertar:

```javascript
  // Sectores: el coordinador los guardó en 'Estado sectores' como [{id,nombre,estado}].
  // El operario hereda esa lista; el estado de cada sector lo va actualizando. Si localStorage
  // tiene un estado más avanzado (reapertura), gana lo local (igual criterio que el checklist).
  try {
    const baseSec = JSON.parse(currentService.properties?.['Estado sectores']?.rich_text?.[0]?.plain_text || '[]');
    let localSec = [];
    try {
      const rawLs = localStorage.getItem(storageKeyForService(currentService.id));
      if (rawLs) localSec = JSON.parse(rawLs).state?.sectores || [];
    } catch (_) {}
    serviceState.sectores = (Array.isArray(baseSec) ? baseSec : []).map(s => {
      const ls = localSec.find(x => x.id === s.id);
      return { id: s.id, nombre: s.nombre, estado: (ls && ls.estado) || s.estado || 'pendiente' };
    });
  } catch (_) { serviceState.sectores = []; }
```

Y reemplazar la línea que elige STEPS (hoy: `STEPS = tipoReg.includes('Relevamiento') ? STEPS_RELEVAMIENTO : STEPS_SERVICIO;`, ~6062) por una que corra DESPUÉS de hidratar sectores. Es decir: dejar esa línea para Relevamiento, pero después del bloque de hidratación de sectores agregar:

```javascript
  // Si tiene sectores (y no es relevamiento), usar el flujo recortado por sectores.
  if (!tipoReg.includes('Relevamiento') && servicioTieneSectores()) STEPS = STEPS_SECTORES;
```

(Nota para el implementer: `tipoReg` ya está calculado arriba en `openService`. Mantener el `STEPS = ... Relevamiento ... : STEPS_SERVICIO` original; solo agregar el override por sectores DESPUÉS de hidratar `serviceState.sectores`, porque `servicioTieneSectores()` depende de esa hidratación.)

- [ ] **Step 6:** `cd ~/repos/flyclean-app && npm run check` → exit 0.
- [ ] **Step 7:** Commit: `feat(sectores-op): STEPS_SECTORES + nav relativa + hidratar serviceState.sectores en openService` (+ trailer).

---

## Task 2: El HUB de sectores (render del paso `ejecucion`) + % automático

**Files:** Modify `index.html` — el branch `ejecucion` de `renderStep`; helper `sectoresAvancePct`; i18n.

**Interfaces:**
- Consumes: `serviceState.sectores`, `servicioTieneSectores`, `t`, `esc`, `escAttrEdit`, `nextStep`, `goToStep`.
- Produces: `sectoresAvancePct()` → int 0-100; `openSectorOverlay(id)` (definida en Task 3 — en esta tarea el botón la llama aunque todavía no exista; el implementer la deja referenciada).

- [ ] **Step 1: Helper de avance.** Cerca de `servicioTieneSectores` (Task 1), agregar:

```javascript
function sectoresAvancePct() {
  const arr = serviceState.sectores || [];
  if (!arr.length) return 0;
  const hechos = arr.filter(s => s.estado === 'hecho').length;
  return Math.round((hechos / arr.length) * 100);
}
```

- [ ] **Step 2: Reemplazar el render del paso `ejecucion`.** El branch actual `else if (step.id === 'ejecucion') { ... }` (~6332) muestra una pantalla pasiva 🚁. Reemplazarlo por uno condicional: si hay sectores, el HUB; si no, lo de hoy.

```javascript
else if (step.id === 'ejecucion') {
  if (servicioTieneSectores()) {
    const arr = serviceState.sectores || [];
    const pct = sectoresAvancePct();
    const hechos = arr.filter(s => s.estado === 'hecho').length;
    const iconFor = e => e === 'hecho' ? '✅' : (e === 'en_curso' ? '🔵' : '⚪');
    content.innerHTML = `
      <div class="step-title">${t('step.sectores.title')}</div>
      <div class="step-sub">${t('step.sectores.sub')}</div>
      <div class="sectores-progress">
        <div class="sectores-progress-bar"><div class="sectores-progress-fill" style="width:${pct}%"></div></div>
        <div class="sectores-progress-label">${hechos} / ${arr.length} ${t('step.sectores.hechos')} · ${pct}%</div>
      </div>
      <div class="sectores-list">
        ${arr.map(s => `
          <button type="button" class="sector-row sector-${s.estado}" data-id="${escAttrEdit(s.id)}" onclick="openSectorOverlay(this.dataset.id)">
            <span class="sector-row-icon">${iconFor(s.estado)}</span>
            <span class="sector-row-name">${esc(s.nombre)}</span>
            <span class="sector-row-estado">${t('sector.estado.' + s.estado)}</span>
          </button>`).join('')}
      </div>
      <div style="height:20px"></div>
    `;
    bar.innerHTML = `
      <button class="btn-secondary" onclick="goToStep(currentStep - 1)">${t('btn.back')}</button>
      <button class="btn-main btn-orange" onclick="nextStep()">${t('step.ejec.continue')}</button>
    `;
  } else {
    content.innerHTML = `
      <div class="step-title">${t('step.ejec.title')}</div>
      <div class="step-sub">${t('step.ejec.sub')}</div>
      <div class="hint hint-green">${t('step.ejec.hint')}</div>
      ${serviceState.horaInicioEfectivo ? `<div class="ts-recorded"><div class="ts-label">${t('step.ejec.tsLabel')}</div><div class="ts-value">${serviceState.horaInicioEfectivo}</div></div>` : ''}
      <div style="text-align:center;padding:40px 0;font-size:64px">🚁</div>
    `;
    bar.innerHTML = `
      <button class="btn-secondary" onclick="goToStep(currentStep - 1)">${t('btn.back')}</button>
      <button class="btn-main btn-orange" onclick="nextStep()">${t('step.ejec.continue')}</button>
    `;
  }
}
```

- [ ] **Step 3: CSS del hub.** Agregar cerca del CSS de `.check-item` (~347) o `.photo-uploader` (~459):

```css
.sectores-progress { margin: 4px 0 16px; }
.sectores-progress-bar { height: 8px; background: var(--bg); border-radius: 4px; overflow: hidden; border: 1px solid var(--border); }
.sectores-progress-fill { height: 100%; background: var(--green); transition: width .3s; }
.sectores-progress-label { font-size: 12px; color: var(--text3); text-align: center; margin-top: 6px; font-weight: 600; }
.sectores-list { display: flex; flex-direction: column; gap: 8px; }
.sector-row { display: flex; align-items: center; gap: 12px; padding: 14px 14px; border-radius: var(--radius-sm); border: 1px solid var(--border2); background: var(--card); cursor: pointer; font-family: inherit; text-align: left; width: 100%; }
.sector-row:active { transform: scale(0.99); }
.sector-row-icon { font-size: 18px; flex-shrink: 0; }
.sector-row-name { flex: 1; font-size: 14px; font-weight: 600; color: var(--text2); }
.sector-row-estado { font-size: 11px; color: var(--text3); }
.sector-row.sector-hecho { border-color: var(--green); }
.sector-row.sector-en_curso { border-color: var(--amber, #f59e0b); }
```

- [ ] **Step 4: i18n (ambos bloques).** `es`:

```javascript
    'step.sectores.title': 'Sectores del trabajo',
    'step.sectores.sub': 'Tocá un sector para sacar las fotos y marcarlo hecho.',
    'step.sectores.hechos': 'sectores hechos',
    'sector.estado.pendiente': 'Pendiente',
    'sector.estado.en_curso': 'En curso',
    'sector.estado.hecho': 'Hecho',
```

`pt-BR`:

```javascript
    'step.sectores.title': 'Setores do trabalho',
    'step.sectores.sub': 'Toque num setor para tirar as fotos e marcá-lo como feito.',
    'step.sectores.hechos': 'setores feitos',
    'sector.estado.pendiente': 'Pendente',
    'sector.estado.en_curso': 'Em andamento',
    'sector.estado.hecho': 'Feito',
```

- [ ] **Step 5:** `npm run check` → exit 0. (El hub referencia `openSectorOverlay`, que se define en Task 3; como es un `onclick` string, no rompe el parse.)
- [ ] **Step 6:** Commit: `feat(sectores-op): hub de sectores en el paso Trabajo + % automático` (+ trailer).

---

## Task 3: `sector-overlay` (mini-flujo por sector) + fotos etiquetadas por sector

**Files:** Modify `index.html` — HTML del overlay (junto a los otros overlays, ~1462); estado + funciones del overlay; `uploadPhoto`/`handlePhotoSelect` aceptan `sectorId`; `renderSectorPhotoUploader`; `photosToNotionFiles` y `collect` con prefijo de sector; i18n.

**Interfaces:**
- Consumes: `serviceState.photos`, `uploadPhoto`, `removePhoto`, `retryPhoto`, `persistServiceState`, `esc`, `escAttrEdit`, `t`, `serviceState.sectores`, `sectoresAvancePct`, `renderStep`.
- Produces: `openSectorOverlay(id)`, `closeSectorOverlay()`, `sectorOverlayClick(e)`, `renderSectorOverlay()`, `marcarSectorHecho()`, `renderSectorPhotoUploader(sectorId, fotoType, minPhotos)`, `sectorFotos(sectorId, fotoType)`.

- [ ] **Step 1: HTML del overlay.** Inmediatamente después del cierre del `report-step-overlay` (`</div>` de ~1462), agregar:

```html
  <!-- Overlay: mini-flujo de un sector (fotos antes/después + marcar hecho) -->
  <div class="edit-overlay" id="sector-overlay" onclick="sectorOverlayClick(event)">
    <div class="edit-sheet" id="sector-sheet">
      <button class="sheet-close-btn" type="button" aria-label="Cerrar" onclick="closeSectorOverlay()">×</button>
      <div class="edit-sheet-handle"></div>
      <div class="edit-sheet-header">
        <div class="edit-sheet-title" id="sector-overlay-title">Sector</div>
        <div class="edit-sheet-sub" id="sector-overlay-sub"></div>
      </div>
      <div id="sector-overlay-body" style="padding:16px 20px 24px"></div>
    </div>
  </div>
```

- [ ] **Step 2: `uploadPhoto`/`handlePhotoSelect` aceptan `sectorId`.** Modificar las firmas para propagar un `sectorId` opcional al objeto foto (sin sectorId = comportamiento de hoy).

En `handlePhotoSelect(inputEl, fotoType)` (~3362) cambiar la firma a `handlePhotoSelect(inputEl, fotoType, sectorId)` y la llamada de upload a `files.map(file => uploadPhoto(file, fotoType, sectorId))`.

En `uploadPhoto(file, fotoType)` (~3373) cambiar la firma a `uploadPhoto(file, fotoType, sectorId)` y, en CADA punto donde hoy hace `serviceState.photos[fotoType].push({ id, fotoType, ... })` (los 3 push: error >10MB, error MIME, y el push principal del objeto `photo`), agregar `sectorId` al objeto. Para el objeto principal:

```javascript
  const photo = { id, fotoType, sectorId: sectorId || null, filename: file.name, contentType: mime, status: 'uploading', publicUrl: null, error: null, previewUrl };
```

(y `sectorId: sectorId || null` también en los dos objetos de error). El resto de `uploadPhoto` queda igual — al backend se le sigue mandando `fotoType` (`pre`/`post`), que ya acepta.

- [ ] **Step 3: `renderSectorPhotoUploader` + `sectorFotos`.** Agregar después de `renderPhotoUploader` (~3504):

```javascript
// Fotos de un sector (filtradas de serviceState.photos[fotoType] por sectorId).
function sectorFotos(sectorId, fotoType) {
  return (serviceState.photos?.[fotoType] || []).filter(p => p.sectorId === sectorId);
}

// Uploader de fotos para un sector: igual a renderPhotoUploader pero filtra por sectorId
// y el input pasa el sectorId al handler. id del input único por sector+fase.
function renderSectorPhotoUploader(sectorId, fotoType, minPhotos) {
  const photos = sectorFotos(sectorId, fotoType);
  const doneCount = photos.filter(p => p.status === 'done').length;
  const minLabel = minPhotos ? ` (mínimo ${minPhotos})` : '';
  const inputId = `photo-input-${fotoType}-${sectorId}`;
  return `
    <div class="photo-uploader">
      <input type="file" accept="image/*" capture="environment" multiple id="${inputId}" onchange="handlePhotoSelect(this, '${fotoType}', '${escAttrEdit(sectorId)}')" style="display:none">
      <button type="button" class="photo-add-btn" onclick="document.getElementById('${inputId}').click()">📷 ${t('photos.add')}</button>
      <div class="photo-count">${doneCount} ${doneCount === 1 ? t('photos.uploaded.one') : t('photos.uploaded.many')}${minLabel}</div>
      <div class="photo-grid">
        ${photos.map(p => `
          <div class="photo-thumb status-${p.status}">
            ${p.previewUrl || p.publicUrl ? `<img src="${p.previewUrl || p.publicUrl}" alt="">` : '<div class="photo-thumb-empty">📷</div>'}
            ${p.status === 'uploading' ? '<div class="photo-overlay"><div class="spinner-sm"></div></div>' : ''}
            ${p.status === 'done' ? '<div class="photo-badge photo-badge-ok">✓</div>' : ''}
            ${p.status === 'error' ? `<div class="photo-overlay photo-overlay-error" title="${p.error || ''}">⚠️<div class="photo-error-text">${p.error || 'Error'}</div></div>` : ''}
            ${p.status !== 'uploading' ? `<button type="button" class="photo-remove" onclick="removePhoto('${fotoType}','${p.id}')">×</button>` : ''}
            ${p.status === 'error' ? `<button type="button" class="photo-retry" onclick="retryPhoto('${fotoType}','${p.id}')">${t('photos.retry')}</button>` : ''}
          </div>
        `).join('')}
      </div>
    </div>
  `;
}
```

**Nota:** `removePhoto`/`retryPhoto`/`finalizePhotoUpload` operan por `photoId` único — funcionan igual para fotos con sectorId, sin cambios. Pero como el overlay del sector tiene su propio render, hay que re-renderizarlo cuando cambian sus fotos. Para eso: en `uploadPhoto`/`removePhoto`/`finalizePhotoUpload`, donde hoy llaman `renderStep()`, agregar también un refresco del overlay si está abierto. Implementar un helper y llamarlo:

```javascript
function refreshSectorOverlayIfOpen() {
  const ov = document.getElementById('sector-overlay');
  if (ov && ov.classList.contains('open')) renderSectorOverlay();
}
```

Y en `uploadPhoto` (donde hace `renderStep()` tras el push inicial), en `removePhoto` (tras filtrar), y en `finalizePhotoUpload` (en la rama `currentService?.id === targetServiceId`, tras `renderStep()`), agregar `refreshSectorOverlayIfOpen();`.

- [ ] **Step 4: Estado + funciones del overlay.** Agregar junto a las otras funciones de overlay (p. ej. después de `closeReportStep`/`reportStepOverlayClick`, ~9984; o al final del bloque de funciones del operario). Variable global de estado:

```javascript
let sectorOverlayState = null; // { sectorId }
```

```javascript
function openSectorOverlay(id) {
  const sec = (serviceState.sectores || []).find(s => s.id === id);
  if (!sec) return;
  sectorOverlayState = { sectorId: id };
  // Al abrir, si estaba pendiente pasa a "en curso".
  if (sec.estado === 'pendiente') { sec.estado = 'en_curso'; persistServiceState(); }
  document.getElementById('sector-overlay').classList.add('open');
  renderSectorOverlay();
}

function renderSectorOverlay() {
  const st = sectorOverlayState;
  if (!st) return;
  const sec = (serviceState.sectores || []).find(s => s.id === st.sectorId);
  if (!sec) { closeSectorOverlay(); return; }
  document.getElementById('sector-overlay-title').textContent = '🏢 ' + sec.nombre;
  document.getElementById('sector-overlay-sub').textContent = t('sector.overlay.sub');
  const preOk = sectorFotos(sec.id, 'pre').filter(p => p.status === 'done').length;
  const postOk = sectorFotos(sec.id, 'post').filter(p => p.status === 'done').length;
  const puedeCerrar = preOk >= 1 && postOk >= 1;
  document.getElementById('sector-overlay-body').innerHTML = `
    <div class="form-label">${t('sector.fotos.antes')}</div>
    ${renderSectorPhotoUploader(sec.id, 'pre', 1)}
    <div class="form-label" style="margin-top:8px">${t('sector.fotos.despues')}</div>
    ${renderSectorPhotoUploader(sec.id, 'post', 1)}
    <button class="btn-main btn-green" style="width:100%;margin-top:8px${puedeCerrar ? '' : ';opacity:.5'}" ${puedeCerrar ? '' : 'disabled'} onclick="marcarSectorHecho()">${t('sector.marcar.hecho')}</button>
    ${puedeCerrar ? '' : `<div style="font-size:11px;color:var(--text3);text-align:center;margin-top:6px">${t('sector.fotos.min')}</div>`}
  `;
}

function marcarSectorHecho() {
  const st = sectorOverlayState;
  if (!st) return;
  const sec = (serviceState.sectores || []).find(s => s.id === st.sectorId);
  if (!sec) return;
  const preOk = sectorFotos(sec.id, 'pre').filter(p => p.status === 'done').length;
  const postOk = sectorFotos(sec.id, 'post').filter(p => p.status === 'done').length;
  if (preOk < 1 || postOk < 1) { alert(t('sector.fotos.min')); return; }
  sec.estado = 'hecho';
  persistServiceState();
  closeSectorOverlay();
  renderStep(); // refresca el hub (estado + %)
}

function closeSectorOverlay() {
  const ov = document.getElementById('sector-overlay');
  if (ov) ov.classList.remove('open');
  sectorOverlayState = null;
}

function sectorOverlayClick(e) { if (e.target.id === 'sector-overlay') closeSectorOverlay(); }
```

- [ ] **Step 5: Fotos por sector → Notion con prefijo.** En `photosToNotionFiles(arr, baseName)` (~6763), prefijar el `name` con el sectorId cuando la foto lo tenga:

```javascript
function photosToNotionFiles(arr, baseName) {
  return (arr || [])
    .filter(p => p.status === 'done' && p.publicUrl)
    .map((p, i) => ({
      type: 'external',
      name: `${p.sectorId ? p.sectorId + '__' : ''}${baseName}-${i + 1}.${(p.filename?.split('.').pop() || 'jpg').toLowerCase()}`,
      external: { url: p.publicUrl }
    }));
}
```

Y en el `collect` interno de `hydrateServiceStateFromNotion` (~3283), recuperar el `sectorId` del prefijo del `name`:

```javascript
  const collect = prop => (prop?.files || [])
    .map(f => {
      const nm = f.name || 'foto.jpg';
      const sectorId = nm.includes('__') ? nm.split('__')[0] : null;
      return {
        id: 'notion-' + Math.random().toString(36).slice(2, 9),
        sectorId,
        filename: nm,
        status: 'done',
        publicUrl: f.external?.url || f.file?.url || null,
        previewUrl: f.external?.url || f.file?.url || null
      };
    })
    .filter(f => f.publicUrl);
```

(Así, al reabrir un servicio, las fotos vuelven con su `sectorId` y el overlay las muestra en el sector correcto.)

- [ ] **Step 6: i18n (ambos bloques).** `es`:

```javascript
    'sector.overlay.sub': 'Sacá las fotos de este sector y marcalo hecho.',
    'sector.fotos.antes': '📸 Fotos ANTES de este sector',
    'sector.fotos.despues': '📸 Fotos DESPUÉS de este sector',
    'sector.marcar.hecho': '✅ Marcar sector hecho',
    'sector.fotos.min': 'Sacá al menos 1 foto antes y 1 después para marcar el sector hecho.',
```

`pt-BR`:

```javascript
    'sector.overlay.sub': 'Tire as fotos deste setor e marque-o como feito.',
    'sector.fotos.antes': '📸 Fotos ANTES deste setor',
    'sector.fotos.despues': '📸 Fotos DEPOIS deste setor',
    'sector.marcar.hecho': '✅ Marcar setor como feito',
    'sector.fotos.min': 'Tire pelo menos 1 foto antes e 1 depois para marcar o setor como feito.',
```

- [ ] **Step 7:** `npm run check` → exit 0.
- [ ] **Step 8:** Commit: `feat(sectores-op): overlay del sector (fotos antes/después + marcar hecho) + fotos etiquetadas por sector` (+ trailer).

---

## Task 4: Persistir `Estado sectores` desde el operario + cerrar con sectores + % automático

**Files:** Modify `index.html` — `buildIncrementalProps`, `cerrarServicio`, el branch `observaciones` de `renderStep`; i18n.

**Interfaces:**
- Consumes: `serviceState.sectores`, `servicioTieneSectores`, `sectoresAvancePct`.

- [ ] **Step 1: Auto-save escribe `Estado sectores`.** En `buildIncrementalProps(s)` (~3215), antes del `return properties;`, agregar:

```javascript
  // Sectores: el operario actualiza el estado de cada sector (en_curso/hecho). Preserva id+nombre
  // (los puso el coordinador), solo cambia 'estado'. Se escribe la lista completa que se hidrató al abrir.
  if (Array.isArray(s.sectores) && s.sectores.length) {
    const secs = s.sectores.map(x => ({ id: x.id, nombre: String(x.nombre || '').trim(), estado: x.estado || 'pendiente' })).filter(x => x.nombre);
    properties['Estado sectores'] = { rich_text: secs.length ? [{ text: { content: JSON.stringify(secs) } }] : [] };
  }
```

- [ ] **Step 2: `cerrarServicio` con sectores: % automático + escribir Estado sectores.** En `cerrarServicio()` (~6773):

(a) Reemplazar el bloque del `% de avance` (hoy ~6829: `if (((jornadaN != null) || tipoReg.includes('Jornada')) && serviceState.avance !== '') { properties['% de avance'] = { number: parseFloat(serviceState.avance) }; }`) por uno que, si hay sectores, use el % automático:

```javascript
  if (servicioTieneSectores()) {
    properties['% de avance'] = { number: sectoresAvancePct() };
    const secs = serviceState.sectores.map(x => ({ id: x.id, nombre: String(x.nombre || '').trim(), estado: x.estado || 'pendiente' })).filter(x => x.nombre);
    properties['Estado sectores'] = { rich_text: secs.length ? [{ text: { content: JSON.stringify(secs) } }] : [] };
  } else if (((jornadaN != null) || tipoReg.includes('Jornada')) && serviceState.avance !== '') {
    properties['% de avance'] = { number: parseFloat(serviceState.avance) };
  }
```

(Nota: en Fase 2 el cierre sigue marcando `Estado='✅ Completado'` como hoy aunque queden sectores pendientes. La continuidad real entre jornadas — reprogramar en vez de completar — es Fase 3.)

- [ ] **Step 3: `observaciones`: % automático cuando hay sectores.** En el branch `observaciones` de `renderStep` (~6400), el campo de `% de avance` hoy se muestra si `isJornada` y es un `<input number>` manual. Cambiar para que, cuando hay sectores, muestre el % automático en modo lectura (no editable). Reemplazar el cálculo `const isJornada = ...` por:

```javascript
  const isJornada = (jornadaN != null) || tipoReg.includes('Jornada');
  const conSectores = servicioTieneSectores();
```

y reemplazar el bloque `${isJornada ? \`...input avance...\` : ''}` por:

```javascript
    ${conSectores ? `
    <div class="field-group">
      <div class="form-label">${t('step.obs.avance.label')}</div>
      <div class="hint hint-blue" style="margin-bottom:6px">${t('step.obs.avance.auto')}</div>
      <div style="font-size:24px;font-weight:800;text-align:center;color:var(--green)">${sectoresAvancePct()}%</div>
      <div style="font-size:12px;color:var(--text3);text-align:center;margin-top:4px">${serviceState.sectores.filter(s=>s.estado==='hecho').length} / ${serviceState.sectores.length} ${t('step.sectores.hechos')}</div>
    </div>
    ` : (isJornada ? `
    <div class="field-group">
      <div class="form-label">${t('step.obs.avance.label')}</div>
      <div class="hint hint-blue" style="margin-bottom:10px">${t('step.obs.avance.hint')}</div>
      <input type="number" min="0" max="100" placeholder="${t('step.obs.avance.placeholder')}" id="avance-input" value="${serviceState.avance}" oninput="serviceState.avance=this.value; persistServiceStateToLocal();" style="font-size:18px;text-align:center;font-weight:700"/>
      <div style="font-size:12px;color:var(--text3);text-align:center;margin-top:6px">${t('step.obs.avance.note')}</div>
    </div>
    ` : '')}
```

- [ ] **Step 4: i18n (ambos bloques).** `es`: `'step.obs.avance.auto': 'Se calcula solo según los sectores marcados como hechos.'` · `pt-BR`: `'step.obs.avance.auto': 'É calculado automaticamente pelos setores marcados como feitos.'`

- [ ] **Step 5:** `npm run check` → exit 0.
- [ ] **Step 6:** Commit: `feat(sectores-op): persistir Estado sectores desde el operario + % automático en notas y cierre` (+ trailer).

---

## Task 5: Docs + bump del service worker

**Files:** Modify `sw.js` (bump `CACHE` v90 → v91), `docs/NOTION.md`, `docs/FUNCIONALIDADES.md`.

- [ ] **Step 1:** En `sw.js`, subir `const CACHE = 'flyclean-v90'` a `'flyclean-v91'` y agregar un comentario `// v91: Fase 2 sectores — operario trabaja por sector (hub + fotos antes/después + % automático).` Localizar: `grep -n "flyclean-v" sw.js | head -1`.
- [ ] **Step 2:** En `docs/NOTION.md`, en la fila de `Estado sectores`, anotar que el operario actualiza el `estado` de cada sector (pendiente→en_curso→hecho) y que las fotos por sector van en `📸 Fotos pre/post-servicio` con `name` prefijado `sectorId__`.
- [ ] **Step 3:** En `docs/FUNCIONALIDADES.md`, actualizar la nota de versión a sw v91 y anotar la operativa del operario por sector (Fase 2).
- [ ] **Step 4:** `npm run check` → exit 0.
- [ ] **Step 5:** Commit: `docs(sectores): bump sw v91 + operativa del operario por sector (Fase 2)` (+ trailer).

---

## Verificación de Diego (post-deploy)

1. Crear un servicio para un cliente con sectores; asignarte como piloto/operario.
2. Abrir el servicio en la app del operario: el paso "Trabajo" muestra la **lista de sectores** con el % en 0.
3. Entrar a un sector → sacar 1 foto antes + 1 después → "marcar hecho" → vuelve al hub, el sector queda ✅ y el % sube.
4. Verificar que un servicio **sin sectores** funciona igual que siempre (los pasos de fotos globales aparecen).
5. Cerrar el servicio y confirmar en Notion: `% de avance` automático + `Estado sectores` con los estados + fotos con el `name` prefijado por sector.

## Riesgos / notas

- **Mayor riesgo = retrocompat del wizard.** La navegación pasó a relativa (`currentStep-1`), que para `STEPS_SERVICIO` es idéntica a los índices de hoy. Un servicio sin sectores nunca entra a las ramas nuevas. Verificar explícitamente el flujo normal.
- **Edición concurrente coordinador↔operario de `Estado sectores`:** el operario escribe la lista que hidrató al abrir. Si el coordinador edita los sectores mientras el operario trabaja (raro), podría perderse esa edición del coordinador. Follow-up posible (re-merge en el cierre); no se aborda en v2.
- **Fase 3 (jornadas Forma 2)** se construye después: reprogramar el servicio al cerrar incompleto, `Registro jornadas`, "completado del todo" cuando todos los sectores están hechos.
