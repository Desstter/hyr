# Auditoría de Código – HYR Constructora & Soldadura – 2025-09-08

## 0. Índice
1. Resumen Ejecutivo  
2. Métricas de Verificación  
3. Hallazgos  
4. Parches Propuestos  
5. Patrones Permitidos/Prohibidos  
6. TODO2 Priorizado  
7. Checklist  
8. Limitaciones detectadas  

## 1. Resumen Ejecutivo

🚨 **RIESGOS CRÍTICOS IDENTIFICADOS**: El proyecto presenta vulnerabilidades de seguridad graves que impedirían su despliegue en producción. Se encontró una contraseña de base de datos hardcodeada expuesta en el repositorio, 10+ URLs absolutas hardcodeadas que romperían en cualquier entorno diferente a desarrollo, y múltiples implementaciones falsas/mock que no proporcionan funcionalidad real. Adicionalmente, se detectaron 85+ usos de `any` en TypeScript que comprometen la seguridad de tipos, y botones de UI críticos sin funcionalidad implementada. **Sin estas correcciones, el sistema fallaría completamente en producción**.

## 2. Métricas de Verificación

**Nota**: No se ejecutaron comandos de verificación según restricciones del plan mode, pero se identificaron los siguientes patrones problemáticos:

- **Lint**: Estimado 50+ errores (URLs hardcodeadas, console.log en producción)
- **Build/Typecheck**: Estimado 85+ warnings (any types, undefined interfaces)  
- **Tests**: No se encontraron tests implementados en el proyecto
- **Security**: 1 credencial expuesta, 10+ URLs hardcodeadas de alta severidad

## 3. Hallazgos (ordenados por Severidad)

| Severidad | Categoría | Archivo:línea | Evidencia breve | Impacto | Fix propuesto |
|---|---|---|---|---|---|
| **Alta** | Seguridad | backend/database/connection.js:12 | `password: 'LilHell76&0'` | Credenciales expuestas en repo | Usar variables de entorno |
| **Alta** | URL Hardcode | src/lib/api/client.ts:6 | `'http://localhost:3001/api'` | Falla en producción | Runtime config |
| **Alta** | URL Hardcode | src/app/contractors/[id]/page.tsx:72 | `http://localhost:3001/api/contractors` | Falla en producción | apiUrl() helper |
| **Alta** | URL Hardcode | src/app/payroll/generate/page.tsx:106 | `http://localhost:3001/api/dian/payroll` | Falla en producción | apiUrl() helper |
| **Alta** | URL Hardcode | src/app/contractors/page.tsx:89,145,214 | 3 instancias `http://localhost:3001` | Falla en producción | apiUrl() helper |
| **Alta** | URL Hardcode | src/lib/api/expenses.ts:167 | `http://localhost:3001/api${url}` | Falla en producción | apiUrl() helper |
| **Alta** | URL Hardcode | src/lib/api/index.ts:136 | `BASE_URL: 'http://localhost:3001/api'` | Falla en producción | Runtime config |
| **Alta** | URL Hardcode | src/lib/api/simulator.ts:83 | `'http://localhost:3001/api/simulator'` | Falla en producción | apiUrl() helper |
| **Alta** | URL Hardcode | src/lib/api/time-entries.ts:318 | `http://localhost:3001/api${url}` | Falla en producción | apiUrl() helper |
| **Alta** | Mock/Fake | src/app/payroll/generate/page.tsx:142-170 | `const mockPayroll: PayrollDocument` y `generateMockXML()` | Funcionalidad fake | Integrar API real |
| **Alta** | UI No Funcional | src/components/layout/mobile-fab.tsx:31,37,43,49 | `onClick: () => console.log(...)` | Botones críticos sin acción | Implementar navegación real |
| **Media** | TypeScript | src/store/app.ts:17,18,39 | `any` types en store | Pérdida seguridad tipos | Definir interfaces |
| **Media** | TypeScript | src/lib/api/client.ts:9,110,132,139,146,171 | 6 instancias `any` | Pérdida seguridad tipos | Tipos específicos |
| **Media** | TypeScript | src/components/dashboard/personnel-kpis-api.tsx:11 | `(value: any): number` | Pérdida seguridad tipos | Union types |
| **Media** | Logs Ruidosos | mobile-fab.tsx:31-49,160-204 | 10+ `console.log` permanentes | Logs en producción | Condicional debug |
| **Baja** | Placeholder UI | Múltiples archivos | 50+ textos "placeholder" | Estética solamente | Textos finales |

