"use client";

import { useState } from "react";
import { Plus, Receipt, FileText, Users, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { useTranslations } from "@/lib/i18n";
import { ProjectDialog } from "@/components/projects/project-dialog";
import { ExpenseDialog } from "@/components/expenses/expense-dialog";
import { PersonnelDialog } from "@/components/personnel/personnel-dialog";
import { CostSimulatorDialog } from "@/components/simulator/cost-simulator-dialog";

export function QuickActions() {
  const t = useTranslations("es");
  const [showProjectDialog, setShowProjectDialog] = useState(false);
  const [showExpenseDialog, setShowExpenseDialog] = useState(false);
  const [showPersonnelDialog, setShowPersonnelDialog] = useState(false);
  const [showEstimateDialog, setShowEstimateDialog] = useState(false);

  const handleNewProject = () => {
    setShowProjectDialog(true);
  };

  const handleLogExpense = () => {
    setShowExpenseDialog(true);
  };

  const handleAddEmployee = () => {
    setShowPersonnelDialog(true);
  };

  const handleCreateEstimate = () => {
    setShowEstimateDialog(true);
  };

  return (
    <>
      {/* Desktop Quick Actions */}
      <div className="flex items-center space-x-1" suppressHydrationWarning>
        <Tooltip content={t.quickActions.newProject}>
          <Button
            onClick={handleNewProject}
            size="sm"
            className="flex items-center gap-1.5"
            aria-label={t.quickActions.newProject}
          >
            <Plus className="h-4 w-4" />
            <span className="hidden 2xl:inline">
              {t.quickActions.newProject}
            </span>
          </Button>
        </Tooltip>
        <Tooltip content={t.quickActions.addEmployee}>
          <Button
            variant="outline"
            onClick={handleAddEmployee}
            size="sm"
            className="flex items-center gap-1.5"
            aria-label={t.quickActions.addEmployee}
          >
            <Users className="h-4 w-4" />
            <span className="hidden 2xl:inline">
              {t.quickActions.addEmployee}
            </span>
          </Button>
        </Tooltip>
        <Tooltip content={t.quickActions.logExpense}>
          <Button
            variant="outline"
            onClick={handleLogExpense}
            size="sm"
            className="flex items-center gap-1.5"
            aria-label={t.quickActions.logExpense}
          >
            <Receipt className="h-4 w-4" />
            <span className="hidden 2xl:inline">
              {t.quickActions.logExpense}
            </span>
          </Button>
        </Tooltip>
        <Tooltip content="Procesar Nómina">
          <Button
            variant="outline"
            onClick={() => (window.location.href = "/payroll")}
            size="sm"
            className="flex items-center gap-1.5 border-green-200 text-green-700 hover:bg-green-50"
            aria-label="Procesar Nómina"
          >
            <DollarSign className="h-4 w-4" />
            <span className="hidden 2xl:inline">Nómina 2025</span>
          </Button>
        </Tooltip>
        <Tooltip content={t.quickActions.createEstimate}>
          <Button
            variant="outline"
            onClick={handleCreateEstimate}
            size="sm"
            className="flex items-center gap-1.5"
            aria-label={t.quickActions.createEstimate}
          >
            <FileText className="h-4 w-4" />
            <span className="hidden 2xl:inline">
              {t.quickActions.createEstimate}
            </span>
          </Button>
        </Tooltip>
      </div>

      {/* Mobile Quick Actions - Floating Bottom Bar */}
      <div
        className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 px-4 py-3"
        suppressHydrationWarning
      >
        <div
          className="flex items-center justify-around space-x-2"
          suppressHydrationWarning
        >
          <Button
            size="sm"
            onClick={handleNewProject}
            className="flex flex-col items-center gap-1 h-auto py-2 px-2"
          >
            <Plus className="h-4 w-4" />
            <span className="text-xs">Proyecto</span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleAddEmployee}
            className="flex flex-col items-center gap-1 h-auto py-2 px-2"
          >
            <Users className="h-4 w-4" />
            <span className="text-xs">Personal</span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleLogExpense}
            className="flex flex-col items-center gap-1 h-auto py-2 px-2"
          >
            <Receipt className="h-4 w-4" />
            <span className="text-xs">Gasto</span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleCreateEstimate}
            className="flex flex-col items-center gap-1 h-auto py-2 px-2"
          >
            <FileText className="h-4 w-4" />
            <span className="text-xs">Cotización</span>
          </Button>
        </div>
      </div>

      {/* Dialogs */}
      <ProjectDialog
        open={showProjectDialog}
        onOpenChange={setShowProjectDialog}
        onSuccess={() => {
          // Optionally refresh data or navigate
        }}
      />

      <ExpenseDialog
        open={showExpenseDialog}
        onOpenChange={setShowExpenseDialog}
        onSuccess={() => {
          // Optionally refresh data or navigate
        }}
      />

      <PersonnelDialog
        open={showPersonnelDialog}
        onOpenChange={setShowPersonnelDialog}
        onSuccess={() => {
          // Optionally refresh data or navigate
        }}
      />

      <CostSimulatorDialog
        open={showEstimateDialog}
        onOpenChange={setShowEstimateDialog}
        onSuccess={() => {
          // Optionally navigate to simulator page
          setShowEstimateDialog(false);
        }}
      />
    </>
  );
}
