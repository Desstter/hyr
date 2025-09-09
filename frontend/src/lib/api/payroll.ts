// =====================================================
// API SERVICE - PAYROLL (NÓMINA)
// Servicios para nómina colombiana 2024
// =====================================================

import { apiClient } from "./client";
import type {
  PayrollPeriod,
  PayrollDetail,
} from "./types";

export class PayrollService {
  private endpoint = "/payroll";

  // =====================================================
  // PERÍODOS DE NÓMINA
  // =====================================================

  /**
   * Obtener todos los períodos de nómina
   */
  async getPeriods(filters?: {
    year?: number;
    status?: string;
  }): Promise<PayrollPeriod[]> {
    return apiClient.get<PayrollPeriod[]>(`${this.endpoint}/periods`, filters);
  }

  /**
   * Obtener período por ID
   */
  async getPeriodById(id: string): Promise<PayrollPeriod> {
    return apiClient.get<PayrollPeriod>(`${this.endpoint}/periods/${id}`);
  }

  /**
   * Crear nuevo período de nómina
   */
  async createPeriod(data: {
    year: number;
    month: number;
    period_type?: string;
  }): Promise<PayrollPeriod> {
    return apiClient.post<PayrollPeriod>(`${this.endpoint}/periods`, data);
  }

  /**
   * Eliminar período
   */
  async deletePeriod(id: string): Promise<void> {
    return apiClient.delete<void>(`${this.endpoint}/periods/${id}`);
  }

  // =====================================================
  // PROCESAMIENTO DE NÓMINA
  // =====================================================

  /**
   * Procesar nómina automáticamente
   * Calcula toda la nómina colombiana con deducciones y aportes
   */
  async processPayroll(periodId: string): Promise<{ message: string }> {
    return apiClient.post<{ message: string }>(
      `${this.endpoint}/periods/${periodId}/process`
    );
  }

  /**
   * Procesar nómina con compliance 2025
   * Incluye FSP, Law 114-1, ARL por sitio de trabajo
   */
  async processPayroll2025(periodId: string): Promise<{
    message: string;
    processed: number;
    totalCost: number;
    compliance2025: boolean;
  }> {
    return apiClient.post<{
      message: string;
      processed: number;
      totalCost: number;
      compliance2025: boolean;
    }>(`${this.endpoint}/periods/${periodId}/process-2025`);
  }

  /**
   * Obtener detalles de nómina de un período
   */
  async getPayrollDetails(periodId: string): Promise<PayrollDetail[]> {
    return apiClient.get<PayrollDetail[]>(
      `${this.endpoint}/periods/${periodId}/details`
    );
  }

  /**
   * Obtener detalle de nómina de un empleado específico
   */
  async getEmployeePayrollDetail(
    periodId: string,
    personnelId: string
  ): Promise<PayrollDetail> {
    return apiClient.get<PayrollDetail>(
      `${this.endpoint}/periods/${periodId}/details/${personnelId}`
    );
  }

  /**
   * Actualizar detalle de nómina manualmente
   */
  async updatePayrollDetail(
    id: string,
    data: Partial<PayrollDetail>
  ): Promise<PayrollDetail> {
    return apiClient.put<PayrollDetail>(`${this.endpoint}/details/${id}`, data);
  }

  // =====================================================
  // REPORTES DE NÓMINA
  // =====================================================

  /**
   * Obtener resumen de nómina del período
   */
  async getPayrollSummary(periodId: string): Promise<{
    totalEmployees: number;
    totalNetPay: number;
    totalEmployerCost: number;
    totalDeductions: number;
    totalBenefits: number;
    byDepartment: Array<{
      department: string;
      employees: number;
      totalCost: number;
      avgSalary: number;
    }>;
    payrollTax: {
      totalHealthEmployee: number;
      totalPensionEmployee: number;
      totalHealthEmployer: number;
      totalPensionEmployer: number;
      totalArl: number;
      totalSena: number;
      totalIcbf: number;
      totalCompensationFund: number;
    };
  }> {
    return apiClient.get<{
      totalEmployees: number;
      totalNetPay: number;
      totalEmployerCost: number;
      totalDeductions: number;
      totalBenefits: number;
      byDepartment: Array<{
        department: string;
        employees: number;
        totalCost: number;
        avgSalary: number;
      }>;
      payrollTax: {
        totalHealthEmployee: number;
        totalPensionEmployee: number;
        totalHealthEmployer: number;
        totalPensionEmployer: number;
        totalArl: number;
        totalSena: number;
        totalIcbf: number;
        totalCompensationFund: number;
      };
    }>(`${this.endpoint}/periods/${periodId}/summary`);
  }

