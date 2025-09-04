// =====================================================
// SCRIPT DE STARTUP COMPLETO - SISTEMA HYR
// Configura toda la infraestructura empresarial
// =====================================================

const { Pool } = require('pg');
const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class HYRStartup {
    constructor() {
        this.db = new Pool({
            host: 'localhost',
            database: 'hyr_construction',
            user: 'postgres',
            password: 'LilHell76&0',
            port: 5432,
        });
    }

    async log(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString('es-CO');
        const icons = {
            info: '📋',
            success: '✅',
            error: '❌',
            warning: '⚠️',
            progress: '🔄'
        };
        
        console.log(`${icons[type]} [${timestamp}] ${message}`);
    }

    async checkPrerequisites() {
        await this.log('Verificando prerequisitos del sistema...', 'progress');
        
        // Verificar PostgreSQL
        try {
            await this.db.query('SELECT 1');
            await this.log('PostgreSQL conectado correctamente', 'success');
        } catch (error) {
            await this.log('Error: PostgreSQL no disponible. Verifica que esté ejecutándose.', 'error');
            throw new Error('PostgreSQL requerido');
        }

        // Verificar Node.js
        try {
            const nodeVersion = execSync('node --version', { encoding: 'utf8' }).trim();
            await this.log(`Node.js disponible: ${nodeVersion}`, 'success');
        } catch (error) {
            await this.log('Error: Node.js no encontrado', 'error');
            throw new Error('Node.js requerido');
        }

        // Verificar directorios
        const backendDir = path.join(__dirname, 'backend');
        const frontendDir = path.join(__dirname, 'construction-admin');
        
        if (!fs.existsSync(backendDir)) {
            await this.log('Error: Directorio backend no encontrado', 'error');
            throw new Error('Estructura de proyecto incorrecta');
        }
        
        if (!fs.existsSync(frontendDir)) {
            await this.log('Error: Directorio frontend no encontrado', 'error');
            throw new Error('Estructura de proyecto incorrecta');
        }

        await this.log('Todos los prerequisitos verificados', 'success');
    }

    async setupDatabase() {
        await this.log('Configurando base de datos empresarial...', 'progress');
        
        try {
            // Verificar si ya hay datos
            const clientCount = await this.db.query('SELECT COUNT(*) FROM clients');
            
            if (parseInt(clientCount.rows[0].count) === 0) {
                await this.log('Cargando datos empresariales iniciales...', 'progress');
                
                // Cargar seeds
                const { loadSeeds } = require('./backend/load-seeds.js');
                await loadSeeds();
                
                await this.log('Datos empresariales cargados exitosamente', 'success');
            } else {
                await this.log('Base de datos ya contiene datos empresariales', 'success');
            }

            // Mostrar estadísticas
            const stats = await this.db.query(`
                SELECT 
                    (SELECT COUNT(*) FROM clients) as clientes,
                    (SELECT COUNT(*) FROM personnel WHERE status = 'active') as empleados_activos,
                    (SELECT COUNT(*) FROM projects WHERE status = 'in_progress') as proyectos_activos,
                    (SELECT COUNT(*) FROM time_entries) as registros_horas,
                    (SELECT COUNT(*) FROM expenses) as gastos_registrados
            `);
            
            const data = stats.rows[0];
            await this.log(`📊 Datos disponibles: ${data.clientes} clientes, ${data.empleados_activos} empleados activos, ${data.proyectos_activos} proyectos activos`, 'info');
            
        } catch (error) {
            await this.log(`Error configurando base de datos: ${error.message}`, 'error');
            throw error;
        }
    }

    async installDependencies() {
        await this.log('Verificando dependencias del proyecto...', 'progress');
        
        // Backend dependencies
        const backendPackage = path.join(__dirname, 'backend', 'package.json');
        if (fs.existsSync(backendPackage)) {
            try {
                execSync('npm install', { 
                    cwd: path.join(__dirname, 'backend'),
                    stdio: 'pipe'
                });
                await this.log('Dependencias backend instaladas', 'success');
            } catch (error) {
                await this.log('Instalando dependencias backend...', 'progress');
                execSync('npm install express pg cors', { 
                    cwd: path.join(__dirname, 'backend'),
                    stdio: 'inherit'
                });
                await this.log('Dependencias backend instaladas', 'success');
            }
        }

        // Frontend dependencies
        const frontendPackage = path.join(__dirname, 'construction-admin', 'package.json');
        if (fs.existsSync(frontendPackage)) {
            try {
                execSync('npm list', { 
                    cwd: path.join(__dirname, 'construction-admin'),
                    stdio: 'pipe'
                });
                await this.log('Dependencias frontend verificadas', 'success');
            } catch (error) {
                await this.log('Verificando dependencias frontend (puede tomar un momento)...', 'progress');
            }
        }
    }

    async processPayroll() {
        await this.log('Procesando nómina colombiana septiembre 2024...', 'progress');
        
        try {
            // Verificar si ya fue procesada
            const payrollCheck = await this.db.query(`
                SELECT status FROM payroll_periods WHERE id = 'period-202409'
            `);
            
            if (payrollCheck.rows.length > 0 && payrollCheck.rows[0].status === 'completed') {
                await this.log('Nómina septiembre 2024 ya procesada', 'success');
                return;
            }

            // Procesar nómina usando la función del backend
            const { calcularNominaCompleta } = require('./backend/utils/payroll-colombia.js');
            
            // Obtener empleados activos
            const personnel = await this.db.query(`
                SELECT * FROM personnel WHERE status = 'active'
            `);

            let totalProcessed = 0;
            for (const employee of personnel.rows) {
                // Obtener horas trabajadas en septiembre
                const timeEntries = await this.db.query(`
                    SELECT 
                        SUM(hours_worked) as regular_hours,
                        SUM(overtime_hours) as overtime_hours,
                        SUM(total_pay) as total_pay
                    FROM time_entries 
                    WHERE personnel_id = $1 
                    AND work_date BETWEEN '2024-09-01' AND '2024-09-30'
                `, [employee.id]);
                
                const hours = timeEntries.rows[0];
                if (hours && hours.regular_hours > 0) {
                    const nomina = calcularNominaCompleta(employee, hours);
                    
                    // Insertar o actualizar detalle de nómina
                    await this.db.query(`
                        INSERT INTO payroll_details (
                            payroll_period_id, personnel_id, regular_hours, overtime_hours,
                            base_salary, regular_pay, overtime_pay, transport_allowance,
                            health_employee, pension_employee, health_employer, 
                            pension_employer, arl, severance, service_bonus, 
                            vacation, sena, icbf, compensation_fund
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
                        ON CONFLICT (payroll_period_id, personnel_id) DO UPDATE SET
                            regular_hours = EXCLUDED.regular_hours,
                            overtime_hours = EXCLUDED.overtime_hours,
                            regular_pay = EXCLUDED.regular_pay,
                            overtime_pay = EXCLUDED.overtime_pay,
                            transport_allowance = EXCLUDED.transport_allowance,
                            health_employee = EXCLUDED.health_employee,
                            pension_employee = EXCLUDED.pension_employee,
                            health_employer = EXCLUDED.health_employer,
                            pension_employer = EXCLUDED.pension_employer,
                            arl = EXCLUDED.arl,
                            severance = EXCLUDED.severance,
                            service_bonus = EXCLUDED.service_bonus,
                            vacation = EXCLUDED.vacation,
                            sena = EXCLUDED.sena,
                            icbf = EXCLUDED.icbf,
                            compensation_fund = EXCLUDED.compensation_fund
                    `, [
                        'period-202409', employee.id, hours.regular_hours || 0, hours.overtime_hours || 0,
                        nomina.salarioBase, nomina.salarioRegular, nomina.salarioExtra, 
                        nomina.auxilioTransporte, nomina.deducciones.salud, nomina.deducciones.pension,
                        nomina.aportes.salud, nomina.aportes.pension, nomina.aportes.arl,
                        nomina.aportes.cesantias, nomina.aportes.prima, nomina.aportes.vacaciones,
                        nomina.parafiscales.sena, nomina.parafiscales.icbf, nomina.parafiscales.cajas
                    ]);
                    
                    totalProcessed++;
                }
            }
            
            // Marcar período como completado
            await this.db.query(`
                UPDATE payroll_periods 
                SET status = 'completed', processed_at = CURRENT_TIMESTAMP
                WHERE id = 'period-202409'
            `);
            
            await this.log(`Nómina procesada para ${totalProcessed} empleados`, 'success');
            
        } catch (error) {
            await this.log(`Error procesando nómina: ${error.message}`, 'error');
            throw error;
        }
    }

    async startServices() {
        await this.log('Iniciando servicios del sistema...', 'progress');
        
        // Iniciar backend
        const backendProcess = spawn('node', ['server.js'], {
            cwd: path.join(__dirname, 'backend'),
            stdio: 'pipe'
        });
        
        // Esperar a que el backend esté listo
        await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Timeout iniciando backend'));
            }, 10000);
            
            backendProcess.stdout.on('data', (data) => {
                const output = data.toString();
                if (output.includes('corriendo en puerto')) {
                    clearTimeout(timeout);
                    resolve();
                }
            });
            
            backendProcess.stderr.on('data', (data) => {
                console.error(data.toString());
            });
        });
        
        await this.log('Backend API iniciado en puerto 3001', 'success');
        
        // Mensaje de siguiente paso
        await this.log('Sistema listo para usar!', 'success');
        console.log('\n' + '='.repeat(60));
        console.log('🚀 SISTEMA HYR CONSTRUCTORA & SOLDADURA INICIADO');
        console.log('='.repeat(60));
        console.log('📡 Backend API: http://localhost:3001');
        console.log('📊 Dashboard: http://localhost:3000/dashboard-api (después de iniciar frontend)');
        console.log('\n📋 PARA INICIAR FRONTEND:');
        console.log('   cd construction-admin');
        console.log('   npm run dev');
        console.log('\n📈 ENDPOINTS PRINCIPALES:');
        console.log('   • GET  /api/reports/executive-dashboard');
        console.log('   • GET  /api/reports/project-profitability');  
        console.log('   • GET  /api/personnel');
        console.log('   • GET  /api/projects');
        console.log('   • POST /api/payroll/periods/{id}/process');
        console.log('\n' + '='.repeat(60));
        
        return backendProcess;
    }

    async runFullStartup() {
        try {
            await this.checkPrerequisites();
            await this.installDependencies();
            await this.setupDatabase();
            await this.processPayroll();
            const backendProcess = await this.startServices();
            
            // Mantener proceso activo
            process.on('SIGINT', async () => {
                await this.log('Cerrando sistema...', 'warning');
                backendProcess.kill();
                await this.db.end();
                process.exit(0);
            });
            
        } catch (error) {
            await this.log(`Error crítico: ${error.message}`, 'error');
            await this.db.end();
            process.exit(1);
        }
    }
}

// Ejecutar startup si se llama directamente
if (require.main === module) {
    const startup = new HYRStartup();
    startup.runFullStartup();
}

module.exports = { HYRStartup };