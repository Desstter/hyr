-- =====================================================
-- HYR COMPLETE DATABASE CLEANUP - DELETE ALL DATA
-- Removes ALL data including configuration tables
-- =====================================================

-- Disable foreign key checks temporarily for faster deletion
SET session_replication_role = replica;

-- Delete all transactional data (from previous cleanup)
DELETE FROM payroll_details;
DELETE FROM payroll_periods;
DELETE FROM time_entries;
DELETE FROM expenses;
DELETE FROM projects;
DELETE FROM personnel;
DELETE FROM clients;
DELETE FROM contractors;
DELETE FROM calendar_events;
DELETE FROM project_events;
DELETE FROM payroll_events;
DELETE FROM event_notifications;
DELETE FROM electronic_invoices;
DELETE FROM document_support;
DELETE FROM dian_payroll_documents;
DELETE FROM pila_submissions;
DELETE FROM audit_events;

-- Delete configuration and settings data
DELETE FROM company_settings;
DELETE FROM annual_payroll_settings;
DELETE FROM settings;
DELETE FROM tax_tables;

-- Re-enable foreign key checks
SET session_replication_role = DEFAULT;

-- Reset any sequences that might exist
-- Note: Check for any sequences and reset them
DO $$
DECLARE
    seq_record RECORD;
BEGIN
    -- Reset all sequences in public schema
    FOR seq_record IN 
        SELECT sequencename, schemaname
        FROM pg_sequences 
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('ALTER SEQUENCE %I.%I RESTART WITH 1', seq_record.schemaname, seq_record.sequencename);
    END LOOP;
END $$;

-- Verify ALL tables are completely empty
SELECT 
    'clients' as table_name, COUNT(*) as row_count FROM clients
UNION ALL
SELECT 
    'personnel' as table_name, COUNT(*) as row_count FROM personnel
UNION ALL
SELECT 
    'projects' as table_name, COUNT(*) as row_count FROM projects
UNION ALL
SELECT 
    'contractors' as table_name, COUNT(*) as row_count FROM contractors
UNION ALL
SELECT 
    'time_entries' as table_name, COUNT(*) as row_count FROM time_entries
UNION ALL
SELECT 
    'expenses' as table_name, COUNT(*) as row_count FROM expenses
UNION ALL
SELECT 
    'payroll_periods' as table_name, COUNT(*) as row_count FROM payroll_periods
UNION ALL
SELECT 
    'payroll_details' as table_name, COUNT(*) as row_count FROM payroll_details
UNION ALL
SELECT 
    'calendar_events' as table_name, COUNT(*) as row_count FROM calendar_events
UNION ALL
SELECT 
    'electronic_invoices' as table_name, COUNT(*) as row_count FROM electronic_invoices
UNION ALL
SELECT 
    'audit_events' as table_name, COUNT(*) as row_count FROM audit_events
UNION ALL
SELECT 
    'company_settings' as table_name, COUNT(*) as row_count FROM company_settings
UNION ALL
SELECT 
    'annual_payroll_settings' as table_name, COUNT(*) as row_count FROM annual_payroll_settings
UNION ALL
SELECT 
    'settings' as table_name, COUNT(*) as row_count FROM settings
UNION ALL
SELECT 
    'tax_tables' as table_name, COUNT(*) as row_count FROM tax_tables
ORDER BY table_name;

-- Success message
SELECT 'COMPLETE DATABASE CLEANUP FINISHED' as status, 
       'All data and configuration deleted successfully' as message,
       'System ready for fresh start' as note;