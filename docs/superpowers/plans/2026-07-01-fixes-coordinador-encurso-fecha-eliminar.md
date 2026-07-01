# Fixes Coordinador — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que el coordinador vea el trabajo "En curso" aunque su fecha caiga en otro mes, que la fecha se corrija al iniciar fuera de fecha (con marca), y que pueda eliminar servicios completados con confirmación — sin romper nada existente.

**Architecture:** Todo en `index.html` (PWA single-file). Cambios chicos y aislados sobre funciones existentes + 1 property Notion nueva (`Fecha planificada`, la crea el controller vía MCP antes del deploy). Al final, bump de `sw.js`.

**Tech Stack:** HTML/CSS/JS vanilla en un archivo; Notion API vía proxy; i18n `TRANSLATIONS` (es + pt-BR); Service Worker cache.

## Global Constraints

- **⚠️ NO ROMPER LO EXISTENTE (prioridad de Diego):** app de un solo archivo enorme. Cada tarea trae contexto histórico + traza de retrocompat. **Toda edición por match EXACTO del string "viejo"** mostrado; no reescribir funciones de memoria.
- **⚠️ NO DEPLOYAR** hasta que Diego confirme que terminaron los servicios en curso. Se construye en la rama `fix/coord-encurso-eliminar` (ya creada; spec ya commiteado ahí). Construir ≠ deployar.
- **Un solo archivo de app:** cambios en `~/repos/flyclean-app/index.html`, salvo bump de `sw.js` (Task 6).
- **i18n en DOS idiomas:** toda string nueva con key en el bloque **es** y **pt-BR**, vía `t('key')`.
- **Sin harness de tests de comportamiento:** gate por tarea = **`npm run check`** (parsea el JS embebido; `tests/check-html.mjs`). No hay tests unitarios; su ausencia NO es defecto. Cada tarea incluye verificación manual + traza de retrocompat.
- **Property Notion nueva `Fecha planificada`** (tipo `date`) en la DB Servicios (data source `2fbc8a03-5c4f-445c-8516-71dd9b2eea78`). **La crea el controller vía MCP antes del deploy** (aditiva, invisible para los operarios). El código la escribe como **write separado best-effort** → si no existiera, el inicio del operario NO se rompe.
- **Decisiones (Diego):** traer siempre solo "✈️ En curso"; al iniciar fuera de fecha cambiar `Fecha programada` a hoy; aviso = **marca en la tarjeta** (no banner); **guardar** la fecha planificada original y mostrarla.
- **Working dir:** `~/repos/flyclean-app`. Rama: `fix/coord-encurso-eliminar`.

Spec: `docs/superpowers/specs/2026-07-01-fixes-coordinador-encurso-fecha-eliminar-design.md`.

---

## File Structure

- `index.html`:
  - i18n `TRANSLATIONS` (es + pt): 2 keys nuevas (Task 1).
  - `filtrarServicios` (~3129) + `fetchCoordItemsForMonth` (~10858): opción `incluirEnCurso` (Task 2).
  - `iniciarServicio` (~6893-6922): fecha real al iniciar + write best-effort de `Fecha planificada` (Task 3).
  - `coordServiceCard` (~9342, 9358): marca "fuera de fecha" (Task 4).
  - `openEditSheet` (~9619) + `deleteService` (~10271): eliminar completados con confirmación (Task 5).
- `sw.js`: bump `flyclean-v98` → `flyclean-v99` (Task 6).
- `docs/FUNCIONALIDADES.md`: entrada (Task 6).

---

### Task 1: Strings i18n (2 keys nuevas, es + pt-BR)

**Contexto:** `TRANSLATIONS` tiene bloque **es** y **pt-BR**; cada key una vez por bloque. Necesitamos: la marca de "fuera de fecha" (Task 4) y el confirm extra de eliminar completados (Task 5).

**Files:** Modify `index.html` (bloque es y pt-BR).

