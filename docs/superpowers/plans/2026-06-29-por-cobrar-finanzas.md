# "Por cobrar" rediseñada + Finanzas operador completo — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development para implementar tarea por
> tarea. Steps usan checkbox (`- [ ]`). Ejecutar **PARTE A completa (C1-C5) → deploy → PARTE B (C6-C7) → deploy.**

**Goal:** Rediseñar "Por cobrar" (usuario Finanzas) a una vista **por cliente** con reconciliación de monedas en 1 toque
y asignación de precios en bloque (Parte A), y convertir a Finanzas en **operador completo** de cobranza+CRM —editar/
archivar/eliminar servicios y editar cobros— (Parte B).

**Architecture:** PWA single-file (`index.html`). Reusa el núcleo financiero existente (cálculo precio/cobrado/saldo,
`montoOf`, `asociarCobro`) y agrega presentación por-cliente + acciones de escritura. Notion sigue siendo la fuente;
toda escritura va a Notion (`updateServiceProps`/`callNotion`) + `syncAfterWrite`. País-aware.

**Tech Stack:** HTML/CSS/JS vanilla, i18n `TRANSLATIONS` (es+pt-BR), Notion API vía proxy, overlays sibling-de-body.

**Spec:** `docs/superpowers/specs/2026-06-29-por-cobrar-finanzas-redesign-design.md`

## Global Constraints

- **Archivo único** `index.html` → tareas que lo tocan van SECUENCIALES.
- **Verificación real (NO TDD unitario; NO inventar pytest/jest):** `npm run check` (parseo JS) tras CADA cambio;
  `npm test` (smoke read-only) antes del deploy; verificación funcional/visual con Playwright **en el usuario Finanzas**
  — esa parte la hace el controller/Diego (necesita login); los implementers NO se bloquean por falta de PIN ni
  escriben datos reales en Notion para probar.
- **Fuente de verdad = Notion.** Toda escritura → Notion (`updateServiceProps`/`callNotion`) + `syncAfterWrite(id,
  resource)` (flag de lecturas Supabase puede estar OFF; igual se llama). **Append-only en el espejo** (la
  reconciliación EDITA el cobro existente, no crea cobros nuevos).
- **NO mezclar monedas en los totales.** La reconciliación nunca suma pesos con dólares; solo marca cobertura.
  `montoOf` (`index.html:4351`) usa la etiqueta `Moneda cobro` → el dashboard cuenta la moneda real. `MONTO_FIELDS`
  en `:4346`.
- **Reusar (NO reconstruir):** `renderPorCobrar` (~`:7308`), `asociarCobro` (~`:7425`), `_porCobrarCtx` (re-render),
  `openEditSheet` (`:8645`), `saveServiceEdit` (`:9155`), `deleteService` (`:9194`), `updateServiceProps` (`:3572`),
  helpers de rol `esArchivado`/`esDireccion`/`kpiIncluido`/`finRecEnPais`/`recEnPaisNotion`/`puedeEditarNombre`.
- **País-aware:** Finanzas ve/opera SOLO su país (`finRecEnPais`). Todas las lecturas/acciones aisladas.
- **Permisos:** Finanzas opera; **CEO solo lectura**; coordinador NO tiene "Por cobrar" (ver P2). Call sites de
  `renderPorCobrar`: `:3932` (Finanzas) y `:6777` (CEO).
- **Plan-antes-de-tocar:** toda acción que escribe (reconciliar, asignar precio en bloque, archivar, eliminar, editar
  fecha/monto) muestra primero **qué va a pasar** en un overlay **sibling de `<body>`** (patrón `report-step-overlay`)
  y solo ejecuta al confirmar. **Eliminar = doble confirmación** (papelera Notion, recuperable 30 días).
- **Reversibilidad:** desarchivar, desvincular propuesta/cobro, volver el `Monto USD` reconciliado a 0.
- **i18n:** cada string nueva en es Y pt-BR.
- **Service Worker:** Parte A bumpea `flyclean-v87`→`v88`; Parte B `v88`→`v89`. Verificar con grep el valor real antes.
- **Deploy por parte:** merge a `main` por PR/ff → Vercel. Es DATO FINANCIERO → el controller avisa a Diego antes.
- **Commits** terminan con `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.

## Las 6 precisiones IMPRESCINDIBLES (de la revisión adversarial del spec) — cada tarea relevante DEBE cumplirlas
- **P1:** `renderPorCobrar` hoy NO carga clientes y arma `rows` sin `s.id` (~`:7339-7356`). C1 DEBE cargar `clientes`
  (`callNotionAll(CONTACTOS_DB_ID)`) para id→nombre/país, e incluir `id` y `clienteId` en cada row.
- **P2:** los call sites de `renderPorCobrar` NO pasan `{readonly:true}` → CEO ve la vista editable. **Ajuste del
  re-chequeo:** el coordinador NO tiene "Por cobrar" (no existe esa tab) → la fila "coordinador" de la tabla de
  permisos se ELIMINA; solo el call site del **CEO (`:6777`)** debe pasar `{readonly:true}`. Finanzas (`:3932`) NO.
- **P3:** reconciliación SIMÉTRICA (precio USD/pago pesos setea `Monto USD`; precio pesos/pago USD setea
  `Monto UY$ cobrado`); el cubierto por defecto = **saldo restante** (no el precio completo); **validar `cubierto>0`**
  antes de derivar `TC = monto_otra_moneda / cubierto` (nunca dividir por 0 ni escribir `TC aplicado = Infinity`).
- **P4:** C4 precio = `Propuesta.Importe estimado` **POR VISITA**; si el cliente tiene >1 propuesta recurrente, dejar
  ELEGIR el contrato; NO pisar visitas que ya tengan propuesta vinculada.
- **P5 (+ ajustes del re-chequeo de hoy):** `openEditSheet` hace `editingService = _coordAllServices.find(...)` que NO
  se puebla en el flujo Finanzas→Por cobrar → `return` silencioso. C6 DEBE **pasar el objeto del servicio directo** y
  **poblar `editState.contactoId`** (hoy el sheet también resuelve cliente/Maps con `renderSvcClienteUbicacion`/
  `resolveSvcUbicacion`, que necesitan el contacto). Además: `saveServiceEdit`/`deleteService` re-renderizan
  `renderCoordServicios` (`:9187/:9211`) al cerrar → desde Finanzas hay que **redirigir el post-save a
  `renderPorCobrar`** (usar `_porCobrarCtx`). Y **relajar el bloqueo "Completado"** de archivar/eliminar (`:8442/:8852`
  y `deleteService :9198`) para Finanzas (con confirm de papelera). `saveServiceEdit` ya escribe `Operario manual`
  (`:9175`) — C6 debe inicializar `editState` para NO pisar el operario manual existente con `null`.
- **P6:** `MONTO_FIELDS.ingreso` (`:4346`) setea `Monto UY$ cobrado` O `Monto USD` según moneda pero NUNCA limpia el
  otro. C7 al editar el monto real (en `Moneda cobro`) DEBE **limpiar el campo de la otra moneda** y **re-derivar o
  limpiar `TC aplicado`**. C3 (reconciliación/equivalencia) y C7 (monto real del pago) son conceptos SEPARADOS.

---

# PARTE A — "Por cobrar" por cliente (C1-C5) · sw v87→v88

# PARTE A — "Por cobrar" por cliente (C1–C5 + P2) — Implementation Plan

> **Cabecera del plan global + CONTRATO COMPARTIDO (global constraints + P1–P6):**
> `docs/superpowers/plans/2026-06-29-por-cobrar-finanzas.md`. Leerlo antes de cada tarea.
> **Spec:** `docs/superpowers/specs/2026-06-29-por-cobrar-finanzas-redesign-design.md`.
> **Sub-skill:** `superpowers:subagent-driven-development` — una tarea por vez, steps con checkbox.
> **Archivo único** `index.html` → TODAS las tareas A van SECUENCIALES (A-1 → A-2 → … → A-6).
> **NO push.** El controller hace el merge/deploy tras avisar a Diego (es dato financiero).

## Resumen de la Parte A
Reorganiza `renderPorCobrar` de una lista plana por-visita a una vista **por cliente/contrato** (C1+C2),
agrega **reconciliación de moneda en 1 toque** `cubrirServicio` (C3), **asignar precio del contrato en bloque**
`asignarPrecioContrato` (C4), mejora **asociar cobro** filtrado al cliente (C5, reusa `asociarCobro`), y aplica
**`{readonly:true}` al CEO** (P2). Cierra con bump `sw.js` v87→v88 + `npm test` + commit (sin push).

## Funciones nuevas (firmas — interfaces entre tareas)
- `cubrirServicio(ingId, svcId)` — C3, reconciliación cross-moneda (overlay de plan).
- `confirmCubrirServicio(ingId, svcId, cubierto)` — C3, ejecuta el PATCH tras confirmar el plan.
- `asignarPrecioContrato(clienteId)` — C4, asigna precio del contrato a las visitas sin precio (overlay).
- `confirmAsignarPrecio(clienteId, propId)` — C4, vincula la propuesta a las N visitas (secuencial idempotente).
- `openPorCobrarPlan(title, bodyHTML, onConfirm)` + `closePorCobrarPlan()` — helper de overlay sibling-de-body
  reutilizado por C3 y C4 (patrón `report-step-overlay`).
- `_porCobrarData` — cache del último dataset cargado por `renderPorCobrar` (svc/prop/ing/clientes indexados),
  para que C3/C4 lean montos sin re-fetchear. Producido por C1, consumido por C3/C4.

## Hechos verificados del código (post Fases A/B/C de hoy — rama `feat/por-cobrar`)
- `renderPorCobrar(containerId, opts={})` arranca en **:7308**; `readonly = !!opts.readonly` (**:7309**);
  `_porCobrarCtx = { containerId, opts }` (**:7310**) → re-render.
- Carga `svc`/`prop`/`ing` con `callNotionAll` (**:7315-7319**). NO carga clientes. `norm = s => s.replace(/-/g,'')`.
- `precioBy[norm(p.id)] = { monto: Importe estimado, moneda: Moneda||'🇺🇸 USD' }` (**:7322**).
- `ingBy[norm(i.id)] = { usd: Monto USD, uy: Monto UY$ cobrado }` (**:7324**).
- `comp` = Completados facturables, ya filtra `recEnPaisNotion(s)` (país) + excluye Prueba/Relevamiento/Jornada
  + `kpiIncluido` (**:7330-7338**). `kpiIncluido` ya excluye archivados (`esArchivado`, **:4373-4374**).
- `rows` (**:7339-7357**) SIN `s.id`: `{ nombre, precio, esUY, cobrado, cobradoOtra, saldo, pct, estado }`.
  `esUY = pr.moneda === '🇺🇾 UY$'`; `cobrado = esUY ? cobUY : cobUSD` (**:7348**, ignora la otra moneda);
  `cobradoOtra` informativo; `estado ∈ {sinprecio, cobrado, parcial, acobrar}`.
- `sinAsociar` (**:7374**) = cobros sin `Servicio vinculado`/`Servicio`, `finRecEnPais(i)`, no financiamiento.
- `optsFor(i)` (**:7380-7390**): el cliente del cobro sale de `Cuenta` relation (**:7381**); filtra `comp` por
  `Contacto` relation (**:7382**). Pre-selecciona si el cliente tiene 1 sólo servicio.
- `asociarCobro(ingId)` (**:7425**): lee `#assoc-<ingId>`, PATCH `Servicio vinculado`, re-render `_porCobrarCtx`.
- Call sites: Finanzas **:3932** `renderPorCobrar('finanzas-content')` (sin opts); CEO **:6777**
  `renderPorCobrar('ceo-content')` (sin opts). El coordinador NO tiene tab "Por cobrar".
