"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/components/ui/use-toast';
import { Loader2, Save, Building, FileText, Settings } from 'lucide-react';

interface CompanySettings {
  id?: string;
  company_name: string;
  nit: string;
  dv: string;
  ciiu: string;
  address: string;
  phone: string;
  email: string;
  dian_invoice_resolution: {
    number: string;
    date: string;
    prefix: string;
    from: number;
    to: number;
    valid_until: string;
  };
  dian_payroll_resolution: {
    number: string;
    date: string;
    valid_until: string;
  };
}

export default function CompanySettingsPage() {
  const [settings, setSettings] = useState<CompanySettings>({
    company_name: 'HYR CONSTRUCTORA & SOLDADURA S.A.S.',
    nit: '900123456',
    dv: '7',
    ciiu: '4100',
    address: 'Calle 123 #45-67, Bogotá D.C.',
    phone: '+57 1 234 5678',
    email: 'info@hyrconstructora.com',
    dian_invoice_resolution: {
      number: '18760000001',
      date: '2024-01-01',
      prefix: 'SETT',
      from: 1,
      to: 5000,
      valid_until: '2025-12-31'
    },
    dian_payroll_resolution: {
      number: '000000000042',
      date: '2024-01-01',
      valid_until: '2025-12-31'
    }
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadCompanySettings();
  }, []);

  const loadCompanySettings = async () => {
    try {
      // Simular carga de configuración existente
      // En implementación real: const response = await fetch('/api/settings/company');
      
      setTimeout(() => {
        setLoading(false);
      }, 1000);
      
    } catch (error) {
      console.error('Error cargando configuración:', error);
      toast({
        title: "Error",
        description: "No se pudo cargar la configuración empresarial",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleResolutionChange = (type: 'invoice' | 'payroll', field: string, value: string | number) => {
    const resolutionKey = type === 'invoice' ? 'dian_invoice_resolution' : 'dian_payroll_resolution';
    
    setSettings(prev => ({
      ...prev,
      [resolutionKey]: {
        ...prev[resolutionKey],
        [field]: value
      }
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    
    try {
      // Validaciones básicas
      if (!settings.company_name || !settings.nit || !settings.ciiu) {
        toast({
          title: "Error de validación",
          description: "Los campos Razón Social, NIT y CIIU son obligatorios",
          variant: "destructive",
        });
        setSaving(false);
        return;
      }

      // Simular guardado
      // En implementación real: 
      // const response = await fetch('/api/settings/company', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(settings)
      // });

      setTimeout(() => {
        toast({
          title: "Configuración guardada",
          description: "La configuración empresarial se ha actualizado exitosamente",
        });
        setSaving(false);
      }, 1000);
      
    } catch (error) {
      console.error('Error guardando configuración:', error);
      toast({
        title: "Error",
        description: "No se pudo guardar la configuración",
        variant: "destructive",
      });
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Cargando configuración...</span>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Configuración Empresarial</h1>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          {saving ? 'Guardando...' : 'Guardar Configuración'}
        </Button>
      </div>

      <Tabs defaultValue="company" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="company" className="flex items-center">
            <Building className="h-4 w-4 mr-2" />
            Datos Empresa
          </TabsTrigger>
          <TabsTrigger value="invoice-resolution" className="flex items-center">
            <FileText className="h-4 w-4 mr-2" />
            Resolución Facturación
          </TabsTrigger>
          <TabsTrigger value="payroll-resolution" className="flex items-center">
            <Settings className="h-4 w-4 mr-2" />
            Resolución Nómina
          </TabsTrigger>
        </TabsList>

        {/* Datos de la Empresa */}
        <TabsContent value="company" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Información General</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="company_name">Razón Social *</Label>
                  <Input
                    id="company_name"
                    value={settings.company_name}
                    onChange={(e) => handleInputChange('company_name', e.target.value)}
                    placeholder="Nombre completo de la empresa"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="nit">NIT *</Label>
                    <Input
                      id="nit"
                      value={settings.nit}
                      onChange={(e) => handleInputChange('nit', e.target.value)}
                      placeholder="900123456"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dv">DV</Label>
                    <Input
                      id="dv"
                      value={settings.dv}
                      onChange={(e) => handleInputChange('dv', e.target.value)}
                      placeholder="7"
                      maxLength={1}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ciiu">Código CIIU *</Label>
                  <Select value={settings.ciiu} onValueChange={(value) => handleInputChange('ciiu', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="4100">4100 - Construcción de edificios</SelectItem>
                      <SelectItem value="4290">4290 - Construcción de otras obras de ingeniería civil</SelectItem>
                      <SelectItem value="2592">2592 - Fabricación de productos metálicos</SelectItem>
                      <SelectItem value="4321">4321 - Instalaciones eléctricas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={settings.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="contacto@empresa.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono</Label>
                  <Input
                    id="phone"
                    value={settings.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    placeholder="+57 1 234 5678"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Dirección</Label>
                <Textarea
                  id="address"
                  value={settings.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  placeholder="Dirección completa de la empresa"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Resolución de Facturación */}
        <TabsContent value="invoice-resolution" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Resolución DIAN - Facturación Electrónica</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="invoice_resolution_number">Número de Resolución</Label>
                  <Input
                    id="invoice_resolution_number"
                    value={settings.dian_invoice_resolution.number}
                    onChange={(e) => handleResolutionChange('invoice', 'number', e.target.value)}
                    placeholder="18760000001"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="invoice_resolution_date">Fecha de Resolución</Label>
                  <Input
                    id="invoice_resolution_date"
                    type="date"
                    value={settings.dian_invoice_resolution.date}
                    onChange={(e) => handleResolutionChange('invoice', 'date', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="invoice_prefix">Prefijo</Label>
                  <Input
                    id="invoice_prefix"
                    value={settings.dian_invoice_resolution.prefix}
                    onChange={(e) => handleResolutionChange('invoice', 'prefix', e.target.value)}
                    placeholder="SETT"
                    maxLength={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="invoice_valid_until">Vigente Hasta</Label>
                  <Input
                    id="invoice_valid_until"
                    type="date"
                    value={settings.dian_invoice_resolution.valid_until}
                    onChange={(e) => handleResolutionChange('invoice', 'valid_until', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="invoice_from">Desde</Label>
                  <Input
                    id="invoice_from"
                    type="number"
                    value={settings.dian_invoice_resolution.from}
                    onChange={(e) => handleResolutionChange('invoice', 'from', parseInt(e.target.value))}
                    placeholder="1"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="invoice_to">Hasta</Label>
                  <Input
                    id="invoice_to"
                    type="number"
                    value={settings.dian_invoice_resolution.to}
                    onChange={(e) => handleResolutionChange('invoice', 'to', parseInt(e.target.value))}
                    placeholder="5000"
                  />
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Numeración Actual</h4>
                <p className="text-blue-800 text-sm">
                  {settings.dian_invoice_resolution.prefix}{String(settings.dian_invoice_resolution.from).padStart(6, '0')} - {settings.dian_invoice_resolution.prefix}{String(settings.dian_invoice_resolution.to).padStart(6, '0')}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Resolución de Nómina */}
        <TabsContent value="payroll-resolution" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Resolución DIAN - Nómina Electrónica</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="payroll_resolution_number">Número de Resolución</Label>
                  <Input
                    id="payroll_resolution_number"
                    value={settings.dian_payroll_resolution.number}
                    onChange={(e) => handleResolutionChange('payroll', 'number', e.target.value)}
                    placeholder="000000000042"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="payroll_resolution_date">Fecha de Resolución</Label>
                  <Input
                    id="payroll_resolution_date"
                    type="date"
                    value={settings.dian_payroll_resolution.date}
                    onChange={(e) => handleResolutionChange('payroll', 'date', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="payroll_valid_until">Vigente Hasta</Label>
                  <Input
                    id="payroll_valid_until"
                    type="date"
                    value={settings.dian_payroll_resolution.valid_until}
                    onChange={(e) => handleResolutionChange('payroll', 'valid_until', e.target.value)}
                  />
                </div>
              </div>

              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="font-medium text-green-900 mb-2">Estado de la Resolución</h4>
                <p className="text-green-800 text-sm">
                  Resolución habilitada para nómina electrónica hasta el {new Date(settings.dian_payroll_resolution.valid_until).toLocaleDateString('es-CO')}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Información de ayuda */}
      <Card className="border-yellow-200 bg-yellow-50">
        <CardContent className="p-4">
          <h4 className="font-medium text-yellow-800 mb-2">📋 Información Importante</h4>
          <ul className="text-yellow-700 text-sm space-y-1">
            <li>• Los campos marcados con (*) son obligatorios</li>
            <li>• Las resoluciones DIAN deben estar vigentes para generar documentos</li>
            <li>• El código CIIU debe corresponder a la actividad económica principal</li>
            <li>• Esta información se usa para generar facturas y nómina electrónica</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}