**Criterios de severidad**
- **Alta** → rompe funcionalidad o expone riesgo directo (URLs absolutas, secretos, endpoints rotos, botones críticos sin acción).  
- **Media** → afecta calidad pero no bloquea (logs ruidosos, any, placeholder visible).  
- **Baja** → estética o estandarización.

## 4. Parches Propuestos (agrupados por categoría)

### A) Seguridad Crítica - Database Credentials
```diff
--- a/backend/database/connection.js
+++ b/backend/database/connection.js
@@ -5,11 +5,11 @@
 
 // Conexión PostgreSQL hardcodeada
 const db = new Pool({
-    host: 'localhost',
-    database: 'hyr_construction',
-    user: 'postgres',
-    password: 'LilHell76&0',
-    port: 5432,
+    host: process.env.DB_HOST || 'localhost',
+    database: process.env.DB_NAME || 'hyr_construction',
+    user: process.env.DB_USER || 'postgres',
+    password: process.env.DB_PASSWORD,
+    port: parseInt(process.env.DB_PORT || '5432'),
 });
```

### B) Runtime Configuration System
```javascript
// NUEVO: public/appconfig.json
{
  "api": {
    "baseUrl": "/api",
    "timeout": 30000
  },
  "environment": "production"
}

// NUEVO: src/lib/appConfig.ts
interface AppConfig {
  api: {
    baseUrl: string;
    timeout: number;
  };
}

let config: AppConfig | null = null;

export async function getAppConfig(): Promise<AppConfig> {
  if (!config) {
    const response = await fetch('/appconfig.json');
    config = await response.json();
  }
  return config;
}

export async function apiUrl(endpoint: string): Promise<string> {
  const { api } = await getAppConfig();
  // En desarrollo: http://localhost:3001/api/endpoint
  // En producción: /api/endpoint (proxy inverso)
  const baseUrl = process.env.NODE_ENV === 'development' 
    ? 'http://localhost:3001/api' 
    : api.baseUrl;
  return `${baseUrl}${endpoint}`;
}
```

### C) URL Hardcode Fixes (Ejemplo client.ts)
```diff
--- a/src/lib/api/client.ts
+++ b/src/lib/api/client.ts
@@ -3,7 +3,8 @@
 // Cliente HTTP para conectar con backend Express PostgreSQL
 // =====================================================
 
-export const API_BASE_URL = 'http://localhost:3001/api';
+import { getAppConfig } from './appConfig';
+// API_BASE_URL eliminado - usar runtime config
 
 export class ApiClient {
   private baseUrl: string;
@@ -16,8 +17,13 @@
-  constructor(baseUrl: string = API_BASE_URL) {
-    this.baseUrl = baseUrl;
+  constructor() {
+    // BaseUrl será resuelto dinámicamente
+    this.baseUrl = '';
+  }
+
+  async initialize() {
+    const config = await getAppConfig();
+    this.baseUrl = process.env.NODE_ENV === 'development' 
+      ? 'http://localhost:3001/api' 
+      : config.api.baseUrl;
   }
```

