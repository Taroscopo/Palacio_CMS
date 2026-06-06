-- ============================================================
-- PALACIO CMS — Esquema de Base de Datos (Supabase / PostgreSQL)
-- ============================================================
-- Ejecutar este script en el SQL Editor de Supabase:
--   https://supabase.com/dashboard → SQL Editor → New Query
--
-- Tablas:
--   1. clientes  — Datos del cliente y su repositorio GitHub
--   2. cambios_log — Registro de cambios realizados en el editor
-- ============================================================

-- ============================================================
-- 1. Tabla: clientes
-- ============================================================
CREATE TABLE IF NOT EXISTS clientes (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  nombre_sitio  TEXT,
  plan          TEXT NOT NULL DEFAULT 'gratis' CHECK (plan IN ('gratis', 'anual')),
  repo_owner    TEXT NOT NULL,
  repo_name     TEXT NOT NULL,
  repo_branch   TEXT NOT NULL DEFAULT 'main',
  creado_en     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índice para búsquedas por email (login)
CREATE INDEX IF NOT EXISTS idx_clientes_email ON clientes (email);

-- Comentario documental
COMMENT ON TABLE clientes IS 'Clientes del CMS. Cada fila representa un cliente con su repositorio GitHub asociado.';
COMMENT ON COLUMN clientes.plan IS 'Plan de suscripción: gratis o anual.';
COMMENT ON COLUMN clientes.repo_owner IS 'Owner del repositorio GitHub (ej: Taroscopo).';
COMMENT ON COLUMN clientes.repo_name IS 'Nombre del repositorio GitHub (ej: WEB-PRUEBA-CMS).';
COMMENT ON COLUMN clientes.repo_branch IS 'Branch del repositorio a editar (default: main).';

-- ============================================================
-- 2. Tabla: cambios_log
-- ============================================================
CREATE TABLE IF NOT EXISTS cambios_log (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id  UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  seccion     TEXT NOT NULL,
  campo_id    TEXT NOT NULL,
  creado_en   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índice para contar cambios mensuales por cliente
CREATE INDEX IF NOT EXISTS idx_cambios_log_cliente_mes
  ON cambios_log (cliente_id, creado_en);

-- Comentario documental
COMMENT ON TABLE cambios_log IS 'Registro de cada cambio realizado por un cliente en el editor visual.';
COMMENT ON COLUMN cambios_log.seccion IS 'Nombre de la sección editada (data-section).';
COMMENT ON COLUMN cambios_log.campo_id IS 'Identificador del campo editado (data-editable).';

-- ============================================================
-- 3. Row Level Security (RLS)
-- ============================================================
-- Como usamos service_role key desde el backend, RLS no bloquea
-- nuestras consultas. Sin embargo, habilitamos RLS y creamos
-- políticas restrictivas por si se accede desde el frontend con
-- la anon key en el futuro.

ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE cambios_log ENABLE ROW LEVEL SECURITY;

-- Política: permitir todo con service_role (ya lo hace por defecto)
-- Política: solo lectura de su propia fila para anon/authenticated
CREATE POLICY "Clientes pueden ver su propio perfil"
  ON clientes FOR SELECT
  USING (auth.jwt() ->> 'email' = email);

CREATE POLICY "Clientes pueden ver sus propios cambios"
  ON cambios_log FOR SELECT
  USING (cliente_id IN (
    SELECT id FROM clientes WHERE email = auth.jwt() ->> 'email'
  ));

-- ============================================================
-- 4. Datos semilla (seed) para pruebas
-- ============================================================
-- Insertar solo si no existen (idempotente)

INSERT INTO clientes (id, email, nombre_sitio, plan, repo_owner, repo_name, repo_branch)
VALUES
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'cliente@demo.com', 'Taroscopo — Web Prueba CMS', 'gratis', 'Taroscopo', 'WEB-PRUEBA-CMS', 'main'),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'premium@demo.com', 'Taroscopo — Landing Premium', 'anual', 'Taroscopo', 'WEB-PRUEBA-CMS', 'main')
ON CONFLICT (email) DO NOTHING;

-- Insertar un cambio de ejemplo para el cliente demo
INSERT INTO cambios_log (cliente_id, seccion, campo_id)
VALUES
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'hero', 'titulo-principal')
ON CONFLICT DO NOTHING;
