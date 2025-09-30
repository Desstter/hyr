-- =====================================================
-- ESQUEMA ACTUALIZACIÓN NÓMINA COLOMBIANA 2025
-- HYR CONSTRUCTORA & SOLDADURA
-- Cumplimiento Legal Completo
-- =====================================================

-- =====================================================
-- TABLA 1: CONFIGURACIÓN ANUAL DE NÓMINA
-- Gestión centralizada de parámetros legales por año
-- =====================================================
CREATE TABLE IF NOT EXISTS annual_payroll_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    year INTEGER NOT NULL UNIQUE,
    
    -- Parámetros base Colombia
    smmlv DECIMAL(12,2) NOT NULL,                    -- Salario Mínimo Legal Vigente
    auxilio_transporte DECIMAL(12,2) NOT NULL,       -- Auxilio de Transporte
    auxilio_conectividad DECIMAL(12,2),              -- Auxilio Conectividad (teletrabajo)
    uvt DECIMAL(12,2),                               -- Unidad de Valor Tributario
    
    -- Configuración JSON para flexibilidad
    config_json JSONB NOT NULL DEFAULT '{}',
    
    -- Metadatos
    effective_date DATE NOT NULL,
    created_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Validaciones
    CONSTRAINT valid_year CHECK (year >= 2024 AND year <= 2030),
    CONSTRAINT valid_smmlv CHECK (smmlv > 0),
    CONSTRAINT valid_auxilio_transporte CHECK (auxilio_transporte >= 0)
);

-- Índice para consultas por año
CREATE INDEX idx_annual_payroll_year ON annual_payroll_settings(year);

-- =====================================================
-- TABLA 2: CENTROS DE TRABAJO (ARL DIFERENCIADO)
-- Para ARL variable según ubicación de obra
-- =====================================================
CREATE TABLE IF NOT EXISTS work_sites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
    
    -- Información centro de trabajo
    name VARCHAR(255) NOT NULL,
    address TEXT,
    city VARCHAR(100),
    department VARCHAR(100),
    
    -- Configuración ARL específica
    arl_risk_class VARCHAR(5) NOT NULL DEFAULT 'V',  -- I, II, III, IV, V
    arl_rate DECIMAL(6,5),                           -- Tarifa específica si es custom
    
    -- Configuración operativa
    is_active BOOLEAN DEFAULT true,
    start_date DATE DEFAULT CURRENT_DATE,
    end_date DATE,
    
    -- Metadatos
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Validaciones
    CONSTRAINT valid_arl_class CHECK (arl_risk_class IN ('I', 'II', 'III', 'IV', 'V')),
    CONSTRAINT valid_dates CHECK (end_date IS NULL OR end_date > start_date)
);

-- Índices para work_sites
CREATE INDEX idx_work_sites_project ON work_sites(project_id);
CREATE INDEX idx_work_sites_active ON work_sites(is_active) WHERE is_active = true;

-- =====================================================
-- TABLA 3: NOVEDADES PILA
-- Gestión completa de novedades para PILA 2025
-- =====================================================
CREATE TABLE IF NOT EXISTS pila_novelties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    personnel_id UUID REFERENCES personnel(id) ON DELETE CASCADE NOT NULL,
    payroll_period_id UUID REFERENCES payroll_periods(id) ON DELETE CASCADE,
    
    -- Tipo novedad PILA 2025
    novelty_type VARCHAR(20) NOT NULL,               -- ING, RET, VAR, SLN, IGE, LMA, VCT, IRP, etc.
    novelty_code VARCHAR(10),                        -- Código específico si aplica
    
    -- Fechas novedad
    start_date DATE NOT NULL,
    end_date DATE,
    
    -- Valores asociados
    salary_value DECIMAL(15,2),                      -- Salario asociado a la novedad
    days_count INTEGER,                              -- Días de la novedad
    percentage DECIMAL(5,2),                         -- Porcentaje si aplica (ej: incapacidades)
    
    -- Información adicional
    description TEXT,
    external_reference VARCHAR(100),                 -- Número incapacidad, licencia, etc.
    
    -- Estado
    status VARCHAR(20) DEFAULT 'active',             -- active, cancelled, processed
    processed_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Validaciones
    CONSTRAINT valid_novelty_type CHECK (
        novelty_type IN ('ING', 'RET', 'TDE', 'TAE', 'TDP', 'VAR', 'SLN', 'IGE', 'LMA', 'VAC', 'IRP')
    ),
    CONSTRAINT valid_dates CHECK (end_date IS NULL OR end_date >= start_date),
    CONSTRAINT valid_days CHECK (days_count IS NULL OR days_count > 0),
    CONSTRAINT valid_percentage CHECK (percentage IS NULL OR (percentage >= 0 AND percentage <= 100))
);

