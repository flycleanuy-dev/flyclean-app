# Jornadas automáticas para servicios sin sectores — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que un servicio de trabajo **sin sectores** que no se termina en el día se cierre con un `%` manual acumulado y **genere solo** la ficha del día siguiente (J1 → J2 → J3…), cada una con sus fotos/checklist propios.

**Architecture:** Todo vive en `index.html` (PWA single-file, sin framework). Se agrega una pregunta "¿Terminaste el trabajo?" en el paso de cierre del operario; si elige "sigo otro día", el cierre marca la ficha actual como `📅 Jornada` con su `%`, y una función nueva `crearJornadaSiguiente()` crea la ficha del día siguiente vía el proxy `/api/notion` (`pages` POST, ya permitido). No se tocan los servicios con sectores ni el botón "Crear jornada" manual del coordinador. Al final se bumpea `sw.js` para propagar el nuevo `index.html`.

**Tech Stack:** HTML/CSS/JS vanilla en un solo archivo, Notion API vía proxy serverless, Service Worker cache. i18n por diccionario `TRANSLATIONS` (es + pt-BR).

## Global Constraints

- **Un solo archivo de app:** todos los cambios de UI/lógica van en `~/repos/flyclean-app/index.html`. El único otro archivo de código es `~/repos/flyclean-app/sw.js` (solo el bump de versión, Task 6).
- **i18n obligatorio en DOS idiomas:** toda string nueva se agrega con su `key` en el bloque **es** (empieza ~línea 1300) **y** en el bloque **pt-BR** (empieza ~línea 2100), y se usa vía `t('key')`. Nunca texto hardcodeado en el render.
- **Sin harness de tests de comportamiento:** la app no tiene tests unitarios (lógica acoplada a DOM/Notion). El gate automático por tarea es **`npm run check`** (valida que el JS embebido de `index.html` parsea; corre `tests/check-html.mjs`). Cada tarea incluye además una **verificación manual** concreta. No se escriben "failing tests" literales porque no hay dónde correrlos; el equivalente es el syntax-check + la verificación descrita.
- **Property `% de avance`:** es tipo `number` y **es escribible** (el código de sectores/jornadas ya la escribe). Se reutiliza para el `%` de la jornada (decisión de Diego).
- **Alcance:** SOLO servicios de trabajo (`Tipo de registro` ≠ Prueba, ≠ Relevamiento) y SIN sectores (`servicioTieneSectores() === false`). No tocar el flujo de sectores ni `submitCreateJornada` (mecanismo viejo, se mantiene).
- **`%` acumulado:** el `%` que ingresa el operario es cuánto va del **trabajo total** (no del día). Válido para "sigo otro día": entero, `0 < % < 100`.
- **Estado de la ficha nueva:** `🔄 Asignado` si hereda piloto (`Operario App`), si no `📋 Pendiente`.
- **Working dir del repo:** `~/repos/flyclean-app`. Rama de trabajo: `feat/jornadas-sin-sectores` (ya creada; el spec ya está commiteado ahí).

Spec de referencia: `docs/superpowers/specs/2026-07-01-jornadas-servicios-sin-sectores-design.md`.

---

## File Structure

- `index.html` — TODA la lógica y UI nueva:
  - Bloque i18n `TRANSLATIONS` (es ~1300, pt-BR ~2100): keys nuevas de la pregunta, `%`, validaciones (Task 1).
  - `resetServiceState()` (~3259): campo `finalizacion` (Task 2).
  - `renderStep()` rama `observaciones` (~6633): pregunta "¿Terminaste?" + `%` condicional (Task 2). Handler `selectFinalizacion()` nuevo cerca de `selectResultado` (Task 2).
  - `crearJornadaSiguiente()` — función nueva, cerca de `submitCreateJornada` (~9959) (Task 3).
  - `cerrarServicio()` (~7014) + `_ejecutarCierre()` (~7045): ramas nuevas para "sigo otro día" sin sectores (Task 4).
  - `coordServiceCard()` (~9239): mostrar `%` en jornadas completadas (Task 5).
- `sw.js` — bump `CACHE` `flyclean-v96` → `flyclean-v97` (Task 6).
- `docs/` + memoria — actualización post-feature (Task 6).

---

### Task 1: Strings i18n (es + pt-BR)

