// =====================================================
// CONFIGURACIÓN NÓMINA COLOMBIANA 2025
// HYR CONSTRUCTORA & SOLDADURA
// Parámetros legales oficiales actualizados
// =====================================================

/**
 * Configuración oficial de nómina colombiana 2025
 * Incluye todos los parámetros legales actualizados según normatividad vigente
 */
const COLOMBIA_PAYROLL_2025 = {
    // Información del año fiscal
    year: 2025,
    effective_date: '2025-01-01',
    
    // =====================================================
    // SALARIOS Y AUXILIOS BASE 2025
    // =====================================================
    
    // Salario Mínimo Mensual Legal Vigente
    salarioMinimo: 1423500,           // $1.423.500 COP (Decreto oficial 2025)
    
    // Auxilio de Transporte (obligatorio salarios ≤ 2 SMMLV)  
    auxilioTransporte: 200000,        // $200.000 COP (actualizado 2025)
    
    // Auxilio de Conectividad (mismo valor para teletrabajo)
    auxilioConectividad: 200000,      // $200.000 COP (Ley de Teletrabajo)
    
    // Valor UVT (Unidad de Valor Tributario) 2025
    uvt: 47065,                       // $47.065 COP (pendiente confirmación DIAN)
    
    // =====================================================
    // DEDUCCIONES EMPLEADO
    // =====================================================
    deducciones: {
        // Salud EPS - Empleado (siempre se descuenta)
        salud: 0.04,                  // 4% sobre IBC - Art. 204 CST
        
        // Pensión - Empleado (siempre se descuenta)
        pension: 0.04,                // 4% sobre IBC - Ley 100 de 1993
        
        // Fondo de Solidaridad Pensional (FSP) - Ver tabla especial
        solidaridad: 0.01,            // 1%-2% según rango IBC (tabla FSP)
        
        // Retención en la Fuente (según tabla UVT 2025)
        retencionFuente: 0.0          // Variable según ingresos
    },
    
    // =====================================================
    // APORTES PATRONALES (EMPLEADOR)  
    // =====================================================
    aportes: {
        // Salud EPS - Empleador (sujeto a exoneración Ley 114-1)
        salud: 0.085,                 // 8.5% - Puede ser 0% con Ley 114-1
        
        // Pensión - Empleador (siempre se paga)
        pension: 0.12,                // 12% sobre IBC
        
        // ARL por clase de riesgo (empleador único responsable)
        arl: {
            I: 0.00522,               // 0.522% - Actividades administrativas mínimo riesgo
            II: 0.01044,              // 1.044% - Actividades comerciales riesgo bajo  
            III: 0.02436,             // 2.436% - Actividades industriales riesgo medio
            IV: 0.04350,              // 4.350% - Construcción riesgo alto
            V: 0.06960                // 6.960% - Construcción pesada/soldadura riesgo máximo
        },
        
        // Cesantías (empleador responsable)
        cesantias: 0.0833,            // 8.33% anual proporcional
        
        // Intereses sobre Cesantías
        interesesCesantias: 0.01,     // 1% mensual = 12% anual
        
        // Prima de Servicios (dos pagos anuales)
        prima: 0.0833,                // 8.33% anual (Jun 30 + Dic 20)
        
        // Vacaciones (15 días hábiles = 4.17%)
        vacaciones: 0.0417            // 4.17% sobre salario básico
    },
    
    // =====================================================
    // PARAFISCALES (Sujetos a Ley 114-1)
    // =====================================================
    parafiscales: {
        // SENA - Servicio Nacional de Aprendizaje
        sena: 0.02,                   // 2% - Exonerado con Ley 114-1
        
        // ICBF - Instituto Colombiano de Bienestar Familiar  
        icbf: 0.03,                   // 3% - Exonerado con Ley 114-1
        
        // Cajas de Compensación Familiar (SIEMPRE se paga)
        cajas: 0.04                   // 4% - NO exonerado nunca
    },
    
    // =====================================================
    // FONDO SOLIDARIDAD PENSIONAL (FSP) 2025
    // Tabla por rangos de IBC en SMMLV
    // =====================================================
    fsp: {
        enabled: true,
        ranges: [
            // IBC entre 4-16 SMMLV = 1%
            { 
                min: 4, 
                max: 16, 
                rate: 0.01,
                description: '1% para IBC 4-16 SMMLV'
            },
            // IBC entre 16-17 SMMLV = 1.2%  
            { 
                min: 16, 
                max: 17, 
                rate: 0.012,
                description: '1.2% para IBC 16-17 SMMLV'  
            },
            // IBC entre 17-18 SMMLV = 1.4%
            { 
                min: 17, 
                max: 18, 
                rate: 0.014,
                description: '1.4% para IBC 17-18 SMMLV'
            },
            // IBC entre 18-19 SMMLV = 1.6%
            { 
                min: 18, 
                max: 19, 
                rate: 0.016,
                description: '1.6% para IBC 18-19 SMMLV'  
            },
            // IBC entre 19-20 SMMLV = 1.8%
            { 
                min: 19, 
                max: 20, 
                rate: 0.018,
                description: '1.8% para IBC 19-20 SMMLV'
            },
            // IBC >20 SMMLV = 2%
            { 
                min: 20, 
                max: Infinity, 
                rate: 0.02,
                description: '2% para IBC mayor a 20 SMMLV'  
            }
        ]
    },
    
    // =====================================================  
    // LEY 114-1 EXONERACIONES
    // =====================================================
    ley114_1: {
        enabled: true,
        description: 'Exoneración aportes salud empleador y parafiscales SENA/ICBF',
        
        // Condiciones para aplicar exoneración
        conditions: {
            // IBC empleado debe ser menor a 10 SMMLV
            max_ibc_smmlv: 10,
            
            // Empresa debe ser PJ O PN con ≥2 empleados
            min_employees_pn: 2,
            
            // Período vigencia (actualizar según decreto)
            start_date: '2025-01-01',
            end_date: '2025-12-31'
        },
        
        // Qué se exonera cuando aplica
        exemptions: {
            salud_empleador: true,    // 8.5% empleador exonerado
            sena: true,               // 2% SENA exonerado
            icbf: true,               // 3% ICBF exonerado  
            cajas: false             // 4% Cajas SIEMPRE se paga
        }
    },
    
    // =====================================================
    // JORNADAS Y RECARGOS 2025
    // =====================================================
    recargos: {
        // Horas extras diurnas (6am-10pm)
        extraDiurna: 0.25,            // +25% sobre valor hora normal
        
        // Horas extras nocturnas (10pm-6am) 
        extraNocturna: 0.75,          // +75% sobre valor hora normal
        
        // Recargo nocturno (10pm-6am) sin ser extra
        nocturno: 0.35,               // +35% sobre valor hora normal
        
        // Trabajo dominical y festivo
        dominical: 0.75,              // +75% sobre valor hora normal
        festivo: 0.75,                // +75% sobre valor hora normal
        
        // Combinaciones especiales
        extraDiurnaFestivo: 1.00,     // +100% (25% extra + 75% festivo)
        extraNocturnaFestivo: 1.50,   // +150% (75% extra + 75% festivo)
        extraNocturnaDominical: 1.50, // +150% (75% extra + 75% dominical)
        
        // Horarios definición
        horarios: {
            nocturnoInicio: '22:00',  // 10:00 PM
            nocturnoFin: '06:00'      // 6:00 AM
        }
    },
    
    // =====================================================
    // PRESTACIONES SOCIALES - FECHAS LÍMITE
    // =====================================================
    prestaciones: {
        // Prima de Servicios (2 pagos anuales)
        prima: {
            primer_pago: {
                fecha_limite: '06-30',    // Junio 30
                descripcion: 'Primera prima del año'  
            },
            segundo_pago: {
                fecha_limite: '12-20',    // Diciembre 20
                descripcion: 'Segunda prima del año'
            }
        },
        
        // Cesantías e Intereses
        cesantias: {
            pago_limite: '02-14',         // Febrero 14 año siguiente
            intereses_limite: '01-31'     // Enero 31 año siguiente
        },
        
        // Dotación (3 entregas anuales)
        dotacion: {
            enabled: true,
            salario_maximo: 2,            // ≤ 2 SMMLV
            antiguedad_minima: 3,         // > 3 meses
            fechas: [
                { fecha: '04-30', descripcion: 'Primera dotación' },
                { fecha: '08-31', descripcion: 'Segunda dotación' },  
                { fecha: '12-20', descripcion: 'Tercera dotación' }
            ]
        }
    },
    
    // =====================================================
    // CONFIGURACIÓN PILA 2025
    // =====================================================
    pila: {
        version: '2025.1',
        formato: 'XML',
        
        // Tipos de novedad PILA
        novedades: {
            ING: 'Ingreso',
            RET: 'Retiro', 
            TDE: 'Temporal por suspensión del contrato',
            TAE: 'Temporal por accidente de trabajo o enfermedad profesional',
            TDP: 'Temporal por licencia de maternidad o paternidad',
            VAR: 'Variación permanente de salario',
            SLN: 'Suspensión temporal del contrato',
            IGE: 'Incapacidad temporal por enfermedad general',
            LMA: 'Licencia de maternidad',
            VAC: 'Vacaciones',
            IRP: 'Incapacidad temporal por riesgo profesional'
        },
        
        // Redondeos según Resolución 2388/2016
        redondeos: {
            enabled: true,
            descripcion: 'Aplicar redondeos oficiales PILA'
        }
    },
    
    // =====================================================
    // TOPES Y LÍMITES 2025  
    // =====================================================
    topes: {
        // IBC mínimo = 1 SMMLV
        ibc_minimo: 1423500,
        
        // IBC máximo = 25 SMMLV  
        ibc_maximo: 35587500,         // 25 * 1.423.500
        
        // Auxilio transporte hasta 2 SMMLV
        auxilio_transporte_limite: 2847000,  // 2 * 1.423.500
        
        // Dotación hasta 2 SMMLV
        dotacion_limite: 2847000     // 2 * 1.423.500
    }
};

