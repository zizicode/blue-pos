import { RowDataPacket } from 'mysql2'
import { getConnection } from '../../db/connection'

// ============================================
// src/main/api/ipc/inventario/movimientosInventarioController.ts
// ============================================

export const movimientosInventarioController = {
    /**
     * Obtener movimientos de inventario con filtros
     */
    async getAll(filtros: {
      producto_id?: number
      almacen_id?: number
      tipo?: string
      fecha_inicio?: string
      fecha_fin?: string
      page?: number
      limit?: number
    } = {}) {
      try {
        const connection = await getConnection()
        const {
          producto_id,
          almacen_id,
          tipo,
          fecha_inicio,
          fecha_fin,
          page = 1,
          limit = 100
        } = filtros
  
        const offset = (page - 1) * limit
        let whereConditions: string[] = []
        const params: any[] = []
  
        if (producto_id) {
          whereConditions.push('mi.producto_id = ?')
          params.push(producto_id)
        }
  
        if (almacen_id) {
          whereConditions.push('mi.almacen_id = ?')
          params.push(almacen_id)
        }
  
        if (tipo) {
          whereConditions.push('mi.tipo = ?')
          params.push(tipo)
        }
  
        if (fecha_inicio) {
          whereConditions.push('DATE(mi.fecha) >= ?')
          params.push(fecha_inicio)
        }
  
        if (fecha_fin) {
          whereConditions.push('DATE(mi.fecha) <= ?')
          params.push(fecha_fin)
        }
  
        const whereClause = whereConditions.length > 0 
          ? `WHERE ${whereConditions.join(' AND ')}` 
          : ''
  
        const query = `
          SELECT 
            mi.*,
            p.codigo,
            p.nombre as producto_nombre,
            a.nombre as almacen_nombre,
            u.nombre as usuario_nombre
          FROM movimientos_inventario mi
          INNER JOIN productos p ON mi.producto_id = p.id
          LEFT JOIN almacenes a ON mi.almacen_id = a.id
          LEFT JOIN usuarios u ON mi.usuario_id = u.id
          ${whereClause}
          ORDER BY mi.fecha DESC
          LIMIT ? OFFSET ?
        `
  
        const countQuery = `
          SELECT COUNT(*) as total
          FROM movimientos_inventario mi
          ${whereClause}
        `
  
        const [movimientos] = await connection.execute<RowDataPacket[]>(
          query,
          [...params, limit, offset]
        )
  
        const [countResult] = await connection.execute<RowDataPacket[]>(
          countQuery,
          params
        )
  
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
          message: 'Error al obtener movimientos',
          error: error instanceof Error ? error.message : 'Error desconocido'
        }
      }
    },
  
    /**
     * Obtener historial de movimientos de un producto
     */
    async getHistorialProducto(data: { 
      producto_id: number
      fecha_inicio?: string
      fecha_fin?: string
      limit?: number
    }) {
      try {
        const connection = await getConnection()
  
        let whereConditions = ['mi.producto_id = ?']
        const params: any[] = [data.producto_id]
  
        if (data.fecha_inicio) {
          whereConditions.push('DATE(mi.fecha) >= ?')
          params.push(data.fecha_inicio)
        }
  
        if (data.fecha_fin) {
          whereConditions.push('DATE(mi.fecha) <= ?')
          params.push(data.fecha_fin)
        }
  
        const whereClause = `WHERE ${whereConditions.join(' AND ')}`
        const limit = data.limit || 100
  
        const query = `
          SELECT 
            mi.*,
            u.nombre as usuario_nombre,
            a.nombre as almacen_nombre
          FROM movimientos_inventario mi
          LEFT JOIN usuarios u ON mi.usuario_id = u.id
          LEFT JOIN almacenes a ON mi.almacen_id = a.id
          ${whereClause}
          ORDER BY mi.fecha DESC
          LIMIT ?
        `
  
        const [movimientos] = await connection.execute<RowDataPacket[]>(
          query,
          [...params, limit]
        )
  
        return {
          success: true,
          data: movimientos
        }
      } catch (error) {
        return {
          success: false,
          message: 'Error al obtener historial',
          error: error instanceof Error ? error.message : 'Error desconocido'
        }
      }
    }
  }
  