# 🚀 Guía de Despliegue en Servidor - Sistema HYR

**HYR Constructora & Soldadura - Sistema de Gestión Empresarial**

> 📋 **Versión:** 2.0.0 Producción  
> 📅 **Fecha:** 2025-01-01  
> 🏗️ **Sistema:** Nómina Colombiana 2024 + Gestión Empresarial Completa

---

## 📑 Tabla de Contenidos

1. [Prerrequisitos del Servidor](#-prerrequisitos-del-servidor)
2. [Método 1: Despliegue Automatizado](#-método-1-despliegue-automatizado-recomendado)
3. [Método 2: Despliegue Manual](#-método-2-despliegue-manual)
4. [Configuración de Base de Datos](#-configuración-de-base-de-datos)
5. [Configuración de Nginx](#-configuración-de-nginx)
6. [SSL y Seguridad](#-ssl-y-seguridad)
7. [Monitoreo y Mantenimiento](#-monitoreo-y-mantenimiento)
8. [Resolución de Problemas](#-resolución-de-problemas)

---

## 🖥️ Prerrequisitos del Servidor

### Especificaciones Mínimas
- **CPU:** 2 cores (recomendado 4 cores)
- **RAM:** 4GB (recomendado 8GB)
- **Almacenamiento:** 20GB libres (recomendado 50GB)
- **OS:** Ubuntu 20.04+ / CentOS 8+ / Debian 11+

### Software Requerido
- **PostgreSQL 13+**
- **Node.js 18+**  
- **Nginx** (opcional, para proxy reverso)
- **SSL Certificate** (opcional, para HTTPS)

### Puertos Necesarios
```bash
# Backend API
3001/tcp

# Frontend (si se ejecuta standalone)  
3000/tcp

# PostgreSQL (solo local)
5432/tcp (localhost only)

# Web traffic (si usa Nginx)
80/tcp, 443/tcp
```

---

## 🔥 Método 1: Despliegue Automatizado (Recomendado)

### 1.1 Preparar Archivos
```bash
# Crear directorio de despliegue
mkdir -p /tmp/hyr-deployment
cd /tmp/hyr-deployment

# Copiar archivos necesarios del desarrollo
scp -r user@dev-server:/path/to/HYR/scripts .
scp -r user@dev-server:/path/to/HYR/backend .
scp -r user@dev-server:/path/to/HYR/construction-admin .
scp user@dev-server:/path/to/HYR/backend/database/production-master-schema.sql .
```

### 1.2 Exportar Base de Datos (desde servidor de desarrollo)
```bash
cd /path/to/HYR
node scripts/database-export.js --compress true --validate true
```

### 1.3 Ejecutar Migración Automatizada
```bash
# Instalación completa con todos los servicios
sudo node scripts/server-migration.js \
  --installPostgreSQL true \
  --installNginx true \
  --setupSSL false \
  --domain "tu-dominio.com" \
  --workDir "/opt/hyr-system"

# O instalación mínima (solo Node.js y PostgreSQL)
sudo node scripts/server-migration.js \
  --installPostgreSQL true \
  --installNginx false \
  --setupSSL false
```

### 1.4 Verificar Instalación
```bash
# Verificar servicios
sudo systemctl status hyr-backend
sudo systemctl status hyr-frontend  
sudo systemctl status postgresql
sudo systemctl status nginx

# Probar API
curl http://localhost:3001/api/reports/executive-dashboard

# Verificar logs
tail -f /var/log/hyr-system/migration.log
```

---

## 🛠️ Método 2: Despliegue Manual

### 2.1 Instalar PostgreSQL

#### Ubuntu/Debian:
```bash
sudo apt update
sudo apt install -y postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

#### CentOS/RHEL:
```bash
sudo yum install -y postgresql-server postgresql-contrib
sudo postgresql-setup initdb
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### 2.2 Configurar Base de Datos
```bash
# Cambiar a usuario postgres
sudo -u postgres psql

-- Crear base de datos y usuario
CREATE DATABASE hyr_construction;
CREATE USER hyr_user WITH PASSWORD 'secure_password_here';
GRANT ALL PRIVILEGES ON DATABASE hyr_construction TO hyr_user;
ALTER USER hyr_user CREATEDB;
\q
```

### 2.3 Instalar Node.js
```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# CentOS/RHEL
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

# Verificar instalación
node --version
npm --version
```

### 2.4 Desplegar Aplicación
```bash
# Crear directorio de trabajo
sudo mkdir -p /opt/hyr-system/{backend,frontend,database,logs}
cd /opt/hyr-system

# Copiar archivos de aplicación
sudo cp -r /path/to/backend/* ./backend/
sudo cp -r /path/to/construction-admin/* ./frontend/

# Instalar dependencias backend
cd backend
sudo npm install --production

# Instalar dependencias frontend
cd ../frontend  
sudo npm install
sudo npm run build
```

### 2.5 Configurar Variables de Entorno
```bash
# Crear archivo .env para backend
sudo tee /opt/hyr-system/backend/.env << EOF
DATABASE_URL=postgresql://hyr_user:secure_password_here@localhost:5432/hyr_construction
DB_HOST=localhost
DB_PORT=5432
DB_NAME=hyr_construction
DB_USER=hyr_user
DB_PASSWORD=secure_password_here
NODE_ENV=production
PORT=3001
CORS_ORIGIN=http://localhost:3000
SESSION_SECRET=$(openssl rand -hex 32)
JWT_SECRET=$(openssl rand -hex 16)
EOF
```

### 2.6 Restaurar Esquema de Base de Datos
```bash
# Aplicar esquema maestro
psql postgresql://hyr_user:secure_password_here@localhost:5432/hyr_construction \
  -f /path/to/production-master-schema.sql

# O restaurar desde backup
psql postgresql://hyr_user:secure_password_here@localhost:5432/hyr_construction \
  -f /path/to/hyr-complete-YYYY-MM-DD.sql
```

---

## 🗄️ Configuración de Base de Datos

### 3.1 Aplicar Configuraciones de Producción
```bash
# Backup configuración original
sudo cp /etc/postgresql/13/main/postgresql.conf /etc/postgresql/13/main/postgresql.conf.backup

# Aplicar configuraciones optimizadas
sudo cp /path/to/config/postgresql-production.conf /etc/postgresql/13/main/postgresql.conf

# Verificar configuración
sudo -u postgres pg_lsclusters

# Reiniciar PostgreSQL
sudo systemctl restart postgresql
```

### 3.2 Configurar Autenticación
```bash
# Editar pg_hba.conf para permitir conexiones de la aplicación
sudo nano /etc/postgresql/13/main/pg_hba.conf

# Agregar línea al final:
# local   hyr_construction    hyr_user                        md5
# host    hyr_construction    hyr_user    127.0.0.1/32        md5

# Recargar configuración
sudo systemctl reload postgresql
```

### 3.3 Optimizaciones Específicas
```sql
-- Conectarse a la base de datos
psql -U hyr_user -d hyr_construction

-- Configurar autovacuum agresivo para tablas de alta actividad
ALTER TABLE time_entries SET (autovacuum_vacuum_scale_factor = 0.05);
ALTER TABLE expenses SET (autovacuum_vacuum_scale_factor = 0.05);
ALTER TABLE audit_events SET (autovacuum_vacuum_scale_factor = 0.02);

-- Configurar estadísticas detalladas
ALTER TABLE projects ALTER COLUMN budget_total SET STATISTICS 1000;
ALTER TABLE expenses ALTER COLUMN amount SET STATISTICS 1000;
ALTER TABLE time_entries ALTER COLUMN work_date SET STATISTICS 1000;

-- Habilitar extensión de estadísticas
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
```

---

## 🌐 Configuración de Nginx

### 4.1 Instalar Nginx
```bash
# Ubuntu/Debian
sudo apt install -y nginx

# CentOS/RHEL  
sudo yum install -y nginx

# Iniciar y habilitar
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 4.2 Configurar Virtual Host
```bash
# Crear configuración del sitio
sudo tee /etc/nginx/sites-available/hyr-system << 'EOF'
# Configuración HYR System
upstream hyr_backend {
    server localhost:3001;
    keepalive 32;
}

upstream hyr_frontend {
    server localhost:3000;
    keepalive 32;
}

server {
    listen 80;
    server_name tu-dominio.com;
    
    # Configuraciones de seguridad
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    
    # Compresión
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
    
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
        proxy_read_timeout 86400;
    }
    
    # Proxy para API backend
    location /api {
        proxy_pass http://hyr_backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300;
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
    }
    
    # Archivos estáticos
    location ~* \.(css|js|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

# Habilitar sitio
sudo ln -s /etc/nginx/sites-available/hyr-system /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Verificar configuración
sudo nginx -t

# Reiniciar Nginx
sudo systemctl restart nginx
```

---

## 🔐 SSL y Seguridad

### 5.1 Certificados Let's Encrypt (Recomendado)
```bash
# Instalar Certbot
sudo apt install -y certbot python3-certbot-nginx  # Ubuntu/Debian
sudo yum install -y certbot python3-certbot-nginx  # CentOS/RHEL

# Obtener certificado
sudo certbot --nginx -d tu-dominio.com

# Configurar renovación automática
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer

# Verificar renovación
sudo certbot renew --dry-run
```

### 5.2 Configuración de Firewall
```bash
# Ubuntu/Debian (UFW)
sudo ufw allow ssh
sudo ufw allow http
sudo ufw allow https
sudo ufw --force enable

# CentOS/RHEL (firewalld)
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

### 5.3 Servicios Systemd
```bash
# Crear servicio para backend
sudo tee /etc/systemd/system/hyr-backend.service << EOF
[Unit]
Description=HYR Backend API Service
After=network.target postgresql.service
Wants=postgresql.service

[Service]
Type=simple
User=nobody
WorkingDirectory=/opt/hyr-system/backend
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=hyr-backend
Environment=NODE_ENV=production
EnvironmentFile=/opt/hyr-system/backend/.env

[Install]
WantedBy=multi-user.target
EOF

# Crear servicio para frontend
sudo tee /etc/systemd/system/hyr-frontend.service << EOF
[Unit]
Description=HYR Frontend Service  
After=network.target
Requires=hyr-backend.service

[Service]
Type=simple
User=nobody
WorkingDirectory=/opt/hyr-system/frontend
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=hyr-frontend
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

# Habilitar e iniciar servicios
sudo systemctl daemon-reload
sudo systemctl enable hyr-backend hyr-frontend
sudo systemctl start hyr-backend hyr-frontend

# Verificar estado
sudo systemctl status hyr-backend
sudo systemctl status hyr-frontend
```

---

## 📊 Monitoreo y Mantenimiento

### 6.1 Logs del Sistema
```bash
# Ver logs en tiempo real
sudo journalctl -fu hyr-backend
sudo journalctl -fu hyr-frontend
sudo journalctl -fu postgresql
sudo journalctl -fu nginx

# Logs de aplicación
tail -f /var/log/hyr-system/*.log

# Logs de PostgreSQL
tail -f /var/log/postgresql/postgresql-*.log
```

### 6.2 Monitoreo de Base de Datos
```sql
-- Conectarse a la BD
psql -U hyr_user -d hyr_construction

-- Consultas más lentas
SELECT query, calls, total_time, mean_time 
FROM pg_stat_statements 
ORDER BY total_time DESC LIMIT 10;

-- Estadísticas de tablas
SELECT schemaname, tablename, n_tup_ins, n_tup_upd, n_tup_del, n_live_tup
FROM pg_stat_user_tables 
ORDER BY n_live_tup DESC;

-- Conexiones activas
SELECT count(*) as active_connections, state
FROM pg_stat_activity 
WHERE datname = 'hyr_construction'
GROUP BY state;

-- Tamaño de base de datos
SELECT pg_size_pretty(pg_database_size('hyr_construction')) as db_size;
```

### 6.3 Scripts de Backup Automático
```bash
# Crear script de backup
sudo tee /opt/hyr-system/scripts/backup-db.sh << 'EOF'
#!/bin/bash

BACKUP_DIR="/opt/hyr-backups"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="hyr_construction"
DB_USER="hyr_user"

# Crear directorio si no existe
mkdir -p $BACKUP_DIR

# Hacer backup
pg_dump -h localhost -U $DB_USER -d $DB_NAME \
  --no-owner --no-privileges \
  -f $BACKUP_DIR/hyr-backup-$DATE.sql

# Comprimir backup
gzip $BACKUP_DIR/hyr-backup-$DATE.sql

# Eliminar backups de más de 30 días
find $BACKUP_DIR -name "hyr-backup-*.sql.gz" -mtime +30 -delete

echo "Backup completado: hyr-backup-$DATE.sql.gz"
EOF

# Hacer ejecutable
sudo chmod +x /opt/hyr-system/scripts/backup-db.sh

# Agregar a crontab (backup diario a las 2 AM)
echo "0 2 * * * /opt/hyr-system/scripts/backup-db.sh >> /var/log/hyr-system/backup.log 2>&1" | sudo crontab -
```

### 6.4 Monitoreo de Rendimiento
```bash
# Script de monitoreo básico
sudo tee /opt/hyr-system/scripts/monitor.sh << 'EOF'
#!/bin/bash

echo "=== HYR System Status - $(date) ==="

# Servicios
echo "Backend Service:" $(systemctl is-active hyr-backend)
echo "Frontend Service:" $(systemctl is-active hyr-frontend) 
echo "PostgreSQL:" $(systemctl is-active postgresql)
echo "Nginx:" $(systemctl is-active nginx)

# Recursos del sistema
echo -e "\n=== System Resources ==="
echo "CPU Usage:" $(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)%
echo "Memory:" $(free -h | awk '/Mem:/ {print $3 "/" $2}')
echo "Disk:" $(df -h / | awk 'NR==2 {print $3 "/" $2 " (" $5 ")"}')

# Conexiones de base de datos
echo -e "\n=== Database Connections ==="
DB_CONNECTIONS=$(psql -U hyr_user -d hyr_construction -t -c "SELECT count(*) FROM pg_stat_activity WHERE datname = 'hyr_construction';")
echo "Active connections: $DB_CONNECTIONS"

# Test de conectividad API
echo -e "\n=== API Health Check ==="
if curl -s http://localhost:3001/api/reports/executive-dashboard > /dev/null; then
    echo "API Status: OK"
else
    echo "API Status: ERROR"
fi

echo "================================"
EOF

# Hacer ejecutable
sudo chmod +x /opt/hyr-system/scripts/monitor.sh

# Ejecutar cada 5 minutos
echo "*/5 * * * * /opt/hyr-system/scripts/monitor.sh >> /var/log/hyr-system/monitor.log 2>&1" | sudo crontab -
```

---

## 🔧 Resolución de Problemas

### 7.1 Problemas Comunes

#### Backend no inicia:
```bash
# Verificar logs
sudo journalctl -fu hyr-backend

# Verificar configuración de BD
psql -U hyr_user -d hyr_construction -c "SELECT 1;"

# Verificar puerto
sudo netstat -tlnp | grep 3001

# Verificar permisos
sudo chown -R nobody:nobody /opt/hyr-system/backend
```

#### Frontend no carga:
```bash
# Verificar estado del servicio
sudo systemctl status hyr-frontend

# Rebuild si es necesario
cd /opt/hyr-system/frontend
sudo npm run build
sudo systemctl restart hyr-frontend
```

#### PostgreSQL lento:
```bash
# Verificar configuraciones
sudo -u postgres psql -c "SHOW shared_buffers;"
sudo -u postgres psql -c "SHOW work_mem;"

# Ejecutar análisis
sudo -u postgres psql -d hyr_construction -c "VACUUM ANALYZE;"

# Verificar fragmentación
sudo -u postgres psql -d hyr_construction -c "
SELECT schemaname, tablename, attname, n_distinct, correlation
FROM pg_stats 
WHERE schemaname = 'public' 
ORDER BY abs(correlation) DESC LIMIT 10;"
```

### 7.2 Comandos de Emergencia

#### Reiniciar todo el sistema:
```bash
sudo systemctl restart postgresql
sudo systemctl restart hyr-backend
sudo systemctl restart hyr-frontend
sudo systemctl restart nginx
```

#### Restaurar desde backup:
```bash
# Parar servicios
sudo systemctl stop hyr-backend hyr-frontend

# Restaurar BD
gunzip -c /opt/hyr-backups/hyr-backup-YYYYMMDD_HHMMSS.sql.gz | \
  psql -U hyr_user -d hyr_construction

# Reiniciar servicios
sudo systemctl start hyr-backend hyr-frontend
```

#### Limpieza de logs:
```bash
# Rotar logs de sistema
sudo journalctl --rotate
sudo journalctl --vacuum-time=7d

# Limpiar logs de aplicación
find /var/log/hyr-system -name "*.log" -mtime +7 -exec rm {} \;
```

---

## 📋 Lista de Verificación Post-Instalación

### ✅ Verificaciones Técnicas
- [ ] PostgreSQL corriendo y accesible
- [ ] Backend API respondiendo en puerto 3001
- [ ] Frontend cargando correctamente
- [ ] Nginx proxy funcionando (si aplica)
- [ ] SSL configurado correctamente (si aplica)
- [ ] Firewall configurado
- [ ] Servicios systemd habilitados
- [ ] Backups automáticos configurados

### ✅ Verificaciones Funcionales
- [ ] Login al sistema funciona
- [ ] Dashboard principal carga datos
- [ ] Gestión de empleados operativa
- [ ] Gestión de proyectos operativa  
- [ ] Sistema de nómina calculando correctamente
- [ ] Reportes ejecutivos funcionando
- [ ] Gestión de gastos operativa

### ✅ URLs de Prueba
```bash
# API Health Check
curl http://localhost:3001/api/reports/executive-dashboard

# Frontend
curl http://localhost:3000/

# Nginx (si aplica)
curl http://tu-dominio.com/

# HTTPS (si aplica)
curl https://tu-dominio.com/
```

---

## 📞 Soporte y Contacto

### Documentación Técnica
- **Esquema de BD:** `/opt/hyr-system/database/production-master-schema.sql`
- **Configuración:** `/opt/hyr-system/backend/.env`
- **Logs:** `/var/log/hyr-system/`

### Comandos Útiles de Administración
```bash
# Estado general del sistema
sudo /opt/hyr-system/scripts/monitor.sh

# Backup manual
sudo /opt/hyr-system/scripts/backup-db.sh

# Ver logs en tiempo real
sudo journalctl -fu hyr-backend

# Reiniciar servicios HYR
sudo systemctl restart hyr-backend hyr-frontend
```

### Información del Sistema
- **Versión:** HYR Sistema Empresarial 2.0.0
- **Base de Datos:** PostgreSQL con nómina colombiana 2024
- **Stack:** Node.js + Express + Next.js + PostgreSQL
- **Cumplimiento:** Normativa fiscal colombiana DIAN/UGPP

---

> **⚠️ Importante:** Guardar credenciales de base de datos en lugar seguro y realizar backups regulares antes de actualizaciones importantes.

---

**🎉 ¡Sistema HYR desplegado exitosamente!**

*Última actualización: 2025-01-01*