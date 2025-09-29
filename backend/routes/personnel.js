const express = require('express');
const router = express.Router();
const { db } = require('../database/connection');

// Obtener todos los empleados
router.get('/', async (req, res) => {
    try {
        const { status, department } = req.query;
        
        let query = `
            SELECT
                p.id, p.name, p.document_type, p.document_number, p.phone, p.email, p.address,
                p.position, p.department, p.hire_date, p.status,
                p.salary_base, p.daily_rate, p.expected_arrival_time, p.expected_departure_time,
                p.arl_risk_class, p.emergency_contact, p.emergency_phone, p.bank_account,
                p.created_at, p.updated_at,
                COUNT(te.id) as total_time_entries,
                COALESCE(SUM(te.hours_worked), 0) as total_hours_worked,
                COALESCE(SUM(te.total_pay), 0) as total_earnings
            FROM personnel p
            LEFT JOIN time_entries te ON p.id = te.personnel_id
                AND te.work_date >= DATE_TRUNC('month', CURRENT_DATE)
            WHERE 1=1
        `;
        
        const params = [];
        
        if (status) {
            query += ` AND p.status = $${params.length + 1}`;
            params.push(status);
        }
        
        if (department) {
            query += ` AND p.department = $${params.length + 1}`;
            params.push(department);
        }
        
        query += `
            GROUP BY p.id
            ORDER BY p.name
        `;
        
        const result = await db.query(query, params);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// =====================================================
// ESTADÍSTICAS Y ANÁLISIS (antes de /:id para evitar conflictos)
// =====================================================

// Obtener estadísticas generales de empleados
router.get('/stats', async (req, res) => {
    try {
        // Obtener estadísticas básicas
        const basicStatsQuery = `
            SELECT 
                COUNT(*) as total,
                COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
                COUNT(CASE WHEN status = 'inactive' THEN 1 END) as inactive,
                COUNT(CASE WHEN status = 'terminated' THEN 1 END) as terminated
            FROM personnel
        `;
        
        // Estadísticas por departamento
        const departmentStatsQuery = `
            SELECT 
                department,
                COUNT(*) as count
            FROM personnel
            WHERE status = 'active'
            GROUP BY department
            ORDER BY count DESC
        `;
        
        // Estadísticas por posición
        const positionStatsQuery = `
            SELECT 
                position,
                COUNT(*) as count
            FROM personnel
            WHERE status = 'active'
            GROUP BY position
            ORDER BY count DESC
        `;
        
        // Cálculo de costos salariales con nueva lógica
        const salaryStatsQuery = `
            SELECT
                AVG(daily_rate / 7.3) as avg_hourly_rate,
                SUM(salary_base) as total_monthly_base,
                COUNT(*) as total_employees
            FROM personnel
            WHERE status = 'active'
            AND salary_base IS NOT NULL AND salary_base > 0
            AND daily_rate IS NOT NULL AND daily_rate > 0
        `;
        
        // Ejecutar todas las consultas en paralelo
        const [basicStats, departmentStats, positionStats, salaryStats] = await Promise.all([
            db.query(basicStatsQuery),
            db.query(departmentStatsQuery),
            db.query(positionStatsQuery),
            db.query(salaryStatsQuery)
        ]);
        
        const basic = basicStats.rows[0];
        const salary = salaryStats.rows[0];
        
        // Procesar estadísticas por departamento
        const byDepartment = {};
        departmentStats.rows.forEach(row => {
            byDepartment[row.department || 'Sin Departamento'] = parseInt(row.count);
        });
        
        // Procesar estadísticas por posición
        const byPosition = {};
        positionStats.rows.forEach(row => {
            byPosition[row.position || 'Sin Posición'] = parseInt(row.count);
        });
        
        // Calcular costos mensuales con prestaciones sociales colombianas
        const totalMonthlyBase = parseFloat(salary.total_monthly_base) || 0;
        const totalMonthlyCost = Math.round(totalMonthlyBase * 1.58); // Factor prestacional
        const avgHourlyRate = Math.round(parseFloat(salary.avg_hourly_rate) || 0);

        const stats = {
            total: parseInt(basic.total),
            active: parseInt(basic.active),
            inactive: parseInt(basic.inactive),
            terminated: parseInt(basic.terminated),
            byDepartment,
            byPosition,
            averageHourlyRate: avgHourlyRate,
            totalMonthlyCost,
            salaryDetails: {
                totalMonthlyBase: Math.round(totalMonthlyBase),
                totalEmployees: parseInt(salary.total_employees),
                prestationsFactor: 1.58
            }
        };
        
        res.json(stats);
        
    } catch (error) {
        console.error('Error obteniendo estadísticas de empleados:', error);
        res.status(500).json({ 
            error: 'Error interno del servidor',
            details: error.message 
        });
    }
});

// Obtener empleado por ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await db.query(`
            SELECT
                p.id, p.name, p.document_type, p.document_number, p.phone, p.email, p.address,
                p.position, p.department, p.hire_date, p.status,
                p.salary_base, p.daily_rate, p.expected_arrival_time, p.expected_departure_time,
                p.arl_risk_class, p.emergency_contact, p.emergency_phone, p.bank_account,
                p.created_at, p.updated_at,
                COUNT(te.id) as total_time_entries,
                COALESCE(SUM(te.hours_worked), 0) as total_hours_worked,
                COALESCE(SUM(te.overtime_hours), 0) as total_overtime_hours,
                COALESCE(SUM(te.total_pay), 0) as total_earnings,
                COALESCE(AVG(te.hours_worked), 0) as avg_daily_hours
            FROM personnel p
            LEFT JOIN time_entries te ON p.id = te.personnel_id
            WHERE p.id = $1
            GROUP BY p.id
        `, [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Empleado no encontrado' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Crear nuevo empleado
router.post('/', async (req, res) => {
    try {
        const {
            name,
            document_type = 'CC',
            document_number,
            phone,
            email,
            address,
            position,
            department,
            hire_date,
            status = 'active',
            salary_base,
            daily_rate,
            expected_arrival_time = '07:00',
            expected_departure_time = '15:30',
            arl_risk_class = 'V',
            emergency_contact,
            emergency_phone,
            bank_account
        } = req.body;
        
        
        // Validaciones básicas
        if (!name || !document_number || !position || !department || !hire_date) {
            return res.status(400).json({
                error: 'Campos requeridos: name, document_number, position, department, hire_date'
            });
        }

        if (!salary_base || salary_base < 1300000) {
            return res.status(400).json({
                error: 'salary_base es requerido y debe ser al menos el salario mínimo (1,300,000)'
            });
        }

        if (!daily_rate || daily_rate <= 0) {
            return res.status(400).json({
                error: 'daily_rate es requerido y debe ser mayor a 0'
            });
        }
        
        const result = await db.query(`
            INSERT INTO personnel (
                name, document_type, document_number, phone, email, address,
                position, department, hire_date, status, salary_base, daily_rate,
                expected_arrival_time, expected_departure_time, arl_risk_class,
                emergency_contact, emergency_phone, bank_account
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18
            )
            RETURNING *
        `, [
            name, document_type, document_number, phone, email, address,
            position, department, hire_date, status, salary_base, daily_rate,
            expected_arrival_time, expected_departure_time, arl_risk_class,
            emergency_contact, emergency_phone, bank_account
        ]);
        
        res.status(201).json(result.rows[0]);
    } catch (error) {
        if (error.code === '23505') { // Unique violation
            return res.status(409).json({ error: 'Número de documento ya existe' });
        }
        res.status(500).json({ error: error.message });
    }
});

// Actualizar empleado
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const {
            name,
            document_type,
            document_number,
            phone,
            email,
            address,
            position,
            department,
            hire_date,
            status,
            salary_base,
            daily_rate,
            expected_arrival_time,
            expected_departure_time,
            arl_risk_class,
            emergency_contact,
            emergency_phone,
            bank_account
        } = req.body;
        
        
        // Validaciones condicionales para nuevos campos
        if (salary_base !== undefined && salary_base < 1300000) {
            return res.status(400).json({
                error: 'salary_base debe ser al menos el salario mínimo (1,300,000)'
            });
        }

        if (daily_rate !== undefined && daily_rate <= 0) {
            return res.status(400).json({
                error: 'daily_rate debe ser mayor a 0'
            });
        }
        
        
        const result = await db.query(`
            UPDATE personnel SET
                name = COALESCE($1, name),
                document_type = COALESCE($2, document_type),
                document_number = COALESCE($3, document_number),
                phone = COALESCE($4, phone),
                email = COALESCE($5, email),
                address = COALESCE($6, address),
                position = COALESCE($7, position),
                department = COALESCE($8, department),
                hire_date = COALESCE($9, hire_date),
                status = COALESCE($10, status),
                salary_base = COALESCE($11, salary_base),
                daily_rate = COALESCE($12, daily_rate),
                expected_arrival_time = COALESCE($13, expected_arrival_time),
                expected_departure_time = COALESCE($14, expected_departure_time),
                arl_risk_class = COALESCE($15, arl_risk_class),
                emergency_contact = COALESCE($16, emergency_contact),
                emergency_phone = COALESCE($17, emergency_phone),
                bank_account = COALESCE($18, bank_account),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $19
            RETURNING *
        `, [
            name, document_type, document_number, phone, email, address,
            position, department, hire_date, status, salary_base, daily_rate,
            expected_arrival_time, expected_departure_time, arl_risk_class,
            emergency_contact, emergency_phone, bank_account, id
        ]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Empleado no encontrado' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        if (error.code === '23505') { // Unique violation
            return res.status(409).json({ error: 'Número de documento ya existe' });
        }
        res.status(500).json({ error: error.message });
    }
});

// Cambiar estado del empleado
router.put('/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        
        // Validar estado
        const validStatuses = ['active', 'inactive', 'terminated'];
        if (!status || !validStatuses.includes(status)) {
            return res.status(400).json({ 
                error: 'Estado inválido. Use: active, inactive, terminated' 
            });
        }
        
        const result = await db.query(`
            UPDATE personnel 
            SET status = $1, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
            RETURNING *
        `, [status, id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Empleado no encontrado' });
        }
        
        res.json({ 
            message: `Estado del empleado cambiado a ${status}`, 
            employee: result.rows[0] 
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Eliminar empleado permanentemente de la base de datos
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Verificar si el empleado tiene registros de tiempo
        const timeEntriesCheck = await db.query(`
            SELECT COUNT(*) as count FROM time_entries WHERE personnel_id = $1
        `, [id]);
        
        if (parseInt(timeEntriesCheck.rows[0].count) > 0) {
            return res.status(409).json({ 
                error: 'No se puede eliminar el empleado porque tiene registros de horas trabajadas. Use cambio de estado en su lugar.' 
            });
        }
        
        // Verificar si el empleado tiene registros de nómina
        const payrollCheck = await db.query(`
            SELECT COUNT(*) as count FROM payroll_details WHERE personnel_id = $1
        `, [id]);
        
        if (parseInt(payrollCheck.rows[0].count) > 0) {
            return res.status(409).json({ 
                error: 'No se puede eliminar el empleado porque tiene registros de nómina. Use cambio de estado en su lugar.' 
            });
        }
        
        // Eliminar permanentemente
        const result = await db.query(`
            DELETE FROM personnel WHERE id = $1 RETURNING name
        `, [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Empleado no encontrado' });
        }
        
        res.json({ 
            message: `Empleado ${result.rows[0].name} eliminado permanentemente de la base de datos` 
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Registrar horas trabajadas
router.post('/:id/time-entries', async (req, res) => {
    try {
        const { id: personnel_id } = req.params;
        const { project_id, work_date, hours_worked, overtime_hours = 0, description } = req.body;
        
        if (!project_id || !work_date || !hours_worked) {
            return res.status(400).json({ 
                error: 'Campos requeridos: project_id, work_date, hours_worked' 
            });
        }
        
        // Obtener tarifa del empleado con nueva lógica
        const personnelResult = await db.query(
            'SELECT salary_base, daily_rate FROM personnel WHERE id = $1',
            [personnel_id]
        );

        if (personnelResult.rows.length === 0) {
            return res.status(404).json({ error: 'Empleado no encontrado' });
        }

        const employee = personnelResult.rows[0];
        const hourly_rate = employee.daily_rate ? (employee.daily_rate / 7.3) : 0; // 7.3 horas legales
        
        const result = await db.query(`
            INSERT INTO time_entries (
                personnel_id, project_id, work_date, hours_worked, 
                overtime_hours, description, hourly_rate
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `, [personnel_id, project_id, work_date, hours_worked, overtime_hours, description, hourly_rate]);
        
        res.status(201).json(result.rows[0]);
    } catch (error) {
        if (error.code === '23505') { // Unique violation
            return res.status(409).json({ 
                error: 'Ya existe registro de horas para este empleado en este proyecto y fecha' 
            });
        }
        res.status(500).json({ error: error.message });
    }
});

// Obtener horas trabajadas de un empleado
router.get('/:id/time-entries', async (req, res) => {
    try {
        const { id } = req.params;
        const { start_date, end_date, project_id } = req.query;
        
        let query = `
            SELECT 
                te.*,
                p.name as project_name
            FROM time_entries te
            JOIN projects p ON te.project_id = p.id
            WHERE te.personnel_id = $1
        `;
        
        const params = [id];
        
        if (start_date) {
            query += ` AND te.work_date >= $${params.length + 1}`;
            params.push(start_date);
        }
        
        if (end_date) {
            query += ` AND te.work_date <= $${params.length + 1}`;
            params.push(end_date);
        }
        
        if (project_id) {
            query += ` AND te.project_id = $${params.length + 1}`;
            params.push(project_id);
        }
        
        query += ` ORDER BY te.work_date DESC`;
        
        const result = await db.query(query, params);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// =====================================================
// ASIGNACIONES A PROYECTOS
// =====================================================

// Obtener asignaciones de un empleado
router.get('/:id/assignments', async (req, res) => {
    try {
        const { id } = req.params;
        
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
        `, [id]);
        
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Asignar empleado a proyecto
router.post('/:id/assign', async (req, res) => {
    try {
        const { id: personnel_id } = req.params;
        const { project_id, role, hours_per_day = 8, is_primary = false } = req.body;
        
        if (!project_id) {
            return res.status(400).json({ error: 'project_id es requerido' });
        }
        
        // Verificar que el empleado existe
        const personnelCheck = await db.query('SELECT id, name FROM personnel WHERE id = $1', [personnel_id]);
        if (personnelCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Empleado no encontrado' });
        }
        
        // Verificar que el proyecto existe
        const projectCheck = await db.query('SELECT id, name FROM projects WHERE id = $1', [project_id]);
        if (projectCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Proyecto no encontrado' });
        }
        
        const result = await db.query(`
            INSERT INTO project_assignments (
                personnel_id, project_id, start_date, role,
                expected_hours_per_day, is_primary_project, status, notes, created_by
            ) VALUES ($1, $2, CURRENT_DATE, $3, $4, $5, 'active', $6, 'api_personnel')
            ON CONFLICT (personnel_id, project_id, start_date) DO UPDATE SET
                expected_hours_per_day = EXCLUDED.expected_hours_per_day,
                role = EXCLUDED.role,
                is_primary_project = EXCLUDED.is_primary_project,
                status = 'active',
                updated_at = CURRENT_TIMESTAMP
            RETURNING *
        `, [
            personnel_id, 
            project_id, 
            role || 'trabajador',
            hours_per_day,
            is_primary,
            `Asignado via API personnel - ${role || 'trabajador'}`
        ]);
        
        res.status(201).json({
            message: `Empleado ${personnelCheck.rows[0].name} asignado a ${projectCheck.rows[0].name}`,
            assignment: result.rows[0]
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Desasignar empleado de proyecto
router.delete('/:id/unassign/:projectId', async (req, res) => {
    try {
        const { id: personnel_id, projectId: project_id } = req.params;
        
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

module.exports = router;