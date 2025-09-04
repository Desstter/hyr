// =====================================================
// TAX LOADER - CARGA DINÁMICA DE CONFIGURACIÓN TRIBUTARIA
// HYR CONSTRUCTORA & SOLDADURA
// =====================================================

const fs = require('fs');
const path = require('path');

/**
 * Cache para configuraciones tributarias cargadas
 */
const taxConfigCache = new Map();

/**
 * Carga configuración tributaria por año desde archivo JSON
 * @param {number} year - Año a cargar (2025, 2026, etc.)
 * @returns {Object} Configuración tributaria completa
 */
function loadTaxConfig(year) {
    // Verificar cache primero
    if (taxConfigCache.has(year)) {
        return taxConfigCache.get(year);
    }
    
    try {
        const configPath = path.join(__dirname, '..', 'config', 'tax', `${year}.json`);
        
        if (!fs.existsSync(configPath)) {
            throw new Error(`Configuración tributaria no encontrada para el año ${year}`);
        }
        
        const configData = fs.readFileSync(configPath, 'utf8');
        const taxConfig = JSON.parse(configData);
        
        // Validar estructura básica
        validateTaxConfig(taxConfig, year);
        
        // Guardar en cache
        taxConfigCache.set(year, taxConfig);
        
        console.log(`✅ Configuración tributaria ${year} cargada correctamente`);
        return taxConfig;
        
    } catch (error) {
        console.error(`❌ Error cargando configuración tributaria ${year}:`, error.message);
        throw error;
    }
}

/**
 * Valida estructura de configuración tributaria
 * @param {Object} config - Configuración a validar
 * @param {number} year - Año esperado
 */
function validateTaxConfig(config, year) {
    const requiredFields = ['year', 'uvt', 'vat', 'ica', 'withholding_tax'];
    
    // Verificar campos obligatorios
    for (const field of requiredFields) {
        if (!config[field]) {
            throw new Error(`Campo requerido '${field}' no encontrado en configuración ${year}`);
        }
    }
    
    // Verificar año coincide
    if (config.year !== year) {
        throw new Error(`Año en configuración (${config.year}) no coincide con año solicitado (${year})`);
    }
    
    // Verificar UVT es número válido
    if (!config.uvt || config.uvt <= 0) {
        throw new Error(`Valor UVT inválido: ${config.uvt}`);
    }
    
    // Verificar estructura IVA
    if (!config.vat.rates || typeof config.vat.rates !== 'object') {
        throw new Error('Estructura de tarifas IVA inválida');
    }
    
    // Verificar estructura ICA
    if (!config.ica || typeof config.ica !== 'object') {
        throw new Error('Estructura de tarifas ICA inválida');
    }
}

/**
 * Obtiene tarifa IVA por tipo
 * @param {number} year - Año 
 * @param {string} rateType - Tipo de tarifa ('19', '5', '0')
 * @returns {number} Tarifa IVA decimal
 */
function getVATRate(year, rateType = '19') {
    const config = loadTaxConfig(year);
    const rate = config.vat.rates[rateType];
    
    if (!rate) {
        throw new Error(`Tarifa IVA '${rateType}' no encontrada para año ${year}`);
    }
    
    return rate.rate;
}

/**
 * Obtiene tarifa ICA por ciudad y actividad
 * @param {number} year - Año
 * @param {string} city - Ciudad ('Bogota', 'Medellin', etc.)
 * @param {string} activity - Actividad ('CONSTRUCCION', 'SOLDADURA')
 * @returns {Object} Información completa de ICA
 */
function getICARate(year, city, activity = 'CONSTRUCCION') {
    const config = loadTaxConfig(year);
    
    if (!config.ica[city]) {
        throw new Error(`Ciudad '${city}' no encontrada en configuración ICA ${year}`);
    }
    
    if (!config.ica[city][activity]) {
        throw new Error(`Actividad '${activity}' no encontrada para ciudad '${city}' en año ${year}`);
    }
    
    return config.ica[city][activity];
}

/**
 * Calcula retención en la fuente para servicios
 * @param {number} year - Año
 * @param {number} amount - Monto base
 * @param {string} serviceType - Tipo de servicio ('general', 'construction', 'professional')
 * @returns {Object} Cálculo de retención
 */
function calculateWithholdingTax(year, amount, serviceType = 'general') {
    const config = loadTaxConfig(year);
    
    if (!config.withholding_tax.services[serviceType]) {
        throw new Error(`Tipo de servicio '${serviceType}' no encontrado para retención ${year}`);
    }
    
    const serviceConfig = config.withholding_tax.services[serviceType];
    const minAmountUVT = serviceConfig.min_amount_uvt || 0;
    const minAmount = minAmountUVT * config.uvt;
    
    // Verificar si aplica retención
    if (amount < minAmount) {
        return {
            applies: false,
            amount: 0,
            rate: serviceConfig.rate,
            minAmount,
            reason: `Monto ${amount} menor al mínimo ${minAmount} (${minAmountUVT} UVT)`
        };
    }
    
    const withholdingAmount = amount * serviceConfig.rate;
    
    return {
        applies: true,
        amount: Math.round(withholdingAmount),
        rate: serviceConfig.rate,
        baseAmount: amount,
        description: serviceConfig.description
    };
}

/**
 * Obtiene valor UVT para un año específico
 * @param {number} year - Año
 * @returns {number} Valor UVT
 */
function getUVTValue(year) {
    const config = loadTaxConfig(year);
    return config.uvt;
}

/**
 * Lista años disponibles en configuración
 * @returns {number[]} Array de años disponibles
 */
function getAvailableYears() {
    try {
        const configDir = path.join(__dirname, '..', 'config', 'tax');
        const files = fs.readdirSync(configDir);
        
        return files
            .filter(file => file.endsWith('.json'))
            .map(file => parseInt(file.replace('.json', '')))
            .filter(year => !isNaN(year))
            .sort();
            
    } catch (error) {
        console.error('Error listando años disponibles:', error);
        return [];
    }
}

/**
 * Limpia cache de configuraciones (útil para testing)
 */
function clearTaxConfigCache() {
    taxConfigCache.clear();
    console.log('📤 Cache de configuraciones tributarias limpiado');
}

/**
 * Recarga configuración específica (útil para updates en runtime)
 * @param {number} year - Año a recargar
 */
function reloadTaxConfig(year) {
    taxConfigCache.delete(year);
    return loadTaxConfig(year);
}

module.exports = {
    loadTaxConfig,
    getVATRate,
    getICARate,
    calculateWithholdingTax,
    getUVTValue,
    getAvailableYears,
    clearTaxConfigCache,
    reloadTaxConfig
};