- Helpers: `recEnPaisNotion` (**:2993**, esquema nombres completos — Servicios/Contactos), `finRecEnPais`
  (**:2984**, esquema cortos — Ingresos), `fmtMoneda` (**:4384**), `montoOf` (**:4351**, etiqueta `Moneda cobro`
  manda → no doble-conteo), `MONTO_FIELDS.ingreso = { moneda:'Moneda cobro', uy:'Monto UY$ cobrado', usd:'Monto USD' }`
  (**:4348**), `callNotion` (**:3456**), `callNotionAll` (**:3502**), `esc`, `openContactSheet(clienteId)` (**:10474**,
  tap→ficha cliente), `toggleCeoAcc` (**:7065**), `ceoHeaderHTML` (**:7048**).
- Contrato recurrente = propuesta `Tipo === '🔄 Recurrente'` (visto en cliente 360 **:10756-10757**), con
  `Importe estimado` (precio por visita) + `Servicios por año`. Propuesta usa `Contacto` relation (**:9381**).
- Overlay de plan modelo: `report-step-overlay` (**:1430**, sibling de body, clase `.edit-overlay` +
  `.open`), abierto con `.classList.add('open')` (**:9275**), cerrado con `.classList.remove('open')` (**:9321**).
- i18n: `t(key)` (**:2849**); `TRANSLATIONS = { es:{…}, 'pt-BR':{…} }` (**:1674/:2260**). Cada string nueva en es Y pt-BR.
- `sw.js` `const CACHE = 'flyclean-v87'` (**:82**) → bump a `v88`.
- `npm run check` = `node tests/check-html.mjs`; `npm test` = `node tests/smoke.mjs`.

---

### Task A-1: C1 — `renderPorCobrar` carga clientes + filas con `id`/`clienteId` (P1)
**Files:** Modify `index.html` (función `renderPorCobrar`, ≈:7308)
**Interfaces:**
- Produces `_porCobrarData` (cache global: `{ svc, prop, ing, clientesById, precioBy, ingBy, comp }`) — consumido por A-3/A-4.
- Produces filas con `id` (servicio) y `clienteId` — consumido por A-2 (tarjeta) y A-3/A-4 (onclicks).
- Consumes nada nuevo (reusa la carga existente).

- [ ] **Step 1: cargar `clientes` en el `Promise.all` y declarar el cache.** Justo antes del bloque (≈:7307)
  declarar el cache global (al lado de `var _porCobrarCtx = null;`):
  ```js
  var _porCobrarData = null; // dataset indexado del último render (lo usan cubrirServicio/asignarPrecioContrato)
  ```
  Reemplazar el `Promise.all` (`:7315-7319`) por:
  ```js
      const [svc, prop, ing, cli] = await Promise.all([
        callNotionAll(`databases/${DB_ID}/query`, {}),
        callNotionAll(`databases/${PROPUESTAS_DB_ID}/query`, {}),
        callNotionAll(`databases/${INGRESOS_DB_ID}/query`, {}),
        callNotionAll(`databases/${CONTACTOS_DB_ID}/query`, {})
      ]);
  ```
- [ ] **Step 2: indexar clientes id→{nombre,país} (respeta el título real `Nombre / Empresa`).** Después de
  construir `precioBy`/`ingBy` (tras `:7324`) agregar:
  ```js
      const clientesById = {};
      (cli.results || []).forEach(c => {
        clientesById[norm(c.id)] = {
          nombre: c.properties?.['Nombre / Empresa']?.title?.[0]?.plain_text || '(cliente)',
          pais: c.properties?.['País']?.select?.name || ''
        };
      });
  ```
- [ ] **Step 3: incluir `id` y `clienteId` en cada row.** En el `comp.map(s => {…})` (`:7339-7357`), tras
  `const p = s.properties || {};` capturar el cliente y, en el objeto devuelto, agregar `id`/`clienteId`:
  ```js
        const clienteId = norm(p['Contacto']?.relation?.[0]?.id || '');
  ```
  y cambiar el `return { nombre, precio, … }` por:
  ```js
        return { id: s.id, clienteId, nombre, precio, esUY, cobrado, cobradoOtra, saldo,
                 pct: precio ? Math.round(cobrado / precio * 100) : 0, estado };
  ```
- [ ] **Step 4: guardar el dataset en el cache (antes del `content.innerHTML =`).** Justo antes de armar el
  HTML final (antes de `:7403 content.innerHTML =`) agregar:
  ```js
      _porCobrarData = { svc, prop, ing, clientesById, precioBy, ingBy, comp, readonly };
  ```
  (Nota: el HTML por-cliente lo arma A-2; A-1 deja el cache + las filas con `id` y NO rompe la salida actual —
  el `content.innerHTML` viejo sigue compilando. A-2 reemplaza el render.)
- [ ] **Step 5: Verificar sintaxis** — `cd ~/repos/flyclean-app && npm run check` → Expected: "✅ … parsean OK".
- [ ] **Step 6: Verificar funcional** — controller en Playwright como **FINANZAS** → tab "Por cobrar":
  la vista sigue cargando igual que antes (lista por estado), sin error en consola. (Es refactor de datos; la UI
  por-cliente llega en A-2.) Confirmar en consola: `window._porCobrarData?.clientesById` tiene claves.
- [ ] **Step 7: Commit** — `git add index.html && git commit -m "C1: renderPorCobrar carga clientes + rows con id/clienteId (P1)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"`

---

### Task A-2: C2 — render por cliente/contrato (tarjetas) en `renderPorCobrar`
**Files:** Modify `index.html` (función `renderPorCobrar`, bloque de armado de HTML, ≈:7359-7417)
**Interfaces:**
- Consumes filas con `id`/`clienteId` y `clientesById` (de A-1).
- Produces el DOM con los hooks de onclick que A-3/A-4/A-5 cablean: `#assoc-<ingId>` (ya existe),
  botones `onclick="cubrirServicio('<ingId>','<svcId>')"`, `onclick="asignarPrecioContrato('<clienteId>')"`,
  header `onclick="openContactSheet('<clienteId>')"`.

- [ ] **Step 1: agrupar las filas por cliente y ordenar (🔴 arriba).** Reemplazar el bloque de agrupado por estado
  (`:7359-7370`, desde `const grupos = …` hasta el `sec` helper) por un agrupado por `clienteId`. Código objetivo:
  ```js
      // Agrupar visitas facturables por cliente (P1: cada fila ya trae id/clienteId).
      const fU = n => fmtMoneda(n, '🇺🇸 USD');
      const fMon = (n, esUY) => fmtMoneda(n, esUY ? '🇺🇾 UY$' : '🇺🇸 USD');
      const byCli = {};
      rows.forEach(r => { (byCli[r.clienteId || 'sin-cliente'] = byCli[r.clienteId || 'sin-cliente'] || []).push(r); });
      // Propuesta recurrente por cliente (contrato): Tipo === '🔄 Recurrente'.
      const norm2 = s => (s || '').replace(/-/g, '');
      const contratoByCli = {};
      (prop.results || []).forEach(p => {
        if ((p.properties?.['Tipo']?.select?.name || '') !== '🔄 Recurrente') return;
        const cid = norm2(p.properties?.['Contacto']?.relation?.[0]?.id || '');
        if (!cid) return;
        (contratoByCli[cid] = contratoByCli[cid] || []).push(p);
      });
      // Saldo por cliente separado por moneda (NUNCA mezcla pesos con dólares).
      const saldoCli = arr => arr.reduce((a, r) => { if (r.precio && r.saldo > 0) { if (r.esUY) a.uyu += r.saldo; else a.usd += r.saldo; } return a; }, { uyu: 0, usd: 0 });
      const splitStr = tt => [tt.usd ? fU(tt.usd) : '', tt.uyu ? fMon(tt.uyu, true) : ''].filter(Boolean).join(' · ');
      // Orden: clientes con saldo (🔴) primero; dentro, mayor saldo arriba.
      const cliIds = Object.keys(byCli).sort((a, b) => {
        const sa = saldoCli(byCli[a]), sb = saldoCli(byCli[b]);
        const ta = sa.usd + sa.uyu, tb = sb.usd + sb.uyu;
        if ((tb > 0) !== (ta > 0)) return (tb > 0) - (ta > 0);
        return tb - ta;
      });
  ```
- [ ] **Step 2: helper de fila-visita con saldo coloreado + acciones contextuales.** Definir (antes de armar las
  tarjetas) el render de una visita. Color: 🔴 `acobrar`, 🟡 `parcial`, ✅ `cobrado`, ⚠️ `sinprecio`:
  ```js
      const saldoColor = r => r.estado === 'cobrado' ? 'var(--green)' : (r.estado === 'parcial' ? '#E6A700' : 'var(--red)');
      const saldoTxt = r => !r.precio ? 'sin precio' : (r.saldo > 0 ? (r.estado === 'parcial' ? '🟡 falta ' : '🔴 falta ') + fMon(r.saldo, r.esUY) : '✅ cobrado');
      const visitaHTML = r =>
        '<div class="ec-row" style="align-items:flex-start;gap:10px">' +
          '<div style="min-width:0"><div style="font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(r.nombre) + '</div>' +
            '<div style="font-size:11px;color:var(--text3)">' + (r.precio ? 'Precio ' + fMon(r.precio, r.esUY) + ' · Cobrado ' + fMon(r.cobrado, r.esUY) + (r.cobradoOtra ? ' (+ ' + fMon(r.cobradoOtra, !r.esUY) + ' en otra moneda)' : '') : 'sin precio vinculado') + '</div></div>' +
          '<div style="text-align:right;font-weight:700;white-space:nowrap;color:' + saldoColor(r) + '">' + saldoTxt(r) + '</div>' +
        '</div>';
  ```
  (Las acciones de reconciliar/asociar viven en la sección de cobros del cliente, donde están los `ingId`. La fila
  visita queda informativa; el botón "✓ cubre este servicio" se cablea en A-3 en la sección de cobros sin asociar.)
