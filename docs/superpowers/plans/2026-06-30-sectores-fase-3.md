# Sectores — Fase 3 (jornadas Forma 2) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Que un servicio con sectores que no se termina en el día **se reprograme solo para otro día** (en vez de completarse y desaparecer), guardando el parte por día, hasta que todos los sectores estén hechos → "completado del todo".

**Architecture:** Todo en `index.html`. Al cerrar un servicio CON sectores, si están todos hechos se completa como hoy; si faltan, un modal deja elegir "seguir otro día" (reprograma: Estado→`🔄 Asignado`, Fecha→mañana, limpia horas efectivas) o "cerrar así" (completa con lo hecho). Cada cierre agrega una entrada al `Registro jornadas` (parte por día: fecha + horas + sectores hechos ese día) para costos. Un badge "🔄 Continúa · X/Y" en las cards distingue los servicios que siguen en otra jornada.

**Tech Stack:** HTML/CSS/JS vanilla; Notion API vía `queueableUpdateServiceProps`; i18n `TRANSLATIONS` (es + pt-BR).

## Global Constraints

- **Un solo archivo de frontend:** todo en `index.html`. No tocar backend.
- **Retrocompatibilidad del cierre (paramount):** un servicio **sin sectores** debe cerrarse EXACTArmente como hoy (Estado→`✅ Completado`, `Hora Fin`=ahora, misma validación de resultado). Toda la lógica nueva está detrás de `servicioTieneSectores()`.
- **Estado de continuación = `🔄 Asignado`** (decisión de Diego): mantiene el servicio visible para el operario (su filtro `getMyServices` acepta `📋 Pendiente`/`🔄 Asignado`/`✈️ En curso`) y para el coordinador (columna "Asignado"). NO se crea un estado nuevo en Notion.
- **i18n obligatorio en los DOS bloques** (`es` y `pt-BR`): cada string visible nueva como key vía `t('key')`.
- **Escapado:** `esc(...)` en `innerHTML`, `escAttrEdit(...)` en atributos.
- **`Registro jornadas`** (rich_text, YA creada en Notion Servicios ds `2fbc8a03-5c4f-445c-8516-71dd9b2eea78`): JSON `[{fecha, ini, fin, hechos:[ids]}]`. Se hace **read-append-write** (no pisar jornadas anteriores).
- **Sin suite de tests unitarios.** Verificación de cada tarea = `cd ~/repos/flyclean-app && npm run check` en verde. Verificación funcional/visual la hace Diego. NO inventar tests.
- **Commits** en `feat/sectores-fase3`, uno por tarea, cerrando con:
  `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`
- **Spec:** `docs/superpowers/specs/2026-06-30-sectores-design.md` (§ Fase 3). Fase 2 (operativa por sector) ya está en producción (v91).

## Referencias existentes (NO redefinir)

- `serviceState`/`resetServiceState()` (~3165). `serviceState.sectores` = `[{id,nombre,estado}]`, `servicioTieneSectores()`, `sectoresAvancePct()` existen (Fase 2).
- `openService(idx)` (~6187): hidrata `serviceState.sectores` (merge Notion+localStorage, ~6204-6215).
- `cerrarServicio()` (~6960): valida fotos+resultado, construye `properties` (hoy Estado siempre `✅ Completado`), guarda con `queueableUpdateServiceProps`, `showDoneScreen()`.
- `isoNow()` (hora ISO actual). `storageKeyForService(id)`. Overlay pattern: `report-step-overlay` (~1452) + `.edit-overlay`/`.open` CSS (~656). Cálculo "mañana": `const t = new Date(); t.setDate(t.getDate()+1); t.toISOString().split('T')[0]` (visto en `openCreateJornadaSheet`).
- Filtro operario `getMyServices` (~3715): acepta `['📋 Pendiente','🔄 Asignado','✈️ En curso']`. Coord kanban `renderCoordKanban` (~8715): columna por `Estado`.

---

## Task 1: Snapshot `sectoresAlAbrir` + hidratar `registroJornadas`

**Files:** Modify `index.html` — `resetServiceState`, `openService`.

**Interfaces:**
- Produces: `serviceState.sectoresAlAbrir` (snapshot `[{id,estado}]` al abrir), `serviceState.registroJornadas` (array del parte por día).

