-- ============================================================================
-- FlyClean — Fase 3b: enqueue_create() — alta local ATÓMICA (id_map + outbox)
-- ----------------------------------------------------------------------------
-- Cuando el proxy no puede crear una página en Notion (caído/timeout) y la tabla tiene create-fallback,
-- registra la alta local en DOS tablas: id_map (para traducir el uuid local → notion_id real después) y
-- outbox_notion (op:'create', para que el worker la propague). DEBEN insertarse ATÓMICAMENTE: si solo
-- entrara una, quedaría un estado roto (id_map sin outbox = nunca propaga; outbox sin id_map = un patch
-- contra el uuid no resuelve → 404). Esta función las mete en la MISMA transacción.
--
-- La fila del ESPEJO (la tabla clientes/servicios/… con notion_id=uuid) la escribe el proxy por separado
-- (best-effort): si fallara, el sync la reconcilia; no es crítica para la integridad id_map↔outbox.
--
-- SEGURO/idempotente. Correr DESPUÉS de 2026-07-22-creates-fallback.sql. Inerte hasta que el proxy la use.
-- ============================================================================

create or replace function enqueue_create(p_local_id text, p_resource text, p_payload jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into id_map (local_id, resource, notion_id)
    values (p_local_id, p_resource, null)
    on conflict (local_id) do nothing;
  insert into outbox_notion (notion_id, resource, op, payload)
    values (p_local_id, p_resource, 'create', p_payload);
end;
$$;

revoke execute on function enqueue_create(text, text, jsonb) from public, anon, authenticated;
grant execute on function enqueue_create(text, text, jsonb) to service_role;
