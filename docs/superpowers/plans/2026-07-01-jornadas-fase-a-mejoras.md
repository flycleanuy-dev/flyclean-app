# Jornadas — Mejoras Fase A — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aplicar 5 mejoras concretas al sistema de jornadas (cierre, herencia de fotos, etiquetas, retiro del mecanismo viejo) sin romper nada de lo existente.

**Architecture:** Todo en `index.html` (PWA single-file). Cambios pequeños y aislados sobre funciones existentes, más 3 helpers de lectura nuevos. Sin properties Notion nuevas. Al final, bump de `sw.js`.

**Tech Stack:** HTML/CSS/JS vanilla en un solo archivo; Notion API vía proxy; i18n por diccionario `TRANSLATIONS` (es + pt-BR); Service Worker cache.

## Global Constraints

- **⚠️ NO ROMPER LO EXISTENTE (prioridad de Diego):** la app es un solo archivo enorme; un cambio mal ubicado rompe algo lejano. Cada tarea trae el contexto histórico de cómo funciona hoy y qué NO tocar. **Toda edición se hace por match EXACTO del string "viejo" que se muestra** (no reescribir funciones enteras de memoria).
- **Un solo archivo de app:** todos los cambios en `~/repos/flyclean-app/index.html`, salvo el bump de `sw.js` (Task 5).
- **i18n en DOS idiomas:** toda string va con su key en el bloque **es** (~línea 1300+) y **pt-BR** (~línea 2100+), vía `t('key')`. Nunca texto hardcodeado.
- **Sin harness de tests de comportamiento:** gate automático por tarea = **`npm run check`** (valida que el JS embebido de `index.html` parsea; corre `tests/check-html.mjs`). No hay tests unitarios; su ausencia NO es defecto. Cada tarea incluye además verificación manual + una **traza de retrocompat** (por lectura de código).
- **Sin properties Notion nuevas.** Reusa `📸 Fotos pre-servicio`, `Orden madre`, `% de avance`, `Estado`, `Jornada N°`, `Tipo de registro`.
- **Alcance = Fase A.** NO incluye: desplegable en historial del cliente, vista Notion, badge en CEO (esos son Fase B, diseño aparte).
- **Working dir:** `~/repos/flyclean-app`. Rama: `feat/jornadas-fase-a` (ya creada; el spec ya está commiteado ahí).

Spec: `docs/superpowers/specs/2026-07-01-jornadas-fase-a-mejoras-design.md`.

---

## File Structure

- `index.html` — TODO:
  - i18n `TRANSLATIONS` (es ~1915, pt ~2549): cambiar `btn.close.notion` + 3 keys nuevas (Task 1).
  - `cierreSectoresElegir` (~10457): doble confirmación (Task 2).
  - `crearJornadaSiguiente` (~10099-10140): heredar fotos pre (Task 3).
  - Helpers `jobRootId`/`jobGroup`/`jobCompleto` (nuevos, antes de `coordServiceCard`) + `coordServiceCard` (~9317-9363): etiqueta + badge (Task 4).
  - `openEditSheet` visibilidad `edit-jornada-cta` (~9613-9618): ocultar botón viejo (Task 5).
- `sw.js` — bump `CACHE` `flyclean-v97` → `flyclean-v98` (Task 5).
- `docs/FUNCIONALIDADES.md` — entrada de la mejora (Task 5).

---

### Task 1: Strings i18n (cambiar `btn.close.notion` + 3 keys nuevas)

**Contexto histórico:** `TRANSLATIONS` es un objeto con dos bloques: **es** (default) y **pt-BR**. Cada
key aparece UNA vez por bloque. `btn.close.notion` ya existe (hoy `🏁 Cerrar` / `🏁 Fechar`) y se usa en
el botón rojo del cierre del operario (línea 6831) y al re-habilitarlo (línea 7205). Cambiamos su VALOR
(no su key) y agregamos 3 keys nuevas justo debajo, en cada bloque.

**Files:**
- Modify: `index.html` (es: línea 1915; pt: línea 2549)

**Interfaces:**
- Produces: keys `btn.close.notion` (nuevo valor), `cierre.sectores.confirm.cerrar`,
  `estado.jornada.completada`, `badge.servicio.completo` — usadas por Tasks 2 y 4.

- [ ] **Step 1: Bloque español — cambiar `btn.close.notion` y agregar 3 keys**

