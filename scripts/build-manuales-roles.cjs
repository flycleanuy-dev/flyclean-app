#!/usr/bin/env node
/**
 * Generador de los 5 MANUALES POR ROL — v3, 2026-07-11 (pedido de Diego: "cada rol su manual, bien hecho").
 * Genera: Operario · Coordinador · CEO/Dirección · Finanzas · Ventas (PDF A4, capturas móviles 430x900).
 *
 * ARQUITECTURA (mejora sobre build-manual-ventas.cjs):
 *  - RED 100% INTERCEPTADA (context.route '**\/api\/**' + serviceWorkers:'block'): la app corre real desde
 *    https://flyclean.app pero TODAS las llamadas a /api/* devuelven DATOS DEMO desde este script.
 *    → No hacen falta PINs reales (verify-pin devuelve ok con token demo).
 *    → CERO datos reales de clientes en las capturas (manuales compartibles).
 *    → CERO riesgo de escritura: ni un byte llega a Notion/Supabase (todo interceptado).
 *  - Login v2 (nombre + PIN, sw v155+): el generador TIPEA el nombre y un PIN demo.
 *
 * USO:  cd ~/repos/flyclean-app && node scripts/build-manuales-roles.cjs [rol]
 *       (rol opcional: operario|coordinador|ceo|finanzas|ventas — sin arg genera los 5)
 */

const path = require('path');
const fs = require('fs');

const PLAYWRIGHT_PATH = path.join(
  process.env.HOME,
  '.claude/skills/playwright-skill/node_modules/playwright'
);
let chromium;
try {
  ({ chromium } = require(PLAYWRIGHT_PATH));
} catch (e) {
  console.error('✗ Playwright no disponible en', PLAYWRIGHT_PATH);
  process.exit(1);
}

const APP_URL = 'https://flyclean.app/';
const VIEWPORT = { width: 430, height: 900 };
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'docs', 'manuales'); // public/ → Vite lo copia a dist/ (URL /docs/manuales/... sin cambios)
const MANUAL_VERSION = 'v3';
const TODAY = new Date().toLocaleDateString('es-UY', { day: '2-digit', month: 'long', year: 'numeric' });

// ── Fechas dinámicas para que las capturas siempre muestren "hoy/mañana" ──────
const D = off => {
  const d = new Date(Date.now() + off * 86400000);
  return d.toISOString().slice(0, 10);
};
const HOY = D(0),
  MANANA = D(1),
  AYER = D(-1),
  SEM = D(6);

// ══════════════════════════════════════════════════════════════════════════════
// DATOS DEMO (shape Notion exacto). Nada de esto existe: nombres inventados.
// ══════════════════════════════════════════════════════════════════════════════
const txt = s => ({ rich_text: s ? [{ plain_text: s, text: { content: s } }] : [] });
const title = s => ({ title: [{ plain_text: s, text: { content: s } }] });
const sel = s => ({ select: s ? { name: s } : null });
const date = s => ({ date: s ? { start: s } : null });
const num = n => ({ number: n });
const rel = (...ids) => ({ relation: ids.map(id => ({ id })) });
const multi = (...names) => ({ multi_select: names.map(name => ({ name })) });

const SECTORES_JSON = JSON.stringify([
  { id: 's1', nombre: 'Fachada norte', estado: 'hecho' },
  { id: 's2', nombre: 'Fachada este', estado: 'en_curso' },
  { id: 's3', nombre: 'Vidrios lobby', estado: 'pendiente' },
]);

const SERVICIOS = [
  {
    object: 'page',
    id: 'svc-1',
    created_time: AYER + 'T10:00:00Z',
    properties: {
      'Nombre del servicio': title('Edificio Bahía Blanca — Fachada'),
      'Tipo de registro': sel('📋 Orden de trabajo'),
      Estado: sel('🔄 Asignado'),
      'Fecha programada': date(HOY),
      'Hora Inicio': { date: { start: HOY + 'T09:00:00' } },
      Lugar: txt('Rambla Williman 350, Punta del Este'),
      Mapa: { url: 'https://maps.google.com/?q=demo' },
      'Operario App': sel('Juan Pablo'),
      Piloto: sel('Juan Pablo'),
      'Operarios participantes': multi('Francisco Rocha'),
      'Tipo de servicio': multi('🏢 Fachada'),
      País: sel('🇺🇾 Uruguay'),
      Contacto: rel('cli-1'),
      'Notas pre-servicio': txt(
        'Coordinar con el portero (interno 102). Cortar el agua de la terraza antes de volar.'
      ),
      'Contacto en el lugar': txt('Portería — Rosana'),
      'Teléfono en el lugar': { phone_number: '099 123 456' },
      'Estado sectores': txt(SECTORES_JSON),
      'Método de trabajo': sel('🚁 Dron'),
      '% de avance': num(33),
    },
  },
  {
    object: 'page',
    id: 'svc-2',
    created_time: AYER + 'T10:00:00Z',
    properties: {
      'Nombre del servicio': title('Torre Mirador — Vidrios'),
      'Tipo de registro': sel('📋 Orden de trabajo'),
      Estado: sel('🟡 En curso'),
      'Fecha programada': date(HOY),
      Lugar: txt('Av. Roosevelt y Calle 30'),
      'Operario App': sel('Juan Pablo'),
      'Tipo de servicio': multi('🪟 Vidrios'),
      País: sel('🇺🇾 Uruguay'),
      Contacto: rel('cli-2'),
      'Hora Inicio Efectivo': { date: { start: HOY + 'T08:30:00' } },
      'Método de trabajo': sel('🚁 Dron'),
      '% de avance': num(60),
    },
  },
  {
    object: 'page',
    id: 'svc-3',
    created_time: AYER + 'T10:00:00Z',
    properties: {
      'Nombre del servicio': title('Hotel Brava — Paneles solares'),
      'Tipo de registro': sel('📅 Jornada'),
      'Jornada N°': num(2),
      Estado: sel('🔄 Asignado'),
      'Fecha programada': date(MANANA),
      'Operario App': sel('Juan Pablo'),
      'Tipo de servicio': multi('☀️ Paneles solares'),
      País: sel('🇺🇾 Uruguay'),
      Contacto: rel('cli-3'),
      'Método de trabajo': sel('💪 Manual'),
    },
  },
  {
    object: 'page',
    id: 'svc-4',
    created_time: AYER + 'T10:00:00Z',
    properties: {
      'Nombre del servicio': title('Punta Office — Fachada'),
      'Tipo de registro': sel('📋 Orden de trabajo'),
      Estado: sel('✅ Completado'),
      'Fecha programada': date(AYER),
      'Operario App': sel('Francisco Rocha'),
      'Tipo de servicio': multi('🏢 Fachada'),
      País: sel('🇺🇾 Uruguay'),
      Contacto: rel('cli-1'),
      Resultado: sel('✅ Exitoso'),
      '% de avance': num(100),
    },
  },
  // Juan Pablo participa como PILOTO (encargado: Francisco) → activa el bloque "🚁 Próximos donde participás"
  {
    object: 'page',
    id: 'svc-piloto',
    created_time: AYER + 'T10:00:00Z',
    properties: {
      'Nombre del servicio': title('Residencia Lomas — Fachada'),
      'Tipo de registro': sel('📋 Orden de trabajo'),
      Estado: sel('🔄 Asignado'),
      'Fecha programada': date(MANANA),
      'Hora Inicio': { date: { start: MANANA + 'T10:00:00' } },
      Lugar: txt('Lomas de La Barra, lote 12'),
      Mapa: { url: 'https://maps.google.com/?q=demo2' },
      'Operario App': sel('Francisco Rocha'),
      Piloto: sel('Juan Pablo'),
      'Tipo de servicio': multi('🏢 Fachada'),
      País: sel('🇺🇾 Uruguay'),
      Contacto: rel('cli-2'),
    },
  },
];

