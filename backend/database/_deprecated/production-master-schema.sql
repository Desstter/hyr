-- =====================================================
-- ESQUEMA MAESTRO DE PRODUCCIÓN - HYR CONSTRUCTORA & SOLDADURA
-- Sistema Empresarial Completo con Nómina Colombiana 2024
-- =====================================================
-- 
-- VERSIÓN: 2.0.0 PRODUCCIÓN
-- FECHA: 2025-01-01
-- DESCRIPCIÓN: Esquema unificado optimizado para servidor de producción
-- INCLUYE: Core tables, Compliance, Calendar, Triggers, Functions, Indexes
-- =====================================================

-- =====================================================
-- CONFIGURACIÓN DE BASE DE DATOS
-- =====================================================

-- Configurar encoding y locale
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

-- Habilitar extensiones requeridas
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- =====================================================
-- ELIMINAR OBJETOS EXISTENTES (SOLO EN DESARROLLO)
-- =====================================================

-- Eliminar triggers
DROP TRIGGER IF EXISTS trigger_validate_payroll ON payroll_details CASCADE;
DROP TRIGGER IF EXISTS trigger_update_project_progress ON expenses CASCADE;
DROP TRIGGER IF EXISTS trigger_create_labor_expense ON time_entries CASCADE;
DROP TRIGGER IF EXISTS trigger_update_project_spent ON expenses CASCADE;
DROP TRIGGER IF EXISTS update_personnel_modtime ON personnel CASCADE;
DROP TRIGGER IF EXISTS update_projects_modtime ON projects CASCADE;

-- Eliminar funciones
DROP FUNCTION IF EXISTS get_project_profitability(UUID) CASCADE;
DROP FUNCTION IF EXISTS get_monthly_employer_cost(UUID, INTEGER, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS update_project_progress() CASCADE;
DROP FUNCTION IF EXISTS validate_payroll_calculations() CASCADE;
DROP FUNCTION IF EXISTS update_modified_column() CASCADE;
DROP FUNCTION IF EXISTS create_labor_expense() CASCADE;
DROP FUNCTION IF EXISTS update_project_spent() CASCADE;

-- Eliminar tablas (orden inverso de dependencias)
DROP TABLE IF EXISTS audit_events CASCADE;
DROP TABLE IF EXISTS event_notifications CASCADE;
DROP TABLE IF EXISTS project_events CASCADE;
DROP TABLE IF EXISTS payroll_events CASCADE;
DROP TABLE IF EXISTS calendar_events CASCADE;
DROP TABLE IF EXISTS document_support CASCADE;
DROP TABLE IF EXISTS contractors CASCADE;
DROP TABLE IF EXISTS pila_submissions CASCADE;
DROP TABLE IF EXISTS dian_payroll_documents CASCADE;
DROP TABLE IF EXISTS electronic_invoices CASCADE;
DROP TABLE IF EXISTS tax_tables CASCADE;
DROP TABLE IF EXISTS company_settings CASCADE;
DROP TABLE IF EXISTS payroll_details CASCADE;
DROP TABLE IF EXISTS payroll_periods CASCADE;
DROP TABLE IF EXISTS time_entries CASCADE;
DROP TABLE IF EXISTS budget_items CASCADE;
DROP TABLE IF EXISTS expenses CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS personnel CASCADE;
DROP TABLE IF EXISTS clients CASCADE;

-- =====================================================
-- TABLAS PRINCIPALES DEL SISTEMA
-- =====================================================

-- TABLA CLIENTS - Clientes empresariales
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    contact_name VARCHAR(255),
    phone VARCHAR(50),
    email VARCHAR(255),
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints adicionales
    CONSTRAINT chk_clients_name_length CHECK (LENGTH(TRIM(name)) >= 2),
    CONSTRAINT chk_clients_email_format CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- TABLA PERSONNEL - Empleados con información completa
CREATE TABLE personnel (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Información básica
    name VARCHAR(255) NOT NULL,
    document_type VARCHAR(20) DEFAULT 'CC' CHECK (document_type IN ('CC', 'CE', 'TI', 'PP', 'NIT')),
    document_number VARCHAR(50) UNIQUE NOT NULL,
    phone VARCHAR(50),
    email VARCHAR(255),
    address TEXT,
    
    -- Información laboral
    position VARCHAR(100) NOT NULL,
    department VARCHAR(100) NOT NULL,
    hire_date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'terminated', 'vacation')),
    
    -- Información financiera
    salary_type VARCHAR(20) DEFAULT 'hourly' CHECK (salary_type IN ('hourly', 'monthly')),
    hourly_rate DECIMAL(10,2) CHECK (hourly_rate IS NULL OR hourly_rate > 0),
    monthly_salary DECIMAL(15,2) CHECK (monthly_salary IS NULL OR monthly_salary > 0),
    arl_risk_class VARCHAR(5) DEFAULT 'V' CHECK (arl_risk_class IN ('I', 'II', 'III', 'IV', 'V')),
    
    -- Información adicional
    emergency_contact VARCHAR(255),
    emergency_phone VARCHAR(50),
    bank_account VARCHAR(50),
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT chk_personnel_name_length CHECK (LENGTH(TRIM(name)) >= 2),
    CONSTRAINT chk_personnel_salary_type CHECK (
        (salary_type = 'hourly' AND hourly_rate IS NOT NULL AND monthly_salary IS NULL) OR
        (salary_type = 'monthly' AND monthly_salary IS NOT NULL AND hourly_rate IS NULL)
    ),
    CONSTRAINT chk_personnel_hire_date CHECK (hire_date <= CURRENT_DATE)
);

