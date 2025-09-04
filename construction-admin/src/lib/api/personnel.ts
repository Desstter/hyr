// =====================================================
// API SERVICE - PERSONNEL (EMPLEADOS)
// Servicios para gestión de empleados y nómina
// =====================================================

import { apiClient } from './client';
import type {
  Personnel,
  CreatePersonnelRequest,
  TimeEntry,
  CreateTimeEntryRequest,
  EmployeeProductivity,
} from './types';

export class PersonnelService {
  private endpoint = '/personnel';

  // =====================================================
  // CRUD EMPLEADOS
  // =====================================================

  /**
   * Obtener todos los empleados
   */
  async getAll(filters?: {
    status?: string;
    department?: string;
    position?: string;
  }): Promise<Personnel[]> {
    return apiClient.get<Personnel[]>(this.endpoint, filters);
  }

  /**
   * Alias para getAll - mantiene compatibilidad con componentes existentes
   */
  async list(filters?: {
    status?: string;
    department?: string;
    position?: string;
  }): Promise<{ data: Personnel[] }> {
    const personnel = await this.getAll(filters);
    return { data: personnel };
  }

  /**
   * Obtener empleado por ID
   */
  async getById(id: string): Promise<Personnel> {
    return apiClient.get<Personnel>(`${this.endpoint}/${id}`);
  }

  /**
   * Crear nuevo empleado
   */
  async create(data: CreatePersonnelRequest): Promise<Personnel> {
    return apiClient.post<Personnel>(this.endpoint, data);
  }

  /**
   * Actualizar empleado
   */
  async update(id: string, data: Partial<CreatePersonnelRequest>): Promise<Personnel> {
    return apiClient.put<Personnel>(`${this.endpoint}/${id}`, data);
  }

  /**
   * Cambiar estado del empleado
   */
  async updateStatus(id: string, status: 'active' | 'inactive' | 'terminated'): Promise<Personnel> {
    return apiClient.put<Personnel>(`${this.endpoint}/${id}/status`, { status });
  }

  /**
   * Eliminar empleado permanentemente de la base de datos
   * (Solo posible si no tiene registros de tiempo o nómina)
   */
  async delete(id: string): Promise<void> {
    return apiClient.delete<void>(`${this.endpoint}/${id}`);
  }

  // =====================================================
  // REGISTRO DE HORAS
  // =====================================================

  /**
   * Obtener horas trabajadas de un empleado
   */
  async getTimeEntries(personnelId: string, filters?: {
    startDate?: string;
    endDate?: string;
    projectId?: string;
  }): Promise<TimeEntry[]> {
    return apiClient.get<TimeEntry[]>(`${this.endpoint}/${personnelId}/time-entries`, filters);
  }

  /**
   * Registrar horas trabajadas
   */
  async createTimeEntry(data: CreateTimeEntryRequest): Promise<TimeEntry> {
    return apiClient.post<TimeEntry>('/time-entries', data);
  }

  /**
   * Actualizar registro de horas
   */
  async updateTimeEntry(id: string, data: Partial<CreateTimeEntryRequest>): Promise<TimeEntry> {
    return apiClient.put<TimeEntry>(`/time-entries/${id}`, data);
  }

  /**
   * Eliminar registro de horas
   */
  async deleteTimeEntry(id: string): Promise<void> {
    return apiClient.delete<void>(`/time-entries/${id}`);
  }

  // =====================================================
  // REPORTES Y ANALYTICS
  // =====================================================

  /**
   * Obtener productividad de empleados
   */
  async getProductivityReport(filters?: {
    month?: number;
    year?: number;
    department?: string;
  }): Promise<EmployeeProductivity[]> {
    return apiClient.get<EmployeeProductivity[]>('/reports/employee-productivity', filters);
  }

