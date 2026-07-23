// Conocimiento del BOT DE AYUDA (api/ayuda-bot.js), por ROL.
// Texto ESTÁTICO curado con los FLUJOS REALES de la app (labels exactos de botones/pestañas, verificados
// contra index.html el 2026-07-14). El bot SOLO recibe el texto del rol de quien pregunta (el rol sale del
// token de sesión, no del cliente). El bot no accede a datos ni ejecuta nada: esto es todo lo que "sabe".
// MANTENIMIENTO: cuando cambia una feature de un rol, actualizar su sección acá (además del manual PDF).

const COMUN = `## Menú de cuenta (⋯ arriba a la derecha, en todas las pantallas)
- 🔑 Cambiar mi PIN: PIN actual + PIN nuevo + confirmar → "Guardar nuevo PIN".
- 🌐 Idioma (Español / Português) · 🌎 Cambiar región / país · ↻ Buscar actualización (muestra la versión).
- 📋 Mi historial de trabajos: todos los trabajos donde participaste (solo lectura; solo podés editar tu nota).
- 🔧 Mis equipos: si sos responsable de un equipo, acá cargás el reporte semanal (km/horas + nota).
- 📖 Ayuda y manuales: los manuales en PDF de tu rol.
- 🚪 Cerrar sesión (pide confirmación).`;

const OPERARIO = `# Cómo usar la app — rol OPERARIO (trabajo de campo)

## Entrar
Elegís el país, escribís tu nombre (como te llaman, sin importar mayúsculas o tildes) + tu PIN. Caés en "Mis servicios".

## Mis servicios (tu día)
Ves SOLO los trabajos asignados a vos, agrupados por día (Hoy arriba). Pestañas por tipo: 📋 Órdenes · 📅 Jornadas · 🧪 Pruebas · 🔍 Relevamientos. Cada card muestra estado, hora 🕐 y lugar 📍. Tocá la card para abrir el trabajo.

## 🚁 Próximos trabajos donde participás
Si te toca ir como PILOTO, operario manual o ayudante (pero el encargado es otro), aparece en el bloque azul arriba de "Mis servicios": cuándo, dónde (🗺️ mapa) y quién es el encargado. Es solo informativo — el checklist lo hace el encargado.

## El flujo de una orden de trabajo, paso a paso
1. ▶ INICIAR: ves los datos, las notas del coordinador, el botón 🗺️ Abrir en Maps y los equipos asignados. Tocás "▶ INICIAR SERVICIO" cuando llegás (registra la hora; te pide permiso de ubicación, opcional).
2. ✅ Checklist PRE-vuelo: 16 puntos obligatorios (baterías, satélites, etc.). "Continuar →".
3. 📸 Fotos ANTES del trabajo (mínimo 2).
4. 🕐 Inicio Efectivo: marcás la 🌤️ CONDICIÓN CLIMÁTICA y el 🛠️ MÉTODO DE TRABAJO — 🚁 Dron y/o 💪 Manual (podés marcar los dos); si es Manual, elegís las herramientas (Lanzas / Manguera / Hidrolavadora / Otro). Tocás "🕐 REGISTRAR INICIO EFECTIVO".
5. 🚁 TRABAJO: si el trabajo tiene sectores, vas marcando cada sector (pendiente → en curso → ✅ hecho). "Terminar operativa →".
6. ⏹ REGISTRAR CIERRE EFECTIVO.
7. ✅ Checklist POST-servicio (7 puntos, ej. avisar al cliente).
8. 📸 Fotos DESPUÉS del trabajo (mínimo 2).
9. 📝 Observaciones: escribís tus notas y respondés "¿Terminaste el trabajo?":
   - "✅ Sí, quedó terminado" → elegís el 🏁 RESULTADO: ✅ Exitoso / ⚠️ Con incidencia / ❌ Fallido.
   - "🔄 No, sigo otro día" → ponés 📊 cuánto va del trabajo (%) y la app crea sola la ficha del día siguiente (jornada).
10. 🏁 Finalizar servicio.

## Si tocaste INICIAR por error
En los pasos siguientes aparece el banner con "↩ Cancelar inicio" → confirmás y el trabajo vuelve a Asignado. OJO: si ya registraste el inicio efectivo (paso 4), ya no se puede cancelar.

## Pruebas y relevamientos
La 🧪 Prueba es el mismo flujo, pero al final elegís: ✅ Avanza a propuesta / ❌ No interesado / 🔄 Re-contactar. El 🔍 Relevamiento tiene pasos propios: lugar → datos (m², altura, dificultades) → fotos → notas → cerrar.

## 💸 Gasto por foto
Botón "💸 Gastos" arriba → "📷 Sacar foto del recibo" (o 📎 elegir archivo, o cargar manual). En Uruguay la IA lee el ticket y pre-llena monto, fecha y proveedor; vos revisás. Elegís CATEGORÍA, si es de un servicio lo vinculás en SERVICIO VINCULADO, y "💾 Guardar gasto".

## 📦 Pedir insumo
Botón "📦 Pedir" arriba → Producto + Prioridad (🔴 Urgente = frena el trabajo · 🟡 Normal · 🟢 Sugerente) + cantidad/proveedor/costo si los sabés → "📦 Enviar pedido". Abajo ves tus pedidos y su estado (Pendiente → Comprado → Recibido).

## 🔧 Mis equipos (si sos responsable de un dron o camioneta)
Cada viernes te aparece un aviso para pasar los números. Abrís "Mis equipos" (menú ⋯ o tocando el aviso): ponés el TOTAL de hoy — km si es camioneta, horas si es dron (ves "antes: …" para no equivocarte) — + una nota si hay algo, y "Guardar reporte".
Si el equipo tiene un problema (anda mal, necesita mantenimiento, hay que actualizarlo): tocá "⚠️ Reportar un problema", elegí qué le pasa, describilo y "Enviar reporte". Le llega al coordinador y queda registrado hasta que lo resuelvan.

${COMUN}`;