// =====================================================
// FUNCIONES AUXILIARES
// =====================================================

/**
 * Obtener configuración para año específico
 */
function getPayrollConfig(year = 2025) {
    if (year === 2025) {
        return COLOMBIA_PAYROLL_2025;
    }
    // TODO: Agregar configuraciones años anteriores si es necesario
    throw new Error(`Configuración de nómina no disponible para año ${year}`);
}

/**
 * Validar si empleado califica para auxilio de transporte
 */
function qualifiesForTransportAllowance(monthlyBaseSalary) {
    return monthlyBaseSalary <= COLOMBIA_PAYROLL_2025.topes.auxilio_transporte_limite;
}

/**
 * Calcular FSP según rango IBC
 */
function calculateFSP(baseSalary, smmlv = COLOMBIA_PAYROLL_2025.salarioMinimo) {
    const ibcInSMMLV = baseSalary / smmlv;
    
    // FSP solo aplica para IBC >= 4 SMMLV
    if (ibcInSMMLV < 4) {
        return 0;
    }
    
    // Encontrar rango aplicable
    const range = COLOMBIA_PAYROLL_2025.fsp.ranges
        .find(r => ibcInSMMLV >= r.min && ibcInSMMLV < r.max);
    
    if (!range) {
        return 0;
    }
    
    return baseSalary * range.rate;
}

