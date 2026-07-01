# Coordinador autónomo — crear suelto + campos faltantes — Diseño

**Fecha:** 2026-07-01
**Estado:** Aprobado por Diego (brainstorming: 4 agujeros a tapar; botón "＋ Nuevo" en Servicios + dentro del cliente). Pendiente: revisión del spec + plan.
**Origen:** auditoría de "qué NO puede hacer el coordinador desde la app" → el coordinador está al ~80-85% de autonomía; estos 4 agujeros lo mandan a Notion. Objetivo: **que el coordinador haga TODO desde la app; Notion queda de respaldo.**
**Relacionado:** [[admin_roadmap]], [[hub_crm_plan]], [[arquitectura_notion_db]].

---

## 1. Objetivo

Tapar los 4 agujeros que hoy obligan al coordinador a entrar a Notion:
1. **Crear un servicio / relevamiento / prueba SUELTO** (sin una propuesta previa).
2. **Editar el "Tipo de servicio"** (Fachada/Vidrios/Paneles) de un servicio.
3. **Editar "Notas pre-servicio"** (instrucciones del coordinador al operario).
4. **Editar "Observación cliente"** desde el sheet de edición (hoy solo desde el PDF).

## 2. Contexto (hallazgos de la auditoría)

- Hoy TODO servicio/relevamiento/prueba nace **derivado de una propuesta** (`createServicioFromPropuesta`, `createRelevamientoFromPropuesta`, `createPruebaFromPropuesta`). No hay un "＋ nuevo servicio" suelto → para un trabajo que entra por llamada/mail, el coordinador tiene que crear una propuesta trucha.
- El **sheet de edición del servicio** (`openEditSheet` + `saveServiceEdit`) ya edita: nombre, estado, fecha, hora, lugar, mapa, piloto, ayudantes, sectores. **No** tiene: `Tipo de servicio`, `Notas pre-servicio`, `Observación cliente`.
- Ya existen patrones reutilizables: **alta de propuesta suelta** (`openNewPropSheet` + `savePropEdit`) con **buscador/creador de cliente inline**; **alta de cliente** (`openNewContactSheet`); el **update optimista** de la lista (`_coordAllServices.unshift`).

## 3. Decisiones (Diego)

- Tapar los **4** agujeros.
- El botón **"＋ Nuevo"** va **en la tab Servicios** (crear cualquiera desde cero) **y** un **"＋ nuevo servicio"** **dentro de la ficha del cliente** (con el cliente ya elegido).
- Enfoque del alta: pantalla chica con lo mínimo → **crea la ficha → abre el sheet de edición** para completar el resto (reusa la UI existente).

## 4. Diseño

### #1 — Crear servicio / relevamiento / prueba SUELTO

**Botón(es) "＋ Nuevo":**
- En el **header de la tab Servicios** del coordinador: `＋ Nuevo`.
- En la **ficha del cliente** (sheet de contacto): `＋ nuevo servicio` — abre la misma pantalla con el cliente **pre-elegido**.

**Pantalla nueva `openNewServiceSheet(prefillContactId = null)`** (sheet, sibling del body). Pide lo mínimo:
- **Tipo de registro:** selector `🏢 Servicio` (→ `📋 Orden de trabajo`) · `🔍 Relevamiento` · `🧪 Prueba`.
- **Cliente:** buscador de clientes existentes **o crear uno nuevo al vuelo** — **reutiliza el mismo componente/patrón del alta de propuesta** (`openNewPropSheet`: busca en `_coordAllContacts`, o crea un contacto nuevo con nombre + teléfono). Si vino `prefillContactId`, queda fijado (no editable, o editable pero pre-seleccionado).
- **Nombre del trabajo** (texto).
- **Tipo de servicio:** selector `🏢 Fachada` · `🪟 Vidrios` · `☀️ Paneles solares`.
- **Fecha programada:** date, **hoy** por defecto.

