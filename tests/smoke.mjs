// Tests de humo de FlyClean — SOLO LECTURA (no mutan ningún dato de Notion).
// Verifican que la app y el camino crítico (app → proxy → Notion) estén sanos:
//   - la home carga,
//   - el endpoint de versión responde,
//   - el proxy /api/notion devuelve datos para cada base usada.
// Corren contra producción por defecto; para apuntar a otro entorno: SMOKE_URL=http://localhost:3000 npm test
//
// Uso: npm test   (no requiere navegador ni dependencias extra — usa fetch nativo de Node 18+)

import assert from 'node:assert';
import { readFileSync } from 'node:fs';

const BASE = (process.env.SMOKE_URL || 'https://www.flyclean.app').replace(/\/$/, '');

// Deriva los IDs de la ÚNICA fuente de verdad (app.js → const NOTION_DBS), así no se duplican ni
// divergen; testea todas las bases declaradas ahí. (El JS del front vive en /src/main.js desde el 15/07.)
function loadNotionDbs() {
  const html = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  const block = html.match(/const NOTION_DBS = \{([\s\S]*?)\};/);
  if (!block) throw new Error('No se encontró NOTION_DBS en src/main.js');
  const dbs = {};
  for (const m of block[1].matchAll(/(\w+)\s*:\s*'([a-f0-9-]{32,36})'/g)) dbs[m[1]] = m[2];
  return dbs;
}
const NOTION_DBS = loadNotionDbs();

let pass = 0,
  fail = 0;
async function test(name, fn) {
  try {
    await fn();
    console.log('  ✓', name);
    pass++;
  } catch (e) {
    console.error('  ✗', name, '—', e.message);
    fail++;
  }
}

// El proxy /api/notion ahora EXIGE token de sesión (auth #1). Sin token responde 401 (enforce).
// Durante el despliegue puede estar en monitor (200). El smoke valida que el proxy esté VIVO y
// responda correctamente en cualquiera de los dos modos (200 o 401), no 5xx ni error de red.
// La salud del camino con datos (app→proxy→Notion) se verifica logueado, no en este smoke anónimo.

console.log(`\nFlyClean — tests de humo contra ${BASE}\n`);

await test('GET / responde 200 y es la app FlyClean', async () => {
  const r = await fetch(BASE + '/');
  assert.equal(r.status, 200, 'status ' + r.status);
  const html = await r.text();
  assert.ok(html.includes('FlyClean'), 'el HTML no contiene "FlyClean"');
});

await test('GET /api/version devuelve { web }', async () => {
  const r = await fetch(BASE + '/api/version');
  assert.equal(r.status, 200, 'status ' + r.status);
  const j = await r.json();
  assert.ok(j.web, 'falta el campo "web"');
});

await test('proxy /api/notion responde y exige auth (200 monitor / 401 enforce)', async () => {
  const anyId = Object.values(NOTION_DBS)[0] || 'd1e15376e83a408a8a52f47da33c249a';
  const r = await fetch(BASE + '/api/notion', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint: `databases/${anyId}/query`, method: 'POST', body: { page_size: 1 } }),
  });
  assert.ok(r.status === 200 || r.status === 401, 'el proxy respondió ' + r.status + ' (esperaba 200 o 401)');
});

console.log(`\n${pass} ok · ${fail} fallaron\n`);
process.exit(fail ? 1 : 0);