-- Índices para pila_novelties
CREATE INDEX idx_pila_novelties_personnel ON pila_novelties(personnel_id);
CREATE INDEX idx_pila_novelties_period ON pila_novelties(payroll_period_id);
CREATE INDEX idx_pila_novelties_type ON pila_novelties(novelty_type);
CREATE INDEX idx_pila_novelties_dates ON pila_novelties(start_date, end_date);

-- =====================================================
-- TABLA 4: CONTROL DE DOTACIÓN
-- Seguimiento entregas dotación obligatoria
-- =====================================================
CREATE TABLE IF NOT EXISTS dotacion_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    personnel_id UUID REFERENCES personnel(id) ON DELETE CASCADE NOT NULL,
    
    -- Período dotación
    year INTEGER NOT NULL,
    delivery_number INTEGER NOT NULL,                -- 1, 2, 3 (tres entregas anuales)
    delivery_date DATE NOT NULL,
    due_date DATE NOT NULL,                          -- Fecha límite entrega
    
    -- Detalle dotación
    items_delivered TEXT[],                          -- Array items entregados
    total_value DECIMAL(12,2),                       -- Valor total dotación
    vendor VARCHAR(255),                             -- Proveedor
    
    -- Estados
    status VARCHAR(20) DEFAULT 'delivered',          -- delivered, pending, cancelled
    is_overdue BOOLEAN DEFAULT false,
    
    -- Documentación
    invoice_number VARCHAR(100),
    receipt_path TEXT,                               -- Ruta comprobante entrega
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Validaciones
    CONSTRAINT valid_delivery_number CHECK (delivery_number IN (1, 2, 3)),
    CONSTRAINT valid_year CHECK (year >= 2024),
    CONSTRAINT unique_employee_delivery UNIQUE (personnel_id, year, delivery_number)
);

-- Índices para dotacion_deliveries
CREATE INDEX idx_dotacion_personnel ON dotacion_deliveries(personnel_id);
CREATE INDEX idx_dotacion_year ON dotacion_deliveries(year);
CREATE INDEX idx_dotacion_overdue ON dotacion_deliveries(is_overdue) WHERE is_overdue = true;

-- =====================================================
-- ACTUALIZACIONES TABLAS EXISTENTES
-- =====================================================

-- CLIENTES: Agregar información Ley 114-1
ALTER TABLE clients ADD COLUMN IF NOT EXISTS qualifies_law_114_1 BOOLEAN DEFAULT false;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS is_juridica BOOLEAN DEFAULT true;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS employee_count INTEGER DEFAULT 0;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS law_114_1_start_date DATE;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS law_114_1_end_date DATE;

-- EMPLEADOS: Agregar campos 2025
ALTER TABLE personnel ADD COLUMN IF NOT EXISTS fsp_exempt BOOLEAN DEFAULT false;
ALTER TABLE personnel ADD COLUMN IF NOT EXISTS law_114_1_eligible BOOLEAN DEFAULT true;
ALTER TABLE personnel ADD COLUMN IF NOT EXISTS work_site_default UUID REFERENCES work_sites(id);
ALTER TABLE personnel ADD COLUMN IF NOT EXISTS transport_allowance_eligible BOOLEAN DEFAULT true;
ALTER TABLE personnel ADD COLUMN IF NOT EXISTS dotacion_eligible BOOLEAN DEFAULT true;
ALTER TABLE personnel ADD COLUMN IF NOT EXISTS teleworking BOOLEAN DEFAULT false;

