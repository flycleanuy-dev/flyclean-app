// Endpoint público de version-gate.
// La app web (TWA APK) consulta este endpoint para saber:
//   - qué versión web está corriendo el servidor
//   - cuál es la versión mínima de APK que el servidor requiere
// Si el APK detecta que su versión nativa < minApkRequired, muestra "Actualizá la app".

const APP_VERSION = '1.2.7';
const MIN_APK_VERSION_REQUIRED = '1.0.0';

export default function handler(req, res) {
  const origin = req.headers.origin || '';
  const allowedOrigins = [
    'https://flyclean.app',
    'https://www.flyclean.app',
    'https://flyclean-app.vercel.app',
    /^https:\/\/flyclean-app-[a-z0-9]+-fly-clean-app-s-projects\.vercel\.app$/,
  ];
  const originAllowed = allowedOrigins.some(o =>
    typeof o === 'string' ? o === origin : o.test(origin)
  );
  res.setHeader('Access-Control-Allow-Origin', originAllowed ? origin : 'https://flyclean.app');
  res.setHeader('Vary', 'Origin');
  res.setHeader('Cache-Control', 'public, max-age=60');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  return res.status(200).json({
    web: APP_VERSION,
    minApkRequired: MIN_APK_VERSION_REQUIRED,
    timestamp: new Date().toISOString()
  });
}
