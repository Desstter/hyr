"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api, handleApiError } from "@/lib/api";
import type { Expense, Project, ExpenseCategory } from "@/lib/api";
import { toast } from "sonner";
import { format } from "date-fns";
import { Zap, Receipt, Hammer, Users, FileText } from "lucide-react";

const expenseSchema = z.object({
  date: z.string().min(1, "La fecha es requerida"),
  project_id: z.string().optional(),
  category: z.enum(["materials", "labor", "equipment", "overhead"] as const, {
    required_error: "La categoría es requerida",
  }),
  vendor: z.string().optional(),
  description: z.string().optional(),
  amount: z.number().min(0, "El monto debe ser mayor a 0"),
});

type ExpenseFormData = z.infer<typeof expenseSchema>;

interface ExpenseTemplate {
  name: string;
  category: ExpenseCategory;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  amount?: number;
}

const quickTemplates: ExpenseTemplate[] = [
  {
    name: "Cemento",
    category: "materials",
    description: "Compra de cemento para construcción",
    icon: Receipt,
    amount: 25000,
  },
  {
    name: "Herramientas",
    category: "equipment",
    description: "Compra/alquiler de herramientas",
    icon: Hammer,
    amount: 50000,
  },
  {
    name: "Mano de Obra",
    category: "labor",
    description: "Pago a trabajadores",
    icon: Users,
    amount: 150000,
  },
  {
    name: "Gastos Generales",
    category: "overhead",
    description: "Gastos generales del proyecto",
    icon: FileText,
    amount: 30000,
  },
];

interface ExpenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense?: Expense;
  onSuccess?: () => void;
}

export function ExpenseDialog({
  open,
  onOpenChange,
  expense,
  onSuccess,
}: ExpenseDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showTemplates, setShowTemplates] = useState(!expense); // Show templates for new expenses
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);

  // Load projects from API
  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setLoadingProjects(true);
      const result = await api.projects.getAll();

      // Handle both direct array response and {data: array} response
      const projectsData = Array.isArray(result)
        ? result
        : Array.isArray(result.data)
          ? result.data
          : [];
      setProjects(projectsData);
    } catch (err) {
      console.error("Error loading projects:", err);
      setProjects([]);
    } finally {
      setLoadingProjects(false);
    }
  };

  const form = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      date: expense?.date || format(new Date(), "yyyy-MM-dd"),
      project_id: expense?.project_id || "none",
      category: expense?.category || "materials",
      vendor: expense?.vendor || "",
      description: expense?.description || "",
      amount: expense?.amount || 0,
    },
  });

  const applyTemplate = (template: ExpenseTemplate) => {
    form.setValue("category", template.category);
    form.setValue("description", template.description);
    if (template.amount) {
      form.setValue("amount", template.amount);
    }
    setShowTemplates(false);
    toast.success(`Plantilla "${template.name}" aplicada`);
  };

  const onSubmit = async (data: ExpenseFormData) => {
    setIsLoading(true);
    try {
      const expenseData = {
        ...data,
        project_id: data.project_id === "none" ? undefined : data.project_id,
      };

      if (expense) {
        // Update existing expense
        await api.expenses.update(expense.id, expenseData);
        toast.success("Gasto actualizado");
      } else {
        // Create new expense
        await api.expenses.create(expenseData);
        toast.success("Gasto creado");
      }

      onOpenChange(false);
      onSuccess?.();
      form.reset();
    } catch (error) {
      console.error("Error saving expense:", error);
      const errorMessage = handleApiError(error);
      toast.error("Error al guardar el gasto: " + errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const getCategoryLabel = (category: ExpenseCategory) => {
    const labels = {
      materials: "Materiales",
      labor: "Mano de obra",
      equipment: "Equipos/Herramientas",
      overhead: "Gastos generales",
    };
    return labels[category];
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{expense ? "Editar Gasto" : "Nuevo Gasto"}</DialogTitle>
        </DialogHeader>

        {/* Quick Templates */}
        {showTemplates && !expense && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Plantillas Rápidas</h4>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowTemplates(false)}
              >
                Crear desde cero
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {quickTemplates.map(template => {
                const Icon = template.icon;
                return (
                  <Button
                    key={template.name}
                    type="button"
                    variant="outline"
                    className="h-auto p-3 flex flex-col items-start space-y-1"
                    onClick={() => applyTemplate(template)}
                  >
                    <div className="flex items-center space-x-2">
                      <Icon className="h-4 w-4" />
                      <span className="font-medium">{template.name}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {template.description}
                    </span>
                    {template.amount && (
                      <span className="text-xs font-medium text-green-600">
                        ${template.amount.toLocaleString()} COP
                      </span>
                    )}
                  </Button>
                );
              })}
            </div>
            <div className="border-t pt-3" />
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Date */}
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fecha *</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
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
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            loadingProjects
                              ? "Cargando proyectos..."
                              : "Seleccionar proyecto (opcional)"
                          }
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">
                        General (sin proyecto)
                      </SelectItem>
                      {projects.map(project => (
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
                      <SelectItem value="materials">
                        {getCategoryLabel("materials")}
                      </SelectItem>
                      <SelectItem value="labor">
                        {getCategoryLabel("labor")}
                      </SelectItem>
                      <SelectItem value="equipment">
                        {getCategoryLabel("equipment")}
                      </SelectItem>
                      <SelectItem value="overhead">
                        {getCategoryLabel("overhead")}
                      </SelectItem>
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
                  <FormLabel>Monto (COP) *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      {...field}
                      onChange={e =>
                        field.onChange(parseFloat(e.target.value) || 0)
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Vendor */}
            <FormField
              control={form.control}
              name="vendor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Proveedor</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Nombre del proveedor" />
                  </FormControl>
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
                  <FormLabel>Descripción</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Descripción del gasto"
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-between">
              <div>
                {!showTemplates && !expense && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowTemplates(true)}
                  >
                    <Zap className="h-4 w-4 mr-2" />
                    Ver plantillas
                  </Button>
                )}
              </div>
              <div className="flex space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    onOpenChange(false);
                    setShowTemplates(!expense);
                  }}
                  disabled={isLoading}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading
                    ? "Guardando..."
                    : expense
                      ? "Actualizar"
                      : "Crear"}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
