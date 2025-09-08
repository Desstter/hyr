/**
 * Cost Simulator API Client
 * Sistema de estimación de costos para proyectos de construcción y soldadura
 */

export interface CostTemplate {
  id: string;
  name: string;
  categories: {
    materials: Record<string, CostItem>;
    labor: Record<string, CostItem>;
    equipment: Record<string, CostItem>;
  };
}

export interface CostItem {
  name: string;
  unit: string;
  cost_per_unit: number;
}

interface ProjectCreationResponse {
  success: boolean;
  project_id: string;
  project_name: string;
  budget_total: number;
}

export interface EstimationItem {
  category: 'materials' | 'labor' | 'equipment';
  subcategory: string;
  quantity: number;
  name?: string;
  unit?: string;
  cost_per_unit?: number;
  total_cost?: number;
}

export interface CostBreakdown {
  materials: number;
  labor: number;
  equipment: number;
  overhead: number;
  subtotal: number;
  profit: number;
  contingency: number;
  total: number;
}

export interface CostEstimation {
  project_info: {
    template_type: string;
    duration_days: number;
    items_count: number;
    created_at: string;
  };
  cost_breakdown: CostBreakdown;
  items_detail: EstimationItem[];
  calculation_factors: {
    labor_benefit_factor: number;
    overhead_percentage: number;
    profit_margin: number;
    contingency: number;
    benefits_applied: boolean;
  };
  summary: {
    cost_per_day: number;
    materials_percentage: number;
    labor_percentage: number;
    equipment_percentage: number;
  };
}

export interface ProjectPreset {
  name: string;
  items: EstimationItem[];
}

export interface SavedEstimation {
  id: string;
  project_name: string;
  client_name: string;
  template_type: string;
  estimation_data: CostEstimation;
  notes?: string;
  created_at: string;
  status: string;
}

// SECURITY FIX: Use runtime configuration instead of hardcoded URL
import { apiUrl } from '../appConfig';

// =====================================================
// TEMPLATES Y CONFIGURACIONES
// =====================================================

export async function getTemplates(): Promise<CostTemplate[]> {
  const url = await apiUrl('/simulator/templates');
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Error al cargar templates de costos');
  }
  return response.json();
}

export async function getPresets(templateType: string): Promise<ProjectPreset[]> {
  const url = await apiUrl(`/simulator/presets/${templateType}`);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Error al cargar presets del template');
  }
  return response.json();
}

// =====================================================
// CÁLCULOS Y ESTIMACIONES
// =====================================================

export async function calculateEstimation(data: {
  template_type: string;
  items: EstimationItem[];
  project_duration_days?: number;
  apply_benefits?: boolean;
}): Promise<CostEstimation> {
  const url = await apiUrl('/simulator/calculate');
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    throw new Error('Error al calcular estimación de costos');
  }
  
  return response.json();
}

export async function saveEstimation(data: {
  project_name: string;
  client_name: string;
  template_type: string;
  estimation_data: CostEstimation;
  notes?: string;
}): Promise<SavedEstimation> {
  const url = await apiUrl('/simulator/save-estimation');
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    throw new Error('Error al guardar estimación');
  }
  
  return response.json();
}

export async function createProjectFromEstimation(data: {
  estimation_id: string;
  project_name: string;
  client_id: string;
  description: string;
  start_date: string;
  estimated_end_date: string;
}): Promise<ProjectCreationResponse> {
  const url = await apiUrl('/simulator/create-project-from-estimation');
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    throw new Error('Error al crear proyecto desde estimación');
  }
  
  return response.json();
}

// =====================================================
// HOOKS PERSONALIZADOS REACT
// =====================================================

export function useTemplates() {
  const [templates, setTemplates] = React.useState<CostTemplate[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const fetchTemplatesData = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getTemplates();
      setTemplates(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchTemplatesData();
  }, [fetchTemplatesData]);

  return { templates, loading, error, refetch: fetchTemplatesData };
}

