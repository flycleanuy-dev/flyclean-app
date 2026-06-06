// Cron de REPORTES al CEO (Diego). Decide el contenido según el día (UTC):
//  - Viernes 21:00 UTC (18 UY) → resumen de lo hecho en la semana.
//  - Lunes   11:00 UTC (8 UY)  → recordatorio de pendientes de la semana pasada.
// Para test manual: ?tipo=viernes | ?tipo=lunes
import { queryAll } from './_lib/notion.js';
import { sendEmail, emailLayout } from './_lib/email.js';

const CEO_EMAIL = 'ihodieego@gmail.com';
const SERVICIOS_DB = 'ccaf276c7f6a460caeb3d2800deab2e5';
const PROPUESTAS_DB = '2c0a4257f4294941b994dfebc1098633';
const ESTADOS_ESPERANDO = ['📞 Contactado', '📤 Enviada al cliente', '🤝 Negociando'];

const titleOf = (p) => p?.['Nombre de propuesta']?.title?.[0]?.plain_text || '(sin nombre)';
const diasOf = (p) => p?.['Días sin respuesta']?.formula?.number ?? null;

export default async function handler(req, res) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.authorization !== `Bearer ${secret}`) return res.status(401).json({ error: 'unauthorized' });

  const forced = (req.query?.tipo || '').toString();
  const tipo = forced || (new Date().getUTCDay() === 1 ? 'lunes' : 'viernes');

  try {
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);

    // Servicios: la DB tiene múltiples data sources → queryAll cae al search (trae todo)
    // y filtramos client-side.
    const allSvc = await queryAll(SERVICIOS_DB).catch(() => []);
    const svcDone = allSvc.filter(s =>
      s.properties?.['Estado']?.select?.name === '✅ Completado' &&
      (s.properties?.['Fecha programada']?.date?.start || '') >= weekAgo);
    const svcSinOp = allSvc.filter(s => {
      const est = s.properties?.['Estado']?.select?.name;
      const hasOp = !!s.properties?.['Operario App']?.select?.name;
      return !hasOp && (est === '📋 Pendiente' || est === '🔄 Asignado');
    });
    const porOperario = {};
    svcDone.forEach(s => {
      const op = s.properties?.['Operario App']?.select?.name || 'Sin asignar';
      porOperario[op] = (porOperario[op] || 0) + 1;
    });

    // Pipeline pendiente (esperando respuesta, +15 días)
    const propsEsp = await queryAll(PROPUESTAS_DB, {
      filter: { or: ESTADOS_ESPERANDO.map(s => ({ property: 'Estado pipeline', select: { equals: s } })) },
    }).catch(() => []);
    const recontactar = propsEsp
      .map(p => ({ nombre: titleOf(p.properties || {}), dias: diasOf(p.properties || {}) }))
      .filter(r => r.dias != null && r.dias >= 15)
      .sort((a, b) => b.dias - a.dias);

    const liRec = recontactar.slice(0, 15).map(r => `<li><b>${r.nombre}</b> — ${r.dias} días</li>`).join('');

    let subject, body;
    if (tipo === 'lunes') {
      subject = 'FlyClean · Lunes — pendientes de la semana';
      body =
        `<p>Buen comienzo de semana 👋 Esto quedó pendiente:</p>` +
        `<p><b>📞 Propuestas para re-contactar (${recontactar.length})</b></p>` +
        `<ul>${liRec || '<li>Nada pendiente 🎉</li>'}</ul>` +
        `<p><b>📋 Servicios sin operario asignado: ${svcSinOp.length}</b></p>`;
    } else {
      subject = 'FlyClean · Viernes — resumen de la semana';
      const opLines = Object.entries(porOperario).sort((a, b) => b[1] - a[1])
        .map(([op, n]) => `<li>${op}: <b>${n}</b> servicio${n > 1 ? 's' : ''}</li>`).join('');
      body =
        `<p>Resumen de la semana 📊</p>` +
        `<p><b>✅ Servicios completados: ${svcDone.length}</b></p>` +
        `<ul>${opLines || '<li>—</li>'}</ul>` +
        `<p><b>📞 Propuestas para re-contactar: ${recontactar.length}</b></p>` +
        `<ul>${liRec || '<li>—</li>'}</ul>` +
        `<p><b>📋 Servicios sin operario: ${svcSinOp.length}</b></p>`;
    }

    await sendEmail({ to: CEO_EMAIL, subject, html: emailLayout(subject, body) });
    return res.status(200).json({ ok: true, tipo, svcDone: svcDone.length, recontactar: recontactar.length, svcSinOp: svcSinOp.length });
  } catch (e) {
    console.error('[cron-report]', e);
    return res.status(500).json({ error: String(e.message || e) });
  }
}
