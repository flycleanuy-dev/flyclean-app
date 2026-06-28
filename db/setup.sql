-- ============================================================================
-- FlyClean — Esquema Postgres (espejo de las bases de Notion)  ·  Fase 1
-- ----------------------------------------------------------------------------
-- Objetivo: tener la base "top" (Postgres/Supabase) levantada EN PARALELO con
-- la app actual. En Fase 1 Notion sigue siendo la fuente; este esquema se llena
-- con el sync (scripts/sync-notion-supabase.mjs) y se mantiene al día.
--
-- Convenciones (todas las tablas):
--   id          uuid  PK  (propio de Postgres)
--   notion_id   text  UNIQUE  -> ancla para el sync idempotente (upsert por notion_id)
--   pais        text  -> denormalizado en cada tabla que segmenta por país (para RLS)
--   raw         jsonb -> properties completas de Notion (sin pérdida; columnas mapeadas = atajos)
--   created_at / updated_at  timestamptz
--
-- Las relaciones se guardan como *_notion_id (text) — las FKs "duras" se formalizan
-- en Fase 2, cuando los datos ya están cargados (evita problemas de orden en el sync).
-- País válido: 'Uruguay' | 'Brasil' | 'Panamá' | 'Guatemala' | 'México' (o NULL = UY/HQ).
-- ============================================================================

create extension if not exists "pgcrypto";   -- gen_random_uuid()

-- ───────────────────────── CRM ─────────────────────────

create table if not exists clientes (
  id                 uuid primary key default gen_random_uuid(),
  notion_id          text unique not null,
  nombre_empresa     text,                      -- title "Nombre / Empresa"
  estado             text,
  tipo_cliente       text,
  pais               text,
  canal_captacion    text,
  telefono           text,
  email              text,
  ciudad             text,
  interlocutor       text,
  notas              text,
  servicio_interes   text[] default '{}',       -- multi_select
  intermediario_notion_id text,                 -- self-relation "Intermediario"
  raw                jsonb,
  created_at         timestamptz default now(),
  updated_at         timestamptz default now()
);

create table if not exists propuestas (
  id                 uuid primary key default gen_random_uuid(),
  notion_id          text unique not null,
  nombre             text,                       -- title "Nombre de propuesta"
  estado_pipeline    text,
  pais               text,
  tipo               text,                       -- ej. '🔄 Recurrente'
  importe_estimado   numeric,
  servicios_por_anio integer,
  comision_pct       numeric,
  aprobacion_interna text,
  fecha_envio        date,
  ultima_interaccion date,
  aviso_recontacto   boolean default false,
  cliente_notion_id  text,                       -- relation "Contacto"/"Cliente"
  raw                jsonb,
  created_at         timestamptz default now(),
  updated_at         timestamptz default now()
);

-- ───────────────────────── Operaciones ─────────────────────────

create table if not exists servicios (
  id                   uuid primary key default gen_random_uuid(),
  notion_id            text unique not null,
  nombre_servicio      text,                     -- title
  tipo_registro        text,                     -- Orden / Jornada / Relevamiento / Prueba
  estado               text,                     -- ej. '✅ Completado'
  pais                 text,
  operario_app         text,                     -- piloto asignado (clave para RLS de operario)
  operarios_participantes text[] default '{}',
  fecha_programada     date,
  hora_inicio          timestamptz,              -- programada (coord)
  hora_inicio_efectivo timestamptz,              -- real (operario)
  hora_fin_efectivo    timestamptz,
  lugar                text,
  mapa                 text,
  condicion_climatica  text[] default '{}',
  resultado            text,
  resultado_prueba     text,
  ubicacion_gps        text,
  observacion_cliente  text,
  excluir_kpis         boolean default false,
  tipo_interno         text,
  cliente_notion_id    text,                     -- relation "Contacto"
  propuesta_notion_id  text,                     -- relation "Propuesta"
  raw                  jsonb,
  created_at           timestamptz default now(),
  updated_at           timestamptz default now()
);