Reemplazar la línea (1915):
```javascript
    'btn.close.notion': '🏁 Cerrar',
```
por:
```javascript
    'btn.close.notion': '🏁 Cerrar servicio',
    'cierre.sectores.confirm.cerrar': 'El trabajo no se terminó: faltan {n} sector(es). ¿Cerrarlo así igual, en lugar de seguir otro día?',
    'estado.jornada.completada': '🗓️ Jornada {n} completada',
    'badge.servicio.completo': '✅ Servicio completo',
```

- [ ] **Step 2: Bloque portugués (pt-BR) — cambiar `btn.close.notion` y agregar 3 keys**

Reemplazar la línea (2549):
```javascript
    'btn.close.notion': '🏁 Fechar',
```
por:
```javascript
    'btn.close.notion': '🏁 Fechar serviço',
    'cierre.sectores.confirm.cerrar': 'O trabalho não terminou: faltam {n} setor(es). Fechar assim mesmo, em vez de continuar outro dia?',
    'estado.jornada.completada': '🗓️ Jornada {n} concluída',
    'badge.servicio.completo': '✅ Serviço completo',
```

- [ ] **Step 3: Verificar sintaxis**

Run: `cd ~/repos/flyclean-app && npm run check`
Expected: PASS.

- [ ] **Step 4: Verificar keys presentes en ambos idiomas**

Run: `cd ~/repos/flyclean-app && for k in cierre.sectores.confirm.cerrar estado.jornada.completada badge.servicio.completo; do echo "$k -> $(grep -c "'$k'" index.html)"; done && echo "btn.close.notion -> $(grep -c "'btn.close.notion'" index.html)"`
Expected: cada una de las 3 keys nuevas → `2`; `btn.close.notion` → `2`.

- [ ] **Step 5: Verificar que el valor viejo desapareció**

Run: `cd ~/repos/flyclean-app && grep -n "'btn.close.notion': '🏁 Cerrar'," index.html || echo "OK: valor viejo ya no existe"`
Expected: `OK: valor viejo ya no existe`.

- [ ] **Step 6: Commit**

```bash
cd ~/repos/flyclean-app && git add index.html
git commit -m "feat(jornadas-A): i18n — botón 'Cerrar servicio' + keys confirm/etiqueta/badge (es+pt)"
```

---

### Task 2: Doble confirmación en "Ya está, cerrar así" (modal de sectores)

**Contexto histórico:** cuando un servicio CON sectores se cierra sin terminar, aparece el modal
`cierre-sectores-overlay` con 3 botones: "🔄 Sigo otro día" (`cierreSectoresElegir('continuar')`),
"✅ Ya está, cerrar así" (`cierreSectoresElegir('completar')`) y "Cancelar". La función
`cierreSectoresElegir(modo)` hoy: valida resultado si es 'completar', cierra el modal y ejecuta el cierre.
Queremos que 'completar' (cerrar incompleto) pida una **confirmación extra**. `serviceState.sectores`
está disponible (contexto operario) y contiene los sectores con su `estado`.

**Files:**
- Modify: `index.html` — `cierreSectoresElegir` (~10457-10462)

**Interfaces:**
- Consumes: `t('cierre.sectores.confirm.cerrar')` (Task 1); `serviceState.sectores`, `_cierreResultadoOk`,
  `closeCierreSectoresModal`, `_ejecutarCierre` (existentes).

- [ ] **Step 1: Reemplazar `cierreSectoresElegir`**

Reemplazar (10457-10462):
```javascript
async function cierreSectoresElegir(modo) {
  // 'completar' exige resultado (el servicio termina); 'continuar' no (sigue otro día).
  if (modo === 'completar' && !_cierreResultadoOk()) return;
  closeCierreSectoresModal();
  await _ejecutarCierre(modo);
}
```
por:
```javascript
async function cierreSectoresElegir(modo) {
  // 'completar' exige resultado (el servicio termina); 'continuar' no (sigue otro día).
  if (modo === 'completar' && !_cierreResultadoOk()) return;
  // Cerrar un servicio con sectores SIN terminar es excepcional → doble confirmación (algo pasó;
  // lo normal sería "seguir otro día"). Recuento de sectores pendientes para el mensaje.
  if (modo === 'completar') {
    const pend = (serviceState.sectores || []).filter(s => s.estado !== 'hecho').length;
    if (!confirm(t('cierre.sectores.confirm.cerrar').replace('{n}', pend))) return;
  }
  closeCierreSectoresModal();
  await _ejecutarCierre(modo);
}
```

