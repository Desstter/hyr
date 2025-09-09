import { formatCurrency } from "./finance";
import type { Client } from "@/lib/api/types";
import jsPDF from "jspdf";

/**
 * PDF Generation utilities for cost estimates
 * This is a basic implementation that can be enhanced with libraries like jsPDF or react-pdf
 */

// Define interfaces for cost estimation
export interface CostEstimateItem {
  id: string;
  name: string;
  type: "material" | "labor" | "equipment" | "overhead";
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
  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("es-CO");

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
                ${businessInfo.email ? `${businessInfo.email}<br>` : ""}
                ${businessInfo.phone ? `${businessInfo.phone}<br>` : ""}
                ${businessInfo.address ? `${businessInfo.address}` : ""}
            </div>
        </div>
        <div class="quote-info">
            <div class="quote-title">COTIZACIÓN</div>
            <div class="quote-details">
                <strong>N° ${estimate.id.slice(-8).toUpperCase()}</strong><br>
                Fecha: ${formatDate(estimate.createdAt)}<br>
                ${estimate.updatedAt !== estimate.createdAt ? `Actualizada: ${formatDate(estimate.updatedAt)}<br>` : ""}
                Válida por: 30 días
            </div>
        </div>
    </div>

    ${
      client
        ? `
    <div class="client-section">
        <div class="client-title">Cliente</div>
        <div>
            <strong>${client.name}</strong><br>
            ${client.contact_name ? `Contacto: ${client.contact_name}<br>` : ""}
            ${client.email ? `Email: ${client.email}<br>` : ""}
            ${client.phone ? `Teléfono: ${client.phone}` : ""}
        </div>
    </div>
    `
        : ""
    }

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
            ${estimate.items
              .map(
                item => `
                <tr>
                    <td>
                        <strong>${item.name}</strong>
                        ${item.description ? `<br><small style="color: #666;">${item.description}</small>` : ""}
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
            `
              )
              .join("")}
        </tbody>
    </table>

    <div class="totals-section">
        <div class="totals-row">
            <span>Subtotal:</span>
            <span>${formatCurrency(estimate.subtotal, estimate.currency)}</span>
        </div>
        ${
          estimate.profitMargin > 0
            ? `
        <div class="totals-row">
            <span>Margen de Ganancia (${estimate.profitMargin}%):</span>
            <span>${formatCurrency(estimate.total - estimate.subtotal, estimate.currency)}</span>
        </div>
        `
            : ""
        }
        <div class="totals-row total-final">
            <span>TOTAL:</span>
            <span>${formatCurrency(estimate.total, estimate.currency)}</span>
        </div>
    </div>

    ${
      estimate.notes
        ? `
    <div class="notes-section">
        <div class="notes-title">Notas Adicionales:</div>
        <div>${estimate.notes.replace(/\n/g, "<br>")}</div>
    </div>
    `
        : ""
    }

    <div class="footer">
        <p><strong>Condiciones:</strong></p>
        <p>• Los precios están expresados en pesos colombianos (COP)<br>
        • Esta cotización tiene una validez de 30 días<br>
        • Los precios no incluyen IVA a menos que se especifique lo contrario<br>
        • Se requiere anticipo del 50% para iniciar el proyecto</p>
        
