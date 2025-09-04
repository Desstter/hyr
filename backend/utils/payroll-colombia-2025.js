// =====================================================
// UTILIDADES NÓMINA COLOMBIANA 2025 - ACTUALIZADA
// HYR CONSTRUCTORA & SOLDADURA  
// Cumplimiento Legal Completo con FSP y Ley 114-1
// =====================================================

const { COLOMBIA_PAYROLL_2025, calculateFSP, qualifiesForLaw114_1, calculateOvertimeRate } = require('../config/payroll-2025');

/**
 * Calcula la nómina completa de un empleado según legislación colombiana 2025
 * Incluye: FSP, Ley 114-1, ARL diferenciado, recargos complejos
 * 
 * @param {Object} empleado - Datos del empleado
 * @param {Object} horasTrabajadas - Horas trabajadas en el período  
 * @param {Object} empresa - Datos de la empresa (para Ley 114-1)
 * @param {Object} centroTrabajo - Información del centro de trabajo
 * @param {Object} opciones - Opciones adicionales de cálculo
 * @returns {Object} Cálculos completos de nómina 2025
 */
function calcularNominaCompleta2025(empleado, horasTrabajadas = {}, empresa = {}, centroTrabajo = {}, opciones = {}) {
    // Configuración año (default 2025)
    const config = opciones.year ? 
        require('../config/payroll-2025').getPayrollConfig(opciones.year) : 
        COLOMBIA_PAYROLL_2025;
    
    // =====================================================
    // 1. CÁLCULOS SALARIO BASE
    // =====================================================
    
    const salarioBase = empleado.monthly_salary || (empleado.hourly_rate * 192);
    const horasRegulares = Math.min(horasTrabajadas.regular_hours || 0, 192);
    const horasExtra = horasTrabajadas.overtime_hours || 0;
    
    // Salario regular (proporción horas trabajadas)
    const salarioRegular = empleado.salary_type === 'monthly' 
        ? salarioBase 
        : (salarioBase / 192) * horasRegulares;
    
    // =====================================================
    // 2. CÁLCULO HORAS EXTRAS COMPLEJAS (2025)
    // =====================================================
    
    let salarioExtra = 0;
    if (horasExtra > 0) {
        // Usar información detallada de horas si está disponible
        const tipoHoras = horasTrabajadas.overtime_type || 'diurna';
        const esFestivo = horasTrabajadas.is_holiday || false;
        const esDominical = horasTrabajadas.is_sunday || false;
        
        let recargoMultiplier;
        
        switch (tipoHoras) {
            case 'nocturna':
                recargoMultiplier = esFestivo || esDominical ? 1.50 : 0.75; // 150% o 75%
                break;
            case 'festiva':
                recargoMultiplier = 1.00; // 100%
                break;
            default: // diurna
                recargoMultiplier = esFestivo || esDominical ? 1.00 : 0.25; // 100% o 25%
        }
        
        salarioExtra = (salarioBase / 192) * horasExtra * (1 + recargoMultiplier);
    }
    
    const salarioTotal = salarioRegular + salarioExtra;
    
    // =====================================================
    // 3. AUXILIO DE TRANSPORTE Y CONECTIVIDAD
    // =====================================================
    
    // Auxilio de transporte (≤ 2 SMMLV)
    const auxilioTransporte = (salarioBase <= (2 * config.salarioMinimo) && 
                              empleado.transport_allowance_eligible !== false) 
        ? config.auxilioTransporte : 0;
    
    // Auxilio de conectividad (teletrabajo)
    const auxilioConectividad = (empleado.teleworking && 
                                salarioBase <= (2 * config.salarioMinimo))
        ? config.auxilioConectividad : 0;
    
    // =====================================================
    // 4. DEDUCCIONES EMPLEADO
    // =====================================================
    
    // Salud empleado (SIEMPRE se descuenta 4%)
    const saludEmpleado = salarioTotal * config.deducciones.salud;
    
    // Pensión empleado (SIEMPRE se descuenta 4%) 
    const pensionEmpleado = salarioTotal * config.deducciones.pension;
    
    // FSP - Fondo Solidaridad Pensional (NUEVO 2025)
    const fspEmpleado = empleado.fsp_exempt ? 0 : calculateFSP(salarioBase, config.salarioMinimo);
    
    // Solidaridad (solo salarios > 4 SMMLV) - ESTE ES DIFERENTE AL FSP
    const solidaridadEmpleado = salarioBase > (4 * config.salarioMinimo) 
        ? salarioTotal * config.deducciones.solidaridad : 0;
    
    // Retención en la fuente (simplificada)
    const retencionFuente = calcularRetencionFuente2025(salarioTotal, config);
    
    const deducciones = {
        salud: saludEmpleado,
        pension: pensionEmpleado,
        fsp: fspEmpleado,                    // NUEVO 2025
        solidaridad: solidaridadEmpleado,
        retencionFuente: retencionFuente
    };
    
    // =====================================================
    // 5. VERIFICAR LEY 114-1 EXONERACIONES
    // =====================================================
    
    const aplicaLey114_1 = qualifiesForLaw114_1(empresa, empleado, salarioBase);
    const exoneracion = {
        saludEmpleadorExento: aplicaLey114_1,
        senaExento: aplicaLey114_1,  
        icbfExento: aplicaLey114_1,
        cajasExento: false // Cajas NUNCA se exonera
    };
    
    // =====================================================
    // 6. APORTES PATRONALES
    // =====================================================
    
    // Salud empleador (sujeto a exoneración Ley 114-1)
    const saludEmpleador = exoneracion.saludEmpleadorExento ? 0 : 
        salarioTotal * config.aportes.salud;
    
    // Pensión empleador (SIEMPRE se paga)
    const pensionEmpleador = salarioTotal * config.aportes.pension;
    
    // ARL - usar tarifa específica del centro de trabajo o empleado
    const claseARL = centroTrabajo.arl_risk_class || empleado.arl_risk_class || 'V';
    const tarifaARL = centroTrabajo.arl_rate || config.aportes.arl[claseARL] || config.aportes.arl.V;
    const arlEmpleador = salarioTotal * tarifaARL;
    
    // Prestaciones sociales
    const cesantias = salarioTotal * config.aportes.cesantias;
    const interesesCesantias = salarioTotal * config.aportes.interesesCesantias;
    const prima = salarioTotal * config.aportes.prima;
    const vacaciones = salarioTotal * config.aportes.vacaciones;
    
    const aportes = {
        salud: saludEmpleador,
        pension: pensionEmpleador,
        arl: arlEmpleador,
        cesantias: cesantias,
        interesesCesantias: interesesCesantias,
        prima: prima,
        vacaciones: vacaciones
    };
    
    // =====================================================
    // 7. PARAFISCALES (Sujetos a Ley 114-1)
    // =====================================================
    
    // SENA (2% - exonerado con Ley 114-1)
    const senaEmpleador = exoneracion.senaExento ? 0 : 
        salarioTotal * config.parafiscales.sena;
    
    // ICBF (3% - exonerado con Ley 114-1)  
    const icbfEmpleador = exoneracion.icbfExento ? 0 :
        salarioTotal * config.parafiscales.icbf;
    
    // Cajas de Compensación (4% - NUNCA exonerado)
    const cajasEmpleador = salarioTotal * config.parafiscales.cajas;
    
    const parafiscales = {
        sena: senaEmpleador,
        icbf: icbfEmpleador, 
        cajas: cajasEmpleador
    };
    
    // =====================================================
    // 8. TOTALES Y INDICADORES
    // =====================================================
    
    const totalDeducciones = Object.values(deducciones).reduce((a, b) => a + b, 0);
    const totalAportes = Object.values(aportes).reduce((a, b) => a + b, 0);
    const totalParafiscales = Object.values(parafiscales).reduce((a, b) => a + b, 0);
    const totalAuxilios = auxilioTransporte + auxilioConectividad;
    
    // Neto a pagar al empleado
    const netoAPagar = salarioTotal + totalAuxilios - totalDeducciones;
    
    // Costo total para el empleador
    const costoTotalEmpleador = salarioTotal + totalAuxilios + totalAportes + totalParafiscales;
    
    // =====================================================
    // 9. INDICADORES LEGALES Y FINANCIEROS
    // =====================================================
    
    return {
        // Información base
        salarioBase,
        salarioRegular, 
        salarioExtra,
        salarioTotal,
        horasRegulares,
        horasExtra,
        
        // Auxilios
        auxilioTransporte,
        auxilioConectividad,        // NUEVO 2025
        totalAuxilios,
        
        // Deducciones empleado
        deducciones,
        totalDeducciones,
        
        // Aportes patronales
        aportes,
        totalAportes,
        
        // Parafiscales
        parafiscales,
        totalParafiscales,
        
        // Totales finales
        netoAPagar,
        costoTotalEmpleador,
        
        // Indicadores útiles
        factorPrestacional: (totalAportes + totalParafiscales) / salarioTotal,
        costoHoraReal: costoTotalEmpleador / (horasRegulares + horasExtra || 1),
        ibc: salarioTotal,                          // Ingreso Base de Cotización
        ibcEnSMMLV: salarioTotal / config.salarioMinimo,  // IBC en términos de SMMLV
        
        // Información legal 2025
        aplicaLey114_1,
        exoneracion,
        claseARL,
        tarifaARL,
        fspCalculado: fspEmpleado,                  // NUEVO 2025
        cumpleAuxilioTransporte: salarioBase <= (2 * config.salarioMinimo),
        cumpleAuxilioConectividad: empleado.teleworking,  // NUEVO 2025
        aplicaSolidaridad: salarioBase > (4 * config.salarioMinimo),
        aplicaFSP: salarioBase >= (4 * config.salarioMinimo), // NUEVO 2025
        
        // Metadatos
        configYear: config.year,
        calculatedAt: new Date().toISOString(),
        centroTrabajo: centroTrabajo.name || 'Sede Principal'
    };
}

