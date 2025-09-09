// =====================================================
// API SERVICE - CALENDAR (CALENDARIO)
// Servicios para gestión de eventos y recordatorios
// =====================================================

import { apiClient } from "./client";
import type {
  CalendarEvent,
  CreateCalendarEventRequest,
  PayrollEvent,
  ProjectEvent,
} from "./types";

export class CalendarService {
  private endpoint = "/calendar";

  // =====================================================
  // CRUD EVENTOS DE CALENDARIO
  // =====================================================

  /**
   * Obtener todos los eventos del calendario
   */
  async getEvents(filters?: {
    start_date?: string;
    end_date?: string;
    type?: "payroll" | "project" | "reminder" | "payment";
    status?: "pending" | "completed" | "overdue";
  }): Promise<CalendarEvent[]> {
    return apiClient.get<CalendarEvent[]>(`${this.endpoint}/events`, filters);
  }

  /**
   * Obtener eventos por mes
   */
  async getEventsByMonth(
    year: number,
    month: number
  ): Promise<CalendarEvent[]> {
    return apiClient.get<CalendarEvent[]>(`${this.endpoint}/events/month`, {
      year,
      month,
    });
  }

  /**
   * Obtener evento por ID
   */
  async getEventById(id: string): Promise<CalendarEvent> {
    return apiClient.get<CalendarEvent>(`${this.endpoint}/events/${id}`);
  }

  /**
   * Crear nuevo evento
   */
  async createEvent(data: CreateCalendarEventRequest): Promise<CalendarEvent> {
    return apiClient.post<CalendarEvent>(`${this.endpoint}/events`, data);
  }

  /**
   * Actualizar evento
   */
  async updateEvent(
    id: string,
    data: Partial<CreateCalendarEventRequest>
  ): Promise<CalendarEvent> {
    return apiClient.put<CalendarEvent>(`${this.endpoint}/events/${id}`, data);
  }

  /**
   * Eliminar evento
   */
  async deleteEvent(id: string): Promise<void> {
    return apiClient.delete<void>(`${this.endpoint}/events/${id}`);
  }

  /**
   * Marcar evento como completado
   */
  async markEventCompleted(id: string): Promise<CalendarEvent> {
    return apiClient.patch<CalendarEvent>(
      `${this.endpoint}/events/${id}/complete`
    );
  }

  // =====================================================
  // EVENTOS DE NÓMINA
  // =====================================================

  /**
   * Obtener eventos de nómina
   */
  async getPayrollEvents(filters?: {
    year?: number;
    month?: number;
    status?: "pending" | "processed" | "paid";
  }): Promise<PayrollEvent[]> {
    return apiClient.get<PayrollEvent[]>(
      `${this.endpoint}/payroll-events`,
      filters
    );
  }

  /**
   * Crear recordatorio de nómina
   */
  async createPayrollReminder(data: {
    year: number;
    month: number;
    process_date: string;
    payment_date: string;
    notes?: string;
  }): Promise<PayrollEvent> {
    return apiClient.post<PayrollEvent>(
      `${this.endpoint}/payroll-events`,
      data
    );
  }

  // =====================================================
  // EVENTOS DE PROYECTO
  // =====================================================

  /**
   * Obtener eventos de proyectos
   */
  async getProjectEvents(filters?: {
    project_id?: string;
    start_date?: string;
    end_date?: string;
    type?: "start" | "milestone" | "deadline" | "completion";
  }): Promise<ProjectEvent[]> {
    return apiClient.get<ProjectEvent[]>(
      `${this.endpoint}/project-events`,
      filters
    );
  }

  /**
   * Crear evento de proyecto
   */
  async createProjectEvent(data: {
    project_id: string;
    title: string;
    description?: string;
    event_date: string;
    type: "start" | "milestone" | "deadline" | "completion";
    priority?: "low" | "medium" | "high";
  }): Promise<ProjectEvent> {
    return apiClient.post<ProjectEvent>(
      `${this.endpoint}/project-events`,
      data
    );
  }

