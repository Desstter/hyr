"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslations } from "@/lib/i18n";
import type { IncomesSummary } from "@/lib/api";
import { 
  TrendingUp, 
  DollarSign,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Hash
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface IncomesSummaryCardsProps {
  summary: IncomesSummary | null;
  currentMonth: {
    total: number;
    count: number;
    growth: number;
    previousTotal: number;
  };
}

export function IncomesSummaryCards({ 
  summary, 
  currentMonth 
}: IncomesSummaryCardsProps) {
  const t = useTranslations("es");

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


  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Total This Month */}
      <Card className="border-l-4 border-l-green-500 bg-gradient-to-r from-green-50 to-transparent">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            {t.incomes.totalThisMonth}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-2xl font-bold text-green-600">
                {formatCompactCurrency(currentMonth.total)}
              </div>
              <div className="flex items-center text-sm text-muted-foreground">
                {currentMonth.growth > 0 ? (
                  <>
                    <ArrowUpRight className="h-3 w-3 mr-1 text-green-600" />
                    <span className="text-green-600">+{currentMonth.growth.toFixed(1)}%</span>
                  </>
                ) : currentMonth.growth < 0 ? (
                  <>
                    <ArrowDownRight className="h-3 w-3 mr-1 text-red-600" />
                    <span className="text-red-600">{currentMonth.growth.toFixed(1)}%</span>
                  </>
                ) : (
                  <span className="text-muted-foreground">Sin cambio</span>
                )}
                <span className="ml-1">vs mes anterior</span>
              </div>
            </div>
            <div className="h-12 w-12 rounded-xl bg-green-500/10 flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            {currentMonth.count} ingresos registrados
          </div>
        </CardContent>
      </Card>

      {/* Total All Time */}
      <Card className="border-l-4 border-l-blue-500 bg-gradient-to-r from-blue-50 to-transparent">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Total Histórico
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {formatCompactCurrency(summary?.total_amount || 0)}
              </div>
              <div className="text-sm text-muted-foreground">
                Desde {summary?.first_income_date ? 
                  format(new Date(summary.first_income_date), "MMM yyyy", { locale: es }) : 
                  "inicio"
                }
              </div>
            </div>
            <div className="h-12 w-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            {summary?.total_incomes || 0} ingresos totales
          </div>
        </CardContent>
      </Card>

      {/* Average Monthly */}
      <Card className="border-l-4 border-l-purple-500 bg-gradient-to-r from-purple-50 to-transparent">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            {t.incomes.averageMonthly}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-2xl font-bold text-purple-600">
                {formatCompactCurrency(summary?.avg_amount || 0)}
              </div>
              <div className="text-sm text-muted-foreground">
                Por ingreso registrado
              </div>
            </div>
            <div className="h-12 w-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
              <BarChart3 className="h-6 w-6 text-purple-600" />
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            Promedio calculado sobre {summary?.total_incomes || 0} registros
          </div>
        </CardContent>
      </Card>

      {/* Projects with Income */}
      <Card className="border-l-4 border-l-orange-500 bg-gradient-to-r from-orange-50 to-transparent">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Proyectos con Ingresos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-2xl font-bold text-orange-600">
                {summary?.projects_with_incomes || 0}
              </div>
              <div className="text-sm text-muted-foreground">
                Proyectos activos
              </div>
            </div>
            <div className="h-12 w-12 rounded-xl bg-orange-500/10 flex items-center justify-center">
              <Hash className="h-6 w-6 text-orange-600" />
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            Último ingreso: {summary?.last_income_date ? 
              format(new Date(summary.last_income_date), "dd MMM yyyy", { locale: es }) : 
              "N/A"
            }
          </div>
        </CardContent>
      </Card>
    </div>
  );
}