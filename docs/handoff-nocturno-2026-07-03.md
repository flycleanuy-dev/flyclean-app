# Handoff nocturno — madrugada 03/07/2026

Diego se fue a dormir con "haz todo esto hasta mañana". Esto es lo que hice (seguro, sin tus decisiones)
y lo que te dejé listo para aprobar. **Nada de lo que necesita tu OK se ejecutó.**

## ✅ HECHO y verificado en vivo

### Auditoría de todo lo de hoy (v105→v114) + 4 arreglos → sw v115
Corrí una auditoría a fondo (5 revisores) de las 10 versiones de hoy. Encontró 4 cosas seguras de
arreglar (3 eran regresiones de hoy). Las apliqué y las verifiqué en producción:
1. **Fuga de datos entre usuarios en un mismo teléfono** (de las lecturas Supabase de hoy): si dos
   personas de países distintos usaban el mismo dispositivo, el segundo podía ver la lista recortada
   del primero. Ahora la app **limpia esa caché al entrar y al salir**. (Test: 10 → 0.)
2. **El rol Ventas podía crear servicios/clientes** desde la ficha del prospecto (agujero del encierro
   de ayer). Cerrado: ya no puede crear trabajos ni ver la cartera/alertas. (Test: no abre el alta.)
3. **Descartar una alerta con la × cerraba toda la lista** — arreglado, ahora la lista sigue abierta.
4. Bump de versión que faltaba.

### Documentación al día
FUNCIONALIDADES.md con v113/v114/v115. Manuales PDF (operario/coord/ventas) ya con "Finalizar servicio".

## 🟡 LISTO PARA TU OK (no lo toqué — son tus decisiones)

### 1. Limpieza del pipeline comercial → `docs/limpieza-pipeline-propuesta-2026-07-03.md`
23 propuestas tienen estados fuera del embudo (13 "Completado" + 8 "Servicio Pendiente" = tratos
GANADOS que deberían ser "✅ Aceptada"; 2 dudosas). Si aprobás, tu **conversión pasa de 6 a 27
aceptadas** y el embudo se limpia. Decime "dale al Grupo A" y lo ejecuto en 30 segundos.

### 2. Backstop de seguridad del rol Ventas (importante)
El encierro de Ventas es **solo visual**: alguien con conocimientos técnicos y una sesión de Ventas
podría leer datos que no debería (gastos, ingresos). El arreglo de fondo (poner el candado en el
servidor, no solo en la pantalla) es una decisión de diseño que hay que hacer con cuidado para no
romper lo que otros roles sí necesitan leer. **Lo dejo para verlo juntos** — no es urgente (necesita
la sesión de Ventas + saber usar herramientas de desarrollador), pero es el candado real.

### 3. Otros pendientes de decisión
- Migración de leads viejos ("Nuevo lead"/"Contactado") a prospección — juntos.
- Tablero de jornales v2 — me faltan las **tarifas por operario/país**.
- Deuda menor de la auditoría (detalle en el ledger): reconcileDeletes residual, seat de Ventas en
  users.js, y un esc() faltante viejo en las alertas. Ninguna urgente.

## 🌅 PARA LA MAÑANA (lo corro apenas vuelvas — son de después de las 08:00)
- Verificar que el **email del cron de las 08:00** archivó bien la tanda vieja del 15/05.
- Confirmar que las **automatizaciones de Notion siguen muertas** (que ninguna propuesta amanezca con
  "Última interacción" pisada a las 09:00).

Buenas noches. A la mañana tenés todo ordenado para decidir. 🚁
