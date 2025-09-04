// =====================================================
// SUITE DE PRUEBAS - NÓMINA COLOMBIANA 2025
// HYR CONSTRUCTORA & SOLDADURA
// Casos límite y validación cumplimiento legal
// =====================================================

const {
    calcularNominaCompleta2025,
    generarResumenNomina2025,
    validarCalculosLegales2025,
    generarPILA2025,
    COLOMBIA_PAYROLL_2025
} = require('../utils/payroll-colombia-2025');

const { calculateFSP, qualifiesForLaw114_1 } = require('../config/payroll-2025');

describe('Nómina Colombia 2025 - Cumplimiento Legal', () => {
    
    // Configuración base para pruebas
    const SMMLV_2025 = 1423500;
    const AUX_TRANSPORTE_2025 = 200000;
    
    // Empleados de prueba
    const empleadoSoldador = {
        id: 'test-001',
        name: 'Juan Pérez Soldador',
        document_type: 'CC',
        document_number: '12345678',
        position: 'soldador',
        department: 'soldadura',
        hire_date: '2024-01-15',
        status: 'active',
        salary_type: 'hourly',
        hourly_rate: 25000,
        monthly_salary: null,
        arl_risk_class: 'V',
        transport_allowance_eligible: true,
        dotacion_eligible: true,
        teleworking: false
    };
    
    const empleadoSupervisor = {
        id: 'test-002', 
        name: 'María González Supervisor',
        document_type: 'CC',
        document_number: '87654321',
        position: 'supervisor',
        department: 'administracion',
        hire_date: '2023-06-01',
        status: 'active',
        salary_type: 'monthly',
        hourly_rate: null,
        monthly_salary: 4200000, // ~3 SMMLV
        arl_risk_class: 'I',
        transport_allowance_eligible: false,
        dotacion_eligible: false,
        teleworking: true
    };
    
    const empleadoAltoIngreso = {
        id: 'test-003',
        name: 'Carlos Rodríguez Gerente', 
        document_type: 'CC',
        document_number: '11223344',
        position: 'gerente',
        department: 'administracion',
        hire_date: '2020-03-01',
        status: 'active',
        salary_type: 'monthly',
        hourly_rate: null,
        monthly_salary: 15000000, // >10 SMMLV
        arl_risk_class: 'I',
        transport_allowance_eligible: false,
        dotacion_eligible: false,
        teleworking: false
    };
    
    const empresaCalificaLey114_1 = {
        id: 'empresa-001',
        name: 'HYR Constructora SAS',
        qualifies_law_114_1: true,
        is_juridica: true,
        employee_count: 7
    };
    
    const empresaNoCalifica = {
        id: 'empresa-002', 
        name: 'Empresa Individual',
        qualifies_law_114_1: false,
        is_juridica: false,
        employee_count: 1
    };

    // =====================================================
    // PRUEBAS FSP (FONDO SOLIDARIDAD PENSIONAL)
    // =====================================================
    
    describe('FSP - Fondo Solidaridad Pensional', () => {
        
        test('FSP: IBC < 4 SMMLV - No debe cotizar', () => {
            const salario3_5SMMLV = SMMLV_2025 * 3.5;
            const fsp = calculateFSP(salario3_5SMMLV, SMMLV_2025);
            expect(fsp).toBe(0);
        });
        
        test('FSP: IBC = 4.0 SMMLV - Debe cotizar 1%', () => {
            const salario4SMMLV = SMMLV_2025 * 4.0;
            const fsp = calculateFSP(salario4SMMLV, SMMLV_2025);
            const esperado = salario4SMMLV * 0.01;
            expect(fsp).toBeCloseTo(esperado, 2);
        });
        
        test('FSP: IBC = 10.5 SMMLV - Debe cotizar 1%', () => {
            const salario10_5SMMLV = SMMLV_2025 * 10.5;
            const fsp = calculateFSP(salario10_5SMMLV, SMMLV_2025);
            const esperado = salario10_5SMMLV * 0.01; 
            expect(fsp).toBeCloseTo(esperado, 2);
        });
        
        test('FSP: IBC = 16.1 SMMLV - Debe cotizar 1.2%', () => {
            const salario16_1SMMLV = SMMLV_2025 * 16.1;
            const fsp = calculateFSP(salario16_1SMMLV, SMMLV_2025);
            const esperado = salario16_1SMMLV * 0.012;
            expect(fsp).toBeCloseTo(esperado, 2);
        });
        
        test('FSP: IBC = 20.5 SMMLV - Debe cotizar 2%', () => {
            const salario20_5SMMLV = SMMLV_2025 * 20.5;
            const fsp = calculateFSP(salario20_5SMMLV, SMMLV_2025);
            const esperado = salario20_5SMMLV * 0.02;
            expect(fsp).toBeCloseTo(esperado, 2);
        });
        
        test('Integración FSP en cálculo nómina completo', () => {
            const empleadoFSP = { ...empleadoSupervisor, monthly_salary: SMMLV_2025 * 5.5 }; // >4 SMMLV
            const calculo = calcularNominaCompleta2025(empleadoFSP, {}, {});
            
            expect(calculo.aplicaFSP).toBe(true);
            expect(calculo.fspCalculado).toBeGreaterThan(0);
            expect(calculo.deducciones.fsp).toBeCloseTo(empleadoFSP.monthly_salary * 0.01, 2);
        });
    });

    // =====================================================
    // PRUEBAS LEY 114-1 EXONERACIONES
    // =====================================================
    
    describe('Ley 114-1 - Exoneraciones', () => {
        
        test('Ley 114-1: Empresa PJ, empleado <10 SMMLV - Debe aplicar', () => {
            const salario8SMMLV = SMMLV_2025 * 8.0;
            const empleado = { ...empleadoSupervisor, monthly_salary: salario8SMMLV };
            const califica = qualifiesForLaw114_1(empresaCalificaLey114_1, empleado, salario8SMMLV);
            expect(califica).toBe(true);
        });
        
        test('Ley 114-1: Empresa PJ, empleado ≥10 SMMLV - NO debe aplicar', () => {
            const salario12SMMLV = SMMLV_2025 * 12.0;
            const empleado = { ...empleadoAltoIngreso, monthly_salary: salario12SMMLV };
            const califica = qualifiesForLaw114_1(empresaCalificaLey114_1, empleado, salario12SMMLV);
            expect(califica).toBe(false);
        });
        
        test('Ley 114-1: Empresa PN <2 empleados - NO debe aplicar', () => {
            const empresaPequena = { ...empresaNoCalifica, employee_count: 1 };
            const salario5SMMLV = SMMLV_2025 * 5.0;
            const califica = qualifiesForLaw114_1(empresaPequena, empleadoSoldador, salario5SMMLV);
            expect(califica).toBe(false);
        });
        
        test('Integración Ley 114-1: Exoneración salud empleador', () => {
            const salario6SMMLV = SMMLV_2025 * 6.0;
            const empleado = { ...empleadoSupervisor, monthly_salary: salario6SMMLV };
            const calculo = calcularNominaCompleta2025(empleado, {}, empresaCalificaLey114_1);
            
            expect(calculo.aplicaLey114_1).toBe(true);
            expect(calculo.aportes.salud).toBe(0); // Exonerado
            expect(calculo.parafiscales.sena).toBe(0); // Exonerado
            expect(calculo.parafiscales.icbf).toBe(0); // Exonerado
            expect(calculo.parafiscales.cajas).toBeGreaterThan(0); // NUNCA exonerado
        });
        
        test('Integración Ley 114-1: Sin exoneración cuando no califica', () => {
            const calculo = calcularNominaCompleta2025(empleadoAltoIngreso, {}, empresaCalificaLey114_1);
            
            expect(calculo.aplicaLey114_1).toBe(false);
            expect(calculo.aportes.salud).toBeGreaterThan(0); // NO exonerado
            expect(calculo.parafiscales.sena).toBeGreaterThan(0); // NO exonerado
            expect(calculo.parafiscales.icbf).toBeGreaterThan(0); // NO exonerado
        });
    });

    // =====================================================
    // PRUEBAS ARL POR CENTRO DE TRABAJO
    // =====================================================
    
    describe('ARL - Centro de Trabajo', () => {
        
        test('ARL: Empleado clase V, centro trabajo clase IV - Usar centro trabajo', () => {
            const centroTrabajo = {
                id: 'obra-001',
                name: 'Oficina Administrativa',
                arl_risk_class: 'IV',
                arl_rate: null
            };
            
            const calculo = calcularNominaCompleta2025(empleadoSoldador, { regular_hours: 192 }, {}, centroTrabajo);
            
            expect(calculo.claseARL).toBe('IV');
            expect(calculo.tarifaARL).toBe(COLOMBIA_PAYROLL_2025.aportes.arl.IV);
        });
        
        test('ARL: Centro trabajo con tarifa custom', () => {
            const centroTrabajo = {
                id: 'obra-002',
                name: 'Obra Especial', 
                arl_risk_class: 'V',
                arl_rate: 0.08500 // 8.5% custom
            };
            
            const calculo = calcularNominaCompleta2025(empleadoSoldador, { regular_hours: 192 }, {}, centroTrabajo);
            
            expect(calculo.tarifaARL).toBe(0.08500);
            expect(calculo.aportes.arl).toBeCloseTo(calculo.salarioTotal * 0.08500, 2);
        });
    });

    // =====================================================
    // PRUEBAS HORAS EXTRAS Y RECARGOS
    // =====================================================
    
    describe('Horas Extras y Recargos 2025', () => {
        
        test('Horas extra diurnas - 25%', () => {
            const horasExtra = {
                regular_hours: 192,
                overtime_hours: 10,
                overtime_type: 'diurna',
                is_holiday: false,
                is_sunday: false
            };
            
            const calculo = calcularNominaCompleta2025(empleadoSoldador, horasExtra);
            const valorHora = empleadoSoldador.hourly_rate;
            const expectedExtra = valorHora * 10 * 1.25; // 25% recargo
            
            expect(calculo.salarioExtra).toBeCloseTo(expectedExtra, 2);
        });
        
        test('Horas extra nocturnas - 75%', () => {
            const horasExtra = {
                regular_hours: 192,
                overtime_hours: 8,
                overtime_type: 'nocturna',
                is_holiday: false,
                is_sunday: false
            };
            
            const calculo = calcularNominaCompleta2025(empleadoSoldador, horasExtra);
            const valorHora = empleadoSoldador.hourly_rate;
            const expectedExtra = valorHora * 8 * 1.75; // 75% recargo
            
            expect(calculo.salarioExtra).toBeCloseTo(expectedExtra, 2);
        });
        
        test('Horas extra nocturnas en festivo - 150%', () => {
            const horasExtra = {
                regular_hours: 192,
                overtime_hours: 6,
                overtime_type: 'nocturna',
                is_holiday: true,
                is_sunday: false
            };
            
            const calculo = calcularNominaCompleta2025(empleadoSoldador, horasExtra);
            const valorHora = empleadoSoldador.hourly_rate;
            const expectedExtra = valorHora * 6 * 2.50; // 150% recargo
            
            expect(calculo.salarioExtra).toBeCloseTo(expectedExtra, 2);
        });
    });

    // =====================================================
    // PRUEBAS AUXILIOS
    // =====================================================
    
    describe('Auxilios 2025', () => {
        
        test('Auxilio transporte: Salario ≤2 SMMLV - Debe recibir', () => {
            const empleadoBajoIngreso = { ...empleadoSoldador, hourly_rate: 12000 }; // ~2.3M mensual
            const calculo = calcularNominaCompleta2025(empleadoBajoIngreso, { regular_hours: 192 });
            
            expect(calculo.cumpleAuxilioTransporte).toBe(true);
            expect(calculo.auxilioTransporte).toBe(AUX_TRANSPORTE_2025);
        });
        
        test('Auxilio transporte: Salario >2 SMMLV - NO debe recibir', () => {
            const calculo = calcularNominaCompleta2025(empleadoSupervisor, { regular_hours: 192 });
            
            expect(calculo.cumpleAuxilioTransporte).toBe(false);
            expect(calculo.auxilioTransporte).toBe(0);
        });
        
        test('Auxilio conectividad: Teletrabajo y ≤2 SMMLV - Debe recibir', () => {
            const empleadoTeletrabajo = { 
                ...empleadoSoldador, 
                hourly_rate: 12000,
                teleworking: true 
            };
            const calculo = calcularNominaCompleta2025(empleadoTeletrabajo, { regular_hours: 192 });
            
            expect(calculo.cumpleAuxilioConectividad).toBe(true);
            expect(calculo.auxilioConectividad).toBe(AUX_TRANSPORTE_2025); // Mismo valor
        });
        
        test('Auxilio conectividad: No teletrabajo - NO debe recibir', () => {
            const calculo = calcularNominaCompleta2025(empleadoSoldador, { regular_hours: 192 });
            
            expect(calculo.cumpleAuxilioConectividad).toBe(false);
            expect(calculo.auxilioConectividad).toBe(0);
        });
    });

    // =====================================================
    // PRUEBAS VALIDACIÓN LEGAL
    // =====================================================
    
    describe('Validaciones Legales 2025', () => {
        
        test('Validar: Empleado cumple todos los requisitos legales', () => {
            const calculo = calcularNominaCompleta2025(empleadoSoldador, { regular_hours: 192 });
            const validacion = validarCalculosLegales2025(calculo);
            
            expect(validacion.esValido).toBe(true);
            expect(validacion.errores).toHaveLength(0);
            expect(validacion.cumplimiento.fsp).toBe('NO_APLICA'); // <4 SMMLV
        });
        
        test('Validar: Error salario menor al mínimo', () => {
            const empleadoInvalido = { ...empleadoSoldador, hourly_rate: 5000 }; // Muy bajo
            const calculo = calcularNominaCompleta2025(empleadoInvalido, { regular_hours: 192 });
            const validacion = validarCalculosLegales2025(calculo);
            
            expect(validacion.esValido).toBe(false);
            expect(validacion.errores).toContain(expect.stringContaining('menor al SMMLV 2025'));
        });
        
        test('Validar: FSP faltante para empleado que debe cotizar', () => {
            const empleadoFSP = { ...empleadoSoldador, monthly_salary: SMMLV_2025 * 5, fsp_exempt: true };
            const calculo = calcularNominaCompleta2025(empleadoFSP, { regular_hours: 192 });
            const validacion = validarCalculosLegales2025(calculo);
            
            expect(validacion.cumplimiento.fsp).toBe('NO_CUMPLE');
            expect(validacion.errores).toContain('debe cotizar FSP pero no se está calculando');
        });
    });

    // =====================================================
    // PRUEBAS RESUMEN EJECUTIVO
    // =====================================================
    
    describe('Resumen Ejecutivo Nómina', () => {
        
        test('Resumen: Múltiples empleados con análisis Ley 114-1', () => {
            const empleados = [empleadoSoldador, empleadoSupervisor, empleadoAltoIngreso];
            empleados.forEach(emp => emp.horas = { regular_hours: 192, overtime_hours: 0 });
            
            const empresas = {
                [empleadoSoldador.client_id || 'default']: empresaCalificaLey114_1,
                [empleadoSupervisor.client_id || 'default']: empresaCalificaLey114_1,
                [empleadoAltoIngreso.client_id || 'default']: empresaCalificaLey114_1
            };
            
            const resumen = generarResumenNomina2025(empleados, '2025-01', empresas);
            
            expect(resumen.totalEmpleados).toBe(3);
            expect(resumen.analisisLegal.empleadosLey114_1).toBeGreaterThan(0);
            expect(resumen.analisisLegal.empleadosConFSP).toBeGreaterThan(0);
            expect(resumen.totales.ahorroLey114_1).toBeGreaterThan(0);
        });
        
        test('Resumen: Alertas críticas detectadas', () => {
            const empleadoProblematico = { 
                ...empleadoSoldador, 
                hourly_rate: 5000, // Muy bajo - genera alerta
                horas: { regular_hours: 192 }
            };
            
            const resumen = generarResumenNomina2025([empleadoProblematico], '2025-01');
            
            expect(resumen.alertas.length).toBeGreaterThan(0);
            expect(resumen.alertas[0].tipo).toBe('CRITICO');
            expect(resumen.alertas[0].mensaje).toContain('menor al SMMLV 2025');
        });
    });

    // =====================================================
    // PRUEBAS PILA 2025
    // =====================================================
    
    describe('PILA 2025 - Formato Oficial', () => {
        
        test('PILA: Formato básico empleado con redondeos', () => {
            const empleados = [{ ...empleadoSoldador, horas: { regular_hours: 192 } }];
            const pila = generarPILA2025(empleados, { year: 2025, month: 1 });
            
            expect(pila.encabezado.version).toBe('2025.1');
            expect(pila.empleados).toHaveLength(1);
            
            const emp = pila.empleados[0];
            expect(emp.tipoDocumento).toBe('CC');
            expect(emp.numeroDocumento).toBe('12345678');
            expect(emp.salarioBasico).toBe(Math.round(empleadoSoldador.hourly_rate * 192));
            expect(emp.aplicaLey114_1).toBeDefined();
        });
        
        test('PILA: Novedades incluidas', () => {
            const empleados = [empleadoSoldador];
            const novedades = [{
                personnel_id: 'test-001',
                novelty_type: 'ING',
                start_date: '2025-01-15',
                end_date: null,
                salary_value: 4800000
            }];
            
            const pila = generarPILA2025(empleados, { year: 2025, month: 1 }, novedades);
            
            expect(pila.novedades).toHaveLength(1);
            expect(pila.novedades[0].tipoNovedad).toBe('ING');
            expect(pila.novedades[0].empleado).toBe('test-001');
        });
        
        test('PILA: Totales con ahorro Ley 114-1', () => {
            const empleados = [
                { ...empleadoSupervisor, horas: { regular_hours: 192 } }
            ];
            
            const pila = generarPILA2025(empleados, { year: 2025, month: 1 });
            
            expect(pila.totales.totalEmpleados).toBe(1);
            expect(pila.totales.totalSalarios).toBeGreaterThan(0);
            expect(pila.totales.ahorroLey114_1).toBeDefined();
        });
    });

    // =====================================================
    // CASOS LÍMITE Y EDGE CASES
    // =====================================================
    
    describe('Casos Límite - Edge Cases', () => {
        
        test('Edge: Empleado exactamente en 4 SMMLV para FSP', () => {
            const empleadoLimite = { 
                ...empleadoSoldador, 
                monthly_salary: SMMLV_2025 * 4.0 
            };
            const calculo = calcularNominaCompleta2025(empleadoLimite, {});
            
            expect(calculo.aplicaFSP).toBe(true);
            expect(calculo.fspCalculado).toBe(empleadoLimite.monthly_salary * 0.01);
        });
        
        test('Edge: Empleado exactamente en 10 SMMLV para Ley 114-1', () => {
            const empleadoLimite = { 
                ...empleadoSupervisor, 
                monthly_salary: SMMLV_2025 * 10.0 
            };
            const calcula = qualifiesForLaw114_1(empresaCalificaLey114_1, empleadoLimite, empleadoLimite.monthly_salary);
            
            expect(calcula).toBe(false); // ≥10 SMMLV no califica
        });
        
        test('Edge: Empleado sin horas trabajadas', () => {
            const calculo = calcularNominaCompleta2025(empleadoSoldador, {});
            
            expect(calculo.salarioRegular).toBe(0);
            expect(calculo.salarioExtra).toBe(0);
            expect(calculo.horasRegulares).toBe(0);
            expect(calculo.horasExtra).toBe(0);
        });
        
        test('Edge: Empleado mensual vs por horas - mismo resultado', () => {
            const empleadoMensual = { 
                ...empleadoSoldador, 
                salary_type: 'monthly',
                monthly_salary: empleadoSoldador.hourly_rate * 192,
                hourly_rate: null
            };
            
            const calculoHoras = calcularNominaCompleta2025(empleadoSoldador, { regular_hours: 192 });
            const calculoMensual = calcularNominaCompleta2025(empleadoMensual, { regular_hours: 192 });
            
            expect(calculoHoras.salarioBase).toBeCloseTo(calculoMensual.salarioBase, 2);
            expect(calculoHoras.salarioRegular).toBeCloseTo(calculoMensual.salarioRegular, 2);
        });
        
        test('Edge: Múltiples auxilios simultáneos', () => {
            const empleadoMultiple = {
                ...empleadoSoldador,
                hourly_rate: 12000, // Bajo ingreso
                teleworking: true,  // Para auxilio conectividad
                transport_allowance_eligible: true
            };
            
            const calculo = calcularNominaCompleta2025(empleadoMultiple, { regular_hours: 192 });
            
            expect(calculo.auxilioTransporte).toBe(AUX_TRANSPORTE_2025);
            expect(calculo.auxilioConectividad).toBe(AUX_TRANSPORTE_2025);
            expect(calculo.totalAuxilios).toBe(AUX_TRANSPORTE_2025 * 2);
        });
    });

    // =====================================================
    // PRUEBAS INTEGRACIÓN COMPLETA
    // =====================================================
    
    describe('Integración - Flujo Completo', () => {
        
        test('Flujo completo: Soldador clase V con Ley 114-1', () => {
            const empleado = { ...empleadoSoldador, monthly_salary: SMMLV_2025 * 3.5 };
            const horas = { regular_hours: 192, overtime_hours: 10, overtime_type: 'nocturna' };
            const centro = { arl_risk_class: 'V' };
            
            const calculo = calcularNominaCompleta2025(empleado, horas, empresaCalificaLey114_1, centro);
            
            // Verificaciones integradas
            expect(calculo.aplicaLey114_1).toBe(true);       // Califica por IBC <10 SMMLV
            expect(calculo.aplicaFSP).toBe(false);           // No califica por IBC <4 SMMLV  
            expect(calculo.claseARL).toBe('V');              // Riesgo máximo construcción
            expect(calculo.aportes.salud).toBe(0);           // Exonerado Ley 114-1
            expect(calculo.parafiscales.sena).toBe(0);       // Exonerado Ley 114-1
            expect(calculo.parafiscales.cajas).toBeGreaterThan(0); // NUNCA exonerado
            expect(calculo.salarioExtra).toBeGreaterThan(0); // Horas extra nocturnas
            
            // Validación legal
            const validacion = validarCalculosLegales2025(calculo);
            expect(validacion.esValido).toBe(true);
            expect(validacion.cumplimiento.ley114_1).toBe('APLICADA');
        });
        
        test('Flujo completo: Supervisor alto ingreso con FSP', () => {
            const empleado = { ...empleadoAltoIngreso, monthly_salary: SMMLV_2025 * 12 };
            const horas = { regular_hours: 192 };
            
            const calculo = calcularNominaCompleta2025(empleado, horas, empresaCalificaLey114_1);
            
            // Verificaciones integradas
            expect(calculo.aplicaLey114_1).toBe(false);      // No califica por IBC ≥10 SMMLV
            expect(calculo.aplicaFSP).toBe(true);            // Califica por IBC >4 SMMLV
            expect(calculo.fspCalculado).toBeGreaterThan(0); // Debe cotizar FSP
            expect(calculo.aportes.salud).toBeGreaterThan(0); // NO exonerado
            expect(calculo.parafiscales.sena).toBeGreaterThan(0); // NO exonerado
            
            // Validación legal
            const validacion = validarCalculosLegales2025(calculo);
            expect(validacion.esValido).toBe(true);
            expect(validacion.cumplimiento.fsp).toBe('CUMPLE');
        });
    });
});

// =====================================================
// HELPERS PARA PRUEBAS
// =====================================================

// Función auxiliar para generar empleados de prueba
function generarEmpleadoPrueba(overrides = {}) {
    return {
        id: 'test-emp-' + Math.random().toString(36).substr(2, 9),
        name: 'Empleado Prueba',
        document_type: 'CC',
        document_number: '12345678',
        position: 'operario',
        department: 'construccion',
        hire_date: '2024-01-01',
        status: 'active',
        salary_type: 'hourly',
        hourly_rate: 15000,
        monthly_salary: null,
        arl_risk_class: 'IV',
        transport_allowance_eligible: true,
        dotacion_eligible: true,
        teleworking: false,
        ...overrides
    };
}

// Función auxiliar para generar empresa de prueba  
function generarEmpresaPrueba(overrides = {}) {
    return {
        id: 'test-company-' + Math.random().toString(36).substr(2, 9),
        name: 'Empresa Prueba SAS',
        qualifies_law_114_1: true,
        is_juridica: true,
        employee_count: 5,
        ...overrides
    };
}

module.exports = {
    generarEmpleadoPrueba,
    generarEmpresaPrueba
};