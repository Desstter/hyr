// =====================================================
// CARGADOR DE CONFIGURACIÓN DE NÓMINA
// HYR CONSTRUCTORA & SOLDADURA
// =====================================================
// Fuente de verdad ÚNICA de tasas de nómina: tabla annual_payroll_settings.
// Lee de BD (con caché en memoria) y normaliza al shape que consume el motor
// payroll-colombia-2025. Si la BD no responde, cae al archivo de config como
// último recurso (semilla) para no romper el servicio.
// =====================================================

const { db } = require('../database/connection');
const { COLOMBIA_PAYROLL_2025 } = require('../config/payroll-2025');

const cache = new Map();

/**
 * Normaliza una fila de annual_payroll_settings al shape esperado por el motor.
 */
function rowToConfig(row) {
    const c = row.config_json || {};
    const fsp = c.fsp || {};
    const ranges = (fsp.ranges || []).map(r => ({
        min: r.min,
        max: r.max === null || r.max === undefined ? Infinity : r.max,
        rate: r.rate
    }));

    return {
        year: row.year,
        salarioMinimo: Number(row.smmlv),
        auxilioTransporte: Number(row.auxilio_transporte),
        auxilioConectividad: row.auxilio_conectividad != null ? Number(row.auxilio_conectividad) : 0,
        uvt: row.uvt != null ? Number(row.uvt) : 0,
        deducciones: c.deducciones || COLOMBIA_PAYROLL_2025.deducciones,
        aportes: c.aportes || COLOMBIA_PAYROLL_2025.aportes,
        parafiscales: c.parafiscales || COLOMBIA_PAYROLL_2025.parafiscales,
        fsp: { enabled: fsp.enabled !== false, ranges: ranges.length ? ranges : COLOMBIA_PAYROLL_2025.fsp.ranges },
        ley114_1: c.ley114_1 || {},
        recargos: c.recargos || COLOMBIA_PAYROLL_2025.recargos,
        topes: c.topes || COLOMBIA_PAYROLL_2025.topes,
        _source: 'db'
    };
}

/**
 * Carga (async) la configuración de nómina para un año desde la BD.
 * @param {number} year
 * @returns {Promise<Object>} configuración normalizada
 */
async function loadPayrollConfig(year = 2025) {
    if (cache.has(year)) return cache.get(year);

    try {
        const { rows } = await db.query('SELECT * FROM annual_payroll_settings WHERE year = $1', [year]);
        if (rows.length === 0) {
            throw new Error(`No hay configuración de nómina en BD para el año ${year}`);
        }
        const config = rowToConfig(rows[0]);
        validateConfig(config); // red de seguridad contra config_json corrupto
        cache.set(year, config);
        return config;
    } catch (err) {
        // Fallback EXPLÍCITO: no es estado normal. Se loguea como error y se marca
        // el origen ('file') para que las rutas puedan rechazar persistir nómina
        // con tasas que podrían estar desactualizadas respecto a la BD.
        console.error(`❌ payroll-config-loader: NO se pudo cargar config de BD para ${year} (${err.message}). Usando fallback de ARCHIVO (tasas potencialmente desactualizadas).`);
        const fallback = { ...COLOMBIA_PAYROLL_2025, _source: 'file' };
        return fallback;
    }
}

/**
 * Factor prestacional total (aportes patronales + parafiscales) derivado de la
 * config — ÚNICA fuente para el "1.58" que antes estaba hardcodeado.
 * @returns {Promise<number>} factor (ej: 1.58)
 */
async function getBenefitFactor(year = 2025) {
    const config = await loadPayrollConfig(year);
    const a = config.aportes || {};
    const p = config.parafiscales || {};
    // ARL clase V por defecto (construcción/soldadura) para el factor de costeo
    const arl = (a.arl && (a.arl.V ?? a.arl.IV)) || 0;
    const sum = (a.salud || 0) + (a.pension || 0) + arl +
                (a.cesantias || 0) + (a.interesesCesantias || 0) + (a.prima || 0) + (a.vacaciones || 0) +
                (p.sena || 0) + (p.icbf || 0) + (p.cajas || 0);
    return 1 + sum;
}

/**
 * Valida que una configuración de nómina sea plausible antes de usarla para
 * calcular dinero. Lanza si detecta corrupción (tasas fuera de rango, campos
 * faltantes, rangos FSP mal formados). No reemplaza el criterio legal: es una
 * red de seguridad contra config_json corrupto.
 */
function validateConfig(config) {
    const errors = [];
    const inUnitRange = (x) => typeof x === 'number' && x > 0 && x < 1;

    if (!(config.salarioMinimo > 0)) errors.push('salarioMinimo debe ser > 0');
    if (config.auxilioTransporte == null || config.auxilioTransporte < 0) errors.push('auxilioTransporte inválido');

    const d = config.deducciones || {};
    if (!inUnitRange(d.salud)) errors.push(`deducciones.salud fuera de rango (${d.salud})`);
    if (!inUnitRange(d.pension)) errors.push(`deducciones.pension fuera de rango (${d.pension})`);

    const a = config.aportes || {};
    if (!inUnitRange(a.salud)) errors.push(`aportes.salud fuera de rango (${a.salud})`);
    if (!inUnitRange(a.pension)) errors.push(`aportes.pension fuera de rango (${a.pension})`);
    if (!a.arl || !inUnitRange(a.arl.V)) errors.push('aportes.arl.V faltante o fuera de rango');
    if (!inUnitRange(a.cesantias)) errors.push(`aportes.cesantias fuera de rango (${a.cesantias})`);

    const p = config.parafiscales || {};
    if (!inUnitRange(p.sena)) errors.push(`parafiscales.sena fuera de rango (${p.sena})`);
    if (!inUnitRange(p.cajas)) errors.push(`parafiscales.cajas fuera de rango (${p.cajas})`);

    // FSP: rangos ascendentes y contiguos
    if (config.fsp && config.fsp.enabled !== false) {
        const ranges = config.fsp.ranges || [];
        if (ranges.length === 0) {
            errors.push('fsp habilitado pero sin rangos');
        } else {
            for (let i = 0; i < ranges.length; i++) {
                const r = ranges[i];
                if (!(r.max > r.min)) errors.push(`fsp.ranges[${i}] max debe ser > min`);
                if (!inUnitRange(r.rate)) errors.push(`fsp.ranges[${i}].rate fuera de rango`);
                if (i > 0 && ranges[i].min !== ranges[i - 1].max) {
                    errors.push(`fsp.ranges no contiguos entre [${i - 1}] y [${i}]`);
                }
            }
        }
    }

    if (errors.length) {
        throw new Error(`Configuración de nómina inválida: ${errors.join('; ')}`);
    }
    return true;
}

function clearCache() {
    cache.clear();
}

module.exports = { loadPayrollConfig, getBenefitFactor, clearCache, rowToConfig, validateConfig };
