// =====================================================
// TIPOS PARA API - SISTEMA HYR CONSTRUCTORA & SOLDADURA
// Compatible con backend PostgreSQL Express
// =====================================================

export type Currency = "COP" | "USD" | "EUR";
export type ProjectStatus = "planned" | "in_progress" | "on_hold" | "completed";
export type ExpenseCategory = "materials" | "labor" | "equipment" | "overhead";
export type PaymentMethod = "transfer" | "cash" | "check" | "card";
export type PersonnelStatus = "active" | "inactive" | "terminated";
export type PersonnelDepartment =
  | "construccion"
  | "soldadura"
  | "administracion"
  | "mantenimiento";
export type PersonnelPosition =
  | "soldador"
  | "operario"
  | "supervisor"
  | "capataz"
  | "ayudante"
  | "administrador"
  | "gerente";
export type SalaryType = "hourly" | "monthly";
export type ARLRiskClass = "I" | "II" | "III" | "IV" | "V";

// =====================================================
// ENTIDADES PRINCIPALES
// =====================================================

export interface Client {
  id: string;
  name: string;
  contact_name?: string;
  phone?: string;
  email?: string;
  address?: string;
  created_at: string;
}

export interface Personnel {
  id: string;
  // Información básica
  name: string;
  document_type: string;
  document_number: string;
  phone?: string;
  email?: string;
  address?: string;

  // Información laboral
  position: PersonnelPosition;
  department: PersonnelDepartment;
  hire_date: string;
  status: PersonnelStatus;

  // NUEVA LÓGICA: Información financiera separada
  salary_type: SalaryType;
  hourly_rate?: number;        // DEPRECATED: Mantener para compatibilidad
  monthly_salary?: number;     // DEPRECATED: Mantener para compatibilidad
  salary_base?: number;        // NUEVO: Salario base para prestaciones
  daily_rate?: number;         // NUEVO: Precio por día real

  // NUEVO: Horarios esperados
  expected_arrival_time?: string;   // Formato "HH:MM"
  expected_departure_time?: string; // Formato "HH:MM"

  arl_risk_class: ARLRiskClass;

  // Información adicional
  emergency_contact?: string;
  emergency_phone?: string;
  bank_account?: string;

  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  name: string;
  client_id?: string;
  description?: string;

  // Información financiera
  budget_materials: number;
  budget_labor: number;
  budget_equipment: number;
  budget_overhead: number;
  budget_total: number;

  spent_materials: number;
  spent_labor: number;
  spent_equipment: number;
  spent_overhead: number;
  spent_total: number;

  // Información de ingresos
  total_income?: number;
  expected_income?: number;

  // Fechas y estado
  start_date?: string;
  end_date?: string;
  estimated_end_date?: string;
  status: ProjectStatus;
  progress: number;

  created_at: string;
  updated_at: string;

  // Relaciones
  client?: Client;
}

export interface TimeEntry {
  id: string;
  personnel_id: string;
  project_id: string;
  work_date: string;
  hours_worked: number;
  overtime_hours: number;
  description?: string;
  status?: "draft" | "submitted" | "approved" | "payroll_locked" | "rejected";

  // NUEVA LÓGICA: Campos de control de tiempo
  arrival_time?: string;           // Formato "HH:MM"
  departure_time?: string;         // Formato "HH:MM"
  expected_arrival_time?: string;  // Formato "HH:MM"
  late_minutes?: number;           // Minutos de tardanza
  early_departure_minutes?: number; // Minutos de salida temprana
  effective_hours_worked?: number; // Horas efectivas después de descuentos
  lunch_deducted?: boolean;        // Control de deducción de almuerzo

  // Costos calculados automáticamente
  hourly_rate: number;
  regular_pay: number;
  overtime_pay: number;
  total_pay: number;

  created_at: string;

  // Relaciones
  personnel?: Personnel;
  project?: Project;

  // Campos desnormalizados para JOIN queries
  personnel_name?: string;
  position?: string;
  department?: string;
  is_officially_assigned?: boolean;
}

export interface Expense {
  id: string;
  project_id?: string;
  date: string;
  category: ExpenseCategory;
  subcategory?: string;
  vendor?: string;
  description?: string;
  quantity?: number;
  unit_price?: number;
  amount: number;

  // Documentación
  invoice_number?: string;
  receipt_url?: string;

  created_at: string;

  // Relaciones
  project?: Project;
}

export interface ProjectIncome {
  id: string;
  project_id: string;
  amount: number;
  date: string;
  concept: string;
  payment_method: PaymentMethod;
  invoice_number?: string;
  notes?: string;
  
  created_at: string;
  updated_at: string;
  created_by?: string;

