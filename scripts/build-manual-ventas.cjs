#!/usr/bin/env node
/**
 * Generador del Manual de Ventas (cheat-sheet de uso diario) — v2, 2026-07-06.
 *
 * Standalone: genera SOLO el Manual de Ventas (no depende de los módulos de operario/coord).
 * Recorre https://flyclean.app con Playwright (viewport mobile 430x900), se loguea como el usuario
 * Ventas y saca capturas REALES de sus 4 pestañas: 🎯 Prospección · 💼 Propuestas · 👥 Clientes · 🗺️ Mapa.
 *
 * Rol Ventas actual (v112→v133): trabaja prospectos, VE+recontacta propuestas y clientes (sin editar,
 * sin finanzas). Reemplaza al manual v1 que describía el rol viejo (solo Prospección).
 *
 * ANTI-MUTACIÓN: nunca se clickea un botón que escribe en Notion (Guardar/Crear/Contactado/WhatsApp/
 * Descartar). Los sheets se abren y se cierran vía JS (classList.remove('open')). Los estados con datos
 * (listas de propuestas/clientes/prospectos) se muestran INYECTANDO datos de muestra en memoria y
 * llamando la MISMA función de render de la app (100% client-side, sin fetch ni POST/PATCH a Notion).
 *
 * USO:  cd ~/repos/flyclean-app && node scripts/build-manual-ventas.cjs
 * REQUIERE: Playwright + Chromium (vía ~/.claude/skills/playwright-skill/).
 */

const path = require('path');
const fs = require('fs');

const PLAYWRIGHT_PATH = path.join(
  process.env.HOME,
  '.claude/skills/playwright-skill/node_modules/playwright'
);
let chromium;
try {
  ({ chromium } = require(PLAYWRIGHT_PATH));
} catch (e) {
  console.error('✗ No pude cargar Playwright desde', PLAYWRIGHT_PATH);
  console.error('  Instalar con: cd ~/.claude/skills/playwright-skill && npm run setup');
  process.exit(1);
}

const APP_URL = 'https://flyclean.app/';
const VIEWPORT = { width: 430, height: 900 };
const OUTPUT_DIR = path.join(__dirname, '..', 'docs', 'manuales');
const MANUAL_VERSION = 'v2 (uso)';
const TODAY = new Date().toLocaleDateString('es-UY', { day: '2-digit', month: 'long', year: 'numeric' });

// Usuario Ventas + PIN temporal (Diego lo puso para esta generación; se cambia después).
const VENTAS_USER = 'Ventas UY';
const VENTAS_PIN = '333333';

async function snap(page, opts = {}) {
  await page.waitForTimeout(opts.wait || 300);
  const buf = await page.screenshot({ type: 'png', fullPage: opts.fullPage || false });
  return buf.toString('base64');
}

function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Datos de muestra (client-side, nunca tocan Notion) ────────────────────────
const PROSPECTO_MOCK = [
  {
    id: 'demo-1',
    properties: {
      'Nombre / Empresa': { title: [{ plain_text: 'Edificio Costa Azul' }] },
      Estado: { select: { name: '🤝 Interesado' } },
      'Contacto (persona)': { rich_text: [{ plain_text: 'Rosana (administración)' }] },
      'Origen del lead': { select: { name: '🧲 Vendedor' } },
      Interés: { multi_select: [{ name: '🏢 Fachada' }] },
      'Teléfono / WhatsApp': { phone_number: '+598 99 111 222' },
      'Próximo contacto': { date: { start: '2026-06-27' } },
      'Notas prospección': {
        rich_text: [{ plain_text: 'Pidió cotización para 12 pisos, esperando respuesta.' }],
      },
    },
  },
  {
    id: 'demo-2',
    properties: {
      'Nombre / Empresa': { title: [{ plain_text: 'Torre Nex' }] },
      Estado: { select: { name: '📵 Prospecto contactado' } },
      'Contacto (persona)': { rich_text: [{ plain_text: 'Martín, encargado' }] },
      'Origen del lead': { select: { name: '🤝 Referido' } },
      Interés: { multi_select: [{ name: '🪟 Vidrios' }] },
      'Teléfono / WhatsApp': { phone_number: '+598 98 333 444' },
      'Próximo contacto': { date: { start: '2026-07-10' } },
      'Notas prospección': { rich_text: [] },
    },
  },
];

