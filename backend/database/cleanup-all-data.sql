-- =====================================================
-- HYR DATABASE CLEANUP - DELETE ALL TEST DATA
-- Removes all data while preserving database structure
-- =====================================================

-- Disable foreign key checks temporarily for faster deletion
SET session_replication_role = replica;

-- Delete data in correct order to respect foreign key constraints
DELETE FROM payroll_details;
DELETE FROM payroll_periods;
DELETE FROM time_entries;
DELETE FROM expenses;
DELETE FROM project_incomes;
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

-- Re-enable foreign key checks
SET session_replication_role = DEFAULT;

-- Reset sequences to start from 1 (if any auto-increment columns exist)
-- Note: This database uses UUIDs, so no sequences to reset

-- Verify all tables are empty
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
    'project_incomes' as table_name, COUNT(*) as row_count FROM project_incomes
UNION ALL
SELECT
    'audit_events' as table_name, COUNT(*) as row_count FROM audit_events
ORDER BY table_name;

-- Success message
SELECT 'DATABASE CLEANUP COMPLETED' as status, 
       'All test data deleted successfully' as message,
       'Database structure preserved' as note;