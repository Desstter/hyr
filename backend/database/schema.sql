-- =====================================================
-- HYR CONSTRUCTORA & SOLDADURA - ESQUEMA POSTGRESQL
-- Sistema de Gestión Empresarial con Nómina Colombiana 2024
-- =====================================================

-- Eliminar tablas existentes si existen
DROP TABLE IF EXISTS payroll_details CASCADE;
DROP TABLE IF EXISTS payroll_periods CASCADE;
DROP TABLE IF EXISTS time_entries CASCADE;
DROP TABLE IF EXISTS budget_items CASCADE;
DROP TABLE IF EXISTS expenses CASCADE;
DROP TABLE IF EXISTS cost_estimations CASCADE;
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
-- TABLA COST_ESTIMATIONS
-- Estimaciones de costos guardadas del simulador
-- =====================================================
CREATE TABLE cost_estimations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_name VARCHAR(255) NOT NULL,
    client_name VARCHAR(255),
    template_type VARCHAR(50) NOT NULL, -- construction, welding
    estimation_data JSONB NOT NULL, -- Datos completos de la estimación
    notes TEXT,
    status VARCHAR(50) DEFAULT 'draft', -- draft, approved, converted
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
    budget_total DECIMAL(15,2) GENERATED ALWAYS AS (
        budget_materials + budget_labor + budget_equipment + budget_overhead
    ) STORED,
    
    -- Gastos reales (actualizados automáticamente)
    spent_materials DECIMAL(15,2) DEFAULT 0,
    spent_labor DECIMAL(15,2) DEFAULT 0,
    spent_equipment DECIMAL(15,2) DEFAULT 0,
    spent_overhead DECIMAL(15,2) DEFAULT 0,
    spent_total DECIMAL(15,2) GENERATED ALWAYS AS (
        spent_materials + spent_labor + spent_equipment + spent_overhead
    ) STORED,
    
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
-- TABLA BUDGET_ITEMS
-- Items detallados del presupuesto de proyectos
-- =====================================================
CREATE TABLE budget_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
    category VARCHAR(50) NOT NULL, -- materials, labor, equipment, overhead
    description TEXT NOT NULL,
    quantity DECIMAL(10,3) DEFAULT 1,
    unit_cost DECIMAL(15,2) NOT NULL,
    total_cost DECIMAL(15,2) GENERATED ALWAYS AS (quantity * unit_cost) STORED,
    currency VARCHAR(3) DEFAULT 'COP',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para budget_items
CREATE INDEX idx_budget_items_project ON budget_items(project_id);
CREATE INDEX idx_budget_items_category ON budget_items(category);

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
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'payroll_locked', 'rejected')),
    
    -- Costos calculados automáticamente
    hourly_rate DECIMAL(10,2) NOT NULL,
    regular_pay DECIMAL(15,2) GENERATED ALWAYS AS (hours_worked * hourly_rate) STORED,
    overtime_pay DECIMAL(15,2) GENERATED ALWAYS AS (overtime_hours * hourly_rate * 1.25) STORED,
    total_pay DECIMAL(15,2) GENERATED ALWAYS AS (regular_pay + overtime_pay) STORED,
    
    -- Campos de auditoría
    approver_notes TEXT,
    payroll_period_id UUID,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Índice para consultas rápidas
    UNIQUE(personnel_id, project_id, work_date)
);

