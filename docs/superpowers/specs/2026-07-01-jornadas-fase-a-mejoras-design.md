# Jornadas — Mejoras Fase A — Diseño

**Fecha:** 2026-07-01
**Estado:** Aprobado por Diego (brainstorming: "Fase A rápida primero" + "Servicio completo = la app lo calcula agrupando"). Pendiente: revisión del spec + plan.
**Relacionado:** [[jornadas-sin-sectores]] (feature base, deployada sw v97), [[sectores-sistema]].
**Origen:** feedback de Diego tras probar la feature en vivo (2026-07-01).

---

## 1. Objetivo

Mejorar cómo se **cierra**, **continúa** y **se ve** el sistema de jornadas (servicios multi-día),
en respuesta al feedback de Diego. Esta es la **Fase A** (ajustes concretos, bajo riesgo). La **Fase B**
(agrupación en el historial del cliente + vista Notion) es un diseño aparte, posterior.

## 2. Alcance de la Fase A (5 cambios)

Todo en `index.html`. Sin properties Notion nuevas. Sin harness de tests (gate = `npm run check`).

### A. Botón "Cerrar servicio"
La key i18n `btn.close.notion` (hoy `🏁 Cerrar` / `🏁 Fechar`) pasa a **`🏁 Cerrar servicio`** (es) /
**`🏁 Fechar serviço`** (pt). Es el botón rojo del paso final del operario (todos los tipos). Un solo
cambio de texto, sin lógica.

### B. Doble confirmación en "Ya está, cerrar así" (modal de sectores)
En el modal `cierre-sectores-overlay`, la opción **"✅ Ya está, cerrar así"**
(`cierreSectoresElegir('completar')`) cierra un servicio con sectores **sin terminar**. Como eso es
excepcional (algo pasó; lo normal sería "seguir otro día"), antes de ejecutar el cierre debe aparecer
un **cartel de confirmación**:
> *"El trabajo no se terminó: faltan {n} sector(es). ¿Cerrarlo así igual, en lugar de seguir otro día?"*

Si el usuario cancela, no se cierra (vuelve al modal). "Sigo otro día" y "Cancelar" quedan igual.
Implementación: en `cierreSectoresElegir('completar')`, tras `_cierreResultadoOk()`, recomputar los
sectores pendientes (`serviceState.sectores.filter(s => s.estado !== 'hecho').length`) y hacer
`if (!confirm(t('cierre.sectores.confirm.cerrar').replace('{n}', pend))) return;`.

### C. La continuación (J2) hereda las fotos "antes"
Hoy `crearJornadaSiguiente(parentService, numero, fecha)` NO copia fotos → la J2 arranca sin fotos.
Cambio: la J2 **hereda las fotos "antes"** (`📸 Fotos pre-servicio`) del padre (el estado inicial del
edificio ya fotografiado el día 1; el operario no las re-saca, pero puede **agregar** las que falten).
- **NO** se heredan las fotos "después" (`📸 Fotos post-servicio`) — son el resultado de cada día.
- **NO** se hereda el checklist — arranca en 0 (ya es así; no se copia).
- Implementación en `crearJornadaSiguiente`: leer `parentService.properties['📸 Fotos pre-servicio']?.files`
  y, si hay, escribir `properties['📸 Fotos pre-servicio'] = { files: <re-mapeadas como external {name,url}> }`.
  Re-mapear cada file a `{ type:'external', name: f.name, external: { url: f.external?.url || f.file?.url } }`
  y filtrar las sin url. Al abrir la J2, `hydrateServiceStateFromNotion` ya carga esas fotos pre
  automáticamente (paso `fotos_antes` las muestra como `done`, con opción de agregar).

### D. Etiquetas por día + badge "Servicio completo" (calculado agrupando)
En la **card del coordinador** (`coordServiceCard`):
- **Etiqueta por día:** una jornada **completada** muestra el estado como
  **"🗓️ Jornada {n} completada"** (en vez de solo "✅ Completado"), conservando la clase de color
  `estado-completado` y el chip de **% del día** (`{X}%`, ya existente). Así se lee: *"🗓️ Jornada 1
  completada · 50%"*, *"🗓️ Jornada 2 completada · 100%"*.
- **Badge "Servicio completo":** cuando el **trabajo entero** (grupo de jornadas) llegó al **100%**,
  las cards del grupo muestran un chip verde **"✅ Servicio completo"**.
