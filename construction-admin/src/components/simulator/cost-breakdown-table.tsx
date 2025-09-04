'use client';

import React, { useState } from 'react';
import { 
  Edit2, 
  Trash2, 
  Plus, 
  Calculator,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTranslations } from '@/lib/i18n';
import { formatCurrency } from '@/lib/finance';
import type { CostEstimateItem } from '@/lib/pdf-generator';
import { calculateItemTotal } from '@/lib/cost-calculator';

export type CostItemType = 'material' | 'labor' | 'equipment' | 'overhead';

interface CostBreakdownTableProps {
  items: CostEstimateItem[];
  onUpdateItem: (index: number, updates: Partial<CostEstimateItem>) => void;
  onRemoveItem: (index: number) => void;
  onAddItem: () => void;
  profitMargin?: number;
  subtotal: number;
  total: number;
  currency?: string;
  editable?: boolean;
  showTotals?: boolean;
  groupByType?: boolean;
}

type GroupedItems = {
  [key in CostItemType]: CostEstimateItem[];
};

const itemTypeColors = {
  material: 'bg-blue-100 text-blue-800',
  labor: 'bg-green-100 text-green-800',
  equipment: 'bg-orange-100 text-orange-800',
  overhead: 'bg-purple-100 text-purple-800',
};

