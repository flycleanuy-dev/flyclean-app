# Arquitectura FlyClean — Cómo la tenemos hoy vs. la versión "top"

> **Para qué sirve este doc:** entender, en criollo, en qué está parada la app hoy, qué nos limita, cómo sería la
> versión más profesional/escalable, y **cuándo conviene saltar** (no antes). Al final hay una sección técnica por
> si se lo mostrás a un socio o programador. El estado técnico actual detallado está en `ARQUITECTURA.md`.

---

## 1. Cómo está hoy (en criollo)

La app es un **único archivo** (`index.html`) que corre en el celular, y los datos viven en **Notion** (como si
Notion fuera la base de datos). En el medio hay un "portero" (`/api/notion`) que esconde la clave de Notion y deja
pasar los pedidos.

**Lo bueno (por esto llegamos hasta acá rápido y barato):**
- 🟢 **Cero servidores que mantener** y **casi cero costo** (Vercel + Notion).
- 🟢 **Súper rápido de cambiar**: tocás un archivo y en minutos está en producción.
- 🟢 **Notion te da una "tabla" editable a mano** — vos y el cowork ven y arreglan datos sin programar.
- 🟢 Ya funciona, ya está en la calle, ya tiene seguridad básica sólida (login con PIN, token de sesión, CORS,
  headers de seguridad).

**Lo que nos limita (la deuda real):**
- 🔴 **No hay seguridad "por fila" (RLS).** Hoy el filtro de "cada país ve lo suyo" se hace **en el celular**
  (en el navegador). El portero pide login, pero **no filtra por país/rol**. Un usuario con login y conocimientos
  técnicos podría pedir datos de otro país salteando el filtro. Es "vidriera", no "bóveda".
- 🟠 **Escala limitada.** Notion aguanta pocos pedidos por segundo. Con 7 personas va bien; con 50–70 operando en
  paralelo en varios países, se va a poner lento o a fallar.
- 🟠 **Franquicias = frágil.** Hoy es **un solo Notion y una sola app para todos**. Separar de verdad los datos de
  cada franquicia (que no se mezclen nunca) no está resuelto.
- 🟠 **Un archivo de ~10.000 líneas.** Funciona, pero crecer y traspasar a otro programador se hace cuesta arriba.
- 🟡 **Dependés de Notion** como base: si cambia precios/límites o lo querés cambiar, hay que migrar.

---

## 2. La versión "top" realista (en criollo)

El salto profesional **no es la luna**: es pasar la base de datos de Notion a una **base de datos de verdad
(Supabase / PostgreSQL)** con **RLS** (la base misma decide, fila por fila, quién ve qué), y ordenar el frente con
un framework. Es **el mismo mundo en el que ya está El Parrillero**.

**Lo que ganás:**
- 🟢 **Seguridad de bóveda (RLS):** imposible que un país vea datos de otro, aunque alguien sea técnico — lo impone
  la base, no el navegador. Clave para socios y para vender/entregar el proyecto.
- 🟢 **Escala real:** miles de pedidos, muchos usuarios en paralelo, sin el cuello de botella de Notion.
- 🟢 **Franquicias de verdad (multi-tenant):** cada franquicia con sus datos aislados, mismo sistema.
- 🟢 **Base propia:** los datos son tuyos, exportables, auditables (quién cambió qué y cuándo).
- 🟢 **Más vendible / due-diligence:** un comprador o programador serio ve una arquitectura estándar.

**Lo que cuesta:**
- 🔴 **Tiempo de migración** (semanas, por fases — ver punto 6).
- 🟠 **Un poco más de complejidad y costo mensual** (Supabase tiene plan gratis generoso, pero con escala se paga).
- 🟠 **Perdés** la edición "a mano en Notion" tan cómoda (se reemplaza por paneles de admin).

---

## 3. Comparación lado a lado

| | **Hoy (Notion + PWA)** | **Top (Supabase/Postgres + RLS)** |
|---|---|---|
| **Base de datos** | Notion (ajena, editable a mano) | Postgres propia |
| **Seguridad por fila (RLS)** | ❌ No (filtro en el navegador) | ✅ Sí (la base lo impone) |
| **Escala** | 🟠 Pocos pedidos/seg | ✅ Alta |
| **Franquicias / multi-país aislado** | 🟠 Frágil (todo junto) | ✅ Multi-tenant real |
| **Velocidad para cambiar cosas** | ✅ Altísima (1 archivo) | 🟡 Media (más estructura) |
| **Costo** | ✅ Casi cero | 🟡 Bajo→medio según escala |
| **Dependencia de terceros** | 🟠 Atado a Notion | ✅ Base propia |
| **Funciona sin internet (offline)** | ✅ Sí (ya armado) | ✅ Sí (se mantiene) |
| **Mantener / traspasar a otro dev** | 🟠 1 archivo gigante | ✅ Estándar, modular |
| **Auditoría (quién cambió qué)** | ❌ No | ✅ Sí |

