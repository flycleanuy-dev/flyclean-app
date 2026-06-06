// Proxy de imágenes same-origin SOLO para la generación de PDF.
// Las fotos viven en cdn.flyclean.app; al generar el PDF con html2canvas, cargarlas
// directo del CDN falla por CORS/CSP. Sirviéndolas desde el mismo origen
// (/api/img?u=<url>) html2canvas las captura sin problema. Allow-list al CDN propio.
export default async function handler(req, res) {
  const u = req.query?.u;
  if (!u || typeof u !== 'string') return res.status(400).send('missing u');
  let url;
  try { url = new URL(u); } catch { return res.status(400).send('bad url'); }
  if (url.protocol !== 'https:' || url.hostname !== 'cdn.flyclean.app') {
    return res.status(403).send('forbidden host');
  }
  try {
    const r = await fetch(url.toString());
    if (!r.ok) return res.status(r.status).send('upstream ' + r.status);
    const ct = r.headers.get('content-type') || 'image/jpeg';
    const buf = Buffer.from(await r.arrayBuffer());
    res.setHeader('Content-Type', ct);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.status(200).send(buf);
  } catch (e) {
    return res.status(502).send('proxy error');
  }
}
