// =====================================================
// NÓMINA ELECTRÓNICA DIAN - CUNE Y XML STUB
// HYR CONSTRUCTORA & SOLDADURA
// =====================================================

const express = require('express');
const router = express.Router();
const { db } = require('../database/connection');
const { dianAuditLogger, logAuditEvent } = require('../middleware/audit-logger');
const { generateCUNE, simulateDIANValidation } = require('../utils/dian-ids');
const { loadTaxConfig } = require('../utils/tax-loader');

// =====================================================
// GENERACIÓN Y GESTIÓN DE NÓMINA ELECTRÓNICA
// =====================================================

/**
 * POST /api/dian/payroll/:period/generate
 * Genera documentos de nómina electrónica para un período
 */
router.post('/payroll/:period/generate', dianAuditLogger('dian_payroll_documents'), async (req, res) => {
    try {
        const { period } = req.params;
        const { employees = [], year = new Date().getFullYear() } = req.body;
        
        // Validar formato de período (YYYY-MM)
        const periodRegex = /^\d{4}-\d{2}$/;
        if (!periodRegex.test(period)) {
            return res.status(400).json({
                error: 'Formato de período inválido. Use YYYY-MM (ej: 2025-09)'
            });
        }
        
        // Validar empleados
        if (!employees.length) {
            return res.status(400).json({
                error: 'Lista de empleados es requerida y no puede estar vacía'
            });
        }
        
        // Validar estructura de empleados
        for (const emp of employees) {
            if (!emp.name || !emp.document_number || !emp.base_salary) {
                return res.status(400).json({
                    error: 'Cada empleado debe tener: name, document_number, base_salary'
                });
            }
        }
        
        // Obtener configuración empresarial
        const companyResult = await db.query('SELECT * FROM company_settings LIMIT 1');
        if (companyResult.rows.length === 0) {
            return res.status(500).json({
                error: 'Configuración empresarial no encontrada'
            });
        }
        const companyConfig = companyResult.rows[0];
        
        // Cargar configuración tributaria
        const taxConfig = loadTaxConfig(year);
        
        // Verificar si ya existe nómina para el período
        const existingPayroll = await db.query(`
            SELECT employee_document FROM dian_payroll_documents WHERE period = $1
        `, [period]);
        
        if (existingPayroll.rows.length > 0) {
            return res.status(409).json({
                error: `Ya existe nómina electrónica generada para el período ${period}`,
                existing_employees: existingPayroll.rows.map(r => r.employee_document)
            });
        }
        
        const processedEmployees = [];
        const errors = [];
        
        // Procesar cada empleado
        for (const employee of employees) {
            try {
                const {
                    name,
                    document_number,
                    base_salary,
                    worked_days = 30
                } = employee;
                
                // Generar CUNE
                const cune = generateCUNE({
                    period,
                    employeeDocument: document_number,
                    employeeName: name,
                    baseSalary: base_salary,
                    workedDays: worked_days
                });
                
                // Calcular deducciones básicas (simplificado para MVP)
                const healthEmployee = base_salary * 0.04;
                const pensionEmployee = base_salary * 0.04;
                const solidarityFund = base_salary > (4 * taxConfig.payroll.minimum_wage) ? 
                    base_salary * 0.01 : 0;
                
                // Calcular aportes patronales
                const healthEmployer = base_salary * 0.085;
                const pensionEmployer = base_salary * 0.12;
                const arl = base_salary * 0.06960; // Clase V construcción
                const severance = base_salary * 0.0833;
                const servicePrima = base_salary * 0.0833;
                const vacation = base_salary * 0.0417;
                const severanceInterest = severance * 0.12;
                
                // Parafiscales
                const sena = base_salary * 0.02;
                const icbf = base_salary * 0.03;
                const compensationBox = base_salary * 0.04;
                
                // Auxilio de transporte
                const transportAllowance = base_salary <= (2 * taxConfig.payroll.minimum_wage) ?
                    taxConfig.payroll.transport_allowance : 0;
                
                // Generar XML stub
                const xmlContent = generatePayrollXML({
                    cune,
                    period,
                    employer: companyConfig,
                    employee: {
                        name,
                        document_number,
                        base_salary,
                        worked_days
                    },
                    calculations: {
                        healthEmployee,
                        pensionEmployee,
                        solidarityFund,
                        healthEmployer,
                        pensionEmployer,
                        arl,
                        severance,
                        servicePrima,
                        vacation,
                        severanceInterest,
                        sena,
                        icbf,
                        compensationBox,
                        transportAllowance
                    }
                });
                
                // Simular validación DIAN
                const dianResponse = simulateDIANValidation('CUNE');
                
                // Guardar en base de datos
                const result = await db.query(`
                    INSERT INTO dian_payroll_documents (
                        period, employee_name, employee_document, base_salary, worked_days,
                        cune, xml_content, dian_status
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                    RETURNING *
                `, [
                    period, name, document_number, base_salary, worked_days,
                    cune, xmlContent, dianResponse.status
                ]);
                
                processedEmployees.push({
                    ...result.rows[0],
                    dian_response: dianResponse,
                    calculations: {
                        healthEmployee: Math.round(healthEmployee),
                        pensionEmployee: Math.round(pensionEmployee),
                        solidarityFund: Math.round(solidarityFund),
                        transportAllowance: Math.round(transportAllowance),
                        totalDeductions: Math.round(healthEmployee + pensionEmployee + solidarityFund),
                        netPay: Math.round(base_salary + transportAllowance - healthEmployee - pensionEmployee - solidarityFund),
                        employerCost: Math.round(
                            base_salary + transportAllowance + healthEmployer + pensionEmployer + 
                            arl + severance + servicePrima + vacation + severanceInterest + 
                            sena + icbf + compensationBox
                        )
                    }
                });
                
                // Log auditoría por empleado
                await logAuditEvent({
                    actor: 'USER',
                    eventType: 'CREATE',
                    refTable: 'dian_payroll_documents',
                    refId: result.rows[0].id,
                    payload: {
                        action: 'payroll_document_generated',
                        period,
                        employee_name: name,
                        employee_document: document_number,
                        cune,
                        dian_status: dianResponse.status
                    }
                });
                
            } catch (employeeError) {
                console.error(`❌ Error procesando empleado ${employee.name}:`, employeeError);
                errors.push({
                    employee: employee.name,
                    document: employee.document_number,
                    error: employeeError.message
                });
            }
        }
        
        res.status(201).json({
            success: true,
            message: `Nómina electrónica generada para período ${period}`,
            data: {
                period,
                total_employees: employees.length,
                processed_employees: processedEmployees.length,
                errors_count: errors.length,
                processed: processedEmployees,
                errors: errors,
                summary: {
                    total_payroll: processedEmployees.reduce((sum, emp) => sum + emp.calculations.netPay, 0),
                    total_employer_cost: processedEmployees.reduce((sum, emp) => sum + emp.calculations.employerCost, 0),
                    average_salary: processedEmployees.length > 0 ? 
                        processedEmployees.reduce((sum, emp) => sum + emp.base_salary, 0) / processedEmployees.length : 0
                }
            }
        });
        
    } catch (error) {
        console.error('❌ Error generando nómina electrónica:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            details: error.message
        });
    }
});

