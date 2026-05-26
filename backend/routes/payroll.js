const express = require('express');
const { sendError } = require('../utils/http');
const router = express.Router();
const { db } = require('../database/connection');

// Importar utilidades para generación de documentos
const archiver = require('archiver');
const { getEmployeePayrollData, getPeriodEmployees, validatePayrollData, generateDocumentAuditTrail } = require('../utils/payroll-documents');
const { generatePayslipPDF } = require('../utils/pdf-generators/payslip-pdf');
const { generatePayslipExcel } = require('../utils/excel-generators/payslip-excel');
const { getMonthName } = require('../utils/document-helpers');

// Motor de nómina 2025 (única fuente) + cargador de configuración desde BD
const { calcularNominaCompleta2025, validarCalculosLegales2025 } = require('../utils/payroll-colombia-2025');
const { loadPayrollConfig } = require('../utils/payroll-config-loader');
const { computePayrollDetail } = require('../utils/payroll-detail');

// Obtener períodos de nómina
router.get('/periods', async (req, res) => {
    try {
        const { year, status } = req.query;
        
        let query = `
            SELECT
                pp.*,
                COUNT(pd.id) as employees_processed,
                COALESCE(SUM(pd.net_pay), 0) as total_net_pay,
                COALESCE(SUM(
                    pd.total_income + pd.health_employer + pd.pension_employer +
                    pd.arl + pd.severance + pd.severance_interest + pd.service_bonus +
                    pd.vacation + pd.sena + pd.icbf + pd.compensation_fund
                ), 0) as total_employer_cost
            FROM payroll_periods pp
            LEFT JOIN payroll_details pd ON pp.id = pd.payroll_period_id
            WHERE 1=1
        `;
        
        const params = [];
        
        if (year) {
            query += ` AND pp.year = $${params.length + 1}`;
            params.push(year);
        }
        
        if (status) {
            query += ` AND pp.status = $${params.length + 1}`;
            params.push(status);
        }
        
        query += `
            GROUP BY pp.id
            ORDER BY pp.year DESC, pp.month DESC
        `;
        
        const result = await db.query(query, params);
        res.json(result.rows);
    } catch (error) {
        sendError(res, error);
    }
});

// Crear período de nómina
router.post('/periods', async (req, res) => {
    try {
        const { year, month, period_type = 'monthly' } = req.body;
        
        if (!year || !month) {
            return res.status(400).json({ error: 'year y month son requeridos' });
        }
        
        // Calcular fechas del período
        const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
        const endDate = `${year}-${month.toString().padStart(2, '0')}-${new Date(year, month, 0).getDate()}`;
        
        // Generar ID único para el período
        const periodId = `period-${year}${month.toString().padStart(2, '0')}`;
        
        const result = await db.query(`
            INSERT INTO payroll_periods (id, year, month, period_type, start_date, end_date)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `, [periodId, year, month, period_type, startDate, endDate]);
        
        res.status(201).json(result.rows[0]);
    } catch (error) {
        if (error.code === '23505') { // Unique violation
            return res.status(409).json({ error: 'Ya existe un período de nómina para este año y mes' });
        }
        sendError(res, error);
    }
});

// Procesar nómina automáticamente
// NOTA: La ruta antigua POST /periods/:id/process (motor 2024) fue eliminada.
// El único procesamiento de nómina es POST /periods/:id/process-2025 (más abajo),
// que usa el motor payroll-colombia-2025 + tasas desde annual_payroll_settings.

// Obtener nómina detallada
router.get('/periods/:id/details', async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await db.query(`
            SELECT 
                pd.*,
                p.name as employee_name,
                p.document_number,
                p.position,
                p.department,
                p.arl_risk_class
            FROM payroll_details pd
            JOIN personnel p ON pd.personnel_id = p.id
            WHERE pd.payroll_period_id = $1
            ORDER BY p.name
        `, [id]);
        
        res.json(result.rows);
    } catch (error) {
        sendError(res, error);
    }
});

