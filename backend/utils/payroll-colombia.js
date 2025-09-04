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
 * @param {Object} empleado - Datos del empleado
 * @param {Object} horasTrabajadas - Horas trabajadas en el período
 * @returns {Object} Cálculos completos de nómina
 */
function calcularNominaCompleta(empleado, horasTrabajadas = {}) {
    const salarioBase = empleado.monthly_salary || (empleado.hourly_rate * 192);
    const horasRegulares = Math.min(horasTrabajadas.regular_hours || 0, 192);
    const horasExtra = horasTrabajadas.overtime_hours || 0;
    
    // Cálculo salarios
    const salarioRegular = empleado.salary_type === 'monthly' 
        ? salarioBase 
        : (salarioBase / 192) * horasRegulares;
    
    const salarioExtra = (salarioBase / 192) * horasExtra * 1.25; // 25% recargo nocturno/festivo
    const salarioTotal = salarioRegular + salarioExtra;
    
    // Auxilio de transporte (obligatorio para salarios <= 2 SMMLV)
    const auxilioTransporte = salarioBase <= (2 * COLOMBIA_PAYROLL_2024.salarioMinimo) 
        ? COLOMBIA_PAYROLL_2024.auxilioTransporte : 0;
    
    // Deducciones empleado
    const deducciones = {
        salud: salarioTotal * COLOMBIA_PAYROLL_2024.deducciones.salud,
        pension: salarioTotal * COLOMBIA_PAYROLL_2024.deducciones.pension,
        solidaridad: salarioBase > (4 * COLOMBIA_PAYROLL_2024.salarioMinimo) 
            ? salarioTotal * COLOMBIA_PAYROLL_2024.deducciones.solidaridad : 0,
        retencionFuente: calcularRetencionFuente(salarioTotal)
    };
    
    // Obtener riesgo ARL del empleado (default V para construcción/soldadura)
    const riesgoARL = empleado.arl_risk_class || 'V';
    const tarifaARL = COLOMBIA_PAYROLL_2024.riesgosARL[riesgoARL] || COLOMBIA_PAYROLL_2024.riesgosARL.V;
    
    // Aportes patronales
    const aportes = {
        salud: salarioTotal * COLOMBIA_PAYROLL_2024.aportes.salud,
        pension: salarioTotal * COLOMBIA_PAYROLL_2024.aportes.pension,
        arl: salarioTotal * tarifaARL,
        cesantias: salarioTotal * COLOMBIA_PAYROLL_2024.aportes.cesantias,
        interesesCesantias: salarioTotal * COLOMBIA_PAYROLL_2024.aportes.interesesCesantias,
        prima: salarioTotal * COLOMBIA_PAYROLL_2024.aportes.prima,
        vacaciones: salarioTotal * COLOMBIA_PAYROLL_2024.aportes.vacaciones
    };
    
    // Parafiscales (solo si nómina > 10 SMMLV total empresa)
    const parafiscales = {
        sena: salarioTotal * COLOMBIA_PAYROLL_2024.parafiscales.sena,
        icbf: salarioTotal * COLOMBIA_PAYROLL_2024.parafiscales.icbf,
        cajas: salarioTotal * COLOMBIA_PAYROLL_2024.parafiscales.cajas
    };
    
    // Totales
    const totalDeducciones = Object.values(deducciones).reduce((a, b) => a + b, 0);
    const totalAportes = Object.values(aportes).reduce((a, b) => a + b, 0);
    const totalParafiscales = Object.values(parafiscales).reduce((a, b) => a + b, 0);
    
    return {
        // Datos base
        salarioBase,
        salarioRegular,
        salarioExtra,
        salarioTotal,
        auxilioTransporte,
        horasRegulares,
        horasExtra,
        
        // Deducciones
        deducciones,
        totalDeducciones,
        
        // Aportes patronales
        aportes,
        totalAportes,
        
        // Parafiscales
        parafiscales,
        totalParafiscales,
        
        // Neto a pagar empleado
        netoAPagar: salarioTotal + auxilioTransporte - totalDeducciones,
        
        // Costo total para el empleador
        costoTotalEmpleador: salarioTotal + auxilioTransporte + totalAportes + totalParafiscales,
        
        // Indicadores útiles
        factorPrestacional: (totalAportes + totalParafiscales) / salarioTotal,
        costoHoraReal: (salarioTotal + auxilioTransporte + totalAportes + totalParafiscales) / (horasRegulares + horasExtra || 1),
        
        // Información legal
        riesgoARL,
        tarifaARL,
        cumpleAuxilioTransporte: salarioBase <= (2 * COLOMBIA_PAYROLL_2024.salarioMinimo),
        aplicaSolidaridad: salarioBase > (4 * COLOMBIA_PAYROLL_2024.salarioMinimo)
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
    let resumen = {
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