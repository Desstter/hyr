import { formatCurrency } from './finance';
import type { Client } from '@/lib/api/types';

/**
 * PDF Generation utilities for cost estimates
 * This is a basic implementation that can be enhanced with libraries like jsPDF or react-pdf
 */

// Define interfaces for cost estimation
export interface CostEstimateItem {
  id: string;
  name: string;
  type: 'material' | 'labor' | 'equipment' | 'overhead';
  quantity: number;
  unit: string;
  unitCost: number;
  total: number;
  description?: string;
}

export interface CostEstimate {
  id: string;
  name: string;
  items: CostEstimateItem[];
  subtotal: number;
  profitMargin: number;
  total: number;
  currency: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PDFEstimateData {
  estimate: CostEstimate;
  client?: Client;
  businessInfo: {
    name: string;
    contact: string;
    email?: string;
    phone?: string;
    address?: string;
  };
}

/**
 * Generate a simple HTML template for the estimate that can be printed or converted to PDF
 */
export function generateEstimateHTML(data: PDFEstimateData): string {
  const { estimate, client, businessInfo } = data;
  
  const now = new Date();
  const formatDate = (date: string) => new Date(date).toLocaleDateString('es-CO');
  
  return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Cotización - ${estimate.name}</title>
    <style>
        body {
            font-family: 'Arial', sans-serif;
            margin: 0;
            padding: 20px;
            color: #333;
            line-height: 1.6;
        }
        
        .header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #f59e0b;
        }
        
        .company-info {
            flex: 1;
        }
        
        .company-name {
            font-size: 24px;
            font-weight: bold;
            color: #f59e0b;
            margin-bottom: 5px;
        }
        
        .company-details {
            color: #666;
            font-size: 14px;
        }
        
        .quote-info {
            text-align: right;
            flex: 1;
        }
        
        .quote-title {
            font-size: 28px;
            font-weight: bold;
            color: #333;
            margin-bottom: 10px;
        }
        
        .quote-details {
            font-size: 14px;
            color: #666;
        }
        
        .client-section {
            margin: 30px 0;
            padding: 20px;
            background: #f9f9f9;
            border-left: 4px solid #f59e0b;
        }
        
