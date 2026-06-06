// Plantilla HTML del reporte/devolución de FlyClean (se imprime a PDF server-side
// con Chrome real). Recibe las properties de la página Notion del servicio.
// Adaptable por "Tipo de registro": Servicio / Jornada / Relevamiento / Prueba.
const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function buildReportHTML(props, opts = {}) {
  const sel = (k) => props[k]?.select?.name || '';
  const txt = (k) => props[k]?.rich_text?.[0]?.plain_text || '';
  const num = (k) => props[k]?.number;
  const dateOf = (k) => props[k]?.date?.start || '';
  const fileUrls = (k) => (props[k]?.files || []).map(f => f.external?.url || f.file?.url).filter(Boolean);

  const tipoReg = sel('Tipo de registro');
  const isRelev = /Relevamiento/.test(tipoReg);
  const isJornada = /Jornada/.test(tipoReg);
  const isPrueba = /Prueba/.test(tipoReg);
  const titulo = isRelev ? 'Reporte de Relevamiento'
    : isJornada ? 'Reporte de Jornada'
    : isPrueba ? 'Reporte de Prueba (demo)'
    : 'Reporte de Servicio';

  const nombre = props['Nombre del servicio']?.title?.[0]?.plain_text || 'Servicio';
  const piloto = sel('Operario App');
  const ayudantes = (props['Operarios participantes']?.multi_select || []).map(o => o.name).filter(a => a && a !== piloto);
  const resultado = isPrueba ? sel('Resultado prueba') : sel('Resultado');

  const fmtDate = (iso) => { if (!iso) return '—'; const d = new Date(iso.length === 10 ? iso + 'T00:00:00' : iso); return isNaN(d) ? iso : d.toLocaleDateString('es-UY', { day: '2-digit', month: '2-digit', year: 'numeric' }); };
  const fmtTime = (iso) => { if (!iso) return '—'; const d = new Date(iso); return isNaN(d) ? '—' : d.toLocaleTimeString('es-UY', { hour: '2-digit', minute: '2-digit' }); };
  const hi = dateOf('Hora Inicio Efectivo'), hf = dateOf('Hora Fin Efectivo');
  let duracion = '—';
  if (hi && hf) { const ms = new Date(hf) - new Date(hi); if (ms > 0) { const m = Math.round(ms / 60000); duracion = (Math.floor(m / 60) ? Math.floor(m / 60) + 'h ' : '') + (m % 60) + 'min'; } }

  const fotosAntes = isRelev ? fileUrls('📸 Fotos relevamiento') : fileUrls('📸 Fotos pre-servicio');
  const fotosDespues = isRelev ? [] : fileUrls('📸 Fotos post-servicio');
  const notas = txt('Notas post-servicio') || txt('Notas');
  const lugar = txt('Lugar');
  const cliente = opts.clienteName || '—';
  const m2 = num('m² aproximados');
  const hoy = new Date().toLocaleDateString('es-UY', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const gallery = (urls) => urls.length
    ? urls.map(u => `<img src="${esc(u)}" />`).join('')
    : `<div class="ph">— Sin fotos —</div>`;
  const row = (label, value) => `<div class="row"><span>${esc(label)}</span><span>${esc(value || '—')}</span></div>`;

  return `<!doctype html><html lang="es"><head><meta charset="utf-8">
  <style>
    @page { size: A4; margin: 0; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body { margin:0; font-family: Arial, Helvetica, sans-serif; color:#0d1f19; }
    .wrap { width: 210mm; }
    .header { background:#00C98D; color:#fff; padding:16mm 14mm; display:flex; justify-content:space-between; align-items:flex-start; }
    .brand { font-size:30px; font-weight:800; letter-spacing:-1px; }
    .title { font-size:22px; font-weight:700; margin-top:6mm; }
    .hdate { text-align:right; font-size:11px; }
    .body { padding:8mm 14mm 14mm; }
    h2 { font-size:13px; font-weight:800; color:#00a578; text-transform:uppercase; letter-spacing:.5px; border-bottom:1px solid #b3edd9; padding-bottom:4px; margin:16px 0 8px; }
    .row { display:flex; justify-content:space-between; padding:4px 0; font-size:12.5px; border-bottom:1px dotted #ddeae4; }
    .row span:first-child { color:#456b5e; }
    .row span:last-child { font-weight:700; text-align:right; padding-left:10px; }
    .fotos { display:flex; gap:8px; margin-top:6px; }
    .fcol { flex:1; min-width:0; }
    .fcol-t { font-size:11px; font-weight:700; color:#fff; background:#0d1f19; padding:4px; text-align:center; border-radius:4px; margin-bottom:6px; letter-spacing:1px; }
    img { width:100%; height:auto; display:block; border-radius:6px; margin-bottom:6px; }
    .ph { font-size:11px; color:#8aada3; text-align:center; padding:14px 0; border:1px dashed #ddeae4; border-radius:6px; }
    .notas { font-size:12.5px; line-height:1.5; background:#f4f8f6; border:1px solid #ddeae4; border-radius:8px; padding:12px; white-space:pre-wrap; }
    .footer { font-size:10px; color:#8aada3; text-align:center; border-top:1px solid #ddeae4; padding-top:10px; margin-top:22px; }
  </style></head>
  <body><div class="wrap">
    <div class="header">
      <div><div class="brand">FlyClean</div><div class="title">${esc(titulo)}</div></div>
      <div class="hdate"><div>Fecha</div><div style="font-weight:700">${esc(hoy)}</div></div>
    </div>
    <div class="body">
      <h2>Datos generales</h2>
      ${row('Cliente', cliente)}
      ${row(isRelev ? 'Relevamiento' : 'Servicio', nombre)}
      ${row('Tipo', sel('Tipo de servicio'))}
      ${lugar ? row('Lugar', lugar) : ''}
      ${m2 != null ? row('m² aprox.', m2 + ' m²') : ''}
      ${row('País', sel('País'))}
      ${row('Fecha programada', fmtDate(dateOf('Fecha programada')))}
      ${piloto ? row('Piloto', piloto) : ''}
      ${ayudantes.length ? row('Ayudantes', ayudantes.join(', ')) : ''}

      <h2>Tiempos</h2>
      ${row('Inicio', fmtTime(hi))}
      ${row('Fin', fmtTime(hf))}
      ${row('Duración', duracion)}

      <h2>Resultado</h2>
      ${row('Estado', sel('Estado'))}
      ${resultado ? row('Resultado', resultado) : ''}

      <h2>${isRelev ? 'Fotos del relevamiento' : 'Fotos antes / después'}</h2>
      <div class="fotos">
        <div class="fcol"><div class="fcol-t">${isRelev ? 'RELEVAMIENTO' : 'ANTES'}</div>${gallery(fotosAntes)}</div>
        ${isRelev ? '' : `<div class="fcol"><div class="fcol-t">DESPUÉS</div>${gallery(fotosDespues)}</div>`}
      </div>

      ${notas ? `<h2>Notas</h2><div class="notas">${esc(notas)}</div>` : ''}

      <div class="footer">Generado el ${esc(hoy)} — FlyClean SAS · www.flyclean.app</div>
    </div>
  </div></body></html>`;
}
