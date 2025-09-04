const express = require('express');
const router = express.Router();
const { db } = require('../database/connection');

// Obtener todos los gastos
router.get('/', async (req, res) => {
    try {
        const { project_id, category, start_date, end_date, vendor } = req.query;
        
        let query = `
            SELECT 
                e.*,
                p.name as project_name
            FROM expenses e
            LEFT JOIN projects p ON e.project_id = p.id
            WHERE 1=1
        `;
        
        const params = [];
        
        if (project_id) {
            query += ` AND e.project_id = $${params.length + 1}`;
            params.push(project_id);
        }
        
        if (category) {
            query += ` AND e.category = $${params.length + 1}`;
            params.push(category);
        }
        
        if (start_date) {
            query += ` AND e.date >= $${params.length + 1}`;
            params.push(start_date);
        }
        
        if (end_date) {
            query += ` AND e.date <= $${params.length + 1}`;
            params.push(end_date);
        }
        
        if (vendor) {
            query += ` AND e.vendor ILIKE $${params.length + 1}`;
            params.push(`%${vendor}%`);
        }
        
        query += ` ORDER BY e.date DESC, e.created_at DESC`;
        
        const result = await db.query(query, params);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Obtener gasto por ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await db.query(`
            SELECT 
                e.*,
                p.name as project_name
            FROM expenses e
            LEFT JOIN projects p ON e.project_id = p.id
            WHERE e.id = $1
        `, [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Gasto no encontrado' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Crear nuevo gasto
router.post('/', async (req, res) => {
    try {
        const {
            project_id,
            date,
            category,
            subcategory,
            vendor,
            description,
            quantity,
            unit_price,
            amount,
            invoice_number,
            receipt_url
        } = req.body;
        
        if (!date || !category || !amount) {
            return res.status(400).json({ 
                error: 'Campos requeridos: date, category, amount' 
            });
        }
        
        const result = await db.query(`
            INSERT INTO expenses (
                project_id, date, category, subcategory, vendor,
                description, quantity, unit_price, amount,
                invoice_number, receipt_url
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING *
        `, [
            project_id, date, category, subcategory, vendor,
            description, quantity, unit_price, amount,
            invoice_number, receipt_url
        ]);
        
        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Actualizar gasto
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const {
            project_id,
            date,
            category,
            subcategory,
            vendor,
            description,
            quantity,
            unit_price,
            amount,
            invoice_number,
            receipt_url
        } = req.body;
        
        const result = await db.query(`
            UPDATE expenses SET
                project_id = COALESCE($1, project_id),
                date = COALESCE($2, date),
                category = COALESCE($3, category),
                subcategory = COALESCE($4, subcategory),
                vendor = COALESCE($5, vendor),
                description = COALESCE($6, description),
                quantity = COALESCE($7, quantity),
                unit_price = COALESCE($8, unit_price),
                amount = COALESCE($9, amount),
                invoice_number = COALESCE($10, invoice_number),
                receipt_url = COALESCE($11, receipt_url)
            WHERE id = $12
            RETURNING *
        `, [
            project_id, date, category, subcategory, vendor,
            description, quantity, unit_price, amount,
            invoice_number, receipt_url, id
        ]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Gasto no encontrado' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Eliminar gasto
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await db.query('DELETE FROM expenses WHERE id = $1 RETURNING *', [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Gasto no encontrado' });
        }
        
        res.json({ message: 'Gasto eliminado', expense: result.rows[0] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Resumen de gastos por categoría
router.get('/summary/by-category', async (req, res) => {
    try {
        const { project_id, start_date, end_date } = req.query;
        
        let query = `
            SELECT 
                category,
                COUNT(*) as transaction_count,
                SUM(amount) as total_amount,
                AVG(amount) as avg_amount,
                MIN(date) as earliest_date,
                MAX(date) as latest_date
            FROM expenses
            WHERE 1=1
        `;
        
        const params = [];
        
        if (project_id) {
            query += ` AND project_id = $${params.length + 1}`;
            params.push(project_id);
        }
        
        if (start_date) {
            query += ` AND date >= $${params.length + 1}`;
            params.push(start_date);
        }
        
        if (end_date) {
            query += ` AND date <= $${params.length + 1}`;
            params.push(end_date);
        }
        
        query += `
            GROUP BY category
            ORDER BY total_amount DESC
        `;
        
        const result = await db.query(query, params);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Resumen de gastos por proyecto
router.get('/summary/by-project', async (req, res) => {
    try {
        const { start_date, end_date } = req.query;
        
        let query = `
            SELECT 
                p.id as project_id,
                p.name as project_name,
                COUNT(e.id) as transaction_count,
                COALESCE(SUM(e.amount), 0) as total_amount,
                COALESCE(AVG(e.amount), 0) as avg_amount,
                
                -- Por categoría
                COALESCE(SUM(CASE WHEN e.category = 'materials' THEN e.amount END), 0) as materials_total,
                COALESCE(SUM(CASE WHEN e.category = 'labor' THEN e.amount END), 0) as labor_total,
                COALESCE(SUM(CASE WHEN e.category = 'equipment' THEN e.amount END), 0) as equipment_total,
                COALESCE(SUM(CASE WHEN e.category = 'overhead' THEN e.amount END), 0) as overhead_total,
                
                -- Comparación con presupuesto
                p.budget_total,
                p.budget_total - COALESCE(SUM(e.amount), 0) as remaining_budget,
                CASE 
                    WHEN p.budget_total > 0 
                    THEN ROUND((COALESCE(SUM(e.amount), 0) / p.budget_total * 100), 2)
                    ELSE 0 
                END as budget_used_percent
                
            FROM projects p
            LEFT JOIN expenses e ON p.id = e.project_id
        `;
        
        const params = [];
        
        if (start_date || end_date) {
            query += ' WHERE ';
            const conditions = [];
            
            if (start_date) {
                conditions.push(`e.date >= $${params.length + 1}`);
                params.push(start_date);
            }
            
            if (end_date) {
                conditions.push(`e.date <= $${params.length + 1}`);
                params.push(end_date);
            }
            
            query += conditions.join(' AND ');
        }
        
        query += `
            GROUP BY p.id, p.name, p.budget_total
            ORDER BY total_amount DESC
        `;
        
        const result = await db.query(query, params);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Gastos por vendor/proveedor
router.get('/summary/by-vendor', async (req, res) => {
    try {
        const { start_date, end_date } = req.query;
        
        let query = `
            SELECT 
                vendor,
                COUNT(*) as transaction_count,
                SUM(amount) as total_amount,
                AVG(amount) as avg_amount,
                STRING_AGG(DISTINCT category, ', ') as categories,
                MIN(date) as first_transaction,
                MAX(date) as last_transaction
            FROM expenses
            WHERE vendor IS NOT NULL AND vendor != ''
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
        
        query += `
            GROUP BY vendor
            ORDER BY total_amount DESC
            LIMIT 20
        `;
        
        const result = await db.query(query, params);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Análisis mensual de gastos
router.get('/summary/monthly', async (req, res) => {
    try {
        const { year = new Date().getFullYear(), project_id } = req.query;
        
        let query = `
            SELECT 
                EXTRACT(MONTH FROM date) as month,
                TO_CHAR(date, 'Month') as month_name,
                COUNT(*) as transaction_count,
                SUM(amount) as total_amount,
                
                -- Por categoría
                SUM(CASE WHEN category = 'materials' THEN amount ELSE 0 END) as materials,
                SUM(CASE WHEN category = 'labor' THEN amount ELSE 0 END) as labor,
                SUM(CASE WHEN category = 'equipment' THEN amount ELSE 0 END) as equipment,
                SUM(CASE WHEN category = 'overhead' THEN amount ELSE 0 END) as overhead
                
            FROM expenses
            WHERE EXTRACT(YEAR FROM date) = $1
        `;
        
        const params = [year];
        
        if (project_id) {
            query += ` AND project_id = $${params.length + 1}`;
            params.push(project_id);
        }
        
        query += `
            GROUP BY EXTRACT(MONTH FROM date), TO_CHAR(date, 'Month')
            ORDER BY month
        `;
        
        const result = await db.query(query, params);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;