// =====================================================
// FILES API SERVICE
// Servicio para manejo universal de descargas de archivos
// =====================================================

import React, { useState } from 'react';
import { apiClient } from './client';
import { toast } from '@/components/ui/use-toast';

// Tipos para el sistema de archivos
export interface FileInfo {
  filename: string;
  type: string;
  size: number;
  created_at: string;
  modified_at: string;
  download_url: string;
  mime_type: string;
}

export interface FileListResponse {
  success: boolean;
  data: {
    files: FileInfo[];
    total: number;
    limit: number;
    offset: number;
    type: string;
    directory: string;
  };
}

export interface FileSystemInfo {
  success: boolean;
  data: {
    base_directory: string;
    supported_types: Record<string, {
      dir: string;
      mimeType: string;
      extension: string;
    }>;
    endpoints: Record<string, string>;
    statistics: Record<string, {
      count: number;
      total_size: number;
      directory: string;
      error?: string;
    }>;
    timestamp: string;
  };
}

// Tipos de archivos soportados
export type FileType = 'pila' | 'payroll' | 'reports' | 'invoices' | 'certificates' | 'budgets';

// =====================================================
// SERVICIO DE ARCHIVOS
// =====================================================

class FilesService {
  /**
   * Descargar archivo por tipo y nombre
   */
  async downloadFile(type: FileType, filename: string): Promise<void> {
    try {
      // Inicializar el cliente API si no está inicializado
      await apiClient.initialize();
      
      // Obtener la URL base dinámicamente
      const baseUrl = process.env.NODE_ENV === 'development' 
        ? 'http://localhost:3001/api'
        : (await import('../appConfig')).apiUrlSync();
      
      const response = await fetch(`${baseUrl}/files/download/${type}/${filename}`, {
        method: 'GET',
        headers: {
          'Accept': '*/*'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || `Error HTTP ${response.status}`);
      }

      // Obtener el blob del archivo
      const blob = await response.blob();
      
      // Obtener nombre de archivo del header o usar el proporcionado
      const contentDisposition = response.headers.get('Content-Disposition');
      let downloadFilename = filename;
      
      if (contentDisposition) {
        const matches = /filename[^;=\n]*=((['"]).?\2|[^;\n]*)/.exec(contentDisposition);
        if (matches && matches[1]) {
          downloadFilename = matches[1].replace(/['"]/g, '');
        }
      }

      // Crear y ejecutar descarga
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = downloadFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Limpiar URL
      window.URL.revokeObjectURL(url);

      toast({
        title: "Descarga completada",
        description: `Archivo ${downloadFilename} descargado exitosamente`,
      });

    } catch (error: unknown) {
      console.error('Error downloading file:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error descargando archivo';
      toast({
        title: "Error de descarga",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  }

  /**
   * Listar archivos por tipo
   */
  async listFiles(type: FileType, options?: {
    limit?: number;
    offset?: number;
  }): Promise<FileListResponse> {
    try {
      const searchParams = new URLSearchParams();
      
      if (options?.limit) searchParams.append('limit', options.limit.toString());
      if (options?.offset) searchParams.append('offset', options.offset.toString());

      const response = await apiClient.get<FileListResponse>(
        `/files/list/${type}?${searchParams.toString()}`
      );
      
      if (!response.success) {
        throw new Error('Error obteniendo lista de archivos');
      }

      return response;
    } catch (error: unknown) {
      console.error('Error listing files:', error);
      throw new Error((error instanceof Error ? error.message : 'Error obteniendo archivos'));
    }
  }

  /**
   * Eliminar archivo
   */
  async deleteFile(type: FileType, filename: string): Promise<void> {
    try {
      const response = await apiClient.delete<{
        success: boolean;
        message: string;
        filename: string;
        type: string;
      }>(`/files/${type}/${filename}`);

      if (!response.success) {
        throw new Error(response.message || 'Error eliminando archivo');
      }

      toast({
        title: "Archivo eliminado",
        description: `${filename} eliminado exitosamente`,
      });

    } catch (error: unknown) {
      console.error('Error deleting file:', error);
      toast({
        title: "Error al eliminar",
        description: (error instanceof Error ? error.message : 'Error eliminando archivo'),
        variant: "destructive",
      });
      throw error;
    }
  }

  /**
   * Limpiar archivos antiguos
   */
  async cleanupFiles(type: FileType, daysOld: number = 30): Promise<{
    deleted_count: number;
    deleted_files: string[];
    cutoff_date: string;
  }> {
    try {
      const response = await apiClient.post<{
        success: boolean;
        message: string;
        deleted_count: number;
        deleted_files: string[];
        cutoff_date: string;
        days_old: number;
      }>(`/files/cleanup/${type}`, { days_old: daysOld });

      if (!response.success) {
        throw new Error(response.message || 'Error en limpieza de archivos');
      }

      toast({
        title: "Limpieza completada",
        description: `${response.deleted_count} archivos eliminados`,
      });

      return {
        deleted_count: response.deleted_count,
        deleted_files: response.deleted_files,
        cutoff_date: response.cutoff_date
      };

    } catch (error: unknown) {
      console.error('Error cleaning up files:', error);
      toast({
        title: "Error en limpieza",
        description: (error instanceof Error ? error.message : 'Error limpiando archivos'),
        variant: "destructive",
      });
      throw error;
    }
  }

  /**
   * Obtener información del sistema de archivos
   */
  async getSystemInfo(): Promise<FileSystemInfo> {
    try {
      const response = await apiClient.get<FileSystemInfo>('/files/info');
      
      if (!response.success) {
        throw new Error('Error obteniendo información del sistema');
      }

      return response;
    } catch (error: unknown) {
      console.error('Error getting system info:', error);
      throw new Error((error instanceof Error ? error.message : 'Error obteniendo información del sistema'));
    }
  }

  /**
   * Descargar múltiples archivos (como ZIP en el futuro)
   */
  async downloadMultiple(files: { type: FileType; filename: string }[]): Promise<void> {
    try {
      // Por ahora, descargar uno por uno
      for (const file of files) {
        await this.downloadFile(file.type, file.filename);
        // Pequeña pausa entre descargas
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      toast({
        title: "Descargas completadas",
        description: `${files.length} archivos descargados`,
      });

    } catch (error: unknown) {
      console.error('Error downloading multiple files:', error);
      toast({
        title: "Error en descargas múltiples",
        description: (error instanceof Error ? error.message : 'Error descargando archivos'),
        variant: "destructive",
      });
      throw error;
    }
  }
}

// Instancia singleton del servicio
export const filesService = new FilesService();

// =====================================================
// HOOKS REACT PERSONALIZADOS
// =====================================================

/**
 * Hook para listar archivos con estado
 */
export function useFileList(type: FileType, autoLoad: boolean = true) {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  const loadFiles = async (options?: { limit?: number; offset?: number }) => {
    try {
      setLoading(true);
      setError(null);
      const response = await filesService.listFiles(type, options);
      setFiles(response.data.files);
      setTotal(response.data.total);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const deleteFile = async (filename: string) => {
    try {
      await filesService.deleteFile(type, filename);
      // Recargar lista después de eliminar
      await loadFiles();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      throw err;
    }
  };

  const downloadFile = async (filename: string) => {
    try {
      await filesService.downloadFile(type, filename);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      throw err;
    }
  };

  React.useEffect(() => {
    if (autoLoad) {
      loadFiles();
    }
  }, [type, autoLoad]);

  return {
    files,
    loading,
    error,
    total,
    loadFiles,
    deleteFile,
    downloadFile,
    refresh: () => loadFiles()
  };
}

/**
 * Hook para información del sistema de archivos
 */
export function useSystemInfo() {
  const [systemInfo, setSystemInfo] = useState<FileSystemInfo['data'] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSystemInfo = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await filesService.getSystemInfo();
      setSystemInfo(response.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadSystemInfo();
  }, []);

  return {
    systemInfo,
    loading,
    error,
    refresh: loadSystemInfo
  };
}

// Exportar servicio y hooks
export default filesService;