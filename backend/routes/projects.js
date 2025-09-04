const express = require('express');
const router = express.Router();
const { db } = require('../database/connection');

// Obtener todos los proyectos
router.get('/', async (req, res) => {
    try {
        const { status, client_id } = req.query;
        
        let query = `
            SELECT 
                p.*,
                c.name as client_name,
                COUNT(DISTINCT te.personnel_id) as employees_assigned,
                COALESCE(SUM(te.hours_worked), 0) as total_hours,
                COALESCE(SUM(te.total_pay), 0) as total_labor_direct,
                CASE 
                    WHEN p.spent_total > p.budget_total THEN 'SOBREPRESUPUESTO'
                    WHEN p.spent_total > (p.budget_total * 0.9) THEN 'ALERTA'
                    ELSE 'NORMAL'
                END as budget_status,
                ROUND(((p.budget_total - p.spent_total) / p.budget_total * 100), 2) as profit_margin_percent
            FROM projects p
            LEFT JOIN clients c ON p.client_id = c.id
            LEFT JOIN time_entries te ON p.id = te.project_id
            WHERE 1=1
        `;
        
        const params = [];
        
        if (status) {
            query += ` AND p.status = $${params.length + 1}`;
            params.push(status);
        }
        
        if (client_id) {
            query += ` AND p.client_id = $${params.length + 1}`;
            params.push(client_id);
        }
        
        query += `
            GROUP BY p.id, c.name
            ORDER BY p.created_at DESC
        `;
        
        const result = await db.query(query, params);
        res.json({ data: result.rows });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Obtener proyecto por ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await db.query(`
            SELECT 
                p.*,
                c.name as client_name,
                c.contact_name,
                c.phone as client_phone,
                c.email as client_email,
                COUNT(DISTINCT te.personnel_id) as employees_assigned,
                COALESCE(SUM(te.hours_worked), 0) as total_hours,
                COALESCE(SUM(te.overtime_hours), 0) as total_overtime_hours,
                COALESCE(SUM(te.total_pay), 0) as total_labor_direct,
                COALESCE(SUM(te.total_pay * 1.58), 0) as total_labor_with_benefits,
                CASE 
                    WHEN p.spent_total > p.budget_total THEN 'SOBREPRESUPUESTO'
                    WHEN p.spent_total > (p.budget_total * 0.9) THEN 'ALERTA'
                    ELSE 'NORMAL'
                END as budget_status
            FROM projects p
            LEFT JOIN clients c ON p.client_id = c.id
            LEFT JOIN time_entries te ON p.id = te.project_id
            WHERE p.id = $1
            GROUP BY p.id, c.name, c.contact_name, c.phone, c.email
        `, [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Proyecto no encontrado' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Crear nuevo proyecto
router.post('/', async (req, res) => {
    try {
        const {
            name,
            client_id,
            description,
            budget_materials = 0,
            budget_labor = 0,
            budget_equipment = 0,
            budget_overhead = 0,
            start_date,
            estimated_end_date,
            status = 'planned',
            progress = 0
        } = req.body;
        
        if (!name) {
            return res.status(400).json({ error: 'El nombre del proyecto es requerido' });
        }
        
        const result = await db.query(`
            INSERT INTO projects (
                name, client_id, description, budget_materials, budget_labor,
                budget_equipment, budget_overhead, start_date, estimated_end_date,
                status, progress
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING *
        `, [
            name, client_id, description, budget_materials, budget_labor,
            budget_equipment, budget_overhead, start_date, estimated_end_date,
            status, progress
        ]);
        
        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Actualizar proyecto
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const {
            name,
            client_id,
            description,
            budget_materials,
            budget_labor,
            budget_equipment,
            budget_overhead,
            start_date,
            end_date,
            estimated_end_date,
            status,
            progress
        } = req.body;
        
        const result = await db.query(`
            UPDATE projects SET
                name = COALESCE($1, name),
                client_id = COALESCE($2, client_id),
                description = COALESCE($3, description),
                budget_materials = COALESCE($4, budget_materials),
                budget_labor = COALESCE($5, budget_labor),
                budget_equipment = COALESCE($6, budget_equipment),
                budget_overhead = COALESCE($7, budget_overhead),
                start_date = COALESCE($8, start_date),
                end_date = COALESCE($9, end_date),
                estimated_end_date = COALESCE($10, estimated_end_date),
                status = COALESCE($11, status),
                progress = COALESCE($12, progress),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $13
            RETURNING *
        `, [
            name, client_id, description, budget_materials, budget_labor,
            budget_equipment, budget_overhead, start_date, end_date,
            estimated_end_date, status, progress, id
        ]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Proyecto no encontrado' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Eliminar proyecto
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Verificar que no tenga gastos o horas registradas
        const hasData = await db.query(`
            SELECT 
                (SELECT COUNT(*) FROM expenses WHERE project_id = $1) as expense_count,
                (SELECT COUNT(*) FROM time_entries WHERE project_id = $1) as time_entry_count
        `, [id]);
        
        const { expense_count, time_entry_count } = hasData.rows[0];
        
        if (expense_count > 0 || time_entry_count > 0) {
            return res.status(400).json({ 
                error: 'No se puede eliminar el proyecto porque tiene gastos o registros de horas asociados'
            });
        }
        
        const result = await db.query('DELETE FROM projects WHERE id = $1 RETURNING *', [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Proyecto no encontrado' });
        }
        
        res.json({ message: 'Proyecto eliminado', project: result.rows[0] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Obtener gastos de un proyecto
router.get('/:id/expenses', async (req, res) => {
    try {
        const { id } = req.params;
        const { category, start_date, end_date } = req.query;
        
        let query = `
            SELECT * FROM expenses 
            WHERE project_id = $1
        `;
        
        const params = [id];
        
        if (category) {
            query += ` AND category = $${params.length + 1}`;
            params.push(category);
        }
        
        if (start_date) {
            query += ` AND date >= $${params.length + 1}`;
            params.push(start_date);
        }
        
        if (end_date) {
            query += ` AND date <= $${params.length + 1}`;
            params.push(end_date);
        }
        
        query += ` ORDER BY date DESC, created_at DESC`;
        
        const result = await db.query(query, params);
        res.json({ data: result.rows });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Obtener empleados asignados a un proyecto
router.get('/:id/personnel', async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await db.query(`
            SELECT 
                p.*,
                COUNT(te.id) as time_entries,
                COALESCE(SUM(te.hours_worked), 0) as total_hours,
                COALESCE(SUM(te.overtime_hours), 0) as total_overtime_hours,
                COALESCE(SUM(te.total_pay), 0) as total_pay,
                COALESCE(AVG(te.hours_worked), 0) as avg_hours_per_day,
                MIN(te.work_date) as first_work_date,
                MAX(te.work_date) as last_work_date
            FROM personnel p
            JOIN time_entries te ON p.id = te.personnel_id
            WHERE te.project_id = $1
            GROUP BY p.id
            ORDER BY total_hours DESC
        `, [id]);
        
        res.json({ data: result.rows });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Obtener resumen financiero del proyecto
router.get('/:id/financial-summary', async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await db.query(`
            SELECT 
                p.budget_total,
                p.spent_total,
                p.budget_total - p.spent_total as remaining_budget,
                ROUND(((p.budget_total - p.spent_total) / p.budget_total * 100), 2) as profit_margin_percent,
                
                -- Desglose por categoría
                p.budget_materials, p.spent_materials,
                p.budget_labor, p.spent_labor,
                p.budget_equipment, p.spent_equipment,
                p.budget_overhead, p.spent_overhead,
                
                -- Costos de mano de obra
                COALESCE(SUM(te.total_pay), 0) as labor_cost_direct,
                COALESCE(SUM(te.total_pay * 1.58), 0) as labor_cost_with_benefits,
                
                -- Estadísticas de tiempo
                COALESCE(SUM(te.hours_worked), 0) as total_hours,
                COALESCE(SUM(te.overtime_hours), 0) as total_overtime_hours,
                COUNT(DISTINCT te.personnel_id) as employees_count,
                
                -- Estado del presupuesto
                CASE 
                    WHEN p.spent_total > p.budget_total THEN 'SOBREPRESUPUESTO'
                    WHEN p.spent_total > (p.budget_total * 0.9) THEN 'ALERTA'
                    ELSE 'NORMAL'
                END as budget_status
                
            FROM projects p
            LEFT JOIN time_entries te ON p.id = te.project_id
            WHERE p.id = $1
            GROUP BY p.id
        `, [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Proyecto no encontrado' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;