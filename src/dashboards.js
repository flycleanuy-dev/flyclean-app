// ─────────────────────────────────────────────
// DASHBOARDS — paneles CEO + Finanzas (Métricas · Rentabilidad · Comercial · Servicios · Finanzas ·
// Por cobrar · Equipo · Cuentas de acceso). Extraído de main.js el 2026-07-16.
// ─────────────────────────────────────────────
// Los usan el rol CEO y el rol Finanzas (vía _ceoContentId/_ceoRerender apuntando a su contenedor).
//
// PATRÓN PUENTE (primer corte de ÁREA): el ESTADO compartido y las CONSTS de config SIGUEN en main.js —
// así los accesores de window que usan los handlers inline no cambian — y este módulo los lee/escribe vía
// M (bridge que inyecta initDashboards): M.ceoPeriod, M.currentUser, M.USERS (¡se reasigna con el roster!).
// Las FUNCIONES de main llegan con alias locales del mismo nombre → ni el código ni los onclick="…" de los
// templates cambian (los handlers resuelven por window contra las funciones reales de main).

import { t, currentLang } from './i18n.js';
import { esc } from './util.js';
import {
  esArchivado, esFinanciamiento, fmtMoneda, fmtTotalSplit, kpiIncluido, montoOf, sumByMoneda,
  tipoInterno, tipoServicioList, tipoServicioStr,
} from './calculos.js';
import { callDb, callNotion, callNotionAll, syncAfterWrite } from './api.js';
import { ensureJsPDF } from './reporte.js';

let M = {};
export function initDashboards(bridge) { M = bridge; }

// Alias locales de funciones de main (mismo nombre; lazy vía M para tomar siempre la función real).
const clienteNombreDe = (...a) => M.clienteNombreDe(...a);
const ensureClienteNombres = (...a) => M.ensureClienteNombres(...a);
const finRecEnPais = (...a) => M.finRecEnPais(...a);
const generateReportPDFFromCEO = (...a) => M.generateReportPDFFromCEO(...a);
const getCEOFilter = (...a) => M.getCEOFilter(...a);
const getCEOFinanceFilter = (...a) => M.getCEOFinanceFilter(...a);
const jobCompleto = (...a) => M.jobCompleto(...a);
const loadCEO = (...a) => M.loadCEO(...a);
const loadRoster = (...a) => M.loadRoster(...a);
const logout = (...a) => M.logout(...a);
const openAccountMenu = (...a) => M.openAccountMenu(...a);
const openCobroSheet = (...a) => M.openCobroSheet(...a);
const openContactSheet = (...a) => M.openContactSheet(...a);
const openEditSheetFromFinanzas = (...a) => M.openEditSheetFromFinanzas(...a);
const openNuevoGastoSheet = (...a) => M.openNuevoGastoSheet(...a);
const propTieneServicio = (...a) => M.propTieneServicio(...a);
const recEnPaisNotion = (...a) => M.recEnPaisNotion(...a);
const renderClientesView = (...a) => M.renderClientesView(...a);
const saveCobroEdit = (...a) => M.saveCobroEdit(...a);
const showScreen = (...a) => M.showScreen(...a);
const translateRole = (...a) => M.translateRole(...a);
const resetGastosCache = (...a) => M.resetGastosCache(...a);

export function renderCEOCountryTabs() {
  const container = document.getElementById('ceo-country-tabs');
  const isGlobalCEO = M.currentUser.country === 'Uruguay';
  if (!isGlobalCEO) { container.innerHTML = ''; return; }
  const options = [['all','🌎 Todos'],['Uruguay','🇺🇾 UY'],['Brasil','🇧🇷 BR'],['Panamá','🇵🇦 PA'],['Guatemala','🇬🇹 GT'],['México','🇲🇽 MX']];
  container.innerHTML = options.map(([val, label]) =>
    `<button class="ceo-country-tab ${M.ceoViewCountry === val ? 'active' : ''}" onclick="setCEOCountry('${val}')">${label}</button>`
  ).join('');
}

export async function setCEOCountry(country) {
  M.ceoViewCountry = country;
  resetGastosCache(); // Gastos tiene filtro server-side de país → refetchear con el país nuevo (ingresos va por el espejo/RLS, no necesita)
  renderCEOCountryTabs();
  if (M.activeCEOTab === 'metricas') await renderCEOMetricas();
  else if (M.activeCEOTab === 'servicios') await renderCEOServicios();
  else if (M.activeCEOTab === 'finanzas') await renderCEOFinanzas();
  else await renderCEOEquipo();
}

export async function setCEOTab(tab) {
  M.activeCEOTab = tab;
  M._ceoContentId = 'ceo-content';
  ['inicio','metricas','servicios','finanzas','porcobrar','clientes','equipo'].forEach(t =>
    document.getElementById('ceotab-' + t)?.classList.toggle('active', t === tab)
  );
  // Global country tabs: hidden en Inicio/Métricas (tienen selector propio), Por cobrar y Clientes (muestran todo).
  const globalTabs = document.getElementById('ceo-country-tabs');
  if (globalTabs) globalTabs.style.display = (tab === 'inicio' || tab === 'metricas' || tab === 'porcobrar' || tab === 'clientes') ? 'none' : '';
  if (tab === 'inicio') { M._ceoRerender = renderCEOInicio; await renderCEOInicio(); }
  else if (tab === 'metricas') { M._ceoRerender = renderCEOMetricas; await renderCEOMetricas(); }
  else if (tab === 'servicios') { M._ceoRerender = renderCEOServicios; await renderCEOServicios(); }
  else if (tab === 'finanzas') { M._ceoRerender = renderCEOFinanzas; await renderCEOFinanzas(); }
  else if (tab === 'porcobrar') { M._ceoRerender = () => renderPorCobrar('ceo-content', { readonly: true }); await renderPorCobrar('ceo-content', { readonly: true }); }
  else if (tab === 'clientes') { M._ceoRerender = () => renderClientesView('ceo-content'); await renderClientesView('ceo-content'); }
  else if (tab === 'equipo') await renderCEOEquipo();
}

export function backFromCEO() {
  if (!M.currentUser) { logout(); return; }
  if (M.currentUser.role.includes('Dirección')) {
    showScreen('coordinator');
  } else {
    // CEO puro: nada de logout directo de un toque — abre el menú de cuenta (salir vive ahí, con confirmación).
    openAccountMenu();
  }
}

export function goToCEOFromCoord() {
  loadCEO();
}

export async function renderCEOMetricas() {
  const content = document.getElementById(M._ceoContentId);
  content.innerHTML = '<div style="text-align:center;padding:40px 0"><div class="spinner" style="margin:0 auto"></div></div>';
  try {
    const isUruguayCEO = M.currentUser.country === 'Uruguay';
    const cf  = getCEOFilter();
    const fcf = getCEOFinanceFilter();
    const now = new Date();
    const { start, end, label: periodLabel } = getCEOPeriodRange();
    const yearStart = now.getFullYear() + '-01-01';
    const yearEnd   = now.getFullYear() + '-12-31';
    const dFilter = (s, e) => ({ and: [ ...(fcf ? [fcf] : []), { property: 'Fecha', date: { on_or_after: s } }, { property: 'Fecha', date: { on_or_before: e } } ] });
    const propFilter    = { and: [ ...(cf ? [cf] : []), { property: 'Estado pipeline', select: { does_not_equal: '❌ Rechazada' } }, { property: 'Estado pipeline', select: { does_not_equal: '😶 Sin respuesta' } } ] };
    const contactFilter = cf ? { and: [cf, { property: 'Estado', select: { equals: '✅ Cliente activo' } }] } : { property: 'Estado', select: { equals: '✅ Cliente activo' } };

    // Gastos/Ingresos PAGINADOS (año/rango pueden tener >100 filas). Servicios/props/contactos: 1 página (pocos).
    // Servicios (multi-data-source → fallback de búsqueda, frágil bajo carga concurrente): se trae
    // SOLO, aparte y UNA vez por sesión (se cachea; no cambia por período) + reintento si vuelve vacío.
    if (!M._ceoServiciosAll || !M._ceoServiciosAll.length) {
      let r = await callNotion(`databases/${M.DB_ID}/query`, 'POST', { page_size: 100 });
      if (!(r.results || []).length) { await new Promise(x => setTimeout(x, 600)); r = await callNotion(`databases/${M.DB_ID}/query`, 'POST', { page_size: 100 }); }
      M._ceoServiciosAll = r.results || [];
    }
    const svcAllData = { results: M._ceoServiciosAll };
    // Nombres de cliente para el Tablero de Rentabilidad: dispara en paralelo con lo demás (no agrega
    // latencia secuencial); guardado — si el espejo Supabase no responde, se cae a contactData (activos).
    const clientesPromise = callDb('clientes').catch(() => null);
    // CRM comercial (📊, ver más abajo): TODAS las propuestas (no solo las abiertas del propFilter de
    // abajo) — dispara en paralelo, nunca rompe Métricas si falla (try/catch propio + fallback a Notion).
    const propAllPromise = (async () => {
      try { return await callDb('propuestas'); }
      catch (e) { try { return await callNotionAll(`databases/${M.PROPUESTAS_DB_ID}/query`, {}); } catch (e2) { return null; } }
    })();
    // Sub-bloque 🎯 Prospección (📊 Comercial, ver más abajo): clientes en estados de prospección,
    // scopeados al país que se está viendo (getCEOFilter). Dispara en paralelo — null si falla,
    // nunca rompe Métricas/Comercial (guard en el try/catch de M._ceoComData más abajo).
    const prospClientesPromise = (async () => {
      try {
        const cfp = getCEOFilter();
        const estadoOr = { or: M.PROSPECCION_ESTADOS.map(e => ({ property: 'Estado', select: { equals: e } })) };
        const filter = cfp ? { and: [cfp, estadoOr] } : estadoOr;
        const data = await callNotion(`databases/${M.CONTACTOS_DB_ID}/query`, 'POST', { filter });
        return (data.results || []).filter(c => !esArchivado(c));
      } catch (e) { return null; }
    })();
    // Finanzas paginadas + propuestas + contactos en paralelo.
    const [ingData, gasData, ingYearData, gasYearData, propData, contactData] = await Promise.all([
      callNotionAll(`databases/${M.INGRESOS_DB_ID}/query`, { filter: dFilter(start, end) }),
      callNotionAll(`databases/${M.GASTOS_DB_ID}/query`, { filter: dFilter(start, end) }),
      callNotionAll(`databases/${M.INGRESOS_DB_ID}/query`, { filter: dFilter(yearStart, yearEnd) }),
      callNotionAll(`databases/${M.GASTOS_DB_ID}/query`, { filter: dFilter(yearStart, yearEnd) }),
      callNotion(`databases/${M.PROPUESTAS_DB_ID}/query`, 'POST', { filter: propFilter }),
      callNotion(`databases/${M.CONTACTOS_DB_ID}/query`, 'POST', { filter: contactFilter })
    ]);

    // Servicios: apply client-side country filter (search API fallback ignores server filter)
    const applyCountryFilter = (results) => {
      if (!cf || M.ceoViewCountry === 'all') return results;
      const notionVal = M.COUNTRY_NOTION_MAP[M.ceoViewCountry];
      return results.filter(s => s.properties?.['País']?.select?.name === notionVal);
    };
    // El fallback de búsqueda de Servicios ignora el filtro del server → filtramos por Estado en el cliente.
    const estadoDe = s => (s.properties?.['Estado']?.select?.name) || '';
    const enPeriodo = s => { const f = s.properties?.['Fecha programada']?.date?.start || ''; return f ? (f >= start && f <= end) : (M.ceoPeriod.mode === 'todo'); };
    const svcComp   = applyCountryFilter(svcAllData.results || []).filter(s => !esArchivado(s) && estadoDe(s).includes('Completado') && enPeriodo(s));
    const svcActivo = applyCountryFilter(svcAllData.results || []).filter(s => !esArchivado(s) && (estadoDe(s).includes('En curso') || estadoDe(s).includes('Asignado')));

    _ceoDataTime = Date.now();
    const ingSplit = sumByMoneda(ingData.results, 'ingreso');
    const gasSplit = sumByMoneda(gasData.results, 'gasto');
    const balSplit = { uyu: ingSplit.uyu - gasSplit.uyu, usd: ingSplit.usd - gasSplit.usd };
    const svcCount = svcComp.length, svcActivos = svcActivo.length;
    const propCount = (propData.results || []).length;

    // Margen REAL por moneda (sin mezclar) — el principal.
    const margenReal = {
      uyu: ingSplit.uyu > 0 ? Math.round((ingSplit.uyu - gasSplit.uyu) / ingSplit.uyu * 100) : null,
      usd: ingSplit.usd > 0 ? Math.round((ingSplit.usd - gasSplit.usd) / ingSplit.usd * 100) : null,
    };
    // Margen unificado aprox (secundario, rotulado): convierte a USD con el TC del registro (fallback 40).
    const TC_FB = 40;
    const toUSD = (props, kind) => { const { esUY, monto } = montoOf(props, kind); if (!esUY) return monto; const tc = props?.[kind === 'gasto' ? 'TC usado' : 'TC aplicado']?.number || TC_FB; return tc ? monto / tc : 0; };
    const ingUSDc = (ingData.results || []).filter(kpiIncluido).reduce((s, r) => s + toUSD(r.properties || {}, 'ingreso'), 0);
    const gasUSDc = (gasData.results || []).filter(kpiIncluido).reduce((s, r) => s + toUSD(r.properties || {}, 'gasto'), 0);
    const margenUnif = ingUSDc > 0 ? Math.round((ingUSDc - gasUSDc) / ingUSDc * 100) : null;

    const ticketSplit = svcCount ? { uyu: ingSplit.uyu / svcCount, usd: ingSplit.usd / svcCount } : null;

    // Mensual del año (para sparkline + delta vs mes anterior).
    const ms = {};
    const accM = (results, kind) => (results || []).filter(kpiIncluido).forEach(r => { const m = (r.properties?.['Fecha']?.date?.start || '').slice(0, 7); if (!m) return; const { esUY, monto } = montoOf(r.properties || {}, kind); (ms[m] = ms[m] || { iu: 0, id: 0, gu: 0, gd: 0 }); if (kind === 'ingreso') { if (esUY) ms[m].iu += monto; else ms[m].id += monto; } else { if (esUY) ms[m].gu += monto; else ms[m].gd += monto; } });
    accM(ingYearData.results, 'ingreso'); accM(gasYearData.results, 'gasto');
    const monthKeys = Object.keys(ms).sort();
    const balU = m => (ms[m] ? ms[m].iu - ms[m].gu : 0), balD = m => (ms[m] ? ms[m].id - ms[m].gd : 0);
    const spark = monthKeys.slice(-6).map(m => balD(m) + balU(m) / TC_FB);
    let deltaU = null, deltaD = null;
    if (M.ceoPeriod.mode === 'mes') {
      const curM = start.slice(0, 7), idx = monthKeys.indexOf(curM), prevM = idx > 0 ? monthKeys[idx - 1] : null;
      const pct = (c, p) => (p ? Math.max(-999, Math.min(999, Math.round((c - p) / Math.abs(p) * 100))) : null);
      if (prevM) { deltaU = pct(balU(curM), balU(prevM)); deltaD = pct(balD(curM), balD(prevM)); }
    }

    const balOk = balSplit.uyu >= 0 && balSplit.usd >= 0;
    const salud = balOk ? { t: '🟢 Sana', c: 'var(--green)' } : ((balSplit.uyu < 0 && balSplit.usd < 0) ? { t: '🔴 Atención', c: 'var(--red)' } : { t: '🟡 Ojo', c: '#F5A623' });

    const ingSinVinc = (ingYearData.results || []).filter(r => !(r.properties?.['Servicio vinculado']?.relation || []).length).length;
    const svcSinFecha = applyCountryFilter(svcAllData.results || []).filter(s => estadoDe(s).includes('Completado') && !(s.properties?.['Fecha programada']?.date?.start)).length;
    const aRevisar = [];
    if (ingSinVinc) aRevisar.push(ingSinVinc + ' cobros sin servicio vinculado');
    if (svcSinFecha) aRevisar.push(svcSinFecha + ' servicios completados sin fecha programada');

    const tipoCount = {};
    // multi_select: un servicio Fachada+Vidrios cuenta en AMBAS barras (mide trabajo por tipo, no servicios)
    svcComp.forEach(s => { const tps = tipoServicioList(s.properties); (tps.length ? tps : [t('ceo.tipos.sintipo')]).forEach(tp => { tipoCount[tp] = (tipoCount[tp] || 0) + 1; }); });
    const maxTipo = Math.max(1, ...Object.values(tipoCount));
    const tipoHTML = Object.entries(tipoCount).sort((a, b) => b[1] - a[1]).map(([k, v]) => '<div class="tipo-row"><span class="tipo-name">' + esc(k) + '</span><span class="tipo-bar"><span style="width:' + Math.round(v / maxTipo * 100) + '%"></span></span><span class="tipo-val">' + v + '</span></div>').join('') || '<div class="kpi-sub" style="padding:8px 16px">— sin servicios completados en este período —</div>';

    // Tablero de Rentabilidad (📈, desplegable debajo de "Servicios por tipo"): margen v1 = ingresos
    // vinculados − gastos vinculados (NO jornales, NO prorrateo). Nombres de cliente: contactData
    // (activos) primero, completado con el espejo Supabase 'clientes' (todos) si llegó a tiempo.
    const normId = s => (s || '').replace(/-/g, '');
    const clienteNombreById = {};
    (contactData.results || []).forEach(c => { clienteNombreById[normId(c.id)] = c.properties?.['Nombre / Empresa']?.title?.[0]?.plain_text || ''; });
    const cliData = await clientesPromise; // guardada arriba (.catch(()=>null)) — nunca relanza
    (cliData?.results || []).forEach(c => { const nm = c.properties?.['Nombre / Empresa']?.title?.[0]?.plain_text; if (nm) clienteNombreById[normId(c.id)] = nm; });
    M._ceoRentaData = computeRentabilidad({ svcAll: svcAllData.results, ingResults: ingData.results, gasResults: gasData.results, ms, clienteNombreById });

    // CRM comercial (📊, desplegable debajo de Rentabilidad): defensivo — un fallo acá NUNCA debe
    // tirar abajo Métricas ya calculada arriba (render "—" en vez de romper el panel).
    try {
      const propAllData = await propAllPromise;
      let allPropsCom = (propAllData?.results || []).slice();
      if (cf && M.ceoViewCountry !== 'all') {
        const notionVal = M.COUNTRY_NOTION_MAP[M.ceoViewCountry];
        if (notionVal) allPropsCom = allPropsCom.filter(p => p.properties?.['País']?.select?.name === notionVal);
      }
      M._ceoComData = computeComercial(allPropsCom);
    } catch (e) { M._ceoComData = null; }

    // Sub-bloque 🎯 Prospección (spec 2026-07-02 B2): mismo criterio defensivo — un fallo acá
    // nunca debe tirar abajo Métricas ni Comercial ya calculados arriba.
    try {
      const prospClientes = await prospClientesPromise;
      M._ceoProspData = prospClientes ? computeProspeccionMetrics(prospClientes) : null;
    } catch (e) { M._ceoProspData = null; }

    // valor monetario tipo HÉROE (2 líneas UY$ / USD), con delta opcional.
    const heroLines = (split, opts = {}) => {
      const rows = [];
      const push = (n, mon, delta) => {
        const neg = n < 0, col = opts.bal ? (neg ? 'var(--red)' : 'var(--green)') : (opts.color || 'var(--text)');
        const sgn = opts.bal ? (neg ? '−' : '+') : '';
        const d = (delta != null) ? ' <span class="hero-delta ' + (delta >= 0 ? 'up' : 'dn') + '">' + (delta >= 0 ? '▲' : '▼') + ' ' + Math.abs(delta) + '%</span>' : '';
        rows.push('<div class="hero-line" style="color:' + col + '">' + sgn + fmtMoneda(n, mon) + d + '</div>');
      };
      if (split.uyu || (!split.uyu && !split.usd)) push(split.uyu, '🇺🇾 UY$', opts.deltaU);
      if (split.usd) push(split.usd, '🇺🇸 USD', opts.deltaD);
      return rows.join('');
    };
    const kpiLines = (split) => {
      const rows = [];
      const push = (n, mon) => rows.push('<div class="kpi-num">' + fmtMoneda(n, mon) + '</div>');
      if (split.uyu || (!split.uyu && !split.usd)) push(split.uyu, '🇺🇾 UY$');
      if (split.usd) push(split.usd, '🇺🇸 USD');
      return rows.join('');
    };
    const margenCard = (margenReal.uyu == null && margenReal.usd == null)
      ? '<div class="kpi-num" style="color:var(--text3)">—</div>'
      : ((margenReal.uyu != null ? '<div class="kpi-num" style="color:' + (margenReal.uyu >= 0 ? 'var(--green)' : 'var(--red)') + '">UY$ ' + (margenReal.uyu >= 0 ? '+' : '') + margenReal.uyu + '%</div>' : '') + (margenReal.usd != null ? '<div class="kpi-num" style="color:' + (margenReal.usd >= 0 ? 'var(--green)' : 'var(--red)') + '">USD ' + (margenReal.usd >= 0 ? '+' : '') + margenReal.usd + '%</div>' : ''));

    if (M.activeCEOTab !== 'metricas') return; // cambió de tab mientras cargaba → NO pisar el contenido nuevo
    content.innerHTML = ceoHeaderHTML('Métricas') + renderCEOPeriodSelector() +
      '<div class="acct">' +
        '<div class="salud-band" style="color:' + salud.c + '">SALUD DEL NEGOCIO<span class="salud-chip">' + salud.t + '</span></div>' +
        '<div class="hero-block"><div class="hero-label">BALANCE · ' + periodLabel + '</div>' +
          heroLines(balSplit, { bal: true, deltaU, deltaD }) +
          (spark.length >= 2 ? '<div class="hero-spark">' + buildSparkline(spark) + '<div class="hero-spark-cap">tendencia ' + spark.length + ' meses</div></div>' : '') +
        '</div>' +
        '<div class="kpi-grid">' +
          '<div class="kpi-card"><div class="kpi-label">Ticket promedio</div>' + (ticketSplit ? kpiLines(ticketSplit) : '<div class="kpi-num" style="color:var(--text3)">—</div>') + '<div class="kpi-sub">por servicio</div></div>' +
          '<div class="kpi-card"><div class="kpi-label">Servicios</div><div class="kpi-num big">' + svcCount + '</div><div class="kpi-sub">completados</div></div>' +
          '<div class="kpi-card"><div class="kpi-label">Margen real</div>' + margenCard + '<div class="kpi-sub">' + (margenUnif != null ? '~' + margenUnif + '% unif. (aprox)' : 'por moneda') + '</div></div>' +
          '<div class="kpi-card"><div class="kpi-label">Pipeline</div><div class="kpi-num big">' + svcActivos + ' <span class="kpi-unit">en curso</span></div><div class="kpi-num" style="font-size:15px">' + propCount + ' <span class="kpi-unit">propuestas</span></div></div>' +
        '</div>' +
        '<button class="ceo-acc-head" onclick="toggleCeoAcc(this)"><span>🧰 Servicios por tipo</span><span class="fin-arrow">▾</span></button>' +
        '<div class="ceo-acc-body" style="display:none">' + tipoHTML + '</div>' +
        '<button class="ceo-acc-head" onclick="toggleCeoAcc(this)"><span>📈 ' + t('ceo.renta.title') + '</span><span class="fin-arrow">▾</span></button>' +
        '<div class="ceo-acc-body" style="display:none"><div id="ceo-renta-body"></div></div>' +
        '<button class="ceo-acc-head" onclick="toggleCeoAcc(this)"><span>📊 ' + t('ceo.com.title') + '</span><span class="fin-arrow">▾</span></button>' +
        '<div class="ceo-acc-body" style="display:none"><div id="ceo-com-body"></div></div>' +
        (aRevisar.length ? '<button class="ceo-acc-head warn" onclick="toggleCeoAcc(this)"><span>⚠️ A revisar (' + aRevisar.length + ')</span><span class="fin-arrow">▾</span></button><div class="ceo-acc-body" style="display:none">' + aRevisar.map(x => '<div class="fin-detail-row"><div class="fin-detail-main"><div class="fin-detail-title">• ' + esc(x) + '</div></div></div>').join('') + '<div class="kpi-sub" style="padding:8px 16px 4px">Completalos desde el proyecto FlyClean-Finanzas para KPIs exactos por período y por cliente.</div></div>' : '') +
      '</div>';
    // Defensivo: un fallo pintando Rentabilidad no debe tirar abajo el panel de Métricas ya renderizado.
    try { renderCeoRentaBody(); } catch (_) {}
    try { renderCeoComBody(); } catch (_) {}
  } catch (e) {
    if (M.activeCEOTab === 'metricas') content.innerHTML = '<div class="coord-empty">' + t('ceo.error.metricas') + '<br><small>' + esc(e.message) + '</small></div>';
  }
}

