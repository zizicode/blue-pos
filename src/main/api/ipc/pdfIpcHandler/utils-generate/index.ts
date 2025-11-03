
import * as fs from 'fs'
import * as path from 'path'
import { BrowserWindow, app, shell } from 'electron'

// ==================== UTILIDADES PARA PDF ====================
function formatearFechaCliente(fechaISO: string | null): string {
    if (!fechaISO) return 'N/A'
    const fecha = new Date(fechaISO)
    return fecha.toLocaleDateString('es-DO', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
    })
}

function formatearHoraCliente(fechaISO: string | null): string {
    if (!fechaISO) return 'N/A'
    const fecha = new Date(fechaISO)
    return fecha.toLocaleTimeString('es-DO', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    })
}

function formatearMontoCliente(monto: number | string | null, simbolo = '$'): string {
    if (monto === null || monto === undefined) return `${simbolo}0.00`
    const numero = typeof monto === 'string' ? parseFloat(monto) : monto
    return `${simbolo}${numero.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`
}

function numeroALetras(numero: number): string {
    const unidades = ['', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE']
    const decenas = ['', '', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA']
    const especiales = ['DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISÉIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE']
    const centenas = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS']

    if (numero === 0) return 'CERO PESOS'

    const entero = Math.floor(numero)
    const decimales = Math.round((numero - entero) * 100)

    let resultado = ''

    // Miles
    if (entero >= 1000) {
        const miles = Math.floor(entero / 1000)
        if (miles === 1) {
            resultado += 'MIL '
        } else {
            resultado += convertirMenorMil(miles) + ' MIL '
        }
    }

    // Cientos
    resultado += convertirMenorMil(entero % 1000)

    resultado += ' PESOS'

    if (decimales > 0) {
        resultado += ` CON ${decimales.toString().padStart(2, '0')}/100`
    }

    return resultado.trim()

    function convertirMenorMil(n: number): string {
        if (n === 0) return ''
        if (n === 100) return 'CIEN'

        let res = ''

        // Centenas
        const c = Math.floor(n / 100)
        if (c > 0) {
            res += centenas[c] + ' '
        }

        const resto = n % 100

        // Decenas especiales (10-19)
        if (resto >= 10 && resto < 20) {
            res += especiales[resto - 10]
        } else {
            const d = Math.floor(resto / 10)
            const u = resto % 10

            if (d > 0) {
                res += decenas[d]
                if (u > 0) {
                    res += ' Y ' + unidades[u]
                }
            } else if (u > 0) {
                res += unidades[u]
            }
        }

        return res.trim()
    }
}



export function generarHTMLFacturaCliente(factura: any, configuracion: any): string {
    const simbolo = configuracion?.simbolo_moneda || '$'
    const ivaPorc = Number(configuracion?.iva_porcentaje || 18)
    const aplicaIva = configuracion?.aplicar_iva !== false

    const iva = aplicaIva ? Number(factura.total || 0) - Number(factura.subtotal || 0) : 0
    const totalEnLetras = numeroALetras(Number(factura.total || 0))

    return `
  <!DOCTYPE html>
  <html lang="es">
  <head>
    <meta charset="UTF-8">
    <title>Factura ${factura.folio}</title>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { 
        font-family: 'Arial', sans-serif; 
        font-size: 11pt; 
        color: #1a1a1a;
        padding: 20px;
      }
      
      .factura-container {
        max-width: 800px;
        margin: 0 auto;
        border: 2px solid #2563eb;
        border-radius: 10px;
        overflow: hidden;
      }
      
      /* Header */
      .header {
        background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%);
        color: white;
        padding: 25px;
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 20px;
      }
      
      .empresa-info h1 {
        font-size: 22pt;
        margin-bottom: 8px;
      }
      .empresa-info p {
        font-size: 10pt;
        margin: 3px 0;
        opacity: 0.95;
      }
      
      .factura-info {
        text-align: right;
      }
      .factura-numero {
        font-size: 24pt;
        font-weight: bold;
        margin-bottom: 8px;
        background: rgba(255,255,255,0.15);
        padding: 8px 15px;
        border-radius: 8px;
        display: inline-block;
      }
      .factura-fecha {
        font-size: 10pt;
        margin: 5px 0;
      }
      .tipo-badge {
        display: inline-block;
        background: rgba(255,255,255,0.2);
        padding: 5px 15px;
        border-radius: 15px;
        font-size: 9pt;
        margin-top: 8px;
        text-transform: uppercase;
        letter-spacing: 1px;
      }
      
      /* Body */
      .body {
        padding: 25px;
      }
      
      /* Cliente */
      .cliente-section {
        background: #f8fafc;
        padding: 15px;
        border-radius: 8px;
        margin-bottom: 20px;
        border-left: 4px solid #2563eb;
      }
      .cliente-section h3 {
        font-size: 12pt;
        color: #1e40af;
        margin-bottom: 10px;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .cliente-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 10px;
      }
      .cliente-item {
        font-size: 10pt;
      }
      .cliente-item strong {
        color: #64748b;
        display: block;
        font-size: 9pt;
        margin-bottom: 2px;
      }
      .cliente-item span {
        color: #1a1a1a;
        font-weight: 500;
      }
      
      /* Productos */
      .productos-section {
        margin: 20px 0;
      }
      .productos-section h3 {
        font-size: 12pt;
        color: #1e40af;
        margin-bottom: 12px;
        padding-bottom: 8px;
        border-bottom: 2px solid #e2e8f0;
      }
      
      table {
        width: 100%;
        border-collapse: collapse;
        margin: 10px 0;
      }
      thead {
        background: #f1f5f9;
      }
      th {
        padding: 10px;
        text-align: left;
        font-size: 9pt;
        color: #475569;
        border-bottom: 2px solid #cbd5e1;
        text-transform: uppercase;
        font-weight: 600;
      }
      td {
        padding: 10px;
        border-bottom: 1px solid #e2e8f0;
        font-size: 10pt;
      }
      tbody tr:nth-child(even) {
        background: #f8fafc;
      }
      .text-right { text-align: right; }
      .text-center { text-align: center; }
      
      .producto-nombre {
        font-weight: 600;
        color: #1a1a1a;
      }
      .producto-codigo {
        font-size: 9pt;
        color: #64748b;
        display: block;
        margin-top: 2px;
      }
      
      /* Totales */
      .totales-section {
        margin-top: 25px;
        display: grid;
        grid-template-columns: 1.5fr 1fr;
        gap: 20px;
      }
      
      .observaciones {
        background: #fef3c7;
        padding: 15px;
        border-radius: 8px;
        border-left: 4px solid #f59e0b;
      }
      .observaciones h4 {
        font-size: 10pt;
        color: #92400e;
        margin-bottom: 8px;
      }
      .observaciones p {
        font-size: 9pt;
        color: #78350f;
        line-height: 1.5;
      }
      
      .totales-box {
        background: #f8fafc;
        padding: 15px;
        border-radius: 8px;
        border: 2px solid #e2e8f0;
      }
      .total-row {
        display: flex;
        justify-content: space-between;
        padding: 8px 0;
        font-size: 10pt;
        border-bottom: 1px dashed #cbd5e1;
      }
      .total-row:last-child {
        border-bottom: none;
      }
      .total-row.final {
        background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%);
        color: white;
        padding: 12px;
        margin-top: 10px;
        border-radius: 6px;
        font-size: 14pt;
        font-weight: bold;
      }
      
      .total-letras {
        background: #dbeafe;
        padding: 12px;
        border-radius: 6px;
        margin-top: 10px;
        text-align: center;
      }
      .total-letras strong {
        display: block;
        font-size: 8pt;
        color: #1e40af;
        margin-bottom: 5px;
        text-transform: uppercase;
      }
      .total-letras span {
        font-size: 10pt;
        color: #1e40af;
        font-weight: 600;
      }
      
      /* Pagos */
      .pagos-section {
        margin-top: 20px;
        padding: 15px;
        background: #f0fdf4;
        border-radius: 8px;
        border-left: 4px solid #10b981;
      }
      .pagos-section h4 {
        font-size: 11pt;
        color: #059669;
        margin-bottom: 10px;
      }
      .pago-item {
        display: flex;
        justify-content: space-between;
        padding: 6px 0;
        font-size: 10pt;
        border-bottom: 1px dashed #d1fae5;
      }
      .pago-item:last-child {
        border-bottom: none;
      }
      .pago-metodo {
        color: #047857;
        font-weight: 500;
      }
      .pago-monto {
        color: #059669;
        font-weight: 600;
      }
      
      /* Footer */
      .footer {
        background: #f8fafc;
        padding: 20px;
        text-align: center;
        border-top: 2px solid #e2e8f0;
        margin-top: 30px;
      }
      .footer h4 {
        font-size: 11pt;
        color: #1e40af;
        margin-bottom: 10px;
      }
      .footer p {
        font-size: 9pt;
        color: #64748b;
        margin: 5px 0;
      }
      .footer .importante {
        background: #fef3c7;
        padding: 10px;
        border-radius: 6px;
        margin-top: 10px;
        font-size: 8pt;
        color: #92400e;
      }
      
      @media print {
        body { padding: 0; }
        .factura-container { border: none; }
      }
    </style>
  </head>
  <body>
    <div class="factura-container">
      <!-- Header -->
      <div class="header">
        <div class="empresa-info">
          <h1>${configuracion?.nombre_negocio || 'SISTEMA POS'}</h1>
          ${configuracion?.rfc ? `<p><strong>RNC:</strong> ${configuracion.rfc}</p>` : ''}
          ${configuracion?.telefono ? `<p><strong>Tel:</strong> ${configuracion.telefono}</p>` : ''}
          ${configuracion?.email ? `<p><strong>Email:</strong> ${configuracion.email}</p>` : ''}
          ${configuracion?.direccion ? `<p><strong>Dirección:</strong> ${configuracion.direccion}</p>` : ''}
        </div>
        
        <div class="factura-info">
          <div class="factura-numero">${factura.folio}</div>
          <div class="factura-fecha">
            📅 ${formatearFechaCliente(factura.fecha)}
          </div>
          <div class="factura-fecha">
            🕐 ${formatearHoraCliente(factura.fecha)}
          </div>
          <div class="tipo-badge">
            ${factura.tipo_venta === 'contado' ? '💵 CONTADO' : '📋 CRÉDITO'}
          </div>
        </div>
      </div>
      
      <!-- Body -->
      <div class="body">
        <!-- Cliente -->
        <div class="cliente-section">
          <h3>👤 Información del Cliente</h3>
          <div class="cliente-grid">
            <div class="cliente-item">
              <strong>Nombre / Razón Social:</strong>
              <span>${factura.cliente_nombre || 'Cliente General'}</span>
            </div>
            ${factura.cliente_telefono ? `
            <div class="cliente-item">
              <strong>Teléfono:</strong>
              <span>${factura.cliente_telefono}</span>
            </div>
            ` : ''}
            ${factura.cliente_rfc ? `
            <div class="cliente-item">
              <strong>RNC / Cédula:</strong>
              <span>${factura.cliente_rfc}</span>
            </div>
            ` : ''}
            ${factura.cliente_direccion ? `
            <div class="cliente-item" style="grid-column: 1 / -1;">
              <strong>Dirección:</strong>
              <span>${factura.cliente_direccion}</span>
            </div>
            ` : ''}
          </div>
        </div>
        
        <!-- Productos -->
        <div class="productos-section">
          <h3>🛒 Detalle de Productos</h3>
          <table>
            <thead>
              <tr>
                <th style="width: 12%;">Código</th>
                <th style="width: 38%;">Descripción</th>
                <th style="width: 10%;" class="text-center">Cant.</th>
                <th style="width: 13%;" class="text-right">Precio Unit.</th>
                <th style="width: 12%;" class="text-right">Descuento</th>
                <th style="width: 15%;" class="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              ${factura.detalles.map((det: any) => {
        const totalItem = det.subtotal
        return `
                <tr>
                  <td>${det.codigo || 'N/A'}</td>
                  <td>
                    <div class="producto-nombre">${det.producto_nombre}</div>
                    ${det.unidad_medida ? `<span class="producto-codigo">U.M: ${det.unidad_medida}</span>` : ''}
                  </td>
                  <td class="text-center">${det.cantidad}</td>
                  <td class="text-right">${formatearMontoCliente(det.precio_unitario, simbolo)}</td>
                  <td class="text-right">${det.descuento_monto > 0 ? formatearMontoCliente(det.descuento_monto, simbolo) : '-'}</td>
                  <td class="text-right"><strong>${formatearMontoCliente(totalItem, simbolo)}</strong></td>
                </tr>
                `
    }).join('')}
            </tbody>
          </table>
        </div>
        
        <!-- Totales -->
        <div class="totales-section">
          <!-- Observaciones -->
          <div class="observaciones">
            <h4>📝 Observaciones</h4>
            <p>${factura.notas || 'Gracias por su compra. Este documento es un comprobante válido de pago.'}</p>
            <p style="margin-top: 10px;">
              <strong>Atendió:</strong> ${factura.usuario_nombre || 'N/A'}
            </p>
          </div>
          
          <!-- Totales -->
          <div>
            <div class="totales-box">
              <div class="total-row">
                <span>Subtotal:</span>
                <span>${formatearMontoCliente(factura.subtotal, simbolo)}</span>
              </div>
              ${Number(factura.descuento || 0) > 0 ? `
              <div class="total-row">
                <span>Descuento General:</span>
                <span>- ${formatearMontoCliente(factura.descuento, simbolo)}</span>
              </div>
              ` : ''}
              ${aplicaIva ? `
              <div class="total-row">
                <span>ITBIS (${ivaPorc}%):</span>
                <span>${formatearMontoCliente(iva, simbolo)}</span>
              </div>
              ` : ''}
              <div class="total-row final">
                <span>TOTAL A PAGAR:</span>
                <span>${formatearMontoCliente(factura.total, simbolo)}</span>
              </div>
            </div>
            
            <div class="total-letras">
              <strong>Son:</strong>
              <span>${totalEnLetras}</span>
            </div>
          </div>
        </div>
        
        <!-- Pagos (solo si es contado) -->
        ${factura.tipo_venta === 'contado' && factura.pagos && factura.pagos.length > 0 ? `
        <div class="pagos-section">
          <h4>💳 Forma de Pago</h4>
          ${factura.pagos.map((pago: any) => `
            <div class="pago-item">
              <span class="pago-metodo">${pago.metodo_pago_nombre}${pago.referencia ? ` - Ref: ${pago.referencia}` : ''}</span>
              <span class="pago-monto">${formatearMontoCliente(pago.monto, simbolo)}</span>
            </div>
          `).join('')}
        </div>
        ` : ''}
        
        ${factura.tipo_venta === 'credito' ? `
        <div class="pagos-section" style="background: #fef3c7; border-left-color: #f59e0b;">
          <h4 style="color: #92400e;">💳 Venta a Crédito</h4>
          <div class="pago-item">
            <span class="pago-metodo" style="color: #78350f;">Saldo pendiente de pago</span>
            <span class="pago-monto" style="color: #92400e;">${formatearMontoCliente(factura.total, simbolo)}</span>
          </div>
          ${factura.fecha_vencimiento ? `
          <div class="pago-item">
            <span style="color: #78350f; font-size: 9pt;">⏰ Fecha de vencimiento: ${formatearFechaCliente(factura.fecha_vencimiento)}</span>
          </div>
          ` : ''}
        </div>
        ` : ''}
      </div>
      
      <!-- Footer -->
      <div class="footer">
        <h4>${configuracion?.mensaje_ticket_footer || '¡Gracias por su preferencia!'}</h4>
        <div class="importante">
          ⚠️ IMPORTANTE: Este documento no es válido como comprobante fiscal.
        </div>
      </div>
    </div>
  </body>
  </html>
    `
}


// ==================== UTILIDADES ====================
function formatearFecha(fechaISO: string | null): string {
    if (!fechaISO) return 'N/A'
    const fecha = new Date(fechaISO)
    return fecha.toLocaleDateString('es-DO', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    })
}

function formatearHora(fechaISO: string | null): string {
    if (!fechaISO) return 'N/A'
    const fecha = new Date(fechaISO)
    return fecha.toLocaleTimeString('es-DO', {
        hour: '2-digit',
        minute: '2-digit'
    })
}

function formatearMonto(monto: number | string | null, simbolo = '$'): string {
    if (monto === null || monto === undefined) return `${simbolo}0.00`
    const numero = typeof monto === 'string' ? parseFloat(monto) : monto
    return `${simbolo}${numero.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`
}

// ==================== GENERAR HTML ====================
export function generarHTMLFacturas(facturas: any[], configuracion: any): string {
    const simbolo = configuracion?.simbolo_moneda || '$'
    const ivaPorc = Number(configuracion?.iva_porcentaje || 18)
    const aplicaIva = configuracion?.aplicar_iva !== false

    // Calcular totales generales
    const totales = facturas.reduce((acc, f) => ({
        subtotal: acc.subtotal + Number(f.subtotal || 0),
        total: acc.total + Number(f.total || 0),
        descuentos: acc.descuentos + Number(f.descuento || 0),
        ganancia: acc.ganancia + Number(f.estadisticas?.ganancia_bruta || 0)
    }), { subtotal: 0, total: 0, descuentos: 0, ganancia: 0 })

    const fechaGeneracion = new Date().toLocaleString('es-DO', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    })

    return `
  <!DOCTYPE html>
  <html lang="es">
  <head>
    <meta charset="UTF-8">
    <title>Facturas - ${configuracion?.nombre_empresa || 'Sistema POS'}</title>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { 
        font-family: 'Segoe UI', Arial, sans-serif; 
        font-size: 10pt; 
        line-height: 1.4; 
        color: #1a1a1a; 
        background: #fff;
      }
      
      /* Header principal */
      .main-header {
        text-align: center;
        padding: 15px;
        background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%);
        color: white;
        margin-bottom: 20px;
      }
      .main-header h1 { font-size: 20pt; margin-bottom: 5px; }
      .main-header .subtitle { font-size: 10pt; opacity: 0.9; }
      .main-header .info { font-size: 8pt; opacity: 0.8; margin-top: 5px; }
  
      /* Resumen general */
      .summary-general {
        background: #f8fafc;
        padding: 12px;
        border-radius: 8px;
        margin-bottom: 20px;
        border: 1px solid #e2e8f0;
      }
      .summary-general h3 {
        font-size: 12pt;
        color: #1e40af;
        margin-bottom: 8px;
        border-bottom: 2px solid #e2e8f0;
        padding-bottom: 5px;
      }
      .summary-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 8px;
        margin-top: 10px;
      }
      .summary-item {
        background: white;
        padding: 8px;
        border-radius: 6px;
        text-align: center;
        border: 1px solid #e2e8f0;
      }
      .summary-item label {
        display: block;
        font-size: 8pt;
        color: #64748b;
        margin-bottom: 3px;
      }
      .summary-item .value {
        font-size: 11pt;
        font-weight: bold;
        color: #1e40af;
      }
  
      /* Factura individual */
      .factura {
        page-break-inside: avoid;
        page-break-after: always;
        border: 2px solid #e2e8f0;
        border-radius: 10px;
        margin-bottom: 30px;
        overflow: hidden;
        background: white;
      }
      .factura:last-child { page-break-after: auto; }
  
      /* Header de factura */
      .factura-header {
        background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%);
        color: white;
        padding: 20px;
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 20px;
      }
      .empresa-info h2 {
        font-size: 16pt;
        margin-bottom: 5px;
      }
      .empresa-info p {
        font-size: 8pt;
        opacity: 0.9;
        margin: 2px 0;
      }
      .factura-info {
        text-align: right;
      }
      .factura-numero {
        font-size: 20pt;
        font-weight: bold;
        margin-bottom: 5px;
      }
      .factura-fecha {
        font-size: 9pt;
        opacity: 0.9;
      }
      .factura-tipo {
        display: inline-block;
        background: rgba(255,255,255,0.2);
        padding: 4px 12px;
        border-radius: 12px;
        font-size: 8pt;
        margin-top: 5px;
        text-transform: uppercase;
      }
  
      /* Contenido de factura */
      .factura-body {
        padding: 20px;
      }
  
      /* Info de cliente */
      .cliente-section {
        background: #f8fafc;
        padding: 12px;
        border-radius: 6px;
        margin-bottom: 15px;
        border-left: 3px solid #2563eb;
      }
      .cliente-section h4 {
        font-size: 10pt;
        color: #1e40af;
        margin-bottom: 6px;
      }
      .cliente-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 8px;
      }
      .cliente-item {
        font-size: 9pt;
      }
      .cliente-item label {
        color: #64748b;
        margin-right: 5px;
      }
      .cliente-item span {
        color: #1a1a1a;
        font-weight: 500;
      }
  
      /* Tabla de productos */
      .productos-section {
        margin-bottom: 15px;
      }
      .productos-section h4 {
        font-size: 11pt;
        color: #1e40af;
        margin-bottom: 10px;
        padding-bottom: 5px;
        border-bottom: 2px solid #e2e8f0;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        font-size: 9pt;
      }
      thead {
        background: #f1f5f9;
      }
      th {
        padding: 8px;
        text-align: left;
        font-weight: 600;
        color: #475569;
        border-bottom: 2px solid #cbd5e1;
        font-size: 8pt;
        text-transform: uppercase;
      }
      td {
        padding: 8px;
        border-bottom: 1px solid #e2e8f0;
      }
      tbody tr:hover {
        background: #f8fafc;
      }
      .text-right { text-align: right; }
      .text-center { text-align: center; }
      
      .producto-nombre {
        font-weight: 500;
        color: #1a1a1a;
      }
      .producto-codigo {
        font-size: 8pt;
        color: #64748b;
      }
  
      /* Totales */
      .totales-section {
        margin-top: 15px;
        border-top: 2px solid #e2e8f0;
        padding-top: 15px;
      }
      .totales-grid {
        display: grid;
        grid-template-columns: 1fr 200px;
        gap: 10px;
      }
      .estadisticas {
        background: #f8fafc;
        padding: 10px;
        border-radius: 6px;
      }
      .estadisticas h5 {
        font-size: 9pt;
        color: #1e40af;
        margin-bottom: 6px;
      }
      .stat-item {
        display: flex;
        justify-content: space-between;
        padding: 4px 0;
        font-size: 8pt;
        border-bottom: 1px dashed #e2e8f0;
      }
      .stat-item:last-child {
        border-bottom: none;
      }
      .stat-item label {
        color: #64748b;
      }
      .stat-item span {
        font-weight: 600;
        color: #1a1a1a;
      }
  
      .totales-box {
        background: #f8fafc;
        padding: 12px;
        border-radius: 6px;
        border: 1px solid #e2e8f0;
      }
      .total-row {
        display: flex;
        justify-content: space-between;
        padding: 6px 0;
        font-size: 9pt;
      }
      .total-row.final {
        border-top: 2px solid #2563eb;
        margin-top: 8px;
        padding-top: 8px;
        font-size: 12pt;
        font-weight: bold;
        color: #1e40af;
      }
  
      /* Pagos */
      .pagos-section {
        margin-top: 15px;
        padding: 12px;
        background: #f8fafc;
        border-radius: 6px;
        border-left: 3px solid #10b981;
      }
      .pagos-section h5 {
        font-size: 9pt;
        color: #059669;
        margin-bottom: 8px;
      }
      .pago-item {
        display: flex;
        justify-content: space-between;
        padding: 4px 0;
        font-size: 8pt;
        border-bottom: 1px dashed #d1d5db;
      }
      .pago-item:last-child {
        border-bottom: none;
      }
  
      /* Notas */
      .notas-section {
        margin-top: 15px;
        padding: 10px;
        background: #fef3c7;
        border-radius: 6px;
        border-left: 3px solid #f59e0b;
        font-size: 8pt;
      }
  
      /* Footer */
      .factura-footer {
        background: #f8fafc;
        padding: 12px;
        text-align: center;
        font-size: 8pt;
        color: #64748b;
        border-top: 2px solid #e2e8f0;
      }
  
      /* Badges */
      .badge {
        display: inline-block;
        padding: 3px 8px;
        border-radius: 10px;
        font-size: 8pt;
        font-weight: 600;
        text-transform: uppercase;
      }
      .badge-contado {
        background: #dcfce7;
        color: #166534;
      }
      .badge-credito {
        background: #fef3c7;
        color: #92400e;
      }
      .badge-completada {
        background: #dbeafe;
        color: #1e40af;
      }
  
      @media print {
        body { background: white; }
        .factura { border: none; box-shadow: none; }
      }
    </style>
  </head>
  <body>
    <!-- Header Principal -->
    <div class="main-header">
      <h1>📄 ${configuracion?.nombre_empresa || 'Sistema POS'}</h1>
      <div class="subtitle">Comprobantes de Venta</div>
      <div class="info">
        Generado: ${fechaGeneracion} | Total de facturas: ${facturas.length}
      </div>
    </div>
  
    <!-- Resumen General (solo si hay más de 1 factura) -->
    ${facturas.length > 1 ? `
    <div class="summary-general">
      <h3>📊 Resumen General</h3>
      <div class="summary-grid">
        <div class="summary-item">
          <label>Total Facturado</label>
          <div class="value">${formatearMonto(totales.total, simbolo)}</div>
        </div>
        <div class="summary-item">
          <label>Subtotal</label>
          <div class="value">${formatearMonto(totales.subtotal, simbolo)}</div>
        </div>
        <div class="summary-item">
          <label>Descuentos</label>
          <div class="value">${formatearMonto(totales.descuentos, simbolo)}</div>
        </div>
        <div class="summary-item">
          <label>Ganancia Estimada</label>
          <div class="value">${formatearMonto(totales.ganancia, simbolo)}</div>
        </div>
      </div>
    </div>
    ` : ''}
  
    <!-- Facturas Individuales -->
    ${facturas.map(factura => generarHTMLFactura(factura, configuracion, simbolo, ivaPorc, aplicaIva)).join('')}
  
  </body>
  </html>
    `
}



