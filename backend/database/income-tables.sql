-- =====================================================
-- HYR CONSTRUCTORA & SOLDADURA - INCOME TRACKING TABLES
-- Sistema de seguimiento de ingresos por proyecto
-- =====================================================

-- =====================================================
-- TABLA PROJECT_INCOMES
-- Registro de ingresos por proyecto
-- =====================================================
CREATE TABLE IF NOT EXISTS project_incomes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
    date DATE NOT NULL,
    concept VARCHAR(255) NOT NULL,
    payment_method VARCHAR(50) DEFAULT 'transfer', -- transfer, cash, check, card
    invoice_number VARCHAR(100),
    notes TEXT,
    
    -- Campos de auditoría
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100) DEFAULT 'system'
);

-- Índices para project_incomes
CREATE INDEX IF NOT EXISTS idx_project_incomes_project ON project_incomes(project_id);
CREATE INDEX IF NOT EXISTS idx_project_incomes_date ON project_incomes(date);
CREATE INDEX IF NOT EXISTS idx_project_incomes_concept ON project_incomes(concept);

-- =====================================================
-- AÑADIR CAMPOS DE INGRESOS A LA TABLA PROJECTS
-- =====================================================
DO $$ 
BEGIN
    -- Agregar campo total_income solo si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'projects' AND column_name = 'total_income'
    ) THEN
        ALTER TABLE projects ADD COLUMN total_income DECIMAL(15,2) DEFAULT 0;
    END IF;
    
    -- Agregar campo expected_income solo si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'projects' AND column_name = 'expected_income'
    ) THEN
        ALTER TABLE projects ADD COLUMN expected_income DECIMAL(15,2) DEFAULT 0;
    END IF;
END $$;

-- =====================================================
-- TRIGGER PARA ACTUALIZAR TOTAL_INCOME DEL PROYECTO
-- =====================================================
CREATE OR REPLACE FUNCTION update_project_total_income()
RETURNS TRIGGER AS $$
DECLARE
    target_project_id UUID;
BEGIN
    -- Determinar el project_id basado en el tipo de operación
    IF TG_OP = 'DELETE' THEN
        target_project_id := OLD.project_id;
    ELSE
        target_project_id := NEW.project_id;
    END IF;

    -- Solo proceder si hay un project_id válido
    IF target_project_id IS NOT NULL THEN
        -- Actualizar el total_income del proyecto
        UPDATE projects SET
            total_income = COALESCE((
                SELECT SUM(amount) 
                FROM project_incomes 
                WHERE project_id = target_project_id
            ), 0),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = target_project_id;
    END IF;

    -- Retornar el registro apropiado según la operación
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Crear el trigger en la tabla project_incomes
DROP TRIGGER IF EXISTS trigger_update_project_total_income ON project_incomes;
CREATE TRIGGER trigger_update_project_total_income
    AFTER INSERT OR UPDATE OR DELETE ON project_incomes
    FOR EACH ROW
    EXECUTE FUNCTION update_project_total_income();

-- =====================================================
-- TRIGGER PARA ACTUALIZAR TIMESTAMP DE MODIFICACIÓN
-- =====================================================
CREATE OR REPLACE FUNCTION update_project_incomes_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_project_incomes_modtime 
    BEFORE UPDATE ON project_incomes 
    FOR EACH ROW 
    EXECUTE FUNCTION update_project_incomes_modified_column();

-- =====================================================
-- FUNCIÓN PARA BACKFILL DE TOTAL_INCOME EXISTENTE
-- =====================================================
CREATE OR REPLACE FUNCTION backfill_project_total_income()
RETURNS VOID AS $$
BEGIN
    -- Actualizar todos los proyectos existentes con sus ingresos actuales
    UPDATE projects SET
        total_income = COALESCE((
            SELECT SUM(amount) 
            FROM project_incomes 
            WHERE project_id = projects.id
        ), 0),
        updated_at = CURRENT_TIMESTAMP
    WHERE id IN (
        SELECT DISTINCT project_id 
        FROM project_incomes 
        WHERE project_id IS NOT NULL
    );
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNCIONES AUXILIARES PARA REPORTES DE INGRESOS
-- =====================================================

-- Función para obtener ingresos por proyecto en un rango de fechas
CREATE OR REPLACE FUNCTION get_project_income_summary(
    project_id_param UUID,
    start_date_param DATE DEFAULT NULL,
    end_date_param DATE DEFAULT NULL
)
RETURNS TABLE(
    total_income DECIMAL(15,2),
    income_count INTEGER,
    avg_income DECIMAL(15,2),
    first_income_date DATE,
    last_income_date DATE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(pi.amount), 0) as total_income,
        COUNT(pi.id)::INTEGER as income_count,
        COALESCE(AVG(pi.amount), 0) as avg_income,
        MIN(pi.date) as first_income_date,
        MAX(pi.date) as last_income_date
    FROM project_incomes pi
    WHERE pi.project_id = project_id_param
    AND (start_date_param IS NULL OR pi.date >= start_date_param)
    AND (end_date_param IS NULL OR pi.date <= end_date_param);
END;
$$ LANGUAGE plpgsql;

-- Función para obtener rentabilidad de proyecto incluyendo ingresos
CREATE OR REPLACE FUNCTION get_project_profit_analysis(project_id_param UUID)
RETURNS TABLE(
    total_income DECIMAL(15,2),
    total_spent DECIMAL(15,2),
    profit_amount DECIMAL(15,2),
    profit_percentage DECIMAL(5,2),
    budget_total DECIMAL(15,2),
    budget_vs_income_percentage DECIMAL(5,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(p.total_income, 0) as total_income,
        p.spent_total,
        COALESCE(p.total_income, 0) - p.spent_total as profit_amount,
        CASE 
            WHEN COALESCE(p.total_income, 0) > 0 
            THEN ROUND(((COALESCE(p.total_income, 0) - p.spent_total) / p.total_income * 100)::numeric, 2)
            ELSE 0::DECIMAL(5,2)
        END as profit_percentage,
        p.budget_total,
        CASE 
            WHEN p.budget_total > 0 
            THEN ROUND((COALESCE(p.total_income, 0) / p.budget_total * 100)::numeric, 2)
            ELSE 0::DECIMAL(5,2)
        END as budget_vs_income_percentage
    FROM projects p
    WHERE p.id = project_id_param;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- COMENTARIOS DE DOCUMENTACIÓN
-- =====================================================
COMMENT ON TABLE project_incomes IS 'Registro de ingresos por proyecto con seguimiento detallado';
COMMENT ON COLUMN project_incomes.amount IS 'Monto del ingreso en pesos colombianos';
COMMENT ON COLUMN project_incomes.concept IS 'Concepto o descripción del ingreso';
COMMENT ON COLUMN project_incomes.payment_method IS 'Método de pago: transfer, cash, check, card';
COMMENT ON COLUMN projects.total_income IS 'Total de ingresos registrados para el proyecto (calculado automáticamente)';
COMMENT ON COLUMN projects.expected_income IS 'Ingresos esperados del proyecto (presupuesto de ingresos)';

COMMENT ON FUNCTION update_project_total_income() IS 'Actualiza automáticamente el total_income del proyecto cuando se modifican sus ingresos';
COMMENT ON FUNCTION get_project_income_summary(UUID, DATE, DATE) IS 'Obtiene resumen de ingresos de un proyecto en un rango de fechas';
COMMENT ON FUNCTION get_project_profit_analysis(UUID) IS 'Análisis completo de rentabilidad incluyendo ingresos vs gastos';