const PROPUESTAS_MOCK = [
  {
    id: 'prop-1',
    properties: {
      'Nombre de propuesta': { title: [{ plain_text: 'Torre Náutica — Limpieza de fachada' }] },
      'Estado pipeline': { select: { name: '📤 Enviada al cliente' } },
      País: { select: { name: '🇺🇾 Uruguay' } },
      'Importe estimado': { number: 45000 },
      'Días sin respuesta': { formula: { number: 18 } },
      'Última interacción': { date: { start: '2026-06-18' } },
      'Fecha de envío': { date: { start: '2026-06-14' } },
      Contacto: { relation: [{ id: 'c-1' }] },
    },
  },
  {
    id: 'prop-2',
    properties: {
      'Nombre de propuesta': { title: [{ plain_text: 'Solanas — Vidrios (recurrente)' }] },
      'Estado pipeline': { select: { name: '🤝 Negociando' } },
      País: { select: { name: '🇺🇾 Uruguay' } },
      'Importe estimado': { number: 28000 },
      'Días sin respuesta': { formula: { number: 9 } },
      'Última interacción': { date: { start: '2026-06-27' } },
      'Fecha de envío': { date: { start: '2026-06-20' } },
      Contacto: { relation: [{ id: 'c-2' }] },
    },
  },
];

// Clientes: uno de mantenimiento (para el destacado "🔁 para recontactar") + dos en cartera activa.
const CLIENTE_MANT = {
  id: 'cli-mant',
  _mantMeses: 10,
  properties: {
    'Nombre / Empresa': { title: [{ plain_text: 'Hotel Brava' }] },
    Estado: { select: { name: '✅ Cliente activo' } },
    'Tipo de cliente': { select: { name: '🏨 Hotel' } },
    País: { select: { name: '🇺🇾 Uruguay' } },
    'Teléfono / WhatsApp': { phone_number: '+598 42 555 000' },
    Email: { email: 'gerencia@hotelbrava.uy' },
    'Servicio de interés': { multi_select: [{ name: '🏢 Fachada' }, { name: '🪟 Vidrios' }] },
  },
};
const CLIENTES_ACTIVOS = [
  {
    id: 'cli-1',
    properties: {
      'Nombre / Empresa': { title: [{ plain_text: 'Edificio Biarritz' }] },
      Estado: { select: { name: '✅ Cliente activo' } },
      'Tipo de cliente': { select: { name: '🏢 Administración' } },
      País: { select: { name: '🇺🇾 Uruguay' } },
      'Teléfono / WhatsApp': { phone_number: '+598 99 123 456' },
      Email: { email: 'admin@biarritz.uy' },
      'Servicio de interés': { multi_select: [{ name: '🏢 Fachada' }] },
    },
  },
  {
    id: 'cli-2',
    properties: {
      'Nombre / Empresa': { title: [{ plain_text: 'Punta Shopping' }] },
      Estado: { select: { name: '✅ Cliente activo' } },
      'Tipo de cliente': { select: { name: '🛍️ Shopping' } },
      País: { select: { name: '🇺🇾 Uruguay' } },
      'Teléfono / WhatsApp': { phone_number: '+598 42 777 888' },
      Email: { email: '' },
      'Servicio de interés': { multi_select: [{ name: '🪟 Vidrios' }] },
    },
  },
];

