// =====================================================
// GOLDEN-MASTER - CÁLCULO PERSISTIDO DE NÓMINA
// HYR CONSTRUCTORA & SOLDADURA
// =====================================================
// Fija el comportamiento de computePayrollDetail (la función que produce lo que
// se GUARDA en payroll_details vía POST /payroll/periods/:id/process-2025).
// Cualquier cambio en los montos pagados debe romper estos tests a propósito.
// =====================================================

const { computePayrollDetail } = require('../utils/payroll-detail');

// Espejo de annual_payroll_settings (año 2025) normalizado.
const CONFIG_2025 = {
    year: 2025,
    salarioMinimo: 1423500,
    auxilioTransporte: 200000,
    auxilioConectividad: 200000,
    uvt: 47065,
    deducciones: { salud: 0.04, pension: 0.04, solidaridad: 0.01, retencionFuente: 0.0 },
    aportes: {
        salud: 0.085, pension: 0.12,
        arl: { I: 0.00522, II: 0.01044, III: 0.02436, IV: 0.04350, V: 0.06960 },
        cesantias: 0.0833, interesesCesantias: 0.01, prima: 0.0833, vacaciones: 0.0417
    },
    parafiscales: { sena: 0.02, icbf: 0.03, cajas: 0.04 },
    fsp: {
        enabled: true,
        ranges: [
            { min: 4, max: 16, rate: 0.01 },
            { min: 16, max: 17, rate: 0.012 },
            { min: 17, max: 18, rate: 0.014 },
            { min: 18, max: 19, rate: 0.016 },
            { min: 19, max: 20, rate: 0.018 },
            { min: 20, max: Infinity, rate: 0.02 }
        ]
    },
    ley114_1: {
        enabled: true, max_ibc_smmlv: 10, min_employees_pn: 2,
        exemptions: { salud_empleador: true, sena: true, icbf: true, cajas: false }
    },
    recargos: { extraDiurna: 0.25, extraNocturna: 0.75, nocturno: 0.35 },
    topes: { ibc_minimo: 1423500, ibc_maximo: 35587500 }
};

const SMMLV = 1423500;