const COORDINADOR = `# Cómo usar la app — rol COORDINADOR (planificación y operación diaria)

## Tu panel
Pestañas: 🏠 Inicio · 📊 Resumen · 📋 Servicios · 💼 Propuestas · 👥 Clientes · 🎯 Prospección · 📦 Pedidos · 🔧 Equipos. En el header: 📦 (pedir insumo), 💸 (gastos), ⋯ (menú). Arriba aparecen las alertas del día (propuestas para recontactar, equipos sin check, problemas de dron reportados, documentos por vencer).

## CLIENTES — editar datos (teléfono, email, notas, etc.)
1. Pestaña 👥 Clientes.
2. Buscá al cliente con "🔍 Buscar contacto…" (o en las secciones 🔁 Mantenimiento / activos / 😶 Sin respuesta / ❌ Rechazados).
3. Tocá la tarjeta del cliente → se abre su ficha editable (no hay botón "editar": tocar la tarjeta ya la abre).
4. Cambiá lo que necesites. Los campos son: NOMBRE / EMPRESA · ESTADO (🆕 Lead / ✅ Cliente activo / ⏸️ Inactivo) · TIPO DE CLIENTE (🏢 Administración / 🏗️ Constructora / 🏠 Particular) · PAÍS · CANAL DE CAPTACIÓN · SERVICIO DE INTERÉS · **TELÉFONO / WHATSAPP** · EMAIL · CIUDAD / ZONA · UBICACIÓN (GOOGLE MAPS) con botón 📍 Abrir · 🔁 RECONTACTAR A PARTIR DE (posponer el aviso de recontacto hasta una fecha) · LLEGÓ POR (INTERMEDIARIO) · INTERLOCUTOR · NOTAS · 🏢 Sectores del cliente (+ Agregar).
5. Tocá "💾 Guardar" al pie. Listo — solo se guarda lo que cambiaste.
Ejemplo: para cambiar el teléfono → 👥 Clientes → tocá el cliente → campo TELÉFONO / WHATSAPP → escribí el nuevo → 💾 Guardar.

## Crear un cliente nuevo
👥 Clientes → botón "+ Nuevo Contacto" → misma ficha en modo alta → "✨ Crear". (Para un lead comercial rápido: 🎯 Prospección → "＋ Prospecto", alta de 20 segundos.)

## Cliente 360 (historia del cliente)
Dentro de la ficha del cliente, sección 📜 HISTORIAL DEL CLIENTE: propuestas, relevamientos, servicios (con jornadas agrupadas) y cobros, con resumen por moneda. También podés tocar "＋ Nuevo servicio para este cliente" desde ahí.

## PROPUESTAS — seguimiento y estados
- Pestaña 💼 Propuestas. Arriba, el bloque "📞 A contactar hoy" te marca a quién seguir; cada fila tiene botón "📞 Contactado".
- "+ Nueva Propuesta" para crear una.
- Tocá una propuesta → su ficha: botones "💬 Abrir WhatsApp" y "📞 Recontacté hoy"; el ESTADO PIPELINE se cambia tocando el chip del estado (🆕 Nuevo lead → 📞 Contactado → 🔍 Relevamiento → ⏳ En preparación → ✅ Aprobada internamente → 📤 Enviada al cliente → 🤝 Negociando → ✅ Aceptada / ❌ Rechazada / 😶 Sin respuesta / 🔄 Reactivo). También editás PRECIO PROPUESTO (el precio que le cotizás al cliente; con calculadora 🧮 de precio por m²), TIPO (📌 Puntual / 🔄 Recurrente), fechas y DOS campos de notas distintos: OBSERVACIONES PARA EL CLIENTE (van dentro del PDF que recibe el cliente) y 📝 NOTAS INTERNAS (solo el equipo — el cliente NUNCA las ve). "💾 Guardar". Cuando la propuesta se acepta y creás el servicio, ahí el precio pasa a llamarse "Precio acordado".
- Botones de conversión según el estado: "🔍 Pedir relevamiento previo" · "🧪 Hacer prueba demo" · y cuando está ✅ Aceptada: "→ Crear servicio desde esta propuesta".
- "📄 Generar propuesta PDF" (si tiene importe) para mandársela al cliente.

## SERVICIOS — crear y editar
- Crear suelto: 📋 Servicios → "＋ Nuevo servicio" → TIPO (🏢 Servicio / 🔍 Relevamiento / 🧪 Prueba) + cliente (o ➕ Nuevo cliente ahí mismo) + NOMBRE DEL TRABAJO + TIPO DE SERVICIO + FECHA → "✨ Crear" (te abre la ficha para asignar gente).
- Editar: tocá la card del servicio → la ficha tiene: NOMBRE · ESTADO (📋 Pendiente / 🔄 Asignado / ✈️ En curso / ✅ Completado / ❌ Cancelado) · ENCARGADO DEL SERVICIO (quien hace el checklist y lo ve en su app) · PILOTO (del dron) · OPERARIO MANUAL · AYUDANTES (cada uno suma 1 jornal) · 🏢 SECTORES · FECHA + HORA DE INICIO PROGRAMADA + LUGAR · TIPO DE SERVICIO · bloque CLIENTE (tocás el nombre → su ficha 360; "✏️ Cambiar cliente"; "📄 Ver propuesta"; 📍 Ubicación) · 📝 NOTAS PARA EL OPERARIO + 🗒️ OBSERVACIÓN PARA EL CLIENTE (va en el PDF) · 🚁 EQUIPOS ASIGNADOS (+ Agregar equipo) · 💸 GASTOS VINCULADOS (+ Agregar gasto). Al pie: 🗑️ Eliminar · "📄 Generar reporte" (si está Completado) · "💾 Guardar".

## PDF de devolución al cliente
En un servicio ✅ Completado (o relevamiento/prueba): abrí su ficha → "📄 Generar reporte" → escribí la observación para el cliente (y el monto si es prueba/relevamiento) → "📄 Generar PDF". Sale con fotos antes/después y marca FlyClean.

## GASTOS y PEDIDOS
- 💸 (header) → foto del recibo (la IA lo lee en Uruguay) o carga manual → CONCEPTO, MONTO + moneda, FECHA, PROVEEDOR, CATEGORÍA, clase (📌 Directo vinculado a un servicio / 🔁 Indirecto), FORMA DE PAGO → "💾 Guardar gasto".
- Pestaña 📦 Pedidos: lo que piden los operarios, por urgencia. En cada pedido: "✅ Marcar comprado" → "📦 Marcar recibido" (o ❌ Cancelar).

## 🔧 EQUIPOS (flota)
- Pestaña 🔧 Equipos: toda la flota del país con estado, matrícula, km/horas, responsable y semáforo del reporte semanal (🟢 al día / 🟡 / 🔴).
- "✏️" para editar un equipo: nombre, marca/modelo, matrícula, Estado, y 👤 Responsable — la persona de campo que reporta km/horas cada semana desde su app. También "🗑️ Eliminar equipo".
- "✅ Check": registrás km (vehículo) u horas (dron) + nota → "Registrar check". "🔧 Service": qué se hizo + próximo mantenimiento. "📜": historial completo del equipo.
- "＋ Agregar equipo" para dar de alta.
- Si un piloto reporta un problema, lo ves en la card (⚠️ … · reportó el piloto) y como alerta arriba; cuando lo solucionás, tocá "✓ Resuelto".

${COMUN}`;

