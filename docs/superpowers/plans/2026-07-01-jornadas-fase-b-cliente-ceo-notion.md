# Jornadas Fase B — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mostrar las jornadas (trabajos multi-día) agrupadas en el historial del cliente (desplegable), badge "Servicio completo" en el panel CEO, y una vista agrupada en Notion (best-effort) — sin romper nada.

**Architecture:** Todo en `index.html` (PWA single-file). Se agrega la carga de jornadas al historial del cliente y se agrupan por `Orden madre` en un desplegable (reusa el patrón `togglePhotos`); se reusa el helper `jobCompleto` para el badge del CEO. La vista Notion la crea el controller vía MCP. Bump de `sw.js` al final.

**Tech Stack:** HTML/CSS/JS vanilla en un archivo; Notion API vía proxy; i18n `TRANSLATIONS` (es + pt-BR); Service Worker cache.

## Global Constraints

- **⚠️ NO ROMPER LO EXISTENTE:** app de un solo archivo. Cada tarea trae contexto histórico + traza de retrocompat. Edición por match EXACTO del string "viejo" mostrado.
- **Un solo archivo de app:** cambios en `~/repos/flyclean-app/index.html`, salvo bump de `sw.js` (Task 5).
- **i18n en DOS idiomas:** toda string nueva con key en el bloque **es** y **pt-BR**, vía `t('key')`.
- **Sin harness de tests de comportamiento:** gate por tarea = **`npm run check`** (`tests/check-html.mjs`). No hay tests unitarios; su ausencia NO es defecto. Cada tarea incluye verificación manual + traza de retrocompat.
- **Sin properties Notion nuevas** (reusa `Orden madre`, `Jornada N°`, `% de avance`, `Estado`, `Tipo de registro`).
- **Reusa helpers existentes:** `jobRootId(svc)`, `jobGroup(svc, pool)`, `jobCompleto(svc, pool)` (~línea 9349); `badge.servicio.completo` (ya existe es+pt); patrón `togglePhotos`/`.photo-toggle`.
- **Alcance:** solo trabajos de **jornadas** (Forma 1, N fichas `📅 Jornada` con `Orden madre`). Sectores (Forma 2, una ficha) y servicios de un día EN CURSO quedan fuera (spec §7).
- **Decisiones (Diego):** historial muestra trabajos en curso Y terminados; vista Notion best-effort ahora.
- **Working dir:** `~/repos/flyclean-app`. Rama: `feat/jornadas-fase-b` (ya creada; spec ya commiteado).

Spec: `docs/superpowers/specs/2026-07-01-jornadas-fase-b-cliente-ceo-notion-design.md`.

---

## File Structure

- `index.html`:
  - i18n `TRANSLATIONS` (es + pt): 3 keys nuevas (Task 1).
  - CSS `<style>`: reglas `.jornada-group`/`.jornada-row` (Task 1).
  - `loadContactHistory` (~11930): extraer jornadas del cliente y sumarlas a `items` (Task 2).
  - `renderContactHistory` (~11995): agrupar jornadas + desplegable; `renderJornadaGroup` + `toggleJornadas` nuevas (Task 3).
  - `renderCEOServicios` (~7488): badge "Servicio completo" (Task 4).
- `sw.js`: bump `flyclean-v99` → `flyclean-v100` (Task 5).
- `docs/FUNCIONALIDADES.md`: entrada (Task 5).
- Notion (controller/MCP): vista agrupada (Task 5).

---

### Task 1: Strings i18n (3 keys) + CSS del desplegable

**Contexto:** el desplegable del trabajo necesita 3 textos (conteo, estado completo, estado en curso) y estilos para el grupo + las filas de jornada. Reusa la mecánica de `.photo-toggle` (ya existe).

**Files:** Modify `index.html` (bloques es + pt-BR; `<style>`).

**Interfaces:**
- Produces: keys `contact.history.trabajo.jornadas`, `contact.history.trabajo.completo`, `contact.history.trabajo.encurso` (usadas en Task 3); clases CSS `.jornada-group`, `.jornada-row`, `.jornada-detail` (Task 3).

- [ ] **Step 1: Agregar las 3 keys en el bloque español**

Localizar la línea es `    'contact.history.ingreso': 'Ingreso',` e insertar **inmediatamente después**:
```javascript
    'contact.history.trabajo.jornadas': '{n} jornadas',
    'contact.history.trabajo.completo': '✅ Servicio completo · {p}%',
    'contact.history.trabajo.encurso': '🔄 En curso · {p}%',
```