- [ ] **Step 3: armar la tarjeta por cliente (header + contrato + visitas + sin-precio + cobros sin asociar).**
  Reemplazar el `content.innerHTML = …` (`:7403-7417`) por el render por-cliente. Reusa `optsFor`/`sinAsociar`/`ingCli`/
  `ingMonto` que ya existen arriba (`:7374-7401`) — NO duplicarlos. Para cada cliente, filtrar sus cobros sin asociar
  por `Cuenta` relation. Código objetivo:
  ```js
      const tarjetaCliente = cid => {
        const arr = byCli[cid];
        const info = clientesById[cid] || { nombre: cid === 'sin-cliente' ? '(sin cliente)' : '(cliente)', pais: '' };
        const sc = saldoCli(arr);
        const saldoHdr = (sc.usd || sc.uyu) ? '<span style="color:var(--red);font-weight:700">' + splitStr(sc) + '</span>' : '<span style="color:var(--green);font-weight:700">al día ✅</span>';
        // Header → tap a ficha cliente (no en sin-cliente).
        const headTap = cid !== 'sin-cliente' ? ' onclick="openContactSheet(\'' + cid + '\')" style="cursor:pointer"' : '';
        let h = '<div class="estado-cuenta" style="margin-top:10px">' +
          '<div class="ec-saldo"' + headTap + '><span>' + esc(info.nombre) + (info.pais ? ' <span style="font-size:11px;color:var(--text3)">' + esc(info.pais) + '</span>' : '') + '</span>' + saldoHdr + '</div>';
        // Contrato recurrente (si hay).
        const contratos = contratoByCli[cid] || [];
        if (contratos.length) {
          const c0 = contratos[0].properties || {};
          const imp = c0['Importe estimado']?.number || 0;
          const sa = c0['Servicios por año']?.number || 0;
          h += '<div class="ec-row" style="font-size:12px;color:var(--text3)">📑 Contrato: ' + (imp ? fU(imp) + ' / visita' : 'sin importe') + (sa ? ' · ' + sa + '/año' : '') + (contratos.length > 1 ? ' · ' + contratos.length + ' contratos' : '') + '</div>';
        }
        // Visitas del cliente (con precio).
        arr.filter(r => r.precio).slice().sort((a, b) => b.saldo - a.saldo).forEach(r => { h += visitaHTML(r); });
        // Sin precio → botón asignar precio del contrato (C4) si hay contrato.
        const sinPrecio = arr.filter(r => !r.precio);
        if (sinPrecio.length) {
          h += '<div class="ec-section-total"><span>⚠️ SIN PRECIO (' + sinPrecio.length + ')</span><span style="color:var(--text3);font-size:11px">¿del contrato?</span></div>';
          sinPrecio.slice().sort((a, b) => a.nombre.localeCompare(b.nombre)).forEach(r => { h += visitaHTML(r); });
          if (!readonly && contratos.length && cid !== 'sin-cliente') {
            h += '<div style="padding:8px 16px"><button class="fin-svc-link" onclick="asignarPrecioContrato(\'' + cid + '\')">📑 Asignar el precio del contrato a estas ' + sinPrecio.length + ' visita(s)</button></div>';
          }
        }
        // Cobros sin asociar de ESTE cliente (selector filtrado al cliente — reusa optsFor).
        const cobrosCli = (!readonly) ? sinAsociar.filter(i => norm2((i.properties?.['Cuenta']?.relation || [])[0]?.id || '') === cid) : [];
        if (cobrosCli.length) {
          h += '<div class="ec-section-total"><span>🔗 COBROS SIN ASOCIAR (' + cobrosCli.length + ')</span><span style="color:var(--text3);font-size:11px">asociá a su visita</span></div>';
          cobrosCli.forEach(i => {
            h += '<div class="ec-row" style="flex-direction:column;align-items:stretch;gap:6px;padding:8px 16px">' +
              '<div style="display:flex;justify-content:space-between;gap:8px"><span style="font-weight:600">' + esc(ingCli(i)) + '</span><span style="font-weight:700;white-space:nowrap">' + ingMonto(i) + ' <span style="color:var(--text3);font-weight:400;font-size:11px">' + (i.properties?.['Fecha']?.date?.start || '').slice(0, 10) + '</span></span></div>' +
              '<div style="display:flex;gap:6px"><select id="assoc-' + i.id + '" style="flex:1;min-width:0;padding:6px;border-radius:6px;background:var(--bg);color:var(--text);border:1px solid var(--border);font-size:12px;font-family:inherit">' + optsFor(i) + '</select>' +
              '<button class="fin-svc-link" style="white-space:nowrap" onclick="asociarCobro(\'' + i.id + '\')">Asociar</button></div>' +
            '</div>';
          });
        }
        return h + '</div>';
      };
      // Total general (separado por moneda).
      const totalPC = rows.reduce((a, r) => { if (r.precio && r.saldo > 0) { if (r.esUY) a.uyu += r.saldo; else a.usd += r.saldo; } return a; }, { uyu: 0, usd: 0 });
      const nCli = cliIds.filter(c => { const s = saldoCli(byCli[c]); return s.usd || s.uyu; }).length;
      content.innerHTML =
        (opts.headerless ? '' : ceoHeaderHTML('Por cobrar')) +
        '<div class="acct">' +
          '<div class="estado-cuenta">' +
            '<div class="ec-title">💰 TOTAL POR COBRAR</div>' +
            '<div class="ec-saldo"><span>Pendiente de cobro</span><span style="color:var(--red)">' + (splitStr(totalPC) || fU(0)) + '</span></div>' +
            '<div class="ec-counts">' + nCli + ' cliente(s) con saldo · ' + rows.length + ' visitas</div>' +
          '</div>' +
          cliIds.map(tarjetaCliente).join('') +
          '<div style="padding:12px 14px;font-size:11px;color:var(--text3)">El precio sale de la propuesta vinculada; lo cobrado, de los cobros vinculados. Reconciliá monedas o asigná el precio del contrato con un toque.</div>' +
        '</div>';
  ```
- [ ] **Step 4: Verificar sintaxis** — `cd ~/repos/flyclean-app && npm run check` → "✅ … parsean OK".
- [ ] **Step 5: Verificar funcional** — controller Playwright como **FINANZAS** → "Por cobrar": ahora la vista
  muestra **tarjetas por cliente** (Hospital Británico debe aparecer), header con falta-cobrar por moneda, contrato si
  lo hay, visitas con color, y cobros sin asociar dentro de la tarjeta del cliente. Tap en el header del cliente abre
  su ficha (`openContactSheet`). Sin errores en consola. Verificar que el total por cobrar coincide con el de antes
  (mismos números, sólo reagrupados). País: Finanzas-UY no ve clientes de otro país.
- [ ] **Step 6: Commit** — `git add index.html && git commit -m "C2: Por cobrar reorganizada por cliente/contrato (tarjetas)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"`

---

### Task A-3: C3 — reconciliar moneda 1-toque `cubrirServicio(ingId, svcId)` (P3) + overlay de plan
**Files:** Modify `index.html` — agregar overlay `por-cobrar-plan-overlay` (sibling de body, junto a `report-step-overlay` ≈:1440), helper `openPorCobrarPlan`/`closePorCobrarPlan`, funciones `cubrirServicio`/`confirmCubrirServicio` (junto a `asociarCobro` ≈:7438), y un botón "✓ cubre este servicio" en la sección de cobros sin asociar de A-2.
**Interfaces:**
- Produces `cubrirServicio(ingId, svcId)`, `confirmCubrirServicio(ingId, svcId, cubierto)`, `openPorCobrarPlan(title, bodyHTML, onConfirm)`, `closePorCobrarPlan()`.
- Consumes `_porCobrarData` (de A-1) para leer precio/cobrado del servicio y monto real del cobro.

- [ ] **Step 1: overlay sibling de body (patrón `report-step-overlay`).** Insertar tras el cierre del
  `report-step-overlay` (después de `:1440`):
  ```html
  <div class="edit-overlay" id="por-cobrar-plan-overlay" onclick="if(event.target.id==='por-cobrar-plan-overlay')closePorCobrarPlan()">
    <div class="edit-sheet" id="por-cobrar-plan-sheet">
      <button class="sheet-close-btn" type="button" aria-label="Cerrar" onclick="closePorCobrarPlan()">×</button>
      <div class="edit-sheet-handle"></div>
      <div class="edit-sheet-header">
        <div class="edit-sheet-title" id="por-cobrar-plan-title">Confirmar</div>
      </div>
      <div id="por-cobrar-plan-body" style="padding:16px 20px 24px"></div>
    </div>
  </div>
  ```
- [ ] **Step 2: helper de overlay (cerca de `asociarCobro`, tras :7437).**
  ```js
  // Overlay "plan antes de tocar": muestra qué va a pasar y ejecuta onConfirm sólo al confirmar.
  var _porCobrarOnConfirm = null;
  function openPorCobrarPlan(title, bodyHTML, onConfirm) {
    _porCobrarOnConfirm = onConfirm;
    document.getElementById('por-cobrar-plan-title').textContent = title;
    document.getElementById('por-cobrar-plan-body').innerHTML = bodyHTML +
      '<div style="display:flex;gap:10px;margin-top:20px">' +
        '<button type="button" onclick="closePorCobrarPlan()" style="flex:1;padding:13px;background:var(--bg);border:1px solid var(--border);border-radius:12px;color:var(--text2);font-family:inherit;font-size:14px;font-weight:600;cursor:pointer">' + t('porcobrar.plan.cancel') + '</button>' +
        '<button type="button" id="pc-plan-confirm" onclick="if(_porCobrarOnConfirm)_porCobrarOnConfirm()" style="flex:2;padding:13px;background:#00C98D;border:none;border-radius:12px;color:#04130d;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer">' + t('porcobrar.plan.confirm') + '</button>' +
      '</div>';
    document.getElementById('por-cobrar-plan-overlay').classList.add('open');
  }
  function closePorCobrarPlan() {
    document.getElementById('por-cobrar-plan-overlay').classList.remove('open');
    _porCobrarOnConfirm = null;
  }
  ```
- [ ] **Step 3: `cubrirServicio(ingId, svcId)` — arma el plan SIMÉTRICO con saldo restante y validación.** Tras el
  helper anterior. Lee del cache `_porCobrarData`. La moneda objetivo = la del PRECIO (P3). `cubierto` por defecto =
  saldo restante. TC sólo si hay monto en la otra moneda Y `cubierto > 0`.
  ```js
  // C3 — reconciliar moneda en 1 toque: marca que un cobro hecho en otra moneda CUBRE este servicio.
  // SIMÉTRICA: si el precio es USD, setea Monto USD; si es UY$, setea Monto UY$ cobrado. Mantiene el monto real
  // (Moneda cobro) intacto → el dashboard sigue contando la moneda real (sin doble-conteo).
  function cubrirServicio(ingId, svcId) {
    const D = _porCobrarData; if (!D) return;
    const norm = s => (s || '').replace(/-/g, '');
    const s = (D.svc.results || []).find(x => x.id === svcId);
    const i = (D.ing.results || []).find(x => x.id === ingId);
    if (!s || !i) { alert('No encontré el servicio o el cobro (refrescá).'); return; }
    const propId = s.properties?.['Propuesta']?.relation?.[0]?.id;
    const pr = propId ? D.precioBy[norm(propId)] : null;
    if (!pr || !pr.monto) { alert('Este servicio no tiene precio (propuesta). Asigná el precio primero.'); return; }
    const precioEsUY = pr.moneda === '🇺🇾 UY$';
    // Cobrado en la moneda del precio (suma de todos los cobros del servicio).
    let cobEnPrecio = 0, montoOtra = 0;
    (s.properties?.['Ingresos']?.relation || []).forEach(r => { const v = D.ingBy[norm(r.id)]; if (v) cobEnPrecio += precioEsUY ? v.uy : v.usd; });
    // Monto real de ESTE cobro, en la OTRA moneda (lo que se pagó de verdad).
    const im = D.ingBy[norm(ingId)] || { usd: 0, uy: 0 };
    montoOtra = precioEsUY ? im.usd : im.uy;            // si precio UY$, el pago real estaría en USD
    const saldoRest = Math.max(0, pr.monto - cobEnPrecio);
    const fP = n => fmtMoneda(n, pr.moneda);
    const fO = n => fmtMoneda(n, precioEsUY ? '🇺🇸 USD' : '🇺🇾 UY$');
    const cubiertoDef = saldoRest > 0 ? saldoRest : pr.monto;  // default = saldo restante
    const body =
      '<div style="font-size:14px;line-height:1.5;margin-bottom:12px">' +
        'Este cobro' + (montoOtra ? ' de <b>' + fO(montoOtra) + '</b>' : '') + ' cubre el servicio <b>' + esc(s.properties?.['Nombre del servicio']?.title?.[0]?.plain_text || '') + '</b> (' + fP(pr.monto) + '). Saldo restante: <b>' + fP(saldoRest) + '</b>.' +
      '</div>' +
      '<div class="gasto-form-row"><label>' + t('porcobrar.cubrir.label') + ' (' + (precioEsUY ? 'UY$' : 'USD') + ')</label>' +
        '<input type="number" id="pc-cubierto" step="0.01" min="0" inputmode="decimal" value="' + cubiertoDef + '" style="width:100%"/></div>' +
      '<div style="font-size:11px;color:var(--text3);margin-top:6px">Se guarda en ' + (precioEsUY ? 'Monto UY$ cobrado' : 'Monto USD') + '. El monto real del pago (Moneda cobro) NO se toca.</div>';
    openPorCobrarPlan(t('porcobrar.cubrir.title'), body, () => {
      const v = parseFloat(document.getElementById('pc-cubierto').value);
      const cubierto = isFinite(v) ? v : 0;
      confirmCubrirServicio(ingId, svcId, cubierto);
    });
  }
  ```
