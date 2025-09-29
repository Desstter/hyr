"use client";

import { useState } from "react";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertTriangle,
  Trash2,
  Shield,
  FileText,
  Users,
  Clock,
  Loader2,
} from "lucide-react";
import type { PayrollPeriod } from "@/lib/api/types";

interface DeletePeriodDialogProps {
  period: PayrollPeriod | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete: (periodId: string) => Promise<void>;
  loading?: boolean;
}

export function DeletePeriodDialog({
  period,
  open,
  onOpenChange,
  onDelete,
  loading = false,
}: DeletePeriodDialogProps) {
  const [confirmationText, setConfirmationText] = useState("");
  const [step, setStep] = useState<1 | 2>(1);

  const formatMonth = (month: number) => {
    const months = [
      "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
      "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];
    return months[month - 1] || month.toString();
  };

  const canDelete = period?.status === 'draft' && !period?.processed_at;
  const isConfirmationValid = confirmationText === "ELIMINAR";

  const handleClose = () => {
    setStep(1);
    setConfirmationText("");
    onOpenChange(false);
  };

  const handleDelete = async () => {
    if (!period || !isConfirmationValid) return;

    try {
      await onDelete(period.id);
      handleClose();
    } catch (error) {
      // Error handling is done in parent component
      console.error("Error deleting period:", error);
    }
  };

  if (!period) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <Trash2 className="h-5 w-5" />
            Eliminar Período de Nómina
          </DialogTitle>
          <DialogDescription>
            Esta acción no se puede deshacer. El período será eliminado permanentemente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Información del período a eliminar */}
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <h4 className="font-medium text-red-900 mb-2">
              Período a eliminar:
            </h4>
            <div className="space-y-1 text-sm text-red-800">
              <p><strong>{formatMonth(period.month)} {period.year}</strong></p>
              <p>Estado: <span className="font-medium">{period.status}</span></p>
              <p>Empleados procesados: <span className="font-medium">{period.employees_processed || 0}</span></p>
            </div>
          </div>

          {/* Validaciones de seguridad */}
          {!canDelete ? (
            <Alert className="border-red-200 bg-red-50">
              <Shield className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                <strong>No se puede eliminar este período:</strong>
                <ul className="mt-2 space-y-1 text-sm">
                  {period.status !== 'draft' && (
                    <li>• Estado &apos;{period.status}&apos; no permite eliminación</li>
                  )}
                  {period.processed_at && (
                    <li>• Período ya fue procesado el {new Date(period.processed_at).toLocaleDateString('es-CO')}</li>
                  )}
                  {(Number(period.employees_processed) || 0) > 0 && (
                    <li>• Tiene {period.employees_processed} empleado(s) procesados</li>
                  )}
                </ul>
              </AlertDescription>
            </Alert>
          ) : (
            <>
              {step === 1 && (
                <div className="space-y-4">
                  {/* Advertencias */}
                  <Alert className="border-yellow-200 bg-yellow-50">
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    <AlertDescription className="text-yellow-800">
                      <strong>⚠️ Advertencias importantes:</strong>
                      <ul className="mt-2 space-y-1 text-sm">
                        <li className="flex items-center gap-2">
                          <FileText className="h-3 w-3" />
                          Se eliminará el período y todas sus dependencias
                        </li>
                        <li className="flex items-center gap-2">
                          <Clock className="h-3 w-3" />
                          Los registros de tiempo NO se eliminarán
                        </li>
                        <li className="flex items-center gap-2">
                          <Users className="h-3 w-3" />
                          No afectará los datos de empleados
                        </li>
                      </ul>
                    </AlertDescription>
                  </Alert>

                  {/* Elementos que se van a eliminar */}
                  <div className="p-3 bg-gray-50 border rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">
                      Se eliminarán los siguientes elementos:
                    </h4>
                    <ul className="text-sm text-gray-700 space-y-1">
                      <li>✓ Registro del período {formatMonth(period.month)} {period.year}</li>
                      <li>✓ Configuraciones específicas del período</li>
                      <li>✓ Metadatos asociados</li>
                    </ul>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <Alert className="border-red-200 bg-red-50">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-800">
                      <strong>Confirmación final requerida</strong>
                      <p className="mt-1 text-sm">
                        Para confirmar la eliminación, escriba exactamente: <code className="bg-red-100 px-1 rounded">ELIMINAR</code>
                      </p>
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-2">
                    <Label htmlFor="confirmation" className="text-sm font-medium">
                      Escriba &quot;ELIMINAR&quot; para confirmar:
                    </Label>
                    <Input
                      id="confirmation"
                      value={confirmationText}
                      onChange={(e) => setConfirmationText(e.target.value.toUpperCase())}
                      placeholder="ELIMINAR"
                      className={`${
                        confirmationText && !isConfirmationValid
                          ? 'border-red-300 focus:border-red-500'
                          : ''
                      }`}
                      autoComplete="off"
                    />
                    {confirmationText && !isConfirmationValid && (
                      <p className="text-xs text-red-600">
                        Debe escribir exactamente &quot;ELIMINAR&quot;
                      </p>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={loading}
          >
            Cancelar
          </Button>

          {canDelete && (
            <>
              {step === 1 ? (
                <Button
                  variant="destructive"
                  onClick={() => setStep(2)}
                  disabled={loading}
                >
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Continuar con Eliminación
                </Button>
              ) : (
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={loading || !isConfirmationValid}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Eliminando...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Eliminar Período
                    </>
                  )}
                </Button>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}