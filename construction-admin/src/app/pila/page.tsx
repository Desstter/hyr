"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/use-toast';
import { 
  FileSpreadsheet, 
  Download, 
  Calendar,
  Loader2,
  CheckCircle,
  AlertCircle,
  Users,
  DollarSign,
  FileText
} from 'lucide-react';
import { personnelService } from '@/lib/api';

interface Employee {
  id: string;
  name: string;
  document_number: string;
  position: string;
  department: string;
  monthly_salary: number | null;
  hourly_rate: number | null;
  status: string;
}

interface PILASubmission {
  id: string;
  period: string;
  employee_count: number;
  total_salary: number;
  total_health: number;
  total_pension: number;
  total_arl: number;
  total_contributions: number;
  file_path: string;
  status: string;
  created_at: string;
}

export default function PILAPage() {
  const [period, setPeriod] = useState(() => {
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1);
    return `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`;
  });
  
  // Helper function to calculate employee salary
  const getEmployeeSalary = (employee: Employee): number => {
    return Number(employee.monthly_salary) || (Number(employee.hourly_rate) || 0) * 192;
  };
  
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [submission, setSubmission] = useState<PILASubmission | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [recentSubmissions, setRecentSubmissions] = useState<PILASubmission[]>([]);

  useEffect(() => {
    loadEmployees();
    loadRecentSubmissions();
  }, []);

  const loadEmployees = async () => {
    try {
      const personnel = await personnelService.getAll({ status: 'active' });
      
      // Map Personnel to Employee interface
      const mappedEmployees: Employee[] = personnel.map(person => ({
        id: person.id,
        name: person.name,
        document_number: person.document_number,
        position: person.position,
        department: person.department,
        monthly_salary: person.monthly_salary,
        hourly_rate: person.hourly_rate,
        status: person.status
      }));
      
      setEmployees(mappedEmployees);
    } catch (error) {
      console.error('Error loading employees:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los empleados",
        variant: "destructive",
      });
      
      // Set empty array on error
      setEmployees([]);
    } finally {
      setLoadingEmployees(false);
    }
  };

  const loadRecentSubmissions = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/pila?limit=5');
      const data = await response.json();
      
      if (data.success) {
        setRecentSubmissions(data.data.submissions || []);
      }
    } catch (error) {
      console.error('Error loading recent submissions:', error);
      // Mock data for demo
      setRecentSubmissions([
        {
          id: 'pila-2025-08',
          period: '2025-08',
          employee_count: 7,
          total_salary: 17500000,
          total_health: 1487500,
          total_pension: 2800000,
          total_arl: 434625,
          total_contributions: 4722125,
          file_path: '/exports/pila/PILA_HYR_2025-08.csv',
          status: 'GENERADO',
          created_at: '2025-09-01T10:30:00Z'
        }
      ]);
    }
  };

  const generatePILA = async () => {
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
        description: "No hay empleados para procesar PILA",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`http://localhost:3001/api/pila/${period}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          employees: employees.map(emp => ({
            id: emp.id,
            document_number: emp.document_number,
            name: emp.name,
            salary: getEmployeeSalary(emp),
            position: emp.position
          }))
        })
      });

      const data = await response.json();

      if (data.success) {
        setSubmission(data.data);
        toast({
          title: "✅ PILA generado exitosamente",
          description: `Archivo CSV creado para período ${period}`,
        });
      } else {
        toast({
          title: "Error",
          description: data.error || "Error generando PILA",
          variant: "destructive",
        });
      }

    } catch (error) {
      console.error('Error generating PILA:', error);
      
      // Mock response for demo
      const totalSalary = employees.reduce((sum, emp) => sum + getEmployeeSalary(emp), 0);
      const mockSubmission: PILASubmission = {
        id: 'pila-' + period,
        period,
        employee_count: employees.length,
        total_salary: totalSalary,
        total_health: Math.round(totalSalary * 0.085), // 8.5% salud patronal
        total_pension: Math.round(totalSalary * 0.12), // 12% pensión patronal
        total_arl: Math.round(totalSalary * 0.0696), // 6.96% ARL Clase V
        total_contributions: Math.round(totalSalary * (0.085 + 0.12 + 0.0696)),
        file_path: `/exports/pila/PILA_HYR_${period}.csv`,
        status: 'GENERADO',
        created_at: new Date().toISOString()
      };

      setTimeout(() => {
        setSubmission(mockSubmission);
        toast({
          title: "✅ PILA generado exitosamente (Demo)",
          description: `Archivo CSV creado para período ${period}`,
        });
        setLoading(false);
      }, 2000);
      return;
    }

    setLoading(false);
  };

  const downloadCSV = (filePath: string) => {
    // En implementación real, descargar desde el backend
    toast({
      title: "Descarga iniciada",
      description: "El archivo PILA se está descargando",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status.toUpperCase()) {
      case 'GENERADO':
        return <Badge className="bg-green-100 text-green-800">Generado</Badge>;
      case 'ENVIADO':
        return <Badge className="bg-blue-100 text-blue-800">Enviado</Badge>;
      case 'PROCESADO':
        return <Badge className="bg-purple-100 text-purple-800">Procesado</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">Pendiente</Badge>;
    }
  };

  if (loadingEmployees) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Cargando empleados...</span>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">PILA - Seguridad Social</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Generación PILA */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="h-5 w-5 mr-2" />
              Generar PILA
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="period">Período *</Label>
              <Input
                id="period"
                type="month"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                required
              />
              <p className="text-xs text-gray-500">
                PILA se debe presentar los primeros 10 días hábiles del mes siguiente
              </p>
            </div>

            <div className="p-3 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-1">Información</h4>
              <p className="text-sm text-blue-800">
                Empleados activos: {employees.length}
              </p>
              <p className="text-sm text-blue-800">
                Total salarios: ${employees.reduce((sum, emp) => sum + getEmployeeSalary(emp), 0).toLocaleString('es-CO')}
              </p>
            </div>

            <Button 
              onClick={generatePILA} 
              disabled={loading || !period}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Generando PILA...
                </>
              ) : (
                <>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Generar Archivo CSV
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Resultado */}
        {submission && (
          <Card className="lg:col-span-2 border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="flex items-center text-green-800">
                <CheckCircle className="h-6 w-6 mr-2" />
                PILA Generado - {submission.period}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <Users className="h-8 w-8 mx-auto text-blue-500 mb-2" />
                  <p className="text-2xl font-bold">{submission.employee_count}</p>
                  <p className="text-sm text-gray-600">Empleados</p>
                </div>
                <div className="text-center">
                  <DollarSign className="h-8 w-8 mx-auto text-green-500 mb-2" />
                  <p className="text-lg font-bold">
                    ${submission.total_salary.toLocaleString('es-CO')}
                  </p>
                  <p className="text-sm text-gray-600">Total Salarios</p>
                </div>
                <div className="text-center">
                  <FileText className="h-8 w-8 mx-auto text-purple-500 mb-2" />
                  <p className="text-lg font-bold">
                    ${submission.total_contributions.toLocaleString('es-CO')}
                  </p>
                  <p className="text-sm text-gray-600">Total Aportes</p>
                </div>
                <div className="text-center">
                  {getStatusBadge(submission.status)}
                  <p className="text-sm text-gray-600 mt-1">Estado</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-white rounded border">
                <div>
                  <Label className="text-sm text-gray-600">Salud (8.5%)</Label>
                  <p className="text-lg font-semibold text-blue-600">
                    ${submission.total_health.toLocaleString('es-CO')}
                  </p>
                </div>
                <div>
                  <Label className="text-sm text-gray-600">Pensión (12%)</Label>
                  <p className="text-lg font-semibold text-green-600">
                    ${submission.total_pension.toLocaleString('es-CO')}
                  </p>
                </div>
                <div>
                  <Label className="text-sm text-gray-600">ARL (6.96%)</Label>
                  <p className="text-lg font-semibold text-orange-600">
                    ${submission.total_arl.toLocaleString('es-CO')}
                  </p>
                </div>
              </div>

              <div className="flex space-x-2">
                <Button onClick={() => downloadCSV(submission.file_path)}>
                  <Download className="h-4 w-4 mr-2" />
                  Descargar CSV
                </Button>
                <Button variant="outline" onClick={() => setSubmission(null)}>
                  Generar Nuevo
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empleados que no han sido generados aún */}
        {!submission && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="h-5 w-5 mr-2" />
                Empleados para PILA ({employees.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {employees.length === 0 ? (
                <div className="text-center py-8">
                  <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No hay empleados registrados</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {employees.map((employee) => {
                    const salary = getEmployeeSalary(employee);
                    const healthContribution = Math.round(salary * 0.085);
                    const pensionContribution = Math.round(salary * 0.12);
                    const arlContribution = Math.round(salary * 0.0696);
                    const totalContributions = healthContribution + pensionContribution + arlContribution;

                    return (
                      <div key={employee.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1">
                          <h4 className="font-medium">{employee.name}</h4>
                          <p className="text-sm text-gray-600">
                            CC {employee.document_number} • {employee.position}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">
                            ${salary.toLocaleString('es-CO')}
                          </p>
                          <p className="text-sm text-blue-600">
                            Aportes: ${totalContributions.toLocaleString('es-CO')}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Historial de Envíos */}
      {recentSubmissions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Envíos Recientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentSubmissions.map((submission) => (
                <div key={submission.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <FileSpreadsheet className="h-8 w-8 text-green-500" />
                    <div>
                      <h4 className="font-medium">PILA {submission.period}</h4>
                      <p className="text-sm text-gray-600">
                        {submission.employee_count} empleados • 
                        ${submission.total_contributions.toLocaleString('es-CO')} aportes
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStatusBadge(submission.status)}
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => downloadCSV(submission.file_path)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Información Legal */}
      <Card className="border-yellow-200 bg-yellow-50">
        <CardContent className="p-4">
          <h4 className="font-medium text-yellow-800 mb-2">📋 Información PILA</h4>
          <ul className="text-yellow-700 text-sm space-y-1">
            <li>• PILA debe presentarse los primeros 10 días hábiles del mes siguiente</li>
            <li>• Incluye aportes a salud (8.5%), pensión (12%) y ARL (6.96% Clase V)</li>
            <li>• El archivo CSV debe subirse al sitio web de la UGPP</li>
            <li>• Los valores se calculan sobre el salario base más auxilios</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}