- [ ] **Step 4: `confirmCubrirServicio(ingId, svcId, cubierto)` — PATCH con validación `cubierto>0` antes del TC.**
  ```js
  async function confirmCubrirServicio(ingId, svcId, cubierto) {
    const D = _porCobrarData; if (!D) return;
    const norm = s => (s || '').replace(/-/g, '');
    const s = (D.svc.results || []).find(x => x.id === svcId);
    const propId = s?.properties?.['Propuesta']?.relation?.[0]?.id;
    const pr = propId ? D.precioBy[norm(propId)] : null;
    if (!pr) { alert('Sin precio.'); return; }
    const precioEsUY = pr.moneda === '🇺🇾 UY$';
    const im = D.ingBy[norm(ingId)] || { usd: 0, uy: 0 };
    const montoOtra = precioEsUY ? im.usd : im.uy;          // pago real en la otra moneda
    const props = {};
    // Setea el monto cubierto en la moneda del PRECIO (P3 simétrico). Si cubierto<=0 → vuelve a 0 (reversible).
    props[precioEsUY ? 'Monto UY$ cobrado' : 'Monto USD'] = { number: cubierto > 0 ? cubierto : 0 };
    // Asegura el vínculo al servicio (por si venía sin asociar).
    props['Servicio vinculado'] = { relation: [{ id: svcId }] };
    // TC derivado SÓLO si hay monto en la otra moneda Y cubierto>0 (NUNCA /0 ni Infinity).
    if (montoOtra && cubierto > 0) {
      props['TC aplicado'] = { number: Math.round((montoOtra / cubierto) * 100) / 100 };
    }
    const btn = document.getElementById('pc-plan-confirm'); if (btn) btn.disabled = true;
    try {
      await callNotion('pages/' + ingId, 'PATCH', { properties: props });
      if (typeof syncAfterWrite === 'function') { try { await syncAfterWrite(ingId, 'ingresos'); } catch (e) {} }
      closePorCobrarPlan();
      if (_porCobrarCtx) await renderPorCobrar(_porCobrarCtx.containerId, _porCobrarCtx.opts);
    } catch (e) {
      if (btn) btn.disabled = false;
      alert('No se pudo reconciliar: ' + (e.message || e));
    }
  }
  ```
  (Si `syncAfterWrite` no existe en la rama, el `typeof` lo saltea sin romper. Confirmar con grep antes; si existe,
  el wrap try/catch evita que su fallo rompa el re-render.)
- [ ] **Step 5: botón "✓ cubre este servicio" en la sección cobros del cliente (A-2).** En `tarjetaCliente` de A-2,
  dentro del bloque de `cobrosCli.forEach`, agregar bajo la fila del selector/Asociar un botón que aparezca cuando el
  cobro tiene un servicio elegible del cliente. Como el cobro sin asociar todavía no tiene servicio, el botón "cubre"
  se ofrece tras asociar (C5→C3). Implementación mínima sin estado extra: junto al botón "Asociar" agregar, sólo si el
  cliente tiene exactamente 1 servicio con precio, un botón directo:
  ```js
  // dentro del forEach de cobrosCli, calcular el svc candidato (1 solo servicio con precio del cliente):
  const cand = arr.filter(r => r.precio); // visitas con precio de este cliente
  const cubreBtn = cand.length === 1 ? '<button class="fin-svc-link" style="white-space:nowrap;margin-left:6px" onclick="cubrirServicio(\'' + i.id + '\',\'' + cand[0].id + '\')">✓ cubre</button>' : '';
  ```
  e insertarlo dentro del `<div style="display:flex;gap:6px">…</div>` del cobro, tras el botón Asociar.
  (Para cobros ya asociados pero en otra moneda, C5/A-5 ofrece C3 — ver A-5 Step 2.)
- [ ] **Step 6: i18n (es Y pt-BR).** Agregar en `TRANSLATIONS.es` y `TRANSLATIONS['pt-BR']`:
  - `'porcobrar.plan.cancel'`: 'Cancelar' / 'Cancelar'
  - `'porcobrar.plan.confirm'`: 'Confirmar' / 'Confirmar'
  - `'porcobrar.cubrir.title'`: 'Cubrir el servicio' / 'Cobrir o serviço'
  - `'porcobrar.cubrir.label'`: 'Monto que cubre' / 'Valor que cobre'
- [ ] **Step 7: Verificar sintaxis** — `cd ~/repos/flyclean-app && npm run check` → "✅ … parsean OK".
- [ ] **Step 8: Verificar funcional** — controller Playwright como **FINANZAS**: en un cliente con un cobro en otra
  moneda y 1 servicio con precio, tocar "✓ cubre" → abre el overlay de plan (sibling de body, se ve completo) con el
  texto "este cobro de X cubre el servicio de Y, saldo Z" y el input pre-cargado con el saldo restante. Confirmar →
  el servicio sale del 🔴. Verificar vía **MCP Notion** (data source ingresos `6bb3da36-1865-4668-9d43-cc6bb9966784`)
  que el cobro quedó con `Monto USD`/`Monto UY$ cobrado` seteado, `Moneda cobro` intacto y `TC aplicado` derivado (no
  Infinity). **No mezcla monedas**: el dashboard (Finanzas→Resumen) sigue contando el peso real. Caso borde: cubierto=0
  vuelve el monto a 0 sin escribir TC.
- [ ] **Step 9: Commit** — `git add index.html && git commit -m "C3: reconciliar moneda 1-toque cubrirServicio (P3, simétrico, sin /0)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"`

---

### Task A-4: C4 — `asignarPrecioContrato(clienteId)` (bloque, P4) + elegir contrato
**Files:** Modify `index.html` — funciones `asignarPrecioContrato`/`confirmAsignarPrecio` (junto a `cubrirServicio`, tras A-3). El botón ya lo dibuja A-2.
**Interfaces:**
- Produces `asignarPrecioContrato(clienteId)`, `confirmAsignarPrecio(clienteId, propId)`.
- Consumes `_porCobrarData` (de A-1) + el overlay de plan (de A-3).

- [ ] **Step 1: `asignarPrecioContrato(clienteId)` — lista las visitas sin precio + elige contrato si hay >1 (P4).**
  ```js
  // C4 — Asigna el precio del contrato a las visitas del cliente que NO tienen propuesta vinculada.
  // Vincula Servicios.Propuesta a la propuesta recurrente del cliente. NO pisa visitas con propuesta ya vinculada.
  function asignarPrecioContrato(clienteId, propIdSel) {
    const D = _porCobrarData; if (!D) return;
    const norm = s => (s || '').replace(/-/g, '');
    // Contratos recurrentes del cliente.
    const contratos = (D.prop.results || []).filter(p =>
      (p.properties?.['Tipo']?.select?.name || '') === '🔄 Recurrente' &&
      norm(p.properties?.['Contacto']?.relation?.[0]?.id || '') === norm(clienteId));
    if (!contratos.length) { alert('Este cliente no tiene un contrato recurrente con precio.'); return; }
    // Si hay >1 y no se eligió: pedir cuál (P4).
    if (contratos.length > 1 && !propIdSel) {
      const opts = contratos.map(p => '<option value="' + p.id + '">' + esc(p.properties?.['Nombre de propuesta']?.title?.[0]?.plain_text || p.id) + ' — ' + fmtMoneda(p.properties?.['Importe estimado']?.number || 0, p.properties?.['Moneda']?.select?.name || '🇺🇸 USD') + '/visita</option>').join('');
      const body = '<div style="font-size:14px;margin-bottom:10px">' + t('porcobrar.contrato.choose') + '</div>' +
        '<select id="pc-contrato-sel" style="width:100%;padding:8px;border-radius:8px;background:var(--bg);color:var(--text);border:1px solid var(--border);font-family:inherit">' + opts + '</select>';
      openPorCobrarPlan(t('porcobrar.contrato.title'), body, () => {
        const pid = document.getElementById('pc-contrato-sel').value;
        closePorCobrarPlan(); asignarPrecioContrato(clienteId, pid);
      });
      return;
    }
    const prop = propIdSel ? contratos.find(p => p.id === propIdSel) : contratos[0];
    const imp = prop.properties?.['Importe estimado']?.number || 0;
    const mon = prop.properties?.['Moneda']?.select?.name || '🇺🇸 USD';
    // Visitas del cliente Completadas SIN propuesta vinculada (P4: no pisar las que ya tienen una).
    const visitas = (D.comp || []).filter(s =>
      norm(s.properties?.['Contacto']?.relation?.[0]?.id || '') === norm(clienteId) &&
      !(s.properties?.['Propuesta']?.relation || []).length);
    if (!visitas.length) { alert('No hay visitas sin precio para este cliente.'); return; }
    const lista = visitas.map(s => '<li>' + esc(s.properties?.['Nombre del servicio']?.title?.[0]?.plain_text || '(servicio)') + '</li>').join('');
    const body = '<div style="font-size:14px;line-height:1.5;margin-bottom:10px">' +
        t('porcobrar.contrato.body').replace('{n}', visitas.length).replace('{precio}', fmtMoneda(imp, mon)) + '</div>' +
      '<ul style="margin:0 0 4px 18px;font-size:13px;color:var(--text2)">' + lista + '</ul>';
    openPorCobrarPlan(t('porcobrar.contrato.title'), body, () => confirmAsignarPrecio(clienteId, prop.id));
  }
  ```
- [ ] **Step 2: `confirmAsignarPrecio(clienteId, propId)` — secuencial, idempotente, reintentable.**
  ```js
  async function confirmAsignarPrecio(clienteId, propId) {
    const D = _porCobrarData; if (!D) return;
    const norm = s => (s || '').replace(/-/g, '');
    const visitas = (D.comp || []).filter(s =>
      norm(s.properties?.['Contacto']?.relation?.[0]?.id || '') === norm(clienteId) &&
      !(s.properties?.['Propuesta']?.relation || []).length);
    const btn = document.getElementById('pc-plan-confirm'); if (btn) btn.disabled = true;
    let ok = 0;
    try {
      for (const s of visitas) {
        // Idempotente: re-vincula sólo si sigue sin propuesta (si falló a mitad, reintentar no duplica).
        await callNotion('pages/' + s.id, 'PATCH', { properties: { 'Propuesta': { relation: [{ id: propId }] } } });
        if (typeof syncAfterWrite === 'function') { try { await syncAfterWrite(s.id, 'servicios'); } catch (e) {} }
        ok++;
      }
      closePorCobrarPlan();
      if (_porCobrarCtx) await renderPorCobrar(_porCobrarCtx.containerId, _porCobrarCtx.opts);
    } catch (e) {
      if (btn) btn.disabled = false;
      alert('Se asignaron ' + ok + ' de ' + visitas.length + '. Falló: ' + (e.message || e) + '. Podés reintentar (no duplica).');
    }
  }
  ```
- [ ] **Step 3: i18n (es Y pt-BR).** Agregar:
  - `'porcobrar.contrato.title'`: 'Asignar precio del contrato' / 'Atribuir preço do contrato'
  - `'porcobrar.contrato.choose'`: 'Este cliente tiene varios contratos. ¿Cuál aplicar?' / 'Este cliente tem vários contratos. Qual aplicar?'
  - `'porcobrar.contrato.body'`: 'Se vinculará la propuesta del contrato ({precio}/visita) a estas {n} visita(s):' / 'A proposta do contrato ({precio}/visita) será vinculada a estas {n} visita(s):'
- [ ] **Step 4: Verificar sintaxis** — `cd ~/repos/flyclean-app && npm run check` → "✅ … parsean OK".
- [ ] **Step 5: Verificar funcional** — controller Playwright como **FINANZAS**: en un cliente con contrato recurrente
  y visitas sin precio, tocar "📑 Asignar el precio del contrato a estas N visitas" → overlay de plan lista las N
  visitas + el precio/visita. Si hay >1 contrato, primero pide elegir. Confirmar → las visitas toman el precio (salen
  de "sin precio"). Verificar vía **MCP Notion** (data source servicios `2fbc8a03-5c4f-445c-8516-71dd9b2eea78`) que
  cada visita quedó con `Propuesta` vinculada. **No pisa** visitas que ya tenían otra propuesta. Reintentable: correr
  dos veces no duplica.
- [ ] **Step 6: Commit** — `git add index.html && git commit -m "C4: asignar precio del contrato en bloque (P4, elige contrato, idempotente)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"`

---

