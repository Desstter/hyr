"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api, handleApiError } from "@/lib/api";
import type { EmployeeProductivity } from "@/lib/api";
import { Users, Clock, DollarSign, TrendingUp } from "lucide-react";

// Utility function to safely convert to number for .toFixed() operations
const safeNumber = (value: unknown): number => {
  const num = Number(value);
  return isNaN(num) ? 0 : num;
};

export function PersonnelKPIs() {
  const [productivity, setProductivity] = useState<EmployeeProductivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProductivityData();
  }, []);

  const loadProductivityData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Obtener datos del mes actual
      const currentDate = new Date();
      const productivityData = await api.reports.getEmployeeProductivity({
        month: currentDate.getMonth() + 1,
        year: currentDate.getFullYear(),
      });

      setProductivity(productivityData);
    } catch (err) {
      setError(handleApiError(err));
      console.error("Error loading productivity data:", err);
    } finally {
      setLoading(false);
    }
  };

  // Calcular estadísticas generales
  const totalEmployees = productivity.length;
  const totalHours = productivity.reduce(
    (sum, emp) => sum + Number(emp.total_hours || 0),
    0
  );
  const totalCost = productivity.reduce(
    (sum, emp) => sum + Number(emp.total_cost_to_company || 0),
    0
  );
  const avgHoursPerEmployee =
    totalEmployees > 0 ? totalHours / totalEmployees : 0;

  // Empleados más productivos (por horas trabajadas)
  const topProductiveEmployees = productivity
    .sort((a, b) => safeNumber(b.total_hours) - safeNumber(a.total_hours))
    .slice(0, 5);

  // Empleados más eficientes (menor costo por hora)
  const mostEfficient = productivity
    .filter(emp => safeNumber(emp.cost_per_hour_with_benefits) > 0)
    .sort(
      (a, b) =>
        safeNumber(a.cost_per_hour_with_benefits) -
        safeNumber(b.cost_per_hour_with_benefits)
    )
    .slice(0, 3);

  const getDepartmentColor = (department: string) => {
    switch (department.toLowerCase()) {
      case "soldadura":
        return "bg-orange-100 text-orange-800";
      case "construccion":
        return "bg-blue-100 text-blue-800";
      case "administracion":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-12">
        <Card className="md:col-span-3">
          <CardHeader>
            <CardTitle className="text-lg">KPIs Personal</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="h-16 bg-gray-100 animate-pulse rounded"
                />
              ))}
            </div>
          </CardContent>
        </Card>
        <Card className="md:col-span-5">
          <CardHeader>
            <CardTitle>Top Empleados Productivos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="h-12 bg-gray-100 animate-pulse rounded"
                />
              ))}
            </div>
          </CardContent>
        </Card>
        <Card className="md:col-span-4">
          <CardHeader>
            <CardTitle>Empleados Más Eficientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="h-12 bg-gray-100 animate-pulse rounded"
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">KPIs de Personal</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-red-600 py-4">
            <p>Error cargando datos de personal: {error}</p>
            <button
              onClick={loadProductivityData}
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
    <div className="grid gap-4 md:grid-cols-12">
      {/* KPIs Generales */}
      <Card className="md:col-span-3">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5" />
            KPIs Personal
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-gray-600">Total Empleados</span>
            </div>
            <span className="font-bold text-lg">{totalEmployees}</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-green-600" />
              <span className="text-sm text-gray-600">Horas Totales</span>
            </div>
            <span className="font-bold text-lg">{totalHours.toFixed(0)}</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-purple-600" />
              <span className="text-sm text-gray-600">Promedio/Empleado</span>
            </div>
            <span className="font-bold text-lg">
              {avgHoursPerEmployee.toFixed(1)}h
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-red-600" />
              <span className="text-sm text-gray-600">Costo Total</span>
            </div>
            <span className="font-bold text-lg">
              {new Intl.NumberFormat("es-CO", {
                style: "currency",
                currency: "COP",
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              }).format(totalCost)}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Top Empleados Productivos */}
      <Card className="md:col-span-5">
        <CardHeader>
          <CardTitle>Top Empleados Productivos</CardTitle>
          <p className="text-sm text-gray-600">Por horas trabajadas este mes</p>
        </CardHeader>
        <CardContent>
          {topProductiveEmployees.length === 0 ? (
            <div className="text-center text-gray-500 py-4">
              <p>No hay datos de productividad disponibles</p>
            </div>
          ) : (
            <div className="space-y-3">
              {topProductiveEmployees.map((employee, index) => (
                <div
                  key={employee.name}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-sm font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <h4 className="font-medium text-sm">{employee.name}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge
                          className={getDepartmentColor(employee.department)}
                        >
                          {employee.department}
                        </Badge>
                        <span className="text-xs text-gray-600">
                          {employee.position}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-bold text-green-600">
                      {safeNumber(employee.total_hours).toFixed(1)}h
                    </div>
                    <div className="text-xs text-gray-500">
                      {safeNumber(employee.overtime_hours) > 0 && (
                        <span>
                          +{safeNumber(employee.overtime_hours).toFixed(1)}h
                          extra
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">
                      {employee.projects_worked} proyecto(s)
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Empleados Más Eficientes */}
      <Card className="md:col-span-4">
        <CardHeader>
          <CardTitle>Empleados Más Eficientes</CardTitle>
          <p className="text-sm text-gray-600">Menor costo por hora</p>
        </CardHeader>
        <CardContent>
          {mostEfficient.length === 0 ? (
            <div className="text-center text-gray-500 py-4">
              <p>No hay datos de eficiencia disponibles</p>
            </div>
          ) : (
            <div className="space-y-3">
              {mostEfficient.map((employee, index) => (
                <div
                  key={employee.name}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-green-100 text-green-800 rounded-full flex items-center justify-center text-sm font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <h4 className="font-medium text-sm">{employee.name}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-600">
                          {employee.position}
                        </span>
                        <span className="text-xs text-gray-400">•</span>
                        <span className="text-xs text-gray-600">
                          {safeNumber(employee.total_hours).toFixed(1)}h
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-bold text-blue-600 text-sm">
                      $
                      {Math.round(
                        safeNumber(employee.cost_per_hour_with_benefits)
                      ).toLocaleString()}
                      /h
                    </div>
                    <div className="text-xs text-gray-500">
                      Total:{" "}
                      {new Intl.NumberFormat("es-CO", {
                        style: "currency",
                        currency: "COP",
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      }).format(safeNumber(employee.total_cost_to_company))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
