/**
 * HYR CONSTRUCTORA & SOLDADURA - TIME ENTRIES DATABASE MIGRATION SCRIPT
 * Adds missing fields to time_entries table for workflow management
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
        console.log('🚀 Starting time_entries table migration...');
        
        // 1. Run the time entries migration
        console.log('📝 Adding missing fields to time_entries table...');
        
        // Read and execute the migration SQL file
        const migrationPath = path.join(__dirname, 'database', 'migrations', '2025_09_10_fix_time_entries_missing_fields.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        
        await client.query(migrationSQL);
        
        console.log('✅ Time entries migration applied successfully');
        
        // 2. Verify migration results
        console.log('🔍 Verifying migration results...');
        const verificationResult = await client.query(`
            SELECT 
                column_name,
                data_type,
                is_nullable,
                column_default
            FROM information_schema.columns 
            WHERE table_name = 'time_entries' 
                AND column_name IN ('status', 'payroll_period_id', 'approver_notes', 'updated_at')
            ORDER BY ordinal_position;
        `);
        
        console.log('✅ New fields added to time_entries:');
        verificationResult.rows.forEach(row => {
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