-- TABLA PROJECTS - Proyectos con control financiero
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    description TEXT,
    
    -- Información financiera - Presupuesto
    budget_materials DECIMAL(15,2) DEFAULT 0 CHECK (budget_materials >= 0),
    budget_labor DECIMAL(15,2) DEFAULT 0 CHECK (budget_labor >= 0),
    budget_equipment DECIMAL(15,2) DEFAULT 0 CHECK (budget_equipment >= 0),
    budget_overhead DECIMAL(15,2) DEFAULT 0 CHECK (budget_overhead >= 0),
    budget_total DECIMAL(15,2) GENERATED ALWAYS AS (
        budget_materials + budget_labor + budget_equipment + budget_overhead
    ) STORED,
    
    -- Información financiera - Gastos reales
    spent_materials DECIMAL(15,2) DEFAULT 0 CHECK (spent_materials >= 0),
    spent_labor DECIMAL(15,2) DEFAULT 0 CHECK (spent_labor >= 0),
    spent_equipment DECIMAL(15,2) DEFAULT 0 CHECK (spent_equipment >= 0),
    spent_overhead DECIMAL(15,2) DEFAULT 0 CHECK (spent_overhead >= 0),
    spent_total DECIMAL(15,2) GENERATED ALWAYS AS (
        spent_materials + spent_labor + spent_equipment + spent_overhead
    ) STORED,
    
    -- Fechas y estado
    start_date DATE,
    end_date DATE,
    estimated_end_date DATE,
    status VARCHAR(50) DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'on_hold', 'completed', 'cancelled')),
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT chk_projects_dates CHECK (
        start_date IS NULL OR end_date IS NULL OR start_date <= end_date
    ),
    CONSTRAINT chk_projects_estimated_date CHECK (
        start_date IS NULL OR estimated_end_date IS NULL OR start_date <= estimated_end_date
    )
);

-- TABLA BUDGET_ITEMS - Items detallados del presupuesto
CREATE TABLE budget_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('materials', 'labor', 'equipment', 'overhead')),
    description TEXT NOT NULL,
    quantity DECIMAL(10,3) DEFAULT 1 CHECK (quantity > 0),
    unit_cost DECIMAL(15,2) NOT NULL CHECK (unit_cost >= 0),
    total_cost DECIMAL(15,2) GENERATED ALWAYS AS (quantity * unit_cost) STORED,
    currency VARCHAR(3) DEFAULT 'COP',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT chk_budget_items_description CHECK (LENGTH(TRIM(description)) >= 3)
);

-- TABLA TIME_ENTRIES - Registro de horas trabajadas
CREATE TABLE time_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    personnel_id UUID REFERENCES personnel(id) ON DELETE CASCADE NOT NULL,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
    work_date DATE NOT NULL,
    hours_worked DECIMAL(4,2) NOT NULL CHECK (hours_worked > 0 AND hours_worked <= 24),
    overtime_hours DECIMAL(4,2) DEFAULT 0 CHECK (overtime_hours >= 0 AND overtime_hours <= 12),
    description TEXT,
    
    -- Costos calculados automáticamente
    hourly_rate DECIMAL(10,2) NOT NULL CHECK (hourly_rate > 0),
    regular_pay DECIMAL(15,2) GENERATED ALWAYS AS (hours_worked * hourly_rate) STORED,
    overtime_pay DECIMAL(15,2) GENERATED ALWAYS AS (overtime_hours * hourly_rate * 1.25) STORED,
    total_pay DECIMAL(15,2) GENERATED ALWAYS AS (regular_pay + overtime_pay) STORED,
    
    -- Campos para workflow de aprobación y nómina
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'payroll_locked', 'rejected')),
    payroll_period_id UUID REFERENCES payroll_periods(id) ON DELETE SET NULL,
    approver_notes TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Unique constraint para evitar duplicados
    UNIQUE(personnel_id, project_id, work_date),
    
    -- Constraints adicionales
    CONSTRAINT chk_time_entries_work_date CHECK (work_date <= CURRENT_DATE),
    CONSTRAINT chk_time_entries_total_hours CHECK (hours_worked + overtime_hours <= 24)
);

