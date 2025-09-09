// =====================================================
// API SERVICE - SETTINGS (CONFIGURACIONES)
// Servicios para gestión de configuraciones del sistema
// =====================================================

import { apiClient } from "./client";

// =====================================================
// TIPOS DE DATOS
// =====================================================

export interface BusinessProfile {
  name: string;
  contact: string;
  email: string;
  phone: string;
  address: string;
  currency: string;
  taxId?: string;
  website?: string;
}

export interface ThemeSettings {
  mode: "light" | "dark";
  language: "es" | "en";
  dateFormat: string;
  timeFormat: string;
  primaryColor: string;
}

export interface AppPreferences {
  notifications: boolean;
  emailAlerts: boolean;
  autoBackup: boolean;
  defaultCurrency: string;
  backupFrequency: "daily" | "weekly" | "monthly";
  reportLanguage: "es" | "en";
}

export interface NotificationSettings {
  emailEnabled: boolean;
  pushEnabled: boolean;
  payrollReminders: boolean;
  projectDeadlines: boolean;
  expenseAlerts: boolean;
  budgetWarnings: boolean;
}

export interface PayrollSettings {
  salarioMinimo: number;
  auxilioTransporte: number;
  factorPrestacional: number;
  arlClase: string;
  arlTarifa: number;
}

export interface Setting<T = unknown> {
  key: string;
  value: T;
  category: string;
  description: string;
  updated_at: string;
}

export interface AllSettings {
  business_profile: Setting<BusinessProfile>;
  theme_settings: Setting<ThemeSettings>;
  app_preferences: Setting<AppPreferences>;
  notification_settings: Setting<NotificationSettings>;
  payroll_settings: Setting<PayrollSettings>;
  [key: string]: Setting;
}

// =====================================================
// SERVICIO DE CONFIGURACIONES
// =====================================================

export class SettingsService {
  private endpoint = "/settings";

  /**
   * Obtener todas las configuraciones
   */
  async getAll(): Promise<AllSettings> {
    return apiClient.get<AllSettings>(`${this.endpoint}`);
  }

  /**
   * Obtener configuraciones por categoría
   */
  async getByCategory(category: string): Promise<Record<string, unknown>> {
    return apiClient.get<Record<string, unknown>>(
      `${this.endpoint}/category/${category}`
    );
  }

  /**
   * Obtener configuración específica
   */
  async get<T>(key: string): Promise<Setting<T>> {
    return apiClient.get<Setting<T>>(`${this.endpoint}/${key}`);
  }

  /**
   * Actualizar configuración específica
   */
  async update<T>(
    key: string,
    value: T,
    description?: string
  ): Promise<{
    success: boolean;
    message: string;
    data: Setting<T>;
  }> {
    return apiClient.put<{
      success: boolean;
      message: string;
      data: Setting<T>;
    }>(`${this.endpoint}/${key}`, {
      value,
      description,
    });
  }

  /**
   * Crear nueva configuración
   */
  async create<T>(
    key: string,
    value: T,
    category: string = "general",
    description?: string
  ): Promise<{
    success: boolean;
    message: string;
    data: Setting<T>;
  }> {
    return apiClient.post<{
      success: boolean;
      message: string;
      data: Setting<T>;
    }>(`${this.endpoint}`, {
      key,
      value,
      category,
      description,
    });
  }

  /**
   * Eliminar configuración
   */
  async delete(key: string): Promise<{ success: boolean; message: string }> {
    return apiClient.delete<{ success: boolean; message: string }>(`${this.endpoint}/${key}`);
  }

  /**
   * Actualización masiva de configuraciones
   */
  async bulkUpdate(settings: Record<string, unknown>): Promise<{
    success: boolean;
    message: string;
    data: Array<{ key: string; value: unknown; updated_at: string }>;
  }> {
    return apiClient.post<{
      success: boolean;
      message: string;
      data: Array<{ key: string; value: unknown; updated_at: string }>;
    }>(`${this.endpoint}/bulk-update`, { settings });
  }

  /**
   * Restablecer configuración a valores por defecto
   */
  async reset(key: string): Promise<{
    success: boolean;
    message: string;
    data: Setting;
  }> {
    return apiClient.post<{
      success: boolean;
      message: string;
      data: Setting;
    }>(`${this.endpoint}/reset/${key}`);
  }

