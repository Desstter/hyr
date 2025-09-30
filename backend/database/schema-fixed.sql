-- =====================================================
-- HYR CONSTRUCTORA & SOLDADURA - ESQUEMA POSTGRESQL CORREGIDO
-- Sistema de Gestión Empresarial con Nómina Colombiana 2024
-- =====================================================

-- Eliminar tablas existentes si existen
DROP TABLE IF EXISTS payroll_details CASCADE;
DROP TABLE IF EXISTS payroll_periods CASCADE;
DROP TABLE IF EXISTS time_entries CASCADE;
DROP TABLE IF EXISTS expenses CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS personnel CASCADE;
DROP TABLE IF EXISTS clients CASCADE;

-- =====================================================
-- TABLA CLIENTS
-- =====================================================
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    contact_name VARCHAR(255),
    phone VARCHAR(50),
    email VARCHAR(255),
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- TABLA PERSONNEL
-- Empleados con información completa para nómina colombiana
-- =====================================================
CREATE TABLE personnel (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Información básica
    name VARCHAR(255) NOT NULL,
    document_type VARCHAR(20) DEFAULT 'CC',
    document_number VARCHAR(50) UNIQUE NOT NULL,
    phone VARCHAR(50),
    email VARCHAR(255),
    address TEXT,
    
    -- Información laboral
    position VARCHAR(100) NOT NULL, -- soldador, operario, supervisor, etc.
    department VARCHAR(100) NOT NULL, -- construccion, soldadura, administracion
    hire_date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'active', -- active, inactive, terminated
    
    -- Información financiera
    salary_type VARCHAR(20) DEFAULT 'hourly', -- hourly, monthly
    hourly_rate DECIMAL(10,2),
    monthly_salary DECIMAL(15,2),
    arl_risk_class VARCHAR(5) DEFAULT 'V', -- I, II, III, IV, V
    
    -- Información adicional
    emergency_contact VARCHAR(255),
    emergency_phone VARCHAR(50),
    bank_account VARCHAR(50),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- TABLA PROJECTS
-- Proyectos con control financiero estricto
-- =====================================================
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    client_id UUID REFERENCES clients(id),
    description TEXT,
    
    -- Información financiera
    budget_materials DECIMAL(15,2) DEFAULT 0,
    budget_labor DECIMAL(15,2) DEFAULT 0,
    budget_equipment DECIMAL(15,2) DEFAULT 0,
    budget_overhead DECIMAL(15,2) DEFAULT 0,
    budget_total DECIMAL(15,2) DEFAULT 0,
    
    spent_materials DECIMAL(15,2) DEFAULT 0,
    spent_labor DECIMAL(15,2) DEFAULT 0,
    spent_equipment DECIMAL(15,2) DEFAULT 0,
    spent_overhead DECIMAL(15,2) DEFAULT 0,
    spent_total DECIMAL(15,2) DEFAULT 0,
    
    -- Fechas y estado
    start_date DATE,
    end_date DATE,
    estimated_end_date DATE,
    status VARCHAR(50) DEFAULT 'planned', -- planned, in_progress, on_hold, completed
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- TABLA TIME_ENTRIES
-- Registro de horas trabajadas
-- =====================================================
CREATE TABLE time_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    personnel_id UUID REFERENCES personnel(id) NOT NULL,
    project_id UUID REFERENCES projects(id) NOT NULL,
    work_date DATE NOT NULL,
    hours_worked DECIMAL(4,2) NOT NULL CHECK (hours_worked > 0),
    overtime_hours DECIMAL(4,2) DEFAULT 0,
    description TEXT,
    
    -- Costos calculados
    hourly_rate DECIMAL(10,2) NOT NULL,
    regular_pay DECIMAL(15,2) NOT NULL,
    overtime_pay DECIMAL(15,2) DEFAULT 0,
    total_pay DECIMAL(15,2) NOT NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Índice para consultas rápidas
    UNIQUE(personnel_id, project_id, work_date)
);

-- =====================================================
-- TABLA EXPENSES
-- Gastos detallados
-- =====================================================
CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id),
    date DATE NOT NULL,
    category VARCHAR(50) NOT NULL, -- materials, labor, equipment, overhead
    subcategory VARCHAR(100), -- cemento, soldadura, alquiler_equipo, etc.
    vendor VARCHAR(255),
    description TEXT,
    quantity DECIMAL(10,3),
    unit_price DECIMAL(15,2),
    amount DECIMAL(15,2) NOT NULL,
    
    -- Documentación
    invoice_number VARCHAR(100),
    receipt_url TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- TABLA PAYROLL_PERIODS
-- Períodos de nómina mensual
-- =====================================================
CREATE TABLE payroll_periods (
    id VARCHAR(50) PRIMARY KEY,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
    period_type VARCHAR(20) DEFAULT 'monthly', -- monthly, biweekly
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    processed_at TIMESTAMP,
    status VARCHAR(20) DEFAULT 'draft', -- draft, processing, completed
    
    UNIQUE(year, month, period_type)
);

