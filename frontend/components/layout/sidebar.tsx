"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useTranslations } from "@/lib/i18n";
import {
  LayoutDashboard,
  FolderOpen,
  Receipt,
  BarChart3,
  Settings,
  Construction,
} from "lucide-react";

const navigation = [
  { name: "dashboard", href: "/", icon: LayoutDashboard },
  { name: "projects", href: "/projects", icon: FolderOpen },
  { name: "expenses", href: "/expenses", icon: Receipt },
  { name: "reports", href: "/reports", icon: BarChart3 },
  { name: "settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const t = useTranslations("es");

  return (
    <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
      <div className="flex-1 flex flex-col min-h-0 bg-white border-r border-gray-200">
        <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
          {/* Logo */}
          <div className="flex items-center flex-shrink-0 px-4">
            <Construction className="h-8 w-8 text-primary" />
            <span className="ml-2 text-xl font-bold text-gray-900">
              HYR Admin
            </span>
          </div>

          {/* Navigation */}
          <nav className="mt-8 flex-1 px-2 space-y-1">
            {navigation.map(item => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                  )}
                >
                  <item.icon
                    className={cn(
                      "mr-3 flex-shrink-0 h-5 w-5",
                      isActive ? "text-primary-foreground" : "text-gray-500"
                    )}
                    aria-hidden="true"
                  />
                  {t.nav[item.name as keyof typeof t.nav]}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
          <div className="flex-shrink-0 w-full group block">
            <div className="flex items-center">
              <div className="ml-3">
                <p className="text-xs font-medium text-gray-700 group-hover:text-gray-900">
                  Constructora & Soldadura HYR
                </p>
                <p className="text-xs font-medium text-gray-500 group-hover:text-gray-700">
                  Santiago Hurtado
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