**Interfaces:**
- Produces: `badge.fueradefecha`, `sheet.edit.delete.confirm.completed` — usadas por Tasks 4 y 5.

- [ ] **Step 1: Agregar las 2 keys en el bloque español**

Localizar en el bloque es la línea (existe hoy): `    'badge.servicio.completo': '✅ Servicio completo',`
Insertar **inmediatamente después**:
```javascript
    'badge.fueradefecha': '⚠️ Iniciado fuera de fecha · planif. {d}',
    'sheet.edit.delete.confirm.completed': 'Este servicio está COMPLETADO (registro histórico). ¿Eliminarlo igual? Va a la papelera de Notion (recuperable 30 días).',
```

- [ ] **Step 2: Agregar las 2 keys en el bloque portugués (pt-BR)**

Localizar en el bloque pt-BR la línea: `    'badge.servicio.completo': '✅ Serviço completo',`
Insertar **inmediatamente después**:
```javascript
    'badge.fueradefecha': '⚠️ Iniciado fora da data · planej. {d}',
    'sheet.edit.delete.confirm.completed': 'Este serviço está CONCLUÍDO (registro histórico). Excluir mesmo assim? Vai para a lixeira do Notion (recuperável 30 dias).',
```

- [ ] **Step 3: Verificar sintaxis**

Run: `cd ~/repos/flyclean-app && npm run check`
Expected: PASS.

- [ ] **Step 4: Verificar keys en ambos idiomas**

Run: `cd ~/repos/flyclean-app && for k in badge.fueradefecha sheet.edit.delete.confirm.completed; do echo "$k -> $(grep -c "'$k'" index.html)"; done`
Expected: cada key → `2`.

- [ ] **Step 5: Commit**

```bash
cd ~/repos/flyclean-app && git add index.html
git commit -m "feat(coord-fix): i18n — marca fuera de fecha + confirm eliminar completados (es+pt)"
```

---

### Task 2: Red de seguridad — el panel siempre trae los "En curso" (`filtrarServicios`)

**Contexto histórico:** el panel del coordinador NO filtra server-side (el proxy descarta el filtro multi-data-source); el filtrado REAL es cliente-side en `filtrarServicios(items, opts)` (~3129), llamado desde `fetchCoordItemsForMonth` (~10858) con `{ paisNotion, desde: start, hasta: end, incluirSinFecha: true }`. `filtrarServicios` excluye un servicio si su `Fecha programada` cae fuera de `[desde, hasta]`. Por eso un servicio "✈️ En curso" con fecha de otro mes no aparece. Agregamos una **opción opt-in** `incluirEnCurso` que, cuando está activa, incluye SIEMPRE los "En curso" (respetando país), sin tocar a los demás llamadores de `filtrarServicios`.

**Files:** Modify `index.html` — `filtrarServicios` (3129-3142) y la llamada en `fetchCoordItemsForMonth` (10858).

**Interfaces:**
- Produces: `filtrarServicios(..., { incluirEnCurso })` — opción nueva, default `false`.

- [ ] **Step 1: Agregar la opción `incluirEnCurso` a `filtrarServicios`**

Reemplazar (3129-3142):
```javascript
function filtrarServicios(items, { paisNotion = null, desde = null, hasta = null, incluirSinFecha = false, estados = null } = {}) {
  return (items || []).filter(s => {
    const p = s.properties || {};
    if (paisNotion && (p['País']?.select?.name) !== paisNotion) return false;
    if (estados && !estados.includes(p['Estado']?.select?.name || '')) return false;
    if (desde || hasta) {
      const f = p['Fecha programada']?.date?.start || '';
      if (!f) return incluirSinFecha;
      if (desde && f < desde) return false;
      if (hasta && f > hasta) return false;
    }
    return true;
  });
}
```
por:
```javascript
function filtrarServicios(items, { paisNotion = null, desde = null, hasta = null, incluirSinFecha = false, estados = null, incluirEnCurso = false } = {}) {
  return (items || []).filter(s => {
    const p = s.properties || {};
    if (paisNotion && (p['País']?.select?.name) !== paisNotion) return false;
    if (estados && !estados.includes(p['Estado']?.select?.name || '')) return false;
    // Trabajo EN CURSO ahora: se muestra siempre (sin importar el mes), respetando país. Red de seguridad
    // para un servicio "✈️ En curso" cuya Fecha programada cae en otro mes.
    if (incluirEnCurso && (p['Estado']?.select?.name || '').includes('En curso')) return true;
    if (desde || hasta) {
      const f = p['Fecha programada']?.date?.start || '';
      if (!f) return incluirSinFecha;
      if (desde && f < desde) return false;
      if (hasta && f > hasta) return false;
    }
    return true;
  });
}
```