**Files:**
- Modify: `index.html` (bloque es ~1884-1888 y pt-BR ~2507-2511; agregar keys nuevas justo después de las `step.obs.avance.*` en cada bloque)

**Interfaces:**
- Produces: keys de traducción `close.termino.label`, `close.termino.si`, `close.termino.no`, `close.jornada.pct.label`, `close.jornada.pct.hint`, `close.jornada.pct.placeholder`, `close.jornada.need.choice`, `close.jornada.need.pct`, `close.jornada.pct.is100`, `close.jornada.need.online`, `close.jornada.next.error` — usadas por Tasks 2 y 4.

- [ ] **Step 1: Agregar las keys en el bloque español**

En `index.html`, ubicar la línea `'step.obs.avance.auto': 'Se calcula solo según los sectores marcados como hechos.',` (~1888). Insertar **inmediatamente después** de esa línea:

```javascript
    'close.termino.label': '¿Terminaste el trabajo?',
    'close.termino.si': '✅ Sí, quedó terminado',
    'close.termino.no': '🔄 No, sigo otro día',
    'close.jornada.pct.label': '📊 ¿Cuánto va del trabajo?',
    'close.jornada.pct.hint': 'Porcentaje aproximado del trabajo total completado hasta ahora.',
    'close.jornada.pct.placeholder': 'Ej: 50',
    'close.jornada.need.choice': 'Elegí si terminaste el trabajo o si seguís otro día.',
    'close.jornada.need.pct': 'Ingresá cuánto va del trabajo (entre 1 y 99%).',
    'close.jornada.pct.is100': 'Si ya está terminado, elegí "Sí, quedó terminado".',
    'close.jornada.need.online': 'Necesitás conexión para cerrar y programar el día siguiente.',
    'close.jornada.next.error': 'Se guardó tu jornada, pero no se pudo crear la ficha de mañana. Avisá al coordinador.',
```

- [ ] **Step 2: Agregar las keys en el bloque portugués (pt-BR)**

Ubicar la línea `'step.obs.avance.auto': 'É calculado automaticamente pelos setores marcados como feitos.',` (~2511). Insertar **inmediatamente después**:

```javascript
    'close.termino.label': 'Você terminou o trabalho?',
    'close.termino.si': '✅ Sim, ficou pronto',
    'close.termino.no': '🔄 Não, continuo outro dia',
    'close.jornada.pct.label': '📊 Quanto já foi do trabalho?',
    'close.jornada.pct.hint': 'Porcentagem aproximada do trabalho total concluído até agora.',
    'close.jornada.pct.placeholder': 'Ex: 50',
    'close.jornada.need.choice': 'Escolha se terminou o trabalho ou se continua outro dia.',
    'close.jornada.need.pct': 'Informe quanto já foi do trabalho (entre 1 e 99%).',
    'close.jornada.pct.is100': 'Se já está pronto, escolha "Sim, ficou pronto".',
    'close.jornada.need.online': 'Você precisa de conexão para fechar e agendar o dia seguinte.',
    'close.jornada.next.error': 'Sua jornada foi salva, mas não foi possível criar a ficha de amanhã. Avise o coordenador.',
```

- [ ] **Step 3: Verificar sintaxis**

Run: `cd ~/repos/flyclean-app && npm run check`
Expected: PASS (sin errores de parseo).

- [ ] **Step 4: Verificar que las 11 keys existen en ambos idiomas**

Run: `cd ~/repos/flyclean-app && for k in close.termino.label close.termino.si close.termino.no close.jornada.pct.label close.jornada.pct.hint close.jornada.pct.placeholder close.jornada.need.choice close.jornada.need.pct close.jornada.pct.is100 close.jornada.need.online close.jornada.next.error; do n=$(grep -c "'$k'" index.html); echo "$k -> $n"; done`
Expected: cada key imprime `-> 2` (una vez en es, una en pt-BR).

- [ ] **Step 5: Commit**

```bash
cd ~/repos/flyclean-app && git add index.html
git commit -m "feat(jornadas): i18n para pregunta ¿Terminaste? + % de jornada (es+pt)"
```

---

### Task 2: Pregunta "¿Terminaste?" + `%` condicional en el cierre del operario

