"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslations } from "@/lib/i18n";
import type { ProjectIncome } from "@/lib/api";
import { 
  Plus, 
  Search, 
  Filter,
  SortAsc,
  SortDesc
} from "lucide-react";
import { IncomeTable } from "./income-table";
import { IncomesFilters } from "./incomes-filters";

interface IncomesListProps {
  incomes: ProjectIncome[];
  onRefresh: () => void;
  onCreateIncome: () => void;
}

export function IncomesList({ incomes, onRefresh, onCreateIncome }: IncomesListProps) {
  const t = useTranslations("es");
  
  // Filters and search state
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<"date" | "amount" | "concept">("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    projectId: "",
    paymentMethod: "",
    dateFrom: "",
    dateTo: "",
    amountMin: "",
    amountMax: "",
  });

  // Filter and sort incomes
  const filteredAndSortedIncomes = useMemo(() => {
    let filtered = [...incomes];

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(income =>
        income.concept?.toLowerCase().includes(term) ||
        income.project_name?.toLowerCase().includes(term) ||
        income.invoice_number?.toLowerCase().includes(term) ||
        income.notes?.toLowerCase().includes(term)
      );
    }

    // Apply additional filters
    if (filters.projectId) {
      filtered = filtered.filter(income => income.project_id === filters.projectId);
    }

    if (filters.paymentMethod) {
      filtered = filtered.filter(income => income.payment_method === filters.paymentMethod);
    }

    if (filters.dateFrom) {
      filtered = filtered.filter(income => income.date >= filters.dateFrom);
    }

    if (filters.dateTo) {
      filtered = filtered.filter(income => income.date <= filters.dateTo);
    }

    if (filters.amountMin) {
      const minAmount = parseFloat(filters.amountMin);
      filtered = filtered.filter(income => income.amount >= minAmount);
    }

    if (filters.amountMax) {
      const maxAmount = parseFloat(filters.amountMax);
      filtered = filtered.filter(income => income.amount <= maxAmount);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: string | number = a[sortField];
      let bValue: string | number = b[sortField];

      if (sortField === "date") {
        aValue = new Date(aValue || 0).getTime();
        bValue = new Date(bValue || 0).getTime();
      } else if (sortField === "amount") {
        aValue = aValue || 0;
        bValue = bValue || 0;
      } else if (sortField === "concept") {
        aValue = ((aValue as string) || "").toLowerCase();
        bValue = ((bValue as string) || "").toLowerCase();
      }

      if (sortDirection === "asc") {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } 
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      
    });

    return filtered;
  }, [incomes, searchTerm, sortField, sortDirection, filters]);

  const handleSort = (field: "date" | "amount" | "concept") => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const clearFilters = () => {
    setSearchTerm("");
    setFilters({
      projectId: "",
      paymentMethod: "",
      dateFrom: "",
      dateTo: "",
      amountMin: "",
      amountMax: "",
    });
  };

  const activeFiltersCount = Object.values(filters).filter(value => value !== "").length + 
    (searchTerm ? 1 : 0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const totalAmount = filteredAndSortedIncomes.reduce((sum, income) => sum + (income.amount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Lista de Ingresos</h2>
          <p className="text-muted-foreground">
            Gestión completa de todos los ingresos empresariales
          </p>
        </div>
        <Button onClick={onCreateIncome}>
          <Plus className="h-4 w-4 mr-2" />
          {t.incomes.newIncome}
        </Button>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Búsqueda y Filtros</CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filtros
                {activeFiltersCount > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 text-xs bg-primary text-primary-foreground rounded-full">
                    {activeFiltersCount}
                  </span>
                )}
              </Button>
              {activeFiltersCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                >
                  Limpiar
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t.incomes.searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <IncomesFilters
              filters={filters}
              onFiltersChange={setFilters}
            />
          )}

          {/* Sort Options */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Ordenar por:</span>
            <Button
              variant={sortField === "date" ? "default" : "outline"}
              size="sm"
              onClick={() => handleSort("date")}
            >
              Fecha
              {sortField === "date" && (
                sortDirection === "asc" ? 
                <SortAsc className="h-3 w-3 ml-1" /> : 
                <SortDesc className="h-3 w-3 ml-1" />
              )}
            </Button>
            <Button
              variant={sortField === "amount" ? "default" : "outline"}
              size="sm"
              onClick={() => handleSort("amount")}
            >
              Monto
              {sortField === "amount" && (
                sortDirection === "asc" ? 
                <SortAsc className="h-3 w-3 ml-1" /> : 
                <SortDesc className="h-3 w-3 ml-1" />
              )}
            </Button>
            <Button
              variant={sortField === "concept" ? "default" : "outline"}
              size="sm"
              onClick={() => handleSort("concept")}
            >
              Concepto
              {sortField === "concept" && (
                sortDirection === "asc" ? 
                <SortAsc className="h-3 w-3 ml-1" /> : 
                <SortDesc className="h-3 w-3 ml-1" />
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results Summary */}
      <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
        <div>
          <p className="text-sm text-muted-foreground">
            Mostrando <span className="font-medium">{filteredAndSortedIncomes.length}</span> de{" "}
            <span className="font-medium">{incomes.length}</span> ingresos
            {activeFiltersCount > 0 && " (filtrados)"}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Total mostrado</p>
          <p className="font-bold text-green-600">
            {formatCurrency(totalAmount)}
          </p>
        </div>
      </div>

      {/* Incomes Table */}
      <IncomeTable
        incomes={filteredAndSortedIncomes}
        onRefresh={onRefresh}
      />

      {/* Empty State */}
      {filteredAndSortedIncomes.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <div className="mx-auto w-12 h-12 bg-muted rounded-lg flex items-center justify-center mb-4">
              <Search className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-2">
              {searchTerm || activeFiltersCount > 0 ? "No se encontraron resultados" : t.incomes.noIncomes}
            </h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm || activeFiltersCount > 0 
                ? "Intenta ajustar los filtros de búsqueda" 
                : "Registra tu primer ingreso para comenzar"
              }
            </p>
            {(searchTerm || activeFiltersCount > 0) ? (
              <Button variant="outline" onClick={clearFilters}>
                Limpiar filtros
              </Button>
            ) : (
              <Button onClick={onCreateIncome}>
                <Plus className="h-4 w-4 mr-2" />
                {t.incomes.newIncome}
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}