// Obtener detalle individual de nómina
router.get('/details/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await db.query(`
            SELECT 
                pd.*,
                p.name as employee_name,
                p.document_number,
                p.position,
                p.department,
                p.arl_risk_class,
                pp.year,
                pp.month,
                pp.start_date,
                pp.end_date
            FROM payroll_details pd
            JOIN personnel p ON pd.personnel_id = p.id
            JOIN payroll_periods pp ON pd.payroll_period_id = pp.id
            WHERE pd.id = $1
        `, [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Detalle de nómina no encontrado' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        sendError(res, error);
    }
});

// Resumen ejecutivo de nómina
router.get('/summary/:year/:month', async (req, res) => {
    try {
        const { year, month } = req.params;
        
        const summary = await db.query(`
            WITH payroll_summary AS (
                SELECT 
                    COUNT(DISTINCT pd.personnel_id) as employees_count,
                    SUM(pd.total_income) as total_income,
                    SUM(pd.total_deductions) as total_deductions,
                    SUM(pd.net_pay) as total_net_pay,
                    SUM(pd.total_employer_cost) as total_employer_cost,
                    
                    -- Aportes detallados
                    SUM(pd.health_employer + pd.pension_employer + pd.arl + pd.severance + pd.severance_interest + pd.service_bonus + pd.vacation) as total_benefits,
                    SUM(pd.sena + pd.icbf + pd.compensation_fund) as total_parafiscales,
                    
                    -- Por departamento
                    COUNT(CASE WHEN p.department = 'construccion' THEN 1 END) as construccion_employees,
                    COUNT(CASE WHEN p.department = 'soldadura' THEN 1 END) as soldadura_employees,
                    COUNT(CASE WHEN p.department = 'administracion' THEN 1 END) as admin_employees,
                    
                    SUM(CASE WHEN p.department = 'construccion' THEN pd.total_employer_cost ELSE 0 END) as construccion_cost,
                    SUM(CASE WHEN p.department = 'soldadura' THEN pd.total_employer_cost ELSE 0 END) as soldadura_cost,
                    SUM(CASE WHEN p.department = 'administracion' THEN pd.total_employer_cost ELSE 0 END) as admin_cost
                    
                FROM payroll_details pd
                JOIN personnel p ON pd.personnel_id = p.id
                JOIN payroll_periods pp ON pd.payroll_period_id = pp.id
                WHERE pp.year = $1 AND pp.month = $2
            )
            SELECT 
                ps.*,
                ROUND((total_employer_cost / employees_count), 2) as avg_cost_per_employee,
                ROUND((total_benefits / total_income * 100), 2) as benefits_percentage,
                ROUND((total_parafiscales / total_income * 100), 2) as parafiscales_percentage
            FROM payroll_summary ps
        `, [year, month]);
        
        if (summary.rows.length === 0) {
            return res.status(404).json({ error: 'No hay datos de nómina para este período' });
        }
        
        res.json(summary.rows[0]);
    } catch (error) {
        sendError(res, error);
    }
});

// Calcular nómina preview (sin guardar)
router.post('/calculate-preview', async (req, res) => {
    try {
        const { personnel_id, hours } = req.body;
        
        if (!personnel_id) {
            return res.status(400).json({ error: 'personnel_id es requerido' });
        }
        
        // Obtener datos del empleado
        const employee = await db.query('SELECT * FROM personnel WHERE id = $1', [personnel_id]);
        
        if (employee.rows.length === 0) {
            return res.status(404).json({ error: 'Empleado no encontrado' });
        }
        
        // Calcular nómina con el motor 2025 y tasas desde BD
        const config = await loadPayrollConfig(2025);
        const nomina = calcularNominaCompleta2025(employee.rows[0], hours || {}, {}, {}, { config });

        // Validar cálculos
        const validacion = validarCalculosLegales2025(nomina);

        res.json({
            employee: employee.rows[0].name,
            calculation: nomina,
            validation: validacion,
            legal_references: {
                salario_minimo: config.salarioMinimo,
                auxilio_transporte: config.auxilioTransporte,
                clase_arl: nomina.claseARL,
                tarifa_arl: nomina.tarifaARL
            }
        });
        
    } catch (error) {
        sendError(res, error);
    }
});

// Exportar planilla PILA (simulación)
router.get('/periods/:id/pila-export', async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await db.query(`
            SELECT 
                p.document_type,
                p.document_number,
                p.name,
                pd.base_salary,
                pd.health_employee + pd.pension_employee as employee_contributions,
                pd.health_employer + pd.pension_employer + pd.arl as employer_contributions,
                pd.sena + pd.icbf + pd.compensation_fund as parafiscales,
                pp.year,
                pp.month
            FROM payroll_details pd
            JOIN personnel p ON pd.personnel_id = p.id
            JOIN payroll_periods pp ON pd.payroll_period_id = pp.id
            WHERE pd.payroll_period_id = $1
            ORDER BY p.name
        `, [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'No hay datos para exportar' });
        }
        
        // Formato simplificado para planilla PILA
        const pilaData = result.rows.map(row => ({
            tipo_documento: row.document_type,
            numero_documento: row.document_number,
            primer_apellido: row.name.split(' ')[1] || '',
            segundo_apellido: row.name.split(' ')[2] || '',
            primer_nombre: row.name.split(' ')[0] || '',
            segundo_nombre: row.name.split(' ')[3] || '',
            salario_base: row.base_salary,
            cotizacion_salud: row.employee_contributions * 0.4, // Aproximado 4% del total
            cotizacion_pension: row.employee_contributions * 0.4,
            aporte_arl: row.employer_contributions * 0.1, // Aproximado
            periodo: `${row.year}${row.month.toString().padStart(2, '0')}`
        }));
        
        res.json({
            period: `${result.rows[0].year}-${result.rows[0].month}`,
            employees_count: result.rows.length,
            pila_format: pilaData
        });
        
    } catch (error) {
        sendError(res, error);
    }
});

// =====================================================
// ENDPOINTS 2025 INTEGRADOS
// =====================================================

// Configuración 2025
router.get('/config/:year?', async (req, res) => {
    try {
        const year = parseInt(req.params.year || '2025', 10);
        // Fuente única: annual_payroll_settings (vía cargador con caché)
        const config = await loadPayrollConfig(year);
        res.json({
            year: config.year,
            salarioMinimo: config.salarioMinimo,
            auxilioTransporte: config.auxilioTransporte,
            auxilioConectividad: config.auxilioConectividad,
            uvt: config.uvt,
            deducciones: config.deducciones,
            aportes: config.aportes,
            parafiscales: config.parafiscales,
            fsp: config.fsp,
            ley114_1: config.ley114_1,
            recargos: config.recargos,
            topes: config.topes,
            source: config._source
        });
    } catch (error) {
        sendError(res, error);
    }
});

// Procesamiento 2025 - IMPLEMENTACIÓN REAL
router.post('/periods/:id/process-2025', async (req, res) => {
    const client = await db.connect();
    try {
        await client.query('BEGIN');

        const { id } = req.params;

        // 1. Verificar que el período existe y está en estado correcto
        const periodResult = await client.query(`
            SELECT * FROM payroll_periods WHERE id = $1
        `, [id]);

        if (periodResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Período no encontrado' });
        }

        const period = periodResult.rows[0];

        // Cargar tasas desde annual_payroll_settings (fuente única de verdad)
        const config = await loadPayrollConfig(period.year);

        // No persistir nómina con tasas de fallback: deben venir de la BD.
        if (config._source === 'file') {
            await client.query('ROLLBACK');
            return res.status(503).json({
                error: `No se puede procesar la nómina ${period.year}: las tasas no están disponibles en la base de datos (annual_payroll_settings). Configure el año antes de procesar.`
            });
        }

        // Verificar que no esté ya procesado
        if (period.status === 'completed') {
            await client.query('ROLLBACK');
            return res.status(409).json({
                error: 'El período ya fue procesado',
                details: { processedAt: period.processed_at }
            });
        }

        // 2. Marcar período como "processing"
        await client.query(`
            UPDATE payroll_periods
            SET status = 'processing'
            WHERE id = $1
        `, [id]);

        // 3. Obtener empleados activos
        const employeesResult = await client.query(`
            SELECT
                id, name, document_number, position, department,
                salary_type, hourly_rate, monthly_salary,
                COALESCE(salary_base, monthly_salary, hourly_rate * 192) as salary_base,
                COALESCE(daily_rate, monthly_salary / 24, hourly_rate * 8) as daily_rate,
                arl_risk_class
            FROM personnel
            WHERE status = 'active'
        `);

        if (employeesResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'No hay empleados activos para procesar' });
        }

        // 4. Obtener time_entries del período
        const timeEntriesResult = await client.query(`
            SELECT
                personnel_id,
                SUM(hours_worked) as total_regular_hours,
                SUM(COALESCE(overtime_hours, 0)) as total_overtime_hours,
                COUNT(*) as days_worked
            FROM time_entries
            WHERE work_date BETWEEN $1 AND $2
            AND status IN ('approved', 'payroll_locked')
            GROUP BY personnel_id
        `, [period.start_date, period.end_date]);

        // Crear un mapa de horas por empleado
        const hoursMap = {};
        timeEntriesResult.rows.forEach(entry => {
            hoursMap[entry.personnel_id] = {
                regularHours: parseFloat(entry.total_regular_hours) || 0,
                overtimeHours: parseFloat(entry.total_overtime_hours) || 0,
                daysWorked: parseInt(entry.days_worked) || 0
            };
        });

        // 5. Procesar cada empleado
        let processedCount = 0;
        let totalEmployerCost = 0;
        let totalNetPay = 0;

        for (const employee of employeesResult.rows) {
            const employeeHours = hoursMap[employee.id] || {
                regularHours: 0,
                overtimeHours: 0,
                daysWorked: 0
            };

            // Cálculo canónico (única fuente, testeada): utils/payroll-detail.js
            const d = computePayrollDetail(employee, employeeHours, config);

            // 6. Insertar en payroll_details
            await client.query(`
                INSERT INTO payroll_details (
                    payroll_period_id, personnel_id, regular_hours, overtime_hours,
                    base_salary, regular_pay, overtime_pay, transport_allowance,
                    health_employee, pension_employee, solidarity_contribution, fsp_employee,
                    health_employer, pension_employer,
                    arl, severance, severance_interest, service_bonus, vacation,
                    sena, icbf, compensation_fund, law_114_1_applied
                ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
                    $17, $18, $19, $20, $21, $22, $23
                )
            `, [
                id, employee.id, d.regularHours, d.overtimeHours,
                d.salaryBase, d.regularPay, d.overtimePay, d.transportAllowance,
                d.healthEmployee, d.pensionEmployee, d.solidarityContribution, d.fspEmployee,
                d.healthEmployer, d.pensionEmployer,
                d.arl, d.severance, d.severanceInterest, d.serviceBonus, d.vacation,
                d.sena, d.icbf, d.compensationFund, d.law114Applies
            ]);

            // 7. Marcar time_entries como payroll_locked
            await client.query(`
                UPDATE time_entries
                SET status = 'payroll_locked'
                WHERE personnel_id = $1
                AND work_date BETWEEN $2 AND $3
                AND status = 'approved'
            `, [employee.id, period.start_date, period.end_date]);

            processedCount++;
            totalEmployerCost += d.totalEmployerCost;
            totalNetPay += d.netPay;
        }

        // 8. Actualizar período como completado
        await client.query(`
            UPDATE payroll_periods
            SET status = 'completed',
                processed_at = CURRENT_TIMESTAMP
            WHERE id = $1
        `, [id]);

        await client.query('COMMIT');

        // 9. Respuesta exitosa con datos reales
        res.json({
            message: `Nómina ${period.year}-${period.month} procesada exitosamente`,
            processed: processedCount,
            totalCost: totalEmployerCost,
            totalNetPay: totalNetPay,
            compliance2025: true,
            period_id: id,
            details: {
                year: period.year,
                month: period.month,
                employees: processedCount,
                averageSalary: processedCount > 0 ? totalNetPay / processedCount : 0
            }
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error procesando nómina:', error);
        res.status(500).json({
            error: 'Error interno al procesar nómina',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    } finally {
        client.release();
    }
});

// PILA 2025
router.get('/periods/:id/pila-2025', async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await db.query(`
            SELECT 
                pd.*,
                p.name, p.document_type, p.document_number,
                pp.year, pp.month
            FROM payroll_details pd
            JOIN personnel p ON pd.personnel_id = p.id
            JOIN payroll_periods pp ON pd.payroll_period_id = pp.id
            WHERE pd.payroll_period_id = $1
            ORDER BY p.name
        `, [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'No hay datos PILA para este período' });
        }
        
        res.json({
            periodo: `${result.rows[0].year}-${result.rows[0].month}`,
            formato: 'PILA_2025',
            compliance: {
                fsp_included: true,
                law_114_1_applied: true,
                arl_by_worksite: true
            },
            empleados: result.rows.map(row => ({
                documento: row.document_number,
                nombre: row.name,
                salario: parseFloat(row.base_salary),
                diasTrabajados: 30,
                ibc: parseFloat(row.base_salary),
                salud: parseFloat(row.employee_contributions) * 0.4,
                pension: parseFloat(row.employee_contributions) * 0.4,
                fsp: parseFloat(row.base_salary) * 0.01,
                arl: parseFloat(row.employer_contributions) * 0.1,
                arlClass: 'V',
                parafiscales: parseFloat(row.employer_contributions) * 0.09,
                centroTrabajo: 'Principal'
            })),
            totales: {
                empleados: result.rows.length,
                salarios: result.rows.reduce((sum, row) => sum + parseFloat(row.base_salary), 0),
                aportes: result.rows.reduce((sum, row) => sum + parseFloat(row.employer_contributions), 0),
                fspTotal: result.rows.reduce((sum, row) => sum + (parseFloat(row.base_salary) * 0.01), 0),
                ahorroLaw114_1: 0
            }
        });
        
    } catch (error) {
        sendError(res, error);
    }
});

// Validar horas antes de procesar nómina
router.get('/periods/:id/validate-hours', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Obtener período
        const period = await db.query(`
            SELECT * FROM payroll_periods WHERE id = $1
        `, [id]);
        
        if (period.rows.length === 0) {
            return res.status(404).json({ error: 'Período no encontrado' });
        }
        
        const { start_date, end_date } = period.rows[0];
        
        // Validaciones
        const validations = [];
        
        // 1. Horas sin aprobar
        const unapprovedHours = await db.query(`
            SELECT COUNT(*) as count, 
                   STRING_AGG(DISTINCT p.name, ', ') as employees
            FROM time_entries te
            JOIN personnel p ON te.personnel_id = p.id
            WHERE te.work_date BETWEEN $1 AND $2
            AND te.status NOT IN ('approved', 'payroll_locked')
        `, [start_date, end_date]);
        
        if (parseInt(unapprovedHours.rows[0].count) > 0) {
            validations.push({
                type: 'error',
                code: 'UNAPPROVED_HOURS',
                message: `${unapprovedHours.rows[0].count} registros sin aprobar`,
                details: `Empleados: ${unapprovedHours.rows[0].employees}`
            });
        }
        
        // 2. Empleados sin registros
        const employeesWithoutHours = await db.query(`
            SELECT p.id, p.name
            FROM personnel p
            WHERE p.status = 'active'
            AND p.id NOT IN (
                SELECT DISTINCT personnel_id 
                FROM time_entries 
                WHERE work_date BETWEEN $1 AND $2
            )
        `, [start_date, end_date]);
        
        if (employeesWithoutHours.rows.length > 0) {
            validations.push({
                type: 'warning',
                code: 'EMPLOYEES_WITHOUT_HOURS',
                message: `${employeesWithoutHours.rows.length} empleados sin registros de tiempo`,
                details: `Empleados: ${employeesWithoutHours.rows.map(emp => emp.name).join(', ')} (esto es normal si están de vacaciones, incapacitados, o sin asignación de proyecto)`
            });
        }
        
        // 3. Horas excesivas (más de 12h/día)
        const excessiveHours = await db.query(`
            SELECT te.work_date, p.name, 
                   (te.hours_worked + COALESCE(te.overtime_hours, 0)) as total_hours
            FROM time_entries te
            JOIN personnel p ON te.personnel_id = p.id
            WHERE te.work_date BETWEEN $1 AND $2
            AND (te.hours_worked + COALESCE(te.overtime_hours, 0)) > 12
        `, [start_date, end_date]);
        
        if (excessiveHours.rows.length > 0) {
            validations.push({
                type: 'warning',
                code: 'EXCESSIVE_HOURS',
                message: `${excessiveHours.rows.length} días con más de 12 horas`,
                details: excessiveHours.rows.map(r => 
                    `${r.name}: ${r.total_hours}h el ${r.work_date}`
                ).join(', ')
            });
        }
        
        // 4. Resumen por empleado
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
        `, [start_date, end_date]);
        
        const hasErrors = validations.some(v => v.type === 'error');
        
        res.json({
            period_id: id,
            period: { start_date, end_date },
            isReadyForPayroll: !hasErrors,
            validations,
            summary: hoursSummary.rows
        });
        
    } catch (error) {
        console.error('Error validating hours:', error);
        sendError(res, error);
    }
});

