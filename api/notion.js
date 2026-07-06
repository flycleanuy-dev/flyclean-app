import { verifySession, tokenFromReq, maybeRenewSession } from './_lib/session.js';
import { userById, esVentas } from './_lib/users.js';
import { checkPermiso } from './_lib/permisos.js';

// Auth del proxy (#1). MONITOR (false): valida el token y lo reporta en X-Auth, pero NO rechaza.
// ENFORCE (true): rechaza con 401 los pedidos sin token válido → CIERRA el agujero.
// Activado tras verificar el round-trip completo (login emite token, proxy valida x-auth:ok) y que
// todos los usuarios están en PINs server-known → nadie queda trancado. Revertir = poner false.
const ENFORCE_AUTH = true;

// Matriz de permisos por rol (#2). Mismo patrón monitor→enforce que ENFORCE_AUTH:
// MONITOR (false): evalúa cada request contra la matriz (api/_lib/permisos.js) y loguea
// '[perms] DENEGARÍA ...' cuando un rol pide una base que no le corresponde, pero NO rechaza
// (cero cambio de comportamiento). ENFORCE (true): responde 403 → CIERRA el acceso cruzado.
// Prender recién después de auditar los warns en prod y afinar la matriz para que ningún
// flujo real quede afuera. Revertir = poner false.
const ENFORCE_PERMS = false;

const ALLOWED_ENDPOINTS = [
  /^databases\/[a-f0-9-]{32,36}\/query$/,
  /^databases\/[a-f0-9-]{32,36}$/,
  /^pages\/[a-f0-9-]{32,36}$/,
  /^pages$/,
  /^search$/,
];
const ALLOWED_METHODS = ['GET', 'POST', 'PATCH'];

// Backstop server-side del rol Ventas (ver docs/superpowers/specs/2026-07-03-backstop-ventas-serverside-design.md):
// Ventas puede tocar la DB de Clientes/Contactos y — desde 2026-07-05 (ver+seguimiento) — LEER la DB
// de Propuestas + PATCHear en ellas SOLO 'Última interacción' (el botón 📞 Contactado). Nada más.
// Ids de Notion vienen con o sin guiones → normalizar.
const CONTACTOS_NORM = '250115612de74e0582366549bbe5e389';
const PROPUESTAS_NORM = '2c0a4257f4294941b994dfebc1098633';
// Servicios: SOLO query (lista) para Ventas — para el cruce "clientes para recontactar"/mantenimiento.
// pages/{id} de un servicio sigue bloqueado (no está en la rama de pages más abajo). El camino real de
// lectura es el espejo (/api/db resource 'servicios'); este es el fallback si cae a Notion.
const SERVICIOS_NORM = 'ccaf276c7f6a460caeb3d2800deab2e5';
const norm = s => String(s || '').replace(/-/g, '').toLowerCase();

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
  maybeRenewSession(res, session); // renovación silenciosa (token 7d sliding)

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

  // Backstop server-side del rol Ventas: restringe a la DB de Clientes/Contactos.
  // Solo entra si hay sesión Y esVentas(u) → cero cambio de comportamiento para cualquier otro rol.
  const u = session ? userById(session.id) : null;
  if (esVentas(u)) {
    const mQuery = endpointNorm.match(/^databases\/([a-f0-9-]{32,36})(\/query)?$/);
    const mPage = endpointNorm.match(/^pages\/([a-f0-9-]{32,36})$/);
    if (mQuery) {
      if (![CONTACTOS_NORM, PROPUESTAS_NORM, SERVICIOS_NORM].includes(norm(mQuery[1]))) return res.status(403).json({ error: 'forbidden: rol Ventas solo accede a clientes, propuestas y servicios' });
    } else if (endpointNorm === 'pages') {
      // crear página: solo Contactos por database_id, y SIN data_source_id (evita smuggling a otra base)
      const p = body?.parent || {};
      if (norm(p.database_id) !== CONTACTOS_NORM || p.data_source_id) return res.status(403).json({ error: 'forbidden: rol Ventas solo crea clientes' });
    } else if (mPage) {
      // leer/editar una página por id: verificar server-side el parent real de la página. Sin esto,
      // Ventas podía cosechar ids de servicios/ingresos desde relaciones y leerlos/editarlos por
      // pages/{id} (hallazgo del review adversarial). Contactos: GET/PATCH como siempre.
      // Propuestas (2026-07-05): GET libre; PATCH SOLO si el body escribe únicamente la property
      // 'Última interacción' (marcarPropContactada) — cualquier otra key (properties ajenas,
      // in_trash, archived, icon...) se rechaza.
      try {
        const metaRes = await notionFetch(`https://api.notion.com/v1/pages/${mPage[1]}`, {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}`, 'Notion-Version': '2022-06-28' },
        });
        const meta = await metaRes.json();
        const parentNorm = norm(meta?.parent?.database_id);
        if (parentNorm === CONTACTOS_NORM) {
          // ok — comportamiento original
        } else if (parentNorm === PROPUESTAS_NORM) {
          if (httpMethod === 'PATCH') {
            const topKeys = Object.keys(body || {});
            const propKeys = Object.keys(body?.properties || {});
            const soloSeguimiento = topKeys.length === 1 && topKeys[0] === 'properties'
              && propKeys.length === 1 && propKeys[0] === 'Última interacción';
            if (!soloSeguimiento) return res.status(403).json({ error: 'forbidden: rol Ventas solo registra seguimiento en propuestas' });
          }
        } else {
          return res.status(403).json({ error: 'forbidden: rol Ventas solo clientes y propuestas' });
        }
      } catch (e) { return res.status(403).json({ error: 'forbidden' }); }
    } else if (endpointNorm === 'search') {
      return res.status(403).json({ error: 'forbidden: rol Ventas' });
    }
  }

  // Matriz de permisos por rol (#2, api/_lib/permisos.js) — para el RESTO de los roles.
  // Ventas NO pasa por acá: su backstop dedicado (arriba) corta primero y gobierna todo su acceso.
  // La matriz gobierna solo queries por DB, schema por DB, creates por parent y search directo;
  // pages/{id} GET/PATCH quedan fuera (residual documentado en permisos.js).
  if (!esVentas(u)) {
    let tipo = null, dbId = '';
    const mQuery = endpointNorm.match(/^databases\/([a-f0-9-]{32,36})\/query$/);
    const mSchema = endpointNorm.match(/^databases\/([a-f0-9-]{32,36})$/);
    if (mQuery) { tipo = 'query'; dbId = mQuery[1]; }
    else if (mSchema) { tipo = 'schema'; dbId = mSchema[1]; }
    else if (endpointNorm === 'pages' && httpMethod === 'POST') {
      // create: el parent puede venir por database_id o por data_source_id (servicios/gastos/
      // ingresos/solicitudes crean por data source) — la matriz acepta ambos ids normalizados.
      tipo = 'create';
      dbId = body?.parent?.database_id || body?.parent?.data_source_id || '';
    } else if (endpointNorm === 'search') {
      tipo = 'search';
    }
    if (tipo) {
      const perm = checkPermiso(u, { tipo, dbId });
      if (!perm.ok) {
        console.warn('[perms] DENEGARÍA', JSON.stringify({ rol: u?.rol, id: session?.id, tipo, db: norm(dbId), endpoint: endpointNorm, motivo: perm.motivo }));
        if (ENFORCE_PERMS) return res.status(403).json({ error: 'forbidden: tu rol no accede a esa base' });
      }
    }
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