/**
 * Verificar si empresa califica para Ley 114-1
 */
function qualifiesForLaw114_1(empresa, empleado, baseSalary) {
    const config = COLOMBIA_PAYROLL_2025.ley114_1;
    
    if (!config.enabled) {
        return false;
    }
    
    // Verificar IBC empleado < 10 SMMLV
    const ibcInSMMLV = baseSalary / COLOMBIA_PAYROLL_2025.salarioMinimo;
    if (ibcInSMMLV >= config.conditions.max_ibc_smmlv) {
        return false;
    }
    
    // Verificar tipo empresa: PJ O PN con ≥2 empleados
    const isEligibleCompany = empresa.is_juridica || 
                             (empresa.employee_count >= config.conditions.min_employees_pn);
    
    return isEligibleCompany && empresa.qualifies_law_114_1;
}

/**
 * Calcular recargo por tipo de hora
 */
function calculateOvertimeRate(horaInicio, horaFin, esDominical, esFestivo) {
    const recargos = COLOMBIA_PAYROLL_2025.recargos;
    
    // Determinar si es nocturno
    const esNocturno = isNightTime(horaInicio) || isNightTime(horaFin);
    
    if (esFestivo || esDominical) {
        if (esNocturno) {
            return recargos.extraNocturnaFestivo; // 150%
        } 
            return recargos.extraDiurnaFestivo;   // 100%
        
    }
    
    if (esNocturno) {
        return recargos.extraNocturna;            // 75%
    } 
        return recargos.extraDiurna;              // 25%
    
}

/**
 * Verificar si hora está en rango nocturno (10pm-6am)
 */
function isNightTime(hora) {
    const horaNum = parseInt(hora.split(':')[0]);
    return horaNum >= 22 || horaNum < 6;
}

/**
 * Obtener días festivos Colombia 2025
 */
function getDiasHabilesColombia2025() {
    return [
        '2025-01-01', // Año Nuevo
        '2025-01-06', // Día de los Reyes Magos  
        '2025-03-24', // Día de San José
        '2025-04-17', // Jueves Santo (2025)
        '2025-04-18', // Viernes Santo (2025)
        '2025-05-01', // Día del Trabajo
        '2025-06-02', // Ascensión del Señor (2025)
        '2025-06-23', // Corpus Christi (2025)
        '2025-06-30', // Sagrado Corazón (2025)
        '2025-07-20', // Día de la Independencia
        '2025-08-07', // Batalla de Boyacá
        '2025-08-18', // Asunción de la Virgen (2025)
        '2025-10-13', // Día de la Raza (2025)
        '2025-11-03', // Todos los Santos (2025)
        '2025-11-17', // Independencia de Cartagena (2025)
        '2025-12-08', // Inmaculada Concepción  
        '2025-12-25'  // Navidad
    ];
}

// =====================================================
// EXPORTS  
// =====================================================

module.exports = {
    COLOMBIA_PAYROLL_2025,
    getPayrollConfig,
    qualifiesForTransportAllowance,
    calculateFSP,
    qualifiesForLaw114_1,
    calculateOvertimeRate,
    isNightTime,
    getDiasHabilesColombia2025,
    
    // Constantes útiles
    SMMLV_2025: COLOMBIA_PAYROLL_2025.salarioMinimo,
    AUXILIO_TRANSPORTE_2025: COLOMBIA_PAYROLL_2025.auxilioTransporte,
    UVT_2025: COLOMBIA_PAYROLL_2025.uvt
};