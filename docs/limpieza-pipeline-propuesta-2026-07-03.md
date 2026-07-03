# Limpieza de estados sucios del pipeline (Propuestas) — PROPUESTA (NO ejecutada)

**Fecha:** 2026-07-03 (madrugada) · **Estado:** esperando OK de Diego. NADA se tocó todavía.
**Por qué:** cambia tu embudo comercial (conversión, métricas). Es tu decisión — lo dejo listo para 1-clic.

## Qué encontré (100 propuestas, 23 con estado fuera del pipeline)

El pipeline válido es: 🆕 Nuevo lead · 📞 Contactado · 🔍 Relevamiento · ⏳ En preparación ·
📤 Enviada al cliente · 🤝 Negociando · ✅ Aceptada · ❌ Rechazada · 😶 Sin respuesta · 🔄 Reactivo.

Hay 23 con estados que NO son del pipeline (ensucian el embudo y la conversión):

| Estado sucio | Cuántas | Qué son |
|---|---|---|
| **✅ Completado** | 13 | Trato GANADO y el trabajo ya hecho. La mayoría tiene servicio vinculado. |
| **Servicio Pendiente** | 8 | Trato GANADO, servicio agendado/pendiente. Casi todas con servicio vinculado. |
| **(sin estado)** | 2 | Ver abajo — ambiguas. |

## Propuesta de mapeo

**Grupo A — 21 propuestas ganadas → `✅ Aceptada`** (recomendado, seguro conceptualmente):
Tanto "✅ Completado" como "Servicio Pendiente" significan lo mismo para el EMBUDO: **la propuesta se
ganó**. Que el servicio esté hecho o pendiente es el ciclo del SERVICIO, no del estado comercial de la
propuesta. Pasarlas a "✅ Aceptada" hace que tu conversión sea real (hoy estas 21 NO cuentan como ganadas).
- Completado (13): Casa Guille V, Oceano, Viña Eden, Colegio St Joseph, Look Brava, Av de las Americas II,
  Abejas North, Casa Carrasco Tejas, Edificio Talca, Mon Brava, Lumiere, Tanques Antel, LATU.
- Servicio Pendiente (8): Fachada L.A. Herrera (Belhouse), Securitas, Barraca Luissi (Nexo), Frigorífico
  Tacuarembó, Punta Carretas Shopping (EVVA), Edificio Francia, Bodega Garzón, Antel Datacenter.

**Grupo B — 2 "(sin estado)" → tu decisión:**
- **"Casa Guille V"** (sin estado, 0 servicios, $0): parece **duplicado** de la otra "Casa Guille V"
  (esa tiene el servicio y el importe). Sugerencia: **archivar** (🗄️) como duplicado. Confirmame.
- **"Servicio Pendiente"** (el nombre literal es "Servicio Pendiente", 0 servicios, $0): parece una
  **fila de prueba/basura**. Sugerencia: **archivar/eliminar**. Confirmame.

## Impacto en tus números (si aprobás el Grupo A)
- Aceptadas: 6 → **27**. La conversión "de las cerradas" sube fuerte (hoy da 20% porque 21 ganadas no se
  contaban). El embudo del CEO deja de tener las columnas fantasma "Completado"/"Servicio Pendiente".
- Nada se borra; es un cambio de estado, reversible.

## Cómo lo ejecuto (cuando digas OK)
Un solo paso por API (como hice con las fechas): PATCH `Estado pipeline = ✅ Aceptada` en las 21 del Grupo A,
y archivar las 2 del Grupo B según me confirmes. ~30 segundos. Te reporto el antes/después.

**Decime:** "dale al Grupo A" (y qué hago con las 2 del B) y lo ejecuto.