- [ ] **Step 2: Agregar las 3 keys en el bloque portugués (pt-BR)**

Localizar la línea pt `    'contact.history.ingreso': 'Receita',` e insertar **inmediatamente después**:
```javascript
    'contact.history.trabajo.jornadas': '{n} jornadas',
    'contact.history.trabajo.completo': '✅ Serviço completo · {p}%',
    'contact.history.trabajo.encurso': '🔄 Em curso · {p}%',
```

- [ ] **Step 3: Agregar el CSS del desplegable**

En el `<style>` principal, insertar estas reglas **inmediatamente después** de la regla `.history-item:active { background: var(--card); transform: scale(0.99); }` (buscar `.history-item:active`):
```css
    .jornada-group { background: var(--bg); border: 1px solid var(--border); border-radius: 8px; margin-bottom: 6px; overflow: hidden; }
    .jornada-group .photo-toggle { width: 100%; justify-content: space-between; border: none; border-radius: 0; background: none; padding: 10px 12px; }
    .jornada-detail { border-top: 1px solid var(--border); }
    .jornada-row { padding: 8px 12px; font-size: 12px; color: var(--text2); cursor: pointer; }
    .jornada-row + .jornada-row { border-top: 1px solid var(--border); }
    .jornada-row:active { background: var(--card); }
```

- [ ] **Step 4: Verificar sintaxis**

Run: `cd ~/repos/flyclean-app && npm run check`
Expected: PASS.

- [ ] **Step 5: Verificar keys en ambos idiomas**

Run: `cd ~/repos/flyclean-app && for k in contact.history.trabajo.jornadas contact.history.trabajo.completo contact.history.trabajo.encurso; do echo "$k -> $(grep -c "'$k'" index.html)"; done`
Expected: cada key → `2`.

- [ ] **Step 6: Commit**

```bash
cd ~/repos/flyclean-app && git add index.html
git commit -m "feat(fase-b): i18n desplegable de jornadas + CSS .jornada-group/.jornada-row (es+pt)"
```

---

### Task 2: Cargar las jornadas del cliente en el historial (`loadContactHistory`)

**Contexto histórico:** `loadContactHistory(contactId)` (~11930) hace 4 queries en paralelo. El proxy de Servicios (multi-source) **descarta el filtro y devuelve todas las páginas** de la DB por search-fallback → el código **re-filtra cliente-side**. Por eso `svcRes.results` ya contiene TODAS las páginas de Servicios (no solo las órdenes completadas). Hoy se extraen: relevamientos (de `relevRes`) y órdenes completadas (de `svcRes`). Las jornadas (`📅 Jornada`) NO se extraen → un trabajo multi-día es invisible. Extraemos las jornadas del **mismo `svcRes.results`** (sin query extra) y las sumamos a `items` como `type: 'servicio'` (la agrupación la hace el render en Task 3).

**Files:** Modify `index.html` — `loadContactHistory` (~11971-11983).

**Interfaces:**
- Produces: items `type:'servicio'` que son jornadas (con `Orden madre`, `Jornada N°`, `% de avance`) dentro de `items` — consumidos por Task 3.

- [ ] **Step 1: Extraer las jornadas + sumarlas a `items`**

