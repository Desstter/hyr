import { apiClient } from "./client";
import type {
  ProjectIncome,
  ProjectIncomesSummary,
  ProjectProfitAnalysis,
  CreateProjectIncomeRequest,
  UpdateProjectIncomeRequest,
  IncomeListFilters,
  IncomesSummary,
  IncomesByPaymentMethod,
} from "./types";

// =====================================================
// PROJECT INCOMES API FUNCTIONS
// =====================================================

export const incomes = {
  // Obtener ingresos de un proyecto específico
  async getProjectIncomes(
    projectId: string,
    filters?: {
      start_date?: string;
      end_date?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<ProjectIncome[]> {
    const params = new URLSearchParams();
    if (filters?.start_date) params.append("start_date", filters.start_date);
    if (filters?.end_date) params.append("end_date", filters.end_date);
    if (filters?.limit) params.append("limit", filters.limit.toString());
    if (filters?.offset) params.append("offset", filters.offset.toString());

    const queryString = params.toString() ? `?${params}` : "";
    return apiClient.get<ProjectIncome[]>(`/projects/${projectId}/incomes${queryString}`);
  },

  // Obtener resumen de ingresos de un proyecto
  async getProjectIncomesSummary(
    projectId: string,
    dateRange?: {
      start_date?: string;
      end_date?: string;
    }
  ): Promise<ProjectIncomesSummary> {
    const params = new URLSearchParams();
    if (dateRange?.start_date) params.append("start_date", dateRange.start_date);
    if (dateRange?.end_date) params.append("end_date", dateRange.end_date);

    const queryString = params.toString() ? `?${params}` : "";
    return apiClient.get<ProjectIncomesSummary>(`/projects/${projectId}/incomes/summary${queryString}`);
  },

  // Crear nuevo ingreso para un proyecto
  async createProjectIncome(
    projectId: string,
    incomeData: CreateProjectIncomeRequest
  ): Promise<ProjectIncome> {
    return apiClient.post<ProjectIncome>(`/projects/${projectId}/incomes`, incomeData);
  },

  // Actualizar ingreso existente
  async updateIncome(
    incomeId: string,
    incomeData: UpdateProjectIncomeRequest
  ): Promise<ProjectIncome> {
    return apiClient.put<ProjectIncome>(`/incomes/${incomeId}`, incomeData);
  },

  // Eliminar ingreso
  async deleteIncome(incomeId: string): Promise<{ message: string; income: ProjectIncome }> {
    return apiClient.delete<{ message: string; income: ProjectIncome }>(`/incomes/${incomeId}`);
  },

  // Obtener análisis de rentabilidad de un proyecto
  async getProjectProfitAnalysis(projectId: string): Promise<ProjectProfitAnalysis> {
    return apiClient.get<ProjectProfitAnalysis>(`/projects/${projectId}/profit-analysis`);
  },

  // =====================================================
  // GENERAL INCOMES FUNCTIONS (todos los proyectos)
  // =====================================================

  // Obtener todos los ingresos con filtros
  async getAllIncomes(filters?: IncomeListFilters): Promise<ProjectIncome[]> {
    const params = new URLSearchParams();
    if (filters?.project_id) params.append("project_id", filters.project_id);
    if (filters?.start_date) params.append("start_date", filters.start_date);
    if (filters?.end_date) params.append("end_date", filters.end_date);
    if (filters?.payment_method) params.append("payment_method", filters.payment_method);
    if (filters?.limit) params.append("limit", filters.limit.toString());
    if (filters?.offset) params.append("offset", filters.offset.toString());

    const queryString = params.toString() ? `?${params}` : "";
    return apiClient.get<ProjectIncome[]>(`/incomes${queryString}`);
  },

  // Obtener resumen general de ingresos
  async getIncomesSummary(dateRange?: {
    start_date?: string;
    end_date?: string;
  }): Promise<IncomesSummary> {
    const params = new URLSearchParams();
    if (dateRange?.start_date) params.append("start_date", dateRange.start_date);
    if (dateRange?.end_date) params.append("end_date", dateRange.end_date);

    const queryString = params.toString() ? `?${params}` : "";
    return apiClient.get<IncomesSummary>(`/incomes/summary${queryString}`);
  },

  // Obtener ingresos por método de pago
  async getIncomesByPaymentMethod(dateRange?: {
    start_date?: string;
    end_date?: string;
  }): Promise<IncomesByPaymentMethod[]> {
    const params = new URLSearchParams();
    if (dateRange?.start_date) params.append("start_date", dateRange.start_date);
    if (dateRange?.end_date) params.append("end_date", dateRange.end_date);

    const queryString = params.toString() ? `?${params}` : "";
    return apiClient.get<IncomesByPaymentMethod[]>(`/incomes/by-payment-method${queryString}`);
  },
};

// Export default for easier imports
export default incomes;