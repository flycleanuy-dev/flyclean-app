-- ============================================================================
-- FlyClean — Row-Level Security (RLS)  ·  Fase 1
-- ----------------------------------------------------------------------------
-- Esto es el corazón del salto "top": la BASE decide, fila por fila, quién ve qué.
-- Reemplaza el filtro client-side actual (recEnPaisNotion / finRecEnPais) y lo hace
-- inviolable: aunque alguien consulte el Postgres directo, solo ve lo de su país/rol.
--
-- Modelo de auth: el login con PIN actual (api/verify-pin.js) emitirá un JWT con
-- claims { pais, rol, nombre }. Postgres los lee de current_setting('request.jwt.claims').
-- El sync corre con la SERVICE KEY → bypassea RLS (necesita escribir todo). Las apps
-- usan el JWT del usuario → quedan limitadas por estas policies.
--
-- Reglas (espejo de la lógica actual):
--   · Dirección  → ve TODO (global).
--   · CEO Uruguay→ ve TODO (global). Otros CEO → solo su país.
--   · Coordinador / Finanzas / CEO no-UY → solo su país (UY incluye filas sin país).
--   · Operario   → solo SUS servicios (operario_app = su nombre), dentro de su país.
-- ============================================================================

-- ───────────────────────── Helpers (leen el JWT) ─────────────────────────

create or replace function app_claims() returns jsonb as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb);
$$ language sql stable;

create or replace function app_pais()   returns text as $$ select app_claims()->>'pais';   $$ language sql stable;
create or replace function app_rol()    returns text as $$ select app_claims()->>'rol';    $$ language sql stable;
create or replace function app_nombre() returns text as $$ select app_claims()->>'nombre'; $$ language sql stable;

-- ¿El usuario ve global? Dirección, o CEO de Uruguay.
create or replace function app_es_global() returns boolean as $$
  select (app_rol() ilike '%direcci%')
      or (app_rol() ilike '%CEO%' and app_pais() = 'Uruguay');
$$ language sql stable;

create or replace function app_es_operario() returns boolean as $$
  select app_rol() ilike '%operario%';
$$ language sql stable;

-- Predicado central de país (UY incluye filas sin país, igual que la app hoy).
create or replace function app_ve_pais(row_pais text) returns boolean as $$
  select app_es_global()
      or row_pais = app_pais()
      or (app_pais() = 'Uruguay' and row_pais is null);
$$ language sql stable;

-- ───────────────────────── Habilitar RLS + policies ─────────────────────────
-- Por país (CRM + operaciones + finanzas): cada uno ve su país.

do $$
declare t text;
begin
  foreach t in array array['clientes','propuestas','tareas','registro_tiempo',
                           'gastos','ingresos','documentos']
  loop
    execute format('alter table %I enable row level security;', t);
    execute format('drop policy if exists pais_select on %I;', t);
    execute format($f$create policy pais_select on %I for select using ( app_ve_pais(pais) );$f$, t);
  end loop;
end $$;

-- Servicios: país + el operario ve SOLO los suyos.
alter table servicios enable row level security;
drop policy if exists servicios_select on servicios;
create policy servicios_select on servicios for select using (
  app_ve_pais(pais)
  and ( not app_es_operario() or operario_app = app_nombre() )
);

-- Tablas de referencia/operativas compartidas: cualquier usuario autenticado puede leer
-- (equipo, activos, insumos, proveedores, sops, solicitudes). Se puede endurecer luego.
do $$
declare t text;
begin
  foreach t in array array['equipo','activos','insumos','proveedores','sops','solicitudes_compra']
  loop
    execute format('alter table %I enable row level security;', t);
    execute format('drop policy if exists ref_select on %I;', t);
    execute format($f$create policy ref_select on %I for select using ( true );$f$, t);
  end loop;
end $$;

-- NOTA Fase 2: agregar policies de INSERT/UPDATE/DELETE cuando la app empiece a ESCRIBIR
-- en Postgres (hoy escribe en Notion; el sync usa service_role y bypassea RLS).
-- NOTA multi-tenant (Fase 4): sumar columna tenant_id + predicado por tenant en app_ve_pais.

-- ───────────────────────── Exposición a la API + refresco del caché ─────────────────────────
-- Sin esto, PostgREST devuelve PGRST205 ("table not found in schema cache").
grant usage   on schema public            to authenticated, service_role;
grant select  on all tables in schema public    to authenticated;   -- la app solo lee (Fase 1); RLS filtra filas
grant all     on all tables in schema public    to service_role;    -- el sync escribe todo (bypassea RLS)
grant all     on all sequences in schema public to service_role;
notify pgrst, 'reload schema';
