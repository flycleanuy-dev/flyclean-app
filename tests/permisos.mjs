// Tests de la matriz de permisos por rol del proxy /api/notion — SOLO LECTURA (queries, no muta nada).
// Corre contra producción por defecto (patrón de tests/smoke.mjs); otro entorno: SMOKE_URL=... node tests/permisos.mjs
//
// Firma tokens de sesión LOCALMENTE replicando api/_lib/session.js: la clave se deriva de
// CRON_SECRET (o NOTION_TOKEN como fallback) leído de .env.local — NUNCA se imprime el secreto.
// Si .env.local no existe o no tiene el secreto, el test se SALTEA (exit 0) con aviso: sin la
// clave real de prod no se pueden firmar tokens válidos.
//
// Estado actual: ENFORCE_AUTH = true (sin token → 401), backstop Ventas = enforce (403),
// matriz por rol = MONITOR (loguea DENEGARÍA server-side pero responde 200).
// Cuando se prenda ENFORCE_PERMS en api/notion.js → flipear EXPECT_ENFORCE a true acá.
const EXPECT_ENFORCE = false;

import assert from 'node:assert';
import crypto from 'node:crypto';
import { readFileSync } from 'node:fs';

const BASE = (process.env.SMOKE_URL || 'https://www.flyclean.app').replace(/\/$/, '');

