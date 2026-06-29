# Spec — Mejoras operativas (operario + coordinador) — junio 2026

**Fecha:** 2026-06-29
**Estado:** Diseño aprobado por Diego (decisiones registradas abajo). Pendiente: revisión del spec → writing-plans.
**Rama:** `feat/mejoras-operativas-junio` (creada desde `main`, sw v84).
**Origen:** 5 pedidos de los operarios + coordinador, traídos por Diego.

> Regla del proyecto aplicada: se exploró el código actual (4 agentes Explore sobre `index.html` v84) ANTES de
> diseñar, para reusar lo existente y no duplicar. Cada sección marca **qué se reusa** vs **qué se crea**.

---

## Objetivo

Cubrir 5 necesidades operativas reales del equipo de campo y coordinación:

1. Registrar si un trabajo se hizo **con dron** o **con método humano/manual** (lanzas, manguera, hidrolavadora…).
2. Cargar la **ubicación (Google Maps) en la ficha del cliente** una sola vez y que se herede a servicios/propuestas; sumar **intermediario** visible y un **conteo** de propuestas/servicios más claro.
3. En propuestas, que los **3 botones de acción** (crear servicio / pedir relevamiento / hacer prueba) estén **siempre visibles**, deshabilitados según el estado.
4. En el sheet del servicio: sumar **operario manual** junto al piloto, **mostrar el cliente** con un **botón de ubicación**, y **quitar** el input de Maps suelto.
5. **Verificar** (y blindar) que el flujo del operario sobreviva a un **apagón del celular** sin perder datos.

---

## Decisiones tomadas (Diego, 2026-06-29)

- **Método de trabajo:** Dron / Manual como categorías principales; si es Manual, submétodo (Lanzas / Manguera / Hidrolavadora / Otro). Default sugerido: Dron. Obligatorio para registrar el inicio efectivo.
- **Ubicación:** vive en el **cliente** (fuente única); servicios y propuestas la **heredan**. **Override** disponible **tanto en servicio como en propuesta**.
- **Roles del servicio:** **2 columnas** — Piloto (dron) a la izquierda | Operario manual a la derecha. Ayudantes abajo, como hoy.
- **Blindaje del checklist:** **sí** — persistir el checklist también en Notion (hoy vive solo en localStorage hasta el cierre).
- **Implementación:** **por fases** (rápido/bajo riesgo primero).
- **Trabajos mixtos** (dron + humano con seguimiento separado simultáneo): **fuera de alcance** — fase futura.

---

## Diseño por punto

### Punto 1 — Método de trabajo (Dron vs Manual) · NUEVO

**Reusa:** todo el flujo de pasos del operario y su persistencia ya existen.
**Crea:** un campo nuevo + UI en un paso existente.

- **Anclaje en código** (`index.html`):
  - `STEPS_SERVICIO` (≈L2945-2956): el método se elige en el paso **`inicio_efectivo`** (índice 3), antes de registrar la hora real.
  - `serviceState` / `resetServiceState()` (≈L3011-3033): agregar campos `metodoTrabajo` (string) y `herramientaManual` (string).
  - `registrarInicioEfectivo()` (≈L6310): exigir método elegido antes de registrar; escribir las properties.
  - `buildIncrementalProps()` (≈L3055) y `cerrarServicio()` (≈L6421): incluir las nuevas properties en el PATCH.
  - `hydrateServiceStateFromNotion()` (≈L3088): rehidratar `metodoTrabajo` / `herramientaManual` al reabrir.
  - `renderStep()` (≈L5838): UI del paso inicio_efectivo con los 2 botones + submenú condicional.