### Task A-5: C5 — asociar cobro mejorado (filtrado al cliente) + ofrecer C3 tras asociar
**Files:** Modify `index.html` — función `asociarCobro` (≈:7425). El selector filtrado al cliente ya lo dibuja A-2 (reusa `optsFor`).
**Interfaces:**
- Consumes `optsFor` (ya filtra por cliente vía `Cuenta`→`Contacto`), `_porCobrarData`, `cubrirServicio` (A-3).
- Produces `asociarCobro` extendido (tras asociar, si el cobro quedó en $0 / otra moneda, ofrece reconciliar).

- [ ] **Step 1: confirmar que el selector ya está filtrado al cliente.** En A-2 el `select#assoc-<ingId>` se dibuja
  dentro de la tarjeta del cliente y usa `optsFor(i)` (que prioriza los servicios del cliente del cobro y pre-selecciona
  si hay uno solo). No requiere cambio de código nuevo aquí, sólo verificar. (Documentar en el commit que C5 reusa
  `optsFor`.)
- [ ] **Step 2: extender `asociarCobro` para ofrecer C3 tras asociar.** Reemplazar el cuerpo del `try` de
  `asociarCobro` (`:7430-7432`) por:
  ```js
    try {
      await callNotion('pages/' + ingId, 'PATCH', { properties: { 'Servicio vinculado': { relation: [{ id: svcId }] } } });
      if (typeof syncAfterWrite === 'function') { try { await syncAfterWrite(ingId, 'ingresos'); } catch (e) {} }
      // Si el cobro está en una moneda distinta a la del precio del servicio (o en $0 en esa moneda) → ofrecer reconciliar (C3).
      const D = _porCobrarData;
      if (D) {
        const nrm = x => (x || '').replace(/-/g, '');
        const sObj = (D.svc.results || []).find(x => x.id === svcId);
        const propId = sObj?.properties?.['Propuesta']?.relation?.[0]?.id;
        const pr = propId ? D.precioBy[nrm(propId)] : null;
        const im = D.ingBy[nrm(ingId)] || { usd: 0, uy: 0 };
        if (pr) {
          const precioEsUY = pr.moneda === '🇺🇾 UY$';
          const enPrecio = precioEsUY ? im.uy : im.usd;     // monto del cobro EN la moneda del precio
          const enOtra = precioEsUY ? im.usd : im.uy;
          if (!enPrecio && enOtra) {                         // pagado en la otra moneda → conviene reconciliar
            if (_porCobrarCtx) await renderPorCobrar(_porCobrarCtx.containerId, _porCobrarCtx.opts);
            if (confirm(t('porcobrar.asociar.reconciliar'))) cubrirServicio(ingId, svcId);
            return;
          }
        }
      }
      if (_porCobrarCtx) await renderPorCobrar(_porCobrarCtx.containerId, _porCobrarCtx.opts);
    } catch (e) {
  ```
  (Mantener el `catch` existente que re-habilita el select y avisa.)
- [ ] **Step 3: i18n (es Y pt-BR).** Agregar:
  - `'porcobrar.asociar.reconciliar'`: 'Este cobro está en otra moneda. ¿Querés marcar cuánto cubre del servicio?' / 'Este cobro está em outra moeda. Quer marcar quanto cobre do serviço?'
- [ ] **Step 4: Verificar sintaxis** — `cd ~/repos/flyclean-app && npm run check` → "✅ … parsean OK".
- [ ] **Step 5: Verificar funcional** — controller Playwright como **FINANZAS**: dentro de una tarjeta de cliente con
  un cobro sin asociar, el selector muestra **sólo/primero los servicios de ese cliente** (pre-seleccionado si hay uno).
  Asociar → se vincula. Si el cobro estaba en otra moneda que el precio, aparece el `confirm` ofreciendo reconciliar
  (C3) y al aceptar abre el overlay de cubrir. Verificar el vínculo vía MCP Notion.
- [ ] **Step 6: Commit** — `git add index.html && git commit -m "C5: asociar cobro filtrado al cliente + ofrecer reconciliar (C3) tras asociar

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"`

---

### Task A-6: P2 — `{readonly:true}` para el CEO + bump sw v88 + tests + commit final
**Files:** Modify `index.html` (call site CEO ≈:6777) y `sw.js` (`CACHE` :82).
**Interfaces:**
- Consumes el `readonly` que `renderPorCobrar` ya respeta (los botones de A-2/A-3/A-4/A-5 sólo se dibujan si `!readonly`).

- [ ] **Step 1: pasar `{readonly:true}` SÓLO en el call site del CEO (P2).** En `setCEOTab` (`:6777`), cambiar:
  ```js
    else if (tab === 'porcobrar') { _ceoRerender = () => renderPorCobrar('ceo-content', { readonly: true }); await renderPorCobrar('ceo-content', { readonly: true }); }
  ```
  **NO** tocar el call site de Finanzas (`:3932`). El coordinador no tiene tab "Por cobrar" → no hay call site que tocar.
- [ ] **Step 2: confirmar que readonly oculta TODAS las acciones.** Verificar (leer el render de A-2/A-3/A-5) que con
  `readonly`: (a) `sinAsociar`/`cobrosCli` se computan vacíos (`!readonly && …`), (b) el botón "Asignar precio del
  contrato" se condiciona a `!readonly` (A-2 Step 3), (c) los botones "✓ cubre"/"Asociar" viven sólo dentro de bloques
  `!readonly`. Si algún botón quedara fuera de un guard `!readonly`, envolverlo. (Es verificación + posible ajuste menor,
  no código nuevo grande.)
- [ ] **Step 3: bump del service worker v87→v88.** En `sw.js` (`:82`): `const CACHE = 'flyclean-v88';` (confirmar con
  `grep -n "flyclean-v" sw.js` que el valor de partida es `v87`).
- [ ] **Step 4: Verificar sintaxis + smoke.** `cd ~/repos/flyclean-app && npm run check` → "✅ … parsean OK"; luego
  `npm test` → smoke read-only verde (deriva IDs de index.html).
- [ ] **Step 5: Verificar funcional (permisos).** controller Playwright: como **CEO** → tab "Por cobrar" muestra la
  vista por-cliente **sin ningún botón de acción** (solo lectura: sin "Asociar", sin "✓ cubre", sin "Asignar precio",
  sin "Cobros sin asociar"). Tap en el header de cliente puede abrir su ficha (lectura). Como **FINANZAS** → todas las
  acciones presentes. País: Finanzas-UY no ve otro país (ya lo garantiza `recEnPaisNotion`/`finRecEnPais`).
- [ ] **Step 6: Commit final de la Parte A.** `git add index.html sw.js && git commit -m "P2: CEO Por cobrar solo-lectura + bump sw v88 (cierre Parte A C1-C5)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"`
- [ ] **Step 7: NO push.** Avisar al controller que la Parte A está lista para revisión/merge. El controller avisa a
  Diego (dato financiero) y hace el merge/deploy a `main`.

---

## Notas de cierre de la Parte A
- Todas las escrituras (C3 PATCH ingreso, C4 PATCH servicios, C5 PATCH ingreso) van a Notion vía `callNotion` +
  `syncAfterWrite` (envuelto en `typeof`/try-catch por si el flag/función no está). **Append-only respetado:** C3 EDITA
  el cobro existente (no crea cobros nuevos).
- **No se mezclan monedas:** C3 sólo marca cobertura en la moneda del precio; `montoOf` sigue contando el monto real
  por la etiqueta `Moneda cobro`.
- **Plan-antes-de-tocar:** C3 y C4 usan el overlay `por-cobrar-plan-overlay` (sibling de body). C5 usa `confirm` nativo
  para la oferta de reconciliar (acción de bajo riesgo, reversible).
- **Reversibilidad:** desasociar cobro, volver `Monto USD`/`Monto UY$ cobrado` reconciliado a 0 (cubierto=0),
  desvincular la propuesta — todo desde Notion o re-ejecutando.
- **Verificar antes de cada commit:** `npm run check`. Antes del cierre (A-6): `npm test`.


---

# PARTE B — Finanzas operador completo (C6-C7) · sw v88→v89

# PARTE B — Finanzas operador completo (C6 + C7) — Implementation Plan

> **Arranca DESPUÉS de la Parte A (C1–C5).** La Parte A ya dejó construida la vista `renderPorCobrar` **por
> cliente** + `_porCobrarCtx = { containerId, opts }`. La Parte B consume esa vista: agrega botones "editar/archivar/
> eliminar servicio" y "editar cobro" dentro de las tarjetas/filas de cada cliente, y redirige el post-save de vuelta a
> `renderPorCobrar`.
>
> **Sub-skill requerida:** `superpowers:subagent-driven-development` — tarea por tarea, steps con checkbox.
>
> **Archivo único `index.html` → todas las tareas SECUENCIALES.** Verificación tras cada cambio: `npm run check`
> (parseo JS). Antes del deploy: `npm test` (smoke read-only). La verificación funcional con Playwright **en el usuario
> Finanzas** la hace el controller/Diego (necesita login + país). Los implementers NO escriben datos reales en Notion.

## Contrato compartido (heredado del header del plan — recordatorio)
- **Fuente de verdad = Notion.** Toda escritura → Notion (`updateServiceProps`/`callNotion`) + `syncAfterWrite(id,
  resource)` (flag `fc_db_writesync` puede estar OFF; igual se llama). **Append-only en el espejo** (editar, no borrar;
  para anular → archivar/eliminar).
- **NO mezclar monedas.** `montoOf` (`:4351`) usa la etiqueta `Moneda cobro` → el dashboard cuenta la moneda real.
  `MONTO_FIELDS.ingreso` (`:4346`) = `{ moneda:'Moneda cobro', uy:'Monto UY$ cobrado', usd:'Monto USD' }`.
- **País-aware:** Finanzas ve/opera SOLO su país (`recEnPaisNotion` para Servicios/Contactos, `finRecEnPais` para
  Gastos/Ingresos). La Parte A ya filtra la vista; las acciones de B operan sobre filas ya filtradas.
- **Permisos:** todo C6/C7 **SOLO Finanzas**. CEO ve la vista en `readonly` (Parte A pasa `{readonly:true}` en el call
  site del CEO `:6777`); el coordinador NO tiene "Por cobrar". Las acciones de B se renderizan SOLO si `!opts.readonly`.
- **Plan-antes-de-tocar:** archivar/eliminar/editar-fecha-monto pasan por un overlay sibling de `<body>` (patrón
  `report-step-overlay`, `:1430`) que muestra **qué va a pasar** y solo ejecuta al confirmar. **Eliminar = doble
  confirmación** (papelera de Notion, recuperable 30 días).
- **i18n:** la vista Finanzas (alta de ingreso `renderIngresoSheet` `:4119`) usa **strings hardcodeados en español**
  (no `t()`). Para mantener consistencia con esa zona, las cadenas nuevas de C7 (sheet de cobro, Finanzas-only) van
  **hardcodeadas en español**. C6 reusa `openEditSheet`, que YA usa claves `t()` existentes (es+pt-BR) — no se agregan
  claves nuevas salvo las 2 de los botones de la tarjeta (que SÍ se agregan a es + pt-BR porque el sheet de edición es
  multilenguaje).
- **Commits** terminan con `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`. **NO push** — el
  controller hace merge/deploy tras avisar a Diego (es dato financiero).
- **Rama:** `feat/por-cobrar` (local).

## Líneas reales verificadas (post Fases A/B/C de hoy + lectura directa de index.html)
- `openEditSheet(pageId)` `:8645` → `editingService = _coordAllServices.find(s=>s.id===pageId)` `:8646`; si no lo
  encuentra → `if (!editingService) return;` `:8647` (**return silencioso** — el bug que P5 describe). Construye
  `editState` `:8668-8669` con `contactoId` (de `props['Contacto']`/`props['Contactos']`), `clienteNombre:''`,
  `operarioManual: operarioManualActual` `:8655`. Botón eliminar `delete-svc-btn`: se OCULTA si Completado `:8684-8690`.
  Al final llama `renderSvcClienteUbicacion()` `:8752` + `resolveSvcUbicacion(pageId)` `:8753` (usan `editState.contactoId`
  para traer cliente/Maps).
