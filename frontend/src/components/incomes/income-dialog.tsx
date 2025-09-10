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
import type { ProjectIncome, Project, PaymentMethod } from "@/lib/api";
import { toast } from "sonner";
import { format } from "date-fns";
import { Zap, DollarSign, CreditCard, Banknote, Receipt } from "lucide-react";

const incomeSchema = z.object({
  date: z.string().min(1, "La fecha es requerida"),
  project_id: z.string().optional(),
  concept: z.string().min(1, "El concepto es requerido"),
  amount: z.number().min(0, "El monto debe ser mayor a 0"),
  payment_method: z.enum(["transfer", "cash", "check", "card"] as const, {
    message: "El método de pago es requerido",
  }),
  invoice_number: z.string().optional(),
  notes: z.string().optional(),
});

type IncomeFormData = z.infer<typeof incomeSchema>;

interface IncomeTemplate {
  name: string;
  concept: string;
  payment_method: PaymentMethod;
  icon: React.ComponentType<{ className?: string }>;
  amount?: number;
}

const quickTemplates: IncomeTemplate[] = [
  {
    name: "Pago Inicial",
    concept: "Pago inicial del proyecto",
    payment_method: "transfer",
    icon: DollarSign,
    amount: 5000000,
  },
  {
    name: "Pago por Avance",
    concept: "Pago por avance de obra",
    payment_method: "transfer",
    icon: Receipt,
    amount: 3000000,
  },
  {
    name: "Pago Final",
    concept: "Pago final del proyecto",
    payment_method: "transfer",
    icon: CreditCard,
    amount: 2000000,
  },
  {
    name: "Pago en Efectivo",
    concept: "Pago recibido en efectivo",
    payment_method: "cash",
    icon: Banknote,
    amount: 1000000,
  },
];

interface IncomeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  income?: ProjectIncome;
  projectId?: string; // Pre-selected project
  onSuccess?: () => void;
}

export function IncomeDialog({
  open,
  onOpenChange,
  income,
  projectId,
  onSuccess,
}: IncomeDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showTemplates, setShowTemplates] = useState(!income); // Show templates for new incomes
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
        : Array.isArray((result as {data?: Project[]}).data)
          ? (result as {data: Project[]}).data
          : [];
      setProjects(projectsData);
    } catch (err) {
      console.error("Error loading projects:", err);
      setProjects([]);
    } finally {
      setLoadingProjects(false);
    }
  };

  const form = useForm<IncomeFormData>({
    resolver: zodResolver(incomeSchema),
    defaultValues: {
      date: income?.date || format(new Date(), "yyyy-MM-dd"),
      project_id: income?.project_id || projectId || "",
      concept: income?.concept || "",
      amount: income?.amount || 0,
      payment_method: income?.payment_method || "transfer",
      invoice_number: income?.invoice_number || "",
      notes: income?.notes || "",
    },
  });

  const applyTemplate = (template: IncomeTemplate) => {
    form.setValue("concept", template.concept);
    form.setValue("payment_method", template.payment_method);
    if (template.amount) {
      form.setValue("amount", template.amount);
    }
    setShowTemplates(false);
    toast.success(`Plantilla "${template.name}" aplicada`);
  };

  const onSubmit = async (data: IncomeFormData) => {
    setIsLoading(true);
    try {
      const incomeData = {
        ...data,
        project_id: data.project_id || undefined,
      };

      if (income) {
        // Update existing income
        await api.incomes.updateIncome(income.id, incomeData);
        toast.success("Ingreso actualizado");
      } else {
        // Create new income
        if (!data.project_id) {
          toast.error("Debe seleccionar un proyecto");
          return;
        }
        await api.incomes.createProjectIncome(data.project_id, incomeData);
        toast.success("Ingreso registrado");
      }

      onOpenChange(false);
      onSuccess?.();
      form.reset();
      setShowTemplates(!income);
    } catch (error) {
      console.error("Error saving income:", error);
      const errorMessage = handleApiError(error);
      toast.error("Error al guardar el ingreso: " + errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const getPaymentMethodLabel = (method: PaymentMethod) => {
    const labels = {
      transfer: "Transferencia",
      cash: "Efectivo",
      check: "Cheque",
      card: "Tarjeta",
    };
    return labels[method];
  };

  const getPaymentMethodIcon = (method: PaymentMethod) => {
    const icons = {
      transfer: CreditCard,
      cash: Banknote,
      check: Receipt,
      card: CreditCard,
    };
    return icons[method];
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{income ? "Editar Ingreso" : "Nuevo Ingreso"}</DialogTitle>
        </DialogHeader>

        {/* Quick Templates */}
        {showTemplates && !income && (
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
                      {template.concept}
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
                  <FormLabel>Proyecto *</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    value={field.value}
                    disabled={!!projectId} // Disable if pre-selected
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            loadingProjects
                              ? "Cargando proyectos..."
                              : "Seleccionar proyecto"
                          }
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
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

            {/* Concept */}
            <FormField
              control={form.control}
              name="concept"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Concepto *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Concepto del ingreso" />
                  </FormControl>
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

            {/* Payment Method */}
            <FormField
              control={form.control}
              name="payment_method"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Método de Pago *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar método de pago" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="transfer">
                        {getPaymentMethodLabel("transfer")}
                      </SelectItem>
                      <SelectItem value="cash">
                        {getPaymentMethodLabel("cash")}
                      </SelectItem>
                      <SelectItem value="check">
                        {getPaymentMethodLabel("check")}
                      </SelectItem>
                      <SelectItem value="card">
                        {getPaymentMethodLabel("card")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Invoice Number */}
            <FormField
              control={form.control}
              name="invoice_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Número de Factura</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Número de factura o recibo" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Notas adicionales sobre el ingreso"
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-between">
              <div>
                {!showTemplates && !income && (
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
                    setShowTemplates(!income);
                  }}
                  disabled={isLoading}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading
                    ? "Guardando..."
                    : income
                      ? "Actualizar"
                      : "Registrar"}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}