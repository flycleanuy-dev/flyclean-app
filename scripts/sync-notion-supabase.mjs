// FlyClean — Sync Notion → Supabase (CLI). La lógica vive en api/_lib/sync.js (compartida con el cron).
// Uso: NOTION_TOKEN=... SUPABASE_URL=... SUPABASE_SERVICE_KEY=... node scripts/sync-notion-supabase.mjs
//   (opcional: SYNC_ONLY=clientes,servicios)
import { syncTables } from '../api/_lib/sync.js';
import { DBS } from '../api/_lib/notion-map.js';

if (!process.env.NOTION_TOKEN || !process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  console.error('Faltan envs: NOTION_TOKEN, SUPABASE_URL, SUPABASE_SERVICE_KEY');
  process.exit(1);
}
const only = (process.env.SYNC_ONLY || '').split(',').map(s => s.trim()).filter(Boolean);
const tablas = Object.keys(DBS).filter(t => !only.length || only.includes(t));
console.log(`Sync Notion → Supabase · ${tablas.length} tabla(s)\n`);
const { perTable, totalOk, totalErr } = await syncTables(tablas, { dry: false });
for (const t of tablas) {
  const r = perTable[t] || { ok: 0, err: 0 };
  if (r.err) console.error(`  ✗ ${t.padEnd(20)} ${r.error}`);
  else console.log(`  ✓ ${t.padEnd(20)} ${r.ok} fila(s)`);
}
console.log(`\nListo. ${totalOk} fila(s) sincronizadas · ${totalErr} tabla(s) con error.`);
process.exit(totalErr ? 1 : 0);
