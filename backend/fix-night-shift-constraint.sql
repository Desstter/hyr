-- =====================================================
-- CORRECCIÓN: ELIMINAR RESTRICCIÓN QUE BLOQUEA TURNOS NOCTURNOS
-- HYR Constructora & Soldadura
-- Fecha: 2025-09-28
-- =====================================================

-- PROBLEMA IDENTIFICADO:
-- La restricción 'chk_time_entries_arrival_before_departure' impide guardar
-- registros donde arrival_time >= departure_time, bloqueando turnos nocturnos
-- válidos como 20:00 → 05:00 del día siguiente.

-- MOSTRAR STATUS INICIAL
SELECT 'INICIANDO CORRECCIÓN DE RESTRICCIÓN DE TURNOS NOCTURNOS' as status;

-- 1. VERIFICAR RESTRICCIÓN ACTUAL
SELECT
    constraint_name,
    table_name,
    constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'time_entries'
AND constraint_name = 'chk_time_entries_arrival_before_departure';

-- 2. ELIMINAR RESTRICCIÓN OBSOLETA
DO $$
BEGIN
    -- Verificar si la restricción existe antes de eliminarla
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'time_entries'
        AND constraint_name = 'chk_time_entries_arrival_before_departure'
        AND constraint_type = 'CHECK'
    ) THEN
        -- Eliminar restricción que bloquea turnos nocturnos
        ALTER TABLE time_entries
        DROP CONSTRAINT chk_time_entries_arrival_before_departure;

        RAISE NOTICE '✅ Restricción chk_time_entries_arrival_before_departure ELIMINADA exitosamente';
        RAISE NOTICE '✅ Los turnos nocturnos (ej: 20:00→05:00) ahora están PERMITIDOS';
    ELSE
        RAISE NOTICE '⚠️  La restricción chk_time_entries_arrival_before_departure no existe';
    END IF;
END $$;

-- 3. AGREGAR NUEVA RESTRICCIÓN MÁS INTELIGENTE (OPCIONAL)
-- Solo validamos que los tiempos no sean nulos, permitiendo turnos nocturnos
DO $$
BEGIN
    -- Verificar que no exista ya una restricción similar
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'time_entries'
        AND constraint_name = 'chk_time_entries_valid_times'
    ) THEN
        ALTER TABLE time_entries
        ADD CONSTRAINT chk_time_entries_valid_times
        CHECK (
            -- Validar que los tiempos sean válidos cuando están presentes
            (arrival_time IS NULL OR arrival_time::TEXT ~ '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$')
            AND
            (departure_time IS NULL OR departure_time::TEXT ~ '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$')
            AND
            -- No permitir que sean exactamente iguales (sin trabajo)
            (arrival_time IS NULL OR departure_time IS NULL OR arrival_time != departure_time)
        );

        RAISE NOTICE '✅ Nueva restricción chk_time_entries_valid_times AGREGADA';
        RAISE NOTICE '✅ Permite turnos nocturnos pero mantiene validaciones básicas';
    ELSE
        RAISE NOTICE '⚠️  La restricción chk_time_entries_valid_times ya existe';
    END IF;
END $$;

-- 4. VERIFICAR CORRECCIÓN
SELECT
    constraint_name,
    table_name,
    constraint_type,
    is_deferrable
FROM information_schema.table_constraints
WHERE table_name = 'time_entries'
AND constraint_type = 'CHECK'
ORDER BY constraint_name;

-- 5. COMENTARIOS EN LA TABLA PARA DOCUMENTAR EL CAMBIO
COMMENT ON TABLE time_entries IS 'Tabla de registros de tiempo de trabajo. Modificada 2025-09-28 para permitir turnos nocturnos que cruzan medianoche';

-- 6. STATUS FINAL
SELECT
    'CORRECCIÓN COMPLETADA - TURNOS NOCTURNOS AHORA PERMITIDOS' as status,
    'Ejemplo: 20:00 → 05:00 del día siguiente es válido' as ejemplo,
    current_timestamp as corregido_en;

-- =====================================================
-- NOTAS IMPORTANTES:
-- =====================================================
-- 1. Esta corrección permite turnos que cruzan medianoche
-- 2. El frontend ya maneja la lógica de cálculo correctamente
-- 3. El backend calcula automáticamente horas nocturnas
-- 4. Los reportes y nómina integran las horas nocturnas
-- 5. La configuración de horarios es dinámica desde Settings
-- =====================================================