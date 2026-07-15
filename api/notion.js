import { verifySession, tokenFromReq, maybeRenewSession } from './_lib/session.js';
import { resolveUser, esVentas, esGlobal, paisCoincide } from './_lib/users.js';
import { checkPermiso } from './_lib/permisos.js';
import { resourceFromPage, DBS } from './_lib/notion-map.js';
import { mirrorPage, deleteRowByNotionId } from './_lib/mirror.js';
import {
  mergeProps,
  enqueueOutbox,
  supafirstSet,
  getMirrorRaw,
  cancelOutboxForPage,
} from './_lib/supafirst.js';

// Fase 3a.1 — espejo garantizado: tras un PATCH/POST EXITOSO a Notion, reflejar esa página en Supabase desde
// el proxy (cierra los huecos de syncAfterWrite: operario, gastos, drain offline, creates). await inline con
// timeout, best-effort: NUNCA afecta la respuesta ni el guardado en Notion. Flag env (rollback = borrar el env).
const MIRROR_ON_WRITE = process.env.MIRROR_ON_WRITE === '1';
const MIRROR_VERBOSE = process.env.MIRROR_VERBOSE === '1'; // loguea también los OK (para verificar el rollout)
const MIRROR_TIMEOUT_MS = 2500;

// Fase 3a.2 — Supabase-first para EDICIONES por tabla (env SUPAFIRST_TABLES, CSV). VACÍO = inerte (nunca entra
// al branch → comportamiento idéntico a 3a.1). Prender una tabla: setear el env + correr la migración +
// sacar la tabla del cron-db-sync. Rollback = sacar la tabla del CSV.
const SUPAFIRST = supafirstSet();
const SUPAFIRST_VERBOSE = process.env.SUPAFIRST_VERBOSE === '1'; // loguea también los OK (verificar el rollout)

// Auth del proxy (#1). MONITOR (false): valida el token y lo reporta en X-Auth, pero NO rechaza.
// ENFORCE (true): rechaza con 401 los pedidos sin token válido → CIERRA el agujero.
// Activado tras verificar el round-trip completo (login emite token, proxy valida x-auth:ok) y que
// todos los usuarios están en PINs server-known → nadie queda trancado. Revertir = poner false.
const ENFORCE_AUTH = true;

// Matriz de permisos por rol (#2). Mismo patrón monitor→enforce que ENFORCE_AUTH, pero DRIVEN POR ENV para
// poder prender/apagar SIN deploy (rollback instantáneo): setear ENFORCE_PERMS=1 en Vercel para enforcar.
// MONITOR (env ausente/≠1): evalúa cada request contra la matriz (api/_lib/permisos.js) y loguea
// '[perms] DENEGARÍA ...' cuando un rol pide una base que no le corresponde, pero NO rechaza
// (cero cambio de comportamiento). ENFORCE (env=1): responde 403 → CIERRA el acceso cruzado.
// Auditoría 2026-07-10: el único DENEGARÍA en prod es un operario de prueba llegando a Finanzas (acceso
// cruzado que el candado DEBE bloquear); ningún flujo legítimo queda afuera. Revertir = borrar el env.
const ENFORCE_PERMS = process.env.ENFORCE_PERMS === '1';

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
const ACTIVOS_NORM = 'e75449eeb78143f1b74006a4796c1f95';
// Equipos v2 — backstop del OPERARIO sobre Activos: su PATCH solo puede escribir los campos del reporte
// semanal (km/horas/fecha/historial). Cualquier otra property, in_trash, archived, etc. se rechaza.
const ACTIVOS_OPERARIO_PROPS = ['Km actuales', 'Horas de vuelo', 'Último check', 'Historial equipo'];
const norm = s =>
  String(s || '')
    .replace(/-/g, '')
    .toLowerCase();

// Margen amplio para que los reintentos no choquen con el límite de duración de la función.
export const config = { maxDuration: 30 };