/**
 * Calcula retención en la fuente según tabla UVT 2025
 * Implementación actualizada con UVT 2025
 */
function calcularRetencionFuente2025(salarioMensual, config) {
    const uvt = config.uvt || 47065; // UVT 2025
    const salarioUVT = salarioMensual / uvt;
    
    // Tabla retención fuente empleados 2025 (simplificada)
    if (salarioUVT <= 95) return 0;  // Exento
    if (salarioUVT <= 150) return (salarioUVT - 95) * uvt * 0.19;
    if (salarioUVT <= 360) return ((salarioUVT - 150) * uvt * 0.28) + (55 * uvt * 0.19);
    
    // Para salarios altos, usar tabla completa
    return salarioMensual * 0.10; // Aproximado para altos ingresos
}

/**
 * Genera resumen ejecutivo de nómina para múltiples empleados - Versión 2025
 * Incluye análisis FSP y Ley 114-1
 */
function generarResumenNomina2025(empleados, periodo, empresa = {}) {
    const config = COLOMBIA_PAYROLL_2025;
    
    let resumen = {
        periodo,
        year: 2025,
        totalEmpleados: empleados.length,
        
        // Totales financieros
        totales: {
            salarios: 0,
            auxilios: 0,
            deducciones: 0,
            aportes: 0,
            parafiscales: 0,
            netoAPagar: 0,
            costoTotal: 0,
            fspTotal: 0,              // NUEVO 2025
            ahorroLey114_1: 0         // NUEVO 2025
        },
        
        // Análisis por departamento
        porDepartamento: {},
        
        // Análisis legal 2025
        analisisLegal: {
            empleadosConFSP: 0,
            empleadosLey114_1: 0,
            montoExoneradoSalud: 0,
            montoExoneradoParafiscales: 0,
            dotacionPendiente: 0
        },
        
        // Alertas y observaciones
        alertas: [],
        recomendaciones: []
    };
    
    empleados.forEach(empleado => {
        const empresa_info = empresa[empleado.client_id] || {};
        const calculo = calcularNominaCompleta2025(empleado, empleado.horas || {}, empresa_info);
        
        // Acumular totales
        resumen.totales.salarios += calculo.salarioTotal;
        resumen.totales.auxilios += calculo.totalAuxilios;
        resumen.totales.deducciones += calculo.totalDeducciones;
        resumen.totales.aportes += calculo.totalAportes;
        resumen.totales.parafiscales += calculo.totalParafiscales;
        resumen.totales.netoAPagar += calculo.netoAPagar;
        resumen.totales.costoTotal += calculo.costoTotalEmpleador;
        resumen.totales.fspTotal += calculo.fspCalculado;
        
        // Calcular ahorro Ley 114-1
        if (calculo.aplicaLey114_1) {
            const ahorroSalud = calculo.salarioTotal * config.aportes.salud;
            const ahorroSena = calculo.salarioTotal * config.parafiscales.sena;
            const ahorroIcbf = calculo.salarioTotal * config.parafiscales.icbf;
            resumen.totales.ahorroLey114_1 += ahorroSalud + ahorroSena + ahorroIcbf;
            
            resumen.analisisLegal.empleadosLey114_1++;
            resumen.analisisLegal.montoExoneradoSalud += ahorroSalud;
            resumen.analisisLegal.montoExoneradoParafiscales += ahorroSena + ahorroIcbf;
        }
        
        // Contar empleados con FSP
        if (calculo.aplicaFSP) {
            resumen.analisisLegal.empleadosConFSP++;
        }
        
        // Agrupar por departamento
        const dept = empleado.department || 'Sin departamento';
        if (!resumen.porDepartamento[dept]) {
            resumen.porDepartamento[dept] = {
                empleados: 0,
                costoTotal: 0,
                promedioSalario: 0,
                empleadosLey114_1: 0,
                empleadosConFSP: 0
            };
        }
        resumen.porDepartamento[dept].empleados++;
        resumen.porDepartamento[dept].costoTotal += calculo.costoTotalEmpleador;
        if (calculo.aplicaLey114_1) resumen.porDepartamento[dept].empleadosLey114_1++;
        if (calculo.aplicaFSP) resumen.porDepartamento[dept].empleadosConFSP++;
        
        // Generar alertas específicas 2025
        if (calculo.salarioBase < config.salarioMinimo) {
            resumen.alertas.push({
                tipo: 'CRITICO',
                empleado: empleado.name,
                mensaje: `Salario menor al SMMLV 2025 ($${config.salarioMinimo.toLocaleString()})`
            });
        }
        
        if (calculo.aplicaFSP && calculo.fspCalculado === 0) {
            resumen.alertas.push({
                tipo: 'WARNING',
                empleado: empleado.name, 
                mensaje: 'Debe cotizar FSP pero no se está calculando'
            });
        }
        
        if (!calculo.aplicaLey114_1 && calculo.ibcEnSMMLV < 10) {
            resumen.recomendaciones.push({
                empleado: empleado.name,
                mensaje: 'Podría aplicar a exoneración Ley 114-1 si empresa califica'
            });
        }
        
        // Verificar dotación pendiente
        if (empleado.dotacion_eligible && !empleado.last_dotacion_date) {
            resumen.analisisLegal.dotacionPendiente++;
        }
    });
    
    // Calcular promedios por departamento
    Object.keys(resumen.porDepartamento).forEach(dept => {
        const deptData = resumen.porDepartamento[dept];
        deptData.promedioSalario = deptData.costoTotal / deptData.empleados;
    });
    
    return resumen;
}

