#!/usr/bin/env node

// =====================================================
// SCRIPT DE MIGRACIÓN A SERVIDOR DE PRODUCCIÓN - HYR
// Automatiza la instalación completa en servidor nuevo
// =====================================================

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');
const { Pool } = require('pg');

class HYRServerMigration {
    constructor(options = {}) {
        this.config = {
            // Configuración de base de datos
            dbName: options.dbName || 'hyr_construction',
            dbUser: options.dbUser || 'hyr_user', 
            dbPassword: options.dbPassword || this.generateSecurePassword(),
            dbHost: options.dbHost || 'localhost',
            dbPort: options.dbPort || 5432,
            
            // Configuración de aplicación
            appPort: options.appPort || 3001,
            frontendPort: options.frontendPort || 3000,
            
            // Directorios
            workDir: options.workDir || '/opt/hyr-system',
            backupDir: options.backupDir || '/opt/hyr-backups',
            logDir: options.logDir || '/var/log/hyr-system',
            
            // Opciones de instalación
            installNodejs: options.installNodejs !== false,
            installPostgreSQL: options.installPostgreSQL !== false,
            installNginx: options.installNginx !== false,
            setupSSL: options.setupSSL === true,
            domain: options.domain || null,
            
            // Archivos de migración
            sourceDir: options.sourceDir || process.cwd(),
            
            // Configuraciones de seguridad
            enableFirewall: options.enableFirewall !== false,
            createSystemUser: options.createSystemUser !== false,
        };

        this.isRoot = process.getuid && process.getuid() === 0;
        this.osInfo = this.detectOS();
    }

    log(message, type = 'info') {
        const timestamp = new Date().toISOString();
        const icons = {
            info: '📋',
            success: '✅',
            error: '❌',
            warning: '⚠️',
            progress: '🔄',
            security: '🔐',
            network: '🌐'
        };
        
        const logMessage = `${icons[type]} [${timestamp}] ${message}`;
        console.log(logMessage);
        
        // Escribir también a archivo de log si el directorio existe
        if (fs.existsSync(this.config.logDir)) {
            const logFile = path.join(this.config.logDir, 'migration.log');
            fs.appendFileSync(logFile, logMessage + '\n');
        }
    }

    detectOS() {
        const platform = process.platform;
        
        if (platform === 'linux') {
            try {
                if (fs.existsSync('/etc/ubuntu-release') || fs.existsSync('/etc/debian_version')) {
                    return { type: 'debian', packageManager: 'apt' };
                } else if (fs.existsSync('/etc/redhat-release') || fs.existsSync('/etc/centos-release')) {
                    return { type: 'redhat', packageManager: 'yum' };
                }
            } catch (error) {
                this.log(`No se pudo detectar la distribución Linux: ${error.message}`, 'warning');
            }
            return { type: 'linux', packageManager: 'unknown' };
        }
        
        return { type: platform, packageManager: 'unknown' };
    }

    generateSecurePassword(length = 32) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
        let password = '';
        for (let i = 0; i < length; i++) {
            password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return password;
    }

    async checkPrerequisites() {
        this.log('Verificando prerrequisitos del sistema...', 'progress');
        
        // Verificar permisos de root
        if (!this.isRoot && this.config.installPostgreSQL) {
            this.log('Se requieren permisos de root para instalar PostgreSQL', 'error');
            throw new Error('Ejecutar como sudo o deshabilitar installPostgreSQL');
        }

        // Verificar conectividad a internet
        try {
            await new Promise((resolve, reject) => {
                const req = https.get('https://www.google.com', (res) => {
                    resolve(res.statusCode === 200);
                });
                req.setTimeout(5000);
                req.on('error', reject);
                req.on('timeout', () => reject(new Error('Timeout')));
            });
            this.log('Conectividad a internet verificada', 'success');
        } catch (error) {
            this.log('Advertencia: No se pudo verificar conectividad a internet', 'warning');
        }

        // Verificar espacio en disco (mínimo 2GB)
        try {
            const diskUsage = execSync('df -BG / | tail -n 1 | awk \'{print $4}\'', { encoding: 'utf8' });
            const availableGB = parseInt(diskUsage.replace('G', ''));
            
            if (availableGB < 2) {
                throw new Error(`Espacio insuficiente: ${availableGB}GB disponibles, se requieren al menos 2GB`);
            }
            
            this.log(`Espacio en disco verificado: ${availableGB}GB disponibles`, 'success');
        } catch (error) {
            this.log(`Advertencia verificando espacio en disco: ${error.message}`, 'warning');
        }

        this.log('Prerrequisitos verificados', 'success');
    }