export function CostBreakdownTable({
  items,
  onUpdateItem,
  onRemoveItem,
  onAddItem,
  profitMargin = 0,
  subtotal,
  total,
  currency = 'COP',
  editable = true,
  showTotals = true,
  groupByType = false,
}: CostBreakdownTableProps) {
  const t = useTranslations('es');
  const [expandedGroups, setExpandedGroups] = useState<Record<CostItemType, boolean>>({
    material: true,
    labor: true,
    equipment: true,
    overhead: true,
  });

  const toggleGroup = (type: CostItemType) => {
    setExpandedGroups(prev => ({
      ...prev,
      [type]: !prev[type]
    }));
  };

  // Group items by type if requested
  const groupedItems: GroupedItems = items.reduce((acc, item) => {
    if (!acc[item.type]) {
      acc[item.type] = [];
    }
    acc[item.type].push(item);
    return acc;
  }, {} as GroupedItems);

  const getGroupTotal = (type: CostItemType): number => {
    return groupedItems[type]?.reduce((sum, item) => sum + item.total, 0) || 0;
  };

  const renderGroupHeader = (type: CostItemType, itemCount: number) => {
    const isExpanded = expandedGroups[type];
    const groupTotal = getGroupTotal(type);

    return (
      <TableRow className="bg-gray-50 hover:bg-gray-100">
        <TableCell colSpan={editable ? 7 : 6} className="font-medium">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleGroup(type)}
                className="h-6 w-6 p-0"
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
              <Badge className={itemTypeColors[type]}>
                {t.simulator.itemTypes[type]}
              </Badge>
              <span className="text-gray-600">({itemCount} elementos)</span>
            </div>
            <div className="font-bold">
              {formatCurrency(groupTotal, currency)}
            </div>
          </div>
        </TableCell>
      </TableRow>
    );
  };

  const renderItemRow = (item: CostEstimateItem, index: number, actualIndex: number) => (
    <TableRow key={item.id} className={groupByType ? "bg-white" : ""}>
      <TableCell className="font-medium">
        {editable ? (
          <Input
            value={item.name}
            onChange={(e) => onUpdateItem(actualIndex, { name: e.target.value })}
            placeholder="Nombre del elemento"
            className="border-0 shadow-none focus-visible:ring-0 p-0"
          />
        ) : (
          <span>{item.name}</span>
        )}
      </TableCell>
      
      <TableCell>
        {editable ? (
          <Select 
            value={item.type} 
            onValueChange={(value: CostItemType) => onUpdateItem(actualIndex, { type: value })}
          >
            <SelectTrigger className="border-0 shadow-none focus-visible:ring-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="material">{t.simulator.itemTypes.material}</SelectItem>
              <SelectItem value="labor">{t.simulator.itemTypes.labor}</SelectItem>
              <SelectItem value="equipment">{t.simulator.itemTypes.equipment}</SelectItem>
              <SelectItem value="overhead">{t.simulator.itemTypes.overhead}</SelectItem>
            </SelectContent>
          </Select>
        ) : (
          <Badge className={itemTypeColors[item.type]}>
            {t.simulator.itemTypes[item.type]}
          </Badge>
        )}
      </TableCell>
      
      <TableCell>
        {editable ? (
          <Input
            type="number"
            value={item.quantity}
            onChange={(e) => onUpdateItem(actualIndex, { 
              quantity: parseFloat(e.target.value) || 0 
            })}
            min="0"
            step="0.01"
            className="border-0 shadow-none focus-visible:ring-0 p-0"
          />
        ) : (
          <span>{item.quantity}</span>
        )}
      </TableCell>
      
      <TableCell>
        {editable ? (
          <Input
            value={item.unit}
            onChange={(e) => onUpdateItem(actualIndex, { unit: e.target.value })}
            placeholder="m²"
            className="border-0 shadow-none focus-visible:ring-0 p-0"
          />
        ) : (
          <span>{item.unit}</span>
        )}
      </TableCell>
      
      <TableCell>
        {editable ? (
          <Input
            type="number"
            value={item.unitCost}
            onChange={(e) => onUpdateItem(actualIndex, { 
              unitCost: parseFloat(e.target.value) || 0 
            })}
            min="0"
            step="0.01"
            className="border-0 shadow-none focus-visible:ring-0 p-0"
          />
        ) : (
          <span>{formatCurrency(item.unitCost, currency)}</span>
        )}
      </TableCell>
      
      <TableCell className="font-medium">
        {formatCurrency(item.total, currency)}
      </TableCell>
      
      {editable && (
        <TableCell>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onRemoveItem(actualIndex)}
            className="text-red-600 hover:text-red-700"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </TableCell>
      )}
    </TableRow>
  );

  const renderItems = () => {
    if (groupByType) {
      return Object.entries(groupedItems).map(([type, typeItems]) => {
        if (typeItems.length === 0) return null;
        
        const itemType = type as CostItemType;
        const isExpanded = expandedGroups[itemType];
        
        return (
          <React.Fragment key={type}>
            {renderGroupHeader(itemType, typeItems.length)}
            {isExpanded && typeItems.map((item, index) => {
              const actualIndex = items.findIndex(i => i.id === item.id);
              return renderItemRow(item, index, actualIndex);
            })}
          </React.Fragment>
        );
      });
    } else {
      return items.map((item, index) => renderItemRow(item, index, index));
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base font-medium">
            Desglose de Costos
          </CardTitle>
          {editable && (
            <Button onClick={onAddItem} size="sm" variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Agregar Elemento
            </Button>
          )}
        </CardHeader>
        
        <CardContent className="px-0">
          {items.length === 0 ? (
            <div className="text-center py-8 text-gray-500 px-6">
              <Calculator className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No hay elementos en la cotización</p>
              {editable && (
                <Button onClick={onAddItem} className="mt-4" variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar Primer Elemento
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-semibold">Elemento</TableHead>
                  <TableHead className="font-semibold">Tipo</TableHead>
                  <TableHead className="font-semibold">Cantidad</TableHead>
                  <TableHead className="font-semibold">Unidad</TableHead>
                  <TableHead className="font-semibold">Costo Unit.</TableHead>
                  <TableHead className="font-semibold">Total</TableHead>
                  {editable && <TableHead className="font-semibold">Acciones</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {renderItems()}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Totals Card */}
      {showTotals && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Resumen Financiero
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal:</span>
              <span className="font-medium">{formatCurrency(subtotal, currency)}</span>
            </div>
            
            {profitMargin > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Margen de Ganancia ({profitMargin}%):</span>
                <span className="font-medium">
                  {formatCurrency(total - subtotal, currency)}
                </span>
              </div>
            )}
            
            <div className="border-t pt-3">
              <div className="flex justify-between text-lg">
                <span className="font-semibold">Total:</span>
                <span className="font-bold text-primary">
                  {formatCurrency(total, currency)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}