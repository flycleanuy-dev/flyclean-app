# Coordinador autónomo — crear suelto + 3 campos — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que el coordinador pueda crear un servicio/relevamiento/prueba suelto (sin propuesta) y editar Tipo de servicio / Notas pre-servicio / Observación cliente desde la app, para no depender de Notion — sin romper nada.

**Architecture:** Todo en `index.html` (PWA single-file). Una pantalla nueva de alta (modelada en el alta de propuesta, con buscador/creador de cliente) crea la ficha y abre el sheet de edición existente. Se agregan 3 campos al sheet de edición. Bump de `sw.js` al final.

**Tech Stack:** HTML/CSS/JS vanilla; Notion API vía proxy; i18n `TRANSLATIONS` (es + pt-BR); Service Worker cache.

## Global Constraints

- **⚠️ NO ROMPER LO EXISTENTE:** app de un solo archivo. Edición por match EXACTO del string mostrado. El alta de propuesta (`savePropEdit`), el sheet de edición actual y el flujo del operario quedan idénticos.
- **Un solo archivo de app:** cambios en `index.html`, salvo bump de `sw.js` (Task 5).
- **i18n en DOS idiomas:** toda string nueva con key en el bloque **es** y **pt-BR**, vía `t('key')`.
- **Sin harness de tests:** gate por tarea = **`npm run check`**. Cada tarea incluye verificación manual + traza de retrocompat.
- **Sin properties Notion nuevas.** Reutiliza `Nombre del servicio`, `Estado`, `Tipo de registro`, `Tipo de servicio`, `Fecha programada`, `Contacto`, `País`, `Notas pre-servicio`, `Observación cliente`.
- **POST de servicio usa `data_source_id`** (Servicios es multi-source): `callNotion('pages','POST', { parent: { type:'data_source_id', data_source_id: SERVICIOS_DS_ID }, properties })`.
- **Update optimista:** tras crear, `_coordAllServices.unshift(created)` + `renderCoordList()` + `openEditSheet(created.id)` (mismo patrón que `createServicioFromPropuesta`).
- **Working dir:** `~/repos/flyclean-app`. Rama: `feat/coord-autonomo` (ya creada; spec ya commiteado).

Spec: `docs/superpowers/specs/2026-07-01-coordinador-autonomo-crear-suelto-design.md`.

---

## File Structure

- `index.html`:
  - i18n `TRANSLATIONS` (es + pt): keys nuevas (Task 1).
  - HTML estático: `new-service-overlay` nuevo, modelado en `prop-overlay` (~1394); 3 secciones nuevas en `edit-overlay` (entre LUGAR ~1326 y `edit-cliente-ubicacion` ~1327) (Task 4).
  - JS: `newSvcState` + `openNewServiceSheet` + picker de cliente + `resolveOrCreateClienteId` + `submitNewService` + `closeNewServiceSheet`/`newServiceOverlayClick` (Task 2).
  - JS: botón "＋ Nuevo" en la lista de Servicios + botón en `buildContactSheetBody` + `openNewServiceSheetForContact` (Task 3).
  - JS: `editState` (openEditSheet ~9638) carga 3 campos; `saveServiceEdit` (~10283) guarda 3 campos (Task 4).
- `sw.js`: bump `flyclean-v100` → `flyclean-v101` (Task 5).
- `docs/FUNCIONALIDADES.md` (Task 5).

---

### Task 1: Strings i18n (es + pt-BR)

**Files:** Modify `index.html` (bloque es + pt-BR).

**Interfaces:**
- Produces: keys usadas por Tasks 2, 3, 4.

- [ ] **Step 1: Agregar las keys en el bloque español**

Localizar la línea es `    'sheet.contact.sectores.add': '+ Agregar',` e insertar **inmediatamente después**:
```javascript
    'sheet.newsvc.title': 'Nuevo trabajo',
    'sheet.newsvc.sub': 'Servicio / relevamiento / prueba (sin propuesta)',
    'sheet.newsvc.section.tipo': 'TIPO',
    'sheet.newsvc.section.nombre': 'NOMBRE DEL TRABAJO *',
    'sheet.newsvc.nombre.placeholder': 'Ej: Limpieza fachada Torre Sur',
    'sheet.newsvc.section.tiposervicio': 'TIPO DE SERVICIO',
    'sheet.newsvc.section.fecha': 'FECHA PROGRAMADA',
    'sheet.newsvc.error.nombre': 'Poné un nombre para el trabajo.',
    'sheet.newsvc.error.cliente': 'Elegí un cliente o cargá uno nuevo.',
    'coord.new.servicio': '＋ Nuevo trabajo',
    'sheet.contact.new.servicio': '＋ Nuevo trabajo para este cliente',
    'sheet.edit.section.tiposervicio': 'TIPO DE SERVICIO',
    'sheet.edit.section.notaspre': '📝 NOTAS PARA EL OPERARIO (antes del trabajo)',
    'sheet.edit.section.obscliente': '🗒️ OBSERVACIÓN PARA EL CLIENTE (va en el PDF)',
```