  // Relaciones
  project?: Project;
  project_name?: string;
}

export interface ProjectIncomesSummary {
  total_income: number;
  income_count: number;
  avg_income: number;
  first_income_date?: string;
  last_income_date?: string;
}

export interface ProjectProfitAnalysis {
  total_income: number;
  total_spent: number;
  profit_amount: number;
  profit_percentage: number;
  budget_total: number;
  budget_vs_income_percentage: number;
}

export interface PayrollPeriod {
  id: string;
  year: number;
  month: number;
  period_type: string;
  start_date: string;
  end_date: string;
  processed_at?: string;
  status: "draft" | "processing" | "completed";
  
  // Aggregate fields from backend API GROUP BY queries
  employees_processed: string;
  total_net_pay: string;
  total_employer_cost: string;
}

export interface PayrollDetail {
  id: string;
  payroll_period_id: string;
  personnel_id: string;

  // Horas y salario base
  regular_hours: number;
  overtime_hours: number;
  base_salary: number;

  // Ingresos
  regular_pay: number;
  overtime_pay: number;
  transport_allowance: number;
  bonuses: number;
  total_income: number;

  // Deducciones empleado
  health_employee: number;
  pension_employee: number;
  solidarity_contribution: number;
  withholding_tax: number;
  other_deductions: number;
  total_deductions: number;

  // Neto a pagar
  net_pay: number;

  // Aportes patronales
  health_employer: number;
  pension_employer: number;
  arl: number;
  severance: number;
  severance_interest: number;
  service_bonus: number;
  vacation: number;

  // Parafiscales
  sena: number;
  icbf: number;
  compensation_fund: number;

  // Costo total empleador
  total_employer_cost: number;

  created_at: string;

  // Campos desnormalizados para JOIN queries
  employee_name?: string;
  document_number?: string;

  // Relaciones
  personnel?: Personnel;
  payroll_period?: PayrollPeriod;
}

// =====================================================
// FACTURACIÓN ELECTRÓNICA DIAN
// =====================================================

export type DIANValidationStatus =
  | "PENDIENTE"
  | "ACEPTADO_SIMULADO"
  | "RECHAZADO_SIMULADO"
  | "ACEPTADO"
  | "RECHAZADO";

export interface InvoiceItem {
  description: string;
  quantity: number;
  unit_price: number;
}

export interface InvoiceCalculations {
  subtotal: number;
  vat_amount: number;
  reteica_amount: number;
  total_amount: number;
}

export interface ElectronicInvoice {
  id: string;
  invoice_number: string;
  client_name: string;
  client_nit?: string;
  city: string;

  // Montos calculados
  subtotal: number;
  vat_amount: number;
  reteica_amount: number;
  total_amount: number;

  // DIAN
  cufe: string;
  xml_ubl_content?: string;
  dian_validation_status: DIANValidationStatus;

  // Items de la factura
  line_items: InvoiceItem[];

  // Cálculos detallados (incluidos en respuesta del backend)
  calculations?: InvoiceCalculations & {
    vat_rate: number;
  };

  // Metadatos
  created_at: string;

  // Respuesta DIAN (incluida en creación)
  dian_response?: DIANResponse;
}

export interface DIANResponse {
  status: DIANValidationStatus;
  code: string;
  message: string;
  timestamp: string;
  trackingId?: string;
  errors?: string[];
}

export interface CreateInvoiceRequest {
  client_name: string;
  client_nit?: string;
  city: string;
  items: InvoiceItem[];
  year?: number;
  notes?: string;
  due_days?: number;
}

export interface InvoiceListFilters {
  client_name?: string;
  city?: string;
  status?: DIANValidationStatus;
  date_from?: string;
  date_to?: string;
  limit?: number;
  offset?: number;
}

export interface InvoiceStats {
  total_count: number;
  total_amount: number;
  avg_amount: number;
  by_status: {
    ACEPTADO: number;
    RECHAZADO: number;
    PENDIENTE: number;
  };
  by_city: Record<string, number>;
}

// =====================================================
// REPORTES Y DASHBOARD
// =====================================================

export interface ProjectProfitabilityReport {
  id: string;
  name: string;
  client_name?: string;
  status: ProjectStatus;
  budget_total: number;
  spent_total: number;
  remaining_budget: number;
  profit_margin_percent: number;

  // Desglose por categoría
  budget_materials: number;
  spent_materials: number;
  budget_labor: number;
  spent_labor: number;
  budget_equipment: number;
  spent_equipment: number;
  budget_overhead: number;
  spent_overhead: number;

  // Indicadores
  budget_status: "NORMAL" | "ALERTA" | "SOBREPRESUPUESTO";
  employees_assigned: number;
  total_labor_cost_direct: number;
  total_labor_cost_with_benefits: number;

