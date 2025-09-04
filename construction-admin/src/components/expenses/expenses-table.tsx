'use client';

import { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ExpenseDialog } from './expense-dialog';
import { api, handleApiError } from '@/lib/api';
import type { Expense, Project } from '@/lib/api';
import { formatCurrency, formatDate, getCategoryLabel } from '@/lib/finance';
import { useTranslations } from '@/lib/i18n';
import { Search, Filter, Plus, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export function ExpensesTable() {
  const t = useTranslations('es');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  
  // State for API data
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Create project lookup map
  const projectMap = new Map(projects?.map(p => [p.id, p.name]) || []);
  
  // Load data from API
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load expenses and projects in parallel
      const [expensesResult, projectsResult] = await Promise.all([
        api.expenses.list(),
        api.projects.list()
      ]);
      
      // Handle both direct array response and {data: array} response
      const expensesData = Array.isArray(expensesResult) ? expensesResult : 
                          (expensesResult?.data && Array.isArray(expensesResult.data) ? expensesResult.data : []);
      const projectsData = Array.isArray(projectsResult) ? projectsResult : 
                          (projectsResult?.data && Array.isArray(projectsResult.data) ? projectsResult.data : []);
      
      setExpenses(expensesData);
      setProjects(projectsData);
    } catch (err) {
      const errorMessage = handleApiError(err);
      setError(errorMessage);
      console.error('Error loading expenses data:', err);
      toast.error('Error cargando gastos: ' + errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Filter expenses based on search and filters
  const filteredExpenses = (expenses || []).filter(expense => {
    const matchesSearch = expense.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         expense.vendor?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesProject = selectedProject === 'all' || 
                          (selectedProject === 'no-project' && !expense.project_id) ||
                          expense.project_id === selectedProject;
    const matchesCategory = selectedCategory === 'all' || expense.category === selectedCategory;
    
    return matchesSearch && matchesProject && matchesCategory;
  });

  const getProjectName = (projectId?: string) => {
    if (!projectId) return 'General';
    return projectMap.get(projectId) || 'Proyecto desconocido';
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      materials: 'bg-blue-100 text-blue-800 border-blue-200',
      labor: 'bg-green-100 text-green-800 border-green-200',
      equipment: 'bg-purple-100 text-purple-800 border-purple-200',
      misc: 'bg-gray-100 text-gray-800 border-gray-200',
    };
    return colors[category as keyof typeof colors] || colors.misc;
  };

  const handleEditExpense = (expense: Expense) => {
    setEditingExpense(expense);
    setShowEditDialog(true);
  };

  const handleDeleteExpense = async (expense: Expense) => {
    if (confirm('¿Estás seguro de que deseas eliminar este gasto?')) {
      try {
        await api.expenses.delete(expense.id);
        toast.success('Gasto eliminado');
        // Reload data to refresh the list
        loadData();
      } catch (error) {
        console.error('Error deleting expense:', error);
        const errorMessage = handleApiError(error);
        toast.error('Error al eliminar el gasto: ' + errorMessage);
      }
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-10 bg-gray-100 animate-pulse rounded-md flex-1 max-w-sm" />
          ))}
        </div>
        <div className="rounded-md border">
          <div className="h-64 bg-gray-50 animate-pulse" />
        </div>
        <div className="text-center text-muted-foreground">
          Cargando gastos desde PostgreSQL...
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-medium">Error cargando gastos</h3>
          <p className="text-red-600 text-sm mt-1">{error}</p>
          <button
            onClick={loadData}
            className="mt-2 bg-red-100 text-red-800 px-3 py-1 rounded text-sm hover:bg-red-200"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Buscar gastos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={selectedProject} onValueChange={setSelectedProject}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder={t.expenses.allProjects} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.expenses.allProjects}</SelectItem>
            <SelectItem value="no-project">General</SelectItem>
            {(projects || []).map((project) => (
              <SelectItem key={project.id} value={project.id}>
                {project.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder={t.expenses.allCategories} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.expenses.allCategories}</SelectItem>
            <SelectItem value="materials">{getCategoryLabel('materials')}</SelectItem>
            <SelectItem value="labor">{getCategoryLabel('labor')}</SelectItem>
            <SelectItem value="equipment">{getCategoryLabel('equipment')}</SelectItem>
            <SelectItem value="misc">{getCategoryLabel('misc')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t.expenses.date}</TableHead>
              <TableHead>{t.expenses.project}</TableHead>
              <TableHead>{t.expenses.category}</TableHead>
              <TableHead>{t.expenses.description}</TableHead>
              <TableHead>{t.expenses.vendor}</TableHead>
              <TableHead className="text-right">{t.expenses.amount}</TableHead>
              <TableHead>{t.projects.actions}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredExpenses.map((expense) => (
              <TableRow key={expense.id}>
                <TableCell className="font-medium">
                  {formatDate(expense.date)}
                </TableCell>
                <TableCell>
                  <span className="text-sm">{getProjectName(expense.project_id)}</span>
                </TableCell>
                <TableCell>
                  <Badge 
                    variant="outline" 
                    className={getCategoryColor(expense.category)}
                  >
                    {getCategoryLabel(expense.category)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="max-w-xs">
                    <span className="text-sm line-clamp-2">
                      {expense.description || 'Sin descripción'}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground">
                    {expense.vendor || '-'}
                  </span>
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatCurrency(expense.amount)}
                </TableCell>
                <TableCell>
                  <div className="flex items-center space-x-1">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleEditExpense(expense)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleDeleteExpense(expense)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      
      {filteredExpenses.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          {searchQuery || selectedProject !== 'all' || selectedCategory !== 'all' 
            ? 'No se encontraron gastos con esos criterios' 
            : 'No hay gastos registrados'}
        </div>
      )}
      
      {/* Summary */}
      <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
        <span className="text-sm text-muted-foreground">
          Total mostrado ({filteredExpenses.length} gastos):
        </span>
        <span className="font-semibold text-lg">
          {formatCurrency(filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0))}
        </span>
      </div>
      
      {/* Edit Expense Dialog */}
      <ExpenseDialog
        open={showEditDialog}
        onOpenChange={(open) => {
          setShowEditDialog(open);
          if (!open) setEditingExpense(null);
        }}
        expense={editingExpense || undefined}
        onSuccess={() => {
          setShowEditDialog(false);
          setEditingExpense(null);
          // Reload data to refresh the list
          loadData();
        }}
      />
    </div>
  );
}