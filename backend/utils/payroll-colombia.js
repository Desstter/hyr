// =====================================================
// UTILIDADES NÓMINA COLOMBIANA 2024
// HYR CONSTRUCTORA & SOLDADURA
// =====================================================

// Configuración legal Colombia 2024 (hardcodeada)
const COLOMBIA_PAYROLL_2024 = {
    // Salarios base
    salarioMinimo: 1300000,           // $1.300.000 COP
    auxilioTransporte: 162000,        // $162.000 COP (obligatorio < 2 SMMLV)
    
    // Deducciones empleado
    deducciones: {
        salud: 0.04,                  // 4% EPS
        pension: 0.04,                // 4% Pensión obligatoria
        solidaridad: 0.01,            // 1% (salarios > 4 SMMLV)
        retencionFuente: 0.0          // Según tabla UVT 2024
    },
    
    // Aportes patronales (empleador)
    aportes: {
        salud: 0.085,                 // 8.5% EPS
        pension: 0.12,                // 12% Pensión
        arl: 0.06960,                 // 6.96% Clase V (construcción/soldadura) 
        cesantias: 0.0833,            // 8.33% Cesantías
        prima: 0.0833,                // 8.33% Prima de servicios
        vacaciones: 0.0417,           // 4.17% Vacaciones
        interesesCesantias: 0.01      // 1% Intereses sobre cesantías
    },
    
    // Parafiscales
    parafiscales: {
        sena: 0.02,                   // 2% SENA
        icbf: 0.03,                   // 3% ICBF
        cajas: 0.04                   // 4% Cajas de Compensación
    },
    
    // Clasificación riesgo ARL por industria
    riesgosARL: {
        I: 0.00348,      // Actividades administrativas
        II: 0.00435,     // Comerciales
        III: 0.00783,    // Industriales
        IV: 0.01740,     // Construcción liviana
        V: 0.06960       // Construcción pesada/soldadura (default HYR)
    }
};

/**
 * Calcula la nómina completa de un empleado según legislación colombiana 2024
 * NUEVA LÓGICA: Prestaciones sobre salary_base, pago real sobre daily_rate
 * @param {Object} empleado - Datos del empleado (con salary_base y daily_rate)
 * @param {Object} horasTrabajadas - Horas trabajadas en el período
 * @returns {Object} Cálculos completos de nómina
 */
