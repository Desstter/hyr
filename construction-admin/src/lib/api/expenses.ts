// =====================================================
// EXPENSES API SERVICE - SISTEMA HYR CONSTRUCTORA & SOLDADURA
// Servicio completo para gestión de gastos y presupuestos
// =====================================================

import { apiClient } from './client';
import type { 
  Expense, 
  CreateExpenseRequest, 
  UpdateExpenseRequest,
  ApiListResponse 
} from './types';

// =====================================================
// CLASE DE SERVICIO EXPENSES
// =====================================================

export class ExpensesService {
  private readonly basePath = '/expenses';

  /**
   * Obtener todos los gastos con filtros opcionales
   */
  async list(params?: {
    projectId?: string;
    category?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  }): Promise<ApiListResponse<Expense>> {
    const searchParams = new URLSearchParams();
    
    if (params?.projectId) searchParams.append('projectId', params.projectId);
    if (params?.category) searchParams.append('category', params.category);
    if (params?.startDate) searchParams.append('startDate', params.startDate);
    if (params?.endDate) searchParams.append('endDate', params.endDate);
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.offset) searchParams.append('offset', params.offset.toString());
    
    const url = searchParams.toString() 
      ? `${this.basePath}?${searchParams.toString()}`
      : this.basePath;
      
