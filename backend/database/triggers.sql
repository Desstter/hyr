-- =====================================================
-- TRIGGERS PARA CÁLCULOS AUTOMÁTICOS
-- HYR CONSTRUCTORA & SOLDADURA - POSTGRESQL
-- =====================================================

-- =====================================================
-- TRIGGER 1: ACTUALIZAR COSTOS DE PROYECTO
-- Se ejecuta cuando se agregan gastos
-- =====================================================
CREATE OR REPLACE FUNCTION update_project_spent()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE projects 
    SET 
        spent_materials = (
            SELECT COALESCE(SUM(amount), 0) 
            FROM expenses 
            WHERE project_id = COALESCE(NEW.project_id, OLD.project_id) AND category = 'materials'
        ),
        spent_labor = (
            SELECT COALESCE(SUM(amount), 0) 
            FROM expenses 
            WHERE project_id = COALESCE(NEW.project_id, OLD.project_id) AND category = 'labor'
        ),
        spent_equipment = (
            SELECT COALESCE(SUM(amount), 0) 
            FROM expenses 
            WHERE project_id = COALESCE(NEW.project_id, OLD.project_id) AND category = 'equipment'
        ),
        spent_overhead = (
            SELECT COALESCE(SUM(amount), 0) 
            FROM expenses 
            WHERE project_id = COALESCE(NEW.project_id, OLD.project_id) AND category = 'overhead'
        ),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = COALESCE(NEW.project_id, OLD.project_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_project_spent
    AFTER INSERT OR UPDATE OR DELETE ON expenses
    FOR EACH ROW
    EXECUTE FUNCTION update_project_spent();

-- =====================================================
-- TRIGGER 2: CREAR GASTOS DE MANO DE OBRA AUTOMÁTICOS
-- Cuando se registran horas trabajadas, se crea el gasto automáticamente
-- =====================================================
CREATE OR REPLACE FUNCTION create_labor_expense()
RETURNS TRIGGER AS $$
DECLARE
    labor_cost DECIMAL(15,2);
    personnel_name VARCHAR(255);
    total_cost_with_benefits DECIMAL(15,2);
BEGIN
    -- Solo crear gastos en INSERT o cuando cambian las horas
    IF TG_OP = 'DELETE' THEN
        -- Eliminar gasto de mano de obra asociado
        DELETE FROM expenses 
        WHERE project_id = OLD.project_id 
        AND category = 'labor' 
        AND description LIKE OLD.personnel_id::text || ' - %' 
        AND date = OLD.work_date;
        
        RETURN OLD;
    END IF;
    
    -- Obtener el nombre del empleado
    SELECT name INTO personnel_name FROM personnel WHERE id = NEW.personnel_id;
    
    -- Calcular costo total de mano de obra (incluye prestaciones sociales colombianas)
    -- Factor 1.58 = salario + aportes patronales + parafiscales aprox.
    total_cost_with_benefits := NEW.total_pay * 1.58;
    
    -- En UPDATE, primero eliminar el gasto anterior si existe
    IF TG_OP = 'UPDATE' THEN
        DELETE FROM expenses 
        WHERE project_id = OLD.project_id 
        AND category = 'labor' 
        AND description LIKE OLD.personnel_id::text || ' - %' 
        AND date = OLD.work_date;
    END IF;
    
    -- Crear gasto automático de mano de obra
    INSERT INTO expenses (
        project_id, 
        date, 
        category, 
        subcategory, 
        description, 
        amount,
        vendor,
        quantity,
        unit_price
    ) VALUES (
        NEW.project_id,
        NEW.work_date,
        'labor',
        'mano_obra_directa',
        NEW.personnel_id::text || ' - ' || personnel_name || ' (' || NEW.hours_worked || 'h regulares + ' || NEW.overtime_hours || 'h extras)',
        total_cost_with_benefits,
        personnel_name,
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

CREATE TRIGGER trigger_create_labor_expense
    AFTER INSERT OR UPDATE OR DELETE ON time_entries
    FOR EACH ROW
    EXECUTE FUNCTION create_labor_expense();

-- =====================================================
-- TRIGGER 3: ACTUALIZAR TIMESTAMP DE MODIFICACIÓN
-- Para personnel y projects
-- =====================================================
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_personnel_modtime 
    BEFORE UPDATE ON personnel 
    FOR EACH ROW 
    EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_projects_modtime 
    BEFORE UPDATE ON projects 
    FOR EACH ROW 
    EXECUTE FUNCTION update_modified_column();

-- =====================================================
-- TRIGGER 4: VALIDAR DATOS DE NÓMINA COLOMBIANA
-- Asegurar que los cálculos cumplan con la legislación
-- =====================================================
CREATE OR REPLACE FUNCTION validate_payroll_calculations()
RETURNS TRIGGER AS $$
DECLARE
    salario_minimo CONSTANT DECIMAL := 1300000; -- 2024
    auxilio_transporte CONSTANT DECIMAL := 162000; -- 2024
BEGIN
    -- Validar que auxilio de transporte se asigne correctamente
    IF NEW.base_salary <= (2 * salario_minimo) AND NEW.transport_allowance = 0 THEN
        NEW.transport_allowance := auxilio_transporte;
    ELSIF NEW.base_salary > (2 * salario_minimo) THEN
        NEW.transport_allowance := 0;
    END IF;
    
    -- Validar deducciones mínimas (4% salud, 4% pensión)
    IF NEW.health_employee < (NEW.regular_pay + NEW.overtime_pay) * 0.04 THEN
        RAISE WARNING 'Deducción de salud menor al 4% requerido por ley';
    END IF;
    
    IF NEW.pension_employee < (NEW.regular_pay + NEW.overtime_pay) * 0.04 THEN
        RAISE WARNING 'Deducción de pensión menor al 4% requerido por ley';
    END IF;
    
    -- Validar aporte solidario para salarios altos
    IF NEW.base_salary > (4 * salario_minimo) AND NEW.solidarity_contribution = 0 THEN
        NEW.solidarity_contribution := (NEW.regular_pay + NEW.overtime_pay) * 0.01;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validate_payroll
    BEFORE INSERT OR UPDATE ON payroll_details
    FOR EACH ROW
    EXECUTE FUNCTION validate_payroll_calculations();

-- =====================================================
-- TRIGGER 5: ACTUALIZAR PROGRESO DE PROYECTO
-- Basado en gastos vs presupuesto
-- =====================================================
CREATE OR REPLACE FUNCTION update_project_progress()
RETURNS TRIGGER AS $$
DECLARE
    total_budget DECIMAL(15,2);
    total_spent DECIMAL(15,2);
    calculated_progress INTEGER;
    project_record RECORD;
BEGIN
    -- Obtener datos del proyecto
    SELECT budget_total, spent_total INTO total_budget, total_spent 
    FROM projects 
    WHERE id = COALESCE(NEW.project_id, OLD.project_id);
    
    -- Calcular progreso estimado basado en gastos
    IF total_budget > 0 THEN
        calculated_progress := LEAST(100, FLOOR((total_spent / total_budget) * 100));
        
        -- Actualizar progreso solo si es mayor al actual
        UPDATE projects 
        SET progress = GREATEST(progress, calculated_progress)
        WHERE id = COALESCE(NEW.project_id, OLD.project_id);
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_project_progress
    AFTER INSERT OR UPDATE ON expenses
    FOR EACH ROW
    EXECUTE FUNCTION update_project_progress();

-- =====================================================
-- FUNCIONES AUXILIARES PARA REPORTES
-- =====================================================

-- Función para obtener costo total empleador mensual
CREATE OR REPLACE FUNCTION get_monthly_employer_cost(employee_id UUID, year_param INTEGER, month_param INTEGER)
RETURNS DECIMAL(15,2) AS $$
DECLARE
    total_cost DECIMAL(15,2) := 0;
BEGIN
    SELECT COALESCE(SUM(total_employer_cost), 0) INTO total_cost
    FROM payroll_details pd
    JOIN payroll_periods pp ON pd.payroll_period_id = pp.id
    WHERE pd.personnel_id = employee_id
    AND pp.year = year_param
    AND pp.month = month_param;
    
    RETURN total_cost;
END;
$$ LANGUAGE plpgsql;

-- Función para calcular rentabilidad de proyecto
CREATE OR REPLACE FUNCTION get_project_profitability(project_id UUID)
RETURNS TABLE(
    budget_total DECIMAL(15,2),
    spent_total DECIMAL(15,2),
    profit_amount DECIMAL(15,2),
    profit_percentage DECIMAL(5,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.budget_total,
        p.spent_total,
        p.budget_total - p.spent_total as profit_amount,
        CASE 
            WHEN p.budget_total > 0 
            THEN ROUND(((p.budget_total - p.spent_total) / p.budget_total * 100)::numeric, 2)
            ELSE 0::DECIMAL(5,2)
        END as profit_percentage
    FROM projects p
    WHERE p.id = project_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_project_spent() IS 'Actualiza automáticamente los gastos reales del proyecto cuando se modifican expenses';
COMMENT ON FUNCTION create_labor_expense() IS 'Crea automáticamente gastos de mano de obra con prestaciones cuando se registran horas';
COMMENT ON FUNCTION validate_payroll_calculations() IS 'Valida que los cálculos de nómina cumplan con la legislación colombiana 2024';