describe('computePayrollDetail - golden master (ruta persistida)', () => {

    describe('Caso 1: Soldador clase V, 1 SMMLV, jornada completa, Ley 114-1 aplica', () => {
        // daily_rate = SMMLV/30 ≈ 47450; (47450/7.3) = 6500 exacto; 192h => 1.248.000
        const employee = { salary_base: SMMLV, daily_rate: SMMLV / 30, arl_risk_class: 'V' };
        const d = computePayrollDetail(employee, { regularHours: 192, overtimeHours: 0 }, CONFIG_2025);

        test('pago regular y auxilio de transporte', () => {
            expect(d.regularPay).toBeCloseTo(1248000, 2);
            expect(d.overtimePay).toBeCloseTo(0, 2);
            expect(d.transportAllowance).toBe(200000);
            expect(d.totalIncome).toBeCloseTo(1448000, 2);
        });

        test('deducciones empleado (sobre IBC actual)', () => {
            expect(d.healthEmployee).toBeCloseTo(57920, 2);
            expect(d.pensionEmployee).toBeCloseTo(57920, 2);
            expect(d.solidarityContribution).toBe(0); // < 4 SMMLV
            expect(d.fspEmployee).toBe(0);            // IBC < 4 SMMLV
            expect(d.netPay).toBeCloseTo(1332160, 2);
        });

        test('Ley 114-1: exonera salud empleador, SENA e ICBF (no cajas)', () => {
            expect(d.law114Applies).toBe(true);
            expect(d.healthEmployer).toBe(0);
            expect(d.sena).toBe(0);
            expect(d.icbf).toBe(0);
            expect(d.compensationFund).toBeCloseTo(57920, 2); // cajas nunca se exonera
            expect(d.pensionEmployer).toBeCloseTo(173760, 2);
            expect(d.arl).toBeCloseTo(1448000 * 0.0696, 2);
        });
    });

    describe('Caso 2: Alto ingreso (10.53 SMMLV), sin Ley 114-1, con FSP y solidaridad', () => {
        // daily_rate=730000 => /7.3 = 100000/h; 40h => 4.000.000
        const employee = { salary_base: 15000000, daily_rate: 730000, arl_risk_class: 'I' };
        const d = computePayrollDetail(employee, { regularHours: 40, overtimeHours: 0 }, CONFIG_2025);

        test('sin auxilio de transporte (> 2 SMMLV)', () => {
            expect(d.transportAllowance).toBe(0);
            expect(d.totalIncome).toBeCloseTo(4000000, 2);
        });

        test('FSP 1% y solidaridad 1% sobre IBC actual', () => {
            expect(d.solidarityContribution).toBeCloseTo(40000, 2);
            expect(d.fspEmployee).toBeCloseTo(40000, 2);
            expect(d.totalDeductions).toBeCloseTo(400000, 2);
            expect(d.netPay).toBeCloseTo(3600000, 2);
        });

        test('IBC >= 10 SMMLV: NO aplica Ley 114-1, aportes patronales completos', () => {
            expect(d.law114Applies).toBe(false);
            expect(d.healthEmployer).toBeCloseTo(340000, 2);
            expect(d.sena).toBeCloseTo(80000, 2);
            expect(d.icbf).toBeCloseTo(120000, 2);
        });
    });

    describe('Invariantes (cualquier empleado/horas)', () => {
        const cases = [
            { employee: { salary_base: SMMLV, daily_rate: SMMLV / 30, arl_risk_class: 'V' }, hours: { regularHours: 192, overtimeHours: 16 } },
            { employee: { salary_base: 6000000, daily_rate: 200000, arl_risk_class: 'III' }, hours: { regularHours: 160, overtimeHours: 0 } },
            { employee: { salary_base: 15000000, daily_rate: 730000, arl_risk_class: 'I' }, hours: { regularHours: 40, overtimeHours: 8 } }
        ];

        test('netPay = totalIncome - totalDeductions', () => {
            for (const c of cases) {
                const d = computePayrollDetail(c.employee, c.hours, CONFIG_2025);
                expect(d.netPay).toBeCloseTo(d.totalIncome - d.totalDeductions, 4);
            }
        });

        test('totalEmployerCost = ingreso + aportes patronales + prestaciones + parafiscales', () => {
            for (const c of cases) {
                const d = computePayrollDetail(c.employee, c.hours, CONFIG_2025);
                const sum = d.totalIncome + d.healthEmployer + d.pensionEmployer + d.arl +
                    d.severance + d.severanceInterest + d.serviceBonus + d.vacation +
                    d.sena + d.icbf + d.compensationFund;
                expect(d.totalEmployerCost).toBeCloseTo(sum, 4);
            }
        });

        test('todos los componentes monetarios son no negativos', () => {
            for (const c of cases) {
                const d = computePayrollDetail(c.employee, c.hours, CONFIG_2025);
                for (const [k, v] of Object.entries(d)) {
                    if (typeof v === 'number') expect(v).toBeGreaterThanOrEqual(0);
                }
            }
        });

        test('horas extra incrementan el pago (recargo 25%)', () => {
            const base = computePayrollDetail({ salary_base: SMMLV, daily_rate: SMMLV / 30, arl_risk_class: 'V' }, { regularHours: 192, overtimeHours: 0 }, CONFIG_2025);
            const withOt = computePayrollDetail({ salary_base: SMMLV, daily_rate: SMMLV / 30, arl_risk_class: 'V' }, { regularHours: 192, overtimeHours: 10 }, CONFIG_2025);
            expect(withOt.overtimePay).toBeCloseTo((SMMLV / 30 / 7.3) * 10 * 1.25, 2);
            expect(withOt.totalIncome).toBeGreaterThan(base.totalIncome);
        });
    });
});
