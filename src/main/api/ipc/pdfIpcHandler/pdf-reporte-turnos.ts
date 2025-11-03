import * as fs from 'fs'
import * as path from 'path'
import { BrowserWindow, app, shell } from 'electron'

// ==================== UTILIDADES ====================

/** Formatea una fecha ISO a formato DD/MM/AAAA. */
function formatearFecha(fechaISO: string | null): string {
  if (!fechaISO) return 'N/A'
  const fecha = new Date(fechaISO)
  // Utilizamos try-catch por si la fecha es inválida y toLocaleDateString falla
  try {
    return fecha.toLocaleDateString('es-DO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  } catch {
    return 'Fecha Inválida'
  }
}

/** Formatea una fecha ISO a formato HH:MM (hora). */
function formatearHora(fechaISO: string | null): string {
  if (!fechaISO) return 'N/A'
  const fecha = new Date(fechaISO)
  try {
    return fecha.toLocaleTimeString('es-DO', {
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return 'Hora Inválida'
  }
}

/** Formatea un número como moneda (ej: $1,234.50). */
function formatearMonto(monto: number | string | null, simbolo = '$'): string {
  if (monto === null || monto === undefined) return `${simbolo}0.00`
  const numero = typeof monto === 'string' ? parseFloat(monto) : monto
  if (isNaN(numero)) return `${simbolo}0.00`
  // Usamos toLocaleString para mejor formato de miles
  return `${simbolo}${numero.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`
}

/** Calcula la duración entre dos fechas ISO. */
function calcularDuracion(inicio: string, fin: string | null): string {
  if (!fin) return 'En curso'
  const ms = new Date(fin).getTime() - new Date(inicio).getTime()
  if (isNaN(ms) || ms < 0) return 'Error'
  const horas = Math.floor(ms / 3600000)
  const minutos = Math.floor((ms % 3600000) / 60000)
  return `${horas}h ${minutos}m`
}

// ==================== GENERAR HTML ====================

function generarHTML(turnos: any[] | null, configuracion: any): string {
  // FIX CRÍTICO: Aseguramos que 'turnos' es un array vacío si es null o undefined.
  const safeTurnos = Array.isArray(turnos) ? turnos : []
  const simbolo = configuracion?.simbolo_moneda || '$'

  // Calcular totales generales
  const totales = {
    monto_inicial: safeTurnos.reduce((sum, t) => sum + Number(t.monto_inicial || 0), 0),
    monto_final: safeTurnos.reduce((sum, t) => sum + Number(t.monto_final || 0), 0),
    monto_esperado: safeTurnos.reduce((sum, t) => sum + Number(t.monto_esperado || 0), 0),
    diferencia: safeTurnos.reduce((sum, t) => sum + Number(t.diferencia || 0), 0),
    // Usamos optional chaining para acceder a las estadísticas de forma segura
    ganancia_neta: safeTurnos.reduce((sum, t) => sum + Number(t.estadisticas?.ganancia_neta || 0), 0),
    ventas_totales: safeTurnos.reduce((sum, t) => sum + Number(t.estadisticas?.ventas_totales || 0), 0),
    total_facturas: safeTurnos.reduce((sum, t) => sum + Number(t.estadisticas?.total_facturas || 0), 0)
  }

  // Fecha del reporte
  const fechaReporte = new Date().toLocaleString('es-DO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })

  // Rango de fechas
  const fechas = safeTurnos.map(t => new Date(t.fecha_apertura).getTime()).filter(t => !isNaN(t)).sort((a, b) => a - b)
  const fechaInicio = fechas.length > 0 ? formatearFecha(new Date(fechas[0]).toISOString()) : 'N/A'
  const fechaFin = fechas.length > 0 ? formatearFecha(new Date(fechas[fechas.length - 1]).toISOString()) : 'N/A'
  const rangoFechas = fechaInicio === fechaFin ? fechaInicio : `${fechaInicio} - ${fechaFin}`

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Reporte de Turnos</title>
  <style>
    /* ... (CSS proporcionado por el usuario, sin cambios) ... */
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 10pt; line-height: 1.4; color: #333; }
    
    .header {
      text-align: center;
      padding: 20px;
      border-bottom: 3px solid #2563eb;
      margin-bottom: 20px;
    }
    .header h1 { font-size: 24pt; color: #1e40af; margin-bottom: 5px; }
    .header .subtitle { font-size: 11pt; color: #64748b; margin-bottom: 10px; }
    .header .info { font-size: 9pt; color: #64748b; }
    
    .summary {
      background: #f1f5f9;
      padding: 15px;
      border-radius: 8px;
      margin-bottom: 20px;
    }
    .summary h2 { font-size: 14pt; color: #1e40af; margin-bottom: 10px; }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
    }
    .summary-item {
      background: white;
      padding: 10px;
      border-radius: 6px;
      border-left: 3px solid #2563eb;
    }
    .summary-item label { font-size: 8pt; color: #64748b; display: block; margin-bottom: 3px; }
    .summary-item .value { font-size: 12pt; font-weight: bold; color: #1e40af; }
    
    .turno {
      page-break-inside: avoid;
      margin-bottom: 30px;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      overflow: hidden;
    }
    .turno-header {
      background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%);
      color: white;
      padding: 12px 15px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .turno-header h3 { font-size: 13pt; }
    .turno-header .badge {
      background: rgba(255,255,255,0.2);
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 9pt;
      text-transform: uppercase;
    }
    
    .turno-body { padding: 15px; }
    
    .info-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin-bottom: 15px;
    }
    .info-item {
      background: #f8fafc;
      padding: 8px;
      border-radius: 4px;
    }
    .info-item label { font-size: 8pt; color: #64748b; display: block; margin-bottom: 2px; }
    .info-item .value { font-size: 10pt; font-weight: 600; color: #334155; }
    
    .section {
      margin-bottom: 15px;
      page-break-inside: avoid;
    }
    .section h4 {
      font-size: 11pt;
      color: #1e40af;
      margin-bottom: 8px;
      padding-bottom: 5px;
      border-bottom: 2px solid #e2e8f0;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 9pt;
      margin-top: 8px;
    }
    th {
      background: #f1f5f9;
      padding: 8px;
      text-align: left;
      font-weight: 600;
      color: #475569;
      border-bottom: 2px solid #cbd5e1;
    }
    td {
      padding: 6px 8px;
      border-bottom: 1px solid #e2e8f0;
    }
    tr:hover { background: #f8fafc; }
    
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    
    .badge-tipo {
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 8pt;
      font-weight: 600;
      text-transform: uppercase;
    }
    .badge-venta { background: #dcfce7; color: #166534; }
    .badge-entrada { background: #dbeafe; color: #1e40af; }
    .badge-salida { background: #fee2e2; color: #991b1b; }
    .badge-devolucion { background: #fef3c7; color: #92400e; }
    .badge-abono { background: #e0e7ff; color: #3730a3; }
    
    .alert {
      padding: 10px;
      border-radius: 6px;
      margin-top: 10px;
      font-size: 9pt;
    }
    .alert-success { background: #dcfce7; color: #166534; border-left: 3px solid #16a34a; }
    .alert-warning { background: #fef3c7; color: #92400e; border-left: 3px solid #f59e0b; }
    .alert-error { background: #fee2e2; color: #991b1b; border-left: 3px solid #dc2626; }
    
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
      margin-top: 10px;
    }
    .stat-box {
      background: #f8fafc;
      padding: 8px;
      border-radius: 4px;
      text-align: center;
    }
    .stat-box label { font-size: 8pt; color: #64748b; display: block; margin-bottom: 2px; }
    .stat-box .value { font-size: 11pt; font-weight: bold; color: #1e40af; }
    
    .footer {
      margin-top: 30px;
      padding-top: 15px;
      border-top: 2px solid #e2e8f0;
      text-align: center;
      font-size: 8pt;
      color: #64748b;
    }
    
    @media print {
      .turno { page-break-after: always; }
      .turno:last-child { page-break-after: auto; }
    }
  </style>
</head>
<body>
  <!-- HEADER -->
  <div class="header">
    <h1>${configuracion?.nombre_empresa || 'Sistema POS'}</h1>
    <div class="subtitle">Reporte de Turnos de Caja</div>
    <div class="info">
      Período: ${rangoFechas} | Total de turnos: ${safeTurnos.length} | Generado: ${fechaReporte}
    </div>
  </div>

  <!-- RESUMEN GENERAL -->
  <div class="summary">
    <h2>📊 Resumen General</h2>
    <div class="summary-grid">
      <div class="summary-item">
        <label>Total Facturado</label>
        <div class="value">${formatearMonto(totales.ventas_totales, simbolo)}</div>
      </div>
      <div class="summary-item">
        <label>Ganancia Neta</label>
        <div class="value">${formatearMonto(totales.ganancia_neta, simbolo)}</div>
      </div>
      <div class="summary-item">
        <label>Total Facturas</label>
        <div class="value">${totales.total_facturas}</div>
      </div>
      <div class="summary-item">
        <label>Monto Inicial Total</label>
        <div class="value">${formatearMonto(totales.monto_inicial, simbolo)}</div>
      </div>
      <div class="summary-item">
        <label>Monto Final Total</label>
        <div class="value">${formatearMonto(totales.monto_final, simbolo)}</div>
      </div>
      <div class="summary-item">
        <label>Diferencia Total</label>
        <div class="value">${formatearMonto(totales.diferencia, simbolo)}</div>
      </div>
    </div>
  </div>

  <!-- TURNOS INDIVIDUALES -->
  ${safeTurnos.map(turno => generarHTMLTurno(turno, simbolo)).join('')}

  <!-- FOOTER -->
  <div class="footer">
    <p>${configuracion?.mensaje_ticket_footer || '© Sistema POS - Todos los derechos reservados'}</p>
    <p>Este documento fue generado automáticamente</p>
  </div>
</body>
</html>
  `
}

function generarHTMLTurno(turno: any, simbolo: string): string {
  // Uso de optional chaining y operador nullish coalescing para seguridad
  const est = turno.estadisticas || {}
  const movimientos = Array.isArray(turno.movimientos) ? turno.movimientos : []
  const resumenMetodos = Array.isArray(turno.resumen_metodos) ? turno.resumen_metodos : []
  
  const diferencia = Number(turno.diferencia || 0)
  const alertClass = diferencia > 0 ? 'alert-success' : diferencia < 0 ? 'alert-error' : 'alert-warning'
  const alertText = diferencia > 0 ? `Sobrante de ${formatearMonto(diferencia, simbolo)}` : 
                    diferencia < 0 ? `Faltante de ${formatearMonto(Math.abs(diferencia), simbolo)}` : 
                    'Cuadre exacto'

  return `
    <div class="turno">
      <div class="turno-header">
        <h3>🗃️ Turno #${turno.id || 'N/A'} - ${turno.caja_nombre || 'Sin Caja'}</h3>
        <span class="badge">${turno.estado || 'Desconocido'}</span>
      </div>
      
      <div class="turno-body">
        <!-- Información Básica -->
        <div class="info-grid">
          <div class="info-item">
            <label>Cajero</label>
            <div class="value">${turno.usuario_nombre || 'Anónimo'}</div>
          </div>
          <div class="info-item">
            <label>Fecha Apertura</label>
            <div class="value">${formatearFecha(turno.fecha_apertura)}</div>
          </div>
          <div class="info-item">
            <label>Hora Apertura</label>
            <div class="value">${formatearHora(turno.fecha_apertura)}</div>
          </div>
          <div class="info-item">
            <label>Duración</label>
            <div class="value">${calcularDuracion(turno.fecha_apertura, turno.fecha_cierre)}</div>
          </div>
        </div>

        <!-- Montos de Caja -->
        <div class="section">
          <h4>💰 Montos de Caja</h4>
          <div class="stats-grid">
            <div class="stat-box">
              <label>Monto Inicial</label>
              <div class="value">${formatearMonto(turno.monto_inicial, simbolo)}</div>
            </div>
            <div class="stat-box">
              <label>Monto Esperado</label>
              <div class="value">${formatearMonto(turno.monto_esperado, simbolo)}</div>
            </div>
            <div class="stat-box">
              <label>Monto Final</label>
              <div class="value">${formatearMonto(turno.monto_final, simbolo)}</div>
            </div>
          </div>
          <div class="alert ${alertClass}">
            <strong>Estado del Cuadre:</strong> ${alertText}
          </div>
        </div>

        <!-- Ganancias y Ventas -->
        <div class="section">
          <h4>📈 Ganancias y Ventas</h4>
          <div class="stats-grid">
            <div class="stat-box">
              <label>Ganancia Bruta</label>
              <div class="value">${formatearMonto(est.ganancia_bruta, simbolo)}</div>
            </div>
            <div class="stat-box">
              <label>Ganancia Neta</label>
              <div class="value">${formatearMonto(est.ganancia_neta, simbolo)}</div>
            </div>
            <div class="stat-box">
              <label>Margen %</label>
              <div class="value">${est.margen_bruto_porcentaje !== undefined ? `${est.margen_bruto_porcentaje}%` : 'N/A'}</div>
            </div>
            <div class="stat-box">
              <label>Ventas Totales</label>
              <div class="value">${formatearMonto(est.ventas_totales, simbolo)}</div>
            </div>
            <div class="stat-box">
              <label>Costo Total</label>
              <div class="value">${formatearMonto(est.costo_total, simbolo)}</div>
            </div>
            <div class="stat-box">
              <label>Total Facturas</label>
              <div class="value">${est.total_facturas || 0}</div>
            </div>
          </div>
        </div>

        <!-- Resumen por Método de Pago -->
        ${resumenMetodos.length > 0 ? `
        <div class="section">
          <h4>💳 Resumen por Método de Pago</h4>
          <table>
            <thead>
              <tr>
                <th>Método de Pago</th>
                <th class="text-right">Entradas</th>
                <th class="text-right">Salidas</th>
                <th class="text-right">Neto</th>
                <th class="text-center">Movimientos</th>
              </tr>
            </thead>
            <tbody>
              ${resumenMetodos.map((metodo: any) => {
                const entradas = Number(metodo.total_entradas || 0)
                const salidas = Number(metodo.total_salidas || 0)
                const neto = entradas - salidas
                return `
                <tr>
                  <td>${metodo.metodo_pago || 'Desconocido'}</td>
                  <td class="text-right">${formatearMonto(entradas, simbolo)}</td>
                  <td class="text-right">${formatearMonto(salidas, simbolo)}</td>
                  <td class="text-right"><strong>${formatearMonto(neto, simbolo)}</strong></td>
                  <td class="text-center">${metodo.cantidad_movimientos || 0}</td>
                </tr>
                `
              }).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}

        <!-- Movimientos Detallados -->
        ${movimientos.length > 0 ? `
        <div class="section">
          <h4>📋 Movimientos del Turno (${movimientos.length})</h4>
          <table>
            <thead>
              <tr>
                <th>Fecha/Hora</th>
                <th>Tipo</th>
                <th>Método</th>
                <th>Concepto</th>
                <th class="text-right">Monto</th>
              </tr>
            </thead>
            <tbody>
              ${movimientos.map((mov: any) => `
                <tr>
                  <td>${formatearFecha(mov.fecha)} ${formatearHora(mov.fecha)}</td>
                  <td><span class="badge-tipo badge-${mov.tipo}">${mov.tipo}</span></td>
                  <td>${mov.metodo_pago_nombre || 'N/A'}</td>
                  <td>${mov.concepto || 'Sin concepto'}</td>
                  <td class="text-right">${formatearMonto(mov.monto, simbolo)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}

        ${turno.notas ? `
        <div class="alert alert-warning">
          <strong>Notas:</strong> ${turno.notas}
        </div>
        ` : ''}
      </div>
    </div>
  `
}

// ==================== FUNCIÓN PRINCIPAL ====================

/**
 * Genera el reporte de turnos como un PDF, lo guarda en descargas y lo abre.
 * @param turnos Datos del turno(s) a reportar.
 * @param configuracion Configuración de la empresa (moneda, nombre, etc.).
 * @returns La ruta completa del PDF generado.
 */
export async function generarReporteTurnos(turnos: any[] | null, configuracion: any): Promise<string> {
  const safeTurnos = Array.isArray(turnos) ? turnos : []
  if (!safeTurnos.length) {
    throw new Error('No hay datos de turnos para generar el reporte.')
  }

  try {
    const html = generarHTML(safeTurnos, configuracion)

    // 1. Crear ventana oculta (show: false)
    const win = new BrowserWindow({
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      }
    })

    // 2. Cargar el HTML en la ventana. Usamos encodeURIComponent para seguridad y robustez.
    // Esto es más simple que usar EJS si ya tienes el HTML en strings.
    await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)
    
    // Esperamos a que el contenido se cargue completamente (1.5 segundos es un buffer seguro)
    await new Promise(resolve => setTimeout(resolve, 1500))

    // 3. Generar el PDF
    const pdfBuffer = await win.webContents.printToPDF({
      printBackground: true, // Crucial para imprimir colores y fondos
      landscape: false,
      pageSize: 'Letter',
      scale: 0.95 // Ajusta la escala para asegurar que el contenido quepa en la página
    })

    // 4. Guardar el archivo
    const rutaDescargas = app.getPath('downloads')
    const nombrePDF = `Reporte-Turnos-${Date.now()}.pdf`
    const rutaCompleta = path.join(rutaDescargas, nombrePDF)

    fs.writeFileSync(rutaCompleta, pdfBuffer)
    win.close() // Cerramos la ventana oculta

    // 5. Abrir el archivo guardado (comportamiento solicitado)
    await shell.openPath(rutaCompleta)
    console.log(`✅ Reporte generado: ${rutaCompleta}`)

    return rutaCompleta
  } catch (error) {
    console.error('❌ Error al generar reporte:', error)
    // Usamos el diálogo de error de Electron para notificar al usuario en el entorno
    shell.beep()
    return '' // Retornamos cadena vacía en caso de error
  }
}