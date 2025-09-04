// =====================================================
// CLIENTE API BASE - SISTEMA HYR CONSTRUCTORA & SOLDADURA
// Cliente HTTP para conectar con backend Express PostgreSQL
// =====================================================

const API_BASE_URL = 'http://localhost:3001/api';

export class ApiError extends Error {
  constructor(public status: number, message: string, public data?: any) {
    super(message);
    this.name = 'ApiError';
  }
}

export class ApiClient {
  private baseUrl: string;
  private defaultHeaders: HeadersInit;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    };
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const config: RequestInit = {
      ...options,
      headers: {
        ...this.defaultHeaders,
        ...options.headers,
      },
      // Agregar timeout de 30 segundos
      signal: AbortSignal.timeout(30000),
    };

    let retries = 0;
    const maxRetries = 3;

    while (retries <= maxRetries) {
      try {
        const response = await fetch(url, config);
        
        if (!response.ok) {
          let errorMessage = `HTTP Error: ${response.status} ${response.statusText}`;
          let errorData;
          
          try {
            errorData = await response.json();
            if (errorData.error) {
              errorMessage = errorData.error;
            } else if (errorData.message) {
              errorMessage = errorData.message;
            }
          } catch {
            // Si no se puede parsear JSON, usar mensaje por defecto
          }
          
          throw new ApiError(response.status, errorMessage, errorData);
        }

        // Manejar respuestas vacías (204 No Content)
        if (response.status === 204) {
          return {} as T;
        }

        const data = await response.json();
        return data;
      } catch (error) {
        if (error instanceof ApiError) {
          throw error;
        }
        
        // Error de red o timeout - reintentar
        if (retries < maxRetries && (
          error instanceof Error && (
            error.name === 'AbortError' || 
            error.message.includes('fetch') ||
            error.message.includes('network')
          )
        )) {
          retries++;
          console.warn(`API request failed (attempt ${retries}/${maxRetries + 1}):`, error.message);
          // Esperar un poco antes de reintentar
          await new Promise(resolve => setTimeout(resolve, 1000 * retries));
          continue;
        }
        
        // Error definitivo
        const errorMessage = error instanceof Error ? error.message : 'Network error or unknown error';
        throw new ApiError(
          0,
          retries > 0 ? `${errorMessage} (after ${retries} retries)` : errorMessage
        );
      }
    }

    throw new ApiError(0, 'Max retries exceeded');
  }

  // =====================================================
  // MÉTODOS HTTP BÁSICOS
  // =====================================================

  async get<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    let url = endpoint;
    
    if (params) {
      const searchParams = new URLSearchParams();
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null) {
          searchParams.append(key, String(params[key]));
        }
      });
      
      const queryString = searchParams.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }

    return this.makeRequest<T>(url, {
      method: 'GET',
    });
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.makeRequest<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.makeRequest<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async patch<T>(endpoint: string, data?: any): Promise<T> {
    return this.makeRequest<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.makeRequest<T>(endpoint, {
      method: 'DELETE',
    });
  }

  // =====================================================
  // UTILIDADES
  // =====================================================

  setAuthToken(token: string) {
    this.defaultHeaders = {
      ...this.defaultHeaders,
      'Authorization': `Bearer ${token}`,
    };
  }

  removeAuthToken() {
    const { Authorization, ...headers } = this.defaultHeaders as any;
    this.defaultHeaders = headers;
  }

  setBaseUrl(url: string) {
    this.baseUrl = url;
  }
}

// Instancia singleton del cliente API
export const apiClient = new ApiClient();

// =====================================================
// HELPER PARA MANEJO DE ERRORES
// =====================================================

export const handleApiError = (error: unknown): string => {
  if (error instanceof ApiError) {
    return error.message;
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  return 'Error desconocido';
};

// =====================================================
// TIPOS PARA RESPUESTAS COMUNES
// =====================================================

export interface ApiResponse<T> {
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedApiResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}