// ── Tablero de Rentabilidad v1 (CEO→Métricas → desplegable "📈 Rentabilidad") ──────────────────────
// Margen v1 = ingresos vinculados − gastos vinculados. NO jornales, NO prorrateo (eso queda para v2).
// UY$ y USD NUNCA se mezclan ni convierten: todo agregado se guarda y se muestra separado por moneda.
//
// Vinculación (property names verificados en el código real, no asumidos):
//   servicio → cliente:  props['Contacto']?.relation (fallback legacy 'Contactos')
//   ingreso  → servicio: props['Servicio vinculado']?.relation   (NO 'Servicio' — ese es el título)
//   ingreso  → cliente:  props['Cuenta']?.relation                (fallback directo si no hay servicio)
//   gasto    → servicio: props['Servicio']?.relation               (Gastos NO usa 'Servicio vinculado')
//   gasto    → cliente:  no existe fallback directo (por diseño — ver spec) → sin servicio = sin vincular
//
// "Sin vincular" es un total DISTINTO por vista (cliente vs servicio): la plata sin cliente resuelto
// cae en el total de la vista Cliente; la plata sin servicio resuelto cae en el total de la vista
// Servicio — cada vista reconcilia con el Balance del período sumando sus filas + su línea "sin vincular".
function computeRentabilidad({ svcAll, ingResults, gasResults, ms, clienteNombreById }) {
  const norm = s => (s || '').replace(/-/g, '');
  const NOTION_TO_KEY = {}; Object.entries(M.COUNTRY_NOTION_MAP).forEach(([k, v]) => { NOTION_TO_KEY[v] = k; });
  const FIN_TO_KEY = {}; Object.entries(M.COUNTRY_FINANCE_MAP).forEach(([k, v]) => { FIN_TO_KEY[v] = k; });

  // Metadata de servicios: id normalizado (sin guiones) → nombre / cliente / país.
  const svcMeta = {};
  (svcAll || []).forEach(s => {
    const p = s.properties || {};
    const clienteIdRaw = p['Contacto']?.relation?.[0]?.id || p['Contactos']?.relation?.[0]?.id || '';
    svcMeta[norm(s.id)] = {
      nombre: p['Nombre del servicio']?.title?.[0]?.plain_text || t('common.sinnombre'),
      clienteId: clienteIdRaw ? norm(clienteIdRaw) : '',
      paisKey: NOTION_TO_KEY[p['País']?.select?.name || ''] || ''
    };
  });

  const mkMoney = () => ({ uyu: 0, usd: 0 });
  const addMoney = (m, esUY, monto) => { if (esUY) m.uyu += monto; else m.usd += monto; };
  const withMargen = o => { o.margen = { uyu: o.ing.uyu - o.gas.uyu, usd: o.ing.usd - o.gas.usd }; return o; };

  const byCliente = {}, byServicio = {}, byPais = {};
  const ensureCliente = id => (byCliente[id] = byCliente[id] || { nombre: clienteNombreById[id] || t('ceo.renta.cliente.generico'), ing: mkMoney(), gas: mkMoney() });
  const ensureServicio = id => (byServicio[id] = byServicio[id] || { nombre: (svcMeta[id] && svcMeta[id].nombre) || t('common.sinnombre'), ing: mkMoney(), gas: mkMoney() });
  const ensurePais = key => (byPais[key] = byPais[key] || { ing: mkMoney(), gas: mkMoney() });
  const sinVincCliente = { ing: mkMoney(), gas: mkMoney() };
  const sinVincServicio = { ing: mkMoney(), gas: mkMoney() };

  // Ingresos (servicio vía 'Servicio vinculado'; cliente directo vía 'Cuenta' si no hay servicio).
  (ingResults || []).filter(kpiIncluido).forEach(r => {
    const p = r.properties || {};
    const { esUY, monto } = montoOf(p, 'ingreso');
    const svcIdRaw = p['Servicio vinculado']?.relation?.[0]?.id || '';
    const svcId = svcIdRaw ? norm(svcIdRaw) : '';
    const cuentaIdRaw = p['Cuenta']?.relation?.[0]?.id || '';
    const cuentaId = cuentaIdRaw ? norm(cuentaIdRaw) : '';
    const meta = svcId ? svcMeta[svcId] : null;

    if (svcId) addMoney(ensureServicio(svcId).ing, esUY, monto);
    else addMoney(sinVincServicio.ing, esUY, monto);

    // Cliente: si hay svcId, SIEMPRE vía el cliente del servicio (aunque el servicio no tenga uno
    // cargado → cae a "sin vincular", nunca se usa la 'Cuenta' del ingreso como desempate). El
    // fallback directo a 'Cuenta' es SOLO para ingresos sin servicio vinculado en absoluto.
    const clienteId = svcId ? ((meta && meta.clienteId) || '') : cuentaId;
    if (clienteId) addMoney(ensureCliente(clienteId).ing, esUY, monto);
    else addMoney(sinVincCliente.ing, esUY, monto);

    const paisKey = (meta && meta.paisKey) || FIN_TO_KEY[p['País']?.select?.name || ''] || '';
    addMoney(ensurePais(paisKey || 'sin-pais').ing, esUY, monto);
  });

  // Gastos (servicio vía 'Servicio'; SIN fallback directo a cliente — sin servicio = sin vincular).
  (gasResults || []).filter(kpiIncluido).forEach(r => {
    const p = r.properties || {};
    const { esUY, monto } = montoOf(p, 'gasto');
    const svcIdRaw = p['Servicio']?.relation?.[0]?.id || '';
    const svcId = svcIdRaw ? norm(svcIdRaw) : '';
    const meta = svcId ? svcMeta[svcId] : null;

    if (svcId) addMoney(ensureServicio(svcId).gas, esUY, monto);
    else addMoney(sinVincServicio.gas, esUY, monto);

    const clienteId = (meta && meta.clienteId) || '';
    if (clienteId) addMoney(ensureCliente(clienteId).gas, esUY, monto);
    else addMoney(sinVincCliente.gas, esUY, monto);

    const paisKey = (meta && meta.paisKey) || FIN_TO_KEY[p['País']?.select?.name || ''] || '';
    addMoney(ensurePais(paisKey || 'sin-pais').gas, esUY, monto);
  });

  // Evolución mensual: reusa `ms` (ya calculado en renderCEOMetricas para el sparkline, mismo filtro
  // kpiIncluido) en vez de re-iterar ingYearData/gasYearData — mismos números, cero fetch extra.
  const meses = Object.keys(ms || {}).sort().map(m => {
    const v = ms[m];
    const o = { mes: m, ing: { uyu: v.iu, usd: v.id }, gas: { uyu: v.gu, usd: v.gd } };
    return withMargen(o);
  }).filter(o => o.ing.uyu || o.ing.usd || o.gas.uyu || o.gas.usd);

  Object.values(byCliente).forEach(withMargen);
  Object.values(byServicio).forEach(withMargen);
  Object.values(byPais).forEach(withMargen);
  withMargen(sinVincCliente); withMargen(sinVincServicio);

  return {
    cliente: Object.entries(byCliente).map(([id, v]) => ({ id, ...v })),
    servicio: Object.entries(byServicio).map(([id, v]) => ({ id, ...v })),
    pais: Object.entries(byPais).map(([key, v]) => ({ key, nombre: M.COUNTRY_NOTION_MAP[key] || t('ceo.renta.sinpais'), ...v })),
    sinVincCliente, sinVincServicio, meses
  };
}

// Chips de sub-vista (mismo patrón visual que el toggle UY$/USD de Finanzas). Cambiar de vista SOLO
// re-renderiza #ceo-renta-body (no vuelve a llamar renderCEOMetricas ni refetchea nada).
export function setCeoRentaView(v) { M._ceoRentaView = v; renderCeoRentaBody(); }
function ceoRentaChipsHTML() {
  const views = [['cliente', t('ceo.renta.chip.cliente')], ['servicio', t('ceo.renta.chip.servicio')], ['paismes', t('ceo.renta.chip.paismes')]];
  return '<div style="display:flex;gap:6px;padding:0 16px 10px;flex-wrap:wrap">' +
    views.map(([k, lbl]) => '<button class="ceo-country-tab ' + (M._ceoRentaView === k ? 'active' : '') + '" onclick="setCeoRentaView(\'' + k + '\')">' + esc(lbl) + '</button>').join('') +
    '</div>';
}
// Mes 'YYYY-MM' → etiqueta corta localizada ("jul 2026" / "jul de 2026").
function fmtMesRentaLabel(m) {
  const parts = (m || '').split('-').map(Number);
  const d = new Date(parts[0] || 2000, (parts[1] || 1) - 1, 1);
  const loc = currentLang === 'pt-BR' ? 'pt-BR' : 'es-UY';
  return d.toLocaleDateString(loc, { month: 'short', year: 'numeric' });
}
// Fila de una entidad (cliente/servicio/país/mes): una línea por moneda con ingresos/gastos/margen.
// opts.muted → estilo atenuado (usado para las líneas "sin vincular").
function rentaRowHTML(nombre, bucket, opts = {}) {
  const dot = ' <span style="color:var(--text3)">·</span> ';
  const linea = (mon, ing, gas, margen) => {
    if (!ing && !gas) return '';
    const color = margen >= 0 ? 'var(--green)' : 'var(--red)';
    const sgn = margen < 0 ? '−' : '+';
    const pct = ing > 0 ? Math.round(margen / ing * 100) : null;
    const pctTxt = pct != null ? ' (' + (pct >= 0 ? '+' : '') + pct + '%)' : '';
    return '<div style="font-size:11.5px;color:var(--text3);margin-top:1px">↑ ' + fmtMoneda(ing, mon) + dot + '↓ ' + fmtMoneda(gas, mon) +
      dot + '<span style="color:' + color + ';font-weight:700">= ' + sgn + fmtMoneda(Math.abs(margen), mon) + pctTxt + '</span></div>';
  };
  const lines = [];
  if (bucket.ing.uyu || bucket.gas.uyu) lines.push(linea('🇺🇾 UY$', bucket.ing.uyu, bucket.gas.uyu, bucket.margen.uyu));
  if (bucket.ing.usd || bucket.gas.usd) lines.push(linea('🇺🇸 USD', bucket.ing.usd, bucket.gas.usd, bucket.margen.usd));
  if (!lines.length) return '';
  return '<div class="ec-row" style="flex-direction:column;align-items:flex-start;gap:0;padding:8px 16px' + (opts.muted ? ';opacity:.7' : '') + '">' +
    '<div style="font-weight:700;font-size:13px' + (opts.muted ? ';color:var(--text3)' : '') + '">' + esc(nombre) + '</div>' +
    lines.join('') + '</div>';
}
// Re-renderiza SOLO el contenedor de Rentabilidad (usa M._ceoRentaData ya calculado — sin refetch).
function renderCeoRentaBody() {
  const el = document.getElementById('ceo-renta-body');
  if (!el) return;
  const d = M._ceoRentaData;
  if (!d) { el.innerHTML = ceoRentaChipsHTML() + '<div class="coord-empty" style="padding:12px 16px">' + t('ceo.renta.empty') + '</div>'; return; }
  const sortByMargen = (a, b) => (b.margen.uyu - a.margen.uyu) || (b.margen.usd - a.margen.usd);
  let body = '';
  if (M._ceoRentaView === 'cliente') {
    const arr = d.cliente.slice().sort(sortByMargen);
    body = arr.map(c => rentaRowHTML(c.nombre, c)).join('') + rentaRowHTML(t('ceo.renta.sinvincular.cliente'), d.sinVincCliente, { muted: true });
  } else if (M._ceoRentaView === 'servicio') {
    const arr = d.servicio.slice().sort(sortByMargen);
    body = arr.map(s => rentaRowHTML(s.nombre, s)).join('') + rentaRowHTML(t('ceo.renta.sinvincular.servicio'), d.sinVincServicio, { muted: true });
  } else {
    const arr = d.pais.slice().sort(sortByMargen);
    const paisHTML = arr.map(p => rentaRowHTML(p.nombre, p)).join('');
    const mesesHTML = d.meses.length ? ('<div class="ec-title" style="padding:10px 16px 2px">' + t('ceo.renta.evolucion') + '</div>' + d.meses.map(m => rentaRowHTML(fmtMesRentaLabel(m.mes), m)).join('')) : '';
    body = paisHTML + mesesHTML;
  }
  if (!body.trim()) body = '<div class="coord-empty" style="padding:12px 16px">' + t('ceo.renta.empty') + '</div>';
  el.innerHTML = ceoRentaChipsHTML() + body;
}

// ── CRM comercial v1 (📊, desplegable debajo de "📈 Rentabilidad") ─────────────────────────────────
// Sobre TODAS las propuestas (no solo las abiertas — ver propAllPromise en renderCEOMetricas):
//   1) Embudo por etapa: conteo por 'Estado pipeline', ordenado por el pipeline real (estados
//      desconocidos/legacy van al final — nunca se descartan, solo pierden orden).
//   2) Conversión: % Aceptadas / (Aceptadas + Rechazadas + Sin respuesta) ("de las cerradas") +
//      "N aceptadas de M totales" (M = TODAS las propuestas, no solo las cerradas).
//   3) Valor del pipeline: suma de 'Importe estimado' por estado, SOLO estados abiertos (excluye
//      Aceptada/Rechazada/Sin respuesta), separado por 'Moneda' — UY$ y USD NUNCA se mezclan.
//   4) Tiempo de cierre (aprox): promedio de días entre 'Fecha de envío' y 'Última interacción' para
//      las Aceptadas que tengan ambas fechas (se saltean las que falten alguna).
const PIPELINE_ESTADOS = ['🆕 Nuevo lead', '📞 Contactado', '🔍 Relevamiento', '⏳ En preparación', '✅ Aprobada internamente', '📤 Enviada al cliente', '🤝 Negociando', '✅ Aceptada', '❌ Rechazada', '😶 Sin respuesta', '🔄 Reactivo'];
function computeComercial(allProps) {
  const orderIdx = e => { const i = PIPELINE_ESTADOS.indexOf(e); return i === -1 ? PIPELINE_ESTADOS.length : i; };
  const estadoDeProp = p => p.properties?.['Estado pipeline']?.select?.name || t('ceo.com.sinestado');
  const isAceptada  = est => est.includes('Aceptada');
  const isRechazada = est => est.includes('Rechazada');
  const isSinResp   = est => est.includes('Sin respuesta');

  const estCount = {};
  (allProps || []).forEach(p => { const est = estadoDeProp(p); estCount[est] = (estCount[est] || 0) + 1; });
  const embudo = Object.entries(estCount).sort((a, b) => orderIdx(a[0]) - orderIdx(b[0]));

  const total = (allProps || []).length;
  let nAcept = 0, nCerradas = 0;
  (allProps || []).forEach(p => {
    const est = estadoDeProp(p);
    if (isAceptada(est)) { nAcept++; nCerradas++; }
    else if (isRechazada(est) || isSinResp(est)) nCerradas++;
  });
  const conv = nCerradas > 0 ? Math.round(nAcept / nCerradas * 100) : null;

  const valueByEstado = {};
  (allProps || []).forEach(p => {
    const est = estadoDeProp(p);
    if (isAceptada(est) || isRechazada(est) || isSinResp(est)) return; // solo estados abiertos
    const importe = p.properties?.['Importe estimado']?.number;
    if (!importe) return;
    const moneda = p.properties?.['Moneda']?.select?.name || '🇺🇸 USD';
    const esUY = moneda === '🇺🇾 UY$';
    const b = (valueByEstado[est] = valueByEstado[est] || { uyu: 0, usd: 0 });
    if (esUY) b.uyu += importe; else b.usd += importe;
  });
  const valueEntries = Object.entries(valueByEstado).sort((a, b) => orderIdx(a[0]) - orderIdx(b[0]));

  const diffs = [];
  (allProps || []).forEach(p => {
    if (!isAceptada(estadoDeProp(p))) return;
    const fe = (p.properties?.['Fecha de envío']?.date?.start || '').split('T')[0];
    const ui = (p.properties?.['Última interacción']?.date?.start || '').split('T')[0];
    if (!fe || !ui) return;
    const days = Math.round((new Date(ui + 'T00:00:00') - new Date(fe + 'T00:00:00')) / 86400000);
    // days<0 = fechas cargadas al revés (mala carga): se excluye para no ensuciar el promedio.
    if (!isNaN(days) && days >= 0) diffs.push(days);
  });
  const avgDays = diffs.length ? Math.round(diffs.reduce((a, b) => a + b, 0) / diffs.length) : null;

  return { embudo, total, nAcept, conv, valueEntries, avgDays };
}

// Sub-bloque 🎯 Prospección (spec 2026-07-02 B2): SOLO conteos por estado + "nuevos esta semana"
// best-effort (created_time no siempre disponible — degrada mostrando solo los conteos, nunca rompe).
function computeProspeccionMetrics(clientes) {
  const estadoDe = c => c.properties?.['Estado']?.select?.name || '';
  const porEstado = {};
  M.PROSPECCION_ESTADOS.forEach(e => { porEstado[e] = 0; });
  (clientes || []).forEach(c => { const e = estadoDe(c); if (M.PROSPECCION_ESTADOS.includes(e)) porEstado[e]++; });
  const total = (clientes || []).length;
  // "Nuevos esta semana": requiere created_time (el path Notion lo trae; un espejo/mirror podría no
  // traerlo) — si ningún registro lo tiene, degradamos a null y el render omite esa línea.
  const haceUnaSemana = Date.now() - 7 * 86400000;
  const conCreatedTime = (clientes || []).filter(c => !!c.created_time);
  const nuevosSemana = conCreatedTime.length
    ? conCreatedTime.filter(c => new Date(c.created_time).getTime() >= haceUnaSemana).length
    : null;
  return { porEstado, total, nuevosSemana };
}

// HTML del sub-bloque Prospección — independiente del resto de Comercial (se pinta aunque
// M._ceoComData sea null, y viceversa: guardado en ambos sentidos, spec "nunca rompe").
function prospeccionSubBlockHTML() {
  const pd = M._ceoProspData;
  if (!pd) return '';
  const filas = M.PROSPECCION_ESTADOS.map(e => '<div class="ec-row"><span>' + esc(e) + '</span><span>' + (pd.porEstado[e] || 0) + '</span></div>').join('');
  const nuevosHTML = pd.nuevosSemana != null ? '<div class="kpi-sub" style="padding-top:4px">' + pd.nuevosSemana + ' ' + t('ceo.com.prosp.nuevos') + '</div>' : '';
  return '<div class="ec-title" style="padding:14px 16px 2px">' + t('ceo.com.prosp.title') + '</div><div style="padding:0 16px 8px">' + filas + nuevosHTML + '</div>';
}

// Re-renderiza SOLO el contenedor de Comercial (usa M._ceoComData/M._ceoProspData ya calculados — sin refetch).
export function renderCeoComBody() {
  const el = document.getElementById('ceo-com-body');
  if (!el) return;
  const d = M._ceoComData;
  let html;
  if (!d) {
    html = '<div class="coord-empty" style="padding:12px 16px">' + t('ceo.com.empty') + '</div>';
  } else {
    const maxEmbudo = Math.max(1, ...d.embudo.map(([, v]) => v));
    const embudoHTML = d.embudo.length
      ? d.embudo.map(([k, v]) => '<div class="tipo-row"><span class="tipo-name">' + esc(k) + '</span><span class="tipo-bar"><span style="width:' + Math.round(v / maxEmbudo * 100) + '%"></span></span><span class="tipo-val">' + v + '</span></div>').join('')
      : '<div class="kpi-sub" style="padding:8px 16px">' + t('ceo.com.embudo.empty') + '</div>';

    const convHTML = d.conv != null
      ? '<div class="ec-row"><span>' + d.conv + '% ' + t('ceo.com.conversion.label') + '</span></div><div class="kpi-sub">' + t('ceo.com.conversion.sub').replace('{n}', d.nAcept).replace('{t}', d.total) + '</div>'
      : '<div class="kpi-sub">—</div>';

    const pipelineHTML = d.valueEntries.length
      ? d.valueEntries.map(([k, v]) => '<div class="ec-row"><span>' + esc(k) + '</span><span>' + fmtTotalSplit(v) + '</span></div>').join('')
      : '<div class="kpi-sub" style="padding:8px 0">' + t('ceo.com.pipeline.empty') + '</div>';

    const cierreHTML = d.avgDays != null
      ? '<div class="ec-row"><span>' + t('ceo.com.cierre.label') + '</span><span>' + d.avgDays + ' ' + t('ceo.com.cierre.dias') + '</span></div>'
      : '<div class="kpi-sub">—</div>';

    html =
      '<div class="ec-title" style="padding:10px 16px 2px">' + t('ceo.com.embudo.title') + '</div>' + embudoHTML +
      '<div class="ec-title" style="padding:14px 16px 2px">' + t('ceo.com.conversion.title') + '</div><div style="padding:0 16px 8px">' + convHTML + '</div>' +
      '<div class="ec-title" style="padding:6px 16px 2px">' + t('ceo.com.pipeline.title') + '</div><div style="padding:0 16px 8px">' + pipelineHTML + '</div>' +
      '<div class="ec-title" style="padding:6px 16px 2px">' + t('ceo.com.cierre.title') + '</div><div style="padding:0 16px 10px">' + cierreHTML + '</div>';
  }
  // Sub-bloque Prospección al final (spec): independiente de si Comercial arriba tuvo datos o no.
  el.innerHTML = html + prospeccionSubBlockHTML();
}