const sleep = ms => new Promise(r => setTimeout(r, ms));

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
      if (attempt < retries) {
        await sleep(500 * (attempt + 1));
        continue;
      }
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
  const originAllowed = allowedOrigins.some(o => (typeof o === 'string' ? o === origin : o.test(origin)));

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
  const u = session ? await resolveUser(session.id) : null; // DB-backed con rescate + fallback duro (Fase 3.0)
  // Fase 3a.2: la meta (página COMPLETA antes del PATCH) que descargan los checks de permisos se reusa para
  // derivar el resource del branch Supabase-first (evita un 2º GET). Se setea en los dos GET meta de abajo.
  let patchMeta = null;
  // Motivo por el que el branch Supabase-first cayó a Notion-first (gobierna el post-write del espejo):
  // null = no aplicó · 'notfound' = fila no espejada (upsert completo es SEGURO: no puede tener outbox
  // pendiente) · 'fail'/'enqueue'/'error' = hipo transitorio (solo delta-merge: NUNCA página completa).
  let supafirstMiss = null;
  if (esVentas(u)) {
    const mQuery = endpointNorm.match(/^databases\/([a-f0-9-]{32,36})(\/query)?$/);
    const mPage = endpointNorm.match(/^pages\/([a-f0-9-]{32,36})$/);
    if (mQuery) {
      if (![CONTACTOS_NORM, PROPUESTAS_NORM, SERVICIOS_NORM].includes(norm(mQuery[1])))
        return res
          .status(403)
          .json({ error: 'forbidden: rol Ventas solo accede a clientes, propuestas y servicios' });
    } else if (endpointNorm === 'pages') {
      // crear página: solo Contactos por database_id, y SIN data_source_id (evita smuggling a otra base)
      const p = body?.parent || {};
      if (norm(p.database_id) !== CONTACTOS_NORM || p.data_source_id)
        return res.status(403).json({ error: 'forbidden: rol Ventas solo crea clientes' });
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
        patchMeta = meta;
        const parentNorm = norm(meta?.parent?.database_id);
        if (parentNorm === CONTACTOS_NORM) {
          // ok — comportamiento original
        } else if (parentNorm === PROPUESTAS_NORM) {
          if (httpMethod === 'PATCH') {
            const topKeys = Object.keys(body || {});
            const propKeys = Object.keys(body?.properties || {});
            const soloSeguimiento =
              topKeys.length === 1 &&
              topKeys[0] === 'properties' &&
              propKeys.length === 1 &&
              propKeys[0] === 'Última interacción';
            if (!soloSeguimiento)
              return res
                .status(403)
                .json({ error: 'forbidden: rol Ventas solo registra seguimiento en propuestas' });
          }
        } else {
          return res.status(403).json({ error: 'forbidden: rol Ventas solo clientes y propuestas' });
        }
      } catch (e) {
        return res.status(403).json({ error: 'forbidden' });
      }
    } else if (endpointNorm === 'search') {
      return res.status(403).json({ error: 'forbidden: rol Ventas' });
    }
  }

  // Matriz de permisos por rol (#2, api/_lib/permisos.js) — para el RESTO de los roles.
  // Ventas NO pasa por acá: su backstop dedicado (arriba) corta primero y gobierna todo su acceso.
  // La matriz gobierna solo queries por DB, schema por DB, creates por parent y search directo;
  // pages/{id} GET/PATCH quedan fuera (residual documentado en permisos.js).
  if (!esVentas(u)) {
    // PATCH pages/{id} — control de escritura cruzada (hallazgo Codex #2, 2026-07-07). El query/create por
    // base ya lo cubre la matriz de abajo; acá tapamos el PATCH de una página individual a una base AJENA
    // (cosechando su UUID desde una relación). Verificamos el parent REAL de la página (GET meta) y checamos
    // permiso de escritura (tipo 'create'). Como el resto de la matriz: MONITOR loguea, ENFORCE 403. El GET
    // de una página individual queda como residual menor (leer, no escribir; y controlarlo duplicaría lecturas).
    if (httpMethod === 'PATCH') {
      const mPagePatch = endpointNorm.match(/^pages\/([a-f0-9-]{32,36})$/);
      if (mPagePatch) {
        try {
          const metaRes = await notionFetch(`https://api.notion.com/v1/pages/${mPagePatch[1]}`, {
            method: 'GET',
            headers: { Authorization: `Bearer ${token}`, 'Notion-Version': '2022-06-28' },
          });
          const meta = await metaRes.json();
          patchMeta = meta;
          const parentDb = norm(meta?.parent?.database_id);
          if (parentDb) {
            const perm = checkPermiso(u, { tipo: 'create', dbId: parentDb });
            if (!perm.ok) {
              console.warn(
                '[perms] DENEGARÍA',
                JSON.stringify({
                  rol: u?.rol,
                  id: session?.id,
                  tipo: 'page-patch',
                  db: parentDb,
                  endpoint: endpointNorm,
                  motivo: perm.motivo,
                })
              );
              if (ENFORCE_PERMS)
                return res.status(403).json({ error: 'forbidden: tu rol no puede editar esa base' });
            }
            // Nivel PÁGINA (Codex R2 #2, 2026-07-07) — el meta ya está descargado, los checks son gratis:
            // (a) PAÍS: un rol no-global no debería editar una página de otro país. Acompaña el flag
            //     monitor/enforce como el resto de la matriz.
            // (b) OWNERSHIP operario en Servicios: solo LOG por ahora (sin enforce ni con el flag) —
            //     ayudantes/jornadas pueden tener ediciones legítimas; se decide en la Fase 3 con los logs.
            const pProps = meta?.properties || {};
            const paisPagina = pProps['País']?.select?.name || '';
            // paisCoincide (no .includes crudo): reconoce nombre completo ("🇺🇾 Uruguay") Y código corto
            // ("🇺🇾 UY"). Antes solo el nombre → un coord editando Activos/Solicitudes/Documentos/Gastos/
            // Ingresos (código corto) daba 403 "otro país" siendo del MISMO país (bug del módulo Equipos).
            if (!esGlobal(u) && paisPagina && u?.pais && !paisCoincide(paisPagina, u.pais)) {
              console.warn(
                '[perms] DENEGARÍA',
                JSON.stringify({
                  rol: u?.rol,
                  id: session?.id,
                  tipo: 'page-patch-pais',
                  db: parentDb,
                  paisPagina,
                  paisUser: u.pais,
                })
              );
              if (ENFORCE_PERMS) return res.status(403).json({ error: 'forbidden: página de otro país' });
            }
            if ((u?.rol || '').includes('Operario') && parentDb === SERVICIOS_NORM) {
              const owner = pProps['Operario App']?.select?.name || '';
              if (owner && owner !== u.nombre) {
                console.warn(
                  '[perms] DENEGARÍA',
                  JSON.stringify({
                    rol: u?.rol,
                    id: session?.id,
                    tipo: 'page-patch-owner',
                    db: parentDb,
                    owner,
                  })
                );
              }
            }
            // Equipos v2 — backstop OPERARIO↔ACTIVOS (hallazgo del review 2026-07-14): el permiso amplio de la
            // matriz dejaría archivar/editar cualquier activo del país. Acá se ENFORCEA directo (capability
            // nueva, sin período monitor, mismo criterio que el backstop de Ventas): (1) solo body {properties};
            // (2) solo los campos del reporte semanal; (3) solo equipos donde ÉL es el Responsable App.
            if ((u?.rol || '').includes('Operario') && parentDb === ACTIVOS_NORM) {
              const topKeys = Object.keys(body || {});
              const propKeys = Object.keys(body?.properties || {});
              const soloReporte =
                topKeys.length === 1 &&
                topKeys[0] === 'properties' &&
                propKeys.length > 0 &&
                propKeys.every(k => ACTIVOS_OPERARIO_PROPS.includes(k));
              const respPagina = pProps['Responsable App']?.select?.name || '';
              if (!soloReporte || respPagina !== u.nombre) {
                console.warn(
                  '[perms] DENEGADO',
                  JSON.stringify({
                    rol: u?.rol,
                    id: session?.id,
                    tipo: 'activo-operario',
                    db: parentDb,
                    soloReporte,
                    respPagina,
                  })
                );
                return res.status(403).json({ error: 'forbidden: solo el reporte semanal de tus equipos' });
              }
            }
          }
        } catch (e) {
          if (ENFORCE_PERMS) return res.status(403).json({ error: 'forbidden: no verificable' });
        }
      }
    }

    let tipo = null,
      dbId = '';
    const mQuery = endpointNorm.match(/^databases\/([a-f0-9-]{32,36})\/query$/);
    const mSchema = endpointNorm.match(/^databases\/([a-f0-9-]{32,36})$/);
    if (mQuery) {
      tipo = 'query';
      dbId = mQuery[1];
    } else if (mSchema) {
      tipo = 'schema';
      dbId = mSchema[1];
    } else if (endpointNorm === 'pages' && httpMethod === 'POST') {
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
        console.warn(
          '[perms] DENEGARÍA',
          JSON.stringify({
            rol: u?.rol,
            id: session?.id,
            tipo,
            db: norm(dbId),
            endpoint: endpointNorm,
            motivo: perm.motivo,
          })
        );
        if (ENFORCE_PERMS) return res.status(403).json({ error: 'forbidden: tu rol no accede a esa base' });
      }
      // Equipos v2: el operario NO crea activos. DB.activos está en su matriz create SOLO para habilitar el
      // PATCH del reporte semanal — el create real por database_id pasaría (hallazgo del review) → se corta acá.
      if (tipo === 'create' && (u?.rol || '').includes('Operario') && norm(dbId) === ACTIVOS_NORM) {
        console.warn(
          '[perms] DENEGADO',
          JSON.stringify({ rol: u?.rol, id: session?.id, tipo: 'activo-operario-create', db: norm(dbId) })
        );
        return res.status(403).json({ error: 'forbidden: tu rol no crea equipos' });
      }
    }
  }

  // Fase 3a.2 — Supabase-first para las tablas flipeadas (SUPAFIRST): escribe en el espejo (merge atómico) +
  // encola la propagación a Notion, y responde SIN llamar a Notion. Solo RETORNA si TODO salió bien (merge +
  // enqueue); ante cualquier duda (fila no espejada, RPC/enqueue falla, error) NO retorna → cae al path
  // Notion-first de abajo (+ mirror 3a.1), que deja Notion y el espejo consistentes. INERTE con SUPAFIRST vacío.
  if (SUPAFIRST.size && httpMethod === 'PATCH' && patchMeta && body?.properties) {
    const mId = endpointNorm.match(/^pages\/([a-f0-9-]{32,36})$/);
    const resource = resourceFromPage(patchMeta);
    if (mId && resource && SUPAFIRST.has(resource)) {
      try {
        const mp = await mergeProps(resource, mId[1], body.properties);
        if (mp.ok && mp.found) {
          const eq = await enqueueOutbox(mId[1], resource, body.properties);
          if (eq.ok) {
            if (SUPAFIRST_VERBOSE) console.log('[supafirst] ok', { id: mId[1], resource });
            // Respuesta con forma de página (raw mergeado) para no romper los call sites que leen updated.properties.
            return res
              .status(200)
              .json({ object: 'page', id: mId[1], properties: mp.raw, _source: 'supabase-first' });
          }
          supafirstMiss = 'enqueue';
          console.warn('[supafirst] enqueue fail → Notion-first', {
            id: mId[1],
            resource,
            status: eq.status,
          });
        } else if (mp.ok && !mp.found) {
          supafirstMiss = 'notfound';
          console.warn('[supafirst] fila no espejada → Notion-first', { id: mId[1], resource });
        } else {
          supafirstMiss = 'fail';
          console.warn('[supafirst] merge fail → Notion-first', { id: mId[1], resource, status: mp.status });
        }
      } catch (e) {
        supafirstMiss = 'error';
        console.warn('[supafirst] error → Notion-first', {
          id: mId[1],
          resource,
          msg: String(e?.message || e).slice(0, 120),
        });
      }
    }
  }

  // Fase 3a.2 (fix review #2) — con tablas flipeadas, las LECTURAS por id también salen del espejo (la MISMA
  // fuente que lee la app): si el front hace un read-modify-write (ej. fotos: leer array actual + append), un
  // GET a Notion vería el estado ATRASADO (outbox sin drenar) y el PATCH resultante pisaría datos. Si la página
  // no está en ninguna tabla flipeada → cae a Notion como siempre. Corre DESPUÉS del backstop Ventas (403 primero).
  if (SUPAFIRST.size && httpMethod === 'GET') {
    const mIdGet = endpointNorm.match(/^pages\/([a-f0-9-]{32,36})$/);
    if (mIdGet) {
      try {
        const hit = await getMirrorRaw([...SUPAFIRST], mIdGet[1]);
        if (hit) {
          return res.status(200).json({
            object: 'page',
            id: mIdGet[1],
            parent: { type: 'database_id', database_id: DBS[hit.resource] || null },
            properties: hit.raw,
            _source: 'supabase',
          });
        }
      } catch (e) {
        /* cae a Notion */
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
    if (
      isQuery &&
      data.code === 'validation_error' &&
      data.additional_data?.error_type === 'multiple_data_sources_for_database'
    ) {
      const dbId = endpointNorm.split('/')[1];
      // Comparar ids sin guiones (robustez; alinea con searchByParent de api/_lib/notion.js,
      // que ya normalizaba — antes acá era === crudo y solo funcionaba por coincidencia).
      const norm = s => (s || '').replace(/-/g, '');
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
        if (allResults.length) break; // ok → salir
        if (fb < 2) await sleep(500 * (fb + 1)); // vacío (rate-limit) → reintentar
      }
      // Si quedó cursor pendiente al alcanzar el cap (allResults.length === 2000),
      // devolvemos has_more=true para que el cliente sepa que la lista está truncada.
      if (truncated) console.warn('[notion-proxy] fallback search reached 2000 cap for db', dbId);
      return res.status(200).json({ object: 'list', results: allResults, has_more: truncated });
    }

    // Diagnóstico: un WRITE (PATCH/POST pages) rechazado por Notion con 4xx queda logueado con su motivo —
    // sin esto, el usuario ve "API error 400" y en los logs solo el status (imposible diagnosticar).
    if (
      response.status >= 400 &&
      response.status < 500 &&
      (httpMethod === 'PATCH' || (httpMethod === 'POST' && endpointNorm === 'pages'))
    ) {
      console.warn(
        '[proxy] notion 4xx en write',
        JSON.stringify({
          endpoint: endpointNorm,
          method: httpMethod,
          status: response.status,
          code: data?.code,
          message: String(data?.message || '').slice(0, 300),
        })
      );
    }

    // Fases 3a.1/3a.2 — post-write en el espejo (best-effort, NO altera la respuesta ni el guardado en Notion).
    // Para tablas NO flipeadas (3a.1): upsert de la página completa devuelta. Para tablas FLIPEADAS (3a.2):
    // Notion puede estar ATRASADO (outbox sin drenar) → NUNCA página completa; solo el delta de este request
    // (fix review #1), y corre SIN depender de MIRROR_ON_WRITE (fix #4: el espejo de una tabla flipeada no es
    // opcional). Papelera/archivado (fix #3): se borra la fila del espejo (que no re-aparezca) y se cancela su
    // outbox pendiente.
    if (session && response.status >= 200 && response.status < 300 && data?.id) {
      const isWrite =
        (httpMethod === 'PATCH' && /^pages\/[a-f0-9-]{32,36}$/.test(endpointNorm)) ||
        (httpMethod === 'POST' && endpointNorm === 'pages');
      if (isWrite) {
        let tid;
        try {
          // TODO adentro del try (resourceFromPage incluido): un throw acá JAMÁS debe volver 502 al usuario.
          const resource = resourceFromPage(data);
          const flipped = !!(resource && SUPAFIRST.has(resource));
          if (resource && (flipped || MIRROR_ON_WRITE)) {
            const isTrash = body?.in_trash === true || body?.archived === true;
            let action;
            if (isTrash) {
              // Borrado/archivado de página: fuera del espejo + cancelar el outbox de esa página (si flipeada).
              action = deleteRowByNotionId(resource, data.id).then(async r => {
                if (flipped) {
                  try {
                    await cancelOutboxForPage(data.id);
                  } catch (_) {}
                }
                return r;
              });
            } else if (
              flipped &&
              httpMethod === 'PATCH' &&
              supafirstMiss !== 'notfound' &&
              body?.in_trash !== false &&
              body?.archived !== false
            ) {
              // Fallback de tabla flipeada: aplicar SOLO el delta (idempotente con el camino feliz).
              // El RESTORE (in_trash:false / archived:false) queda EXCLUIDO → cae al else (full upsert):
              // la fila fue borrada del espejo al trashear y solo el upsert completo puede resucitarla.
              action = body?.properties
                ? mergeProps(resource, data.id, body.properties).then(mp => ({
                    ok: !!(mp.ok && mp.found),
                    status: mp.status || 200,
                    reason: mp.ok && !mp.found ? 'notfound' : mp.reason,
                  }))
                : Promise.resolve({ ok: true, status: 0, reason: 'patch sin properties' });
            } else {
              // Página completa SEGURA: creates (página nueva, sin outbox posible), restore de papelera,
              // fila no espejada (el upsert la repone), o tabla no flipeada (3a.1 clásico).
              action = data?.properties
                ? mirrorPage(resource, data)
                : Promise.resolve({ ok: false, status: 0, reason: 'sin properties' });
            }
            const to = new Promise(r => {
              tid = setTimeout(() => r({ ok: false, status: 0, reason: 'timeout' }), MIRROR_TIMEOUT_MS);
            });
            const r = await Promise.race([action, to]);
            if (!r?.ok)
              console.warn('[mirror] fail', {
                id: data.id,
                resource,
                flipped,
                status: r?.status,
                reason: r?.reason,
              });
            else if (MIRROR_VERBOSE)
              console.log('[mirror] ok', { id: data.id, resource, flipped, status: r?.status });
          }
        } catch (e) {
          console.warn('[mirror] error', { id: data?.id, msg: String(e?.message || e).slice(0, 120) });
        } finally {
          if (tid) clearTimeout(tid);
        }
      }
    }

    return res.status(response.status).json(data);
  } catch (err) {
    const timedOut = err?.name === 'AbortError';
    return res.status(502).json({ error: timedOut ? 'Notion no respondió a tiempo' : 'Internal error' });
  }
}
