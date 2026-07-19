# Arquitectura — FlyClean App

> **Actualizado 2026-07-19 (sw v227)** tras la modularización completa del frontend y la fase CEO.
> Complementa a `FUNCIONALIDADES.md` (qué hace la app), `NOTION.md` (datos) y `RUNBOOK.md` (operar).

App **PWA mobile-first sin framework** (vanilla JS) con **build Vite** (`npm run build` → `dist/`,
nombres de assets FIJOS sin hash porque el service worker precachea rutas literales). El frontend son
**23 archivos ES-modules en `src/`** (ver mapa abajo). El backend son **funciones serverless** en `api/`
(Vercel). Datos: **4 tablas editan Supabase-first** (espejo Postgres con RLS por país; la propagación a
Notion va por una cola durable `outbox_notion`) y el resto escribe Notion directo con espejo de lectura;
fotos en **Cloudflare R2**. Deploy: push a `main` → Vercel (ver RUNBOOK).

## Mapa de módulos del frontend (`src/`) — la verdad desde 2026-07-18

La app se partió del monolito (index.html 17.400 líneas el 13/07) en módulos con el **PATRÓN PUENTE**:
el estado compartido y las consts viven en `main.js`; cada módulo recibe un objeto `M` vía `initXXX(bridge)`
con getters/setters vivos + las funciones de main como alias. Las hojas (`util`, `i18n`, `calculos`, `api`)
se importan directo. `scripts/gen-globals.cjs` publica en `window` SOLO lo que los handlers inline usan
(funciones por `Object.assign`, estado por accesores vivos) — se regenera en cada build y
`tests/globals.test.mjs` + `tests/no-undef.test.mjs` (que también caza errores de sintaxis y puentes rotos)
lo blindan.

| Módulo | Líneas | Qué contiene |
|---|---:|---|
| `main.js` | ~4.760 | Config/estado compartido, USERS+login/PIN/sesión, router de tabs (setCoordTab/loadCEO), sheet de edición del servicio (openEditSheet + pickers piloto/operarios), newSvc ("＋ Nuevo trabajo"), documentos, config ⚙️, menú de cuenta, bloque @globals generado |
| `operario.js` | 1.935 | **El motor de campo**: lista+agenda piloto, openService (rehidratación Notion+local), wizard renderStep (checklists/clima/método/resultado/ficha relevamiento), GPS, iniciar/cancelar/cierre con sectores y jornadas, persistencia local+Notion, overlays de sector |
| `dashboards.js` | ~2.260 | Panel CEO/Finanzas: 🏠 Inicio ejecutivo (semáforo/deltas/HOY en vivo/países/atención/pipeline + comparativa + PDF ejecutivo), Métricas, Finanzas CEO, Por cobrar, Equipo+cuentas admin, selector período/país |
| `i18n.js` | 2.189 | Diccionario es/pt-BR + `t()`/`currentLang` + `pedidoFmtFecha` |
| `coord-servicios.js` | 1.246 | Pantalla del coordinador: filtros/toolbar/mes, vistas lista/Kanban(drag&drop)/calendario, mover-estado, cards + jornadas agrupadas, fetch del mes, renderers de tabs, cambiarEstadoServicio |
| `clientes.js` | 981 | CRM: vista Clientes unificada, secciones (mantenimiento 9m/a contactar), ficha 360 (sectores+intermediarios+historial), WhatsApp/recontacto, mapa id→nombre |
| `propuestas.js` | 894 | Seguimiento ("A contactar hoy" + reloj de vida) + sheet crear/editar/borrar + creates de servicio/prueba/relevamiento + "recontacté hoy" |
| `gastos.js` | 741 | Pantalla 💸 Gastos (filtro país server-side) + sheet de carga con foto de recibo + OCR IA (solo UY) + chips por servicio |
| `finanzas.js` | 573 | Tab Finanzas (listas gastos/ingresos + filtros), nuevo ingreso manual, editar cobro, reportes PDF financieros |
| `equipos.js` | 582 | 🔧 Flota (DB Activos): check mensual, problemas, historial, Mis equipos del operario, equipos por servicio |
| `reporte.js` | 406 | PDF de devolución al cliente (jsPDF self-hosted + marca report-brand) |
| `offline-queue.js` | 389 | Cola offline IndexedDB (writes + fotos) con reintentos |
| `pedidos.js` | 365 | 📦 Pedidos de insumos (tab coord + sheet operario) |
| `fotos.js` | 330 | Subida a R2, visor/galería, config PHOTO_* |
| `alertas.js` | 323 | Banner de avisos por rol (equipos/servicios/propuestas/clientes/pedidos/documentos) |
| `prospeccion.js` | 259 | Rol 🧲 Ventas: lista/ficha de prospectos + acciones |
| `soporte.js` | 191 | 💬 Soporte (Fase B reportes): reportar + mis reportes + bandeja Dirección con visto/resuelto |
| `api.js` | 174 | Capa de red: callNotion/callDb/callNotionAll, updateServiceProps, syncAfterWrite, putPhotoToR2, renovación de token |
| `historial.js` | 154 | 📋 Mi historial de trabajos (menú de cuenta) |
| `errores.js` | 116 | **Detector de errores**: window.onerror+unhandledrejection → POST /api/reporte con contexto y forense (archivo:línea:col); toast "contar qué estabas haciendo" |
| `ayuda-bot.js` | 98 | FAB 🤖 de ayuda (Q&A por rol vía /api/ayuda-bot) |
| `calculos.js` | 80 | Dinero puro (montoOf/fmtMoneda/sumByMoneda/kpiIncluido/tipoServicio*) — con tests unit |
| `util.js` | 36 | esc/toArr/msNames/compareVersions |

