"use client";

import { notFound } from "next/navigation";
import { useState, use, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api, handleApiError } from "@/lib/api";
import type { Project, Client, Expense, Personnel, ProjectIncome } from "@/lib/api";
import { useProjectTimeEntries } from "@/lib/api/time-entries";
import {
  formatCurrency,
  formatDate,
  getProjectStatusColor,
  getProjectStatusLabel,
} from "@/lib/finance";
import { useTranslations } from "@/lib/i18n";
import { ArrowLeft, Edit, Users, DollarSign, Clock, CheckCircle, AlertTriangle, Plus } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { IncomeDialog } from "@/components/incomes/income-dialog";

interface ProjectDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const { id } = use(params);
  const t = useTranslations("es");

  // State for API data
  const [project, setProject] = useState<Project | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [assignedPersonnel, setAssignedPersonnel] = useState<Personnel[]>([]);
  const [incomes, setIncomes] = useState<ProjectIncome[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showIncomeDialog, setShowIncomeDialog] = useState(false);

  // Hook para obtener registros de tiempo del proyecto
  const { 
    timeEntries: projectTimeEntries, 
    summary: timeTrackingSummary 
  } = useProjectTimeEntries(id);

  const loadProjectData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Load project
      const projectData = await api.projects.getById(id);
      setProject(projectData);

      // Load client if project has one
      if (projectData.client_id) {
        try {
          const clientData = await api.clients.getById(projectData.client_id);
          setClient(clientData);
        } catch (err) {
          console.warn("Could not load client:", err);
        }
      }

      // Load project expenses
      try {
        const expensesResult = await api.projects.getExpenses(id);
        setExpenses(Array.isArray(expensesResult) ? expensesResult : []);
      } catch (err) {
        console.warn("Could not load expenses:", err);
        setExpenses([]);
      }

      // Load assigned personnel
      try {
        const personnelResult = await api.projects.getAssignedPersonnel(id);
        setAssignedPersonnel(Array.isArray(personnelResult) ? personnelResult : []);
      } catch (err) {
        console.warn("Could not load personnel:", err);
        setAssignedPersonnel([]);
      }

      // Load project incomes
      try {
        const incomesResult = await api.incomes.getProjectIncomes(id);
        setIncomes(Array.isArray(incomesResult) ? incomesResult : []);
      } catch (err) {
        console.warn("Could not load incomes:", err);
        setIncomes([]);
      }
    } catch (err) {
      const errorMessage = handleApiError(err);
      setError(errorMessage);
      console.error("Error loading project data:", err);
      toast.error("Error cargando proyecto: " + errorMessage);
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Load project data
  useEffect(() => {
    loadProjectData();
  }, [loadProjectData]);

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-8 bg-gray-100 animate-pulse rounded-md w-48" />
          <div className="h-10 bg-gray-100 animate-pulse rounded-md w-32" />
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2 h-64 bg-gray-100 animate-pulse rounded-lg" />
          <div className="h-64 bg-gray-100 animate-pulse rounded-lg" />
        </div>
        <div className="text-center text-muted-foreground">
          Cargando detalles del proyecto desde PostgreSQL...
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-medium">Error cargando proyecto</h3>
          <p className="text-red-600 text-sm mt-1">{error}</p>
          <button
            onClick={loadProjectData}
            className="mt-2 bg-red-100 text-red-800 px-3 py-1 rounded text-sm hover:bg-red-200"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  // Not found
  if (!project) {
    notFound();
  }

  const totalExpenses = expenses.reduce(
    (sum, expense) => sum + Number(expense.amount),
    0
  );
  // Helper function to calculate person's total pay from time entries
  const getPersonTotalPay = (person: any) => {
    if (!projectTimeEntries || projectTimeEntries.length === 0) {
      return 0;
    }

    // Calculate total pay from all time entries for this person
    const personEntries = projectTimeEntries.filter(entry => entry.personnel_id === person.id);
    const totalPay = personEntries.reduce((sum, entry) => sum + Number(entry.total_pay || 0), 0);
    
    return totalPay;
  };

  const totalPersonnelCost = assignedPersonnel.reduce(
    (sum, person) => sum + getPersonTotalPay(person),
    0
  );
  
  // Calculate total actual costs (expenses from DB + personnel costs)
  const totalExpensesFromDB = Number(project.spent_total) || 0;
  const totalActualCosts = totalExpensesFromDB + totalPersonnelCost;
  const remainingBudget = Number(project.budget_total) - totalActualCosts;

  // Helper function to get time data for a specific employee in this project
  const getEmployeeTimeData = (personnelId: string) => {
    if (!projectTimeEntries || projectTimeEntries.length === 0) {
      return { regularHours: 0, overtimeHours: 0, period: null };
    }

    const employeeEntries = projectTimeEntries.filter(entry => entry.personnel_id === personnelId);
    if (employeeEntries.length === 0) {
      return { regularHours: 0, overtimeHours: 0, period: null };
    }

    const totalRegularHours = employeeEntries.reduce((sum, entry) => sum + Number(entry.hours_worked || 0), 0);
    const totalOvertimeHours = employeeEntries.reduce((sum, entry) => sum + Number(entry.overtime_hours || 0), 0);
    
    // Get date range for this employee
    const dates = employeeEntries.map(entry => new Date(entry.work_date)).sort((a, b) => a.getTime() - b.getTime());
    const startDate = dates[0];
    const endDate = dates[dates.length - 1];
    
    const period = startDate && endDate 
      ? `${formatDate(startDate.toISOString())} - ${formatDate(endDate.toISOString())}`
      : null;

    return {
      regularHours: totalRegularHours,
      overtimeHours: totalOvertimeHours,
      period
    };
  };

  // Function to group all personnel who have worked on the project by assignment status
  const groupPersonnelByAssignment = () => {
    if (!projectTimeEntries || projectTimeEntries.length === 0) {
      return { assignedPersonnel: [], unassignedPersonnel: [] };
    }

    // Get unique personnel from time entries
    const personnelMap = new Map();
    projectTimeEntries.forEach(entry => {
      if (!personnelMap.has(entry.personnel_id)) {
        personnelMap.set(entry.personnel_id, {
          id: entry.personnel_id,
          name: entry.personnel_name,
          position: entry.position,
          department: entry.department,
          is_officially_assigned: entry.is_officially_assigned
        });
      }
    });

    const allWorkingPersonnel = Array.from(personnelMap.values());
    
    return {
      assignedPersonnel: allWorkingPersonnel.filter(p => p.is_officially_assigned),
      unassignedPersonnel: allWorkingPersonnel.filter(p => !p.is_officially_assigned)
    };
  };

  const { assignedPersonnel: workingAssignedPersonnel, unassignedPersonnel } = groupPersonnelByAssignment();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/projects">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver a Proyectos
            </Link>
          </Button>
        </div>
        <div className="flex space-x-2">
          <Button>
            <Edit className="h-4 w-4 mr-2" />
            {t.projects.editProject}
          </Button>
        </div>
      </div>

      {/* Project Overview */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl">{project.name}</CardTitle>
              <Badge
                variant="outline"
                className={getProjectStatusColor(project.status)}
              >
                {getProjectStatusLabel(project.status)}
              </Badge>
            </div>
            <p className="text-muted-foreground text-lg">
              {client?.name || "Sin cliente"}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {project.description && (
              <div>
                <h3 className="font-semibold mb-2">Descripción</h3>
                <p className="text-muted-foreground">{project.description}</p>
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h3 className="font-semibold mb-2">Fechas</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Inicio:</span>
                    <span>
                      {project.start_date
                        ? formatDate(project.start_date)
                        : "No definida"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Fin:</span>
                    <span>
                      {project.end_date
                        ? formatDate(project.end_date)
                        : "No definida"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Estimada:</span>
                    <span>
                      {project.estimated_end_date
                        ? formatDate(project.estimated_end_date)
                        : "No definida"}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Progreso</h3>
                <div className="space-y-2">
                  <Progress value={project.progress} className="h-3" />
                  <p className="text-sm text-muted-foreground">
                    {project.progress}% completado
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Budget Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Resumen Financiero</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm">Presupuesto Total:</span>
                <span className="font-semibold">
                  {formatCurrency(Number(project.budget_total))}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Ingresos Totales:</span>
                <span className="font-semibold text-green-600">
                  {formatCurrency(Number(project.total_income) || 0)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Gastado:</span>
                <span className="font-semibold text-red-600">
                  {formatCurrency(totalActualCosts)}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs text-gray-500">
                <span className="ml-4">Gastos registrados:</span>
                <span>{formatCurrency(totalExpensesFromDB)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Costo Mano de Obra:</span>
                <span className="font-semibold text-blue-600">
                  {formatCurrency(totalPersonnelCost)}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs text-gray-500">
                <span>{assignedPersonnel.length} empleados</span>
                <span>
                  {timeTrackingSummary?.totalHours?.toFixed(1) || "0.0"} horas totales
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t">
                <span className="text-sm">Presupuesto Restante:</span>
                <span
                  className={`font-semibold ${remainingBudget >= 0 ? "text-green-600" : "text-red-600"}`}
                >
                  {formatCurrency(remainingBudget)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Ganancia Real:</span>
                <span
                  className={`font-semibold ${(Number(project.total_income) || 0) - totalActualCosts >= 0 ? "text-green-600" : "text-red-600"}`}
                >
                  {formatCurrency((Number(project.total_income) || 0) - totalActualCosts)}
                </span>
              </div>
            </div>

            <div className="pt-4">
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>Uso del presupuesto</span>
                <span>
                  {Number(project.budget_total) > 0
                    ? Math.round(
                        (totalActualCosts /
                          Number(project.budget_total)) *
                          100
                      )
                    : 0}
                  %
                </span>
              </div>
              <Progress
                value={
                  Number(project.budget_total) > 0
                    ? (totalActualCosts /
                        Number(project.budget_total)) *
                      100
                    : 0
                }
                className="h-2"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Budget and Expenses Tabs */}
      <Tabs defaultValue="budget" className="space-y-4">
        <TabsList>
          <TabsTrigger value="budget">Presupuesto</TabsTrigger>
          <TabsTrigger value="expenses">Gastos ({expenses.length})</TabsTrigger>
          <TabsTrigger value="incomes">Ingresos ({incomes.length})</TabsTrigger>
          <TabsTrigger value="personnel">
            Personal ({assignedPersonnel.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="budget">
          <Card>
            <CardHeader>
              <CardTitle>Desglose de Presupuesto</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 border rounded">
                    <div className="flex items-center space-x-2">
                      <DollarSign className="h-4 w-4 text-green-600" />
                      <span className="font-medium">Materiales</span>
                    </div>
                    <span className="font-semibold">
                      {formatCurrency(Number(project.budget_materials))}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 border rounded">
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4 text-blue-600" />
                      <span className="font-medium">Mano de Obra</span>
                    </div>
                    <span className="font-semibold">
                      {formatCurrency(Number(project.budget_labor))}
                    </span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 border rounded">
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-yellow-600" />
                      <span className="font-medium">Equipos</span>
                    </div>
                    <span className="font-semibold">
                      {formatCurrency(Number(project.budget_equipment))}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 border rounded">
                    <div className="flex items-center space-x-2">
                      <DollarSign className="h-4 w-4 text-purple-600" />
                      <span className="font-medium">Gastos Generales</span>
                    </div>
                    <span className="font-semibold">
                      {formatCurrency(Number(project.budget_overhead))}
                    </span>
                  </div>
                </div>
              </div>
              <div className="pt-4 border-t mt-4">
                <div className="flex justify-between items-center text-lg font-semibold">
                  <span>Total Presupuesto:</span>
                  <span>{formatCurrency(Number(project.budget_total))}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expenses">
          <Card>
            <CardHeader>
              <CardTitle>Gastos del Proyecto</CardTitle>
            </CardHeader>
            <CardContent>
              {expenses.length > 0 ? (
                <div className="space-y-3">
                  {expenses.map(expense => (
                    <div
                      key={expense.id}
                      className="flex items-center justify-between p-3 border rounded"
                    >
                      <div>
                        <p className="font-medium">
                          {expense.description || "Gasto sin descripción"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(expense.date)} •{" "}
                          {expense.vendor || "Sin proveedor"} •{" "}
                          {expense.category}
                        </p>
                      </div>
                      <span className="font-semibold">
                        {formatCurrency(Number(expense.amount))}
                      </span>
                    </div>
                  ))}
                  <div className="pt-4 border-t">
                    <div className="flex justify-between items-center text-lg font-semibold">
                      <span>Total Gastos:</span>
                      <span className="text-red-600">
                        {formatCurrency(totalExpenses)}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No hay gastos registrados para este proyecto
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="incomes">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Ingresos del Proyecto</CardTitle>
                <Button 
                  onClick={() => setShowIncomeDialog(true)}
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Agregar Ingreso
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {incomes.length > 0 ? (
                <div className="space-y-3">
                  {incomes.map(income => (
                    <div
                      key={income.id}
                      className="flex items-center justify-between p-3 border rounded"
                    >
                      <div>
                        <p className="font-medium">
                          {income.concept || "Ingreso sin concepto"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(income.date)} • {income.payment_method === "transfer" ? "Transferencia" : 
                           income.payment_method === "cash" ? "Efectivo" :
                           income.payment_method === "check" ? "Cheque" : "Tarjeta"}
                          {income.invoice_number && ` • Factura: ${income.invoice_number}`}
                        </p>
                        {income.notes && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {income.notes}
                          </p>
                        )}
                      </div>
                      <span className="font-semibold text-green-600">
                        {formatCurrency(Number(income.amount))}
                      </span>
                    </div>
                  ))}
                  <div className="pt-4 border-t">
                    <div className="flex justify-between items-center text-lg font-semibold">
                      <span>Total Ingresos:</span>
                      <span className="text-green-600">
                        {formatCurrency(incomes.reduce((sum, income) => sum + Number(income.amount), 0))}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No hay ingresos registrados para este proyecto
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="personnel">
          <div className="space-y-6">
            {/* Personal Oficialmente Asignado */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Personal Oficialmente Asignado ({workingAssignedPersonnel.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {workingAssignedPersonnel.length > 0 ? (
                  <div className="space-y-4">
                    {workingAssignedPersonnel.map(person => (
                      <div key={person.id} className="p-4 border rounded-lg bg-green-50/50">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">{person.name}</h4>
                          <Badge variant="outline">{person.position}</Badge>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                          <div>
                            <span className="font-medium">Horas trabajadas:</span>
                            <p>
                              {getEmployeeTimeData(person.id).regularHours.toFixed(1)} horas
                            </p>
                          </div>
                          <div>
                            <span className="font-medium">Horas extra:</span>
                            <p>
                              {getEmployeeTimeData(person.id).overtimeHours.toFixed(1)} horas
                            </p>
                          </div>
                          <div>
                            <span className="font-medium">Pago total:</span>
                            <p className="text-blue-600">
                              {formatCurrency(getPersonTotalPay(person))}
                            </p>
                          </div>
                        </div>
                        <div className="mt-2 text-sm text-gray-600">
                          <span className="font-medium">Período:</span>
                          <span className="ml-2">
                            {getEmployeeTimeData(person.id).period || "Sin registros"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <p className="text-gray-500">
                      No hay personal oficialmente asignado registrando horas
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Personal No Asignado */}
            {unassignedPersonnel.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-orange-500" />
                    Personal No Asignado ({unassignedPersonnel.length})
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Empleados que han registrado horas pero no están oficialmente asignados al proyecto
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {unassignedPersonnel.map(person => (
                      <div key={person.id} className="p-4 border rounded-lg bg-orange-50/50 border-orange-200">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">{person.name}</h4>
                          <Badge variant="outline" className="border-orange-300 text-orange-700">
                            {person.position}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                          <div>
                            <span className="font-medium">Horas trabajadas:</span>
                            <p>
                              {getEmployeeTimeData(person.id).regularHours.toFixed(1)} horas
                            </p>
                          </div>
                          <div>
                            <span className="font-medium">Horas extra:</span>
                            <p>
                              {getEmployeeTimeData(person.id).overtimeHours.toFixed(1)} horas
                            </p>
                          </div>
                          <div>
                            <span className="font-medium">Pago total:</span>
                            <p className="text-orange-600">
                              {formatCurrency(getPersonTotalPay(person))}
                            </p>
                          </div>
                        </div>
                        <div className="mt-2 text-sm text-gray-600">
                          <span className="font-medium">Período:</span>
                          <span className="ml-2">
                            {getEmployeeTimeData(person.id).period || "Sin registros"}
                          </span>
                        </div>
                        <div className="mt-2 text-xs text-orange-600 bg-orange-100 p-2 rounded">
                          ⚠️ Este empleado no está oficialmente asignado al proyecto
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Resumen Total */}
            <Card>
              <CardHeader>
                <CardTitle>Resumen Total del Proyecto</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <p className="text-sm text-gray-600">Total Personal Trabajando</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {workingAssignedPersonnel.length + unassignedPersonnel.length}
                    </p>
                    <p className="text-xs text-gray-500">
                      {workingAssignedPersonnel.length} asignados + {unassignedPersonnel.length} no asignados
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-600">Costo Total</p>
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(timeTrackingSummary?.totalCost || 0)}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-600">Horas Totales</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {timeTrackingSummary?.totalHours?.toFixed(1) || "0.0"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Income Dialog */}
      <IncomeDialog
        open={showIncomeDialog}
        onOpenChange={setShowIncomeDialog}
        projectId={id}
        onSuccess={() => {
          loadProjectData(); // Refresh project data to update incomes
        }}
      />
    </div>
  );
}
