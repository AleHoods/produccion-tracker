-- ============================================================
-- CONTROL DE PRODUCCIÓN — Schema Supabase
-- Ejecutar en: Supabase > SQL Editor > New Query
-- ============================================================

-- 1. Sesiones de producción
CREATE TABLE IF NOT EXISTS sesiones (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at      TIMESTAMPTZ DEFAULT now(),
  cerrada_at      TIMESTAMPTZ,
  modelo          TEXT NOT NULL,
  operario        TEXT,
  secuencia_inicio INTEGER NOT NULL,
  secuencia_meta   INTEGER NOT NULL,
  cantidad_lote    INTEGER NOT NULL,
  activa          BOOLEAN DEFAULT true
);

-- 2. Registros horarios
CREATE TABLE IF NOT EXISTS registros (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at      TIMESTAMPTZ DEFAULT now(),
  sesion_id       UUID REFERENCES sesiones(id) ON DELETE CASCADE,
  secuencia_actual INTEGER NOT NULL,
  operario        TEXT
);

-- 3. Alertas ya enviadas (para no repetir)
CREATE TABLE IF NOT EXISTS alertas_enviadas (
  id        UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  sesion_id UUID REFERENCES sesiones(id) ON DELETE CASCADE,
  tipo      TEXT NOT NULL,
  UNIQUE(sesion_id, tipo)
);

-- ── ÍNDICES ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_sesiones_activa   ON sesiones(activa);
CREATE INDEX IF NOT EXISTS idx_registros_sesion  ON registros(sesion_id);
CREATE INDEX IF NOT EXISTS idx_alertas_sesion    ON alertas_enviadas(sesion_id);

-- ── ROW LEVEL SECURITY (RLS) ──────────────────────────────────
-- Habilitamos RLS pero con política permisiva (acceso público)
-- Para producción: reemplazar con autenticación real

ALTER TABLE sesiones         ENABLE ROW LEVEL SECURITY;
ALTER TABLE registros        ENABLE ROW LEVEL SECURITY;
ALTER TABLE alertas_enviadas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "acceso_publico_sesiones"
  ON sesiones FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "acceso_publico_registros"
  ON registros FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "acceso_publico_alertas"
  ON alertas_enviadas FOR ALL USING (true) WITH CHECK (true);
