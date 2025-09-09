// =====================================================
// API SERVICE - PROJECTS (PROYECTOS)
// Servicios para gestión de proyectos y rentabilidad
// =====================================================

import { apiClient } from "./client";
import type {
  Project,
  CreateProjectRequest,
  Expense,
  Personnel,
  CreateExpenseRequest,
  TimeEntry,
  ProjectProfitabilityReport,
} from "./types";

export class ProjectsService {
  private endpoint = "/projects";

  // =====================================================
  // CRUD PROYECTOS
  // =====================================================

  /**
   * Obtener todos los proyectos
   */
  async getAll(filters?: {
    status?: string;
    clientId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<Project[]> {
    return apiClient.get<Project[]>(this.endpoint, filters);
  }

  /**
   * Alias para getAll() - compatibilidad con otros servicios
   */
  async list(filters?: {
    status?: string;
    clientId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<Project[]> {
    return this.getAll(filters);
  }

  /**
   * Obtener proyecto por ID
   */
  async getById(id: string): Promise<Project> {
    return apiClient.get<Project>(`${this.endpoint}/${id}`);
  }

  /**
   * Crear nuevo proyecto
   */
  async create(data: CreateProjectRequest): Promise<Project> {
    return apiClient.post<Project>(this.endpoint, data);
  }

  /**
   * Actualizar proyecto
   */
  async update(
    id: string,
    data: Partial<CreateProjectRequest>
  ): Promise<Project> {
    return apiClient.put<Project>(`${this.endpoint}/${id}`, data);
  }

  /**
   * Eliminar proyecto
   */
  async delete(id: string): Promise<void> {
    return apiClient.delete<void>(`${this.endpoint}/${id}`);
  }

  // =====================================================
  // GASTOS DEL PROYECTO
  // =====================================================

  /**
   * Obtener gastos de un proyecto
   */
  async getExpenses(
    projectId: string,
    filters?: {
      category?: string;
      startDate?: string;
      endDate?: string;
    }
  ): Promise<Expense[]> {
    return apiClient.get<Expense[]>(
      `${this.endpoint}/${projectId}/expenses`,
      filters
    );
  }

  /**
   * Crear gasto para proyecto
   */
  async createExpense(data: CreateExpenseRequest): Promise<Expense> {
    return apiClient.post<Expense>("/expenses", data);
  }

  /**
   * Actualizar gasto
   */
  async updateExpense(
    id: string,
    data: Partial<CreateExpenseRequest>
  ): Promise<Expense> {
    return apiClient.put<Expense>(`/expenses/${id}`, data);
  }

  /**
   * Eliminar gasto
   */
  async deleteExpense(id: string): Promise<void> {
    return apiClient.delete<void>(`/expenses/${id}`);
  }

  // =====================================================
  // HORAS Y PERSONAL
  // =====================================================

  /**
   * Obtener horas trabajadas en un proyecto
   */
  async getTimeEntries(
    projectId: string,
    filters?: {
      personnelId?: string;
      startDate?: string;
      endDate?: string;
    }
  ): Promise<TimeEntry[]> {
    return apiClient.get<TimeEntry[]>(
      `${this.endpoint}/${projectId}/time-entries`,
      filters
    );
  }

  /**
   * Obtener personal asignado al proyecto
   */
  async getAssignedPersonnel(projectId: string): Promise<Personnel[]> {
    return apiClient.get<Personnel[]>(
      `${this.endpoint}/${projectId}/personnel`
    );
  }

  // =====================================================
  // REPORTES Y RENTABILIDAD
  // =====================================================

  /**
   * Obtener rentabilidad de proyecto
   */
  async getProfitability(projectId: string): Promise<{
    budget: {
      materials: number;
      labor: number;
      equipment: number;
      overhead: number;
      total: number;
    };
    spent: {
      materials: number;
      labor: number;
      equipment: number;
      overhead: number;
      total: number;
    };
    remaining: {
      materials: number;
      labor: number;
      equipment: number;
      overhead: number;
      total: number;
    };
    profitMargin: number;
    profitMarginPercent: number;
    status: "NORMAL" | "ALERTA" | "SOBREPRESUPUESTO";
  }> {
    type Profitability = {
      budget: {
        materials: number;
        labor: number;
        equipment: number;
        overhead: number;
        total: number;
      };
      spent: {
        materials: number;
        labor: number;
        equipment: number;
        overhead: number;
        total: number;
      };
      remaining: {
        materials: number;
        labor: number;
        equipment: number;
        overhead: number;
        total: number;
      };
      profitMargin: number;
      profitMarginPercent: number;
      status: "NORMAL" | "ALERTA" | "SOBREPRESUPUESTO";
    };
    return apiClient.get<Profitability>(
      `${this.endpoint}/${projectId}/profitability`
    );
  }

  /**
   * Obtener reporte de rentabilidad de todos los proyectos
   */
  async getAllProfitability(): Promise<ProjectProfitabilityReport[]> {
    return apiClient.get<ProjectProfitabilityReport[]>(
      "/reports/project-profitability"
    );
  }

  /**
   * Actualizar progreso del proyecto
   */
  async updateProgress(projectId: string, progress: number): Promise<Project> {
    return apiClient.put<Project>(`${this.endpoint}/${projectId}`, {
      progress,
    });
  }

  /**
   * Cambiar estado del proyecto
   */
  async updateStatus(projectId: string, status: string): Promise<Project> {
    return apiClient.put<Project>(`${this.endpoint}/${projectId}`, { status });
  }

  // =====================================================
  // BÚSQUEDA Y FILTROS
  // =====================================================

  /**
   * Buscar proyectos por nombre o descripción
   */
  async search(query: string): Promise<Project[]> {
    return apiClient.get<Project[]>(`${this.endpoint}/search`, { q: query });
  }

  /**
   * Obtener proyectos activos
   */
  async getActiveProjects(): Promise<Project[]> {
    return this.getAll({ status: "in_progress" });
  }

  /**
   * Obtener proyectos completados
   */
  async getCompletedProjects(limit?: number): Promise<Project[]> {
    return apiClient.get<Project[]>(`${this.endpoint}/completed`, { limit });
  }

  /**
   * Obtener proyectos con riesgo (sobrepresupuesto o cerca)
   */
  async getRiskyProjects(): Promise<Project[]> {
    return apiClient.get<Project[]>(`${this.endpoint}/risky`);
  }

  // =====================================================
  // ESTADÍSTICAS
  // =====================================================

  /**
   * Obtener estadísticas generales de proyectos
   */
  async getStats(): Promise<{
    total: number;
    active: number;
    completed: number;
    onHold: number;
    totalBudget: number;
    totalSpent: number;
    averageMargin: number;
    projectsOverBudget: number;
  }> {
    type ProjectStats = {
      total: number;
      active: number;
      completed: number;
      onHold: number;
      totalBudget: number;
      totalSpent: number;
      averageMargin: number;
      projectsOverBudget: number;
    };
    return apiClient.get<ProjectStats>(`${this.endpoint}/stats`);
  }

  /**
   * Obtener resumen financiero de proyecto
   */
  async getFinancialSummary(projectId: string): Promise<{
    budget: Record<string, number>;
    spent: Record<string, number>;
    remaining: Record<string, number>;
    recentExpenses: Expense[];
    topExpenseCategories: Array<{
      category: string;
      amount: number;
      percentage: number;
    }>;
    monthlyTrend: Array<{ month: string; spent: number; budget: number }>;
  }> {
    type FinancialSummary = {
      budget: Record<string, number>;
      spent: Record<string, number>;
      remaining: Record<string, number>;
      recentExpenses: Expense[];
      topExpenseCategories: Array<{
        category: string;
        amount: number;
        percentage: number;
      }>;
      monthlyTrend: Array<{ month: string; spent: number; budget: number }>;
    };
    return apiClient.get<FinancialSummary>(
      `${this.endpoint}/${projectId}/financial-summary`
    );
  }
}

// Instancia singleton del servicio
export const projectsService = new ProjectsService();