**Files:**
- Modify: `index.html` — `resetServiceState()` (~3259-3290), rama `observaciones` de `renderStep()` (~6633-6681), y agregar handler `selectFinalizacion()` cerca de `selectResultado`.

**Interfaces:**
- Consumes: keys i18n de Task 1; `serviceState`, `servicioTieneSectores()`, `renderStep()`, `persistServiceStateToLocal()`, `t()`.
- Produces: `serviceState.finalizacion` (`'' | 'termino' | 'continua'`) y `selectFinalizacion(val)` — consumidos por Task 4 (`cerrarServicio`).

- [ ] **Step 1: Agregar el campo `finalizacion` a `resetServiceState()`**

En `resetServiceState()` (~3259), localizar la línea `avance: '',` y agregar **debajo**:

```javascript
    finalizacion: '',                            // '' | 'termino' | 'continua' — ¿terminaste? (servicios de trabajo sin sectores)
```

- [ ] **Step 2: Agregar el handler `selectFinalizacion()`**

Buscar la función `function selectResultado(` en `index.html`. Insertar **inmediatamente antes** de ella esta función nueva:

```javascript
function selectFinalizacion(val) {
  serviceState.finalizacion = val;
  if (val === 'termino') { serviceState.avance = ''; }   // si terminó, el % no aplica
  persistServiceStateToLocal();
  renderStep();
}
```

- [ ] **Step 3: Reemplazar el bloque condicional del paso `observaciones`**

En la rama `observaciones` de `renderStep()` (~6633), localizar el bloque que hoy va desde `${conSectores ? \`` (~6648) hasta el cierre del `field-group` del resultado (~6674). Reemplazar TODO ese tramo (desde la línea `      ${conSectores ? \`` hasta la línea `      </div>` que cierra el field-group del resultado, es decir el bloque 6648-6674 inclusive) por:

```javascript
      ${conSectores ? `
    <div class="field-group">
      <div class="form-label">${t('step.obs.avance.label')}</div>
      <div class="hint hint-blue" style="margin-bottom:6px">${t('step.obs.avance.auto')}</div>
      <div style="font-size:24px;font-weight:800;text-align:center;color:var(--green)">${sectoresAvancePct()}%</div>
      <div style="font-size:12px;color:var(--text3);text-align:center;margin-top:4px">${serviceState.sectores.filter(s=>s.estado==='hecho').length} / ${serviceState.sectores.length} ${t('step.sectores.hechos')}</div>
    </div>
    ` : ''}

      ${(!conSectores && !isPrueba && !tipoReg.includes('Relevamiento')) ? `
    <div class="field-group">
      <div class="form-label">${t('close.termino.label')}</div>
      <div class="radio-group">
        <div class="radio-opt ${serviceState.finalizacion === 'termino' ? 'selected' : ''}" onclick="selectFinalizacion('termino')">${t('close.termino.si')}</div>
        <div class="radio-opt ${serviceState.finalizacion === 'continua' ? 'selected' : ''}" onclick="selectFinalizacion('continua')">${t('close.termino.no')}</div>
      </div>
    </div>
    ${serviceState.finalizacion === 'continua' ? `
    <div class="field-group">
      <div class="form-label">${t('close.jornada.pct.label')}</div>
      <div class="hint hint-blue" style="margin-bottom:10px">${t('close.jornada.pct.hint')}</div>
      <input type="number" min="1" max="99" placeholder="${t('close.jornada.pct.placeholder')}" id="avance-input" value="${serviceState.avance}" oninput="serviceState.avance=this.value; persistServiceStateToLocal();" style="font-size:18px;text-align:center;font-weight:700"/>
    </div>
    ` : ''}
    ` : ''}

      ${(!conSectores && !isPrueba && !tipoReg.includes('Relevamiento') && serviceState.finalizacion !== 'termino') ? '' : `
      <div class="field-group">
        <div class="form-label">${isPrueba ? t('step.obs.resultado.prueba.label') : t('step.obs.resultado.label')}</div>
        <div class="radio-group">
          ${(isPrueba
              ? [t('prueba.resultado.avanza'), t('prueba.resultado.nointeresado'), t('prueba.resultado.recontactar')]
              : ['✅ Exitoso', '⚠️ Con incidencia', '❌ Fallido']
            ).map(r => `
            <div class="radio-opt ${(isPrueba ? serviceState.resultadoPrueba : serviceState.resultado) === r ? 'selected' : ''}" onclick="${isPrueba ? `selectResultadoPrueba('${r}')` : `selectResultado('${r}')`}">${r}</div>
          `).join('')}
        </div>
      </div>
      `}
```

