/**
 * Generador de PDF para reportes consolidados de múltiples turnos
 * Versión actualizada para manejar arrays de turnos
 */

import * as fs from "fs"
import * as path from "path"
import { BrowserWindow, app, shell } from "electron"

// ==================== TIPOS ====================
interface ConfiguracionNegocio {
  nombre_negocio: string
  rfc?: string
  telefono?: string
  email?: string
  direccion?: string
  ciudad?: string
  estado?: string
  simbolo_moneda: string
  moneda: string
  mensaje_ticket_footer?: string
}

interface DetalleMovimiento {
  id: number
  turno_id: number
  tipo: string
  monto: string
  metodo_pago_id: number
  referencia_tipo: string | null
  referencia_id: number | null
  concepto: string
  fecha: string
  metodo_pago_nombre: string
}

interface DatosTurno {
  id: number
  caja_id: number
  usuario_id: number
  caja_nombre: string
  usuario_nombre: string
  fecha_apertura: string
  fecha_cierre: string | null
  monto_inicial: string
  monto_final: string | null
  monto_esperado: string | null
  diferencia: string | null
  estado: string
  notas: string | null
  detalles_turno: DetalleMovimiento[]
}

export interface DatosReporteConsolidado {
  turnos: DatosTurno[]
  configuracion: ConfiguracionNegocio
}

