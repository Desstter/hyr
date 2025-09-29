const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const moment = require('moment');
const {
    formatCurrency,
    formatDate,
    formatDateTime,
    calculatePercentage,
    CORPORATE_COLORS,
    FONT_CONFIG,
    MARGINS
} = require('../document-helpers');
const { calculateHoursSummary, calculatePerformanceStats } = require('../payroll-documents');

/**
 * Genera PDF del desprendible de nómina con diseño mejorado
 * @param {Object} data - Datos completos de nómina
 * @returns {Promise<Buffer>} - Buffer del PDF generado
 */
async function generatePayslipPDF(data) {
    return new Promise(async (resolve, reject) => {
        try {
            // Validar datos antes de generar PDF
            if (!data || !data.employee || !data.payroll || !data.period) {
                throw new Error('Datos de nómina incompletos para generar PDF');
            }

            // Asegurar que timeEntries existe
            if (!data.timeEntries) {
                data.timeEntries = [];
            }

            // Validar que hay al menos un registro de tiempo
            if (data.timeEntries.length === 0) {
                console.warn(`No hay registros de tiempo para ${data.employee.name} en el período ${data.metadata.periodDisplay}`);
            }

            const doc = new PDFDocument({
                margin: MARGINS.standard.top,
                size: 'A4',
                info: {
                    Title: `Desprendible de Nómina - ${data.employee.name || 'Sin nombre'}`,
                    Author: data.company.name || 'HYR Constructora',
                    Subject: `Período ${data.metadata.periodDisplay || 'Sin período'}`,
                    Creator: 'Sistema HYR Payroll',
                    Producer: 'HYR Constructora & Soldadura'
                }
            });

            const buffers = [];
            doc.on('data', buffer => buffers.push(buffer));
            doc.on('end', () => {
                if (buffers.length === 0) {
                    reject(new Error('PDF generado sin contenido'));
                } else {
                    resolve(Buffer.concat(buffers));
                }
            });
            doc.on('error', (error) => {
                console.error('Error en generación de PDF:', error);
                reject(error);
            });

            // Calcular estadísticas con validación
            const hoursSummary = calculateHoursSummary(data.timeEntries || []);
            const performanceStats = calculatePerformanceStats(data.employee, data.timeEntries || []);

            // Generar QR Code simplificado y legible
            const qrData = `EMP:${data.employee.id}|PER:${data.period.id}|DOC:${data.documentId}`;

            const qrCodeDataURL = await QRCode.toDataURL(qrData, {
                width: 140,
                margin: 2,
                color: {
                    dark: CORPORATE_COLORS.black,
                    light: '#FFFFFF'
                },
                errorCorrectionLevel: 'M'
            });

            // ============================================
            // HEADER CORPORATIVO OPTIMIZADO
            // ============================================
            await drawOptimizedHeader(doc, data, qrCodeDataURL);

            // ============================================
            // INFORMACIÓN DEL PERÍODO Y EMPLEADO
            // ============================================
            let currentY = drawEmployeeInfo(doc, data);

            // ============================================
            // DETALLE DE HORAS OPTIMIZADO
            // ============================================
            currentY = drawOptimizedHoursTable(doc, data, hoursSummary, currentY);

            // ============================================
            // SECCIÓN DE INGRESOS
            // ============================================
            currentY = drawIncomesSection(doc, data, hoursSummary, currentY);

            // ============================================
            // SECCIÓN DE DEDUCCIONES
            // ============================================
            currentY = drawDeductionsSection(doc, data, currentY);

            // ============================================
            // NETO A PAGAR DESTACADO
            // ============================================
            currentY = drawNetPaySection(doc, data, currentY);

            // ============================================
            // ESTADÍSTICAS DE RENDIMIENTO
            // ============================================
            currentY = drawPerformanceStats(doc, performanceStats, currentY);

            // ============================================
            // FOOTER SIMPLIFICADO
            // ============================================
            drawSimplifiedFooter(doc, data);

            doc.end();

        } catch (error) {
            console.error('Error generando PDF:', error);
            reject(error);
        }
    });
}

/**
 * Dibuja el header corporativo optimizado
 */
