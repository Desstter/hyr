# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Architecture Overview

This is a full-stack construction management system for HYR Constructora & Soldadura with Colombian payroll compliance features.

**Project Structure:**
- `frontend/` - Next.js 15 app with TypeScript, Tailwind CSS, and shadcn/ui
- `backend/` - Express.js API server with PostgreSQL database

## Development Commands

### Backend (Node.js/Express)
```bash
cd backend
npm run dev          # Start development server with nodemon
npm start           # Start production server  
npm run setup       # Initialize database schema
npm run lint        # Run ESLint
```

### Frontend (Next.js)
```bash  
cd frontend
npm run dev         # Start development server with Turbopack
npm run build       # Build for production with Turbopack
npm start          # Start production server
npm run lint       # Run ESLint
```

### Development Workflow
1. Backend runs on `localhost:3001` 
2. Frontend runs on `localhost:3000`
3. Frontend proxy configured via `appConfig.ts` to route API calls to backend in development

## Key Architecture Patterns

### Frontend Architecture
- **App Router**: Next.js 13+ app directory structure
- **Component Library**: shadcn/ui with Radix UI primitives
- **State Management**: Zustand for global state, React Hook Form for forms
- **Styling**: Tailwind CSS with CSS custom properties for theming
- **Configuration**: Runtime config via `appConfig.ts` and dynamic settings from API
- **Hooks Personalizados**: Sistema de configuración dinámica en `lib/hooks/`

### Backend Architecture
- **Database**: PostgreSQL with connection pooling via `pg`
- **API Routes**: Organized by domain in `/routes` directory
- **Security**: Environment variables for database credentials
- **Database Schema**: Located in `/database` with migrations and seeds

### Key Modules

**Frontend (`frontend/src/`):**
- `app/` - Next.js app router pages and layouts
- `components/ui/` - shadcn/ui component library
- `components/[domain]/` - Domain-specific components (expenses, payroll, etc.)
- `lib/api/` - API client functions (settings, simulator, etc.)
- `lib/hooks/` - Custom hooks para configuración dinámica
- `lib/appConfig.ts` - Runtime configuration management
- `store/` - Zustand global state stores

**Backend (`backend/`):**
- `routes/` - Express route handlers organized by domain
- `database/` - Schema, migrations, and database connection
- `middleware/` - Express middleware functions
- `utils/` - Shared utility functions

### Domain Areas
- **Personnel Management**: Employee data, contractors, assignments
- **Payroll**: Colombian payroll calculations with DIAN/PILA compliance
- **Project Management**: Client projects, budget items, calendar
- **Expenses**: Expense tracking and reporting
- **Compliance**: Colombian tax and social security compliance
- **Reports**: PDF generation and data export

### Important Implementation Details

**Database Connection:**
- Uses environment variables for credentials (never hardcoded)
- Connection config in `backend/database/connection.js`
- Schema files for different environments in `database/` directory

**API Communication:**
- Frontend uses dynamic API URLs via `appConfig.ts`
- Development: Direct calls to `localhost:3001`
- Production: Proxy through Next.js server
- **Settings API**: Configuraciones dinámicas centralizadas
- **Fallbacks**: Sistema de valores por defecto seguros si API falla

**Colombian Payroll Features:**
- DIAN (tax authority) integration
- PILA (social security) CSV exports  
- Compliance with Colombian labor law calculations

**UI Components:**
- Built on shadcn/ui design system
- Responsive design with mobile-first approach
- Error boundaries for graceful error handling
- Toast notifications via Sonner

### Testing & Quality
- ESLint configured for both frontend and backend
- TypeScript strict mode enabled
- No test framework currently configured - verify testing approach before adding tests

### Environment Setup
Backend requires these environment variables:
- `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_PORT`
- Database setup via `npm run setup` after environment configuration
- Siempre esta corriendo el fronted en el puerto 3000, y el backend en el 3001, si requieres hacer un cambio de backend, mata el puerto 3001 y vuelve a correr en el mismo con node server.js

## Sistema de Configuración Dinámico

El sistema implementa configuraciones dinámicas centralizadas que eliminan datos hardcodeados del código fuente.

### Configuraciones Disponibles

**Configuraciones Empresariales (`business_profile`):**
- Información de la empresa (nombre, contacto, email, teléfono)
- Datos fiscales (NIT, dirección, sitio web)
- Se utilizan en sidebar, topbar y reportes

**Configuraciones DIAN (`dian_settings`):**
- Resolución DIAN para facturación electrónica
- Ambiente (producción/habilitación)
- Tipo de XML y configuraciones de compliance

**Configuraciones de Sistema:**
- `theme_settings`: Configuraciones de interfaz y tema
- `app_preferences`: Preferencias generales de la aplicación  
- `notification_settings`: Configuración de notificaciones
- `payroll_settings`: Configuraciones específicas de nómina colombiana

