"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/use-toast";
import { UserCheck, Plus, FileText, Search, Loader2, Eye } from "lucide-react";

interface Contractor {
  id: number;
  name: string;
  document_type: string;
  document_number: string;
  email?: string;
  phone?: string;
  address?: string;
  obligated_to_invoice: boolean;
  document_support_count: number;
  total_payments: number;
  created_at: string;
}

interface _DocumentSupport {
  id: string;
  ds_number: string;
  concept: string;
  base_amount: number;
  total_amount: number;
  dian_status: string;
  created_at: string;
}

export default function ContractorsPage() {
  const router = useRouter();
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterObligated, setFilterObligated] = useState<string>("all");

  // Dialog states
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showSupportDialog, setShowSupportDialog] = useState(false);
  const [selectedContractor, setSelectedContractor] =
    useState<Contractor | null>(null);

  // Form states
  const [contractorForm, setContractorForm] = useState({
    name: "",
    document_type: "CC",
    document_number: "",
    email: "",
    phone: "",
    address: "",
    obligated_to_invoice: false,
  });

  const [supportForm, setSupportForm] = useState({
    concept: "",
    base_amount: "",
    service_type: "general",
    apply_withholding: true,
  });

  const [submitting, setSubmitting] = useState(false);

  const loadContractors = useCallback(async () => {
    try {
      let url = "http://localhost:3001/api/contractors";
      const params = new URLSearchParams();

      if (searchTerm) params.append("search", searchTerm);
      if (filterObligated !== "all")
        params.append("obligated_to_invoice", filterObligated);

      if (params.toString()) url += "?" + params.toString();

      const response = await fetch(url);

      // Check if response is JSON
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error(
          "Server returned non-JSON response. Check if backend is running."
        );
      }

      const data = await response.json();

      if (response.ok && data.success) {
        setContractors(data.data.contractors || []);
      } else {
        toast({
          title: "Error",
          description: data.error || "No se pudieron cargar los contratistas",
          variant: "destructive",
        });
        // Set empty array on API error
        setContractors([]);
      }
    } catch (error) {
      console.error("Error loading contractors:", error);
      toast({
        title: "Error de conexión",
        description:
          "No se pudo conectar con el servidor. Verifique que el backend esté funcionando.",
        variant: "destructive",
      });
      // Set empty array on connection error
      setContractors([]);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, filterObligated]);

  useEffect(() => {
    loadContractors();
  }, [loadContractors]);

  const handleAddContractor = async () => {
    if (!contractorForm.name || !contractorForm.document_number) {
      toast({
        title: "Error",
        description: "Los campos nombre y documento son obligatorios",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch("http://localhost:3001/api/contractors", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(contractorForm),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "✅ Contratista creado",
          description: `${contractorForm.name} ha sido registrado exitosamente`,
        });

        setContractorForm({
          name: "",
          document_type: "CC",
          document_number: "",
          email: "",
          phone: "",
          address: "",
          obligated_to_invoice: false,
        });

        setShowAddDialog(false);
        loadContractors();
      } else {
        toast({
          title: "Error",
          description: data.error || "Error creando contratista",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error creating contractor:", error);
      toast({
        title: "Error de conexión",
        description: "No se pudo conectar con el servidor",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateDocumentSupport = async () => {
    if (
      !selectedContractor ||
      !supportForm.concept ||
      !supportForm.base_amount
    ) {
      toast({
        title: "Error",
        description: "Todos los campos son obligatorios",
        variant: "destructive",
      });
      return;
    }

    if (selectedContractor.obligated_to_invoice) {
      toast({
        title: "Error",
        description:
          "Este contratista está obligado a facturar. No puede generar documento soporte.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(
        "http://localhost:3001/api/contractors/document-support",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contractor_id: selectedContractor.id,
            concept: supportForm.concept,
            base_amount: parseFloat(supportForm.base_amount),
            service_type: supportForm.service_type,
            apply_withholding: supportForm.apply_withholding,
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        toast({
          title: "✅ Documento soporte creado",
          description: `${data.data.ds_number} generado exitosamente`,
        });

        setSupportForm({
          concept: "",
          base_amount: "",
          service_type: "general",
          apply_withholding: true,
        });

        setShowSupportDialog(false);
        setSelectedContractor(null);
        loadContractors();
      } else {
        toast({
          title: "Error",
          description: data.error || "Error creando documento soporte",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error creating document support:", error);
      toast({
        title: "Error de conexión",
        description: "No se pudo conectar con el servidor",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const filteredContractors = contractors.filter(contractor => {
    const matchesSearch =
      contractor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contractor.document_number.includes(searchTerm);

    if (filterObligated === "all") return matchesSearch;

    const isObligated = filterObligated === "true";
    return matchesSearch && contractor.obligated_to_invoice === isObligated;
  });

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Cargando contratistas...</span>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Contratistas</h1>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Contratista
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex space-x-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Buscar por nombre o documento..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-48">
              <Select
                value={filterObligated}
                onValueChange={setFilterObligated}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="true">Obligados a facturar</SelectItem>
                  <SelectItem value="false">No obligados</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Contratistas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredContractors.map(contractor => (
          <Card key={contractor.id} className="relative">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg">{contractor.name}</CardTitle>
                  <p className="text-sm text-gray-600">
                    {contractor.document_type} {contractor.document_number}
                  </p>
                </div>
                <Badge
                  variant={
                    contractor.obligated_to_invoice ? "default" : "secondary"
                  }
                  className="ml-2"
                >
                  {contractor.obligated_to_invoice ? "Factura" : "No Factura"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {contractor.email && (
                <p className="text-sm text-gray-600">{contractor.email}</p>
              )}
              {contractor.phone && (
                <p className="text-sm text-gray-600">{contractor.phone}</p>
              )}

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">
                    {contractor.document_support_count || 0}
                  </p>
                  <p className="text-xs text-gray-500">Doc. Soporte</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-green-600">
                    ${(contractor.total_payments || 0).toLocaleString("es-CO")}
                  </p>
                  <p className="text-xs text-gray-500">Total Pagos</p>
                </div>
              </div>

              <div className="flex space-x-2 pt-2">
                {!contractor.obligated_to_invoice && (
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      setSelectedContractor(contractor);
                      setShowSupportDialog(true);
                    }}
                  >
                    <FileText className="h-4 w-4 mr-1" />
                    Doc. Soporte
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`/contractors/${contractor.id}`)}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredContractors.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <UserCheck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">
              {searchTerm || filterObligated !== "all"
                ? "No se encontraron contratistas con los filtros aplicados"
                : "No hay contratistas registrados"}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Dialog Nuevo Contratista */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nuevo Contratista</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre *</Label>
              <Input
                value={contractorForm.name}
                onChange={e =>
                  setContractorForm(prev => ({ ...prev, name: e.target.value }))
                }
                placeholder="Nombre o razón social"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-2">
                <Label>Tipo Doc.</Label>
                <Select
                  value={contractorForm.document_type}
                  onValueChange={value =>
                    setContractorForm(prev => ({
                      ...prev,
                      document_type: value,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CC">CC</SelectItem>
                    <SelectItem value="CE">CE</SelectItem>
                    <SelectItem value="NIT">NIT</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Número *</Label>
                <Input
                  value={contractorForm.document_number}
                  onChange={e =>
                    setContractorForm(prev => ({
                      ...prev,
                      document_number: e.target.value,
                    }))
                  }
                  placeholder="Número de documento"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={contractorForm.email}
                onChange={e =>
                  setContractorForm(prev => ({
                    ...prev,
                    email: e.target.value,
                  }))
                }
                placeholder="contacto@empresa.com"
              />
            </div>

            <div className="space-y-2">
              <Label>Teléfono</Label>
              <Input
                value={contractorForm.phone}
                onChange={e =>
                  setContractorForm(prev => ({
                    ...prev,
                    phone: e.target.value,
                  }))
                }
                placeholder="+57 310 555 0123"
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="obligated"
                checked={contractorForm.obligated_to_invoice}
                onChange={e =>
                  setContractorForm(prev => ({
                    ...prev,
                    obligated_to_invoice: e.target.checked,
                  }))
                }
              />
              <Label htmlFor="obligated">
                ¿Obligado a facturar electrónicamente?
              </Label>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={handleAddContractor} disabled={submitting}>
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Crear
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Documento Soporte */}
      <Dialog open={showSupportDialog} onOpenChange={setShowSupportDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nuevo Documento Soporte</DialogTitle>
          </DialogHeader>
          {selectedContractor && (
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900">
                  {selectedContractor.name}
                </h4>
                <p className="text-sm text-blue-800">
                  {selectedContractor.document_type}{" "}
                  {selectedContractor.document_number}
                </p>
              </div>

              <div className="space-y-2">
                <Label>Concepto *</Label>
                <Input
                  value={supportForm.concept}
                  onChange={e =>
                    setSupportForm(prev => ({
                      ...prev,
                      concept: e.target.value,
                    }))
                  }
                  placeholder="Descripción del servicio prestado"
                />
              </div>

              <div className="space-y-2">
                <Label>Valor Base *</Label>
                <Input
                  type="number"
                  value={supportForm.base_amount}
                  onChange={e =>
                    setSupportForm(prev => ({
                      ...prev,
                      base_amount: e.target.value,
                    }))
                  }
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label>Tipo de Servicio</Label>
                <Select
                  value={supportForm.service_type}
                  onValueChange={value =>
                    setSupportForm(prev => ({ ...prev, service_type: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">Servicios Generales</SelectItem>
                    <SelectItem value="construction">Construcción</SelectItem>
                    <SelectItem value="consulting">Consultoría</SelectItem>
                    <SelectItem value="transport">Transporte</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="withholding"
                  checked={supportForm.apply_withholding}
                  onChange={e =>
                    setSupportForm(prev => ({
                      ...prev,
                      apply_withholding: e.target.checked,
                    }))
                  }
                />
                <Label htmlFor="withholding">
                  Aplicar retención en la fuente
                </Label>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowSupportDialog(false)}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleCreateDocumentSupport}
                  disabled={submitting}
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Crear Documento
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Información Legal */}
      <Card className="border-yellow-200 bg-yellow-50">
        <CardContent className="p-4">
          <h4 className="font-medium text-yellow-800 mb-2">
            📋 Información sobre Contratistas
          </h4>
          <ul className="text-yellow-700 text-sm space-y-1">
            <li>
              • <strong>Obligados a facturar:</strong> Pueden emitir facturas
              electrónicas (no aplica doc. soporte)
            </li>
            <li>
              • <strong>No obligados:</strong> Se les debe generar documento
              soporte por compras
            </li>
            <li>
              • <strong>Documento soporte:</strong> Obligatorio para compras a
              no obligados a facturar
            </li>
            <li>
              • <strong>Retenciones:</strong> Se aplican automáticamente según
              tipo de servicio
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
