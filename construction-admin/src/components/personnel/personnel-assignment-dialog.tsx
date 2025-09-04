'use client';

import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useTranslations } from '@/lib/i18n';
import { formatCurrency } from '@/lib/finance';
import { personnelService, projectsService } from '@/lib/api';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, DollarSign, Clock } from 'lucide-react';
import type { Personnel, Project } from '@/lib/api/types';

const assignmentSchema = z.object({
  personnelId: z.string().min(1, 'Debe seleccionar un empleado'),
  role: z.string().min(1, 'Debe especificar el rol en el proyecto'),
});

type AssignmentFormData = z.infer<typeof assignmentSchema>;

interface PersonnelAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project | null;
  onSuccess?: () => void;
}

export function PersonnelAssignmentDialog({ 
  open, 
  onOpenChange, 
  project,
  onSuccess 
}: PersonnelAssignmentDialogProps) {
  const t = useTranslations('es');
  const [loading, setLoading] = useState(false);
  const [allPersonnel, setAllPersonnel] = useState<Personnel[]>([]);
  const [assignedPersonnel, setAssignedPersonnel] = useState<Personnel[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  // Load personnel data
  const loadPersonnelData = async () => {
    if (!project) return;
    
    try {
      setDataLoading(true);
      
      // Load all personnel
      const allPersonnelResponse = await personnelService.getAll();
      const personnel = allPersonnelResponse.data || [];
      setAllPersonnel(personnel);
      
      // Filter assigned personnel for this project
      const assigned = personnel.filter(person => 
        person.current_project_id === project.id
      );
      setAssignedPersonnel(assigned);
    } catch (error) {
      console.error('Error loading personnel data:', error);
      toast.error('Error cargando datos del personal');
    } finally {
      setDataLoading(false);
    }
  };

  // Load data when dialog opens or project changes
  useEffect(() => {
    if (open && project) {
      loadPersonnelData();
    }
  }, [open, project]);

  // Available personnel (active and not assigned to any project)
  const availablePersonnel = useMemo(() => {
    return allPersonnel.filter(person => 
      person.status === 'active' && !person.current_project_id
    );
  }, [allPersonnel]);

  const form = useForm<AssignmentFormData>({
    resolver: zodResolver(assignmentSchema),
    defaultValues: {
      personnelId: '',
      role: '',
    },
  });

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      form.reset({
        personnelId: '',
        role: '',
      });
    }
  }, [open, form]);

  const onSubmit = async (data: AssignmentFormData) => {
    if (!project) return;
    
    setLoading(true);
    try {
      const person = allPersonnel.find(p => p.id === data.personnelId);
      if (!person) throw new Error('Empleado no encontrado');

      // Update personnel with assignment details
      const updatedPerson: Partial<Personnel> = {
        current_project_id: project.id,
        current_role: data.role,
        assignment_start_date: new Date().toISOString().split('T')[0], // Format as date
      };

      await personnelService.update(person.id, updatedPerson);
      
      toast.success(`${person.name} asignado al proyecto ${project.name}`);
      
      // Reload data to reflect changes
      await loadPersonnelData();
      
      onSuccess?.();
      form.reset();
    } catch (error) {
      console.error('Error assigning personnel:', error);
      toast.error('Error al asignar empleado');
    } finally {
      setLoading(false);
    }
  };

  const handleUnassign = async (person: Personnel) => {
    if (!project) return;
    
    try {
      // Remove assignment by setting fields to null
      const updatedPerson: Partial<Personnel> = {
        current_project_id: null,
        current_role: null,
        assignment_start_date: null,
      };

      await personnelService.update(person.id, updatedPerson);
      toast.success(`${person.name} removido del proyecto`);
      
      // Reload data to reflect changes
      await loadPersonnelData();
    } catch (error) {
      console.error('Error unassigning personnel:', error);
      toast.error('Error al remover empleado');
    }
  };

  // Calculate project cost with assigned personnel
  const projectCostAnalysis = useMemo(() => {
    if (!assignedPersonnel.length) return null;

    const totalHourlyRate = assignedPersonnel.reduce((sum, person) => sum + (person.hourly_rate || 0), 0);
    const averageHourlyRate = totalHourlyRate / assignedPersonnel.length;
    const estimatedDailyCost = totalHourlyRate * 8; // 8 hours per day
    const estimatedMonthlyCost = estimatedDailyCost * 22; // 22 working days

    return {
      totalPersonnel: assignedPersonnel.length,
      totalHourlyRate,
      averageHourlyRate,
      estimatedDailyCost,
      estimatedMonthlyCost,
    };
  }, [assignedPersonnel]);

  if (!project) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Gestión de Personal - {project.name}
          </DialogTitle>
        </DialogHeader>

        {dataLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="space-y-6">
          {/* Cost Analysis */}
          {projectCostAnalysis && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Personal Asignado
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{projectCostAnalysis.totalPersonnel}</div>
                  <p className="text-xs text-muted-foreground">
                    Tarifa promedio: {formatCurrency(projectCostAnalysis.averageHourlyRate)}/hora
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Costo Diario
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(projectCostAnalysis.estimatedDailyCost)}</div>
                  <p className="text-xs text-muted-foreground">
                    8 horas x {projectCostAnalysis.totalPersonnel} empleados
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Costo Mensual Estimado
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(projectCostAnalysis.estimatedMonthlyCost)}</div>
                  <p className="text-xs text-muted-foreground">
                    22 días laborales
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Assigned Personnel */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Personal Actualmente Asignado</h3>
            {assignedPersonnel.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center text-gray-500">
                  No hay personal asignado a este proyecto
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {assignedPersonnel.map((person) => (
                  <Card key={person.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div>
                            <h4 className="font-medium">{person.name}</h4>
                            <p className="text-sm text-gray-600">
                              {t.positions[person.position as keyof typeof t.positions]} - {person.current_role}
                            </p>
                          </div>
                          <Badge className="bg-blue-100 text-blue-800">
                            {t.departments[person.department as keyof typeof t.departments]}
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="text-right">
                            <p className="font-medium">{formatCurrency(person.hourly_rate || 0)}/hora</p>
                            {person.assignment_start_date && (
                              <p className="text-xs text-gray-500">
                                Desde {new Date(person.assignment_start_date).toLocaleDateString('es-ES')}
                              </p>
                            )}
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleUnassign(person)}
                          >
                            Remover
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Add New Assignment */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Asignar Nuevo Personal</h3>
            {availablePersonnel.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center text-gray-500">
                  No hay personal disponible para asignar
                </CardContent>
              </Card>
            ) : (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="personnelId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Empleado *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Seleccionar empleado" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {availablePersonnel.map((person) => (
                                <SelectItem key={person.id} value={person.id}>
                                  <div className="flex items-center justify-between w-full">
                                    <span>{person.name}</span>
                                    <span className="text-xs text-gray-500 ml-2">
                                      {t.positions[person.position as keyof typeof t.positions]} - {formatCurrency(person.hourly_rate || 0)}/h
                                    </span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="role"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Rol en el Proyecto *</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Ej: Soldador Principal, Operador de Grúa"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => onOpenChange(false)}
                    >
                      Cerrar
                    </Button>
                    <Button type="submit" disabled={loading}>
                      {loading ? 'Asignando...' : 'Asignar Personal'}
                    </Button>
                  </div>
                </form>
              </Form>
            )}
          </div>
        </div>
        )}
      </DialogContent>
    </Dialog>
  );
}