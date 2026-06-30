# Spec — Sistema de Sectores (mini-servicio por sector) + fix operario manual

**Fecha:** 2026-06-30
**Estado:** Diseño aprobado por Diego (2026-06-30).
**Rama:** `feat/sectores` (desde main `a49706c`, sw v89).

---

## 1. Problema

Un servicio grande (ej. **"Complejo de Solanas"**) abarca ~17 edificios/estructuras (sectores). Hoy eso obliga a crear muchos servicios sueltos o a perder el detalle de qué se hizo en cada parte. Diego quiere:

1. Definir, **una sola vez por cliente**, su lista de sectores (sin re-tipear, sin errores de ortografía, sin duplicados por comas).
2. Al crear un servicio/prueba/relevamiento, **elegir** de esa lista los sectores que aplican (y poder agregar uno nuevo que se guarde al cliente para la próxima).
3. Que el **operario** trabaje **cada sector como un mini-servicio** (sus fotos antes/después + checklist de calidad + cierre), marcándolos pendiente → en curso → hecho, con el **% de avance calculado solo**.
4. Que si no termina en una jornada, el servicio **continúe en la jornada siguiente** conservando lo hecho, hasta quedar **completado del todo** (todos los sectores hechos).

Además, un **fix chico independiente** detectado en el camino: en el sheet del servicio, el selector de **Operario manual** no permite agregar gente nueva (le falta el botón "+ nuevo operario" que sí tiene el de Piloto) y **Juan Pablo** no aparece como opción.

## 2. Decisiones de Diego (cerradas)

| Tema | Decisión |
|---|---|
| **Granularidad del operario** | **Mini-servicio por sector**: cada sector tiene sus fotos antes/después + checklist de calidad (post) + cierre. |
| **Checklist PRE (equipo/seguridad)** | **Una vez por jornada** (al llegar), NO por sector. Por sector va solo: fotos antes → trabajo → fotos después → checklist de calidad → cerrar sector. |
| **% de avance** | **Automático**: sectores hechos ÷ total. El operario no tipea. Reemplaza el input manual cuando el servicio tiene sectores. |
| **Jornada siguiente** | El operario ve **todos** los sectores; los ya hechos aparecen **bloqueados con sus fotos**; retoma desde el que estaba en curso. |
| **Alcance** | Sectores seleccionables en **Servicios, Pruebas y Relevamientos** (la lista reusable del cliente sirve para los tres). |
| **Fases** | 0 (fix) · 1 (sectores cliente + selección) · 2 (operativa operario) · 3 (jornadas). Deploy fase por fase con OK de Diego. |
| **Continuidad (jornadas)** | **Un solo servicio que continúa** (NO fichas-jornada separadas): si no se termina, el mismo servicio se reprograma hasta completar todos los sectores. |
| **Reprogramación** | **Automática**: al cerrar incompleto, el operario confirma "termino por hoy" → el servicio se reprograma solo a **mañana** (tentativo); el coordinador ajusta la fecha. Se elimina el "crear jornada" manual. |
| **Horas por día** | **Sí** se guarda un parte por día (fecha + horas + sectores hechos ese día) para costear servicios largos. |
| **Riesgo / producción** | La app está en servicio real. Todo se construye en rama aparte; el sistema de sectores es **opcional y retrocompatible** (servicio sin sectores = idéntico a hoy). |

## 3. Modelo de datos

### 3.1 Restricción descubierta (límite de Notion)

La app ya guarda datos estructurados como **JSON dentro de un `rich_text`** (property `Estado checklist` en Servicios — `buildIncrementalProps` :3188/:3208, lectura `hydrateServiceStateFromNotion` :3272). Pero:

- Notion limita **cada objeto rich_text a 2.000 caracteres** de contenido.
- La app **siempre escribe un solo objeto** `rich_text: [{...}]` y **siempre lee `rich_text?.[0]?.plain_text`** (30+ usos) — **no soporta chunking** sin refactor.
- Un JSON con 17 sectores que incluyera **las URLs de las fotos** daría **~7.000 caracteres** (medido) = 3.5× el límite. **No entra.**

### 3.2 Solución elegida (Arquitectura "JSON compacto + fotos en files")

**No** se crea ninguna base nueva en Notion, **no** se toca el proxy `/api/notion`, **no** se hace chunking. Se reutiliza lo ya probado:

- **Las fotos siguen en las properties `files` que ya existen** (`📸 Fotos pre-servicio`, `📸 Fotos post-servicio`, :3193-3195) — ese tipo **no tiene el límite de 2.000**. La pieza nueva: **etiquetar cada foto por sector** usando el campo `name` del file (`photosToNotionFiles` :6736 ya pone un `name` libre). Al leer (`collect` :3256), se agrupan por prefijo.
- **De cada sector se guarda solo lo chiquito** (estado + ítems tildados del checklist de calidad) en un JSON compacto. El nombre del sector vive en el cliente; en el servicio se guarda un **snapshot** del nombre para que el trabajo sea autocontenido aunque el cliente cambie sus nombres después.

