// =====================================================
// API ROUTES - PROJECT ASSIGNMENTS
// Gestión de asignaciones empleado-proyecto
// =====================================================

const express = require('express');
const router = express.Router();
const { db } = require('../database/connection');

// =====================================================
// OBTENER ASIGNACIONES
// =====================================================

// Obtener todas las asignaciones con filtros
router.get('/', async (req, res) => {
    try {
        const { project_id, personnel_id, status = 'active' } = req.query;
        
        let query = `
            SELECT 
                pa.*,
                p.name as personnel_name,
                p.position as personnel_position,
                p.department,
                pr.name as project_name,
                c.name as client_name
            FROM project_assignments pa
            JOIN personnel p ON pa.personnel_id = p.id
            JOIN projects pr ON pa.project_id = pr.id
            LEFT JOIN clients c ON pr.client_id = c.id
            WHERE 1=1
        `;
        
        const params = [];
        
        if (status && status !== 'all') {
            query += ` AND pa.status = $${params.length + 1}`;
            params.push(status);
        }
        
        if (project_id) {
            query += ` AND pa.project_id = $${params.length + 1}`;
            params.push(project_id);
        }
        
        if (personnel_id) {
            query += ` AND pa.personnel_id = $${params.length + 1}`;
            params.push(personnel_id);
        }
        
        query += ` ORDER BY pa.is_primary_project DESC, pa.priority ASC, p.name`;
        
        const result = await db.query(query, params);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Obtener empleados asignados a un proyecto específico
router.get('/project/:projectId/personnel', async (req, res) => {
    try {
        const { projectId } = req.params;
        
        const result = await db.query(`
            SELECT 
                pa.id as assignment_id,
                pa.personnel_id,
                p.name as personnel_name,
                p.position,
                p.department,
                p.hourly_rate,
                p.monthly_salary,
                pa.role,
                pa.expected_hours_per_day,
                pa.is_primary_project,
                pa.priority,
                pa.status as assignment_status,
                pa.start_date,
                pa.end_date,
                pa.notes
            FROM project_assignments pa
            JOIN personnel p ON pa.personnel_id = p.id
            WHERE pa.project_id = $1
            AND pa.status = 'active'
            ORDER BY pa.is_primary_project DESC, pa.priority ASC, p.name
        `, [projectId]);
        
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Obtener proyectos asignados a un empleado específico
router.get('/personnel/:personnelId/projects', async (req, res) => {
    try {
        const { personnelId } = req.params;
        
        const result = await db.query(`
            SELECT 
                pa.id as assignment_id,
                pa.project_id,
                pr.name as project_name,
                pr.status as project_status,
                c.name as client_name,
                pa.role,
                pa.expected_hours_per_day,
                pa.is_primary_project,
                pa.priority,
                pa.status as assignment_status,
                pa.start_date,
                pa.end_date,
                pa.notes
            FROM project_assignments pa
            JOIN projects pr ON pa.project_id = pr.id
            LEFT JOIN clients c ON pr.client_id = c.id
            WHERE pa.personnel_id = $1
            AND pa.status IN ('active', 'paused')
            ORDER BY pa.is_primary_project DESC, pa.priority ASC, pr.name
        `, [personnelId]);
        
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// =====================================================
// CREAR Y MODIFICAR ASIGNACIONES
// =====================================================

// Crear nueva asignación
router.post('/', async (req, res) => {
    try {
        const {
            personnel_id,
            project_id,
            start_date,
            end_date,
            role,
            expected_hours_per_day = 8.0,
            is_primary_project = false,
            priority = 1,
            notes,
            created_by = 'api_user'
        } = req.body;
        
        // Validaciones básicas
        if (!personnel_id || !project_id || !start_date) {
            return res.status(400).json({ 
                error: 'Campos requeridos: personnel_id, project_id, start_date' 
            });
        }
        
        // Verificar que empleado y proyecto existen
        const personnelCheck = await db.query('SELECT id, name FROM personnel WHERE id = $1', [personnel_id]);
        if (personnelCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Empleado no encontrado' });
        }
        
        const projectCheck = await db.query('SELECT id, name FROM projects WHERE id = $1', [project_id]);
        if (projectCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Proyecto no encontrado' });
        }
        
        const result = await db.query(`
            INSERT INTO project_assignments (
                personnel_id, project_id, start_date, end_date, role,
                expected_hours_per_day, is_primary_project, priority,
                status, notes, created_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active', $9, $10)
            RETURNING *
        `, [
            personnel_id, project_id, start_date, end_date, role,
            expected_hours_per_day, is_primary_project, priority,
            notes, created_by
        ]);
        
        // Obtener información completa de la asignación creada
        const fullResult = await db.query(`
            SELECT 
                pa.*,
                p.name as personnel_name,
                pr.name as project_name
            FROM project_assignments pa
            JOIN personnel p ON pa.personnel_id = p.id
            JOIN projects pr ON pa.project_id = pr.id
            WHERE pa.id = $1
        `, [result.rows[0].id]);
        
        res.status(201).json(fullResult.rows[0]);
    } catch (error) {
        if (error.code === '23505') { // Unique violation
            return res.status(409).json({ 
                error: 'Ya existe una asignación para este empleado en este proyecto en la fecha especificada' 
            });
        }
        res.status(500).json({ error: error.message });
    }
});

// Actualizar asignación existente
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const {
            start_date,
            end_date,
            role,
            expected_hours_per_day,
            is_primary_project,
            priority,
            status,
            notes
        } = req.body;
        
        const result = await db.query(`
            UPDATE project_assignments SET
                start_date = COALESCE($1, start_date),
                end_date = COALESCE($2, end_date),
                role = COALESCE($3, role),
                expected_hours_per_day = COALESCE($4, expected_hours_per_day),
                is_primary_project = COALESCE($5, is_primary_project),
                priority = COALESCE($6, priority),
                status = COALESCE($7, status),
                notes = COALESCE($8, notes),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $9
            RETURNING *
        `, [start_date, end_date, role, expected_hours_per_day, is_primary_project, priority, status, notes, id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Asignación no encontrada' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// =====================================================
// ACCIONES ESPECÍFICAS
// =====================================================

// Asignar empleado a proyecto (endpoint simplificado)
router.post('/assign', async (req, res) => {
    try {
        const { personnel_id, project_id, role, hours_per_day = 8 } = req.body;
        
        if (!personnel_id || !project_id) {
            return res.status(400).json({ 
                error: 'personnel_id y project_id son requeridos' 
            });
        }
        
        const result = await db.query(`
            INSERT INTO project_assignments (
                personnel_id, project_id, start_date, role,
                expected_hours_per_day, status, notes, created_by
            ) VALUES ($1, $2, CURRENT_DATE, $3, $4, 'active', $5, 'api_assign')
            ON CONFLICT (personnel_id, project_id, start_date) DO UPDATE SET
                expected_hours_per_day = EXCLUDED.expected_hours_per_day,
                role = EXCLUDED.role,
                status = 'active',
                updated_at = CURRENT_TIMESTAMP
            RETURNING *
        `, [
            personnel_id, 
            project_id, 
            role || 'trabajador',
            hours_per_day,
            `Asignado via API - ${role || 'trabajador'}`
        ]);
        
        res.status(201).json({
            message: 'Empleado asignado exitosamente',
            assignment: result.rows[0]
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Desasignar empleado de proyecto
router.delete('/unassign', async (req, res) => {
    try {
        const { personnel_id, project_id } = req.body;
        
        if (!personnel_id || !project_id) {
            return res.status(400).json({ 
                error: 'personnel_id y project_id son requeridos' 
            });
        }
        
        const result = await db.query(`
            UPDATE project_assignments 
            SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
            WHERE personnel_id = $1 AND project_id = $2 AND status = 'active'
            RETURNING *
        `, [personnel_id, project_id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'No se encontró asignación activa para desasignar' });
        }
        
        res.json({
            message: 'Empleado desasignado exitosamente',
            assignment: result.rows[0]
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Eliminar asignación permanentemente
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await db.query(`
            DELETE FROM project_assignments 
            WHERE id = $1 
            RETURNING personnel_id, project_id, role
        `, [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Asignación no encontrada' });
        }
        
        res.json({ 
            message: 'Asignación eliminada permanentemente',
            deleted: result.rows[0]
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// =====================================================
// REPORTES Y ESTADÍSTICAS
// =====================================================

// Dashboard de asignaciones
router.get('/dashboard', async (req, res) => {
    try {
        const result = await db.query(`
            SELECT 
                COUNT(*) as total_assignments,
                COUNT(CASE WHEN status = 'active' THEN 1 END) as active_assignments,
                COUNT(DISTINCT personnel_id) as assigned_personnel,
                COUNT(DISTINCT project_id) as projects_with_assignments,
                AVG(expected_hours_per_day) as avg_hours_per_day,
                SUM(expected_hours_per_day) as total_expected_hours
            FROM project_assignments
            WHERE status = 'active'
        `);
        
        // Resumen por proyecto
        const projectSummary = await db.query(`
            SELECT 
                pr.id,
                pr.name as project_name,
                COUNT(pa.id) as assigned_personnel,
                SUM(pa.expected_hours_per_day) as total_hours_assigned,
                STRING_AGG(p.name, ', ' ORDER BY p.name) as personnel_names
            FROM projects pr
            LEFT JOIN project_assignments pa ON pr.id = pa.project_id AND pa.status = 'active'
            LEFT JOIN personnel p ON pa.personnel_id = p.id
            GROUP BY pr.id, pr.name
            HAVING COUNT(pa.id) > 0
            ORDER BY total_hours_assigned DESC NULLS LAST
        `);
        
        // Disponibilidad de personal
        const availability = await db.query('SELECT * FROM get_personnel_availability()');
        
        res.json({
            summary: result.rows[0],
            projects: projectSummary.rows,
            personnel_availability: availability.rows
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Obtener disponibilidad de personal
router.get('/availability', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM get_personnel_availability()');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Obtener conflictos de asignación
router.get('/conflicts', async (req, res) => {
    try {
        const result = await db.query(`
            SELECT 
                p.name as personnel_name,
                COUNT(pa.id) as active_assignments,
                SUM(pa.expected_hours_per_day) as total_hours,
                CASE 
                    WHEN SUM(pa.expected_hours_per_day) > 8 THEN 'sobrecargado'
                    WHEN COUNT(pa.id) > 3 THEN 'muchos_proyectos'
                    ELSE 'normal'
                END as conflict_type,
                STRING_AGG(pr.name, ', ') as projects
            FROM personnel p
            JOIN project_assignments pa ON p.id = pa.personnel_id
            JOIN projects pr ON pa.project_id = pr.id
            WHERE pa.status = 'active'
            GROUP BY p.id, p.name
            HAVING SUM(pa.expected_hours_per_day) > 8 OR COUNT(pa.id) > 3
            ORDER BY total_hours DESC
        `);
        
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;