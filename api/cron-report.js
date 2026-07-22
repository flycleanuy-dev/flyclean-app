// Cron de REPORTES al CEO (Diego). Decide el contenido según el día (UTC):
//  - Viernes 21:00 UTC (18 UY) → resumen de lo hecho en la semana.
//  - Lunes   11:00 UTC (8 UY)  → pendientes + próximos de la semana.
// Email "autosuficiente": lo leés y solo entrás a la app si hay algo para hacer.
// Test manual: ?tipo=viernes|lunes  ·  ?to=<email> (override, gated por CRON_SECRET)
import { queryAll } from './_lib/notion.js';
import { queryMirrorPages } from './_lib/mirror.js';
import { sendEmail, emailLayout } from './_lib/email.js';
import { getRecipients } from './_lib/recipients.js';

// Día 26: leer del ESPEJO Supabase en vez de Notion (así el email sobrevive una caída de Notion). Flag
// reversible; con espejo caído/no-config cae a Notion. Servicios/Propuestas/Ingresos tienen espejo; Activos
// NO → sigue en Notion. ⚠️ El raw del espejo tiene FÓRMULAS congeladas → 'Días sin respuesta' se RECOMPUTA.
const REPORT_FROM_MIRROR = process.env.REPORT_FROM_MIRROR === '1';
async function readMirrorOr(resource, notionFallbackFn) {
  if (REPORT_FROM_MIRROR) {
    try { return await queryMirrorPages(resource); } catch (_) { /* cae a Notion */ }
  }
  return notionFallbackFn();
}

// Fallback histórico si la lista editable (⚙️ Configuración → 📬 Destinatarios) está vacía o KV caído.
const CEO_EMAIL = 'ihodieego@gmail.com';
// El reporte del LUNES incluye "equipos sin reporte" → va a la gestión. Eduardo se suma en
// ⚙️ Configuración → 📬 Destinatarios (falta su email); estos dos están confirmados en el repo.
const GESTION_LUNES = ['ihodieego@gmail.com', 'federicomaciel939@gmail.com'];
const SERVICIOS_DB = 'ccaf276c7f6a460caeb3d2800deab2e5';
const PROPUESTAS_DB = '2c0a4257f4294941b994dfebc1098633';
const ACTIVOS_DB = 'e75449eeb78143f1b74006a4796c1f95';
const INGRESOS_DB = 'd1e15376e83a408a8a52f47da33c249a';
const ESTADOS_ESPERANDO = ['📞 Contactado', '📤 Enviada al cliente', '🤝 Negociando'];
const APP_URL = 'https://www.flyclean.app/';

const esc = s =>
  String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

// Propuestas
const propTitle = p => p?.['Nombre de propuesta']?.title?.[0]?.plain_text || '(sin nombre)';
// RECOMPUTA los días desde 'Última interacción' (misma lógica que el propDias del front) — NO lee
// '.formula.number', que queda CONGELADO en el espejo. Fallback a la fórmula solo si falta la fecha.
const propDias = p => {
  const ui = (p?.['Última interacción']?.date?.start || '').split('T')[0];
  if (ui) { const d = Math.floor((Date.now() - new Date(ui + 'T00:00:00').getTime()) / 86400000); return d >= 0 ? d : 0; }
  return p?.['Días sin respuesta']?.formula?.number ?? null;
};

// Servicios
const svcNombre = s => s.properties?.['Nombre del servicio']?.title?.[0]?.plain_text || '(sin nombre)';
const svcFecha = s => s.properties?.['Fecha programada']?.date?.start || '';
const svcEstado = s => s.properties?.['Estado']?.select?.name || '';
const svcTipo = s =>
  s.properties?.['Tipo de servicio']?.select?.name ||
  (s.properties?.['Tipo de servicio']?.multi_select || []).map(o => o.name).join(', ') ||
  '';
