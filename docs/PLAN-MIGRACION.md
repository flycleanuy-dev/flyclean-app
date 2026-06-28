# Plan de Migración FlyClean — Notion → Supabase/Postgres + RLS

> **Plan OFICIAL** (confirmado con Diego, 2026-06-27). Fuente de verdad de la migración.
> Razonamiento y comparación: [`ARQUITECTURA-HOY-VS-TOP.md`](ARQUITECTURA-HOY-VS-TOP.md).

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
| Roles operario / coordinador / finanzas | ✅ | ✅ |
| **Gasto por foto con IA (lo cargan operario/coord)** | ✅ | ❌ |
| Gastos: **carga manual por el usuario Finanzas** | ✅ | ✅ (único modo allá) |

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

### Fase 2 — la app LEE de Supabase (EN CURSO)
- **Endpoint `api/db.js`** (server-side): valida sesión, resuelve país/rol del usuario, lee de Supabase y devuelve
  los datos en **formato Notion** (gracias a `raw`) → el render de la app **no cambia**, solo la fuente.
- **Pantalla por pantalla**, detrás de un **flag** (localStorage), con **fallback a Notion**:
  1. **Clientes** (piloto) → 2. Servicios → 3. Propuestas → 4. Por cobrar/Finanzas → 5. el resto.
- Cada pantalla: construir → **verificar** (lee de Supabase, mismos datos, aislada por país, 0 errores) → prender el
  flag → expandir. La **config por país** se respeta en la lectura.

### Fase 3 — la app ESCRIBE en Supabase
- **Doble escritura:** cada guardado va a Notion (actual) **Y** a Supabase. Policies de INSERT/UPDATE/DELETE.
- Se formaliza el modelo de **gastos**: IA (solo UY) vs **manual** (Finanzas, todos los países).
- Cuando todo cuadre → **Supabase pasa a ser la fuente**; Notion queda como respaldo / panel de carga interno.

### Fase 4 — Config por país + multi-tenant (franquicias)
- Config por país formalizada en la base (editable sin deploy).
- **Multi-tenant** (`tenant_id` + RLS por tenant) para franquicias.

---

## 🚦 Orden de despliegue
1. **Uruguay** — TODAS las funciones (incluida la IA de gastos), **100% probado y aceitado** en la arquitectura nueva.
2. Recién ahí, **BR / PA / GT / MX**: CRM + operaciones + seguimiento (pruebas/relevamiento/propuesta) + pedidos +
   **finanzas manual** (sin IA de gastos), cada uno con su config y **aislado por país** (RLS).

## Reglas (no romper nada)
- Cada paso detrás de flag, reversible, con Notion de respaldo. **Los writes siguen en Notion hasta la Fase 3.**
- No se toca **El Parrillero**. Nada de lo del **31/7** se rompe. Secretos solo en `.env.local`/Vercel, nunca en el repo.

## Estado actual
- Fase 1: ✅ completa · Fase 2: **piloto Clientes en construcción** · Fases 3-4: futuras.
