// Envío de emails vía Resend. Requiere RESEND_API_KEY.
// Si la key no está configurada NO falla: loguea y devuelve { skipped:true } para
// no romper el cron (así el resto de la automatización corre igual).
const RESEND_URL = 'https://api.resend.com/emails';
// Remitente: para PROBAR se usa el dominio de prueba de Resend (no requiere verificar
// dominio). Para el paso OFICIAL, verificar flyclean.app en Resend y setear
// RESEND_FROM = 'FlyClean <avisos@flyclean.app>'.
const FROM = process.env.RESEND_FROM || 'FlyClean <onboarding@resend.dev>';

export async function sendEmail({ to, subject, html }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn('[email] RESEND_API_KEY no configurada — email salteado:', subject);
    return { skipped: true };
  }
  const recipients = Array.isArray(to) ? to : [to];
  const r = await fetch(RESEND_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM, to: recipients, subject, html }),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) {
    console.error('[email] Resend error', r.status, d);
    throw new Error(`Resend ${r.status}: ${d.message || ''}`);
  }
  return d;
}

// Layout HTML con marca FlyClean (verde #00C98D, dark).
export function emailLayout(title, bodyHtml) {
  return `<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;background:#0e1512;color:#e8f0ec;border-radius:12px;overflow:hidden">
    <div style="background:#00C98D;padding:18px 24px;color:#062019;font-weight:800;font-size:18px">✦ FlyClean</div>
    <div style="padding:24px;line-height:1.6">
      <h1 style="font-size:18px;margin:0 0 16px;color:#ffffff">${title}</h1>
      ${bodyHtml}
    </div>
    <div style="padding:14px 24px;border-top:1px solid #1d2a25;color:#6f8a80;font-size:12px">FlyClean — mensaje automático · no responder</div>
  </div>`;
}
