-- =====================================================
-- MIGRACIÓN: CAMPOS FALTANTES EN TIME_ENTRIES
-- Fecha: 2025-09-10  
-- Descripción: Agregar campos requeridos por la API de time-entries
-- =====================================================

-- Agregar campos faltantes a time_entries
ALTER TABLE time_entries 
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'payroll_locked', 'rejected')),
ADD COLUMN IF NOT EXISTS payroll_period_id UUID REFERENCES payroll_periods(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS approver_notes TEXT,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Crear índices para mejorar performance
CREATE INDEX IF NOT EXISTS idx_time_entries_status ON time_entries(status);
CREATE INDEX IF NOT EXISTS idx_time_entries_payroll_period ON time_entries(payroll_period_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_work_date ON time_entries(work_date);
CREATE INDEX IF NOT EXISTS idx_time_entries_personnel_date ON time_entries(personnel_id, work_date);
CREATE INDEX IF NOT EXISTS idx_time_entries_project_date ON time_entries(project_id, work_date);

-- Crear función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_time_entries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Crear trigger para actualizar updated_at
DROP TRIGGER IF EXISTS trigger_update_time_entries_updated_at ON time_entries;
CREATE TRIGGER trigger_update_time_entries_updated_at
    BEFORE UPDATE ON time_entries
    FOR EACH ROW
    EXECUTE FUNCTION update_time_entries_updated_at();

-- Actualizar registros existentes (si los hay) con valores por defecto
UPDATE time_entries 
SET 
    status = 'draft',
    updated_at = CURRENT_TIMESTAMP
WHERE status IS NULL;

-- Agregar comentarios para documentación
COMMENT ON COLUMN time_entries.status IS 'Estado del registro: draft, submitted, approved, payroll_locked, rejected';
COMMENT ON COLUMN time_entries.payroll_period_id IS 'Referencia al período de nómina cuando el registro está bloqueado';
COMMENT ON COLUMN time_entries.approver_notes IS 'Notas del aprobador durante el workflow de aprobación';
COMMENT ON COLUMN time_entries.updated_at IS 'Timestamp de última actualización, se actualiza automáticamente';

-- Verificar que la migración se aplicó correctamente
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'time_entries' 
    AND column_name IN ('status', 'payroll_period_id', 'approver_notes', 'updated_at')
ORDER BY ordinal_position;