-- TIME ENTRIES: Agregar centro de trabajo y tipo horas
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS work_site_id UUID REFERENCES work_sites(id);
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS start_time TIME;
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS end_time TIME;
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS is_holiday BOOLEAN DEFAULT false;
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS is_sunday BOOLEAN DEFAULT false;
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS overtime_type VARCHAR(20); -- diurna, nocturna, festiva

-- PAYROLL DETAILS: Agregar campos FSP y detalle legal
ALTER TABLE payroll_details ADD COLUMN IF NOT EXISTS fsp_employee DECIMAL(15,2) DEFAULT 0;
ALTER TABLE payroll_details ADD COLUMN IF NOT EXISTS law_114_1_applied BOOLEAN DEFAULT false;
ALTER TABLE payroll_details ADD COLUMN IF NOT EXISTS arl_work_site UUID REFERENCES work_sites(id);
ALTER TABLE payroll_details ADD COLUMN IF NOT EXISTS dotacion_value DECIMAL(12,2) DEFAULT 0;
ALTER TABLE payroll_details ADD COLUMN IF NOT EXISTS connectivity_allowance DECIMAL(12,2) DEFAULT 0;

-- =====================================================
-- TRIGGERS ACTUALIZADOS
-- =====================================================

-- Trigger para actualizar conteo empleados por cliente
CREATE OR REPLACE FUNCTION update_client_employee_count()
RETURNS TRIGGER AS $$
DECLARE
    client_record RECORD;
BEGIN
    -- Obtener client_id desde time_entries via personnel
    IF TG_TABLE_NAME = 'time_entries' THEN
        SELECT p.id, proj.client_id INTO client_record
        FROM personnel p
        JOIN time_entries te ON p.id = te.personnel_id
        JOIN projects proj ON te.project_id = proj.id
        WHERE te.id = COALESCE(NEW.id, OLD.id)
        LIMIT 1;
    ELSE
        client_record.client_id := COALESCE(NEW.client_id, OLD.client_id);
    END IF;
    
    -- Actualizar conteo empleados activos
    IF client_record.client_id IS NOT NULL THEN
        UPDATE clients SET 
            employee_count = (
                SELECT COUNT(DISTINCT p.id)
                FROM personnel p
                JOIN time_entries te ON p.id = te.personnel_id  
                JOIN projects proj ON te.project_id = proj.id
                WHERE proj.client_id = client_record.client_id
                AND p.status = 'active'
            ),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = client_record.client_id;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger a tablas relevantes
DROP TRIGGER IF EXISTS trigger_update_client_employee_count ON time_entries;
CREATE TRIGGER trigger_update_client_employee_count
    AFTER INSERT OR UPDATE OR DELETE ON time_entries
    FOR EACH ROW
    EXECUTE FUNCTION update_client_employee_count();

-- Trigger para validar fechas dotación automáticamente
CREATE OR REPLACE FUNCTION validate_dotacion_dates()
RETURNS TRIGGER AS $$
BEGIN
    -- Establecer fechas límite dotación según número entrega
    CASE NEW.delivery_number
        WHEN 1 THEN NEW.due_date := (NEW.year::text || '-04-30')::DATE;
        WHEN 2 THEN NEW.due_date := (NEW.year::text || '-08-31')::DATE;  
        WHEN 3 THEN NEW.due_date := (NEW.year::text || '-12-20')::DATE;
    END CASE;
    
    -- Marcar como vencida si se entrega después de fecha límite
    NEW.is_overdue := NEW.delivery_date > NEW.due_date;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validate_dotacion_dates
    BEFORE INSERT OR UPDATE ON dotacion_deliveries
    FOR EACH ROW
    EXECUTE FUNCTION validate_dotacion_dates();

-- =====================================================
-- FUNCIONES AUXILIARES 2025
-- =====================================================

