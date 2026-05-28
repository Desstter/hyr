// =====================================================
// SETUP DE BASE DE DATOS - HYR CONSTRUCTORA & SOLDADURA
// =====================================================
// Reconstruye la base de datos desde la fuente de verdad única:
//   database/schema.sql   -> estructura completa (hace DROP SCHEMA public CASCADE)
//   database/seeds.sql    -> datos de demostración (opcional, con --seed)
//
// Uso:
//   node setup-db.js              # solo esquema (recomendado para producción)
//   node setup-db.js --seed       # esquema + datos de demostración
//   npm run setup                 # equivale a `node setup-db.js`
//
// Conexión: usa las variables de entorno de .env (DB_HOST, DB_NAME, DB_USER,
// DB_PASSWORD, DB_PORT). El usuario debe poder hacer DROP/CREATE en el schema
// public de la base indicada.
//
// ⚠️  DESTRUCTIVO: schema.sql elimina y recrea TODO el schema public.
//     No lo ejecutes contra una base con datos reales sin un backup previo.
// =====================================================

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const WITH_SEED = process.argv.includes('--seed');

const config = {
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'hyr_construction',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : '',
    port: parseInt(process.env.DB_PORT || '5432'),
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
};

function readSql(file) {
    return fs.readFileSync(path.join(__dirname, 'database', file), 'utf8');
}

async function run() {
    const client = new Client(config);
    console.log('🔧 Setup de base de datos HYR');
    console.log(`   Destino: ${config.user}@${config.host}:${config.port}/${config.database}`);
    console.log(`   Modo:    ${WITH_SEED ? 'esquema + seeds (demo)' : 'solo esquema'}`);

    await client.connect();
    try {
        console.log('📐 Aplicando schema.sql (reset + estructura)...');
        await client.query(readSql('schema.sql'));
        console.log('✅ Esquema creado.');

        if (WITH_SEED) {
            console.log('🌱 Aplicando seeds.sql (datos de demostración)...');
            await client.query(readSql('seeds.sql'));
            console.log('✅ Seeds cargados.');
        }

        // Resumen de verificación: confirma que las tablas críticas existen.
        const { rows } = await client.query(`
            SELECT table_name FROM information_schema.tables
            WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
            ORDER BY table_name
        `);
        const tables = rows.map(r => r.table_name);
        const required = ['personnel', 'projects', 'clients', 'time_entries',
                          'payroll_periods', 'payroll_details', 'project_assignments'];
        const missing = required.filter(t => !tables.includes(t));
        if (missing.length) {
            throw new Error(`Faltan tablas críticas tras el setup: ${missing.join(', ')}`);
        }
        console.log(`✅ ${tables.length} tablas creadas. Tablas críticas presentes.`);
        console.log('🎉 Setup completado sin errores.');
    } finally {
        await client.end();
    }
}

run().catch(err => {
    console.error('❌ Error en el setup:', err.message);
    process.exit(1);
});