        <p style="margin-top: 20px;">
            <strong>Gracias por confiar en ${businessInfo.name}</strong><br>
            Generado el ${now.toLocaleString("es-CO")}
        </p>
    </div>
</body>
</html>
  `;
}

function getItemTypeLabel(type: string): string {
  const labels = {
    material: "Material",
    labor: "Mano de Obra",
    equipment: "Equipo",
    overhead: "Gastos Generales",
  };
  return labels[type as keyof typeof labels] || type;
}

/**
 * Generate and download PDF using basic print functionality (legacy)
 */
export function downloadEstimatePDF(data: PDFEstimateData): void {
  const htmlContent = generateEstimateHTML(data);

  // Create a new window with the HTML content
  const printWindow = window.open("", "_blank");
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
 * Download advanced PDF directly to user's device
 */
export async function downloadAdvancedPDF(
  data: PDFEstimateData,
  filename?: string
): Promise<void> {
  try {
    const pdfBlob = await generateAdvancedPDF(data);

    // Create download link
    const url = URL.createObjectURL(pdfBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download =
      filename ||
      `Cotizacion_${data.estimate.name.replace(/[^a-zA-Z0-9]/g, "_")}_${Date.now()}.pdf`;

    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Cleanup
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Error downloading advanced PDF:", error);
    throw error;
  }
}

/**
 * Generate professional PDF using jsPDF with HYR Constructora branding
 */
export async function generateAdvancedPDF(
  data: PDFEstimateData
): Promise<Blob> {
  try {
    const { estimate, client, businessInfo } = data;

    // Create new PDF document (A4, portrait)
    const doc = new jsPDF("p", "mm", "a4");
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 20;
    const contentWidth = pageWidth - margin * 2;
    let yPosition = margin;

    // Colors for branding
    const primaryColor: [number, number, number] = [245, 158, 11]; // Orange HYR
    const darkGray: [number, number, number] = [55, 65, 81];
    const lightGray: [number, number, number] = [156, 163, 175];
    const white: [number, number, number] = [255, 255, 255];

    // HEADER - Company Branding
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, pageWidth, 35, "F");

    // Company name and logo area
    doc.setTextColor(...white);
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.text("HYR CONSTRUCTORA & SOLDADURA", margin, 18);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(
      "Especialistas en Construcción y Soldadura Industrial",
      margin,
      26
    );

    // Contact info on right
    doc.text(
      businessInfo.phone || "Tel: +57 300 123 4567",
      pageWidth - margin - 50,
      18
    );
    doc.text(
      businessInfo.email || "info@hyrconstruye.com",
      pageWidth - margin - 50,
      26
    );

    yPosition = 50;

    // DOCUMENT TITLE
    doc.setTextColor(...darkGray);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("COTIZACIÓN DE PROYECTO", margin, yPosition);

    yPosition += 15;

    // Document info section
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(
      `Cotización N°: ${estimate.id.substring(0, 8).toUpperCase()}`,
      margin,
      yPosition
    );
    doc.text(
      `Fecha: ${new Date().toLocaleDateString("es-CO")}`,
      pageWidth - margin - 40,
      yPosition
    );

    yPosition += 10;

    // Client information
    if (client) {
      doc.setFont("helvetica", "bold");
      doc.text("CLIENTE:", margin, yPosition);
      doc.setFont("helvetica", "normal");
      doc.text(client.name, margin + 25, yPosition);

      yPosition += 6;
      if (client.contact_name) {
        doc.text("Contacto:", margin, yPosition);
        doc.text(client.contact_name, margin + 25, yPosition);
        yPosition += 6;
      }
      if (client.phone) {
        doc.text("Teléfono:", margin, yPosition);
        doc.text(client.phone, margin + 25, yPosition);
        yPosition += 6;
      }
    }

    yPosition += 10;

    // Project details
    doc.setFont("helvetica", "bold");
    doc.text("PROYECTO:", margin, yPosition);
    doc.setFont("helvetica", "normal");
    doc.text(estimate.name, margin + 25, yPosition);

    yPosition += 15;

    // Items table header
    const _tableStartY = yPosition;
    const colWidths = [80, 25, 25, 30]; // Description, Qty, Unit Cost, Total
    const headerHeight = 8;

    doc.setFillColor(...primaryColor);
    doc.rect(margin, yPosition, contentWidth, headerHeight, "F");

    doc.setTextColor(...white);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);

    let xPosition = margin + 2;
    doc.text("DESCRIPCIÓN", xPosition, yPosition + 5.5);
    xPosition += colWidths[0];
    doc.text("CANT.", xPosition, yPosition + 5.5);
    xPosition += colWidths[1];
    doc.text("VALOR UNIT.", xPosition, yPosition + 5.5);
    xPosition += colWidths[2];
    doc.text("VALOR TOTAL", xPosition, yPosition + 5.5);

    yPosition += headerHeight;

    // Items rows
    doc.setTextColor(...darkGray);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);

    const rowHeight = 6;
    let isEvenRow = false;

    // Group items by type
    const itemsByType = {
      material: estimate.items.filter(item => item.type === "material"),
      labor: estimate.items.filter(item => item.type === "labor"),
      equipment: estimate.items.filter(item => item.type === "equipment"),
      overhead: estimate.items.filter(item => item.type === "overhead"),
    };

    const typeLabels = {
      material: "MATERIALES",
      labor: "MANO DE OBRA",
      equipment: "EQUIPOS",
      overhead: "GASTOS GENERALES",
    };

    Object.entries(itemsByType).forEach(([type, items]) => {
      if (items.length === 0) return;

      // Type header
      doc.setFillColor(240, 240, 240);
      doc.rect(margin, yPosition, contentWidth, rowHeight, "F");
      doc.setFont("helvetica", "bold");
      doc.text(
        typeLabels[type as keyof typeof typeLabels],
        margin + 2,
        yPosition + 4
      );
      yPosition += rowHeight;

      doc.setFont("helvetica", "normal");

      items.forEach(item => {
        if (yPosition > pageHeight - 50) {
          doc.addPage();
          yPosition = margin;
        }

        if (isEvenRow) {
          doc.setFillColor(248, 250, 252);
          doc.rect(margin, yPosition, contentWidth, rowHeight, "F");
        }

        xPosition = margin + 2;

        // Description (with word wrap for long descriptions)
        const description = item.description || item.name;
        const wrappedText = doc.splitTextToSize(description, colWidths[0] - 4);
        doc.text(wrappedText[0], xPosition, yPosition + 4);

        xPosition += colWidths[0];
        doc.text(`${item.quantity} ${item.unit}`, xPosition, yPosition + 4);

        xPosition += colWidths[1];
        doc.text(formatCurrency(item.unitCost), xPosition, yPosition + 4);

        xPosition += colWidths[2];
        doc.text(formatCurrency(item.total), xPosition, yPosition + 4);

        yPosition += rowHeight;
        isEvenRow = !isEvenRow;
      });
    });

    yPosition += 5;

    // Summary section
    const summaryX = pageWidth - margin - 60;
    doc.setDrawColor(...lightGray);
    doc.line(summaryX - 5, yPosition, pageWidth - margin, yPosition);
    yPosition += 5;

    doc.setFont("helvetica", "normal");
    doc.text("Subtotal:", summaryX, yPosition);
    doc.text(formatCurrency(estimate.subtotal), summaryX + 25, yPosition);
    yPosition += 6;

    doc.text(
      `Utilidad (${(estimate.profitMargin * 100).toFixed(1)}%):`,
      summaryX,
      yPosition
    );
    doc.text(
      formatCurrency(estimate.total - estimate.subtotal),
      summaryX + 25,
      yPosition
    );
    yPosition += 6;

    // Total with highlighting
    doc.setFillColor(...primaryColor);
    doc.rect(summaryX - 5, yPosition - 2, 55, 8, "F");
    doc.setTextColor(...white);
    doc.setFont("helvetica", "bold");
    doc.text("TOTAL:", summaryX, yPosition + 3);
    doc.text(formatCurrency(estimate.total), summaryX + 25, yPosition + 3);

    yPosition += 15;

    // Notes section
    if (estimate.notes) {
      doc.setTextColor(...darkGray);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("OBSERVACIONES:", margin, yPosition);
      yPosition += 8;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      const notesLines = doc.splitTextToSize(estimate.notes, contentWidth);
      doc.text(notesLines, margin, yPosition);
      yPosition += notesLines.length * 4 + 10;
    }

    // Terms and conditions
    if (yPosition > pageHeight - 60) {
      doc.addPage();
      yPosition = margin;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("TÉRMINOS Y CONDICIONES:", margin, yPosition);
    yPosition += 8;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    const terms = [
      "• Esta cotización tiene validez de 30 días calendario.",
      "• Los precios incluyen IVA cuando aplique.",
      "• Los materiales son de primera calidad y cumplen normas técnicas.",
      "• El tiempo de ejecución se acordará según cronograma del proyecto.",
      "• Se requiere anticipo del 30% para iniciar trabajos.",
      "• HYR Constructora cuenta con pólizas de responsabilidad civil y ARL.",
      "• Cualquier modificación al proyecto debe ser autorizada por escrito.",
    ];

    terms.forEach(term => {
      doc.text(term, margin, yPosition);
      yPosition += 4;
    });

    // Footer
    yPosition = pageHeight - 25;
    doc.setDrawColor(...lightGray);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);

    doc.setTextColor(...lightGray);
    doc.setFontSize(8);
    doc.text(
      "HYR Constructora & Soldadura - Especialistas en construcción industrial",
      margin,
      yPosition + 8
    );
    doc.text(
      `Generado el ${new Date().toLocaleString("es-CO")}`,
      pageWidth - margin - 50,
      yPosition + 8
    );

    // Return PDF as blob
    const pdfBlob = doc.output("blob");
    return pdfBlob;
  } catch (error) {
    console.error("Error generating advanced PDF:", error);
    throw new Error(
      "Error generando PDF profesional: " + (error as Error).message
    );
  }
}
