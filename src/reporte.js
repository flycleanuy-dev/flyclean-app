// ─────────────────────────────────────────────
// REPORTE PDF de devolución al cliente (núcleo). Extraído de main.js el 2026-07-16.
// ─────────────────────────────────────────────
// Qué vive acá: carga on-demand de jsPDF (/vendor) + fuentes/logo de marca (report-brand) + el diccionario
// bilingüe de rótulos (REPORT_LBL) + buildReportDoc (dibuja el documento) + generateReportPDF (lo descarga).
// Qué NO vive acá: el modal previo (openReportStep/renderReportStep/submitReportStep) y la variante del CEO
// (generateReportPDFFromCEO) — dependen de flujos del coordinador/CEO y quedan en main.js.
//
// Dependencias de main.js por INYECCIÓN (initReporte), sin import circular:
//   · callNotion(endpoint, method, body) → para leer el contacto vinculado y persistir la observación.
//   · getEditingService() → fallback cuando buildReportDoc se llama sin servicio explícito.
// t() y currentLang se importan de i18n.js (hoja).

import { t, currentLang } from './i18n.js';

let _callNotion = () => Promise.reject(new Error('reporte: callNotion no inyectado'));
let _getEditingService = () => null;

// main.js llama esto una vez al arrancar.
export function initReporte({ callNotion, getEditingService } = {}) {
  if (callNotion) _callNotion = callNotion;
  if (getEditingService) _getEditingService = getEditingService;
}

// ─────────────────────────────────────────────
// PDF Reports — Task 1 (Servicio template; Relevamiento/Jornada = Task 2)
// ─────────────────────────────────────────────
// Carga jsPDF on-demand desde /vendor (self-hosted, robusto ante fallas del CDN/sw).
let _jspdfLoad = null;
export function ensureJsPDF() {
  const get = () => (window.jspdf && window.jspdf.jsPDF) || null;
  if (get()) return Promise.resolve(get());
  if (_jspdfLoad) return _jspdfLoad;
  _jspdfLoad = new Promise(resolve => {
    const s = document.createElement('script');
    s.src = '/vendor/jspdf.umd.min.js';
    s.onload = () => resolve(get());
    s.onerror = () => { _jspdfLoad = null; resolve(null); };
    document.head.appendChild(s);
  });
  return _jspdfLoad;
}

// Carga on-demand el pack de marca del reporte (fuentes Exo 2 + logo blanco, base64 self-hosted).
// Igual patrón que ensureJsPDF. Devuelve { logo, register(doc) } o null (→ el PDF cae a helvetica sin logo).
let _reportBrandLoad = null;
export function ensureReportBrand() {
  if (window.__reportBrand) return Promise.resolve(window.__reportBrand);
  if (_reportBrandLoad) return _reportBrandLoad;
  _reportBrandLoad = new Promise(resolve => {
    const s = document.createElement('script');
    s.src = '/vendor/report-brand.js';
    s.onload = () => resolve(window.__reportBrand || null);
    s.onerror = () => { _reportBrandLoad = null; resolve(null); };
    document.head.appendChild(s);
  });
  return _reportBrandLoad;
}

// Baja una foto del CDN por el proxy same-origin, la REDUCE (máx 1100px, JPEG 0.82 para
// que el PDF no pese una barbaridad y se pueda enviar) y la devuelve como { url(dataURL), dims }.
async function fetchReportImg(cdnUrl) {
  try {
    const resp = await fetch('/api/img?u=' + encodeURIComponent(cdnUrl));
    if (!resp.ok) return null;
    const blob = await resp.blob();
    const origUrl = await new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.onerror = () => r(null); fr.readAsDataURL(blob); });
    if (!origUrl) return null;
    const img = await new Promise(r => { const im = new Image(); im.onload = () => r(im); im.onerror = () => r(null); im.src = origUrl; });
    if (!img) return null;
    const maxDim = 1100;
    const scale = Math.min(1, maxDim / Math.max(img.naturalWidth || 1, img.naturalHeight || 1));
    if (scale < 1) {
      try {
        const cv = document.createElement('canvas');
        cv.width = Math.max(1, Math.round(img.naturalWidth * scale));
        cv.height = Math.max(1, Math.round(img.naturalHeight * scale));
        cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
        const small = cv.toDataURL('image/jpeg', 0.82);
        if (small && small.length > 2000) return { url: small, dims: { w: cv.width, h: cv.height } };
      } catch (e) { console.warn('[reporte] no se pudo procesar la imagen:', e); }
    }
    return { url: origUrl, dims: { w: img.naturalWidth, h: img.naturalHeight } };
  } catch (_) { return null; }
}

