import { DatosFacturas, generarYAbrirFacturas } from "./pdf-factura"
import { DatosReporteConsolidado, generarReporteTurno } from "./pdf-generator"

interface PDFResponse {
  success: boolean
  message: string
  ruta?: string
}

export const PDF = {
  /**
   * Genera y abre el reporte consolidado de turnos
   * @param datos Datos del reporte consolidado
   * @param nombreArchivo Nombre opcional del archivo (por defecto: Reporte-Consolidado-{timestamp}.pdf)
   */
  async generarReporteTurnos(datos: DatosReporteConsolidado, nombreArchivo?: string): Promise<PDFResponse> {
    try {
      const ruta = await generarReporteTurno(datos, nombreArchivo)
      return {
        success: true,
        message: "Reporte de turnos generado y abierto correctamente",
        ruta,
      }
    } catch (error) {
      console.error("Error al generar reporte de turnos:", error)
      return {
        success: false,
        message: error instanceof Error ? error.message : "Error desconocido",
      }
    }
  },

  /**
   * Genera y abre las facturas en PDF
   * @param datos Datos de las facturas (puede ser una o múltiples)
   * @param nombreArchivo Nombre opcional del archivo (por defecto: Facturas-{timestamp}.pdf)
   */
  async generarFacturas(datos: DatosFacturas, nombreArchivo?: string): Promise<PDFResponse> {
    try {
      const ruta = await generarYAbrirFacturas(datos, nombreArchivo)
      return {
        success: true,
        message: "Facturas generadas y abiertas correctamente",
        ruta,
      }
    } catch (error) {
      console.error("Error al generar facturas:", error)
      return {
        success: false,
        message: error instanceof Error ? error.message : "Error desconocido",
      }
    }
  },
}