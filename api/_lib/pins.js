// Store de PINs personalizados en Vercel KV (Upstash REST) + hashing scrypt.
// Los PIN "por defecto" siguen en USER_PINS (env); cuando un usuario CAMBIA su PIN, el nuevo se
// guarda hasheado acá (KV) y tiene prioridad sobre el default. Si KV no está configurado o falla,
// el sistema degrada al default de USER_PINS (nadie queda trancado por una caída de KV).
import crypto from 'node:crypto';

const KV_URL = process.env.KV_REST_API_URL || '';
const KV_TOKEN = process.env.KV_REST_API_TOKEN || '';

export function kvConfigured() { return !!(KV_URL && KV_TOKEN); }

// Upstash REST: POST <url> con body ["CMD", arg, ...] y Authorization: Bearer <token>.
async function kvCmd(cmd) {
  const r = await fetch(KV_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${KV_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmd),
  });
  if (!r.ok) throw new Error('KV ' + r.status);
  const j = await r.json();
  return j.result;
}

// Hash de PIN: scrypt salteado (lento → el hash no es reversible ni aunque se filtre). Formato s2$salt$hash.
export function hashPin(pin) {
  const salt = crypto.randomBytes(16);
  const dk = crypto.scryptSync(String(pin), salt, 32);
  return `s2$${salt.toString('hex')}$${dk.toString('hex')}`;
}

export function verifyPinHash(pin, stored) {
  try {
    const [v, saltHex, hashHex] = String(stored).split('$');
    if (v !== 's2' || !saltHex || !hashHex) return false;
    const dk = crypto.scryptSync(String(pin), Buffer.from(saltHex, 'hex'), 32);
    const a = Buffer.from(hashHex, 'hex');
    return a.length === dk.length && crypto.timingSafeEqual(a, dk);
  } catch { return false; }
}

// Devuelve el hash custom del usuario (o null si no tiene / KV no disponible).
export async function getUserPinHash(id) {
  if (!kvConfigured()) return null;
  try { return await kvCmd(['GET', `pin:${id}`]); } catch { return null; }
}

export async function setUserPinHash(id, hash) {
  return kvCmd(['SET', `pin:${id}`, hash]);
}

// Borra el PIN custom del usuario (para el borrado DEFINITIVO). Best-effort: si KV no está, nada que borrar.
export async function deleteUserPin(id) {
  if (!kvConfigured()) return null;
  return kvCmd(['DEL', `pin:${id}`]);
}

// BLOQUEA el acceso (baja suave): escribe un centinela no-hash. verify-pin prioriza el valor de KV sobre el
// default de USER_PINS, y `verifyPinHash(pin,'blocked')` devuelve false para CUALQUIER pin (no es formato s2$…)
// → el usuario dado de baja NO puede entrar, ni siquiera con el PIN por defecto del env. Reactivar/🔑 lo pisan.
export async function blockUserPin(id) {
  if (!kvConfigured()) return null;
  return kvCmd(['SET', `pin:${id}`, 'blocked']);
}
