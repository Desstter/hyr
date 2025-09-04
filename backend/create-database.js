// =====================================================
// CREAR BASE DE DATOS AUTOMÁTICAMENTE
// =====================================================

const { Pool } = require('pg');

// Conexión al servidor PostgreSQL (sin especificar base de datos)
const adminDb = new Pool({
    host: 'localhost',
    user: 'postgres',
    password: 'LilHell76&0',
    port: 5432,
    database: 'postgres' // Usar la DB por defecto para crear otra
});

async function createDatabase() {
    try {
        console.log('🔄 Conectando a PostgreSQL...');
        
        // Verificar si la base de datos ya existe
        const checkDb = await adminDb.query(`
            SELECT 1 FROM pg_database WHERE datname = 'hyr_construction'
        `);
        
        if (checkDb.rows.length > 0) {
            console.log('✅ Base de datos hyr_construction ya existe');
        } else {
            console.log('📋 Creando base de datos hyr_construction...');
            await adminDb.query('CREATE DATABASE hyr_construction');
            console.log('✅ Base de datos hyr_construction creada exitosamente');
        }
        
        // Ahora crear las tablas
        console.log('📋 Creando esquema de tablas...');
        
        // Conectar a la nueva base de datos
        const hyrDb = new Pool({
            host: 'localhost',
            database: 'hyr_construction',
            user: 'postgres',
            password: 'LilHell76&0',
            port: 5432,
        });
        
        // Leer y ejecutar schema-fixed.sql
        const fs = require('fs');
        const path = require('path');
        
        const schemaPath = path.join(__dirname, 'database', 'schema-fixed.sql');
        const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
        
        await hyrDb.query(schemaSQL);
        console.log('✅ Esquema de tablas y triggers creados');
        
        console.log('\n🎉 ¡Base de datos lista!');
        console.log('📋 Próximo paso: node load-seeds.js');
        
        await hyrDb.end();
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        
        if (error.code === 'ECONNREFUSED') {
            console.error('💡 PostgreSQL no está ejecutándose. Inicia PostgreSQL primero.');
        } else if (error.message.includes('password authentication')) {
            console.error('💡 Contraseña incorrecta. Verifica la contraseña de PostgreSQL.');
        }
    } finally {
        await adminDb.end();
    }
}

createDatabase();