-- Índices para time_entries
CREATE INDEX idx_time_entries_personnel ON time_entries(personnel_id);
CREATE INDEX idx_time_entries_project ON time_entries(project_id);
CREATE INDEX idx_time_entries_status ON time_entries(status);
CREATE INDEX idx_time_entries_work_date ON time_entries(work_date);

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
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
-- Detalle de nómina por empleado con cálculos colombianos 2024
-- =====================================================
CREATE TABLE payroll_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payroll_period_id UUID REFERENCES payroll_periods(id) NOT NULL,
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
    total_income DECIMAL(15,2) GENERATED ALWAYS AS (
        regular_pay + overtime_pay + transport_allowance + bonuses
    ) STORED,
    
    -- Deducciones empleado
    health_employee DECIMAL(15,2) DEFAULT 0,
    pension_employee DECIMAL(15,2) DEFAULT 0,
    solidarity_contribution DECIMAL(15,2) DEFAULT 0,
    withholding_tax DECIMAL(15,2) DEFAULT 0,
    other_deductions DECIMAL(15,2) DEFAULT 0,
    total_deductions DECIMAL(15,2) GENERATED ALWAYS AS (
        health_employee + pension_employee + solidarity_contribution + withholding_tax + other_deductions
    ) STORED,
    
    -- Neto a pagar
    net_pay DECIMAL(15,2) GENERATED ALWAYS AS (total_income - total_deductions) STORED,
    
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
    total_employer_cost DECIMAL(15,2) GENERATED ALWAYS AS (
        total_income + health_employer + pension_employer + arl + 
        severance + severance_interest + service_bonus + vacation + 
        sena + icbf + compensation_fund
    ) STORED,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(payroll_period_id, personnel_id)
);

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

-- Índices para cost_estimations
CREATE INDEX idx_cost_estimations_client ON cost_estimations(client_name);
CREATE INDEX idx_cost_estimations_template ON cost_estimations(template_type);
CREATE INDEX idx_cost_estimations_created ON cost_estimations(created_at);
CREATE INDEX idx_cost_estimations_status ON cost_estimations(status);

-- =====================================================
-- DATOS INICIALES BÁSICOS
-- =====================================================
INSERT INTO clients (name, contact_name, phone, email) VALUES 
('Constructora ABC', 'Juan Pérez', '3101234567', 'juan@abc.com'),
('Empresa XYZ', 'María González', '3207654321', 'maria@xyz.com'),
('Metalúrgica DEF', 'Carlos Rodríguez', '3156789012', 'carlos@def.com');

INSERT INTO personnel (name, document_number, position, department, hire_date, salary_type, hourly_rate, monthly_salary, arl_risk_class) VALUES 
('José Martínez', '12345678', 'soldador', 'soldadura', '2024-01-15', 'hourly', 15000, NULL, 'V'),
('Ana López', '87654321', 'supervisor', 'construccion', '2024-02-01', 'monthly', NULL, 2800000, 'IV'),
('Pedro García', '11223344', 'operario', 'construccion', '2024-03-10', 'hourly', 12000, NULL, 'V');

