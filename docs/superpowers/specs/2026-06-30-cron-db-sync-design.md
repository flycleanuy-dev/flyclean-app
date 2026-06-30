# Spec — Cron de sincronización Notion → Supabase

**Fecha:** 2026-06-30
**Estado:** Diseño aprobado por Diego.
**Rama:** `feat/cron-db-sync` (desde main, sw v89).

## Objetivo

Mantener Supabase **al día automáticamente** con lo que se edita en Notion, incluido lo editado **a mano** (cowork de
Finanzas, Panel de Limpieza, Diego ordenando datos). Hoy el sync Notion→Supabase solo ocurre (a) cuando la app guarda
(`syncAfterWrite`, flag off) o (b) al correr el batch a mano — **no hay cron**, así que un cambio manual en Notion no
llega a Supabase hasta el próximo batch manual. Esta es la **pieza que falta antes de poder encender las lecturas de
Supabase con seguridad** (si no, la app leyendo de Supabase mostraría datos viejos).

## Contexto verificado

- **Proyecto Supabase YA existe** (confirmado por Diego 30/06): claves `SUPABASE_URL` / `SUPABASE_SERVICE_KEY` cargadas
  en Vercel, esquema corrido. `NOTION_TOKEN` y `CRON_SECRET` ya están en Vercel (los usan los crons actuales).
- **Sincronizador existente:** `scripts/sync-notion-supabase.mjs` (115 líneas) — trae todo de Notion (`queryAll` +
  fallback `searchByParent` para Servicios multi-source) y hace upsert a Supabase (`on_conflict=notion_id`,
  idempotente). Importa el **mapeo compartido** `_lib/notion-map.js` (`DBS`, `MAP`, `mapRow`) — única fuente de verdad,
  ya usada también por `api/db-sync.js`.
- **Patrón de cron probado:** `api/cron-pipeline.js` — handler Vercel con auth `CRON_SECRET` (Bearer, **falla cerrado**:
  sin secreto el endpoint devuelve 500 y no corre), modo `?dry=1`, y bloque `crons` en `vercel.json` (hoy 3 entradas).
- Vercel **Pro** (cron jobs habilitados).

## Decisiones (aprobadas por Diego)

- **Frecuencia:** cada 10 minutos (`*/10 * * * *`).
- **Alcance:** 5 bases — `clientes`, `servicios`, `propuestas`, `ingresos`, `gastos` (las que tienen mapeo en
  `notion-map.js` `DBS` y son las primeras a leer + finanzas). Ampliable después.
- **Estrategia:** **FULL** (trae todo de Notion y upsert cada corrida) — simple y robusto; FlyClean tiene pocas filas,
  lo aguanta. Optimización a incremental (por `last_edited_time`) queda como follow-up si la carga molesta.

## Diseño

### 1. Refactor: extraer la lógica de sync a un módulo compartido
`scripts/sync-notion-supabase.mjs` hoy tiene la lógica de sincronización (Notion fetch + upsert + loop por tabla)
mezclada con el wrapper CLI. Extraer la parte reusable a **`api/_lib/sync.js`** con una función:

```
export async function syncTables(tables, { dry = false } = {})
  → { perTable: { <tabla>: { ok: <n>, err: <n>, errors: [...] } }, totalOk, totalErr }
```

`syncTables` usa `DBS`/`MAP`/`mapRow` de `notion-map.js` (no duplica el mapeo) y las funciones `queryAll`/
`searchByParent`/`upsert` (movidas acá desde el script). El script batch (`scripts/sync-notion-supabase.mjs`) pasa a
ser un wrapper fino que importa `syncTables` y la corre desde la CLI (respeta `SYNC_ONLY`). **Verificar que el batch a
mano sigue funcionando idéntico después del refactor.**

### 2. Endpoint cron: `api/cron-db-sync.js`
Handler Vercel que:
- **Auth:** exige `CRON_SECRET` (Bearer). Falla cerrado (sin secreto → 500; header inválido → 401). Mismo patrón que
  `cron-pipeline.js`.
- Si falta `SUPABASE_URL`/`SUPABASE_SERVICE_KEY` → responde 200 con `{ skipped: 'supabase no configurado' }` (no rompe;
  por si se deploya antes de que las envs estén — aunque Diego confirmó que ya están).
- `?dry=1` → corre `syncTables(TABLES, { dry: true })` (cuenta sin escribir) y devuelve el resumen.
- Llama `syncTables(['clientes','servicios','propuestas','ingresos','gastos'], { dry })` y devuelve el resumen
  (`perTable` con filas OK/err por base). Loguea el resumen para verlo en los logs de Vercel.

### 3. `vercel.json`
- Sumar al bloque `crons`: `{ "path": "/api/cron-db-sync", "schedule": "*/10 * * * *" }`.
- Si el sync full de 5 tablas se acerca al límite de tiempo de la función, configurar `maxDuration` para
  `api/cron-db-sync` (Vercel Pro permite subirlo; default suele alcanzar para el volumen actual).

## Flujo de datos
Notion (fuente) → cada 10 min el cron lee las 5 bases → upsert idempotente a Supabase (espejo). **No toca Notion ni la
app.** La app sigue 100% en Notion (lecturas con flags off). Supabase queda al día para cuando se enciendan las lecturas.

## Manejo de errores
- Auth falla cerrado.
- Cada tabla en su try/catch: si una falla, las otras igual se sincronizan; el resumen reporta los errores por tabla.
- Upsert idempotente: una corrida que se solapa con otra no duplica (`on_conflict=notion_id`).
- Si Supabase/Notion no responde: el cron reporta el error en el resumen/logs, no rompe nada (la app no depende del cron).

## Verificación
1. `?dry=1` manual (con el `CRON_SECRET`) → devuelve conteos por tabla sin escribir.
2. Una corrida real → comparar conteos de filas Supabase vs Notion por tabla (que cuadren).
3. Confirmar que el batch a mano (`node scripts/sync-notion-supabase.mjs`) sigue funcionando tras el refactor.
4. Revisar los logs de Vercel del cron tras unos ciclos (que corra cada 10 min y no falle).

## Riesgos / consideraciones
- **Bajo riesgo:** el cron solo escribe en Supabase (service_key, server-side). No toca Notion ni afecta a la app en
  vivo (Supabase apagado para lecturas). Reversible (quitar la entrada del cron).
- **Rate limits de Notion:** full cada 10 min × 5 tablas. Volumen actual bajo; si crece, pasar a incremental.
- **Refactor del batch:** el único punto de cuidado es no romper el batch a mano al extraer la lógica a `_lib/sync.js`.
- **No requiere** cambios en `index.html` ni bump de `sw.js` (es backend puro).

## Fuera de alcance (YAGNI / follow-up)
- Sync incremental por `last_edited_time`.
- Sync inverso Supabase→Notion (para cuando Notion pase a respaldo de solo-lectura — fase futura).
- Encender las lecturas (flags) — fase siguiente, separada.
- Alertas/email si el cron falla (los logs de Vercel alcanzan por ahora).