const CEO = `# Cómo usar la app — rol CEO / DIRECCIÓN (visión del negocio)

## Tu panel
Tabs de país arriba (para mirar cada país) y las vistas: 📊 Métricas · 📋 Servicios · 💰 Finanzas · 💰 Por cobrar · 👥 Clientes · 👥 Equipo. (Dirección además tiene el panel del coordinador completo — botón 📊 CEO para saltar — y el Panel 🧹 Limpieza para depurar datos.)

## 📊 Métricas
Servicios activos y completados, clientes, y las cuentas del negocio. Los montos SIEMPRE separados en pesos (UY$) y dólares (USD) — nunca mezclados.

## 💰 Finanzas
Resumen de gastos e ingresos. Arriba tenés el toggle de moneda 🇺🇾 UY$ / 🇺🇸 USD: toda la vista (totales, gráfico anual, categorías) se recalcula en la moneda que elijas.

## 💰 Por cobrar y 👥 Clientes
Lo pendiente de cobro agrupado por cliente y la cartera — en solo-lectura para consultar (la operación la hace Finanzas).

## 👥 Equipo + 🔑 Cuentas de acceso (PINs)
En 👥 Equipo está "🔑 Cuentas de acceso":
- Para setear o resetear el PIN de alguien: tocá "🔑 PIN" en su fila → escribí el PIN nuevo (4 o 6 dígitos) → listo. Así activás los accesos de los socios de otros países.
- "➕ Agregar usuario": nombre, rol (Dirección/Coordinador/Operario/CEO/Administración/Ventas) y país → "Crear usuario + poner PIN". "✏️" edita, "Baja" desactiva, "🗂️ Dados de baja" muestra los inactivos (se pueden reactivar).

## 📑 Documentos y certificados
Menú ⋯ → ⚙️ Configuración → 📑 Documentos y certificados: cargás DGI, BPS, seguros y permisos con su vencimiento. La app te avisa sola cuando se acercan a vencer (alerta arriba).

## 🧹 Limpieza (solo Dirección)
Detecta clientes posiblemente duplicados — y te dice POR QUÉ los agrupó (comparten teléfono / email / mismo nombre) — y servicios a revisar. Elegís cuál queda ("Queda este") y la app reapunta servicios, propuestas y cobros al que queda.

${COMUN}`;

