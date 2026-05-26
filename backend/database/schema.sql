-- =====================================================
-- ESQUEMA MAESTRO ÚNICO - HYR CONSTRUCTORA & SOLDADURA
-- =====================================================
-- Fuente de verdad ÚNICA del esquema de base de datos.
-- Consolida lo que antes estaba disperso en production-master-schema.sql,
-- schema-2025-compliance.sql, income-tables.sql, migration-*.sql,
-- triggers.sql y los fix migrations.
--
-- Reconstrucción limpia: se ejecuta vía `npm run setup` (setup-db.js).
-- Idempotente: borra y recrea el schema public completo.
--
-- NOTA DE NÓMINA: las TASAS de nómina (salud, pensión, ARL, parafiscales,
-- FSP, SMMLV) NO se calculan en triggers. La capa de aplicación (motor
-- payroll-colombia-2025 + annual_payroll_settings) es la única fuente de
-- verdad de los cálculos. Aquí solo se definen estructura, integridad y
-- los totales derivados (GENERATED).
-- =====================================================

SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET client_min_messages = warning;

-- =====================================================
-- RESET COMPLETO (datos de prueba: reconstrucción limpia)
-- =====================================================
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- FUNCIÓN UTILITARIA: updated_at automático
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TABLAS PRINCIPALES (orden por dependencias de FK)
-- =====================================================

-- CLIENTES (+ campos Ley 114-1)
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    contact_name VARCHAR(255),
    phone VARCHAR(50),
    email VARCHAR(255),
    address TEXT,
    -- Ley 114-1 (exoneración de aportes)
    qualifies_law_114_1 BOOLEAN DEFAULT false,
    is_juridica BOOLEAN DEFAULT true,
    employee_count INTEGER DEFAULT 0,
    law_114_1_start_date DATE,
    law_114_1_end_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_clients_name_length CHECK (LENGTH(TRIM(name)) >= 2),
    CONSTRAINT chk_clients_email_format CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- PROYECTOS (control financiero + ingresos)
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    description TEXT,
    -- Presupuesto
    budget_materials DECIMAL(15,2) DEFAULT 0 CHECK (budget_materials >= 0),
    budget_labor DECIMAL(15,2) DEFAULT 0 CHECK (budget_labor >= 0),
    budget_equipment DECIMAL(15,2) DEFAULT 0 CHECK (budget_equipment >= 0),
    budget_overhead DECIMAL(15,2) DEFAULT 0 CHECK (budget_overhead >= 0),
    budget_total DECIMAL(15,2) GENERATED ALWAYS AS (
        budget_materials + budget_labor + budget_equipment + budget_overhead
    ) STORED,
    -- Gastos reales (mantenidos por trigger desde expenses)
    spent_materials DECIMAL(15,2) DEFAULT 0 CHECK (spent_materials >= 0),
    spent_labor DECIMAL(15,2) DEFAULT 0 CHECK (spent_labor >= 0),
    spent_equipment DECIMAL(15,2) DEFAULT 0 CHECK (spent_equipment >= 0),
    spent_overhead DECIMAL(15,2) DEFAULT 0 CHECK (spent_overhead >= 0),
    spent_total DECIMAL(15,2) GENERATED ALWAYS AS (
        spent_materials + spent_labor + spent_equipment + spent_overhead
    ) STORED,
    -- Ingresos (total_income mantenido por trigger desde project_incomes)
    total_income DECIMAL(15,2) DEFAULT 0 CHECK (total_income >= 0),
    expected_income DECIMAL(15,2) DEFAULT 0 CHECK (expected_income >= 0),
    -- Fechas y estado
    start_date DATE,
    end_date DATE,
    estimated_end_date DATE,
    status VARCHAR(50) DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'on_hold', 'completed', 'cancelled')),
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_projects_dates CHECK (start_date IS NULL OR end_date IS NULL OR start_date <= end_date),
    CONSTRAINT chk_projects_estimated_date CHECK (start_date IS NULL OR estimated_end_date IS NULL OR start_date <= estimated_end_date)
);

-- PERÍODOS DE NÓMINA (independiente)
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

-- CENTROS DE TRABAJO (ARL diferenciado por obra)
CREATE TABLE work_sites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    city VARCHAR(100),
    department VARCHAR(100),
    arl_risk_class VARCHAR(5) NOT NULL DEFAULT 'V' CHECK (arl_risk_class IN ('I', 'II', 'III', 'IV', 'V')),
    arl_rate DECIMAL(6,5),
    is_active BOOLEAN DEFAULT true,
    start_date DATE DEFAULT CURRENT_DATE,
    end_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_work_sites_dates CHECK (end_date IS NULL OR end_date > start_date)
);

