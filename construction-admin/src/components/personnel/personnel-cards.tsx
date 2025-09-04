'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from '@/lib/i18n';
import { formatCurrency } from '@/lib/finance';
import { personnelService } from '@/lib/api/personnel';
import type { Personnel } from '@/lib/api/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  MoreHorizontal,
  Edit,
  Trash2,
  UserCheck,
  UserX,
  Phone,
  Mail,
  MapPin,
  Calendar,
  DollarSign,
  Loader2,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PersonnelDialog } from './personnel-dialog';
import { UndoToast } from '@/components/ui/undo-toast';

interface PersonnelCardsProps {
  personnel?: Personnel[];
  loading?: boolean;
  onRefresh?: () => void;
  searchTerm?: string;
  statusFilter?: string;
  departmentFilter?: string;
  onEdit?: (person: Personnel) => void;
}

export function PersonnelCards({ 
  personnel = [],
  loading = false,
  onRefresh,
  searchTerm = '',
  statusFilter = 'all', 
  departmentFilter = 'all',
  onEdit 
}: PersonnelCardsProps) {
  const t = useTranslations('es');
  const [editingPersonnel, setEditingPersonnel] = useState<Personnel | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

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

  const handleEdit = (person: Personnel) => {
    setEditingPersonnel(person);
    setShowEditDialog(true);
    onEdit?.(person);
  };

  const handleDelete = async (person: Personnel) => {
    if (!person.id) return;
    
    try {
      setActionLoading(person.id);
      
      await personnelService.delete(person.id);
      
      // Show undo toast
      UndoToast({
        message: `Empleado ${person.name} eliminado`,
        action: async () => {
          // Re-create the employee
          await personnelService.create({
            name: person.name,
            document_type: person.document_type || 'CC',
            document_number: person.document_number || '',
            phone: person.phone || '',
            email: person.email || '',
            address: person.address || '',
            position: person.position || '',
            department: person.department || 'construccion',
            hire_date: person.hire_date || new Date().toISOString().split('T')[0],
            status: person.status || 'active',
            salary_type: person.salary_type || 'hourly',
            hourly_rate: person.hourly_rate,
            monthly_salary: person.monthly_salary,
            arl_risk_class: person.arl_risk_class || 'V',
            emergency_contact: person.emergency_contact || '',
            emergency_phone: person.emergency_phone || '',
            bank_account: person.bank_account || '',
          });
          onRefresh?.();
        },
      });
      
      onRefresh?.();
    } catch (error) {
      console.error('Error deleting personnel:', error);
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
      case 'construccion': return 'bg-blue-100 text-blue-800';
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

  // Loading state
  if (loading && personnel.length === 0) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="h-3 bg-gray-200 rounded w-full"></div>
              <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Empty state
  if (filteredPersonnel.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-gray-500">
          <UserX className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p className="text-lg font-medium mb-2">No se encontraron empleados</p>
          <p>
            {searchTerm || statusFilter !== 'all' || departmentFilter !== 'all' 
              ? 'No hay empleados que coincidan con los filtros actuales'
              : 'No hay empleados registrados aún'
            }
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredPersonnel.map((person) => (
          <Card key={person.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-lg font-semibold truncate">
                    {person.name}
                  </CardTitle>
                  <p className="text-sm text-gray-600 mt-1">
                    {formatPosition(person.position || '')}
                  </p>
                  {person.document_number && (
                    <p className="text-xs text-gray-500 mt-1">
                      {person.document_type || 'CC'} {person.document_number}
                    </p>
                  )}
                </div>
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
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleEdit(person)}>
                      <Edit className="mr-2 h-4 w-4" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => handleDelete(person)}
                      className="text-red-600"
                      disabled={actionLoading === person.id}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Eliminar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="flex space-x-2 mt-3">
                <Badge className={getDepartmentColor(person.department || '')}>
                  {formatDepartment(person.department || '')}
                </Badge>
                <Badge className={getStatusColor(person.status || '')}>
                  {formatStatus(person.status || '')}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-3">
              {/* Financial Information */}
              <div className="flex items-center space-x-2 text-sm">
                <DollarSign className="h-4 w-4 text-green-600" />
                <div>
                  {person.hourly_rate ? (
                    <span className="font-medium">{formatCurrency(person.hourly_rate)}/hora</span>
                  ) : person.monthly_salary ? (
                    <span className="font-medium">{formatCurrency(person.monthly_salary)}/mes</span>
                  ) : (
                    <span className="text-gray-400">No definida</span>
                  )}
                </div>
              </div>

              {/* Assignment Status */}
              {person.status === 'active' && (
                <div className="bg-green-50 p-3 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <UserCheck className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-green-800">
                      Disponible
                    </span>
                  </div>
                  <p className="text-xs text-green-600 mt-1">
                    Listo para asignar a proyecto
                  </p>
                </div>
              )}

              {/* Contact Information */}
              <div className="space-y-2">
                {person.phone && (
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <Phone className="h-4 w-4" />
                    <span>{person.phone}</span>
                  </div>
                )}
                {person.email && (
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <Mail className="h-4 w-4" />
                    <span className="truncate">{person.email}</span>
                  </div>
                )}
                {person.address && (
                  <div className="flex items-start space-x-2 text-sm text-gray-600">
                    <MapPin className="h-4 w-4 mt-0.5" />
                    <span className="text-xs">{person.address}</span>
                  </div>
                )}
                {person.hire_date && (
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <Calendar className="h-4 w-4" />
                    <span>
                      Desde {new Date(person.hire_date).toLocaleDateString('es-ES')}
                    </span>
                  </div>
                )}
              </div>

              {/* ARL Risk Class */}
              {person.arl_risk_class && (
                <div className="pt-2 border-t">
                  <p className="text-xs font-medium text-gray-700 mb-1">Clase ARL:</p>
                  <Badge variant="outline" className="text-xs">
                    Clase {person.arl_risk_class} - {
                      person.arl_risk_class === 'V' ? 'Construcción/Soldadura' :
                      person.arl_risk_class === 'IV' ? 'Construcción Liviana' :
                      person.arl_risk_class === 'III' ? 'Industrial' :
                      person.arl_risk_class === 'II' ? 'Comercial' :
                      'Administrativo'
                    }
                  </Badge>
                </div>
              )}

              {/* Emergency Contact */}
              {person.emergency_contact && (
                <div className="pt-2 border-t">
                  <p className="text-xs font-medium text-gray-700">Contacto de Emergencia:</p>
                  <p className="text-xs text-gray-600">
                    {person.emergency_contact}
                    {person.emergency_phone && ` • ${person.emergency_phone}`}
                  </p>
                </div>
              )}

              {/* Monthly Cost Estimate with Colombian Benefits */}
              <div className="pt-2 border-t">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Costo mensual estimado:</span>
                  <span className="font-semibold text-blue-600">
                    {person.hourly_rate 
                      ? formatCurrency(person.hourly_rate * 192 * 1.58) // 192 horas mensuales * factor prestacional
                      : person.monthly_salary
                        ? formatCurrency(person.monthly_salary * 1.58)
                        : 'N/A'
                    }
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {person.hourly_rate 
                    ? 'Incluye factor prestacional 58% (192h/mes)'
                    : person.monthly_salary
                      ? 'Incluye factor prestacional 58%'
                      : 'Información salarial no disponible'
                  }
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

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
    </>
  );
}