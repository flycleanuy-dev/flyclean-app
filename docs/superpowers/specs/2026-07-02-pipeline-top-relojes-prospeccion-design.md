# Pipeline comercial "versión top" — dos relojes + fase de prospección — Diseño

**Fecha:** 2026-07-02 (noche)
**Estado:** APROBADO por Diego (plan + 4 decisiones vía preguntas). NO ejecutado — arranca 03/07.
**Origen:** pregunta de Diego tras estrenar "📞 A contactar hoy" (v110): "si no responden, ¿cuándo
reaparecen? quiero que la muerte a los 45 días cuente desde el ENVÍO, no desde cada contacto nuestro"
+ contratación futura de un vendedor ("juntar clientes es un paso previo a las propuestas").

---

## Diagnóstico (verificado en código)

- `api/cron-pipeline.js` ancla TODO en `Días sin respuesta` (fórmula desde `Última interacción`):
  alerta 15d y auto-move 45d. → Cada "📞 Contactado" resetea AMBOS relojes: una propuesta puede
  vivir para siempre a base de contactos nuestros sin que el cliente responda jamás.
- `Fecha de envío` es 100% manual (solo el input del sheet, index.html ~12146) y falta en muchas.

## Parte 1 — Dos relojes (esfuerzo: ~medio día)

| Reloj | Desde | Dispara |
|---|---|---|
| **Seguimiento** | Última interacción (nuestro último toque) | ≥15d → aparece en "📞 A contactar hoy"; cada contacto lo esconde 15 días. (Como hoy — se mantiene.) |
| **Vida** | **Fecha de envío** (fallback: creación) | ≥45d sin respuesta del cliente → auto "😶 Sin respuesta" + email. Solo estados 📤 Enviada y 📞 Contactado. |

Decisiones de Diego:
1. **🤝 Negociando NO muere por envío** (hay diálogo real); solo si pasa 45d sin interacción alguna (regla actual).
2. **Backfill por única vez**: enviadas viejas sin `Fecha de envío` → se les estampa su fecha de creación.
3. "Respuesta del cliente" = cambio de estado (Federico la mueve a Negociando/Aceptada/etc. → sale del reloj de muerte).

Cambios técnicos:
- `savePropEdit`/estado: al pasar a "📤 Enviada al cliente", estampar `Fecha de envío` = hoy si está vacía (automático).
- `api/cron-pipeline.js`: el auto-move 45d pasa a calcular días desde `Fecha de envío` (fallback creación)
  para Enviada/Contactado; Negociando mantiene la regla actual (45d desde Última interacción). La alerta
  15d de re-contacto no cambia (Última interacción).
- Bloque "A contactar hoy": cada card muestra ambas cosas — "Xd sin respuesta · ☠️ le quedan Nd" —
  y el tier rojo "por vencer" se re-ancla a la VIDA restante (≤5d de vida), no al seguimiento.
- Email diario refleja la misma lógica.
- Backfill one-shot vía API (solo propuestas en estados de espera sin Fecha de envío).

## Parte 2 — Fase de prospección + rol Ventas (esfuerzo: 1–1,5 días)

Decisiones de Diego:
1. **Prospectos viven en CLIENTES** con estados (una ficha por cliente para siempre; sin base nueva):
   🎯 Prospecto → 📞 Contactado → 🤝 Interesado → (✅ pasa a propuesta | ❌ Descartado).
2. **Rol nuevo "🧲 Ventas" ve SOLO prospección** (decisión más restrictiva que la recomendada):
   carga y trabaja prospectos; NO crea ni sigue propuestas (eso queda en el coordinador); no ve
   finanzas/servicios/resto de clientes. RLS + filtros de rol.

Piezas:
- Estados de prospección en la ficha/DB Clientes (nuevas opciones del select Estado).
- Vista/tab "🎯 Prospección": alta rápida de prospecto (nombre, contacto, zona, nota), lista por
  estado, y para el COORDINADOR un acceso "→ Crear propuesta" desde el prospecto maduro (reusa el
  alta existente). El rol Ventas no ve ese botón (solo marca "🤝 Interesado").
- Rol 🧲 Ventas en USERS (+ PIN vía CEO→Equipo→🔑) con panel restringido.
- Métricas CEO (sección Comercial): prospectos/semana por vendedor, tasa prospecto→propuesta→aceptada.
- Migración suave (con Diego): propuestas hoy en "🆕 Nuevo lead"/"📞 Contactado" se revisan una vez —
  prospectos puros → Clientes con estado; con sustancia → Relevamiento/En preparación. Esos 2 estados
  se retiran del pipeline de propuestas.

## Orden de ejecución

1. **Parte 1** (03/07): relojes + backfill + estampado automático → cierra el ciclo del botón v110.
2. **Parte 2** (después, antes de contratar al vendedor).

## Fuera de alcance
- Limpieza de estados sucios del pipeline ('Servicio Pendiente' 9, '✅ Completado' 13, 2 sin estado) —
  tarea de datos aparte, con Diego.
- Integraciones externas de prospección (importar listas, scraping) — no pedido.
