import { RowDataPacket } from 'mysql2'
import { getConnection } from '../../db/connection'


// ============================================
// src/main/api/ipc/caja/movimientosCajaController.ts
// ============================================

export const movimientosCajaController = {
    /**
     * Obtener movimientos de caja
     */
    async getAll(filtros: {
      turno_id?: number
      tipo?: string
      fecha_inicio?: string
      fecha_fin?: string
      page?: number
      limit?: number
    } = {}) {
      try {
        const connection = await getConnection()
        const {
          turno_id,
          tipo,
          fecha_inicio,
          fecha_fin,
          page = 1,
          limit = 100
        } = filtros
  
        const offset = (page - 1) * limit
        let whereConditions: string[] = []
        const params: any[] = []
  
        if (turno_id) {
          whereConditions.push('mc.turno_id = ?')
          params.push(turno_id)
        }
  
        if (tipo) {
          whereConditions.push('mc.tipo = ?')
          params.push(tipo)
        }
  
        if (fecha_inicio) {
          whereConditions.push('DATE(mc.fecha) >= ?')
          params.push(fecha_inicio)
        }
  
        if (fecha_fin) {
          whereConditions.push('DATE(mc.fecha) <= ?')
          params.push(fecha_fin)
        }
  
        const whereClause = whereConditions.length > 0 
          ? `WHERE ${whereConditions.join(' AND ')}` 
          : ''
  
        const query = `
          SELECT 
            mc.*,
            mp.nombre as metodo_pago_nombre,
            tc.caja_id,
            c.nombre as caja_nombre
          FROM movimientos_caja mc
          LEFT JOIN metodos_pago mp ON mc.metodo_pago_id = mp.id
          INNER JOIN turnos_caja tc ON mc.turno_id = tc.id
          INNER JOIN cajas c ON tc.caja_id = c.id
          ${whereClause}
          ORDER BY mc.fecha DESC
          LIMIT ? OFFSET ?
        `
  
        const countQuery = `SELECT COUNT(*) as total FROM movimientos_caja mc ${whereClause}`
  
        const [movimientos] = await connection.execute<RowDataPacket[]>(
          query,
          [...params, limit, offset]
        )
  
        const [countResult] = await connection.execute<RowDataPacket[]>(countQuery, params)
  
        return {
          success: true,
          data: movimientos,
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
          message: 'Error al obtener movimientos de caja',
          error: error instanceof Error ? error.message : 'Error desconocido'
        }
      }
    }
  }