'use client';

import { notFound } from 'next/navigation';
import { useState, use, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { api, handleApiError } from '@/lib/api';
import type { Project, Client, Expense, TimeEntry, Personnel } from '@/lib/api';
import { formatCurrency, formatDate, getProjectStatusColor, getProjectStatusLabel } from '@/lib/finance';
import { useTranslations } from '@/lib/i18n';
import { ArrowLeft, Edit, Users, DollarSign, Clock } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

interface ProjectDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const { id } = use(params);
  const t = useTranslations('es');
  
  // State for API data
  const [project, setProject] = useState<Project | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [assignedPersonnel, setAssignedPersonnel] = useState<Personnel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
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
          console.warn('Could not load client:', err);
        }
      }
      
      // Load project expenses
      try {
        const expensesResult = await api.projects.getExpenses(id);
        const expensesData = Array.isArray(expensesResult) ? expensesResult : 
                           (Array.isArray(expensesResult.data) ? expensesResult.data : []);
        setExpenses(expensesData);
      } catch (err) {
        console.warn('Could not load expenses:', err);
        setExpenses([]);
      }
      
      // Load assigned personnel
      try {
        const personnelResult = await api.projects.getAssignedPersonnel(id);
        const personnelData = Array.isArray(personnelResult) ? personnelResult : 
                             (Array.isArray(personnelResult.data) ? personnelResult.data : []);
        setAssignedPersonnel(personnelData);
      } catch (err) {
        console.warn('Could not load personnel:', err);
        setAssignedPersonnel([]);
      }
      
    } catch (err) {
      const errorMessage = handleApiError(err);
      setError(errorMessage);
      console.error('Error loading project data:', err);
      toast.error('Error cargando proyecto: ' + errorMessage);
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

  const totalExpenses = expenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
  const totalPersonnelCost = assignedPersonnel.reduce((sum, person) => sum + (Number(person.total_pay) || 0), 0);
  const remainingBudget = Number(project.budget_total) - Number(project.spent_total);

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
            <p className="text-muted-foreground text-lg">{client?.name || 'Sin cliente'}</p>
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
                    <span>{project.start_date ? formatDate(project.start_date) : 'No definida'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Fin:</span>
                    <span>{project.end_date ? formatDate(project.end_date) : 'No definida'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Estimada:</span>
                    <span>{project.estimated_end_date ? formatDate(project.estimated_end_date) : 'No definida'}</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="font-semibold mb-2">Progreso</h3>
                <div className="space-y-2">
                  <Progress value={project.progress} className="h-3" />
                  <p className="text-sm text-muted-foreground">{project.progress}% completado</p>
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
                <span className="font-semibold">{formatCurrency(Number(project.budget_total))}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Gastado:</span>
                <span className="font-semibold text-red-600">{formatCurrency(Number(project.spent_total))}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Costo Mano de Obra:</span>
                <span className="font-semibold text-blue-600">{formatCurrency(totalPersonnelCost)}</span>
              </div>
              <div className="flex justify-between items-center text-xs text-gray-500">
                <span>{assignedPersonnel.length} empleados</span>
                <span>{assignedPersonnel.reduce((sum, p) => sum + Number(p.total_hours || 0), 0).toFixed(1)} horas totales</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t">
                <span className="text-sm">Restante:</span>
                <span className={`font-semibold ${remainingBudget >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(remainingBudget)}
                </span>
              </div>
            </div>
            
            <div className="pt-4">
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>Uso del presupuesto</span>
                <span>{Number(project.budget_total) > 0 ? Math.round((Number(project.spent_total) / Number(project.budget_total)) * 100) : 0}%</span>
              </div>
              <Progress 
                value={Number(project.budget_total) > 0 ? (Number(project.spent_total) / Number(project.budget_total)) * 100 : 0} 
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
          <TabsTrigger value="personnel">Personal ({assignedPersonnel.length})</TabsTrigger>
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
                    <span className="font-semibold">{formatCurrency(Number(project.budget_materials))}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 border rounded">
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4 text-blue-600" />
                      <span className="font-medium">Mano de Obra</span>
                    </div>
                    <span className="font-semibold">{formatCurrency(Number(project.budget_labor))}</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 border rounded">
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-yellow-600" />
                      <span className="font-medium">Equipos</span>
                    </div>
                    <span className="font-semibold">{formatCurrency(Number(project.budget_equipment))}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 border rounded">
                    <div className="flex items-center space-x-2">
                      <DollarSign className="h-4 w-4 text-purple-600" />
                      <span className="font-medium">Gastos Generales</span>
                    </div>
                    <span className="font-semibold">{formatCurrency(Number(project.budget_overhead))}</span>
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
                  {expenses.map((expense) => (
                    <div key={expense.id} className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <p className="font-medium">{expense.description || 'Gasto sin descripción'}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(expense.date)} • {expense.vendor || 'Sin proveedor'} • {expense.category}
                        </p>
                      </div>
                      <span className="font-semibold">{formatCurrency(Number(expense.amount))}</span>
                    </div>
                  ))}
                  <div className="pt-4 border-t">
                    <div className="flex justify-between items-center text-lg font-semibold">
                      <span>Total Gastos:</span>
                      <span className="text-red-600">{formatCurrency(totalExpenses)}</span>
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

        <TabsContent value="personnel">
          <Card>
            <CardHeader>
              <CardTitle>Personal Asignado</CardTitle>
            </CardHeader>
            <CardContent>
              {assignedPersonnel.length > 0 ? (
                <div className="space-y-4">
                  {assignedPersonnel.map((person) => (
                    <div key={person.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{person.name}</h4>
                        <Badge variant="outline">{person.position}</Badge>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                        <div>
                          <span className="font-medium">Horas trabajadas:</span>
                          <p>{Number(person.total_hours || 0).toFixed(1)} horas</p>
                        </div>
                        <div>
                          <span className="font-medium">Horas extra:</span>
                          <p>{Number(person.total_overtime_hours || 0).toFixed(1)} horas</p>
                        </div>
                        <div>
                          <span className="font-medium">Pago total:</span>
                          <p className="text-blue-600">{formatCurrency(Number(person.total_pay || 0))}</p>
                        </div>
                      </div>
                      <div className="mt-2 text-sm text-gray-600">
                        <span className="font-medium">Período:</span>
                        <span className="ml-2">
                          {person.first_work_date ? formatDate(person.first_work_date) : ''} - 
                          {person.last_work_date ? formatDate(person.last_work_date) : 'Presente'}
                        </span>
                      </div>
                    </div>
                  ))}
                  <div className="pt-4 border-t">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center">
                        <p className="text-sm text-gray-600">Total Personal</p>
                        <p className="text-2xl font-bold text-blue-600">{assignedPersonnel.length}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-600">Costo Total</p>
                        <p className="text-2xl font-bold text-green-600">{formatCurrency(totalPersonnelCost)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-600">Horas Totales</p>
                        <p className="text-2xl font-bold text-purple-600">
                          {assignedPersonnel.reduce((sum, p) => sum + Number(p.total_hours || 0), 0).toFixed(1)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-500">No hay personal asignado a este proyecto</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}