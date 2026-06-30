# Sectores — Fase 0 + Fase 1 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Arreglar el selector de Operario manual (botón "+ nuevo" + que aparezca el piloto) y agregar la base del sistema de sectores: lista reusable en el cliente y selección de sectores en el servicio/prueba/relevamiento.

**Architecture:** Todo el frontend vive en `index.html` (PWA de un solo archivo, sin build). Los sectores se guardan como JSON en properties `rich_text` de Notion (mismo patrón que `Estado checklist`), creadas vía MCP en bases existentes (el proxy `/api/notion` no cambia). Pruebas y Relevamientos reusan `openEditSheet`, así que heredan la selección de sectores sin código extra.

**Tech Stack:** HTML/CSS/JS vanilla en `index.html`; Notion API vía `callNotion`/`updateServiceProps`; i18n por el objeto `TRANSLATIONS` (bloque `es` y bloque `pt-BR`).

## Global Constraints

- **Un solo archivo de frontend:** todos los cambios de UI/lógica van en `~/repos/flyclean-app/index.html`. No crear archivos JS nuevos.
- **i18n obligatorio en los DOS idiomas:** cada string visible nueva se agrega como key en el bloque `es` (~línea 2102) **y** en el bloque `pt-BR` (~línea 2696) de `TRANSLATIONS`, y se usa vía `t('clave')`. Nunca texto hardcodeado en la UI nueva.
- **Escapado:** al interpolar texto que viene de Notion/usuario dentro de `innerHTML`, usar `esc(...)`; dentro de un atributo HTML usar `escAttrEdit(...)`.
- **Sin suite de tests unitarios.** Verificación de cada tarea = `npm run check` (valida que el JS embebido en index.html parsea, vía `node tests/check-html.mjs`) en verde. La verificación funcional/visual la hace Diego (requiere login/PIN). NO inventar tests unitarios.
- **Retrocompatibilidad:** un servicio sin sectores (`Estado sectores` ausente/vacío) debe comportarse EXACTArmente como hoy. La presencia de sectores es el único interruptor.
- **Persistencia de sectores = JSON en rich_text:** `{ rich_text: [{ text: { content: JSON.stringify(arr) } }] }` para guardar; `JSON.parse(prop?.rich_text?.[0]?.plain_text || '[]')` para leer. Un solo objeto rich_text (la app siempre lee `[0]`).
- **Commits frecuentes**, uno por tarea, en la rama `feat/sectores`. Cerrar cada mensaje con:
  `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`
- **Spec de referencia:** `docs/superpowers/specs/2026-06-30-sectores-design.md`.

---

## Task 1: Fase 0 — Fix del selector "Operario manual"

**Problema:** `renderOperarioManualBtns` (1) no tiene el botón "+ nuevo operario" que sí tiene el de Piloto, y (2) excluye al piloto actual de la lista (`.filter(name => name !== editState.operario)`), por eso Juan Pablo —cuando está asignado como piloto— no aparece como opción de operario manual.

**Files:**
- Modify: `index.html` — `renderOperarioManualBtns` (9051-9060); agregar dos funciones nuevas después de ella (tras 9060).

**Interfaces:**
- Consumes: `operariosDePais(paisNotion)` → `string[]`; `editState.operario` / `editState.operarioManual`; `_extraOperarios` (array global); `escAttrEdit(s)`; `renderParticipantesBtns()`; `renderOperarioBtns(current)`; `t(key)`; keys i18n ya existentes `sheet.edit.operario.{sinasignar,nuevo,nombre,agregar}`.
- Produces: `showNewOperarioManualInput()`, `confirmNewOperarioManual()` (globales, llamadas desde onclick del HTML que genera `renderOperarioManualBtns`).

- [ ] **Step 1: Reemplazar `renderOperarioManualBtns` (9051-9060)**

Quita la exclusión del piloto en la lista (para que el piloto también aparezca como opción manual; al elegirlo, `selectEditOperarioManual` ya limpia el piloto en 9073-9077, manteniendo "una persona, un rol") y agrega el botón "+ nuevo" + input, espejo de `renderOperarioBtns` (9028-9032).

