'use client';

import React from 'react';
import { Plus, Receipt, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslations } from '@/lib/i18n';
import { toast } from 'sonner';

export function QuickActions() {
  const t = useTranslations('es');

  const handleNewProject = () => {
    toast.success('Función de nuevo proyecto será implementada');
  };

  const handleLogExpense = () => {
    toast.success('Función de registrar gasto será implementada');
  };

  const handleCreateEstimate = () => {
    toast.success('Función de crear cotización será implementada');
  };

  return (
    <>
      {/* Desktop Quick Actions */}
      <div className="hidden lg:block">
        <div className="flex items-center space-x-3">
          <Button onClick={handleNewProject} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            {t.quickActions.newProject}
          </Button>
          <Button 
            variant="outline" 
            onClick={handleLogExpense}
            className="flex items-center gap-2"
          >
            <Receipt className="h-4 w-4" />
            {t.quickActions.logExpense}
          </Button>
          <Button 
            variant="outline" 
            onClick={handleCreateEstimate}
            className="flex items-center gap-2"
          >
            <FileText className="h-4 w-4" />
            {t.quickActions.createEstimate}
          </Button>
        </div>
      </div>

      {/* Mobile Quick Actions - Floating Bottom Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 px-4 py-3">
        <div className="flex items-center justify-around space-x-2">
          <Button 
            size="sm" 
            onClick={handleNewProject}
            className="flex flex-col items-center gap-1 h-auto py-2 px-3"
          >
            <Plus className="h-4 w-4" />
            <span className="text-xs">Proyecto</span>
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={handleLogExpense}
            className="flex flex-col items-center gap-1 h-auto py-2 px-3"
          >
            <Receipt className="h-4 w-4" />
            <span className="text-xs">Gasto</span>
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={handleCreateEstimate}
            className="flex flex-col items-center gap-1 h-auto py-2 px-3"
          >
            <FileText className="h-4 w-4" />
            <span className="text-xs">Cotización</span>
          </Button>
        </div>
      </div>
    </>
  );
}