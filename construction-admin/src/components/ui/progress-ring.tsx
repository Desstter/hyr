import React from "react";
import { cn } from "@/lib/utils";

interface ProgressRingProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  children?: React.ReactNode;
  variant?: "primary" | "success" | "warning" | "danger";
  showPercentage?: boolean;
}

export function ProgressRing({
  progress,
  size = 120,
  strokeWidth = 8,
  className,
  children,
  variant = "primary",
  showPercentage = true,
}: ProgressRingProps) {
  const normalizedRadius = (size - strokeWidth) / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDasharray = `${circumference} ${circumference}`;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  const getVariantColors = () => {
    switch (variant) {
      case "success":
        return {
          bg: "stroke-[hsl(var(--success))]/20",
          fg: "stroke-[hsl(var(--success))]",
          text: "text-[hsl(var(--success))]",
        };
      case "warning":
        return {
          bg: "stroke-[hsl(var(--warning))]/20",
          fg: "stroke-[hsl(var(--warning))]",
          text: "text-[hsl(var(--warning))]",
        };
      case "danger":
        return {
          bg: "stroke-[hsl(var(--destructive))]/20",
          fg: "stroke-[hsl(var(--destructive))]",
          text: "text-[hsl(var(--destructive))]",
        };
      default:
        return {
          bg: "stroke-primary/20",
          fg: "stroke-primary",
          text: "text-primary",
        };
    }
  };

  const colors = getVariantColors();

  return (
    <div
      className={cn(
        "relative inline-flex items-center justify-center",
        className
      )}
    >
      <svg height={size} width={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          stroke="currentColor"
          fill="transparent"
          strokeWidth={strokeWidth}
          r={normalizedRadius}
          cx={size / 2}
          cy={size / 2}
          className={colors.bg}
        />

        {/* Progress circle */}
        <circle
          stroke="currentColor"
          fill="transparent"
          strokeWidth={strokeWidth}
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          r={normalizedRadius}
          cx={size / 2}
          cy={size / 2}
          className={cn(colors.fg, "transition-all duration-1000 ease-out")}
          style={{
            filter: "drop-shadow(0 0 6px currentColor)",
          }}
        />
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex items-center justify-center">
        {children ||
          (showPercentage && (
            <div className="text-center">
              <div className={cn("text-2xl font-bold", colors.text)}>
                {Math.round(progress)}%
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}

interface ProgressRingCardProps {
  title: string;
  progress: number;
  value?: string | number;
  subtitle?: string;
  variant?: "primary" | "success" | "warning" | "danger";
  className?: string;
}

export function ProgressRingCard({
  title,
  progress,
  value,
  subtitle,
  variant = "primary",
  className,
}: ProgressRingCardProps) {
  return (
    <div className={cn("hyr-card p-6 text-center", className)}>
      <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-4">
        {title}
      </h3>

      <div className="flex flex-col items-center">
        <ProgressRing
          progress={progress}
          variant={variant}
          size={100}
          strokeWidth={6}
          showPercentage={false}
        >
          <div className="text-center">
            {value && (
              <div className="text-lg font-bold text-foreground">{value}</div>
            )}
            <div className="text-xs text-muted-foreground">
              {Math.round(progress)}%
            </div>
          </div>
        </ProgressRing>

        {subtitle && (
          <p className="text-sm text-muted-foreground mt-3">{subtitle}</p>
        )}
      </div>
    </div>
  );
}