- `saveServiceEdit()` `:9155` → arma `props`, `await updateServiceProps(editingService.id, props)` `:9184`,
  `syncAfterWrite(...,'servicios')` `:9185`, `closeEditSheet()` `:9186`, **`await renderCoordServicios()`** `:9187`
  (re-render al panel coordinador). Escribe `Operario manual` `:9175`.
- `deleteService()` `:9194` → bloqueo `if (estado.includes('Completado')) { alert(...); return; }` `:9198-9201`;
  doble: `confirm(...)` `:9203`; archiva `callNotion('pages/'+id,'PATCH',{ in_trash:true })` `:9209`; luego
  `closeEditSheet()` + **`await renderCoordServicios()`** `:9210-9211`.
- `closeEditSheet()` `:9135` → cierra `edit-overlay`, `editingService = null`.
- `report-step-overlay` (overlay sibling de body) `:1430` — patrón de "plan antes de ejecutar". Funciones
  `openReportStep`/`renderReportStep`/`closeReportStep`/`reportStepOverlayClick` `:9267-9327`.
- Alta de ingreso (patrón a reusar en C7): `ingreso-sheet` (overlay sibling, `:1409`), `ingresoState` `:4090`,
  `openNuevoIngresoSheet()` `:4101`, `renderIngresoSheet()` `:4119`, `saveIngreso()` `:4152`, `closeIngresoSheet()`
  `:4092`. Guarda `Moneda cobro`/`Monto UY$ cobrado`|`Monto USD`/`Fecha`/`Servicio vinculado`/`Cuenta`/`Cliente`
  `:4162-4176`. `_ingresosCache = null` + re-render `renderIngresosList()` al guardar `:4179-4181`.
- `recEnPaisNotion` `:2993`, `finRecEnPais` `:2984`, `updateServiceProps` `:3572`, `syncAfterWrite` `:3487`,
  `MONTO_FIELDS`/`montoOf` `:4346-4366`, `TC aplicado`/`TC usado` lectura `:6855`.
- Usuario Finanzas: `USERS` entry `{ id:'finanzas-uy', name:'Finanzas', role:'📊 Administración', country:'Uruguay' }`
  `:1656`. Detección de rol Finanzas = `currentUser?.role?.includes('Administración')` (es la convención existente para
  el panel Finanzas).
- `sw.js` `CACHE = 'flyclean-v87'` `:82` → Parte A lo deja en `v88` → **Parte B bumpea v88→v89**.
- npm scripts: `check` = `node tests/check-html.mjs`, `test` = `node tests/smoke.mjs` (`package.json:11-12`).

---

## Task B-1: C6 — abrir el sheet de edición de servicio desde Finanzas (cablear contexto)

**Files:** Modify `index.html` (nueva función `openEditSheetFromFinanzas(svcId)` insertada justo ANTES de
`openEditSheet` `:8645`; tocar `openEditSheet` solo si hace falta el fallback). También botón en la fila de visita de
`renderPorCobrar` (vista Parte A).

**Interfaces:**
- Consumes (de Parte A): `renderPorCobrar` por-cliente (cada fila de visita lleva `s.id` y `clienteId` — P1), `_porCobrarCtx`.
- Produces: `openEditSheetFromFinanzas(svcId)`, y un flag global `_editFromPorCobrar` (bool) para que `saveServiceEdit`/
  `deleteService` sepan a dónde re-renderizar (Task B-3).

- [ ] **Step 1 — función nueva que puebla `editingService` directo (resuelve P5).** El flujo Finanzas→Por cobrar NO
  puebla `_coordAllServices`, así que `openEditSheet` haría `return` silencioso. La función nueva busca el objeto del
  servicio en la data que la Parte A ya cargó. La Parte A guarda los servicios cargados en un cache accesible; si no
  expone uno, re-fetchear la página por id (barato, 1 sola página). Insertar antes de `openEditSheet` (`:8645`):

  ```js
  // Abre el sheet de edición del servicio desde el flujo Finanzas→"Por cobrar".
  // openEditSheet() depende de _coordAllServices.find(...), que NO se puebla en Finanzas → haría return
  // silencioso. Acá poblamos editingService con el objeto del servicio directo (P5) y cableamos el contexto
  // de cliente para que renderSvcClienteUbicacion/resolveSvcUbicacion funcionen, ANTES de delegar en
  // openEditSheet por su id (que ya lo encontrará en editingService).
  let _editFromPorCobrar = false; // dónde re-renderizar al cerrar (true = Por cobrar, false = panel coord)
  async function openEditSheetFromFinanzas(svcId) {
    if (currentUser?.role && !currentUser.role.includes('Administración')) return; // solo Finanzas opera
    let svc = (Array.isArray(_coordAllServices) ? _coordAllServices : []).find(s => s.id === svcId);
    if (!svc) {
      try { svc = await callNotion('pages/' + svcId, 'GET'); } catch (e) { alert('No se pudo abrir el servicio: ' + (e.message || e)); return; }
    }
    if (!svc) return;
    editingService = svc;            // P5: poblar editingService directo (openEditSheet lo reusa por id)
    _editFromPorCobrar = true;       // B-3 redirige el post-save a renderPorCobrar
    await openEditSheet(svcId);
  }
  ```

  Nota P5: `openEditSheet` arranca con `editingService = _coordAllServices.find(...)`. Para que NO pise el objeto que
  acabamos de setear, modificar esa línea (`:8646-8647`) a:

  ```js
  async function openEditSheet(pageId) {
    // Si ya viene poblado (flujo Finanzas→Por cobrar) lo respetamos; si no, lo buscamos en la lista del coord.
    if (!(editingService && editingService.id === pageId)) {
      editingService = _coordAllServices.find(s => s.id === pageId);
    }
    if (!editingService) return;
  ```

  Esto NO rompe el flujo coordinador (cuando entra por coord, `editingService` está vacío o es otro id → cae al
  `find`). Y `editState` `:8668` ya inicializa `contactoId` desde `props['Contacto']`/`props['Contactos']` +
  `operarioManual: operarioManualActual` `:8655` → P5 (contacto + operario manual) **queda cubierto sin tocar nada
  más**, porque `openEditSheet` ya lee esos props del `editingService` que poblamos.

- [ ] **Step 2 — botón "✏️ editar" en cada fila de visita de la tarjeta de cliente (Parte A).** En `renderPorCobrar`,
  dentro del HTML de cada visita (la Parte A produce `rowHTML(r)` con `r.id`), agregar — SOLO si `!readonly` — un botón:

  ```js
  // dentro de rowHTML(r), en el bloque de acciones contextuales (solo Finanzas):
  (!readonly && r.id ? '<button type="button" class="fin-svc-link" onclick="openEditSheetFromFinanzas(\'' + r.id + '\')">✏️ ' + t('porcobrar.editsvc') + '</button>' : '')
  ```

  Reusa la clase `.fin-svc-link` (ya existe, usada en `asociarHTML` `:7399`). Si la Parte A no expone `rowHTML` con
  acciones, agregar el botón en el contenedor de acciones que la Parte A definió por visita (C2 del spec lista
  "reconciliar, asociar, editar, archivar/eliminar" como acciones de la visita).

- [ ] **Step 3 — claves i18n nuevas (es + pt-BR).** Agregar en el objeto `es` (cerca de otras claves `sheet.edit.*`,
  ~`:2255`) y en `pt-BR` (~`:2259+`):
  ```js
  'porcobrar.editsvc': 'editar',          // es
  'porcobrar.editsvc': 'editar',          // pt-BR (igual; verbo corto)
  ```

- [ ] **Step 4: Verificar sintaxis** — `npm run check` → debe imprimir "✅ ... parsean OK".

- [ ] **Step 5: Verificar funcional (controller, usuario FINANZAS)** — login Finanzas-UY → tab "Por cobrar" → en una
  tarjeta de cliente, tocar "✏️ editar" en una visita → se abre el sheet de edición con el nombre, la fecha y el estado
  del servicio cargados, y abajo aparece el bloque Cliente (nombre resuelto) — NO un sheet vacío. Confirma que P5 está
  cableado (no hay `return` silencioso). (Read-only: solo abrir, cerrar con ×, NO guardar.)

- [ ] **Step 6: Commit** — `git commit -m "feat(porcobrar): C6 abrir sheet de edición de servicio desde Finanzas (P5: poblar editingService directo)\n\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"`

---

## Task B-2: C6 — Archivar / Eliminar servicio desde Finanzas (relajar bloqueo "Completado", overlay de plan)

**Files:** Modify `index.html` — `openEditSheet` (mostrar botones para Finanzas aunque sea Completado, `:8684-8690`),
`deleteService` (`:9194`, relajar bloqueo + doble confirm de papelera), y un nuevo botón "Archivar" en el sheet de
edición (HTML `:1322` zona del `delete-svc-btn`).

**Interfaces:**
- Consumes: `editingService`, `_editFromPorCobrar` (B-1), `recEnPaisNotion`, `updateServiceProps`, `syncAfterWrite`,
  `callNotion`.
- Produces: `archivarServicioFinanzas()`, y `deleteService` relajado para Finanzas.

- [ ] **Step 1 — botón "Archivar" en el sheet de edición (HTML).** Junto al `delete-svc-btn` (`:1322`), agregar:
  ```html
  <button class="delete-svc-btn" id="archive-svc-btn" style="display:none;border-color:var(--text3);color:var(--text3)" onclick="archivarServicioFinanzas()">🗄️ Archivar servicio</button>
  ```
  (Reusa `.delete-svc-btn` para el estilo; lo distinguimos por color gris = acción reversible, default.)

- [ ] **Step 2 — mostrar Archivar/Eliminar para Finanzas aunque sea Completado (relajar bloqueo, P5).** En
  `openEditSheet`, donde hoy se oculta el botón eliminar para Completado (`:8684-8690`), reemplazar por lógica
  consciente de rol:
  ```js
  const esFin = !!(currentUser?.role && currentUser.role.includes('Administración'));
  const isCompletado = estadoActual.includes('Completado');
  const delBtn = document.getElementById('delete-svc-btn');
  if (delBtn) {
    // Coord/Dirección: NO eliminar completados (histórico). Finanzas: SÍ puede (con papelera + confirm).
    delBtn.style.display = (isCompletado && !esFin) ? 'none' : '';
    delBtn.textContent = '🗑️ ' + t('sheet.edit.delete');
    delBtn.disabled = false;
  }
  const archBtn = document.getElementById('archive-svc-btn');
  if (archBtn) { archBtn.style.display = esFin ? '' : 'none'; archBtn.disabled = false; }
  ```

- [ ] **Step 3 — `archivarServicioFinanzas()` con overlay de plan (sibling de body, reversible).** Insertar después de
  `deleteService` (`:9216`). Archivar = `🗄️ Archivado = true` (reversible vía Desarchivar de Dirección, `unarchive`
  `:5694`). Usa `confirm` (acción reversible, no requiere doble confirm; el spec exige doble confirm SOLO para
  eliminar). El "plan antes de tocar" para archivar = el texto del `confirm`:
  ```js
  async function archivarServicioFinanzas() {
    if (!editingService) return;
    if (!(currentUser?.role && currentUser.role.includes('Administración'))) return;
    const p = editingService.properties || {};
    const nombre = p['Nombre del servicio']?.title?.[0]?.plain_text || t('common.sinnombre');
    if (!confirm('Vas a ARCHIVAR "' + nombre + '".\n\nSale de "Por cobrar" pero NO se borra — Dirección lo puede desarchivar cuando quiera. ¿Confirmás?')) return;
    const btn = document.getElementById('archive-svc-btn');
    if (btn) { btn.textContent = '⏳ Archivando…'; btn.disabled = true; }
    try {
      await updateServiceProps(editingService.id, { '🗄️ Archivado': { checkbox: true } });
      syncAfterWrite(editingService.id, 'servicios');
      closeEditSheet();
      if (_editFromPorCobrar && _porCobrarCtx) { _editFromPorCobrar = false; await renderPorCobrar(_porCobrarCtx.containerId, _porCobrarCtx.opts); }
      else await renderCoordServicios();
    } catch (e) {
      if (btn) { btn.textContent = '🗄️ Archivar servicio'; btn.disabled = false; }
      alert('No se pudo archivar: ' + (e.message || e));
    }
  }
  ```