### 3.3 Properties nuevas (se crean por MCP en DBs existentes — el proxy no cambia)

| Base | Property | Tipo | Contenido |
|---|---|---|---|
| **Clientes** (`250115612de74e0582366549bbe5e389`) | `Sectores` | `rich_text` (JSON) | Lista reusable: `[{"id":"sec-ab12","nombre":"Edif 1"}, ...]` |
| **Servicios** (ds `2fbc8a03-5c4f-445c-8516-71dd9b2eea78`) | `Estado sectores` | `rich_text` (JSON) | Snapshot del trabajo: `[{"id":"sec-ab12","nombre":"Edif 1","estado":"hecho","post":"0,2,4"}, ...]` |
| **Servicios** (ds `2fbc8a03-5c4f-445c-8516-71dd9b2eea78`) | `Registro jornadas` | `rich_text` (JSON) | Parte por día (Forma 2): `[{"fecha":"2026-06-30","ini":"09:00","fin":"17:00","hechos":["sec-ab12","sec-cd34"]}, ...]` |

- `estado` ∈ `pendiente` | `en_curso` | `hecho`.
- `post` = índices del checklist de calidad tildados, como string compacto (ej. `"0,2,4"`).
- **Fotos por sector**: reutilizan `📸 Fotos pre-servicio` (fotos "antes" de cada sector) y `📸 Fotos post-servicio` (fotos "después"), con `name` = `s{id}-antes-{n}.jpg` / `s{id}-despues-{n}.jpg`. Al renderizar un sector, se filtra por el prefijo `s{id}-`. **Cuando el servicio tiene sectores, estas properties contienen solo fotos por-sector** (prefijadas); no hay fotos pre/post "globales" (en el flujo de hoy el antes/después es del servicio entero; con sectores pasa a ser por sector).
- **Checklist de calidad por sector**: son los **mismos ítems del checklist POST actual** (`CHECKLIST_POST`), aplicados por sector. El `post` del JSON guarda qué índices quedaron tildados en ese sector.

**Tamaño verificado:** ~70-90 chars por sector × 17 ≈ 1.200-1.500 chars < 2.000. ✔ Holgado. **Mitigación documentada** (follow-up, no v1): si algún cliente supera ~22 sectores y se acerca a 2.000, partir en una 2ª property `Estado sectores 2`. Para el caso real (Solanas ~17) entra de sobra.

## 4. Diseño por fases

Cada fase es un entregable testeable que se deploya con OK de Diego y bump de `sw.js`.

### Fase 0 — Fix operario manual (independiente, riesgo casi nulo)

Puramente aditivo, no toca ningún flujo.

- **Botón "+ nuevo operario" en el selector de Operario manual:** `renderOperarioManualBtns` (:9051) hoy corta antes del botón que sí tiene `renderOperarioBtns` (:9021-9032, con `showNewOperarioInput`/`confirmNewOperario`). Se replica el patrón: botón "+ nuevo" + input + `showNewOperarioManualInput()`/`confirmNewOperarioManual()` que empujan a `_extraOperarios` y a `editState.operarioManual`.
- **Juan Pablo no aparece:** `operariosDePais` (:9012) filtra por `country === target` y `role` que incluya "Operario"/"Coordinador". Hay que **verificar la entrada de Juan Pablo en el array `USERS`** (país = Uruguay, rol con "Operario"). Si Federico y Francisco aparecen y él no, su registro tiene un dato distinto (país o rol). Se corrige el dato en `USERS`. (También revisar que la property select `Operario manual` en Notion tenga su opción, si la lista de Notion limita las opciones.)

### Fase 1 — Sectores en el cliente + selección en el trabajo (aditivo)

No toca el flujo del operario todavía.

**1a. CRUD en la ficha del cliente** (patrón = Mapa/Intermediario):
- Estado: `contactEditState.sectores = [{id,nombre}]` (init en `openContactSheet` :11006, leído de `props['Sectores']` JSON).
- UI: bloque "🏢 Sectores del cliente" en `buildContactSheetBody` (:10949), después de Notas. Lista con eliminar (✕) + editar (tap al nombre) + input "agregar sector". Funciones nuevas `renderContactSectores()`, `contactAddSector()`, `contactRenameSector(id)`, `contactRemoveSector(id)`.
- Guardado: `saveContactEdit` (:11129) serializa `contactEditState.sectores` → `props['Sectores'] = { rich_text: [{ text: { content: JSON.stringify(...) } }] }`.

