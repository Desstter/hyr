// =====================================================
// TIME ENTRIES API ROUTES - SISTEMA HYR CONSTRUCTORA & SOLDADURA
// Gestión de registros de horas trabajadas con integración a nómina
// =====================================================

const express = require('express');
const router = express.Router();
const { db } = require('../database/connection');

// =====================================================
// CONSTANTES Y VALIDACIONES
// =====================================================

const MAX_REGULAR_HOURS_PER_DAY = 8;
const MAX_TOTAL_HOURS_PER_DAY = 12; // 8 regulares + 4 extras máximo legal
const OVERTIME_MULTIPLIER = 1.25; // 25% adicional por horas extra

const TIME_ENTRY_STATUSES = {
  DRAFT: 'draft',
  SUBMITTED: 'submitted', 
  APPROVED: 'approved',
  PAYROLL_LOCKED: 'payroll_locked',
  REJECTED: 'rejected'
};

// =====================================================
// FUNCIONES DE VALIDACIÓN
// =====================================================

async function validateTimeEntry(data) {
  const errors = [];
  const warnings = [];

  // Validaciones básicas
  if (!data.personnel_id) errors.push('personnel_id es requerido');
  if (!data.project_id) errors.push('project_id es requerido');
  if (!data.work_date) errors.push('work_date es requerida');
  if (!data.hours_worked || data.hours_worked <= 0) {
    errors.push('hours_worked debe ser mayor a 0');
  }

  // Validar límites de horas
  const totalHours = parseFloat(data.hours_worked) + (parseFloat(data.overtime_hours) || 0);
  if (totalHours > MAX_TOTAL_HOURS_PER_DAY) {
    errors.push(`Total de horas (${totalHours}) excede máximo legal de ${MAX_TOTAL_HOURS_PER_DAY} horas por día`);
  }

  if (parseFloat(data.hours_worked) > MAX_REGULAR_HOURS_PER_DAY) {
    warnings.push(`Horas regulares (${data.hours_worked}) exceden ${MAX_REGULAR_HOURS_PER_DAY}h. Se recomienda registrar como sobretiempo`);
  }

  // Validar que empleado existe y está activo
  if (data.personnel_id) {
    const personnel = await db.query(
      'SELECT id, name, status FROM personnel WHERE id = $1',
      [data.personnel_id]
    );
    if (personnel.rows.length === 0) {
      errors.push('Empleado no encontrado');
    } else if (personnel.rows[0].status !== 'active') {
      errors.push('No se pueden registrar horas para empleados inactivos');
    }
  }

  // Validar que proyecto existe
  if (data.project_id) {
    const project = await db.query(
      'SELECT id, name, status FROM projects WHERE id = $1',
      [data.project_id]
    );
    if (project.rows.length === 0) {
      errors.push('Proyecto no encontrado');
    }
  }

  // Validar asignación empleado-proyecto
  if (data.personnel_id && data.project_id) {
    const assignment = await db.query(`
      SELECT id FROM project_assignments 
      WHERE personnel_id = $1 AND project_id = $2 AND status = 'active'
    `, [data.personnel_id, data.project_id]);
    
    if (assignment.rows.length === 0) {
      warnings.push('Empleado no está asignado oficialmente al proyecto');
    }
  }

  // Validar que no existe entrada duplicada para el mismo día
  if (data.personnel_id && data.project_id && data.work_date) {
    const existing = await db.query(`
      SELECT id FROM time_entries 
      WHERE personnel_id = $1 AND project_id = $2 AND work_date = $3
    `, [data.personnel_id, data.project_id, data.work_date]);
    
    if (existing.rows.length > 0) {
      errors.push('Ya existe registro de horas para este empleado, proyecto y fecha');
    }
  }

  // Validar que la fecha no esté en período de nómina ya procesado
  const payrollCheck = await db.query(`
    SELECT pp.id, pp.status 
    FROM payroll_periods pp 
    WHERE $1 BETWEEN pp.start_date AND pp.end_date 
    AND pp.status IN ('processing', 'completed')
  `, [data.work_date]);

  if (payrollCheck.rows.length > 0) {
    errors.push(`No se pueden registrar horas para fecha ${data.work_date}. El período de nómina ya fue procesado`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

async function calculatePay(personnelId, regularHours, overtimeHours) {
  // Obtener tarifa del empleado
  const personnel = await db.query(`
    SELECT hourly_rate, monthly_salary, salary_type 
    FROM personnel WHERE id = $1
  `, [personnelId]);

  if (personnel.rows.length === 0) {
    throw new Error('Empleado no encontrado');
  }

  const employee = personnel.rows[0];
  let hourlyRate;

  if (employee.salary_type === 'hourly') {
    hourlyRate = employee.hourly_rate;
  } else {
    // Convertir salario mensual a hourly (192 horas mensuales estándar)
    hourlyRate = employee.monthly_salary / 192;
  }

  const regularPay = regularHours * hourlyRate;
  const overtimePay = overtimeHours * hourlyRate * OVERTIME_MULTIPLIER;
  const totalPay = regularPay + overtimePay;

  return {
    hourly_rate: hourlyRate,
    regular_pay: regularPay,
    overtime_pay: overtimePay,
    total_pay: totalPay
  };
}

// =====================================================
// RUTAS PRINCIPALES
// =====================================================

// Obtener todas las entradas de tiempo con filtros
router.get('/', async (req, res) => {
  try {
    const {
      personnel_id,
      project_id,
      start_date,
      end_date,
      status = 'all',
      limit = 50,
      offset = 0
    } = req.query;

    let query = `
      SELECT 
        te.*,
        p.name as personnel_name,
        p.position,
        pr.name as project_name,
        c.name as client_name
      FROM time_entries te
      JOIN personnel p ON te.personnel_id = p.id
      JOIN projects pr ON te.project_id = pr.id
      LEFT JOIN clients c ON pr.client_id = c.id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (personnel_id) {
      query += ` AND te.personnel_id = $${params.length + 1}`;
      params.push(personnel_id);
    }
    
    if (project_id) {
      query += ` AND te.project_id = $${params.length + 1}`;
      params.push(project_id);
    }
    
    if (start_date) {
      query += ` AND te.work_date >= $${params.length + 1}`;
      params.push(start_date);
    }
    
    if (end_date) {
      query += ` AND te.work_date <= $${params.length + 1}`;
      params.push(end_date);
    }

    if (status !== 'all') {
      query += ` AND te.status = $${params.length + 1}`;
      params.push(status);
    }

    // Query para total de registros (usar los mismos parámetros)
    let countQuery = `
      SELECT COUNT(*) as total
      FROM time_entries te
      WHERE 1=1
    `;
    
    const countParams = [];
    
    if (personnel_id) {
      countQuery += ` AND te.personnel_id = $${countParams.length + 1}`;
      countParams.push(personnel_id);
    }
    
    if (project_id) {
      countQuery += ` AND te.project_id = $${countParams.length + 1}`;
      countParams.push(project_id);
    }
    
    if (start_date) {
      countQuery += ` AND te.work_date >= $${countParams.length + 1}`;
      countParams.push(start_date);
    }
    
    if (end_date) {
      countQuery += ` AND te.work_date <= $${countParams.length + 1}`;
      countParams.push(end_date);
    }

    if (status !== 'all') {
      countQuery += ` AND te.status = $${countParams.length + 1}`;
      countParams.push(status);
    }
    
    // Agregar ordenamiento y paginación
    query += ` ORDER BY te.work_date DESC, te.created_at DESC`;
    query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const [result, countResult] = await Promise.all([
      db.query(query, params),
      db.query(countQuery, countParams)
    ]);

    const total = countResult.rows && countResult.rows[0] ? parseInt(countResult.rows[0].total) : 0;
    
    res.json({
      data: result.rows || [],
      total: total,
      page: Math.floor(offset / limit) + 1,
      limit: parseInt(limit),
      totalPages: Math.ceil(total / limit)
    });

  } catch (error) {
    console.error('Error getting time entries:', error);
    res.status(500).json({ error: error.message });
  }
});

// Obtener entrada de tiempo por ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await db.query(`
      SELECT 
        te.*,
        p.name as personnel_name,
        p.position,
        p.department,
        pr.name as project_name,
        c.name as client_name
      FROM time_entries te
      JOIN personnel p ON te.personnel_id = p.id
      JOIN projects pr ON te.project_id = pr.id
      LEFT JOIN clients c ON pr.client_id = c.id
      WHERE te.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Registro de tiempo no encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Crear nueva entrada de tiempo
router.post('/', async (req, res) => {
  try {
    const {
      personnel_id,
      project_id,
      work_date,
      hours_worked,
      overtime_hours = 0,
      description,
      status = TIME_ENTRY_STATUSES.DRAFT
    } = req.body;

    // Validar datos
    const validation = await validateTimeEntry({
      personnel_id,
      project_id,
      work_date,
      hours_worked,
      overtime_hours
    });

    if (!validation.isValid) {
      return res.status(400).json({
        error: 'Errores de validación',
        details: validation.errors,
        warnings: validation.warnings
      });
    }

    // Calcular pagos
    const payInfo = await calculatePay(personnel_id, hours_worked, overtime_hours);

    // Crear registro
    const result = await db.query(`
      INSERT INTO time_entries (
        personnel_id, project_id, work_date, hours_worked, overtime_hours,
        description, status, hourly_rate, regular_pay, overtime_pay, total_pay
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `, [
      personnel_id, project_id, work_date, hours_worked, overtime_hours,
      description, status, payInfo.hourly_rate, payInfo.regular_pay,
      payInfo.overtime_pay, payInfo.total_pay
    ]);

    // Obtener registro completo con nombres
    const fullResult = await db.query(`
      SELECT 
        te.*,
        p.name as personnel_name,
        pr.name as project_name
      FROM time_entries te
      JOIN personnel p ON te.personnel_id = p.id
      JOIN projects pr ON te.project_id = pr.id
      WHERE te.id = $1
    `, [result.rows[0].id]);

    res.status(201).json({
      ...fullResult.rows[0],
      warnings: validation.warnings
    });

  } catch (error) {
    console.error('Error creating time entry:', error);
    res.status(500).json({ error: error.message });
  }
});

// Actualizar entrada de tiempo
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      work_date,
      hours_worked,
      overtime_hours,
      description,
      status
    } = req.body;

    // Verificar que existe y no está bloqueada
    const existing = await db.query(`
      SELECT * FROM time_entries WHERE id = $1
    `, [id]);

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Registro no encontrado' });
    }

    if (existing.rows[0].status === TIME_ENTRY_STATUSES.PAYROLL_LOCKED) {
      return res.status(403).json({ 
        error: 'No se puede modificar registro bloqueado por nómina procesada' 
      });
    }

    // Recalcular pagos si cambiaron las horas
    let payInfo = {};
    if (hours_worked !== undefined || overtime_hours !== undefined) {
      const newRegularHours = hours_worked !== undefined ? hours_worked : existing.rows[0].hours_worked;
      const newOvertimeHours = overtime_hours !== undefined ? overtime_hours : existing.rows[0].overtime_hours;
      
      payInfo = await calculatePay(
        existing.rows[0].personnel_id, 
        newRegularHours, 
        newOvertimeHours
      );
    }

    // Actualizar registro
    const result = await db.query(`
      UPDATE time_entries SET
        work_date = COALESCE($1, work_date),
        hours_worked = COALESCE($2, hours_worked),
        overtime_hours = COALESCE($3, overtime_hours),
        description = COALESCE($4, description),
        status = COALESCE($5, status),
        hourly_rate = COALESCE($6, hourly_rate),
        regular_pay = COALESCE($7, regular_pay),
        overtime_pay = COALESCE($8, overtime_pay),
        total_pay = COALESCE($9, total_pay),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $10
      RETURNING *
    `, [
      work_date, hours_worked, overtime_hours, description, status,
      payInfo.hourly_rate, payInfo.regular_pay, payInfo.overtime_pay, payInfo.total_pay,
      id
    ]);

    res.json(result.rows[0]);

  } catch (error) {
    console.error('Error updating time entry:', error);
    res.status(500).json({ error: error.message });
  }
});

// Eliminar entrada de tiempo
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar que no está bloqueada por nómina
    const existing = await db.query(`
      SELECT status, personnel_id, work_date FROM time_entries WHERE id = $1
    `, [id]);

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Registro no encontrado' });
    }

    if (existing.rows[0].status === TIME_ENTRY_STATUSES.PAYROLL_LOCKED) {
      return res.status(403).json({ 
        error: 'No se puede eliminar registro bloqueado por nómina procesada' 
      });
    }

    await db.query('DELETE FROM time_entries WHERE id = $1', [id]);
    
    res.json({ 
      message: 'Registro eliminado exitosamente',
      deleted: existing.rows[0]
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =====================================================
// RUTAS ESPECIALIZADAS PARA NÓMINA
// =====================================================

// Validar horas de un período antes de procesar nómina
router.get('/validation/:period', async (req, res) => {
  try {
    const { period } = req.params; // Format: YYYY-MM
    
    const [year, month] = period.split('-');
    const startDate = `${year}-${month.padStart(2, '0')}-01`;
    const endDate = `${year}-${month.padStart(2, '0')}-31`;

    // Empleados activos sin registros de tiempo
    const missingEntries = await db.query(`
      SELECT p.id, p.name, p.position 
      FROM personnel p
      WHERE p.status = 'active'
      AND p.id NOT IN (
        SELECT DISTINCT personnel_id 
        FROM time_entries 
        WHERE work_date BETWEEN $1 AND $2
      )
    `, [startDate, endDate]);

    // Registros pendientes de aprobación
    const pendingApproval = await db.query(`
      SELECT COUNT(*) as count
      FROM time_entries 
      WHERE work_date BETWEEN $1 AND $2
      AND status IN ('draft', 'submitted')
    `, [startDate, endDate]);

    // Resumen de horas por empleado
    const hoursSummary = await db.query(`
      SELECT 
        p.name,
        COUNT(te.id) as entries_count,
        SUM(te.hours_worked) as total_regular_hours,
        SUM(te.overtime_hours) as total_overtime_hours,
        SUM(te.total_pay) as total_pay
      FROM personnel p
      LEFT JOIN time_entries te ON p.id = te.personnel_id
        AND te.work_date BETWEEN $1 AND $2
      WHERE p.status = 'active'
      GROUP BY p.id, p.name
      ORDER BY p.name
    `, [startDate, endDate]);

    const isReadyForPayroll = missingEntries.rows.length === 0 && 
                             parseInt(pendingApproval.rows[0].count) === 0;

    res.json({
      period,
      isReadyForPayroll,
      issues: {
        employeesWithoutEntries: missingEntries.rows,
        pendingApprovalCount: parseInt(pendingApproval.rows[0].count)
      },
      summary: hoursSummary.rows
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Aprobar múltiples registros para nómina
router.post('/bulk-approve', async (req, res) => {
  try {
    const { ids, approver_notes } = req.body;
    
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Array de IDs es requerido' });
    }

    // Verificar que ninguno esté bloqueado
    const blocked = await db.query(`
      SELECT id FROM time_entries 
      WHERE id = ANY($1) AND status = $2
    `, [ids, TIME_ENTRY_STATUSES.PAYROLL_LOCKED]);

    if (blocked.rows.length > 0) {
      return res.status(403).json({
        error: 'Algunos registros están bloqueados por nómina',
        blocked_ids: blocked.rows.map(r => r.id)
      });
    }

    // Aprobar registros
    const result = await db.query(`
      UPDATE time_entries 
      SET status = $1, approver_notes = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = ANY($3)
      RETURNING id, personnel_id, work_date
    `, [TIME_ENTRY_STATUSES.APPROVED, approver_notes, ids]);

    res.json({
      message: `${result.rows.length} registros aprobados exitosamente`,
      approved: result.rows
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Bloquear registros cuando se procesa nómina
router.post('/lock-for-payroll', async (req, res) => {
  try {
    const { period, payroll_period_id } = req.body;
    
    const [year, month] = period.split('-');
    const startDate = `${year}-${month.padStart(2, '0')}-01`;
    const endDate = `${year}-${month.padStart(2, '0')}-31`;

    const result = await db.query(`
      UPDATE time_entries 
      SET 
        status = $1,
        payroll_period_id = $2,
        updated_at = CURRENT_TIMESTAMP
      WHERE work_date BETWEEN $3 AND $4
      AND status = $5
      RETURNING id, personnel_id, work_date
    `, [
      TIME_ENTRY_STATUSES.PAYROLL_LOCKED, 
      payroll_period_id, 
      startDate, 
      endDate,
      TIME_ENTRY_STATUSES.APPROVED
    ]);

    res.json({
      message: `${result.rows.length} registros bloqueados para nómina`,
      locked: result.rows
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =====================================================
// RUTAS DE REPORTES Y RESÚMENES
// =====================================================

// Resumen por empleado
router.get('/personnel/:personnelId/summary', async (req, res) => {
  try {
    const { personnelId } = req.params;
    const { start_date, end_date } = req.query;

    let dateFilter = '';
    const params = [personnelId];
    
    if (start_date) {
      dateFilter += ' AND te.work_date >= $2';
      params.push(start_date);
    }
    if (end_date) {
      dateFilter += ` AND te.work_date <= $${params.length + 1}`;
      params.push(end_date);
    }

    const result = await db.query(`
      SELECT 
        COUNT(te.id) as total_entries,
        SUM(te.hours_worked) as total_regular_hours,
        SUM(te.overtime_hours) as total_overtime_hours,
        SUM(te.total_pay) as total_pay,
        COUNT(DISTINCT te.work_date) as days_worked,
        COUNT(DISTINCT te.project_id) as projects_worked,
        AVG(te.hours_worked + te.overtime_hours) as avg_hours_per_day,
        p.name as personnel_name,
        p.position
      FROM time_entries te
      JOIN personnel p ON te.personnel_id = p.id
      WHERE te.personnel_id = $1 ${dateFilter}
      GROUP BY p.id, p.name, p.position
    `, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No se encontraron registros para este empleado' });
    }

    res.json(result.rows[0]);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Resumen por proyecto
router.get('/project/:projectId/summary', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { start_date, end_date } = req.query;

    let dateFilter = '';
    const params = [projectId];
    
    if (start_date) {
      dateFilter += ' AND te.work_date >= $2';
      params.push(start_date);
    }
    if (end_date) {
      dateFilter += ` AND te.work_date <= $${params.length + 1}`;
      params.push(end_date);
    }

    // Query para obtener el resumen agregado
    const summaryResult = await db.query(`
      SELECT 
        COUNT(te.id) as total_entries,
        SUM(te.hours_worked) as total_regular_hours,
        SUM(te.overtime_hours) as total_overtime_hours,
        SUM(te.total_pay) as total_cost,
        COUNT(DISTINCT te.personnel_id) as employees_worked,
        COUNT(DISTINCT te.work_date) as total_days,
        AVG(te.hours_worked + te.overtime_hours) as avg_hours_per_employee,
        pr.name as project_name,
        pr.budget_labor
      FROM time_entries te
      JOIN projects pr ON te.project_id = pr.id
      WHERE te.project_id = $1 ${dateFilter}
      GROUP BY pr.id, pr.name, pr.budget_labor
    `, params);

    // Query para obtener los registros individuales de tiempo con estado de asignación
    const timeEntriesResult = await db.query(`
      SELECT 
        te.*,
        p.name as personnel_name,
        p.position,
        p.department,
        CASE 
          WHEN pa.id IS NOT NULL THEN true 
          ELSE false 
        END as is_officially_assigned
      FROM time_entries te
      JOIN personnel p ON te.personnel_id = p.id
      LEFT JOIN project_assignments pa ON (
        pa.personnel_id = te.personnel_id 
        AND pa.project_id = te.project_id 
        AND pa.status = 'active'
      )
      WHERE te.project_id = $1 ${dateFilter}
      ORDER BY te.work_date DESC, te.created_at DESC
    `, params);

    if (summaryResult.rows.length === 0) {
      return res.status(404).json({ error: 'No se encontraron registros para este proyecto' });
    }

    const summary = summaryResult.rows[0];
    
    // Transform to match frontend expectations
    const response = {
      timeEntries: timeEntriesResult.rows, // Registros individuales reales
      summary: {
        totalHours: (parseFloat(summary.total_regular_hours) || 0) + (parseFloat(summary.total_overtime_hours) || 0),
        totalOvertimeHours: parseFloat(summary.total_overtime_hours) || 0,
        totalCost: parseFloat(summary.total_cost) || 0,
        employeesWorked: parseInt(summary.employees_worked) || 0,
        totalDays: parseInt(summary.total_days) || 0,
        averageHoursPerEmployee: parseFloat(summary.avg_hours_per_employee) || 0,
      },
      budget_vs_actual: {
        budget_labor: summary.budget_labor,
        actual_cost: summary.total_cost,
        variance: summary.budget_labor - summary.total_cost,
        variance_percentage: summary.budget_labor > 0 
          ? ((summary.total_cost - summary.budget_labor) / summary.budget_labor * 100).toFixed(2)
          : 0
      }
    };

    res.json(response);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;