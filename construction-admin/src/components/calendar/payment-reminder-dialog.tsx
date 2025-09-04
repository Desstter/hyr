'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api, handleApiError } from '@/lib/api';
import type { CalendarEvent, PaymentCategory, RecurrenceType, Project } from '@/lib/api/types';
import { toast } from 'sonner';
import { format } from 'date-fns';

const paymentReminderSchema = z.object({
  title: z.string().min(1, 'El título es requerido'),
  event_date: z.string().min(1, 'La fecha de vencimiento es requerida'),
  category: z.enum(['tax', 'insurance', 'permit', 'equipment', 'other'] as const, {
    required_error: 'La categoría es requerida'
  }),
  amount: z.number().min(0, 'El monto debe ser mayor o igual a 0').optional(),
  recurrence: z.enum(['none', 'monthly', 'quarterly', 'yearly'] as const).default('none'),
  project_id: z.string().optional(),
  description: z.string().optional(),
});

type PaymentReminderFormData = z.infer<typeof paymentReminderSchema>;

interface PaymentReminderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reminder?: CalendarEvent;
  onSuccess?: () => void;
}

export function PaymentReminderDialog({ 
  open, 
  onOpenChange, 
  reminder, 
  onSuccess 
}: PaymentReminderDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);

  // Cargar proyectos
  useEffect(() => {
    const loadProjects = async () => {
      setLoadingProjects(true);
      try {
        const result = await api.projects.getAll();
        
        // Handle both direct array response and {data: array} response
        const projectsData = Array.isArray(result) ? result : 
                            (Array.isArray(result.data) ? result.data : []);
        setProjects(projectsData);
      } catch (error) {
        console.error('Error loading projects:', error);
        setProjects([]);
        toast.error('Error al cargar proyectos');
      } finally {
        setLoadingProjects(false);
      }
    };

    if (open) {
      loadProjects();
    }
  }, [open]);

  const form = useForm<PaymentReminderFormData>({
    resolver: zodResolver(paymentReminderSchema),
    defaultValues: {
      title: reminder?.title || '',
      event_date: reminder?.event_date || format(new Date(), 'yyyy-MM-dd'),
      category: reminder?.category || 'other',
      amount: reminder?.amount || 0,
      recurrence: reminder?.recurrence || 'none',
      project_id: reminder?.project_id || 'no-project',
      description: reminder?.description || '',
    },
  });

  const onSubmit = async (data: PaymentReminderFormData) => {
    setIsLoading(true);
    try {
      const eventData = {
        title: data.title,
        description: data.description,
        event_date: data.event_date,
        type: 'payment' as const,
        priority: 'medium' as const,
        amount: data.amount,
        category: data.category,
        recurrence: data.recurrence,
        project_id: data.project_id === 'no-project' ? undefined : data.project_id,
      };

      if (reminder?.id) {
        // Actualizar evento existente
        await api.calendar.updateEvent(reminder.id, eventData);
        toast.success('Recordatorio actualizado exitosamente');
      } else {
        // Crear nuevo evento
        await api.calendar.createEvent(eventData);
        toast.success('Recordatorio creado exitosamente');
      }
      
      onOpenChange(false);
      onSuccess?.();
      form.reset();
    } catch (error) {
      console.error('Error saving payment reminder:', error);
      const errorMessage = handleApiError(error);
      toast.error('Error al guardar el recordatorio: ' + errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const getCategoryLabel = (category: PaymentCategory) => {
    const labels = {
      tax: 'Impuestos',
      insurance: 'Seguros',
      permit: 'Permisos/Licencias',
      equipment: 'Equipos',
      other: 'Otros',
    };
    return labels[category];
  };

  const getRecurringLabel = (recurrence: RecurrenceType) => {
    const labels = {
      none: 'No se repite',
      monthly: 'Mensual',
      quarterly: 'Trimestral',
      yearly: 'Anual',
    };
    return labels[recurrence];
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {reminder ? 'Editar Recordatorio' : 'Nuevo Recordatorio de Pago'}
          </DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Title */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Ej: Pago de seguro vehicular" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Due Date */}
            <FormField
              control={form.control}
              name="event_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fecha de Vencimiento *</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Category */}
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoría *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar categoría" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="tax">{getCategoryLabel('tax')}</SelectItem>
                      <SelectItem value="insurance">{getCategoryLabel('insurance')}</SelectItem>
                      <SelectItem value="permit">{getCategoryLabel('permit')}</SelectItem>
                      <SelectItem value="equipment">{getCategoryLabel('equipment')}</SelectItem>
                      <SelectItem value="other">{getCategoryLabel('other')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Amount */}
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Monto (COP)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      placeholder="Opcional"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Recurring */}
            <FormField
              control={form.control}
              name="recurrence"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Frecuencia</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar frecuencia" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">{getRecurringLabel('none')}</SelectItem>
                      <SelectItem value="monthly">{getRecurringLabel('monthly')}</SelectItem>
                      <SelectItem value="quarterly">{getRecurringLabel('quarterly')}</SelectItem>
                      <SelectItem value="yearly">{getRecurringLabel('yearly')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Project */}
            <FormField
              control={form.control}
              name="project_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Proyecto</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={loadingProjects}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={loadingProjects ? "Cargando..." : "Seleccionar proyecto (opcional)"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="no-project">General (sin proyecto)</SelectItem>
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      placeholder="Notas adicionales sobre el pago"
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Guardando...' : (reminder ? 'Actualizar' : 'Crear')}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}