// Destinatarios de los reportes por email (Resend), editables desde la app (⚙️ Configuración, solo admins).
// Guardados en KV (Upstash REST, mismo patrón que pins.js) bajo UNA clave JSON. Si KV no está configurado,
// está vacío o falla, los cron degradan a sus constantes históricas (fail-safe: los reportes NUNCA dejan de
// salir por una caída de KV). Esquema v1 = lista global por tipo; preparado para segmentar por país a futuro.
import { kvCmd, kvConfigured } from './pins.js';

export const RECIPIENT_TYPES = ['semanal', 'lunes', 'pipeline', 'reportes']; // 'reportes' = avisos de errores de la app (api/reporte.js)
const KV_KEY = 'email:recipients:v1';
export const MAX_PER_TYPE = 10;

// Regex estricta y SIN caracteres peligrosos (\n, coma, espacios) → anti header-injection en el "to".
const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
export function isValidEmail(e) {
  return typeof e === 'string' && e.length <= 120 && EMAIL_RE.test(e);
}

// Lee TODO el mapa {semanal:[...], lunes:[...], pipeline:[...]}. Devuelve {} si no hay nada / KV caído.
export async function getAllRecipients() {
  if (!kvConfigured()) return {};
  try {
    const raw = await kvCmd(['GET', KV_KEY]);
    if (!raw) return {};
    const obj = JSON.parse(raw);
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return {};
    const out = {};
    for (const t of RECIPIENT_TYPES) {
      const arr = Array.isArray(obj[t]) ? obj[t].filter(isValidEmail).slice(0, MAX_PER_TYPE) : [];
      out[t] = arr;
    }
    return out;
  } catch {
    return {};
  }
}

// Lista de UN tipo, o null si está vacía/no configurada → el caller usa su fallback histórico.
export async function getRecipients(tipo) {
  const all = await getAllRecipients();
  const arr = all[tipo];
  return Array.isArray(arr) && arr.length ? arr : null;
}

// Reemplaza el mapa completo (el endpoint valida ANTES de llamar acá; igual re-filtramos por las dudas).
export async function setAllRecipients(map) {
  const clean = {};
  for (const t of RECIPIENT_TYPES) {
    clean[t] = (Array.isArray(map?.[t]) ? map[t] : []).filter(isValidEmail).slice(0, MAX_PER_TYPE);
  }
  await kvCmd(['SET', KV_KEY, JSON.stringify(clean)]);
  return clean;
}