export async function renderCEOServicios() {
  const content = document.getElementById('ceo-content');
  content.innerHTML = '<div style="text-align:center;padding:40px 0"><div class="spinner" style="margin:0 auto"></div></div>';
  try {
    const cf = getCEOFilter();
    // Fase CEO 1 (bloque 2): el selector de período MANDA también acá (antes: fijo "del mes en adelante").
    // Los "En curso" se muestran SIEMPRE aunque su fecha caiga fuera del período (misma regla que el coord).
    const { start, end, label } = getCEOPeriodRange();
    const enRango = { and: [
      { property: 'Fecha programada', date: { on_or_after: start } },
      { property: 'Fecha programada', date: { on_or_before: end } },
    ]};
    const conEnCurso = { or: [enRango, { property: 'Estado', select: { equals: '✈️ En curso' } }] };
    const dateFilter = M.ceoPeriod.mode === 'todo' ? null : conEnCurso;
    const filtro = cf ? (dateFilter ? { and: [cf, dateFilter] } : cf) : dateFilter;
    const data = await callNotion(`databases/${M.DB_ID}/query`, 'POST', {
      ...(filtro ? { filter: filtro } : {}),
      sorts: [{ property: 'Fecha programada', direction: 'descending' }]
    });
    let results = data.results || [];
    if (cf) {
      const notionVal = M.COUNTRY_NOTION_MAP[M.ceoViewCountry];
      results = results.filter(s => s.properties?.['País']?.select?.name === notionVal);
    }
    results = results.filter(s => !esArchivado(s));
    // Enforce del período TAMBIÉN client-side: la lectura de servicios entra por el backstop /api/db,
    // que ignora los filtros estilo Notion del query → sin esto el selector no tendría efecto real.
    if (M.ceoPeriod.mode !== 'todo') {
      results = results.filter(s => {
        const est = s.properties?.['Estado']?.select?.name || '';
        if (est.includes('En curso')) return true; // en curso SIEMPRE visible (regla del coord)
        const f = (s.properties?.['Fecha programada']?.date?.start || '').slice(0, 10);
        return f && f >= start && f <= end;
      });
    }
    results.sort((a, b) => ((b.properties?.['Fecha programada']?.date?.start) || '').localeCompare((a.properties?.['Fecha programada']?.date?.start) || ''));
    if (!results.length) { content.innerHTML = renderCEOPeriodSelector() + `<div class="coord-empty">${t('ceo.empty.servicios')}</div>`; return; }
    const ESTADO_CLASS = { '✅ Completado': 'estado-completado', '✈️ En curso': 'estado-en-curso', '🔄 Asignado': 'estado-asignado' };
    const paiFlag = { '🇺🇾 Uruguay': '🇺🇾', '🇧🇷 Brasil': '🇧🇷', '🇵🇦 Panamá': '🇵🇦', '🇬🇹 Guatemala': '🇬🇹', '🇲🇽 México': '🇲🇽' };
    const dateLocaleCeo = currentLang === 'pt-BR' ? 'pt-BR' : 'es-UY';
    M._ceoServiciosCache = results;
    await ensureClienteNombres(); // el CEO ve 'all' → el mapa resuelve el cliente de cualquier país
    if (M.activeCEOTab !== 'servicios') return; // cambió de tab mientras cargaba → NO pisar
    content.innerHTML = renderCEOPeriodSelector() +
      `<div class="ceo-section-title">${t('ceo.servicios.title')} · ${esc(label)}</div>` + results.map(s => {
      const props = s.properties || {};
      const nombre = props['Nombre del servicio']?.title?.[0]?.plain_text || t('common.sinnombre');
      const estado = props['Estado']?.select?.name || '';
      const tipo = tipoServicioStr(props);
      const fecha = props['Fecha programada']?.date?.start || '';
      const pais = props['País']?.select?.name || '';
      const operario = props['Operario App']?.select?.name || (props['Operario(s)']?.people?.[0]?.name || '');
      const fechaFmt = fecha ? new Date(fecha + 'T00:00:00').toLocaleDateString(dateLocaleCeo, { day:'numeric', month:'short' }) : '';
      const _contactoId = props['Contacto']?.relation?.[0]?.id || props['Contactos']?.relation?.[0]?.id || '';
      const _cliN = clienteNombreDe(_contactoId);
      const cliLine = _contactoId
        ? (_cliN ? `<div style="font-size:12px;color:var(--text2);margin-top:2px">🏢 ${esc(_cliN)}</div>` : '')
        : `<div style="font-size:12px;color:var(--amber,#f59e0b);margin-top:2px">${t('svc.cliente.placeholder')}</div>`;
      return `<div class="ceo-service-card">
        <div class="ceo-service-name">${esc(nombre)} ${paiFlag[pais] || ''}</div>
        ${cliLine}
        <div class="ceo-service-meta">
          <span class="service-estado ${ESTADO_CLASS[estado] || 'estado-pendiente'}">${estado}</span>
          ${jobCompleto(s, M._ceoServiciosCache) ? `<span class="coord-tag" style="background:var(--green-dark,#14532d);color:var(--green,#22c55e)">${t('badge.servicio.completo')}</span>` : ''}
          ${tipo ? `<span class="coord-tag">${tipo}</span>` : ''}
          ${fechaFmt ? `<span class="coord-tag">📅 ${fechaFmt}</span>` : ''}
          ${operario ? `<span class="coord-tag">👤 ${operario}</span>` : ''}
        </div>
        ${estado.includes('Completado') ? `<button class="report-pdf-btn" style="margin:8px 0 0;width:auto;padding:8px 14px;font-size:12px" onclick="generateReportPDFFromCEO('${s.id}')">📄 ${t('pdf.btn.servicio')}</button>` : ''}
      </div>`;
    }).join('');
  } catch (e) {
    content.innerHTML = `<div class="coord-empty">${t('ceo.error.servicios')}<br><small>${esc(e.message)}</small></div>`;
  }
}

// Rango de fechas según el selector de período del CEO (mes / semana / año / rango / todo).
// ─────────────────────────────────────────────
// 🏠 INICIO ejecutivo (Fase CEO 1, 2026-07-18) — una pantalla, cinco respuestas: cómo venimos (hero con
// delta vs período anterior EN TODOS LOS MODOS), qué pasa AHORA (en vivo desde el espejo), dónde está la
// plata (KPIs), qué viene (pipeline) y qué pide atención (excepciones tocables). Principios del diseño:
// todo número lleva delta · todo dato es una puerta · excepciones arriba. Ver artifact "Fase CEO".
// ─────────────────────────────────────────────

// Rango del período ANTERIOR equivalente al activo (para los deltas). null si no tiene sentido (todo).
function getCEOPrevRange() {
  const p = M.ceoPeriod;
  const iso = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const now = new Date();
  if (p.mode === 'todo') return null;
  if (p.mode === 'semana') {
    const b = new Date(now); b.setHours(0, 0, 0, 0); b.setDate(b.getDate() + (p.off - 1) * 7);
    const dow = (b.getDay() + 6) % 7; const mon = new Date(b); mon.setDate(b.getDate() - dow);
    const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
    return { start: iso(mon), end: iso(sun) };
  }
  if (p.mode === 'anio') { const y = now.getFullYear() + p.off - 1; return { start: y + '-01-01', end: y + '-12-31' }; }
  if (p.mode === 'rango') {
    if (!p.from || !p.to) return null;
    const f = new Date(p.from + 'T00:00:00'), t0 = new Date(p.to + 'T00:00:00');
    const days = Math.round((t0 - f) / 86400000) + 1;
    const pf = new Date(f); pf.setDate(pf.getDate() - days);
    const pt = new Date(f); pt.setDate(pt.getDate() - 1);
    return { start: iso(pf), end: iso(pt) };
  }
  const base = new Date(now.getFullYear(), now.getMonth() + p.off - 1, 1);
  return { start: iso(base), end: iso(new Date(base.getFullYear(), base.getMonth() + 1, 0)) };
}

// Delta ▲▼% (o pp para porcentajes). null → ''. Regla del diseño: todo número con contexto.
function ceoiDelta(cur, prev, { pp = false } = {}) {
  if (prev == null || cur == null) return '';
  if (!pp && !prev) return '';
  const d = pp ? Math.round(cur - prev) : Math.max(-999, Math.min(999, Math.round((cur - prev) / Math.abs(prev) * 100)));
  if (!d) return '<span class="ceoi-eq">=</span>';
  const cls = d > 0 ? 'ceoi-up' : 'ceoi-dn';
  return '<span class="' + cls + '">' + (d > 0 ? '▲' : '▼') + Math.abs(d) + (pp ? 'pp' : '%') + '</span>';
}

const CEOI_TERMINALES = ['✅ Aceptada', '❌ Rechazada', '😶 Sin respuesta'];

let _ceoiAgg = null;      // agregado por país del último render del Inicio (comparativa completa)
let _ceoiProps = null;    // propuestas abiertas del último render (pipeline navegable)

// ⇄ Comparativa completa de países (Fase CEO 2): tabla ingresos/gastos/balance/servicios lado a lado,
// con los datos que el Inicio YA cargó (cero fetch extra).
export function toggleCeoiPaises() {
  const full = document.getElementById('ceoi-paises-full');
  const chev = document.getElementById('ceoi-paises-chev');
  if (!full || !_ceoiAgg) return;
  const abrir = full.style.display === 'none';
  if (chev) chev.textContent = abrir ? '▴' : '▾';
  if (!abrir) { full.style.display = 'none'; return; }
  const ORDEN = ['🇺🇾 UY', '🇧🇷 BR', '🇵🇦 PA', '🇬🇹 GT', '🇲🇽 MX'];
  const keys = ORDEN.filter((k, i) => i < 3 || _ceoiAgg[k]);
  const fm = (u, d) => { const p = []; if (u) p.push(fmtMoneda(u, true)); if (d) p.push(fmtMoneda(d, false)); return p.join('<br>') || '—'; };
  const fila = (lab, fn, color) => '<tr><td>' + lab + '</td>' + keys.map(k => { const a = _ceoiAgg[k]; return '<td class="num"' + (color ? ' style="color:' + color + '"' : '') + '>' + (a ? fn(a) : '—') + '</td>'; }).join('') + '</tr>';
  full.innerHTML = '<div class="ceoi-card" style="overflow-x:auto;margin-top:0"><table class="ceoi-table">' +
    '<tr><th></th>' + keys.map(k => '<th>' + k.split(' ')[0] + '</th>').join('') + '</tr>' +
    fila('Ingresos', a => fm(a.ingU, a.ingD), 'var(--green)') +
    fila('Gastos', a => fm(a.gasU, a.gasD), '#ff8a8a') +
    fila('Balance', a => { const p = []; if (a.uyu) p.push((a.uyu >= 0 ? '+' : '−') + fmtMoneda(Math.abs(a.uyu), true)); if (a.usd) p.push((a.usd >= 0 ? '+' : '−') + fmtMoneda(Math.abs(a.usd), false)); return p.join('<br>') || '—'; }) +
    fila('Completados', a => a.comp || '—') +
    fila('En curso', a => a.curso || '—') +
    '</table></div>';
  full.style.display = '';
}

// 📤 Pipeline navegable (Fase CEO 2): del número a LA LISTA — cada propuesta abierta con estado, días
// sin respuesta e importe, ordenadas por las más frías primero. Datos ya cargados (cero fetch extra).
export function toggleCeoiPipe() {
  const full = document.getElementById('ceoi-pipe-full');
  const chev = document.getElementById('ceoi-pipe-chev');
  if (!full || !_ceoiProps) return;
  const abrir = full.style.display === 'none';
  if (chev) chev.textContent = abrir ? '▴' : '▾';
  if (!abrir) { full.style.display = 'none'; return; }
  const rows = _ceoiProps.slice().sort((a, b) => (b.properties?.['Días sin respuesta']?.formula?.number || 0) - (a.properties?.['Días sin respuesta']?.formula?.number || 0));
  full.innerHTML = rows.slice(0, 20).map(p => {
    const pr = p.properties || {};
    const nom = pr['Nombre de propuesta']?.title?.[0]?.plain_text || '(propuesta)';
    const est = pr['Estado pipeline']?.select?.name || '';
    const dias = pr['Días sin respuesta']?.formula?.number;
    const imp = pr['Importe estimado']?.number;
    return '<div class="ceoi-item" style="font-size:12px">' + esc(nom) +
      '<span style="color:var(--text3);margin-left:6px">' + esc(est) + (dias != null ? ' · ' + dias + 'd' : '') + '</span>' +
      (imp ? '<span style="margin-left:auto;font-weight:700" class="num">$ ' + Math.round(imp).toLocaleString('es-UY') + '</span>' : '') + '</div>';
  }).join('') + (rows.length > 20 ? '<div class="ceoi-item" style="color:var(--text3)">… y ' + (rows.length - 20) + ' más</div>' : '');
  full.style.display = '';
}

