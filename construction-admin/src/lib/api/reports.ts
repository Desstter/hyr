// =====================================================
// API SERVICE - REPORTS (REPORTES)
// Servicios para reportes ejecutivos y dashboard
// =====================================================

import { apiClient } from './client';
import type {
  ExecutiveDashboardData,
  ProjectProfitabilityReport,
  EmployeeProductivity,
} from './types';

export class ReportsService {
  private endpoint = '/reports';

  // =====================================================
  // DASHBOARD EJECUTIVO
  // =====================================================

  /**
   * Obtener datos completos del dashboard ejecutivo
   * Incluye KPIs financieros y proyectos de riesgo
   */
  async getExecutiveDashboard(): Promise<ExecutiveDashboardData> {
    return apiClient.get<ExecutiveDashboardData>(`${this.endpoint}/executive-dashboard`);
  }

  /**
   * Obtener solo KPIs del dashboard
   */
  async getDashboardKPIs(): Promise<ExecutiveDashboardData['kpis']> {
    const dashboard = await this.getExecutiveDashboard();
    return dashboard.kpis;
  }

  /**
   * Obtener solo proyectos de riesgo
   */
  async getRiskyProjects(): Promise<ExecutiveDashboardData['riskyProjects']> {
    const dashboard = await this.getExecutiveDashboard();
    return dashboard.riskyProjects;
  }

  // =====================================================
  // RENTABILIDAD DE PROYECTOS
  // =====================================================

  /**
   * Obtener reporte completo de rentabilidad por proyecto
   */
  async getProjectProfitability(): Promise<ProjectProfitabilityReport[]> {
    return apiClient.get<ProjectProfitabilityReport[]>(`${this.endpoint}/project-profitability`);
  }

  /**
   * Obtener proyectos con mayor rentabilidad
   */
  async getTopProfitableProjects(limit: number = 5): Promise<ProjectProfitabilityReport[]> {
    const projects = await this.getProjectProfitability();
    return projects
      .filter(p => p.profit_margin_percent > 0)
      .sort((a, b) => b.profit_margin_percent - a.profit_margin_percent)
      .slice(0, limit);
  }

  /**
   * Obtener proyectos con pérdidas o riesgo
   */
  async getLossProjects(): Promise<ProjectProfitabilityReport[]> {
    const projects = await this.getProjectProfitability();
    return projects
      .filter(p => p.budget_status !== 'NORMAL' || p.profit_margin_percent < 5)
      .sort((a, b) => a.profit_margin_percent - b.profit_margin_percent);
  }

  // =====================================================
  // PRODUCTIVIDAD DE EMPLEADOS
  // =====================================================

  /**
   * Obtener reporte de productividad de empleados
   */
  async getEmployeeProductivity(filters?: {
    month?: number;
    year?: number;
    department?: string;
  }): Promise<EmployeeProductivity[]> {
    return apiClient.get<EmployeeProductivity[]>(`${this.endpoint}/employee-productivity`, filters);
  }

  /**
   * Obtener empleados más productivos
   */
  async getTopProductiveEmployees(limit: number = 5, filters?: {
    month?: number;
    year?: number;
  }): Promise<EmployeeProductivity[]> {
    const employees = await this.getEmployeeProductivity(filters);
    return employees
      .sort((a, b) => b.total_hours - a.total_hours)
      .slice(0, limit);
  }

  /**
   * Obtener empleados con mejor costo-eficiencia
   */
  async getMostCostEffectiveEmployees(limit: number = 5, filters?: {
    month?: number;
    year?: number;
  }): Promise<EmployeeProductivity[]> {
    const employees = await this.getEmployeeProductivity(filters);
    return employees
      .filter(e => e.cost_per_hour_with_benefits > 0)
      .sort((a, b) => a.cost_per_hour_with_benefits - b.cost_per_hour_with_benefits)
      .slice(0, limit);
  }

  // =====================================================
  // REPORTES FINANCIEROS
  // =====================================================

