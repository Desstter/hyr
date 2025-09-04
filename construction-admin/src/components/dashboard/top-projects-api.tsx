'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { api, handleApiError } from '@/lib/api';
import type { ProjectProfitabilityReport } from '@/lib/api';

export function TopProjects() {
  const [projects, setProjects] = useState<ProjectProfitabilityReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTopProjects();
  }, []);

  const loadTopProjects = async () => {
    try {
      setLoading(true);
      setError(null);
      const profitabilityData = await api.reports.getProjectProfitability();
      
      // Obtener los top 5 proyectos más rentables
      const topProjects = profitabilityData
        .filter(p => p.status === 'in_progress' || p.status === 'completed')
        .sort((a, b) => b.profit_margin_percent - a.profit_margin_percent)
        .slice(0, 5);
      
      setProjects(topProjects);
    } catch (err) {
      setError(handleApiError(err));
      console.error('Error loading top projects:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'on_hold': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return 'Completado';
      case 'in_progress': return 'En Progreso';
      case 'on_hold': return 'Pausado';
      case 'planned': return 'Planeado';
      default: return status;
    }
  };

  const getBudgetStatusColor = (status: string) => {
    switch (status) {
      case 'NORMAL': return 'text-green-600';
      case 'ALERTA': return 'text-yellow-600';
      case 'SOBREPRESUPUESTO': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Proyectos Principales</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-100 animate-pulse rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Proyectos Principales</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-red-600 py-4">
            <p>Error cargando proyectos</p>
            <button 
              onClick={loadTopProjects}
              className="mt-2 text-sm bg-red-100 px-3 py-1 rounded hover:bg-red-200"
            >
              Reintentar
            </button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Proyectos Principales</CardTitle>
        <p className="text-sm text-gray-600">
          Ordenados por rentabilidad
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {projects.length === 0 ? (
            <div className="text-center text-gray-500 py-4">
              <p>No hay proyectos disponibles</p>
            </div>
          ) : (
            projects.map((project) => (
              <div key={project.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-sm truncate">{project.name}</h4>
                    <Badge className={getStatusColor(project.status)}>
                      {getStatusText(project.status)}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-4 mt-1 text-xs text-gray-600">
                    <span>{project.client_name || 'Sin cliente'}</span>
                    <span className={getBudgetStatusColor(project.budget_status)}>
                      {project.budget_status}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-4 mt-1 text-xs">
                    <span>
                      Presupuesto: {new Intl.NumberFormat('es-CO', {
                        style: 'currency',
                        currency: 'COP',
                        minimumFractionDigits: 0,
                      }).format(project.budget_total)}
                    </span>
                    <span>
                      Gastado: {new Intl.NumberFormat('es-CO', {
                        style: 'currency',
                        currency: 'COP',
                        minimumFractionDigits: 0,
                      }).format(project.spent_total)}
                    </span>
                  </div>
                </div>
                
                <div className="text-right ml-2">
                  <div className={`text-lg font-bold ${
                    Number(project.profit_margin_percent || 0) > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {Number(project.profit_margin_percent || 0) > 0 ? '+' : ''}
                    {Number(project.profit_margin_percent || 0).toFixed(1)}%
                  </div>
                  <div className="text-xs text-gray-500">
                    Progreso: {project.progress}%
                  </div>
                  <div className="text-xs text-gray-500">
                    {project.employees_assigned} empleados
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        
        {projects.length > 0 && (
          <div className="mt-4 pt-3 border-t text-center">
            <button 
              onClick={() => window.open('/projects', '_blank')}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Ver todos los proyectos →
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}