---

## 4. ¿Cuándo conviene saltar? (los disparadores)

**Hoy Notion alcanza.** El salto se justifica cuando aparezca alguno de estos:
1. **Franquicias** (vender el sistema a terceros) → necesitás aislamiento real.
2. **Muchos usuarios en paralelo** (decenas operando a la vez en varios países).
3. **Socios que ponen datos sensibles** y exigen garantías de que nadie ve lo ajeno.
4. **Venta o due-diligence** del proyecto (un comprador va a pedir esto).
5. Que el **rate-limit de Notion** o el archivo de 10k líneas empiecen a doler en el día a día.

Mientras tanto, lo más urgente y barato es **tapar el agujero de RLS del lado server** (que el portero filtre por
país/rol) — eso reduce el riesgo grande **sin migrar todavía**.

---

## 5. Recomendación honesta + camino por fases (sin "big-bang")

**No hay que reescribir todo de una.** La clave: el portero **`/api/notion` ya es el límite limpio** entre el
frente (la app) y los datos. Eso permite cambiar la base por detrás **reusando casi todo el frente**.

**Fase 0 (ya / barato):** reforzar el server-side actual → que el portero exija país/rol (mitiga el riesgo de RLS
sin migrar). _Esto es la deuda #1 que ya tenemos anotada._
**Fase 1:** crear la base Supabase/Postgres con las tablas + RLS, **espejando** las bases de Notion. Notion sigue
siendo la fuente; Supabase se llena en paralelo.
**Fase 2:** el portero empieza a **leer de Supabase** (más rápido/seguro) y a escribir en ambos.
**Fase 3:** Supabase pasa a ser la fuente; Notion queda como vista/respaldo o se retira. Panel de admin para editar
lo que antes editabas a mano en Notion.
**Fase 4:** multi-tenant para franquicias.

Cada fase es reversible y deja la app andando.

---

## 6. Sección técnica (para un socio o programador)

**Estado actual:** PWA single-file (`index.html`, ~10k líneas, sin framework) + funciones serverless en `api/`
(Vercel) + Notion como datastore vía proxy `api/notion.js` (allow-list de endpoints, token de sesión HMAC, fallback
search para la DB multi-source) + Cloudflare R2 para fotos. Aislamiento país/rol = **client-side** (`recEnPaisNotion`
/`finRecEnPais` + paneles por rol). Detalle completo en `ARQUITECTURA.md`.

**Target propuesto:** Supabase (Postgres + Auth + Storage + RLS) — opcionalmente con un front Next.js, o
**manteniendo la PWA actual** y solo cambiando el backend (camino más barato).

- **Mapeo de datos:** cada DB de Notion → una tabla Postgres. Ej.: `Clientes`, `Propuestas`, `Servicios`,
  `Ingresos`, `Gastos`, `Equipo`, etc. Las relaciones de Notion → claves foráneas. El campo `País` → columna
  indexada usada por las policies.
- **RLS por país/rol:** policies del tipo `pais = current_setting('app.user_pais')` y por rol (operario ve solo sus
  servicios; coordinador/finanzas/CEO su país; dirección global). Esto reemplaza el filtro client-side y lo hace
  inviolable.
- **Auth:** Supabase Auth (o mantener el login con PIN actual emitiendo un JWT con `pais`/`rol` como claims que las
  policies leen). Storage de fotos puede quedar en R2 o pasar a Supabase Storage.
- **Multi-tenant (franquicias):** columna `tenant_id` + RLS por tenant, o esquema/proyecto por franquicia.
- **Qué se reúsa:** casi todo el frente (las pantallas, la lógica de UI), el modelo de datos (ya pensado), la cola
  offline. Lo que cambia es la capa de datos detrás del proxy.
- **Riesgos de migración:** doble escritura durante la transición, consistencia Notion↔Postgres, y re-mapear los
  quirks actuales (multi-source de Servicios, monedas UY$/USD). Mitigación: las fases del punto 5 + tests.

**Resumen técnico:** la deuda central de hoy es **enforcement de autorización server-side (RLS)**; el resto
(escala, multi-tenant) viene "gratis" al migrar a Postgres. El proxy actual es el punto de corte que hace la
migración incremental y de bajo riesgo.
