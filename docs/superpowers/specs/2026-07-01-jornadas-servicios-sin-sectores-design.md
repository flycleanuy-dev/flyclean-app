# Jornadas automáticas para servicios sin sectores — Diseño

**Fecha:** 2026-07-01
**Estado:** Aprobado por Diego (brainstorming). Pendiente: escribir plan de implementación.
**Relacionado:** Sistema de sectores Fases 0–3 (`2026-06-30-sectores-design.md`), jornadas Forma 2.

---

## 1. Objetivo

Extender la continuidad multi-día (hoy solo disponible para servicios **con sectores**, vía la
"Forma 2") a los **servicios normales sin sectores** (un solo edificio), usando un **porcentaje
manual** que ingresa el operario. Si un trabajo no se termina en el día, el operario lo cierra con su
% y el sistema **genera automáticamente la ficha del día siguiente**, marcada como jornada
(J1 el día 1, J2 el día 2, …), cada una con sus fotos antes/después y su checklist propios, y con
toda la información guardada para poder contabilizar horas y jornales más adelante.

## 2. Modelo elegido — "una ficha por día" (Forma 1, disparo automático)

Decisión de Diego (contra la alternativa "un solo servicio que se reprograma"): cada jornada es
una **ficha independiente en su día**. Diferencia con los servicios con sectores (que usan Forma 2,
un solo servicio que se mueve):

| | Servicios CON sectores (ya existe) | Servicios SIN sectores (esta feature) |
|---|---|---|
| Modelo | Forma 2 — un servicio que se reprograma | Forma 1 — una ficha por día |
| % de avance | Automático (sectores hechos ÷ total) | **Manual** (lo pone el operario) |
| Al no terminar | El mismo servicio pasa a mañana | La ficha actual se cierra + **se crea la del día siguiente** |
| Vista coord | 1 tarjeta que se mueve, badge "🔄 Continúa · X/Y" | 1 tarjeta por día (J1 lunes, J2 martes) |
| Fotos por día | Por sector (prefijo `sec-xxx__`) | Cada ficha tiene sus propias fotos (sin prefijo) |

**Por qué Forma 1 acá:** al ser fichas separadas, cada día tiene sus propias fotos antes/después y
su propio checklist "de 0" **sin lógica extra** (sale gratis del flujo normal de un servicio). Y el
coordinador ve literalmente J1 y J2 como tarjetas en sus días.

## 3. Decisiones cerradas (brainstorming)

1. **Cierre del operario:** pregunta **"¿Terminaste el trabajo?"** con dos opciones (`Sí, quedó
   terminado` / `No, sigo otro día`). El `%` solo se pide si elige "No".
2. **Significado del `%`:** **acumulado** — cuánto va del **trabajo total** (día 1: 50%; día 2: si
   termina, 100%). No es "cuánto hice hoy".
3. **Etiqueta de la tarjeta:** al partirse en jornadas, la tarjeta pasa a chip **"🗓️ Jornada · J1"**
   (consistente con cómo se ven las jornadas hoy).
4. **Contabilidad:** **guardar bien ahora, reporte después.** Esta entrega garantiza que la data
   queda guardada y vinculada; el panel visible de totales (horas / jornales) es un paso futuro.
5. **Alcance de tipos:** aplica a servicios de **trabajo** (Tipo de registro = Orden/Servicio, o los
   que ya son Jornada). **No** aplica a **Prueba** ni **Relevamiento** (son de un solo momento).
6. **Lo viejo no se toca:** el botón "Crear jornada" manual del coordinador
   (`submitCreateJornada` / `openCreateJornadaSheet`) queda igual. Los servicios **con sectores**
   siguen con su Forma 2 sin cambios. Este mecanismo es **solo** para servicios sin sectores.

## 4. Flujo detallado

### 4.1 Operario — paso de cierre (`observaciones`)

Hoy el paso `observaciones` muestra: notas + (input `%` solo si el servicio ya es jornada) +
selector de resultado (Éxito/Incidencia/Fallido). Para servicios de **trabajo sin sectores** se
reorganiza así:

