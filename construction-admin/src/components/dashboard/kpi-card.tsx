import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCompactCurrency } from '@/lib/finance';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KPICardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  isCurrency?: boolean;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
  className?: string;
}

export function KPICard({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  isCurrency = false, 
  variant = 'default',
  className 
}: KPICardProps) {
  const displayValue = isCurrency && typeof value === 'number' 
    ? formatCompactCurrency(value) 
    : value;

  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return 'border-l-4 border-l-primary bg-gradient-to-r from-primary/5 to-transparent';
      case 'success':
        return 'border-l-4 border-l-[hsl(var(--success))] bg-gradient-to-r from-[hsl(var(--success-light))] to-transparent';
      case 'warning':
        return 'border-l-4 border-l-[hsl(var(--warning))] bg-gradient-to-r from-[hsl(var(--warning-light))] to-transparent';
      case 'danger':
        return 'border-l-4 border-l-[hsl(var(--destructive))] bg-gradient-to-r from-[hsl(var(--destructive-light))] to-transparent';
      default:
        return '';
    }
  };

  const getIconColor = () => {
    switch (variant) {
      case 'primary':
        return 'text-primary';
      case 'success':
        return 'text-[hsl(var(--success))]';
      case 'warning':
        return 'text-[hsl(var(--warning))]';
      case 'danger':
        return 'text-[hsl(var(--destructive))]';
      default:
        return 'text-muted-foreground';
    }
  };

  const TrendIcon = trend?.isPositive ? TrendingUp : TrendingDown;

  return (
    <Card className={cn(
      'hyr-card kpi-card transition-all duration-300 hover:scale-[1.02]',
      getVariantStyles(),
      className
    )}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground tracking-wide uppercase">
          {title}
        </CardTitle>
        <div className={cn(
          'h-10 w-10 rounded-lg flex items-center justify-center',
          variant === 'default' ? 'bg-muted' : 'bg-white/80 backdrop-blur-sm'
        )}>
          <Icon className={cn('h-5 w-5', getIconColor())} />
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          <div className="text-3xl font-bold tracking-tight">
            {displayValue}
          </div>
          
          {trend && (
            <div className="flex items-center space-x-2">
              <div className={cn(
                'flex items-center space-x-1 rounded-full px-2 py-1 text-xs font-medium',
                trend.isPositive 
                  ? 'bg-[hsl(var(--success-light))] text-[hsl(var(--success))]' 
                  : 'bg-[hsl(var(--destructive-light))] text-[hsl(var(--destructive))]'
              )}>
                <TrendIcon className="h-3 w-3" />
                <span>{Math.abs(trend.value)}%</span>
              </div>
              <span className="text-xs text-muted-foreground">
                desde el mes pasado
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}