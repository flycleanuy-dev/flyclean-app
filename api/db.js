// /api/db — lee de la base NUEVA (Supabase) devolviendo el MISMO formato que Notion. Fase 2 (piloto: Clientes).
//
// La app sigue ESCRIBIENDO en Notion; este endpoint es SOLO LECTURA. Aísla por país a nivel servidor/base:
//  - Si hay SUPABASE_JWT_SECRET → mintea un JWT del usuario (claims pais/rol) y deja que la RLS de Supabase filtre.
//  - Si no (o usuario global) → service_role + filtro por país server-side (espejo de recEnPaisNotion).
// Devuelve { results: [{ object:'page', id:notion_id, properties:raw }] } → idéntico a la respuesta de Notion,
// gracias a que el sync guardó `raw` = las properties tal cual de Notion. Así el render de la app NO cambia.
import { verifySession, tokenFromReq, maybeRenewSession } from './_lib/session.js';
import { userById, resolveUser, esGlobal, esVentas } from './_lib/users.js';
import { checkPermiso, DB } from './_lib/permisos.js';
import crypto from 'node:crypto';

const ALLOWED_ORIGINS = [
  'https://flyclean.app',
  'https://www.flyclean.app',
  'https://flyclean-app.vercel.app',
];
const ALLOWED_ORIGIN_REGEX = /^https:\/\/flyclean-app-[a-z0-9]+-fly-clean-app-s-projects\.vercel\.app$/;
function originAllowed(o) { return !!o && (ALLOWED_ORIGINS.includes(o) || ALLOWED_ORIGIN_REGEX.test(o)); }

// Allow-list: qué "resource" de la app mapea a qué tabla de Supabase.
const RESOURCES = {
  clientes: 'clientes', servicios: 'servicios', propuestas: 'propuestas',
  ingresos: 'ingresos', gastos: 'gastos',
};

const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_KEY || '';
const ANON_KEY     = process.env.SUPABASE_ANON_KEY || '';
const JWT_SECRET   = process.env.SUPABASE_JWT_SECRET || '';

