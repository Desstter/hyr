// =====================================================
// CONEXIÓN PostgreSQL - SISTEMA HYR CONSTRUCTORA & SOLDADURA
// Configuración segura sin credenciales hardcodeadas
// =====================================================

const { Pool } = require('pg');

// Configuración de base de datos usando variables de entorno
// SECURITY FIX: Credenciales removidas del código fuente
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'hyr_construction', 
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : '', // Fix: Ensure it's always a string
    port: parseInt(process.env.DB_PORT || '5432'),
    // Configuración adicional para producción
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    connectionTimeoutMillis: parseInt(process.env.DB_TIMEOUT || '5000'),
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
    max: parseInt(process.env.DB_MAX_CONNECTIONS || '20')
};

// Validación de configuración crítica
if (!dbConfig.password && process.env.NODE_ENV === 'production') {
    console.error('❌ ERROR: DB_PASSWORD no configurada en producción');
    process.exit(1);
}

const db = new Pool(dbConfig);

// Test de conexión
db.connect()
  .then(() => console.log('✅ Conectado a PostgreSQL'))
  .catch(err => console.error('❌ Error conectando a PostgreSQL:', err));

module.exports = { db };