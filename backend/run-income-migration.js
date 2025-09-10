/**
 * HYR CONSTRUCTORA & SOLDADURA - INCOME TRACKING MIGRATION
 * Creates income tracking tables and functionality
 */

// Load environment variables first
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Database connection
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'hyr_construction',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || ''
});

async function runIncomeMigration() {
    const client = await pool.connect();
    
    try {
        console.log('🚀 Starting HYR income tracking migration...');
        
        // 1. Apply income tables and triggers
        console.log('📝 Creating income tables and triggers...');
        const incomeSQL = fs.readFileSync(
            path.join(__dirname, 'database', 'income-tables.sql'), 
            'utf8'
        );
        await client.query(incomeSQL);
        console.log('✅ Income tables and triggers created successfully');
        
        // 2. Backfill existing project income totals (if any income data exists)
        console.log('📊 Backfilling existing project income totals...');
        await client.query('SELECT backfill_project_total_income()');
        console.log('✅ Income backfill completed');
        
        // 3. Verify table creation and triggers
        console.log('🔍 Verifying income table installation...');
        
        // Check if project_incomes table exists
        const tableCheck = await client.query(`
            SELECT EXISTS (
                SELECT 1 FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'project_incomes'
            ) as table_exists;
        `);
        
        if (tableCheck.rows[0].table_exists) {
            console.log('✅ project_incomes table created successfully');
        } else {
            throw new Error('project_incomes table was not created');
        }
        
        // Check if income columns were added to projects table
        const columnCheck = await client.query(`
            SELECT 
                EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'projects' AND column_name = 'total_income'
                ) as total_income_exists,
                EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'projects' AND column_name = 'expected_income'
                ) as expected_income_exists;
        `);
        
        const { total_income_exists, expected_income_exists } = columnCheck.rows[0];
        
        if (total_income_exists && expected_income_exists) {
            console.log('✅ Income columns added to projects table successfully');
        } else {
            console.log('⚠️ Some income columns might not have been added to projects table');
        }
        
        // Check income triggers
        const triggerCheck = await client.query(`
            SELECT trigger_name, event_manipulation, event_object_table
            FROM information_schema.triggers 
            WHERE trigger_schema = 'public'
            AND trigger_name LIKE '%income%'
            ORDER BY trigger_name;
        `);
        
        console.log('📋 Income-related triggers:');
        if (triggerCheck.rows.length > 0) {
            triggerCheck.rows.forEach(row => {
                console.log(`   - ${row.trigger_name} on ${row.event_object_table} (${row.event_manipulation})`);
            });
        } else {
            console.log('   - No income triggers found');
        }
        
        // 4. Display migration summary
        console.log('\n📈 Income Migration Summary:');
        
        const projectStats = await client.query(`
            SELECT 
                COUNT(*) as total_projects,
                COUNT(CASE WHEN total_income > 0 THEN 1 END) as projects_with_income,
                COALESCE(SUM(total_income), 0) as total_income_amount
            FROM projects
        `);
        
        const incomeStats = await client.query(`
            SELECT 
                COUNT(*) as total_income_records,
                COUNT(DISTINCT project_id) as projects_with_income_records,
                COALESCE(SUM(amount), 0) as total_income_amount
            FROM project_incomes
            WHERE project_id IS NOT NULL
        `);
        
        console.log(`   - Total projects: ${projectStats.rows[0].total_projects}`);
        console.log(`   - Projects with income: ${projectStats.rows[0].projects_with_income}`);
        console.log(`   - Total income amount: $${projectStats.rows[0].total_income_amount}`);
        console.log(`   - Total income records: ${incomeStats.rows[0].total_income_records}`);
        
        // 5. Test income functionality with a sample entry (if no existing data)
        if (incomeStats.rows[0].total_income_records === 0) {
            console.log('\n🧪 Testing income functionality...');
            
            // Get a test project
            const testProject = await client.query(`
                SELECT id, name FROM projects LIMIT 1
            `);
            
            if (testProject.rows.length > 0) {
                const projectId = testProject.rows[0].id;
                const projectName = testProject.rows[0].name;
                
                // Insert a test income entry
                await client.query(`
                    INSERT INTO project_incomes (project_id, amount, date, concept, notes)
                    VALUES ($1, 1000000, CURRENT_DATE, 'Prueba de ingreso', 'Ingreso de prueba para verificar funcionamiento del trigger')
                `, [projectId]);
                
                // Check if the project's total_income was updated
                const updatedProject = await client.query(`
                    SELECT total_income FROM projects WHERE id = $1
                `, [projectId]);
                
                console.log(`   - Test income added to project "${projectName}"`);
                console.log(`   - Project total_income updated to: $${updatedProject.rows[0].total_income}`);
                
                // Clean up test data
                await client.query(`
                    DELETE FROM project_incomes 
                    WHERE project_id = $1 AND concept = 'Prueba de ingreso'
                `, [projectId]);
                
                console.log('   - Test data cleaned up');
            }
        }
        
        console.log('\n🎉 Income migration completed successfully!');
        console.log('\n📝 Next steps:');
        console.log('   1. Create income API routes');
        console.log('   2. Build frontend income components');
        console.log('   3. Add income tracking to project pages');
        
    } catch (error) {
        console.error('❌ Income migration failed:', error.message);
        console.error('Stack trace:', error.stack);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

// Run migration if called directly
if (require.main === module) {
    runIncomeMigration().catch(error => {
        console.error('❌ Unhandled income migration error:', error);
        process.exit(1);
    });
}

module.exports = { runIncomeMigration };