# Spec — "Por cobrar" rediseñada + Finanzas operador completo

**Fecha:** 2026-06-29 · **Estado:** aprobado por Diego · Resuelve "Por cobrar" en el **usuario Finanzas** primero y lo deja perfecto, dándole flexibilidad total de cobranza + CRM.

## Objetivo y contexto

Hoy "Por cobrar" (`renderPorCobrar` en `index.html` ~7095) lista cada visita completada por separado y la marca 🔴 si `cobrado < precio` **en la moneda del precio**. Cuatro fricciones reales (caso testigo **Hospital Británico**):
1. **Descalce de moneda:** un servicio en **USD** pagado en **pesos** queda 🔴 aunque esté pago, porque la app no mezcla monedas (hubo que cargar el equivalente USD a mano).
2. **Asociar un cobro a un servicio** existe (`asociarCobro` ~7214) pero es poco intuitivo y no ayuda con monto/moneda.
3. **Contratos recurrentes:** visitas con cobros pero **sin propuesta vinculada** → sin precio → invisibles (sección "FALTA VINCULAR PROPUESTA", sin herramienta para arreglarlo). Varios cobros en **$0 sin monto**.
4. **El 🔴 debe significar "de verdad falta plata"**, no "está en otra moneda".

**Decisión estratégica de Diego:** el usuario **Finanzas** debe ser un **operador completo de cobranza + CRM** (flexibilidad absoluta), no una vista limitada. Como Notion sigue siendo la base y **la app refleja lo que se edita en Notion** (lee de Notion; espejo Supabase apagado para lecturas), las dos cosas conviven.

**Fuente de verdad = Notion.** Reglas: **mostrar el plan antes de tocar datos** · **archivar por defecto, eliminar solo a propósito** · **país-aware** · **no romper los números existentes** (reusar los cálculos actuales) · append-only en el espejo.

## Alcance

**Parte A — "Por cobrar" rediseñada (por cliente/contrato):**
1. Vista **por cliente**: una tarjeta por cliente con su contrato y sus visitas adentro.
2. **Reconciliar monedas en 1 toque** ("✓ cubre este servicio") — TC derivado del pago real.
3. **Asignar el precio del contrato a las visitas** (la app sugiere, Diego confirma en bloque).
4. **Asociar cobros** más fácil (filtrado al cliente, pre-selección si hay una sola visita).

**Parte B — Finanzas operador completo** (desde la misma vista / fichas):
5. **Editar servicios**: nombre, **fecha del servicio**, estado.
6. **Sacar un servicio**: **Archivar** (default, reversible) o **Eliminar de verdad** (papelera de Notion, recuperable 30 días).
7. **Editar cobros**: **fecha de cobro**, **monto**, **moneda**, servicio vinculado.
8. **Editar clientes** libremente (ya disponible para Finanzas; se confirma).

**NO entra (YAGNI / futuro):** reescribir el dashboard financiero, multi-tenant, TC automático por API externa, edición masiva de cobros, reportes nuevos.

## Permisos

| Acción | Finanzas | CEO | Coordinador |
|---|---|---|---|
| Ver "Por cobrar" (por cliente) | ✅ opera | 👁️ solo lectura | 👁️ solo lectura |
| Asociar / reconciliar / asignar precio | ✅ | ❌ | ❌ |
| Editar servicio (nombre/fecha/estado) | ✅ | ❌ (CEO solo nombre, ya existe) | ✅ (ya existe) |
| Archivar / Eliminar servicio | ✅ | ❌ | parcial (deleteService ya existe, no completados) |
| Editar/crear cobros | ✅ | ❌ | ❌ |
| Editar clientes | ✅ | nombre (ya existe) | ✅ (ya existe) |

Helpers de rol existentes: `esArchivado`, `esDireccion`, `puedeEditarNombre`, `finRecEnPais`/`recEnPaisNotion` (aislamiento país). País-aware: Finanzas ve/opera **solo su país** (Finanzas-UY = Uruguay, etc.).

## Modelo de datos (reusar lo existente)

