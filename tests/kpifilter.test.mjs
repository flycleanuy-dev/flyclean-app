// Día 26 — parseKpiFilter decide qué reads de ingresos/gastos van al ESPEJO (solo-fecha+país) y cuáles NO
// (cualquier otra condición, ej. el 'Cargado por' del operario). Blinda que el read del operario NUNCA se
// rutee al espejo (que ignoraría ese filtro → fuga de TODOS los gastos).
import test from 'node:test';
import assert from 'node:assert';

// Shims por si el módulo hoja tocara globals del browser al cargar (no debería).
globalThis.localStorage ??= { getItem: () => null, setItem: () => {}, removeItem: () => {} };
globalThis.window ??= globalThis;

const { parseKpiFilter } = await import('../src/api.js');

test('KPI CEO/Finanzas {and:[país, Fecha>=, Fecha<=]} → ruteable con los 3 datos', () => {
  const body = { filter: { and: [
    { property: 'País', select: { equals: 'Uruguay' } },
    { property: 'Fecha', date: { on_or_after: '2026-07-01' } },
    { property: 'Fecha', date: { on_or_before: '2026-07-31' } },
  ] } };
  assert.deepEqual(parseKpiFilter(body), { fechaDesde: '2026-07-01', fechaHasta: '2026-07-31', pais: 'Uruguay' });
});

test('read del OPERARIO {and:[Fecha>=, Cargado por]} → NULL (NO ruteable, se queda en el proxy)', () => {
  const body = { filter: { and: [
    { property: 'Fecha', date: { on_or_after: '2026-07-01' } },
    { property: 'Cargado por', select: { equals: 'Francarlos Velázquez' } },
  ] } };
  assert.equal(parseKpiFilter(body), null, 'el filtro Cargado por debe impedir el ruteo al espejo');
});

test('rango abierto {property:Fecha, on_or_after} suelto → ruteable con solo fechaDesde', () => {
  const body = { filter: { property: 'Fecha', date: { on_or_after: '2026-07-01' } } };
  assert.deepEqual(parseKpiFilter(body), { fechaDesde: '2026-07-01', fechaHasta: undefined, pais: undefined });
});

test('filtro con OR → NULL (no soportado)', () => {
  const body = { filter: { or: [{ property: 'Fecha', date: { on_or_after: '2026-07-01' } }] } };
  assert.equal(parseKpiFilter(body), null);
});

test('sin fecha (solo país) → NULL (no es un KPI de rango)', () => {
  assert.equal(parseKpiFilter({ filter: { property: 'País', select: { equals: 'Uruguay' } } }), null);
});

test('sin filtro → NULL', () => {
  assert.equal(parseKpiFilter({}), null);
  assert.equal(parseKpiFilter(null), null);
});

test('condición desconocida (ej. Categoría) → NULL (no rutear con filtro que el espejo no aplica)', () => {
  const body = { filter: { and: [
    { property: 'Fecha', date: { on_or_after: '2026-07-01' } },
    { property: 'Categoría', select: { equals: '🏠 Otros' } },
  ] } };
  assert.equal(parseKpiFilter(body), null);
});