/**
 * DELETE /api/dian/payroll/:period
 * Elimina documentos de nómina electrónica para un período
 * ADVERTENCIA: Esta operación es irreversible y debe usarse con precaución
 */
router.delete('/payroll/:period', dianAuditLogger('dian_payroll_documents'), async (req, res) => {
    try {
        const { period } = req.params;
        
        // Validar formato de período
        const periodRegex = /^\d{4}-\d{2}$/;
        if (!periodRegex.test(period)) {
            return res.status(400).json({
                error: 'Formato de período inválido. Use YYYY-MM (ej: 2025-09)'
            });
        }
        
        // Verificar que existen documentos para el período
        const existingPayroll = await db.query(`
            SELECT id, employee_name, employee_document, cune FROM dian_payroll_documents WHERE period = $1
        `, [period]);
        
        if (existingPayroll.rows.length === 0) {
            return res.status(404).json({
                error: `No se encontraron documentos de nómina para el período ${period}`
            });
        }
        
        // Eliminar todos los documentos del período
        const result = await db.query(`
            DELETE FROM dian_payroll_documents WHERE period = $1
            RETURNING id, employee_name, employee_document, cune
        `, [period]);
        
        // Log auditoría para cada documento eliminado
        for (const doc of result.rows) {
            await logAuditEvent({
                actor: 'USER',
                eventType: 'DELETE',
                refTable: 'dian_payroll_documents',
                refId: doc.id,
                payload: {
                    action: 'payroll_period_deleted',
                    period,
                    employee_name: doc.employee_name,
                    employee_document: doc.employee_document,
                    cune: doc.cune,
                    reason: 'Regeneración de nómina electrónica'
                }
            });
        }
        
        res.json({
            success: true,
            message: `Nómina electrónica del período ${period} eliminada exitosamente`,
            data: {
                period,
                deleted_documents: result.rows.length,
                deleted_employees: result.rows.map(row => ({
                    id: row.id,
                    employee_name: row.employee_name,
                    employee_document: row.employee_document,
                    cune: row.cune
                }))
            }
        });
        
    } catch (error) {
        console.error('❌ Error eliminando nómina electrónica:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            details: error.message
        });
    }
});

/**
 * GET /api/dian/payroll/:period
 * Lista documentos de nómina electrónica para un período
 */
