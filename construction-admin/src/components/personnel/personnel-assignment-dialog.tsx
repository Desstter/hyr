"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Users,
  Plus,
  Trash2,
  Loader2,
  Calendar,
  Briefcase,
} from "lucide-react";
import { toast } from "sonner";
import { personnelService } from "@/lib/api/personnel";
import { projectsService } from "@/lib/api/projects";
import { usePersonnelAssignmentActions } from "@/lib/hooks/usePersonnelAssignments";
import type { Personnel } from "@/lib/api/types";

interface Assignment {
  id: string;
  project_id: string;
  project_name: string;
  role?: string;
  hours_per_day?: number;
  is_primary?: boolean;
}

interface Project {
  id: string;
  name: string;
  status: string;
  client_name?: string;
  budget_total?: number;
  employees_assigned?: number;
}

interface PersonnelAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  personnel: Personnel | null;
  onSuccess?: () => void;
}

export function PersonnelAssignmentDialog({
  open,
  onOpenChange,
  personnel,
  onSuccess,
}: PersonnelAssignmentDialogProps) {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [availableProjects, setAvailableProjects] = useState<Project[]>([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  // Form state for new assignment
  const [newAssignment, setNewAssignment] = useState({
    project_id: "",
    role: "",
    hours_per_day: 8,
    is_primary: false,
  });

  const {
    assignToProject,
    unassignFromProject,
    loading: actionLoading,
  } = usePersonnelAssignmentActions();

  const loadAssignments = useCallback(async () => {
    if (!personnel?.id) return;

    setAssignmentsLoading(true);
    try {
      const data = await personnelService.getAssignments(personnel.id);
      setAssignments(data);
    } catch (error: unknown) {
      console.error("Error loading assignments:", error);
      toast.error(
        "Error al cargar asignaciones: " +
          ((error as Error)?.message || "Error desconocido")
      );
    } finally {
      setAssignmentsLoading(false);
    }
  }, [personnel?.id]);

  const loadAvailableProjects = useCallback(async () => {
    try {
      const response = await projectsService.list({
        status: "in_progress,planned",
      });
      setAvailableProjects(response);
    } catch (error: unknown) {
      console.error("Error loading projects:", error);
    }
  }, []);

  // Load assignments when dialog opens
  useEffect(() => {
    if (open && personnel?.id) {
      loadAssignments();
      loadAvailableProjects();
    }
  }, [open, personnel?.id, loadAssignments, loadAvailableProjects]);

  const handleAssignToProject = async () => {
    if (!personnel?.id || !newAssignment.project_id) {
      toast.error("Seleccione un proyecto");
      return;
    }

    try {
      await assignToProject(personnel.id, {
        project_id: newAssignment.project_id,
        role: newAssignment.role || personnel.position || "trabajador",
        hours_per_day: newAssignment.hours_per_day,
        is_primary: newAssignment.is_primary,
      });

      toast.success("Empleado asignado exitosamente");
      setShowAddForm(false);
      setNewAssignment({
        project_id: "",
        role: "",
        hours_per_day: 8,
        is_primary: false,
      });

      loadAssignments();
      onSuccess?.();
    } catch (error: unknown) {
      toast.error(
        "Error al asignar empleado: " + ((error as Error)?.message || "Error desconocido")
      );
    }
  };

  const handleUnassign = async (assignment: Assignment) => {
    if (!personnel?.id) return;

    const confirmed = confirm(
      `¿Está seguro de desasignar a ${personnel.name} del proyecto "${assignment.project_name}"?`
    );

    if (!confirmed) return;

    try {
      await unassignFromProject(personnel.id, assignment.project_id);
      toast.success("Empleado desasignado exitosamente");
      loadAssignments();
      onSuccess?.();
    } catch (error: unknown) {
      toast.error(
        "Error al desasignar empleado: " +
          ((error as Error)?.message || "Error desconocido")
      );
    }
  };

  // Calculate totals
  const totals = useMemo(() => {
    const totalHours = assignments.reduce(
      (sum, a) => sum + (a.hours_per_day || 0),
      0
    );
    const totalProjects = assignments.length;
    const primaryProjects = assignments.filter(
      a => a.is_primary
    ).length;

    let status = "disponible";
    if (totalHours > 8) status = "sobrecargado";
    else if (totalHours >= 8) status = "ocupado";
    else if (totalHours > 6) status = "parcialmente_ocupado";

    return {
      totalHours,
      totalProjects,
      primaryProjects,
      status,
      canTakeMore: totalHours < 8,
    };
  }, [assignments]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "sobrecargado":
        return "bg-red-100 text-red-800";
      case "ocupado":
        return "bg-yellow-100 text-yellow-800";
      case "parcialmente_ocupado":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-green-100 text-green-800";
    }
  };

  const availableProjectsForAssignment = availableProjects.filter(
    p => !assignments.find(a => a.project_id === p.id)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Asignaciones de Proyectos</span>
          </DialogTitle>
          <DialogDescription>
            Gestionar asignaciones de proyectos para {personnel?.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                  <Briefcase className="h-4 w-4 mr-1" />
                  Proyectos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totals.totalProjects}</div>
                <p className="text-xs text-gray-500">
                  {totals.primaryProjects} principal
                  {totals.primaryProjects !== 1 ? "es" : ""}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                  <Clock className="h-4 w-4 mr-1" />
                  Horas/Día
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totals.totalHours}</div>
                <p className="text-xs text-gray-500">de 8 horas máximo</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                  <AlertTriangle className="h-4 w-4 mr-1" />
                  Estado
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Badge className={getStatusColor(totals.status)}>
                  {totals.status === "sobrecargado"
                    ? "Sobrecargado"
                    : totals.status === "ocupado"
                      ? "Ocupado"
                      : totals.status === "parcialmente_ocupado"
                        ? "Parcial"
                        : "Disponible"}
                </Badge>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Capacidad
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-lg font-medium">
                  {totals.canTakeMore ? "Disponible" : "Completa"}
                </div>
                <p className="text-xs text-gray-500">
                  {8 - totals.totalHours}h disponibles
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Current Assignments */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Asignaciones Actuales</h3>
              <Button
                onClick={() => setShowAddForm(!showAddForm)}
                disabled={
                  !totals.canTakeMore ||
                  availableProjectsForAssignment.length === 0
                }
                size="sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                Asignar a Proyecto
              </Button>
            </div>

            {assignmentsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                Cargando asignaciones...
              </div>
            ) : assignments.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No hay asignaciones de proyectos</p>
                <p className="text-sm">
                  Este empleado está disponible para asignar
                </p>
              </div>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Proyecto</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Rol</TableHead>
                        <TableHead>Horas/Día</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Inicio</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {assignments.map(assignment => (
                        <TableRow key={assignment.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">
                                {assignment.project_name}
                              </div>
                              <Badge variant="outline" className="text-xs mt-1">
                                Activo
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            Sin cliente
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{assignment.role}</Badge>
                          </TableCell>
                          <TableCell>
                            <span className="font-medium">
                              {assignment.hours_per_day || 0}h
                            </span>
                          </TableCell>
                          <TableCell>
                            {assignment.is_primary ? (
                              <Badge className="bg-blue-100 text-blue-800">
                                Principal
                              </Badge>
                            ) : (
                              <Badge variant="outline">Secundario</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center text-sm text-gray-500">
                              <Calendar className="h-3 w-3 mr-1" />
                              {new Date(
                                "N/A"
                              ).toLocaleDateString("es-ES")}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleUnassign(assignment)}
                              disabled={actionLoading}
                              className="text-red-600 hover:text-red-700"
                            >
                              {actionLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Add Assignment Form */}
          {showAddForm && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Nueva Asignación</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="project">Proyecto</Label>
                    <Select
                      value={newAssignment.project_id}
                      onValueChange={value =>
                        setNewAssignment(prev => ({
                          ...prev,
                          project_id: value,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar proyecto" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableProjectsForAssignment.map(project => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.name}{" "}
                            {project.client_name && `- ${project.client_name}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="role">Rol en el Proyecto</Label>
                    <Input
                      id="role"
                      value={newAssignment.role}
                      onChange={e =>
                        setNewAssignment(prev => ({
                          ...prev,
                          role: e.target.value,
                        }))
                      }
                      placeholder={
                        personnel?.position || "ej. soldador, operario"
                      }
                    />
                  </div>

                  <div>
                    <Label htmlFor="hours">Horas por Día</Label>
                    <Input
                      id="hours"
                      type="number"
                      min="1"
                      max="8"
                      value={newAssignment.hours_per_day}
                      onChange={e =>
                        setNewAssignment(prev => ({
                          ...prev,
                          hours_per_day: parseInt(e.target.value) || 8,
                        }))
                      }
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="primary"
                      checked={newAssignment.is_primary}
                      onChange={e =>
                        setNewAssignment(prev => ({
                          ...prev,
                          is_primary: e.target.checked,
                        }))
                      }
                      className="rounded"
                    />
                    <Label htmlFor="primary">Proyecto Principal</Label>
                  </div>
                </div>

                <div className="flex space-x-2">
                  <Button
                    onClick={handleAssignToProject}
                    disabled={!newAssignment.project_id || actionLoading}
                  >
                    {actionLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Asignando...
                      </>
                    ) : (
                      "Asignar a Proyecto"
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowAddForm(false)}
                  >
                    Cancelar
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
