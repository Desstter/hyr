// =====================================================
// PILA CSV - EXPORTACIÓN SEGURIDAD SOCIAL COLOMBIA
// HYR CONSTRUCTORA & SOLDADURA
// =====================================================

const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const { db } = require('../database/connection');
const { pilaAuditLogger, logAuditEvent } = require('../middleware/audit-logger');
const { loadTaxConfig } = require('../utils/tax-loader');

// Asegurar que el directorio de exports existe
const EXPORTS_DIR = path.join(__dirname, '..', 'exports');

// =====================================================
// GENERACIÓN Y GESTIÓN ARCHIVOS PILA
// =====================================================

/**
 * POST /api/pila/:period/generate
 * Genera archivo CSV PILA para un período específico
 */
router.post('/:period/generate', pilaAuditLogger(), async (req, res) => {
    try {
        const { period } = req.params;
        const { year = parseInt(period.split('-')[0]) } = req.body;
        
        // Validar formato de período
        const periodRegex = /^\d{4}-\d{2}$/;
        if (!periodRegex.test(period)) {
            return res.status(400).json({
                error: 'Formato de período inválido. Use YYYY-MM (ej: 2025-09)'
            });
        }
        
        // Verificar si ya existe PILA para el período
        const existingPila = await db.query(`
            SELECT * FROM pila_submissions WHERE period = $1
        `, [period]);
        
        if (existingPila.rows.length > 0) {
            return res.status(409).json({
                error: `Ya existe archivo PILA para el período ${period}`,
                existing: existingPila.rows[0]
            });
        }
        
        // Obtener empleados activos del período
        const employeesResult = await db.query(`
            SELECT DISTINCT
                p.id,
                p.name,
                p.document_type,
                p.document_number,
                p.arl_risk_class,
                p.monthly_salary,
                p.hourly_rate,
                p.salary_type
            FROM personnel p
            WHERE p.status = 'active'
            AND EXISTS (
                SELECT 1 FROM time_entries te 
                WHERE te.personnel_id = p.id 
                AND DATE_TRUNC('month', te.work_date) = $1::date
            )
            ORDER BY p.name
        `, [`${period}-01`]);
        
        if (employeesResult.rows.length === 0) {
            // Proporcionar información adicional para ayudar al usuario
            const activeEmployees = await db.query(`
                SELECT COUNT(*) as count FROM personnel WHERE status = 'active'
            `);
            
            const allTimeEntries = await db.query(`
                SELECT COUNT(*) as count FROM time_entries 
                WHERE DATE_TRUNC('month', work_date) = $1::date
            `, [`${period}-01`]);

            return res.status(404).json({
                error: `No se encontraron empleados con horas trabajadas para el período ${period}`,
                details: {
                    period: period,
                    active_employees: parseInt(activeEmployees.rows[0].count),
                    time_entries_in_period: parseInt(allTimeEntries.rows[0].count),
                    next_steps: [
                        "Registre las horas trabajadas de los empleados para el período especificado",
                        "Asegúrese de que los empleados estén marcados como 'activos'",
                        "Verifique que las fechas de registro correspondan al período de PILA",
                        `Para generar PILA de ${period}, necesita registrar horas en el sistema de 'Registro de Horas'`
                    ]
                },
                help: {
                    workflow: "Ir a 'Registro de Horas' > Agregar horas trabajadas > Procesar PILA",
                    required_data: "Empleados activos con horas registradas en el período"
                }
            });
        }
        
        // Cargar configuración tributaria
        const taxConfig = loadTaxConfig(year);
        
        // Generar datos PILA para cada empleado
        const pilaEmployees = [];
        let totalContributions = 0;
        
        for (const employee of employeesResult.rows) {
            // Obtener horas trabajadas en el período
            const hoursResult = await db.query(`
                SELECT 
                    SUM(hours_worked) as total_hours,
                    SUM(overtime_hours) as overtime_hours,
                    COUNT(DISTINCT work_date) as days_worked,
                    SUM(total_pay) as total_pay
                FROM time_entries
                WHERE personnel_id = $1 
                AND DATE_TRUNC('month', work_date) = $2::date
            `, [employee.id, `${period}-01`]);
            
            const hours = hoursResult.rows[0];
            const daysWorked = Math.min(parseInt(hours.days_worked) || 30, 30);
            
            // Calcular salario base del período
            let baseSalary;
            if (employee.salary_type === 'monthly') {
                baseSalary = parseFloat(employee.monthly_salary) || 0;
            } else {
                const monthlyHours = Math.min(parseFloat(hours.total_hours) || 0, 192);
                baseSalary = (parseFloat(employee.hourly_rate) || 0) * monthlyHours;
            }
            
            // Asegurar salario mínimo
            baseSalary = Math.max(baseSalary, taxConfig.payroll.minimum_wage);
            
            // IBC (Ingreso Base de Cotización)
            const ibc = baseSalary;
            
            // Calcular aportes según configuración colombiana
            const healthEmployee = ibc * 0.04;
            const healthEmployer = ibc * 0.085;
            const pensionEmployee = ibc * 0.04;
            const pensionEmployer = ibc * 0.12;
            
            // ARL según clase de riesgo
            const arlRates = {
                'I': 0.00522,
                'II': 0.01044,
                'III': 0.02436,
                'IV': 0.04350,
                'V': 0.06960
            };
            const arlRate = arlRates[employee.arl_risk_class] || arlRates['V'];
            const arl = ibc * arlRate;
            
            // Parafiscales (SENA, ICBF, Cajas)
            const sena = ibc * 0.02;
            const icbf = ibc * 0.03;
            const cajas = ibc * 0.04;
            
            // Cesantías y prestaciones
            const cesantias = ibc * 0.0833;
            const prima = ibc * 0.0833;
            const vacaciones = ibc * 0.0417;
            
            const employeeData = {
                // Identificación
                document_type: employee.document_type || 'CC',
                document_number: employee.document_number,
                names: employee.name,
                
                // Laborales
                days_worked: daysWorked,
                ibc: Math.round(ibc),
                
                // Aportes empleado
                health_employee: Math.round(healthEmployee),
                pension_employee: Math.round(pensionEmployee),
                
                // Aportes empleador
                health_employer: Math.round(healthEmployer),
                pension_employer: Math.round(pensionEmployer),
                arl: Math.round(arl),
                arl_class: employee.arl_risk_class || 'V',
                
                // Prestaciones
                cesantias: Math.round(cesantias),
                prima: Math.round(prima),
                vacaciones: Math.round(vacaciones),
                
                // Parafiscales
                sena: Math.round(sena),
                icbf: Math.round(icbf),
                cajas: Math.round(cajas),
                
                // Totales
                total_employee: Math.round(healthEmployee + pensionEmployee),
                total_employer: Math.round(healthEmployer + pensionEmployer + arl + cesantias + prima + vacaciones + sena + icbf + cajas)
            };
            
            pilaEmployees.push(employeeData);
            totalContributions += employeeData.total_employer;
        }
        
        // Generar CSV content
        const csvContent = generatePILACSV(pilaEmployees, period);
        
        // Crear directorio si no existe
        await fs.mkdir(EXPORTS_DIR, { recursive: true });
        
        // Nombre de archivo
        const fileName = `pila_${period.replace('-', '_')}.csv`;
        const filePath = path.join(EXPORTS_DIR, fileName);
        
        // Guardar archivo
        await fs.writeFile(filePath, csvContent, 'utf8');
        
        // Guardar registro en base de datos
        const result = await db.query(`
            INSERT INTO pila_submissions (
                period, employees_count, total_contributions, 
                file_path, csv_content, status
            ) VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `, [
            period,
            pilaEmployees.length,
            totalContributions,
            fileName,
            csvContent,
            'GENERADO'
        ]);
        
        const pilaSubmission = result.rows[0];
        
        // Log auditoría
        await logAuditEvent({
            actor: 'USER',
            eventType: 'CREATE',
            refTable: 'pila_submissions',
            refId: pilaSubmission.id,
            payload: {
                action: 'pila_csv_generated',
                period,
                employees_count: pilaEmployees.length,
                total_contributions: totalContributions,
                file_name: fileName
            }
        });
        
        res.status(201).json({
            success: true,
            message: `Archivo PILA generado exitosamente para período ${period}`,
            data: {
                ...pilaSubmission,
                file_name: fileName,
                employees: pilaEmployees,
                summary: {
                    period,
                    total_employees: pilaEmployees.length,
                    total_ibc: pilaEmployees.reduce((sum, emp) => sum + emp.ibc, 0),
                    total_health: pilaEmployees.reduce((sum, emp) => sum + emp.health_employee + emp.health_employer, 0),
                    total_pension: pilaEmployees.reduce((sum, emp) => sum + emp.pension_employee + emp.pension_employer, 0),
                    total_arl: pilaEmployees.reduce((sum, emp) => sum + emp.arl, 0),
                    total_parafiscales: pilaEmployees.reduce((sum, emp) => sum + emp.sena + emp.icbf + emp.cajas, 0),
                    total_contributions: totalContributions
                }
            }
        });
        
    } catch (error) {
        console.error('❌ Error generando PILA CSV:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            details: error.message
        });
    }
});

