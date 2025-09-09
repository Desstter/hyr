import React from "react";
import { toast } from "sonner";
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  Info,
  Zap,
  DollarSign,
  Clock,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface EnhancedToastOptions {
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  duration?: number;
  dismissible?: boolean;
}

// Enhanced toast variants with custom styling
export const enhancedToast = {
  success: (options: EnhancedToastOptions) => {
    return toast.custom(
      t => (
        <div
          className={cn(
            "hyr-card p-4 max-w-md w-full border-l-4 border-l-[hsl(var(--success))] bg-gradient-to-r from-[hsl(var(--success-light))] to-card shadow-lg",
            "animate-in slide-in-from-right-full duration-300"
          )}
        >
          <div className="flex items-start gap-3">
            <div className="h-8 w-8 rounded-full bg-[hsl(var(--success))]/20 flex items-center justify-center flex-shrink-0">
              <CheckCircle className="h-4 w-4 text-[hsl(var(--success))]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">
                {options.title}
              </p>
              {options.description && (
                <p className="text-xs text-muted-foreground mt-1">
                  {options.description}
                </p>
              )}
              {options.action && (
                <button
                  onClick={() => {
                    options.action?.onClick();
                    toast.dismiss(t);
                  }}
                  className="mt-2 text-xs font-medium text-[hsl(var(--success))] hover:underline"
                >
                  {options.action.label}
                </button>
              )}
            </div>
            {options.dismissible !== false && (
              <button
                onClick={() => toast.dismiss(t)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      ),
      { duration: options.duration || 5000 }
    );
  },

  error: (options: EnhancedToastOptions) => {
    return toast.custom(
      t => (
        <div
          className={cn(
            "hyr-card p-4 max-w-md w-full border-l-4 border-l-[hsl(var(--destructive))] bg-gradient-to-r from-[hsl(var(--destructive-light))] to-card shadow-lg",
            "animate-in slide-in-from-right-full duration-300"
          )}
        >
          <div className="flex items-start gap-3">
            <div className="h-8 w-8 rounded-full bg-[hsl(var(--destructive))]/20 flex items-center justify-center flex-shrink-0">
              <XCircle className="h-4 w-4 text-[hsl(var(--destructive))]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">
                {options.title}
              </p>
              {options.description && (
                <p className="text-xs text-muted-foreground mt-1">
                  {options.description}
                </p>
              )}
              {options.action && (
                <button
                  onClick={() => {
                    options.action?.onClick();
                    toast.dismiss(t);
                  }}
                  className="mt-2 text-xs font-medium text-[hsl(var(--destructive))] hover:underline"
                >
                  {options.action.label}
                </button>
              )}
            </div>
            {options.dismissible !== false && (
              <button
                onClick={() => toast.dismiss(t)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      ),
      { duration: options.duration || 8000 }
    );
  },

  warning: (options: EnhancedToastOptions) => {
    return toast.custom(
      t => (
        <div
          className={cn(
            "hyr-card p-4 max-w-md w-full border-l-4 border-l-[hsl(var(--warning))] bg-gradient-to-r from-[hsl(var(--warning-light))] to-card shadow-lg",
            "animate-in slide-in-from-right-full duration-300"
          )}
        >
          <div className="flex items-start gap-3">
            <div className="h-8 w-8 rounded-full bg-[hsl(var(--warning))]/20 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="h-4 w-4 text-[hsl(var(--warning))]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">
                {options.title}
              </p>
              {options.description && (
                <p className="text-xs text-muted-foreground mt-1">
                  {options.description}
                </p>
              )}
              {options.action && (
                <button
                  onClick={() => {
                    options.action?.onClick();
                    toast.dismiss(t);
                  }}
                  className="mt-2 text-xs font-medium text-[hsl(var(--warning))] hover:underline"
                >
                  {options.action.label}
                </button>
              )}
            </div>
            {options.dismissible !== false && (
              <button
                onClick={() => toast.dismiss(t)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      ),
      { duration: options.duration || 6000 }
    );
  },

  info: (options: EnhancedToastOptions) => {
    return toast.custom(
      t => (
        <div
          className={cn(
            "hyr-card p-4 max-w-md w-full border-l-4 border-l-primary bg-gradient-to-r from-primary/5 to-card shadow-lg",
            "animate-in slide-in-from-right-full duration-300"
          )}
        >
          <div className="flex items-start gap-3">
            <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
              <Info className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">
                {options.title}
              </p>
              {options.description && (
                <p className="text-xs text-muted-foreground mt-1">
                  {options.description}
                </p>
              )}
              {options.action && (
                <button
                  onClick={() => {
                    options.action?.onClick();
                    toast.dismiss(t);
                  }}
                  className="mt-2 text-xs font-medium text-primary hover:underline"
                >
                  {options.action.label}
                </button>
              )}
            </div>
            {options.dismissible !== false && (
              <button
                onClick={() => toast.dismiss(t)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      ),
      { duration: options.duration || 5000 }
    );
  },

  // Business-specific notifications
  projectAlert: (options: {
    projectName: string;
    type: "budget" | "deadline" | "completion";
    action?: () => void;
  }) => {
    const config = {
      budget: {
        icon: DollarSign,
        title: "Alerta de Presupuesto",
        description: `${options.projectName} está cerca del límite presupuestal`,
        color: "warning" as const,
      },
      deadline: {
        icon: Clock,
        title: "Fecha Límite Próxima",
        description: `${options.projectName} vence pronto`,
        color: "warning" as const,
      },
      completion: {
        icon: CheckCircle,
        title: "Proyecto Completado",
        description: `${options.projectName} ha sido completado exitosamente`,
        color: "success" as const,
      },
    };

    const { icon: Icon, title, description, color } = config[options.type];

    return enhancedToast[color]({
      title,
      description,
      action: options.action
        ? { label: "Ver proyecto", onClick: options.action }
        : undefined,
      duration: 8000,
    });
  },

  payrollUpdate: (options: {
    month: string;
    amount: number;
    employeeCount: number;
    action?: () => void;
  }) => {
    return enhancedToast.info({
      title: "Nómina Procesada",
      description: `${options.month}: $${options.amount.toLocaleString()} para ${options.employeeCount} empleados`,
      action: options.action
        ? { label: "Ver detalles", onClick: options.action }
        : undefined,
      duration: 6000,
    });
  },

  systemUpdate: (options: { feature: string; description?: string }) => {
    return enhancedToast.info({
      title: `Nueva funcionalidad: ${options.feature}`,
      description: options.description,
      duration: 5000,
    });
  },
};

// Auto-dismiss loading toast
export const loadingToast = {
  show: (message: string = "Procesando...") => {
    return toast.custom(
      t => (
        <div className="hyr-card p-4 max-w-md w-full bg-card shadow-lg">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
              <Zap className="h-4 w-4 text-primary animate-pulse" />
            </div>
            <p className="text-sm font-medium text-foreground">{message}</p>
          </div>
        </div>
      ),
      { duration: Infinity, dismissible: false }
    );
  },

  dismiss: (id: string | number) => {
    toast.dismiss(id);
  },
};
