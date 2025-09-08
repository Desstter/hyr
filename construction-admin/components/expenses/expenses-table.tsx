'use client';

import { useState } from 'react';
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
import { expenses, projects } from '@/data/fixtures';
import { formatCurrency, formatDate, getCategoryLabel } from '@/lib/finance';
import { useTranslations } from '@/lib/i18n';
import { Search, Edit } from 'lucide-react';

export function ExpensesTable() {
  const t = useTranslations('es');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  const filteredExpenses = expenses.filter(expense => {
    const matchesSearch = expense.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         expense.vendor?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesProject = selectedProject === 'all' || 
                          (selectedProject === 'no-project' && !expense.projectId) ||
                          expense.projectId === selectedProject;
    const matchesCategory = selectedCategory === 'all' || expense.category === selectedCategory;
    
    return matchesSearch && matchesProject && matchesCategory;
  });

  const getProjectName = (projectId?: string) => {
    if (!projectId) return 'General';
    const project = projects.find(p => p.id === projectId);
    return project?.name || 'Proyecto desconocido';
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
            {projects.map((project) => (
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
                  <span className="text-sm">{getProjectName(expense.projectId)}</span>
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
                  <Button variant="ghost" size="sm">
                    <Edit className="h-4 w-4" />
                  </Button>
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
    </div>
  );
}