- **Agrupación (helpers nuevos, LEEN `Orden madre`):**
  ```
  jobRootId(svc)  = svc.properties['Orden madre'].relation[0].id  ||  svc.id
  jobGroup(svc, pool) = pool.filter(f => f.id === root  ||  f.properties['Orden madre'].relation[0].id === root)
  jobCompleto(svc, pool) = jobGroup(...).some(f => Estado incluye 'Completado'  &&  '% de avance' === 100)
  ```
  El `pool` en el coordinador es `_coordAllServices`. Cero datos nuevos en Notion (usa el `Orden madre`
  que ya se escribe). **Confiabilidad:** siempre correcto cuando las jornadas del grupo están en el pool
  cargado (garantizado en el historial del cliente de Fase B; en la lista del mes del coord, si caen en
  el mismo período/carga). Si una jornada del grupo no está cargada, el badge simplemente no aparece en
  esa card (nunca marca "completo" de más).

### E. Ocultar el sistema viejo de "Crear jornada" manual del coordinador
El botón `edit-jornada-cta` ("📅 Crear jornada para otro día") en el sheet de edición del coord se
**oculta siempre**. En `openEditSheet` (donde hoy hace `jornadaCTA.style.display = isRelev ? 'none' : ''`)
pasa a `jornadaCTA.style.display = 'none';`. Las funciones `openCreateJornadaSheet` / `submitCreateJornada`
quedan en el código (muertas, sin botón que las invoque) para no arriesgar; se podrán borrar en una
limpieza futura. El flujo automático (operario cierra "sigo otro día") reemplaza este mecanismo.

## 3. Strings i18n nuevas (es + pt-BR)

| key | es | pt-BR |
|---|---|---|
| `btn.close.notion` (cambia) | `🏁 Cerrar servicio` | `🏁 Fechar serviço` |
| `cierre.sectores.confirm.cerrar` | `El trabajo no se terminó: faltan {n} sector(es). ¿Cerrarlo así igual, en lugar de seguir otro día?` | `O trabalho não terminou: faltam {n} setor(es). Fechar assim mesmo, em vez de continuar outro dia?` |
| `estado.jornada.completada` | `🗓️ Jornada {n} completada` | `🗓️ Jornada {n} concluída` |
| `badge.servicio.completo` | `✅ Servicio completo` | `✅ Serviço completo` |

## 4. Criterios de aceptación (Fase A)

1. El botón del cierre dice **"Cerrar servicio"** (es) / **"Fechar serviço"** (pt).
2. En un servicio con sectores sin terminar, tocar **"Ya está, cerrar así"** muestra un **confirm**; si
   se cancela, no cierra; si se acepta, cierra como hoy. "Sigo otro día" y "Cancelar" sin cambios.
3. Al continuar (J2), el operario abre la J2 y **ya ve las fotos "antes" del día 1** (puede agregar más);
   el **checklist está en 0**; no hay fotos "después".
4. En la card del coord, una jornada completada muestra **"🗓️ Jornada N completada · X%"**; cuando el
   grupo llegó al 100%, muestra además **"✅ Servicio completo"** (en las cards del grupo que estén
   cargadas).
5. El botón "Crear jornada para otro día" del coord **ya no aparece**.
6. `npm run check` pasa; strings en es y pt-BR.
7. Retrocompat: servicios de un solo día (no jornada) y el flujo de sectores no cambian (salvo el texto
   del botón y el confirm de "cerrar así").

## 5. Fuera de alcance (Fase B — diseño aparte)

- **Historial del cliente (Cliente 360):** agrupar las jornadas de un mismo trabajo en una línea
  **desplegable** ("🛠️ Servicio X · ✅ Completo · N jornadas · Y%") reutilizando `jobGroup`/`jobCompleto`.
- **Vista Notion:** configurar (vía MCP) los sub-items usando la relación `Orden madre`↔`Jornadas` para
  que las jornadas se vean anidadas bajo su madre en Notion.
- **Badge "Servicio completo" en el panel CEO** (`renderCEOServicios`) y confiabilidad del agrupado
  entre distintos meses/cargas.
- Borrar el código muerto del mecanismo viejo de jornada manual.

## 6. Reutilización vs nuevo

- **Reutiliza:** `crearJornadaSiguiente`, `hydrateServiceStateFromNotion` (carga fotos pre solo), el modal
  de sectores, `coordServiceCard`, `_coordAllServices`, el `Orden madre` ya escrito.
- **Nuevo:** el `confirm` en `cierreSectoresElegir`, la copia de fotos pre en `crearJornadaSiguiente`,
  los helpers `jobRootId`/`jobGroup`/`jobCompleto`, la etiqueta por día + badge en `coordServiceCard`,
  el ocultado del botón viejo, y las 4 strings i18n.
