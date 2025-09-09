"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useTranslations } from "@/lib/i18n";
import {
  LayoutDashboard,
  FolderOpen,
  Users,
  Receipt,
  Calendar,
  BarChart3,
  Settings,
  Construction,
  Calculator,
  DollarSign,
  Building2,
  FileText,
  UserCheck,
  FileSpreadsheet,
  Shield,
} from "lucide-react";

const navigation = [
  { name: "dashboard", href: "/", icon: LayoutDashboard },
  { name: "projects", href: "/projects", icon: FolderOpen },
  { name: "clients", href: "/clients", icon: Building2 },
  { name: "personnel", href: "/personnel", icon: Users },
  { name: "payroll", href: "/payroll", icon: DollarSign },
  { name: "expenses", href: "/expenses", icon: Receipt },
  { name: "simulator", href: "/simulator", icon: Calculator },
  { name: "calendar", href: "/calendar", icon: Calendar },
  { name: "reports", href: "/reports", icon: BarChart3 },
  // Compliance Section
  { name: "compliance", href: "/compliance", icon: Shield },
  { name: "invoicing", href: "/invoicing/new", icon: FileText },
  {
    name: "payroll_electronic",
    href: "/payroll/generate",
    icon: FileSpreadsheet,
  },
  { name: "pila", href: "/pila", icon: FileSpreadsheet },
  { name: "contractors", href: "/contractors", icon: UserCheck },
  // Settings
  { name: "settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const t = useTranslations("es");

  return (
    <div
      className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0"
      suppressHydrationWarning
    >
      <div
        className="flex-1 flex flex-col min-h-0 bg-card border-r border-border shadow-sm"
        suppressHydrationWarning
      >
        <div className="flex-1 flex flex-col pt-6 pb-4 overflow-y-auto">
          {/* Logo */}
          <div className="flex items-center flex-shrink-0 px-6 mb-8">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-r from-primary to-secondary flex items-center justify-center">
              <Construction className="h-5 w-5 text-white" />
            </div>
            <div className="ml-3">
              <span className="text-xl font-bold text-foreground">HYR</span>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                Admin System
              </p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 space-y-2">
            {navigation.map(item => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "group flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20 scale-[1.02]"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent hover:scale-[1.01]"
                  )}
                >
                  <item.icon
                    className={cn(
                      "mr-3 flex-shrink-0 h-5 w-5 transition-colors",
                      isActive
                        ? "text-primary-foreground"
                        : "text-muted-foreground group-hover:text-foreground"
                    )}
                    aria-hidden="true"
                  />
                  <span className="truncate">
                    {t.nav[item.name as keyof typeof t.nav]}
                  </span>
                  {isActive && (
                    <div className="ml-auto h-2 w-2 rounded-full bg-primary-foreground" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer */}
        <div
          className="flex-shrink-0 border-t border-border p-4"
          suppressHydrationWarning
        >
          <div
            className="hyr-card p-4 bg-gradient-to-r from-primary/5 to-secondary/5"
            suppressHydrationWarning
          >
            <div className="flex items-center" suppressHydrationWarning>
              <div className="h-10 w-10 rounded-lg bg-gradient-to-r from-primary to-secondary flex items-center justify-center">
                <span className="text-sm font-bold text-white">RH</span>
              </div>
              <div className="ml-3 min-w-0 flex-1" suppressHydrationWarning>
                <p className="text-sm font-medium text-foreground truncate">
                  Santiago Hurtado
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  Constructora & Soldadura
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