// ── Paso previo a generar el PDF: observación al cliente + (Prueba/Relevamiento) monto ──

// Diccionario de etiquetas del reporte (es + pt-BR). Los valores que vienen de Notion ya están en su
// idioma; esto traduce solo los títulos/etiquetas fijos → un cliente de Brasil recibe el reporte en pt.
const REPORT_LBL = {
  es: {
    servicio: 'Reporte de Servicio', jornada: 'Reporte de Jornada', relevamiento: 'Reporte de Relevamiento', prueba: 'Reporte de Prueba',
    datos: 'Datos generales', resultado: 'Resultado', avance: 'Avance del trabajo', completado: '% completado',
    fotos: 'Fotos antes / después', fotosRelev: 'Fotos del relevamiento', antes: 'ANTES', despues: 'DESPUÉS', relevCol: 'RELEVAMIENTO', sinfotos: '— Sin fotos —',
    obs: 'Observaciones', cronologia: 'Cronología por jornada', jornadaN: 'Jornada', otras: 'Otras fotos',
    hecho: 'HECHO', encurso: 'EN CURSO', pendiente: 'PENDIENTE',
    cliente: 'Cliente', servicioRow: 'Servicio', relevRow: 'Relevamiento', tipo: 'Tipo', lugar: 'Lugar', m2: 'm² aprox.', pais: 'País', fecha: 'Fecha programada',
    encargado: 'Encargado', piloto: 'Piloto', manual: 'Operario manual', ayudantes: 'Ayudantes', duracion: 'Duración', ubicacion: 'Ubicación', vermapa: 'Ver en el mapa →',
    estado: 'Estado', resultadoRow: 'Resultado', presupuesto: 'Presupuesto estimado',
    pagina: 'Página', de: 'de', generado: 'Generado el', hs: 'h', min: 'min',
  },
  ptBR: {
    servicio: 'Relatório de Serviço', jornada: 'Relatório de Jornada', relevamiento: 'Relatório de Vistoria', prueba: 'Relatório de Teste',
    datos: 'Dados gerais', resultado: 'Resultado', avance: 'Progresso do trabalho', completado: '% concluído',
    fotos: 'Fotos antes / depois', fotosRelev: 'Fotos da vistoria', antes: 'ANTES', despues: 'DEPOIS', relevCol: 'VISTORIA', sinfotos: '— Sem fotos —',
    obs: 'Observações', cronologia: 'Cronologia por jornada', jornadaN: 'Jornada', otras: 'Outras fotos',
    hecho: 'CONCLUÍDO', encurso: 'EM ANDAMENTO', pendiente: 'PENDENTE',
    cliente: 'Cliente', servicioRow: 'Serviço', relevRow: 'Vistoria', tipo: 'Tipo', lugar: 'Local', m2: 'm² aprox.', pais: 'País', fecha: 'Data programada',
    encargado: 'Encarregado', piloto: 'Piloto', manual: 'Operador manual', ayudantes: 'Ajudantes', duracion: 'Duração', ubicacion: 'Localização', vermapa: 'Ver no mapa →',
    estado: 'Status', resultadoRow: 'Resultado', presupuesto: 'Orçamento estimado',
    pagina: 'Página', de: 'de', generado: 'Gerado em', hs: 'h', min: 'min',
  },
};

