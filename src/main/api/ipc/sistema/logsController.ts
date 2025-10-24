import { RowDataPacket } from 'mysql2'
import { getConnection } from '../../db/connection'

// ============================================
// src/main/api/ipc/sistema/logsController.ts
// ============================================

export const logsController = {
    async getAll(filtros: {
      usuario_id?: number
      modulo?: string
      accion?: string
      fecha_inicio?: string
      fecha_fin?: string
      page?: number
      limit?: number
    } = {}) {
      try {
        const connection = await getConnection()
        const {
          usuario_id,
          modulo,
          accion,
          fecha_inicio,
          fecha_fin,
          page = 1,
          limit = 100
        } = filtros
  
        const offset = (page - 1) * limit
        let whereConditions: string[] = []
        const params: any[] = []
  
        if (usuario_id) {
          whereConditions.push('l.usuario_id = ?')
          params.push(usuario_id)
        }
  
        if (modulo) {
          whereConditions.push('l.modulo = ?')
          params.push(modulo)
        }
  
        if (accion) {
          whereConditions.push('l.accion = ?')
          params.push(accion)
        }
  
        if (fecha_inicio) {
          whereConditions.push('DATE(l.fecha) >= ?')
          params.push(fecha_inicio)
        }
  
        if (fecha_fin) {
          whereConditions.push('DATE(l.fecha) <= ?')
          params.push(fecha_fin)
        }
  
        const whereClause = whereConditions.length > 0 
          ? `WHERE ${whereConditions.join(' AND ')}` 
          : ''
  
        const query = `
          SELECT 
            l.*,
            u.nombre as usuario_nombre
          FROM logs l
          LEFT JOIN usuarios u ON l.usuario_id = u.id
          ${whereClause}
          ORDER BY l.fecha DESC
          LIMIT ? OFFSET ?
        `
  
        const countQuery = `SELECT COUNT(*) as total FROM logs l ${whereClause}`
  
        const [logs] = await connection.execute<RowDataPacket[]>(
          query,
          [...params, limit, offset]
        )
  
        const [countResult] = await connection.execute<RowDataPacket[]>(countQuery, params)
  
        return {
          success: true,
          data: logs,
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
          message: 'Error al obtener logs',
          error: error instanceof Error ? error.message : 'Error desconocido'
        }
      }
    },
  
    async getModulos() {
      try {
        const connection = await getConnection()
        const [rows] = await connection.execute<RowDataPacket[]>(
          'SELECT DISTINCT modulo FROM logs WHERE modulo IS NOT NULL ORDER BY modulo ASC'
        )
        return { success: true, data: rows }
      } catch (error) {
        return {
          success: false,
          message: 'Error al obtener módulos',
          error: error instanceof Error ? error.message : 'Error desconocido'
        }
      }
    },
  
    async getAcciones() {
      try {
        const connection = await getConnection()
        const [rows] = await connection.execute<RowDataPacket[]>(
          'SELECT DISTINCT accion FROM logs WHERE accion IS NOT NULL ORDER BY accion ASC'
        )
        return { success: true, data: rows }
      } catch (error) {
        return {
          success: false,
          message: 'Error al obtener acciones',
          error: error instanceof Error ? error.message : 'Error desconocido'
        }
      }
    }
  }