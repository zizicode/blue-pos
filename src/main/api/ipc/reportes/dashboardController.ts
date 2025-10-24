// src/main/api/ipc/reportes/dashboardController.ts

import { RowDataPacket } from 'mysql2'
import { getConnection } from '../../db/connection'

export const dashboardController = {
  /**
   * Obtener estadísticas principales del dashboard
   */
  async getEstadisticas(data: { fecha_inicio: string; fecha_fin: string }) {
    try {
      const connection = await getConnection()

      // Ventas del periodo
      const [ventas] = await connection.execute<RowDataPacket[]>(
        `SELECT 
          COUNT(*) as total_ventas,
          SUM(total) as monto_total,
          AVG(total) as ticket_promedio,
          SUM(CASE WHEN tipo_venta = 'contado' THEN total ELSE 0 END) as ventas_contado,
          SUM(CASE WHEN tipo_venta = 'credito' THEN total ELSE 0 END) as ventas_credito
        FROM ventas
        WHERE estado = 'completada' 
        AND DATE(fecha) BETWEEN ? AND ?`,
        [data.fecha_inicio, data.fecha_fin]
      )

      // Compras del periodo
      const [compras] = await connection.execute<RowDataPacket[]>(
        `SELECT 
          COUNT(*) as total_compras,
          SUM(total) as monto_total
        FROM compras
        WHERE estado = 'completada' 
        AND DATE(fecha) BETWEEN ? AND ?`,
        [data.fecha_inicio, data.fecha_fin]
      )

      // Cuentas por cobrar
      const [cuentasPorCobrar] = await connection.execute<RowDataPacket[]>(
        `SELECT 
          COUNT(*) as total_cuentas,
          SUM(saldo_pendiente) as saldo_total,
          SUM(CASE WHEN estado = 'vencida' THEN saldo_pendiente ELSE 0 END) as saldo_vencido
        FROM cuentas_por_cobrar
        WHERE saldo_pendiente > 0`
      )

      // Stock bajo
      const [stockBajo] = await connection.execute<RowDataPacket[]>(
        `SELECT COUNT(*) as total_productos
        FROM productos
        WHERE stock_actual <= stock_minimo 
        AND activo = true 
        AND eliminado_en IS NULL`
      )

      // Productos más vendidos
      const [topProductos] = await connection.execute<RowDataPacket[]>(
        `SELECT 
          p.nombre,
          p.codigo,
          SUM(dv.cantidad) as cantidad_vendida,
          SUM(dv.subtotal) as monto_total
        FROM detalle_ventas dv
        INNER JOIN productos p ON dv.producto_id = p.id
        INNER JOIN ventas v ON dv.venta_id = v.id
        WHERE v.estado = 'completada' 
        AND DATE(v.fecha) BETWEEN ? AND ?
        GROUP BY p.id, p.nombre, p.codigo
        ORDER BY cantidad_vendida DESC
        LIMIT 10`,
        [data.fecha_inicio, data.fecha_fin]
      )

      // Ventas por día
      const [ventasPorDia] = await connection.execute<RowDataPacket[]>(
        `SELECT 
          DATE(fecha) as fecha,
          COUNT(*) as num_ventas,
          SUM(total) as monto_total
        FROM ventas
        WHERE estado = 'completada' 
        AND DATE(fecha) BETWEEN ? AND ?
        GROUP BY DATE(fecha)
        ORDER BY fecha ASC`,
        [data.fecha_inicio, data.fecha_fin]
      )

      return {
        success: true,
        data: {
          ventas: ventas[0],
          compras: compras[0],
          cuentas_por_cobrar: cuentasPorCobrar[0],
          stock_bajo: stockBajo[0],
          top_productos: topProductos,
          ventas_por_dia: ventasPorDia
        }
      }
    } catch (error) {
      console.error('Error al obtener estadísticas:', error)
      return {
        success: false,
        message: 'Error al obtener estadísticas del dashboard',
        error: error instanceof Error ? error.message : 'Error desconocido'
      }
    }
  },

  /**
   * Obtener resumen rápido para hoy
   */
  async getResumenHoy() {
    try {
      const connection = await getConnection()
      const hoy = new Date().toISOString().split('T')[0]

      const [resumen] = await connection.execute<RowDataPacket[]>(
        `SELECT 
          COUNT(*) as ventas_hoy,
          SUM(total) as monto_hoy
        FROM ventas
        WHERE estado = 'completada' 
        AND DATE(fecha) = ?`,
        [hoy]
      )

      const [turnos] = await connection.execute<RowDataPacket[]>(
        `SELECT COUNT(*) as turnos_abiertos
        FROM turnos_caja
        WHERE estado = 'abierto'`
      )

      return {
        success: true,
        data: {
          ...resumen[0],
          turnos_abiertos: turnos[0].turnos_abiertos
        }
      }
    } catch (error) {
      return {
        success: false,
        message: 'Error al obtener resumen',
        error: error instanceof Error ? error.message : 'Error desconocido'
      }
    }
  }
}

