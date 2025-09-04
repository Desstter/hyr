'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/store/app';
import { clientsService } from '@/lib/api/clients';
import { projectsService } from '@/lib/api/projects';
import { expensesService } from '@/lib/api/expenses';
import { toast } from 'sonner';
import { Undo2 } from 'lucide-react';

export function UndoToast() {
  const { lastDeletedItem, clearLastDeletedItem } = useAppStore();
  const [isUndoing, setIsUndoing] = useState(false);

  const handleUndo = async () => {
    if (!lastDeletedItem || isUndoing) return;

    setIsUndoing(true);
    try {
      // Determine the type of item and restore it
      if (lastDeletedItem.project_id !== undefined || lastDeletedItem.projectId !== undefined) {
        // This is an expense - create new expense
        await expensesService.create({
          project_id: lastDeletedItem.project_id || lastDeletedItem.projectId,
          description: lastDeletedItem.description || lastDeletedItem.name,
          amount: lastDeletedItem.amount,
          date: lastDeletedItem.date || new Date().toISOString(),
          category: lastDeletedItem.category || 'general'
        });
        toast.success('Gasto restaurado');
      } else if (lastDeletedItem.status) {
        // This is a project - create new project
        await projectsService.create({
          name: lastDeletedItem.name,
          client_id: lastDeletedItem.client_id || lastDeletedItem.clientId,
          description: lastDeletedItem.description || '',
          budget: lastDeletedItem.budget || 0,
          start_date: lastDeletedItem.start_date || new Date().toISOString(),
          estimated_end_date: lastDeletedItem.estimated_end_date || new Date().toISOString()
        });
        toast.success('Proyecto restaurado');
      } else if (lastDeletedItem.name) {
        // This is a client - create new client
        await clientsService.create({
          name: lastDeletedItem.name,
          contact_name: lastDeletedItem.contact_name,
          phone: lastDeletedItem.phone,
          email: lastDeletedItem.email,
          address: lastDeletedItem.address
        });
        toast.success('Cliente restaurado');
      }
      
      clearLastDeletedItem();
    } catch (error) {
      console.error('Failed to undo:', error);
      toast.error('Error al restaurar el elemento');
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
          {isUndoing ? 'Restaurando...' : 'Deshacer'}
        </Button>
      </div>
    </div>
  );
}