const CLIENTES = [
  {
    object: 'page',
    id: 'cli-1',
    created_time: '2026-05-01T10:00:00Z',
    properties: {
      'Nombre / Empresa': title('Edificio Bahía Blanca'),
      Estado: sel('✅ Cliente activo'),
      'Tipo de cliente': sel('🏢 Administración'),
      País: sel('🇺🇾 Uruguay'),
      'Teléfono / WhatsApp': { phone_number: '+598 99 111 222' },
      Email: { email: 'admin@bahiablanca.uy' },
      'Servicio de interés': multi('🏢 Fachada'),
      Servicios: rel('svc-1', 'svc-4'),
      'Ciudad / Zona': txt('Punta del Este'),
    },
  },
  {
    object: 'page',
    id: 'cli-2',
    created_time: '2026-04-11T10:00:00Z',
    properties: {
      'Nombre / Empresa': title('Torre Mirador'),
      Estado: sel('✅ Cliente activo'),
      'Tipo de cliente': sel('🏢 Administración'),
      País: sel('🇺🇾 Uruguay'),
      'Teléfono / WhatsApp': { phone_number: '+598 98 333 444' },
      Email: { email: '' },
      'Servicio de interés': multi('🪟 Vidrios'),
      Servicios: rel('svc-2'),
    },
  },
  {
    object: 'page',
    id: 'cli-3',
    created_time: '2025-09-15T10:00:00Z',
    properties: {
      'Nombre / Empresa': title('Hotel Brava'),
      Estado: sel('✅ Cliente activo'),
      'Tipo de cliente': sel('🏠 Particular'),
      País: sel('🇺🇾 Uruguay'),
      'Teléfono / WhatsApp': { phone_number: '+598 42 555 000' },
      Email: { email: 'gerencia@hotelbrava.uy' },
      'Servicio de interés': multi('☀️ Paneles solares'),
      Servicios: rel('svc-3'),
    },
  },
  // Prospectos (viven en la misma base Clientes)
  {
    object: 'page',
    id: 'pro-1',
    created_time: HOY + 'T10:00:00Z',
    properties: {
      'Nombre / Empresa': title('Edificio Costa Azul'),
      Estado: sel('🤝 Interesado'),
      País: sel('🇺🇾 Uruguay'),
      'Contacto (persona)': txt('Rosana (administración)'),
      'Origen del lead': sel('🧲 Vendedor'),
      Interés: multi('🏢 Fachada'),
      'Teléfono / WhatsApp': { phone_number: '+598 99 111 222' },
      'Próximo contacto': date(AYER),
      'Notas prospección': txt('Pidió cotización para 12 pisos.'),
    },
  },
  {
    object: 'page',
    id: 'pro-2',
    created_time: HOY + 'T10:00:00Z',
    properties: {
      'Nombre / Empresa': title('Torre Nex'),
      Estado: sel('📵 Prospecto contactado'),
      País: sel('🇺🇾 Uruguay'),
      'Contacto (persona)': txt('Martín, encargado'),
      'Origen del lead': sel('🤝 Referido'),
      Interés: multi('🪟 Vidrios'),
      'Teléfono / WhatsApp': { phone_number: '+598 98 333 444' },
      'Próximo contacto': date(SEM),
    },
  },
];

const PROPUESTAS = [
  {
    object: 'page',
    id: 'prop-1',
    created_time: '2026-06-14T10:00:00Z',
    properties: {
      'Nombre de propuesta': title('Torre Náutica — Limpieza de fachada'),
      'Estado pipeline': sel('📤 Enviada al cliente'),
      País: sel('🇺🇾 Uruguay'),
      'Importe estimado': num(45000),
      Moneda: sel('🇺🇸 USD'),
      Tipo: sel('📌 Puntual'),
      'Días sin respuesta': { formula: { number: 18 } },
      'Última interacción': date(D(-18)),
      'Fecha de envío': date(D(-25)),
      Contacto: rel('cli-1'),
      Observaciones: txt('Incluye fachada norte y este. Acceso por azotea.'),
      'Notas internas': txt('El admin pide factura. Coordinar acceso directo con él, no con portería.'),
    },
  },
  {
    object: 'page',
    id: 'prop-2',
    created_time: '2026-06-20T10:00:00Z',
    properties: {
      'Nombre de propuesta': title('Solanas — Vidrios (recurrente)'),
      'Estado pipeline': sel('🤝 Negociando'),
      País: sel('🇺🇾 Uruguay'),
      'Importe estimado': num(28000),
      Moneda: sel('🇺🇾 UY$'),
      Tipo: sel('🔄 Recurrente'),
      'Servicios por año': num(6),
      'Días sin respuesta': { formula: { number: 9 } },
      'Última interacción': date(D(-9)),
      'Fecha de envío': date(D(-15)),
      Contacto: rel('cli-2'),
    },
  },
];

const GASTOS = [
  {
    object: 'page',
    id: 'gas-1',
    created_time: HOY + 'T10:00:00Z',
    properties: {
      Servicio: title('Nafta camioneta'),
      Categoría: sel('⛽ Combustible'),
      Clase: sel('📌 Directo'),
      'Monto UY$': num(2400),
      Fecha: date(HOY),
      'Cargado por': sel('Juan Pablo'),
      'Tienda / Proveedor': txt('ANCAP PDE'),
      País: sel('🇺🇾 Uruguay'),
      'Forma de pago': sel('💳 Tarjeta'),
    },
  },
  {
    object: 'page',
    id: 'gas-2',
    created_time: AYER + 'T10:00:00Z',
    properties: {
      Servicio: title('Detergente concentrado x20L'),
      Categoría: sel('🧴 Insumos'),
      Clase: sel('📌 Directo'),
      'Monto UY$': num(5900),
      Fecha: date(AYER),
      'Cargado por': sel('Finanzas'),
      'Tienda / Proveedor': txt('Química Sur'),
      País: sel('🇺🇾 Uruguay'),
      'Forma de pago': sel('💵 Efectivo'),
    },
  },
];

const INGRESOS = [
  {
    object: 'page',
    id: 'ing-1',
    created_time: HOY + 'T10:00:00Z',
    properties: {
      Servicio: title('Cobro Edificio Bahía Blanca'),
      Tipo: sel('💵 Cobro de servicio'),
      'Monto USD': num(1500),
      Fecha: date(HOY),
      Cliente: txt('Edificio Bahía Blanca'),
      País: sel('🇺🇾 Uruguay'),
      Contacto: rel('cli-1'),
      Servicios: rel('svc-4'),
    },
  },
];

const SOLICITUDES = [
  {
    object: 'page',
    id: 'ped-1',
    created_time: HOY + 'T10:00:00Z',
    properties: {
      Producto: title('Guantes de nitrilo talle L'),
      Prioridad: sel('🔴 Urgente'),
      Estado: sel('🆕 Pendiente'),
      'Solicitado por': txt('Juan Pablo'),
      'Fecha del pedido': date(HOY),
      País: sel('🇺🇾 UY'),
      Cantidad: num(2),
      'Tienda / Proveedor': txt('Ferretería Central'),
      'Costo estimado': num(800),
    },
  },
  {
    object: 'page',
    id: 'ped-2',
    created_time: AYER + 'T10:00:00Z',
    properties: {
      Producto: title('Manguera 30m alta presión'),
      Prioridad: sel('🟡 Normal'),
      Estado: sel('🛒 Comprado'),
      'Solicitado por': txt('Francisco Rocha'),
      'Fecha del pedido': date(AYER),
      'Fecha de compra': date(HOY),
      País: sel('🇺🇾 UY'),
      'Costo estimado': num(3200),
    },
  },
];

const DOCUMENTOS = [
  {
    object: 'page',
    id: 'doc-1',
    created_time: '2026-06-22T10:00:00Z',
    properties: {
      Documento: title('Certificado DGI'),
      Tipo: sel('Certificado fiscal'),
      'Entidad emisora': sel('DGI'),
      Estado: sel('🟢 Vigente'),
      País: sel('🇺🇾 UY'),
      Vence: date(D(20)),
      'Días de aviso': num(30),
    },
  },
  {
    object: 'page',
    id: 'doc-2',
    created_time: '2026-06-22T10:00:00Z',
    properties: {
      Documento: title('Seguro de responsabilidad civil'),
      Tipo: sel('Seguro'),
      'Entidad emisora': sel('Aseguradora'),
      Estado: sel('🟢 Vigente'),
      País: sel('🇺🇾 UY'),
      Vence: date(D(200)),
      'Días de aviso': num(30),
    },
  },
];

const EQUIPO = [
  {
    object: 'page',
    id: 'eq-1',
    created_time: '2026-01-01T10:00:00Z',
    properties: {
      Nombre: title('Juan Pablo'),
      Rol: sel('✈️ Operario'),
      País: sel('🇺🇾 UY'),
      Estado: sel('✅ Activo'),
    },
  },
  {
    object: 'page',
    id: 'eq-2',
    created_time: '2026-01-01T10:00:00Z',
    properties: {
      Nombre: title('Federico Maciel'),
      Rol: sel('🔧 Técnico'),
      País: sel('🇺🇾 UY'),
      Estado: sel('✅ Activo'),
    },
  },
];