  // =====================================================
  // MÉTODOS ESPECÍFICOS POR TIPO DE CONFIGURACIÓN
  // =====================================================

  /**
   * Obtener perfil de empresa
   */
  async getBusinessProfile(): Promise<BusinessProfile> {
    const result = await this.get<BusinessProfile>("business_profile");
    return result.value;
  }

  /**
   * Actualizar perfil de empresa
   */
  async updateBusinessProfile(profile: BusinessProfile): Promise<void> {
    await this.update("business_profile", profile);
  }

  /**
   * Obtener configuraciones de tema
   */
  async getThemeSettings(): Promise<ThemeSettings> {
    const result = await this.get<ThemeSettings>("theme_settings");
    return result.value;
  }

  /**
   * Actualizar configuraciones de tema
   */
  async updateThemeSettings(settings: ThemeSettings): Promise<void> {
    await this.update("theme_settings", settings);
  }

  /**
   * Obtener preferencias de aplicación
   */
  async getAppPreferences(): Promise<AppPreferences> {
    const result = await this.get<AppPreferences>("app_preferences");
    return result.value;
  }

  /**
   * Actualizar preferencias de aplicación
   */
  async updateAppPreferences(preferences: AppPreferences): Promise<void> {
    await this.update("app_preferences", preferences);
  }

  /**
   * Obtener configuraciones de notificaciones
   */
  async getNotificationSettings(): Promise<NotificationSettings> {
    const result = await this.get<NotificationSettings>(
      "notification_settings"
    );
    return result.value;
  }

  /**
   * Actualizar configuraciones de notificaciones
   */
  async updateNotificationSettings(
    settings: NotificationSettings
  ): Promise<void> {
    await this.update("notification_settings", settings);
  }

  /**
   * Obtener configuraciones de nómina
   */
  async getPayrollSettings(): Promise<PayrollSettings> {
    const result = await this.get<PayrollSettings>("payroll_settings");
    return result.value;
  }

  /**
   * Actualizar configuraciones de nómina
   */
  async updatePayrollSettings(settings: PayrollSettings): Promise<void> {
    await this.update("payroll_settings", settings);
  }

  // =====================================================
  // UTILIDADES Y HELPERS
  // =====================================================

  /**
   * Exportar todas las configuraciones
   */
  async exportSettings(): Promise<Blob> {
    const settings = await this.getAll();
    const blob = new Blob([JSON.stringify(settings, null, 2)], {
      type: "application/json",
    });
    return blob;
  }

  /**
   * Validar configuración de perfil de empresa
   */
  validateBusinessProfile(profile: BusinessProfile): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!profile.name?.trim())
      errors.push("El nombre de la empresa es requerido");
    if (!profile.contact?.trim())
      errors.push("La persona de contacto es requerida");
    if (!profile.email?.trim()) errors.push("El email es requerido");
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)) {
      errors.push("El formato del email no es válido");
    }
    if (!profile.phone?.trim()) errors.push("El teléfono es requerido");
    if (!profile.address?.trim()) errors.push("La dirección es requerida");

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Aplicar tema al DOM
   */
  applyTheme(settings: ThemeSettings): void {
    const root = document.documentElement;

    // Aplicar modo (light/dark)
    root.setAttribute("data-theme", settings.mode);

    // Aplicar color primario
    if (settings.primaryColor) {
      root.style.setProperty("--primary-color", settings.primaryColor);
    }

    // Guardar en localStorage para persistencia
    localStorage.setItem("hyr_theme_mode", settings.mode);
    localStorage.setItem("hyr_theme_language", settings.language);
    localStorage.setItem("hyr_theme_primary_color", settings.primaryColor);
  }

  /**
   * Cargar tema desde localStorage
   */
  loadThemeFromStorage(): Partial<ThemeSettings> {
    return {
      mode:
        (localStorage.getItem("hyr_theme_mode") as "light" | "dark") || "light",
      language:
        (localStorage.getItem("hyr_theme_language") as "es" | "en") || "es",
      primaryColor:
        localStorage.getItem("hyr_theme_primary_color") || "#3b82f6",
    };
  }
}

// Instancia singleton del servicio
export const settingsService = new SettingsService();
