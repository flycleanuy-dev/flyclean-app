// Endpoint TEMPORAL de diagnóstico. Borrar después de verificar.
// Solo reporta longitudes y un hash corto — nunca expone el valor real.
import crypto from 'crypto';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  const accountId = process.env.R2_ACCOUNT_ID || '';
  const accessKey = process.env.R2_ACCESS_KEY_ID || '';
  const secret = process.env.R2_SECRET_ACCESS_KEY || '';
  const bucket = process.env.R2_BUCKET_NAME || '';
  const publicUrl = process.env.R2_PUBLIC_URL || '';

  const shortHash = (s) => s ? crypto.createHash('sha256').update(s).digest('hex').slice(0, 8) : '(empty)';
  const hasWhitespace = (s) => /\s/.test(s);
  const hasTrailingNewline = (s) => /[\r\n]$/.test(s);

  return res.status(200).json({
    deployTime: new Date().toISOString(),
    R2_ACCOUNT_ID: {
      length: accountId.length,
      expected: 32,
      ok: accountId.length === 32,
      hasWhitespace: hasWhitespace(accountId),
      hasTrailingNewline: hasTrailingNewline(accountId),
      sha256_8: shortHash(accountId)
    },
    R2_ACCESS_KEY_ID: {
      length: accessKey.length,
      expected: 32,
      ok: accessKey.length === 32,
      hasWhitespace: hasWhitespace(accessKey),
      hasTrailingNewline: hasTrailingNewline(accessKey),
      sha256_8: shortHash(accessKey)
    },
    R2_SECRET_ACCESS_KEY: {
      length: secret.length,
      expected: 64,
      ok: secret.length === 64,
      hasWhitespace: hasWhitespace(secret),
      hasTrailingNewline: hasTrailingNewline(secret),
      sha256_8: shortHash(secret)
    },
    R2_BUCKET_NAME: {
      length: bucket.length,
      value: bucket,
      hasWhitespace: hasWhitespace(bucket)
    },
    R2_PUBLIC_URL: {
      length: publicUrl.length,
      value: publicUrl,
      hasWhitespace: hasWhitespace(publicUrl)
    }
  });
}
