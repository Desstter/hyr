// =====================================================
// CONEXIÓN PostgreSQL - SISTEMA HYR CONSTRUCTORA & SOLDADURA
// Configuración segura sin credenciales hardcodeadas
// Con detección automática de IP de red
// =====================================================

const { Pool } = require('pg');
const { detectNetworkIP } = require('../utils/network-detection');

// Detectar automáticamente la IP de red para compartir base de datos
const autoDetectedHost = detectNetworkIP();

// Configuración de base de datos usando variables de entorno
// SECURITY FIX: Credenciales removidas del código fuente
// NETWORK FIX: Detección automática de IP para compartir en red
const dbConfig = {
    host: process.env.DB_HOST || autoDetectedHost,
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

// Logging de configuración de red
console.log(`🔧 Configuración de base de datos:`);
console.log(`   Host: ${dbConfig.host} ${process.env.DB_HOST ? '(manual)' : '(auto-detectado)'}`);
console.log(`   Database: ${dbConfig.database}`);
console.log(`   Port: ${dbConfig.port}`);

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