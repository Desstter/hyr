"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslations } from "@/lib/i18n";
import { api, handleApiError } from "@/lib/api";
import type { ProjectIncome, IncomesSummary } from "@/lib/api";
import { toast } from "sonner";
import { TrendingUp, Plus, DollarSign, BarChart3, Calendar } from "lucide-react";
import { IncomeDialog } from "@/components/incomes/income-dialog";
import { IncomesDashboard } from "@/components/incomes/incomes-dashboard";
import { IncomesList } from "@/components/incomes/incomes-list";

export default function IncomesPage() {
  const t = useTranslations("es");
  
  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [incomes, setIncomes] = useState<ProjectIncome[]>([]);
  const [summary, setSummary] = useState<IncomesSummary | null>(null);
  const [showIncomeDialog, setShowIncomeDialog] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");

  // Load data
  useEffect(() => {
    loadIncomesData();
  }, []);

  const loadIncomesData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load incomes and summary in parallel
      const [incomesResult, summaryResult] = await Promise.all([
        api.incomes.getAllIncomes({ limit: 100 }),
        api.incomes.getIncomesSummary()
      ]);

      setIncomes(Array.isArray(incomesResult) ? incomesResult : []);
      setSummary(summaryResult);
    } catch (err) {
      const errorMessage = handleApiError(err);
      setError(errorMessage);
      console.error("Error loading incomes data:", err);
      toast.error("Error cargando datos de ingresos: " + errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleIncomeSuccess = () => {
    loadIncomesData();
  };

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6" suppressHydrationWarning>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {t.incomes.title}
            </h1>
            <p className="text-muted-foreground">
              Gestión y análisis de ingresos empresariales
            </p>
          </div>
        </div>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-32 bg-gray-100 animate-pulse rounded-lg"
            />
          ))}
        </div>
        
        <div className="h-64 bg-gray-100 animate-pulse rounded-lg" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t.incomes.title}
          </h1>
          <p className="text-red-600">Error: {error}</p>
        </div>
        
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Error de Conexión
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>No se pudo cargar los datos de ingresos.</p>
                <p className="mt-1">
                  <strong>Verifica:</strong>
                </p>
                <ul className="list-disc list-inside mt-1">
                  <li>El servidor backend esté ejecutándose (puerto 3001)</li>
                  <li>La conexión a la base de datos</li>
                </ul>
              </div>
              <div className="mt-3">
                <Button
                  onClick={loadIncomesData}
                  size="sm"
                  variant="outline"
                >
                  Reintentar
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" suppressHydrationWarning>
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <TrendingUp className="h-8 w-8 text-green-600" />
            {t.incomes.title}
          </h1>
          <p className="text-muted-foreground">
            Gestión completa de ingresos empresariales y análisis financiero
          </p>
        </div>
        <Button onClick={() => setShowIncomeDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          {t.incomes.newIncome}
        </Button>
      </div>

      {/* Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            {t.incomes.dashboard}
          </TabsTrigger>
          <TabsTrigger value="list" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Lista de Ingresos
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            {t.incomes.analytics}
          </TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard">
          <IncomesDashboard 
            incomes={incomes} 
            summary={summary}
            onRefresh={loadIncomesData}
          />
        </TabsContent>

        {/* List Tab */}
        <TabsContent value="list">
          <IncomesList 
            incomes={incomes}
            onRefresh={loadIncomesData}
            onCreateIncome={() => setShowIncomeDialog(true)}
          />
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Análisis Avanzado de Ingresos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">Próximamente</p>
                  <p>Análisis de tendencias, proyecciones y reportes avanzados</p>
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
        onSuccess={handleIncomeSuccess}
      />
    </div>
  );
}