- [ ] **Step 2: Agregar las keys en el bloque portugués (pt-BR)**

Localizar la línea pt `    'sheet.contact.sectores.add': '+ Adicionar',` (el equivalente pt de la key de arriba; si el valor difiere, ubicar por la key `'sheet.contact.sectores.add'`) e insertar **inmediatamente después**:
```javascript
    'sheet.newsvc.title': 'Novo trabalho',
    'sheet.newsvc.sub': 'Serviço / levantamento / teste (sem proposta)',
    'sheet.newsvc.section.tipo': 'TIPO',
    'sheet.newsvc.section.nombre': 'NOME DO TRABALHO *',
    'sheet.newsvc.nombre.placeholder': 'Ex: Limpeza fachada Torre Sul',
    'sheet.newsvc.section.tiposervicio': 'TIPO DE SERVIÇO',
    'sheet.newsvc.section.fecha': 'DATA PROGRAMADA',
    'sheet.newsvc.error.nombre': 'Coloque um nome para o trabalho.',
    'sheet.newsvc.error.cliente': 'Escolha um cliente ou cadastre um novo.',
    'coord.new.servicio': '＋ Novo trabalho',
    'sheet.contact.new.servicio': '＋ Novo trabalho para este cliente',
    'sheet.edit.section.tiposervicio': 'TIPO DE SERVIÇO',
    'sheet.edit.section.notaspre': '📝 NOTAS PARA O OPERÁRIO (antes do trabalho)',
    'sheet.edit.section.obscliente': '🗒️ OBSERVAÇÃO PARA O CLIENTE (vai no PDF)',
```

- [ ] **Step 3: Verificar sintaxis**

Run: `cd ~/repos/flyclean-app && npm run check`
Expected: PASS.

- [ ] **Step 4: Verificar keys en ambos idiomas**

Run: `cd ~/repos/flyclean-app && for k in sheet.newsvc.title coord.new.servicio sheet.edit.section.tiposervicio sheet.edit.section.notaspre sheet.edit.section.obscliente sheet.contact.new.servicio; do echo "$k -> $(grep -c "'$k'" index.html)"; done`
Expected: cada key → `2`.

- [ ] **Step 5: Commit**

```bash
cd ~/repos/flyclean-app && git add index.html
git commit -m "feat(coord-auto): i18n alta de trabajo suelto + 3 campos del sheet (es+pt)"
```

---

### Task 2: Pantalla de alta de trabajo suelto (overlay + estado + crear)

**Contexto histórico:** el alta de propuesta suelta (`openNewPropSheet` ~11065 + `propClienteSectionHTML`/`propClienteInputsHTML`/`propClienteChanged`/`loadPropContactos` + `savePropEdit` ~11435) es el patrón a copiar: una pantalla con un `<select>` de clientes existentes (de `_coordAllContacts`/`_propContactos`) + opción "➕ Nuevo cliente" con inputs de nombre/tel/email, y al guardar resuelve/crea el cliente (dedup por tel/email) antes de crear el registro. `createServicioFromPropuesta` (~11222) muestra el POST de servicio (`data_source_id`, `SERVICIOS_DS_ID`) + el update optimista + `openEditSheet`. El overlay estático se modela en `prop-overlay` (~1394). Reutilizamos todo eso para un alta de **trabajo** (servicio/relevamiento/prueba) SIN propuesta.

**Files:** Modify `index.html` — agregar el HTML `new-service-overlay` (junto a `prop-overlay`, ~línea 1406) y las funciones JS (junto a las de propuesta, ~línea 11064 antes de `openNewPropSheet`, o después de `createServicioFromPropuesta`).

**Interfaces:**
- Consumes: `_coordAllContacts`/`_propContactos`, `CONTACTOS_DB_ID`, `SERVICIOS_DS_ID`, `callNotion`, `updateServiceProps`, `openEditSheet`, `renderCoordServicios`, `renderCoordList`, `setCoordTab`, `selectedCountry`, `COUNTRY_NOTION_MAP`, `esc`, `t`, keys i18n (Task 1).
- Produces: `openNewServiceSheet(prefillContactId)`, `submitNewService()`, `resolveOrCreateClienteId(state)`, `closeNewServiceSheet()`, `newServiceOverlayClick(e)`, estado `newSvcState`.

