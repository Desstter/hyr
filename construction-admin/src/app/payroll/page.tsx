'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { api, handleApiError } from '@/lib/api';
import { toast } from 'sonner';
import { 
  Calculator, 
  Calendar, 
  FileText, 
  Settings, 
  Download, 
  Play,
  CheckCircle,
  AlertCircle,
  DollarSign
} from 'lucide-react';
import { downloadPILACSV, downloadPILAUGPP, validatePILAData } from '@/lib/utils/pila-export';

interface PayrollPeriod {
  id: string;
  year: number;
  month: number;
  status: string;
  employees_processed: string;
  total_net_pay: string;
  total_employer_cost: string;
  processed_at: string;
}

export default function PayrollPage() {
  const [periods, setPeriods] = useState<PayrollPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingPeriod, setProcessingPeriod] = useState<string | null>(null);

  useEffect(() => {
    loadPayrollPeriods();
  }, []);

  const loadPayrollPeriods = async () => {
    try {
      setLoading(true);
      const data = await api.payroll.getPeriods({ year: 2025 });
      setPeriods(data);
    } catch (error) {
      console.error('Error loading payroll periods:', error);
      toast.error(handleApiError(error));
    } finally {
      setLoading(false);
    }
  };

  const processPayroll2025 = async (periodId: string) => {
    try {
      setProcessingPeriod(periodId);
      const result = await api.payroll.processPayroll2025(periodId);
      toast.success(`${result.message} - ${result.processed} empleados procesados`);
      loadPayrollPeriods(); // Recargar datos
    } catch (error) {
      console.error('Error processing payroll 2025:', error);
      toast.error(handleApiError(error));
    } finally {
      setProcessingPeriod(null);
    }
  };

  const downloadPILA2025 = async (periodId: string) => {
    try {
      toast.loading('Generando reporte PILA 2025...');
      
      const pilaData = await api.payroll.getPILA2025Report(periodId);
      
      // Validar estructura de datos
      if (!validatePILAData(pilaData)) {
        throw new Error('Datos PILA inválidos recibidos del servidor');
      }
      
      // Descargar archivo CSV formato estándar
      downloadPILACSV(pilaData);
      
      toast.success(`Archivo PILA descargado: ${pilaData.empleados.length} empleados, período ${pilaData.periodo}`);
    } catch (error) {
      console.error('Error downloading PILA 2025:', error);
      toast.error('Error al descargar PILA: ' + handleApiError(error));
    }
  };

  const downloadPILAUGPPFormat = async (periodId: string) => {
    try {
      toast.loading('Generando archivo para UGPP...');
      
      const pilaData = await api.payroll.getPILA2025Report(periodId);
      
      // Validar estructura de datos
      if (!validatePILAData(pilaData)) {
        throw new Error('Datos PILA inválidos recibidos del servidor');
      }
      
      // Descargar archivo CSV formato UGPP específico
      downloadPILAUGPP(pilaData);
      
      toast.success(`Archivo UGPP descargado: ${pilaData.empleados.length} empleados, listo para carga en plataforma UGPP`);
    } catch (error) {
      console.error('Error downloading PILA UGPP:', error);
      toast.error('Error al descargar archivo UGPP: ' + handleApiError(error));
    }
  };

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(num);
  };

  const formatMonth = (month: number) => {
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return months[month - 1] || month.toString();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Nómina Colombiana 2025</h1>
        </div>
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Cargando períodos de nómina...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Nómina Colombiana 2025</h1>
          <p className="text-muted-foreground">
            Gestión completa de nómina con compliance legal colombiano
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Configuración
          </Button>
        </div>
      </div>

      <Tabs defaultValue="periods" className="space-y-4">
        <TabsList>
          <TabsTrigger value="periods">Períodos</TabsTrigger>
          <TabsTrigger value="config">Configuración 2025</TabsTrigger>
          <TabsTrigger value="reports">Reportes</TabsTrigger>
        </TabsList>

        <TabsContent value="periods" className="space-y-4">
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Períodos Procesados</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{periods.length}</div>
                <p className="text-xs text-muted-foreground">2025</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Empleados</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {periods[0]?.employees_processed || '0'}
                </div>
                <p className="text-xs text-muted-foreground">Activos</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Nómina Neta</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {periods[0] && formatCurrency(periods[0].total_net_pay)}
                </div>
                <p className="text-xs text-muted-foreground">Último período</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Costo Empleador</CardTitle>
                <Calculator className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {periods[0] && formatCurrency(periods[0].total_employer_cost)}
                </div>
                <p className="text-xs text-muted-foreground">Total con prestaciones</p>
              </CardContent>
            </Card>
          </div>

          {/* Payroll Periods */}
          <Card>
            <CardHeader>
              <CardTitle>Períodos de Nómina 2025</CardTitle>
              <CardDescription>
                Gestión y procesamiento de nómina con compliance colombiano 2025
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {periods.map((period) => (
                  <div
                    key={period.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center space-x-4">
                      <div>
                        <p className="font-medium">
                          {formatMonth(period.month)} {period.year}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {period.employees_processed} empleados • {formatCurrency(period.total_employer_cost)}
                        </p>
                      </div>
                      <Badge
                        variant={period.status === 'completed' ? 'default' : 'secondary'}
                      >
                        {period.status === 'completed' ? (
                          <>
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Procesado
                          </>
                        ) : (
                          <>
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Pendiente
                          </>
                        )}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {period.status !== 'completed' && (
                        <Button
                          size="sm"
                          onClick={() => processPayroll2025(period.id)}
                          disabled={processingPeriod === period.id}
                        >
                          {processingPeriod === period.id ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          ) : (
                            <Play className="h-4 w-4 mr-1" />
                          )}
                          Procesar 2025
                        </Button>
                      )}
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadPILA2025(period.id)}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        PILA 2025
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadPILAUGPPFormat(period.id)}
                        className="bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                      >
                        <FileText className="h-4 w-4 mr-1" />
                        UGPP
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="config">
          <Card>
            <CardHeader>
              <CardTitle>Configuración Compliance 2025</CardTitle>
              <CardDescription>
                Parámetros legales colombianos vigentes para 2025
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <h3 className="font-semibold mb-2">Parámetros Salariales</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>SMMLV 2025:</span>
                        <span className="font-mono">$1,423,500</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Auxilio Transporte:</span>
                        <span className="font-mono">$200,000</span>
                      </div>
                      <div className="flex justify-between">
                        <span>UVT 2025:</span>
                        <span className="font-mono">$47,065</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">Compliance Especial</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>FSP (Solidaridad Pensional):</span>
                        <span className="text-green-600 font-medium">✓ Activo</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Ley 114-1 Exemptions:</span>
                        <span className="text-green-600 font-medium">✓ Activo</span>
                      </div>
                      <div className="flex justify-between">
                        <span>ARL por Sitio Trabajo:</span>
                        <span className="text-green-600 font-medium">✓ Activo</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports">
          <Card>
            <CardHeader>
              <CardTitle>Reportes de Nómina</CardTitle>
              <CardDescription>
                Certificados laborales, PILA y reportes de compliance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Reportes disponibles próximamente
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}