- **UI:** dos botones grandes **🚁 Dron** / **💪 Manual**. Al tocar Manual se despliega un selector secundario: **Lanzas · Manguera · Hidrolavadora · Otro**. Default visual: Dron. No se puede registrar el inicio efectivo sin método.
- **Notion (DB Servicios, datasource `2fbc8a03-5c4f-445c-8516-71dd9b2eea78`):** 2 properties nuevas
  - `Método de trabajo` — select: `🚁 Dron`, `💪 Manual`.
  - `Herramienta manual` — select: `Lanzas`, `Manguera`, `Hidrolavadora`, `Otro` (solo se llena si Manual).
  - *Separadas a propósito:* permite filtrar "dron vs humano" en reportes sin parsear strings.
- **i18n:** strings nuevas en `TRANSLATIONS` (es + pt-BR).

### Punto 2 — Ficha de cliente: ubicación + intermediario + conteo

**Reusa:** ficha de cliente, Ciudad/Zona, modelo de intermediario (ya en Notion), Cliente 360 (conteo).
**Crea:** campo Maps en cliente + botón; selector de intermediario en UI; presentación del conteo.

- **Anclaje en código:**
  - `openContactSheet()` (≈L10093), `buildContactSheetBody()` (≈L10048), `coordContactCard()` (≈L10017).
  - `Ciudad / Zona` ya existe (rich_text, lectura ≈L10112, render ≈L10080-10081). **Sin cambios** salvo poner el botón Maps al lado.
  - `saveContactEdit()` (≈L10177): guardar la nueva URL de Maps y el intermediario.
  - `loadContactHistory()` (≈L10238) / `renderContactHistory()` (≈L10303): el conteo ya existe (≈L10321) → mejorar encabezado.
  - Permisos: `soloLectura` para CEO (≈L10121) — respetar (CEO lee, Coord/Finanzas editan).
- **Ubicación (nuevo):** property `Mapa` (URL) en DB Clientes (CONTACTOS_DB_ID). Input al lado de "Ciudad / Zona" + botón **📍 Abrir** (abre en pestaña nueva, patrón existente del step 0 operario L5872).
- **Intermediario (destapar):** selector **"Llegó por (intermediario)"** en la ficha, usando la relation existente `Intermediario` ↔ `Clientes traídos` (DB Clientes consigo misma). Editable por Coord/Finanzas; CEO solo lee. La comisión/facturación NO se toca acá (queda para Finanzas).
- **Conteo mejorado:** encabezado de la ficha tipo `📄 5 propuestas (2 aceptadas) · 🧰 8 servicios`. Datos ya disponibles en `loadContactHistory`; es presentación.
- **Alcance de roles:** misma ficha para Coordinador, CEO y Finanzas (ya es así en el código).

### Punto 3 — Propuestas: 3 botones siempre visibles · CAMBIO CHICO

**Reusa:** toda la lógica; solo cambia visibilidad por habilitación.
**Crea:** nada nuevo, modifica una función.

- **Anclaje:** `updateCreateSvcBtnVisibility()` (≈L9787), llamada desde `openPropSheet()` (≈L9544, L9606).
  - Hoy oculta con `display:'none'` en L9799 / L9813 / L9824 según `ESTADOS_VENDIDO` (≈L9791) y `ESTADOS_PRE_VENTA` (≈L9793).
  - **Cambio:** `*.style.display = ''` siempre + `*Btn.disabled = !showX` para cada botón.
  - Handlers intactos: `createServicioFromPropuesta` (L9645), `createRelevamientoFromPropuesta` (L9732), `createPruebaFromPropuesta` (L9692).
- **Comportamiento resultante por estado:**
  - Pre-venta (Nuevo lead / Contactado / Relevamiento / En preparación): habilitados **Relevamiento + Prueba**; Crear servicio gris.
  - Vendido (Aceptada / Concretado / Servicio Pendiente): habilitado **Crear servicio**; los otros dos grises.
  - Intermedios (Enviada / Negociando / etc.): **los 3 grises** (no hay acción válida; es correcto).
- **UX:** botón deshabilitado con tooltip/hint corto explicando en qué estado se habilita (opcional, nice-to-have).

