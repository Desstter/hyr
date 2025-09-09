"use client";

import { useState } from "react";
import {
  FileText,
  Edit,
  Trash2,
  Copy,
  Download,
  FolderOpen,
  Search,
  Filter,
  Plus,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTranslations } from "@/lib/i18n";
import { formatCurrency } from "@/lib/finance";
import {
  SavedEstimation,
  CostEstimation,
  useSavedEstimations,
  duplicateEstimation,
  deleteEstimation,
  convertEstimationToProject,
} from "@/lib/api/simulator";
import { downloadAdvancedPDF, CostEstimate, CostEstimateItem } from "@/lib/pdf-generator";

import { toast } from "sonner";

interface CostEstimatesListProps {
  onNewEstimate: () => void;
  onEditEstimate?: (estimate: SavedEstimation) => void;
}

export function CostEstimatesList({
  onNewEstimate,
  onEditEstimate,
}: CostEstimatesListProps) {
  const t = useTranslations("es");
  const [searchTerm, setSearchTerm] = useState("");

  // Usar el hook personalizado para cargar estimaciones
  const { estimations, loading, error, refetch } = useSavedEstimations();

  // Filter estimates based on search
  const filteredEstimates = estimations.filter(
    estimate =>
      estimate.project_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      estimate.notes?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getClientName = (clientName?: string) => {
    return clientName || "Sin cliente";
  };

  const handleDuplicate = async (estimate: SavedEstimation) => {
    try {
      await duplicateEstimation(estimate.id);
      toast.success("Cotización duplicada exitosamente");
      refetch(); // Recargar la lista
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Error al duplicar cotización";
      toast.error(errorMessage);
    }
  };

  const handleDelete = async (estimate: SavedEstimation) => {
    if (window.confirm("¿Estás seguro de eliminar esta cotización?")) {
      try {
        await deleteEstimation(estimate.id);
        toast.success("Cotización eliminada exitosamente");
        refetch(); // Recargar la lista
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Error al eliminar cotización";
        toast.error(errorMessage);
      }
    }
  };

  const handleConvertToProject = async (estimate: SavedEstimation) => {
    try {
      // Por simplicidad, usar datos básicos para la conversión
      // En una implementación real, se podría abrir un modal para completar más detalles
      const projectData = {
        estimation_id: estimate.id,
        project_name: estimate.project_name,
        client_id: "default-client-id", // TODO: Integrar con selección de cliente real
        description: `Proyecto creado desde estimación: ${estimate.project_name}`,
        start_date: new Date().toISOString().split("T")[0],
        estimated_end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
      };

      await convertEstimationToProject(projectData);
      toast.success("Proyecto creado exitosamente desde estimación");
      refetch(); // Recargar la lista para mostrar el estado actualizado
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Error al convertir a proyecto";
      toast.error(errorMessage);
    }
  };

  const handleExportToPDF = async (estimate: SavedEstimation) => {
    try {
      const businessInfo = {
        name: "Constructora & Soldadura HYR",
        contact: "Santiago Hurtado",
        email: "contacto@hyrsoldadura.com",
        phone: "+57 300 123 4567",
        address: "Bogotá, Colombia",
      };

      // Transformar CostEstimation a CostEstimate para el PDF
      const estimationData: CostEstimation = estimate.estimation_data;
      const transformedEstimate: CostEstimate = {
        id: estimate.id,
        name: estimate.project_name,
        items: estimationData.items_detail.map((item): CostEstimateItem => ({
          id: `${item.category}-${item.subcategory}`,
          name: item.name || item.subcategory,
          type: item.category === "materials" ? "material" : 
                item.category === "labor" ? "labor" :
                item.category === "equipment" ? "equipment" : "overhead",
          quantity: item.quantity,
          unit: item.unit || "unidad",
          unitCost: item.cost_per_unit || 0,
          total: item.total_cost || 0,
          description: `${item.category} - ${item.subcategory}`,
        })),
        subtotal: estimationData.cost_breakdown.subtotal,
        profitMargin: estimationData.calculation_factors.profit_margin,
        total: estimationData.cost_breakdown.total,
        currency: "COP",
        createdAt: estimate.created_at,
        updatedAt: estimate.created_at,
      };

      // Usar los datos transformados con PDF profesional
      await downloadAdvancedPDF({
        estimate: transformedEstimate,
        client: { 
          id: `temp-client-${estimate.id}`,
          name: estimate.client_name || "Sin cliente",
          created_at: estimate.created_at,
        },
        businessInfo,
      });

      toast.success("PDF profesional generado exitosamente");
    } catch (error) {
      console.error("Error generando PDF:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Error al generar PDF profesional";
      toast.error(errorMessage);
    }
  };

  // Estados de loading y error
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-3 text-muted-foreground">
          Cargando estimaciones...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-3" />
          <p className="text-red-600 text-sm mb-2">
            Error cargando estimaciones
          </p>
          <p className="text-gray-500 text-xs">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Buscar cotizaciones..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline" size="sm">
          <Filter className="h-4 w-4 mr-2" />
          Filtros
        </Button>
      </div>

      {/* Estimates List */}
      {!filteredEstimates || filteredEstimates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {t.simulator.noEstimates}
            </h3>
            <p className="text-gray-500 text-center mb-4">
              Crea tu primera cotización usando una plantilla o elementos
              personalizados
            </p>
            <Button onClick={onNewEstimate}>
              <Plus className="h-4 w-4 mr-2" />
              {t.simulator.newEstimate}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredEstimates.map(estimate => (
            <Card
              key={estimate.id}
              className="hover:shadow-md transition-shadow"
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg font-semibold truncate">
                    {estimate.project_name}
                  </CardTitle>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <svg
                          className="h-4 w-4"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                        </svg>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem
                        onClick={() => onEditEstimate?.(estimate)}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        {t.simulator.editEstimate}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDuplicate(estimate)}
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        {t.simulator.duplicateEstimate}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleConvertToProject(estimate)}
                      >
                        <FolderOpen className="h-4 w-4 mr-2" />
                        {t.simulator.convertToProject}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleExportToPDF(estimate)}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        {t.simulator.exportToPDF}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDelete(estimate)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        {t.simulator.deleteEstimate}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>Cliente:</span>
                  <span className="font-medium">
                    {getClientName(estimate.client_name)}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Total:</span>
                  <span className="text-lg font-bold text-primary">
                    {formatCurrency(
                      estimate.estimation_data.cost_breakdown.total
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Elementos:</span>
                  <Badge variant="secondary">
                    {estimate.estimation_data.items_detail.length}
                  </Badge>
                </div>

                <div className="text-xs text-gray-500">
                  Creado:{" "}
                  {new Date(estimate.created_at).toLocaleDateString("es-CO")}
                </div>

                {estimate.notes && (
                  <p
                    className="text-sm text-gray-600 truncate"
                    title={estimate.notes}
                  >
                    {estimate.notes}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
