# Cron de sync Notion → Supabase — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development para implementar tarea por
> tarea. Steps usan checkbox (`- [ ]`). Tareas SECUENCIALES (Task 2 importa lo de Task 1).

**Goal:** Un cron Vercel que cada 10 min copia 5 bases de Notion → Supabase, reusando el sincronizador existente.

**Architecture:** Se extrae la lógica de sync del script batch a un módulo compartido `api/_lib/sync.js`
(`syncTables`), que pasa a usar tanto el batch a mano como el nuevo endpoint cron `api/cron-db-sync.js`. Backend puro:
NO toca `index.html` ni `sw.js`. Notion sigue siendo la fuente; el cron solo escribe en Supabase.

**Tech Stack:** Node ESM serverless (Vercel functions), Notion API, Supabase PostgREST (upsert por `notion_id`).

**Spec:** `docs/superpowers/specs/2026-06-30-cron-db-sync-design.md`

## Global Constraints

- **Backend puro:** solo `api/` + `scripts/` + `vercel.json`. NO tocar `index.html` ni `sw.js` (no hay bump de SW).
- **Verificación real (NO hay TDD unitario):** `node --check <archivo>` para validar sintaxis de cada `.js`/`.mjs`
  nuevo o modificado; `node -e "JSON.parse(require('fs').readFileSync('vercel.json','utf8'))"` para validar el JSON.
  La verificación funcional (dry-run real + conteos Supabase vs Notion) la hace el controller/Diego **post-deploy**
  (necesita el `CRON_SECRET` y las envs de Vercel). Los implementers NO tienen las envs reales — NO corran el sync real.
- **El batch a mano DEBE seguir funcionando idéntico** tras el refactor (mismo output, mismo `SYNC_ONLY`).
- **Reuso (NO reconstruir):** `DBS`/`MAP`/`mapRow` de `api/_lib/notion-map.js`; patrón de cron de `api/cron-pipeline.js`
  (auth `CRON_SECRET` Bearer, **falla cerrado**: sin secreto → 500; header inválido → 401).
- **Decisiones:** cada 10 min (`*/10 * * * *`); 5 tablas `clientes,servicios,propuestas,ingresos,gastos`; FULL
  (no incremental); idempotente (upsert `on_conflict=notion_id`).
- **Deploy:** merge a `main` + push (Vercel auto-deploya el endpoint). NO requiere bump de SW.
- **Commits** terminan con `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.

---

### Task 1: Extraer la lógica de sync a `api/_lib/sync.js` (compartida) + adaptar el batch

**Files:**
- Create: `api/_lib/sync.js`
- Modify: `scripts/sync-notion-supabase.mjs` (pasa a wrapper fino que importa `syncTables`)

**Interfaces:**
- Consumes: `DBS`, `MAP` de `api/_lib/notion-map.js`.
- Produces: `export async function syncTables(tables, { dry }) → { perTable: {<tabla>:{ok,err,error?}}, totalOk, totalErr, dry }`.

- [ ] **Step 1: Crear `api/_lib/sync.js`** con la lógica movida del batch (notionFetch/queryAll/searchByParent/upsert)
  + la nueva `syncTables`. Las envs se leen DENTRO de las funciones (runtime), para que sirva en el script y en Vercel.

```js
// api/_lib/sync.js — lógica de sincronización Notion → Supabase, COMPARTIDA por
// el cron (api/cron-db-sync.js) y el batch a mano (scripts/sync-notion-supabase.mjs).
// Idempotente (upsert por notion_id). La service key bypassea RLS (solo corre server-side).
import { DBS, MAP } from './notion-map.js';

const NOTION_VERSION = '2022-06-28';

