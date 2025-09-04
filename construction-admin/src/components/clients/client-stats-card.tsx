'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { api, handleApiError } from '@/lib/api';
import type { Client } from '@/lib/api';
import { formatCurrency } from '@/lib/finance';
import { useTranslations } from '@/lib/i18n';
import { 
  Building2, 
  DollarSign, 
  TrendingUp, 
  Calendar,
  CheckCircle,
  Clock,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';

interface ClientStatsCardProps {
  client: Client;
  className?: string;
}

export function ClientStatsCard({ client, className }: ClientStatsCardProps) {
  const t = useTranslations('es');
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStats();
  }, [client.id]);

  const loadStats = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const clientStats = await api.clients.getClientStats(client.id);
      setStats(clientStats);
    } catch (err) {
      const errorMessage = handleApiError(err);
      setError(errorMessage);
      console.error('Error loading client stats:', err);
      toast.error('Error cargando estadísticas del cliente: ' + errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Building2 className="h-5 w-5" />
            <span>{t.clients.statistics}</span>
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
            <Building2 className="h-5 w-5" />
            <span>{t.clients.statistics}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-red-500 text-sm">
            Error cargando estadísticas
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return null;
  }

  // Calculate percentages and performance indicators
  const totalProjects = parseInt(stats.total_projects) || 0;
  const activeProjects = parseInt(stats.active_projects) || 0;
  const completedProjects = parseInt(stats.completed_projects) || 0;
  const projectsOnTime = parseInt(stats.projects_on_time) || 0;
  const projectsDelayed = parseInt(stats.projects_delayed) || 0;
  const totalRevenue = parseFloat(stats.total_revenue) || 0;
  const averageProjectValue = parseFloat(stats.average_project_value) || 0;

  const onTimePercentage = completedProjects > 0 
    ? Math.round((projectsOnTime / completedProjects) * 100) 
    : 0;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Building2 className="h-5 w-5" />
          <span>{t.clients.statistics}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Projects Overview */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <div className="h-3 w-3 rounded-full bg-blue-500"></div>
              <span className="text-sm text-muted-foreground">{t.clients.totalProjects}</span>
            </div>
            <p className="text-2xl font-bold">{totalProjects}</p>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Clock className="h-3 w-3 text-orange-500" />
              <span className="text-sm text-muted-foreground">{t.clients.activeProjects}</span>
            </div>
            <p className="text-2xl font-bold text-orange-600">{activeProjects}</p>
          </div>
        </div>

        {/* Revenue Information */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <DollarSign className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium">Información Financiera</span>
          </div>
          
          <div className="grid grid-cols-1 gap-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">{t.clients.totalRevenue}</span>
              <span className="font-semibold">{formatCurrency(totalRevenue)}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">{t.clients.averageProjectValue}</span>
              <span className="font-semibold">{formatCurrency(averageProjectValue)}</span>
            </div>
          </div>
        </div>

        {/* Project Performance */}
        {completedProjects > 0 && (
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-indigo-600" />
              <span className="text-sm font-medium">Rendimiento</span>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">{t.clients.completedProjects}</span>
                <Badge variant="outline" className="text-green-600 border-green-600">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  {completedProjects}
                </Badge>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Entregados a Tiempo</span>
                <div className="flex items-center space-x-2">
                  <Badge variant="outline" className="text-blue-600 border-blue-600">
                    {projectsOnTime}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    ({onTimePercentage}%)
                  </span>
                </div>
              </div>
              
              {projectsDelayed > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Con Retrasos</span>
                  <Badge variant="outline" className="text-red-600 border-red-600">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    {projectsDelayed}
                  </Badge>
                </div>
              )}
            </div>
          </div>
        )}

        {/* No Projects State */}
        {totalProjects === 0 && (
          <div className="text-center py-6">
            <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground text-sm">{t.clients.noProjects}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}