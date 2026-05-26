// =====================================================
// TESTS - VALIDACIÓN DE CONFIGURACIÓN DE NÓMINA
// HYR CONSTRUCTORA & SOLDADURA
// =====================================================

const { validateConfig } = require('../utils/payroll-config-loader');

const validConfig = {
    salarioMinimo: 1423500,
    auxilioTransporte: 200000,
    deducciones: { salud: 0.04, pension: 0.04, solidaridad: 0.01 },
    aportes: {
        salud: 0.085, pension: 0.12,
        arl: { I: 0.00522, V: 0.06960 },
        cesantias: 0.0833, prima: 0.0833, vacaciones: 0.0417
    },
    parafiscales: { sena: 0.02, icbf: 0.03, cajas: 0.04 },
    fsp: {
        enabled: true,
        ranges: [
            { min: 4, max: 16, rate: 0.01 },
            { min: 16, max: 17, rate: 0.012 },
            { min: 17, max: Infinity, rate: 0.02 }
        ]
    }
};

describe('validateConfig', () => {
    test('acepta una configuración válida', () => {
        expect(() => validateConfig(validConfig)).not.toThrow();
    });

    test('rechaza tasa de salud corrupta (4 en vez de 0.04)', () => {
        const bad = { ...validConfig, aportes: { ...validConfig.aportes, salud: 4 } };
        expect(() => validateConfig(bad)).toThrow(/aportes.salud/);
    });

    test('rechaza SMMLV no positivo', () => {
        expect(() => validateConfig({ ...validConfig, salarioMinimo: 0 })).toThrow(/salarioMinimo/);
    });

    test('rechaza ARL clase V faltante', () => {
        const bad = { ...validConfig, aportes: { ...validConfig.aportes, arl: { I: 0.00522 } } };
        expect(() => validateConfig(bad)).toThrow(/arl/);
    });

    test('rechaza rangos FSP no contiguos', () => {
        const bad = {
            ...validConfig,
            fsp: { enabled: true, ranges: [{ min: 4, max: 16, rate: 0.01 }, { min: 17, max: 20, rate: 0.02 }] }
        };
        expect(() => validateConfig(bad)).toThrow(/contiguos/);
    });

    test('ignora rangos FSP si está deshabilitado', () => {
        const ok = { ...validConfig, fsp: { enabled: false, ranges: [] } };
        expect(() => validateConfig(ok)).not.toThrow();
    });
});
