// v4: sumar icons maskable + splash al app shell.
const CACHE = 'flyclean-v4';
const SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-192-maskable.png',
  '/icon-512-maskable.png',
  '/splash.png'
];
const NOTION_CACHE = 'flyclean-notion-cache-v1';

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

async function handleNotionApi(event) {
  // Tenemos que clonar el body antes de pasar el request a fetch.
  let bodyText = '';
  try { bodyText = await event.request.clone().text(); } catch (_) {}
  const cacheable = isCacheableNotionRead(event.request, bodyText);
  if (!cacheable) return fetch(event.request);

  // Clave de cache: url + body (porque distintos queries van al mismo endpoint).
  const cacheKey = new Request(event.request.url + '#' + btoa(unescape(encodeURIComponent(bodyText))).slice(0, 64), { method: 'GET' });
  const cache = await caches.open(NOTION_CACHE);
  const cached = await cache.match(cacheKey);

  const networkPromise = fetch(event.request)
    .then(res => {
      if (res && res.ok) {
        cache.put(cacheKey, res.clone()).catch(() => {});
      }
      return res;
    })
    .catch(err => null);

  if (cached) {
    // Devuelvo cache inmediato; la red se actualiza en background.
    networkPromise.then(() => {});
    return cached;
  }
  // Sin cache previa: esperar red. Si la red falla, devolver error.
  const net = await networkPromise;
  if (net) return net;
  return new Response(JSON.stringify({ error: 'offline', message: 'No hay conexión y no hay copia cacheada de esta consulta.' }), {
    status: 503,
    headers: { 'Content-Type': 'application/json' }
  });
}

self.addEventListener('fetch', e => {
  const url = e.request.url;

  // Notion API: estrategia stale-while-revalidate para reads, never-cache para writes.
  if (url.includes('/api/notion')) {
    e.respondWith(handleNotionApi(e));
    return;
  }
  // Cualquier otro /api/ pasa directo (upload-url, etc).
  if (url.includes('/api/')) return;

  // Shell: solo GET cacheable.
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
