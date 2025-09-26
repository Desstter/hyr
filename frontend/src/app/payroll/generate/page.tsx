"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDianSettings } from "@/lib/hooks/useCompanySettings";


import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";
import {
  Users,
  FileText,
  Calendar,
  Loader2,
  CheckCircle,
  Download,
  Eye,
  AlertCircle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { personnelService } from "@/lib/api";

interface Employee {
  id: string;
  name: string;
  document_number: string;
  email: string;
  position: string;
  monthly_salary: number;
  hourly_rate?: number;
  status: string;
  department: string;
}

interface PayrollDocument {
  id: string;
  cune: string;
  period: string;
  employee_count: number;
  total_salary: number;
  total_deductions: number;
  total_employer_cost: number;
  dian_status: string;
  xml_content: string;
  created_at: string;
  error?: string;
  existing_employees?: string[];
}

export default function PayrollGeneratePage() {
  const { settings: dianSettings, loading: loadingDian } = useDianSettings();
  
  const [period, setPeriod] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [generatedPayroll, setGeneratedPayroll] =
    useState<PayrollDocument | null>(null);
  const [existingPayroll, setExistingPayroll] = useState<PayrollDocument | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [showXmlDialog, setShowXmlDialog] = useState(false);
  const [showRegenerateDialog, setShowRegenerateDialog] = useState(false);

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    try {
      const personnel = await personnelService.getAll({ status: "active" });
      // Map Personnel to Employee interface
      const employees = personnel.map(person => ({
        ...person,
        email: person.email || "", // Ensure email is always a string
        monthly_salary: person.monthly_salary || 0, // Ensure monthly_salary is always a number
      }));
      setEmployees(employees);
    } catch (error) {
      console.error("Error loading employees:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los empleados",
        variant: "destructive",
      });

      // Set empty array on error - let the user see the empty state
      setEmployees([]);
    } finally {
      setLoadingEmployees(false);
    }
  };

  const generatePayroll = async () => {
    if (!period) {
      toast({
        title: "Error",
        description: "Debe seleccionar un período",
        variant: "destructive",
      });
      return;
    }

    if (employees.length === 0) {
      toast({
        title: "Error",
        description: "No hay empleados para procesar nómina",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Use runtime configuration instead of hardcoded URL
      const { apiUrl } = await import("@/lib/appConfig");
      const url = await apiUrl(`/dian/payroll/${period}/generate`);
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          generate_xml: true,
          employees: employees.map(emp => ({
            id: emp.id,
            document_number: emp.document_number,
            name: emp.name,
            base_salary:
              Number(emp.monthly_salary) ||
              (Number(emp.hourly_rate) || 0) * 192,
            position: emp.position,
          })),
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Map the API response to the expected PayrollDocument structure
        const mappedPayroll = {
          id: data.data.processed[0]?.id || "",
          cune: data.data.processed[0]?.cune || "",
          period: data.data.period,
          employee_count: data.data.total_employees,
          total_salary: data.data.summary.total_payroll,
          total_deductions: data.data.processed.reduce((sum: number, emp: { calculations?: { totalDeductions?: number } }) => sum + (emp.calculations?.totalDeductions || 0), 0),
          total_employer_cost: data.data.summary.total_employer_cost,
          dian_status: data.data.processed[0]?.dian_status || "",
          xml_content: data.data.processed[0]?.xml_content || "",
          created_at: data.data.processed[0]?.created_at || new Date().toISOString()
        };
        
        setGeneratedPayroll(mappedPayroll);
        setExistingPayroll(null);
        toast({
          title: "✅ Nómina generada exitosamente",
          description: `CUNE: ${mappedPayroll.cune}`,
        });
      } else if (response.status === 409) {
        // Handle conflict - existing payroll for period
        setExistingPayroll(data);
        toast({
          title: "Nómina ya existe",
          description: `Ya existe nómina electrónica para ${period}. Use las opciones disponibles.`,
          variant: "default",
        });
      } else {
        toast({
          title: "Error",
          description: data.error || "Error generando nómina",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error generating payroll:", error);

      // FUNCTIONALITY FIX: Better error handling instead of fallback to mock
      const errorMessage =
        error instanceof Error ? error.message : "Error desconocido";
      toast({
        title: "❌ Error generando nómina",
        description: `No se pudo conectar al servidor DIAN: ${errorMessage}. Verifique la conexión y los datos.`,
        variant: "destructive",
      });

      // Don't generate fake data - show proper error state
      setGeneratedPayroll(null);
    }

    setLoading(false);
  };

  const viewExistingPayroll = async () => {
    if (!period) return;

    try {
      const { apiUrl } = await import("@/lib/appConfig");
      const url = await apiUrl(`/dian/payroll/${period}`);
      const response = await fetch(url);
      const data = await response.json();

      if (data.success && data.data.documents.length > 0) {
        // Map existing payroll to display format
        const existingDoc = data.data.documents[0];
        const mappedPayroll = {
          id: existingDoc.id,
          cune: existingDoc.cune,
          period: existingDoc.period,
          employee_count: data.data.summary.total_employees,
          total_salary: data.data.summary.total_base_salary,
          total_deductions: 0, // Will need to calculate or get from backend
          total_employer_cost: 0, // Will need to calculate or get from backend
          dian_status: existingDoc.dian_status,
          xml_content: "", // Will load when needed
          created_at: existingDoc.created_at
        };

        setGeneratedPayroll(mappedPayroll);
        setExistingPayroll(null);
        toast({
          title: "Nómina existente cargada",
          description: `CUNE: ${existingDoc.cune}`,
        });
      }
    } catch (error) {
      console.error("Error loading existing payroll:", error);
      toast({
        title: "Error",
        description: "No se pudo cargar la nómina existente",
        variant: "destructive",
      });
    }
  };

  const deleteExistingPayroll = async () => {
    if (!period) return;

    try {
      setLoading(true);
      const { apiUrl } = await import("@/lib/appConfig");
      const url = await apiUrl(`/dian/payroll/${period}`);
      const response = await fetch(url, {
        method: "DELETE",
      });

      const data = await response.json();

      if (data.success) {
        setExistingPayroll(null);
        toast({
          title: "✅ Nómina eliminada",
          description: `Nómina del período ${period} eliminada. Puede generar una nueva.`,
        });
      } else {
        toast({
          title: "Error",
          description: data.error || "Error eliminando nómina",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error deleting payroll:", error);
      toast({
        title: "Error",
        description: "No se pudo eliminar la nómina existente",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setShowRegenerateDialog(false);
    }
  };

  const handleRegenerateConfirm = async () => {
    await deleteExistingPayroll();
    // After deletion, automatically try to generate new payroll
    setTimeout(() => {
      generatePayroll();
    }, 1000);
  };


  if (loadingEmployees) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Cargando empleados...</span>
      </div>
    );
  }

  // Show existing payroll conflict dialog
  if (existingPayroll) {
    return (
      <div className="p-6 space-y-6">
        <h1 className="text-3xl font-bold">Generar Nómina Electrónica</h1>
        
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center text-orange-800">
              <AlertCircle className="h-6 w-6 mr-2" />
              Nómina Ya Existe - {period}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-orange-700">
              {existingPayroll.error}
            </p>
            
            {existingPayroll.existing_employees && (
              <div className="p-3 bg-white rounded border">
                <h4 className="font-medium mb-2">Empleados en nómina existente:</h4>
                <ul className="text-sm text-gray-600">
                  {existingPayroll.existing_employees.map((doc: string, index: number) => (
                    <li key={index}>• CC {doc}</li>
                  ))}
                </ul>
              </div>
            )}
            
            <div className="flex space-x-3">
              <Button onClick={viewExistingPayroll} variant="outline">
                <Eye className="h-4 w-4 mr-2" />
                Ver Nómina Existente
              </Button>
              
              <Button 
                onClick={() => setShowRegenerateDialog(true)}
                variant="destructive"
              >
                <FileText className="h-4 w-4 mr-2" />
                Regenerar Nómina
              </Button>
              
              <Button 
                onClick={() => setExistingPayroll(null)}
                variant="secondary"
              >
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Regenerate Confirmation Dialog */}
        <Dialog open={showRegenerateDialog} onOpenChange={setShowRegenerateDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center text-red-600">
                <AlertCircle className="h-5 w-5 mr-2" />
                ⚠️ Confirmar Regeneración
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-gray-700">
                Esta acción eliminará permanentemente la nómina electrónica existente 
                para el período <strong>{period}</strong> y generará una nueva.
              </p>
              
              <div className="p-3 bg-red-50 rounded border border-red-200">
                <h4 className="font-medium text-red-800 mb-1">⚠️ Advertencias Legales:</h4>
                <ul className="text-sm text-red-700 space-y-1">
                  <li>• Esta acción es irreversible</li>
                  <li>• Debe notificar a la DIAN sobre la anulación</li>
                  <li>• Mantenga registros de auditoría</li>
                  <li>• Verifique compliance antes de proceder</li>
                </ul>
              </div>
              
              <div className="flex space-x-2 justify-end">
                <Button 
                  variant="outline" 
                  onClick={() => setShowRegenerateDialog(false)}
                >
                  Cancelar
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={handleRegenerateConfirm}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Eliminando...
                    </>
                  ) : (
                    <>
                      <FileText className="h-4 w-4 mr-2" />
                      Confirmar Regeneración
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  if (generatedPayroll) {
    return (
      <div className="p-6 space-y-6">
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center text-green-800">
              <CheckCircle className="h-6 w-6 mr-2" />
              Nómina Electrónica Generada
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className="text-sm font-medium">Período</Label>
                <p className="text-lg font-bold">{generatedPayroll.period}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Empleados</Label>
                <p className="text-lg font-bold">
                  {generatedPayroll.employee_count}
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium">Estado DIAN</Label>
                <Badge className="bg-green-100 text-green-800">
                  {generatedPayroll.dian_status}
                </Badge>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">
                CUNE (Código Único de Nómina Electrónica)
              </Label>
              <p className="font-mono text-sm bg-white p-2 rounded border">
                {generatedPayroll.cune}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-white rounded border">
              <div>
                <Label className="text-sm text-gray-600">Total Salarios</Label>
                <p className="text-lg font-semibold">
                  ${(generatedPayroll.total_salary || 0).toLocaleString("es-CO")}
                </p>
              </div>
              <div>
                <Label className="text-sm text-gray-600">
                  Total Deducciones
                </Label>
                <p className="text-lg font-semibold text-red-600">
                  ${(generatedPayroll.total_deductions || 0).toLocaleString("es-CO")}
                </p>
              </div>
              <div>
                <Label className="text-sm text-gray-600">
                  Costo Patronal Total
                </Label>
                <p className="text-lg font-semibold text-blue-600">
                  $
                  {(generatedPayroll.total_employer_cost || 0).toLocaleString("es-CO")}
                </p>
              </div>
            </div>

            <div className="flex space-x-2">
              <Dialog open={showXmlDialog} onOpenChange={setShowXmlDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Eye className="h-4 w-4 mr-2" />
                    Ver XML Nómina
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
                  <DialogHeader>
                    <DialogTitle>
                      XML Nómina Electrónica - {generatedPayroll.period}
                    </DialogTitle>
                  </DialogHeader>
                  <pre className="text-xs bg-gray-100 p-4 rounded overflow-auto">
                    {generatedPayroll.xml_content}
                  </pre>
                </DialogContent>
              </Dialog>

              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Descargar XML
              </Button>

              <Button onClick={() => setGeneratedPayroll(null)}>
                Generar Nueva Nómina
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">Generar Nómina Electrónica</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configuración */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="h-5 w-5 mr-2" />
              Configuración
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="period">Período *</Label>
              <Input
                id="period"
                type="month"
                value={period}
                onChange={e => setPeriod(e.target.value)}
                required
              />
            </div>

            <div className="p-3 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-1">
                Resolución DIAN
              </h4>
              <p className="text-sm text-blue-800">
                {loadingDian ? "Cargando..." : `${dianSettings.resolutionNumber} - Vigente hasta ${dianSettings.resolutionValidUntil}`}
              </p>
            </div>

            <Button
              onClick={generatePayroll}
              disabled={loading || !period}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Generando Nómina...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  Generar Nómina Electrónica
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Empleados */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="h-5 w-5 mr-2" />
              Empleados ({employees.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {employees.length === 0 ? (
              <div className="text-center py-8">
                <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No hay empleados registrados</p>
              </div>
            ) : (
              <div className="space-y-3">
                {employees.map(employee => (
                  <div
                    key={employee.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex-1">
                      <h4 className="font-medium">{employee.name}</h4>
                      <p className="text-sm text-gray-600">
                        {employee.position} • CC {employee.document_number}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">
                        $
                        {(
                          Number(employee.monthly_salary) ||
                          (Number(employee.hourly_rate) || 0) * 192
                        ).toLocaleString("es-CO")}
                      </p>
                      <Badge
                        variant={
                          employee.status === "active" ? "default" : "secondary"
                        }
                      >
                        {employee.status}
                      </Badge>
                    </div>
                  </div>
                ))}

                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Total Salarios:</span>
                    <span className="text-lg font-bold">
                      $
                      {employees
                        .reduce(
                          (sum, emp) =>
                            sum +
                            (Number(emp.monthly_salary) ||
                              (Number(emp.hourly_rate) || 0) * 192),
                          0
                        )
                        .toLocaleString("es-CO")}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Información Legal */}
      <Card className="border-yellow-200 bg-yellow-50">
        <CardContent className="p-4">
          <h4 className="font-medium text-yellow-800 mb-2">
            📋 Información Legal
          </h4>
          <ul className="text-yellow-700 text-sm space-y-1">
            <li>
              • La nómina electrónica debe generarse dentro de los 5 días
              siguientes al pago
            </li>
            <li>
              • Se enviará automáticamente a la DIAN y generará CUNE único
            </li>
            <li>• Los empleados recibirán copia del documento vía email</li>
            <li>• Cumple con la Resolución 000013 de 2021 de la DIAN</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
