// =====================================================
// CALENDAR ROUTES - HYR CONSTRUCTORA & SOLDADURA
// Gestión de eventos, recordatorios y calendario empresarial
// =====================================================

const express = require('express');
const router = express.Router();
const { db } = require('../database/connection');
const { format, startOfMonth, endOfMonth, addDays, subDays } = require('date-fns');

// =====================================================
// EVENTOS DE CALENDARIO - CRUD
// =====================================================

/**
 * GET /api/calendar/events
 * Obtener todos los eventos del calendario con filtros
 */
router.get('/events', async (req, res) => {
    const {
        start_date,
        end_date,
        type,
        status,
        project_id,
        personnel_id,
        limit = 100,
        offset = 0
    } = req.query;
    
    try {
        let query = `
            SELECT 
                ce.*,
                p.name as project_name,
                per.name as personnel_name,
                c.name as client_name
            FROM calendar_events ce
            LEFT JOIN projects p ON ce.project_id = p.id
            LEFT JOIN personnel per ON ce.personnel_id = per.id
            LEFT JOIN clients c ON p.client_id = c.id
            WHERE 1=1
        `;
        const params = [];
        let paramIndex = 1;
        
        if (start_date) {
            query += ` AND ce.event_date >= $${paramIndex++}`;
            params.push(start_date);
        }
        
        if (end_date) {
            query += ` AND ce.event_date <= $${paramIndex++}`;
            params.push(end_date);
        }
        
        if (type) {
            query += ` AND ce.type = $${paramIndex++}`;
            params.push(type);
        }
        
        if (status) {
            query += ` AND ce.status = $${paramIndex++}`;
            params.push(status);
        }
        
        if (project_id) {
            query += ` AND ce.project_id = $${paramIndex++}`;
            params.push(project_id);
        }
        
        if (personnel_id) {
            query += ` AND ce.personnel_id = $${paramIndex++}`;
            params.push(personnel_id);
        }
        
        query += ` ORDER BY ce.event_date ASC, ce.event_time ASC`;
        query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
        params.push(parseInt(limit), parseInt(offset));
        
        const result = await db.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching calendar events:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/calendar/events/month
 * Obtener eventos por mes específico
 */
router.get('/events/month', async (req, res) => {
    const { year, month } = req.query;
    
    if (!year || !month) {
        return res.status(400).json({ error: 'Year and month are required' });
    }
    
    try {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);
        
        const result = await db.query(`
            SELECT 
                ce.*,
                p.name as project_name,
                per.name as personnel_name,
                c.name as client_name
            FROM calendar_events ce
            LEFT JOIN projects p ON ce.project_id = p.id
            LEFT JOIN personnel per ON ce.personnel_id = per.id
            LEFT JOIN clients c ON p.client_id = c.id
            WHERE ce.event_date >= $1 AND ce.event_date <= $2
            ORDER BY ce.event_date ASC, ce.event_time ASC
        `, [startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]]);
        
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching monthly events:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/calendar/events/:id
 * Obtener evento específico por ID
 */
router.get('/events/:id', async (req, res) => {
    const { id } = req.params;
    
    try {
        const result = await db.query(`
            SELECT 
                ce.*,
                p.name as project_name,
                per.name as personnel_name,
                c.name as client_name
            FROM calendar_events ce
            LEFT JOIN projects p ON ce.project_id = p.id
            LEFT JOIN personnel per ON ce.personnel_id = per.id
            LEFT JOIN clients c ON p.client_id = c.id
            WHERE ce.id = $1
        `, [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Event not found' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching event:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/calendar/events
 * Crear nuevo evento de calendario
 */
router.post('/events', async (req, res) => {
    const {
        title,
        description,
        event_date,
        event_time,
        type,
        priority = 'medium',
        amount,
        category,
        recurrence = 'none',
        project_id,
        personnel_id,
        notify_days_before = 1
    } = req.body;
    
    if (!title || !event_date || !type) {
        return res.status(400).json({ error: 'Title, event_date, and type are required' });
    }
    
    try {
        const result = await db.query(`
            INSERT INTO calendar_events (
                title, description, event_date, event_time, type, priority,
                amount, category, recurrence, project_id, personnel_id, notify_days_before
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING *
        `, [
            title, description, event_date, event_time, type, priority,
            amount, category, recurrence, project_id, personnel_id, notify_days_before
        ]);
        
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating event:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * PUT /api/calendar/events/:id
 * Actualizar evento existente
 */
router.put('/events/:id', async (req, res) => {
    const { id } = req.params;
    const {
        title,
        description,
        event_date,
        event_time,
        type,
        priority,
        amount,
        category,
        project_id,
        personnel_id,
        notify_days_before
    } = req.body;
    
    try {
        const result = await db.query(`
            UPDATE calendar_events 
            SET title = $1, description = $2, event_date = $3, event_time = $4,
                type = $5, priority = $6, amount = $7, category = $8,
                project_id = $9, personnel_id = $10, notify_days_before = $11,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $12
            RETURNING *
        `, [
            title, description, event_date, event_time, type, priority,
            amount, category, project_id, personnel_id, notify_days_before, id
        ]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Event not found' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating event:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * DELETE /api/calendar/events/:id
 * Eliminar evento
 */
router.delete('/events/:id', async (req, res) => {
    const { id } = req.params;
    
    try {
        const result = await db.query('DELETE FROM calendar_events WHERE id = $1 RETURNING *', [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Event not found' });
        }
        
        res.json({ message: 'Event deleted successfully' });
    } catch (error) {
        console.error('Error deleting event:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * PATCH /api/calendar/events/:id/complete
 * Marcar evento como completado
 */
router.patch('/events/:id/complete', async (req, res) => {
    const { id } = req.params;
    
    try {
        const result = await db.query(`
            UPDATE calendar_events 
            SET is_completed = true, 
                status = 'completed',
                completed_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING *
        `, [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Event not found' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error completing event:', error);
        res.status(500).json({ error: error.message });
    }
});

// =====================================================
// EVENTOS DE NÓMINA
// =====================================================

/**
 * GET /api/calendar/payroll-events
 * Obtener eventos de nómina
 */
router.get('/payroll-events', async (req, res) => {
    const { year, month, status } = req.query;
    
    try {
        let query = `
            SELECT pe.*, 
                   COUNT(ce.id) as calendar_events_count
            FROM payroll_events pe
            LEFT JOIN calendar_events ce ON pe.id = ce.payroll_period_id
            WHERE 1=1
        `;
        const params = [];
        let paramIndex = 1;
        
        if (year) {
            query += ` AND pe.year = $${paramIndex++}`;
            params.push(parseInt(year));
        }
        
        if (month) {
            query += ` AND pe.month = $${paramIndex++}`;
            params.push(parseInt(month));
        }
        
        if (status) {
            query += ` AND pe.status = $${paramIndex++}`;
            params.push(status);
        }
        
        query += ` GROUP BY pe.id ORDER BY pe.year DESC, pe.month DESC`;
        
        const result = await db.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching payroll events:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/calendar/payroll-events
 * Crear evento de nómina (automáticamente crea eventos de calendario)
 */
router.post('/payroll-events', async (req, res) => {
    const {
        year,
        month,
        period_type = 'monthly',
        cutoff_date,
        process_date,
        payment_date,
        notes
    } = req.body;
    
    if (!year || !month || !cutoff_date || !process_date || !payment_date) {
        return res.status(400).json({ 
            error: 'Year, month, cutoff_date, process_date, and payment_date are required' 
        });
    }
    
    try {
        const result = await db.query(`
            INSERT INTO payroll_events (
                year, month, period_type, cutoff_date, process_date, payment_date, notes
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `, [year, month, period_type, cutoff_date, process_date, payment_date, notes]);
        
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating payroll event:', error);
        res.status(500).json({ error: error.message });
    }
});

// =====================================================
// EVENTOS DE PROYECTO
// =====================================================

/**
 * GET /api/calendar/project-events
 * Obtener eventos de proyectos
 */
router.get('/project-events', async (req, res) => {
    const { project_id, start_date, end_date, type } = req.query;
    
    try {
        let query = `
            SELECT pe.*, p.name as project_name, c.name as client_name
            FROM project_events pe
            JOIN projects p ON pe.project_id = p.id
            LEFT JOIN clients c ON p.client_id = c.id
            WHERE 1=1
        `;
        const params = [];
        let paramIndex = 1;
        
        if (project_id) {
            query += ` AND pe.project_id = $${paramIndex++}`;
            params.push(project_id);
        }
        
        if (start_date) {
            query += ` AND pe.event_date >= $${paramIndex++}`;
            params.push(start_date);
        }
        
        if (end_date) {
            query += ` AND pe.event_date <= $${paramIndex++}`;
            params.push(end_date);
        }
        
        if (type) {
            query += ` AND pe.type = $${paramIndex++}`;
            params.push(type);
        }
        
        query += ` ORDER BY pe.event_date ASC`;
        
        const result = await db.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching project events:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/calendar/project-events
 * Crear evento de proyecto
 */
router.post('/project-events', async (req, res) => {
    const {
        project_id,
        title,
        description,
        event_date,
        type,
        priority = 'medium',
        notes
    } = req.body;
    
    if (!project_id || !title || !event_date || !type) {
        return res.status(400).json({ 
            error: 'Project_id, title, event_date, and type are required' 
        });
    }
    
    try {
        const result = await db.query(`
            INSERT INTO project_events (
                project_id, title, description, event_date, type, priority, notes
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `, [project_id, title, description, event_date, type, priority, notes]);
        
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating project event:', error);
        res.status(500).json({ error: error.message });
    }
});

// =====================================================
// DASHBOARD Y RESÚMENES
// =====================================================

/**
 * GET /api/calendar/summary
 * Obtener resumen del calendario
 */
router.get('/summary', async (req, res) => {
    try {
        // Obtener resumen usando la función de la base de datos
        const summaryResult = await db.query('SELECT get_calendar_summary() as summary');
        const summary = summaryResult.rows[0].summary;
        
        // Obtener próximos eventos de nómina
        const payrollResult = await db.query(`
            SELECT * FROM get_upcoming_payroll_events(30)
        `);
        
        // Obtener deadlines de proyectos próximos
        const deadlinesResult = await db.query(`
            SELECT 
                pe.*, 
                p.name as project_name,
                c.name as client_name
            FROM project_events pe
            JOIN projects p ON pe.project_id = p.id
            LEFT JOIN clients c ON p.client_id = c.id
            WHERE pe.event_date BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '30 days')
            AND pe.type IN ('deadline', 'completion')
            AND pe.status = 'pending'
            ORDER BY pe.event_date ASC
            LIMIT 10
        `);
        
        // Obtener pagos pendientes
        const paymentsResult = await db.query(`
            SELECT *
            FROM calendar_events 
            WHERE type = 'payment'
            AND status = 'pending'
            AND event_date BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '30 days')
            ORDER BY event_date ASC
            LIMIT 10
        `);
        
        res.json({
            ...summary,
            upcoming_payroll: payrollResult.rows,
            upcoming_deadlines: deadlinesResult.rows,
            pending_payments: paymentsResult.rows
        });
    } catch (error) {
        console.error('Error fetching calendar summary:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/calendar/dashboard
 * Obtener eventos para el dashboard
 */
router.get('/dashboard', async (req, res) => {
    try {
        // Eventos de hoy
        const todayResult = await db.query(`
            SELECT * FROM calendar_events 
            WHERE event_date = CURRENT_DATE
            AND status = 'pending'
            ORDER BY event_time ASC NULLS LAST
        `);
        
        // Eventos de esta semana
        const weekResult = await db.query(`
            SELECT * FROM calendar_events 
            WHERE event_date BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '7 days')
            AND status = 'pending'
            ORDER BY event_date ASC, event_time ASC NULLS LAST
            LIMIT 10
        `);
        
        // Eventos vencidos
        const overdueResult = await db.query(`
            SELECT * FROM calendar_events 
            WHERE status = 'overdue'
            ORDER BY event_date DESC
            LIMIT 5
        `);
        
        // Próximo evento de nómina
        const nextPayrollResult = await db.query(`
            SELECT * FROM get_upcoming_payroll_events(60)
            ORDER BY days_until ASC
            LIMIT 1
        `);
        
        res.json({
            today: todayResult.rows,
            thisWeek: weekResult.rows,
            overdue: overdueResult.rows,
            nextPayroll: nextPayrollResult.rows[0] || null
        });
    } catch (error) {
        console.error('Error fetching dashboard events:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/calendar/upcoming-payments
 * Obtener próximos pagos
 */
router.get('/upcoming-payments', (req, res) => {
    console.log('Route hit: upcoming-payments');
    const days_ahead = req.query.days_ahead || 30;
    
    db.query(`
        SELECT 
            ce.*,
            p.name as project_name,
            c.name as client_name,
            (ce.event_date - CURRENT_DATE)::INTEGER as days_until
        FROM calendar_events ce
        LEFT JOIN projects p ON ce.project_id = p.id
        LEFT JOIN clients c ON p.client_id = c.id
        WHERE ce.type IN ('payment', 'reminder')
        AND ce.status = 'pending'
        AND ce.event_date BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '${days_ahead} days')
        ORDER BY ce.event_date ASC, ce.priority DESC
    `).then(result => {
        res.json(result.rows);
    }).catch(error => {
        console.error('Database query error:', error);
        res.status(500).json({ error: 'Database query failed: ' + error.message });
    });
});

/**
 * GET /api/calendar/payments-upcoming
 * Alternative route for upcoming payments
 */
router.get('/payments-upcoming', (req, res) => {
    const days_ahead = 30;
    
    db.query(`
        SELECT 
            ce.*,
            p.name as project_name,
            c.name as client_name,
            (ce.event_date - CURRENT_DATE)::INTEGER as days_until
        FROM calendar_events ce
        LEFT JOIN projects p ON ce.project_id = p.id
        LEFT JOIN clients c ON p.client_id = c.id
        WHERE ce.type IN ('payment', 'reminder')
        AND ce.status = 'pending'
        AND ce.event_date BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '30 days')
        ORDER BY ce.event_date ASC, ce.priority DESC
    `).then(result => {
        res.json(result.rows);
    }).catch(error => {
        console.error('Database query error:', error);
        res.status(500).json({ error: 'Database query failed: ' + error.message });
    });
});

module.exports = router;