// Flota (módulo 🔧 Equipos del coordinador). Datos demo: uno sin "Último check" reciente = alerta de check.
const ACTIVOS = [
  {
    object: 'page',
    id: 'act-1',
    created_time: '2026-01-01T10:00:00Z',
    properties: {
      Activo: title('Drone DJI M400'),
      Tipo: sel('🚁 Drone'),
      Estado: sel('✅ Operativo'),
      'Marca / Modelo': txt('DJI Matrice 400'),
      'Nro. Serie / Matrícula': txt('SN-M400-01'),
      'Horas de vuelo': num(48),
      'Último check': date('2026-07-04'),
      País: sel('🇺🇾 UY'),
      'Responsable App': sel('Juan Pablo'),
      // Problema abierto reportado por el piloto (para mostrar el flujo en el manual)
      'Historial equipo': txt(
        JSON.stringify([
          {
            f: '2026-07-13',
            t: 'problema',
            por: 'Juan Pablo',
            n: '🔧 Necesita mantenimiento: la hélice 2 vibra un poco',
          },
        ])
      ),
    },
  },
  {
    object: 'page',
    id: 'act-2',
    created_time: '2026-01-01T10:00:00Z',
    properties: {
      Activo: title('Drone DJI M350 #1'),
      Tipo: sel('🚁 Drone'),
      Estado: sel('✅ Operativo'),
      'Marca / Modelo': txt('DJI Matrice 350 RTK'),
      'Nro. Serie / Matrícula': txt('SN-M350-01'),
      'Horas de vuelo': num(31),
      'Último check': date('2026-07-04'),
      País: sel('🇺🇾 UY'),
    },
  },
  {
    object: 'page',
    id: 'act-3',
    created_time: '2026-01-01T10:00:00Z',
    properties: {
      Activo: title('Camioneta Changan Hunter'),
      Tipo: sel('🚗 Vehículo'),
      Estado: sel('✅ Operativo'),
      'Marca / Modelo': txt('Changan Hunter'),
      'Nro. Serie / Matrícula': txt('SBA 1234'),
      'Km actuales': num(12450),
      'Último check': date('2026-07-04'),
      País: sel('🇺🇾 UY'),
      'Responsable App': sel('Juan Pablo'),
    },
  },
  {
    object: 'page',
    id: 'act-4',
    created_time: '2026-01-01T10:00:00Z',
    properties: {
      Activo: title('Camioneta Hyundai H1'),
      Tipo: sel('🚗 Vehículo'),
      Estado: sel('✅ Operativo'),
      'Marca / Modelo': txt('Hyundai H1'),
      'Nro. Serie / Matrícula': txt('SBB 5678'),
      'Km actuales': num(86300),
      País: sel('🇺🇾 UY'),
    },
  },
  {
    object: 'page',
    id: 'act-5',
    created_time: '2026-01-01T10:00:00Z',
    properties: {
      Activo: title('Trailer c/Ósmosis'),
      Tipo: sel('🚛 Trailer'),
      Estado: sel('✅ Operativo'),
      'Marca / Modelo': txt('Trailer + planta de ósmosis'),
      'Último check': date('2026-07-04'),
      País: sel('🇺🇾 UY'),
    },
  },
  {
    object: 'page',
    id: 'act-6',
    created_time: '2026-01-01T10:00:00Z',
    properties: {
      Activo: title('Hidrolavadora Honda'),
      Tipo: sel('💧 Hidrolavadora'),
      Estado: sel('🔧 En mantenimiento'),
      'Marca / Modelo': txt('Honda GX390'),
      País: sel('🇺🇾 UY'),
    },
  },
];

const DEMO_CONFIG = {
  reglas: {
    pipelineAviso: 15,
    pipelineSinRespuesta: 45,
    mantenimientoDias: 270,
    ventasSnoozeDias: 60,
    prospectoDias: 7,
  },
  tarifas: { 'juan-pablo': { dron: 2500, manual: 2000 }, 'francisco-rocha': { dron: 2500, manual: 2000 } },
  costos: { m2Dron: 12, m2Manual: 8, margen: 35, minimo: 5000 },
};

const MOCK_BY_DB = {
  ccaf276c7f6a460caeb3d2800deab2e5: SERVICIOS,
  '250115612de74e0582366549bbe5e389': CLIENTES,
  '2c0a4257f4294941b994dfebc1098633': PROPUESTAS,
  '1e20cdabad5d41528d070ed2f6e9dad3': GASTOS,
  d1e15376e83a408a8a52f47da33c249a: INGRESOS,
  '0f5cd38362ab430293a5dec7140ac18f': SOLICITUDES,
  f888bd9c89e0497a9d2c57594aacd663: DOCUMENTOS,
  cfff6e26dbc84eedb7eabcb6c51db1eb: EQUIPO,
  e75449eeb78143f1b74006a4796c1f95: ACTIVOS,
  '57bc613af5d04908a9f2342cf6a1a5a7': [],
};
const DB_BY_RESOURCE = {
  servicios: SERVICIOS,
  clientes: CLIENTES,
  propuestas: PROPUESTAS,
  gastos: GASTOS,
  ingresos: INGRESOS,
};
const ALL_PAGES = [
  ...SERVICIOS,
  ...CLIENTES,
  ...PROPUESTAS,
  ...GASTOS,
  ...INGRESOS,
  ...SOLICITUDES,
  ...DOCUMENTOS,
  ...EQUIPO,
  ...ACTIVOS,
];

// ══════════════════════════════════════════════════════════════════════════════
// Red interceptada
// ══════════════════════════════════════════════════════════════════════════════
async function mockApi(route) {
  const req = route.request();
  const url = new URL(req.url());
  const p = url.pathname;
  const json = (obj, status = 200) =>
    route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(obj) });
  try {
    if (p === '/api/verify-pin') return json({ ok: true, token: 'demo-token' });
    if (
      p === '/api/set-pin' ||
      p === '/api/admin-set-pin' ||
      p === '/api/admin-set-user' ||
      p === '/api/admin-user-status'
    )
      return json({ ok: true });
    if (p === '/api/users-roster') return json({ ok: true, source: 'env', users: [] });
    if (p === '/api/app-config') return json({ ok: true, config: DEMO_CONFIG });
    if (p === '/api/email-recipients')
      return json({
        ok: true,
        recipients: {
          semanal: ['diego@flyclean.app'],
          lunes: ['diego@flyclean.app'],
          pipeline: ['federico@flyclean.app', 'diego@flyclean.app'],
        },
        types: ['semanal', 'lunes', 'pipeline'],
        max: 10,
      });
    if (p === '/api/admin-list-users') return json({ ok: true, users: [] });
    if (p === '/api/version')
      return json({ web: '1.2.9', minApkRequired: '1.0.0', timestamp: new Date().toISOString() });
    if (p === '/api/db') {
      const r = url.searchParams.get('resource') || '';
      return json({
        object: 'list',
        results: DB_BY_RESOURCE[r] || [{ object: 'page', id: 'x', properties: {} }],
      });
    }
    if (p === '/api/db-sync') return json({ ok: true });
    if (p === '/api/notion') {
      let body = {};
      try {
        body = req.postDataJSON() || {};
      } catch (_) {}
      const ep = String(body.endpoint || '');
      const method = String(body.method || 'GET').toUpperCase();
      if (ep.startsWith('databases/')) {
        const dbid = ep.split('/')[1].replace(/-/g, '');
        return json({ object: 'list', results: MOCK_BY_DB[dbid] || [], has_more: false });
      }
      if (ep.startsWith('pages/') && method === 'GET') {
        const id = ep.split('/')[1];
        return json(ALL_PAGES.find(x => x.id === id) || { object: 'page', id, properties: {} });
      }
      if (ep === 'pages' && method === 'POST')
        return json({
          object: 'page',
          id: 'demo-new',
          properties: (body.body && body.body.properties) || {},
        });
      if (method === 'PATCH') {
        const id = ep.split('/')[1];
        return json(ALL_PAGES.find(x => x.id === id) || { object: 'page', id, properties: {} });
      }
      if (ep === 'search') return json({ object: 'list', results: [], has_more: false });
      return json({ object: 'list', results: [], has_more: false });
    }
    return json({ ok: true, results: [] });
  } catch (e) {
    return json({ ok: false }, 500);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// Helpers
// ══════════════════════════════════════════════════════════════════════════════
async function snap(page, opts = {}) {
  await page.waitForTimeout(opts.wait || 400);
  const buf = await page.screenshot({ type: 'png', fullPage: opts.fullPage || false });
  return buf.toString('base64');
}
function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function newRolePage(browser) {
  const ctx = await browser.newContext({
    viewport: VIEWPORT,
    serviceWorkers: 'block',
    acceptDownloads: false,
  });
  await ctx.route('**/api/**', mockApi);
  const page = await ctx.newPage();
  page.on('pageerror', e => console.warn('  ⚠ page error:', String(e.message || e).slice(0, 140)));
  return { ctx, page };
}

// Login v2: país → nombre + PIN demo → Entrar. Devuelve la captura del login LLENO (para la sección 1).
async function loginV2(page, userName, screenSel) {
  await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);
  const consent = page.locator('#consent-overlay button').first();
  if (await consent.isVisible().catch(() => false)) {
    await consent.click();
    await page.waitForTimeout(300);
  }
  await page.waitForSelector('#screen-country.active', { timeout: 25000 });
  await page.locator('.country-card', { hasText: 'Uruguay' }).first().click();
  await page.waitForSelector('#screen-login.active', { timeout: 15000 });
  await page.fill('#login-user', userName);
  await page.fill('#login-pin', '1234');
  const imgLogin = await snap(page, { wait: 300 });
  await page.click('#login-btn');
  await page.waitForSelector(screenSel + '.active', { timeout: 25000 });
  await page.waitForTimeout(2200);
  return imgLogin;
}

async function snapAccountMenu(page) {
  await page.evaluate(() => {
    try {
      openAccountMenu();
    } catch (_) {}
  });
  const img = await snap(page, { wait: 500 });
  await page.evaluate(() => {
    try {
      closeAccountMenu();
    } catch (_) {}
  });
  await page.waitForTimeout(250);
  return img;
}

