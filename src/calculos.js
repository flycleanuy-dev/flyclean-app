// ─────────────────────────────────────────────
// CÁLCULOS — lógica de dinero (pura, sin DOM salvo strings de HTML)
// ─────────────────────────────────────────────
// El corazón financiero de la app. Testeado por tests/calculos.test.mjs (importa este módulo directo).
// Regla: NO meter acá nada que use el DOM real o estado de módulo. Solo funciones/consts puras.
// Extraído de main.js el 16/07 (antes era el bloque marcado @calculos dentro de main.js).

import { esc } from './util.js';

const MONEDA_LABEL = { '🇺🇾 UY$': 'UY$', '🇺🇸 USD': 'USD', '🔀 Mixto': 'USD' };
const MONTO_FIELDS = {
  gasto:   { moneda: 'Moneda',       uy: 'Monto UY$',         usd: 'Monto USD' },
  ingreso: { moneda: 'Moneda cobro', uy: 'Monto UY$ cobrado', usd: 'Monto USD' },
};

// Tipo(s) de servicio — la property Notion pasó de select a MULTI_SELECT (2026-07-04): un servicio
// puede ser Fachada + Vidrios (+ Paneles). Lector defensivo: acepta multi_select (nuevo) y select
// (legacy: espejo Supabase / cachés todavía sin resync). Única fuente de lectura en toda la app.
export function tipoServicioList(props) {
  const p = props?.['Tipo de servicio'];
  if (Array.isArray(p?.multi_select) && p.multi_select.length) return p.multi_select.map(o => o.name).filter(Boolean);
  return p?.select?.name ? [p.select.name] : [];
}
export function tipoServicioStr(props) { return tipoServicioList(props).join(' + '); }

// Devuelve { moneda, esUY, monto } leyendo el campo de monto que corresponde a la moneda.
export function montoOf(props, kind = 'gasto') {
  const F = MONTO_FIELDS[kind] || MONTO_FIELDS.gasto;
  const tag = props?.[F.moneda]?.select?.name || null;
  const uyVal = props?.[F.uy]?.number;
  const usdVal = props?.[F.usd]?.number;
  // Moneda: 1) etiqueta explícita si existe; 2) inferir del campo de monto poblado
  //   (legacy: ingresos cargados en "Monto USD" sin etiqueta = USD; gastos en "Monto UY$" = pesos);
  //   3) default UY$ si no hay datos.
  let moneda;
  if (tag) moneda = tag;
  else if (usdVal != null && uyVal == null) moneda = '🇺🇸 USD';
  else moneda = '🇺🇾 UY$';
  const esUY = moneda === '🇺🇾 UY$';
  const monto = esUY ? (uyVal ?? usdVal ?? 0) : (usdVal ?? uyVal ?? 0);
  return { moneda, esUY, monto };
}
// Filas que NO cuentan en el RESULTADO OPERATIVO: movimientos internos marcados "Excluir de KPIs"
// (cambios de moneda, depósitos propios) Y el financiamiento (préstamos de socios). El financiamiento
// se muestra aparte en su propio bloque (deuda). Las filas siguen visibles en las listas (con badge).
export function esFinanciamiento(r) { return !!(r?.properties?.['Financiamiento']?.select?.name); }
// Tipo interno: cambio de moneda / depósito propio / traspaso → NO es gasto ni ingreso real.
export function tipoInterno(r) { return r?.properties?.['Tipo interno']?.select?.name || ''; }
export function esArchivado(r) { return r?.properties?.['🗄️ Archivado']?.checkbox === true; }
export function kpiIncluido(r) { return !(esArchivado(r) || r?.properties?.['Excluir de KPIs']?.checkbox === true || esFinanciamiento(r) || !!tipoInterno(r)); }
// Badge para una card: financiamiento (préstamo) / tipo interno (💱 cambio, 🏦 depósito, 🔁 traspaso) / interno genérico.
export function kpiBadgeHTML(props) {
  if (props?.['Financiamiento']?.select?.name) return ' <span class="kpi-excluido-tag">🏦 préstamo</span>';
  const ti = props?.['Tipo interno']?.select?.name;
  if (ti) return ' <span class="kpi-excluido-tag">' + esc(ti) + '</span>';
  if (props?.['Excluir de KPIs']?.checkbox === true) return ' <span class="kpi-excluido-tag">🔁 interno</span>';
  return '';
}
// Formatea un monto con su etiqueta de moneda. UY$ sin decimales, USD con hasta 2.
export function fmtMoneda(monto, moneda) {
  const esUY = moneda === '🇺🇾 UY$';
  const loc = esUY ? 'es-UY' : 'en-US';
  return (MONEDA_LABEL[moneda] || 'USD') + ' ' + Math.abs(monto).toLocaleString(loc, { maximumFractionDigits: esUY ? 0 : 2 });
}
// Suma montos separando por moneda. Devuelve { uyu, usd }. NUNCA mezcla pesos y dólares.
export function sumByMoneda(results, kind = 'gasto') {
  const tot = { uyu: 0, usd: 0 };
  (results || []).filter(kpiIncluido).forEach(r => { const { esUY, monto } = montoOf(r.properties || {}, kind); if (esUY) tot.uyu += monto; else tot.usd += monto; });
  return tot;
}
// HTML de un total separado por moneda (dos importes). Omite la línea cuyo total es 0.
// opts.sign = '+' para anteponer un signo (ingresos). Si ambos son 0 muestra UY$ 0.
export function fmtTotalSplit(tot, opts = {}) {
  const sign = opts.sign || '';
  const parts = [];
  if (tot.uyu) parts.push('<strong>' + sign + fmtMoneda(tot.uyu, '🇺🇾 UY$') + '</strong>');
  if (tot.usd) parts.push('<strong>' + sign + fmtMoneda(tot.usd, '🇺🇸 USD') + '</strong>');
  if (!parts.length) parts.push('<strong>' + fmtMoneda(0, '🇺🇾 UY$') + '</strong>');
  return parts.join(' <span style="color:var(--text3)">·</span> ');
}
