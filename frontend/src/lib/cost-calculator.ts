import { formatCurrency } from "@/lib/finance";
import type { CostEstimate, CostEstimateItem } from "./pdf-generator";

// Additional types for cost calculation
export interface CostTemplateItem {
  id: string;
  name: string;
  type: "material" | "labor" | "equipment" | "overhead";
  unit: string;
  unitCost: number;
  description?: string;
}

export interface CostTemplate {
  id: string;
  name: string;
  category: string;
  currency: string;
  items: CostTemplateItem[];
}

interface HistoricalProject {
  category: string;
  description?: string;
  spent_total: number;
  budget_total: number;
}

export type Currency = "COP" | "USD" | "EUR";

export interface CostCalculationResult {
  subtotal: number;
  profitMargin: number;
  totalBeforeMargin: number;
  total: number;
  items: CostEstimateItem[];
}

export interface EstimateTemplateData {
  name: string;
  category: string;
  description?: string;
  baseItems: Omit<CostTemplateItem, "id">[];
}

/**
 * Calculate total cost for an estimate
 */
export function calculateEstimateTotal(
  items: CostEstimateItem[],
  profitMargin: number = 0
): CostCalculationResult {
  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const profitAmount = (subtotal * profitMargin) / 100;
  const total = subtotal + profitAmount;

  return {
    subtotal,
    profitMargin,
    totalBeforeMargin: subtotal,
    total,
    items,
  };
}

/**
 * Calculate individual item total
 */
export function calculateItemTotal(unitCost: number, quantity: number): number {
  return unitCost * quantity;
}

/**
 * Create estimate item from template item
 */
export function createEstimateItemFromTemplate(
  templateItem: CostTemplateItem,
  quantity: number = 1
): Omit<CostEstimateItem, "id"> {
  return {
    name: templateItem.name,
    type: templateItem.type,
    unit: templateItem.unit,
    unitCost: templateItem.unitCost,
    quantity,
    total: calculateItemTotal(templateItem.unitCost, quantity),
    description: templateItem.description,
  };
}

/**
 * Generate estimate from template
 */
export function generateEstimateFromTemplate(
  template: CostTemplate,
  profitMargin: number = 15,
  itemQuantities?: Record<string, number>
): Omit<CostEstimate, "id" | "createdAt" | "updatedAt"> {
  const items: Omit<CostEstimateItem, "id">[] = template.items.map(
    templateItem => {
      const quantity = itemQuantities?.[templateItem.id] || 1;
      return createEstimateItemFromTemplate(templateItem, quantity);
    }
  );

  const calculation = calculateEstimateTotal(
    items as CostEstimateItem[],
    profitMargin
  );

  return {
    name: `Cotización - ${template.name}`,
    items: items as CostEstimateItem[],
    subtotal: calculation.subtotal,
    profitMargin,
    total: calculation.total,
    currency: template.currency,
  };
}

/**
 * Default cost templates for Colombian construction industry
 */
export const DEFAULT_COST_TEMPLATES: EstimateTemplateData[] = [
  {
    name: "Soldadura Estructural Básica",
    category: "structural_welding",
    description: "Plantilla para trabajos básicos de soldadura estructural",
    baseItems: [
      {
        name: "Electrodos E6013",
        type: "material",
        unit: "kg",
        unitCost: 8500,
        description: "Electrodos para soldadura general",
      },
      {
        name: 'Varilla Corrugada 1/2"',
        type: "material",
        unit: "kg",
        unitCost: 2800,
        description: "Acero corrugado para estructura",
      },
      {
        name: "Soldador Especializado",
        type: "labor",
        unit: "hora",
        unitCost: 15000,
        description: "Hora de soldador con experiencia",
      },
      {
        name: "Ayudante de Soldadura",
        type: "labor",
        unit: "hora",
        unitCost: 8000,
        description: "Hora de ayudante",
      },
      {
        name: "Alquiler Equipo de Soldadura",
        type: "equipment",
        unit: "día",
        unitCost: 45000,
        description: "Alquiler máquina soldadora",
      },
    ],
  },
  {
    name: "Construcción Residencial",
    category: "residential_construction",
    description: "Plantilla para proyectos de construcción residencial",
    baseItems: [
      {
        name: "Cemento Portland",
        type: "material",
        unit: "bulto",
        unitCost: 21000,
        description: "Cemento de 50kg",
      },
      {
        name: "Arena de Rio",
        type: "material",
        unit: "m³",
        unitCost: 45000,
        description: "Arena lavada para construcción",
      },
      {
        name: "Grava",
        type: "material",
        unit: "m³",
        unitCost: 52000,
        description: "Grava triturada",
      },
      {
        name: "Maestro de Obra",
        type: "labor",
        unit: "día",
        unitCost: 120000,
        description: "Día de maestro especializado",
      },
      {
        name: "Oficial",
        type: "labor",
        unit: "día",
        unitCost: 80000,
        description: "Día de oficial de construcción",
      },
      {
        name: "Ayudante",
        type: "labor",
        unit: "día",
        unitCost: 50000,
        description: "Día de ayudante general",
      },
    ],
  },
  {
    name: "Reparación Industrial",
    category: "industrial_repair",
    description: "Plantilla para reparaciones industriales",
    baseItems: [
      {
        name: "Soldadura MIG",
        type: "material",
        unit: "kg",
        unitCost: 12000,
        description: "Alambre MIG ER70S-6",
      },
      {
        name: "Gas Argón",
        type: "material",
        unit: "m³",
        unitCost: 85000,
        description: "Gas argón para soldadura MIG",
      },
      {
        name: "Técnico Especializado",
        type: "labor",
        unit: "hora",
        unitCost: 25000,
        description: "Hora de técnico industrial",
      },
      {
        name: "Transporte Equipo",
        type: "equipment",
        unit: "viaje",
        unitCost: 150000,
        description: "Transporte de equipo especializado",
      },
    ],
  },
];

/**
 * Format estimate for display
 */
export function formatEstimateForDisplay(
  estimate: CostEstimate,
  currency: Currency = "COP"
) {
  return {
    ...estimate,
    subtotalFormatted: formatCurrency(estimate.subtotal, currency),
    totalFormatted: formatCurrency(estimate.total, currency),
    profitMarginFormatted: `${estimate.profitMargin}%`,
    items: estimate.items.map(item => ({
      ...item,
      unitCostFormatted: formatCurrency(item.unitCost, currency),
      totalFormatted: formatCurrency(item.total, currency),
    })),
  };
}

/**
 * Calculate project cost based on historical data
 */
export function estimateProjectCostFromHistory(
  projectType: string,
  historicalProjects: HistoricalProject[],
  projectSize: number
): number {
  // Filter similar projects
  const similarProjects = historicalProjects.filter(
    p => p.category === projectType || p.description?.includes(projectType)
  );

  if (similarProjects.length === 0) {
    return 0;
  }

  // Calculate average cost per unit
  const avgCostPerUnit =
    similarProjects.reduce((sum, project) => {
      return sum + (project.spent_total || project.budget_total) / 1; // Removed project.size as it doesn't exist in interface
    }, 0) / similarProjects.length;

  return avgCostPerUnit * projectSize;
}