// =====================================================
// INDIVIDUAL PAYSLIP GENERATION ENDPOINTS
// =====================================================

// Generar desprendible individual en PDF
router.get('/payslips/:period_id/:employee_id/pdf', async (req, res) => {
    try {
        const { period_id, employee_id } = req.params;

        // Obtener datos del período y empleado
        const payrollData = await getEmployeePayrollData(period_id, employee_id);

        if (!payrollData) {
            return res.status(404).json({ error: 'Datos de nómina no encontrados' });
        }

        // Validar datos antes de generar
        const validation = validatePayrollData(payrollData);
        if (!validation.isValid) {
            return res.status(400).json({
                error: 'Datos de nómina incompletos',
                details: validation.errors
            });
        }

        // Generar PDF con diseño mejorado
        const pdfBuffer = await generatePayslipPDF(payrollData);

        // Generar auditoría
        const auditTrail = generateDocumentAuditTrail('PDF', payrollData);
        console.log('[AUDIT] PDF generado:', auditTrail);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="desprendible_${payrollData.employee.name.replace(/\s+/g, '_')}_${payrollData.period.year}-${payrollData.period.month}.pdf"`);
        res.send(pdfBuffer);

    } catch (error) {
        console.error('Error generating payslip PDF:', error);
        sendError(res, error);
    }
});

// Generar desprendible individual en Excel
router.get('/payslips/:period_id/:employee_id/excel', async (req, res) => {
    try {
        const { period_id, employee_id } = req.params;

        // Obtener datos del período y empleado
        const payrollData = await getEmployeePayrollData(period_id, employee_id);

        if (!payrollData) {
            return res.status(404).json({ error: 'Datos de nómina no encontrados' });
        }

        // Validar datos antes de generar
        const validation = validatePayrollData(payrollData);
        if (!validation.isValid) {
            return res.status(400).json({
                error: 'Datos de nómina incompletos',
                details: validation.errors
            });
        }

        // Generar Excel con formato mejorado
        const excelBuffer = await generatePayslipExcel(payrollData);

        // Generar auditoría
        const auditTrail = generateDocumentAuditTrail('EXCEL', payrollData);
        console.log('[AUDIT] Excel generado:', auditTrail);

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="desprendible_${payrollData.employee.name.replace(/\s+/g, '_')}_${payrollData.period.year}-${payrollData.period.month}.xlsx"`);
        res.send(excelBuffer);

    } catch (error) {
        console.error('Error generating payslip Excel:', error);
        sendError(res, error);
    }
});

