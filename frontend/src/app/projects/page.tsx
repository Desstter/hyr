"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { EnhancedProjectsTable } from "@/components/projects/enhanced-projects-table";
import type { Project } from "@/lib/api";
import { ProjectDialog } from "@/components/projects/project-dialog";
import { useTranslations } from "@/lib/i18n";
import { Plus, Zap, TrendingUp, Clock, CalendarDays, FolderOpen } from "lucide-react";
import { TimeEntryDialog } from "@/components/time-entries/time-entry-dialog";
import { TimeEntriesTable } from "@/components/time-entries/time-entries-table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ProjectsPage() {
  const _t = useTranslations("es");
  const router = useRouter();
  const [showProjectDialog, setShowProjectDialog] = useState(false);
  const [showTimeEntryDialog, setShowTimeEntryDialog] = useState(false);
  const [selectedProjectForTime, setSelectedProjectForTime] = useState<string>("");
  const [editingProject, setEditingProject] = useState<Project | undefined>();
  const [activeTab, setActiveTab] = useState<string>("projects");

  // Handler para registrar horas en un proyecto específico
  const _handleRegisterHours = (projectId: string) => {
    setSelectedProjectForTime(projectId);
    setShowTimeEntryDialog(true);
  };

  // Handler para ver horas de un proyecto
  const _handleViewHours = (projectId: string) => {
    setActiveTab("time-entries");
    setSelectedProjectForTime(projectId);
  };

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
            variant="outline"
            onClick={() => setShowTimeEntryDialog(true)}
            size="lg"
          >
            <Clock className="h-5 w-5 mr-2" />
            Registrar Horas
          </Button>
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

      {/* Main Content with Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="projects" className="flex items-center gap-2">
            <FolderOpen className="h-4 w-4" />
            Proyectos
          </TabsTrigger>
          <TabsTrigger value="time-entries" className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            Horas por Proyecto
          </TabsTrigger>
        </TabsList>

        <TabsContent value="projects">
          {/* Enhanced Projects Table */}
          <EnhancedProjectsTable
            onEditProject={project => {
              setEditingProject(project);
              setShowProjectDialog(true);
            }}
            onViewProject={project => {
              // Navigate to project detail page
              router.push(`/projects/${project.id}`);
            }}
          />
        </TabsContent>

        <TabsContent value="time-entries">
          <TimeEntriesTable 
            defaultProjectId={selectedProjectForTime}
            showFilters={true}
            onRefresh={() => {
              // Refresh any project-related data if needed
            }}
          />
        </TabsContent>
      </Tabs>

      {/* Project Dialog */}
      <ProjectDialog
        open={showProjectDialog}
        onOpenChange={open => {
          setShowProjectDialog(open);
          if (!open) setEditingProject(undefined);
        }}
        project={editingProject}
        onSuccess={() => {
          // Table will auto-refresh when data changes
          setEditingProject(undefined);
        }}
      />

      {/* Time Entry Dialog */}
      <TimeEntryDialog
        open={showTimeEntryDialog}
        onOpenChange={(open) => {
          setShowTimeEntryDialog(open);
          if (!open) {
            setSelectedProjectForTime("");
          }
        }}
        defaultProjectId={selectedProjectForTime}
        onSuccess={() => {
          setShowTimeEntryDialog(false);
          setSelectedProjectForTime("");
        }}
      />
    </div>
  );
}
