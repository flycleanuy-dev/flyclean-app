// FlyClean — Backfill ONE-SHOT de 'Fecha de envío' (spec dos-relojes 2026-07-02, decisión de Diego #2).
// El reloj de VIDA (api/cron-pipeline.js) ahora cuenta días desde 'Fecha de envío' para propuestas en
// estados de espera (📞 Contactado / 📤 Enviada al cliente). Las propuestas viejas nunca la tuvieron
// cargada — este script les estampa, una única vez, la fecha de creación de la página (created_time)
// como aproximación razonable de cuándo "nacieron" en ese estado.
//
// NO SE CORRE SOLO — el controlador lo ejecuta después de revisar la salida en DRY=1.
//
// Uso (mismo patrón de setup de cliente que scripts/sync-notion-supabase.mjs, vía api/_lib/notion.js):
//   DRY=1 NOTION_TOKEN=... node scripts/backfill-fecha-envio.mjs   → simula, no escribe nada
//   NOTION_TOKEN=...       node scripts/backfill-fecha-envio.mjs   → escribe de verdad en Notion
import { queryAll, updatePage } from '../api/_lib/notion.js';

const PROPUESTAS_DB = '2c0a4257f4294941b994dfebc1098633';
const ESTADOS_ESPERA = ['📞 Contactado', '📤 Enviada al cliente'];

if (!process.env.NOTION_TOKEN) {
  console.error('Falta env NOTION_TOKEN');
  process.exit(1);
}
const dry = ['1', 'true', 'yes'].includes(String(process.env.DRY || '').toLowerCase());

console.log(`Backfill 'Fecha de envío' · estados de espera (${ESTADOS_ESPERA.join(', ')}) · ${dry ? 'DRY RUN (no escribe)' : 'ESCRIBIENDO EN NOTION'}\n`);

const propuestas = await queryAll(PROPUESTAS_DB, {
  filter: { or: ESTADOS_ESPERA.map(s => ({ property: 'Estado pipeline', select: { equals: s } })) },
});

let candidatas = 0, escritas = 0, errores = 0, sinCreatedTime = 0;

for (const p of propuestas) {
  const pr = p.properties || {};
  const yaTiene = !!pr['Fecha de envío']?.date?.start;
  if (yaTiene) continue;
  candidatas++;

  const nombre = pr['Nombre de propuesta']?.title?.[0]?.plain_text || '(sin nombre)';
  const estado = pr['Estado pipeline']?.select?.name || '';
  const fecha = (p.created_time || '').slice(0, 10); // YYYY-MM-DD

  if (!fecha) {
    sinCreatedTime++;
    console.warn(`  ⚠ ${nombre} (${estado}) — sin created_time, se salta`);
    continue;
  }

  console.log(`  ${dry ? '[dry] ' : ''}${nombre} (${estado}) → Fecha de envío = ${fecha}`);
  if (!dry) {
    try {
      await updatePage(p.id, { 'Fecha de envío': { date: { start: fecha } } });
      escritas++;
    } catch (e) {
      errores++;
      console.error(`  ✗ ${nombre}: ${e.message}`);
    }
  }
}

console.log(`\nListo. ${propuestas.length} propuesta(s) en estados de espera revisadas · ${candidatas} sin 'Fecha de envío'` +
  (dry ? ' (simuladas, nada escrito)' : ` · ${escritas} escrita(s)`) +
  (sinCreatedTime ? ` · ${sinCreatedTime} sin created_time` : '') +
  (errores ? ` · ${errores} error(es)` : '') + '.');

process.exit(errores ? 1 : 0);
