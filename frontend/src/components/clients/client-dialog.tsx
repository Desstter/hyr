"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api, handleApiError } from "@/lib/api";
import type { Client } from "@/lib/api";
import { useTranslations } from "@/lib/i18n";
import { Loader2, Building2 } from "lucide-react";
import { toast } from "sonner";

// Esquema de validación
const clientSchema = z.object({
  name: z.string().min(1, "El nombre de la empresa es obligatorio"),
  contact_name: z.string().optional(),
  phone: z.string().optional(),
  email: z
    .string()
    .email("Formato de email inválido")
    .optional()
    .or(z.literal("")),
  address: z.string().optional(),
});

type ClientFormData = z.infer<typeof clientSchema>;

interface ClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client?: Client;
  onClientSaved?: () => void;
}

export function ClientDialog({
  open,
  onOpenChange,
  client,
  onClientSaved,
}: ClientDialogProps) {
  const t = useTranslations("es");
  const [loading, setLoading] = useState(false);
  const isEdit = !!client;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: "",
      contact_name: "",
      phone: "",
      email: "",
      address: "",
    },
  });

  // Reset form when client changes or dialog opens/closes
  useEffect(() => {
    if (open) {
      reset({
        name: client?.name || "",
        contact_name: client?.contact_name || "",
        phone: client?.phone || "",
        email: client?.email || "",
        address: client?.address || "",
      });
    } else {
      reset();
    }
  }, [open, client, reset]);

  const onSubmit = async (data: ClientFormData) => {
    try {
      setLoading(true);

      // Limpiar campos vacíos
      const cleanData = {
        ...data,
        contact_name: data.contact_name || undefined,
        phone: data.phone || undefined,
        email: data.email || undefined,
        address: data.address || undefined,
      };

      if (isEdit && client) {
        await api.clients.update(client.id, cleanData);
        toast.success(`Cliente "${data.name}" actualizado exitosamente`);
      } else {
        await api.clients.create(cleanData);
        toast.success(`Cliente "${data.name}" creado exitosamente`);
      }

      onClientSaved?.();
    } catch (err) {
      const errorMessage = handleApiError(err);
      console.error("Error saving client:", err);
      toast.error(
        `Error ${isEdit ? "actualizando" : "creando"} cliente: ${errorMessage}`
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <div className="flex items-center space-x-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center">
              <Building2 className="h-4 w-4 text-white" />
            </div>
            <div>
              <DialogTitle>
                {isEdit ? t.clients.editClient : t.clients.newClient}
              </DialogTitle>
              <DialogDescription>
                {isEdit
                  ? `Modificar información del cliente "${client?.name}"`
                  : "Agregar un nuevo cliente al sistema"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 gap-6">
            {/* Nombre de la Empresa */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium">
                {t.clients.name} <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                {...register("name")}
                placeholder="Ej: Constructora ABC S.A.S"
                className={errors.name ? "border-red-500" : ""}
              />
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name.message}</p>
              )}
            </div>

            {/* Contacto Principal */}
            <div className="space-y-2">
              <Label htmlFor="contact_name" className="text-sm font-medium">
                {t.clients.contactName}
              </Label>
              <Input
                id="contact_name"
                {...register("contact_name")}
                placeholder="Ej: Juan Pérez"
              />
            </div>

            {/* Información de Contacto */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-medium">
                  {t.clients.phone}
                </Label>
                <Input
                  id="phone"
                  {...register("phone")}
                  placeholder="Ej: +57 300 123-4567"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  {t.clients.email}
                </Label>
                <Input
                  id="email"
                  type="email"
                  {...register("email")}
                  placeholder="Ej: contacto@empresa.com"
                  className={errors.email ? "border-red-500" : ""}
                />
                {errors.email && (
                  <p className="text-sm text-red-500">{errors.email.message}</p>
                )}
              </div>
            </div>

            {/* Dirección */}
            <div className="space-y-2">
              <Label htmlFor="address" className="text-sm font-medium">
                {t.clients.address}
              </Label>
              <Textarea
                id="address"
                {...register("address")}
                placeholder="Ej: Carrera 10 No. 20-30, Oficina 501, Bogotá, Colombia"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading || isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading || isSubmitting}
              className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
            >
              {loading || isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isEdit ? "Actualizando..." : "Creando..."}
                </>
              ) : isEdit ? (
                "Actualizar Cliente"
              ) : (
                "Crear Cliente"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
