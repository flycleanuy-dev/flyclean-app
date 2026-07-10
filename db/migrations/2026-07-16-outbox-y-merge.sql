-- ============================================================================
-- FlyClean — Fase 3a.2: Supabase-first para EDICIONES (PATCH)
-- ----------------------------------------------------------------------------
-- Introduce:
--   1) outbox_notion  — cola durable para PROPAGAR a Notion async (el worker api/cron-outbox.js la drena).
--   2) merge_props()  — merge ATÓMICO del PATCH parcial sobre raw (raw || patch), sin lost-update, y recomputa
--                       pais (+ operario_app en servicios), que son los únicos campos con consumidor (RLS + filtros).
--   3) claim_outbox() — claim atómico de la cola (FOR UPDATE SKIP LOCKED) para el worker.
--
-- SEGURO de correr en cualquier momento: no toca datos existentes; nada la USA hasta que se setee el env
-- SUPAFIRST_TABLES (hoy vacío → todo el código nuevo es inerte). Idempotente (IF NOT EXISTS / OR REPLACE).
-- ============================================================================

-- 1) OUTBOX ------------------------------------------------------------------
create table if not exists outbox_notion (
  id              bigserial primary key,
  notion_id       text not null,
  resource        text not null,                    -- clientes|servicios|propuestas|ingresos|gastos
  op              text not null default 'patch',    -- 3a: siempre 'patch' (creates = 3b)
  payload         jsonb not null,                   -- properties PARCIALES a mandar a Notion
  status          text not null default 'pending',  -- pending|processing|done|error
  attempts        int  not null default 0,
  last_error      text,
  next_attempt_at timestamptz not null default now(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists idx_outbox_pending on outbox_notion (status, next_attempt_at);
create index if not exists idx_outbox_notion   on outbox_notion (notion_id) where status = 'pending';

-- updated_at automático (reusa la convención de schema.sql)
drop trigger if exists trg_outbox_notion_updated on outbox_notion;
create trigger trg_outbox_notion_updated before update on outbox_notion
  for each row execute function set_updated_at();

-- RLS: solo service_role (sin policies = deny para anon/authenticated). El server usa SERVICE_KEY.
alter table outbox_notion enable row level security;

-- 2) MERGE ATÓMICO -----------------------------------------------------------
-- raw := raw || patch  (semántica exacta de un PATCH de Notion: cada property entrante REEMPLAZA entera).
-- Devuelve el raw mergeado (jsonb) o NULL si el notion_id NO existe en el espejo → el caller cae a Notion-first.
create or replace function merge_props(p_table text, p_notion_id text, p_patch jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_raw  jsonb;
  v_pais text;
  v_sel  text;
begin
  -- allow-list dura de tablas (anti dynamic-SQL injection: p_table nunca se interpola crudo).
  if p_table not in ('clientes','servicios','propuestas','ingresos','gastos') then
    raise exception 'merge_props: tabla no permitida %', p_table;
  end if;

  -- Merge atómico + traer el raw resultante.
  execute format(
    'update %I set raw = coalesce(raw, ''{}''::jsonb) || $1 where notion_id = $2 returning raw',
    p_table
  ) into v_raw using p_patch, p_notion_id;

  if v_raw is null then
    return null;  -- 0 filas: el registro aún no está espejado → fallback a Notion-first
  end if;

  -- Recomputar país (plano) del raw mergeado (solo cambia si el PATCH trajo 'País').
  v_sel := v_raw #>> '{País,select,name}';
  v_pais := case
    when v_sel ilike '%Uruguay%'   then 'Uruguay'
    when v_sel ilike '%Brasil%'    then 'Brasil'
    when v_sel ilike '%Panam%'     then 'Panamá'
    when v_sel ilike '%Guatemala%' then 'Guatemala'
    when v_sel ilike '%xico%'      then 'México'
    else null
  end;

  if p_table = 'servicios' then
    update servicios
       set pais = v_pais,
           operario_app = v_raw #>> '{Operario App,select,name}'
     where notion_id = p_notion_id;
  else
    execute format('update %I set pais = $1 where notion_id = $2', p_table)
      using v_pais, p_notion_id;
  end if;

  return v_raw;
end;
$$;

-- 3) CLAIM ATÓMICO DE LA COLA (para el worker; evita doble-procesamiento entre corridas) ------------------
-- ORDEN POR PÁGINA (fix review #6): si una página tiene CUALQUIER fila pendiente diferida (en backoff,
-- next_attempt_at futuro), NO se reclama NINGUNA fila de esa página — así un payload viejo jamás se aplica
-- a Notion después de uno más nuevo de la misma página (last-writer-wins preservado entre corridas).
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
           where d.notion_id = ob.notion_id and d.status = 'pending' and d.next_attempt_at > now()
        )
      order by ob.created_at
      limit p_limit
      for update skip locked
   )
  returning o.*;
end;
$$;

-- 4) PERMISOS (fix review #7): las dos funciones son SECURITY DEFINER (bypasean RLS) → solo el server
-- (service_role) puede ejecutarlas. Revocar el EXECUTE default de PUBLIC/anon/authenticated + search_path fijo.
revoke execute on function merge_props(text, text, jsonb) from public, anon, authenticated;
revoke execute on function claim_outbox(int) from public, anon, authenticated;
grant execute on function merge_props(text, text, jsonb) to service_role;
grant execute on function claim_outbox(int) to service_role;
