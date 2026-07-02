-- ============================================================================
-- FlyClean — Migración Supabase: columnas planas nuevas (jornadas + varios)
-- ----------------------------------------------------------------------------
-- ⚠️ CRÍTICO: correr este ALTER en el SQL editor de Supabase ANTES de mergear/
-- deployar la rama `feat/supabase-columnas-nuevas`. El cron (api/cron-db-sync.js)
-- hace upsert vía PostgREST con TODAS las keys del mapeo (api/_lib/notion-map.js);
-- si el mapeo nuevo llega a prod antes de que existan estas columnas, el upsert
-- falla y el sync queda roto cada 10 minutos hasta corregirlo.
--
-- Orden correcto:
--   1) Pegar y ejecutar este archivo en Supabase (SQL editor).
--   2) Recién ahí mergear la rama a main (que lleva el mapeo nuevo) y deployar.
--
-- Cubre properties de Notion agregadas en las últimas semanas (sistema de
-- jornadas, fecha planificada, tipo de servicio, notas pre-servicio, operario
-- manual, método de trabajo, y el link de Mapa en Propuestas) que todavía no
-- tenían columna plana en el espejo Postgres (quedaban solo dentro de `raw`).
-- ============================================================================

-- ───────────────────────── servicios ─────────────────────────

alter table servicios add column if not exists tipo_servicio text;
alter table servicios add column if not exists operario_manual text;
alter table servicios add column if not exists fecha_planificada date;
alter table servicios add column if not exists notas_pre_servicio text;
alter table servicios add column if not exists metodo_trabajo text;
alter table servicios add column if not exists herramienta_manual text;
alter table servicios add column if not exists jornada_n integer;
alter table servicios add column if not exists avance_pct numeric;
alter table servicios add column if not exists orden_madre_notion_id text;

-- ───────────────────────── propuestas ─────────────────────────

alter table propuestas add column if not exists mapa text;
