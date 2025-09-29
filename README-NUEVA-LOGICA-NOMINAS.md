# NUEVA LÓGICA DE NÓMINAS - HYR CONSTRUCTORA & SOLDADURA

## Resumen de Cambios Implementados

Se ha implementado un cambio fundamental en el sistema de nóminas que separa el **salario base** (para prestaciones) del **precio por día** (para pago real), junto con un sistema de control de tiempo basado en llegada/salida con descuentos automáticos por tardanzas.

## 🔄 Cambios Principales

### 1. Separación Salarial
- **Salario Base (`salary_base`)**: Para cálculo de prestaciones sociales, PILA y obligaciones legales
- **Precio por Día (`daily_rate`)**: Para pago real basado en horas efectivamente trabajadas

### 2. Control de Tiempo Real
- **Registro de llegada/salida**: Campos `arrival_time` y `departure_time` obligatorios
- **Cálculo automático**: Horas trabajadas calculadas desde tiempos reales
- **Descuentos por tardanza**: Minutos de tardanza se descuentan del pago
- **Tolerancia configurable**: 5 minutos de tolerancia por defecto

### 3. Horas Legales vs Tiempo Extra
- **7.3 horas legales** por día (configurable)
- **Tiempo extra automático**: Horas que excedan 7.3 se calculan como extra con 25% de recargo
- **Descuento de almuerzo**: 1 hora descontada automáticamente

## 📋 Archivos Modificados

### Base de Datos
- `migration-nueva-logica-nominas.sql` - Script de migración completo
- Nuevos campos en `personnel`: `salary_base`, `daily_rate`, `expected_arrival_time`, `expected_departure_time`
- Nuevos campos en `time_entries`: `arrival_time`, `departure_time`, `late_minutes`, `effective_hours_worked`
- Nueva tabla `settings` con configuraciones de nómina

### Backend
- `utils/payroll-colombia.js` - Actualizado para usar salary_base vs daily_rate
- `routes/time-entries.js` - Validaciones y cálculos con nueva lógica
- `routes/payroll.js` - Procesamiento de nómina actualizado
- `routes/settings.js` - API para configuraciones dinámicas

### Frontend
- `components/time-entries/TimeEntryForm.tsx` - Formulario con llegada/salida
- `components/personnel/PersonnelForm.tsx` - Formulario con salary_base y daily_rate

### Triggers y Funciones
- `update_effective_hours()` - Calcula horas automáticamente
- `create_labor_expense()` - Actualizado para nueva lógica
- `calculate_effective_hours()` - Función de cálculo de horas efectivas

## ⚙️ Configuraciones

### Settings de Nómina
```json
{
  "daily_legal_hours": 7.3,
  "late_tolerance_minutes": 5,
  "overtime_threshold_hours": 7.3,
  "max_daily_hours": 12,
  "overtime_multiplier": 1.25
}
```

### Horarios de Negocio
```json
{
  "standard_arrival": "07:00",
  "standard_departure": "15:30",
  "lunch_break_start": "12:00",
  "lunch_break_end": "13:00",
  "saturday_hours": 4,
  "sunday_work_allowed": false
}
```

## 🚀 Cómo Aplicar los Cambios

### 1. Ejecutar Migración de Base de Datos
```bash
cd backend
psql -h localhost -U tu_usuario -d hyr_construction -f database/migration-nueva-logica-nominas.sql
```

### 2. Verificar Configuraciones
```bash
# Verificar que las configuraciones se crearon
curl http://localhost:3001/api/settings/payroll_settings
curl http://localhost:3001/api/settings/business_hours
```

### 3. Reiniciar Servicios
```bash
# Backend
cd backend
node server.js

# Frontend
cd frontend
npm run dev
```

## 📊 Impacto en el Sistema

### Empleados Existentes
- Migración automática: `salary_base` = salario actual
- `daily_rate` calculado como equivalente para mantener pagos similares
- Horarios estándar asignados (07:00 - 15:30)

### Time Entries Existentes
- Migración automática con tiempos estimados
- `arrival_time` = 07:00, `departure_time` calculada
- `late_minutes` = 0 para registros existentes

### Cálculos de Nómina
- **Prestaciones**: Basadas en `salary_base` (inalterado)
- **Pago real**: Basado en `daily_rate ÷ 7.3 × horas_trabajadas`
- **Descuentos**: Aplicados sobre pago real
- **Aportes**: Calculados sobre `salary_base`

## 🔍 Validaciones Implementadas

### Time Entries
- `arrival_time` y `departure_time` obligatorios
- `arrival_time` < `departure_time`
- Máximo 12 horas totales por día
- Empleado debe estar activo
- Proyecto debe existir

### Personnel
- `salary_base` ≥ salario mínimo legal
- `daily_rate` > 0
- Diferencia entre salary_base y daily_rate ≤ 50%
- Horarios de llegada/salida válidos

## 📈 Fórmulas de Cálculo

### Horas Efectivas
```
horas_efectivas = (hora_salida - hora_llegada) - 1_hora_almuerzo
```

### Tardanza
```
tardanza = MAX(0, hora_llegada - hora_esperada - tolerancia)
```

### Pago Regular
```
pago_regular = (daily_rate ÷ 7.3) × MIN(horas_efectivas, 7.3) - descuento_tardanza
```

### Tiempo Extra
```
horas_extra = MAX(0, horas_efectivas - 7.3)
pago_extra = (daily_rate ÷ 7.3) × horas_extra × 1.25
```

### Prestaciones Sociales
```
salud_empleador = salary_base × 8.5%
pension_empleador = salary_base × 12%
arl = salary_base × tarifa_clase_riesgo
cesantias = salary_base × 8.33%
prima = salary_base × 8.33%
vacaciones = salary_base × 4.17%
```

## 🎯 Beneficios del Nuevo Sistema

### Para la Empresa
- ✅ Control preciso de tiempo trabajado
- ✅ Descuentos automáticos por tardanzas
- ✅ Cumplimiento legal en prestaciones
- ✅ Flexibilidad en pagos vs obligaciones

### Para Empleados
- ✅ Transparencia en cálculos
- ✅ Pago justo por tiempo trabajado
- ✅ Tolerancia para tardanzas menores
- ✅ Prestaciones completas garantizadas

### Para el Sistema
- ✅ Auditoría completa de tiempo
- ✅ Cálculos automáticos
- ✅ Reportes precisos
- ✅ Integración con PILA/DIAN

## 🔧 Troubleshooting

### Problemas Comunes

1. **Error en migración**: Verificar que el usuario tenga permisos CREATE
2. **Configuraciones faltantes**: Ejecutar script de configuraciones por defecto
3. **Cálculos incorrectos**: Verificar que los triggers estén activos
4. **Frontend no muestra campos**: Verificar que los componentes estén actualizados

### Verificación del Sistema
```sql
-- Verificar empleados migrados
SELECT COUNT(*) FROM personnel WHERE salary_base IS NOT NULL AND daily_rate IS NOT NULL;

-- Verificar configuraciones
SELECT key, value FROM settings WHERE category = 'payroll';

-- Verificar triggers activos
SELECT trigger_name FROM information_schema.triggers WHERE trigger_name LIKE '%effective%';
```

## 📞 Soporte

Para dudas o problemas con la implementación:
- Revisar logs del backend: `backend/logs/`
- Verificar configuraciones: `/api/settings`
- Consultar documentación DIAN para cambios legales

---

**Implementado por:** Claude Code Assistant
**Fecha:** 2025-01-XX
**Versión:** 2.0.0