// ── Secreto de firma desde .env.local (sin imprimirlo jamás) ─────────────────────────────
function loadEnvLocal() {
  let raw = '';
  try { raw = readFileSync(new URL('../.env.local', import.meta.url), 'utf8'); } catch { return {}; }
  const env = {};
  for (const line of raw.split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return env;
}
const env = loadEnvLocal();
// Prioridad: env del proceso (CI / correr con el secreto real sin tocar .env.local) → .env.local.
// OJO: .env.local local puede no tener CRON_SECRET (solo NOTION_TOKEN) → los tokens firmados con el
// fallback NO valen contra prod (allá firma CRON_SECRET). En ese caso correr:
//   CRON_SECRET=... node tests/permisos.mjs   (sin imprimir el valor)
const SECRET = process.env.CRON_SECRET || process.env.NOTION_TOKEN || env.CRON_SECRET || env.NOTION_TOKEN || '';
if (!SECRET) {
  console.log('\nFlyClean — tests de permisos: SKIP (falta CRON_SECRET/NOTION_TOKEN en el entorno o .env.local para firmar tokens)\n');
  process.exit(0);
}

// ── Réplica de signSession (api/_lib/session.js) ─────────────────────────────────────────
const TTL_MS = 7 * 24 * 60 * 60 * 1000;
const b64u = (buf) => Buffer.from(buf).toString('base64url');
const signingKey = () => crypto.createHmac('sha256', SECRET).update('flyclean-session-v1').digest();
function signSession(payload) {
  const body = b64u(JSON.stringify({ ...payload, exp: Date.now() + TTL_MS }));
  const sig = b64u(crypto.createHmac('sha256', signingKey()).update(body).digest());
  return `${body}.${sig}`;
}

// ── IDs de bases (misma fuente de verdad que el smoke: index.html → NOTION_DBS) ──────────
function loadNotionDbs() {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const block = html.match(/const NOTION_DBS = \{([\s\S]*?)\};/);
  if (!block) throw new Error('No se encontró NOTION_DBS en index.html');
  const dbs = {};
  for (const m of block[1].matchAll(/(\w+)\s*:\s*'([a-f0-9-]{32,36})'/g)) dbs[m[1]] = m[2];
  return dbs;
}
const DBS = loadNotionDbs();

// Query de solo lectura al proxy. page_size ÚNICO por caso para no chocar cachés intermedias.
async function queryDb(dbId, pageSize, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  return fetch(BASE + '/api/notion', {
    method: 'POST',
    headers,
    body: JSON.stringify({ endpoint: `databases/${dbId}/query`, method: 'POST', body: { page_size: pageSize } }),
  });
}

// Lectura del ESPEJO Supabase (/api/db) — matriz de roles en ENFORCE directo desde 2026-07-07
// (hallazgo Codex R2 #1: servía ingresos/gastos a cualquier autenticado).
async function queryEspejo(resource, token) {
  const headers = {};
  if (token) headers['Authorization'] = 'Bearer ' + token;
  return fetch(BASE + '/api/db?resource=' + encodeURIComponent(resource), { headers });
}

let pass = 0, fail = 0;
async function test(name, fn) {
  try { await fn(); console.log('  ✓', name); pass++; }
  catch (e) { console.error('  ✗', name, '—', e.message); fail++; }
}

console.log(`\nFlyClean — tests de permisos por rol contra ${BASE} (EXPECT_ENFORCE=${EXPECT_ENFORCE})\n`);

// (1) Sin token → el proxy rechaza con 401 (ENFORCE_AUTH activo).
await test('sin token → /api/notion 401', async () => {
  const r = await queryDb(DBS.servicios, 2, null);
  assert.equal(r.status, 401, 'esperaba 401, vino ' + r.status);
});

// Preflight: ¿prod acepta un token firmado con el secreto local? Si no (401), es que .env.local
// no tiene el CRON_SECRET real (firma con el fallback NOTION_TOKEN, que no es la clave de prod)
// → se saltean los casos autenticados (exit 0) en vez de fallar en falso. Para correrlos:
//   CRON_SECRET=<el de prod> node tests/permisos.mjs
{
  const probe = await queryDb(DBS.propuestas, 11, signSession({ id: 'federico-maciel' }));
  if (probe.status === 401) {
    console.log('\n  ⚠ SKIP casos autenticados: prod rechazó el token firmado localmente (401).');
    console.log('    Falta el CRON_SECRET real en .env.local/entorno (el fallback NOTION_TOKEN no es la clave de firma de prod).');
    console.log(`\n${pass} ok · ${fail} fallaron · resto salteado\n`);
    process.exit(fail ? 1 : 0);
  }
}

// (2) Ventas: su backstop dedicado YA está en enforce. Desde v133 (2026-07-06) puede LEER la lista de
// Servicios (para el destacado "clientes para recontactar"), además de Contactos y Propuestas. Pero
// NO ve finanzas: Gastos/Ingresos → 403.
const tVentas = signSession({ id: 'ventas-uy' });
await test('ventas-uy → query Servicios 200 (lectura para el destacado de recontactar, v133)', async () => {
  const r = await queryDb(DBS.servicios, 3, tVentas);
  assert.equal(r.status, 200, 'esperaba 200 (Ventas lee servicios desde v133), vino ' + r.status);
});
await test('ventas-uy → query Contactos 200', async () => {
  const r = await queryDb(DBS.contactos, 4, tVentas);
  assert.equal(r.status, 200, 'esperaba 200, vino ' + r.status + ' (¿CRON_SECRET local ≠ prod?)');
});
await test('ventas-uy → query Gastos 403 (backstop Ventas: sin finanzas)', async () => {
  const r = await queryDb(DBS.gastos, 3, tVentas);
  assert.equal(r.status, 403, 'esperaba 403 (Ventas no ve Gastos), vino ' + r.status);
});

// (2b) ESPEJO /api/db — matriz en ENFORCE directo (2026-07-07): la fuga financiera era que
// ingresos/gastos se servían a cualquier autenticado (la RLS solo filtra país).
const tOperarioEspejo = signSession({ id: 'juan-pablo' });
await test('espejo: juan-pablo (operario) → /api/db?resource=ingresos 403 (matriz enforce)', async () => {
  const r = await queryEspejo('ingresos', tOperarioEspejo);
  assert.equal(r.status, 403, 'esperaba 403 (operario sin ingresos en la matriz), vino ' + r.status);
});
await test('espejo: juan-pablo (operario) → /api/db?resource=servicios 200', async () => {
  const r = await queryEspejo('servicios', tOperarioEspejo);
  assert.equal(r.status, 200, 'esperaba 200, vino ' + r.status);
});
await test('espejo: ventas-uy → /api/db?resource=gastos 403 (backstop Ventas)', async () => {
  const r = await queryEspejo('gastos', tVentas);
  assert.equal(r.status, 403, 'esperaba 403, vino ' + r.status);
});
await test('espejo: ventas-uy → /api/db?resource=servicios 200 (lectura v133)', async () => {
  const r = await queryEspejo('servicios', tVentas);
  assert.equal(r.status, 200, 'esperaba 200, vino ' + r.status);
});
await test('espejo: federico-maciel (coordinador) → /api/db?resource=ingresos 200 (Por cobrar)', async () => {
  const r = await queryEspejo('ingresos', signSession({ id: 'federico-maciel' }));
  assert.equal(r.status, 200, 'esperaba 200 (coord tiene ingresos en la matriz), vino ' + r.status);
});

// (3) Operario: Servicios permitido por matriz. Gastos TAMBIÉN está permitido (inventario:
// renderGastosScreen corre para el operario + botón 💸 de screen-services) → el caso "denegado
// bajo enforce" se prueba con INGRESOS, que ningún flujo del operario consulta.
const tOperario = signSession({ id: 'juan-pablo' });
await test('juan-pablo (operario) → query Servicios 200', async () => {
  const r = await queryDb(DBS.servicios, 5, tOperario);
  assert.equal(r.status, 200, 'esperaba 200, vino ' + r.status);
});
await test('juan-pablo (operario) → query Gastos 200 (permitido por matriz: pantalla Gastos del operario)', async () => {
  const r = await queryDb(DBS.gastos, 6, tOperario);
  assert.equal(r.status, 200, 'esperaba 200, vino ' + r.status);
});
await test(`juan-pablo (operario) → query Ingresos ${EXPECT_ENFORCE ? '403 (enforce)' : '200 (monitor)'}`, async () => {
  const r = await queryDb(DBS.ingresos, 7, tOperario);
  if (EXPECT_ENFORCE) {
    assert.equal(r.status, 403, 'esperaba 403 con enforce, vino ' + r.status);
  } else {
    assert.equal(r.status, 200, 'esperaba 200 en monitor, vino ' + r.status);
    console.log('    ↳ monitor: pasaría a 403 con enforce (el server loguea [perms] DENEGARÍA)');
  }
});

// (4) Coordinador: Servicios y Propuestas permitidos por matriz (200 en monitor Y en enforce).
const tCoord = signSession({ id: 'federico-maciel' });
await test('federico-maciel (coordinador) → query Servicios 200', async () => {
  const r = await queryDb(DBS.servicios, 8, tCoord);
  assert.equal(r.status, 200, 'esperaba 200, vino ' + r.status);
});
await test('federico-maciel (coordinador) → query Propuestas 200', async () => {
  const r = await queryDb(DBS.propuestas, 9, tCoord);
  assert.equal(r.status, 200, 'esperaba 200, vino ' + r.status);
});

console.log(`\n${pass} ok · ${fail} fallaron\n`);
process.exit(fail ? 1 : 0);