async function notionFetch(path, body) {
  const r = await fetch(`https://api.notion.com/v1/${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.NOTION_TOKEN}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body || {}),
  });
  return { ok: r.ok, status: r.status, json: await r.json().catch(() => ({})) };
}

async function queryAll(dbId) {
  let results = [], cursor;
  do {
    const { ok, json } = await notionFetch(`databases/${dbId}/query`, { page_size: 100, start_cursor: cursor });
    if (!ok) {
      if ((json?.code || '').includes('multiple_data_sources') || json?.message?.includes('data source')) {
        return await searchByParent(dbId);
      }
      throw new Error(`Notion ${dbId}: ${json?.code || json?.message || 'error'}`);
    }
    results.push(...(json.results || []));
    cursor = json.has_more ? json.next_cursor : null;
  } while (cursor);
  return results;
}

async function searchByParent(dbId) {
  const norm = s => (s || '').replace(/-/g, '');
  let results = [], cursor;
  for (let i = 0; i < 5; i++) {
    results = []; cursor = undefined;
    do {
      const { json } = await notionFetch('search', { page_size: 100, start_cursor: cursor, filter: { property: 'object', value: 'page' } });
      results.push(...(json.results || []).filter(p => norm(p.parent?.database_id) === norm(dbId)));
      cursor = json.has_more ? json.next_cursor : null;
    } while (cursor);
    if (results.length) break;
    await new Promise(r => setTimeout(r, 1200));
  }
  return results;
}

async function upsert(table, rows) {
  if (!rows.length) return 0;
  const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
  let done = 0;
  for (let i = 0; i < rows.length; i += 100) {
    const chunk = rows.slice(i, i + 100);
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?on_conflict=notion_id`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify(chunk),
    });
    if (!r.ok) throw new Error(`Supabase ${table}: ${r.status} ${await r.text()}`);
    done += chunk.length;
  }
  return done;
}

// Sincroniza las `tables` indicadas. `dry`: cuenta filas sin escribir. Cada tabla en su try/catch:
// si una falla, las demás igual se sincronizan; el resumen reporta el error por tabla.
export async function syncTables(tables, { dry = false } = {}) {
  const perTable = {};
  let totalOk = 0, totalErr = 0;
  for (const tabla of tables) {
    try {
      const pages = await queryAll(DBS[tabla]);
      const rows = pages.map(pg => MAP[tabla](pg.properties || {}, pg));
      const n = dry ? rows.length : await upsert(tabla, rows);
      perTable[tabla] = { ok: n, err: 0 };
      totalOk += n;
    } catch (e) {
      perTable[tabla] = { ok: 0, err: 1, error: e.message };
      totalErr++;
    }
  }
  return { perTable, totalOk, totalErr, dry };
}
```

- [ ] **Step 2: Adaptar `scripts/sync-notion-supabase.mjs`** a wrapper fino (mismo output, mismo `SYNC_ONLY`):

```js
// FlyClean — Sync Notion → Supabase (CLI). La lógica vive en api/_lib/sync.js (compartida con el cron).
// Uso: NOTION_TOKEN=... SUPABASE_URL=... SUPABASE_SERVICE_KEY=... node scripts/sync-notion-supabase.mjs
//   (opcional: SYNC_ONLY=clientes,servicios)
import { syncTables } from '../api/_lib/sync.js';
import { DBS } from '../api/_lib/notion-map.js';

if (!process.env.NOTION_TOKEN || !process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  console.error('Faltan envs: NOTION_TOKEN, SUPABASE_URL, SUPABASE_SERVICE_KEY');
  process.exit(1);
}
const only = (process.env.SYNC_ONLY || '').split(',').map(s => s.trim()).filter(Boolean);
const tablas = Object.keys(DBS).filter(t => !only.length || only.includes(t));
console.log(`Sync Notion → Supabase · ${tablas.length} tabla(s)\n`);
const { perTable, totalOk, totalErr } = await syncTables(tablas, { dry: false });
for (const t of tablas) {
  const r = perTable[t] || { ok: 0, err: 0 };
  if (r.err) console.error(`  ✗ ${t.padEnd(20)} ${r.error}`);
  else console.log(`  ✓ ${t.padEnd(20)} ${r.ok} fila(s)`);
}
console.log(`\nListo. ${totalOk} fila(s) sincronizadas · ${totalErr} tabla(s) con error.`);
process.exit(totalErr ? 1 : 0);
```

- [ ] **Step 3: Verificar sintaxis** — `cd ~/repos/flyclean-app && node --check api/_lib/sync.js && node --check scripts/sync-notion-supabase.mjs` → Expected: sin salida (exit 0). Confirmar por lectura que la lógica del batch quedó idéntica (queryAll/searchByParent/upsert iguales) y que `SYNC_ONLY` sigue funcionando.

- [ ] **Step 4: Commit** — `git add api/_lib/sync.js scripts/sync-notion-supabase.mjs && git commit -m "refactor: extraer syncTables a _lib/sync.js (compartido cron + batch)"` con el Co-Authored-By.

---

### Task 2: Endpoint cron `api/cron-db-sync.js`

**Files:**
- Create: `api/cron-db-sync.js`

**Interfaces:**
- Consumes: `syncTables` de `./_lib/sync.js` (Task 1).
- Produces: endpoint `GET/POST /api/cron-db-sync` (lo invoca Vercel Cron).

- [ ] **Step 1: Crear `api/cron-db-sync.js`** (patrón de `cron-pipeline.js`: auth `CRON_SECRET` falla cerrado, `?dry=1`):

```js
// /api/cron-db-sync — Cron Vercel (cada 10 min): sincroniza Notion → Supabase para mantener
// el espejo al día (incluido lo editado a mano en Notion). La app sigue 100% en Notion.
// Auth: Vercel Cron manda Authorization: Bearer $CRON_SECRET. Falla CERRADO (sin secreto NO corre).
import { syncTables } from './_lib/sync.js';

