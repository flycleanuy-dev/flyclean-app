// Cron de REPORTES al CEO (Diego). Decide el contenido según el día (UTC):
//  - Viernes 21:00 UTC (18 UY) → resumen de lo hecho en la semana.
//  - Lunes   11:00 UTC (8 UY)  → pendientes + próximos de la semana.
// Email "autosuficiente": lo leés y solo entrás a la app si hay algo para hacer.
// Test manual: ?tipo=viernes|lunes  ·  ?to=<email> (override, gated por CRON_SECRET)
import { queryAll } from './_lib/notion.js';
import { sendEmail, emailLayout } from './_lib/email.js';

const CEO_EMAIL = 'ihodieego@gmail.com';
const SERVICIOS_DB = 'ccaf276c7f6a460caeb3d2800deab2e5';
const PROPUESTAS_DB = '2c0a4257f4294941b994dfebc1098633';
const ESTADOS_ESPERANDO = ['📞 Contactado', '📤 Enviada al cliente', '🤝 Negociando'];
const APP_URL = 'https://www.flyclean.app/';

const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Propuestas
const propTitle = (p) => p?.['Nombre de propuesta']?.title?.[0]?.plain_text || '(sin nombre)';
const propDias = (p) => p?.['Días sin respuesta']?.formula?.number ?? null;

// Servicios
const svcNombre = (s) => s.properties?.['Nombre del servicio']?.title?.[0]?.plain_text || '(sin nombre)';
const svcFecha = (s) => s.properties?.['Fecha programada']?.date?.start || '';
const svcEstado = (s) => s.properties?.['Estado']?.select?.name || '';
const svcTipo = (s) => s.properties?.['Tipo de servicio']?.select?.name || (s.properties?.['Tipo de servicio']?.multi_select || []).map(o => o.name).join(', ') || '';
const svcLugar = (s) => s.properties?.['Lugar']?.rich_text?.[0]?.plain_text || '';
const svcResultado = (s) => s.properties?.['Resultado']?.select?.name || '';
// TODO el equipo que estuvo: piloto (Operario App) + ayudantes (Operarios participantes).
function svcEquipo(s) {
  const piloto = s.properties?.['Operario App']?.select?.name;
  const ayud = (s.properties?.['Operarios participantes']?.multi_select || []).map(o => o.name);
  const out = [];
  if (piloto) out.push(piloto);
  ayud.forEach(a => { if (a && a !== piloto) out.push(a); });
  return out;
}
function svcCard(s, { resultado = false } = {}) {
  const meta = [svcFecha(s) && '📅 ' + svcFecha(s), svcTipo(s) && '🏢 ' + esc(svcTipo(s)), svcLugar(s) && '📍 ' + esc(svcLugar(s))].filter(Boolean).join(' · ');
  const piloto = s.properties?.['Operario App']?.select?.name || '';
  const ayud = (s.properties?.['Operarios participantes']?.multi_select || []).map(o => o.name).filter(a => a && a !== piloto);
  const res = resultado && svcResultado(s) ? ` <span style="color:#00C98D;font-size:12px">${esc(svcResultado(s))}</span>` : '';
  return `<div style="padding:10px 0;border-bottom:1px solid #1d2a25">
    <div style="font-weight:700;color:#ffffff">${esc(svcNombre(s))}${res}</div>
    ${meta ? `<div style="font-size:13px;color:#9fb5ac;margin-top:2px">${meta}</div>` : ''}
    ${piloto ? `<div style="font-size:13px;color:#9fb5ac;margin-top:2px">👨‍✈️ Piloto: ${esc(piloto)}</div>` : ''}
    ${ayud.length ? `<div style="font-size:13px;color:#9fb5ac;margin-top:2px">👥 Ayudantes: ${esc(ayud.join(', '))}</div>` : ''}
  </div>`;
}
const section = (title) => `<h2 style="font-size:15px;color:#ffffff;margin:22px 0 6px;border-top:1px solid #1d2a25;padding-top:16px">${title}</h2>`;
const empty = (msg) => `<div style="color:#6f8a80;font-size:13px;padding:6px 0">${msg}</div>`;
const BTN = `<div style="margin:18px 0 6px"><a href="${APP_URL}" style="display:inline-block;background:#00C98D;color:#062019;font-weight:800;text-decoration:none;padding:12px 26px;border-radius:8px;font-size:15px">Abrir FlyClean →</a></div>`;