- [ ] **Step 4 — relajar `deleteService` para Finanzas + redirigir el post-delete (P5).** Modificar `deleteService`
  (`:9194-9216`):
  ```js
  async function deleteService() {
    if (!editingService) return;
    const props = editingService.properties || {};
    const estado = props['Estado']?.select?.name || '';
    const esFin = !!(currentUser?.role && currentUser.role.includes('Administración'));
    // Coord/Dirección: NO eliminar completados (histórico inmutable). Finanzas: SÍ (papelera Notion, recuperable 30 días).
    if (estado.includes('Completado') && !esFin) { alert(t('sheet.edit.delete.blocked.completed')); return; }
    const nombre = props['Nombre del servicio']?.title?.[0]?.plain_text || t('common.sinnombre');
    // Doble confirmación (papelera de Notion).
    if (!confirm(t('sheet.edit.delete.confirm').replace('{name}', nombre))) return;
    if (esFin && !confirm('Confirmá de nuevo: "' + nombre + '" se va a la PAPELERA de Notion (recuperable 30 días). ¿Eliminar?')) return;
    const btn = document.getElementById('delete-svc-btn');
    if (btn) { btn.textContent = '⏳ ' + t('sheet.edit.deleting'); btn.disabled = true; }
    try {
      await callNotion('pages/' + editingService.id, 'PATCH', { in_trash: true });
      syncAfterWrite(editingService.id, 'servicios');
      closeEditSheet();
      if (_editFromPorCobrar && _porCobrarCtx) { _editFromPorCobrar = false; await renderPorCobrar(_porCobrarCtx.containerId, _porCobrarCtx.opts); }
      else await renderCoordServicios();
    } catch (e) {
      if (btn) { btn.textContent = '🗑️ ' + t('sheet.edit.delete'); btn.disabled = false; }
      alert(t('sheet.edit.delete.error') + ' ' + e.message);
    }
  }
  ```
  Nota: para el coordinador/Dirección NO cambia nada (sigue bloqueado para Completado, 1 sola confirmación). El segundo
  `confirm` y el `in_trash` con papelera solo aplican a Finanzas. Se agregó `syncAfterWrite` que faltaba en el original.

- [ ] **Step 5: Verificar sintaxis** — `npm run check` → "✅ ... parsean OK".

- [ ] **Step 6: Verificar funcional (controller, FINANZAS)** — Para NO mutar datos reales, verificar en Notion MCP que
  el servicio de prueba pueda archivarse/restaurarse, o usar un servicio descartable. Flujo: Por cobrar → editar una
  visita Completada → ver botón "🗄️ Archivar" y "🗑️ Eliminar" (ambos visibles para Finanzas; el coord NO los ve en
  completados). Archivar → la visita desaparece de "Por cobrar" y la vista re-renderiza ahí mismo (no salta al panel
  coord). Eliminar pide DOS confirmaciones. Restaurar luego desde Notion / Panel Limpieza (Dirección, `unarchive`).

- [ ] **Step 7: Commit** — `git commit -m "feat(porcobrar): C6 archivar/eliminar servicio desde Finanzas (relajar bloqueo Completado, papelera + doble confirm, redirige a Por cobrar)\n\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"`

---

## Task B-3: C6 — redirigir el post-save de `saveServiceEdit` a "Por cobrar" desde Finanzas

**Files:** Modify `index.html` — `saveServiceEdit` (`:9155`, el re-render final `:9187`).

**Interfaces:**
- Consumes: `_editFromPorCobrar` (B-1), `_porCobrarCtx`, `renderPorCobrar`, `editState.operarioManual`.
- Produces: nada nuevo (ajuste de comportamiento).

- [ ] **Step 1 — redirigir el re-render final (P5).** En `saveServiceEdit`, reemplazar `closeEditSheet(); await
  renderCoordServicios();` (`:9186-9187`) por:
  ```js
      await updateServiceProps(editingService.id, props);
      syncAfterWrite(editingService.id, 'servicios');
      closeEditSheet();
      if (_editFromPorCobrar && _porCobrarCtx) { _editFromPorCobrar = false; await renderPorCobrar(_porCobrarCtx.containerId, _porCobrarCtx.opts); }
      else await renderCoordServicios();
  ```
  Esto mantiene intacto el flujo coordinador (cuando `_editFromPorCobrar` es `false`).

- [ ] **Step 2 — NO pisar `Operario manual` con null (P5).** `saveServiceEdit` `:9175` escribe
  `props['Operario manual'] = editState.operarioManual ? {...} : { select: null }`. Como `openEditSheet` `:8655`/`:8668`
  YA inicializa `editState.operarioManual = operarioManualActual` (leído del servicio), al abrir desde Finanzas (vía
  `editingService` poblado en B-1) ese valor está bien cargado → guardar NO lo pisa con null. **Verificación explícita:**
  confirmar leyendo que `editState.operarioManual` no se sobreescribe entre `openEditSheet` y `saveServiceEdit` en el
  flujo Finanzas (no hay `selectOperarioManual` involucrado si el usuario no toca ese campo). No requiere código nuevo;
  es un check de no-regresión. Si la lectura revela que `editState` se reinicia en algún punto del flujo Finanzas,
  agregar en `openEditSheetFromFinanzas` (B-1) un guard que preserve `operarioManual` tras `openEditSheet`.

- [ ] **Step 3: Verificar sintaxis** — `npm run check` → "✅ ... parsean OK".

- [ ] **Step 4: Verificar funcional (controller, FINANZAS)** — Por cobrar → editar una visita → cambiar la **fecha del
  servicio** (o el nombre) → Guardar → el sheet cierra y la vista vuelve a **"Por cobrar"** (no al panel coord) con el
  dato actualizado. En Notion MCP: confirmar que `Fecha programada` cambió y que `Operario manual` quedó IGUAL (no se
  borró). Revertir el cambio de prueba.

- [ ] **Step 5: Commit** — `git commit -m "feat(porcobrar): C6 redirigir post-save a Por cobrar desde Finanzas (preserva Operario manual)\n\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"`

---

## Task B-4: C7 — sheet de edición de cobro (`openCobroSheet`) — reusa overlay + patrón del alta de ingreso

**Files:** Modify `index.html` — nuevo overlay `cobro-sheet` (HTML, junto a `ingreso-overlay` `:1409`), y nuevas
funciones `openCobroSheet`/`renderCobroSheet`/`closeCobroSheet`/`cobroSetServicio` (insertar después de `saveIngreso`
`:4186`). Botón "✏️ editar cobro" en la sección "cobros sin asociar / cobros del cliente" de `renderPorCobrar`.

**Interfaces:**
- Consumes (de Parte A): `renderPorCobrar` por-cliente (cobros del cliente con su `ing.id`), `_porCobrarCtx`,
  `MONTO_FIELDS.ingreso`, `montoOf`, `recEnPaisNotion`/`finRecEnPais`.
- Produces: `openCobroSheet(ingId)`, `cobroState`, `renderCobroSheet`, `saveCobroEdit` (ver B-5).

- [ ] **Step 1 — overlay HTML (sibling de body, patrón `ingreso-overlay` `:1409`).** Insertar tras el cierre del
  `ingreso-overlay`:
  ```html
  <!-- Editar un cobro existente (Finanzas). Sibling de body como el resto de overlays. -->
  <div class="edit-overlay" id="cobro-overlay" onclick="cobroOverlayClick(event)">
    <div class="edit-sheet" id="cobro-sheet">
      <button class="sheet-close-btn" type="button" aria-label="Cerrar" onclick="closeCobroSheet()">×</button>
      <div class="edit-sheet-handle"></div>
      <div class="edit-sheet-header">
        <div class="edit-sheet-title">✏️ Editar cobro</div>
        <div class="edit-sheet-sub">Corregí fecha, monto, moneda o el servicio vinculado.</div>
      </div>
      <div id="cobro-sheet-body" style="padding:0 0 24px"></div>
    </div>
  </div>
  ```

- [ ] **Step 2 — `openCobroSheet(ingId)` carga el cobro + servicios del país (reusa el patrón de
  `openNuevoIngresoSheet` `:4101`).** Insertar tras `saveIngreso` (`:4186`):
  ```js
  let cobroState = null;
  function cobroOverlayClick(e) { if (e.target?.id === 'cobro-overlay') closeCobroSheet(); }
  function closeCobroSheet() { document.getElementById('cobro-overlay')?.classList.remove('open'); cobroState = null; }
  async function openCobroSheet(ingId) {
    if (currentUser?.role && !currentUser.role.includes('Administración')) return; // solo Finanzas
    document.getElementById('cobro-overlay')?.classList.add('open');
    cobroState = { saving: true, loading: true, servicios: [], ing: null, form: null };
    renderCobroSheet();
    try {
      const [page, svc] = await Promise.all([
        callNotion('pages/' + ingId, 'GET'),
        callNotion(`databases/${DB_ID}/query`, 'POST', {})
      ]);
      if (!cobroState) return;
      const p = page.properties || {};
      const { moneda } = montoOf(p, 'ingreso');                  // etiqueta real del cobro
      const montoReal = (moneda === '🇺🇾 UY$') ? (p['Monto UY$ cobrado']?.number || 0) : (p['Monto USD']?.number || 0);
      cobroState.ing = page;
      cobroState.servicios = (svc.results || []).filter(recEnPaisNotion);
      cobroState.form = {
        id: ingId,
        fecha: p['Fecha']?.date?.start ? p['Fecha'].date.start.slice(0, 10) : '',
        moneda,                                                  // 🇺🇸 USD | 🇺🇾 UY$
        monto: montoReal,                                        // monto REAL en la moneda etiquetada (C7 ≠ C3)
        servicioId: (p['Servicio vinculado']?.relation || [])[0]?.id || '',
        clienteId: (p['Cuenta']?.relation || [])[0]?.id || '',
        tc: p['TC aplicado']?.number ?? null,                    // se re-deriva/limpia al guardar (P6)
      };
      cobroState.saving = false; cobroState.loading = false;
      renderCobroSheet();
    } catch (e) {
      if (cobroState) { cobroState.loading = false; cobroState.saving = false; }
      const b = document.getElementById('cobro-sheet-body');
      if (b) b.innerHTML = '<div class="coord-empty" style="padding:20px">No se pudo cargar el cobro: ' + esc(e.message || String(e)) + '</div>';
    }
  }
  function cobroSetServicio(id) { if (cobroState?.form) { cobroState.form.servicioId = id; } }
  ```
  Nota: el monto que se muestra/edita es **el real** (en `Moneda cobro`), no el reconciliado de C3 — el spec los
  distingue (P6). `TC aplicado` se carga solo para re-derivarlo/limpiarlo en B-5; el sheet C7 NO expone reconciliación.

