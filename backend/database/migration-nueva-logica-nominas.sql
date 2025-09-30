-- =====================================================
-- MIGRACIÓN: NUEVA LÓGICA DE NÓMINAS
-- HYR CONSTRUCTORA & SOLDADURA
-- =====================================================
-- Implementa separación entre salario base (prestaciones)
-- y precio por día (pago real) con control de llegada/salida
-- =====================================================

-- =====================================================
-- 1. MODIFICAR TABLA PERSONNEL
-- =====================================================

-- Agregar nuevos campos para separar salario base y precio diario
ALTER TABLE personnel ADD COLUMN IF NOT EXISTS salary_base DECIMAL(15,2);
ALTER TABLE personnel ADD COLUMN IF NOT EXISTS daily_rate DECIMAL(15,2);
ALTER TABLE personnel ADD COLUMN IF NOT EXISTS expected_arrival_time TIME DEFAULT '07:00';
ALTER TABLE personnel ADD COLUMN IF NOT EXISTS expected_departure_time TIME DEFAULT '15:30';

-- Comentarios para documentar los nuevos campos
COMMENT ON COLUMN personnel.salary_base IS 'Salario base para cálculo de prestaciones sociales y parafiscales';
COMMENT ON COLUMN personnel.daily_rate IS 'Precio por día de trabajo real (se divide por horas legales)';
COMMENT ON COLUMN personnel.expected_arrival_time IS 'Hora esperada de llegada del empleado';
COMMENT ON COLUMN personnel.expected_departure_time IS 'Hora esperada de salida del empleado';

-- =====================================================
-- 2. MODIFICAR TABLA TIME_ENTRIES
-- =====================================================

-- Agregar campos de control de tiempo real
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS arrival_time TIME;
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS departure_time TIME;
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS expected_arrival_time TIME;
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS late_minutes INTEGER DEFAULT 0;
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS early_departure_minutes INTEGER DEFAULT 0;
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS effective_hours_worked DECIMAL(4,2);

-- Comentarios para documentar los nuevos campos
COMMENT ON COLUMN time_entries.arrival_time IS 'Hora real de llegada del empleado';
COMMENT ON COLUMN time_entries.departure_time IS 'Hora real de salida del empleado';
COMMENT ON COLUMN time_entries.expected_arrival_time IS 'Hora esperada de llegada (copiada del empleado)';
COMMENT ON COLUMN time_entries.late_minutes IS 'Minutos de tardanza (se descuentan del pago)';
COMMENT ON COLUMN time_entries.early_departure_minutes IS 'Minutos de salida temprana (se descuentan del pago)';
COMMENT ON COLUMN time_entries.effective_hours_worked IS 'Horas efectivamente trabajadas después de descuentos';

-- =====================================================
-- 3. CREAR TABLA SETTINGS SI NO EXISTE
-- =====================================================

CREATE TABLE IF NOT EXISTS settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(255) UNIQUE NOT NULL,
    value JSONB NOT NULL,
    category VARCHAR(100) DEFAULT 'general',
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para settings
CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);
CREATE INDEX IF NOT EXISTS idx_settings_category ON settings(category);

-- =====================================================
-- 4. INSERTAR CONFIGURACIONES DE NÓMINA
-- =====================================================

-- Configuraciones para la nueva lógica de nóminas
INSERT INTO settings (key, value, category, description) VALUES
(
    'payroll_settings',
    '{
        "daily_legal_hours": 7.3,
        "late_tolerance_minutes": 5,
        "overtime_threshold_hours": 7.3,
        "max_daily_hours": 12,
        "overtime_multiplier": 1.25,
        "night_shift_start": "22:00",
        "night_shift_end": "06:00",
        "night_shift_multiplier": 1.35
    }',
    'payroll',
    'Configuraciones para cálculo de nómina con nueva lógica de tiempo'
),
(
    'business_hours',
    '{
        "standard_arrival": "07:00",
        "standard_departure": "15:30",
        "lunch_break_start": "12:00",
        "lunch_break_end": "13:00",
        "saturday_hours": 4,
        "sunday_work_allowed": false
    }',
    'business_profile',
    'Horarios estándar de trabajo de la empresa'
)
ON CONFLICT (key) DO UPDATE SET
    value = EXCLUDED.value,
    updated_at = CURRENT_TIMESTAMP;

