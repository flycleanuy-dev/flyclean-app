// /api/reporte — recibe reportes de ERROR de la app (Fase A del sistema de Soporte, 2026-07-17).
// El front los manda solo (window.onerror / unhandledrejection vía src/errores.js) o como "detalle"
// (texto que la persona agrega para describir qué estaba haciendo). Se guardan en la tabla Supabase
// `reportes` (la lee Dirección — y Claude en cada sesión de trabajo) y se avisa por email:
//   · tipo 'auto'    → email SOLO la primera vez que ese error aparece en el día (dedup KV por hash+fecha);
//                      las repeticiones solo incrementan el contador (sin spam).
//   · tipo 'detalle' → email SIEMPRE (lo escribió una persona, es oro).
//
// AUTH: token de sesión OPCIONAL — un error en la pantalla de login no tiene token y también queremos
// verlo (queda como anónimo). Con token válido se adjunta usuario/rol/país del lado del server (no se
// confía en lo que diga el body). Anti-spam: rate limit KV por usuario-o-IP (molde verify-pin).
import { verifySession, tokenFromReq, maybeRenewSession } from './_lib/session.js';
import { userById } from './_lib/users.js';
import { sendEmail, emailLayout } from './_lib/email.js';
import { getRecipients } from './_lib/recipients.js';
import crypto from 'node:crypto';

const ALLOWED_ORIGINS = [
  'https://flyclean.app',
  'https://www.flyclean.app',
  'https://flyclean-app.vercel.app',
];
const ALLOWED_ORIGIN_REGEX = /^https:\/\/flyclean-app-[a-z0-9]+-fly-clean-app-s-projects\.vercel\.app$/;
function originAllowed(o) {
  return !!o && (ALLOWED_ORIGINS.includes(o) || ALLOWED_ORIGIN_REGEX.test(o));
}

const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
const KV_URL = process.env.KV_REST_API_URL || '';
const KV_TOKEN = process.env.KV_REST_API_TOKEN || '';
const FALLBACK_TO = 'ihodieego@gmail.com'; // mismo fallback histórico que cron-report.js

async function kvCmd(cmd) {
  const r = await fetch(KV_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${KV_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmd),
  });
  if (!r.ok) throw new Error('KV ' + r.status);
  return (await r.json()).result;
}

// Rate limit por remitente (usuario logueado o IP): máx 10 reportes/min. KV global; si KV falla,
// fail-open (mejor un reporte de más que perder el aviso de que la app está rota).
const RL_WINDOW_MS = 60_000;
const RL_MAX = 10;
async function rateLimited(who) {
  if (!KV_URL || !KV_TOKEN) return false;
  try {
    const bucket = Math.floor(Date.now() / RL_WINDOW_MS);
    const key = `rl:reporte:${who}:${bucket}`;
    const count = Number(await kvCmd(['INCR', key]));
    if (count === 1) {
      try { await kvCmd(['EXPIRE', key, Math.ceil(RL_WINDOW_MS / 1000) + 30]); } catch (_) {}
    }
    return count > RL_MAX;
  } catch (_) {
    return false;
  }
}

