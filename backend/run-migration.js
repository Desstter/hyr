// =====================================================
// DATABASE MIGRATION RUNNER
// HYR CONSTRUCTORA & SOLDADURA S.A.S.
// =====================================================

const fs = require('fs');
const path = require('path');
const { db } = require('./database/connection');

async function runMigration() {
    console.log('🚀 Iniciando migración de base de datos para Compliance MVP...');
    
    try {
        // Leer archivo de migración
        const migrationPath = path.join(__dirname, 'database/migrations/2025_09_mvp.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        
        console.log('📄 Archivo de migración cargado:', migrationPath);
        
        // Ejecutar migración
        console.log('⚡ Ejecutando migración SQL...');
        await db.query(migrationSQL);
        
        console.log('✅ Migración ejecutada exitosamente!');
        
        // Verificar tablas creadas
        const tablesResult = await db.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN (
                'company_settings',
                'tax_tables',
                'electronic_invoices',
                'dian_payroll_documents',
                'pila_submissions',
                'contractors',
                'document_support',
                'audit_events'
            )
            ORDER BY table_name
        `);
        
        console.log('\\n📊 Tablas de compliance creadas:');
        tablesResult.rows.forEach(row => {
            console.log(`  ✅ ${row.table_name}`);
        });
        
        console.log(`\\n🎉 Migración completada. ${tablesResult.rows.length}/8 tablas creadas.`);
        
        if (tablesResult.rows.length === 8) {
            console.log('💚 ¡Sistema de cumplimiento listo para usar!');
        } else {
            console.log('⚠️  Algunas tablas podrían no haberse creado correctamente.');
        }
        
    } catch (error) {
        console.error('❌ Error ejecutando migración:', error.message);
        console.error('Stack trace:', error.stack);
    }
    
    process.exit(0);
}

// Ejecutar migración
runMigration();