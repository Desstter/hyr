const moment = require('moment');

// Configurar moment en español
moment.locale('es');

/**
 * Formatea un número como moneda colombiana
 * @param {number|string} amount - Cantidad a formatear
 * @returns {string} - Cantidad formateada como COP
 */
function formatCurrency(amount) {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
    }).format(num || 0);
}

/**
 * Obtiene el nombre del mes en español
 * @param {number} month - Número del mes (1-12)
 * @returns {string} - Nombre del mes
 */
function getMonthName(month) {
    const months = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return months[month - 1] || month.toString();
}

/**
 * Calcula minutos de tardanza
 * @param {string} arrivalTime - Hora de llegada (HH:mm)
 * @param {string} expectedTime - Hora esperada (HH:mm)
 * @returns {number} - Minutos de tardanza
 */
function calculateLateMinutes(arrivalTime, expectedTime) {
    if (!arrivalTime || !expectedTime) return 0;

    try {
        const timeToMinutes = (timeStr) => {
            const [hours, minutes] = timeStr.split(':').map(Number);
            return (hours * 60) + minutes;
        };

        const arrivalMinutes = timeToMinutes(arrivalTime);
        const expectedMinutes = timeToMinutes(expectedTime);

        return Math.max(0, arrivalMinutes - expectedMinutes);
    } catch (error) {
        console.error('Error calculating late minutes:', error);
        return 0;
    }
}

/**
 * Formatea fecha con formato colombiano
 * @param {Date|string} date - Fecha a formatear
 * @returns {string} - Fecha formateada
 */
function formatDate(date) {
    return moment(date).format('DD/MM/YYYY');
}

/**
 * Formatea fecha y hora con formato colombiano
 * @param {Date|string} datetime - Fecha y hora a formatear
 * @returns {string} - Fecha y hora formateada
 */
function formatDateTime(datetime) {
    return moment(datetime).format('DD/MM/YYYY HH:mm:ss');
}

/**
 * Calcula el porcentaje de un valor sobre un total
 * @param {number} value - Valor
 * @param {number} total - Total
 * @returns {string} - Porcentaje formateado
 */
function calculatePercentage(value, total) {
    if (!total || total === 0) return '0.0%';
    return ((value / total) * 100).toFixed(1) + '%';
}

/**
 * Formatea número con separadores de miles
 * @param {number|string} number - Número a formatear
 * @returns {string} - Número formateado
 */
function formatNumber(number) {
    const num = typeof number === 'string' ? parseFloat(number) : number;
    return new Intl.NumberFormat('es-CO').format(num || 0);
}

/**
 * Convierte texto a formato título (Primera Letra Mayúscula)
 * @param {string} text - Texto a convertir
 * @returns {string} - Texto en formato título
 */
function toTitleCase(text) {
    if (!text) return '';
    return text.toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
}

/**
 * Genera un ID único para documentos
 * @param {string} prefix - Prefijo del ID
 * @returns {string} - ID único
 */
function generateDocumentId(prefix = 'DOC') {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix}_${timestamp}_${random}`;
}

/**
 * Valida si una fecha está en un rango específico
 * @param {Date|string} date - Fecha a validar
 * @param {Date|string} startDate - Fecha de inicio
 * @param {Date|string} endDate - Fecha de fin
 * @returns {boolean} - True si está en el rango
 */
function isDateInRange(date, startDate, endDate) {
    const checkDate = moment(date);
    const start = moment(startDate);
    const end = moment(endDate);
    return checkDate.isBetween(start, end, 'day', '[]'); // Incluye las fechas límite
}

/**
 * Obtiene el rango de fechas de un período de nómina
 * @param {number} year - Año
 * @param {number} month - Mes (1-12)
 * @returns {Object} - Objeto con startDate y endDate
 */
function getPayrollPeriodDates(year, month) {
    const startDate = moment({ year, month: month - 1, day: 1 }).format('YYYY-MM-DD');
    const endDate = moment({ year, month: month - 1 }).endOf('month').format('YYYY-MM-DD');

    return {
        startDate,
        endDate,
        displayPeriod: `${getMonthName(month)} ${year}`
    };
}

/**
 * Colores corporativos para documentos - Esquema profesional mejorado
 */
const CORPORATE_COLORS = {
    primary: '#2563eb',      // Azul profesional mejorado
    secondary: '#475569',    // Gris oscuro profesional
    accent: '#16a34a',       // Verde profesional
    warning: '#dc6e02',      // Naranja profesional
    danger: '#dc2626',       // Rojo
    background: '#f1f5f9',   // Gris muy claro
    lightBlue: '#e0f2fe',    // Azul claro para backgrounds
    white: '#ffffff',
    black: '#1e293b',        // Negro más suave
    border: '#cbd5e1',       // Gris para bordes
    text: '#334155'          // Gris oscuro para texto
};

/**
 * Configuración de fuentes para PDFs - Optimizada para legibilidad
 */
const FONT_CONFIG = {
    title: { font: 'Helvetica-Bold', size: 18 },
    subtitle: { font: 'Helvetica-Bold', size: 14 },
    header: { font: 'Helvetica-Bold', size: 11 },
    body: { font: 'Helvetica', size: 9 },
    small: { font: 'Helvetica', size: 8 },
    caption: { font: 'Helvetica-Oblique', size: 7 },
    tableHeader: { font: 'Helvetica-Bold', size: 8 },
    tableBody: { font: 'Helvetica', size: 8 }
};

/**
 * Configuración de márgenes para documentos
 */
const MARGINS = {
    standard: { top: 50, bottom: 50, left: 50, right: 50 },
    compact: { top: 30, bottom: 30, left: 30, right: 30 },
    wide: { top: 50, bottom: 50, left: 80, right: 80 }
};

module.exports = {
    // Funciones de formateo
    formatCurrency,
    formatDate,
    formatDateTime,
    formatNumber,
    calculatePercentage,
    toTitleCase,

    // Funciones de fecha y tiempo
    getMonthName,
    calculateLateMinutes,
    isDateInRange,
    getPayrollPeriodDates,

    // Utilidades
    generateDocumentId,

    // Configuración de diseño
    CORPORATE_COLORS,
    FONT_CONFIG,
    MARGINS
};