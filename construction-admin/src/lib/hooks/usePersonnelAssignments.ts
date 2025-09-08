// =====================================================
// HOOK - PERSONNEL ASSIGNMENTS
// Hook para gestionar asignaciones de empleados
// =====================================================

import { useState, useEffect, useCallback } from 'react';
import { personnelService } from '@/lib/api/personnel';
import type { Personnel } from '@/lib/api/types';

interface PersonnelAssignment {
  id: string;
  personnel_id: string;
  project_id: string;
  expected_hours_per_day?: number;
  project_name: string;
}

export interface PersonnelAssignmentSummary {
  personnel_id: string;
  total_projects: number;
  total_hours_per_day: number;
  availability_status: string;
  can_take_more_work: boolean;
  assignments: PersonnelAssignment[];
}

export function usePersonnelAssignments(personnel: Personnel[]) {
  const [assignmentsSummary, setAssignmentsSummary] = useState<Record<string, PersonnelAssignmentSummary>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAssignments = useCallback(async () => {
    if (personnel.length === 0) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const summaryMap: Record<string, PersonnelAssignmentSummary> = {};
      
      // Obtener asignaciones para cada empleado activo
      const activePersonnel = personnel.filter(p => p.status === 'active');
      
      await Promise.all(
        activePersonnel.map(async (person) => {
          try {
            if (person.id) {
              const summary = await personnelService.getAssignmentsSummary(person.id);
              summaryMap[person.id] = {
                personnel_id: person.id,
                ...summary
              };
            }
          } catch (error) {
            console.warn(`Error fetching assignments for ${person.name}:`, error);
            // Proporcionar valores por defecto si falla
            if (person.id) {
              summaryMap[person.id] = {
                personnel_id: person.id,
                total_projects: 0,
                total_hours_per_day: 0,
                availability_status: 'disponible',
                can_take_more_work: true,
                assignments: []
              };
            }
          }
        })
      );
      
      setAssignmentsSummary(summaryMap);
    } catch (error: unknown) {
      console.error('Error fetching personnel assignments:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setError(errorMessage || 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, [personnel]);

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  // Calcular estadísticas de asignaciones
  const stats = {
    totalAssigned: Object.values(assignmentsSummary).filter(s => s.total_projects > 0).length,
    totalAvailable: Object.values(assignmentsSummary).filter(s => s.can_take_more_work).length,
    totalOverloaded: Object.values(assignmentsSummary).filter(s => s.availability_status === 'sobrecargado').length,
    averageProjectsPerPerson: Object.values(assignmentsSummary).length > 0 
      ? Object.values(assignmentsSummary).reduce((sum, s) => sum + s.total_projects, 0) / Object.values(assignmentsSummary).length
      : 0,
    averageHoursPerPerson: Object.values(assignmentsSummary).length > 0
      ? Object.values(assignmentsSummary).reduce((sum, s) => sum + s.total_hours_per_day, 0) / Object.values(assignmentsSummary).length
      : 0
  };

  return {
    assignmentsSummary,
    stats,
    loading,
    error,
    refetch: fetchAssignments
  };
}

export function usePersonnelAssignmentActions() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const assignToProject = useCallback(async (
    personnelId: string, 
    data: {
      project_id: string;
      role?: string;
      hours_per_day?: number;
      is_primary?: boolean;
    }
  ) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await personnelService.assignToProject(personnelId, data);
      return result;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setError(errorMessage || 'Error al asignar empleado');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const unassignFromProject = useCallback(async (personnelId: string, projectId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await personnelService.unassignFromProject(personnelId, projectId);
      return result;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setError(errorMessage || 'Error al desasignar empleado');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    assignToProject,
    unassignFromProject,
    loading,
    error
  };
}