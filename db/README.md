# Base "top" — Supabase / Postgres + RLS (Fase 1, en paralelo)

Esto es la base de datos nueva que estamos levantando **al lado** de la app actual, sin frenarla y **sin descartar
Notion** (Notion sigue siendo la fuente de verdad en Fase 1). Cuando esté probada, se migra por fases. Razonamiento
y roadmap completo: [`../docs/ARQUITECTURA-HOY-VS-TOP.md`](../docs/ARQUITECTURA-HOY-VS-TOP.md).

## Qué hay acá
- **`schema.sql`** — el esquema Postgres espejando las bases de Notion (una tabla por base). Cada fila guarda su
  `notion_id` (ancla del sync), el `pais` "plano" (para RLS) y `raw` (las properties completas de Notion, sin pérdida).
- **`policies.sql`** — las **Row-Level Security**: la base decide fila por fila quién ve qué (operario solo lo suyo;
  coordinador/finanzas/CEO su país; Dirección y CEO-UY global). Reemplaza el filtro client-side actual y lo hace
  inviolable.
- **`../scripts/sync-notion-supabase.mjs`** — copia y mantiene Supabase = Notion (upsert idempotente por `notion_id`).

## Cómo funciona la seguridad (RLS)
El login con PIN actual (`api/verify-pin.js`) emitirá un **JWT con claims `{ pais, rol, nombre }`**. Postgres los
lee con `current_setting('request.jwt.claims')`. Las policies (`policies.sql`) usan eso para filtrar. El sync corre
con la **service key** → bypassea RLS (necesita escribir todo). Las apps usan el JWT del usuario → quedan limitadas.

> El `pais` se guarda "plano" (`Uruguay`, `Brasil`, …) — el sync convierte `🇺🇾 Uruguay` → `Uruguay` para que
> matchee con el claim del JWT.

## Pasos para aplicarlo (cuando exista el proyecto Supabase)

1. **Diego (único paso manual):** crear un proyecto en [supabase.com](https://supabase.com) (free tier) y pasar:
   `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` (service_role), y el `anon key`. Se cargan como envs (local + Vercel),
   igual que `NOTION_TOKEN`.
2. En el **SQL Editor** de Supabase, correr `schema.sql` y luego `policies.sql`.
3. Correr el sync (deja Supabase = Notion):
   ```bash
   NOTION_TOKEN=... SUPABASE_URL=https://xxx.supabase.co SUPABASE_SERVICE_KEY=... \
     node scripts/sync-notion-supabase.mjs
   ```
   (opcional `SYNC_ONLY=clientes,servicios` para probar de a poco.)
4. **Verificar el espejo:** comparar conteos por tabla Supabase vs Notion (que cuadren) y probar RLS (un usuario de
   Brasil NO puede leer filas de Uruguay ni con query directa).

## Estado actual (ACTUALIZADO 2026-07-07): Fase 2.4 — las lecturas YA salen de Supabase
La app **ESCRIBE en Notion** (sigue siendo la fuente de verdad) y **LEE de Supabase** para
clientes/servicios/propuestas vía `/api/db` (flags `DB_FLAGS` en `index.html`, todos en `true`; sw v78-v81).
El cron `cron-db-sync` refleja Notion→Supabase cada 10 min + `syncAfterWrite` tras cada guardado. RLS por país
activa (`db/policies.sql`); si `SUPABASE_JWT_SECRET`+`SUPABASE_ANON_KEY` están, mintea un JWT por usuario y la RLS
filtra; si no (o el JWT falla), cae a service_role con filtro país server-side. Reversible: apagar los `DB_FLAGS`
vuelve las lecturas a Notion.

## Pendiente (próximas fases)
- Fase 3: Supabase = fuente de escritura; Notion como respaldo/panel de carga (hoy Notion sigue siendo la fuente).
- Fase 4: multi-tenant (columna `tenant_id` + predicado por tenant) para franquicias.
