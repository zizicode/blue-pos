/**
 * Generador de PDF para facturas
 * Versión consolidada con función única de generación y apertura
 */

import * as fs from "fs"
import * as path from "path"
import { BrowserWindow, app, shell } from "electron"

// ==================== TIPOS ====================
interface DetalleProducto {
  id: number
  venta_id: number
  producto_id: number
  cantidad: number
  precio_unitario: string
  descuento_porcentaje: string
  descuento_monto: string
  subtotal: string
  codigo: string
  producto_nombre: string
  codigo_barras: string
  unidad_medida: string
}

interface Pago {
  id: number
  venta_id: number
  metodo_pago_id: number
  monto: string
  referencia: string | null
  fecha: string
  metodo_pago_nombre: string
}

interface Factura {
  id: number
  folio: string
  fecha: string
  cliente_id: number
  almacen_id: number
  usuario_id: number
  subtotal: string
  descuento: string
  total: string
  tipo_venta: string
  estado: string
  notas: string | null
  creado_en: string
  cliente_nombre: string
  cliente_telefono: string | null
  cliente_email: string | null
  usuario_nombre: string
  almacen_nombre: string
  detalles: DetalleProducto[]
  pagos: Pago[]
}

interface Configuracion {
  nombre_negocio: string
  rfc?: string
  direccion?: string
  telefono?: string
  email?: string
  sitio_web?: string
  logo_url?: string
  moneda?: string
  simbolo_moneda?: string
}

export interface DatosFacturas {
  facturas: Factura[]
  configuracion: Configuracion
}

// ==================== PROCESADOR DE PLANTILLA ====================
function procesarPlantillaFacturas(datos: DatosFacturas): string {
  const { facturas, configuracion } = datos

  // Leer plantilla
  const rutaPlantilla = path.join(__dirname, "../../resources/templates/factura.html")
  let html = fs.readFileSync(rutaPlantilla, "utf-8")

  // Generar HTML para cada factura
  const facturasHTML = facturas.map((factura) => generarHTMLFactura(factura, configuracion)).join("\n")

  // Reemplazar el placeholder de facturas
  html = html.replace("{{FACTURAS_HTML}}", facturasHTML)

  return html
}

