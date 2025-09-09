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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { api } from "@/lib/api";
import type {
  Project,
  ProjectStatus,
  Client,
  CreateProjectRequest,
} from "@/lib/api/types";
import { toast } from "sonner";
import { Loader2, Calculator } from "lucide-react";
import { formatCurrency, safeNumber } from "@/lib/finance";

const projectSchema = z.object({
  name: z.string().min(1, "El nombre del proyecto es requerido"),
  client_id: z.string().optional(),
  clientName: z.string().optional(),
  status: z.enum(["planned", "in_progress", "on_hold", "completed"] as const, {
    message: "El estado es requerido",
  }),
  // Presupuesto detallado
  budget_materials: z
    .number()
    .min(0, "El presupuesto de materiales debe ser mayor o igual a 0"),
  budget_labor: z
    .number()
    .min(0, "El presupuesto de mano de obra debe ser mayor o igual a 0"),
  budget_equipment: z
    .number()
    .min(0, "El presupuesto de equipos debe ser mayor o igual a 0"),
  budget_overhead: z
    .number()
    .min(0, "El presupuesto de gastos generales debe ser mayor o igual a 0"),
  start_date: z.string().optional(),
  estimated_end_date: z.string().optional(),
  description: z.string().optional(),
});

type ProjectFormData = z.infer<typeof projectSchema>;

interface ProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project?: Project;
  onSuccess?: () => void;
}

