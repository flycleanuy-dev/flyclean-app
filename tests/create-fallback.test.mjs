// Fase 3b — PRODUCTOR de create-fallback (api/notion.js). Con Notion caído (NOTION_FAKE_DOWN) y la tabla en
// CREATE_FALLBACK_TABLES, un POST pages debe: (a) inyectar App UID, (b) registrar la alta local (fila espejo
// + RPC enqueue_create), (c) responder 200 con la página sintética _source:supabase-first-create.
// Y verifica la TRADUCCIÓN: un PATCH pages/{uuid-local-resuelto} se reescribe al notion_id real.
import test from 'node:test';
import assert from 'node:assert';

process.env.CRON_SECRET = 'test-secret';
process.env.NOTION_TOKEN = 'secret_test';
process.env.SUPABASE_URL = 'https://sb.test';
process.env.SUPABASE_SERVICE_KEY = 'sk-test';
process.env.SUPAFIRST_TABLES = 'servicios,clientes,propuestas,ingresos';
process.env.MIRROR_META_FIRST = '1';
process.env.CREATE_FALLBACK_TABLES = 'clientes';
process.env.NOTION_FAKE_DOWN = '1';
process.env.ENFORCE_PERMS = '1';
delete process.env.USERS_FROM_DB;

const CLIENTES_DB = '250115612de74e0582366549bbe5e389';
const calls = { notionCreate: 0, espejoUpsert: 0, enqueueCreate: 0, mergeProps: 0 };
let enqueuedPayload = null, espejoRow = null;

global.fetch = async (url, opts = {}) => {
  const u = String(url);
  const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json' } });
  if (u.includes('api.notion.com')) { calls.notionCreate++; return json({ object: 'error', status: 503 }, 503); }
  if (u.includes('sb.test')) {
    if (u.includes('/rpc/enqueue_create')) { calls.enqueueCreate++; enqueuedPayload = JSON.parse(opts.body); return json({ ok: true }); }
    if (u.includes('/rpc/merge_props')) { calls.mergeProps++; return json({ some: 'raw' }); }
    if (/\/rest\/v1\/clientes\?on_conflict/.test(u)) { calls.espejoUpsert++; espejoRow = JSON.parse(opts.body)[0]; return json(null, 201); }
    if (u.includes('/id_map?local_id=eq.')) return json([]); // no resuelto (para el test de create)
    if (u.includes('/clientes?notion_id=eq.')) return json([]); // meta espejo miss
    return json([]);
  }
  throw new Error('fetch inesperado: ' + u);
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

test('create-fallback: POST clientes con Notion caído → 200 sintético + alta local registrada', async () => {
  const tok = signSession({ id: 'diego-laxalt' });
  const req = {
    method: 'POST',
    headers: { origin: 'https://flyclean.app', authorization: `Bearer ${tok}` },
    body: {
      endpoint: 'pages',
      method: 'POST',
      body: { parent: { database_id: CLIENTES_DB }, properties: { 'Nombre / Empresa': { title: [{ text: { content: 'Cliente Fallback' } }] } } },
    },
  };
  const res = fakeRes();
  await handler(req, res);
  assert.equal(res.statusCode, 200, 'respuesta: ' + JSON.stringify(res.body));
  assert.equal(res.body?._source, 'supabase-first-create');
  assert.ok(/^[0-9a-f-]{36}$/.test(res.body?.id), 'el id es un uuid local');
  assert.ok(calls.espejoUpsert >= 1, 'escribió la fila del espejo');
  assert.ok(calls.enqueueCreate >= 1, 'registró id_map+outbox (RPC enqueue_create)');
  // el payload del outbox lleva App UID inyectado + reason
  const props = enqueuedPayload?.p_payload?.properties || {};
  assert.ok(props['App UID']?.rich_text?.[0]?.text?.content === res.body.id, 'App UID inyectado == uuid');
  assert.equal(enqueuedPayload?.p_payload?.reason, 'timeout');
  assert.equal(enqueuedPayload?.p_resource, 'clientes');
  // la fila del espejo tiene notion_id = uuid y el título normalizado (plain_text)
  assert.equal(espejoRow?.notion_id, res.body.id);
});

test('traducción: PATCH pages/{uuid resuelto} se reescribe al notion_id real', async () => {
  const REAL = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
  const LOCAL = '11111111-2222-3333-4444-555555555555';
  let mergedId = null;
  global.fetch = async (url, opts = {}) => {
    const u = String(url);
    const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json' } });
    if (u.includes('api.notion.com')) return json({ object: 'error', status: 503 }, 503);
    if (u.includes('sb.test')) {
      if (u.includes('/id_map?local_id=eq.' + LOCAL)) return json([{ notion_id: REAL }]); // resuelto → real
      if (u.includes('/rpc/merge_props')) { mergedId = JSON.parse(opts.body).p_notion_id; return json({ raw: 'x' }); }
      if (u.includes('/outbox_notion')) return json(null, 201);
      if (u.includes('/clientes?notion_id=eq.' + REAL)) return json([{ raw: { 'País': { select: { name: '🇺🇾 Uruguay' } } } }]);
      return json([]);
    }
    throw new Error('fetch inesperado: ' + u);
  };
  const tok = signSession({ id: 'diego-laxalt' });
  const req = {
    method: 'POST',
    headers: { origin: 'https://flyclean.app', authorization: `Bearer ${tok}` },
    body: { endpoint: 'pages/' + LOCAL, method: 'PATCH', body: { properties: { Estado: { select: { name: '🟢 Activo' } } } } },
  };
  const res = fakeRes();
  await handler(req, res);
  // el merge_props (Supabase-first) debe operar sobre el REAL, no sobre el uuid local
  assert.equal(mergedId, REAL, 'merge_props usó el notion_id real');
});
