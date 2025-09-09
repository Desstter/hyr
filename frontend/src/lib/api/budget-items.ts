import { apiClient } from "./client";
import type {
  BudgetItem,
  CreateBudgetItemRequest,
  UpdateBudgetItemRequest,
  BudgetSummary,
  ApiResponse,
} from "./types";

export const budgetItemsApi = {
  // Obtener todos los items de presupuesto de un proyecto
  getByProject: async (projectId: string): Promise<BudgetItem[]> => {
    const response = await apiClient.get<ApiResponse<BudgetItem[]>>(
      `/budget-items/${projectId}`
    );
    return response.data || [];
  },

  // Crear nuevo item de presupuesto
  create: async (data: CreateBudgetItemRequest): Promise<BudgetItem> => {
    const response = await apiClient.post<ApiResponse<BudgetItem>>(
      "/budget-items",
      data
    );
    if (!response.data) {
      throw new Error('Invalid response from server');
    }
    return response.data;
  },

  // Actualizar item de presupuesto
  update: async (
    id: string,
    data: UpdateBudgetItemRequest
  ): Promise<BudgetItem> => {
    const response = await apiClient.put<ApiResponse<BudgetItem>>(
      `/budget-items/${id}`,
      data
    );
    if (!response.data) {
      throw new Error('Invalid response from server');
    }
    return response.data;
  },

  // Eliminar item de presupuesto
  delete: async (id: string): Promise<BudgetItem> => {
    const response = await apiClient.delete<ApiResponse<BudgetItem>>(
      `/budget-items/${id}`
    );
    if (!response.data) {
      throw new Error('Invalid response from server');
    }
    return response.data;
  },

  // Obtener resumen del presupuesto por proyecto
  getSummary: async (projectId: string): Promise<BudgetSummary> => {
    const response = await apiClient.get<ApiResponse<BudgetSummary>>(
      `/budget-items/project/${projectId}/summary`
    );
    if (!response.data) {
      throw new Error('Invalid response from server');
    }
    return response.data;
  },
};