**Nota para el implementador:** el resultado (Éxito/Incidencia/Fallido) se **oculta** para servicios de trabajo sin sectores hasta que el operario elija "Sí, quedó terminado". Cuando elige "No, sigo otro día", en lugar del resultado aparece el `%`. Para servicios con sectores, Prueba y Relevamiento, el bloque de resultado se comporta **igual que hoy** (la condición negativa `serviceState.finalizacion !== 'termino'` solo aplica al caso trabajo-sin-sectores). Verificá que `isPrueba`, `conSectores` y `tipoReg` ya están definidos arriba en la misma rama (líneas ~6634-6638) — no los redefinas.

- [ ] **Step 4: Verificar sintaxis**

Run: `cd ~/repos/flyclean-app && npm run check`
Expected: PASS.

- [ ] **Step 5: Verificación manual (describir, no ejecutar en CI)**

Abrir `index.html` en un navegador (solo UI). No se puede loguear sin backend, pero sí revisar visualmente el diff. Confirmar en el código que:
- Para servicio con sectores: se ve el `%` automático (bloque `conSectores`), sin la pregunta "¿Terminaste?".
- Para servicio de trabajo sin sectores: aparece "¿Terminaste el trabajo?" con dos opciones; al elegir "sigo otro día" aparece el input `%`; al elegir "terminado" aparece el selector de resultado.
- Para Prueba/Relevamiento: el selector de resultado aparece como hoy (sin la pregunta).

- [ ] **Step 6: Commit**

```bash
cd ~/repos/flyclean-app && git add index.html
git commit -m "feat(jornadas): pregunta ¿Terminaste? + % condicional en cierre operario (sin sectores)"
```

---

### Task 3: Función `crearJornadaSiguiente()`

**Files:**
- Modify: `index.html` — agregar la función nueva justo **después** de `submitCreateJornada()` (~termina en línea 10014).

**Interfaces:**
- Consumes: `USERS`, `SERVICIOS_DS_ID`, `callNotion()`, `t()` (existentes; `submitCreateJornada` los usa igual).
- Produces: `async function crearJornadaSiguiente(parentService, numero, fecha)` — consumido por Task 4 (`_ejecutarCierre`). Crea una ficha nueva en la DB Servicios (POST) heredando datos del padre; no devuelve valor (throw si falla).

- [ ] **Step 1: Agregar la función**

Localizar el final de `submitCreateJornada()` (la llave de cierre `}` en ~línea 10014, justo antes de `function overlayClick(e)`). Insertar **después** de esa llave:

