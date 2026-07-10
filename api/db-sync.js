// /api/db-sync — re-sincroniza UN registro Notion → Supabase (Fase 3, "sync tras guardar").
//
// La app sigue ESCRIBIENDO en Notion (la fuente de verdad). Justo después de un guardado exitoso,
// la app llama a este endpoint con { resource, notion_id } para reflejar ESE registro en la base nueva.
// - Trae la página de Notion (server-side, con NOTION_TOKEN) y la mapea con el MISMO mapeo del sync batch.
// - Upsert idempotente por notion_id (PostgREST on_conflict) → tocar dos veces NO duplica; no necesita
//   políticas RLS de escritura (usa service_role, que solo corre acá en el server).
// - Defensa en profundidad: exige sesión + un usuario NO global solo puede sincronizar registros de SU país
//   (espeja el aislamiento de /api/db). Respuesta mínima (status, sin datos del registro) → no es vía de lectura.
import { verifySession, tokenFromReq } from './_lib/session.js';
import { userById, esGlobal } from './_lib/users.js';
import { mapRow } from './_lib/notion-map.js';
import { upsertRow } from './_lib/mirror.js';
import { supafirstSet } from './_lib/supafirst.js';

const ALLOWED_ORIGINS = [
  'https://flyclean.app',
  'https://www.flyclean.app',
  'https://flyclean-app.vercel.app',
];
const ALLOWED_ORIGIN_REGEX = /^https:\/\/flyclean-app-[a-z0-9]+-fly-clean-app-s-projects\.vercel\.app$/;
function originAllowed(o) { return !!o && (ALLOWED_ORIGINS.includes(o) || ALLOWED_ORIGIN_REGEX.test(o)); }

// Allow-list: qué "resource" de la app mapea a qué tabla de Supabase (mismo set que /api/db).
const RESOURCES = {
  clientes: 'clientes', servicios: 'servicios', propuestas: 'propuestas',
  ingresos: 'ingresos', gastos: 'gastos',
};

const SUPABASE_URL  = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SERVICE_KEY   = process.env.SUPABASE_SERVICE_KEY || '';
const NOTION_TOKEN  = process.env.NOTION_TOKEN || '';
const NOTION_VERSION = '2022-06-28';

const isNotionId = (s) => /^[0-9a-f]{32}$|^[0-9a-f-]{36}$/i.test(String(s || ''));

export default async function handler(req, res) {
  const origin = req.headers.origin || '';
  res.setHeader('Access-Control-Allow-Origin', originAllowed(origin) ? origin : 'https://flyclean.app');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Vary', 'Origin');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (origin && !originAllowed(origin)) return res.status(403).json({ error: 'origin' });

  // Exige sesión (mismo token HMAC que el resto de la app).
  const session = verifySession(tokenFromReq(req));
  if (!session || !session.id) return res.status(401).json({ error: 'auth required' });
  const u = userById(session.id);
  if (!u) return res.status(403).json({ error: 'usuario desconocido' });

  const body = req.body || {};
  const resource = String(body.resource || '');
  const notionId = String(body.notion_id || '');
  const table = RESOURCES[resource];
  if (!table) return res.status(400).json({ error: 'resource inválido' });
  if (!isNotionId(notionId)) return res.status(400).json({ error: 'notion_id inválido' });

  // Fase 3a.2 (defensa en profundidad): una tabla Supabase-first NUNCA se re-sincroniza desde Notion (está
  // atrasado; pisaría el espejo autoritativo). Aun si el flag client-side `writesync` quedara prendido por
  // error, este no-op server-side lo hace inofensivo. Con SUPAFIRST_TABLES vacío no cambia nada.
  if (supafirstSet().has(table)) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ ok: true, resource, skipped: 'supafirst' });
  }

  if (!SUPABASE_URL || !SERVICE_KEY || !NOTION_TOKEN) return res.status(500).json({ error: 'no configurado' });

  try {
    // 1) Traer la página de Notion (fuente de verdad).
    const nr = await fetch(`https://api.notion.com/v1/pages/${notionId}`, {
      headers: { Authorization: 'Bearer ' + NOTION_TOKEN, 'Notion-Version': NOTION_VERSION },
    });
    if (!nr.ok) {
      const j = await nr.json().catch(() => ({}));
      console.error('[db-sync] notion fetch', { notion_id: notionId, resource, status: nr.status, code: j.code });
      return res.status(502).json({ error: 'notion fetch', detail: String(j.code || nr.status).slice(0, 60) });
    }
    const page = await nr.json();

    // 2) Mapear con el mismo mapeo del sync batch (lossless: guarda `raw`).
    const row = mapRow(resource, page);
    if (!row) return res.status(400).json({ error: 'sin mapeo' });

    // 2b) Defensa en profundidad: un usuario NO global solo puede sincronizar registros de SU país
    //     (espeja el aislamiento de /api/db). UY incluye filas sin país. El espejo nunca filtra solo;
    //     este gate evita que alguien fuerce el re-sync de un registro de otro país.
    if (!esGlobal(u)) {
      const rp = row.pais || null;
      const okPais = u.pais === 'Uruguay' ? (rp === 'Uruguay' || rp === null) : (rp === u.pais);
      if (!okPais) {
        console.error('[db-sync] país mismatch', { notion_id: notionId, resource, userPais: u.pais, rowPais: rp });
        return res.status(403).json({ error: 'país' });
      }
    }

    // 3) Upsert idempotente por notion_id (no duplica; mirror queda 1:1 con Notion). Reusa mirror.js.
    const { ok, status, detail } = await upsertRow(table, row);
    if (!ok) {
      console.error('[db-sync] supabase upsert', { notion_id: notionId, resource, status, detail });
      return res.status(502).json({ error: 'supabase upsert', detail: String(detail || status).slice(0, 120) });
    }
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ ok: true, resource }); // respuesta mínima (no devuelve datos del registro)
  } catch (e) {
    console.error('[db-sync] error', { notion_id: notionId, resource, msg: String(e.message || e).slice(0, 160) });
    return res.status(502).json({ error: 'sync failed', detail: String(e.message || e).slice(0, 120) });
  }
}
