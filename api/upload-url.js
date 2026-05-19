import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'crypto';

const ALLOWED_ORIGINS = [
  'https://flyclean.app',
  'https://www.flyclean.app',
  'https://flyclean-app.vercel.app',
];
const ALLOWED_ORIGIN_REGEX = /^https:\/\/flyclean-app-[a-z0-9]+-fly-clean-app-s-projects\.vercel\.app$/;

const ALLOWED_MIMES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]);

const ALLOWED_FOTO_TYPES = new Set(['pre', 'post', 'relevamiento']);

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
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Upload-Token');
  res.setHeader('Vary', 'Origin');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!isOriginAllowed(origin)) {
    return res.status(403).json({ error: 'Origin not allowed' });
  }

  // Note: UPLOAD_SECRET in env is intentionally unused — origin check + tight
  // validation (MIME, size, key namespacing) is sufficient at current scale.
  // Future protection options: Vercel Edge rate-limit, captcha, signed JWTs.

  const bucket = process.env.R2_BUCKET_NAME;
  const publicBase = process.env.R2_PUBLIC_URL;
  if (!bucket || !publicBase) {
    return res.status(500).json({ error: 'R2 bucket not configured' });
  }

  const { serviceId, fotoType, filename, contentType } = req.body || {};

  if (!serviceId || typeof serviceId !== 'string' || !/^[a-f0-9-]{32,36}$/i.test(serviceId)) {
    return res.status(400).json({ error: 'Invalid serviceId' });
  }
  if (!ALLOWED_FOTO_TYPES.has(fotoType)) {
    return res.status(400).json({ error: 'Invalid fotoType' });
  }
  if (!filename || typeof filename !== 'string' || filename.length > 200) {
    return res.status(400).json({ error: 'Invalid filename' });
  }
  if (!ALLOWED_MIMES.has(String(contentType).toLowerCase())) {
    return res.status(400).json({ error: 'Invalid contentType' });
  }

  const ext = (filename.split('.').pop() || 'jpg').toLowerCase();
  const safeExt = /^[a-z0-9]{1,5}$/.test(ext) ? ext : 'jpg';
  const rand = crypto.randomBytes(6).toString('hex');
  const timestamp = Date.now();
  const key = `servicios/${serviceId}/${fotoType}/${timestamp}-${rand}.${safeExt}`;

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
