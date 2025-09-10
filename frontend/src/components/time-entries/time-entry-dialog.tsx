"use client";

import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "@/components/ui/use-toast";
import {
  Clock,
  User,
  FolderOpen,
  Calendar,
  AlertTriangle,
  Calculator,
  Loader2,
} from "lucide-react";
import type { TimeEntry, Personnel, Project } from "@/lib/api/types";
import { timeEntriesService } from "@/lib/api/time-entries";
import { personnelService } from "@/lib/api/personnel";
import { projectsService } from "@/lib/api/projects";

interface TimeEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  timeEntry?: TimeEntry | null;
  defaultPersonnelId?: string;
  defaultProjectId?: string;
  onSuccess?: () => void;
}

interface FormData {
  personnel_id: string;
  project_id: string;
  work_date: string;
  hours_worked: string;
  overtime_hours: string;
  description: string;
}

interface PayCalculation {
  hourly_rate: number;
  regular_pay: number;
  overtime_pay: number;
  total_pay: number;
}

const MAX_REGULAR_HOURS = 8;
const MAX_TOTAL_HOURS = 12;
const OVERTIME_MULTIPLIER = 1.25;

export function TimeEntryDialog({
  open,
  onOpenChange,
  timeEntry,
  defaultPersonnelId,
  defaultProjectId,
  onSuccess,
}: TimeEntryDialogProps) {
  const [formData, setFormData] = useState<FormData>({
    personnel_id: defaultPersonnelId || "",
    project_id: defaultProjectId || "",
    work_date: format(new Date(), "yyyy-MM-dd"),
    hours_worked: "",
    overtime_hours: "0",
    description: "",
  });

  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [payCalculation, setPayCalculation] = useState<PayCalculation | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);

  const resetForm = useCallback(() => {
    setFormData({
      personnel_id: defaultPersonnelId || "",
      project_id: defaultProjectId || "",
      work_date: format(new Date(), "yyyy-MM-dd"),
      hours_worked: "",
      overtime_hours: "0",
      description: "",
    });
    setPayCalculation(null);
    setErrors([]);
    setWarnings([]);
  }, [defaultPersonnelId, defaultProjectId]);

  const calculatePay = useCallback(async () => {
    try {
      const selectedPersonnel = Array.isArray(personnel) ? personnel.find(p => p.id === formData.personnel_id) : undefined;
      if (!selectedPersonnel) return;

      const regularHours = parseFloat(formData.hours_worked) || 0;
      const overtimeHours = parseFloat(formData.overtime_hours) || 0;

      let hourlyRate: number;
      if (selectedPersonnel.salary_type === "hourly") {
        hourlyRate = selectedPersonnel.hourly_rate || 0;
      } else {
        hourlyRate = (selectedPersonnel.monthly_salary || 0) / 192; // 192 horas mensuales
      }

      const regularPay = regularHours * hourlyRate;
      const overtimePay = overtimeHours * hourlyRate * OVERTIME_MULTIPLIER;
      const totalPay = regularPay + overtimePay;

      setPayCalculation({
        hourly_rate: hourlyRate,
        regular_pay: regularPay,
        overtime_pay: overtimePay,
        total_pay: totalPay,
      });

      // Validaciones automáticas
      const newErrors: string[] = [];
      const newWarnings: string[] = [];

      if (regularHours > MAX_REGULAR_HOURS) {
        newWarnings.push(`Horas regulares (${regularHours}) exceden las ${MAX_REGULAR_HOURS}h recomendadas`);
      }

      if (regularHours + overtimeHours > MAX_TOTAL_HOURS) {
        newErrors.push(`Total de horas (${regularHours + overtimeHours}) excede el máximo legal de ${MAX_TOTAL_HOURS}h`);
      }

      setErrors(newErrors);
      setWarnings(newWarnings);

    } catch (error) {
      console.error("Error calculating pay:", error);
    }
  }, [formData.personnel_id, formData.hours_worked, formData.overtime_hours, personnel]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [personnelData, projectsData] = await Promise.all([
        personnelService.getAll({ status: "active" }),
        projectsService.getAll({ status: "in_progress" }),
      ]);
      setPersonnel(personnelData);
      setProjects(projectsData);
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Cargar datos iniciales
  useEffect(() => {
    if (open) {
      loadData();
      if (timeEntry) {
        setFormData({
          personnel_id: timeEntry.personnel_id,
          project_id: timeEntry.project_id,
          work_date: timeEntry.work_date,
          hours_worked: timeEntry.hours_worked.toString(),
          overtime_hours: timeEntry.overtime_hours?.toString() || "0",
          description: timeEntry.description || "",
        });
      } else {
        resetForm();
      }
    }
  }, [open, timeEntry, resetForm]);

  // Calcular pago automáticamente cuando cambian las horas
  useEffect(() => {
    if (formData.personnel_id && formData.hours_worked) {
      calculatePay();
    }
  }, [formData.personnel_id, formData.hours_worked, formData.overtime_hours, calculatePay]);

  const handleSubmit = async () => {
    try {
      setSubmitting(true);

      const selectedPersonnel = Array.isArray(personnel) ? personnel.find(p => p.id === formData.personnel_id) : undefined;
      let hourlyRate = 0;
      if (selectedPersonnel) {
        if (selectedPersonnel.salary_type === "hourly") {
          hourlyRate = selectedPersonnel.hourly_rate || 0;
        } else {
          hourlyRate = (selectedPersonnel.monthly_salary || 0) / 192;
        }
      }

      const payload = {
        personnel_id: formData.personnel_id,
        project_id: formData.project_id,
        work_date: formData.work_date,
        hours_worked: parseFloat(formData.hours_worked),
        overtime_hours: parseFloat(formData.overtime_hours) || 0,
        description: formData.description,
        hourly_rate: hourlyRate,
      };

      if (timeEntry) {
        await timeEntriesService.update(timeEntry.id, payload);
        toast({
          title: "✅ Registro actualizado",
          description: "Las horas trabajadas han sido actualizadas",
        });
      } else {
        const result = await timeEntriesService.create(payload);
        if (result.warnings && result.warnings.length > 0) {
          toast({
            title: "⚠️ Registro creado con advertencias",
            description: result.warnings.join(", "),
          });
        } else {
          toast({
            title: "✅ Horas registradas",
            description: "El registro de tiempo ha sido creado exitosamente",
          });
        }
      }

      onSuccess?.();
      onOpenChange(false);
    } catch (error: unknown) {
      console.error("Error saving time entry:", error);
      
      const apiError = error as { response?: { data?: { details?: string[]; error?: string } } };
      if (apiError.response?.data?.details) {
        setErrors(apiError.response.data.details);
      } else {
        toast({
          title: "Error",
          description: apiError.response?.data?.error || "Error al guardar el registro",
          variant: "destructive",
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const isFormValid = () => {
    return (
      formData.personnel_id &&
      formData.project_id &&
      formData.work_date &&
      formData.hours_worked &&
      parseFloat(formData.hours_worked) > 0 &&
      errors.length === 0
    );
  };

  const selectedPersonnel = Array.isArray(personnel) ? personnel.find(p => p.id === formData.personnel_id) : undefined;
  const selectedProject = Array.isArray(projects) ? projects.find(p => p.id === formData.project_id) : undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            {timeEntry ? "Editar Registro de Tiempo" : "Registrar Horas Trabajadas"}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span>Cargando datos...</span>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Errores */}
            {errors.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <ul className="list-disc pl-4">
                    {errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Advertencias */}
            {warnings.length > 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <ul className="list-disc pl-4">
                    {warnings.map((warning, index) => (
                      <li key={index}>{warning}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Empleado */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Empleado *
              </Label>
              <Select
                value={formData.personnel_id}
                onValueChange={(value) =>
                  setFormData(prev => ({ ...prev, personnel_id: value }))
                }
                disabled={!!defaultPersonnelId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar empleado" />
                </SelectTrigger>
                <SelectContent>
                  {Array.isArray(personnel) ? personnel.map((person) => (
                    <SelectItem key={person.id} value={person.id}>
                      <div className="flex items-center justify-between w-full">
                        <span>{person.name}</span>
                        <Badge variant="secondary" className="ml-2">
                          {person.position}
                        </Badge>
                      </div>
                    </SelectItem>
                  )) : []}
                </SelectContent>
              </Select>
              {selectedPersonnel && (
                <div className="text-sm text-gray-600">
                  {selectedPersonnel.department} • {
                    selectedPersonnel.salary_type === "hourly" 
                      ? `$${selectedPersonnel.hourly_rate?.toLocaleString()}/hora`
                      : `$${selectedPersonnel.monthly_salary?.toLocaleString()}/mes`
                  }
                </div>
              )}
            </div>

            {/* Proyecto */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <FolderOpen className="h-4 w-4" />
                Proyecto *
              </Label>
              <Select
                value={formData.project_id}
                onValueChange={(value) =>
                  setFormData(prev => ({ ...prev, project_id: value }))
                }
                disabled={!!defaultProjectId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar proyecto" />
                </SelectTrigger>
                <SelectContent>
                  {Array.isArray(projects) ? projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      <div className="flex items-center justify-between w-full">
                        <span>{project.name}</span>
                        <Badge variant="outline" className="ml-2">
                          {project.status}
                        </Badge>
                      </div>
                    </SelectItem>
                  )) : []}
                </SelectContent>
              </Select>
              {selectedProject && (
                <div className="text-sm text-gray-600">
                  Cliente: {selectedProject.client?.name || "Sin cliente"}
                </div>
              )}
            </div>

            {/* Fecha */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Fecha de Trabajo *
              </Label>
              <Input
                type="date"
                value={formData.work_date}
                onChange={(e) =>
                  setFormData(prev => ({ ...prev, work_date: e.target.value }))
                }
                max={format(new Date(), "yyyy-MM-dd")}
              />
            </div>

            {/* Horas */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Horas Regulares *</Label>
                <Input
                  type="number"
                  step="0.25"
                  min="0"
                  max="12"
                  value={formData.hours_worked}
                  onChange={(e) =>
                    setFormData(prev => ({ ...prev, hours_worked: e.target.value }))
                  }
                  placeholder="8.00"
                />
              </div>
              <div className="space-y-2">
                <Label>Horas Extra</Label>
                <Input
                  type="number"
                  step="0.25"
                  min="0"
                  max="4"
                  value={formData.overtime_hours}
                  onChange={(e) =>
                    setFormData(prev => ({ ...prev, overtime_hours: e.target.value }))
                  }
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Cálculo de Pago */}
            {payCalculation && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <Calculator className="h-4 w-4 text-blue-600" />
                  <span className="font-medium text-blue-900">Cálculo de Pago</span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Tarifa por hora:</span>
                    <div className="font-medium">${payCalculation.hourly_rate.toLocaleString()}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Pago regular:</span>
                    <div className="font-medium">${payCalculation.regular_pay.toLocaleString()}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Pago extra (25%):</span>
                    <div className="font-medium">${payCalculation.overtime_pay.toLocaleString()}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Total a pagar:</span>
                    <div className="font-bold text-green-600">${payCalculation.total_pay.toLocaleString()}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Descripción */}
            <div className="space-y-2">
              <Label>Descripción del Trabajo</Label>
              <Textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData(prev => ({ ...prev, description: e.target.value }))
                }
                placeholder="Describe brevemente las actividades realizadas..."
                rows={3}
              />
            </div>

            {/* Botones */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={submitting}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!isFormValid() || submitting}
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                {timeEntry ? "Actualizar" : "Registrar Horas"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}