// Cron DIARIO de pipeline de propuestas (Vercel Cron, 11:00 UTC = 8:00 UY).
// 1) A los 45 días sin respuesta → mueve la propuesta sola a "Sin respuesta".
// 2) A los 15 días → la marca como "para re-contactar" (1 sola vez, vía property
//    "Aviso re-contacto"); si vuelve a estar fresca, limpia el marcador.
// 3) Email a Federico (+ Diego en copia) SOLO si hay novedades.
import { queryAll, updatePage } from './_lib/notion.js';
import { sendEmail, emailLayout } from './_lib/email.js';

const PROPUESTAS_DB = '2c0a4257f4294941b994dfebc1098633';
const COORD_EMAIL = 'federicomaciel939@gmail.com';
const CEO_EMAIL = 'ihodieego@gmail.com';

// Estados "esperando respuesta del cliente" (sujetos a 15d alerta / 45d auto-mover).
// Ajustable: agregá/sacá estados según cómo trabajen el pipeline.
const ESTADOS_ESPERANDO = ['📞 Contactado', '📤 Enviada al cliente', '🤝 Negociando'];
const SIN_RESPUESTA = '😶 Sin respuesta';
const DIAS_ALERTA = 15;
const DIAS_AUTOMOVE = 45;

const titleOf = (p) => p?.['Nombre de propuesta']?.title?.[0]?.plain_text || '(sin nombre)';
const diasOf = (p) => p?.['Días sin respuesta']?.formula?.number ?? null; // misma fórmula que usa el in-app

export default async function handler(req, res) {
  // Seguridad: Vercel Cron manda Authorization: Bearer $CRON_SECRET.
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  // Modo simulación: ?dry=1 calcula y reporta SIN escribir en Notion ni mandar email.
  const dryRun = ['1', 'true', 'yes'].includes(String(req.query?.dry || '').toLowerCase());
  try {
    const propuestas = await queryAll(PROPUESTAS_DB, {
      filter: { or: ESTADOS_ESPERANDO.map(s => ({ property: 'Estado pipeline', select: { equals: s } })) },
    });
    const today = new Date().toISOString().slice(0, 10);
    const movidas = [], nuevasRecontacto = [];

    for (const p of propuestas) {
      const pr = p.properties || {};
      const dias = diasOf(pr);
      if (dias == null) continue;
      const nombre = titleOf(pr);
      const yaAvisado = !!pr['Aviso re-contacto']?.date?.start;

      if (dias >= DIAS_AUTOMOVE) {
        if (!dryRun) await updatePage(p.id, { 'Estado pipeline': { select: { name: SIN_RESPUESTA } } });
        movidas.push({ nombre, dias });
      } else if (dias >= DIAS_ALERTA) {
        if (!yaAvisado) {
          if (!dryRun) await updatePage(p.id, { 'Aviso re-contacto': { date: { start: today } } });
          nuevasRecontacto.push({ nombre, dias });
        }
      } else if (yaAvisado) {
        // Volvió a estar fresca (re-contactada) → limpiar marcador para el próximo ciclo.
        if (!dryRun) await updatePage(p.id, { 'Aviso re-contacto': { date: null } });
      }
    }

    let emailed = false;
    if (!dryRun && (movidas.length || nuevasRecontacto.length)) {
      const li = (arr) => arr.map(x => `<li><b>${x.nombre}</b> — ${x.dias} días</li>`).join('');
      const body =
        (nuevasRecontacto.length ? `<p><b>📞 Para re-contactar (${nuevasRecontacto.length})</b></p><ul>${li(nuevasRecontacto)}</ul>` : '') +
        (movidas.length ? `<p><b>😶 Movidas a "Sin respuesta" automáticamente (${movidas.length})</b></p><ul>${li(movidas)}</ul>` : '');
      await sendEmail({
        to: [COORD_EMAIL, CEO_EMAIL],
        subject: `FlyClean · Pipeline: ${nuevasRecontacto.length} para re-contactar, ${movidas.length} movidas`,
        html: emailLayout('Novedades del pipeline de propuestas', body),
      });
      emailed = true;
    }

    return res.status(200).json({ ok: true, dryRun, revisadas: propuestas.length, nuevasRecontacto: nuevasRecontacto.length, movidas: movidas.length, emailed, detalle: { nuevasRecontacto, movidas } });
  } catch (e) {
    console.error('[cron-pipeline]', e);
    return res.status(500).json({ error: String(e.message || e) });
  }
}