Localizar (11971-11983):
```javascript
    const svcs = (svcRes.results || []).filter(s => {
      const tipoReg = s.properties?.['Tipo de registro']?.select?.name || '';
      const estado = s.properties?.['Estado']?.select?.name || '';
      const contactos = s.properties?.['Contacto']?.relation || [];
      return tipoReg.includes('Orden de trabajo') && estado.includes('Completado') && contactos.some(r => r.id === contactId) && recEnPaisNotion(s);
    });

    const items = [
      ...(propRes.results || []).map(r => ({ type: 'propuesta', data: r, date: r.properties?.['Fecha de creación']?.created_time || r.created_time || '' })),
      ...relevs.map(r => ({ type: 'relevamiento', data: r, date: r.properties?.['Fecha programada']?.date?.start || r.created_time || '' })),
      ...svcs.map(r => ({ type: 'servicio', data: r, date: r.properties?.['Fecha programada']?.date?.start || r.created_time || '' })),
      ...(ingRes.results || []).map(r => ({ type: 'ingreso', data: r, date: r.properties?.['Fecha']?.date?.start || r.created_time || '' }))
    ];
```
Reemplazar por (agrega el filtro `jornadas` + su spread en `items`):
```javascript
    const svcs = (svcRes.results || []).filter(s => {
      const tipoReg = s.properties?.['Tipo de registro']?.select?.name || '';
      const estado = s.properties?.['Estado']?.select?.name || '';
      const contactos = s.properties?.['Contacto']?.relation || [];
      return tipoReg.includes('Orden de trabajo') && estado.includes('Completado') && contactos.some(r => r.id === contactId) && recEnPaisNotion(s);
    });
    // Fase B: las jornadas (📅 Jornada) del cliente, en CUALQUIER estado. El render (renderContactHistory)
    // las agrupa por "trabajo madre" (Orden madre) en un desplegable. Salen del mismo svcRes (search-fallback).
    const jornadas = (svcRes.results || []).filter(s => {
      const tipoReg = s.properties?.['Tipo de registro']?.select?.name || '';
      const contactos = s.properties?.['Contacto']?.relation || [];
      return tipoReg.includes('Jornada') && contactos.some(r => r.id === contactId) && recEnPaisNotion(s);
    });

    const items = [
      ...(propRes.results || []).map(r => ({ type: 'propuesta', data: r, date: r.properties?.['Fecha de creación']?.created_time || r.created_time || '' })),
      ...relevs.map(r => ({ type: 'relevamiento', data: r, date: r.properties?.['Fecha programada']?.date?.start || r.created_time || '' })),
      ...svcs.map(r => ({ type: 'servicio', data: r, date: r.properties?.['Fecha programada']?.date?.start || r.created_time || '' })),
      ...jornadas.map(r => ({ type: 'servicio', data: r, date: r.properties?.['Fecha programada']?.date?.start || r.created_time || '' })),
      ...(ingRes.results || []).map(r => ({ type: 'ingreso', data: r, date: r.properties?.['Fecha']?.date?.start || r.created_time || '' }))
    ];
```

- [ ] **Step 2: Verificar sintaxis**

Run: `cd ~/repos/flyclean-app && npm run check`
Expected: PASS.

- [ ] **Step 3: Verificación de retrocompat (por lectura)**

Confirmar: (a) las 4 queries y los filtros existentes (propuestas, relevamientos, órdenes completadas, ingresos) NO cambian; (b) las jornadas se extraen del `svcRes.results` ya fetcheado (sin query nueva) con el mismo patrón país/contacto (`recEnPaisNotion` + `contactos.some`); (c) se agregan como `type:'servicio'` → sin el render de Task 3 se verían como items sueltos (no rompe), con Task 3 se agrupan.

- [ ] **Step 4: Commit**

```bash
cd ~/repos/flyclean-app && git add index.html
git commit -m "feat(fase-b): cargar las jornadas del cliente en el historial (sin query extra)"
```

---

### Task 3: Agrupar las jornadas en un desplegable (`renderContactHistory` + helpers)

**Contexto histórico:** `renderContactHistory(items)` (~11995) arma un resumen financiero + `items.map(item => {...branches...})`. Hay branches por `type` (propuesta/relevamiento/servicio/ingreso). Los items `servicio` (incluidas las jornadas de Task 2) hoy caerían en el branch `servicio` (item suelto). Agregamos: (a) pre-cómputo de grupos de jornadas por `Orden madre` (helper `jobRootId` ya existe, ~9349); (b) un branch NUEVO **antes** del branch `servicio` que renderiza cada trabajo como UN desplegable (la 1ª jornada del grupo, por fecha desc, lo dibuja; las demás se saltean); (c) `renderJornadaGroup` + `toggleJornadas` nuevas. El patrón del desplegable copia `togglePhotos` (~9336).

**Files:** Modify `index.html` — `renderContactHistory` (~12047-12099) + insertar 2 funciones nuevas después de `renderContactHistory` (antes de `openHistoryItem`, ~12101).

**Interfaces:**
- Consumes: `jobRootId` (~9349), `t('contact.history.trabajo.*')` (Task 1), `openHistoryItem`, `esc`, items jornada (Task 2).
- Produces: `renderJornadaGroup(group, fmtDate)`, `toggleJornadas(btn, ev)`.

- [ ] **Step 1: Pre-computar los grupos de jornadas (antes del `.map`)**

