'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useTranslations } from '@/lib/i18n';
import { personnelService } from '@/lib/api/personnel';
import { projectsService } from '@/lib/api/projects';
import type { Personnel, CreatePersonnelRequest, Project } from '@/lib/api/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Loader2, X } from 'lucide-react';

const personnelSchema = z.object({
  // Basic Information
  name: z.string().min(1, 'El nombre es requerido'),
  document_type: z.enum(['CC', 'CE', 'TI', 'PP']).default('CC'),
  document_number: z.string().min(1, 'El número de documento es requerido'),
  phone: z.string().optional(),
  email: z.string().email('Email inválido').or(z.literal('')).optional(),
  address: z.string().optional(),
  emergency_contact: z.string().optional(),
  emergency_phone: z.string().optional(),
  
  // Employment Information
  position: z.string().min(1, 'El cargo es requerido'),
  department: z.string().min(1, 'El departamento es requerido'),
  hire_date: z.string().min(1, 'La fecha de contratación es requerida'),
  status: z.enum(['active', 'inactive', 'on_leave', 'terminated']).default('active'),
  
  // Financial Information
  salary_type: z.enum(['hourly', 'monthly']).default('hourly'),
  hourly_rate: z.number().optional(),
  monthly_salary: z.number().optional(),
  arl_risk_class: z.enum(['I', 'II', 'III', 'IV', 'V']).default('V'),
  
  // Additional Information
  bank_account: z.string().optional(),
});

type PersonnelFormData = z.infer<typeof personnelSchema>;

interface PersonnelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  personnel?: Personnel | null;
  onSuccess?: () => void;
}