- [ ] **Step 1: Agregar campos a `resetServiceState`.** En el objeto `serviceState = {...}` (~3165), junto a `sectores: []` (agregado en Fase 2), agregar:

```javascript
    sectoresAlAbrir: [],   // snapshot [{id,estado}] al abrir — para saber qué sectores se hicieron HOY (parte por día)
    registroJornadas: [],  // parte por día [{fecha,ini,fin,hechos:[ids]}] — read-append-write en el cierre
```

- [ ] **Step 2: Poblarlos en `openService`.** Justo DESPUÉS del bloque que hidrata `serviceState.sectores` (el `try { const baseSec = JSON.parse(...); ... } catch (_) { serviceState.sectores = []; }`, ~6215), agregar:

```javascript
  // Snapshot de los sectores al abrir (para el parte por día: qué se completó HOY vs jornadas anteriores).
  serviceState.sectoresAlAbrir = (serviceState.sectores || []).map(s => ({ id: s.id, estado: s.estado }));
  // Parte por día acumulado (jornadas anteriores).
  try {
    serviceState.registroJornadas = JSON.parse(currentService.properties?.['Registro jornadas']?.rich_text?.[0]?.plain_text || '[]');
    if (!Array.isArray(serviceState.registroJornadas)) serviceState.registroJornadas = [];
  } catch (_) { serviceState.registroJornadas = []; }
```

- [ ] **Step 3:** `cd ~/repos/flyclean-app && npm run check` → exit 0.
- [ ] **Step 4:** Commit: `feat(jornadas): snapshot sectoresAlAbrir + hidratar registroJornadas en openService` (+ trailer).

---

## Task 2: Cierre con reprogramación (modal de decisión + `_ejecutarCierre`)

Refactor de `cerrarServicio`: separar la validación/decisión de la ejecución. Cuando hay sectores pendientes, un modal deja elegir continuar o cerrar. Es el corazón de la Fase 3.

**Files:** Modify `index.html` — `cerrarServicio` (~6960), agregar `_ejecutarCierre`, el modal (HTML + funciones), i18n.

**Interfaces:**
- Consumes: `serviceState.sectores/sectoresAlAbrir/registroJornadas`, `servicioTieneSectores`, `sectoresAvancePct`, `isoNow`, `photosToNotionFiles`, `queueableUpdateServiceProps`, `showDoneScreen`, `t`.
- Produces: `_ejecutarCierre(modo)` (`modo`: `'completar'` | `'continuar'`), `openCierreSectoresModal(pendientes)`, `cierreSectoresElegir(modo)`, `closeCierreSectoresModal()`, `cierreSectoresOverlayClick(e)`.

- [ ] **Step 1: Reescribir `cerrarServicio()`** (~6960). Mantiene la validación de fotos; deriva la validación de resultado + la construcción de properties. Reemplazar la función entera por:

```javascript
async function cerrarServicio() {
  // Bloquear si hay fotos en upload todavía
  const allPhotos = [
    ...(serviceState.photos?.pre || []),
    ...(serviceState.photos?.post || []),
    ...(serviceState.photos?.relevamiento || [])
  ];
  if (allPhotos.filter(p => p.status === 'uploading').length > 0) { alert(t('photos.wait.uploading')); return; }

  // Si tiene sectores y NO están todos hechos → dejar elegir (seguir otro día / cerrar así). No cerrar aún.
  if (servicioTieneSectores() && !serviceState.sectores.every(s => s.estado === 'hecho')) {
    const pend = serviceState.sectores.filter(s => s.estado !== 'hecho').length;
    openCierreSectoresModal(pend);
    return;
  }
  // Sin sectores, o todos los sectores hechos → completar (valida resultado como hoy).
  if (!_cierreResultadoOk()) return;
  await _ejecutarCierre('completar');
}

// Validación de resultado obligatorio (Órdenes/Jornadas usan 'Resultado'; Pruebas 'Resultado prueba'; Relevamientos no).
function _cierreResultadoOk() {
  const tipoReg = currentService?.properties?.['Tipo de registro']?.select?.name || '';
  if (tipoReg.includes('Relevamiento')) return true;
  const isPrueba = tipoReg.includes('Prueba');
  const valor = isPrueba ? serviceState.resultadoPrueba : serviceState.resultado;
  if (!valor) { alert(t(isPrueba ? 'close.prueba.need.resultado' : 'close.need.resultado')); return false; }
  return true;
}
```