### Hooks Personalizados

**Frontend (`frontend/src/lib/hooks/`):**
- `useCompanySettings()`: Hook principal para configuraciones de empresa
- `useBusinessProfile()`: Hook específico para perfil empresarial  
- `useDianSettings()`: Hook para configuraciones DIAN

**Características:**
- Fallbacks seguros si no se encuentran configuraciones
- Carga asíncrona con estados de loading/error
- Actualización reactiva en tiempo real

### API Endpoints de Configuración

**Gestión de Configuraciones:**
```bash
GET    /api/settings                    # Obtener todas las configuraciones
GET    /api/settings/:key               # Obtener configuración específica
POST   /api/settings                    # Crear nueva configuración
PUT    /api/settings/:key               # Actualizar configuración
DELETE /api/settings/:key               # Eliminar configuración
```

**Configuraciones por Categoría:**
```bash
GET /api/settings/category/:category    # Obtener por categoría
POST /api/settings/bulk-update          # Actualización masiva
POST /api/settings/reset/:key           # Resetear a valores por defecto
```

### Scripts de Utilidad

**Inicialización de Configuraciones:**
```bash
cd backend
node create-settings.js                 # Crear configuraciones por defecto via API
node init-default-settings.js           # Crear configuraciones directamente en BD
```

**Configuraciones por Defecto Creadas:**
- business_profile: Datos de HYR Constructora & Soldadura
- dian_settings: Resolución DIAN y configuración fiscal
- theme_settings: Configuración de interfaz
- app_preferences: Preferencias generales
- notification_settings: Configuración de notificaciones
- payroll_settings: Configuración nómina colombiana

## Simulador de Costos - API Real

El simulador de costos ha sido actualizado para usar APIs reales en lugar de localStorage.

### API Endpoints del Simulador
```bash
GET  /api/simulator/templates           # Obtener templates disponibles
GET  /api/simulator/presets/:type       # Obtener presets por tipo de template
POST /api/simulator/calculate           # Calcular estimación de costos
POST /api/simulator/save-estimation     # Guardar estimación en BD
GET  /api/simulator/saved-estimations   # Obtener estimaciones guardadas
```

### Funcionalidades Implementadas
- **Cálculo Real**: Usa factores prestacionales colombianos
- **Persistencia**: Estimaciones guardadas en PostgreSQL  
- **Templates**: Presets predefinidos para construcción y soldadura
- **Integración**: Conversión directa a proyectos reales

### Migración de localStorage
- ❌ **Antes**: `localStorage.setItem('cost-estimates', data)`
- ✅ **Ahora**: `await saveEstimation(data)` → PostgreSQL

## Seguridad y Compliance

### Eliminación de Datos Hardcodeados
- ❌ **Eliminado**: Función `_generateMockXML` con datos sensibles
- ❌ **Eliminado**: NIT y razón social hardcodeados en código
- ❌ **Eliminado**: Resolución DIAN hardcodeada
- ✅ **Implementado**: Configuración dinámica desde BD

### Datos Sensibles Protegidos
- Información empresarial en configuraciones cifradas
- Credenciales en variables de entorno
- Resoluciones DIAN centralizadas y auditables

## Comandos de Desarrollo Actualizados

### Gestión de Configuraciones
```bash
# Inicializar configuraciones por defecto (ejecutar una vez)
cd backend && node create-settings.js

# Verificar configuraciones en BD
curl http://localhost:3001/api/settings

# Verificar configuración específica
curl http://localhost:3001/api/settings/business_profile
curl http://localhost:3001/api/settings/dian_settings
```

### Desarrollo Frontend
```bash
cd frontend
npm run dev           # Con configuraciones dinámicas activas
npm run build         # Build con verificación de configuraciones
```

### Simulador de Costos
```bash
# Verificar templates disponibles
curl http://localhost:3001/api/simulator/templates

# Verificar presets de construcción
curl http://localhost:3001/api/simulator/presets/construction
```

## Notas Importantes

### Configuración Inicial
1. Asegurar que el backend esté corriendo (`node server.js` en puerto 3001)
2. Ejecutar `node create-settings.js` para crear configuraciones por defecto
3. Verificar que las configuraciones se crearon correctamente
4. El frontend automáticamente cargará las configuraciones dinámicas

### Troubleshooting
- **Error "business_profile no encontrada"**: Ejecutar `node create-settings.js`
- **Error "DIAN settings no encontrada"**: Verificar que el script de configuraciones se ejecutó
- **LocalStorage en simulator**: Verificar que se está usando la API real, no localStorage

### Migración de Datos Hardcodeados
- ✅ Todos los datos hardcodeados han sido eliminados
- ✅ Sistema de configuración centralizado implementado  
- ✅ Fallbacks seguros para configuraciones faltantes
- ✅ API del simulador completamente funcional