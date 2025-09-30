-- =====================================================
-- CALENDARIO Y EVENTOS - HYR CONSTRUCTORA & SOLDADURA
-- Schema para gestión de eventos, recordatorios y notificaciones
-- =====================================================

-- Tabla principal de eventos del calendario
CREATE TABLE calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Fecha y hora
    event_date DATE NOT NULL,
    event_time TIME,
    
    -- Tipo y categoría
    type VARCHAR(50) NOT NULL CHECK (type IN ('payroll', 'project', 'reminder', 'payment')),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'overdue', 'cancelled')),
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    
    -- Información financiera
    amount DECIMAL(15,2),
    category VARCHAR(50) CHECK (category IN ('tax', 'insurance', 'permit', 'equipment', 'other')),
    
    -- Recurrencia
    recurrence VARCHAR(20) DEFAULT 'none' CHECK (recurrence IN ('none', 'monthly', 'quarterly', 'yearly')),
    parent_event_id UUID REFERENCES calendar_events(id),
    
    -- Referencias a otras tablas
    project_id UUID REFERENCES projects(id),
    personnel_id UUID REFERENCES personnel(id),
    payroll_period_id UUID REFERENCES payroll_periods(id),
    
    -- Notificaciones
    notify_days_before INTEGER DEFAULT 1,
    notification_sent BOOLEAN DEFAULT false,
    
    -- Completado
    is_completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMP,
    completed_by VARCHAR(255),
    
    -- Metadatos
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla para eventos de nómina específicos
CREATE TABLE payroll_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    year INTEGER NOT NULL,
    month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
    period_type VARCHAR(20) DEFAULT 'monthly' CHECK (period_type IN ('monthly', 'biweekly')),
    
    -- Fechas importantes del proceso de nómina
    cutoff_date DATE NOT NULL,
    process_date DATE NOT NULL,
    payment_date DATE NOT NULL,
    
    -- Estado del proceso
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'processed', 'paid')),
    
    -- Información adicional
    total_employees INTEGER DEFAULT 0,
    total_amount DECIMAL(15,2),
    notes TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constrains
    UNIQUE(year, month, period_type)
);

-- Tabla para eventos específicos de proyecto
CREATE TABLE project_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    event_date DATE NOT NULL,
    type VARCHAR(50) CHECK (type IN ('start', 'milestone', 'deadline', 'completion')),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'overdue', 'cancelled')),
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    
    -- Progreso y notas
    progress_percentage INTEGER CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    notes TEXT,
    
    -- Referencia al evento del calendario
    calendar_event_id UUID REFERENCES calendar_events(id),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla para notificaciones automáticas
CREATE TABLE event_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES calendar_events(id) NOT NULL,
    
    -- Configuración de la notificación
    notification_type VARCHAR(50) NOT NULL CHECK (notification_type IN ('email', 'sms', 'push', 'system')),
    recipient VARCHAR(255) NOT NULL,
    subject VARCHAR(255),
    message TEXT,
    
    -- Estado de la notificación
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
    scheduled_for TIMESTAMP NOT NULL,
    sent_at TIMESTAMP,
    failed_reason TEXT,
    
    -- Intentos de reenvío
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- TRIGGERS AUTOMÁTICOS
-- =====================================================

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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

