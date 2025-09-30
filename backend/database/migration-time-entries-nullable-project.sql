-- =====================================================
-- MIGRACIÓN: HACER PROJECT_ID OPCIONAL Y AGREGAR LUNCH_DEDUCTED
-- HYR CONSTRUCTORA & SOLDADURA
-- Fecha: 2025-09-28
-- =====================================================

-- Propósito:
-- 1. Permitir registrar horas sin asignar proyecto específico
-- 2. Agregar control de deducción de almuerzo
-- 3. Mejorar flexibilidad del sistema de tiempo

BEGIN;

-- =====================================================
-- PASO 1: HACER PROJECT_ID NULLABLE
-- =====================================================

-- Primero, necesitamos eliminar la constraint NOT NULL existente
ALTER TABLE time_entries
  ALTER COLUMN project_id DROP NOT NULL;

-- Actualizar la constraint UNIQUE para manejar project_id NULL
-- Eliminar constraint única existente
ALTER TABLE time_entries
  DROP CONSTRAINT IF EXISTS time_entries_personnel_id_project_id_work_date_key;

-- Crear nueva constraint única que maneja project_id NULL
-- Cuando project_id es NULL, solo debe haber una entrada por empleado/fecha
CREATE UNIQUE INDEX idx_time_entries_unique_with_null_project
  ON time_entries (personnel_id, work_date)
  WHERE project_id IS NULL;

-- Cuando project_id no es NULL, mantener la constraint original
CREATE UNIQUE INDEX idx_time_entries_unique_with_project
  ON time_entries (personnel_id, project_id, work_date)
  WHERE project_id IS NOT NULL;

-- =====================================================
-- PASO 2: AGREGAR COLUMNA LUNCH_DEDUCTED
-- =====================================================

-- Agregar columna para controlar deducción de almuerzo
ALTER TABLE time_entries
  ADD COLUMN lunch_deducted BOOLEAN DEFAULT true;

-- Establecer valor por defecto para registros existentes
UPDATE time_entries
  SET lunch_deducted = true
  WHERE lunch_deducted IS NULL;

-- Hacer la columna NOT NULL después de establecer valores
ALTER TABLE time_entries
  ALTER COLUMN lunch_deducted SET NOT NULL;

-- =====================================================
-- PASO 3: AGREGAR CAMPOS DE TIEMPO ESPERADO EN PERSONNEL
-- =====================================================

-- Verificar si los campos ya existen antes de agregarlos
ALTER TABLE personnel
  ADD COLUMN IF NOT EXISTS expected_arrival_time TIME;

ALTER TABLE personnel
  ADD COLUMN IF NOT EXISTS expected_departure_time TIME;

-- Agregar valores por defecto para empleados existentes (jornada típica 7AM-4PM)
UPDATE personnel
  SET
    expected_arrival_time = '07:00'::TIME,
    expected_departure_time = '16:00'::TIME
  WHERE expected_arrival_time IS NULL
    AND expected_departure_time IS NULL
    AND status = 'active';

-- =====================================================
-- PASO 4: ACTUALIZAR CAMPOS EXISTENTES EN TIME_ENTRIES
-- =====================================================

-- Agregar campos de tiempo si no existen
ALTER TABLE time_entries
  ADD COLUMN IF NOT EXISTS arrival_time TIME;

ALTER TABLE time_entries
  ADD COLUMN IF NOT EXISTS departure_time TIME;

-- =====================================================
-- PASO 5: CREAR FUNCIÓN PARA RECALCULAR HORAS
-- =====================================================

CREATE OR REPLACE FUNCTION calculate_time_entry_hours(
  p_arrival_time TIME,
  p_departure_time TIME,
  p_lunch_deducted BOOLEAN DEFAULT true
)
RETURNS TABLE(
  hours_worked DECIMAL(4,2),
  overtime_hours DECIMAL(4,2),
  total_hours DECIMAL(4,2)
) AS $$
DECLARE
  total_work_time DECIMAL(4,2);
  legal_daily_hours DECIMAL(4,2) := 7.3;
  lunch_hours DECIMAL(4,2) := 1.0;
