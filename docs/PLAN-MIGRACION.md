# Plan de Migración FlyClean — Notion → Supabase/Postgres + RLS

> **Plan OFICIAL** (confirmado con Diego, 2026-06-27; **fechas de Fase 3 aprobadas 2026-07-09**).
> Fuente de verdad de la migración. Razonamiento: [`ARQUITECTURA-HOY-VS-TOP.md`](ARQUITECTURA-HOY-VS-TOP.md).

## Objetivo
Pasar la base de **Notion** a **Postgres/Supabase con RLS** (seguridad por fila, inviolable), escala y multi-tenant
para franquicias — **sin romper la app**, **por fases**, **reversible**, y con **cada país configurado a medida**.

## Principios
- **Notion sigue siendo la fuente** hasta que el espejo esté 100% probado (Fases 1-2). La app **nunca para**. Todo reversible.
- **Replicable por configuración:** cada país = un set de funciones. **Uruguay primero**, perfecto; después el resto.
- Cada paso va **detrás de un interruptor (flag)** con **Notion de respaldo**.

---

## 🌎 Configuración por país

| Función | 🇺🇾 Uruguay | 🇧🇷 🇵🇦 🇬🇹 🇲🇽 Resto |
|---|---|---|
| CRM (clientes, propuestas, intermediarios) | ✅ | ✅ |
| Operaciones (servicios, jornadas) | ✅ | ✅ |
| Seguimiento: pruebas, relevamiento, propuesta | ✅ | ✅ |
| Pedidos importantes (solicitudes de compra) | ✅ | ✅ |
| Roles: operario / coordinador / finanzas / **CEO** | ✅ | ✅ |
| **Gasto por foto con IA (lo cargan operario/coord)** | ✅ | ❌ |
| Gastos: **carga manual por el usuario Finanzas** | ✅ | ✅ (único modo allá) |

> **CEO por país:** cada país tiene su CEO (ve SOLO su país, aislado por RLS). **Excepción:** el CEO de Uruguay
> (Eduardo) y la **Dirección** (Diego) ven TODO (global). El CEO no carga gastos — su panel es la vista del negocio
> (métricas, finanzas, equipo); por eso la diferencia de la IA-gastos NO lo afecta.

- **Única diferencia (por ahora):** en el resto de países, operarios/coordinadores **NO cargan gastos con IA** — los
  gastos los carga **manualmente el usuario Finanzas**. Todo lo demás, igual que Uruguay.
- Se mantiene así **hasta que Uruguay esté 100% aceitado**; después se decide si habilitar la IA en los demás.
- **Implementación:** un flag de config por país (`gastosIA`: UY=on, resto=off) que la app lee según el país del
  usuario, mostrando/ocultando el botón de "gasto con foto IA". A futuro la config vive en la base (tabla por país)
  → editable sin deploy = verdadera replicabilidad.

---

## 🗺️ Las fases (paso a paso)

### Fase 1 — ✅ HECHA (2026-06-27)
Base nueva levantada en paralelo: `db/schema.sql` (14 tablas; cada fila con `notion_id`, `pais` plano, `raw jsonb`),
`db/policies.sql` (RLS por país/rol), `scripts/sync-notion-supabase.mjs` (sync idempotente). Supabase poblado
(**817 filas**), RLS verificada (clave pública = 0 filas, service_role = todo). Ver `db/README.md`.

### Fase 2 — ✅ HECHA (2026-07-01/02): la app LEE de Supabase
- `api/db.js` valida sesión, resuelve país/rol, lee de Supabase y devuelve **formato Notion** (gracias a `raw`)
  → el render no cambió. `DB_FLAGS` on para **clientes / servicios / propuestas** + `writesync` (espejo al
  toque tras cada guardado) + cron cada 10 min. **Fallback a Notion** si el espejo falla (blindaje
  "espejo vacío → throw"). RLS por país verificada en producción.

### Fase 3 — la app ESCRIBE en Supabase (**fechas aprobadas 2026-07-09** — sacar Notion del camino crítico)

> Objetivo: que ningún guardado de la app dependa de que Notion responda. Notion NO muere: queda como **vista
> sincronizada** (back-office del equipo, se actualiza sola), canal del **cowork de Finanzas** (append-only,
> el sync existente lo trae) y wiki/hub. Cada etapa detrás de **flag reversible**. Detalle de la decisión y
> el razonamiento: plan de sesión 2026-07-09.

