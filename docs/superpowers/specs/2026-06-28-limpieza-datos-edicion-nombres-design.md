# Spec — Editar nombres + Panel de Limpieza de datos

**Fecha:** 2026-06-28 · **Estado:** aprobado por Diego (Dirección) · **Paso 1** del roadmap de administración FlyClean.

## Objetivo y contexto

Hoy la app no permite **editar el nombre** de un cliente ni de un servicio (el nombre de cliente solo se setea al
crear; el de servicio es de solo lectura), y no hay forma de **limpiar duplicados** de registros ya existentes. Esto
traba la prolijidad de los datos — caso testigo **Hospital Británico**: 1 sola ficha de cliente (no hay duplicados de
cliente) pero **4 servicios** del contrato recurrente con nombres inconsistentes (`"🪟 Vidrios — Hospital Británico"`,
`"Hospital Britanico "` sin tilde y con espacio, `"🪟 Vidrios — Británico (mar 2026)"`) + 1 propuesta Aceptada $2300.

Decisión estratégica de Diego: como Notion va a quedar **solo de respaldo**, la app tiene que ser **autosuficiente** →
construimos **A + B** (editar nombres **y** detectar/fusionar duplicados), no solo lo mínimo.

Fuente de verdad = Notion (`Clientes`/`Servicios`/`Propuestas`/`Ingresos`); base espejo Supabase en paralelo. Toda
escritura va a Notion y, si está prendido el flag `fc_db_writesync`, se refleja al espejo (mecanismo de Fase 3 ya
existente). **Reglas no negociables:** mostrar el plan/diff antes de tocar datos · **nunca borrar (archivar)** ·
país-aware · el Británico se ordena **junto con Diego**, ficha por ficha.

## Alcance (qué entra / qué NO)

**Entra:**
1. Editar el **nombre** de clientes y de servicios desde la app (inline en sus fichas).
2. **Panel de Limpieza** (solo Dirección): detector + asistente de **fusión de clientes duplicados**; revisor de
   **servicios** (renombrar en lote + archivar visitas repetidas).
3. Marca **"🗄️ Archivado"** (reversible) para sacar registros de las vistas activas sin borrarlos.
4. **Plan-antes-de-ejecutar** en toda acción que mueva datos.

**NO entra (YAGNI / pasos futuros):** crear/borrar usuarios, rol "administrador de credenciales", auditoría de
cambios, validación de formato de tel/email, dedup cross-workspace, merge de propuestas/servicios entre sí.

## Permisos

| Acción | Quién | Alcance |
|---|---|---|
| Editar nombre de cliente / servicio | **Coordinador · CEO · Dirección** | Su país (Dirección global). En el CEO se desbloquea **solo** el campo nombre; el resto de la ficha sigue solo-lectura como hoy. |
| Panel de Limpieza (detector, fusión, renombrar en lote, archivar) | **Solo Dirección (Diego)** | Global. |

Implementación del permiso: helpers `puedeEditarNombre(user)` (Coord/CEO/Dirección) y `esDireccion(user)`
(`role.includes('Dirección')`). El guard de CEO-solo-lectura del sheet de cliente (`index.html:9866-9872` y el early
return de `saveContactEdit` en `:9919`) se ajusta para **permitir el nombre** y seguir bloqueando lo demás cuando es CEO.

## Modelo de datos

**Propiedad nueva en Notion — checkbox `🗄️ Archivado`** SOLO en las bases **Clientes** y **Servicios** (NO en
Gastos/Ingresos/Propuestas → sus sumas no se tocan). Semántica:
- `Archivado = true` → el registro se **oculta de las vistas activas** (listas de clientes, listas/tableros de
  servicios del coordinador, "Mis servicios" del operario, detector de duplicados) y, para servicios, **se excluye de
  KPIs/Por cobrar** (para no doble-contar una visita repetida archivada). **Ver "Puntos de filtrado" abajo — NO basta
  reusar `kpiIncluido()` tal cual.**
- Reversible: destildar y vuelve (ver UI de desarchivado en C2). **Nunca** se usa la papelera de Notion (`archived:true`
  de página) porque se purga sola a los 30 días.
- Opcional: nota en `Notas`/campo libre "Duplicado de <nombre/id ganador>" al archivar por fusión.

**Setup previo (una vez, en la implementación):**
1. Crear el checkbox `🗄️ Archivado` en Clientes y Servicios vía el MCP de Notion (hoy no existe; `grep` = 0).
2. Mapearlo en `api/_lib/notion-map.js`: `archivado: check(props, '🗄️ Archivado')` en los mappers de `clientes` y
   `servicios` (el helper `check()` ya existe). Así el espejo Supabase también lo refleja.

**Relaciones usadas en la fusión** (todas ya existen):
- `Servicios.Contacto` → cliente · `Servicios.Propuesta` → propuesta
- `Propuestas.Contacto` → cliente
- `Ingresos.Cuenta` → cliente · `Ingresos.Servicio vinculado` → servicio

**Títulos:** `Clientes."Nombre / Empresa"` · `Servicios."Nombre del servicio"` · `Propuestas."Nombre de propuesta"`.