-- PERSONAL (empleados)
CREATE TABLE personnel (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    document_type VARCHAR(20) DEFAULT 'CC' CHECK (document_type IN ('CC', 'CE', 'TI', 'PP', 'NIT')),
    document_number VARCHAR(50) UNIQUE NOT NULL,
    phone VARCHAR(50),
    email VARCHAR(255),
    address TEXT,
    position VARCHAR(100) NOT NULL,
    department VARCHAR(100) NOT NULL,
    hire_date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'terminated', 'vacation')),
    -- Información financiera
    salary_type VARCHAR(20) DEFAULT 'hourly' CHECK (salary_type IN ('hourly', 'monthly')),
    hourly_rate DECIMAL(10,2) CHECK (hourly_rate IS NULL OR hourly_rate > 0),
    monthly_salary DECIMAL(15,2) CHECK (monthly_salary IS NULL OR monthly_salary > 0),
    -- Salario base (prestaciones) vs precio diario (pago real)
    salary_base DECIMAL(15,2) CHECK (salary_base IS NULL OR salary_base > 0),
    daily_rate DECIMAL(15,2) CHECK (daily_rate IS NULL OR daily_rate > 0),
    arl_risk_class VARCHAR(5) DEFAULT 'V' CHECK (arl_risk_class IN ('I', 'II', 'III', 'IV', 'V')),
    -- Horario esperado
    expected_arrival_time TIME DEFAULT '07:00',
    expected_departure_time TIME DEFAULT '16:00',
    -- Flags de cumplimiento 2025
    fsp_exempt BOOLEAN DEFAULT false,
    law_114_1_eligible BOOLEAN DEFAULT true,
    transport_allowance_eligible BOOLEAN DEFAULT true,
    dotacion_eligible BOOLEAN DEFAULT true,
    teleworking BOOLEAN DEFAULT false,
    work_site_default UUID REFERENCES work_sites(id) ON DELETE SET NULL,
    -- Adicional
    emergency_contact VARCHAR(255),
    emergency_phone VARCHAR(50),
    bank_account VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_personnel_name_length CHECK (LENGTH(TRIM(name)) >= 2),
    CONSTRAINT chk_personnel_salary_type CHECK (
        (salary_type = 'hourly' AND hourly_rate IS NOT NULL AND monthly_salary IS NULL) OR
        (salary_type = 'monthly' AND monthly_salary IS NOT NULL AND hourly_rate IS NULL)
    ),
    CONSTRAINT chk_personnel_hire_date CHECK (hire_date <= CURRENT_DATE)
);

-- ITEMS DE PRESUPUESTO
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

-- REGISTRO DE HORAS
CREATE TABLE time_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    personnel_id UUID REFERENCES personnel(id) ON DELETE CASCADE NOT NULL,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,  -- opcional: horas sin proyecto
    work_site_id UUID REFERENCES work_sites(id) ON DELETE SET NULL,
    work_date DATE NOT NULL,
    hours_worked DECIMAL(4,2) NOT NULL CHECK (hours_worked >= 0 AND hours_worked <= 24),
    overtime_hours DECIMAL(4,2) DEFAULT 0 CHECK (overtime_hours >= 0 AND overtime_hours <= 12),
    description TEXT,
    hourly_rate DECIMAL(10,2) NOT NULL CHECK (hourly_rate > 0),
    regular_pay DECIMAL(15,2) GENERATED ALWAYS AS (hours_worked * hourly_rate) STORED,
    overtime_pay DECIMAL(15,2) GENERATED ALWAYS AS (overtime_hours * hourly_rate * 1.25) STORED,
    total_pay DECIMAL(15,2) GENERATED ALWAYS AS (hours_worked * hourly_rate + overtime_hours * hourly_rate * 1.25) STORED,
    -- Control de tiempo real
    arrival_time TIME,
    departure_time TIME,
    expected_arrival_time TIME,
    late_minutes INTEGER DEFAULT 0 CHECK (late_minutes >= 0),
    early_departure_minutes INTEGER DEFAULT 0 CHECK (early_departure_minutes >= 0),
    effective_hours_worked DECIMAL(4,2),
    lunch_deducted BOOLEAN NOT NULL DEFAULT true,
    -- Turno nocturno
    night_hours DECIMAL(4,2) DEFAULT 0 CHECK (night_hours >= 0 AND night_hours <= 12),
    night_premium_rate DECIMAL(5,4) DEFAULT 0.35 CHECK (night_premium_rate >= 0),
    night_pay DECIMAL(15,2) DEFAULT 0 CHECK (night_pay >= 0),
    -- Tipo de recargo / festivos
    is_holiday BOOLEAN DEFAULT false,
    is_sunday BOOLEAN DEFAULT false,
    overtime_type VARCHAR(20),
    -- Workflow
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'payroll_locked', 'rejected')),
    payroll_period_id UUID REFERENCES payroll_periods(id) ON DELETE SET NULL,
    approver_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_time_entries_work_date CHECK (work_date <= CURRENT_DATE),
    CONSTRAINT chk_time_entries_total_hours CHECK (hours_worked + overtime_hours <= 24),
    CONSTRAINT chk_time_entries_arrival_before_departure CHECK (arrival_time IS NULL OR departure_time IS NULL OR arrival_time <= departure_time)
);

