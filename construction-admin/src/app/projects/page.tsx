'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { EnhancedProjectsTable } from '@/components/projects/enhanced-projects-table';
import type { Project } from '@/lib/api';
import { ProjectDialog } from '@/components/projects/project-dialog';
import { useTranslations } from '@/lib/i18n';
import { Plus, Zap, TrendingUp } from 'lucide-react';

export default function ProjectsPage() {
  const t = useTranslations('es');
  const [showProjectDialog, setShowProjectDialog] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | undefined>();

  return (
    <div className="space-y-6">
      {/* Enhanced Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-r from-primary to-secondary flex items-center justify-center">
              <Zap className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                Gestión de Proyectos
              </h1>
              <p className="text-muted-foreground text-lg">
                Control integral de construcción y soldadura
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-[hsl(var(--success))]" />
              <span>Seguimiento de rentabilidad en tiempo real</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Button 
            onClick={() => setShowProjectDialog(true)}
            size="lg"
            className="shadow-lg hover:shadow-xl transition-all duration-200"
          >
            <Plus className="h-5 w-5 mr-2" />
            Nuevo Proyecto
          </Button>
        </div>
      </div>

      {/* Enhanced Projects Table */}
      <EnhancedProjectsTable 
        onEditProject={(project) => {
          setEditingProject(project);
          setShowProjectDialog(true);
        }}
        onViewProject={(project) => {
          // Navigate to project detail page
          window.location.href = `/projects/${project.id}`;
        }}
      />

      {/* Project Dialog */}
      <ProjectDialog
        open={showProjectDialog}
        onOpenChange={(open) => {
          setShowProjectDialog(open);
          if (!open) setEditingProject(undefined);
        }}
        project={editingProject}
        onSuccess={() => {
          // Table will auto-refresh when data changes
          setEditingProject(undefined);
        }}
      />
    </div>
  );
}