-- TABLA EXPENSES - Gastos detallados del proyecto
CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    date DATE NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('materials', 'labor', 'equipment', 'overhead', 'services')),
    subcategory VARCHAR(100),
    vendor VARCHAR(255),
    description TEXT,
    quantity DECIMAL(10,3) CHECK (quantity IS NULL OR quantity > 0),
    unit_price DECIMAL(15,2) CHECK (unit_price IS NULL OR unit_price >= 0),
    amount DECIMAL(15,2) NOT NULL CHECK (amount >= 0),
    
    -- Documentación
    invoice_number VARCHAR(100),
    receipt_url TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT chk_expenses_date CHECK (date <= CURRENT_DATE),
    CONSTRAINT chk_expenses_amount_calc CHECK (
        (quantity IS NULL AND unit_price IS NULL) OR 
        (quantity IS NOT NULL AND unit_price IS NOT NULL AND ABS(amount - (quantity * unit_price)) < 0.01)
    )
);

-- TABLA PAYROLL_PERIODS - Períodos de nómina
CREATE TABLE payroll_periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    year INTEGER NOT NULL CHECK (year >= 2020 AND year <= 2030),
    month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
    period_type VARCHAR(20) DEFAULT 'monthly' CHECK (period_type IN ('monthly', 'biweekly', 'weekly')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    processed_at TIMESTAMP,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'processing', 'completed', 'cancelled')),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(year, month, period_type),
    CONSTRAINT chk_payroll_periods_dates CHECK (start_date <= end_date)
);

-- TABLA PAYROLL_DETAILS - Detalle de nómina con cálculos colombianos
CREATE TABLE payroll_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payroll_period_id UUID REFERENCES payroll_periods(id) ON DELETE CASCADE NOT NULL,
    personnel_id UUID REFERENCES personnel(id) ON DELETE CASCADE NOT NULL,
    
    -- Horas y salario base
    regular_hours DECIMAL(6,2) DEFAULT 0 CHECK (regular_hours >= 0),
    overtime_hours DECIMAL(6,2) DEFAULT 0 CHECK (overtime_hours >= 0),
    base_salary DECIMAL(15,2) NOT NULL CHECK (base_salary > 0),
    
    -- Ingresos
    regular_pay DECIMAL(15,2) DEFAULT 0 CHECK (regular_pay >= 0),
    overtime_pay DECIMAL(15,2) DEFAULT 0 CHECK (overtime_pay >= 0),
    transport_allowance DECIMAL(15,2) DEFAULT 0 CHECK (transport_allowance >= 0),
    bonuses DECIMAL(15,2) DEFAULT 0 CHECK (bonuses >= 0),
    total_income DECIMAL(15,2) GENERATED ALWAYS AS (
        regular_pay + overtime_pay + transport_allowance + bonuses
    ) STORED,
    
    -- Deducciones empleado (4% salud, 4% pensión, 1% solidaridad si aplica)
    health_employee DECIMAL(15,2) DEFAULT 0 CHECK (health_employee >= 0),
    pension_employee DECIMAL(15,2) DEFAULT 0 CHECK (pension_employee >= 0),
    solidarity_contribution DECIMAL(15,2) DEFAULT 0 CHECK (solidarity_contribution >= 0),
    withholding_tax DECIMAL(15,2) DEFAULT 0 CHECK (withholding_tax >= 0),
    other_deductions DECIMAL(15,2) DEFAULT 0 CHECK (other_deductions >= 0),
    total_deductions DECIMAL(15,2) GENERATED ALWAYS AS (
        health_employee + pension_employee + solidarity_contribution + withholding_tax + other_deductions
    ) STORED,
    
    -- Neto a pagar
    net_pay DECIMAL(15,2) GENERATED ALWAYS AS (total_income - total_deductions) STORED,
    
    -- Aportes patronales (8.5% salud, 12% pensión, ARL según clase)
    health_employer DECIMAL(15,2) DEFAULT 0 CHECK (health_employer >= 0),
    pension_employer DECIMAL(15,2) DEFAULT 0 CHECK (pension_employer >= 0),
    arl DECIMAL(15,2) DEFAULT 0 CHECK (arl >= 0),
    severance DECIMAL(15,2) DEFAULT 0 CHECK (severance >= 0),
    severance_interest DECIMAL(15,2) DEFAULT 0 CHECK (severance_interest >= 0),
    service_bonus DECIMAL(15,2) DEFAULT 0 CHECK (service_bonus >= 0),
    vacation DECIMAL(15,2) DEFAULT 0 CHECK (vacation >= 0),
    
    -- Parafiscales (2% SENA, 3% ICBF, 4% Cajas)
    sena DECIMAL(15,2) DEFAULT 0 CHECK (sena >= 0),
    icbf DECIMAL(15,2) DEFAULT 0 CHECK (icbf >= 0),
    compensation_fund DECIMAL(15,2) DEFAULT 0 CHECK (compensation_fund >= 0),
    
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
-- TABLAS DE CUMPLIMIENTO LEGAL Y FISCAL
-- =====================================================