- [ ] **Step 2: Verificar sintaxis**

Run: `cd ~/repos/flyclean-app && npm run check`
Expected: PASS.

- [ ] **Step 3: Verificación de retrocompat (por lectura)**

Confirmar en el código que: (a) el `confirm` SOLO aparece en el path `modo === 'completar'`; (b)
'continuar' (sigo otro día) y "Cancelar" (`closeCierreSectoresModal`) no cambian; (c) el modal solo lo
usan servicios CON sectores (los sin sectores usan otro flujo) → esto no afecta a servicios sin sectores.

- [ ] **Step 4: Commit**

```bash
cd ~/repos/flyclean-app && git add index.html
git commit -m "feat(jornadas-A): doble confirmación al cerrar servicio con sectores incompleto"
```

---

### Task 3: La continuación (J2) hereda las fotos "antes"

**Contexto histórico:** `crearJornadaSiguiente(parentService, numero, fecha)` (~10099) crea la ficha del
día siguiente al cerrar "sigo otro día" un servicio SIN sectores. Hoy hereda datos (cliente, piloto,
ayudantes, lugar, mapa, `Orden madre`) pero **NO fotos** → la J2 arranca sin fotos. Al comienzo de la
función hay `const p = parentService.properties || {};`. El bloque termina construyendo `properties` y
haciendo `await callNotion('pages', 'POST', {...})` (línea 10136). Las fotos en Notion son `files` tipo
`external` con `{ name, external:{ url } }` (URLs de R2). Al abrir la J2, `hydrateServiceStateFromNotion`
ya carga `📸 Fotos pre-servicio` en `serviceState.photos.pre` (se muestran como `done`, con opción de
agregar). Queremos heredar SOLO las "antes" (pre); las "después" (post) son por día y NO se heredan; el
checklist NO se copia (arranca en 0, ya es así).

**Files:**
- Modify: `index.html` — `crearJornadaSiguiente`, insertar antes del `await callNotion` (~10135)

**Interfaces:**
- Consumes: `parentService.properties['📸 Fotos pre-servicio']` (variable local `p`).
- Produces: la ficha nueva nace con las fotos "antes" heredadas.

- [ ] **Step 1: Insertar la copia de fotos "antes" antes del POST**

Localizar (10132-10136):
```javascript
  // Vínculo padre↔jornadas: la raíz es la Orden madre del padre, o el padre mismo si es la J1.
  const rootId = p['Orden madre']?.relation?.[0]?.id || parentService.id;
  properties['Orden madre'] = { relation: [{ id: rootId }] };

  await callNotion('pages', 'POST', {
```
Reemplazar por:
```javascript
  // Vínculo padre↔jornadas: la raíz es la Orden madre del padre, o el padre mismo si es la J1.
  const rootId = p['Orden madre']?.relation?.[0]?.id || parentService.id;
  properties['Orden madre'] = { relation: [{ id: rootId }] };

  // Heredar las fotos "ANTES" del día 1 (el estado inicial del edificio ya está fotografiado; el
  // operario suma las que falten). Las fotos "DESPUÉS" NO se heredan (son el resultado de cada día).
  const prePhotos = p['📸 Fotos pre-servicio']?.files;
  if (Array.isArray(prePhotos) && prePhotos.length) {
    const preFiles = prePhotos
      .map(f => ({ type: 'external', name: f.name || 'foto.jpg', external: { url: f.external?.url || f.file?.url || null } }))
      .filter(f => f.external.url);
    if (preFiles.length) properties['📸 Fotos pre-servicio'] = { files: preFiles };
  }

  await callNotion('pages', 'POST', {
```

- [ ] **Step 2: Verificar sintaxis**

Run: `cd ~/repos/flyclean-app && npm run check`
Expected: PASS.

- [ ] **Step 3: Verificación de retrocompat (por lectura)**

Confirmar: (a) solo se copia `📸 Fotos pre-servicio` (NO `📸 Fotos post-servicio` ni `Estado checklist`);
(b) si el padre no tiene fotos pre, `properties['📸 Fotos pre-servicio']` no se setea (la J2 arranca sin
fotos, como hoy); (c) `crearJornadaSiguiente` solo se llama en el cierre "sigo otro día" de servicios SIN
sectores → no afecta sectores ni otros flujos; (d) las URLs se re-mapean como `external` (mismo formato
que usan las fotos en Notion).

- [ ] **Step 4: Commit**

