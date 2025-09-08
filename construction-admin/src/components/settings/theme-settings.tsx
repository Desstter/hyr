'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslations } from '@/lib/i18n';
import { toast } from 'sonner';
import { Moon, Sun, Globe, Palette } from 'lucide-react';
import { settingsService, ThemeSettings as ThemeSettingsType, AppPreferences } from '@/lib/api/settings';
import { handleApiError } from '@/lib/api';
import { Input } from '@/components/ui/input';

export function ThemeSettings() {
  const t = useTranslations('es');
  const [themeSettings, setThemeSettings] = useState<ThemeSettingsType>({
    mode: 'light',
    language: 'es',
    dateFormat: 'dd/MM/yyyy',
    timeFormat: 'HH:mm',
    primaryColor: '#3b82f6'
  });
  const [appPreferences, setAppPreferences] = useState<AppPreferences>({
    notifications: true,
    emailAlerts: true,
    autoBackup: true,
    defaultCurrency: 'COP',
    backupFrequency: 'daily',
    reportLanguage: 'es'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  // Cargar configuraciones desde API al montar el componente
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setIsInitialLoading(true);
        const [themeData, appData] = await Promise.all([
          settingsService.getThemeSettings(),
          settingsService.getAppPreferences()
        ]);
        
        setThemeSettings(themeData);
        setAppPreferences(appData);
        
        // Aplicar tema cargado
        settingsService.applyTheme(themeData);
      } catch (error) {
        console.error('Error loading settings:', error);
        const errorMessage = handleApiError(error);
        toast.error('Error al cargar configuraciones: ' + errorMessage);
        
        // Usar configuraciones de localStorage como fallback
        const fallbackTheme = settingsService.loadThemeFromStorage();
        setThemeSettings(prev => ({ ...prev, ...fallbackTheme }));
      } finally {
        setIsInitialLoading(false);
      }
    };

    loadSettings();
  }, []);

  const handleSaveTheme = async () => {
    setIsLoading(true);
    try {
      await settingsService.updateThemeSettings(themeSettings);
      
      // Aplicar tema inmediatamente
      settingsService.applyTheme(themeSettings);
      
      toast.success('Configuración de tema guardada y aplicada');
      
      // Si se cambió el idioma, sugerir recarga
      if (themeSettings.language !== 'es') {
        toast.info('Recarga la página para aplicar el cambio de idioma');
      }
    } catch (error) {
      console.error('Error saving theme settings:', error);
      const errorMessage = handleApiError(error);
      toast.error('Error al guardar configuración de tema: ' + errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSavePreferences = async () => {
    setIsLoading(true);
    try {
      await settingsService.updateAppPreferences(appPreferences);
      toast.success('Preferencias guardadas exitosamente');
    } catch (error) {
      console.error('Error saving app preferences:', error);
      const errorMessage = handleApiError(error);
      toast.error('Error al guardar preferencias: ' + errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleThemeChange = (field: keyof ThemeSettingsType, value: unknown) => {
    setThemeSettings(prev => ({ ...prev, [field]: value }));
  };

  const handlePreferencesChange = (field: keyof AppPreferences, value: unknown) => {
    setAppPreferences(prev => ({ ...prev, [field]: value }));
  };

  if (isInitialLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-2 text-muted-foreground">Cargando configuraciones...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Theme Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Configuración de Tema
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Personaliza la apariencia e idioma de la aplicación
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Modo de visualización</Label>
              <Select value={themeSettings.mode} onValueChange={(value) => handleThemeChange('mode', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">
                    <div className="flex items-center gap-2">
                      <Sun className="h-4 w-4" />
                      Modo Claro
                    </div>
                  </SelectItem>
                  <SelectItem value="dark">
                    <div className="flex items-center gap-2">
                      <Moon className="h-4 w-4" />
                      Modo Oscuro
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Idioma de la interfaz</Label>
              <Select value={themeSettings.language} onValueChange={(value) => handleThemeChange('language', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="es">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      Español
                    </div>
                  </SelectItem>
                  <SelectItem value="en">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      English
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="pt-4">
            <Button onClick={handleSaveTheme} disabled={isLoading}>
              {isLoading ? 'Guardando...' : 'Guardar Configuración de Tema'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* App Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Preferencias de Aplicación
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Notificaciones</Label>
                <p className="text-xs text-muted-foreground">Mostrar notificaciones del sistema</p>
              </div>
              <input
                type="checkbox"
                checked={appPreferences.notifications}
                onChange={(e) => handlePreferencesChange('notifications', e.target.checked)}
                className="h-4 w-4"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Alertas por email</Label>
                <p className="text-xs text-muted-foreground">Recibir alertas importantes por correo</p>
              </div>
              <input
                type="checkbox"
                checked={appPreferences.emailAlerts}
                onChange={(e) => handlePreferencesChange('emailAlerts', e.target.checked)}
                className="h-4 w-4"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Respaldo automático</Label>
                <p className="text-xs text-muted-foreground">Crear respaldos automáticos de datos</p>
              </div>
              <input
                type="checkbox"
                checked={appPreferences.autoBackup}
                onChange={(e) => handlePreferencesChange('autoBackup', e.target.checked)}
                className="h-4 w-4"
              />
            </div>
          </div>

          <div className="pt-4">
            <Button onClick={handleSavePreferences} disabled={isLoading}>
              {isLoading ? 'Guardando...' : 'Guardar Preferencias'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}