// FlyClean — Sync Notion → Supabase (CLI). La lógica vive en api/_lib/sync.js (compartida con el cron).
// Uso: NOTION_TOKEN=... SUPABASE_URL=... SUPABASE_SERVICE_KEY=... node scripts/sync-notion-supabase.mjs
//   (opcional: SYNC_ONLY=clientes,servicios)
import { syncTables } from '../api/_lib/sync.js';
import { DBS } from '../api/_lib/notion-map.js';

if (!process.env.NOTION_TOKEN || !process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  console.error('Faltan envs: NOTION_TOKEN, SUPABASE_URL, SUPABASE_SERVICE_KEY');
  process.exit(1);
}
const only = (process.env.SYNC_ONLY || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);
const tablas = Object.keys(DBS).filter(t => !only.length || only.includes(t));
// Guard supafirst (fix 15/07): una corrida manual con upsert completo PISARÍA los mergeProps frescos de
// las tablas Supabase-first con el Notion atrasado (mismo motivo que cron-db-sync). FAIL-CLOSED (review):
// las envs de Vercel son Sensitive (no se pullean) → en local SUPAFIRST_TABLES suele NO estar seteada, y
// asumir "vacío = no hay tablas flipeadas" haría el daño justo donde este guard protege. Sin la env, el
// script NO corre: seteala igual que en Vercel (hoy: servicios,clientes,propuestas) o SYNC_FORCE_FULL=1
// si SABÉS que corresponde upsert completo (p.ej. tras drenar el outbox en un rollback).
const rawSupafirst = process.env.SUPAFIRST_TABLES;
if (rawSupafirst === undefined && process.env.SYNC_FORCE_FULL !== '1') {
  console.error('SUPAFIRST_TABLES no está seteado — no puedo saber qué tablas son Supabase-first.');
  console.error(
    'Corré: SUPAFIRST_TABLES=servicios,clientes,propuestas node scripts/sync-notion-supabase.mjs'
  );
  console.error('(o SYNC_FORCE_FULL=1 para upsert completo consciente).');
  process.exit(1);
}
const supafirst =
  process.env.SYNC_FORCE_FULL === '1'
    ? new Set()
    : new Set(
        (rawSupafirst || '')
          .split(',')
          .map(s => s.trim())
          .filter(Boolean)
      );
if (supafirst.size)
  console.log(
    `(modo solo-altas para: ${[...supafirst].join(', ')} — SYNC_FORCE_FULL=1 para upsert completo)\n`
  );
console.log(`Sync Notion → Supabase · ${tablas.length} tabla(s)\n`);
const { perTable, totalOk, totalErr } = await syncTables(tablas, { dry: false, altasOnly: supafirst });
for (const t of tablas) {
  const r = perTable[t] || { ok: 0, err: 0 };
  if (r.err) console.error(`  ✗ ${t.padEnd(20)} ${r.error}`);
  else console.log(`  ✓ ${t.padEnd(20)} ${r.ok} fila(s)`);
}
console.log(`\nListo. ${totalOk} fila(s) sincronizadas · ${totalErr} tabla(s) con error.`);
process.exit(totalErr ? 1 : 0);