- [ ] **Step 2: Pasar `incluirEnCurso: true` en `fetchCoordItemsForMonth`**

Localizar (10858):
```javascript
  return filtrarServicios(data.results || [], { paisNotion: notionVal, desde: start, hasta: end, incluirSinFecha: true });
```
Reemplazar por:
```javascript
  return filtrarServicios(data.results || [], { paisNotion: notionVal, desde: start, hasta: end, incluirSinFecha: true, incluirEnCurso: true });
```

- [ ] **Step 3: Verificar sintaxis**

Run: `cd ~/repos/flyclean-app && npm run check`
Expected: PASS.

- [ ] **Step 4: Verificación de retrocompat (por lectura)**

Confirmar: (a) la opción `incluirEnCurso` es opt-in (default false) → los demás llamadores de `filtrarServicios` (CEO, etc.) NO cambian; (b) el filtro de país sigue aplicando a los "En curso" (el `if incluirEnCurso` va DESPUÉS del check de país); (c) los servicios del mes y los sin fecha siguen apareciendo igual (no se quitó nada).

- [ ] **Step 5: Commit**

```bash
cd ~/repos/flyclean-app && git add index.html
git commit -m "fix(coord): el panel siempre trae los servicios En curso (filtrarServicios incluirEnCurso)"
```

---

### Task 3: Fecha real al iniciar (flujo operario, `iniciarServicio`)

**Contexto histórico:** `iniciarServicio` (~6893) se llama cuando el operario toca "Iniciar trabajo". Arma `props = { Estado: '✈️ En curso' }` (+ `Ubicación GPS` si hay), y hace `await queueableUpdateServiceProps(currentService.id, props)` (offline-safe). `Hora Inicio` queda como hora PROGRAMADA (no se toca); la hora real va en `Hora Inicio Efectivo` por otro flujo. Ahora: si el servicio se inicia en un día distinto al programado, la `Fecha programada` pasa a hoy (para que caiga en el mes actual del coordinador) y se guarda la fecha planificada original en `Fecha planificada`. **`Fecha programada` es una property existente (seguro escribirla). `Fecha planificada` es NUEVA → se escribe en un write SEPARADO best-effort para que, si por algo no existiera, el inicio del operario NO se rompa.**

**Files:** Modify `index.html` — `iniciarServicio` (6906-6921).

**Interfaces:**
- Consumes: `currentService.properties['Fecha programada']`, `queueableUpdateServiceProps`, `updateServiceProps`.
- Produces: al iniciar fuera de fecha, `Fecha programada`=hoy + `Fecha planificada`=original (best-effort).

- [ ] **Step 1: Agregar la lógica de fecha en `iniciarServicio`**

Localizar (6906-6921):
```javascript
  const props = {
    'Estado': { select: { name: '✈️ En curso' } }
  };
  if (gps) {
    // Property `Ubicación GPS` (tipo URL) en la DB Servicios.
    // Si no existe la property en Notion, Notion ignora silenciosamente esa key.
    props['Ubicación GPS'] = { url: `https://maps.google.com/?q=${gps.lat},${gps.lng}` };
    serviceState.gpsInicio = `${gps.lat.toFixed(6)},${gps.lng.toFixed(6)}`;
  }

  try {
    await queueableUpdateServiceProps(currentService.id, props);
    showSaving();
    persistServiceStateToLocal();
  } catch (e) { console.warn('Error al guardar inicio:', e); }
  renderStep();
