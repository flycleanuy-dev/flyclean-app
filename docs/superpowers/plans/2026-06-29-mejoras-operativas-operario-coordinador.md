# Mejoras operativas (operario + coordinador) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
> Ejecutar **una fase por vez** (A → B → C); cada fase termina en un deploy y se prueba antes de seguir.

**Goal:** Cubrir 5 pedidos operativos del equipo de campo y coordinación: método de trabajo (dron/manual),
ubicación heredable desde el cliente, 3 botones de propuesta siempre visibles, operario manual + cliente con
ubicación en el sheet del servicio, y blindaje del flujo del operario contra apagones.

**Architecture:** PWA single-file (`index.html`, sin framework ni build step). Cambios localizados en funciones
existentes + 6 properties nuevas en Notion. Notion sigue siendo la fuente de datos vía el proxy `/api/notion`.
Tres fases independientes y desplegables, en orden de riesgo creciente.

**Tech Stack:** HTML/CSS/JS vanilla, i18n en objeto `TRANSLATIONS` (es + pt-BR), Notion API vía proxy, Service
Worker con cache versionado, Vercel (deploy por push a `main`).

**Spec:** `docs/superpowers/specs/2026-06-29-mejoras-operativas-operario-coordinador-design.md`

## Global Constraints

- **Archivo único:** todo el frontend es `index.html`. Las tareas que lo tocan se ejecutan **secuencialmente** (no
  editar en paralelo el mismo archivo).
- **Verificación real (NO existe TDD unitario; NO inventar pytest/jest):**
  - `npm run check` (= `node tests/check-html.mjs`) tras CADA cambio → "✅ index.html: N bloque(s) <script> parsean OK".
  - `npm test` (= `node tests/smoke.mjs`, read-only) antes del deploy de cada fase.
  - Verificación funcional/visual con Playwright o chrome-devtools-mcp; writes a Notion verificados con MCP Notion.
- **Property-then-deploy:** crear la property en Notion (Task 0 de cada fase) **antes** de deployar el código que la
  escribe. Si la property no existe, el PATCH la ignora en silencio (parece "no anda").
- **Service Worker en cadena:** A bumpea `flyclean-v84`→`v85`; B `v85`→`v86`; C `v86`→`v87`. Cada fase verifica con
  `grep "const CACHE" sw.js` el valor real antes de bumpear (no bajar de lo que dejó la fase previa).