create table if not exists tareas (
  id                uuid primary key default gen_random_uuid(),
  notion_id         text unique not null,
  nombre            text,
  estado            text,
  pais              text,
  servicio_notion_id text,
  raw               jsonb,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

create table if not exists registro_tiempo (
  id                uuid primary key default gen_random_uuid(),
  notion_id         text unique not null,
  pais              text,
  servicio_notion_id text,
  tarea_notion_id   text,
  raw               jsonb,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

-- ───────────────────────── Equipo / Activos ─────────────────────────

create table if not exists equipo (
  id          uuid primary key default gen_random_uuid(),
  notion_id   text unique not null,
  nombre      text,
  rol         text,
  pais        text,
  raw         jsonb,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create table if not exists activos (
  id          uuid primary key default gen_random_uuid(),
  notion_id   text unique not null,
  nombre      text,
  estado      text,
  pais        text,
  equipo_notion_id text,
  raw         jsonb,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create table if not exists insumos (
  id          uuid primary key default gen_random_uuid(),
  notion_id   text unique not null,
  nombre      text,
  pais        text,
  raw         jsonb,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ───────────────────────── Finanzas ─────────────────────────

create table if not exists proveedores (
  id          uuid primary key default gen_random_uuid(),
  notion_id   text unique not null,
  nombre      text,
  pais        text,
  raw         jsonb,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create table if not exists gastos (
  id                 uuid primary key default gen_random_uuid(),
  notion_id          text unique not null,
  descripcion        text,
  categoria          text,
  monto_uy           numeric,                    -- pesos
  monto_usd          numeric,                    -- dólares (nunca se mezclan)
  fecha              date,
  pais               text,
  forma_pago         text,
  cargado_por        text,                       -- 'APP' | 'Finanzas' (cowork)
  facturado          boolean default false,
  excluir_kpis       boolean default false,
  tipo_interno       text,
  proveedor_notion_id text,
  servicio_notion_id  text,
  raw                jsonb,
  created_at         timestamptz default now(),
  updated_at         timestamptz default now()
);

create table if not exists ingresos (
  id                 uuid primary key default gen_random_uuid(),
  notion_id          text unique not null,
  titulo             text,
  monto_uy           numeric,
  monto_usd          numeric,
  fecha              date,
  pais               text,
  tipo_ingreso       text,
  facturado          boolean default false,
  cliente_notion_id  text,
  servicio_notion_id text,
  raw                jsonb,
  created_at         timestamptz default now(),
  updated_at         timestamptz default now()
);

create table if not exists solicitudes_compra (
  id          uuid primary key default gen_random_uuid(),
  notion_id   text unique not null,
  pais        text,
  raw         jsonb,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create table if not exists documentos (
  id          uuid primary key default gen_random_uuid(),
  notion_id   text unique not null,
  nombre      text,
  tipo        text,
  vencimiento date,
  dias_aviso  integer,
  pais        text,
  raw         jsonb,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create table if not exists sops (
  id          uuid primary key default gen_random_uuid(),
  notion_id   text unique not null,
  nombre      text,
  pais        text,
  raw         jsonb,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ───────────────────────── Índices (para RLS y consultas por país) ─────────────────────────

create index if not exists idx_clientes_pais   on clientes(pais);
create index if not exists idx_propuestas_pais on propuestas(pais);
create index if not exists idx_servicios_pais  on servicios(pais);
create index if not exists idx_servicios_oper  on servicios(operario_app);
create index if not exists idx_servicios_estado on servicios(estado);
create index if not exists idx_gastos_pais     on gastos(pais);
create index if not exists idx_ingresos_pais   on ingresos(pais);
create index if not exists idx_tareas_pais     on tareas(pais);
create index if not exists idx_equipo_pais     on equipo(pais);

-- Relaciones (join por notion_id mientras no haya FKs duras)
create index if not exists idx_servicios_cliente  on servicios(cliente_notion_id);
create index if not exists idx_servicios_propuesta on servicios(propuesta_notion_id);
create index if not exists idx_ingresos_cliente   on ingresos(cliente_notion_id);
create index if not exists idx_ingresos_servicio  on ingresos(servicio_notion_id);
create index if not exists idx_gastos_servicio    on gastos(servicio_notion_id);

-- updated_at automático (trigger genérico)
create or replace function set_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

do $$
declare t text;
begin
  foreach t in array array['clientes','propuestas','servicios','tareas','registro_tiempo',
    'equipo','activos','insumos','proveedores','gastos','ingresos','solicitudes_compra',
    'documentos','sops']
  loop
    execute format('drop trigger if exists trg_%1$s_updated on %1$s;', t);
    execute format('create trigger trg_%1$s_updated before update on %1$s
                    for each row execute function set_updated_at();', t);
  end loop;
end $$;
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