Localizar la línea (12048):
```javascript
  container.innerHTML = summaryHTML + items.map(item => {
```
Insertar **inmediatamente antes** de esa línea:
```javascript
  // Fase B: agrupar las jornadas (📅 Jornada) de un mismo trabajo por Orden madre → un desplegable.
  const esJornadaItem = (it) => it.type === 'servicio' && (it.data.properties?.['Tipo de registro']?.select?.name || '').includes('Jornada');
  const _jornadaGroups = {};
  items.forEach(it => { if (esJornadaItem(it)) { const root = jobRootId(it.data); (_jornadaGroups[root] = _jornadaGroups[root] || []).push(it); } });
  const _renderedJobRoots = new Set();
```

- [ ] **Step 2: Agregar el branch de jornada ANTES del branch `servicio`**

Localizar el branch de servicio (12076):
```javascript
    if (item.type === 'servicio') {
```
Insertar **inmediatamente antes** de esa línea:
```javascript
    if (esJornadaItem(item)) {
      const root = jobRootId(item.data);
      if (_renderedJobRoots.has(root)) return '';   // el grupo ya se dibujó en su fecha más reciente
      _renderedJobRoots.add(root);
      return renderJornadaGroup(_jornadaGroups[root] || [item], fmtDate);
    }
```

- [ ] **Step 3: Agregar `renderJornadaGroup` + `toggleJornadas` después de `renderContactHistory`**

Localizar el final de `renderContactHistory` — la línea `}` que cierra la función (12100), seguida de `async function openHistoryItem(type, id) {` (12102). Insertar **entre** ellas (después del `}` de renderContactHistory):
```javascript

// Fase B: dibuja un trabajo multi-día (grupo de jornadas) como una línea desplegable en el historial.
function renderJornadaGroup(group, fmtDate) {
  const sorted = group.slice().sort((a, b) => {
    const na = a.data.properties?.['Jornada N°']?.number, nb = b.data.properties?.['Jornada N°']?.number;
    if (typeof na === 'number' && typeof nb === 'number') return na - nb;
    return (a.date || '').localeCompare(b.date || '');
  });
  const pages = sorted.map(g => g.data);
  const p0 = pages[0]?.properties || {};
  const nombreBase = (p0['Nombre del servicio']?.title?.[0]?.plain_text || '—').replace(/—\s*Jornada\s*\d+\s*$/, '').trim();
  const n = sorted.length;
  const completo = pages.some(p => (p.properties?.['Estado']?.select?.name || '').includes('Completado') && p.properties?.['% de avance']?.number === 100);
  const maxPct = Math.max(0, ...pages.map(p => (typeof p.properties?.['% de avance']?.number === 'number' ? p.properties['% de avance'].number : 0)));
  const estadoStr = completo
    ? t('contact.history.trabajo.completo').replace('{p}', 100)
    : t('contact.history.trabajo.encurso').replace('{p}', Math.round(maxPct));
  const rows = sorted.map(g => {
    const pp = g.data.properties || {};
    const jn = pp['Jornada N°']?.number;
    const pct = pp['% de avance']?.number;
    const done = (pp['Estado']?.select?.name || '').includes('Completado');
    return `<div class="jornada-row" onclick="openHistoryItem('servicio','${esc(g.data.id)}')">J${jn != null ? jn : '?'} · ${fmtDate(g.date)}${typeof pct === 'number' ? ' · ' + Math.round(pct) + '%' : ''}${done ? ' ✅' : ''}</div>`;
  }).join('');
  return `<div class="jornada-group">
    <button type="button" class="photo-toggle" onclick="toggleJornadas(this, event)">
      <span>🛠️ ${esc(nombreBase)} · ${t('contact.history.trabajo.jornadas').replace('{n}', n)} — ${estadoStr}</span>
      <span class="photo-arrow">▾</span>
    </button>
    <div class="jornada-detail" style="display:none">${rows}</div>
  </div>`;
}

function toggleJornadas(btn, ev) {
  ev.stopPropagation(); ev.preventDefault();
  const d = btn.nextElementSibling;
  if (!d) return;
  const open = d.style.display === 'none';
  d.style.display = open ? 'block' : 'none';
  const ar = btn.querySelector('.photo-arrow');
  if (ar) ar.textContent = open ? '▴' : '▾';
}
```

- [ ] **Step 4: Verificar sintaxis**

Run: `cd ~/repos/flyclean-app && npm run check`
Expected: PASS.

- [ ] **Step 5: Verificación de retrocompat (por lectura)**

