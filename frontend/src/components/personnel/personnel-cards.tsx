"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "@/lib/i18n";
import { formatCurrency } from "@/lib/finance";
import { personnelService } from "@/lib/api/personnel";
import type { Personnel } from "@/lib/api/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  MoreHorizontal,
  Edit,
  Trash2,
  UserCheck,
  UserX,
  Phone,
  Mail,
  Calendar,
  Loader2,
  Clock,
  Badge as BadgeIcon,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PersonnelDialog } from "./personnel-dialog";
import { useAppStore } from "@/store/app";

interface PersonnelCardsProps {
  personnel?: Personnel[];
  loading?: boolean;
  onRefresh?: () => void;
  searchTerm?: string;
  statusFilter?: string;
  departmentFilter?: string;
  onEdit?: (person: Personnel) => void;
}

export function PersonnelCards({
  personnel = [],
  loading = false,
  onRefresh,
  searchTerm = "",
  statusFilter = "all",
  departmentFilter = "all",
  onEdit,
}: PersonnelCardsProps) {
  const _t = useTranslations("es");
  const { setLastDeletedItem } = useAppStore();
  const [editingPersonnel, setEditingPersonnel] = useState<Personnel | null>(
    null
  );
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

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

  const handleEdit = (person: Personnel) => {
    setEditingPersonnel(person);
    setShowEditDialog(true);
    onEdit?.(person);
  };

  const handleDelete = async (person: Personnel) => {
    if (!person.id) return;

    try {
      setActionLoading(person.id);

      await personnelService.delete(person.id);

      // Set up undo functionality using store
      setLastDeletedItem({
        type: "employee",
        id: person.id,
        name: person.name,
        data: {
          name: person.name,
          document_type: person.document_type || "CC",
          document_number: person.document_number || "",
          phone: person.phone || "",
          email: person.email || "",
          address: person.address || "",
          position: person.position || "",
          department: person.department || "construccion",
          hire_date: person.hire_date || new Date().toISOString().split("T")[0],
          status: person.status || "active",
          // NUEVA LÓGICA: Usar nuevos campos como principales
          salary_base: person.salary_base,
          daily_rate: person.daily_rate,
          // Campos de compatibilidad (deprecated)
          salary_type: person.salary_type || "monthly",
          hourly_rate: person.hourly_rate,
          monthly_salary: person.monthly_salary,
          expected_arrival_time: person.expected_arrival_time,
          expected_departure_time: person.expected_departure_time,
          arl_risk_class: person.arl_risk_class || "V",
          emergency_contact: person.emergency_contact || "",
          emergency_phone: person.emergency_phone || "",
          bank_account: person.bank_account || "",
        },
        timestamp: new Date().toISOString(),
      });

      onRefresh?.();
    } catch (error) {
      console.error("Error deleting personnel:", error);
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
      case "construccion":
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

  // Loading state
  if (loading && personnel.length === 0) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
        {[1, 2, 3, 4].map(i => (
          <Card key={i} className="animate-pulse flex flex-col h-full min-h-[400px]">
            <CardHeader className="flex-shrink-0">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              <div className="flex gap-2 mt-3">
                <div className="h-5 bg-gray-200 rounded w-16"></div>
                <div className="h-5 bg-gray-200 rounded w-12"></div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 space-y-3 p-4">
              <div className="bg-gray-100 p-3 rounded-lg">
                <div className="h-3 bg-gray-200 rounded w-full"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3 mt-2"></div>
              </div>
              <div className="h-3 bg-gray-200 rounded w-full"></div>
              <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Empty state
  if (filteredPersonnel.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-gray-500">
          <UserX className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p className="text-lg font-medium mb-2">
            No se encontraron empleados
          </p>
          <p>
            {searchTerm || statusFilter !== "all" || departmentFilter !== "all"
              ? "No hay empleados que coincidan con los filtros actuales"
              : "No hay empleados registrados aún"}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredPersonnel.map(person => {
          // Calcular costo fijo real (8.5% salud + ARL)
          const getARLRate = (arlClass: string): number => {
            const arlRates = {
              'I': 0.00522, 'II': 0.01044, 'III': 0.02436, 'IV': 0.04350, 'V': 0.06960
            };
            return arlRates[arlClass as keyof typeof arlRates] || arlRates['V'];
          };

          const salaryBase = person.salary_base || (person.monthly_salary || (person.hourly_rate ? person.hourly_rate * 192 : 0));
          const fixedMonthlyCost = salaryBase * (0.085 + getARLRate(person.arl_risk_class || 'V'));

          return (
          <Card key={person.id} className="hover:shadow-lg transition-shadow duration-200 border border-gray-200 bg-white">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-xl font-bold text-gray-900 mb-0.5 leading-tight">
                    {person.name}
                  </CardTitle>
                  <p className="text-sm text-gray-600 mb-1">
                    {formatPosition(person.position || "")}
                  </p>
                  {person.document_number && (
                    <p className="text-xs text-gray-500">
                      {person.document_type || "CC"} {person.document_number}
                    </p>
                  )}
                </div>
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
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleEdit(person)}>
                      <Edit className="mr-2 h-4 w-4" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleDelete(person)}
                      className="text-red-600"
                      disabled={actionLoading === person.id}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Eliminar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="flex gap-1.5 mt-2">
                <Badge className={`${getDepartmentColor(person.department || "")} text-xs px-2 py-0.5`}>
                  {formatDepartment(person.department || "")}
                </Badge>
                <Badge className={`${getStatusColor(person.status || "")} text-xs px-2 py-0.5`}>
                  {formatStatus(person.status || "")}
                </Badge>
                {person.arl_risk_class === 'V' && (
                  <Badge variant="outline" className="text-xs px-1.5 py-0.5 border-red-200 text-red-600">
                    ARL V
                  </Badge>
                )}
              </div>
            </CardHeader>

            <CardContent className="p-4 space-y-3">
              {/* Información Salarial */}
              <div className="bg-blue-50 p-3 rounded border border-blue-100">
                {person.salary_base && person.daily_rate ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-gray-600 mb-0.5">Salario Base</p>
                      <p className="font-semibold text-gray-900 text-sm">
                        {formatCurrency(person.salary_base)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 mb-0.5">Precio/Día</p>
                      <p className="font-semibold text-blue-600 text-sm">
                        {formatCurrency(person.daily_rate)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatCurrency(person.daily_rate / 7.3)}/h
                      </p>
                    </div>
                  </div>
                ) : person.hourly_rate ? (
                  <div>
                    <p className="text-xs text-gray-600 mb-0.5">Tarifa por Hora</p>
                    <p className="font-semibold text-orange-600 text-sm">
                      {formatCurrency(person.hourly_rate)}/hora
                    </p>
                    <p className="text-xs text-orange-500">Pendiente migración</p>
                  </div>
                ) : person.monthly_salary ? (
                  <div>
                    <p className="text-xs text-gray-600 mb-0.5">Salario Mensual</p>
                    <p className="font-semibold text-orange-600 text-sm">
                      {formatCurrency(person.monthly_salary)}/mes
                    </p>
                    <p className="text-xs text-orange-500">Pendiente migración</p>
                  </div>
                ) : (
                  <p className="text-gray-400 text-sm">Información salarial no definida</p>
                )}
              </div>

              {/* Horario */}
              {person.expected_arrival_time && person.expected_departure_time && (
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600">Horario:</span>
                  <span className="font-mono font-medium text-gray-900">
                    {person.expected_arrival_time} - {person.expected_departure_time}
                  </span>
                </div>
              )}

              {/* Estado de Disponibilidad */}
              {person.status === "active" && (
                <div className="flex items-center gap-2 bg-green-50 p-2 rounded border border-green-200">
                  <UserCheck className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-green-800">Disponible para asignar</span>
                </div>
              )}

              {/* Información de Contacto */}
              <div className="space-y-1">
                {person.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-3 w-3 text-gray-400" />
                    <span className="text-sm text-gray-700">{person.phone}</span>
                  </div>
                )}
                {person.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-3 w-3 text-gray-400" />
                    <span className="text-xs text-gray-600 truncate">{person.email}</span>
                  </div>
                )}
                {person.hire_date && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3 w-3 text-gray-400" />
                    <span className="text-xs text-gray-600">
                      Desde {new Date(person.hire_date).toLocaleDateString("es-ES")}
                    </span>
                  </div>
                )}
              </div>

              {/* Solo mostrar ARL si es relevante (Clase IV o V) */}
              {person.arl_risk_class && ['IV', 'V'].includes(person.arl_risk_class) && (
                <div className="flex items-center gap-2">
                  <BadgeIcon className="h-3 w-3 text-orange-500" />
                  <span className="text-xs text-orange-600">
                    ARL Clase {person.arl_risk_class} - {person.arl_risk_class === "V" ? "Riesgo Máximo" : "Riesgo Alto"}
                  </span>
                </div>
              )}

              {/* Contacto de Emergencia */}
              {person.emergency_contact && (
                <div className="border-t pt-2">
                  <p className="text-xs text-gray-600 mb-0.5">Emergencia:</p>
                  <p className="text-xs text-gray-800">{person.emergency_contact}</p>
                  {person.emergency_phone && (
                    <p className="text-xs text-gray-700 font-mono">{person.emergency_phone}</p>
                  )}
                </div>
              )}

              {/* Costo Fijo Real - Destacado */}
              <div className="bg-red-50 p-3 rounded border border-red-200">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-xs font-medium text-red-700">COSTO FIJO MENSUAL</p>
                    <p className="text-xs text-red-600">8.5% salud + ARL</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-red-700">
                      {fixedMonthlyCost > 0 ? formatCurrency(fixedMonthlyCost) : "N/A"}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          );
        })}
      </div>

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
    </>
  );
}