export function generarHTMLFactura(factura: any, configuracion: any, simbolo: string, ivaPorc: number, aplicaIva: boolean): string {
    const iva = aplicaIva ? Number(factura.total || 0) - Number(factura.subtotal || 0) : 0

    return `
      <div class="factura">
        <!-- Header -->
        <div class="factura-header">
          <div class="empresa-info">
            <h2>${configuracion?.nombre_empresa || 'Sistema POS'}</h2>
            <p>${configuracion?.rfc ? `RNC: ${configuracion.rfc}` : ''}</p>
            <p>${configuracion?.telefono || ''}</p>
            <p>${configuracion?.email || ''}</p>
            <p>${configuracion?.direccion || ''}</p>
          </div>
          <div class="factura-info">
            <div class="factura-numero">${factura.folio}</div>
            <div class="factura-fecha">
              📅 ${formatearFecha(factura.fecha)} ${formatearHora(factura.fecha)}
            </div>
            <div class="factura-tipo badge-${factura.tipo_venta}">
              ${factura.tipo_venta}
            </div>
            <div class="factura-tipo badge-${factura.estado}">
              ${factura.estado}
            </div>
          </div>
        </div>
  
        <!-- Body -->
        <div class="factura-body">
          <!-- Cliente -->
          <div class="cliente-section">
            <h4>👤 Información del Cliente</h4>
            <div class="cliente-grid">
              <div class="cliente-item">
                <label>Nombre:</label>
                <span>${factura.cliente_nombre || 'Cliente General'}</span>
              </div>
              <div class="cliente-item">
                <label>Teléfono:</label>
                <span>${factura.cliente_telefono || 'N/A'}</span>
              </div>
              ${factura.cliente_rfc ? `
              <div class="cliente-item">
                <label>RNC/Cédula:</label>
                <span>${factura.cliente_rfc}</span>
              </div>
              ` : ''}
              ${factura.cliente_direccion ? `
              <div class="cliente-item">
                <label>Dirección:</label>
                <span>${factura.cliente_direccion}</span>
              </div>
              ` : ''}
            </div>
          </div>
  
          <!-- Productos -->
          <div class="productos-section">
            <h4>🛒 Detalle de Productos</h4>
            <table>
              <thead>
                <tr>
                  <th style="width: 10%;">Código</th>
                  <th style="width: 35%;">Producto</th>
                  <th style="width: 10%;" class="text-center">Cant.</th>
                  <th style="width: 12%;" class="text-right">P. Unit.</th>
                  <th style="width: 10%;" class="text-right">Desc.</th>
                  <th style="width: 12%;" class="text-right">Subtotal</th>
                  <th style="width: 11%;" class="text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                ${factura.detalles.map((det: any) => {
        const totalItem = det.subtotal - (det.descuento_monto || 0)
        return `
                  <tr>
                    <td class="producto-codigo">${det.codigo || 'N/A'}</td>
                    <td>
                      <div class="producto-nombre">${det.producto_nombre}</div>
                      ${det.unidad_medida ? `<div class="producto-codigo">${det.unidad_medida}</div>` : ''}
                    </td>
                    <td class="text-center">${det.cantidad}</td>
                    <td class="text-right">${formatearMonto(det.precio_unitario, simbolo)}</td>
                    <td class="text-right">${det.descuento_monto > 0 ? formatearMonto(det.descuento_monto, simbolo) : '-'}</td>
                    <td class="text-right">${formatearMonto(det.subtotal, simbolo)}</td>
                    <td class="text-right"><strong>${formatearMonto(totalItem, simbolo)}</strong></td>
                  </tr>
                  `
    }).join('')}
              </tbody>
            </table>
          </div>
  
          <!-- Totales y Estadísticas -->
          <div class="totales-section">
            <div class="totales-grid">
              <!-- Estadísticas -->
              <div class="estadisticas">
                <h5>📊 Estadísticas de Venta</h5>
                <div class="stat-item">
                  <label>Productos vendidos:</label>
                  <span>${factura.detalles.length}</span>
                </div>
                <div class="stat-item">
                  <label>Unidades totales:</label>
                  <span>${factura.detalles.reduce((sum: number, d: any) => sum + d.cantidad, 0)}</span>
                </div>
                <div class="stat-item">
                  <label>Costo estimado:</label>
                  <span>${formatearMonto(factura.estadisticas.costo_total, simbolo)}</span>
                </div>
                <div class="stat-item">
                  <label>Ganancia estimada:</label>
                  <span>${formatearMonto(factura.estadisticas.ganancia_bruta, simbolo)}</span>
                </div>
                <div class="stat-item">
                  <label>Margen de ganancia:</label>
                  <span>${factura.estadisticas.margen_porcentaje}%</span>
                </div>
                <div class="stat-item">
                  <label>Atendió:</label>
                  <span>${factura.usuario_nombre}</span>
                </div>
              </div>
  
              <!-- Totales -->
              <div class="totales-box">
                <div class="total-row">
                  <span>Subtotal:</span>
                  <span>${formatearMonto(factura.subtotal, simbolo)}</span>
                </div>
                ${Number(factura.descuento || 0) > 0 ? `
                <div class="total-row">
                  <span>Descuento:</span>
                  <span>- ${formatearMonto(factura.descuento, simbolo)}</span>
                </div>
                ` : ''}
                ${aplicaIva ? `
                <div class="total-row">
                  <span>ITBIS (${ivaPorc}%):</span>
                  <span>${formatearMonto(iva, simbolo)}</span>
                </div>
                ` : ''}
                <div class="total-row final">
                  <span>TOTAL:</span>
                  <span>${formatearMonto(factura.total, simbolo)}</span>
                </div>
              </div>
            </div>
          </div>
  
          <!-- Pagos (solo si es contado y hay pagos) -->
          ${factura.tipo_venta === 'contado' && factura.pagos && factura.pagos.length > 0 ? `
          <div class="pagos-section">
            <h5>💳 Métodos de Pago</h5>
            ${factura.pagos.map((pago: any) => `
              <div class="pago-item">
                <span>${pago.metodo_pago_nombre}${pago.referencia ? ` (${pago.referencia})` : ''}</span>
                <strong>${formatearMonto(pago.monto, simbolo)}</strong>
              </div>
            `).join('')}
          </div>
          ` : ''}
  
          <!-- Notas -->
          ${factura.notas ? `
          <div class="notas-section">
            <strong>📝 Notas:</strong> ${factura.notas}
          </div>
          ` : ''}
        </div>
  
        <!-- Footer -->
        <div class="factura-footer">
          <p>${configuracion?.mensaje_ticket_footer || 'Gracias por su compra'}</p>
          <p>💻 Generado por ${configuracion?.nombre_empresa || 'Sistema POS'}</p>
        </div>
      </div>
    `
}

