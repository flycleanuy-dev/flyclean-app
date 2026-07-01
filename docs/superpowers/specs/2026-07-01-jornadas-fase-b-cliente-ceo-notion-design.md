# Jornadas — Fase B (historial del cliente + CEO + Notion) — Diseño

**Fecha:** 2026-07-01
**Estado:** Aprobado por Diego (brainstorming: "en curso y terminados" + "vista Notion best-effort"). Pendiente: revisión del spec + plan.
**Relacionado:** [[jornadas-sin-sectores]] (Fase A dejó los helpers `jobGroup`/`jobCompleto`), [[fixes-coordinador-encurso]].

---

## 1. Objetivo

Hacer visibles y agrupadas las **jornadas** (trabajos multi-día) en tres lugares, cerrando el sistema:
- **Historial del cliente (Cliente 360):** un trabajo con varias jornadas se muestra como **una línea desplegable** que agrupa sus jornadas.
- **Panel CEO:** badge **"✅ Servicio completo"** en las tarjetas de servicios (igual que en el coordinador).
- **Notion:** una vista agrupada de las jornadas por su "trabajo madre" (best-effort).

## 2. Contexto (hallazgos de la exploración)

- **Hoy el historial del cliente NO muestra las jornadas.** `loadContactHistory` hace 4 queries; para servicios filtra `Tipo de registro = 📋 Orden de trabajo` + `Estado = ✅ Completado`. Las jornadas (`📅 Jornada`) quedan **afuera** → un trabajo multi-día hoy es **invisible** en el 360.
- Un trabajo multi-día (Forma 1, sin sectores) = **N fichas** todas con `Tipo de registro = 📅 Jornada` que comparten la raíz vía **`Orden madre`** (cuando un servicio se parte, la 1ª ficha también pasa a `📅 Jornada`). Los servicios de sectores (Forma 2) son **una sola ficha** que se reprograma → NO son un grupo (fuera de alcance de este desplegable).
- Ya existen los helpers `jobRootId(svc)`, `jobGroup(svc, pool)`, `jobCompleto(svc, pool)` (Fase A, ~línea 9349). El badge i18n `badge.servicio.completo` ("✅ Servicio completo") ya existe (es+pt).
- Patrón de desplegable existente: `renderPhotoGallery` + `togglePhotos` (botón `.photo-toggle` + contenido `display:none↔flex` + flecha ▾/▴). Se reutiliza la mecánica.

## 3. Decisiones (Diego)

1. **Alcance del historial:** el desplegable muestra el trabajo agrupado apenas tiene jornadas, **en curso Y terminado** (no solo completados).
2. **Vista Notion:** intentarla **ahora** (best-effort vía MCP; si la API no lo permite, receta manual). No bloquea las 2 piezas de la app.

## 4. Diseño

### Pieza 1 — Desplegable de jornadas en el historial del cliente

**Carga (`loadContactHistory`, ~11930):** agregar una 5ª query en paralelo que traiga **las jornadas del cliente** en **cualquier estado**:
`{ and: [{ property:'Contacto', relation:{ contains: contactId } }, { property:'Tipo de registro', select:{ equals:'📅 Jornada' } }] }`.
Mapear los resultados como items `{ type:'servicio', data:r, date: Fecha programada || created }` (se tratan como servicios; la agrupación la hace el render). El resto de las queries queda igual (las órdenes de un solo día completadas siguen apareciendo sueltas).

**Render (`renderContactHistory`, ~11995):** antes/durante el `.map`, **agrupar las jornadas por `Orden madre`** y renderizar cada trabajo como UNA línea desplegable:
- Identificar los items servicio que son jornada (`Tipo de registro` incluye `Jornada`). Agruparlos por `jobRootId(item.data)`.
- Al recorrer `items` (ya ordenados por fecha desc), cuando aparece la 1ª jornada de un grupo aún no renderizado → renderizar el **desplegable del trabajo** en esa posición (la de la fecha más reciente) y marcar el root como renderizado; las demás jornadas del mismo grupo se **saltean** (return ''). Los servicios NO-jornada se renderizan como hoy.
- **Cabecera del desplegable** (reusa `.photo-toggle`):
  `🛠️ {nombre base} · {N} jornadas — {estado}` + flecha ▾, donde:
  - `nombre base` = nombre de la ficha sin el sufijo "— Jornada N" (`.replace(/—\s*Jornada\s*\d+\s*$/,'').trim()`).
  - `estado` = `✅ Servicio completo · 100%` si `jobCompleto(grupo)`; si no `🔄 En curso · {maxPct}%` (maxPct = máximo `% de avance` del grupo).