- [ ] **Step 1: Agregar el overlay estático `new-service-overlay`**

Localizar el cierre del `prop-overlay` en el HTML estático (después de su `</div>` de cierre, ~línea 1406, justo antes de `<div class="edit-overlay" id="contact-overlay"`). Insertar **antes** de `contact-overlay`:
```html
    <div class="edit-overlay" id="new-service-overlay" onclick="newServiceOverlayClick(event)">
      <div class="edit-sheet" id="new-service-sheet">
        <button class="sheet-close-btn" type="button" aria-label="Cerrar" onclick="closeNewServiceSheet()">×</button>
        <div class="edit-sheet-handle"></div>
        <div class="edit-sheet-header">
          <div class="edit-sheet-title" id="new-service-sheet-title" data-i18n="sheet.newsvc.title">Nuevo trabajo</div>
          <div class="edit-sheet-sub" id="new-service-sheet-sub" data-i18n="sheet.newsvc.sub"></div>
        </div>
        <div id="new-service-sheet-body"></div>
        <button class="edit-save-btn" id="new-service-save-btn" data-i18n="btn.create.notion" onclick="submitNewService()">✨ Crear</button>
      </div>
    </div>
```

- [ ] **Step 2: Agregar las funciones JS del alta**

Localizar `async function createServicioFromPropuesta(propPageId) {` (~11222). Insertar **inmediatamente antes** de esa función:
```javascript
// ── Alta de TRABAJO suelto (servicio/relevamiento/prueba) SIN propuesta ──
let newSvcState = null;

function newSvcClienteInputsHTML() {
  const s = newSvcState;
  const esNuevo = !s.clienteSel || s.clienteSel === '__new__';
  const inp = (ph, key, type) => `<input type="${type}" class="edit-date-input" style="margin-top:6px" placeholder="${ph}" value="${esc(s[key] || '')}" oninput="newSvcState.${key}=this.value"/>`;
  return (esNuevo ? inp('Nombre del cliente', 'nombreCliente', 'text') : '') +
    inp('📞 Teléfono / WhatsApp', 'tel', 'tel') +
    inp('✉️ Email', 'email', 'email');
}

function newSvcClienteSectionHTML() {
  return `<div class="edit-section"><div class="edit-section-label">👤 Cliente</div>
    <select id="newsvc-cliente-select" class="edit-date-input" onchange="newSvcClienteChanged(this.value)">
      <option value="__new__">➕ Nuevo cliente</option>
      <option value="" disabled>cargando clientes…</option>
    </select>
    <div id="newsvc-cliente-fields">${newSvcClienteInputsHTML()}</div></div>`;
}

function newSvcClienteChanged(val) {
  newSvcState.clienteSel = val || '__new__';
  if (val && val !== '__new__') {
    const c = (_propContactos || _coordAllContacts || []).find(x => x.id === val);
    if (c) {
      newSvcState.nombreCliente = c.properties?.['Nombre / Empresa']?.title?.[0]?.plain_text || '';
      newSvcState.tel = c.properties?.['Teléfono / WhatsApp']?.phone_number || '';
      newSvcState.email = c.properties?.['Email']?.email || '';
      newSvcState.pais = c.properties?.['País']?.select?.name || newSvcState.pais;
    }
  } else {
    newSvcState.nombreCliente = ''; newSvcState.tel = ''; newSvcState.email = '';
  }
  const w = document.getElementById('newsvc-cliente-fields');
  if (w) w.innerHTML = newSvcClienteInputsHTML();
}

async function loadNewSvcContactos() {
  try {
    if (!_propContactos) {
      if (Array.isArray(_coordAllContacts) && _coordAllContacts.length) _propContactos = _coordAllContacts;
      else { const d = await callNotion(`databases/${CONTACTOS_DB_ID}/query`, 'POST', { sorts: [{ property: 'Nombre / Empresa', direction: 'ascending' }] }); _propContactos = d.results || []; }
    }
    const sel = document.getElementById('newsvc-cliente-select');
    if (!sel) return;
    const cur = newSvcState.clienteSel || '__new__';
    const tit = c => c.properties?.['Nombre / Empresa']?.title?.[0]?.plain_text || '(sin nombre)';
    sel.innerHTML = '<option value="__new__">➕ Nuevo cliente</option>' +
      _propContactos.slice().sort((a, b) => tit(a).localeCompare(tit(b))).map(c => `<option value="${esc(c.id)}">${esc(tit(c))}</option>`).join('');
    sel.value = cur;
    if (cur !== '__new__') newSvcClienteChanged(cur);
  } catch (e) { /* el form sirve igual (queda "Nuevo cliente") */ }
}

// Resuelve el cliente elegido, o dedup/crea uno nuevo. Devuelve su id (o null si no hay datos).
async function resolveOrCreateClienteId(s) {
  if (s.clienteSel && s.clienteSel !== '__new__') {
    const upd = {};
    if (s.tel) upd['Teléfono / WhatsApp'] = { phone_number: s.tel };
    if (s.email) upd['Email'] = { email: s.email };
    if (Object.keys(upd).length) { try { await updateServiceProps(s.clienteSel, upd); } catch (_) {} }
    return s.clienteSel;
  }
  const nombreCli = (s.nombreCliente || '').trim();
  if (!nombreCli && !s.tel && !s.email) return null;
  // Dedup por tel/email
  const orf = [];
  if (s.tel) orf.push({ property: 'Teléfono / WhatsApp', phone_number: { equals: s.tel } });
  if (s.email) orf.push({ property: 'Email', email: { equals: s.email } });
  if (orf.length) {
    const dup = await callNotion(`databases/${CONTACTOS_DB_ID}/query`, 'POST', { filter: orf.length === 1 ? orf[0] : { or: orf }, page_size: 1 }).catch(() => ({ results: [] }));
    if (dup.results && dup.results.length) return dup.results[0].id;
  }
  const cprops = {
    'Nombre / Empresa': { title: [{ text: { content: nombreCli || 'Cliente s/n' } }] },
    'Estado': { select: { name: '🆕 Lead' } },
  };
  if (s.pais) cprops['País'] = { select: { name: s.pais } };
  if (s.tel) cprops['Teléfono / WhatsApp'] = { phone_number: s.tel };
  if (s.email) cprops['Email'] = { email: s.email };
  const nc = await callNotion('pages', 'POST', { parent: { database_id: CONTACTOS_DB_ID }, properties: cprops });
  _propContactos = null;
  return nc && nc.id;
}

function newServiceOverlayClick(e) { if (e.target.id === 'new-service-overlay') closeNewServiceSheet(); }
function closeNewServiceSheet() { document.getElementById('new-service-overlay').classList.remove('open'); }

function openNewServiceSheet(prefillContactId = null) {
  const today = new Date();
  const hoyISO = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const paisCoord = COUNTRY_NOTION_MAP[selectedCountry] || '';
  newSvcState = { tipoRegistro: '📋 Orden de trabajo', clienteSel: prefillContactId || '__new__', nombreCliente: '', tel: '', email: '', nombre: '', tipoServicio: '', fecha: hoyISO, pais: paisCoord };

  const TIPOS_REG = [
    { label: '🏢 Servicio', val: '📋 Orden de trabajo' },
    { label: '🔍 Relevamiento', val: '🔍 Relevamiento' },
    { label: '🧪 Prueba', val: '🧪 Prueba' },
  ];
  const TIPOS_SVC = ['🏢 Fachada', '🪟 Vidrios', '☀️ Paneles solares'];
  const tipoRegBtns = TIPOS_REG.map(o => `<button class="estado-btn ${newSvcState.tipoRegistro === o.val ? 'active' : ''}" onclick="newSvcSetTipoReg(this,'${o.val.replace(/'/g,"\\'")}')">${o.label}</button>`).join('');
  const tipoSvcBtns = TIPOS_SVC.map(o => `<button class="estado-btn ${newSvcState.tipoServicio === o ? 'active' : ''}" onclick="newSvcSetTipoSvc(this,'${o.replace(/'/g,"\\'")}')">${o}</button>`).join('');

  document.getElementById('new-service-sheet-body').innerHTML =
    `<div class="edit-section"><div class="edit-section-label">${t('sheet.newsvc.section.tipo')}</div><div class="estado-btns" id="newsvc-tiporeg-btns">${tipoRegBtns}</div></div>` +
    newSvcClienteSectionHTML() +
    `<div class="edit-section"><div class="edit-section-label">${t('sheet.newsvc.section.nombre')}</div>
      <input type="text" class="edit-date-input" placeholder="${t('sheet.newsvc.nombre.placeholder')}" oninput="newSvcState.nombre=this.value" style="font-size:14px"/></div>` +
    `<div class="edit-section"><div class="edit-section-label">${t('sheet.newsvc.section.tiposervicio')}</div><div class="estado-btns" id="newsvc-tiposvc-btns">${tipoSvcBtns}</div></div>` +
    `<div class="edit-section"><div class="edit-section-label">${t('sheet.newsvc.section.fecha')}</div>
      <input type="date" class="edit-date-input" value="${newSvcState.fecha}" onchange="newSvcState.fecha=this.value"/></div>`;

  const btn = document.getElementById('new-service-save-btn');
  btn.textContent = t('btn.create.notion'); btn.disabled = false;
  document.getElementById('new-service-overlay').classList.add('open');
  loadNewSvcContactos();
}