- [ ] **Step 2: Agregar `_ejecutarCierre(modo)`** justo después de `cerrarServicio`. Contiene la construcción de properties (copiada del cierre viejo) + la bifurcación completar/continuar para servicios con sectores.

```javascript
// modo: 'completar' (Estado → ✅ Completado) | 'continuar' (reprograma a mañana como 🔄 Asignado).
async function _ejecutarCierre(modo) {
  const tipoReg = currentService?.properties?.['Tipo de registro']?.select?.name || '';
  const isPrueba = tipoReg.includes('Prueba');
  const jornadaN = currentService?.properties?.['Jornada N°']?.number;
  const conSectores = servicioTieneSectores();

  const btn = document.querySelector('.btn-red');
  if (btn) { btn.textContent = t('btn.saving.notion'); btn.disabled = true; }

  const properties = {};

  // ── Estado + fechas + parte por día ──
  if (conSectores) {
    properties['% de avance'] = { number: sectoresAvancePct() };
    const secs = serviceState.sectores.map(x => ({ id: x.id, nombre: String(x.nombre || '').trim(), estado: x.estado || 'pendiente' })).filter(x => x.nombre);
    properties['Estado sectores'] = { rich_text: secs.length ? [{ text: { content: JSON.stringify(secs) } }] : [] };

    // Parte del día: sectores que pasaron a 'hecho' HOY (vs snapshot al abrir).
    const antes = new Map((serviceState.sectoresAlAbrir || []).map(s => [s.id, s.estado]));
    const hechosHoy = serviceState.sectores.filter(s => s.estado === 'hecho' && antes.get(s.id) !== 'hecho').map(s => s.id);
    const hoy = new Date().toISOString().split('T')[0];
    const reg = Array.isArray(serviceState.registroJornadas) ? serviceState.registroJornadas.slice() : [];
    reg.push({ fecha: hoy, ini: serviceState.horaInicioEfectivo || '', fin: serviceState.horaCierreEfectivo || '', hechos: hechosHoy });
    properties['Registro jornadas'] = { rich_text: [{ text: { content: JSON.stringify(reg) } }] };

    if (modo === 'continuar') {
      // Reprogramar: sigue visible (Asignado), fecha mañana (tentativa, el coord ajusta), horas efectivas limpias para el día siguiente.
      const man = new Date(); man.setDate(man.getDate() + 1);
      properties['Estado'] = { select: { name: '🔄 Asignado' } };
      properties['Fecha programada'] = { date: { start: man.toISOString().split('T')[0] } };
      properties['Hora Inicio Efectivo'] = { date: null };
      properties['Hora Fin Efectivo'] = { date: null };
      properties['Hora Fin'] = { date: null };
    } else {
      properties['Estado'] = { select: { name: '✅ Completado' } };
      properties['Hora Fin'] = { date: { start: isoNow() } };
    }
  } else {
    // Sin sectores: comportamiento de siempre.
    properties['Estado'] = { select: { name: '✅ Completado' } };
    properties['Hora Fin'] = { date: { start: isoNow() } };
    if (((jornadaN != null) || tipoReg.includes('Jornada')) && serviceState.avance !== '') {
      properties['% de avance'] = { number: parseFloat(serviceState.avance) };
    }
  }

  // ── Campos comunes (igual que el cierre de siempre) ──
  if (serviceState.notasPost) properties['Notas post-servicio'] = { rich_text: [{ text: { content: serviceState.notasPost } }] };
  if (isPrueba) { if (serviceState.resultadoPrueba) properties['Resultado prueba'] = { select: { name: serviceState.resultadoPrueba } }; }
  else if (serviceState.resultado) properties['Resultado'] = { select: { name: serviceState.resultado } };
  const climaArr = Array.isArray(serviceState.clima) ? serviceState.clima : (serviceState.clima ? [serviceState.clima] : []);
  if (climaArr.length) properties['Condición climática'] = { multi_select: climaArr.map(name => ({ name })) };
  if (serviceState.metodoTrabajo) {
    properties['Método de trabajo'] = { select: { name: serviceState.metodoTrabajo } };
    if (serviceState.metodoTrabajo === '💪 Manual' && serviceState.herramientaManual) properties['Herramienta manual'] = { select: { name: serviceState.herramientaManual } };
  }
  const preFiles = photosToNotionFiles(serviceState.photos?.pre, 'pre');
  const postFiles = photosToNotionFiles(serviceState.photos?.post, 'post');
  const relevFiles = photosToNotionFiles(serviceState.photos?.relevamiento, 'relev');
  if (preFiles.length) properties['📸 Fotos pre-servicio'] = { files: preFiles };
  if (postFiles.length) properties['📸 Fotos post-servicio'] = { files: postFiles };
  if (relevFiles.length) properties['📸 Fotos relevamiento'] = { files: relevFiles };
  const _ckClose = { pre: serviceState.checklistPre || {}, post: serviceState.checklistPost || {} };
  if (Object.keys(_ckClose.pre).length || Object.keys(_ckClose.post).length) properties['Estado checklist'] = { rich_text: [{ text: { content: JSON.stringify(_ckClose) } }] };
  if (tipoReg.includes('Relevamiento')) {
    const r = serviceState.relevamiento || {};
    if (r.m2 !== '' && r.m2 != null) { const n = parseFloat(r.m2); if (!isNaN(n)) properties['m² aproximados'] = { number: n }; }
    if (r.altura !== '' && r.altura != null) { const n = parseFloat(r.altura); if (!isNaN(n)) properties['Altura / Pisos'] = { number: n }; }
    if (Array.isArray(r.dificultades) && r.dificultades.length) properties['Dificultad de acceso'] = { multi_select: r.dificultades.map(d => ({ name: d })) };
    if (Array.isArray(r.servicioSugerido) && r.servicioSugerido.length) properties['Servicio sugerido'] = { multi_select: r.servicioSugerido.map(s => ({ name: s })) };
    if (r.notasComercial) properties['Notas pre-servicio'] = { rich_text: [{ text: { content: r.notasComercial } }] };
  }

  try {
    const result = await queueableUpdateServiceProps(currentService.id, properties);
    if (!result?.queued) { try { localStorage.removeItem(storageKeyForService(currentService.id)); } catch (_) {} }
    showDoneScreen(modo === 'continuar');
  } catch (e) {
    if (btn) { btn.textContent = t('btn.close.notion'); btn.disabled = false; }
    alert(t('sheet.alert.save.error'));
  }
}
```

