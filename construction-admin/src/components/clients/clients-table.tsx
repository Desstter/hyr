"use client";

import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { api, handleApiError } from "@/lib/api";
import type { Client } from "@/lib/api";
import { formatCurrency } from "@/lib/finance";
import { useTranslations } from "@/lib/i18n";
import {
  Search,
  Edit,
  Trash2,
  Building2,
  Users,
  DollarSign,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

interface ClientsTableProps {
  onEditClient?: (client: Client) => void;
}

export function ClientsTable({ onEditClient }: ClientsTableProps) {
  const t = useTranslations("es");
  const [searchQuery, setSearchQuery] = useState("");

  // State for API data
  const [clients, setClients] = useState<Client[]>([]);
  const [clientStats, setClientStats] = useState<Record<string, { projects: number; totalValue: number }>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Load data from API
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load clients
      const clientsResult = await api.clients.list({
        search: searchQuery || undefined,
      });
      const clientsData = clientsResult.data;

      setClients(clientsData);

      // Load stats for each client in parallel
      const statsPromises = clientsData.map(async client => {
        try {
          const stats = await api.clients.getClientStats(client.id);
          return { [client.id]: stats };
        } catch (err) {
          console.error(`Error loading stats for client ${client.id}:`, err);
          return { [client.id]: null };
        }
      });

      const statsResults = await Promise.all(statsPromises);
      const statsMap = statsResults.reduce(
        (acc, stat) => ({ ...acc, ...stat }),
        {}
      );
      setClientStats(statsMap);
    } catch (err) {
      const errorMessage = handleApiError(err);
      setError(errorMessage);
      console.error("Error loading clients data:", err);
      toast.error("Error cargando clientes: " + errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClient = async (client: Client) => {
    // Confirmación del usuario
    if (
      !confirm(
        `${t.clients.deleteConfirmation}\n\n"${client.name}"\n\nEsta acción no se puede deshacer.`
      )
    ) {
      return;
    }

    try {
      setDeleting(client.id);
      await api.clients.delete(client.id);
      toast.success(`Cliente "${client.name}" eliminado exitosamente`);

      // Recargar datos para actualizar la lista
      await loadData();
    } catch (err) {
      const errorMessage = handleApiError(err);
      console.error("Error deleting client:", err);

      // Mostrar mensaje de error específico
      if (errorMessage.includes("proyectos asociados")) {
        toast.error(t.clients.deleteError);
      } else {
        toast.error(`Error eliminando cliente: ${errorMessage}`);
      }
    } finally {
      setDeleting(null);
    }
  };

  // Filter clients
  const filteredClients = (clients || []).filter(
    client =>
      client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (client.contact_name &&
        client.contact_name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Calculate global statistics
  const totalClients = clients.length;
  const clientsWithProjects = Object.values(clientStats).filter(
    stats =>
      stats && (stats.active_projects > 0 || stats.completed_projects > 0)
  ).length;
  const totalRevenue = Object.values(clientStats).reduce(
    (sum, stats) => sum + (stats?.total_revenue || 0),
    0
  );

  // Loading state
  if (loading) {
    return (
      <div className="space-y-4">
        {/* Stats Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-20 bg-gray-100 animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Table Skeleton */}
        <div className="flex items-center space-x-2">
          <div className="h-10 bg-gray-100 animate-pulse rounded-md flex-1 max-w-sm" />
        </div>
        <div className="rounded-md border">
          <div className="h-64 bg-gray-50 animate-pulse" />
        </div>
        <div className="text-center text-muted-foreground">
          Cargando clientes desde PostgreSQL...
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-medium">Error cargando clientes</h3>
          <p className="text-red-600 text-sm mt-1">{error}</p>
          <button
            onClick={loadData}
            className="mt-2 bg-red-100 text-red-800 px-3 py-1 rounded text-sm hover:bg-red-200"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-blue-100">
                <Building2 className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">
                  {t.clients.totalClients}
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {totalClients}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-green-100">
                <Users className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">
                  {t.clients.activeClients}
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {clientsWithProjects}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-indigo-100">
                <DollarSign className="h-6 w-6 text-indigo-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">
                  {t.clients.totalRevenue}
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(totalRevenue)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder={t.clients.searchPlaceholder}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t.clients.name}</TableHead>
              <TableHead>{t.clients.contactName}</TableHead>
              <TableHead>{t.clients.phone}</TableHead>
              <TableHead>{t.clients.email}</TableHead>
              <TableHead>{t.clients.totalProjects}</TableHead>
              <TableHead>{t.clients.totalRevenue}</TableHead>
              <TableHead>{t.clients.actions}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredClients.map(client => {
              const stats = clientStats[client.id];
              const totalProjects =
                (stats?.active_projects || 0) +
                (stats?.completed_projects || 0);
              const revenue = stats?.total_revenue || 0;

              return (
                <TableRow key={client.id}>
                  <TableCell className="font-medium">
                    <div>
                      <div className="font-semibold">{client.name}</div>
                      {client.address && (
                        <div className="text-xs text-muted-foreground line-clamp-1">
                          {client.address}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{client.contact_name || "-"}</TableCell>
                  <TableCell>{client.phone || "-"}</TableCell>
                  <TableCell>{client.email || "-"}</TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-1">
                      <span className="font-medium">{totalProjects}</span>
                      {stats && (
                        <div className="text-xs text-muted-foreground">
                          ({stats.active_projects} activos)
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">
                      {formatCurrency(revenue)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEditClient?.(client)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteClient(client)}
                        disabled={deleting === client.id}
                        className="text-red-600 hover:text-red-800"
                      >
                        {deleting === client.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {filteredClients.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          {searchQuery
            ? "No se encontraron clientes con esos criterios"
            : "No hay clientes registrados"}
        </div>
      )}
    </div>
  );
}