-- CONFIGURACIÓN EMPRESARIAL
CREATE TABLE company_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name VARCHAR(255) NOT NULL DEFAULT 'HYR CONSTRUCTORA & SOLDADURA S.A.S.',
    nit VARCHAR(20) NOT NULL DEFAULT '900123456',
    dv VARCHAR(1) NOT NULL DEFAULT '7',
    ciiu VARCHAR(10) NOT NULL DEFAULT '4100',
    address TEXT DEFAULT 'Calle 123 #45-67, Bogotá D.C.',
    phone VARCHAR(50) DEFAULT '+57 1 234 5678',
    email VARCHAR(100) DEFAULT 'info@hyrconstructora.com',
    
    -- Resoluciones DIAN
    dian_invoice_resolution JSONB DEFAULT '{"number": "18760000001", "date": "2024-01-01", "prefix": "SETT", "from": 1, "to": 5000, "valid_until": "2025-12-31"}'::jsonb,
    dian_payroll_resolution JSONB DEFAULT '{"number": "000000000042", "date": "2024-01-01", "valid_until": "2025-12-31"}'::jsonb,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- TABLAS TRIBUTARIAS ANUALES
CREATE TABLE tax_tables (
    year INTEGER PRIMARY KEY CHECK (year >= 2020 AND year <= 2030),
    uvt_value NUMERIC(12,2) NOT NULL DEFAULT 47065.00,
    
    -- Configuraciones flexibles en JSON
    vat_rates JSONB NOT NULL DEFAULT '{
        "19": {"rate": 0.19, "description": "General"},
        "5": {"rate": 0.05, "description": "Productos básicos"},
        "0": {"rate": 0.00, "description": "Exento/Excluido"}
    }'::jsonb,
    
    ica JSONB NOT NULL DEFAULT '{
        "Bogota": {
            "CONSTRUCCION": {"rate": 0.00966, "code": "4100"},
            "SOLDADURA": {"rate": 0.00966, "code": "2592"}
        }
    }'::jsonb,
    
    withholding_tax JSONB NOT NULL DEFAULT '{
        "employment": {"0-95": 0.00, "95-150": 0.19, "150-360": 0.28, "360+": 0.33},
        "services": {"general": 0.11, "construction": 0.02}
    }'::jsonb,
    
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- FACTURACIÓN ELECTRÓNICA
CREATE TABLE electronic_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    client_name VARCHAR(255) NOT NULL,
    client_nit VARCHAR(20),
    city VARCHAR(100) NOT NULL,
    
    subtotal NUMERIC(15,2) NOT NULL CHECK (subtotal >= 0),
    vat_amount NUMERIC(15,2) DEFAULT 0 CHECK (vat_amount >= 0),
    reteica_amount NUMERIC(15,2) DEFAULT 0 CHECK (reteica_amount >= 0),
    total_amount NUMERIC(15,2) NOT NULL CHECK (total_amount >= 0),
    
    cufe TEXT UNIQUE NOT NULL,
    xml_ubl_content TEXT,
    dian_validation_status VARCHAR(50) DEFAULT 'PENDIENTE' 
        CHECK (dian_validation_status IN ('PENDIENTE', 'ACEPTADO_SIMULADO', 'RECHAZADO_SIMULADO', 'ACEPTADO', 'RECHAZADO')),
    
    line_items JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- NÓMINA ELECTRÓNICA DIAN
CREATE TABLE dian_payroll_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    period VARCHAR(7) NOT NULL,
    employee_name VARCHAR(255) NOT NULL,
    employee_document VARCHAR(50) NOT NULL,
    
    base_salary NUMERIC(15,2) NOT NULL CHECK (base_salary > 0),
    worked_days INTEGER NOT NULL CHECK (worked_days >= 0 AND worked_days <= 31),
    
    cune TEXT UNIQUE NOT NULL,
    xml_content TEXT,
    dian_status VARCHAR(50) DEFAULT 'PENDIENTE'
        CHECK (dian_status IN ('PENDIENTE', 'ACEPTADO_SIMULADO', 'RECHAZADO_SIMULADO', 'ACEPTADO', 'RECHAZADO')),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(period, employee_document)
);

