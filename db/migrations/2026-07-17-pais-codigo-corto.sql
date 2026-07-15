-- 2026-07-15 — Pre-flip INGRESOS: 'pais' con CÓDIGO CORTO + backfill.
-- Problema: Gastos e Ingresos guardan 'País' como código corto ('🇺🇾 UY'), pero merge_props (y el mapeo
-- del sync, ya arreglado en api/_lib/notion-map.js) solo reconocían el nombre completo ('🇺🇾 Uruguay')
-- → la columna plana `pais` quedaba NULL en todas esas filas, y el filtro por país de /api/db dejaría
-- a Uruguay viendo todo y al resto viendo nada. Misma familia que el fix paisCoincide (users.js, 12/07).
-- Este script: (1) re-crea merge_props aceptando ambos formatos; (2) backfill de pais en gastos/ingresos.
-- CÓMO CORRERLO: Supabase → SQL Editor → pegar TODO este archivo → Run. Idempotente (re-correrlo no daña).

-- 1) merge_props: mismo cuerpo que 2026-07-16-outbox-y-merge.sql, con el CASE de país ampliado.
-- (Archivo fechado 07-17 para que un replay lexicográfico de db/migrations lo corra DESPUÉS del 07-16.)
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
  if p_table not in ('clientes','servicios','propuestas','ingresos','gastos') then
    raise exception 'merge_props: tabla no permitida %', p_table;
  end if;

  execute format(
    'update %I set raw = coalesce(raw, ''{}''::jsonb) || $1 where notion_id = $2 returning raw',
    p_table
  ) into v_raw using p_patch, p_notion_id;

  if v_raw is null then
    return null;
  end if;

  -- País plano: nombre completo ('🇺🇾 Uruguay') O código corto ('🇺🇾 UY') — \m/\M = límite de palabra
  -- ('URUGUAY' NO matchea '\mUY\M'; los nombres se evalúan primero igualmente).
  v_sel := v_raw #>> '{País,select,name}';
  v_pais := case
    when v_sel ilike '%Uruguay%'   then 'Uruguay'
    when v_sel ilike '%Brasil%'    then 'Brasil'
    when v_sel ilike '%Panam%'     then 'Panamá'
    when v_sel ilike '%Guatemala%' then 'Guatemala'
    when v_sel ilike '%xico%'      then 'México'
    when v_sel ~ '\mUY\M'          then 'Uruguay'
    when v_sel ~ '\mBR\M'          then 'Brasil'
    when v_sel ~ '\mPA\M'          then 'Panamá'
    when v_sel ~ '\mGT\M'          then 'Guatemala'
    when v_sel ~ '\mMX\M'          then 'México'
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

revoke execute on function merge_props(text, text, jsonb) from public, anon, authenticated;
grant execute on function merge_props(text, text, jsonb) to service_role;

-- 2) Backfill one-shot de `pais` en gastos e ingresos (desde el raw ya espejado).
update ingresos set pais = case
    when raw #>> '{País,select,name}' ilike '%Uruguay%'   then 'Uruguay'
    when raw #>> '{País,select,name}' ilike '%Brasil%'    then 'Brasil'
    when raw #>> '{País,select,name}' ilike '%Panam%'     then 'Panamá'
    when raw #>> '{País,select,name}' ilike '%Guatemala%' then 'Guatemala'
    when raw #>> '{País,select,name}' ilike '%xico%'      then 'México'
    when raw #>> '{País,select,name}' ~ '\mUY\M'          then 'Uruguay'
    when raw #>> '{País,select,name}' ~ '\mBR\M'          then 'Brasil'
    when raw #>> '{País,select,name}' ~ '\mPA\M'          then 'Panamá'
    when raw #>> '{País,select,name}' ~ '\mGT\M'          then 'Guatemala'
    when raw #>> '{País,select,name}' ~ '\mMX\M'          then 'México'
    else null end
  where pais is null;

update gastos set pais = case
    when raw #>> '{País,select,name}' ilike '%Uruguay%'   then 'Uruguay'
    when raw #>> '{País,select,name}' ilike '%Brasil%'    then 'Brasil'
    when raw #>> '{País,select,name}' ilike '%Panam%'     then 'Panamá'
    when raw #>> '{País,select,name}' ilike '%Guatemala%' then 'Guatemala'
    when raw #>> '{País,select,name}' ilike '%xico%'      then 'México'
    when raw #>> '{País,select,name}' ~ '\mUY\M'          then 'Uruguay'
    when raw #>> '{País,select,name}' ~ '\mBR\M'          then 'Brasil'
    when raw #>> '{País,select,name}' ~ '\mPA\M'          then 'Panamá'
    when raw #>> '{País,select,name}' ~ '\mGT\M'          then 'Guatemala'
    when raw #>> '{País,select,name}' ~ '\mMX\M'          then 'México'
    else null end
  where pais is null;

-- Verificación rápida (debería dar 0 en ambas):
-- select count(*) from ingresos where pais is null;
-- select count(*) from gastos   where pais is null;
