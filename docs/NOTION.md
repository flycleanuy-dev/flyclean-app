# Esquema Notion — FlyClean

La app es un cliente de Notion. Los IDs de las bases están centralizados en
**`const NOTION_DBS`** en `index.html` (único lugar para cambiar al clonar a otro workspace).

## Bases de datos

| Módulo | Base | Database ID |
|---|---|---|
| CRM | **Clientes** (ex "Contactos / Cuentas") | `250115612de74e0582366549bbe5e389` |
| CRM | Propuestas / Presupuestos | `2c0a4257f4294941b994dfebc1098633` |
| Ops | **Servicios / Trabajos** | `ccaf276c7f6a460caeb3d2800deab2e5` |
| Ops | Tareas | `ed5509c20cdd4672aab8cc1710e7ffd5` |
| Ops | Registro de Tiempo | `57bc613af5d04908a9f2342cf6a1a5a7` |
| Team | Equipo | `cfff6e26dbc84eedb7eabcb6c51db1eb` |
| Equipment | Activos | `e75449eeb78143f1b74006a4796c1f95` |
| Equipment | Inventario de Insumos | `d8bd0fa73356419dbcc481ac1ad7a380` |
| Finance | Proveedores | `9e97dbe8fad5428d89c1b6122792399d` |
| Finance | **Gastos** | `1e20cdabad5d41528d070ed2f6e9dad3` |
| Finance | **Ingresos / Cobros** | `d1e15376e83a408a8a52f47da33c249a` |
| Finance | 🛒 Solicitudes de Compra | `0f5cd38362ab430293a5dec7140ac18f` |
| Finance | 📑 Documentos & Certificados | `f888bd9c89e0497a9d2c57594aacd663` |
| Wiki | SOPs | `0c2a129734de495a8643343d7334b907` |

> La DB **Servicios** tiene "multiple data sources" → ver el fallback en `api/notion.js`.
> Data source de Servicios: `2fbc8a03-5c4f-445c-8516-71dd9b2eea78` (`SERVICIOS_DS_ID` en index.html).

## Mapa de relaciones (DUAL salvo nota)

```
Propuestas ↔ Contactos
Servicios  ↔ Propuestas
Servicios  ↔ Contactos
Tareas     ↔ Servicios
Reg.Tiempo ↔ Servicios / Tareas
Ingresos   ↔ Clientes / Servicios
Gastos     → Proveedores  (ONE-WAY)
Activos    ↔ Equipo
Clientes   ↔ Clientes  (self-relation: `Intermediario` ↔ `Clientes traídos`)
```

> **Clientes (ex Contactos)**: la base se renombró a **Clientes** (2026-06-25). Title = `Nombre / Empresa`.
> Property nueva **`Intermediario`** (self-relation dual): un cliente puede venir vía un intermediario/canal
> (tipo `🤝 Intermediario`, ej. Aseo→Hospital Británico, Belhouse→sus obras); la inversa se llama
> **`Clientes traídos`**. Cada registro lleva `País` (UY/BR/PA/GT/MX) → la app aísla por país.
>
> **Properties nuevas (2026-06-29)**:
> - `Mapa` (url) — URL de Google Maps de la ubicación habitual del cliente. Fuente única; los servicios y
>   propuestas la **heredan** via `resolveMapsUrl()`. Override puntual disponible en cada servicio/propuesta.

## Properties clave — DB Servicios

| Property | Tipo | Para qué |
|---|---|---|
| `Tipo de registro` | select | Orden / Jornada / Relevamiento / Prueba |
| `Operario App` | select | Piloto asignado (a quién le aparece en su app) |
| `Operarios participantes` | multi_select | Ayudantes adicionales (jornales) |
| `Hora Inicio` | date (datetime) | Hora **programada** por el coord |
| `Hora Inicio Efectivo` / `Hora Fin Efectivo` | date (datetime) | Horas **reales** del operario |
| `Lugar` | rich_text · `Mapa` | url | Dirección + link Google Maps |
| `Condición climática` | **multi_select** | Una o más condiciones (operario) |
| `Resultado` | select | Exitoso / Con incidencia / Fallido |
| `Resultado prueba` | select | Avanza / No interesado / Re-contactar (solo Pruebas) |
| `Ubicación GPS` | url | Google Maps del GPS al iniciar (si el operario consiente) |
| `Observación cliente` | rich_text | Observación para el PDF de devolución |
| `Estado checklist` | rich_text (JSON) | Checklist pre/post en JSON `{pre:{},post:{}}` — blindaje contra pérdida de localStorage; `hydrateServiceStateFromNotion` lo usa como fallback |
| `Método de trabajo` | select (`🚁 Dron` / `💪 Manual`) | Cómo se ejecutó el trabajo; obligatorio para registrar `Hora Inicio Efectivo` |
| `Herramienta manual` | select (`Lanzas` / `Manguera` / `Hidrolavadora` / `Otro`) | Submétodo cuando `Método de trabajo = 💪 Manual`; queda vacío si es dron |
| `Operario manual` | select | Persona que ejecuta el trabajo manual (columna derecha del sheet del coord); espejo de `Operario App` para el rol manual |