export async function renderCEOInicio() {
  const content = document.getElementById(M._ceoContentId);
  if (!content) return;
  content.innerHTML = ceoHeaderHTML('🏠 Inicio') + renderCEOPeriodSelector() +
    '<div style="text-align:center;padding:40px 0"><div class="spinner" style="margin:0 auto"></div></div>';
  const myTab = 'inicio';
  try {
    const { start, end, label } = getCEOPeriodRange();
    const prev = getCEOPrevRange();
    const fcf = getCEOFinanceFilter();
    const dFilter = (s0, e0) => { const f = { and: [{ property: 'Fecha', date: { on_or_after: s0 } }, { property: 'Fecha', date: { on_or_before: e0 } }] }; if (fcf) f.and.push(fcf); return f; };

    // Servicios e ingresos FRESCOS del espejo (rápido y en tiempo real — el corazón del bloque HOY);
    // finanzas del período por el camino probado de Métricas. Todo en paralelo.
    const svcPromise = (async () => {
      try { const r = await callDb('servicios'); return r.results || []; }
      catch (e) {
        if (M._ceoServiciosAll && M._ceoServiciosAll.length) return M._ceoServiciosAll;
        try { const r2 = await callNotion(`databases/${M.DB_ID}/query`, 'POST', { page_size: 100 }); return r2.results || []; }
        catch (e2) { return []; }
      }
    })();
    const ingAllPromise = (async () => {
      try { const r = await callDb('ingresos'); return r.results || []; }
      catch (e) {
        // Espejo vacío/caído → Notion (el cruce sin-cobro es demasiado importante para saltearlo en silencio).
        try { const r2 = await callNotionAll(`databases/${M.INGRESOS_DB_ID}/query`, {}); return r2.results || []; }
        catch (e2) { return null; }
      }
    })();
    const propPromise = (async () => {
      try { const r = await callDb('propuestas'); return r.results || []; }
      catch (e) { try { const r2 = await callNotionAll(`databases/${M.PROPUESTAS_DB_ID}/query`, {}); return r2.results || []; } catch (e2) { return []; } }
    })();
    const docsPromise = (async () => {
      if (!M.DOCUMENTOS_DB_ID) return [];
      try { const r = await callNotion(`databases/${M.DOCUMENTOS_DB_ID}/query`, 'POST', { page_size: 100 }); return r.results || []; }
      catch (e) { return []; }
    })();
    const [ingData, gasData, ingPrev, gasPrev, svcAll0, ingAll, propAll, docs] = await Promise.all([
      callNotionAll(`databases/${M.INGRESOS_DB_ID}/query`, { filter: dFilter(start, end) }),
      callNotionAll(`databases/${M.GASTOS_DB_ID}/query`, { filter: dFilter(start, end) }),
      prev ? callNotionAll(`databases/${M.INGRESOS_DB_ID}/query`, { filter: dFilter(prev.start, prev.end) }) : Promise.resolve(null),
      prev ? callNotionAll(`databases/${M.GASTOS_DB_ID}/query`, { filter: dFilter(prev.start, prev.end) }) : Promise.resolve(null),
      svcPromise, ingAllPromise, propPromise, docsPromise,
    ]);
    if (M.activeCEOTab !== myTab) return;
    _ceoDataTime = Date.now();

    // País: mismo criterio que Métricas (el fallback del server ignora filtros → re-filtro cliente).
    const notionVal = M.ceoViewCountry === 'all' ? null : M.COUNTRY_NOTION_MAP[M.ceoViewCountry];
    const svcAll = (svcAll0 || []).filter(s0 => !esArchivado(s0) && (!notionVal || s0.properties?.['País']?.select?.name === notionVal));
    const estadoDe = s0 => (s0.properties?.['Estado']?.select?.name) || '';
    const tipoDe = s0 => (s0.properties?.['Tipo de registro']?.select?.name) || '';
    const fechaDe = s0 => (s0.properties?.['Fecha programada']?.date?.start || '').slice(0, 10);

    // ── Cómo venimos: balance con delta (en TODOS los modos) ──
    const ingSplit = sumByMoneda(ingData.results, 'ingreso');
    const gasSplit = sumByMoneda(gasData.results, 'gasto');
    const bal = { uyu: ingSplit.uyu - gasSplit.uyu, usd: ingSplit.usd - gasSplit.usd };
    let balPrev = null, ingPrevSplit = null;
    if (ingPrev && gasPrev) {
      ingPrevSplit = sumByMoneda(ingPrev.results, 'ingreso');
      const gp = sumByMoneda(gasPrev.results, 'gasto');
      balPrev = { uyu: ingPrevSplit.uyu - gp.uyu, usd: ingPrevSplit.usd - gp.usd };
    }
    const enPeriodo = s0 => { const f = fechaDe(s0); return f ? (f >= start && f <= end) : (M.ceoPeriod.mode === 'todo'); };
    const enPrev = s0 => { const f = fechaDe(s0); return !!(prev && f && f >= prev.start && f <= prev.end); };
    const esFacturable = s0 => { const tp = tipoDe(s0); return !tp.includes('Prueba') && !tp.includes('Relevamiento') && !tp.includes('Jornada'); };
    const comp = svcAll.filter(s0 => estadoDe(s0).includes('Completado') && enPeriodo(s0));
    const compPrev = svcAll.filter(s0 => estadoDe(s0).includes('Completado') && enPrev(s0));
    const ticket = comp.length ? (ingSplit.uyu ? ingSplit.uyu / comp.length : ingSplit.usd / comp.length) : null;
    const ticketEsUY = !!ingSplit.uyu;
    const ticketPrev = (compPrev.length && ingPrevSplit) ? (ticketEsUY ? ingPrevSplit.uyu / compPrev.length : ingPrevSplit.usd / compPrev.length) : null;
    const margen = ingSplit.uyu > 0 ? Math.round(bal.uyu / ingSplit.uyu * 100) : (ingSplit.usd > 0 ? Math.round(bal.usd / ingSplit.usd * 100) : null);
    const margenPrev = (ingPrevSplit && balPrev) ? (ingPrevSplit.uyu > 0 ? Math.round(balPrev.uyu / ingPrevSplit.uyu * 100) : (ingPrevSplit.usd > 0 ? Math.round(balPrev.usd / ingPrevSplit.usd * 100) : null)) : null;

    // ── Qué pasa AHORA ──
    const hoyISO = new Date().toISOString().slice(0, 10);
    const deHoy = svcAll.filter(s0 => fechaDe(s0) === hoyISO && !estadoDe(s0).includes('Cancelado'));
    const enCurso = svcAll.filter(s0 => estadoDe(s0).includes('En curso'));
    const opsActivos = new Set(enCurso.map(s0 => s0.properties?.['Operario App']?.select?.name).filter(Boolean));
    const pendHoy = deHoy.filter(s0 => !estadoDe(s0).includes('Completado') && !estadoDe(s0).includes('En curso')).length;

    // ── Qué pide atención (excepciones TOCABLES) ──
    const att = [];
    if (ingAll) { // sin cobro: completados facturables sin ingreso vinculado (histórico, como Por cobrar)
      const conCobro = new Set();
      (ingAll || []).forEach(r => {
        const rel = (r.properties?.['Servicio vinculado']?.relation || []).concat(r.properties?.['Servicio']?.relation || []);
        rel.forEach(x => conCobro.add((x.id || '').replace(/-/g, '')));
      });
      const sinCobro = svcAll.filter(s0 => estadoDe(s0).includes('Completado') && esFacturable(s0) && !conCobro.has((s0.id || '').replace(/-/g, ''))).length;
      if (sinCobro) att.push({ icon: '💸', txt: sinCobro + ' servicio' + (sinCobro > 1 ? 's' : '') + ' completado' + (sinCobro > 1 ? 's' : '') + ' sin cobro', tap: "setCEOTab('porcobrar')" });
    }
    const sinGestionar = svcAll.filter(s0 => { const e0 = estadoDe(s0); return (e0.includes('Pendiente') || e0.includes('Asignado')) && (!s0.properties?.['Operario App']?.select?.name || !fechaDe(s0)); }).length;
    if (sinGestionar) att.push({ icon: '📋', txt: sinGestionar + ' servicio' + (sinGestionar > 1 ? 's' : '') + ' sin operario o sin fecha', tap: "setCEOTab('servicios')" });
    (docs || []).forEach(r => {
      const p = r.properties || {};
      const e0 = p['Estado']?.select?.name || '';
      if (!(e0.includes('Vigente') || e0.includes('Por vencer') || e0.includes('Vencido'))) return;
      const vence = p['Vence']?.date?.start || ''; if (!vence) return;
      const umbral = (p['Días de aviso']?.number != null) ? p['Días de aviso'].number : 30;
      const daysLeft = Math.round((new Date(vence) - new Date()) / 86400000);
      if (daysLeft > umbral) return;
      const nombre = p['Documento']?.title?.[0]?.plain_text || 'Documento';
      att.push({ icon: '🧾', txt: daysLeft < 0 ? nombre + ' VENCIDO' : nombre + ' vence en ' + daysLeft + ' día' + (daysLeft === 1 ? '' : 's') });
    });

    // ── Semáforo ──
    const neg = (bal.uyu < 0 ? 1 : 0) + (bal.usd < 0 ? 1 : 0);
    const sem = neg === 0 ? { cls: 'ok', txt: '🟢 Negocio sano' } : neg === 1 ? { cls: 'warn', txt: '🟡 Una moneda en rojo' } : { cls: 'bad', txt: '🔴 Balance negativo' };

    // ── Países lado a lado (solo con vista global) ──
    let paisesHTML = '';
    if (M.ceoViewCountry === 'all') {
      const agg = {};
      const acc = (results, kind) => (results || []).filter(kpiIncluido).forEach(r => {
        const pais = r.properties?.['País']?.select?.name || '🇺🇾 UY';
        const { esUY, monto } = montoOf(r.properties || {}, kind);
        agg[pais] = agg[pais] || { uyu: 0, usd: 0, ingU: 0, ingD: 0, gasU: 0, gasD: 0, comp: 0, curso: 0 };
        const sign = kind === 'ingreso' ? 1 : -1;
        if (esUY) agg[pais].uyu += sign * monto; else agg[pais].usd += sign * monto;
        if (kind === 'ingreso') { if (esUY) agg[pais].ingU += monto; else agg[pais].ingD += monto; }
        else { if (esUY) agg[pais].gasU += monto; else agg[pais].gasD += monto; }
      });
      acc(ingData.results, 'ingreso'); acc(gasData.results, 'gasto');
      // Servicios del período por país (completados + en curso) para la comparativa completa.
      svcAll.forEach(s0 => {
        const k = s0.properties?.['País']?.select?.name || '🇺🇾 UY';
        agg[k] = agg[k] || { uyu: 0, usd: 0, ingU: 0, ingD: 0, gasU: 0, gasD: 0, comp: 0, curso: 0 };
        if (estadoDe(s0).includes('Completado') && enPeriodo(s0)) agg[k].comp++;
        if (estadoDe(s0).includes('En curso')) agg[k].curso++;
      });
      _ceoiAgg = agg; // para la comparativa completa (toggleCeoiPaises)
      const ORDEN = [['🇺🇾 UY', 'Uruguay'], ['🇧🇷 BR', 'Brasil'], ['🇵🇦 PA', 'Panamá'], ['🇬🇹 GT', 'Guatemala'], ['🇲🇽 MX', 'México']];
      // Los 3 países operativos SIEMPRE visibles (BR/PA apagados si aún no tienen datos — la estructura
      // lista para la expansión, decisión del diseño); GT/MX solo cuando tengan movimiento.
      const chips = ORDEN.filter(([k], i) => i < 3 || agg[k]).slice(0, 5).map(([k, country]) => {
        const a = agg[k];
        const flag = k.split(' ')[0];
        if (!a || (!a.uyu && !a.usd)) return '<div class="ceoi-pais off" onclick="setCEOCountry(\'' + country + '\')"><span class="f">' + flag + '</span><div class="m">—</div></div>';
        const m = a.uyu ? fmtMoneda(a.uyu, true) : fmtMoneda(a.usd, false);
        const col = (a.uyu || a.usd) >= 0 ? 'style="color:var(--green)"' : 'style="color:#ff8a8a"';
        return '<div class="ceoi-pais" onclick="setCEOCountry(\'' + country + '\')"><span class="f">' + flag + '</span><div class="m" ' + col + '>' + (((a.uyu || a.usd) >= 0 ? '+' : '')) + m + '</div></div>';
      }).join('');
      paisesHTML = '<div class="ceoi-paises">' + chips + '</div>' +
        '<div class="ceoi-item tap" style="margin:-4px 16px 10px;padding:6px 4px;font-size:12px;color:var(--text2)" onclick="toggleCeoiPaises()">⇄ Comparativa completa de países <span class="chev" id="ceoi-paises-chev">▾</span></div>' +
        '<div id="ceoi-paises-full" style="display:none"></div>';
    }

    // ── Pipeline (informativo v1; navegable = Fase 2) ──
    const propAbiertas = (propAll || []).filter(r => { if (esArchivado(r)) return false; const e0 = r.properties?.['Estado pipeline']?.select?.name || ''; return e0 && !CEOI_TERMINALES.some(t0 => e0 === t0); });
    const propFrias = propAbiertas.filter(r => { const d = r.properties?.['Días sin respuesta']?.formula?.number; return d != null && d >= 15; }).length;
    _ceoiProps = propAbiertas;
    const propValor = propAbiertas.reduce((s0, r) => s0 + (r.properties?.['Importe estimado']?.number || 0), 0);

    // ── Render ──
    const fmtBal = (v, esUY) => (v >= 0 ? '+' : '−') + fmtMoneda(Math.abs(v), esUY);
    const heroRow = (cur, v, pv, esUY) =>
      '<div class="ceoi-hero-row"><span class="cur">' + cur + '</span><span class="amt ' + (v >= 0 ? 'pos' : 'neg') + '">' + fmtBal(v, esUY) + '</span>' + ceoiDelta(v, pv) +
      '<span class="ceoi-vs">' + (prev ? 'vs período anterior' : '') + '</span></div>';
    const enCursoHTML = enCurso.slice(0, 3).map(s0 => {
      const nom = s0.properties?.['Nombre del servicio']?.title?.[0]?.plain_text || '(servicio)';
      const op = s0.properties?.['Operario App']?.select?.name || '';
      const ini = s0.properties?.['Hora Inicio Efectivo']?.date?.start || '';
      const hh = ini ? new Date(ini).toLocaleTimeString('es-UY', { hour: '2-digit', minute: '2-digit' }) : '';
      const avance = s0.properties?.['% de avance']?.formula?.number ?? s0.properties?.['% de avance']?.number ?? null;
      return '<div class="row-tap" onclick="openServicioQuickView(\'' + esc(s0.id) + '\')">' +
        '<div class="l2">🚁 ' + esc(nom) + (op ? ' — ' + esc(op) : '') + (hh ? ' · desde ' + hh : '') + '</div>' +
        (avance != null ? '<div class="bar"><i style="width:' + Math.max(4, Math.min(100, Math.round(avance))) + '%"></i></div>' : '') + '</div>';
    }).join('');
    const attHTML = att.length
      ? att.map(a => '<div class="ceoi-item' + (a.tap ? ' tap' : '') + '"' + (a.tap ? ' onclick="' + a.tap + '"' : '') + '>' + a.icon + ' ' + esc(a.txt) + (a.tap ? '<span class="chev">›</span>' : '') + '</div>').join('')
      : '<div class="ceoi-item">✓ Todo en orden — nada pide tu atención</div>';

    content.innerHTML = ceoHeaderHTML('🏠 Inicio') + renderCEOPeriodSelector() +
      '<div class="ceoi-band ' + sem.cls + '">' + sem.txt + '<span class="att">' + (att.length ? att.length + ' tema' + (att.length > 1 ? 's' : '') + ' pide' + (att.length > 1 ? 'n' : '') + ' tu atención ↓' : 'sin temas pendientes') + '</span></div>' +
      '<div class="ceoi-card tap" onclick="setCEOTab(\'finanzas\')">' +
        '<div class="ceoi-lab">Balance · ' + esc(label) + '</div>' +
        heroRow('UY$', bal.uyu, balPrev ? balPrev.uyu : null, true) +
        heroRow('USD', bal.usd, balPrev ? balPrev.usd : null, false) +
      '</div>' +
      '<div class="ceoi-live">' +
        '<div class="lt"><span class="pulse"></span> HOY EN LA OPERACIÓN</div>' +
        '<div class="l1">' + deHoy.length + ' servicio' + (deHoy.length === 1 ? '' : 's') + ' hoy · ' + enCurso.length + ' en curso</div>' +
        enCursoHTML +
        '<div class="l2" style="margin-top:5px">' + pendHoy + ' pendiente' + (pendHoy === 1 ? '' : 's') + ' hoy · ' + opsActivos.size + ' operario' + (opsActivos.size === 1 ? '' : 's') + ' activo' + (opsActivos.size === 1 ? '' : 's') + '</div>' +
      '</div>' +
      '<div class="ceoi-kpis">' +
        '<div class="ceoi-kpi" onclick="setCEOTab(\'metricas\')"><div class="v">' + (ticket != null ? fmtMoneda(ticket, ticketEsUY) : '—') + '</div><div class="k">Ticket ' + (ticketEsUY ? 'UY$' : 'USD') + '</div><div class="d">' + ceoiDelta(ticket, ticketPrev) + '</div></div>' +
        '<div class="ceoi-kpi" onclick="setCEOTab(\'servicios\')"><div class="v">' + comp.length + '</div><div class="k">Servicios</div><div class="d">' + (prev ? ceoiDelta(comp.length, compPrev.length || null) : '') + '</div></div>' +
        '<div class="ceoi-kpi" onclick="setCEOTab(\'metricas\')"><div class="v">' + (margen != null ? margen + '%' : '—') + '</div><div class="k">Margen</div><div class="d">' + ceoiDelta(margen, margenPrev, { pp: true }) + '</div></div>' +
        '<div class="ceoi-kpi" onclick="setCEOTab(\'porcobrar\')"><div class="v">' + (att.find(a => a.icon === '💸') ? att.find(a => a.icon === '💸').txt.split(' ')[0] : '0') + '</div><div class="k">Sin cobro</div><div class="d"></div></div>' +
      '</div>' +
      paisesHTML +
      '<div class="ceoi-att' + (att.length ? '' : ' allok') + '"><div class="at">' + (att.length ? '⚠ ATENCIÓN (' + att.length + ')' : '✓ EN ORDEN') + '</div>' + attHTML + '</div>' +
      '<div class="ceoi-pipe"><div class="ceoi-lab">Pipeline</div>' +
        '<div class="ceoi-item tap" onclick="toggleCeoiPipe()">📤 ' + propAbiertas.length + ' propuesta' + (propAbiertas.length === 1 ? '' : 's') + ' activa' + (propAbiertas.length === 1 ? '' : 's') + (propValor ? ' · $ ' + Math.round(propValor).toLocaleString('es-UY') + ' en juego' : '') + '<span class="chev" id="ceoi-pipe-chev">▾</span></div>' +
        (propFrias ? '<div class="ceoi-item">⏳ ' + propFrias + ' sin respuesta hace +15 días</div>' : '') +
        '<div id="ceoi-pipe-full" style="display:none"></div>' +
      '</div>' +
      '<div class="ceoi-card tap" style="text-align:center;margin-bottom:18px" onclick="generateCEOExecPDF(this)">' +
        '<div style="font-weight:800;color:var(--green)">📄 Descargar resumen ejecutivo (PDF)</div>' +
        '<div class="pedido-card-detail" style="margin-top:3px">La foto del negocio del período — para socios o el banco</div>' +
      '</div>';
  } catch (e) {
    if (M.activeCEOTab !== myTab) return;
    content.innerHTML = ceoHeaderHTML('🏠 Inicio') + '<div class="coord-empty">' + t('coord.error.load') + '<br><small>' + esc(e.message) + '</small></div>';
  }
}

// 📄 RESUMEN EJECUTIVO en PDF (Fase CEO 2, 2026-07-18) — la foto del negocio del período/país que el CEO
// está viendo, con la marca FlyClean (mismo estilo que el reporte financiero de la tab Reportes). Para
// socios o el banco. Fetches propios (espejo con fallback), deliberadamente independiente del render del
// Inicio: cero riesgo sobre la pantalla que ya funciona.
export async function generateCEOExecPDF(btn) {
  const orig = btn ? btn.style.opacity : null;
  if (btn) { btn.style.opacity = '0.55'; btn.style.pointerEvents = 'none'; }
  try {
    const JS = await ensureJsPDF();
    if (!JS) { alert(t('pdf.notloaded')); return; }
    const { start, end, label } = getCEOPeriodRange();
    const prev = getCEOPrevRange();
    const fcf = getCEOFinanceFilter();
    const dFilter = (s0, e0) => { const f = { and: [{ property: 'Fecha', date: { on_or_after: s0 } }, { property: 'Fecha', date: { on_or_before: e0 } }] }; if (fcf) f.and.push(fcf); return f; };
    const svcPromise = (async () => { try { const r = await callDb('servicios'); return r.results || []; } catch (e) { try { const r2 = await callNotion(`databases/${M.DB_ID}/query`, 'POST', { page_size: 100 }); return r2.results || []; } catch (e2) { return []; } } })();
    const ingAllPromise = (async () => { try { const r = await callDb('ingresos'); return r.results || []; } catch (e) { try { const r2 = await callNotionAll(`databases/${M.INGRESOS_DB_ID}/query`, {}); return r2.results || []; } catch (e2) { return null; } } })();
    const propPromise = (async () => { try { const r = await callDb('propuestas'); return r.results || []; } catch (e) { try { const r2 = await callNotionAll(`databases/${M.PROPUESTAS_DB_ID}/query`, {}); return r2.results || []; } catch (e2) { return []; } } })();
    const [ingData, gasData, ingPrev, gasPrev, svcAll0, ingAll, propAll] = await Promise.all([
      callNotionAll(`databases/${M.INGRESOS_DB_ID}/query`, { filter: dFilter(start, end) }),
      callNotionAll(`databases/${M.GASTOS_DB_ID}/query`, { filter: dFilter(start, end) }),
      prev ? callNotionAll(`databases/${M.INGRESOS_DB_ID}/query`, { filter: dFilter(prev.start, prev.end) }) : Promise.resolve(null),
      prev ? callNotionAll(`databases/${M.GASTOS_DB_ID}/query`, { filter: dFilter(prev.start, prev.end) }) : Promise.resolve(null),
      svcPromise, ingAllPromise, propPromise,
    ]);

    const notionVal = M.ceoViewCountry === 'all' ? null : M.COUNTRY_NOTION_MAP[M.ceoViewCountry];
    const svcAll = (svcAll0 || []).filter(s0 => !esArchivado(s0) && (!notionVal || s0.properties?.['País']?.select?.name === notionVal));
    const estadoDe = s0 => (s0.properties?.['Estado']?.select?.name) || '';
    const fechaDe = s0 => (s0.properties?.['Fecha programada']?.date?.start || '').slice(0, 10);
    const enPeriodo = s0 => { const f = fechaDe(s0); return f ? (f >= start && f <= end) : (M.ceoPeriod.mode === 'todo'); };

    const ingSplit = sumByMoneda(ingData.results, 'ingreso');
    const gasSplit = sumByMoneda(gasData.results, 'gasto');
    const bal = { uyu: ingSplit.uyu - gasSplit.uyu, usd: ingSplit.usd - gasSplit.usd };
    let balPrev = null;
    if (ingPrev && gasPrev) { const ip = sumByMoneda(ingPrev.results, 'ingreso'), gp = sumByMoneda(gasPrev.results, 'gasto'); balPrev = { uyu: ip.uyu - gp.uyu, usd: ip.usd - gp.usd }; }
    const comp = svcAll.filter(s0 => estadoDe(s0).includes('Completado') && enPeriodo(s0));
    const margen = ingSplit.uyu > 0 ? Math.round(bal.uyu / ingSplit.uyu * 100) : (ingSplit.usd > 0 ? Math.round(bal.usd / ingSplit.usd * 100) : null);
    const ticket = comp.length ? (ingSplit.uyu ? ingSplit.uyu / comp.length : ingSplit.usd / comp.length) : null;
    const ticketEsUY = !!ingSplit.uyu;

    // Sin cobro (histórico, cruce forward ingreso→servicio)
    let sinCobro = null;
    if (ingAll) {
      const conCobro = new Set();
      (ingAll || []).forEach(r => { ((r.properties?.['Servicio vinculado']?.relation) || []).forEach(x => conCobro.add((x.id || '').replace(/-/g, ''))); });
      const tipoDe = s0 => (s0.properties?.['Tipo de registro']?.select?.name) || '';
      sinCobro = svcAll.filter(s0 => estadoDe(s0).includes('Completado') && !tipoDe(s0).includes('Prueba') && !tipoDe(s0).includes('Relevamiento') && !tipoDe(s0).includes('Jornada') && !conCobro.has((s0.id || '').replace(/-/g, ''))).length;
    }
    // Países (solo con vista global)
    const agg = {};
    if (!notionVal) {
      const acc = (results, kind) => (results || []).filter(kpiIncluido).forEach(r => { const pais = r.properties?.['País']?.select?.name || '🇺🇾 UY'; const { esUY, monto } = montoOf(r.properties || {}, kind); agg[pais] = agg[pais] || { uyu: 0, usd: 0 }; const sg = kind === 'ingreso' ? 1 : -1; if (esUY) agg[pais].uyu += sg * monto; else agg[pais].usd += sg * monto; });
      acc(ingData.results, 'ingreso'); acc(gasData.results, 'gasto');
    }
    // Pipeline
    const TERM = ['✅ Aceptada', '❌ Rechazada', '😶 Sin respuesta'];
    const propAb = (propAll || []).filter(r => { if (esArchivado(r)) return false; const e0 = r.properties?.['Estado pipeline']?.select?.name || ''; return e0 && !TERM.includes(e0); });
    const propFr = propAb.filter(r => { const d = r.properties?.['Días sin respuesta']?.formula?.number; return d != null && d >= 15; }).length;
    const propVal = propAb.reduce((s0, r) => s0 + (r.properties?.['Importe estimado']?.number || 0), 0);

    // ── PDF (marca FlyClean, mismo lenguaje visual que el reporte financiero) ──
    const clean = s0 => String(s0 || '').replace(/[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}️‍]/gu, '').replace(/\s+/g, ' ').trim();
    const fB = (v, esUY) => (v >= 0 ? '+' : '-') + fmtMoneda(Math.abs(v), esUY).replace(/\u00a0/g, ' ');
    const dTx = (c, p) => { if (p == null || !p) return ''; const d = Math.max(-999, Math.min(999, Math.round((c - p) / Math.abs(p) * 100))); return d ? '  (' + (d > 0 ? '+' : '') + d + '% vs anterior)' : '  (=)'; };
    const doc = new JS({ unit: 'mm', format: 'a4' });
    const PW = 210, MA = 14, BOT = 285; let y = 0;
    const newPageIf = n => { if (y + n > BOT) { doc.addPage(); y = 18; } };
    doc.setFillColor(0, 201, 141); doc.rect(0, 0, PW, 40, 'F');
    doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold');
    doc.setFontSize(26); doc.text('FlyClean', MA, 18);
    doc.setFontSize(14); doc.text('Resumen ejecutivo', MA, 28);
    doc.setFontSize(9); doc.setFont('helvetica', 'normal');
    doc.text(clean(label), PW - MA, 14, { align: 'right' });
    doc.text(M.ceoViewCountry === 'all' ? 'Todos los paises' : clean(M.ceoViewCountry), PW - MA, 19, { align: 'right' });
    y = 50;
    const section = tt => { newPageIf(12); doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(0, 165, 120); doc.text(tt.toUpperCase(), MA, y); doc.setDrawColor(179, 237, 217); doc.setLineWidth(0.3); doc.line(MA, y + 1.5, PW - MA, y + 1.5); y += 7; };
    const row = (lab, val, opts = {}) => { if (val == null || val === '') return; newPageIf(8); doc.setFont('helvetica', 'normal'); doc.setFontSize(opts.big ? 12 : 10.5); const c = opts.color || [70, 107, 94]; doc.setTextColor(c[0], c[1], c[2]); doc.text(String(lab), MA, y); doc.setFont('helvetica', 'bold'); if (!opts.color) doc.setTextColor(20, 31, 25); doc.text(String(val), PW - MA, y, { align: 'right' }); y += opts.big ? 8.5 : 6; doc.setDrawColor(232, 240, 236); doc.setLineWidth(0.2); doc.line(MA, y - 2, PW - MA, y - 2); };

    section('Balance · ' + clean(label));
    row('UY$', fB(bal.uyu, true) + dTx(bal.uyu, balPrev && balPrev.uyu), { big: true, color: bal.uyu >= 0 ? [0, 150, 100] : [200, 60, 60] });
    row('USD', fB(bal.usd, false) + dTx(bal.usd, balPrev && balPrev.usd), { big: true, color: bal.usd >= 0 ? [0, 150, 100] : [200, 60, 60] });
    section('Indicadores del periodo');
    row('Servicios completados', comp.length);
    if (ticket != null) row('Ticket promedio', clean(fmtMoneda(ticket, ticketEsUY)));
    if (margen != null) row('Margen', margen + '%');
    if (sinCobro != null) row('Completados sin cobro registrado (historico)', sinCobro, sinCobro ? { color: [200, 120, 20] } : {});
    if (!notionVal) {
      const keys = Object.keys(agg);
      if (keys.length) {
        section('Por pais');
        keys.forEach(k => { const a = agg[k]; const parts = []; if (a.uyu) parts.push(fB(a.uyu, true)); if (a.usd) parts.push(fB(a.usd, false)); row(clean(k) || 'UY', parts.join('   ') || '0'); });
      }
    }
    section('Pipeline comercial');
    row('Propuestas activas', propAb.length);
    if (propVal) row('Valor en juego (importes estimados)', '$ ' + Math.round(propVal).toLocaleString('es-UY'));
    if (propFr) row('Sin respuesta hace +15 dias', propFr, { color: [200, 120, 20] });
    newPageIf(16); y += 6;
    doc.setDrawColor(179, 237, 217); doc.line(MA, y, PW - MA, y); y += 6;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(140, 150, 146);
    doc.text('FlyClean · Generado el ' + new Date().toLocaleDateString('es-UY') + ' desde la app (datos en vivo) · UY$ y USD por separado, nunca se mezclan.', MA, y);
    doc.save('FlyClean_Ejecutivo_' + end + '.pdf');
  } catch (e) {
    alert('No se pudo generar el resumen: ' + (e?.message || e));
  } finally {
    if (btn) { btn.style.opacity = orig || '1'; btn.style.pointerEvents = ''; }
  }
}

function getCEOPeriodRange() {
  const now = new Date();
  const loc = currentLang === 'pt-BR' ? 'pt-BR' : 'es-UY';
  const iso = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const p = M.ceoPeriod;
  if (p.mode === 'semana') {
    const b = new Date(now); b.setHours(0, 0, 0, 0); b.setDate(b.getDate() + p.off * 7);
    const dow = (b.getDay() + 6) % 7; // lunes = 0
    const mon = new Date(b); mon.setDate(b.getDate() - dow);
    const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
    return { start: iso(mon), end: iso(sun), label: mon.toLocaleDateString(loc, { day: '2-digit', month: 'short' }) + ' – ' + sun.toLocaleDateString(loc, { day: '2-digit', month: 'short' }) };
  }
  if (p.mode === 'anio') {
    const y = now.getFullYear() + p.off;
    return { start: y + '-01-01', end: y + '-12-31', label: 'Año ' + y };
  }
  if (p.mode === 'rango') {
    return { start: p.from || '2000-01-01', end: p.to || '2999-12-31', label: (p.from || '…') + ' → ' + (p.to || '…') };
  }
  if (p.mode === 'todo') {
    return { start: '2000-01-01', end: '2999-12-31', label: 'Todo el historial' };
  }
  const base = new Date(now.getFullYear(), now.getMonth() + p.off, 1);
  return { start: iso(base), end: iso(new Date(base.getFullYear(), base.getMonth() + 1, 0)), label: base.toLocaleDateString(loc, { month: 'long', year: 'numeric' }) };
}

