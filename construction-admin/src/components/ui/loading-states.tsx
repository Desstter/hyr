import React from 'react';
import { cn } from '@/lib/utils';
import { Loader2, Zap, Construction } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary' | 'muted';
  className?: string;
}

export function LoadingSpinner({ size = 'md', variant = 'primary', className }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8'
  };

  const variantClasses = {
    primary: 'text-primary',
    secondary: 'text-secondary',
    muted: 'text-muted-foreground'
  };

  return (
    <Loader2 
      className={cn(
        'animate-spin',
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
    />
  );
}

interface SkeletonProps {
  className?: string;
  variant?: 'default' | 'card' | 'text' | 'avatar' | 'button';
}

export function Skeleton({ className, variant = 'default' }: SkeletonProps) {
  const variantClasses = {
    default: 'h-4 w-full',
    card: 'h-32 w-full',
    text: 'h-3 w-3/4',
    avatar: 'h-12 w-12 rounded-full',
    button: 'h-10 w-24'
  };

  return (
    <div 
      className={cn(
        'skeleton rounded',
        variantClasses[variant],
        className
      )}
    />
  );
}

interface SkeletonCardProps {
  lines?: number;
  showAvatar?: boolean;
  showButton?: boolean;
  className?: string;
}

export function SkeletonCard({ lines = 3, showAvatar = false, showButton = false, className }: SkeletonCardProps) {
  return (
    <div className={cn('hyr-card p-6 space-y-4', className)}>
      {showAvatar && (
        <div className="flex items-center space-x-4">
          <Skeleton variant="avatar" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-1/4" />
            <Skeleton variant="text" />
          </div>
        </div>
      )}
      
      <div className="space-y-3">
        {Array.from({ length: lines }, (_, i) => (
          <Skeleton 
            key={i} 
            className={cn(
              'h-3',
              i === lines - 1 ? 'w-2/3' : 'w-full'
            )} 
          />
        ))}
      </div>
      
      {showButton && (
        <Skeleton variant="button" />
      )}
    </div>
  );
}

interface LoadingPageProps {
  title?: string;
  description?: string;
  variant?: 'dashboard' | 'table' | 'form';
}

export function LoadingPage({ title = 'Cargando', description, variant = 'dashboard' }: LoadingPageProps) {
  const renderDashboardSkeleton = () => (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton variant="button" className="w-32" />
      </div>

      {/* KPI cards skeleton */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <SkeletonCard key={i} lines={2} />
        ))}
      </div>

      {/* Charts skeleton */}
      <div className="grid gap-6 lg:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="hyr-card p-6">
            <Skeleton className="h-6 w-32 mb-4" />
            <Skeleton variant="card" className="h-48" />
          </div>
        ))}
      </div>
    </div>
  );

  const renderTableSkeleton = () => (
    <div className="space-y-4">
      <div className="flex gap-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <SkeletonCard key={i} lines={4} showButton />
        ))}
      </div>
    </div>
  );

  const renderFormSkeleton = () => (
    <div className="max-w-2xl mx-auto">
      <SkeletonCard lines={8} showButton />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Loading header */}
      <div className="flex flex-col items-center justify-center py-8">
        <div className="relative mb-4">
          <div className="h-16 w-16 rounded-xl bg-gradient-to-r from-primary to-secondary flex items-center justify-center">
            <Construction className="h-8 w-8 text-white animate-bounce" />
          </div>
          <div className="absolute -bottom-2 -right-2 h-6 w-6 rounded-full bg-primary flex items-center justify-center">
            <LoadingSpinner size="sm" variant="primary" className="text-white" />
          </div>
        </div>
        
        <h2 className="text-xl font-semibold text-foreground mb-2">{title}</h2>
        {description && (
          <p className="text-sm text-muted-foreground text-center max-w-md">
            {description}
          </p>
        )}
      </div>

      {/* Content skeleton */}
      {variant === 'dashboard' && renderDashboardSkeleton()}
      {variant === 'table' && renderTableSkeleton()}
      {variant === 'form' && renderFormSkeleton()}
    </div>
  );
}

interface PulseDotsProps {
  count?: number;
  size?: 'sm' | 'md' | 'lg';
  color?: 'primary' | 'secondary' | 'success';
  className?: string;
}

export function PulseDots({ count = 3, size = 'md', color = 'primary', className }: PulseDotsProps) {
  const sizeClasses = {
    sm: 'h-2 w-2',
    md: 'h-3 w-3',
    lg: 'h-4 w-4'
  };

  const colorClasses = {
    primary: 'bg-primary',
    secondary: 'bg-secondary',
    success: 'bg-[hsl(var(--success))]'
  };

  return (
    <div className={cn('flex space-x-1', className)}>
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className={cn(
            'rounded-full animate-pulse',
            sizeClasses[size],
            colorClasses[color]
          )}
          style={{
            animationDelay: `${i * 0.15}s`,
            animationDuration: '1s'
          }}
        />
      ))}
    </div>
  );
}

export function LoadingOverlay({ isLoading, children, loadingText = 'Procesando...' }: {
  isLoading: boolean;
  children: React.ReactNode;
  loadingText?: string;
}) {
  return (
    <div className="relative">
      {children}
      {isLoading && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 rounded-lg">
          <div className="text-center">
            <div className="mb-4">
              <LoadingSpinner size="lg" />
            </div>
            <p className="text-sm font-medium text-foreground">{loadingText}</p>
          </div>
        </div>
      )}
    </div>
  );
}