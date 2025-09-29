// =====================================================
// CONFIGURACIÓN RUNTIME - SISTEMA HYR CONSTRUCTORA & SOLDADURA
// Sistema de configuración dinámico para evitar URLs hardcodeadas
// =====================================================

export interface AppConfig {
  api: {
    baseUrl: string;
    timeout: number;
  };
  environment: string;
  app: {
    name: string;
    version: string;
  };
  features: {
    debugLogs: boolean;
    mockData: boolean;
  };
}

let config: AppConfig | null = null;

/**
 * Carga la configuración desde public/appconfig.json
 * Cache la configuración en memoria para evitar múltiples requests
 */
export async function getAppConfig(): Promise<AppConfig> {
  if (!config) {
    try {
      const response = await fetch("/appconfig.json");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      config = await response.json();
    } catch (error) {
      console.warn(
        "No se pudo cargar appconfig.json, usando configuración por defecto:",
        error
      );
      // Configuración de fallback
      config = {
        api: {
          baseUrl: "/api",
          timeout: 30000,
        },
        environment: "development",
        app: {
          name: "HYR Constructora & Soldadura",
          version: "1.0.0",
        },
        features: {
          debugLogs: true,
          mockData: false,
        },
      };
    }
  }
  return config!; // Non-null assertion since we always set fallback config in catch block
}

/**
 * Genera URL completa para endpoints de API
 * En desarrollo: http://localhost:3001/api/endpoint
 * En producción: /api/endpoint (usando proxy inverso)
 */
export async function apiUrl(endpoint: string): Promise<string> {
  const appConfig = await getAppConfig();

  // En desarrollo, detectar IP automáticamente basado en el host actual
  // En producción, usar proxy inverso configurado en next.config.ts
  const baseUrl =
    process.env.NODE_ENV === "development"
      ? `http://${typeof window !== 'undefined' ? window.location.hostname : 'localhost'}:3001/api`
      : appConfig.api.baseUrl;

  // Asegurar que endpoint empiece con /
  const normalizedEndpoint = endpoint.startsWith("/")
    ? endpoint
    : `/${endpoint}`;

  return `${baseUrl}${normalizedEndpoint}`;
}

/**
 * Version síncrona para casos donde ya se tiene la config cargada
 */
export function apiUrlSync(endpoint: string, config: AppConfig): string {
  const baseUrl =
    process.env.NODE_ENV === "development"
      ? `http://${typeof window !== 'undefined' ? window.location.hostname : 'localhost'}:3001/api`
      : config.api.baseUrl;

  const normalizedEndpoint = endpoint.startsWith("/")
    ? endpoint
    : `/${endpoint}`;
  return `${baseUrl}${normalizedEndpoint}`;
}

/**
 * Helper para logging condicional basado en configuración
 */
export async function debugLog(
  message: string,
  ...args: unknown[]
): Promise<void> {
  const appConfig = await getAppConfig();
  if (appConfig.features.debugLogs || process.env.NODE_ENV === "development") {
    console.log(`[HYR Debug] ${message}`, ...args);
  }
}

/**
 * Helper para verificar si se deben usar datos mock
 */
export async function shouldUseMockData(): Promise<boolean> {
  const appConfig = await getAppConfig();
  return appConfig.features.mockData || process.env.NODE_ENV === "test";
}

/**
 * Reset del cache de configuración (útil para testing)
 */
export function resetConfigCache(): void {
  config = null;
}

/**
 * Obtiene información de la aplicación
 */
export async function getAppInfo(): Promise<{
  name: string;
  version: string;
  environment: string;
}> {
  const appConfig = await getAppConfig();
  return {
    name: appConfig.app.name,
    version: appConfig.app.version,
    environment: appConfig.environment,
  };
}
