// =====================================================
// RUTAS API - CLIENTS (CLIENTES)
// =====================================================

const express = require('express');
const router = express.Router();
const { db } = require('../database/connection');

// =====================================================
// CRUD CLIENTES
// =====================================================

// GET /api/clients - Obtener todos los clientes
router.get('/', async (req, res) => {
    try {
        const { search } = req.query;
        
        let query = 'SELECT * FROM clients';
        const params = [];
        
        if (search) {
            query += ' WHERE name ILIKE $1 OR contact_name ILIKE $1';
            params.push(`%${search}%`);
        }
        
        query += ' ORDER BY name';
        
        const result = await db.query(query, params);
        res.json({ data: result.rows });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/clients/:id - Obtener cliente por ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.query('SELECT * FROM clients WHERE id = $1', [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Cliente no encontrado' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/clients - Crear nuevo cliente
router.post('/', async (req, res) => {
    try {
        const { name, contact_name, phone, email, address } = req.body;
        
        if (!name) {
            return res.status(400).json({ error: 'El nombre del cliente es requerido' });
        }
        
        const result = await db.query(`
            INSERT INTO clients (name, contact_name, phone, email, address)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `, [name, contact_name, phone, email, address]);
        
        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/clients/:id - Actualizar cliente
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, contact_name, phone, email, address } = req.body;
        
        const result = await db.query(`
            UPDATE clients 
            SET name = $1, contact_name = $2, phone = $3, email = $4, address = $5
            WHERE id = $6
            RETURNING *
        `, [name, contact_name, phone, email, address, id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Cliente no encontrado' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE /api/clients/:id - Eliminar cliente
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Verificar si tiene proyectos asociados
        const projects = await db.query('SELECT COUNT(*) FROM projects WHERE client_id = $1', [id]);
        if (parseInt(projects.rows[0].count) > 0) {
            return res.status(400).json({ 
                error: 'No se puede eliminar el cliente porque tiene proyectos asociados' 
            });
        }
        
        const result = await db.query('DELETE FROM clients WHERE id = $1 RETURNING *', [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Cliente no encontrado' });
        }
        
        res.json({ message: 'Cliente eliminado exitosamente' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// =====================================================
// RUTAS RELACIONADAS
// =====================================================

// GET /api/clients/:id/projects - Obtener proyectos de un cliente
router.get('/:id/projects', async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await db.query(`
            SELECT p.*, 
                   (p.budget_total - p.spent_total) as remaining_budget,
                   CASE 
                       WHEN p.spent_total > p.budget_total THEN 'SOBREPRESUPUESTO'
                       WHEN p.spent_total > (p.budget_total * 0.9) THEN 'ALERTA'
                       ELSE 'NORMAL'
                   END as budget_status
            FROM projects p
            WHERE p.client_id = $1
            ORDER BY p.created_at DESC
        `, [id]);
        
        res.json({ data: result.rows });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/clients/:id/stats - Estadísticas de un cliente
router.get('/:id/stats', async (req, res) => {
    try {
        const { id } = req.params;
        
        const stats = await db.query(`
            SELECT 
                COUNT(*) as total_projects,
                COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as active_projects,
                COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_projects,
                COALESCE(SUM(CASE WHEN status = 'completed' THEN budget_total END), 0) as total_revenue,
                COALESCE(AVG(CASE WHEN status = 'completed' THEN budget_total END), 0) as average_project_value,
                COUNT(CASE WHEN status = 'completed' AND end_date <= estimated_end_date THEN 1 END) as projects_on_time,
                COUNT(CASE WHEN status = 'completed' AND end_date > estimated_end_date THEN 1 END) as projects_delayed
            FROM projects 
            WHERE client_id = $1
        `, [id]);
        
        res.json(stats.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;