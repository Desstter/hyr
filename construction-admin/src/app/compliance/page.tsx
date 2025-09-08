"use client";

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
  Eye,
  RefreshCw
} from 'lucide-react';
import { 
  useComplianceDashboard, 
  useUpcomingObligations, 
  getDianStatusBadge, 
  getPriorityBadge, 
  formatCurrency, 
  formatPercentage 
} from '@/lib/api/compliance';


export default function CompliancePage() {
  const router = useRouter();
  const { stats, loading, error, refetch } = useComplianceDashboard(30000); // Refresh every 30 seconds
  const { obligations, loading: obligationsLoading } = useUpcomingObligations();

  const getStatusBadgeComponent = (status: string) => {
    const badge = getDianStatusBadge(status);
    const colorClass = {
      'green': 'bg-green-100 text-green-800',
      'red': 'bg-red-100 text-red-800',
      'yellow': 'bg-yellow-100 text-yellow-800',
      'blue': 'bg-blue-100 text-blue-800',
      'gray': 'bg-gray-100 text-gray-600'
    }[badge.color] || 'bg-gray-100 text-gray-800';
    
    return <Badge className={colorClass}>{badge.text}</Badge>;
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

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-3xl font-bold mb-6">Dashboard de Cumplimiento</h1>
        <Card className="border-red-200">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-red-800 mb-2">Error al cargar datos</h3>
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={refetch} variant="outline" className="border-red-300">
              <RefreshCw className="h-4 w-4 mr-2" />
              Reintentar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Dashboard de Cumplimiento</h1>
        <div className="flex items-center gap-4">
          <Button onClick={refetch} variant="outline" size="sm" disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
          <div className="text-sm text-gray-500">
            Actualizado: {stats?.summary.last_updated ? 
              new Date(stats.summary.last_updated).toLocaleString('es-CO') : 
              'Cargando...'
            }
          </div>
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
                {formatPercentage(stats?.invoices.accepted_percentage || 0)} aceptadas
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
              Período: {stats?.payroll.current_period || 'N/A'}
            </p>
            <div className="flex items-center mt-2">
              <Clock className="h-3 w-3 text-blue-500 mr-1" />
              <span className="text-xs text-blue-600">
                {stats?.payroll.last_generated ? 
                  `Generada: ${new Date(stats.payroll.last_generated).toLocaleDateString('es-CO')}` :
                  'No generada'
                }
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
              {stats?.pila.total_contributions ? 
                formatCurrency(stats.pila.total_contributions) : 
                formatCurrency(0)
              }
            </div>
            <p className="text-xs text-gray-600">
              Período: {stats?.pila.last_period || 'Ninguno'}
            </p>
            <div className="mt-2">
              {getStatusBadgeComponent(stats?.pila.status || 'SIN_DATOS')}
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
              {stats?.contractors.total > 0 ? (
                <AlertCircle className="h-3 w-3 text-orange-500 mr-1" />
              ) : (
                <AlertCircle className="h-3 w-3 text-gray-400 mr-1" />
              )}
              <span className={`text-xs ${stats?.contractors.total > 0 ? 'text-orange-600' : 'text-gray-500'}`}>
                {stats?.contractors.total > 0 ? 
                  `${stats.contractors.not_obligated || 0} no obligados` :
                  'Sin contratistas registrados'
                }
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
                <span className="font-medium">
                  {(stats?.invoices.status_breakdown?.ACEPTADO || 0) + 
                   (stats?.invoices.status_breakdown?.ACEPTADO_SIMULADO || 0)}
                </span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Pendientes</span>
              <div className="flex items-center">
                <Clock className="h-4 w-4 text-yellow-500 mr-1" />
                <span className="font-medium">
                  {(stats?.invoices.status_breakdown?.ENVIADO || 0) + 
                   (stats?.invoices.status_breakdown?.PENDIENTE || 0)}
                </span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Rechazadas</span>
              <div className="flex items-center">
                <AlertCircle className="h-4 w-4 text-red-500 mr-1" />
                <span className="font-medium">
                  {(stats?.invoices.status_breakdown?.RECHAZADO || 0) + 
                   (stats?.invoices.status_breakdown?.RECHAZADO_SIMULADO || 0)}
                </span>
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
            {obligationsLoading ? (
              <div className="text-center py-4">
                <Clock className="h-6 w-6 mx-auto mb-2 animate-spin text-gray-400" />
                <p className="text-sm text-gray-500">Cargando obligaciones...</p>
              </div>
            ) : obligations && obligations.length > 0 ? (
              obligations.slice(0, 3).map((obligation, index) => {
                return (
                  <div key={index} className="flex justify-between items-center">
                    <span className="text-sm">{obligation.description}</span>
                    <Badge variant="outline" className={`text-xs ${
                      obligation.priority === 'high' ? 'border-red-300 text-red-700' :
                      obligation.priority === 'medium' ? 'border-yellow-300 text-yellow-700' :
                      'border-green-300 text-green-700'
                    }`}>
                      {obligation.days_left} días
                    </Badge>
                  </div>
                );
              })
            ) : (
              <div className="text-center text-gray-500 py-4">
                <Clock className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm">No hay obligaciones programadas</p>
                <p className="text-xs text-gray-400">Configure empleados y proyectos para ver fechas importantes</p>
              </div>
            )}
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