-- Unicidad manejando project_id NULL
CREATE UNIQUE INDEX idx_time_entries_unique_with_null_project
    ON time_entries (personnel_id, work_date) WHERE project_id IS NULL;
CREATE UNIQUE INDEX idx_time_entries_unique_with_project
    ON time_entries (personnel_id, project_id, work_date) WHERE project_id IS NOT NULL;

-- GASTOS
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
    invoice_number VARCHAR(100),
    receipt_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_expenses_date CHECK (date <= CURRENT_DATE),
    CONSTRAINT chk_expenses_amount_calc CHECK (
        (quantity IS NULL AND unit_price IS NULL) OR
        (quantity IS NOT NULL AND unit_price IS NOT NULL AND ABS(amount - (quantity * unit_price)) < 0.01)
    )
);

-- DETALLE DE NÓMINA (cálculos hechos por la app; aquí solo estructura + totales)
CREATE TABLE payroll_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payroll_period_id UUID REFERENCES payroll_periods(id) ON DELETE CASCADE NOT NULL,
    personnel_id UUID REFERENCES personnel(id) ON DELETE CASCADE NOT NULL,
    regular_hours DECIMAL(6,2) DEFAULT 0 CHECK (regular_hours >= 0),
    overtime_hours DECIMAL(6,2) DEFAULT 0 CHECK (overtime_hours >= 0),
    base_salary DECIMAL(15,2) NOT NULL CHECK (base_salary > 0),
    -- Ingresos
    regular_pay DECIMAL(15,2) DEFAULT 0 CHECK (regular_pay >= 0),
    overtime_pay DECIMAL(15,2) DEFAULT 0 CHECK (overtime_pay >= 0),
    transport_allowance DECIMAL(15,2) DEFAULT 0 CHECK (transport_allowance >= 0),
    connectivity_allowance DECIMAL(12,2) DEFAULT 0 CHECK (connectivity_allowance >= 0),
    bonuses DECIMAL(15,2) DEFAULT 0 CHECK (bonuses >= 0),
    total_income DECIMAL(15,2) GENERATED ALWAYS AS (
        regular_pay + overtime_pay + transport_allowance + connectivity_allowance + bonuses
    ) STORED,
    -- Deducciones empleado
    health_employee DECIMAL(15,2) DEFAULT 0 CHECK (health_employee >= 0),
    pension_employee DECIMAL(15,2) DEFAULT 0 CHECK (pension_employee >= 0),
    solidarity_contribution DECIMAL(15,2) DEFAULT 0 CHECK (solidarity_contribution >= 0),
    fsp_employee DECIMAL(15,2) DEFAULT 0 CHECK (fsp_employee >= 0),
    withholding_tax DECIMAL(15,2) DEFAULT 0 CHECK (withholding_tax >= 0),
    other_deductions DECIMAL(15,2) DEFAULT 0 CHECK (other_deductions >= 0),
    total_deductions DECIMAL(15,2) GENERATED ALWAYS AS (
        health_employee + pension_employee + solidarity_contribution + fsp_employee + withholding_tax + other_deductions
    ) STORED,
    net_pay DECIMAL(15,2) GENERATED ALWAYS AS (
        regular_pay + overtime_pay + transport_allowance + connectivity_allowance + bonuses
        - (health_employee + pension_employee + solidarity_contribution + fsp_employee + withholding_tax + other_deductions)
    ) STORED,
    -- Aportes patronales
    health_employer DECIMAL(15,2) DEFAULT 0 CHECK (health_employer >= 0),
    pension_employer DECIMAL(15,2) DEFAULT 0 CHECK (pension_employer >= 0),
    arl DECIMAL(15,2) DEFAULT 0 CHECK (arl >= 0),
    arl_work_site UUID REFERENCES work_sites(id) ON DELETE SET NULL,
    severance DECIMAL(15,2) DEFAULT 0 CHECK (severance >= 0),
    severance_interest DECIMAL(15,2) DEFAULT 0 CHECK (severance_interest >= 0),
    service_bonus DECIMAL(15,2) DEFAULT 0 CHECK (service_bonus >= 0),
    vacation DECIMAL(15,2) DEFAULT 0 CHECK (vacation >= 0),
    -- Parafiscales
    sena DECIMAL(15,2) DEFAULT 0 CHECK (sena >= 0),
    icbf DECIMAL(15,2) DEFAULT 0 CHECK (icbf >= 0),
    compensation_fund DECIMAL(15,2) DEFAULT 0 CHECK (compensation_fund >= 0),
    -- Dotación y flags
    dotacion_value DECIMAL(12,2) DEFAULT 0 CHECK (dotacion_value >= 0),
    law_114_1_applied BOOLEAN DEFAULT false,
    total_employer_cost DECIMAL(15,2) GENERATED ALWAYS AS (
        regular_pay + overtime_pay + transport_allowance + connectivity_allowance + bonuses
        + health_employer + pension_employer + arl
        + severance + severance_interest + service_bonus + vacation
        + sena + icbf + compensation_fund
    ) STORED,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(payroll_period_id, personnel_id)
);

