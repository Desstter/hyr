const { db } = require('../database/connection');
const { generateDocumentId, getPayrollPeriodDates } = require('./document-helpers');

/**
 * Obtiene datos completos de nómina para un empleado específico
 * @param {string} period_id - ID del período de nómina
 * @param {string} employee_id - ID del empleado
 * @returns {Object|null} - Datos completos para generación de desprendible
 */
async function getEmployeePayrollData(period_id, employee_id) {
    try {
        // Obtener datos del período
        const periodResult = await db.query(`
            SELECT * FROM payroll_periods WHERE id = $1
        `, [period_id]);

        if (periodResult.rows.length === 0) {
            throw new Error(`Período de nómina no encontrado: ${period_id}`);
        }

        // Obtener datos del empleado
        const employeeResult = await db.query(`
            SELECT * FROM personnel WHERE id = $1
        `, [employee_id]);

        if (employeeResult.rows.length === 0) {
            throw new Error(`Empleado no encontrado: ${employee_id}`);
        }

        // Obtener detalles de nómina
        const payrollResult = await db.query(`
            SELECT pd.*, p.name as employee_name, p.document_number, p.position, p.department
            FROM payroll_details pd
            JOIN personnel p ON pd.personnel_id = p.id
            WHERE pd.payroll_period_id = $1 AND pd.personnel_id = $2
        `, [period_id, employee_id]);

        if (payrollResult.rows.length === 0) {
            throw new Error(`Detalles de nómina no encontrados para empleado ${employee_id} en período ${period_id}`);
        }

        // Obtener configuración de la empresa
        let companySettings = await getCompanySettings();

        // Obtener time entries del período para detalle de horas
        const timeEntriesResult = await db.query(`
            SELECT
                work_date,
                COALESCE(hours_worked, 0) as hours_worked,
                COALESCE(overtime_hours, 0) as overtime_hours,
                COALESCE(night_hours, 0) as night_hours,
                COALESCE(night_pay, 0) as night_pay,
                COALESCE(arrival_time, '07:00') as arrival_time,
                COALESCE(departure_time, '15:30') as departure_time,
                COALESCE(description, 'Trabajo regular') as description,
                COALESCE(late_minutes, 0) as late_minutes,
                COALESCE(total_pay, 0) as total_pay,
                COALESCE(hourly_rate, 0) as hourly_rate,
                COALESCE(regular_pay, 0) as regular_pay,
                COALESCE(overtime_pay, 0) as overtime_pay
            FROM time_entries
            WHERE personnel_id = $1
            AND work_date BETWEEN $2 AND $3
            AND status IN ('approved', 'payroll_locked')
            ORDER BY work_date
        `, [employee_id, periodResult.rows[0].start_date, periodResult.rows[0].end_date]);

        // Generar ID único para el documento
        const documentId = generateDocumentId('PAY');

        return {
            documentId,
            period: periodResult.rows[0],
            employee: employeeResult.rows[0],
            payroll: payrollResult.rows[0],
            company: companySettings,
            timeEntries: timeEntriesResult.rows,
            metadata: {
                generatedAt: new Date(),
                totalDays: timeEntriesResult.rows.length,
                periodDisplay: getPayrollPeriodDates(periodResult.rows[0].year, periodResult.rows[0].month).displayPeriod
            }
        };

    } catch (error) {
        console.error('Error obteniendo datos de nómina:', error);
        throw error;
    }
}

/**
 * Obtiene datos de empresa para documentos
 * @returns {Object} - Configuración de empresa
 */
async function getCompanySettings() {
    try {
        const settingsResult = await db.query(`
            SELECT value FROM settings WHERE key = 'business_profile'
        `);

        if (settingsResult.rows.length > 0) {
            return settingsResult.rows[0].value;
        }
    } catch (error) {
        console.log('No se encontraron configuraciones de empresa, usando valores por defecto');
    }

    // Valores por defecto si no hay configuración
    return {
        name: "HYR Constructora & Soldadura",
        nit: "901.234.567-8",
        address: "Barranquilla, Atlántico, Colombia",
        phone: "+57 314 567-8901",
        email: "info@hyr.com.co",
        website: "www.hyr.com.co",
        logo: null // Placeholder para logo
    };
}

/**
 * Obtiene todos los empleados de un período para generación masiva
 * @param {string} period_id - ID del período de nómina
 * @returns {Array} - Lista de empleados en el período
 */
async function getPeriodEmployees(period_id) {
    try {
        const result = await db.query(`
            SELECT DISTINCT pd.personnel_id, p.name, p.document_number, p.position
            FROM payroll_details pd
            JOIN personnel p ON pd.personnel_id = p.id
            WHERE pd.payroll_period_id = $1
            ORDER BY p.name
        `, [period_id]);

        return result.rows;
    } catch (error) {
        console.error('Error obteniendo empleados del período:', error);
        throw error;
    }
}