- **Etapa 3.0 (10-11/07)** — Candado `ENFORCE_PERMS` + **usuarios sin deploy**: identidad (id/nombre/rol/país/
  activo) a una tabla `usuarios` en Supabase con **fallback duro al array hardcodeado** (anti-lockout). PINs
  no cambian (KV). Alta de usuario sin deploy.
- **Etapa 3a (16-19/07, post-TOP)** — **Ediciones (PATCH) Supabase-first** detrás de flag: se reruta EN EL
  SERVIDOR (`api/notion.js`, gate único — los ~30 call sites del front no cambian). La fila se escribe en
  Supabase (fuente) y se **propaga a Notion async** (cola/reintento). Sin rediseño de IDs (la fila ya existe
  con `notion_id`). Es el ~95% del volumen de escritura.
- **Etapa 3.M (19-24/07)** — **PARTIR EL CÓDIGO** (profesionalización): build Vite + `index.html` → módulos
  (api-client, auth, colas offline, i18n, vista por rol + componentes). Refactor SIN features, comportamiento
  idéntico verificado pantalla por pantalla. Va entre 3a y 3b porque 3b toca muchos flujos del front.
- **Etapa 3b (24/07 → ~08/08)** — **Creates + relaciones** Supabase-first: id propio (UUID), insert en
  Supabase, propagación async crea la página Notion y guarda el mapeo. Toca flujos optimistas y relaciones
  (hoy por ids de página Notion) → el grueso del trabajo. Tabla por tabla; **Gastos/Ingresos AL FINAL,
  coordinado con el cowork** (actualizar su `CONTRATO-NOTION.md`). ⚠️ Semana 28-31/07 (entrega a socios):
  congelado lo financiero. Crons a Supabase al final.
- **Cierre (~08-10/08)** — App 100% Supabase con código modular. Con esto la app queda en condiciones reales
  de **100+ usuarios**; el modelo de gastos por país (IA solo UY) se formaliza en esta fase.

### Fase 4 — Config por país + multi-tenant (franquicias)
- Config por país formalizada en la base (editable sin deploy).
- **Multi-tenant** (`tenant_id` + RLS por tenant) para franquicias — sobre la base que deja la Fase 3.

---

## 🚦 Orden de despliegue
1. **Uruguay** — TODAS las funciones (incluida la IA de gastos), **100% probado y aceitado** en la arquitectura nueva.
2. Recién ahí, **BR / PA / GT / MX**: CRM + operaciones + seguimiento (pruebas/relevamiento/propuesta) + pedidos +
   **finanzas manual** (sin IA de gastos), cada uno con su config y **aislado por país** (RLS).

## Reglas (no romper nada)
- Cada paso detrás de flag, reversible, con Notion de respaldo. **Los writes siguen en Notion hasta la Fase 3.**
- No se toca **El Parrillero**. Nada de lo del **31/7** se rompe. Secretos solo en `.env.local`/Vercel, nunca en el repo.

## Estado actual (2026-07-11)
- Fase 1: ✅ completa (27/06) · Fase 2: ✅ completa (01-02/07, lecturas + writesync + RLS en prod).
- **Etapa 3.0: ✅ COMPLETA (10-11/07)** — usuarios sin deploy (tabla `usuarios` + alta/baja con historial +
  reactivar, `USERS_FROM_DB=1`) + candado `ENFORCE_PERMS=1` prendido y verificado.
- **Etapa 3a: ✅ ADELANTADA Y VIVA (10-11/07, antes de lo planificado)** —
  · 3a.1 espejo garantizado server-side (`MIRROR_ON_WRITE=1`): todo write exitoso a Notion se refleja al
    instante en Supabase desde el proxy (cerró los huecos de syncAfterWrite).
  · 3a.2 Supabase-first **VIVO en `servicios`** (`SUPAFIRST_TABLES=servicios`): las ediciones guardan primero
    en el espejo (RPC `merge_props` + normalización de formato) y Notion se actualiza async vía `outbox_notion`
    + `api/cron-outbox.js` (1 min). Lecturas `pages/{id}` de tablas flipeadas también del espejo. Ciclo
    verificado de punta a punta en prod. Operativa/rollback/monitoreo: ver `docs/RUNBOOK.md` §Supabase-first.
  · Antes de flipear clientes/propuestas: patrón F1 en sus sheets + reconciliación segura (M1) + review.
  · Gastos/Ingresos quedan en 3a.1 (cowork) hasta 3b.
- Etapa 3.M (partir el código) y 3b (creates + relaciones): según fechas del plan (19-24/07 y 24/07→08/08).
- Fase 4: tras el cierre de Fase 3.