async function drawOptimizedHeader(doc, data, qrCodeDataURL) {
    const pageWidth = doc.page.width;
    const headerHeight = 80; // Reducido de 120 a 80

    // Fondo del header con gradiente visual
    doc.rect(0, 0, pageWidth, headerHeight)
       .fillAndStroke(CORPORATE_COLORS.primary, CORPORATE_COLORS.primary);

    // Información de la empresa (sin logo placeholder)
    doc.fillColor('#FFFFFF')
       .fontSize(FONT_CONFIG.title.size)
       .font(FONT_CONFIG.title.font)
       .text(data.company.name, 50, 15);

    doc.fontSize(FONT_CONFIG.small.size)
       .font(FONT_CONFIG.body.font)
       .text(`NIT: ${data.company.nit} | ${data.company.address} | Tel: ${data.company.phone}`, 50, 35);

    // QR Code mejorado
    if (qrCodeDataURL) {
        const qrBuffer = Buffer.from(qrCodeDataURL.split(',')[1], 'base64');
        doc.image(qrBuffer, pageWidth - 160, 10, { width: 60, height: 60 });

        // Descripción del QR
        doc.fontSize(FONT_CONFIG.caption.size)
           .text('Verificación', pageWidth - 160, 75, { width: 60, align: 'center' });
    }

    // Título del documento
    doc.fillColor('#FFFFFF')
       .fontSize(FONT_CONFIG.subtitle.size)
       .font(FONT_CONFIG.subtitle.font)
       .text('DESPRENDIBLE DE NÓMINA', 50, 55);

    doc.fillColor(CORPORATE_COLORS.text); // Reset color
}

/**
 * Dibuja la información del empleado y período
 */
function drawEmployeeInfo(doc, data) {
    let currentY = 100; // Ajustado para el nuevo header más pequeño

    // Box de información del período con mejor styling
    doc.rect(50, currentY, 240, 70)
       .fillAndStroke(CORPORATE_COLORS.lightBlue, CORPORATE_COLORS.border);

    doc.fillColor(CORPORATE_COLORS.primary)
       .fontSize(FONT_CONFIG.header.size)
       .font(FONT_CONFIG.header.font)
       .text('PERÍODO', 60, currentY + 8);

    doc.fillColor(CORPORATE_COLORS.text)
       .fontSize(FONT_CONFIG.body.size)
       .font(FONT_CONFIG.body.font)
       .text(`${data.metadata.periodDisplay}`, 60, currentY + 25)
       .text(`Procesado: ${formatDate(data.period.processed_at || new Date())}`, 60, currentY + 40)
       .text(`ID: ${data.documentId.slice(-8)}`, 60, currentY + 55);

    // Box de información del empleado
    doc.rect(310, currentY, 240, 70)
       .fillAndStroke(CORPORATE_COLORS.background, CORPORATE_COLORS.border);

    doc.fillColor(CORPORATE_COLORS.primary)
       .fontSize(FONT_CONFIG.header.size)
       .font(FONT_CONFIG.header.font)
       .text('EMPLEADO', 320, currentY + 8);

    doc.fillColor(CORPORATE_COLORS.text)
       .fontSize(FONT_CONFIG.body.size)
       .font(FONT_CONFIG.body.font)
       .text(`${data.employee.name}`, 320, currentY + 25)
       .text(`CC: ${data.employee.document_number}`, 320, currentY + 40)
       .text(`${data.employee.position}`, 320, currentY + 55);

    return currentY + 85;
}

/**
 * Dibuja tabla detallada de horas trabajadas con desglose diario completo
 */