### Punto 4 — Sheet del servicio: operario manual + cliente + ubicación

**Reusa:** piloto, ayudantes, campo Mapa del servicio, step 0 del operario, relation `Contacto`.
**Crea:** property `Operario manual`; bloque "cliente + ubicación"; layout 2 columnas; quita input Maps suelto.

- **Anclaje:** `openEditSheet()` (≈L8403).
  - Piloto: `renderOperarioBtns()` (≈L8334) + `selectEditOperario()` (≈L8800), property `Operario App` (select).
  - Ayudantes: `renderParticipantesBtns()` (≈L8365) + `toggleParticipante()` (≈L8395), property `Operarios participantes` (multi_select).
  - Maps suelto: input `edit-mapa` (≈L1284, lectura L8423, guardado L8828).
  - Cliente vinculado: relation `Contacto` (`parentProps['Contacto']` ≈L8682) — hoy **no se muestra**.
  - Step 0 operario: `renderStep()` (≈L5858), link mapa L5872.
- **Roles 2 columnas:** Piloto (izquierda, como hoy) | **Operario manual** (derecha). Ambos opcionales y deseleccionables. Property nueva `Operario manual` (select) en DB Servicios — espejo de `Operario App`. Ayudantes (`Operarios participantes`) quedan abajo, sin cambios.
- **Cliente visible:** resolver la relation `Contacto` → nombre (de `_coordAllContacts`, ya cargado) y mostrar "Cliente: X" en el sheet del servicio.
- **Botón ubicación (heredada):** junto al cliente, **📍 Ubicación** que abre `servicio.Mapa || cliente.Mapa` (override gana; si no, hereda la del cliente del punto 2).
- **Override puntual:** link chico "usar otra ubicación para este servicio" → permite pegar un Maps que se guarda en el `Mapa` del servicio (campo existente). Mismo mecanismo en el sheet de propuesta (override en propuesta, por decisión de Diego — ver Notas Notion).
- **Quitar Maps suelto:** se elimina el input libre `edit-mapa` como campo independiente; su rol lo cubre cliente + override.

### Punto 5 — Apagón del celular: verificación + blindaje

**Reusa:** rehidratación bidireccional ya implementada.
**Crea:** persistencia del checklist en Notion (blindaje).

- **Estado actual (verificado por análisis estático):** `openService()` (≈L5741) → `resetServiceState()` + `hydrateServiceStateFromNotion()` (fotos/horas/clima/resultado desde Notion) + `hydrateServiceStateFromLocal()` (checklist/notas/relevamiento desde localStorage) + `flushPendingPhotosIfNeeded()` (sube fotos que quedaron sin sincronizar) + `computeStepFromState()` (salta al paso correcto). En el escenario Iniciar→fotos→apagón→reabrir **no se pierde nada**.
- **Verificación en vivo (parte del plan):** simular con celular emulado (Iniciar → fotos antes → "apagón" recargando/cerrando → reabrir) y confirmar que vuelve al paso correcto con las fotos y el checklist.
- **Único hueco:** el checklist (`checklistPre`/`checklistPost`) vive **solo en localStorage** hasta el cierre. Si se borra la caché del navegador (reinstalar/limpiar datos) se perdería.
- **Blindaje (aprobado):** persistir el checklist también en Notion vía el guardado automático existente (`persistServiceState`, debounce 3s). Property nueva `Estado checklist` (rich_text con JSON `{pre:{},post:{}}`) en DB Servicios; leerla en `hydrateServiceStateFromNotion()` como fallback cuando localStorage está vacío.

---

## Properties nuevas en Notion (resumen)

