# Runbook operativo — FlyClean

Guía mínima para levantar, deployar y operar la app sin el autor original.

## Levantar local

```bash
git clone https://github.com/flycleanuy-dev/flyclean-app
cd flyclean-app
npm install
cp .env.example .env.local   # completar valores reales (ver abajo)
vercel dev                   # corre frontend + funciones serverless en local
```

Para solo-UI (sin backend), abrir `index.html` directo en el navegador (las llamadas a `/api/*`
fallarán sin el proxy).

## Variables de entorno

Definidas en `.env.example` (sin valores). Se cargan en **Vercel → Settings → Environment Variables**.

| Variable | Para qué |
|---|---|
| `NOTION_TOKEN` | Token de la integración de Notion (lo usa `/api/notion`). |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` | Credenciales de Cloudflare R2 (fotos). |
| `R2_PUBLIC_URL` | Base pública del CDN (`https://cdn.flyclean.app`). |
| `USER_PINS` | JSON `{ "<id>": "<pin>" }` — PINs **default/legacy** (Uruguay). ⚠️ Es **Sensitive** (write-only) → NO editarlo a mano. Los cambios/altas reales van a KV (gestión desde la app). |
| `KV_REST_API_URL`, `KV_REST_API_TOKEN` | Vercel KV (Upstash REST). PINs hasheados (scrypt) con **prioridad** sobre `USER_PINS`. Los setea la app: `/api/set-pin` (propio) y `/api/admin-set-pin` (admin a otros). |
| `ADMIN_IDS` | (opcional) ids que pueden resetear PINs ajenos vía `/api/admin-set-pin`. Default: `diego-laxalt,eduardo-cabral`. |
| `CRON_SECRET` | Bearer que Vercel manda a los crons (obligatorio: fallan cerrado sin él). **También deriva** la clave de firma del **token de sesión** del login (no hay env aparte; ver `_lib/session.js`). ⚠️ Vive en DOS lados: Vercel env + GitHub Secrets (CI). Rotarlo desloguea a todo el equipo (re-ingresan su PIN una vez). |
| `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `SUPABASE_ANON_KEY`, `SUPABASE_JWT_SECRET` | El espejo de lectura (Postgres + RLS por país). Las usan `api/db.js`, `api/db-sync.js` y el cron `cron-db-sync`. |
| `RESEND_API_KEY`, `RESEND_FROM` | Envío de emails (avisos/reportes). |
| `ANTHROPIC_API_KEY` | OCR de recibos (`/api/extract-receipt`). |

## Deploy

```bash
git push origin main          # Vercel auto-deploya a producción
```

- Flujo recomendado: **rama → PR → CI verde → merge a main**. El CI (`.github/workflows/ci.yml`)
  corre `npm ci`, `npm audit --audit-level=high`, `node --check` de `api/*.js` y el chequeo de
  sintaxis de `index.html`.
- Cada PR genera un **preview** en Vercel (protegido por login de Vercel).

## Rollback de un deploy roto

1. **Sin código (lo puede hacer un no-programador):** vercel.com → proyecto `flyclean-app` →
   **Deployments** → elegir el último deployment anterior *Ready* que funcionaba → menú `…` →
   **"Promote to Production"**. La app vuelve a esa versión al instante.
2. **Con código (el fix definitivo):** `git revert <commit>` + `git push origin main` (Vercel
   re-deploya). Si el revert toca `index.html`, bumpear `CACHE` en `sw.js` para invalidar clientes.
3. Caso especial — solo el candado de permisos roto (todos ven "forbidden"): `ENFORCE_PERMS = false`
   en `api/notion.js` + push (rollback de una línea, no toca la matriz).

Emergencias, inventario de accesos y rotación de secretos: ver el **Playbook de Continuidad**
(fuera del repo, en la carpeta de trabajo: `PLAYBOOK-CONTINUIDAD.md`).

## Versionado

Al cambiar funcionalidad web, bumpear **los tres** para mantenerlos en sync:
- `APP_VERSION` en `index.html` (footer visible).
- `CACHE = 'flyclean-vNN'` en `sw.js` (invalida el cache de los clientes).
- `APP_VERSION` en `api/version.js` (lo lee el version-gate del APK).

## Cron jobs (Vercel Pro)

Declarados en `vercel.json` → `crons`. Vercel manda `Authorization: Bearer $CRON_SECRET`.
- `cron-pipeline` — diario 11:00 UTC (pipeline de propuestas).
- `cron-report` — viernes 21:00 UTC (resumen) / lunes 11:00 UTC (pendientes).

Test manual (con el secreto): `curl -H "Authorization: Bearer $CRON_SECRET" ".../api/cron-pipeline?dry=1"`.

## Tests

```bash
npm test        # smoke contra prod (home + version + las bases de Notion). SOLO LECTURA.
npm run check   # valida la sintaxis del JS embebido en index.html
```

`tests/smoke.mjs` deriva los IDs de las bases de `index.html` (no los duplica).

## APK (TWA) — pospuesto

El keystore (`flyclean.keystore`) y su passphrase **no están en el repo**: viven en la carpeta
de trabajo del autor + backup encriptado en R2 + 1Password. El `assetlinks.json` con el SHA-256
real está publicado en `/.well-known/`. Empaquetado vía pwabuilder.com cuando se decida.

## Identidades / accesos

- GitHub org: `flycleanuy-dev`. Vercel scope: `fly-clean-app-s-projects`.
- Dominio: `flyclean.app` (Cloudflare). CDN de fotos: `cdn.flyclean.app` (R2 custom domain).
- LICENSE: propietaria, a nombre de FLYCLEAN S.A.S.

## Continuidad / Emergencias (bus factor)

Si el autor original no está disponible, ver el **Playbook de Continuidad** (fuera del repo, en la carpeta de
trabajo: `PLAYBOOK-CONTINUIDAD.md`) y la bóveda **1Password "FlyClean Emergencias"** (a futuro). Ahí está el
inventario completo de accesos y el "si pasa X → hacé Y".

- **Respaldo NO técnico:** Eduardo Cabral (CEO) — admin de la app (resetea PINs en CEO→Equipo→🔑) + lo administrativo.
- **Respaldo técnico:** programador de "guardia" (a definir) — deploys/bugs/caídas; deploy = `git push` a `main` (ver arriba).
- Todos los secretos/valores reales viven en Vercel (Sensitive) y, a futuro, en 1Password — **nunca en el repo**.

## Matriz de permisos por rol (monitor → enforce)

Desde sw v124, `/api/notion` evalúa cada request contra `api/_lib/permisos.js` (matriz rol→bases).
Con **`ENFORCE_PERMS = false`** (api/notion.js) solo LOGUEA lo que denegaría, sin bloquear.

**Ampliado 2026-07-07 (auditoría Codex, main 999da29):** el modo monitor ahora cubre TAMBIÉN `PATCH pages/{id}`
para roles no-Ventas (antes quedaba fuera de la matriz — hueco residual del hallazgo Codex #2): verifica el
parent real de la página y checa permiso de escritura, logueando `[perms] DENEGARÍA` con `tipo: 'page-patch'`.
Igual que la matriz de query: en monitor solo loguea. (El GET de una página individual sigue como residual menor.)

**Ronda 2 (main 8ee6c4d):** (a) **`/api/db` aplica la matriz en ENFORCE DIRECTO** (sin monitor — cerró la fuga
de ingresos/gastos a cualquier autenticado; log `[perms] DENEGADO /api/db` al bloquear; rollback = comentar el
bloque `RESOURCE_DB` en `api/db.js`). (b) El PATCH pages/{id} agrega checks de **página**: `page-patch-pais`
(país de la página vs usuario — 403 bajo enforce) y `page-patch-owner` (operario que edita un servicio ajeno —
SOLO log, decidir en el flip si se enforcea; puede haber ayudantes legítimos). (c) `tests/permisos.mjs` cubre
`/api/db` (queryEspejo). Al revisar los logs para el flip, mirar los 3 tipos: `page-patch`, `page-patch-pais`, `page-patch-owner`.

**Para prender el candado (PENDIENTE — Fase 3, tras 2-3 días de observación desde el 2026-07-07):**
1. Con uso real del equipo (mínimo 2-3 días hábiles), revisar los logs:
   `vercel -Q ~/.config/vercel-flyclean logs flyclean-app | grep '\[perms\] DENEGARÍA'`
   Mirar en especial los `tipo: 'page-patch'` (flujos legítimos de edición que la matriz no contemple).
2. Cada warn = un flujo real que la matriz no contempló → agregarlo a `api/_lib/permisos.js` (con
   evidencia función→DB en la cabecera, como el resto).
3. Cuando haya 0 warns con uso normal → `ENFORCE_PERMS = true` + deploy.
4. Rollback instantáneo: volver el flag a `false` (sin tocar la matriz).

**Tests de permisos**: `npm test` incluye `tests/permisos.mjs` (sin token→401 + backstop Ventas +
casos por rol). Los casos autenticados necesitan la clave de firma real:
`CRON_SECRET=<valor de Vercel> node tests/permisos.mjs`. Al prender enforce, flipear `EXPECT_ENFORCE=true`.

---

## Supabase-first (Fases 3a PATCH + 3b creates — flujo diario resiliente a Notion, 2026-07-22)

**Qué es:** las EDICIONES (PATCH) de las tablas listadas en el env `SUPAFIRST_TABLES` (CSV) guardan PRIMERO en
el espejo Supabase (RPC `merge_props`, merge atómico `raw||patch` normalizado) y la propagación a Notion es
async vía la tabla `outbox_notion`, drenada por `api/cron-outbox.js` (cron cada 1 min, coalescing por página,
retry con backoff, veneno a los 8 intentos → `status='error'`). Las lecturas `pages/{id}` de tablas flipeadas
también se sirven del espejo. Los creates siguen Notion-first + mirror (hasta 3b). Notion queda DOWNSTREAM:
puede caerse o romperse sin frenar a la app.

**Estado actual (2026-07-22 — flujo diario resiliente COMPLETO):**
- PATCH espejo-first: `SUPAFIRST_TABLES=servicios,clientes,propuestas,ingresos` (los 4 flips verificados en vivo).
- Creates con fallback (Fase 3b): `CREATE_FALLBACK_TABLES=clientes,servicios,propuestas` — las ALTAS aguantan
  una caída de Notion (ver «Notion caído — playbook» abajo).
- Meta espejo-first (Etapa 0): `MIRROR_META_FIRST=1` — los PATCH de tablas flipeadas ya NO piden meta a Notion
  para validar permisos (antes eso mataba las ediciones con Notion caído).
- Crons y KPIs desde el espejo: `REPORT_FROM_MIRROR=1` + `PIPELINE_FROM_MIRROR=1` (emails y auto-move 45d/aviso
  15d leen propuestas/servicios/ingresos del espejo) + `DB_FLAGS.kpifecha` (tableros CEO/Finanzas con filtro de
  fecha leen el espejo).
- `MIRROR_ON_WRITE=1` (espejo garantizado para lo no-flipeado) · `SUPAFIRST_VERBOSE=1` (log `[supafirst] ok`).
- **GASTOS sigue create-only Notion-first** (canal del cowork; la app no edita gastos) — fuera del fallback v1.
- Rollback de cualquier pieza = borrar SU env + redeploy (todo por-flag, reversible). NUNCA con outbox pendiente.

**GASTOS no se flipea** (decisión 15/07, no es solo el contrato del cowork): la app **no edita gastos** —
son create-only desde el front (cero PATCH) → flipearlo agrega superficie sin ningún beneficio.

**El sync de las tablas flipeadas NO se excluye: corre en modo SOLO-ALTAS** (`syncTables({altasOnly})`,
`api/_lib/sync.js`) → las filas que el cowork agrega directo en Notion siguen entrando al espejo, sin pisar
los `mergeProps` frescos. Y `reconcileDeletes` NO corre sobre resultados del search fallback (índice
eventualmente consistente → podría borrar filas recién creadas).

**Monitoreo (convivencia):**
```
vercel -Q ~/.config/vercel-flyclean logs <deploy-prod> --json | grep -E '\[supafirst\]|\[mirror\]|\[outbox\]'
```
- `[supafirst] ok` = guardado por el camino nuevo (esperado). `fail/error/notfound/enqueue` = cayó a
  Notion-first (el fallback aplica solo el DELTA al espejo — sin data-loss); investigar si se repite.
- Veneno del outbox: filas `status='error'` en `outbox_notion` (SQL editor) = ediciones que no llegaron a
  Notion (la app NO se entera; Notion queda atrás). Revisar `last_error`.

**Rollback (por tabla, sin deploy):** 1) verificar outbox drenado (0 `pending` de esa tabla en `outbox_notion`);
2) quitar la tabla del env `SUPAFIRST_TABLES` + redeploy → vuelve Notion-first+mirror y `cron-db-sync` re-incluye
la tabla automáticamente (mismo env). NUNCA rollback con outbox pendiente (se perdería lo no propagado).

**Creates con fallback (Fase 3b) — cómo funciona:** un POST de alta va Notion-first (timeout ~6,5s, sin retry).
Si Notion falla (red/timeout/5xx/429 — NO un 4xx de validación) → se inserta la fila en el espejo con un **UUID
local** (misma forma que un id de Notion → pasa allow-list/regex/caché sin tocar el front) + `id_map(local→null)`
+ una fila `op:'create'` en `outbox_notion`, TODO atómico (RPC `enqueue_create`). El worker (`cron-outbox`, 1
min) crea la página real en Notion, dedup por `App UID` (property rich_text en cada DB flipeada, inyectada por el
proxy), back-fillea el `notion_id` real (uuid→real) y re-keyea el outbox pendiente. El cliente guarda el uuid para
siempre → el proxy traduce uuid→real en TODOS los verbos.

### Notion caído — playbook (qué sigue funcionando, qué revisar, cómo verificar la recuperación)

**Con Notion caído, la app sigue operando:** el operario agenda/inicia/foto/cierra; el coord crea clientes,
servicios (desde propuesta o sueltos) y edita; Ventas/CRM edita contactos y propuestas; Finanzas registra cobros;
el CEO ve sus tableros; los emails/crons corren desde el espejo. Todo se guarda en Supabase y se propaga a Notion
cuando vuelve. Lo ÚNICO que aún necesita Notion: borrar/archivar (trash) y GASTOS (create-only Notion-first).

**Qué revisar durante/después de un apagón de Notion (SQL editor de Supabase):**
```sql
-- Altas locales aún sin propagar (deberían drenar a 0 cuando Notion vuelve):
select resource, count(*) from id_map where notion_id is null group by resource;
-- Outbox: creates/patches pendientes y ENVENENADOS (lo que hay que mirar):
select op, status, count(*) from outbox_notion group by op, status;
select notion_id, op, attempts, last_error from outbox_notion where status='error';
```
El worker manda **un email** cuando hay `status='error'` (veneno). `id_map` con `notion_id=null` = altas que viven
solo en el espejo hasta que el worker cree la página en Notion.

**Verificación de recuperación (cuando Notion vuelve, ≤5 min):** cada registro aparece UNA vez en Notion, las
relaciones quedan bien, `id_map` sin pendientes (`notion_id is null` → 0), `outbox_notion` sin `pending`/`error`,
y el sync siguiente NO duplica ni borra. Si algo quedó en `error`, ver `last_error` y (si es transitorio) volver
a encolar el grupo bajando su `status` a `pending`; si es un 4xx real de Notion, corregir el dato y reintentar.

**Simulacro (drill):** `NOTION_FAKE_DOWN=1` fuerza un 503 sintético — **guardado a NO-producción** (solo preview/
local). Para correrlo hay que firmar un token de sesión con el `CRON_SECRET` real contra un preview. Por eso el
drill NO se corre desde prod: la garantía de cada etapa fue el review adversarial + los tests in-process en CI.

**Regla de oro:** NUNCA hacer rollback de un flag (SUPAFIRST/CREATE_FALLBACK) con outbox pendiente — se perdería
lo no propagado. Primero drenar (`outbox_notion` sin `pending` de esa tabla), después sacar el env + redeploy.

**Lección del incidente 2026-07-11 (formato write vs read):** el front escribe `title/rich_text` SIN
`plain_text`; el espejo debe normalizar SIEMPRE (`normalizePatchForRaw` en `api/_lib/supafirst.js`). Si una
etiqueta aparece vacía/"Sin nombre" tras un guardado, revisar esa normalización primero. Y la regla F1: los
sheets escriben SOLO campos modificados — una lectura rota jamás re-escribe fallbacks como datos.

---

## Destinatarios de reportes por email (⚙️ Configuración, 2026-07-11)

Los emails de los cron (`cron-report` viernes/lunes, `cron-pipeline` diario) salen a la lista editable en
**menú de cuenta ⋯ → ⚙️ Configuración → 📬 Destinatarios de reportes** (solo admins = env `ADMIN_IDS`).
- Storage: KV `email:recipients:v1` (JSON `{semanal:[],lunes:[],pipeline:[]}`), endpoint `api/email-recipients.js`
  (GET/POST admin-only, guardas clonadas de admin-set-pin, emails validados anti-inyección, máx 10/tipo).
- **Fallback fail-safe**: lista vacía o KV caído → los cron usan las constantes históricas
  (`cron-report.js` CEO_EMAIL=Diego; `cron-pipeline.js` Federico+Diego). Los reportes NUNCA dejan de salir.
- Test manual de un reporte: `curl -H "Authorization: Bearer $CRON_SECRET" "https://www.flyclean.app/api/cron-report?tipo=viernes&to=<email>"`
  (el `?to=` puentea la lista solo con CRON_SECRET).

## Menú de cuenta (⋯) — dónde vive cada cosa (2026-07-11)

El chip de usuario (los 4 headers) abre `account-menu-overlay`: Cambiar PIN · Idioma (toggle solo Brasil) ·
Cambiar región (confirma) · Buscar actualización · ⚙️ Configuración (solo `isAppAdmin`, acoplado a env
`ADMIN_IDS` — si se cambia la env, actualizar `isAppAdmin()` en index.html) · **Cerrar sesión (confirma)**.
Ya NO existe logout directo de un toque (chips, ← Finanzas, ← CEO puro → todos abren el menú).

## Configuración del negocio (⚙️ → Reglas/Checklist/WhatsApp, 2026-07-11)

Reglas (umbrales de días), checklist del operario y plantillas de WhatsApp son EDITABLES por admins
(`ADMIN_IDS`) en ⚙️ Configuración. Storage: KV `config:app:v1` (endpoint `api/app-config.js`).
**Fail-safe total**: KV vacío/caído → el front usa `APP_CFG_DEFAULTS` + las listas de código, y
`cron-pipeline` sus consts 15/45 — borrar la clave KV = volver al comportamiento histórico (rollback
instantáneo sin deploy). El front carga la config al login (`loadAppConfig`, timeout 3s). Los cambios de
reglas aplican al instante en la app y en la PRÓXIMA corrida del cron diario.

## Sistema de reportes de errores / 💬 Soporte (desde v217/v224)

- **Tabla:** Supabase `reportes` (RLS cerrado; solo service key server-side). Columnas clave: tipo
  (`auto`=error JS · `manual`=mensaje del equipo · `detalle`=texto anexo a un error), usuario/rol/país
  (resueltos SERVER-side del token), pantalla/tab/version, mensaje, stack (con ` @ archivo:línea:col`),
  estado (`nuevo`→`visto`→`resuelto`), err_hash.
- **Emails:** tipo 'reportes' en los destinatarios editables (⚙️ del admin); fallback al email del CEO.
  `auto` dedupea por error+día (KV `err:<hash>:<yyyymmdd>`); `manual`/`detalle` avisan SIEMPRE.
- **Bandeja:** menú de cuenta → 💬 Soporte (o tab Mensajes). Dirección (`ADMIN_IDS`) ve todo y marca
  estados; el resto solo los suyos.
- **Triage (regla operativa):** BOOT+UA moderno+madrugada+desktop = probable bot (ver caso #5, 19/07) →
  visto. Si reaparece patrón con UA repetido o usuario logueado → considerar bajar `build.target` (Vite)
  o pantalla "navegador no soportado".
- **Consulta rápida (curl):** `GET $SUPABASE_URL/rest/v1/reportes?estado=eq.nuevo&order=creado.desc`
  con headers apikey+Bearer del service key.
