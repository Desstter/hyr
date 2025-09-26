// =====================================================
// PILA API SERVICE
// Servicio para gestión de PILA (Seguridad Social Colombia)
// =====================================================

import { useState, useCallback } from "react";
import { apiClient } from "./client";
import { apiUrl } from "../appConfig";
import { toast } from "@/components/ui/use-toast";

// Tipos para PILA
export interface PILAEmployee {
  id: string;
  document_number: string;
  name: string;
  salary: number;
  position: string;
}

export interface PILASubmission {
  id: string;
  period: string;
  employee_count: number;
  total_salary: number;
  total_health: number;
  total_pension: number;
  total_arl: number;
  total_contributions: number;
  file_path: string;
  status: "GENERADO" | "ENVIADO" | "PROCESADO" | "ERROR";
  created_at: string;
}

export interface PILAGenerateRequest {
  employees: PILAEmployee[];
}

export interface PILAGenerateResponse {
  success: boolean;
  message: string;
  data: PILASubmission & {
    file_name: string;
    employees: PILAEmployee[];
    summary: {
      period: string;
      total_employees: number;
      total_ibc: number;
      total_health: number;
      total_pension: number;
      total_arl: number;
      total_parafiscales: number;
      total_contributions: number;
    };
  };
}

export interface PILASubmissionsResponse {
  success: boolean;
  data: {
    submissions: PILASubmission[];
    total: number;
    summary: {
      total_submissions: number;
      total_employees: number;
      total_contributions: number;
      status_counts: Record<string, number>;
    };
  };
}

// =====================================================
// SERVICIOS PILA
// =====================================================

class PILAService {
  /**
   * Generar archivo PILA para un período específico
   */
  async generatePILA(
    period: string,
    _employees: PILAEmployee[]
  ): Promise<PILAGenerateResponse> {
    try {
      const response = await apiClient.post<PILAGenerateResponse>(
        `/pila/${period}/generate`,
        { year: parseInt(period.split('-')[0]) }
      );

      if (!response.success) {
        throw new Error(response.message || "Error generando PILA");
      }

      return response;
    } catch (error: unknown) {
      console.error("Error generating PILA:", error);
      
      // Si es un error de API con detalles mejorados, conservar toda la información
      if (error instanceof Error) {
        try {
          // Intentar parsear si es un error JSON con detalles
          const errorData = JSON.parse(error.message);
          if (errorData.details && errorData.help) {
            throw new Error(JSON.stringify(errorData));
          }
        } catch {
          // Si no es JSON, usar el mensaje tal como está
        }
        throw error;
      }
      
      throw new Error("Error generando archivo PILA");
    }
  }

  /**
   * Obtener todas las submissions PILA con filtros opcionales
   */
  async getSubmissions(filters?: {
    status?: string;
    year?: string;
    limit?: number;
  }): Promise<PILASubmissionsResponse> {
    try {
      const searchParams = new URLSearchParams();

      if (filters?.status) searchParams.append("status", filters.status);
      if (filters?.year) searchParams.append("year", filters.year);
      if (filters?.limit)
        searchParams.append("limit", filters.limit.toString());

      const response = await apiClient.get<PILASubmissionsResponse>(
        `/pila/submissions?${searchParams.toString()}`
      );

      if (!response.success) {
        throw new Error("Error obteniendo submissions PILA");
      }

      return response;
    } catch (error: unknown) {
      console.error("Error fetching PILA submissions:", error);
      throw new Error(
        error instanceof Error
          ? error.message
          : "Error obteniendo historial PILA"
      );
    }
  }

