// src/main/api/ipc/clientes/clientesController.ts

import { RowDataPacket, ResultSetHeader } from 'mysql2'
import { getConnection } from '../../db/connection'

interface Cliente {
  id?: number
  nombre: string
  telefono?: string
  email?: string
  direccion?: string
  rfc?: string
  limite_credito?: number
  tipo?: 'general' | 'mayorista' | 'vip'
  activo?: boolean
}

export const clientesController = {
  /**
   * Obtener todos los clientes con filtros
   */
  async getAll(filtros: {
    busqueda?: string
    tipo?: string
    activo?: boolean
    con_saldo?: boolean
    page?: number
    limit?: number
  } = {}) {
    try {
      const connection = await getConnection()
      const {
        busqueda = '',
        tipo,
        activo = true,
        con_saldo = false,
        page = 1,
        limit = 50
      } = filtros

      const offset = (page - 1) * limit
      let whereConditions = ['eliminado_en IS NULL']
      const params: any[] = []

      if (activo !== undefined) {
        whereConditions.push('activo = ?')
        params.push(activo)
      }

      if (busqueda) {
        whereConditions.push('(nombre LIKE ? OR telefono LIKE ? OR email LIKE ? OR rfc LIKE ?)')
        const searchTerm = `%${busqueda}%`
        params.push(searchTerm, searchTerm, searchTerm, searchTerm)
      }

      if (tipo) {
        whereConditions.push('tipo = ?')
        params.push(tipo)
      }

      if (con_saldo) {
        whereConditions.push('saldo_actual > 0')
      }

      const whereClause = `WHERE ${whereConditions.join(' AND ')}`

      const query = `
        SELECT *
        FROM clientes
        ${whereClause}
        ORDER BY nombre ASC
        LIMIT ? OFFSET ?
      `

      const countQuery = `
        SELECT COUNT(*) as total
        FROM clientes
        ${whereClause}
      `

      const [clientes] = await connection.execute<RowDataPacket[]>(
        query,
        [...params, limit, offset]
      )

      const [countResult] = await connection.execute<RowDataPacket[]>(
        countQuery,
        params
      )

      return {
        success: true,
        data: clientes,
        pagination: {
          page,
          limit,
          total: countResult[0].total,
          totalPages: Math.ceil(countResult[0].total / limit)
        }
      }
    } catch (error) {
      console.error('Error al obtener clientes:', error)
      return {
        success: false,
        message: 'Error al obtener clientes',
        error: error instanceof Error ? error.message : 'Error desconocido'
      }
    }
  },

  /**
   * Obtener cliente por ID
   */
  async getById(data: { id: number }) {
    try {
      const connection = await getConnection()

      const [rows] = await connection.execute<RowDataPacket[]>(
        'SELECT * FROM clientes WHERE id = ? AND eliminado_en IS NULL',
        [data.id]
      )

      if (rows.length === 0) {
        return {
          success: false,
          message: 'Cliente no encontrado'
        }
      }

      return {
        success: true,
        data: rows[0]
      }
    } catch (error) {
      console.error('Error al obtener cliente:', error)
      return {
        success: false,
        message: 'Error al obtener cliente',
        error: error instanceof Error ? error.message : 'Error desconocido'
      }
    }
  },

  /**
   * Buscar cliente por nombre o teléfono
   */
  async buscar(data: { termino: string }) {
    try {
      const connection = await getConnection()
      const termino = `%${data.termino}%`

      const [rows] = await connection.execute<RowDataPacket[]>(
        `SELECT * FROM clientes 
         WHERE (nombre LIKE ? OR telefono LIKE ?) 
         AND activo = true 
         AND eliminado_en IS NULL
         ORDER BY nombre ASC
         LIMIT 20`,
        [termino, termino]
      )

      return {
        success: true,
        data: rows
      }
    } catch (error) {
      console.error('Error al buscar cliente:', error)
      return {
        success: false,
        message: 'Error al buscar cliente',
        error: error instanceof Error ? error.message : 'Error desconocido'
      }
    }
  },

  /**
   * Crear nuevo cliente
   */
  async create(data: Cliente & { usuario_id: number }) {
    try {
      const connection = await getConnection()

      const query = `
        INSERT INTO clientes (
          nombre, telefono, email, direccion, rfc,
          limite_credito, tipo, activo
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `

      const [result] = await connection.execute<ResultSetHeader>(query, [
        data.nombre,
        data.telefono || null,
        data.email || null,
        data.direccion || null,
        data.rfc || null,
        data.limite_credito || 0,
        data.tipo || 'general',
        data.activo !== undefined ? data.activo : true
      ])

      // Registrar en logs
      await connection.execute(
        `INSERT INTO logs (usuario_id, accion, modulo, descripcion) 
         VALUES (?, ?, ?, ?)`,
        [
          data.usuario_id,
          'crear',
          'clientes',
          `Cliente creado: ${data.nombre}`
        ]
      )

      return {
        success: true,
        message: 'Cliente creado correctamente',
        data: { id: result.insertId }
      }
    } catch (error) {
      console.error('Error al crear cliente:', error)
      return {
        success: false,
        message: 'Error al crear cliente',
        error: error instanceof Error ? error.message : 'Error desconocido'
      }
    }
  },

  /**
   * Actualizar cliente
   */
  async update(data: Cliente & { usuario_id: number }) {
    try {
      const connection = await getConnection()

      const query = `
        UPDATE clientes SET
          nombre = ?,
          telefono = ?,
          email = ?,
          direccion = ?,
          rfc = ?,
          limite_credito = ?,
          tipo = ?,
          activo = ?
        WHERE id = ? AND eliminado_en IS NULL
      `

      await connection.execute(query, [
        data.nombre,
        data.telefono || null,
        data.email || null,
        data.direccion || null,
        data.rfc || null,
        data.limite_credito || 0,
        data.tipo || 'general',
        data.activo !== undefined ? data.activo : true,
        data.id
      ])

      // Registrar en logs
      await connection.execute(
        `INSERT INTO logs (usuario_id, accion, modulo, descripcion) 
         VALUES (?, ?, ?, ?)`,
        [
          data.usuario_id,
          'actualizar',
          'clientes',
          `Cliente actualizado: ${data.nombre}`
        ]
      )

      return {
        success: true,
        message: 'Cliente actualizado correctamente'
      }
    } catch (error) {
      console.error('Error al actualizar cliente:', error)
      return {
        success: false,
        message: 'Error al actualizar cliente',
        error: error instanceof Error ? error.message : 'Error desconocido'
      }
    }
  },

  /**
   * Eliminar cliente (soft delete)
   */
  async delete(data: { id: number; usuario_id: number }) {
    try {
      const connection = await getConnection()

      // Verificar si tiene saldo pendiente
      const [cliente] = await connection.execute<RowDataPacket[]>(
        'SELECT nombre, saldo_actual FROM clientes WHERE id = ?',
        [data.id]
      )

      if (cliente.length === 0) {
        return {
          success: false,
          message: 'Cliente no encontrado'
        }
      }

      if (cliente[0].saldo_actual > 0) {
        return {
          success: false,
          message: 'No se puede eliminar un cliente con saldo pendiente'
        }
      }

      await connection.execute(
        'UPDATE clientes SET eliminado_en = NOW() WHERE id = ?',
        [data.id]
      )

      // Registrar en logs
      await connection.execute(
        `INSERT INTO logs (usuario_id, accion, modulo, descripcion) 
         VALUES (?, ?, ?, ?)`,
        [
          data.usuario_id,
          'eliminar',
          'clientes',
          `Cliente eliminado: ${cliente[0].nombre}`
        ]
      )

      return {
        success: true,
        message: 'Cliente eliminado correctamente'
      }
    } catch (error) {
      console.error('Error al eliminar cliente:', error)
      return {
        success: false,
        message: 'Error al eliminar cliente',
        error: error instanceof Error ? error.message : 'Error desconocido'
      }
    }
  },

  /**
   * Obtener historial de compras del cliente
   */
  async getHistorialCompras(data: { 
    id: number
    fecha_inicio?: string
    fecha_fin?: string
  }) {
    try {
      const connection = await getConnection()

      let whereClause = 'WHERE v.cliente_id = ? AND v.estado = "completada"'
      const params: any[] = [data.id]

      if (data.fecha_inicio) {
        whereClause += ' AND DATE(v.fecha) >= ?'
        params.push(data.fecha_inicio)
      }

      if (data.fecha_fin) {
        whereClause += ' AND DATE(v.fecha) <= ?'
        params.push(data.fecha_fin)
      }

      const query = `
        SELECT 
          v.id,
          v.folio,
          v.fecha,
          v.total,
          v.tipo_venta,
          v.estado,
          u.nombre as usuario_nombre
        FROM ventas v
        INNER JOIN usuarios u ON v.usuario_id = u.id
        ${whereClause}
        ORDER BY v.fecha DESC
      `

      const [ventas] = await connection.execute<RowDataPacket[]>(query, params)

      // Obtener estadísticas
      const statsQuery = `
        SELECT 
          COUNT(*) as total_compras,
          SUM(total) as monto_total,
          AVG(total) as ticket_promedio
        FROM ventas
        WHERE cliente_id = ? AND estado = 'completada'
      `

      const [stats] = await connection.execute<RowDataPacket[]>(statsQuery, [data.id])

      return {
        success: true,
        data: {
          ventas,
          estadisticas: stats[0]
        }
      }
    } catch (error) {
      console.error('Error al obtener historial:', error)
      return {
        success: false,
        message: 'Error al obtener historial de compras',
        error: error instanceof Error ? error.message : 'Error desconocido'
      }
    }
  },

  /**
   * Obtener estado de cuenta del cliente
   */
  async getEstadoCuenta(data: { id: number }) {
    try {
      const connection = await getConnection()

      // Información del cliente
      const [cliente] = await connection.execute<RowDataPacket[]>(
        'SELECT * FROM clientes WHERE id = ?',
        [data.id]
      )

      if (cliente.length === 0) {
        return {
          success: false,
          message: 'Cliente no encontrado'
        }
      }

      // Cuentas por cobrar
      const [cuentas] = await connection.execute<RowDataPacket[]>(
        `SELECT 
          cpc.*,
          v.folio as venta_folio,
          v.fecha as fecha_venta
        FROM cuentas_por_cobrar cpc
        INNER JOIN ventas v ON cpc.venta_id = v.id
        WHERE cpc.cliente_id = ? AND cpc.saldo_pendiente > 0
        ORDER BY cpc.fecha_vencimiento ASC`,
        [data.id]
      )

      // Resumen
      const [resumen] = await connection.execute<RowDataPacket[]>(
        `SELECT 
          COUNT(*) as total_cuentas,
          SUM(saldo_pendiente) as total_pendiente,
          SUM(CASE WHEN estado = 'vencida' THEN saldo_pendiente ELSE 0 END) as total_vencido
        FROM cuentas_por_cobrar
        WHERE cliente_id = ? AND saldo_pendiente > 0`,
        [data.id]
      )

      return {
        success: true,
        data: {
          cliente: cliente[0],
          cuentas,
          resumen: resumen[0]
        }
      }
    } catch (error) {
      console.error('Error al obtener estado de cuenta:', error)
      return {
        success: false,
        message: 'Error al obtener estado de cuenta',
        error: error instanceof Error ? error.message : 'Error desconocido'
      }
    }
  }
}