## Componentes

### C1 — Edición de nombre inline
- **Cliente** (`openContactSheet`/`saveContactEdit`, `index.html:~9839/9918`): mostrar el input de nombre también en
  modo `edit` (hoy solo aparece en `create`, `:9813-9816`); precargar `nombre` del title actual
  (`props['Nombre / Empresa']?.title?.[0]?.plain_text || ''`). Al guardar, setear el title `Nombre / Empresa`.
  **Validar no-vacío en AMBOS modos** (hoy `saveContactEdit` solo valida en create, `:9937-9940`) — un título vacío
  sabotea el detector que agrupa por nombre.
- **Servicio** (`openEditSheet`/`saveServiceEdit`, `index.html:8155/8561` — la función real es **`openEditSheet`**, NO
  `openEditService`): agregar input de nombre a `editState` (precargado del title actual); al guardar, setear el title
  `Nombre del servicio` (validar no-vacío).
- Tras guardar: `syncAfterWrite(id, 'clientes'|'servicios')` (ya existe, gated por flag).

### C2 — Panel de Limpieza (pestaña `🧹 Limpieza`, solo Dirección)
Se agrega como pestaña en la vista a la que entra Dirección (panel coordinador), visible solo si `esDireccion(user)`.
⚠️ La tab-bar del coord es HTML estático (`index.html:1208-1218`) y `setCoordTab` itera un array hardcodeado → la
pestaña `🧹 Limpieza` debe renderizarse **dinámicamente por rol** (toggle por `display`), siguiendo el precedente de
la tab Gastos (`:4416-4424`), nunca como HTML estático (si no, la verían todos los coordinadores). Más adelante puede
mudarse a una sección "Administración" general (paso 2 del roadmap). Dos solapas:

**Solapa 1 — Clientes duplicados (detector + fusión)**
- **Detector** — ⚠️ NO debe leer `_coordAllContacts` tal cual: ese cache es **scope-dependiente** (lo llenan
  `renderClientesView`/`renderCoordContactos` filtrado por `getCountryFilter()`/`recEnPaisNotion`, que dependen de la
  global `ceoViewCountry`). Si `ceoViewCountry` ≠ `'all'`, el detector solo vería un país → se perderían duplicados
  (incluso el Británico podría no aparecer). El detector **fuerza una carga global propia** (query a Clientes sin
  filtro de país, o `ceoViewCountry='all'` + recargar) antes de agrupar, y **excluye los `Archivado=true`**. Agrupa por:
  - mismo **teléfono** normalizado (solo dígitos),
  - mismo **email** normalizado (lower/trim),
  - **nombre parecido** normalizado (lower, sin tildes, espacios colapsados): igualdad, o uno contenido en el otro, o
    distancia de edición ≤ umbral chico.
  Muestra grupos de 2+ (hoy: 0), con el **País** de cada candidato.
- **Asistente de fusión** (por grupo): Diego elige el registro que **queda** (ganador). El sistema arma el **plan**
  consultando, por cada perdedor, sus relaciones — con una salvedad clave de este código:
  - **`Servicios.Contacto`** → ⚠️ la DB Servicios es multi-data-source: el proxy **descarta el filtro server-side** y
    cae a search (aviso explícito en `index.html:2848-2851`). → traer **todas** las páginas de Servicios y filtrar
    **client-side** por el id del perdedor en el array de la relación. NUNCA confiar en `filter` server-side acá.
  - **`Propuestas.Contacto`**, **`Ingresos.Cuenta`**, **`Ingresos.Servicio vinculado`** (de los servicios hallados) →
    el filtro server-side por relación sí funciona.
  El plan **lista TODO** lo que se moverá, **incluidos los Ingresos** (ver C3). Si ganador y perdedor son de **países
  distintos**, avisa/aborta (guardrail de UX; los números no se rompen porque el aislamiento financiero lee el `País`
  propio de cada Servicio/Ingreso, no el del cliente). Al confirmar, ejecuta **secuencial**: re-apunta cada relación
  del perdedor al ganador (reemplaza **solo** el id del perdedor en el array, conservando otros), y al final marca el
  perdedor `Archivado=true` (+ nota). Si un paso falla → **se detiene**, reporta hecho/falló, **no archiva**, y permite
  reintentar (re-apuntar es idempotente).

**Solapa 2 — Servicios a revisar (renombrar en lote + archivar)**
- Agrupa servicios por cliente y marca los que tienen **nombre inconsistente** (no matchean una forma canónica) o
  **visitas muy cercanas** (mismo cliente, fechas dentro de N días → posible repetida).
- Acciones: editar nombre uno por uno · **"Renombrar todos a…"** (setea el mismo title a los servicios
  seleccionados — caso Británico: los 4 a `"Hospital Británico"`) · **archivar** una visita seleccionada
  (`Archivado=true`) si Diego decide que es repetida. Todo con plan antes.

