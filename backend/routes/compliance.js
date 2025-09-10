// =====================================================
// COMPLIANCE DASHBOARD - API ENDPOINTS
// Real-time statistics from database for compliance dashboard
// =====================================================

const express = require('express');
const router = express.Router();
const { db } = require('../database/connection');
const { auditLogger } = require('../middleware/audit-logger');

// =====================================================
// DASHBOARD STATISTICS ENDPOINT
// =====================================================

/**
 * GET /api/compliance/dashboard-stats
 * Returns comprehensive compliance statistics from database
 */
router.get('/dashboard-stats', auditLogger('READ', 'compliance_dashboard'), async (req, res) => {
    try {
        console.log('🔍 Loading compliance dashboard statistics from database...');

        // Parallel queries for better performance
        const [
            invoicesStats,
            payrollStats, 
            pilaStats,
            contractorsStats,
            personnelStats,
            projectsStats
        ] = await Promise.all([
            getInvoicesStatistics(),
            getPayrollStatistics(),
            getPilaStatistics(),
            getContractorsStatistics(),
            getPersonnelStatistics(),
            getProjectsStatistics()
        ]);

        const dashboardStats = {
            invoices: invoicesStats,
            payroll: payrollStats,
            pila: pilaStats,
            contractors: contractorsStats,
            summary: {
                total_employees: personnelStats.total,
                active_projects: projectsStats.active,
                last_updated: new Date().toISOString()
            }
        };

        console.log('✅ Compliance dashboard stats loaded successfully');
        res.json({
            success: true,
            data: dashboardStats
        });

    } catch (error) {
        console.error('❌ Error loading compliance dashboard stats:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            details: error.message
        });
    }
});

// =====================================================
// STATISTICS HELPER FUNCTIONS
// =====================================================

/**
 * Get electronic invoices statistics
 */
