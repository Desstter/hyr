"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslations } from "@/lib/i18n";
import { api } from "@/lib/api";
import type { Project } from "@/lib/api";

interface FiltersState {
  projectId: string;
  paymentMethod: string;
  dateFrom: string;
  dateTo: string;
  amountMin: string;
  amountMax: string;
}

interface IncomesFiltersProps {
  filters: FiltersState;
  onFiltersChange: (filters: FiltersState) => void;
}

export function IncomesFilters({ filters, onFiltersChange }: IncomesFiltersProps) {
  const t = useTranslations("es");
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);

  // Load projects for filter
  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setLoadingProjects(true);
      const result = await api.projects.getAll();

      // Handle both direct array response and {data: array} response
      const projectsData = Array.isArray(result)
        ? result
        : Array.isArray((result as {data?: Project[]}).data)
          ? (result as {data: Project[]}).data
          : [];
      setProjects(projectsData);
    } catch (err) {
      console.error("Error loading projects:", err);
      setProjects([]);
    } finally {
      setLoadingProjects(false);
    }
  };

  const handleFilterChange = (key: keyof FiltersState, value: string) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    });
  };

  const paymentMethods = [
    { value: "transfer", label: t.incomes.transfer },
    { value: "cash", label: t.incomes.cash },
    { value: "check", label: t.incomes.check },
    { value: "card", label: t.incomes.card },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 p-4 bg-muted/30 rounded-lg">
      {/* Project Filter */}
      <div className="space-y-2">
        <Label htmlFor="project-filter">{t.incomes.project}</Label>
        <Select
          value={filters.projectId}
          onValueChange={(value) => handleFilterChange("projectId", value)}
        >
          <SelectTrigger id="project-filter">
            <SelectValue
              placeholder={
                loadingProjects
                  ? "Cargando proyectos..."
                  : t.incomes.allProjects
              }
            />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">{t.incomes.allProjects}</SelectItem>
            {projects.map((project) => (
              <SelectItem key={project.id} value={project.id}>
                {project.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Payment Method Filter */}
      <div className="space-y-2">
        <Label htmlFor="payment-method-filter">{t.incomes.paymentMethod}</Label>
        <Select
          value={filters.paymentMethod}
          onValueChange={(value) => handleFilterChange("paymentMethod", value)}
        >
          <SelectTrigger id="payment-method-filter">
            <SelectValue placeholder={t.incomes.allPaymentMethods} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">{t.incomes.allPaymentMethods}</SelectItem>
            {paymentMethods.map((method) => (
              <SelectItem key={method.value} value={method.value}>
                {method.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Date From Filter */}
      <div className="space-y-2">
        <Label htmlFor="date-from-filter">Fecha desde</Label>
        <Input
          id="date-from-filter"
          type="date"
          value={filters.dateFrom}
          onChange={(e) => handleFilterChange("dateFrom", e.target.value)}
        />
      </div>

      {/* Date To Filter */}
      <div className="space-y-2">
        <Label htmlFor="date-to-filter">Fecha hasta</Label>
        <Input
          id="date-to-filter"
          type="date"
          value={filters.dateTo}
          onChange={(e) => handleFilterChange("dateTo", e.target.value)}
        />
      </div>

      {/* Amount Min Filter */}
      <div className="space-y-2">
        <Label htmlFor="amount-min-filter">Monto mínimo (COP)</Label>
        <Input
          id="amount-min-filter"
          type="number"
          min="0"
          step="1000"
          placeholder="0"
          value={filters.amountMin}
          onChange={(e) => handleFilterChange("amountMin", e.target.value)}
        />
      </div>

      {/* Amount Max Filter */}
      <div className="space-y-2">
        <Label htmlFor="amount-max-filter">Monto máximo (COP)</Label>
        <Input
          id="amount-max-filter"
          type="number"
          min="0"
          step="1000"
          placeholder="Sin límite"
          value={filters.amountMax}
          onChange={(e) => handleFilterChange("amountMax", e.target.value)}
        />
      </div>
    </div>
  );
}