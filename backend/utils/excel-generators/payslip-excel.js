const xlsx = require('xlsx');
const moment = require('moment');
const {
    formatCurrency,
    formatDate,
    calculatePercentage,
    getMonthName,
    calculateLateMinutes
} = require('../document-helpers');
const { calculateHoursSummary, calculatePerformanceStats } = require('../payroll-documents');

/**
 * Genera Excel del desprendible de nómina con formato profesional
 * @param {Object} data - Datos completos de nómina
 * @returns {Buffer} - Buffer del Excel generado
 */
async function generatePayslipExcel(data) {
    try {
        const workbook = xlsx.utils.book_new();

        // Calcular estadísticas
        const hoursSummary = calculateHoursSummary(data.timeEntries);
        const performanceStats = calculatePerformanceStats(data.employee, data.timeEntries);

        // Configurar propiedades del documento
        workbook.Props = {
            Title: `Desprendible de Nómina - ${data.employee.name}`,
            Subject: `Período ${data.metadata.periodDisplay}`,
            Author: data.company.name,
            CreatedDate: new Date(),
            Company: data.company.name
        };

        // ============================================
        // HOJA 1: DESPRENDIBLE PRINCIPAL
        // ============================================
        const mainSheet = createMainPayslipSheet(data, hoursSummary, performanceStats);
        xlsx.utils.book_append_sheet(workbook, mainSheet, 'Desprendible');

        // ============================================
        // HOJA 2: DETALLE DIARIO
        // ============================================
        const dailySheet = createDailyDetailSheet(data, hoursSummary);
        xlsx.utils.book_append_sheet(workbook, dailySheet, 'Detalle Diario');

        // ============================================
        // HOJA 3: ANÁLISIS DE RENDIMIENTO
        // ============================================
        const performanceSheet = createPerformanceAnalysisSheet(data, performanceStats);
        xlsx.utils.book_append_sheet(workbook, performanceSheet, 'Análisis');

        return xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    } catch (error) {
        console.error('Error generando Excel:', error);
        throw error;
    }
}

/**
 * Crea la hoja principal del desprendible
 */