  /**
   * Obtener nómina en formato PILA (para entidades colombianas)
   */
  async getPILAReport(periodId: string): Promise<{
    periodo: string;
    empleados: Array<{
      documento: string;
      nombre: string;
      salario: number;
      diasTrabajados: number;
      salud: number;
      pension: number;
      arl: number;
      parafiscales: number;
    }>;
    totales: {
      empleados: number;
      salarios: number;
      aportes: number;
    };
  }> {
    return apiClient.get<{
      periodo: string;
      empleados: Array<{
        documento: string;
        nombre: string;
        salario: number;
        diasTrabajados: number;
        salud: number;
        pension: number;
        arl: number;
        parafiscales: number;
      }>;
      totales: { empleados: number; salarios: number; aportes: number };
    }>(`${this.endpoint}/periods/${periodId}/pila`);
  }

  /**
   * Obtener reporte PILA 2025 con compliance completo
   * Incluye FSP, Law 114-1 exemptions, ARL por sitio
   */
  async getPILA2025Report(periodId: string): Promise<{
    periodo: string;
    formato: "PILA_2025";
    compliance: {
      fsp_included: boolean;
      law_114_1_applied: boolean;
      arl_by_worksite: boolean;
    };
    empleados: Array<{
      documento: string;
      nombre: string;
      salario: number;
      diasTrabajados: number;
      ibc: number;
      salud: number;
      pension: number;
      fsp?: number;
      arl: number;
      arlClass: string;
      parafiscales: number;
      law_114_1_exempt?: boolean;
      centroTrabajo: string;
    }>;
    totales: {
      empleados: number;
      salarios: number;
      aportes: number;
      fspTotal: number;
      ahorroLaw114_1: number;
    };
  }> {
    return apiClient.get<{
      periodo: string;
      formato: "PILA_2025";
      compliance: {
        fsp_included: boolean;
        law_114_1_applied: boolean;
        arl_by_worksite: boolean;
      };
      empleados: Array<{
        documento: string;
        nombre: string;
        salario: number;
        diasTrabajados: number;
        ibc: number;
        salud: number;
        pension: number;
        fsp?: number;
        arl: number;
        arlClass: string;
        parafiscales: number;
        law_114_1_exempt?: boolean;
        centroTrabajo: string;
      }>;
      totales: {
        empleados: number;
        salarios: number;
        aportes: number;
        fspTotal: number;
        ahorroLaw114_1: number;
      };
    }>(`${this.endpoint}/periods/${periodId}/pila-2025`);
  }

  /**
   * Generar certificados laborales
   */
  async generateLaborCertificate(
    personnelId: string,
    year: number
  ): Promise<{
    empleado: {
      nombre: string;
      documento: string;
      cargo: string;
      fechaIngreso: string;
    };
    ingresos: {
      salarioTotal: number;
      prestaciones: number;
      deducciones: number;
    };
    periodos: Array<{
      mes: string;
      salario: number;
      deducciones: number;
      neto: number;
    }>;
  }> {
    return apiClient.get<{
      empleado: {
        nombre: string;
        documento: string;
        cargo: string;
        fechaIngreso: string;
      };
      ingresos: {
        salarioTotal: number;
        prestaciones: number;
        deducciones: number;
      };
      periodos: Array<{
        mes: string;
        salario: number;
        deducciones: number;
        neto: number;
      }>;
    }>(`${this.endpoint}/certificates/${personnelId}/${year}`);
  }

  // =====================================================
  // LIQUIDACIONES
  // =====================================================

  /**
   * Calcular liquidación de prestaciones sociales
   */
  async calculateSettlement(
    personnelId: string,
    endDate: string
  ): Promise<{
    empleado: {
      nombre: string;
      fechaIngreso: string;
      fechaSalida: string;
      tiempoServicio: string;
    };
    prestaciones: {
      cesantias: number;
      interesesCesantias: number;
      prima: number;
      vacaciones: number;
      total: number;
    };
    indemnizacion?: number;
    totalLiquidacion: number;
  }> {
    return apiClient.post<{
      empleado: {
        nombre: string;
        fechaIngreso: string;
        fechaSalida: string;
        tiempoServicio: string;
      };
      prestaciones: {
        cesantias: number;
        interesesCesantias: number;
        prima: number;
        vacaciones: number;
        total: number;
      };
      indemnizacion?: number;
      totalLiquidacion: number;
    }>(`${this.endpoint}/settlement/${personnelId}`, { endDate });
  }

  // =====================================================
  // CONFIGURACIÓN NÓMINA COLOMBIA
  // =====================================================

  /**
   * Obtener configuración de nómina colombiana 2024
   */
  async getColombianPayrollConfig(): Promise<{
    salarioMinimo: number;
    auxilioTransporte: number;
    deducciones: {
      salud: number;
      pension: number;
      solidaridad: number;
    };
    aportes: {
      salud: number;
      pension: number;
      arl: number;
      cesantias: number;
      prima: number;
      vacaciones: number;
    };
    parafiscales: {
      sena: number;
      icbf: number;
      cajas: number;
    };
    riesgosARL: Record<string, number>;
  }> {
    return apiClient.get<{
      salarioMinimo: number;
      auxilioTransporte: number;
      deducciones: { salud: number; pension: number; solidaridad: number };
      aportes: {
        salud: number;
        pension: number;
        arl: number;
        cesantias: number;
        prima: number;
        vacaciones: number;
      };
      parafiscales: { sena: number; icbf: number; cajas: number };
      riesgosARL: Record<string, number>;
    }>(`${this.endpoint}/config/colombia`);
  }

