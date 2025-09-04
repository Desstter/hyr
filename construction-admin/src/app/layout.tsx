import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from '@/components/layout/sidebar';
import { TopBar } from '@/components/layout/topbar';
import { QuickActions } from '@/components/layout/quick-actions';
import { MobileFAB } from '@/components/layout/mobile-fab';
import { UndoToast } from '@/components/ui/undo-toast';
import { Toaster } from '@/components/ui/sonner';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "HYR Admin - Constructora & Soldadura",
  description: "Sistema de administración para empresa de construcción y soldadura",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={inter.className} suppressHydrationWarning={true}>
        <div className="min-h-screen bg-background" suppressHydrationWarning>
          {/* Sidebar */}
          <Sidebar />
          
          {/* Main content */}
          <div className="lg:pl-64" suppressHydrationWarning>
            {/* Top bar */}
            <TopBar />
            
            {/* Page content */}
            <main className="py-4 sm:py-6 ios-safe-area-bottom">
              <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8" suppressHydrationWarning>
                {children}
              </div>
            </main>
            
            {/* Desktop Quick Actions - Fallback for smaller screens */}
            <div className="hidden lg:block xl:hidden fixed top-20 right-6 z-40" suppressHydrationWarning>
              <QuickActions />
            </div>
          </div>
          
          {/* Mobile FAB */}
          <MobileFAB />
          
          {/* Mobile bottom padding for FAB */}
          <div className="lg:hidden h-20 ios-safe-area-bottom" suppressHydrationWarning />
        </div>
        
        {/* Toast notifications */}
        <Toaster 
          position="top-center"
          toastOptions={{
            style: {
              background: 'hsl(var(--card))',
              color: 'hsl(var(--card-foreground))',
              border: '1px solid hsl(var(--border))',
            },
          }}
        />
        
        {/* Undo functionality */}
        <UndoToast />
      </body>
    </html>
  );
}
