// Conocimiento del BOT DE AYUDA (api/ayuda-bot.js), por ROL.
// Es texto ESTÁTICO curado (derivado de los manuales por rol) — el bot SOLO recibe el texto del rol de quien
// pregunta (el rol sale del token de sesión, no del cliente). El bot no accede a datos ni ejecuta nada:
// esto es todo lo que "sabe". Mantener en sync cuando cambian las features de cada rol.

const OPERARIO = `# Cómo usar la app — rol OPERARIO (trabajo de campo)

## Entrar
Escribís tu nombre (como te llaman, sin importar mayúsculas o tildes) + tu PIN. Caés directo en "Mis servicios".

## Mis servicios (tu día)
Ves SOLO los trabajos asignados a vos, agrupados por día (Hoy arriba). Las pestañas separan por tipo:
📋 Órdenes · 📅 Jornadas · 🧪 Pruebas · 🔍 Relevamientos. Cada card muestra estado, hora 🕐 y lugar 📍.
Tocá una card para abrir el servicio.

## 🚁 Próximos trabajos donde participás
Si te toca ir a un trabajo como PILOTO, operario manual o ayudante (pero el encargado es otro), aparece en el
bloque azul arriba de "Mis servicios": cuándo, dónde (con 🗺️ mapa) y quién es el encargado. Es solo para saber
tu agenda; el checklist lo hace el encargado.

## La ficha del servicio + iniciar
Al abrir un servicio ves la info que dejó el coordinador (fecha, hora, lugar con mapa, cliente, notas).
Apretás ▶ INICIAR cuando llegás. Se te pide permiso de ubicación (opcional).

## Método de trabajo (dron / manual)
En el paso de inicio marcás cómo trabajaste: 🚁 Dron y/o 💪 Manual (podés marcar los dos). Si es Manual,
elegís las herramientas (lanzas, manguera, hidrolavadora). Después seguís el checklist, sacás las fotos ANTES
y DESPUÉS, y al final tocás Finalizar servicio.

## Jornadas (trabajos de varios días)
Si un trabajo no se termina en un día, al cerrar elegís "sigo otro día" (te crea la jornada siguiente sola) o
"cerrar así". Cada jornada es un día del mismo trabajo grande.

## 💸 Gasto por foto
Botón 💸 arriba → foto del recibo. En Uruguay la IA lee el ticket y pre-llena monto, fecha y proveedor; vos
confirmás. Elegís la categoría y, si es de un servicio, lo vinculás. El gasto queda a tu nombre.

## 📦 Pedir insumo
Botón 📦 arriba → producto + prioridad (🔴 Urgente / 🟡 Normal / 🟢 Sugerente). El coordinador lo ve al
instante. Abajo ves tus últimos pedidos y su estado.

## 🔧 Mis equipos (si el coordinador te asignó un dron/camioneta)
Cada viernes te aparece un aviso para pasar los números. Abrís "Mis equipos" (o el aviso), ponés los km
(camioneta) o las horas (dron) — ves "antes: …" para no equivocarte — + una nota si hay algo, y Guardás.
Si el equipo tiene un problema (anda mal, necesita mantenimiento, hay que actualizarlo), tocás
"⚠️ Reportar un problema": le llega al coordinador y queda anotado hasta que lo resuelvan.

## 📋 Mi historial de trabajos
En el menú (⋯) ves todos los trabajos donde participaste (como encargado, piloto, manual o ayudante), con tus
tiempos. Es solo lectura.

## Menú de cuenta (⋯ arriba a la derecha)
Cambiar tu PIN, idioma, región, buscar actualización, 📖 Ayuda (los manuales), y Cerrar sesión (pide confirmar).`;

const COORDINADOR = `# Cómo usar la app — rol COORDINADOR (planificación y operación)

## Panel de coordinación
Al entrar caés en tu panel. Pestañas: 📋 Inicio/Servicios · Propuestas · Clientes · Prospección · Pedidos ·
🔧 Equipos. Arriba aparecen las alertas activas (propuestas para recontactar, equipos sin check, problemas de
dron reportados por pilotos, documentos por vencer).

## Servicios
Ves todos los servicios de tu país, con buscador, filtros (estado, operario, fechas) y orden. Podés crear un
"＋ Nuevo trabajo" suelto (sin propuesta) o desde una propuesta aceptada.

## Editar un servicio: quién va
En la ficha asignás las personas por FUNCIÓN: 🧑‍🔧 Encargado del servicio (hace el checklist y lo ve en su
app), 🚁 Piloto (vuela el dron), 💪 Operario manual, y 🤝 Ayudantes. Cada persona = un rol para no duplicar
jornales. También cargás fecha, hora, lugar (con link de mapa), notas y los sectores del edificio.

## Propuestas
Seguís el pipeline comercial (Nuevo lead → Contactado → Relevamiento → Enviada → Negociando → Aceptada…).
Podés generar el PDF de la propuesta y hacer una prueba/demo. "A contactar hoy" te marca a quién seguir.

## Clientes (360)
Cada cliente con su historia: servicios, pagos, pendiente. Podés navegar del servicio al cliente y ver/asignar
el intermediario que lo trajo.

## Pedidos de insumos
Lo que piden los operarios cae acá ordenado por urgencia. Marcás Pendiente → ✅ Comprado → 📦 Recibido.

## 🔧 Equipos (flota)
Toda la flota del país: drones, camionetas, hidrolavadoras, ósmosis, trailer. Cada equipo con estado,
matrícula, km/horas, su responsable y el semáforo del reporte semanal.
- Asignás un 👤 Responsable a cada equipo (✏️ editar): esa persona reporta km/horas cada semana desde su app.
- Vos hacés ✅ Check, 🔧 Service, ✏️ editar/dar de baja, 📜 historial.
- Cuando un piloto reporta un problema del dron, lo ves con ⚠️ en la card + un aviso arriba; cuando lo
  resolvés, tocás "✓ Resuelto".

## PDF de devolución
En un servicio completado podés generar el PDF de devolución para el cliente (con fotos antes/después).

## Menú de cuenta (⋯): PIN, idioma, región, 📖 Ayuda, cerrar sesión.`;

