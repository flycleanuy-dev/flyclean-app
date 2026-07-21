-- ============================================================================
-- FlyClean — Fase 3b: CREATES con fallback al espejo (Supabase) cuando Notion falla
-- ----------------------------------------------------------------------------
-- Introduce:
--   1) id_map — mapa de ids LOCALES (uuid v4 minteado por el proxy cuando Notion está caído)
--      → notion_id real (lo back-fillea el worker api/cron-outbox.js al propagar el create).
--      Es la ÚNICA fuente de "esta fila nació local / ya se resolvió a X". Las 5 tablas espejo
--      NO se tocan: la fila local vive en su tabla con notion_id = local_id hasta el back-fill.
--   2) índice parcial en outbox_notion para op='create' (el worker los procesa primero en su grupo).
--
-- SEGURO de correr en cualquier momento: no toca datos existentes; nada la USA hasta que se setee
-- el env CREATE_FALLBACK_TABLES (hoy inexistente → todo el código nuevo es inerte). Idempotente
-- (IF NOT EXISTS). Correr DESPUÉS de 2026-07-17-* (orden de replay por fecha del nombre).
-- ============================================================================

-- 1) ID MAP ------------------------------------------------------------------
create table if not exists id_map (
  local_id    text primary key,                   -- uuid v4 (misma forma que un id de Notion)
  resource    text not null,                      -- clientes|servicios|propuestas|ingresos
  notion_id   text,                               -- NULL = create aún NO propagado a Notion
  resolved_at timestamptz,                        -- cuándo se back-filleó (o se canceló por papelera)
  created_at  timestamptz not null default now()
);
-- pendientes por resource (los consulta reconcileDeletes para NO borrar filas locales como "stale")
create index if not exists idx_idmap_pending on id_map (resource) where notion_id is null;
-- lookup inverso (deep-link con id local ya resuelto → rebuscar por el notion_id real)
create index if not exists idx_idmap_notion  on id_map (notion_id) where notion_id is not null;

-- RLS: solo service_role (sin policies = deny para anon/authenticated). El server usa SERVICE_KEY.
alter table id_map enable row level security;

-- 2) OUTBOX: índice para creates ---------------------------------------------
create index if not exists idx_outbox_create on outbox_notion (notion_id) where op = 'create';

-- 3) CLAIM v2 (fix C1 del review adversarial de creates) ----------------------
-- La guarda original solo excluía páginas con filas 'pending' diferidas. Con creates async aparece una
-- carrera nueva: una corrida deja el grupo create+patch1 en 'processing' (diferido o corrida cortada),
-- llega patch2 'pending', y la corrida siguiente lo reclama SOLO → notionPatch(uuid) → 404 → veneno.
-- Fix: una página con CUALQUIER fila 'processing' o 'pending' diferida NO se reclama (el grupo entero
-- espera a que el create se resuelva o vuelva a pending por el rescate de filas colgadas del worker).
create or replace function claim_outbox(p_limit int)
returns setof outbox_notion
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  update outbox_notion o
     set status = 'processing', updated_at = now()
   where o.id in (
     select ob.id from outbox_notion ob
      where ob.status = 'pending' and ob.next_attempt_at <= now()
        and not exists (
          select 1 from outbox_notion d
           where d.notion_id = ob.notion_id
             and ( d.status = 'processing'
                   or (d.status = 'pending' and d.next_attempt_at > now()) )
        )
      order by ob.created_at
      limit p_limit
      for update skip locked
   )
  returning o.*;
end;
$$;

revoke execute on function claim_outbox(int) from public, anon, authenticated;
grant execute on function claim_outbox(int) to service_role;
