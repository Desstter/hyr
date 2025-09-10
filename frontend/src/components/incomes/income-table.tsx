"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useTranslations } from "@/lib/i18n";
import { api, handleApiError } from "@/lib/api";
import type { ProjectIncome } from "@/lib/api";
import { toast } from "sonner";
import { 
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  ExternalLink,
  CreditCard,
  Banknote,
  Receipt
} from "lucide-react";
import { IncomeDialog } from "./income-dialog";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import Link from "next/link";

interface IncomeTableProps {
  incomes: ProjectIncome[];
  onRefresh: () => void;
}

export function IncomeTable({ incomes, onRefresh }: IncomeTableProps) {
  const t = useTranslations("es");
  
  // State
  const [selectedIncome, setSelectedIncome] = useState<ProjectIncome | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [incomeToDelete, setIncomeToDelete] = useState<ProjectIncome | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Handle edit income
  const handleEdit = (income: ProjectIncome) => {
    setSelectedIncome(income);
    setShowEditDialog(true);
  };

  // Handle delete income
  const handleDeleteConfirm = (income: ProjectIncome) => {
    setIncomeToDelete(income);
    setShowDeleteDialog(true);
  };

  const handleDelete = async () => {
    if (!incomeToDelete) return;

    setDeletingId(incomeToDelete.id);
    try {
      await api.incomes.deleteIncome(incomeToDelete.id);
      toast.success(t.incomes.incomeDeleted);
      onRefresh();
    } catch (error) {
      console.error("Error deleting income:", error);
      const errorMessage = handleApiError(error);
      toast.error("Error al eliminar ingreso: " + errorMessage);
    } finally {
      setDeletingId(null);
      setShowDeleteDialog(false);
      setIncomeToDelete(null);
    }
  };

  // Format functions
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    try {
      const date = parseISO(dateString);
      return format(date, "dd MMM yyyy", { locale: es });
    } catch {
      return dateString;
    }
  };

  const getPaymentMethodLabel = (method: string) => {
    const labels = {
      transfer: t.incomes.transfer,
      cash: t.incomes.cash,
      check: t.incomes.check,
      card: t.incomes.card,
    };
    return labels[method as keyof typeof labels] || method;
  };

  const getPaymentMethodIcon = (method: string) => {
    const icons = {
      transfer: CreditCard,
      cash: Banknote,
      check: Receipt,
      card: CreditCard,
    };
    const Icon = icons[method as keyof typeof icons] || CreditCard;
    return <Icon className="h-4 w-4" />;
  };

  const getPaymentMethodVariant = (method: string) => {
    const variants = {
      transfer: "default",
      cash: "secondary",
      check: "outline",
      card: "destructive",
    };
    return variants[method as keyof typeof variants] || "default";
  };

  if (incomes.length === 0) {
    return null; // Empty state is handled by parent component
  }

  return (
    <>
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.incomes.date}</TableHead>
                  <TableHead>{t.incomes.project}</TableHead>
                  <TableHead>{t.incomes.concept}</TableHead>
                  <TableHead className="text-right">{t.incomes.amount}</TableHead>
                  <TableHead>{t.incomes.paymentMethod}</TableHead>
                  <TableHead>{t.incomes.invoiceNumber}</TableHead>
                  <TableHead className="w-[70px]">{t.incomes.actions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {incomes.map((income) => (
                  <TableRow key={income.id}>
                    {/* Date */}
                    <TableCell className="font-medium">
                      {formatDate(income.date)}
                    </TableCell>

                    {/* Project */}
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="truncate max-w-[150px]">
                          {income.project_name || `Proyecto ${income.project_id?.slice(0, 8)}`}
                        </span>
                        {income.project_id && (
                          <Link href={`/projects/${income.project_id}`}>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          </Link>
                        )}
                      </div>
                    </TableCell>

                    {/* Concept */}
                    <TableCell>
                      <div className="max-w-[200px]">
                        <p className="font-medium truncate">{income.concept}</p>
                        {income.notes && (
                          <p className="text-xs text-muted-foreground truncate">
                            {income.notes}
                          </p>
                        )}
                      </div>
                    </TableCell>

                    {/* Amount */}
                    <TableCell className="text-right">
                      <span className="font-bold text-green-600">
                        {formatCurrency(income.amount)}
                      </span>
                    </TableCell>

                    {/* Payment Method */}
                    <TableCell>
                      <Badge 
                        variant={getPaymentMethodVariant(income.payment_method) as any}
                        className="flex items-center gap-1 w-fit"
                      >
                        {getPaymentMethodIcon(income.payment_method)}
                        {getPaymentMethodLabel(income.payment_method)}
                      </Badge>
                    </TableCell>

                    {/* Invoice Number */}
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {income.invoice_number || "-"}
                      </span>
                    </TableCell>

                    {/* Actions */}
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(income)}>
                            <Edit className="h-4 w-4 mr-2" />
                            {t.common.edit}
                          </DropdownMenuItem>
                          {income.project_id && (
                            <DropdownMenuItem asChild>
                              <Link href={`/projects/${income.project_id}`}>
                                <Eye className="h-4 w-4 mr-2" />
                                {t.incomes.viewProject}
                              </Link>
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDeleteConfirm(income)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            {t.common.delete}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Income Dialog */}
      <IncomeDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        income={selectedIncome || undefined}
        onSuccess={() => {
          onRefresh();
          setSelectedIncome(null);
        }}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar eliminación</AlertDialogTitle>
            <AlertDialogDescription>
              {t.incomes.deleteConfirmation}
              {incomeToDelete && (
                <div className="mt-2 p-2 bg-muted rounded text-sm">
                  <strong>{incomeToDelete.concept}</strong><br />
                  {formatCurrency(incomeToDelete.amount)} - {formatDate(incomeToDelete.date)}
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!deletingId}>
              {t.common.cancel}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={!!deletingId}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingId ? "Eliminando..." : t.common.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}