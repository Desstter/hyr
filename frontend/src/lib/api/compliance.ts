// =====================================================
// COMPLIANCE API SERVICE
// Real-time compliance statistics and data
// =====================================================

import { apiClient, ApiResponse } from "./client";

// =====================================================
// TYPES AND INTERFACES
// =====================================================

export interface InvoicesStats {
  total: number;
  today: number;
  accepted_percentage: number;
  status_breakdown: {
    [key: string]: number;
  };
}

export interface PayrollStats {
  current_period: string;
  total_employees: number;
  last_generated: string;
  status: string;
}

export interface PilaStats {
  last_period: string;
  status: string;
  total_contributions: number;
  year_total: number;
}

export interface ContractorsStats {
  total: number;
  document_support_count: number;
  obligated: number;
  not_obligated: number;
}

export interface ComplianceSummary {
  total_employees: number;
  active_projects: number;
  last_updated: string;
}

export interface ComplianceDashboardStats {
  invoices: InvoicesStats;
  payroll: PayrollStats;
  pila: PilaStats;
  contractors: ContractorsStats;
  summary: ComplianceSummary;
}

export interface RecentInvoice {
  invoice_number: string;
  client_name: string;
  total_amount: number;
  dian_status: string;
  created_at: string;
}

export interface InvoicesSummary extends InvoicesStats {
  recent_invoices: RecentInvoice[];
}

export interface ComplianceObligation {
  type: "payroll" | "pila" | "tax";
  description: string;
  days_left: number;
  priority: "high" | "medium" | "low";
}

// =====================================================
// COMPLIANCE SERVICE CLASS
// =====================================================

export class ComplianceService {
  private readonly baseUrl = "/compliance";

  /**
   * Get comprehensive dashboard statistics
   */
  async getDashboardStats(): Promise<ComplianceDashboardStats> {
    const response = await apiClient.get<ApiResponse<ComplianceDashboardStats>>(
      `${this.baseUrl}/dashboard-stats`
    );
    if (!response.data) {
      throw new Error('Invalid response from server');
    }
    return response.data;
  }

  /**
   * Get detailed invoices summary
   */
  async getInvoicesSummary(): Promise<InvoicesSummary> {
    const response = await apiClient.get<ApiResponse<InvoicesSummary>>(
      `${this.baseUrl}/invoices-summary`
    );
    if (!response.data) {
      throw new Error('Invalid response from server');
    }
    return response.data;
  }

  /**
   * Get upcoming compliance obligations
   */
  async getUpcomingObligations(): Promise<ComplianceObligation[]> {
    const response = await apiClient.get<ApiResponse<ComplianceObligation[]>>(
      `${this.baseUrl}/upcoming-obligations`
    );
    if (!response.data) {
      throw new Error('Invalid response from server');
    }
    return response.data;
  }
}

// =====================================================
// SERVICE INSTANCE
// =====================================================

export const complianceService = new ComplianceService();

// =====================================================
// REACT HOOKS
// =====================================================

import { useState, useEffect } from "react";

/**
 * Hook for dashboard statistics with auto-refresh
 */
export const useComplianceDashboard = (refreshInterval: number = 30000) => {
  const [stats, setStats] = useState<ComplianceDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setError(null);
      const data = await complianceService.getDashboardStats();
      setStats(data);
    } catch (err) {
      console.error("Error fetching compliance dashboard stats:", err);
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();

    // Set up auto-refresh
    const interval = setInterval(fetchStats, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval]);

  const refetch = () => {
    setLoading(true);
    fetchStats();
  };

  return { stats, loading, error, refetch };
};

/**
 * Hook for upcoming obligations
 */
export const useUpcomingObligations = () => {
  const [obligations, setObligations] = useState<ComplianceObligation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchObligations = async () => {
      try {
        setError(null);
        const data = await complianceService.getUpcomingObligations();
        setObligations(data);
      } catch (err) {
        console.error("Error fetching upcoming obligations:", err);
        setError(err instanceof Error ? err.message : "Error desconocido");
      } finally {
        setLoading(false);
      }
    };

    fetchObligations();
  }, []);

  return { obligations, loading, error };
};

/**
 * Hook for invoices summary with periodic refresh
 */
export const useInvoicesSummary = () => {
  const [summary, setSummary] = useState<InvoicesSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        setError(null);
        const data = await complianceService.getInvoicesSummary();
        setSummary(data);
      } catch (err) {
        console.error("Error fetching invoices summary:", err);
        setError(err instanceof Error ? err.message : "Error desconocido");
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();

    // Refresh every 5 minutes
    const interval = setInterval(fetchSummary, 300000);

    return () => clearInterval(interval);
  }, []);

  return { summary, loading, error };
};

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

/**
 * Get badge color based on DIAN status
 */
export const getDianStatusBadge = (status: string) => {
  switch (status?.toUpperCase()) {
    case "ACEPTADO":
    case "ACEPTADO_SIMULADO":
      return { color: "green", text: "Aceptado" };
    case "RECHAZADO":
    case "RECHAZADO_SIMULADO":
      return { color: "red", text: "Rechazado" };
    case "ENVIADO":
      return { color: "yellow", text: "Enviado" };
    case "GENERADO":
      return { color: "blue", text: "Generado" };
    case "SIN_DATOS":
      return { color: "gray", text: "Sin datos" };
    default:
      return { color: "gray", text: "Pendiente" };
  }
};

/**
 * Get priority badge color
 */
export const getPriorityBadge = (priority: string) => {
  switch (priority) {
    case "high":
      return { color: "red", text: "Alta" };
    case "medium":
      return { color: "yellow", text: "Media" };
    case "low":
      return { color: "green", text: "Baja" };
    default:
      return { color: "gray", text: "Normal" };
  }
};

/**
 * Format currency in Colombian pesos
 */
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

/**
 * Format percentage with one decimal
 */
export const formatPercentage = (percentage: number): string => {
  return `${percentage.toFixed(1)}%`;
};