function calcularNominaCompleta(empleado, horasTrabajadas = {}) {
    // NUEVA LÓGICA: Separar salary_base (prestaciones) vs daily_rate (pago real)
    const salarioBasePrestaciones = empleado.salary_base || empleado.monthly_salary || (empleado.hourly_rate * 192);
    const precioDeposito = empleado.daily_rate || (salarioBasePrestaciones / 24);

    const horasRegulares = Math.min(horasTrabajadas.regular_hours || 0, 192);
    const horasExtra = horasTrabajadas.overtime_hours || 0;
    const horasNocturnas = horasTrabajadas.night_hours || 0; // NUEVO: Horas nocturnas
    const horasLegalesDiarias = 7.3; // Configuración desde settings

    // PAGO REAL: Basado en daily_rate y horas trabajadas
    const pagoPorHora = precioDeposito / horasLegalesDiarias;
    const salarioRegular = pagoPorHora * horasRegulares;
    const salarioExtra = pagoPorHora * horasExtra * 1.25; // 25% recargo horas extra
    const salarioNocturno = pagoPorHora * horasNocturnas * 0.35; // 35% recargo nocturno
    const salarioTotal = salarioRegular + salarioExtra + salarioNocturno;
    
    // Auxilio de transporte basado en salary_base (no en pago real)
    const auxilioTransporte = salarioBasePrestaciones <= (2 * COLOMBIA_PAYROLL_2024.salarioMinimo)
        ? COLOMBIA_PAYROLL_2024.auxilioTransporte : 0;

    // DEDUCCIONES EMPLEADO: Sobre salario REAL pagado (salarioTotal)
    const deducciones = {
        salud: salarioTotal * COLOMBIA_PAYROLL_2024.deducciones.salud,
        pension: salarioTotal * COLOMBIA_PAYROLL_2024.deducciones.pension,
        solidaridad: salarioBasePrestaciones > (4 * COLOMBIA_PAYROLL_2024.salarioMinimo)
            ? salarioTotal * COLOMBIA_PAYROLL_2024.deducciones.solidaridad : 0,
        retencionFuente: calcularRetencionFuente(salarioTotal)
    };

    // Obtener riesgo ARL del empleado (default V para construcción/soldadura)
    const riesgoARL = empleado.arl_risk_class || 'V';
    const tarifaARL = COLOMBIA_PAYROLL_2024.riesgosARL[riesgoARL] || COLOMBIA_PAYROLL_2024.riesgosARL.V;

    // APORTES PATRONALES: Sobre salary_base para cumplir obligaciones legales
    const aportes = {
        salud: salarioBasePrestaciones * COLOMBIA_PAYROLL_2024.aportes.salud,
        pension: salarioBasePrestaciones * COLOMBIA_PAYROLL_2024.aportes.pension,
        arl: salarioBasePrestaciones * tarifaARL,
        cesantias: salarioBasePrestaciones * COLOMBIA_PAYROLL_2024.aportes.cesantias,
        interesesCesantias: salarioBasePrestaciones * COLOMBIA_PAYROLL_2024.aportes.interesesCesantias,
        prima: salarioBasePrestaciones * COLOMBIA_PAYROLL_2024.aportes.prima,
        vacaciones: salarioBasePrestaciones * COLOMBIA_PAYROLL_2024.aportes.vacaciones
    };

    // PARAFISCALES: Sobre salary_base (solo si nómina > 10 SMMLV total empresa)
    const parafiscales = {
        sena: salarioBasePrestaciones * COLOMBIA_PAYROLL_2024.parafiscales.sena,
        icbf: salarioBasePrestaciones * COLOMBIA_PAYROLL_2024.parafiscales.icbf,
        cajas: salarioBasePrestaciones * COLOMBIA_PAYROLL_2024.parafiscales.cajas
    };
    
    // Totales
    const totalDeducciones = Object.values(deducciones).reduce((a, b) => a + b, 0);
    const totalAportes = Object.values(aportes).reduce((a, b) => a + b, 0);
    const totalParafiscales = Object.values(parafiscales).reduce((a, b) => a + b, 0);
    
    return {
        // NUEVA LÓGICA: Datos separados
        salarioBasePrestaciones,  // Para prestaciones y PILA
        precioDeposito,           // Para pago real
        pagoPorHora,              // Precio real por hora

        // Datos de pago
        salarioRegular,
        salarioExtra,
        salarioNocturno,          // NUEVO: Pago adicional nocturno
        salarioTotal,             // Pago REAL al empleado (incluye nocturno)
        auxilioTransporte,
        horasRegulares,
        horasExtra,
        horasNocturnas,           // NUEVO: Horas nocturnas trabajadas

        // Deducciones (sobre pago real)
        deducciones,
        totalDeducciones,

        // Aportes patronales (sobre salary_base)
        aportes,
        totalAportes,

        // Parafiscales (sobre salary_base)
        parafiscales,
        totalParafiscales,

        // Neto a pagar empleado (pago real menos deducciones)
        netoAPagar: salarioTotal + auxilioTransporte - totalDeducciones,

        // Costo total para el empleador (pago real + prestaciones sobre salary_base)
        costoTotalEmpleador: salarioTotal + auxilioTransporte + totalAportes + totalParafiscales,

        // Indicadores actualizados
        factorPrestacional: (totalAportes + totalParafiscales) / salarioBasePrestaciones,
        costoHoraReal: (salarioTotal + auxilioTransporte + totalAportes + totalParafiscales) / (horasRegulares + horasExtra + horasNocturnas || 1),

        // Información legal
        riesgoARL,
        tarifaARL,
        cumpleAuxilioTransporte: salarioBasePrestaciones <= (2 * COLOMBIA_PAYROLL_2024.salarioMinimo),
        aplicaSolidaridad: salarioBasePrestaciones > (4 * COLOMBIA_PAYROLL_2024.salarioMinimo),

        // NUEVA INFO: Comparación salary_base vs pago real
        diferenciaBaseVsReal: salarioBasePrestaciones - salarioTotal,
        porcentajePagoVsBase: (salarioTotal / salarioBasePrestaciones) * 100,

        // NUEVA INFO: Información turno nocturno
        porcentajeNocturno: horasNocturnas > 0 ? (horasNocturnas / (horasRegulares + horasExtra + horasNocturnas)) * 100 : 0,
        recargoNocturnoPorcentaje: 35 // Configurable desde settings
    };
}