  /**
   * Obtener reporte financiero mensual
   */
  async getMonthlyFinancialReport(month: number, year: number): Promise<{
    resumen: {
      ingresos: number;
      gastos: number;
      utilidadBruta: number;
      margenUtilidad: number;
      nomina: number;
      utilidadNeta: number;
    };
    proyectos: {
      completados: number;
      ingresosPorCompletados: number;
      activos: number;
      presupuestoActivos: number;
    };
    gastosPorCategoria: Array<{
      categoria: string;
      monto: number;
      porcentaje: number;
    }>;
    nominaPorDepartamento: Array<{
      departamento: string;
      empleados: number;
      costoTotal: number;
      promedioSalario: number;
    }>;
    indicadores: {
      costoPorHora: number;
      horasProducidas: number;
      eficienciaPresupuestaria: number;
      proyectosEnRiesgo: number;
    };
  }> {
    type MonthlyFinancialReport = {
      resumen: {
        ingresosTotales: number;
        gastosTotales: number;
        utilidadNeta: number;
        margenUtilidad: number;
        nominaMensual: number;
        proyectosActivos: number;
        empleadosActivos: number;
      };
      gastosPorCategoria: Record<string, number>;
      proyectosMasRentables: Array<{
        id: string;
        nombre: string;
        margenUtilidad: number;
        ingresoGenerado: number;
      }>;
      indicadores: {
        costoPorHora: number;
        horasProducidas: number;
        eficienciaPresupuestaria: number;
        proyectosEnRiesgo: number;
      };
    };
    return apiClient.get<MonthlyFinancialReport>(`${this.endpoint}/monthly-financial`, { month, year });
  }

  /**
   * Obtener tendencias financieras (últimos 12 meses)
   */
  async getFinancialTrends(): Promise<{
    ingresos: Array<{ mes: string; monto: number }>;
    gastos: Array<{ mes: string; monto: number }>;
    nomina: Array<{ mes: string; monto: number }>;
    utilidad: Array<{ mes: string; monto: number }>;
    proyectosCompletados: Array<{ mes: string; cantidad: number }>;
    empleadosActivos: Array<{ mes: string; cantidad: number }>;
  }> {
    type FinancialTrends = {
      ingresos: Array<{ mes: string; monto: number }>;
      gastos: Array<{ mes: string; monto: number }>;
      nomina: Array<{ mes: string; monto: number }>;
      utilidad: Array<{ mes: string; monto: number }>;
      proyectosCompletados: Array<{ mes: string; cantidad: number }>;
      empleadosActivos: Array<{ mes: string; cantidad: number }>;
    };
    return apiClient.get<FinancialTrends>(`${this.endpoint}/financial-trends`);
  }

  // =====================================================
  // REPORTES DE GASTOS
  // =====================================================

  /**
   * Obtener reporte de gastos por categoría
   */
  async getExpensesByCategory(filters?: {
    startDate?: string;
    endDate?: string;
    projectId?: string;
  }): Promise<{
    total: number;
    categorias: Array<{
      categoria: string;
      monto: number;
      porcentaje: number;
      transacciones: number;
    }>;
    tendenciaMensual: Array<{
      mes: string;
      materiales: number;
      manoObra: number;
      equipos: number;
      indirectos: number;
    }>;
  }> {
    type ExpensesByCategory = {
      total: number;
      categorias: Array<{
        categoria: string;
        monto: number;
        porcentaje: number;
        transacciones: number;
      }>;
      tendenciaMensual: Array<{
        mes: string;
        materiales: number;
        manoObra: number;
        equipos: number;
        indirectos: number;
      }>;
    };
    return apiClient.get<ExpensesByCategory>(`${this.endpoint}/expenses-by-category`, filters);
  }

  /**
   * Obtener gastos más altos
   */
  async getTopExpenses(limit: number = 10, filters?: {
    startDate?: string;
    endDate?: string;
  }): Promise<Array<{
    id: string;
    fecha: string;
    proyecto: string;
    categoria: string;
    descripcion: string;
    monto: number;
    proveedor: string;
  }>> {
    type TopExpense = {
      id: string;
      fecha: string;
      proyecto: string;
      categoria: string;
      descripcion: string;
      monto: number;
      proveedor: string;
    };
    return apiClient.get<TopExpense[]>(`${this.endpoint}/top-expenses`, { limit, ...filters });
  }

  // =====================================================
  // REPORTES PERSONALIZADOS
  // =====================================================

