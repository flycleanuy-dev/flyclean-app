# Editar nombres + Panel de Limpieza — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir editar nombres de clientes y servicios desde la app, y darle a Dirección un Panel de Limpieza para detectar/fusionar clientes duplicados y revisar/renombrar/archivar servicios — sin romper datos ni números.

**Architecture:** App monolítica `index.html` (sin framework, sin build), Notion = fuente (vía proxy `/api/notion`), Supabase = espejo (`syncAfterWrite`, flag OFF). Todas las acciones que mueven datos pasan por un modal "plan-antes-de-ejecutar". Archivar = checkbox reversible `🗄️ Archivado` (nunca borra).

**Tech Stack:** HTML/CSS/JS vanilla en `index.html`; serverless en `api/` (Node ESM); Notion API; Supabase (PostgREST); MCP de Notion para crear la property; verificación con `node --check`, `tests/check-html.mjs`, scripts read-only contra prod, y Playwright.

## Global Constraints

- **Nunca borrar** — archivar es un checkbox `🗄️ Archivado` reversible; jamás usar `archived:true` de página de Notion.
- **Plan-antes-de-ejecutar** — toda acción que renombre en lote, fusione o archive muestra primero el detalle exacto y solo ejecuta al confirmar.
- **País-aware** — el panel de Limpieza es **solo Dirección** (`role.includes('Dirección')`), global; la edición de nombre respeta el país del usuario.
- **Notion = fuente** — toda escritura va a Notion vía `updateServiceProps`/`callNotion`; reflejo a Supabase con `syncAfterWrite(id, resource)` (resource ∈ `clientes`/`servicios`), flag `fc_db_writesync` OFF por defecto.
- **Servicios es multi-data-source** — el proxy descarta filtros server-side en la DB Servicios (aviso en `index.html:2848-2851`): cualquier consulta a Servicios trae TODO y se filtra **client-side**.
- **Overlays = siblings de `<body>`** — los modales nuevos van como hermanos de `<body>` (patrón `report-step-overlay`, `index.html:1410`), nunca anidados en una `.screen`.
- **Deploy** — rama → commit (`Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`) → push → `gh pr create` → CI verde → merge squash → bump `sw.js` CACHE. `gh auth switch -u flycleanuy-dev` antes de push.
- **Sin framework de test para index.html** — "test" = `node --check` (JS de api/scripts), `node tests/check-html.mjs` (parseo de `<script>`), chequeos de lógica pura con un snippet `node -e` (truth-table), scripts read-only contra prod DBs (patrón `scratchpad/inspect-*.mjs`), y Playwright contra prod tras deploy. NO hay pytest/jest.
- **Secretos** — solo en `.env.local` (gitignored) y Vercel; nunca en el repo ni en logs.

---

## File Structure

- **`api/_lib/notion-map.js`** (modificar) — agregar `archivado` al mapeo de `clientes` y `servicios`.
- **`index.html`** (modificar) — toda la UI y lógica nueva:
  - C1/C2: nombre editable en cliente (`buildContactSheetBody`, `openContactSheet`, `saveContactEdit`) y servicio (`edit-overlay` HTML, `openEditSheet`, `saveServiceEdit`).
  - Filtro Archivado: `kpiIncluido` (`:4226`), listas (`coordContactCard`/`renderCoordContactos`/render de servicios).
  - Panel: tab `ctab-limpieza` (HTML `:1208-1218` + `setCoordTab` `:5287`), helpers `esDireccion`/`puedeEditarNombre`, `renderLimpieza*`, detector, fusión, revisor de servicios, modal de plan (overlay nuevo sibling de body), desarchivar.
- **`sw.js`** (modificar) — bump `CACHE`.
- **`scratchpad/*.mjs`** (efímeros, NO se commitean) — pruebas read-only contra prod.

---

## Task 0: Setup — property `🗄️ Archivado` en Notion + mapeo

**Files:**
- Notion (vía MCP): bases **Clientes** (`250115612de74e0582366549bbe5e389`) y **Servicios** (`ccaf276c7f6a460caeb3d2800deab2e5`).
- Modify: `api/_lib/notion-map.js` (mappers `clientes` ~líneas 46-54 y `servicios` ~64-75).

**Interfaces:**
- Produces: la property checkbox `🗄️ Archivado` en Clientes y Servicios; columnas `clientes.archivado` y `servicios.archivado` en el espejo (vía `raw` ya existe; el atajo es opcional).

- [ ] **Step 1: Crear la property en Notion (MCP).** Con el MCP de Notion, agregar a la data source de **Clientes** y a la de **Servicios** una property **checkbox** llamada exactamente `🗄️ Archivado`. (Usar `notion-update-data-source` sobre cada data source: Clientes ds, Servicios ds `2fbc8a03-5c4f-445c-8516-71dd9b2eea78`.)

- [ ] **Step 2: Verificar que existe.** Script read-only:

```bash
cd /Users/proyectos/repos/flyclean-app && node --env-file=.env.local -e '
const T=process.env.NOTION_TOKEN,NV="2022-06-28";
for (const [n,id] of [["Clientes","250115612de74e0582366549bbe5e389"],["Servicios","ccaf276c7f6a460caeb3d2800deab2e5"]]) {
  const r=await fetch(`https://api.notion.com/v1/databases/${id}`,{headers:{Authorization:"Bearer "+T,"Notion-Version":NV}});
  const j=await r.json(); console.log(n, "🗄️ Archivado" in (j.properties||{}) ? "OK ✅" : "FALTA ❌");
}'
```
Expected: `Clientes OK ✅` y `Servicios OK ✅`.

- [ ] **Step 3: Mapear en `api/_lib/notion-map.js`.** En el mapper `clientes`, agregar antes de `raw: props,`:

```js
    archivado: check(props, '🗄️ Archivado'),