- [ ] **Step 3: `showDoneScreen` acepta un flag "continúa".** Localizar `function showDoneScreen(` (grep). Si hoy no recibe argumentos, ampliarla a `showDoneScreen(continua)` y, cuando `continua === true`, mostrar el título/subtítulo de "reprogramado" en vez de "completado" — usando las keys i18n nuevas (`done.continua.title`/`done.continua.sub`). Si el cuerpo actual usa keys fijas de "completado", envolver en un ternario `continua ? t('done.continua.title') : t('done.title.actual')`. (El implementer debe leer la función real y adaptarla mínimamente; no cambiar su estructura.)

- [ ] **Step 4: Modal de decisión (HTML).** Agregar, junto a los otros overlays (después de `sector-overlay`, que agregó Fase 2):

```html
  <!-- Modal: al cerrar con sectores pendientes, elegir seguir otro día o cerrar así -->
  <div class="edit-overlay" id="cierre-sectores-overlay" onclick="cierreSectoresOverlayClick(event)">
    <div class="edit-sheet" id="cierre-sectores-sheet">
      <button class="sheet-close-btn" type="button" aria-label="Cerrar" onclick="closeCierreSectoresModal()">×</button>
      <div class="edit-sheet-handle"></div>
      <div class="edit-sheet-header">
        <div class="edit-sheet-title" data-i18n="cierre.sectores.title">Quedan sectores sin hacer</div>
        <div class="edit-sheet-sub" id="cierre-sectores-sub"></div>
      </div>
      <div style="padding:16px 20px 24px;display:flex;flex-direction:column;gap:10px">
        <button class="btn-main btn-orange" style="width:100%" onclick="cierreSectoresElegir('continuar')" data-i18n="cierre.sectores.continuar">🔄 Sigo otro día</button>
        <button class="btn-main btn-green" style="width:100%" onclick="cierreSectoresElegir('completar')" data-i18n="cierre.sectores.completar">✅ Ya está, cerrar así</button>
        <button class="btn-secondary" style="width:100%" onclick="closeCierreSectoresModal()" data-i18n="btn.cancel">Cancelar</button>
      </div>
    </div>
  </div>
```

