// Fase 3b — fix MEDIUM-2 (review activación servicios): el proxy resuelve los ids de RELACIÓN locales del
// body de un create ANTES del POST. (a) relación PENDIENTE (padre local sin propagar) → fuerza el fallback
// (no manda a Notion un uuid crudo → no 400 → no pérdida). (b) relación RESUELTA → sustituye por el notion_id
// real y va a Notion normal. Notion está ARRIBA en este test (sin FAKE_DOWN) — se prueba la resolución, no la caída.
import test from 'node:test';
import assert from 'node:assert';

process.env.CRON_SECRET = 'test-secret';
process.env.NOTION_TOKEN = 'secret_test';
process.env.SUPABASE_URL = 'https://sb.test';
process.env.SUPABASE_SERVICE_KEY = 'sk-test';
process.env.SUPAFIRST_TABLES = 'servicios,clientes,propuestas,ingresos';
process.env.MIRROR_META_FIRST = '1';
process.env.CREATE_FALLBACK_TABLES = 'servicios';
delete process.env.NOTION_FAKE_DOWN;
process.env.ENFORCE_PERMS = '1';
delete process.env.USERS_FROM_DB;

const SERVICIOS_DS = '2fbc8a03-5c4f-445c-8516-71dd9b2eea78';
const LOCAL_PENDING = '11111111-1111-1111-1111-111111111111';
const LOCAL_RESOLVED = '22222222-2222-2222-2222-222222222222';
const REAL_PARENT = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

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
const jr = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json' } });

function mkReq(ordenMadreId) {
  const tok = signSession({ id: 'diego-laxalt' });
  return {
    method: 'POST',
    headers: { origin: 'https://flyclean.app', authorization: `Bearer ${tok}` },
    body: {
      endpoint: 'pages', method: 'POST',
      body: {
        parent: { data_source_id: SERVICIOS_DS },
        properties: {
          'Nombre del servicio': { title: [{ text: { content: 'Jornada 2' } }] },
          'Orden madre': { relation: [{ id: ordenMadreId }] },
        },
      },
    },
  };
}

test('MEDIUM-2 (a): create con Orden madre LOCAL PENDIENTE → fuerza fallback, NO va a Notion', async () => {
  const calls = { notionPost: 0, enqueue: 0 };
  global.fetch = async (url, opts = {}) => {
    const u = String(url);
    if (u.includes('api.notion.com') && (opts.method || 'GET') === 'POST') { calls.notionPost++; return jr({ id: 'should-not-happen' }); }
    if (u.includes('sb.test')) {
      if (u.includes('/id_map?local_id=in.')) return jr([{ local_id: LOCAL_PENDING, notion_id: null }]); // pendiente
      if (u.includes('/outbox_notion?op=eq.create')) return jr([]); // no envenenado
      if (u.includes('/rpc/enqueue_create')) { calls.enqueue++; return jr({ ok: true }); }
      if (u.includes('/servicios?on_conflict')) return jr({}, 201);
      return jr([]);
    }
    throw new Error('fetch inesperado: ' + u);
  };
  const res = fakeRes();
  await handler(mkReq(LOCAL_PENDING), res);
  assert.equal(res.statusCode, 200, JSON.stringify(res.body));
  assert.equal(res.body?._source, 'supabase-first-create', 'debe ser alta local (fallback forzado)');
  assert.equal(calls.notionPost, 0, 'NO debe mandar el create a Notion con el uuid pendiente');
  assert.ok(calls.enqueue >= 1, 'encoló la alta local');
});

test('MEDIUM-2 (b): create con Orden madre LOCAL RESUELTO → sustituye por el real y va a Notion', async () => {
  let bodyEnviadoANotion = null;
  global.fetch = async (url, opts = {}) => {
    const u = String(url);
    if (u.includes('api.notion.com') && (opts.method || 'GET') === 'POST') { bodyEnviadoANotion = JSON.parse(opts.body); return jr({ id: 'nuevo-real', properties: {} }); }
    if (u.includes('sb.test')) {
      if (u.includes('/id_map?local_id=in.')) return jr([{ local_id: LOCAL_RESOLVED, notion_id: REAL_PARENT }]); // resuelto
      if (u.includes('/rpc/merge_props')) return jr({ raw: {} });
      return jr([]);
    }
    throw new Error('fetch inesperado: ' + u);
  };
  const res = fakeRes();
  await handler(mkReq(LOCAL_RESOLVED), res);
  const omId = bodyEnviadoANotion?.properties?.['Orden madre']?.relation?.[0]?.id;
  assert.equal(omId, REAL_PARENT, 'Orden madre debe ir a Notion con el notion_id REAL, no el uuid local');
  assert.notEqual(res.body?._source, 'supabase-first-create', 'no debe caer al fallback (Notion arriba + relación resuelta)');
});
