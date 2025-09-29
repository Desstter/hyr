const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'hyr_construction',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  port: process.env.DB_PORT || 5432,
});

async function checkProjectIncomes() {
  const client = await pool.connect();
  try {
    console.log('🔍 Verificando datos en project_incomes...');

    const result = await client.query('SELECT * FROM project_incomes ORDER BY date DESC');

    console.log(`📊 Total registros: ${result.rows.length}`);

    result.rows.forEach((row, index) => {
      console.log(`${index + 1}. ID: ${row.id}`);
      console.log(`   Proyecto: ${row.project_id || 'N/A'}`);
      console.log(`   Fecha: ${row.date}`);
      console.log(`   Monto: ${row.amount}`);
      console.log(`   Descripción: ${row.description || 'N/A'}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error verificando project_incomes:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

checkProjectIncomes();