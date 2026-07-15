// /api/cron-db-sync — Cron Vercel (cada 10 min): sincroniza Notion → Supabase para mantener
// el espejo al día (incluido lo editado a mano en Notion). La app sigue 100% en Notion.
// Auth: Vercel Cron manda Authorization: Bearer $CRON_SECRET. Falla CERRADO (sin secreto NO corre).
import { syncTables } from './_lib/sync.js';

const TABLES = ['clientes', 'servicios', 'propuestas', 'ingresos', 'gastos'];

export default async function handler(req, res) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return res.status(500).json({ error: 'CRON_SECRET not configured' });
  if (req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  // Si Supabase no está configurado todavía, no rompe: salta sin error.
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    return res.status(200).json({ skipped: 'supabase no configurado' });
  }
  // ?dry=1 → cuenta filas sin escribir.
  const dry = ['1', 'true', 'yes'].includes(String(req.query?.dry || '').toLowerCase());
  // Fase 3a.2 (mejorado pre-flip INGRESOS 2026-07-15): una tabla Supabase-first NO se re-sincroniza completa
  // desde Notion (el upsert pisaría la fila fresca del espejo con la versión vieja de Notion → data-loss),
  // pero SÍ corre en modo "solo ALTAS": inserta las filas nuevas de Notion que el espejo no tiene (el cowork
  // de Finanzas appendea gastos/ingresos directo en Notion) y reconcilia bajas. Ver syncTables en _lib/sync.js.
  // Con SUPAFIRST_TABLES vacío, comportamiento idéntico al histórico (upsert completo de todo).
  const supafirst = new Set(
    (process.env.SUPAFIRST_TABLES || '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
  );
  try {
    const result = await syncTables(TABLES, { dry, altasOnly: supafirst });
    console.log('cron-db-sync', JSON.stringify(result));
    return res.status(200).json(result);
  } catch (e) {
    console.error('cron-db-sync error', e.message);
    return res.status(500).json({ error: e.message });
  }
}
