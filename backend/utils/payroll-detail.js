// =====================================================
// CÁLCULO CANÓNICO DE DETALLE DE NÓMINA (PERSISTIDO)
// HYR CONSTRUCTORA & SOLDADURA
// =====================================================
// Función pura y ÚNICA fuente del cálculo que se PERSISTE en payroll_details
// (ruta POST /payroll/periods/:id/process-2025).
//
// Modelo de pago real de HYR: por jornal (daily_rate) proporcional a las horas
// trabajadas, con prestaciones/aportes sobre el salario base (salary_base).
//
// Las TASAS provienen siempre de `config` (annual_payroll_settings vía
// payroll-config-loader). No hay tasas hardcodeadas aquí.
//
// IMPORTANTE: esta función reproduce el comportamiento que ya estaba inline en
// la ruta. Cualquier cambio de semántica legal (p.ej. excluir el auxilio de
// transporte del IBC, o aplicar recargo nocturno) debe hacerse aquí, de forma
// explícita y con tests, para que la ruta y los tests nunca diverjan.
// =====================================================

// Jornada legal diaria 2025 (Ley 2101/2021: 46 h/semana ≈ 7.66 h/día; HYR usa
// la base histórica de 7.3 para el valor hora). Constante de negocio, no tasa.
const DAILY_LEGAL_HOURS = 7.3;

// Intereses sobre cesantías = 12% de las cesantías causadas (Art. 99 Ley 50/1990).
const SEVERANCE_INTEREST_FACTOR = 0.12;

/**
 * Calcula el detalle de nómina de un empleado para un período.
 *
 * @param {Object} employee - { salary_base, daily_rate, arl_risk_class, law_114_1_eligible }
 * @param {Object} hours    - { regularHours, overtimeHours }
 * @param {Object} config   - configuración normalizada (payroll-config-loader)
 * @returns {Object} campos listos para payroll_details + totales derivados
 */
function computePayrollDetail(employee, hours, config) {
    const smmlv = config.salarioMinimo;
    const ded = config.deducciones;
    const ap = config.aportes;
    const para = config.parafiscales;
    const arlRates = ap.arl;

    const regularHours = Number(hours.regularHours) || 0;
    const overtimeHours = Number(hours.overtimeHours) || 0;

    // Salario base (prestaciones) y precio diario (pago real). Fallback: SMMLV.
    const dailyRate = parseFloat(employee.daily_rate) || (smmlv / 30);
    const salaryBase = parseFloat(employee.salary_base) || smmlv;

    // Pagos reales según daily_rate y horas
    const regularPay = (dailyRate / DAILY_LEGAL_HOURS) * regularHours;
    const overtimePay = (dailyRate / DAILY_LEGAL_HOURS) * overtimeHours * (1 + config.recargos.extraDiurna);

    // Auxilio de transporte (≤ 2 SMMLV)
    const transportAllowance = salaryBase <= (smmlv * 2) ? config.auxilioTransporte : 0;

    const totalIncome = regularPay + overtimePay + transportAllowance;

    // Deducciones empleado
    const healthEmployee = totalIncome * ded.salud;
    const pensionEmployee = totalIncome * ded.pension;
    const solidarityContribution = salaryBase > (smmlv * 4) ? totalIncome * ded.solidaridad : 0;

    // FSP según rangos IBC en SMMLV
    const ibcSmmlv = salaryBase / smmlv;
    const fspRange = (config.fsp && config.fsp.enabled !== false)
        ? (config.fsp.ranges || []).find(r => ibcSmmlv >= r.min && ibcSmmlv < r.max)
        : null;
    const fspEmployee = fspRange ? totalIncome * fspRange.rate : 0;

    const totalDeductions = healthEmployee + pensionEmployee + solidarityContribution + fspEmployee;
    const netPay = totalIncome - totalDeductions;

    // Ley 114-1: exoneración salud empleador + SENA + ICBF si el empleado califica
    const ley = config.ley114_1 || {};
    const law114Applies = Boolean(
        ley.enabled &&
        employee.law_114_1_eligible !== false &&
        ibcSmmlv < (ley.max_ibc_smmlv != null ? ley.max_ibc_smmlv : 10)
    );
    const ex = ley.exemptions || {};

    // Aportes patronales
    const healthEmployer = (law114Applies && ex.salud_empleador) ? 0 : totalIncome * ap.salud;
    const pensionEmployer = totalIncome * ap.pension;
    const arl = totalIncome * (arlRates[employee.arl_risk_class] || arlRates.V);

    // Prestaciones sociales
    const severance = totalIncome * ap.cesantias;
    const severanceInterest = severance * SEVERANCE_INTEREST_FACTOR;
    const serviceBonus = totalIncome * ap.prima;
    const vacation = totalIncome * ap.vacaciones;

    // Parafiscales
    const sena = (law114Applies && ex.sena) ? 0 : totalIncome * para.sena;
    const icbf = (law114Applies && ex.icbf) ? 0 : totalIncome * para.icbf;
    const compensationFund = totalIncome * para.cajas;

    const totalEmployerCost = totalIncome + healthEmployer + pensionEmployer +
        arl + severance + severanceInterest + serviceBonus +
        vacation + sena + icbf + compensationFund;

    return {
        regularHours,
        overtimeHours,
        salaryBase,
        regularPay,
        overtimePay,
        transportAllowance,
        totalIncome,
        healthEmployee,
        pensionEmployee,
        solidarityContribution,
        fspEmployee,
        totalDeductions,
        netPay,
        healthEmployer,
        pensionEmployer,
        arl,
        severance,
        severanceInterest,
        serviceBonus,
        vacation,
        sena,
        icbf,
        compensationFund,
        law114Applies,
        totalEmployerCost
    };
}

module.exports = { computePayrollDetail, DAILY_LEGAL_HOURS, SEVERANCE_INTEREST_FACTOR };