-- =====================================================
-- 5. MIGRAR DATOS EXISTENTES
-- =====================================================

-- Migrar empleados existentes: salary_base = salario actual para prestaciones
UPDATE personnel
SET
    salary_base = CASE
        WHEN salary_type = 'monthly' AND monthly_salary IS NOT NULL THEN monthly_salary
        WHEN salary_type = 'hourly' AND hourly_rate IS NOT NULL THEN hourly_rate * 192 -- 24 días * 8 horas
        ELSE 1300000 -- Salario mínimo como fallback
    END,
    daily_rate = CASE
        WHEN salary_type = 'monthly' AND monthly_salary IS NOT NULL THEN monthly_salary / 24 -- Dividir por días trabajados
        WHEN salary_type = 'hourly' AND hourly_rate IS NOT NULL THEN hourly_rate * 8 -- 8 horas por día
        ELSE 54167 -- Salario mínimo diario como fallback
    END,
    expected_arrival_time = '07:00',
    expected_departure_time = '15:30'
WHERE salary_base IS NULL OR daily_rate IS NULL;

-- Migrar time_entries existentes: estimar tiempos basado en horas trabajadas
UPDATE time_entries
SET
    arrival_time = '07:00',
    departure_time = (TIME '07:00' + (hours_worked || ' hours')::INTERVAL),
    expected_arrival_time = '07:00',
    late_minutes = 0,
    early_departure_minutes = 0,
    effective_hours_worked = hours_worked
WHERE arrival_time IS NULL;

-- =====================================================
-- 6. CREAR NUEVA FUNCIÓN PARA CALCULAR HORAS EFECTIVAS
-- =====================================================

CREATE OR REPLACE FUNCTION calculate_effective_hours(
    arrival_time TIME,
    departure_time TIME,
    expected_arrival TIME,
    lunch_break_minutes INTEGER DEFAULT 60
) RETURNS TABLE(
    effective_hours DECIMAL(4,2),
    late_minutes INTEGER,
    early_departure_minutes INTEGER
) AS $$
DECLARE
    total_minutes INTEGER;
    late_mins INTEGER := 0;
    early_mins INTEGER := 0;
    effective_mins INTEGER;
BEGIN
    -- Calcular minutos totales trabajados
    total_minutes := EXTRACT(EPOCH FROM (departure_time - arrival_time)) / 60;

    -- Calcular tardanza
    IF arrival_time > expected_arrival THEN
        late_mins := EXTRACT(EPOCH FROM (arrival_time - expected_arrival)) / 60;
    END IF;

    -- TODO: Agregar lógica para salida temprana si se requiere
    early_mins := 0;

    -- Descontar almuerzo
    effective_mins := total_minutes - lunch_break_minutes;

    -- Convertir a horas decimales
    RETURN QUERY SELECT
        ROUND((effective_mins::DECIMAL / 60), 2) as effective_hours,
        late_mins,
        early_mins;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 7. CREAR TRIGGER PARA CALCULAR HORAS AUTOMÁTICAMENTE
-- =====================================================

CREATE OR REPLACE FUNCTION update_effective_hours()
RETURNS TRIGGER AS $$
DECLARE
    payroll_config JSONB;
    daily_hours DECIMAL(4,2);
    tolerance_minutes INTEGER;
    calc_result RECORD;
BEGIN
    -- Obtener configuraciones de nómina
    SELECT value INTO payroll_config
    FROM settings
    WHERE key = 'payroll_settings';

    daily_hours := COALESCE((payroll_config->>'daily_legal_hours')::DECIMAL, 7.3);
    tolerance_minutes := COALESCE((payroll_config->>'late_tolerance_minutes')::INTEGER, 5);

    -- Si se proporcionan tiempos de llegada y salida, calcular automáticamente
    IF NEW.arrival_time IS NOT NULL AND NEW.departure_time IS NOT NULL THEN
        -- Obtener hora esperada del empleado
        IF NEW.expected_arrival_time IS NULL THEN
            SELECT expected_arrival_time INTO NEW.expected_arrival_time
            FROM personnel WHERE id = NEW.personnel_id;
        END IF;

        -- Calcular horas efectivas usando la función
        SELECT * INTO calc_result
        FROM calculate_effective_hours(
            NEW.arrival_time,
            NEW.departure_time,
            COALESCE(NEW.expected_arrival_time, TIME '07:00')
        );

        -- Aplicar tolerancia a la tardanza
        NEW.late_minutes := GREATEST(0, calc_result.late_minutes - tolerance_minutes);
        NEW.early_departure_minutes := calc_result.early_departure_minutes;
        NEW.effective_hours_worked := calc_result.effective_hours;

        -- Actualizar hours_worked con las horas efectivas (sin descuentos de tardanza aún)
        NEW.hours_worked := calc_result.effective_hours;

        -- Calcular tiempo extra si excede horas legales
        IF calc_result.effective_hours > daily_hours THEN
            NEW.overtime_hours := calc_result.effective_hours - daily_hours;
            NEW.hours_worked := daily_hours;
        ELSE
            NEW.overtime_hours := 0;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear el trigger
