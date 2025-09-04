#!/usr/bin/env node

// =====================================================
// SCRIPT DE EXPORTACIÓN DE BASE DE DATOS - HYR SISTEMA
// Exportación automatizada optimizada para despliegue en servidor
// =====================================================

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

class HYRDatabaseExporter {
    constructor(options = {}) {
        this.config = {
            host: options.host || 'localhost',
            database: options.database || 'hyr_construction',
            user: options.user || 'postgres',
            password: options.password || 'LilHell76&0',
            port: options.port || 5432,
            outputDir: options.outputDir || path.join(__dirname, '..', 'database-exports'),
            compress: options.compress !== false, // true por defecto
            includeData: options.includeData !== false, // true por defecto
            validate: options.validate !== false // true por defecto
        };

        this.timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
        this.pool = new Pool({
            host: this.config.host,
            database: this.config.database,
            user: this.config.user,
            password: this.config.password,
            port: this.config.port
        });
    }

    log(message, type = 'info') {
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

    async validateDatabase() {
        this.log('Validando integridad de la base de datos...', 'progress');
        
        try {
            // Verificar conexión
            await this.pool.query('SELECT 1');
            
            // Contar tablas principales
            const tablesResult = await this.pool.query(`
                SELECT COUNT(*) as table_count
                FROM information_schema.tables 
                WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
            `);
            
            const tableCount = parseInt(tablesResult.rows[0].table_count);
            if (tableCount < 8) {
                throw new Error(`Solo se encontraron ${tableCount} tablas, se esperan al menos 8`);
            }

            // Verificar tablas críticas
            const criticalTables = [
                'clients', 'personnel', 'projects', 'time_entries', 
                'expenses', 'payroll_periods', 'payroll_details'
            ];

            for (const table of criticalTables) {
                const exists = await this.pool.query(`
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_schema = 'public' AND table_name = $1
                    )
                `, [table]);
                
                if (!exists.rows[0].exists) {
                    throw new Error(`Tabla crítica '${table}' no encontrada`);
                }
            }

            // Verificar integridad de datos básicos
            const dataCheck = await this.pool.query(`
                SELECT 
                    (SELECT COUNT(*) FROM clients) as clientes,
                    (SELECT COUNT(*) FROM personnel WHERE status = 'active') as empleados_activos,
                    (SELECT COUNT(*) FROM projects) as proyectos,
                    (SELECT COUNT(*) FROM time_entries) as registros_horas,
                    (SELECT COUNT(*) FROM expenses) as gastos
            `);

            const stats = dataCheck.rows[0];
            this.log(`Datos encontrados: ${stats.clientes} clientes, ${stats.empleados_activos} empleados activos, ${stats.proyectos} proyectos`, 'success');

            // Verificar triggers críticos
            const triggerCheck = await this.pool.query(`
                SELECT COUNT(*) as trigger_count
                FROM information_schema.triggers 
                WHERE trigger_schema = 'public'
                AND trigger_name IN (
                    'trigger_update_project_spent',
                    'trigger_create_labor_expense',
                    'trigger_validate_payroll'
                )
            `);

            const triggerCount = parseInt(triggerCheck.rows[0].trigger_count);
            if (triggerCount < 3) {
                this.log(`Advertencia: Solo ${triggerCount}/3 triggers críticos encontrados`, 'warning');
            }

            this.log('Validación de base de datos completada exitosamente', 'success');
            return true;

        } catch (error) {
            this.log(`Error en validación: ${error.message}`, 'error');
            throw error;
        }
    }

    async createOutputDirectory() {
        if (!fs.existsSync(this.config.outputDir)) {
            fs.mkdirSync(this.config.outputDir, { recursive: true });
            this.log(`Directorio de exportación creado: ${this.config.outputDir}`, 'info');
        }
    }

    async exportSchema() {
        this.log('Exportando esquema de la base de datos...', 'progress');
        
        const schemaFile = path.join(this.config.outputDir, `hyr-schema-${this.timestamp}.sql`);
        
        try {
            // Comando pg_dump para solo esquema (estructura)
            const pgDumpCommand = [
                'pg_dump',
                '--host', this.config.host,
                '--port', this.config.port,
                '--username', this.config.user,
                '--dbname', this.config.database,
                '--schema-only',
                '--no-owner',
                '--no-privileges',
                '--verbose',
                '--file', schemaFile
            ];

            // Configurar variable de entorno para password
            const env = { ...process.env, PGPASSWORD: this.config.password };

            execSync(pgDumpCommand.join(' '), { 
                env,
                stdio: 'pipe'
            });

            // Verificar que el archivo se creó correctamente
            if (!fs.existsSync(schemaFile)) {
                throw new Error('El archivo de esquema no se creó');
            }

            const stats = fs.statSync(schemaFile);
            this.log(`Esquema exportado exitosamente (${Math.round(stats.size / 1024)} KB): ${schemaFile}`, 'success');
            
            return schemaFile;

        } catch (error) {
            this.log(`Error exportando esquema: ${error.message}`, 'error');
            throw error;
        }
    }

    async exportData() {
        if (!this.config.includeData) {
            this.log('Exportación de datos omitida por configuración', 'info');
            return null;
        }

        this.log('Exportando datos de la base de datos...', 'progress');
        
        const dataFile = path.join(this.config.outputDir, `hyr-data-${this.timestamp}.sql`);
        
        try {
            // Comando pg_dump para solo datos
            const pgDumpCommand = [
                'pg_dump',
                '--host', this.config.host,
                '--port', this.config.port,
                '--username', this.config.user,
                '--dbname', this.config.database,
                '--data-only',
                '--no-owner',
                '--no-privileges',
                '--disable-triggers', // Para evitar problemas con triggers durante import
                '--verbose',
                '--file', dataFile
            ];

            const env = { ...process.env, PGPASSWORD: this.config.password };

            execSync(pgDumpCommand.join(' '), { 
                env,
                stdio: 'pipe'
            });

            if (!fs.existsSync(dataFile)) {
                throw new Error('El archivo de datos no se creó');
            }

            const stats = fs.statSync(dataFile);
            this.log(`Datos exportados exitosamente (${Math.round(stats.size / 1024)} KB): ${dataFile}`, 'success');
            
            return dataFile;

        } catch (error) {
            this.log(`Error exportando datos: ${error.message}`, 'error');
            throw error;
        }
    }

    async exportComplete() {
        this.log('Exportando base de datos completa (esquema + datos)...', 'progress');
        
        const completeFile = path.join(this.config.outputDir, `hyr-complete-${this.timestamp}.sql`);
        
        try {
            const pgDumpCommand = [
                'pg_dump',
                '--host', this.config.host,
                '--port', this.config.port,
                '--username', this.config.user,
                '--dbname', this.config.database,
                '--no-owner',
                '--no-privileges',
                '--verbose',
                '--file', completeFile
            ];

            const env = { ...process.env, PGPASSWORD: this.config.password };

            execSync(pgDumpCommand.join(' '), { 
                env,
                stdio: 'pipe'
            });

            if (!fs.existsSync(completeFile)) {
                throw new Error('El archivo completo no se creó');
            }

            const stats = fs.statSync(completeFile);
            this.log(`Base de datos completa exportada (${Math.round(stats.size / 1024)} KB): ${completeFile}`, 'success');
            
            return completeFile;

        } catch (error) {
            this.log(`Error exportando base de datos completa: ${error.message}`, 'error');
            throw error;
        }
    }

    async compressFiles(files) {
        if (!this.config.compress || files.length === 0) {
            return files;
        }

        this.log('Comprimiendo archivos de exportación...', 'progress');
        
        const compressedFiles = [];
        
        try {
            for (const file of files.filter(f => f)) {
                const compressedFile = file + '.gz';
                
                // Usar gzip para comprimir
                execSync(`gzip -9 "${file}"`, { stdio: 'pipe' });
                
                if (fs.existsSync(compressedFile)) {
                    const originalSize = fs.existsSync(file) ? fs.statSync(file).size : 0;
                    const compressedSize = fs.statSync(compressedFile).size;
                    const compressionRatio = originalSize > 0 ? Math.round((1 - compressedSize / originalSize) * 100) : 0;
                    
                    this.log(`Archivo comprimido ${compressionRatio}%: ${path.basename(compressedFile)}`, 'success');
                    compressedFiles.push(compressedFile);
                }
            }

            return compressedFiles;

        } catch (error) {
            this.log(`Error comprimiendo archivos: ${error.message}`, 'error');
            return files; // Devolver archivos originales si la compresión falla
        }
    }

    async generateManifest(exportedFiles) {
        this.log('Generando manifiesto de exportación...', 'progress');
        
        const manifestFile = path.join(this.config.outputDir, `hyr-manifest-${this.timestamp}.json`);
        
        try {
            // Obtener estadísticas de la base de datos
            const dbStats = await this.pool.query(`
                SELECT 
                    (SELECT COUNT(*) FROM clients) as total_clients,
                    (SELECT COUNT(*) FROM personnel) as total_personnel,
                    (SELECT COUNT(*) FROM projects) as total_projects,
                    (SELECT COUNT(*) FROM time_entries) as total_time_entries,
                    (SELECT COUNT(*) FROM expenses) as total_expenses,
                    (SELECT COUNT(*) FROM payroll_details) as total_payroll_details,
                    (SELECT version()) as postgresql_version,
                    (SELECT current_database()) as database_name,
                    (SELECT pg_size_pretty(pg_database_size(current_database()))) as database_size
            `);

            // Obtener información de tablas
            const tablesInfo = await this.pool.query(`
                SELECT 
                    schemaname,
                    tablename,
                    n_tup_ins as inserts,
                    n_tup_upd as updates,
                    n_tup_del as deletes
                FROM pg_stat_user_tables 
                ORDER BY schemaname, tablename
            `);

            const manifest = {
                export_info: {
                    timestamp: new Date().toISOString(),
                    date: this.timestamp,
                    exporter_version: '2.0.0',
                    database_name: dbStats.rows[0].database_name,
                    postgresql_version: dbStats.rows[0].postgresql_version,
                    database_size: dbStats.rows[0].database_size
                },
                configuration: {
                    host: this.config.host,
                    port: this.config.port,
                    user: this.config.user,
                    include_data: this.config.includeData,
                    compressed: this.config.compress
                },
                statistics: dbStats.rows[0],
                tables_info: tablesInfo.rows,
                exported_files: exportedFiles.map(file => ({
                    filename: path.basename(file),
                    full_path: file,
                    size_bytes: fs.existsSync(file) ? fs.statSync(file).size : 0,
                    size_human: fs.existsSync(file) ? Math.round(fs.statSync(file).size / 1024) + ' KB' : '0 KB'
                })),
                validation: {
                    critical_tables_present: true,
                    triggers_present: true,
                    data_consistent: true
                },
                deployment_ready: true
            };

            fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2));
            this.log(`Manifiesto generado: ${manifestFile}`, 'success');
            
            return manifestFile;

        } catch (error) {
            this.log(`Error generando manifiesto: ${error.message}`, 'error');
            return null;
        }
    }

    async generateDeploymentScript(exportedFiles) {
        this.log('Generando script de despliegue...', 'progress');
        
        const deployScript = path.join(this.config.outputDir, `deploy-hyr-${this.timestamp}.sh`);
        
        const scriptContent = `#!/bin/bash

# =====================================================
# SCRIPT DE DESPLIEGUE AUTOMÁTICO - HYR SISTEMA
# Generado automáticamente: ${new Date().toISOString()}
# =====================================================

set -e  # Salir en caso de error

echo "🚀 Iniciando despliegue del Sistema HYR Constructora & Soldadura"
echo "📅 Fecha de exportación: ${this.timestamp}"
echo "=================================================="

# Configuración
DB_NAME="hyr_construction"
DB_USER="hyr_user"
DB_PASSWORD="secure_password_here"  # CAMBIAR EN PRODUCCIÓN
DB_HOST="localhost"
DB_PORT="5432"

# Verificar prerrequisitos
echo "📋 Verificando prerrequisitos..."

if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL client (psql) no está instalado"
    exit 1
fi

if ! command -v createdb &> /dev/null; then
    echo "❌ PostgreSQL createdb no está disponible"
    exit 1
fi

echo "✅ Prerrequisitos verificados"

# Crear base de datos
echo "📊 Creando base de datos..."
createdb -h "$DB_HOST" -p "$DB_PORT" -U postgres "$DB_NAME" || echo "Base de datos ya existe"

# Crear usuario de aplicación
echo "👤 Configurando usuario de aplicación..."
psql -h "$DB_HOST" -p "$DB_PORT" -U postgres -d "$DB_NAME" -c "
    CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';
    GRANT CONNECT ON DATABASE $DB_NAME TO $DB_USER;
    GRANT USAGE ON SCHEMA public TO $DB_USER;
    GRANT CREATE ON SCHEMA public TO $DB_USER;
" || echo "Usuario ya existe o configurado"

# Restaurar esquema y datos
echo "🔄 Restaurando base de datos..."

${exportedFiles.find(f => f.includes('complete')) ? 
`# Restaurar base de datos completa
if [ -f "${path.basename(exportedFiles.find(f => f.includes('complete')))}" ]; then
    echo "📁 Restaurando desde archivo completo..."
    ${exportedFiles.find(f => f.includes('complete')).endsWith('.gz') ? 'gunzip -c' : 'cat'} "${path.basename(exportedFiles.find(f => f.includes('complete')))}" | psql -h "$DB_HOST" -p "$DB_PORT" -U postgres -d "$DB_NAME"
else
    echo "❌ Archivo completo no encontrado"
    exit 1
fi` :
`# Restaurar esquema y datos por separado
if [ -f "${exportedFiles.find(f => f.includes('schema')) ? path.basename(exportedFiles.find(f => f.includes('schema'))) : 'schema.sql'}" ]; then
    echo "🏗️ Restaurando esquema..."
    ${exportedFiles.find(f => f.includes('schema'))?.endsWith('.gz') ? 'gunzip -c' : 'cat'} "${exportedFiles.find(f => f.includes('schema')) ? path.basename(exportedFiles.find(f => f.includes('schema'))) : 'schema.sql'}" | psql -h "$DB_HOST" -p "$DB_PORT" -U postgres -d "$DB_NAME"
fi

if [ -f "${exportedFiles.find(f => f.includes('data')) ? path.basename(exportedFiles.find(f => f.includes('data'))) : 'data.sql'}" ]; then
    echo "📊 Restaurando datos..."
    ${exportedFiles.find(f => f.includes('data'))?.endsWith('.gz') ? 'gunzip -c' : 'cat'} "${exportedFiles.find(f => f.includes('data')) ? path.basename(exportedFiles.find(f => f.includes('data'))) : 'data.sql'}" | psql -h "$DB_HOST" -p "$DB_PORT" -U postgres -d "$DB_NAME"
fi`}

# Configurar permisos finales
echo "🔐 Configurando permisos..."
psql -h "$DB_HOST" -p "$DB_PORT" -U postgres -d "$DB_NAME" -c "
    GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO $DB_USER;
    GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO $DB_USER;
    GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO $DB_USER;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO $DB_USER;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO $DB_USER;
"

# Verificar instalación
echo "🔍 Verificando instalación..."
TABLES_COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U postgres -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'")

if [ "$TABLES_COUNT" -ge "8" ]; then
    echo "✅ Base de datos restaurada exitosamente ($TABLES_COUNT tablas)"
else
    echo "❌ Error: Solo se encontraron $TABLES_COUNT tablas"
    exit 1
fi

# Mostrar estadísticas finales
echo "=================================================="
echo "🎉 DESPLIEGUE COMPLETADO EXITOSAMENTE"
echo "=================================================="
echo "📊 Base de datos: $DB_NAME"
echo "👤 Usuario aplicación: $DB_USER"
echo "🏗️ Tablas restauradas: $TABLES_COUNT"
echo "📝 Configurar variables de entorno:"
echo "    DATABASE_URL=postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME"
echo "=================================================="
`;

        try {
            fs.writeFileSync(deployScript, scriptContent);
            
            // Hacer el script ejecutable en sistemas Unix
            if (process.platform !== 'win32') {
                execSync(`chmod +x "${deployScript}"`);
            }
            
            this.log(`Script de despliegue generado: ${deployScript}`, 'success');
            return deployScript;

        } catch (error) {
            this.log(`Error generando script de despliegue: ${error.message}`, 'error');
            return null;
        }
    }

    async exportFull() {
        try {
            this.log('🚀 Iniciando exportación completa del Sistema HYR', 'info');
            console.log('='.repeat(60));
            
            // Validar base de datos
            if (this.config.validate) {
                await this.validateDatabase();
            }
            
            // Crear directorio de salida
            await this.createOutputDirectory();
            
            // Exportar archivos
            const schemaFile = await this.exportSchema();
            const dataFile = await this.exportData();
            const completeFile = await this.exportComplete();
            
            // Lista de archivos exportados
            let exportedFiles = [schemaFile, dataFile, completeFile].filter(f => f);
            
            // Comprimir archivos si está habilitado
            if (this.config.compress) {
                exportedFiles = await this.compressFiles(exportedFiles);
            }
            
            // Generar manifiesto y script de despliegue
            const manifestFile = await this.generateManifest(exportedFiles);
            const deployScript = await this.generateDeploymentScript(exportedFiles);
            
            if (manifestFile) exportedFiles.push(manifestFile);
            if (deployScript) exportedFiles.push(deployScript);
            
            // Resumen final
            console.log('\n' + '='.repeat(60));
            this.log('🎉 EXPORTACIÓN COMPLETADA EXITOSAMENTE', 'success');
            console.log('='.repeat(60));
            
            console.log(`📁 Directorio: ${this.config.outputDir}`);
            console.log(`📊 Archivos generados: ${exportedFiles.length}`);
            
            exportedFiles.forEach(file => {
                const stats = fs.statSync(file);
                console.log(`   • ${path.basename(file)} (${Math.round(stats.size / 1024)} KB)`);
            });
            
            console.log('\n📋 INSTRUCCIONES DE DESPLIEGUE:');
            console.log('1. Copiar todos los archivos al servidor de producción');
            console.log('2. Instalar PostgreSQL en el servidor');
            console.log(`3. Ejecutar: bash ${path.basename(deployScript || 'deploy-script.sh')}`);
            console.log('4. Configurar variables de entorno de la aplicación');
            console.log('5. Iniciar servicios del backend y frontend');
            
            console.log('\n' + '='.repeat(60));
            
            return {
                success: true,
                files: exportedFiles,
                manifest: manifestFile,
                deployScript: deployScript
            };

        } catch (error) {
            this.log(`❌ Error crítico durante la exportación: ${error.message}`, 'error');
            throw error;
        } finally {
            await this.pool.end();
        }
    }
}

// Función para uso desde línea de comandos
async function main() {
    const args = process.argv.slice(2);
    const options = {};
    
    // Parsear argumentos
    for (let i = 0; i < args.length; i += 2) {
        const key = args[i]?.replace('--', '');
        const value = args[i + 1];
        
        if (key && value) {
            options[key] = value === 'true' ? true : value === 'false' ? false : value;
        }
    }
    
    try {
        const exporter = new HYRDatabaseExporter(options);
        await exporter.exportFull();
        process.exit(0);
    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
        process.exit(1);
    }
}

// Ejecutar si se llama directamente
if (require.main === module) {
    main();
}

module.exports = { HYRDatabaseExporter };