export function PersonnelDialog({ 
  open, 
  onOpenChange, 
  personnel, 
  onSuccess 
}: PersonnelDialogProps) {
  const t = useTranslations('es');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('basicInfo');
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);

  const form = useForm<PersonnelFormData>({
    resolver: zodResolver(personnelSchema),
    defaultValues: {
      name: '',
      document_type: 'CC',
      document_number: '',
      phone: '',
      email: '',
      address: '',
      emergency_contact: '',
      emergency_phone: '',
      position: '',
      department: 'construccion',
      hire_date: new Date().toISOString().split('T')[0],
      status: 'active',
      salary_type: 'hourly',
      hourly_rate: 25000, // Default COP hourly rate
      monthly_salary: undefined,
      arl_risk_class: 'V', // Construction/welding risk class
      bank_account: '',
    },
  });

  // Load active projects for assignment
  const loadProjects = async () => {
    try {
      setLoadingProjects(true);
      const projectData = await projectsService.getAll();
      // Handle both direct array response and {data: array} response
      const projects = Array.isArray(projectData) ? projectData : 
                      (Array.isArray(projectData?.data) ? projectData.data : []);
      const activeProjects = projects.filter(p => p.status === 'in_progress' || p.status === 'planned');
      setProjects(activeProjects);
    } catch (error) {
      console.error('Error loading projects:', error);
      setProjects([]); // Ensure projects is always an array even on error
    } finally {
      setLoadingProjects(false);
    }
  };

  // Load projects when dialog opens
  useEffect(() => {
    if (open) {
      loadProjects();
    }
  }, [open]);

  // Reset form when personnel changes
  useEffect(() => {
    if (personnel) {
      form.reset({
        name: personnel.name || '',
        document_type: personnel.document_type || 'CC',
        document_number: personnel.document_number || '',
        phone: personnel.phone || '',
        email: personnel.email || '',
        address: personnel.address || '',
        emergency_contact: personnel.emergency_contact || '',
        emergency_phone: personnel.emergency_phone || '',
        position: personnel.position || '',
        department: personnel.department || 'construccion',
        hire_date: personnel.hire_date || new Date().toISOString().split('T')[0],
        status: personnel.status || 'active',
        salary_type: personnel.salary_type || 'hourly',
        hourly_rate: personnel.hourly_rate,
        monthly_salary: personnel.monthly_salary,
        arl_risk_class: personnel.arl_risk_class || 'V',
        bank_account: personnel.bank_account || '',
      });
    } else {
      form.reset({
        name: '',
        document_type: 'CC',
        document_number: '',
        phone: '',
        email: '',
        address: '',
        emergency_contact: '',
        emergency_phone: '',
        position: '',
        department: 'construccion',
        hire_date: new Date().toISOString().split('T')[0],
        status: 'active',
        salary_type: 'hourly',
        hourly_rate: 25000,
        monthly_salary: undefined,
        arl_risk_class: 'V',
        bank_account: '',
      });
    }
  }, [personnel, form]);

  const onSubmit = async (data: PersonnelFormData) => {
    // Prevenir doble submit
    if (loading) return;
    
    setLoading(true);
    try {
      const requestData: CreatePersonnelRequest = {
        name: data.name,
        document_type: data.document_type,
        document_number: data.document_number,
        phone: data.phone || '',
        email: data.email || '',
        address: data.address || '',
        position: data.position,
        department: data.department,
        hire_date: data.hire_date,
        status: data.status,
        salary_type: data.salary_type,
        hourly_rate: data.hourly_rate,
        monthly_salary: data.monthly_salary,
        arl_risk_class: data.arl_risk_class,
        emergency_contact: data.emergency_contact || '',
        emergency_phone: data.emergency_phone || '',
        bank_account: data.bank_account || '',
      };

      if (personnel?.id) {
        await personnelService.update(personnel.id, requestData);
        toast.success(`Empleado ${data.name} actualizado exitosamente`);
      } else {
        await personnelService.create(requestData);
        toast.success(`Empleado ${data.name} creado exitosamente`);
      }
      
      onSuccess?.();
      onOpenChange(false);
    } catch (error: unknown) {
      console.error('Error saving personnel:', error);
      const errorMessage = (error instanceof Error ? error.message : String(error)) || 'Error desconocido al guardar empleado';
      toast.error(`Error al ${personnel?.id ? 'actualizar' : 'crear'} empleado: ${errorMessage}`);
    } finally {
      // Timeout para asegurar que loading se limpia incluso si hay errores inesperados
      setTimeout(() => setLoading(false), 100);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {personnel ? 'Editar Empleado' : 'Nuevo Empleado'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="basicInfo">Información Personal</TabsTrigger>
                <TabsTrigger value="employment">Información Laboral</TabsTrigger>
                <TabsTrigger value="financial">Información Financiera</TabsTrigger>
              </TabsList>

              <TabsContent value="basicInfo" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre Completo *</FormLabel>
                        <FormControl>
                          <Input placeholder="Nombre completo del empleado" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="document_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo de Documento *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar tipo" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="CC">Cédula de Ciudadanía</SelectItem>
                            <SelectItem value="CE">Cédula de Extranjería</SelectItem>
                            <SelectItem value="TI">Tarjeta de Identidad</SelectItem>
                            <SelectItem value="PP">Pasaporte</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="document_number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Número de Documento *</FormLabel>
                        <FormControl>
                          <Input placeholder="Ej: 12345678" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Teléfono</FormLabel>
                        <FormControl>
                          <Input placeholder="+57 300 123 4567" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="correo@ejemplo.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Dirección</FormLabel>
                        <FormControl>
                          <Input placeholder="Dirección completa" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="emergency_contact"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contacto de Emergencia</FormLabel>
                        <FormControl>
                          <Input placeholder="Nombre del contacto de emergencia" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="emergency_phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Teléfono de Emergencia</FormLabel>
                        <FormControl>
                          <Input placeholder="+57 300 123 4567" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>

              <TabsContent value="employment" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="position"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cargo *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar cargo" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="soldador">Soldador</SelectItem>
                            <SelectItem value="operario">Operario</SelectItem>
                            <SelectItem value="supervisor">Supervisor</SelectItem>
                            <SelectItem value="ayudante">Ayudante</SelectItem>
                            <SelectItem value="administrador">Administrador</SelectItem>
                            <SelectItem value="tecnico">Técnico</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="department"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Departamento *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar departamento" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="construccion">Construcción</SelectItem>
                            <SelectItem value="soldadura">Soldadura</SelectItem>
                            <SelectItem value="administracion">Administración</SelectItem>
                            <SelectItem value="maintenance">Mantenimiento</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="hire_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fecha de Contratación *</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Estado *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar estado" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="active">Activo</SelectItem>
                            <SelectItem value="on_leave">En Licencia</SelectItem>
                            <SelectItem value="inactive">Inactivo</SelectItem>
                            <SelectItem value="terminated">Terminado</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="arl_risk_class"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Clase de Riesgo ARL *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar clase" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="I">Clase I - Administrativo</SelectItem>
                            <SelectItem value="II">Clase II - Comercial</SelectItem>
                            <SelectItem value="III">Clase III - Industrial</SelectItem>
                            <SelectItem value="IV">Clase IV - Construcción Liviana</SelectItem>
                            <SelectItem value="V">Clase V - Construcción/Soldadura</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="bank_account"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cuenta Bancaria</FormLabel>
                        <FormControl>
                          <Input placeholder="Número de cuenta bancaria" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>

              <TabsContent value="financial" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="salary_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo de Salario *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar tipo" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="hourly">Por Horas</SelectItem>
                            <SelectItem value="monthly">Mensual Fijo</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {form.watch('salary_type') === 'hourly' ? (
                    <FormField
                      control={form.control}
                      name="hourly_rate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tarifa por Hora (COP) *</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="25000"
                              {...field}
                              onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ) : (
                    <FormField
                      control={form.control}
                      name="monthly_salary"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Salario Mensual (COP) *</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="1500000"
                              {...field}
                              onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>

                {/* Salary Calculation Preview */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-medium mb-2">Cálculo Estimado de Nómina</h3>
                  <div className="text-sm text-gray-600 space-y-1">
                    {form.watch('salary_type') === 'hourly' && form.watch('hourly_rate') ? (
                      <>
                        <div>Salario base mensual (192h): ${((form.watch('hourly_rate') || 0) * 192).toLocaleString()} COP</div>
                        <div>Factor prestacional (58%): ${(((form.watch('hourly_rate') || 0) * 192) * 0.58).toLocaleString()} COP</div>
                        <div className="font-medium">Costo total empresa: ${(((form.watch('hourly_rate') || 0) * 192) * 1.58).toLocaleString()} COP</div>
                        <div className="text-xs text-blue-600 mt-2">
                          ✓ Compatible con procesamiento nómina 2025 (FSP, Law 114-1, ARL)
                        </div>
                      </>
                    ) : form.watch('monthly_salary') ? (
                      <>
                        <div>Salario base mensual: ${(form.watch('monthly_salary') || 0).toLocaleString()} COP</div>
                        <div>Factor prestacional (58%): ${((form.watch('monthly_salary') || 0) * 0.58).toLocaleString()} COP</div>
                        <div className="font-medium">Costo total empresa: ${((form.watch('monthly_salary') || 0) * 1.58).toLocaleString()} COP</div>
                        <div className="text-xs text-blue-600 mt-2">
                          ✓ Compatible con procesamiento nómina 2025 (FSP, Law 114-1, ARL)
                        </div>
                      </>
                    ) : (
                      <div>Ingrese la información salarial para ver el cálculo</div>
                    )}
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end space-x-2 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {loading 
                  ? (personnel?.id ? 'Actualizando...' : 'Creando...')
                  : (personnel?.id ? 'Actualizar Empleado' : 'Crear Empleado')
                }
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}