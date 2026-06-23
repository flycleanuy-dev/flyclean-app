import { verifySession, tokenFromReq } from './_lib/session.js';

// Auth del proxy (#1). MONITOR (false): valida el token y lo reporta en X-Auth, pero NO rechaza.
// ENFORCE (true): rechaza con 401 los pedidos sin token válido → CIERRA el agujero.
// Activado tras verificar el round-trip completo (login emite token, proxy valida x-auth:ok) y que
// todos los usuarios están en PINs server-known → nadie queda trancado. Revertir = poner false.
const ENFORCE_AUTH = true;

const ALLOWED_ENDPOINTS = [
  /^databases\/[a-f0-9-]{32,36}\/query$/,
  /^databases\/[a-f0-9-]{32,36}$/,
  /^pages\/[a-f0-9-]{32,36}$/,
  /^pages$/,
  /^search$/,
];
const ALLOWED_METHODS = ['GET', 'POST', 'PATCH'];

// Margen amplio para que los reintentos no choquen con el límite de duración de la función.
export const config = { maxDuration: 30 };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// fetch a Notion con timeout (AbortController) + reintento ante 429 (rate-limit), 5xx o error de red.
// La API de Notion se rate-limitea / se cuelga bajo carga (sobre todo la search API que usa el
// fallback de la DB Servicios), y sin esto el proxy devolvía vacío/error → el usuario veía
// "no se conecta con Notion" y la app quedaba lenta/colgada.
async function notionFetch(url, options, { retries = 1, timeoutMs = 9000 } = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const resp = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timer);
      // 429 → respetar Retry-After; 5xx → backoff corto. Reintentar mientras queden intentos.
      if (attempt < retries && (resp.status === 429 || (resp.status >= 500 && resp.status < 600))) {
        const ra = parseFloat(resp.headers.get('retry-after'));
        await sleep(resp.status === 429 && ra ? Math.min(ra, 5) * 1000 : 500 * (attempt + 1));
        continue;
      }
      return resp;
    } catch (e) {
      clearTimeout(timer);
      lastErr = e;
      if (attempt < retries) { await sleep(500 * (attempt + 1)); continue; }
      throw e;
    }
  }
  throw lastErr || new Error('notion fetch failed');
}

export default async function handler(req, res) {
  const origin = req.headers.origin || '';
  const allowedOrigins = [
    'https://flyclean.app',
    'https://www.flyclean.app',
    'https://flyclean-app.vercel.app',
    /^https:\/\/flyclean-app-[a-z0-9]+-fly-clean-app-s-projects\.vercel\.app$/,
  ];
  const originAllowed = allowedOrigins.some(o =>
    typeof o === 'string' ? o === origin : o.test(origin)
  );

  res.setHeader('Access-Control-Allow-Origin', originAllowed ? origin : 'https://flyclean.app');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Vary', 'Origin');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Auth de sesión (#1): exige el token firmado que emite verify-pin. MONITOR reporta, ENFORCE rechaza.
  const session = verifySession(tokenFromReq(req));
  res.setHeader('X-Auth', session ? 'ok' : 'missing');
  if (ENFORCE_AUTH && !session) return res.status(401).json({ error: 'auth required' });

  const token = process.env.NOTION_TOKEN;
  if (!token) return res.status(500).json({ error: 'NOTION_TOKEN not configured' });

  const { endpoint, method = 'GET', body } = req.body || {};

  // Validate endpoint
  if (!endpoint || typeof endpoint !== 'string' || endpoint.length > 200) {
    return res.status(400).json({ error: 'Invalid endpoint' });
  }
  const endpointNorm = endpoint.trim().replace(/^\/+/, '');
  if (!ALLOWED_ENDPOINTS.some(re => re.test(endpointNorm))) {
    return res.status(400).json({ error: 'Endpoint not allowed' });
  }

  // Validate method
  const httpMethod = String(method).toUpperCase();
  if (!ALLOWED_METHODS.includes(httpMethod)) {
    return res.status(400).json({ error: 'HTTP method not allowed' });
  }

  const notionHeaders = {
    Authorization: `Bearer ${token}`,
    'Notion-Version': '2022-06-28',
    'Content-Type': 'application/json',
  };

  try {
    const response = await notionFetch(`https://api.notion.com/v1/${endpointNorm}`, {
      method: httpMethod,
      headers: notionHeaders,
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json();

    // Fallback for Servicios DB (multiple data sources) — SOLO aplica a queries de listado,
    // NO a creates ni updates. Notion responde con el mismo error_type para creates pero
    // el fallback de search devolvería resultados inválidos en ese caso.
    const isQuery = /^databases\/[a-f0-9-]{32,36}\/query$/.test(endpointNorm);
    if (isQuery && data.code === 'validation_error' &&
        data.additional_data?.error_type === 'multiple_data_sources_for_database') {
      const dbId = endpointNorm.split('/')[1];
      // Comparar ids sin guiones (robustez; alinea con searchByParent de api/_lib/notion.js,
      // que ya normalizaba — antes acá era === crudo y solo funcionaba por coincidencia).
      const norm = (s) => (s || '').replace(/-/g, '');
      // La search API bajo carga a veces devuelve [] (sin error) → reintentar la búsqueda
      // completa hasta traer resultados (la DB Servicios siempre tiene datos). Esto mata el
      // "la lista de servicios aparece vacía / con error y recién al recargar aparece".
      let allResults = [];
      let truncated = false;
      for (let fb = 0; fb < 3; fb++) {
        allResults = [];
        let cursor = null;
        do {
          const searchBody = { filter: { property: 'object', value: 'page' }, page_size: 100 };
          if (cursor) searchBody.start_cursor = cursor;
          const sr = await notionFetch('https://api.notion.com/v1/search', {
            method: 'POST',
            headers: notionHeaders,
            body: JSON.stringify(searchBody),
          });
          const sd = await sr.json();
          const filtered = (sd.results || []).filter(r => norm(r.parent?.database_id) === norm(dbId));
          allResults = allResults.concat(filtered);
          cursor = sd.has_more ? sd.next_cursor : null;
        } while (cursor && allResults.length < 2000);
        truncated = cursor !== null;
        if (allResults.length) break;            // ok → salir
        if (fb < 2) await sleep(500 * (fb + 1)); // vacío (rate-limit) → reintentar
      }
      // Si quedó cursor pendiente al alcanzar el cap (allResults.length === 2000),
      // devolvemos has_more=true para que el cliente sepa que la lista está truncada.
      if (truncated) console.warn('[notion-proxy] fallback search reached 2000 cap for db', dbId);
      return res.status(200).json({ object: 'list', results: allResults, has_more: truncated });
    }

    return res.status(response.status).json(data);
  } catch (err) {
    const timedOut = err?.name === 'AbortError';
    return res.status(502).json({ error: timedOut ? 'Notion no respondió a tiempo' : 'Internal error' });
  }
}