```
Y lo mismo en el mapper `servicios` (antes de `raw: props,`). El helper `check` ya existe en el archivo.

- [ ] **Step 4: Validar.**

Run: `node --check api/_lib/notion-map.js`
Expected: sin salida (OK).

- [ ] **Step 5: Commit.**

```bash
git checkout -b feat-limpieza-datos 2>/dev/null || git checkout feat-limpieza-datos
git add api/_lib/notion-map.js
git commit -m "feat(limpieza): property 🗄️ Archivado en Clientes/Servicios + mapeo

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 1: Editar nombre de **cliente** (inline, país/rol-aware)

**Files:**
- Modify: `index.html` — `buildContactSheetBody` (`:9792`), `openContactSheet` (`:9839`), `saveContactEdit` (`:9918`).

**Interfaces:**
- Consumes: `contactEditState` (objeto global), `updateServiceProps(id, props)`, `syncAfterWrite(id,'clientes')`, `currentUser.role`.
- Produces: el cliente puede renombrarse desde la app; CEO = solo el nombre; Coord/Dirección = todo (incluido nombre).

- [ ] **Step 1: Cargar el nombre actual al abrir el sheet.** En `openContactSheet`, dentro del objeto `contactEditState = {…}` (`:9849-9860`), agregar la primera línea:

```js
    nombre: props['Nombre / Empresa']?.title?.[0]?.plain_text || '',
```

- [ ] **Step 2: Mostrar el input de nombre en modo `edit` también.** En `buildContactSheetBody` (`:9813-9816`), reemplazar el bloque condicional `mode === 'create' ? <input…> : ''` por uno que se muestre SIEMPRE, con `id` para poder re-habilitarlo al CEO:

```js
  return `<div class="edit-section"><div class="edit-section-label">${t('sheet.contact.section.nombre')}</div>
        <input type="text" id="contact-nombre-input" class="edit-date-input" placeholder="${t('sheet.contact.nombre.placeholder')}" value="${esc(s.nombre || '')}" oninput="contactEditState.nombre=this.value" style="font-size:14px"/></div>` +
```
(El resto de `buildContactSheetBody` queda igual; ya no hace falta la rama `mode === 'create' ? … : ''` para el nombre.)

- [ ] **Step 3: Al CEO, re-habilitar SOLO el nombre + mostrar Guardar.** En `openContactSheet`, dentro del `if (soloLectura) {` (`:9869-9872`), después del `forEach` que deshabilita todo, agregar:

```js
    // El CEO puede editar SOLO el nombre (no el resto).
    const nombreInput = document.getElementById('contact-nombre-input');
    if (nombreInput) nombreInput.disabled = false;
    if (btn) { btn.style.display = ''; btn.textContent = t('btn.save.notion'); btn.disabled = false; }
```

- [ ] **Step 4: Guardar — nombre en ambos modos + validación + rama CEO name-only.** Reemplazar `saveContactEdit` (`:9918-9968`) por esta versión (mantiene la dedup y el flujo existente, agrega: validación de nombre no-vacío en ambos modos, título en edit, y rama CEO solo-nombre):

```js
async function saveContactEdit() {
  const esCEO = !!(currentUser?.role && currentUser.role.includes('CEO'));
  const s = contactEditState;
  const nombre = String(s.nombre || '').trim();
  if (!nombre) { alert(t('sheet.contact.error.nombre')); return; }
  const btn = document.getElementById('contact-save-btn');
  btn.textContent = t('btn.saving'); btn.disabled = true;
  try {
    // CEO: SOLO el nombre (el resto de la ficha es solo-lectura).
    if (esCEO) {
      if (contactSheetMode !== 'edit' || !editingContact) { btn.disabled = false; return; }
      await updateServiceProps(editingContact.id, { 'Nombre / Empresa': { title: [{ text: { content: nombre } }] } });
      syncAfterWrite(editingContact.id, 'clientes');
      closeContactSheet(); await refreshContactsView(); return;
    }
    const props = {};
    if (s.estado) props['Estado'] = { select: { name: s.estado } };
    props['Tipo de cliente'] = { select: s.tipo ? { name: s.tipo } : null };
    if (s.pais) props['País'] = { select: { name: s.pais } };
    props['Canal de captación'] = { select: s.canal ? { name: s.canal } : null };
    props['Servicio de interés'] = { multi_select: s.servicios.map(n => ({ name: n })) };
    props['Teléfono / WhatsApp'] = { phone_number: s.tel || null };
    props['Email'] = { email: s.email || null };
    props['Ciudad / Zona'] = { rich_text: s.ciudad ? [{ text: { content: s.ciudad } }] : [] };
    props['Interlocutor'] = { rich_text: s.interlocutor ? [{ text: { content: s.interlocutor } }] : [] };
    props['Notas'] = { rich_text: s.notas ? [{ text: { content: s.notas } }] : [] };
    props['Nombre / Empresa'] = { title: [{ text: { content: nombre } }] };

    if (contactSheetMode === 'create') {
      const orf = [];
      if (s.tel) orf.push({ property: 'Teléfono / WhatsApp', phone_number: { equals: s.tel } });
      if (s.email) orf.push({ property: 'Email', email: { equals: s.email } });
      if (orf.length) {
        const dup = await callNotion(`databases/${CONTACTOS_DB_ID}/query`, 'POST', { filter: orf.length === 1 ? orf[0] : { or: orf }, page_size: 1 }).catch(() => ({ results: [] }));
        if (dup.results && dup.results.length) {
          const exNom = dup.results[0].properties?.['Nombre / Empresa']?.title?.[0]?.plain_text || 'otro cliente';
          btn.textContent = t('btn.create.notion'); btn.disabled = false;
          alert('Ya existe un cliente con ese teléfono o email: "' + exNom + '". Editá el existente en vez de duplicar.');
          return;
        }
      }
      const created = await callNotion('pages', 'POST', { parent: { database_id: CONTACTOS_DB_ID }, properties: props });
      syncAfterWrite(created?.id, 'clientes');
    } else {
      await updateServiceProps(editingContact.id, props);
      syncAfterWrite(editingContact.id, 'clientes');
    }
    closeContactSheet();
    await refreshContactsView();
  } catch (e) {
    btn.textContent = contactSheetMode === 'create' ? t('btn.create.notion') : t('btn.save.notion');
    btn.disabled = false;
    alert(t('sheet.alert.save.error2') + e.message);
  }
}
```

