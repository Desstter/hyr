const express = require('express');
const router = express.Router();
const { db } = require('../database/connection');

// Reporte de rentabilidad por proyecto
router.get('/project-profitability', async (req, res) => {
    try {
        const result = await db.query(`
            SELECT 
                p.id,
                p.name,
                c.name as client_name,
                p.status,
                p.budget_total,
                p.spent_total,
                p.budget_total - p.spent_total as remaining_budget,
                ROUND(((p.budget_total - p.spent_total) / NULLIF(p.budget_total, 0) * 100), 2) as profit_margin_percent,
                
                -- Desglose por categoría
                p.budget_materials, p.spent_materials,
                p.budget_labor, p.spent_labor,
                p.budget_equipment, p.spent_equipment,
                p.budget_overhead, p.spent_overhead,
                
                -- Indicadores de alerta
                CASE 
                    WHEN p.spent_total > p.budget_total THEN 'SOBREPRESUPUESTO'
                    WHEN p.spent_total > (p.budget_total * 0.9) THEN 'ALERTA'
                    ELSE 'NORMAL'
                END as budget_status,
                
                -- Empleados asignados y costo de mano de obra
                COUNT(DISTINCT te.personnel_id) as employees_assigned,
                COALESCE(SUM(te.total_pay), 0) as total_labor_cost_direct,
                COALESCE(SUM(te.total_pay * 1.58), 0) as total_labor_cost_with_benefits,
                
                p.start_date,
                p.estimated_end_date,
                p.progress
                
            FROM projects p
            LEFT JOIN clients c ON p.client_id = c.id
            LEFT JOIN time_entries te ON p.id = te.project_id
            WHERE p.status != 'completed' OR p.end_date >= CURRENT_DATE - INTERVAL '30 days'
            GROUP BY p.id, c.name
            ORDER BY profit_margin_percent DESC NULLS LAST
        `);
        
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Dashboard ejecutivo con KPIs financieros
router.get('/executive-dashboard', async (req, res) => {
    try {
        // KPIs principales
        const kpis = await db.query(`
            WITH monthly_data AS (
                SELECT 
                    DATE_TRUNC('month', CURRENT_DATE) as current_month,
                    DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month') as previous_month
            ),
            current_month_payroll AS (
                SELECT 
                    COALESCE(SUM(pd.total_employer_cost), 0) as total_payroll_cost,
                    COALESCE(SUM(pd.net_pay), 0) as total_net_pay,
                    COUNT(DISTINCT pd.personnel_id) as employees_paid
                FROM payroll_details pd
                JOIN payroll_periods pp ON pd.payroll_period_id = pp.id
                WHERE pp.year = EXTRACT(YEAR FROM CURRENT_DATE)
                AND pp.month = EXTRACT(MONTH FROM CURRENT_DATE)
            ),
            projects_summary AS (
                SELECT 
                    COUNT(*) as total_projects,
                    COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as active_projects,
                    COUNT(CASE WHEN status = 'completed' AND end_date >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as completed_this_month,
                    COALESCE(SUM(CASE WHEN status = 'completed' AND end_date >= DATE_TRUNC('month', CURRENT_DATE) THEN budget_total END), 0) as revenue_this_month,
                    COALESCE(SUM(CASE WHEN status = 'in_progress' THEN budget_total - spent_total END), 0) as projected_profit
                FROM projects
            ),
            expenses_summary AS (
                SELECT 
                    COALESCE(SUM(CASE WHEN date >= DATE_TRUNC('month', CURRENT_DATE) THEN amount END), 0) as expenses_this_month,
                    COALESCE(SUM(CASE WHEN date >= DATE_TRUNC('month', CURRENT_DATE) AND category = 'materials' THEN amount END), 0) as materials_this_month,
                    COALESCE(SUM(CASE WHEN date >= DATE_TRUNC('month', CURRENT_DATE) AND category = 'equipment' THEN amount END), 0) as equipment_this_month
                FROM expenses
            )
            SELECT 
                -- Proyectos
                ps.total_projects,
                ps.active_projects, 
                ps.completed_this_month,
                ps.revenue_this_month,
                ps.projected_profit,
                
                -- Nómina
                cmp.total_payroll_cost,
                cmp.total_net_pay,
                cmp.employees_paid,
                
                -- Gastos
                es.expenses_this_month,
                es.materials_this_month,
                es.equipment_this_month,
                
                -- Indicadores calculados
                ps.revenue_this_month - es.expenses_this_month - cmp.total_payroll_cost as net_profit_this_month,
                CASE 
                    WHEN ps.revenue_this_month > 0 
                    THEN ROUND(((ps.revenue_this_month - es.expenses_this_month - cmp.total_payroll_cost) / ps.revenue_this_month * 100), 2)
                    ELSE 0 
                END as profit_margin_percent
                
            FROM projects_summary ps
            CROSS JOIN current_month_payroll cmp  
            CROSS JOIN expenses_summary es
        `);
        
        // Proyectos con mayor riesgo
        const riskyProjects = await db.query(`
            SELECT 
                p.name,
                p.budget_total,
                p.spent_total,
                ROUND((p.spent_total / NULLIF(p.budget_total, 0) * 100), 1) as spent_percentage,
                p.progress,
                CASE 
                    WHEN p.spent_total > p.budget_total THEN 'CRÍTICO'
                    WHEN p.spent_total > (p.budget_total * 0.9) THEN 'ALTO RIESGO'
                    WHEN p.budget_total > 0 AND (p.spent_total / p.budget_total) > (p.progress / 100.0) THEN 'MONITOREAR'
                    ELSE 'NORMAL'
                END as risk_level
            FROM projects p
            WHERE p.status = 'in_progress'
            AND (p.spent_total > p.budget_total * 0.8 OR 
                 (p.budget_total > 0 AND p.spent_total / p.budget_total > p.progress / 100.0))
            ORDER BY spent_percentage DESC NULLS LAST
            LIMIT 5
        `);
        
        res.json({
            kpis: kpis.rows[0],
            riskyProjects: riskyProjects.rows
        });
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Análisis de productividad de empleados
router.get('/employee-productivity', async (req, res) => {
    const { month = new Date().getMonth() + 1, year = new Date().getFullYear() } = req.query;
    
    try {
        const result = await db.query(`
            SELECT 
                p.name,
                p.position,
                p.department,
                
                -- Horas trabajadas
                COALESCE(SUM(te.hours_worked), 0) as total_hours,
                COALESCE(SUM(te.overtime_hours), 0) as overtime_hours,
                COALESCE(AVG(te.hours_worked), 0) as avg_daily_hours,
                
                -- Productividad por proyecto
                COUNT(DISTINCT te.project_id) as projects_worked,
                COALESCE(SUM(te.total_pay), 0) as total_earnings,
                
                -- Costo para la empresa (incluyendo prestaciones)
                COALESCE(SUM(te.total_pay * 1.58), 0) as total_cost_to_company,
                
                -- Eficiencia (ingresos generados vs costo)
                CASE 
                    WHEN SUM(te.total_pay) > 0 AND SUM(te.hours_worked) > 0
                    THEN ROUND(SUM(te.total_pay * 1.58) / SUM(te.hours_worked), 2)
                    ELSE 0 
                END as cost_per_hour_with_benefits,
                
                -- Proyectos más productivos
                STRING_AGG(DISTINCT pr.name, ', ') as projects_list
                
            FROM personnel p
            LEFT JOIN time_entries te ON p.id = te.personnel_id 
                AND EXTRACT(MONTH FROM te.work_date) = $1
                AND EXTRACT(YEAR FROM te.work_date) = $2
            LEFT JOIN projects pr ON te.project_id = pr.id
            WHERE p.status = 'active'
            GROUP BY p.id, p.name, p.position, p.department
            ORDER BY total_hours DESC
        `, [month, year]);
        
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Análisis de costos por departamento
router.get('/department-costs', async (req, res) => {
    try {
        const { start_date, end_date } = req.query;
        
        let query = `
            SELECT 
                p.department,
                COUNT(DISTINCT p.id) as employee_count,
                COALESCE(SUM(te.hours_worked), 0) as total_hours,
                COALESCE(SUM(te.overtime_hours), 0) as total_overtime_hours,
                COALESCE(SUM(te.total_pay), 0) as total_direct_cost,
                COALESCE(SUM(te.total_pay * 1.58), 0) as total_cost_with_benefits,
                COALESCE(AVG(te.total_pay * 1.58), 0) as avg_cost_per_employee,
                COALESCE(SUM(te.total_pay * 1.58) / NULLIF(SUM(te.hours_worked), 0), 0) as cost_per_hour
            FROM personnel p
            LEFT JOIN time_entries te ON p.id = te.personnel_id
        `;
        
        const params = [];
        
        if (start_date || end_date) {
            query += ' WHERE ';
            const conditions = [];
            
            if (start_date) {
                conditions.push(`te.work_date >= $${params.length + 1}`);
                params.push(start_date);
            }
            
            if (end_date) {
                conditions.push(`te.work_date <= $${params.length + 1}`);
                params.push(end_date);
            }
            
            query += conditions.join(' AND ');
        }
        
        query += `
            GROUP BY p.department
            ORDER BY total_cost_with_benefits DESC
        `;
        
        const result = await db.query(query, params);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Análisis de tendencias financieras mensuales
router.get('/financial-trends', async (req, res) => {
    try {
        const { months = 12 } = req.query;
        
        const result = await db.query(`
            WITH monthly_data AS (
                SELECT 
                    DATE_TRUNC('month', generate_series(
                        CURRENT_DATE - INTERVAL '${parseInt(months)} months',
                        CURRENT_DATE,
                        INTERVAL '1 month'
                    )) as month
            ),
            expenses_by_month AS (
                SELECT 
                    DATE_TRUNC('month', e.date) as month,
                    SUM(e.amount) as total_expenses,
                    SUM(CASE WHEN e.category = 'materials' THEN e.amount ELSE 0 END) as materials,
                    SUM(CASE WHEN e.category = 'labor' THEN e.amount ELSE 0 END) as labor,
                    SUM(CASE WHEN e.category = 'equipment' THEN e.amount ELSE 0 END) as equipment,
                    SUM(CASE WHEN e.category = 'overhead' THEN e.amount ELSE 0 END) as overhead
                FROM expenses e
                WHERE e.date >= CURRENT_DATE - INTERVAL '${parseInt(months)} months'
                GROUP BY DATE_TRUNC('month', e.date)
            ),
            revenue_by_month AS (
                SELECT 
                    DATE_TRUNC('month', p.end_date) as month,
                    SUM(p.budget_total) as total_revenue
                FROM projects p
                WHERE p.status = 'completed'
                AND p.end_date >= CURRENT_DATE - INTERVAL '${parseInt(months)} months'
                GROUP BY DATE_TRUNC('month', p.end_date)
            )
            SELECT 
                TO_CHAR(md.month, 'YYYY-MM') as month,
                TO_CHAR(md.month, 'Mon YYYY') as month_name,
                COALESCE(rbm.total_revenue, 0) as revenue,
                COALESCE(ebm.total_expenses, 0) as expenses,
                COALESCE(rbm.total_revenue, 0) - COALESCE(ebm.total_expenses, 0) as profit,
                COALESCE(ebm.materials, 0) as materials_cost,
                COALESCE(ebm.labor, 0) as labor_cost,
                COALESCE(ebm.equipment, 0) as equipment_cost,
                COALESCE(ebm.overhead, 0) as overhead_cost
            FROM monthly_data md
            LEFT JOIN expenses_by_month ebm ON md.month = ebm.month
            LEFT JOIN revenue_by_month rbm ON md.month = rbm.month
            ORDER BY md.month
        `);
        
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Reporte de utilización de recursos
router.get('/resource-utilization', async (req, res) => {
    try {
        const { start_date, end_date } = req.query;
        
        let query = `
            SELECT 
                pr.name as project_name,
                pr.status,
                pr.budget_total,
                pr.spent_total,
                COUNT(DISTINCT te.personnel_id) as employees_assigned,
                SUM(te.hours_worked) as total_hours_worked,
                AVG(te.hours_worked) as avg_hours_per_day,
                SUM(te.total_pay * 1.58) as total_labor_cost,
                
                -- Eficiencia del proyecto
                CASE 
                    WHEN pr.budget_total > 0 
                    THEN ROUND((pr.spent_total / pr.budget_total * 100), 2)
                    ELSE 0 
                END as budget_utilization_percent,
                
                -- Productividad
                CASE 
                    WHEN SUM(te.hours_worked) > 0 
                    THEN ROUND((pr.budget_total / SUM(te.hours_worked)), 2)
                    ELSE 0 
                END as revenue_per_hour
                
            FROM projects pr
            LEFT JOIN time_entries te ON pr.id = te.project_id
        `;
        
        const params = [];
        
        if (start_date || end_date) {
            query += ' WHERE ';
            const conditions = [];
            
            if (start_date) {
                conditions.push(`te.work_date >= $${params.length + 1}`);
                params.push(start_date);
            }
            
            if (end_date) {
                conditions.push(`te.work_date <= $${params.length + 1}`);
                params.push(end_date);
            }
            
            query += conditions.join(' AND ');
        }
        
        query += `
            GROUP BY pr.id, pr.name, pr.status, pr.budget_total, pr.spent_total
            HAVING SUM(te.hours_worked) > 0
            ORDER BY revenue_per_hour DESC NULLS LAST
        `;
        
        const result = await db.query(query, params);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Reporte de cumplimiento legal nómina
router.get('/payroll-compliance', async (req, res) => {
    try {
        const { year = new Date().getFullYear(), month = new Date().getMonth() + 1 } = req.query;
        
        const result = await db.query(`
            SELECT 
                p.name as employee_name,
                p.document_number,
                pd.base_salary,
                
                -- Validaciones legales
                CASE 
                    WHEN pd.base_salary < 1300000 THEN 'INCUMPLE: Salario menor al mínimo'
                    ELSE 'CUMPLE'
                END as salario_minimo_check,
                
                CASE 
                    WHEN pd.health_employee < (pd.regular_pay + pd.overtime_pay) * 0.04 
                    THEN 'INCUMPLE: Salud menor al 4%'
                    ELSE 'CUMPLE'
                END as salud_employee_check,
                
                CASE 
                    WHEN pd.pension_employee < (pd.regular_pay + pd.overtime_pay) * 0.04 
                    THEN 'INCUMPLE: Pensión menor al 4%'
                    ELSE 'CUMPLE'
                END as pension_employee_check,
                
                CASE 
                    WHEN pd.base_salary <= 2600000 AND pd.transport_allowance = 0 
                    THEN 'INCUMPLE: Falta auxilio transporte'
                    WHEN pd.base_salary > 2600000 AND pd.transport_allowance > 0 
                    THEN 'INCUMPLE: No debe recibir auxilio transporte'
                    ELSE 'CUMPLE'
                END as auxilio_transporte_check,
                
                CASE 
                    WHEN pd.base_salary > 5200000 AND pd.solidarity_contribution = 0 
                    THEN 'INCUMPLE: Falta aporte solidario'
                    ELSE 'CUMPLE'
                END as solidaridad_check,
                
                -- Aportes patronales
                CASE 
                    WHEN pd.health_employer < (pd.regular_pay + pd.overtime_pay) * 0.085 
                    THEN 'INCUMPLE: Salud patronal menor al 8.5%'
                    ELSE 'CUMPLE'
                END as salud_employer_check,
                
                CASE 
                    WHEN pd.pension_employer < (pd.regular_pay + pd.overtime_pay) * 0.12 
                    THEN 'INCUMPLE: Pensión patronal menor al 12%'
                    ELSE 'CUMPLE'
                END as pension_employer_check
                
            FROM payroll_details pd
            JOIN personnel p ON pd.personnel_id = p.id
            JOIN payroll_periods pp ON pd.payroll_period_id = pp.id
            WHERE pp.year = $1 AND pp.month = $2
            ORDER BY p.name
        `, [year, month]);
        
        // Resumen de incumplimientos
        const complianceSummary = await db.query(`
            SELECT 
                COUNT(*) as total_employees,
                COUNT(CASE WHEN pd.base_salary < 1300000 THEN 1 END) as salario_minimo_violations,
                COUNT(CASE WHEN pd.health_employee < (pd.regular_pay + pd.overtime_pay) * 0.04 THEN 1 END) as salud_violations,
                COUNT(CASE WHEN pd.pension_employee < (pd.regular_pay + pd.overtime_pay) * 0.04 THEN 1 END) as pension_violations,
                COUNT(CASE WHEN pd.base_salary <= 2600000 AND pd.transport_allowance = 0 THEN 1 END) as auxilio_violations
            FROM payroll_details pd
            JOIN payroll_periods pp ON pd.payroll_period_id = pp.id
            WHERE pp.year = $1 AND pp.month = $2
        `, [year, month]);
        
        res.json({
            period: `${year}-${month}`,
            details: result.rows,
            summary: complianceSummary.rows[0]
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;