-- PILA SEGURIDAD SOCIAL
CREATE TABLE pila_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    period VARCHAR(7) NOT NULL,
    employees_count INTEGER NOT NULL CHECK (employees_count > 0),
    total_contributions NUMERIC(15,2) NOT NULL CHECK (total_contributions > 0),
    
    file_path TEXT,
    csv_content TEXT,
    
    status VARCHAR(50) DEFAULT 'GENERADO'
        CHECK (status IN ('GENERADO', 'ENVIADO', 'PROCESADO', 'ERROR')),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(period)
);

-- CONTRATISTAS INDEPENDIENTES
CREATE TABLE contractors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    document_type VARCHAR(10) DEFAULT 'CC' CHECK (document_type IN ('CC', 'CE', 'NIT', 'PP')),
    document_number VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100),
    phone VARCHAR(50),
    address TEXT,
    obligated_to_invoice BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- DOCUMENTO SOPORTE DIAN
CREATE TABLE document_support (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ds_number VARCHAR(50) UNIQUE NOT NULL,
    contractor_id UUID REFERENCES contractors(id) NOT NULL,
    
    concept TEXT NOT NULL,
    base_amount NUMERIC(15,2) NOT NULL CHECK (base_amount > 0),
    withholdings JSONB DEFAULT '{}'::jsonb,
    total_amount NUMERIC(15,2) NOT NULL CHECK (total_amount >= 0),
    
    dian_status VARCHAR(50) DEFAULT 'ACEPTADO_SIMULADO'
        CHECK (dian_status IN ('PENDIENTE', 'ACEPTADO_SIMULADO', 'RECHAZADO_SIMULADO', 'ACEPTADO', 'RECHAZADO')),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- SISTEMA DE CALENDARIO Y EVENTOS
-- =====================================================

-- EVENTOS DEL CALENDARIO
CREATE TABLE calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    
    event_date DATE NOT NULL,
    event_time TIME,
    
    type VARCHAR(50) NOT NULL CHECK (type IN ('payroll', 'project', 'reminder', 'payment', 'tax', 'maintenance')),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'overdue', 'cancelled')),
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    
    amount DECIMAL(15,2),
    category VARCHAR(50) CHECK (category IN ('tax', 'insurance', 'permit', 'equipment', 'other')),
    
    recurrence VARCHAR(20) DEFAULT 'none' CHECK (recurrence IN ('none', 'daily', 'weekly', 'monthly', 'quarterly', 'yearly')),
    parent_event_id UUID REFERENCES calendar_events(id) ON DELETE CASCADE,
    
    -- Referencias opcionales
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    personnel_id UUID REFERENCES personnel(id) ON DELETE CASCADE,
    payroll_period_id UUID REFERENCES payroll_periods(id) ON DELETE CASCADE,
    
    notify_days_before INTEGER DEFAULT 1 CHECK (notify_days_before >= 0),
    notification_sent BOOLEAN DEFAULT false,
    
    is_completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMP,
    completed_by VARCHAR(255),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- EVENTOS DE NÓMINA ESPECÍFICOS
CREATE TABLE payroll_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    year INTEGER NOT NULL CHECK (year >= 2020 AND year <= 2030),
    month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
    period_type VARCHAR(20) DEFAULT 'monthly' CHECK (period_type IN ('monthly', 'biweekly')),
    
    cutoff_date DATE NOT NULL,
    process_date DATE NOT NULL,
    payment_date DATE NOT NULL,
    
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'processed', 'paid')),
    
    total_employees INTEGER DEFAULT 0 CHECK (total_employees >= 0),
    total_amount DECIMAL(15,2),
    notes TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(year, month, period_type),
    CONSTRAINT chk_payroll_events_dates CHECK (cutoff_date <= process_date AND process_date <= payment_date)
);

-- EVENTOS DE PROYECTO
CREATE TABLE project_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    event_date DATE NOT NULL,
    type VARCHAR(50) CHECK (type IN ('start', 'milestone', 'deadline', 'completion', 'review')),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'overdue', 'cancelled')),
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    
    progress_percentage INTEGER CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    notes TEXT,
    
    calendar_event_id UUID REFERENCES calendar_events(id) ON DELETE SET NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- NOTIFICACIONES DE EVENTOS
CREATE TABLE event_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES calendar_events(id) ON DELETE CASCADE NOT NULL,
    
    notification_type VARCHAR(50) NOT NULL CHECK (notification_type IN ('email', 'sms', 'push', 'system')),
    recipient VARCHAR(255) NOT NULL,
    subject VARCHAR(255),
    message TEXT,
    
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
    scheduled_for TIMESTAMP NOT NULL,
    sent_at TIMESTAMP,
    failed_reason TEXT,
    
    retry_count INTEGER DEFAULT 0 CHECK (retry_count >= 0),
    max_retries INTEGER DEFAULT 3 CHECK (max_retries > 0),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- AUDITORÍA DE EVENTOS