```javascript
// Crea programáticamente la ficha del día siguiente (jornada N) heredando datos del padre.
// La usa el cierre del operario cuando un servicio de trabajo SIN sectores "sigue otro día".
// A diferencia de submitCreateJornada (manual, del coord), no lee del DOM y hereda además
// ayudantes/lugar/mapa, arranca 🔄 Asignado si hay piloto, y vincula la Orden madre (raíz).
async function crearJornadaSiguiente(parentService, numero, fecha) {
  const p = parentService.properties || {};
  const nombreOriginal = p['Nombre del servicio']?.title?.[0]?.plain_text || 'Servicio';
  const nombreLimpio = nombreOriginal.replace(/—\s*Jornada\s*\d+\s*$/, '').trim();
  const nombreNueva = `${nombreLimpio} — Jornada ${numero}`;
  const operarioApp = p['Operario App']?.select?.name || null;

  const properties = {
    'Nombre del servicio': { title: [{ text: { content: nombreNueva } }] },
    'Estado': { select: { name: operarioApp ? '🔄 Asignado' : '📋 Pendiente' } },
    'Tipo de registro': { select: { name: '📅 Jornada' } },
    'Jornada N°': { number: numero },
    'Fecha programada': { date: { start: fecha } }
  };
  const pais = p['País']?.select?.name;
  if (pais) properties['País'] = { select: { name: pais } };
  const tipoSvc = p['Tipo de servicio']?.select?.name;
  if (tipoSvc) properties['Tipo de servicio'] = { select: { name: tipoSvc } };
  const propuestaRel = p['Propuesta']?.relation?.[0]?.id;
  if (propuestaRel) properties['Propuesta'] = { relation: [{ id: propuestaRel }] };
  const contactoRel = p['Contacto']?.relation?.[0]?.id;
  if (contactoRel) properties['Contacto'] = { relation: [{ id: contactoRel }] };
  if (operarioApp) {
    properties['Operario App'] = { select: { name: operarioApp } };
    const userForOp = USERS.find(u => u.name === operarioApp);
    if (userForOp?.notionId) properties['Operario(s)'] = { people: [{ object: 'user', id: userForOp.notionId }] };
  }
  const ayudantes = (p['Operarios participantes']?.multi_select || []).map(o => o.name);
  if (ayudantes.length) properties['Operarios participantes'] = { multi_select: ayudantes.map(name => ({ name })) };
  const lugar = p['Lugar']?.rich_text?.[0]?.plain_text;
  if (lugar) properties['Lugar'] = { rich_text: [{ text: { content: lugar } }] };
  const mapa = p['Mapa']?.url;
  if (mapa) properties['Mapa'] = { url: mapa };
  // Vínculo padre↔jornadas: la raíz es la Orden madre del padre, o el padre mismo si es la J1.
  const rootId = p['Orden madre']?.relation?.[0]?.id || parentService.id;
  properties['Orden madre'] = { relation: [{ id: rootId }] };

  await callNotion('pages', 'POST', {
    parent: { type: 'data_source_id', data_source_id: SERVICIOS_DS_ID },
    properties
  });
}
```

- [ ] **Step 2: Verificar sintaxis**

Run: `cd ~/repos/flyclean-app && npm run check`
Expected: PASS.

- [ ] **Step 3: Verificación del vínculo `Orden madre` (⚠️ importante)**

`Orden madre` es una relación de la DB Servicios consigo misma (dual con `Jornadas`). Antes de confiar en ella:
- El implementador (o Diego en la prueba en vivo) debe crear **una** jornada real por este flujo y confirmar en Notion que: (a) la ficha nueva se creó, y (b) el campo `Orden madre` quedó apuntando a la ficha raíz (y `Jornadas` de la raíz la lista).
- **Fallback si el POST falla por `Orden madre`:** quitar únicamente las dos líneas del vínculo (`const rootId = ...` y `properties['Orden madre'] = ...`) y re-verificar. La numeración sigue funcionando (se hereda `Propuesta`/`Contacto`); el vínculo padre-hijo es un extra, no un bloqueante.

Esta verificación se ejecuta junto con la prueba end-to-end de Task 4 (no requiere crear datos de prueba en producción de forma aislada).

- [ ] **Step 4: Commit**

```bash
cd ~/repos/flyclean-app && git add index.html
git commit -m "feat(jornadas): crearJornadaSiguiente() — ficha del día siguiente programática"
```

---

### Task 4: Cablear el cierre "sigo otro día" (`cerrarServicio` + `_ejecutarCierre`)

**Files:**
- Modify: `index.html` — `cerrarServicio()` (~7014-7032), `_ejecutarCierre()` (~7045-7130).

**Interfaces:**
- Consumes: `serviceState.finalizacion` y `serviceState.avance` (Task 2), `crearJornadaSiguiente()` (Task 3), keys i18n (Task 1), `servicioTieneSectores()`, `_cierreResultadoOk()`, `queueableUpdateServiceProps()`, `isoNow()`, `showDoneScreen()`, `t()`.
- Produces: comportamiento de cierre-como-jornada para servicios de trabajo sin sectores.

- [ ] **Step 1: Reemplazar `cerrarServicio()`**

