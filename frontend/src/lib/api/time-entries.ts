// =====================================================
// TIME ENTRIES API SERVICE - SISTEMA HYR CONSTRUCTORA & SOLDADURA
// Servicio para gestión de registros de horas trabajadas
// =====================================================

import { apiClient } from "./client";
import type {
  TimeEntry,
  CreateTimeEntryRequest,
  UpdateTimeEntryRequest,
  ApiListResponse,
} from "./types";

// =====================================================
// CLASE DE SERVICIO TIME ENTRIES
// =====================================================

export class TimeEntriesService {
  private readonly basePath = "/time-entries";

  /**
   * Obtener todos los registros de tiempo con filtros opcionales
   */
  async list(params?: {
    personnelId?: string;
    projectId?: string;
    startDate?: string;
    endDate?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<ApiListResponse<TimeEntry>> {
    const searchParams = new URLSearchParams();

    if (params?.personnelId)
      searchParams.append("personnel_id", params.personnelId);
    if (params?.projectId) searchParams.append("project_id", params.projectId);
    if (params?.startDate) searchParams.append("start_date", params.startDate);
    if (params?.endDate) searchParams.append("end_date", params.endDate);
    if (params?.status) searchParams.append("status", params.status);
    if (params?.limit) searchParams.append("limit", params.limit.toString());
    if (params?.offset) searchParams.append("offset", params.offset.toString());

    const url = searchParams.toString()
      ? `${this.basePath}?${searchParams.toString()}`
      : this.basePath;

    return apiClient.get<ApiListResponse<TimeEntry>>(url);
  }

  /**
   * Obtener registro de tiempo por ID
   */
  async getById(id: string): Promise<TimeEntry> {
    return apiClient.get<TimeEntry>(`${this.basePath}/${id}`);
  }

  /**
   * Crear nuevo registro de tiempo
   */
  async create(timeEntry: CreateTimeEntryRequest): Promise<TimeEntry> {
    return apiClient.post<TimeEntry>(this.basePath, timeEntry);
  }

  /**
   * Actualizar registro de tiempo existente
   */
  async update(
    id: string,
    timeEntry: UpdateTimeEntryRequest
  ): Promise<TimeEntry> {
    return apiClient.put<TimeEntry>(`${this.basePath}/${id}`, timeEntry);
  }

  /**
   * Eliminar registro de tiempo
   */
  async delete(id: string): Promise<void> {
    return apiClient.delete(`${this.basePath}/${id}`);
  }

  /**
   * Obtener horas trabajadas por empleado
   */
  async getByPersonnel(
    personnelId: string,
    params?: {
      startDate?: string;
      endDate?: string;
    }
  ): Promise<{
    timeEntries: TimeEntry[];
    summary: {
      totalHours: number;
      totalOvertimeHours: number;
      totalPay: number;
      daysWorked: number;
      projectsWorked: number;
      averageHoursPerDay: number;
    };
  }> {
    const searchParams = new URLSearchParams();
    if (params?.startDate) searchParams.append("start_date", params.startDate);
    if (params?.endDate) searchParams.append("end_date", params.endDate);

    const url = searchParams.toString()
      ? `${this.basePath}/personnel/${personnelId}?${searchParams.toString()}`
      : `${this.basePath}/personnel/${personnelId}`;

    return apiClient.get(url);
  }

  /**
   * Obtener horas trabajadas por proyecto
   */
  async getByProject(
    projectId: string,
    params?: {
      startDate?: string;
      endDate?: string;
    }
  ): Promise<{
    timeEntries: TimeEntry[];
    summary: {
      totalHours: number;
      totalOvertimeHours: number;
      totalCost: number;
      employeesWorked: number;
      totalDays: number;
      averageHoursPerEmployee: number;
    };
  }> {
    const searchParams = new URLSearchParams();
    if (params?.startDate) searchParams.append("start_date", params.startDate);
    if (params?.endDate) searchParams.append("end_date", params.endDate);

    const url = searchParams.toString()
      ? `${this.basePath}/project/${projectId}/summary?${searchParams.toString()}`
      : `${this.basePath}/project/${projectId}/summary`;

    return apiClient.get(url);
  }

  /**
   * Obtener registros de tiempo para un día específico
   */
  async getByDate(date: string): Promise<{
    timeEntries: TimeEntry[];
    summary: {
      totalEmployees: number;
      totalHours: number;
      totalOvertimeHours: number;
      totalCost: number;
      projectsActive: number;
    };
  }> {
    return apiClient.get(`${this.basePath}/date/${date}`);
  }

  /**
   * Crear múltiples registros de tiempo (batch)
   */
  async createBatch(timeEntries: CreateTimeEntryRequest[]): Promise<{
    created: TimeEntry[];
    errors: Array<{
      index: number;
      error: string;
      data: CreateTimeEntryRequest;
    }>;
  }> {
    return apiClient.post(`${this.basePath}/batch`, { timeEntries });
  }

  /**
   * Obtener resumen semanal de horas
   */
  async getWeeklySummary(params: {
    personnelId?: string;
    projectId?: string;
    startDate: string; // Lunes de la semana
  }): Promise<{
    weekDays: Array<{
      date: string;
      dayName: string;
      totalHours: number;
      overtimeHours: number;
      projects: Array<{
        projectId: string;
        projectName: string;
        hours: number;
      }>;
    }>;
    weekTotal: {
      regularHours: number;
      overtimeHours: number;
      totalPay: number;
      daysWorked: number;
    };
  }> {
    const searchParams = new URLSearchParams({ start_date: params.startDate });
    if (params.personnelId)
      searchParams.append("personnel_id", params.personnelId);
    if (params.projectId) searchParams.append("project_id", params.projectId);

    return apiClient.get(
      `${this.basePath}/weekly-summary?${searchParams.toString()}`
    );
  }

  /**
   * Obtener resumen mensual de horas
   */
  async getMonthlySummary(params: {
    year: number;
    month: number;
    personnelId?: string;
    projectId?: string;
  }): Promise<{
    summary: {
      totalHours: number;
      totalOvertimeHours: number;
      totalPay: number;
      daysWorked: number;
      averageHoursPerDay: number;
    };
    dailyBreakdown: Array<{
      date: string;
      totalHours: number;
      overtimeHours: number;
      employeesWorked: number;
    }>;
    personnelBreakdown: Array<{
      personnelId: string;
      personnelName: string;
      totalHours: number;
      totalPay: number;
      daysWorked: number;
    }>;
    projectBreakdown: Array<{
      projectId: string;
      projectName: string;
      totalHours: number;
      totalCost: number;
      employeesAssigned: number;
    }>;
  }> {
    const searchParams = new URLSearchParams({
      year: params.year.toString(),
      month: params.month.toString(),
    });
    if (params.personnelId)
      searchParams.append("personnel_id", params.personnelId);
    if (params.projectId) searchParams.append("project_id", params.projectId);

    return apiClient.get(
      `${this.basePath}/monthly-summary?${searchParams.toString()}`
    );
  }

  /**
   * Validar registro de tiempo antes de crear
   */
  async validate(timeEntry: CreateTimeEntryRequest): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    return apiClient.post(`${this.basePath}/validate`, timeEntry);
  }

  /**
   * Duplicar registro de tiempo con nueva fecha
   */
  async duplicate(
    id: string,
    newDate: string,
    modifications?: Partial<CreateTimeEntryRequest>
  ): Promise<TimeEntry> {
    return apiClient.post(`${this.basePath}/${id}/duplicate`, {
      newDate,
      ...modifications,
    });
  }

  /**
   * Obtener estadísticas de productividad
   */
  async getProductivityStats(params: {
    personnelId?: string;
    projectId?: string;
    period: "week" | "month" | "quarter" | "year";
    startDate?: string;
  }): Promise<{
    averageHoursPerDay: number;
    overtimePercentage: number;
    mostProductiveDay: string;
    mostProductiveHours: string; // "08:00-12:00"
    efficiency: {
      regularHours: number;
      overtimeHours: number;
      totalCost: number;
      costPerHour: number;
    };
    trends: Array<{
      period: string;
      hours: number;
      cost: number;
    }>;
  }> {
    const searchParams = new URLSearchParams({
      period: params.period,
    });
    if (params.personnelId)
      searchParams.append("personnel_id", params.personnelId);
    if (params.projectId) searchParams.append("project_id", params.projectId);
    if (params.startDate) searchParams.append("start_date", params.startDate);

    return apiClient.get(
      `${this.basePath}/productivity-stats?${searchParams.toString()}`
    );
  }

  /**
   * Exportar registros de tiempo a Excel
   */
  async exportToExcel(params?: {
    personnelId?: string;
    projectId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<Blob> {
    const searchParams = new URLSearchParams();
    if (params?.personnelId)
      searchParams.append("personnel_id", params.personnelId);
    if (params?.projectId) searchParams.append("project_id", params.projectId);
    if (params?.startDate) searchParams.append("start_date", params.startDate);
    if (params?.endDate) searchParams.append("end_date", params.endDate);

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
   * Obtener horas pendientes de aprobación
   */
  async getPendingApproval(): Promise<{
    timeEntries: TimeEntry[];
    total: number;
    oldestPending: string;
  }> {
    return apiClient.get(`${this.basePath}/pending-approval`);
  }

  /**
   * Aprobar/rechazar registros de tiempo
   */
  async updateApprovalStatus(
    ids: string[],
    status: "approved" | "rejected",
    notes?: string
  ): Promise<{
    updated: number;
    errors: Array<{
      id: string;
      error: string;
    }>;
  }> {
    return apiClient.post(`${this.basePath}/approval`, {
      ids,
      status,
      notes,
    });
  }

  /**
   * Aprobar múltiples registros de tiempo para nómina
   */
  async bulkApprove(
    ids: string[],
    approverNotes?: string
  ): Promise<{
    message: string;
    approved: Array<{
      id: string;
      personnel_id: string;
      work_date: string;
    }>;
  }> {
    return apiClient.post(`${this.basePath}/bulk-approve`, {
      ids,
      approver_notes: approverNotes,
    });
  }
}

// =====================================================
// INSTANCIA SINGLETON
// =====================================================

export const timeEntriesService = new TimeEntriesService();

// =====================================================
// HOOKS PARA REACT
// =====================================================

import { useState, useEffect, useCallback } from "react";

/**
 * Hook para cargar registros de tiempo
 */
export function useTimeEntries(
  params?: Parameters<TimeEntriesService["list"]>[0]
) {
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  const loadTimeEntries = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await timeEntriesService.list(params);
      setTimeEntries(result.data);
      setTotal(result.total);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Error cargando registros de tiempo"
      );
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    loadTimeEntries();
  }, [loadTimeEntries]);

  return {
    timeEntries,
    loading,
    error,
    total,
    reload: loadTimeEntries,
  };
}

/**
 * Hook para horas de un empleado específico
 */
export function usePersonnelTimeEntries(
  personnelId: string,
  params?: { startDate?: string; endDate?: string }
) {
  const [data, setData] = useState<Awaited<
    ReturnType<TimeEntriesService["getByPersonnel"]>
  > | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await timeEntriesService.getByPersonnel(
        personnelId,
        params
      );
      setData(result);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error cargando horas del empleado"
      );
    } finally {
      setLoading(false);
    }
  }, [personnelId, params]);

  useEffect(() => {
    if (personnelId) {
      loadData();
    }
  }, [personnelId, loadData]);

  return {
    timeEntries: data?.timeEntries || [],
    summary: data?.summary || {
      totalHours: 0,
      totalOvertimeHours: 0,
      totalPay: 0,
      daysWorked: 0,
      projectsWorked: 0,
      averageHoursPerDay: 0,
    },
    loading,
    error,
    reload: loadData,
  };
}