Confirmar: (a) los branches de propuesta/relevamiento/ingreso y el resumen financiero quedan idénticos; (b) el branch `esJornadaItem` va ANTES del branch `servicio`, y un servicio que NO es jornada (`Tipo` sin "Jornada") NO entra ahí → cae en el branch `servicio` normal (item suelto, como hoy); (c) `renderJornadaGroup` no muta datos; (d) `toggleJornadas` copia el patrón de `togglePhotos` (muestra/oculta el sibling + flecha); (e) el desplegable se dibuja una sola vez por trabajo (`_renderedJobRoots`).

- [ ] **Step 6: Commit**

```bash
cd ~/repos/flyclean-app && git add index.html
git commit -m "feat(fase-b): desplegable de jornadas agrupadas en el historial del cliente"
```

---

### Task 4: Badge "Servicio completo" en el panel CEO (`renderCEOServicios`)

**Contexto histórico:** `renderCEOServicios` (~7488) arma cada `ceo-service-card` desde `results` (servicios del mes, guardados en `_ceoServiciosCache` ~7510). Cada card muestra `ceo-service-meta` con estado + tipo + fecha + operario. Agregamos un chip verde "✅ Servicio completo" cuando `jobCompleto(s, _ceoServiciosCache)` (helper existente ~9349), reusando la key `badge.servicio.completo` (ya existe es+pt) y el mismo estilo que el coordinador.

**Files:** Modify `index.html` — `renderCEOServicios`, dentro del `.map` de las cards (~7520-7529).

**Interfaces:**
- Consumes: `jobCompleto` (~9349), `_ceoServiciosCache`, `t('badge.servicio.completo')`.

- [ ] **Step 1: Agregar el badge en la card CEO**

Localizar en `renderCEOServicios` la meta de la card (dentro del `.map(s => {...})`):
```javascript
        <div class="ceo-service-meta">
          <span class="service-estado ${ESTADO_CLASS[estado] || 'estado-pendiente'}">${estado}</span>
          ${tipo ? `<span class="coord-tag">${tipo}</span>` : ''}
          ${fechaFmt ? `<span class="coord-tag">📅 ${fechaFmt}</span>` : ''}
          ${operario ? `<span class="coord-tag">👤 ${operario}</span>` : ''}
        </div>
```
Reemplazar por (agrega el chip tras el estado):
```javascript
        <div class="ceo-service-meta">
          <span class="service-estado ${ESTADO_CLASS[estado] || 'estado-pendiente'}">${estado}</span>
          ${jobCompleto(s, _ceoServiciosCache) ? `<span class="coord-tag" style="background:var(--green-dark,#14532d);color:var(--green,#22c55e)">${t('badge.servicio.completo')}</span>` : ''}
          ${tipo ? `<span class="coord-tag">${tipo}</span>` : ''}
          ${fechaFmt ? `<span class="coord-tag">📅 ${fechaFmt}</span>` : ''}
          ${operario ? `<span class="coord-tag">👤 ${operario}</span>` : ''}
        </div>
```

- [ ] **Step 2: Verificar sintaxis**

Run: `cd ~/repos/flyclean-app && npm run check`
Expected: PASS.

- [ ] **Step 3: Verificación de retrocompat (por lectura)**

Confirmar: (a) el chip solo aparece si `jobCompleto` es true (un servicio cuyo trabajo llegó al 100%); servicios normales no lo muestran; (b) el resto de la card (nombre, estado, tipo, fecha, operario, botón PDF) queda idéntico; (c) `_ceoServiciosCache` ya está asignado (~7510) antes del `.map` (~7513). Si por orden de ejecución `_ceoServiciosCache` estuviera vacío, `jobCompleto` devuelve false (sin badge) — degradación segura.

- [ ] **Step 4: Commit**

```bash
cd ~/repos/flyclean-app && git add index.html
git commit -m "feat(fase-b): badge 'Servicio completo' en el panel CEO"
```

---

### Task 5: Vista Notion (best-effort) + bump sw v100 + docs + verificación final

**Contexto:** la vista agrupada de Notion la crea el CONTROLLER vía MCP (best-effort; si la API no lo permite, receta manual en docs). `sw.js` línea ~91 tiene `const CACHE = 'flyclean-v99';`.

**Files:** Modify `sw.js`, `docs/FUNCIONALIDADES.md`. Acción Notion (controller).