export default async function handler(req, res) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.authorization !== `Bearer ${secret}`) return res.status(401).json({ error: 'unauthorized' });
  const tipo = (req.query?.tipo || '').toString() || (new Date().getUTCDay() === 1 ? 'lunes' : 'viernes');
  const toOverride = req.query?.to ? String(req.query.to) : null;

  try {
    const today = new Date().toISOString().slice(0, 10);
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
    const in7 = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

    // Servicios: DB con múltiples data sources → queryAll cae al search (trae todo) y filtramos acá.
    const allSvc = await queryAll(SERVICIOS_DB).catch(() => []);
    const svcDone = allSvc.filter(s => svcEstado(s) === '✅ Completado' && svcFecha(s) >= weekAgo)
      .sort((a, b) => svcFecha(b).localeCompare(svcFecha(a)));
    const svcSinOp = allSvc.filter(s => !s.properties?.['Operario App']?.select?.name && ['📋 Pendiente', '🔄 Asignado'].includes(svcEstado(s)))
      .sort((a, b) => svcFecha(a).localeCompare(svcFecha(b)));
    const svcProximos = allSvc.filter(s => ['📋 Pendiente', '🔄 Asignado', '✈️ En curso'].includes(svcEstado(s)) && svcFecha(s) >= today && svcFecha(s) <= in7)
      .sort((a, b) => svcFecha(a).localeCompare(svcFecha(b)));

    // Propuestas para re-contactar (esperando respuesta, +15 días)
    const propsEsp = await queryAll(PROPUESTAS_DB, {
      filter: { or: ESTADOS_ESPERANDO.map(s => ({ property: 'Estado pipeline', select: { equals: s } })) },
    }).catch(() => []);
    const recontactar = propsEsp.map(p => ({ nombre: propTitle(p.properties || {}), dias: propDias(p.properties || {}) }))
      .filter(r => r.dias != null && r.dias >= 15).sort((a, b) => b.dias - a.dias);
    const recHtml = recontactar.length
      ? `<ul style="margin:6px 0;padding-left:18px">${recontactar.slice(0, 20).map(r => `<li style="margin:3px 0;color:#cfe0d9"><b>${esc(r.nombre)}</b> — ${r.dias} días</li>`).join('')}</ul>`
      : empty('Nada para re-contactar 🎉');

    // Equipo de la semana (cuenta piloto + ayudantes en servicios completados)
    const tally = {};
    svcDone.forEach(s => svcEquipo(s).forEach(op => { tally[op] = (tally[op] || 0) + 1; }));
    const tallyEntries = Object.entries(tally).sort((a, b) => b[1] - a[1]);
    const tallyHtml = tallyEntries.length
      ? `<ul style="margin:6px 0;padding-left:18px">${tallyEntries.map(([op, n]) => `<li style="margin:3px 0;color:#cfe0d9">${esc(op)}: <b>${n}</b> servicio${n > 1 ? 's' : ''}</li>`).join('')}</ul>`
      : empty('—');

    let subject, body;
    if (tipo === 'lunes') {
      subject = 'FlyClean · Lunes — pendientes de la semana';
      body = `<p style="color:#cfe0d9">Buen comienzo de semana 👋 Esto hay para esta semana:</p>${BTN}` +
        section(`🗓️ Próximos servicios (${svcProximos.length})`) + (svcProximos.length ? svcProximos.map(s => svcCard(s)).join('') : empty('Sin servicios programados.')) +
        section(`📋 Servicios sin operario asignado (${svcSinOp.length})`) + (svcSinOp.length ? svcSinOp.map(s => svcCard(s)).join('') : empty('Todos asignados ✅')) +
        section(`📞 Propuestas para re-contactar (${recontactar.length})`) + recHtml;
    } else {
      subject = 'FlyClean · Viernes — resumen de la semana';
      body = `<p style="color:#cfe0d9">Resumen de la semana 📊</p>${BTN}` +
        section(`✅ Servicios completados (${svcDone.length})`) + (svcDone.length ? svcDone.map(s => svcCard(s, { resultado: true })).join('') : empty('Ningún servicio completado esta semana.')) +
        section(`👷 Equipo de la semana`) + tallyHtml +
        section(`📞 Propuestas para re-contactar (${recontactar.length})`) + recHtml +
        section(`📋 Servicios sin operario (${svcSinOp.length})`) + (svcSinOp.length ? svcSinOp.map(s => svcCard(s)).join('') : empty('Todos asignados ✅'));
    }

    const emailRes = await sendEmail({ to: toOverride || CEO_EMAIL, subject, html: emailLayout(subject, body) });
    return res.status(200).json({ ok: true, tipo, to: toOverride || CEO_EMAIL, svcDone: svcDone.length, svcSinOp: svcSinOp.length, svcProximos: svcProximos.length, recontactar: recontactar.length, email: emailRes });
  } catch (e) {
    console.error('[cron-report]', e);
    return res.status(500).json({ error: String(e.message || e) });
  }
}