function drawOptimizedHoursTable(doc, data, hoursSummary, startY) {
    let currentY = startY + 15;

    // Título de la sección
    doc.fillColor(CORPORATE_COLORS.primary)
       .fontSize(FONT_CONFIG.header.size)
       .font(FONT_CONFIG.header.font)
       .text('DETALLE DIARIO DE HORAS TRABAJADAS', 50, currentY);

    currentY += 20;

    // Verificar si hay suficiente espacio, si no, crear nueva página
    const pageHeight = doc.page.height;
    const remainingSpace = pageHeight - currentY - 100; // 100 margin for footer
    const estimatedTableHeight = (data.timeEntries.length + 2) * 18; // Estimate table height

    if (estimatedTableHeight > remainingSpace) {
        doc.addPage();
        currentY = 50; // Reset Y position for new page
    }

    // Headers de la tabla detallada
    const headers = ['Fecha', 'Ingreso', 'Salida', 'H.Reg', 'H.Extra', 'H.Noct', 'Tardanza', 'Total Día'];
    const colWidths = [60, 50, 50, 45, 45, 45, 50, 70];
    const tableX = 50;
    const totalTableWidth = colWidths.reduce((a, b) => a + b, 0);
    const rowHeight = 16;

    // Header de tabla
    doc.rect(tableX, currentY, totalTableWidth, rowHeight + 2)
       .fillAndStroke(CORPORATE_COLORS.secondary, CORPORATE_COLORS.secondary);

    doc.fillColor('#FFFFFF')
       .fontSize(8)
       .font(FONT_CONFIG.tableHeader.font);

    let colX = tableX;
    headers.forEach((header, index) => {
        doc.text(header, colX + 2, currentY + 5, {
            width: colWidths[index] - 4,
            align: 'center'
        });
        colX += colWidths[index];
    });

    currentY += rowHeight + 2;

    // Filas de datos detalladas
    if (data.timeEntries.length === 0) {
        // Mostrar mensaje cuando no hay registros de tiempo
        doc.rect(tableX, currentY, totalTableWidth, rowHeight)
           .fillAndStroke(CORPORATE_COLORS.background, CORPORATE_COLORS.background);

        doc.fillColor(CORPORATE_COLORS.text)
           .fontSize(8)
           .font(FONT_CONFIG.body.font)
           .text('No hay registros de tiempo para este período', tableX + 10, currentY + 5, {
               width: totalTableWidth - 20,
               align: 'center'
           });

        currentY += rowHeight;
    } else {
        data.timeEntries.forEach((entry, rowIndex) => {
            // Fondo alternado para mejor legibilidad
            if (rowIndex % 2 === 0) {
                doc.rect(tableX, currentY, totalTableWidth, rowHeight)
                   .fillAndStroke(CORPORATE_COLORS.background, CORPORATE_COLORS.background);
            }

            doc.fillColor(CORPORATE_COLORS.text)
               .fontSize(7)
               .font(FONT_CONFIG.tableBody.font);

            // Preparar datos de la fila
            const workDate = formatDate(entry.work_date);
            const arrivalTime = entry.arrival_time || '07:00';
            const departureTime = entry.departure_time || '15:30';
            const regularHours = parseFloat(entry.hours_worked || 0).toFixed(1);
            const overtimeHours = parseFloat(entry.overtime_hours || 0).toFixed(1);
            const nightHours = parseFloat(entry.night_hours || 0).toFixed(1);
            const lateMinutes = parseInt(entry.late_minutes || 0);
            const lateDisplay = lateMinutes > 0 ? `${lateMinutes}min` : '-';
            const dailyTotal = formatCurrency(entry.total_pay || 0);

            const rowData = [
                workDate,
                arrivalTime,
                departureTime,
                regularHours,
                overtimeHours,
                nightHours,
                lateDisplay,
                dailyTotal
            ];

            // Dibujar cada celda
            colX = tableX;
            rowData.forEach((cellData, colIndex) => {
                const align = colIndex === 0 ? 'left' : colIndex >= 6 ? 'right' : 'center';
                doc.text(cellData, colX + 2, currentY + 4, {
                    width: colWidths[colIndex] - 4,
                    align: align
                });
                colX += colWidths[colIndex];
            });

            currentY += rowHeight;
        });
    }

    // Línea separadora antes de totales
    currentY += 5;
    doc.moveTo(tableX, currentY)
       .lineTo(tableX + totalTableWidth, currentY)
       .stroke(CORPORATE_COLORS.border);
    currentY += 10;

    // Fila de totales
    doc.rect(tableX, currentY, totalTableWidth, rowHeight + 2)
       .fillAndStroke(CORPORATE_COLORS.accent, CORPORATE_COLORS.accent);

    doc.fillColor('#FFFFFF')
       .fontSize(8)
       .font(FONT_CONFIG.tableHeader.font);

    const totalsData = [
        'TOTALES',
        '-',
        '-',
        hoursSummary.totalRegularHours.toFixed(1),
        hoursSummary.totalOvertimeHours.toFixed(1),
        hoursSummary.totalNightHours.toFixed(1),
        `${hoursSummary.totalLateMinutes}min`,
        formatCurrency(data.payroll.total_income)
    ];

    colX = tableX;
    totalsData.forEach((cellData, colIndex) => {
        const align = colIndex === 0 ? 'left' : colIndex >= 6 ? 'right' : 'center';
        doc.text(cellData, colX + 2, currentY + 5, {
            width: colWidths[colIndex] - 4,
            align: align
        });
        colX += colWidths[colIndex];
    });

    currentY += rowHeight + 15;

    // Agregar explicación de cálculos
    doc.fillColor(CORPORATE_COLORS.text)
       .fontSize(FONT_CONFIG.caption.size)
       .font(FONT_CONFIG.caption.font)
       .text('* H.Extra: Horas extras con recargo del 25% | H.Noct: Horas nocturnas con recargo del 35% (22:00-06:00)',
              50, currentY, { width: 500 });

    return currentY + 30;
}