  /**
   * Obtener resumen de horas por empleado
   */
  async getHoursSummary(personnelId: string, filters?: {
    startDate?: string;
    endDate?: string;
  }): Promise<{
    totalHours: number;
    overtimeHours: number;
    regularHours: number;
    totalPay: number;
    averageHoursPerDay: number;
  }> {
    return apiClient.get<any>(`${this.endpoint}/${personnelId}/hours-summary`, filters);
  }

  /**
   * Obtener empleados activos
   */
  async getActivePersonnel(): Promise<Personnel[]> {
    return this.getAll({ status: 'active' });
  }

  /**
   * Obtener empleados por departamento
   */
  async getByDepartment(department: string): Promise<Personnel[]> {
    return this.getAll({ department });
  }

  /**
   * Obtener empleados por proyecto
   */
  async getByProject(projectId: string): Promise<Personnel[]> {
    return apiClient.get<Personnel[]>(`/projects/${projectId}/personnel`);
  }

  // =====================================================
  // BÚSQUEDA Y FILTROS
  // =====================================================

  /**
   * Buscar empleados por nombre o documento
   */
  async search(query: string): Promise<Personnel[]> {
    return apiClient.get<Personnel[]>(`${this.endpoint}/search`, { q: query });
  }

  /**
   * Obtener estadísticas de empleados
   */
  async getStats(): Promise<{
    total: number;
    active: number;
    byDepartment: Record<string, number>;
    byPosition: Record<string, number>;
    averageHourlyRate: number;
    totalMonthlyCost: number;
  }> {
    return apiClient.get<any>(`${this.endpoint}/stats`);
  }

  // =====================================================
  // MÉTODOS CON RETRY AUTOMÁTICO Y MANEJO ROBUSTO
  // =====================================================

  /**
   * Crear empleado con retry automático
   */
  async createWithRetry(data: CreatePersonnelRequest, maxRetries: number = 2): Promise<Personnel> {
    let lastError: any;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await this.create(data);
      } catch (error: any) {
        lastError = error;
        console.warn(`Create personnel attempt ${attempt + 1}/${maxRetries + 1} failed:`, error.message);
        
        if (attempt < maxRetries) {
          // Esperar antes de reintentar (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }
    
    throw lastError;
  }

  /**
   * Actualizar empleado con retry automático
   */
  async updateWithRetry(id: string, data: Partial<CreatePersonnelRequest>, maxRetries: number = 2): Promise<Personnel> {
    let lastError: any;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await this.update(id, data);
      } catch (error: any) {
        lastError = error;
        console.warn(`Update personnel attempt ${attempt + 1}/${maxRetries + 1} failed:`, error.message);
        
        if (attempt < maxRetries) {
          // Esperar antes de reintentar (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }
    
    throw lastError;
  }

  /**
   * Obtener empleados con fallback a cache local
   */
  async getAllSafe(filters?: {
    status?: string;
    department?: string;
    position?: string;
  }): Promise<Personnel[]> {
    try {
      const personnel = await this.getAll(filters);
      
      // Cache simple en localStorage para emergencias
      if (typeof window !== 'undefined') {
        localStorage.setItem('personnel_cache', JSON.stringify({
          data: personnel,
          timestamp: Date.now(),
          filters
        }));
      }
      
      return personnel;
    } catch (error: any) {
      console.error('Error loading personnel, attempting fallback:', error.message);
      
      // Intentar cargar desde cache si es reciente (menos de 5 minutos)
      if (typeof window !== 'undefined') {
        try {
          const cache = localStorage.getItem('personnel_cache');
          if (cache) {
            const { data, timestamp } = JSON.parse(cache);
            const isRecent = Date.now() - timestamp < 5 * 60 * 1000; // 5 minutos
            
            if (isRecent && data) {
              console.info('Using cached personnel data as fallback');
              return data;
            }
          }
        } catch (cacheError) {
          console.error('Cache fallback failed:', cacheError);
        }
      }
      
      // Si no hay cache disponible, re-throw el error original
      throw error;
    }
  }
}

// Instancia singleton del servicio
export const personnelService = new PersonnelService();