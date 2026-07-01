# Fixes Coordinador — "En curso" visible + fecha real al iniciar + eliminar completados — Diseño

**Fecha:** 2026-07-01
**Estado:** Diseño acordado con Diego (systematic-debugging: causas raíz confirmadas; decisiones de refinamiento por AskUserQuestion). Pendiente: revisión del spec + plan.
**Origen:** feedback de Diego probando en vivo (2026-07-01). ⚠️ **Hay operarios trabajando ahora → NO se deploya hasta que Diego confirme que terminaron los servicios en curso.** Se construye en rama, sin tocar producción.
**Relacionado:** [[jornadas-sin-sectores]], [[sectores-sistema]], [[cache-listas-update-optimista]].

---

## 1. Objetivo

Resolver dos problemas que Diego encontró probando en vivo:
- **Bug A:** un servicio que un operario está haciendo **ahora** ("✈️ En curso") **no aparece** en el panel del coordinador si su `Fecha programada` cae en otro mes (causa raíz confirmada: el panel carga por mes de `Fecha programada`).
- **Bug B:** el coordinador **no puede eliminar** servicios **Completados** (el botón se oculta y hay un bloqueo), y lo necesita para hacer cambios/pruebas.

## 2. Causas raíz (systematic-debugging, confirmadas)

- **Bug A:** `fetchCoordItemsForMonth` filtra la query a Notion por `Fecha programada` dentro del mes visible (o vacía). Un servicio "En curso" con fecha de otro mes queda **fuera de la carga** → no aparece. Confirmado por Diego ("no aparece para nada"). **NO es de la Fase A** (el cargador es pre-existente).
- **Bug B:** en `openEditSheet` el botón "🗑️ Eliminar" se oculta cuando `isCompletado && !esFin`, y `deleteService` bloquea con alert si `estado incluye 'Completado' && !esFin`. Solo Finanzas (Administración) puede borrar completados.

## 3. Decisiones (Diego, por AskUserQuestion)

1. **Alcance del respaldo del panel:** traer siempre **solo "✈️ En curso"** (no todos los activos) — mínimo ruido.
2. **Al iniciar fuera de fecha:** **cambiar la `Fecha programada` a hoy** + marcar el desvío.
3. **Aviso del desvío:** **marca en la tarjeta** del servicio (no banner de alertas).
4. **Fecha planificada original:** **guardarla y mostrarla** (para que la marca diga "planificado para DD/MM" y no se pierda el dato).

## 4. Diseño

### A.1 — Fecha real al iniciar (flujo operario, `iniciarServicio`)
Cuando el operario toca **"Iniciar trabajo"** y la `Fecha programada` (date) **no es hoy**:
- Si la property nueva `Fecha planificada` (date) está **vacía**, escribir en ella la `Fecha programada` **original** (una sola vez; no se pisa en reintentos).
- Cambiar `Fecha programada` = **hoy** (`YYYY-MM-DD`, mismo cálculo que el resto de la app).
- Esto va junto con el write de `Estado = ✈️ En curso` que ya hace `iniciarServicio` (una sola llamada `queueableUpdateServiceProps`, offline-safe).
- Si la `Fecha programada` **ya es hoy**: no se toca nada (comportamiento actual intacto).
- Las horas reales (`Hora Inicio Efectivo`) las sigue registrando el flujo normal, sin cambios.

### A.2 — Marca en la tarjeta del coordinador (`coordServiceCard`)
Si el servicio tiene `Fecha planificada` (original) **distinta** de `Fecha programada` (actual), mostrar un chip:
- **`⚠️ Iniciado fuera de fecha · planif. DD/MM`** (formatea `Fecha planificada` como DD/MM).
- Se muestra en la meta de la tarjeta, junto a los otros chips. Solo aparece si `Fecha planificada` existe y difiere; el resto de los servicios no cambian.
- (Opcional en el texto: si hoy < planificada = "iniciado antes"; si hoy > planificada = "hecho después". Para v1 alcanza con el genérico "fuera de fecha · planif. DD/MM".)