async function getInvoicesStatistics() {
    try {
        // First, detect which column name is used in the table
        const columnCheck = await db.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'electronic_invoices' 
            AND column_name IN ('dian_status', 'dian_validation_status')
        `);
        
        const statusColumn = columnCheck.rows.find(row => 
            row.column_name === 'dian_status' || row.column_name === 'dian_validation_status'
        )?.column_name || 'dian_validation_status'; // fallback to original name
        
        const [totalResult, todayResult, statusResult] = await Promise.all([
            // Total invoices count
            db.query('SELECT COUNT(*) as total FROM electronic_invoices'),
            
            // Today's invoices count
            db.query(`
                SELECT COUNT(*) as today 
                FROM electronic_invoices 
                WHERE DATE(created_at) = CURRENT_DATE
            `),
            
            // Status distribution - using detected column name
            db.query(`
                SELECT 
                    ${statusColumn} as status,
                    COUNT(*) as count
                FROM electronic_invoices 
                GROUP BY ${statusColumn}
            `)
        ]);

        const total = parseInt(totalResult.rows[0].total);
        const today = parseInt(todayResult.rows[0].today);
        
        // Calculate acceptance percentage
        const statusCounts = statusResult.rows.reduce((acc, row) => {
            acc[row.status || 'PENDIENTE'] = parseInt(row.count);
            return acc;
        }, {});

        const accepted = statusCounts['ACEPTADO'] || 0;
        const acceptedSimulated = statusCounts['ACEPTADO_SIMULADO'] || 0;
        const totalAccepted = accepted + acceptedSimulated;
        const acceptedPercentage = total > 0 ? ((totalAccepted / total) * 100).toFixed(1) : 0;

        return {
            total,
            today,
            accepted_percentage: parseFloat(acceptedPercentage),
            status_breakdown: statusCounts
        };

    } catch (error) {
        console.error('Error getting invoices statistics:', error);
        return { total: 0, today: 0, accepted_percentage: 0, status_breakdown: {} };
    }
}

/**
 * Get payroll statistics
 */
async function getPayrollStatistics() {
    try {
        const [employeesResult, latestPeriodResult] = await Promise.all([
            // Active employees count
            db.query(`
                SELECT COUNT(*) as total 
                FROM personnel 
                WHERE status = 'active'
            `),
            
            // Latest payroll period
            db.query(`
                SELECT 
                    year,
                    month,
                    status,
                    processed_at
                FROM payroll_periods 
                ORDER BY year DESC, month DESC 
                LIMIT 1
            `)
        ]);

        const totalEmployees = parseInt(employeesResult.rows[0].total);
        const latestPeriod = latestPeriodResult.rows[0];

        const currentPeriod = latestPeriod ? 
            `${latestPeriod.year}-${latestPeriod.month.toString().padStart(2, '0')}` :
            new Date().toISOString().substring(0, 7);

        const lastGenerated = latestPeriod?.processed_at ?
            new Date(latestPeriod.processed_at).toISOString().substring(0, 10) :
            '';

        return {
            current_period: currentPeriod,
            total_employees: totalEmployees,
            last_generated: lastGenerated,
            status: latestPeriod?.status || 'SIN_DATOS'
        };

    } catch (error) {
        console.error('Error getting payroll statistics:', error);
        return { 
            current_period: new Date().toISOString().substring(0, 7), 
            total_employees: 0, 
            last_generated: '',
            status: 'SIN_DATOS'
        };
    }
}

/**
 * Get PILA statistics
 */
async function getPilaStatistics() {
    try {
        const [latestResult, totalResult] = await Promise.all([
            // Latest PILA submission
            db.query(`
                SELECT 
                    period,
                    status,
                    total_contributions,
                    created_at
                FROM pila_submissions 
                ORDER BY period DESC 
                LIMIT 1
            `),
            
            // Total contributions this year
            db.query(`
                SELECT 
                    COALESCE(SUM(total_contributions), 0) as year_total
                FROM pila_submissions 
                WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE)
            `)
        ]);

        const latest = latestResult.rows[0];
        const yearTotal = parseInt(totalResult.rows[0].year_total);

        return {
            last_period: latest?.period || '',
            status: latest?.status || 'SIN_DATOS',
            total_contributions: latest?.total_contributions || 0,
            year_total: yearTotal
        };

    } catch (error) {
        console.error('Error getting PILA statistics:', error);
        return { 
            last_period: '', 
            status: 'SIN_DATOS', 
            total_contributions: 0,
            year_total: 0 
        };
    }
}

/**
 * Get contractors statistics
 */
async function getContractorsStatistics() {
    try {
        const [totalResult, documentsResult, obligatedResult] = await Promise.all([
            // Total contractors
            db.query('SELECT COUNT(*) as total FROM contractors'),
            
            // Document support count
            db.query('SELECT COUNT(*) as total FROM document_support'),
            
            // Obligated vs non-obligated contractors
            db.query(`
                SELECT 
                    obligated_to_invoice,
                    COUNT(*) as count
                FROM contractors 
                GROUP BY obligated_to_invoice
            `)
        ]);

        const total = parseInt(totalResult.rows[0].total);
        const documentSupportCount = parseInt(documentsResult.rows[0].total);
        
        const obligatedBreakdown = obligatedResult.rows.reduce((acc, row) => {
            acc[row.obligated_to_invoice ? 'obligated' : 'not_obligated'] = parseInt(row.count);
            return acc;
        }, { obligated: 0, not_obligated: 0 });

        return {
            total,
            document_support_count: documentSupportCount,
            obligated: obligatedBreakdown.obligated,
            not_obligated: obligatedBreakdown.not_obligated
        };

    } catch (error) {
        console.error('Error getting contractors statistics:', error);
        return { 
            total: 0, 
            document_support_count: 0,
            obligated: 0,
            not_obligated: 0 
        };
    }
}

/**
 * Get personnel statistics
 */
async function getPersonnelStatistics() {
    try {
        const result = await db.query(`
            SELECT 
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE status = 'active') as active,
                COUNT(*) FILTER (WHERE status = 'inactive') as inactive
            FROM personnel
        `);

        const stats = result.rows[0];
        return {
            total: parseInt(stats.total),
            active: parseInt(stats.active),
            inactive: parseInt(stats.inactive)
        };

    } catch (error) {
        console.error('Error getting personnel statistics:', error);
        return { total: 0, active: 0, inactive: 0 };
    }
}

/**
 * Get projects statistics
 */
async function getProjectsStatistics() {
    try {
        const result = await db.query(`
            SELECT 
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE status = 'in_progress') as active,
                COUNT(*) FILTER (WHERE status = 'completed') as completed
            FROM projects
        `);

        const stats = result.rows[0];
        return {
            total: parseInt(stats.total),
            active: parseInt(stats.active),
            completed: parseInt(stats.completed)
        };

    } catch (error) {
        console.error('Error getting projects statistics:', error);
        return { total: 0, active: 0, completed: 0 };
    }
}

// =====================================================
// DETAILED ENDPOINTS FOR SPECIFIC COMPLIANCE AREAS
// =====================================================

/**
 * GET /api/compliance/invoices-summary
 * Detailed invoices compliance information
 */
router.get('/invoices-summary', async (req, res) => {
    try {
        const stats = await getInvoicesStatistics();
        
        // Detect the status column name (same logic as in getInvoicesStatistics)
        const columnCheck = await db.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'electronic_invoices' 
            AND column_name IN ('dian_status', 'dian_validation_status')
        `);
        
        const statusColumn = columnCheck.rows.find(row => 
            row.column_name === 'dian_status' || row.column_name === 'dian_validation_status'
        )?.column_name || 'dian_validation_status';
        
        // Get recent invoices
        const recentResult = await db.query(`
            SELECT 
                invoice_number,
                client_name,
                total_amount,
                ${statusColumn} as dian_status,
                created_at
            FROM electronic_invoices 
            ORDER BY created_at DESC 
            LIMIT 10
        `);

        res.json({
            success: true,
            data: {
                ...stats,
                recent_invoices: recentResult.rows
            }
        });

    } catch (error) {
        console.error('Error getting invoices summary:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            details: error.message
        });
    }
});

