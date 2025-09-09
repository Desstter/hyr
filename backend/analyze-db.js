const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'hyr_construction',
  password: 'LilHell76&0',
  port: 5432,
});

async function analyzeDatabase() {
  try {
    console.log('🔍 ANALYZING DATABASE FOR COMPLIANCE STATISTICS');
    console.log('============================================');
    
    // Get all tables
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log('📊 EXISTING TABLES:');
    console.log('==================');
    
    const tables = tablesResult.rows.map(r => r.table_name);
    for (const table of tables) {
      try {
        const countResult = await pool.query(`SELECT COUNT(*) as count FROM ${table}`);
        const count = countResult.rows[0].count;
        console.log(`  ${table.padEnd(25)}: ${count.toString().padStart(4)} rows`);
      } catch (_e) {
        console.log(`  ${table.padEnd(25)}: ERROR`);
      }
    }
    
    console.log('');
    console.log('🎯 COMPLIANCE-RELEVANT TABLES:');
    console.log('==============================');
    
    const complianceTables = {
      'electronic_invoices': 'Facturas electrónicas DIAN',
      'dian_payroll_documents': 'Documentos nómina electrónica', 
      'pila_submissions': 'Archivos PILA generados',
      'contractors': 'Contratistas registrados',
      'document_support': 'Documentos soporte',
      'personnel': 'Empleados activos',
      'payroll_periods': 'Períodos de nómina',
      'payroll_details': 'Detalles de nómina',
      'projects': 'Proyectos activos',
      'clients': 'Clientes registrados',
      'expenses': 'Gastos registrados',
      'time_entries': 'Registros de tiempo'
    };
    
    for (const [table, description] of Object.entries(complianceTables)) {
      if (tables.includes(table)) {
        try {
          const countResult = await pool.query(`SELECT COUNT(*) as count FROM ${table}`);
          const count = countResult.rows[0].count;
          console.log(`  ✅ ${table.padEnd(20)}: ${count.toString().padStart(3)} - ${description}`);
        } catch (_e) {
          console.log(`  ❌ ${table.padEnd(20)}: ERR - ${description}`);
        }
      } else {
        console.log(`  ⚪ ${table.padEnd(20)}: N/A - ${description} (table missing)`);
      }
    }
    
    console.log('');
    console.log('💡 RECOMMENDED COMPLIANCE API ENDPOINTS:');
    console.log('=======================================');
    console.log('  🔹 GET /api/compliance/dashboard-stats');
    console.log('  🔹 GET /api/compliance/invoices-summary');
    console.log('  🔹 GET /api/compliance/payroll-summary');
    console.log('  🔹 GET /api/compliance/pila-summary');
    console.log('  🔹 GET /api/compliance/contractors-summary');
    
  } catch (error) {
    console.error('❌ Error analyzing database:', error.message);
  } finally {
    await pool.end();
  }
}

analyzeDatabase();