// ── Login ─────────────────────────────────────────────────────────────────────
async function login(page, country, userName, pin) {
  await page.goto(APP_URL, { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle' });
  const consentBtn = page.locator('#consent-overlay button');
  if (await consentBtn.isVisible().catch(() => false)) {
    await consentBtn.click();
    await page.waitForTimeout(300);
  }
  await page.waitForSelector('#screen-country.active', { timeout: 15000 });
  await page.locator('.country-card', { hasText: country }).click();
  await page.waitForSelector('#screen-login.active');
  await page.locator('#users-list .user-card', { hasText: userName }).click();
  await page.waitForSelector('#screen-pin.active');
  for (const d of pin) await page.locator(`.pin-key:has-text("${d}")`).first().click();
  // Espera a que entre al panel (coordinator screen, que Ventas reutiliza)
  await page.waitForSelector('#screen-coordinator.active', { timeout: 15000 });
}

// ── Contenido del manual de Ventas ─────────────────────────────────────────────
async function buildVentasSections(page) {
  const sections = [];

  console.log('  [Ventas] Login como', VENTAS_USER, '...');
  await login(page, 'Uruguay', VENTAS_USER, VENTAS_PIN);
  await page.waitForTimeout(2500);

  // 1) Tu app: 4 pestañas (home = Prospección, con mock para que se vea la lista)
  console.log('  [Ventas] 1/5 — pestañas + prospección...');
  await page.evaluate(mock => {
    if (typeof _coordAllProspectos !== 'undefined') _coordAllProspectos = mock;
    if (typeof renderProspeccionList === 'function') renderProspeccionList();
  }, PROSPECTO_MOCK);
  const imgHome = await snap(page, { wait: 700 });
  sections.push({
    title: 'Tu app: 4 pestañas, todo tu circuito comercial',
    intro:
      'Entrás con tu PIN y caés directo en 🎯 Prospección. Arriba tenés tus 4 pestañas: 🎯 Prospección · 💼 Propuestas · 👥 Clientes · 🗺️ Mapa. No ves finanzas ni la operativa: tu app es 100% comercial.',
    steps: [
      {
        title: '🎯 Prospección · 💼 Propuestas · 👥 Clientes · 🗺️ Mapa',
        description:
          'Prospección es donde trabajás los leads nuevos. Propuestas y Clientes son para SEGUIR y RECONTACTAR (mirás, no editás). El Mapa te muestra objetivos para salir a buscar.',
        image: imgHome,
        wide: true,
      },
    ],
  });

  // 2) + Prospecto (abrir sheet, capturar, cerrar sin guardar)
  console.log('  [Ventas] 2/5 — alta de prospecto...');
  let imgSheet = null;
  const nuevoBtn = page.locator('button:has-text("Prospecto")').first();
  if ((await nuevoBtn.count()) > 0) {
    await nuevoBtn.click();
    await page.waitForTimeout(900);
    imgSheet = await snap(page, { fullPage: true });
    await page.evaluate(() => {
      document.getElementById('prospecto-overlay')?.classList.remove('open');
    });
    await page.waitForTimeout(400);
  }
  sections.push({
    title: '＋ Prospecto — cargalo en 20 segundos',
    intro:
      'Apenas terminás un llamado o visita, cargá el lead. Solo el nombre de la empresa/edificio es obligatorio; el resto suma pero no frena.',
    steps: [
      {
        title: 'Empresa · contacto · tel · zona · origen · interés · nota',
        description:
          'Origen (🧲 Vendedor / 🤝 Referido / 🌐 Web / 📞 Entrante / 🚶 Puerta fría) e Interés (🏢 Fachada / 🪟 Vidrios / ☀️ Paneles) son botones de un toque. "Próximo contacto" se pre-carga a 3 días.',
        image: imgSheet,
        wide: true,
      },
    ],
  });

  // 3) Lista de prospección por urgencia + acciones (mock ya inyectado; recontacto)
  console.log('  [Ventas] 3/5 — lista + acciones...');
  const imgLista = await snap(page, { wait: 400 });
  sections.push({
    title: 'Trabajá tus prospectos por urgencia',
    intro: 'Los prospectos con "Próximo contacto" vencido o de hoy suben arriba, en rojo: esos llamalos ya.',
    steps: [
      {
        title: '💬 WhatsApp · 📞 Contactado hoy · 🤝 Interesado · ❌ Descartar',
        description:
          '💬 WhatsApp abre el chat con un mensaje listo. "Contactado hoy" reprograma +7 días. "Interesado" lo marca caliente → ahí el COORDINADOR arma la propuesta (vos no cotizás). "Descartar" lo manda al fondo (no se borra).',
        image: imgLista,
        wide: true,
        note: 'La fecha en rojo "vencido" en la primera card = un prospecto que ya deberías haber llamado.',
      },
    ],
  });

  // 4) Propuestas — seguimiento (mock, sin fetch)
  console.log('  [Ventas] 4/5 — propuestas (seguimiento)...');
  await page.evaluate(mock => {
    if (typeof setCoordTab === 'function') setCoordTab('propuestas', true); // highlight de la tab, sin fetch
    if (typeof _coordAllProps !== 'undefined') _coordAllProps = mock;
    if (typeof renderCoordPropuestasList === 'function') renderCoordPropuestasList();
  }, PROPUESTAS_MOCK);
  const imgProp = await snap(page, { wait: 600, fullPage: true });
  sections.push({
    title: '💼 Propuestas — seguí los presupuestos',
    intro:
      'Acá ves las cotizaciones que armó el coordinador y en qué estado están. Vos NO editás ni cambiás precios: mirás y recontactás para que no se enfríen.',
    steps: [
      {
        title: '"📞 A contactar hoy" + 💬 WhatsApp + 📞 Contactado',
        description:
          'Arriba aparece "A contactar hoy": las propuestas que hace 15+ días esperan respuesta (con "☠️ le quedan N días" antes de vencer). 💬 WhatsApp abre el chat; 📞 Contactado registra que llamaste (resetea el reloj). No tocás importes ni estados.',
        image: imgProp,
        wide: true,
      },
    ],
  });

  // 5) Clientes — recontactar cartera (mock con sección mantenimiento)
  console.log('  [Ventas] 5/5 — clientes (recontactar)...');
  await page.evaluate(
    data => {
      if (typeof setCoordTab === 'function') setCoordTab('contactos', true);
      if (typeof _contactsContainerId !== 'undefined') _contactsContainerId = 'coord-content';
      if (typeof _coordAllContacts !== 'undefined') _coordAllContacts = data.all;
      if (typeof _coordCliSecciones !== 'undefined') _coordCliSecciones = data.secciones;
      if (typeof renderContactList === 'function') renderContactList(data.all);
    },
    {
      all: [CLIENTE_MANT, ...CLIENTES_ACTIVOS],
      secciones: {
        mantenimiento: [CLIENTE_MANT],
        activa: CLIENTES_ACTIVOS,
        sinRespuesta: [],
        rechazados: [],
      },
    }
  );
  const imgCli = await snap(page, { wait: 600, fullPage: true });
  sections.push({
    title: '👥 Clientes — recontactá la cartera',
    intro:
      'Ves TODA la cartera de clientes (datos de contacto), sin la plata. Arriba, destacados en "🔁 Mantenimiento", los que hace 9+ meses no tienen un trabajo: esos son los de recontactar para vender de nuevo.',
    steps: [
      {
        title: '💬 WhatsApp (abre) · 📞 Contactado (lo marcás vos)',
        description:
          'Regla de oro: 💬 WhatsApp SOLO abre el chat. 📞 Contactado se marca APARTE y a mano, y solo cuando de verdad hablaste o mandaste el mensaje (si no atienden, NO lo marques). Al marcarlo, ese cliente sale de la lista de recontactar por 60 días para que no lo llamen dos veces.',
        image: imgCli,
        wide: true,
        note: 'Nunca podés editar el cliente ni ver pagos/facturas: tu vista es solo para contactar.',
      },
    ],
  });

  return sections;
}

// ── PDF (idéntico al layout del generador de manuales existente) ────────────────
function buildManualHTML({ title, subtitle, sections }) {
  const sectionsHTML = sections
    .map(
      (sec, i) => `
    <section class="manual-section">
      <div class="section-header"><span class="section-number">${i + 1}</span><h2>${escapeHtml(sec.title)}</h2></div>
      ${sec.intro ? `<p class="section-intro">${escapeHtml(sec.intro)}</p>` : ''}
      <div class="steps-grid">
        ${(sec.steps || [])
          .map(
            (step, j) => `
          <div class="step ${step.wide ? 'step-wide' : ''}">
            <div class="step-head"><span class="step-num">${i + 1}.${j + 1}</span><h3>${escapeHtml(step.title)}</h3></div>
            ${step.description ? `<p>${escapeHtml(step.description).replace(/\n/g, '<br>')}</p>` : ''}
            ${step.image ? `<div class="step-screenshot ${step.wide ? 'wide' : ''}"><img src="data:image/png;base64,${step.image}" alt="${escapeHtml(step.title)}"/></div>` : ''}
            ${step.note ? `<div class="step-note">${escapeHtml(step.note)}</div>` : ''}
          </div>`
          )
          .join('')}
      </div>
    </section>`
    )
    .join('');

  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>${escapeHtml(title)}</title>
<style>
  @page { size: A4; margin: 12mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #0d1f19; line-height: 1.34; font-size: 9.2pt; }
  .cover-band { display: flex; align-items: center; justify-content: space-between; gap: 12pt; background: linear-gradient(135deg, #00C98D 0%, #00a574 100%); color: #fff; border-radius: 9pt; padding: 14pt 18pt; margin-bottom: 12pt; }
  .cover-brand { font-size: 20pt; font-weight: 700; letter-spacing: -0.3pt; }
  .cover-tagline { font-size: 9pt; opacity: 0.92; margin-top: 2pt; }
  .cover-title { font-size: 16pt; font-weight: 700; line-height: 1.1; text-align: right; }
  .cover-subtitle { font-size: 9.5pt; opacity: 0.95; margin-top: 3pt; text-align: right; }
  .cover-meta { font-size: 7.8pt; opacity: 0.85; text-align: right; margin-top: 5pt; }
  .manual-section { padding-bottom: 7pt; }
  .section-header { display: flex; align-items: baseline; gap: 8pt; border-bottom: 1.6pt solid #00C98D; padding-bottom: 3.5pt; margin-bottom: 7pt; margin-top: 6pt; }
  .section-number { display: inline-flex; align-items: center; justify-content: center; width: 17pt; height: 17pt; background: #00C98D; color: #fff; border-radius: 50%; font-size: 9.5pt; font-weight: 700; flex-shrink: 0; }
  .section-header h2 { font-size: 12.5pt; font-weight: 700; color: #0d1f19; line-height: 1.15; }
  .section-intro { font-size: 8.8pt; color: #456b5e; margin-bottom: 7pt; padding: 4pt 8pt; background: #f4f8f6; border-left: 2.5pt solid #00C98D; border-radius: 3pt; }
  .steps-grid { display: flex; flex-wrap: wrap; gap: 8pt; align-items: flex-start; }
  .step { flex: 1 1 calc(50% - 8pt); max-width: calc(50% - 8pt); min-width: 150pt; page-break-inside: avoid; break-inside: avoid; border: 0.7pt solid #e3ede9; border-radius: 6pt; padding: 7pt 8pt; margin-bottom: 5pt; }
  .step-wide { flex: 1 1 100%; max-width: 100%; }
  .step-head { display: flex; align-items: baseline; gap: 6pt; margin-bottom: 3pt; }
  .step-num { flex-shrink: 0; font-size: 7.8pt; font-weight: 700; color: #00C98D; }
  .step h3 { font-size: 9.6pt; font-weight: 700; color: #0d1f19; line-height: 1.15; }
  .step p { font-size: 8.5pt; color: #395a4e; margin-bottom: 4pt; }
  .step-screenshot { background: #f4f8f6; border: 0.7pt solid #ddeae4; border-radius: 5pt; padding: 4pt; text-align: center; margin: 4pt 0; }
  .step-screenshot img { max-width: 100%; height: auto; display: inline-block; max-height: 67mm; border-radius: 3pt; }
  .step-screenshot.wide img { max-height: 92mm; }
  .step:has(.step-screenshot) { display: grid; grid-template-columns: 0.82fr 1.18fr; column-gap: 10pt; align-items: start; flex-basis: 100% !important; max-width: 100% !important; }
  .step:has(.step-screenshot) > .step-head, .step:has(.step-screenshot) > p, .step:has(.step-screenshot) > .step-note { grid-column: 1; }
  .step:has(.step-screenshot) > .step-screenshot { grid-column: 2; grid-row: 1 / span 30; margin: 0; }
  .step-note { font-size: 8.2pt; color: #b45309; background: #fff8e6; border: 0.7pt solid #fde68a; border-radius: 3pt; padding: 4pt 7pt; margin-top: 4pt; }
</style></head><body>
  <div class="cover-band">
    <div><div class="cover-brand">FlyClean</div><div class="cover-tagline">Cheat-sheet de uso diario</div></div>
    <div><div class="cover-title">${escapeHtml(title)}</div><div class="cover-subtitle">${escapeHtml(subtitle)}</div><div class="cover-meta">${MANUAL_VERSION} · ${TODAY} · flyclean.app</div></div>
  </div>
  ${sectionsHTML}
</body></html>`;
}

async function htmlToPDF(browser, html, outputPath, footerTitle) {
  const ctx = await browser.newContext({ viewport: { width: 794, height: 1123 } });
  const page = await ctx.newPage();
  await page.setContent(html, { waitUntil: 'networkidle' });
  await page.emulateMedia({ media: 'print' });
  const footerTemplate = `<div style="font-size:7pt;color:#8aada3;width:100%;padding:0 12mm;display:flex;justify-content:space-between;"><span>${escapeHtml(footerTitle)} · ${MANUAL_VERSION} · ${TODAY}</span><span>Pág. <span class="pageNumber"></span> / <span class="totalPages"></span></span></div>`;
  await page.pdf({
    path: outputPath,
    format: 'A4',
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: '<div></div>',
    footerTemplate,
    margin: { top: '12mm', right: '12mm', bottom: '14mm', left: '12mm' },
  });
  await ctx.close();
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  console.log('🚀 Lanzando Chromium headless...');
  const browser = await chromium.launch({ headless: true });
  try {
    console.log('\n📘 Generando Manual de Ventas...');
    const ctx = await browser.newContext({ viewport: VIEWPORT, acceptDownloads: false });
    const page = await ctx.newPage();
    page.on('pageerror', e => console.warn('  ⚠ page error:', e.message.slice(0, 150)));
    const sections = await buildVentasSections(page);
    await ctx.close();

    const html = buildManualHTML({
      title: 'Manual de Ventas',
      subtitle: 'Prospección, propuestas y clientes — tu circuito comercial',
      sections,
    });
    fs.writeFileSync(path.join(OUTPUT_DIR, '_ventas-debug.html'), html);
    const outPath = path.join(OUTPUT_DIR, 'Manual_Ventas_v2.pdf');
    await htmlToPDF(browser, html, outPath, 'Manual de Ventas');
    console.log('  ✓', outPath, '(', (fs.statSync(outPath).size / 1024).toFixed(0), 'KB )');
    console.log('\n✅ Listo.');
  } catch (e) {
    console.error('\n✗ Error:', e.message);
    console.error(e.stack);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
