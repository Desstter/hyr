// =====================================================
// SCRIPT PARA EJECUTAR MIGRACIÓN DE NIGHT_HOURS
// Agregar columnas night_hours y night_pay a time_entries
// =====================================================

// Cargar variables de entorno primero
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { db } = require('./database/connection');

async function runNightHoursMigration() {
    console.log('🚀 Iniciando migración night_hours...');

    try {
        // Leer el archivo SQL de migración
        const migrationPath = path.join(__dirname, 'database', 'add-night-hours-columns.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

        console.log('📖 Archivo de migración cargado');
        console.log('📊 Ejecutando migración...');

        // Ejecutar la migración
        const result = await db.query(migrationSQL);

        console.log('✅ Migración ejecutada exitosamente');

        // Verificar que las columnas fueron creadas
        const checkColumns = await db.query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_name = 'time_entries'
                AND table_schema = 'public'
                AND column_name IN ('night_hours', 'night_pay')
            ORDER BY column_name
        `);

        console.log('\n📋 Columnas verificadas:');
        checkColumns.rows.forEach(col => {
            console.log(`   ✓ ${col.column_name} (${col.data_type})`);
        });

        if (checkColumns.rows.length === 2) {
            console.log('\n🎉 Migración completada exitosamente!');
            console.log('✅ El error "no existe la columna «night_hours»" ha sido solucionado');
        } else {
            console.log('\n⚠️  Advertencia: No se encontraron todas las columnas esperadas');
        }

    } catch (error) {
        console.error('❌ Error durante la migración:', error.message);
        console.error('📄 Detalles:', error);
        process.exit(1);
    } finally {
        await db.end();
        console.log('🔌 Conexión de base de datos cerrada');
    }
}

// Ejecutar migración
runNightHoursMigration();