- [ ] **Step 5: Validar el HTML/JS.**

Run: `node tests/check-html.mjs`
Expected: `✅ index.html: N bloque(s) <script> parsean OK`.

- [ ] **Step 6: Commit.**

```bash
git add index.html
git commit -m "feat(limpieza): editar nombre de cliente inline (CEO solo-nombre, Coord/Dir todo)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: Editar nombre de **servicio** (inline en el sheet de edición)

**Files:**
- Modify: `index.html` — `edit-overlay` HTML (`:1243-1272`), `openEditSheet` (`:8155`), `saveServiceEdit` (`:8561`).

**Interfaces:**
- Consumes: `editState` (global), `editingService`, `updateServiceProps`, `syncAfterWrite(id,'servicios')`.
- Produces: el servicio puede renombrarse desde el sheet de edición del coordinador/Dirección.

- [ ] **Step 1: Agregar el input de nombre al HTML del sheet.** En `edit-overlay`, justo después de `<div class="edit-sheet-header">…</div>` (cierra en `:1250`) y antes del primer `<div class="edit-section">` (ESTADO, `:1251`), insertar:

```html
      <div class="edit-section">
        <div class="edit-section-label">NOMBRE DEL SERVICIO</div>
        <input type="text" class="edit-date-input" id="edit-nombre" oninput="editState.nombre=this.value"/>
      </div>
```

- [ ] **Step 2: Cargar el nombre al abrir.** En `openEditSheet`, agregar `nombre` a `editState` (`:8176`) y setear el input. Reemplazar la línea `editState = { estado: …, pais: … };` por:

```js
  editState = { estado: estadoActual, operario: operarioActual, fecha, hora, lugar, mapa, participantes: participantesActuales, pais: props['País']?.select?.name || '', nombre };
```
Y después de `document.getElementById('edit-mapa').value = mapa;` (`:8187`) agregar:

```js
  const nombreInput = document.getElementById('edit-nombre'); if (nombreInput) nombreInput.value = nombre;
```
(`nombre` ya está calculado en `:8159`.)

- [ ] **Step 3: Guardar el nombre.** En `saveServiceEdit`, después de `const props = {};` (`:8565`), agregar (con validación no-vacío):

```js
    const nombreSvc = String(editState.nombre || '').trim();
    if (!nombreSvc) { btn.textContent = t('btn.save.notion'); btn.disabled = false; alert('El nombre del servicio no puede quedar vacío.'); return; }
    props['Nombre del servicio'] = { title: [{ text: { content: nombreSvc } }] };
```
Y después de `await updateServiceProps(editingService.id, props);` (`:8586`) agregar:

```js
    syncAfterWrite(editingService.id, 'servicios');
```

- [ ] **Step 4: Validar.**

Run: `node tests/check-html.mjs`
Expected: parsea OK.

- [ ] **Step 5: Commit.**

```bash
git add index.html
git commit -m "feat(limpieza): editar nombre de servicio inline en el sheet de edición

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: Filtro `🗄️ Archivado` en finanzas y listas

**Files:**
- Modify: `index.html` — `kpiIncluido` (`:4226`), `coordContactCard`/`renderCoordContactos` (`:9701/9761`), renders de servicios (`renderCoordServicios` `:9125`, `renderCoordPruebas` `:9149`, `renderCoordRelevamientos` `:9172`), `renderClientesView` (`:9680`), `getMyServices` (operario, `:3338`).

**Interfaces:**
- Consumes: `r.properties['🗄️ Archivado'].checkbox`.
- Produces: helper `esArchivado(r)`; los archivados no aparecen en listas activas ni cuentan en KPIs/Por cobrar.

- [ ] **Step 1: Helper `esArchivado` + plegarlo en `kpiIncluido`.** Reemplazar la línea `:4226`:

```js
function esArchivado(r) { return r?.properties?.['🗄️ Archivado']?.checkbox === true; }
function kpiIncluido(r) { return !(esArchivado(r) || r?.properties?.['Excluir de KPIs']?.checkbox === true || esFinanciamiento(r) || !!tipoInterno(r)); }
```
Esto excluye automáticamente los servicios archivados de `renderPorCobrar` (usa `kpiIncluido` en `:6880`) y de los KPIs.

- [ ] **Step 2: Excluir el destino del dropdown de asociación de cobros.** En `renderPorCobrar`, el filtro `comp` (`:6873`) ya pasa por `kpiIncluido` → con el Step 1 los archivados quedan fuera de `comp` y por ende de `compSorted`/`optsFor`. No requiere cambio extra. (Verificar en Step 5.)

- [ ] **Step 3: Excluir archivados de las listas de clientes.** En `coordContactCard`, no aplica (es por-card). El filtrado se hace en quien arma la lista: en `renderCoordContactos` (`:9701`) y `renderClientesView` (`:9680`), donde se obtiene el array de contactos a renderear, agregar `.filter(c => !esArchivado(c))` antes de mapear a cards. (Buscar el `.map(`/`.forEach(` que produce las cards y anteponer el filtro.)

