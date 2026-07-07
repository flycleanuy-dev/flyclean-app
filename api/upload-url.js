import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'crypto';
import { verifySession, tokenFromReq } from './_lib/session.js';
import { userById, esGlobal, esVentas } from './_lib/users.js';

// Auth de sesión (#1/#4). MONITOR (false): valida + reporta en X-Auth, no rechaza. ENFORCE (true):
// rechaza con 401 las subidas sin token válido. Verificado: el endpoint acepta el token (200 +
// presigned) y el cliente lo manda en las 2 subidas. Revertir = poner false.
const ENFORCE_AUTH = true;

const ALLOWED_ORIGINS = [
  'https://flyclean.app',
  'https://www.flyclean.app',
  'https://flyclean-app.vercel.app',
];
const ALLOWED_ORIGIN_REGEX = /^https:\/\/flyclean-app-[a-z0-9]+-fly-clean-app-s-projects\.vercel\.app$/;

// Servicios solo aceptan imágenes (fotos pre/post/relevamiento).
const ALLOWED_IMAGE_MIMES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]);

// Recibos aceptan imágenes O PDFs (factura formal en PDF es común).
const ALLOWED_RECIBO_MIMES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'application/pdf',
]);

// Servicios: pre/post/relevamiento → key servicios/{serviceId}/{fotoType}/...
// Gastos: recibo → key gastos/{gastoId}/...
const ALLOWED_FOTO_TYPES = new Set(['pre', 'post', 'relevamiento', 'recibo']);

// Tope de tamaño por archivo (blindaje 2026-07-04): se firma ContentLength en el presign →
// un PUT con otro tamaño no matchea la firma. Evita llenar el bucket con archivos gigantes.
const MAX_UPLOAD_BYTES = 15 * 1024 * 1024; // 15MB

// ── Ownership del servicio (blindaje 2026-07-04, decisión de Diego: "chequeo completo") ──
// Antes de presignar una foto de servicio, verificamos contra Notion que el servicio EXISTE,
// no está archivado, y que quien sube tiene derecho: un Operario debe figurar en alguno de los
// 4 roles del servicio; un rol de gestión no-global debe coincidir en país. Cache positivo de
// 5 min por (serviceId, userId) para no repetir el fetch en subidas múltiples (pre + post + N fotos).
const _ownCache = new Map(); // `${serviceId}:${userId}` → ts de validación OK
const OWN_CACHE_MS = 5 * 60 * 1000;

async function notionGetPage(pageId) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    const r = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
      headers: { Authorization: `Bearer ${process.env.NOTION_TOKEN}`, 'Notion-Version': '2022-06-28' },
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (r.status === 404) return { notFound: true };
    if (!r.ok) throw new Error('notion ' + r.status);
    return await r.json();
  } catch (e) { clearTimeout(timer); throw e; }
}

// Devuelve null si OK; si no, { status, error } para responder.
// Fail-closed: si Notion no responde, 503 (mismo criterio que los crons).
async function checkServiceOwnership(serviceId, userId) {
  const u = userById(userId);
  if (!u) return { status: 403, error: 'usuario desconocido' };
  if (esVentas(u)) return { status: 403, error: 'rol sin subida de fotos de servicio' };

  const cacheKey = `${serviceId}:${userId}`;
  const hit = _ownCache.get(cacheKey);
  if (hit && Date.now() - hit < OWN_CACHE_MS) return null;

  let page;
  try { page = await notionGetPage(serviceId); }
  catch (_) { return { status: 503, error: 'no se pudo verificar el servicio, reintentá' }; }
  if (page.notFound || page.object !== 'page') return { status: 403, error: 'servicio inexistente' };
  const p = page.properties || {};
  if (p['🗄️ Archivado']?.checkbox === true) return { status: 403, error: 'servicio archivado' };

  const rol = String(u.rol || '');
  if (rol.includes('Operario')) {
    // El operario debe figurar en alguno de los 4 roles del servicio.
    const nombres = [
      p['Operario App']?.select?.name,
      p['Piloto']?.select?.name,
      p['Operario manual']?.select?.name,
      ...((p['Operarios participantes']?.multi_select || []).map(o => o.name)),
    ].filter(Boolean);
    if (!nombres.includes(u.nombre)) return { status: 403, error: 'servicio no asignado a este operario' };
  } else if (!esGlobal(u)) {
    // Gestión por país (coordinador/CEO país/finanzas): el servicio debe ser de su país
    // (espejo de recEnPaisNotion: Uruguay incluye registros sin país).
    const paisSvc = p['País']?.select?.name || '';
    const match = paisSvc ? paisSvc === u.pais : u.pais === 'Uruguay';
    if (!match) return { status: 403, error: 'servicio de otro país' };
  }

  _ownCache.set(cacheKey, Date.now()); // solo se cachean los OK (un recién asignado no queda bloqueado)
  return null;
}

function getR2Client() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error('R2 credentials not configured');
  }

  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
    // R2 no soporta los checksums automáticos del SDK v3 (>=3.700) en presigned URLs.
    // Sin esto, el PUT falla con "Credential access key has length 33" (mensaje engañoso).
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
  });
}

function isOriginAllowed(origin) {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  if (ALLOWED_ORIGIN_REGEX.test(origin)) return true;
  return false;
}

