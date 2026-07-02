# Secciones de clientes + mantenimiento 9 meses + rol Ventas — Diseño

**Fecha:** 2026-07-02 (noche) · **Estado:** aprobado por Diego ("esto hacelo hoy"), ejecución en curso.
**Complementa:** `2026-07-02-pipeline-top-relojes-prospeccion-design.md` (dos relojes + prospección).

---

## A — Secciones en la vista Clientes (coordinador; CEO hereda)

La lista de Clientes se reorganiza en secciones desplegables, calculadas EN VIVO del cruce
clientes × propuestas × servicios (espejo, con fallback Notion). Un cliente cae en UNA sección:

| Sección | Criterio (en este orden) | Default |
|---|---|---|
| **🔁 Mantenimiento (N)** | Tiene servicios completados, el ÚLTIMO hace ≥270 días (9 meses), y NO tiene servicios más nuevos ni propuestas abiertas → hay que ofrecerle limpieza de mantenimiento | Arriba, expandida |
| **Cartera activa** | Todo cliente con servicios o propuestas vivas (o sin historia negativa) | Expandida (la lista normal de hoy) |
| **😶 Sin respuesta (N)** | Su única historia comercial terminó en propuestas "😶 Sin respuesta" (sin servicios, sin propuestas abiertas) | Colapsada, al fondo |
| **❌ Rechazados (N)** | Ídem con "❌ Rechazada" | Colapsada, al fondo |

- Los colapsados NO se mezclan con los activos (pedido explícito). Se abren con un toque (patrón
  desplegable existente). El buscador busca en todas las secciones.
- **Alerta nueva** en el banner del coord: "🔁 N clientes para ofrecer mantenimiento" → tocable →
  tab Clientes (patrón v110). El umbral 270 días fijo en v1 (constante con comentario).
- Acción sobre un cliente de Mantenimiento: tocar → su ficha (ahí ya están "＋ Nuevo trabajo" y
  propuestas). Sin botones nuevos en v1.

## B2 — Rol 🧲 Ventas + prospección (diseño fino, "ni sobre ni falte")

### Campos del prospecto (en la DB Clientes — nada de bases nuevas)
Reusa: `Nombre / Empresa` (title) · `Teléfono / WhatsApp` · `Email` · `País` · `Mapa` (URL/dirección).
Nuevos (Notion los crea al escribir; selects):
| Campo | Tipo | Opciones / uso |
|---|---|---|
| `Estado` (existente) | select | + opciones nuevas: `🎯 Prospecto` · `📵 Prospecto contactado` · `🤝 Interesado` · `❌ Descartado` (las de cartera ya existen) |
| `Origen del lead` | select | 🧲 Vendedor · 🤝 Referido · 🌐 Web/Redes · 📞 Entrante · 🚶 Puerta fría |
| `Interés` | multi_select | 🏢 Fachada · 🪟 Vidrios · ☀️ Paneles solares |
| `Contacto (persona)` | rich_text | Nombre y cargo de la persona (el title es la empresa/edificio) |
| `Próximo contacto` | date | El planificador del vendedor: cuándo volver a tocar la puerta |
| `Notas prospección` | rich_text | Contexto libre (qué dijo, con quién hablar, horarios) |

Criterio "ni sobre ni falte": todo campo tiene un USO en la vista (orden, filtro o render).
No se agregan campos "por si acaso" (presupuesto estimado, tamaño del edificio, etc. viven en la
PROPUESTA cuando nace — no se duplican en el prospecto).

### Vista "🎯 Prospección" (tab en el panel coordinador, visible para roles Ventas y Coordinador)
- **Alta rápida** (sheet): empresa/edificio, persona de contacto, tel, email, zona/mapa, origen,
  interés, próximo contacto, nota. 20 segundos por prospecto.
- **Lista de trabajo**, ordenada por urgencia: 1º los `Próximo contacto` vencidos/hoy (resaltados),
  después por estado (Interesado > Contactado > Prospecto). Cada card: empresa, persona, interés,
  origen, próximo contacto, y acciones de UN TOQUE: `📞 Contactado hoy` (estampa nota de fecha +
  mueve a Prospecto contactado si estaba en Prospecto) · `🤝 Interesado` · `❌ Descartar`.
- **Pasa a propuesta**: botón "→ Crear propuesta" visible SOLO para coordinador/Dirección (decisión
  de Diego: Ventas junta y madura; el coord cotiza). Al crearla, el Estado del cliente pasa a los
  estados de cartera normales.
- **Métricas** (sección Comercial del CEO): prospectos nuevos por semana, por origen, y el embudo
  Prospecto → Interesado → Propuesta → Aceptada.

### El rol 🧲 Ventas (aislamiento)
- Asiento en `USERS` (ej. `ventas-uy`, nombre placeholder hasta contratar; PIN vía CEO→Equipo→🔑).
- Al entrar ve SOLO la tab Prospección (patrón de gating por rol tipo `esDireccion()`/tab limpieza).
  Sin Servicios, sin Propuestas, sin Finanzas, sin Clientes de cartera.
- La vista Prospección para Ventas filtra a estados de prospección (no ve la cartera activa).
- RLS: limita por país (policies actuales). El recorte "solo estados de prospección" es de vista
  (v1); si se quiere inviolable a nivel base → policy por estado en Fase 2 del rol (documentado).

## Orden de ejecución (esta noche)
1. B1 dos relojes (en curso) → review → 2. A secciones+mantenimiento → review → deploy **v111** +
backfill fecha de envío → 3. B2 prospección+rol Ventas → review → deploy **v112** → verificación
en vivo de todo + docs + memoria.