  /**
   * Obtener configuración nómina colombiana 2025 con compliance completo
   */
  async getPayrollConfig2025(): Promise<{
    year: number;
    version: string;
    salarioMinimo: number;
    auxilioTransporte: number;
    uvt: number;
    deducciones: {
      salud: number;
      pension: number;
    };
    aportes: {
      salud: number;
      pension: number;
      arl: Record<string, number>;
      cesantias: number;
      prima: number;
      vacaciones: number;
    };
    parafiscales: {
      sena: number;
      icbf: number;
      cajas: number;
    };
    fsp: {
      ranges: Array<{
        min: number;
        max: number;
        rate: number;
      }>;
    };
    law_114_1: {
      enabled: boolean;
      salud_employer_exempt: boolean;
      parafiscales_exempt: boolean;
      conditions: {
        max_uvt_salary: number;
        min_employees: number;
      };
    };
    arlClasses: Record<
      string,
      {
        rate: number;
        description: string;
        workTypes: string[];
      }
    >;
  }> {
    return apiClient.get<{
      year: number;
      version: string;
      salarioMinimo: number;
      auxilioTransporte: number;
      uvt: number;
      deducciones: {
        salud: number;
        pension: number;
        solidaridad: number;
        retencionFuente: {
          exempt_min: number;
          rate_brackets: Array<{ min: number; max: number; rate: number }>;
        };
      };
      aportes: {
        salud: number;
        pension: number;
        arl: Record<string, number>;
        cesantias: number;
        prima: number;
        vacaciones: number;
      };
      parafiscales: {
        sena: number;
        icbf: number;
        cajas: number;
      };
      fsp: {
        ranges: Array<{
          min: number;
          max: number;
          rate: number;
        }>;
      };
      law_114_1: {
        enabled: boolean;
        salud_employer_exempt: boolean;
        parafiscales_exempt: boolean;
        conditions: {
          max_uvt_salary: number;
          min_employees: number;
        };
      };
      arlClasses: Record<
        string,
        { rate: number; description: string; workTypes: string[] }
      >;
    }>(`${this.endpoint}/config/2025`);
  }

  /**
   * Calcular nómina de un empleado sin guardar (simulador)
   */
  async simulatePayroll(data: {
    personnelId: string;
    hoursWorked: number;
    overtimeHours: number;
    month: number;
    year: number;
  }): Promise<{
    salarioBase: number;
    salarioRegular: number;
    salarioExtra: number;
    auxilioTransporte: number;
    deducciones: {
      salud: number;
      pension: number;
      solidaridad: number;
    };
    aportes: {
      salud: number;
      pension: number;
      arl: number;
      cesantias: number;
      prima: number;
      vacaciones: number;
    };
    parafiscales: {
      sena: number;
      icbf: number;
      cajas: number;
    };
    netoAPagar: number;
    costoTotalEmpleador: number;
  }> {
    return apiClient.post<{
      salarioBase: number;
      salarioRegular: number;
      salarioExtra: number;
      auxilioTransporte: number;
      deducciones: { salud: number; pension: number; solidaridad: number };
      aportes: {
        salud: number;
        pension: number;
        arl: number;
        cesantias: number;
        prima: number;
        vacaciones: number;
      };
      parafiscales: { sena: number; icbf: number; cajas: number };
      netoAPagar: number;
      costoTotalEmpleador: number;
    }>(`${this.endpoint}/simulate`, data);
  }

  // =====================================================
  // ESTADÍSTICAS
  // =====================================================

  /**
   * Obtener estadísticas de nómina
   */
  async getPayrollStats(filters?: { year?: number; month?: number }): Promise<{
    totalProcessed: number;
    totalCost: number;
    averageSalary: number;
    totalDeductions: number;
    totalBenefits: number;
    monthlyTrend: Array<{
      month: string;
      totalCost: number;
      employees: number;
      avgSalary: number;
    }>;
    departmentCosts: Array<{
      department: string;
      totalCost: number;
      employees: number;
      percentage: number;
    }>;
  }> {
    return apiClient.get<{
      totalProcessed: number;
      totalCost: number;
      averageSalary: number;
      totalDeductions: number;
      totalBenefits: number;
      monthlyTrend: Array<{
        month: string;
        totalCost: number;
        employees: number;
        avgSalary: number;
      }>;
      departmentCosts: Array<{
        department: string;
        totalCost: number;
        employees: number;
        percentage: number;
      }>;
    }>(`${this.endpoint}/stats`, filters);
  }
}

// Instancia singleton del servicio
export const payrollService = new PayrollService();
