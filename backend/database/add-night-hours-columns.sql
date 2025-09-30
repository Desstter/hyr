-- =====================================================
-- MIGRACIÓN: AGREGAR COLUMNAS NIGHT_HOURS Y NIGHT_PAY
-- HYR CONSTRUCTORA & SOLDADURA
-- Solución para error: "no existe la columna «night_hours»"
-- =====================================================

-- Verificar conexión y mostrar estado actual
SELECT 'Iniciando migración: agregar columnas night_hours y night_pay' as status;

-- Verificar estructura actual de time_entries
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'time_entries'
    AND table_schema = 'public'
    AND column_name IN ('night_hours', 'night_pay', 'hours_worked', 'overtime_hours')
ORDER BY ordinal_position;

-- =====================================================
-- AGREGAR COLUMNAS FALTANTES
-- =====================================================

-- Agregar columna night_hours si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'time_entries'
        AND column_name = 'night_hours'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE time_entries
        ADD COLUMN night_hours DECIMAL(4,2) DEFAULT 0
        CHECK (night_hours >= 0);

        RAISE NOTICE 'Columna night_hours agregada exitosamente';
    ELSE
        RAISE NOTICE 'Columna night_hours ya existe, omitiendo...';
    END IF;
END $$;

-- Agregar columna night_pay si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'time_entries'
        AND column_name = 'night_pay'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE time_entries
        ADD COLUMN night_pay DECIMAL(15,2) DEFAULT 0
        CHECK (night_pay >= 0);

        RAISE NOTICE 'Columna night_pay agregada exitosamente';
    ELSE
        RAISE NOTICE 'Columna night_pay ya existe, omitiendo...';
    END IF;
END $$;

-- =====================================================
-- ACTUALIZAR REGISTROS EXISTENTES
-- =====================================================

-- Asegurar que registros existentes tengan valores por defecto
UPDATE time_entries
SET
    night_hours = COALESCE(night_hours, 0),
    night_pay = COALESCE(night_pay, 0)
WHERE night_hours IS NULL OR night_pay IS NULL;

-- =====================================================
-- VERIFICAR MIGRACIÓN EXITOSA
-- =====================================================

-- Mostrar estructura actualizada
SELECT 'Verificando estructura actualizada...' as status;

SELECT
    column_name,
    data_type,
    is_nullable,
    column_default,
    CASE
        WHEN column_name IN ('night_hours', 'night_pay') THEN '✓ NUEVO'
        ELSE 'existente'
    END as estado
FROM information_schema.columns
WHERE table_name = 'time_entries'
    AND table_schema = 'public'
    AND column_name IN ('night_hours', 'night_pay', 'hours_worked', 'overtime_hours')
ORDER BY
    CASE column_name
        WHEN 'hours_worked' THEN 1
        WHEN 'overtime_hours' THEN 2
        WHEN 'night_hours' THEN 3
        WHEN 'night_pay' THEN 4
    END;

-- Verificar conteo de registros con nuevas columnas
SELECT
    COUNT(*) as total_registros,
    COUNT(CASE WHEN night_hours IS NOT NULL THEN 1 END) as con_night_hours,
    COUNT(CASE WHEN night_pay IS NOT NULL THEN 1 END) as con_night_pay
FROM time_entries;

-- =====================================================
-- COMENTARIOS Y DOCUMENTACIÓN
-- =====================================================

COMMENT ON COLUMN time_entries.night_hours IS 'Horas trabajadas en horario nocturno (19:00-06:00) para recargo del 35%';
COMMENT ON COLUMN time_entries.night_pay IS 'Pago calculado por horas nocturnas con recargo del 35%';

-- =====================================================
-- VALIDACIÓN FINAL
-- =====================================================

DO $$
DECLARE
    night_hours_exists BOOLEAN;
    night_pay_exists BOOLEAN;
BEGIN
    -- Verificar que ambas columnas existan
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'time_entries'
        AND column_name = 'night_hours'
        AND table_schema = 'public'
    ) INTO night_hours_exists;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'time_entries'
        AND column_name = 'night_pay'
        AND table_schema = 'public'
    ) INTO night_pay_exists;

    IF night_hours_exists AND night_pay_exists THEN
        RAISE NOTICE '✓ MIGRACIÓN EXITOSA: Columnas night_hours y night_pay agregadas correctamente';
        RAISE NOTICE '✓ El error "no existe la columna night_hours" ha sido solucionado';
    ELSE
        RAISE EXCEPTION '❌ MIGRACIÓN FALLIDA: Una o más columnas no fueron creadas correctamente';
    END IF;
END $$;

SELECT 'Migración completada exitosamente' as resultado_final;