/**
 * Hook para horas de un proyecto específico
 */
export function useProjectTimeEntries(
  projectId: string,
  params?: { startDate?: string; endDate?: string }
) {
  const [data, setData] = useState<Awaited<
    ReturnType<TimeEntriesService["getByProject"]>
  > | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await timeEntriesService.getByProject(projectId, params);
      setData(result);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error cargando horas del proyecto"
      );
    } finally {
      setLoading(false);
    }
  }, [projectId, params]);

  useEffect(() => {
    if (projectId) {
      loadData();
    }
  }, [projectId, loadData]);

  return {
    timeEntries: data?.timeEntries || [],
    summary: data?.summary || {
      totalHours: 0,
      totalOvertimeHours: 0,
      totalCost: 0,
      employeesWorked: 0,
      totalDays: 0,
      averageHoursPerEmployee: 0,
    },
    loading,
    error,
    reload: loadData,
  };
}

/**
 * Hook para resumen semanal
 */
export function useWeeklySummary(
  startDate: string,
  personnelId?: string,
  projectId?: string
) {
  const [data, setData] = useState<Awaited<
    ReturnType<TimeEntriesService["getWeeklySummary"]>
  > | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await timeEntriesService.getWeeklySummary({
        startDate,
        personnelId,
        projectId,
      });
      setData(result);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error cargando resumen semanal"
      );
    } finally {
      setLoading(false);
    }
  }, [startDate, personnelId, projectId]);

  useEffect(() => {
    if (startDate) {
      loadData();
    }
  }, [startDate, loadData]);

  return {
    weekDays: data?.weekDays || [],
    weekTotal: data?.weekTotal || {
      regularHours: 0,
      overtimeHours: 0,
      totalPay: 0,
      daysWorked: 0,
    },
    loading,
    error,
    reload: loadData,
  };
}

// =====================================================
// EXPORTACIÓN POR DEFECTO
// =====================================================

export default timeEntriesService;
