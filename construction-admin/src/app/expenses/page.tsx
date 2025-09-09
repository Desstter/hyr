"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ExpensesTable } from "@/components/expenses/expenses-table";
import { ExpenseDialog } from "@/components/expenses/expense-dialog";
import { useTranslations } from "@/lib/i18n";
import { Plus } from "lucide-react";

export default function ExpensesPage() {
  const t = useTranslations("es");
  const [showAddDialog, setShowAddDialog] = useState(false);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            {t.expenses.title}
          </h1>
          <p className="text-muted-foreground">
            Registra y categoriza todos los gastos de tus proyectos
          </p>
        </div>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          {t.expenses.addExpense}
        </Button>
      </div>

      {/* Expenses Table */}
      <ExpensesTable />

      {/* Add Expense Dialog */}
      <ExpenseDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onSuccess={() => {
          // Table will automatically update due to live query
        }}
      />
    </div>
  );
}
