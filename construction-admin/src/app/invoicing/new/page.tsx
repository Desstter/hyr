"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/use-toast';
import { 
  Plus, 
  Trash2, 
  FileText, 
  Calculator, 
  Eye,
  Loader2,
  CheckCircle
} from 'lucide-react';

interface InvoiceItem {
  description: string;
  quantity: number;
  unit_price: number;
}

interface InvoiceCalculations {
  subtotal: number;
  vat_amount: number;
  reteica_amount: number;
  total_amount: number;
}

interface CreatedInvoice {
  id: string;
  invoice_number: string;
  client_name: string;
  client_nit: string;
  city: string;
  cufe: string;
  dian_validation_status: string;
  xml_ubl_content: string;
  calculations: InvoiceCalculations;
  created_at: string;
}

export default function NewInvoicePage() {
  const [formData, setFormData] = useState({
    client_name: '',
    client_nit: '',
    city: 'Bogota',
    notes: ''
  });

  const [items, setItems] = useState<InvoiceItem[]>([
    { description: '', quantity: 1, unit_price: 0 }
  ]);

  const [calculations, setCalculations] = useState<InvoiceCalculations>({
    subtotal: 0,
    vat_amount: 0,
    reteica_amount: 0,
    total_amount: 0
  });

  const [createdInvoice, setCreatedInvoice] = useState<CreatedInvoice | null>(null);
  const [showXmlDialog, setShowXmlDialog] = useState(false);
  const [creating, setCreating] = useState(false);

  // Recalcular totales cuando cambien los items
  React.useEffect(() => {
    const subtotal = items.reduce((sum, item) => {
      return sum + (item.quantity * item.unit_price);
    }, 0);

    // Cálculos simplificados (19% IVA, 0.966% ReteICA Bogotá)
    const vatAmount = subtotal * 0.19;
    const reteicaAmount = formData.city === 'Bogota' ? subtotal * 0.00966 : 0;
    const totalAmount = subtotal + vatAmount - reteicaAmount;

    setCalculations({
      subtotal,
      vat_amount: vatAmount,
      reteica_amount: reteicaAmount,
      total_amount: totalAmount
    });
  }, [items, formData.city]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleItemChange = (index: number, field: keyof InvoiceItem, value: string | number) => {
    const newItems = [...items];
    newItems[index] = {
      ...newItems[index],
      [field]: field === 'description' ? value : parseFloat(value.toString()) || 0
    };
    setItems(newItems);
  };

  const addItem = () => {
    setItems([...items, { description: '', quantity: 1, unit_price: 0 }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validaciones
    if (!formData.client_name) {
      toast({
        title: "Error",
        description: "El nombre del cliente es requerido",
        variant: "destructive",
      });
      return;
    }

    const validItems = items.filter(item => item.description && item.quantity > 0 && item.unit_price > 0);
    if (validItems.length === 0) {
      toast({
        title: "Error",
        description: "Debe agregar al menos un ítem válido",
        variant: "destructive",
      });
      return;
    }

    setCreating(true);

    try {
      // Simular creación de factura
      // En implementación real:
      // const response = await fetch('/api/invoicing/invoices', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ ...formData, items: validItems })
      // });

      // Mock response
      const mockInvoice = {
        id: 'inv-' + Date.now(),
        invoice_number: 'SETT000012',
        client_name: formData.client_name,
        client_nit: formData.client_nit,
        city: formData.city,
        cufe: 'ABC12345-DEF6-7890-GHIJ-KLMNOPQRSTUV',
        dian_validation_status: 'ACEPTADO_SIMULADO',
        xml_ubl_content: generateMockXML(),
        calculations,
        created_at: new Date().toISOString()
      };

      setTimeout(() => {
        setCreatedInvoice(mockInvoice);
        setCreating(false);
        
        toast({
          title: "✅ Factura creada exitosamente",
          description: `Factura ${mockInvoice.invoice_number} generada con CUFE`,
        });
      }, 2000);

    } catch (error) {
      console.error('Error creando factura:', error);
      toast({
        title: "Error",
        description: "No se pudo crear la factura",
        variant: "destructive",
      });
      setCreating(false);
    }
  };

  const generateMockXML = () => {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2">
    <UBLVersionID>2.1</UBLVersionID>
    <CustomizationID>DIAN 2.1</CustomizationID>
    <ID>SETT000012</ID>
    <UUID>ABC12345-DEF6-7890-GHIJ-KLMNOPQRSTUV</UUID>
    <IssueDate>${new Date().toISOString().split('T')[0]}</IssueDate>
    <InvoiceTypeCode>1</InvoiceTypeCode>
    <DocumentCurrencyCode>COP</DocumentCurrencyCode>
    
    <!-- Proveedor -->
    <AccountingSupplierParty>
        <Party>
            <PartyName>
                <Name>HYR CONSTRUCTORA & SOLDADURA S.A.S.</Name>
            </PartyName>
            <PartyTaxScheme>
                <CompanyID>900123456</CompanyID>
                <TaxScheme>
                    <ID>01</ID>
                    <Name>IVA</Name>
                </TaxScheme>
            </PartyTaxScheme>
        </Party>
    </AccountingSupplierParty>
    
    <!-- Cliente -->
    <AccountingCustomerParty>
        <Party>
            <PartyName>
                <Name>${formData.client_name}</Name>
            </PartyName>
        </Party>
    </AccountingCustomerParty>
    
    <!-- Totales -->
    <LegalMonetaryTotal>
        <LineExtensionAmount currencyID="COP">${calculations.subtotal.toFixed(2)}</LineExtensionAmount>
        <TaxInclusiveAmount currencyID="COP">${calculations.total_amount.toFixed(2)}</TaxInclusiveAmount>
        <PayableAmount currencyID="COP">${calculations.total_amount.toFixed(2)}</PayableAmount>
    </LegalMonetaryTotal>
    
</Invoice>`;
  };

  if (createdInvoice) {
    return (
      <div className="p-6 space-y-6">
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center text-green-800">
              <CheckCircle className="h-6 w-6 mr-2" />
              Factura Creada Exitosamente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <Label className="text-sm font-medium">Número</Label>
                <p className="text-lg font-bold">{createdInvoice.invoice_number}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Cliente</Label>
                <p>{createdInvoice.client_name}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Total</Label>
                <p className="text-lg font-bold">
                  ${createdInvoice.calculations.total_amount.toLocaleString('es-CO')}
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium">Estado DIAN</Label>
                <Badge className="bg-green-100 text-green-800">
                  {createdInvoice.dian_validation_status}
                </Badge>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">CUFE (Código Único)</Label>
              <p className="font-mono text-sm bg-white p-2 rounded border">
                {createdInvoice.cufe}
              </p>
            </div>

            <div className="flex space-x-2">
              <Dialog open={showXmlDialog} onOpenChange={setShowXmlDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Eye className="h-4 w-4 mr-2" />
                    Ver XML UBL
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
                  <DialogHeader>
                    <DialogTitle>XML UBL 2.1 - {createdInvoice.invoice_number}</DialogTitle>
                  </DialogHeader>
                  <pre className="text-xs bg-gray-100 p-4 rounded overflow-auto">
                    {createdInvoice.xml_ubl_content}
                  </pre>
                </DialogContent>
              </Dialog>

              <Button onClick={() => setCreatedInvoice(null)}>
                Crear Nueva Factura
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">Nueva Factura Electrónica</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Datos del Cliente */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              Datos del Cliente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="client_name">Nombre del Cliente *</Label>
                <Input
                  id="client_name"
                  value={formData.client_name}
                  onChange={(e) => handleInputChange('client_name', e.target.value)}
                  placeholder="Nombre o razón social del cliente"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="client_nit">NIT del Cliente</Label>
                <Input
                  id="client_nit"
                  value={formData.client_nit}
                  onChange={(e) => handleInputChange('client_nit', e.target.value)}
                  placeholder="123456789 (opcional)"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">Ciudad *</Label>
                <Select value={formData.city} onValueChange={(value) => handleInputChange('city', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Bogota">Bogotá D.C.</SelectItem>
                    <SelectItem value="Medellin">Medellín</SelectItem>
                    <SelectItem value="Cali">Cali</SelectItem>
                    <SelectItem value="Barranquilla">Barranquilla</SelectItem>
                    <SelectItem value="Cartagena">Cartagena</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Observaciones</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  placeholder="Observaciones adicionales (opcional)"
                  rows={2}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Items de la Factura */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center">
                <Calculator className="h-5 w-5 mr-2" />
                Items de la Factura
              </span>
              <Button type="button" onClick={addItem} size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Agregar Item
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              {items.map((item, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-3 p-3 border rounded-lg">
                  <div className="md:col-span-6">
                    <Label className="text-xs">Descripción</Label>
                    <Input
                      value={item.description}
                      onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                      placeholder="Descripción del servicio o producto"
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <Label className="text-xs">Cantidad</Label>
                    <Input
                      type="number"
                      min="1"
                      step="0.01"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <Label className="text-xs">Precio Unit.</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unit_price}
                      onChange={(e) => handleItemChange(index, 'unit_price', e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                  
                  <div className="md:col-span-2 flex items-end">
                    <div className="w-full">
                      <Label className="text-xs">Total</Label>
                      <p className="text-sm font-medium p-2 bg-gray-50 rounded">
                        ${(item.quantity * item.unit_price).toLocaleString('es-CO')}
                      </p>
                    </div>
                    {items.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(index)}
                        className="ml-2"
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Resumen de Totales */}
        <Card>
          <CardHeader>
            <CardTitle>Resumen de Totales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>${calculations.subtotal.toLocaleString('es-CO')}</span>
              </div>
              <div className="flex justify-between">
                <span>IVA (19%):</span>
                <span>${calculations.vat_amount.toLocaleString('es-CO')}</span>
              </div>
              {calculations.reteica_amount > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>ReteICA ({formData.city}):</span>
                  <span>-${calculations.reteica_amount.toLocaleString('es-CO')}</span>
                </div>
              )}
              <hr />
              <div className="flex justify-between text-lg font-bold">
                <span>Total a Pagar:</span>
                <span>${calculations.total_amount.toLocaleString('es-CO')}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Botones de Acción */}
        <div className="flex justify-end space-x-2">
          <Button type="button" variant="outline">
            Cancelar
          </Button>
          <Button type="submit" disabled={creating}>
            {creating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Generando Factura...
              </>
            ) : (
              <>
                <FileText className="h-4 w-4 mr-2" />
                Crear Factura Electrónica
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}