- [ ] **Step 1: (Controller) Intentar la vista agrupada en Notion**

El controller intenta, vía Notion MCP, crear una **vista** de la DB Servicios (database `ccaf276c7f6a460caeb3d2800deab2e5`, data source `2fbc8a03-5c4f-445c-8516-71dd9b2eea78`) filtrada a `Tipo de registro = 📅 Jornada` y **agrupada por `Orden madre`** (o el criterio que la API soporte). Si `notion-create-view` / la config no permite agrupar por relación, dejar documentada en `docs/FUNCIONALIDADES.md` una **receta manual** (crear vista → filtro Tipo=Jornada → agrupar por Orden madre). **No bloquea** las piezas de la app.

- [ ] **Step 2: Bump del Service Worker**

En `sw.js`, localizar `const CACHE = 'flyclean-v99';` y reemplazar por (agregar el comentario de versión en la línea anterior):
```javascript
// v100: jornadas Fase B — desplegable de jornadas agrupadas en el historial del cliente (por Orden madre, en curso y terminadas) + badge "Servicio completo" en el panel CEO + vista agrupada en Notion.
const CACHE = 'flyclean-v100';
```

- [ ] **Step 3: Verificar sintaxis (ambos)**

Run: `cd ~/repos/flyclean-app && npm run check && node --check sw.js && echo "sw OK"`
Expected: PASS + `sw OK`.

- [ ] **Step 4: Actualizar `docs/FUNCIONALIDADES.md`**

Insertar, justo ANTES de la línea `---` del footer (`_Generado automáticamente...`):
```markdown
## Jornadas — Fase B (sw v100)

- **Desplegable de jornadas en el historial del cliente:** un trabajo multi-día (fichas `📅 Jornada` con el mismo `Orden madre`) se muestra como UNA línea desplegable "🛠️ {trabajo} · N jornadas — {estado}" (en curso o completo); al abrirla, cada jornada (J1, J2… con fecha y %) y tocarla abre esa ficha. Carga las jornadas del cliente (cualquier estado) en `loadContactHistory`; agrupa en `renderContactHistory` (`renderJornadaGroup` + `toggleJornadas`, reusa el patrón de "Ver fotos"). Servicios de un día quedan sueltos como antes.
- **Badge "✅ Servicio completo" en el panel CEO** (`renderCEOServicios`, reusa `jobCompleto` sobre `_ceoServiciosCache`).
- **Vista agrupada en Notion** (best-effort): jornadas agrupadas por su trabajo madre.
- Fuera de alcance: sectores (Forma 2 = una ficha), servicios de un día en curso, confiabilidad del agrupado entre meses en CEO.
```
(Si `docs/FUNCIONALIDADES.md` no existe, saltear.)

- [ ] **Step 5: Verificación final completa**

Run: `cd ~/repos/flyclean-app && npm run check && npm test && node --check sw.js`
Expected: `npm run check` PASS, smoke 3/3, `node --check sw.js` OK.

- [ ] **Step 6: Commit**

```bash
cd ~/repos/flyclean-app && git add sw.js docs/FUNCIONALIDADES.md
git commit -m "chore(fase-b): bump sw v100 + docs + vista Notion (best-effort)"
```

---

## Self-Review

**1. Spec coverage:**
- Desplegable historial cliente (agrupar jornadas, en curso+terminado) → Tasks 2 + 3 (+ i18n/CSS Task 1). ✓
- Badge CEO → Task 4. ✓
- Vista Notion best-effort → Task 5 Step 1. ✓
- i18n 3 keys → Task 1. ✓
- Bump sw + docs → Task 5. ✓
- Fuera de alcance (sectores, un-día en curso) → no hay tareas; documentado. ✓

**2. Placeholder scan:** sin "TBD/TODO"; todos los steps de código muestran el old→new completo (salvo el CSS, que se inserta tras un ancla concreta, y la vista Notion, que es una acción de controller best-effort explícita). ✓

**3. Type consistency:** `renderJornadaGroup(group, fmtDate)` / `toggleJornadas(btn, ev)` / `esJornadaItem` / `_jornadaGroups` / `_renderedJobRoots` definidos en Task 3 y usados coherentemente. `jobRootId`/`jobCompleto` (existentes) usados con la firma correcta. Keys i18n de Task 1 usadas en Task 3 con `{n}`/`{p}`. `_ceoServiciosCache` (Task 4) es el pool existente. ✓

Sin gaps.