// Selector de período reutilizado por Métricas y Finanzas (estado compartido `M.ceoPeriod`).
function renderCEOPeriodSelector() {
  const p = M.ceoPeriod;
  const { label } = getCEOPeriodRange();
  const modes = [['mes', 'Mes'], ['semana', 'Semana'], ['anio', 'Año'], ['rango', 'Rango'], ['todo', 'Todo']];
  const chips = modes.map(([m, lbl]) => '<button class="period-chip ' + (p.mode === m ? 'active' : '') + '" onclick="setCEOPeriodMode(\'' + m + '\')">' + lbl + '</button>').join('');
  let nav;
  if (p.mode === 'rango') {
    nav = '<div class="period-range"><input type="date" class="coord-filter-date-input" value="' + (p.from || '') + '" onchange="setCEORange(this.value, ceoPeriod.to)"/><span style="color:var(--text3);font-size:12px">→</span><input type="date" class="coord-filter-date-input" value="' + (p.to || '') + '" onchange="setCEORange(ceoPeriod.from, this.value)"/></div>';
  } else if (p.mode === 'todo') {
    nav = '<div class="finance-month-nav" style="justify-content:center"><div class="finance-month-label">' + label + '</div></div>';
  } else {
    nav = '<div class="finance-month-nav"><button class="month-nav-btn" onclick="shiftCEOPeriod(-1)">‹</button><div class="finance-month-label">' + label + '</div><button class="month-nav-btn" onclick="shiftCEOPeriod(1)">›</button></div>';
  }
  return '<div class="period-selector"><div class="period-chips">' + chips + '</div>' + nav + '</div>';
}
export function setCEOPeriodMode(m) { M.ceoPeriod.mode = m; if (m !== 'rango' && m !== 'todo') M.ceoPeriod.off = 0; rerenderCEOActive(); }
export function shiftCEOPeriod(d) { M.ceoPeriod.off += d; rerenderCEOActive(); }
export function setCEORange(from, to) { M.ceoPeriod.from = from || ''; M.ceoPeriod.to = to || ''; rerenderCEOActive(); }
function rerenderCEOActive() { return (M._ceoRerender || renderCEOMetricas)(); }

// ── Rediseño "Cuenta del negocio": frescura de datos + refrescar + header + sparkline + acordeón ──
let _ceoDataTime = 0;
function ceoFreshHTML() {
  if (!_ceoDataTime) return '';
  const mins = Math.floor((Date.now() - _ceoDataTime) / 60000);
  const txt = mins < 1 ? 'recién' : 'hace ' + mins + ' min';
  const col = mins < 5 ? 'var(--green)' : (mins < 30 ? 'var(--text3)' : '#F5A623');
  return '<span class="ceo-fresh" style="color:' + col + '">● ' + txt + '</span>';
}
export async function refreshCEO(btn) {
  if (btn) btn.classList.add('ceo-spin');
  // Borrar la(s) caché(s) de lecturas de Notion (la activa es flyclean-notion-cache-v4; NO hardcodear
  // la versión → borrar todas las que empiecen con ese prefijo) para forzar datos frescos al refrescar.
  try {
    if (window.caches) {
      const _ks = await caches.keys();
      await Promise.all(_ks.filter(k => k.startsWith('flyclean-notion-cache')).map(k => caches.delete(k)));
    }
  } catch (_) {}
  M._ceoServiciosAll = null;
  await rerenderCEOActive();
}
// Header común: título + país (dropdown, no 6 chips) + frescura + botón refrescar.
function ceoHeaderHTML(titulo) {
  const isU = (M.currentUser?.role === '👔 CEO' && M.currentUser?.country === 'Uruguay') || (M.currentUser?.role || '').includes('Dirección');
  const opts = [['all', '🌎 Global'], ['Uruguay', '🇺🇾 UY'], ['Brasil', '🇧🇷 BR'], ['Panamá', '🇵🇦 PA'], ['Guatemala', '🇬🇹 GT'], ['México', '🇲🇽 MX']];
  const pais = isU ? '<select class="ceo-pais-select" onchange="setCEOCountry(this.value)">' + opts.map(([v, l]) => '<option value="' + v + '"' + (M.ceoViewCountry === v ? ' selected' : '') + '>' + l + '</option>').join('') + '</select>' : '';
  return '<div class="ceo-header"><div class="ceo-header-title">' + titulo + '</div><div class="ceo-header-right">' + pais + ceoFreshHTML() + '<button class="ceo-refresh-btn" onclick="refreshCEO(this)" aria-label="Actualizar">↻</button></div></div>';
}
// Mini-gráfico de tendencia (línea) — solo la FORMA, sin números.
function buildSparkline(values) {
  const vals = (values || []).filter(v => typeof v === 'number' && isFinite(v));
  if (vals.length < 2) return '';
  const W = 200, H = 32, P = 3;
  const min = Math.min(...vals, 0), max = Math.max(...vals, 0), rng = (max - min) || 1;
  const pts = vals.map((v, i) => { const x = P + i * ((W - 2 * P) / (vals.length - 1)); const y = H - P - ((v - min) / rng) * (H - 2 * P); return x.toFixed(0) + ',' + y.toFixed(0); }).join(' ');
  const col = vals[vals.length - 1] >= 0 ? '#00C98D' : '#FF5C5C';
  return '<svg viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" style="width:100%;height:32px;display:block"><polyline points="' + pts + '" fill="none" stroke="' + col + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
}
// Acordeón genérico (header + detalle oculto, mismo patrón que toggleFinGroup).
export function toggleCeoAcc(btn) {
  const d = btn.nextElementSibling; if (!d) return;
  const open = d.style.display === 'none';
  d.style.display = open ? 'block' : 'none';
  const a = btn.querySelector('.fin-arrow'); if (a) a.textContent = open ? '▴' : '▾';
}

function buildFinanceChart(ingByMonth, gasByMonth, year, activeMonth) {
  const months = Array.from({length:12}, (_, i) => year + '-' + String(i+1).padStart(2,'0'));
  const ingVals = months.map(m => ingByMonth[m] || 0);
  const gasVals = months.map(m => gasByMonth[m] || 0);
  const maxVal  = Math.max(...ingVals, ...gasVals, 1);
  const W=360, H=150, PL=36, PR=8, PT=10, PB=28;
  const cW = W-PL-PR, cH = H-PT-PB;
  const colW = cW/12, bW = colW*0.33;
  const MN = (currentLang === 'pt-BR') ? ['J','F','M','A','M','J','J','A','S','O','N','D'] : ['E','F','M','A','M','J','J','A','S','O','N','D'];
  const fmtY = v => v >= 1000 ? (v/1000).toFixed(0)+'k' : v.toFixed(0);

  let s = '<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" style="width:100%;display:block;padding:0 0 4px">';

  const GRID = '#ddeae4';      // border color
  const LABEL = '#456b5e';     // text2 color
  const LABEL_DIM = '#8aada3'; // text3 color
  const ACTIVE_BG = '#00C98D'; // brand green

  // Grid lines + Y labels
  for (let i = 0; i <= 4; i++) {
    const y = PT + cH*(1 - i/4);
    s += '<line x1="' + PL + '" y1="' + y + '" x2="' + (W-PR) + '" y2="' + y + '" stroke="' + GRID + '" stroke-width="1"/>';
    if (i > 0) s += '<text x="' + (PL-3) + '" y="' + (y+3) + '" text-anchor="end" font-size="7.5" fill="' + LABEL_DIM + '" font-family="Exo 2,sans-serif">' + fmtY(maxVal*i/4) + '</text>';
  }

  // Bars
  months.forEach((m, i) => {
    const x  = PL + i*colW;
    const iH = (ingVals[i]/maxVal)*cH;
    const gH = (gasVals[i]/maxVal)*cH;
    const isActive = m === activeMonth;
    if (isActive) s += '<rect x="' + (x+1) + '" y="' + PT + '" width="' + (colW-2) + '" height="' + cH + '" fill="' + ACTIVE_BG + '" fill-opacity="0.12" rx="2"/>';
    // income bar
    if (iH > 0) s += '<rect x="' + (x+colW/2-bW-1) + '" y="' + (PT+cH-iH) + '" width="' + bW + '" height="' + iH + '" fill="#00C98D" rx="2" fill-opacity="' + (isActive?'1':'0.75') + '"/>';
    // expense bar
    if (gH > 0) s += '<rect x="' + (x+colW/2+1) + '" y="' + (PT+cH-gH) + '" width="' + bW + '" height="' + gH + '" fill="#dc2626" rx="2" fill-opacity="' + (isActive?'1':'0.75') + '"/>';
    // month label
    s += '<text x="' + (x+colW/2) + '" y="' + (H-PB+11) + '" text-anchor="middle" font-size="7.5" fill="' + (isActive ? '#00C98D' : LABEL) + '" font-weight="' + (isActive?'700':'400') + '" font-family="Exo 2,sans-serif">' + MN[i] + '</text>';
  });

  // Legend
  s += '<rect x="' + PL + '" y="' + (H-PB+16) + '" width="7" height="7" fill="#00C98D" rx="1"/>';
  s += '<text x="' + (PL+9) + '" y="' + (H-PB+22) + '" font-size="7.5" fill="' + LABEL + '" font-family="Exo 2,sans-serif">' + t('chart.ingresos') + '</text>';
  s += '<rect x="' + (PL+55) + '" y="' + (H-PB+16) + '" width="7" height="7" fill="#dc2626" rx="1"/>';
  s += '<text x="' + (PL+64) + '" y="' + (H-PB+22) + '" font-size="7.5" fill="' + LABEL + '" font-family="Exo 2,sans-serif">' + t('chart.gastos') + '</text>';
  s += '<text x="' + (W-PR) + '" y="' + (H-PB+22) + '" text-anchor="end" font-size="7.5" fill="' + LABEL_DIM + '" font-family="Exo 2,sans-serif">' + year + '</text>';

  s += '</svg>';
  return s;
}

// Quick-view del servicio vinculado a un gasto/ingreso (desde el estado de cuenta).
export async function openServicioQuickView(id) {
  let ov = document.getElementById('svc-qv-overlay');
  if (!ov) {
    ov = document.createElement('div');
    ov.id = 'svc-qv-overlay';
    ov.className = 'svc-qv-overlay';
    ov.addEventListener('click', (e) => { if (e.target === ov) ov.classList.remove('active'); });
    document.body.appendChild(ov);
  }
  const close = '<button class="svc-qv-x" onclick="document.getElementById(\'svc-qv-overlay\').classList.remove(\'active\')">✕</button>';
  ov.innerHTML = '<div class="svc-qv-card"><div style="text-align:center;padding:34px"><div class="spinner" style="margin:0 auto"></div></div></div>';
  ov.classList.add('active');
  try {
    const data = await callNotion('pages/' + id, 'GET');
    const p = data.properties || {};
    const g = (k) => (p[k]?.title?.[0]?.plain_text) || (p[k]?.rich_text?.[0]?.plain_text) || (p[k]?.select?.name) || (p[k]?.date?.start) || '';
    const nombre = g('Nombre del servicio') || '(servicio)';
    const rows = [['Estado', g('Estado')], ['Tipo', tipoServicioStr(p) || g('Tipo de servicio')], ['Fecha', (g('Fecha programada') || '').slice(0, 10)], ['Lugar', g('Lugar')], ['Operario', g('Operario App')]].filter(x => x[1]);
    ov.innerHTML = '<div class="svc-qv-card"><div class="svc-qv-head"><span>' + esc(nombre) + '</span>' + close + '</div>' +
      (rows.map(x => '<div class="svc-qv-row"><span class="svc-qv-k">' + x[0] + '</span><span class="svc-qv-v">' + esc(x[1]) + '</span></div>').join('') || '<div class="svc-qv-row">— sin datos —</div>') + '</div>';
  } catch (e) {
    ov.innerHTML = '<div class="svc-qv-card"><div class="svc-qv-head"><span>Servicio</span>' + close + '</div><div class="svc-qv-row" style="color:var(--text3)">No se pudo cargar el servicio.</div></div>';
  }
}

export async function renderCEOFinanzas() {
  const content = document.getElementById(M._ceoContentId);
  content.innerHTML = '<div style="text-align:center;padding:40px 0"><div class="spinner" style="margin:0 auto"></div></div>';
  try {
    const fcf = getCEOFinanceFilter();
    const { start, end, label: periodLabelF } = getCEOPeriodRange();
    const now = new Date();
    const yearStart = now.getFullYear() + '-01-01';
    const yearEnd   = now.getFullYear() + '-12-31';
    const mkFilter  = (s, e, extra) => ({ and: [ ...(extra ? [extra] : []), { property: 'Fecha', date: { on_or_after: s } }, { property: 'Fecha', date: { on_or_before: e } } ] });

    // PAGINADO (año/rango pueden tener >100 filas → si no, los totales quedan cortos).
    // finIng/finGas = financiamiento de TODO el tiempo (deuda acumulada, no solo el período).
    const finF = { property: 'Financiamiento', select: { is_not_empty: true } };
    const [ingData, gasData, ingYear, gasYear, finIng, finGas] = await Promise.all([
      callNotionAll(`databases/${M.INGRESOS_DB_ID}/query`, { filter: mkFilter(start, end, fcf) }),
      callNotionAll(`databases/${M.GASTOS_DB_ID}/query`, { filter: mkFilter(start, end, fcf) }),
      callNotionAll(`databases/${M.INGRESOS_DB_ID}/query`, { filter: mkFilter(yearStart, yearEnd, fcf) }),
      callNotionAll(`databases/${M.GASTOS_DB_ID}/query`, { filter: mkFilter(yearStart, yearEnd, fcf) }),
      callNotionAll(`databases/${M.INGRESOS_DB_ID}/query`, { filter: finF }),
      callNotionAll(`databases/${M.GASTOS_DB_ID}/query`, { filter: finF })
    ]);
    _ceoDataTime = Date.now();

    const cur = M.ceoFinCurrency;                       // 'uyu' | 'usd'
    const monedaTag = cur === 'uyu' ? '🇺🇾 UY$' : '🇺🇸 USD';
    // Devuelve el monto del registro SOLO si su moneda coincide con la seleccionada (si no, 0).
    const amt = (r, kind) => { if (!kpiIncluido(r)) return 0; const { esUY, monto } = montoOf(r.properties || {}, kind); return ((cur === 'uyu') === esUY) ? monto : 0; };
    const fmt = n => fmtMoneda(n, monedaTag);
    const fechaCorta = (iso) => { if (!iso) return ''; const pp = iso.slice(0,10).split('-'); return pp[2] + '/' + pp[1]; };

    // Chart anual (siempre el año, moneda seleccionada)
    const ingByMonth = {}, gasByMonth = {};
    (ingYear.results || []).forEach(r => { const m = (r.properties?.['Fecha']?.date?.start || '').substring(0,7); if (m) ingByMonth[m] = (ingByMonth[m]||0) + amt(r,'ingreso'); });
    (gasYear.results || []).forEach(r => { const m = (r.properties?.['Fecha']?.date?.start || '').substring(0,7); if (m) gasByMonth[m] = (gasByMonth[m]||0) + amt(r,'gasto'); });

    // Totales del período (moneda seleccionada). amt() ya excluye financiamiento y "Excluir de KPIs"
    // → balance = RESULTADO OPERATIVO (negocio puro: ingresos de clientes − gastos reales).
    const ingresos = (ingData.results||[]).reduce((s,r) => s + amt(r,'ingreso'), 0);
    const gastos   = (gasData.results||[]).reduce((s,r) => s + amt(r,'gasto'), 0);
    const balance  = ingresos - gastos;

    // FINANCIAMIENTO (préstamos de socios, ej. Neidat): NO entra en el resultado operativo.
    // Monto del registro en la moneda activa SOLO si está marcado Financiamiento.
    const finAmt = (r, kind) => { if (!esFinanciamiento(r)) return 0; const { esUY, monto } = montoOf(r.properties || {}, kind); return ((cur === 'uyu') === esUY) ? monto : 0; };
    const finRecTot = (finIng.results||[]).reduce((s,r) => s + finAmt(r,'ingreso'), 0);  // recibido (todo el tiempo)
    const finDevTot = (finGas.results||[]).reduce((s,r) => s + finAmt(r,'gasto'), 0);     // devuelto (todo el tiempo)
    const deuda     = finRecTot - finDevTot;                                              // deuda acumulada
    const finRecPer = (ingData.results||[]).reduce((s,r) => s + finAmt(r,'ingreso'), 0);  // recibido en el período
    const finDevPer = (gasData.results||[]).reduce((s,r) => s + finAmt(r,'gasto'), 0);    // devuelto en el período
    const caja      = balance + finRecPer - finDevPer;                                    // flujo de caja del período

    // CAMBIOS DE MONEDA + internos (Tipo interno): NO son gasto/ingreso → se listan aparte para que
    // SIEMPRE se vean como lo que son (la misma plata cambiada de moneda), no como gasto/ganancia.
    const internos = [];
    (gasData.results || []).forEach(r => { if (tipoInterno(r)) internos.push({ r, kind: 'gasto' }); });
    (ingData.results || []).forEach(r => { if (tipoInterno(r)) internos.push({ r, kind: 'ingreso' }); });
    internos.sort((a, b) => (a.r.properties?.['Fecha']?.date?.start || '').localeCompare(b.r.properties?.['Fecha']?.date?.start || ''));
    const internosHTML = internos.length ?
      '<div class="estado-cuenta" style="margin-top:10px">' +
        '<div class="ec-title">💱 CAMBIOS DE MONEDA E INTERNOS · ' + periodLabelF + '</div>' +
        internos.map(({ r, kind }) => {
          const ti = tipoInterno(r);
          const m = montoOf(r.properties || {}, kind);
          const fch = (r.properties?.['Fecha']?.date?.start || '').slice(0, 10);
          return '<div class="ec-row"><span>' + esc(ti) + ' <span style="color:var(--text3);font-size:11px">' + fch + '</span></span><span style="white-space:nowrap">' + (kind === 'gasto' ? '−' : '+') + fmtMoneda(m.monto, m.esUY ? '🇺🇾 UY$' : '🇺🇸 USD') + '</span></div>';
        }).join('') +
        '<div class="ec-counts">No es gasto ni ganancia: es la misma plata cambiada de moneda (o movida entre cuentas propias).</div>' +
      '</div>' : '';

    // Agrupar CON items para cards desplegables (solo registros en la moneda activa).
    const groupBy = (results, kind, keyFn) => { const g = {}; (results||[]).forEach(r => { const a = amt(r, kind); if (!a) return; const k = keyFn(r) || 'Otros'; (g[k] = g[k] || { total: 0, items: [] }); g[k].total += a; g[k].items.push(r); }); return g; };
    const gasGroups = groupBy(gasData.results, 'gasto', r => r.properties?.['Categoría']?.select?.name);
    const ingGroups = groupBy(ingData.results, 'ingreso', r => r.properties?.['Tipo']?.select?.name);

    const itemHTML = (r, kind, color) => {
      const p = r.properties || {};
      let titulo, subParts, svcId;
      if (kind === 'gasto') {
        titulo = p['Concepto']?.title?.[0]?.plain_text || '(sin concepto)';
        const prov = p['Tienda / Proveedor']?.rich_text?.[0]?.plain_text || '';
        const fp = p['Forma de pago']?.select?.name || '';
        svcId = p['Servicio']?.relation?.[0]?.id || '';
        subParts = [fechaCorta(p['Fecha']?.date?.start), prov, fp];
      } else {
        titulo = p['Servicio']?.title?.[0]?.plain_text || p['Cliente']?.rich_text?.[0]?.plain_text || '(cobro)';
        const cli = p['Cliente']?.rich_text?.[0]?.plain_text || '';
        svcId = p['Servicio vinculado']?.relation?.[0]?.id || '';
        subParts = [fechaCorta(p['Fecha']?.date?.start), cli];
      }
      const sub = subParts.filter(Boolean).join(' · ');
      const svcBtn = svcId ? '<button class="fin-svc-link" onclick="event.stopPropagation();openServicioQuickView(\'' + esc(svcId) + '\')">🔗 ver servicio</button>' : '';
      const subHTML = (sub || svcBtn) ? '<div class="fin-detail-sub">' + esc(sub) + (svcBtn ? (sub ? ' · ' : '') + svcBtn : '') + '</div>' : '';
      return '<div class="fin-detail-row"><div class="fin-detail-main"><div class="fin-detail-title">' + esc(titulo) + '</div>' + subHTML + '</div><div class="fin-detail-amt" style="color:' + color + '">' + fmt(amt(r, kind)) + '</div></div>';
    };
    const renderGroups = (groups, kind, color, emptyMsg) => {
      const entries = Object.entries(groups).sort((a, b) => b[1].total - a[1].total);
      if (!entries.length) return '<div class="coord-empty" style="padding:12px 16px;font-size:13px">' + emptyMsg + '</div>';
      return entries.map(([k, g]) => {
        const ordered = g.items.slice().sort((a, b) => (b.properties?.['Fecha']?.date?.start || '').localeCompare(a.properties?.['Fecha']?.date?.start || ''));
        const first = ordered.slice(0, 8).map(r => itemHTML(r, kind, color)).join('');
        const rest = ordered.slice(8);
        const restHTML = rest.length ? '<button class="ver-mas" type="button" onclick="toggleCeoAcc(this)">+ ' + rest.length + ' movimientos más ▾</button><div style="display:none">' + rest.map(r => itemHTML(r, kind, color)).join('') + '</div>' : '';
        return '<div class="fin-group"><button class="fin-group-head" type="button" onclick="toggleFinGroup(this)"><span class="finance-row-label">' + esc(k) + ' <span style="color:var(--text3);font-weight:400">(' + g.items.length + ')</span></span><span class="fin-group-right"><span class="finance-row-value" style="color:' + color + '">' + fmt(g.total) + '</span><span class="fin-arrow">▾</span></span></button><div class="fin-group-detail" style="display:none">' + first + restHTML + '</div></div>';
      }).join('');
    };

    const monedaLabel = cur === 'uyu' ? 'UY$' : 'USD';
    const saldoCol = balance >= 0 ? 'var(--green)' : 'var(--red)';
    content.innerHTML =
      ceoHeaderHTML('Finanzas') +
      '<div style="display:flex;gap:6px;padding:8px 14px 4px">' +
        '<button class="ceo-country-tab ' + (cur === 'uyu' ? 'active' : '') + '" onclick="setCEOFinCurrency(\'uyu\')">🇺🇾 UY$</button>' +
        '<button class="ceo-country-tab ' + (cur === 'usd' ? 'active' : '') + '" onclick="setCEOFinCurrency(\'usd\')">🇺🇸 USD</button>' +
      '</div>' +
      renderCEOPeriodSelector() +
      '<div class="acct">' +
        '<div class="estado-cuenta">' +
          '<div class="ec-title">RESULTADO OPERATIVO · ' + monedaLabel + ' · ' + periodLabelF + '</div>' +
          '<div class="ec-row"><span>Ingresos de clientes</span><span style="color:var(--green)">+ ' + fmt(ingresos) + '</span></div>' +
          '<div class="ec-row"><span>Gastos reales</span><span style="color:var(--red)">− ' + fmt(gastos) + '</span></div>' +
          '<div class="ec-sep"></div>' +
          '<div class="ec-saldo"><span>RESULTADO OPERATIVO</span><span style="color:' + saldoCol + '">' + (balance < 0 ? '−' : '') + fmt(balance) + ' ' + (balance >= 0 ? '🟢' : '🔴') + '</span></div>' +
          '<div class="ec-counts">' + (balance >= 0 ? 'El negocio se sostiene solo' : 'El negocio NO se cubre solo — se financia (ver abajo)') + '</div>' +
        '</div>' +
        // FINANCIAMIENTO (préstamos de socios) — aparte del negocio. Deuda acumulada.
        ((deuda || finRecPer || finDevPer) ?
        '<div class="estado-cuenta" style="margin-top:10px">' +
          '<div class="ec-title">🏦 FINANCIAMIENTO · préstamos de socios (Neidat)</div>' +
          (finRecPer ? '<div class="ec-row"><span>Recibido (período)</span><span>+ ' + fmt(finRecPer) + '</span></div>' : '') +
          (finDevPer ? '<div class="ec-row"><span>Devuelto (período)</span><span>− ' + fmt(finDevPer) + '</span></div>' : '') +
          '<div class="ec-sep"></div>' +
          '<div class="ec-saldo"><span>DEUDA con Neidat</span><span style="color:var(--text)">' + (deuda < 0 ? '−' : '') + fmt(deuda) + '</span></div>' +
          '<div class="ec-counts">No es ingreso ni gasto: es deuda a devolver.</div>' +
        '</div>' : '') +
        // CAJA del período = resultado operativo + financiamiento neto.
        '<div class="estado-cuenta" style="margin-top:10px">' +
          '<div class="ec-saldo"><span>💵 CAJA del período</span><span style="color:' + (caja >= 0 ? 'var(--green)' : 'var(--red)') + '">' + (caja < 0 ? '−' : '') + fmt(caja) + '</span></div>' +
          '<div class="ec-counts">operativo ' + (balance < 0 ? '−' : '+') + fmt(balance) + ' + financiamiento neto del período</div>' +
        '</div>' +
        internosHTML +
        '<button class="ceo-acc-head" onclick="toggleCeoAcc(this)"><span>📊 Ingresos vs Gastos ' + now.getFullYear() + '</span><span class="fin-arrow">▾</span></button>' +
        '<div class="ceo-acc-body" style="display:none;padding:4px 14px">' + buildFinanceChart(ingByMonth, gasByMonth, now.getFullYear(), start.substring(0, 7)) + '</div>' +
        '<div class="ec-section-total"><span>GASTOS POR RUBRO</span><span style="color:var(--red)">− ' + fmt(gastos) + '</span></div>' +
        renderGroups(gasGroups, 'gasto', 'var(--red)', t('ceo.fin.empty.gastos')) +
        '<div class="ec-section-total"><span>INGRESOS POR TIPO</span><span style="color:var(--green)">+ ' + fmt(ingresos) + '</span></div>' +
        renderGroups(ingGroups, 'ingreso', 'var(--green)', t('ceo.fin.empty.ingresos')) +
        // El botón de cargar gasto es tarea de Finanzas, no del CEO (que solo mira).
        (M._ceoContentId === 'finanzas-content' ? '<div style="padding:14px"><button class="ceo-nuevo-gasto-btn" style="width:100%" onclick="openNuevoGastoSheet({ defaultClase: \'🔁 Indirecto\' })">+ ' + t('ceo.gasto.add') + '</button></div>' : '') +
      '</div>';
  } catch (e) {
    content.innerHTML = '<div class="coord-empty">' + t('ceo.error.finanzas') + '<br><small>' + esc(e.message) + '</small></div>';
  }
}