```
NOTAS  [textarea]

¿Terminaste el trabajo?           ← NUEVO (solo trabajo sin sectores; no Prueba/Relev)
  [ ✅ Sí, quedó terminado ]
  [ 🔄 No, sigo otro día    ]

  · si "Sí"  → se muestra el SELECTOR DE RESULTADO (Éxito/Incidencia/Fallido), como hoy
  · si "No"  → se muestra ¿CUÁNTO VA DEL TRABAJO? [__%]  (0<%<100); NO se pide resultado
```

- El estado de esta elección vive en `serviceState.finalizacion` (`'' | 'termino' | 'continua'`),
  persistido en localStorage y reseteado en `resetServiceState()`.
- El `%` reutiliza el input existente `avance-input` → `serviceState.avance`.
- Cuando el servicio **ya es una jornada** (viene de una J anterior), la pregunta aparece igual:
  puede terminar (100%) o volver a partir (crea la siguiente J).

### 4.2 Operario — al apretar "Cerrar" (`cerrarServicio`)

Lógica de decisión (se agrega **después** de la rama de sectores, que no cambia):

```
1. Si hay fotos subiendo todavía  → alertar, no cerrar.               (igual que hoy)
2. Si tiene sectores y no todos hechos → modal de sectores; return.   (igual que hoy)
3. NUEVO — servicio de trabajo SIN sectores y el operario eligió "No, sigo otro día":
     · validar % (entero, 0 < % < 100; si puso 100 → sugerir "elegí Sí, terminado")
     · ejecutar cierre-como-jornada:  cerrar la ficha actual + crear la ficha siguiente
     · return
4. Resto (terminó, o no aplica jornada) → validar resultado + _ejecutarCierre('completar').  (igual que hoy)
```

### 4.3 Cierre-como-jornada (nuevo camino)

Al confirmar "sigo otro día", en **dos pasos** (secuenciales, el 2º solo si el 1º tuvo éxito):

**Paso A — cerrar la ficha actual (la que se estaba trabajando):**
- `Estado = ✅ Completado`
- `Hora Fin = ahora`
- `% de avance = <el % que puso>` (ver §6 sobre esta property)
- Marcarla como jornada si aún no lo era: `Tipo de registro = 📅 Jornada` y
  `Jornada N° = <número actual>` (si la ficha no tenía número, es **1**).
- **No** se pide ni escribe `Resultado` (el trabajo no terminó; el resultado se registra recién
  cuando alguien cierra "terminado").
- Todo lo demás del cierre normal se guarda igual: notas, clima, método/herramienta, **fotos
  antes/después del día**, checklist del día, datos de relevamiento si aplica.

**Paso B — crear la ficha del día siguiente (J+1):**
- Reutiliza la mecánica de `submitCreateJornada`, pero **programática** (sin leer del DOM): una
  función nueva `crearJornadaSiguiente(parentService, numero, fecha)`.
- `numero = (Jornada N° de la ficha actual || 1) + 1`.
- `fecha = mañana` (`YYYY-MM-DD`; el coordinador puede cambiarla luego en el sheet — ya existe el
  input de fecha).
- **Hereda** de la ficha actual: `Nombre del servicio` (con sufijo "— Jornada N", como el mecanismo
  viejo), país (`País`), `Tipo de servicio`, `Propuesta`, `Contacto`, `Operario App` (piloto),
  `Operarios participantes` (ayudantes), `Lugar`, `Mapa`.
- Arranca **limpia**: `Estado = 🔄 Asignado` (ya tiene piloto → aparece en la app del operario),
  `Tipo de registro = 📅 Jornada`, `Jornada N° = numero`, `Fecha programada = mañana`.
  **Sin** fotos, **sin** checklist (`Estado checklist` vacío → se rehace de 0), **sin** horas
  efectivas, **sin** `% de avance`, **sin** resultado, **sin** notas.

Tras el éxito de A+B: `showDoneScreen(true)` (pantalla "seguí otro día", ya existe).

### 4.4 Numeración J1/J2/J3…

- La primera ficha que se parte queda **J1** (`Jornada N° = 1`).
- Cada continuación incrementa. Se reutiliza `computeNextJornadaNumero` (agrupa por
  propuesta/contacto) para tolerar el caso de que ya existieran jornadas relacionadas; el número
  base es `(Jornada N° actual || 1) + 1`.
