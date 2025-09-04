'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/finance';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar,
  DollarSign,
  Clock,
  Check,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, isPast, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import type { CalendarEvent, PaymentCategory } from '@/lib/api/types';
import { toast } from 'sonner';

interface CalendarViewProps {
  onReminderClick?: (reminder: CalendarEvent) => void;
}

export function CalendarView({ onReminderClick }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Load calendar events for current month
  useEffect(() => {
    const loadEvents = async () => {
      setLoading(true);
      try {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth() + 1;
        const eventsData = await api.calendar.getEventsByMonth(year, month);
        
        // Handle both direct array response and {data: array} response
        const events = Array.isArray(eventsData) ? eventsData : 
                      (eventsData?.data && Array.isArray(eventsData.data) ? eventsData.data : []);
        
        setEvents(events);
        
        // Show info if no events found
        if (events.length === 0) {
          console.info(`No events found for ${year}-${month.toString().padStart(2, '0')}`);
        }
      } catch (error) {
        console.error('Error loading calendar events:', error);
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
        toast.error(`Error al cargar eventos: ${errorMessage}`);
        setEvents([]);
      } finally {
        setLoading(false);
      }
    };

    loadEvents();
  }, [currentDate]);
  
  // Get calendar dates
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = new Date(monthStart);
  calendarStart.setDate(calendarStart.getDate() - monthStart.getDay()); // Start from Sunday
  const calendarEnd = new Date(monthEnd);
  calendarEnd.setDate(calendarEnd.getDate() + (6 - monthEnd.getDay())); // End on Saturday
  
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  
  // Group events by date
  const eventsByDate = new Map<string, CalendarEvent[]>();
  events.forEach(event => {
    try {
      // Convert ISO date to YYYY-MM-DD format to match calendar keys
      const eventDate = parseISO(event.event_date);
      const dateKey = format(eventDate, 'yyyy-MM-dd');
      if (!eventsByDate.has(dateKey)) {
        eventsByDate.set(dateKey, []);
      }
      eventsByDate.get(dateKey)!.push(event);
    } catch (error) {
      console.warn('Invalid date format for event:', event.event_date, error);
    }
  });

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(current => 
      direction === 'prev' ? subMonths(current, 1) : addMonths(current, 1)
    );
  };

  const markAsCompleted = async (event: CalendarEvent, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.calendar.markEventCompleted(event.id);
      toast.success('Evento marcado como completado');
      // Reload events
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      const eventsData = await api.calendar.getEventsByMonth(year, month);
      
      // Handle both direct array response and {data: array} response
      const events = Array.isArray(eventsData) ? eventsData : 
                    (eventsData?.data && Array.isArray(eventsData.data) ? eventsData.data : []);
      
      setEvents(events);
    } catch (error) {
      console.error('Error marking event as completed:', error);
      toast.error('Error al marcar el evento como completado');
    }
  };

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

  const getCategoryIcon = (category: PaymentCategory) => {
    const icons = {
      tax: '📊',
      insurance: '🛡️',
      permit: '📋',
      equipment: '🔧',
      other: '📌',
    };
    return icons[category];
  };

  const getTypeIcon = (type: CalendarEvent['type']) => {
    const icons = {
      payroll: '💰',
      project: '🏗️',
      reminder: '⏰',
      payment: '💳',
    };
    return icons[type];
  };

  const getTypeColor = (type: CalendarEvent['type']) => {
    const colors = {
      payroll: 'bg-green-100 text-green-800',
      project: 'bg-blue-100 text-blue-800', 
      reminder: 'bg-yellow-100 text-yellow-800',
      payment: 'bg-purple-100 text-purple-800',
    };
    return colors[type];
  };

  return (
    <div className="space-y-6">
      {/* Calendar Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h2 className="text-2xl font-bold">
            {format(currentDate, 'MMMM yyyy', { locale: es })}
          </h2>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={() => navigateMonth('prev')}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setCurrentDate(new Date())}
          >
            Hoy
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigateMonth('next')}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <Card>
        <CardContent className="p-0">
          {/* Days of week header */}
          <div className="grid grid-cols-7 border-b">
            {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(day => (
              <div key={day} className="p-3 text-center text-sm font-medium text-gray-500 bg-gray-50">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar days */}
          <div className="grid grid-cols-7">
            {calendarDays.map((day, index) => {
              const dayKey = format(day, 'yyyy-MM-dd');
              const dayEvents = eventsByDate.get(dayKey) ?? [];
              const isCurrentMonth = isSameMonth(day, currentDate);
              const isDayToday = isToday(day);
              const isDayPast = isPast(day) && !isDayToday;

              return (
                <div
                  key={day.toISOString()}
                  className={`
                    min-h-[120px] border-r border-b p-2 
                    ${isCurrentMonth ? 'bg-white' : 'bg-gray-50'}
                    ${isDayToday ? 'bg-amber-50' : ''}
                    ${loading ? 'opacity-50' : ''}
                  `}
                >
                  {/* Day number */}
                  <div className="flex items-center justify-between mb-1">
                    <span className={`
                      text-sm font-medium
                      ${!isCurrentMonth ? 'text-gray-400' : 
                        isDayToday ? 'text-amber-600 font-bold' : 'text-gray-900'}
                    `}>
                      {format(day, 'd')}
                    </span>
                    {isDayToday && (
                      <div className="w-2 h-2 bg-amber-500 rounded-full" />
                    )}
                  </div>

                  {/* Events for this day */}
                  <div className="space-y-1">
                    {loading && (
                      <div className="flex items-center justify-center p-2">
                        <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                      </div>
                    )}
                    {!loading && dayEvents.slice(0, 3).map(event => (
                      <div
                        key={event.id}
                        onClick={() => onReminderClick?.(event)}
                        className={`
                          text-xs p-1 rounded cursor-pointer hover:opacity-80 transition-opacity
                          ${event.is_completed 
                            ? 'bg-green-100 text-green-700 line-through' 
                            : event.category ? getCategoryColor(event.category) : getTypeColor(event.type)
                          }
                          ${isDayPast && !event.is_completed ? 'bg-red-100 text-red-700' : ''}
                        `}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-1 truncate">
                            <span>{event.category ? getCategoryIcon(event.category) : getTypeIcon(event.type)}</span>
                            <span className="truncate">{event.title}</span>
                          </div>
                          {!event.is_completed && (
                            <button
                              onClick={(e) => markAsCompleted(event, e)}
                              className="hover:bg-white hover:bg-opacity-50 rounded p-0.5"
                              title="Marcar como completado"
                            >
                              <Check className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                        {event.amount && (
                          <div className="text-xs font-medium mt-0.5">
                            {formatCurrency(event.amount)}
                          </div>
                        )}
                      </div>
                    ))}
                    
                    {/* Show "X more" if there are more events */}
                    {!loading && dayEvents.length > 3 && (
                      <div className="text-xs text-gray-500 font-medium">
                        +{dayEvents.length - 3} más
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Info Section - Show when no events */}
      {events.length === 0 && !loading && (
        <Card className="bg-muted/30">
          <CardContent className="p-6 text-center">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No hay eventos este mes
            </h3>
            <p className="text-muted-foreground">
              No se encontraron eventos para {format(currentDate, 'MMMM yyyy', { locale: es })}.
              Los eventos incluyen recordatorios de nómina, fechas de proyecto y pagos programados.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Legend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Leyenda</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-green-100 rounded-sm flex items-center justify-center">
                <span className="text-xs">💰</span>
              </div>
              <span className="text-xs font-medium">Nómina</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-blue-100 rounded-sm flex items-center justify-center">
                <span className="text-xs">🏗️</span>
              </div>
              <span className="text-xs font-medium">Proyectos</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-yellow-100 rounded-sm flex items-center justify-center">
                <span className="text-xs">⏰</span>
              </div>
              <span className="text-xs font-medium">Recordatorios</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-purple-100 rounded-sm flex items-center justify-center">
                <span className="text-xs">💳</span>
              </div>
              <span className="text-xs font-medium">Pagos</span>
            </div>
          </div>
          {events.length > 0 && (
            <div className="mt-4 pt-3 border-t text-center">
              <p className="text-xs text-muted-foreground">
                Total de eventos este mes: <strong>{events.length}</strong>
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}