**Al confirmar (`submitNewService`):**
- POST a la DB Servicios (data source `2fbc8a03-…`, `pages` POST con `data_source_id`, como `createServicioFromPropuesta`/`submitCreateJornada`) con: `Nombre del servicio`, `Estado = 📋 Pendiente`, `Tipo de registro` (según selector), `Tipo de servicio` (según selector), `Fecha programada` (hoy o la elegida), `Contacto` (relation al cliente), `País` (heredado del cliente si tiene, si no el del coordinador).
- **Update optimista:** `_coordAllContacts` ya trae el contacto; el servicio nuevo se agrega a `_coordAllServices` (`unshift`) + re-render, y se **abre el sheet de edición** (`openEditSheet(nuevoId)`) para completar piloto/hora/lugar/sectores. (Evita el bug "creado pero no aparece" — mismo patrón ya usado.)
- El **flujo del operario** para un relevamiento/prueba/servicio creado así es idéntico al de hoy (el tipo de registro define su flujo).

### #2 — Editar "Tipo de servicio" en el sheet de edición

En `openEditSheet` (render) agregar un selector `Tipo de servicio` (Fachada/Vidrios/Paneles) pre-cargado con el valor actual; en `saveServiceEdit` guardar `Tipo de servicio` (`select`). Si estaba vacío, queda vacío.

### #3 — Editar "Notas pre-servicio" en el sheet de edición

En `openEditSheet` agregar un **textarea** `Notas pre-servicio` (instrucciones del coordinador al operario; el operario ya las ve en su step 0); en `saveServiceEdit` guardar `Notas pre-servicio` (`rich_text`). Pre-cargado con el valor actual.

### #4 — Editar "Observación cliente" en el sheet de edición

En `openEditSheet` agregar un **textarea** `Observación cliente` (la que va en el PDF de devolución); en `saveServiceEdit` guardar `Observación cliente` (`rich_text`). Pre-cargado. (El paso previo del PDF que ya la edita queda igual; ahora también se puede editar acá.)

### Property Notion
- **Sin properties nuevas.** Todo reutiliza properties existentes: `Nombre del servicio`, `Estado`, `Tipo de registro`, `Tipo de servicio`, `Fecha programada`, `Contacto`, `País`, `Notas pre-servicio`, `Observación cliente`.

## 5. Criterios de aceptación

1. Desde la tab **Servicios**, el botón **"＋ Nuevo"** abre una pantalla que permite crear un **Servicio / Relevamiento / Prueba** eligiendo cliente (existente o nuevo) + tipo de servicio + fecha, **sin** una propuesta previa; al confirmar, la ficha se crea, aparece en la lista y se abre su sheet de edición.
2. Desde la **ficha de un cliente**, "＋ nuevo servicio" abre la misma pantalla con **ese cliente ya elegido**.
3. En el **sheet de edición** de un servicio, el coordinador puede editar **Tipo de servicio**, **Notas pre-servicio** y **Observación cliente**, y se guardan en Notion.
4. `npm run check` pasa; strings nuevas en es y pt-BR.
5. **Retrocompat:** el alta desde propuesta, el sheet de edición actual (todos sus campos) y el flujo del operario quedan **idénticos**; solo se suma el botón "＋ Nuevo", su pantalla y los 3 campos.

## 6. Fuera de alcance

- El **filtro de servicios por cliente** en la lista general (ya se ve en el 360 del cliente).
- **Archivar cliente** con botón (hoy se hace con estado "⏸️ Inactivo").
- **Intermediario en el alta de cliente** (hoy se agrega editando).
- **Drag-drop del Kanban** y el límite de 3/día del calendario (mejoras de UX aparte).
- Migración a Supabase (roadmap, etapa aparte).

## 7. Reutilización vs nuevo

- **Reutiliza:** el patrón de alta de propuesta suelta (`openNewPropSheet`/buscador-creador de cliente), `createServicioFromPropuesta` (patrón de POST + herencia), `openEditSheet`/`saveServiceEdit` (para los 3 campos y para completar tras el alta), el update optimista de `_coordAllServices`.
- **Nuevo:** `openNewServiceSheet(prefillContactId)` + `submitNewService`, el/los botón(es) "＋ Nuevo", los 3 campos en `openEditSheet` + su guardado en `saveServiceEdit`, y las strings i18n.
