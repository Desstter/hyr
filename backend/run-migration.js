/**
 * HYR CONSTRUCTORA & SOLDADURA - TIME ENTRIES DATABASE MIGRATION SCRIPT
 * Makes project_id nullable and adds lunch_deducted control
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
    password: process.env.DB_PASSWORD || 'password'
});

async function runMigration() {
    const client = await pool.connect();

    try {
        console.log('🚀 Starting time_entries nullable project_id migration...');

        // 1. Run the time entries migration
        console.log('📝 Making project_id nullable and adding lunch_deducted...');

        // Read and execute the migration SQL file
        const migrationPath = path.join(__dirname, 'database', 'migration-time-entries-nullable-project.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

        await client.query(migrationSQL);
        
        console.log('✅ Time entries migration applied successfully');

        // 2. Verify migration results
        console.log('🔍 Verifying migration results...');

        // Check project_id nullable
        const projectIdCheck = await client.query(`
            SELECT is_nullable
            FROM information_schema.columns
            WHERE table_name = 'time_entries' AND column_name = 'project_id'
        `);
        console.log('✓ project_id nullable:', projectIdCheck.rows[0]?.is_nullable === 'YES');

        // Check lunch_deducted exists
        const lunchDeductedCheck = await client.query(`
            SELECT column_name, data_type, column_default
            FROM information_schema.columns
            WHERE table_name = 'time_entries' AND column_name = 'lunch_deducted'
        `);
        console.log('✓ lunch_deducted existe:', lunchDeductedCheck.rows.length > 0);
        if (lunchDeductedCheck.rows.length > 0) {
            console.log('✓ lunch_deducted default:', lunchDeductedCheck.rows[0]?.column_default);
        }

        // Check expected times in personnel
        const expectedTimesCheck = await client.query(`
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'personnel'
                AND column_name IN ('expected_arrival_time', 'expected_departure_time')
        `);
        console.log('✓ Campos de tiempo esperado agregados:', expectedTimesCheck.rows.length === 2);

        console.log('✅ New fields verified in database:');
        const allNewFields = await client.query(`
            SELECT
                column_name,
                data_type,
                is_nullable,
                column_default
            FROM information_schema.columns
            WHERE (table_name = 'time_entries' AND column_name IN ('lunch_deducted', 'arrival_time', 'departure_time'))
               OR (table_name = 'personnel' AND column_name IN ('expected_arrival_time', 'expected_departure_time'))
            ORDER BY table_name, ordinal_position;
        `);

        allNewFields.rows.forEach(row => {
            console.log(`   - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
        });
        
        // 3. Verify trigger installation
        console.log('🔍 Verifying trigger installation...');
        const triggerCheck = await client.query(`
            SELECT trigger_name, event_manipulation, event_object_table
            FROM information_schema.triggers 
            WHERE trigger_schema = 'public'
            AND trigger_name = 'trigger_update_time_entries_updated_at'
            ORDER BY trigger_name;
        `);
        
        console.log('📋 Time entries triggers:');
        triggerCheck.rows.forEach(row => {
            console.log(`   - ${row.trigger_name} on ${row.event_object_table} (${row.event_manipulation})`);
        });
        
        // 4. Check if time_entries table exists and is accessible
        console.log('🧪 Testing time_entries table accessibility...');
        const tableCheck = await client.query(`
            SELECT COUNT(*) as record_count
            FROM time_entries;
        `);
        
        console.log(`   - Time entries table accessible: ${tableCheck.rows[0].record_count} records found`);
        
        // 5. Display summary
        console.log('\n📈 Migration Summary:');
        
        const timeEntriesStats = await client.query(`
            SELECT 
                COUNT(*) as total_entries,
                COUNT(CASE WHEN status = 'draft' THEN 1 END) as draft_entries,
                COUNT(DISTINCT personnel_id) as unique_personnel,
                COUNT(DISTINCT project_id) as unique_projects
            FROM time_entries
        `);
        
        console.log(`   - Total time entries: ${timeEntriesStats.rows[0].total_entries}`);
        console.log(`   - Draft entries: ${timeEntriesStats.rows[0].draft_entries}`);
        console.log(`   - Unique personnel: ${timeEntriesStats.rows[0].unique_personnel}`);
        console.log(`   - Unique projects: ${timeEntriesStats.rows[0].unique_projects}`);
        
        console.log('\n🎉 Time entries migration completed successfully!');
        
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        console.error('Stack trace:', error.stack);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

// Run migration if called directly
if (require.main === module) {
    runMigration().catch(error => {
        console.error('❌ Unhandled migration error:', error);
        process.exit(1);
    });
}

module.exports = { runMigration };