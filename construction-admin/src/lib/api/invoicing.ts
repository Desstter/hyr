// =====================================================
// FACTURACIÓN ELECTRÓNICA API SERVICE
// HYR CONSTRUCTORA & SOLDADURA S.A.S.
// Conecta frontend Next.js con backend PostgreSQL/Express
// =====================================================

import { apiClient, ApiResponse, PaginatedApiResponse, handleApiError } from './client';
import type { ElectronicInvoice, InvoiceItem, InvoiceCalculations, DIANResponse, CreateInvoiceRequest, InvoiceListFilters } from './types';

/**
 * Servicio completo para gestión de facturación electrónica DIAN
 * Conecta directamente con backend PostgreSQL
 */
export class InvoicingService {
  private readonly basePath = '/invoicing';

  // =====================================================
  // CREACIÓN Y GESTIÓN DE FACTURAS
  // =====================================================

  /**
   * Crea nueva factura electrónica con cálculos automáticos y CUFE real
   * @param request - Datos de la factura a crear
   * @returns Factura creada con CUFE, XML UBL y validación DIAN
   */
  async createInvoice(request: CreateInvoiceRequest): Promise<ElectronicInvoice> {
    try {
      console.log('📄 Creando factura electrónica:', request.client_name);
      
      const response = await apiClient.post<ApiResponse<ElectronicInvoice>>(`${this.basePath}/invoices`, request);
      
      if (!response.data) {
        throw new Error('Error creating invoice');
      }

      console.log('✅ Factura creada exitosamente:', response.data.invoice_number);
      return response.data;

    } catch (error) {
      console.error('❌ Error creando factura electrónica:', error);
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Obtiene detalle completo de factura por ID
   * @param id - ID de la factura
   * @returns Factura con XML UBL completo y line items
   */
  async getInvoice(id: string): Promise<ElectronicInvoice> {
    try {
      const response = await apiClient.get<ApiResponse<ElectronicInvoice>>(`${this.basePath}/invoices/${id}`);
      
      if (!response.data) {
        throw new Error('Invoice not found');
      }

      return response.data;

    } catch (error) {
      console.error('❌ Error obteniendo factura:', error);
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Lista facturas con filtros avanzados y paginación
   * @param filters - Filtros opcionales de búsqueda
   * @returns Lista paginada de facturas
   */
  async listInvoices(filters?: InvoiceListFilters): Promise<PaginatedApiResponse<ElectronicInvoice>> {
    try {
      const params = new URLSearchParams();
      
      if (filters?.client_name) params.append('client_name', filters.client_name);
      if (filters?.city) params.append('city', filters.city);
      if (filters?.status) params.append('status', filters.status);
      if (filters?.date_from) params.append('date_from', filters.date_from);
      if (filters?.date_to) params.append('date_to', filters.date_to);
      if (filters?.limit) params.append('limit', filters.limit.toString());
      if (filters?.offset) params.append('offset', filters.offset.toString());

      const url = `${this.basePath}/invoices${params.toString() ? '?' + params.toString() : ''}`;
      const response = await apiClient.get<PaginatedApiResponse<ElectronicInvoice>>(url);

      if (!response.data) {
        throw new Error('Error listing invoices');
      }

      return response;

    } catch (error) {
      console.error('❌ Error listando facturas:', error);
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Reenvía factura a DIAN para validación
   * @param id - ID de la factura a reenviar
   * @returns Respuesta de validación DIAN actualizada
   */
  async resendToDian(id: string): Promise<DIANResponse> {
    try {
      console.log('🔄 Reenviando factura a DIAN:', id);

      const response = await apiClient.post<ApiResponse<DIANResponse>>(`${this.basePath}/invoices/${id}/resend-dian`);
      
      if (!response.data) {
        throw new Error('Error resending to DIAN');
      }

      console.log('✅ Factura reenviada a DIAN:', response.data.status);
      return response.data;

    } catch (error) {
      console.error('❌ Error reenviando a DIAN:', error);
      throw new Error(handleApiError(error));
    }
  }

  // =====================================================
  // UTILIDADES Y CÁLCULOS
  // =====================================================

  /**
   * Calcula automáticamente totales de factura
   * Utiliza las mismas fórmulas que el backend para consistencia
   * @param items - Items de la factura
   * @param city - Ciudad para cálculo ReteICA
   * @returns Cálculos tributarios completos
   */
  calculateTotals(items: InvoiceItem[], city: string = 'Bogota'): InvoiceCalculations {
    // Calcular subtotal
    const subtotal = items.reduce((sum, item) => {
      return sum + (item.quantity * item.unit_price);
    }, 0);

    // IVA 19% (estándar construcción)
    const vat_amount = subtotal * 0.19;

    // ReteICA por ciudad (solo Bogotá implementada por ahora)
    let reteica_amount = 0;
    if (city === 'Bogota') {
      reteica_amount = subtotal * 0.00966; // 0.966% construcción Bogotá
    }

    // Total final
    const total_amount = subtotal + vat_amount - reteica_amount;

    return {
      subtotal: Math.round(subtotal * 100) / 100,
      vat_amount: Math.round(vat_amount * 100) / 100,
      reteica_amount: Math.round(reteica_amount * 100) / 100,
      total_amount: Math.round(total_amount * 100) / 100,
    };
  }

  /**
   * Valida datos de factura antes de envío
   * @param request - Datos de factura a validar
   * @returns Array de errores de validación (vacío si válida)
   */
  validateInvoiceData(request: CreateInvoiceRequest): string[] {
    const errors: string[] = [];

    // Validaciones básicas
    if (!request.client_name?.trim()) {
      errors.push('El nombre del cliente es requerido');
    }

    if (!request.city?.trim()) {
      errors.push('La ciudad es requerida');
    }

    if (!request.items || request.items.length === 0) {
      errors.push('Debe agregar al menos un ítem');
    }

    // Validar items individualmente
    request.items?.forEach((item, index) => {
      if (!item.description?.trim()) {
        errors.push(`Item ${index + 1}: La descripción es requerida`);
      }
      if (!item.quantity || item.quantity <= 0) {
        errors.push(`Item ${index + 1}: La cantidad debe ser mayor a 0`);
      }
      if (!item.unit_price || item.unit_price <= 0) {
        errors.push(`Item ${index + 1}: El precio unitario debe ser mayor a 0`);
      }
    });

    return errors;
  }

  // =====================================================
  // UTILIDADES XML Y DOCUMENTOS
  // =====================================================

  /**
   * Descarga XML UBL de factura
   * @param invoice - Factura con XML content
   * @param filename - Nombre del archivo (opcional)
   */
  downloadXML(invoice: ElectronicInvoice, filename?: string): void {
    if (!invoice.xml_ubl_content) {
      throw new Error('La factura no tiene contenido XML');
    }

    const blob = new Blob([invoice.xml_ubl_content], { type: 'text/xml' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    link.href = url;
    link.download = filename || `factura_${invoice.invoice_number}.xml`;
    
    document.body.appendChild(link);
    link.click();
    
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    console.log('📄 XML descargado:', link.download);
  }

  /**
   * Formatea CUFE para visualización
   * @param cufe - CUFE sin formatear
   * @returns CUFE formateado con guiones
   */
  formatCUFE(cufe: string): string {
    if (!cufe || cufe.length < 16) return cufe;
    
    const cleanCUFE = cufe.replace(/-/g, '');
    if (cleanCUFE.length === 32) {
      return [
        cleanCUFE.substring(0, 8),
        cleanCUFE.substring(8, 16),
        cleanCUFE.substring(16, 24),
        cleanCUFE.substring(24, 32)
      ].join('-');
    }
    
    return cufe;
  }

  // =====================================================
  // ESTADÍSTICAS Y REPORTES
  // =====================================================

  /**
   * Obtiene estadísticas rápidas de facturación
   * @param period - Período en formato YYYY-MM (opcional)
   * @returns Resumen estadístico de facturas
   */
  async getInvoiceStats(period?: string) {
    try {
      const filters: InvoiceListFilters = { limit: 1000 }; // Obtener todas para stats locales
      if (period) {
        const [year, month] = period.split('-');
        filters.date_from = `${year}-${month}-01`;
        filters.date_to = `${year}-${month}-31`;
      }

      const response = await this.listInvoices(filters);
      const invoices = response.data?.invoices || response.data || [];

      const stats = {
        total_count: invoices.length,
        total_amount: invoices.reduce((sum: number, inv: ElectronicInvoice) => sum + inv.total_amount, 0),
        avg_amount: invoices.length > 0 ? invoices.reduce((sum: number, inv: ElectronicInvoice) => sum + inv.total_amount, 0) / invoices.length : 0,
        by_status: {
          ACEPTADO: invoices.filter((inv: ElectronicInvoice) => inv.dian_validation_status === 'ACEPTADO' || inv.dian_validation_status === 'ACEPTADO_SIMULADO').length,
          RECHAZADO: invoices.filter((inv: ElectronicInvoice) => inv.dian_validation_status === 'RECHAZADO' || inv.dian_validation_status === 'RECHAZADO_SIMULADO').length,
          PENDIENTE: invoices.filter((inv: ElectronicInvoice) => inv.dian_validation_status === 'PENDIENTE').length,
        },
        by_city: invoices.reduce((acc: Record<string, number>, inv: ElectronicInvoice) => {
          acc[inv.city] = (acc[inv.city] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      };

      return stats;

    } catch (error) {
      console.error('❌ Error obteniendo estadísticas:', error);
      throw new Error(handleApiError(error));
    }
  }
}

// =====================================================
// INSTANCIA DEL SERVICIO
// =====================================================

/**
 * Instancia singleton del servicio de facturación
 * Para usar en toda la aplicación
 */
export const invoicingService = new InvoicingService();

/**
 * Hook personalizado para usar el servicio en React
 * @returns Servicio de facturación con utilidades adicionales
 */
export const useInvoicingService = () => {
  return {
    service: invoicingService,
    calculateTotals: invoicingService.calculateTotals.bind(invoicingService),
    validateInvoiceData: invoicingService.validateInvoiceData.bind(invoicingService),
    formatCUFE: invoicingService.formatCUFE.bind(invoicingService),
  };
};

export default invoicingService;