- [ ] **Step 4: Excluir archivados de las listas de servicios.** En cada `_coordAllServices = items.filter(s => { … })` de `renderCoordServicios` (`:9125`), `renderCoordPruebas` (`:9149`), `renderCoordRelevamientos` (`:9172`), agregar como primera condición del filtro `if (esArchivado(s)) return false;`. En `getMyServices` (operario, `:3338`), agregar la misma exclusión al re-filtrado client-side.

- [ ] **Step 5: Test de lógica pura de `kpiIncluido`.**

Run:
```bash
cd /Users/proyectos/repos/flyclean-app && node -e '
const esArchivado=r=>r?.properties?.["🗄️ Archivado"]?.checkbox===true;
const esFinanciamiento=()=>false, tipoInterno=()=>null;
const kpiIncluido=r=>!(esArchivado(r)||r?.properties?.["Excluir de KPIs"]?.checkbox===true||esFinanciamiento(r)||!!tipoInterno(r));
const arch={properties:{"🗄️ Archivado":{checkbox:true}}};
const normal={properties:{}};
console.log("archivado excluido:", kpiIncluido(arch)===false ? "OK ✅":"❌");
console.log("normal incluido:", kpiIncluido(normal)===true ? "OK ✅":"❌");
process.exit(kpiIncluido(arch)===false && kpiIncluido(normal)===true ? 0:1);'
```
Expected: ambos `OK ✅`.

- [ ] **Step 6: Validar HTML + commit.**

```bash
node tests/check-html.mjs
git add index.html
git commit -m "feat(limpieza): excluir 🗄️ Archivado de KPIs/Por cobrar y listas activas

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: Pestaña `🧹 Limpieza` (solo Dirección) — scaffolding

**Files:**
- Modify: `index.html` — tab bar (`:1208-1218`), `setCoordTab` (`:5287`), un contenedor de contenido, helpers de rol, `loadCoordinator`/donde se arma el panel.

**Interfaces:**
- Produces: `esDireccion(u)`, `puedeEditarNombre(u)`, `renderLimpieza()`, tab `ctab-limpieza` visible solo a Dirección, `limpiezaSubtab` (`'clientes'|'servicios'`).

- [ ] **Step 1: Helpers de rol.** Cerca de los otros helpers de usuario (ej. arriba de `setCoordTab`), agregar:

```js
function esDireccion(u = currentUser) { return !!(u?.role && u.role.includes('Dirección')); }
function puedeEditarNombre(u = currentUser) { return !!(u?.role && (u.role.includes('Coordinador') || u.role.includes('CEO') || u.role.includes('Dirección'))); }
```

- [ ] **Step 2: Tab oculta en la barra.** En la `coord-tab-bar` (`:1217`, antes de `ctab-comunicaciones`), insertar la tab oculta por default:

```html
    <div class="coord-tab" id="ctab-limpieza" style="display:none" onclick="setCoordTab('limpieza')">🧹 Limpieza</div>
```

- [ ] **Step 3: Mostrarla solo a Dirección.** En la función que monta el panel del coordinador (`loadCoordinator`, buscar con `grep -n "function loadCoordinator" index.html`), después de pintar la tab bar, agregar:

```js
  const limpiezaTab = document.getElementById('ctab-limpieza');
  if (limpiezaTab) limpiezaTab.style.display = esDireccion() ? '' : 'none';
```

- [ ] **Step 4: Rutear la tab.** En `setCoordTab`, agregar `'limpieza'` al array de ids (`:5290`) y al final de la cadena de `if/else` (`:5313-5321`) agregar:

```js
  else if (tab === 'limpieza') renderLimpieza();
```
Además, guardar contra acceso no autorizado: al inicio de `setCoordTab`, si `tab === 'limpieza' && !esDireccion()` → `return;`.

- [ ] **Step 5: Render base con sub-tabs.** Agregar la función (usa el contenedor principal del coord; reusar el mismo `containerId` que usa `renderCoordContactos` — confirmá el id con `grep -n "renderCoordContactos" index.html` y mirá a qué contenedor escribe). Esqueleto:

```js
let limpiezaSubtab = 'clientes';
function renderLimpieza() {
  if (!esDireccion()) return;
  const cont = document.getElementById('coord-content'); // ← usar el contenedor real del coord
  if (!cont) return;
  cont.innerHTML = `
    <div style="display:flex;gap:8px;padding:12px 4px">
      <button class="estado-btn ${limpiezaSubtab==='clientes'?'active':''}" onclick="setLimpiezaSubtab('clientes')">👥 Clientes duplicados</button>
      <button class="estado-btn ${limpiezaSubtab==='servicios'?'active':''}" onclick="setLimpiezaSubtab('servicios')">📋 Servicios a revisar</button>
      <label style="margin-left:auto;font-size:12px;color:var(--text3);display:flex;align-items:center;gap:6px"><input type="checkbox" id="limpieza-show-archived" onchange="renderLimpieza()"> Mostrar archivados</label>
    </div>
    <div id="limpieza-body"><div class="spinner" style="margin:24px auto"></div></div>`;
  if (limpiezaSubtab === 'clientes') renderLimpiezaDuplicados();
  else renderLimpiezaServicios();
}
function setLimpiezaSubtab(t) { limpiezaSubtab = t; renderLimpieza(); }
function renderLimpiezaDuplicados() { document.getElementById('limpieza-body').textContent = '…'; } // Task 5
function renderLimpiezaServicios() { document.getElementById('limpieza-body').textContent = '…'; }   // Task 7
```

- [ ] **Step 6: Validar + commit.**

```bash
node tests/check-html.mjs
git add index.html
git commit -m "feat(limpieza): pestaña 🧹 Limpieza solo Dirección (scaffolding + sub-tabs)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 5: Detector de clientes duplicados (carga GLOBAL)