/**
 * Dibuja la sección de ingresos con cálculos detallados
 */
function drawIncomesSection(doc, data, hoursSummary, startY) {
    let currentY = startY + 15;

    // Título
    doc.fillColor(CORPORATE_COLORS.accent)
       .fontSize(FONT_CONFIG.header.size)
       .font(FONT_CONFIG.header.font)
       .text('INGRESOS DETALLADOS', 50, currentY);

    currentY += 20;

    // Calcular tarifa base
    const baseHourlyRate = hoursSummary.totalRegularHours > 0 ?
        (parseFloat(data.payroll.regular_pay) / hoursSummary.totalRegularHours) : 0;

    // Box de ingresos expandido para mostrar cálculos
    const boxHeight = 130;
    doc.rect(50, currentY, 500, boxHeight)
       .fillAndStroke(CORPORATE_COLORS.lightBlue, CORPORATE_COLORS.border);

    doc.fillColor(CORPORATE_COLORS.text)
       .fontSize(FONT_CONFIG.body.size)
       .font(FONT_CONFIG.body.font);

    const incomeY = currentY + 12;
    let lineY = incomeY;

    // Salario regular con cálculo
    doc.text('Salario regular:', 70, lineY)
       .fontSize(FONT_CONFIG.caption.size)
       .text(`${hoursSummary.totalRegularHours.toFixed(1)}h × ${formatCurrency(baseHourlyRate)}`, 200, lineY)
       .fontSize(FONT_CONFIG.body.size)
       .text(formatCurrency(data.payroll.regular_pay), 450, lineY, { align: 'right' });
    lineY += 18;

    // Horas extra con cálculo detallado (solo si existen)
    if (hoursSummary.totalOvertimeHours > 0) {
        const overtimeRate = baseHourlyRate * 1.25;
        doc.text('Horas extra (25%):', 70, lineY)
           .fontSize(FONT_CONFIG.caption.size)
           .text(`${hoursSummary.totalOvertimeHours.toFixed(1)}h × ${formatCurrency(overtimeRate)}`, 200, lineY)
           .fontSize(FONT_CONFIG.body.size)
           .text(formatCurrency(data.payroll.overtime_pay), 450, lineY, { align: 'right' });
        lineY += 18;
    }

    // Recargo nocturno con cálculo detallado (solo si existe)
    if (hoursSummary.totalNightHours > 0) {
        const nightRate = baseHourlyRate * 0.35; // 35% adicional
        doc.text('Recargo nocturno (35%):', 70, lineY)
           .fontSize(FONT_CONFIG.caption.size)
           .text(`${hoursSummary.totalNightHours.toFixed(1)}h × ${formatCurrency(nightRate)}`, 200, lineY)
           .fontSize(FONT_CONFIG.body.size)
           .text(formatCurrency(hoursSummary.totalNightPay), 450, lineY, { align: 'right' });
        lineY += 18;
    }

    // Auxilio de transporte (solo si existe)
    if (parseFloat(data.payroll.transport_allowance || 0) > 0) {
        doc.text('Auxilio de transporte:', 70, lineY)
           .fontSize(FONT_CONFIG.caption.size)
           .text('Subsidio legal', 200, lineY)
           .fontSize(FONT_CONFIG.body.size)
           .text(formatCurrency(data.payroll.transport_allowance), 450, lineY, { align: 'right' });
        lineY += 18;
    }

    // Bonificaciones (si existen)
    if (parseFloat(data.payroll.bonuses || 0) > 0) {
        doc.text('Bonificaciones:', 70, lineY)
           .fontSize(FONT_CONFIG.caption.size)
           .text('Adicionales del período', 200, lineY)
           .fontSize(FONT_CONFIG.body.size)
           .text(formatCurrency(data.payroll.bonuses), 450, lineY, { align: 'right' });
        lineY += 18;
    }

    // Total ingresos destacado
    const totalY = currentY + boxHeight - 22;
    doc.rect(70, totalY, 460, 18)
       .fillAndStroke(CORPORATE_COLORS.accent, CORPORATE_COLORS.accent);

    doc.fillColor('#FFFFFF')
       .fontSize(FONT_CONFIG.header.size)
       .font(FONT_CONFIG.header.font)
       .text('TOTAL INGRESOS:', 80, totalY + 5)
       .text(formatCurrency(data.payroll.total_income), 450, totalY + 5, { align: 'right' });

    return currentY + boxHeight + 15;
}

/**
 * Dibuja la sección de deducciones optimizada
 */
