'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { api, handleApiError } from '@/lib/api';
import type { Project, Client } from '@/lib/api';
import { formatCurrency, formatDate, getProjectStatusColor, getProjectStatusLabel } from '@/lib/finance';
import { useTranslations } from '@/lib/i18n';
import { Eye, Edit, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface ProjectsTableProps {
  onEditProject?: (project: Project) => void;
}

export function ProjectsTable({ onEditProject }: ProjectsTableProps) {
  const t = useTranslations('es');
  const [searchQuery, setSearchQuery] = useState('');
  
  // State for API data
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Client lookup map
  const clientMap = new Map(clients.map(c => [c.id, c.name]));
  
  // Load data from API
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load projects and clients in parallel
      const [projectsResult, clientsResult] = await Promise.all([
        api.projects.list(),
        api.clients.list()
      ]);
      
      // Handle both direct array response and {data: array} response
      const projectsData = Array.isArray(projectsResult) ? projectsResult : 
                          (Array.isArray(projectsResult.data) ? projectsResult.data : []);
      const clientsData = Array.isArray(clientsResult) ? clientsResult : 
                         (Array.isArray(clientsResult.data) ? clientsResult.data : []);
      
      setProjects(projectsData);
      setClients(clientsData);
    } catch (err) {
      const errorMessage = handleApiError(err);
      setError(errorMessage);
      console.error('Error loading projects data:', err);
      toast.error('Error cargando proyectos: ' + errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProject = async (project: Project) => {
    // Confirmación del usuario
    if (!confirm(`¿Estás seguro de que deseas eliminar el proyecto "${project.name}"?\n\nEsta acción no se puede deshacer.`)) {
      return;
    }

    try {
      await api.projects.delete(project.id);
      toast.success(`Proyecto "${project.name}" eliminado exitosamente`);
      
      // Recargar datos para actualizar la lista
      await loadData();
    } catch (err) {
      const errorMessage = handleApiError(err);
      console.error('Error deleting project:', err);
      
      // Mostrar mensaje de error específico
      if (errorMessage.includes('gastos') || errorMessage.includes('horas')) {
        toast.error(`No se puede eliminar el proyecto: ${errorMessage}`);
      } else {
        toast.error(`Error eliminando proyecto: ${errorMessage}`);
      }
    }
  };
  
  // Filter projects (ensure projects is an array)
  const filteredProjects = (projects || []).filter(project => {
    const clientName = project.client_id ? clientMap.get(project.client_id) || '' : '';
    return project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
           clientName.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Loading state
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <div className="h-10 bg-gray-100 animate-pulse rounded-md flex-1 max-w-sm" />
        </div>
        <div className="rounded-md border">
          <div className="h-64 bg-gray-50 animate-pulse" />
        </div>
        <div className="text-center text-muted-foreground">
          Cargando proyectos desde PostgreSQL...
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-medium">Error cargando proyectos</h3>
          <p className="text-red-600 text-sm mt-1">{error}</p>
          <button
            onClick={loadData}
            className="mt-2 bg-red-100 text-red-800 px-3 py-1 rounded text-sm hover:bg-red-200"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Buscar proyectos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t.projects.name}</TableHead>
              <TableHead>{t.projects.client}</TableHead>
              <TableHead>{t.projects.status}</TableHead>
              <TableHead>{t.projects.budget}</TableHead>
              <TableHead>{t.projects.spent}</TableHead>
              <TableHead>{t.projects.progress}</TableHead>
              <TableHead>{t.projects.startDate}</TableHead>
              <TableHead>{t.projects.actions}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProjects.map((project) => (
              <TableRow key={project.id}>
                <TableCell className="font-medium">
                  <div>
                    <div className="font-semibold">{project.name}</div>
                    {project.description && (
                      <div className="text-xs text-muted-foreground line-clamp-1">
                        {project.description}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {project.client_id ? clientMap.get(project.client_id) || 'Cliente desconocido' : 'Sin cliente'}
                </TableCell>
                <TableCell>
                  <Badge 
                    variant="outline" 
                    className={getProjectStatusColor(project.status)}
                  >
                    {getProjectStatusLabel(project.status)}
                  </Badge>
                </TableCell>
                <TableCell>{formatCurrency(project.budget_total)}</TableCell>
                <TableCell>{formatCurrency(project.spent_total)}</TableCell>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    <Progress value={project.progress} className="w-16 h-2" />
                    <span className="text-xs text-muted-foreground min-w-8">
                      {project.progress}%
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  {project.start_date ? formatDate(project.start_date) : '-'}
                </TableCell>
                <TableCell>
                  <div className="flex items-center space-x-1">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/projects/${project.id}`}>
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => onEditProject?.(project)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleDeleteProject(project)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      
      {filteredProjects.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          {searchQuery ? 'No se encontraron proyectos con esos criterios' : 'No hay proyectos registrados'}
        </div>
      )}
    </div>
  );
}