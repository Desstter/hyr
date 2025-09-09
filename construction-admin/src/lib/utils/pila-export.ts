// =====================================================
// PILA EXPORT UTILITIES
// Utilidades para exportar datos de nómina a formatos PILA Colombia
// =====================================================

import * as Papa from "papaparse";
import { format } from "date-fns";

// Tipos para datos PILA
interface PILAEmployeeData {
  documento: string;
  nombre: string;
  salario: number;
  diasTrabajados: number;
  ibc?: number;
  salud: number;
  pension: number;
  fsp?: number;
  arl: number;
  arlClass: string;
  parafiscales: number;
  law_114_1_exempt?: boolean;
  centroTrabajo: string;
}

interface PILAReportData {
  periodo: string;
  formato: string;
  empleados: PILAEmployeeData[];
  totales: {
    empleados: number;
    salarios: number;
    aportes: number;
    fspTotal?: number;
    ahorroLaw114_1?: number;
  };
}

// =====================================================
// FORMATEO DE DATOS PARA PILA COLOMBIA
// =====================================================

/**
 * Convertir datos PILA a formato CSV estándar UGPP
 */
export function convertPILAToCSV(pilaData: PILAReportData): string {
  const csvRows = pilaData.empleados.map(emp => ({
    "Tipo Documento": "CC", // Cédula de Ciudadanía por defecto
    "Número Documento": emp.documento,
    "Nombre Completo": emp.nombre,
    "Días Trabajados": emp.diasTrabajados,
    IBC: emp.ibc || emp.salario,
    "Salario Base": emp.salario,
    "Salud Empleado": Math.round(emp.salud * 0.04), // 4% empleado
    "Pensión Empleado": Math.round(emp.salario * 0.04), // 4% empleado
    "Salud Empleador": Math.round(emp.salario * 0.085), // 8.5% empleador
    "Pensión Empleador": Math.round(emp.salario * 0.12), // 12% empleador
    ARL: Math.round(emp.arl),
    "Clase Riesgo ARL": emp.arlClass || "V",
    SENA: Math.round(emp.salario * 0.02), // 2%
    ICBF: Math.round(emp.salario * 0.03), // 3%
    "Cajas Compensación": Math.round(emp.salario * 0.04), // 4%
    FSP: emp.fsp ? Math.round(emp.fsp) : 0,
    "Centro Trabajo": emp.centroTrabajo || "001",
    Período: pilaData.periodo,
    "Exento Ley 114-1": emp.law_114_1_exempt ? "SI" : "NO",
  }));

  return Papa.unparse(csvRows, {
    header: true,
    delimiter: ";", // UGPP usa punto y coma
  });
}

/**
 * Convertir datos PILA a formato Excel (múltiples hojas)
 */
export function convertPILAToExcelData(pilaData: PILAReportData) {
  const empleadosSheet = pilaData.empleados.map(emp => ({
    Documento: emp.documento,
    Nombre: emp.nombre,
    "Salario Base": new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
    }).format(emp.salario),
    Días: emp.diasTrabajados,
    IBC: new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
    }).format(emp.ibc || emp.salario),
    "Salud Total": new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
    }).format(emp.salud),
    "Pensión Total": new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
    }).format(emp.pension),
    ARL: new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
    }).format(emp.arl),
    Parafiscales: new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
    }).format(emp.parafiscales),
    "Centro Trabajo": emp.centroTrabajo || "001",
  }));

  const resumenSheet = [
    {
      Concepto: "Total Empleados",
      Valor: pilaData.totales.empleados,
      Formato: pilaData.totales.empleados.toString(),
    },
    {
      Concepto: "Total Salarios",
      Valor: pilaData.totales.salarios,
      Formato: new Intl.NumberFormat("es-CO", {
        style: "currency",
        currency: "COP",
      }).format(pilaData.totales.salarios),
    },
    {
      Concepto: "Total Aportes",
      Valor: pilaData.totales.aportes,
      Formato: new Intl.NumberFormat("es-CO", {
        style: "currency",
        currency: "COP",
      }).format(pilaData.totales.aportes),
    },
  ];

  if (pilaData.totales.fspTotal) {
    resumenSheet.push({
      Concepto: "FSP Total",
      Valor: pilaData.totales.fspTotal,
      Formato: new Intl.NumberFormat("es-CO", {
        style: "currency",
        currency: "COP",
      }).format(pilaData.totales.fspTotal),
    });
  }

  if (pilaData.totales.ahorroLaw114_1) {
    resumenSheet.push({
      Concepto: "Ahorro Ley 114-1",
      Valor: pilaData.totales.ahorroLaw114_1,
      Formato: new Intl.NumberFormat("es-CO", {
        style: "currency",
        currency: "COP",
      }).format(pilaData.totales.ahorroLaw114_1),
    });
  }

  return {
    empleados: empleadosSheet,
    resumen: resumenSheet,
  };
}

// =====================================================
// GENERACIÓN Y DESCARGA DE ARCHIVOS
// =====================================================

