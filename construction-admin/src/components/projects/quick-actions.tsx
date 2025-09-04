'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { api } from '@/lib/api';
import type { Project, ProjectStatus } from '@/lib/api';
import { getProjectStatusLabel, getProjectStatusColor } from '@/lib/finance';
import { 
  MoreVertical,
  Clock,
  CheckCircle,
  Pause,
  Calendar,
  TrendingUp,
  Archive,
  Eye,
  Edit,
  Trash2,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface QuickStatusUpdateProps {
  project: Project;
  onUpdate?: (project: Project) => void;
  disabled?: boolean;
}

export function QuickStatusUpdate({ project, onUpdate, disabled }: QuickStatusUpdateProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleStatusChange = async (newStatus: ProjectStatus) => {
    if (newStatus === project.status || disabled) return;

    setIsLoading(true);
    try {
      const updatedProject = await api.projects.updateStatus(project.id, newStatus);
      toast.success(`Estado actualizado a ${getProjectStatusLabel(newStatus)}`);
      onUpdate?.(updatedProject);
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Error al actualizar el estado');
    } finally {
      setIsLoading(false);
    }
  };

  const statusOptions: { value: ProjectStatus; label: string; icon: React.ReactNode; color: string }[] = [
    { 
      value: 'planned', 
      label: 'Planificado', 
      icon: <Calendar className="h-3 w-3" />,
      color: 'text-muted-foreground'
    },
    { 
      value: 'in_progress', 
      label: 'En Progreso', 
      icon: <Clock className="h-3 w-3" />,
      color: 'text-primary'
    },
    { 
      value: 'on_hold', 
      label: 'En Pausa', 
      icon: <Pause className="h-3 w-3" />,
      color: 'text-warning'
    },
    { 
      value: 'completed', 
      label: 'Completado', 
      icon: <CheckCircle className="h-3 w-3" />,
      color: 'text-success'
    },
  ];

  const currentStatus = statusOptions.find(s => s.value === project.status);

  return (
    <Select 
      value={project.status} 
      onValueChange={handleStatusChange}
      disabled={isLoading || disabled}
    >
      <SelectTrigger className="w-36 h-8">
        <SelectValue>
          <div className="flex items-center gap-2">
            {isLoading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              currentStatus?.icon
            )}
            <span className="text-sm">{currentStatus?.label}</span>
          </div>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {statusOptions.map((status) => (
          <SelectItem key={status.value} value={status.value}>
            <div className="flex items-center gap-2">
              <span className={status.color}>{status.icon}</span>
              <span>{status.label}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

interface QuickProgressUpdateProps {
  project: Project;
  onUpdate?: (project: Project) => void;
  disabled?: boolean;
}

export function QuickProgressUpdate({ project, onUpdate, disabled }: QuickProgressUpdateProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [tempProgress, setTempProgress] = useState([project.progress || 0]);

  const handleProgressChange = async (value: number[]) => {
    const newProgress = value[0];
    if (newProgress === project.progress || disabled) return;

    setIsLoading(true);
    try {
      const updatedProject = await api.projects.updateProgress(project.id, newProgress);
      toast.success(`Progreso actualizado al ${newProgress}%`);
      onUpdate?.(updatedProject);
      
      // Auto-update status based on progress
      if (newProgress === 100 && project.status !== 'completed') {
        setTimeout(async () => {
          try {
            const finalProject = await api.projects.updateStatus(project.id, 'completed');
            toast.success('Estado cambiado automáticamente a Completado');
            onUpdate?.(finalProject);
          } catch (error) {
            console.error('Error auto-updating status:', error);
          }
        }, 1000);
      } else if (newProgress > 0 && newProgress < 100 && project.status === 'planned') {
        setTimeout(async () => {
          try {
            const progressProject = await api.projects.updateStatus(project.id, 'in_progress');
            toast.success('Estado cambiado automáticamente a En Progreso');
            onUpdate?.(progressProject);
          } catch (error) {
            console.error('Error auto-updating status:', error);
          }
        }, 1000);
      }
    } catch (error) {
      console.error('Error updating progress:', error);
      toast.error('Error al actualizar el progreso');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSliderChange = (value: number[]) => {
    setTempProgress(value);
  };

  const handleSliderCommit = (value: number[]) => {
    handleProgressChange(value);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Progreso</span>
        <div className="flex items-center gap-1">
          {isLoading && <Loader2 className="h-3 w-3 animate-spin" />}
          <span className="text-xs font-medium">
            {tempProgress[0]}%
          </span>
        </div>
      </div>
      <Slider
        value={tempProgress}
        onValueChange={handleSliderChange}
        onValueCommit={handleSliderCommit}
        max={100}
        step={5}
        disabled={isLoading || disabled}
        className="w-full"
      />
    </div>
  );
}

interface ProjectActionsMenuProps {
  project: Project;
  onEdit?: (project: Project) => void;
  onDelete?: (project: Project) => void;
  onView?: (project: Project) => void;
  disabled?: boolean;
}

export function ProjectActionsMenu({ 
  project, 
  onEdit, 
  onDelete, 
  onView, 
  disabled 
}: ProjectActionsMenuProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleArchive = async () => {
    setIsLoading(true);
    try {
      const updatedProject = await api.projects.updateStatus(project.id, 'on_hold');
      toast.success('Proyecto archivado');
    } catch (error) {
      console.error('Error archiving project:', error);
      toast.error('Error al archivar el proyecto');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-8 w-8 p-0"
          disabled={disabled}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <MoreVertical className="h-4 w-4" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Acciones</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={() => onView?.(project)}>
          <Eye className="h-4 w-4 mr-2" />
          Ver Detalles
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={() => onEdit?.(project)}>
          <Edit className="h-4 w-4 mr-2" />
          Editar Proyecto
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        {project.status !== 'on_hold' && (
          <DropdownMenuItem onClick={handleArchive} disabled={isLoading}>
            <Archive className="h-4 w-4 mr-2" />
            Archivar
          </DropdownMenuItem>
        )}
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem 
          onClick={() => onDelete?.(project)}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Eliminar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}