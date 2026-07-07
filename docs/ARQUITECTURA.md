# Arquitectura — FlyClean App

App **PWA mobile-first sin framework ni build step**. Todo el frontend vive en un único
`index.html` (HTML + CSS + JS + i18n). El backend son **funciones serverless** en `api/`
(Vercel). Los datos se **escriben en Notion** (fuente de verdad) y se **leen de un espejo
Supabase/Postgres** (RLS por país; sync Notion→Supabase por cron cada 10 min) para
clientes/servicios/propuestas; las fotos en **Cloudflare R2**. (Ver `db/README.md` para el estado de la migración.)

## Flujo de datos

```
                         ┌─────────────────────────────┐
   Navegador (index.html)│  PWA: pantallas por rol      │
   ── PIN login ────────►│  Operario · Coord · CEO · Adm │
                         └──────────────┬──────────────┘
        lecturas/escrituras Notion      │ fotos (binario directo)
                  │                      │
                  ▼                      ▼
        /api/notion (proxy)      /api/upload-url (presigned PUT)
        oculta NOTION_TOKEN              │
                  │                      ▼
                  ▼                Cloudflare R2  ──►  cdn.flyclean.app
            Notion API                              (las fotos se sirven al PDF
                                                     vía /api/img, same-origin)
```

## Endpoints serverless (`api/`)

| Archivo | Ruta | Qué hace |
|---|---|---|
| `notion.js` | `/api/notion` | Proxy a la API de Notion. Oculta `NOTION_TOKEN`. **Allow-list** de endpoints (regex) + métodos GET/POST/PATCH. Timeout 9s + reintento ante 429/5xx. Fallback multi-data-source para Servicios. |
| `upload-url.js` | `/api/upload-url` | Emite PUT presignados a R2. Valida origen, MIME (jpeg/png/webp/heic + pdf para recibos) y `fotoType`. |
| `img.js` | `/api/img?u=` | Proxy de imágenes same-origin (allow-list a `cdn.flyclean.app`). Lo usa el PDF de devolución. `redirect:'manual'` (anti-SSRF). |
| `extract-receipt.js` | `/api/extract-receipt` | OCR de recibos de gastos con Claude (Anthropic). Defensa anti-prompt-injection + sanitización server-side. |
| `verify-pin.js` | `/api/verify-pin` | Valida `{id, pin}` (prioridad **KV**, fallback `USER_PINS`); si OK emite **token de sesión** (HMAC). Rate-limit básico. |
| `set-pin.js` | `/api/set-pin` | El usuario cambia SU PIN (exige sesión + PIN actual). Guarda hash scrypt en KV. |
| `admin-set-pin.js` | `/api/admin-set-pin` | Un **admin** (allow-list `ADMIN_IDS`) setea/resetea el PIN de OTRO usuario → KV. No pide el anterior. |
| `version.js` | `/api/version` | `{ web, minApkRequired }` — el APK (TWA) consulta si está desactualizado. |
| `cron-pipeline.js` | cron diario | Mueve propuestas +45d a "Sin respuesta", marca +15d para re-contactar, email si hay novedades. |
| `cron-report.js` | cron viernes/lunes | Email de resumen/pendientes al CEO. |
| `_lib/notion.js`, `_lib/email.js` | — | Helpers de los crons (no son rutas, prefijo `_`). `email.js` usa Resend. |

## Resiliencia de datos (clave)

La app **no muere** si Notion tarda o cae, gracias a 3 capas:

1. **Service worker (`sw.js`) stale-while-revalidate** para lecturas `/api/notion`: devuelve el
   cache al instante y revalida por detrás. La constante `CACHE = 'flyclean-vNN'` versiona el
   shell — **bumpearla invalida los clientes**. Writes nunca se cachean.
2. **Cola offline (IndexedDB `writeQueue`)**: las escrituras sin conexión se encolan
   (`enqueueWrite`), se reintentan al volver `online` y cada 30s, con tope de reintentos.
3. **Proxy con timeout + reintento** (`api/notion.js`): AbortController 9s, respeta `Retry-After`.

## Bilateralidad con Notion (la app es un espejo vivo)

La app **lee y escribe** Notion en ambos sentidos:
- **App → Notion**: cada guardado hace `PATCH`/`POST` vía `/api/notion` (altas de cliente/propuesta/servicio/
  ingreso, ediciones, asociaciones). Al **deseleccionar** un campo opcional se escribe `null` → se borra en
  Notion (no solo se agrega). Obligatorios: `País` y `Estado`.
- **Notion → App**: cada pantalla **consulta Notion** al renderizar (con el SW stale-while-revalidate: muestra
  cache al instante y revalida por detrás). Lo que se edita en Notion aparece en la app al refrescar.
No es push en tiempo real, pero a efectos de CRM es un espejo vivo (un solo origen de datos = Notion).

## Quirks pinneados (NO romper)

- **R2 / checksum**: el cliente S3 de `upload-url.js` usa `requestChecksumCalculation: 'WHEN_REQUIRED'`.
  Quitarlo hace que R2 devuelva un error engañoso (`"Credential access key has length 33"`) en el PUT.
- **Notion "multiple data sources"**: la DB Servicios tiene sub-items → la query directa falla con
  `multiple_data_sources_for_database`. El proxy cae a la **search API** y filtra por `parent.database_id`
  (con reintentos, porque la search devuelve vacío bajo rate-limit).
- **Constraints de la API de Notion** (ya manejados): no incluir `is_datetime` en fechas (lo rechaza);
  `Condición climática` es `multi_select` (no `select`); `% de avance` no es escribible por API.
- **Clave de cache del SW**: usa el body de la request por `?k=` (NO un fragmento `#`, que el
  navegador descarta → consultas pisándose). Ver historia en `sw.js`.

## Modelo de roles / auth (estado actual, 2026-06-25)

Los roles (Operario · Coordinador · CEO · Administración/Finanzas · Dirección) son **client-side**
(qué pantallas ve cada usuario; `const USERS` en `index.html`, sin PINs).

- **Login + sesión**: `verify-pin.js` valida `{id, pin}` y, si OK, **emite un token de sesión firmado
  (HMAC)**. El cliente lo manda en cada pedido; `api/notion`, `upload-url`, `extract-receipt` y
  `admin-set-pin` **exigen** ese token → cerró el viejo agujero de "autentica solo por CORS" (YA NO es deuda).
- **PINs**: prioridad **KV** (hash scrypt, `_lib/pins.js`) sobre el default `USER_PINS` (env, legacy).
  El usuario cambia el suyo (`set-pin.js`); un **admin** (allow-list `ADMIN_IDS`) setea/resetea el de
  otros **desde la app** (`admin-set-pin.js` → KV), en CEO→Equipo ("🔑 Cuentas de acceso"). No se edita
  el env a mano.
- **Aislamiento multi-país (socios)**: cada usuario no-UY ve **solo su país** (helpers `finRecEnPais` para
  Gastos/Ingresos y `recEnPaisNotion` para Servicios/Contactos); UY (HQ) incluye registros sin país;
  Dirección + CEO-UY ven global (`ceoViewCountry='all'`).