Además: mini-catcher **inline en `index.html` `<head>`** (ES5) que captura errores ANTES de que cargue el
bundle (peor caso: main.js no parsea) y los reporta igual.

## Flujo de datos (actualizado)

```
  Navegador (PWA, 23 módulos)                 fotos (binario directo)
      │ lecturas                                    │
      ▼                                             ▼
  /api/db (espejo Supabase, RLS país) ⇄      /api/upload-url → R2 → cdn.flyclean.app
      │ fallback                                    (al PDF vía /api/img same-origin)
      ▼
  /api/notion (proxy, oculta token, permisos por rol ENFORCE_PERMS=1)
      │
      ├─ tablas SUPABASE-FIRST (servicios·clientes·propuestas·ingresos, env SUPAFIRST_TABLES):
      │    PATCH → espejo PRIMERO (RPC merge) → outbox_notion → cron-outbox propaga a Notion
      └─ resto: Notion directo + mirror tras el write · reconciliación diaria (cron-db-sync + health)
```

## Endpoints serverless (`api/`) — inventario completo

| Ruta | Qué hace |
|---|---|
| `/api/notion` | Proxy Notion: allow-list de endpoints+métodos, timeout 9s+retry, fallback multi-data-source de Servicios, **matriz de permisos por rol** (`_lib/permisos.js`, ENFORCE_PERMS=1), Supabase-first para las tablas flipeadas |
| `/api/db` | Lecturas del espejo (formato Notion), filtro por rol/país server-side |
| `/api/db-sync` | Upsert puntual al espejo tras un write (fire-and-forget del front) |
| `/api/upload-url` | PUT presignado a R2 (origen+MIME+fotoType+ownership+15MB) |
| `/api/img` | Proxy de imágenes same-origin (solo cdn.flyclean.app, anti-SSRF) |
| `/api/extract-receipt` | OCR de recibos (Anthropic) con defensas |
| `/api/verify-pin` | Login: valida PIN (KV hash > env) + emite token HMAC 7d con renovación silenciosa + rate-limit KV |
| `/api/set-pin` · `/api/admin-set-pin` | Cambio de PIN propio · admin resetea el de otros (ADMIN_IDS) |
| `/api/admin-list-users` · `admin-set-user` · `admin-user-status` · `users-roster` | Gestión de usuarios sin deploy (USERS_FROM_DB, tabla `usuarios`) + roster |
| `/api/reporte` | **Sistema de reportes**: POST auto/manual/detalle (guarda en tabla `reportes` + email con dedup por error+día) · GET míos/bandeja admin · PATCH estado (solo ADMIN_IDS) |
| `/api/ayuda-bot` | Q&A del FAB 🤖 (contexto por rol, rate-limit, sin tools) |
| `/api/app-config` | Config editable en ⚙️ (reglas, checklists, textos WhatsApp) en KV |
| `/api/email-recipients` | Destinatarios de emails por tipo (semanal/lunes/pipeline/**reportes**) en KV, admin |
| `/api/limpieza-svc-ok` · `/api/mapa-estado` | Flags compartidos en KV (panel Limpieza · tick "contactado" del mapa) |
| `/api/version` | `{web, minApkRequired}` para el TWA |
| `/api/health` · `/api/health-reconcile` | Salud de la cola/espejo + reconciliación (protegidos) |
| crons: `cron-pipeline` (diario) · `cron-report` (vie/lun) · `cron-db-sync` (espejo) · `cron-outbox` (drena outbox→Notion) | fail-closed con CRON_SECRET |
| `_lib/`: session (token HMAC) · users (roster+DB) · permisos (matriz) · pins · supafirst · mirror · sync · notion-map · notion · email (Resend) · recipients · appconfig | helpers compartidos |

## Resiliencia (4 capas)

1. **SW stale-while-revalidate** para lecturas (+caché por usuario `?u=`; purga tras cada write y al login/logout). `CACHE='flyclean-vNN'` versiona el shell — bumpearla invalida clientes.
2. **Cola offline** (IndexedDB): writes y fotos se encolan sin señal y reintentan.
3. **Proxy con timeout+retry**; espejo con fallback a Notion en las lecturas críticas.
4. **Detector de errores** (Fase A+B): la app reporta sola cualquier error JS (con contexto y forense
   archivo:línea) → tabla `reportes` + email a Dirección con dedup; bandeja 💬 Soporte en la app.

## Quirks pinneados (NO romper)

- **R2 / checksum**: `requestChecksumCalculation: 'WHEN_REQUIRED'` en upload-url — quitarlo rompe el PUT con un error engañoso.
- **Notion multi-data-source** (Servicios): query directa falla → el proxy cae a search API + filtro por parent (con reintentos).
- **API Notion**: sin `is_datetime`; `Condición climática`/`Tipo de servicio`/`Método` son multi_select; `% de avance` no escribible.
- **SW cache key** por `?k=` en el body (no `#`).
- **Supabase-first**: NUNCA derivar de relaciones INVERSAS de Notion en tablas flipeadas (quedan congeladas al flip) — siempre el lado forward que escribe la app (ej. ingreso→servicio).
- **Nombres de assets fijos sin hash** (Vite): el SW precachea rutas literales.
- **gen-globals**: si un refactor mueve una función usada por un handler inline a un módulo, `main.js` DEBE importarla (si no, no se publica en window → "Can't find variable" en producción; incidente v218). Los handlers estilo objeto (`onclick: '...'`) también cuentan.

## Roles / auth (estado 2026-07-19)

- Roles por usuario (Operario · Coordinador · CEO · Finanzas · Ventas · Dirección), con **alta/baja sin
  deploy** (USERS_FROM_DB=1 → tabla `usuarios`; fallback anti-lockout al array de `main.js`).
- **Login sin lista** (nombre/email + PIN), token HMAC 7 días con renovación silenciosa; PINs en KV.
- **Permisos server-side**: matriz rol→bases en el proxy (`ENFORCE_PERMS=1`; cruce operario→Finanzas = 403).
- **Multi-país**: no-UY ve solo su país (`finRecEnPais`/`recEnPaisNotion` + filtros server-side en /api/db
  y Gastos); Dirección/CEO-UY global. Admin de cuentas/PINs: solo `ADMIN_IDS` (Diego/Eduardo).