// ==================== GENERAR HTML DE FACTURA INDIVIDUAL ====================
function generarHTMLFactura(factura: Factura, config: Configuracion): string {
  const moneda = config.simbolo_moneda || config.moneda || "$"

  // Formatear fecha
  const fecha = new Date(factura.fecha)
  const fechaFormateada = fecha.toLocaleDateString("es-MX", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })

  // Generar filas de productos
  const productosHTML = factura.detalles
    .map(
      (detalle) => `
      <tr>
        <td class="text-center">${detalle.codigo}</td>
        <td>${detalle.producto_nombre}</td>
        <td class="text-center">${detalle.cantidad} ${detalle.unidad_medida}</td>
        <td class="text-right">${moneda}${Number.parseFloat(detalle.precio_unitario).toFixed(2)}</td>
        <td class="text-right">${moneda}${Number.parseFloat(detalle.descuento_monto).toFixed(2)}</td>
        <td class="text-right">${moneda}${Number.parseFloat(detalle.subtotal).toFixed(2)}</td>
      </tr>
    `,
    )
    .join("")

  // Generar filas de pagos
  const pagosHTML = factura.pagos
    .map((pago) => {
      const fechaPago = new Date(pago.fecha)
      const fechaPagoFormateada = fechaPago.toLocaleDateString("es-MX", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })

      return `
      <tr>
        <td>${pago.metodo_pago_nombre}</td>
        <td class="text-right">${moneda}${Number.parseFloat(pago.monto).toFixed(2)}</td>
        <td>${pago.referencia || "N/A"}</td>
        <td class="text-center">${fechaPagoFormateada}</td>
      </tr>
    `
    })
    .join("")

  // Logo HTML
  const logoHTML = config.logo_url ? `<div class="logo-container"><img src="${config.logo_url}" alt="Logo"></div>` : ""

  return `
    <div class="page">
      <!-- Header -->
      <div class="header">
        <div class="business-info">
          <div class="business-name">${config.nombre_negocio}</div>
          <div class="business-details">
            ${config.rfc ? `<div><strong>RFC:</strong> ${config.rfc}</div>` : ""}
            ${config.direccion ? `<div><strong>Dirección:</strong> ${config.direccion}</div>` : ""}
            ${config.telefono ? `<div><strong>Teléfono:</strong> ${config.telefono}</div>` : ""}
            ${config.email ? `<div><strong>Email:</strong> ${config.email}</div>` : ""}
            ${config.sitio_web ? `<div><strong>Web:</strong> ${config.sitio_web}</div>` : ""}
          </div>
        </div>
        ${logoHTML}
      </div>
  
      <!-- Invoice Info -->
      <div class="invoice-info">
        <div class="invoice-details">
          <div class="invoice-title">Factura</div>
          <div class="info-row">
            <span class="info-label">Folio:</span>
            <span class="info-value">${factura.folio}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Fecha:</span>
            <span class="info-value">${fechaFormateada}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Tipo:</span>
            <span class="info-value">${factura.tipo_venta.toUpperCase()}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Estado:</span>
            <span class="info-value"><span class="status-badge">${factura.estado}</span></span>
          </div>
        </div>
        <div class="customer-details">
          <div class="section-title" style="font-size: 12pt; margin-bottom: 10px;">Cliente</div>
          <div class="info-row">
            <span class="info-label">Nombre:</span>
            <span class="info-value">${factura.cliente_nombre}</span>
          </div>
          ${
            factura.cliente_telefono
              ? `
          <div class="info-row">
            <span class="info-label">Teléfono:</span>
            <span class="info-value">${factura.cliente_telefono}</span>
          </div>
          `
              : ""
          }
          ${
            factura.cliente_email
              ? `
          <div class="info-row">
            <span class="info-label">Email:</span>
            <span class="info-value">${factura.cliente_email}</span>
          </div>
          `
              : ""
          }
          <div class="info-row">
            <span class="info-label">Almacén:</span>
            <span class="info-value">${factura.almacen_nombre}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Vendedor:</span>
            <span class="info-value">${factura.usuario_nombre}</span>
          </div>
        </div>
      </div>
  
      <!-- Products -->
      <div class="products-section">
        <div class="section-title">Productos / Servicios</div>
        <table>
          <thead>
            <tr>
              <th class="text-center" style="width: 80px;">Código</th>
              <th>Descripción</th>
              <th class="text-center" style="width: 80px;">Cantidad</th>
              <th class="text-right" style="width: 100px;">Precio Unit.</th>
              <th class="text-right" style="width: 100px;">Descuento</th>
              <th class="text-right" style="width: 100px;">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${productosHTML}
          </tbody>
        </table>
      </div>
  
      <!-- Totals -->
      <div class="totals-section">
        <div class="totals-box">
          <div class="total-row">
            <span class="total-label">Subtotal:</span>
            <span>${moneda}${Number.parseFloat(factura.subtotal).toFixed(2)}</span>
          </div>
          <div class="total-row">
            <span class="total-label">Descuento:</span>
            <span>${moneda}${Number.parseFloat(factura.descuento).toFixed(2)}</span>
          </div>
          <div class="total-row">
            <span class="total-label">TOTAL:</span>
            <span>${moneda}${Number.parseFloat(factura.total).toFixed(2)}</span>
          </div>
        </div>
      </div>
  
      <!-- Payments -->
      <div class="payments-section">
        <div class="section-title">Pagos Recibidos</div>
        <table>
          <thead>
            <tr>
              <th>Método de Pago</th>
              <th class="text-right" style="width: 120px;">Monto</th>
              <th style="width: 150px;">Referencia</th>
              <th class="text-center" style="width: 150px;">Fecha</th>
            </tr>
          </thead>
          <tbody>
            ${pagosHTML}
          </tbody>
        </table>
      </div>
  
      <!-- Notes -->
      ${
        factura.notas
          ? `
      <div class="notes-section">
        <div class="notes-title">Notas:</div>
        <div>${factura.notas}</div>
      </div>
      `
          : ""
      }
  
      <!-- Footer -->
      <div class="footer">
        <div class="signature-section">
          <div class="signature-box">
            <div class="signature-line"></div>
            <div>Firma del Cliente</div>
          </div>
          <div class="signature-box">
            <div class="signature-line"></div>
            <div>Firma Autorizada</div>
          </div>
        </div>
        <div>Gracias por su preferencia</div>
        <div style="margin-top: 5px; font-size: 8pt; color: #666;">
          Documento generado el ${new Date().toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}
        </div>
      </div>
    </div>
  `
}

// ==================== GENERAR Y ABRIR FACTURAS (FUNCIÓN PRINCIPAL) ====================
export async function generarYAbrirFacturas(datos: DatosFacturas, nombreArchivo?: string): Promise<string> {
  try {
    // Procesar HTML
    const htmlProcesado = procesarPlantillaFacturas(datos)

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
    const nombrePDF = nombreArchivo || `Facturas-${Date.now()}.pdf`
    const rutaCompleta = path.join(rutaDescargas, nombrePDF)

    // Guardar PDF
    fs.writeFileSync(rutaCompleta, pdfBuffer)

    // Cerrar ventana
    win.close()

    console.log(`✅ PDF de facturas generado: ${rutaCompleta}`)

    // Abrir PDF con visor predeterminado
    await shell.openPath(rutaCompleta)
    console.log("✅ PDF de facturas abierto correctamente")

    return rutaCompleta
  } catch (error) {
    console.error("❌ Error al generar y abrir PDF de facturas:", error)
    throw error
  }
}