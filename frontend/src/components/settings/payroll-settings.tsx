"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Clock, DollarSign, Moon, Settings, Save } from "lucide-react";

interface PayrollConfig {
  daily_legal_hours: number;
  late_tolerance_minutes: number;
  overtime_threshold_hours: number;
  max_daily_hours: number;
  overtime_multiplier: number;
  night_shift_start: string;
  night_shift_end: string;
  night_shift_multiplier: number;
  night_shift_min_hours: number;
}

interface NightShiftConfig {
  start_time: string;
  end_time: string;
  premium_rate: number;
  min_night_hours: number;
  description: string;
}

export function PayrollSettings() {
  const [payrollConfig, setPayrollConfig] = useState<PayrollConfig>({
    daily_legal_hours: 7.3,
    late_tolerance_minutes: 5,
    overtime_threshold_hours: 7.3,
    max_daily_hours: 12,
    overtime_multiplier: 1.25,
    night_shift_start: "22:00",
    night_shift_end: "06:00",
    night_shift_multiplier: 1.35,
    night_shift_min_hours: 0.5
  });

  const [nightShiftConfig, setNightShiftConfig] = useState<NightShiftConfig>({
    start_time: "22:00",
    end_time: "06:00",
    premium_rate: 0.35,
    min_night_hours: 0.5,
    description: "Configuración para detección y cálculo de turno nocturno"
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadPayrollSettings = useCallback(async () => {
    try {
      setLoading(true);

      // Cargar configuraciones de nómina
      const payrollResponse = await fetch('/api/settings/payroll_settings');
      if (payrollResponse.ok) {
        const payrollData = await payrollResponse.json();
        if (payrollData.value) {
          setPayrollConfig({ ...payrollConfig, ...payrollData.value });
        }
      }

      // Cargar configuraciones de turno nocturno
      const nightResponse = await fetch('/api/settings/night_shift_settings');
      if (nightResponse.ok) {
        const nightData = await nightResponse.json();
        if (nightData.value) {
          setNightShiftConfig({ ...nightShiftConfig, ...nightData.value });
        }
      }

    } catch (error) {
      console.error('Error loading payroll settings:', error);
      toast.error('Error al cargar configuraciones de nómina');
    } finally {
      setLoading(false);
    }
  }, [payrollConfig, nightShiftConfig]);

  useEffect(() => {
    loadPayrollSettings();
  }, [loadPayrollSettings]);

  const saveSettings = async () => {
    try {
      setSaving(true);

      // Guardar configuraciones de nómina
      await fetch('/api/settings/payroll_settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          value: payrollConfig
        })
      });

      // Guardar configuraciones de turno nocturno
      await fetch('/api/settings/night_shift_settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          value: nightShiftConfig
        })
      });

      toast.success('Configuraciones de nómina guardadas exitosamente');

    } catch (error) {
      console.error('Error saving payroll settings:', error);
      toast.error('Error al guardar configuraciones');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configuración de Nómina
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Configuración de Nómina
        </CardTitle>
        <CardDescription>
          Configuraciones generales para cálculo de nómina y turno nocturno
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Configuraciones Básicas */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <h3 className="font-semibold">Configuraciones de Horario</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="daily_legal_hours">Horas legales diarias</Label>
              <Input
                id="daily_legal_hours"
                type="number"
                step="0.1"
                value={payrollConfig.daily_legal_hours}
                onChange={(e) => setPayrollConfig({
                  ...payrollConfig,
                  daily_legal_hours: parseFloat(e.target.value) || 7.3
                })}
              />
              <p className="text-xs text-muted-foreground">
                Horas regulares máximas por día (Colombia: 7.3h)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="max_daily_hours">Máximo horas por día</Label>
              <Input
                id="max_daily_hours"
                type="number"
                value={payrollConfig.max_daily_hours}
                onChange={(e) => setPayrollConfig({
                  ...payrollConfig,
                  max_daily_hours: parseInt(e.target.value) || 12
                })}
              />
              <p className="text-xs text-muted-foreground">
                Máximo legal permitido por día (incluye extras)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="late_tolerance_minutes">Tolerancia tardanza (min)</Label>
              <Input
                id="late_tolerance_minutes"
                type="number"
                value={payrollConfig.late_tolerance_minutes}
                onChange={(e) => setPayrollConfig({
                  ...payrollConfig,
                  late_tolerance_minutes: parseInt(e.target.value) || 5
                })}
              />
              <p className="text-xs text-muted-foreground">
                Minutos de tolerancia antes de descontar tardanza
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="overtime_multiplier">Multiplicador horas extra</Label>
              <Input
                id="overtime_multiplier"
                type="number"
                step="0.01"
                value={payrollConfig.overtime_multiplier}
                onChange={(e) => setPayrollConfig({
                  ...payrollConfig,
                  overtime_multiplier: parseFloat(e.target.value) || 1.25
                })}
              />
              <p className="text-xs text-muted-foreground">
                Recargo por horas extra (Colombia: 25% = 1.25)
              </p>
            </div>
          </div>
        </div>

        <Separator />

        {/* Configuración Turno Nocturno */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Moon className="h-4 w-4" />
            <h3 className="font-semibold">Turno Nocturno</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="night_start">Hora inicio nocturno</Label>
              <Input
                id="night_start"
                type="time"
                value={nightShiftConfig.start_time}
                onChange={(e) => setNightShiftConfig({
                  ...nightShiftConfig,
                  start_time: e.target.value
                })}
              />
              <p className="text-xs text-muted-foreground">
                Inicio del turno nocturno (default: 22:00)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="night_end">Hora fin nocturno</Label>
              <Input
                id="night_end"
                type="time"
                value={nightShiftConfig.end_time}
                onChange={(e) => setNightShiftConfig({
                  ...nightShiftConfig,
                  end_time: e.target.value
                })}
              />
              <p className="text-xs text-muted-foreground">
                Fin del turno nocturno (default: 06:00)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="night_premium">Recargo nocturno (%)</Label>
              <Input
                id="night_premium"
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={nightShiftConfig.premium_rate}
                onChange={(e) => setNightShiftConfig({
                  ...nightShiftConfig,
                  premium_rate: parseFloat(e.target.value) || 0.35
                })}
              />
              <p className="text-xs text-muted-foreground">
                Porcentaje adicional (Colombia: 35% = 0.35)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="min_night_hours">Mínimo horas nocturnas</Label>
              <Input
                id="min_night_hours"
                type="number"
                step="0.1"
                min="0"
                value={nightShiftConfig.min_night_hours}
                onChange={(e) => setNightShiftConfig({
                  ...nightShiftConfig,
                  min_night_hours: parseFloat(e.target.value) || 0.5
                })}
              />
              <p className="text-xs text-muted-foreground">
                Mínimo de horas para aplicar recargo nocturno
              </p>
            </div>
          </div>

          {/* Vista previa del recargo */}
          <div className="bg-muted/50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-4 w-4" />
              <span className="font-medium">Vista previa del recargo nocturno</span>
            </div>
            <div className="text-sm text-muted-foreground">
              <p>Turno nocturno: {nightShiftConfig.start_time} - {nightShiftConfig.end_time}</p>
              <p>Recargo: +{(nightShiftConfig.premium_rate * 100).toFixed(1)}% sobre tarifa base</p>
              <p>Ejemplo: Si tarifa base es $50,000/hora, nocturno = ${(50000 * (1 + nightShiftConfig.premium_rate)).toLocaleString()}/hora</p>
            </div>
          </div>
        </div>

        <Separator />

        {/* Botón Guardar */}
        <div className="flex justify-end">
          <Button
            onClick={saveSettings}
            disabled={saving}
            className="w-full md:w-auto"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Guardando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Guardar Configuración
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}