CREATE TABLE audit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor VARCHAR(100) DEFAULT 'SYSTEM',
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('CREATE', 'UPDATE', 'DELETE', 'PROCESS', 'LOGIN', 'LOGOUT')),
    ref_table VARCHAR(50) NOT NULL,
    ref_id UUID,
    
    payload JSONB DEFAULT '{}'::jsonb,
    ip_address INET,
    user_agent TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- ÍNDICES PARA OPTIMIZACIÓN DE CONSULTAS
-- =====================================================

-- Índices principales para clients
CREATE INDEX idx_clients_name ON clients(name);
CREATE INDEX idx_clients_created_at ON clients(created_at DESC);

-- Índices principales para personnel
CREATE INDEX idx_personnel_status ON personnel(status);
CREATE INDEX idx_personnel_department ON personnel(department);
CREATE INDEX idx_personnel_position ON personnel(position);
CREATE INDEX idx_personnel_hire_date ON personnel(hire_date);
CREATE INDEX idx_personnel_document_number ON personnel(document_number);

-- Índices principales para projects
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_client_id ON projects(client_id);
CREATE INDEX idx_projects_start_date ON projects(start_date);
CREATE INDEX idx_projects_estimated_end_date ON projects(estimated_end_date);
CREATE INDEX idx_projects_budget_total ON projects(budget_total DESC);

-- Índices para budget_items
CREATE INDEX idx_budget_items_project_id ON budget_items(project_id);
CREATE INDEX idx_budget_items_category ON budget_items(category);

-- Índices principales para time_entries
CREATE INDEX idx_time_entries_personnel_date ON time_entries(personnel_id, work_date);
CREATE INDEX idx_time_entries_project_date ON time_entries(project_id, work_date DESC);
CREATE INDEX idx_time_entries_work_date ON time_entries(work_date DESC);
CREATE INDEX idx_time_entries_status ON time_entries(status);
CREATE INDEX idx_time_entries_payroll_period ON time_entries(payroll_period_id);

-- Índices principales para expenses
CREATE INDEX idx_expenses_project_date ON expenses(project_id, date DESC);
CREATE INDEX idx_expenses_category_date ON expenses(category, date DESC);
CREATE INDEX idx_expenses_date ON expenses(date DESC);
CREATE INDEX idx_expenses_vendor ON expenses(vendor);
CREATE INDEX idx_expenses_amount ON expenses(amount DESC);

-- Índices para payroll
CREATE INDEX idx_payroll_periods_year_month ON payroll_periods(year DESC, month DESC);
CREATE INDEX idx_payroll_periods_status ON payroll_periods(status);
CREATE INDEX idx_payroll_details_period_id ON payroll_details(payroll_period_id);
CREATE INDEX idx_payroll_details_personnel_id ON payroll_details(personnel_id);

-- Índices para compliance
CREATE INDEX idx_electronic_invoices_date ON electronic_invoices(created_at DESC);
CREATE INDEX idx_electronic_invoices_client ON electronic_invoices(client_name);
CREATE INDEX idx_electronic_invoices_status ON electronic_invoices(dian_validation_status);
CREATE INDEX idx_dian_payroll_period ON dian_payroll_documents(period);
CREATE INDEX idx_dian_payroll_employee ON dian_payroll_documents(employee_document);
CREATE INDEX idx_pila_submissions_period ON pila_submissions(period);

-- Índices para calendar
CREATE INDEX idx_calendar_events_date_type ON calendar_events(event_date, type);
CREATE INDEX idx_calendar_events_status ON calendar_events(status);
CREATE INDEX idx_calendar_events_project ON calendar_events(project_id);
CREATE INDEX idx_calendar_events_personnel ON calendar_events(personnel_id);
CREATE INDEX idx_payroll_events_year_month ON payroll_events(year DESC, month DESC);
CREATE INDEX idx_project_events_project_date ON project_events(project_id, event_date);
CREATE INDEX idx_event_notifications_event_status ON event_notifications(event_id, status);

-- Índices para auditoría
CREATE INDEX idx_audit_events_table_date ON audit_events(ref_table, created_at DESC);
CREATE INDEX idx_audit_events_actor ON audit_events(actor);
CREATE INDEX idx_audit_events_type ON audit_events(event_type);

-- Índices compuestos para consultas complejas
CREATE INDEX idx_time_entries_monthly_summary ON time_entries(personnel_id, EXTRACT(YEAR FROM work_date), EXTRACT(MONTH FROM work_date));
CREATE INDEX idx_expenses_monthly_summary ON expenses(project_id, EXTRACT(YEAR FROM date), EXTRACT(MONTH FROM date));
CREATE INDEX idx_projects_active_by_client ON projects(client_id, status) WHERE status IN ('planned', 'in_progress');

-- =====================================================
-- FUNCIONES DE UTILIDAD EMPRESARIAL
-- =====================================================

