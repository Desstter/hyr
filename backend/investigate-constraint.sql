-- =====================================================
-- INVESTIGAR RESTRICCIÓN QUE BLOQUEA TURNOS NOCTURNOS
-- =====================================================

-- 1. Consultar todas las restricciones CHECK en time_entries
SELECT
    constraint_name,
    check_clause,
    constraint_schema,
    table_name
FROM information_schema.check_constraints
WHERE table_name = 'time_entries'
ORDER BY constraint_name;

-- 2. Información detallada de la restricción problemática
SELECT
    tc.constraint_name,
    tc.table_name,
    cc.check_clause,
    tc.constraint_type,
    tc.is_deferrable,
    tc.initially_deferred
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc ON tc.constraint_name = cc.constraint_name
WHERE tc.table_name = 'time_entries'
AND tc.constraint_name = 'chk_time_entries_arrival_before_departure';

-- 3. Ver estructura completa de la tabla
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'time_entries'
ORDER BY ordinal_position;

-- 4. Verificar registros existentes que podrían tener turnos nocturnos
SELECT
    id,
    arrival_time,
    departure_time,
    work_date,
    CASE
        WHEN departure_time <= arrival_time THEN 'TURNO_NOCTURNO'
        ELSE 'TURNO_NORMAL'
    END as tipo_turno
FROM time_entries
WHERE departure_time <= arrival_time
LIMIT 5;

SELECT 'Investigación completada - revisar resultados arriba' as status;