// ==================== GENERAR PDF ====================
export async function generarPDFFacturaCliente(html: string, folio: string): Promise<string> {
    const win = new BrowserWindow({
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      }
    })
  
    await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)
    await new Promise(resolve => setTimeout(resolve, 1500))
  
    const pdfBuffer = await win.webContents.printToPDF({
      printBackground: true,
      landscape: false,
      pageSize: 'Letter',
      scale: 0.95,
      margins: {
        top: 0.4,
        bottom: 0.4,
        left: 0.4,
        right: 0.4
      }
    })
  
    const rutaDescargas = app.getPath('downloads')
    const nombrePDF = `Factura-${folio}-${Date.now()}.pdf`
    const rutaCompleta = path.join(rutaDescargas, nombrePDF)
  
    fs.writeFileSync(rutaCompleta, pdfBuffer)
    win.close()
  
    // Abrir automáticamente el PDF
    await shell.openPath(rutaCompleta)
    console.log(`✅ Factura generada: ${rutaCompleta}`)
  
    return rutaCompleta
  }
  




// ==================== GENERAR PDF ====================
export async function generarPDFFactura(html: string, cantidadFacturas: number): Promise<string> {
    const win = new BrowserWindow({
        show: false,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
        }
    })

    await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)
    await new Promise(resolve => setTimeout(resolve, 2000))

    const pdfBuffer = await win.webContents.printToPDF({
        printBackground: true,
        landscape: false,
        pageSize: 'Letter',
        scale: 0.95,
        margins: {
            top: 0.5,
            bottom: 0.5,
            left: 0.5,
            right: 0.5
        }
    })

    const rutaDescargas = app.getPath('downloads')
    const nombrePDF = cantidadFacturas === 1
        ? `Factura-${Date.now()}.pdf`
        : `Facturas-${cantidadFacturas}-${Date.now()}.pdf`
    const rutaCompleta = path.join(rutaDescargas, nombrePDF)

    fs.writeFileSync(rutaCompleta, pdfBuffer)
    win.close()

    await shell.openPath(rutaCompleta)
    console.log(`✅ PDF generado: ${rutaCompleta}`)

    return rutaCompleta
}

