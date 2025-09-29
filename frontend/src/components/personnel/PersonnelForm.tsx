// =====================================================
// FORMULARIO DE EMPLEADOS - NUEVA LÓGICA DE NÓMINAS
// Formulario actualizado para manejar salary_base y daily_rate
// =====================================================

"use client";

import React from "react";
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
import { Separator } from "@/components/ui/separator";
import { User, DollarSign, Clock, Shield, Calculator } from "lucide-react";

// Schema actualizado con nueva lógica y tipos enum que coincide exactamente con PersonnelFormData
const personnelSchema = z.object({
  name: z.string().min(2, "Nombre debe tener al menos 2 caracteres"),
  document_type: z.string(),
  document_number: z.string().min(6, "Número de documento inválido"),
  phone: z.string().optional(),
  email: z.string().optional(),
  address: z.string().optional(),
  position: z.enum(["soldador", "operario", "supervisor", "capataz", "ayudante", "administrador", "gerente"]),
  department: z.enum(["construccion", "soldadura", "administracion", "mantenimiento"]),
  hire_date: z.string().min(1, "Fecha de contratación es requerida"),
  status: z.enum(["active", "inactive", "terminated"]),
  salary_base: z.number().min(1300000, "Salario base debe ser al menos el mínimo legal"),
  daily_rate: z.number().min(1, "Precio por día debe ser mayor a 0"),
  expected_arrival_time: z.string(),
  expected_departure_time: z.string(),
  arl_risk_class: z.enum(["I", "II", "III", "IV", "V"]),
  emergency_contact: z.string().optional(),
  emergency_phone: z.string().optional(),
  bank_account: z.string().optional(),
});

// Derive the type from the schema for perfect type compatibility
type PersonnelFormSchemaType = z.infer<typeof personnelSchema>;

interface PersonnelFormProps {
  onSubmit: (data: PersonnelFormSchemaType) => Promise<void>;
  isLoading?: boolean;
  initialData?: Partial<PersonnelFormSchemaType>;
}

const DOCUMENT_TYPES = [
  { value: "CC", label: "Cédula de Ciudadanía" },
  { value: "CE", label: "Cédula de Extranjería" },
  { value: "TI", label: "Tarjeta de Identidad" },
  { value: "PP", label: "Pasaporte" },
];

const POSITIONS = [
  { value: "soldador", label: "Soldador" },
  { value: "operario", label: "Operario" },
  { value: "supervisor", label: "Supervisor" },
  { value: "capataz", label: "Capataz" },
  { value: "ayudante", label: "Ayudante" },
  { value: "administrador", label: "Administrador" },
  { value: "gerente", label: "Gerente" },
];

const DEPARTMENTS = [
  { value: "construccion", label: "Construcción" },
  { value: "soldadura", label: "Soldadura" },
  { value: "administracion", label: "Administración" },
  { value: "mantenimiento", label: "Mantenimiento" },
];

const ARL_RISK_CLASSES = [
  { value: "I", label: "Clase I - Riesgo Mínimo" },
  { value: "II", label: "Clase II - Riesgo Bajo" },
  { value: "III", label: "Clase III - Riesgo Medio" },
  { value: "IV", label: "Clase IV - Riesgo Alto" },
  { value: "V", label: "Clase V - Riesgo Máximo (Construcción/Soldadura)" },
];

