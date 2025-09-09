"use client";

import { useEffect, useState } from "react";
import { TopProjects } from "@/components/dashboard/top-projects-api";
import { CashflowChart } from "@/components/dashboard/cashflow-chart-api";
import { UpcomingPaymentsCard } from "@/components/dashboard/upcoming-payments-card";
import { PersonnelKPIs } from "@/components/dashboard/personnel-kpis-api";
import { useTranslations } from "@/lib/i18n";
import { api, handleApiError } from "@/lib/api";
import type { ExecutiveDashboardData } from "@/lib/api";
import { EnhancedKPISection } from "@/components/dashboard/enhanced-kpi-section";
import {
  FolderOpen,
  AlertTriangle,
} from "lucide-react";

export default function Dashboard() {
  const _t = useTranslations("es");
  const [dashboardData, setDashboardData] =
    useState<ExecutiveDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cargar datos del dashboard ejecutivo desde PostgreSQL
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
            Dashboard HYR Constructora
          </h1>
          <p className="text-muted-foreground">
            Cargando datos empresariales desde PostgreSQL...
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
            Dashboard HYR Constructora
          </h1>
          <p className="text-red-600">Error cargando datos: {error}</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Error de Conexión con PostgreSQL
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>No se pudo conectar con el servidor backend.</p>
                <p className="mt-1">
                  <strong>Verifica:</strong>
                </p>
                <ul className="list-disc list-inside mt-1">
                  <li>El servidor backend esté ejecutándose (puerto 3001)</li>
                  <li>PostgreSQL esté disponible</li>
                  <li>Los seeds empresariales hayan sido cargados</li>
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
            Dashboard HYR Constructora
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
      <div
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        suppressHydrationWarning
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-r from-primary to-secondary flex items-center justify-center">
              <FolderOpen className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                HYR Constructora & Soldadura
              </h1>
              <p className="text-muted-foreground text-lg">
                Dashboard Empresarial
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-[hsl(var(--success))] animate-pulse"></div>
              <span>PostgreSQL conectado</span>
            </div>
            <span>•</span>
            <span>
              Datos actualizados:{" "}
              {new Date().toLocaleDateString("es-CO", {
                day: "2-digit",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-sm text-muted-foreground">Sistema v2.0</p>
            <p className="text-xs text-muted-foreground">
              Migrado 100% PostgreSQL
            </p>
          </div>
        </div>
      </div>

      {/* Enhanced KPI Section - Datos reales de PostgreSQL */}
      <EnhancedKPISection kpis={kpis} />

      {/* Proyectos de Riesgo */}
      {riskyProjects && riskyProjects.length > 0 && (
        <div className="hyr-card p-6 border-l-4 border-l-[hsl(var(--warning))] bg-gradient-to-r from-[hsl(var(--warning-light))] to-transparent">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-10 rounded-lg bg-[hsl(var(--warning))]/20 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-[hsl(var(--warning))]" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[hsl(var(--warning))]">
                Proyectos que Requieren Atención Inmediata
              </h3>
              <p className="text-sm text-muted-foreground">
                {riskyProjects.length} proyecto
                {riskyProjects.length > 1 ? "s" : ""} con alertas de riesgo
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {riskyProjects.map((project, index) => (
              <div
                key={index}
                className="hyr-card p-4 hover:shadow-md transition-all duration-200"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-foreground mb-2">
                      {project.name}
                    </h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Gastado:</span>
                        <span className="ml-2 font-medium">
                          {project.spent_percentage}%
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Progreso:</span>
                        <span className="ml-2 font-medium">
                          {project.progress}%
                        </span>
                      </div>
                    </div>

                    {/* Progress comparison bar */}
                    <div className="mt-3 space-y-2">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Presupuesto vs Progreso</span>
                        <span>
                          {project.spent_percentage > project.progress
                            ? "Sobregasto"
                            : "En línea"}
                        </span>
                      </div>
                      <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="absolute left-0 top-0 h-full bg-[hsl(var(--success))] transition-all duration-300"
                          style={{
                            width: `${Math.min(project.progress, 100)}%`,
                          }}
                        />
                        <div
                          className={`absolute left-0 top-0 h-full transition-all duration-300 ${
                            project.spent_percentage > project.progress
                              ? "bg-[hsl(var(--destructive))]"
                              : "bg-[hsl(var(--warning))]"
                          }`}
                          style={{
                            width: `${Math.min(project.spent_percentage, 100)}%`,
                            opacity: 0.7,
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="ml-4 flex-shrink-0">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                        project.risk_level === "CRÍTICO"
                          ? "bg-[hsl(var(--destructive-light))] text-[hsl(var(--destructive))]"
                          : project.risk_level === "ALTO RIESGO"
                            ? "bg-[hsl(var(--warning-light))] text-[hsl(var(--warning))]"
                            : "bg-[hsl(var(--warning-light))] text-[hsl(var(--warning))]"
                      }`}
                    >
                      {project.risk_level}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Charts and Lists */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Top Projects - Enhanced Layout */}
        <div className="lg:col-span-4">
          <div className="hyr-card-elevated h-full">
            <TopProjects />
          </div>
        </div>

        {/* Upcoming Payments */}
        <div className="lg:col-span-4">
          <div className="hyr-card-elevated h-full">
            <UpcomingPaymentsCard />
          </div>
        </div>

        {/* Cashflow Chart */}
        <div className="lg:col-span-4">
          <div className="hyr-card-elevated h-full">
            <CashflowChart />
          </div>
        </div>
      </div>

      {/* Personnel KPIs - Enhanced */}
      <div className="hyr-card-elevated">
        <PersonnelKPIs />
      </div>

      {/* Footer con información del sistema */}
      <div className="hyr-card bg-gradient-to-r from-muted/30 to-transparent p-6 mt-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-[hsl(var(--success))]"></div>
              <span>PostgreSQL migrado exitosamente</span>
            </div>
            <div className="hidden sm:block text-muted-foreground">•</div>
            <span>{kpis.total_projects} proyectos gestionados</span>
            <div className="hidden sm:block text-muted-foreground">•</div>
            <span>{kpis.employees_paid} empleados activos</span>
          </div>

          <div className="text-right">
            <p className="text-sm font-medium text-foreground">
              Sistema HYR v2.0
            </p>
            <p className="text-xs text-muted-foreground">
              Constructora & Soldadura
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