  start_date?: string;
  estimated_end_date?: string;
  progress: number;
}

export interface ExecutiveDashboardKPIs {
  // Proyectos
  total_projects: number;
  active_projects: number;
  completed_this_month: number;
  revenue_this_month: number;
  projected_profit: number;

  // Nómina
  total_payroll_cost: number;
  total_net_pay: number;
  employees_paid: number;

  // Gastos
  expenses_this_month: number;
  materials_this_month: number;
  equipment_this_month: number;

  // Indicadores calculados
  net_profit_this_month: number;
  profit_margin_percent: number;
}

export interface RiskyProject {
  name: string;
  budget_total: number;
  spent_total: number;
  spent_percentage: number;
  progress: number;
  risk_level: "NORMAL" | "MONITOREAR" | "ALTO RIESGO" | "CRÍTICO";
}

export interface ExecutiveDashboardData {
  kpis: ExecutiveDashboardKPIs;
  riskyProjects: RiskyProject[];
}

export interface EmployeeProductivity {
  name: string;
  position: string;
  department: string;
  total_hours: number;
  overtime_hours: number;
  avg_daily_hours: number;
  projects_worked: number;
  total_earnings: number;
  total_cost_to_company: number;
  cost_per_hour_with_benefits: number;
  projects_list: string;
}

// =====================================================
// RESPUESTAS API
// =====================================================

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// =====================================================
// REQUESTS
// =====================================================

export interface CreatePersonnelRequest {
  name: string;
  document_type?: string;
  document_number: string;
  phone?: string;
  email?: string;
  address?: string;
  position: PersonnelPosition;
  department: PersonnelDepartment;
  hire_date: string;
  salary_type: SalaryType;
  hourly_rate?: number;        // DEPRECATED: Mantener para compatibilidad
  monthly_salary?: number;     // DEPRECATED: Mantener para compatibilidad

  // NUEVA LÓGICA: Nuevos campos obligatorios
  salary_base?: number;        // Salario base para prestaciones
  daily_rate?: number;         // Precio por día real
  expected_arrival_time?: string;   // Hora esperada de llegada
  expected_departure_time?: string; // Hora esperada de salida

  arl_risk_class?: ARLRiskClass;
  emergency_contact?: string;
  emergency_phone?: string;
  bank_account?: string;
}

export interface CreateProjectRequest {
  name: string;
  client_id?: string;
  description?: string;
  budget_materials: number;
  budget_labor: number;
  budget_equipment: number;
  budget_overhead: number;
  start_date?: string;
  estimated_end_date?: string;
  status?: ProjectStatus;
}

export interface CreateTimeEntryRequest {
  personnel_id: string;
  project_id?: string;          // OPCIONAL: Permite time entries sin proyecto específico
  work_date: string;
  hours_worked?: number;        // OPCIONAL: Se calcula automáticamente
  overtime_hours?: number;      // OPCIONAL: Se calcula automáticamente
  description?: string;
  hourly_rate?: number;         // OPCIONAL: Se calcula automáticamente

  // NUEVA LÓGICA: Campos requeridos para control de tiempo
  arrival_time: string;         // REQUERIDO: Hora de llegada "HH:MM"
  departure_time: string;       // REQUERIDO: Hora de salida "HH:MM"

  status?: "draft" | "submitted" | "approved" | "payroll_locked" | "rejected";
}

export interface CreateExpenseRequest {
  project_id?: string;
  date: string;
  category: ExpenseCategory;
  subcategory?: string;
  vendor?: string;
  description?: string;
  quantity?: number;
  unit_price?: number;
  amount: number;
  invoice_number?: string;
  receipt_url?: string;
}

export interface ProcessPayrollRequest {
  period_id: string;
}

// Update requests - Partial types for update operations
export type UpdatePersonnelRequest = Partial<CreatePersonnelRequest>;
export type UpdateProjectRequest = Partial<CreateProjectRequest>;
export type UpdateTimeEntryRequest = Partial<CreateTimeEntryRequest>;
export type UpdateExpenseRequest = Partial<CreateExpenseRequest>;

// Form data types for frontend components
export interface PersonnelFormData {
  name: string;
  document_type: string;
  document_number: string;
  phone?: string;
  email?: string;
  address?: string;
  position: PersonnelPosition;
  department: PersonnelDepartment;
  hire_date: string;
  status: PersonnelStatus;
  salary_base: number;
  daily_rate: number;
  expected_arrival_time: string;
  expected_departure_time: string;
  arl_risk_class: ARLRiskClass;
  emergency_contact?: string;
  emergency_phone?: string;
  bank_account?: string;
}