**Files:**
- Modify: `index.html` — `renderLimpiezaDuplicados` + helpers de normalización/agrupación.

**Interfaces:**
- Consumes: `callNotionAll`, `CONTACTOS_DB_ID`, `esArchivado`.
- Produces: `loadAllClientesGlobal()`, `normName(s)`, `detectDuplicateClients(list)`, render de grupos. `startMerge(loserId, winnerId)` se define en Task 6.

- [ ] **Step 1: Carga global (NO usa el cache scope-dependiente).**

```js
async function loadAllClientesGlobal() {
  const data = await callNotionAll(`databases/${CONTACTOS_DB_ID}/query`, {});
  return (data.results || []).filter(c => !esArchivado(c));
}
```

- [ ] **Step 2: Normalizadores + detector.**

```js
function normName(s){ return (s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/\s+/g,' ').trim(); }
function normTel(s){ return (s||'').replace(/\D/g,''); }
function clienteNombre(c){ return c.properties?.['Nombre / Empresa']?.title?.[0]?.plain_text || ''; }
function clientePais(c){ return c.properties?.['País']?.select?.name || ''; }
// Agrupa por mismo teléfono, mismo email, o nombre igual normalizado. Devuelve solo grupos de 2+.
function detectDuplicateClients(list){
  const byKey = {};
  const add = (k, c) => { if(!k) return; (byKey[k] = byKey[k] || []).push(c); };
  list.forEach(c => {
    const p = c.properties || {};
    add('tel:'+normTel(p['Teléfono / WhatsApp']?.phone_number), c);
    add('mail:'+((p['Email']?.email||'').toLowerCase().trim()), c);
    add('name:'+normName(clienteNombre(c)), c);
  });
  // dedup de grupos por set de ids
  const seen = new Set(), groups = [];
  Object.entries(byKey).forEach(([k, arr]) => {
    if (k.endsWith(':') || arr.length < 2) return;
    const ids = arr.map(c=>c.id).sort().join('|');
    if (seen.has(ids)) return; seen.add(ids); groups.push(arr);
  });
  return groups;
}
```

- [ ] **Step 3: Render de grupos.**

```js
async function renderLimpiezaDuplicados(){
  const body = document.getElementById('limpieza-body');
  body.innerHTML = '<div class="spinner" style="margin:24px auto"></div>';
  try {
    const list = await loadAllClientesGlobal();
    const groups = detectDuplicateClients(list);
    if (!groups.length){ body.innerHTML = '<div style="padding:24px;color:var(--text3);text-align:center">✅ Sin clientes duplicados ('+list.length+' clientes revisados).</div>'; return; }
    body.innerHTML = groups.map((g,gi)=>`
      <div style="border:1px solid var(--border2);border-radius:12px;padding:12px;margin:10px 4px">
        <div style="font-weight:700;margin-bottom:8px">Posible duplicado (${g.length})</div>
        ${g.map(c=>`<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0">
          <span>${esc(clienteNombre(c)||'(sin nombre)')} <span style="color:var(--text3);font-size:11px">${esc(clientePais(c))}</span></span>
          <button class="estado-btn" onclick="chooseWinner('${gi}','${esc(c.id)}')">Queda este</button>
        </div>`).join('')}
      </div>`).join('');
    window._limpiezaGroups = groups; // para chooseWinner/startMerge
  } catch(e){ body.innerHTML = '<div style="padding:24px;color:#c45">Error: '+esc(e.message)+'</div>'; }
}
function chooseWinner(gi, winnerId){
  const g = (window._limpiezaGroups||[])[gi]; if(!g) return;
  const losers = g.filter(c=>c.id!==winnerId);
  startMerge(winnerId, losers.map(c=>c.id)); // Task 6
}
```

- [ ] **Step 4: Verificación read-only contra prod (hoy debe dar 0 grupos).** Script efímero en scratchpad que replica `detectDuplicateClients` sobre los clientes reales del espejo y confirma 0 grupos (patrón `inspect-britanico.mjs`). Correr con `node --env-file=.env.local`. Expected: `grupos: 0`.

- [ ] **Step 5: Validar + commit.**

```bash
node tests/check-html.mjs
git add index.html
git commit -m "feat(limpieza): detector de clientes duplicados con carga global

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 6: Asistente de fusión (plan + ejecución secuencial)

**Files:**
- Modify: `index.html` — modal de plan (overlay nuevo sibling de body), `startMerge`, `buildMergePlan`, `executeMerge`.

**Interfaces:**
- Consumes: `callNotionAll`/`callNotion`, `DB_ID`, `PROPUESTAS_DB_ID`, `INGRESOS_DB_ID`, `updateServiceProps`, `syncAfterWrite`, `esc`.
- Produces: `startMerge(winnerId, loserIds)`, `buildMergePlan`, `executeMerge`, overlay `merge-plan-overlay`.

- [ ] **Step 1: Overlay de plan (sibling de body).** Después de `report-step-overlay` (`:1420`), agregar:

```html
<div class="edit-overlay" id="merge-plan-overlay" onclick="if(event.target.id==='merge-plan-overlay')closeMergePlan()">
  <div class="edit-sheet" id="merge-plan-sheet">
    <button class="sheet-close-btn" type="button" aria-label="Cerrar" onclick="closeMergePlan()">×</button>
    <div class="edit-sheet-handle"></div>
    <div class="edit-sheet-header"><div class="edit-sheet-title">🔀 Plan de fusión</div><div class="edit-sheet-sub" id="merge-plan-sub"></div></div>
    <div id="merge-plan-body" style="padding:16px 20px 24px"></div>
  </div>