export default async function handler(req, res) {
  const origin = req.headers.origin || '';
  const corsOrigin = isOriginAllowed(origin) ? origin : 'https://flyclean.app';

  res.setHeader('Access-Control-Allow-Origin', corsOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Upload-Token, Authorization');
  res.setHeader('Vary', 'Origin');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!isOriginAllowed(origin)) {
    return res.status(403).json({ error: 'Origin not allowed' });
  }

  // Auth de sesión (#4): exige el token firmado de verify-pin. MONITOR reporta, ENFORCE rechaza.
  const session = verifySession(tokenFromReq(req));
  res.setHeader('X-Auth', session ? 'ok' : 'missing');
  if (ENFORCE_AUTH && !session) return res.status(401).json({ error: 'auth required' });

  // Note: UPLOAD_SECRET in env is intentionally unused — origin check + tight
  // validation (MIME, size, key namespacing) is sufficient at current scale.
  // Future protection options: Vercel Edge rate-limit, captcha, signed JWTs.

  const bucket = process.env.R2_BUCKET_NAME;
  const publicBase = process.env.R2_PUBLIC_URL;
  if (!bucket || !publicBase) {
    return res.status(500).json({ error: 'R2 bucket not configured' });
  }

  const { serviceId, gastoId, fotoType, filename, contentType, contentLength } = req.body || {};

  if (!ALLOWED_FOTO_TYPES.has(fotoType)) {
    return res.status(400).json({ error: 'Invalid fotoType' });
  }
  // Tope de tamaño OBLIGATORIO (2026-07-07, cierre de la transición): el cliente DEBE declarar los bytes;
  // se validan y se FIRMAN en el presign (un PUT con otro tamaño falla la firma → no hay fail-open del
  // tope de 15MB). El front manda contentLength en ambas rutas desde hace varias versiones
  // (index.html fotos + recibos); un shell PWA muy viejo cacheado recibe 400 con instrucción de recargar.
  const n = Number(contentLength);
  if (contentLength == null || !Number.isFinite(n) || n <= 0) {
    return res.status(400).json({ error: 'falta el tamaño del archivo — actualizá la app (recargala) e intentá de nuevo' });
  }
  if (n > MAX_UPLOAD_BYTES) {
    return res.status(400).json({ error: 'archivo demasiado grande (máx 15MB)' });
  }
  const sizeToSign = Math.round(n);
  if (!filename || typeof filename !== 'string' || filename.length > 200) {
    return res.status(400).json({ error: 'Invalid filename' });
  }
  // Recibos aceptan también PDF; fotos de servicio solo imágenes.
  const allowedMimes = fotoType === 'recibo' ? ALLOWED_RECIBO_MIMES : ALLOWED_IMAGE_MIMES;
  if (!allowedMimes.has(String(contentType).toLowerCase())) {
    return res.status(400).json({ error: 'Invalid contentType' });
  }

  const ext = (filename.split('.').pop() || 'jpg').toLowerCase();
  const safeExt = /^[a-z0-9]{1,5}$/.test(ext) ? ext : 'jpg';
  const rand = crypto.randomBytes(6).toString('hex');
  const timestamp = Date.now();

  // Servicios: pre/post/relevamiento exigen serviceId (UUID Notion 32-36 chars).
  // Gastos: recibo exige gastoId (UUID v4 generado client-side, 8-36 chars).
  let key;
  if (fotoType === 'recibo') {
    if (!gastoId || typeof gastoId !== 'string' || !/^[a-z0-9-]{8,36}$/i.test(gastoId)) {
      return res.status(400).json({ error: 'Invalid gastoId' });
    }
    // El gasto aún no existe en Notion al subir el recibo (gastoId = UUID client-side) →
    // el chequeo acá es por ROL: todos cargan gastos salvo Ventas.
    const uRec = session ? userById(session.id) : null;
    if (!uRec) return res.status(403).json({ error: 'usuario desconocido' });
    if (esVentas(uRec)) return res.status(403).json({ error: 'rol sin carga de gastos' });
    key = `gastos/${gastoId}/${timestamp}-${rand}.${safeExt}`;
  } else {
    if (!serviceId || typeof serviceId !== 'string' || !/^[a-f0-9-]{32,36}$/i.test(serviceId)) {
      return res.status(400).json({ error: 'Invalid serviceId' });
    }
    // Ownership server-side: el servicio existe, no está archivado y este usuario puede subirle fotos.
    if (session) {
      const deny = await checkServiceOwnership(serviceId, session.id);
      if (deny) return res.status(deny.status).json({ error: deny.error });
    }
    key = `servicios/${serviceId}/${fotoType}/${timestamp}-${rand}.${safeExt}`;
  }

  try {
    const r2 = getR2Client();
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
      ...(sizeToSign != null ? { ContentLength: sizeToSign } : {}),
    });
    const uploadUrl = await getSignedUrl(r2, command, { expiresIn: 300 });
    const publicUrl = `${publicBase.replace(/\/$/, '')}/${key}`;

    return res.status(200).json({ uploadUrl, publicUrl, key });
  } catch (err) {
    console.error('Presign error:', err);
    return res.status(500).json({ error: 'Failed to generate URL' });
  }
}