```bash
cd ~/repos/flyclean-app && git add index.html
git commit -m "feat(jornadas-A): la jornada siguiente hereda las fotos 'antes' del día anterior"
```

---

### Task 4: Helpers de agrupación + etiqueta por día + badge "Servicio completo"

**Contexto histórico:** `coordServiceCard(s)` (~9317-9363) renderiza cada tarjeta de servicio en el
panel del coordinador. Ya calcula `jornadaN`, `esJornada`, `pctAvance`, `estadoClass`, y en el `return`
muestra `<span class="service-estado ${estadoClass}">${esc(estado)}</span>` + (para jornadas) el chip
`{Math.round(pctAvance)}%`. `_coordAllServices` es el array (en memoria) de los servicios cargados del
coordinador. El vínculo `Orden madre` se ESCRIBE en cada jornada (apunta a la raíz = J1) pero la app
**no lo lee** todavía. Queremos: (1) que una jornada completada muestre "🗓️ Jornada N completada" en vez
de "✅ Completado"; (2) un badge verde "✅ Servicio completo" cuando el TRABAJO entero (grupo de jornadas)
llegó al 100%. Para (2) agregamos 3 helpers de solo-lectura que agrupan por `Orden madre`.

**Files:**
- Modify: `index.html` — insertar 3 helpers antes de `function coordServiceCard(s) {` (~9317) y editar
  el cuerpo de `coordServiceCard` (~9355-9358).

**Interfaces:**
- Consumes: `t('estado.jornada.completada')`, `t('badge.servicio.completo')` (Task 1); `_coordAllServices`.
- Produces: `jobRootId(svc)`, `jobGroup(svc, pool)`, `jobCompleto(svc, pool)` — helpers de lectura
  reutilizables (Fase B los reusará).

- [ ] **Step 1: Agregar los 3 helpers antes de `coordServiceCard`**

Localizar la línea:
```javascript
function coordServiceCard(s) {
```
Insertar **inmediatamente antes**:
```javascript
// ── Agrupación de jornadas por "trabajo madre" (LEE la relación Orden madre) ──
// Un trabajo multi-día = varias fichas que comparten la misma raíz (Orden madre, o la ficha misma si es J1).
function jobRootId(svc) {
  const p = svc?.properties || {};
  return p['Orden madre']?.relation?.[0]?.id || svc?.id;
}
function jobGroup(svc, pool) {
  const root = jobRootId(svc);
  if (!root) return svc ? [svc] : [];
  return (pool || []).filter(f => f.id === root || (f.properties?.['Orden madre']?.relation?.[0]?.id === root));
}
// El trabajo está "completo" si alguna ficha del grupo quedó Completada al 100% (la jornada final).
function jobCompleto(svc, pool) {
  return jobGroup(svc, pool).some(f => (f.properties?.['Estado']?.select?.name || '').includes('Completado') && f.properties?.['% de avance']?.number === 100);
}

function coordServiceCard(s) {
```

- [ ] **Step 2: Calcular `estadoDisplay` y `jobDone` en `coordServiceCard`**

Localizar (9355):
```javascript
  const estadoClass = estado.includes('Completado') ? 'estado-completado' : estado.includes('En curso') ? 'estado-en-curso' : estado.includes('Asignado') ? 'estado-asignado' : 'estado-pendiente';
```
Reemplazar por:
```javascript
  const estadoClass = estado.includes('Completado') ? 'estado-completado' : estado.includes('En curso') ? 'estado-en-curso' : estado.includes('Asignado') ? 'estado-asignado' : 'estado-pendiente';
  // Etiqueta por día: una jornada completada se lee "🗓️ Jornada N completada" (conserva el color verde).
  const estadoDisplay = (esJornada && jornadaN != null && estado.includes('Completado')) ? t('estado.jornada.completada').replace('{n}', jornadaN) : estado;
  // Badge "Servicio completo": el trabajo entero (grupo de jornadas) llegó al 100% (calculado agrupando).
  const jobDone = jobCompleto(s, _coordAllServices);
```

- [ ] **Step 3: Usar `estadoDisplay` y agregar el badge en el `return`**