function createMainPayslipSheet(data, hoursSummary, performanceStats) {
    // Calcular valores adicionales
    const dailyRate = parseFloat(data.employee.daily_rate) || (parseFloat(data.employee.monthly_salary) || 1423500) / 24;
    const hourlyRate = dailyRate / 7.3;

    const sheetData = [
        // HEADER EMPRESARIAL
        [data.company.name, '', '', '', '', '', '', '', ''],
        [`NIT: ${data.company.nit}`, '', '', '', '', '', '', '', ''],
        [data.company.address, '', '', '', '', '', '', '', ''],
        [`Tel: ${data.company.phone}`, '', '', '', '', '', '', '', ''],
        [],
        ['DESPRENDIBLE DE NÓMINA', '', '', '', '', '', '', '', ''],
        [],

        // INFORMACIÓN DEL PERÍODO Y EMPLEADO
        ['INFORMACIÓN DEL PERÍODO', '', '', 'DATOS DEL EMPLEADO', '', '', '', '', ''],
        [`Período: ${data.metadata.periodDisplay}`, '', '', `Nombre: ${data.employee.name}`, '', '', '', '', ''],
        [`Procesado: ${formatDate(data.period.processed_at || new Date())}`, '', '', `Documento: ${data.employee.document_number}`, '', '', '', '', ''],
        [`Documento ID: ${data.documentId}`, '', '', `Cargo: ${data.employee.position}`, '', '', '', '', ''],
        ['', '', '', `Departamento: ${data.employee.department}`, '', '', '', '', ''],
        [],

        // RESUMEN DE HORAS
        ['RESUMEN DE HORAS TRABAJADAS', '', '', '', '', '', '', '', ''],
        ['Concepto', 'Cantidad', 'Tarifa', 'Valor', '', 'ESTADÍSTICAS', 'Valor', '', ''],
        ['Horas Regulares', hoursSummary.totalRegularHours.toFixed(2), formatCurrency(hourlyRate), formatCurrency(data.payroll.regular_pay), '', 'Días Trabajados', performanceStats.workDays, '', ''],
        ['Horas Extra (25%)', hoursSummary.totalOvertimeHours.toFixed(2), formatCurrency(hourlyRate * 1.25), formatCurrency(data.payroll.overtime_pay), '', 'Eficiencia', `${performanceStats.efficiency.toFixed(1)}%`, '', ''],
        ['Horas Nocturnas (35%)', hoursSummary.totalNightHours.toFixed(2), formatCurrency(hourlyRate * 1.35), formatCurrency(hoursSummary.totalNightPay), '', 'Puntualidad', `${performanceStats.punctuality.toFixed(1)}%`, '', ''],
        ['Auxilio Transporte', '-', '-', formatCurrency(data.payroll.transport_allowance), '', 'Promedio H/Día', performanceStats.averageHoursPerDay.toFixed(2), '', ''],
        [],

        // INGRESOS DETALLADOS
        ['INGRESOS', '', '', '', '', '', '', '', ''],
        ['Concepto', 'Base Cálculo', 'Tarifa', 'Valor', '', '', '', '', ''],
        ['Salario Regular', formatCurrency(data.payroll.base_salary), `${hoursSummary.totalRegularHours.toFixed(1)} hrs`, formatCurrency(data.payroll.regular_pay), '', '', '', '', ''],
    ];

    // Agregar horas extra si existen
    if (hoursSummary.totalOvertimeHours > 0) {
        sheetData.push(['Horas Extra', formatCurrency(data.payroll.base_salary), `${hoursSummary.totalOvertimeHours.toFixed(1)} hrs × 1.25`, formatCurrency(data.payroll.overtime_pay), '', '', '', '', '']);
    }

    // Agregar horas nocturnas si existen
    if (hoursSummary.totalNightHours > 0) {
        sheetData.push(['Recargo Nocturno', formatCurrency(data.payroll.base_salary), `${hoursSummary.totalNightHours.toFixed(1)} hrs × 1.35`, formatCurrency(hoursSummary.totalNightPay), '', '', '', '', '']);
    }

    // Agregar auxilio de transporte si aplica
    if (parseFloat(data.payroll.transport_allowance) > 0) {
        sheetData.push(['Auxilio de Transporte', 'SMMLV ≤ 2x', '100%', formatCurrency(data.payroll.transport_allowance), '', '', '', '', '']);
    }

    sheetData.push(
        [],
        ['SUBTOTAL INGRESOS', '', '', formatCurrency(data.payroll.total_income), '', '', '', '', ''],
        [],

        // DEDUCCIONES
        ['DEDUCCIONES', '', '', '', '', '', '', '', ''],
        ['Concepto', 'Base Cálculo', 'Tarifa', 'Valor', '', '', '', '', ''],
        ['Salud', formatCurrency(data.payroll.total_income), '4.0%', formatCurrency(data.payroll.health_employee), '', '', '', '', ''],
        ['Pensión', formatCurrency(data.payroll.total_income), '4.0%', formatCurrency(data.payroll.pension_employee), '', '', '', '', '']
    );

    // Agregar solidaridad si aplica
    if (parseFloat(data.payroll.solidarity_contribution) > 0) {
        sheetData.push(['Solidaridad', formatCurrency(data.payroll.total_income), '1.0%', formatCurrency(data.payroll.solidarity_contribution), '', '', '', '', '']);
    }

    sheetData.push(
        [],
        ['TOTAL DEDUCCIONES', '', '', formatCurrency(data.payroll.total_deductions), '', '', '', '', ''],
        [],
        [],
        ['NETO A PAGAR', '', '', formatCurrency(data.payroll.net_pay), '', '', '', '', ''],
        [],

        // INFORMACIÓN ADICIONAL
        ['INFORMACIÓN LEGAL', '', '', '', '', '', '', '', ''],
        ['Este documento constituye comprobante de pago según legislación colombiana', '', '', '', '', '', '', '', ''],
        [`Generado el: ${formatDate(new Date())} a las ${moment().format('HH:mm:ss')}`, '', '', '', '', '', '', '', ''],
        [`Por: ${data.company.name}`, '', '', '', '', '', '', '', '']
    );

    const worksheet = xlsx.utils.aoa_to_sheet(sheetData);

    // CONFIGURACIÓN DE FORMATO
    applyMainSheetFormatting(worksheet, sheetData.length);

    return worksheet;
}

/**
 * Crea la hoja de detalle diario
 */