-- Función para actualizar timestamps automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Función para calcular costo total empleador mensual
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
    profit_percentage DECIMAL(5,2),
    status TEXT
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
        END as profit_percentage,
        CASE 
            WHEN p.spent_total > p.budget_total THEN 'SOBREPRESUPUESTO'
            WHEN p.spent_total > (p.budget_total * 0.9) THEN 'RIESGO'
            WHEN p.spent_total > (p.budget_total * 0.7) THEN 'NORMAL'
            ELSE 'BAJO_CONSUMO'
        END::TEXT as status
    FROM projects p
    WHERE p.id = project_id;
END;
$$ LANGUAGE plpgsql;

-- Función para obtener resumen ejecutivo
CREATE OR REPLACE FUNCTION get_executive_summary()
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'employees_active', (SELECT COUNT(*) FROM personnel WHERE status = 'active'),
        'projects_active', (SELECT COUNT(*) FROM projects WHERE status = 'in_progress'),
        'monthly_payroll', (
            SELECT COALESCE(SUM(net_pay), 0) 
            FROM payroll_details pd 
            JOIN payroll_periods pp ON pd.payroll_period_id = pp.id 
            WHERE pp.year = EXTRACT(YEAR FROM CURRENT_DATE) 
            AND pp.month = EXTRACT(MONTH FROM CURRENT_DATE)
        ),
        'total_project_value', (SELECT COALESCE(SUM(budget_total), 0) FROM projects WHERE status IN ('in_progress', 'planned')),
        'overdue_events', (SELECT COUNT(*) FROM calendar_events WHERE status = 'overdue')
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGERS AUTOMÁTICOS PARA CÁLCULOS
-- =====================================================

-- Trigger para actualizar gastos reales de proyecto
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

-- Trigger para crear gastos de mano de obra automáticos
CREATE OR REPLACE FUNCTION create_labor_expense()
RETURNS TRIGGER AS $$
DECLARE
    personnel_name VARCHAR(255);
    total_cost_with_benefits DECIMAL(15,2);
BEGIN
    IF TG_OP = 'DELETE' THEN
        DELETE FROM expenses 
        WHERE project_id = OLD.project_id 
        AND category = 'labor' 
        AND description LIKE OLD.personnel_id::text || ' - %' 
        AND date = OLD.work_date;
        RETURN OLD;
    END IF;
    
    SELECT name INTO personnel_name FROM personnel WHERE id = NEW.personnel_id;
    
    -- Factor prestacional colombiano 1.58 (58% sobre salario base)
    total_cost_with_benefits := NEW.total_pay * 1.58;
    
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
        NEW.personnel_id::text || ' - ' || personnel_name || ' (' || NEW.hours_worked || 'h reg + ' || NEW.overtime_hours || 'h ext)',
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

-- Trigger para validar cálculos de nómina colombiana
CREATE OR REPLACE FUNCTION validate_payroll_calculations()
RETURNS TRIGGER AS $$
DECLARE
    salario_minimo CONSTANT DECIMAL := 1300000; -- 2024
    auxilio_transporte CONSTANT DECIMAL := 162000; -- 2024
    base_calculation DECIMAL(15,2);
BEGIN
    base_calculation := NEW.regular_pay + NEW.overtime_pay;
    
    -- Asignar auxilio de transporte automáticamente
    IF NEW.base_salary <= (2 * salario_minimo) AND NEW.transport_allowance = 0 THEN
        NEW.transport_allowance := auxilio_transporte;
    ELSIF NEW.base_salary > (2 * salario_minimo) THEN
        NEW.transport_allowance := 0;
    END IF;
    
    -- Validar deducciones mínimas obligatorias
    IF NEW.health_employee = 0 THEN
        NEW.health_employee := base_calculation * 0.04; -- 4% salud empleado
    END IF;
    
    IF NEW.pension_employee = 0 THEN
        NEW.pension_employee := base_calculation * 0.04; -- 4% pensión empleado
    END IF;
    
    -- Aporte solidario para salarios altos (más de 4 SMMLV)
    IF NEW.base_salary > (4 * salario_minimo) AND NEW.solidarity_contribution = 0 THEN
        NEW.solidarity_contribution := base_calculation * 0.01; -- 1% solidaridad
    END IF;
    
    -- Calcular aportes patronales si no están definidos
    IF NEW.health_employer = 0 THEN
        NEW.health_employer := base_calculation * 0.085; -- 8.5% salud empleador
    END IF;
    
    IF NEW.pension_employer = 0 THEN
        NEW.pension_employer := base_calculation * 0.12; -- 12% pensión empleador
    END IF;
    
    -- Calcular parafiscales si no están definidos
    IF NEW.sena = 0 THEN
        NEW.sena := base_calculation * 0.02; -- 2% SENA
    END IF;
    
    IF NEW.icbf = 0 THEN
        NEW.icbf := base_calculation * 0.03; -- 3% ICBF
    END IF;
    
    IF NEW.compensation_fund = 0 THEN
        NEW.compensation_fund := base_calculation * 0.04; -- 4% Cajas compensación
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validate_payroll
    BEFORE INSERT OR UPDATE ON payroll_details
    FOR EACH ROW
    EXECUTE FUNCTION validate_payroll_calculations();