export function ProjectDialog({
  open,
  onOpenChange,
  project,
  onSuccess,
}: ProjectDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [createNewClient, setCreateNewClient] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [activeTab, setActiveTab] = useState("basic");

  // Cargar clientes
  useEffect(() => {
    const loadClients = async () => {
      setLoadingClients(true);
      try {
        const clients = await api.clients.getAll();
        setClients(clients);
      } catch (error) {
        console.error("Error loading clients:", error);
        toast.error("Error al cargar clientes");
        setClients([]); // Ensure clients is always an array even on error
      } finally {
        setLoadingClients(false);
      }
    };

    if (open) {
      loadClients();
    }
  }, [open]);

  const form = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: project?.name || "",
      client_id: project?.client_id || "none",
      clientName: "",
      status: project?.status || "planned",
      budget_materials: project?.budget_materials || 0,
      budget_labor: project?.budget_labor || 0,
      budget_equipment: project?.budget_equipment || 0,
      budget_overhead: project?.budget_overhead || 0,
      start_date: project?.start_date || "",
      estimated_end_date: project?.estimated_end_date || "",
      description: project?.description || "",
    },
  });

  // Resetear form cuando cambie el proyecto
  useEffect(() => {
    if (project) {
      form.reset({
        name: project.name,
        client_id: project.client_id || "none",
        clientName: "",
        status: project.status,
        budget_materials: project.budget_materials,
        budget_labor: project.budget_labor,
        budget_equipment: project.budget_equipment,
        budget_overhead: project.budget_overhead,
        start_date: project.start_date || "",
        estimated_end_date: project.estimated_end_date || "",
        description: project.description || "",
      });
    } else {
      form.reset({
        name: "",
        client_id: "none",
        clientName: "",
        status: "planned",
        budget_materials: 0,
        budget_labor: 0,
        budget_equipment: 0,
        budget_overhead: 0,
        start_date: "",
        estimated_end_date: "",
        description: "",
      });
    }
  }, [project, form]);

  const onSubmit = async (data: ProjectFormData) => {
    setIsLoading(true);
    try {
      let clientId = data.client_id;

      // Create new client if needed
      if (createNewClient && data.clientName?.trim()) {
        const newClient = await api.clients.create({
          name: data.clientName.trim(),
          contact_name: "",
          phone: "",
          email: "",
          address: "",
        });
        clientId = newClient.id;
        toast.success("Cliente creado exitosamente");
        // Recargar lista de clientes
        const updatedClients = await api.clients.getAll();
        setClients(updatedClients);
      }

      const projectData: CreateProjectRequest = {
        name: data.name,
        client_id: clientId === "none" ? undefined : clientId,
        status: data.status,
        budget_materials: data.budget_materials || 0,
        budget_labor: data.budget_labor || 0,
        budget_equipment: data.budget_equipment || 0,
        budget_overhead: data.budget_overhead || 0,
        start_date: data.start_date || undefined,
        estimated_end_date: data.estimated_end_date || undefined,
        description: data.description || undefined,
      };

      if (project?.id) {
        await api.projects.update(project.id, projectData);
        toast.success("Proyecto actualizado exitosamente");
      } else {
        await api.projects.create(projectData);
        toast.success("Proyecto creado exitosamente");
      }

      onOpenChange(false);
      onSuccess?.();
      form.reset();
      setCreateNewClient(false);
      setActiveTab("basic");
    } catch (error) {
      console.error("Error saving project:", error);
      toast.error(
        error instanceof Error ? error.message : "Error al guardar el proyecto"
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Calcular presupuesto total - usar safeNumber para evitar concatenación
  const materials = safeNumber(form.watch("budget_materials"));
  const labor = safeNumber(form.watch("budget_labor"));
  const equipment = safeNumber(form.watch("budget_equipment"));
  const overhead = safeNumber(form.watch("budget_overhead"));
  const totalBudget = materials + labor + equipment + overhead;

  const getStatusLabel = (status: ProjectStatus) => {
    const labels = {
      planned: "Planificado",
      in_progress: "En Progreso",
      on_hold: "En Pausa",
      completed: "Completado",
    };
    return labels[status];
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {project ? "Editar Proyecto" : "Nuevo Proyecto"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="basic">Información Básica</TabsTrigger>
                <TabsTrigger value="budget">Presupuesto</TabsTrigger>
                <TabsTrigger value="schedule">Fechas</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4 mt-4">
                {/* Project Name */}
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre del Proyecto *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Construcción casa familiar, etc."
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Client Selection */}
                <div className="space-y-2">
                  <FormLabel>Cliente</FormLabel>
                  <div className="flex items-center space-x-2 mb-2">
                    <Button
                      type="button"
                      variant={!createNewClient ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCreateNewClient(false)}
                      disabled={loadingClients}
                    >
                      Cliente Existente
                    </Button>
                    <Button
                      type="button"
                      variant={createNewClient ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCreateNewClient(true)}
                    >
                      Nuevo Cliente
                    </Button>
                  </div>

                  {!createNewClient ? (
                    <FormField
                      control={form.control}
                      name="client_id"
                      render={({ field }) => (
                        <FormItem>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                            disabled={loadingClients}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue
                                  placeholder={
                                    loadingClients
                                      ? "Cargando..."
                                      : "Seleccionar cliente (opcional)"
                                  }
                                />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="none">
                                Sin cliente asignado
                              </SelectItem>
                              {clients?.map(client => (
                                <SelectItem key={client.id} value={client.id}>
                                  {client.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                  ) : (
                    <FormField
                      control={form.control}
                      name="clientName"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Nombre del nuevo cliente"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  )}
                </div>

                {/* Status */}
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estado *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar estado" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="planned">
                            {getStatusLabel("planned")}
                          </SelectItem>
                          <SelectItem value="in_progress">
                            {getStatusLabel("in_progress")}
                          </SelectItem>
                          <SelectItem value="on_hold">
                            {getStatusLabel("on_hold")}
                          </SelectItem>
                          <SelectItem value="completed">
                            {getStatusLabel("completed")}
                          </SelectItem>
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
                      <FormLabel>Descripción</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Detalles del proyecto, especificaciones, notas..."
                          rows={4}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              <TabsContent value="budget" className="space-y-4 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calculator className="h-5 w-5" />
                      Presupuesto Detallado
                    </CardTitle>
                    <CardDescription>
                      Distribución del presupuesto por categorías principales
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Materials Budget */}
                    <FormField
                      control={form.control}
                      name="budget_materials"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Materiales (COP)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              step="1"
                              {...field}
                              onChange={e => {
                                const value =
                                  e.target.value === ""
                                    ? 0
                                    : parseFloat(e.target.value);
                                field.onChange(safeNumber(value));
                              }}
                              placeholder="25000000"
                              className="text-right"
                            />
                          </FormControl>
                          <div className="text-sm text-muted-foreground">
                            {safeNumber(field.value) > 0 &&
                              `≈ ${formatCurrency(safeNumber(field.value))}`}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Labor Budget */}
                    <FormField
                      control={form.control}
                      name="budget_labor"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Mano de Obra (COP)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              step="1"
                              {...field}
                              onChange={e => {
                                const value =
                                  e.target.value === ""
                                    ? 0
                                    : parseFloat(e.target.value);
                                field.onChange(safeNumber(value));
                              }}
                              placeholder="18000000"
                              className="text-right"
                            />
                          </FormControl>
                          <div className="text-sm text-muted-foreground">
                            {safeNumber(field.value) > 0 &&
                              `≈ ${formatCurrency(safeNumber(field.value))}`}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Equipment Budget */}
                    <FormField
                      control={form.control}
                      name="budget_equipment"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Equipos y Herramientas (COP)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              step="1"
                              {...field}
                              onChange={e => {
                                const value =
                                  e.target.value === ""
                                    ? 0
                                    : parseFloat(e.target.value);
                                field.onChange(safeNumber(value));
                              }}
                              placeholder="8000000"
                              className="text-right"
                            />
                          </FormControl>
                          <div className="text-sm text-muted-foreground">
                            {safeNumber(field.value) > 0 &&
                              `≈ ${formatCurrency(safeNumber(field.value))}`}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Overhead Budget */}
                    <FormField
                      control={form.control}
                      name="budget_overhead"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Gastos Generales (COP)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              step="1"
                              {...field}
                              onChange={e => {
                                const value =
                                  e.target.value === ""
                                    ? 0
                                    : parseFloat(e.target.value);
                                field.onChange(safeNumber(value));
                              }}
                              placeholder="4000000"
                              className="text-right"
                            />
                          </FormControl>
                          <div className="text-sm text-muted-foreground">
                            {safeNumber(field.value) > 0 &&
                              `≈ ${formatCurrency(safeNumber(field.value))}`}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Budget Distribution */}
                    {totalBudget > 0 && (
                      <div className="space-y-3 p-4 bg-muted rounded-lg mt-4">
                        <h4 className="font-medium text-sm">
                          Distribución del Presupuesto
                        </h4>
                        <div className="space-y-2">
                          {materials > 0 && (
                            <div className="flex justify-between text-sm">
                              <span>Materiales</span>
                              <span>
                                {((materials / totalBudget) * 100).toFixed(1)}%
                              </span>
                            </div>
                          )}
                          {labor > 0 && (
                            <div className="flex justify-between text-sm">
                              <span>Mano de Obra</span>
                              <span>
                                {((labor / totalBudget) * 100).toFixed(1)}%
                              </span>
                            </div>
                          )}
                          {equipment > 0 && (
                            <div className="flex justify-between text-sm">
                              <span>Equipos</span>
                              <span>
                                {((equipment / totalBudget) * 100).toFixed(1)}%
                              </span>
                            </div>
                          )}
                          {overhead > 0 && (
                            <div className="flex justify-between text-sm">
                              <span>Gastos Generales</span>
                              <span>
                                {((overhead / totalBudget) * 100).toFixed(1)}%
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Total Display */}
                    <div className="p-4 bg-primary/10 rounded-lg mt-4 border-2 border-primary/20">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">Presupuesto Total:</span>
                        <span className="text-lg font-semibold text-primary">
                          {formatCurrency(totalBudget)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="schedule" className="space-y-4 mt-4">
                {/* Dates */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="start_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fecha de Inicio</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="estimated_end_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fecha Estimada de Fin</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  onOpenChange(false);
                  setCreateNewClient(false);
                  setActiveTab("basic");
                }}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isLoading
                  ? "Guardando..."
                  : project
                    ? "Actualizar Proyecto"
                    : "Crear Proyecto"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