function b64url(buf) { return Buffer.from(buf).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_'); }
function mintUserJWT(u, id) {
  const now = Math.floor(Date.now() / 1000);
  const header  = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = b64url(JSON.stringify({ role: 'authenticated', aud: 'authenticated', sub: id, iat: now, exp: now + 300, pais: u.pais, rol: u.rol, nombre: u.nombre }));
  const sig = b64url(crypto.createHmac('sha256', JWT_SECRET).update(header + '.' + payload).digest());
  return header + '.' + payload + '.' + sig;
}

// Filtro PostgREST por país (espejo de recEnPaisNotion: UY incluye filas sin país).
function paisQuery(u) {
  if (esGlobal(u)) return '';
  if (u.pais === 'Uruguay') return '&or=(pais.eq.Uruguay,pais.is.null)';
  return '&pais=eq.' + encodeURIComponent(u.pais);
}

// Predicado de operario de la RLS de servicios (db/policies.sql: `operario_app = app_nombre()`): un operario
// solo ve los servicios donde figura como 'Operario App'. Los caminos service_role (fallback/global) NO
// aplican la RLS → sin esto un operario que cae al fallback recibiría el `raw` de TODOS los servicios de su
// país (la UI re-filtra, pero el JSON viaja — hallazgo Codex #3, 2026-07-07). Replica la RLS para que el
// fallback sea consistente con el camino jwt-rls. Solo aplica a servicios + rol Operario.
function operarioFilterServicios(u, resource) {
  if (resource !== 'servicios' || !(u.rol || '').includes('Operario')) return '';
  return '&operario_app=eq.' + encodeURIComponent(u.nombre);
}

// PostgREST cappea las respuestas sin Range explícito (típicamente 1000 filas) → truncado silencioso
// a medida que las tablas crecen. Pagina de a 1000 con Range/Range-Unit hasta que una página vuelve
// corta, concatenando. Misma URL y headers en cada página; solo cambia el Range.
async function fetchPaged(url, headers) {
  const PAGE = 1000;
  let rows = [], offset = 0;
  for (;;) {
    const r = await fetch(url, {
      headers: { ...headers, 'Range-Unit': 'items', Range: `${offset}-${offset + PAGE - 1}` },
    });
    if (!r.ok) throw new Error('supabase ' + r.status);
    const page = await r.json();
    rows.push(...page);
    if (page.length < PAGE) break;
    offset += PAGE;
  }
  return rows;
}

export default async function handler(req, res) {
  const origin = req.headers.origin || '';
  res.setHeader('Access-Control-Allow-Origin', originAllowed(origin) ? origin : 'https://flyclean.app');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Vary', 'Origin');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  // El navegador NO manda Origin en un GET del mismo origen → solo bloqueamos orígenes presentes y no permitidos.
  // Igual exige sesión (Bearer) y el navegador bloquea lecturas cross-origin por CORS.
  if (origin && !originAllowed(origin)) return res.status(403).json({ error: 'origin' });

  // Exige sesión (mismo token HMAC que el resto de la app).
  const session = verifySession(tokenFromReq(req));
  if (!session || !session.id) return res.status(401).json({ error: 'auth required' });
  maybeRenewSession(res, session); // renovación silenciosa (token 7d sliding)
  const u = await resolveUser(session.id); // DB-backed con rescate + fallback duro (Fase 3.0)
  if (!u) return res.status(403).json({ error: 'usuario desconocido' });

  const resource = String((req.query && req.query.resource) || '');
  const table = RESOURCES[resource];
  if (!table) return res.status(400).json({ error: 'resource inválido' });

  // Backstop server-side del rol Ventas (LECTURA): Clientes/Contactos + Propuestas (v127) +
  // Servicios (2026-07-06, solo-lectura para el cruce de "clientes para recontactar"/mantenimiento —
  // NO ve la operativa ni edita; los servicios no tienen plata). Sigue cerrado: ingresos/gastos.
  // (ver docs/superpowers/specs/2026-07-03-backstop-ventas-serverside-design.md)
  if (esVentas(u) && !['clientes', 'propuestas', 'servicios'].includes(resource)) return res.status(403).json({ error: 'forbidden: rol Ventas solo clientes, propuestas y servicios (lectura)' });

  // Matriz de permisos por rol — la MISMA de /api/notion (api/_lib/permisos.js), acá en ENFORCE directo
  // (2026-07-07, hallazgo Codex R2 #1: /api/db servía ingresos/gastos a cualquier autenticado y la RLS
  // solo filtra país). Es seguro enforcear sin período monitor: la matriz está calibrada al inventario
  // real de pantallas y /api/db sirve exactamente esas pantallas — y los resources SIN flujo legítimo por
  // acá (ingresos/gastos: DB_FLAGS del front no los incluye) son justamente la fuga financiera a cerrar.
  // Ventas no pasa por acá (su backstop corta primero). Rollback: comentar este bloque.
  const RESOURCE_DB = { clientes: DB.contactos, servicios: DB.serviciosDb, propuestas: DB.propuestas, ingresos: DB.ingresosDb, gastos: DB.gastosDb };
  if (!esVentas(u)) {
    const perm = checkPermiso(u, { tipo: 'query', dbId: RESOURCE_DB[resource] });
    if (!perm.ok) {
      console.warn('[perms] DENEGADO /api/db', JSON.stringify({ rol: u?.rol, id: session.id, resource, motivo: perm.motivo }));
      return res.status(403).json({ error: 'forbidden: tu rol no accede a esa base' });
    }
  }

  if (!SUPABASE_URL || !SERVICE_KEY) return res.status(500).json({ error: 'db no configurada' });

  try {
    let rows, authPath;
    if (JWT_SECRET && ANON_KEY && !esGlobal(u)) {
      // Camino RLS pura: la base filtra por país según los claims del JWT.
      // Si el JWT no verifica (secreto mal cargado, proyecto con signing keys nuevas, etc.),
      // NO matamos la lectura del espejo: caemos al camino service (filtro país server-side,
      // el único camino que existió hasta hoy) y lo marcamos en _auth para diagnóstico.
      try {
        authPath = 'jwt-rls';
        const jwt = mintUserJWT(u, session.id);
        rows = await fetchPaged(`${SUPABASE_URL}/rest/v1/${table}?select=notion_id,raw`, {
          apikey: ANON_KEY, Authorization: 'Bearer ' + jwt,
        });
      } catch (e) {
        console.error('[db] jwt-rls falló (' + String(e.message || e).slice(0, 60) + ') → service fallback');
        authPath = 'service-fallback';
        rows = await fetchPaged(`${SUPABASE_URL}/rest/v1/${table}?select=notion_id,raw${paisQuery(u)}${operarioFilterServicios(u, resource)}`, {
          apikey: SERVICE_KEY, Authorization: 'Bearer ' + SERVICE_KEY,
        });
      }
    } else {
      // Usuario global (o sin JWT config): service_role + filtro país + (si operario) filtro por operario.
      authPath = 'service';
      rows = await fetchPaged(`${SUPABASE_URL}/rest/v1/${table}?select=notion_id,raw${paisQuery(u)}${operarioFilterServicios(u, resource)}`, {
        apikey: SERVICE_KEY, Authorization: 'Bearer ' + SERVICE_KEY,
      });
    }
    // Formato Notion → el render de la app no cambia. _auth = diagnóstico de qué camino se tomó
    // (jwt-rls = la base filtra por claims; service = filtro server-side) — no expone datos.
    const results = (rows || []).map(x => ({ object: 'page', id: x.notion_id, properties: x.raw || {} }));
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ object: 'list', results, _source: 'supabase', _auth: authPath });
  } catch (e) {
    return res.status(502).json({ error: 'db read failed', detail: String(e.message || e).slice(0, 120) });
  }
}