function seccionLogin(imgLogin, rolTxt) {
  return {
    title: 'Entrar a la app',
    intro:
      'Entrá a flyclean.app, elegí el país y escribí TU NOMBRE (como te llaman en el equipo, sin importar mayúsculas o tildes) + tu PIN. Ya no hay lista de usuarios: cada uno escribe el suyo.',
    steps: [
      {
        title: 'Tu nombre + tu PIN → Entrar',
        description:
          'Podés escribir solo tu primer nombre (ej. "federico") o el nombre completo. Si te equivocás, el mensaje es el mismo siempre: revisá el nombre completo y el PIN. ' +
          rolTxt,
        image: imgLogin,
        wide: true,
      },
    ],
  };
}
function seccionMenu(imgMenu, extraTxt) {
  return {
    title: 'Tu menú de cuenta (⋯)',
    intro:
      'Tocá tu nombre arriba a la derecha: ahí vive todo lo tuyo — cambiar tu PIN, idioma, región, buscar actualización, 📖 Ayuda y 🚪 Cerrar sesión (siempre te pide confirmar).',
    steps: [
      {
        title: '🔑 PIN · 🌐 Idioma · 📖 Ayuda · 🚪 Salir',
        description:
          'Cerrar sesión ahora pregunta antes (se acabó salir sin querer). En 📖 Ayuda está este manual. ' +
          (extraTxt || ''),
        image: imgMenu,
        wide: true,
      },
    ],
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// MANUAL: OPERARIO
// ══════════════════════════════════════════════════════════════════════════════
async function buildOperario(browser) {
  const { ctx, page } = await newRolePage(browser);
  const sections = [];
  console.log('  [Operario] login...');
  const imgLogin = await loginV2(page, 'Juan Pablo', '#screen-services');
  sections.push(seccionLogin(imgLogin, 'Caés directo en MIS SERVICIOS.'));

  console.log('  [Operario] mis servicios...');
  const imgLista = await snap(page, { wait: 1600 }); // espera extra: el bloque 🚁 agenda carga async
  sections.push({
    title: 'Mis servicios — tu día de trabajo',
    intro:
      'Ves SOLO los trabajos asignados a vos, agrupados por día (Hoy arriba). Las 4 pestañas separan por tipo: 📋 Órdenes · 📅 Jornadas · 🧪 Pruebas · 🔍 Relevamientos.',
    steps: [
      {
        title: 'Tocá una card para abrir el servicio',
        description:
          'Cada card muestra el estado (🔄 Asignado / 🟡 En curso), la hora programada 🕐 y el lugar 📍. Las jornadas son días de un trabajo grande que sigue.',
        image: imgLista,
        wide: true,
      },
      {
        title: '🚁 Próximos trabajos donde participás',
        description:
          'Si te toca ir a un trabajo como PILOTO, operario manual o ayudante (pero el encargado es otro), lo ves en el bloque azul de arriba: cuándo, dónde (con 🗺️ mapa) y quién es el encargado. Es solo para que sepas tu agenda — el checklist lo hace el encargado.',
      },
    ],
  });

  console.log('  [Operario] ficha del servicio...');
  let imgFicha = null,
    imgChecklist = null,
    imgMetodo = null;
  try {
    await page.evaluate(() => {
      const el = document.querySelector(
        '#services-list .service-card, #services-list [onclick*="openService"]'
      );
      if (el) el.click();
    });
    await page.waitForSelector('#screen-detail.active', { timeout: 12000 });
    imgFicha = await snap(page, { wait: 1200, fullPage: false });
    // Paso MÉTODO DE TRABAJO (inicio efectivo): mostramos que se pueden marcar Dron Y Manual a la vez +
    // varias herramientas (feature 2026-07-12). Navegamos con manualPreviewStep (helper de operario.js
    // expuesto a window para el generador: setea serviceState y re-renderiza el paso por id, respetando el
    // STEPS activo). No seteamos horaInicio para no mostrar el banner de "cancelar inicio" — queremos los toggles.
    await page.evaluate(() => {
      try {
        if (typeof manualPreviewStep === 'function') {
          manualPreviewStep('inicio_efectivo', {
            metodoTrabajo: ['🚁 Dron', '💪 Manual'],
            herramientaManual: ['Lanzas', 'Manguera'],
          });
        }
      } catch (e) {
        console.warn('step metodo', e);
      }
    });
    // Scroll hasta los botones de método (Dron/Manual + herramientas) — es lo que queremos mostrar, no el clima.
    await page.evaluate(() => {
      const el = document.querySelector('.metodo-group');
      if (el) el.scrollIntoView({ block: 'center' });
    });
    imgMetodo = await snap(page, { wait: 700 });
    // Paso checklist pre-vuelo.
    await page.evaluate(() => {
      try {
        if (typeof manualPreviewStep === 'function') manualPreviewStep('checklist_pre');
      } catch (e) {
        console.warn('step nav', e);
      }
    });
    imgChecklist = await snap(page, { wait: 700 });
    await page.evaluate(() => {
      try {
        goBack();
      } catch (_) {
        showScreen('services');
      }
    });
    await page.waitForTimeout(400);
  } catch (e) {
    console.warn('  ⚠ ficha servicio:', e.message.slice(0, 100));
  }
  sections.push({
    title: 'La ficha del servicio — todo antes de empezar',
    intro:
      'Al abrir un servicio ves la información que te dejó el coordinador: fecha, hora, lugar (con 🗺️ mapa), el cliente, sus notas y —si el coordinador lo cargó— el 📞 contacto de quién te da acceso. Desde acá tocás ▶ INICIAR cuando llegás.',
    steps: [
      {
        title: 'Leé las notas del coordinador ANTES de iniciar',
        description:
          'Si el trabajo tiene sectores (ej. Fachada norte / este / vidrios lobby) los ves acá con su estado. Al iniciar, la app te puede pedir tu ubicación (es solo el punto de inicio del trabajo).',
        image: imgFicha,
        wide: true,
      },
      {
        title: '📞 Contacto en el lugar — a quién llamar para que te abran',
        description:
          'Si el coordinador lo cargó, ves el nombre de quién te da acceso al edificio + botones "📞 Llamar" y "💬 WhatsApp" de un toque. No hace falta buscar el teléfono en ningún lado.',
        image: imgFicha,
        wide: true,
      },
    ],
  });
  sections.push({
    title: '🛠️ Método de trabajo — dron, manual o los dos',
    intro:
      'Al registrar el inicio elegís CÓMO se hace el trabajo. Podés marcar 🚁 Dron y 💪 Manual a la vez (ej. dron para lo alto y lanzas/manguera para lo bajo) y varias herramientas juntas. También marcás la condición del clima.',
    steps: [
      {
        title: 'Marcá uno o ambos + las herramientas que uses',
        description:
          'Es obligatorio elegir al menos un método para registrar el inicio efectivo. Si marcás Manual, elegí con qué herramienta(s): Lanzas, Manguera, Hidrolavadora u Otro. Esto alimenta tus horas de dron vs. manual en tu historial.',
        image: imgMetodo,
        wide: true,
      },
    ],
  });
  sections.push({
    title: 'Checklist pre-vuelo — seguridad primero',
    intro:
      'Después de iniciar, marcá el checklist ANTES de volar: permiso, meteo, KP, drone, baterías, hélices, zona libre. Si te falta algo, la app te avisa pero no te bloquea (vos decidís en el campo).',
    steps: [
      {
        title: 'Tildá cada ítem a medida que verificás',
        description:
          'El checklist se guarda solo (aunque te quedes sin señal). Al terminar el trabajo hay otro checklist post-servicio: agua cortada, equipo guardado, fotos tomadas, cliente avisado.',
        image: imgChecklist,
        wide: true,
        note: 'Todo lo que marcás/subís se guarda AUTOMÁTICO. Sin señal, la app encola y sube cuando vuelve la conexión — no pierdas tiempo reintentando.',
      },
    ],
  });
  sections.push({
    title: 'Fotos, sectores y finalizar',
    intro:
      'Sacá fotos ANTES de empezar y DESPUÉS de terminar (mínimo 2 y 2). Si el trabajo tiene sectores, la app te guía sector por sector y calcula el % de avance sola.',
    steps: [
      {
        title: '📸 Antes / Después por sector',
        description:
          'Las fotos se suben solas al servidor y quedan en el reporte que recibe el cliente. Elegí bien el encuadre: es la evidencia del trabajo.',
      },
      {
        title: '✅ Finalizar servicio (o "Sigo otro día")',
        description:
          'Al finalizar elegís el resultado (Exitoso / Con incidencia / Fallido). Si el trabajo quedó incompleto: "🔄 Sigo otro día" crea sola la jornada siguiente con tu cuadrilla; "✅ Cerrar así" lo termina como está.',
      },
    ],
  });

  console.log('  [Operario] gasto + pedido...');
  let imgGasto = null,
    imgPedido = null;
  try {
    await page.evaluate(() => {
      try {
        openGastos();
      } catch (_) {}
    });
    await page.waitForTimeout(700);
    await page.evaluate(() => {
      try {
        if (typeof openNuevoGastoSheet === 'function') openNuevoGastoSheet();
      } catch (_) {}
    });
    imgGasto = await snap(page, { wait: 800, fullPage: false });
    await page.evaluate(() => {
      document
        .querySelectorAll('.edit-overlay.open, .pin-change-overlay.open, [id$="-overlay"].open')
        .forEach(o => o.classList.remove('open'));
      try {
        showScreen('services');
      } catch (_) {}
    });
    await page.waitForTimeout(400);
  } catch (e) {
    console.warn('  ⚠ gasto:', e.message.slice(0, 100));
  }
  try {
    await page.evaluate(() => {
      try {
        openNuevoPedidoSheet();
      } catch (_) {}
    });
    imgPedido = await snap(page, { wait: 800, fullPage: false });
    await page.evaluate(() => {
      document.getElementById('pedido-overlay')?.classList.remove('open');
    });
    await page.waitForTimeout(300);
  } catch (e) {
    console.warn('  ⚠ pedido:', e.message.slice(0, 100));
  }
  sections.push({
    title: '💸 Gasto por foto — en 30 segundos',
    intro:
      'Compraste nafta o insumos: botón 💸 arriba → sacale foto al recibo. En Uruguay la IA lee el ticket y te pre-llena monto, fecha y proveedor — vos solo confirmás.',
    steps: [
      {
        title: 'Foto del recibo → confirmar → listo',
        description:
          'Elegí la categoría (⛽ Combustible / 🧴 Insumos / …) y si es de un servicio puntual, vinculalo. El gasto queda a tu nombre.',
        image: imgGasto,
        wide: true,
      },
    ],
  });
  sections.push({
    title: '📦 Pedir insumos — que nunca falte nada',
    intro:
      'Te queda poco detergente o se rompió algo: botón 📦 arriba → pedilo. El coordinador lo ve al instante con tu prioridad.',
    steps: [
      {
        title: 'Producto + prioridad (+ proveedor y costo si los sabés)',
        description:
          '🔴 Urgente = frena el trabajo · 🟡 Normal · 🟢 Sugerente. Abajo ves tus últimos pedidos y en qué estado están (Pendiente → Comprado → Recibido).',
        image: imgPedido,
        wide: true,
      },
    ],
  });

  console.log('  [Operario] mis equipos...');
  await page.evaluate(() => {
    try {
      openMisEquipos();
    } catch (_) {}
  });
  await page.waitForTimeout(1400);
  const imgMisEq = await snap(page, { wait: 300 });
  sections.push({
    title: '🔧 Reporte semanal de tus equipos',
    intro:
      'Si el coordinador te asignó un equipo (un dron, una camioneta), cada viernes te aparece un aviso para pasar los números. Son 30 segundos.',
    steps: [
      {
        title: 'El total de hoy + una nota si hay algo',
        description:
          'Ponés los km que marca la camioneta o las horas del dron (ves “antes: …” para no equivocarte) y, si hay algo para avisar (un ruido, un service, un golpe), lo escribís en la nota. Guardás y listo — queda registrado a tu nombre. También lo tenés siempre en el menú (⋯ → Mis equipos).',
        image: imgMisEq,
        wide: true,
      },
      {
        title: '⚠️ Reportar un problema del dron',
        description:
          'Si el equipo anda mal, necesita mantenimiento o hay que actualizarlo, tocá “⚠️ Reportar un problema”, elegí qué le pasa y describilo. Le llega al coordinador al instante y queda anotado hasta que lo resuelvan — así nadie vuela un dron con un problema sin avisar.',
      },
    ],
  });
  await page.evaluate(() => {
    try {
      closeMisEquipos();
    } catch (_) {}
  });
  await page.waitForTimeout(300);

  console.log('  [Operario] menú...');
  const imgMenu = await snapAccountMenu(page);
  sections.push(seccionMenu(imgMenu));
  await ctx.close();
  return {
    title: 'Manual del Operario',
    subtitle: 'Tu día de trabajo en la app, paso a paso',
    file: 'Manual_Operario_v3.pdf',
    sections,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// MANUAL: COORDINADOR
// ══════════════════════════════════════════════════════════════════════════════
async function buildCoordinador(browser) {
  const { ctx, page } = await newRolePage(browser);
  const sections = [];
  console.log('  [Coord] login...');
  const imgLogin = await loginV2(page, 'Federico Maciel', '#screen-coordinator');
  sections.push(seccionLogin(imgLogin, 'Caés en tu panel de coordinación.'));

  const tab = async (name, wait = 1500) => {
    await page.evaluate(n => {
      try {
        setCoordTab(n);
      } catch (_) {}
    }, name);
    await page.waitForTimeout(wait);
  };

  console.log('  [Coord] servicios...');
  await tab('servicios');
  const imgServicios = await snap(page, { wait: 800 });
  sections.push({
    title: '📋 Servicios — tu tablero de operación',
    intro:
      'Todos los trabajos del país, agrupados por día. Buscador + filtros (estado, operario, fechas) + ‹ mes ›. Los "En curso" aparecen SIEMPRE arriba aunque sean de otro mes.',
    steps: [
      {
        title: 'Tocá una card para editarla',
        description:
          'Cada card: estado, piloto y ayudantes, hora, lugar y foto. Desde la card de un COMPLETADO generás el 📄 reporte de devolución para el cliente.',
        image: imgServicios,
        wide: true,
      },
    ],
  });

  console.log('  [Coord] nuevo trabajo + editar...');
  let imgNuevo = null,
    imgEditar = null;
  try {
    await page.evaluate(() => {
      try {
        openNewServiceSheet();
      } catch (_) {}
    });
    imgNuevo = await snap(page, { wait: 900, fullPage: false });
    await page.evaluate(() => {
      document.getElementById('new-service-overlay')?.classList.remove('open');
    });
    await page.waitForTimeout(300);
  } catch (e) {
    console.warn('  ⚠ nuevo:', e.message.slice(0, 100));
  }
  try {
    await page.evaluate(() => {
      try {
        openEditSheet('svc-1');
      } catch (_) {}
    });
    imgEditar = await snap(page, { wait: 1200, fullPage: false });
    await page.evaluate(() => {
      try {
        closeEditSheet();
      } catch (_) {
        document.getElementById('edit-overlay')?.classList.remove('open');
      }
    });
    await page.waitForTimeout(300);
  } catch (e) {
    console.warn('  ⚠ editar:', e.message.slice(0, 100));
  }
  sections.push({
    title: '＋ Nuevo trabajo y ✏️ editar servicio',
    intro:
      'Creás un trabajo desde cero (con o sin propuesta) y editás todo: cliente, PILOTO + ayudantes, fecha/hora, lugar + mapa, tipo de servicio, sectores y notas para el operario.',
    steps: [
      {
        title: '＋ Nuevo trabajo',
        description: 'Nombre + cliente + fecha alcanzan para arrancar. El resto lo completás después.',
        image: imgNuevo,
      },
      {
        title: '✏️ Editar: roles, sectores y notas',
        description:
          'PILOTO (dron) u Operario manual + AYUDANTES: cada persona asignada suma 1 jornal ese día. Los sectores le ordenan el trabajo al operario y calculan el % de avance.',
        image: imgEditar,
      },
      {
        title: '👤 Contacto en el lugar (quién le abre al operario)',
        description:
          'Debajo de LUGAR cargás el nombre + teléfono de quién le da acceso al operario en la obra (portería, un encargado). El operario lo ve al llegar con botones para Llamar o WhatsApp — así no depende de que esté escrito en las notas.',
        image: imgEditar,
      },
    ],
  });

  console.log('  [Coord] propuestas...');
  await tab('propuestas');
  const imgProp = await snap(page, { wait: 800 });
  let imgPropSheet = null;
  let imgPropNotas = null;
  try {
    await page.evaluate(() => {
      try {
        openPropSheet('prop-1');
      } catch (_) {}
    });
    imgPropSheet = await snap(page, { wait: 1000, fullPage: false });
    // Segunda toma scrolleada a PRECIO PROPUESTO → muestra el precio + los dos campos de notas
    // (Observaciones para el cliente / Notas internas) que son lo nuevo a documentar.
    await page.evaluate(() => {
      try {
        document.getElementById('prop-importe-input')?.scrollIntoView({ block: 'start' });
      } catch (_) {}
    });
    await page.waitForTimeout(400);
    imgPropNotas = await snap(page, { wait: 400, fullPage: false });
    await page.evaluate(() => {
      try {
        closePropSheet();
      } catch (_) {
        document.getElementById('prop-overlay')?.classList.remove('open');
      }
    });
    await page.waitForTimeout(300);
  } catch (e) {
    console.warn('  ⚠ prop sheet:', e.message.slice(0, 100));
  }
  sections.push({
    title: '💼 Propuestas — que ninguna se enfríe',
    intro:
      'Tu pipeline comercial. Arriba, "📞 A contactar hoy": las que llevan 15+ días sin respuesta del cliente. A los 45 días sin respuesta se archivan solas en 😶 Sin respuesta.',
    steps: [
      {
        title: 'Relojes de vida y seguimiento',
        description:
          '💬 WhatsApp abre el chat con mensaje listo; 📞 Contactado resetea el reloj. "⏸ Posponer aviso" pausa los avisos de una propuesta puntual.',
        image: imgProp,
      },
      {
        title: 'Precio y notas de la propuesta',
        description:
          'En la ficha editás PRECIO PROPUESTO (lo que le cotizás al cliente; cuando se acepta y creás el servicio, ahí pasa a "Precio acordado"). Hay DOS campos de notas distintos: "Observaciones para el cliente" va DENTRO del PDF que recibe el cliente; "📝 Notas internas (solo el equipo)" son privadas — el cliente nunca las ve.',
        image: imgPropNotas || imgPropSheet,
      },
      {
        title: '📄 Generar propuesta PDF',
        description:
          'Dentro de la propuesta: botón "📄 Generar propuesta PDF" → PDF con marca FlyClean (cliente, inversión, condiciones) listo para mandar. Y el 🧮 junto a PRECIO PROPUESTO te sugiere el precio por m².',
        image: imgPropSheet,
      },
    ],
  });

  console.log('  [Coord] clientes...');
  await tab('contactos');
  const imgCli = await snap(page, { wait: 1200, fullPage: false });
  sections.push({
    title: '👥 Clientes — cartera y recontacto',
    intro:
      'La cartera completa con su historia. Arriba, "🔁 Mantenimiento": clientes con 9+ meses sin trabajo — hay que recontactarlos. Si el cliente pide que lo llames más adelante: "📅 Recontactar a partir de…" y desaparece hasta esa fecha.',
    steps: [
      {
        title: 'Ficha 360: servicios, pagos, pendiente',
        description:
          'Cada ficha muestra todo lo del cliente: sus trabajos, cobros, sectores reusables e intermediarios. Desde la ficha creás trabajo o propuesta directo.',
        image: imgCli,
        wide: true,
      },
    ],
  });

  console.log('  [Coord] pedidos...');
  await tab('pedidos');
  const imgPedidos = await snap(page, { wait: 1000 });
  sections.push({
    title: '📦 Pedidos — las compras del equipo',
    intro: 'Lo que piden los operarios cae acá, ordenado por urgencia. Ahora con proveedor y costo estimado.',
    steps: [
      {
        title: 'Pendiente → ✅ Comprado → 📦 Recibido',
        description:
          'Marcá "Comprado" cuando lo compraste (guarda la fecha) y "Recibido" cuando llegó. Cancelá lo que no va.',
        image: imgPedidos,
        wide: true,
      },
    ],
  });

  console.log('  [Coord] equipos...');
  await tab('equipos');
  const imgEquipos = await snap(page, { wait: 1200 });
  sections.push({
    title: '🔧 Equipos — la flota bajo control',
    intro:
      'Toda la flota del país en un lugar: drones, camionetas, hidrolavadoras, ósmosis y trailer. Cada equipo con su estado, matrícula, km (vehículos) u horas de vuelo (drones), su responsable y el semáforo del reporte semanal.',
    steps: [
      {
        title: 'Asigná un responsable a cada equipo (una vez)',
        description:
          'Entrá a ✏️ editar un equipo y elegí su 👤 Responsable — la persona de campo (piloto, chofer) que lo tiene a cargo. Desde ahí, esa persona es quien reporta los km/horas cada semana desde su propia app; vos ya no tenés que perseguir los números.',
        image: imgEquipos,
        wide: true,
      },
      {
        title: 'Vos controlás: semáforo + service + historial',
        description:
          'La card muestra al responsable y un semáforo del último reporte (🟢 al día · 🟡 +1 semana · 🔴 +2). El 🔧 registra un service, ✏️ edita o da de baja un equipo, y 📜 muestra todo el historial (quién reportó qué y cuándo). Los que se atrasan aparecen marcados arriba para que no se te pase.',
      },
      {
        title: '⚠️ Cuando el piloto reporta un problema',
        description:
          'Si un piloto reporta algo (⚠️ en la card + un aviso arriba de todo), lo ves con el detalle de qué le pasa al equipo. Cuando lo resolvés (lo mandás a service, se arregla), tocá “✓ Resuelto” y queda cerrado en el historial.',
      },
    ],
  });

  console.log('  [Coord] menú...');
  const imgMenu = await snapAccountMenu(page);
  sections.push(seccionMenu(imgMenu, 'Desde 📊 CEO (si sos Dirección) saltás a la vista financiera.'));
  await ctx.close();
  return {
    title: 'Manual del Coordinador',
    subtitle: 'Operación, comercial y equipo — tu centro de mando',
    file: 'Manual_Coordinador_v3.pdf',
    sections,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// MANUAL: CEO / DIRECCIÓN
// ══════════════════════════════════════════════════════════════════════════════
async function buildCEO(browser) {
  const { ctx, page } = await newRolePage(browser);
  const sections = [];
  console.log('  [CEO] login...');
  const imgLogin = await loginV2(page, 'Eduardo Cabral', '#screen-ceo');
  sections.push(seccionLogin(imgLogin, 'Caés en el panel CEO con las métricas del negocio.'));

  const tab = async (name, wait = 1800) => {
    await page.evaluate(n => {
      try {
        setCEOTab(n);
      } catch (_) {}
    }, name);
    await page.waitForTimeout(wait);
  };

  console.log('  [CEO] métricas...');
  const imgMetricas = await snap(page, { wait: 2000, fullPage: false });
  sections.push({
    title: '📊 Métricas — el pulso del negocio',
    intro:
      'Balance del período (UY$ y USD SIEMPRE separados), ticket promedio, servicios completados, margen real, pipeline y salud del negocio. Arriba elegís período (mes/semana/año/rango) y país.',
    steps: [
      {
        title: 'Todo se calcula solo desde gastos, ingresos y servicios',
        description:
          'El Tablero de Rentabilidad muestra el margen por servicio (ingresos vinculados − gastos vinculados). El sparkline compara los últimos 6 meses.',
        image: imgMetricas,
        wide: true,
      },
    ],
  });

  console.log('  [CEO] finanzas + por cobrar...');
  await tab('finanzas');
  const imgFin = await snap(page, { wait: 1200, fullPage: false });
  await tab('porcobrar');
  const imgPC = await snap(page, { wait: 1200, fullPage: false });
  sections.push({
    title: '💰 Finanzas y Por cobrar',
    intro:
      'La Cuenta del negocio: RESULTADO OPERATIVO (ingresos de clientes − gastos reales), DEUDA con socios separada, CAJA del período y desgloses por rubro. Por cobrar cruza precio vs cobrado por cliente.',
    steps: [
      {
        title: 'Cuenta del negocio',
        description:
          'Los préstamos de socios NO se mezclan con el resultado operativo. Todo por moneda separada.',
        image: imgFin,
      },
      {
        title: 'Por cobrar por cliente',
        description:
          'Por cada servicio completado: precio (de la propuesta) vs cobrado (ingresos vinculados) → saldo pendiente. Con herramientas para asignar precio y conciliar monedas de un toque.',
        image: imgPC,
      },
    ],
  });

  console.log('  [CEO] equipo...');
  await tab('equipo');
  const imgEquipo = await snap(page, { wait: 1500, fullPage: false });
  sections.push({
    title: '👥 Equipo y 🔑 Cuentas de acceso',
    intro:
      'La gente del equipo por país. Como admin, arriba tenés "🔑 Cuentas de acceso": crear usuarios, resetear PINs, editar nombre/rol/país (✏️), dar de baja (conserva la historia) y reactivar.',
    steps: [
      {
        title: 'Alta sin programador',
        description:
          '"➕ Agregar usuario" crea la cuenta y le ponés el PIN — la persona ya puede entrar. La baja lo bloquea al instante; "🗂️ Dados de baja" permite reactivar.',
        image: imgEquipo,
        wide: true,
      },
    ],
  });

  console.log('  [CEO] configuración...');
  let imgCfg = null,
    imgDocs = null;
  try {
    await page.evaluate(() => {
      try {
        openConfigSheet();
      } catch (_) {}
    });
    await page.waitForTimeout(2200);
    imgCfg = await snap(page, { wait: 800, fullPage: false });
    await page.evaluate(() => {
      try {
        closeConfigSheet();
      } catch (_) {}
    });
    await page.waitForTimeout(300);
  } catch (e) {
    console.warn('  ⚠ config:', e.message.slice(0, 100));
  }
  try {
    await page.evaluate(() => {
      try {
        openDocumentosSheet();
      } catch (_) {}
    });
    await page.waitForTimeout(1500);
    imgDocs = await snap(page, { wait: 600, fullPage: false });
    await page.evaluate(() => {
      try {
        closeDocumentosSheet();
      } catch (_) {}
    });
    await page.waitForTimeout(300);
  } catch (e) {
    console.warn('  ⚠ docs:', e.message.slice(0, 100));
  }
  sections.push({
    title: '⚙️ Configuración — el negocio se ajusta sin programar',
    intro:
      'Solo administradores (vos y Diego). Desde el menú ⋯ → ⚙️: TODO lo que antes vivía en el código ahora lo cambiás acá y aplica al instante.',
    steps: [
      {
        title: '📬 Reportes · ⏱️ Reglas · ✅ Checklist · 💬 WhatsApp',
        description:
          'Quién recibe cada email; los días del negocio (15/45 propuestas, 9 meses mantenimiento…); el checklist del operario ítem por ítem; las plantillas de WhatsApp en ES y PT.',
        image: imgCfg,
      },
      {
        title: '💰 Tarifas de jornales · 🧮 Costos · 📑 Documentos',
        description:
          'Tarifa de jornal por persona (dron/manual) → tablero con el total a pagar del mes. Costos por m² + margen → calculadora de precio en la propuesta. Y el alta de documentos (DGI/BPS/seguros) con aviso automático de vencimiento.',
        image: imgDocs,
      },
    ],
  });

  console.log('  [CEO] menú...');
  const imgMenu = await snapAccountMenu(page);
  sections.push(seccionMenu(imgMenu, 'La fila ⚙️ Configuración solo la ven los administradores.'));
  await ctx.close();
  return {
    title: 'Manual del CEO / Dirección',
    subtitle: 'Métricas, finanzas, equipo y configuración del negocio',
    file: 'Manual_CEO_v1.pdf',
    sections,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// MANUAL: FINANZAS
// ══════════════════════════════════════════════════════════════════════════════
async function buildFinanzas(browser) {
  const { ctx, page } = await newRolePage(browser);
  const sections = [];
  console.log('  [Finanzas] login...');
  const imgLogin = await loginV2(page, 'Finanzas', '#screen-finanzas');
  sections.push(seccionLogin(imgLogin, 'Caés en el panel de administración financiera.'));

  const tab = async (name, wait = 1800) => {
    await page.evaluate(n => {
      try {
        setFinanzasTab(n);
      } catch (_) {}
    }, name);
    await page.waitForTimeout(wait);
  };

  console.log('  [Finanzas] resumen...');
  const imgResumen = await snap(page, { wait: 2000, fullPage: false });
  sections.push({
    title: '📊 Resumen — la cuenta del negocio',
    intro:
      'El estado de cuenta del período: resultado operativo, caja, deuda con socios y desgloses por rubro. UY$ y USD nunca se mezclan.',
    steps: [
      {
        title: 'Elegí período y mirá el estado real',
        description:
          'Los movimientos internos (cambios de moneda, traspasos) están identificados y NO cuentan como gasto/ganancia.',
        image: imgResumen,
        wide: true,
      },
    ],
  });

  console.log('  [Finanzas] por cobrar + gastos...');
  await tab('porcobrar');
  const imgPC = await snap(page, { wait: 1400, fullPage: false });
  await tab('gastos');
  const imgGastos = await snap(page, { wait: 1400, fullPage: false });
  let imgNuevoGasto = null;
  try {
    await page.evaluate(() => {
      try {
        openNuevoGastoSheet();
      } catch (_) {}
    });
    imgNuevoGasto = await snap(page, { wait: 900, fullPage: false });
    await page.evaluate(() => {
      document.querySelectorAll('.edit-overlay.open').forEach(o => o.classList.remove('open'));
    });
    await page.waitForTimeout(300);
  } catch (e) {
    console.warn('  ⚠ nuevo gasto:', e.message.slice(0, 100));
  }
  sections.push({
    title: '💰 Por cobrar — que no quede plata en la calle',
    intro:
      'Por cliente: qué servicios se completaron, a qué precio y cuánto se cobró → el saldo pendiente. Herramientas de un toque para asignar el precio del contrato y conciliar monedas.',
    steps: [
      {
        title: 'Vista por cliente con saldo',
        description:
          'Podés editar/archivar/eliminar y editar cobros directo desde acá. Las Pruebas y Relevamientos no se cobran (quedan fuera solos).',
        image: imgPC,
        wide: true,
      },
    ],
  });
  sections.push({
    title: '💸 Gastos — carga con IA y control total',
    intro:
      'Los operarios cargan sus gastos directos por foto; vos cargás los indirectos (sueldos, alquiler, etc.). En Uruguay, la IA lee el recibo y te pre-llena todo.',
    steps: [
      {
        title: 'La lista del mes',
        description:
          'Filtros por categoría, badges de clase (📌 Directo / 🔁 Indirecto), quién lo cargó y si está vinculado a un servicio.',
        image: imgGastos,
      },
      {
        title: '＋ Nuevo gasto',
        description:
          'Foto del recibo → la IA extrae monto/fecha/proveedor → confirmás. Moneda UY$ o USD explícita. Vinculalo a un servicio si es directo.',
        image: imgNuevoGasto,
      },
    ],
  });

  console.log('  [Finanzas] ingresos + reportes...');
  await tab('ingresos');
  const imgIngresos = await snap(page, { wait: 1400, fullPage: false });
  await tab('reportes');
  const imgReportes = await snap(page, { wait: 1400, fullPage: false });
  sections.push({
    title: '💵 Ingresos y 📊 Reportes',
    intro:
      'Registrás cada cobro (vinculado al cliente y al servicio → alimenta Por cobrar) y generás los reportes financieros en PDF.',
    steps: [
      {
        title: '＋ Nuevo ingreso / pago',
        description: 'Cliente + servicio + monto + moneda. "Facturado" marca si ya tiene factura.',
        image: imgIngresos,
      },
      {
        title: 'Reporte semanal / mensual / por servicio',
        description:
          'PDF de estado de cuenta con la marca FlyClean, listo para compartir con dirección o socios.',
        image: imgReportes,
      },
    ],
  });

  console.log('  [Finanzas] menú...');
  const imgMenu = await snapAccountMenu(page);
  sections.push(seccionMenu(imgMenu));
  await ctx.close();
  return {
    title: 'Manual de Finanzas',
    subtitle: 'Gastos, ingresos, por cobrar y reportes',
    file: 'Manual_Finanzas_v1.pdf',
    sections,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// MANUAL: VENTAS (actualizado a v3: login v2 + menú + 4 tabs)
// ══════════════════════════════════════════════════════════════════════════════
async function buildVentas(browser) {
  const { ctx, page } = await newRolePage(browser);
  const sections = [];
  console.log('  [Ventas] login...');
  const imgLogin = await loginV2(page, 'Ventas UY', '#screen-coordinator');
  sections.push(seccionLogin(imgLogin, 'Caés directo en 🎯 Prospección.'));

  console.log('  [Ventas] prospección...');
  const imgHome = await snap(page, { wait: 1200 });
  sections.push({
    title: 'Tu app: 4 pestañas, todo tu circuito comercial',
    intro:
      '🎯 Prospección · 💼 Propuestas · 👥 Clientes · 🗺️ Mapa. No ves finanzas ni la operativa: tu app es 100% comercial.',
    steps: [
      {
        title: 'Trabajá tus prospectos por urgencia',
        description:
          'Los prospectos con "Próximo contacto" vencido o de hoy suben arriba en rojo: esos llamalos ya. 💬 WhatsApp abre el chat con mensaje listo · 📞 Contactado hoy reprograma +7 días · 🤝 Interesado lo marca caliente (ahí el coordinador arma la propuesta) · ❌ Descartar lo saca sin borrarlo.',
        image: imgHome,
        wide: true,
      },
    ],
  });

  console.log('  [Ventas] + prospecto...');
  let imgSheet = null;
  try {
    await page.evaluate(() => {
      const b = [...document.querySelectorAll('button')].find(x => x.textContent.includes('Prospecto'));
      if (b) b.click();
    });
    imgSheet = await snap(page, { wait: 900, fullPage: false });
    await page.evaluate(() => {
      document.getElementById('prospecto-overlay')?.classList.remove('open');
    });
    await page.waitForTimeout(300);
  } catch (e) {
    console.warn('  ⚠ prospecto:', e.message.slice(0, 100));
  }
  sections.push({
    title: '＋ Prospecto — cargalo en 20 segundos',
    intro: 'Apenas terminás un llamado o visita, cargá el lead. Solo el nombre es obligatorio.',
    steps: [
      {
        title: 'Empresa · contacto · origen · interés · nota',
        description:
          'Origen (🧲 Vendedor / 🤝 Referido / 🌐 Web / 📞 Entrante / 🚶 Puerta fría) e Interés (🏢 Fachada / 🪟 Vidrios / ☀️ Paneles) son botones de un toque. "Próximo contacto" se pre-carga solo.',
        image: imgSheet,
        wide: true,
      },
    ],
  });

  console.log('  [Ventas] propuestas...');
  await page.evaluate(() => {
    try {
      setCoordTab('propuestas');
    } catch (_) {}
  });
  await page.waitForTimeout(1500);
  const imgProp = await snap(page, { wait: 800, fullPage: false });
  sections.push({
    title: '💼 Propuestas — seguí los presupuestos',
    intro:
      'Ves las cotizaciones del coordinador y su estado. NO editás ni cambiás precios: mirás y recontactás para que no se enfríen.',
    steps: [
      {
        title: '"📞 A contactar hoy" + 💬 WhatsApp + 📞 Contactado',
        description:
          'Arriba, las propuestas que hace 15+ días esperan respuesta. 💬 abre el chat; 📞 registra que llamaste (resetea el reloj).',
        image: imgProp,
        wide: true,
      },
    ],
  });

  console.log('  [Ventas] clientes...');
  await page.evaluate(() => {
    try {
      setCoordTab('contactos');
    } catch (_) {}
  });
  await page.waitForTimeout(1800);
  const imgCli = await snap(page, { wait: 800, fullPage: false });
  sections.push({
    title: '👥 Clientes — recontactá la cartera',
    intro:
      'Toda la cartera (datos de contacto, sin plata). Arriba, "🔁 Mantenimiento": los que hace 9+ meses no tienen un trabajo — esos son para vender de nuevo.',
    steps: [
      {
        title: '💬 WhatsApp (abre) · 📞 Contactado (lo marcás vos)',
        description:
          'Regla de oro: 💬 SOLO abre el chat. 📞 Contactado se marca APARTE y solo si de verdad hablaste. Al marcarlo, el cliente sale de la lista 60 días.',
        image: imgCli,
        wide: true,
        note: 'No podés editar clientes ni ver pagos: tu vista es solo para contactar.',
      },
    ],
  });

  console.log('  [Ventas] menú...');
  const imgMenu = await snapAccountMenu(page);
  sections.push(seccionMenu(imgMenu, 'En 🗺️ Mapa tenés los objetivos de prospección para salir a buscar.'));
  await ctx.close();
  return {
    title: 'Manual de Ventas',
    subtitle: 'Prospección, propuestas y clientes — tu circuito comercial',
    file: 'Manual_Ventas_v3.pdf',
    sections,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// Layout + PDF (mismo layout denso del manual de Ventas v2)
// ══════════════════════════════════════════════════════════════════════════════
function buildManualHTML({ title, subtitle, sections }) {
  const sectionsHTML = sections
    .map(
      (sec, i) => `
    <section class="manual-section">
      <div class="section-header"><span class="section-number">${i + 1}</span><h2>${escapeHtml(sec.title)}</h2></div>
      ${sec.intro ? `<p class="section-intro">${escapeHtml(sec.intro)}</p>` : ''}
      <div class="steps-grid">
        ${(sec.steps || [])
          .map(
            (step, j) => `
          <div class="step ${step.wide ? 'step-wide' : ''}">
            <div class="step-head"><span class="step-num">${i + 1}.${j + 1}</span><h3>${escapeHtml(step.title)}</h3></div>
            ${step.description ? `<p>${escapeHtml(step.description).replace(/\n/g, '<br>')}</p>` : ''}
            ${step.image ? `<div class="step-screenshot ${step.wide ? 'wide' : ''}"><img src="data:image/png;base64,${step.image}" alt="${escapeHtml(step.title)}"/></div>` : ''}
            ${step.note ? `<div class="step-note">${escapeHtml(step.note)}</div>` : ''}
          </div>`
          )
          .join('')}
      </div>
    </section>`
    )
    .join('');

  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>${escapeHtml(title)}</title>
<style>
  @page { size: A4; margin: 12mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #0d1f19; line-height: 1.34; font-size: 9.2pt; }
  .cover-band { display: flex; align-items: center; justify-content: space-between; gap: 12pt; background: linear-gradient(135deg, #00C98D 0%, #00a574 100%); color: #fff; border-radius: 9pt; padding: 14pt 18pt; margin-bottom: 12pt; }
  .cover-brand { font-size: 20pt; font-weight: 700; letter-spacing: -0.3pt; }
  .cover-tagline { font-size: 9pt; opacity: 0.92; margin-top: 2pt; }
  .cover-title { font-size: 16pt; font-weight: 700; line-height: 1.1; text-align: right; }
  .cover-subtitle { font-size: 9.5pt; opacity: 0.95; margin-top: 3pt; text-align: right; }
  .cover-meta { font-size: 7.8pt; opacity: 0.85; text-align: right; margin-top: 5pt; }
  .manual-section { padding-bottom: 7pt; }
  .section-header { display: flex; align-items: baseline; gap: 8pt; border-bottom: 1.6pt solid #00C98D; padding-bottom: 3.5pt; margin-bottom: 7pt; margin-top: 6pt; }
  .section-number { display: inline-flex; align-items: center; justify-content: center; width: 17pt; height: 17pt; background: #00C98D; color: #fff; border-radius: 50%; font-size: 9.5pt; font-weight: 700; flex-shrink: 0; }
  .section-header h2 { font-size: 12.5pt; font-weight: 700; color: #0d1f19; line-height: 1.15; }
  .section-intro { font-size: 8.8pt; color: #456b5e; margin-bottom: 7pt; padding: 4pt 8pt; background: #f4f8f6; border-left: 2.5pt solid #00C98D; border-radius: 3pt; }
  .steps-grid { display: flex; flex-wrap: wrap; gap: 8pt; align-items: flex-start; }
  .step { flex: 1 1 calc(50% - 8pt); max-width: calc(50% - 8pt); min-width: 150pt; page-break-inside: avoid; break-inside: avoid; border: 0.7pt solid #e3ede9; border-radius: 6pt; padding: 7pt 8pt; margin-bottom: 5pt; }
  .step-wide { flex: 1 1 100%; max-width: 100%; }
  .step-head { display: flex; align-items: baseline; gap: 6pt; margin-bottom: 3pt; }
  .step-num { flex-shrink: 0; font-size: 7.8pt; font-weight: 700; color: #00C98D; }
  .step h3 { font-size: 9.6pt; font-weight: 700; color: #0d1f19; line-height: 1.15; }
  .step p { font-size: 8.5pt; color: #395a4e; margin-bottom: 4pt; }
  .step-screenshot { background: #f4f8f6; border: 0.7pt solid #ddeae4; border-radius: 5pt; padding: 4pt; text-align: center; margin: 4pt 0; }
  .step-screenshot img { max-width: 100%; height: auto; display: inline-block; max-height: 67mm; border-radius: 3pt; }
  .step-screenshot.wide img { max-height: 92mm; }
  .step:has(.step-screenshot) { display: grid; grid-template-columns: 0.82fr 1.18fr; column-gap: 10pt; align-items: start; flex-basis: 100% !important; max-width: 100% !important; }
  .step:has(.step-screenshot) > .step-head, .step:has(.step-screenshot) > p, .step:has(.step-screenshot) > .step-note { grid-column: 1; }
  .step:has(.step-screenshot) > .step-screenshot { grid-column: 2; grid-row: 1 / span 30; margin: 0; }
  .step-note { font-size: 8.2pt; color: #b45309; background: #fff8e6; border: 0.7pt solid #fde68a; border-radius: 3pt; padding: 4pt 7pt; margin-top: 4pt; }
  .demo-note { font-size: 7.6pt; color: #8aada3; text-align: center; margin-top: 8pt; }
</style></head><body>
  <div class="cover-band">
    <div><div class="cover-brand">FlyClean</div><div class="cover-tagline">Manual de uso</div></div>
    <div><div class="cover-title">${escapeHtml(title)}</div><div class="cover-subtitle">${escapeHtml(subtitle)}</div><div class="cover-meta">${MANUAL_VERSION} · ${TODAY} · flyclean.app</div></div>
  </div>
  ${sectionsHTML}
  <div class="demo-note">Las capturas usan datos de demostración (clientes y montos ficticios).</div>
</body></html>`;
}

async function htmlToPDF(browser, html, outputPath, footerTitle) {
  const ctx = await browser.newContext({ viewport: { width: 794, height: 1123 } });
  const page = await ctx.newPage();
  await page.setContent(html, { waitUntil: 'networkidle' });
  await page.emulateMedia({ media: 'print' });
  const footerTemplate = `<div style="font-size:7pt;color:#8aada3;width:100%;padding:0 12mm;display:flex;justify-content:space-between;"><span>${escapeHtml(footerTitle)} · ${MANUAL_VERSION} · ${TODAY}</span><span>Pág. <span class="pageNumber"></span> / <span class="totalPages"></span></span></div>`;
  await page.pdf({
    path: outputPath,
    format: 'A4',
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: '<div></div>',
    footerTemplate,
    margin: { top: '12mm', right: '12mm', bottom: '14mm', left: '12mm' },
  });
  await ctx.close();
}

// ══════════════════════════════════════════════════════════════════════════════
const BUILDERS = {
  operario: buildOperario,
  coordinador: buildCoordinador,
  ceo: buildCEO,
  finanzas: buildFinanzas,
  ventas: buildVentas,
};

async function main() {
  const only = (process.argv[2] || '').toLowerCase();
  const roles = only && BUILDERS[only] ? [only] : Object.keys(BUILDERS);
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  console.log('🚀 Chromium headless + red interceptada (datos demo, cero escritura posible)...');
  const browser = await chromium.launch({ headless: true });
  const ok = [],
    fail = [];
  try {
    for (const rol of roles) {
      console.log(`\n📘 Manual: ${rol}...`);
      try {
        const manual = await BUILDERS[rol](browser);
        const html = buildManualHTML(manual);
        fs.writeFileSync(path.join(OUTPUT_DIR, `_${rol}-debug.html`), html);
        const outPath = path.join(OUTPUT_DIR, manual.file);
        await htmlToPDF(browser, html, outPath, manual.title);
        console.log('  ✓', manual.file, '(', (fs.statSync(outPath).size / 1024).toFixed(0), 'KB )');
        ok.push(manual.file);
      } catch (e) {
        console.error(`  ✗ ${rol}:`, e.message);
        fail.push(rol);
      }
    }
  } finally {
    await browser.close();
  }
  console.log('\n✅ OK:', ok.join(', ') || '(ninguno)');
  if (fail.length) {
    console.log('❌ Fallaron:', fail.join(', '));
    process.exit(1);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