**Separación clave**: `Hora Inicio` (programada, dueño = coord) ≠ `Hora Inicio Efectivo`
(real, la escribe el operario al apretar "Iniciar"). Nunca escribir `Hora Inicio` desde el flujo
del operario.

## Diseño multi-país

Un registro por objeto, segmentado por una property **`País`** (UY / BR / PA / GT / MX),
**nunca** duplicando bases. Operarios son invitados de Notion con acceso solo al Panel Operario.

## Pipeline de Propuestas (estados)

`Nuevo lead → Contactado → Relevamiento → Propuesta en pausa → Propuesta enviada → Negociando
→ Aceptada → Rechazada → Sin respuesta → Reactivo`

Umbrales (cron diario): alerta a los 15 días sin cambio de estado; auto-mover a "Sin respuesta"
a los 45. La antigüedad sale de la fórmula `Días sin respuesta` (cuenta desde `Última interacción`).

## Propuestas — contrato recurrente (2026-06-25)

Una propuesta con `Tipo = 🔄 Recurrente` funciona como el **contrato** del cliente. Properties nuevas:

| Property | Tipo | Para qué |
|---|---|---|
| `Servicios por año` | number | Cuántos servicios incluye el contrato al año (ej. Aseo = 6) |
| `Comisión %` | number | % que se lleva el intermediario, **dentro del pago** (ej. Rivero en Aseo). Neto FlyClean = cobrado × (1 − %) |

El Cliente 360 (ficha) calcula **Esperado/año** = `Servicios por año × Importe estimado`, y con la comisión
muestra **Comisión** y **Neto FlyClean** sobre lo cobrado. El intermediario sale de `Cliente.Intermediario`.

## Propuestas — ubicación heredable (2026-06-29)

| Property | Tipo | Para qué |
|---|---|---|
| `Mapa` | url | Override de ubicación a nivel propuesta. Si tiene valor, sobreescribe el `Mapa` del cliente; el `Mapa` del servicio sobreescribe a este. Precedencia: servicio > propuesta > cliente. |

## Ingresos / Cobros — modelo de reconciliación cross-moneda (2026-06-29)

No hay properties nuevas. El modelo reutiliza los campos existentes:

| Campo | Tipo | Rol |
|---|---|---|
| `Monto UY$ cobrado` | number | Monto **real** del pago si la moneda de cobro es pesos |
| `Monto USD` | number | Monto **real** del pago si la moneda de cobro es dólares; **también** se usa como campo de cobertura en reconciliación cross-moneda |
| `Moneda cobro` | select | Moneda **real** del pago (`UY$` / `USD`). `montoOf` la lee para los KPIs → determina qué campo sumar → sin doble-conteo |
| `TC aplicado` | number | Tipo de cambio **derivado** al reconciliar (monto_otra_moneda / monto_cubierto). Se escribe solo en reconciliación; vacío si no aplica |

**Flujo de reconciliación "cubre el servicio" (`cubrirServicio`):**
Cuando un servicio está en USD pero el cobro es en pesos (o viceversa), la app NO crea un cobro nuevo ni cambia `Moneda cobro`. En cambio, escribe el equivalente en la moneda del precio en el campo correspondiente + deriva `TC aplicado`. Así:
- El dashboard sigue contando la moneda real (`montoOf` lee `Moneda cobro` → suma en la columna correcta, sin mezclar).
- `renderPorCobrar` lee `Monto USD` / `Monto UY$ cobrado` directo y reconoce que el servicio está cubierto.
- La operación es reversible (volver el campo cubierto a 0 y limpiar `TC aplicado`).
