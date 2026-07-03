# Backstop server-side del rol Ventas — Diseño

**Fecha:** 2026-07-03 · **Estado:** aprobado por Diego (Enfoque A + alcance "solo clientes/prospectos").
**Origen:** hallazgo de la auditoría nocturna — el encierro de Ventas es 100% cliente; `/api/notion`
y `/api/db` solo exigen sesión válida, no autorizan por rol → un Ventas con devtools puede leer
Gastos/Ingresos/Servicios/Propuestas. Este es el candado REAL (server-side).

## Decisiones (Diego)
- **Enfoque A**: restricción server-side SOLO para el rol Ventas. Todos los demás roles quedan
  BYTE-IDÉNTICOS (cero riesgo de romper una lectura legítima). Matriz completa por rol = fase futura.
- **Alcance Ventas**: únicamente la base de **Clientes/Contactos** (donde viven los prospectos).
  Nada de servicios, propuestas, gastos ni ingresos.

## Contexto (verificado en código)
- El token de sesión (`fc_token`) lleva `{ id, exp }` (session.js). El rol se resuelve server-side
  con `userById(session.id)` (api/_lib/users.js).
- `api/_lib/users.js` NO tiene el asiento `ventas-uy` (bug: mirror desincronizado) → hoy `userById`
  devuelve null para Ventas y `/api/db` ya le da 403 por "usuario desconocido" (accidentalmente
  cerrado en /api/db, pero /api/notion no mira el rol para nada).
- `CONTACTOS_DB_ID = 250115612de74e0582366549bbe5e389` (contactos/clientes).
- Ventas escribe SOLO páginas de contacto: crea prospecto (`pages` POST, parent database_id =
  CONTACTOS) y actualiza prospecto (`pages/{id}` PATCH: estado/próximo contacto/notas).

## Diseño

### 1. `api/_lib/users.js`
- Agregar `'ventas-uy': { nombre: 'Ventas UY', rol: '🧲 Ventas', pais: 'Uruguay' }`.
- Exportar helper `export function esVentas(u) { return !!(u && String(u.rol||'').includes('Ventas')); }`.

### 2. `api/notion.js` — autorización por rol para Ventas
Tras `verifySession` + `const u = userById(session.id)`, si `esVentas(u)`:
- Normalizador `norm(id) = id.replace(/-/g,'').toLowerCase()`. `CONTACTOS = norm('250115612de74e0582366549bbe5e389')`.
- **`databases/{id}/query` y `databases/{id}`**: extraer el dbId del endpoint; permitir SOLO si
  `norm(dbId) === CONTACTOS`. Si no → **403** `{ error: 'forbidden: rol Ventas solo accede a clientes' }`.
- **`pages` (POST create)**: permitir SOLO si `norm(body?.parent?.database_id) === CONTACTOS` (o el
  data_source de contactos si se usara). Si no → 403.
- **`pages/{id}` (PATCH update)**: permitir (Ventas actualiza sus prospectos por id; su UI nunca le
  da ids de servicios/gastos). Residual aceptado (bajo: requiere un id ajeno específico).
- **`search`**: si estuviera permitido para algún flujo, Ventas → 403 (no lo necesita). (Verificar si
  el allow-list incluye search; hoy la lista es databases/query, databases/{id}, pages, pages/{id}, search.)
- Roles NO-Ventas: NINGÚN cambio (se saltea todo el bloque).

### 3. `api/db.js` — restringir recursos para Ventas
Ya hace `userById`. Sumar: si `esVentas(u)` y `resource !== 'clientes'` → **403**. (Hoy Ventas caería
en 403 por userById=null; con el asiento agregado hay que mantener el 403 explícito para no-clientes.)

## Criterios de aceptación
1. Un token de sesión Ventas contra `/api/notion` con `databases/<GASTOS|INGRESOS|SERVICIOS|PROPUESTAS>/query`
   → **403**. Con la DB de Contactos → 200.
2. Ventas `pages` POST con parent ≠ Contactos → 403; con parent Contactos (crear prospecto) → 200.
3. Ventas `/api/db?resource=gastos|ingresos|servicios|propuestas` → 403; `?resource=clientes` → 200.
4. **Coordinador/Finanzas/CEO/Operario/Dirección: comportamiento IDÉNTICO a hoy** (ningún 403 nuevo).
5. El asiento `ventas-uy` queda en users.js (arregla el mirror-sync roto que la auditoría marcó).

## Fuera de alcance
- Matriz completa de permisos por rol (fase B, futura).
- Restringir `pages/{id}` PATCH por DB de destino (requeriría un fetch extra; residual bajo).
- Sync inverso / `equipo` desde Supabase.
