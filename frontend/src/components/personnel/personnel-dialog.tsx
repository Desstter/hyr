"use client";

import { useState } from "react";
import { toast } from "sonner";
import { personnelService } from "@/lib/api/personnel";
import type { Personnel, PersonnelFormData } from "@/lib/api/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import PersonnelForm from "./PersonnelForm";


interface PersonnelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  personnel?: Personnel | null;
  onSuccess?: () => void;
}

export function PersonnelDialog({
  open,
  onOpenChange,
  personnel,
  onSuccess,
}: PersonnelDialogProps) {
  const [loading, setLoading] = useState(false);

  // Convertir Personnel a datos del formulario
  const getInitialData = (): Partial<PersonnelFormData> | undefined => {
    if (!personnel) return undefined;

    return {
      name: personnel.name || "",
      document_type: personnel.document_type || "CC",
      document_number: personnel.document_number || "",
      phone: personnel.phone || "",
      email: personnel.email || "",
      address: personnel.address || "",
      position: personnel.position || "operario",
      department: personnel.department || "construccion",
      hire_date: personnel.hire_date || new Date().toISOString().split("T")[0],
      status: personnel.status || "active",
      // NUEVA LÓGICA: Usar salary_base y daily_rate
      salary_base: personnel.salary_base || personnel.monthly_salary || (personnel.hourly_rate ? personnel.hourly_rate * 192 : 1300000),
      daily_rate: personnel.daily_rate || (personnel.salary_base ? personnel.salary_base / 24 : (personnel.monthly_salary ? personnel.monthly_salary / 24 : 54167)),
      expected_arrival_time: personnel.expected_arrival_time || "07:00",
      expected_departure_time: personnel.expected_departure_time || "15:30",
      arl_risk_class: personnel.arl_risk_class || "V",
      emergency_contact: personnel.emergency_contact || "",
      emergency_phone: personnel.emergency_phone || "",
      bank_account: personnel.bank_account || "",
    };
  };

  const handleSubmit = async (data: PersonnelFormData) => {
    if (loading) return;

    setLoading(true);
    try {
      // Convertir a formato de API - mantener campos antiguos para compatibilidad
      const requestData = {
        name: data.name,
        document_type: data.document_type,
        document_number: data.document_number,
        phone: data.phone || "",
        email: data.email || "",
        address: data.address || "",
        position: data.position,
        department: data.department,
        hire_date: data.hire_date,

        // NUEVA LÓGICA: Incluir nuevos campos
        salary_base: data.salary_base,
        daily_rate: data.daily_rate,
        expected_arrival_time: data.expected_arrival_time,
        expected_departure_time: data.expected_departure_time,

        // Mantener para compatibilidad
        salary_type: "monthly" as const,
        monthly_salary: data.salary_base, // Para compatibilidad

        arl_risk_class: data.arl_risk_class,
        emergency_contact: data.emergency_contact || "",
        emergency_phone: data.emergency_phone || "",
        bank_account: data.bank_account || "",
      };

      if (personnel?.id) {
        await personnelService.update(personnel.id, requestData);
        toast.success(`Empleado ${data.name} actualizado exitosamente`);
      } else {
        await personnelService.create(requestData);
        toast.success(`Empleado ${data.name} creado exitosamente`);
      }

      onSuccess?.();
      onOpenChange(false);
    } catch (error: unknown) {
      console.error("Error saving personnel:", error);
      const errorMessage =
        (error instanceof Error ? error.message : String(error)) ||
        "Error desconocido al guardar empleado";
      toast.error(
        `Error al ${personnel?.id ? "actualizar" : "crear"} empleado: ${errorMessage}`
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {personnel ? "Editar Empleado" : "Nuevo Empleado"}
          </DialogTitle>
        </DialogHeader>

        {/* NUEVA LÓGICA: Usar PersonnelForm reutilizable */}
        <PersonnelForm
          onSubmit={handleSubmit}
          isLoading={loading}
          initialData={getInitialData()}
        />
      </DialogContent>
    </Dialog>
  );
}
