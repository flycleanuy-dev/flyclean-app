// Admin: setear/resetear el PIN de OTRO usuario (gestión escalable de usuarios por país).
// Reemplaza editar a mano el env Sensitive USER_PINS. Exige (1) sesión válida y (2) que el llamante sea
// admin (allow-list ADMIN_IDS). Guarda el PIN hasheado (scrypt) en KV — verify-pin le da prioridad a KV
// sobre el env, así que el nuevo PIN aplica al instante. NO pide el PIN anterior (es un reset de admin).
import { verifySession, tokenFromReq } from './_lib/session.js';
import { kvConfigured, setUserPinHash, hashPin } from './_lib/pins.js';

export const config = { maxDuration: 10 };

const ALLOWED_ORIGINS = [
  'https://flyclean.app',
  'https://www.flyclean.app',
  'https://flyclean-app.vercel.app',
];
const ALLOWED_ORIGIN_REGEX = /^https:\/\/flyclean-app-[a-z0-9]+-fly-clean-app-s-projects\.vercel\.app$/;
function originAllowed(o) {
  return !!o && (ALLOWED_ORIGINS.includes(o) || ALLOWED_ORIGIN_REGEX.test(o));
}

// Admins que pueden resetear PINs ajenos. Modelo de seguridad (defensa en capas, ya fail-closed para terceros):
//   1) la request exige token de sesión HMAC válido (login con PIN real),
//   2) exige KV configurado (más arriba),
//   3) el llamante debe estar en esta allow-list.
// El default ('diego-laxalt,eduardo-cabral') es CERRADO a todos salvo los 2 dueños — no es "abierto".
// La env ADMIN_IDS (coma-separada) lo SOBREESCRIBE por completo: setearla en Vercel para ampliar/restringir
// sin tocar el código. Si querés que SOLO valga el env (default vacío), avisá y lo cambiamos.
function adminIds() {
  return String(process.env.ADMIN_IDS || 'diego-laxalt,eduardo-cabral')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}

export default async function handler(req, res) {
  const origin = req.headers.origin || '';
  res.setHeader('Access-Control-Allow-Origin', originAllowed(origin) ? origin : 'https://flyclean.app');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Vary', 'Origin');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false });
  if (!originAllowed(origin)) return res.status(403).json({ ok: false, error: 'origin' });
  if (!kvConfigured()) return res.status(503).json({ ok: false, error: 'almacén de PIN no configurado' });

  // (1) sesión válida + (2) el llamante es admin.
  const session = verifySession(tokenFromReq(req));
  if (!session || !session.id) return res.status(401).json({ ok: false, error: 'sesión requerida' });
  if (!adminIds().includes(session.id))
    return res.status(403).json({ ok: false, error: 'solo un admin puede cambiar PINs de otros usuarios' });

  const { targetId, newPin } = req.body || {};
  if (typeof targetId !== 'string' || !targetId || targetId.length > 60)
    return res.status(400).json({ ok: false, error: 'targetId inválido' });
  if (typeof newPin !== 'string' || !/^(\d{4}|\d{6})$/.test(newPin))
    return res.status(400).json({ ok: false, error: 'El PIN debe ser de 4 o 6 dígitos' });

  try {
    await setUserPinHash(targetId, hashPin(newPin));
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ ok: false, error: 'no se pudo guardar el PIN' });
  }
}