```javascript
function renderOperarioManualBtns(current) {
  const container = document.getElementById('edit-operario-manual-btns');
  if (!container) return;
  let options = operariosDePais(editState.pais);
  if (current && !options.includes(current)) options = [current, ...options]; // no perder la asignación actual
  _extraOperarios.forEach(n => { if (!options.includes(n)) options.push(n); });
  container.innerHTML =
    `<button class="operario-btn ${!current ? 'active' : ''}" onclick="selectEditOperarioManual(null,this)">${t('sheet.edit.operario.sinasignar')}</button>` +
    options.map(name => `<button class="operario-btn ${current === name ? 'active' : ''}" data-name="${escAttrEdit(name)}" onclick="selectEditOperarioManual(this.dataset.name,this)">${name}</button>`).join('') +
    `<button class="operario-btn" style="border-style:dashed;color:var(--green);font-weight:600" onclick="showNewOperarioManualInput()">${t('sheet.edit.operario.nuevo')}</button>` +
    `<div id="new-op-manual-wrap" style="display:none;gap:6px;margin-top:2px">
      <input id="new-op-manual-input" type="text" class="edit-date-input" placeholder="${t('sheet.edit.operario.nombre')}" style="margin-bottom:0"/>
      <button onclick="confirmNewOperarioManual()" style="width:100%;padding:10px;background:var(--green-dark);border:1px solid var(--green);border-radius:var(--radius-sm);color:var(--green);font-weight:700;font-family:inherit;font-size:13px;cursor:pointer">${t('sheet.edit.operario.agregar')}</button>
    </div>`;
}
```

- [ ] **Step 2: Agregar las dos funciones nuevas justo después de `renderOperarioManualBtns`** (después del `}` que hoy está en 9060, antes de `selectEditOperarioManual` en 9062)

Espejo de `showNewOperarioInput`/`confirmNewOperario` (9035-9049) pero para el rol manual.

```javascript
function showNewOperarioManualInput() {
  const wrap = document.getElementById('new-op-manual-wrap');
  if (wrap) { wrap.style.display = 'flex'; wrap.style.flexDirection = 'column'; document.getElementById('new-op-manual-input')?.focus(); }
}

function confirmNewOperarioManual() {
  const input = document.getElementById('new-op-manual-input');
  const name = input?.value.trim();
  if (!name) return;
  if (!_extraOperarios.includes(name)) _extraOperarios.push(name);
  editState.operarioManual = name;
  renderOperarioManualBtns(name);
  renderParticipantesBtns(); // refresh ayudantes para excluir al nuevo operario manual
  if (document.getElementById('edit-operario-btns')) renderOperarioBtns(editState.operario);
}
```

- [ ] **Step 3: Verificar sintaxis**

Run: `cd ~/repos/flyclean-app && npm run check`
Expected: termina sin errores ("OK" / exit 0). Si falla, revisar comillas/backticks del bloque agregado.

- [ ] **Step 4: Commit**

```bash
cd ~/repos/flyclean-app && git add index.html
git commit -m "fix(operario-manual): botón '+ nuevo' + el piloto aparece como opción manual

El selector de Operario manual no tenía el botón '+ nuevo operario' (sí lo
tiene el de Piloto) y excluía al piloto actual de la lista, por eso Juan Pablo
—asignado como piloto— no aparecía. Al elegir al piloto como manual,
selectEditOperarioManual ya limpia el piloto (una persona, un rol).

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Fase 1 — Properties Notion + helper `genSectorId`

Crea las dos properties nuevas (no requiere tocar el proxy: son bases existentes) y un helper de ids para sectores.

**Files:**
- Modify: `index.html` — agregar `genSectorId()` cerca de los helpers `esc`/`escAttrEdit` (después de 9111).
- Notion (vía MCP `notion-update-data-source`): crear properties.

**Interfaces:**
- Produces: `genSectorId()` → string corto único tipo `"sec-x7k2a9"`.

- [ ] **Step 1: Crear property `Sectores` (rich_text) en la base Clientes**

Base Clientes: database `250115612de74e0582366549bbe5e389`. Usar la herramienta MCP de Notion para actualizar el data source de Clientes y agregar una property `Sectores` de tipo `rich_text`. (Si se usa `notion-update-data-source`, agregar al schema una propiedad `"Sectores": { "rich_text": {} }`.)

- [ ] **Step 2: Crear property `Estado sectores` (rich_text) en la base Servicios**

Servicios data source: `2fbc8a03-5c4f-445c-8516-71dd9b2eea78`. Agregar property `Estado sectores` de tipo `rich_text`.

- [ ] **Step 3: Verificar que las properties existen**

Consultar el schema de cada base (MCP `notion-fetch` o query) y confirmar que `Sectores` (Clientes) y `Estado sectores` (Servicios) aparecen como `rich_text`.

- [ ] **Step 4: Agregar `genSectorId()` en index.html** (después de la función `esc`, línea 9111)

```javascript
// Id corto y único para un sector (no usa fecha/azar de forma sensible — solo para distinguir filas en el JSON).
function genSectorId() {
  return 'sec-' + Math.random().toString(36).slice(2, 8);
}
```

- [ ] **Step 5: Verificar sintaxis**

Run: `cd ~/repos/flyclean-app && npm run check`
Expected: OK / exit 0.

- [ ] **Step 6: Commit**

```bash
cd ~/repos/flyclean-app && git add index.html
git commit -m "feat(sectores): helper genSectorId + properties Notion (Sectores, Estado sectores)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Fase 1 — CRUD de sectores en la ficha del cliente