        .client-title {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 10px;
            color: #333;
        }
        
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin: 30px 0;
        }
        
        .items-table th,
        .items-table td {
            padding: 12px 8px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }
        
        .items-table th {
            background: #f8f9fa;
            font-weight: bold;
            color: #333;
        }
        
        .items-table tr:hover {
            background: #f9f9f9;
        }
        
        .item-type {
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: bold;
        }
        
        .type-material { background: #dbeafe; color: #1e40af; }
        .type-labor { background: #dcfce7; color: #166534; }
        .type-equipment { background: #fed7aa; color: #c2410c; }
        .type-overhead { background: #e9d5ff; color: #7c3aed; }
        
        .totals-section {
            margin: 30px 0;
            padding: 20px;
            background: #f8f9fa;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
        }
        
        .totals-row {
            display: flex;
            justify-content: space-between;
            margin: 8px 0;
            font-size: 16px;
        }
        
        .total-final {
            font-size: 20px;
            font-weight: bold;
            color: #f59e0b;
            border-top: 2px solid #e5e7eb;
            padding-top: 10px;
        }
        
        .footer {
            margin-top: 50px;
            text-align: center;
            color: #666;
            font-size: 12px;
            border-top: 1px solid #ddd;
            padding-top: 20px;
        }
        
        .notes-section {
            margin: 30px 0;
            padding: 20px;
            background: #fffbeb;
            border-left: 4px solid #f59e0b;
        }
        
        .notes-title {
            font-weight: bold;
            margin-bottom: 10px;
        }
        
        @media print {
            body { margin: 0; padding: 15px; }
            .header { page-break-inside: avoid; }
            .totals-section { page-break-inside: avoid; }
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="company-info">
            <div class="company-name">${businessInfo.name}</div>
            <div class="company-details">
                ${businessInfo.contact}<br>
                ${businessInfo.email ? `${businessInfo.email}<br>` : ''}
                ${businessInfo.phone ? `${businessInfo.phone}<br>` : ''}
                ${businessInfo.address ? `${businessInfo.address}` : ''}
            </div>
        </div>
        <div class="quote-info">
            <div class="quote-title">COTIZACIÓN</div>
            <div class="quote-details">
                <strong>N° ${estimate.id.slice(-8).toUpperCase()}</strong><br>
                Fecha: ${formatDate(estimate.createdAt)}<br>
                ${estimate.updatedAt !== estimate.createdAt ? `Actualizada: ${formatDate(estimate.updatedAt)}<br>` : ''}
                Válida por: 30 días
            </div>
        </div>
    </div>

    ${client ? `
    <div class="client-section">
        <div class="client-title">Cliente</div>
        <div>
            <strong>${client.name}</strong><br>
            ${client.contact_name ? `Contacto: ${client.contact_name}<br>` : ''}
            ${client.email ? `Email: ${client.email}<br>` : ''}
            ${client.phone ? `Teléfono: ${client.phone}` : ''}
        </div>
    </div>
    ` : ''}

    <h2>Detalles de la Cotización: ${estimate.name}</h2>

    <table class="items-table">
        <thead>
            <tr>
                <th>Elemento</th>
                <th>Tipo</th>
                <th>Cantidad</th>
                <th>Unidad</th>
                <th>Costo Unitario</th>
                <th>Total</th>
            </tr>
        </thead>
        <tbody>
            ${estimate.items.map(item => `
                <tr>
                    <td>
                        <strong>${item.name}</strong>
                        ${item.description ? `<br><small style="color: #666;">${item.description}</small>` : ''}
                    </td>
                    <td>
                        <span class="item-type type-${item.type}">
                            ${getItemTypeLabel(item.type)}
                        </span>
                    </td>
                    <td>${item.quantity}</td>
                    <td>${item.unit}</td>
                    <td>${formatCurrency(item.unitCost, estimate.currency)}</td>
                    <td><strong>${formatCurrency(item.total, estimate.currency)}</strong></td>
                </tr>
            `).join('')}
        </tbody>
    </table>

    <div class="totals-section">
        <div class="totals-row">
            <span>Subtotal:</span>
            <span>${formatCurrency(estimate.subtotal, estimate.currency)}</span>
        </div>
        ${estimate.profitMargin > 0 ? `
        <div class="totals-row">
            <span>Margen de Ganancia (${estimate.profitMargin}%):</span>
            <span>${formatCurrency(estimate.total - estimate.subtotal, estimate.currency)}</span>
        </div>
        ` : ''}
        <div class="totals-row total-final">
            <span>TOTAL:</span>
            <span>${formatCurrency(estimate.total, estimate.currency)}</span>
        </div>
    </div>

    ${estimate.notes ? `
    <div class="notes-section">
        <div class="notes-title">Notas Adicionales:</div>
        <div>${estimate.notes.replace(/\n/g, '<br>')}</div>
    </div>
    ` : ''}

    <div class="footer">
        <p><strong>Condiciones:</strong></p>
        <p>• Los precios están expresados en pesos colombianos (COP)<br>
        • Esta cotización tiene una validez de 30 días<br>
        • Los precios no incluyen IVA a menos que se especifique lo contrario<br>
        • Se requiere anticipo del 50% para iniciar el proyecto</p>
        
        <p style="margin-top: 20px;">
            <strong>Gracias por confiar en ${businessInfo.name}</strong><br>
            Generado el ${now.toLocaleString('es-CO')}
        </p>
    </div>
</body>
</html>
  `;
}

function getItemTypeLabel(type: string): string {
  const labels = {
    material: 'Material',
    labor: 'Mano de Obra',
    equipment: 'Equipo',
    overhead: 'Gastos Generales',
  };
  return labels[type as keyof typeof labels] || type;
}

/**
 * Generate and download PDF (browser-based using print functionality)
 */
export function downloadEstimatePDF(data: PDFEstimateData): void {
  const htmlContent = generateEstimateHTML(data);
  
  // Create a new window with the HTML content
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    
    // Wait for content to load then trigger print
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
    };
  }
}

/**
 * Generate estimate preview HTML for modal or preview purposes
 */
export function generateEstimatePreview(data: PDFEstimateData): string {
  return generateEstimateHTML(data);
}

/**
 * Future enhancement: This is where you would integrate with libraries like:
 * - jsPDF for client-side PDF generation
 * - react-pdf for React-based PDF generation
 * - puppeteer for server-side PDF generation (if you add a backend)
 */
export async function generateAdvancedPDF(data: PDFEstimateData): Promise<Blob> {
  // This would be implemented with a proper PDF library
  // For now, return a placeholder
  throw new Error('Advanced PDF generation not yet implemented. Use downloadEstimatePDF for basic functionality.');
}