**1b. Selección en el sheet del servicio** (coordinador), debajo de Piloto/Operario manual:
- Al abrir el sheet (`openEditSheet` :9142), tras resolver el cliente (`resolveSvcUbicacion` :9265) se cargan los sectores del cliente → `editState.sectoresCliente`.
- Bloque "🏢 Sectores de este trabajo": chips de los sectores del cliente (toggle seleccionado) + "agregar nuevo" (se agrega al cliente **y** queda seleccionado). Funciones `renderEditSectores()`, `toggleEditSector(id)`, `editAddSector()`.
- Guardado: `saveServiceEdit` (:9660) escribe `Estado sectores` con los seleccionados, estado inicial `pendiente`, `post` vacío. Si se agregó uno nuevo, también se persiste al cliente (`Sectores`).

**1c. Pruebas y Relevamientos:** `createPruebaFromPropuesta` (:10577) y `createRelevamientoFromPropuesta` (:10617) heredan `Contacto`; el mismo bloque de selección de sectores aplica en su sheet (mismo `openEditSheet`). Sin cambios extra de flujo.

**Entregable Fase 1:** se definen sectores de un cliente y se eligen en un trabajo. El operario todavía no los trabaja (el flujo del operario sigue igual).

### Fase 2 — Operativa del operario (toca el flujo del operario, solo si hay sectores)

**Regla maestra de retrocompatibilidad:** si `Estado sectores` está vacío/ausente → el wizard funciona **exactamente como hoy** (10 pasos, `STEPS_SERVICIO` :3072). Todo lo de abajo aplica **solo cuando el servicio tiene sectores**.

- **`serviceState.sectores`** (nuevo, en :3139): `[{id,nombre,estado,checklistPost:{},fotos:{antes:[],despues:[]}}]`, hidratado de `Estado sectores` + las fotos agrupadas por prefijo (`hydrateServiceStateFromNotion` :3233 y `...FromLocal` :3283).
- **Pasos globales cuando hay sectores:** INICIAR(0) → CHECKLIST PRE(1, jornada) → INICIO EFECTIVO(3) → **HUB SECTORES(4)** → CIERRE EFECTIVO(5) → NOTAS(8) → CERRAR(9). Se **ocultan/saltan** FOTOS ANTES(2), CHECKLIST POST(6) y FOTOS DESPUÉS(7) globales (ahora son por sector). Se logra filtrando `STEPS` en `openService`/`renderStep` cuando hay sectores; `computeStepFromState` (:3304) respeta el salto.
- **HUB de sectores** = el step `ejecucion` (:6305-6317, hoy pantalla pasiva "Volando 🚁"). Pasa a mostrar la lista de sectores con su estado (⚪ pendiente / 🔵 en curso / ✅ hecho) y un botón por sector. Muestra el **% automático** (hechos/total).
- **Mini-flujo por sector** = un **overlay sibling del `<body>`** (`sector-overlay`, por la regla de overlays multi-screen: un modal usado desde >1 contexto debe ser sibling del body, si no `display:none` anula `position:fixed`). El overlay corre: **fotos antes → fotos después → checklist de calidad → "✅ sector hecho"**. Al abrirlo, el sector pasa `pendiente → en_curso`; al confirmar, `→ hecho`. Maneja su propio `currentSector` sin tocar la máquina de 10 pasos (encapsula la sub-navegación que el wizard plano no tiene).
- **Fotos:** se suben con `uploadPhoto` (:3346, R2 directo, sin cambios) y al persistir se escriben en `📸 Fotos pre/post-servicio` con `name` prefijado `s{id}-`. `persistServiceState` (:3219, debounce 3s) y `persistServiceStateToLocal` (:3176) guardan también `serviceState.sectores` (estado + checklistPost) en `Estado sectores`. Marcar un sector hecho dispara el guardado (igual que cualquier cambio hoy).
- **% automático:** cuando hay sectores, el input manual de avance (:6391) se reemplaza por el cálculo `hechos/total`; `cerrarServicio` (:6801) escribe ese `% de avance`.

**Entregable Fase 2:** el operario trabaja sector por sector dentro de una jornada; el % se calcula solo.

### Fase 3 — Continuidad: un solo servicio que se reprograma (Forma 2)

Para servicios **con sectores** se reemplaza el "crear jornada" manual (`submitCreateJornada` :9582) por un **único servicio que continúa** hasta completarse. **Servicios sin sectores siguen usando el `submitCreateJornada` actual** (retrocompatible — no se toca).

