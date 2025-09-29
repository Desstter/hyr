#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Configuración de la base de datos
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'hyr_construction',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    port: process.env.DB_PORT || 5432,
});

async function runMigration() {
    console.log('🚀 Iniciando migración de nueva lógica de nóminas...');

    try {
        // Leer el archivo de migración
        const migrationPath = path.join(__dirname, 'database', 'migration-nueva-logica-nominas.sql');

        if (!fs.existsSync(migrationPath)) {
            throw new Error(`Archivo de migración no encontrado: ${migrationPath}`);
        }

        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

        console.log('📝 Ejecutando migración de base de datos...');

        // Ejecutar la migración
        await pool.query(migrationSQL);

        console.log('✅ Migración ejecutada exitosamente');

        // Verificar que las columnas se crearon
        console.log('🔍 Verificando estructura de la tabla personnel...');

        const tableInfo = await pool.query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_name = 'personnel'
            AND column_name IN ('salary_base', 'daily_rate', 'expected_arrival_time', 'expected_departure_time')
            ORDER BY column_name;
        `);

        if (tableInfo.rows.length === 4) {
            console.log('✅ Todas las columnas nuevas fueron creadas:');
            tableInfo.rows.forEach(row => {
                console.log(`  - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
            });
        } else {
            console.log('⚠️  Solo se crearon', tableInfo.rows.length, 'de 4 columnas esperadas');
            tableInfo.rows.forEach(row => {
                console.log(`  - ${row.column_name}: ${row.data_type}`);
            });
        }

        // Verificar si hay datos existentes que necesiten migración
        console.log('🔍 Verificando datos existentes...');

        const existingData = await pool.query(`
            SELECT
                COUNT(*) as total,
                COUNT(CASE WHEN monthly_salary IS NOT NULL THEN 1 END) as with_monthly_salary,
                COUNT(CASE WHEN hourly_rate IS NOT NULL THEN 1 END) as with_hourly_rate,
                COUNT(CASE WHEN salary_base IS NOT NULL THEN 1 END) as with_salary_base,
                COUNT(CASE WHEN daily_rate IS NOT NULL THEN 1 END) as with_daily_rate
            FROM personnel;
        `);

        const data = existingData.rows[0];
        console.log(`📊 Empleados en BD: ${data.total} total`);
        console.log(`   - Con monthly_salary: ${data.with_monthly_salary}`);
        console.log(`   - Con hourly_rate: ${data.with_hourly_rate}`);
        console.log(`   - Con salary_base: ${data.with_salary_base}`);
        console.log(`   - Con daily_rate: ${data.with_daily_rate}`);

        if (parseInt(data.total) > 0 && parseInt(data.with_salary_base) === 0) {
            console.log('🔄 Migrando datos existentes...');

            // Migrar datos de campos antiguos a nuevos
            await pool.query(`
                UPDATE personnel SET
                    salary_base = COALESCE(monthly_salary, hourly_rate * 192),
                    daily_rate = COALESCE(monthly_salary / 24, hourly_rate * 8)
                WHERE salary_base IS NULL AND daily_rate IS NULL;
            `);

            // Verificar migración
            const migratedData = await pool.query(`
                SELECT
                    COUNT(CASE WHEN salary_base IS NOT NULL THEN 1 END) as migrated_salary_base,
                    COUNT(CASE WHEN daily_rate IS NOT NULL THEN 1 END) as migrated_daily_rate
                FROM personnel;
            `);

            const migrated = migratedData.rows[0];
            console.log(`✅ Datos migrados: ${migrated.migrated_salary_base} salary_base, ${migrated.migrated_daily_rate} daily_rate`);
        }

        console.log('🎉 Migración completada exitosamente');

    } catch (error) {
        console.error('❌ Error durante la migración:', error.message);
        console.error('Stack trace:', error.stack);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

// Ejecutar migración si el script se ejecuta directamente
if (require.main === module) {
    runMigration();
}

module.exports = runMigration;