const svcLugar = s => s.properties?.['Lugar']?.rich_text?.[0]?.plain_text || '';
const svcResultado = s => s.properties?.['Resultado']?.select?.name || '';
// TODO el equipo que estuvo: piloto (Operario App) + ayudantes (Operarios participantes).
function svcEquipo(s) {
  const piloto = s.properties?.['Operario App']?.select?.name;
  const ayud = (s.properties?.['Operarios participantes']?.multi_select || []).map(o => o.name);
  const out = [];
  if (piloto) out.push(piloto);
  ayud.forEach(a => {
    if (a && a !== piloto) out.push(a);
  });
  return out;
}
function svcCard(s, { resultado = false } = {}) {
  const meta = [
    svcFecha(s) && '📅 ' + svcFecha(s),
    svcTipo(s) && '🏢 ' + esc(svcTipo(s)),
    svcLugar(s) && '📍 ' + esc(svcLugar(s)),
  ]
    .filter(Boolean)
    .join(' · ');
  const piloto = s.properties?.['Operario App']?.select?.name || '';
  const ayud = (s.properties?.['Operarios participantes']?.multi_select || [])
    .map(o => o.name)
    .filter(a => a && a !== piloto);
  const res =
    resultado && svcResultado(s)
      ? ` <span style="color:#00C98D;font-size:12px">${esc(svcResultado(s))}</span>`
      : '';
  return `<div style="padding:10px 0;border-bottom:1px solid #1d2a25">
    <div style="font-weight:700;color:#ffffff">${esc(svcNombre(s))}${res}</div>
    ${meta ? `<div style="font-size:13px;color:#9fb5ac;margin-top:2px">${meta}</div>` : ''}
    ${piloto ? `<div style="font-size:13px;color:#9fb5ac;margin-top:2px">👨‍✈️ Piloto: ${esc(piloto)}</div>` : ''}
    ${ayud.length ? `<div style="font-size:13px;color:#9fb5ac;margin-top:2px">👥 Ayudantes: ${esc(ayud.join(', '))}</div>` : ''}
  </div>`;
}
// Activos (módulo 🔧 Equipos) — para el aviso "equipos sin reporte semanal"
const actNombre = a => a.properties?.['Activo']?.title?.[0]?.plain_text || '(sin nombre)';
const actTipo = a => a.properties?.['Tipo']?.select?.name || '';
const actEstado = a => a.properties?.['Estado']?.select?.name || '';
const actResp = a => a.properties?.['Responsable App']?.select?.name || '';
const actCheck = a => a.properties?.['Último check']?.date?.start || '';

const section = title =>
  `<h2 style="font-size:15px;color:#ffffff;margin:22px 0 6px;border-top:1px solid #1d2a25;padding-top:16px">${title}</h2>`;
const empty = msg => `<div style="color:#6f8a80;font-size:13px;padding:6px 0">${msg}</div>`;
const BTN = `<div style="margin:18px 0 6px"><a href="${APP_URL}" style="display:inline-block;background:#00C98D;color:#062019;font-weight:800;text-decoration:none;padding:12px 26px;border-radius:8px;font-size:15px">Abrir FlyClean →</a></div>`;

