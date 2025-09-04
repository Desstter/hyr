// =====================================================
// DIAN IDS - GENERACIÓN DE CUFE, CUNE E IDENTIFICADORES DIAN
// HYR CONSTRUCTORA & SOLDADURA
// =====================================================

const crypto = require('crypto');
const { format } = require('date-fns');

/**
 * Genera CUFE (Código Único de Facturación Electrónica)
 * Basado en especificaciones DIAN para facturas electrónicas
 * 
 * @param {Object} invoiceData - Datos de la factura
 * @param {string} invoiceData.invoiceNumber - Número de factura
 * @param {string} invoiceData.issueDate - Fecha emisión (ISO string)
 * @param {number} invoiceData.totalAmount - Valor total factura
 * @param {string} invoiceData.supplierNIT - NIT emisor
 * @param {string} invoiceData.customerNIT - NIT cliente
 * @returns {string} CUFE generado
 */
function generateCUFE(invoiceData) {
    try {
        // Datos requeridos para CUFE según DIAN
        const {
            invoiceNumber,
            issueDate,
            totalAmount,
            supplierNIT,
            customerNIT = '22222222222222'  // Default para consumidor final
        } = invoiceData;
        
        // Validar datos obligatorios
        if (!invoiceNumber || !issueDate || !totalAmount || !supplierNIT) {
            throw new Error('Datos insuficientes para generar CUFE');
        }
        
        // Formatear fecha para CUFE (YYYYMMDD)
        const formattedDate = format(new Date(issueDate), 'yyyyMMdd');
        
        // Formatear monto con 2 decimales
        const formattedAmount = parseFloat(totalAmount).toFixed(2);
        
        // Construir string base para hash
        const baseString = [
            invoiceNumber,
            formattedDate,
            formattedAmount,
            supplierNIT,
            customerNIT,
            'HYR2025' // Identificador empresa/año
        ].join('|');
        
        // Generar hash SHA-256
        const hash = crypto.createHash('sha256').update(baseString).digest('hex');
        
        // CUFE: tomar primeros 32 caracteres y formatear
        const cufe = hash.substring(0, 32).toUpperCase();
        
        // Formatear con guiones para legibilidad (opcional)
        const formattedCUFE = [
            cufe.substring(0, 8),
            cufe.substring(8, 16),
            cufe.substring(16, 24),
            cufe.substring(24, 32)
        ].join('-');
        
        console.log(`✅ CUFE generado para factura ${invoiceNumber}: ${formattedCUFE}`);
        
        return formattedCUFE;
        
    } catch (error) {
        console.error('❌ Error generando CUFE:', error.message);
        throw new Error(`Error generando CUFE: ${error.message}`);
    }
}

/**
 * Genera CUNE (Código Único de Nómina Electrónica)
 * Basado en especificaciones DIAN para nómina electrónica
 * 
 * @param {Object} payrollData - Datos de nómina
 * @param {string} payrollData.period - Período YYYY-MM
 * @param {string} payrollData.employeeDocument - Documento empleado
 * @param {string} payrollData.employeeName - Nombre empleado
 * @param {number} payrollData.baseSalary - Salario base
 * @param {number} payrollData.workedDays - Días trabajados
 * @returns {string} CUNE generado
 */
function generateCUNE(payrollData) {
    try {
        const {
            period,
            employeeDocument,
            employeeName,
            baseSalary,
            workedDays
        } = payrollData;
        
        // Validar datos obligatorios
        if (!period || !employeeDocument || !employeeName || !baseSalary) {
            throw new Error('Datos insuficientes para generar CUNE');
        }
        
        // Formatear período (YYYYMM)
        const formattedPeriod = period.replace('-', '');
        
        // Formatear salario con 2 decimales
        const formattedSalary = parseFloat(baseSalary).toFixed(2);
        
        // Normalizar nombre (sin tildes, mayúsculas, sin espacios extra)
        const normalizedName = employeeName
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toUpperCase()
            .replace(/\s+/g, ' ')
            .trim();
        
        // Construir string base para hash
        const baseString = [
            formattedPeriod,
            employeeDocument,
            normalizedName,
            formattedSalary,
            workedDays || 30,
            'PAYROLL2025' // Identificador nómina/año
        ].join('|');
        
        // Generar hash SHA-256
        const hash = crypto.createHash('sha256').update(baseString).digest('hex');
        
        // CUNE: tomar primeros 32 caracteres
        const cune = hash.substring(0, 32).toUpperCase();
        
        // Formatear con guiones
        const formattedCUNE = [
            cune.substring(0, 8),
            cune.substring(8, 16),
            cune.substring(16, 24),
            cune.substring(24, 32)
        ].join('-');
        
        console.log(`✅ CUNE generado para ${employeeName} período ${period}: ${formattedCUNE}`);
        
        return formattedCUNE;
        
    } catch (error) {
        console.error('❌ Error generando CUNE:', error.message);
        throw new Error(`Error generando CUNE: ${error.message}`);
    }
}

