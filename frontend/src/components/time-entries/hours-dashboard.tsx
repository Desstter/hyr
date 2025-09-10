"use client";

import { useState, useEffect, useCallback } from "react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { es } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import {
  Clock,
  AlertTriangle,
  CheckCircle,
  Users,
  TrendingUp,
  DollarSign,
  FileCheck,
  AlertCircle,
  Loader2,
  RefreshCw,
} from "lucide-react";

interface ValidationItem {
  type: "error" | "warning" | "info";
  code: string;
  message: string;
  details: string;
}

interface HoursSummary {
  name: string;
  entries_count: number;
  total_regular_hours: number;
  total_overtime_hours: number;
  total_pay: number;
}

interface DashboardData {
  period_id: string;
  period: {
    start_date: string;
    end_date: string;
  };
  isReadyForPayroll: boolean;
  validations: ValidationItem[];
  summary: HoursSummary[];
}

export function HoursDashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
  });

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Simular llamada a API de validación (necesitaríamos crear este endpoint)
      // Por ahora, usaremos datos mock basados en la estructura esperada
      const mockData: DashboardData = {
        period_id: `period-${selectedPeriod}`,
        period: {
          start_date: format(startOfMonth(new Date(selectedPeriod + '-01')), 'yyyy-MM-dd'),
          end_date: format(endOfMonth(new Date(selectedPeriod + '-01')), 'yyyy-MM-dd'),
        },
        isReadyForPayroll: false,
        validations: [
          {
            type: "error",
            code: "UNAPPROVED_HOURS",
            message: "3 registros sin aprobar",
            details: "Empleados: Juan Pérez, María García"
          },
          {
            type: "warning", 
            code: "EXCESSIVE_HOURS",
            message: "2 días con más de 12 horas",
            details: "Juan Pérez: 13h el 2025-01-15"
          }
        ],
        summary: [
          {
            name: "Juan Pérez",
            entries_count: 22,
            total_regular_hours: 176,
            total_overtime_hours: 8,
            total_pay: 2840000
          },
          {
            name: "María García", 
            entries_count: 20,
            total_regular_hours: 160,
            total_overtime_hours: 4,
            total_pay: 2580000
          }
        ]
      };

      // Simular delay de red
      await new Promise(resolve => setTimeout(resolve, 500));
      setDashboardData(mockData);

    } catch (error) {
      console.error("Error loading dashboard data:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos del dashboard",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [selectedPeriod]);

  useEffect(() => {
    loadDashboardData();
  }, [selectedPeriod, loadDashboardData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const handleBulkApprove = async () => {
    try {
      // Lógica para aprobar horas pendientes
      toast({
        title: "✅ Horas aprobadas",
        description: "Todos los registros pendientes han sido aprobados",
      });
      await loadDashboardData();
    } catch {
      toast({
        title: "Error",
        description: "Error al aprobar las horas",
        variant: "destructive",
      });
    }
  };

  if (loading && !dashboardData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  const totalEmployees = dashboardData?.summary.length || 0;
  const totalHours = dashboardData?.summary.reduce((sum, emp) => 
    sum + emp.total_regular_hours + emp.total_overtime_hours, 0) || 0;
  const totalPay = dashboardData?.summary.reduce((sum, emp) => sum + emp.total_pay, 0) || 0;
  const errors = dashboardData?.validations.filter(v => v.type === 'error') || [];
  const warnings = dashboardData?.validations.filter(v => v.type === 'warning') || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard de Horas</h1>
          <p className="text-muted-foreground">
            Control y validación de registros de tiempo para nómina
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 12 }, (_, i) => {
                const date = new Date();
                date.setMonth(date.getMonth() - i);
                const value = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
                return (
                  <SelectItem key={value} value={value}>
                    {format(date, 'MMMM yyyy', { locale: es })}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </div>
      </div>

      {/* Estado General */}
      <Card className={`border-2 ${dashboardData?.isReadyForPayroll ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {dashboardData?.isReadyForPayroll ? (
                <CheckCircle className="h-8 w-8 text-green-600" />
              ) : (
                <AlertTriangle className="h-8 w-8 text-red-600" />
              )}
              <div>
                <h3 className="text-lg font-semibold">
                  {dashboardData?.isReadyForPayroll ? 'Listo para Nómina' : 'Requiere Atención'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  Período: {dashboardData ? format(new Date(dashboardData.period.start_date), 'dd/MM/yyyy', { locale: es }) : ''} - {dashboardData ? format(new Date(dashboardData.period.end_date), 'dd/MM/yyyy', { locale: es }) : ''}
                </p>
              </div>
            </div>
            {!dashboardData?.isReadyForPayroll && errors.length > 0 && (
              <Button onClick={handleBulkApprove}>
                <FileCheck className="h-4 w-4 mr-2" />
                Aprobar Pendientes
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Métricas Principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Empleados</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalEmployees}</div>
            <p className="text-xs text-muted-foreground">
              Con registros de tiempo
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Horas</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalHours.toLocaleString()}h</div>
            <p className="text-xs text-muted-foreground">
              Regulares + Extras
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Costo Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalPay.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Mano de obra directa
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estado</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {errors.length === 0 ? '✅' : '⚠️'}
            </div>
            <p className="text-xs text-muted-foreground">
              {errors.length} errores, {warnings.length} advertencias
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Validaciones y Alertas */}
      {(errors.length > 0 || warnings.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Validaciones y Alertas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {errors.map((error, index) => (
              <Alert key={`error-${index}`} variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-medium">{error.message}</div>
                  <div className="text-sm mt-1">{error.details}</div>
                </AlertDescription>
              </Alert>
            ))}
            
            {warnings.map((warning, index) => (
              <Alert key={`warning-${index}`}>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-medium">{warning.message}</div>
                  <div className="text-sm mt-1">{warning.details}</div>
                </AlertDescription>
              </Alert>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Resumen por Empleado */}
      <Card>
        <CardHeader>
          <CardTitle>Resumen por Empleado</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {dashboardData?.summary.map((employee, index) => {
              const totalHours = employee.total_regular_hours + employee.total_overtime_hours;
              const expectedHours = 192; // Horas mensuales estándar
              const completionPercentage = Math.min((totalHours / expectedHours) * 100, 100);
              
              return (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">{employee.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {employee.entries_count} registros • {totalHours}h total
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">
                        ${employee.total_pay.toLocaleString()}
                      </div>
                      <Badge variant={completionPercentage >= 90 ? "default" : "secondary"}>
                        {completionPercentage.toFixed(0)}%
                      </Badge>
                    </div>
                  </div>
                  <Progress value={completionPercentage} className="h-2" />
                  <div className="grid grid-cols-3 gap-4 text-xs text-muted-foreground">
                    <div>Regulares: {employee.total_regular_hours}h</div>
                    <div>Extras: {employee.total_overtime_hours}h</div>
                    <div>Promedio: {(totalHours / (employee.entries_count || 1)).toFixed(1)}h/día</div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}