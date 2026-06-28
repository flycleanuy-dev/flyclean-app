-- ============================================================================
-- FlyClean — Exponer las tablas a la API + refrescar el caché de PostgREST
-- Correr en el SQL Editor de Supabase DESPUÉS de setup.sql (arregla el error PGRST205).
-- ============================================================================
grant usage   on schema public            to authenticated, service_role;
grant select  on all tables in schema public    to authenticated;   -- la app solo lee (Fase 1); RLS filtra las filas
grant all     on all tables in schema public    to service_role;    -- el sync escribe todo (bypassea RLS)
grant all     on all sequences in schema public to service_role;
notify pgrst, 'reload schema';   -- refresca el caché de la API → las tablas aparecen