/**
 * Genera número de documento soporte DIAN
 * Formato: DS-HYR-YYYY-000001
 * 
 * @param {number} year - Año del documento
 * @param {number} sequence - Número secuencial
 * @returns {string} Número de documento soporte
 */
function generateDocumentSupportNumber(year, sequence) {
    const paddedSequence = sequence.toString().padStart(6, '0');
    return `DS-HYR-${year}-${paddedSequence}`;
}

/**
 * Genera número de factura con prefijo DIAN
 * Formato: SETT000001, SETT000002, etc.
 * 
 * @param {string} prefix - Prefijo autorizado DIAN (ej: "SETT")
 * @param {number} sequence - Número secuencial
 * @returns {string} Número de factura
 */
function generateInvoiceNumber(prefix = 'SETT', sequence) {
    const paddedSequence = sequence.toString().padStart(6, '0');
    return `${prefix}${paddedSequence}`;
}

/**
 * Valida formato de CUFE
 * @param {string} cufe - CUFE a validar
 * @returns {boolean} True si formato es válido
 */
function validateCUFE(cufe) {
    if (!cufe || typeof cufe !== 'string') return false;
    
    // Remover guiones para validación
    const cleanCUFE = cufe.replace(/-/g, '');
    
    // Debe ser hexadecimal de 32 caracteres
    const hexPattern = /^[A-F0-9]{32}$/;
    return hexPattern.test(cleanCUFE.toUpperCase());
}

/**
 * Valida formato de CUNE
 * @param {string} cune - CUNE a validar
 * @returns {boolean} True si formato es válido
 */
function validateCUNE(cune) {
    if (!cune || typeof cune !== 'string') return false;
    
    // Remover guiones para validación
    const cleanCUNE = cune.replace(/-/g, '');
    
    // Debe ser hexadecimal de 32 caracteres
    const hexPattern = /^[A-F0-9]{32}$/;
    return hexPattern.test(cleanCUNE.toUpperCase());
}

/**
 * Genera UUID v4 para IDs únicos
 * @returns {string} UUID v4
 */
function generateUUID() {
    return crypto.randomUUID();
}

/**
 * Genera hash determinista para datos específicos
 * Útil para evitar duplicados
 * 
 * @param {string} data - Datos a hashear
 * @returns {string} Hash SHA-256 en hexadecimal
 */
function generateDeterministicHash(data) {
    return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Simula respuesta de validación DIAN
 * Para usar en MVP hasta implementar integración real
 * 
 * @param {string} documentType - Tipo: 'CUFE', 'CUNE', 'DS'
 * @returns {Object} Respuesta simulada DIAN
 */
function simulateDIANValidation(documentType) {
    // Simular respuesta exitosa 90% del tiempo
    const isSuccess = Math.random() > 0.1;
    
    const responses = {
        success: {
            status: 'ACEPTADO_SIMULADO',
            code: '200',
            message: 'Documento procesado exitosamente (simulación)',
            timestamp: new Date().toISOString(),
            trackingId: generateUUID()
        },
        error: {
            status: 'RECHAZADO_SIMULADO',
            code: '400',
            message: 'Error de validación (simulación)',
            timestamp: new Date().toISOString(),
            errors: ['Simulación de error para testing']
        }
    };
    
    return isSuccess ? responses.success : responses.error;
}

module.exports = {
    generateCUFE,
    generateCUNE,
    generateDocumentSupportNumber,
    generateInvoiceNumber,
    validateCUFE,
    validateCUNE,
    generateUUID,
    generateDeterministicHash,
    simulateDIANValidation
};