function createDailyDetailSheet(data, hoursSummary) {
    const sheetData = [
        [`DETALLE DIARIO - ${data.employee.name}`, '', '', '', '', '', '', '', ''],
        [`Período: ${data.metadata.periodDisplay}`, '', '', '', '', '', '', '', ''],
        [],
        ['Día', 'Fecha', 'Día Semana', 'Entrada', 'Salida', 'H.Reg', 'H.Extra', 'H.Noct', 'Tardanza', 'Pago Día', 'Observaciones']
    ];

    let totalDailyPay = 0;
    let totalLateMinutes = 0;

    // Datos diarios
    data.timeEntries.forEach((entry, index) => {
        const workDate = new Date(entry.work_date);
        const dayNumber = workDate.getDate();
        const dateFormatted = moment(entry.work_date).format('DD/MM');
        const dayName = moment(entry.work_date).format('dddd');

        const arrivalTime = entry.arrival_time || '07:00';
        const departureTime = entry.departure_time || '15:30';
        const lateMinutes = calculateLateMinutes(arrivalTime, '07:00');
        totalLateMinutes += lateMinutes;

        const regularHours = parseFloat(entry.hours_worked || 0);
        const overtimeHours = parseFloat(entry.overtime_hours || 0);
        const nightHours = parseFloat(entry.night_hours || 0);
        const dailyPay = parseFloat(entry.total_pay || 0);
        totalDailyPay += dailyPay;

        sheetData.push([
            dayNumber,
            dateFormatted,
            dayName,
            arrivalTime,
            departureTime,
            regularHours.toFixed(2),
            overtimeHours.toFixed(2),
            nightHours.toFixed(2),
            lateMinutes > 0 ? `${lateMinutes} min` : '',
            formatCurrency(dailyPay),
            entry.description || ''
        ]);
    });

    // Fila de totales
    sheetData.push([
        'TOTAL',
        `${data.timeEntries.length} días`,
        '',
        '',
        '',
        hoursSummary.totalRegularHours.toFixed(2),
        hoursSummary.totalOvertimeHours.toFixed(2),
        hoursSummary.totalNightHours.toFixed(2),
        totalLateMinutes > 0 ? `${totalLateMinutes} min` : '',
        formatCurrency(totalDailyPay),
        ''
    ]);

    // Estadísticas adicionales
    sheetData.push(
        [],
        ['RESUMEN DEL PERÍODO', '', '', '', '', '', '', '', '', '', ''],
        ['Días programados:', '24', '', '', '', '', '', '', '', '', ''],
        ['Días trabajados:', data.timeEntries.length, '', '', '', '', '', '', '', '', ''],
        ['Días ausentes:', 24 - data.timeEntries.length, '', '', '', '', '', '', '', '', ''],
        ['Promedio horas/día:', (hoursSummary.totalRegularHours / data.timeEntries.length || 0).toFixed(2), '', '', '', '', '', '', '', '', ''],
        ['Total tardanzas:', `${totalLateMinutes} minutos`, '', '', '', '', '', '', '', '', '']
    );

    const worksheet = xlsx.utils.aoa_to_sheet(sheetData);

    // Configurar anchos de columnas
    worksheet['!cols'] = [
        { wch: 6 },   // Día
        { wch: 10 },  // Fecha
        { wch: 12 },  // Día Semana
        { wch: 8 },   // Entrada
        { wch: 8 },   // Salida
        { wch: 8 },   // H.Reg
        { wch: 8 },   // H.Extra
        { wch: 8 },   // H.Noct
        { wch: 10 },  // Tardanza
        { wch: 15 },  // Pago Día
        { wch: 20 }   // Observaciones
    ];

    return worksheet;
}

/**
 * Crea la hoja de análisis de rendimiento
 */
