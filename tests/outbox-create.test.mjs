// Fase 3b — helpers puros de resolución de relaciones del worker de creates (cron-outbox.js).
// Lógica de correctitud sensible: qué ids se recolectan y cómo se sustituyen local→real SIN mutar el payload.
import test from 'node:test';
import assert from 'node:assert';

// Envs mínimas para que el módulo cargue (no se ejercita la red en estos tests puros).
process.env.SUPABASE_URL = 'https://sb.test';
process.env.SUPABASE_SERVICE_KEY = 'sk';
process.env.NOTION_TOKEN = 'ntn';
process.env.CRON_SECRET = 'cs';

const { collectRelationIds, substituteRelationIds, splitCreateGroup } = await import('../api/_lib/supafirst.js');

test('collectRelationIds: junta todos los ids de todas las relaciones', () => {
  const props = {
    Contacto: { relation: [{ id: 'cliA' }] },
    Propuesta: { relation: [{ id: 'propB' }, { id: 'propC' }] },
    Nombre: { title: [{ text: { content: 'x' } }] }, // no-relation: se ignora
    Estado: { select: { name: 'ok' } },
    Vacia: { relation: [] },
  };
  assert.deepEqual(collectRelationIds(props).sort(), ['cliA', 'propB', 'propC']);
  assert.deepEqual(collectRelationIds({}), []);
  assert.deepEqual(collectRelationIds(null), []);
});

test('substituteRelationIds: reemplaza SOLO los ids resueltos, sin mutar el original', () => {
  const props = {
    Contacto: { relation: [{ id: 'local-1' }] },
    Propuesta: { relation: [{ id: 'real-yaNotion' }, { id: 'local-2' }] },
    Estado: { select: { name: 'ok' } },
  };
  const resolved = new Map([
    ['local-1', 'realId-1'],
    ['local-2', 'realId-2'],
  ]);
  const out = substituteRelationIds(props, resolved);
  assert.equal(out.Contacto.relation[0].id, 'realId-1');
  assert.equal(out.Propuesta.relation[0].id, 'real-yaNotion'); // no estaba en el mapa → intacto
  assert.equal(out.Propuesta.relation[1].id, 'realId-2');
  assert.equal(out.Estado.select.name, 'ok'); // no-relation intacto
  // el original NO se mutó
  assert.equal(props.Contacto.relation[0].id, 'local-1');
});

test('substituteRelationIds: mapa vacío → devuelve el mismo objeto (sin trabajo)', () => {
  const props = { Contacto: { relation: [{ id: 'x' }] } };
  assert.strictEqual(substituteRelationIds(props, new Map()), props);
});

// LOW-1: separación del grupo que empieza con un create.
test('splitCreateGroup: grupo normal [create, patch, patch] → sin duplicados', () => {
  const rows = [
    { id: 1, op: 'create', notion_id: 'uid-1' },
    { id: 2, op: 'patch', notion_id: 'uid-1' },
    { id: 3, op: 'patch', notion_id: 'uid-1' },
  ];
  const { createRow, dupCreates, patchRows, group } = splitCreateGroup(rows);
  assert.equal(createRow.id, 1);
  assert.deepEqual(dupCreates, []);
  assert.deepEqual(patchRows.map(r => r.id), [2, 3]);
  assert.deepEqual(group.map(r => r.id), [1, 2, 3]); // sin duplicados, group === grupo entero
});

test('splitCreateGroup: doble create del mismo uid (LOW-1) → el 2º va a dupCreates, NO a patches', () => {
  const rows = [
    { id: 1, op: 'create', notion_id: 'uid-1' },
    { id: 2, op: 'create', notion_id: 'uid-1' }, // duplicado por blip de infra
  ];
  const { createRow, dupCreates, patchRows, group } = splitCreateGroup(rows);
  assert.equal(createRow.id, 1);
  assert.deepEqual(dupCreates.map(r => r.id), [2]); // se colapsa a done, no se re-crea ni se patchea
  assert.deepEqual(patchRows, []);
  assert.deepEqual(group.map(r => r.id), [1]); // el duplicado NO entra al set de trabajo
});

test('splitCreateGroup: mixto [create, create-dup, patch] → separa las tres clases', () => {
  const rows = [
    { id: 1, op: 'create', notion_id: 'uid-1' },
    { id: 2, op: 'create', notion_id: 'uid-1' },
    { id: 3, op: 'patch', notion_id: 'uid-1' },
  ];
  const { dupCreates, patchRows, group } = splitCreateGroup(rows);
  assert.deepEqual(dupCreates.map(r => r.id), [2]);
  assert.deepEqual(patchRows.map(r => r.id), [3]);
  assert.deepEqual(group.map(r => r.id), [1, 3]);
});

test('splitCreateGroup: create solo → group = [create]', () => {
  const rows = [{ id: 1, op: 'create', notion_id: 'uid-1' }];
  const { dupCreates, patchRows, group } = splitCreateGroup(rows);
  assert.deepEqual(dupCreates, []);
  assert.deepEqual(patchRows, []);
  assert.deepEqual(group.map(r => r.id), [1]);
});