-- INGRESOS POR PROYECTO
CREATE TABLE project_incomes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
    date DATE NOT NULL,
    concept VARCHAR(255) NOT NULL,
    payment_method VARCHAR(50) DEFAULT 'transfer' CHECK (payment_method IN ('transfer', 'cash', 'check', 'card')),
    invoice_number VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100) DEFAULT 'system'
);

-- NOVEDADES PILA
CREATE TABLE pila_novelties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    personnel_id UUID REFERENCES personnel(id) ON DELETE CASCADE NOT NULL,
    payroll_period_id UUID REFERENCES payroll_periods(id) ON DELETE CASCADE,
    novelty_type VARCHAR(20) NOT NULL CHECK (novelty_type IN ('ING','RET','TDE','TAE','TDP','VAR','SLN','IGE','LMA','VAC','IRP')),
    novelty_code VARCHAR(10),
    start_date DATE NOT NULL,
    end_date DATE,
    salary_value DECIMAL(15,2),
    days_count INTEGER CHECK (days_count IS NULL OR days_count > 0),
    percentage DECIMAL(5,2) CHECK (percentage IS NULL OR (percentage >= 0 AND percentage <= 100)),
    description TEXT,
    external_reference VARCHAR(100),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'processed')),
    processed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_pila_novelties_dates CHECK (end_date IS NULL OR end_date >= start_date)
);

-- ENTREGAS DE DOTACIÓN
CREATE TABLE dotacion_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    personnel_id UUID REFERENCES personnel(id) ON DELETE CASCADE NOT NULL,
    year INTEGER NOT NULL CHECK (year >= 2024),
    delivery_number INTEGER NOT NULL CHECK (delivery_number IN (1, 2, 3)),
    delivery_date DATE NOT NULL,
    due_date DATE NOT NULL,
    items_delivered TEXT[],
    total_value DECIMAL(12,2),
    vendor VARCHAR(255),
    status VARCHAR(20) DEFAULT 'delivered' CHECK (status IN ('delivered', 'pending', 'cancelled')),
    is_overdue BOOLEAN DEFAULT false,
    invoice_number VARCHAR(100),
    receipt_path TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_employee_delivery UNIQUE (personnel_id, year, delivery_number)
);

-- CONFIGURACIONES CLAVE-VALOR (settings dinámicos)
CREATE TABLE settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(255) UNIQUE NOT NULL,
    value JSONB NOT NULL,
    category VARCHAR(100) DEFAULT 'general',
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- CONFIGURACIÓN ANUAL DE NÓMINA (FUENTE DE VERDAD de tasas por año)
CREATE TABLE annual_payroll_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    year INTEGER NOT NULL UNIQUE CHECK (year >= 2024 AND year <= 2030),
    smmlv DECIMAL(12,2) NOT NULL CHECK (smmlv > 0),
    auxilio_transporte DECIMAL(12,2) NOT NULL CHECK (auxilio_transporte >= 0),
    auxilio_conectividad DECIMAL(12,2),
    uvt DECIMAL(12,2),
    config_json JSONB NOT NULL DEFAULT '{}',
    effective_date DATE NOT NULL,
    created_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- CUMPLIMIENTO LEGAL Y FISCAL
