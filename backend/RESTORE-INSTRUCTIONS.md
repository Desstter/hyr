# 📚 Instrucciones de Restauración - Base de Datos HYR

Guía completa para restaurar la base de datos HYR Constructora & Soldadura en tu servidor.

---

## 📋 Tabla de Contenidos

1. [Requisitos Previos](#requisitos-previos)
2. [Método 1: Restauración Automatizada (pg_dump)](#método-1-restauración-automatizada-pg_dump)
3. [Método 2: Restauración Manual (SQL)](#método-2-restauración-manual-sql)
4. [Verificación Post-Restauración](#verificación-post-restauración)
5. [Troubleshooting](#troubleshooting)

---

## ✅ Requisitos Previos

### En tu máquina local:
- ✅ PostgreSQL instalado con `pg_dump` disponible
- ✅ Acceso a la base de datos `hyr_construction`
- ✅ Conexión a la base de datos funcionando

### En tu servidor:
- ✅ PostgreSQL 12+ instalado
- ✅ Acceso con permisos de superusuario (`postgres`)
- ✅ Suficiente espacio en disco (~500MB recomendado)
- ✅ Puerto 5432 accesible (o el puerto configurado)

---

## 🚀 Método 1: Restauración Automatizada (pg_dump)

**Recomendado para backup completo con estructura + datos**

### Paso 1: Exportar desde tu máquina local

**Opción A - Usando el script batch (Windows):**

```batch
cd C:\Users\Usuario\Desktop\HYR\backend
export-database.bat
```

Esto generará un archivo: `hyr_database_backup_YYYYMMDD_HHMMSS.sql`

**Opción B - Comando manual:**

```bash
# Windows
pg_dump -h localhost -p 5432 -U postgres -d hyr_construction ^
  --clean --create --if-exists --no-owner --no-privileges ^
  --encoding=UTF8 --file=hyr_backup.sql

# Linux/Mac
pg_dump -h localhost -p 5432 -U postgres -d hyr_construction \
  --clean --create --if-exists --no-owner --no-privileges \
  --encoding=UTF8 --file=hyr_backup.sql
```

### Paso 2: Transferir archivo al servidor

```bash
# Usando SCP (Linux/Mac)
scp hyr_backup.sql usuario@tu-servidor.com:/tmp/

# Usando WinSCP o FileZilla (Windows)
# Subir manualmente el archivo al servidor
```

### Paso 3: Restaurar en el servidor

```bash
# Conectarse al servidor
ssh usuario@tu-servidor.com

# Restaurar la base de datos
psql -U postgres -d postgres -f /tmp/hyr_backup.sql

# O si prefieres con variables de entorno:
export PGPASSWORD='tu_password'
psql -h localhost -U postgres -d postgres -f /tmp/hyr_backup.sql
```

---

## 🔧 Método 2: Restauración Manual (SQL)

**Útil cuando no tienes acceso a pg_dump o prefieres control total**

### Paso 1: Subir archivos al servidor

Archivos necesarios:
- `hyr-database-complete-backup.sql` (estructura completa)
- Archivos de datos (exportados manualmente, ver abajo)

### Paso 2: Crear estructura de base de datos

```bash
# En el servidor
psql -U postgres -d postgres -f hyr-database-complete-backup.sql
```

Este comando creará:
- ✅ Base de datos `hyr_construction`
- ✅ Todas las tablas con sus constraints
- ✅ Todos los índices
- ✅ Todas las funciones y triggers
- ✅ Datos iniciales de configuración

### Paso 3: Exportar datos desde tu máquina local

**Opción A - Exportar todas las tablas a CSV:**

```sql
-- Conectarse a la base de datos local
psql -U postgres -d hyr_construction

-- Exportar cada tabla
\copy clients TO 'clients.csv' CSV HEADER;
\copy personnel TO 'personnel.csv' CSV HEADER;
\copy projects TO 'projects.csv' CSV HEADER;
\copy budget_items TO 'budget_items.csv' CSV HEADER;
\copy cost_estimations TO 'cost_estimations.csv' CSV HEADER;
\copy time_entries TO 'time_entries.csv' CSV HEADER;
\copy expenses TO 'expenses.csv' CSV HEADER;
\copy payroll_periods TO 'payroll_periods.csv' CSV HEADER;
\copy payroll_details TO 'payroll_details.csv' CSV HEADER;
\copy company_settings TO 'company_settings.csv' CSV HEADER;
\copy settings TO 'settings.csv' CSV HEADER;
\copy tax_tables TO 'tax_tables.csv' CSV HEADER;
\copy electronic_invoices TO 'electronic_invoices.csv' CSV HEADER;
\copy dian_payroll_documents TO 'dian_payroll_documents.csv' CSV HEADER;
\copy pila_submissions TO 'pila_submissions.csv' CSV HEADER;
\copy contractors TO 'contractors.csv' CSV HEADER;
\copy document_support TO 'document_support.csv' CSV HEADER;
\copy calendar_events TO 'calendar_events.csv' CSV HEADER;
\copy payroll_events TO 'payroll_events.csv' CSV HEADER;
\copy project_events TO 'project_events.csv' CSV HEADER;
\copy event_notifications TO 'event_notifications.csv' CSV HEADER;
\copy audit_events TO 'audit_events.csv' CSV HEADER;
```

**Opción B - Exportar solo datos con pg_dump:**

```bash
pg_dump -h localhost -U postgres -d hyr_construction --data-only --file=hyr_data.sql
```

### Paso 4: Importar datos en el servidor

**Si usaste CSV:**

```bash
# Subir los archivos CSV al servidor
scp *.csv usuario@tu-servidor.com:/tmp/

# En el servidor, conectarse a la base de datos
psql -U postgres -d hyr_construction

# Importar cada tabla (en orden de dependencias)
\copy clients FROM '/tmp/clients.csv' CSV HEADER;
\copy personnel FROM '/tmp/personnel.csv' CSV HEADER;
\copy projects FROM '/tmp/projects.csv' CSV HEADER;
\copy budget_items FROM '/tmp/budget_items.csv' CSV HEADER;
\copy cost_estimations FROM '/tmp/cost_estimations.csv' CSV HEADER;
\copy payroll_periods FROM '/tmp/payroll_periods.csv' CSV HEADER;
\copy time_entries FROM '/tmp/time_entries.csv' CSV HEADER;
\copy expenses FROM '/tmp/expenses.csv' CSV HEADER;
\copy payroll_details FROM '/tmp/payroll_details.csv' CSV HEADER;
-- ... continuar con todas las tablas
```

**Si usaste pg_dump --data-only:**

```bash
psql -U postgres -d hyr_construction -f hyr_data.sql
```

---

## ✔️ Verificación Post-Restauración

### Verificar que la base de datos existe:

```sql
psql -U postgres -d postgres -c "\l hyr_construction"
```

### Verificar tablas creadas:

```sql
psql -U postgres -d hyr_construction -c "\dt"
```

Deberías ver 22 tablas:
- `clients`, `personnel`, `projects`, `budget_items`, `cost_estimations`
- `time_entries`, `expenses`, `payroll_periods`, `payroll_details`
- `company_settings`, `settings`, `tax_tables`
- `electronic_invoices`, `dian_payroll_documents`, `pila_submissions`
- `contractors`, `document_support`
- `calendar_events`, `payroll_events`, `project_events`
- `event_notifications`, `audit_events`

### Verificar datos importados:

```sql
psql -U postgres -d hyr_construction -c "
SELECT
  'clients' as tabla, COUNT(*) as registros FROM clients
UNION ALL
SELECT 'personnel', COUNT(*) FROM personnel
UNION ALL
SELECT 'projects', COUNT(*) FROM projects
UNION ALL
SELECT 'settings', COUNT(*) FROM settings;
"
```

### Verificar funciones y triggers:

```sql
psql -U postgres -d hyr_construction -c "\df"
psql -U postgres -d hyr_construction -c "
SELECT tgname, tgrelid::regclass
FROM pg_trigger
WHERE tgisinternal = false;
"
```

### Verificar configuraciones:

```sql
psql -U postgres -d hyr_construction -c "
SELECT key, category FROM settings ORDER BY category, key;
"
```

Deberías ver 6 configuraciones:
- `business_profile` (company)
- `dian_settings` (compliance)
- `theme_settings` (ui)
- `app_preferences` (general)
- `notification_settings` (notifications)
- `payroll_settings` (payroll)

---

## 🔍 Troubleshooting

### Error: "database already exists"

```sql
-- Eliminar base de datos existente (⚠️ CUIDADO: borra todos los datos)
psql -U postgres -d postgres -c "DROP DATABASE IF EXISTS hyr_construction;"

-- Luego volver a ejecutar el script de restauración
```

### Error: "permission denied"

```bash
# Asegurar que el usuario postgres tiene permisos
sudo -u postgres psql -d postgres -f hyr_backup.sql
```

### Error: "role does not exist"

```sql
-- Crear rol si no existe
psql -U postgres -d postgres -c "
CREATE ROLE hyr_app_user WITH LOGIN PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE hyr_construction TO hyr_app_user;
"
```

### Error: "encoding mismatch"

```sql
-- Recrear base de datos con encoding correcto
psql -U postgres -d postgres -c "
DROP DATABASE IF EXISTS hyr_construction;
CREATE DATABASE hyr_construction
  WITH ENCODING='UTF8' LC_COLLATE='es_CO.UTF-8' LC_CTYPE='es_CO.UTF-8';
"
```

### Error al importar datos: "duplicate key value"

```sql
-- Limpiar datos existentes antes de importar
psql -U postgres -d hyr_construction -c "
TRUNCATE TABLE audit_events, event_notifications, project_events,
  payroll_events, calendar_events, document_support, contractors,
  pila_submissions, dian_payroll_documents, electronic_invoices,
  payroll_details, payroll_periods, time_entries, expenses,
  budget_items, cost_estimations, projects, personnel, clients
  CASCADE;
"
```

### Verificar logs de PostgreSQL:

```bash
# En Linux
sudo tail -f /var/log/postgresql/postgresql-*.log

# En Windows
# Revisar en: C:\Program Files\PostgreSQL\<version>\data\log\
```

---

## 🔐 Configuración de Seguridad Post-Restauración

### Crear usuario de aplicación:

```sql
CREATE ROLE hyr_app_user WITH LOGIN PASSWORD 'cambiar_este_password_seguro';

GRANT CONNECT ON DATABASE hyr_construction TO hyr_app_user;
GRANT USAGE ON SCHEMA public TO hyr_app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO hyr_app_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO hyr_app_user;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO hyr_app_user;
```

### Configurar variables de entorno en el servidor:

```bash
# Crear archivo .env en el directorio del backend
cat > /ruta/a/backend/.env << 'EOF'
DB_HOST=localhost
DB_PORT=5432
DB_NAME=hyr_construction
DB_USER=hyr_app_user
DB_PASSWORD=cambiar_este_password_seguro
NODE_ENV=production
EOF

# Asegurar permisos
chmod 600 /ruta/a/backend/.env
```

---

## 📊 Optimización Post-Restauración

### Actualizar estadísticas:

```sql
psql -U postgres -d hyr_construction -c "ANALYZE;"
```

### Reindexar tablas:

```sql
psql -U postgres -d hyr_construction -c "REINDEX DATABASE hyr_construction;"
```

### Vacuum completo:

```sql
psql -U postgres -d hyr_construction -c "VACUUM FULL ANALYZE;"
```

---

## 📞 Soporte

Si encuentras problemas durante la restauración:

1. ✅ Verifica los logs de PostgreSQL
2. ✅ Asegúrate de que la versión de PostgreSQL sea compatible (12+)
3. ✅ Verifica permisos de usuario y archivos
4. ✅ Confirma que el encoding sea UTF-8

---

## 🎉 ¡Restauración Completa!

Una vez verificada la restauración, tu base de datos HYR estará lista para:

- ✅ Conectar tu aplicación backend (Node.js/Express)
- ✅ Gestión completa de personal y proyectos
- ✅ Cálculos automáticos de nómina colombiana 2024
- ✅ Compliance con DIAN y PILA
- ✅ Sistema de calendario y eventos
- ✅ Reportes y analytics empresariales

**Siguiente paso:** Configurar el backend para conectarse a la base de datos del servidor actualizando las variables de entorno en `/backend/.env`