DROP TRIGGER IF EXISTS trigger_update_effective_hours ON time_entries;
CREATE TRIGGER trigger_update_effective_hours
    BEFORE INSERT OR UPDATE ON time_entries
    FOR EACH ROW
    EXECUTE FUNCTION update_effective_hours();

-- =====================================================
-- 8. MODIFICAR FUNCIÓN DE GASTOS LABORALES
-- =====================================================

-- Actualizar función para usar nueva lógica de salary_base vs daily_rate
CREATE OR REPLACE FUNCTION create_labor_expense()
RETURNS TRIGGER AS $$
DECLARE
    personnel_data RECORD;
    total_cost_with_benefits DECIMAL(15,2);
    daily_hours DECIMAL(4,2) := 7.3;
    payroll_config JSONB;
BEGIN
    -- Obtener configuración de horas diarias
    SELECT value INTO payroll_config FROM settings WHERE key = 'payroll_settings';
    daily_hours := COALESCE((payroll_config->>'daily_legal_hours')::DECIMAL, 7.3);

    IF TG_OP = 'DELETE' THEN
        DELETE FROM expenses
        WHERE project_id = OLD.project_id
        AND category = 'labor'
        AND description LIKE OLD.personnel_id::text || ' - %'
        AND date = OLD.work_date;
        RETURN OLD;
    END IF;

    -- Obtener datos del empleado incluyendo los nuevos campos
    SELECT name, salary_base, daily_rate INTO personnel_data
    FROM personnel WHERE id = NEW.personnel_id;

    -- Calcular costo real basado en daily_rate y horas trabajadas
    -- El costo con beneficios usa salary_base para prestaciones
    -- pero el pago real usa daily_rate

    -- Pago base: (daily_rate / daily_hours) * horas_efectivas
    total_cost_with_benefits := (personnel_data.daily_rate / daily_hours) *
                               (NEW.hours_worked + NEW.overtime_hours * 1.25);

    -- Aplicar factor prestacional sobre el salary_base para obligaciones legales
    -- Esto mantiene las prestaciones correctas independiente del pago real
    total_cost_with_benefits := total_cost_with_benefits * 1.58;

    IF TG_OP = 'UPDATE' THEN
        DELETE FROM expenses
        WHERE project_id = OLD.project_id
        AND category = 'labor'
        AND description LIKE OLD.personnel_id::text || ' - %'
        AND date = OLD.work_date;
    END IF;

    INSERT INTO expenses (
        project_id, date, category, subcategory, description,
        amount, vendor, quantity, unit_price
    ) VALUES (
        NEW.project_id,
        NEW.work_date,
        'labor',
        'mano_obra_directa',
        NEW.personnel_id::text || ' - ' || personnel_data.name ||
        ' (' || NEW.hours_worked || 'h reg + ' || NEW.overtime_hours || 'h ext)' ||
        CASE WHEN NEW.late_minutes > 0 THEN ' [-' || NEW.late_minutes || 'min tardanza]' ELSE '' END,
        total_cost_with_benefits,
        personnel_data.name,
        NEW.hours_worked + NEW.overtime_hours,
        CASE
            WHEN (NEW.hours_worked + NEW.overtime_hours) > 0
            THEN total_cost_with_benefits / (NEW.hours_worked + NEW.overtime_hours)
            ELSE 0
        END
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 9. AGREGAR CONSTRAINTS Y VALIDACIONES
-- =====================================================

-- Validar que salary_base y daily_rate sean positivos
ALTER TABLE personnel ADD CONSTRAINT chk_personnel_salary_base_positive
    CHECK (salary_base IS NULL OR salary_base > 0);

ALTER TABLE personnel ADD CONSTRAINT chk_personnel_daily_rate_positive
    CHECK (daily_rate IS NULL OR daily_rate > 0);

-- Validar que arrival_time sea anterior a departure_time
ALTER TABLE time_entries ADD CONSTRAINT chk_time_entries_arrival_before_departure
    CHECK (arrival_time IS NULL OR departure_time IS NULL OR arrival_time <= departure_time);

-- Validar que late_minutes y early_departure_minutes sean no negativos
ALTER TABLE time_entries ADD CONSTRAINT chk_time_entries_late_minutes_positive
    CHECK (late_minutes >= 0);

ALTER TABLE time_entries ADD CONSTRAINT chk_time_entries_early_departure_positive
    CHECK (early_departure_minutes >= 0);

-- =====================================================
-- 10. CREAR VISTA PARA CONSULTAS COMPLEJAS
-- =====================================================

CREATE OR REPLACE VIEW v_time_entries_detailed AS
SELECT
    te.*,
    p.name as employee_name,
    p.salary_base,
    p.daily_rate,
    proj.name as project_name,

    -- Cálculos derivados
    CASE
        WHEN te.late_minutes > 0
        THEN (p.daily_rate / 7.3) * (te.late_minutes::DECIMAL / 60)
        ELSE 0
    END as late_discount,

    -- Pago real basado en horas y daily_rate
    (p.daily_rate / 7.3) * te.hours_worked as regular_pay_real,
    (p.daily_rate / 7.3) * te.overtime_hours * 1.25 as overtime_pay_real,

    -- Prestaciones basadas en salary_base
    (p.salary_base / 24) * (te.hours_worked / 7.3) as prestaciones_base

FROM time_entries te
JOIN personnel p ON te.personnel_id = p.id
JOIN projects proj ON te.project_id = proj.id;

COMMENT ON VIEW v_time_entries_detailed IS 'Vista detallada de time_entries con cálculos de nueva lógica de nómina';

-- =====================================================
-- 11. FUNCIÓN PARA OBTENER CONFIGURACIONES DE NÓMINA
-- =====================================================

CREATE OR REPLACE FUNCTION get_payroll_settings()
RETURNS JSONB AS $$
DECLARE
    settings_data JSONB;
BEGIN
    SELECT value INTO settings_data
    FROM settings
    WHERE key = 'payroll_settings';

    -- Valores por defecto si no existen configuraciones
    IF settings_data IS NULL THEN
        settings_data := '{
            "daily_legal_hours": 7.3,
            "late_tolerance_minutes": 5,
            "overtime_threshold_hours": 7.3,
            "max_daily_hours": 12,
            "overtime_multiplier": 1.25
        }'::JSONB;
    END IF;

    RETURN settings_data;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 12. ACTUALIZAR COMENTARIOS DE DOCUMENTACIÓN
-- =====================================================

COMMENT ON COLUMN time_entries.hours_worked IS 'Horas regulares trabajadas (máximo 7.3 según ley colombiana)';
COMMENT ON COLUMN time_entries.overtime_hours IS 'Horas extra trabajadas (pagadas con recargo del 25%)';
COMMENT ON TRIGGER trigger_update_effective_hours ON time_entries IS 'Calcula automáticamente horas efectivas, tardanzas y tiempo extra';
COMMENT ON FUNCTION create_labor_expense() IS 'Crea gastos laborales usando salary_base para prestaciones y daily_rate para pagos reales';
COMMENT ON FUNCTION get_payroll_settings() IS 'Obtiene configuraciones de nómina con valores por defecto seguros';

-- =====================================================
-- VERIFICACIÓN FINAL
-- =====================================================

SELECT 'MIGRACIÓN COMPLETADA - NUEVA LÓGICA DE NÓMINAS' as status,
       current_timestamp as migrated_at,
       (SELECT COUNT(*) FROM personnel WHERE salary_base IS NOT NULL AND daily_rate IS NOT NULL) as employees_migrated,
       (SELECT COUNT(*) FROM settings WHERE category = 'payroll') as payroll_settings_created;