function createPerformanceAnalysisSheet(data, performanceStats) {
    const sheetData = [
        [`ANÁLISIS DE RENDIMIENTO - ${data.employee.name}`, '', '', '', ''],
        [`Período: ${data.metadata.periodDisplay}`, '', '', '', ''],
        [],

        // MÉTRICAS DE PRODUCTIVIDAD
        ['MÉTRICAS DE PRODUCTIVIDAD', '', '', '', ''],
        ['Indicador', 'Valor', 'Meta', 'Estado', 'Observaciones'],
        ['Días Trabajados', performanceStats.workDays, '24', performanceStats.workDays >= 22 ? 'EXCELENTE' : performanceStats.workDays >= 20 ? 'BUENO' : 'MEJORAR', ''],
        ['Eficiencia (%)', `${performanceStats.efficiency.toFixed(1)}%`, '95%', performanceStats.efficiency >= 95 ? 'EXCELENTE' : performanceStats.efficiency >= 85 ? 'BUENO' : 'MEJORAR', ''],
        ['Puntualidad (%)', `${performanceStats.punctuality.toFixed(1)}%`, '95%', performanceStats.punctuality >= 95 ? 'EXCELENTE' : performanceStats.punctuality >= 85 ? 'BUENO' : 'MEJORAR', ''],
        ['Promedio H/Día', performanceStats.averageHoursPerDay.toFixed(2), '8.0', performanceStats.averageHoursPerDay >= 7.5 ? 'EXCELENTE' : 'REVISAR', ''],
        [],

        // DISTRIBUCIÓN DE HORAS
        ['DISTRIBUCIÓN DE HORAS', '', '', '', ''],
        ['Tipo de Hora', 'Cantidad', 'Porcentaje', 'Valor Pagado', ''],
        ['Horas Regulares', performanceStats.totalRegularHours.toFixed(2), calculatePercentage(performanceStats.totalRegularHours, performanceStats.totalRegularHours + performanceStats.totalOvertimeHours), formatCurrency(data.payroll.regular_pay), ''],
        ['Horas Extra', performanceStats.totalOvertimeHours.toFixed(2), calculatePercentage(performanceStats.totalOvertimeHours, performanceStats.totalRegularHours + performanceStats.totalOvertimeHours), formatCurrency(data.payroll.overtime_pay), ''],
        ['Horas Nocturnas', performanceStats.totalNightHours.toFixed(2), calculatePercentage(performanceStats.totalNightHours, performanceStats.totalRegularHours + performanceStats.totalOvertimeHours), formatCurrency(performanceStats.totalNightPay), ''],
        [],

        // ANÁLISIS FINANCIERO
        ['ANÁLISIS FINANCIERO', '', '', '', ''],
        ['Concepto', 'Valor', 'Porcentaje del Total', '', ''],
        ['Ingresos Totales', formatCurrency(data.payroll.total_income), '100.0%', '', ''],
        ['Deducciones', formatCurrency(data.payroll.total_deductions), calculatePercentage(data.payroll.total_deductions, data.payroll.total_income), '', ''],
        ['Neto a Pagar', formatCurrency(data.payroll.net_pay), calculatePercentage(data.payroll.net_pay, data.payroll.total_income), '', ''],
        [],

        // COMPARATIVO MENSUAL (placeholder para futuras implementaciones)
        ['EVOLUCIÓN HISTÓRICA', '', '', '', ''],
        ['Mes', 'Ingresos', 'Eficiencia', 'Puntualidad', 'Observaciones'],
        [getMonthName(data.period.month), formatCurrency(data.payroll.total_income), `${performanceStats.efficiency.toFixed(1)}%`, `${performanceStats.punctuality.toFixed(1)}%`, 'Período actual'],
        ['(Histórico)', 'Disponible próximamente', '', '', ''],
        [],

        // RECOMENDACIONES
        ['RECOMENDACIONES', '', '', '', ''],
    ];

    // Generar recomendaciones automáticas
    const recommendations = generateRecommendations(performanceStats);
    recommendations.forEach(rec => {
        sheetData.push([rec, '', '', '', '']);
    });

    sheetData.push(
        [],
        [`Reporte generado: ${formatDate(new Date())}`, '', '', '', ''],
        [`Por: ${data.company.name}`, '', '', '', '']
    );

    const worksheet = xlsx.utils.aoa_to_sheet(sheetData);

    // Configurar anchos de columnas
    worksheet['!cols'] = [
        { wch: 20 },  // Indicador/Concepto
        { wch: 15 },  // Valor
        { wch: 15 },  // Meta/Porcentaje
        { wch: 15 },  // Estado/Valor
        { wch: 30 }   // Observaciones
    ];

    return worksheet;
}

/**
 * Aplica formato a la hoja principal
 */
function applyMainSheetFormatting(worksheet, rowCount) {
    // Configurar anchos de columnas
    worksheet['!cols'] = [
        { wch: 20 },  // Concepto
        { wch: 15 },  // Base/Cantidad
        { wch: 15 },  // Tarifa
        { wch: 15 },  // Valor
        { wch: 3 },   // Separador
        { wch: 15 },  // Estadísticas
        { wch: 15 },  // Valor stats
        { wch: 3 },   // Separador
        { wch: 3 }    // Extra
    ];

    // Merge para títulos (se implementaría con una librería más avanzada)
    const merges = [];
    merges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: 8 } }); // Nombre empresa
    merges.push({ s: { r: 5, c: 0 }, e: { r: 5, c: 8 } }); // Título desprendible

    worksheet['!merges'] = merges;

    // Configurar rango de impresión
    worksheet['!ref'] = `A1:I${rowCount}`;

    return worksheet;
}

/**
 * Genera recomendaciones automáticas basadas en el rendimiento
 */
function generateRecommendations(stats) {
    const recommendations = [];

    if (stats.efficiency < 85) {
        recommendations.push('• Revisar asignación de tareas para mejorar eficiencia');
    }

    if (stats.punctuality < 90) {
        recommendations.push('• Implementar plan de mejora en puntualidad');
    }

    if (stats.overtimeRatio > 25) {
        recommendations.push('• Evaluar carga de trabajo para reducir horas extra');
    }

    if (stats.workDays < 20) {
        recommendations.push('• Revisar causas de ausentismo');
    }

    if (stats.averageHoursPerDay < 7) {
        recommendations.push('• Analizar aprovechamiento de jornada laboral');
    }

    if (recommendations.length === 0) {
        recommendations.push('• Rendimiento excelente, mantener estándares actuales');
    }

    return recommendations;
}

module.exports = {
    generatePayslipExcel
};