function newSvcSetTipoReg(el, val) {
  newSvcState.tipoRegistro = val;
  document.querySelectorAll('#newsvc-tiporeg-btns .estado-btn').forEach(b => b.classList.remove('active'));
  if (el) el.classList.add('active');
}
function newSvcSetTipoSvc(el, val) {
  newSvcState.tipoServicio = val;
  document.querySelectorAll('#newsvc-tiposvc-btns .estado-btn').forEach(b => b.classList.remove('active'));
  if (el) el.classList.add('active');
}

async function submitNewService() {
  const btn = document.getElementById('new-service-save-btn');
  const s = newSvcState;
  if (!(s.nombre || '').trim()) { alert(t('sheet.newsvc.error.nombre')); return; }
  const clienteNuevoSinDatos = (s.clienteSel === '__new__') && !(s.nombreCliente || '').trim() && !s.tel && !s.email;
  if (clienteNuevoSinDatos) { alert(t('sheet.newsvc.error.cliente')); return; }
  btn.textContent = t('btn.saving.notion'); btn.disabled = true;
  try {
    const clienteId = await resolveOrCreateClienteId(s);
    const properties = {
      'Nombre del servicio': { title: [{ text: { content: s.nombre.trim() } }] },
      'Estado': { select: { name: '📋 Pendiente' } },
      'Tipo de registro': { select: { name: s.tipoRegistro } },
      'Fecha programada': { date: { start: s.fecha } },
    };
    if (s.tipoServicio) properties['Tipo de servicio'] = { select: { name: s.tipoServicio } };
    if (s.pais) properties['País'] = { select: { name: s.pais } };
    if (clienteId) properties['Contacto'] = { relation: [{ id: clienteId }] };
    const created = await callNotion('pages', 'POST', { parent: { type: 'data_source_id', data_source_id: SERVICIOS_DS_ID }, properties });
    closeNewServiceSheet();
    const tab = s.tipoRegistro.includes('Relevamiento') ? 'relevamientos' : (s.tipoRegistro.includes('Prueba') ? 'pruebas' : 'servicios');
    if (typeof setCoordTab === 'function') setCoordTab(tab);
    await renderCoordServicios();
    if (Array.isArray(_coordAllServices) && !_coordAllServices.some(x => x.id === created.id)) {
      _coordAllServices.unshift(created);
      if (typeof renderCoordList === 'function') renderCoordList();
    }
    setTimeout(() => { if (typeof openEditSheet === 'function') openEditSheet(created.id); }, 400);
  } catch (e) {
    btn.textContent = t('btn.create.notion'); btn.disabled = false;
    alert(t('sheet.prop.create.error') + ' ' + (e.message || ''));
  }
}
```

- [ ] **Step 3: Verificar sintaxis**

Run: `cd ~/repos/flyclean-app && npm run check`
Expected: PASS.

- [ ] **Step 4: Verificación de retrocompat (por lectura)**

Confirmar: (a) `savePropEdit` y el alta de propuesta NO se tocaron (las funciones nuevas son `newSvc*`/`submitNewService`/`resolveOrCreateClienteId`, no reemplazan nada); (b) el POST de servicio usa `data_source_id` + `SERVICIOS_DS_ID` (igual que `createServicioFromPropuesta`); (c) tras crear, update optimista + `openEditSheet` (igual patrón); (d) el `Tipo de registro` sale del selector (Orden/Relevamiento/Prueba) → el flujo del operario para cada tipo queda igual; (e) si el cliente es nuevo sin datos, valida y no crea basura.

- [ ] **Step 5: Commit**

```bash
cd ~/repos/flyclean-app && git add index.html
git commit -m "feat(coord-auto): alta de trabajo suelto (servicio/relev/prueba) sin propuesta"
```

---

### Task 3: Botones "＋ Nuevo trabajo" (tab Servicios + ficha del cliente)

**Contexto histórico:** el patrón de botón "＋ nuevo" en un header de tab es `<div style="padding:12px 16px 0"><button class="nueva-prop-btn" onclick="openNewPropSheet()">…</button></div>`, usado en Propuestas (`renderCoordPropuestasList`) y Contactos (`renderContactList`). La lista de Servicios del coordinador se dibuja en `renderCoordServicios`/`renderCoordList` (~9254). La ficha del cliente se arma en `buildContactSheetBody(mode)` (~11649); `editingContact` es la variable global del contacto abierto. Agregamos un botón en la lista de Servicios y otro en la ficha del cliente (modo edit).

**Files:** Modify `index.html` — la lista de la tab Servicios (`renderCoordServicios`/`renderCoordList`) y `buildContactSheetBody` (~final, modo edit).

**Interfaces:**
- Consumes: `openNewServiceSheet` (Task 2), `t('coord.new.servicio')`, `t('sheet.contact.new.servicio')`, `editingContact`.
- Produces: `openNewServiceSheetForContact(id)`.

- [ ] **Step 1: Botón "＋ Nuevo trabajo" en la tab Servicios**

Ubicar dónde `renderCoordServicios` (o el `renderCoordList` que dibuja la lista de la tab **servicios**) arma el `content.innerHTML`. Insertar el botón **al principio** de esa lista, SOLO para la tab servicios. Leer el código exacto y agregar, arriba de la lista:
```javascript
`<div style="padding:12px 16px 0"><button class="nueva-prop-btn" onclick="openNewServiceSheet()">${t('coord.new.servicio')}</button></div>`
```
(Si el render es compartido con otras tabs, gatear con `activeCoordTab === 'servicios'`. El botón abre la pantalla de alta con el selector de tipo, así que uno solo cubre servicio/relevamiento/prueba.)

- [ ] **Step 2: Agregar `openNewServiceSheetForContact` + botón en la ficha del cliente**

En el JS, cerca de `openNewServiceSheet`, agregar:
```javascript
function openNewServiceSheetForContact(contactId) {
  closeContactSheet();
  setTimeout(() => openNewServiceSheet(contactId || null), 250);
}
```

En `buildContactSheetBody(mode)` (~11649), localizar el bloque FINAL que en modo edit agrega el historial:
```javascript
    (mode === 'edit'
      ? `<div class="edit-section" style="padding-bottom:0"><div class="edit-section-label">${t('contact.history.title')}</div>
          <div id="contact-history-container"><div class="history-loading">${t('contact.history.loading')}</div></div>
         </div>`
      : '');
