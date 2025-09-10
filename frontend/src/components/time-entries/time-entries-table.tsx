"use client";

import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";
import {
  Filter,
  MoreHorizontal,
  Edit,
  Trash2,
  Check,
  X,
  Clock,
  User,
  FolderOpen,
  Calendar,
  DollarSign,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { TimeEntry, Personnel, Project } from "@/lib/api/types";
import { timeEntriesService } from "@/lib/api/time-entries";
import { personnelService } from "@/lib/api/personnel";
import { projectsService } from "@/lib/api/projects";
import { TimeEntryDialog } from "./time-entry-dialog";

type TimeEntryStatus = "draft" | "submitted" | "approved" | "payroll_locked" | "rejected";

interface TimeEntriesTableProps {
  defaultPersonnelId?: string;
  defaultProjectId?: string;
  showFilters?: boolean;
  onRefresh?: () => void;
}

interface Filters {
  personnelId: string;
  projectId: string;
  status: string;
  startDate: string;
  endDate: string;
  search: string;
}

const STATUS_LABELS: Record<TimeEntryStatus, string> = {
  draft: "Borrador",
  submitted: "Enviado",
  approved: "Aprobado",
  payroll_locked: "Bloqueado",
  rejected: "Rechazado",
};

const STATUS_COLORS: Record<TimeEntryStatus, "default" | "secondary" | "destructive" | "outline"> = {
  draft: "outline",
  submitted: "secondary",
  approved: "default",
  payroll_locked: "destructive",
  rejected: "destructive",
};

export function TimeEntriesTable({
  defaultPersonnelId,
  defaultProjectId,
  showFilters = true,
  onRefresh,
}: TimeEntriesTableProps) {
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<string | null>(null);

  // Estados de filtros y paginación
  const [filters, setFilters] = useState<Filters>({
    personnelId: defaultPersonnelId || "all",
    projectId: defaultProjectId || "all",
    status: "all",
    startDate: "",
    endDate: "",
    search: "",
  });

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  // Estados de dialogs
  const [showTimeEntryDialog, setShowTimeEntryDialog] = useState(false);
  const [editingTimeEntry, setEditingTimeEntry] = useState<TimeEntry | null>(null);
  const [selectedEntries, setSelectedEntries] = useState<Set<string>>(new Set());

  // Cargar datos iniciales
  useEffect(() => {
    loadData();
  }, []);

  // Actualizar filtros cuando cambien los props
  useEffect(() => {
    if (defaultPersonnelId && filters.personnelId === "all") {
      setFilters(prev => ({ ...prev, personnelId: defaultPersonnelId }));
    }
    if (defaultProjectId && filters.projectId === "all") {
      setFilters(prev => ({ ...prev, projectId: defaultProjectId }));
    }
  }, [defaultPersonnelId, defaultProjectId, filters.personnelId, filters.projectId]);

  const loadTimeEntries = useCallback(async () => {
    try {
      setLoading(true);
      
      const result = await timeEntriesService.list({
        personnelId: filters.personnelId !== "all" ? filters.personnelId : undefined,
        projectId: filters.projectId !== "all" ? filters.projectId : undefined,
        status: filters.status !== "all" ? filters.status : undefined,
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
        limit: pagination.limit,
        offset: (pagination.page - 1) * pagination.limit
      });
      
      setTimeEntries(result.data);
      setPagination(prev => ({
        ...prev,
        total: result.total || 0,
        totalPages: result.totalPages || 0,
      }));

    } catch (error) {
      console.error("Error loading time entries:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los registros de tiempo",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.page, pagination.limit]);

  // Cargar datos cuando cambian filtros o página
  useEffect(() => {
    loadTimeEntries();
  }, [loadTimeEntries]);

  const loadData = async () => {
    try {
      const [personnelData, projectsData] = await Promise.all([
        personnelService.getAll(),
        projectsService.getAll(),
      ]);
      setPersonnel(personnelData);
      setProjects(projectsData);
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos de referencia",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (timeEntry: TimeEntry) => {
    if (timeEntry.status === "payroll_locked") {
      toast({
        title: "No editable",
        description: "Este registro está bloqueado por nómina procesada",
        variant: "destructive",
      });
      return;
    }
    setEditingTimeEntry(timeEntry);
    setShowTimeEntryDialog(true);
  };

  const handleDelete = async (timeEntry: TimeEntry) => {
    if (timeEntry.status === "payroll_locked") {
      toast({
        title: "No eliminable",
        description: "Este registro está bloqueado por nómina procesada",
        variant: "destructive",
      });
      return;
    }

    if (!confirm("¿Estás seguro de eliminar este registro de tiempo?")) {
      return;
    }

    try {
      setSubmitting(timeEntry.id);
      await timeEntriesService.delete(timeEntry.id);
      toast({
        title: "✅ Registro eliminado",
        description: "El registro de tiempo ha sido eliminado",
      });
      loadTimeEntries();
      onRefresh?.();
    } catch (error: unknown) {
      const apiError = error as { response?: { data?: { error?: string } } };
      toast({
        title: "Error",
        description: apiError.response?.data?.error || "Error al eliminar el registro",
        variant: "destructive",
      });
    } finally {
      setSubmitting(null);
    }
  };

  const handleStatusChange = async (timeEntry: TimeEntry, newStatus: TimeEntryStatus) => {
    if (timeEntry.status === "payroll_locked") {
      toast({
        title: "No modificable",
        description: "Este registro está bloqueado por nómina procesada",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(timeEntry.id);
      await timeEntriesService.update(timeEntry.id, { status: newStatus });
      toast({
        title: "✅ Estado actualizado",
        description: `Registro marcado como ${STATUS_LABELS[newStatus]}`,
      });
      loadTimeEntries();
      onRefresh?.();
    } catch (error: unknown) {
      const apiError = error as { response?: { data?: { error?: string } } };
      toast({
        title: "Error",
        description: apiError.response?.data?.error || "Error al actualizar el estado",
        variant: "destructive",
      });
    } finally {
      setSubmitting(null);
    }
  };

  const handleBulkApprove = async () => {
    if (selectedEntries.size === 0) {
      toast({
        title: "Selección requerida",
        description: "Selecciona al menos un registro para aprobar",
      });
      return;
    }

    try {
      setLoading(true);
      const ids = Array.from(selectedEntries);
      await timeEntriesService.bulkApprove(ids, "Aprobado masivamente desde interfaz");
      
      toast({
        title: "✅ Registros aprobados",
        description: `${ids.length} registros han sido aprobados`,
      });
      
      setSelectedEntries(new Set());
      loadTimeEntries();
      onRefresh?.();
    } catch (error: unknown) {
      const apiError = error as { response?: { data?: { error?: string } } };
      toast({
        title: "Error",
        description: apiError.response?.data?.error || "Error en aprobación masiva",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: keyof Filters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to page 1 when filtering
  };

  const clearFilters = () => {
    setFilters({
      personnelId: defaultPersonnelId || "all",
      projectId: defaultProjectId || "all",
      status: "all",
      startDate: "",
      endDate: "",
      search: "",
    });
  };

  const getPersonnelName = (personnelId: string) => {
    return (personnel || []).find(p => p.id === personnelId)?.name || "N/A";
  };

  const getProjectName = (projectId: string) => {
    return (projects || []).find(p => p.id === projectId)?.name || "N/A";
  };

  const totalSelectedPay = (timeEntries || [])
    .filter(entry => selectedEntries.has(entry.id))
    .reduce((sum, entry) => sum + entry.total_pay, 0);

  return (
    <div className="space-y-6">
      {/* Filtros */}
      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {/* Empleado */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Empleado</label>
                <Select
                  value={filters.personnelId}
                  onValueChange={(value) => handleFilterChange("personnelId", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los empleados</SelectItem>
                    {(personnel || []).map((person) => (
                      <SelectItem key={person.id} value={person.id}>
                        {person.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Proyecto */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Proyecto</label>
                <Select
                  value={filters.projectId}
                  onValueChange={(value) => handleFilterChange("projectId", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los proyectos</SelectItem>
                    {(projects || []).map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Estado */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Estado</label>
                <Select
                  value={filters.status}
                  onValueChange={(value) => handleFilterChange("status", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los estados</SelectItem>
                    <SelectItem value="draft">Borrador</SelectItem>
                    <SelectItem value="submitted">Enviado</SelectItem>
                    <SelectItem value="approved">Aprobado</SelectItem>
                    <SelectItem value="payroll_locked">Bloqueado</SelectItem>
                    <SelectItem value="rejected">Rechazado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Fecha Inicio */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Desde</label>
                <Input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => handleFilterChange("startDate", e.target.value)}
                />
              </div>

              {/* Fecha Fin */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Hasta</label>
                <Input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => handleFilterChange("endDate", e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-between items-center">
              <Button variant="outline" onClick={clearFilters}>
                Limpiar Filtros
              </Button>
              
              {selectedEntries.size > 0 && (
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-600">
                    {selectedEntries.size} registros seleccionados
                    {totalSelectedPay > 0 && (
                      <span className="ml-2 font-medium">
                        (${totalSelectedPay.toLocaleString()})
                      </span>
                    )}
                  </span>
                  <Button onClick={handleBulkApprove} size="sm">
                    <Check className="h-4 w-4 mr-1" />
                    Aprobar Seleccionados
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabla */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Registros de Tiempo
              {pagination.total > 0 && (
                <Badge variant="outline">{pagination.total}</Badge>
              )}
            </CardTitle>
            <Button onClick={() => setShowTimeEntryDialog(true)}>
              Registrar Horas
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              <span>Cargando registros...</span>
            </div>
          ) : timeEntries.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No se encontraron registros de tiempo
            </div>
          ) : (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <input
                        type="checkbox"
                        checked={selectedEntries.size === timeEntries.length && timeEntries.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedEntries(new Set(timeEntries?.map?.(entry => entry.id) || []));
                          } else {
                            setSelectedEntries(new Set());
                          }
                        }}
                      />
                    </TableHead>
                    <TableHead>Empleado</TableHead>
                    <TableHead>Proyecto</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Horas</TableHead>
                    <TableHead>Extra</TableHead>
                    <TableHead>Total Pago</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {timeEntries?.map?.((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedEntries.has(entry.id)}
                          onChange={(e) => {
                            const newSelected = new Set(selectedEntries);
                            if (e.target.checked) {
                              newSelected.add(entry.id);
                            } else {
                              newSelected.delete(entry.id);
                            }
                            setSelectedEntries(newSelected);
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-400" />
                          {getPersonnelName(entry.personnel_id)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FolderOpen className="h-4 w-4 text-gray-400" />
                          {getProjectName(entry.project_id)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          {format(new Date(entry.work_date), "dd/MM/yyyy", { locale: es })}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono">
                        {entry.hours_worked}h
                      </TableCell>
                      <TableCell className="font-mono">
                        {entry.overtime_hours || 0}h
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3 text-green-600" />
                          <span className="font-medium">
                            {entry.total_pay.toLocaleString()}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={STATUS_COLORS[entry.status as TimeEntryStatus]}>
                          {STATUS_LABELS[entry.status as TimeEntryStatus]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" disabled={submitting === entry.id}>
                              {submitting === entry.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <MoreHorizontal className="h-4 w-4" />
                              )}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(entry)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            {entry.status === "draft" && (
                              <DropdownMenuItem onClick={() => handleStatusChange(entry, "submitted")}>
                                <Check className="h-4 w-4 mr-2" />
                                Enviar
                              </DropdownMenuItem>
                            )}
                            {entry.status === "submitted" && (
                              <DropdownMenuItem onClick={() => handleStatusChange(entry, "approved")}>
                                <Check className="h-4 w-4 mr-2" />
                                Aprobar
                              </DropdownMenuItem>
                            )}
                            {(entry.status === "submitted" || entry.status === "approved") && (
                              <DropdownMenuItem onClick={() => handleStatusChange(entry, "rejected")}>
                                <X className="h-4 w-4 mr-2" />
                                Rechazar
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem 
                              onClick={() => handleDelete(entry)}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )) || []}
                </TableBody>
              </Table>

              {/* Paginación */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    Mostrando {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total} registros
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                      disabled={pagination.page <= 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Anterior
                    </Button>
                    <span className="text-sm">
                      Página {pagination.page} de {pagination.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                      disabled={pagination.page >= pagination.totalPages}
                    >
                      Siguiente
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Registro/Edición */}
      <TimeEntryDialog
        open={showTimeEntryDialog}
        onOpenChange={(open) => {
          setShowTimeEntryDialog(open);
          if (!open) {
            setEditingTimeEntry(null);
          }
        }}
        timeEntry={editingTimeEntry}
        defaultPersonnelId={defaultPersonnelId}
        defaultProjectId={defaultProjectId}
        onSuccess={() => {
          loadTimeEntries();
          onRefresh?.();
        }}
      />
    </div>
  );
}