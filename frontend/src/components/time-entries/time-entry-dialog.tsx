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
import { Checkbox } from "@/components/ui/checkbox";
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
  arrival_time: string;        // NUEVO: Hora de llegada "HH:MM"
  departure_time: string;      // NUEVO: Hora de salida "HH:MM"
  lunch_deducted: boolean;     // NUEVO: Control de deducción de almuerzo
  hours_worked: string;        // OPCIONAL: Se calcula automáticamente
  overtime_hours: string;      // OPCIONAL: Se calcula automáticamente
  description: string;
}

interface PayCalculation {
  hourly_rate: number;
  regular_pay: number;
  overtime_pay: number;
  total_pay: number;
}

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
    arrival_time: "",           // NUEVO: Hora de llegada
    departure_time: "",         // NUEVO: Hora de salida
    lunch_deducted: true,       // NUEVO: Por defecto se descuenta almuerzo
    hours_worked: "",           // Se calcula automáticamente
    overtime_hours: "0",        // Se calcula automáticamente
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
      arrival_time: "",           // NUEVO: Reset tiempo de llegada
      departure_time: "",         // NUEVO: Reset tiempo de salida
      lunch_deducted: true,       // NUEVO: Por defecto se descuenta almuerzo
      hours_worked: "",           // Se calcula automáticamente
      overtime_hours: "0",        // Se calcula automáticamente
      description: "",
    });
    setPayCalculation(null);
    setErrors([]);
    setWarnings([]);
  }, [defaultPersonnelId, defaultProjectId]);

  // NUEVA FUNCIÓN: Calcular horas nocturnas
  const calculateNightHours = useCallback((arrivalTime: string, departureTime: string, crossesMidnight: boolean) => {
    const nightStart = '22:00'; // 10 PM - configuración por defecto
    const nightEnd = '06:00';   // 6 AM - configuración por defecto

    const arrival = new Date(`2000-01-01 ${arrivalTime}`);
    const nightStartTime = new Date(`2000-01-01 ${nightStart}`);
    const nightEndTime = new Date(`2000-01-01 ${nightEnd}`);

    let departure: Date;
    let nightHours = 0;

    if (crossesMidnight) {
      departure = new Date(`2000-01-02 ${departureTime}`);

      // Caso 1: Turno cruza medianoche
      // Calcular horas nocturnas desde llegada hasta medianoche (si aplica)
      if (arrival >= nightStartTime) {
        const midnightTime = new Date(`2000-01-02 00:00:00`);
        nightHours += (midnightTime.getTime() - arrival.getTime()) / (1000 * 60 * 60);
      }

      // Calcular horas nocturnas desde medianoche hasta salida (si aplica)
      const nextDayNightEnd = new Date(`2000-01-02 ${nightEnd}`);
      if (departure <= nextDayNightEnd) {
        const midnightTime = new Date(`2000-01-02 00:00:00`);
        nightHours += (departure.getTime() - midnightTime.getTime()) / (1000 * 60 * 60);
      } else if (nextDayNightEnd < departure) {
        // Trabajó hasta después de las 6 AM
        nightHours += (nextDayNightEnd.getTime() - new Date(`2000-01-02 00:00:00`).getTime()) / (1000 * 60 * 60);
      }
    } else {
      departure = new Date(`2000-01-01 ${departureTime}`);

      // Caso 2: Turno normal en el mismo día
      // Solo contar horas nocturnas si trabaja después de las 22:00
      if (arrival >= nightStartTime && departure > nightStartTime) {
        nightHours = (departure.getTime() - Math.max(arrival.getTime(), nightStartTime.getTime())) / (1000 * 60 * 60);
      }

      // También contar horas nocturnas si trabaja antes de las 6:00 AM (turno madrugada)
      if (arrival < nightEndTime && departure <= nightEndTime) {
        nightHours += (Math.min(departure.getTime(), nightEndTime.getTime()) - arrival.getTime()) / (1000 * 60 * 60);
      }
    }

    return Math.max(0, nightHours);
  }, []);

  // NUEVA FUNCIÓN: Calcular horas automáticamente desde tiempos de llegada/salida
  // Soporta turnos que cruzan medianoche (ej: 20:00 a 05:00 del día siguiente)
  const calculateHoursFromTimes = useCallback((arrivalTime: string, departureTime: string, lunchDeducted: boolean = true) => {
    if (!arrivalTime || !departureTime) return { effectiveHours: 0, overtimeHours: 0, nightHours: 0, crossesMidnight: false };

    try {
      const arrival = new Date(`2000-01-01 ${arrivalTime}`);
      let departure = new Date(`2000-01-01 ${departureTime}`);
      let crossesMidnight = false;

      // Detectar si el turno cruza medianoche
      if (departure <= arrival) {
        // El turno cruza medianoche, agregar 24 horas a la salida
        departure = new Date(`2000-01-02 ${departureTime}`);
        crossesMidnight = true;
      }

      const diffMs = departure.getTime() - arrival.getTime();
      let totalHours = diffMs / (1000 * 60 * 60);

      // Restar 1 hora de almuerzo solo si está habilitado
      if (lunchDeducted) {
        totalHours = Math.max(0, totalHours - 1);
      }

      // Calcular horas nocturnas (22:00 - 06:00) - configuración por defecto
      const nightHours = calculateNightHours(arrivalTime, departureTime, crossesMidnight);

      // Calcular sobretiempo basado en 7.3 horas legales colombianas
      const legalDailyHours = 7.3;
      const overtimeHours = Math.max(0, totalHours - legalDailyHours);
      const regularHours = Math.min(totalHours, legalDailyHours);

      return {
        effectiveHours: regularHours,
        overtimeHours: overtimeHours,
        nightHours: nightHours,
        totalHours: totalHours,
        crossesMidnight: crossesMidnight
      };
    } catch (error) {
      console.error("Error calculating hours:", error);
      return { effectiveHours: 0, overtimeHours: 0, nightHours: 0, crossesMidnight: false };
    }
  }, [calculateNightHours]);

  // NUEVA FUNCIÓN: Calcular tardanzas y salidas tempranas
  const calculateTardiness = useCallback((actualTime: string, expectedTime: string, isArrival: boolean = true) => {
    if (!actualTime || !expectedTime) return { minutes: 0, message: "" };

    try {
      const actual = new Date(`2000-01-01 ${actualTime}`);
      const expected = new Date(`2000-01-01 ${expectedTime}`);

      const diffMs = actual.getTime() - expected.getTime();
      const diffMinutes = Math.round(diffMs / (1000 * 60));

      if (isArrival) {
        // Para llegadas: positivo = tarde, negativo = temprano
        if (diffMinutes > 0) {
          return {
            minutes: diffMinutes,
            message: `Tardanza de ${diffMinutes} minutos`,
            type: "late" as const
          };
        } else if (diffMinutes < 0) {
          return {
            minutes: Math.abs(diffMinutes),
            message: `Llegada ${Math.abs(diffMinutes)} minutos antes`,
            type: "early" as const
          };
        }
      } else {
        // Para salidas: negativo = temprano, positivo = tarde
        if (diffMinutes < 0) {
          return {
            minutes: Math.abs(diffMinutes),
            message: `Salida ${Math.abs(diffMinutes)} minutos antes`,
            type: "early" as const
          };
        } else if (diffMinutes > 0) {
          return {
            minutes: diffMinutes,
            message: `Salida ${diffMinutes} minutos después`,
            type: "late" as const
          };
        }
      }

      return { minutes: 0, message: "A tiempo", type: "ontime" as const };
    } catch {
      return { minutes: 0, message: "" };
    }
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [personnelData, projectsData] = await Promise.all([
        personnelService.getAll({ status: "active" }),
        projectsService.getAll({ status: "planned,in_progress,on_hold" }),
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
          arrival_time: timeEntry.arrival_time || "",       // NUEVO: Cargar tiempo de llegada
          departure_time: timeEntry.departure_time || "",   // NUEVO: Cargar tiempo de salida
          lunch_deducted: timeEntry.lunch_deducted !== false, // NUEVO: Cargar preferencia de almuerzo
          hours_worked: timeEntry.hours_worked.toString(),  // Mantener para compatibilidad
          overtime_hours: timeEntry.overtime_hours?.toString() || "0",
          description: timeEntry.description || "",
        });
      } else {
        resetForm();
      }
    }
  }, [open, timeEntry, resetForm]);

  // NUEVO: Auto-poblacion de tiempos esperados cuando se selecciona empleado
  useEffect(() => {
    if (formData.personnel_id && personnel.length > 0 && !timeEntry) {
      const selectedPersonnel = personnel.find(p => p.id === formData.personnel_id);
      if (selectedPersonnel && selectedPersonnel.expected_arrival_time && selectedPersonnel.expected_departure_time) {
        // Solo auto-poblar si los campos están vacíos
        if (!formData.arrival_time && !formData.departure_time) {
          setFormData(prev => ({
            ...prev,
            arrival_time: selectedPersonnel.expected_arrival_time || "",
            departure_time: selectedPersonnel.expected_departure_time || ""
          }));
        }
      }
    }
  }, [formData.personnel_id, personnel, timeEntry, formData.arrival_time, formData.departure_time]);

  // ACTUALIZADO: Calcular pago automáticamente cuando cambian los tiempos o el lunch_deducted
  useEffect(() => {
    if (formData.personnel_id && formData.arrival_time && formData.departure_time && personnel.length > 0) {
      try {
        const selectedPersonnel = Array.isArray(personnel) ? personnel.find(p => p.id === formData.personnel_id) : undefined;
        if (!selectedPersonnel) return;

        // NUEVA LÓGICA: Calcular horas desde tiempos de llegada/salida
        const timeCalculation = calculateHoursFromTimes(formData.arrival_time, formData.departure_time, formData.lunch_deducted);
        const regularHours = timeCalculation.effectiveHours || 0;
        const overtimeHours = timeCalculation.overtimeHours || 0;

        let hourlyRate: number;
        if (selectedPersonnel.daily_rate) {
          hourlyRate = selectedPersonnel.daily_rate / 7.3; // 7.3 horas legales por día en Colombia
        } else if (selectedPersonnel.salary_base) {
          hourlyRate = selectedPersonnel.salary_base / 192; // 192 horas mensuales
        } else {
          hourlyRate = 0;
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

        // ACTUALIZADAS: Validaciones basadas en tiempo (duplicadas para consistencia)
        const newErrors: string[] = [];
        const newWarnings: string[] = [];

        const totalHours = regularHours + overtimeHours;

        // Validar que los tiempos sean coherentes - PERMITIR turnos que cruzan medianoche
        if (formData.arrival_time && formData.departure_time) {
          // Solo mostrar error si son exactamente iguales (no hay trabajo)
          if (formData.arrival_time === formData.departure_time) {
            newErrors.push('La hora de llegada y salida no pueden ser iguales');
          }

          // Para turnos que cruzan medianoche, no mostrar error
          // La lógica de cálculo ya maneja este caso correctamente
        }

        // Validar límites de horas legales
        if (totalHours > MAX_TOTAL_HOURS) {
          newErrors.push(`Total de horas trabajadas (${totalHours.toFixed(2)}) excede el máximo legal de ${MAX_TOTAL_HOURS}h por día`);
        }

        if (regularHours > 7.3) {
          newWarnings.push(`Se registrarán ${overtimeHours.toFixed(2)}h como sobretiempo (excede 7.3h legales)`);
        }

        // Validar tardanzas significativas
        if (selectedPersonnel?.expected_arrival_time && formData.arrival_time) {
          const tardiness = calculateTardiness(formData.arrival_time, selectedPersonnel.expected_arrival_time, true);
          if (tardiness.type === 'late' && tardiness.minutes > 15) {
            newWarnings.push(`Tardanza significativa de ${tardiness.minutes} minutos`);
          }
        }

        // Validar salidas muy tempranas
        if (selectedPersonnel?.expected_departure_time && formData.departure_time) {
          const earlyDeparture = calculateTardiness(formData.departure_time, selectedPersonnel.expected_departure_time, false);
          if (earlyDeparture.type === 'early' && earlyDeparture.minutes > 30) {
            newWarnings.push(`Salida muy temprana: ${earlyDeparture.minutes} minutos antes`);
          }
        }

        setErrors(newErrors);
        setWarnings(newWarnings);

      } catch (error) {
        console.error("Error calculating pay:", error);
      }
    } else {
      // Reset calculation if no valid data
      setPayCalculation(null);
      setErrors([]);
      setWarnings([]);
    }
  }, [formData.personnel_id, formData.arrival_time, formData.departure_time, formData.lunch_deducted, personnel, calculateHoursFromTimes, calculateTardiness]);

  const handleSubmit = async () => {
    try {
      setSubmitting(true);

      // NUEVA LÓGICA: Payload con tiempos en lugar de horas manuales
      const payload = {
        personnel_id: formData.personnel_id,
        project_id: formData.project_id || undefined,
        work_date: formData.work_date,
        arrival_time: formData.arrival_time,        // REQUERIDO por backend
        departure_time: formData.departure_time,    // REQUERIDO por backend
        lunch_deducted: formData.lunch_deducted,    // NUEVO: Control de deducción de almuerzo
        description: formData.description,
        // NOTA: hours_worked, overtime_hours y hourly_rate se calculan automáticamente en el backend
      };

      if (timeEntry) {
        await timeEntriesService.update(timeEntry.id, payload);
        toast({
          title: "✅ Registro actualizado",
          description: "Las horas trabajadas han sido actualizadas",
        });
      } else {
        const result = await timeEntriesService.create(payload) as TimeEntry & { warnings?: string[] };
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
      formData.work_date &&
      formData.arrival_time &&     // NUEVO: Validar que hay hora de llegada
      formData.departure_time &&   // NUEVO: Validar que hay hora de salida
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
                    selectedPersonnel.daily_rate
                      ? `$${Math.round(selectedPersonnel.daily_rate / 7.3).toLocaleString()}/hora (${selectedPersonnel.daily_rate.toLocaleString()}/día)`
                      : selectedPersonnel.salary_base
                      ? `$${selectedPersonnel.salary_base.toLocaleString()}/mes`
                      : "Sin tarifa configurada"
                  }
                </div>
              )}
            </div>

            {/* Proyecto */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <FolderOpen className="h-4 w-4" />
                Proyecto
              </Label>
              <Select
                value={formData.project_id || "none"}
                onValueChange={(value) =>
                  setFormData(prev => ({ ...prev, project_id: value === "none" ? "" : value }))
                }
                disabled={!!defaultProjectId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar proyecto" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Sin proyecto asignado</span>
                    </div>
                  </SelectItem>
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
              {formData.project_id ? (
                selectedProject ? (
                  <div className="text-sm text-gray-600">
                    Cliente: {selectedProject.client?.name || "Sin cliente"}
                  </div>
                ) : null
              ) : (
                <div className="text-sm text-muted-foreground">
                  Horas registradas sin asignación a proyecto específico
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

            {/* NUEVO: Tiempos de llegada y salida */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Hora de Llegada *
                </Label>
                <Input
                  type="time"
                  value={formData.arrival_time}
                  onChange={(e) =>
                    setFormData(prev => ({ ...prev, arrival_time: e.target.value }))
                  }
                  placeholder="08:00"
                />
                {selectedPersonnel?.expected_arrival_time && (
                  <div className="text-xs text-gray-500">
                    Hora esperada: {selectedPersonnel.expected_arrival_time}
                    {formData.arrival_time && (() => {
                      const tardiness = calculateTardiness(formData.arrival_time, selectedPersonnel.expected_arrival_time, true);
                      if (tardiness.message) {
                        return (
                          <div className={`mt-1 text-xs ${
                            tardiness.type === 'late' ? 'text-red-600' :
                            tardiness.type === 'early' ? 'text-blue-600' : 'text-green-600'
                          }`}>
                            {tardiness.message}
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Hora de Salida *
                </Label>
                <Input
                  type="time"
                  value={formData.departure_time}
                  onChange={(e) =>
                    setFormData(prev => ({ ...prev, departure_time: e.target.value }))
                  }
                  placeholder="17:00"
                />
                {selectedPersonnel?.expected_departure_time && (
                  <div className="text-xs text-gray-500">
                    Hora esperada: {selectedPersonnel.expected_departure_time}
                    {formData.departure_time && (() => {
                      const tardiness = calculateTardiness(formData.departure_time, selectedPersonnel.expected_departure_time, false);
                      if (tardiness.message) {
                        return (
                          <div className={`mt-1 text-xs ${
                            tardiness.type === 'early' ? 'text-red-600' :
                            tardiness.type === 'late' ? 'text-blue-600' : 'text-green-600'
                          }`}>
                            {tardiness.message}
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                )}
              </div>
            </div>

            {/* NUEVO: Control de deducción de almuerzo */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="lunch_deducted"
                  checked={formData.lunch_deducted}
                  onCheckedChange={(checked) =>
                    setFormData(prev => ({ ...prev, lunch_deducted: checked === true }))
                  }
                />
                <Label htmlFor="lunch_deducted" className="text-sm">
                  Descontar 1 hora de almuerzo
                </Label>
              </div>
              <div className="text-xs text-gray-500 ml-6">
                Desmarcar si se trabajó menos tiempo del necesario para el almuerzo
              </div>
            </div>

            {/* NUEVO: Resumen de horas calculadas con detección de turno nocturno */}
            {formData.arrival_time && formData.departure_time && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <Calculator className="h-4 w-4 text-gray-600" />
                  <span className="font-medium text-gray-900">Resumen de Tiempo</span>
                  {(() => {
                    const timeCalc = calculateHoursFromTimes(formData.arrival_time, formData.departure_time, formData.lunch_deducted);
                    if (timeCalc.crossesMidnight) {
                      return (
                        <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                          🌙 Turno nocturno
                        </span>
                      );
                    }
                    return null;
                  })()}
                </div>
                <div className="grid grid-cols-4 gap-4 text-sm">
                  {(() => {
                    const timeCalc = calculateHoursFromTimes(formData.arrival_time, formData.departure_time, formData.lunch_deducted);
                    return (
                      <>
                        <div>
                          <span className="text-gray-600">Horas regulares:</span>
                          <div className="font-medium">{timeCalc.effectiveHours?.toFixed(2) || "0.00"}h</div>
                        </div>
                        <div>
                          <span className="text-gray-600">Horas extra:</span>
                          <div className="font-medium">{timeCalc.overtimeHours?.toFixed(2) || "0.00"}h</div>
                        </div>
                        <div>
                          <span className="text-gray-600">Horas nocturnas:</span>
                          <div className="font-medium text-blue-600">{timeCalc.nightHours?.toFixed(2) || "0.00"}h</div>
                        </div>
                        <div>
                          <span className="text-gray-600">Total trabajado:</span>
                          <div className="font-medium">{timeCalc.totalHours?.toFixed(2) || "0.00"}h</div>
                        </div>
                      </>
                    );
                  })()}
                </div>
                <div className="text-xs text-gray-500 mt-2">
                  {formData.lunch_deducted
                    ? "* Se descuenta 1 hora de almuerzo automáticamente"
                    : "* No se descuenta tiempo de almuerzo"
                  }
                  {(() => {
                    const timeCalc = calculateHoursFromTimes(formData.arrival_time, formData.departure_time, formData.lunch_deducted);
                    if (timeCalc.nightHours > 0) {
                      return (
                        <div className="text-blue-600 mt-1">
                          * Horas nocturnas (22:00-06:00) con recargo del 35%
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
              </div>
            )}

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