-- Función para obtener configuración año específico
CREATE OR REPLACE FUNCTION get_payroll_settings(target_year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE))
RETURNS annual_payroll_settings AS $$
DECLARE
    settings_record annual_payroll_settings;
BEGIN
    SELECT * INTO settings_record 
    FROM annual_payroll_settings 
    WHERE year = target_year;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'No existe configuración de nómina para el año %', target_year;
    END IF;
    
    RETURN settings_record;
END;
$$ LANGUAGE plpgsql;

-- Función para calcular FSP automáticamente
CREATE OR REPLACE FUNCTION calculate_fsp_contribution(base_salary DECIMAL, target_year INTEGER DEFAULT 2025)
RETURNS DECIMAL AS $$
DECLARE
    settings_record annual_payroll_settings;
    ibc_smmlv DECIMAL;
    fsp_rate DECIMAL := 0;
BEGIN
    -- Obtener configuración del año
    SELECT * INTO settings_record FROM get_payroll_settings(target_year);
    
    -- Calcular IBC en términos de SMMLV
    ibc_smmlv := base_salary / settings_record.smmlv;
    
    -- FSP solo aplica para IBC >= 4 SMMLV
    IF ibc_smmlv < 4 THEN
        RETURN 0;
    END IF;
    
    -- Determinar tarifa FSP según rango
    IF ibc_smmlv >= 4 AND ibc_smmlv < 16 THEN
        fsp_rate := 0.01;        -- 1%
    ELSIF ibc_smmlv >= 16 AND ibc_smmlv < 17 THEN
        fsp_rate := 0.012;       -- 1.2%
    ELSIF ibc_smmlv >= 17 AND ibc_smmlv < 18 THEN
        fsp_rate := 0.014;       -- 1.4%
    ELSIF ibc_smmlv >= 18 AND ibc_smmlv < 19 THEN
        fsp_rate := 0.016;       -- 1.6%
    ELSIF ibc_smmlv >= 19 AND ibc_smmlv < 20 THEN
        fsp_rate := 0.018;       -- 1.8%
    ELSE
        fsp_rate := 0.02;        -- 2%
    END IF;
    
    RETURN base_salary * fsp_rate;
END;
$$ LANGUAGE plpgsql;

-- Función para verificar elegibilidad Ley 114-1
CREATE OR REPLACE FUNCTION check_law_114_1_eligibility(
    client_id UUID, 
    employee_base_salary DECIMAL,
    target_year INTEGER DEFAULT 2025
)
RETURNS BOOLEAN AS $$
DECLARE
    client_record clients;
    settings_record annual_payroll_settings;
    ibc_smmlv DECIMAL;
BEGIN
    -- Obtener datos del cliente
    SELECT * INTO client_record FROM clients WHERE id = client_id;
    
    IF NOT FOUND THEN
        RETURN false;
    END IF;
    
    -- Obtener configuración del año
    SELECT * INTO settings_record FROM get_payroll_settings(target_year);
    
    -- Verificar si cliente califica para Ley 114-1
    IF NOT client_record.qualifies_law_114_1 THEN
        RETURN false;
    END IF;
    
    -- Verificar condiciones empresa: PJ O PN >= 2 empleados
    IF NOT (client_record.is_juridica OR client_record.employee_count >= 2) THEN
        RETURN false;
    END IF;
    
    -- Verificar IBC empleado < 10 SMMLV
    ibc_smmlv := employee_base_salary / settings_record.smmlv;
    IF ibc_smmlv >= 10 THEN
        RETURN false;
    END IF;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- SEEDS CONFIGURACIÓN 2025
-- =====================================================

