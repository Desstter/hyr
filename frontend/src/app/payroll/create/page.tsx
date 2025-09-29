"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { api, handleApiError } from "@/lib/api";
import { toast } from "sonner";
import {
  Calendar,
  Users,
  CheckCircle,
  AlertCircle,
  Clock,
  DollarSign,
  ArrowLeft,
  ArrowRight,
  Zap,
  FileText,
  Loader2,
  AlertTriangle,
  Plus,
} from "lucide-react";
import { useRouter } from "next/navigation";

interface ValidationResult {
  period_id: string;
  period: {
    start_date: string;
    end_date: string;
  };
  isReadyForPayroll: boolean;
  validations: Array<{
    type: 'error' | 'warning';
    code: string;
    message: string;
    details: string;
  }>;
  summary: Array<{
    name: string;
    entries_count: number;
    total_regular_hours: number;
    total_overtime_hours: number;
    total_pay: number;
  }>;
}

export default function CreatePayrollPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Step 1: Period Selection
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().getMonth() + 1);
  const [periodId, setPeriodId] = useState<string | null>(null);

  // Step 2: Validation
  const [validation, setValidation] = useState<ValidationResult | null>(null);

  // Step 3: Processing
  const [processing, setProcessing] = useState(false);
  const [processResult, setProcessResult] = useState<{
    processed: number;
    totalCost?: number;
    message?: string;
  } | null>(null);

  const steps = [
    { number: 1, title: "Seleccionar Período", description: "Año y mes para procesar" },
    { number: 2, title: "Validar Horas", description: "Verificar registros de tiempo" },
    { number: 3, title: "Procesar Nómina", description: "Generar nómina automáticamente" }
  ];

  const formatMonth = (month: number) => {
    const months = [
      "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
      "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];
    return months[month - 1] || month.toString();
  };

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(num);
  };

  // Step 1: Create or get period
  const handleCreatePeriod = async () => {
    setLoading(true);
    try {
      const result = await api.payroll.createPeriod({
        year: selectedYear,
        month: selectedMonth,
      });
      setPeriodId(result.id);
      setCurrentStep(2);
      toast.success(`Período ${formatMonth(selectedMonth)} ${selectedYear} creado`);
    } catch (error: unknown) {
      const apiError = error as { response?: { status?: number } };
      if (apiError.response?.status === 409) {
        // Period already exists, try to get it
        try {
          const periods = await api.payroll.getPeriods({
            year: selectedYear,
            status: 'draft'
          });
          const existingPeriod = periods.find((p: { year: number; month: number; id: string }) =>
            p.year === selectedYear && p.month === selectedMonth
          );
          if (existingPeriod) {
            setPeriodId(existingPeriod.id);
            setCurrentStep(2);
            toast.info(`Usando período existente ${formatMonth(selectedMonth)} ${selectedYear}`);
          } else {
            toast.error("Error: Período ya procesado o no disponible");
          }
        } catch {
          toast.error("Error al verificar período existente");
        }
      } else {
        toast.error(handleApiError(error));
      }
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Validate hours
  const handleValidateHours = useCallback(async () => {
    if (!periodId) return;

    setLoading(true);
    try {
      const result = await api.payroll.validateHours(periodId);
      setValidation(result);


    } catch (error) {
      console.error("Error validating hours:", error);
      toast.error(handleApiError(error));
    } finally {
      setLoading(false);
    }
  }, [periodId]);

  // Step 3: Process payroll
  const handleProcessPayroll = async () => {
    if (!periodId) return;

    setProcessing(true);
    try {
      const result = await api.payroll.processPayroll2025(periodId);
      setProcessResult(result);
      toast.success(`¡Nómina procesada! ${result.processed} empleados procesados`);
    } catch (error) {
      console.error("Error processing payroll:", error);
      toast.error(handleApiError(error));
    } finally {
      setProcessing(false);
    }
  };

  useEffect(() => {
    if (currentStep === 2 && periodId) {
      handleValidateHours();
    }
  }, [currentStep, periodId, handleValidateHours]);

  const progressPercentage = ((currentStep - 1) / (steps.length - 1)) * 100;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Crear Nómina Automática
          </h1>
          <p className="text-muted-foreground">
            Proceso guiado paso a paso para generar nómina de todos los empleados
          </p>
        </div>
        <Button variant="outline" onClick={() => router.push('/payroll')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>
      </div>

      {/* Progress Indicator */}
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Progreso</h3>
              <span className="text-sm text-muted-foreground">
                Paso {currentStep} de {steps.length}
              </span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
            <div className="flex justify-between">
              {steps.map((step) => (
                <div key={step.number} className="flex flex-col items-center text-center">
                  <div className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                    ${currentStep >= step.number
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                    }
                  `}>
                    {currentStep > step.number ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      step.number
                    )}
                  </div>
                  <div className="mt-2">
                    <p className="text-xs font-medium">{step.title}</p>
                    <p className="text-xs text-muted-foreground">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Step Content */}
      {currentStep === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Seleccionar Período
            </CardTitle>
            <CardDescription>
              Seleccione el año y mes para el cual desea generar la nómina automática
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="year">Año</Label>
                <Input
                  id="year"
                  type="number"
                  min={2024}
                  max={2030}
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="month">Mes</Label>
                <select
                  id="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                    <option key={month} value={month}>
                      {formatMonth(month)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">
                ℹ️ ¿Qué incluye la nómina automática?
              </h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Procesamiento de todos los empleados activos</li>
                <li>• Horas trabajadas de todos los proyectos sumadas automáticamente</li>
                <li>• Recargos legales: horas extra (25%), nocturnas (35%), dominicales</li>
                <li>• Deducciones: salud (4%), pensión (4%), solidaridad si aplica</li>
                <li>• Aportes patronales y prestaciones sociales completas</li>
                <li>• Compliance con legislación laboral colombiana 2025</li>
              </ul>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={handleCreatePeriod}
                disabled={loading}
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Creando período...
                  </>
                ) : (
                  <>
                    Continuar
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {currentStep === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Validar Horas y Empleados
            </CardTitle>
            <CardDescription>
              Revisión de registros de tiempo para {formatMonth(selectedMonth)} {selectedYear}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {loading ? (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                <p>Validando registros de tiempo...</p>
              </div>
            ) : validation ? (
              <>
                {/* Validation Results */}
                {validation.validations.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium">Validaciones</h4>
                    {validation.validations.map((val, index) => (
                      <div
                        key={index}
                        className={`p-3 rounded-lg flex items-start gap-2 ${
                          val.type === 'error'
                            ? 'bg-red-50 border border-red-200'
                            : 'bg-yellow-50 border border-yellow-200'
                        }`}
                      >
                        {val.type === 'error' ? (
                          <AlertCircle className="h-4 w-4 text-red-500 mt-0.5" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5" />
                        )}
                        <div>
                          <p className={`font-medium ${val.type === 'error' ? 'text-red-800' : 'text-yellow-800'}`}>
                            {val.message}
                          </p>
                          {val.details && (
                            <p className={`text-sm ${val.type === 'error' ? 'text-red-600' : 'text-yellow-600'}`}>
                              {val.details}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Employee Summary */}
                {validation.summary.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium">Resumen por Empleado</h4>
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="text-left p-3">Empleado</th>
                            <th className="text-center p-3">Días</th>
                            <th className="text-center p-3">H. Regulares</th>
                            <th className="text-center p-3">H. Extra</th>
                            <th className="text-right p-3">Total Pago</th>
                          </tr>
                        </thead>
                        <tbody>
                          {validation.summary.map((emp, index) => (
                            <tr key={index} className="border-t">
                              <td className="p-3 font-medium">{emp.name}</td>
                              <td className="text-center p-3">{emp.entries_count}</td>
                              <td className="text-center p-3">{emp.total_regular_hours}h</td>
                              <td className="text-center p-3">{emp.total_overtime_hours}h</td>
                              <td className="text-right p-3">{formatCurrency(emp.total_pay)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex justify-between">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentStep(1)}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Atrás
                  </Button>

                  <Button
                    onClick={() => setCurrentStep(3)}
                    disabled={!validation.isReadyForPayroll}
                    size="lg"
                    className={validation.isReadyForPayroll ? 'bg-green-600 hover:bg-green-700' : ''}
                  >
                    {validation.isReadyForPayroll ? (
                      <>
                        <Zap className="h-4 w-4 mr-2" />
                        Procesar Nómina
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-4 w-4 mr-2" />
                        Resolver errores primero
                      </>
                    )}
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-4" />
                <p>Error cargando validaciones</p>
                <Button variant="outline" onClick={handleValidateHours} className="mt-2">
                  Reintentar
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {currentStep === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Procesar Nómina Automática
            </CardTitle>
            <CardDescription>
              Generación automática de nómina para {formatMonth(selectedMonth)} {selectedYear}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {!processResult ? (
              <>
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-medium text-green-900 mb-2">
                    ✅ Todo listo para procesar
                  </h4>
                  <p className="text-sm text-green-800">
                    Se va a generar automáticamente la nómina completa con todos los cálculos legales
                    colombianos para todos los empleados activos.
                  </p>
                </div>

                {validation && (
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <Users className="h-6 w-6 text-blue-600 mx-auto mb-1" />
                      <p className="font-bold text-lg">{validation.summary.length}</p>
                      <p className="text-sm text-muted-foreground">Empleados</p>
                    </div>
                    <div className="p-3 bg-green-50 rounded-lg">
                      <Clock className="h-6 w-6 text-green-600 mx-auto mb-1" />
                      <p className="font-bold text-lg">
                        {validation.summary.reduce((sum, emp) => sum + emp.total_regular_hours, 0)}h
                      </p>
                      <p className="text-sm text-muted-foreground">Horas Regulares</p>
                    </div>
                    <div className="p-3 bg-orange-50 rounded-lg">
                      <DollarSign className="h-6 w-6 text-orange-600 mx-auto mb-1" />
                      <p className="font-bold text-lg">
                        {formatCurrency(validation.summary.reduce((sum, emp) => sum + emp.total_pay, 0))}
                      </p>
                      <p className="text-sm text-muted-foreground">Total Pago</p>
                    </div>
                  </div>
                )}

                <div className="flex justify-between">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentStep(2)}
                    disabled={processing}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Atrás
                  </Button>

                  <Button
                    onClick={handleProcessPayroll}
                    disabled={processing}
                    size="lg"
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {processing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Procesando nómina...
                      </>
                    ) : (
                      <>
                        <Zap className="h-4 w-4 mr-2" />
                        🚀 CREAR NÓMINA AUTOMÁTICA
                      </>
                    )}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="text-center py-8">
                  <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-green-900 mb-2">
                    ¡Nómina Creada Exitosamente!
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    La nómina para {formatMonth(selectedMonth)} {selectedYear} ha sido procesada automáticamente
                  </p>

                  <div className="grid grid-cols-2 gap-4 max-w-md mx-auto mb-6">
                    <div className="p-3 bg-green-50 rounded-lg">
                      <p className="font-bold text-lg">{processResult.processed}</p>
                      <p className="text-sm text-muted-foreground">Empleados Procesados</p>
                    </div>
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <p className="font-bold text-lg">{formatCurrency(processResult.totalCost || 0)}</p>
                      <p className="text-sm text-muted-foreground">Costo Total</p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-center gap-4">
                  <Button
                    variant="outline"
                    onClick={() => router.push('/payroll')}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Ver Período Procesado
                  </Button>

                  <Button
                    onClick={() => {
                      // Reset form for new period
                      setCurrentStep(1);
                      setPeriodId(null);
                      setValidation(null);
                      setProcessResult(null);
                      setSelectedMonth(new Date().getMonth() + 1);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Crear Nueva Nómina
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}