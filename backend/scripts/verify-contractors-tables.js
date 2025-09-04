// =====================================================
// VERIFICACIÓN Y CREACIÓN DE TABLAS CONTRATISTAS
// HYR CONSTRUCTORA & SOLDADURA
// =====================================================

const { db } = require('../database/connection');

const createContractorsTable = `
CREATE TABLE IF NOT EXISTS contractors (
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
`;

const createDocumentSupportTable = `
CREATE TABLE IF NOT EXISTS document_support (
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
`;

const insertSampleContractors = `
INSERT INTO contractors (name, document_type, document_number, email, phone, obligated_to_invoice)
VALUES 
    ('CONSTRUCCIONES DEL VALLE SAS', 'NIT', '900456789', 'contacto@construccionesvalle.com', '+57 2 555 0123', true),
    ('Pedro José Martínez', 'CC', '79123456', 'pedro.martinez@email.com', '+57 310 555 0123', false),
    ('Ana Sofía Herrera', 'CC', '52987654', 'ana.herrera@email.com', '+57 315 555 0456', false)
ON CONFLICT (document_number) DO NOTHING;
`;

async function verifyAndCreateTables() {
    try {
        console.log('🔍 Verificando existencia de tablas...');
        
        // Check if contractors table exists
        const contractorsExists = await db.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'contractors'
            );
        `);
        
        if (!contractorsExists.rows[0].exists) {
            console.log('❌ Tabla contractors no existe. Creando...');
            await db.query(createContractorsTable);
            console.log('✅ Tabla contractors creada exitosamente');
        } else {
            console.log('✅ Tabla contractors ya existe');
        }
        
        // Check if document_support table exists
        const documentSupportExists = await db.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'document_support'
            );
        `);
        
        if (!documentSupportExists.rows[0].exists) {
            console.log('❌ Tabla document_support no existe. Creando...');
            await db.query(createDocumentSupportTable);
            console.log('✅ Tabla document_support creada exitosamente');
        } else {
            console.log('✅ Tabla document_support ya existe');
        }
        
        // Insert sample data
        console.log('📝 Insertando datos de ejemplo...');
        await db.query(insertSampleContractors);
        console.log('✅ Datos de ejemplo insertados (sin duplicados)');
        
        // Verify data
        const count = await db.query('SELECT COUNT(*) FROM contractors');
        console.log(`📊 Total de contratistas en la base de datos: ${count.rows[0].count}`);
        
        console.log('🎉 Verificación completada exitosamente');
        
    } catch (error) {
        console.error('❌ Error durante la verificación:', error);
        process.exit(1);
    } finally {
        process.exit(0);
    }
}

// Run the verification
verifyAndCreateTables();