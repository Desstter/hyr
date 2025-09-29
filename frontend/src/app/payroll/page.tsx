"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api, handleApiError } from "@/lib/api";
import type { PayrollPeriod } from "@/lib/api/types";
import { toast } from "sonner";
import {
  Calculator,
  Calendar,
  FileText,
  Settings,
  Download,
  CheckCircle,
  AlertCircle,
  DollarSign,
  User,
  FileSpreadsheet,
  Archive,
  Plus,
  Zap,
  Clock,
  Users,
  ArrowRight,
  Trash2,
} from "lucide-react";
import {
  downloadPILACSV,
  downloadPILAUGPP,
  validatePILAData,
} from "@/lib/utils/pila-export";
import { DeletePeriodDialog } from "@/components/payroll/delete-period-dialog";

export default function PayrollPage() {
  const [periods, setPeriods] = useState<PayrollPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingPeriod, setProcessingPeriod] = useState<string | null>(null);

  // Estados para eliminación de períodos
  const [deletingPeriod, setDeletingPeriod] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Estados para selector de empleados en desprendibles
  const [selectedPeriodForPayslip, setSelectedPeriodForPayslip] = useState<string | null>(null);
  const [payslipDialogOpen, setPayslipDialogOpen] = useState(false);
  const [employeesInPeriod, setEmployeesInPeriod] = useState<Array<{id: string, name: string, document_number: string}>>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [periodToDelete, setPeriodToDelete] = useState<PayrollPeriod | null>(null);

  useEffect(() => {
    loadPayrollPeriods();
  }, []);

  const loadPayrollPeriods = async () => {
    try {
      setLoading(true);
      const data = await api.payroll.getPeriods({ year: 2025 });
      setPeriods(data);
    } catch (error) {
      console.error("Error loading payroll periods:", error);
      toast.error(handleApiError(error));
    } finally {
      setLoading(false);
    }
  };

  const processPayroll2025 = async (periodId: string) => {
    try {
      setProcessingPeriod(periodId);
      const result = await api.payroll.processPayroll2025(periodId);
      toast.success(
        `${result.message} - ${result.processed} empleados procesados`
      );
      loadPayrollPeriods(); // Recargar datos
    } catch (error) {
      console.error("Error processing payroll 2025:", error);
      toast.error(handleApiError(error));
    } finally {
      setProcessingPeriod(null);
    }
  };

  const downloadPILA2025 = async (periodId: string) => {
    try {
      toast.loading("Generando reporte PILA 2025...");

      const pilaData = await api.payroll.getPILA2025Report(periodId);

      // Validar estructura de datos
      if (!validatePILAData(pilaData)) {
        throw new Error("Datos PILA inválidos recibidos del servidor");
      }

      // Descargar archivo CSV formato estándar
      downloadPILACSV(pilaData);

      toast.success(
        `Archivo PILA descargado: ${pilaData.empleados.length} empleados, período ${pilaData.periodo}`
      );
    } catch (error) {
      console.error("Error downloading PILA 2025:", error);
      toast.error("Error al descargar PILA: " + handleApiError(error));
    }
  };

  const downloadPILAUGPPFormat = async (periodId: string) => {
    try {
      toast.loading("Generando archivo para UGPP...");

      const pilaData = await api.payroll.getPILA2025Report(periodId);

      // Validar estructura de datos
      if (!validatePILAData(pilaData)) {
        throw new Error("Datos PILA inválidos recibidos del servidor");
      }

      // Descargar archivo CSV formato UGPP específico
      downloadPILAUGPP(pilaData);

      toast.success(
        `Archivo UGPP descargado: ${pilaData.empleados.length} empleados, listo para carga en plataforma UGPP`
      );
    } catch (error) {
      console.error("Error downloading PILA UGPP:", error);
      toast.error("Error al descargar archivo UGPP: " + handleApiError(error));
    }
  };

  // Función para cargar empleados de un período específico
  const loadEmployeesInPeriod = async (periodId: string) => {
    try {
      setLoadingEmployees(true);

      // Obtener detalles de nómina del período para extraer empleados
      const details = await api.payroll.getPayrollDetails(periodId);

      // Convertir detalles a lista de empleados únicos
      const employees = details.map(detail => ({
        id: detail.personnel_id,
        name: detail.employee_name || "Sin nombre",
        document_number: detail.document_number || "Sin documento"
      }));

      // Remover duplicados por ID
      const uniqueEmployees = employees.filter((employee, index, self) =>
        index === self.findIndex(e => e.id === employee.id)
      );

      setEmployeesInPeriod(uniqueEmployees);
    } catch (error) {
      console.error("Error loading employees for period:", error);
      toast.error("Error al cargar empleados del período");
      setEmployeesInPeriod([]);
    } finally {
      setLoadingEmployees(false);
    }
  };

  // Función para abrir selector de empleados con validaciones
  const openPayslipSelector = (periodId: string) => {
    // Buscar el período para validar su estado
    const period = periods.find(p => p.id === periodId);

    if (!period) {
      toast.error("Período no encontrado");
      return;
    }

    if (period.status !== 'completed') {
      toast.error("El período debe estar procesado para generar desprendibles");
      return;
    }

    setSelectedPeriodForPayslip(periodId);
    setSelectedEmployee("");
    setPayslipDialogOpen(true);
    loadEmployeesInPeriod(periodId);
  };

  // Función mejorada para descargar desprendible individual con empleado seleccionado
  const downloadSelectedEmployeePayslip = async (format: 'pdf' | 'excel') => {
    if (!selectedPeriodForPayslip || !selectedEmployee) {
      toast.error("Debe seleccionar un empleado");
      return;
    }

    try {
      const employeeData = employeesInPeriod.find(emp => emp.id === selectedEmployee);
      toast.loading(`Generando desprendible ${format.toUpperCase()} para ${employeeData?.name}...`);

      // CORRECCIÓN: Usar apiUrl para generar URL correcta del backend
      const { apiUrl } = await import("@/lib/appConfig");
      const url = await apiUrl(`/payroll/payslips/${selectedPeriodForPayslip}/${selectedEmployee}/${format}`);
      const response = await fetch(url);

      if (!response.ok) {
        // Intentar parsear JSON de error, con fallback para HTML
        let errorMessage = `Error al generar desprendible ${format}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // Si no es JSON válido, probablemente sea HTML (404, 500, etc.)
          const textResponse = await response.text();
          if (textResponse.includes('<!DOCTYPE') || textResponse.includes('<html>')) {
            errorMessage = `Servidor no disponible (HTTP ${response.status}). Verifique que el backend esté ejecutándose en puerto 3001.`;
          } else {
            errorMessage = `Error del servidor: ${response.status} ${response.statusText}`;
          }
        }
        throw new Error(errorMessage);
      }

      // Obtener nombre del archivo del header
      const contentDisposition = response.headers.get('content-disposition');
      const safeName = employeeData?.name?.replace(/\s+/g, '_') || 'empleado';
      let filename = `desprendible_${safeName}_${selectedPeriodForPayslip}.${format === 'pdf' ? 'pdf' : 'xlsx'}`;

      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      // Descargar archivo
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(downloadUrl);

      toast.success(`Desprendible ${format.toUpperCase()} descargado para ${employeeData?.name || 'empleado'}`);
      setPayslipDialogOpen(false); // Cerrar el diálogo después de la descarga exitosa
    } catch (error) {
      console.error("Error downloading individual payslip:", error);
      toast.error("Error al descargar desprendible: " + handleApiError(error));
    }
  };

  const downloadBulkPayslips = async (periodId: string, format: 'pdf' | 'excel') => {
    // Validar que el período esté procesado
    const period = periods.find(p => p.id === periodId);

    if (!period) {
      toast.error("Período no encontrado");
      return;
    }

    if (period.status !== 'completed') {
      toast.error("El período debe estar procesado para generar desprendibles");
      return;
    }

    try {
      toast.loading(`Generando todos los desprendibles en ${format.toUpperCase()}...`);

      // CORRECCIÓN: Usar apiUrl para generar URL correcta del backend
      const { apiUrl } = await import("@/lib/appConfig");
      const url = await apiUrl(`/payroll/payslips/${periodId}/bulk/pdf?format=${format}`);
      const response = await fetch(url);

      if (!response.ok) {
        // Intentar parsear JSON de error, con fallback para HTML
        let errorMessage = `Error al generar desprendibles ${format}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // Si no es JSON válido, probablemente sea HTML (404, 500, etc.)
          const textResponse = await response.text();
          if (textResponse.includes('<!DOCTYPE') || textResponse.includes('<html>')) {
            errorMessage = `Servidor no disponible (HTTP ${response.status}). Verifique que el backend esté ejecutándose en puerto 3001.`;
          } else {
            errorMessage = `Error del servidor: ${response.status} ${response.statusText}`;
          }
        }
        throw new Error(errorMessage);
      }

      // Obtener nombre del archivo del header
      const contentDisposition = response.headers.get('content-disposition');
      let filename = `desprendibles_nomina_${periodId}.zip`;

      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      // Descargar archivo ZIP
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(downloadUrl);

      toast.success(`Desprendibles ${format.toUpperCase()} descargados exitosamente en archivo ZIP`);
    } catch (error) {
      console.error("Error downloading bulk payslips:", error);
      toast.error("Error al descargar desprendibles: " + handleApiError(error));
    }
  };

  // Funciones para eliminación de períodos
  const handleDeletePeriod = (period: PayrollPeriod) => {
    setPeriodToDelete(period);
    setDeleteDialogOpen(true);
  };

  const confirmDeletePeriod = async (periodId: string) => {
    try {
      setDeletingPeriod(periodId);

      await api.payroll.deletePeriod(periodId);

      toast.success("Período eliminado exitosamente");

      // Recargar la lista de períodos
      await loadPayrollPeriods();

    } catch (error: unknown) {
      console.error("Error deleting period:", error);

      // Mostrar error específico basado en el código de error
      if (error && typeof error === 'object' && 'response' in error) {
        const apiError = error as { response?: { data?: { code?: string; error?: string } } };
        if (apiError.response?.data?.code) {
          const errorCode = apiError.response.data.code;
          const errorMessage = apiError.response.data.error;

          switch (errorCode) {
            case 'INVALID_STATUS_FOR_DELETE':
              toast.error("No se puede eliminar: el período no está en estado 'draft'");
              break;
            case 'PERIOD_ALREADY_PROCESSED':
              toast.error("No se puede eliminar: el período ya fue procesado");
              break;
            case 'HAS_PAYROLL_DETAILS':
              toast.error("No se puede eliminar: el período tiene nóminas procesadas");
              break;
            case 'PERIOD_NOT_FOUND':
              toast.error("Período no encontrado");
              break;
            default:
              toast.error(errorMessage || "Error al eliminar período");
          }
        }
      } else {
        toast.error(handleApiError(error));
      }
    } finally {
      setDeletingPeriod(null);
    }
  };

  const canDeletePeriod = (period: PayrollPeriod) => {
    // Permitir eliminar períodos que no han sido procesados (sin importar employees_processed)
    return period.status === 'draft' && !period.processed_at;
  };

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(num);
  };

  const formatMonth = (month: number) => {
    const months = [
      "Enero",
      "Febrero",
      "Marzo",
      "Abril",
      "Mayo",
      "Junio",
      "Julio",
      "Agosto",
      "Septiembre",
      "Octubre",
      "Noviembre",
      "Diciembre",
    ];
    return months[month - 1] || month.toString();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">
            Nómina Colombiana 2025
          </h1>
        </div>
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">
            Cargando períodos de nómina...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Nómina Colombiana 2025
          </h1>
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

      {/* CTA Principal - Crear Nueva Nómina */}
      <Card className="border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Zap className="h-6 w-6 text-primary" />
                <h2 className="text-xl font-semibold">Crear Nómina Automática</h2>
              </div>
              <p className="text-muted-foreground max-w-2xl">
                Genera automáticamente la nómina para todos los empleados activos basada en sus horas trabajadas,
                aplicando recargos legales, deducciones y prestaciones sociales colombianas.
              </p>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  <span>Todos los empleados</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>Horas de todos los proyectos</span>
                </div>
                <div className="flex items-center gap-1">
                  <CheckCircle className="h-4 w-4" />
                  <span>Compliance legal automático</span>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Button
                size="lg"
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-3"
                onClick={() => window.location.href = '/payroll/create'}
              >
                <Plus className="h-5 w-5 mr-2" />
                Crear Nómina Automática
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                Proceso guiado paso a paso
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

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
                <CardTitle className="text-sm font-medium">
                  Períodos Procesados
                </CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{periods.length}</div>
                <p className="text-xs text-muted-foreground">2025</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Empleados
                </CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {periods[0]?.employees_processed || "0"}
                </div>
                <p className="text-xs text-muted-foreground">Activos</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Nómina Neta
                </CardTitle>
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
                <CardTitle className="text-sm font-medium">
                  Costo Empleador
                </CardTitle>
                <Calculator className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {periods[0] && formatCurrency(periods[0].total_employer_cost)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Total con prestaciones
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Payroll Periods */}
          <Card>
            <CardHeader>
              <CardTitle>Períodos de Nómina Existentes</CardTitle>
              <CardDescription>
                Gestión de períodos ya procesados y descarga de reportes oficiales
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {periods.map(period => (
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
                          {period.employees_processed} empleados •{" "}
                          {formatCurrency(period.total_employer_cost)}
                        </p>
                      </div>
                      <Badge
                        variant={
                          period.status === "completed"
                            ? "default"
                            : "secondary"
                        }
                      >
                        {period.status === "completed" ? (
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

                    <div className="space-y-3">
                      {/* Acciones Principales */}
                      <div className="flex justify-end gap-2">
                        {/* Botón de Procesar */}
                        {period.status !== "completed" && (
                          <Button
                            size="sm"
                            onClick={() => processPayroll2025(period.id)}
                            disabled={processingPeriod === period.id}
                            className="bg-primary hover:bg-primary/90"
                          >
                            {processingPeriod === period.id ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            ) : (
                              <Zap className="h-4 w-4 mr-1" />
                            )}
                            Procesar Nómina Automáticamente
                          </Button>
                        )}

                        {/* Botón de Eliminar - Solo para períodos eliminables */}
                        {canDeletePeriod(period) && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeletePeriod(period)}
                            disabled={deletingPeriod === period.id}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            {deletingPeriod === period.id ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            ) : (
                              <Trash2 className="h-4 w-4 mr-1" />
                            )}
                            Eliminar
                          </Button>
                        )}
                      </div>

                      {/* Reportes Oficiales */}
                      {period.status === "completed" && (
                        <div className="border-t pt-3 space-y-2">
                          <h4 className="text-sm font-medium text-muted-foreground mb-2">📊 Reportes Oficiales</h4>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => downloadPILA2025(period.id)}
                              className="bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
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
                      )}

                      {/* Desprendibles */}
                      {period.status === "completed" && (
                        <div className="border-t pt-3 space-y-2">
                          <h4 className="text-sm font-medium text-muted-foreground mb-2">📄 Desprendibles de Pago</h4>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <p className="text-xs text-muted-foreground">Individual</p>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openPayslipSelector(period.id)}
                                className="bg-green-50 hover:bg-green-100 text-green-700 border-green-200 text-xs"
                              >
                                <User className="h-3 w-3 mr-1" />
                                Individual
                              </Button>
                            </div>
                            <div className="space-y-1">
                              <p className="text-xs text-muted-foreground">Masivo (ZIP)</p>
                              <div className="flex gap-1">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => downloadBulkPayslips(period.id, 'pdf')}
                                  className="bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200 text-xs"
                                >
                                  <Archive className="h-3 w-3 mr-1" />
                                  PDF
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => downloadBulkPayslips(period.id, 'excel')}
                                  className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200 text-xs"
                                >
                                  <Archive className="h-3 w-3 mr-1" />
                                  Excel
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
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
                    <h3 className="font-semibold mb-2">
                      Parámetros Salariales
                    </h3>
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
                        <span className="text-green-600 font-medium">
                          ✓ Activo
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Ley 114-1 Exemptions:</span>
                        <span className="text-green-600 font-medium">
                          ✓ Activo
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>ARL por Sitio Trabajo:</span>
                        <span className="text-green-600 font-medium">
                          ✓ Activo
                        </span>
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

      {/* Dialog de selección de empleado para desprendibles */}
      <Dialog open={payslipDialogOpen} onOpenChange={setPayslipDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Seleccionar Empleado</DialogTitle>
            <DialogDescription>
              Elija el empleado para generar su desprendible de pago
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {loadingEmployees ? (
              <div className="flex items-center justify-center py-4">
                <Clock className="h-4 w-4 animate-spin mr-2" />
                Cargando empleados...
              </div>
            ) : employeesInPeriod.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                No se encontraron empleados en este período
              </div>
            ) : (
              <>
                <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar empleado..." />
                  </SelectTrigger>
                  <SelectContent>
                    {employeesInPeriod.map((employee) => (
                      <SelectItem key={employee.id} value={employee.id}>
                        <div className="flex items-center justify-between w-full">
                          <span>{employee.name}</span>
                          <span className="text-muted-foreground text-sm ml-2">
                            CC {employee.document_number}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {selectedEmployee && (
                  <div className="flex gap-2 pt-2">
                    <Button
                      onClick={() => downloadSelectedEmployeePayslip('pdf')}
                      className="flex-1"
                      variant="default"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Descargar PDF
                    </Button>
                    <Button
                      onClick={() => downloadSelectedEmployeePayslip('excel')}
                      className="flex-1"
                      variant="outline"
                    >
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                      Descargar Excel
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmación para eliminar período */}
      <DeletePeriodDialog
        period={periodToDelete}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onDelete={confirmDeletePeriod}
        loading={deletingPeriod !== null}
      />
    </div>
  );
}