-- Trigger para crear eventos de calendario automáticamente cuando se crea un período de nómina
CREATE OR REPLACE FUNCTION create_payroll_calendar_events()
RETURNS TRIGGER AS $$
BEGIN
    -- Crear evento para fecha de procesamiento
    INSERT INTO calendar_events (
        title,
        description,
        event_date,
        type,
        priority,
        payroll_period_id,
        notify_days_before
    ) VALUES (
        'Procesar Nómina ' || NEW.month || '/' || NEW.year,
        'Procesamiento de nómina mensual para ' || NEW.month || '/' || NEW.year,
        NEW.process_date,
        'payroll',
        'high',
        NEW.id,
        2
    );
    
    -- Crear evento para fecha de pago
    INSERT INTO calendar_events (
        title,
        description,
        event_date,
        type,
        priority,
        payroll_period_id,
        notify_days_before
    ) VALUES (
        'Pago de Nómina ' || NEW.month || '/' || NEW.year,
        'Pago de nómina mensual para ' || NEW.month || '/' || NEW.year,
        NEW.payment_date,
        'payment',
        'high',
        NEW.id,
        1
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_payroll_calendar_events
    AFTER INSERT ON payroll_events
    FOR EACH ROW
    EXECUTE FUNCTION create_payroll_calendar_events();

-- Trigger para crear eventos de proyecto automáticamente
CREATE OR REPLACE FUNCTION create_project_calendar_events()
RETURNS TRIGGER AS $$
BEGIN
    -- Crear evento de inicio si hay fecha de inicio
    IF NEW.start_date IS NOT NULL THEN
        INSERT INTO calendar_events (
            title,
            description,
            event_date,
            type,
            priority,
            project_id
        ) VALUES (
            'Inicio: ' || NEW.name,
            'Inicio del proyecto: ' || COALESCE(NEW.description, ''),
            NEW.start_date,
            'project',
            'medium',
            NEW.id
        );
    END IF;
    
    -- Crear evento de fecha estimada de finalización
    IF NEW.estimated_end_date IS NOT NULL THEN
        INSERT INTO calendar_events (
            title,
            description,
            event_date,
            type,
            priority,
            project_id,
            notify_days_before
        ) VALUES (
            'Fecha Límite: ' || NEW.name,
            'Fecha estimada de finalización del proyecto: ' || COALESCE(NEW.description, ''),
            NEW.estimated_end_date,
            'project',
            'high',
            NEW.id,
            7
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_project_calendar_events
    AFTER INSERT ON projects
    FOR EACH ROW
    EXECUTE FUNCTION create_project_calendar_events();

-- Trigger para marcar eventos como vencidos
CREATE OR REPLACE FUNCTION mark_overdue_events()
RETURNS TRIGGER AS $$
BEGIN
    -- Marcar eventos como vencidos si la fecha ya pasó y no están completados
    UPDATE calendar_events 
    SET status = 'overdue'
    WHERE event_date < CURRENT_DATE 
    AND status = 'pending' 
    AND is_completed = false;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Crear un job que se ejecute diariamente para marcar eventos vencidos
-- (Esto requeriría configuración adicional con pg_cron o similar)

-- =====================================================
-- FUNCIONES DE UTILIDAD
-- =====================================================

-- Función para obtener resumen del calendario
CREATE OR REPLACE FUNCTION get_calendar_summary()
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'events_today', (
            SELECT COUNT(*) FROM calendar_events 
            WHERE event_date = CURRENT_DATE 
            AND status = 'pending'
        ),
        'events_this_week', (
            SELECT COUNT(*) FROM calendar_events 
            WHERE event_date BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '7 days')
            AND status = 'pending'
        ),
        'events_this_month', (
            SELECT COUNT(*) FROM calendar_events 
            WHERE event_date BETWEEN DATE_TRUNC('month', CURRENT_DATE) 
            AND (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')
            AND status = 'pending'
        ),
        'overdue_events', (
            SELECT COUNT(*) FROM calendar_events 
            WHERE status = 'overdue'
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Función para obtener próximos eventos de nómina
CREATE OR REPLACE FUNCTION get_upcoming_payroll_events(days_ahead INTEGER DEFAULT 30)
RETURNS TABLE(
    id UUID,
    title VARCHAR(255),
    event_date DATE,
    year INTEGER,
    month INTEGER,
    status VARCHAR(50),
    days_until INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ce.id,
        ce.title,
        ce.event_date,
        pe.year,
        pe.month,
        pe.status,
        (ce.event_date - CURRENT_DATE)::INTEGER as days_until
    FROM calendar_events ce
    JOIN payroll_events pe ON ce.payroll_period_id = pe.id
    WHERE ce.event_date BETWEEN CURRENT_DATE AND (CURRENT_DATE + days_ahead)
    AND ce.status = 'pending'
    AND ce.type = 'payroll'
    ORDER BY ce.event_date ASC;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- CREAR ÍNDICES PARA OPTIMIZACIÓN
-- =====================================================

-- Índices para calendar_events
CREATE INDEX idx_calendar_events_date ON calendar_events(event_date);
CREATE INDEX idx_calendar_events_type ON calendar_events(type);
CREATE INDEX idx_calendar_events_status ON calendar_events(status);
CREATE INDEX idx_calendar_events_project ON calendar_events(project_id);
CREATE INDEX idx_calendar_events_personnel ON calendar_events(personnel_id);

-- Índices para payroll_events
CREATE INDEX idx_payroll_events_year_month ON payroll_events(year, month);
CREATE INDEX idx_payroll_events_status ON payroll_events(status);

-- Índices para project_events
CREATE INDEX idx_project_events_project ON project_events(project_id);
CREATE INDEX idx_project_events_date ON project_events(event_date);
CREATE INDEX idx_project_events_type ON project_events(type);

-- Índices para event_notifications
CREATE INDEX idx_event_notifications_event ON event_notifications(event_id);
CREATE INDEX idx_event_notifications_status ON event_notifications(status);
CREATE INDEX idx_event_notifications_scheduled ON event_notifications(scheduled_for);