// src/main/api/ipc/cuentas/cuentasPorCobrarController.ts

import { RowDataPacket } from 'mysql2'
import { getConnection } from '../../db/connection'

export const cuentasPorCobrarController = {
  /**
   * Obtener todas las cuentas por cobrar con filtros
   */
  async getAll(filtros: {
    cliente_id?: number
    estado?: string
    vencidas?: boolean
    fecha_inicio?: string
    fecha_fin?: string
    page?: number
    limit?: number
  } = {}) {
    try {
      const connection = await getConnection()
      const {
        cliente_id,
        estado,
        vencidas,
        fecha_inicio,
        fecha_fin,
        page = 1,
        limit = 50
      } = filtros

      const offset = (page - 1) * limit
      let whereConditions: string[] = []
      const params: any[] = []

      if (cliente_id) {
        whereConditions.push('cpc.cliente_id = ?')
        params.push(cliente_id)
      }

      if (estado) {
        whereConditions.push('cpc.estado = ?')
        params.push(estado)
      }

      if (vencidas) {
        whereConditions.push('cpc.fecha_vencimiento < CURDATE() AND cpc.estado = "pendiente"')
      }

      if (fecha_inicio) {
        whereConditions.push('DATE(cpc.creado_en) >= ?')
        params.push(fecha_inicio)
      }

      if (fecha_fin) {
        whereConditions.push('DATE(cpc.creado_en) <= ?')
        params.push(fecha_fin)
      }

      const whereClause = whereConditions.length > 0 
        ? `WHERE ${whereConditions.join(' AND ')}` 
        : ''

      const query = `
        SELECT 
          cpc.*,
          c.nombre as cliente_nombre,
          c.telefono as cliente_telefono,
          v.folio as venta_folio,
          v.fecha as fecha_venta
        FROM cuentas_por_cobrar cpc
        INNER JOIN clientes c ON cpc.cliente_id = c.id
        INNER JOIN ventas v ON cpc.venta_id = v.id
        ${whereClause}
        ORDER BY cpc.fecha_vencimiento ASC
        LIMIT ? OFFSET ?
      `

      const countQuery = `
        SELECT COUNT(*) as total
        FROM cuentas_por_cobrar cpc
        ${whereClause}
      `

      const [cuentas] = await connection.execute<RowDataPacket[]>(
        query,
        [...params, limit, offset]
      )

      const [countResult] = await connection.execute<RowDataPacket[]>(
        countQuery,
        params
      )

      return {
        success: true,
        data: cuentas,
        pagination: {
          page,
          limit,
          total: countResult[0].total,
          totalPages: Math.ceil(countResult[0].total / limit)
        }
      }
    } catch (error) {
      return {
        success: false,
        message: 'Error al obtener cuentas por cobrar',
        error: error instanceof Error ? error.message : 'Error desconocido'
      }
    }
  },

  /**
   * Obtener cuenta por ID con historial de abonos
   */
  async getById(data: { id: number }) {
    try {
      const connection = await getConnection()

      const [cuenta] = await connection.execute<RowDataPacket[]>(
        `SELECT 
          cpc.*,
          c.nombre as cliente_nombre,
          c.telefono as cliente_telefono,
          c.email as cliente_email,
          v.folio as venta_folio,
          v.fecha as fecha_venta
        FROM cuentas_por_cobrar cpc
        INNER JOIN clientes c ON cpc.cliente_id = c.id
        INNER JOIN ventas v ON cpc.venta_id = v.id
        WHERE cpc.id = ?`,
        [data.id]
      )

      if (cuenta.length === 0) {
        return {
          success: false,
          message: 'Cuenta por cobrar no encontrada'
        }
      }

      // Obtener historial de abonos
      const [abonos] = await connection.execute<RowDataPacket[]>(
        `SELECT 
          ac.*,
          mp.nombre as metodo_pago_nombre,
          u.nombre as usuario_nombre
        FROM abonos_credito ac
        INNER JOIN metodos_pago mp ON ac.metodo_pago_id = mp.id
        INNER JOIN usuarios u ON ac.usuario_id = u.id
        WHERE ac.cuenta_id = ?
        ORDER BY ac.fecha DESC`,
        [data.id]
      )

      return {
        success: true,
        data: {
          ...cuenta[0],
          abonos
        }
      }
    } catch (error) {
      return {
        success: false,
        message: 'Error al obtener cuenta',
        error: error instanceof Error ? error.message : 'Error desconocido'
      }
    }
  },

  /**
   * Obtener resumen de cuentas por cobrar
   */
  async getResumen() {
    try {
      const connection = await getConnection()

      const [resumen] = await connection.execute<RowDataPacket[]>(
        `SELECT 
          COUNT(*) as total_cuentas,
          SUM(saldo_pendiente) as total_pendiente,
          SUM(CASE WHEN estado = 'vencida' THEN saldo_pendiente ELSE 0 END) as total_vencido,
          SUM(CASE WHEN estado = 'pendiente' THEN saldo_pendiente ELSE 0 END) as total_vigente,
          COUNT(CASE WHEN estado = 'vencida' THEN 1 END) as cuentas_vencidas,
          COUNT(CASE WHEN estado = 'pendiente' THEN 1 END) as cuentas_vigentes
        FROM cuentas_por_cobrar
        WHERE saldo_pendiente > 0`
      )

      // Top clientes con más deuda
      const [topClientes] = await connection.execute<RowDataPacket[]>(
        `SELECT 
          c.id,
          c.nombre,
          c.telefono,
          SUM(cpc.saldo_pendiente) as deuda_total,
          COUNT(*) as num_cuentas
        FROM cuentas_por_cobrar cpc
        INNER JOIN clientes c ON cpc.cliente_id = c.id
        WHERE cpc.saldo_pendiente > 0
        GROUP BY c.id, c.nombre, c.telefono
        ORDER BY deuda_total DESC
        LIMIT 10`
      )

      return {
        success: true,
        data: {
          resumen: resumen[0],
          top_clientes: topClientes
        }
      }
    } catch (error) {
      return {
        success: false,
        message: 'Error al obtener resumen',
        error: error instanceof Error ? error.message : 'Error desconocido'
      }
    }
  },

  /**
   * Actualizar estados de cuentas vencidas
   */
  async actualizarVencidas() {
    try {
      const connection = await getConnection()

      await connection.execute(
        `UPDATE cuentas_por_cobrar 
         SET estado = 'vencida' 
         WHERE fecha_vencimiento < CURDATE() 
         AND estado = 'pendiente' 
         AND saldo_pendiente > 0`
      )

      return {
        success: true,
        message: 'Estados actualizados correctamente'
      }
    } catch (error) {
      return {
        success: false,
        message: 'Error al actualizar estados',
        error: error instanceof Error ? error.message : 'Error desconocido'
      }
    }
  }
}