- [ ] **Step 3 — `renderCobroSheet()` (clon de `renderIngresoSheet` `:4119`, campos: Servicio, Moneda, Monto, Fecha).**
  ```js
  function renderCobroSheet() {
    const body = document.getElementById('cobro-sheet-body');
    if (!body || !cobroState) return;
    const s = cobroState, f = s.form;
    if (s.loading || !f) { body.innerHTML = '<div style="text-align:center;padding:40px 0"><div class="spinner" style="margin:0 auto"></div></div>'; return; }
    if (s.saving) { body.innerHTML = '<div style="text-align:center;padding:40px 0"><div class="spinner" style="margin:0 auto"></div><div style="margin-top:10px;color:var(--text3)">Guardando…</div></div>'; return; }
    const svcTit = sv => sv.properties?.['Nombre del servicio']?.title?.[0]?.plain_text || '(servicio)';
    const norm = x => (x || '').replace(/-/g, '');
    // Servicios del cliente del cobro primero (si hay Cuenta); el resto después.
    const delCliente = f.clienteId ? s.servicios.filter(sv => (sv.properties?.['Contacto']?.relation || []).some(r => norm(r.id) === norm(f.clienteId))) : [];
    const ids = new Set(delCliente.map(x => x.id));
    const resto = s.servicios.filter(sv => !ids.has(sv.id));
    const opt = sv => '<option value="' + esc(sv.id) + '"' + (f.servicioId === sv.id ? ' selected' : '') + '>' + esc(svcTit(sv)) + '</option>';
    const svcOpts = '<option value="">— Sin servicio —</option>' + delCliente.map(opt).join('') + (delCliente.length && resto.length ? '<option value="" disabled>────────</option>' : '') + resto.map(opt).join('');
    const monedas = ['🇺🇸 USD', '🇺🇾 UY$'];
    body.innerHTML =
      `<div class="edit-section"><div class="edit-section-label">Servicio vinculado</div>
         <select class="finanzas-filter-select" style="width:100%" onchange="cobroSetServicio(this.value)">${svcOpts}</select></div>` +
      `<div class="edit-section"><div class="edit-section-label">Moneda</div><div class="estado-btns">${monedas.map(m => `<button class="estado-btn ${f.moneda === m ? 'active' : ''}" onclick="cobroState.form.moneda='${m}';renderCobroSheet()">${m}</button>`).join('')}</div></div>` +
      `<div class="edit-section"><div class="edit-section-label">Monto cobrado (real)</div><input type="number" inputmode="decimal" class="edit-date-input" value="${f.monto || ''}" oninput="cobroState.form.monto=parseFloat(this.value)||0" placeholder="0"/></div>` +
      `<div class="edit-section"><div class="edit-section-label">Fecha de cobro</div><input type="date" class="edit-date-input" value="${esc(f.fecha)}" oninput="cobroState.form.fecha=this.value"/></div>` +
      `<div style="padding:0 16px 4px;font-size:11px;color:var(--text3)">El monto es lo que entró de verdad, en su moneda. (La cobertura cruzada de un servicio en otra moneda se hace con "✓ cubre este servicio".)</div>` +
      `<div style="padding:14px 16px"><button class="edit-save-btn" style="width:100%" onclick="saveCobroEdit()">💾 Guardar cambios</button></div>`;
  }
  ```

- [ ] **Step 4 — botón "✏️ editar cobro" en la tarjeta de cliente (Parte A).** En `renderPorCobrar`, donde la Parte A
  lista los cobros del cliente (sección de cobros del cliente / cobros sin asociar), agregar — SOLO si `!readonly` —
  junto al botón "Asociar" existente (`:7399`):
  ```js
  (!readonly ? '<button class="fin-svc-link" style="white-space:nowrap" onclick="openCobroSheet(\'' + i.id + '\')">✏️</button>' : '')
  ```

- [ ] **Step 5: Verificar sintaxis** — `npm run check` → "✅ ... parsean OK".

- [ ] **Step 6: Verificar funcional (controller, FINANZAS)** — Por cobrar → en un cobro de un cliente, tocar "✏️" → se
  abre el sheet con fecha/monto/moneda/servicio del cobro ya cargados; el dropdown de servicio muestra primero los del
  cliente. (Read-only: abrir y cerrar con ×, sin guardar todavía — el guardado se prueba en B-5.)

- [ ] **Step 7: Commit** — `git commit -m "feat(porcobrar): C7 sheet de edición de cobro (openCobroSheet) reusa patrón de alta de ingreso\n\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"`

---

## Task B-5: C7 — guardar el cobro editado (`saveCobroEdit`) — limpiar la otra moneda + re-derivar/limpiar TC (P6)

**Files:** Modify `index.html` — nueva función `saveCobroEdit` (insertar tras `renderCobroSheet`, dentro del bloque
C7 de B-4).

**Interfaces:**
- Consumes: `cobroState`, `MONTO_FIELDS.ingreso`, `_porCobrarCtx`, `renderPorCobrar`, `callNotion`, `syncAfterWrite`,
  `_ingresosCache`.
- Produces: `saveCobroEdit()`.

- [ ] **Step 1 — guardar con limpieza de la otra moneda + TC (P6).** `MONTO_FIELDS.ingreso` setea `Monto UY$ cobrado` O
  `Monto USD` según moneda pero **nunca limpia el otro** → al cambiar moneda/monto queda contaminado. C7 escribe el
  monto en el campo de su moneda **y limpia el otro** (`{ number: null }`), y re-deriva o limpia `TC aplicado`:
  ```js
  async function saveCobroEdit() {
    if (!cobroState || cobroState.saving || !cobroState.form) return;
    const f = cobroState.form;
    if (!f.monto || f.monto <= 0) { alert('Ingresá un monto mayor a 0.'); return; }
    if (!f.fecha) { alert('Ingresá la fecha del cobro.'); return; }
    cobroState.saving = true; renderCobroSheet();
    const esUY = f.moneda === '🇺🇾 UY$';
    const props = {
      'Fecha': { date: { start: f.fecha } },
      'Moneda cobro': { select: { name: f.moneda } },
    };
    // P6: escribir el campo de la moneda real y LIMPIAR el de la otra moneda (que MONTO_FIELDS nunca limpia).
    if (esUY) {
      props['Monto UY$ cobrado'] = { number: f.monto };
      props['Monto USD'] = { number: null };
    } else {
      props['Monto USD'] = { number: f.monto };
      props['Monto UY$ cobrado'] = { number: null };
    }
    // P6: el monto real cambió → el TC aplicado viejo (de una reconciliación C3 previa) ya no aplica → limpiarlo.
    // (La reconciliación cross-moneda C3 lo vuelve a derivar si hace falta; C7 ≠ C3.)
    props['TC aplicado'] = { number: null };
    // Servicio vinculado (relación). Vaciar = desvincular.
    props['Servicio vinculado'] = f.servicioId ? { relation: [{ id: f.servicioId }] } : { relation: [] };
    try {
      await callNotion('pages/' + f.id, 'PATCH', { properties: props });
      syncAfterWrite(f.id, 'ingresos');
      _ingresosCache = null;        // invalida la lista de Finanzas
      closeCobroSheet();
      if (_porCobrarCtx) await renderPorCobrar(_porCobrarCtx.containerId, _porCobrarCtx.opts);
    } catch (e) {
      if (cobroState) { cobroState.saving = false; renderCobroSheet(); }
      alert('No se pudo guardar el cobro: ' + (e.message || e));
    }
  }
  ```
  **Decisión de diseño (P6 / spec):** al editar el monto REAL (C7) limpiamos `TC aplicado` SIEMPRE — porque un TC viejo
  quedó derivado del monto anterior y mezclarlo daría una cobertura falsa. La reconciliación cross-moneda (C3, botón
  "✓ cubre este servicio" de la Parte A) es la única que vuelve a setear `Monto USD`/`Monto UY$ cobrado` "equivalente"
  + `TC aplicado`. **Append-only:** se EDITA el cobro existente (no se crea ni borra); para anular un cobro → archivar/
  eliminar el servicio o desvincular.

- [ ] **Step 2: Verificar sintaxis** — `npm run check` → "✅ ... parsean OK".

- [ ] **Step 3: Verificar funcional (controller, FINANZAS — usar un cobro de PRUEBA, reversible en Notion)** —
  Caso A (cambio de moneda): cobro etiquetado USD con `Monto USD=100` → editar a UY$ con monto 4000 → Guardar. En Notion
  MCP confirmar: `Moneda cobro=🇺🇾 UY$`, `Monto UY$ cobrado=4000`, **`Monto USD` quedó vacío** (P6: la otra moneda se
  limpió), `TC aplicado` vacío. La vista "Por cobrar" re-renderiza ahí mismo.
  Caso B (sin doble-conteo): el dashboard Finanzas sigue contando la moneda real vía `montoOf` (etiqueta manda) — sin
  doble conteo. Revertir el cobro de prueba a su estado original.

- [ ] **Step 4: Commit** — `git commit -m "feat(porcobrar): C7 guardar cobro editado limpiando la otra moneda + reseteando TC aplicado (P6)\n\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"`

---

## Task B-6: Cierre — bump SW v88→v89, smoke test, commit (NO push)

**Files:** Modify `sw.js` (`CACHE` `:82`).

**Interfaces:** ninguna (cierre de la Parte B).

- [ ] **Step 1 — confirmar el valor real de `CACHE` antes de bumpear.** `grep -n "const CACHE" sw.js`. La Parte A lo
  dejó en `'flyclean-v88'`. Bumpear a `'flyclean-v89'`:
  ```js
  const CACHE = 'flyclean-v89';
  ```
  Si la Parte A NO corrió o `CACHE` no es `v88`, AJUSTAR: la Parte B siempre deja `CACHE` = (valor actual + 1). Agregar
  además una línea de comentario de changelog arriba del `const CACHE` (estilo de las líneas `// vNN: ...` existentes):
  ```js
  // v89: Por cobrar Parte B — Finanzas opera servicios (editar/archivar/eliminar) y cobros (editar) desde Por cobrar.
  ```

- [ ] **Step 2: Verificar sintaxis** — `npm run check` → "✅ ... parsean OK".

- [ ] **Step 3: Smoke test read-only** — `npm test` (`node tests/smoke.mjs`) → debe pasar (deriva IDs de `index.html`,
  no escribe Notion).

- [ ] **Step 4: Verificar funcional integral (controller, FINANZAS + CEO)** —
  - Finanzas-UY: Por cobrar opera completo (editar/archivar/eliminar servicio + editar cobro); todo re-renderiza en Por
    cobrar.
  - CEO: Por cobrar en `readonly` (Parte A) → NO aparecen los botones "✏️ editar"/"🗄️ Archivar"/"🗑️ Eliminar"/"✏️
    editar cobro" (todos gateados por `!readonly` + `role.includes('Administración')`).
  - País: Finanzas-UY no ve ni opera servicios/cobros de otro país (heredado de Parte A + `recEnPaisNotion`/`finRecEnPais`).

- [ ] **Step 5: Commit (NO push)** — `git add sw.js && git commit -m "chore(sw): bump cache v88→v89 (Por cobrar Parte B)\n\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"`.
  **NO hacer push ni merge** — el controller avisa a Diego (dato financiero) y hace el merge/deploy a `main`.

---

## Notas de riesgo / dudas para el controller

1. **Dependencia fuerte de la Parte A (P1).** B-1/B-4 asumen que las filas de visita de la nueva `renderPorCobrar`
   exponen `r.id` (servicio) y que los cobros del cliente exponen `i.id`, y que existe un contenedor de "acciones por
   visita / por cobro" donde insertar los botones. Si la Parte A nombró distinto el helper de fila (no `rowHTML`) o no
   dejó un slot de acciones, el implementer de B debe ubicar el punto de inserción real leyendo la `renderPorCobrar`
   final (los snippets de B son el contenido del botón, no su ubicación exacta). **Recomendado:** ejecutar la Parte A
   primero y releer `renderPorCobrar` antes de B-1.

2. **`_coordAllServices` puede no estar poblado en Finanzas** → B-1 cae al `callNotion('pages/'+id,'GET')` (1 request).
   Es barato y correcto. Si la Parte A ya guarda los servicios cargados en un cache propio (ej. `_porCobrarSvcCache`),
   preferir leerlo de ahí para ahorrar el fetch (optimización, no bloqueante).

3. **Detección de rol Finanzas = `role.includes('Administración')`** (el USERS de Finanzas tiene `role: '📊
   Administración'`). Confirmado en `:1656`. Si la Parte A introdujo un helper `esFinanzas()`, reusarlo en B en vez de
   repetir el `.includes`.

4. **TC aplicado se limpia SIEMPRE al editar el monto real (C7).** Es una decisión deliberada (P6): C7 = pago real,
   C3 = cobertura/equivalencia. Un TC derivado del monto anterior, mezclado con un monto nuevo, daría cobertura falsa.
   Si Diego quiere conservar el TC en algún caso, es un follow-up (no entra acá).

5. **No se toca `saveIngreso`/alta de ingreso** — C7 es un sheet SEPARADO (`cobro-overlay`) para no contaminar el alta.
   El alta sigue como está (ya limpia implícitamente porque crea una página nueva).