BEGIN
  -- Calcular tiempo total trabajado
  IF p_arrival_time IS NULL OR p_departure_time IS NULL THEN
    -- Si no hay tiempos, retornar 0
    hours_worked := 0;
    overtime_hours := 0;
    total_hours := 0;
    RETURN NEXT;
    RETURN;
  END IF;

  -- Calcular diferencia en horas
  total_work_time := EXTRACT(EPOCH FROM (p_departure_time - p_arrival_time)) / 3600;

  -- Restar almuerzo si está habilitado
  IF p_lunch_deducted THEN
    total_work_time := GREATEST(0, total_work_time - lunch_hours);
  END IF;

  -- Calcular horas regulares y extras
  hours_worked := LEAST(total_work_time, legal_daily_hours);
  overtime_hours := GREATEST(0, total_work_time - legal_daily_hours);
  total_hours := total_work_time;

  RETURN NEXT;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =====================================================
-- PASO 6: COMENTARIOS Y DOCUMENTACIÓN
-- =====================================================

-- Agregar comentarios a las columnas nuevas
COMMENT ON COLUMN time_entries.project_id IS 'Proyecto asignado (opcional). NULL permite registro de horas sin proyecto específico';
COMMENT ON COLUMN time_entries.lunch_deducted IS 'Indica si se debe descontar 1 hora de almuerzo del tiempo trabajado';
COMMENT ON COLUMN personnel.expected_arrival_time IS 'Hora esperada de llegada del empleado';
COMMENT ON COLUMN personnel.expected_departure_time IS 'Hora esperada de salida del empleado';

-- =====================================================
-- PASO 7: VERIFICAR INTEGRIDAD
-- =====================================================

-- Verificar que los cambios se aplicaron correctamente
DO $$
BEGIN
  -- Verificar que project_id es nullable
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'time_entries'
      AND column_name = 'project_id'
      AND is_nullable = 'YES'
  ) THEN
    RAISE EXCEPTION 'Error: project_id no es nullable';
  END IF;

  -- Verificar que lunch_deducted existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'time_entries'
      AND column_name = 'lunch_deducted'
  ) THEN
    RAISE EXCEPTION 'Error: lunch_deducted no existe';
  END IF;

  -- Verificar que los campos de tiempo esperado existen
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'personnel'
      AND column_name = 'expected_arrival_time'
  ) THEN
    RAISE EXCEPTION 'Error: expected_arrival_time no existe';
  END IF;

  RAISE NOTICE 'Migración completada exitosamente';
END $$;

COMMIT;

-- =====================================================
-- INSTRUCCIONES DE ROLLBACK (SI ES NECESARIO)
-- =====================================================

/*
-- Para revertir estos cambios (SOLO EN CASO DE EMERGENCIA):

BEGIN;

-- Eliminar función
DROP FUNCTION IF EXISTS calculate_time_entry_hours(TIME, TIME, BOOLEAN);

-- Eliminar índices únicos nuevos
DROP INDEX IF EXISTS idx_time_entries_unique_with_null_project;
DROP INDEX IF EXISTS idx_time_entries_unique_with_project;

-- Restaurar constraint única original (ESTO FALLARÁ SI HAY REGISTROS CON project_id NULL)
ALTER TABLE time_entries ADD CONSTRAINT time_entries_personnel_id_project_id_work_date_key
  UNIQUE (personnel_id, project_id, work_date);

-- Hacer project_id NOT NULL (ESTO FALLARÁ SI HAY REGISTROS CON project_id NULL)
ALTER TABLE time_entries ALTER COLUMN project_id SET NOT NULL;

-- Eliminar columnas agregadas
ALTER TABLE time_entries DROP COLUMN IF EXISTS lunch_deducted;
ALTER TABLE personnel DROP COLUMN IF EXISTS expected_arrival_time;
ALTER TABLE personnel DROP COLUMN IF EXISTS expected_departure_time;

COMMIT;
*/