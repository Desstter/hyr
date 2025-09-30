-- =====================================================
-- MIGRACIÓN MVP CUMPLIMIENTO NORMATIVO COLOMBIA 2025
-- HYR CONSTRUCTORA & SOLDADURA
-- =====================================================

-- Eliminar tablas existentes si existen
DROP TABLE IF EXISTS audit_events CASCADE;
DROP TABLE IF EXISTS document_support CASCADE;
DROP TABLE IF EXISTS contractors CASCADE;
DROP TABLE IF EXISTS pila_submissions CASCADE;
DROP TABLE IF EXISTS dian_payroll_documents CASCADE;
DROP TABLE IF EXISTS electronic_invoices CASCADE;
DROP TABLE IF EXISTS tax_tables CASCADE;
DROP TABLE IF EXISTS company_settings CASCADE;

-- =====================================================
-- CONFIGURACIÓN EMPRESARIAL
-- =====================================================
CREATE TABLE company_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name VARCHAR(255) NOT NULL DEFAULT 'HYR CONSTRUCTORA & SOLDADURA S.A.S.',
    nit VARCHAR(20) NOT NULL DEFAULT '900123456',
    dv VARCHAR(1) NOT NULL DEFAULT '7',
    ciiu VARCHAR(10) NOT NULL DEFAULT '4100', -- Construcción
    address TEXT DEFAULT 'Calle 123 #45-67, Bogotá D.C.',
    phone VARCHAR(50) DEFAULT '+57 1 234 5678',
    email VARCHAR(100) DEFAULT 'info@hyrconstructora.com',
    
    -- Resoluciones DIAN (JSON flexible)
    dian_invoice_resolution JSONB DEFAULT '{"number": "18760000001", "date": "2024-01-01", "prefix": "SETT", "from": 1, "to": 5000, "valid_until": "2025-12-31"}'::jsonb,
    dian_payroll_resolution JSONB DEFAULT '{"number": "000000000042", "date": "2024-01-01", "valid_until": "2025-12-31"}'::jsonb,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insertar configuración por defecto
INSERT INTO company_settings (id) VALUES ('00000000-0000-0000-0000-000000000001');

-- =====================================================
-- TABLAS TRIBUTARIAS ANUALES
-- =====================================================
CREATE TABLE tax_tables (
    year INTEGER PRIMARY KEY CHECK (year >= 2020 AND year <= 2030),
    uvt_value NUMERIC(12,2) NOT NULL DEFAULT 47065.00, -- UVT 2024
    
    -- Tarifas IVA (JSON flexible)
    vat_rates JSONB NOT NULL DEFAULT '{
        "19": {"rate": 0.19, "description": "General"},
        "5": {"rate": 0.05, "description": "Productos básicos"},
        "0": {"rate": 0.00, "description": "Exento/Excluido"}
    }'::jsonb,
    
    -- ICA por ciudad y actividad (JSON flexible)
    ica JSONB NOT NULL DEFAULT '{
        "Bogota": {
            "CONSTRUCCION": {"rate": 0.00966, "code": "4100"},
            "SOLDADURA": {"rate": 0.00966, "code": "2592"}
        },
        "Medellin": {
            "CONSTRUCCION": {"rate": 0.007, "code": "4100"}
        },
        "Cali": {
            "CONSTRUCCION": {"rate": 0.01104, "code": "4100"}
        }
    }'::jsonb,
    
    -- Retención en la fuente (JSON con rangos UVT)
    withholding_tax JSONB NOT NULL DEFAULT '{
        "employment": {
            "0-95": 0.00,
            "95-150": 0.19,
            "150-360": 0.28,
            "360+": 0.33
        },
        "services": {
            "general": 0.11,
            "construction": 0.02
        }
    }'::jsonb,
    
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insertar configuración 2025
INSERT INTO tax_tables (year, uvt_value) VALUES 
(2025, 47065.00),
(2026, 50000.00); -- Dummy para siguiente año

-- =====================================================
-- FACTURACIÓN ELECTRÓNICA
-- =====================================================
CREATE TABLE electronic_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    client_name VARCHAR(255) NOT NULL,
    client_nit VARCHAR(20),
    city VARCHAR(100) NOT NULL,
    
    -- Montos
    subtotal NUMERIC(15,2) NOT NULL CHECK (subtotal >= 0),
    vat_amount NUMERIC(15,2) DEFAULT 0 CHECK (vat_amount >= 0),
    reteica_amount NUMERIC(15,2) DEFAULT 0 CHECK (reteica_amount >= 0),
    total_amount NUMERIC(15,2) NOT NULL CHECK (total_amount >= 0),
    
    -- DIAN
    cufe TEXT UNIQUE NOT NULL,
    xml_ubl_content TEXT,
    dian_validation_status VARCHAR(50) DEFAULT 'PENDIENTE' 
        CHECK (dian_validation_status IN ('PENDIENTE', 'ACEPTADO_SIMULADO', 'RECHAZADO_SIMULADO', 'ACEPTADO', 'RECHAZADO')),
    
    -- Items (JSON)
    line_items JSONB NOT NULL DEFAULT '[]'::jsonb,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para facturación
CREATE INDEX idx_electronic_invoices_date ON electronic_invoices(created_at);
CREATE INDEX idx_electronic_invoices_client ON electronic_invoices(client_name);
CREATE INDEX idx_electronic_invoices_status ON electronic_invoices(dian_validation_status);