```
Reemplazar por:
```javascript
  const props = {
    'Estado': { select: { name: '✈️ En curso' } }
  };
  if (gps) {
    // Property `Ubicación GPS` (tipo URL) en la DB Servicios.
    // Si no existe la property en Notion, Notion ignora silenciosamente esa key.
    props['Ubicación GPS'] = { url: `https://maps.google.com/?q=${gps.lat},${gps.lng}` };
    serviceState.gpsInicio = `${gps.lat.toFixed(6)},${gps.lng.toFixed(6)}`;
  }

  // Si el servicio se inicia en un día DISTINTO al programado, la Fecha programada pasa a HOY (para que
  // aparezca en el mes actual del coordinador). `Fecha programada` es property existente → seguro escribirla.
  const hoyISO = new Date().toISOString().split('T')[0];
  const fProgOrig = (currentService?.properties?.['Fecha programada']?.date?.start || '').split('T')[0];
  const desvioFecha = !!fProgOrig && fProgOrig !== hoyISO;
  if (desvioFecha) props['Fecha programada'] = { date: { start: hoyISO } };

  try {
    await queueableUpdateServiceProps(currentService.id, props);
    // Guardar la fecha planificada ORIGINAL en la property nueva `Fecha planificada`, en un write SEPARADO
    // best-effort: si la property no existiera o falla, el inicio NO se rompe (solo no se muestra la marca).
    if (desvioFecha && !currentService?.properties?.['Fecha planificada']?.date?.start) {
      try {
        await updateServiceProps(currentService.id, { 'Fecha planificada': { date: { start: fProgOrig } } });
      } catch (_) { /* property inexistente / red: se ignora, no bloquea el inicio */ }
    }
    showSaving();
    persistServiceStateToLocal();
  } catch (e) { console.warn('Error al guardar inicio:', e); }
  renderStep();
```

- [ ] **Step 2: Verificar sintaxis**

Run: `cd ~/repos/flyclean-app && npm run check`
Expected: PASS.

- [ ] **Step 3: Verificación de retrocompat (por lectura)**

Confirmar: (a) si `Fecha programada` ES hoy (o está vacía) → `desvioFecha` es false → NO se toca la fecha ni se escribe `Fecha planificada` (comportamiento actual idéntico); (b) el write de `Fecha programada` (property existente) va junto con Estado en el write principal (queueable, offline-safe); (c) el write de `Fecha planificada` (property NUEVA) es SEPARADO y envuelto en try/catch → nunca rompe el inicio; (d) `Fecha planificada` solo se escribe una vez (guard `!...['Fecha planificada']`).

- [ ] **Step 4: Commit**

```bash
cd ~/repos/flyclean-app && git add index.html
git commit -m "feat(operario): al iniciar fuera de fecha, la fecha pasa a hoy + guarda la planificada original"
```

---

### Task 4: Marca "fuera de fecha" en la tarjeta del coordinador (`coordServiceCard`)

**Contexto histórico:** `coordServiceCard(s)` (~9317) renderiza la tarjeta. Cerca de la línea 9342 calcula `pctAvance`; la `coord-service-meta` (9358) muestra el estado + chips. Agregamos: si el servicio tiene `Fecha planificada` (original) distinta de `Fecha programada` (actual), un chip ámbar de aviso.

**Files:** Modify `index.html` — `coordServiceCard` (agregar cálculo ~9342, y el chip en la meta ~9358).

**Interfaces:**
- Consumes: `t('badge.fueradefecha')` (Task 1), `props['Fecha planificada']`, `props['Fecha programada']`.

- [ ] **Step 1: Calcular el desvío de fecha**

Localizar (9342):
```javascript
  const pctAvance = props['% de avance']?.number;
