'use client';

import { useState } from 'react';
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
import type { BudgetItem, BudgetItemCategory } from '@/lib/api/types';
import { toast } from 'sonner';

const budgetItemSchema = z.object({
  category: z.enum(['materials', 'labor', 'equipment', 'overhead'] as const, {
    required_error: 'La categoría es requerida'
  }),
  description: z.string().min(1, 'La descripción es requerida'),
  quantity: z.number().min(0, 'La cantidad debe ser mayor o igual a 0'),
  unit_cost: z.number().min(0, 'El costo unitario debe ser mayor or igual a 0'),
  currency: z.enum(['COP', 'USD', 'EUR'] as const).default('COP'),
});

type BudgetItemFormData = z.infer<typeof budgetItemSchema>;

interface BudgetItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  budgetItem?: BudgetItem;
  onSuccess?: () => void;
}

export function BudgetItemDialog({ 
  open, 
  onOpenChange, 
  projectId, 
  budgetItem, 
  onSuccess 
}: BudgetItemDialogProps) {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<BudgetItemFormData>({
    resolver: zodResolver(budgetItemSchema),
    defaultValues: {
      category: budgetItem?.category || 'materials',
      description: budgetItem?.description || '',
      quantity: budgetItem?.quantity || 1,
      unit_cost: budgetItem?.unit_cost || 0,
      currency: budgetItem?.currency || 'COP',
    },
  });

  const onSubmit = async (data: BudgetItemFormData) => {
    setIsLoading(true);
    try {
      if (budgetItem?.id) {
        // Actualizar item existente
        await api.budgetItems.update(budgetItem.id, {
          ...data,
          project_id: projectId,
        });
        toast.success('Partida actualizada exitosamente');
      } else {
        // Crear nuevo item
        await api.budgetItems.create({
          project_id: projectId,
          ...data,
        });
        toast.success('Partida creada exitosamente');
      }
      
      onOpenChange(false);
      onSuccess?.();
      form.reset();
    } catch (error) {
      console.error('Error saving budget item:', error);
      const errorMessage = handleApiError(error);
      toast.error('Error al guardar la partida: ' + errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const getCategoryLabel = (category: BudgetItemCategory) => {
    const labels = {
      materials: 'Materiales',
      labor: 'Mano de obra',
      equipment: 'Equipos/Herramientas',
      overhead: 'Gastos Generales',
    };
    return labels[category];
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {budgetItem ? 'Editar Partida de Presupuesto' : 'Nueva Partida de Presupuesto'}
          </DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                      <SelectItem value="materials">{getCategoryLabel('materials')}</SelectItem>
                      <SelectItem value="labor">{getCategoryLabel('labor')}</SelectItem>
                      <SelectItem value="equipment">{getCategoryLabel('equipment')}</SelectItem>
                      <SelectItem value="overhead">{getCategoryLabel('overhead')}</SelectItem>
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
                  <FormLabel>Descripción *</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      placeholder="Descripción de la partida"
                      rows={2}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              {/* Quantity */}
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cantidad *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Unit Cost */}
              <FormField
                control={form.control}
                name="unit_cost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Costo Unitario (COP) *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Total Display */}
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex justify-between items-center">
                <span className="font-medium">Total:</span>
                <span className="text-lg font-semibold">
                  ${(form.watch('quantity') * form.watch('unit_cost')).toLocaleString('es-CO', {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  })} COP
                </span>
              </div>
            </div>

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
                {isLoading ? 'Guardando...' : (budgetItem ? 'Actualizar' : 'Crear')}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}