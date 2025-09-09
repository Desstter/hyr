"use client";

import { useState, useEffect } from "react";
import {
  FileText,
  Star,
  Plus,
  Layers,
  Wrench,
  Home,
  Cog,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslations } from "@/lib/i18n";
import { getTemplates, CostTemplate } from "@/lib/api/simulator";
import { formatCurrency } from "@/lib/finance";
import { toast } from "sonner";

interface CostTemplatesListProps {
  onUseTemplate: (template?: CostTemplate) => void;
}

const categoryIcons = {
  structural_welding: Wrench,
  residential_construction: Home,
  industrial_repair: Cog,
  custom_fabrication: Layers,
};

export function CostTemplatesList({ onUseTemplate }: CostTemplatesListProps) {
  const t = useTranslations("es");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [templates, setTemplates] = useState<CostTemplate[]>([]);

  // Cargar templates desde la API
  useEffect(() => {
    const loadTemplates = async () => {
      try {
        setLoading(true);
        setError(null);
        const templatesData = await getTemplates();
        setTemplates(templatesData);
      } catch (err) {
        console.error("Error loading cost templates:", err);
        const errorMessage =
          err instanceof Error ? err.message : "Error al cargar templates";
        setError(errorMessage);
        toast.error("Error cargando templates: " + errorMessage);
      } finally {
        setLoading(false);
      }
    };

    loadTemplates();
  }, []);

  // Group templates by category (necesitamos mapear a las categorías esperadas)
  const templatesByCategory = templates.reduce(
    (acc, template) => {
      // Mapear los tipos de template a categorías para la UI
      let category = "custom_fabrication"; // default

      if (
        template.name.toLowerCase().includes("house") ||
        template.name.toLowerCase().includes("casa")
      ) {
        category = "residential_construction";
      } else if (
        template.name.toLowerCase().includes("weld") ||
        template.name.toLowerCase().includes("soldad")
      ) {
        category = "structural_welding";
      } else if (
        template.name.toLowerCase().includes("industrial") ||
        template.name.toLowerCase().includes("repair")
      ) {
        category = "industrial_repair";
      }

      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(template);
      return acc;
    },
    {} as Record<string, CostTemplate[]>
  );

  const _getEstimatedTotal = (_template: CostTemplate) => {
    // Calculate estimated total based on template categories with default quantities
    let total = 0;

    // Sumar todos los items de materiales, mano de obra y equipos
    Object.values(_template.categories.materials).forEach(item => {
      total += item.cost_per_unit * 1; // cantidad por defecto = 1
    });
    Object.values(_template.categories.labor).forEach(item => {
      total += item.cost_per_unit * 1;
    });
    Object.values(_template.categories.equipment).forEach(item => {
      total += item.cost_per_unit * 1;
    });

    return total;
  };

  const _getItemTypeSummary = (_template: CostTemplate) => {
    const materialsCount = Object.keys(_template.categories.materials).length;
    const laborCount = Object.keys(_template.categories.labor).length;
    const equipmentCount = Object.keys(_template.categories.equipment).length;

    const parts = [];
    if (materialsCount > 0) parts.push(`${materialsCount} Materiales`);
    if (laborCount > 0) parts.push(`${laborCount} Mano de obra`);
    if (equipmentCount > 0) parts.push(`${equipmentCount} Equipos`);

    return parts.join(", ") || "Sin items";
  };

  // Estados de loading y error
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-3 text-muted-foreground">
          Cargando plantillas de costos...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-3" />
          <p className="text-red-600 text-sm mb-2">Error cargando plantillas</p>
          <p className="text-gray-500 text-xs">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Plantillas de Costos</h2>
          <p className="text-gray-600">
            Usa plantillas predefinidas para crear cotizaciones rápidamente
          </p>
        </div>
        <Button variant="outline" onClick={() => onUseTemplate()}>
          <Plus className="h-4 w-4 mr-2" />
          Crear desde Cero
        </Button>
      </div>

      {/* Templates by Category */}
      {!templatesByCategory || Object.keys(templatesByCategory).length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {t.simulator.noTemplates}
            </h3>
            <p className="text-gray-500 text-center mb-4">
              Las plantillas predefinidas se cargarán automáticamente
            </p>
            <Button onClick={() => window.location.reload()}>
              Recargar Página
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="all" className="space-y-4">
          <TabsList>
            <TabsTrigger value="all">Todas</TabsTrigger>
            {Object.keys(templatesByCategory).map(category => (
              <TabsTrigger key={category} value={category}>
                {
                  t.simulator.categories[
                    category as keyof typeof t.simulator.categories
                  ]
                }
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {templates.map(template => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onUse={() => onUseTemplate(template)}
                  t={t}
                />
              ))}
            </div>
          </TabsContent>

          {Object.entries(templatesByCategory).map(
            ([category, categoryTemplates]) => (
              <TabsContent
                key={category}
                value={category}
                className="space-y-4"
              >
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {categoryTemplates.map(template => (
                    <TemplateCard
                      key={template.id}
                      template={template}
                      onUse={() => onUseTemplate(template)}
                      t={t}
                    />
                  ))}
                </div>
              </TabsContent>
            )
          )}
        </Tabs>
      )}
    </div>
  );
}

interface TemplateCardProps {
  template: CostTemplate & { 
    category?: string;
    items?: Array<{ type: string; unitCost: number; [key: string]: unknown }>;
    isDefault?: boolean;
    description?: string;
  };
  onUse: () => void;
  t: ReturnType<typeof useTranslations>;
}

function TemplateCard({ template, onUse, t }: TemplateCardProps) {
  const IconComponent = categoryIcons[template.category as keyof typeof categoryIcons] || FileText;
  const estimatedTotal = (template.items || []).reduce(
    (total, item) => total + item.unitCost * 1,
    0
  );

  const getItemTypeSummary = (template: CostTemplate & { items?: Array<{ type: string; [key: string]: unknown }> }) => {
    const typeCounts = (template.items || []).reduce(
      (counts, item) => {
        counts[item.type] = (counts[item.type] || 0) + 1;
        return counts;
      },
      {} as Record<string, number>
    );

    return Object.entries(typeCounts)
      .map(
        ([type, count]) =>
          `${count} ${t.simulator.itemTypes[type as keyof typeof t.simulator.itemTypes]}`
      )
      .slice(0, 2) // Show only first 2 types
      .join(", ");
  };

  return (
    <Card
      className="hover:shadow-md transition-shadow cursor-pointer"
      onClick={onUse}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <IconComponent className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg font-semibold truncate">
              {template.name}
            </CardTitle>
          </div>
          {template.isDefault && (
            <Badge variant="secondary">
              <Star className="h-3 w-3 mr-1" />
              Predefinida
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">
            {
              t.simulator.categories[
                template.category as keyof typeof t.simulator.categories
              ]
            }
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {template.description && (
          <p className="text-sm text-gray-600 line-clamp-2">
            {template.description}
          </p>
        )}

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Elementos:</span>
          <Badge variant="secondary">{(template.items || []).length}</Badge>
        </div>

        <div className="text-sm text-gray-600">
          <span className="block">{getItemTypeSummary(template)}</span>
        </div>

        <div className="flex items-center justify-between pt-2 border-t">
          <span className="text-sm text-gray-600">Estimado:</span>
          <span className="font-bold text-primary">
            {formatCurrency(estimatedTotal)}
          </span>
        </div>

        <Button className="w-full" size="sm">
          <FileText className="h-4 w-4 mr-2" />
          Usar Plantilla
        </Button>
      </CardContent>
    </Card>
  );
}
