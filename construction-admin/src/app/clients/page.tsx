'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ClientsTable } from '@/components/clients/clients-table';
import type { Client } from '@/lib/api';
import { ClientDialog } from '@/components/clients/client-dialog';
import { useTranslations } from '@/lib/i18n';
import { Plus, Building2 } from 'lucide-react';

export default function ClientsPage() {
  const t = useTranslations('es');
  const [showClientDialog, setShowClientDialog] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | undefined>();

  return (
    <div className="space-y-6">
      {/* Enhanced Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center">
              <Building2 className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                {t.clients.title}
              </h1>
              <p className="text-muted-foreground text-lg">
                Gestión integral de relaciones empresariales
              </p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button 
            onClick={() => {
              setEditingClient(undefined);
              setShowClientDialog(true);
            }}
            className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-medium px-6 py-2 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
          >
            <Plus className="h-4 w-4 mr-2" />
            {t.clients.newClient}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="space-y-6">
        {/* Clients Table */}
        <ClientsTable 
          onEditClient={(client) => {
            setEditingClient(client);
            setShowClientDialog(true);
          }}
        />
      </div>

      {/* Client Dialog */}
      <ClientDialog
        open={showClientDialog}
        onOpenChange={setShowClientDialog}
        client={editingClient}
        onClientSaved={() => {
          setShowClientDialog(false);
          setEditingClient(undefined);
          // The table will refresh automatically
        }}
      />
    </div>
  );
}