    return apiClient.get<ApiListResponse<Expense>>(url);
  }

  /**
   * Obtener gasto por ID
   */
  async getById(id: string): Promise<Expense> {
    return apiClient.get<Expense>(`${this.basePath}/${id}`);
  }

  /**
   * Crear nuevo gasto
   */
  async create(expense: CreateExpenseRequest): Promise<Expense> {
    return apiClient.post<Expense>(this.basePath, expense);
  }

  /**
   * Actualizar gasto existente
   */
  async update(id: string, expense: UpdateExpenseRequest): Promise<Expense> {
    return apiClient.put<Expense>(`${this.basePath}/${id}`, expense);
  }

  /**
   * Eliminar gasto
   */
  async delete(id: string): Promise<void> {
    return apiClient.delete(`${this.basePath}/${id}`);
  }

  /**
   * Obtener gastos por proyecto con totales por categoría
   */
  async getByProject(projectId: string): Promise<{
    expenses: Expense[];
    totals: {
      materials: number;
      labor: number;
      equipment: number;
      overhead: number;
      total: number;
    };
  }> {
    return apiClient.get(`${this.basePath}/project/${projectId}`);
  }

  /**
   * Obtener resumen de gastos por período
   */
  async getSummary(params: {
    startDate: string;
    endDate: string;
    projectId?: string;
  }): Promise<{
    totalExpenses: number;
    byCategory: Record<string, number>;
    byProject: Array<{
      projectId: string;
      projectName: string;
      total: number;
    }>;
    topExpenses: Expense[];
  }> {
    const searchParams = new URLSearchParams({
      startDate: params.startDate,
      endDate: params.endDate,
    });
    
    if (params.projectId) {
      searchParams.append('projectId', params.projectId);
    }
    
    return apiClient.get(`${this.basePath}/summary?${searchParams.toString()}`);
  }

  /**
   * Obtener categorías de gastos disponibles
   */
  async getCategories(): Promise<{
    category: string;
    subcategories: string[];
    count: number;
  }[]> {
    return apiClient.get(`${this.basePath}/categories`);
  }

  /**
   * Importar gastos desde archivo CSV/Excel
   */
  async importExpenses(file: File, projectId?: string): Promise<{
    imported: number;
    errors: string[];
  }> {
    const formData = new FormData();
    formData.append('file', file);
    if (projectId) formData.append('projectId', projectId);
    
    return apiClient.post(`${this.basePath}/import`, formData);
  }

  /**
   * Exportar gastos a Excel
   */
  async exportToExcel(params?: {
    projectId?: string;
    startDate?: string;
    endDate?: string;
    category?: string;
  }): Promise<Blob> {
    const searchParams = new URLSearchParams();
    
    if (params?.projectId) searchParams.append('projectId', params.projectId);
    if (params?.startDate) searchParams.append('startDate', params.startDate);
    if (params?.endDate) searchParams.append('endDate', params.endDate);
    if (params?.category) searchParams.append('category', params.category);
    
    const url = searchParams.toString() 
      ? `${this.basePath}/export/excel?${searchParams.toString()}`
      : `${this.basePath}/export/excel`;
      
    // Usar fetch directamente para descargar archivos
    const response = await fetch(`http://localhost:3001/api${url}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.blob();
  }

  /**
   * Buscar gastos por texto
   */
  async search(query: string, filters?: {
    projectId?: string;
    category?: string;
    minAmount?: number;
    maxAmount?: number;
  }): Promise<ApiListResponse<Expense>> {
    const searchParams = new URLSearchParams({ query });
    
    if (filters?.projectId) searchParams.append('projectId', filters.projectId);
    if (filters?.category) searchParams.append('category', filters.category);
    if (filters?.minAmount) searchParams.append('minAmount', filters.minAmount.toString());
    if (filters?.maxAmount) searchParams.append('maxAmount', filters.maxAmount.toString());
    
    return apiClient.get<ApiListResponse<Expense>>(`${this.basePath}/search?${searchParams.toString()}`);
  }

  /**
   * Obtener gastos recientes
   */
  async getRecent(limit = 10): Promise<Expense[]> {
    return apiClient.get<Expense[]>(`${this.basePath}/recent?limit=${limit}`);
  }

  /**
   * Marcar gasto como pagado/no pagado
   */
  async updatePaymentStatus(id: string, isPaid: boolean, paidDate?: string): Promise<Expense> {
    return apiClient.patch<Expense>(`${this.basePath}/${id}/payment`, {
      isPaid,
      paidDate,
    });
  }

  /**
   * Duplicar gasto existente
   */
  async duplicate(id: string, modifications?: Partial<CreateExpenseRequest>): Promise<Expense> {
    return apiClient.post<Expense>(`${this.basePath}/${id}/duplicate`, modifications || {});
  }

  /**
   * Obtener estadísticas de gastos para dashboard
   */
  async getStats(period: 'week' | 'month' | 'quarter' | 'year' = 'month'): Promise<{
    totalExpenses: number;
    averageExpense: number;
    largestExpense: number;
    expensesByCategory: Record<string, number>;
    expensesTrend: Array<{
      date: string;
      amount: number;
    }>;
    unpaidExpenses: {
      count: number;
      total: number;
    };
  }> {
    return apiClient.get(`${this.basePath}/stats?period=${period}`);
  }
}

// =====================================================
// INSTANCIA SINGLETON
// =====================================================

export const expensesService = new ExpensesService();

// =====================================================
// HOOKS PARA REACT (Opcional)
// =====================================================

import { useState, useEffect } from 'react';

/**
 * Hook para cargar lista de gastos
 */
export function useExpenses(params?: Parameters<ExpensesService['list']>[0]) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  const loadExpenses = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await expensesService.list(params);
      setExpenses(result.data);
      setTotal(result.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando gastos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExpenses();
  }, [JSON.stringify(params)]);

  return {
    expenses,
    loading,
    error,
    total,
    reload: loadExpenses,
  };
}

/**
 * Hook para gastos de un proyecto específico
 */
export function useProjectExpenses(projectId: string) {
  const [data, setData] = useState<Awaited<ReturnType<ExpensesService['getByProject']>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await expensesService.getByProject(projectId);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando gastos del proyecto');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) {
      loadData();
    }
  }, [projectId]);

  return {
    expenses: data?.expenses || [],
    totals: data?.totals || { materials: 0, labor: 0, equipment: 0, overhead: 0, total: 0 },
    loading,
    error,
    reload: loadData,
  };
}

/**
 * Hook para estadísticas de gastos
 */
export function useExpensesStats(period: 'week' | 'month' | 'quarter' | 'year' = 'month') {
  const [stats, setStats] = useState<Awaited<ReturnType<ExpensesService['getStats']>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await expensesService.getStats(period);
      setStats(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando estadísticas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, [period]);

  return {
    stats,
    loading,
    error,
    reload: loadStats,
  };
}

// =====================================================
// EXPORTACIÓN POR DEFECTO
// =====================================================

export default expensesService;