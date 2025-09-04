'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { api, handleApiError } from '@/lib/api';
import { formatCurrency } from '@/lib/finance';
import { 
  Calendar,
  AlertTriangle,
  Clock,
  ArrowRight,
  DollarSign,
  Loader2
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import type { CalendarEvent, PaymentCategory } from '@/lib/api/types';
import { toast } from 'sonner';

export function UpcomingPaymentsCard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allReminders, setAllReminders] = useState<CalendarEvent[]>([]);
  const [upcomingCount, setUpcomingCount] = useState(0);
  const [overdueCount, setOverdueCount] = useState(0);
  const [totalUpcoming, setTotalUpcoming] = useState(0);

  // Cargar datos desde la API
  useEffect(() => {
    const loadPaymentReminders = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Obtener eventos de pago próximos (7 días)
        const response = await api.calendar.getUpcomingPayments(7);
        
        // Verificar que la respuesta sea un array o contenga un array
        let upcomingEvents: CalendarEvent[] = [];
        
        if (Array.isArray(response)) {
          upcomingEvents = response;
        } else if (response && Array.isArray(response.data)) {
          upcomingEvents = response.data;
        } else {
          console.log('API response:', response);
          // Si no hay datos válidos, usar array vacío (sin error)
          upcomingEvents = [];
        }
        
        // Filtrar solo eventos de tipo payment o reminder con categoría de pago
        const paymentEvents = upcomingEvents.filter(event => 
          event.type === 'payment' || (event.type === 'reminder' && event.category)
        );
        
        // Separar eventos vencidos y próximos
        const now = new Date();
        const upcoming = paymentEvents.filter(event => 
          differenceInDays(new Date(event.event_date), now) >= 0
        );
        const overdue = paymentEvents.filter(event => 
          differenceInDays(new Date(event.event_date), now) < 0
        );
        
        // Combinar y limitar a 4 elementos para el display
        const combined = [...overdue, ...upcoming].slice(0, 4);
        
        // Calcular totales
        const upcomingTotal = upcoming.reduce((sum, event) => 
          sum + (event.amount || 0), 0
        );
        
        setAllReminders(combined);
        setUpcomingCount(upcoming.length);
        setOverdueCount(overdue.length);
        setTotalUpcoming(upcomingTotal);
        
      } catch (err) {
        console.error('Error loading payment reminders:', err);
        const errorMessage = handleApiError(err);
        setError(errorMessage);
        toast.error('Error cargando recordatorios de pago: ' + errorMessage);
      } finally {
        setLoading(false);
      }
    };

    loadPaymentReminders();
  }, []);

  const getCategoryColor = (category: PaymentCategory) => {
    const colors = {
      tax: 'bg-red-100 text-red-800',
      insurance: 'bg-blue-100 text-blue-800',
      permit: 'bg-yellow-100 text-yellow-800',
      equipment: 'bg-green-100 text-green-800',
      other: 'bg-gray-100 text-gray-800',
    };
    return colors[category];
  };

  const getUrgencyColor = (dueDate: string) => {
    const days = differenceInDays(new Date(dueDate), new Date());
    if (days < 0) return 'text-red-600';
    if (days === 0) return 'text-orange-600';
    if (days <= 3) return 'text-yellow-600';
    return 'text-gray-600';
  };

  const getUrgencyLabel = (dueDate: string) => {
    const days = differenceInDays(new Date(dueDate), new Date());
    if (days < 0) return `Vencido`;
    if (days === 0) return 'Hoy';
    if (days === 1) return 'Mañana';
    return `${days} días`;
  };

  // Estados de loading y error
  if (loading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base font-medium">
            Próximos Pagos
          </CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">
              Cargando pagos...
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base font-medium">
            Próximos Pagos
          </CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-3" />
            <p className="text-red-600 text-sm mb-2">Error cargando pagos</p>
            <p className="text-gray-500 text-xs">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-medium">
          Próximos Pagos
        </CardTitle>
        <Calendar className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {/* Summary */}
        <div className="flex items-center justify-between mb-4">
          <div>
            {overdueCount > 0 && (
              <div className="flex items-center space-x-1 text-red-600 mb-1">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm font-medium">
                  {overdueCount} vencido{overdueCount > 1 ? 's' : ''}
                </span>
              </div>
            )}
            <div className="flex items-center space-x-1 text-gray-600">
              <Clock className="h-4 w-4" />
              <span className="text-sm">
                {upcomingCount} próximo{upcomingCount > 1 ? 's' : ''}
              </span>
            </div>
          </div>
          {totalUpcoming > 0 && (
            <div className="text-right">
              <p className="text-sm text-gray-600">Estimado:</p>
              <p className="font-semibold">{formatCurrency(totalUpcoming)}</p>
            </div>
          )}
        </div>

        {/* Reminder List */}
        {allReminders.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">
              No hay pagos programados
            </p>
          </div>
        ) : (
          <div className="space-y-3 mb-4">
            {allReminders.map(reminder => {
              const isOverdue = differenceInDays(new Date(reminder.event_date), new Date()) < 0;
              
              return (
                <div key={reminder.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {reminder.title}
                      </p>
                      {isOverdue && <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />}
                    </div>
                    <div className="flex items-center space-x-2">
                      {reminder.category && (
                        <Badge 
                          className={`${getCategoryColor(reminder.category)} text-xs`}
                        >
                          {reminder.category === 'tax' ? 'Impuesto' :
                           reminder.category === 'insurance' ? 'Seguro' :
                           reminder.category === 'permit' ? 'Permiso' :
                           reminder.category === 'equipment' ? 'Equipo' : 'Otro'}
                        </Badge>
                      )}
                      <span className={`text-xs font-medium ${getUrgencyColor(reminder.event_date)}`}>
                        {getUrgencyLabel(reminder.event_date)}
                      </span>
                    </div>
                    {reminder.amount && (
                      <p className="text-xs text-gray-600 mt-1">
                        {formatCurrency(reminder.amount)}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Action Button */}
        <Link href="/calendar">
          <Button variant="outline" className="w-full">
            Ver todos los pagos
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}