// Vista "Por cobrar" (solo lectura): por cada servicio Completado cruza el PRECIO (de la propuesta
// vinculada, Importe estimado) con lo COBRADO (suma de los cobros vinculados) → saldo y % cobrado.
// Cálculo en cliente (join servicios+propuestas+ingresos en memoria) → no toca el esquema de Servicios.
// _porCobrarCtx/_porCobrarData/_porCobrarOnConfirm viven en MAIN (handlers las usan) — acceso vía M.
export async function renderPorCobrar(containerId, opts = {}) {
  const readonly = !!opts.readonly;        // coordinador = solo ve, no asocia
  M._porCobrarCtx = { containerId, opts };
  const content = document.getElementById(containerId);
  if (!content) return;
  content.innerHTML = '<div style="text-align:center;padding:40px 0"><div class="spinner" style="margin:0 auto"></div></div>';
  try {
    const [svc, prop, ing, cli] = await Promise.all([
      callNotionAll(`databases/${M.DB_ID}/query`, {}),
      callNotionAll(`databases/${M.PROPUESTAS_DB_ID}/query`, {}),
      callNotionAll(`databases/${M.INGRESOS_DB_ID}/query`, {}),
      callNotionAll(`databases/${M.CONTACTOS_DB_ID}/query`, {})
    ]);
    const norm = s => (s || '').replace(/-/g, '');
    const precioBy = {};
    (prop.results || []).forEach(p => { precioBy[norm(p.id)] = { monto: p.properties?.['Importe estimado']?.number || 0, moneda: p.properties?.['Moneda']?.select?.name || '🇺🇸 USD' }; });
    const ingBy = {};
    // Índice FORWARD ingreso→servicio ('Servicio vinculado' del ingreso). ⚠️ NO usar la relación INVERSA
    // 'Ingresos' del servicio: bajo Supabase-first el raw del servicio solo recibe el delta de SUS PATCHes,
    // así que la inversa (que la autogenera Notion) quedó CONGELADA al momento del flip → los cobros
    // asociados después no se contaban y el servicio figuraba impago (bug detectado 15/07). El lado forward
    // lo escribe la app en cada asociación (asociarCobro/saveCobroEdit) → siempre fresco. Mismo patrón que
    // propTieneServicio (regla: derivar SIEMPRE del lado forward, nunca del inverso).
    const ingBySvc = {};
    (ing.results || []).forEach(i => {
      const v = { usd: i.properties?.['Monto USD']?.number || 0, uy: i.properties?.['Monto UY$ cobrado']?.number || 0 };
      ingBy[norm(i.id)] = v;
      const svcId = norm(i.properties?.['Servicio vinculado']?.relation?.[0]?.id || '');
      if (svcId) (ingBySvc[svcId] = ingBySvc[svcId] || []).push({ id: norm(i.id), ...v });
    });
    const clientesById = {};
    (cli.results || []).forEach(c => {
      clientesById[norm(c.id)] = {
        nombre: c.properties?.['Nombre / Empresa']?.title?.[0]?.plain_text || '(cliente)',
        pais: c.properties?.['País']?.select?.name || ''
      };
    });

    // Solo servicios facturables: Completados que NO son Pruebas, Relevamientos ni JORNADAS.
    // Las jornadas son días de trabajo que componen UN servicio (la Orden de trabajo); el servicio se
    // cobra una vez (su precio), NO se cobra cada jornada aparte → contar la Orden, nunca las jornadas.
    // Filtra por Tipo de registro y, por las dudas, también por el nombre (algunos tienen el tipo vacío).
    const comp = (svc.results || []).filter(s => {
      if (!recEnPaisNotion(s)) return false; // aislar Por cobrar por país (socios)
      if ((s.properties?.['Estado']?.select?.name || '') !== '✅ Completado') return false;
      const ti = s.properties?.['Tipo de registro']?.select?.name || '';
      if (ti === '🧪 Prueba' || ti === '🔍 Relevamiento' || ti === '📅 Jornada') return false;
      const nm = s.properties?.['Nombre del servicio']?.title?.[0]?.plain_text || '';
      if (/relevamiento|prueba|jornada/i.test(nm)) return false;
      return kpiIncluido(s); // por las dudas: no contar internos/financiamiento como cobrables
    });
    // Fase CEO 1 (bloque 2): en la vista del CEO el selector de período TAMBIÉN manda — "lo que se debe
    // de ese período". Modo 'todo' = histórico completo (el comportamiento de siempre; Finanzas no cambia).
    let periodoLabel = '';
    if (readonly && M.ceoPeriod && M.ceoPeriod.mode !== 'todo') {
      const rango = getCEOPeriodRange();
      periodoLabel = ' · ' + rango.label;
      const dentro = s2 => { const f = s2.properties?.['Fecha programada']?.date?.start || ''; return f && f.slice(0, 10) >= rango.start && f.slice(0, 10) <= rango.end; };
      for (let i = comp.length - 1; i >= 0; i--) if (!dentro(comp[i])) comp.splice(i, 1);
    }
    const rows = comp.map(s => {
      const p = s.properties || {};
      const nombre = p['Nombre del servicio']?.title?.[0]?.plain_text || '(servicio)';
      const clienteId = norm(p['Contacto']?.relation?.[0]?.id || '');
      const propId = p['Propuesta']?.relation?.[0]?.id;
      const pr = propId ? precioBy[norm(propId)] : null;
      // Precio: 1º el de la propuesta vinculada; si no hay (trabajo SUELTO), el "Precio acordado" del servicio
      // (fix 16/07 — antes los sueltos quedaban SIEMPRE en "sin precio"). La moneda sale de la misma fuente.
      let precio = 0, esUY = false;
      if (pr && pr.monto) { precio = pr.monto; esUY = pr.moneda === '🇺🇾 UY$'; }
      else {
        const svcPrecio = p['Precio acordado']?.number || 0;
        if (svcPrecio) { precio = svcPrecio; esUY = (p['Moneda']?.select?.name || '') === '🇺🇾 UY$'; }
      }
      let cobUSD = 0, cobUY = 0;
      (ingBySvc[norm(s.id)] || []).forEach(v => { cobUSD += v.usd; cobUY += v.uy; }); // forward (ver ingBySvc)
      const cobrado = esUY ? cobUY : cobUSD;               // cobrado EN LA MONEDA DEL PRECIO (no mezclar)
      const cobradoOtra = esUY ? cobUSD : cobUY;           // lo cobrado en la otra moneda (informativo)
      const saldo = precio - cobrado;
      let estado;
      if (!precio) estado = 'sinprecio';
      else if (cobrado >= precio - 0.5) estado = 'cobrado';
      else if (cobrado > 0) estado = 'parcial';
      else estado = 'acobrar';
      const fecha = p['Fecha programada']?.date?.start || '';
      return { id: s.id, clienteId, nombre, precio, esUY, cobrado, cobradoOtra, saldo,
               pct: precio ? Math.round(cobrado / precio * 100) : 0, estado, fecha };
    });

    // Agrupar visitas facturables por cliente (A-2: vista por cliente/contrato).
    const fU = n => fmtMoneda(n, '🇺🇸 USD');
    const fMon = (n, esUY) => fmtMoneda(n, esUY ? '🇺🇾 UY$' : '🇺🇸 USD');
    const byCli = {};
    rows.forEach(r => { (byCli[r.clienteId || 'sin-cliente'] = byCli[r.clienteId || 'sin-cliente'] || []).push(r); });
    // Propuesta recurrente por cliente (contrato): Tipo === '🔄 Recurrente'.
    const norm2 = s => (s || '').replace(/-/g, '');
    const contratoByCli = {};
    (prop.results || []).forEach(p => {
      if ((p.properties?.['Tipo']?.select?.name || '') !== '🔄 Recurrente') return;
      const cid = norm2(p.properties?.['Contacto']?.relation?.[0]?.id || '');
      if (!cid) return;
      (contratoByCli[cid] = contratoByCli[cid] || []).push(p);
    });
    // Saldo por cliente separado por moneda (NUNCA mezcla pesos con dólares).
    const saldoCli = arr => arr.reduce((a, r) => { if (r.precio && r.saldo > 0) { if (r.esUY) a.uyu += r.saldo; else a.usd += r.saldo; } return a; }, { uyu: 0, usd: 0 });
    const splitStr = tt => [tt.usd ? fU(tt.usd) : '', tt.uyu ? fMon(tt.uyu, true) : ''].filter(Boolean).join(' · ');
    // Orden: clientes con saldo (🔴) primero; dentro, mayor saldo arriba.
    const cliIds = Object.keys(byCli).sort((a, b) => {
      const sa = saldoCli(byCli[a]), sb = saldoCli(byCli[b]);
      const ta = sa.usd + sa.uyu, tb = sb.usd + sb.uyu;
      if ((tb > 0) !== (ta > 0)) return (tb > 0) - (ta > 0);
      return tb - ta;
    });

    // Helper de fila-visita con saldo coloreado (acciones se cablearán en A-3/A-4/A-5).
    const saldoColor = r => r.estado === 'cobrado' ? 'var(--green)' : (r.estado === 'parcial' ? '#E6A700' : 'var(--red)');
    const saldoTxt = r => !r.precio ? 'sin precio' : (r.saldo > 0 ? (r.estado === 'parcial' ? '🟡 falta ' : '🔴 falta ') + fMon(r.saldo, r.esUY) : '✅ cobrado');
    const fmtVisitaFecha = iso => { if (!iso) return ''; const pp = iso.slice(0, 10).split('-'); return pp[2] + '/' + pp[1] + '/' + pp[0].slice(2); };
    const visitaHTML = r =>
      '<div class="ec-row" style="align-items:flex-start;gap:10px">' +
        '<div style="min-width:0">' +
          (r.fecha ? '<div style="font-size:11px;color:var(--text3);margin-bottom:2px">' + fmtVisitaFecha(r.fecha) + '</div>' : '') +
          '<div style="font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(r.nombre) + '</div>' +
          '<div style="font-size:11px;color:var(--text3)">' + (r.precio ? 'Precio ' + fMon(r.precio, r.esUY) + ' · Cobrado ' + fMon(r.cobrado, r.esUY) + (r.cobradoOtra ? ' (+ ' + fMon(r.cobradoOtra, !r.esUY) + ' en otra moneda)' : '') : 'sin precio vinculado') + '</div>' +
          (!readonly && r.id ? '<button type="button" class="fin-svc-link" style="margin-top:4px" onclick="openEditSheetFromFinanzas(\'' + esc(r.id) + '\')">✏️ ' + t('porcobrar.editsvc') + '</button>' : '') +
        '</div>' +
        '<div style="text-align:right;font-weight:700;white-space:nowrap;color:' + saldoColor(r) + '">' + saldoTxt(r) + '<span class="pc-cubre-slot" data-svc="' + esc(r.id) + '"></span></div>' +
      '</div>';

    // Herramienta de asociación: cobros sin vincular a servicio (reusados dentro de cada tarjeta de cliente).
    const sinAsociar = (ing.results || []).filter(i => finRecEnPais(i) && !((i.properties?.['Servicio vinculado']?.relation || []).length) && !((i.properties?.['Servicio']?.relation || []).length) && !esFinanciamiento(i) && !(i.properties?.['Excluir de KPIs']?.checkbox === true));
    // Opciones de servicio para asociar un cobro: los del cliente van primero;
    // si tiene exactamente uno, queda pre-seleccionado (asociar en 1 clic).
    const nrm = x => (x || '').replace(/-/g, '');
    const svcNombre = s => s.properties?.['Nombre del servicio']?.title?.[0]?.plain_text || '?';
    const compSorted = comp.slice().sort((a, b) => svcNombre(a).localeCompare(svcNombre(b)));
    const optsFor = i => {
      const cliId = nrm((i.properties?.['Cuenta']?.relation || [])[0]?.id || '');
      const matches = cliId ? compSorted.filter(s => (s.properties?.['Contacto']?.relation || []).some(r => nrm(r.id) === cliId)) : [];
      const matchIds = new Set(matches.map(s => s.id));
      const rest = compSorted.filter(s => !matchIds.has(s.id));
      const opt = (s, sel) => '<option value="' + s.id + '"' + (sel ? ' selected' : '') + '>' + esc(svcNombre(s)) + '</option>';
      const preSel = matches.length === 1;
      return (preSel ? '' : '<option value="">— elegí servicio —</option>') +
        (matches.length ? matches.map((s, idx) => opt(s, preSel && idx === 0)).join('') + (rest.length ? '<option value="" disabled>────────</option>' : '') : '') +
        rest.map(s => opt(s, false)).join('');
    };
    const ingCli = i => i.properties?.['Cliente']?.rich_text?.[0]?.plain_text || i.properties?.['Servicio']?.title?.[0]?.plain_text || '(cobro)';
    const ingMonto = i => { const u = i.properties?.['Monto USD']?.number, y = i.properties?.['Monto UY$ cobrado']?.number; return u ? fU(u) : (y ? 'UY$ ' + y.toLocaleString('es-UY') : '—'); };

    // Tarjeta por cliente: header (nombre + país + saldo) + contrato + visitas + sin-precio + cobros sin asociar.
    const tarjetaCliente = cid => {
      const arr = byCli[cid];
      const info = clientesById[cid] || { nombre: cid === 'sin-cliente' ? '(sin cliente)' : '(cliente)', pais: '' };
      const sc = saldoCli(arr);
      const saldoHdr = (sc.usd || sc.uyu) ? '<span style="color:var(--red);font-weight:700">' + splitStr(sc) + '</span>' : '<span style="color:var(--green);font-weight:700">al día ✅</span>';
      // Header: tap a ficha cliente (A-3/A-4/A-5: openContactSheet ya existe, slot listo).
      const headTap = cid !== 'sin-cliente' ? ' onclick="openContactSheet(\'' + cid + '\')" style="cursor:pointer"' : '';
      let h = '<div class="estado-cuenta" style="margin-top:10px">' +
        '<div class="ec-saldo"' + headTap + '><span>' + esc(info.nombre) + (info.pais ? ' <span style="font-size:11px;color:var(--text3)">' + esc(info.pais) + '</span>' : '') + '</span>' + saldoHdr + '</div>';
      // Contrato recurrente (si hay).
      const contratos = contratoByCli[cid] || [];
      if (contratos.length) {
        const c0 = contratos[0].properties || {};
        const imp = c0['Importe estimado']?.number || 0;
        const sa = c0['Servicios por año']?.number || 0;
        h += '<div class="ec-row" style="font-size:12px;color:var(--text3)">📑 Contrato: ' + (imp ? fU(imp) + ' / visita' : 'sin importe') + (sa ? ' · ' + sa + '/año' : '') + (contratos.length > 1 ? ' · ' + contratos.length + ' contratos' : '') + '</div>';
      }
      // Visitas con precio — orden cronológico ascendente (más natural para visitas de contrato recurrente).
      const sortFecha = (a, b) => (a.fecha || '9999-12-31').localeCompare(b.fecha || '9999-12-31');
      arr.filter(r => r.precio).slice().sort(sortFecha).forEach(r => { h += visitaHTML(r); });
      // Sin precio → placeholder para A-4 (asignarPrecioContrato).
      const sinPrecio = arr.filter(r => !r.precio);
      if (sinPrecio.length) {
        h += '<div class="ec-section-total"><span>⚠️ SIN PRECIO (' + sinPrecio.length + ')</span><span style="color:var(--text3);font-size:11px">¿del contrato?</span></div>';
        sinPrecio.slice().sort(sortFecha).forEach(r => { h += visitaHTML(r); });
        // Slot A-4: botón asignarPrecioContrato (función a cablear en A-4).
        if (!readonly && contratos.length && cid !== 'sin-cliente') {
          h += '<div style="padding:8px 16px"><button class="fin-svc-link" onclick="asignarPrecioContrato(\'' + cid + '\')">📑 Asignar el precio del contrato a estas ' + sinPrecio.length + ' visita(s)</button></div>';
        }
      }
      // Cobros sin asociar de ESTE cliente: filtrado por Cuenta relation → slot A-3 (asociarCobro ya existe).
      const cobrosCli = (!readonly) ? sinAsociar.filter(i => norm2((i.properties?.['Cuenta']?.relation || [])[0]?.id || '') === cid) : [];
      // C3: servicios con precio de este cliente (candidatos para "✓ cubre").
      const candCubre = arr.filter(r => r.precio);
      if (cobrosCli.length) {
        h += '<div class="ec-section-total"><span>🔗 COBROS SIN ASOCIAR (' + cobrosCli.length + ')</span><span style="color:var(--text3);font-size:11px">asociá a su visita</span></div>';
        cobrosCli.forEach(i => {
          // C3: botón "✓ cubre" solo cuando hay exactamente 1 servicio con precio para este cliente
          // y el cobro tiene monto en la moneda OPUESTA al precio (cruce de monedas detectado).
          let cubreBtn = '';
          if (candCubre.length === 1) {
            const cand = candCubre[0];
            const im = ingBy[norm2(i.id)] || { usd: 0, uy: 0 };
            const tieneEnOtra = cand.esUY ? im.usd > 0 : im.uy > 0;
            if (tieneEnOtra) {
              cubreBtn = '<button class="fin-svc-link" style="white-space:nowrap;margin-left:4px" onclick="cubrirServicio(\'' + esc(i.id) + '\',\'' + esc(cand.id) + '\')">✓ cubre</button>';
            }
          }
          h += '<div class="ec-row" style="flex-direction:column;align-items:stretch;gap:6px;padding:8px 16px">' +
            '<div style="display:flex;justify-content:space-between;gap:8px"><span style="font-weight:600">' + esc(ingCli(i)) + '</span><span style="font-weight:700;white-space:nowrap">' + ingMonto(i) + ' <span style="color:var(--text3);font-weight:400;font-size:11px">' + (i.properties?.['Fecha']?.date?.start || '').slice(0, 10) + '</span></span></div>' +
            // Slot A-3: select #assoc-<ingId> + botón asociarCobro + botón C7 editar + botón C3 ✓ cubre (si aplica).
            '<div style="display:flex;gap:6px"><select id="assoc-' + i.id + '" style="flex:1;min-width:0;padding:6px;border-radius:6px;background:var(--bg);color:var(--text);border:1px solid var(--border);font-size:12px;font-family:inherit">' + optsFor(i) + '</select>' +
            '<button class="fin-svc-link" style="white-space:nowrap" onclick="asociarCobro(\'' + i.id + '\')">Asociar</button>' +
            '<button class="fin-svc-link" style="white-space:nowrap" onclick="openCobroSheet(\'' + esc(i.id) + '\')">✏️</button>' +
            cubreBtn + '</div>' +
          '</div>';
        });
      }
      return h + '</div>';
    };

    // Total general por moneda (suma sólo los saldos positivos).
    const totalPC = rows.reduce((a, r) => { if (r.precio && r.saldo > 0) { if (r.esUY) a.uyu += r.saldo; else a.usd += r.saldo; } return a; }, { uyu: 0, usd: 0 });
    const nCli = cliIds.filter(c => { const s = saldoCli(byCli[c]); return s.usd || s.uyu; }).length;

    M._porCobrarData = { svc, prop, ing, clientesById, precioBy, ingBy, ingBySvc, comp, readonly };

    // G2 (visión finanzas, 19/07): la AGENDA de cobranza — de la foto a la lista de trabajo.
    // Los impagos/parciales MÁS VIEJOS primero (la antigüedad es la urgencia); cada fila abre el servicio.
    let agendaHTML = '';
    if (!readonly) {
      const pend = rows.filter(r => (r.estado === 'acobrar' || r.estado === 'parcial') && r.fecha)
        .sort((a, b) => a.fecha.localeCompare(b.fecha)).slice(0, 8);
      if (pend.length) {
        agendaHTML = '<div class="estado-cuenta" style="border:1px solid var(--green)">' +
          '<div class="ec-title">💰 A COBRAAR ESTA SEMANA</div>'.replace('COBRAAR','COBRAR') +
          '<div class="ec-counts" style="margin:0 0 6px">Los más viejos primero — tocá para abrir el servicio.</div>' +
          pend.map(r => {
            const cli = (clientesById[r.clienteId] || {}).nombre || '';
            const falta = r.precio - (r.cobrado || 0);
            return '<div class="ec-row" style="cursor:pointer" onclick="openEditSheetFromFinanzas(\'' + esc(r.id) + '\')">' +
              '<span>' + fmtVisitaFecha(r.fecha) + ' · ' + esc(cli ? cli + ' — ' : '') + esc(r.nombre) +
              (r.estado === 'parcial' ? ' <span style="color:var(--text3);font-size:11px">(parcial)</span>' : '') + '</span>' +
              '<span style="color:var(--red);font-weight:700;white-space:nowrap">' + fMon(falta, r.esUY) + ' ›</span></div>';
          }).join('') + '</div>';
      }
    }
    content.innerHTML =
      (opts.headerless ? '' : ceoHeaderHTML('Por cobrar')) +
      (readonly ? renderCEOPeriodSelector() : '') +
      '<div class="acct">' +
        agendaHTML +
        '<div class="estado-cuenta">' +
          '<div class="ec-title">💰 TOTAL POR COBRAR' + esc(periodoLabel) + '</div>' +
          '<div class="ec-saldo"><span>Pendiente de cobro</span><span style="color:var(--red)">' + (splitStr(totalPC) || fU(0)) + '</span></div>' +
          '<div class="ec-counts">' + nCli + ' cliente(s) con saldo · ' + rows.length + ' visitas</div>' +
        '</div>' +
        cliIds.map(tarjetaCliente).join('') +
        '<div style="padding:12px 14px;font-size:11px;color:var(--text3)">El precio sale de la propuesta vinculada; lo cobrado, de los cobros vinculados. Reconciliá monedas o asigná el precio del contrato con un toque.</div>' +
      '</div>';

    // A-5: cablear slots pc-cubre-slot para visitas con cobro asociado en moneda cruzada.
    // Para cada visita que tiene precio + cobradoOtra > 0 (cobro en la otra moneda) y no está fully cobrada
    // en la moneda del precio, buscamos el cobro cruzado y ponemos el botón "✓ cubre" en el slot.
    if (!readonly) {
      const normS = x => (x || '').replace(/-/g, '');
      rows.forEach(r => {
        if (!r.precio || !r.cobradoOtra) return;      // no hay cruce de moneda → sin botón
        if (r.cobrado >= r.precio - 0.5) return;      // ya cobrado en la moneda correcta → sin botón
        const slot = content.querySelector('.pc-cubre-slot[data-svc="' + r.id + '"]');
        if (!slot) return;
        // Encontrar el primer cobro vinculado que tenga monto en la moneda OPUESTA al precio del servicio.
        // Desde el índice FORWARD (ingBySvc): la inversa 'Ingresos' del servicio está congelada bajo el flip.
        const linkedIds = (ingBySvc[normS(r.id)] || []).map(x => x.id);
        const ingCruzado = linkedIds.find(iid => {
          const im = ingBy[iid] || { usd: 0, uy: 0 };
          return r.esUY ? im.usd > 0 : im.uy > 0;
        });
        if (!ingCruzado) return;
        // Encontrar el id "original" (con guiones) del cobro para pasarlo a cubrirServicio.
        const ingEntry = (ing.results || []).find(x => normS(x.id) === ingCruzado);
        if (!ingEntry) return;
        slot.innerHTML = ' <button class="fin-svc-link" style="white-space:nowrap;font-size:11px;margin-left:4px" onclick="cubrirServicio(\'' + esc(ingEntry.id) + '\',\'' + esc(r.id) + '\')">✓ cubre</button>';
      });
    }
  } catch (e) {
    content.innerHTML = '<div class="coord-empty">No se pudo cargar Por cobrar<br><small>' + esc(e.message) + '</small></div>';
  }
}