/**
 * Valida que los cálculos cumplan con la legislación colombiana 2025
 * Validaciones actualizadas con FSP y Ley 114-1
 */
function validarCalculosLegales2025(calculo) {
    const config = COLOMBIA_PAYROLL_2025;
    const errores = [];
    const warnings = [];
    
    // Validaciones críticas
    if (calculo.deducciones.salud < calculo.salarioTotal * 0.04) {
        errores.push('Deducción salud empleado menor al 4% obligatorio');
    }
    
    if (calculo.deducciones.pension < calculo.salarioTotal * 0.04) {
        errores.push('Deducción pensión empleado menor al 4% obligatorio');
    }
    
    if (calculo.salarioBase < config.salarioMinimo) {
        errores.push(`Salario base menor al SMMLV 2025 ($${config.salarioMinimo.toLocaleString()})`);
    }
    
    // Validaciones FSP (NUEVO 2025)
    if (calculo.aplicaFSP && calculo.fspCalculado === 0) {
        errores.push('Empleado debe cotizar FSP pero no se está calculando');
    }
    
    if (!calculo.aplicaFSP && calculo.fspCalculado > 0) {
        errores.push('Se está cobrando FSP a empleado que no debe cotizar (IBC < 4 SMMLV)');
    }
    
    // Validaciones Ley 114-1 (NUEVO 2025)
    if (!calculo.aplicaLey114_1 && calculo.aportes.salud === 0) {
        warnings.push('Salud empleador exonerada sin cumplir condiciones Ley 114-1');
    }
    
    // Validaciones auxilios
    if (calculo.cumpleAuxilioTransporte && calculo.auxilioTransporte === 0) {
        warnings.push('Empleado califica para auxilio transporte pero no se está pagando');
    }
    
    if (calculo.cumpleAuxilioConectividad && calculo.auxilioConectividad === 0) {
        warnings.push('Empleado en teletrabajo califica para auxilio conectividad');
    }
    
    // Validaciones prestaciones
    if (calculo.aportes.cesantias < calculo.salarioTotal * config.aportes.cesantias) {
        errores.push('Cesantías empleador menor al 8.33% obligatorio');
    }
    
    return {
        esValido: errores.length === 0,
        errores,
        warnings,
        cumplimiento: {
            fsp: calculo.aplicaFSP ? (calculo.fspCalculado > 0 ? 'CUMPLE' : 'NO_CUMPLE') : 'NO_APLICA',
            ley114_1: calculo.aplicaLey114_1 ? 'APLICADA' : 'NO_APLICA',
            auxilios: (calculo.auxilioTransporte + calculo.auxilioConectividad) > 0 ? 'CUMPLE' : 'VERIFICAR'
        }
    };
}