-- =====================================================
CREATE TABLE company_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name VARCHAR(255) NOT NULL DEFAULT 'HYR CONSTRUCTORA & SOLDADURA S.A.S.',
    nit VARCHAR(20) NOT NULL DEFAULT '900123456',
    dv VARCHAR(1) NOT NULL DEFAULT '7',
    ciiu VARCHAR(10) NOT NULL DEFAULT '4100',
    address TEXT DEFAULT 'Calle 123 #45-67, Bogotá D.C.',
    phone VARCHAR(50) DEFAULT '+57 1 234 5678',
    email VARCHAR(100) DEFAULT 'info@hyrconstructora.com',
    dian_invoice_resolution JSONB DEFAULT '{"number": "18760000001", "date": "2024-01-01", "prefix": "SETT", "from": 1, "to": 5000, "valid_until": "2025-12-31"}'::jsonb,
    dian_payroll_resolution JSONB DEFAULT '{"number": "000000000042", "date": "2024-01-01", "valid_until": "2025-12-31"}'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tax_tables (
    year INTEGER PRIMARY KEY CHECK (year >= 2020 AND year <= 2030),
    uvt_value NUMERIC(12,2) NOT NULL DEFAULT 47065.00,
    vat_rates JSONB NOT NULL DEFAULT '{"19": {"rate": 0.19, "description": "General"}, "5": {"rate": 0.05, "description": "Productos básicos"}, "0": {"rate": 0.00, "description": "Exento/Excluido"}}'::jsonb,
    ica JSONB NOT NULL DEFAULT '{"Bogota": {"CONSTRUCCION": {"rate": 0.00966, "code": "4100"}, "SOLDADURA": {"rate": 0.00966, "code": "2592"}}}'::jsonb,
    withholding_tax JSONB NOT NULL DEFAULT '{"employment": {"0-95": 0.00, "95-150": 0.19, "150-360": 0.28, "360+": 0.33}, "services": {"general": 0.11, "construction": 0.02}}'::jsonb,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

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
    -- Estandarizado a dian_status (consistente con dian_payroll_documents y document_support)
    dian_status VARCHAR(50) DEFAULT 'PENDIENTE'
        CHECK (dian_status IN ('PENDIENTE', 'ACEPTADO_SIMULADO', 'RECHAZADO_SIMULADO', 'ACEPTADO', 'RECHAZADO')),
    line_items JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

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

CREATE TABLE pila_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    period VARCHAR(7) NOT NULL,
    employees_count INTEGER NOT NULL CHECK (employees_count > 0),
    total_contributions NUMERIC(15,2) NOT NULL CHECK (total_contributions > 0),
    file_path TEXT,
    csv_content TEXT,
    status VARCHAR(50) DEFAULT 'GENERADO' CHECK (status IN ('GENERADO', 'ENVIADO', 'PROCESADO', 'ERROR')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(period)
);

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
-- CALENDARIO Y EVENTOS
-- =====================================================
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
-- ÍNDICES
-- =====================================================
CREATE INDEX idx_clients_name ON clients(name);
CREATE INDEX idx_personnel_status ON personnel(status);
CREATE INDEX idx_personnel_department ON personnel(department);
CREATE INDEX idx_personnel_document_number ON personnel(document_number);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_client_id ON projects(client_id);
CREATE INDEX idx_budget_items_project_id ON budget_items(project_id);
CREATE INDEX idx_budget_items_category ON budget_items(category);
CREATE INDEX idx_time_entries_personnel_date ON time_entries(personnel_id, work_date);
CREATE INDEX idx_time_entries_project_date ON time_entries(project_id, work_date DESC);
CREATE INDEX idx_time_entries_work_date ON time_entries(work_date DESC);
CREATE INDEX idx_time_entries_status ON time_entries(status);
CREATE INDEX idx_time_entries_payroll_period ON time_entries(payroll_period_id);
CREATE INDEX idx_time_entries_night_hours ON time_entries(night_hours);
CREATE INDEX idx_expenses_project_date ON expenses(project_id, date DESC);
CREATE INDEX idx_expenses_category_date ON expenses(category, date DESC);
CREATE INDEX idx_expenses_date ON expenses(date DESC);
CREATE INDEX idx_payroll_periods_year_month ON payroll_periods(year DESC, month DESC);
CREATE INDEX idx_payroll_periods_status ON payroll_periods(status);
CREATE INDEX idx_payroll_details_period_id ON payroll_details(payroll_period_id);
CREATE INDEX idx_payroll_details_personnel_id ON payroll_details(personnel_id);
CREATE INDEX idx_project_incomes_project ON project_incomes(project_id);
CREATE INDEX idx_project_incomes_date ON project_incomes(date);
CREATE INDEX idx_work_sites_project ON work_sites(project_id);
CREATE INDEX idx_pila_novelties_personnel ON pila_novelties(personnel_id);
CREATE INDEX idx_pila_novelties_period ON pila_novelties(payroll_period_id);
CREATE INDEX idx_annual_payroll_year ON annual_payroll_settings(year);
CREATE INDEX idx_settings_key ON settings(key);
CREATE INDEX idx_settings_category ON settings(category);
CREATE INDEX idx_electronic_invoices_date ON electronic_invoices(created_at DESC);
CREATE INDEX idx_electronic_invoices_status ON electronic_invoices(dian_status);
CREATE INDEX idx_dian_payroll_period ON dian_payroll_documents(period);
CREATE INDEX idx_pila_submissions_period ON pila_submissions(period);
CREATE INDEX idx_calendar_events_date_type ON calendar_events(event_date, type);
CREATE INDEX idx_calendar_events_status ON calendar_events(status);
CREATE INDEX idx_payroll_events_year_month ON payroll_events(year DESC, month DESC);
CREATE INDEX idx_project_events_project_date ON project_events(project_id, event_date);
CREATE INDEX idx_audit_events_table_date ON audit_events(ref_table, created_at DESC);

-- =====================================================
-- FUNCIONES Y TRIGGERS
-- =====================================================

-- Recalcula projects.spent_* desde expenses
CREATE OR REPLACE FUNCTION update_project_spent()
RETURNS TRIGGER AS $$
DECLARE
    pid UUID := COALESCE(NEW.project_id, OLD.project_id);
BEGIN
    IF pid IS NOT NULL THEN
        UPDATE projects SET
            spent_materials = (SELECT COALESCE(SUM(amount),0) FROM expenses WHERE project_id = pid AND category = 'materials'),
            spent_labor     = (SELECT COALESCE(SUM(amount),0) FROM expenses WHERE project_id = pid AND category = 'labor'),
            spent_equipment = (SELECT COALESCE(SUM(amount),0) FROM expenses WHERE project_id = pid AND category = 'equipment'),
            spent_overhead  = (SELECT COALESCE(SUM(amount),0) FROM expenses WHERE project_id = pid AND category IN ('overhead','services')),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = pid;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_project_spent
    AFTER INSERT OR UPDATE OR DELETE ON expenses
    FOR EACH ROW EXECUTE FUNCTION update_project_spent();

-- Recalcula projects.total_income desde project_incomes
CREATE OR REPLACE FUNCTION update_project_total_income()
RETURNS TRIGGER AS $$
DECLARE
    pid UUID := COALESCE(NEW.project_id, OLD.project_id);
BEGIN
    IF pid IS NOT NULL THEN
        UPDATE projects SET
            total_income = COALESCE((SELECT SUM(amount) FROM project_incomes WHERE project_id = pid), 0),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = pid;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_project_total_income
    AFTER INSERT OR UPDATE OR DELETE ON project_incomes
    FOR EACH ROW EXECUTE FUNCTION update_project_total_income();

-- Crea gasto laboral automático al registrar horas (factor prestacional desde settings)
CREATE OR REPLACE FUNCTION create_labor_expense()
RETURNS TRIGGER AS $$
DECLARE
    personnel_name VARCHAR(255);
    benefit_factor DECIMAL(6,3);
    cost DECIMAL(15,2);
BEGIN
    IF TG_OP = 'DELETE' THEN
        DELETE FROM expenses
        WHERE project_id = OLD.project_id AND category = 'labor'
          AND description LIKE OLD.personnel_id::text || ' - %' AND date = OLD.work_date;
        RETURN OLD;
    END IF;

    -- Sin proyecto no se crea gasto de obra
    IF NEW.project_id IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT name INTO personnel_name FROM personnel WHERE id = NEW.personnel_id;

    -- Factor prestacional desde settings (fallback 1.58)
    SELECT COALESCE((value->>'benefit_factor')::DECIMAL, 1.58) INTO benefit_factor
    FROM settings WHERE key = 'payroll_settings';
    benefit_factor := COALESCE(benefit_factor, 1.58);

    cost := (COALESCE(NEW.total_pay,0) + COALESCE(NEW.night_pay,0)) * benefit_factor;

    IF TG_OP = 'UPDATE' THEN
        DELETE FROM expenses
        WHERE project_id = OLD.project_id AND category = 'labor'
          AND description LIKE OLD.personnel_id::text || ' - %' AND date = OLD.work_date;
    END IF;

    IF cost > 0 THEN
        -- quantity/unit_price NULL: el costo laboral es derivado (incluye prestaciones),
        -- no un precio unitario exacto. Evita choques de redondeo con chk_expenses_amount_calc.
        INSERT INTO expenses (project_id, date, category, subcategory, description, amount, vendor, quantity, unit_price)
        VALUES (
            NEW.project_id, NEW.work_date, 'labor', 'mano_obra_directa',
            NEW.personnel_id::text || ' - ' || COALESCE(personnel_name,'') ||
              ' (' || NEW.hours_worked || 'h reg + ' || NEW.overtime_hours || 'h ext)',
            cost, personnel_name, NULL, NULL
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_labor_expense
    AFTER INSERT OR UPDATE OR DELETE ON time_entries
    FOR EACH ROW EXECUTE FUNCTION create_labor_expense();

-- Detecta horas nocturnas (22:00-06:00)
CREATE OR REPLACE FUNCTION calculate_night_hours(
    p_arrival TIME, p_departure TIME,
    night_start TIME DEFAULT '22:00'::TIME, night_end TIME DEFAULT '06:00'::TIME
) RETURNS DECIMAL(4,2) AS $$
DECLARE nh DECIMAL(4,2) := 0; temp_end TIME;
BEGIN
    IF p_arrival IS NULL OR p_departure IS NULL THEN RETURN 0; END IF;
    IF p_departure < p_arrival THEN
        IF p_arrival >= night_start THEN nh := nh + EXTRACT(EPOCH FROM (TIME '23:59:59' - p_arrival))/3600 + (1.0/3600); END IF;
        IF p_departure <= night_end THEN nh := nh + EXTRACT(EPOCH FROM p_departure)/3600; END IF;
    ELSE
        IF p_arrival >= night_start THEN
            temp_end := LEAST(p_departure, TIME '23:59:59');
            nh := nh + EXTRACT(EPOCH FROM (temp_end - p_arrival))/3600;
        END IF;
        IF p_departure <= night_end AND p_arrival < night_end THEN
            nh := nh + EXTRACT(EPOCH FROM (p_departure - GREATEST(p_arrival, TIME '00:00')))/3600;
        END IF;
    END IF;
    RETURN GREATEST(0, ROUND(nh, 2));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Calcula horas efectivas a partir de marcaciones reales
CREATE OR REPLACE FUNCTION calculate_effective_hours(
    p_arrival TIME, p_departure TIME, p_expected_arrival TIME, lunch_minutes INTEGER DEFAULT 60
) RETURNS TABLE(effective_hours DECIMAL(4,2), late_minutes INTEGER, early_departure_minutes INTEGER) AS $$
DECLARE total_min INTEGER; late_min INTEGER := 0;
BEGIN
    total_min := EXTRACT(EPOCH FROM (p_departure - p_arrival))/60;
    IF p_arrival > p_expected_arrival THEN
        late_min := EXTRACT(EPOCH FROM (p_arrival - p_expected_arrival))/60;
    END IF;
    RETURN QUERY SELECT ROUND(((total_min - lunch_minutes)::DECIMAL/60), 2), late_min, 0;
END;
$$ LANGUAGE plpgsql;

-- Trigger BEFORE: deriva horas/recargos cuando hay marcaciones reales
CREATE OR REPLACE FUNCTION update_effective_hours()
RETURNS TRIGGER AS $$
DECLARE
    payroll_config JSONB; night_config JSONB;
    daily_hours DECIMAL(4,2); tolerance_min INTEGER; premium DECIMAL(5,4);
    calc RECORD; nh DECIMAL(4,2); rate DECIMAL(10,2); pdata RECORD;
BEGIN
    IF NEW.arrival_time IS NULL OR NEW.departure_time IS NULL THEN
        RETURN NEW;  -- registro manual de horas: no recalcular
    END IF;

    SELECT value INTO payroll_config FROM settings WHERE key = 'payroll_settings';
    SELECT value INTO night_config FROM settings WHERE key = 'night_shift_settings';
    daily_hours := COALESCE((payroll_config->>'daily_legal_hours')::DECIMAL, 7.3);
    tolerance_min := COALESCE((payroll_config->>'late_tolerance_minutes')::INTEGER, 5);
    premium := COALESCE((night_config->>'premium_rate')::DECIMAL, 0.35);

    SELECT expected_arrival_time, daily_rate INTO pdata FROM personnel WHERE id = NEW.personnel_id;
    IF NEW.expected_arrival_time IS NULL THEN
        NEW.expected_arrival_time := COALESCE(pdata.expected_arrival_time, TIME '07:00');
    END IF;

    SELECT * INTO calc FROM calculate_effective_hours(NEW.arrival_time, NEW.departure_time, NEW.expected_arrival_time,
        CASE WHEN NEW.lunch_deducted THEN 60 ELSE 0 END);
    nh := calculate_night_hours(NEW.arrival_time, NEW.departure_time,
        COALESCE((night_config->>'start_time')::TIME, TIME '22:00'),
        COALESCE((night_config->>'end_time')::TIME, TIME '06:00'));

    NEW.late_minutes := GREATEST(0, calc.late_minutes - tolerance_min);
    NEW.early_departure_minutes := calc.early_departure_minutes;
    NEW.effective_hours_worked := calc.effective_hours;
    NEW.night_hours := nh;
    NEW.night_premium_rate := premium;
    NEW.hours_worked := calc.effective_hours;

    IF calc.effective_hours > daily_hours THEN
        NEW.overtime_hours := calc.effective_hours - daily_hours;
        NEW.hours_worked := daily_hours;
    ELSE
        NEW.overtime_hours := 0;
    END IF;

    -- Si el empleado tiene daily_rate, derivar tarifa horaria
    IF pdata.daily_rate IS NOT NULL AND daily_hours > 0 THEN
        rate := pdata.daily_rate / daily_hours;
        NEW.hourly_rate := rate;
        NEW.night_pay := nh * rate * premium;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_effective_hours
    BEFORE INSERT OR UPDATE ON time_entries
    FOR EACH ROW EXECUTE FUNCTION update_effective_hours();

-- Fechas límite dotación
CREATE OR REPLACE FUNCTION validate_dotacion_dates()
RETURNS TRIGGER AS $$
BEGIN
    CASE NEW.delivery_number
        WHEN 1 THEN NEW.due_date := (NEW.year::text || '-04-30')::DATE;
        WHEN 2 THEN NEW.due_date := (NEW.year::text || '-08-31')::DATE;
        WHEN 3 THEN NEW.due_date := (NEW.year::text || '-12-20')::DATE;
    END CASE;
    NEW.is_overdue := NEW.delivery_date > NEW.due_date;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validate_dotacion_dates
    BEFORE INSERT OR UPDATE ON dotacion_deliveries
    FOR EACH ROW EXECUTE FUNCTION validate_dotacion_dates();

-- updated_at en tablas con esa columna
CREATE TRIGGER update_personnel_updated_at BEFORE UPDATE ON personnel FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_budget_items_updated_at BEFORE UPDATE ON budget_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_time_entries_updated_at BEFORE UPDATE ON time_entries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_work_sites_updated_at BEFORE UPDATE ON work_sites FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_project_incomes_updated_at BEFORE UPDATE ON project_incomes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_annual_payroll_updated_at BEFORE UPDATE ON annual_payroll_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_company_settings_updated_at BEFORE UPDATE ON company_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tax_tables_updated_at BEFORE UPDATE ON tax_tables FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_calendar_events_updated_at BEFORE UPDATE ON calendar_events FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payroll_events_updated_at BEFORE UPDATE ON payroll_events FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_project_events_updated_at BEFORE UPDATE ON project_events FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_event_notifications_updated_at BEFORE UPDATE ON event_notifications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- FUNCIONES DE REPORTE (consultadas por rutas)
-- =====================================================
CREATE OR REPLACE FUNCTION get_project_profitability(p_project_id UUID)
RETURNS TABLE(budget_total DECIMAL(15,2), spent_total DECIMAL(15,2), profit_amount DECIMAL(15,2), profit_percentage DECIMAL(5,2), status TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT p.budget_total, p.spent_total, p.budget_total - p.spent_total,
        CASE WHEN p.budget_total > 0 THEN ROUND(((p.budget_total - p.spent_total)/p.budget_total*100)::numeric,2) ELSE 0::DECIMAL(5,2) END,
        CASE WHEN p.spent_total > p.budget_total THEN 'SOBREPRESUPUESTO'
             WHEN p.spent_total > (p.budget_total*0.9) THEN 'RIESGO'
             WHEN p.spent_total > (p.budget_total*0.7) THEN 'NORMAL'
             ELSE 'BAJO_CONSUMO' END::TEXT
    FROM projects p WHERE p.id = p_project_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- DATOS DE CONFIGURACIÓN (no son datos de prueba)
-- =====================================================
INSERT INTO company_settings (id) VALUES ('00000000-0000-0000-0000-000000000001');

INSERT INTO tax_tables (year, uvt_value) VALUES (2024, 47065.00), (2025, 47065.00);

-- Settings dinámicos (incluye benefit_factor como única fuente del 1.58)
INSERT INTO settings (key, value, category, description) VALUES
('payroll_settings', '{
    "daily_legal_hours": 7.3,
    "late_tolerance_minutes": 5,
    "overtime_threshold_hours": 7.3,
    "max_daily_hours": 12,
    "overtime_multiplier": 1.25,
    "benefit_factor": 1.58,
    "night_shift_start": "22:00",
    "night_shift_end": "06:00",
    "night_shift_multiplier": 1.35
}', 'payroll', 'Configuración de cálculo de nómina (horas, recargos, factor prestacional)'),
('night_shift_settings', '{
    "start_time": "22:00",
    "end_time": "06:00",
    "premium_rate": 0.35,
    "min_night_hours": 0.5,
    "description": "Detección y cálculo de turno nocturno (22:00-06:00)"
}', 'payroll', 'Configuración de turno nocturno'),
('business_hours', '{
    "standard_arrival": "07:00",
    "standard_departure": "16:00",
    "lunch_break_start": "12:00",
    "lunch_break_end": "13:00",
    "saturday_hours": 4,
    "sunday_work_allowed": false
}', 'business_profile', 'Horarios estándar de trabajo');

-- Configuración anual de nómina 2025 (FUENTE DE VERDAD de tasas)
-- config_json refleja config/payroll-2025.js (deducciones, aportes, ARL, parafiscales, FSP, Ley 114-1, recargos)
INSERT INTO annual_payroll_settings (year, smmlv, auxilio_transporte, auxilio_conectividad, uvt, config_json, effective_date, created_by)
VALUES (
    2025, 1423500, 200000, 200000, 47065,
    '{
        "deducciones": {"salud": 0.04, "pension": 0.04, "solidaridad": 0.01, "retencionFuente": 0.0},
        "aportes": {
            "salud": 0.085, "pension": 0.12,
            "arl": {"I": 0.00522, "II": 0.01044, "III": 0.02436, "IV": 0.04350, "V": 0.06960},
            "cesantias": 0.0833, "interesesCesantias": 0.01, "prima": 0.0833, "vacaciones": 0.0417
        },
        "parafiscales": {"sena": 0.02, "icbf": 0.03, "cajas": 0.04},
        "fsp": {"enabled": true, "ranges": [
            {"min": 4, "max": 16, "rate": 0.01},
            {"min": 16, "max": 17, "rate": 0.012},
            {"min": 17, "max": 18, "rate": 0.014},
            {"min": 18, "max": 19, "rate": 0.016},
            {"min": 19, "max": 20, "rate": 0.018},
            {"min": 20, "max": null, "rate": 0.02}
        ]},
        "ley114_1": {"enabled": true, "max_ibc_smmlv": 10, "min_employees_pn": 2, "exemptions": {"salud_empleador": true, "sena": true, "icbf": true, "cajas": false}},
        "recargos": {"extraDiurna": 0.25, "extraNocturna": 0.75, "nocturno": 0.35, "dominical": 0.75, "festivo": 0.75, "extraDiurnaFestivo": 1.00, "extraNocturnaFestivo": 1.50, "extraNocturnaDominical": 1.50},
        "topes": {"ibc_minimo": 1423500, "ibc_maximo": 35587500, "auxilio_transporte_limite": 2847000},
        "version": "2025.1.0"
    }'::jsonb,
    '2025-01-01', 'SYSTEM_SETUP'
);

SELECT 'ESQUEMA MAESTRO HYR CREADO' AS status, CURRENT_TIMESTAMP AS created_at;