const FINANZAS = `# Cómo usar la app — rol FINANZAS / ADMINISTRACIÓN

## Tu panel
Pestañas: 📊 Resumen · 💰 Por cobrar · 👥 Clientes · 💸 Gastos · 💵 Ingresos · 📊 Reportes. Todo separado en pesos (UY$) y dólares (USD), nunca mezclado.

## 💵 Cargar un ingreso / cobro manual
Pestaña 💵 Ingresos → "💵 + Nuevo ingreso / pago" → Cliente + Servicio vinculado (opcional) + Moneda (🇺🇸 USD / 🇺🇾 UY$) + Monto + Fecha + Tipo + Detalle + checkbox Facturado → "💾 Guardar ingreso".

## 💰 Por cobrar
Las visitas facturables agrupadas por cliente, con el saldo por moneda.
- "✏️" en una visita abre la ficha del servicio para corregirla.
- Si un cobro está en otra moneda que el precio, al asociarlo la app te pregunta cuánto cubre (reconciliación de monedas en un toque).
- Clientes con contrato recurrente y visitas sin precio: botón "📑 Asignar el precio del contrato a estas N visita(s)" (asigna en bloque).
- Cobros sin vincular: elegís el servicio en el selector, o "✏️" para editar el cobro (servicio, moneda, monto, fecha).

## 💸 Gastos
Pestaña 💸 Gastos (o el botón 💸 del header): cargar por foto del recibo (en Uruguay la IA lo lee y pre-llena) o manual → CONCEPTO, MONTO + moneda, FECHA, PROVEEDOR, CATEGORÍA, clase (📌 Directo a un servicio / 🔁 Indirecto: sueldos, alquiler…), FORMA DE PAGO → "💾 Guardar gasto".

## 📊 Reportes (PDF)
Pestaña 📊 Reportes: "📄 Reporte semanal" · "📅 Reporte mensual" · "📊 Reporte por servicio" (elegís un servicio completado y baja su PDF de devolución).

${COMUN}`;

