'use client';

import { useState, useEffect } from 'react';
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
  AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTranslations } from '@/lib/i18n';
import { formatCurrency } from '@/lib/finance';
import { SavedEstimation } from '@/lib/api/simulator';
import { api } from '@/lib/api';
import { downloadEstimatePDF } from '@/lib/pdf-generator';
import { toast } from 'sonner';

interface CostEstimatesListProps {
  onNewEstimate: () => void;
  onEditEstimate?: (estimate: SavedEstimation) => void;
}

export function CostEstimatesList({ onNewEstimate, onEditEstimate }: CostEstimatesListProps) {
  const t = useTranslations('es');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [estimates, setEstimates] = useState<SavedEstimation[]>([]);
  
  // Cargar estimaciones desde la API (como no existe getSavedEstimations, usaremos clients como fallback)
  useEffect(() => {
    const loadEstimates = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Por ahora, como no hay API específica para obtener estimaciones guardadas,
        // mostraremos un array vacío o podrías implementar esta funcionalidad
        setEstimates([]); // TODO: Implementar API getSavedEstimations
        
      } catch (err) {
        console.error('Error loading estimates:', err);
        const errorMessage = err instanceof Error ? err.message : 'Error al cargar estimaciones';
        setError(errorMessage);
        toast.error('Error cargando estimaciones: ' + errorMessage);
      } finally {
        setLoading(false);
      }
    };

    loadEstimates();
  }, []);

  // Filter estimates based on search
  const filteredEstimates = estimates.filter(estimate =>
    estimate.project_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    estimate.notes?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getClientName = (clientName?: string) => {
    return clientName || 'Sin cliente';
  };

  const handleDuplicate = async (estimate: SavedEstimation) => {
    try {
      // TODO: Implementar API para duplicar estimaciones
      toast.success('Funcionalidad de duplicación pendiente de implementación');
    } catch (error) {
      toast.error('Error al duplicar cotización');
    }
  };

  const handleDelete = async (estimate: SavedEstimation) => {
    if (window.confirm('¿Estás seguro de eliminar esta cotización?')) {
      try {
        // TODO: Implementar API para eliminar estimaciones
        toast.success('Funcionalidad de eliminación pendiente de implementación');
      } catch (error) {
        toast.error('Error al eliminar cotización');
      }
    }
  };

  const handleConvertToProject = async (estimate: SavedEstimation) => {
    try {
      // TODO: Implementar conversión de estimación a proyecto usando API projects
      toast.success('Funcionalidad de conversión pendiente de implementación');
    } catch (error) {
      toast.error('Error al convertir a proyecto');
    }
  };

  const handleExportToPDF = async (estimate: SavedEstimation) => {
    try {
      
      const businessInfo = {
        name: 'Constructora & Soldadura HYR',
        contact: 'Santiago Hurtado',
        email: 'contacto@hyrsoldadura.com',
        phone: '+57 300 123 4567',
        address: 'Bogotá, Colombia'
      };

      // TODO: Actualizar downloadEstimatePDF para usar SavedEstimation
      downloadEstimatePDF({
        estimate: estimate.estimation_data,
        client: { name: estimate.client_name },
        businessInfo
      });
      
      toast.success('PDF generado exitosamente');
    } catch (error) {
      toast.error('Error al generar PDF');
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
          <p className="text-red-600 text-sm mb-2">Error cargando estimaciones</p>
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
            onChange={(e) => setSearchTerm(e.target.value)}
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
              Crea tu primera cotización usando una plantilla o elementos personalizados
            </p>
            <Button onClick={onNewEstimate}>
              <Plus className="h-4 w-4 mr-2" />
              {t.simulator.newEstimate}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredEstimates.map((estimate) => (
            <Card key={estimate.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg font-semibold truncate">
                    {estimate.project_name}
                  </CardTitle>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                        </svg>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={() => onEditEstimate?.(estimate)}>
                        <Edit className="h-4 w-4 mr-2" />
                        {t.simulator.editEstimate}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDuplicate(estimate)}>
                        <Copy className="h-4 w-4 mr-2" />
                        {t.simulator.duplicateEstimate}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleConvertToProject(estimate)}>
                        <FolderOpen className="h-4 w-4 mr-2" />
                        {t.simulator.convertToProject}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleExportToPDF(estimate)}>
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
                  <span className="font-medium">{getClientName(estimate.client_name)}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Total:</span>
                  <span className="text-lg font-bold text-primary">
                    {formatCurrency(estimate.estimation_data.cost_breakdown.total)}
                  </span>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Elementos:</span>
                  <Badge variant="secondary">{estimate.estimation_data.items_detail.length}</Badge>
                </div>
                
                <div className="text-xs text-gray-500">
                  Creado: {new Date(estimate.created_at).toLocaleDateString('es-CO')}
                </div>
                
                {estimate.notes && (
                  <p className="text-sm text-gray-600 truncate" title={estimate.notes}>
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