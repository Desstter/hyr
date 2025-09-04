'use client';

import { useState } from 'react';
import Link from 'next/link';
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
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { projects } from '@/data/fixtures';
import { formatCurrency, formatDate, getProjectStatusColor, getProjectStatusLabel } from '@/lib/finance';
import { useTranslations } from '@/lib/i18n';
import { Eye, Edit, Search } from 'lucide-react';

export function ProjectsTable() {
  const t = useTranslations('es');
  const [searchQuery, setSearchQuery] = useState('');
  
  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    project.client.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Buscar proyectos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t.projects.name}</TableHead>
              <TableHead>{t.projects.client}</TableHead>
              <TableHead>{t.projects.status}</TableHead>
              <TableHead>{t.projects.budget}</TableHead>
              <TableHead>{t.projects.spent}</TableHead>
              <TableHead>{t.projects.progress}</TableHead>
              <TableHead>{t.projects.startDate}</TableHead>
              <TableHead>{t.projects.actions}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProjects.map((project) => (
              <TableRow key={project.id}>
                <TableCell className="font-medium">
                  <div>
                    <div className="font-semibold">{project.name}</div>
                    {project.description && (
                      <div className="text-xs text-muted-foreground line-clamp-1">
                        {project.description}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>{project.client}</TableCell>
                <TableCell>
                  <Badge 
                    variant="outline" 
                    className={getProjectStatusColor(project.status)}
                  >
                    {getProjectStatusLabel(project.status)}
                  </Badge>
                </TableCell>
                <TableCell>{formatCurrency(project.budget)}</TableCell>
                <TableCell>{formatCurrency(project.spent)}</TableCell>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    <Progress value={project.progress} className="w-16 h-2" />
                    <span className="text-xs text-muted-foreground min-w-8">
                      {project.progress}%
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  {project.startDate ? formatDate(project.startDate) : '-'}
                </TableCell>
                <TableCell>
                  <div className="flex items-center space-x-1">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/projects/${project.id}`}>
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      
      {filteredProjects.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          {searchQuery ? 'No se encontraron proyectos con esos criterios' : 'No hay proyectos registrados'}
        </div>
      )}
    </div>
  );
}