```
Reemplazarlo por (agrega el botón "＋ Nuevo trabajo para este cliente" antes del historial):
```javascript
    (mode === 'edit'
      ? `<div class="edit-section"><button class="nueva-prop-btn" style="width:100%" onclick="openNewServiceSheetForContact(editingContact && editingContact.id)">${t('sheet.contact.new.servicio')}</button></div>` +
        `<div class="edit-section" style="padding-bottom:0"><div class="edit-section-label">${t('contact.history.title')}</div>
          <div id="contact-history-container"><div class="history-loading">${t('contact.history.loading')}</div></div>
         </div>`
      : '');
```

- [ ] **Step 3: Verificar sintaxis**

Run: `cd ~/repos/flyclean-app && npm run check`
Expected: PASS.

- [ ] **Step 4: Verificación de retrocompat (por lectura)**

Confirmar: (a) el botón de Servicios solo se agrega a esa lista (no afecta otras tabs); (b) el botón del cliente solo aparece en modo edit (no en alta de cliente), y `editingContact.id` es el cliente abierto → `openNewServiceSheet` lo recibe pre-elegido; (c) el resto de `buildContactSheetBody` (historial, sectores, campos) queda igual.

- [ ] **Step 5: Commit**

```bash
cd ~/repos/flyclean-app && git add index.html
git commit -m "feat(coord-auto): botones '＋ Nuevo trabajo' en Servicios y en la ficha del cliente"
```

---

### Task 4: 3 campos editables en el sheet de edición del servicio

**Contexto histórico:** el `edit-overlay` estático (~1272-1351) tiene secciones (nombre, estado, piloto, ayudantes, sectores, fecha, hora, LUGAR, `edit-cliente-ubicacion`…). `openEditSheet` (~9610) arma `editState` (~9638) leyendo las properties actuales. `saveServiceEdit` (~10239) arma `props` y hace `updateServiceProps` (el `const updated = await updateServiceProps(...)` está ~10284). Agregamos 3 campos: `Tipo de servicio` (select), `Notas pre-servicio` (rich_text), `Observación cliente` (rich_text).

**Files:** Modify `index.html` — HTML del `edit-overlay` (entre LUGAR ~1326 y `edit-cliente-ubicacion` ~1327), `openEditSheet` (editState ~9638 + set de valores), `saveServiceEdit` (~antes de 10284).

**Interfaces:**
- Consumes: `t('sheet.edit.section.tiposervicio'/'notaspre'/'obscliente')` (Task 1).
- Produces: `editState.tipoServicio` / `editState.notasPreServicio` / `editState.observacionCliente`.

- [ ] **Step 1: Agregar los 3 campos al HTML del edit-overlay**

Localizar en el `edit-overlay` estático la sección de LUGAR seguida de `edit-cliente-ubicacion`:
```html
    <div class="edit-section">
      <div class="edit-section-label" data-i18n="sheet.edit.section.lugar">LUGAR</div>
      <input type="text" class="edit-date-input" id="edit-lugar" placeholder="Ej. Edificio Trento, Carrasco" oninput="editState.lugar=this.value"/>
    </div>
    <div class="edit-section" id="edit-cliente-ubicacion"></div>