### A.3 — Red de seguridad: el panel siempre trae los "En curso" (`fetchCoordItemsForMonth`)
Agregar al `or` del filtro de la query una rama que incluya **siempre** los servicios con `Estado = ✈️ En curso`, sin importar la fecha, respetando el filtro de país (igual que las otras ramas). No se quita nada del filtro actual (los del mes y los de fecha vacía siguen). Así, cualquier servicio "En curso" (incluidos los que ya están en curso ahora, cuya fecha no se tocó) aparece en el panel.

### B — Eliminar servicios completados desde el coordinador (`deleteService` + `openEditSheet`)
- **Mostrar el botón** "🗑️ Eliminar" también para servicios Completados en el sheet del coordinador (quitar la condición que lo oculta para `isCompletado && !esFin`).
- En `deleteService`, **reemplazar el bloqueo duro** (`if (Completado && !esFin) { alert; return; }`) por una **confirmación extra**: si es Completado y no es Finanzas, además del confirm normal, pedir un segundo confirm con aviso de que es **registro histórico** ("Este servicio está COMPLETADO (registro histórico). ¿Eliminarlo igual? Va a la papelera de Notion, recuperable 30 días.").
- El resto queda igual: PATCH `in_trash: true` (papelera, recuperable 30 días). Finanzas mantiene su flujo (su doble confirm actual). Servicios no-completados: sin cambio.

### Property Notion nueva
- **`Fecha planificada`** (tipo `date`) en la DB Servicios (data source `2fbc8a03-5c4f-445c-8516-71dd9b2eea78`). Aditiva (las filas existentes quedan vacías; no afecta a los operarios trabajando). Se crea vía MCP antes del deploy.

## 5. Criterios de aceptación

1. Un operario inicia un servicio cuya fecha programada NO es hoy → la `Fecha programada` pasa a hoy, se guarda la original en `Fecha planificada`, y el servicio **aparece** en el panel del coordinador (mes actual) con la marca **"⚠️ Iniciado fuera de fecha · planif. DD/MM"**.
2. Un operario inicia un servicio cuya fecha ES hoy → sin cambios (no marca, no reescritura de fecha).
3. Un servicio "En curso" con fecha de otro mes aparece igual en el panel (red de seguridad A.3), aunque su fecha no se haya tocado.
4. El coordinador puede **eliminar un servicio Completado** con una confirmación extra → va a la papelera (recuperable). Servicios no-completados: se eliminan como antes. Finanzas: sin cambios.
5. `npm run check` pasa; strings nuevas en es y pt-BR.
6. **Retrocompat:** servicios iniciados en su día programado, el flujo de sectores, Prueba, Relevamiento, y el borrado de no-completados quedan **idénticos**.

## 6. Retrocompat / "no romper nada" (prioridad de Diego)

- `iniciarServicio`: el cambio es **condicional** (`if (Fecha programada !== hoy)`); si es hoy, no toca nada. Aditivo.
- `coordServiceCard`: la marca solo aparece con `Fecha planificada` presente y distinta; el resto de las tarjetas no cambian.
- `fetchCoordItemsForMonth`: se **agrega** una rama al `or` (no se quita ninguna). Los servicios del mes siguen cargando igual.
- `deleteService`/`openEditSheet`: solo cambia el caso coord + Completado (de bloqueo a confirm); Finanzas y no-completados intactos.
- Property `Fecha planificada`: aditiva, invisible hasta que el código nuevo la use.

## 7. Fuera de alcance

- La **Fase B** de jornadas (desplegable en historial del cliente + vista Notion + badge CEO) — es un diseño aparte, **después** de estos fixes (orden pedido por Diego: "luego de eso comienza con la Fase B").
- Distinguir en el texto de la marca "antes" vs "después" con dos wordings distintos (v1 usa el genérico "fuera de fecha").
- Aviso del desvío en el panel CEO (solo coordinador por ahora).

## 8. Reutilización vs nuevo

- **Reutiliza:** `iniciarServicio` (+ su write existente), `queueableUpdateServiceProps`, `coordServiceCard`, `fetchCoordItemsForMonth`, `deleteService`, `openEditSheet`, el patrón de fecha `new Date()...split('T')[0]`.
- **Nuevo:** la escritura condicional de fecha en `iniciarServicio`, el chip de marca en `coordServiceCard`, la rama "En curso" en el filtro, el confirm de completados en `deleteService` + mostrar el botón, la property `Fecha planificada`, y las strings i18n (marca + confirm completados).