-- =====================================================
-- NÓMINA ELECTRÓNICA DIAN
-- =====================================================
CREATE TABLE dian_payroll_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    period VARCHAR(7) NOT NULL, -- YYYY-MM
    employee_name VARCHAR(255) NOT NULL,
    employee_document VARCHAR(50) NOT NULL,
    
    -- Datos nómina
    base_salary NUMERIC(15,2) NOT NULL CHECK (base_salary > 0),
    worked_days INTEGER NOT NULL CHECK (worked_days >= 0 AND worked_days <= 31),
    
    -- DIAN
    cune TEXT UNIQUE NOT NULL,
    xml_content TEXT,
    dian_status VARCHAR(50) DEFAULT 'PENDIENTE'
        CHECK (dian_status IN ('PENDIENTE', 'ACEPTADO_SIMULADO', 'RECHAZADO_SIMULADO', 'ACEPTADO', 'RECHAZADO')),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraint: un documento por empleado por período
    UNIQUE(period, employee_document)
);

-- Índices para nómina electrónica
CREATE INDEX idx_dian_payroll_period ON dian_payroll_documents(period);
CREATE INDEX idx_dian_payroll_employee ON dian_payroll_documents(employee_document);

-- =====================================================
-- PILA SEGURIDAD SOCIAL
-- =====================================================
CREATE TABLE pila_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    period VARCHAR(7) NOT NULL, -- YYYY-MM
    employees_count INTEGER NOT NULL CHECK (employees_count > 0),
    total_contributions NUMERIC(15,2) NOT NULL CHECK (total_contributions > 0),
    
    -- Archivo generado
    file_path TEXT,
    csv_content TEXT, -- Para almacenar el contenido CSV
    
    status VARCHAR(50) DEFAULT 'GENERADO'
        CHECK (status IN ('GENERADO', 'ENVIADO', 'PROCESADO', 'ERROR')),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Un submission por período
    UNIQUE(period)
);

-- =====================================================
-- CONTRATISTAS INDEPENDIENTES
-- =====================================================
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

-- =====================================================
-- DOCUMENTO SOPORTE DIAN
-- =====================================================
CREATE TABLE document_support (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ds_number VARCHAR(50) UNIQUE NOT NULL, -- DS-HYR-2025-001
    contractor_id UUID REFERENCES contractors(id) NOT NULL,
    
    concept TEXT NOT NULL,
    base_amount NUMERIC(15,2) NOT NULL CHECK (base_amount > 0),
    
    -- Retenciones (JSON flexible)
    withholdings JSONB DEFAULT '{}'::jsonb,
    
    total_amount NUMERIC(15,2) NOT NULL CHECK (total_amount >= 0),
    
    dian_status VARCHAR(50) DEFAULT 'ACEPTADO_SIMULADO'
        CHECK (dian_status IN ('PENDIENTE', 'ACEPTADO_SIMULADO', 'RECHAZADO_SIMULADO', 'ACEPTADO', 'RECHAZADO')),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- AUDITORÍA DE EVENTOS
-- =====================================================
CREATE TABLE audit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor VARCHAR(100) DEFAULT 'SYSTEM', -- Usuario o sistema
    event_type VARCHAR(50) NOT NULL, -- CREATE, UPDATE, DELETE, PROCESS
    ref_table VARCHAR(50) NOT NULL, -- Tabla afectada
    ref_id UUID, -- ID del registro afectado
    
    -- Payload con detalles (JSON)
    payload JSONB DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para auditoría
CREATE INDEX idx_audit_events_table ON audit_events(ref_table);
CREATE INDEX idx_audit_events_date ON audit_events(created_at);
CREATE INDEX idx_audit_events_type ON audit_events(event_type);

-- =====================================================
-- TRIGGERS PARA UPDATED_AT
-- =====================================================

-- Function para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers
CREATE TRIGGER update_company_settings_updated_at 
    BEFORE UPDATE ON company_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tax_tables_updated_at 
    BEFORE UPDATE ON tax_tables
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- DATOS DE PRUEBA MÍNIMOS
-- =====================================================

-- Contratista de ejemplo
INSERT INTO contractors (name, document_number, obligated_to_invoice) VALUES 
('Taller Especializado SAS', '987654321', false),
('Proveedor Materiales Ltda', '123456789', true);

-- =====================================================
-- COMENTARIOS Y NOTAS
-- =====================================================

-- TODO: Integración real con DIAN para validación previa
-- TODO: Integración con operadores PILA (Aportes en Línea, SOI)
-- TODO: Sistema de roles y permisos
-- TODO: Backup automático y retención
-- TODO: Logs de rendimiento

COMMENT ON TABLE company_settings IS 'Configuración empresarial y resoluciones DIAN';
COMMENT ON TABLE tax_tables IS 'Tablas tributarias anuales (UVT, IVA, ICA, retenciones)';
COMMENT ON TABLE electronic_invoices IS 'Facturas electrónicas UBL 2.1';
COMMENT ON TABLE dian_payroll_documents IS 'Documentos nómina electrónica DIAN';
COMMENT ON TABLE pila_submissions IS 'Archivos PILA para seguridad social';
COMMENT ON TABLE contractors IS 'Contratistas independientes';
COMMENT ON TABLE document_support IS 'Documentos soporte para compras';
COMMENT ON TABLE audit_events IS 'Log de auditoría de todas las operaciones';