/**
 * Generar planilla PILA 2025 con formato actualizado
 * Incluye novedades y redondeos según Resolución 2388/2016
 */
function generarPILA2025(empleados, periodo, novedades = []) {
    const config = COLOMBIA_PAYROLL_2025;
    
    return {
        encabezado: {
            tipoDocumento: 'PLA',
            version: config.pila.version,
            year: periodo.year,
            month: periodo.month,
            empresa: {
                razonSocial: 'HYR CONSTRUCTORA & SOLDADURA SAS',
                nit: '900123456-1',
                tipoAportante: 'EMPRESA'
            }
        },
        
        empleados: empleados.map(emp => {
            const calculo = calcularNominaCompleta2025(emp, emp.horas || {});
            
            return {
                // Datos básicos
                tipoDocumento: emp.document_type,
                numeroDocumento: emp.document_number,
                primerApellido: extraerApellido(emp.name, 1),
                segundoApellido: extraerApellido(emp.name, 2),
                primerNombre: extraerNombre(emp.name, 1),
                segundoNombre: extraerNombre(emp.name, 2),
                
                // Valores con redondeos PILA
                salarioBasico: redondearPILA(calculo.salarioBase),
                ibc: redondearPILA(calculo.ibc),
                
                // Aportes con redondeos
                saludEmpleado: redondearPILA(calculo.deducciones.salud),
                pensionEmpleado: redondearPILA(calculo.deducciones.pension),
                fspEmpleado: redondearPILA(calculo.deducciones.fsp), // NUEVO 2025
                
                saludEmpleador: redondearPILA(calculo.aportes.salud),
                pensionEmpleador: redondearPILA(calculo.aportes.pension),
                arl: redondearPILA(calculo.aportes.arl),
                
                // Parafiscales
                sena: redondearPILA(calculo.parafiscales.sena),
                icbf: redondearPILA(calculo.parafiscales.icbf),
                cajas: redondearPILA(calculo.parafiscales.cajas),
                
                // Información legal
                claseARL: calculo.claseARL,
                aplicaLey114_1: calculo.aplicaLey114_1,
                diasTrabajados: calcularDiasTrabajados(emp.horas),
                
                // Auxilios
                auxilioTransporte: calculo.auxilioTransporte,
                auxilioConectividad: calculo.auxilioConectividad // NUEVO 2025
            };
        }),
        
        novedades: novedades.map(nov => ({
            empleado: nov.personnel_id,
            tipoNovedad: nov.novelty_type,
            fechaInicio: nov.start_date,
            fechaFin: nov.end_date,
            valor: nov.salary_value ? redondearPILA(nov.salary_value) : null
        })),
        
        totales: {
            totalEmpleados: empleados.length,
            totalSalarios: empleados.reduce((sum, emp) => sum + (emp.monthly_salary || 0), 0),
            totalAportes: empleados.reduce((sum, emp) => {
                const calc = calcularNominaCompleta2025(emp, emp.horas || {});
                return sum + calc.totalAportes + calc.totalParafiscales;
            }, 0),
            ahorroLey114_1: empleados.reduce((sum, emp) => {
                const calc = calcularNominaCompleta2025(emp, emp.horas || {});
                return sum + (calc.aplicaLey114_1 ? 
                    (calc.salarioTotal * (config.aportes.salud + config.parafiscales.sena + config.parafiscales.icbf)) : 0);
            }, 0)
        }
    };
}

