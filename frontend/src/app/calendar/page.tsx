"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarView } from "@/components/calendar/calendar-view";
import { UpcomingPayments } from "@/components/calendar/upcoming-payments";
import { PaymentReminderDialog } from "@/components/calendar/payment-reminder-dialog";
import { Plus, Calendar, List } from "lucide-react";
import type { CalendarEvent } from "@/lib/api/types";
import { api } from "@/lib/api";
import { toast } from "sonner";

export default function CalendarPage() {
  const [showReminderDialog, setShowReminderDialog] = useState(false);
  const [editingReminder, setEditingReminder] = useState<
    CalendarEvent | undefined
  >();
  const [activeTab, setActiveTab] = useState("calendar");

  const handleEditReminder = (reminder: CalendarEvent) => {
    setEditingReminder(reminder);
    setShowReminderDialog(true);
  };

  const handleDeleteReminder = async (reminder: CalendarEvent) => {
    if (
      window.confirm("¿Estás seguro de que deseas eliminar este recordatorio?")
    ) {
      try {
        await api.calendar.deleteEvent(reminder.id);
        toast.success("Recordatorio eliminado");
      } catch (error) {
        console.error("Error deleting reminder:", error);
        toast.error(
          error instanceof Error
            ? error.message
            : "Error al eliminar el recordatorio"
        );
      }
    }
  };

  const handleNewReminder = () => {
    setEditingReminder(undefined);
    setShowReminderDialog(true);
  };

  const handleDialogClose = () => {
    setShowReminderDialog(false);
    setEditingReminder(undefined);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Calendario de Eventos
          </h1>
          <p className="text-muted-foreground">
            Gestiona eventos de proyectos, nómina, recordatorios de pagos y más
          </p>
        </div>
        <Button onClick={handleNewReminder}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Recordatorio
        </Button>
      </div>

      {/* Tabs for different views */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
          <TabsTrigger value="calendar" className="flex items-center space-x-2">
            <Calendar className="h-4 w-4" />
            <span>Vista Calendario</span>
          </TabsTrigger>
          <TabsTrigger value="list" className="flex items-center space-x-2">
            <List className="h-4 w-4" />
            <span>Lista de Pagos</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="space-y-6">
          <CalendarView onReminderClick={handleEditReminder} />
        </TabsContent>

        <TabsContent value="list" className="space-y-6">
          <UpcomingPayments
            onEditReminder={handleEditReminder}
            onDeleteReminder={handleDeleteReminder}
          />
        </TabsContent>
      </Tabs>

      {/* Payment Reminder Dialog */}
      <PaymentReminderDialog
        open={showReminderDialog}
        onOpenChange={handleDialogClose}
        reminder={editingReminder}
        onSuccess={() => {
          // Data will automatically refresh via live queries
        }}
      />
    </div>
  );
}
