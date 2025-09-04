'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslations } from '@/lib/i18n';
import { toast } from 'sonner';
import { Moon, Sun, Globe } from 'lucide-react';

export function ThemeSettings() {
  const t = useTranslations('es');
  const [theme, setTheme] = useState('light');
  const [language, setLanguage] = useState('es');

  const handleSaveTheme = () => {
    toast.success('Configuración de tema guardada');
  };

  const handleSaveLanguage = () => {
    toast.success('Idioma actualizado');
  };

  return (
    <div className="space-y-6">
      {/* Theme Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sun className="h-5 w-5" />
            {t.settings.theme}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Modo de visualización</Label>
            <Select value={theme} onValueChange={setTheme}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">
                  <div className="flex items-center gap-2">
                    <Sun className="h-4 w-4" />
                    {t.settings.lightMode}
                  </div>
                </SelectItem>
                <SelectItem value="dark">
                  <div className="flex items-center gap-2">
                    <Moon className="h-4 w-4" />
                    {t.settings.darkMode}
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="pt-4">
            <Button onClick={handleSaveTheme}>
              {t.common.save}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Language Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            {t.settings.language}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Idioma de la interfaz</Label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="es">{t.settings.spanish}</SelectItem>
                <SelectItem value="en">{t.settings.english}</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              El cambio de idioma se aplicará después de recargar la página
            </p>
          </div>

          <div className="pt-4">
            <Button onClick={handleSaveLanguage}>
              {t.common.save}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}