// List responses
export interface ApiListResponse<T> {
  data: T[];
  total: number;
  page?: number;
  limit?: number;
  totalPages?: number;
}

// =====================================================
// CALENDAR TYPES (CALENDARIO Y EVENTOS)
// =====================================================

export type CalendarEventType = "payroll" | "project" | "reminder" | "payment";
export type CalendarEventStatus =
  | "pending"
  | "completed"
  | "overdue"
  | "cancelled";
export type CalendarEventPriority = "low" | "medium" | "high";
export type PaymentCategory =
  | "tax"
  | "insurance"
  | "permit"
  | "equipment"
  | "other";
export type RecurrenceType = "none" | "monthly" | "quarterly" | "yearly";

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  event_date: string;
  event_time?: string;
  type: CalendarEventType;
  status: CalendarEventStatus;
  priority: CalendarEventPriority;

  // Información financiera
  amount?: number;
  category?: PaymentCategory;

  // Recurrencia
  recurrence: RecurrenceType;
  parent_event_id?: string;

  // Referencias
  project_id?: string;
  personnel_id?: string;
  payroll_period_id?: string;

  // Notificaciones
  notify_days_before?: number;
  notification_sent?: boolean;
  is_completed: boolean;
  completed_at?: string;
  completed_by?: string;

  created_at: string;
  updated_at: string;

  // Relaciones
  project?: Project;
  personnel?: Personnel;
}

export interface PayrollEvent {
  id: string;
  year: number;
  month: number;
  period_type: "monthly" | "biweekly";

  // Fechas importantes
  process_date: string;
  payment_date: string;
  cutoff_date: string;

  // Estado
  status: "pending" | "processing" | "processed" | "paid";

  // Información adicional
  total_employees: number;
  total_amount?: number;
  notes?: string;

  created_at: string;
  updated_at: string;

  // Eventos del calendario generados
  calendar_events?: CalendarEvent[];
}

export interface ProjectEvent {
  id: string;
  project_id: string;
  title: string;
  description?: string;
  event_date: string;
  type: "start" | "milestone" | "deadline" | "completion";
  status: CalendarEventStatus;
  priority: CalendarEventPriority;

  // Progreso y notas
  progress_percentage?: number;
  notes?: string;

  created_at: string;
  updated_at: string;

  // Relaciones
  project?: Project;
  calendar_event?: CalendarEvent;
}

export interface CreateCalendarEventRequest {
  title: string;
  description?: string;
  event_date: string;
  event_time?: string;
  type: CalendarEventType;
  priority?: CalendarEventPriority;

  // Información financiera
  amount?: number;
  category?: PaymentCategory;

  // Recurrencia
  recurrence?: RecurrenceType;

  // Referencias
  project_id?: string;
  personnel_id?: string;

  // Notificaciones
  notify_days_before?: number;
}

// =====================================================
// BUDGET ITEMS - Items detallados del presupuesto
// =====================================================

export type BudgetItemCategory =
  | "materials"
  | "labor"
  | "equipment"
  | "overhead";

export interface BudgetItem {
  id: string;
  project_id: string;
  category: BudgetItemCategory;
  description: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  currency: Currency;
  created_at: string;
  updated_at: string;
}

export interface BudgetSummary {
  summary: {
    materials: number;
    labor: number;
    equipment: number;
    overhead: number;
    total: number;
  };
  details: Array<{
    category: string;
    item_count: string;
    category_total: string;
  }>;
}

export interface CreateBudgetItemRequest {
  project_id: string;
  category: BudgetItemCategory;
  description: string;
  quantity?: number;
  unit_cost: number;
  currency?: Currency;
}

export type UpdateBudgetItemRequest = Partial<CreateBudgetItemRequest>;

// =====================================================
// PROJECT INCOMES - Ingresos por proyecto
// =====================================================

export interface CreateProjectIncomeRequest {
  amount: number;
  date: string;
  concept: string;
  payment_method?: PaymentMethod;
  invoice_number?: string;
  notes?: string;
}

export interface IncomeListFilters {
  project_id?: string;
  start_date?: string;
  end_date?: string;
  payment_method?: PaymentMethod;
  limit?: number;
  offset?: number;
}

export interface IncomesSummary {
  total_incomes: number;
  projects_with_incomes: number;
  total_amount: number;
  avg_amount: number;
  first_income_date?: string;
  last_income_date?: string;
}

export interface IncomesByPaymentMethod {
  payment_method: PaymentMethod;
  count: number;
  total_amount: number;
  avg_amount: number;
}

export type UpdateProjectIncomeRequest = Partial<CreateProjectIncomeRequest>;
