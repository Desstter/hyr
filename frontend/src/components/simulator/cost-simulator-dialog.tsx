"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, Calculator, Save } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useTranslations } from "@/lib/i18n";
import { formatCurrency } from "@/lib/finance";
import { generateId } from "@/lib/utils";
import { clientsService } from "@/lib/api/clients";
import {
  useTemplates,
  usePresets,
  CostTemplate,
  saveEstimation,
  calculateEstimation,
  type EstimationItem,
} from "@/lib/api/simulator";
import type { Client } from "@/lib/api/types";
import { toast } from "sonner";

// Updated interfaces to match API structure
interface CostEstimateItem {
  id: string;
  name: string;
  type: "material" | "labor" | "equipment" | "overhead";
  unit: string;
  unitCost: number;
  quantity: number;
  total: number;
  description?: string;
}

interface CostEstimate {
  id?: string;
  name: string;
  clientId?: string;
  templateId?: string;
  items: CostEstimateItem[];
  subtotal: number;
  profitMargin: number;
  totalBeforeMargin: number;
  total: number;
  currency: "COP" | "USD";
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface CostSimulatorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  estimate?: CostEstimate;
  template?: CostTemplate;
}

interface EstimateFormData {
  name: string;
  clientId?: string;
  templateId?: string;
  profitMargin: number;
  notes?: string;
  currency: "COP" | "USD";
  items: CostEstimateItem[];
}

