import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'crypto';
import { verifySession, tokenFromReq } from './_lib/session.js';

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

  const { serviceId, gastoId, fotoType, filename, contentType } = req.body || {};

  if (!ALLOWED_FOTO_TYPES.has(fotoType)) {
    return res.status(400).json({ error: 'Invalid fotoType' });
  }
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
    key = `gastos/${gastoId}/${timestamp}-${rand}.${safeExt}`;
  } else {
    if (!serviceId || typeof serviceId !== 'string' || !/^[a-f0-9-]{32,36}$/i.test(serviceId)) {
      return res.status(400).json({ error: 'Invalid serviceId' });
    }
    key = `servicios/${serviceId}/${fotoType}/${timestamp}-${rand}.${safeExt}`;
  }

  try {
    const r2 = getR2Client();
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
    });
    const uploadUrl = await getSignedUrl(r2, command, { expiresIn: 300 });
    const publicUrl = `${publicBase.replace(/\/$/, '')}/${key}`;

    return res.status(200).json({ uploadUrl, publicUrl, key });
  } catch (err) {
    console.error('Presign error:', err);
    return res.status(500).json({ error: 'Failed to generate URL' });
  }
}
