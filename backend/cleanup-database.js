const fs = require('fs');
const { Pool } = require('pg');

// Leer el archivo SQL
const sqlScript = fs.readFileSync('database/cleanup-all-data.sql', 'utf8');

// Configuración de conexión a la base de datos
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'hyr_construction',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  port: process.env.DB_PORT || 5432,
});

async function cleanupDatabase() {
  const client = await pool.connect();
  try {
    console.log('🧹 Iniciando limpieza de base de datos...');

    // Ejecutar el script SQL
    const result = await client.query(sqlScript);
    console.log('✅ Script ejecutado exitosamente');

    // El último query del script es el de verificación
    if (result.rows && result.rows.length > 0) {
      console.log('📊 Verificación de limpieza:');
      result.rows.forEach(row => {
        console.log(`   - ${row.table_name}: ${row.row_count} registros`);
      });
    }

  } catch (error) {
    console.error('❌ Error durante la limpieza:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

cleanupDatabase();