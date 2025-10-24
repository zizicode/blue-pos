import { RowDataPacket } from 'mysql2'
import { getConnection } from '../../db/connection'


// ============================================
// src/main/api/ipc/reportes/reportesController.ts
// ============================================

export const reportesController = {
    /**
     * Reporte de ventas detallado
     */
    async ventasDetallado(data: {
      fecha_inicio: string
      fecha_fin: string
      cliente_id?: number
      usuario_id?: number
      tipo_venta?: string
    }) {
      try {
        const connection = await getConnection()
  
        let whereConditions = ['v.estado = "completada"', 'DATE(v.fecha) BETWEEN ? AND ?']
        const params: any[] = [data.fecha_inicio, data.fecha_fin]
  
        if (data.cliente_id) {
          whereConditions.push('v.cliente_id = ?')
          params.push(data.cliente_id)
        }
  
        if (data.usuario_id) {
          whereConditions.push('v.usuario_id = ?')
          params.push(data.usuario_id)
        }
  
        if (data.tipo_venta) {
          whereConditions.push('v.tipo_venta = ?')
          params.push(data.tipo_venta)
        }
  
        const whereClause = `WHERE ${whereConditions.join(' AND ')}`
  
        const query = `
          SELECT 
            v.folio,
            v.fecha,
            c.nombre as cliente,
            u.nombre as usuario,
            v.subtotal,
            v.descuento,
            v.total,
            v.tipo_venta,
            GROUP_CONCAT(
              CONCAT(p.nombre, ' (', dv.cantidad, ')')
              SEPARATOR ', '
            ) as productos
          FROM ventas v
          LEFT JOIN clientes c ON v.cliente_id = c.id
          INNER JOIN usuarios u ON v.usuario_id = u.id
          INNER JOIN detalle_ventas dv ON v.id = dv.venta_id
          INNER JOIN productos p ON dv.producto_id = p.id
          ${whereClause}
          GROUP BY v.id, v.folio, v.fecha, c.nombre, u.nombre, v.subtotal, v.descuento, v.total, v.tipo_venta
          ORDER BY v.fecha DESC
        `
  
        const [ventas] = await connection.execute<RowDataPacket[]>(query, params)
  
        // Totales
        const [totales] = await connection.execute<RowDataPacket[]>(
          `SELECT 
            COUNT(*) as total_ventas,
            SUM(subtotal) as total_subtotal,
            SUM(descuento) as total_descuento,
            SUM(total) as total_monto
          FROM ventas v
          ${whereClause}`,
          params
        )
  
        return {
          success: true,
          data: {
            ventas,
            totales: totales[0]
          }
        }
      } catch (error) {
        return {
          success: false,
          message: 'Error al generar reporte de ventas',
          error: error instanceof Error ? error.message : 'Error desconocido'
        }
      }
    },
  
    /**
     * Reporte de productos más vendidos
     */
    async productosVendidos(data: {
      fecha_inicio: string
      fecha_fin: string
      categoria_id?: number
      limit?: number
    }) {
      try {
        const connection = await getConnection()
  
        let whereConditions = ['v.estado = "completada"', 'DATE(v.fecha) BETWEEN ? AND ?']
        const params: any[] = [data.fecha_inicio, data.fecha_fin]
  
        if (data.categoria_id) {
          whereConditions.push('p.categoria_id = ?')
          params.push(data.categoria_id)
        }
  
        const whereClause = `WHERE ${whereConditions.join(' AND ')}`
        const limit = data.limit || 50
  
        const query = `
          SELECT 
            p.codigo,
            p.nombre,
            c.nombre as categoria,
            SUM(dv.cantidad) as cantidad_vendida,
            SUM(dv.subtotal) as monto_total,
            AVG(dv.precio_unitario) as precio_promedio,
            p.stock_actual,
            p.precio_compra,
            SUM(dv.subtotal) - (SUM(dv.cantidad) * p.precio_compra) as utilidad_bruta
          FROM detalle_ventas dv
          INNER JOIN ventas v ON dv.venta_id = v.id
          INNER JOIN productos p ON dv.producto_id = p.id
          LEFT JOIN categorias c ON p.categoria_id = c.id
          ${whereClause}
          GROUP BY p.id, p.codigo, p.nombre, c.nombre, p.stock_actual, p.precio_compra
          ORDER BY cantidad_vendida DESC
          LIMIT ?
        `
  
        const [productos] = await connection.execute<RowDataPacket[]>(
          query,
          [...params, limit]
        )
  
        return {
          success: true,
          data: productos
        }
      } catch (error) {
        return {
          success: false,
          message: 'Error al generar reporte de productos',
          error: error instanceof Error ? error.message : 'Error desconocido'
        }
      }
    },
  
    /**
     * Reporte de inventario
     */
    async inventario(data: {
      categoria_id?: number
      proveedor_id?: number
      stock_bajo?: boolean
    }) {
      try {
        const connection = await getConnection()
  
        let whereConditions = ['p.activo = true', 'p.eliminado_en IS NULL']
        const params: any[] = []
  
        if (data.categoria_id) {
          whereConditions.push('p.categoria_id = ?')
          params.push(data.categoria_id)
        }
  
        if (data.proveedor_id) {
          whereConditions.push('p.proveedor_id = ?')
          params.push(data.proveedor_id)
        }
  
        if (data.stock_bajo) {
          whereConditions.push('p.stock_actual <= p.stock_minimo')
        }
  
        const whereClause = `WHERE ${whereConditions.join(' AND ')}`
  
        const query = `
          SELECT 
            p.codigo,
            p.nombre,
            c.nombre as categoria,
            prov.nombre as proveedor,
            um.abreviatura as unidad,
            p.stock_actual,
            p.stock_minimo,
            p.precio_compra,
            p.precio_venta,
            (p.stock_actual * p.precio_compra) as valor_inventario,
            (p.precio_venta - p.precio_compra) as margen_unitario,
            ROUND(((p.precio_venta - p.precio_compra) / p.precio_compra * 100), 2) as margen_porcentaje
          FROM productos p
          LEFT JOIN categorias c ON p.categoria_id = c.id
          LEFT JOIN proveedores prov ON p.proveedor_id = prov.id
          LEFT JOIN unidades_medida um ON p.unidad_medida_id = um.id
          ${whereClause}
          ORDER BY p.nombre ASC
        `
  
        const [productos] = await connection.execute<RowDataPacket[]>(query, params)
  
        // Totales
        const [totales] = await connection.execute<RowDataPacket[]>(
          `SELECT 
            COUNT(*) as total_productos,
            SUM(stock_actual) as total_unidades,
            SUM(stock_actual * precio_compra) as valor_total_inventario
          FROM productos p
          ${whereClause}`,
          params
        )
  
        return {
          success: true,
          data: {
            productos,
            totales: totales[0]
          }
        }
      } catch (error) {
        return {
          success: false,
          message: 'Error al generar reporte de inventario',
          error: error instanceof Error ? error.message : 'Error desconocido'
        }
      }
    },
  
    /**
     * Reporte de caja (corte)
     */
    async corteCaja(data: { turno_id: number }) {
      try {
        const connection = await getConnection()
  
        // Información del turno
        const [turno] = await connection.execute<RowDataPacket[]>(
          `SELECT 
            tc.*,
            c.nombre as caja_nombre,
            u.nombre as usuario_nombre
          FROM turnos_caja tc
          INNER JOIN cajas c ON tc.caja_id = c.id
          INNER JOIN usuarios u ON tc.usuario_id = u.id
          WHERE tc.id = ?`,
          [data.turno_id]
        )
  
        if (turno.length === 0) {
          return {
            success: false,
            message: 'Turno no encontrado'
          }
        }
  
        // Movimientos por tipo
        const [movimientos] = await connection.execute<RowDataPacket[]>(
          `SELECT 
            tipo,
            COUNT(*) as cantidad,
            SUM(monto) as total
          FROM movimientos_caja
          WHERE turno_id = ?
          GROUP BY tipo`,
          [data.turno_id]
        )
  
        // Movimientos por método de pago
        const [metodosPago] = await connection.execute<RowDataPacket[]>(
          `SELECT 
            mp.nombre as metodo,
            SUM(CASE WHEN mc.tipo IN ('entrada', 'venta', 'abono') THEN mc.monto ELSE 0 END) as entradas,
            SUM(CASE WHEN mc.tipo IN ('salida', 'devolucion') THEN mc.monto ELSE 0 END) as salidas
          FROM movimientos_caja mc
          INNER JOIN metodos_pago mp ON mc.metodo_pago_id = mp.id
          WHERE mc.turno_id = ?
          GROUP BY mp.id, mp.nombre`,
          [data.turno_id]
        )
  
        // Detalle de movimientos
        const [detalle] = await connection.execute<RowDataPacket[]>(
          `SELECT 
            mc.*,
            mp.nombre as metodo_pago
          FROM movimientos_caja mc
          LEFT JOIN metodos_pago mp ON mc.metodo_pago_id = mp.id
          WHERE mc.turno_id = ?
          ORDER BY mc.fecha ASC`,
          [data.turno_id]
        )
  
        return {
          success: true,
          data: {
            turno: turno[0],
            movimientos_por_tipo: movimientos,
            movimientos_por_metodo: metodosPago,
            detalle_movimientos: detalle
          }
        }
      } catch (error) {
        return {
          success: false,
          message: 'Error al generar corte de caja',
          error: error instanceof Error ? error.message : 'Error desconocido'
        }
      }
    }
  }