export function usePresets(templateType: string) {
  const [presets, setPresets] = React.useState<ProjectPreset[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!templateType) return;

    async function fetchPresets() {
      try {
        setLoading(true);
        setError(null);
        const data = await getPresets(templateType);
        setPresets(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido');
      } finally {
        setLoading(false);
      }
    }

    fetchPresets();
  }, [templateType]);

  return { presets, loading, error };
}

export function useCostCalculation() {
  const [estimation, setEstimation] = React.useState<CostEstimation | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const calculate = async (data: {
    template_type: string;
    items: EstimationItem[];
    project_duration_days?: number;
    apply_benefits?: boolean;
  }) => {
    try {
      setLoading(true);
      setError(null);
      const result = await calculateEstimation(data);
      setEstimation(result);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error en el cálculo';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setEstimation(null);
    setError(null);
  };

  return { 
    estimation, 
    loading, 
    error, 
    calculate, 
    reset 
  };
}

// =====================================================
// UTILIDADES Y HELPERS
// =====================================================

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatPercentage(value: number): string {
  return `${Math.round(value)}%`;
}

export function calculateTotalByCategory(items: EstimationItem[], category: string): number {
  return items
    .filter(item => item.category === category)
    .reduce((total, item) => total + (item.total_cost || 0), 0);
}

export function validateEstimationItems(items: EstimationItem[]): string[] {
  const errors: string[] = [];
  
  if (!items || items.length === 0) {
    errors.push('Debe agregar al menos un item');
  }

  items.forEach((item, index) => {
    if (!item.category) {
      errors.push(`Item ${index + 1}: Categoría requerida`);
    }
    if (!item.subcategory) {
      errors.push(`Item ${index + 1}: Subcategoría requerida`);
    }
    if (!item.quantity || item.quantity <= 0) {
      errors.push(`Item ${index + 1}: Cantidad debe ser mayor a 0`);
    }
  });

  return errors;
}

// React import necesario para hooks
import * as React from 'react';

// =====================================================
// SERVICE OBJECT EXPORT
// =====================================================

// =====================================================
// GESTIÓN DE ESTIMACIONES GUARDADAS
// =====================================================

export async function getSavedEstimations(): Promise<SavedEstimation[]> {
  const url = await apiUrl('/simulator/saved-estimations');
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Error al cargar estimaciones guardadas');
  }
  return response.json();
}

export async function duplicateEstimation(estimationId: string): Promise<SavedEstimation> {
  const url = await apiUrl(`/simulator/duplicate-estimation/${estimationId}`);
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    throw new Error('Error al duplicar estimación');
  }
  
  return response.json();
}

export async function deleteEstimation(estimationId: string): Promise<{ message: string }> {
  const url = await apiUrl(`/simulator/estimations/${estimationId}`);
  const response = await fetch(url, {
    method: 'DELETE',
  });
  
  if (!response.ok) {
    throw new Error('Error al eliminar estimación');
  }
  
  return response.json();
}

export async function convertEstimationToProject(data: {
  estimation_id: string;
  project_name: string;
  client_id: string;
  description: string;
  start_date: string;
  estimated_end_date: string;
}): Promise<ProjectCreationResponse> {
  const url = await apiUrl('/simulator/convert-to-project');
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    throw new Error('Error al convertir estimación a proyecto');
  }
  
  return response.json();
}

// =====================================================
// HOOK PARA ESTIMACIONES GUARDADAS
// =====================================================

export function useSavedEstimations() {
  const [estimations, setEstimations] = React.useState<SavedEstimation[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const fetchEstimations = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getSavedEstimations();
      setEstimations(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchEstimations();
  }, [fetchEstimations]);

  return { 
    estimations, 
    loading, 
    error, 
    refetch: fetchEstimations 
  };
}

export const simulatorService = {
  getTemplates,
  getPresets,
  calculateEstimation,
  saveEstimation,
  createProjectFromEstimation,
  getSavedEstimations,
  duplicateEstimation,
  deleteEstimation,
  convertEstimationToProject,
  formatCurrency,
  formatPercentage,
  calculateTotalByCategory,
  validateEstimationItems,
};