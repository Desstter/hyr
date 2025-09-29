// =====================================================
// FORMULARIO DE REGISTRO DE TIEMPO - NUEVA LÓGICA
// Componente para registrar llegada/salida con cálculo automático
// =====================================================

"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Clock, AlertTriangle, Calculator, CheckCircle } from "lucide-react";

// Schema de validación con NUEVA LÓGICA
const timeEntrySchema = z.object({
  personnel_id: z.string().min(1, "Empleado es requerido"),
  project_id: z.string().min(1, "Proyecto es requerido"),
  work_date: z.string().min(1, "Fecha es requerida"),
  arrival_time: z.string().min(1, "Hora de llegada es requerida"),
  departure_time: z.string().min(1, "Hora de salida es requerida"),
  description: z.string().optional(),
}).refine((data) => {
  if (data.arrival_time && data.departure_time) {
    return data.arrival_time < data.departure_time;
  }
  return true;
}, {
  message: "La hora de llegada debe ser anterior a la de salida",
  path: ["departure_time"],
});

type TimeEntryFormData = z.infer<typeof timeEntrySchema>;

interface TimeCalculation {
  effectiveHours: number;
  lateMinutes: number;
  overtimeHours: number;
  regularHours: number;
  lateDiscount: number;
  estimatedPay: number;
}

interface TimeEntryFormProps {
  onSubmit: (data: TimeEntryFormData) => Promise<void>;
  personnel: Array<{ id: string; name: string; position: string; expected_arrival_time?: string }>;
  projects: Array<{ id: string; name: string; client_name?: string }>;
  isLoading?: boolean;
  initialData?: Partial<TimeEntryFormData>;
}

export default function TimeEntryForm({
  onSubmit,
  personnel,
  projects,
  isLoading = false,
  initialData,
}: TimeEntryFormProps) {
  const [calculation, setCalculation] = useState<TimeCalculation | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<{ id: string; name: string; position: string; expected_arrival_time?: string } | null>(null);

  const form = useForm<TimeEntryFormData>({
    resolver: zodResolver(timeEntrySchema),
    defaultValues: {
      personnel_id: "",
      project_id: "",
      work_date: new Date().toISOString().split('T')[0],
      arrival_time: "",
      departure_time: "",
      description: "",
      ...initialData,
    },
  });

  const watchedValues = form.watch(["personnel_id", "arrival_time", "departure_time"]);

  // Calcular horas automáticamente cuando cambian los tiempos
  useEffect(() => {
    const [personnelId, arrivalTime, departureTime] = watchedValues;

    if (arrivalTime && departureTime && personnelId) {
      const employee = personnel.find(p => p.id === personnelId);
      if (employee) {
        setSelectedEmployee(employee);
        calculateHours(arrivalTime, departureTime, employee.expected_arrival_time || "07:00");
      }
    }
  }, [watchedValues, personnel]);

  const calculateHours = (arrivalTime: string, departureTime: string, expectedArrival: string) => {
    const arrival = new Date(`2000-01-01 ${arrivalTime}`);
    const departure = new Date(`2000-01-01 ${departureTime}`);
    const expected = new Date(`2000-01-01 ${expectedArrival}`);

    // Calcular horas totales (menos 1 hora de almuerzo)
    const totalMinutes = (departure.getTime() - arrival.getTime()) / (1000 * 60);
    const effectiveHours = Math.max(0, (totalMinutes - 60) / 60); // Restar almuerzo

    // Calcular tardanza
    const lateMinutes = arrival > expected ? (arrival.getTime() - expected.getTime()) / (1000 * 60) : 0;
    const toleranceMinutes = 5; // TODO: Obtener de configuración
    const penaltyLateMinutes = Math.max(0, lateMinutes - toleranceMinutes);

    // Horas legales por día
    const legalDailyHours = 7.3; // TODO: Obtener de configuración

    // Calcular horas regulares y extras
    const regularHours = Math.min(effectiveHours, legalDailyHours);
    const overtimeHours = Math.max(0, effectiveHours - legalDailyHours);

    // Estimación de descuento por tardanza (simulado)
    const hourlyRate = 15000; // TODO: Obtener del empleado
    const lateDiscount = (penaltyLateMinutes / 60) * hourlyRate;
    const estimatedPay = (regularHours * hourlyRate) + (overtimeHours * hourlyRate * 1.25) - lateDiscount;

    setCalculation({
      effectiveHours: Math.round(effectiveHours * 100) / 100,
      lateMinutes: Math.round(lateMinutes),
      overtimeHours: Math.round(overtimeHours * 100) / 100,
      regularHours: Math.round(regularHours * 100) / 100,
      lateDiscount,
      estimatedPay: Math.max(0, estimatedPay),
    });
  };

  const handleSubmit = async (data: TimeEntryFormData) => {
    try {
      await onSubmit(data);
      form.reset();
      setCalculation(null);
      setSelectedEmployee(null);
    } catch (error) {
      console.error("Error submitting time entry:", error);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Registro de Tiempo de Trabajo
          </CardTitle>
          <CardDescription>
            Registra la hora de llegada y salida. El sistema calculará automáticamente las horas trabajadas,
            tiempo extra y descuentos por tardanza.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="personnel_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Empleado</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona empleado" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {personnel.map((person) => (
                            <SelectItem key={person.id} value={person.id}>
                              {person.name} - {person.position}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="project_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Proyecto</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona proyecto" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {projects.map((project) => (
                            <SelectItem key={project.id} value={project.id}>
                              {project.name}
                              {project.client_name && ` - ${project.client_name}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="work_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha de Trabajo</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="arrival_time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hora de Llegada</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormDescription>
                        {selectedEmployee?.expected_arrival_time &&
                          `Hora esperada: ${selectedEmployee.expected_arrival_time}`}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="departure_time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hora de Salida</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descripción (Opcional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe las actividades realizadas..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading ? "Guardando..." : "Registrar Tiempo"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Panel de Cálculos Automáticos */}
      {calculation && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Cálculo Automático
            </CardTitle>
            <CardDescription>
              Resumen de horas y pagos estimados basado en los tiempos registrados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {calculation.effectiveHours}h
                </div>
                <div className="text-sm text-gray-600">Horas Efectivas</div>
              </div>

              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {calculation.regularHours}h
                </div>
                <div className="text-sm text-gray-600">Horas Regulares</div>
              </div>

              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {calculation.overtimeHours}h
                </div>
                <div className="text-sm text-gray-600">Horas Extra</div>
              </div>

              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  ${calculation.estimatedPay.toLocaleString()}
                </div>
                <div className="text-sm text-gray-600">Pago Estimado</div>
              </div>
            </div>

            {calculation.lateMinutes > 0 && (
              <Alert className="mt-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="flex items-center justify-between">
                    <span>
                      Tardanza de {calculation.lateMinutes} minutos detectada.
                      Descuento estimado: ${calculation.lateDiscount.toLocaleString()}
                    </span>
                    <Badge variant="destructive">Tardanza</Badge>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {calculation.overtimeHours > 0 && (
              <Alert className="mt-2">
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="flex items-center justify-between">
                    <span>
                      Se registrarán {calculation.overtimeHours}h de tiempo extra con recargo del 25%
                    </span>
                    <Badge variant="secondary">Tiempo Extra</Badge>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            <div className="mt-4 p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
              <strong>Información:</strong> Los cálculos se basan en 7.3 horas legales por día.
              Se descuenta 1 hora de almuerzo automáticamente. Tolerancia de 5 minutos para tardanzas.
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}