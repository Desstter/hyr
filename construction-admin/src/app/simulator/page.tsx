'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  Calculator, 
  Plus, 
  Trash2, 
  Download, 
  Save,
  AlertTriangle,
  TrendingUp,
  Building,
  Zap
} from 'lucide-react';
import { simulatorService } from '@/lib/api/simulator';
import { api } from '@/lib/api';
import type { 
  CostTemplate, 
  EstimationItem, 
  CostEstimation,
  ProjectPreset 
} from '@/lib/api/simulator';
import type { Client } from '@/lib/api';

export default function CostSimulatorPage() {
  // Estados principales
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [templates, setTemplates] = useState<CostTemplate[]>([]);
  const [presets, setPresets] = useState<ProjectPreset[]>([]);
  const [items, setItems] = useState<EstimationItem[]>([]);
  const [estimation, setEstimation] = useState<CostEstimation | null>(null);
  const [projectDuration, setProjectDuration] = useState<number>(30);
  const [applyBenefits, setApplyBenefits] = useState<boolean>(true);
  const [selectedClient, setSelectedClient] = useState<string>('none');
  const [clients, setClients] = useState<Client[]>([]);
  
  // Estados de carga y error
  const [loading, setLoading] = useState(false);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cargar templates y clientes al montar el componente
  useEffect(() => {
    async function loadTemplates() {
      try {
        const [templatesData, clientsData] = await Promise.all([
          simulatorService.getTemplates(),
          api.clients.getAll()
        ]);
        setTemplates(templatesData);
        setClients(clientsData);
      } catch {
        setError('Error al cargar templates de costos');
      } finally {
        setTemplatesLoading(false);
      }
    }

    loadTemplates();
  }, []);

  // Cargar presets cuando cambie el template
  useEffect(() => {
    if (!selectedTemplate) return;

    async function loadPresets() {
      try {
        const presetsData = await simulatorService.getPresets(selectedTemplate);
        setPresets(presetsData);
      } catch (err) {
        console.error('Error cargando presets:', err);
      }
    }

    loadPresets();
  }, [selectedTemplate]);

  // Agregar nuevo item
  const addItem = () => {
    setItems([...items, {
      category: 'materials',
      subcategory: '',
      quantity: 1
    }]);
  };

  // Remover item
  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  // Actualizar item
  const updateItem = (index: number, field: keyof EstimationItem, value: string | number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  // Aplicar preset
  const applyPreset = (preset: ProjectPreset) => {
    setItems(preset.items);
  };

  // Calcular estimación
  const calculateCost = async () => {
    if (!selectedTemplate || items.length === 0) {
      setError('Seleccione un template y agregue al menos un item');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const result = await simulatorService.calculateEstimation({
        template_type: selectedTemplate,
        items,
        project_duration_days: projectDuration,
        apply_benefits: applyBenefits
      });
      
      setEstimation(result);
    } catch {
      setError('Error al calcular estimación');
    } finally {
      setLoading(false);
    }
  };

  // Obtener categorías disponibles del template seleccionado
  const getAvailableSubcategories = (category: string) => {
    const template = templates.find(t => t.id === selectedTemplate);
    if (!template) return [];
    
    return Object.entries(template.categories[category as keyof typeof template.categories] || {});
  };

  // Formatear moneda
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (templatesLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando simulador de costos...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Calculator className="h-8 w-8 text-blue-600" />
            Simulador de Costos
          </h1>
          <p className="text-gray-600 mt-1">
            Estimaciones precisas para proyectos de construcción y soldadura
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Save className="h-4 w-4 mr-2" />
            Guardar
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-700">
            {error}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Panel de Configuración */}
        <div className="lg:col-span-2 space-y-6">
          {/* Selección de Template */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Configuración del Proyecto
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="template">Tipo de Proyecto</Label>
                  <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar template" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="client">Cliente</Label>
                  <Select value={selectedClient} onValueChange={setSelectedClient}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar cliente (opcional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin cliente asignado</SelectItem>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="duration">Duración (días)</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={projectDuration}
                    onChange={(e) => setProjectDuration(Number(e.target.value))}
                    min="1"
                    max="365"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="benefits"
                  checked={applyBenefits}
                  onChange={(e) => setApplyBenefits(e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="benefits">
                  Aplicar factor prestacional colombiano (1.58x)
                </Label>
              </div>

              {/* Presets */}
              {presets.length > 0 && (
                <div>
                  <Label>Configuraciones predefinidas</Label>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {presets.map((preset, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        onClick={() => applyPreset(preset)}
                      >
                        {preset.name}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Items de Estimación */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Items del Proyecto
                </span>
                <Button onClick={addItem} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar Item
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {items.map((item, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-3">
                      <Label>Categoría</Label>
                      <Select
                        value={item.category}
                        onValueChange={(value: 'materials' | 'labor' | 'equipment') => 
                          updateItem(index, 'category', value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="materials">Materiales</SelectItem>
                          <SelectItem value="labor">Mano de Obra</SelectItem>
                          <SelectItem value="equipment">Equipos</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="col-span-3">
                      <Label>Subcategoría</Label>
                      <Select
                        value={item.subcategory}
                        onValueChange={(value) => updateItem(index, 'subcategory', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar" />
                        </SelectTrigger>
                        <SelectContent>
                          {getAvailableSubcategories(item.category).map(([key, value]) => (
                            <SelectItem key={key} value={key}>
                              {value.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="col-span-2">
                      <Label>Cantidad</Label>
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))}
                        min="0"
                        step="0.1"
                      />
                    </div>
                    
                    <div className="col-span-3">
                      {item.name && (
                        <div className="text-sm text-gray-600">
                          {item.name} ({item.unit})
                        </div>
                      )}
                      {item.cost_per_unit && (
                        <div className="text-sm font-medium">
                          {formatCurrency(item.cost_per_unit)}/{item.unit}
                        </div>
                      )}
                    </div>
                    
                    <div className="col-span-1">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => removeItem(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                
                {items.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Zap className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No hay items agregados</p>
                    <p className="text-sm">Haga clic en &quot;Agregar Item&quot; para comenzar</p>
                  </div>
                )}
              </div>
              
              {items.length > 0 && (
                <div className="mt-6">
                  <Button 
                    onClick={calculateCost} 
                    disabled={loading}
                    className="w-full"
                  >
                    {loading ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Calculando...
                      </div>
                    ) : (
                      <>
                        <Calculator className="h-4 w-4 mr-2" />
                        Calcular Estimación
                      </>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Panel de Resultados */}
        <div className="space-y-6">
          {estimation ? (
            <>
              {/* Resumen de Costos */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Estimación Total
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center mb-4">
                    <div className="text-3xl font-bold text-blue-600">
                      {formatCurrency(estimation.cost_breakdown.total)}
                    </div>
                    <div className="text-sm text-gray-600">
                      Costo total del proyecto
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Costo por día:</span>
                      <span className="font-medium">
                        {formatCurrency(estimation.summary.cost_per_day)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Duración:</span>
                      <span className="font-medium">{estimation.project_info.duration_days} días</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Items:</span>
                      <span className="font-medium">{estimation.project_info.items_count}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Desglose por Categorías */}
              <Card>
                <CardHeader>
                  <CardTitle>Desglose de Costos</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span>Materiales</span>
                    <div className="text-right">
                      <div className="font-medium">
                        {formatCurrency(estimation.cost_breakdown.materials)}
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {estimation.summary.materials_percentage}%
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span>Mano de Obra</span>
                    <div className="text-right">
                      <div className="font-medium">
                        {formatCurrency(estimation.cost_breakdown.labor)}
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {estimation.summary.labor_percentage}%
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span>Equipos</span>
                    <div className="text-right">
                      <div className="font-medium">
                        {formatCurrency(estimation.cost_breakdown.equipment)}
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {estimation.summary.equipment_percentage}%
                      </Badge>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Gastos Generales</span>
                    <span>{formatCurrency(estimation.cost_breakdown.overhead)}</span>
                  </div>
                  
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Utilidad</span>
                    <span>{formatCurrency(estimation.cost_breakdown.profit)}</span>
                  </div>
                  
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Contingencias</span>
                    <span>{formatCurrency(estimation.cost_breakdown.contingency)}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Factores de Cálculo */}
              <Card>
                <CardHeader>
                  <CardTitle>Factores Aplicados</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Factor Prestacional:</span>
                    <span>{estimation.calculation_factors.labor_benefit_factor}x</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Gastos Generales:</span>
                    <span>{(estimation.calculation_factors.overhead_percentage * 100)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Utilidad:</span>
                    <span>{(estimation.calculation_factors.profit_margin * 100)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Contingencias:</span>
                    <span>{(estimation.calculation_factors.contingency * 100)}%</span>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <Calculator className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-500">
                  Configure su proyecto y haga clic en &quot;Calcular Estimación&quot;
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}