Agrega la lista reusable de sectores (agregar / renombrar / eliminar) a la ficha del cliente, siguiendo el patrón de `Mapa` (lectura en `openContactSheet`, UI en `buildContactSheetBody`, guardado en `saveContactEdit`).

**Files:**
- Modify: `index.html` — `openContactSheet` (11016-11030), `openNewContactSheet` (11060), `buildContactSheetBody` (insertar bloque tras 10998), `saveContactEdit` (tras 11157), + 4 funciones nuevas; + keys i18n en ambos bloques.

**Interfaces:**
- Consumes: `contactEditState` (objeto global); `esc`, `escAttrEdit`, `genSectorId`, `t`.
- Produces: `renderContactSectores()`, `contactAddSector()`, `contactRemoveSector(id)`, `contactRenameSector(id, value)`; `contactEditState.sectores` = `[{id, nombre}]`.

- [ ] **Step 1: Leer `Sectores` al abrir la ficha** — en `openContactSheet`, dentro del objeto `contactEditState = {...}` (11016-11030), agregar como última propiedad (después de `intermediario`):

```javascript
    intermediario: props['Intermediario']?.relation?.[0]?.id || '',
    sectores: (() => { try { return JSON.parse(props['Sectores']?.rich_text?.[0]?.plain_text || '[]'); } catch (_) { return []; } })()
```

- [ ] **Step 2: Inicializar `sectores` en alta de cliente** — en `openNewContactSheet` (11060), agregar `sectores: []` al objeto literal `contactEditState = { ... }` (antes del `}` de cierre):

```javascript
  contactEditState = { nombre: '', estado: '🆕 Lead', tipo: '', pais: '🇺🇾 Uruguay', canal: '', servicios: [], tel: '', email: '', ciudad: '', interlocutor: '', notas: '', mapa: '', intermediario: '', sectores: [] };
```

- [ ] **Step 3: Insertar el bloque de UI en `buildContactSheetBody`** — entre el bloque de Notas (termina en 10998) y el bloque de historial (`(mode === 'edit' ? ...history...)` en 10999). Agregar como un sumando más del return:

```javascript
    `<div class="edit-section"><div class="edit-section-label">${t('sheet.contact.section.sectores')}</div>
      <div class="edit-section-hint" style="font-size:11px;color:var(--text3);margin-bottom:8px">${t('sheet.contact.sectores.hint')}</div>
      <div id="contact-sectores-list"></div>
      <div style="display:flex;gap:8px;margin-top:8px">
        <input type="text" id="contact-sector-input" class="edit-date-input" style="flex:1;margin-bottom:0" placeholder="${t('sheet.contact.sectores.placeholder')}" onkeydown="if(event.key==='Enter'){event.preventDefault();contactAddSector();}"/>
        <button type="button" class="estado-btn" style="white-space:nowrap" onclick="contactAddSector()">${t('sheet.contact.sectores.add')}</button>
      </div></div>` +
```