-- =====================================================
-- TABLA PAYROLL_DETAILS
-- Detalle de nómina por empleado
-- =====================================================
CREATE TABLE payroll_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payroll_period_id VARCHAR(50) REFERENCES payroll_periods(id) NOT NULL,
    personnel_id UUID REFERENCES personnel(id) NOT NULL,
    
    -- Horas y salario base
    regular_hours DECIMAL(6,2) DEFAULT 0,
    overtime_hours DECIMAL(6,2) DEFAULT 0,
    base_salary DECIMAL(15,2) NOT NULL,
    
    -- Ingresos
    regular_pay DECIMAL(15,2) DEFAULT 0,
    overtime_pay DECIMAL(15,2) DEFAULT 0,
    transport_allowance DECIMAL(15,2) DEFAULT 0,
    bonuses DECIMAL(15,2) DEFAULT 0,
    total_income DECIMAL(15,2) DEFAULT 0,
    
    -- Deducciones empleado
    health_employee DECIMAL(15,2) DEFAULT 0,
    pension_employee DECIMAL(15,2) DEFAULT 0,
    solidarity_contribution DECIMAL(15,2) DEFAULT 0,
    withholding_tax DECIMAL(15,2) DEFAULT 0,
    other_deductions DECIMAL(15,2) DEFAULT 0,
    total_deductions DECIMAL(15,2) DEFAULT 0,
    
    -- Neto a pagar
    net_pay DECIMAL(15,2) DEFAULT 0,
    
    -- Aportes patronales
    health_employer DECIMAL(15,2) DEFAULT 0,
    pension_employer DECIMAL(15,2) DEFAULT 0,
    arl DECIMAL(15,2) DEFAULT 0,
    severance DECIMAL(15,2) DEFAULT 0,
    severance_interest DECIMAL(15,2) DEFAULT 0,
    service_bonus DECIMAL(15,2) DEFAULT 0,
    vacation DECIMAL(15,2) DEFAULT 0,
    
    -- Parafiscales
    sena DECIMAL(15,2) DEFAULT 0,
    icbf DECIMAL(15,2) DEFAULT 0,
    compensation_fund DECIMAL(15,2) DEFAULT 0,
    
    -- Costo total empleador
    total_employer_cost DECIMAL(15,2) DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(payroll_period_id, personnel_id)
);

-- =====================================================
-- TRIGGERS PARA CALCULAR TOTALES AUTOMÁTICAMENTE
-- =====================================================

-- Trigger para actualizar budget_total en projects
CREATE OR REPLACE FUNCTION update_project_totals()
RETURNS TRIGGER AS $$
BEGIN
    NEW.budget_total := NEW.budget_materials + NEW.budget_labor + NEW.budget_equipment + NEW.budget_overhead;
    NEW.spent_total := NEW.spent_materials + NEW.spent_labor + NEW.spent_equipment + NEW.spent_overhead;
    NEW.updated_at := CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_project_totals
    BEFORE INSERT OR UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION update_project_totals();

-- Trigger para calcular pays en time_entries
CREATE OR REPLACE FUNCTION calculate_time_entry_pay()
RETURNS TRIGGER AS $$
BEGIN
    NEW.regular_pay := NEW.hours_worked * NEW.hourly_rate;
    NEW.overtime_pay := NEW.overtime_hours * NEW.hourly_rate * 1.25;
    NEW.total_pay := NEW.regular_pay + NEW.overtime_pay;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_time_entry_pay
    BEFORE INSERT OR UPDATE ON time_entries
    FOR EACH ROW
    EXECUTE FUNCTION calculate_time_entry_pay();

-- Trigger para calcular totales en payroll_details
CREATE OR REPLACE FUNCTION calculate_payroll_totals()
RETURNS TRIGGER AS $$
BEGIN
    NEW.total_income := NEW.regular_pay + NEW.overtime_pay + NEW.transport_allowance + NEW.bonuses;
    NEW.total_deductions := NEW.health_employee + NEW.pension_employee + NEW.solidarity_contribution + NEW.withholding_tax + NEW.other_deductions;
    NEW.net_pay := NEW.total_income - NEW.total_deductions;
    NEW.total_employer_cost := NEW.total_income + NEW.health_employer + NEW.pension_employer + NEW.arl + NEW.severance + NEW.severance_interest + NEW.service_bonus + NEW.vacation + NEW.sena + NEW.icbf + NEW.compensation_fund;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_payroll_totals
    BEFORE INSERT OR UPDATE ON payroll_details
    FOR EACH ROW
    EXECUTE FUNCTION calculate_payroll_totals();

-- =====================================================
-- ÍNDICES PARA OPTIMIZACIÓN
-- =====================================================
CREATE INDEX idx_time_entries_project_date ON time_entries(project_id, work_date);
CREATE INDEX idx_time_entries_personnel_date ON time_entries(personnel_id, work_date);
CREATE INDEX idx_expenses_project_date ON expenses(project_id, date);
CREATE INDEX idx_expenses_category ON expenses(category, date);
CREATE INDEX idx_payroll_period ON payroll_details(payroll_period_id);
CREATE INDEX idx_personnel_status ON personnel(status);
CREATE INDEX idx_projects_status ON projects(status);

-- =====================================================
-- COMENTARIO DE LA BASE DE DATOS
-- =====================================================
COMMENT ON DATABASE hyr_construction IS 'Sistema de Gestión Empresarial HYR Constructora & Soldadura - Nómina Colombiana 2024';