/**
 * GET /api/pila/:period/download
 * Descarga archivo CSV PILA para un período
 */
router.get('/:period/download', async (req, res) => {
    try {
        const { period } = req.params;
        
        // Buscar submission
        const result = await db.query(`
            SELECT * FROM pila_submissions WHERE period = $1
        `, [period]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                error: `Archivo PILA no encontrado para período ${period}`
            });
        }
        
        const submission = result.rows[0];
        
        // Si hay contenido CSV guardado, devolverlo directamente
        if (submission.csv_content) {
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="pila_${period.replace('-', '_')}.csv"`);
            res.setHeader('Cache-Control', 'no-cache');
            
            // BOM para Excel
            const BOM = '\uFEFF';
            res.send(BOM + submission.csv_content);
            return;
        }
        
        // Si no hay contenido CSV, intentar leer archivo
        const filePath = path.join(EXPORTS_DIR, submission.file_path);
        
        try {
            const fileContent = await fs.readFile(filePath, 'utf8');
            
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="${submission.file_path}"`);
            
            const BOM = '\uFEFF';
            res.send(BOM + fileContent);
            
        } catch (fileError) {
            console.error('❌ Error leyendo archivo PILA:', fileError);
            res.status(500).json({
                error: 'Archivo PILA no encontrado en sistema de archivos'
            });
        }
        
    } catch (error) {
        console.error('❌ Error descargando PILA CSV:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            details: error.message
        });
    }
});