```
Reemplazar por (agrega Tipo de servicio + Notas pre + Observación cliente entre LUGAR y edit-cliente-ubicacion):
```html
    <div class="edit-section">
      <div class="edit-section-label" data-i18n="sheet.edit.section.lugar">LUGAR</div>
      <input type="text" class="edit-date-input" id="edit-lugar" placeholder="Ej. Edificio Trento, Carrasco" oninput="editState.lugar=this.value"/>
    </div>
    <div class="edit-section">
      <div class="edit-section-label" data-i18n="sheet.edit.section.tiposervicio">TIPO DE SERVICIO</div>
      <div class="estado-btns" id="edit-tiposervicio-btns"></div>
    </div>
    <div class="edit-section">
      <div class="edit-section-label" data-i18n="sheet.edit.section.notaspre">📝 NOTAS PARA EL OPERARIO (antes del trabajo)</div>
      <textarea class="edit-date-input" id="edit-notaspre" rows="3" style="resize:none;height:70px" oninput="editState.notasPreServicio=this.value"></textarea>
    </div>
    <div class="edit-section">
      <div class="edit-section-label" data-i18n="sheet.edit.section.obscliente">🗒️ OBSERVACIÓN PARA EL CLIENTE (va en el PDF)</div>
      <textarea class="edit-date-input" id="edit-obscliente" rows="3" style="resize:none;height:70px" oninput="editState.observacionCliente=this.value"></textarea>
    </div>
    <div class="edit-section" id="edit-cliente-ubicacion"></div>
