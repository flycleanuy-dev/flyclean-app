-- ============================================================================
-- FlyClean — Fase 3.0: tabla `usuarios` para el LOGIN sin deploy
-- ----------------------------------------------------------------------------
-- Objetivo: mover la identidad del equipo (id de login, nombre, rol, país, activo)
-- del array HARDCODEADO (index.html `USERS` + api/_lib/users.js `USERS`) a la base,
-- para dar de ALTA/BAJA gente y cambiar rol/país SIN un deploy.
--
-- ⚠️ SEGURIDAD / ANTI-LOCKOUT (se implementa en el lado app, Fase 3.0 app-side):
--   - La app leerá esta tabla SERVER-SIDE con service_role — la resolución de identidad ocurre
--     ANTES de autenticar, así que NUNCA debe leerse con la clave pública (anon).
--   - Irá detrás de un flag con FALLBACK DURO al array hardcodeado: si la tabla no responde,
--     el login sigue con el array de siempre → nadie queda afuera.
--   - Los PINs NO viven acá (siguen hasheados en KV/scrypt). Esta tabla es SOLO identidad.
--
-- ⚠️ Esta migración por sí sola NO cambia nada en la app: crea la tabla y la puebla. La app la
--    empieza a usar recién cuando se prende el flag (paso app-side, con revisión).
--
-- Convención: a diferencia del resto de tablas (uuid PK + notion_id UNIQUE), acá la PK es el `id`
-- de LOGIN (el slug, ej. 'diego-laxalt'), porque es la clave natural que usa userById(id) / el login.
-- ============================================================================

create table if not exists usuarios (
  id          text primary key,                 -- id de login (slug), ej. 'diego-laxalt'
  nombre      text not null,
  rol         text not null,                     -- '🎯 Dirección' | '🔧 Coordinador' | '🛠️ Operario' | '👔 CEO' | '📊 Administración' | '🧲 Ventas'
  pais        text not null,                     -- 'Uruguay' | 'Brasil' | 'Panamá' | 'Guatemala' | 'México'
  emoji       text,                              -- avatar del rol (cosmético; se completa app-side si se quiere)
  notion_id   text,                              -- (opcional) ancla a la DB Equipo de Notion, a futuro
  activo      boolean not null default true,     -- baja LÓGICA (no borrar): activo=false = no puede entrar
  raw         jsonb,                             -- campos extra a futuro sin nueva migración
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- RLS: tabla SERVICE-ROLE-ONLY. Sin policies = deny por defecto para anon/authenticated;
-- el servidor (service_role) la lee para resolver identidad. Nadie lista roles con la clave pública.
alter table usuarios enable row level security;

-- Seed inicial = los 23 usuarios actuales (idénticos al array hardcodeado). Idempotente (upsert por id):
-- correr esta migración de nuevo re-sincroniza sin duplicar.
insert into usuarios (id, nombre, rol, pais) values
  ('diego-laxalt',         'Diego Laxalt',            '🎯 Dirección',      'Uruguay'),
  ('federico-maciel',      'Federico Maciel',         '🔧 Coordinador',    'Uruguay'),
  ('juan-pablo',           'Juan Pablo',              '🛠️ Operario',       'Uruguay'),
  ('francisco-rocha',      'Francisco Rocha',         '🛠️ Operario',       'Uruguay'),
  ('coord-brasil',         'Coordinador Brasil',      '🔧 Coordinador',    'Brasil'),
  ('operario-brasil-1',    'Operario Brasil',         '🛠️ Operario',       'Brasil'),
  ('coord-panama',         'Coordinador Panamá',      '🔧 Coordinador',    'Panamá'),
  ('operario-panama-1',    'Operario Panamá',         '🛠️ Operario',       'Panamá'),
  ('coord-guatemala',      'Coordinador Guatemala',   '🔧 Coordinador',    'Guatemala'),
  ('operario-guatemala-1', 'Operario Guatemala',      '🛠️ Operario',       'Guatemala'),
  ('coord-mexico',         'Coordinador México',      '🔧 Coordinador',    'México'),
  ('operario-mexico-1',    'Operario México',         '🛠️ Operario',       'México'),
  ('eduardo-cabral',       'Eduardo Cabral',          '👔 CEO',            'Uruguay'),
  ('ceo-brasil',           'CEO Brasil',              '👔 CEO',            'Brasil'),
  ('ceo-panama',           'CEO Panamá',              '👔 CEO',            'Panamá'),
  ('ceo-guatemala',        'CEO Guatemala',           '👔 CEO',            'Guatemala'),
  ('ceo-mexico',           'CEO México',              '👔 CEO',            'México'),
  ('finanzas-uy',          'Finanzas',                '📊 Administración', 'Uruguay'),
  ('finanzas-brasil',      'Finanzas Brasil',         '📊 Administración', 'Brasil'),
  ('finanzas-panama',      'Finanzas Panamá',         '📊 Administración', 'Panamá'),
  ('finanzas-guatemala',   'Finanzas Guatemala',      '📊 Administración', 'Guatemala'),
  ('finanzas-mexico',      'Finanzas México',         '📊 Administración', 'México'),
  ('ventas-uy',            'Ventas UY',               '🧲 Ventas',         'Uruguay')
on conflict (id) do update set
  nombre = excluded.nombre,
  rol    = excluded.rol,
  pais   = excluded.pais,
  updated_at = now();

-- ▶ CÓMO APLICAR: Supabase → SQL Editor → pegar este archivo → Run. Idempotente (se puede re-correr).
-- ▶ VERIFICAR: select count(*) from usuarios;  → debe dar 23.
-- ▶ SIGUIENTE (app-side, con revisión): endpoint que lea usuarios (service_role) + resolución de
--   identidad con fallback al array + flag fc_db_users OFF por defecto. Los PINs no se tocan.