export function CostSimulatorDialog({
  open,
  onOpenChange,
  onSuccess,
  estimate,
  template,
}: CostSimulatorDialogProps) {
  const _t = useTranslations("es");

  // Load data from API
  const [clients, setClients] = useState<Client[]>([]);
  const [_loadingClients, _setLoadingClients] = useState(true);
  const { templates, loading: _loadingTemplates } = useTemplates();
  
  const [formData, setFormData] = useState<EstimateFormData>({
    name: "",
    profitMargin: 15,
    currency: "COP",
    items: [],
  });

  const { presets, loading: _loadingPresets } = usePresets(formData.templateId || 'construction');

  const [_selectedTemplate, _setSelectedTemplate] = useState<
    CostTemplate | undefined
  >();
  const [isEditing, setIsEditing] = useState(false);

  // Load clients
  useEffect(() => {
    const loadClients = async () => {
      try {
        _setLoadingClients(true);
        const clientsData = await clientsService.getAll();
        // clientsService.getAll() already returns Client[] directly
        const clientsList = Array.isArray(clientsData) ? clientsData : [];
        setClients(clientsList);
      } catch (error) {
        console.error("Error loading clients:", error);
        setClients([]); // Ensure clients is always an array even on error
      } finally {
        _setLoadingClients(false);
      }
    };

    if (open) {
      loadClients();
    }
  }, [open]);

  // Helper functions for calculations
  const calculateItemTotal = (unitCost: number, quantity: number): number => {
    return unitCost * quantity;
  };

  const calculateEstimateTotal = (
    items: CostEstimateItem[],
    profitMargin: number
  ) => {
    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const total = subtotal * (1 + profitMargin / 100);
    return {
      subtotal,
      totalBeforeMargin: subtotal,
      total,
    };
  };

  const generateEstimateFromTemplate = useCallback((
    template: CostTemplate,
    margin: number
  ): Partial<CostEstimate> => {
    // Use real presets from the API when available
    if (presets.length > 0) {
      // Use the first preset as a base, or you could allow user to select
      const selectedPreset = presets[0];
      
      // Convert API preset items to component format
      const templateItems: CostEstimateItem[] = selectedPreset.items.map((item, _index) => {
        const unitCost = item.cost_per_unit || 0;
        const quantity = item.quantity || 1;
        return {
          id: generateId(),
          name: item.name || item.subcategory,
          type: item.category === 'materials' ? 'material' : 
                item.category === 'labor' ? 'labor' : 'equipment',
          quantity: quantity,
          unitCost: unitCost,
          unit: item.unit || 'und',
          total: quantity * unitCost
        };
      });
      
      return {
        name: `Estimación basada en ${template.name} - ${selectedPreset.name}`,
        profitMargin: margin,
        currency: "COP" as const,
        items: templateItems,
      };
    }
    
    // Fallback if no presets are available
    return {
      name: `Estimación basada en ${template.name}`,
      profitMargin: margin,
      currency: "COP" as const,
      items: [],
    };
  }, [presets]);

  // Initialize form data
  useEffect(() => {
    if (estimate) {
      setFormData({
        name: estimate.name,
        clientId: estimate.clientId,
        templateId: estimate.templateId,
        profitMargin: estimate.profitMargin,
        notes: estimate.notes,
        currency: estimate.currency,
        items: [...estimate.items],
      });
      setIsEditing(true);
    } else if (template) {
      const generatedEstimate = generateEstimateFromTemplate(template, 15);
      setFormData({
        name: generatedEstimate.name!,
        templateId: template.id,
        profitMargin: generatedEstimate.profitMargin || 15,
        currency: generatedEstimate.currency || "COP",
        items: generatedEstimate.items ? [...generatedEstimate.items] : [],
      });
      _setSelectedTemplate(template);
    } else {
      // Reset form for new estimate
      setFormData({
        name: "",
        profitMargin: 15,
        currency: "COP",
        items: [],
      });
      _setSelectedTemplate(undefined);
      setIsEditing(false);
    }
  }, [estimate, template, open, generateEstimateFromTemplate]);

  // Calculate totals
  const calculation = calculateEstimateTotal(
    formData.items,
    formData.profitMargin
  );

  const handleTemplateChange = (templateId: string) => {
    if (templateId === "none") {
      setFormData(prev => ({
        ...prev,
        templateId: undefined,
      }));
      _setSelectedTemplate(undefined);
      return;
    }

    const template = templates?.find(t => t.id === templateId);
    if (template) {
      const generatedEstimate = generateEstimateFromTemplate(
        template,
        formData.profitMargin
      );
      setFormData(prev => ({
        ...prev,
        templateId: template.id,
        name: prev.name || generatedEstimate.name || "Nueva estimación",
        items: generatedEstimate.items ? [...generatedEstimate.items] : [],
        currency: generatedEstimate.currency || "COP",
      }));
      _setSelectedTemplate(template);
    }
  };

  const handleAddItem = () => {
    const newItem: CostEstimateItem = {
      id: generateId(),
      name: "",
      type: "material",
      unit: "unidad",
      unitCost: 0,
      quantity: 1,
      total: 0,
      description: "",
    };
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, newItem],
    }));
  };

  const handleUpdateItem = (
    index: number,
    updates: Partial<CostEstimateItem>
  ) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => {
        if (i === index) {
          const updatedItem = { ...item, ...updates };
          // Recalculate total if quantity or unitCost changed
          if ("quantity" in updates || "unitCost" in updates) {
            updatedItem.total = calculateItemTotal(
              updatedItem.unitCost,
              updatedItem.quantity
            );
          }
          return updatedItem;
        }
        return item;
      }),
    }));
  };

  const handleRemoveItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const handleProfitMarginChange = (margin: number) => {
    setFormData(prev => ({
      ...prev,
      profitMargin: margin,
    }));
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error("El nombre de la cotización es requerido");
      return;
    }

    if (formData.items.length === 0) {
      toast.error("Debe agregar al menos un elemento");
      return;
    }

    try {
      // Convert form items to API format
      const estimationItems: EstimationItem[] = formData.items.map(item => ({
        category: item.type === 'material' ? 'materials' : 
                  item.type === 'labor' ? 'labor' : 'equipment',
        subcategory: item.name.toLowerCase().replace(/\s+/g, '_'),
        quantity: item.quantity,
        name: item.name,
        cost_per_unit: item.unitCost,
      }));

      // Calculate estimation using the real API
      const calculationResult = await calculateEstimation({
        template_type: formData.templateId || 'construction',
        items: estimationItems,
        project_duration_days: 30,
        apply_benefits: true
      });

      // Save the estimation using the real API
      const _savedEstimation = await saveEstimation({
        project_name: formData.name,
        client_name: clients.find(c => c.id === formData.clientId)?.name || 'Cliente desconocido',
        template_type: formData.templateId || 'construction',
        estimation_data: calculationResult,
        notes: formData.notes,
      });

      if (isEditing) {
        toast.success("Cotización actualizada");
      } else {
        toast.success("Cotización creada y guardada en base de datos");
      }
      
      onSuccess();
    } catch (error) {
      console.error("Error saving estimation:", error);
      toast.error("Error al guardar la cotización: " + (error instanceof Error ? error.message : 'Error desconocido'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Cotización" : "Nueva Cotización"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre de la Cotización *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={e =>
                  setFormData(prev => ({ ...prev, name: e.target.value }))
                }
                placeholder="Nombre de la cotización"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client">Cliente</Label>
              <Select
                value={formData.clientId || "none"}
                onValueChange={value =>
                  setFormData(prev => ({
                    ...prev,
                    clientId: value === "none" ? undefined : value,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar cliente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin cliente</SelectItem>
                  {clients?.map(client => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Template Selection (only for new estimates) */}
          {!isEditing && (
            <div className="space-y-2">
              <Label htmlFor="template">Seleccionar Plantilla</Label>
              <Select
                value={formData.templateId || "none"}
                onValueChange={handleTemplateChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar plantilla (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin plantilla</SelectItem>
                  {templates?.map(template => {
                    const totalItems =
                      Object.keys(template.categories?.materials || {}).length +
                      Object.keys(template.categories?.labor || {}).length +
                      Object.keys(template.categories?.equipment || {}).length;
                    return (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name} - {totalItems} elementos
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Items */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">
                Elementos de la Cotización
              </CardTitle>
              <Button onClick={handleAddItem} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Agregar Elemento
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {formData.items.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No hay elementos. Agrega elementos o selecciona una plantilla.
                </div>
              ) : (
                <>
                  {/* Header */}
                  <div className="grid grid-cols-12 gap-2 text-sm font-medium text-gray-700 pb-2 border-b">
                    <div className="col-span-3">Elemento</div>
                    <div className="col-span-2">Tipo</div>
                    <div className="col-span-2">Cantidad</div>
                    <div className="col-span-1">Unidad</div>
                    <div className="col-span-2">Costo Unit.</div>
                    <div className="col-span-2">Total</div>
                  </div>

                  {/* Items */}
                  {formData.items.map((item, index) => (
                    <div
                      key={item.id}
                      className="grid grid-cols-12 gap-2 items-center"
                    >
                      <div className="col-span-3">
                        <Input
                          value={item.name}
                          onChange={e =>
                            handleUpdateItem(index, { name: e.target.value })
                          }
                          placeholder="Nombre del elemento"
                        />
                      </div>
                      <div className="col-span-2">
                        <Select
                          value={item.type}
                          onValueChange={(
                            value:
                              | "material"
                              | "labor"
                              | "equipment"
                              | "overhead"
                          ) => handleUpdateItem(index, { type: value })}
                        >
                          <SelectTrigger size="sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="material">Material</SelectItem>
                            <SelectItem value="labor">Mano de obra</SelectItem>
                            <SelectItem value="equipment">Equipos</SelectItem>
                            <SelectItem value="overhead">
                              Gastos generales
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-2">
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={e =>
                            handleUpdateItem(index, {
                              quantity: parseFloat(e.target.value) || 0,
                            })
                          }
                          min="0"
                          step="0.01"
                        />
                      </div>
                      <div className="col-span-1">
                        <Input
                          value={item.unit}
                          onChange={e =>
                            handleUpdateItem(index, { unit: e.target.value })
                          }
                          placeholder="m²"
                        />
                      </div>
                      <div className="col-span-2">
                        <Input
                          type="number"
                          value={item.unitCost}
                          onChange={e =>
                            handleUpdateItem(index, {
                              unitCost: parseFloat(e.target.value) || 0,
                            })
                          }
                          min="0"
                          step="0.01"
                        />
                      </div>
                      <div className="col-span-2 flex items-center justify-between">
                        <span className="font-medium">
                          {formatCurrency(item.total)}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveItem(index)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </CardContent>
          </Card>

          {/* Profit Margin and Totals */}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="profitMargin">Margen de Ganancia (%)</Label>
                <Input
                  id="profitMargin"
                  type="number"
                  value={formData.profitMargin}
                  onChange={e =>
                    handleProfitMarginChange(parseFloat(e.target.value) || 0)
                  }
                  min="0"
                  max="100"
                  step="0.1"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notas</Label>
                <Textarea
                  id="notes"
                  value={formData.notes || ""}
                  onChange={e =>
                    setFormData(prev => ({ ...prev, notes: e.target.value }))
                  }
                  placeholder="Notas adicionales..."
                  rows={3}
                />
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Resumen de Costos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-medium">
                    {formatCurrency(calculation.subtotal)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">
                    Margen ({formData.profitMargin}%):
                  </span>
                  <span className="font-medium">
                    {formatCurrency(calculation.total - calculation.subtotal)}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg">
                  <span className="font-semibold">Total:</span>
                  <span className="font-bold text-primary">
                    {formatCurrency(calculation.total)}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              {isEditing ? "Actualizar Cotización" : "Crear Cotización"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
