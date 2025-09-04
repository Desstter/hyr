"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/use-toast';
import { 
  ArrowLeft,
  User,
  Mail,
  Phone,
  MapPin,
  FileText,
  DollarSign,
  Calendar,
  Edit,
  Plus,
  Loader2,
  CheckCircle,
  AlertCircle,
  Download
} from 'lucide-react';

interface Contractor {
  id: string;
  name: string;
  document_type: string;
  document_number: string;
  email?: string;
  phone?: string;
  address?: string;
  obligated_to_invoice: boolean;
  document_support_count: number;
  total_payments: number;
  created_at: string;
}

interface DocumentSupport {
  id: string;
  ds_number: string;
  concept: string;
  base_amount: number;
  total_amount: number;
  dian_status: string;
  created_at: string;
}

interface ContractorDetail {
  contractor: Contractor;
  recent_documents: DocumentSupport[];
}

export default function ContractorDetailPage() {
  const router = useRouter();
  const params = useParams();
  const contractorId = params.id as string;
  
  const [contractorData, setContractorData] = useState<ContractorDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (contractorId) {
      loadContractorDetail();
    }
  }, [contractorId]);

  const loadContractorDetail = async () => {
    try {
      const response = await fetch(`http://localhost:3001/api/contractors/${contractorId}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          setError('Contratista no encontrado');
          return;
        }
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setContractorData(data.data);
      } else {
        setError(data.error || 'Error cargando datos del contratista');
      }
    } catch (error) {
      console.error('Error loading contractor detail:', error);
      setError('No se pudo conectar con el servidor');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'aceptado':
      case 'accepted':
        return <Badge className="bg-green-100 text-green-800">Aceptado</Badge>;
      case 'rechazado':
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800">Rechazado</Badge>;
      case 'pendiente':
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Pendiente</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Cargando detalle del contratista...</span>
      </div>
    );
  }

  if (error || !contractorData) {
    return (
      <div className="p-6">
        <div className="flex items-center mb-4">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
        </div>
        <Card>
          <CardContent className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <p className="text-red-600 font-medium">{error}</p>
            <Button onClick={() => router.push('/contractors')} className="mt-4">
              Volver a Contratistas
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { contractor, recent_documents } = contractorData;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{contractor.name}</h1>
            <p className="text-gray-600">
              {contractor.document_type} {contractor.document_number}
            </p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline">
            <Edit className="h-4 w-4 mr-2" />
            Editar
          </Button>
          {!contractor.obligated_to_invoice && (
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Doc. Soporte
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Información del Contratista */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <User className="h-5 w-5 mr-2" />
              Información General
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Estado Fiscal:</span>
                <Badge 
                  variant={contractor.obligated_to_invoice ? "default" : "secondary"}
                >
                  {contractor.obligated_to_invoice ? "Factura" : "No Factura"}
                </Badge>
              </div>
              
              {contractor.email && (
                <div className="flex items-center space-x-2">
                  <Mail className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">{contractor.email}</span>
                </div>
              )}
              
              {contractor.phone && (
                <div className="flex items-center space-x-2">
                  <Phone className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">{contractor.phone}</span>
                </div>
              )}
              
              {contractor.address && (
                <div className="flex items-center space-x-2">
                  <MapPin className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">{contractor.address}</span>
                </div>
              )}
              
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span className="text-sm">
                  Registrado: {formatDate(contractor.created_at)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Estadísticas */}
        <Card>
          <CardHeader>
            <CardTitle>Resumen</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <FileText className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-blue-600">
                  {contractor.document_support_count}
                </p>
                <p className="text-sm text-gray-600">Documentos Soporte</p>
              </div>
              
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <DollarSign className="h-8 w-8 text-green-500 mx-auto mb-2" />
                <p className="text-lg font-bold text-green-600">
                  {formatCurrency(contractor.total_payments)}
                </p>
                <p className="text-sm text-gray-600">Total Pagos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Acciones Rápidas */}
        <Card>
          <CardHeader>
            <CardTitle>Acciones</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!contractor.obligated_to_invoice ? (
              <Button className="w-full" variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Crear Documento Soporte
              </Button>
            ) : (
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  Este contratista está obligado a facturar electrónicamente.
                  No requiere documentos soporte.
                </p>
              </div>
            )}
            
            <Button variant="outline" className="w-full">
              <Edit className="h-4 w-4 mr-2" />
              Editar Información
            </Button>
            
            <Button variant="outline" className="w-full">
              <Download className="h-4 w-4 mr-2" />
              Exportar Historial
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Historial de Documentos Soporte */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Documentos Soporte Recientes</span>
            <Badge variant="secondary">
              {recent_documents.length} documento(s)
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recent_documents.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No hay documentos soporte registrados</p>
              {!contractor.obligated_to_invoice && (
                <Button className="mt-4">
                  <Plus className="h-4 w-4 mr-2" />
                  Crear Primer Documento
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {recent_documents.map((document) => (
                <div key={document.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="font-medium">{document.ds_number}</span>
                      {getStatusBadge(document.dian_status)}
                    </div>
                    <p className="text-sm text-gray-600 mb-1">{document.concept}</p>
                    <p className="text-xs text-gray-500">
                      {formatDate(document.created_at)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">
                      {formatCurrency(document.total_amount)}
                    </p>
                    <p className="text-sm text-gray-500">
                      Base: {formatCurrency(document.base_amount)}
                    </p>
                  </div>
                </div>
              ))}
              
              {recent_documents.length >= 10 && (
                <div className="text-center pt-4">
                  <Button variant="outline">
                    Ver Todos los Documentos
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Información Legal */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <h4 className="font-medium text-blue-800 mb-2">ℹ️ Información sobre Documentos Soporte</h4>
          <ul className="text-blue-700 text-sm space-y-1">
            <li>• Los documentos soporte son obligatorios para compras a no obligados a facturar</li>
            <li>• Se aplican automáticamente las retenciones según el tipo de servicio</li>
            <li>• Para construcción se aplica seguridad social sobre el 40% si supera 4 UVT</li>
            <li>• Los documentos se envían automáticamente a la DIAN para validación</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}