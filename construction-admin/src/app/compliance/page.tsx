"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Users, 
  FileSpreadsheet, 
  UserCheck,
  CheckCircle,
  AlertCircle,
  Clock,
  Plus,
  Download,
  Eye
} from 'lucide-react';

interface ComplianceStats {
  invoices: {
    total: number;
    today: number;
    accepted_percentage: number;
  };
  payroll: {
    current_period: string;
    total_employees: number;
    last_generated: string;
  };
  pila: {
    last_period: string;
    status: string;
    total_contributions: number;
  };
  contractors: {
    total: number;
    document_support_count: number;
  };
}

export default function CompliancePage() {
  const router = useRouter();
  const [stats, setStats] = useState<ComplianceStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simular carga de estadísticas de compliance
    const loadStats = async () => {
      try {
        // En implementación real, cargar desde APIs
        const mockStats: ComplianceStats = {
          invoices: {
            total: 12,
            today: 3,
            accepted_percentage: 91.7
          },
          payroll: {
            current_period: "2025-09",
            total_employees: 7,
            last_generated: "2025-09-01"
          },
          pila: {
            last_period: "2025-08",
            status: "GENERADO",
            total_contributions: 2845623
          },
          contractors: {
            total: 8,
            document_support_count: 15
          }
        };
        
        setTimeout(() => {
          setStats(mockStats);
          setLoading(false);
        }, 1000);
        
      } catch (error) {
        console.error('Error cargando estadísticas:', error);
        setLoading(false);
      }
    };

    loadStats();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status.toUpperCase()) {
      case 'ACEPTADO_SIMULADO':
      case 'ACEPTADO':
        return <Badge className="bg-green-100 text-green-800">Aceptado</Badge>;
      case 'GENERADO':
        return <Badge className="bg-blue-100 text-blue-800">Generado</Badge>;
      case 'ENVIADO':
        return <Badge className="bg-yellow-100 text-yellow-800">Enviado</Badge>;
      case 'RECHAZADO_SIMULADO':
      case 'RECHAZADO':
        return <Badge className="bg-red-100 text-red-800">Rechazado</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">Pendiente</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-3xl font-bold mb-6">Dashboard de Cumplimiento</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="h-20 bg-gray-200 rounded-t"></CardHeader>
              <CardContent className="h-32 bg-gray-100 rounded-b"></CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Dashboard de Cumplimiento</h1>
        <div className="text-sm text-gray-500">
          Actualizado: {new Date().toLocaleDateString('es-CO')}
        </div>
      </div>

      {/* Tarjetas de estadísticas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Facturas Electrónicas */}
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Facturas Electrónicas</CardTitle>
            <FileText className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.invoices.total || 0}</div>
            <p className="text-xs text-gray-600">
              {stats?.invoices.today || 0} emitidas hoy
            </p>
            <div className="flex items-center mt-2">
              <CheckCircle className="h-3 w-3 text-green-500 mr-1" />
              <span className="text-xs text-green-600">
                {stats?.invoices.accepted_percentage || 0}% aceptadas
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Nómina Electrónica */}
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Nómina Electrónica</CardTitle>
            <Users className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.payroll.total_employees || 0}</div>
            <p className="text-xs text-gray-600">
              Período: {stats?.payroll.current_period}
            </p>
            <div className="flex items-center mt-2">
              <Clock className="h-3 w-3 text-blue-500 mr-1" />
              <span className="text-xs text-blue-600">
                Generada: {stats?.payroll.last_generated}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* PILA */}
        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">PILA</CardTitle>
            <FileSpreadsheet className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${(stats?.pila.total_contributions || 0).toLocaleString()}
            </div>
            <p className="text-xs text-gray-600">
              Período: {stats?.pila.last_period}
            </p>
            <div className="mt-2">
              {getStatusBadge(stats?.pila.status || 'PENDIENTE')}
            </div>
          </CardContent>
        </Card>

        {/* Contratistas */}
        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Contratistas</CardTitle>
            <UserCheck className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.contractors.total || 0}</div>
            <p className="text-xs text-gray-600">
              {stats?.contractors.document_support_count || 0} doc. soporte
            </p>
            <div className="flex items-center mt-2">
              <AlertCircle className="h-3 w-3 text-orange-500 mr-1" />
              <span className="text-xs text-orange-600">
                3 no obligados
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Acciones rápidas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Acciones Rápidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            
            <Button 
              className="flex items-center space-x-2 h-auto py-4" 
              variant="outline"
              onClick={() => router.push('/invoicing/new')}
            >
              <Plus className="h-4 w-4" />
              <div className="text-left">
                <div className="font-medium">Crear Factura</div>
                <div className="text-xs text-gray-500">Nueva factura electrónica</div>
              </div>
            </Button>

            <Button 
              className="flex items-center space-x-2 h-auto py-4" 
              variant="outline"
              onClick={() => router.push('/payroll/generate')}
            >
              <FileSpreadsheet className="h-4 w-4" />
              <div className="text-left">
                <div className="font-medium">Generar Nómina</div>
                <div className="text-xs text-gray-500">Nómina electrónica</div>
              </div>
            </Button>

            <Button 
              className="flex items-center space-x-2 h-auto py-4" 
              variant="outline"
              onClick={() => router.push('/pila')}
            >
              <Download className="h-4 w-4" />
              <div className="text-left">
                <div className="font-medium">Exportar PILA</div>
                <div className="text-xs text-gray-500">Archivo CSV</div>
              </div>
            </Button>

            <Button 
              className="flex items-center space-x-2 h-auto py-4" 
              variant="outline"
              onClick={() => router.push('/contractors')}
            >
              <UserCheck className="h-4 w-4" />
              <div className="text-left">
                <div className="font-medium">Documento Soporte</div>
                <div className="text-xs text-gray-500">Para contratistas</div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Resumen de estado DIAN */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <FileText className="h-5 w-5 mr-2 text-blue-500" />
              Estado Facturas DIAN
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm">Aceptadas</span>
              <div className="flex items-center">
                <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                <span className="font-medium">11</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Pendientes</span>
              <div className="flex items-center">
                <Clock className="h-4 w-4 text-yellow-500 mr-1" />
                <span className="font-medium">1</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Rechazadas</span>
              <div className="flex items-center">
                <AlertCircle className="h-4 w-4 text-red-500 mr-1" />
                <span className="font-medium">0</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <Users className="h-5 w-5 mr-2 text-green-500" />
              Próximas Obligaciones
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm">Nómina Octubre</span>
              <Badge variant="outline">5 días</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">PILA Septiembre</span>
              <Badge variant="outline">12 días</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Declaración IVA</span>
              <Badge variant="outline">18 días</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Botón para ir a configuración */}
      <Card className="border-2 border-dashed border-gray-200">
        <CardContent className="flex items-center justify-between p-6">
          <div>
            <h3 className="text-lg font-medium">Configuración del Sistema</h3>
            <p className="text-sm text-gray-600">
              Configure datos empresariales y tablas tributarias
            </p>
          </div>
          <Button onClick={() => router.push('/settings')}>
            <Eye className="h-4 w-4 mr-2" />
            Configurar
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}