```
Insertar **debajo**:
```javascript
  // Marca "fuera de fecha": si la fecha planificada original difiere de la programada actual (se inició otro día).
  const _fPlan = (props['Fecha planificada']?.date?.start || '').split('T')[0];
  const _fProg = (props['Fecha programada']?.date?.start || '').split('T')[0];
  const fueraDeFecha = !!_fPlan && !!_fProg && _fPlan !== _fProg;
  const fPlanFmt = fueraDeFecha ? `${_fPlan.slice(8, 10)}/${_fPlan.slice(5, 7)}` : '';
```

- [ ] **Step 2: Agregar el chip en la meta de la tarjeta**

Localizar (9358), la línea que empieza con `    <div class="coord-service-meta">`. Contiene, tras el `service-estado`, los chips de `%`, `Servicio completo`, hora, tipo y `continua`. Insertar el chip de "fuera de fecha" **inmediatamente después** del `<span class="service-estado ...">...</span>` (antes del chip de `%`). El fragmento actual empieza así:
```javascript
    <div class="coord-service-meta"><span class="service-estado ${estadoClass}">${esc(estadoDisplay)}</span>${(esJornada && typeof pctAvance === 'number') ? `<span class="coord-tag">${Math.round(pctAvance)}%</span>` : ''}
```
Reemplazar ESE tramo inicial por (agrega el chip `fueraDeFecha` tras el estado):
```javascript
    <div class="coord-service-meta"><span class="service-estado ${estadoClass}">${esc(estadoDisplay)}</span>${fueraDeFecha ? `<span class="coord-tag" style="background:var(--amber-dark,#7c5300);color:var(--amber,#f59e0b)">${t('badge.fueradefecha').replace('{d}', fPlanFmt)}</span>` : ''}${(esJornada && typeof pctAvance === 'number') ? `<span class="coord-tag">${Math.round(pctAvance)}%</span>` : ''}
```
(El resto de la línea — chips de Servicio completo / hora / tipo / continúa — queda EXACTAMENTE igual; solo se insertó el chip nuevo entre el estado y el `%`.)

- [ ] **Step 3: Verificar sintaxis**

Run: `cd ~/repos/flyclean-app && npm run check`
Expected: PASS.

- [ ] **Step 4: Verificación de retrocompat (por lectura)**

Confirmar: (a) el chip solo aparece si `fueraDeFecha` (hay `Fecha planificada` y difiere de la programada) → servicios normales sin desvío no muestran nada nuevo; (b) el resto de los chips de la meta quedan idénticos; (c) `fPlanFmt` formatea DD/MM desde `YYYY-MM-DD` con `slice`.

- [ ] **Step 5: Commit**

```bash
cd ~/repos/flyclean-app && git add index.html
git commit -m "feat(coord): marca 'Iniciado fuera de fecha · planif. DD/MM' en la tarjeta"
```

---

### Task 5: Eliminar servicios completados desde el coordinador (con confirmación)

**Contexto histórico:** hoy el coordinador NO puede borrar completados: en `openEditSheet` (~9619) el botón se oculta con `(isCompletado && !esFin) ? 'none' : ''`, y en `deleteService` (~10271) hay un bloqueo `if (estado incluye 'Completado' && !esFin) { alert; return; }`. `esFin` = rol Administración (Finanzas). Cambiamos: mostrar el botón siempre y, en vez del bloqueo, pedir una confirmación extra al coordinador para completados. Finanzas mantiene su flujo (su segunda confirmación actual).

**Files:** Modify `index.html` — `openEditSheet` (9619) y `deleteService` (10271-10275).

**Interfaces:**
- Consumes: `t('sheet.edit.delete.confirm.completed')` (Task 1).

- [ ] **Step 1: Mostrar el botón Eliminar también para completados**

Localizar (9617-9622):
```javascript
  if (delBtn) {
    // Coord/Dirección: NO eliminar completados (histórico). Finanzas: SÍ puede (papelera + doble confirm).
    delBtn.style.display = (isCompletado && !esFin) ? 'none' : '';
    delBtn.textContent = '🗑️ ' + t('sheet.edit.delete');
    delBtn.disabled = false;
  }
