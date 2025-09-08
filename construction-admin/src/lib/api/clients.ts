// =====================================================
// API SERVICE - CLIENTS (CLIENTES)
// Servicios para gestión de clientes
// =====================================================

import { apiClient } from './client';
import type { Client, Project } from './types';

export class ClientsService {
  private endpoint = '/clients';

  // =====================================================
  // CRUD CLIENTES
  // =====================================================

  /**
   * Obtener todos los clientes
   */
  async getAll(filters?: {
    search?: string;
  }): Promise<Client[]> {
    const response = await apiClient.get<{data: Client[]} | Client[]>(this.endpoint, filters);
    // Handle both {data: array} and direct array responses
    return Array.isArray(response) ? response : (response.data || []);
  }

  /**
   * Alias para getAll - mantiene compatibilidad con componentes existentes
   */
  async list(filters?: {
    search?: string;
  }): Promise<{ data: Client[] }> {
    const clients = await this.getAll(filters);
    return { data: clients };
  }

  /**
   * Obtener cliente por ID
   */
  async getById(id: string): Promise<Client> {
    return apiClient.get<Client>(`${this.endpoint}/${id}`);
  }

  /**
   * Crear nuevo cliente
   */
  async create(data: {
    name: string;
    contact_name?: string;
    phone?: string;
    email?: string;
    address?: string;
  }): Promise<Client> {
    return apiClient.post<Client>(this.endpoint, data);
  }

  /**
   * Actualizar cliente
   */
  async update(id: string, data: Partial<{
    name: string;
    contact_name?: string;
    phone?: string;
    email?: string;
    address?: string;
  }>): Promise<Client> {
    return apiClient.put<Client>(`${this.endpoint}/${id}`, data);
  }

  /**
   * Eliminar cliente
   */
  async delete(id: string): Promise<void> {
    return apiClient.delete<void>(`${this.endpoint}/${id}`);
  }

  // =====================================================
  // BÚSQUEDA Y FILTROS
  // =====================================================

  /**
   * Buscar clientes por nombre
   */
  async search(query: string): Promise<Client[]> {
    return this.getAll({ search: query });
  }

  /**
   * Obtener proyectos de un cliente
   */
  async getProjects(clientId: string): Promise<Project[]> {
    return apiClient.get<Project[]>(`${this.endpoint}/${clientId}/projects`);
  }

  /**
   * Obtener estadísticas de cliente
   */
  async getClientStats(clientId: string): Promise<{
    totalProjects: number;
    activeProjects: number;
    completedProjects: number;
    totalRevenue: number;
    averageProjectValue: number;
    projectsOnTime: number;
    projectsDelayed: number;
  }> {
    type ClientStats = {
      totalProjects: number;
      activeProjects: number;
      completedProjects: number;
      totalRevenue: number;
      averageProjectValue: number;
      projectsOnTime: number;
      projectsDelayed: number;
    };
    return apiClient.get<ClientStats>(`${this.endpoint}/${clientId}/stats`);
  }
}

// Instancia singleton del servicio
export const clientsService = new ClientsService();