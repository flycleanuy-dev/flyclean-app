// Tests de humo de FlyClean — SOLO LECTURA (no mutan ningún dato de Notion).
// Verifican que la app y el camino crítico (app → proxy → Notion) estén sanos:
//   - la home carga,
//   - el endpoint de versión responde,
//   - el proxy /api/notion devuelve datos para cada base usada.
// Corren contra producción por defecto; para apuntar a otro entorno: SMOKE_URL=http://localhost:3000 npm test
//
// Uso: npm test   (no requiere navegador ni dependencias extra — usa fetch nativo de Node 18+)

import assert from 'node:assert';

const BASE = (process.env.SMOKE_URL || 'https://www.flyclean.app').replace(/\/$/, '');

// Mismas bases que NOTION_DBS en index.html (si cambian allá, actualizar acá).
const NOTION_DBS = {
  servicios:  'ccaf276c-7f6a-460c-aeb3-d2800deab2e5',
  gastos:     '1e20cdab-ad5d-4152-8d07-0ed2f6e9dad3',
  ingresos:   'd1e15376-e83a-408a-8a52-f47da33c249a',
  propuestas: '2c0a4257-f429-4941-b994-dfebc1098633',
  contactos:  '250115612de74e0582366549bbe5e389',
  activos:    'e75449eeb78143f1b74006a4796c1f95',
  equipo:     'cfff6e26dbc84eedb7eabcb6c51db1eb',
  regTiempo:  '57bc613af5d04908a9f2342cf6a1a5a7',
};

let pass = 0, fail = 0;
async function test(name, fn) {
  try { await fn(); console.log('  ✓', name); pass++; }
  catch (e) { console.error('  ✗', name, '—', e.message); fail++; }
}

// Reintenta una consulta a Notion (la base Servicios es frágil bajo carga; el proxy ya reintenta,
// pero damos margen extra para que el test no sea flaky).
async function notionQuery(id) {
  let last;
  for (let i = 0; i < 3; i++) {
    const r = await fetch(BASE + '/api/notion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: `databases/${id}/query`, method: 'POST', body: { page_size: 1 } }),
    });
    last = r;
    if (r.status === 200) { const j = await r.json(); if (Array.isArray(j.results)) return j; }
    await new Promise(res => setTimeout(res, 800));
  }
  throw new Error('status ' + last.status);
}

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

for (const [name, id] of Object.entries(NOTION_DBS)) {
  await test(`proxy /api/notion: base "${name}" devuelve datos`, async () => {
    const j = await notionQuery(id);
    assert.ok(Array.isArray(j.results), 'sin array results');
  });
}

console.log(`\n${pass} ok · ${fail} fallaron\n`);
process.exit(fail ? 1 : 0);