const trunc = (s, n) => (typeof s === 'string' ? s.slice(0, n) : '');
const escHtml = s => String(s || '').replace(/[<>&"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));

export default async function handler(req, res) {
  const origin = req.headers.origin || '';
  res.setHeader('Access-Control-Allow-Origin', originAllowed(origin) ? origin : 'https://flyclean.app');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Vary', 'Origin');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (origin && !originAllowed(origin)) return res.status(403).json({ error: 'origin' });
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Sesión OPCIONAL: con token válido, el server resuelve quién es (no se confía en el body).
  let usuario = null, rol = null, pais = null, who = null;
  const session = verifySession(tokenFromReq(req));
  if (session && session.id) {
    maybeRenewSession(res, session);
    const u = userById(session.id);
    if (u) { usuario = u.nombre || session.id; rol = u.rol || null; pais = u.pais || null; }
    who = session.id;
  }
  if (!who) {
    const fwd = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
    who = 'ip:' + (fwd || 'desconocida');
  }

  if (await rateLimited(who)) return res.status(429).json({ error: 'demasiados reportes' });

  const b = req.body || {};
  const tipo = b.tipo === 'detalle' ? 'detalle' : 'auto';
  const mensaje = trunc(b.mensaje, 500).trim();
  if (!mensaje) return res.status(400).json({ error: 'mensaje requerido' });
  const stack = trunc(b.stack, 2000);
  const detalle = trunc(b.detalle, 1000);
  const errHash = crypto.createHash('sha256').update(mensaje).digest('hex').slice(0, 16);

  const fila = {
    tipo,
    usuario,
    rol,
    pais,
    pantalla: trunc(b.pantalla, 60) || null,
    tab: trunc(b.tab, 60) || null,
    version: trunc(b.version, 20) || null,
    mensaje,
    stack: stack || null,
    ua: trunc(b.ua, 300) || null,
    online: typeof b.online === 'boolean' ? b.online : null,
    detalle: detalle || null,
    err_hash: errHash,
  };

  // 1) Guardar en Supabase (lo esencial: si esto falla, el endpoint reporta el fallo).
  if (!SUPABASE_URL || !SERVICE_KEY) return res.status(500).json({ error: 'storage no configurado' });
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/reportes`, {
      method: 'POST',
      headers: {
        apikey: SERVICE_KEY,
        Authorization: 'Bearer ' + SERVICE_KEY,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify([fila]),
    });
    if (!r.ok) throw new Error('supabase ' + r.status);
  } catch (e) {
    console.error('[reporte] insert', e.message);
    return res.status(502).json({ error: 'no se pudo guardar' });
  }

  // 2) Email (best-effort: si Resend falla, el reporte YA quedó guardado igual).
  //    'auto' → dedup por error+día (primera vez avisa; repeticiones solo cuentan).
  //    'detalle' → siempre.
  try {
    let mandar = true;
    let veces = 1;
    if (tipo === 'auto' && KV_URL && KV_TOKEN) {
      const dia = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const key = `err:${errHash}:${dia}`;
      veces = Number(await kvCmd(['INCR', key]));
      if (veces === 1) {
        try { await kvCmd(['EXPIRE', key, 60 * 60 * 26]); } catch (_) {}
      }
      mandar = veces === 1;
    }
    if (mandar) {
      const to = (await getRecipients('reportes')) || [FALLBACK_TO];
      const titulo = tipo === 'detalle' ? '📝 Detalle de un error (escrito por el equipo)' : '🐞 Error nuevo en la app';
      const cuerpo =
        `<p style="font-size:15px;color:#ffb4b4"><b>${escHtml(mensaje)}</b></p>` +
        (detalle ? `<p>📝 <b>Qué estaba haciendo:</b> ${escHtml(detalle)}</p>` : '') +
        `<p style="color:#9db8ae;font-size:13px">` +
        `👤 ${escHtml(usuario || 'anónimo')}${rol ? ' · ' + escHtml(rol) : ''}${pais ? ' · ' + escHtml(pais) : ''}<br>` +
        `📱 pantalla: ${escHtml(fila.pantalla || '?')}${fila.tab ? ' · tab: ' + escHtml(fila.tab) : ''} · v${escHtml(fila.version || '?')}<br>` +
        `${fila.online === false ? '📴 sin conexión · ' : ''}hash ${errHash}</p>` +
        (stack ? `<pre style="background:#141f1a;padding:10px;border-radius:8px;font-size:11px;color:#8fb3a5;white-space:pre-wrap">${escHtml(stack.slice(0, 800))}</pre>` : '') +
        `<p style="color:#6f8a80;font-size:12px">Guardado en la tabla <b>reportes</b>. Si el mismo error se repite hoy, no se re-avisa (solo suma al contador).</p>`;
      await sendEmail({ to, subject: `FlyClean · ${titulo}`, html: emailLayout(titulo, cuerpo) });
    }
  } catch (e) {
    console.error('[reporte] email', e.message);
  }

  return res.status(200).json({ ok: true, hash: errHash });
}