/**
 * Generar nombre de archivo PILA estándar
 */
export function generatePILAFilename(
  periodo: string,
  formato: "csv" | "xlsx" = "csv"
): string {
  const [year, month] = periodo.split("-");
  const monthNames = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
  ];

  const monthName = monthNames[parseInt(month) - 1] || month;
  const timestamp = format(new Date(), "HHmm");

  return `PILA_HYR_${monthName}_${year}_${timestamp}.${formato}`;
}

/**
 * Descargar archivo PILA CSV
 */
export function downloadPILACSV(pilaData: PILAReportData): void {
  try {
    const csvContent = convertPILAToCSV(pilaData);
    const filename = generatePILAFilename(pilaData.periodo, "csv");

    // Crear blob con encoding UTF-8 con BOM para Excel
    const BOM = "\uFEFF";
    const blob = new Blob([BOM + csvContent], {
      type: "text/csv;charset=utf-8",
    });

    // Crear link de descarga
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;

    // Ejecutar descarga
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Limpiar URL
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Error downloading PILA CSV:", error);
    throw new Error("Error al generar archivo CSV");
  }
}

/**
 * Descargar reporte PILA como CSV simplificado para UGPP
 */
export function downloadPILAUGPP(pilaData: PILAReportData): void {
  try {
    // Formato específico UGPP - columnas requeridas mínimas
    const ugppRows = pilaData.empleados.map(emp => ({
      TIPO_DOCUMENTO: "CC",
      NUMERO_DOCUMENTO: emp.documento,
      APELLIDOS_NOMBRES: emp.nombre,
      DIAS_COTIZADOS: emp.diasTrabajados,
      IBC: emp.ibc || emp.salario,
      TARIFA_SALUD: "12.5", // 4% empleado + 8.5% empleador
      APORTE_SALUD: Math.round((emp.ibc || emp.salario) * 0.125),
      TARIFA_PENSION: "16.0", // 4% empleado + 12% empleador
      APORTE_PENSION: Math.round((emp.ibc || emp.salario) * 0.16),
      TARIFA_ARL: emp.arlClass === "V" ? "6.96" : "0.522",
      APORTE_ARL: Math.round(emp.arl),
      CENTRO_TRABAJO: emp.centroTrabajo || "001",
    }));

    const csvContent = Papa.unparse(ugppRows, {
      header: true,
      delimiter: ";",
    });

    const filename = `UGPP_${generatePILAFilename(pilaData.periodo, "csv")}`;

    const BOM = "\uFEFF";
    const blob = new Blob([BOM + csvContent], {
      type: "text/csv;charset=utf-8",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Error downloading PILA UGPP:", error);
    throw new Error("Error al generar archivo UGPP");
  }
}

/**
 * Generar reporte de certificado laboral individual
 */
export function generateLaborCertificateData(
  employee: PILAEmployeeData,
  periodo: string
) {
  const [year, month] = periodo.split("-");
  const monthName = new Date(
    parseInt(year),
    parseInt(month) - 1
  ).toLocaleDateString("es-CO", {
    month: "long",
    year: "numeric",
  });

  return {
    empleado: employee.nombre,
    documento: employee.documento,
    periodo: monthName,
    diasTrabajados: employee.diasTrabajados,
    salarioBase: new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
    }).format(employee.salario),
    aportesSalud: new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
    }).format(employee.salud),
    aportesPension: new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
    }).format(employee.pension),
    aportesARL: new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
    }).format(employee.arl),
    claseRiesgo: employee.arlClass,
    centroTrabajo: employee.centroTrabajo || "001",
    fechaGeneracion: format(new Date(), "dd/MM/yyyy HH:mm"),
  };
}

// =====================================================
// VALIDACIONES Y UTILIDADES
// =====================================================

/**
 * Validar estructura de datos PILA
 */
export function validatePILAData(data: unknown): data is PILAReportData {
  return (
    data &&
    typeof data.periodo === "string" &&
    Array.isArray(data.empleados) &&
    data.empleados.length > 0 &&
    data.empleados.every(
      (emp: unknown) =>
        emp.documento && emp.nombre && typeof emp.salario === "number"
    )
  );
}

/**
 * Calcular totales para verificación
 */
export function calculatePILATotals(empleados: PILAEmployeeData[]) {
  return empleados.reduce(
    (acc, emp) => ({
      totalSalarios: acc.totalSalarios + emp.salario,
      totalSalud: acc.totalSalud + emp.salud,
      totalPension: acc.totalPension + emp.pension,
      totalARL: acc.totalARL + emp.arl,
      totalParafiscales: acc.totalParafiscales + emp.parafiscales,
      totalFSP: acc.totalFSP + (emp.fsp || 0),
    }),
    {
      totalSalarios: 0,
      totalSalud: 0,
      totalPension: 0,
      totalARL: 0,
      totalParafiscales: 0,
      totalFSP: 0,
    }
  );
}