export default function PersonnelForm({
  onSubmit,
  isLoading = false,
  initialData,
}: PersonnelFormProps) {
  const form = useForm<PersonnelFormSchemaType>({
    resolver: zodResolver(personnelSchema),
    defaultValues: {
      name: "",
      document_type: "CC",
      document_number: "",
      phone: "",
      email: "",
      address: "",
      position: "operario",
      department: "construccion",
      hire_date: new Date().toISOString().split('T')[0],
      status: "active",
      salary_base: 1300000, // Salario mínimo colombiano 2024
      daily_rate: 54167,    // Equivalente diario
      expected_arrival_time: "07:00",
      expected_departure_time: "15:30",
      arl_risk_class: "V",
      emergency_contact: "",
      emergency_phone: "",
      bank_account: "",
      ...initialData,
    },
  });

  const watchedValues = form.watch(["salary_base", "daily_rate"]);
  const [salaryBase, dailyRate] = watchedValues;

  // Calcular equivalencias para mostrar al usuario
  const calculateEquivalences = () => {
    if (!salaryBase || !dailyRate) return null;

    const monthlyFromDaily = dailyRate * 24; // 24 días laborales
    const dailyFromSalary = Math.round(salaryBase / 24);
    const hourlyFromDaily = Math.round(dailyRate / 7.3); // 7.3 horas legales

    return {
      monthlyFromDaily,
      dailyFromSalary,
      hourlyFromDaily,
      difference: ((salaryBase - monthlyFromDaily) / salaryBase) * 100,
    };
  };

  const equivalences = calculateEquivalences();

  const handleSubmit = async (data: PersonnelFormSchemaType) => {
    try {
      await onSubmit(data);
      if (!initialData) {
        form.reset();
      }
    } catch (error) {
      console.error("Error submitting personnel:", error);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {initialData ? "Editar Empleado" : "Nuevo Empleado"}
          </CardTitle>
          <CardDescription>
            Información del empleado con nueva lógica de nóminas que separa
            salario base (prestaciones) y precio por día (pago real).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              {/* Información Personal */}
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Información Personal
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre Completo</FormLabel>
                        <FormControl>
                          <Input placeholder="Juan Pérez" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-2">
                    <FormField
                      control={form.control}
                      name="document_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tipo Doc.</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {DOCUMENT_TYPES.map((type) => (
                                <SelectItem key={type.value} value={type.value}>
                                  {type.value}
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
                      name="document_number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Número</FormLabel>
                          <FormControl>
                            <Input placeholder="12345678" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Teléfono</FormLabel>
                        <FormControl>
                          <Input placeholder="+57 300 123 4567" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="juan@empresa.com"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dirección</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Calle 123 #45-67, Barrio, Ciudad"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Separator />

              {/* Información Laboral */}
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Información Laboral
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="position"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cargo</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecciona cargo" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {POSITIONS.map((position) => (
                              <SelectItem key={position.value} value={position.value}>
                                {position.label}
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
                    name="department"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Departamento</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecciona departamento" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {DEPARTMENTS.map((dept) => (
                              <SelectItem key={dept.value} value={dept.value}>
                                {dept.label}
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
                    name="hire_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fecha de Contratación</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="arl_risk_class"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Clase de Riesgo ARL</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {ARL_RISK_CLASSES.map((risk) => (
                              <SelectItem key={risk.value} value={risk.value}>
                                {risk.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <Separator />

              {/* NUEVA SECCIÓN: Configuración Salarial */}
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Configuración Salarial
                </h3>

                <Alert className="mb-4">
                  <Calculator className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Nueva Lógica:</strong> El salario base se usa para prestaciones sociales (EPS, pensión, cesantías).
                    El precio por día se usa para el pago real basado en horas trabajadas.
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="salary_base"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Salario Base (Prestaciones)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="1300000"
                            step="1000"
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                        <FormDescription>
                          Salario base para cálculo de prestaciones sociales y PILA
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="daily_rate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Precio por Día (Pago Real)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="1"
                            step="1"
                            {...field}
                            onChange={(e) => field.onChange(Math.round(Number(e.target.value)))}
                          />
                        </FormControl>
                        <FormDescription>
                          Precio diario que se divide por horas trabajadas
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Panel de Equivalencias */}
                {equivalences && (
                  <Card className="mt-4">
                    <CardHeader>
                      <CardTitle className="text-sm">Equivalencias y Cálculos</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <div className="font-medium">Basado en Precio Diario:</div>
                          <div>Mensual: ${equivalences.monthlyFromDaily.toLocaleString()}</div>
                          <div>Por hora: ${equivalences.hourlyFromDaily.toLocaleString()}</div>
                        </div>

                        <div>
                          <div className="font-medium">Basado en Salario Base:</div>
                          <div>Diario: ${equivalences.dailyFromSalary.toLocaleString()}</div>
                        </div>

                        <div>
                          <div className="font-medium">Diferencia:</div>
                          <div className={equivalences.difference > 0 ? "text-red-600" : "text-green-600"}>
                            {equivalences.difference > 0 ? "+" : ""}{equivalences.difference.toFixed(1)}%
                          </div>
                          {Math.abs(equivalences.difference) > 25 && (
                            <Badge variant="destructive" className="text-xs">
                              Diferencia Alta
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              <Separator />

              {/* Horarios */}
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Horarios de Trabajo
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="expected_arrival_time"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hora Esperada de Llegada</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormDescription>
                          Hora para calcular tardanzas automáticamente
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="expected_departure_time"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hora Esperada de Salida</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormDescription>
                          Hora estándar de finalización
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <Separator />

              {/* Contacto de Emergencia */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Contacto de Emergencia</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="emergency_contact"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre Contacto</FormLabel>
                        <FormControl>
                          <Input placeholder="María Pérez" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="emergency_phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Teléfono Contacto</FormLabel>
                        <FormControl>
                          <Input placeholder="+57 300 123 4567" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="bank_account"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cuenta Bancaria</FormLabel>
                      <FormControl>
                        <Input placeholder="1234567890" {...field} />
                      </FormControl>
                      <FormDescription>
                        Para consignación de nómina
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading
                  ? "Guardando..."
                  : initialData
                  ? "Actualizar Empleado"
                  : "Crear Empleado"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}