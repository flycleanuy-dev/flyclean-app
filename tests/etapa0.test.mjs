// Etapa 0 (cierre migración) — meta ESPEJO-FIRST: el PATCH de una tabla flipeada sobrevive a Notion caído.
// Test IN-PROCESS del handler real de api/notion.js con el fetch global mockeado:
//   · Supabase (espejo) responde la fila, el merge y el outbox
//   · Notion está "caído" (NOTION_FAKE_DOWN=1 → notionFetch responde 503 sintético sin salir a la red)
// T1: MIRROR_META_FIRST=1 → el PATCH responde 200 _source:supabase-first (la edición sobrevive)
// T2: getMirrorMeta con el espejo TAMBIÉN caído → null sin throw (el espejo nunca empeora el camino)
import test from 'node:test';
import assert from 'node:assert';

const PAGE = '389b7736-ccbe-816c-b1ee-dfad7a02dacf'; // forma real (dashed) — igual que los ids que manda el front

// Env ANTES de importar los módulos (leen los flags al cargar)
process.env.CRON_SECRET = 'test-secret';
process.env.NOTION_TOKEN = 'secret_test';
process.env.SUPABASE_URL = 'https://sb.test';
process.env.SUPABASE_SERVICE_KEY = 'sk-test';
process.env.SUPAFIRST_TABLES = 'servicios,clientes,propuestas,ingresos';
process.env.MIRROR_META_FIRST = '1';
process.env.NOTION_FAKE_DOWN = '1';
process.env.ENFORCE_PERMS = '1';
delete process.env.USERS_FROM_DB;

const calls = { notion: 0, merge: 0, outbox: 0 };
const RAW = {
  'Nombre del servicio': { title: [{ plain_text: 'Test Etapa 0' }] },
  País: { select: { name: '🇺🇾 Uruguay' } },
};

global.fetch = async (url) => {
  const u = String(url);
  const json = (o, status = 200) =>
    new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json' } });
  if (u.includes('api.notion.com')) {
    calls.notion++; // NO debería pasar: NOTION_FAKE_DOWN corta antes; si algún camino esquiva notionFetch, acá se ve
    return json({ object: 'error', status: 503 }, 503);
  }
  if (u.includes('sb.test')) {
    if (u.includes('/rpc/merge_props')) { calls.merge++; return json({ ...RAW }); }
    if (u.includes('/outbox_notion')) { calls.outbox++; return json([], 201); }
    if (u.includes('/servicios?notion_id=eq.' + PAGE)) return json([{ raw: RAW }]);
    return json([]); // otras tablas: miss
  }
  throw new Error('fetch inesperado en el test: ' + u);
};

const { signSession } = await import('../api/_lib/session.js');
const { default: handler } = await import('../api/notion.js');

function fakeRes() {
  const r = { statusCode: 200, headers: {}, body: null };
  r.setHeader = (k, v) => { r.headers[k] = v; };
  r.status = c => { r.statusCode = c; return r; };
  r.json = o => { r.body = o; return r; };
  r.end = () => r;
  return r;
}

test('Etapa 0: PATCH de tabla flipeada con Notion caído → 200 supabase-first (meta del espejo)', async () => {
  const tok = signSession({ id: 'diego-laxalt' });
  const req = {
    method: 'POST',
    headers: { origin: 'https://flyclean.app', authorization: `Bearer ${tok}` },
    body: {
      endpoint: `pages/${PAGE}`,
      method: 'PATCH',
      body: { properties: { 'Notas pre-servicio': { rich_text: [{ text: { content: 'nota drill' } }] } } },
    },
  };
  const res = fakeRes();
  await handler(req, res);
  assert.equal(res.statusCode, 200, 'respuesta: ' + JSON.stringify(res.body));
  assert.equal(res.body?._source, 'supabase-first');
  assert.ok(calls.merge >= 1, 'merge_props fue llamado');
  assert.ok(calls.outbox >= 1, 'la propagación quedó encolada en el outbox');
  assert.equal(calls.notion, 0, 'ningún request salió hacia Notion');
});

test('getMirrorMeta: espejo caído → null sin throw (nunca empeora el camino)', async () => {
  const { getMirrorMeta } = await import('../api/_lib/supafirst.js');
  const orig = global.fetch;
  global.fetch = async () => { throw new Error('supabase down'); };
  try {
    const out = await getMirrorMeta(['servicios'], PAGE);
    assert.equal(out, null);
  } finally {
    global.fetch = orig;
  }
});