-- Datos de ejemplo para estimaciones de costos
INSERT INTO cost_estimations (project_name, client_name, template_type, estimation_data, notes, status) VALUES 
(
    'Casa Residencial 120m²',
    'Constructora ABC',
    'construction',
    '{"project_info":{"template_type":"construction","duration_days":45,"items_count":6,"created_at":"2024-09-01T10:00:00Z"},"cost_breakdown":{"materials":15840000,"labor":9480000,"equipment":2280000,"overhead":4140000,"subtotal":31740000,"profit":6348000,"contingency":3174000,"total":41262000},"items_detail":[{"category":"materials","subcategory":"concrete","quantity":15,"name":"Concreto","unit":"m3","cost_per_unit":320000,"total_cost":4800000},{"category":"materials","subcategory":"steel","quantity":3,"name":"Acero de refuerzo","unit":"ton","cost_per_unit":3200000,"total_cost":9600000},{"category":"materials","subcategory":"brick","quantity":3600,"name":"Ladrillo","unit":"und","cost_per_unit":350,"total_cost":1260000},{"category":"labor","subcategory":"mason","quantity":300,"name":"Maestro de obra","unit":"hora","cost_per_unit":22000,"total_cost":6600000},{"category":"labor","subcategory":"helper","quantity":200,"name":"Ayudante","unit":"hora","cost_per_unit":15000,"total_cost":3000000},{"category":"equipment","subcategory":"mixer","quantity":20,"name":"Mezcladora","unit":"día","cost_per_unit":85000,"total_cost":1700000}],"calculation_factors":{"labor_benefit_factor":1.58,"overhead_percentage":0.15,"profit_margin":0.2,"contingency":0.1,"benefits_applied":true},"summary":{"cost_per_day":916933,"materials_percentage":38,"labor_percentage":23,"equipment_percentage":6}}',
    'Casa de dos pisos con acabados estándar',
    'draft'
),
(
    'Tanque Industrial 2000L',
    'Metalúrgica DEF',
    'welding',
    '{"project_info":{"template_type":"welding","duration_days":15,"items_count":5,"created_at":"2024-09-02T14:30:00Z"},"cost_breakdown":{"materials":18200000,"labor":9480000,"equipment":1800000,"overhead":4422000,"subtotal":33902000,"profit":6780400,"contingency":3390200,"total":44072600},"items_detail":[{"category":"materials","subcategory":"steel_plate","quantity":1000,"name":"Lámina de acero","unit":"kg","cost_per_unit":3500,"total_cost":3500000},{"category":"materials","subcategory":"electrode","quantity":25,"name":"Electrodo E6013","unit":"kg","cost_per_unit":12000,"total_cost":300000},{"category":"materials","subcategory":"primer","quantity":8,"name":"Primer anticorrosivo","unit":"galon","cost_per_unit":85000,"total_cost":680000},{"category":"labor","subcategory":"welder_certified","quantity":120,"name":"Soldador certificado","unit":"hora","cost_per_unit":25000,"total_cost":3000000},{"category":"labor","subcategory":"inspector","quantity":16,"name":"Inspector soldadura","unit":"hora","cost_per_unit":45000,"total_cost":720000},{"category":"equipment","subcategory":"welding_machine","quantity":15,"name":"Máquina soldar","unit":"día","cost_per_unit":120000,"total_cost":1800000}],"calculation_factors":{"labor_benefit_factor":1.58,"overhead_percentage":0.15,"profit_margin":0.2,"contingency":0.1,"benefits_applied":true},"summary":{"cost_per_day":2938173,"materials_percentage":41,"labor_percentage":21,"equipment_percentage":4}}',
    'Tanque de almacenamiento con certificación ASME',
    'draft'
),
(
    'Estructura Metálica Bodega',
    'Empresa XYZ',
    'welding',
    '{"project_info":{"template_type":"welding","duration_days":30,"items_count":4,"created_at":"2024-09-03T08:15:00Z"},"cost_breakdown":{"materials":89250000,"labor":15792000,"equipment":7600000,"overhead":16896300,"subtotal":129538300,"profit":25907660,"contingency":12953830,"total":168399790},"items_detail":[{"category":"materials","subcategory":"steel_plate","quantity":15000,"name":"Lámina de acero","unit":"kg","cost_per_unit":3500,"total_cost":52500000},{"category":"materials","subcategory":"electrode","quantity":120,"name":"Electrodo E6013","unit":"kg","cost_per_unit":12000,"total_cost":1440000},{"category":"labor","subcategory":"welder_certified","quantity":400,"name":"Soldador certificado","unit":"hora","cost_per_unit":25000,"total_cost":10000000},{"category":"labor","subcategory":"welder_helper","quantity":300,"name":"Ayudante soldador","unit":"hora","cost_per_unit":18000,"total_cost":5400000},{"category":"equipment","subcategory":"crane_welding","quantity":20,"name":"Grúa soldadura","unit":"día","cost_per_unit":380000,"total_cost":7600000}],"calculation_factors":{"labor_benefit_factor":1.58,"overhead_percentage":0.15,"profit_margin":0.2,"contingency":0.1,"benefits_applied":true},"summary":{"cost_per_day":5613326,"materials_percentage":53,"labor_percentage":9,"equipment_percentage":5}}',
    'Estructura para bodega industrial 500m²',
    'approved'
);

COMMENT ON DATABASE hyr_construction IS 'Sistema de Gestión Empresarial HYR Constructora & Soldadura - Nómina Colombiana 2024';