-- Insertar configuración oficial 2025
INSERT INTO annual_payroll_settings (
    year, smmlv, auxilio_transporte, auxilio_conectividad, uvt, 
    config_json, effective_date, created_by
) VALUES (
    2025,
    1423500,    -- SMMLV 2025 oficial
    200000,     -- Auxilio transporte actualizado
    200000,     -- Auxilio conectividad
    47065,      -- UVT 2025 (pendiente confirmación)
    '{
        "fsp_enabled": true,
        "law_114_1_enabled": true,
        "pila_version": "2025.1",
        "dotacion_enabled": true,
        "version": "2025.1.0"
    }'::jsonb,
    '2025-01-01',
    'SYSTEM_SETUP'
) ON CONFLICT (year) DO UPDATE SET
    smmlv = EXCLUDED.smmlv,
    auxilio_transporte = EXCLUDED.auxilio_transporte,
    auxilio_conectividad = EXCLUDED.auxilio_conectividad,
    config_json = EXCLUDED.config_json,
    updated_at = CURRENT_TIMESTAMP;

-- Configurar clientes existentes para Ley 114-1 (ejemplo)
UPDATE clients SET 
    qualifies_law_114_1 = true,
    is_juridica = true,
    law_114_1_start_date = '2025-01-01',
    law_114_1_end_date = '2025-12-31'
WHERE name IN ('Ecopetrol S.A.', 'Constructora Bolívar', 'Industrias Metálicas del Caribe');

-- Crear centros de trabajo por defecto para proyectos existentes
INSERT INTO work_sites (project_id, name, address, arl_risk_class)
SELECT 
    p.id,
    p.name || ' - Sede Principal',
    'Centro de trabajo principal',
    'V'  -- Clase V para construcción/soldadura
FROM projects p
WHERE NOT EXISTS (
    SELECT 1 FROM work_sites ws WHERE ws.project_id = p.id
);

-- =====================================================
-- COMENTARIOS Y DOCUMENTACIÓN
-- =====================================================

COMMENT ON TABLE annual_payroll_settings IS 'Configuración anual de parámetros legales de nómina por año fiscal';
COMMENT ON TABLE work_sites IS 'Centros de trabajo para ARL diferenciado por ubicación de obra';
COMMENT ON TABLE pila_novelties IS 'Novedades PILA para cumplimiento formato 2025 con Resolución 2388/2016';
COMMENT ON TABLE dotacion_deliveries IS 'Control entregas dotación obligatoria (3 entregas anuales)';

COMMENT ON FUNCTION get_payroll_settings(INTEGER) IS 'Obtiene configuración de nómina para año específico';
COMMENT ON FUNCTION calculate_fsp_contribution(DECIMAL, INTEGER) IS 'Calcula FSP automáticamente según tabla de rangos 2025';
COMMENT ON FUNCTION check_law_114_1_eligibility(UUID, DECIMAL, INTEGER) IS 'Verifica elegibilidad empleado/empresa para exoneración Ley 114-1';

-- =====================================================
-- ÍNDICES DE PERFORMANCE
-- =====================================================

-- Índices compuestos para consultas frecuentes
CREATE INDEX IF NOT EXISTS idx_payroll_details_law_114_1 ON payroll_details(law_114_1_applied, payroll_period_id);
CREATE INDEX IF NOT EXISTS idx_personnel_dotacion ON personnel(dotacion_eligible, hire_date);
CREATE INDEX IF NOT EXISTS idx_time_entries_overtime ON time_entries(overtime_type, work_date);

-- =====================================================
-- VALIDACIONES FINALES
-- =====================================================

-- Verificar que la configuración 2025 fue insertada correctamente
DO $$ 
DECLARE
    settings_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO settings_count FROM annual_payroll_settings WHERE year = 2025;
    
    IF settings_count = 0 THEN
        RAISE EXCEPTION 'ERROR: Configuración 2025 no fue insertada correctamente';
    ELSE
        RAISE NOTICE 'SUCCESS: Configuración de nómina 2025 lista para usar';
    END IF;
END $$;

-- Mostrar resumen de las actualizaciones
SELECT 
    'Esquema 2025 actualizado correctamente' as status,
    (SELECT COUNT(*) FROM annual_payroll_settings) as configuraciones_anos,
    (SELECT COUNT(*) FROM work_sites) as centros_trabajo,
    (SELECT COUNT(*) FROM clients WHERE qualifies_law_114_1 = true) as empresas_ley_114_1;