- [ ] **Step 4: Renderizar la lista después de construir el body.** En `openContactSheet`, después de `document.getElementById('contact-sheet-body').innerHTML = buildContactSheetBody('edit');` (11034), agregar:

```javascript
  renderContactSectores();
```

Y en `openNewContactSheet`, después de `document.getElementById('contact-sheet-body').innerHTML = buildContactSheetBody('create');` (11063), agregar la misma línea:

```javascript
  renderContactSectores();
```

- [ ] **Step 5: Agregar las 4 funciones nuevas** (después de `contactOpenMapa`, que termina en 11094):

```javascript
function renderContactSectores() {
  const box = document.getElementById('contact-sectores-list');
  if (!box) return;
  const arr = Array.isArray(contactEditState.sectores) ? contactEditState.sectores : [];
  box.innerHTML = arr.length
    ? arr.map(sec => `<div class="sector-row" style="display:flex;gap:6px;align-items:center;margin-bottom:6px">
        <input type="text" class="edit-date-input" style="flex:1;margin-bottom:0" value="${escAttrEdit(sec.nombre)}" oninput="contactRenameSector('${sec.id}',this.value)"/>
        <button type="button" class="estado-btn" style="padding:8px 10px;color:var(--danger,#e5484d)" onclick="contactRemoveSector('${sec.id}')">✕</button>
      </div>`).join('')
    : `<div style="font-size:12px;color:var(--text3);font-style:italic">${t('sheet.contact.sectores.empty')}</div>`;
}

function contactAddSector() {
  const input = document.getElementById('contact-sector-input');
  const nombre = (input?.value || '').trim();
  if (!nombre) return;
  if (!Array.isArray(contactEditState.sectores)) contactEditState.sectores = [];
  contactEditState.sectores.push({ id: genSectorId(), nombre });
  if (input) input.value = '';
  renderContactSectores();
}

function contactRenameSector(id, value) {
  const sec = (contactEditState.sectores || []).find(s => s.id === id);
  if (sec) sec.nombre = value;
}

function contactRemoveSector(id) {
  contactEditState.sectores = (contactEditState.sectores || []).filter(s => s.id !== id);
  renderContactSectores();
}
```

- [ ] **Step 6: Guardar `Sectores` en `saveContactEdit`** — en la rama no-CEO, después de la línea de `props['Notas']` (11157) y antes de `props['Nombre / Empresa']` (11158), agregar:

```javascript
    {
      const secs = (Array.isArray(s.sectores) ? s.sectores : [])
        .map(x => ({ id: x.id, nombre: String(x.nombre || '').trim() }))
        .filter(x => x.nombre);
      props['Sectores'] = { rich_text: secs.length ? [{ text: { content: JSON.stringify(secs) } }] : [] };
    }
```

(El CEO solo edita el nombre — su rama temprana en 11138-11143 retorna antes, así que no toca sectores. Correcto.)

- [ ] **Step 7: Agregar las keys i18n.** En el bloque `es` de `TRANSLATIONS` (junto a las otras `sheet.contact.*`, ~línea 2100), agregar:

```javascript
    'sheet.contact.section.sectores': '🏢 Sectores del cliente',
    'sheet.contact.sectores.hint': 'Edificios/zonas reusables de este cliente. Se ofrecen al crear un servicio.',
    'sheet.contact.sectores.placeholder': 'Nombre del sector (ej. Edificio 1)',
    'sheet.contact.sectores.add': '+ Agregar',
    'sheet.contact.sectores.empty': 'Sin sectores aún.',
```

En el bloque `pt-BR` (~línea 2696), agregar:

```javascript
    'sheet.contact.section.sectores': '🏢 Setores do cliente',
    'sheet.contact.sectores.hint': 'Edifícios/zonas reutilizáveis deste cliente. Aparecem ao criar um serviço.',
    'sheet.contact.sectores.placeholder': 'Nome do setor (ex. Edifício 1)',
    'sheet.contact.sectores.add': '+ Adicionar',
    'sheet.contact.sectores.empty': 'Sem setores ainda.',
```

- [ ] **Step 8: Verificar sintaxis**

Run: `cd ~/repos/flyclean-app && npm run check`
Expected: OK / exit 0.

