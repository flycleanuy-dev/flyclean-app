// v26: filtro Uruguay incluye registros sin País (ingresos cargados sin el campo) → saldo correcto.
// v25: usuario Finanzas (Administración) ahora ve el 'Estado de cuenta' del rediseño (scope Uruguay).
// v24: rediseño CEO 'Cuenta del negocio' — balance héroe, estado de cuenta, refrescar, salud, margen real.
// v23: servicios del CEO cacheados (1 fetch por sesión, aparte) → conteo confiable.
// v22: servicios del CEO en 2da tanda + reintento (evita vacíos por rate-limit de Notion).
// v21: servicios completados/activos del CEO (traer todos + filtrar en cliente).
// v20: fix clave de cache del SW (no truncar) → totales año/rango correctos; conteo servicios robusto.
// v19: CEO filtros de período (mes/semana/año/rango/todo) + KPIs nuevos + paginación + gastos desplegables.
// v18: PDF cliente+tipo descriptivo; guardia anti-tap al scrollear; fija balanceo lateral.
// v17: paso 'Observación al cliente' (+ monto en prueba/relevam) antes de generar el PDF.
// v16: PDF sin emojis raros + sin nota del operario; fotos en desplegable (lazy via proxy).
// v15: reducir tamaño de fotos en el PDF (máx 1100px) para poder enviarlo.
// v14: PDF de devolución generado con jsPDF (cliente, self-hosted) — confiable.
// v13: PDF generado en el servidor (Chrome real, api/report-pdf) — confiable.
// v12: fix PDF en blanco — render del reporte en position:absolute (no fixed) + overlay.
// v11: html2pdf self-hosted en /vendor (carga on-demand) — evita el "html2pdf no cargado" del CDN.
// v10: bump tras fix del PDF de devolución (proxy de fotos + render) + generación desde el CEO.
// v9: bump tras fix de overflow horizontal en las tab bars (coord/CEO).
// v8: bump tras fix selector de servicios recientes en alta de gasto.
// v7: bump tras claridad de monedas (UY$ vs USD separadas) + tab Equipo desde Notion.
// v6: bump tras PR #28 (fix gasto-overlay fuera de screen-coordinator).
// Sin este bump los clientes con la PWA instalada seguirían viendo el index.html
// viejo desde caché y el bug del modal de gasto se mantendría visible aun con el
// deploy live. Cache de Notion no necesita bump (solo cambió HTML).
// v5: cambiar estrategia de Notion API de stale-while-revalidate a NETWORK-FIRST con timeout.

const CACHE = 'flyclean-v26';
const SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-192-maskable.png',
  '/icon-512-maskable.png',
  '/splash.png',
  '/vendor/jspdf.umd.min.js'
];
const NOTION_CACHE = 'flyclean-notion-cache-v2';
const NETWORK_TIMEOUT_MS = 5000;

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE && k !== NOTION_CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Distingue requests al proxy de Notion que son SOLO LECTURA y se pueden cachear:
// databases/{id}/query y databases/{id} (la lista de servicios/propuestas/etc).
// Cualquier write (pages, pages/{id} PATCH) NUNCA se cachea.
function isCacheableNotionRead(request, bodyText) {
  if (request.method !== 'POST') return false;
  if (!bodyText) return false;
  try {
    const body = JSON.parse(bodyText);
    const ep = body.endpoint || '';
    const method = (body.method || 'GET').toUpperCase();
    if (method !== 'POST' && method !== 'GET') return false;
    return /^databases\/[a-f0-9-]{32,36}\/query$/.test(ep)
        || /^databases\/[a-f0-9-]{32,36}$/.test(ep);
  } catch (_) { return false; }
}

// Estrategia network-first con timeout + fallback a cache:
// 1. Intenta red con timeout 5s.
// 2. Si la red devuelve OK → usa esa respuesta + actualiza cache.
// 3. Si la red falla o timeout → devuelve cache si existe.
// 4. Si no hay cache → 503 con mensaje offline.
async function handleNotionApi(event) {
  let bodyText = '';
  try { bodyText = await event.request.clone().text(); } catch (_) {}
  const cacheable = isCacheableNotionRead(event.request, bodyText);
  if (!cacheable) return fetch(event.request);

  // Clave por CUERPO COMPLETO (antes truncaba a 64 chars → chocaban páginas/consultas con el
  // mismo prefijo: el start_cursor y los filtros de fecha quedaban fuera de la clave → totales cortados).
  const cacheKey = new Request(event.request.url + '#' + btoa(unescape(encodeURIComponent(bodyText))), { method: 'GET' });
  const cache = await caches.open(NOTION_CACHE);

  // Race: red con timeout vs. cache si la red tarda mucho.
  const networkPromise = fetch(event.request).then(res => {
    if (res && res.ok) {
      cache.put(cacheKey, res.clone()).catch(() => {});
    }
    return res;
  });
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('network timeout')), NETWORK_TIMEOUT_MS)
  );

  try {
    const res = await Promise.race([networkPromise, timeoutPromise]);
    if (res) return res;
  } catch (e) {
    // network failed or timeout → fall through to cache
  }

  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  return new Response(JSON.stringify({ error: 'offline', message: 'No hay conexión y no hay copia cacheada de esta consulta.' }), {
    status: 503,
    headers: { 'Content-Type': 'application/json' }
  });
}

self.addEventListener('fetch', e => {
  const url = e.request.url;

  if (url.includes('/api/notion')) {
    e.respondWith(handleNotionApi(e));
    return;
  }
  if (url.includes('/api/')) return;

  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(cached => {
      const network = fetch(e.request).then(res => {
        if (res.ok) caches.open(CACHE).then(c => c.put(e.request, res.clone())).catch(() => {});
        return res;
      });
      return cached || network;
    })
  );
});
