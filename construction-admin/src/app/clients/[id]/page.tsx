'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ClientStatsCard } from '@/components/clients/client-stats-card';
import { ClientProjectsList } from '@/components/clients/client-projects-list';
import { ClientDialog } from '@/components/clients/client-dialog';
import { api, handleApiError } from '@/lib/api';
import type { Client } from '@/lib/api';
import { useTranslations } from '@/lib/i18n';
import { 
  Building2, 
  ArrowLeft, 
  Edit, 
  Phone, 
  Mail, 
  MapPin,
  User
} from 'lucide-react';
import { toast } from 'sonner';

interface ClientDetailPageProps {
  params: { id: string };
}

export default function ClientDetailPage({ params }: ClientDetailPageProps) {
  const t = useTranslations('es');
  const router = useRouter();
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);

  const loadClient = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const clientData = await api.clients.getById(params.id);
      setClient(clientData);
    } catch (err) {
      const errorMessage = handleApiError(err);
      setError(errorMessage);
      console.error('Error loading client:', err);
      toast.error('Error cargando cliente: ' + errorMessage);
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    loadClient();
  }, [loadClient]);

  const handleClientUpdated = () => {
    setShowEditDialog(false);
    loadClient(); // Reload client data
  };

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="flex items-center space-x-4">
          <div className="h-10 w-20 bg-gray-100 animate-pulse rounded" />
          <div className="h-8 w-64 bg-gray-100 animate-pulse rounded" />
        </div>
        
        {/* Content Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="h-64 bg-gray-50 animate-pulse rounded-lg" />
            <div className="h-96 bg-gray-50 animate-pulse rounded-lg" />
          </div>
          <div className="space-y-6">
            <div className="h-80 bg-gray-50 animate-pulse rounded-lg" />
          </div>
        </div>
        
        <div className="text-center text-muted-foreground">
          Cargando información del cliente...
        </div>
      </div>
    );
  }

  // Error state
  if (error || !client) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={() => router.push('/clients')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver a Clientes
          </Button>
        </div>
        
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <h3 className="text-red-800 font-medium mb-2">
            {error || 'Cliente no encontrado'}
          </h3>
          <p className="text-red-600 text-sm mb-4">
            No se pudo cargar la información del cliente solicitado.
          </p>
          <Button 
            variant="outline" 
            onClick={loadClient}
            className="mr-2"
          >
            Reintentar
          </Button>
          <Button 
            variant="ghost"
            onClick={() => router.push('/clients')}
          >
            Volver a Lista
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center space-x-4 mb-2">
            <Button variant="ghost" onClick={() => router.push('/clients')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Clientes
            </Button>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center">
              <Building2 className="h-6 w-6 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-3xl font-bold tracking-tight text-foreground truncate">
                {client.name}
              </h1>
              <p className="text-muted-foreground">
                {t.clients.clientDetails}
              </p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button 
            onClick={() => setShowEditDialog(true)}
            className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-medium px-6 py-2 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
          >
            <Edit className="h-4 w-4 mr-2" />
            Editar Cliente
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Client Info & Projects */}
        <div className="lg:col-span-2 space-y-6">
          {/* Client Information Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Building2 className="h-5 w-5" />
                <span>Información del Cliente</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Contact Information */}
                <div className="space-y-4">
                  <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                    Información de Contacto
                  </h4>
                  
                  {client.contact_name && (
                    <div className="flex items-center space-x-3">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Contacto Principal</p>
                        <p className="text-sm text-muted-foreground">{client.contact_name}</p>
                      </div>
                    </div>
                  )}
                  
                  {client.phone && (
                    <div className="flex items-center space-x-3">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Teléfono</p>
                        <p className="text-sm text-muted-foreground">{client.phone}</p>
                      </div>
                    </div>
                  )}
                  
                  {client.email && (
                    <div className="flex items-center space-x-3">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Correo Electrónico</p>
                        <p className="text-sm text-muted-foreground">{client.email}</p>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Address Information */}
                <div className="space-y-4">
                  <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                    Ubicación
                  </h4>
                  
                  {client.address && (
                    <div className="flex items-start space-x-3">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Dirección</p>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {client.address}
                        </p>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center space-x-3">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Cliente desde</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(client.created_at).toLocaleDateString('es-ES', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Projects List */}
          <ClientProjectsList client={client} />
        </div>

        {/* Right Column - Statistics */}
        <div className="space-y-6">
          <ClientStatsCard client={client} />
        </div>
      </div>

      {/* Edit Client Dialog */}
      <ClientDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        client={client}
        onClientSaved={handleClientUpdated}
      />
    </div>
  );
}