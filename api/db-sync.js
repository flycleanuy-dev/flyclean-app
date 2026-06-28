// /api/db-sync — re-sincroniza UN registro Notion → Supabase (Fase 3, "sync tras guardar").
//
// La app sigue ESCRIBIENDO en Notion (la fuente de verdad). Justo después de un guardado exitoso,
// la app llama a este endpoint con { resource, notion_id } para reflejar ESE registro en la base nueva.
// - Trae la página de Notion (server-side, con NOTION_TOKEN) y la mapea con el MISMO mapeo del sync batch.
// - Upsert idempotente por notion_id (PostgREST on_conflict) → tocar dos veces NO duplica; no necesita
//   políticas RLS de escritura (usa service_role, que solo corre acá en el server).
// Respuesta mínima (status, sin devolver datos) → no es una vía de lectura.
import { verifySession, tokenFromReq } from './_lib/session.js';
import { userById } from './_lib/users.js';
import { mapRow } from './_lib/notion-map.js';

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

  if (!SUPABASE_URL || !SERVICE_KEY || !NOTION_TOKEN) return res.status(500).json({ error: 'no configurado' });

  try {
    // 1) Traer la página de Notion (fuente de verdad).
    const nr = await fetch(`https://api.notion.com/v1/pages/${notionId}`, {
      headers: { Authorization: 'Bearer ' + NOTION_TOKEN, 'Notion-Version': NOTION_VERSION },
    });
    if (!nr.ok) {
      const j = await nr.json().catch(() => ({}));
      return res.status(502).json({ error: 'notion fetch', detail: String(j.code || nr.status).slice(0, 60) });
    }
    const page = await nr.json();

    // 2) Mapear con el mismo mapeo del sync batch (lossless: guarda `raw`).
    const row = mapRow(resource, page);
    if (!row) return res.status(400).json({ error: 'sin mapeo' });

    // 3) Upsert idempotente por notion_id (no duplica; mirror queda 1:1 con Notion).
    const ur = await fetch(`${SUPABASE_URL}/rest/v1/${table}?on_conflict=notion_id`, {
      method: 'POST',
      headers: {
        apikey: SERVICE_KEY, Authorization: 'Bearer ' + SERVICE_KEY,
        'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify([row]),
    });
    if (!ur.ok) {
      const t = await ur.text().catch(() => '');
      return res.status(502).json({ error: 'supabase upsert', detail: String(t).slice(0, 120) });
    }
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ ok: true, resource, archived: !!page.archived });
  } catch (e) {
    return res.status(502).json({ error: 'sync failed', detail: String(e.message || e).slice(0, 120) });
  }
}
