// =====================================================
// API INDEX - SISTEMA HYR CONSTRUCTORA & SOLDADURA
// Punto de entrada principal para todos los servicios API
// =====================================================

import { useState } from "react";

// Importar cliente base para uso interno
import { apiClient, handleApiError } from "./client";

// Exportar cliente base
export { apiClient, ApiError, handleApiError } from "./client";
export type { ApiResponse, PaginatedApiResponse } from "./client";

// Exportar todos los tipos
export * from "./types";

// Importar servicios para uso interno
import { clientsService } from "./clients";
import { personnelService } from "./personnel";
import { projectsService } from "./projects";
import { payrollService } from "./payroll";
import { reportsService } from "./reports";
import { expensesService } from "./expenses";
import { timeEntriesService } from "./time-entries";
import { calendarService } from "./calendar";
import { simulatorService } from "./simulator";
import { budgetItemsApi } from "./budget-items";
import { settingsService } from "./settings";
import { complianceService } from "./compliance";
import { invoicingService } from "./invoicing";
import { pilaService } from "./pila";
import { filesService } from "./files";
import { incomes } from "./incomes";

// Re-exportar servicios
export { clientsService, ClientsService } from "./clients";
export { personnelService, PersonnelService } from "./personnel";
export { projectsService, ProjectsService } from "./projects";
export { payrollService, PayrollService } from "./payroll";
export { reportsService, ReportsService } from "./reports";
export { expensesService, ExpensesService } from "./expenses";
export { timeEntriesService, TimeEntriesService } from "./time-entries";
export { calendarService, CalendarService } from "./calendar";
export { simulatorService } from "./simulator";
export { budgetItemsApi } from "./budget-items";
export { settingsService, SettingsService } from "./settings";
export { complianceService, ComplianceService } from "./compliance";
export { invoicingService, InvoicingService } from "./invoicing";
export { pilaService, useGeneratePILA, usePILASubmissions } from "./pila";
export { filesService } from "./files";
export { incomes } from "./incomes";

// =====================================================
// CONFIGURACIÓN Y UTILIDADES
// =====================================================

/**
 * Configurar la URL base del API
 */
// DEPRECATED: Use runtime configuration via appConfig.ts instead
export const configureApi = async () => {
  await apiClient.initialize();
};

/**
 * Configurar token de autenticación
 */
export const setAuthToken = (token: string) => {
  apiClient.setAuthToken(token);
};

/**
 * Remover token de autenticación
 */
export const removeAuthToken = () => {
  apiClient.removeAuthToken();
};

// =====================================================
// INSTANCIAS DE SERVICIOS
// =====================================================

// Objeto con todos los servicios para fácil acceso
export const api = {
  clients: clientsService,
  personnel: personnelService,
  projects: projectsService,
  budgetItems: budgetItemsApi,
  payroll: payrollService,
  reports: reportsService,
  expenses: expensesService,
  timeEntries: timeEntriesService,
  calendar: calendarService,
  simulator: simulatorService,
  settings: settingsService,
  compliance: complianceService,
  invoicing: invoicingService,
  pila: pilaService,
  files: filesService,
  incomes: incomes,
} as const;

// =====================================================
// HOOKS Y UTILIDADES PARA REACT
// =====================================================

/**
 * Hook para manejar estados de carga de API
 */
export const useApiState = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = async <T>(apiCall: () => Promise<T>): Promise<T | null> => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiCall();
      return result;
    } catch (err) {
      const errorMessage = handleApiError(err);
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const clearError = () => setError(null);

  return { loading, error, execute, clearError };
};

// =====================================================
// CONSTANTES DE CONFIGURACIÓN
// =====================================================

// SECURITY FIX: Removed hardcoded URL, use runtime configuration
export const API_CONFIG = {
  // BASE_URL removed - use appConfig.ts for runtime configuration
  TIMEOUT: 30000, // 30 segundos
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1 segundo
} as const;

// =====================================================
// TIPOS DE RESPUESTA COMUNES
// =====================================================

export interface ApiListResponse<T> {
  data: T[];
  total: number;
  page?: number;
  limit?: number;
  totalPages?: number;
}

export interface ApiSuccessResponse {
  message: string;
  success: boolean;
}

export interface ApiErrorResponse {
  error: string;
  details?: unknown;
  code?: string;
}
