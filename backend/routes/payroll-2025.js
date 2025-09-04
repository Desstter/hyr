// =====================================================
// API ROUTES - NÓMINA COLOMBIANA 2025
// HYR CONSTRUCTORA & SOLDADURA
// Endpoints actualizados con cumplimiento legal completo
// =====================================================

const express = require('express');
const router = express.Router();
const { db } = require('../database/connection');
const { 
    calcularNominaCompleta2025, 
    generarResumenNomina2025, 
    validarCalculosLegales2025,
    generarPILA2025,
    COLOMBIA_PAYROLL_2025 
} = require('../utils/payroll-colombia-2025');

// =====================================================
// CONFIGURACIÓN ANUAL DE NÓMINA
// =====================================================

// Obtener configuración de nómina por año
router.get('/config/:year?', async (req, res) => {
    try {
        const year = req.params.year || 2025;
        
        const result = await db.query(`
            SELECT * FROM annual_payroll_settings 
            WHERE year = $1
        `, [year]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ 
                error: `No existe configuración de nómina para el año ${year}` 
            });
        }
        
        const config = result.rows[0];
        
        res.json({
            year: config.year,
            smmlv: config.smmlv,
            auxilio_transporte: config.auxilio_transporte,
            auxilio_conectividad: config.auxilio_conectividad,
            uvt: config.uvt,
            config_details: config.config_json,
            effective_date: config.effective_date,
            
            // Información adicional para frontend
            calculated_values: {
                two_smmlv: config.smmlv * 2,
                four_smmlv: config.smmlv * 4,
                ten_smmlv: config.smmlv * 10,
                
                // Tarifas fijas 2025
                deducciones: COLOMBIA_PAYROLL_2025.deducciones,
                aportes: COLOMBIA_PAYROLL_2025.aportes,
                parafiscales: COLOMBIA_PAYROLL_2025.parafiscales,
                
                // FSP ranges
                fsp_ranges: COLOMBIA_PAYROLL_2025.fsp.ranges
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Actualizar configuración anual
router.put('/config/:year', async (req, res) => {
    try {
        const { year } = req.params;
        const { smmlv, auxilio_transporte, auxilio_conectividad, uvt, config_json } = req.body;
        
        const result = await db.query(`
            UPDATE annual_payroll_settings 
            SET smmlv = $1, auxilio_transporte = $2, auxilio_conectividad = $3, 
                uvt = $4, config_json = $5, updated_at = CURRENT_TIMESTAMP
            WHERE year = $6
            RETURNING *
        `, [smmlv, auxilio_transporte, auxilio_conectividad, uvt, config_json, year]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Configuración no encontrada' });
        }
        
        res.json({
            message: `Configuración ${year} actualizada exitosamente`,
            config: result.rows[0]
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// =====================================================
// PROCESAMIENTO NÓMINA 2025
// =====================================================

// Procesar nómina con cumplimiento 2025 completo
router.post('/periods/:id/process-2025', async (req, res) => {
    const client = await db.connect();
    
    try {
        await client.query('BEGIN');
        
        const { id } = req.params;
        const { force_recalculate = false } = req.body;
        
        // Obtener empleados activos con información completa
        const personnel = await client.query(`
            SELECT 
                p.*,
                c.qualifies_law_114_1,
                c.is_juridica,
                c.employee_count,
                ws.arl_risk_class as work_site_arl_class,
                ws.arl_rate as work_site_arl_rate,
                ws.name as work_site_name
            FROM personnel p
            LEFT JOIN clients c ON p.client_id = c.id
            LEFT JOIN work_sites ws ON p.work_site_default = ws.id
            WHERE p.status = 'active'
        `);
        
        // Obtener período con validaciones
        const period = await client.query(`
            SELECT * FROM payroll_periods 
            WHERE id = $1
        `, [id]);
        
        if (period.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Período no encontrado' });
        }
        
        const periodData = period.rows[0];
        
        // Verificar si ya fue procesado y no forzar recálculo
        if (periodData.status === 'completed' && !force_recalculate) {
            await client.query('ROLLBACK');
            return res.status(400).json({ 
                error: 'Período ya procesado. Use force_recalculate=true para recalcular' 
            });
        }
        
        // Marcar como procesando
        await client.query(`
            UPDATE payroll_periods 
            SET status = 'processing', updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
        `, [id]);
        
        const { start_date, end_date } = periodData;
        const processedEmployees = [];
        const errors = [];
        const warnings = [];
        let totalLaw114_1Savings = 0;
        let totalFSPContributions = 0;
        
        // Procesar cada empleado con lógica 2025
        for (const employee of personnel.rows) {
            try {
                // Obtener horas trabajadas con detalle tipo de horas
                const timeEntries = await client.query(`
                    SELECT 
                        SUM(te.hours_worked) as regular_hours,
                        SUM(te.overtime_hours) as overtime_hours,
                        SUM(te.total_pay) as total_direct_pay,
                        
                        -- Análisis tipo de horas
                        SUM(CASE WHEN te.overtime_type = 'nocturna' THEN te.overtime_hours ELSE 0 END) as nocturnal_hours,
                        SUM(CASE WHEN te.is_holiday = true THEN te.overtime_hours ELSE 0 END) as holiday_hours,
                        SUM(CASE WHEN te.is_sunday = true THEN te.overtime_hours ELSE 0 END) as sunday_hours,
                        
                        -- Centro de trabajo más frecuente
                        MODE() WITHIN GROUP (ORDER BY te.work_site_id) as primary_work_site
                        
                    FROM time_entries te
                    WHERE te.personnel_id = $1 
                    AND te.work_date BETWEEN $2 AND $3
                `, [employee.id, start_date, end_date]);
                
                const hours = timeEntries.rows[0] || { 
                    regular_hours: 0, 
                    overtime_hours: 0, 
                    total_direct_pay: 0 
                };
                
                // Información empresa para Ley 114-1
                const companyInfo = {
                    qualifies_law_114_1: employee.qualifies_law_114_1 || false,
                    is_juridica: employee.is_juridica || true,
                    employee_count: employee.employee_count || 1
                };
                
                // Información centro de trabajo para ARL
                const workSiteInfo = {
                    arl_risk_class: employee.work_site_arl_class,
                    arl_rate: employee.work_site_arl_rate,
                    name: employee.work_site_name
                };
                
                // Calcular nómina 2025 completa
                const nomina = calcularNominaCompleta2025(
                    employee, 
                    hours, 
                    companyInfo, 
                    workSiteInfo,
                    { year: periodData.year || 2025 }
                );
                
                // Validar cálculos legales
                const validacion = validarCalculosLegales2025(nomina);
                
                // Acumular errores y warnings
                if (!validacion.esValido) {
                    errors.push({
                        employee: employee.name,
                        errors: validacion.errores
                    });
                }
                
                if (validacion.warnings.length > 0) {
                    warnings.push({
                        employee: employee.name,
                        warnings: validacion.warnings
                    });
                }
                
                // Acumular estadísticas
                if (nomina.aplicaLey114_1) {
                    const saved = (nomina.salarioTotal * COLOMBIA_PAYROLL_2025.aportes.salud) +
                                 (nomina.salarioTotal * COLOMBIA_PAYROLL_2025.parafiscales.sena) +
                                 (nomina.salarioTotal * COLOMBIA_PAYROLL_2025.parafiscales.icbf);
                    totalLaw114_1Savings += saved;
                }
                
                if (nomina.fspCalculado > 0) {
                    totalFSPContributions += nomina.fspCalculado;
                }
                
                // Limpiar detalles anteriores si es recálculo
                if (force_recalculate) {
                    await client.query(`
                        DELETE FROM payroll_details 
                        WHERE payroll_period_id = $1 AND personnel_id = $2
                    `, [id, employee.id]);
                }
                
                // Insertar detalle nómina 2025
                await client.query(`
                    INSERT INTO payroll_details (
                        payroll_period_id, personnel_id, 
                        regular_hours, overtime_hours, base_salary,
                        regular_pay, overtime_pay, transport_allowance, connectivity_allowance,
                        
                        -- Deducciones empleado
                        health_employee, pension_employee, fsp_employee, solidarity_contribution, withholding_tax,
                        
                        -- Aportes patronales  
                        health_employer, pension_employer, arl, 
                        severance, severance_interest, service_bonus, vacation,
                        
                        -- Parafiscales
                        sena, icbf, compensation_fund,
                        
                        -- Información legal 2025
                        law_114_1_applied, arl_work_site, dotacion_value
                    ) VALUES (
                        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
                        $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27
                    )
                `, [
                    // Básicos
                    id, employee.id, 
                    nomina.horasRegulares || 0, 
                    nomina.horasExtra || 0,
                    nomina.salarioBase,
                    nomina.salarioRegular,
                    nomina.salarioExtra,
                    nomina.auxilioTransporte,
                    nomina.auxilioConectividad, // NUEVO 2025
                    
                    // Deducciones empleado
                    nomina.deducciones.salud,
                    nomina.deducciones.pension,
                    nomina.deducciones.fsp, // NUEVO 2025
                    nomina.deducciones.solidaridad,
                    nomina.deducciones.retencionFuente,
                    
                    // Aportes empleador
                    nomina.aportes.salud, // Puede ser 0 con Ley 114-1
                    nomina.aportes.pension,
                    nomina.aportes.arl,
                    nomina.aportes.cesantias,
                    nomina.aportes.interesesCesantias,
                    nomina.aportes.prima,
                    nomina.aportes.vacaciones,
                    
                    // Parafiscales (pueden ser 0 con Ley 114-1)
                    nomina.parafiscales.sena,
                    nomina.parafiscales.icbf,
                    nomina.parafiscales.cajas,
                    
                    // Info legal
                    nomina.aplicaLey114_1,
                    hours.primary_work_site,
                    0 // dotacion_value - por implementar
                ]);
                
                processedEmployees.push({
                    employee: employee.name,
                    netPay: nomina.netoAPagar,
                    employerCost: nomina.costoTotalEmpleador,
                    law114_1Applied: nomina.aplicaLey114_1,
                    fspContribution: nomina.fspCalculado,
                    arl_class: nomina.claseARL
                });
                
            } catch (empError) {
                errors.push({
                    employee: employee.name,
                    error: empError.message
                });
            }
        }
        
        // Marcar período como completado
        await client.query(`
            UPDATE payroll_periods 
            SET status = 'completed', processed_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
        `, [id]);
        
        await client.query('COMMIT');
        
        res.json({
            message: 'Nómina 2025 procesada exitosamente',
            stats: {
                processedEmployees: processedEmployees.length,
                errorCount: errors.length,
                warningCount: warnings.length,
                totalLaw114_1Savings: totalLaw114_1Savings,
                totalFSPContributions: totalFSPContributions
            },
            details: {
                processed: processedEmployees,
                errors,
                warnings
            },
            compliance2025: {
                law_114_1_employees: processedEmployees.filter(e => e.law114_1Applied).length,
                fsp_employees: processedEmployees.filter(e => e.fspContribution > 0).length,
                total_savings: totalLaw114_1Savings,
                average_employer_cost: processedEmployees.reduce((sum, e) => sum + e.employerCost, 0) / processedEmployees.length
            }
        });
        
    } catch (error) {
        await client.query('ROLLBACK');
        
        // Marcar período como error
        await client.query(`
            UPDATE payroll_periods 
            SET status = 'draft', updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
        `, [req.params.id]);
        
        res.status(500).json({ 
            error: error.message,
            details: 'Error durante procesamiento nómina 2025'
        });
    } finally {
        client.release();
    }
});

// =====================================================
// SIMULADOR NÓMINA 2025
// =====================================================

// Simular cálculo nómina sin guardar
router.post('/simulate-2025', async (req, res) => {
    try {
        const { 
            personnel_id, 
            hours = {}, 
            company_qualifies_law_114_1 = false,
            work_site_arl_class = 'V',
            year = 2025 
        } = req.body;
        
        if (!personnel_id) {
            return res.status(400).json({ error: 'personnel_id es requerido' });
        }
        
        // Obtener datos del empleado
        const employee = await db.query(`
            SELECT p.*, c.qualifies_law_114_1, c.is_juridica, c.employee_count
            FROM personnel p
            LEFT JOIN clients c ON p.client_id = c.id
            WHERE p.id = $1
        `, [personnel_id]);
        
        if (employee.rows.length === 0) {
            return res.status(404).json({ error: 'Empleado no encontrado' });
        }
        
        const employeeData = employee.rows[0];
        
        // Configurar empresa (usar parámetros o datos BD)
        const companyInfo = {
            qualifies_law_114_1: company_qualifies_law_114_1 || employeeData.qualifies_law_114_1,
            is_juridica: true,
            employee_count: 5 // Default para simulación
        };
        
        // Configurar centro trabajo
        const workSiteInfo = {
            arl_risk_class: work_site_arl_class
        };
        
        // Calcular nómina 2025
        const nomina = calcularNominaCompleta2025(employeeData, hours, companyInfo, workSiteInfo, { year });
        
        // Validar cálculos
        const validacion = validarCalculosLegales2025(nomina);
        
        // Comparación vs sistema anterior (2024)
        const { calcularNominaCompleta } = require('../utils/payroll-colombia');
        const nomina2024 = calcularNominaCompleta(employeeData, hours);
        
        const comparison = {
            cost_difference: nomina.costoTotalEmpleador - nomina2024.costoTotalEmpleador,
            net_pay_difference: nomina.netoAPagar - nomina2024.netoAPagar,
            fsp_new_contribution: nomina.fspCalculado,
            law_114_1_savings: nomina.aplicaLey114_1 ? 
                (nomina2024.aportes.salud + nomina2024.parafiscales.sena + nomina2024.parafiscales.icbf) : 0
        };
        
        res.json({
            employee: employeeData.name,
            simulation_year: year,
            calculation_2025: nomina,
            validation: validacion,
            comparison_vs_2024: comparison,
            recommendations: generateRecommendations(nomina, validacion),
            legal_references: {
                smmlv_2025: COLOMBIA_PAYROLL_2025.salarioMinimo,
                auxilio_transporte_2025: COLOMBIA_PAYROLL_2025.auxilioTransporte,
                law_114_1_active: COLOMBIA_PAYROLL_2025.ley114_1.enabled,
                fsp_active: COLOMBIA_PAYROLL_2025.fsp.enabled
            }
        });
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// =====================================================
// REPORTES 2025
// =====================================================

// Resumen ejecutivo con análisis 2025
router.get('/periods/:id/summary-2025', async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await db.query(`
            WITH payroll_2025_summary AS (
                SELECT 
                    -- Conteos básicos
                    COUNT(DISTINCT pd.personnel_id) as total_employees,
                    SUM(pd.total_income) as total_income,
                    SUM(pd.total_deductions) as total_deductions,
                    SUM(pd.net_pay) as total_net_pay,
                    SUM(pd.total_employer_cost) as total_employer_cost,
                    
                    -- Análisis 2025 específico
                    COUNT(CASE WHEN pd.law_114_1_applied = true THEN 1 END) as employees_with_law_114_1,
                    COUNT(CASE WHEN pd.fsp_employee > 0 THEN 1 END) as employees_with_fsp,
                    
                    -- Ahorros y contribuciones nuevas
                    SUM(CASE WHEN pd.law_114_1_applied = true 
                            THEN (pd.regular_pay + pd.overtime_pay) * 0.135 -- 8.5% + 2% + 3% 
                            ELSE 0 END) as total_law_114_1_savings,
                    SUM(pd.fsp_employee) as total_fsp_contributions,
                    SUM(pd.connectivity_allowance) as total_connectivity_allowance,
                    
                    -- Por clase ARL
                    COUNT(CASE WHEN p.arl_risk_class = 'V' THEN 1 END) as employees_arl_class_v,
                    COUNT(CASE WHEN p.arl_risk_class = 'IV' THEN 1 END) as employees_arl_class_iv,
                    COUNT(CASE WHEN p.arl_risk_class = 'I' THEN 1 END) as employees_arl_class_i,
                    
                    -- Por departamento con análisis 2025
                    COUNT(CASE WHEN p.department = 'soldadura' THEN 1 END) as soldadura_employees,
                    COUNT(CASE WHEN p.department = 'construccion' THEN 1 END) as construccion_employees,
                    COUNT(CASE WHEN p.department = 'administracion' THEN 1 END) as admin_employees,
                    
                    SUM(CASE WHEN p.department = 'soldadura' THEN pd.total_employer_cost ELSE 0 END) as soldadura_cost,
                    SUM(CASE WHEN p.department = 'construccion' THEN pd.total_employer_cost ELSE 0 END) as construccion_cost,
                    SUM(CASE WHEN p.department = 'administracion' THEN pd.total_employer_cost ELSE 0 END) as admin_cost
                    
                FROM payroll_details pd
                JOIN personnel p ON pd.personnel_id = p.id
                WHERE pd.payroll_period_id = $1
            )
            SELECT 
                pis.*,
                
                -- Indicadores financieros
                ROUND((total_employer_cost / total_employees), 2) as avg_cost_per_employee,
                ROUND((total_fsp_contributions / total_income * 100), 2) as fsp_percentage,
                ROUND((total_law_114_1_savings / total_employer_cost * 100), 2) as law_114_1_savings_percentage,
                
                -- Análisis cumplimiento
                ROUND((employees_with_law_114_1::DECIMAL / total_employees * 100), 2) as law_114_1_coverage_percentage,
                ROUND((employees_with_fsp::DECIMAL / total_employees * 100), 2) as fsp_coverage_percentage
                
            FROM payroll_2025_summary pis
        `, [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'No hay datos para este período' });
        }
        
        const summary = result.rows[0];
        
        res.json({
            period_id: id,
            summary_2025: summary,
            compliance_status: {
                law_114_1: {
                    enabled: true,
                    employees_benefited: summary.employees_with_law_114_1,
                    total_savings: summary.total_law_114_1_savings,
                    coverage: summary.law_114_1_coverage_percentage + '%'
                },
                fsp: {
                    enabled: true,
                    employees_contributing: summary.employees_with_fsp,
                    total_contributions: summary.total_fsp_contributions,
                    coverage: summary.fsp_coverage_percentage + '%'
                },
                arl_distribution: {
                    class_v: summary.employees_arl_class_v,
                    class_iv: summary.employees_arl_class_iv,
                    class_i: summary.employees_arl_class_i
                }
            },
            recommendations_2025: generatePeriodRecommendations(summary)
        });
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// =====================================================
// PILA 2025 OFICIAL
// =====================================================

// Generar planilla PILA formato 2025
router.get('/periods/:id/pila-2025', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Obtener datos completos para PILA
        const employees = await db.query(`
            SELECT 
                p.*, pd.*,
                pp.year, pp.month
            FROM payroll_details pd
            JOIN personnel p ON pd.personnel_id = p.id
            JOIN payroll_periods pp ON pd.payroll_period_id = pp.id
            WHERE pd.payroll_period_id = $1
            ORDER BY p.name
        `, [id]);
        
        if (employees.rows.length === 0) {
            return res.status(404).json({ error: 'No hay empleados procesados para este período' });
        }
        
        // Obtener novedades del período
        const novelties = await db.query(`
            SELECT * FROM pila_novelties
            WHERE payroll_period_id = $1
            ORDER BY personnel_id, start_date
        `, [id]);
        
        const period = { 
            year: employees.rows[0].year, 
            month: employees.rows[0].month 
        };
        
        // Generar PILA 2025
        const pilaData = generarPILA2025(employees.rows, period, novelties.rows);
        
        res.json({
            period: `${period.year}-${period.month.toString().padStart(2, '0')}`,
            generation_date: new Date().toISOString(),
            pila_version: '2025.1',
            employees_count: employees.rows.length,
            novelties_count: novelties.rows.length,
            
            // Datos PILA completos
            pila_data: pilaData,
            
            // Resumen cumplimiento 2025
            compliance_summary: {
                law_114_1_employees: pilaData.empleados.filter(e => e.aplicaLey114_1).length,
                fsp_employees: pilaData.empleados.filter(e => e.fspEmpleado > 0).length,
                total_savings: pilaData.totales.ahorroLey114_1,
                connectivity_allowances: pilaData.empleados.filter(e => e.auxilioConectividad > 0).length
            },
            
            // Archivos para generar (simulado)
            files_to_generate: [
                {
                    name: `PILA_HYR_${period.year}${period.month.toString().padStart(2, '0')}.xml`,
                    type: 'XML_PILA_2025',
                    description: 'Archivo XML para cargue PILA oficial'
                },
                {
                    name: `Resumen_PILA_${period.year}${period.month.toString().padStart(2, '0')}.pdf`,
                    type: 'PDF_SUMMARY',
                    description: 'Resumen ejecutivo PILA'
                }
            ]
        });
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// =====================================================
// FUNCIONES AUXILIARES
// =====================================================

function generateRecommendations(nomina, validacion) {
    const recommendations = [];
    
    if (!nomina.aplicaLey114_1 && nomina.ibcEnSMMLV < 10) {
        recommendations.push({
            type: 'OPPORTUNITY',
            message: 'Empleado podría calificar para exoneración Ley 114-1 si empresa cumple requisitos',
            potential_savings: nomina.salarioTotal * 0.135 // 8.5% + 2% + 3%
        });
    }
    
    if (nomina.aplicaFSP && nomina.fspCalculado === 0) {
        recommendations.push({
            type: 'COMPLIANCE',
            message: 'Empleado debe cotizar FSP - verificar configuración',
            required_contribution: nomina.salarioTotal * 0.01 // Mínimo 1%
        });
    }
    
    if (!nomina.cumpleAuxilioTransporte && nomina.salarioBase <= (2 * COLOMBIA_PAYROLL_2025.salarioMinimo)) {
        recommendations.push({
            type: 'BENEFIT',
            message: 'Empleado califica para auxilio de transporte',
            additional_benefit: COLOMBIA_PAYROLL_2025.auxilioTransporte
        });
    }
    
    return recommendations;
}

function generatePeriodRecommendations(summary) {
    const recommendations = [];
    
    if (summary.law_114_1_coverage_percentage < 50) {
        recommendations.push({
            type: 'OPTIMIZATION',
            message: 'Baja cobertura Ley 114-1 - revisar elegibilidad empleados',
            potential_savings: summary.total_employer_cost * 0.10 // Estimado
        });
    }
    
    if (summary.fsp_coverage_percentage < summary.law_114_1_coverage_percentage) {
        recommendations.push({
            type: 'COMPLIANCE',
            message: 'Verificar que empleados elegibles estén cotizando FSP correctamente'
        });
    }
    
    return recommendations;
}

module.exports = router;