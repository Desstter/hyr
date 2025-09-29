"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgressRing } from "@/components/ui/progress-ring";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api, handleApiError } from "@/lib/api";
import type { Project, Client } from "@/lib/api";
import { useProjectTimeEntries } from "@/lib/api/time-entries";
import {
  formatCurrency,
  formatDate,
  getProjectStatusLabel,
} from "@/lib/finance";
import { useTranslations } from "@/lib/i18n";
import {
  Eye,
  Edit,
  Search,
  Calendar,
  DollarSign,
  Users,
  AlertTriangle,
  CheckCircle,
  Clock,
  Pause,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { DeleteProjectDialog } from "./delete-project-dialog";
import {
  QuickStatusUpdate,
  QuickProgressUpdate,
  ProjectActionsMenu,
} from "./quick-actions";

type ViewMode = "grid" | "list";
type StatusFilter = "all" | "planned" | "in_progress" | "on_hold" | "completed";

interface EnhancedProjectsTableProps {
  onEditProject?: (project: Project) => void;
  onViewProject?: (project: Project) => void;
}

export function EnhancedProjectsTable({
  onEditProject,
  onViewProject,
}: EnhancedProjectsTableProps) {
  const _t = useTranslations("es");
  const [_viewMode, _setViewMode] = useState<ViewMode>("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortBy, setSortBy] = useState<
    "name" | "budget" | "progress" | "status"
  >("name");

  // State for API data
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Delete dialog state
  const [deleteProject, setDeleteProject] = useState<Project | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Client lookup map
  const clientMap = new Map(clients.map(c => [c.id, c.name]));

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [projectsResult, clientsResult] = await Promise.all([
        api.projects.list(),
        api.clients.list(),
      ]);

      const projectsData = Array.isArray(projectsResult) ? projectsResult : [];
      const clientsData = Array.isArray(clientsResult) ? clientsResult : [];

      setProjects(projectsData);
      setClients(clientsData);
    } catch (err) {
      const errorMessage = handleApiError(err);
      setError(errorMessage);
      toast.error("Error cargando proyectos: " + errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Handle project updates
  const handleProjectUpdate = (updatedProject: Project) => {
    setProjects(prev =>
      prev.map(p => (p.id === updatedProject.id ? updatedProject : p))
    );
  };

  // Handle project deletion
  const handleDeleteClick = (project: Project) => {
    setDeleteProject(project);
    setShowDeleteDialog(true);
  };

  const handleDeleteSuccess = () => {
    if (deleteProject) {
      setProjects(prev => prev.filter(p => p.id !== deleteProject.id));
      setDeleteProject(null);
    }
  };

  // Filter and sort projects
  const filteredAndSortedProjects = (projects || [])
    .filter(project => {
      const clientName = project.client_id
        ? clientMap.get(project.client_id) || ""
        : "";
      const matchesSearch =
        project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        clientName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus =
        statusFilter === "all" || project.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "budget":
          const budgetA = typeof a.budget_total === 'string' ? parseFloat(a.budget_total) || 0 : (a.budget_total || 0);
          const budgetB = typeof b.budget_total === 'string' ? parseFloat(b.budget_total) || 0 : (b.budget_total || 0);

          // Ensure we're working with valid numbers
          const safeA = isNaN(budgetA) ? 0 : budgetA;
          const safeB = isNaN(budgetB) ? 0 : budgetB;
          return safeB - safeA;
        case "progress":
          return (b.progress || 0) - (a.progress || 0);
        case "status":
          return a.status.localeCompare(b.status);
        default:
          return a.name.localeCompare(b.name);
      }
    });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4" />;
      case "in_progress":
        return <Clock className="h-4 w-4" />;
      case "on_hold":
        return <Pause className="h-4 w-4" />;
      default:
        return <Calendar className="h-4 w-4" />;
    }
  };

  const getProgressVariant = (progress: number, budgetStatus: number) => {
    if (budgetStatus > 100) return "danger";
    if (budgetStatus > 90) return "warning";
    if (progress > 75) return "success";
    return "primary";
  };

  // Component wrapper that includes time tracking data
  const ProjectCardWithTimeTracking = ({ project }: { project: Project }) => {
    const { summary: timeTrackingSummary } = useProjectTimeEntries(project.id);
    
    const clientName = project.client_id
      ? clientMap.get(project.client_id)
      : "Sin cliente";
    
    // Calculate real total cost including time tracking with safety checks
    const timeCost = timeTrackingSummary?.totalCost || 0;
    const spentTotal = typeof project.spent_total === 'string' ? parseFloat(project.spent_total) || 0 : (project.spent_total || 0);
    const realSpentTotal = spentTotal + timeCost;

    const budgetTotal = typeof project.budget_total === 'string' ? parseFloat(project.budget_total) || 0 : (project.budget_total || 0);

    // Safe division with proper fallbacks
    const budgetUtilization = (() => {
      if (!budgetTotal || budgetTotal <= 0 || isNaN(budgetTotal)) return 0;
      if (isNaN(realSpentTotal)) return 0;
      const utilization = (realSpentTotal / budgetTotal) * 100;
      return isFinite(utilization) ? utilization : 0;
    })();
    const isOverBudget = budgetUtilization > 100;
    const isAtRisk = budgetUtilization > 90 && project.progress < 90;

    return (
      <Card
        className={cn(
          "hyr-card hover:shadow-lg transition-all duration-300 hover:scale-[1.02]",
          isOverBudget && "border-l-4 border-l-[hsl(var(--destructive))]",
          isAtRisk &&
            !isOverBudget &&
            "border-l-4 border-l-[hsl(var(--warning))]"
        )}
      >
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div className="min-w-0 flex-1">
              <CardTitle className="text-lg font-semibold text-foreground mb-1 truncate">
                {project.name}
              </CardTitle>
              <p className="text-sm text-muted-foreground">{clientName}</p>
            </div>
            <div className="flex items-center gap-2 ml-4">
              <Badge
                variant={
                  project.status === "completed" ? "default" : "secondary"
                }
                className={cn(
                  "text-xs",
                  project.status === "completed" &&
                    "bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))]",
                  project.status === "in_progress" &&
                    "bg-primary text-primary-foreground",
                  project.status === "on_hold" &&
                    "bg-[hsl(var(--warning))] text-[hsl(var(--warning-foreground))]"
                )}
              >
                <span className="flex items-center gap-1">
                  {getStatusIcon(project.status)}
                  {getProjectStatusLabel(project.status)}
                </span>
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Progress and Budget */}
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <ProgressRing
                progress={project.progress || 0}
                variant={getProgressVariant(
                  project.progress || 0,
                  budgetUtilization
                )}
                size={80}
                strokeWidth={4}
              />
              <p className="text-xs text-muted-foreground mt-2">Progreso</p>
            </div>

            <div className="space-y-3">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-muted-foreground">
                    Presupuesto
                  </span>
                  <span className="text-xs font-medium">
                    {budgetUtilization.toFixed(0)}%
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full transition-all duration-500",
                      isOverBudget
                        ? "bg-[hsl(var(--destructive))]"
                        : isAtRisk
                          ? "bg-[hsl(var(--warning))]"
                          : "bg-[hsl(var(--success))]"
                    )}
                    style={{ width: `${Math.min(budgetUtilization, 100)}%` }}
                  />
                </div>
              </div>

              <div className="text-center">
                <p className="text-lg font-bold text-foreground">
                  {formatCurrency(budgetTotal)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Presupuesto total
                </p>
              </div>
            </div>
          </div>

          {/* Financial Summary */}
          <div className="grid grid-cols-3 gap-3 pt-4 border-t">
            <div className="text-center">
              <p className="text-sm font-medium text-[hsl(var(--success))]">
                {formatCurrency(budgetTotal - realSpentTotal)}
              </p>
              <p className="text-xs text-muted-foreground">Disponible</p>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-[hsl(var(--warning))]">
                {formatCurrency(realSpentTotal)}
              </p>
              <p className="text-xs text-muted-foreground">Gastado</p>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-muted-foreground">
                {project.estimated_end_date
                  ? formatDate(project.estimated_end_date)
                  : "N/A"}
              </p>
              <p className="text-xs text-muted-foreground">Fin estimado</p>
            </div>
          </div>

          {/* Enhanced Actions */}
          <div className="space-y-4 pt-4 border-t">
            {/* Quick Actions Row */}
            <div className="flex items-center justify-between gap-2">
              <QuickStatusUpdate
                project={project}
                onUpdate={handleProjectUpdate}
              />
              <ProjectActionsMenu
                project={project}
                onEdit={onEditProject}
                onDelete={handleDeleteClick}
                onView={p =>
                  onViewProject?.(p) ||
                  window.open(`/projects/${p.id}`, "_blank")
                }
              />
            </div>

            {/* Progress Control */}
            <QuickProgressUpdate
              project={project}
              onUpdate={handleProjectUpdate}
            />

            {/* Main Actions */}
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="flex-1" asChild>
                <Link href={`/projects/${project.id}`}>
                  <Eye className="h-4 w-4 mr-2" />
                  Ver
                </Link>
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                onClick={() => onEditProject?.(project)}
              >
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </Button>
            </div>
          </div>

          {/* Risk Indicators */}
          {(isOverBudget || isAtRisk) && (
            <div
              className={cn(
                "flex items-center gap-2 p-3 rounded-lg text-sm",
                isOverBudget
                  ? "bg-[hsl(var(--destructive-light))] text-[hsl(var(--destructive))]"
                  : "bg-[hsl(var(--warning-light))] text-[hsl(var(--warning))]"
              )}
            >
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              <span className="text-xs">
                {isOverBudget
                  ? "Proyecto sobre presupuesto"
                  : "Proyecto en riesgo de sobrepresupuesto"}
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="h-10 bg-muted animate-pulse rounded-lg flex-1 max-w-md" />
          <div className="h-10 bg-muted animate-pulse rounded-lg w-32" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-64 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="hyr-card border-[hsl(var(--destructive))] bg-gradient-to-r from-[hsl(var(--destructive-light))] to-transparent">
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-[hsl(var(--destructive))]" />
            <div>
              <h3 className="font-semibold text-[hsl(var(--destructive))]">
                Error cargando proyectos
              </h3>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
            <Button onClick={loadData} size="sm" className="ml-auto">
              Reintentar
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters and Controls */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex flex-1 gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar proyectos..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select
            value={statusFilter}
            onValueChange={(value: StatusFilter) => setStatusFilter(value)}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="planned">Planificado</SelectItem>
              <SelectItem value="in_progress">En progreso</SelectItem>
              <SelectItem value="on_hold">En pausa</SelectItem>
              <SelectItem value="completed">Completado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Select
            value={sortBy}
            onValueChange={(value: "name" | "budget" | "progress" | "status") => setSortBy(value)}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Ordenar por" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Nombre</SelectItem>
              <SelectItem value="budget">Presupuesto</SelectItem>
              <SelectItem value="progress">Progreso</SelectItem>
              <SelectItem value="status">Estado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Projects Grid */}
      {filteredAndSortedProjects.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {filteredAndSortedProjects.map(project => (
            <ProjectCardWithTimeTracking key={project.id} project={project} />
          ))}
        </div>
      ) : (
        <Card className="hyr-card">
          <CardContent className="text-center py-12">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-muted flex items-center justify-center">
              <Eye className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No se encontraron proyectos
            </h3>
            <p className="text-muted-foreground">
              {searchQuery || statusFilter !== "all"
                ? "Intenta ajustar los filtros de búsqueda"
                : "Aún no hay proyectos registrados"}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="hyr-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Proyectos</p>
                <p className="text-2xl font-bold text-foreground">
                  {projects.length}
                </p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hyr-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">En Progreso</p>
                <p className="text-2xl font-bold text-primary">
                  {projects.filter(p => p.status === "in_progress").length}
                </p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hyr-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completados</p>
                <p className="text-2xl font-bold text-[hsl(var(--success))]">
                  {projects.filter(p => p.status === "completed").length}
                </p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-[hsl(var(--success))]/10 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-[hsl(var(--success))]" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hyr-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  Presupuesto Total
                </p>
                <p className="text-xl font-bold text-foreground">
                  {formatCurrency(
                    projects.reduce((sum, p) => {
                      const budget = typeof p.budget_total === 'string' ? parseFloat(p.budget_total) || 0 : (p.budget_total || 0);
                      const safeBudget = isNaN(budget) ? 0 : budget;
                      return sum + safeBudget;
                    }, 0)
                  )}
                </p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-secondary/10 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-secondary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <DeleteProjectDialog
        project={deleteProject}
        open={showDeleteDialog}
        onOpenChange={open => {
          setShowDeleteDialog(open);
          if (!open) setDeleteProject(null);
        }}
        onSuccess={handleDeleteSuccess}
      />
    </div>
  );
}
