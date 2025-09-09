"use client";

import { useEffect, useState } from "react";
import { KPICard } from "@/components/dashboard/kpi-card";
import { TopProjects } from "@/components/dashboard/top-projects-api";
import { CashflowChart } from "@/components/dashboard/cashflow-chart-api";
import { UpcomingPaymentsCard } from "@/components/dashboard/upcoming-payments-card";
import { PersonnelKPIs } from "@/components/dashboard/personnel-kpis-api";
import { useTranslations } from "@/lib/i18n";
import { api, handleApiError } from "@/lib/api";
import type { ExecutiveDashboardData } from "@/lib/api";
import { FolderOpen, TrendingUp, TrendingDown, DollarSign } from "lucide-react";

export default function DashboardAPI() {
  const _t = useTranslations("es");
  const [dashboardData, setDashboardData] =
    useState<ExecutiveDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cargar datos del dashboard ejecutivo
  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.reports.getExecutiveDashboard();
      setDashboardData(data);
    } catch (err) {
      const errorMessage = handleApiError(err);
      setError(errorMessage);
      console.error("Error loading dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6" suppressHydrationWarning>
        <div suppressHydrationWarning>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Dashboard Ejecutivo
          </h1>
          <p className="text-muted-foreground">
            Cargando datos empresariales...
          </p>
        </div>
        <div
          className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
          suppressHydrationWarning
        >
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-32 bg-gray-100 animate-pulse rounded-lg"
            />
          ))}
        </div>
        <div className="grid gap-6 md:grid-cols-12">
          <div className="md:col-span-4 h-64 bg-gray-100 animate-pulse rounded-lg" />
          <div className="md:col-span-3 h-64 bg-gray-100 animate-pulse rounded-lg" />
          <div className="md:col-span-5 h-64 bg-gray-100 animate-pulse rounded-lg" />
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Dashboard Ejecutivo
          </h1>
          <p className="text-red-600">Error cargando datos: {error}</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Error de Conexión
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>No se pudo conectar con el servidor backend.</p>
                <p className="mt-1">
                  <strong>Verifica:</strong>
                </p>
                <ul className="list-disc list-inside mt-1">
                  <li>El servidor backend esté ejecutándose (puerto 3001)</li>
                  <li>PostgreSQL esté disponible</li>
                  <li>Los seeds hayan sido cargados</li>
                </ul>
              </div>
              <div className="mt-3">
                <button
                  onClick={loadDashboardData}
                  className="bg-red-100 text-red-800 px-3 py-1 rounded text-sm hover:bg-red-200"
                >
                  Reintentar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Dashboard Ejecutivo
          </h1>
          <p className="text-muted-foreground">No hay datos disponibles</p>
        </div>
      </div>
    );
  }

  const { kpis, riskyProjects } = dashboardData;

  return (
    <div className="space-y-6" suppressHydrationWarning>
      {/* Page Header */}
      <div suppressHydrationWarning>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
          Dashboard Ejecutivo HYR
        </h1>
        <p className="text-muted-foreground">
          Resumen en tiempo real de tu constructora y soldadura
        </p>
      </div>

      {/* KPI Cards - Datos reales de PostgreSQL */}
      <div
        className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
        suppressHydrationWarning
      >
        <KPICard
          title="Proyectos Activos"
          value={kpis.active_projects}
          icon={FolderOpen}
          trend={{
            value:
              kpis.active_projects > 0
                ? Math.round((kpis.active_projects / kpis.total_projects) * 100)
                : 0,
            isPositive: kpis.active_projects > 0,
          }}
        />
        <KPICard
          title="Ingresos del Mes"
          value={kpis.revenue_this_month}
          icon={TrendingUp}
          isCurrency
          trend={{
            value: kpis.profit_margin_percent,
            isPositive: kpis.profit_margin_percent > 0,
          }}
        />
        <KPICard
          title="Costos del Mes"
          value={kpis.expenses_this_month + kpis.total_payroll_cost}
          icon={TrendingDown}
          isCurrency
          trend={{
            value: Math.round(
              (kpis.expenses_this_month / (kpis.revenue_this_month || 1)) * 100
            ),
            isPositive: false,
          }}
        />
        <KPICard
          title="Utilidad Neta"
          value={kpis.net_profit_this_month}
          icon={DollarSign}
          isCurrency
          trend={{
            value: kpis.profit_margin_percent,
            isPositive: kpis.net_profit_this_month > 0,
          }}
        />
      </div>

      {/* Información adicional de nómina con compliance 2025 */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-500">
          <h3 className="text-sm font-medium text-gray-600">
            Empleados en Nómina
          </h3>
          <p className="text-2xl font-bold text-gray-900">
            {kpis.employees_paid}
          </p>
          <p className="text-sm text-green-600">✓ Compliance 2025</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-500">
          <h3 className="text-sm font-medium text-gray-600">
            Costo Total Nómina
          </h3>
          <p className="text-2xl font-bold text-blue-600">
            {new Intl.NumberFormat("es-CO", {
              style: "currency",
              currency: "COP",
              minimumFractionDigits: 0,
            }).format(kpis.total_payroll_cost)}
          </p>
          <p className="text-sm text-gray-500">FSP + Law 114-1 + ARL</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-purple-500">
          <h3 className="text-sm font-medium text-gray-600">SMMLV 2025</h3>
          <p className="text-2xl font-bold text-purple-600">$1,423,500</p>
          <p className="text-sm text-gray-500">Auxilio: $200,000</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-orange-500">
          <h3 className="text-sm font-medium text-gray-600">
            Proyectos Completados
          </h3>
          <p className="text-2xl font-bold text-green-600">
            {kpis.completed_this_month}
          </p>
          <p className="text-sm text-gray-500">Este mes</p>
        </div>
      </div>

      {/* Proyectos de Riesgo */}
      {riskyProjects && riskyProjects.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="text-lg font-medium text-yellow-800 mb-3">
            ⚠️ Proyectos que Requieren Atención
          </h3>
          <div className="space-y-2">
            {riskyProjects.map((project, index) => (
              <div
                key={index}
                className="flex justify-between items-center bg-white p-3 rounded"
              >
                <div>
                  <p className="font-medium">{project.name}</p>
                  <p className="text-sm text-gray-600">
                    Gastado: {project.spent_percentage}% | Progreso:{" "}
                    {project.progress}%
                  </p>
                </div>
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    project.risk_level === "CRÍTICO"
                      ? "bg-red-100 text-red-800"
                      : project.risk_level === "ALTO RIESGO"
                        ? "bg-orange-100 text-orange-800"
                        : "bg-yellow-100 text-yellow-800"
                  }`}
                >
                  {project.risk_level}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Charts and Lists */}
      <div className="grid gap-6 md:grid-cols-12">
        {/* Top Projects */}
        <div className="md:col-span-4">
          <TopProjects />
        </div>

        {/* Upcoming Payments */}
        <div className="md:col-span-3">
          <UpcomingPaymentsCard />
        </div>

        {/* Cashflow Chart */}
        <div className="md:col-span-5">
          <CashflowChart />
        </div>
      </div>

      {/* Personnel KPIs */}
      <PersonnelKPIs />

      {/* Footer con información del sistema */}
      <div className="text-center text-sm text-gray-500 pt-4 border-t">
        <p>
          Dashboard conectado a PostgreSQL • {kpis.total_projects} proyectos •{" "}
          {kpis.employees_paid} empleados
        </p>
        <p>Sistema de Gestión HYR Constructora & Soldadura</p>
      </div>
    </div>
  );
}
