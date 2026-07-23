# FlyClean — cómo funcionamos y cómo integrar un agente (contexto para un proyecto hermano)

> **Para qué es este documento.** Explica cómo trabaja hoy la app de FlyClean, cómo está montado el
> respaldo / la fuente de verdad en **Supabase**, y **cómo conectar un agente externo** (ej. un agente de
> WhatsApp que gestione comunicaciones con clientes) de la forma más limpia, multi-país y sin pisarse con la
> app. Pensado para ponerse en contexto en un proyecto SEPARADO. No obliga a tocar nada de la app para
> empezar.

---

## 1. Qué es FlyClean (rápido)

Empresa uruguaya de limpieza de fachadas/vidrios/paneles con drones. Opera en varios países (Uruguay =
casa central; Brasil, Panamá, Guatemala, México en expansión). Tiene una **PWA** (app web instalable) que
usan los roles: Dirección/CEO, Coordinador, Operario (campo), Finanzas, Ventas. La app gestiona el ciclo:
propuesta → servicio (trabajo) → ejecución del operario → cobro. **Todo está segmentado por país.**

---

## 2. Arquitectura de datos HOY (lo importante para integrar)

**Supabase (Postgres) es la fuente de verdad.** La app lee y escribe primero en Supabase; Notion quedó como
respaldo legible + canal de un cowork de finanzas (no es una dependencia para operar). O sea: **para
integrarte, hablás con Supabase, no con Notion ni con la app.**

### Tablas (el "espejo")
Una tabla por base de negocio. Las que importan para comunicaciones con clientes:

| Tabla | Qué tiene |
|---|---|
| `servicios` | Los trabajos: orden / jornada / relevamiento / prueba. Estado, fecha, país, cliente vinculado. |
| `clientes` | La cartera: nombre, teléfono/WhatsApp, país, interlocutor. |
| `propuestas` | Cotizaciones (pipeline comercial). |
| `ingresos`, `gastos` | Finanzas (no relevante para el agente de comunicaciones). |

**Cada fila tiene, sí o sí:**
- `notion_id` (text, único) → **el ID estable de la fila** (usalo como clave de todo).
- `pais` (text) → el país de la fila (ej. `Uruguay`, `Brasil`, `Panamá`, `Guatemala`, `México`). **La clave
  del aislamiento multi-país.**
- `raw` (jsonb) → **las properties completas** en formato Notion (sin pérdida). Acá está TODO campo por campo.
- Columnas planas de atajo (ej. `estado`, `fecha_programada`, `cliente_notion_id`) mapeadas desde `raw` para
  filtrar rápido.

### Cómo leer/escribir
- **REST de Supabase** (lo más simple para un backend): `GET {SUPABASE_URL}/rest/v1/servicios?select=...&pais=eq.Uruguay`
  con header `apikey`/`Authorization`. Filtros tipo PostgREST (`estado=eq.✅ Completado`, `fecha_programada=gte.2026-07-01`, etc.).
- También hay un proxy propio de la app (`/api/db`) con permisos por rol (RLS por JWT), pero para un agente
  backend conviene ir directo a la REST de Supabase con una **key scopeada** (ver §6).
- Los campos que no son columna plana se leen del `raw` (ej. `raw->'Teléfono / WhatsApp'->>'phone_number'`).

### Ejemplos concretos
- **Días ocupados / agenda de un país:**
  `servicios?select=notion_id,fecha_programada,estado,raw&pais=eq.Uruguay&fecha_programada=gte.HOY`
- **Clientes de un país con su teléfono:** `clientes?select=notion_id,pais,raw&pais=eq.Uruguay`
  → el teléfono está en `raw->'Teléfono / WhatsApp'->>'phone_number'`, el nombre en `raw->'Nombre / Empresa'`.
- **Trabajos recién completados:** `servicios?pais=eq.Uruguay&estado=eq.✅ Completado&...`.
  `raw->'Tipo de registro'` distingue **Orden de trabajo / Jornada / Relevamiento / Prueba**.

---

## 3. El modelo de "proyectos hermanos" (ya probado)

FlyClean **ya tiene un precedente funcionando** de esto exacto: el **cowork de Finanzas**, un proyecto
SEPARADO que ingiere estados de cuenta del banco y **solo agrega filas** a las tablas de finanzas, con un
**CONTRATO** escrito (qué toca, qué no, cómo se marca lo que carga). Nunca edita/borra datos de la app.

**El agente de WhatsApp debe seguir el mismo molde:** proyecto aparte, comparte SOLO Supabase, con un
contrato claro. Así los dos corren en paralelo sin entreverarse.

---

## 4. Cómo se integra el agente de WhatsApp (todo vía Supabase, filtrando por `pais`)

### 4.1 Lo que LEE
- **Agenda / días ocupados** → `servicios` por fecha + estado.
- **Clientes y sus teléfonos** → `clientes` (`raw->'Teléfono / WhatsApp'`). *(Nota: la app ya normaliza
  teléfonos a formato WhatsApp por país — misma lógica reutilizable.)*
