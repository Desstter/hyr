"use client";

import { useState, useMemo, useEffect } from "react";
import { useTranslations } from "@/lib/i18n";
import { formatCurrency, safeNumber } from "@/lib/finance";
import { personnelService } from "@/lib/api/personnel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MoreHorizontal,
  Search,
  Edit,
  UserCheck,
  UserX,
  UserMinus,
  Users,
  AlertTriangle,
  Phone,
  Mail,
  RefreshCw,
  Loader2,
  Building2,
  UserCheck2,
  Users2,
  Clock,
  DollarSign,
  CreditCard,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PersonnelDialog } from "./personnel-dialog";
import { PersonnelAssignmentDialog } from "./personnel-assignment-dialog";
import { toast } from "sonner";
import { usePersonnelAssignments } from "@/lib/hooks/usePersonnelAssignments";
import type {
  Personnel,
} from "@/lib/api/types";

interface PersonnelTableProps {
  personnel?: Personnel[];
  loading?: boolean;
  onRefresh?: () => void;
  searchTerm?: string;
  statusFilter?: string;
  departmentFilter?: string;
}

export function PersonnelTable({
  personnel = [],
  loading = false,
  onRefresh,
  searchTerm: externalSearchTerm = "",
  statusFilter: externalStatusFilter = "all",
  departmentFilter: externalDepartmentFilter = "all",
}: PersonnelTableProps) {
  const _t = useTranslations("es");
  const [internalSearchTerm, setInternalSearchTerm] = useState("");
  const [internalStatusFilter, setInternalStatusFilter] =
    useState<string>("all");
  const [internalDepartmentFilter, setInternalDepartmentFilter] =
    useState<string>("all");
  const [editingPersonnel, setEditingPersonnel] = useState<Personnel | null>(
    null
  );
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showAssignmentDialog, setShowAssignmentDialog] = useState(false);
  const [selectedPersonnelForAssignment, setSelectedPersonnelForAssignment] =
    useState<Personnel | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Hook para asignaciones de empleados
  const {
    assignmentsSummary,
    stats: assignmentStats,
    loading: _assignmentsLoading,
    error: _assignmentsError,
  } = usePersonnelAssignments(personnel);

  // Limpiar actionLoading después de 30 segundos en caso de error
  useEffect(() => {
    if (actionLoading) {
      const timeout = setTimeout(() => {
        console.warn("Action loading timeout - clearing state");
        setActionLoading(null);
      }, 30000);

      return () => clearTimeout(timeout);
    }
  }, [actionLoading]);

  // Use external filters if provided, otherwise use internal state
  const searchTerm = externalSearchTerm || internalSearchTerm;
  const statusFilter =
    externalStatusFilter !== "all"
      ? externalStatusFilter
      : internalStatusFilter;
  const departmentFilter =
    externalDepartmentFilter !== "all"
      ? externalDepartmentFilter
      : internalDepartmentFilter;

  // Filter personnel based on search and filters
  const filteredPersonnel = useMemo(() => {
    return personnel.filter(person => {
      const matchesSearch =
        !searchTerm ||
        person.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        person.position?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        person.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        person.document_number
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === "all" || person.status === statusFilter;
      const matchesDepartment =
        departmentFilter === "all" || person.department === departmentFilter;

      return matchesSearch && matchesStatus && matchesDepartment;
    });
  }, [personnel, searchTerm, statusFilter, departmentFilter]);

  // Summary statistics - NUEVA LÓGICA
  // Función para calcular tarifa ARL por clase de riesgo
  const getARLRate = (arlClass: string): number => {
    const arlRates = {
      'I': 0.00522,   // 0.522% - Actividades administrativas mínimo riesgo
      'II': 0.01044,  // 1.044% - Actividades comerciales riesgo bajo
      'III': 0.02436, // 2.436% - Actividades industriales riesgo medio
      'IV': 0.04350,  // 4.350% - Construcción riesgo alto
      'V': 0.06960    // 6.960% - Construcción pesada/soldadura riesgo máximo
    };
    return arlRates[arlClass as keyof typeof arlRates] || arlRates['V']; // Default a clase V si no se especifica
  };

  const stats = useMemo(() => {
    const activePersonnel = personnel.filter(p => p.status === "active");

    // NUEVA LÓGICA: Usar daily_rate para promedio por hora
    const personnelWithDailyRate = activePersonnel.filter(
      p => safeNumber(p.daily_rate) > 0
    );
    const averageHourlyRate =
      personnelWithDailyRate.length > 0
        ? personnelWithDailyRate.reduce(
            (sum, p) => sum + (safeNumber(p.daily_rate) / 7.3), // 7.3 horas legales
            0
          ) / personnelWithDailyRate.length
        : 0;

    // NUEVA LÓGICA: Costo teórico basado en salary_base para prestaciones
    const totalMonthlyCost = activePersonnel.reduce((sum, p) => {
      const salaryBase = safeNumber(p.salary_base);

      // Si tiene nueva estructura, usar salary_base para prestaciones
      if (salaryBase > 0) {
        return sum + salaryBase * 1.58; // Factor prestacional sobre salary_base
      }

      // Fallback para empleados no migrados
      const monthlySalary = safeNumber(p.monthly_salary);
      const hourlyRate = safeNumber(p.hourly_rate);
      const rate = monthlySalary || hourlyRate * 192;
      return sum + rate * 1.58;
    }, 0);

    // NUEVA LÓGICA: Costo fijo real (8.5% salud empleador + ARL por clase)
    const totalFixedMonthlyCost = activePersonnel.reduce((sum, p) => {
      const salaryBase = safeNumber(p.salary_base);

      if (salaryBase > 0) {
        const saludEmpleador = salaryBase * 0.085; // 8.5% salud empleador
        const arlRate = getARLRate(p.arl_risk_class || 'V');
        const arlCost = salaryBase * arlRate;
        return sum + saludEmpleador + arlCost;
      }

      // Fallback para empleados no migrados
      const monthlySalary = safeNumber(p.monthly_salary);
      const hourlyRate = safeNumber(p.hourly_rate);
      const rate = monthlySalary || hourlyRate * 192;
      const saludEmpleador = rate * 0.085;
      const arlRate = getARLRate(p.arl_risk_class || 'V');
      const arlCost = rate * arlRate;
      return sum + saludEmpleador + arlCost;
    }, 0);

    return {
      total: personnel.length,
      active: activePersonnel.length,
      assigned: assignmentStats.totalAssigned, // ✅ FIXED: Usar lógica real de asignaciones
      available: assignmentStats.totalAvailable,
      averageHourlyRate,
      totalMonthlyCost,
      totalFixedMonthlyCost,
    };
  }, [personnel, assignmentStats]);

  const handleEdit = (person: Personnel) => {
    setEditingPersonnel(person);
    setShowEditDialog(true);
  };

  const handleManageAssignments = (person: Personnel) => {
    setSelectedPersonnelForAssignment(person);
    setShowAssignmentDialog(true);
  };

  const handleStatusChange = async (
    person: Personnel,
    newStatus: "active" | "inactive" | "terminated"
  ) => {
    if (!person.id || person.status === newStatus) return;

    try {
      setActionLoading(person.id);

      await personnelService.updateStatus(person.id, newStatus);

      const statusMessages = {
        active: "Empleado activado",
        inactive: "Empleado desactivado",
        terminated: "Empleado marcado como terminado",
      };

      toast.success(`${statusMessages[newStatus]}: ${person.name}`, {
        action: {
          label: "Deshacer",
          onClick: async () => {
            try {
              await personnelService.updateStatus(person.id!, person.status);
              onRefresh?.();
              toast.success(`Estado restaurado para ${person.name}`);
            } catch (error: unknown) {
              console.error("Error restoring status:", error);
              const errorMessage =
                error instanceof Error ? error.message : String(error);
              toast.error(
                "Error al restaurar estado: " +
                  (errorMessage || "Error desconocido")
              );
            }
          },
        },
        duration: 8000,
      });

      onRefresh?.();
    } catch (error: unknown) {
      console.error("Error changing status:", error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      toast.error(
        "Error al cambiar estado: " + (errorMessage || "Error desconocido")
      );
    } finally {
      setActionLoading(null);
    }
  };

  const handlePermanentDelete = async (person: Personnel) => {
    if (!person.id) return;

    // Doble confirmación para eliminación permanente
    const confirmed = confirm(
      `⚠️ ELIMINACIÓN PERMANENTE\n\n` +
        `¿Está seguro de eliminar PERMANENTEMENTE a "${person.name}" de la base de datos?\n\n` +
        `Esta acción NO se puede deshacer y eliminará todos los datos del empleado.\n\n` +
        `Si solo desea desactivar al empleado, use "Cambiar Estado" en su lugar.`
    );

    if (!confirmed) return;

    // Segunda confirmación
    const doubleConfirmed = confirm(
      `⚠️ CONFIRME LA ELIMINACIÓN\n\n` +
        `Escriba "CONFIRMAR" en su mente y presione OK para eliminar PERMANENTEMENTE a ${person.name}.\n\n` +
        `¿Está completamente seguro?`
    );

    if (!doubleConfirmed) return;

    try {
      setActionLoading(person.id);

      await personnelService.delete(person.id);

      toast.success(
        `Empleado ${person.name} eliminado permanentemente de la base de datos`
      );
      onRefresh?.();
    } catch (error: unknown) {
      console.error("Error deleting personnel permanently:", error);
      const errorMessage =
        (error instanceof Error ? error.message : String(error)) ||
        "Error desconocido";

      // Mostrar mensaje específico para empleados con registros
      if (
        errorMessage.includes("registros de horas") ||
        errorMessage.includes("registros de nómina")
      ) {
        toast.error(`No se puede eliminar a ${person.name}:\n${errorMessage}`, {
          duration: 8000,
        });
      } else {
        toast.error(
          "Error al eliminar empleado permanentemente: " + errorMessage
        );
      }
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "on_leave":
        return "bg-yellow-100 text-yellow-800";
      case "inactive":
        return "bg-gray-100 text-gray-800";
      case "terminated":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getDepartmentColor = (department: string) => {
    switch (department) {
      case "construction":
        return "bg-blue-100 text-blue-800";
      case "welding":
        return "bg-orange-100 text-orange-800";
      case "soldadura":
        return "bg-orange-100 text-orange-800";
      case "administration":
        return "bg-purple-100 text-purple-800";
      case "administracion":
        return "bg-purple-100 text-purple-800";
      case "maintenance":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatDepartment = (department: string) => {
    const deptMap: Record<string, string> = {
      construction: "Construcción",
      construccion: "Construcción",
      welding: "Soldadura",
      soldadura: "Soldadura",
      administration: "Administración",
      administracion: "Administración",
      maintenance: "Mantenimiento",
    };
    return deptMap[department] || department;
  };

  const formatPosition = (position: string) => {
    const positionMap: Record<string, string> = {
      welder: "Soldador",
      soldador: "Soldador",
      operator: "Operario",
      operario: "Operario",
      supervisor: "Supervisor",
      administrator: "Administrador",
      administrador: "Administrador",
      helper: "Ayudante",
      ayudante: "Ayudante",
    };
    return positionMap[position] || position;
  };

  const formatStatus = (status: string) => {
    const statusMap: Record<string, string> = {
      active: "Activo",
      inactive: "Inactivo",
      on_leave: "Licencia",
      terminated: "Terminado",
    };
    return statusMap[status] || status;
  };

  return (
    <div className="space-y-6">
      {/* Statistics Cards - Responsive Grid */}
      <div className="space-y-6">
        {/* Personal Overview Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-blue-600 uppercase tracking-wide">
                    Total Empleados
                  </p>
                  <p className="text-3xl font-bold text-blue-900">{stats.total}</p>
                </div>
                <div className="h-12 w-12 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Building2 className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-green-600 uppercase tracking-wide">
                    Empleados Activos
                  </p>
                  <p className="text-3xl font-bold text-green-900">{stats.active}</p>
                </div>
                <div className="h-12 w-12 bg-green-600 rounded-lg flex items-center justify-center">
                  <UserCheck2 className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-cyan-50 to-cyan-100 border-cyan-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-cyan-600 uppercase tracking-wide">
                    Disponibles
                  </p>
                  <p className="text-3xl font-bold text-cyan-900">{stats.available}</p>
                </div>
                <div className="h-12 w-12 bg-cyan-600 rounded-lg flex items-center justify-center">
                  <Users2 className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-indigo-600 uppercase tracking-wide">
                    Promedio/Hora
                  </p>
                  <p className="text-2xl font-bold text-indigo-900">
                    {formatCurrency(stats.averageHourlyRate)}
                  </p>
                  <p className="text-xs text-indigo-600 font-medium">
                    Basado en daily_rate/7.3h
                  </p>
                </div>
                <div className="h-12 w-12 bg-indigo-600 rounded-lg flex items-center justify-center">
                  <Clock className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Financial Overview Stats */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-gray-600" />
            Resumen Financiero Mensual
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-orange-600" />
                      <p className="text-sm font-medium text-orange-600 uppercase tracking-wide">
                        Costo Total (Teórico)
                      </p>
                    </div>
                    <p className="text-3xl font-bold text-orange-900">
                      {formatCurrency(stats.totalMonthlyCost)}
                    </p>
                    <div className="bg-orange-200 px-3 py-1 rounded-full">
                      <p className="text-xs font-medium text-orange-700">
                        Incluye prestaciones sociales (Factor 1.58x)
                      </p>
                    </div>
                  </div>
                  <div className="h-16 w-16 bg-orange-600 rounded-xl flex items-center justify-center">
                    <CreditCard className="h-8 w-8 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-red-600" />
                      <p className="text-sm font-medium text-red-600 uppercase tracking-wide">
                        Costo Fijo Real
                      </p>
                    </div>
                    <p className="text-3xl font-bold text-red-900">
                      {formatCurrency(stats.totalFixedMonthlyCost)}
                    </p>
                    <div className="bg-red-200 px-3 py-1 rounded-full">
                      <p className="text-xs font-medium text-red-700">
                        Solo 8.5% salud empleador + ARL
                      </p>
                    </div>
                  </div>
                  <div className="h-16 w-16 bg-red-600 rounded-xl flex items-center justify-center">
                    <CreditCard className="h-8 w-8 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Filters - Only show if no external filters are provided */}
      {!externalSearchTerm &&
        externalStatusFilter === "all" &&
        externalDepartmentFilter === "all" && (
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
              <Input
                placeholder="Buscar empleados por nombre, cédula, cargo..."
                value={internalSearchTerm}
                onChange={e => setInternalSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select
              value={internalStatusFilter}
              onValueChange={setInternalStatusFilter}
            >
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Todos los estados" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="active">Activo</SelectItem>
                <SelectItem value="on_leave">Licencia</SelectItem>
                <SelectItem value="inactive">Inactivo</SelectItem>
                <SelectItem value="terminated">Terminado</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={internalDepartmentFilter}
              onValueChange={setInternalDepartmentFilter}
            >
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Todos los departamentos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los departamentos</SelectItem>
                <SelectItem value="construccion">Construcción</SelectItem>
                <SelectItem value="soldadura">Soldadura</SelectItem>
                <SelectItem value="administracion">Administración</SelectItem>
                <SelectItem value="maintenance">Mantenimiento</SelectItem>
              </SelectContent>
            </Select>

            {onRefresh && (
              <Button
                onClick={onRefresh}
                variant="outline"
                disabled={loading}
                className="flex-shrink-0"
              >
                <RefreshCw
                  className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                />
              </Button>
            )}
          </div>
        )}

      {/* Personnel Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empleado</TableHead>
                <TableHead>Cargo</TableHead>
                <TableHead>Departamento</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Asignaciones</TableHead>
                <TableHead>Información Salarial</TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && personnel.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <div className="flex items-center justify-center">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Cargando empleados...
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredPersonnel.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="text-center py-8 text-gray-500"
                  >
                    {searchTerm ||
                    statusFilter !== "all" ||
                    departmentFilter !== "all"
                      ? "No se encontraron empleados con los filtros aplicados."
                      : "No hay empleados registrados."}
                  </TableCell>
                </TableRow>
              ) : (
                filteredPersonnel.map(person => (
                  <TableRow key={person.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{person.name}</span>
                        <div className="text-xs text-gray-500 space-y-1">
                          {person.document_number && (
                            <div>CC {person.document_number}</div>
                          )}
                          {person.hire_date && (
                            <div>
                              Desde{" "}
                              {new Date(person.hire_date).toLocaleDateString(
                                "es-ES"
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="capitalize">
                        {formatPosition(person.position || "")}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={getDepartmentColor(person.department || "")}
                      >
                        {formatDepartment(person.department || "")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(person.status || "")}>
                        {formatStatus(person.status || "")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {person.id && assignmentsSummary[person.id] ? (
                        <div className="flex flex-col space-y-1">
                          <div className="flex items-center space-x-2">
                            <Badge
                              variant={
                                assignmentsSummary[person.id].can_take_more_work
                                  ? "default"
                                  : "secondary"
                              }
                              className={
                                assignmentsSummary[person.id]
                                  .availability_status === "sobrecargado"
                                  ? "bg-red-100 text-red-800"
                                  : assignmentsSummary[person.id]
                                        .availability_status === "ocupado"
                                    ? "bg-yellow-100 text-yellow-800"
                                    : "bg-green-100 text-green-800"
                              }
                            >
                              {assignmentsSummary[person.id].total_projects}{" "}
                              proyecto
                              {assignmentsSummary[person.id].total_projects !==
                              1
                                ? "s"
                                : ""}
                            </Badge>
                          </div>
                          <div className="text-xs text-gray-500">
                            {assignmentsSummary[person.id].total_hours_per_day}
                            h/día •{" "}
                            {assignmentsSummary[person.id]
                              .availability_status === "sobrecargado"
                              ? "Sobrecargado"
                              : assignmentsSummary[person.id]
                                    .availability_status === "ocupado"
                                ? "Ocupado"
                                : assignmentsSummary[person.id]
                                      .availability_status ===
                                    "parcialmente_ocupado"
                                  ? "Parcial"
                                  : "Disponible"}
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col">
                          <Badge
                            variant="outline"
                            className="bg-gray-50 text-gray-600"
                          >
                            Sin asignar
                          </Badge>
                          <div className="text-xs text-gray-500">
                            Disponible
                          </div>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col space-y-1">
                        {/* NUEVA LÓGICA: Mostrar salary_base y daily_rate */}
                        {person.salary_base && person.daily_rate ? (
                          <>
                            <div className="flex items-center space-x-2">
                              <span className="text-xs text-gray-500">Base:</span>
                              <span className="font-medium text-sm">
                                {formatCurrency(person.salary_base)}
                              </span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className="text-xs text-gray-500">Día:</span>
                              <span className="font-medium text-sm text-blue-600">
                                {formatCurrency(person.daily_rate)}
                              </span>
                            </div>
                            <div className="text-xs text-gray-400">
                              {formatCurrency(person.daily_rate / 7.3)}/hora
                            </div>
                          </>
                        ) : person.hourly_rate ? (
                          // Fallback para empleados no migrados
                          <span className="font-medium text-yellow-600">
                            {formatCurrency(person.hourly_rate)}/hora
                            <div className="text-xs text-yellow-500">Pendiente migración</div>
                          </span>
                        ) : person.monthly_salary ? (
                          <span className="font-medium text-yellow-600">
                            {formatCurrency(person.monthly_salary)}/mes
                            <div className="text-xs text-yellow-500">Pendiente migración</div>
                          </span>
                        ) : (
                          <span className="text-gray-400">No definida</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        {person.phone && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => window.open(`tel:${person.phone}`)}
                          >
                            <Phone className="h-3 w-3" />
                          </Button>
                        )}
                        {person.email && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() =>
                              window.open(`mailto:${person.email}`)
                            }
                          >
                            <Mail className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            disabled={actionLoading === person.id}
                          >
                            {actionLoading === person.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <MoreHorizontal className="h-4 w-4" />
                            )}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onClick={() => handleEdit(person)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Editar Información
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            onClick={() => handleManageAssignments(person)}
                          >
                            <Users className="mr-2 h-4 w-4" />
                            Gestionar Asignaciones
                          </DropdownMenuItem>

                          {/* Separador */}
                          <div className="border-t border-gray-100 my-1" />

                          {/* Opciones de cambio de estado */}
                          {person.status !== "active" && (
                            <DropdownMenuItem
                              onClick={() =>
                                handleStatusChange(person, "active")
                              }
                              disabled={actionLoading === person.id}
                              className="text-green-600"
                            >
                              <UserCheck className="mr-2 h-4 w-4" />
                              Activar
                            </DropdownMenuItem>
                          )}

                          {person.status !== "inactive" && (
                            <DropdownMenuItem
                              onClick={() =>
                                handleStatusChange(person, "inactive")
                              }
                              disabled={actionLoading === person.id}
                              className="text-yellow-600"
                            >
                              <UserX className="mr-2 h-4 w-4" />
                              Desactivar
                            </DropdownMenuItem>
                          )}

                          {person.status !== "terminated" && (
                            <DropdownMenuItem
                              onClick={() =>
                                handleStatusChange(person, "terminated")
                              }
                              disabled={actionLoading === person.id}
                              className="text-orange-600"
                            >
                              <UserMinus className="mr-2 h-4 w-4" />
                              Marcar Terminado
                            </DropdownMenuItem>
                          )}

                          {/* Separador */}
                          <div className="border-t border-gray-100 my-1" />

                          {/* Eliminación permanente - solo para empleados sin registros */}
                          <DropdownMenuItem
                            onClick={() => handlePermanentDelete(person)}
                            disabled={actionLoading === person.id}
                            className="text-red-600 focus:text-red-600 focus:bg-red-50"
                          >
                            <AlertTriangle className="mr-2 h-4 w-4" />
                            Eliminar Permanente
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <PersonnelDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        personnel={editingPersonnel}
        onSuccess={() => {
          setEditingPersonnel(null);
          setShowEditDialog(false);
          onRefresh?.();
        }}
      />

      {/* Assignment Dialog */}
      <PersonnelAssignmentDialog
        open={showAssignmentDialog}
        onOpenChange={setShowAssignmentDialog}
        personnel={selectedPersonnelForAssignment}
        onSuccess={() => {
          setSelectedPersonnelForAssignment(null);
          setShowAssignmentDialog(false);
          onRefresh?.();
        }}
      />
    </div>
  );
}
