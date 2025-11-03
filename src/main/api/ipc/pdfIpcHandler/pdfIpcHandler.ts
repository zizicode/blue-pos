import { DatosFacturas, generarYAbrirFacturas } from "./pdf-factura"
import { generarReporteTurnos as generarPDF } from "./pdf-reporte-turnos"
import { turnosCajaController } from "../caja/turnosCajaController"

interface PDFResponse {
  success: boolean
  message: string
  ruta?: string
}

export const PDF = {
  /**
   * Genera y abre el reporte consolidado de turnos
   */
  async generarReporteTurno(datos: { turnos: [{id:number}]; configuracion: any }): Promise<PDFResponse> {
    try {
      // 1️⃣ Consultar información completa de los turnos
      const x = await turnosCajaController.generarReporteTurnos({
        turno_ids: datos.turnos.map(t => typeof t === "object" ? t.id : t),
      })

      if (!x.success || !x.data) {
        throw new Error(x.message || "No se pudieron obtener los turnos")
      }

      // 2️⃣ Generar el PDF usando la data completa
      const ruta = await generarPDF(x.data, datos.configuracion)

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
