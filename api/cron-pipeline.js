// Cron DIARIO de pipeline de propuestas (Vercel Cron, 11:00 UTC = 8:00 UY).
// DOS RELOJES (spec dos-relojes 2026-07-02, decisión de Diego): "contactar" nuestro no debe poder
// mantener viva una propuesta para siempre si el cliente nunca responde.
// 1) Reloj de VIDA — 45 días SIN RESPUESTA DEL CLIENTE → mueve la propuesta sola a "Sin respuesta":
//    - 📞 Contactado / 📤 Enviada al cliente: cuenta desde 'Fecha de envío' (fallback: created_time
//      de la página). Un contacto nuestro (marcarPropContactada) YA NO resetea este reloj.
//    - 🤝 Negociando: NO muere por envío (hay diálogo real) — sigue con la regla de siempre, 45 días
//      de 'Días sin respuesta' (fórmula desde 'Última interacción').
// 2) Reloj de SEGUIMIENTO — a los 15 días de 'Días sin respuesta' (Última interacción) la marca como
//    "para re-contactar" (1 sola vez, vía property "Aviso re-contacto"); si vuelve a estar fresca,
//    limpia el marcador. Sin cambios respecto a antes.
// 3) Email a Federico (+ Diego en copia) SOLO si hay novedades.
import { queryAll, updatePage } from './_lib/notion.js';
import { sendEmail, emailLayout } from './_lib/email.js';
import { getRecipients } from './_lib/recipients.js';
import { getReglas } from './_lib/appconfig.js';
import { supafirstSet, mergeProps, enqueueOutbox } from './_lib/supafirst.js';
import { mirrorPage } from './_lib/mirror.js';

// Escribe una propuesta respetando el flip Supabase-first (pre-flip de PROPUESTAS, 2026-07-15).
// Con 'propuestas' en SUPAFIRST_TABLES, cron-db-sync solo INSERTA altas (no re-sincroniza ediciones) → si este cron escribiera
// directo a Notion (updatePage), el espejo no se enteraría y la app (que lee del espejo) nunca vería el
// auto-move a "Sin respuesta" ni el marcador de re-contacto. Camino flipeado: mergeProps (espejo) +
// enqueueOutbox (→ Notion con reintentos), el MISMO camino que usa la app. Fallback ante cualquier falla:
// updatePage a Notion + mirrorPage (espeja la página completa) → ambos lados consistentes igual.
async function patchPropuesta(pageId, props) {
  if (supafirstSet().has('propuestas')) {
    try {
      const mp = await mergeProps('propuestas', pageId, props);
      if (mp.ok && mp.found) {
        const eq = await enqueueOutbox(pageId, 'propuestas', props);
        if (eq.ok) return;
      }
      console.warn('[cron-pipeline] supafirst miss → Notion-first + mirror', { id: pageId });
    } catch (e) {
      console.warn('[cron-pipeline] supafirst error → Notion-first', String(e?.message || e).slice(0, 120));
    }
    const page = await updatePage(pageId, props);
    try {
      await mirrorPage('propuestas', page);
    } catch (_) {
      /* best-effort */
    }
    return;
  }
  await updatePage(pageId, props);
}

const PROPUESTAS_DB = '2c0a4257f4294941b994dfebc1098633';
// Fallback histórico si la lista editable (⚙️ Configuración → 📬 Destinatarios) está vacía o KV caído.
const COORD_EMAIL = 'federicomaciel939@gmail.com';
const CEO_EMAIL = 'ihodieego@gmail.com';

// Estados "esperando respuesta del cliente" (sujetos a 15d alerta / 45d auto-mover).
// Ajustable: agregá/sacá estados según cómo trabajen el pipeline.
const ESTADOS_ESPERANDO = ['📞 Contactado', '📤 Enviada al cliente', '🤝 Negociando'];
const SIN_RESPUESTA = '😶 Sin respuesta';
const DIAS_ALERTA = 15;
const DIAS_AUTOMOVE = 45;

const NEGOCIANDO = '🤝 Negociando';
const MS_DIA = 86400000;

const titleOf = p => p?.['Nombre de propuesta']?.title?.[0]?.plain_text || '(sin nombre)';
const diasOf = p => p?.['Días sin respuesta']?.formula?.number ?? null; // misma fórmula que usa el in-app (reloj de SEGUIMIENTO)

// Reloj de VIDA: días desde 'Fecha de envío' (fallback: created_time de la página). Solo se usa para
// el auto-move de Contactado/Enviada — Negociando sigue con diasOf() de siempre.
function diasDeVida(page, props) {
  const fechaEnvio = props?.['Fecha de envío']?.date?.start || page.created_time;
  if (!fechaEnvio) return null;
  return Math.floor((Date.now() - new Date(fechaEnvio).getTime()) / MS_DIA);
}

