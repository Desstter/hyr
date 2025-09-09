"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import { api, handleApiError } from "@/lib/api";
import { format, subMonths, startOfMonth } from "date-fns";
import { es } from "date-fns/locale";

interface CashflowData {
  month: string;
  ingresos: number;
  gastos: number;
  nomina: number;
  utilidad: number;
  proyectosCompletados: number;
}

export function CashflowChart() {
  const [data, setData] = useState<CashflowData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartType, setChartType] = useState<"line" | "bar">("line");

  useEffect(() => {
    loadCashflowData();
  }, []);

  const loadCashflowData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Obtener tendencias financieras de los últimos 6 meses
      const trends = await api.reports.getFinancialTrends();

      // Validar que los datos lleguen correctamente
      if (!trends || !trends.ingresos || !trends.gastos || !trends.nomina) {
        console.warn("Financial trends data is incomplete:", trends);
        // Generar datos de ejemplo para evitar errores
        const emptyTrends = {
          ingresos: [],
          gastos: [],
          nomina: [],
          utilidad: [],
          proyectosCompletados: [],
          empleadosActivos: [],
        };

        const processedData: CashflowData[] = [];
        const monthsToShow = 6;

        for (let i = monthsToShow - 1; i >= 0; i--) {
          const date = subMonths(new Date(), i);
          const monthLabel = format(date, "MMM yyyy", { locale: es });

          processedData.push({
            month: monthLabel,
            ingresos: 0,
            gastos: 0,
            nomina: 0,
            utilidad: 0,
            proyectosCompletados: 0,
          });
        }

        setData(processedData);
        return;
      }

      // Procesar datos para el gráfico
      const processedData: CashflowData[] = [];
      const monthsToShow = 6;

      for (let i = monthsToShow - 1; i >= 0; i--) {
        const date = subMonths(new Date(), i);
        const monthKey = format(startOfMonth(date), "yyyy-MM");
        const monthLabel = format(date, "MMM yyyy", { locale: es });

        // Buscar datos del mes en las tendencias
        const ingresoData = trends.ingresos?.find(d =>
          d.mes.startsWith(monthKey)
        );
        const gastoData = trends.gastos?.find(d => d.mes.startsWith(monthKey));
        const nominaData = trends.nomina?.find(d => d.mes.startsWith(monthKey));
        const utilidadData = trends.utilidad?.find(d =>
          d.mes.startsWith(monthKey)
        );
        const proyectosData = trends.proyectosCompletados?.find(d =>
          d.mes.startsWith(monthKey)
        );

        processedData.push({
          month: monthLabel,
          ingresos: ingresoData?.monto || 0,
          gastos: gastoData?.monto || 0,
          nomina: nominaData?.monto || 0,
          utilidad: utilidadData?.monto || 0,
          proyectosCompletados: proyectosData?.cantidad || 0,
        });
      }

      setData(processedData);
    } catch (err) {
      setError(handleApiError(err));
      console.error("Error loading cashflow data:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatCompactCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
    return formatCurrency(value);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Flujo de Caja</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-gray-100 animate-pulse rounded" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Flujo de Caja</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-red-600 py-8">
            <p>Error cargando datos de flujo de caja</p>
            <button
              onClick={loadCashflowData}
              className="mt-2 text-sm bg-red-100 px-3 py-1 rounded hover:bg-red-200"
            >
              Reintentar
            </button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Flujo de Caja</CardTitle>
            <p className="text-sm text-gray-600">Últimos 6 meses</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setChartType("line")}
              className={`px-3 py-1 text-xs rounded ${
                chartType === "line"
                  ? "bg-blue-100 text-blue-800"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              Líneas
            </button>
            <button
              onClick={() => setChartType("bar")}
              className={`px-3 py-1 text-xs rounded ${
                chartType === "bar"
                  ? "bg-blue-100 text-blue-800"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              Barras
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <p>No hay datos de flujo de caja disponibles</p>
            <p className="text-sm mt-1">
              Los datos aparecerán después de registrar proyectos y gastos
            </p>
          </div>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === "line" ? (
                <LineChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    tickFormatter={formatCompactCurrency}
                  />
                  <Tooltip
                    formatter={(value: number, name: string) => [
                      formatCurrency(value),
                      name === "ingresos"
                        ? "Ingresos"
                        : name === "gastos"
                          ? "Gastos"
                          : name === "nomina"
                            ? "Nómina"
                            : name === "utilidad"
                              ? "Utilidad"
                              : name,
                    ]}
                    labelFormatter={label => `Mes: ${label}`}
                  />
                  <Line
                    type="monotone"
                    dataKey="ingresos"
                    stroke="#10b981"
                    strokeWidth={2}
                    name="ingresos"
                  />
                  <Line
                    type="monotone"
                    dataKey="gastos"
                    stroke="#ef4444"
                    strokeWidth={2}
                    name="gastos"
                  />
                  <Line
                    type="monotone"
                    dataKey="nomina"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    name="nomina"
                  />
                  <Line
                    type="monotone"
                    dataKey="utilidad"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    name="utilidad"
                  />
                </LineChart>
              ) : (
                <BarChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    tickFormatter={formatCompactCurrency}
                  />
                  <Tooltip
                    formatter={(value: number, name: string) => [
                      formatCurrency(value),
                      name === "ingresos"
                        ? "Ingresos"
                        : name === "gastos"
                          ? "Gastos"
                          : name === "nomina"
                            ? "Nómina"
                            : name === "utilidad"
                              ? "Utilidad"
                              : name,
                    ]}
                    labelFormatter={label => `Mes: ${label}`}
                  />
                  <Bar dataKey="ingresos" fill="#10b981" name="ingresos" />
                  <Bar dataKey="gastos" fill="#ef4444" name="gastos" />
                  <Bar dataKey="nomina" fill="#f59e0b" name="nomina" />
                  <Bar dataKey="utilidad" fill="#3b82f6" name="utilidad" />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        )}

        {/* Leyenda personalizada */}
        {data.length > 0 && (
          <div className="flex justify-center gap-6 mt-4 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-green-500 rounded"></div>
              <span>Ingresos</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-red-500 rounded"></div>
              <span>Gastos</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-amber-500 rounded"></div>
              <span>Nómina</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-blue-500 rounded"></div>
              <span>Utilidad</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