</div>
```
Y `function closeMergePlan(){ document.getElementById('merge-plan-overlay').classList.remove('open'); }`.

- [ ] **Step 2: Construir el plan (Servicios = traer TODO + filtrar client-side).**

```js
async function buildMergePlan(winnerId, loserIds){
  const norm = id => (id||'').replace(/-/g,'');
  const loserSet = new Set(loserIds.map(norm));
  const rel0 = r => norm(r?.relation?.[0]?.id);
  const relHas = (arr, set) => (arr||[]).some(x => set.has(norm(x.id)));
  // Servicios: el proxy descarta el filtro server-side → traer TODO y filtrar client-side por Contacto.
  const [svcAll, propAll, ingAll] = await Promise.all([
    callNotionAll(`databases/${DB_ID}/query`, {}),
    callNotionAll(`databases/${PROPUESTAS_DB_ID}/query`, {}),
    callNotionAll(`databases/${INGRESOS_DB_ID}/query`, {}),
  ]);
  const servicios = (svcAll.results||[]).filter(s => relHas(s.properties?.['Contacto']?.relation, loserSet));
  const svcIds = new Set(servicios.map(s=>norm(s.id)));
  const propuestas = (propAll.results||[]).filter(p => relHas(p.properties?.['Contacto']?.relation, loserSet));
  const ingresos = (ingAll.results||[]).filter(i =>
    relHas(i.properties?.['Cuenta']?.relation, loserSet) ||
    svcIds.has(rel0(i.properties?.['Servicio vinculado']))
  );
  return { servicios, propuestas, ingresos };
}
```

- [ ] **Step 3: Mostrar el plan (con guard cross-país).**

```js
async function startMerge(winnerId, loserIds){
  if (!esDireccion()) return;
  const ov = document.getElementById('merge-plan-overlay');
  const body = document.getElementById('merge-plan-body');
  ov.classList.add('open');
  body.innerHTML = '<div class="spinner" style="margin:24px auto"></div>';
  const all = window._limpiezaGroups ? window._limpiezaGroups.flat() : [];
  const winner = all.find(c=>c.id===winnerId);
  const losers = loserIds.map(id => all.find(c=>c.id===id)).filter(Boolean);
  const plan = await buildMergePlan(winnerId, loserIds);
  const paisW = clientePais(winner);
  const cruzaPais = losers.some(l => clientePais(l) && paisW && clientePais(l) !== paisW);
  window._mergeCtx = { winnerId, loserIds, plan };
  document.getElementById('merge-plan-sub').textContent = 'Revisá antes de confirmar.';
  body.innerHTML = `
    <p>Queda: <b>${esc(clienteNombre(winner))}</b> ${esc(paisW)}</p>
    <p>Se archivan: ${losers.map(l=>'<b>'+esc(clienteNombre(l))+'</b> '+esc(clientePais(l))).join(', ')}</p>
    <p>Se reapuntan al que queda:</p>
    <ul>
      <li>${plan.servicios.length} servicios</li>
      <li>${plan.propuestas.length} propuestas</li>
      <li>${plan.ingresos.length} ingresos/cobros</li>
    </ul>
    ${cruzaPais ? '<p style="color:#c45;font-weight:700">⚠️ Países distintos — no se puede fusionar entre países.</p>' : ''}
    <button class="estado-btn" onclick="closeMergePlan()">Cancelar</button>
    ${cruzaPais ? '' : '<button class="estado-btn active" onclick="executeMerge()">Confirmar fusión</button>'}`;
}
```

- [ ] **Step 4: Ejecutar (secuencial, reapunta arrays conservando otros, detiene ante fallo).**

```js
async function executeMerge(){
  const ctx = window._mergeCtx; if(!ctx) return;
  const norm = id => (id||'').replace(/-/g,'');
  const loserSet = new Set(ctx.loserIds.map(norm));
  const repoint = arr => { // reemplaza ids perdedores por el ganador, sin duplicar, conservando otros
    const ids = (arr||[]).map(x=>x.id).filter(id => !loserSet.has(norm(id)));
    if (!ids.map(norm).includes(norm(ctx.winnerId))) ids.push(ctx.winnerId);
    return ids.map(id => ({ id }));
  };
  const body = document.getElementById('merge-plan-body');
  const steps = [
    ...ctx.plan.servicios.map(s => ({ id:s.id, res:'servicios', prop:'Contacto', cur:s.properties?.['Contacto']?.relation })),
    ...ctx.plan.propuestas.map(p => ({ id:p.id, res:'propuestas', prop:'Contacto', cur:p.properties?.['Contacto']?.relation })),
    ...ctx.plan.ingresos.map(i => ({ id:i.id, res:'ingresos', prop:'Cuenta', cur:i.properties?.['Cuenta']?.relation })),
  ];
  try {
    for (let k=0;k<steps.length;k++){
      const st = steps[k];
      body.innerHTML = `<div class="spinner" style="margin:8px auto"></div><p>Reapuntando ${k+1}/${steps.length}…</p>`;
      await updateServiceProps(st.id, { [st.prop]: { relation: repoint(st.cur) } });
      syncAfterWrite(st.id, st.res);
    }
    // Archivar perdedores al final
    for (const lid of ctx.loserIds){ await updateServiceProps(lid, { '🗄️ Archivado': { checkbox: true } }); syncAfterWrite(lid, 'clientes'); }
    body.innerHTML = '<p>✅ Fusión completa.</p><button class="estado-btn" onclick="closeMergePlan();renderLimpieza()">Cerrar</button>';
  } catch(e){
    body.innerHTML = '<p style="color:#c45">❌ Se detuvo: '+esc(e.message)+'. Lo ya hecho quedó; podés reintentar (es idempotente).</p><button class="estado-btn" onclick="closeMergePlan()">Cerrar</button>';
  }
}
```

- [ ] **Step 5: Verificación con 2 clientes de prueba (script efímero contra prod).** Script en scratchpad que: crea 2 clientes "ZZZ Test Merge A/B" + 1 servicio apuntando a A, simula la lógica de `buildMergePlan`+`repoint`+archive vía la API, verifica que el servicio quedó apuntando a B y A quedó `🗄️ Archivado=true`, corre la fusión 2x (idempotente → 1 sola relación), y al final deja todo archivado. Correr con `node --env-file=.env.local`. Expected: `relación reapuntada: OK · idempotente: OK · perdedor archivado: OK`.

- [ ] **Step 6: Validar + commit.**

```bash
node tests/check-html.mjs
git add index.html
git commit -m "feat(limpieza): asistente de fusión de clientes (plan + ejecución idempotente)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 7: Revisor de servicios (renombrar en lote + archivar) + caso Británico