| DB | Property | Tipo | Para qué |
|----|----------|------|----------|
| Servicios | `Método de trabajo` | select (🚁 Dron / 💪 Manual) | Punto 1 |
| Servicios | `Herramienta manual` | select (Lanzas/Manguera/Hidrolavadora/Otro) | Punto 1 |
| Servicios | `Operario manual` | select | Punto 4 |
| Servicios | `Estado checklist` | rich_text (JSON) | Punto 5 (blindaje) |
| Clientes (Contactos) | `Mapa` | url | Punto 2 (ubicación heredable) |
| Propuestas | `Mapa` | url | Punto 4 (override de ubicación en propuesta) |

> Notas: `Intermediario` / `Clientes traídos` / `Comisión %` / `Ciudad / Zona` **ya existen** — no se crean.
> Las properties se crean vía MCP Notion al implementar cada fase. Si una property no existe aún, el PATCH la ignora
> silenciosamente (comportamiento conocido de la API), así que el orden creación-property → deploy debe respetarse.
> Actualizar `…/FlyClean-Finanzas/CONTRATO-NOTION.md` solo si cambia el esquema de Gastos/Ingresos (no es el caso aquí).

---

## Plan por fases

Cada fase = su propio bump de `sw.js` + deploy + prueba antes de seguir. Punto de partida: sw v84.

### Fase A — Rápida y de bajo riesgo (sw v85)
- **Punto 3** — 3 botones siempre visibles (cambio en `updateCreateSvcBtnVisibility`).
- **Punto 5** — verificación en vivo del apagón + blindaje del checklist en Notion.
- *Por qué primero:* poco código, sin tocar el modelo de datos del cliente; da una victoria rápida y deja el flujo del operario más sólido antes de meterle features nuevas.

### Fase B — Ubicación + CRM (sw v86)
- **Punto 2** — Maps en ficha de cliente + intermediario visible + conteo mejorado.
- **Punto 4 (parte ubicación)** — mostrar cliente en el sheet del servicio + botón ubicación heredada + override (servicio y propuesta) + quitar Maps suelto.
- *Por qué juntos:* comparten el modelo "ubicación única en el cliente con override".

### Fase C — Método + roles (sw v87)
- **Punto 1** — método Dron/Manual + submétodo en el inicio efectivo.
- **Punto 4 (parte roles)** — 2 columnas Piloto / Operario manual.
- *Por qué al final:* es lo más nuevo (campo + UI + persistencia + rehidratación) y conceptualmente "operario manual" acompaña al método de trabajo manual.

---

## Riesgos y consideraciones

- **Orden property-then-deploy:** crear la property en Notion antes de deployar el código que la escribe (si no, se ignora en silencio y parece "no anda").
- **Override de ubicación en 2 lugares (servicio + propuesta):** hay que dejar claro en la UI cuál manda. Regla: override del servicio gana sobre el de la propuesta, que gana sobre el del cliente. Documentar el orden de precedencia en el código.
- **Cliente sin Maps cargado:** el botón ubicación debe ocultarse/deshabilitarse con gracia (no romper) cuando no hay URL en ninguno de los niveles.
- **Método obligatorio:** no debe trabar a un operario con un servicio viejo (sin método) que reabre; default Dron + no exigir retroactivo.
- **Multi-país:** todo respeta el aislamiento por `País` ya existente; las nuevas properties no cambian eso.
- **CEO solo lectura:** las ediciones nuevas (Maps cliente, intermediario, operario manual) deben respetar `soloLectura`.

## Criterios de aceptación (alto nivel)

- El operario puede marcar Dron/Manual (+submétodo) al iniciar el efectivo, y queda registrado en Notion.
- La ubicación cargada en el cliente aparece sola en sus servicios y propuestas, con override puntual donde corresponde.
- El intermediario se ve y se setea desde la ficha de cliente; el conteo de propuestas/servicios es claro.
- Los 3 botones de la propuesta siempre se ven; solo se habilitan en su estado.
- El sheet del servicio muestra piloto + operario manual (2 columnas), el cliente, y su botón de ubicación; sin el Maps suelto.
- Demostrado en vivo que un apagón tras "Iniciar + fotos" no pierde datos; el checklist queda blindado en Notion.