// =====================================================
// FUNCIONES AUXILIARES
// =====================================================

function extraerApellido(nombreCompleto, posicion) {
    const partes = nombreCompleto.split(' ');
    return partes[posicion] || '';
}

function extraerNombre(nombreCompleto, posicion) {
    const partes = nombreCompleto.split(' ');
    const nombres = partes.slice(2); // Después de los dos apellidos
    return nombres[posicion - 1] || '';
}

function redondearPILA(valor) {
    // Redondeos según Resolución 2388/2016
    return Math.round(valor);
}

function calcularDiasTrabajados(horasInfo) {
    if (!horasInfo) return 30;
    const horasRegulares = horasInfo.regular_hours || 0;
    const horasExtra = horasInfo.overtime_hours || 0;
    return Math.min(30, Math.ceil((horasRegulares + horasExtra) / 8));
}

// =====================================================
// EXPORTS
// =====================================================

module.exports = {
    calcularNominaCompleta2025,
    generarResumenNomina2025,
    validarCalculosLegales2025,
    generarPILA2025,
    calcularRetencionFuente2025,
    
    // Mantener compatibilidad con versión 2024
    calcularNominaCompleta: calcularNominaCompleta2025,
    generarResumenNomina: generarResumenNomina2025,
    validarCalculosLegales: validarCalculosLegales2025,
    
    // Configuraciones
    COLOMBIA_PAYROLL_2025,
    SMMLV_2025: COLOMBIA_PAYROLL_2025.salarioMinimo,
    AUXILIO_TRANSPORTE_2025: COLOMBIA_PAYROLL_2025.auxilioTransporte
};