- **Precio** de una visita = `Propuesta` vinculada → `Importe estimado` (+ `Moneda`, default 🇺🇸 USD). (`precioBy` en renderPorCobrar.)
- **Cobrado** = suma de `Ingresos` vinculados, en la **moneda del precio** (`Monto USD` o `Monto UY$ cobrado`). (`ingBy`.)
- **Reconciliación 1-toque** ("cubre el servicio"): setea en el cobro el monto **en la moneda del precio** (ej. `Monto USD` = lo que cubre, default = saldo) + `TC aplicado` (derivado = monto_pagado_otra_moneda / monto_cubierto), **manteniendo** el monto real y la etiqueta `Moneda cobro`. Verificado: `montoOf` (`:4220`) usa la etiqueta `Moneda cobro` → el dashboard sigue contando la moneda real (sin doble-conteo); `renderPorCobrar` lee `Monto USD`/`Monto UY$ cobrado` directo → reconoce la cobertura.
- **Asignar precio del contrato** = vincular la `Propuesta` recurrente del cliente a las visitas (setear `Servicios.Propuesta`).
- **Archivar** = checkbox `🗄️ Archivado` (ya existe en Servicios, reversible). **Eliminar** = Notion `archived: true` de la página (papelera, recuperable 30 días) vía `deleteService` (relajando el bloqueo de "Completado" para Finanzas, con confirmación).
- **Cobro (Ingreso)** props editables: `Fecha`, `Monto USD`, `Monto UY$ cobrado`, `Moneda cobro`, `TC aplicado`, `Servicio vinculado`, `Cuenta`.

Todas las escrituras → Notion (`updateServiceProps`/`callNotion`) + `syncAfterWrite(id, resource)` (flag OFF).

## Componentes

### C1 — `renderPorCobrar` reorganizada por cliente
Reusa la carga (`svc`/`prop`/`ing` vía `callNotionAll`) y el cómputo precio/cobrado/saldo por servicio. **Nuevo:** agrupar las visitas facturables por **cliente** (`Contacto`). Excluir archivados (`esArchivado`) y respetar país. Por cliente, computar: total a cobrar (por moneda), contrato (si hay propuesta recurrente del cliente), visitas, visitas sin precio, cobros sin asociar del cliente. Orden: clientes con saldo 🔴 arriba.

### C2 — Tarjeta de cliente/contrato
- **Header:** nombre cliente, país, **falta cobrar** (por moneda, o "al día"). Tap → ficha del cliente (editar).
- **Contrato** (si el cliente tiene una propuesta `Tipo = 🔄 Recurrente`): "USD 2.300 / visita · N/año".
- **Visitas** (cada una): fecha (editable), nombre, precio, cobrado, **saldo con color** (🔴 falta / 🟡 parcial / ✅), y acciones contextuales (reconciliar, asociar, editar, archivar/eliminar).
- **Sin precio (¿del contrato?):** visitas completadas del cliente sin propuesta → botón **"asignar precio del contrato"** (bloque, C4).
- **Cobros sin asociar del cliente:** selector de visita (pre-seleccionado si una sola) + "Asociar" (C5).

### C3 — Reconciliar moneda (1 toque): `cubrirServicio(ingId, svcId)`
En una visita pagada en otra moneda, botón **"✓ cubre este servicio"**. Modal de plan: "Este pago de 144.013 pesos cubre el servicio de USD 2.300 (TC 62,6). ¿Confirmás?" con opción **"cubre una parte → ¿cuánto USD?"**. Al confirmar: setea `Monto USD` (= cubierto) + `TC aplicado` (derivado) en el cobro (mantiene `Monto UY$ cobrado` + `Moneda cobro`). Reversible (volver a 0). Re-render.

### C4 — Asignar precio del contrato (bloque): `asignarPrecioContrato(clienteId)`
Si el cliente tiene una propuesta recurrente y hay visitas sin precio: botón **"asignar el precio del contrato a estas N visitas"**. Modal de plan listando las N visitas → al confirmar, vincula la propuesta (`Servicios.Propuesta`) a cada una. No pisa visitas que ya tengan otra propuesta. Reversible (desvincular). Re-render.