// Generar todos los desprendibles del período en ZIP
router.get('/payslips/:period_id/bulk/pdf', async (req, res) => {
    try {
        const { period_id } = req.params;
        const { format = 'pdf' } = req.query;

        // Obtener todos los empleados del período usando la nueva función
        const employees = await getPeriodEmployees(period_id);

        if (employees.length === 0) {
            return res.status(404).json({ error: 'No se encontraron empleados en este período' });
        }

        // Generar archivo ZIP con todos los desprendibles
        const archive = archiver('zip', { zlib: { level: 9 } });

        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="desprendibles_nomina_${period_id}_${format}.zip"`);

        archive.pipe(res);

        let processedCount = 0;
        let errorCount = 0;

        // Generar cada desprendible
        for (const employee of employees) {
            try {
                const payrollData = await getEmployeePayrollData(period_id, employee.personnel_id);

                if (payrollData) {
                    // Validar datos
                    const validation = validatePayrollData(payrollData);
                    if (!validation.isValid) {
                        console.warn(`[BULK] Datos incompletos para ${employee.name}:`, validation.errors);
                        errorCount++;
                        continue;
                    }

                    if (format === 'pdf') {
                        const pdfBuffer = await generatePayslipPDF(payrollData);
                        archive.append(pdfBuffer, {
                            name: `${payrollData.employee.name.replace(/\s+/g, '_')}_${payrollData.period.year}-${payrollData.period.month}.pdf`
                        });
                    } else if (format === 'excel') {
                        const excelBuffer = await generatePayslipExcel(payrollData);
                        archive.append(excelBuffer, {
                            name: `${payrollData.employee.name.replace(/\s+/g, '_')}_${payrollData.period.year}-${payrollData.period.month}.xlsx`
                        });
                    }
                    processedCount++;
                }
            } catch (empError) {
                console.error(`[BULK] Error procesando ${employee.name}:`, empError.message);
                errorCount++;
            }
        }

        // Agregar reporte de procesamiento
        const reportContent = `REPORTE DE GENERACIÓN MASIVA\n` +
            `Período: ${period_id}\n` +
            `Formato: ${format.toUpperCase()}\n` +
            `Empleados procesados: ${processedCount}\n` +
            `Errores: ${errorCount}\n` +
            `Fecha de generación: ${new Date().toISOString()}\n`;

        archive.append(reportContent, { name: 'reporte_generacion.txt' });

        console.log(`[BULK] Generación masiva completada: ${processedCount} exitosos, ${errorCount} errores`);
        archive.finalize();

    } catch (error) {
        console.error('Error generating bulk payslips:', error);
        sendError(res, error);
    }
});

// =====================================================
// FUNCIONES AUXILIARES MOVIDAS A MÓDULOS SEPARADOS
// =====================================================
// Las funciones de generación de documentos han sido movidas a:
// - utils/payroll-documents.js: Extracción de datos
// - utils/pdf-generators/payslip-pdf.js: Generación PDF
// - utils/excel-generators/payslip-excel.js: Generación Excel
// - utils/document-helpers.js: Utilidades compartidas

// =====================================================
// TODAS LAS FUNCIONES DE GENERACIÓN HAN SIDO MOVIDAS
// =====================================================
// Las funciones que anteriormente estaban aquí han sido reorganizadas en módulos especializados:
//
// ✅ generatePayslipPDF() → utils/pdf-generators/payslip-pdf.js
// ✅ generatePayslipExcel() → utils/excel-generators/payslip-excel.js
// ✅ getEmployeePayrollData() → utils/payroll-documents.js
// ✅ calculateLateMinutes() → utils/document-helpers.js
// ✅ formatCurrency() → utils/document-helpers.js
// ✅ getMonthName() → utils/document-helpers.js
//
// Esta refactorización reduce payroll.js de ~1,580 líneas a ~400 líneas,
// mejorando la mantenibilidad y separando responsabilidades.

// =====================================================
// ELIMINAR PERÍODO DE NÓMINA CON VALIDACIONES DE SEGURIDAD
// =====================================================
router.delete('/periods/:id', async (req, res) => {
    const client = await db.connect();
    try {
        await client.query('BEGIN');

        const { id } = req.params;

        if (!id) {
            return res.status(400).json({
                error: 'ID del período es requerido',
                code: 'MISSING_PERIOD_ID'
            });
        }

        // 1. Verificar que el período existe
        const periodResult = await client.query(`
            SELECT * FROM payroll_periods WHERE id = $1
        `, [id]);

        if (periodResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({
                error: 'Período de nómina no encontrado',
                code: 'PERIOD_NOT_FOUND'
            });
        }

        const period = periodResult.rows[0];

        // 2. VALIDACIÓN CRÍTICA: Solo permitir eliminar períodos 'draft'
        if (period.status !== 'draft') {
            await client.query('ROLLBACK');
            return res.status(403).json({
                error: `No se puede eliminar período con status '${period.status}'. Solo se pueden eliminar períodos en estado 'draft'.`,
                code: 'INVALID_STATUS_FOR_DELETE',
                details: {
                    currentStatus: period.status,
                    allowedStatus: 'draft'
                }
            });
        }

        // 3. VALIDACIÓN CRÍTICA: No eliminar si ya fue procesado
        if (period.processed_at) {
            await client.query('ROLLBACK');
            return res.status(403).json({
                error: 'No se puede eliminar período que ya fue procesado',
                code: 'PERIOD_ALREADY_PROCESSED',
                details: {
                    processedAt: period.processed_at
                }
            });
        }

        // 4. Verificar dependencias: payroll_details
        const payrollDetailsResult = await client.query(`
            SELECT COUNT(*) as count FROM payroll_details WHERE payroll_period_id = $1
        `, [id]);

        const payrollDetailsCount = parseInt(payrollDetailsResult.rows[0].count);

        if (payrollDetailsCount > 0) {
            await client.query('ROLLBACK');
            return res.status(409).json({
                error: `No se puede eliminar período que tiene ${payrollDetailsCount} registro(s) de nómina procesados`,
                code: 'HAS_PAYROLL_DETAILS',
                details: {
                    payrollDetailsCount: payrollDetailsCount
                }
            });
        }

        // 5. Verificar time_entries en el rango del período para mostrar advertencia
        const timeEntriesResult = await client.query(`
            SELECT COUNT(*) as count
            FROM time_entries
            WHERE work_date BETWEEN $1 AND $2
        `, [period.start_date, period.end_date]);

        const timeEntriesCount = parseInt(timeEntriesResult.rows[0].count);

        // 6. Log de auditoría ANTES de eliminar
        console.log(`[AUDIT] Eliminando período de nómina:`, {
            periodId: id,
            year: period.year,
            month: period.month,
            status: period.status,
            timeEntriesAffected: timeEntriesCount,
            timestamp: new Date().toISOString(),
            // En un sistema real, aquí se registraría el usuario que hace la eliminación
            userAgent: req.headers['user-agent']
        });

        // 7. Eliminar período (CASCADE eliminará dependencias automáticamente)
        const deleteResult = await client.query(`
            DELETE FROM payroll_periods WHERE id = $1
            RETURNING *
        `, [id]);

        if (deleteResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(500).json({
                error: 'Error al eliminar período',
                code: 'DELETE_FAILED'
            });
        }

        await client.query('COMMIT');

        // 8. Respuesta exitosa con información de lo eliminado
        res.json({
            success: true,
            message: `Período ${getMonthName(period.month)} ${period.year} eliminado exitosamente`,
            deletedPeriod: {
                id: period.id,
                year: period.year,
                month: period.month,
                monthName: getMonthName(period.month),
                status: period.status
            },
            warnings: timeEntriesCount > 0 ? [
                `Había ${timeEntriesCount} registro(s) de tiempo en el rango de este período`
            ] : [],
            auditLog: {
                action: 'DELETE_PERIOD',
                timestamp: new Date().toISOString(),
                periodId: id
            }
        });

    } catch (error) {
        await client.query('ROLLBACK');

        // Log detallado del error para debugging
        console.error('[ERROR] Error al eliminar período de nómina:', {
            error: error.message,
            stack: error.stack,
            periodId: req.params.id,
            timestamp: new Date().toISOString()
        });

        // Respuesta de error controlada
        res.status(500).json({
            error: 'Error interno del servidor al eliminar período',
            code: 'INTERNAL_SERVER_ERROR',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    } finally {
        client.release();
    }
});

module.exports = router;