/**
 * GET /api/pila/submissions
 * Lista todas las submissions de PILA
 */
router.get('/submissions', async (req, res) => {
    try {
        const { status, year } = req.query;
        
        let query = `
            SELECT 
                id, period, employees_count, total_contributions,
                file_path, status, created_at
            FROM pila_submissions
            WHERE 1=1
        `;
        
        const params = [];
        let paramCount = 0;
        
        if (status) {
            params.push(status);
            query += ` AND status = $${++paramCount}`;
        }
        
        if (year) {
            params.push(`${year}-%`);
            query += ` AND period LIKE $${++paramCount}`;
        }
        
        query += ` ORDER BY period DESC, created_at DESC`;
        
        const result = await db.query(query, params);
        
        res.json({
            success: true,
            data: {
                submissions: result.rows,
                total: result.rows.length,
                summary: {
                    total_submissions: result.rows.length,
                    total_employees: result.rows.reduce((sum, row) => sum + row.employees_count, 0),
                    total_contributions: result.rows.reduce((sum, row) => sum + parseFloat(row.total_contributions), 0),
                    status_counts: result.rows.reduce((counts, row) => {
                        counts[row.status] = (counts[row.status] || 0) + 1;
                        return counts;
                    }, {})
                }
            }
        });
        
    } catch (error) {
        console.error('❌ Error listando submissions PILA:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            details: error.message
        });
    }
});

/**
 * PUT /api/pila/:period/status
 * Actualiza estado de submission PILA
 */
router.put('/:period/status', pilaAuditLogger(), async (req, res) => {
    try {
        const { period } = req.params;
        const { status } = req.body;
        
        const validStatuses = ['GENERADO', 'ENVIADO', 'PROCESADO', 'ERROR'];
        
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                error: `Estado inválido. Debe ser uno de: ${validStatuses.join(', ')}`
            });
        }
        
        const result = await db.query(`
            UPDATE pila_submissions 
            SET status = $1 
            WHERE period = $2
            RETURNING *
        `, [status, period]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                error: `Submission PILA no encontrada para período ${period}`
            });
        }
        
        await logAuditEvent({
            actor: 'USER',
            eventType: 'UPDATE',
            refTable: 'pila_submissions',
            refId: result.rows[0].id,
            payload: {
                action: 'pila_status_updated',
                period,
                new_status: status
            }
        });
        
        res.json({
            success: true,
            message: `Estado PILA actualizado a ${status}`,
            data: result.rows[0]
        });
        
    } catch (error) {
        console.error('❌ Error actualizando estado PILA:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            details: error.message
        });
    }
});

// =====================================================
// UTILIDAD GENERACIÓN CSV PILA
// =====================================================

/**
 * Genera contenido CSV en formato PILA compatible con UGPP
 * @param {Array} employees - Array de empleados con datos calculados
 * @param {string} period - Período YYYY-MM
 * @returns {string} Contenido CSV
 */
function generatePILACSV(employees, period) {
    // Headers según formato UGPP
    const headers = [
        'TIPO_DOCUMENTO',
        'NUMERO_DOCUMENTO',
        'APELLIDOS_NOMBRES',
        'DIAS_COTIZADOS',
        'IBC',
        'SALUD_EMPLEADO',
        'SALUD_EMPLEADOR',
        'PENSION_EMPLEADO',
        'PENSION_EMPLEADOR',
        'ARL',
        'CLASE_RIESGO_ARL',
        'CESANTIAS',
        'PRIMA_SERVICIOS',
        'VACACIONES',
        'SENA',
        'ICBF',
        'CAJAS_COMPENSACION',
        'TOTAL_EMPLEADO',
        'TOTAL_EMPLEADOR'
    ];
    
    // Construir filas CSV
    const rows = employees.map(emp => [
        emp.document_type,
        emp.document_number,
        emp.names.replace(/,/g, ''), // Quitar comas para CSV
        emp.days_worked,
        emp.ibc,
        emp.health_employee,
        emp.health_employer,
        emp.pension_employee,
        emp.pension_employer,
        emp.arl,
        emp.arl_class,
        emp.cesantias,
        emp.prima,
        emp.vacaciones,
        emp.sena,
        emp.icbf,
        emp.cajas,
        emp.total_employee,
        emp.total_employer
    ]);
    
    // Crear CSV
    const csvLines = [
        headers.join(';'),
        ...rows.map(row => row.join(';'))
    ];
    
    return csvLines.join('\n');
}

module.exports = router;