  // =====================================================
  // RECORDATORIOS DE PAGOS
  // =====================================================

  /**
   * Obtener recordatorios de pagos próximos
   */
  async getUpcomingPayments(days_ahead: number = 30): Promise<CalendarEvent[]> {
    return apiClient.get<CalendarEvent[]>(
      `${this.endpoint}/upcoming-payments`,
      { days_ahead }
    );
  }

  /**
   * Crear recordatorio de pago
   */
  async createPaymentReminder(data: {
    title: string;
    description?: string;
    due_date: string;
    amount?: number;
    category: "tax" | "insurance" | "permit" | "equipment" | "other";
    priority: "low" | "medium" | "high";
    recurrence?: "none" | "monthly" | "quarterly" | "yearly";
  }): Promise<CalendarEvent> {
    return apiClient.post<CalendarEvent>(
      `${this.endpoint}/payment-reminders`,
      data
    );
  }

  // =====================================================
  // DASHBOARD Y ESTADÍSTICAS
  // =====================================================

  /**
   * Obtener resumen del calendario
   */
  async getCalendarSummary(): Promise<{
    events_today: number;
    events_this_week: number;
    events_this_month: number;
    overdue_events: number;
    upcoming_payroll: PayrollEvent[];
    upcoming_deadlines: ProjectEvent[];
    pending_payments: CalendarEvent[];
  }> {
    return apiClient.get<{
      events_today: number;
      events_this_week: number;
      events_this_month: number;
      overdue_events: number;
      upcoming_payroll: PayrollEvent[];
      upcoming_deadlines: ProjectEvent[];
      pending_payments: CalendarEvent[];
    }>(`${this.endpoint}/summary`);
  }

  /**
   * Obtener eventos para el dashboard
   */
  async getDashboardEvents(): Promise<{
    today: CalendarEvent[];
    thisWeek: CalendarEvent[];
    overdue: CalendarEvent[];
    nextPayroll?: PayrollEvent;
  }> {
    return apiClient.get<{
      today: CalendarEvent[];
      thisWeek: CalendarEvent[];
      overdue: CalendarEvent[];
      nextPayroll?: PayrollEvent;
    }>(`${this.endpoint}/dashboard`);
  }

  // =====================================================
  // NOTIFICACIONES Y ALERTAS
  // =====================================================

  /**
   * Obtener notificaciones pendientes
   */
  async getPendingNotifications(): Promise<CalendarEvent[]> {
    return apiClient.get<CalendarEvent[]>(`${this.endpoint}/notifications`);
  }

  /**
   * Marcar notificación como vista
   */
  async markNotificationSeen(eventId: string): Promise<void> {
    return apiClient.patch<void>(
      `${this.endpoint}/notifications/${eventId}/seen`
    );
  }

  // =====================================================
  // EXPORTACIÓN Y REPORTES
  // =====================================================

  /**
   * Exportar calendario a formato ICS
   * TODO: Implementar correctamente con ApiClient
   */
  async exportCalendar(_filters?: {
    start_date?: string;
    end_date?: string;
    types?: string[];
  }): Promise<Blob> {
    // Temporary implementation to fix compilation
    // This needs to be properly implemented with backend URL
    throw new Error("Export functionality not yet implemented");
  }

  /**
   * Generar reporte de eventos
   */
  async generateEventsReport(period: {
    start_date: string;
    end_date: string;
    format?: "pdf" | "excel";
  }): Promise<{
    total_events: number;
    events_by_type: Record<string, number>;
    events_by_status: Record<string, number>;
    overdue_count: number;
    completion_rate: number;
    downloadUrl?: string;
  }> {
    return apiClient.get<{
      total_events: number;
      events_by_type: Record<string, number>;
      events_by_status: Record<string, number>;
      overdue_count: number;
      completion_rate: number;
      downloadUrl?: string;
    }>(`${this.endpoint}/reports/events`, period);
  }
}

// Instancia singleton del servicio
export const calendarService = new CalendarService();