- [ ] **Step 5: Funciones del modal.** Agregar junto a las otras funciones de overlay:

```javascript
function openCierreSectoresModal(pendientes) {
  const sub = document.getElementById('cierre-sectores-sub');
  if (sub) sub.textContent = t('cierre.sectores.sub').replace('{n}', pendientes);
  document.getElementById('cierre-sectores-overlay').classList.add('open');
}
function closeCierreSectoresModal() {
  document.getElementById('cierre-sectores-overlay').classList.remove('open');
}
function cierreSectoresOverlayClick(e) { if (e.target.id === 'cierre-sectores-overlay') closeCierreSectoresModal(); }
async function cierreSectoresElegir(modo) {
  // 'completar' exige resultado (el servicio termina); 'continuar' no (sigue otro día).
  if (modo === 'completar' && !_cierreResultadoOk()) return;
  closeCierreSectoresModal();
  await _ejecutarCierre(modo);
}
```

- [ ] **Step 6: i18n (ambos bloques).** `es`:

```javascript
    'cierre.sectores.title': 'Quedan sectores sin hacer',
    'cierre.sectores.sub': 'Faltan {n} sectores. ¿Seguís otro día o ya está?',
    'cierre.sectores.continuar': '🔄 Sigo otro día',
    'cierre.sectores.completar': '✅ Ya está, cerrar así',
    'btn.cancel': 'Cancelar',
    'done.continua.title': 'Guardado ✅',
    'done.continua.sub': 'El servicio sigue mañana con los sectores que faltan.',
```

`pt-BR`:

```javascript
    'cierre.sectores.title': 'Faltam setores por fazer',
    'cierre.sectores.sub': 'Faltam {n} setores. Continua outro dia ou já está?',
    'cierre.sectores.continuar': '🔄 Continuo outro dia',
    'cierre.sectores.completar': '✅ Já está, encerrar assim',
    'btn.cancel': 'Cancelar',
    'done.continua.title': 'Salvo ✅',
    'done.continua.sub': 'O serviço continua amanhã com os setores que faltam.',
```

(Si `btn.cancel` ya existe como key, no duplicar — reusar la existente. Verificar con grep antes de agregar.)

- [ ] **Step 7:** `npm run check` → exit 0.
- [ ] **Step 8:** Commit: `feat(jornadas): cerrar servicio con sectores → elegir seguir otro día (reprograma) o cerrar así` (+ trailer).

---

## Task 3: Badge "🔄 Continúa · X/Y" en las cards (coord + operario)

Para que un servicio reprogramado se distinga de uno recién asignado, un badge cuando tiene jornadas registradas y sectores sin terminar.

**Files:** Modify `index.html` — helper `servicioContinua`; las funciones que renderizan las cards del coordinador y del operario; i18n.

**Interfaces:**
- Produces: `servicioContinua(svc)` → `{continua:bool, hechos:int, total:int}`.

- [ ] **Step 1: Helper `servicioContinua`.** Agregar cerca de `servicioTieneSectores`:

```javascript
// Un servicio "continúa" en otra jornada si tiene sectores, no están todos hechos, y ya se registró al menos una jornada.
function servicioContinua(svc) {
  const p = svc?.properties || {};
  let sectores = []; let reg = [];
  try { sectores = JSON.parse(p['Estado sectores']?.rich_text?.[0]?.plain_text || '[]'); } catch (_) {}
  try { reg = JSON.parse(p['Registro jornadas']?.rich_text?.[0]?.plain_text || '[]'); } catch (_) {}
  const total = Array.isArray(sectores) ? sectores.length : 0;
  const hechos = Array.isArray(sectores) ? sectores.filter(s => s.estado === 'hecho').length : 0;
  const continua = total > 0 && hechos < total && Array.isArray(reg) && reg.length > 0;
  return { continua, hechos, total };
}
```

- [ ] **Step 2: Badge en la card del coordinador.** Ubicar con grep la función que renderiza cada card de servicio en el coord (buscar dónde se arman los "coord-tag"/badges de una card de servicio, p. ej. el badge `🧪 PRUEBA` o `👤 Piloto` — `grep -n "coord-tag\|🧪 PRUEBA\|Piloto" index.html`). En el punto donde se concatenan los badges/tags de la card, insertar (usando el svc de esa card):