const TABLES = ['clientes', 'servicios', 'propuestas', 'ingresos', 'gastos'];

export default async function handler(req, res) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return res.status(500).json({ error: 'CRON_SECRET not configured' });
  if (req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  // Si Supabase no está configurado todavía, no rompe: salta sin error.
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    return res.status(200).json({ skipped: 'supabase no configurado' });
  }
  // ?dry=1 → cuenta filas sin escribir.
  const dry = ['1', 'true', 'yes'].includes(String(req.query?.dry || '').toLowerCase());
  try {
    const result = await syncTables(TABLES, { dry });
    console.log('cron-db-sync', JSON.stringify(result));
    return res.status(200).json(result);
  } catch (e) {
    console.error('cron-db-sync error', e.message);
    return res.status(500).json({ error: e.message });
  }
}
```

- [ ] **Step 2: Verificar sintaxis** — `node --check api/cron-db-sync.js` → Expected: sin salida (exit 0).

- [ ] **Step 3: Commit** — `git add api/cron-db-sync.js && git commit -m "feat: cron /api/cron-db-sync (Notion→Supabase cada 10min, auth CRON_SECRET)"` con el Co-Authored-By.

---

### Task 3: Registrar el cron en `vercel.json` (cada 10 min) + maxDuration

**Files:**
- Modify: `vercel.json` (bloque `crons` + bloque `functions`)

**Interfaces:**
- Consumes: el endpoint `api/cron-db-sync.js` (Task 2).
- Produces: la entrada de cron que Vercel ejecuta cada 10 min.

- [ ] **Step 1: Sumar la entrada al array `crons`** de `vercel.json` (junto a las 3 existentes):

```json
{ "path": "/api/cron-db-sync", "schedule": "*/10 * * * *" }
```

- [ ] **Step 2: Agregar `maxDuration` para el endpoint** (el sync full de 5 tablas puede pasar el default). Sumar/extender el bloque `functions` en `vercel.json`:

```json
"functions": {
  "api/cron-db-sync.js": { "maxDuration": 60 }
}
```
(Si `vercel.json` ya tiene un bloque `functions`, agregá esta clave dentro; no lo dupliques.)

- [ ] **Step 3: Verificar que el JSON es válido** — `node -e "JSON.parse(require('fs').readFileSync('vercel.json','utf8')); console.log('vercel.json OK')"` → Expected: `vercel.json OK`. Confirmar por lectura que el array `crons` tiene ahora 4 entradas y la nueva schedule es `*/10 * * * *`.

- [ ] **Step 4: Commit** — `git add vercel.json && git commit -m "chore: registrar cron-db-sync cada 10min en vercel.json"` con el Co-Authored-By.

---

## Verificación final (post-deploy — la hace el controller/Diego)
1. Deploy (merge a main + push). Vercel toma el cron nuevo.
2. **Dry-run manual:** `curl -H "Authorization: Bearer $CRON_SECRET" "https://flyclean.app/api/cron-db-sync?dry=1"` → debe devolver el resumen `perTable` con conteos por base, sin escribir.
3. **Corrida real + conteos:** dejar correr un ciclo (o llamar sin `?dry`) → comparar filas en Supabase vs Notion por tabla (que cuadren).
4. **Logs de Vercel:** confirmar que el cron corre cada 10 min y no falla.
5. **Batch a mano:** `node scripts/sync-notion-supabase.mjs` sigue funcionando idéntico (con las envs).
