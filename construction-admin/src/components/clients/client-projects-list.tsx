"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { api, handleApiError } from "@/lib/api";
import type { Client, Project } from "@/lib/api";
import {
  formatCurrency,
  formatDate,
  getProjectStatusColor,
  getProjectStatusLabel,
} from "@/lib/finance";
import { useTranslations } from "@/lib/i18n";
import {
  FolderOpen,
  Calendar,
  DollarSign,
  TrendingUp,
  AlertCircle,
  Clock,
  Eye,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

interface ClientProjectsListProps {
  client: Client;
  className?: string;
  limit?: number;
}

export function ClientProjectsList({
  client,
  className,
  limit,
}: ClientProjectsListProps) {
  const t = useTranslations("es");
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProjects();
  }, [client.id]);

  const loadProjects = async () => {
    try {
      setLoading(true);
      setError(null);

      const clientProjects = await api.clients.getProjects(client.id);

      // Handle response format
      const projectsData = Array.isArray(clientProjects)
        ? clientProjects
        : Array.isArray(clientProjects.data)
          ? clientProjects.data
          : [];

      // Limit results if specified
      const finalProjects = limit ? projectsData.slice(0, limit) : projectsData;
      setProjects(finalProjects);
    } catch (err) {
      const errorMessage = handleApiError(err);
      setError(errorMessage);
      console.error("Error loading client projects:", err);
      toast.error("Error cargando proyectos del cliente: " + errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FolderOpen className="h-5 w-5" />
            <span>{t.clients.projects}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FolderOpen className="h-5 w-5" />
            <span>{t.clients.projects}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-red-500 text-sm">
            Error cargando proyectos
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FolderOpen className="h-5 w-5" />
            <span>{t.clients.projects}</span>
            <Badge variant="outline">{projects.length}</Badge>
          </div>
          {limit && projects.length === limit && (
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/projects?client=${client.id}`}>Ver todos</Link>
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {projects.length === 0 ? (
          <div className="text-center py-8">
            <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground text-sm">
              {t.clients.noProjects}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {projects.map(project => {
              const budgetUsed =
                (project.spent_total / project.budget_total) * 100;
              const isOverBudget = project.spent_total > project.budget_total;
              const isNearBudget = budgetUsed > 90 && !isOverBudget;

              return (
                <div
                  key={project.id}
                  className="border rounded-lg p-4 space-y-3 hover:bg-muted/50 transition-colors"
                >
                  {/* Project Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm mb-1 line-clamp-1">
                        {project.name}
                      </h4>
                      {project.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {project.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center space-x-2 ml-2">
                      <Badge
                        variant="outline"
                        className={getProjectStatusColor(project.status)}
                      >
                        {getProjectStatusLabel(project.status)}
                      </Badge>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/projects/${project.id}`}>
                          <Eye className="h-3 w-3" />
                        </Link>
                      </Button>
                    </div>
                  </div>

                  {/* Project Progress */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground">Progreso</span>
                      <span className="font-medium">{project.progress}%</span>
                    </div>
                    <Progress value={project.progress} className="h-2" />
                  </div>

                  {/* Budget Information */}
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-1 text-muted-foreground">
                        <DollarSign className="h-3 w-3" />
                        <span>Presupuesto</span>
                      </div>
                      <p className="font-semibold">
                        {formatCurrency(project.budget_total)}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center space-x-1 text-muted-foreground">
                        <TrendingUp className="h-3 w-3" />
                        <span>Gastado</span>
                        {isOverBudget && (
                          <AlertCircle className="h-3 w-3 text-red-500" />
                        )}
                        {isNearBudget && (
                          <Clock className="h-3 w-3 text-orange-500" />
                        )}
                      </div>
                      <p
                        className={`font-semibold ${
                          isOverBudget
                            ? "text-red-600"
                            : isNearBudget
                              ? "text-orange-600"
                              : ""
                        }`}
                      >
                        {formatCurrency(project.spent_total)}
                      </p>
                    </div>
                  </div>

                  {/* Project Dates */}
                  {(project.start_date || project.estimated_end_date) && (
                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                      {project.start_date && (
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-3 w-3" />
                          <span>Inicio: {formatDate(project.start_date)}</span>
                        </div>
                      )}

                      {project.estimated_end_date && (
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-3 w-3" />
                          <span>
                            Estimado: {formatDate(project.estimated_end_date)}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
