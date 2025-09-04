'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Bell, Mail, AlertTriangle, Calendar, DollarSign, Briefcase } from 'lucide-react';
import { settingsService, NotificationSettings } from '@/lib/api/settings';
import { handleApiError } from '@/lib/api';

export function NotificationSettings() {
  const [settings, setSettings] = useState<NotificationSettings>({
    emailEnabled: true,
    pushEnabled: true,
    payrollReminders: true,
    projectDeadlines: true,
    expenseAlerts: true,
    budgetWarnings: true
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  // Cargar configuraciones desde API
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setIsInitialLoading(true);
        const data = await settingsService.getNotificationSettings();
        setSettings(data);
      } catch (error) {
        console.error('Error loading notification settings:', error);
        const errorMessage = handleApiError(error);
        toast.error('Error al cargar configuraciones de notificaciones: ' + errorMessage);
      } finally {
        setIsInitialLoading(false);
      }
    };

    loadSettings();
  }, []);

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await settingsService.updateNotificationSettings(settings);
      toast.success('Configuraciones de notificaciones guardadas exitosamente');
    } catch (error) {
      console.error('Error saving notification settings:', error);
      const errorMessage = handleApiError(error);
      toast.error('Error al guardar configuraciones: ' + errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field: keyof NotificationSettings, value: boolean) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const testNotification = () => {
    if (settings.pushEnabled) {
      toast.success('¡Notificación de prueba!', {
        description: 'Las notificaciones están funcionando correctamente.',
        duration: 5000
      });
    } else {
      toast.info('Las notificaciones push están deshabilitadas');
    }
  };

  if (isInitialLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-2 text-muted-foreground">Cargando configuraciones...</span>
      </div>
    );
  }

  const notificationCount = Object.values(settings).filter(Boolean).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            <CardTitle>Configuraciones de Notificaciones</CardTitle>
          </div>
          <Badge variant="secondary">
            {notificationCount} activas
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Controla qué notificaciones y alertas deseas recibir del sistema
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Configuraciones generales */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Canales de Notificación</h3>
          <div className="grid gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Bell className="h-4 w-4 text-muted-foreground" />
                <div>
                  <Label className="text-sm font-medium">Notificaciones Push</Label>
                  <p className="text-xs text-muted-foreground">
                    Mostrar notificaciones en el navegador
                  </p>
                </div>
              </div>
              <Switch
                checked={settings.pushEnabled}
                onCheckedChange={(checked) => handleChange('pushEnabled', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <div>
                  <Label className="text-sm font-medium">Notificaciones por Email</Label>
                  <p className="text-xs text-muted-foreground">
                    Enviar alertas importantes por correo electrónico
                  </p>
                </div>
              </div>
              <Switch
                checked={settings.emailEnabled}
                onCheckedChange={(checked) => handleChange('emailEnabled', checked)}
              />
            </div>
          </div>
        </div>

        {/* Tipos de notificaciones */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Tipos de Notificaciones</h3>
          <div className="grid gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <DollarSign className="h-4 w-4 text-green-600" />
                <div>
                  <Label className="text-sm font-medium">Recordatorios de Nómina</Label>
                  <p className="text-xs text-muted-foreground">
                    Recordatorios de fechas de procesamiento y pago de nómina
                  </p>
                </div>
              </div>
              <Switch
                checked={settings.payrollReminders}
                onCheckedChange={(checked) => handleChange('payrollReminders', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Calendar className="h-4 w-4 text-blue-600" />
                <div>
                  <Label className="text-sm font-medium">Fechas Límite de Proyectos</Label>
                  <p className="text-xs text-muted-foreground">
                    Alertas sobre fechas límite y entregas de proyectos
                  </p>
                </div>
              </div>
              <Switch
                checked={settings.projectDeadlines}
                onCheckedChange={(checked) => handleChange('projectDeadlines', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Briefcase className="h-4 w-4 text-purple-600" />
                <div>
                  <Label className="text-sm font-medium">Alertas de Gastos</Label>
                  <p className="text-xs text-muted-foreground">
                    Notificaciones sobre gastos elevados y aprobaciones pendientes
                  </p>
                </div>
              </div>
              <Switch
                checked={settings.expenseAlerts}
                onCheckedChange={(checked) => handleChange('expenseAlerts', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <div>
                  <Label className="text-sm font-medium">Advertencias de Presupuesto</Label>
                  <p className="text-xs text-muted-foreground">
                    Alertas cuando los proyectos excedan el presupuesto
                  </p>
                </div>
              </div>
              <Switch
                checked={settings.budgetWarnings}
                onCheckedChange={(checked) => handleChange('budgetWarnings', checked)}
              />
            </div>
          </div>
        </div>

        {/* Acciones */}
        <div className="flex space-x-2 pt-4">
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? 'Guardando...' : 'Guardar Configuraciones'}
          </Button>
          <Button 
            variant="outline" 
            onClick={testNotification}
            disabled={!settings.pushEnabled}
          >
            Probar Notificación
          </Button>
        </div>

        {/* Estado actual */}
        <div className="pt-4 border-t">
          <h3 className="text-sm font-semibold mb-2">Estado Actual</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${settings.pushEnabled ? 'bg-green-500' : 'bg-gray-300'}`}></div>
              <span>Notificaciones Push: {settings.pushEnabled ? 'Activas' : 'Inactivas'}</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${settings.emailEnabled ? 'bg-green-500' : 'bg-gray-300'}`}></div>
              <span>Email: {settings.emailEnabled ? 'Activo' : 'Inactivo'}</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${settings.payrollReminders ? 'bg-green-500' : 'bg-gray-300'}`}></div>
              <span>Nómina: {settings.payrollReminders ? 'Activa' : 'Inactiva'}</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${settings.projectDeadlines ? 'bg-green-500' : 'bg-gray-300'}`}></div>
              <span>Proyectos: {settings.projectDeadlines ? 'Activas' : 'Inactivas'}</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${settings.expenseAlerts ? 'bg-green-500' : 'bg-gray-300'}`}></div>
              <span>Gastos: {settings.expenseAlerts ? 'Activas' : 'Inactivas'}</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${settings.budgetWarnings ? 'bg-green-500' : 'bg-gray-300'}`}></div>
              <span>Presupuesto: {settings.budgetWarnings ? 'Activas' : 'Inactivas'}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}