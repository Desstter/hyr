-- =====================================================
-- MIGRACIÓN: CAMPOS PARA DETECCIÓN DE TURNO NOCTURNO
-- Fecha: 2025-09-27
-- Descripción: Agregar campos para detectar y calcular premios nocturnos
-- =====================================================

-- Agregar campos específicos para turno nocturno a time_entries
ALTER TABLE time_entries
ADD COLUMN IF NOT EXISTS night_hours DECIMAL(4,2) DEFAULT 0 CHECK (night_hours >= 0 AND night_hours <= 12),
ADD COLUMN IF NOT EXISTS night_premium_rate DECIMAL(5,4) DEFAULT 0.35 CHECK (night_premium_rate >= 0),
ADD COLUMN IF NOT EXISTS night_pay DECIMAL(15,2) DEFAULT 0 CHECK (night_pay >= 0);

-- Comentarios para documentar los nuevos campos
COMMENT ON COLUMN time_entries.night_hours IS 'Horas trabajadas durante turno nocturno (22:00-06:00)';
COMMENT ON COLUMN time_entries.night_premium_rate IS 'Porcentaje de recargo nocturno aplicado (default: 35%)';
COMMENT ON COLUMN time_entries.night_pay IS 'Pago adicional por turno nocturno calculado automáticamente';

-- Actualizar configuraciones de nómina para incluir configuración nocturna
INSERT INTO settings (key, value, category, description) VALUES
(
    'night_shift_settings',
    '{
        "start_time": "22:00",
        "end_time": "06:00",
        "premium_rate": 0.35,
        "min_night_hours": 0.5,
        "description": "Configuración para detección y cálculo de turno nocturno"
    }',
    'payroll',
    'Configuraciones específicas para turno nocturno (10 PM a 6 AM)'
)
ON CONFLICT (key) DO UPDATE SET
    value = EXCLUDED.value,
    updated_at = CURRENT_TIMESTAMP;

-- Actualizar configuraciones existentes de nómina para incluir turno nocturno
UPDATE settings
SET value = value || '{
    "night_shift_start": "22:00",
    "night_shift_end": "06:00",
    "night_shift_multiplier": 1.35,
    "night_shift_min_hours": 0.5
}'::jsonb
WHERE key = 'payroll_settings';

-- =====================================================
-- FUNCIÓN PARA DETECTAR HORAS NOCTURNAS
-- =====================================================

CREATE OR REPLACE FUNCTION calculate_night_hours(
    arrival_time TIME,
    departure_time TIME,
    night_start TIME DEFAULT '22:00'::TIME,
    night_end TIME DEFAULT '06:00'::TIME
) RETURNS DECIMAL(4,2) AS $$
DECLARE
    night_hours DECIMAL(4,2) := 0;
    work_start TIME := arrival_time;
    work_end TIME := departure_time;
    temp_end TIME;
BEGIN
    -- Validar parámetros
    IF arrival_time IS NULL OR departure_time IS NULL THEN
        RETURN 0;
    END IF;

    -- Caso 1: Trabajo que cruza medianoche (ej: 23:00 a 07:00 del día siguiente)
    -- Asumimos que si departure_time < arrival_time, cruza medianoche
    IF departure_time < arrival_time THEN
        -- Calcular horas nocturnas desde arrival hasta medianoche
        IF arrival_time >= night_start THEN
            night_hours := night_hours + EXTRACT(EPOCH FROM (TIME '24:00' - arrival_time)) / 3600;
        END IF;

        -- Calcular horas nocturnas desde medianoche hasta departure
        IF departure_time <= night_end THEN
            night_hours := night_hours + EXTRACT(EPOCH FROM departure_time) / 3600;
        END IF;
    ELSE
        -- Caso 2: Trabajo normal en el mismo día
        -- Turno nocturno puede ser desde night_start del día hasta night_end del día siguiente

        -- Si empieza después de las 22:00 del mismo día
        IF arrival_time >= night_start THEN
            temp_end := LEAST(departure_time, TIME '24:00');
            night_hours := night_hours + EXTRACT(EPOCH FROM (temp_end - arrival_time)) / 3600;
        END IF;

        -- Si trabaja en la madrugada (antes de las 06:00)
        IF departure_time <= night_end AND arrival_time < night_end THEN
            night_hours := night_hours + EXTRACT(EPOCH FROM (departure_time - GREATEST(arrival_time, TIME '00:00'))) / 3600;
        END IF;
    END IF;

    -- Redondear a 2 decimales y asegurar que no sea negativo
    RETURN GREATEST(0, ROUND(night_hours, 2));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =====================================================
-- ACTUALIZAR FUNCIÓN DE CÁLCULO DE HORAS EFECTIVAS
-- =====================================================

CREATE OR REPLACE FUNCTION update_effective_hours()
RETURNS TRIGGER AS $$
DECLARE
    payroll_config JSONB;
    night_config JSONB;
    daily_hours DECIMAL(4,2);
    tolerance_minutes INTEGER;
    night_premium_rate DECIMAL(5,4);
    calc_result RECORD;
    calculated_night_hours DECIMAL(4,2);
    hourly_rate_calc DECIMAL(10,2);
    personnel_data RECORD;
