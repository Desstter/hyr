// =====================================================
// CONEXIÓN PostgreSQL - SISTEMA HYR CONSTRUCTORA & SOLDADURA
// =====================================================

const { Pool } = require('pg');

// Conexión PostgreSQL hardcodeada
const db = new Pool({
    host: 'localhost',
    database: 'hyr_construction',
    user: 'postgres',
    password: 'LilHell76&0',
    port: 5432,
});

// Test de conexión
db.connect()
  .then(() => console.log('✅ Conectado a PostgreSQL'))
  .catch(err => console.error('❌ Error conectando a PostgreSQL:', err));

module.exports = { db };