Localizar (9358), la línea de la `coord-service-meta`:
```javascript
    <div class="coord-service-meta"><span class="service-estado ${estadoClass}">${esc(estado)}</span>${(esJornada && typeof pctAvance === 'number') ? `<span class="coord-tag">${Math.round(pctAvance)}%</span>` : ''}${horaFmt ? `<span class="coord-tag">🕐 ${esc(horaFmt)}</span>` : ''}${tipo ? `<span class="coord-tag">${esc(tipo)}</span>` : ''}${(() => { const c = servicioContinua(s); return c.continua ? `<span class="coord-tag" style="background:var(--amber-dark,#7c5300);color:var(--amber,#f59e0b)">${t('badge.continua').replace('{h}', c.hechos).replace('{t}', c.total)}</span>` : ''; })()}</div>
```
Reemplazar por (cambia `${esc(estado)}` → `${esc(estadoDisplay)}` y agrega el badge de "Servicio completo" tras el chip `%`):
```javascript
    <div class="coord-service-meta"><span class="service-estado ${estadoClass}">${esc(estadoDisplay)}</span>${(esJornada && typeof pctAvance === 'number') ? `<span class="coord-tag">${Math.round(pctAvance)}%</span>` : ''}${jobDone ? `<span class="coord-tag" style="background:var(--green-dark,#14532d);color:var(--green,#22c55e)">${t('badge.servicio.completo')}</span>` : ''}${horaFmt ? `<span class="coord-tag">🕐 ${esc(horaFmt)}</span>` : ''}${tipo ? `<span class="coord-tag">${esc(tipo)}</span>` : ''}${(() => { const c = servicioContinua(s); return c.continua ? `<span class="coord-tag" style="background:var(--amber-dark,#7c5300);color:var(--amber,#f59e0b)">${t('badge.continua').replace('{h}', c.hechos).replace('{t}', c.total)}</span>` : ''; })()}</div>
```

- [ ] **Step 4: Verificar sintaxis**

Run: `cd ~/repos/flyclean-app && npm run check`
Expected: PASS.

- [ ] **Step 5: Verificación de retrocompat (por lectura)**

Confirmar: (a) `estadoDisplay` = `estado` (sin cambio) salvo cuando es jornada COMPLETADA con número →
servicios normales, en curso, prueba, relevamiento muestran el estado igual que hoy; (b) `jobDone` para
un servicio NO-jornada: su grupo es él mismo, y como no tiene `% de avance === 100` (solo las jornadas lo
tienen), `jobDone` es false → sin badge (servicios normales no reciben el badge); (c) los helpers son
solo-lectura (no escriben nada); (d) el resto de los chips (%/hora/tipo/continúa) queda intacto.

- [ ] **Step 6: Commit**

```bash
cd ~/repos/flyclean-app && git add index.html
git commit -m "feat(jornadas-A): etiqueta 'Jornada N completada' + badge 'Servicio completo' (agrupa por Orden madre)"
```

---

### Task 5: Ocultar el botón viejo + bump sw v98 + docs + verificación final

**Contexto histórico:** el botón `edit-jornada-cta` ("📅 Crear jornada para otro día") en el sheet de
edición del coordinador se muestra hoy para todo lo que no sea Relevamiento (`openEditSheet`,
líneas 9613-9618: `jornadaCTA.style.display = isRelev ? 'none' : '';`). Con el flujo automático nuevo
(operario cierra "sigo otro día"), este botón manual queda de lado (decisión de Diego). Lo **ocultamos
siempre**; las funciones `openCreateJornadaSheet`/`submitCreateJornada` quedan en el código (muertas, sin
botón) para no arriesgar — se borran en una limpieza futura. `sw.js` línea 90 tiene
`const CACHE = 'flyclean-v97';`.

**Files:**
- Modify: `index.html` (~9613-9618)
- Modify: `sw.js` (línea 90)
- Modify: `docs/FUNCIONALIDADES.md`

- [ ] **Step 1: Ocultar el botón viejo**

Localizar (9612-9618):
```javascript
  // Mostrar CTA de "Crear jornada" si NO es relevamiento
  const jornadaCTA = document.getElementById('edit-jornada-cta');
  if (jornadaCTA) {
    const tipoReg = props['Tipo de registro']?.select?.name || '';
    const isRelev = tipoReg.includes('Relevamiento');
    jornadaCTA.style.display = isRelev ? 'none' : '';
  }
```
Reemplazar por:
```javascript
  // Sistema viejo de "Crear jornada" manual: OCULTO. Lo reemplaza el flujo automático (el operario
  // cierra "sigo otro día" y la jornada del día siguiente se crea sola). Funciones quedan muertas.
  const jornadaCTA = document.getElementById('edit-jornada-cta');
  if (jornadaCTA) jornadaCTA.style.display = 'none';
```

