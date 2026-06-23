# FlyClean App

PWA (app web instalable) para la operación de **FlyClean** — limpieza de fachadas, vidrios y paneles solares con drones. La usan los operarios en campo, los coordinadores, la dirección/CEO y administración/finanzas. Multi-país (Uruguay, Brasil, Panamá, Guatemala, México).

- **Producción:** https://flyclean.app · https://www.flyclean.app
- **Hosting:** Vercel (proyecto `fly-clean-app-s-projects/flyclean-app`)
- **Datos:** Notion (vía un proxy serverless) · **Fotos/recibos:** Cloudflare R2 (`cdn.flyclean.app`)

---

## Qué es y cómo está armado

No hay framework ni paso de build del frontend: **todo el frontend es un solo archivo** (`index.html`), mobile-first, con Service Worker para funcionar como PWA instalable y offline-tolerante. El backend son **funciones serverless** en `api/` (Vercel).

```
Navegador (index.html, PWA)
   │  POST /api/notion         → proxy que esconde el NOTION_TOKEN y habla con Notion
   │  POST /api/upload-url     → URL firmada para subir fotos directo a Cloudflare R2
   │  POST /api/extract-receipt→ OCR de recibos con Claude (Anthropic)
   │  GET  /api/img            → proxy de imágenes (same-origin) para el PDF/galerías
   └─ crons (Vercel) → /api/cron-pipeline, /api/cron-report (emails con Resend)
```

| Archivo / carpeta | Qué hace |
|---|---|
| `index.html` | Frontend completo (UI + lógica). Pantallas por rol; i18n es/pt. |
| `sw.js` | Service Worker. Cachea el "shell" + lecturas de Notion (stale-while-revalidate). Versionado `flyclean-vNN`. |
| `api/notion.js` | Proxy a la API de Notion (allow-list de endpoints; timeout + reintentos). |
| `api/upload-url.js` | Genera URLs firmadas (PUT) a R2 para subir fotos/recibos. |
| `api/extract-receipt.js` | OCR de recibos con Claude. |
| `api/img.js` | Proxy de imágenes same-origin (allow-list a `cdn.flyclean.app`). |
| `api/version.js` | Endpoint público de versión (lo usa el APK/TWA). |
| `api/cron-pipeline.js`, `api/cron-report.js` | Automatizaciones por cron (mover propuestas, emails). |
| `api/_lib/` | Helpers compartidos de los crons (`notion.js`, `email.js`). |
| `vendor/jspdf.umd.min.js` | jsPDF self-hosted (genera el PDF de devolución en el cliente). |
| `manifest.json`, `icon-*.png`, `splash.png` | PWA installable. |
| `privacy.html`, `terms.html`, `.well-known/assetlinks.json` | Legales + Digital Asset Links (APK). |
| `vercel.json` | Headers de seguridad, `cleanUrls`, y los `crons`. |

---

## Levantarlo en local

Requisitos: **Node 20.x** y la [CLI de Vercel](https://vercel.com/docs/cli) (`npm i -g vercel`).

```bash
git clone https://github.com/flycleanuy-dev/flyclean-app.git
cd flyclean-app
npm install                 # instala las deps de las funciones serverless (desde package-lock.json)
cp .env.example .env.local  # y completá los valores (ver abajo)
vercel dev                  # levanta el front + las funciones /api en local
```

> Para trabajo solo de UI podés abrir `index.html` directo en el navegador, pero los llamados a `/api/*` van a fallar sin el proxy: para probar end-to-end usá `vercel dev`.

### Variables de entorno

Se configuran en el panel de Vercel (Production) y, para local, en `.env.local`. Ver `.env.example`:

| Variable | Para qué |
|---|---|
| `NOTION_TOKEN` | Token de la integración de Notion (lo usa el proxy). **Secreto.** |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` | Credenciales de Cloudflare R2 (subida de fotos). **Secretas.** |
| `R2_BUCKET_NAME` | Nombre del bucket R2. |
| `R2_PUBLIC_URL` | URL pública del bucket (ej. `https://cdn.flyclean.app`). |
| `CRON_SECRET` | Token que Vercel manda en cada cron (`Authorization: Bearer ...`). **Secreto.** |
| `ANTHROPIC_API_KEY` | Clave de Anthropic (OCR de recibos). **Secreta.** |
| `RESEND_API_KEY`, `RESEND_FROM` | Envío de emails (Resend). Sin la key, los emails se saltean sin romper. |

---

## Deploy

El deploy es automático: **push a `main`** → Vercel construye y publica.

```bash
git push origin main
```

Cuando cambia `index.html` o `sw.js`, **subí el número de versión del Service Worker** (`const CACHE = 'flyclean-vNN'` en `sw.js`) para que los clientes con la PWA instalada reciban la versión nueva.

---

## Convenciones útiles

- **Monedas:** los pesos (UY$) y los dólares (USD) **nunca se mezclan**; se muestran y suman por separado.
- **Multi-país:** la segmentación es por una property `País` y por el campo `country` del array `USERS` — nunca duplicando bases ni código.
- **Brasil:** los documentos para clientes brasileños van en portugués.
- Los IDs de las bases de Notion están centralizados (ver `NOTION_DBS` en `index.html`).

## Documentación

- [`docs/ARQUITECTURA.md`](./docs/ARQUITECTURA.md) — flujo de datos, endpoints serverless y quirks pinneados.
- [`docs/NOTION.md`](./docs/NOTION.md) — bases, IDs, esquema de Servicios y mapa de relaciones.
- [`docs/RUNBOOK.md`](./docs/RUNBOOK.md) — levantar local, variables de entorno, deploy, crons, versionado.

## Tests

```bash
npm test      # smoke (node fetch, solo lectura — no tocan datos de Notion)
npm run check # valida la sintaxis del JS embebido en index.html
```

## Licencia

Software propietario de FLYCLEAN S.A.S. Ver [`LICENSE`](./LICENSE).