/**
 * Calcula retención en la fuente según tabla UVT 2024
 * Implementación simplificada - en producción usar tabla completa
 */
function calcularRetencionFuente(salarioMensual) {
    const uvt2024 = 47065; // Valor UVT 2024
    const salarioUVT = salarioMensual / uvt2024;
    
    // Tabla simplificada retención fuente empleados 2024
    if (salarioUVT <= 95) return 0;  // Exento
    if (salarioUVT <= 150) return (salarioUVT - 95) * uvt2024 * 0.19;
    if (salarioUVT <= 360) return ((salarioUVT - 150) * uvt2024 * 0.28) + (55 * uvt2024 * 0.19);
    
    // Para salarios más altos, aplicar tabla completa
    return salarioMensual * 0.10; // Aproximado para altos ingresos
}

/**
 * Genera resumen ejecutivo de nómina para múltiples empleados
 */
function generarResumenNomina(empleados, periodo) {
    const resumen = {
        periodo,
        totalEmpleados: empleados.length,
        totales: {
            salarios: 0,
            auxilios: 0,
            deducciones: 0,
            aportes: 0,
            parafiscales: 0,
            netoAPagar: 0,
            costoTotal: 0
        },
        porDepartamento: {},
        alertas: []
    };
    
    empleados.forEach(empleado => {
        const calculo = calcularNominaCompleta(empleado, empleado.horas || {});
        
        // Acumular totales
        resumen.totales.salarios += calculo.salarioTotal;
        resumen.totales.auxilios += calculo.auxilioTransporte;
        resumen.totales.deducciones += calculo.totalDeducciones;
        resumen.totales.aportes += calculo.totalAportes;
        resumen.totales.parafiscales += calculo.totalParafiscales;
        resumen.totales.netoAPagar += calculo.netoAPagar;
        resumen.totales.costoTotal += calculo.costoTotalEmpleador;
        
        // Agrupar por departamento
        const dept = empleado.department || 'Sin departamento';
        if (!resumen.porDepartamento[dept]) {
            resumen.porDepartamento[dept] = {
                empleados: 0,
                costoTotal: 0,
                promedioSalario: 0
            };
        }
        resumen.porDepartamento[dept].empleados++;
        resumen.porDepartamento[dept].costoTotal += calculo.costoTotalEmpleador;
        
        // Generar alertas
        if (calculo.salarioBase < COLOMBIA_PAYROLL_2024.salarioMinimo) {
            resumen.alertas.push(`${empleado.name}: Salario menor al mínimo legal`);
        }
        if (calculo.factorPrestacional > 0.60) {
            resumen.alertas.push(`${empleado.name}: Factor prestacional alto (${(calculo.factorPrestacional * 100).toFixed(1)}%)`);
        }
    });
    
    // Calcular promedios por departamento
    Object.keys(resumen.porDepartamento).forEach(dept => {
        resumen.porDepartamento[dept].promedioSalario = 
            resumen.porDepartamento[dept].costoTotal / resumen.porDepartamento[dept].empleados;
    });
    
    return resumen;
}

/**
 * Valida que los cálculos cumplan con la legislación colombiana
 */
function validarCalculosLegales(calculo) {
    const errores = [];
    
    if (calculo.deducciones.salud < calculo.salarioTotal * 0.04) {
        errores.push('Deducción de salud menor al 4% obligatorio');
    }
    
    if (calculo.deducciones.pension < calculo.salarioTotal * 0.04) {
        errores.push('Deducción de pensión menor al 4% obligatorio');
    }
    
    if (calculo.aportes.salud < calculo.salarioTotal * 0.085) {
        errores.push('Aporte salud empleador menor al 8.5% obligatorio');
    }
    
    if (calculo.aportes.pension < calculo.salarioTotal * 0.12) {
        errores.push('Aporte pensión empleador menor al 12% obligatorio');
    }
    
    if (calculo.salarioBase < COLOMBIA_PAYROLL_2024.salarioMinimo) {
        errores.push('Salario base menor al mínimo legal 2024');
    }
    
    return {
        esValido: errores.length === 0,
        errores
    };
}

module.exports = {
    COLOMBIA_PAYROLL_2024,
    calcularNominaCompleta,
    generarResumenNomina,
    validarCalculosLegales,
    calcularRetencionFuente
};