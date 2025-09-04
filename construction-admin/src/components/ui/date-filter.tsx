'use client';

import { useAppStore } from '@/store/app';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from 'lucide-react';
import type { DateFilter } from '@/store/app';

const dateFilterLabels: Record<DateFilter, string> = {
  'last_1m': 'Último mes',
  'last_3m': 'Últimos 3 meses',
  'last_6m': 'Últimos 6 meses',
  'last_1y': 'Último año',
  'all': 'Todo el tiempo',
};

export function DateFilterComponent() {
  const { dateFilter, setDateFilter } = useAppStore();

  return (
    <div className="flex items-center space-x-2">
      <Calendar className="h-4 w-4 text-gray-500" />
      <Select value={dateFilter} onValueChange={(value: DateFilter) => setDateFilter(value)}>
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Filtro de fechas" />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(dateFilterLabels).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}