'use client';

import { useState, useMemo, useEffect } from 'react';
import { useTranslations } from '@/lib/i18n';
import { formatCurrency, safeNumber } from '@/lib/finance';
import { personnelService } from '@/lib/api/personnel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  MoreHorizontal,
  Search,
  Edit,
  Trash2,
  UserCheck,
  UserX,
  UserMinus,
  Users,
  AlertTriangle,
  Phone,
  Mail,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PersonnelDialog } from './personnel-dialog';
import { PersonnelAssignmentDialog } from './personnel-assignment-dialog';
import { toast } from 'sonner';
import { usePersonnelAssignments } from '@/lib/hooks/usePersonnelAssignments';
import type { Personnel, PersonnelStatus, PersonnelDepartment } from '@/lib/api/types';

interface PersonnelTableProps {
  personnel?: Personnel[];
  loading?: boolean;
  onRefresh?: () => void;
  searchTerm?: string;
  statusFilter?: string;
  departmentFilter?: string;
}

export function PersonnelTable({ 
  personnel = [],
  loading = false,
  onRefresh,
  searchTerm: externalSearchTerm = '',
  statusFilter: externalStatusFilter = 'all',
  departmentFilter: externalDepartmentFilter = 'all'
}: PersonnelTableProps) {
  const t = useTranslations('es');
  const [internalSearchTerm, setInternalSearchTerm] = useState('');
  const [internalStatusFilter, setInternalStatusFilter] = useState<string>('all');
  const [internalDepartmentFilter, setInternalDepartmentFilter] = useState<string>('all');
  const [editingPersonnel, setEditingPersonnel] = useState<Personnel | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showAssignmentDialog, setShowAssignmentDialog] = useState(false);
  const [selectedPersonnelForAssignment, setSelectedPersonnelForAssignment] = useState<Personnel | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  // Hook para asignaciones de empleados
  const { 
    assignmentsSummary, 
    stats: assignmentStats, 
    loading: assignmentsLoading,
    error: assignmentsError 
  } = usePersonnelAssignments(personnel);

  // Limpiar actionLoading después de 30 segundos en caso de error
  useEffect(() => {
    if (actionLoading) {
      const timeout = setTimeout(() => {
        console.warn('Action loading timeout - clearing state');
        setActionLoading(null);
      }, 30000);

      return () => clearTimeout(timeout);
    }
  }, [actionLoading]);

  // Use external filters if provided, otherwise use internal state
  const searchTerm = externalSearchTerm || internalSearchTerm;
  const statusFilter = externalStatusFilter !== 'all' ? externalStatusFilter : internalStatusFilter;
  const departmentFilter = externalDepartmentFilter !== 'all' ? externalDepartmentFilter : internalDepartmentFilter;

  // Filter personnel based on search and filters
  const filteredPersonnel = useMemo(() => {
    return personnel.filter((person) => {
      const matchesSearch = !searchTerm || (
        person.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        person.position?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        person.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        person.document_number?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      
      const matchesStatus = statusFilter === 'all' || person.status === statusFilter;
      const matchesDepartment = departmentFilter === 'all' || person.department === departmentFilter;
      
      return matchesSearch && matchesStatus && matchesDepartment;
    });
  }, [personnel, searchTerm, statusFilter, departmentFilter]);

  // Summary statistics
  const stats = useMemo(() => {
    const activePersonnel = personnel.filter(p => p.status === 'active');
    
    // Calculate average hourly rate only for employees with valid hourly_rate
    const personnelWithHourlyRate = activePersonnel.filter(p => safeNumber(p.hourly_rate) > 0);
    const averageHourlyRate = personnelWithHourlyRate.length > 0 
      ? personnelWithHourlyRate.reduce((sum, p) => sum + safeNumber(p.hourly_rate), 0) / personnelWithHourlyRate.length
      : 0;

    const totalMonthlyCost = activePersonnel.reduce((sum, p) => {
      const monthlySalary = safeNumber(p.monthly_salary);
      const hourlyRate = safeNumber(p.hourly_rate);
      const rate = monthlySalary || (hourlyRate * 192); // 192 horas mensuales
      return sum + rate * 1.58; // Factor prestacional
    }, 0);

    return {
      total: personnel.length,
      active: activePersonnel.length,
      assigned: assignmentStats.totalAssigned, // ✅ FIXED: Usar lógica real de asignaciones
      available: assignmentStats.totalAvailable,
      averageHourlyRate,
      totalMonthlyCost,
    };
  }, [personnel, assignmentStats]);

  const handleEdit = (person: Personnel) => {
    setEditingPersonnel(person);
    setShowEditDialog(true);
  };

  const handleManageAssignments = (person: Personnel) => {
    setSelectedPersonnelForAssignment(person);
    setShowAssignmentDialog(true);
  };

  const handleStatusChange = async (person: Personnel, newStatus: 'active' | 'inactive' | 'terminated') => {
    if (!person.id || person.status === newStatus) return;
    
    try {
      setActionLoading(person.id);
      
      await personnelService.updateStatus(person.id, newStatus);
      
      const statusMessages = {
        active: 'Empleado activado',
        inactive: 'Empleado desactivado',
        terminated: 'Empleado marcado como terminado'
      };
      
      toast.success(`${statusMessages[newStatus]}: ${person.name}`, {
        action: {
          label: 'Deshacer',
          onClick: async () => {
            try {
              await personnelService.updateStatus(person.id!, person.status);
              onRefresh?.();
              toast.success(`Estado restaurado para ${person.name}`);
            } catch (error: any) {
              console.error('Error restoring status:', error);
              toast.error('Error al restaurar estado: ' + (error?.message || 'Error desconocido'));
            }
          },
        },
        duration: 8000,
      });
      
      onRefresh?.();
    } catch (error: any) {
      console.error('Error changing status:', error);
      toast.error('Error al cambiar estado: ' + (error?.message || 'Error desconocido'));
    } finally {
      setActionLoading(null);
    }
  };

  const handlePermanentDelete = async (person: Personnel) => {
    if (!person.id) return;
    
    // Doble confirmación para eliminación permanente
    const confirmed = confirm(
      `⚠️ ELIMINACIÓN PERMANENTE\n\n` +
      `¿Está seguro de eliminar PERMANENTEMENTE a "${person.name}" de la base de datos?\n\n` +
      `Esta acción NO se puede deshacer y eliminará todos los datos del empleado.\n\n` +
      `Si solo desea desactivar al empleado, use "Cambiar Estado" en su lugar.`
    );
    
    if (!confirmed) return;
    
    // Segunda confirmación
    const doubleConfirmed = confirm(
      `⚠️ CONFIRME LA ELIMINACIÓN\n\n` +
      `Escriba "CONFIRMAR" en su mente y presione OK para eliminar PERMANENTEMENTE a ${person.name}.\n\n` +
      `¿Está completamente seguro?`
    );
    
    if (!doubleConfirmed) return;
    
    try {
      setActionLoading(person.id);
      
      await personnelService.delete(person.id);
      
      toast.success(`Empleado ${person.name} eliminado permanentemente de la base de datos`);
      onRefresh?.();
    } catch (error: any) {
      console.error('Error deleting personnel permanently:', error);
      const errorMessage = error?.message || 'Error desconocido';
      
      // Mostrar mensaje específico para empleados con registros
      if (errorMessage.includes('registros de horas') || errorMessage.includes('registros de nómina')) {
        toast.error(
          `No se puede eliminar a ${person.name}:\n${errorMessage}`,
          { duration: 8000 }
        );
      } else {
        toast.error('Error al eliminar empleado permanentemente: ' + errorMessage);
      }
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'on_leave': return 'bg-yellow-100 text-yellow-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'terminated': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getDepartmentColor = (department: string) => {
    switch (department) {
      case 'construction': return 'bg-blue-100 text-blue-800';
      case 'welding': return 'bg-orange-100 text-orange-800';
      case 'soldadura': return 'bg-orange-100 text-orange-800';
      case 'administration': return 'bg-purple-100 text-purple-800';
      case 'administracion': return 'bg-purple-100 text-purple-800';
      case 'maintenance': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDepartment = (department: string) => {
    const deptMap: Record<string, string> = {
      'construction': 'Construcción',
      'construccion': 'Construcción',
      'welding': 'Soldadura',
      'soldadura': 'Soldadura',
      'administration': 'Administración',
      'administracion': 'Administración',
      'maintenance': 'Mantenimiento',
    };
    return deptMap[department] || department;
  };

  const formatPosition = (position: string) => {
    const positionMap: Record<string, string> = {
      'welder': 'Soldador',
      'soldador': 'Soldador', 
      'operator': 'Operario',
      'operario': 'Operario',
      'supervisor': 'Supervisor',
      'administrator': 'Administrador',
      'administrador': 'Administrador',
      'helper': 'Ayudante',
      'ayudante': 'Ayudante',
    };
    return positionMap[position] || position;
  };

  const formatStatus = (status: string) => {
    const statusMap: Record<string, string> = {
      'active': 'Activo',
      'inactive': 'Inactivo',
      'on_leave': 'Licencia',
      'terminated': 'Terminado',
    };
    return statusMap[status] || status;
  };

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Empleados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Empleados Activos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Disponibles
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.available}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Tarifa Promedio/Hora
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.averageHourlyRate)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Costo Mensual Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(stats.totalMonthlyCost)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters - Only show if no external filters are provided */}
      {!externalSearchTerm && externalStatusFilter === 'all' && externalDepartmentFilter === 'all' && (
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <Input
              placeholder="Buscar empleados por nombre, cédula, cargo..."
              value={internalSearchTerm}
              onChange={(e) => setInternalSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={internalStatusFilter} onValueChange={setInternalStatusFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Todos los estados" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="active">Activo</SelectItem>
              <SelectItem value="on_leave">Licencia</SelectItem>
              <SelectItem value="inactive">Inactivo</SelectItem>
              <SelectItem value="terminated">Terminado</SelectItem>
            </SelectContent>
          </Select>

          <Select value={internalDepartmentFilter} onValueChange={setInternalDepartmentFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Todos los departamentos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los departamentos</SelectItem>
              <SelectItem value="construccion">Construcción</SelectItem>
              <SelectItem value="soldadura">Soldadura</SelectItem>
              <SelectItem value="administracion">Administración</SelectItem>
              <SelectItem value="maintenance">Mantenimiento</SelectItem>
            </SelectContent>
          </Select>

          {onRefresh && (
            <Button 
              onClick={onRefresh} 
              variant="outline" 
              disabled={loading}
              className="flex-shrink-0"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          )}
        </div>
      )}

      {/* Personnel Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empleado</TableHead>
                <TableHead>Cargo</TableHead>
                <TableHead>Departamento</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Asignaciones</TableHead>
                <TableHead>Tarifa</TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && personnel.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <div className="flex items-center justify-center">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Cargando empleados...
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredPersonnel.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                    {searchTerm || statusFilter !== 'all' || departmentFilter !== 'all' 
                      ? 'No se encontraron empleados con los filtros aplicados.'
                      : 'No hay empleados registrados.'
                    }
                  </TableCell>
                </TableRow>
              ) : (
                filteredPersonnel.map((person) => (
                  <TableRow key={person.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{person.name}</span>
                        <div className="text-xs text-gray-500 space-y-1">
                          {person.document_number && (
                            <div>CC {person.document_number}</div>
                          )}
                          {person.hire_date && (
                            <div>Desde {new Date(person.hire_date).toLocaleDateString('es-ES')}</div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="capitalize">
                        {formatPosition(person.position || '')}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge className={getDepartmentColor(person.department || '')}>
                        {formatDepartment(person.department || '')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(person.status || '')}>
                        {formatStatus(person.status || '')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {person.id && assignmentsSummary[person.id] ? (
                        <div className="flex flex-col space-y-1">
                          <div className="flex items-center space-x-2">
                            <Badge 
                              variant={assignmentsSummary[person.id].can_take_more_work ? "default" : "secondary"}
                              className={
                                assignmentsSummary[person.id].availability_status === 'sobrecargado' 
                                  ? 'bg-red-100 text-red-800'
                                  : assignmentsSummary[person.id].availability_status === 'ocupado'
                                  ? 'bg-yellow-100 text-yellow-800' 
                                  : 'bg-green-100 text-green-800'
                              }
                            >
                              {assignmentsSummary[person.id].total_projects} proyecto{assignmentsSummary[person.id].total_projects !== 1 ? 's' : ''}
                            </Badge>
                          </div>
                          <div className="text-xs text-gray-500">
                            {assignmentsSummary[person.id].total_hours_per_day}h/día • {
                              assignmentsSummary[person.id].availability_status === 'sobrecargado' ? 'Sobrecargado' :
                              assignmentsSummary[person.id].availability_status === 'ocupado' ? 'Ocupado' :
                              assignmentsSummary[person.id].availability_status === 'parcialmente_ocupado' ? 'Parcial' :
                              'Disponible'
                            }
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col">
                          <Badge variant="outline" className="bg-gray-50 text-gray-600">
                            Sin asignar
                          </Badge>
                          <div className="text-xs text-gray-500">
                            Disponible
                          </div>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        {person.hourly_rate ? (
                          <span className="font-medium">
                            {formatCurrency(person.hourly_rate)}/hora
                          </span>
                        ) : person.monthly_salary ? (
                          <span className="font-medium">
                            {formatCurrency(person.monthly_salary)}/mes
                          </span>
                        ) : (
                          <span className="text-gray-400">No definida</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        {person.phone && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 w-6 p-0"
                            onClick={() => window.open(`tel:${person.phone}`)}
                          >
                            <Phone className="h-3 w-3" />
                          </Button>
                        )}
                        {person.email && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 w-6 p-0"
                            onClick={() => window.open(`mailto:${person.email}`)}
                          >
                            <Mail className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0"
                            disabled={actionLoading === person.id}
                          >
                            {actionLoading === person.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <MoreHorizontal className="h-4 w-4" />
                            )}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onClick={() => handleEdit(person)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Editar Información
                          </DropdownMenuItem>
                          
                          <DropdownMenuItem onClick={() => handleManageAssignments(person)}>
                            <Users className="mr-2 h-4 w-4" />
                            Gestionar Asignaciones
                          </DropdownMenuItem>
                          
                          {/* Separador */}
                          <div className="border-t border-gray-100 my-1" />
                          
                          {/* Opciones de cambio de estado */}
                          {person.status !== 'active' && (
                            <DropdownMenuItem 
                              onClick={() => handleStatusChange(person, 'active')}
                              disabled={actionLoading === person.id}
                              className="text-green-600"
                            >
                              <UserCheck className="mr-2 h-4 w-4" />
                              Activar
                            </DropdownMenuItem>
                          )}
                          
                          {person.status !== 'inactive' && (
                            <DropdownMenuItem 
                              onClick={() => handleStatusChange(person, 'inactive')}
                              disabled={actionLoading === person.id}
                              className="text-yellow-600"
                            >
                              <UserX className="mr-2 h-4 w-4" />
                              Desactivar
                            </DropdownMenuItem>
                          )}
                          
                          {person.status !== 'terminated' && (
                            <DropdownMenuItem 
                              onClick={() => handleStatusChange(person, 'terminated')}
                              disabled={actionLoading === person.id}
                              className="text-orange-600"
                            >
                              <UserMinus className="mr-2 h-4 w-4" />
                              Marcar Terminado
                            </DropdownMenuItem>
                          )}
                          
                          {/* Separador */}
                          <div className="border-t border-gray-100 my-1" />
                          
                          {/* Eliminación permanente - solo para empleados sin registros */}
                          <DropdownMenuItem 
                            onClick={() => handlePermanentDelete(person)}
                            disabled={actionLoading === person.id}
                            className="text-red-600 focus:text-red-600 focus:bg-red-50"
                          >
                            <AlertTriangle className="mr-2 h-4 w-4" />
                            Eliminar Permanente
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <PersonnelDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        personnel={editingPersonnel}
        onSuccess={() => {
          setEditingPersonnel(null);
          setShowEditDialog(false);
          onRefresh?.();
        }}
      />

      {/* Assignment Dialog */}
      <PersonnelAssignmentDialog
        open={showAssignmentDialog}
        onOpenChange={setShowAssignmentDialog}
        personnel={selectedPersonnelForAssignment}
        onSuccess={() => {
          setSelectedPersonnelForAssignment(null);
          setShowAssignmentDialog(false);
          onRefresh?.();
        }}
      />
    </div>
  );
}