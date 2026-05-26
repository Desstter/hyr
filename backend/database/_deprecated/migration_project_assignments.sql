-- =====================================================
-- HYR CONSTRUCTORA & SOLDADURA - MIGRACIÓN ASIGNACIONES
-- Sistema de Asignación de Personal a Proyectos
-- =====================================================

-- =====================================================
-- TABLA PROJECT_ASSIGNMENTS
-- Asignaciones formales de empleados a proyectos
-- =====================================================
CREATE TABLE IF NOT EXISTS project_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Relaciones principales
    personnel_id UUID NOT NULL REFERENCES personnel(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    
    -- Información de la asignación
    assigned_date DATE NOT NULL DEFAULT CURRENT_DATE,
    start_date DATE NOT NULL,
    end_date DATE, -- NULL = asignación indefinida
    role VARCHAR(100), -- rol específico en el proyecto (opcional)
    
    -- Configuración de trabajo
    expected_hours_per_day DECIMAL(4,2) DEFAULT 8.0, -- horas esperadas por día
    is_primary_project BOOLEAN DEFAULT false, -- proyecto principal del empleado
    priority INTEGER DEFAULT 1, -- prioridad de asignación (1=alta, 3=baja)
    
    -- Estado de la asignación
    status VARCHAR(50) DEFAULT 'active', -- active, paused, completed, cancelled
    notes TEXT, -- notas adicionales de la asignación
    
    -- Auditoría
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255), -- usuario que creó la asignación
    
    -- Restricciones
    UNIQUE(personnel_id, project_id, start_date),
    CHECK (end_date IS NULL OR end_date >= start_date),
    CHECK (expected_hours_per_day > 0 AND expected_hours_per_day <= 12),
    CHECK (priority >= 1 AND priority <= 5)
);

-- =====================================================
-- ÍNDICES PARA OPTIMIZACIÓN
-- =====================================================
CREATE INDEX idx_project_assignments_personnel ON project_assignments(personnel_id);
CREATE INDEX idx_project_assignments_project ON project_assignments(project_id);
CREATE INDEX idx_project_assignments_status ON project_assignments(status);
CREATE INDEX idx_project_assignments_dates ON project_assignments(start_date, end_date);
CREATE INDEX idx_project_assignments_active ON project_assignments(personnel_id, project_id) 
    WHERE status = 'active';

-- =====================================================
-- FUNCIONES AUXILIARES
-- =====================================================

