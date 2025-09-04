'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { 
  Plus, 
  FolderOpen, 
  Users, 
  Receipt, 
  Calculator,
  X,
  Zap
} from 'lucide-react';

interface FABAction {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  color?: 'primary' | 'secondary' | 'success' | 'warning';
}

interface MobileFABProps {
  actions?: FABAction[];
}

const defaultActions: FABAction[] = [
  {
    icon: FolderOpen,
    label: 'Nuevo Proyecto',
    onClick: () => console.log('Nuevo proyecto'),
    color: 'primary'
  },
  {
    icon: Users,
    label: 'Añadir Empleado',
    onClick: () => console.log('Nuevo empleado'),
    color: 'secondary'
  },
  {
    icon: Receipt,
    label: 'Registrar Gasto',
    onClick: () => console.log('Nuevo gasto'),
    color: 'warning'
  },
  {
    icon: Calculator,
    label: 'Simulador Costos',
    onClick: () => console.log('Simulador'),
    color: 'success'
  }
];

export function MobileFAB({ actions = defaultActions }: MobileFABProps) {
  const [isOpen, setIsOpen] = useState(false);
  const fabRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (fabRef.current && !fabRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getActionColor = (color?: string) => {
    switch (color) {
      case 'secondary':
        return 'bg-secondary text-secondary-foreground hover:bg-secondary/90';
      case 'success':
        return 'bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))] hover:bg-[hsl(var(--success))]/90';
      case 'warning':
        return 'bg-[hsl(var(--warning))] text-[hsl(var(--warning-foreground))] hover:bg-[hsl(var(--warning))]/90';
      default:
        return 'bg-primary text-primary-foreground hover:bg-primary/90';
    }
  };

  return (
    <div 
      ref={fabRef}
      className="fixed bottom-6 right-6 z-50 lg:hidden"
    >
      {/* Overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm -z-10" />
      )}

      {/* Action Buttons */}
      <div className="flex flex-col items-end space-y-3 mb-4">
        {actions.map((action, index) => {
          const Icon = action.icon;
          return (
            <div
              key={index}
              className={cn(
                "flex items-center space-x-3 transition-all duration-300 ease-out",
                isOpen 
                  ? "opacity-100 translate-y-0 scale-100" 
                  : "opacity-0 translate-y-4 scale-75 pointer-events-none"
              )}
              style={{ 
                transitionDelay: isOpen ? `${index * 50}ms` : `${(actions.length - index - 1) * 50}ms` 
              }}
            >
              {/* Label */}
              <div className="bg-card text-card-foreground px-3 py-2 rounded-lg shadow-lg text-sm font-medium whitespace-nowrap border">
                {action.label}
              </div>
              
              {/* Action Button */}
              <Button
                size="icon"
                className={cn(
                  "h-12 w-12 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-110",
                  getActionColor(action.color)
                )}
                onClick={() => {
                  action.onClick();
                  setIsOpen(false);
                }}
              >
                <Icon className="h-5 w-5" />
              </Button>
            </div>
          );
        })}
      </div>

      {/* Main FAB Button */}
      <Button
        size="icon"
        className={cn(
          "h-14 w-14 rounded-full shadow-xl hover:shadow-2xl transition-all duration-300",
          "bg-gradient-to-r from-primary to-secondary text-white",
          "hover:scale-110 active:scale-95",
          isOpen && "rotate-45"
        )}
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? (
          <X className="h-6 w-6 transition-transform duration-300" />
        ) : (
          <Zap className="h-6 w-6 transition-transform duration-300" />
        )}
      </Button>
    </div>
  );
}

// Quick Action Variants for different pages
export function ProjectsFAB() {
  const projectActions: FABAction[] = [
    {
      icon: FolderOpen,
      label: 'Nuevo Proyecto',
      onClick: () => console.log('Nuevo proyecto'),
      color: 'primary'
    },
    {
      icon: Calculator,
      label: 'Simular Costos',
      onClick: () => console.log('Simular costos'),
      color: 'success'
    }
  ];

  return <MobileFAB actions={projectActions} />;
}

export function PersonnelFAB() {
  const personnelActions: FABAction[] = [
    {
      icon: Users,
      label: 'Nuevo Empleado',
      onClick: () => console.log('Nuevo empleado'),
      color: 'primary'
    },
    {
      icon: Calculator,
      label: 'Calcular Nómina',
      onClick: () => console.log('Calcular nómina'),
      color: 'secondary'
    }
  ];

  return <MobileFAB actions={personnelActions} />;
}

export function ExpensesFAB() {
  const expenseActions: FABAction[] = [
    {
      icon: Receipt,
      label: 'Nuevo Gasto',
      onClick: () => console.log('Nuevo gasto'),
      color: 'primary'
    },
    {
      icon: FolderOpen,
      label: 'Por Proyecto',
      onClick: () => console.log('Gasto por proyecto'),
      color: 'secondary'
    }
  ];

  return <MobileFAB actions={expenseActions} />;
}