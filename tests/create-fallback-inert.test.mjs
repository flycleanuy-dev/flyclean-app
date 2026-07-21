// Fase 3b — GATE DE DEPLOY: con CREATE_FALLBACK_TABLES VACÍO (config de producción hoy), el productor de
// create-fallback debe ser INERTE — un POST create con Notion caído devuelve el ERROR (comportamiento viejo),
// NUNCA la página sintética, y NO escribe NADA en Supabase (id_map/outbox/espejo). Verifica que el bloque
// nuevo no cambia el path activo.
import test from 'node:test';
import assert from 'node:assert';

process.env.CRON_SECRET = 'test-secret';
process.env.NOTION_TOKEN = 'secret_test';
process.env.SUPABASE_URL = 'https://sb.test';
process.env.SUPABASE_SERVICE_KEY = 'sk-test';
process.env.SUPAFIRST_TABLES = 'servicios,clientes,propuestas,ingresos';
process.env.MIRROR_META_FIRST = '1';
delete process.env.CREATE_FALLBACK_TABLES; // ← VACÍO: la config de producción actual
process.env.NOTION_FAKE_DOWN = '1';
process.env.ENFORCE_PERMS = '1';
delete process.env.USERS_FROM_DB;

const CLIENTES_DB = '250115612de74e0582366549bbe5e389';
const calls = { supabaseCreateWrite: 0, idMapLookup: 0 };

global.fetch = async (url) => {
  const u = String(url);
  const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json' } });
  if (u.includes('api.notion.com')) return json({ object: 'error', status: 503 }, 503);
  if (u.includes('sb.test')) {
    if (u.includes('/rpc/enqueue_create') || /\/rest\/v1\/clientes\?on_conflict/.test(u)) calls.supabaseCreateWrite++;
    if (u.includes('/id_map')) calls.idMapLookup++;
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

test('INERTE: POST create con Notion caído y flag vacío → error (no fallback), 0 escrituras Supabase', async () => {
  const tok = signSession({ id: 'diego-laxalt' });
  const req = {
    method: 'POST',
    headers: { origin: 'https://flyclean.app', authorization: `Bearer ${tok}` },
    body: { endpoint: 'pages', method: 'POST', body: { parent: { database_id: CLIENTES_DB }, properties: { 'Nombre / Empresa': { title: [{ text: { content: 'X' } }] } } } },
  };
  const res = fakeRes();
  await handler(req, res);
  assert.notEqual(res.body?._source, 'supabase-first-create', 'NO debe caer al fallback');
  assert.equal(res.statusCode, 503, 'pasa el 503 de Notion tal cual (comportamiento viejo)');
  assert.equal(calls.supabaseCreateWrite, 0, 'no escribió id_map/outbox/espejo');
});

test('INERTE: PATCH pages/{id} con flag vacío → NO consulta id_map (cero overhead)', async () => {
  calls.idMapLookup = 0;
  const tok = signSession({ id: 'diego-laxalt' });
  const req = {
    method: 'POST',
    headers: { origin: 'https://flyclean.app', authorization: `Bearer ${tok}` },
    body: { endpoint: 'pages/389b7736-ccbe-816c-b1ee-dfad7a02dacf', method: 'PATCH', body: { properties: { Estado: { select: { name: 'x' } } } } },
  };
  const res = fakeRes();
  await handler(req, res);
  assert.equal(calls.idMapLookup, 0, 'la traducción id local→real NO corre con el flag vacío');
});