- [ ] **Step 9: Commit**

```bash
cd ~/repos/flyclean-app && git add index.html
git commit -m "feat(sectores): CRUD de sectores reusables en la ficha del cliente

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Fase 1 — Selección de sectores en el sheet del servicio (cubre Pruebas y Relevamientos)

En el sheet de edición del servicio (coordinador) se eligen, debajo de Ayudantes, los sectores del cliente que aplican a ese trabajo; se puede agregar uno nuevo que se guarda al cliente. Pruebas y Relevamientos reusan `openEditSheet`, así que quedan cubiertos sin código extra.

**Files:**
- Modify: `index.html` — HTML del sheet (insertar tras 1287), `openEditSheet` (editState en 9170-9171, render en 9252), `resolveSvcUbicacion` (tras 9279), `saveServiceEdit` (tras 9688), + 3 funciones nuevas; + keys i18n en ambos bloques.

**Interfaces:**
- Consumes: `editState`; `editState.contactoId`, `editState.sectoresCliente`, `editState.sectores`; `callNotion`, `updateServiceProps`, `genSectorId`, `esc`, `escAttrEdit`, `t`, `syncAfterWrite`.
- Produces: `renderEditSectores()`, `toggleEditSector(id)`, `editAddSector()`; property Notion `Estado sectores` = `[{id, nombre, estado}]` (estado inicial `"pendiente"`).

- [ ] **Step 1: Insertar el bloque HTML del sheet** — después del bloque AYUDANTES (cierra en 1287) y antes del bloque FECHA (1288):

```html
      <div class="edit-section">
        <div class="edit-section-label" data-i18n="sheet.edit.section.sectores">🏢 SECTORES DE ESTE TRABAJO</div>
        <div class="edit-section-hint" data-i18n="sheet.edit.section.sectores.hint" style="font-size:11px;color:var(--text3);margin-bottom:8px">Elegí los edificios/zonas del cliente que se trabajan en este servicio.</div>
        <div class="operario-btns" id="edit-sectores-btns"></div>
        <div style="display:flex;gap:8px;margin-top:8px">
          <input type="text" id="edit-sector-input" class="edit-date-input" style="flex:1;margin-bottom:0" placeholder="Nuevo sector (se guarda al cliente)" onkeydown="if(event.key==='Enter'){event.preventDefault();editAddSector();}"/>
          <button type="button" class="estado-btn" style="white-space:nowrap" onclick="editAddSector()" data-i18n="sheet.edit.sectores.add">+ Agregar</button>
        </div>
      </div>
```

- [ ] **Step 2: Cargar los sectores del servicio en `editState`** — en `openEditSheet`, ampliar el objeto `editState = {...}` (9170-9171). Reemplazar esas dos líneas por:

```javascript
  editState = { estado: estadoActual, operario: operarioActual, operarioManual: operarioManualActual, fecha, hora, lugar, mapa, participantes: participantesActuales, pais: props['País']?.select?.name || '', nombre,
    contactoId, clienteNombre: '', clienteMapa: '', propMapa: '',
    sectoresCliente: [],
    sectores: (() => { try { return JSON.parse(props['Estado sectores']?.rich_text?.[0]?.plain_text || '[]'); } catch (_) { return []; } })(),
    _sectoresClienteDirty: false };
```

- [ ] **Step 3: Renderizar los sectores al abrir el sheet** — en `openEditSheet`, después de `renderParticipantesBtns();` (9252), agregar:

```javascript
  renderEditSectores();
```

- [ ] **Step 4: Traer los sectores del cliente en `resolveSvcUbicacion`** — dentro del `try` del bloque cliente, después de `editState.clienteMapa = cp['Mapa']?.url || '';` (9279), agregar:

```javascript
      try { editState.sectoresCliente = JSON.parse(cp['Sectores']?.rich_text?.[0]?.plain_text || '[]'); } catch (_) { editState.sectoresCliente = []; }
      renderEditSectores();
