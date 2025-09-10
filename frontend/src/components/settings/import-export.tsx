"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { api, handleApiError } from "@/lib/api";
import type { Project, Client, Expense, Personnel } from "@/lib/api";
import {
  Download,
  Upload,
  FileText,
  AlertTriangle,
  Database,
} from "lucide-react";
import { toast } from "sonner";
import Papa from "papaparse";
import { format } from "date-fns";

interface CsvRow {
  date?: string;
  fecha?: string;
  project_id?: string;
  projectid?: string;
  proyecto?: string;
  category?: string;
  categoria?: string;
  vendor?: string;
  proveedor?: string;
  description?: string;
  descripcion?: string;
  amount?: string;
  monto?: string;
  [key: string]: string | undefined;
}

interface ExportData {
  version: string;
  exportDate: string;
  projects: Project[];
  clients: Client[];
  expenses: Expense[];
  personnel: Personnel[];
}

export function ImportExport() {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importMode, setImportMode] = useState<"merge" | "overwrite">("merge");
  const [csvData, setCsvData] = useState("");
  const [isImportingCsv, setIsImportingCsv] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Export all data from API to JSON
  const handleExportJSON = async () => {
    setIsExporting(true);
    try {
      // Load all data from API
      const [projectsResult, clientsResult, expensesResult, personnelResult] =
        await Promise.all([
          api.projects.getAll(),
          api.clients.getAll(),
          api.expenses.list(),
          api.personnel.getAll(),
        ]);

      const projects = Array.isArray(projectsResult) ? projectsResult : [];
      const clients = Array.isArray(clientsResult) ? clientsResult : [];
      const expenses = Array.isArray(expensesResult) ? expensesResult : [];
      const personnel = Array.isArray(personnelResult) ? personnelResult : [];

      const exportData: ExportData = {
        version: "1.0",
        exportDate: new Date().toISOString(),
        projects,
        clients,
        expenses,
        personnel,
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `hyr-constructora-backup-${format(new Date(), "yyyy-MM-dd-HHmm")}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(
        `Datos exportados exitosamente: ${projects.length} proyectos, ${clients.length} clientes, ${expenses.length} gastos, ${personnel.length} empleados`
      );
    } catch (error) {
      console.error("Export failed:", error);
      const errorMessage = handleApiError(error);
      toast.error("Error al exportar los datos: " + errorMessage);
    } finally {
      setIsExporting(false);
    }
  };

  // Import JSON data back to API
  const handleImportJSON = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const text = await file.text();
      const data: ExportData = JSON.parse(text);

      // Basic validation
      if (
        !data.projects &&
        !data.clients &&
        !data.expenses &&
        !data.personnel
      ) {
        throw new Error(
          "Formato de archivo inválido - no se encontraron datos válidos"
        );
      }

      let importedCount = 0;

      // Import clients first (they're referenced by projects)
      if (data.clients && Array.isArray(data.clients)) {
        for (const client of data.clients) {
          try {
            if (importMode === "overwrite") {
              await api.clients.update(client.id, client);
            } else {
              await api.clients.create(client);
            }
            importedCount++;
          } catch (err) {
            if (importMode === "merge") {
              // Try to update if create failed (already exists)
              try {
                await api.clients.update(client.id, client);
                importedCount++;
              } catch (updateErr) {
                console.warn(
                  "Failed to import/update client:",
                  client.name,
                  "Create error:",
                  err,
                  "Update error:",
                  updateErr
                );
              }
            }
          }
        }
      }

      // Import personnel
      if (data.personnel && Array.isArray(data.personnel)) {
        for (const person of data.personnel) {
          try {
            if (importMode === "overwrite") {
              await api.personnel.update(person.id, person);
            } else {
              await api.personnel.create(person);
            }
            importedCount++;
          } catch (err) {
            if (importMode === "merge") {
              try {
                await api.personnel.update(person.id, person);
                importedCount++;
              } catch (updateErr) {
                console.warn(
                  "Failed to import/update personnel:",
                  person.name,
                  "Create error:",
                  err,
                  "Update error:",
                  updateErr
                );
              }
            }
          }
        }
      }

      // Import projects
      if (data.projects && Array.isArray(data.projects)) {
        for (const project of data.projects) {
          try {
            if (importMode === "overwrite") {
              await api.projects.update(project.id, project);
            } else {
              await api.projects.create(project);
            }
            importedCount++;
          } catch (err) {
            if (importMode === "merge") {
              try {
                await api.projects.update(project.id, project);
                importedCount++;
              } catch (updateErr) {
                console.warn(
                  "Failed to import/update project:",
                  project.name,
                  "Create error:",
                  err,
                  "Update error:",
                  updateErr
                );
              }
            }
          }
        }
      }

      // Import expenses
      if (data.expenses && Array.isArray(data.expenses)) {
        for (const expense of data.expenses) {
          try {
            if (importMode === "overwrite") {
              await api.expenses.update(expense.id, expense);
            } else {
              await api.expenses.create(expense);
            }
            importedCount++;
          } catch (err) {
            if (importMode === "merge") {
              try {
                await api.expenses.update(expense.id, expense);
                importedCount++;
              } catch (updateErr) {
                console.warn(
                  "Failed to import/update expense:",
                  expense.description,
                  "Create error:",
                  err,
                  "Update error:",
                  updateErr
                );
              }
            }
          }
        }
      }

      toast.success(
        `Datos importados exitosamente: ${importedCount} registros procesados (modo: ${importMode === "merge" ? "combinar" : "sobrescribir"})`
      );

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error("Import failed:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Error desconocido";
      toast.error("Error al importar los datos: " + errorMessage);
    } finally {
      setIsImporting(false);
    }
  };

  // Import CSV expenses
  const handleImportCSV = async () => {
    if (!csvData.trim()) {
      toast.error("Por favor ingresa datos CSV");
      return;
    }

    setIsImportingCsv(true);
    try {
      const parsed = Papa.parse(csvData, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header: string) => header.toLowerCase().trim(),
      });

      if (parsed.errors.length > 0) {
        console.warn("CSV parsing warnings:", parsed.errors);
      }

      const expenses = [];
      const currentDate = format(new Date(), "yyyy-MM-dd");

      for (const [index, row] of parsed.data.entries()) {
        try {
          const csvRow = row as CsvRow;
          const expenseData = {
            date: csvRow.date || csvRow.fecha || currentDate,
            project_id:
              csvRow.project_id ||
              csvRow.projectid ||
              csvRow.proyecto ||
              undefined,
            category:
              csvRow.category || csvRow.categoria || "materials",
            vendor: csvRow.vendor || csvRow.proveedor || undefined,
            description:
              csvRow.description ||
              csvRow.descripcion ||
              `Gasto importado CSV #${index + 1}`,
            amount: parseFloat(
              csvRow.amount || csvRow.monto || "0"
            ),
          };

          // Validate required fields
          if (expenseData.amount <= 0) {
            console.warn(`Skipping row ${index + 1}: invalid amount`);
            continue;
          }

          // Validate category
          const validCategories = [
            "materials",
            "labor",
            "equipment",
            "overhead",
          ];
          if (!validCategories.includes(expenseData.category)) {
            expenseData.category = "materials"; // Default fallback
          }

          expenses.push(expenseData);
        } catch (error) {
          console.warn(`Error processing row ${index + 1}:`, error);
        }
      }

      if (expenses.length === 0) {
        throw new Error("No se pudieron procesar gastos válidos del CSV");
      }

      // Import expenses via API
      let successCount = 0;
      for (const expense of expenses) {
        try {
          await api.expenses.create({
            ...expense,
            category: expense.category as "materials" | "labor" | "equipment" | "overhead"
          });
          successCount++;
        } catch (error) {
          console.warn("Failed to create expense:", expense.description, error);
        }
      }

      toast.success(
        `${successCount}/${expenses.length} gastos importados desde CSV`
      );
      setCsvData("");
    } catch (error) {
      console.error("CSV import failed:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Error desconocido";
      toast.error("Error al importar CSV: " + errorMessage);
    } finally {
      setIsImportingCsv(false);
    }
  };

  // Export CSV template
  const handleExportCSVTemplate = () => {
    const csvTemplate = `date,amount,category,description,vendor,project_id
2024-12-01,150000,materials,Cemento Portland 50kg,Ferretería Central,
2024-12-01,85000,labor,Soldadura especializada,Juan Pérez,
2024-12-02,45000,equipment,Alquiler soldadora,Equipos Industriales,
2024-12-02,25000,overhead,Transporte materiales,Transportes HYR,`;

    const blob = new Blob([csvTemplate], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "plantilla-gastos-hyr.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success("Plantilla CSV descargada");
  };

  return (
    <div className="space-y-6">
      {/* JSON Export/Import */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Database className="h-5 w-5" />
            <span>Respaldo y Restauración (JSON)</span>
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Exporta e importa todos los datos del sistema: proyectos, clientes,
            empleados y gastos
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Export */}
          <div className="space-y-2">
            <Label>Exportar todos los datos</Label>
            <p className="text-sm text-muted-foreground">
              Descarga un archivo JSON con todos tus proyectos, clientes,
              empleados y gastos desde PostgreSQL.
            </p>
            <Button
              onClick={handleExportJSON}
              disabled={isExporting}
              className="w-full"
            >
              <Download className="h-4 w-4 mr-2" />
              {isExporting ? "Exportando datos..." : "Exportar JSON Completo"}
            </Button>
          </div>

          <div className="border-t pt-4">
            <div className="space-y-4">
              <div>
                <Label>Importar desde JSON</Label>
                <p className="text-sm text-muted-foreground">
                  Restaura tus datos desde un archivo de respaldo. Los datos se
                  importarán a PostgreSQL.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="import-mode">Modo de importación</Label>
                <Select
                  value={importMode}
                  onValueChange={(value: "merge" | "overwrite") =>
                    setImportMode(value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar modo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="merge">
                      Combinar (mantener datos existentes)
                    </SelectItem>
                    <SelectItem value="overwrite">
                      Sobrescribir (actualizar registros existentes)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {importMode === "overwrite" && (
                <div className="flex items-start space-x-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-yellow-800">
                      ¡Atención!
                    </p>
                    <p className="text-sm text-yellow-700">
                      El modo sobrescribir actualizará los registros existentes
                      con los datos del archivo.
                    </p>
                  </div>
                </div>
              )}

              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleImportJSON}
                  disabled={isImporting}
                  className="hidden"
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isImporting}
                  variant="outline"
                  className="w-full"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {isImporting
                    ? "Importando datos..."
                    : "Seleccionar archivo JSON"}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CSV Import */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>Importar Gastos desde CSV</span>
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Importa gastos masivamente desde datos CSV
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={handleExportCSVTemplate}
              className="flex-1"
            >
              <Download className="h-4 w-4 mr-2" />
              Descargar Plantilla
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="csv-data">Datos CSV</Label>
            <p className="text-sm text-muted-foreground">
              Columnas requeridas:{" "}
              <code>date, amount, category, description</code>
              <br />
              Columnas opcionales: <code>vendor, project_id</code>
              <br />
              Categorías válidas: materials, labor, equipment, overhead
            </p>
            <Textarea
              id="csv-data"
              value={csvData}
              onChange={e => setCsvData(e.target.value)}
              placeholder="date,amount,category,description,vendor,project_id
2024-12-01,150000,materials,Cemento Portland 50kg,Ferretería Central,
2024-12-01,85000,labor,Soldadura especializada,Juan Pérez,
2024-12-02,45000,equipment,Alquiler soldadora,Equipos Industriales,"
              rows={8}
              className="font-mono text-sm"
            />
          </div>

          <Button
            onClick={handleImportCSV}
            disabled={!csvData.trim() || isImportingCsv}
            className="w-full"
          >
            <Upload className="h-4 w-4 mr-2" />
            {isImportingCsv
              ? "Importando gastos CSV..."
              : "Importar Gastos desde CSV"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