**Desarchivar (reversa visible):** el panel tiene un toggle **"Mostrar archivados"** que lista los registros con
`Archivado=true` y un botón **"Desarchivar"** (destildar) por registro. Como Notion queda solo de respaldo, la reversa
tiene que poder hacerse **desde la app**, no entrando a Notion.

### C3 — Plan-antes-de-ejecutar (red de seguridad)
Modal de confirmación (overlay **sibling de `<body>`**, por la regla de overlays multi-screen) que lista **exacto** lo
que va a pasar, ej.:
> "Voy a **renombrar 3 servicios** a *Hospital Británico*; **reapuntar 4 servicios + 1 propuesta + 2 ingresos/cobros**
> del cliente A al cliente B (ambos 🇺🇾 Uruguay); **archivar** el cliente A. ¿Confirmás?"

El plan **siempre lista los Ingresos** que se reapuntan (vía `Cuenta`), no solo servicios y propuestas — omitirlos
rompería "Por cobrar"/finanzas del ganador.

Solo al confirmar se ejecuta. Muestra progreso por paso y resultado final.

## Flujo de datos
- **Lecturas** del panel: el **detector de clientes NO reutiliza `_coordAllContacts`** (es scope-dependiente, ver C2)
  → hace su propia carga **global** de Clientes. La revisión de servicios puede partir de `_coordAllServices` pero
  **re-filtrando client-side** (Servicios es multi-data-source). Propuestas/Ingresos por relación se consultan a Notion
  on-demand al armar el plan de una fusión (Servicios del plan: traer todo + filtrar client-side por id del perdedor).
- **Escrituras**: a Notion (fuente) vía `callNotion`/`updateServiceProps`; reflejo a Supabase por `syncAfterWrite`.
- **Filtro de archivados — puntos exactos** (la frase "igual criterio que `Excluir de KPIs`" es una trampa: reusar
  `kpiIncluido()` (`index.html:4226`) NO alcanza, porque chequea solo `Excluir de KPIs`/`Financiamiento`/`Tipo interno`
  y **nunca** `Archivado`). Hay que excluir `Archivado=true` en:
  - **Finanzas:** plegar `Archivado` dentro de `kpiIncluido()` **o** agregar la condición al filtro `comp` de
    `renderPorCobrar` (`:6873-6881`) — el único lugar financiero que toca Servicios. Ídem el dropdown de asociación de
    cobros (`compSorted`/`optsFor`, `:6922`) para que un servicio archivado no se ofrezca como destino.
  - **Listas activas:** `renderClientesView`/`renderContactList` (`:9694/9720`), `renderCoordContactos` (`:9710`),
    `renderCoordServicios` (`:9125`), `renderCoordPruebas` (`:9149`), `renderCoordRelevamientos` (`:9172`), "Mis
    servicios" del operario, y **el propio detector de duplicados** (si no, un cliente recién archivado por fusión
    reaparece como candidato).
  - **NO tocar** sumas de Gastos/Ingresos (Archivado no existe en esas bases).

## Manejo de errores
- Operaciones de lote (fusión, renombrar en lote): **secuenciales**, con estado por paso; ante fallo, detener y
  reportar qué quedó hecho y qué no (nada de tragarse el error). Reintento disponible; re-apuntar relaciones es
  idempotente; archivar dos veces es inocuo.
- Edición de nombre: validar no-vacío; si la escritura a Notion falla, avisar y no cerrar el sheet.
- Si la propiedad `Archivado` no existiera aún en una base, Notion ignora la escritura silenciosamente y la lectura la
  trata como `false` → no rompe (pero la creamos en el setup para que funcione el ocultar).

## Verificación / pruebas
1. El **plan-antes-de-ejecutar** es la red principal (nada se ejecuta sin confirmación con el detalle a la vista).
2. Editar un nombre en un registro **inofensivo** primero y confirmar que persiste en Notion.
3. Fusión probada con **2 clientes de prueba creados a propósito** (crear → fusionar → verificar relaciones reapuntadas
   → ganador con todo, perdedor `Archivado`) → idempotencia (re-ejecutar no rompe).
4. **Británico**: renombrar los 4 servicios a `"Hospital Británico"` **con Diego**, viendo el plan; decidir junto si
   22/05 vs 29/05 es visita repetida (archivar) o dos reales.
5. Verificación de UI con Playwright (la pestaña 🧹 solo aparece a Dirección; CEO ve el nombre editable y el resto no).

## Riesgos / decisiones
- **Relaciones son arrays**: al reapuntar, reemplazar solo el id del perdedor y conservar otros (defensivo).
- **Archivar ≠ borrar**: marca reversible; jamás `archived:true` de página.
- **País**: el panel es Dirección-only (global) → sin fugas; la edición de nombre respeta el país del usuario.
- **Reflejo a Supabase**: el flag de write-sync sigue OFF por defecto; no cambia nada hasta prenderlo.
- **Ubicación de la pestaña**: por ahora dentro del panel de Dirección (coordinador); migrable a "Administración" (paso 2).

## Reversa
Quitar la pestaña 🧹 y los inputs de nombre revierte la UI; la marca `Archivado` se puede destildar para restaurar
cualquier registro. Ningún dato se borra.