/**
 * Obtiene resumen de horas para un empleado
 * @param {Array} timeEntries - Registros de tiempo del empleado
 * @returns {Object} - Resumen calculado de horas
 */
function calculateHoursSummary(timeEntries) {
    const summary = {
        totalRegularHours: 0,
        totalOvertimeHours: 0,
        totalNightHours: 0,
        totalLateMinutes: 0,
        totalNightPay: 0,
        totalRegularPay: 0,
        totalOvertimePay: 0,
        workDays: timeEntries.length,
        averageHoursPerDay: 0
    };

    timeEntries.forEach(entry => {
        summary.totalRegularHours += parseFloat(entry.hours_worked || 0);
        summary.totalOvertimeHours += parseFloat(entry.overtime_hours || 0);
        summary.totalNightHours += parseFloat(entry.night_hours || 0);
        summary.totalLateMinutes += parseInt(entry.late_minutes || 0);
        summary.totalNightPay += parseFloat(entry.night_pay || 0);
        summary.totalRegularPay += parseFloat(entry.regular_pay || 0);
        summary.totalOvertimePay += parseFloat(entry.overtime_pay || 0);
    });

    if (summary.workDays > 0) {
        summary.averageHoursPerDay = summary.totalRegularHours / summary.workDays;
    }

    return summary;
}

/**
 * Calcula estadísticas de rendimiento laboral
 * @param {Object} employee - Datos del empleado
 * @param {Array} timeEntries - Registros de tiempo
 * @returns {Object} - Estadísticas de rendimiento
 */
function calculatePerformanceStats(employee, timeEntries) {
    const hoursSummary = calculateHoursSummary(timeEntries);
    const expectedMonthlyHours = 192; // 24 días × 8 horas estándar

    return {
        ...hoursSummary,
        efficiency: (hoursSummary.totalRegularHours / expectedMonthlyHours) * 100,
        punctuality: timeEntries.length > 0 ?
            ((timeEntries.length - timeEntries.filter(e => e.late_minutes > 5).length) / timeEntries.length) * 100 : 100,
        overtimeRatio: hoursSummary.totalRegularHours > 0 ?
            (hoursSummary.totalOvertimeHours / hoursSummary.totalRegularHours) * 100 : 0
    };
}

/**
 * Valida que los datos de nómina estén completos para generación
 * @param {Object} payrollData - Datos de nómina
 * @returns {Object} - Resultado de validación
 */
function validatePayrollData(payrollData) {
    const errors = [];
    const warnings = [];

    // Validaciones críticas
    if (!payrollData.employee || !payrollData.employee.name) {
        errors.push('Datos de empleado incompletos');
    }

    if (!payrollData.payroll || payrollData.payroll.net_pay === undefined) {
        errors.push('Detalles de nómina incompletos');
    }

    if (!payrollData.period) {
        errors.push('Información de período no disponible');
    }

    // Validaciones de advertencia
    if (!payrollData.timeEntries || payrollData.timeEntries.length === 0) {
        warnings.push('No hay registros de tiempo para este período');
    }

    if (payrollData.payroll && parseFloat(payrollData.payroll.net_pay) <= 0) {
        warnings.push('El pago neto es cero o negativo');
    }

    return {
        isValid: errors.length === 0,
        errors,
        warnings
    };
}

/**
 * Obtiene configuración DIAN para documentos oficiales
 * @returns {Object} - Configuración DIAN
 */
async function getDianSettings() {
    try {
        const settingsResult = await db.query(`
            SELECT value FROM settings WHERE key = 'dian_settings'
        `);

        if (settingsResult.rows.length > 0) {
            return settingsResult.rows[0].value;
        }
    } catch (error) {
        console.log('No se encontraron configuraciones DIAN');
    }

    return {
        resolution: "18760000001",
        environment: "habilitacion",
        xml_type: "nomina_individual"
    };
}

/**
 * Genera metadatos para auditoría de documentos
 * @param {string} documentType - Tipo de documento (PDF, Excel, etc.)
 * @param {Object} payrollData - Datos de nómina
 * @returns {Object} - Metadatos de auditoría
 */
function generateDocumentAuditTrail(documentType, payrollData) {
    return {
        documentId: payrollData.documentId,
        documentType,
        employeeId: payrollData.employee.id,
        employeeName: payrollData.employee.name,
        periodId: payrollData.period.id,
        periodYear: payrollData.period.year,
        periodMonth: payrollData.period.month,
        generatedAt: new Date(),
        generatedBy: 'system', // En el futuro se puede agregar el usuario
        fileSize: null, // Se puede agregar después de generar el archivo
        checksum: null // Se puede calcular para verificación de integridad
    };
}

module.exports = {
    // Funciones principales
    getEmployeePayrollData,
    getPeriodEmployees,

    // Funciones de configuración
    getCompanySettings,
    getDianSettings,

    // Funciones de cálculo
    calculateHoursSummary,
    calculatePerformanceStats,

    // Funciones de validación
    validatePayrollData,

    // Funciones de auditoría
    generateDocumentAuditTrail
};