const VENTAS = `# Cómo usar la app — rol VENTAS / PROSPECCIÓN (comercial)

## Tu panel
Pestañas: 🎯 Prospección · 💼 Propuestas · 👥 Clientes · 🗺️ Mapa. No ves finanzas ni costos. Las fichas de clientes y propuestas las ves en modo lectura (podés hacer seguimiento, no editar).

## 🎯 Prospección
- "＋ Prospecto" → alta rápida de 20 segundos: EMPRESA / EDIFICIO, PERSONA DE CONTACTO, TELÉFONO / WHATSAPP, EMAIL, LINK MAPA, ORIGEN DEL LEAD, INTERÉS, PRÓXIMO CONTACTO, NOTA → "✨ Crear".
- En cada prospecto: "💬 WhatsApp" (solo abre el chat) y "📞 Contactado hoy" (registra el contacto y reprograma) — son dos cosas distintas: abrir WhatsApp NO marca contactado; marcalo solo si realmente hablaste.
- "🤝 Interesado" cuando avanza · "❌ Descartar" si no va · "✅ Pasar a cliente" cuando se concreta.

## 💼 Propuestas (seguimiento)
Ves las propuestas y su estado. "📞 A contactar hoy" te marca a quién seguir. En la ficha: "💬 Abrir WhatsApp" y "📞 Recontacté hoy" (tu única edición es registrar el seguimiento). Si tiene importe, podés "📄 Generar propuesta PDF" para mandarla.

## 👥 Clientes
La cartera en modo lectura, con "💬 WhatsApp" y "📞 Contactado" en cada uno.

## 🗺️ Mapa
El mapa de prospección con los objetivos. Los ticks de "contactado" son compartidos con todo el equipo.

${COMUN}`;

// Mapa ROL (de users.js, con emoji) → texto. Se matchea por .includes() para tolerar variaciones del emoji.
// Dirección OPERA ambos paneles (coordinador completo + CEO) → recibe los dos textos.
const POR_CLAVE = [
  ['Operario', OPERARIO],
  ['Coordinador', COORDINADOR],
  ['Dirección', CEO + '\n\n---\n\n' + COORDINADOR], // antes que 'CEO' no hace falta: se matchea por includes en orden
  ['CEO', CEO],
  ['Administración', FINANZAS],
  ['Ventas', VENTAS],
];

// Devuelve { clave, texto } para el rol dado, o null si no matchea ninguno (→ el endpoint responde 403).
export function ayudaParaRol(rol) {
  const r = String(rol || '');
  for (const [clave, texto] of POR_CLAVE) {
    if (r.includes(clave)) return { clave, texto };
  }
  return null;
}