```

- [ ] **Step 5: Agregar las 3 funciones nuevas** — después de `renderSvcClienteUbicacion` (su cierre está cerca de 9315; agregarlas después del `}` de esa función):

```javascript
// Sectores del trabajo: muestra los del cliente (toggle seleccionado) + los ya elegidos en el servicio.
function renderEditSectores() {
  const box = document.getElementById('edit-sectores-btns');
  if (!box) return;
  const delCliente = Array.isArray(editState.sectoresCliente) ? editState.sectoresCliente : [];
  const elegidos = Array.isArray(editState.sectores) ? editState.sectores : [];
  // Universo = sectores del cliente + los ya elegidos que (por algún motivo) no estén en la lista del cliente.
  const universo = delCliente.slice();
  elegidos.forEach(e => { if (!universo.some(u => u.id === e.id)) universo.push({ id: e.id, nombre: e.nombre }); });
  box.innerHTML = universo.length
    ? universo.map(sec => {
        const isActive = elegidos.some(e => e.id === sec.id);
        return `<button class="operario-btn ${isActive ? 'active' : ''}" data-id="${escAttrEdit(sec.id)}" onclick="toggleEditSector(this.dataset.id)">${esc(sec.nombre)}</button>`;
      }).join('')
    : `<div style="font-size:12px;color:var(--text3);font-style:italic">${t('sheet.edit.sectores.none')}</div>`;
}

function toggleEditSector(id) {
  if (!Array.isArray(editState.sectores)) editState.sectores = [];
  const idx = editState.sectores.findIndex(e => e.id === id);
  if (idx >= 0) {
    editState.sectores.splice(idx, 1);
  } else {
    const src = (editState.sectoresCliente || []).find(s => s.id === id);
    if (src) editState.sectores.push({ id: src.id, nombre: src.nombre, estado: 'pendiente' });
  }
  renderEditSectores();
}

// Agrega un sector nuevo: lo suma a la lista del cliente (se persiste al guardar) y lo deja seleccionado.
function editAddSector() {
  const input = document.getElementById('edit-sector-input');
  const nombre = (input?.value || '').trim();
  if (!nombre) return;
  const id = genSectorId();
  if (!Array.isArray(editState.sectoresCliente)) editState.sectoresCliente = [];
  if (!Array.isArray(editState.sectores)) editState.sectores = [];
  editState.sectoresCliente.push({ id, nombre });
  editState.sectores.push({ id, nombre, estado: 'pendiente' });
  editState._sectoresClienteDirty = true;
  if (input) input.value = '';
  renderEditSectores();
}
```

- [ ] **Step 6: Guardar `Estado sectores` (y, si corresponde, los sectores del cliente) en `saveServiceEdit`** — después de la línea `props['Operarios participantes'] = { multi_select: ... };` (9688) y antes de `await updateServiceProps(...)` (9689), agregar:

```javascript
    {
      const secs = (Array.isArray(editState.sectores) ? editState.sectores : [])
        .map(x => ({ id: x.id, nombre: String(x.nombre || '').trim(), estado: x.estado || 'pendiente' }))
        .filter(x => x.nombre);
      props['Estado sectores'] = { rich_text: secs.length ? [{ text: { content: JSON.stringify(secs) } }] : [] };
    }
    // Si se agregó un sector nuevo desde el servicio, persistirlo a la lista reusable del cliente.
    if (editState._sectoresClienteDirty && editState.contactoId) {
      try {
        const cli = (Array.isArray(editState.sectoresCliente) ? editState.sectoresCliente : [])
          .map(x => ({ id: x.id, nombre: String(x.nombre || '').trim() }))
          .filter(x => x.nombre);
        await updateServiceProps(editState.contactoId, { 'Sectores': { rich_text: cli.length ? [{ text: { content: JSON.stringify(cli) } }] : [] } });
        if (typeof syncAfterWrite === 'function') { try { syncAfterWrite(editState.contactoId, 'clientes'); } catch (_) {} }
      } catch (_) { /* no bloquear el guardado del servicio si el cliente falla */ }
    }
```

- [ ] **Step 7: Agregar las keys i18n.** Bloque `es` (~2102):

```javascript
    'sheet.edit.section.sectores': '🏢 SECTORES DE ESTE TRABAJO',
    'sheet.edit.section.sectores.hint': 'Elegí los edificios/zonas del cliente que se trabajan en este servicio.',
    'sheet.edit.sectores.add': '+ Agregar',
    'sheet.edit.sectores.none': 'Este cliente no tiene sectores cargados. Agregalos acá o en la ficha del cliente.',