- Es repetible: la J2 también puede cerrarse "sigo otro día" → crea J3, y así hasta que alguien
  cierre "terminado".

## 5. Vista del coordinador

- **Una tarjeta por día**: J1 en su fecha (`✅ Completado · 50%`), J2 en la suya (`🔄 Asignado`), etc.
  No hay lógica nueva de calendario: cada ficha aparece en su `Fecha programada`.
- La tarjeta ya muestra el chip **"🗓️ Jornada"** y el número **"J{n}"** cuando la ficha es jornada
  (`coordServiceCard`, condición `esJornada`). Como las fichas quedan con `Jornada N°`, esto
  funciona sin cambios de fondo.
- **Nuevo (chico):** mostrar el **`%` de avance** en la tarjeta cuando la ficha es una jornada
  cerrada con `% de avance` (ej. "✅ Completado · 50%"). Es lo único que hoy la tarjeta no muestra.
- **Fecha editable:** la fecha de la J siguiente se puede cambiar en el sheet de edición del
  coordinador (input de fecha ya existente). Sin cambios.

## 6. Datos y contabilidad

### Properties Notion usadas (Servicios, ds `2fbc8a03-5c4f-445c-8516-71dd9b2eea78`)
Todas ya existen; no se crean properties nuevas.

| Property | Uso en esta feature |
|---|---|
| `Estado` (select) | `✅ Completado` (ficha cerrada) / `🔄 Asignado` (ficha nueva) |
| `Tipo de registro` (select) | Se pone `📅 Jornada` al partir / en las fichas nuevas |
| `Jornada N°` (number) | Numeración J1/J2/… |
| `% de avance` (number) | `%` acumulado del día (escribible; ver nota abajo) |
| `Fecha programada` (date) | Mañana en la ficha nueva; editable por coord |
| `Hora Inicio/Fin Efectivo` (date) | Horas efectivas de cada jornada (para contabilidad) |
| `Operario App` (select) / `Operarios participantes` (multi) | Piloto + ayudantes = jornales |
| `📸 Fotos pre/post-servicio` (files) | Fotos antes/después **de cada jornada** (por ficha) |
| `Orden madre` / `Jornadas` (relation propia) | Vínculo padre↔jornadas (ver §🔗 abajo) |
| `Propuesta` / `Contacto` (relation) | Se heredan a la ficha nueva; agrupan el trabajo |
| `Nombre del servicio` (title) | Sufijo "— Jornada N" |

### Qué queda guardado para contabilizar (después)
Con cada ficha J guardando `Hora Inicio/Fin Efectivo`, `% de avance`, fotos y operario+ayudantes, y
todas las jornadas de un trabajo agrupables por `Propuesta`/`Contacto`, más adelante se puede
calcular sin datos nuevos: **horas efectivas por jornada** (Fin − Inicio), **horas efectivas
totales** (suma de las jornadas), **jornales** (jornadas × personas), y el progreso. El **reporte
visible** de esos totales es un paso futuro (fuera de esta entrega).

### ✅ Verificado (Notion MCP, 2026-07-01) — `% de avance` es escribible
Se fetcheó el schema del data source Servicios (`2fbc8a03-…`). Resultado:
- `% de avance` es tipo **`number`** → **es escribible vía API** (el write no falla). El
  `CLAUDE.md` histórico ("no escribible") se refería a que era un dato visual; el tipo real es
  number.
- **Contradicción a confirmar con Diego (no bloquea el diseño):** la *descripción* de la property
  en Notion dice textual *"⚠️ READ-ONLY. La app no la escribe. Se usa para barras de progreso
  visuales en Notion."* — pero el código actual de **sectores y jornadas ya la escribe**
  (`_ejecutarCierre` pone `% de avance = ...`). O la descripción quedó vieja, o el código de
  sectores la escribe sin que se haya coordinado. **Decisión para Diego:** ¿la feature reusa
  `% de avance` (siguiendo lo que ya hacen sectores/jornadas) o guardamos el `%` del día en otra
  property number dedicada? El diseño no cambia; solo dónde se guarda el número.