export default async function handler(req, res) {
  // Falla CERRADO: sin CRON_SECRET el endpoint NO corre (evita exfiltrar el reporte vía ?to=).
  const secret = process.env.CRON_SECRET;
  if (!secret) return res.status(500).json({ error: 'CRON_SECRET not configured' });
  if (req.headers.authorization !== `Bearer ${secret}`)
    return res.status(401).json({ error: 'unauthorized' });
  const tipo = (req.query?.tipo || '').toString() || (new Date().getUTCDay() === 1 ? 'lunes' : 'viernes');
  const toOverride = req.query?.to ? String(req.query.to) : null;

  try {
    const today = new Date().toISOString().slice(0, 10);
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
    const in7 = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

    // Servicios: DB con múltiples data sources → queryAll cae al search (trae todo) y filtramos acá.
    // Espejo-first (flag): el espejo ya trae todo sin el problema multi-source.
    const allSvc = await readMirrorOr('servicios', () => queryAll(SERVICIOS_DB).catch(() => []));
    const svcDone = allSvc
      .filter(s => svcEstado(s) === '✅ Completado' && svcFecha(s) >= weekAgo)
      .sort((a, b) => svcFecha(b).localeCompare(svcFecha(a)));
    const svcSinOp = allSvc
      .filter(
        s =>
          !s.properties?.['Operario App']?.select?.name &&
          ['📋 Pendiente', '🔄 Asignado'].includes(svcEstado(s))
      )
      .sort((a, b) => svcFecha(a).localeCompare(svcFecha(b)));
    const svcProximos = allSvc
      .filter(
        s =>
          ['📋 Pendiente', '🔄 Asignado', '✈️ En curso'].includes(svcEstado(s)) &&
          svcFecha(s) >= today &&
          svcFecha(s) <= in7
      )
      .sort((a, b) => svcFecha(a).localeCompare(svcFecha(b)));

    // Propuestas para re-contactar (esperando respuesta, +15 días)
    // Espejo-first (flag): trae todas y filtra por estado en cliente (el espejo no aplica el filtro Notion);
    // para el path Notion el filtro ya viene aplicado y el .filter de abajo es no-op.
    const propsRaw = await readMirrorOr('propuestas', () =>
      queryAll(PROPUESTAS_DB, {
        filter: { or: ESTADOS_ESPERANDO.map(s => ({ property: 'Estado pipeline', select: { equals: s } })) },
      }).catch(() => [])
    );
    const propsEsp = propsRaw.filter(p => ESTADOS_ESPERANDO.includes(p.properties?.['Estado pipeline']?.select?.name));
    const recontactar = propsEsp
      .filter(p => {
        // Snooze por registro ('Posponer aviso hasta' futuro): pausada → no aparece en el email tampoco.
        const posp = (p.properties?.['Posponer aviso hasta']?.date?.start || '').split('T')[0];
        return !(posp && posp > today);
      })
      .map(p => ({ nombre: propTitle(p.properties || {}), dias: propDias(p.properties || {}) }))
      .filter(r => r.dias != null && r.dias >= 15)
      .sort((a, b) => b.dias - a.dias);
    const recHtml = recontactar.length
      ? `<ul style="margin:6px 0;padding-left:18px">${recontactar
          .slice(0, 20)
          .map(r => `<li style="margin:3px 0;color:#cfe0d9"><b>${esc(r.nombre)}</b> — ${r.dias} días</li>`)
          .join('')}</ul>`
      : empty('Nada para re-contactar 🎉');

    // Equipo de la semana (cuenta piloto + ayudantes en servicios completados)
    const tally = {};
    svcDone.forEach(s =>
      svcEquipo(s).forEach(op => {
        tally[op] = (tally[op] || 0) + 1;
      })
    );
    const tallyEntries = Object.entries(tally).sort((a, b) => b[1] - a[1]);
    const tallyHtml = tallyEntries.length
      ? `<ul style="margin:6px 0;padding-left:18px">${tallyEntries.map(([op, n]) => `<li style="margin:3px 0;color:#cfe0d9">${esc(op)}: <b>${n}</b> servicio${n > 1 ? 's' : ''}</li>`).join('')}</ul>`
      : empty('—');

    // 🔧 Equipos sin reporte semanal — solo se audita los LUNES (el viernes el responsable recién carga).
    // "Sin reporte" = tiene responsable asignado, no está fuera de servicio, y nunca cargó o hace +7 días.
    let equiposHtml = '',
      equiposSinReporte = 0;
    if (tipo === 'lunes') {
      // fail-open PERO honesto: si la consulta cae, decir "no se pudo chequear" (no "todos al día").
      let activos = null;
      try {
        activos = await queryAll(ACTIVOS_DB);
      } catch {
        activos = null;
      }
      if (activos === null) {
        equiposHtml = section('🔧 Equipos') + empty('No se pudo consultar los equipos esta vez.');
      } else {
        const sinReporte = activos
          .filter(
            a =>
              actResp(a) &&
              !actEstado(a).includes('Fuera de servicio') &&
              (!actCheck(a) || actCheck(a) < weekAgo)
          )
          .sort((x, y) => (actCheck(x) || '').localeCompare(actCheck(y) || ''));
        equiposSinReporte = sinReporte.length;
        const eqLinea = a => {
          const c = actCheck(a);
          const dias = c ? Math.floor((Date.now() - new Date(c).getTime()) / 86400000) : null;
          const cuando = dias == null ? 'nunca reportó' : `hace ${dias} día${dias === 1 ? '' : 's'}`;
          return `<div style="padding:8px 0;border-bottom:1px solid #1d2a25">
            <div style="font-weight:700;color:#ffffff">${esc(actNombre(a))}${actTipo(a) ? ` <span style="font-weight:400;color:#9fb5ac;font-size:13px">${esc(actTipo(a))}</span>` : ''}</div>
            <div style="font-size:13px;color:#9fb5ac;margin-top:2px">👤 ${esc(actResp(a))} · último reporte: ${cuando}</div>
          </div>`;
        };
        equiposHtml =
          section(`🔧 Equipos sin reporte esta semana (${sinReporte.length})`) +
          (sinReporte.length ? sinReporte.map(eqLinea).join('') : empty('Todos al día ✅'));
      }
    }

    // 💰 A COBRAR (G2, visión finanzas 19/07) — solo lunes: completados facturables SIN cobro vinculado,
    // los más viejos primero. Sin montos en v1 (el precio exige cruzar propuestas; la agenda con montos
    // vive en la app → botón). fail-open honesto como el bloque de equipos.
    let cobrarHtml = '';
    if (tipo === 'lunes') {
      let ingAll = null;
      try { ingAll = await readMirrorOr('ingresos', () => queryAll(INGRESOS_DB)); } catch { ingAll = null; }
      if (ingAll === null) {
        cobrarHtml = section('💰 A cobrar') + empty('No se pudieron consultar los cobros esta vez.');
      } else {
        const conCobro = new Set();
        ingAll.forEach(i => (i.properties?.['Servicio vinculado']?.relation || []).forEach(x => conCobro.add((x.id || '').replace(/-/g, ''))));
        const tipoDe = s2 => s2.properties?.['Tipo de registro']?.select?.name || '';
        const sinCobro = allSvc
          .filter(s2 => (s2.properties?.['Estado']?.select?.name || '').includes('Completado'))
          .filter(s2 => !/Prueba|Relevamiento|Jornada/.test(tipoDe(s2)))
          .filter(s2 => !(s2.properties?.['Archivado']?.checkbox === true))
          .filter(s2 => !conCobro.has((s2.id || '').replace(/-/g, '')))
          .sort((a, b) => (a.properties?.['Fecha programada']?.date?.start || '').localeCompare(b.properties?.['Fecha programada']?.date?.start || ''));
        const linea = s2 => {
          const f = (s2.properties?.['Fecha programada']?.date?.start || '').slice(0, 10);
          const dias = f ? Math.floor((Date.now() - new Date(f + 'T00:00:00').getTime()) / 86400000) : null;
          return `<div style="padding:8px 0;border-bottom:1px solid #1d2a25">
            <div style="font-weight:700;color:#ffffff">${esc(s2.properties?.['Nombre del servicio']?.title?.[0]?.plain_text || '(servicio)')}</div>
            <div style="font-size:13px;color:#9fb5ac;margin-top:2px">completado ${f || '?'}${dias != null ? ` · hace ${dias} día${dias === 1 ? '' : 's'}` : ''}</div>
          </div>`;
        };
        cobrarHtml =
          section(`💰 A cobrar — completados sin cobro registrado (${sinCobro.length})`) +
          (sinCobro.length
            ? sinCobro.slice(0, 5).map(linea).join('') +
              (sinCobro.length > 5 ? `<div style="padding:8px 0;color:#9fb5ac;font-size:13px">… y ${sinCobro.length - 5} más — la agenda completa con montos está en la app (Finanzas → Por cobrar).</div>` : '')
            : empty('Todo cobrado o registrado ✅'));
      }
    }

    let subject, body;
    if (tipo === 'lunes') {
      subject = 'FlyClean · Lunes — pendientes de la semana';
      body =
        `<p style="color:#cfe0d9">Buen comienzo de semana 👋 Esto hay para esta semana:</p>${BTN}` +
        section(`🗓️ Próximos servicios (${svcProximos.length})`) +
        (svcProximos.length
          ? svcProximos.map(s => svcCard(s)).join('')
          : empty('Sin servicios programados.')) +
        cobrarHtml +
        section(`📋 Servicios sin operario asignado (${svcSinOp.length})`) +
        (svcSinOp.length ? svcSinOp.map(s => svcCard(s)).join('') : empty('Todos asignados ✅')) +
        section(`📞 Propuestas para re-contactar (${recontactar.length})`) +
        recHtml +
        equiposHtml;
    } else {
      subject = 'FlyClean · Viernes — resumen de la semana';
      body =
        `<p style="color:#cfe0d9">Resumen de la semana 📊</p>${BTN}` +
        section(`✅ Servicios completados (${svcDone.length})`) +
        (svcDone.length
          ? svcDone.map(s => svcCard(s, { resultado: true })).join('')
          : empty('Ningún servicio completado esta semana.')) +
        section(`👷 Equipo de la semana`) +
        tallyHtml +
        section(`📞 Propuestas para re-contactar (${recontactar.length})`) +
        recHtml +
        section(`📋 Servicios sin operario (${svcSinOp.length})`) +
        (svcSinOp.length ? svcSinOp.map(s => svcCard(s)).join('') : empty('Todos asignados ✅'));
    }

    // Destinatarios: ?to= (test manual) > lista editable de la app (KV) > fallback histórico.
    // El lunes cae a la gestión (incluye el aviso de equipos); el viernes, al CEO.
    const listaKV = toOverride ? null : await getRecipients(tipo === 'viernes' ? 'semanal' : 'lunes');
    const to = toOverride || listaKV || (tipo === 'lunes' ? GESTION_LUNES : CEO_EMAIL);
    const emailRes = await sendEmail({ to, subject, html: emailLayout(subject, body) });
    return res.status(200).json({
      ok: true,
      tipo,
      to,
      svcDone: svcDone.length,
      svcSinOp: svcSinOp.length,
      svcProximos: svcProximos.length,
      recontactar: recontactar.length,
      equiposSinReporte,
      email: emailRes,
    });
  } catch (e) {
    console.error('[cron-report]', e);
    return res.status(500).json({ error: String(e.message || e) });
  }
}
