// Genera el PDF de devolución de un servicio con un Chrome real (server-side).
// GET /api/report-pdf?id=<pageId de Notion>  → devuelve el PDF para descargar.
// Mucho más confiable que html2canvas en el cliente: texto nítido, fotos siempre.
import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';
import { buildReportHTML } from './_lib/report-template.js';

const NOTION_BASE = 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';

async function notionGet(path) {
  const r = await fetch(`${NOTION_BASE}/${path}`, {
    headers: { Authorization: `Bearer ${process.env.NOTION_TOKEN}`, 'Notion-Version': NOTION_VERSION },
  });
  if (!r.ok) throw new Error(`Notion ${path}: ${r.status}`);
  return r.json();
}

export default async function handler(req, res) {
  const id = (req.query?.id || '').toString().trim();
  if (!id) return res.status(400).send('Falta el parámetro id');
  if (!process.env.NOTION_TOKEN) return res.status(500).send('NOTION_TOKEN no configurado');

  let browser = null;
  try {
    const page = await notionGet('pages/' + id);
    const props = page.properties || {};

    // Nombre del cliente desde la relación Contacto (best-effort).
    let clienteName = '';
    const rel = props['Contacto']?.relation || props['Contactos']?.relation || [];
    if (rel[0]?.id) {
      try {
        const c = await notionGet('pages/' + rel[0].id);
        clienteName = c.properties?.['Nombre']?.title?.[0]?.plain_text
          || c.properties?.['Name']?.title?.[0]?.plain_text || '';
      } catch (_) {}
    }

    const html = buildReportHTML(props, { clienteName });

    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: { width: 794, height: 1123, deviceScaleFactor: 2 },
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });
    const p = await browser.newPage();
    await p.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });
    const pdf = await p.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0', bottom: '0', left: '0', right: '0' },
    });
    await browser.close();
    browser = null;

    const nombre = (props['Nombre del servicio']?.title?.[0]?.plain_text || 'servicio')
      .replace(/[^a-z0-9-_ ]/gi, '').trim().replace(/\s+/g, '-') || 'servicio';
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="FlyClean-${nombre}.pdf"`);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).send(Buffer.from(pdf));
  } catch (e) {
    console.error('[report-pdf]', e);
    if (browser) { try { await browser.close(); } catch (_) {} }
    return res.status(500).send('Error generando el PDF: ' + (e.message || e));
  }
}