```

- [ ] **Step 2: Cargar los valores actuales en `editState` (openEditSheet)**

En `openEditSheet`, localizar el objeto `editState = { ... _sectoresClienteDirty: false, _sectoresClienteLoaded: false };` (~9638-9642). Agregar 3 campos al objeto (antes del cierre `}`):
```javascript
    tipoServicio: props['Tipo de servicio']?.select?.name || '',
    notasPreServicio: props['Notas pre-servicio']?.rich_text?.[0]?.plain_text || '',
    observacionCliente: props['Observación cliente']?.rich_text?.[0]?.plain_text || '',
```
Luego, después de la línea `document.getElementById('edit-lugar').value = lugar;` (~9670), agregar el pintado de los 3 campos:
```javascript
  const TIPOS_SVC_EDIT = ['🏢 Fachada', '🪟 Vidrios', '☀️ Paneles solares'];
  const tsEl = document.getElementById('edit-tiposervicio-btns');
  if (tsEl) tsEl.innerHTML = TIPOS_SVC_EDIT.map(o => `<button class="estado-btn ${editState.tipoServicio === o ? 'active' : ''}" onclick="selectEditTipoServicio('${o.replace(/'/g,"\\'")}')">${o}</button>`).join('');
  const npEl = document.getElementById('edit-notaspre'); if (npEl) npEl.value = editState.notasPreServicio || '';
  const ocEl = document.getElementById('edit-obscliente'); if (ocEl) ocEl.value = editState.observacionCliente || '';
```
Y agregar el handler del selector (cerca de `selectEditEstado`, que ya existe):
```javascript
function selectEditTipoServicio(val) {
  editState.tipoServicio = val;
  document.querySelectorAll('#edit-tiposervicio-btns .estado-btn').forEach(b => b.classList.toggle('active', b.textContent.trim() === val));
}
```

- [ ] **Step 3: Guardar los 3 campos en `saveServiceEdit`**

En `saveServiceEdit`, localizar el bloque de `Estado sectores` y la línea siguiente `const updated = await updateServiceProps(editingService.id, props);` (~10283). Insertar **antes** de esa línea:
```javascript
    if (editState.tipoServicio) props['Tipo de servicio'] = { select: { name: editState.tipoServicio } };
    props['Notas pre-servicio'] = editState.notasPreServicio ? { rich_text: [{ text: { content: editState.notasPreServicio } }] } : { rich_text: [] };
    props['Observación cliente'] = editState.observacionCliente ? { rich_text: [{ text: { content: editState.observacionCliente } }] } : { rich_text: [] };
