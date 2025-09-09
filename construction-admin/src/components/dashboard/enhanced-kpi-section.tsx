"use client";

import React from "react";
import { ProgressRing, ProgressRingCard } from "@/components/ui/progress-ring";
import { BarChart, MiniBarChart } from "@/components/ui/bar-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  TrendingUp,
  Users,
  FolderOpen,
  DollarSign,
  CheckCircle,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { safeNumber } from "@/lib/finance";

interface KPIData {
  active_projects: number;
  total_projects: number;
  revenue_this_month: number;
  expenses_this_month: number;
  total_payroll_cost: number;
  net_profit_this_month: number;
  employees_paid: number;
  profit_margin_percent: number;
  completed_this_month: number;
}

interface EnhancedKPISectionProps {
  kpis: KPIData;
  className?: string;
}

export function EnhancedKPISection({
  kpis,
  className,
}: EnhancedKPISectionProps) {
  // Calculate additional metrics with safe number validation
  const safeExpenses = safeNumber(kpis.expenses_this_month);
  const safePayrollCost = safeNumber(kpis.total_payroll_cost);
  const safeRevenue = safeNumber(kpis.revenue_this_month);
  const safeProfitMargin = safeNumber(kpis.profit_margin_percent);
  const safeNetProfit = safeNumber(kpis.net_profit_this_month);

  const totalCosts = safeExpenses + safePayrollCost;
  const budgetUtilization =
    safeRevenue > 0 ? (totalCosts / safeRevenue) * 100 : 0;

  const projectCompletion =
    safeNumber(kpis.total_projects) > 0
      ? (safeNumber(kpis.completed_this_month) /
          safeNumber(kpis.total_projects)) *
        100
      : 0;

  // Mock data for trends (in real app, this would come from API)
  const monthlyRevenueTrend = [
    65000000,
    72000000,
    68000000,
    85000000,
    92000000,
    kpis.revenue_this_month,
  ];
  const dailyActiveProjects = [4, 4, 5, 4, 4, 4, kpis.active_projects];

  const formatCurrency = (amount: number) => {
    const safeAmount = safeNumber(amount);
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(safeAmount);
  };

  const formatCompactCurrency = (amount: number) => {
    const safeAmount = safeNumber(amount);
    if (safeAmount >= 1000000000) {
      return `$${(safeAmount / 1000000000).toFixed(1)}B`;
    } else if (safeAmount >= 1000000) {
      return `$${(safeAmount / 1000000).toFixed(1)}M`;
    } else if (safeAmount >= 1000) {
      return `$${(safeAmount / 1000).toFixed(0)}K`;
    }
    return formatCurrency(safeAmount);
  };

  return (
    <div className={cn("space-y-8", className)}>
      {/* Enhanced KPI Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* Revenue Card with Trend */}
        <Card className="hyr-card border-l-4 border-l-[hsl(var(--success))] bg-gradient-to-r from-[hsl(var(--success-light))] to-transparent">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Ingresos del Mes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-2xl font-bold text-[hsl(var(--success))]">
                  {formatCompactCurrency(safeRevenue)}
                </div>
                <div className="flex items-center text-sm text-muted-foreground">
                  <TrendingUp className="h-3 w-3 mr-1" />+
                  {safeProfitMargin.toFixed(1)}% utilidad
                </div>
              </div>
              <div className="h-12 w-12 rounded-xl bg-[hsl(var(--success))]/10 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-[hsl(var(--success))]" />
              </div>
            </div>
            <MiniBarChart
              data={monthlyRevenueTrend}
              variant="success"
              height={32}
            />
          </CardContent>
        </Card>

        {/* Projects Progress Ring */}
        <ProgressRingCard
          title="Proyectos Activos"
          progress={
            (safeNumber(kpis.active_projects) /
              Math.max(1, safeNumber(kpis.total_projects))) *
            100
          }
          value={safeNumber(kpis.active_projects)}
          subtitle={`de ${safeNumber(kpis.total_projects)} totales`}
          variant="primary"
        />

        {/* Budget Utilization */}
        <ProgressRingCard
          title="Utilización Presupuesto"
          progress={Math.min(budgetUtilization, 100)}
          value={`${budgetUtilization.toFixed(0)}%`}
          subtitle="Gastos vs Ingresos"
          variant={
            budgetUtilization > 90
              ? "danger"
              : budgetUtilization > 75
                ? "warning"
                : "success"
          }
        />

        {/* Employees Cost Card */}
        <Card className="hyr-card border-l-4 border-l-primary bg-gradient-to-r from-primary/5 to-transparent">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Nómina Mensual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-2xl font-bold text-primary">
                  {formatCompactCurrency(safePayrollCost)}
                </div>
                <div className="text-sm text-muted-foreground">
                  {safeNumber(kpis.employees_paid)} empleados activos
                </div>
              </div>
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Users className="h-6 w-6 text-primary" />
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              Promedio:{" "}
              {formatCompactCurrency(
                safePayrollCost / Math.max(1, safeNumber(kpis.employees_paid))
              )}{" "}
              por empleado
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Financial Overview with Charts */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Cost Breakdown */}
        <BarChart
          title="Distribución de Costos"
          data={[
            {
              label: "Nómina",
              value: safePayrollCost,
              variant: "primary",
            },
            {
              label: "Gastos",
              value: safeExpenses,
              variant: "warning",
            },
            {
              label: "Utilidad",
              value: Math.max(0, safeNetProfit),
              variant: "success",
            },
          ]}
          orientation="horizontal"
          showValues={true}
        />

        {/* Project Status Overview */}
        <Card className="hyr-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5 text-primary" />
              Estado de Proyectos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-[hsl(var(--success))]/10 flex items-center justify-center">
                    <CheckCircle className="h-5 w-5 text-[hsl(var(--success))]" />
                  </div>
                  <div>
                    <p className="font-medium">Completados</p>
                    <p className="text-sm text-muted-foreground">Este mes</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-[hsl(var(--success))]">
                    {safeNumber(kpis.completed_this_month)}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Clock className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">En Progreso</p>
                    <p className="text-sm text-muted-foreground">Actualmente</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-primary">
                    {safeNumber(kpis.active_projects)}
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Tasa de Completación</span>
                  <span>{projectCompletion.toFixed(1)}%</span>
                </div>
                <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[hsl(var(--success))] transition-all duration-1000 ease-out"
                    style={{ width: `${projectCompletion}%` }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Financial Health Indicator */}
        <Card className="hyr-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              Salud Financiera
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="text-center">
                <ProgressRing
                  progress={Math.max(0, safeProfitMargin)}
                  variant={
                    safeProfitMargin > 15
                      ? "success"
                      : safeProfitMargin > 5
                        ? "warning"
                        : "danger"
                  }
                  size={100}
                  strokeWidth={6}
                >
                  <div className="text-center">
                    <div className="text-lg font-bold text-foreground">
                      {safeProfitMargin.toFixed(1)}%
                    </div>
                    <div className="text-xs text-muted-foreground">Margen</div>
                  </div>
                </ProgressRing>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    Ingresos
                  </span>
                  <span className="font-medium text-[hsl(var(--success))]">
                    {formatCompactCurrency(safeRevenue)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Costos</span>
                  <span className="font-medium text-[hsl(var(--warning))]">
                    {formatCompactCurrency(totalCosts)}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="text-sm font-medium">Utilidad Neta</span>
                  <span
                    className={cn(
                      "font-bold",
                      safeNetProfit > 0
                        ? "text-[hsl(var(--success))]"
                        : "text-[hsl(var(--destructive))]"
                    )}
                  >
                    {formatCompactCurrency(safeNetProfit)}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
