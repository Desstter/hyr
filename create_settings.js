const { Client } = require('pg');
const fs = require('fs');

const client = new Client({
  host: 'localhost',
  port: 5432,
  database: 'hyr_construction',
  user: 'postgres',
  password: 'LilHell76&0'
});

async function createSettingsTable() {
  try {
    await client.connect();
    console.log('✅ Conectado a PostgreSQL');
    
    const sql = fs.readFileSync('create_settings_table.sql', 'utf8');
    await client.query(sql);
    console.log('✅ Tabla settings creada exitosamente');
    
    const result = await client.query('SELECT COUNT(*) as count FROM settings');
    console.log(`✅ Configuraciones iniciales: ${result.rows[0].count} registros`);
    
    // Mostrar las configuraciones creadas
    const settings = await client.query('SELECT key, category, description FROM settings ORDER BY category, key');
    console.log('\n📋 Configuraciones disponibles:');
    settings.rows.forEach(row => {
      console.log(`  - ${row.key} (${row.category}): ${row.description}`);
    });
    
    await client.end();
    console.log('\n🎉 Sistema de configuraciones listo!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

createSettingsTable();