  /**
   * Generar reporte personalizado
   */
  async generateCustomReport(config: {
    tipo: 'financiero' | 'proyectos' | 'nomina' | 'productividad';
    fechaInicio: string;
    fechaFin: string;
    filtros?: Record<string, unknown>;
    incluirGraficos?: boolean;
    formato?: 'json' | 'excel' | 'pdf';
  }): Promise<{
    id: string;
    tipo: string;
    datos: unknown;
    generadoEn: string;
    parametros: Record<string, unknown>;
  }> {
    type CustomReportResponse = {
      id: string;
      tipo: string;
      datos: unknown;
      generadoEn: string;
      parametros: Record<string, unknown>;
    };
    return apiClient.post<CustomReportResponse>(`${this.endpoint}/custom`, config);
  }

  /**
   * Obtener historial de reportes generados
   */
  async getReportHistory(): Promise<Array<{
    id: string;
    tipo: string;
    fechaGeneracion: string;
    parametros: Record<string, unknown>;
    tamano: string;
    url?: string;
  }>> {
    type ReportHistory = {
      id: string;
      tipo: string;
      fechaGeneracion: string;
      parametros: Record<string, unknown>;
      tamano: string;
      url?: string;
    };
    return apiClient.get<ReportHistory[]>(`${this.endpoint}/history`);
  }

  // =====================================================
  // COMPARATIVAS Y ANÁLISIS
  // =====================================================

  /**
   * Comparar periodos (mes vs mes anterior, año vs año anterior)
   */
  async getComparativeAnalysis(config: {
    periodo1: { mes: number; año: number };
    periodo2: { mes: number; año: number };
    metricas: Array<'ingresos' | 'gastos' | 'nomina' | 'proyectos' | 'empleados'>;
  }): Promise<{
    periodo1: Record<string, number>;
    periodo2: Record<string, number>;
    diferencias: Record<string, { absoluta: number; porcentual: number }>;
    analisis: Array<{
      metrica: string;
      tendencia: 'mejora' | 'declive' | 'estable';
      comentario: string;
    }>;
  }> {
    type ComparativeAnalysis = {
      periodo1: Record<string, number>;
      periodo2: Record<string, number>;
      diferencias: Record<string, { absoluta: number; porcentual: number }>;
      analisis: Array<{
        metrica: string;
        tendencia: 'mejora' | 'declive' | 'estable';
        comentario: string;
      }>;
    };
    return apiClient.post<ComparativeAnalysis>(`${this.endpoint}/comparative`, config);
  }

  /**
   * Análisis de rentabilidad por tipo de proyecto
   */
  async getProjectTypeAnalysis(): Promise<Array<{
    tipo: string;
    proyectos: number;
    presupuestoPromedio: number;
    margenPromedio: number;
    diasPromedio: number;
    rentabilidadTotal: number;
  }>> {
    type ProjectTypeAnalysis = {
      tipo: string;
      proyectos: number;
      presupuestoPromedio: number;
      margenPromedio: number;
      diasPromedio: number;
      rentabilidadTotal: number;
    };
    return apiClient.get<ProjectTypeAnalysis[]>(`${this.endpoint}/project-type-analysis`);
  }

  // =====================================================
  // EXPORTACIÓN
  // =====================================================

  /**
   * Exportar reporte a Excel
   */
  async exportToExcel(reportType: string, filters?: Record<string, unknown>): Promise<Blob> {
    const response = await fetch(`${apiClient['baseUrl']}${this.endpoint}/export/excel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ reportType, filters }),
    });
    
    if (!response.ok) {
      throw new Error(`Error exporting to Excel: ${response.statusText}`);
    }
    
    return response.blob();
  }

  /**
   * Exportar reporte a PDF
   */
  async exportToPDF(reportType: string, filters?: Record<string, unknown>): Promise<Blob> {
    const response = await fetch(`${apiClient['baseUrl']}${this.endpoint}/export/pdf`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ reportType, filters }),
    });
    
    if (!response.ok) {
      throw new Error(`Error exporting to PDF: ${response.statusText}`);
    }
    
    return response.blob();
  }
}

// Instancia singleton del servicio
export const reportsService = new ReportsService();