  /**
   * Descargar archivo CSV PILA para un período
   */
  async downloadPILA(period: string): Promise<void> {
    try {
      const downloadUrl = await apiUrl(`/pila/${period}/download`);
      const response = await fetch(downloadUrl, {
        method: "GET",
        headers: {
          Accept: "text/csv",
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || `Error HTTP ${response.status}`);
      }

      // Obtener el blob del CSV
      const blob = await response.blob();

      // Crear URL de descarga
      const url = window.URL.createObjectURL(blob);

      // Obtener nombre de archivo del header o generar uno
      const contentDisposition = response.headers.get("Content-Disposition");
      let filename = `pila_${period.replace("-", "_")}.csv`;

      if (contentDisposition) {
        const matches = /filename[^;=\n]*=((['"]).?\2|[^;\n]*)/.exec(
          contentDisposition
        );
        if (matches && matches[1]) {
          filename = matches[1].replace(/['"]/g, "");
        }
      }

      // Crear y ejecutar descarga
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Limpiar URL
      window.URL.revokeObjectURL(url);

      toast({
        title: "Descarga completada",
        description: `Archivo ${filename} descargado exitosamente`,
      });
    } catch (error: unknown) {
      console.error("Error downloading PILA:", error);
      toast({
        title: "Error de descarga",
        description:
          error instanceof Error
            ? error.message
            : "Error descargando archivo PILA",
        variant: "destructive",
      });
      throw error;
    }
  }

  /**
   * Actualizar estado de una submission PILA
   */
  async updateStatus(
    period: string,
    status: PILASubmission["status"]
  ): Promise<PILASubmission> {
    try {
      const response = await apiClient.put<{
        success: boolean;
        message: string;
        data: PILASubmission;
      }>(`/pila/${period}/status`, { status });

      if (!response.success) {
        throw new Error(response.message || "Error actualizando estado PILA");
      }

      return response.data;
    } catch (error: unknown) {
      console.error("Error updating PILA status:", error);
      throw new Error(
        error instanceof Error
          ? error.message
          : "Error actualizando estado PILA"
      );
    }
  }

  /**
   * Verificar si existe PILA para un período
   */
  async checkPILAExists(period: string): Promise<PILASubmission | null> {
    try {
      const submissions = await this.getSubmissions();
      return (
        submissions.data.submissions.find(sub => sub.period === period) || null
      );
    } catch (error) {
      console.error("Error checking PILA existence:", error);
      return null;
    }
  }

  /**
   * Obtener resumen PILA para dashboard
   */
  async getDashboardSummary(): Promise<{
    recent_submissions: PILASubmission[];
    total_employees_processed: number;
    total_contributions_this_year: number;
    pending_periods: string[];
  }> {
    try {
      const currentYear = new Date().getFullYear().toString();
      const submissions = await this.getSubmissions({
        year: currentYear,
        limit: 12,
      });

      const recent = submissions.data.submissions.slice(0, 5);
      const totalEmployees = submissions.data.summary.total_employees;
      const totalContributions = submissions.data.summary.total_contributions;

      // Determinar períodos pendientes (últimos 3 meses)
      const today = new Date();
      const pendingPeriods: string[] = [];

      for (let i = 1; i <= 3; i++) {
        const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const period = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

        if (!submissions.data.submissions.find(sub => sub.period === period)) {
          pendingPeriods.push(period);
        }
      }

      return {
        recent_submissions: recent,
        total_employees_processed: totalEmployees,
        total_contributions_this_year: totalContributions,
        pending_periods: pendingPeriods,
      };
    } catch (error: unknown) {
      console.error("Error getting PILA dashboard summary:", error);
      throw new Error(
        error instanceof Error ? error.message : "Error obteniendo resumen PILA"
      );
    }
  }
}

// Instancia singleton del servicio
export const pilaService = new PILAService();

// Hook React personalizado para PILA
export function usePILASubmissions() {
  const [submissions, setSubmissions] = useState<PILASubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSubmissions = useCallback(
    async (filters?: Parameters<typeof pilaService.getSubmissions>[0]) => {
      try {
        setLoading(true);
        setError(null);
        const response = await pilaService.getSubmissions(filters);
        setSubmissions(response.data.submissions);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Error desconocido");
        toast({
          title: "Error",
          description: "No se pudieron cargar las submissions PILA",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    },
    []
  ); // Empty dependency array since the function doesn't depend on any props or state

  const refresh = useCallback(() => loadSubmissions(), [loadSubmissions]);

  return {
    submissions,
    loading,
    error,
    loadSubmissions,
    refresh,
  };
}

// Hook para generar PILA
export function useGeneratePILA() {
  const [generating, setGenerating] = useState(false);

  const generatePILA = async (period: string, employees: PILAEmployee[]) => {
    try {
      setGenerating(true);
      const response = await pilaService.generatePILA(period, employees);

      toast({
        title: "✅ PILA generado exitosamente",
        description: `Archivo CSV creado para período ${period}`,
      });

      return response.data;
    } catch (error: unknown) {
      let title = "Error generando PILA";
      let description = "Error desconocido";
      
      if (error instanceof Error) {
        try {
          // Intentar parsear detalles mejorados del error
          const errorData = JSON.parse(error.message);
          if (errorData.details && errorData.help) {
            title = "📋 PILA requiere datos de horas trabajadas";
            description = `${errorData.error}\n\n✅ Próximos pasos:\n${errorData.details.next_steps.slice(0, 2).join('\n')}\n\n💡 ${errorData.help.workflow}`;
          } else {
            description = error.message;
          }
        } catch {
          // Si no es JSON, usar mensaje normal
          description = error.message;
        }
      }
      
      toast({
        title,
        description,
        variant: "destructive",
        duration: 8000, // Mostrar más tiempo para errores informativos
      });
      throw error;
    } finally {
      setGenerating(false);
    }
  };

  return {
    generatePILA,
    generating,
  };
}

// Exportar tipos y servicio
export default pilaService;