```javascript
`${(() => { const c = servicioContinua(svc); return c.continua ? `<span class="coord-tag" style="background:var(--amber-dark,#7c5300);color:var(--amber,#f59e0b)">${t('badge.continua').replace('{h}', c.hechos).replace('{t}', c.total)}</span>` : ''; })()}`
```

(Adaptar `svc` al nombre real de la variable de la card en esa función.)

- [ ] **Step 3: Badge en la card del operario.** Ubicar con grep la función que renderiza las cards de "Mis servicios" del operario (la que lista los resultados de `getMyServices`). Insertar el mismo badge junto a los datos de la card (piloto/fecha/lugar). Mismo snippet, adaptando el nombre de la variable del servicio.

- [ ] **Step 4: i18n (ambos bloques).** `es`: `'badge.continua': '🔄 Continúa · {h}/{t}'` · `pt-BR`: `'badge.continua': '🔄 Continua · {h}/{t}'`.

- [ ] **Step 5:** `npm run check` → exit 0.
- [ ] **Step 6:** Commit: `feat(jornadas): badge '🔄 Continúa · X/Y' en cards de coord y operario` (+ trailer).

---

## Task 4: Docs + bump del service worker

**Files:** Modify `sw.js` (bump `CACHE` v92 → v93), `docs/NOTION.md`, `docs/FUNCIONALIDADES.md`.

- [ ] **Step 1:** En `sw.js`, subir `const CACHE = 'flyclean-v92'` a `'flyclean-v93'` + comentario `// v93: Fase 3 sectores — jornadas Forma 2 (un solo servicio que se reprograma; parte por día en Registro jornadas).` (grep `flyclean-v` para ubicar).
- [ ] **Step 2:** `docs/NOTION.md`: agregar fila `Registro jornadas | rich_text (JSON) | parte por día [{fecha,ini,fin,hechos:[ids]}] (Fase 3)` en la tabla de Servicios; y anotar que al cerrar un servicio con sectores sin terminar, el operario elige seguir otro día (Estado→🔄 Asignado, Fecha→mañana) o cerrar así.
- [ ] **Step 3:** `docs/FUNCIONALIDADES.md`: actualizar versión a sw v93 y anotar la Fase 3 (jornadas Forma 2).
- [ ] **Step 4:** `node --check sw.js` + `npm run check` → exit 0.
- [ ] **Step 5:** Commit: `docs(jornadas): bump sw v93 + Registro jornadas + Fase 3` (+ trailer).

---

## Verificación de Diego (post-deploy)

1. Servicio con sectores, trabajar algunos y dejar otros pendientes → "finalizar".
2. Aparece el modal: **"Faltan N sectores. ¿Seguís otro día o ya está?"**.
3. **"Sigo otro día"** → el servicio NO desaparece: vuelve al tablero del coord como **"Asignado"** con el badge **"🔄 Continúa · X/Y"** y fecha mañana; el operario lo sigue viendo en "Mis servicios".
4. Reabrir el servicio otro día → los sectores hechos siguen hechos; trabajar los que faltan; al marcar el último y finalizar con todos hechos → **"Completado del todo"**.
5. **"Ya está, cerrar así"** con sectores pendientes → se completa con el avance parcial (no reprograma).
6. Retrocompat: un servicio **sin sectores** se finaliza igual que siempre (Completado, sin modal).
7. En Notion, `Registro jornadas` acumula una entrada por día (fecha + horas + sectores hechos ese día).

## Riesgos / notas

- **Mayor riesgo = el refactor de `cerrarServicio`** (lo usan TODOS los servicios). La retrocompat se garantiza porque, sin sectores, `_ejecutarCierre('completar')` reproduce el cierre de siempre (Estado Completado, Hora Fin ahora, mismo set de properties). Verificar explícitamente el cierre de un servicio sin sectores.
- **Edición concurrente `Registro jornadas`:** el operario hace read-append-write sobre lo que hidrató al abrir. Si el coord editara el registro en paralelo (improbable), se perdería; aceptable para esta fase.
- **`Hora Fin` en 'continuar' se limpia** (no es fin definitivo); se re-setea al completar del todo. Las horas de cada día quedan en `Registro jornadas`.