-- Triggers para updated_at automático
CREATE TRIGGER update_personnel_updated_at
    BEFORE UPDATE ON personnel
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_budget_items_updated_at
    BEFORE UPDATE ON budget_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_company_settings_updated_at
    BEFORE UPDATE ON company_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_calendar_events_updated_at
    BEFORE UPDATE ON calendar_events
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payroll_events_updated_at
    BEFORE UPDATE ON payroll_events
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_project_events_updated_at
    BEFORE UPDATE ON project_events
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_event_notifications_updated_at
    BEFORE UPDATE ON event_notifications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_time_entries_updated_at
    BEFORE UPDATE ON time_entries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- DATOS INICIALES DE CONFIGURACIÓN
-- =====================================================

-- Insertar configuración empresarial por defecto
INSERT INTO company_settings (id) VALUES ('00000000-0000-0000-0000-000000000001');

-- Insertar tablas tributarias 2024-2025
INSERT INTO tax_tables (year, uvt_value) VALUES 
(2024, 47065.00),
(2025, 47065.00);

-- =====================================================
-- COMENTARIOS Y DOCUMENTACIÓN
-- =====================================================

-- Comentarios en tablas principales
COMMENT ON DATABASE hyr_construction IS 'Sistema de Gestión Empresarial HYR Constructora & Soldadura - Producción v2.0';

COMMENT ON TABLE clients IS 'Clientes empresariales con validaciones de integridad';
COMMENT ON TABLE personnel IS 'Empleados con información completa para nómina colombiana 2024';
COMMENT ON TABLE projects IS 'Proyectos con control financiero automático y rentabilidad';
COMMENT ON TABLE time_entries IS 'Registro de horas con cálculo automático de costos laborales';
COMMENT ON TABLE expenses IS 'Gastos detallados con actualización automática de proyectos';
COMMENT ON TABLE payroll_details IS 'Nómina colombiana con cálculos automáticos según legislación 2024';

COMMENT ON TABLE company_settings IS 'Configuración empresarial y resoluciones DIAN para facturación';
COMMENT ON TABLE tax_tables IS 'Tablas tributarias anuales (UVT, IVA, ICA, retenciones)';
COMMENT ON TABLE electronic_invoices IS 'Facturas electrónicas UBL 2.1 para DIAN';
COMMENT ON TABLE calendar_events IS 'Sistema de calendario con eventos empresariales y recordatorios';

-- Comentarios en funciones
COMMENT ON FUNCTION get_monthly_employer_cost(UUID, INTEGER, INTEGER) IS 'Calcula costo total empleador mensual incluyendo prestaciones';
COMMENT ON FUNCTION get_project_profitability(UUID) IS 'Calcula rentabilidad y estado de riesgo del proyecto';
COMMENT ON FUNCTION get_executive_summary() IS 'Resumen ejecutivo con KPIs principales del negocio';

-- =====================================================
-- CONFIGURACIONES DE RENDIMIENTO
-- =====================================================

-- Configurar autovacuum más agresivo para tablas de alta actividad
ALTER TABLE time_entries SET (autovacuum_vacuum_scale_factor = 0.1);
ALTER TABLE expenses SET (autovacuum_vacuum_scale_factor = 0.1);
ALTER TABLE audit_events SET (autovacuum_vacuum_scale_factor = 0.05);

-- Configurar estadísticas para queries complejas
ALTER TABLE projects ALTER COLUMN budget_total SET STATISTICS 1000;
ALTER TABLE expenses ALTER COLUMN amount SET STATISTICS 1000;
ALTER TABLE time_entries ALTER COLUMN work_date SET STATISTICS 1000;

-- =====================================================
-- PERMISOS Y SEGURIDAD (PARA CONFIGURAR EN SERVIDOR)
-- =====================================================

-- Estos comandos se ejecutarán en el servidor de producción
-- CREATE ROLE hyr_app_user WITH LOGIN PASSWORD 'secure_password_here';
-- GRANT CONNECT ON DATABASE hyr_construction TO hyr_app_user;
-- GRANT USAGE ON SCHEMA public TO hyr_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO hyr_app_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO hyr_app_user;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO hyr_app_user;

-- =====================================================
-- FINALIZACIÓN
-- =====================================================

SELECT 'ESQUEMA MAESTRO DE PRODUCCIÓN CREADO EXITOSAMENTE' as status,
       current_timestamp as created_at,
       version() as postgresql_version;