router.get('/payroll/:period', async (req, res) => {
    try {
        const { period } = req.params;
        
        const result = await db.query(`
            SELECT 
                id, period, employee_name, employee_document, base_salary, worked_days,
                cune, dian_status, created_at
            FROM dian_payroll_documents
            WHERE period = $1
            ORDER BY employee_name
        `, [period]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                error: `No se encontraron documentos de nómina para el período ${period}`
            });
        }
        
        // Calcular resumen
        const summary = {
            total_employees: result.rows.length,
            total_base_salary: result.rows.reduce((sum, row) => sum + parseFloat(row.base_salary), 0),
            status_breakdown: {},
            generated_date: result.rows[0].created_at
        };
        
        // Contar por estado DIAN
        result.rows.forEach(row => {
            summary.status_breakdown[row.dian_status] = 
                (summary.status_breakdown[row.dian_status] || 0) + 1;
        });
        
        res.json({
            success: true,
            data: {
                period,
                documents: result.rows,
                summary
            }
        });
        
    } catch (error) {
        console.error('❌ Error obteniendo nómina electrónica:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            details: error.message
        });
    }
});

/**
 * GET /api/dian/payroll/document/:id
 * Obtiene documento específico de nómina con XML completo
 */
router.get('/payroll/document/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await db.query(`
            SELECT * FROM dian_payroll_documents WHERE id = $1
        `, [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                error: 'Documento de nómina no encontrado'
            });
        }
        
        res.json({
            success: true,
            data: result.rows[0]
        });
        
    } catch (error) {
        console.error('❌ Error obteniendo documento de nómina:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            details: error.message
        });
    }
});

/**
 * POST /api/dian/payroll/document/:id/resend
 * Reenvía documento específico a DIAN (simulado)
 */
router.post('/payroll/document/:id/resend', dianAuditLogger('dian_payroll_documents'), async (req, res) => {
    try {
        const { id } = req.params;
        
        // Verificar que existe el documento
        const document = await db.query('SELECT * FROM dian_payroll_documents WHERE id = $1', [id]);
        if (document.rows.length === 0) {
            return res.status(404).json({ error: 'Documento de nómina no encontrado' });
        }
        
        // Simular nuevo envío a DIAN
        const dianResponse = simulateDIANValidation('CUNE');
        
        // Actualizar estado
        await db.query(`
            UPDATE dian_payroll_documents 
            SET dian_status = $1 
            WHERE id = $2
        `, [dianResponse.status, id]);
        
        await logAuditEvent({
            actor: 'USER',
            eventType: 'UPDATE',
            refTable: 'dian_payroll_documents',
            refId: id,
            payload: {
                action: 'payroll_document_resent_to_dian',
                employee_name: document.rows[0].employee_name,
                period: document.rows[0].period,
                previous_status: document.rows[0].dian_status,
                new_status: dianResponse.status
            }
        });
        
        res.json({
            success: true,
            message: 'Documento de nómina reenviado a DIAN exitosamente',
            data: dianResponse
        });
        
    } catch (error) {
        console.error('❌ Error reenviando documento a DIAN:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            details: error.message
        });
    }
});

/**
 * GET /api/dian/payroll/periods/available
 * Lista períodos disponibles de nómina electrónica
 */
router.get('/payroll/periods/available', async (req, res) => {
    try {
        const result = await db.query(`
            SELECT 
                period,
                COUNT(*) as employee_count,
                SUM(base_salary) as total_payroll,
                MAX(created_at) as generated_date,
                STRING_AGG(DISTINCT dian_status, ', ') as statuses
            FROM dian_payroll_documents
            GROUP BY period
            ORDER BY period DESC
        `);
        
        res.json({
            success: true,
            data: {
                available_periods: result.rows,
                total_periods: result.rows.length,
                current_period: new Date().toISOString().slice(0, 7) // YYYY-MM
            }
        });
        
    } catch (error) {
        console.error('❌ Error listando períodos disponibles:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            details: error.message
        });
    }
});

// =====================================================
// UTILIDAD GENERACIÓN XML NÓMINA
// =====================================================

/**
 * Genera XML stub para documento de nómina electrónica
 * @param {Object} payrollData - Datos del documento de nómina
 * @returns {string} XML generado
 */
function generatePayrollXML(payrollData) {
    const {
        cune,
        period,
        employer,
        employee,
        calculations
    } = payrollData;
    
    const [year, month] = period.split('-');
    
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<NominaIndividual xmlns="dian:gov:co:facturaelectronica:NominaIndividual">
    <InformacionGeneral>
        <Version>V1.0</Version>
        <Ambiente>2</Ambiente>
        <TipoXML>102</TipoXML>
        <CUNE>${cune}</CUNE>
        <EncripCUNE></EncripCUNE>
        <FechaGen>${new Date().toISOString().split('T')[0]}</FechaGen>
        <HoraGen>${new Date().toTimeString().slice(0, 8)}</HoraGen>
        <PeriodoNomina>
            <FechaIngreso>${new Date().toISOString().split('T')[0]}</FechaIngreso>
            <FechaLiquidacionInicio>${year}-${month.padStart(2, '0')}-01</FechaLiquidacionInicio>
            <FechaLiquidacionFin>${year}-${month.padStart(2, '0')}-${new Date(year, month, 0).getDate()}</FechaLiquidacionFin>
            <TiempoLaborado>${employee.worked_days}</TiempoLaborado>
            <FechaGen>${new Date().toISOString().split('T')[0]}</FechaGen>
        </PeriodoNomina>
        <NumeroSecuenciaXML>
            <Numero>1</Numero>
            <Prefijo>NOM</Prefijo>
            <Consecutivo>001</Consecutivo>
        </NumeroSecuenciaXML>
    </InformacionGeneral>
    
    <Empleador>
        <RazonSocial>${employer.company_name}</RazonSocial>
        <NIT>${employer.nit}</NIT>
        <DV>${employer.dv}</DV>
        <Pais>CO</Pais>
        <DepartamentoEstado>11</DepartamentoEstado>
        <MunicipioCiudad>11001</MunicipioCiudad>
        <Direccion>${employer.address || 'Bogotá D.C.'}</Direccion>
    </Empleador>
    
    <Trabajador>
        <TipoTrabajador>01</TipoTrabajador>
        <SubTipoTrabajador>00</SubTipoTrabajador>
        <AltoRiesgoPension>false</AltoRiesgoPension>
        <TipoDocumento>13</TipoDocumento>
        <NumeroDocumento>${employee.document_number}</NumeroDocumento>
        <PrimerApellido>${employee.name.split(' ')[1] || ''}</PrimerApellido>
        <SegundoApellido>${employee.name.split(' ')[2] || ''}</SegundoApellido>
        <PrimerNombre>${employee.name.split(' ')[0] || ''}</PrimerNombre>
        <SegundoNombre>${employee.name.split(' ')[3] || ''}</SegundoNombre>
        <LugarTrabajoPais>CO</LugarTrabajoPais>
        <LugarTrabajoDepartamentoEstado>11</LugarTrabajoDepartamentoEstado>
        <LugarTrabajoMunicipioCiudad>11001</LugarTrabajoMunicipioCiudad>
        <LugarTrabajoOtros>Construcción</LugarTrabajoOtros>
        <SalarioIntegral>false</SalarioIntegral>
        <TipoContrato>1</TipoContrato>
        <Sueldo>${employee.base_salary}</Sueldo>
        <CodigoTrabajador>EMP${employee.document_number}</CodigoTrabajador>
    </Trabajador>
    
    <Pago>
        <Forma>1</Forma>
        <Metodo>1</Metodo>
        <Banco></Banco>
        <TipoCuenta></TipoCuenta>
        <NumeroCuenta></NumeroCuenta>
    </Pago>
    
    <Devengados>
        <Basico>
            <DiasTrabajados>${employee.worked_days}</DiasTrabajados>
            <SueldoTrabajado>${employee.base_salary}</SueldoTrabajado>
        </Basico>
        <Transporte>
            <ViaticoManuAlojS>${calculations.transportAllowance}</ViaticoManuAlojS>
        </Transporte>
    </Devengados>
    
    <Deducciones>
        <Salud>
            <Porcentaje>4.00</Porcentaje>
            <Deduccion>${calculations.healthEmployee}</Deduccion>
        </Salud>
        <FondoPension>
            <Porcentaje>4.00</Porcentaje>
            <Deduccion>${calculations.pensionEmployee}</Deduccion>
        </FondoPension>
        ${calculations.solidarityFund > 0 ? `
        <FondoSP>
            <Porcentaje>1.00</Porcentaje>
            <Deduccion>${calculations.solidarityFund}</Deduccion>
            <DeduccionSP>${calculations.solidarityFund}</DeduccionSP>
        </FondoSP>` : ''}
    </Deducciones>
    
    <ComprobanteTotal>
        <DevengadosTotal>${employee.base_salary + calculations.transportAllowance}</DevengadosTotal>
        <DeduccionesTotal>${calculations.healthEmployee + calculations.pensionEmployee + calculations.solidarityFund}</DeduccionesTotal>
        <ComprobanteTotal>${employee.base_salary + calculations.transportAllowance - calculations.healthEmployee - calculations.pensionEmployee - calculations.solidarityFund}</ComprobanteTotal>
    </ComprobanteTotal>
    
</NominaIndividual>`;
    
    return xml;
}

module.exports = router;