```

Bloque `pt-BR` (~2696):

```javascript
    'sheet.edit.section.sectores': '🏢 SETORES DESTE TRABALHO',
    'sheet.edit.section.sectores.hint': 'Escolha os edifícios/zonas do cliente que serão trabalhados neste serviço.',
    'sheet.edit.sectores.add': '+ Adicionar',
    'sheet.edit.sectores.none': 'Este cliente não tem setores carregados. Adicione aqui ou na ficha do cliente.',
```

- [ ] **Step 8: Verificar Pruebas y Relevamientos (sin código extra).** Confirmar leyendo `createPruebaFromPropuesta` (10577) y `createRelevamientoFromPropuesta` (10617): ambos heredan `Contacto` (10598 / 10638) y al final abren `openEditSheet(created.id)` (10609 / 10650). Por lo tanto el bloque de sectores aparece automáticamente en sus sheets, cargando los sectores del cliente vía `resolveSvcUbicacion`. No se requieren cambios en esas funciones. (Si `editState.contactoId` viene vacío en alguno, el bloque muestra el texto "sin sectores"; no rompe.)

- [ ] **Step 9: Verificar sintaxis**

Run: `cd ~/repos/flyclean-app && npm run check`
Expected: OK / exit 0.

- [ ] **Step 10: Commit**

```bash
cd ~/repos/flyclean-app && git add index.html
git commit -m "feat(sectores): selección de sectores en el sheet del servicio (cubre pruebas/relevamientos)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Docs + bump del service worker

**Files:**
- Modify: `index.html` — el `<!DOCTYPE>`/cualquier indicador no aplica; el cambio es en `sw.js`.
- Modify: `sw.js` — bump de la constante `CACHE` (`flyclean-vN` → `flyclean-v(N+1)`).
- Modify: `docs/NOTION.md` — documentar las properties `Sectores` (Clientes) y `Estado sectores` (Servicios).
- Modify: `docs/FUNCIONALIDADES.md` — anotar la feature de sectores (Fase 0 + 1) feature→función.

- [ ] **Step 1: Bump del SW.** En `sw.js`, localizar `const CACHE = 'flyclean-vN'` y subir el número en uno (ej. v89 → v90). Esto invalida el cache de los clientes instalados para que reciban el `index.html` nuevo.

Run para encontrar la línea: `cd ~/repos/flyclean-app && grep -n "flyclean-v" sw.js | head -1`

- [ ] **Step 2: Documentar properties nuevas** en `docs/NOTION.md`: en la tabla de properties de Servicios agregar fila `Estado sectores | rich_text (JSON) | sectores seleccionados con estado [{id,nombre,estado}]`; y en la sección de Clientes agregar `Sectores | rich_text (JSON) | lista reusable [{id,nombre}]`.

- [ ] **Step 3: Anotar la feature** en `docs/FUNCIONALIDADES.md` (1-2 líneas: "Sectores — lista reusable en el cliente + selección en el servicio/prueba/relevamiento; fix del selector operario manual").

- [ ] **Step 4: Verificar sintaxis general**

Run: `cd ~/repos/flyclean-app && npm run check`
Expected: OK / exit 0.

- [ ] **Step 5: Commit**

```bash
cd ~/repos/flyclean-app && git add sw.js docs/NOTION.md docs/FUNCIONALIDADES.md
git commit -m "docs(sectores): bump sw + properties Sectores/Estado sectores + feature

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Notas para la verificación de Diego (post-deploy)

- **Fase 0:** en un servicio donde Juan Pablo sea el piloto, ahora aparece también como opción de Operario manual; al elegirlo como manual, se quita de piloto (una persona, un rol). El botón "+ nuevo operario" ya funciona en la columna de Operario manual.
- **Fase 1:** en la ficha de un cliente, cargar 2-3 sectores; abrir/crear un servicio de ese cliente y confirmar que los sectores aparecen para seleccionar; agregar uno nuevo desde el servicio y confirmar que queda en la ficha del cliente para la próxima.
- **Fases 2 y 3** (operativa del operario + jornadas Forma 2) van en un plan aparte, después de tu feedback operativo.