- [ ] **Step 2: Bump del Service Worker**

En `sw.js` línea 90, agregar un comentario de versión antes y cambiar el CACHE. Localizar:
```javascript
const CACHE = 'flyclean-v97';
```
Reemplazar por:
```javascript
// v98: jornadas Fase A — botón "Cerrar servicio" + doble confirmación al cerrar sectores incompleto + la jornada siguiente hereda las fotos "antes" + etiqueta "Jornada N completada"/badge "Servicio completo" (agrupa por Orden madre) + se oculta el botón viejo de jornada manual.
const CACHE = 'flyclean-v98';
```
(Insertá el comentario `// v98: ...` en la línea inmediatamente anterior a `const CACHE`, respetando el patrón de comentarios de versión que ya existe arriba.)

- [ ] **Step 3: Verificar sintaxis (ambos archivos)**

Run: `cd ~/repos/flyclean-app && npm run check && node --check sw.js && echo "sw OK"`
Expected: `npm run check` PASS + `sw OK`.

- [ ] **Step 4: Actualizar `docs/FUNCIONALIDADES.md`**

Agregar, justo ANTES de la línea `---` del footer (`_Generado automáticamente...`), esta sección:
```markdown
## Jornadas — Mejoras Fase A (sw v98)

- **Botón "Cerrar servicio"** (antes "Cerrar") en el paso final del operario (`btn.close.notion`).
- **Doble confirmación** al elegir "Ya está, cerrar así" en un servicio con sectores sin terminar (`cierreSectoresElegir`).
- **La jornada siguiente hereda las fotos "antes"** del día anterior (`crearJornadaSiguiente` copia `📸 Fotos pre-servicio`); el checklist arranca en 0 y las fotos "después" no se heredan.
- **Etiqueta "🗓️ Jornada N completada · X%"** por día + badge **"✅ Servicio completo"** cuando el trabajo (grupo de jornadas) llega al 100%. Helpers nuevos `jobRootId`/`jobGroup`/`jobCompleto` que LEEN `Orden madre` sobre `_coordAllServices` (cero datos nuevos).
- **Botón viejo "Crear jornada para otro día"** del coordinador: **oculto** (lo reemplaza el flujo automático).
- Pendiente (Fase B): desplegable de jornadas en el historial del cliente + vista Notion agrupada + badge en CEO.
```
(Si `docs/FUNCIONALIDADES.md` no existe, saltear este step.)

- [ ] **Step 5: Verificación final completa**

Run: `cd ~/repos/flyclean-app && npm run check && npm test && node --check sw.js`
Expected: `npm run check` PASS, `npm test` (smoke) 3/3, `node --check sw.js` OK.

- [ ] **Step 6: Commit**

```bash
cd ~/repos/flyclean-app && git add index.html sw.js docs/FUNCIONALIDADES.md
git commit -m "chore(jornadas-A): ocultar jornada manual vieja + bump sw v98 + docs"
```

---

## Self-Review

**1. Spec coverage:**
- A. Botón "Cerrar servicio" → Task 1 (cambio de valor de `btn.close.notion`). ✓
- B. Doble confirmación "cerrar así" → Task 2. ✓
- C. J2 hereda fotos "antes" (checklist 0, post no) → Task 3. ✓
- D. Etiqueta "Jornada N completada" + badge "Servicio completo" (agrupa por Orden madre) → Task 4. ✓
- E. Ocultar botón viejo → Task 5. ✓
- i18n (4 keys es+pt) → Task 1. ✓
- Bump sw + docs → Task 5. ✓
- Fase B fuera de alcance → no hay tareas para desplegable/Notion/CEO. ✓

**2. Placeholder scan:** sin "TBD/TODO"; todos los steps de código muestran el old→new completo. ✓

**3. Type consistency:** `jobRootId(svc)` / `jobGroup(svc, pool)` / `jobCompleto(svc, pool)` — firmas
idénticas donde se definen (Task 4 Step 1) y donde se usan (Task 4 Step 2, `jobCompleto(s, _coordAllServices)`).
`estadoDisplay` (Task 4 Step 2) se usa en Step 3. Keys i18n de Task 1 usadas en Tasks 2 y 4 con el mismo
nombre. `{n}` como placeholder de reemplazo en `cierre.sectores.confirm.cerrar` y `estado.jornada.completada`. ✓

Sin gaps detectados.
