"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PersonnelTable } from "@/components/personnel/personnel-table";
import { PersonnelCards } from "@/components/personnel/personnel-cards";
import { PersonnelDialog } from "@/components/personnel/personnel-dialog";
import { useTranslations } from "@/lib/i18n";
import { personnelService } from "@/lib/api/personnel";
import type { Personnel } from "@/lib/api/types";
import {
  Plus,
  Table,
  Grid3x3,
  Search,
  Loader2,
  AlertCircle,
  Clock,
  CalendarDays,
  User,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { TimeEntryDialog } from "@/components/time-entries/time-entry-dialog";
import { TimeEntriesTable } from "@/components/time-entries/time-entries-table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type ViewMode = "table" | "cards";

export default function PersonnelPage() {
  const t = useTranslations("es");

  // Estado local
  const [showPersonnelDialog, setShowPersonnelDialog] = useState(false);
  const [showTimeEntryDialog, setShowTimeEntryDialog] = useState(false);
  const [selectedPersonnelForTime, setSelectedPersonnelForTime] = useState<string>("");
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("active");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<string>("personnel");

  // Estado para datos API
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<{
    total: number;
    active: number;
    totalMonthlyCost: number;
  } | null>(null);

  // Cargar datos de personal
  const loadPersonnel = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const filters: Record<string, string> = {};
      if (statusFilter !== "all") filters.status = statusFilter;
      if (departmentFilter !== "all") filters.department = departmentFilter;

      const [personnelData, statsData] = await Promise.all([
        personnelService.getAll(filters),
        personnelService.getStats().catch(() => null), // Stats opcional
      ]);

      setPersonnel(personnelData);
      setStats(statsData);
    } catch (err: unknown) {
      console.error("Error loading personnel:", err);
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Error al cargar el personal. Por favor intente nuevamente.";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, departmentFilter]);

  // Efecto para cargar datos iniciales
  useEffect(() => {
    loadPersonnel();
  }, [loadPersonnel]);

  // Filtrar personal por búsqueda
  const filteredPersonnel = personnel.filter(person => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      person.name.toLowerCase().includes(searchLower) ||
      person.document_number?.toLowerCase().includes(searchLower) ||
      person.position?.toLowerCase().includes(searchLower)
    );
  });

  // Handler para éxito del dialog
  const handleDialogSuccess = () => {
    setShowPersonnelDialog(false);
    loadPersonnel(); // Recargar datos
  };

  // Handler para registrar horas de un empleado específico
  const _handleRegisterHours = (personnelId: string) => {
    setSelectedPersonnelForTime(personnelId);
    setShowTimeEntryDialog(true);
  };

  // Handler para ver horas de un empleado
  const _handleViewHours = (_personnelId: string) => {
    setActiveTab("time-entries");
    // El componente TimeEntriesTable se filtrará automáticamente por el personnelId
  };

  // Manejo de estados de carga
  if (loading && personnel.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Cargando personal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            {t.personnel.title}
          </h1>
          <p className="text-muted-foreground">
            Gestiona a todo el personal de la constructora y soldadura
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setShowPersonnelDialog(true)}
            disabled={loading && personnel.length === 0}
          >
            <Plus className="h-4 w-4 mr-2" />
            {t.personnel.newEmployee}
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowTimeEntryDialog(true)}
            disabled={loading && personnel.length === 0}
          >
            <Clock className="h-4 w-4 mr-2" />
            Registrar Horas
          </Button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="flex items-center p-4">
            <AlertCircle className="h-4 w-4 text-red-500 mr-2" />
            <div className="flex-1">
              <p className="text-red-700">{error}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={loadPersonnel}
              className="ml-2"
            >
              Reintentar
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Main Content with Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="personnel" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Personal
          </TabsTrigger>
          <TabsTrigger value="time-entries" className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            Registro de Horas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="personnel" className="space-y-6">
          {/* Filters and View Toggle */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-4 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                <Input
                  placeholder="Buscar empleados..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder={t.personnel.filters.allStatuses} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {t.personnel.filters.allStatuses}
                  </SelectItem>
                  <SelectItem value="active">{t.personnelStatus.active}</SelectItem>
                  <SelectItem value="on_leave">
                    {t.personnelStatus.on_leave}
                  </SelectItem>
                  <SelectItem value="inactive">
                    {t.personnelStatus.inactive}
                  </SelectItem>
                  <SelectItem value="terminated">
                    {t.personnelStatus.terminated}
                  </SelectItem>
                </SelectContent>
              </Select>

              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder={t.personnel.filters.allDepartments} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {t.personnel.filters.allDepartments}
                  </SelectItem>
                  <SelectItem value="construction">
                    {t.departments.construction}
                  </SelectItem>
                  <SelectItem value="welding">{t.departments.welding}</SelectItem>
                  <SelectItem value="administration">
                    {t.departments.administration}
                  </SelectItem>
                  <SelectItem value="maintenance">
                    {t.departments.maintenance}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* View Mode Toggle */}
            <div className="flex rounded-lg border">
              <Button
                variant={viewMode === "table" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("table")}
                className="rounded-r-none"
              >
                <Table className="h-4 w-4" />
                <span className="sr-only">Vista de tabla</span>
              </Button>
              <Button
                variant={viewMode === "cards" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("cards")}
                className="rounded-l-none"
              >
                <Grid3x3 className="h-4 w-4" />
                <span className="sr-only">Vista de tarjetas</span>
              </Button>
            </div>
          </div>

          {/* Content */}
          {filteredPersonnel.length === 0 && !loading ? (
            <Card>
              <CardContent className="text-center py-12">
                <p className="text-muted-foreground">
                  {searchTerm ||
                  statusFilter !== "all" ||
                  departmentFilter !== "all"
                    ? "No se encontraron empleados con los filtros aplicados."
                    : "No hay empleados registrados aún."}
                </p>
                {!searchTerm &&
                  statusFilter === "all" &&
                  departmentFilter === "all" && (
                    <Button
                      onClick={() => setShowPersonnelDialog(true)}
                      className="mt-4"
                      variant="outline"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Agregar primer empleado
                    </Button>
                  )}
              </CardContent>
            </Card>
          ) : viewMode === "table" ? (
            <PersonnelTable
              personnel={filteredPersonnel}
              loading={loading}
              onRefresh={loadPersonnel}
              searchTerm={searchTerm}
              statusFilter={statusFilter}
              departmentFilter={departmentFilter}
            />
          ) : (
            <PersonnelCards
              personnel={filteredPersonnel}
              loading={loading}
              onRefresh={loadPersonnel}
              searchTerm={searchTerm}
              statusFilter={statusFilter}
              departmentFilter={departmentFilter}
            />
          )}
        </TabsContent>

        <TabsContent value="time-entries">
          <TimeEntriesTable 
            onRefresh={loadPersonnel}
            showFilters={true}
          />
        </TabsContent>
      </Tabs>

      {/* Personnel Dialog */}
      <PersonnelDialog
        open={showPersonnelDialog}
        onOpenChange={setShowPersonnelDialog}
        onSuccess={handleDialogSuccess}
      />

      {/* Time Entry Dialog */}
      <TimeEntryDialog
        open={showTimeEntryDialog}
        onOpenChange={(open) => {
          setShowTimeEntryDialog(open);
          if (!open) {
            setSelectedPersonnelForTime("");
          }
        }}
        defaultPersonnelId={selectedPersonnelForTime}
        onSuccess={() => {
          loadPersonnel();
          setShowTimeEntryDialog(false);
          setSelectedPersonnelForTime("");
        }}
      />
    </div>
  );
}