/**
 * GET /api/compliance/upcoming-obligations
 * Returns upcoming compliance obligations
 */
router.get('/upcoming-obligations', async (req, res) => {
    try {
        const currentDate = new Date();
        const nextMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
        
        const obligations = [];

        // Check if there are active employees for payroll obligations
        const employeesResult = await db.query(`
            SELECT COUNT(*) as count FROM personnel WHERE status = 'active'
        `);
        
        const hasEmployees = parseInt(employeesResult.rows[0].count) > 0;

        if (hasEmployees) {
            // Next payroll date (15th of next month)
            const nextPayrollDate = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 15);
            const payrollDaysLeft = Math.ceil((nextPayrollDate - currentDate) / (1000 * 60 * 60 * 24));
            
            if (payrollDaysLeft > 0) {
                obligations.push({
                    type: 'payroll',
                    description: `Nómina ${nextMonth.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })}`,
                    days_left: payrollDaysLeft,
                    priority: payrollDaysLeft <= 5 ? 'high' : 'medium'
                });
            }

            // PILA submission (10 days after payroll)
            const pilaDate = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 25);
            const pilaDaysLeft = Math.ceil((pilaDate - currentDate) / (1000 * 60 * 60 * 24));
            
            if (pilaDaysLeft > 0) {
                obligations.push({
                    type: 'pila',
                    description: `PILA ${currentDate.toLocaleDateString('es-CO', { month: 'long' })}`,
                    days_left: pilaDaysLeft,
                    priority: pilaDaysLeft <= 3 ? 'high' : 'medium'
                });
            }
        }

        // Tax declarations (monthly - 21st of next month)
        const taxDate = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 21);
        const taxDaysLeft = Math.ceil((taxDate - currentDate) / (1000 * 60 * 60 * 24));
        
        if (taxDaysLeft > 0) {
            obligations.push({
                type: 'tax',
                description: 'Declaración IVA',
                days_left: taxDaysLeft,
                priority: taxDaysLeft <= 7 ? 'high' : 'low'
            });
        }

        res.json({
            success: true,
            data: obligations.sort((a, b) => a.days_left - b.days_left)
        });

    } catch (error) {
        console.error('Error getting upcoming obligations:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            details: error.message
        });
    }
});

module.exports = router;