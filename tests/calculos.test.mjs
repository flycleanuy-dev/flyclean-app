// Tests UNITARIOS de la lógica de dinero (el corazón financiero). Extrae el bloque marcado
// /* @calculos:start … @calculos:end */ de index.html y lo evalúa en un sandbox — testea el CÓDIGO REAL
// sin moverlo. Si un cambio rompe una cuenta (inferencia de moneda, mezcla UY$/USD, exclusión de KPIs),
// el CI lo atrapa antes de prod. Cero red externa; corre en cualquier lado.
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const m = html.match(/@calculos:start[\s\S]*?\*\/([\s\S]*?)\/\* @calculos:end \*\//);
if (!m) {
  console.error('❌ No encontré el bloque @calculos en index.html (¿se movieron los marcadores?)');
  process.exit(1);
}

// kpiBadgeHTML (dentro del bloque) usa esc() del DOM → se define pero NO se testea. Le pasamos un esc no-op.
const factory = new Function(
  'esc',
  `${m[1]}\n return { montoOf, fmtMoneda, sumByMoneda, kpiIncluido, fmtTotalSplit, tipoServicioStr };`
);
const C = factory(s => String(s ?? ''));

let pass = 0,
  fail = 0;
const ok = (cond, msg) => {
  cond ? pass++ : fail++;
  console.log(`${cond ? '✅' : '❌'} ${msg}`);
};

// montoOf — inferencia de moneda (el bug histórico: pesos que se mostraban como dólares)
ok(
  C.montoOf({ Moneda: { select: { name: '🇺🇾 UY$' } }, 'Monto UY$': { number: 1000 } }, 'gasto').esUY === true,
  'montoOf: etiqueta UY$ → pesos'
);
ok(
  C.montoOf({ 'Monto USD': { number: 50 } }, 'ingreso').esUY === false,
  'montoOf: sin etiqueta + solo USD → dólares (legacy)'
);
ok(
  C.montoOf({ 'Monto UY$': { number: 800 } }, 'gasto').esUY === true,
  'montoOf: sin etiqueta + solo UY$ → pesos (legacy)'
);
ok(C.montoOf({}, 'gasto').monto === 0, 'montoOf: sin datos → 0');
ok(
  C.montoOf({ 'Moneda cobro': { select: { name: '🇺🇸 USD' } }, 'Monto USD': { number: 200 } }, 'ingreso')
    .monto === 200,
  'montoOf: ingreso lee "Moneda cobro"'
);

// fmtMoneda — etiqueta correcta + valor absoluto
ok(C.fmtMoneda(1500, '🇺🇾 UY$').startsWith('UY$'), 'fmtMoneda: etiqueta UY$');
ok(C.fmtMoneda(1500.5, '🇺🇸 USD').startsWith('USD'), 'fmtMoneda: etiqueta USD');
ok(!C.fmtMoneda(-99, '🇺🇾 UY$').includes('-'), 'fmtMoneda: valor absoluto (sin signo)');

// sumByMoneda — NUNCA mezcla monedas + respeta las exclusiones
const rows = [
  { properties: { Moneda: { select: { name: '🇺🇾 UY$' } }, 'Monto UY$': { number: 1000 } } },
  { properties: { Moneda: { select: { name: '🇺🇸 USD' } }, 'Monto USD': { number: 30 } } },
  {
    properties: {
      Moneda: { select: { name: '🇺🇾 UY$' } },
      'Monto UY$': { number: 500 },
      'Excluir de KPIs': { checkbox: true },
    },
  },
];
const tot = C.sumByMoneda(rows, 'gasto');
ok(tot.uyu === 1000 && tot.usd === 30, 'sumByMoneda: separa monedas + excluye "Excluir de KPIs"');

// kpiIncluido — qué NO cuenta en el resultado operativo
ok(C.kpiIncluido({ properties: {} }) === true, 'kpiIncluido: fila normal incluida');
ok(
  C.kpiIncluido({ properties: { Financiamiento: { select: { name: 'Neidat' } } } }) === false,
  'kpiIncluido: financiamiento excluido'
);
ok(
  C.kpiIncluido({ properties: { '🗄️ Archivado': { checkbox: true } } }) === false,
  'kpiIncluido: archivado excluido'
);
ok(
  C.kpiIncluido({ properties: { 'Tipo interno': { select: { name: '💱 Cambio a pesos' } } } }) === false,
  'kpiIncluido: movimiento interno excluido'
);

// fmtTotalSplit — omite la línea en 0, nunca deja vacío
ok(
  C.fmtTotalSplit({ uyu: 100, usd: 0 }).includes('UY$') &&
    !C.fmtTotalSplit({ uyu: 100, usd: 0 }).includes('USD'),
  'fmtTotalSplit: omite la moneda en 0'
);
ok(C.fmtTotalSplit({ uyu: 0, usd: 0 }).includes('UY$ 0'), 'fmtTotalSplit: ambas en 0 → "UY$ 0"');

// tipoServicioStr — multi_select (nuevo) + select (legacy)
ok(
  C.tipoServicioStr({
    'Tipo de servicio': { multi_select: [{ name: '🏢 Fachada' }, { name: '🪟 Vidrios' }] },
  }) === '🏢 Fachada + 🪟 Vidrios',
  'tipoServicioStr: multi_select'
);
ok(
  C.tipoServicioStr({ 'Tipo de servicio': { select: { name: '🏢 Fachada' } } }) === '🏢 Fachada',
  'tipoServicioStr: select legacy'
);

console.log(`\n${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