// Asocia un cobro (ingreso) a un servicio: setea "Servicio vinculado" → el precio/cobrado se vuelve real.
// Reversible (se puede desvincular). Re-renderiza la vista al terminar.
export async function asociarCobro(ingId) {
  const sel = document.getElementById('assoc-' + ingId);
  const svcId = sel && sel.value;
  if (!svcId) { alert('Elegí un servicio primero.'); return; }
  if (sel) sel.disabled = true;
  try {
    await callNotion('pages/' + ingId, 'PATCH', { properties: { 'Servicio vinculado': { relation: [{ id: svcId }] } } });
    if (typeof syncAfterWrite === 'function') { try { await syncAfterWrite(ingId, 'ingresos'); } catch (_) {} }
    // C5: si el cobro está en moneda cruzada o $0 en la moneda del precio → ofrecer reconciliar (C3).
    const D = M._porCobrarData;
    if (D) {
      const nrm = x => (x || '').replace(/-/g, '');
      const sObj = (D.svc.results || []).find(x => x.id === svcId);
      const propId = sObj?.properties?.['Propuesta']?.relation?.[0]?.id;
      const pr = propId ? D.precioBy[nrm(propId)] : null;
      const im = D.ingBy[nrm(ingId)] || { usd: 0, uy: 0 };
      if (pr) {
        const precioEsUY = pr.moneda === '🇺🇾 UY$';
        const enPrecio = precioEsUY ? im.uy : im.usd;   // monto del cobro EN la moneda del precio
        const enOtra   = precioEsUY ? im.usd : im.uy;   // monto en la otra moneda
        if (!enPrecio && enOtra) {                       // pagado sólo en la otra moneda → reconciliar
          if (M._porCobrarCtx) await renderPorCobrar(M._porCobrarCtx.containerId, M._porCobrarCtx.opts);
          if (confirm(t('porcobrar.asociar.reconciliar'))) cubrirServicio(ingId, svcId);
          return;
        }
      }
    }
    if (M._porCobrarCtx) await renderPorCobrar(M._porCobrarCtx.containerId, M._porCobrarCtx.opts);
  } catch (e) {
    if (sel) sel.disabled = false;
    alert('No se pudo asociar: ' + esc(e.message || String(e)));
  }
}

// C3 — Overlay "plan antes de tocar": muestra qué va a pasar y ejecuta onConfirm solo al confirmar.
// Patrón idéntico a report-step-overlay / merge-plan-overlay (sibling de body).
function openPorCobrarPlan(title, bodyHTML, onConfirm) {
  M._porCobrarOnConfirm = onConfirm;
  document.getElementById('por-cobrar-plan-title').textContent = title;
  document.getElementById('por-cobrar-plan-body').innerHTML = bodyHTML +
    '<div style="display:flex;gap:10px;margin-top:20px">' +
      '<button type="button" onclick="closePorCobrarPlan()" style="flex:1;padding:13px;background:var(--bg);border:1px solid var(--border);border-radius:12px;color:var(--text2);font-family:inherit;font-size:14px;font-weight:600;cursor:pointer">' + t('porcobrar.plan.cancel') + '</button>' +
      '<button type="button" id="pc-plan-confirm" onclick="if(_porCobrarOnConfirm)_porCobrarOnConfirm()" style="flex:2;padding:13px;background:#00C98D;border:none;border-radius:12px;color:#04130d;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer">' + t('porcobrar.plan.confirm') + '</button>' +
    '</div>';
  document.getElementById('por-cobrar-plan-overlay').classList.add('open');
}
export function closePorCobrarPlan() {
  document.getElementById('por-cobrar-plan-overlay').classList.remove('open');
  M._porCobrarOnConfirm = null;
}

// C3 — cubrirServicio: arma el modal de plan SIMÉTRICO mostrando qué va a escribir ANTES de hacerlo.
// SIMÉTRICA (P3): moneda objetivo = moneda del PRECIO (si precio USD → escribe Monto USD;
//   si precio UY$ → escribe Monto UY$ cobrado). El monto real del pago (Moneda cobro) NO se toca.
// cubierto por defecto = saldo RESTANTE (precio − ya cobrado en la moneda del precio).
// TC = montoOtra / cubierto, solo si cubierto > 0 y hay monto en la otra moneda (NUNCA /0).
export function cubrirServicio(ingId, svcId) {
  const D = M._porCobrarData; if (!D) return;
  const norm = s => (s || '').replace(/-/g, '');
  const s = (D.svc.results || []).find(x => x.id === svcId);
  const i = (D.ing.results || []).find(x => x.id === ingId);
  if (!s || !i) { alert('No encontré el servicio o el cobro (refrescá).'); return; }
  const propId = s.properties?.['Propuesta']?.relation?.[0]?.id;
  const pr = propId ? D.precioBy[norm(propId)] : null;
  if (!pr || !pr.monto) { alert('Este servicio no tiene precio (propuesta). Asigná el precio primero.'); return; }
  const precioEsUY = pr.moneda === '🇺🇾 UY$';
  // Suma de cobros ya registrados en la moneda del PRECIO para este servicio.
  // Desde el índice FORWARD (ingBySvc): la inversa 'Ingresos' del servicio está congelada bajo el flip.
  let cobEnPrecio = 0;
  (D.ingBySvc?.[norm(svcId)] || []).forEach(v => { cobEnPrecio += precioEsUY ? v.uy : v.usd; });
  // Monto real de ESTE cobro en la OTRA moneda (lo que se pagó de verdad en la moneda distinta al precio).
  const im = D.ingBy[norm(ingId)] || { usd: 0, uy: 0 };
  const montoOtra = precioEsUY ? im.usd : im.uy;
  // Saldo restante = precio − ya cobrado en la moneda del precio (nunca negativo).
  const saldoRest = Math.max(0, pr.monto - cobEnPrecio);
  // Por defecto cubrir el saldo restante; si ya estaba todo cobrado, ofrecer el precio completo.
  const cubiertoDef = saldoRest > 0 ? saldoRest : pr.monto;
  const fP = n => fmtMoneda(n, pr.moneda);
  const fO = n => fmtMoneda(n, precioEsUY ? '🇺🇸 USD' : '🇺🇾 UY$');
  const monedaPrecioLabel = precioEsUY ? 'UY$' : 'USD';
  const body =
    '<div style="font-size:14px;line-height:1.5;margin-bottom:12px">' +
      'Este cobro' + (montoOtra ? ' de <b>' + esc(fO(montoOtra)) + '</b>' : '') +
      ' cubre el servicio <b>' + esc(s.properties?.['Nombre del servicio']?.title?.[0]?.plain_text || '(servicio)') + '</b>' +
      ' (' + esc(fP(pr.monto)) + '). Saldo restante: <b>' + esc(fP(saldoRest)) + '</b>.' +
    '</div>' +
    '<div class="gasto-form-row"><label>' + t('porcobrar.cubrir.label') + ' (' + esc(monedaPrecioLabel) + ')</label>' +
      '<input type="number" id="pc-cubierto" step="0.01" min="0" inputmode="decimal" value="' + cubiertoDef + '" style="width:100%;padding:10px;background:var(--bg2);border:1px solid var(--border);border-radius:8px;color:var(--text);font-family:inherit;font-size:15px"/></div>' +
    '<div style="font-size:11px;color:var(--text3);margin-top:6px">Se guarda en <b>' + (precioEsUY ? 'Monto UY$ cobrado' : 'Monto USD') + '</b>. El monto real del pago (Moneda cobro) no se toca.</div>';
  openPorCobrarPlan(t('porcobrar.cubrir.title'), body, () => {
    const v = parseFloat(document.getElementById('pc-cubierto').value);
    const cubierto = isFinite(v) ? v : 0;
    confirmCubrirServicio(ingId, svcId, cubierto);
  });
}

// C3 — confirmCubrirServicio: ejecuta el PATCH SIMÉTRICO con validación cubierto>0 antes del TC.
// NUNCA divide por 0 ni escribe Infinity/NaN en TC aplicado.
// Reversible: cubierto=0 escribe 0 en el campo de monto de la moneda del precio (quita la cobertura),
// y en ese caso NO escribe TC (no hay nada que derivar).
async function confirmCubrirServicio(ingId, svcId, cubierto) {
  const D = M._porCobrarData; if (!D) return;
  const norm = s => (s || '').replace(/-/g, '');
  const s = (D.svc.results || []).find(x => x.id === svcId);
  const propId = s?.properties?.['Propuesta']?.relation?.[0]?.id;
  const pr = propId ? D.precioBy[norm(propId)] : null;
  if (!pr) { alert('Sin precio vinculado.'); return; }
  const precioEsUY = pr.moneda === '🇺🇾 UY$';
  const im = D.ingBy[norm(ingId)] || { usd: 0, uy: 0 };
  const montoOtra = precioEsUY ? im.usd : im.uy;   // monto real en la moneda OPUESTA al precio
  const props = {};
  // P3 SIMÉTRICO: setea el campo en la moneda del PRECIO (NO en la moneda del pago real).
  // Si cubierto<=0 → escribe 0 (reversible: quita la cobertura).
  props[precioEsUY ? 'Monto UY$ cobrado' : 'Monto USD'] = { number: cubierto > 0 ? cubierto : 0 };
  // Asegura el vínculo al servicio (por si el cobro no estaba asociado aún).
  props['Servicio vinculado'] = { relation: [{ id: svcId }] };
  // TC derivado SOLO si hay monto en la otra moneda Y cubierto>0 (NUNCA /0 ni Infinity/NaN).
  if (montoOtra && cubierto > 0) {
    props['TC aplicado'] = { number: Math.round((montoOtra / cubierto) * 100) / 100 };
  }
  const btn = document.getElementById('pc-plan-confirm');
  if (btn) btn.disabled = true;
  try {
    await callNotion('pages/' + ingId, 'PATCH', { properties: props });
    if (typeof syncAfterWrite === 'function') { try { await syncAfterWrite(ingId, 'ingresos'); } catch (_) {} }
    closePorCobrarPlan();
    if (M._porCobrarCtx) await renderPorCobrar(M._porCobrarCtx.containerId, M._porCobrarCtx.opts);
  } catch (e) {
    if (btn) btn.disabled = false;
    alert('No se pudo reconciliar: ' + esc(e.message || String(e)));
  }
}

// C4 — asignarPrecioContrato: vincula la propuesta recurrente del cliente a las visitas SIN precio.
// P4: precio POR VISITA (cada visita hereda Importe estimado de la propuesta).
// Si hay >1 contrato recurrente → muestra selector primero (propIdSel ausente).
// NO pisa visitas que ya tienen propuesta vinculada. Reversible/idempotente.
export function asignarPrecioContrato(clienteId, propIdSel) {
  const D = M._porCobrarData; if (!D) return;
  const norm = s => (s || '').replace(/-/g, '');
  // Contratos recurrentes del cliente.
  const contratos = (D.prop.results || []).filter(p =>
    (p.properties?.['Tipo']?.select?.name || '') === '🔄 Recurrente' &&
    norm(p.properties?.['Contacto']?.relation?.[0]?.id || '') === norm(clienteId));
  if (!contratos.length) { alert('Este cliente no tiene un contrato recurrente con precio.'); return; }
  // P4: si hay >1 contrato y no se eligió, pedir cuál aplicar.
  if (contratos.length > 1 && !propIdSel) {
    const opts = contratos.map(p =>
      '<option value="' + esc(p.id) + '">' +
        esc(p.properties?.['Nombre de propuesta']?.title?.[0]?.plain_text || p.id) +
        ' — ' + fmtMoneda(p.properties?.['Importe estimado']?.number || 0, p.properties?.['Moneda']?.select?.name || '🇺🇸 USD') + '/visita' +
      '</option>'
    ).join('');
    const body =
      '<div style="font-size:14px;margin-bottom:10px">' + t('porcobrar.contrato.choose') + '</div>' +
      '<select id="pc-contrato-sel" style="width:100%;padding:8px;border-radius:8px;background:var(--bg);color:var(--text);border:1px solid var(--border);font-family:inherit">' + opts + '</select>';
    openPorCobrarPlan(t('porcobrar.contrato.title'), body, () => {
      const pid = document.getElementById('pc-contrato-sel').value;
      closePorCobrarPlan();
      asignarPrecioContrato(clienteId, pid);
    });
    return;
  }
  const prop = propIdSel ? contratos.find(p => p.id === propIdSel) : contratos[0];
  if (!prop) { alert('No se encontró el contrato seleccionado.'); return; }
  const imp = prop.properties?.['Importe estimado']?.number || 0;
  const mon = prop.properties?.['Moneda']?.select?.name || '🇺🇸 USD';
  // P4: solo visitas Completadas del cliente SIN propuesta vinculada (no pisar las que ya tienen una).
  const visitas = (D.comp || []).filter(s =>
    norm(s.properties?.['Contacto']?.relation?.[0]?.id || '') === norm(clienteId) &&
    !(s.properties?.['Propuesta']?.relation || []).length);
  if (!visitas.length) { alert('No hay visitas sin precio para este cliente.'); return; }
  const lista = visitas.map(s =>
    '<li>' + esc(s.properties?.['Nombre del servicio']?.title?.[0]?.plain_text || '(servicio)') + '</li>'
  ).join('');
  const bodyMsg = t('porcobrar.contrato.body')
    .replace('{precio}', fmtMoneda(imp, mon))
    .replace('{n}', visitas.length);
  const body =
    '<div style="font-size:14px;line-height:1.5;margin-bottom:10px">' + bodyMsg + '</div>' +
    '<ul style="margin:0 0 4px 18px;font-size:13px;color:var(--text2)">' + lista + '</ul>';
  openPorCobrarPlan(t('porcobrar.contrato.title'), body, () => confirmAsignarPrecio(clienteId, prop.id));
}

// C4 — confirmAsignarPrecio: ejecuta el vínculo Servicios.Propuesta secuencial, idempotente, reintentable.
// Solo actúa sobre visitas que siguen sin propuesta → correr dos veces no duplica.
async function confirmAsignarPrecio(clienteId, propId) {
  const D = M._porCobrarData; if (!D) return;
  const norm = s => (s || '').replace(/-/g, '');
  // Re-filtra en el momento de ejecutar (idempotente: si alguna ya se vinculó, la salta).
  const visitas = (D.comp || []).filter(s =>
    norm(s.properties?.['Contacto']?.relation?.[0]?.id || '') === norm(clienteId) &&
    !(s.properties?.['Propuesta']?.relation || []).length);
  const btn = document.getElementById('pc-plan-confirm');
  if (btn) btn.disabled = true;
  let ok = 0;
  try {
    for (const s of visitas) {
      await callNotion('pages/' + s.id, 'PATCH', { properties: { 'Propuesta': { relation: [{ id: propId }] } } });
      if (typeof syncAfterWrite === 'function') { try { await syncAfterWrite(s.id, 'servicios'); } catch (_) {} }
      ok++;
    }
    closePorCobrarPlan();
    if (M._porCobrarCtx) await renderPorCobrar(M._porCobrarCtx.containerId, M._porCobrarCtx.opts);
  } catch (e) {
    if (btn) btn.disabled = false;
    alert('Se asignaron ' + ok + ' de ' + visitas.length + '. Falló: ' + esc(e.message || String(e)) + '. Podés reintentar (no duplica).');
  }
}

export async function setCEOFinCurrency(cur) {
  M.ceoFinCurrency = cur;
  await renderCEOFinanzas();
}

// Despliega/oculta el detalle de una categoría/tipo en Finanzas (cards desplegables).
export function toggleFinGroup(btn) {
  const d = btn.nextElementSibling;
  if (!d) return;
  const open = d.style.display === 'none';
  d.style.display = open ? 'block' : 'none';
  const ar = btn.querySelector('.fin-arrow');
  if (ar) ar.textContent = open ? '▴' : '▾';
}

let _ceoEquipoCache = null;
// Admins que pueden resetear PINs ajenos (espejo de ADMIN_IDS en api/admin-set-pin.js; el server igual valida).
// ⚠️ Acoplado a la env ADMIN_IDS del server (default idéntico). Si se cambia ADMIN_IDS en Vercel,
// actualizar también acá (esto solo gobierna VISIBILIDAD; el server re-valida cada acción → fail-safe).
export function isAppAdmin() { return ['diego-laxalt', 'eduardo-cabral'].includes(M.currentUser?.id); }

// Admin: setear/resetear el PIN de un usuario (escribe en KV vía endpoint). No pide el PIN anterior.
export async function adminSetPin(targetId) {
  const nombre = _userName(targetId);
  const newPin = prompt('Nuevo PIN para ' + nombre + ' (4 o 6 dígitos):');
  if (newPin == null) return;
  if (!/^(\d{4}|\d{6})$/.test(newPin.trim())) { alert('El PIN debe ser de 4 o 6 dígitos.'); return; }
  try {
    const r = await fetch('/api/admin-set-pin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + (localStorage.getItem('fc_token') || '') },
      body: JSON.stringify({ targetId, newPin: newPin.trim() })
    });
    const j = await r.json().catch(() => ({}));
    if (j.ok) alert('✅ PIN actualizado para ' + nombre + '.');
    else alert('❌ No se pudo: ' + (j.error || ('error ' + r.status)));
  } catch (e) { alert('❌ Error: ' + e.message); }
}