**Files:**
- Modify: `index.html` — `renderLimpiezaServicios`, `bulkRenameServices`, `archiveService` (reusan el overlay `merge-plan-overlay` como modal de plan genérico, o uno propio análogo).

**Interfaces:**
- Consumes: `_coordAllServices` o carga propia de Servicios (client-side), `updateServiceProps`, `syncAfterWrite`, `esArchivado`.
- Produces: `renderLimpiezaServicios()`, `bulkRenameServices(clienteId, nombre)`, `archiveService(id)`.

- [ ] **Step 1: Cargar y agrupar servicios por cliente (Servicios = client-side).**

```js
async function renderLimpiezaServicios(){
  const body = document.getElementById('limpieza-body');
  const showArch = document.getElementById('limpieza-show-archived')?.checked;
  body.innerHTML = '<div class="spinner" style="margin:24px auto"></div>';
  const data = await callNotionAll(`databases/${DB_ID}/query`, {});
  let svc = (data.results||[]);
  if (!showArch) svc = svc.filter(s => !esArchivado(s));
  // Agrupar por cliente (Contacto[0]); marcar nombres inconsistentes dentro del grupo.
  const byCli = {};
  svc.forEach(s => { const cid = s.properties?.['Contacto']?.relation?.[0]?.id || 'sin-cliente'; (byCli[cid] = byCli[cid] || []).push(s); });
  const grupos = Object.entries(byCli).filter(([,arr]) => arr.length>1 || arr.some(s => /\s{2,}|\s$/.test(s.properties?.['Nombre del servicio']?.title?.[0]?.plain_text||'')));
  body.innerHTML = grupos.map(([cid,arr]) => {
    const nombres = [...new Set(arr.map(s => (s.properties?.['Nombre del servicio']?.title?.[0]?.plain_text||'').trim()))];
    const inconsistente = nombres.length > 1;
    return `<div style="border:1px solid var(--border2);border-radius:12px;padding:12px;margin:10px 4px">
      <div style="font-weight:700">${arr.length} servicios ${inconsistente?'· ⚠️ nombres distintos':''}</div>
      ${arr.map(s=>`<div style="display:flex;justify-content:space-between;gap:8px;padding:4px 0">
        <input class="edit-date-input" style="flex:1" value="${esc((s.properties?.['Nombre del servicio']?.title?.[0]?.plain_text||''))}" onchange="renameOneService('${esc(s.id)}',this.value)"/>
        <button class="estado-btn" onclick="archiveService('${esc(s.id)}')">🗄️</button>
      </div>`).join('')}
      <div style="display:flex;gap:8px;margin-top:8px">
        <input id="bulk-${esc(cid)}" class="edit-date-input" placeholder="Renombrar TODOS a…" style="flex:1"/>
        <button class="estado-btn active" onclick="bulkRenameServices('${esc(cid)}')">Aplicar</button>
      </div>
    </div>`;
  }).join('') || '<div style="padding:24px;color:var(--text3);text-align:center">✅ Nada para revisar.</div>';
}
```

- [ ] **Step 2: Renombrar uno / en lote / archivar (con plan en el lote y el archivar).**

```js
async function renameOneService(id, nombre){
  const n = String(nombre||'').trim(); if(!n) return;
  await updateServiceProps(id, { 'Nombre del servicio': { title: [{ text: { content: n } }] } });
  syncAfterWrite(id, 'servicios');
}
async function bulkRenameServices(cid){
  const n = String(document.getElementById('bulk-'+cid)?.value||'').trim(); if(!n){ alert('Escribí el nombre.'); return; }
  const data = await callNotionAll(`databases/${DB_ID}/query`, {});
  const arr = (data.results||[]).filter(s => (s.properties?.['Contacto']?.relation?.[0]?.id||'')===cid && !esArchivado(s));
  if (!confirm(`Renombrar ${arr.length} servicios a "${n}"?`)) return;
  for (const s of arr){ await updateServiceProps(s.id, { 'Nombre del servicio': { title: [{ text: { content: n } }] } }); syncAfterWrite(s.id, 'servicios'); }
  renderLimpieza();
}
async function archiveService(id){
  if (!confirm('Archivar este servicio? (reversible)')) return;
  await updateServiceProps(id, { '🗄️ Archivado': { checkbox: true } });
  syncAfterWrite(id, 'servicios');
  renderLimpieza();
}
```