Reemplazar la función completa `cerrarServicio()` (~7014-7032) por:

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

  // Servicio de trabajo SIN sectores: decidir según la pregunta "¿Terminaste?".
  const tipoReg = currentService?.properties?.['Tipo de registro']?.select?.name || '';
  const esTrabajo = !tipoReg.includes('Prueba') && !tipoReg.includes('Relevamiento');
  if (esTrabajo && !servicioTieneSectores()) {
    if (serviceState.finalizacion === 'continua') {
      if (!navigator.onLine) { alert(t('close.jornada.need.online')); return; }
      const pct = parseInt(serviceState.avance, 10);
      if (isNaN(pct) || pct <= 0 || pct >= 100) {
        alert(pct >= 100 ? t('close.jornada.pct.is100') : t('close.jornada.need.pct'));
        return;
      }
      await _ejecutarCierre('continuar');
      return;
    }
    if (serviceState.finalizacion !== 'termino') { alert(t('close.jornada.need.choice')); return; }
    // 'termino' → cae al flujo normal de completar (valida resultado).
  }

  // Sin sectores + terminó (o Prueba/Relevamiento) → completar (valida resultado como hoy).
  if (!_cierreResultadoOk()) return;
  await _ejecutarCierre('completar');
}
```

- [ ] **Step 2: Modificar la rama `else` (sin sectores) de `_ejecutarCierre()`**

En `_ejecutarCierre()`, localizar la rama `else` de sin-sectores (~7082-7089), que hoy es:

```javascript
  } else {
    // Sin sectores: comportamiento de siempre.
    properties['Estado'] = { select: { name: '✅ Completado' } };
    properties['Hora Fin'] = { date: { start: isoNow() } };
    if (((jornadaN != null) || tipoReg.includes('Jornada')) && serviceState.avance !== '') {
      properties['% de avance'] = { number: parseFloat(serviceState.avance) };
    }
  }
```

Reemplazarla por:

```javascript
  } else {
    // Sin sectores.
    properties['Estado'] = { select: { name: '✅ Completado' } };
    properties['Hora Fin'] = { date: { start: isoNow() } };
    if (modo === 'continuar') {
      // Sigo otro día: guardar % acumulado + marcar esta ficha como jornada (la ficha del día siguiente se crea abajo).
      properties['% de avance'] = { number: parseInt(serviceState.avance, 10) };
      properties['Tipo de registro'] = { select: { name: '📅 Jornada' } };
      const curN = currentService?.properties?.['Jornada N°']?.number;
      properties['Jornada N°'] = { number: (typeof curN === 'number' ? curN : 1) };
    } else if (((jornadaN != null) || tipoReg.includes('Jornada')) && serviceState.avance !== '') {
      properties['% de avance'] = { number: parseFloat(serviceState.avance) };
    }
  }
```

- [ ] **Step 3: Gatear la limpieza de checklist SOLO para sectores**

Localizar la línea (~7120):

```javascript
  if (modo === 'continuar') properties['Estado checklist'] = { rich_text: [] };
```

Reemplazarla por (la limpieza del checklist solo aplica cuando se **reprograma la misma ficha** — sectores; en sin-sectores la ficha actual conserva su checklist como registro de esa jornada, y la ficha nueva ya nace vacía):

```javascript
  if (modo === 'continuar' && conSectores) properties['Estado checklist'] = { rich_text: [] };
```

- [ ] **Step 4: Crear la ficha del día siguiente tras el cierre exitoso**

Localizar el bloque `try { ... }` final de `_ejecutarCierre()` (~7122-7129):

```javascript
  try {
    const result = await queueableUpdateServiceProps(currentService.id, properties);
    if (!result?.queued) { try { localStorage.removeItem(storageKeyForService(currentService.id)); } catch (_) {} }
    showDoneScreen(modo === 'continuar');
  } catch (e) {
    if (btn) { btn.textContent = t('btn.close.notion'); btn.disabled = false; }
    alert(t('sheet.alert.save.error'));
  }
```

Reemplazarlo por:

```javascript
  try {
    const result = await queueableUpdateServiceProps(currentService.id, properties);
    if (!result?.queued) { try { localStorage.removeItem(storageKeyForService(currentService.id)); } catch (_) {} }
    // Servicio sin sectores que sigue otro día → crear la ficha del día siguiente (J+1).
    if (!conSectores && modo === 'continuar') {
      const man = new Date(); man.setDate(man.getDate() + 1);
      const fecha = man.toISOString().split('T')[0];
      const curN = currentService?.properties?.['Jornada N°']?.number;
      const siguienteN = (typeof curN === 'number' ? curN : 1) + 1;
      try {
        await crearJornadaSiguiente(currentService, siguienteN, fecha);
      } catch (e) {
        alert(t('close.jornada.next.error'));
      }
    }
    showDoneScreen(modo === 'continuar');
  } catch (e) {
    if (btn) { btn.textContent = t('btn.close.notion'); btn.disabled = false; }
    alert(t('sheet.alert.save.error'));
  }
