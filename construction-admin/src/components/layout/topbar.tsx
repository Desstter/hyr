'use client';

import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Sidebar } from './sidebar';
import { QuickActions } from './quick-actions';

export function TopBar() {

  return (
    <div className="sticky top-0 z-40 flex h-16 flex-shrink-0 items-center gap-x-2 sm:gap-x-4 border-b border-border bg-card px-4 shadow-sm sm:px-6 lg:px-8 backdrop-blur-md bg-card/95" suppressHydrationWarning>
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
        <div className="h-6 w-px bg-gray-900/10 lg:hidden" aria-hidden="true" suppressHydrationWarning />

        {/* Spacer to push actions and profile to the right */}
        <div className="flex-1" />
        
        {/* Quick Actions - Integrated */}
        <div className="hidden xl:flex items-center mr-4" suppressHydrationWarning>
          <QuickActions />
        </div>
        
        {/* Profile */}
        <div className="flex items-center gap-x-3" suppressHydrationWarning>
          <div className="h-9 w-9 rounded-xl bg-gradient-to-r from-primary to-secondary text-white flex items-center justify-center text-sm font-bold shadow-sm" suppressHydrationWarning>
            RH
          </div>
          <div className="hidden lg:block text-right" suppressHydrationWarning>
            <p className="text-sm font-medium text-foreground">
              Santiago Hurtado
            </p>
            <p className="text-xs text-muted-foreground">
              Administrador
            </p>
          </div>
        </div>
    </div>
  );
}