- [ ] **Step 3: Británico (ejecución real, CON Diego).** Tras deploy: en el panel, sub-tab Servicios, ubicar el grupo "Hospital Británico", confirmar con Diego que las 4 visitas son reales (no archivar ninguna salvo que él lo diga), y usar **"Renombrar TODOS a…"** → `Hospital Británico`. Verificar después con un script read-only que los 4 servicios tienen exactamente ese título.

- [ ] **Step 4: Validar + commit.**

```bash
node tests/check-html.mjs
git add index.html
git commit -m "feat(limpieza): revisor de servicios (renombrar en lote + archivar)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 8: Desarchivar (toggle "Mostrar archivados" + botón)

**Files:**
- Modify: `index.html` — `renderLimpiezaDuplicados`/`renderLimpiezaServicios` (rama "mostrar archivados") + `unarchive(id, resource)`.

**Interfaces:**
- Consumes: `updateServiceProps`, `syncAfterWrite`.
- Produces: `unarchive(id, resource)`; cuando "Mostrar archivados" está tildado, las listas incluyen los archivados con botón "Desarchivar".

- [ ] **Step 1: Helper.**

```js
async function unarchive(id, resource){
  if (!confirm('Desarchivar este registro?')) return;
  await updateServiceProps(id, { '🗄️ Archivado': { checkbox: false } });
  syncAfterWrite(id, resource);
  renderLimpieza();
}
```

- [ ] **Step 2: Mostrar archivados en clientes.** En `renderLimpiezaDuplicados`, si `#limpieza-show-archived` está tildado, además de los grupos, listar los clientes con `esArchivado(c)` (cargados sin el filtro de Step 1 de Task 5 — usar `callNotionAll` directo) con botón `onclick="unarchive('id','clientes')"`.

- [ ] **Step 3: Mostrar archivados en servicios.** En `renderLimpiezaServicios`, la rama `showArch` ya incluye archivados (Task 7 Step 1); agregar a cada fila archivada un botón "Desarchivar" → `unarchive(id,'servicios')`.

- [ ] **Step 4: Validar + commit.**

```bash
node tests/check-html.mjs
git add index.html
git commit -m "feat(limpieza): toggle Mostrar archivados + Desarchivar

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 9: Bump sw + Deploy + Verificación en prod

**Files:**
- Modify: `sw.js` (bump `CACHE`).

- [ ] **Step 1: Bump del service worker.** En `sw.js`, subir `const CACHE = 'flyclean-v83'` → `'flyclean-v84'` y agregar una línea de historial arriba de la cabecera:

```js
// v84: editar nombres (clientes/servicios) + Panel 🧹 Limpieza (solo Dirección): detector+fusión de clientes
//      duplicados, revisor de servicios (renombrar en lote + archivar), marca 🗄️ Archivado reversible.
```

- [ ] **Step 2: Validar todo.**

```bash
node tests/check-html.mjs && node --check api/_lib/notion-map.js && echo OK
```
Expected: parsea OK + `OK`.

- [ ] **Step 3: PR + CI.**

```bash
gh auth switch -u flycleanuy-dev
git push -u origin feat-limpieza-datos
gh pr create --title "Editar nombres + Panel de Limpieza de datos (paso 1 admin)" --body "Implementa el spec docs/superpowers/specs/2026-06-28-limpieza-datos-edicion-nombres-design.md. Flag/permiso: Panel solo Dirección; edición de nombre Coord/CEO/Dir. Nunca borra (🗄️ Archivado reversible). Plan-antes-de-ejecutar. sw v84."
gh pr checks <PR> --watch
```
Expected: CI verde (checks + Vercel).

- [ ] **Step 4: Merge (requiere OK de Diego — boundary de prod).** `gh pr merge <PR> --squash --delete-branch` y sync de `main`.

- [ ] **Step 5: Verificación en prod (Playwright + read-only).** Tras el deploy: (a) login Dirección → la tab 🧹 aparece; login Coordinador → NO aparece. (b) Editar el nombre de un cliente de prueba y confirmar que persiste. (c) Sub-tab Servicios → renombrar el Británico a "Hospital Británico" (con Diego) → script read-only confirma los 4 títulos. (d) Detector clientes → "Sin duplicados". (e) Confirmar que "Por cobrar" no cambió sus números (ningún servicio archivado todavía).

---

## Self-Review (hecho por el autor del plan)

**Cobertura del spec:** C1 nombres cliente → Task 1; nombre servicio → Task 2; C2 panel/detector/fusión → Tasks 4-6; revisor servicios + Británico → Task 7; marca Archivado + setup + mapeo → Task 0; filtrado Archivado en KPIs/Por cobrar/listas → Task 3; desarchivar → Task 8; plan-antes-de-ejecutar → Tasks 6-7; carga global del detector → Task 5; Servicios client-side → Tasks 5-7; Ingresos en el plan → Task 6; permisos (Dirección-only panel, CEO solo-nombre) → Tasks 1/4; deploy + bump sw → Task 9. **Sin huecos.**

**Placeholders:** los `…` en Task 4 Step 5 son stubs que Tasks 5 y 7 reemplazan (explícito). El `containerId` real del coord (`coord-content`) debe confirmarse con grep en Task 4 Step 5 (instrucción dada). No hay TBD/“agregar validación” sueltos.

**Consistencia de tipos/nombres:** `esArchivado` (Task 3) usado en Tasks 5/7/8; `clienteNombre`/`clientePais`/`normName` (Task 5) usados en Task 6; `_limpiezaGroups`/`_mergeCtx` consistentes entre Tasks 5-6; `syncAfterWrite(id, resource)` con resource ∈ clientes/servicios/propuestas/ingresos (ya soportados por `/api/db-sync`). `repoint` conserva otras relaciones (Global Constraint de arrays).