```

- [ ] **Step 4: Verificar sintaxis**

Run: `cd ~/repos/flyclean-app && npm run check`
Expected: PASS.

- [ ] **Step 5: Verificación de retrocompat (por lectura)**

Confirmar: (a) los 3 campos se cargan del valor actual (si estaban vacíos, quedan vacíos); (b) al guardar, `Tipo de servicio` solo se escribe si hay valor; `Notas pre-servicio`/`Observación cliente` se escriben (vacío = rich_text vacío, no rompe); (c) el resto de `saveServiceEdit` (nombre, estado, fecha, hora, lugar, piloto, ayudantes, sectores, cliente) queda idéntico; (d) el paso del PDF que ya edita `Observación cliente` sigue funcionando (ahora hay 2 lugares que la escriben, ambos válidos).

- [ ] **Step 6: Commit**

```bash
cd ~/repos/flyclean-app && git add index.html
git commit -m "feat(coord-auto): editar Tipo de servicio / Notas pre-servicio / Observación cliente en el sheet"
```

---

### Task 5: Bump sw v101 + docs + verificación final

**Files:** Modify `sw.js`, `docs/FUNCIONALIDADES.md`.

- [ ] **Step 1: Bump del Service Worker**

En `sw.js`, localizar `const CACHE = 'flyclean-v100';` y reemplazar por (agregar comentario en la línea anterior):
```javascript
// v101: coordinador autónomo — crear servicio/relevamiento/prueba SUELTO (sin propuesta, botón "＋ Nuevo trabajo" en Servicios y en la ficha del cliente) + editar Tipo de servicio / Notas pre-servicio / Observación cliente desde el sheet.
const CACHE = 'flyclean-v101';
```

- [ ] **Step 2: Verificar sintaxis (ambos)**

Run: `cd ~/repos/flyclean-app && npm run check && node --check sw.js && echo "sw OK"`
Expected: PASS + `sw OK`.

- [ ] **Step 3: Actualizar `docs/FUNCIONALIDADES.md`**

Insertar, justo ANTES de la línea `---` del footer:
```markdown
## Coordinador autónomo (sw v101)

- **Crear trabajo suelto:** botón "＋ Nuevo trabajo" en la tab Servicios y en la ficha del cliente → pantalla que crea un servicio / relevamiento / prueba SIN propuesta previa (elige cliente existente o crea uno nuevo, tipo de servicio, fecha) → crea la ficha y abre el sheet de edición. Reusa el patrón del alta de propuesta (`openNewServiceSheet`/`submitNewService`/`resolveOrCreateClienteId`) + el POST `data_source_id` de `createServicioFromPropuesta`.
- **Campos editables nuevos en el sheet del servicio:** `Tipo de servicio` (Fachada/Vidrios/Paneles), `Notas pre-servicio` (instrucciones al operario), `Observación cliente` (la del PDF) — antes solo se podían tocar en Notion o en el generador de PDF.
- Objetivo: el coordinador ya no necesita Notion para su operación diaria (Notion queda de respaldo).
```
(Si no existe, saltear.)

- [ ] **Step 4: Verificación final completa**

Run: `cd ~/repos/flyclean-app && npm run check && npm test && node --check sw.js`
Expected: `npm run check` PASS, smoke 3/3, `node --check sw.js` OK.

- [ ] **Step 5: Commit**

```bash
cd ~/repos/flyclean-app && git add sw.js docs/FUNCIONALIDADES.md
git commit -m "chore(coord-auto): bump sw v101 + docs"
```

---

## Self-Review

**1. Spec coverage:**
- #1 Crear servicio/relev/prueba suelto (botón en Servicios + cliente) → Tasks 2 + 3. ✓
- #2 Editar Tipo de servicio → Task 4. ✓
- #3 Editar Notas pre-servicio → Task 4. ✓
- #4 Editar Observación cliente → Task 4. ✓
- i18n → Task 1. Bump sw + docs → Task 5. ✓
- Fuera de alcance (filtro por cliente, archivar cliente, intermediario en alta, kanban drag) → sin tareas. ✓

**2. Placeholder scan:** sin "TBD/TODO". El único punto con flexibilidad es la ubicación exacta del botón "＋ Nuevo" en la lista de Servicios (Task 3 Step 1: "leer el código exacto y agregar arriba de la lista, gateado a la tab servicios") — es un botón aditivo de bajo riesgo con el HTML dado. El resto es old→new completo.

**3. Type consistency:** `newSvcState` (Task 2) campos consistentes; `resolveOrCreateClienteId(s)` firma usada en `submitNewService`; `openNewServiceSheet(prefillContactId)` / `openNewServiceSheetForContact(id)` (Task 3) coherentes; `editState.tipoServicio`/`notasPreServicio`/`observacionCliente` definidos en Task 4 Step 2 y usados en Step 3; keys i18n de Task 1 usadas en Tasks 2/3/4. ✓

Sin gaps.
