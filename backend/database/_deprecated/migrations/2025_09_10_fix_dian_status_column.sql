-- =====================================================
-- MIGRATION: Fix DIAN Status Column Naming Consistency
-- Date: 2025-09-10
-- Description: Rename dian_validation_status to dian_status in electronic_invoices table
--              to maintain consistency with other tables (dian_payroll_documents, document_support)
-- =====================================================

-- Check if column exists before attempting migration
DO $$
BEGIN
    -- Check if the old column exists
    IF EXISTS (SELECT 1 
               FROM information_schema.columns 
               WHERE table_name = 'electronic_invoices' 
               AND column_name = 'dian_validation_status') THEN
        
        -- Rename the column
        ALTER TABLE electronic_invoices 
        RENAME COLUMN dian_validation_status TO dian_status;
        
        RAISE NOTICE 'Successfully renamed dian_validation_status to dian_status in electronic_invoices table';
    ELSE
        RAISE NOTICE 'Column dian_validation_status does not exist in electronic_invoices table, skipping migration';
    END IF;
END $$;

-- Update the index name if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 
               FROM pg_indexes 
               WHERE tablename = 'electronic_invoices' 
               AND indexname = 'idx_electronic_invoices_status') THEN
        
        -- Drop old index
        DROP INDEX idx_electronic_invoices_status;
        
        -- Recreate index with same name but new column
        CREATE INDEX idx_electronic_invoices_status ON electronic_invoices(dian_status);
        
        RAISE NOTICE 'Updated index idx_electronic_invoices_status to use dian_status column';
    END IF;
END $$;

-- Verify the migration
SELECT 
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'electronic_invoices' 
AND column_name = 'dian_status';