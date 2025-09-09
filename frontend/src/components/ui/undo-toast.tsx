"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/store/app";
import { clientsService } from "@/lib/api/clients";
import { projectsService } from "@/lib/api/projects";
import { expensesService } from "@/lib/api/expenses";
import { personnelService } from "@/lib/api/personnel";
import type { CreatePersonnelRequest, ExpenseCategory } from "@/lib/api/types";
import { toast } from "sonner";
import { Undo2 } from "lucide-react";

// Type guard functions for safe type checking
function safeString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function safeNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && !isNaN(value)) return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return !isNaN(parsed) ? parsed : undefined;
  }
  return undefined;
}

function safeExpenseCategory(value: unknown): ExpenseCategory {
  const validCategories: ExpenseCategory[] = ["materials", "labor", "equipment", "overhead"];
  if (typeof value === 'string' && validCategories.includes(value as ExpenseCategory)) {
    return value as ExpenseCategory;
  }
  return "general" as ExpenseCategory;
}

export function UndoToast() {
  const { lastDeletedItem, clearLastDeletedItem } = useAppStore();
  const [isUndoing, setIsUndoing] = useState(false);

  const handleUndo = async () => {
    if (!lastDeletedItem || isUndoing) return;

    setIsUndoing(true);
    try {
      // Determine the type of item and restore it
      if (lastDeletedItem.type === "employee") {
        // This is an employee - create new employee
        await personnelService.create(lastDeletedItem.data as unknown as CreatePersonnelRequest);
        toast.success("Empleado restaurado");
      } else if (
        safeString((lastDeletedItem.data as Record<string, unknown>).project_id) !== undefined ||
        safeString((lastDeletedItem.data as Record<string, unknown>).projectId) !== undefined
      ) {
        // This is an expense - create new expense
        const data = lastDeletedItem.data as Record<string, unknown>;
        await expensesService.create({
          project_id: safeString(data.project_id) || safeString(data.projectId),
          description: safeString(data.description) || lastDeletedItem.name,
          amount: safeNumber(data.amount) || 0,
          date: safeString(data.date) || new Date().toISOString(),
          category: safeExpenseCategory(data.category),
        });
        toast.success("Gasto restaurado");
      } else if (safeString((lastDeletedItem.data as Record<string, unknown>).status)) {
        // This is a project - create new project
        const data = lastDeletedItem.data as Record<string, unknown>;
        await projectsService.create({
          name: lastDeletedItem.name,
          client_id: safeString(data.client_id) || safeString(data.clientId),
          description: safeString(data.description) || "",
          budget_materials: safeNumber(data.budget_materials) || 0,
          budget_labor: safeNumber(data.budget_labor) || 0,
          budget_equipment: safeNumber(data.budget_equipment) || 0,
          budget_overhead: safeNumber(data.budget_overhead) || 0,
          start_date: safeString(data.start_date) || new Date().toISOString(),
          estimated_end_date: safeString(data.estimated_end_date) || new Date().toISOString(),
        });
        toast.success("Proyecto restaurado");
      } else if (lastDeletedItem.name) {
        // This is a client - create new client
        const data = lastDeletedItem.data as Record<string, unknown>;
        await clientsService.create({
          name: lastDeletedItem.name,
          contact_name: safeString(data.contact_name),
          phone: safeString(data.phone),
          email: safeString(data.email),
          address: safeString(data.address),
        });
        toast.success("Cliente restaurado");
      }

      clearLastDeletedItem();
    } catch (error) {
      console.error("Failed to undo:", error);
      toast.error("Error al restaurar el elemento");
    } finally {
      setIsUndoing(false);
    }
  };

  // Auto-clear after 10 seconds
  useEffect(() => {
    if (lastDeletedItem) {
      const timer = setTimeout(() => {
        clearLastDeletedItem();
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [lastDeletedItem, clearLastDeletedItem]);

  if (!lastDeletedItem) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-gray-800 text-white px-4 py-3 rounded-lg shadow-lg flex items-center space-x-3">
        <span className="text-sm">Elemento eliminado</span>
        <Button
          size="sm"
          variant="secondary"
          onClick={handleUndo}
          disabled={isUndoing}
        >
          <Undo2 className="h-4 w-4 mr-1" />
          {isUndoing ? "Restaurando..." : "Deshacer"}
        </Button>
      </div>
    </div>
  );
}
