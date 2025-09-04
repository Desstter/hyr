'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useTranslations } from '@/lib/i18n';
import { calculateMonthlyData } from '@/lib/finance';
import { projects, expenses } from '@/data/fixtures';

export function CashflowChart() {
  const t = useTranslations('es');
  const data = calculateMonthlyData(expenses, projects);

  const formatTooltipValue = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      notation: 'compact',
      compactDisplay: 'short',
      minimumFractionDigits: 0,
      maximumFractionDigits: 1,
    }).format(value);
  };

  return (
    <Card className="col-span-full">
      <CardHeader>
        <CardTitle>{t.dashboard.cashflow}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="month" 
                className="text-xs fill-muted-foreground"
              />
              <YAxis 
                className="text-xs fill-muted-foreground"
                tickFormatter={formatTooltipValue}
              />
              <Tooltip 
                formatter={(value: number) => [formatTooltipValue(value), '']}
                labelClassName="text-foreground"
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px',
                }}
              />
              <Legend />
              <Bar 
                dataKey="revenue" 
                name={t.dashboard.revenue}
                fill="hsl(var(--primary))"
                radius={[2, 2, 0, 0]}
              />
              <Bar 
                dataKey="costs" 
                name={t.dashboard.costs}
                fill="hsl(var(--destructive))"
                radius={[2, 2, 0, 0]}
              />
              <Bar 
                dataKey="profit" 
                name={t.dashboard.profit}
                fill="hsl(var(--accent-foreground))"
                radius={[2, 2, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}