function drawDeductionsSection(doc, data, startY) {
    let currentY = startY + 15;

    // Título
    doc.fillColor(CORPORATE_COLORS.warning)
       .fontSize(FONT_CONFIG.header.size)
       .font(FONT_CONFIG.header.font)
       .text('DEDUCCIONES', 50, currentY);

    currentY += 20;

    // Box de deducciones optimizado
    const boxHeight = 75;
    doc.rect(50, currentY, 500, boxHeight)
       .fillAndStroke(CORPORATE_COLORS.background, CORPORATE_COLORS.border);

    doc.fillColor(CORPORATE_COLORS.text)
       .fontSize(FONT_CONFIG.body.size)
       .font(FONT_CONFIG.body.font);

    const deductionY = currentY + 12;
    let lineY = deductionY;

    // Salud
    doc.text('Salud (4%):', 70, lineY)
       .text(formatCurrency(data.payroll.health_employee), 450, lineY, { align: 'right' });
    lineY += 15;

    // Pensión
    doc.text('Pensión (4%):', 70, lineY)
       .text(formatCurrency(data.payroll.pension_employee), 450, lineY, { align: 'right' });
    lineY += 15;

    // Solidaridad solo si aplica
    if (parseFloat(data.payroll.solidarity_contribution || 0) > 0) {
        doc.text('Solidaridad (1%):', 70, lineY)
           .text(formatCurrency(data.payroll.solidarity_contribution), 450, lineY, { align: 'right' });
    }

    // Total deducciones
    const totalY = currentY + boxHeight - 20;
    doc.rect(70, totalY, 460, 16)
       .fillAndStroke(CORPORATE_COLORS.warning, CORPORATE_COLORS.warning);

    doc.fillColor('#FFFFFF')
       .fontSize(FONT_CONFIG.header.size)
       .font(FONT_CONFIG.header.font)
       .text('TOTAL DEDUCCIONES:', 80, totalY + 4)
       .text(formatCurrency(data.payroll.total_deductions), 450, totalY + 4, { align: 'right' });

    return currentY + boxHeight + 15;
}

/**
 * Dibuja la sección del neto a pagar optimizada
 */
function drawNetPaySection(doc, data, startY) {
    let currentY = startY + 15;

    // Box destacado para neto a pagar - más compacto
    doc.rect(50, currentY, 500, 40)
       .fillAndStroke(CORPORATE_COLORS.primary, CORPORATE_COLORS.primary);

    doc.fillColor('#FFFFFF')
       .fontSize(16)
       .font(FONT_CONFIG.title.font)
       .text('NETO A PAGAR:', 70, currentY + 12)
       .fontSize(18)
       .text(formatCurrency(data.payroll.net_pay), 350, currentY + 12, { align: 'right' });

    return currentY + 55;
}

/**
 * Dibuja estadísticas simplificadas del período
 */
function drawPerformanceStats(doc, stats, startY) {
    let currentY = startY + 15;

    // Título compacto
    doc.fillColor(CORPORATE_COLORS.secondary)
       .fontSize(FONT_CONFIG.header.size)
       .font(FONT_CONFIG.header.font)
       .text('RESUMEN DEL PERÍODO', 50, currentY);

    currentY += 18;

    // Stats en una sola línea compacta
    doc.fillColor(CORPORATE_COLORS.text)
       .fontSize(FONT_CONFIG.body.size)
       .font(FONT_CONFIG.body.font);

    doc.text(`Días: ${stats.workDays}`, 70, currentY)
       .text(`Eficiencia: ${stats.efficiency.toFixed(0)}%`, 150, currentY)
       .text(`Puntualidad: ${stats.punctuality.toFixed(0)}%`, 250, currentY)
       .text(`Promedio H/día: ${stats.averageHoursPerDay.toFixed(1)}`, 350, currentY);

    return currentY + 25;
}

/**
 * Dibuja el footer simplificado del documento
 */
function drawSimplifiedFooter(doc, data) {
    const footerY = doc.page.height - 50;

    // Línea separadora sutil
    doc.moveTo(50, footerY)
       .lineTo(550, footerY)
       .stroke(CORPORATE_COLORS.border);

    // Información esencial solamente
    doc.fillColor(CORPORATE_COLORS.text)
       .fontSize(FONT_CONFIG.caption.size)
       .font(FONT_CONFIG.caption.font)
       .text(`Comprobante oficial de pago | Generado: ${formatDate(new Date())} | ID: ${data.documentId.slice(-8)}`, 50, footerY + 8, { width: 400 })
       .text(data.company.name, 450, footerY + 8, { align: 'right' });
}

module.exports = {
    generatePayslipPDF
};