### C5 — Asociar cobro (mejorado): reusa `asociarCobro` (~7214)
Dentro de la tarjeta del cliente, las opciones de servicio se **filtran a ese cliente** (ya hay `optsFor` con esa lógica; se reusa). Si el cobro está en `$0` o en otra moneda, tras asociar ofrece **C3** (reconciliar/poner monto).

### C6 — Editar servicio (Finanzas): reusa `openEditSheet`/`saveServiceEdit`
Dar acceso a Finanzas al sheet de edición de servicio (nombre, **fecha**, estado) — ya existe para coord/Dirección; se habilita para Finanzas. Botones **Archivar** (`🗄️ Archivado=true`) y **Eliminar** (`deleteService`, relajando el bloqueo de Completado para Finanzas, con confirm "se va a la papelera de Notion, recuperable 30 días").

### C7 — Editar cobro (Finanzas): `openCobroSheet(ingId)` (nuevo o reusar alta de ingreso)
Sheet para editar un cobro: `Fecha`, `Monto` + `Moneda cobro`, `Servicio vinculado`, (opcional `TC aplicado`). Reusa el patrón del alta de ingreso (`renderGastoSheet`/alta ~4036/4901). Guarda en Notion + syncAfterWrite. Append-only friendly (editar, no borrar; para anular, archivar/eliminar con confirm).

## Plan-antes-de-ejecutar (red de seguridad)
Toda acción que escribe (reconciliar, asignar precio en bloque, archivar, eliminar, editar fecha/monto) muestra primero **qué va a pasar** (overlay sibling de `<body>`, patrón `report-step-overlay`) y solo ejecuta al confirmar. Eliminar pide doble confirmación (papelera).

## Flujo de datos
- **Lecturas:** Notion vía `callNotionAll` (Servicios multi-data-source → ya trae todo y se filtra client-side). Finanzas = su país.
- **Escrituras:** Notion (`updateServiceProps`/`callNotion`) + `syncAfterWrite`. La reconciliación NO crea cobros nuevos (edita el existente) → append-only respetado.
- **Reflejo Notion→app:** la app lee de Notion → lo editado en Notion se ve en la app (con caché stale-while-revalidate; un refresco). Válido mientras Notion sea la fuente.

## Manejo de errores
- Acciones de escritura: confirm → ejecutar → re-render; ante fallo, avisar y no romper (el dato en Notion queda intacto). Bloque (asignar precio a N): secuencial, detener y reportar ante fallo, reintentable (idempotente).
- Reconciliación: validar que el monto cubierto no supere el saldo (salvo que Diego lo fuerce); TC derivado solo si hay monto en la otra moneda.

## Verificación / pruebas
1. **Datos reales (read-only diagnósticos):** Británico (ya reconciliado ✅), un cliente con contrato recurrente, un cobro cross-moneda y uno en $0.
2. **Reconciliación:** un servicio USD pagado en pesos → "cubre el servicio" → sale del 🔴; verificar que el dashboard sigue contando los pesos (sin doble-conteo).
3. **Asignar precio en bloque:** visitas sin precio de un recurrente → asignar → toman precio; no pisa servicios sueltos.
4. **Editar/archivar/eliminar servicio + editar cobro (fecha/monto):** verificar persistencia en Notion y que los totales cuadran.
5. **Permisos:** Finanzas opera; CEO/coord solo lectura. País: Finanzas-UY no ve otro país.
6. Playwright en el usuario Finanzas + casos borde.

## Riesgos / decisiones
- **No mezclar monedas en los totales** (se mantiene): la reconciliación nunca suma pesos con dólares; solo marca cobertura. Verificado con `montoOf` (etiqueta manda).
- **Eliminar de verdad** usa la papelera de Notion (recuperable 30 días) — por eso el default es Archivar.
- **País:** todas las lecturas/acciones de Finanzas se aíslan por país (`finRecEnPais`).
- **No romper números:** se reusa el cómputo precio/cobrado existente; solo cambia la presentación + se agregan acciones.

## Reversa
Quitar la vista por-cliente vuelve a la lista por-visita. Las acciones son reversibles: desarchivar, desvincular propuesta/cobro, volver el `Monto USD` reconciliado a 0. Eliminar es recuperable 30 días en Notion.