BEGIN
    -- Obtener configuraciones de nómina
    SELECT value INTO payroll_config
    FROM settings
    WHERE key = 'payroll_settings';

    SELECT value INTO night_config
    FROM settings
    WHERE key = 'night_shift_settings';

    daily_hours := COALESCE((payroll_config->>'daily_legal_hours')::DECIMAL, 7.3);
    tolerance_minutes := COALESCE((payroll_config->>'late_tolerance_minutes')::INTEGER, 5);
    night_premium_rate := COALESCE((night_config->>'premium_rate')::DECIMAL, 0.35);

    -- Si se proporcionan tiempos de llegada y salida, calcular automáticamente
    IF NEW.arrival_time IS NOT NULL AND NEW.departure_time IS NOT NULL THEN
        -- Obtener datos del empleado
        SELECT expected_arrival_time, daily_rate, salary_base INTO personnel_data
        FROM personnel WHERE id = NEW.personnel_id;

        -- Usar hora esperada del empleado o valor por defecto
        IF NEW.expected_arrival_time IS NULL THEN
            NEW.expected_arrival_time := COALESCE(personnel_data.expected_arrival_time, TIME '07:00');
        END IF;

        -- Calcular horas efectivas usando la función existente
        SELECT * INTO calc_result
        FROM calculate_effective_hours(
            NEW.arrival_time,
            NEW.departure_time,
            NEW.expected_arrival_time
        );

        -- Calcular horas nocturnas
        calculated_night_hours := calculate_night_hours(
            NEW.arrival_time,
            NEW.departure_time,
            COALESCE((night_config->>'start_time')::TIME, TIME '22:00'),
            COALESCE((night_config->>'end_time')::TIME, TIME '06:00')
        );

        -- Aplicar tolerancia a la tardanza
        NEW.late_minutes := GREATEST(0, calc_result.late_minutes - tolerance_minutes);
        NEW.early_departure_minutes := calc_result.early_departure_minutes;
        NEW.effective_hours_worked := calc_result.effective_hours;
        NEW.night_hours := calculated_night_hours;
        NEW.night_premium_rate := night_premium_rate;

        -- Actualizar hours_worked con las horas efectivas
        NEW.hours_worked := calc_result.effective_hours;

        -- Calcular tiempo extra si excede horas legales
        IF calc_result.effective_hours > daily_hours THEN
            NEW.overtime_hours := calc_result.effective_hours - daily_hours;
            NEW.hours_worked := daily_hours;
        ELSE
            NEW.overtime_hours := 0;
        END IF;

        -- Calcular tasa horaria basada en daily_rate
        hourly_rate_calc := COALESCE(personnel_data.daily_rate, 0) / daily_hours;
        NEW.hourly_rate := hourly_rate_calc;

        -- Calcular pago nocturno adicional
        NEW.night_pay := calculated_night_hours * hourly_rate_calc * night_premium_rate;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recrear el trigger con la función actualizada
DROP TRIGGER IF EXISTS trigger_update_effective_hours ON time_entries;
CREATE TRIGGER trigger_update_effective_hours
    BEFORE INSERT OR UPDATE ON time_entries
    FOR EACH ROW
    EXECUTE FUNCTION update_effective_hours();

-- =====================================================
-- ACTUALIZAR VISTA DETALLADA
-- =====================================================

CREATE OR REPLACE VIEW v_time_entries_detailed AS
SELECT
    te.*,
    p.name as employee_name,
    p.salary_base,
    p.daily_rate,
    proj.name as project_name,

    -- Cálculos derivados existentes
    CASE
        WHEN te.late_minutes > 0
        THEN (p.daily_rate / 7.3) * (te.late_minutes::DECIMAL / 60)
        ELSE 0
    END as late_discount,

    -- Pago real basado en horas y daily_rate
    (p.daily_rate / 7.3) * te.hours_worked as regular_pay_real,
    (p.daily_rate / 7.3) * te.overtime_hours * 1.25 as overtime_pay_real,

    -- NUEVO: Pago nocturno
    te.night_pay,

    -- Total de pago incluyendo recargo nocturno
    ((p.daily_rate / 7.3) * te.hours_worked) +
    ((p.daily_rate / 7.3) * te.overtime_hours * 1.25) +
    te.night_pay as total_pay_with_night,

    -- Prestaciones basadas en salary_base
    (p.salary_base / 24) * (te.hours_worked / 7.3) as prestaciones_base

FROM time_entries te
JOIN personnel p ON te.personnel_id = p.id
JOIN projects proj ON te.project_id = proj.id;

-- =====================================================
-- ÍNDICES PARA OPTIMIZACIÓN
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_time_entries_night_hours ON time_entries(night_hours);
CREATE INDEX IF NOT EXISTS idx_time_entries_arrival_departure ON time_entries(arrival_time, departure_time);

-- =====================================================
-- VERIFICACIÓN
-- =====================================================

-- Verificar que los campos se crearon correctamente
SELECT
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'time_entries'
    AND column_name IN ('night_hours', 'night_premium_rate', 'night_pay')
ORDER BY ordinal_position;

-- Verificar configuraciones de turno nocturno
SELECT
    key,
    category,
    value->>'start_time' as night_start,
    value->>'end_time' as night_end,
    value->>'premium_rate' as premium_rate
FROM settings
WHERE key IN ('night_shift_settings', 'payroll_settings');

SELECT 'MIGRACIÓN COMPLETADA - CAMPOS DE TURNO NOCTURNO AGREGADOS' as status,
       current_timestamp as migrated_at;