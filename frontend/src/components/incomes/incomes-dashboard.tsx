"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTranslations } from "@/lib/i18n";
import { api } from "@/lib/api";
import type { ProjectIncome, IncomesSummary, Project } from "@/lib/api";
import { toast } from "sonner";
import { 
  TrendingUp,
  BarChart3,
  RefreshCw,
  CreditCard,
  Banknote,
  Receipt
} from "lucide-react";
import { IncomesSummaryCards } from "./incomes-summary-cards";
import { IncomesChart } from "./incomes-chart";
import { format, subMonths, startOfMonth } from "date-fns";
import { es } from "date-fns/locale";

interface IncomesDashboardProps {
  incomes: ProjectIncome[];
  summary: IncomesSummary | null;
  onRefresh: () => void;
}

interface MonthlyData {
  month: string;
  total: number;
  count: number;
}

interface ProjectWithIncome {
  id: string;
  name: string;
  totalIncome: number;
  incomeCount: number;
}

interface PaymentMethodStats {
  method: string;
  label: string;
  total: number;
  count: number;
  percentage: number;
  icon: React.ComponentType<{ className?: string }>;
}

export function IncomesDashboard({ incomes, summary, onRefresh }: IncomesDashboardProps) {
  const t = useTranslations("es");
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);

  // Load projects for better display
  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const result = await api.projects.getAll();
      const projectsData = Array.isArray(result) ? result : 
        Array.isArray((result as {data?: Project[]}).data) ? (result as {data: Project[]}).data : [];
      setProjects(projectsData);
    } catch (err) {
      console.warn("Could not load projects:", err);
      setProjects([]);
    }
  };

  // Calculate monthly trends
  const monthlyTrends = useMemo(() => {
    const months: MonthlyData[] = [];
    
    for (let i = 5; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      const monthKey = format(startOfMonth(date), "yyyy-MM");
      const monthLabel = format(date, "MMM yyyy", { locale: es });
      
      const monthIncomes = incomes.filter(income => 
        income.date && income.date.startsWith(monthKey)
      );
      
      months.push({
        month: monthLabel,
        total: monthIncomes.reduce((sum, income) => sum + (income.amount || 0), 0),
        count: monthIncomes.length
      });
    }
    
    return months;
  }, [incomes]);

  // Calculate current month data
  const currentMonthData = useMemo(() => {
    const currentMonth = format(new Date(), "yyyy-MM");
    const currentMonthIncomes = incomes.filter(income => 
      income.date && income.date.startsWith(currentMonth)
    );
    
    const total = currentMonthIncomes.reduce((sum, income) => sum + (income.amount || 0), 0);
    
    // Previous month for comparison
    const previousMonth = format(subMonths(new Date(), 1), "yyyy-MM");
    const previousMonthIncomes = incomes.filter(income => 
      income.date && income.date.startsWith(previousMonth)
    );
    const previousTotal = previousMonthIncomes.reduce((sum, income) => sum + (income.amount || 0), 0);
    
    const growth = previousTotal > 0 ? ((total - previousTotal) / previousTotal) * 100 : 0;
    
    return {
      total,
      count: currentMonthIncomes.length,
      growth,
      previousTotal
    };
  }, [incomes]);

  // Calculate top projects by income
  const topProjectsByIncome = useMemo(() => {
    const projectIncomes: { [key: string]: ProjectWithIncome } = {};
    
    incomes.forEach(income => {
      if (!income.project_id) return;
      
      if (!projectIncomes[income.project_id]) {
        const project = projects.find(p => p.id === income.project_id);
        projectIncomes[income.project_id] = {
          id: income.project_id,
          name: project?.name || income.project_name || `Proyecto ${income.project_id.slice(0, 8)}`,
          totalIncome: 0,
          incomeCount: 0
        };
      }
      
      projectIncomes[income.project_id].totalIncome += income.amount || 0;
      projectIncomes[income.project_id].incomeCount += 1;
    });
    
    return Object.values(projectIncomes)
      .sort((a, b) => b.totalIncome - a.totalIncome)
      .slice(0, 5);
  }, [incomes, projects]);

  // Calculate payment method distribution
  const paymentMethodStats = useMemo(() => {
    const methodStats: { [key: string]: { total: number; count: number } } = {};
    const totalAmount = incomes.reduce((sum, income) => sum + (income.amount || 0), 0);
    
    incomes.forEach(income => {
      const method = income.payment_method || 'transfer';
      if (!methodStats[method]) {
        methodStats[method] = { total: 0, count: 0 };
      }
      methodStats[method].total += income.amount || 0;
      methodStats[method].count += 1;
    });
    
    const methodLabels = {
      transfer: 'Transferencia',
      cash: 'Efectivo',
      check: 'Cheque',
      card: 'Tarjeta'
    };
    
    const methodIcons = {
      transfer: CreditCard,
      cash: Banknote,
      check: Receipt,
      card: CreditCard
    };
    
    return Object.entries(methodStats).map(([method, stats]) => ({
      method,
      label: methodLabels[method as keyof typeof methodLabels] || method,
      total: stats.total,
      count: stats.count,
      percentage: totalAmount > 0 ? (stats.total / totalAmount) * 100 : 0,
      icon: methodIcons[method as keyof typeof methodIcons] || CreditCard
    })).sort((a, b) => b.total - a.total);
  }, [incomes]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatCompactCurrency = (amount: number) => {
    if (amount >= 1000000000) {
      return `$${(amount / 1000000000).toFixed(1)}B`;
    } else if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(0)}K`;
    }
    return formatCurrency(amount);
  };

  const handleRefresh = async () => {
    setLoading(true);
    try {
      await onRefresh();
      toast.success("Datos actualizados");
    } catch (err) {
      toast.error("Error al actualizar datos");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with refresh button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Dashboard de Ingresos</h2>
          <p className="text-muted-foreground">
            Resumen financiero y análisis de ingresos empresariales
          </p>
        </div>
        <Button onClick={handleRefresh} disabled={loading} variant="outline" size="sm">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      {/* Summary Cards */}
      <IncomesSummaryCards 
        summary={summary}
        currentMonth={currentMonthData}
        totalIncomes={incomes.length}
      />

      {/* Charts and Analytics */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Monthly Trends Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              {t.incomes.monthlyTrends}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <IncomesChart data={monthlyTrends} />
          </CardContent>
        </Card>

        {/* Payment Methods Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              {t.incomes.paymentDistribution}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {paymentMethodStats.length > 0 ? (
                paymentMethodStats.map((method) => {
                  const Icon = method.icon;
                  return (
                    <div key={method.method} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Icon className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{method.label}</p>
                          <p className="text-sm text-muted-foreground">
                            {method.count} transacciones
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatCompactCurrency(method.total)}</p>
                        <p className="text-sm text-muted-foreground">
                          {method.percentage.toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <CreditCard className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No hay datos de métodos de pago</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Projects by Income */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            {t.incomes.topProjects}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {topProjectsByIncome.length > 0 ? (
              topProjectsByIncome.map((project, index) => (
                <div key={project.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-bold text-primary">#{index + 1}</span>
                    </div>
                    <div>
                      <p className="font-medium">{project.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {project.incomeCount} ingresos registrados
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-600">
                      {formatCompactCurrency(project.totalIncome)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Promedio: {formatCompactCurrency(project.totalIncome / project.incomeCount)}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No hay datos de proyectos con ingresos</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}