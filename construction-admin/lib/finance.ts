import { format } from "date-fns";
import { es } from "date-fns/locale";

interface ExpenseData {
  date: string;
  amount: number;
}

interface ProjectData {
  status: string;
  endDate?: string;
  budget: number;
}

export function formatCurrency(
  amount: number,
  currency: string = "COP"
): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatCompactCurrency(
  amount: number,
  currency: string = "COP"
): string {
  const formatter = new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: currency,
    notation: "compact",
    compactDisplay: "short",
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  });

  return formatter.format(amount);
}

export function formatDate(date: string, locale: string = "es"): string {
  const dateObj = new Date(date);

  if (locale === "es") {
    return format(dateObj, "dd MMM yyyy", { locale: es });
  }

  return format(dateObj, "MMM dd, yyyy");
}

export function formatDateShort(date: string, locale: string = "es"): string {
  const dateObj = new Date(date);

  if (locale === "es") {
    return format(dateObj, "dd/MM/yy", { locale: es });
  }

  return format(dateObj, "MM/dd/yy");
}

export function calculateProjectProgress(
  budget: number,
  spent: number
): number {
  if (budget === 0) return 0;
  return Math.min((spent / budget) * 100, 100);
}

export function getProjectStatusColor(status: string): string {
  switch (status) {
    case "planned":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "in_progress":
      return "bg-amber-100 text-amber-800 border-amber-200";
    case "completed":
      return "bg-green-100 text-green-800 border-green-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
}

export function getProjectStatusLabel(
  status: string,
  locale: string = "es"
): string {
  const labels = {
    es: {
      planned: "Planificado",
      in_progress: "En Progreso",
      completed: "Completado",
    },
    en: {
      planned: "Planned",
      in_progress: "In Progress",
      completed: "Completed",
    },
  };

  return (
    labels[locale as keyof typeof labels]?.[status as keyof typeof labels.es] ||
    status
  );
}

export function getCategoryLabel(
  category: string,
  locale: string = "es"
): string {
  const labels = {
    es: {
      materials: "Materiales",
      labor: "Mano de Obra",
      equipment: "Equipos",
      misc: "Varios",
    },
    en: {
      materials: "Materials",
      labor: "Labor",
      equipment: "Equipment",
      misc: "Miscellaneous",
    },
  };

  return (
    labels[locale as keyof typeof labels]?.[
      category as keyof typeof labels.es
    ] || category
  );
}

export function calculateMonthlyData(
  expenses: ExpenseData[],
  projects: ProjectData[]
) {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const monthlyData: { [key: string]: { revenue: number; costs: number } } = {};

  // Initialize months
  for (let i = 5; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const key = format(date, "yyyy-MM");
    monthlyData[key] = { revenue: 0, costs: 0 };
  }

  // Calculate costs from expenses
  expenses.forEach(expense => {
    const expenseDate = new Date(expense.date);
    if (expenseDate >= sixMonthsAgo) {
      const key = format(expenseDate, "yyyy-MM");
      if (monthlyData[key]) {
        monthlyData[key].costs += expense.amount;
      }
    }
  });

  // Estimate revenue from completed projects
  projects.forEach(project => {
    if (project.status === "completed" && project.endDate) {
      const endDate = new Date(project.endDate);
      if (endDate >= sixMonthsAgo) {
        const key = format(endDate, "yyyy-MM");
        if (monthlyData[key]) {
          monthlyData[key].revenue += project.budget;
        }
      }
    }
  });

  return Object.entries(monthlyData).map(([month, data]) => ({
    month: format(new Date(month), "MMM", { locale: es }),
    revenue: data.revenue,
    costs: data.costs,
    profit: data.revenue - data.costs,
  }));
}