```
Reemplazar por:
```javascript
  if (delBtn) {
    // Todos (Coord/Dirección/Finanzas) pueden eliminar; los completados piden confirmación extra en deleteService.
    delBtn.style.display = '';
    delBtn.textContent = '🗑️ ' + t('sheet.edit.delete');
    delBtn.disabled = false;
  }
```

- [ ] **Step 2: Reemplazar el bloqueo por una confirmación extra en `deleteService`**

Localizar (10270-10275):
```javascript
  // Coord/Dirección: NO eliminar completados (histórico inmutable). Finanzas: SÍ (papelera Notion, recuperable 30 días).
  if (estado.includes('Completado') && !esFin) { alert(t('sheet.edit.delete.blocked.completed')); return; }
  const nombre = props['Nombre del servicio']?.title?.[0]?.plain_text || t('common.sinnombre');
  if (!confirm(t('sheet.edit.delete.confirm').replace('{name}', nombre))) return;
  // Doble confirmación para Finanzas (papelera de Notion).
  if (esFin && !confirm('Confirmá de nuevo: "' + nombre + '" se va a la PAPELERA de Notion (recuperable 30 días). ¿Eliminar?')) return;
```
Reemplazar por:
```javascript
  const nombre = props['Nombre del servicio']?.title?.[0]?.plain_text || t('common.sinnombre');
  if (!confirm(t('sheet.edit.delete.confirm').replace('{name}', nombre))) return;
  // Coord/Dirección + Completado: registro histórico → confirmación EXTRA (antes estaba bloqueado).
  if (estado.includes('Completado') && !esFin && !confirm(t('sheet.edit.delete.confirm.completed').replace('{name}', nombre))) return;
  // Doble confirmación para Finanzas (papelera de Notion).
  if (esFin && !confirm('Confirmá de nuevo: "' + nombre + '" se va a la PAPELERA de Notion (recuperable 30 días). ¿Eliminar?')) return;
```

- [ ] **Step 3: Verificar sintaxis**

Run: `cd ~/repos/flyclean-app && npm run check`
Expected: PASS.

- [ ] **Step 4: Verificación de retrocompat (por lectura)**

Confirmar: (a) servicios NO completados → solo el confirm normal (sin cambios); (b) coord + completado → confirm normal + confirm extra "registro histórico" → papelera; (c) Finanzas → su flujo intacto (confirm normal + su doble confirm; el nuevo confirm de completados NO le aplica porque `!esFin` es false); (d) la key `sheet.edit.delete.blocked.completed` queda sin uso (no molesta).

- [ ] **Step 5: Commit**

```bash
cd ~/repos/flyclean-app && git add index.html
git commit -m "feat(coord): eliminar servicios completados con confirmación extra (papelera)"
```

---

### Task 6: Crear la property `Fecha planificada` + bump sw v99 + docs + verificación final

**Contexto:** la property Notion `Fecha planificada` (date) debe existir antes del deploy (la escribe Task 3). La crea el CONTROLLER vía MCP (aditiva, segura). `sw.js` línea 90 tiene `const CACHE = 'flyclean-v98';`.

**Files:** Modify `sw.js`, `docs/FUNCIONALIDADES.md`. Acción Notion (controller).

- [ ] **Step 1: (Controller) Crear la property `Fecha planificada` (date) en Servicios**

El controller crea vía Notion MCP la property `Fecha planificada` (tipo `date`) en el data source `2fbc8a03-5c4f-445c-8516-71dd9b2eea78`. Descripción: "Fecha ORIGINAL planificada por el coord; se guarda cuando el operario inicia el servicio en un día distinto (la Fecha programada pasa a hoy)." Verificar que aparece en el schema. **Este paso debe completarse antes del deploy** (el código de Task 3 la escribe best-effort, así que no rompe si aún no existe, pero la marca de Task 4 la necesita).

- [ ] **Step 2: Bump del Service Worker**

En `sw.js`, localizar:
```javascript
const CACHE = 'flyclean-v98';
```
Reemplazar por (agregar comentario de versión en la línea anterior, respetando el patrón):
```javascript
// v99: fixes coordinador — el panel siempre trae los "En curso" (aunque su fecha sea de otro mes) + al iniciar fuera de fecha la Fecha programada pasa a hoy y se guarda la planificada original (marca "Iniciado fuera de fecha" en la tarjeta) + el coordinador puede eliminar servicios completados con confirmación extra.
const CACHE = 'flyclean-v99';
```

- [ ] **Step 3: Verificar sintaxis (ambos)**

Run: `cd ~/repos/flyclean-app && npm run check && node --check sw.js && echo "sw OK"`
Expected: PASS + `sw OK`.

- [ ] **Step 4: Actualizar `docs/FUNCIONALIDADES.md`**

Insertar, justo ANTES de la línea `---` del footer (`_Generado automáticamente...`):
```markdown
## Fixes Coordinador (sw v99)