```

- [ ] **Step 5: Verificar sintaxis**

Run: `cd ~/repos/flyclean-app && npm run check`
Expected: PASS.

- [ ] **Step 6: Verificación manual end-to-end (la corre Diego en producción tras deploy; describir los pasos)**

1. Servicio de trabajo sin sectores, tipo Orden. Operario lo hace, llega a NOTAS/observaciones, elige "🔄 No, sigo otro día", pone `50`, va a CERRAR y cierra.
2. Confirmar: la ficha queda `✅ Completado`, chip `🗓️ Jornada · J1`, `% de avance = 50`, con sus fotos/horas/checklist; y aparece una ficha nueva `🗓️ Jornada · J2` en `🔄 Asignado` con fecha = mañana, mismo piloto/ayudantes/cliente/lugar, sin fotos ni checklist.
3. Abrir J2 como operario: checklist en 0; sacar fotos nuevas; cerrar "✅ Sí, quedó terminado" con resultado → queda `✅ Completado · 100%`.
4. Retrocompat: un servicio normal que se termina en el día (elige "Sí, terminado") se cierra igual que antes.
5. Confirmar el vínculo `Orden madre` (Task 3, Step 3).

- [ ] **Step 7: Commit**

```bash
cd ~/repos/flyclean-app && git add index.html
git commit -m "feat(jornadas): cierre sigo-otro-día crea la ficha del día siguiente (sin sectores)"
```

---

### Task 5: Mostrar el `%` en la card del coordinador para jornadas completadas

**Files:**
- Modify: `index.html` — `coordServiceCard()` (~9259-9281).

**Interfaces:**
- Consumes: `esJornada` (ya calculado en la función, ~9259), `props`, `esc()`.
- Produces: chip `%` en la meta de la card cuando la ficha es jornada y tiene `% de avance`.

- [ ] **Step 1: Leer el `%` de avance dentro de `coordServiceCard`**

En `coordServiceCard()`, localizar la línea `const esRelev = tipoReg.includes('Relevamiento');` (~9261). Insertar **debajo**:

```javascript
  const pctAvance = props['% de avance']?.number;