// ==================== UTILIDADES ====================
function formatearFecha(fechaISO: string | null): string {
  if (!fechaISO) return "N/A"
  const fecha = new Date(fechaISO)
  return fecha.toLocaleDateString("es-DO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

function formatearFechaLarga(fechaISO: string | null): string {
  if (!fechaISO) return "N/A"
  const fecha = new Date(fechaISO)
  return fecha.toLocaleDateString("es-DO", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

function formatearHora(fechaISO: string | null): string {
  if (!fechaISO) return "N/A"
  const fecha = new Date(fechaISO)
  return fecha.toLocaleTimeString("es-DO", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatearMonto(monto: string | null, simbolo = "$"): string {
  if (!monto) return `${simbolo}0.00`
  const numero = Number.parseFloat(monto)
  return `${simbolo}${numero.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`
}

function calcularDuracion(inicio: string, fin: string | null): string {
  if (!fin) return "En curso"
  const ms = new Date(fin).getTime() - new Date(inicio).getTime()
  const horas = Math.floor(ms / 3600000)
  const minutos = Math.floor((ms % 3600000) / 60000)
  return `${horas}h ${minutos}m`
}

// ==================== PROCESADOR DE PLANTILLA ====================
function procesarPlantillaConsolidada(datos: DatosReporteConsolidado): string {
  const { turnos, configuracion } = datos

  // Leer plantilla
  const rutaPlantilla = path.join(__dirname, "../../resources/templates/reporte-turno.html")
  let html = fs.readFileSync(rutaPlantilla, "utf-8")

  // Calcular totales generales
  const totalMontoInicial = turnos.reduce((sum, t) => sum + Number.parseFloat(t.monto_inicial || "0"), 0)
  const totalMontoFinal = turnos.reduce((sum, t) => sum + Number.parseFloat(t.monto_final || "0"), 0)
  const totalMontoEsperado = turnos.reduce((sum, t) => sum + Number.parseFloat(t.monto_esperado || "0"), 0)
  const totalDiferencia = turnos.reduce((sum, t) => sum + Number.parseFloat(t.diferencia || "0"), 0)

  // Obtener rango de fechas
  const fechas = turnos.map((t) => new Date(t.fecha_apertura).getTime()).sort((a, b) => a - b)

  const fechaInicio = fechas.length > 0 ? formatearFecha(new Date(fechas[0]).toISOString()) : "N/A"
  const fechaFin = fechas.length > 0 ? formatearFecha(new Date(fechas[fechas.length - 1]).toISOString()) : "N/A"
  const rangoFechas = fechaInicio === fechaFin ? fechaInicio : `${fechaInicio} - ${fechaFin}`

  // Obtener nombre de caja (asumiendo que todos son de la misma caja)
  const cajaNombre = turnos.length > 0 ? turnos[0].caja_nombre : "N/A"

  // Reemplazos del header
  const reemplazosHeader: Record<string, string> = {
    nombre_negocio: configuracion.nombre_negocio,
    rfc: configuracion.rfc || "N/A",
    telefono: configuracion.telefono || "N/A",
    email: configuracion.email || "N/A",
    direccion: configuracion.direccion || "N/A",
    total_turnos: turnos.length.toString(),
    rango_fechas: rangoFechas,
    caja_nombre: cajaNombre,
    total_monto_inicial: formatearMonto(totalMontoInicial.toString(), configuracion.simbolo_moneda),
    total_monto_final: formatearMonto(totalMontoFinal.toString(), configuracion.simbolo_moneda),
    total_monto_esperado: formatearMonto(totalMontoEsperado.toString(), configuracion.simbolo_moneda),
    total_diferencia: formatearMonto(totalDiferencia.toString(), configuracion.simbolo_moneda),
    fecha_generacion: new Date().toLocaleString("es-DO"),
    mensaje_ticket_footer: configuracion.mensaje_ticket_footer || "Gracias por su preferencia",
  }

  // Aplicar reemplazos del header
  Object.entries(reemplazosHeader).forEach(([key, value]) => {
    html = html.replace(new RegExp(`{{${key}}}`, "g"), value)
  })

  // Generar HTML de turnos individuales
  const turnosHTML = turnos.map((turno) => generarHTMLTurno(turno, configuracion)).join("\n")
  html = html.replace("{{TURNOS_INDIVIDUALES}}", turnosHTML)

  return html
}

// ==================== GENERAR HTML DE TURNO INDIVIDUAL ====================
function generarHTMLTurno(turno: DatosTurno, configuracion: ConfiguracionNegocio): string {
  const diferencia = Number.parseFloat(turno.diferencia || "0")
  const estadoDiferencia = diferencia > 0 ? "positive" : diferencia < 0 ? "negative" : "neutral"
  const mensajeDiferencia = diferencia > 0 ? "Sobrante" : diferencia < 0 ? "Faltante" : "Exacto"
  const duracion = calcularDuracion(turno.fecha_apertura, turno.fecha_cierre)

  // Generar filas de movimientos
  let movimientosHTML = ""
  if (turno.detalles_turno && turno.detalles_turno.length > 0) {
    movimientosHTML = turno.detalles_turno
      .map(
        (mov) => `
        <tr>
          <td>${formatearFecha(mov.fecha)} ${formatearHora(mov.fecha)}</td>
          <td><span class="tipo-badge tipo-${mov.tipo}">${mov.tipo}</span></td>
          <td>${mov.metodo_pago_nombre}</td>
          <td>${mov.concepto || "N/A"}</td>
          <td class="text-right">${formatearMonto(mov.monto, configuracion.simbolo_moneda)}</td>
        </tr>
      `,
      )
      .join("")
  } else {
    movimientosHTML = '<tr><td colspan="5" class="empty-state">Sin movimientos registrados</td></tr>'
  }

  return `
    <div class="turno-card">
      <div class="turno-header">
        <div class="turno-header-left">
          <h3>Turno #${turno.id} - ${turno.caja_nombre}</h3>
          <p>Cajero: ${turno.usuario_nombre} | Duración: ${duracion}</p>
        </div>
        <span class="status-badge status-${turno.estado}">${turno.estado}</span>
      </div>
      
      <div class="turno-body">
        <!-- Información del Turno -->
        <div class="turno-info-grid">
          <div class="turno-info-item">
            <label>Fecha Apertura</label>
            <div class="value">${formatearFechaLarga(turno.fecha_apertura)}</div>
          </div>
          <div class="turno-info-item">
            <label>Hora Apertura</label>
            <div class="value">${formatearHora(turno.fecha_apertura)}</div>
          </div>
          <div class="turno-info-item">
            <label>Fecha Cierre</label>
            <div class="value">${formatearFechaLarga(turno.fecha_cierre)}</div>
          </div>
          <div class="turno-info-item">
            <label>Hora Cierre</label>
            <div class="value">${formatearHora(turno.fecha_cierre)}</div>
          </div>
        </div>

        <!-- Montos -->
        <div class="turno-money">
          <div class="turno-money-grid">
            <div class="turno-money-item">
              <label>Monto Inicial</label>
              <span class="amount">${formatearMonto(turno.monto_inicial, configuracion.simbolo_moneda)}</span>
            </div>
            <div class="turno-money-item">
              <label>Monto Final</label>
              <span class="amount">${formatearMonto(turno.monto_final, configuracion.simbolo_moneda)}</span>
            </div>
            <div class="turno-money-item">
              <label>Monto Esperado</label>
              <span class="amount">${formatearMonto(turno.monto_esperado, configuracion.simbolo_moneda)}</span>
            </div>
            <div class="turno-money-item">
              <label>Diferencia</label>
              <span class="amount">${formatearMonto(turno.diferencia, configuracion.simbolo_moneda)}</span>
            </div>
          </div>
        </div>

        <!-- Alerta de Diferencia -->
        <div class="difference-alert ${estadoDiferencia}">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <div>
            <strong>Estado:</strong> ${mensajeDiferencia} - ${formatearMonto(turno.diferencia, configuracion.simbolo_moneda)}
          </div>
        </div>

        <!-- Movimientos -->
        <div class="movimientos-section">
          <h4>Movimientos del Turno (${turno.detalles_turno?.length || 0})</h4>
          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th>Fecha/Hora</th>
                  <th>Tipo</th>
                  <th>Método Pago</th>
                  <th>Concepto</th>
                  <th class="text-right">Monto</th>
                </tr>
              </thead>
              <tbody>
                ${movimientosHTML}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Notas -->
        ${
          turno.notas
            ? `
          <div class="notas-box">
            <strong>Notas:</strong>
            ${turno.notas}
          </div>
        `
            : ""
        }
      </div>
    </div>
  `
}

// ==================== GENERAR Y ABRIR PDF (FUNCIÓN PRINCIPAL) ====================
export async function generarReporteTurno(
  datos: DatosReporteConsolidado,
  nombreArchivo?: string
): Promise<string> {
  try {
    // Procesar HTML
    const htmlProcesado = procesarPlantillaConsolidada(datos)

    // Crear ventana invisible
    const win = new BrowserWindow({
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    })

    // Cargar HTML
    await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlProcesado)}`)

    // Esperar a que se renderice
    await new Promise((resolve) => setTimeout(resolve, 1500))

    // Generar PDF
    const pdfBuffer = await win.webContents.printToPDF({
      printBackground: true,
      landscape: false,
      pageSize: "Letter",
      scale: 1.0,
    })

    // Ruta de descargas
    const rutaDescargas = app.getPath("downloads")
    const nombrePDF = nombreArchivo || `Reporte-Consolidado-${Date.now()}.pdf`
    const rutaCompleta = path.join(rutaDescargas, nombrePDF)

    // Guardar PDF
    fs.writeFileSync(rutaCompleta, pdfBuffer)

    // Cerrar ventana
    win.close()

    console.log(`✅ PDF consolidado generado: ${rutaCompleta}`)

    // Abrir PDF con visor predeterminado
    await shell.openPath(rutaCompleta)
    console.log("✅ PDF consolidado abierto correctamente")

    return rutaCompleta
  } catch (error) {
    console.error("❌ Error al generar y abrir PDF consolidado:", error)
    throw error
  }
}