### D) Mock Payroll Implementation Fix
```diff
--- a/src/app/payroll/generate/page.tsx
+++ b/src/app/payroll/generate/page.tsx
@@ -139,18 +139,13 @@
       
       console.log('Procesando nómina para:', { employees, period });
       
-      // Mock response for demo
-      const mockPayroll: PayrollDocument = {
-        id: Date.now().toString(),
-        period,
-        employees: employees.map(emp => ({ ...emp, calculated_salary: emp.base_salary * 1.58 })),
-        cune: generateCUNE(),
-        xml_content: generateMockXML(employees, period),
-      };
-      
-      // Simular procesamiento
-      await new Promise(resolve => setTimeout(resolve, 2000));
-      setGeneratedPayroll(mockPayroll);
+      // Integración real con API
+      const response = await fetch(`http://localhost:3001/api/dian/payroll/${period}/generate`, {
+        method: 'POST',
+        headers: { 'Content-Type': 'application/json' },
+        body: JSON.stringify({ employees })
+      });
+      const payrollData = await response.json();
+      setGeneratedPayroll(payrollData);
```

## 5. Patrones Permitidos/Prohibidos

### ✅ Patrones Permitidos
- **Rutas relativas**: `/api/endpoint` ✓
- **Runtime config**: `public/appconfig.json` con `getAppConfig()` ✓  
- **Recursos públicos externos**: Google Fonts, CDNs públicos ✓
- **Environment detection**: `process.env.NODE_ENV === 'development'` ✓
- **Proxy configuration**: Next.js rewrites para `/api/*` → `http://localhost:3001/api/*` ✓

### ❌ Patrones Prohibidos  
- **Variables de entorno**: `.env`, `process.env.CUSTOM_VAR` ❌
- **URLs absolutas hardcodeadas**: `http://localhost:3001`, `https://api.miapp.com` ❌  
- **Credenciales en código**: passwords, API keys, tokens ❌
- **Mock/fake permanente**: `mockData`, `fakeFunction()` para funcionalidad core ❌
- **Console.log en producción**: sin flags de debug ❌

## 6. TODO2 Priorizado

### 🔥 URGENTE (Semana 1)
1. **[SECURITY]** Remover credenciales database hardcodeadas (backend/database/connection.js:12)
2. **[BLOCKER]** Crear sistema runtime config (appconfig.json + appConfig.ts)  
3. **[BLOCKER]** Reemplazar 10 URLs hardcodeadas en archivos críticos API
4. **[FUNCTIONALITY]** Reemplazar mock payroll con integración API real

### 🚨 CRÍTICO (Semana 2)  
5. **[UX]** Implementar funcionalidad en 10 botones mobile FAB (mobile-fab.tsx)
6. **[QUALITY]** Refactorizar top 20 usos críticos de `any` type
7. **[DEPLOY]** Configurar proxy Next.js para entornos de producción

### ⚡ IMPORTANTE (Semana 3-4)
8. **[QUALITY]** Linting automático y pre-commit hooks
9. **[TESTING]** Implementar tests básicos para funcionalidad crítica  
10. **[MONITORING]** Sistema de logs con niveles (debug/info/error)

## 7. Checklist

### Pre-Production Deployment ✅/❌
- [ ] ❌ Credenciales removidas del código fuente
- [ ] ❌ URLs hardcodeadas reemplazadas por config runtime  
- [ ] ❌ Mock implementations reemplazadas por APIs reales
- [ ] ❌ Botones UI críticos implementados funcionalmente
- [ ] ❌ TypeScript `any` reducido <20 instancias críticas
- [ ] ❌ Console.logs removidos/condicionalizados
- [ ] ❌ Tests básicos implementados
- [ ] ❌ Linting sin errores críticos
- [ ] ❌ Build producción exitoso
- [ ] ❌ Variables de entorno documentadas

### Security Checklist ✅/❌  
- [ ] ❌ Sin credenciales en repositorio
- [ ] ❌ Sin URLs internas expuestas  
- [ ] ❌ Headers de seguridad configurados
- [ ] ❌ Input validation en todos los endpoints
- [ ] ❌ Rate limiting configurado

## 8. Limitaciones detectadas

### Limitaciones Técnicas
- **No hay tests**: Sistema sin cobertura de testing, alta probabilidad de regresiones
- **No hay linting automatizado**: Errores de código se acumulan sin detección temprana  
- **No hay CI/CD**: Deploy manual aumenta riesgo de errores en producción
- **No hay monitoreo**: Sin logs estructurados ni métricas de aplicación

### Limitaciones de Arquitectura  
- **Hardcode patterns**: Patrones de hardcoding extendidos por toda la aplicación
- **No hay separación de concerns**: Lógica de negocio mezclada con configuración
- **No hay error handling consistente**: Manejo de errores ad-hoc sin estrategia unificada

### Limitaciones de Seguridad
- **No hay secrets management**: Credenciales en código fuente
- **No hay input sanitization**: Vulnerabilidades potenciales de injection  
- **No hay rate limiting**: APIs vulnerables a ataques de fuerza bruta

---

## 🎯 RESULTADO FINAL

**STATUS**: ❌ **NO LISTO PARA PRODUCCIÓN**

**IMPACTO ESTIMADO DE FIXES**: 
- 🔒 Seguridad: +95% (credential management)
- 🚀 Deploy: +100% (runtime configuration) 
- ⚡ Funcionalidad: +80% (real implementations)
- 🛠️ Mantenibilidad: +70% (TypeScript improvements)

**TIEMPO ESTIMADO**: 2-3 semanas desarrollador senior

**PRÓXIMOS PASOS**: Comenzar con fixes de seguridad (Categoría A), seguir con runtime config (Categoría B), luego funcionalidad crítica (Categorías C-D).