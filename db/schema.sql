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
  mapa               text,                       -- url "Mapa" (link de Google Maps, heredable a servicios)
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
  tipo_servicio        text,                     -- 'Tipo de servicio': Fachada / Vidrios / Paneles solares / Combinado
  estado               text,                     -- ej. '✅ Completado'
  pais                 text,
  operario_app         text,                     -- piloto asignado (clave para RLS de operario)
  operarios_participantes text[] default '{}',
  operario_manual      text,                     -- 'Operario manual': piloto cargado a mano (sin cuenta en la app)
  fecha_programada     date,
  fecha_planificada    date,                     -- fecha ORIGINAL antes de un inicio fuera de fecha (coord)
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
  notas_pre_servicio   text,                     -- 'Notas pre-servicio': notas comerciales heredadas de la propuesta
  metodo_trabajo       text,                     -- 'Método de trabajo': dron / manual
  herramienta_manual   text,                     -- 'Herramienta manual': solo si método = manual
  jornada_n            integer,                  -- 'Jornada N°': número de jornada dentro de un trabajo multi-día
  avance_pct           numeric,                  -- '% de avance': 0-100, sectores o carga manual del operario
  excluir_kpis         boolean default false,
  tipo_interno         text,
  cliente_notion_id    text,                     -- relation "Contacto"
  propuesta_notion_id  text,                     -- relation "Propuesta"
  orden_madre_notion_id text,                    -- relation "Orden madre": raíz del trabajo multi-jornada
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