const CEO = `# Cómo usar la app — rol CEO / DIRECCIÓN (visión del negocio)

## Panel CEO
Ves el negocio completo: métricas, finanzas, por cobrar, equipo, documentos. (Dirección además tiene el panel
del coordinador completo y el Panel 🧹 Limpieza para depurar datos duplicados.)

## Métricas
Servicios activos, completados, clientes, y las cuentas del negocio. Los montos se muestran SEPARADOS en
pesos (UY$) y dólares (USD) — nunca mezclados.

## Finanzas
Resumen de gastos e ingresos con un toggle UY$/USD para el gráfico y los desgloses.

## Por cobrar
Lo pendiente de cobro por cliente. Podés reconciliar monedas y ver quién debe.

## Equipo + 🔑 Cuentas de acceso
En CEO → Equipo ves al equipo. En "🔑 Cuentas de acceso" seteás o reseteás los PINs de los usuarios (incluidos
los de cada país) sin tocar el servidor. Acá activás los accesos de los socios de otros países.

## Documentos & certificados
Avisos de vencimiento de DGI, BPS, seguros, permisos (aparecen como alerta cuando se acercan a su fecha).

## 🧹 Limpieza (solo Dirección)
Detecta clientes posiblemente duplicados (te dice por qué: comparten teléfono/email/nombre) y servicios a
revisar, para fusionar o depurar.

## Menú de cuenta (⋯): PIN, idioma, región, 📖 Ayuda, cerrar sesión.`;

const FINANZAS = `# Cómo usar la app — rol FINANZAS / ADMINISTRACIÓN

## Qué hacés
Cargás y ordenás la plata del país: gastos, ingresos y el seguimiento de lo por cobrar. Todo separado en
pesos (UY$) y dólares (USD), nunca mezclado.

## Gastos
Ves y cargás gastos. En Uruguay podés cargar por foto con IA (lee el recibo y pre-llena monto/fecha/proveedor;
vos confirmás). Podés atribuir un gasto a un servicio puntual y elegir la categoría.

## Ingresos / cobros
Cargás un ingreso o cobro manual y lo vinculás al cliente y al servicio. Esto alimenta el "Por cobrar".

## Por cobrar
Vista por cliente de lo pendiente. Podés reconciliar monedas de un toque, asignar precio a servicios en bloque,
y editar/archivar/eliminar cobros. Sos el operador completo de esta parte.

## Reportes
Podés generar el PDF del reporte financiero del período.

## Menú de cuenta (⋯): PIN, idioma, región, 📖 Ayuda, cerrar sesión.`;

const VENTAS = `# Cómo usar la app — rol VENTAS / PROSPECCIÓN (comercial)

## Qué ves
Tu foco es comercial: 🎯 Prospección, 💼 Propuestas (ver y seguir), 👥 Clientes y 🗺️ Mapa de prospección.
No ves finanzas ni costos.

## Prospección
Cargás prospectos (＋Prospecto) y los seguís por urgencia. Cuando un prospecto avanza, se convierte en cliente.

## Propuestas (seguimiento)
Ves las propuestas y su estado. "A contactar hoy" te marca a quién seguir. Tenés relojes de vida/seguimiento
para no dejar enfriar un trato.

## WhatsApp de un toque
El botón 💬 WhatsApp abre el chat con el contacto. Ojo: "📞 Contactado" se marca aparte, solo si realmente
hablaste (no se marca solo por abrir WhatsApp).

## 🗺️ Mapa
Mapa de objetivos de prospección; podés marcar los contactados (el tick es compartido con el equipo).

## Menú de cuenta (⋯): PIN, idioma, región, 📖 Ayuda, cerrar sesión.`;

// Mapa ROL (de users.js, con emoji) → texto. Se matchea por .includes() para tolerar variaciones del emoji.
const POR_CLAVE = [
  ['Operario', OPERARIO],
  ['Coordinador', COORDINADOR],
  ['CEO', CEO],
  ['Dirección', CEO],          // Dirección ve el panel CEO + coordinador; el bot le da la ayuda CEO/Dirección
  ['Administración', FINANZAS],
  ['Ventas', VENTAS],
];

// Devuelve { rolNombre, texto } para el rol dado, o null si no matchea ninguno (→ el endpoint responde 403).
export function ayudaParaRol(rol) {
  const r = String(rol || '');
  for (const [clave, texto] of POR_CLAVE) {
    if (r.includes(clave)) return { clave, texto };
  }
  return null;
}