    async createDirectories() {
        this.log('Creando estructura de directorios...', 'progress');
        
        const directories = [
            this.config.workDir,
            this.config.backupDir,
            this.config.logDir,
            path.join(this.config.workDir, 'backend'),
            path.join(this.config.workDir, 'frontend'),
            path.join(this.config.workDir, 'database'),
            path.join(this.config.workDir, 'scripts'),
            path.join(this.config.workDir, 'config')
        ];

        for (const dir of directories) {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true, mode: 0o755 });
                this.log(`Directorio creado: ${dir}`, 'info');
            }
        }

        this.log('Estructura de directorios creada', 'success');
    }

    async installSystemPackages() {
        if (!this.isRoot) {
            this.log('Omitiendo instalación de paquetes del sistema (sin permisos root)', 'warning');
            return;
        }

        this.log('Instalando paquetes del sistema...', 'progress');
        
        try {
            if (this.osInfo.packageManager === 'apt') {
                // Ubuntu/Debian
                execSync('apt update', { stdio: 'inherit' });
                
                const packages = [
                    'curl', 'wget', 'git', 'build-essential', 
                    'software-properties-common', 'gnupg2',
                    'certbot', 'ufw' // Para SSL y firewall
                ];
                
                if (this.config.installPostgreSQL) {
                    packages.push('postgresql', 'postgresql-contrib');
                }
                
                if (this.config.installNginx) {
                    packages.push('nginx');
                }
                
                execSync(`apt install -y ${packages.join(' ')}`, { stdio: 'inherit' });
                
            } else if (this.osInfo.packageManager === 'yum') {
                // RHEL/CentOS
                execSync('yum update -y', { stdio: 'inherit' });
                
                const packages = [
                    'curl', 'wget', 'git', 'gcc', 'gcc-c++', 'make',
                    'epel-release'
                ];
                
                if (this.config.installPostgreSQL) {
                    packages.push('postgresql-server', 'postgresql-contrib');
                }
                
                if (this.config.installNginx) {
                    packages.push('nginx');
                }
                
                execSync(`yum install -y ${packages.join(' ')}`, { stdio: 'inherit' });
                
                // Inicializar PostgreSQL en CentOS/RHEL
                if (this.config.installPostgreSQL) {
                    execSync('postgresql-setup initdb', { stdio: 'inherit' });
                }
            }

            this.log('Paquetes del sistema instalados', 'success');

        } catch (error) {
            this.log(`Error instalando paquetes del sistema: ${error.message}`, 'error');
            throw error;
        }
    }

    async installNodeJS() {
        if (!this.config.installNodejs) {
            this.log('Omitiendo instalación de Node.js', 'info');
            return;
        }

        this.log('Instalando Node.js...', 'progress');
        
        try {
            // Verificar si Node.js ya está instalado
            try {
                const nodeVersion = execSync('node --version', { encoding: 'utf8' });
                this.log(`Node.js ya instalado: ${nodeVersion.trim()}`, 'success');
                return;
            } catch (error) {
                // Node.js no está instalado, continuar con la instalación
            }

            // Instalar Node.js usando NodeSource repository
            if (this.osInfo.packageManager === 'apt') {
                execSync('curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -', { stdio: 'inherit' });
                execSync('apt-get install -y nodejs', { stdio: 'inherit' });
            } else if (this.osInfo.packageManager === 'yum') {
                execSync('curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -', { stdio: 'inherit' });
                execSync('yum install -y nodejs', { stdio: 'inherit' });
            } else {
                throw new Error('Sistema operativo no soportado para instalación automática de Node.js');
            }

            // Verificar instalación
            const nodeVersion = execSync('node --version', { encoding: 'utf8' });
            const npmVersion = execSync('npm --version', { encoding: 'utf8' });
            
            this.log(`Node.js instalado: ${nodeVersion.trim()}`, 'success');
            this.log(`npm instalado: ${npmVersion.trim()}`, 'success');

        } catch (error) {
            this.log(`Error instalando Node.js: ${error.message}`, 'error');
            throw error;
        }
    }

    async configurePostgreSQL() {
        if (!this.config.installPostgreSQL) {
            this.log('Omitiendo configuración de PostgreSQL', 'info');
            return;
        }

        this.log('Configurando PostgreSQL...', 'progress');
        
        try {
            // Iniciar y habilitar PostgreSQL
            if (this.isRoot) {
                execSync('systemctl start postgresql', { stdio: 'inherit' });
                execSync('systemctl enable postgresql', { stdio: 'inherit' });
            }

            // Crear base de datos y usuario
            const createDbScript = `
                CREATE DATABASE ${this.config.dbName};
                CREATE USER ${this.config.dbUser} WITH PASSWORD '${this.config.dbPassword}';
                GRANT ALL PRIVILEGES ON DATABASE ${this.config.dbName} TO ${this.config.dbUser};
                ALTER USER ${this.config.dbUser} CREATEDB;
            `;

            const scriptFile = path.join(this.config.workDir, 'setup_db.sql');
            fs.writeFileSync(scriptFile, createDbScript);

            // Ejecutar como usuario postgres
            execSync(`sudo -u postgres psql -f "${scriptFile}"`, { stdio: 'inherit' });

            // Configurar autenticación (permitir conexiones locales)
            const pgVersion = execSync('sudo -u postgres psql -t -c "SELECT version();"', { encoding: 'utf8' });
            const versionMatch = pgVersion.match(/PostgreSQL (\d+\.\d+)/);
            const version = versionMatch ? versionMatch[1] : '13';
            
            const pgHbaPath = `/etc/postgresql/${version}/main/pg_hba.conf`;
            
            if (fs.existsSync(pgHbaPath)) {
                let pgHbaContent = fs.readFileSync(pgHbaPath, 'utf8');
                
                // Agregar línea para permitir conexiones locales con password
                if (!pgHbaContent.includes('local   all             hyr_user')) {
                    pgHbaContent += `\n# HYR System user\nlocal   all             ${this.config.dbUser}                                md5\n`;
                    fs.writeFileSync(pgHbaPath, pgHbaContent);
                    
                    // Recargar configuración
                    execSync('systemctl reload postgresql', { stdio: 'inherit' });
                }
            }

            this.log('PostgreSQL configurado exitosamente', 'success');
            this.log(`Base de datos: ${this.config.dbName}`, 'info');
            this.log(`Usuario: ${this.config.dbUser}`, 'info');

        } catch (error) {
            this.log(`Error configurando PostgreSQL: ${error.message}`, 'error');
            throw error;
        }
    }

    async deployApplication() {
        this.log('Desplegando aplicación HYR...', 'progress');
        
        try {
            // Copiar archivos de la aplicación
            const sourceBackend = path.join(this.config.sourceDir, 'backend');
            const sourceFrontend = path.join(this.config.sourceDir, 'construction-admin');
            
            const targetBackend = path.join(this.config.workDir, 'backend');
            const targetFrontend = path.join(this.config.workDir, 'frontend');

            // Copiar backend si existe
            if (fs.existsSync(sourceBackend)) {
                execSync(`cp -r "${sourceBackend}/"* "${targetBackend}/"`, { stdio: 'inherit' });
                this.log('Archivos backend copiados', 'success');
                
                // Instalar dependencias del backend
                execSync('npm install --production', { 
                    cwd: targetBackend, 
                    stdio: 'inherit' 
                });
                this.log('Dependencias backend instaladas', 'success');
            }

            // Copiar frontend si existe
            if (fs.existsSync(sourceFrontend)) {
                execSync(`cp -r "${sourceFrontend}/"* "${targetFrontend}/"`, { stdio: 'inherit' });
                this.log('Archivos frontend copiados', 'success');
                
                // Instalar dependencias y construir frontend
                execSync('npm install', { 
                    cwd: targetFrontend, 
                    stdio: 'inherit' 
                });
                
                execSync('npm run build', { 
                    cwd: targetFrontend, 
                    stdio: 'inherit' 
                });
                this.log('Frontend construido para producción', 'success');
            }

            // Configurar variables de entorno
            this.createEnvironmentFiles();

            this.log('Aplicación desplegada exitosamente', 'success');

        } catch (error) {
            this.log(`Error desplegando aplicación: ${error.message}`, 'error');
            throw error;
        }
    }

    createEnvironmentFiles() {
        this.log('Creando archivos de configuración...', 'progress');
        
        // Archivo .env para backend
        const backendEnv = `
# Configuración Base de Datos
DATABASE_URL=postgresql://${this.config.dbUser}:${this.config.dbPassword}@${this.config.dbHost}:${this.config.dbPort}/${this.config.dbName}
DB_HOST=${this.config.dbHost}
DB_PORT=${this.config.dbPort}
DB_NAME=${this.config.dbName}
DB_USER=${this.config.dbUser}
DB_PASSWORD=${this.config.dbPassword}

# Configuración Aplicación
NODE_ENV=production
PORT=${this.config.appPort}
FRONTEND_URL=http://localhost:${this.config.frontendPort}

# Configuración CORS
CORS_ORIGIN=http://localhost:${this.config.frontendPort}${this.config.domain ? `,https://${this.config.domain}` : ''}

# Configuración Logs
LOG_LEVEL=info
LOG_DIR=${this.config.logDir}

# Configuración Seguridad
SESSION_SECRET=${this.generateSecurePassword(64)}
JWT_SECRET=${this.generateSecurePassword(32)}
`;

        const backendEnvFile = path.join(this.config.workDir, 'backend', '.env');
        fs.writeFileSync(backendEnvFile, backendEnv.trim());

        // Archivo de configuración para frontend (si es necesario)
        const frontendEnv = `
NEXT_PUBLIC_API_URL=http://localhost:${this.config.appPort}
NODE_ENV=production
PORT=${this.config.frontendPort}
`;

        const frontendEnvFile = path.join(this.config.workDir, 'frontend', '.env.local');
        if (fs.existsSync(path.join(this.config.workDir, 'frontend'))) {
            fs.writeFileSync(frontendEnvFile, frontendEnv.trim());
        }

        this.log('Archivos de configuración creados', 'success');
    }

    async createSystemServices() {
        if (!this.isRoot) {
            this.log('Omitiendo creación de servicios systemd (sin permisos root)', 'warning');
            return;
        }

        this.log('Creando servicios systemd...', 'progress');
        
        try {
            // Servicio para backend
            const backendService = `[Unit]
Description=HYR Backend API Service
After=network.target postgresql.service
Wants=postgresql.service

[Service]
Type=simple
User=nobody
WorkingDirectory=${this.config.workDir}/backend
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=hyr-backend
Environment=NODE_ENV=production
EnvironmentFile=${this.config.workDir}/backend/.env

[Install]
WantedBy=multi-user.target`;

            fs.writeFileSync('/etc/systemd/system/hyr-backend.service', backendService);

            // Servicio para frontend (si existe)
            if (fs.existsSync(path.join(this.config.workDir, 'frontend'))) {
                const frontendService = `[Unit]
Description=HYR Frontend Service
After=network.target
Requires=hyr-backend.service

[Service]
Type=simple
User=nobody
WorkingDirectory=${this.config.workDir}/frontend
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=hyr-frontend
Environment=NODE_ENV=production
EnvironmentFile=${this.config.workDir}/frontend/.env.local

[Install]
WantedBy=multi-user.target`;

                fs.writeFileSync('/etc/systemd/system/hyr-frontend.service', frontendService);
            }

            // Recargar systemd y habilitar servicios
            execSync('systemctl daemon-reload', { stdio: 'inherit' });
            execSync('systemctl enable hyr-backend', { stdio: 'inherit' });
            
            if (fs.existsSync('/etc/systemd/system/hyr-frontend.service')) {
                execSync('systemctl enable hyr-frontend', { stdio: 'inherit' });
            }

            this.log('Servicios systemd creados y habilitados', 'success');

        } catch (error) {
            this.log(`Error creando servicios systemd: ${error.message}`, 'error');
            throw error;
        }
    }

    async configureNginx() {
        if (!this.config.installNginx) {
            this.log('Omitiendo configuración de Nginx', 'info');
            return;
        }

        this.log('Configurando Nginx...', 'progress');
        
        try {
            const nginxConfig = `
# Configuración HYR System
upstream hyr_backend {
    server localhost:${this.config.appPort};
}

upstream hyr_frontend {
    server localhost:${this.config.frontendPort};
}

server {
    listen 80;
    server_name ${this.config.domain || 'localhost'};

    # Redirigir HTTP a HTTPS si SSL está habilitado
    ${this.config.setupSSL ? 'return 301 https://$server_name$request_uri;' : ''}

    ${!this.config.setupSSL ? `
    # Proxy para frontend
    location / {
        proxy_pass http://hyr_frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Proxy para API backend
    location /api {
        proxy_pass http://hyr_backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }` : ''}
}

${this.config.setupSSL && this.config.domain ? `
server {
    listen 443 ssl http2;
    server_name ${this.config.domain};

    ssl_certificate /etc/letsencrypt/live/${this.config.domain}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${this.config.domain}/privkey.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;

    # Proxy para frontend
    location / {
        proxy_pass http://hyr_frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Proxy para API backend
    location /api {
        proxy_pass http://hyr_backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}` : ''}
`;

            const configFile = '/etc/nginx/sites-available/hyr-system';
            fs.writeFileSync(configFile, nginxConfig);

            // Crear enlace simbólico para habilitar el sitio
            if (!fs.existsSync('/etc/nginx/sites-enabled/hyr-system')) {
                execSync(`ln -s ${configFile} /etc/nginx/sites-enabled/`);
            }

            // Remover configuración por defecto
            if (fs.existsSync('/etc/nginx/sites-enabled/default')) {
                execSync('rm /etc/nginx/sites-enabled/default');
            }

            // Probar configuración
            execSync('nginx -t', { stdio: 'inherit' });

            // Habilitar y reiniciar Nginx
            execSync('systemctl enable nginx', { stdio: 'inherit' });
            execSync('systemctl restart nginx', { stdio: 'inherit' });

            this.log('Nginx configurado y reiniciado', 'success');

        } catch (error) {
            this.log(`Error configurando Nginx: ${error.message}`, 'error');
            throw error;
        }
    }

    async setupSSL() {
        if (!this.config.setupSSL || !this.config.domain || !this.isRoot) {
            this.log('Omitiendo configuración SSL', 'info');
            return;
        }

        this.log('Configurando certificados SSL con Let\'s Encrypt...', 'progress');
        
        try {
            // Obtener certificado SSL
            execSync(`certbot --nginx -d ${this.config.domain} --non-interactive --agree-tos --email admin@${this.config.domain}`, {
                stdio: 'inherit'
            });

            // Configurar renovación automática
            execSync('systemctl enable certbot.timer', { stdio: 'inherit' });
            execSync('systemctl start certbot.timer', { stdio: 'inherit' });

            this.log('Certificados SSL configurados exitosamente', 'success', 'security');

        } catch (error) {
            this.log(`Error configurando SSL: ${error.message}`, 'error');
            this.log('Continuando sin SSL...', 'warning');
        }
    }

    async configureFirewall() {
        if (!this.config.enableFirewall || !this.isRoot) {
            this.log('Omitiendo configuración de firewall', 'info');
            return;
        }

        this.log('Configurando firewall...', 'progress', 'security');
        
        try {
            // Habilitar UFW
            execSync('ufw --force enable', { stdio: 'inherit' });
            
            // Configurar reglas básicas
            execSync('ufw default deny incoming', { stdio: 'inherit' });
            execSync('ufw default allow outgoing', { stdio: 'inherit' });
            
            // Permitir SSH
            execSync('ufw allow ssh', { stdio: 'inherit' });
            
            // Permitir HTTP y HTTPS
            execSync('ufw allow http', { stdio: 'inherit' });
            execSync('ufw allow https', { stdio: 'inherit' });
            
            // Permitir PostgreSQL solo localmente
            execSync('ufw allow from 127.0.0.1 to any port 5432', { stdio: 'inherit' });
            
            this.log('Firewall configurado', 'success', 'security');

        } catch (error) {
            this.log(`Error configurando firewall: ${error.message}`, 'error');
        }
    }

    async restoreDatabase() {
        this.log('Restaurando base de datos...', 'progress');
        
        try {
            // Buscar archivos de migración en el directorio actual
            const migrationFiles = [
                'hyr-complete-*.sql',
                'hyr-schema-*.sql',
                'production-master-schema.sql'
            ];

            let schemaFile = null;
            for (const pattern of migrationFiles) {
                const files = execSync(`ls ${pattern} 2>/dev/null || true`, { 
                    encoding: 'utf8',
                    cwd: this.config.sourceDir 
                }).trim().split('\n').filter(f => f);
                
                if (files.length > 0) {
                    schemaFile = path.join(this.config.sourceDir, files[0]);
                    break;
                }
            }

            if (!schemaFile || !fs.existsSync(schemaFile)) {
                // Usar esquema maestro por defecto
                schemaFile = path.join(this.config.sourceDir, 'backend', 'database', 'production-master-schema.sql');
            }

            if (fs.existsSync(schemaFile)) {
                // Restaurar usando psql
                const connectionString = `postgresql://${this.config.dbUser}:${this.config.dbPassword}@${this.config.dbHost}:${this.config.dbPort}/${this.config.dbName}`;
                
                if (schemaFile.endsWith('.gz')) {
                    execSync(`gunzip -c "${schemaFile}" | psql "${connectionString}"`, { stdio: 'inherit' });
                } else {
                    execSync(`psql "${connectionString}" -f "${schemaFile}"`, { stdio: 'inherit' });
                }

                this.log(`Base de datos restaurada desde: ${path.basename(schemaFile)}`, 'success');

                // Verificar restauración
                const pool = new Pool({
                    host: this.config.dbHost,
                    database: this.config.dbName,
                    user: this.config.dbUser,
                    password: this.config.dbPassword,
                    port: this.config.dbPort
                });

                const tablesCount = await pool.query(`
                    SELECT COUNT(*) FROM information_schema.tables 
                    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
                `);

                await pool.end();

                if (parseInt(tablesCount.rows[0].count) >= 8) {
                    this.log(`Verificación exitosa: ${tablesCount.rows[0].count} tablas restauradas`, 'success');
                } else {
                    throw new Error(`Solo ${tablesCount.rows[0].count} tablas restauradas, se esperaban al menos 8`);
                }

            } else {
                throw new Error('No se encontró archivo de esquema para restaurar');
            }

        } catch (error) {
            this.log(`Error restaurando base de datos: ${error.message}`, 'error');
            throw error;
        }
    }

    async startServices() {
        this.log('Iniciando servicios del sistema...', 'progress');
        
        try {
            if (this.isRoot) {
                // Iniciar servicios systemd
                execSync('systemctl start hyr-backend', { stdio: 'inherit' });
                
                if (fs.existsSync('/etc/systemd/system/hyr-frontend.service')) {
                    execSync('systemctl start hyr-frontend', { stdio: 'inherit' });
                }

                // Verificar estado de los servicios
                const backendStatus = execSync('systemctl is-active hyr-backend', { encoding: 'utf8' }).trim();
                this.log(`Backend service: ${backendStatus}`, backendStatus === 'active' ? 'success' : 'error');

            } else {
                this.log('Iniciando servicios manualmente (sin systemd)...', 'info');
                
                // Iniciar backend en background
                const backendProcess = spawn('node', ['server.js'], {
                    cwd: path.join(this.config.workDir, 'backend'),
                    detached: true,
                    stdio: 'ignore'
                });
                backendProcess.unref();

                this.log('Backend iniciado manualmente', 'success');
            }

        } catch (error) {
            this.log(`Error iniciando servicios: ${error.message}`, 'error');
            throw error;
        }
    }

    async generateSummary() {
        this.log('Generando resumen de instalación...', 'progress');
        
        const summary = {
            installation: {
                timestamp: new Date().toISOString(),
                server_info: this.osInfo,
                work_directory: this.config.workDir,
                backup_directory: this.config.backupDir,
                log_directory: this.config.logDir
            },
            database: {
                name: this.config.dbName,
                user: this.config.dbUser,
                host: this.config.dbHost,
                port: this.config.dbPort,
                connection_string: `postgresql://${this.config.dbUser}:****@${this.config.dbHost}:${this.config.dbPort}/${this.config.dbName}`
            },
            application: {
                backend_port: this.config.appPort,
                frontend_port: this.config.frontendPort,
                domain: this.config.domain,
                ssl_enabled: this.config.setupSSL
            },
            services: {
                systemd_enabled: this.isRoot,
                nginx_enabled: this.config.installNginx,
                firewall_enabled: this.config.enableFirewall
            },
            access_urls: [
                `http://localhost:${this.config.appPort}/api/reports/executive-dashboard`,
                this.config.domain 
                    ? `${this.config.setupSSL ? 'https' : 'http'}://${this.config.domain}`
                    : `http://localhost:${this.config.frontendPort}`,
                this.config.installNginx ? 'http://localhost (via Nginx)' : null
            ].filter(Boolean),
            next_steps: [
                'Verificar que todos los servicios estén funcionando',
                'Probar acceso a la aplicación web',
                'Configurar backups automáticos',
                'Configurar monitoreo de logs',
                'Revisar configuraciones de seguridad'
            ]
        };

        const summaryFile = path.join(this.config.workDir, 'installation-summary.json');
        fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2));

        return summary;
    }

    async runMigration() {
        try {
            console.log('🚀 INICIANDO MIGRACIÓN DEL SISTEMA HYR');
            console.log('🏗️  HYR Constructora & Soldadura - Sistema Empresarial');
            console.log('='.repeat(60));

            await this.checkPrerequisites();
            await this.createDirectories();
            await this.installSystemPackages();
            await this.installNodeJS();
            await this.configurePostgreSQL();
            await this.restoreDatabase();
            await this.deployApplication();
            await this.createSystemServices();
            await this.configureNginx();
            await this.setupSSL();
            await this.configureFirewall();
            await this.startServices();

            const summary = await this.generateSummary();

            console.log('\n' + '='.repeat(60));
            this.log('🎉 MIGRACIÓN COMPLETADA EXITOSAMENTE', 'success');
            console.log('='.repeat(60));

            console.log('\n📊 RESUMEN DE INSTALACIÓN:');
            console.log(`📁 Directorio de trabajo: ${summary.installation.work_directory}`);
            console.log(`🗄️  Base de datos: ${summary.database.name}`);
            console.log(`🌐 URLs de acceso:`);
            summary.access_urls.forEach(url => console.log(`   • ${url}`));

            console.log('\n🔧 PRÓXIMOS PASOS:');
            summary.next_steps.forEach((step, i) => console.log(`${i + 1}. ${step}`));

            console.log('\n📋 CREDENCIALES (GUARDAR EN LUGAR SEGURO):');
            console.log(`Usuario BD: ${this.config.dbUser}`);
            console.log(`Password BD: ${this.config.dbPassword}`);

            console.log('\n' + '='.repeat(60));

            return summary;

        } catch (error) {
            this.log(`❌ Error crítico durante la migración: ${error.message}`, 'error');
            console.log('\n📋 INFORMACIÓN DE DEBUG:');
            console.log(`Sistema operativo: ${JSON.stringify(this.osInfo)}`);
            console.log(`Permisos root: ${this.isRoot}`);
            console.log(`Directorio fuente: ${this.config.sourceDir}`);
            throw error;
        }
    }
}

// Función principal para uso desde línea de comandos
async function main() {
    const args = process.argv.slice(2);
    const options = {};
    
    // Parsear argumentos
    for (let i = 0; i < args.length; i += 2) {
        const key = args[i]?.replace('--', '');
        const value = args[i + 1];
        
        if (key && value !== undefined) {
            // Convertir valores string a boolean si es necesario
            if (value === 'true') options[key] = true;
            else if (value === 'false') options[key] = false;
            else options[key] = value;
        }
    }
    
    try {
        const migration = new HYRServerMigration(options);
        await migration.runMigration();
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

module.exports = { HYRServerMigration };