export default async function handler(req, res) {
  // Seguridad: Vercel Cron manda Authorization: Bearer $CRON_SECRET.
  // Falla CERRADO: sin CRON_SECRET el endpoint NO corre (evita que quede público).
  const secret = process.env.CRON_SECRET;
  if (!secret) return res.status(500).json({ error: 'CRON_SECRET not configured' });
  if (req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  // Modo simulación: ?dry=1 calcula y reporta SIN escribir en Notion ni mandar email.
  const dryRun = ['1', 'true', 'yes'].includes(String(req.query?.dry || '').toLowerCase());
  try {
    // Umbrales editables desde la app (⚙️ Configuración → Reglas). Fallback a las constantes históricas
    // si KV está vacío/caído — el cron NUNCA deja de funcionar por la config.
    const reglas = await getReglas().catch(() => null);
    const diasAlerta =
      Number.isInteger(reglas?.pipelineAviso) && reglas.pipelineAviso >= 1
        ? reglas.pipelineAviso
        : DIAS_ALERTA;
    const diasAutomove =
      Number.isInteger(reglas?.pipelineSinRespuesta) && reglas.pipelineSinRespuesta >= 1
        ? reglas.pipelineSinRespuesta
        : DIAS_AUTOMOVE;
    const propuestas = await queryAll(PROPUESTAS_DB, {
      filter: { or: ESTADOS_ESPERANDO.map(s => ({ property: 'Estado pipeline', select: { equals: s } })) },
    });
    const today = new Date().toISOString().slice(0, 10);
    const movidas = [],
      nuevasRecontacto = [];

    for (const p of propuestas) {
      const pr = p.properties || {};
      const estado = pr['Estado pipeline']?.select?.name || '';
      const esNegociando = estado === NEGOCIANDO;
      const dias = diasOf(pr); // reloj de SEGUIMIENTO (Última interacción) — igual que siempre.
      const nombre = titleOf(pr);
      const yaAvisado = !!pr['Aviso re-contacto']?.date?.start;

      // Snooze por registro ('Posponer aviso hasta', date): mientras la fecha sea futura, esta propuesta
      // queda PAUSADA — ni marcador de 15d ni auto-move de 45d. Al vencer la fecha, retoma sola el ciclo
      // normal. Defensivo: si la property no existe, posp queda '' y no pausa nada.
      const posp = (pr['Posponer aviso hasta']?.date?.start || '').split('T')[0];
      if (posp && posp > today) {
        // Si ya tenía el marcador de aviso, limpiarlo: al vencer el snooze reavisa FRESCO (email incluido).
        if (yaAvisado && !dryRun) await patchPropuesta(p.id, { 'Aviso re-contacto': { date: null } });
        continue;
      }

      // Reloj de VIDA: Negociando usa 'dias' (regla actual, sin cambios); Contactado/Enviada usan
      // días desde 'Fecha de envío' (fallback created_time) — un contacto nuestro ya no la revive.
      const diasVida = esNegociando ? dias : diasDeVida(p, pr);

      if (diasVida != null && diasVida >= diasAutomove) {
        if (!dryRun) await patchPropuesta(p.id, { 'Estado pipeline': { select: { name: SIN_RESPUESTA } } });
        movidas.push({ nombre, dias: diasVida });
        continue; // ya se movió — no evaluar el reloj de seguimiento sobre esta.
      }

      if (dias == null) continue; // sin 'Última interacción' no hay nada más que evaluar (alerta 15d).
      if (dias >= diasAlerta) {
        if (!yaAvisado) {
          if (!dryRun) await patchPropuesta(p.id, { 'Aviso re-contacto': { date: { start: today } } });
          nuevasRecontacto.push({ nombre, dias });
        }
      } else if (yaAvisado) {
        // Volvió a estar fresca (re-contactada) → limpiar marcador para el próximo ciclo.
        if (!dryRun) await patchPropuesta(p.id, { 'Aviso re-contacto': { date: null } });
      }
    }

    let emailed = false;
    if (!dryRun && (movidas.length || nuevasRecontacto.length)) {
      // esc: los nombres vienen de Notion (texto libre) → escapar antes de interpolar en el HTML
      // del email (mismo criterio que cron-report.js).
      const esc = s =>
        String(s ?? '')
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;');
      const li = arr =>
        arr
          .map(
            x =>
              `<li style="margin:3px 0;color:#cfe0d9"><b>${esc(x.nombre)}</b> — ${Number(x.dias)} días</li>`
          )
          .join('');
      const btn = `<div style="margin:8px 0 16px"><a href="https://www.flyclean.app/" style="display:inline-block;background:#00C98D;color:#062019;font-weight:800;text-decoration:none;padding:12px 26px;border-radius:8px;font-size:15px">Abrir FlyClean →</a></div>`;
      const body =
        btn +
        (nuevasRecontacto.length
          ? `<p><b>📞 Para re-contactar (${nuevasRecontacto.length})</b></p><ul>${li(nuevasRecontacto)}</ul>`
          : '') +
        (movidas.length
          ? `<p><b>😶 Movidas a "Sin respuesta" automáticamente (${movidas.length})</b></p><ul>${li(movidas)}</ul>`
          : '');
      // Destinatarios: lista editable de la app (KV) > fallback histórico (Federico + Diego).
      const listaKV = await getRecipients('pipeline');
      await sendEmail({
        to: listaKV || [COORD_EMAIL, CEO_EMAIL],
        subject: `FlyClean · Pipeline: ${nuevasRecontacto.length} para re-contactar, ${movidas.length} movidas`,
        html: emailLayout('Novedades del pipeline de propuestas', body),
      });
      emailed = true;
    }

    return res.status(200).json({
      ok: true,
      dryRun,
      revisadas: propuestas.length,
      nuevasRecontacto: nuevasRecontacto.length,
      movidas: movidas.length,
      emailed,
      detalle: { nuevasRecontacto, movidas },
    });
  } catch (e) {
    console.error('[cron-pipeline]', e);
    return res.status(500).json({ error: String(e.message || e) });
  }
}
