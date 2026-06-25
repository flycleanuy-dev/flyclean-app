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