- **Property nueva `Registro jornadas`** (rich_text JSON): el parte por día → `[{fecha, ini, fin, hechos:[ids]}]`. Da el historial diario y las horas para costos sin duplicar fichas.
- **Cierre incompleto (operario)** — en `cerrarServicio` (:6746), si el servicio tiene sectores y **no todos están en `hecho`**:
  1. El operario confirma "termino por hoy" (modal: "Quedan N sectores. ¿Terminás por hoy?").
  2. Se **agrega una entrada al `Registro jornadas`**: fecha de hoy + `Hora Inicio/Fin Efectivo` de la sesión + ids de los sectores completados ese día.
  3. El servicio se **reprograma solo**: `Estado` pasa a un estado de continuación (`🔄 Continúa`, opción nueva del select; alternativa: reusar `📋 Pendiente`), `Fecha programada` = **mañana** (tentativo), y se limpian las horas efectivas de sesión para el día siguiente. Los sectores hechos **siguen hechos** (con sus fotos).
  4. El **coordinador** ve el servicio reprogramado con su avance (`% auto` + "Sectores: 6/8 hechos") y **ajusta la fecha** al día real cuando quiera. **No crea nada a mano** — el "crear jornada" queda pasado por arriba.
- **Retomar (operario, otro día):** abre el **mismo** servicio → hace su **checklist PRE de llegada** (día nuevo) → el HUB muestra **todos** los sectores, los hechos **bloqueados y con sus fotos** → sigue desde el `en_curso`/`pendiente`.
- **"Completado del todo":** cuando el operario marca el último sector `hecho` y cierra, **todos** quedan en `hecho` → `% = 100` → `Estado = ✅ Completado` final (no se reprograma). Esa última jornada también se registra en `Registro jornadas`.
- El `Jornada N°` viejo **deja de usarse** para servicios con sectores (el `Registro jornadas` dice cuántos días llevó); se mantiene intacto para servicios sin sectores.

**Entregable Fase 3:** un servicio con sectores se trabaja a lo largo de varios días, reprogramándose solo, con el parte por día registrado, hasta quedar completado del todo — sin que nadie cree jornadas a mano.

## 5. Impacto y retrocompatibilidad

- **Servicios/pruebas/relevamientos SIN sectores** (incluidos todos los que están en curso hoy): comportamiento **idéntico** al actual. La presencia de sectores es el único interruptor. Sin migración forzada.
- El coordinador y el operario que no usan sectores no ven ningún cambio de flujo (más allá del fix de Fase 0, que solo agrega un botón).
- Deploy fase por fase; las Fases 0 y 1 no tocan el flujo del operario.

## 6. Coordinación con otros workstreams (regla post-cambio)

- **Supabase (espejo):** sumar `Sectores` (clientes), `Estado sectores` y `Registro jornadas` (servicios) al `db/schema.sql` + al mapeo `api/_lib/notion-map.js` (`MAP`) + al sync. El `raw` ya las captura, pero conviene la columna plana (misma deuda pendiente que las properties de las Fases A/B/C). No bloquea: el cron sigue copiando el `raw` igual.
- **Cowork de Finanzas:** **no afecta** (no toca Gastos/Ingresos). No se actualiza `CONTRATO-NOTION.md`.
- **Docs:** tras cada fase, actualizar `docs/NOTION.md` (properties nuevas), `docs/FUNCIONALIDADES.md` (feature sectores), la sección Estado en `CLAUDE.md`, la memoria, y **bump de `sw.js`**.

## 7. Verificación

- **Automática:** `npm run check` (sintaxis del JS embebido en index.html), `npm test` (smoke solo-lectura contra prod). No hay backend nuevo (todo es frontend + properties Notion).
- **Funcional/visual:** la hace Diego (requiere login/PIN). Antes de exponerlo a operarios reales, probar con un **cliente + servicio de prueba con sectores**.
- Por fase: revisión por subagentes (subagent-driven) + review final de rama.

## 8. Riesgos y fuera de alcance (YAGNI)

- **Descartado — tabla relacional nueva de Sectores:** overkill (más queries, CRUD y sync; latencia en obra). El JSON+files cubre el caso.
- **Descartado — fotos dentro del JSON:** revienta el límite de 2.000.
- **Descartado — reescribir la máquina de 10 pasos para sub-navegación:** se usa un overlay con sub-estado propio, menos riesgoso.
- **Descartado (para servicios con sectores) — fichas-jornada separadas (Forma 1):** se eligió un solo servicio que se reprograma (Forma 2). El `submitCreateJornada` viejo queda **solo** para servicios sin sectores.
- **Límite 2.000 chars de `Estado sectores`:** mitigado con formato compacto; chunking en 2ª property solo si un cliente supera ~22 sectores (follow-up).
- **Fuera de alcance v1:** agrupar las fotos por sector en el **PDF de devolución** (hoy el PDF las muestra todas juntas; agruparlas es mejora futura). Reordenar/arrastrar sectores. Sectores con metadata extra (m², altura por sector).
