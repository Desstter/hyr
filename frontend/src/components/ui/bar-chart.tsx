import React from "react";
import { cn } from "@/lib/utils";

interface BarChartData {
  label: string;
  value: number;
  color?: string;
  variant?: "primary" | "success" | "warning" | "danger";
}

interface BarChartProps {
  data: BarChartData[];
  title?: string;
  className?: string;
  maxValue?: number;
  showValues?: boolean;
  orientation?: "horizontal" | "vertical";
  height?: number;
}

export function BarChart({
  data,
  title,
  className,
  maxValue,
  showValues = true,
  orientation = "vertical",
  height = 200,
}: BarChartProps) {
  const max = maxValue || Math.max(...data.map(d => d.value));

  const getVariantColor = (variant?: string) => {
    switch (variant) {
      case "success":
        return "bg-[hsl(var(--success))]";
      case "warning":
        return "bg-[hsl(var(--warning))]";
      case "danger":
        return "bg-[hsl(var(--destructive))]";
      default:
        return "bg-primary";
    }
  };

  if (orientation === "horizontal") {
    return (
      <div className={cn("hyr-card p-6", className)}>
        {title && (
          <h3 className="text-lg font-semibold text-foreground mb-6">
            {title}
          </h3>
        )}

        <div className="space-y-4">
          {data.map((item, index) => (
            <div key={index} className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-foreground">
                  {item.label}
                </span>
                {showValues && (
                  <span className="text-sm text-muted-foreground">
                    {typeof item.value === "number" && item.value >= 1000000
                      ? `$${(item.value / 1000000).toFixed(1)}M`
                      : typeof item.value === "number" && item.value >= 1000
                        ? `$${(item.value / 1000).toFixed(0)}K`
                        : item.value.toLocaleString()}
                  </span>
                )}
              </div>

              <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-1000 ease-out",
                    item.color || getVariantColor(item.variant)
                  )}
                  style={{
                    width: `${(item.value / max) * 100}%`,
                    boxShadow: "0 0 10px currentColor",
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("hyr-card p-6", className)}>
      {title && (
        <h3 className="text-lg font-semibold text-foreground mb-6">{title}</h3>
      )}

      <div
        className="flex items-end justify-between space-x-2"
        style={{ height }}
      >
        {data.map((item, index) => (
          <div
            key={index}
            className="flex flex-col items-center flex-1 space-y-2"
          >
            <div
              className="relative flex flex-col items-center justify-end w-full"
              style={{ height: height - 60 }}
            >
              {showValues && (
                <span className="text-xs text-muted-foreground mb-1">
                  {typeof item.value === "number" && item.value >= 1000000
                    ? `$${(item.value / 1000000).toFixed(1)}M`
                    : typeof item.value === "number" && item.value >= 1000
                      ? `$${(item.value / 1000).toFixed(0)}K`
                      : item.value.toLocaleString()}
                </span>
              )}

              <div
                className={cn(
                  "w-full rounded-t-lg transition-all duration-1000 ease-out hover:brightness-110",
                  item.color || getVariantColor(item.variant)
                )}
                style={{
                  height: `${(item.value / max) * 100}%`,
                  minHeight: "4px",
                  boxShadow: "0 -2px 8px rgba(0,0,0,0.1)",
                }}
              />
            </div>

            <span className="text-xs text-muted-foreground text-center leading-tight max-w-full truncate">
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface MiniBarChartProps {
  data: number[];
  variant?: "primary" | "success" | "warning" | "danger";
  className?: string;
  height?: number;
}

export function MiniBarChart({
  data,
  variant = "primary",
  className,
  height = 40,
}: MiniBarChartProps) {
  const max = Math.max(...data);

  const getVariantColor = () => {
    switch (variant) {
      case "success":
        return "bg-[hsl(var(--success))]";
      case "warning":
        return "bg-[hsl(var(--warning))]";
      case "danger":
        return "bg-[hsl(var(--destructive))]";
      default:
        return "bg-primary";
    }
  };

  return (
    <div
      className={cn("flex items-end space-x-1", className)}
      style={{ height }}
    >
      {data.map((value, index) => (
        <div
          key={index}
          className={cn(
            "rounded-t-sm transition-all duration-500 ease-out hover:brightness-110",
            getVariantColor()
          )}
          style={{
            height: `${(value / max) * 100}%`,
            minHeight: "2px",
            width: `${100 / data.length}%`,
          }}
        />
      ))}
    </div>
  );
}