-- Función para obtener empleados asignados a un proyecto
CREATE OR REPLACE FUNCTION get_project_personnel(project_uuid UUID)
RETURNS TABLE(
    personnel_id UUID,
    personnel_name VARCHAR(255),
    personnel_position VARCHAR(100),
    department VARCHAR(100),
    assignment_role VARCHAR(100),
    expected_hours_per_day DECIMAL(4,2),
    is_primary_project BOOLEAN,
    assignment_status VARCHAR(50),
    start_date DATE,
    end_date DATE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pa.personnel_id,
        p.name as personnel_name,
        p.position as personnel_position,
        p.department,
        pa.role as assignment_role,
        pa.expected_hours_per_day,
        pa.is_primary_project,
        pa.status as assignment_status,
        pa.start_date,
        pa.end_date
    FROM project_assignments pa
    JOIN personnel p ON pa.personnel_id = p.id
    WHERE pa.project_id = project_uuid
    AND pa.status = 'active'
    ORDER BY pa.is_primary_project DESC, pa.priority ASC, p.name;
END;
$$ LANGUAGE plpgsql;

-- Función para obtener proyectos asignados a un empleado
CREATE OR REPLACE FUNCTION get_personnel_assignments(personnel_uuid UUID)
RETURNS TABLE(
    project_id UUID,
    project_name VARCHAR(255),
    client_name VARCHAR(255),
    assignment_role VARCHAR(100),
    expected_hours_per_day DECIMAL(4,2),
    is_primary_project BOOLEAN,
    assignment_status VARCHAR(50),
    start_date DATE,
    end_date DATE,
    project_status VARCHAR(50)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pa.project_id,
        pr.name as project_name,
        c.name as client_name,
        pa.role as assignment_role,
        pa.expected_hours_per_day,
        pa.is_primary_project,
        pa.status as assignment_status,
        pa.start_date,
        pa.end_date,
        pr.status as project_status
    FROM project_assignments pa
    JOIN projects pr ON pa.project_id = pr.id
    LEFT JOIN clients c ON pr.client_id = c.id
    WHERE pa.personnel_id = personnel_uuid
    AND pa.status IN ('active', 'paused')
    ORDER BY pa.is_primary_project DESC, pa.priority ASC, pr.name;
END;
$$ LANGUAGE plpgsql;

-- Función para calcular disponibilidad de empleados
CREATE OR REPLACE FUNCTION get_personnel_availability()
RETURNS TABLE(
    personnel_id UUID,
    personnel_name VARCHAR(255),
    total_assigned_hours DECIMAL(4,2),
    projects_count INTEGER,
    availability_status VARCHAR(50),
    can_take_more_work BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id as personnel_id,
        p.name as personnel_name,
        COALESCE(SUM(pa.expected_hours_per_day), 0) as total_assigned_hours,
        COUNT(pa.id)::INTEGER as projects_count,
        CASE 
            WHEN COALESCE(SUM(pa.expected_hours_per_day), 0) = 0 THEN 'disponible'
            WHEN COALESCE(SUM(pa.expected_hours_per_day), 0) <= 6 THEN 'parcialmente_ocupado'
            WHEN COALESCE(SUM(pa.expected_hours_per_day), 0) <= 8 THEN 'ocupado'
            ELSE 'sobrecargado'
        END as availability_status,
        COALESCE(SUM(pa.expected_hours_per_day), 0) < 8 as can_take_more_work
    FROM personnel p
    LEFT JOIN project_assignments pa ON p.id = pa.personnel_id 
        AND pa.status = 'active'
        AND (pa.end_date IS NULL OR pa.end_date >= CURRENT_DATE)
    WHERE p.status = 'active'
    GROUP BY p.id, p.name
    ORDER BY total_assigned_hours ASC, p.name;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGERS AUTOMÁTICOS
-- =====================================================

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_project_assignment_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_project_assignments_updated_at
    BEFORE UPDATE ON project_assignments
    FOR EACH ROW
    EXECUTE FUNCTION update_project_assignment_timestamp();

-- Trigger para validar solapamientos de asignaciones
CREATE OR REPLACE FUNCTION validate_assignment_overlap()
RETURNS TRIGGER AS $$
DECLARE
    overlap_count INTEGER;
BEGIN
    -- Verificar solapamientos de fechas para el mismo empleado
    SELECT COUNT(*) INTO overlap_count
    FROM project_assignments
    WHERE personnel_id = NEW.personnel_id
    AND id != COALESCE(NEW.id, gen_random_uuid())
    AND status = 'active'
    AND (
        (NEW.start_date BETWEEN start_date AND COALESCE(end_date, '2099-12-31')) OR
        (COALESCE(NEW.end_date, '2099-12-31') BETWEEN start_date AND COALESCE(end_date, '2099-12-31')) OR
        (start_date BETWEEN NEW.start_date AND COALESCE(NEW.end_date, '2099-12-31'))
    );
    
    -- Permitir solapamientos pero advertir si excede capacidad
    IF overlap_count > 0 THEN
        -- Calcular horas totales asignadas
        DECLARE
            total_hours DECIMAL;
        BEGIN
            SELECT COALESCE(SUM(expected_hours_per_day), 0) + NEW.expected_hours_per_day
            INTO total_hours
            FROM project_assignments
            WHERE personnel_id = NEW.personnel_id
            AND id != COALESCE(NEW.id, gen_random_uuid())
            AND status = 'active';
            
            -- Permitir, pero marcar como advertencia en logs
            IF total_hours > 8 THEN
                RAISE NOTICE 'ADVERTENCIA: Empleado % asignado a % horas/día (sobrecarga)', NEW.personnel_id, total_hours;
            END IF;
        END;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validate_assignment_overlap
    BEFORE INSERT OR UPDATE ON project_assignments
    FOR EACH ROW
    EXECUTE FUNCTION validate_assignment_overlap();

-- Trigger para sincronizar con time_entries existentes
CREATE OR REPLACE FUNCTION sync_existing_time_entries()
RETURNS TRIGGER AS $$
BEGIN
    -- Cuando se crea una asignación, verificar si ya existen time_entries
    -- y marcar como asignación retroactiva si es necesario
    IF TG_OP = 'INSERT' THEN
        DECLARE
            existing_entries INTEGER;
            earliest_entry DATE;
        BEGIN
            SELECT COUNT(*), MIN(work_date)
            INTO existing_entries, earliest_entry
            FROM time_entries
            WHERE personnel_id = NEW.personnel_id
            AND project_id = NEW.project_id;
            
            IF existing_entries > 0 AND earliest_entry < NEW.start_date THEN
                -- Ajustar fecha de inicio para incluir entradas existentes
                NEW.start_date := earliest_entry;
                RAISE NOTICE 'Asignación ajustada para incluir time_entries existentes desde %', earliest_entry;
            END IF;
        END;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sync_existing_time_entries
    BEFORE INSERT ON project_assignments
    FOR EACH ROW
    EXECUTE FUNCTION sync_existing_time_entries();

-- =====================================================
-- VISTA PARA DASHBOARD DE ASIGNACIONES
-- =====================================================
CREATE OR REPLACE VIEW v_assignments_dashboard AS
SELECT 
    -- Información del proyecto
    pr.id as project_id,
    pr.name as project_name,
    pr.status as project_status,
    c.name as client_name,
    
    -- Métricas de asignación
    COUNT(pa.id) as total_assigned_personnel,
    COUNT(CASE WHEN pa.is_primary_project THEN 1 END) as primary_assignments,
    SUM(pa.expected_hours_per_day) as total_expected_hours_per_day,
    
    -- Estado de disponibilidad
    CASE 
        WHEN COUNT(pa.id) = 0 THEN 'sin_personal'
        WHEN SUM(pa.expected_hours_per_day) < pr.budget_labor / 50000 THEN 'necesita_mas_personal' -- estimación
        ELSE 'personal_adecuado'
    END as staffing_status,
    
    -- Fechas importantes
    MIN(pa.start_date) as first_assignment_date,
    MAX(pa.end_date) as last_assignment_date
    
FROM projects pr
LEFT JOIN clients c ON pr.client_id = c.id
LEFT JOIN project_assignments pa ON pr.id = pa.project_id AND pa.status = 'active'
WHERE pr.status IN ('planned', 'in_progress')
GROUP BY pr.id, pr.name, pr.status, c.name, pr.budget_labor
ORDER BY pr.name;

-- =====================================================
-- DATOS INICIALES - SINCRONIZACIÓN CON TIME_ENTRIES EXISTENTES
-- =====================================================
-- Crear asignaciones automáticas basadas en time_entries existentes
INSERT INTO project_assignments (personnel_id, project_id, start_date, role, status, notes, created_by)
SELECT DISTINCT
    te.personnel_id,
    te.project_id,
    MIN(te.work_date) as start_date,
    p.position as role,
    'active' as status,
    'Asignación creada automáticamente basada en time_entries existentes' as notes,
    'sistema_migracion' as created_by
FROM time_entries te
JOIN personnel p ON te.personnel_id = p.id
JOIN projects pr ON te.project_id = pr.id
WHERE NOT EXISTS (
    SELECT 1 FROM project_assignments pa 
    WHERE pa.personnel_id = te.personnel_id 
    AND pa.project_id = te.project_id
)
GROUP BY te.personnel_id, te.project_id, p.position;

-- =====================================================
-- MENSAJE DE CONFIRMACIÓN
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '✅ MIGRACIÓN COMPLETADA: Sistema de Asignaciones de Personal';
    RAISE NOTICE '📊 Tabla project_assignments creada con éxito';
    RAISE NOTICE '🔧 Funciones auxiliares implementadas';
    RAISE NOTICE '⚡ Triggers automáticos activados';
    RAISE NOTICE '📈 Vista dashboard_asignaciones disponible';
    RAISE NOTICE '🔄 Sincronización con time_entries completada';
END $$;