// Arma el PDF de devolución con jsPDF (determinístico) y lo DEVUELVE (testeable). Marca FlyClean
// (logo + tipografía Exo 2 embebidas, lazy), fotos agrupadas por sector, y datos extra (duración,
// % de avance, cronología por jornada, ubicación con link al mapa). Multipágina; entran todas las fotos.
export async function buildReportDoc(svc, extra = {}) {
  svc = svc || _getEditingService();
  if (!svc) throw new Error('sin servicio');
  const JS = await ensureJsPDF();
  if (!JS) throw new Error(t('pdf.notloaded'));
  const brand = await ensureReportBrand(); // null → cae a helvetica sin logo (no rompe)
  const L = REPORT_LBL[currentLang === 'pt-BR' ? 'ptBR' : 'es'];
  const p = svc.properties || {};
  const ptLang = currentLang === 'pt-BR';
  const locale = ptLang ? 'pt-BR' : 'es-UY';

  // Limpia emojis de los valores (Exo 2/helvetica no los dibujan).
  const cleanLabel = (s) => String(s || '').replace(/[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}️‍]/gu, '').replace(/\s+/g, ' ').trim();
  const sel = (k) => cleanLabel(p[k]?.select?.name || '');
  const rtxt = (k) => p[k]?.rich_text?.[0]?.plain_text || '';
  const fileEntries = (k) => (p[k]?.files || []).map(f => ({ url: f.external?.url || f.file?.url, name: f.name || '' })).filter(e => e.url);
  const jsonProp = (k) => { try { const v = JSON.parse(rtxt(k) || '[]'); return Array.isArray(v) ? v : []; } catch (_) { return []; } };
  const TIPO_DESC = ptLang
    ? { 'Vidrios': 'Limpeza de vidros', 'Fachada': 'Limpeza de fachada', 'Paneles solares': 'Limpeza de painéis solares' }
    : { 'Vidrios': 'Limpieza de vidrios', 'Fachada': 'Limpieza de fachada', 'Paneles solares': 'Limpieza de paneles solares' };

  // multi_select: 1..3 tipos → "Limpieza de fachada + Limpieza de vidrios" (cleanLabel saca el emoji
  // para matchear las claves de TIPO_DESC y porque el PDF no dibuja emojis).
  const tiposServ = tipoServicioList(p).map(cleanLabel).filter(Boolean);
  const tipoReg = sel('Tipo de registro');
  const isRelev = /Relevamiento/.test(tipoReg), isJornada = /Jornada/.test(tipoReg), isPrueba = /Prueba/.test(tipoReg);
  const titulo = isRelev ? L.relevamiento : isJornada ? L.jornada : isPrueba ? L.prueba : L.servicio;
  const nombre = cleanLabel(p['Nombre del servicio']?.title?.[0]?.plain_text || 'Servicio');
  const encargado = sel('Operario App');
  const pilotoReal = sel('Piloto');
  const operarioManualReal = sel('Operario manual');
  const ayudantes = (p['Operarios participantes']?.multi_select || []).map(o => o.name).filter(a => a && a !== encargado && a !== pilotoReal && a !== operarioManualReal);
  const resultado = isPrueba ? sel('Resultado prueba') : sel('Resultado');
  const lugar = rtxt('Lugar');
  const m2 = p['m² aproximados']?.number;
  const mapa = p['Mapa']?.url || '';
  const fmtDate = (iso) => { if (!iso) return '—'; const d = new Date(iso.length === 10 ? iso + 'T00:00:00' : iso); return isNaN(d) ? iso : d.toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' }); };
  const hoy = new Date().toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' });

  // Duración real (horas efectivas de inicio/fin).
  const durTxt = (() => {
    const ini = p['Hora Inicio Efectivo']?.date?.start, fin = p['Hora Fin Efectivo']?.date?.start;
    if (!ini || !fin) return null;
    const di = new Date(ini), df = new Date(fin);
    if (isNaN(di) || isNaN(df) || df <= di) return null;
    const mins = Math.round((df - di) / 60000), h = Math.floor(mins / 60), m = mins % 60;
    return ((h ? h + ' ' + L.hs + ' ' : '') + (m ? m + ' ' + L.min : '')).trim() || ('0 ' + L.min);
  })();

  // Sectores + % de avance + cronología.
  const sectores = isRelev ? [] : jsonProp('Estado sectores').filter(s => s && s.id);
  const hasSectores = sectores.length > 0;
  const sectorNombre = (id) => { const s = sectores.find(x => x.id === id); return s ? cleanLabel(s.nombre) : ''; };
  const avancePct = (() => {
    if (hasSectores) { const h = sectores.filter(s => s.estado === 'hecho').length; return Math.round(h / sectores.length * 100); }
    const n = p['% de avance']?.number; return (typeof n === 'number') ? Math.round(n) : null;
  })();
  const jornadas = isRelev ? [] : jsonProp('Registro jornadas').filter(j => j && j.fecha);

  // Traer TODAS las fotos (pre/post/relev), cada una con su fase + sectorId (embebido en el nombre).
  // Si el sectorId ya no existe en Estado sectores (sector quitado/renombrado después de subir fotos),
  // la foto NO se pierde: cae al grupo "Otras fotos" (sectorId null) en vez de desaparecer del reporte.
  const knownSectorIds = new Set(sectores.map(s => s.id));
  const sectorIdOf = (name) => { const id = (name && name.includes('__')) ? name.split('__')[0] : null; return (id && knownSectorIds.has(id)) ? id : null; };
  const entries = isRelev
    ? fileEntries('📸 Fotos relevamiento').map(e => ({ ...e, fase: 'relev' }))
    : [...fileEntries('📸 Fotos pre-servicio').map(e => ({ ...e, fase: 'pre' })),
       ...fileEntries('📸 Fotos post-servicio').map(e => ({ ...e, fase: 'post' }))];
  const fetched = (await Promise.all(entries.map(async e => ({ ...e, img: await fetchReportImg(e.url) })))).filter(e => e.img);
  const groupImgs = (fase, sectorId) => fetched.filter(e => e.fase === fase && sectorIdOf(e.name) === sectorId).map(e => e.img);

  // Nombre del cliente (property tipo "title" del contacto vinculado; en Notion es "Nombre / Empresa").
  let clienteName = '—';
  const rel = p['Contacto']?.relation || p['Contactos']?.relation || [];
  if (rel[0]?.id) {
    try {
      const c = await _callNotion('pages/' + rel[0].id, 'GET');
      const cp = c?.properties || {};
      for (const k in cp) { const tt = cp[k]?.title; if (Array.isArray(tt) && tt.length) { clienteName = tt.map(x => x.plain_text).join('') || '—'; break; } }
    } catch (e) { console.warn('[reporte] no se pudo traer el nombre del cliente:', e); }
  }

  // ── Documento ──
  const doc = new JS({ unit: 'mm', format: 'a4' });
  let useExo = false;
  if (brand) { try { brand.register(doc); useExo = true; } catch (_) { useExo = false; } }
  const FONT = useExo ? 'Exo2' : 'helvetica';
  const F = (style) => doc.setFont(FONT, style);

  const PW = 210, M = 14, BOT = 282, gap = 6;
  const GREEN = [0, 201, 141], SECT = [0, 165, 120], DARK = [20, 31, 25], LBLC = [70, 107, 94], MUTE = [150, 160, 156];
  let y = 0;

  const topStrip = () => {
    doc.setFillColor(GREEN[0], GREEN[1], GREEN[2]); doc.rect(0, 0, PW, 3, 'F');
    if (brand?.logo) { try { doc.addImage(brand.logo, 'PNG', M, 6, 6, 6); } catch (_) {} }
    doc.setTextColor(SECT[0], SECT[1], SECT[2]); F('bold'); doc.setFontSize(10);
    doc.text('FlyClean', brand?.logo ? M + 8 : M, 10.5);
  };
  const newPageIf = (need) => { if (y + need > BOT) { doc.addPage(); topStrip(); y = 20; } };

  // Header principal (página 1): banda verde + logo sparkle blanco + wordmark + título + fecha.
  doc.setFillColor(GREEN[0], GREEN[1], GREEN[2]); doc.rect(0, 0, PW, 40, 'F');
  if (brand?.logo) { try { doc.addImage(brand.logo, 'PNG', M, 9, 18, 18); } catch (_) {} }
  const tx = brand?.logo ? M + 23 : M;
  doc.setTextColor(255, 255, 255); F('bold'); doc.setFontSize(24); doc.text('FlyClean', tx, 19);
  F('normal'); doc.setFontSize(13); doc.text(titulo, tx, 28);
  doc.setFontSize(9); doc.text('Fecha: ' + hoy, PW - M, 12, { align: 'right' });
  y = 50;

  const section = (title) => {
    newPageIf(12);
    F('bold'); doc.setFontSize(11); doc.setTextColor(SECT[0], SECT[1], SECT[2]);
    doc.text(String(title).toUpperCase(), M, y);
    doc.setDrawColor(179, 237, 217); doc.setLineWidth(0.3); doc.line(M, y + 1.5, PW - M, y + 1.5);
    y += 7;
  };
  const row = (label, value) => {
    if (value == null || value === '') return;
    const vlines = doc.splitTextToSize(String(value), 118);
    newPageIf(5.5 * vlines.length + 2);
    F('normal'); doc.setFontSize(10.5); doc.setTextColor(LBLC[0], LBLC[1], LBLC[2]); doc.text(String(label), M, y);
    F('bold'); doc.setTextColor(DARK[0], DARK[1], DARK[2]); doc.text(vlines, PW - M, y, { align: 'right' });
    y += 5.5 * vlines.length + 1.5;
    doc.setDrawColor(232, 240, 236); doc.setLineWidth(0.2); doc.line(M, y - 1.5, PW - M, y - 1.5);
  };
  const linkRow = (label, text, url) => {
    newPageIf(6);
    F('normal'); doc.setFontSize(10.5); doc.setTextColor(LBLC[0], LBLC[1], LBLC[2]); doc.text(String(label), M, y);
    F('bold'); doc.setTextColor(0, 119, 204);
    try { doc.textWithLink(text, PW - M, y, { url, align: 'right' }); } catch (_) { doc.text(text, PW - M, y, { align: 'right' }); }
    y += 7;
    doc.setDrawColor(232, 240, 236); doc.setLineWidth(0.2); doc.line(M, y - 1.5, PW - M, y - 1.5);
  };
  const bullet = (txt) => {
    const ls = doc.splitTextToSize(txt, PW - M * 2 - 4);
    newPageIf(ls.length * 5 + 2);
    F('normal'); doc.setFontSize(9.5); doc.setTextColor(DARK[0], DARK[1], DARK[2]); doc.text(ls, M + 2, y);
    y += ls.length * 5 + 2;
  };

  // Datos generales
  section(L.datos);
  row(L.cliente, clienteName);
  row(isRelev ? L.relevRow : L.servicioRow, nombre);
  row(L.tipo, tiposServ.map(t => TIPO_DESC[t] || t).join(' + '));
  if (lugar) row(L.lugar, lugar);
  if (m2 != null) row(L.m2, m2 + ' m²');
  row(L.pais, sel('País'));
  row(L.fecha, fmtDate(p['Fecha programada']?.date?.start));
  if (durTxt) row(L.duracion, durTxt);
  if (encargado) row(L.encargado, encargado);
  if (pilotoReal) row(L.piloto, pilotoReal);
  if (operarioManualReal) row(L.manual, operarioManualReal);
  if (ayudantes.length) row(L.ayudantes, ayudantes.join(', '));
  if (mapa) linkRow(L.ubicacion, L.vermapa, mapa);

  // Barra de % de avance
  if (avancePct != null) {
    section(L.avance);
    const barW = PW - M * 2, barH = 6;
    newPageIf(barH + 10);
    doc.setFillColor(232, 240, 236); doc.roundedRect(M, y, barW, barH, 1.5, 1.5, 'F');
    const w = Math.max(0, Math.min(1, avancePct / 100)) * barW;
    if (w > 0.5) { doc.setFillColor(GREEN[0], GREEN[1], GREEN[2]); doc.roundedRect(M, y, w, barH, 1.5, 1.5, 'F'); }
    F('bold'); doc.setFontSize(9); doc.setTextColor(DARK[0], DARK[1], DARK[2]);
    doc.text(avancePct + L.completado, PW - M, y + barH + 4.5, { align: 'right' });
    y += barH + 9;
  }

  // Resultado
  section(L.resultado);
  row(L.estado, sel('Estado'));
  if (resultado) row(L.resultadoRow, resultado);
  if (extra.monto != null) row(L.presupuesto, cleanLabel(extra.moneda || '') + ' ' + Number(extra.monto).toLocaleString(locale));

  // Fotos — helpers
  const estadoPill = (estado, xRight, yy) => {
    const map = { hecho: { t: L.hecho, c: GREEN }, en_curso: { t: L.encurso, c: [245, 166, 35] }, pendiente: { t: L.pendiente, c: MUTE } };
    const e = map[estado] || map.pendiente;
    F('bold'); doc.setFontSize(7.5);
    const tw = doc.getTextWidth(e.t) + 6;
    doc.setFillColor(e.c[0], e.c[1], e.c[2]); doc.roundedRect(xRight - tw, yy - 3.6, tw, 5, 1.4, 1.4, 'F');
    doc.setTextColor(255, 255, 255); doc.text(e.t, xRight - tw + 3, yy);
  };
  const sectorHeader = (nombreSec, estado) => {
    newPageIf(26);
    doc.setFillColor(13, 31, 25); doc.roundedRect(M, y, PW - M * 2, 8, 1.5, 1.5, 'F');
    doc.setTextColor(255, 255, 255); F('bold'); doc.setFontSize(10);
    doc.text(cleanLabel(nombreSec) || '—', M + 4, y + 5.4);
    if (estado) estadoPill(estado, PW - M - 3, y + 5.2);
    y += 12;
  };
  const beforeAfter = (preImgs, postImgs) => {
    const colW = (PW - M * 2 - gap) / 2;
    newPageIf(10);
    const lbl = (x, txt) => { doc.setFillColor(SECT[0], SECT[1], SECT[2]); doc.roundedRect(x, y, colW, 5.5, 1, 1, 'F'); doc.setTextColor(255, 255, 255); F('bold'); doc.setFontSize(8); doc.text(txt, x + colW / 2, y + 3.8, { align: 'center' }); };
    lbl(M, L.antes); lbl(M + colW + gap, L.despues);
    y += 8;
    const n = Math.max(preImgs.length, postImgs.length);
    if (n === 0) { F('normal'); doc.setFontSize(9); doc.setTextColor(MUTE[0], MUTE[1], MUTE[2]); doc.text(L.sinfotos, PW / 2, y + 3, { align: 'center' }); y += 12; return; }
    const hOf = (im) => im && im.dims ? Math.min(colW * im.dims.h / im.dims.w, 72) : (im ? 60 : 0);
    for (let i = 0; i < n; i++) {
      const a = preImgs[i], b = postImgs[i], hA = hOf(a), hB = hOf(b), rowH = Math.max(hA, hB, 0);
      newPageIf(rowH + 6);
      if (a) { try { doc.addImage(a.url, 'JPEG', M, y, colW, hA, undefined, 'FAST'); } catch (_) {} }
      if (b) { try { doc.addImage(b.url, 'JPEG', M + colW + gap, y, colW, hB, undefined, 'FAST'); } catch (_) {} }
      y += rowH + 4;
    }
  };
  const singleCol = (imgs, label) => {
    const colW = PW - M * 2;
    newPageIf(10);
    doc.setFillColor(SECT[0], SECT[1], SECT[2]); doc.roundedRect(M, y, colW, 5.5, 1, 1, 'F'); doc.setTextColor(255, 255, 255); F('bold'); doc.setFontSize(8); doc.text(label, PW / 2, y + 3.8, { align: 'center' });
    y += 8;
    if (!imgs.length) { F('normal'); doc.setFontSize(9); doc.setTextColor(MUTE[0], MUTE[1], MUTE[2]); doc.text(L.sinfotos, PW / 2, y + 3, { align: 'center' }); y += 12; return; }
    for (const im of imgs) { const h = im.dims ? Math.min(colW * im.dims.h / im.dims.w, 110) : 80; newPageIf(h + 6); try { doc.addImage(im.url, 'JPEG', M, y, colW, h, undefined, 'FAST'); } catch (_) {} y += h + 4; }
  };

  // Fotos — render
  section(isRelev ? L.fotosRelev : L.fotos);
  if (isRelev) {
    singleCol(fetched.filter(e => e.fase === 'relev').map(e => e.img), L.relevCol);
  } else if (hasSectores) {
    for (const s of sectores) { sectorHeader(s.nombre, s.estado); beforeAfter(groupImgs('pre', s.id), groupImgs('post', s.id)); y += 3; }
    const gp = groupImgs('pre', null), gq = groupImgs('post', null);
    if (gp.length || gq.length) { sectorHeader(L.otras, null); beforeAfter(gp, gq); }
  } else {
    beforeAfter(fetched.filter(e => e.fase === 'pre').map(e => e.img), fetched.filter(e => e.fase === 'post').map(e => e.img));
  }
  y += 2;

  // Cronología por jornada
  if (jornadas.length) {
    section(L.cronologia);
    jornadas.forEach((j, i) => {
      const noms = (j.hechos || []).map(id => sectorNombre(id)).filter(Boolean).join(', ');
      bullet(L.jornadaN + ' ' + (i + 1) + ' · ' + fmtDate(j.fecha) + (noms ? ' · ' + noms : ''));
    });
    y += 2;
  }

  // Observaciones
  if (extra.obs) {
    section(L.obs);
    const nl = doc.splitTextToSize(extra.obs, PW - M * 2 - 8);
    const boxH = nl.length * 5 + 8;
    newPageIf(boxH);
    doc.setFillColor(244, 248, 246); doc.setDrawColor(221, 234, 228); doc.setLineWidth(0.2);
    doc.roundedRect(M, y, PW - M * 2, boxH, 2, 2, 'FD');
    F('normal'); doc.setFontSize(10.5); doc.setTextColor(DARK[0], DARK[1], DARK[2]); doc.text(nl, M + 4, y + 6);
    y += boxH + 4;
  }

  // Footer + numeración de páginas
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    F('normal'); doc.setFontSize(8); doc.setTextColor(MUTE[0], MUTE[1], MUTE[2]);
    doc.text(L.generado + ' ' + hoy + ' — FlyClean SAS · www.flyclean.app', PW / 2, 290, { align: 'center' });
    doc.text(L.pagina + ' ' + i + ' ' + L.de + ' ' + pages, PW - M, 290, { align: 'right' });
  }

  return { doc, nombre };
}

// Genera y GUARDA el PDF de devolución (usa buildReportDoc). Se dispara desde el sheet del coord,
// el CEO y el picker de Finanzas.
export async function generateReportPDF(svc, extra = {}) {
  svc = svc || _getEditingService();
  if (!svc) return;
  const btn = document.getElementById('report-pdf-btn');
  const originalText = btn?.textContent;
  if (btn) { btn.textContent = '⏳ ' + t('pdf.generating'); btn.disabled = true; }
  try {
    const { doc, nombre } = await buildReportDoc(svc, extra);
    const fname = (nombre || 'servicio').replace(/[^a-z0-9-_ ]/gi, '').trim().replace(/\s+/g, '-') || 'servicio';
    doc.save('FlyClean-' + fname + '.pdf');
  } catch (e) {
    console.error('PDF error', e);
    alert(t('pdf.error') + ' ' + (e.message || ''));
  } finally {
    if (btn && originalText) { btn.textContent = originalText; btn.disabled = false; }
  }
}

// Genera el PDF de un servicio desde la vista del CEO (busca el servicio en el cache por id).