### 🔗 Vínculo padre–jornadas (hallazgo del schema — para el plan)
El data source Servicios ya tiene modelada la relación consigo mismo **`Orden madre` ↔ `Jornadas`**
(cada jornada hija apunta a su orden madre; la madre lista sus jornadas) y un **rollup
`Avance actual`** = `max(% de avance)` de las jornadas hijas. Esto es un vínculo padre-hijo
**explícito**, mejor que agrupar por `Propuesta`/`Contacto`. **Para el plan:** al crear la ficha
J+1, vincularla a la orden madre vía `Orden madre` (y/o `Jornadas`); y **verificar si el mecanismo
viejo `submitCreateJornada` ya usa esa relación** para replicar el mismo patrón. La numeración
(`computeNextJornadaNumero`) puede complementarse con esta relación.

## 7. Reutilización vs. nuevo

**Se reutiliza (sin romperlo):**
- El input `avance-input` / `serviceState.avance` (hoy solo visible para jornadas).
- El flujo normal de fotos antes/después y checklist de un servicio sin sectores
  (`STEPS_SERVICIO`).
- `computeNextJornadaNumero` (numeración) y la mecánica de creación de `submitCreateJornada`
  (copiado de properties), extraída a una función programática.
- `_cierreResultadoOk`, `showDoneScreen`, la persistencia local de `serviceState`.
- La invalidación de caché del SW (v95): al crear la ficha J+1 (POST pages) el SW borra
  `NOTION_CACHE`, así el coordinador la ve al recargar.

**Nuevo:**
- Bloque "¿Terminaste el trabajo?" en el paso `observaciones` (con su lógica condicional de mostrar
  `%` vs resultado) + `serviceState.finalizacion`.
- Rama en `cerrarServicio` para el camino "sigo otro día" (validación de `%` + disparo del cierre-
  como-jornada).
- Función `crearJornadaSiguiente(parentService, numero, fecha)` (creación programática de la ficha
  del día siguiente, heredando properties).
- Mostrar `% de avance` en la tarjeta del coordinador para jornadas cerradas.
- Strings i18n nuevas en **es y pt-BR** (pregunta, opciones, aviso, validaciones).

## 8. Lo que NO cambia (retrocompatibilidad)

- Servicios **con sectores**: flujo Forma 2 intacto.
- Servicios de trabajo sin sectores que se **terminan en el día**: al elegir "Sí, quedó terminado"
  siguen exactamente el cierre de hoy (`✅ Completado` + resultado). La única diferencia es la
  pregunta nueva antes del resultado.
- **Prueba** y **Relevamiento**: no ven la pregunta "¿Terminaste?" (su cierre no cambia).
- El botón "Crear jornada" manual del coordinador sigue funcionando igual.

## 9. Criterios de aceptación

1. En un servicio de trabajo sin sectores, el operario ve "¿Terminaste el trabajo?" en el cierre;
   Prueba/Relevamiento/servicios con sectores **no** la ven.
2. Elegir "Sí, quedó terminado" → pide resultado → cierra `✅ Completado` (comportamiento actual).
3. Elegir "No, sigo otro día" + `%` (0<%<100) → la ficha actual queda `✅ Completado · <%>` marcada
   `🗓️ Jornada · J1`, con sus fotos/horas/checklist del día; **y** aparece una ficha nueva `J2` en
   `🔄 Asignado` con fecha = mañana, mismos piloto/ayudantes/cliente, checklist en 0 y sin fotos.
4. La ficha J2 se abre como un servicio normal: checklist de 0, fotos antes/después nuevas; puede
   cerrarse "terminado" (→ `✅ Completado · 100%`) o "sigo otro día" (→ crea J3).
5. El coordinador ve J1 y J2 como tarjetas separadas en sus días, con chip "🗓️ Jornada · Jn" y el
   `%` en las jornadas cerradas; puede editar la fecha de la ficha siguiente.
6. `npm run check` (validación de JS embebido) y `node --check sw.js` pasan; strings en es y pt-BR.
7. Retrocompat: un servicio que se termina en el día se comporta byte-idéntico a hoy salvo la
   pregunta nueva.

## 10. Fuera de alcance (explícito)

- Reporte/panel visible de horas totales y jornales (futuro).
- Cambiar el mecanismo viejo de "Crear jornada" manual del coordinador.
- Tocar el flujo de servicios con sectores.
- Prorratear cobros/importes por jornada.