// Alta de usuario sin deploy: escribe la tabla `usuarios` (Supabase) vía /api/admin-set-user + le pone PIN.
export function toggleNewUserForm() {
  const f = document.getElementById('new-user-form');
  if (f) f.style.display = f.style.display === 'none' ? 'block' : 'none';
}
function nuSlug(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
}
export function nuSyncId() {
  const idEl = document.getElementById('nu-id');
  if (!idEl || idEl.dataset.touched) return; // no pisar si el admin editó el id a mano
  idEl.value = nuSlug(document.getElementById('nu-nombre')?.value);
}
export async function adminNewUser() {
  const nombre = (document.getElementById('nu-nombre')?.value || '').trim();
  const id = (document.getElementById('nu-id')?.value || '').trim();
  const rol = document.getElementById('nu-rol')?.value;
  const pais = document.getElementById('nu-pais')?.value;
  if (!nombre || !id || !rol || !pais) { alert('Completá nombre, id, rol y país.'); return; }
  if (!/^[a-z0-9-]{2,60}$/.test(id)) { alert('El id debe ser minúsculas, números y guiones (2–60).'); return; }
  if (window._creatingUser) return; // anti doble-submit
  window._creatingUser = true;
  const tok = localStorage.getItem('fc_token') || '';
  try {
    const r = await fetch('/api/admin-set-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + tok },
      body: JSON.stringify({ id, nombre, rol, pais, activo: true })
    });
    const j = await r.json().catch(() => ({}));
    if (!j.ok) { alert('❌ No se pudo crear: ' + (j.error || ('error ' + r.status))); return; }
    // Sin PIN no puede entrar aunque exista en la tabla → lo pedimos en el acto.
    const pin = prompt('✅ ' + nombre + ' creado. Poné su PIN de 4 o 6 dígitos:');
    if (pin != null && /^(\d{4}|\d{6})$/.test(pin.trim())) {
      const rp = await fetch('/api/admin-set-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + tok },
        body: JSON.stringify({ targetId: id, newPin: pin.trim() })
      });
      const jp = await rp.json().catch(() => ({}));
      if (!jp.ok) alert('⚠️ Usuario creado, pero el PIN falló (' + (jp.error || rp.status) + '). Ponelo con el botón 🔑.');
      else alert('✅ Listo. ' + nombre + ' ya puede entrar (aparece en el login con el modo base activo).');
    } else {
      alert('⚠️ Usuario creado SIN PIN. No puede entrar hasta que le pongas uno con el botón 🔑.');
    }
    await loadRoster();   // refresca el array local del login (solo aplica si el modo base está activo)
    renderCEOEquipo();    // re-render del panel (adminAccountsHTML)
  } catch (e) { alert('❌ Error: ' + e.message); }
  finally { window._creatingUser = false; }
}

// Ciclo de vida del usuario (baja suave / reactivar / borrado definitivo) — todo vía /api/admin-user-status.
// Resuelve el nombre visible desde el id (así los onclick pasan SOLO el id, charset seguro → sin XSS ni escaping frágil).
function _userName(id) {
  const a = Array.isArray(M.USERS) && M.USERS.find(u => u.id === id);
  if (a) return a.name;
  return (window._bajaUsers && window._bajaUsers[id]) || id;
}
async function _userStatusCall(body) {
  const tok = localStorage.getItem('fc_token') || '';
  const r = await fetch('/api/admin-user-status', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + tok },
    body: JSON.stringify(body)
  });
  return { r, j: await r.json().catch(() => ({})) };
}

// BAJA suave: sale del login y pierde el PIN, pero la ficha y su historial QUEDAN → se puede reactivar.
export async function adminBajaUser(id) {
  const nombre = _userName(id);
  if (!confirm('Dar de baja a ' + nombre + '.\n\nSale del login y se le corta el acceso, pero su ficha e historial quedan guardados. Podés reactivarlo cuando vuelva.\n\n¿Continuar?')) return;
  try {
    const { r, j } = await _userStatusCall({ id, activo: false });
    if (!j.ok) { alert('❌ No se pudo: ' + (j.error || ('error ' + r.status))); return; }
    alert('✅ ' + nombre + ' quedó dado de baja (guardado en «Dados de baja»).');
    // Update OPTIMISTA: sacar de activos AL INSTANTE (el roster server cachea 60s → no esperar el refetch).
    const i = M.USERS.findIndex(u => u.id === id); if (i >= 0) M.USERS.splice(i, 1);
    renderCEOEquipo(); // re-arma activos sin el usuario + loadInactiveUsers lo trae fresco a Dados de baja
  } catch (e) { alert('❌ Error: ' + e.message); }
}

// REACTIVAR un usuario dado de baja: vuelve activo + se le pone un PIN nuevo (la baja se lo había borrado).
export async function adminReactivarUser(id) {
  const nombre = _userName(id);
  if (!confirm('Reactivar a ' + nombre + ' con toda su información previa.\n\n¿Continuar?')) return;
  try {
    const { r, j } = await _userStatusCall({ id, activo: true });
    if (!j.ok) { alert('❌ No se pudo: ' + (j.error || ('error ' + r.status))); return; }
    const tok = localStorage.getItem('fc_token') || '';
    const pin = prompt('✅ ' + nombre + ' reactivado. Poné su PIN de 4 o 6 dígitos:');
    if (pin != null && /^(\d{4}|\d{6})$/.test(pin.trim())) {
      const rp = await fetch('/api/admin-set-pin', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + tok }, body: JSON.stringify({ targetId: id, newPin: pin.trim() }) });
      const jp = await rp.json().catch(() => ({}));
      if (!jp.ok) alert('⚠️ Reactivado, pero el PIN falló (' + (jp.error || rp.status) + '). Ponelo con el botón 🔑.');
    } else {
      alert('⚠️ Reactivado SIN PIN. No puede entrar hasta que le pongas uno con el botón 🔑.');
    }
    // Update OPTIMISTA: volver a activos AL INSTANTE desde la fila devuelta (sin esperar el roster cacheado).
    if (j.user && !M.USERS.some(u => u.id === id)) {
      const uu = j.user, firstTok = s => String(s || '').trim().split(/\s+/)[0] || '👤';
      M.USERS.push({ id: uu.id, name: uu.nombre, role: uu.rol, country: uu.pais, emoji: uu.emoji || firstTok(uu.rol), notionId: uu.notion_id || null });
    }
    renderCEOEquipo(); // muestra al usuario en activos + loadInactiveUsers lo saca de Dados de baja
  } catch (e) { alert('❌ Error: ' + e.message); }
}

// ✏️ EDITAR usuario existente (nombre/rol/país) — server: admin-set-user con upsert:true (ya soportado).
// El id NO se cambia (es la PK del login/permisos); activo:true explícito para no tocar el estado.
export function toggleEditUser(id) {
  const slot = document.getElementById('eu-slot-' + id);
  if (!slot) return;
  if (slot.style.display !== 'none') { slot.style.display = 'none'; slot.innerHTML = ''; return; }
  const u = M.USERS.find(x => x.id === id);
  if (!u) return;
  const ROLES_UI = ['🎯 Dirección', '🔧 Coordinador', '🛠️ Operario', '👔 CEO', '📊 Administración', '🧲 Ventas'];
  const PAISES_UI = ['Uruguay', 'Brasil', 'Panamá', 'Guatemala', 'México'];
  const _inp = 'width:100%;box-sizing:border-box;padding:9px 11px;margin-bottom:7px;border:1px solid var(--border);border-radius:9px;background:var(--bg);color:var(--text);font-size:14px';
  slot.innerHTML = '<div style="background:var(--card);border:1px solid var(--border);border-radius:12px;padding:12px">' +
    '<input id="eu-nombre-' + esc(id) + '" value="' + esc(u.name) + '" maxlength="80" style="' + _inp + '">' +
    '<select id="eu-rol-' + esc(id) + '" style="' + _inp + '">' + ROLES_UI.map(r => '<option' + (r === u.role ? ' selected' : '') + '>' + r + '</option>').join('') + '</select>' +
    '<select id="eu-pais-' + esc(id) + '" style="' + _inp + '">' + PAISES_UI.map(pp => '<option' + (pp === u.country ? ' selected' : '') + '>' + pp + '</option>').join('') + '</select>' +
    '<div style="display:flex;gap:8px">' +
      '<button onclick="adminEditUser(\'' + esc(id) + '\')" style="flex:1;padding:10px;border:none;border-radius:10px;background:var(--accent,#00C98D);color:#03231a;font-weight:700;font-size:13px">' + esc(t('cfg.user.save')) + '</button>' +
      '<button onclick="toggleEditUser(\'' + esc(id) + '\')" style="flex:1;padding:10px;border:1px solid var(--border);border-radius:10px;background:transparent;color:var(--text2);font-size:13px">' + esc(t('btn.cancel')) + '</button>' +
    '</div></div>';
  slot.style.display = 'block';
}

export async function adminEditUser(id) {
  const nombre = String(document.getElementById('eu-nombre-' + id)?.value || '').trim();
  const rol = document.getElementById('eu-rol-' + id)?.value;
  const pais = document.getElementById('eu-pais-' + id)?.value;
  if (!nombre || nombre.length > 80 || /[<>]/.test(nombre)) { alert(t('cfg.user.nombre.invalid')); return; }
  // Guard anti-lockout: un admin no puede sacarse a sí mismo el rol de Dirección/CEO por accidente.
  if (id === M.currentUser?.id && !(rol.includes('Dirección') || rol.includes('CEO'))) {
    alert(t('cfg.user.self.rol')); return;
  }
  try {
    const tok = localStorage.getItem('fc_token') || '';
    const r = await fetch('/api/admin-set-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + tok },
      body: JSON.stringify({ id, nombre, rol, pais, activo: true, upsert: true }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.ok) { alert('❌ ' + (j.error || ('error ' + r.status))); return; }
    // Update OPTIMISTA (el roster server tiene caché 60s): M.USERS + M.currentUser si se editó a sí mismo.
    const u = M.USERS.find(x => x.id === id);
    if (u) { u.name = nombre; u.role = rol; u.country = pais; }
    if (M.currentUser?.id === id) {
      M.currentUser.name = nombre; M.currentUser.role = rol; M.currentUser.country = pais;
      localStorage.setItem('fc_user', JSON.stringify(M.currentUser));
    }
    renderCEOEquipo();
    alert('✅ ' + t('cfg.user.saved'));
  } catch (e) { alert('❌ ' + e.message); }
}

// BORRADO DEFINITIVO (solo para basura/pruebas — NO empleados reales, se pierde todo).
export async function adminHardDeleteUser(id) {
  const nombre = _userName(id);
  if (!confirm('⚠️ ELIMINAR DEFINITIVAMENTE a ' + nombre + '.\n\nSe borra la ficha por completo, sin vuelta atrás. Usar solo para usuarios de prueba/basura. Para un empleado real usá «Baja» (conserva el historial).\n\n¿Eliminar para siempre?')) return;
  try {
    const { r, j } = await _userStatusCall({ id, hard: true });
    if (!j.ok) { alert('❌ No se pudo: ' + (j.error || ('error ' + r.status))); return; }
    alert('✅ ' + nombre + ' eliminado definitivamente.');
    // Update OPTIMISTA: sacar de M.USERS por si estuviera + re-render (loadInactiveUsers lo saca de Dados de baja).
    const i = M.USERS.findIndex(u => u.id === id); if (i >= 0) M.USERS.splice(i, 1);
    renderCEOEquipo();
  } catch (e) { alert('❌ Error: ' + e.message); }
}

// Muestra/oculta el panel de dados de baja (y lo recarga al abrir para traer datos frescos).
export function toggleBajaPanel() {
  const p = document.getElementById('baja-users-panel');
  if (!p) return;
  const show = p.style.display === 'none';
  p.style.display = show ? 'block' : 'none';
  if (show) loadInactiveUsers();
}

// Carga los usuarios dados de baja (inactivos) en el panel «Dados de baja» + actualiza el conteo del botón.
// Corre tras renderizar (para el conteo) y al abrir el panel (para refrescar). Degrada en silencio.
async function loadInactiveUsers() {
  const box = document.getElementById('baja-users-panel');
  const btn = document.getElementById('baja-toggle-btn');
  if (!box) return;
  try {
    const tok = localStorage.getItem('fc_token') || '';
    const r = await fetch('/api/admin-list-users', { headers: { 'Authorization': 'Bearer ' + tok } });
    if (!r.ok) {
      // Ya NO en silencio: mostramos el error para poder diagnosticar (antes quedaba el panel en blanco).
      const body = await r.text().catch(() => '');
      console.warn('[baja] admin-list-users', r.status, body.slice(0, 200));
      box.innerHTML = '<div style="font-size:12px;color:var(--amber,#f59e0b);padding:10px 2px">⚠️ No se pudo cargar la lista (error ' + r.status + ').</div>';
      return;
    }
    const j = await r.json();
    const inactivos = (j.users || []).filter(u => u.activo === false);
    window._bajaUsers = Object.fromEntries(inactivos.map(u => [u.id, u.nombre || u.id])); // _userName lee de acá
    if (btn) btn.textContent = '🗂️ Dados de baja' + (inactivos.length ? ' (' + inactivos.length + ')' : '');
    if (!inactivos.length) {
      box.innerHTML = '<div style="font-size:12px;color:var(--text3);padding:10px 2px">No hay usuarios dados de baja.</div>';
      return;
    }
    let h = '';
    inactivos.forEach(u => {
      h += '<div class="equipo-card" style="opacity:.78">' +
        '<div class="equipo-emoji">' + esc(u.emoji || '👤') + '</div>' +
        '<div style="flex:1;min-width:0"><div class="equipo-name">' + esc(u.nombre || u.id) + '</div><div class="equipo-role">' + esc(translateRole(u.rol) || '') + ' · ' + esc(u.pais || '') + '</div></div>' +
        '<button class="fin-svc-link" style="white-space:nowrap;color:var(--accent,#00C98D)" onclick="adminReactivarUser(\'' + esc(u.id) + '\')">♻️ Reactivar</button>' +
        '<button class="fin-svc-link" style="white-space:nowrap;color:#e5484d" onclick="adminHardDeleteUser(\'' + esc(u.id) + '\')">🗑️</button>' +
        '</div>';
    });
    box.innerHTML = h;
  } catch (_) { /* silencioso */ }
}

// Sección admin (solo admins): cuentas de acceso (login) por país, con botón Set/Reset PIN.
// Se arma desde M.USERS (que tienen el id de login + PIN), no desde el roster de Notion.
export function adminAccountsHTML() {
  if (!isAppAdmin()) return '';
  const ADMIN_IDS_UI = ['diego-laxalt', 'eduardo-cabral']; // no se pueden eliminar (anti-lockout de los dueños)
  const flagByCountry = { 'Uruguay': '🇺🇾', 'Brasil': '🇧🇷', 'Panamá': '🇵🇦', 'Guatemala': '🇬🇹', 'México': '🇲🇽' };
  const isGlobal = M.ceoViewCountry === 'all';
  const scoped = isGlobal ? M.USERS : M.USERS.filter(u => u.country === M.ceoViewCountry);
  const byC = {};
  scoped.forEach(u => { (byC[u.country] = byC[u.country] || []).push(u); });
  let h = '<div class="ceo-section-title">🔑 Cuentas de acceso (PINs)</div>';
  // Alta de usuario SIN deploy: escribe la tabla `usuarios` de Supabase. Aplica al login cuando USERS_FROM_DB=1.
  const ROLES_UI = ['🎯 Dirección', '🔧 Coordinador', '🛠️ Operario', '👔 CEO', '📊 Administración', '🧲 Ventas'];
  const PAISES_UI = ['Uruguay', 'Brasil', 'Panamá', 'Guatemala', 'México'];
  const defPais = isGlobal ? 'Uruguay' : M.ceoViewCountry;
  const _inp = 'width:100%;box-sizing:border-box;padding:9px 11px;margin-bottom:7px;border:1px solid var(--border);border-radius:9px;background:var(--bg);color:var(--text);font-size:14px';
  h += '<div style="padding:0 16px 10px">' +
    '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
      '<button class="fin-svc-link" onclick="toggleNewUserForm()">➕ Agregar usuario</button>' +
      '<button class="fin-svc-link" id="baja-toggle-btn" onclick="toggleBajaPanel()">🗂️ Dados de baja</button>' +
    '</div>' +
    '<div id="new-user-form" style="display:none;margin-top:8px;background:var(--card);border:1px solid var(--border);border-radius:12px;padding:12px">' +
      '<input id="nu-nombre" placeholder="Nombre y apellido" oninput="nuSyncId()" style="' + _inp + '">' +
      '<input id="nu-id" placeholder="id de login (se genera solo)" oninput="this.dataset.touched=1" style="' + _inp + '">' +
      '<select id="nu-rol" style="' + _inp + '"><option value="" disabled selected>Elegí el rol…</option>' + ROLES_UI.map(r => '<option>' + r + '</option>').join('') + '</select>' +
      '<select id="nu-pais" style="' + _inp + '">' + PAISES_UI.map(p => '<option' + (p === defPais ? ' selected' : '') + '>' + p + '</option>').join('') + '</select>' +
      '<div style="font-size:11px;color:var(--text3);margin:2px 0 8px">Se crea el usuario y te pide un PIN. Aparece en el login cuando el modo base esté activo.</div>' +
      '<button onclick="adminNewUser()" style="width:100%;padding:11px;border:none;border-radius:10px;background:var(--accent,#00C98D);color:#03231a;font-weight:700;font-size:14px">Crear usuario + poner PIN</button>' +
    '</div>' +
    '<div id="baja-users-panel" style="display:none;margin-top:8px"></div>' +
  '</div>';
  for (const [c, list] of Object.entries(byC)) {
    h += '<div style="font-size:11px;color:var(--text3);padding:2px 16px 4px">' + (flagByCountry[c] || '') + ' ' + esc(c) + '</div>';
    list.forEach(u => {
      const isAdm = ADMIN_IDS_UI.includes(u.id);
      h += '<div class="equipo-card">' +
        '<div class="equipo-emoji">' + esc(u.emoji || '👤') + '</div>' +
        '<div style="flex:1;min-width:0"><div class="equipo-name">' + esc(u.name) + '</div><div class="equipo-role">' + esc(translateRole(u.role)) + '</div></div>' +
        '<button class="fin-svc-link" style="white-space:nowrap" onclick="toggleEditUser(\'' + esc(u.id) + '\')">✏️</button>' +
        '<button class="fin-svc-link" style="white-space:nowrap" onclick="adminSetPin(\'' + esc(u.id) + '\')">🔑 PIN</button>' +
        (isAdm ? '' : '<button class="fin-svc-link" style="white-space:nowrap;color:#e5484d" onclick="adminBajaUser(\'' + esc(u.id) + '\')">Baja</button>') +
        '</div>' +
        '<div id="eu-slot-' + esc(u.id) + '" style="display:none;margin:0 16px 8px"></div>';
    });
  }
  return h + '<div style="height:16px"></div>';
}

export async function renderCEOEquipo() {
  const content = document.getElementById('ceo-content');
  // Spinner solo en la 1ª carga (sin caché); en el re-render tras baja/reactivar NO parpadea → más ágil.
  if (!_ceoEquipoCache) content.innerHTML = '<div style="text-align:center;padding:40px 0"><div class="spinner" style="margin:0 auto"></div></div>';
  const flagMap = { '🇺🇾 UY': '🇺🇾', '🇧🇷 BR': '🇧🇷', '🇵🇦 PA': '🇵🇦', '🇬🇹 GT': '🇬🇹', '🇲🇽 MX': '🇲🇽' };
  const roleEmoji = { '🎯 Dirección': '🎯', '💼 Comercial': '💼', '✈️ Operario': '👨‍✈️', '📊 Administración': '📊', '🔧 Técnico': '🔧' };
  try {
    if (!_ceoEquipoCache) {
      const data = await callNotion(`databases/${M.EQUIPO_DB_ID}/query`, 'POST', { page_size: 100 });
      _ceoEquipoCache = data.results || [];
    }
    let members = _ceoEquipoCache.filter(m => (m.properties?.['Estado']?.select?.name || '✅ Activo') !== '❌ Inactivo');
    if (M.ceoViewCountry !== 'all') {
      const short = M.COUNTRY_FINANCE_MAP[M.ceoViewCountry];
      members = members.filter(m => m.properties?.['País']?.select?.name === short);
    }
    if (!members.length) { content.innerHTML = `<div class="coord-empty">${t('ceo.equipo.empty')}</div>`; return; }
    const isGlobal = M.ceoViewCountry === 'all';
    const grouped = {};
    members.forEach(m => { const p = m.properties?.['País']?.select?.name || '—'; (grouped[p] = grouped[p] || []).push(m); });
    let html = '';
    for (const [pais, list] of Object.entries(grouped)) {
      html += '<div class="ceo-section-title">' + esc(pais) + '</div>';
      for (const m of list) {
        const props = m.properties || {};
        const nombre = props['Nombre']?.title?.[0]?.plain_text || '—';
        const rol = props['Rol']?.select?.name || '';
        const countryTag = isGlobal ? '<div class="equipo-country">' + (flagMap[pais] || '') + '</div>' : '';
        html += '<div class="equipo-card">' +
          '<div class="equipo-emoji">' + (roleEmoji[rol] || '👤') + '</div>' +
          '<div><div class="equipo-name">' + esc(nombre) + '</div><div class="equipo-role">' + esc(rol) + '</div></div>' +
          countryTag + '</div>';
      }
    }
    if (M.activeCEOTab !== 'equipo') return; // cambió de tab mientras cargaba → NO pisar
    content.innerHTML = adminAccountsHTML() + html;
    if (isAppAdmin()) loadInactiveUsers();
  } catch (e) {
    console.warn('[ceo] equipo Notion fetch falló, uso lista local:', e.message);
    renderCEOEquipoLocal();
  }
}

// Fallback: render desde el array M.USERS local si la query a Notion falla.
function renderCEOEquipoLocal() {
  const content = document.getElementById('ceo-content');
  const isGlobal = M.ceoViewCountry === 'all';
  const flagMap = { 'Uruguay': '🇺🇾', 'Brasil': '🇧🇷', 'Panamá': '🇵🇦', 'Guatemala': '🇬🇹', 'México': '🇲🇽' };
  const users = isGlobal ? M.USERS : M.USERS.filter(u => u.country === M.ceoViewCountry);
  if (!users.length) { content.innerHTML = `<div class="coord-empty">${t('ceo.equipo.empty')}</div>`; return; }
  const grouped = {};
  users.forEach(u => { if (!grouped[u.country]) grouped[u.country] = []; grouped[u.country].push(u); });
  let html = '';
  for (const [country, members] of Object.entries(grouped)) {
    html += '<div class="ceo-section-title">' + (flagMap[country] || '') + ' ' + country.toUpperCase() + '</div>';
    for (const u of members) {
      const countryTag = isGlobal ? '<div class="equipo-country">' + (flagMap[u.country] || '') + '</div>' : '';
      html += '<div class="equipo-card">' +
        '<div class="equipo-emoji">' + u.emoji + '</div>' +
        '<div><div class="equipo-name">' + u.name + '</div><div class="equipo-role">' + translateRole(u.role) + '</div></div>' +
        countryTag + '</div>';
    }
  }
  content.innerHTML = adminAccountsHTML() + html;
  if (isAppAdmin()) loadInactiveUsers();
}