- **Detalle desplegado** (una fila por jornada, ordenadas por `Jornada N°` asc):
  `J{n} · {fecha DD/MM} · {pct}% {✅ si completada}` → `onclick="openHistoryItem('servicio','{fichaId}')"` (abre esa jornada; `openHistoryItem` ya existe y sabe abrir un servicio).
- Un trabajo con **una sola** jornada (caso raro, ej. si falló la creación de la 2ª) se renderiza igual como grupo de 1.
- **Toggle:** una función `toggleJornadas(btn, ev)` análoga a `togglePhotos` (muestra/oculta el detalle, cambia la flecha). El `onclick` de la cabecera NO debe disparar `openHistoryItem` (usa `event.stopPropagation`).

**Resumen financiero 360:** el bloque de resumen (cobros/propuestas/servicios) queda igual; `nServ` cuenta items servicio — no crítico si suma jornadas (informativo). Sin cambio funcional.

### Pieza 2 — Badge "Servicio completo" en el panel CEO

En `renderCEOServicios` (~7488), para cada tarjeta, calcular `jobCompleto(s, _ceoServiciosCache)` y, si es true, agregar en la `ceo-service-meta` un chip verde reutilizando `t('badge.servicio.completo')` (mismo estilo que el coordinador: `background:var(--green-dark,#14532d);color:var(--green,#22c55e)`). `_ceoServiciosCache` es el pool (servicios del mes). **Limitación conocida** (igual que en el coordinador): si las jornadas del grupo caen en meses distintos, el badge puede no aparecer (nunca marca "completo" de más). Aceptado.

### Pieza 3 — Vista agrupada en Notion (best-effort, controller)

Intentar, vía MCP, crear una **vista** de la DB Servicios agrupada por `Orden madre` (o filtrada a `Tipo de registro = 📅 Jornada`, agrupada por la raíz), para que en Notion las jornadas se vean juntas bajo su trabajo. Si la API (`notion-create-view` / config de la data source) **no lo permite**, dejar una **receta manual de 2 minutos** en el spec/docs. **No bloquea** las piezas 1 y 2 (la app ya agrupa; Notion es un extra visual).

## 5. Strings i18n nuevas (es + pt-BR)

| key | es | pt-BR |
|---|---|---|
| `contact.history.trabajo.jornadas` | `{n} jornadas` | `{n} jornadas` |
| `contact.history.trabajo.completo` | `✅ Servicio completo · {p}%` | `✅ Serviço completo · {p}%` |
| `contact.history.trabajo.encurso` | `🔄 En curso · {p}%` | `🔄 Em curso · {p}%` |

(El badge del CEO reutiliza `badge.servicio.completo`, que ya existe.)

## 6. Criterios de aceptación

1. En la ficha de un cliente con un trabajo multi-día, el historial muestra **una línea desplegable** "🛠️ {trabajo} · N jornadas · {estado}"; al tocarla se ven las jornadas (J1, J2, … con fecha y %), y tocar una jornada abre esa ficha.
2. El desplegable aparece **tanto para trabajos en curso** ("🔄 En curso · Y%") **como completados** ("✅ Servicio completo · 100%").
3. Los servicios de un solo día siguen apareciendo como una línea suelta (sin cambios).
4. En el panel CEO, un servicio cuyo trabajo llegó al 100% muestra el badge **"✅ Servicio completo"**.
5. (Best-effort) En Notion existe una vista que agrupa las jornadas por su trabajo madre, o queda documentada la receta manual.
6. `npm run check` pasa; strings en es y pt-BR.
7. **Retrocompat:** el resto del historial (propuestas, relevamientos, ingresos, servicios de un día) y el resto del panel CEO quedan **idénticos**.

## 7. Fuera de alcance

- Servicios de **sectores** (Forma 2 = una sola ficha que se reprograma): no se "despliegan" (no son un grupo de fichas). Aparecen como un item suelto (cuando completados) como hoy.
- Mostrar **servicios de un solo día EN CURSO** en el historial (hoy el historial muestra órdenes de un día solo completadas; esta Fase B solo agrega los **grupos** de jornadas en cualquier estado). Se puede evaluar aparte.
- La confiabilidad del agrupado entre meses distintos en el CEO (misma limitación aceptada del coordinador).

## 8. Reutilización vs nuevo

- **Reutiliza:** `jobRootId`/`jobGroup`/`jobCompleto`, `openHistoryItem`, el patrón `togglePhotos`/`.photo-toggle`, `badge.servicio.completo`, `_ceoServiciosCache`, `loadContactHistory`/`renderContactHistory`.
- **Nuevo:** la 5ª query de jornadas en `loadContactHistory`; la agrupación + el desplegable en `renderContactHistory`; `toggleJornadas`; el badge en `renderCEOServicios`; 3 strings i18n; la vista Notion (controller/MCP).
