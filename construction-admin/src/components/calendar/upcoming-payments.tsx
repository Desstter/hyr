"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { api, handleApiError } from "@/lib/api";
import { formatCurrency } from "@/lib/finance";
import {
  Calendar,
  Clock,
  Check,
  AlertTriangle,
  Edit,
  Trash2,
  Loader2,
} from "lucide-react";
import { format, isPast, isToday, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";
import type { CalendarEvent, PaymentCategory } from "@/lib/api/types";
import { toast } from "sonner";

interface UpcomingPaymentsProps {
  onEditReminder?: (reminder: CalendarEvent) => void;
  onDeleteReminder?: (reminder: CalendarEvent) => void;
}

export function UpcomingPayments({
  onEditReminder,
  onDeleteReminder,
}: UpcomingPaymentsProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [upcomingReminders, setUpcomingReminders] = useState<CalendarEvent[]>(
    []
  );
  const [overdueReminders, setOverdueReminders] = useState<CalendarEvent[]>([]);

  // Cargar recordatorios de pagos
  useEffect(() => {
    const loadPaymentReminders = async () => {
      try {
        setLoading(true);
        setError(null);

        // Obtener eventos de pago próximos (30 días)
        const paymentEvents = await api.calendar.getUpcomingPayments(30);

        // Filtrar solo eventos de tipo payment o reminder con categoría de pago
        const payments = paymentEvents.filter(
          event =>
            event.type === "payment" ||
            (event.type === "reminder" && event.category)
        );

        // Separar eventos vencidos y próximos
        const now = new Date();
        const upcoming = payments.filter(
          event => differenceInDays(new Date(event.event_date), now) >= 0
        );
        const overdue = payments.filter(
          event => differenceInDays(new Date(event.event_date), now) < 0
        );

        setUpcomingReminders(upcoming);
        setOverdueReminders(overdue);
      } catch (err) {
        console.error("Error loading payment reminders:", err);
        const errorMessage = handleApiError(err);
        setError(errorMessage);
        toast.error("Error cargando recordatorios de pago: " + errorMessage);
      } finally {
        setLoading(false);
      }
    };

    loadPaymentReminders();
  }, []);

  const markAsCompleted = async (reminder: CalendarEvent) => {
    try {
      await api.calendar.markEventCompleted(reminder.id);
      toast.success("Pago marcado como completado");

      // Actualizar la lista local
      setUpcomingReminders(prev => prev.filter(r => r.id !== reminder.id));
      setOverdueReminders(prev => prev.filter(r => r.id !== reminder.id));
    } catch (error) {
      console.error("Error marking payment as completed:", error);
      const errorMessage = handleApiError(error);
      toast.error("Error al marcar el pago como completado: " + errorMessage);
    }
  };

  const getCategoryLabel = (category: PaymentCategory) => {
    const labels = {
      tax: "Impuestos",
      insurance: "Seguros",
      permit: "Permisos",
      equipment: "Equipos",
      other: "Otros",
    };
    return labels[category];
  };

  const getCategoryColor = (category: PaymentCategory) => {
    const colors = {
      tax: "bg-red-100 text-red-800",
      insurance: "bg-blue-100 text-blue-800",
      permit: "bg-yellow-100 text-yellow-800",
      equipment: "bg-green-100 text-green-800",
      other: "bg-gray-100 text-gray-800",
    };
    return colors[category];
  };

  const getUrgencyColor = (dueDate: string) => {
    const days = differenceInDays(new Date(dueDate), new Date());
    if (days < 0) return "text-red-600"; // Overdue
    if (days === 0) return "text-orange-600"; // Due today
    if (days <= 7) return "text-yellow-600"; // Due within a week
    return "text-gray-600"; // Normal
  };

  const getUrgencyLabel = (dueDate: string) => {
    const days = differenceInDays(new Date(dueDate), new Date());
    if (days < 0)
      return `Vencido hace ${Math.abs(days)} día${Math.abs(days) > 1 ? "s" : ""}`;
    if (days === 0) return "Vence hoy";
    if (days === 1) return "Vence mañana";
    if (days <= 7) return `Vence en ${days} días`;
    return `Vence en ${days} días`;
  };

  // Estados de loading y error
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-3 text-muted-foreground">
            Cargando recordatorios de pago...
          </span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6 text-center">
            <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-3" />
            <p className="text-red-600 text-sm mb-2">
              Error cargando recordatorios
            </p>
            <p className="text-gray-500 text-xs">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const ReminderCard = ({ reminder }: { reminder: CalendarEvent }) => (
    <Card className="relative">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-2">
            {/* Title and Category */}
            <div className="flex items-center space-x-2">
              <h4 className="font-medium">{reminder.title}</h4>
              {reminder.category && (
                <Badge className={getCategoryColor(reminder.category)}>
                  {getCategoryLabel(reminder.category)}
                </Badge>
              )}
            </div>

            {/* Due Date */}
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-600">
                {format(new Date(reminder.event_date), "dd MMM yyyy", {
                  locale: es,
                })}
              </span>
              <span
                className={`text-sm font-medium ${getUrgencyColor(reminder.event_date)}`}
              >
                ({getUrgencyLabel(reminder.event_date)})
              </span>
            </div>

            {/* Amount */}
            {reminder.amount && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">
                  Monto: {formatCurrency(reminder.amount)}
                </span>
              </div>
            )}

            {/* Description */}
            {reminder.description && (
              <p className="text-sm text-gray-600">{reminder.description}</p>
            )}

            {/* Recurring info */}
            {reminder.recurrence && reminder.recurrence !== "none" && (
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-gray-500" />
                <span className="text-xs text-gray-500">
                  Recurrente:{" "}
                  {reminder.recurrence === "monthly"
                    ? "Mensual"
                    : reminder.recurrence === "quarterly"
                      ? "Trimestral"
                      : "Anual"}
                </span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col space-y-2 ml-4">
            <Button
              size="sm"
              onClick={() => markAsCompleted(reminder)}
              className="w-auto"
            >
              <Check className="h-4 w-4 mr-1" />
              Completar
            </Button>

            <div className="flex space-x-1">
              <Button
                size="sm"
                variant="outline"
                onClick={() => onEditReminder?.(reminder)}
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onDeleteReminder?.(reminder)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Overdue indicator */}
        {isPast(new Date(reminder.event_date)) &&
          !isToday(new Date(reminder.event_date)) && (
            <div className="absolute top-2 right-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
            </div>
          )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Overdue Payments */}
      {overdueReminders.length > 0 && (
        <div>
          <div className="flex items-center space-x-2 mb-4">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <h3 className="text-lg font-semibold text-red-600">
              Pagos Vencidos ({overdueReminders.length})
            </h3>
          </div>
          <div className="space-y-3">
            {overdueReminders.map(reminder => (
              <ReminderCard key={reminder.id} reminder={reminder} />
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Payments */}
      <div>
        <div className="flex items-center space-x-2 mb-4">
          <Clock className="h-5 w-5 text-blue-500" />
          <h3 className="text-lg font-semibold">
            Próximos Pagos ({upcomingReminders.length})
          </h3>
        </div>

        {upcomingReminders.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">
                No hay pagos programados para los próximos 30 días
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {upcomingReminders.map(reminder => (
              <ReminderCard key={reminder.id} reminder={reminder} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
