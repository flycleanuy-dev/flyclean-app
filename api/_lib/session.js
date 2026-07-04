// Token de sesión stateless (firmado HMAC) — NO requiere base/KV.
// verify-pin lo emite al validar el PIN; el proxy /api/notion y /api/upload-url lo exigen.
// Cierra el agujero #1: sin un token válido (= sin login con PIN), el proxy rechaza.
//
// La clave de firma se DERIVA de un secreto de servidor que ya existe (CRON_SECRET) → no hay
// que crear una env nueva. Si CRON_SECRET rota, los tokens viejos dejan de valer (los usuarios
// reingresan el PIN una vez). El token NO contiene datos sensibles (solo el id + expiración).
import crypto from 'node:crypto';

// 7 días con RENOVACIÓN SILENCIOSA (blindaje 2026-07-04, decisión de Diego): quien usa la app
// recibe un token fresco vía header X-Session-Renew antes de expirar (ver maybeRenewSession) →
// el equipo activo nunca re-tipea el PIN; un dispositivo inactivo/perdido muere en ≤7 días.
const TTL_MS = 7 * 24 * 60 * 60 * 1000;

function signingKey() {
  // Sin fallback hardcodeado: si falta el secreto, fail-closed (verifySession captura → null; signSession lanza).
  const base = process.env.CRON_SECRET || process.env.NOTION_TOKEN;
  if (!base) throw new Error('Falta CRON_SECRET/NOTION_TOKEN para firmar la sesión');
  return crypto.createHmac('sha256', base).update('flyclean-session-v1').digest();
}

const b64u = (buf) => Buffer.from(buf).toString('base64url');

export function signSession(payload) {
  const body = b64u(JSON.stringify({ ...payload, exp: Date.now() + TTL_MS }));
  const sig = b64u(crypto.createHmac('sha256', signingKey()).update(body).digest());
  return `${body}.${sig}`;
}

// Devuelve el payload si el token es válido y no expiró; si no, null.
export function verifySession(token) {
  if (typeof token !== 'string' || token.length < 8 || token.length > 4096) return null;
  const i = token.indexOf('.');
  if (i < 1) return null;
  const body = token.slice(0, i);
  const sig = token.slice(i + 1);
  let expected;
  try { expected = b64u(crypto.createHmac('sha256', signingKey()).update(body).digest()); } catch { return null; }
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  let payload;
  try { payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')); } catch { return null; }
  if (!payload || typeof payload.exp !== 'number' || Date.now() > payload.exp) return null;
  return payload;
}

// Extrae el token del header "Authorization: Bearer <token>".
export function tokenFromReq(req) {
  const h = (req.headers && req.headers.authorization) || '';
  return h.startsWith('Bearer ') ? h.slice(7) : '';
}

// Renovación silenciosa: si a la sesión le queda menos de la mitad del TTL, emite un token fresco
// en el header X-Session-Renew (el cliente lo captura en callNotion/callDb y pisa fc_token).
// Stateless — no requiere endpoint nuevo ni KV. Llamar DESPUÉS de verificar la sesión.
export function maybeRenewSession(res, session) {
  if (!session || !session.id || typeof session.exp !== 'number') return;
  if (session.exp - Date.now() >= TTL_MS / 2) return;
  try {
    res.setHeader('X-Session-Renew', signSession({ id: session.id }));
    // CORS: sin esto el browser no deja leer el header custom desde fetch.
    res.setHeader('Access-Control-Expose-Headers', 'X-Session-Renew');
  } catch (_) { /* sin secreto de firma → no renovar (fail-quiet; la sesión vigente sigue) */ }
}