```

- [ ] **Step 2: Agregar el chip `%` en la meta de la card**

Localizar en el `return` la `<div class="coord-service-meta">` (~9280). Contiene, en orden: el `service-estado`, luego el `horaFmt`, `tipo`, y el badge `servicioContinua`. Insertar el chip del `%` **inmediatamente después** del `<span class="service-estado ...">...</span>` (es decir, entre el estado y el `horaFmt`). El fragmento actual:

```javascript
<div class="coord-service-meta"><span class="service-estado ${estadoClass}">${esc(estado)}</span>${horaFmt ? `<span class="coord-tag">🕐 ${esc(horaFmt)}</span>` : ''}
```

pasa a:

```javascript
<div class="coord-service-meta"><span class="service-estado ${estadoClass}">${esc(estado)}</span>${(esJornada && typeof pctAvance === 'number') ? `<span class="coord-tag">${pctAvance}%</span>` : ''}${horaFmt ? `<span class="coord-tag">🕐 ${esc(horaFmt)}</span>` : ''}
```

- [ ] **Step 3: Verificar sintaxis**

Run: `cd ~/repos/flyclean-app && npm run check`
Expected: PASS.

- [ ] **Step 4: Verificación manual**

En la vista del coordinador, una jornada completada (ej. J1 al 50%) debe mostrar en su meta el chip `50%` junto al estado `✅ Completado`. Servicios no-jornada no muestran el chip. (Diego lo confirma en vivo.)

- [ ] **Step 5: Commit**

```bash
cd ~/repos/flyclean-app && git add index.html
git commit -m "feat(jornadas): mostrar % en la card del coordinador para jornadas"
```

---

### Task 6: Bump del Service Worker + docs + verificación final

**Files:**
- Modify: `sw.js` (línea 1, `const CACHE = 'flyclean-v96';`).
- Modify: `docs/FUNCIONALIDADES.md` (agregar la feature al catálogo, si el archivo existe).
- Modify: `docs/superpowers/specs/2026-07-01-jornadas-servicios-sin-sectores-design.md` (marcar como implementado — opcional).

**Interfaces:**
- Consumes: nada (tarea de cierre).
- Produces: nueva versión de cache para propagar el `index.html` a los clientes.

- [ ] **Step 1: Bump de la versión del cache en `sw.js`**

En `sw.js`, línea 1: cambiar `const CACHE = 'flyclean-v96';` por:

```javascript
const CACHE = 'flyclean-v97';
```

- [ ] **Step 2: Verificar sintaxis del SW**

Run: `cd ~/repos/flyclean-app && node --check sw.js`
Expected: sin salida (OK).

- [ ] **Step 3: Actualizar `docs/FUNCIONALIDADES.md`**

Si existe `docs/FUNCIONALIDADES.md`, agregar una entrada al catálogo feature→función (seguir el formato del archivo):

```
- **Jornadas automáticas (servicios sin sectores)**: al cerrar, el operario elige "¿Terminaste?"; si "sigo otro día" ingresa el % acumulado → la ficha se cierra como 🗓️ Jornada Jn con su % y se crea sola la ficha del día siguiente (fecha editable por el coord). Funciones: `selectFinalizacion`, `crearJornadaSiguiente`, `cerrarServicio`, `_ejecutarCierre` (rama sin-sectores 'continuar'), chip % en `coordServiceCard`.
```

Si el archivo no existe, saltear este step (no crear el archivo).

- [ ] **Step 4: Verificación final completa**

Run: `cd ~/repos/flyclean-app && npm run check && npm test && node --check sw.js`
Expected: `npm run check` PASS, `npm test` (smoke) PASS, `node --check sw.js` OK.

- [ ] **Step 5: Commit**

```bash
cd ~/repos/flyclean-app && git add sw.js docs/
git commit -m "chore(jornadas): bump sw v97 + docs de jornadas sin sectores"
```

---

## Self-Review

**1. Spec coverage:**
- Cierre "¿Terminaste?" (Sí/No) → Task 2. ✓
- `%` acumulado solo si "No" → Task 2 (input condicional). ✓
- Cerrar ficha como Jornada con % + crear ficha siguiente → Task 4 + Task 3. ✓
- Ficha nueva: hereda piloto/ayudantes/cliente/propuesta/país/tipo/lugar/mapa, Asignado, fecha mañana editable, checklist en 0, sin fotos → Task 3. ✓
- Numeración J1/J2/J3 (repetible) → Task 4 (`siguienteN = (curN||1)+1`), Task 3 (nombre "— Jornada N"). ✓
- Fotos/checklist por día gratis (ficha propia) → naturaleza del modelo; Task 3 no copia fotos/checklist. ✓
- Chip `🗓️ Jornada · Jn` → ya existe en `coordServiceCard` vía `esJornada`; Task 4 marca `Tipo de registro=Jornada` + `Jornada N°`. ✓
- Mostrar `%` en la card (preview "Completado · 50%") → Task 5. ✓
- Solo trabajo sin sectores; no Prueba/Relev/sectores → Task 2 y Task 4 (condición `esTrabajo && !servicioTieneSectores()`). ✓
- Reusar `% de avance` (decisión Diego) → Task 4. ✓
- Vínculo `Orden madre` (hallazgo del spec) → Task 3 + verificación con fallback. ✓
- No tocar sectores ni `submitCreateJornada` → confirmado; Task 4 gatea la limpieza de checklist a `conSectores`. ✓
- SW bump → Task 6. ✓
- Contabilidad (guardar horas efectivas/jornales por ficha, reporte después) → se guarda naturalmente (cada ficha con Hora Inicio/Fin Efectivo + Operarios participantes); sin tarea de reporte (fuera de alcance). ✓

**2. Placeholder scan:** sin "TBD/TODO/etc."; todos los steps de código muestran el código completo. ✓

**3. Type consistency:** `serviceState.finalizacion` (string) consistente entre Task 2 (set en `selectFinalizacion`, default en reset) y Task 4 (leído en `cerrarServicio`). `crearJornadaSiguiente(parentService, numero, fecha)` — firma idéntica en Task 3 (definición) y Task 4 (llamada). `pctAvance` (Task 5) es local a `coordServiceCard`. `modo === 'continuar'` usado consistentemente. ✓

Sin gaps detectados.
