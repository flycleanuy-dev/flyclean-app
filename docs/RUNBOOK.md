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
| `CRON_SECRET` | Bearer que Vercel manda a los crons (obligatorio: fallan cerrado sin él). **También deriva** la clave de firma del **token de sesión** del login (no hay env aparte; ver `_lib/session.js`). |
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

**Para prender el candado (v125):**
1. Con uso real del equipo (mínimo 2-3 días hábiles), revisar los logs:
   `vercel -Q ~/.config/vercel-flyclean logs flyclean-app | grep '\[perms\] DENEGARÍA'`
2. Cada warn = un flujo real que la matriz no contempló → agregarlo a `api/_lib/permisos.js` (con
   evidencia función→DB en la cabecera, como el resto).
3. Cuando haya 0 warns con uso normal → `ENFORCE_PERMS = true` + bump sw + deploy.
4. Rollback instantáneo: volver el flag a `false` (sin tocar la matriz).

**Tests de permisos**: `npm test` incluye `tests/permisos.mjs` (sin token→401 + backstop Ventas +
casos por rol). Los casos autenticados necesitan la clave de firma real:
`CRON_SECRET=<valor de Vercel> node tests/permisos.mjs`. Al prender enforce, flipear `EXPECT_ENFORCE=true`.