- **Trabajos completados** (para pedir devolución) → `servicios` con `estado = '✅ Completado'` (o el cierre
  de una Prueba/Relevamiento).

### 4.2 El DISPARADOR (trabajo completado → esperar un rato → escribir al cliente)
Un **cron propio del agente** (temporizador, ej. cada 15 min) que consulta Supabase:
> "servicios `pais=X`, `estado=✅ Completado`, cerrados hace **> N horas**, y **sin devolución pedida
> todavía**" → dispara el WhatsApp.

Es el **mismo patrón** que ya usa FlyClean para sus emails automáticos y su cola de sincronización (crons que
leen Supabase y actúan). **No requiere ningún cambio en la app.** Para no repetir el envío, el agente marca
un campo `Feedback pedido` (fecha) en el servicio.

### 4.3 El WRITE-BACK (estrellas / feedback → a la ficha del servicio)
Cuando el cliente responde, el agente escribe la devolución en la fila del servicio. Para esto FlyClean
**agrega 3 campos nuevos** en `servicios` (los creo yo cuando arranquemos):
- `Estrellas cliente` (número 1–5)
- `Feedback cliente` (texto)
- `Feedback pedido` (fecha; para el dedup del cron)

El agente los escribe en Supabase (patrón append/update acotado a esos 3 campos, por `notion_id`). Se
propagan solos a Notion por la cañería que ya existe. **Regla de oro: el agente solo escribe esos campos;
nunca toca el resto del servicio.**

### 4.4 Matiz: enviar el reporte PDF automáticamente
Hoy el reporte del trabajo **se genera en el teléfono** (en el navegador, con jsPDF). Para que el agente lo
mande solo hay dos caminos:
- **MVP simple:** el agente pide las estrellas/comentario **sin** adjuntar el PDF (el reporte sigue manual).
- **Completo:** FlyClean agrega una pieza server-side que genera el PDF y lo expone por un link → el agente
  lo adjunta. (Trabajo chico, para una fase posterior.)

### 4.5 Multi-país en paralelo, sin mezcla
Cada fila tiene `pais`. **Un número de WhatsApp por país = un filtro `pais=X`** en cada consulta y cada
escritura. El agente nunca cruza países porque todo va scopeado. **Es el mismo aislamiento que ya tiene la
app** (Brasil no ve datos de Uruguay, etc.) → naturalmente seguro. Podés correr una instancia/config por
país, todas en paralelo.

---

## 5. Rollout por fases (encaja con "el agente va tomando protagonismo")

1. **Fase 1 — Lectura + humano en el loop.** El agente conoce agenda + clientes y **redacta** mensajes; un
   humano aprueba/envía. **CERO cambios en la app** (es pura lectura de Supabase).
2. **Fase 2 — Disparo automático.** Tras completarse un trabajo, el cron dispara el pedido de devolución.
3. **Fase 3 — Write-back.** El agente guarda estrellas/feedback en la ficha (los 3 campos nuevos).
4. **Fase 4 — Autonomía.** Maneja comunicaciones generales, agenda, etc.

---

## 6. Contrato de coordinación (para no pisarse)

- **Lee:** `servicios`, `clientes`, `propuestas` (solo lectura), siempre con `pais=X`.
- **Escribe:** SOLO `Estrellas cliente`, `Feedback cliente`, `Feedback pedido` en `servicios`, por `notion_id`.
  Nunca edita/borra otros campos ni otras tablas.
- **Ownership del esquema:** lo maneja el proyecto técnico de FlyClean. Si el agente necesita un campo nuevo,
  se pide y lo crea FlyClean (así el espejo Notion↔Supabase queda consistente). *Igual que con el cowork.*
- **Credenciales:** una key de Supabase para el agente (idealmente scopeada / con RLS), no la key de admin de
  la app. Se define al arrancar.
- **Marca de origen:** conviene marcar lo que escribe el agente (ej. un `Cargado por = "WhatsApp"` o similar),
  como hace el cowork con `Cargado por = "Finanzas"`.

---

## 7. Qué necesita de FlyClean para arrancar (mínimo)

- **Fase 1:** nada de código de la app. Solo **acceso de lectura a Supabase** (URL + key) y el nombre de las
  tablas/columnas (este documento).
- **Fase 2–3:** que FlyClean **cree los 3 campos de feedback** en `servicios` + acuerde el contrato de
  escritura. Es un cambio chico y no intrusivo.

---

## 8. TL;DR

- **Conectate a Supabase, no a la app ni a Notion.** Es la fuente de verdad, tiene todo espejado con `raw`
  (properties completas) y una columna `pais`.
- **Filtrá SIEMPRE por `pais`** → multi-país en paralelo, imposible de cruzar.
- **Disparás con un cron propio** que lee "completados sin devolución pedida" (mismo patrón que ya usa FlyClean).
- **Escribís solo 3 campos de feedback** en el servicio (que FlyClean crea), nada más.
- **Seguís el molde del cowork de Finanzas:** proyecto aparte, contrato claro, sin pisar.
- **Fase 1 = cero cambios en la app.** El resto es incremental.
