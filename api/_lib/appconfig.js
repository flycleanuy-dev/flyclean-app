// Configuración del NEGOCIO editable desde la app (⚙️ Configuración, solo admins): reglas/umbrales,
// checklist del operario y plantillas de WhatsApp. Guardada en KV (Upstash REST, patrón pins.js) bajo UNA
// clave JSON. Fail-safe en TODOS los consumidores: si KV está vacío/caído, cada consumidor usa sus DEFAULTS
// históricos de código (el front sus consts, cron-pipeline sus 15/45) → nada deja de funcionar por KV.
import { kvCmd, kvConfigured } from './pins.js';

const KV_KEY = 'config:app:v1';

export const REGLAS_KEYS = ['pipelineAviso', 'pipelineSinRespuesta', 'mantenimientoDias', 'ventasSnoozeDias', 'prospectoDias'];
export const WA_KEYS = ['prop', 'prospecto', 'cliente'];
const MAX_CHECKLIST_ITEMS = 40;
const MAX_ITEM_LEN = 140;
const MAX_WA_LEN = 400;

// Lee la config completa. {} si no hay nada / KV caído (el caller degrada a sus defaults).
export async function getAppConfig() {
  if (!kvConfigured()) return {};
  try {
    const raw = await kvCmd(['GET', KV_KEY]);
    if (!raw) return {};
    const obj = JSON.parse(raw);
    return (obj && typeof obj === 'object' && !Array.isArray(obj)) ? obj : {};
  } catch { return {}; }
}

// Solo las reglas (para cron-pipeline). null si no hay override → el cron usa sus constantes.
export async function getReglas() {
  const c = await getAppConfig();
  return (c.reglas && typeof c.reglas === 'object') ? c.reglas : null;
}

// Valida el objeto ENTERO. Devuelve string de error o null si es válido. Estricta (prioridad de Diego):
// claves solo de allow-list, números acotados, textos sin <> (el checklist se renderiza en la UI del
// operario y las plantillas van a wa.me — defensa en profundidad aunque el front escape/encodee).
export function validateAppConfig(cfg) {
  if (!cfg || typeof cfg !== 'object' || Array.isArray(cfg)) return 'config inválida';
  const allowedTop = ['reglas', 'checklistPre', 'checklistPost', 'waTemplates'];
  for (const k of Object.keys(cfg)) if (!allowedTop.includes(k)) return `clave desconocida: ${String(k).slice(0, 30)}`;

  if (cfg.reglas !== undefined) {
    if (!cfg.reglas || typeof cfg.reglas !== 'object' || Array.isArray(cfg.reglas)) return 'reglas inválidas';
    for (const [k, v] of Object.entries(cfg.reglas)) {
      if (!REGLAS_KEYS.includes(k)) return `regla desconocida: ${String(k).slice(0, 30)}`;
      if (!Number.isInteger(v) || v < 1 || v > 3650) return `"${k}" debe ser un entero entre 1 y 3650 días`;
    }
    const a = cfg.reglas.pipelineAviso, s = cfg.reglas.pipelineSinRespuesta;
    if (Number.isInteger(a) && Number.isInteger(s) && a >= s) return 'el aviso de seguimiento debe ser MENOR que los días de "sin respuesta"';
  }

  for (const key of ['checklistPre', 'checklistPost']) {
    if (cfg[key] !== undefined) {
      if (!Array.isArray(cfg[key])) return `${key} debe ser una lista`;
      if (cfg[key].length > MAX_CHECKLIST_ITEMS) return `máximo ${MAX_CHECKLIST_ITEMS} ítems de checklist`;
      for (const it of cfg[key]) {
        if (typeof it !== 'string' || !it.trim() || it.length > MAX_ITEM_LEN) return 'cada ítem debe ser texto de 1 a 140 caracteres';
        if (/[<>]/.test(it)) return 'los ítems no pueden contener < o >';
      }
    }
  }

  if (cfg.waTemplates !== undefined) {
    if (!cfg.waTemplates || typeof cfg.waTemplates !== 'object' || Array.isArray(cfg.waTemplates)) return 'plantillas inválidas';
    for (const [k, v] of Object.entries(cfg.waTemplates)) {
      if (!WA_KEYS.includes(k)) return `plantilla desconocida: ${String(k).slice(0, 30)}`;
      if (!v || typeof v !== 'object' || Array.isArray(v)) return `plantilla "${k}" inválida`;
      for (const [lang, txt] of Object.entries(v)) {
        if (!['es', 'pt'].includes(lang)) return `idioma desconocido en "${k}"`;
        if (typeof txt !== 'string' || txt.length > MAX_WA_LEN) return `la plantilla "${k}" (${lang}) supera ${MAX_WA_LEN} caracteres`;
        if (/[<>]/.test(txt)) return 'las plantillas no pueden contener < o >';
      }
    }
  }
  return null;
}

// Guarda la config ENTERA (el endpoint valida antes; acá re-validamos por las dudas — fail-closed).
export async function setAppConfig(cfg) {
  const err = validateAppConfig(cfg);
  if (err) throw new Error(err);
  await kvCmd(['SET', KV_KEY, JSON.stringify(cfg)]);
  return cfg;
}
