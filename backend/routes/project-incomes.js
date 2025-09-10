const express = require('express');
const router = express.Router();
const { db } = require('../database/connection');

// =====================================================
// PROJECT INCOMES ROUTES
// =====================================================

// Obtener todos los ingresos de un proyecto específico
router.get('/projects/:projectId/incomes', async (req, res) => {
    try {
        const { projectId } = req.params;
        const { start_date, end_date, limit = 50, offset = 0 } = req.query;
        
        let query = `
            SELECT 
                pi.*,
                p.name as project_name
            FROM project_incomes pi
            LEFT JOIN projects p ON pi.project_id = p.id
            WHERE pi.project_id = $1
        `;
        
        const params = [projectId];
        
        if (start_date) {
            query += ` AND pi.date >= $${params.length + 1}`;
            params.push(start_date);
        }
        
        if (end_date) {
            query += ` AND pi.date <= $${params.length + 1}`;
            params.push(end_date);
        }
        
        query += ` ORDER BY pi.date DESC, pi.created_at DESC`;
        query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(parseInt(limit), parseInt(offset));
        
        const result = await db.query(query, params);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Obtener resumen de ingresos de un proyecto
router.get('/projects/:projectId/incomes/summary', async (req, res) => {
    try {
        const { projectId } = req.params;
        const { start_date, end_date } = req.query;
        
        const result = await db.query(`
            SELECT * FROM get_project_income_summary($1, $2, $3)
        `, [projectId, start_date || null, end_date || null]);
        
        if (result.rows.length === 0) {
            return res.json({
                total_income: 0,
                income_count: 0,
                avg_income: 0,
                first_income_date: null,
                last_income_date: null
            });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Crear nuevo ingreso para un proyecto
router.post('/projects/:projectId/incomes', async (req, res) => {
    try {
        const { projectId } = req.params;
        const {
            amount,
            date,
            concept,
            payment_method = 'transfer',
            invoice_number,
            notes
        } = req.body;
        
        // Validaciones
        if (!amount || amount <= 0) {
            return res.status(400).json({ error: 'El monto es requerido y debe ser mayor a 0' });
        }
        
        if (!date) {
            return res.status(400).json({ error: 'La fecha es requerida' });
        }
        
        if (!concept) {
            return res.status(400).json({ error: 'El concepto es requerido' });
        }
        
        // Verificar que el proyecto existe
        const projectCheck = await db.query('SELECT id, name FROM projects WHERE id = $1', [projectId]);
        if (projectCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Proyecto no encontrado' });
        }
        
        const result = await db.query(`
            INSERT INTO project_incomes (
                project_id, amount, date, concept, payment_method, 
                invoice_number, notes, created_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
        `, [
            projectId, amount, date, concept, payment_method,
            invoice_number, notes, 'api_user'
        ]);
        
        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Actualizar ingreso existente
router.put('/incomes/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const {
            amount,
            date,
            concept,
            payment_method,
            invoice_number,
            notes
        } = req.body;
        
        const result = await db.query(`
            UPDATE project_incomes SET
                amount = COALESCE($1, amount),
                date = COALESCE($2, date),
                concept = COALESCE($3, concept),
                payment_method = COALESCE($4, payment_method),
                invoice_number = COALESCE($5, invoice_number),
                notes = COALESCE($6, notes),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $7
            RETURNING *
        `, [amount, date, concept, payment_method, invoice_number, notes, id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Ingreso no encontrado' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Eliminar ingreso
router.delete('/incomes/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await db.query(`
            DELETE FROM project_incomes 
            WHERE id = $1 
            RETURNING *
        `, [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Ingreso no encontrado' });
        }
        
        res.json({ message: 'Ingreso eliminado', income: result.rows[0] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// =====================================================
// GENERAL INCOMES ROUTES (todos los proyectos)
// =====================================================

// Obtener todos los ingresos (con filtros)
router.get('/incomes', async (req, res) => {
    try {
        const { 
            project_id, 
            start_date, 
            end_date, 
            payment_method, 
            limit = 100, 
            offset = 0 
        } = req.query;
        
        let query = `
            SELECT 
                pi.*,
                p.name as project_name,
                c.name as client_name
            FROM project_incomes pi
            LEFT JOIN projects p ON pi.project_id = p.id
            LEFT JOIN clients c ON p.client_id = c.id
            WHERE 1=1
        `;
        
        const params = [];
        
        if (project_id) {
            query += ` AND pi.project_id = $${params.length + 1}`;
            params.push(project_id);
        }
        
        if (start_date) {
            query += ` AND pi.date >= $${params.length + 1}`;
            params.push(start_date);
        }
        
        if (end_date) {
            query += ` AND pi.date <= $${params.length + 1}`;
            params.push(end_date);
        }
        
        if (payment_method) {
            query += ` AND pi.payment_method = $${params.length + 1}`;
            params.push(payment_method);
        }
        
        query += ` ORDER BY pi.date DESC, pi.created_at DESC`;
        query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(parseInt(limit), parseInt(offset));
        
        const result = await db.query(query, params);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Obtener resumen general de ingresos
router.get('/incomes/summary', async (req, res) => {
    try {
        const { start_date, end_date } = req.query;
        
        let query = `
            SELECT 
                COUNT(*) as total_incomes,
                COUNT(DISTINCT project_id) as projects_with_incomes,
                COALESCE(SUM(amount), 0) as total_amount,
                COALESCE(AVG(amount), 0) as avg_amount,
                MIN(date) as first_income_date,
                MAX(date) as last_income_date
            FROM project_incomes
            WHERE 1=1
        `;
        
        const params = [];
        
        if (start_date) {
            query += ` AND date >= $${params.length + 1}`;
            params.push(start_date);
        }
        
        if (end_date) {
            query += ` AND date <= $${params.length + 1}`;
            params.push(end_date);
        }
        
        const result = await db.query(query, params);
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Obtener análisis de rentabilidad por proyecto
router.get('/projects/:projectId/profit-analysis', async (req, res) => {
    try {
        const { projectId } = req.params;
        
        const result = await db.query(`
            SELECT * FROM get_project_profit_analysis($1)
        `, [projectId]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Proyecto no encontrado' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Obtener ingresos por método de pago
router.get('/incomes/by-payment-method', async (req, res) => {
    try {
        const { start_date, end_date } = req.query;
        
        let query = `
            SELECT 
                payment_method,
                COUNT(*) as count,
                COALESCE(SUM(amount), 0) as total_amount,
                COALESCE(AVG(amount), 0) as avg_amount
            FROM project_incomes
            WHERE 1=1
        `;
        
        const params = [];
        
        if (start_date) {
            query += ` AND date >= $${params.length + 1}`;
            params.push(start_date);
        }
        
        if (end_date) {
            query += ` AND date <= $${params.length + 1}`;
            params.push(end_date);
        }
        
        query += ` GROUP BY payment_method ORDER BY total_amount DESC`;
        
        const result = await db.query(query, params);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;