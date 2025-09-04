'use client';

import { useState } from 'react';
import { Menu, Bell, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Sidebar } from './sidebar';

export function TopBar() {
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  return (
    <div className="lg:pl-64 flex flex-col">
      <div className="sticky top-0 z-40 flex h-16 flex-shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
        {/* Mobile menu button */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="sm" className="lg:hidden">
              <span className="sr-only">Abrir menú</span>
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64">
            <Sidebar />
          </SheetContent>
        </Sheet>

        {/* Separator */}
        <div className="h-6 w-px bg-gray-900/10 lg:hidden" aria-hidden="true" />

        <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
          {/* Search */}
          <div className="relative flex flex-1 items-center">
            <Search className="pointer-events-none absolute inset-y-0 left-0 h-full w-5 text-gray-400 pl-3" />
            <Input
              className={cn(
                "h-full w-full border-0 bg-transparent pl-11 pr-0 text-gray-900 placeholder:text-gray-400 focus:ring-0 sm:text-sm",
                isSearchFocused && "ring-2 ring-primary"
              )}
              placeholder="Buscar proyectos, gastos..."
              type="search"
              name="search"
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
            />
          </div>
          
          <div className="flex items-center gap-x-4 lg:gap-x-6">
            {/* Notifications */}
            <Button variant="ghost" size="sm" className="relative">
              <span className="sr-only">Ver notificaciones</span>
              <Bell className="h-5 w-5" aria-hidden="true" />
              <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-400 ring-2 ring-white" />
            </Button>

            {/* Separator */}
            <div className="hidden lg:block lg:h-6 lg:w-px lg:bg-gray-900/10" aria-hidden="true" />

            {/* Profile dropdown placeholder for future */}
            <div className="flex items-center gap-x-2">
              <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                RH
              </div>
              <span className="hidden lg:block text-sm font-medium text-gray-900">
                Santiago Hurtado
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function cn(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}