- **"En curso" siempre visible:** el panel del coordinador ahora trae SIEMPRE los servicios `✈️ En curso`, aunque su `Fecha programada` caiga en otro mes (`filtrarServicios` opción `incluirEnCurso`, usada por `fetchCoordItemsForMonth`).
- **Fecha real al iniciar:** si el operario inicia un servicio en un día distinto al programado, la `Fecha programada` pasa a HOY (`iniciarServicio`) y se guarda la original en la property nueva `Fecha planificada` (write best-effort). La tarjeta del coordinador muestra **"⚠️ Iniciado fuera de fecha · planif. DD/MM"** (`coordServiceCard`).
- **Eliminar completados:** el coordinador puede eliminar servicios `✅ Completado` con una confirmación extra (registro histórico) → papelera de Notion, recuperable 30 días (`deleteService` + `openEditSheet`). Finanzas sin cambios.
```
(Si `docs/FUNCIONALIDADES.md` no existe, saltear.)

- [ ] **Step 5: Verificación final completa**

Run: `cd ~/repos/flyclean-app && npm run check && npm test && node --check sw.js`
Expected: `npm run check` PASS, smoke 3/3, `node --check sw.js` OK.

- [ ] **Step 6: Commit**

```bash
cd ~/repos/flyclean-app && git add sw.js docs/FUNCIONALIDADES.md
git commit -m "chore(coord-fix): bump sw v99 + docs (property Fecha planificada creada vía MCP)"
```

---

## Self-Review

**1. Spec coverage:**
- A.1 (fecha real al iniciar) → Task 3. ✓
- A.2 (marca en la tarjeta) → Task 4 (+ i18n Task 1). ✓
- A.3 (siempre traer En curso) → Task 2. ✓
- B (eliminar completados con confirm) → Task 5 (+ i18n Task 1). ✓
- Property `Fecha planificada` → Task 6 Step 1 (controller/MCP). ✓
- Bump sw + docs → Task 6. ✓
- Fase B fuera de alcance → sin tareas. ✓

**2. Placeholder scan:** sin "TBD/TODO"; todos los steps muestran el old→new completo. ✓

**3. Type consistency:** `filtrarServicios(..., { incluirEnCurso })` definido (Task 2 Step 1) y usado (Task 2 Step 2). `desvioFecha`/`fProgOrig`/`hoyISO` (Task 3) consistentes. `fueraDeFecha`/`_fPlan`/`_fProg`/`fPlanFmt` (Task 4) consistentes. Keys i18n de Task 1 (`badge.fueradefecha`, `sheet.edit.delete.confirm.completed`) usadas con `{d}`/`{name}` en Tasks 4 y 5. Property `Fecha planificada` escrita en Task 3 y creada en Task 6 Step 1. ✓

Sin gaps.