- **Deploy por fase:** cada fase se integra a `main` vía **PR** (patrón del repo, como el #124) → Vercel auto-deploya.
- **CEO solo-lectura:** toda edición nueva (Maps de cliente, intermediario, operario manual) respeta `soloLectura`
  (CEO ve, Coordinador/Finanzas editan). Multi-país: respetar el aislamiento por `País` existente.
- **Ubicación — precedencia** (helper compartido definido en Fase B, reusado por servicio y operario):
  `resolveMapsUrl({ svcMapa, propMapa, clienteMapa } = {})` → `svcMapa || propMapa || clienteMapa || null`
  (todos `.trim()`; `''` cuenta como vacío). Override del servicio gana sobre el de la propuesta, que gana sobre el del cliente.
- **i18n:** cada string nueva va en **es y pt-BR**.
- **Commits:** mensajes terminan con `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.

## Properties nuevas en Notion (todo el plan)

| DB | Property | Tipo | Fase |
|----|----------|------|------|
| Servicios (`2fbc8a03-...`) | `Estado checklist` | rich_text (JSON `{pre,post}`) | A |
| Clientes (`CONTACTOS_DB_ID`) | `Mapa` | url | B |
| Propuestas | `Mapa` | url | B |
| Servicios | `Método de trabajo` | select (🚁 Dron / 💪 Manual) | C |
| Servicios | `Herramienta manual` | select (Lanzas/Manguera/Hidrolavadora/Otro) | C |
| Servicios | `Operario manual` | select | C |

> Reusadas (NO crear): `Ciudad / Zona`, `Intermediario`, `Clientes traídos`, `Comisión %`, `Operario App`,
> `Operarios participantes`, `Contacto`, `Lugar`, `Mapa` (Servicios, ya existía), `Hora Inicio`.

## Decisiones consolidadas (resuelven las dudas que marcaron los redactores)

1. **Herramienta manual obligatoria si el método es Manual** (sí). Relajable en 1 línea si molesta en campo.
2. **Operario manual se excluye de la lista de Ayudantes** igual que el piloto (nadie es manual y ayudante a la vez).
3. **Override de ubicación = toggle** ("usar otra ubicación para este servicio/propuesta") en ambos lados, por consistencia de UX.
4. **Cada fase se mergea a `main` por PR** antes del deploy.
5. **Verificación de escritura a Notion (Fase A Task A4):** usar un **servicio sandbox** (no productivo) — pedir a
   Diego al ejecutar la Fase A cuál servicio de Servicios se puede usar/limpiar sin ensuciar datos reales.
6. **`_coordAllContacts` no está prefetcheado globalmente** → el intermediario y el sheet del servicio hacen fallback
   con fetch a Notion por id (no asumen memoria). (Hallazgo de Fase B; ya incorporado en Tasks B-3 y B-5.)

## Nota de integración entre fases (importante)

Fases **A y C tocan las mismas funciones** `buildIncrementalProps()`, `hydrateServiceStateFromNotion()` y
`cerrarServicio()`. Como A se ejecuta antes que C, el implementador de C debe **leer el archivo actual** (ya con el
blindaje de checklist de A integrado) y **sumar** sus campos sin pisar lo de A. El código objetivo mostrado en C
asume el estado post-A.

---

# FASE A — Rápida y de bajo riesgo (sw v84→v85)

# Plan de implementación — FASE A (sw v84 → v85)

> Spec: `docs/superpowers/specs/2026-06-29-mejoras-operativas-operario-coordinador-design.md`
> Rama: `feat/mejoras-operativas-junio` (desde `main`). Repo de trabajo: `~/repos/flyclean-app`.
> Verificación real (NO pytest/jest — no existen): `npm run check` tras cada cambio de código,
> `npm test` antes del deploy, Playwright/chrome-devtools + MCP Notion para lo funcional.
> Deploy = `git push origin main` (Vercel auto-deploya) — ÚLTIMO paso de la fase.

## Alcance de la Fase A
- **Punto 3** — Propuestas: los 3 botones de acción SIEMPRE visibles; solo se deshabilitan según estado.
- **Punto 5a** — Apagón del celular: verificación en vivo (read-only, sin código).
- **Punto 5b** — Blindaje del checklist: persistirlo también en Notion (`Estado checklist`, rich_text JSON).
- **Cierre** — crear property Notion, bump `sw.js` v84→v85, `npm test`, commit, push.

## Orden de ejecución (dependencias)
1. **Task A1** (Punto 3) — independiente, pura UI de propuestas.
2. **Task A2** (Punto 5a, verificación) — read-only; NO depende de A1. Puede correr en paralelo / antes.
3. **Task A3** (crear property `Estado checklist` en Notion vía MCP) — DEBE ir antes de A4 (si la property no existe, el PATCH la ignora en silencio).
4. **Task A4** (Punto 5b, código del blindaje) — consume A3.
5. **Task A5** (bump sw + npm test + commit + push) — ÚLTIMO; consume A1 y A4.

---

### Task A1: Punto 3 — 3 botones de propuesta siempre visibles, solo se deshabilitan
**Files:** Modify `index.html` (función `updateCreateSvcBtnVisibility`, ≈L9787-9830). Sin tocar el HTML de `openPropSheet` (las 3 `<div>` con `style="...display:none"` se sobrescriben en runtime). Sin tocar handlers `createServicioFromPropuesta`/`createRelevamientoFromPropuesta`/`createPruebaFromPropuesta`.
**Interfaces:** Consumes: `propEditState.estado`, `editingProp`, `ESTADOS_VENDIDO`, `ESTADOS_PRE_VENTA`, `t()`. Produces: nada nuevo (misma firma de `updateCreateSvcBtnVisibility`); deja los 3 botones con `display=''` y `disabled` calculado.

- [ ] **Step 1: Reescribir `updateCreateSvcBtnVisibility`** — reemplazar el cuerpo actual (L9787-9830). Código nuevo objetivo:

```js
function updateCreateSvcBtnVisibility() {
  if (!editingProp) return;
  const estado = propEditState.estado || '';
  // Estados donde se puede crear servicio (ya vendida)
  const ESTADOS_VENDIDO = ['✅ Aceptada', 'Concretado', 'Servicio Pendiente'];
  // Estados donde tiene sentido pedir un relevamiento o prueba previa (antes de cotizar)
  const ESTADOS_PRE_VENTA = ['🆕 Nuevo lead', '📞 Contactado', '🔍 Relevamiento', '⏳ En preparación'];

  const showSvc = ESTADOS_VENDIDO.includes(estado);
  const showRelev = ESTADOS_PRE_VENTA.includes(estado);
  const showPrueba = ESTADOS_PRE_VENTA.includes(estado);

  // Hint corto bajo el botón deshabilitado (en qué estado se activa). Nice-to-have del spec.
  function setHint(sectionEl, show, msgKey) {
    if (!sectionEl) return;
    let hint = sectionEl.querySelector('.create-btn-hint');
    if (show) { if (hint) hint.remove(); return; }
    if (!hint) {
      hint = document.createElement('div');
      hint.className = 'edit-section-hint create-btn-hint';
      hint.style.cssText = 'font-size:11px;color:var(--text3);margin-top:6px';
      sectionEl.appendChild(hint);
    }
    hint.textContent = t(msgKey);
  }

  // Crear servicio (verde) — siempre visible, habilitado solo si vendida.
  const svcSection = document.getElementById('create-svc-section');
  const svcBtn = document.getElementById('create-svc-btn');
  if (svcSection && svcBtn) {
    svcSection.style.display = '';
    const servCount = (editingProp.properties?.['Servicios']?.relation || []).length;
    svcBtn.textContent = servCount > 0
      ? '+ ' + t('sheet.prop.create.another.svc') + ' (' + servCount + ' ' + t('sheet.prop.svc.already') + ')'
      : '→ ' + t('sheet.prop.create.svc');
    svcBtn.disabled = !showSvc;
    setHint(svcSection, showSvc, 'sheet.prop.create.svc.hint');
  }

  // Pedir relevamiento (violeta) — siempre visible, habilitado solo en pre-venta.
  const relevSection = document.getElementById('create-relev-section');
  const relevBtn = document.getElementById('create-relev-btn');
  if (relevSection && relevBtn) {
    relevSection.style.display = '';
    relevBtn.textContent = '🔍 ' + t('sheet.prop.pedir.relev');
    relevBtn.disabled = !showRelev;
    setHint(relevSection, showRelev, 'sheet.prop.pedir.relev.hint');
  }

  // Hacer prueba demo (rosa) — siempre visible, habilitado solo en pre-venta.
  const pruebaSection = document.getElementById('create-prueba-section');
  const pruebaBtn = document.getElementById('create-prueba-btn');
  if (pruebaSection && pruebaBtn) {
    pruebaSection.style.display = '';
    pruebaBtn.textContent = '🧪 ' + t('sheet.prop.pedir.prueba');
    pruebaBtn.disabled = !showPrueba;
    setHint(pruebaSection, showPrueba, 'sheet.prop.pedir.prueba.hint');
  }
}
```

  Notas:
  - Las 3 `<div id="create-*-section">` siguen naciendo con `display:none` en el HTML de `openPropSheet` (L9595-9603); `updateCreateSvcBtnVisibility` se llama en L9606 al abrir y en L9784 al cambiar estado, así que las pasa a `display=''` de inmediato. No hace falta tocar el HTML.
  - El CSS `:disabled` de las 3 clases ya existe (`.create-svc-btn:disabled`/`.create-relev-btn:disabled`/`.create-prueba-btn:disabled` → `opacity:0.6;cursor:not-allowed`, L774/275/278) → el gris ya se ve sin CSS nuevo.
  - `setHint` reusa la clase visual `edit-section-hint` ya presente en el sheet (L1266 etc.).

- [ ] **Step 2: Agregar las 3 keys de hint a `TRANSLATIONS` (es + pt-BR)** — insertar junto a las keys `sheet.prop.*` existentes.
  En el bloque **es** (cerca de L2125-2140):
```js
    'sheet.prop.create.svc.hint': 'Se activa cuando la propuesta está Aceptada.',
    'sheet.prop.pedir.relev.hint': 'Se activa en estados previos a la venta (lead / contactado / relevamiento / en preparación).',
    'sheet.prop.pedir.prueba.hint': 'Se activa en estados previos a la venta (lead / contactado / relevamiento / en preparación).',
```
  En el bloque **pt-BR** (cerca de L2675-2690):
```js
    'sheet.prop.create.svc.hint': 'Ativa quando a proposta está Aceita.',
    'sheet.prop.pedir.relev.hint': 'Ativa nos estados antes da venda (lead / contatado / levantamento / em preparação).',
    'sheet.prop.pedir.prueba.hint': 'Ativa nos estados antes da venda (lead / contatado / levantamento / em preparação).',
```
  (Si una key faltara, `t()` devuelve la propia key — no rompe; igual conviene agregar ambas.)

- [ ] **Step 3: Verificar sintaxis** — `cd ~/repos/flyclean-app && npm run check` → Expected: `✅ index.html: N bloque(s) <script> parsean OK`.

- [ ] **Step 4: Verificar funcional (Playwright o chrome-devtools, prod app)** — read-only, NO guardar la propuesta:
  1. Abrir `https://flyclean.app` → país Uruguay → usuario Coordinador (Diego/coordinador con su PIN) → entrar.
  2. Ir a la tab Propuestas; abrir una propuesta en estado **pre-venta** (ej. `📞 Contactado`). Screenshot. Esperado: los 3 botones VISIBLES; "Crear servicio" gris/deshabilitado con hint; "Pedir relevamiento" y "Hacer prueba demo" habilitados.
  3. Dentro del sheet, tocar el estado **`✅ Aceptada`** (cambia `propEditState.estado` y re-dispara `updateCreateSvcBtnVisibility` por L9784). Screenshot. Esperado: "Crear servicio" habilitado; los otros dos grises con hint.
  4. Tocar un estado **intermedio** (`📤 Enviada al cliente` o `🤝 Negociando`). Screenshot. Esperado: los 3 grises con hint.
  5. Cerrar el sheet con la × SIN apretar "Guardar" (evita escribir a Notion). Verificar en consola que no hubo PATCH (`browser_network_requests` no debe mostrar `pages/<id>` PATCH).

- [ ] **Step 5: Commit** —
```
git add index.html
git commit -m "Punto 3: 3 botones de propuesta siempre visibles, deshabilitados por estado

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task A2: Punto 5a — Verificación en vivo del apagón (read-only, SIN código)
**Files:** ninguno (solo lectura/observación). NO modifica el repo. NO cierra servicios reales.
**Interfaces:** Consumes: la app desplegada actual (sw v84). Produces: evidencia (screenshots + texto) de que `openService()` rehidrata paso + fotos + checklist tras un "apagón". Si la verificación REVELA pérdida de datos, anotarlo y escalar antes de cerrar la fase (no se espera por el análisis estático del spec L110).

- [ ] **Step 1: Preparar entorno de simulación (Playwright/chrome-devtools, prod)** — mismo patrón probado en `scripts/manual-operario.cjs` (mocks de red + inyección de `serviceState`). Pasos:
  1. `browser_navigate https://flyclean.app/`.
  2. Interceptar red para NO tocar Notion/R2 reales (patrón de `installMocks`, manual-operario.cjs L36-58):
     - `**/api/notion` → 200 `{ object:'page', id:'mock', properties:{}, results:[] }`.
     - `**/api/upload-url` → 200 `{ uploadUrl:'https://mock-r2.invalid/upload', publicUrl:'<FAKE_PHOTO_URL real de R2>', key:'mock-key' }`.
     - `https://mock-r2.invalid/**` → 200 vacío.
     (Con chrome-devtools-mcp usar `evaluate_script` para envolver `window.fetch`/`window.callNotion`, o correr esto como script Playwright en `/tmp`.)
  3. Login operario: país Uruguay → usuario "Juan Pablo" → PIN `1234` (igual que el manual).

- [ ] **Step 2: Inyectar un servicio y simular el progreso "Iniciar → fotos antes"** — `page.evaluate` (patrón `injectService`, manual-operario.cjs L60-67). Inyectar un `serviceState` que represente el estado tras iniciar + sacar fotos antes, SIN apretar botones que escriben:
```js
await page.evaluate(() => {
  window._services = [{
    id: 'SIM-APAGON',
    properties: {
      'Nombre del servicio': { title: [{ plain_text: 'Simulación apagón' }] },
      'Estado': { select: { name: '🔄 Asignado' } },
      'Tipo de registro': { select: { name: '📋 Orden de trabajo' } },
      'Fecha programada': { date: { start: new Date().toISOString().slice(0,10) } },
      'Hora Inicio Efectivo': { date: { start: null } }
    }
  }];
  window.openService(0);
  // Simular progreso ya hecho por el operario antes del apagón:
  window.serviceState.horaInicio = '14:30';                 // apretó "Iniciar servicio"
  window.serviceState.checklistPre = { 0: true, 1: true };  // marcó 2 ítems del checklist pre
  window.serviceState.photos.pre = [{ id:'p1', status:'done', publicUrl:'https://cdn.flyclean.app/<foto-real>.jpg', previewUrl:'https://cdn.flyclean.app/<foto-real>.jpg' }];
  window.persistServiceState();   // graba a localStorage (fc_service_SIM-APAGON) + debounce Notion (mockeado)
});
```
  Tomar screenshot del paso actual (esperado: `fotos_antes`, índice 2, por `computeStepFromState` con `horaInicio` set → `checklist_pre`; al haber fotos+checklist el operario estaría en FOTOS). Confirmar en consola: `JSON.parse(localStorage.getItem('fc_service_SIM-APAGON'))` muestra `state.checklistPre` y `state.photos.pre` poblados.

- [ ] **Step 3: Simular el "apagón" y reabrir** —
  1. `page.reload()` (equivale a cerrar/reabrir la pestaña; el SW + localStorage persisten).
  2. Re-login si hiciera falta (la sesión <8h entra directo; si pide PIN, `1234`).
  3. Re-inyectar SOLO el array de servicios (sin tocar `serviceState`, que se reconstruye desde localStorage) y reabrir:
```js
await page.evaluate(() => {
  window._services = [{ id:'SIM-APAGON', properties: { /* mismas properties, incl. Estado y Tipo de registro */ } }];
  window.openService(0);  // dispara resetServiceState + hydrateFromNotion(mock vacío) + hydrateFromLocal(localStorage) + computeStepFromState
});
```
  4. Screenshot del paso al que saltó.

- [ ] **Step 4: Confirmar que NO se perdió nada** — observar en el screenshot y vía `evaluate`:
  - `window.currentStep` salta al paso correcto (`computeStepFromState`: con `horaInicio` set y sin `horaInicioEfectivo` → `checklist_pre`/`fotos_antes`, no vuelve a `inicio`/0).
  - `window.serviceState.checklistPre` conserva `{0:true,1:true}` (vino de `hydrateServiceStateFromLocal`, L3126).
  - `window.serviceState.photos.pre.length === 1` con su `publicUrl` (de localStorage; en prod real `flushPendingPhotosIfNeeded` las re-sube si Notion no las tenía).
  - El banner "⏱️ Iniciado a las 14:30 [↩ Cancelar inicio]" aparece (`renderCancelarBanner`, L5830) → prueba visual de que `horaInicio` sobrevivió.
  Documentar el resultado (PASA / pierde X). Esperado según spec L110: no se pierde nada. **Detalle a reportar:** hoy el checklist viene SOLO de localStorage → si en este paso se simula además `localStorage.clear()`, el checklist se pierde (ese es justamente el hueco que tapa A4).

- [ ] **Step 5: Limpiar** — `page.evaluate(() => localStorage.removeItem('fc_service_SIM-APAGON'))`. NO se hace commit (tarea sin cambios de código). Registrar la evidencia en el reporte de la fase.

---

### Task A3: Crear la property `Estado checklist` en la DB Servicios (Notion, vía MCP)
**Files:** ninguno (cambio en Notion, no en el repo).
**Interfaces:** Produces: property `Estado checklist` (rich_text) en el data source `2fbc8a03-5c4f-445c-8516-71dd9b2eea78` (DB Servicios). DEBE existir antes de deployar A4, si no el PATCH la ignora en silencio (constraint conocido, spec L130).

- [ ] **Step 1: Verificar que no exista ya** — con `notion-fetch` (o `notion-query-data-sources`) sobre el data source `2fbc8a03-5c4f-445c-8516-71dd9b2eea78` confirmar que NO hay una property llamada `Estado checklist`. (Reusar > recrear.)

- [ ] **Step 2: Crear la property** — `mcp__claude_ai_Notion__notion-update-data-source` sobre el data source `2fbc8a03-5c4f-445c-8516-71dd9b2eea78`, agregando una property:
  - **Nombre exacto:** `Estado checklist`
  - **Tipo:** `rich_text` (texto largo; guarda el JSON serializado `{pre:{...},post:{...}}`).
  - NO es select ni multi_select (no hay opciones que pre-declarar).

- [ ] **Step 3: Confirmar creación** — `notion-fetch` del data source de nuevo → la property `Estado checklist` (rich_text) aparece. Anotar el property_id si la API lo devuelve (no es necesario para el código: el PATCH usa el nombre).

- [ ] **Step 4: (sin commit)** — cambio en Notion, no toca el repo. Continuar a A4.

---

### Task A4: Punto 5b — Blindaje del checklist: persistirlo en Notion
**Files:** Modify `index.html` — `buildIncrementalProps` (≈L3055-3072), `hydrateServiceStateFromNotion` (≈L3088-3118), `cerrarServicio` props (≈L6421-6472, belt-and-suspenders).
**Interfaces:** Consumes: A3 (property `Estado checklist` ya creada en Notion). Consume el call site existente `toggleCheck → persistServiceState()` (L6339) que YA debounce-flushea vía `buildIncrementalProps` → no hace falta agregar llamadas nuevas. Produces: el checklist se escribe a Notion en cada toggle (debounce 3s) y se lee como FALLBACK al reabrir cuando localStorage está vacío.

- [ ] **Step 1: Escribir el checklist en `buildIncrementalProps`** — al final de la función (antes de `return properties;`, L3071) agregar el campo. Reusa el patrón rich_text usado en todo el archivo (ej. L6427).
  Insertar tras la línea del bloque `resultado`/`resultadoPrueba` (después de L3070), antes de `return properties;`:
```js
  // Blindaje del checklist (Punto 5b): persistir pre/post a Notion en cada auto-save.
  // Solo escribir si hay al menos un ítem marcado (evita pisar con "{}" un servicio sin tocar).
  const _ck = { pre: s.checklistPre || {}, post: s.checklistPost || {} };
  if (Object.keys(_ck.pre).length || Object.keys(_ck.post).length) {
    properties['Estado checklist'] = { rich_text: [{ text: { content: JSON.stringify(_ck) } }] };
  }
```

- [ ] **Step 2: Leer el checklist como FALLBACK en `hydrateServiceStateFromNotion`** — al final de la función (tras setear `serviceState.photos.*`, antes del cierre `}` en L3118) agregar la lectura. CLAVE: NO pisar lo que ya esté en `serviceState` (localStorage se hidrata DESPUÉS en `openService`, L3120-3137, con guardas `if (...Object.keys(...).length)`, así que el orden actual ya prioriza localStorage; aquí solo seteamos un valor base que localStorage puede sobreescribir). Código:
```js
  // Fallback del checklist desde Notion (Punto 5b): si localStorage se perdió
  // (caché borrada / reinstalación), reconstruir pre/post desde la property.
  // hydrateServiceStateFromLocal corre DESPUÉS y, si tiene datos, los superpone (gana lo local).
  try {
    const ckRaw = props['Estado checklist']?.rich_text?.[0]?.plain_text;
    if (ckRaw) {
      const ck = JSON.parse(ckRaw);
      if (ck && typeof ck === 'object') {
        if (ck.pre && Object.keys(ck.pre).length) serviceState.checklistPre = ck.pre;
        if (ck.post && Object.keys(ck.post).length) serviceState.checklistPost = ck.post;
      }
    }
  } catch (_) { /* JSON corrupto → ignorar, el checklist arranca vacío */ }
```
  Nota de orden: en `openService` (L5752-5753) primero corre `hydrateServiceStateFromNotion` (setea base desde la property) y luego `hydrateServiceStateFromLocal` (L3126-3127, solo sobrescribe si localStorage tiene keys). Resultado correcto: localStorage gana cuando existe; Notion cubre cuando localStorage está vacío. Cumple el requisito del spec ("no pisar localStorage si ya tiene datos").

- [ ] **Step 3: (belt-and-suspenders) Incluir el checklist en `cerrarServicio`** — en el bloque `properties` de `cerrarServicio` (tras L6450, junto a las fotos) agregar el mismo serializado, para garantizar que el estado final quede en Notion aunque el último debounce no haya flusheado:
```js
  const _ckClose = { pre: serviceState.checklistPre || {}, post: serviceState.checklistPost || {} };
  if (Object.keys(_ckClose.pre).length || Object.keys(_ckClose.post).length) {
    properties['Estado checklist'] = { rich_text: [{ text: { content: JSON.stringify(_ckClose) } }] };
  }
```

- [ ] **Step 4: Verificar sintaxis** — `cd ~/repos/flyclean-app && npm run check` → Expected: `✅ index.html: N bloque(s) <script> parsean OK`.

- [ ] **Step 5: Verificar funcional (Notion MCP, end-to-end real)** — para verificar la ESCRITURA hay que dejar que el flush llegue a Notion (no mockear). Para no tocar un servicio productivo, usar un servicio de prueba existente o uno marcado para pruebas:
  1. Abrir `https://flyclean.app` como operario; abrir un servicio de prueba; tocar 2 ítems del checklist pre (`toggleCheck` → `persistServiceState` → debounce 3s → PATCH `Estado checklist`).
  2. Esperar >3s. Con MCP Notion (`notion-fetch` de esa page de Servicios) confirmar que `Estado checklist` contiene `{"pre":{"0":true,"1":true},"post":{}}`.
  3. Probar el FALLBACK: en la consola de la app `localStorage.removeItem('fc_service_<id>')`, recargar, reabrir el servicio. Esperado: el checklist pre vuelve con los 2 ítems marcados (vino de Notion vía `hydrateServiceStateFromNotion`). Screenshot.
  4. NO cerrar el servicio de prueba con datos productivos; si se usó uno real, des-marcar y dejar como estaba.

- [ ] **Step 6: Commit** —
```
git add index.html
git commit -m "Punto 5b: blindaje del checklist — persistir pre/post en Notion (Estado checklist) con fallback al rehidratar

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task A5: Cierre de fase — bump sw v85 + smoke + deploy
**Files:** Modify `sw.js` (L82). Consume: A1 + A4 commiteados.
**Interfaces:** Consumes: todo lo anterior. Produces: `flyclean-v85` (invalida la caché de los clientes para que tomen el index.html nuevo) + deploy en producción.

- [ ] **Step 1: Bump del cache del service worker** — en `sw.js` L82, cambiar:
```js
const CACHE = 'flyclean-v84';
```
  por:
```js
const CACHE = 'flyclean-v85';
```
  (No tocar `NOTION_CACHE = 'flyclean-notion-cache-v4'`, L94 — no cambió el esquema de cache de reads.)

- [ ] **Step 2: Verificar sintaxis del index** — `cd ~/repos/flyclean-app && npm run check` → Expected: `✅ index.html: N bloque(s) <script> parsean OK`.

- [ ] **Step 3: Smoke test read-only** — `cd ~/repos/flyclean-app && npm test` → Expected: el smoke (`tests/smoke.mjs`, deriva IDs de `index.html`) pasa sin errores.

- [ ] **Step 4: Commit del bump** —
```
git add sw.js
git commit -m "sw v85: invalidar caché (Punto 3 botones propuesta + Punto 5b blindaje checklist)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

- [ ] **Step 5: Deploy (push a main → Vercel auto-deploya)** — `cd ~/repos/flyclean-app && git push origin main`.
  Nota: si se trabajó en la rama `feat/mejoras-operativas-junio`, primero mergear a `main` (o abrir PR y mergear) — Vercel deploya `main`. Confirmar el deploy con `vercel -Q ~/.config/vercel-flyclean logs flyclean-app` o el dashboard.

- [ ] **Step 6: Smoke en producción** — tras el deploy, abrir `https://flyclean.app` en una pestaña nueva, confirmar que el SW pasó a `flyclean-v85` (DevTools → Application → Cache Storage) y repetir un chequeo rápido de los 3 botones de propuesta (Task A1, Step 4, punto 2). Cerrar sin guardar.

---

## Properties Notion nuevas en esta fase
| DB | Property | Tipo | Tarea |
|----|----------|------|-------|
| Servicios (ds `2fbc8a03-5c4f-445c-8516-71dd9b2eea78`) | `Estado checklist` | rich_text (JSON `{pre,post}`) | A3 (crear) + A4 (escribir/leer) |

## Notas y precedencia
- **Orden property-then-deploy:** A3 (crear en Notion) DEBE preceder a cualquier deploy de A4. A5 es el único deploy de la fase y va al final → se cumple naturalmente.
- **Sin cambio de esquema en Gastos/Ingresos** → NO hace falta tocar `…/FlyClean-Finanzas/CONTRATO-NOTION.md`.
- **Doc post-fase (no es Task pero recordarlo):** tras el deploy, actualizar `docs/FUNCIONALIDADES.md` (Punto 3 + blindaje checklist) y la sección de estado en `CLAUDE.md` con el bump a sw v85.


---

# FASE B — Ubicación + CRM (sw v85→v86)

# Plan de implementación — FASE B (Ubicación + CRM) · sw v85 → v86

> **Origen:** spec `docs/superpowers/specs/2026-06-29-mejoras-operativas-operario-coordinador-design.md` (Punto 2 + Punto 4-ubicación).
> **Punto de partida real:** `index.html` con sw v84 en `main`; la Fase A ya dejó sw en **v85**. Esta fase bumpea **v85 → v86**.
> **Rama:** `feat/mejoras-operativas-junio` (ya creada en Fase A; seguir trabajando ahí).
> **Regla del repo:** todo cambio en `index.html` → `npm run check` antes de seguir. `npm test` antes del deploy. Deploy = push a `main`.
> **Repo cwd para comandos:** `~/repos/flyclean-app`.

## Cobertura de la fase
- **Punto 2** — Ficha de cliente: input Maps + botón "📍 Abrir", selector "Llegó por (intermediario)" (relation `Intermediario` ↔ `Clientes traídos`), encabezado de conteo mejorado.
- **Punto 4 (parte ubicación)** — Sheet del servicio: cliente visible + botón "📍 Ubicación" (herencia), override de ubicación (servicio y propuesta), y **quitar** el input Maps suelto `edit-mapa`.
- Helper compartido **`resolveMapsUrl`** (definido en Task 0, reusado en Tasks 5–7).

## Orden de ejecución (dependencias)
0. **Task 0** — Properties Notion (MCP) + helper `resolveMapsUrl`. **Primero** (property-then-deploy; el helper lo consumen 5,6,7).
1. **Task 1** — i18n keys (es + pt-BR). Todas las strings nuevas de la fase, de una.
2. **Task 2** — Maps en ficha de cliente (input + botón + estado + guardado).
3. **Task 3** — Intermediario en ficha de cliente (selector relation + guardado).
4. **Task 4** — Conteo mejorado en encabezado de la ficha.
5. **Task 5** — Sheet servicio: resolver cliente + propuesta + maps al abrir; estado `editState`.
6. **Task 6** — Sheet servicio: bloque "Cliente + 📍 Ubicación" + override; quitar `edit-mapa`.
7. **Task 7** — Override de ubicación en sheet de PROPUESTA (property `Mapa` en Propuestas).
8. **Task 8** — Bump sw v85→v86 + `npm test` + commit + push (deploy).

---

### Task B-0: Properties Notion + helper `resolveMapsUrl`
**Files:** Modify `index.html` (insertar helper nuevo cerca de `updateServiceProps`, ≈L3443). Notion vía MCP (no es archivo).
**Interfaces:** Consumes: nada. Produces: property `Mapa` (url) en DB Clientes (`CONTACTOS_DB_ID`) y en DB Propuestas (`PROPUESTAS_DB_ID`); función global **`resolveMapsUrl({ svcMapa, propMapa, clienteMapa })`**.

- [ ] **Step 1: Crear las 2 properties en Notion (MCP) ANTES de tocar código que las escriba.**
  Con `mcp__claude_ai_Notion__notion-update-data-source`:
  - DB Clientes/Contactos (data source de `CONTACTOS_DB_ID`) → property nueva **`Mapa`** tipo `url`.
  - DB Propuestas (data source de `PROPUESTAS_DB_ID`) → property nueva **`Mapa`** tipo `url`.
  Verificar con `mcp__claude_ai_Notion__notion-fetch` que ambas existen y se llaman EXACTAMENTE `Mapa`.
  *Nota:* si la property no existe, Notion ignora la key del PATCH en silencio → por eso esto va primero.
- [ ] **Step 2: Insertar el helper `resolveMapsUrl` justo después de `updateServiceProps` (≈L3443).**
  CÓDIGO NUEVO real:
  ```js
  // Precedencia de ubicación (Fase B): el override del SERVICIO gana sobre el de la PROPUESTA,
  // que gana sobre el del CLIENTE. Devuelve la primera URL no vacía, o null si no hay ninguna.
  // Reusado por el sheet del servicio (botón Ubicación) y por el step 0 del operario.
  function resolveMapsUrl({ svcMapa, propMapa, clienteMapa } = {}) {
    const pick = (v) => (typeof v === 'string' && v.trim()) ? v.trim() : null;
    return pick(svcMapa) || pick(propMapa) || pick(clienteMapa) || null;
  }
  ```
- [ ] **Step 3: Verificar sintaxis** — Run: `cd ~/repos/flyclean-app && npm run check` → Expected: `✅ index.html: N bloque(s) <script> parsean OK`.
- [ ] **Step 4: Commit** — `cd ~/repos/flyclean-app && git add index.html && git commit -m "Fase B: helper resolveMapsUrl + property Mapa en Clientes/Propuestas (Notion)" -m "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"`

---

### Task B-1: i18n — strings nuevas (es + pt-BR)
**Files:** Modify `index.html` (bloque `'es'` ≈L1660-2209, bloque `'pt-BR'` ≈L2210+). Anclar tras `'sheet.contact.ciudad.placeholder'` (es L2088 / pt-BR L2638).
**Interfaces:** Consumes: nada. Produces: claves i18n usadas por Tasks 2,3,4,6,7.

- [ ] **Step 1: Agregar claves en el bloque `es` (insertar después de la línea `'sheet.contact.ciudad.placeholder': 'Ej: Punta del Este',` ≈L2088).**
  CÓDIGO NUEVO real:
  ```js
      'sheet.contact.section.mapa': 'UBICACIÓN (GOOGLE MAPS)',
      'sheet.contact.mapa.placeholder': 'https://maps.app.goo.gl/...',
      'sheet.contact.mapa.abrir': '📍 Abrir',
      'sheet.contact.section.intermediario': 'LLEGÓ POR (INTERMEDIARIO)',
      'sheet.contact.intermediario.none': '— Directo (sin intermediario) —',
      'sheet.contact.intermediario.loading': 'cargando clientes…',
      'sheet.contact.count.props': 'propuestas',
      'sheet.contact.count.props.accepted': 'aceptadas',
      'sheet.contact.count.svcs': 'servicios',
      'sheet.svc.cliente.label': 'Cliente',
      'sheet.svc.ubicacion.btn': '📍 Ubicación',
      'sheet.svc.ubicacion.none': 'Sin ubicación cargada',
      'sheet.svc.ubicacion.override': 'usar otra ubicación para este servicio',
      'sheet.svc.ubicacion.override.label': 'UBICACIÓN PARA ESTE SERVICIO (OVERRIDE)',
      'sheet.svc.ubicacion.override.hint': 'Solo para este servicio. Si lo dejás vacío, hereda la del cliente.',
      'sheet.prop.ubicacion.override': 'usar otra ubicación para esta propuesta',
      'sheet.prop.ubicacion.override.label': 'UBICACIÓN PARA ESTA PROPUESTA (OVERRIDE)',
      'sheet.prop.ubicacion.override.hint': 'Solo para esta propuesta. Si lo dejás vacío, hereda la del cliente.',
  ```
- [ ] **Step 2: Agregar las MISMAS claves en el bloque `pt-BR` (insertar después de `'sheet.contact.ciudad.placeholder': 'Ex: Porto Alegre',` ≈L2638), traducidas.**
  CÓDIGO NUEVO real:
  ```js
      'sheet.contact.section.mapa': 'LOCALIZAÇÃO (GOOGLE MAPS)',
      'sheet.contact.mapa.placeholder': 'https://maps.app.goo.gl/...',
      'sheet.contact.mapa.abrir': '📍 Abrir',
      'sheet.contact.section.intermediario': 'CHEGOU POR (INTERMEDIÁRIO)',
      'sheet.contact.intermediario.none': '— Direto (sem intermediário) —',
      'sheet.contact.intermediario.loading': 'carregando clientes…',
      'sheet.contact.count.props': 'propostas',
      'sheet.contact.count.props.accepted': 'aceitas',
      'sheet.contact.count.svcs': 'serviços',
      'sheet.svc.cliente.label': 'Cliente',
      'sheet.svc.ubicacion.btn': '📍 Localização',
      'sheet.svc.ubicacion.none': 'Sem localização carregada',
      'sheet.svc.ubicacion.override': 'usar outra localização para este serviço',
      'sheet.svc.ubicacion.override.label': 'LOCALIZAÇÃO PARA ESTE SERVIÇO (OVERRIDE)',
      'sheet.svc.ubicacion.override.hint': 'Apenas para este serviço. Se deixar vazio, herda a do cliente.',
      'sheet.prop.ubicacion.override': 'usar outra localização para esta proposta',
      'sheet.prop.ubicacion.override.label': 'LOCALIZAÇÃO PARA ESTA PROPOSTA (OVERRIDE)',
      'sheet.prop.ubicacion.override.hint': 'Apenas para esta proposta. Se deixar vazio, herda a do cliente.',
  ```
- [ ] **Step 3: Verificar sintaxis** — Run: `cd ~/repos/flyclean-app && npm run check` → Expected: `✅ index.html: N bloque(s) <script> parsean OK`.
- [ ] **Step 4: Commit** — `cd ~/repos/flyclean-app && git add index.html && git commit -m "Fase B: i18n para Maps en cliente, intermediario, conteo y override de ubicación (es+pt-BR)" -m "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"`

---

### Task B-2: Maps en la ficha de cliente (input + botón "📍 Abrir" + guardado)
**Files:** Modify `index.html` — `openContactSheet()` (lectura, ≈L10103-10115), `buildContactSheetBody()` (render, ≈L10080-10083), `saveContactEdit()` (guardado, ≈L10200), + `contactOpenMapa` nueva.
**Interfaces:** Consumes: `contactEditState`, property `Mapa` (url) en Clientes (Task 0). Produces: `contactEditState.mapa`; función `contactOpenMapa()`.

- [ ] **Step 1: Leer el campo `Mapa` al abrir la ficha.** En `openContactSheet()`, dentro del objeto `contactEditState = {...}` (≈L10103-10115), agregar tras la línea `ciudad: ...` (L10112):
  ```js
    mapa: props['Mapa']?.url || '',
  ```
  Y en `openNewContactSheet()` (≈L10144) agregar `mapa: ''` al objeto literal del estado (junto a `ciudad: ''`).
- [ ] **Step 2: Render del input + botón en `buildContactSheetBody()`** — insertar JUSTO DESPUÉS del bloque "Ciudad / Zona" (después de la línea que cierra el input de ciudad, ≈L10081), antes del bloque Interlocutor:
  ```js
    `<div class="edit-section"><div class="edit-section-label">${t('sheet.contact.section.mapa')}</div>
      <div style="display:flex;gap:8px;align-items:center">
        <input type="url" id="contact-mapa-input" class="edit-date-input" style="flex:1" placeholder="${t('sheet.contact.mapa.placeholder')}" value="${esc(s.mapa || '')}" oninput="contactEditState.mapa=this.value"/>
        <button type="button" class="estado-btn" style="white-space:nowrap" onclick="contactOpenMapa()">${t('sheet.contact.mapa.abrir')}</button>
      </div></div>` +
  ```
  (Sigue el patrón de los demás bloques de `buildContactSheetBody`: cada uno es un string concatenado con `+`.)
- [ ] **Step 3: Definir `contactOpenMapa()`** — insertar junto a `contactToggleMulti` (≈L10172):
  ```js
  function contactOpenMapa() {
    const u = (contactEditState.mapa || '').trim();
    if (!u) { alert(t('sheet.svc.ubicacion.none')); return; }
    window.open(u, '_blank', 'noopener');
  }
  ```
  (Mismo patrón "abrir en pestaña nueva" que el link del step 0 operario, L5872.)
- [ ] **Step 4: Guardar en `saveContactEdit()`** — en la rama NO-CEO (donde se arma `props`, ≈L10192-10203), agregar tras la línea de `Ciudad / Zona` (L10200):
  ```js
      props['Mapa'] = { url: s.mapa && s.mapa.trim() ? s.mapa.trim() : null };
  ```
  El CEO (rama `esCEO`, L10186-10191) NO lo escribe → respeta `soloLectura`. El bloque `soloLectura` de `openContactSheet` (L10124-10131) ya deshabilita todos los `input` del body, así que el input Maps queda read-only para CEO automáticamente (no requiere cambio).
- [ ] **Step 5: Verificar sintaxis** — Run: `cd ~/repos/flyclean-app && npm run check` → Expected: `✅ index.html: N bloque(s) <script> parsean OK`.
- [ ] **Step 6: Verificar funcional (Notion MCP + chrome-devtools).** Abrir `https://flyclean.app`, login Coordinador. Pantalla Clientes → abrir una ficha → escribir una URL de Maps → "📍 Abrir" debe abrir pestaña nueva → Guardar. Con `mcp__claude_ai_Notion__notion-fetch` verificar que la página del cliente tiene `Mapa` poblado con esa URL. Reabrir la ficha → el input precarga la URL. Login CEO (pin 9999) → la misma ficha → el input Maps está deshabilitado (gris) y el botón Abrir igual abre.
- [ ] **Step 7: Commit** — `cd ~/repos/flyclean-app && git add index.html && git commit -m "Fase B p2: ubicación Maps en ficha de cliente (input + Abrir + guardado en property Mapa)" -m "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"`

---

### Task B-3: Intermediario en la ficha de cliente (selector relation)
**Files:** Modify `index.html` — `openContactSheet()` (lectura + carga async), `buildContactSheetBody()` (render selector), `saveContactEdit()` (guardado relation), + helpers nuevos `loadContactIntermediarios` / `contactIntermediarioChanged`.
**Interfaces:** Consumes: relation `Intermediario` ↔ `Clientes traídos` (ya existe en Notion Clientes), `_coordAllContacts` o fetch a Notion, patrón de `loadPropContactos` (L9478). Produces: `contactEditState.intermediario` (id o ''), `_contactIntermediarios` cache, selector relation que escribe `props['Intermediario'] = { relation: [...] }`.

- [ ] **Step 1: Leer el intermediario actual al abrir.** En `openContactSheet()`, dentro de `contactEditState = {...}`, agregar:
  ```js
    intermediario: props['Intermediario']?.relation?.[0]?.id || '',
  ```
  Y en `openNewContactSheet()` agregar `intermediario: ''` al estado.
- [ ] **Step 2: Render del selector en `buildContactSheetBody()`** — insertar tras el bloque Maps (Task 2 Step 2), antes de Interlocutor. El `<select>` arranca con solo la opción "ninguno"; lo puebla `loadContactIntermediarios` async:
  ```js
    (mode === 'edit'
      ? `<div class="edit-section"><div class="edit-section-label">${t('sheet.contact.section.intermediario')}</div>
          <select id="contact-intermediario-select" class="edit-date-input" onchange="contactIntermediarioChanged(this.value)">
            <option value="">${t('sheet.contact.intermediario.none')}</option>
            <option value="__loading__" disabled>${t('sheet.contact.intermediario.loading')}</option>
          </select></div>`
      : '') +
  ```
  *(Solo en modo `edit`: en `create` el cliente todavía no tiene id, y elegir intermediario sobre un cliente inexistente no aporta; se setea al re-editar.)*
- [ ] **Step 3: Helpers `loadContactIntermediarios` + `contactIntermediarioChanged`** — insertar junto a `contactOpenMapa` (≈L10172). Reusa `_coordAllContacts` si está poblado; si no, query a Notion (mismo patrón que `loadPropContactos`, L9478). Excluye al propio cliente (no puede ser su propio intermediario):
  ```js
  let _contactIntermediarios = null;
  async function loadContactIntermediarios(selfId) {
    const sel = document.getElementById('contact-intermediario-select');
    if (!sel) return;
    try {
      if (!_contactIntermediarios) {
        if (Array.isArray(_coordAllContacts) && _coordAllContacts.length) {
          _contactIntermediarios = _coordAllContacts;
        } else {
          const d = await callNotion(`databases/${CONTACTOS_DB_ID}/query`, 'POST', { sorts: [{ property: 'Nombre / Empresa', direction: 'ascending' }] });
          _contactIntermediarios = d.results || [];
        }
      }
      const tit = c => c.properties?.['Nombre / Empresa']?.title?.[0]?.plain_text || '(sin nombre)';
      const cur = contactEditState.intermediario || '';
      sel.innerHTML = `<option value="">${t('sheet.contact.intermediario.none')}</option>` +
        _contactIntermediarios.slice()
          .filter(c => c.id !== selfId)
          .sort((a, b) => tit(a).localeCompare(tit(b)))
          .map(c => `<option value="${esc(c.id)}">${esc(tit(c))}</option>`).join('');
      sel.value = cur;
      // CEO solo lectura: el bloque soloLectura de openContactSheet ya deshabilita selects del body,
      // pero ese bloque corre ANTES de poblar este select async → re-aplicar el disabled si corresponde.
      if (currentUser?.role && currentUser.role.includes('CEO')) sel.disabled = true;
    } catch (_) { /* el form sirve igual: queda "Directo" */ }
  }
  function contactIntermediarioChanged(val) {
    contactEditState.intermediario = val || '';
  }
  ```
- [ ] **Step 4: Disparar la carga async al abrir la ficha en modo edit.** En `openContactSheet()`, al final (junto a `loadContactHistory(pageId);` ≈L10138), agregar:
  ```js
    loadContactIntermediarios(pageId);
  ```
- [ ] **Step 5: Guardar la relation en `saveContactEdit()`** — en la rama NO-CEO, tras `props['Mapa']` (Task 2 Step 4):
  ```js
      props['Intermediario'] = { relation: s.intermediario ? [{ id: s.intermediario }] : [] };
  ```
  (Como es relation DUAL `Intermediario` ↔ `Clientes traídos`, Notion actualiza automáticamente `Clientes traídos` del lado del intermediario. No se toca comisión/facturación.) CEO no entra a esta rama → respeta solo-lectura.
- [ ] **Step 6: Invalidar el cache al guardar.** En `saveContactEdit()`, donde ya se hace `closeContactSheet(); await refreshContactsView();` (rama NO-CEO, ≈L10224), agregar antes de `closeContactSheet()`:
  ```js
      _contactIntermediarios = null; // forzar recarga: cambió la lista/relaciones
  ```
- [ ] **Step 7: Verificar sintaxis** — Run: `cd ~/repos/flyclean-app && npm run check` → Expected: `✅ index.html: N bloque(s) <script> parsean OK`.
- [ ] **Step 8: Verificar funcional (Notion MCP + chrome-devtools).** Login Coordinador → Clientes → abrir un cliente "traído" (ej. una obra de Belhouse) → el selector "Llegó por (intermediario)" debe listar otros clientes y NO al propio cliente → elegir el intermediario → Guardar. Con `mcp__claude_ai_Notion__notion-fetch` verificar que la página tiene `Intermediario` apuntando al elegido y que el intermediario tiene al cliente en `Clientes traídos` (dual). Login CEO → mismo cliente → el selector está deshabilitado.
- [ ] **Step 9: Commit** — `cd ~/repos/flyclean-app && git add index.html && git commit -m "Fase B p2: selector intermediario en ficha de cliente (relation Intermediario, CEO read-only)" -m "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"`

---

### Task B-4: Conteo mejorado en el encabezado de la ficha
**Files:** Modify `index.html` — `renderContactHistory()` (≈L10303-10346, bloque `summaryHTML`).
**Interfaces:** Consumes: `items` que ya trae `loadContactHistory` (propuestas con `Estado pipeline`, servicios, ingresos). Produces: línea de encabezado `📄 N propuestas (M aceptadas) · 🧰 K servicios`. Es presentación pura.

- [ ] **Step 1: Calcular los conteos.** En `renderContactHistory()`, dentro del `items.forEach` que ya recorre los items (≈L10317-10320), o justo después, agregar el conteo de propuestas (total + aceptadas). Insertar después de `const nServ = items.filter(it => it.type === 'servicio').length;` (L10321):
  ```js
    const props = items.filter(it => it.type === 'propuesta');
    const nProps = props.length;
    const nPropsAcc = props.filter(it => /Aceptada/.test(it.data.properties?.['Estado pipeline']?.select?.name || '')).length;
    const countHeader =
      `<div class="ec-saldo" style="margin-bottom:6px;font-size:13px">` +
        `<span>📄 ${nProps} ${t('sheet.contact.count.props')}${nPropsAcc ? ` (${nPropsAcc} ${t('sheet.contact.count.props.accepted')})` : ''}</span>` +
        `<span>🧰 ${nServ} ${t('sheet.contact.count.svcs')}</span>` +
      `</div>`;
  ```
  *Nota:* `nServ` cuenta los servicios `📋 Orden de trabajo` + `✅ Completado` que ya filtra `loadContactHistory` (relevamientos van como `type:'relevamiento'`, no entran al conteo de "servicios", que es lo correcto).
- [ ] **Step 2: Anteponer el encabezado al `summaryHTML`.** Donde se arma `const summaryHTML = ...` (≈L10342), prefijarlo con `countHeader`:
  ```js
    const summaryHTML = countHeader +
      `<div class="ec-saldo" ...` // (resto igual, sin cambios)
  ```
- [ ] **Step 3: Verificar sintaxis** — Run: `cd ~/repos/flyclean-app && npm run check` → Expected: `✅ index.html: N bloque(s) <script> parsean OK`.
- [ ] **Step 4: Verificar funcional (chrome-devtools).** Login Coordinador → Clientes → abrir un cliente con varias propuestas y servicios (ej. Hospital Británico) → el encabezado de la ficha muestra `📄 X propuestas (Y aceptadas) · 🧰 Z servicios` y los números coinciden con la lista de abajo. Probar un cliente con 0 propuestas aceptadas → no aparece el paréntesis "(aceptadas)".
- [ ] **Step 5: Commit** — `cd ~/repos/flyclean-app && git add index.html && git commit -m "Fase B p2: conteo claro propuestas (aceptadas) · servicios en encabezado de la ficha" -m "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"`

---

### Task B-5: Sheet del servicio — resolver cliente + propuesta + maps al abrir
**Files:** Modify `index.html` — `openEditSheet()` (≈L8403-8503), `editState` (≈L8424).
**Interfaces:** Consumes: `props['Contacto']`, `props['Propuesta']`, `props['Mapa']` del servicio; patrón de fetch de contacto+propuesta de `generateReportPDF` (L9034-9043) y `openReportStep` (L8933-8940). Produces: `editState.contactoId`, `editState.clienteNombre`, `editState.clienteMapa`, `editState.propMapa`, `editState.mapa` (override del servicio); función `resolveSvcUbicacion(svcId)` que rellena el bloque cliente+ubicación (la dibuja Task 6).

- [ ] **Step 1: Sembrar el estado con lo que ya está en `props` (sin async).** En `openEditSheet()`, donde se arma `editState = {...}` (L8424), agregar campos nuevos:
  ```js
    editState = { estado: estadoActual, operario: operarioActual, fecha, hora, lugar, mapa, participantes: participantesActuales, pais: props['País']?.select?.name || '', nombre,
      contactoId: props['Contacto']?.relation?.[0]?.id || (props['Contactos']?.relation?.[0]?.id) || '',
      clienteNombre: '', clienteMapa: '', propMapa: '' };
  ```
  (`mapa` ya existe en `editState` = el override del servicio, leído en L8423 desde `props['Mapa']`.)
- [ ] **Step 2: Definir `resolveSvcUbicacion(svcId)` — fetch async de cliente + propuesta.** Insertar como función nueva justo después de `openEditSheet` (antes de `closeEditSheet`, ≈L8504). Sigue el patrón exacto de `generateReportPDF` (fetch del contacto por id, leer su title y su `Mapa`) y de `openReportStep` (fetch de la propuesta vinculada). Guarda contra cambio de sheet (`editingService?.id !== svcId`):
  ```js
  async function resolveSvcUbicacion(svcId) {
    const svc = editingService;
    if (!svc || svc.id !== svcId) return;
    const p = svc.properties || {};
    // Cliente: nombre + su Mapa heredable.
    const contactoId = editState.contactoId;
    if (contactoId) {
      try {
        const c = await callNotion('pages/' + contactoId, 'GET');
        if (editingService?.id !== svcId) return;
        const cp = c?.properties || {};
        let nom = '';
        for (const k in cp) { const tt = cp[k]?.title; if (Array.isArray(tt) && tt.length) { nom = tt.map(x => x.plain_text).join(''); break; } }
        editState.clienteNombre = nom || '';
        editState.clienteMapa = cp['Mapa']?.url || '';
      } catch (_) {}
    }
    // Propuesta vinculada: su Mapa override (precede al del cliente, no al del servicio).
    const propId = p['Propuesta']?.relation?.[0]?.id;
    if (propId) {
      try {
        const prop = await callNotion('pages/' + propId, 'GET');
        if (editingService?.id !== svcId) return;
        editState.propMapa = prop?.properties?.['Mapa']?.url || '';
      } catch (_) {}
    }
    renderSvcClienteUbicacion(); // redibuja el bloque cliente+ubicación (definido en Task 6)
  }
  ```
- [ ] **Step 3: Disparar la resolución async al abrir.** En `openEditSheet()`, al final (después de `renderParticipantesBtns();`, ≈L8502, antes del cierre `}`), agregar:
  ```js
    renderSvcClienteUbicacion(); // estado inicial (muestra lo que ya hay sin esperar el fetch)
    resolveSvcUbicacion(pageId); // completa cliente/maps async
  ```
- [ ] **Step 4: Verificar sintaxis** — Run: `cd ~/repos/flyclean-app && npm run check` → Expected: `✅ index.html: N bloque(s) <script> parsean OK`.
  *(Nota: `renderSvcClienteUbicacion` se define en Task 6; este check puede pasar igual porque es una llamada a función global que JS resuelve en runtime, no en parse. Si se quiere evitar un ReferenceError al ejecutar entre Task 5 y 6, hacer Task 5 + Task 6 en un solo commit. Recomendado: trabajar 5 y 6 juntas y commitear al cerrar Task 6.)*
- [ ] **Step 5: Commit** — (combinar con Task 6; ver nota). Si se commitea solo: `cd ~/repos/flyclean-app && git add index.html && git commit -m "Fase B p4: resolver cliente+propuesta+maps del servicio al abrir el sheet" -m "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"`

---

### Task B-6: Sheet del servicio — bloque "Cliente + 📍 Ubicación" + override; quitar `edit-mapa`
**Files:** Modify `index.html` — HTML del sheet edit (≈L1259-1285: quitar bloque `edit-mapa`, agregar contenedor del bloque cliente/ubicación), `saveServiceEdit()` (≈L8827-8828), + `renderSvcClienteUbicacion` / `toggleSvcUbicacionOverride` nuevas. Lectura `mapa` en `openEditSheet` L8423 (se mantiene), `document.getElementById('edit-mapa').value = mapa;` L8435 (se borra).
**Interfaces:** Consumes: `resolveMapsUrl` (Task 0), `editState.{mapa,clienteMapa,propMapa,contactoId,clienteNombre}` (Task 5). Produces: bloque visual cliente+ubicación, función `renderSvcClienteUbicacion()`, `toggleSvcUbicacionOverride()`, `openSvcUbicacion()`.

- [ ] **Step 1: Quitar el input Maps suelto del HTML.** Borrar COMPLETO el bloque (≈L1281-1285):
  ```html
      <div class="edit-section">
        <div class="edit-section-label" data-i18n="sheet.edit.section.mapa">LINK GOOGLE MAPS</div>
        <div class="edit-section-hint" data-i18n="sheet.edit.section.mapa.hint" ...>Pegá el link de Google Maps...</div>
        <input type="url" class="edit-date-input" id="edit-mapa" placeholder="https://maps.app.goo.gl/..." oninput="editState.mapa=this.value"/>
      </div>
  ```
  En su lugar, dejar un contenedor vacío que rellena `renderSvcClienteUbicacion()` (mismo punto, después del bloque LUGAR ≈L1280):
  ```html
      <div class="edit-section" id="edit-cliente-ubicacion"></div>
  ```
- [ ] **Step 2: Quitar la línea muerta en `openEditSheet`.** Borrar `document.getElementById('edit-mapa').value = mapa;` (L8435). La línea `const mapa = props['Mapa']?.url || '';` (L8423) y `mapa` dentro de `editState` (L8424) se MANTIENEN: ahora `editState.mapa` es el override del servicio.
- [ ] **Step 3: Definir `renderSvcClienteUbicacion()`** — dibuja "Cliente: X" + botón Ubicación + link override. Insertar junto a `resolveSvcUbicacion` (Task 5). El botón usa `resolveMapsUrl`; si no hay ninguna URL, se deshabilita con gracia. El override se muestra/oculta con un input controlado por `editState.mapa`:
  ```js
  function renderSvcClienteUbicacion() {
    const box = document.getElementById('edit-cliente-ubicacion');
    if (!box) return;
    const url = resolveMapsUrl({ svcMapa: editState.mapa, propMapa: editState.propMapa, clienteMapa: editState.clienteMapa });
    const nombre = editState.clienteNombre || '';
    const hasOverride = !!(editState.mapa && editState.mapa.trim());
    const overrideShown = box.getAttribute('data-override') === '1' || hasOverride;
    const clienteRow = nombre
      ? `<div class="info-row" style="margin-bottom:8px"><span class="info-label">${t('sheet.svc.cliente.label')}:</span> <span class="info-val">${esc(nombre)}</span></div>`
      : '';
    const ubicBtn = url
      ? `<button type="button" class="estado-btn" onclick="openSvcUbicacion()">${t('sheet.svc.ubicacion.btn')}</button>`
      : `<button type="button" class="estado-btn" disabled style="opacity:.5">${t('sheet.svc.ubicacion.btn')}</button>
         <div style="font-size:11px;color:var(--text3);margin-top:4px">${t('sheet.svc.ubicacion.none')}</div>`;
    const overrideLink = `<button type="button" onclick="toggleSvcUbicacionOverride()" style="background:none;border:none;color:var(--text3);font-size:11px;text-decoration:underline;cursor:pointer;padding:6px 0">${t('sheet.svc.ubicacion.override')}</button>`;
    const overrideInput = overrideShown
      ? `<div class="edit-section-label" style="margin-top:8px">${t('sheet.svc.ubicacion.override.label')}</div>
         <div class="edit-section-hint" style="font-size:11px;color:var(--text3);margin-bottom:6px">${t('sheet.svc.ubicacion.override.hint')}</div>
         <input type="url" class="edit-date-input" placeholder="https://maps.app.goo.gl/..." value="${esc(editState.mapa || '')}" oninput="editState.mapa=this.value;renderSvcUbicacionBtnOnly()"/>`
      : '';
    box.innerHTML = clienteRow + ubicBtn + ' ' + overrideLink + overrideInput;
  }
  // Reactualiza solo el habilitado/deshabilitado del botón sin re-pintar el input (evita perder foco al tipear).
  function renderSvcUbicacionBtnOnly() {
    const box = document.getElementById('edit-cliente-ubicacion');
    if (!box) return;
    const btn = box.querySelector('.estado-btn[onclick="openSvcUbicacion()"], .estado-btn[disabled]');
    const url = resolveMapsUrl({ svcMapa: editState.mapa, propMapa: editState.propMapa, clienteMapa: editState.clienteMapa });
    // Re-render del botón solamente (mantener el input con foco intacto).
    if (btn) {
      if (url) { btn.disabled = false; btn.style.opacity = ''; btn.setAttribute('onclick', 'openSvcUbicacion()'); }
      else { btn.disabled = true; btn.style.opacity = '.5'; btn.removeAttribute('onclick'); }
    }
  }
  function toggleSvcUbicacionOverride() {
    const box = document.getElementById('edit-cliente-ubicacion');
    if (!box) return;
    box.setAttribute('data-override', box.getAttribute('data-override') === '1' ? '0' : '1');
    renderSvcClienteUbicacion();
  }
  function openSvcUbicacion() {
    const url = resolveMapsUrl({ svcMapa: editState.mapa, propMapa: editState.propMapa, clienteMapa: editState.clienteMapa });
    if (!url) { alert(t('sheet.svc.ubicacion.none')); return; }
    window.open(url, '_blank', 'noopener');
  }
  ```
  *(El selector de `renderSvcUbicacionBtnOnly` es frágil con el attr exacto; alternativa más simple y robusta: NO definir `renderSvcUbicacionBtnOnly` y en su lugar dejar el `oninput` del override SIN re-render — el botón se reevalúa al cerrar/reabrir el override. Decidir en build: si la UX de "habilitar el botón mientras tipeás el override" no es crítica, usar la versión simple `oninput="editState.mapa=this.value"` sin callback.)*
- [ ] **Step 4: Guardar el override del servicio en `saveServiceEdit()`.** La línea L8828 `props['Mapa'] = editState.mapa ? { url: editState.mapa } : { url: null };` YA hace exactamente esto (override del servicio en la property `Mapa` del servicio). Verificar que sigue presente tras quitar el input. No requiere cambio salvo confirmar que `editState.mapa` ahora viene del input override (Step 3) en vez del `edit-mapa` borrado.
- [ ] **Step 5: Verificar sintaxis** — Run: `cd ~/repos/flyclean-app && npm run check` → Expected: `✅ index.html: N bloque(s) <script> parsean OK`.
- [ ] **Step 6: Verificar funcional (chrome-devtools).**
  - Caso herencia: cliente con `Mapa` cargado (Task 2) + un servicio suyo SIN `Mapa` propio → abrir el sheet del servicio (Coordinador → Servicios → tap card) → aparece "Cliente: X" y el botón "📍 Ubicación" habilitado → al tocarlo abre la URL del cliente.
  - Caso override: tocar "usar otra ubicación para este servicio" → aparece el input → pegar otra URL → Guardar → reabrir → el botón Ubicación abre la URL del servicio (override), NO la del cliente. Verificar con Notion MCP que `Mapa` del servicio quedó con el override.
  - Caso sin nada: cliente sin Maps + servicio sin Maps + sin propuesta → el botón Ubicación aparece deshabilitado con "Sin ubicación cargada", no rompe.
  - Confirmar que el input "LINK GOOGLE MAPS" suelto ya NO existe en el sheet.
- [ ] **Step 7: Commit (cierra Task 5 + Task 6)** — `cd ~/repos/flyclean-app && git add index.html && git commit -m "Fase B p4: cliente visible + botón Ubicación heredada (resolveMapsUrl) + override; quita el input Maps suelto" -m "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"`

---

### Task B-7: Override de ubicación en el sheet de PROPUESTA
**Files:** Modify `index.html` — `openPropSheet()` (lectura + render, ≈L9560-9603), `propEditState` (≈L9562), `savePropEdit()` (rama edit, ≈L9906), + `togglePropUbicacionOverride` nueva. (En `openNewPropSheet`/create NO se agrega: la propuesta nueva todavía no tiene cliente resuelto; el override se setea al re-editar.)
**Interfaces:** Consumes: property `Mapa` (url) en Propuestas (Task 0). Produces: `propEditState.mapa`, bloque de override en el sheet de propuesta que escribe `props['Mapa']`.

- [ ] **Step 1: Leer el `Mapa` de la propuesta al abrir.** En `openPropSheet()`, donde se leen las props (≈L9557-9560), agregar:
  ```js
    const mapaProp = props['Mapa']?.url || '';
  ```
  Y en `propEditState = {...}` (L9562) agregar `mapa: mapaProp` al objeto literal.
- [ ] **Step 2: Render del bloque override en `openPropSheet()`.** En el `innerHTML` que arma el body (≈L9578-9603), insertar tras el bloque Observaciones (después de la sección obs, antes de `create-relev-section`):
  ```js
    `<div class="edit-section"><div class="edit-section-label">${t('sheet.prop.ubicacion.override.label')}</div>
      <div class="edit-section-hint" style="font-size:11px;color:var(--text3);margin-bottom:6px">${t('sheet.prop.ubicacion.override.hint')}</div>
      <input type="url" class="edit-date-input" placeholder="https://maps.app.goo.gl/..." value="${esc(mapaProp)}" oninput="propEditState.mapa=this.value"/></div>` +
  ```
  *(Se muestra siempre en modo edit, como un campo normal. No requiere toggle: es un input opcional, vacío = hereda del cliente.)*
- [ ] **Step 3: Guardar en `savePropEdit()` rama edit.** En el `else` (modo edit, donde se arma `props`, ≈L9896-9907), tras `props['Observaciones'] = ...` (L9906), agregar:
  ```js
      props['Mapa'] = { url: propEditState.mapa && propEditState.mapa.trim() ? propEditState.mapa.trim() : null };
  ```
  (En la rama `create` NO se agrega — coherente con Step 0 de no exponerlo en `openNewPropSheet`.)
- [ ] **Step 4: Verificar sintaxis** — Run: `cd ~/repos/flyclean-app && npm run check` → Expected: `✅ index.html: N bloque(s) <script> parsean OK`.
- [ ] **Step 5: Verificar funcional (Notion MCP + chrome-devtools).** Login Coordinador → Propuestas → abrir una propuesta → aparece el campo "UBICACIÓN PARA ESTA PROPUESTA (OVERRIDE)" → pegar URL → Guardar → con Notion MCP confirmar `Mapa` en la propuesta. Luego abrir un SERVICIO vinculado a esa propuesta cuyo cliente NO tiene Maps y el servicio tampoco → el botón "📍 Ubicación" del servicio debe abrir la URL de la PROPUESTA (precedencia svc → prop → cliente; acá svc vacío → usa prop). Verifica que `resolveSvcUbicacion` (Task 5) trajo bien `propMapa`.
- [ ] **Step 6: Commit** — `cd ~/repos/flyclean-app && git add index.html && git commit -m "Fase B p4: override de ubicación en sheet de propuesta (property Mapa en Propuestas)" -m "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"`

---

### Task B-8: Bump sw v85→v86 + smoke test + deploy
**Files:** Modify `sw.js` (`CACHE`, ≈L82). Deploy = push a `main`.
**Interfaces:** Consumes: todo lo anterior. Produces: clientes invalidan caché y reciben la Fase B.

- [ ] **Step 1: Bump del cache del service worker.** En `sw.js` L82, cambiar `const CACHE = 'flyclean-v85';` → `const CACHE = 'flyclean-v86';`. Agregar comentario de changelog arriba del bloque de versiones (junto a las líneas `// vNN:` ≈L60-82):
  ```js
  // v86: Fase B — ubicación heredable (Maps en cliente + override en servicio/propuesta vía resolveMapsUrl),
  //      intermediario en ficha de cliente, conteo propuestas/servicios; se quitó el input Maps suelto del sheet.
  ```
  *(Verificar que Fase A efectivamente dejó `'flyclean-v85'`; si por algún motivo quedó en otro número, bumpear al siguiente entero coherente y anotarlo. NO bajar de v85.)*
- [ ] **Step 2: Verificar sintaxis del HTML (sigue intacto).** Run: `cd ~/repos/flyclean-app && npm run check` → Expected: `✅ index.html: N bloque(s) <script> parsean OK`.
- [ ] **Step 3: Smoke test read-only.** Run: `cd ~/repos/flyclean-app && npm test` → Expected: smoke pasa (deriva IDs de `index.html`, reads a Notion). Si falla por red/credenciales y no por el código, anotarlo y continuar bajo criterio.
- [ ] **Step 4: Commit del bump.** `cd ~/repos/flyclean-app && git add sw.js && git commit -m "Fase B: bump sw v85 → v86 (ubicación + CRM)" -m "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"`
- [ ] **Step 5: Merge a main + deploy.** Mergear `feat/mejoras-operativas-junio` a `main` (o push directo si la rama es la de trabajo acordada) y `git push origin main` → Vercel auto-deploya. Tras el deploy, abrir `https://flyclean.app` en una ventana limpia, confirmar que el footer/SW reporta v86 y rehacer un smoke visual rápido de los 3 flujos (Maps cliente, intermediario, botón Ubicación del servicio).
- [ ] **Step 6: Actualizar docs.** Tras verificar en prod, anotar la Fase B en `docs/FUNCIONALIDADES.md` (features nuevas: Maps en cliente, intermediario, conteo, ubicación heredada en servicio/propuesta) + la sección "Estado actual" del `CLAUDE.md` raíz + el bump de `sw.js`. (Regla del repo: actualizar docs tras cada feature.)

---

## Notas, riesgos y decisiones de diseño

1. **Precedencia de ubicación** (única fuente de verdad = `resolveMapsUrl`): `svcMapa || propMapa || clienteMapa || null`. El override del servicio gana; luego la propuesta; luego el cliente. Documentado en el comentario del helper (Task 0).
2. **Property-then-deploy:** las 2 properties `Mapa` (Clientes y Propuestas) se crean por MCP en Task 0 ANTES de cualquier PATCH. Si no existieran, Notion ignora la key en silencio (parecería "no anda").
3. **`_coordAllContacts` NO está prefetcheado globalmente** (se llena solo al abrir la vista Clientes). Por eso: (a) el selector de intermediario hace fallback a query Notion (`loadContactIntermediarios`), y (b) el sheet del servicio resuelve cliente+propuesta+maps con fetch async por id (`resolveSvcUbicacion`, mismo patrón que `generateReportPDF`/`openReportStep`). No se asume memoria.
4. **CEO solo lectura:** el bloque `soloLectura` de `openContactSheet` (L10124-10131) deshabilita inputs/selects/estado-btns del body. Como el selector de intermediario se puebla async (después de ese bloque), `loadContactIntermediarios` re-aplica `disabled` para CEO (Task 3 Step 3). El input Maps queda cubierto por el mismo bloque. El override del servicio/propuesta lo editan Coordinador/Finanzas; CEO en esos sheets ya es read-only por las reglas existentes.
5. **Tasks 5 y 6 acopladas:** `openEditSheet` (Task 5) llama a `renderSvcClienteUbicacion` que se define en Task 6 → commitear ambas juntas (un solo commit en Task 6 Step 7) para no dejar un estado intermedio que tire ReferenceError en runtime. `npm run check` (solo parseo) pasa igual, pero la app rompería al abrir un sheet. **Recomendado: implementar 5+6 antes de probar y commitear.**
6. **`renderSvcUbicacionBtnOnly` es opcional:** sirve para habilitar el botón Ubicación en vivo mientras se tipea el override sin perder foco. Si su selector resulta frágil en build, usar la versión simple (`oninput="editState.mapa=this.value"` sin callback) — el botón se reevalúa al togglear el override. Anotado en Task 6 Step 3.
7. **Relation dual `Intermediario` ↔ `Clientes traídos`:** setear `Intermediario` desde el cliente actualiza automáticamente `Clientes traídos` del intermediario (Notion lo hace por ser dual). No se toca `Comisión %` ni nada de facturación (eso es de Finanzas, fuera de alcance).
8. **`Contacto` vs `Contactos`:** el código mezcla `props['Contacto']` (servicios/propuestas) y, en `generateReportPDF`, `props['Contactos']` como fallback. Por seguridad, `resolveSvcUbicacion`/Task 5 lee ambos (`Contacto` con fallback a `Contactos`).
9. **Multi-país:** no cambia. Las queries de clientes/servicios siguen pasando por `recEnPaisNotion`; las properties nuevas no afectan el aislamiento por `País`.

## Dudas para Diego / a confirmar en build
- **D1 — Versión de partida del sw:** este plan asume que **Fase A dejó `sw.js` en `flyclean-v85`**. Al implementar, leer `sw.js` y confirmar; si Fase A quedó en otro valor, ajustar el bump (Task 8) sin bajar de v85.
- **D2 — Override en propuesta: ¿toggle o campo siempre visible?** El plan lo deja como **campo siempre visible** en el sheet de propuesta (más simple). En el servicio sí es toggle ("usar otra ubicación…") porque ahí el caso común es heredar. Si Diego prefiere toggle también en propuesta, es trivial (mismo patrón que Task 6).
- **D3 — Intermediario en modo `create`:** se omite a propósito (cliente sin id todavía). Se setea al re-editar la ficha. Confirmar que está OK que no aparezca al crear un cliente nuevo.


---

# FASE C — Método de trabajo + roles (sw v86→v87)

# Plan de implementación — FASE C: Método de trabajo + Roles (Piloto / Operario manual)

> **Contexto:** PWA single-file `~/repos/flyclean-app/index.html`. La Fase C arranca DESPUÉS de
> Fases A y B (que dejaron `sw.js` en **v86**). Este plan bumpea **v86 → v87** y cierra con deploy.
> Cubre el **Punto 1** (método Dron/Manual + submétodo) y la **parte ROLES del Punto 4**
> (2 columnas Piloto / Operario manual) del spec `2026-06-29-mejoras-operativas-...-design.md`.
>
> **Verificación real (NO existe pytest/jest):**
> - `npm run check` (desde `~/repos/flyclean-app`) tras CADA cambio → "✅ index.html: N bloque(s) `<script>` parsean OK".
> - `npm test` (smoke read-only) antes del deploy.
> - Visual: Playwright / chrome-devtools-mcp → abrir `https://flyclean.app`, rol Operario + Coordinador, screenshot.
> - Writes a Notion → verificar con MCP Notion (`notion-fetch` de la página de servicio).
> - Deploy = `git push` de `~/repos/flyclean-app` a `main`.
>
> **Notion (DB Servicios, datasource `2fbc8a03-5c4f-445c-8516-71dd9b2eea78`):** crear 3 properties
> nuevas vía MCP Notion **ANTES** de deployar (si no existen, el PATCH las ignora en silencio):
> - `Método de trabajo` — select: `🚁 Dron`, `💪 Manual`
> - `Herramienta manual` — select: `Lanzas`, `Manguera`, `Hidrolavadora`, `Otro`
> - `Operario manual` — select
>
> **Properties que se REUSAN (ya existen):** `Operario App` (select, piloto),
> `Operarios participantes` (multi_select, ayudantes), `Hora Inicio` (datetime, programada).
>
> Todas las strings nuevas van en `TRANSLATIONS` en **es** (≈L1700-2270) y **pt-BR** (≈L2270-2820).

---

### Task C-0: Crear las 3 properties en Notion (pre-requisito de deploy)

**Files:** Ninguno del repo. Solo MCP Notion sobre DB Servicios (datasource `2fbc8a03-5c4f-445c-8516-71dd9b2eea78`).
**Interfaces:** Consumes: datasource id. Produces: properties `Método de trabajo`, `Herramienta manual`, `Operario manual`.

- [ ] **Step 1: Crear `Método de trabajo` (select)** — MCP Notion `notion-update-data-source` sobre el datasource `2fbc8a03-5c4f-445c-8516-71dd9b2eea78`, agregando una property select llamada exactamente `Método de trabajo` con opciones `🚁 Dron` (color blue) y `💪 Manual` (color orange). Si la tool no permite editar schema directamente, hacerlo a mano en la UI de Notion (DB Servicios → + nueva property) y dejar registrado en el commit message.
- [ ] **Step 2: Crear `Herramienta manual` (select)** — misma DB, property select `Herramienta manual` con opciones `Lanzas`, `Manguera`, `Hidrolavadora`, `Otro`.
- [ ] **Step 3: Crear `Operario manual` (select)** — misma DB, property select `Operario manual`, sin opciones predefinidas (Notion crea las opciones on-write con los nombres de operario; idéntico a cómo `Operario App` se llena).
- [ ] **Step 4: Verificar** — `notion-fetch` del datasource y confirmar que las 3 properties aparecen con los nombres EXACTOS (incluyendo el emoji en `🚁 Dron` / `💪 Manual`). Nombres exactos = crítico: el PATCH usa estos strings literales.

> ⚠️ Sin este Task hecho, el código de los Tasks 2-3 y 7 escribe properties que Notion ignora en silencio
> y "parece que no anda". Hacerlo PRIMERO.

---

### Task C-1: Agregar campos al estado + i18n del método de trabajo

**Files:** Modify `index.html` (función `resetServiceState`, ≈L3011; bloques `TRANSLATIONS` es ≈L1762 y pt-BR ≈L2312).
**Interfaces:** Consumes: nada. Produces: campos `serviceState.metodoTrabajo`, `serviceState.herramientaManual`; keys i18n `step.metodo.*`.

- [ ] **Step 1: Agregar campos a `resetServiceState()`** — en el objeto que asigna `serviceState` (≈L3012), agregar dos campos nuevos junto a `clima: []`:

```js
function resetServiceState() {
  serviceState = {
    horaInicio: null,
    horaInicioEfectivo: null,
    horaCierreEfectivo: null,
    checklistPre: {},
    checklistPost: {},
    notasPost: '',
    avance: '',
    resultado: '',
    resultadoPrueba: '',
    clima: [],
    metodoTrabajo: '',       // '🚁 Dron' | '💪 Manual'  (Punto 1)
    herramientaManual: '',   // 'Lanzas'|'Manguera'|'Hidrolavadora'|'Otro' (solo si Manual)
    isSaving: false,
    photos: { pre: [], post: [], relevamiento: [] },
    relevamiento: {
      m2: '',
      altura: '',
      dificultades: [],
      servicioSugerido: [],
      notasComercial: ''
    }
  };
}
```

- [ ] **Step 2: Agregar las keys i18n en ES** — en el bloque `es` de `TRANSLATIONS`, justo después de `'step.inicioef.btn': '🕐 REGISTRAR INICIO EFECTIVO',` (≈L1764), insertar:

```js
    'step.metodo.label': '🛠️ MÉTODO DE TRABAJO',
    'step.metodo.hint': 'Elegí cómo se hace el trabajo. Default: Dron. Obligatorio para registrar el inicio efectivo.',
    'step.metodo.dron': '🚁 Dron',
    'step.metodo.manual': '💪 Manual',
    'step.metodo.herramienta.label': '¿Con qué herramienta manual?',
    'step.metodo.herr.lanzas': 'Lanzas',
    'step.metodo.herr.manguera': 'Manguera',
    'step.metodo.herr.hidro': 'Hidrolavadora',
    'step.metodo.herr.otro': 'Otro',
    'step.metodo.required': '⚠️ Elegí el método de trabajo (Dron o Manual) antes de registrar el inicio efectivo.',
    'step.metodo.required.herr': '⚠️ Elegí con qué herramienta manual se trabaja.',
```

- [ ] **Step 3: Agregar las keys i18n en pt-BR** — en el bloque `pt-BR`, justo después de `'step.inicioef.btn': '🕐 REGISTRAR INÍCIO EFETIVO',` (≈L2314), insertar las MISMAS keys traducidas:

```js
    'step.metodo.label': '🛠️ MÉTODO DE TRABALHO',
    'step.metodo.hint': 'Escolha como o trabalho é feito. Padrão: Drone. Obrigatório para registrar o início efetivo.',
    'step.metodo.dron': '🚁 Drone',
    'step.metodo.manual': '💪 Manual',
    'step.metodo.herramienta.label': 'Com qual ferramenta manual?',
    'step.metodo.herr.lanzas': 'Lanças',
    'step.metodo.herr.manguera': 'Mangueira',
    'step.metodo.herr.hidro': 'Lavadora de alta pressão',
    'step.metodo.herr.otro': 'Outro',
    'step.metodo.required': '⚠️ Escolha o método de trabalho (Drone ou Manual) antes de registrar o início efetivo.',
    'step.metodo.required.herr': '⚠️ Escolha com qual ferramenta manual se trabalha.',
```

> Nota: las opciones `Herramienta manual` se GUARDAN en Notion con los strings ES literales
> (`Lanzas`/`Manguera`/`Hidrolavadora`/`Otro`) porque son los nombres de opción del select.
> El i18n solo afecta el LABEL visible del botón, no el valor persistido (ver Task 2 Step 2).

- [ ] **Step 4: Verificar sintaxis** — Run: `npm run check` → Expected: ✅ parsean OK.
- [ ] **Step 5: Commit** — `cd ~/repos/flyclean-app && git add index.html && git commit -m "fase C: estado metodoTrabajo/herramientaManual + i18n método de trabajo (es+pt-BR)" -m "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"`

---

### Task C-2: UI del método de trabajo en el paso `inicio_efectivo` + bloqueo del registro

**Files:** Modify `index.html` (función `renderStep`, rama `step.id === 'inicio_efectivo'` ≈L5939-5971; nuevos handlers junto a `selectClima` ≈L6371; función `registrarInicioEfectivo` ≈L6310).
**Interfaces:** Consumes: `serviceState.metodoTrabajo`, `serviceState.herramientaManual`, helpers i18n del Task 1. Produces: handlers `selectMetodoTrabajo`, `selectHerramientaManual`; bloqueo en `registrarInicioEfectivo`.

- [ ] **Step 1: Insertar el bloque UI del método en el step `inicio_efectivo`** — dentro de la rama `else if (step.id === 'inicio_efectivo')` (≈L5939), agregar un `field-group` de método ENTRE el bloque de clima (cierra en `</div>` de `field-group` ≈L5959) y el `hint hint-amber` ≈L5961. Reemplazar el `content.innerHTML = \`...\`` por esta versión (cambios marcados):

```js
    const herrOpts = [
      { val: 'Lanzas', key: 'step.metodo.herr.lanzas' },
      { val: 'Manguera', key: 'step.metodo.herr.manguera' },
      { val: 'Hidrolavadora', key: 'step.metodo.herr.hidro' },
      { val: 'Otro', key: 'step.metodo.herr.otro' },
    ];
    const esManual = serviceState.metodoTrabajo === '💪 Manual';
    content.innerHTML = `
      ${renderCancelarBanner()}
      <div class="step-title">${t('step.inicioef.title')}</div>
      <div class="step-sub">${t('step.inicioef.sub')}</div>

      <div class="field-group">
        <div class="form-label">${t('step.clima.label')}</div>
        <div class="hint hint-blue" style="margin-bottom:10px">${t('step.clima.hint')}</div>
        <div class="clima-group">
          ${climaOpts.map(o => `<div class="clima-opt ${o.cls} ${(Array.isArray(serviceState.clima) ? serviceState.clima : []).includes(o.val) ? 'selected' : ''}" onclick="selectClima('${o.val}')">${o.label}</div>`).join('')}
        </div>
      </div>

      <div class="field-group">
        <div class="form-label">${t('step.metodo.label')}</div>
        <div class="hint hint-blue" style="margin-bottom:10px">${t('step.metodo.hint')}</div>
        <div class="metodo-group">
          <button type="button" class="metodo-btn ${serviceState.metodoTrabajo === '🚁 Dron' ? 'active' : ''}" onclick="selectMetodoTrabajo('🚁 Dron')">${t('step.metodo.dron')}</button>
          <button type="button" class="metodo-btn ${esManual ? 'active' : ''}" onclick="selectMetodoTrabajo('💪 Manual')">${t('step.metodo.manual')}</button>
        </div>
        ${esManual ? `
          <div class="form-label" style="margin-top:12px">${t('step.metodo.herramienta.label')}</div>
          <div class="herr-group">
            ${herrOpts.map(o => `<button type="button" class="herr-btn ${serviceState.herramientaManual === o.val ? 'active' : ''}" onclick="selectHerramientaManual('${o.val}')">${t(o.key)}</button>`).join('')}
          </div>` : ''}
      </div>

      <div class="hint hint-amber" style="margin-top:12px">${t('step.inicioef.hint')}</div>
      ${serviceState.horaInicioEfectivo
        ? `<div class="ts-recorded"><div class="ts-label">${t('step.inicioef.recorded')}</div><div class="ts-value">${serviceState.horaInicioEfectivo}</div></div>`
        : `<button class="btn-main btn-purple" style="margin-top:16px" onclick="registrarInicioEfectivo()">${t('step.inicioef.btn')}</button>`
      }
    `;
```

- [ ] **Step 2: Agregar los handlers** — junto a `selectClima` (≈L6371, antes de `function photosToNotionFiles`), agregar:

```js
function selectMetodoTrabajo(val) {
  serviceState.metodoTrabajo = val;
  // Si vuelve a Dron, limpiar la herramienta manual (no aplica).
  if (val !== '💪 Manual') serviceState.herramientaManual = '';
  persistServiceState();
  renderStep();
}

function selectHerramientaManual(val) {
  serviceState.herramientaManual = val;
  persistServiceState();
  renderStep();
}
```

- [ ] **Step 3: Bloquear `registrarInicioEfectivo` sin método** — al inicio de `registrarInicioEfectivo` (≈L6310), después del guard `if (serviceState.horaInicioEfectivo)`, agregar la validación:

```js
async function registrarInicioEfectivo() {
  if (serviceState.horaInicioEfectivo) { renderStep(); return; }
  // Punto 1: el método de trabajo es obligatorio antes de registrar el inicio efectivo.
  if (!serviceState.metodoTrabajo) { alert(t('step.metodo.required')); return; }
  if (serviceState.metodoTrabajo === '💪 Manual' && !serviceState.herramientaManual) {
    alert(t('step.metodo.required.herr')); return;
  }
  serviceState.horaInicioEfectivo = timeNow();
  try {
    await queueableUpdateServiceProps(currentService.id, {
      'Hora Inicio Efectivo': { date: { start: isoNow()} },
      'Método de trabajo': { select: { name: serviceState.metodoTrabajo } },
      ...(serviceState.metodoTrabajo === '💪 Manual' && serviceState.herramientaManual
        ? { 'Herramienta manual': { select: { name: serviceState.herramientaManual } } }
        : {})
    });
    showSaving();
    persistServiceStateToLocal();
  } catch (e) { console.warn('Error al guardar inicio efectivo:', e); }
  renderStep();
}
```

- [ ] **Step 4: Agregar CSS de los botones** — junto a `.clima-opt` / `.operario-btn` en el `<style>` (≈L662-664), agregar:

```css
  .metodo-group { display: flex; gap: 10px; }
  .metodo-btn { flex: 1; padding: 16px 12px; border-radius: var(--radius-sm); border: 1px solid var(--border); font-size: 15px; font-weight: 600; cursor: pointer; background: var(--bg); color: var(--text2); font-family: 'Exo 2', sans-serif; transition: all 0.15s; }
  .metodo-btn.active { background: var(--green-dark); border-color: var(--green); color: var(--green); }
  .herr-group { display: flex; flex-wrap: wrap; gap: 8px; }
  .herr-btn { flex: 1 0 calc(50% - 4px); padding: 12px; border-radius: var(--radius-sm); border: 1px solid var(--border); font-size: 13px; font-weight: 500; cursor: pointer; background: var(--bg); color: var(--text2); font-family: 'Exo 2', sans-serif; transition: all 0.15s; }
  .herr-btn.active { background: var(--green-dark); border-color: var(--green); color: var(--green); }
```

- [ ] **Step 5: Verificar sintaxis** — Run: `npm run check` → Expected: ✅ parsean OK.
- [ ] **Step 6: Verificar funcional** — Playwright/chrome-devtools sobre `https://flyclean.app`: login OPERARIO (Diego Laxalt, Uruguay), abrir un servicio (Tipo de registro = Orden/Jornada, no Relevamiento), avanzar hasta el step `INICIO EF.`. Confirmar: (a) aparece "🛠️ MÉTODO DE TRABAJO" con 2 botones; (b) Dron NO despliega submenú; (c) tocar Manual despliega `Lanzas/Manguera/Hidrolavadora/Otro`; (d) sin método elegido, tocar "REGISTRAR INICIO EFECTIVO" → alert "Elegí el método…" y NO registra; (e) con Manual elegido pero sin herramienta → alert de herramienta; (f) con Dron → registra. Screenshot de cada estado.
- [ ] **Step 7: Verificar Notion** — tras registrar con Manual+Hidrolavadora, `notion-fetch` de la página del servicio y confirmar `Método de trabajo = 💪 Manual` y `Herramienta manual = Hidrolavadora`. (Usar un servicio de prueba; no mutar uno real de producción.)
- [ ] **Step 8: Commit** — `git add index.html && git commit -m "fase C (P1): UI método Dron/Manual + submétodo en inicio_efectivo + bloqueo de registro sin método" -m "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"`

---

### Task C-3: Persistir método en el cierre + rehidratar al reabrir (sobrevive apagón)

**Files:** Modify `index.html` (función `buildIncrementalProps` ≈L3055; función `cerrarServicio` ≈L6392/6421; función `hydrateServiceStateFromNotion` ≈L3088; función `hydrateServiceStateFromLocal` ≈L3120).
**Interfaces:** Consumes: `serviceState.metodoTrabajo/herramientaManual`. Produces: properties Notion `Método de trabajo`/`Herramienta manual` en el auto-save incremental + cierre; rehidratación bidireccional.

> El método ya se escribe en `registrarInicioEfectivo` (Task 2). Acá lo incluimos también en el
> **auto-save incremental** (`buildIncrementalProps`, debounce 3s) y en el **cierre** para que sea
> consistente con el patrón del resto de los campos, y lo **rehidratamos** al reabrir un servicio
> (caso apagón: el operario eligió Manual+Hidro, se apagó el celular antes de registrar el inicio
> → al reabrir debe volver a verse seleccionado).

- [ ] **Step 1: Incluir el método en `buildIncrementalProps`** — dentro de `buildIncrementalProps(s)` (≈L3055), antes del `return properties;`, agregar:

```js
  if (s.metodoTrabajo) {
    properties['Método de trabajo'] = { select: { name: s.metodoTrabajo } };
    if (s.metodoTrabajo === '💪 Manual' && s.herramientaManual) {
      properties['Herramienta manual'] = { select: { name: s.herramientaManual } };
    }
  }
  return properties;
```

> Esto hace que `persistServiceState()` (auto-save 3s, llamado desde `selectMetodoTrabajo`/
> `selectHerramientaManual` del Task 2) ya empuje el método a Notion **antes** del registro de
> inicio efectivo → blindaje contra apagón entre "elegí método" y "registré inicio".

- [ ] **Step 2: Incluir el método en `cerrarServicio`** — en `cerrarServicio` (≈L6421), después del bloque de `Condición climática` (≈L6440), agregar al objeto `properties`:

```js
  if (serviceState.metodoTrabajo) {
    properties['Método de trabajo'] = { select: { name: serviceState.metodoTrabajo } };
    if (serviceState.metodoTrabajo === '💪 Manual' && serviceState.herramientaManual) {
      properties['Herramienta manual'] = { select: { name: serviceState.herramientaManual } };
    }
  }
```

- [ ] **Step 3: Rehidratar desde Notion** — en `hydrateServiceStateFromNotion(svc)` (≈L3088), después del bloque de `resultado` (≈L3104), agregar:

```js
  const metodoTrabajo = props['Método de trabajo']?.select?.name;
  if (metodoTrabajo) serviceState.metodoTrabajo = metodoTrabajo;
  const herramientaManual = props['Herramienta manual']?.select?.name;
  if (herramientaManual) serviceState.herramientaManual = herramientaManual;
```

- [ ] **Step 4: Rehidratar desde localStorage (fallback)** — en `hydrateServiceStateFromLocal(id)` (≈L3120), junto a las otras restauraciones de `ls.*` (≈L3128), agregar (con guarda de no pisar lo que ya trajo Notion):

```js
    if (!serviceState.metodoTrabajo && ls.metodoTrabajo) serviceState.metodoTrabajo = ls.metodoTrabajo;
    if (!serviceState.herramientaManual && ls.herramientaManual) serviceState.herramientaManual = ls.herramientaManual;
```

- [ ] **Step 5: Verificar sintaxis** — Run: `npm run check` → Expected: ✅ parsean OK.
- [ ] **Step 6: Verificar funcional (apagón)** — Playwright: rol OPERARIO, abrir servicio de prueba, llegar al step `INICIO EF.`, elegir Manual + Manguera (NO registrar inicio aún). Esperar >3s (auto-save). Simular apagón: `page.reload()`. Reabrir el mismo servicio → confirmar que `computeStepFromState` vuelve al step correcto y que Manual + Manguera siguen seleccionados (rehidratados desde Notion o localStorage). Screenshot.
- [ ] **Step 7: Commit** — `git add index.html && git commit -m "fase C (P1): persistir método en auto-save+cierre y rehidratar al reabrir (blindaje apagón)" -m "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"`

---

### Task C-4: i18n + estado para "Operario manual" (columna nueva del coordinador)

**Files:** Modify `index.html` (bloques `TRANSLATIONS` es ≈L2027 y pt-BR ≈L2577; estado `editState`).
**Interfaces:** Consumes: nada. Produces: keys i18n `sheet.edit.section.operario.col`, `sheet.edit.section.operariomanual.*`; campo `editState.operarioManual`.

- [ ] **Step 1: Keys i18n en ES** — en el bloque `es`, después de `'sheet.edit.section.operario': 'PILOTO',` (≈L2027), agregar:

```js
    'sheet.edit.section.operariomanual': 'OPERARIO MANUAL',
    'sheet.edit.section.operariomanual.hint': 'Operario que hace el trabajo manual (lanzas, manguera, hidro). Opcional.',
```

- [ ] **Step 2: Keys i18n en pt-BR** — en el bloque `pt-BR`, después de `'sheet.edit.section.operario': 'PILOTO',` (≈L2577), agregar:

```js
    'sheet.edit.section.operariomanual': 'OPERADOR MANUAL',
    'sheet.edit.section.operariomanual.hint': 'Operador que faz o trabalho manual (lanças, mangueira, lavadora). Opcional.',
```

- [ ] **Step 3: Verificar sintaxis** — Run: `npm run check` → Expected: ✅ parsean OK.
- [ ] **Step 4: Commit** — `git add index.html && git commit -m "fase C (P4 roles): i18n OPERARIO MANUAL (es+pt-BR)" -m "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"`

---

### Task C-5: HTML de las 2 columnas (Piloto | Operario manual) en el sheet edit

**Files:** Modify `index.html` (HTML del sheet edit, sección PILOTO ≈L1260-1263; CSS `<style>` ≈L662).
**Interfaces:** Consumes: keys i18n del Task 4. Produces: contenedor `#edit-operario-manual-btns`; layout 2 columnas `.role-cols`.

- [ ] **Step 1: Reemplazar la sección PILOTO por una fila de 2 columnas** — sustituir el bloque actual (≈L1260-1263):

```html
      <div class="edit-section">
        <div class="edit-section-label" data-i18n="sheet.edit.section.operario">PILOTO</div>
        <div class="operario-btns" id="edit-operario-btns"></div>
      </div>
```

por:

```html
      <div class="edit-section">
        <div class="role-cols">
          <div class="role-col">
            <div class="edit-section-label" data-i18n="sheet.edit.section.operario">PILOTO</div>
            <div class="operario-btns" id="edit-operario-btns"></div>
          </div>
          <div class="role-col">
            <div class="edit-section-label" data-i18n="sheet.edit.section.operariomanual">OPERARIO MANUAL</div>
            <div class="edit-section-hint" data-i18n="sheet.edit.section.operariomanual.hint" style="font-size:11px;color:var(--text3);margin-bottom:8px">Operario que hace el trabajo manual (lanzas, manguera, hidro). Opcional.</div>
            <div class="operario-btns" id="edit-operario-manual-btns"></div>
          </div>
        </div>
      </div>
```

> La sección AYUDANTES (`#edit-participantes-btns`, ≈L1264-1268) queda **debajo, sin cambios**.

- [ ] **Step 2: CSS de las 2 columnas (responsive ≤430px)** — junto a `.edit-section` (≈L657) en el `<style>`, agregar:

```css
  .role-cols { display: flex; gap: 12px; align-items: flex-start; }
  .role-col { flex: 1 1 0; min-width: 0; }
  /* En pantallas muy angostas (<360px) apilar para que los nombres no se corten */
  @media (max-width: 359px) { .role-cols { flex-direction: column; } }
```

> Con `max-width:430px` del shell, dos columnas `flex:1` dan ~195px cada una; los `.operario-btn`
> ya son `flex-direction:column` (1 botón por fila), así que entran sin romper. El `@media 359px`
> cubre dispositivos chicos.

- [ ] **Step 3: Verificar sintaxis** — Run: `npm run check` → Expected: ✅ parsean OK.
- [ ] **Step 4: Commit** — `git add index.html && git commit -m "fase C (P4 roles): HTML 2 columnas Piloto | Operario manual + CSS responsive" -m "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"`

---

### Task C-6: Render + handler de "Operario manual" (espejo del piloto)

**Files:** Modify `index.html` (nuevas funciones junto a `renderOperarioBtns` ≈L8334 y `selectEditOperario` ≈L8800; lectura en `openEditSheet` ≈L8410-8424 + llamada ≈L8501).
**Interfaces:** Consumes: `operariosDePais`, `editState.operarioManual`, `_extraOperarios`. Produces: `renderOperarioManualBtns()`, `selectEditOperarioManual()`; lectura de `Operario manual` en `openEditSheet`.

- [ ] **Step 1: Leer `Operario manual` en `openEditSheet`** — en `openEditSheet` (≈L8410), después de `const operarioApp = props['Operario App']?.select?.name || '';`, agregar:

```js
  const operarioManualActual = props['Operario manual']?.select?.name || null;
```

y agregar `operarioManual: operarioManualActual,` al objeto `editState` (≈L8424):

```js
  editState = { estado: estadoActual, operario: operarioActual, operarioManual: operarioManualActual, fecha, hora, lugar, mapa, participantes: participantesActuales, pais: props['País']?.select?.name || '', nombre };
```

- [ ] **Step 2: Agregar `renderOperarioManualBtns()`** — junto a `renderOperarioBtns` (después de su cierre ≈L8346), agregar (espejo, sin el botón "+ nuevo" para mantenerlo simple; reusa `_extraOperarios` para no perder los agregados por el piloto):

```js
function renderOperarioManualBtns(current) {
  const container = document.getElementById('edit-operario-manual-btns');
  if (!container) return;
  let options = operariosDePais(editState.pais);
  if (current && !options.includes(current)) options = [current, ...options]; // no perder la asignación actual
  _extraOperarios.forEach(n => { if (!options.includes(n)) options.push(n); });
  container.innerHTML =
    `<button class="operario-btn ${!current ? 'active' : ''}" onclick="selectEditOperarioManual(null,this)">${t('sheet.edit.operario.sinasignar')}</button>` +
    options.map(name => `<button class="operario-btn ${current === name ? 'active' : ''}" data-name="${escAttrEdit(name)}" onclick="selectEditOperarioManual(this.dataset.name,this)">${name}</button>`).join('');
}
```

- [ ] **Step 3: Agregar `selectEditOperarioManual()`** — junto a `selectEditOperario` (después de su cierre ≈L8809), agregar (toggle: tocar el activo lo deselecciona; ambos opcionales):

```js
function selectEditOperarioManual(name, el) {
  // Toggle: si se toca el que ya está activo, deseleccionar (queda opcional).
  if (name && editState.operarioManual === name) name = null;
  editState.operarioManual = name;
  document.querySelectorAll('#edit-operario-manual-btns .operario-btn').forEach(b => b.classList.remove('active'));
  if (el && name) el.classList.add('active');
  else document.querySelector('#edit-operario-manual-btns .operario-btn')?.classList.add('active'); // marca "— Sin asignar"
}
```

- [ ] **Step 4: Renderizar al abrir el sheet** — en `openEditSheet`, después de `renderOperarioBtns(operarioActual);` (≈L8501), agregar:

```js
  renderOperarioManualBtns(operarioManualActual);
```

> Nota: cuando `confirmNewOperario()` (≈L8353) agrega un operario nuevo y re-renderiza el piloto,
> también conviene refrescar la columna manual para que el nuevo nombre aparezca. Agregar al final
> de `confirmNewOperario` (después de `renderParticipantesBtns();` ≈L8360):
> ```js
>   if (document.getElementById('edit-operario-manual-btns')) renderOperarioManualBtns(editState.operarioManual);
> ```

- [ ] **Step 5: Verificar sintaxis** — Run: `npm run check` → Expected: ✅ parsean OK.
- [ ] **Step 6: Verificar funcional** — Playwright: rol COORDINADOR (Uruguay), tab Servicios, abrir el sheet edit de un servicio. Confirmar: (a) se ven 2 columnas lado a lado — izquierda PILOTO, derecha OPERARIO MANUAL; (b) AYUDANTES queda abajo; (c) seleccionar un operario en la columna manual lo marca activo; (d) tocarlo de nuevo lo deselecciona (vuelve a "— Sin asignar"); (e) layout no rompe a 430px. Screenshot.
- [ ] **Step 7: Commit** — `git add index.html && git commit -m "fase C (P4 roles): renderOperarioManualBtns + selectEditOperarioManual (espejo del piloto)" -m "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"`

---

### Task C-7: Guardar `Operario manual` en `saveServiceEdit`

**Files:** Modify `index.html` (función `saveServiceEdit`, ≈L8829).
**Interfaces:** Consumes: `editState.operarioManual`. Produces: property Notion `Operario manual` en el PATCH del servicio.

- [ ] **Step 1: Escribir la property** — en `saveServiceEdit` (≈L8829), inmediatamente después de la línea que guarda `Operario App` (espejarla):

```js
    props['Operario App'] = editState.operario ? { select: { name: editState.operario } } : { select: null };
    props['Operario manual'] = editState.operarioManual ? { select: { name: editState.operarioManual } } : { select: null };
```

> Igual que `Operario App`, si la property no existe en Notion el PATCH la ignora en silencio
> (pero el Task 0 ya la creó). NO se toca `Operario(s)` (people) — eso queda solo para el piloto.

- [ ] **Step 2: Verificar sintaxis** — Run: `npm run check` → Expected: ✅ parsean OK.
- [ ] **Step 3: Verificar funcional + Notion** — Playwright: rol COORDINADOR, abrir un servicio de prueba, asignar un operario en la columna OPERARIO MANUAL, GUARDAR EN NOTION. Luego `notion-fetch` de la página → confirmar `Operario manual = <nombre>`. Reabrir el sheet → confirmar que la columna manual rehidrata el operario guardado (Task 6 Step 1). Probar deseleccionar y guardar → `Operario manual` queda vacío en Notion. Screenshot.
- [ ] **Step 4: Commit** — `git add index.html && git commit -m "fase C (P4 roles): guardar Operario manual en saveServiceEdit" -m "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"`

---

### Task C-8: Bump sw.js v86 → v87, smoke test y deploy

**Files:** Modify `sw.js` (const `CACHE`, ≈L82).
**Interfaces:** Consumes: nada. Produces: cache invalidada para clientes (fuerza descarga del nuevo `index.html`).

- [ ] **Step 1: Bump del CACHE** — en `sw.js` ≈L82, cambiar:

```js
const CACHE = 'flyclean-v86';
```

por:

```js
const CACHE = 'flyclean-v87';
```

> NO tocar `NOTION_CACHE` (≈L94). Confirmar primero con `grep -n "const CACHE" sw.js` que Fases A/B
> efectivamente lo dejaron en `v86`; si quedó en otro número, bumpear desde ese (debe quedar en `v87`).

- [ ] **Step 2: Verificar sintaxis** — Run: `npm run check` (valida `index.html`) → Expected: ✅ parsean OK. (`sw.js` no lo cubre el check, pero es un cambio de un literal.)
- [ ] **Step 3: Smoke test read-only** — Run: `cd ~/repos/flyclean-app && npm test` → Expected: smoke pasa (deriva IDs de `index.html`, lecturas a Notion OK).
- [ ] **Step 4: Commit del bump** — `git add sw.js && git commit -m "fase C: bump sw v86 -> v87 (método de trabajo + operario manual)" -m "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"`
- [ ] **Step 5: Deploy** — `cd ~/repos/flyclean-app && git push origin main`. Vercel auto-deploya. Esperar el build.
- [ ] **Step 6: Verificación post-deploy en producción** — Playwright sobre `https://flyclean.app`: (a) rol OPERARIO → step INICIO EF. muestra el método Dron/Manual y bloquea el registro sin método; (b) rol COORDINADOR → sheet edit muestra las 2 columnas Piloto | Operario manual y guarda `Operario manual` en Notion. Screenshot final de ambos. Confirmar en DevTools/Application que el SW activo es `flyclean-v87`.

---

## Resumen de archivos tocados

- `index.html` — Tasks 1-7 (estado, i18n es+pt-BR, UI step inicio_efectivo, handlers método, persistencia/rehidratación, HTML 2 columnas + CSS, render/handler operario manual, guardado).
- `sw.js` — Task 8 (bump CACHE v86→v87).
- Notion DB Servicios (datasource `2fbc8a03-5c4f-445c-8516-71dd9b2eea78`) — Task 0 (3 properties nuevas).

## Riesgos / consideraciones

1. **Orden property-then-deploy (crítico):** Task 0 DEBE estar hecho antes del push (Task 8). Si no, `Método de trabajo`/`Herramienta manual`/`Operario manual` se ignoran en silencio y "parece que no anda".
2. **Nombres EXACTOS con emoji:** `🚁 Dron` y `💪 Manual` se persisten y comparan literalmente en JS y deben coincidir EXACTO con las opciones del select en Notion (incluido el emoji y el espacio). Cualquier desajuste → Notion crea una opción duplicada o rechaza.
3. **Servicios viejos sin método:** los servicios ya completados antes de esta fase no tienen `Método de trabajo`. La rehidratación deja `serviceState.metodoTrabajo=''` y el default visual es Dron, pero el bloqueo de `registrarInicioEfectivo` solo afecta a registros NUEVOS (los completados no se reabren para registrar inicio). No hay exigencia retroactiva — alineado con el spec ("default Dron + no exigir retroactivo").
4. **`Operario manual` no escribe `Operario(s)` (people):** solo el piloto se mapea al campo people de Notion (vía `notionId`). La columna manual es solo el select `Operario manual`. Decisión consistente con que los ayudantes tampoco tocan `Operario(s)`.
5. **Layout 2 columnas a ≤430px:** dos columnas `flex:1` dan ~195px; los `.operario-btn` son apilados (1 por fila), entran. El `@media 359px` apila por seguridad. Verificar visualmente con nombres largos (ej. "Juan Pablo Rodríguez").
6. **Submétodo opcional vs obligatorio:** si el método es Manual, la herramienta es **obligatoria** para registrar (decisión derivada del spec: el submétodo da el detalle del trabajo manual). Si esto molesta en campo, relajar a opcional es un cambio de 1 línea en `registrarInicioEfectivo` (quitar el segundo guard).

## Dudas para Diego (no bloquean el plan; defaults asumidos)

- **¿La herramienta manual es obligatoria si se elige Manual?** Asumido **sí** (bloquea el registro). Fácil de relajar.
- **¿El "Operario manual" debe excluirse de la lista de Ayudantes** (como hace el piloto)? El spec no lo pide; asumido **no** (puede ser ayudante también, ya que son roles distintos). Si se quiere excluir, replicar la lógica de `renderParticipantesBtns` filtrando también `editState.operarioManual`.
