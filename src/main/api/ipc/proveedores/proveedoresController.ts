// src/main/api/ipc/proveedores/proveedoresController.ts

import { RowDataPacket, ResultSetHeader } from 'mysql2'
import { getConnection } from '../../db/connection'

interface Proveedor {
  id?: number
  nombre: string
  contacto?: string
  telefono?: string
  email?: string
  direccion?: string
  rfc?: string
  dias_credito?: number
  activo?: boolean
}

export const proveedoresController = {
  async getAll(filtros: {
    busqueda?: string
    activo?: boolean
    page?: number
    limit?: number
  } = {}) {
    try {
      const connection = await getConnection()
      const { busqueda = '', activo = true, page = 1, limit = 50 } = filtros

      const offset = (page - 1) * limit
      let whereConditions = ['eliminado_en IS NULL']
      const params: any[] = []

      if (activo !== undefined) {
        whereConditions.push('activo = ?')
        params.push(activo)
      }

      if (busqueda) {
        whereConditions.push('(nombre LIKE ? OR rfc LIKE ? OR telefono LIKE ?)')
        const searchTerm = `%${busqueda}%`
        params.push(searchTerm, searchTerm, searchTerm)
      }

      const whereClause = `WHERE ${whereConditions.join(' AND ')}`

      const query = `
        SELECT * FROM proveedores
        ${whereClause}
        ORDER BY nombre ASC
        LIMIT ? OFFSET ?
      `

      const countQuery = `SELECT COUNT(*) as total FROM proveedores ${whereClause}`

      const [proveedores] = await connection.execute<RowDataPacket[]>(
        query,
        [...params, limit, offset]
      )

      const [countResult] = await connection.execute<RowDataPacket[]>(countQuery, params)

      return {
        success: true,
        data: proveedores,
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
        message: 'Error al obtener proveedores',
        error: error instanceof Error ? error.message : 'Error desconocido'
      }
    }
  },

  async getById(data: { id: number }) {
    try {
      const connection = await getConnection()
      const [rows] = await connection.execute<RowDataPacket[]>(
        'SELECT * FROM proveedores WHERE id = ? AND eliminado_en IS NULL',
        [data.id]
      )

      if (rows.length === 0) {
        return { success: false, message: 'Proveedor no encontrado' }
      }

      return { success: true, data: rows[0] }
    } catch (error) {
      return {
        success: false,
        message: 'Error al obtener proveedor',
        error: error instanceof Error ? error.message : 'Error desconocido'
      }
    }
  },

  async create(data: Proveedor & { usuario_id: number }) {
    try {
      const connection = await getConnection()

      const [result] = await connection.execute<ResultSetHeader>(
        `INSERT INTO proveedores (
          nombre, contacto, telefono, email, direccion, rfc, dias_credito, activo
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          data.nombre,
          data.contacto || null,
          data.telefono || null,
          data.email || null,
          data.direccion || null,
          data.rfc || null,
          data.dias_credito || 0,
          data.activo !== undefined ? data.activo : true
        ]
      )

      await connection.execute(
        'INSERT INTO logs (usuario_id, accion, modulo, descripcion) VALUES (?, ?, ?, ?)',
        [data.usuario_id, 'crear', 'proveedores', `Proveedor creado: ${data.nombre}`]
      )

      return {
        success: true,
        message: 'Proveedor creado correctamente',
        data: { id: result.insertId }
      }
    } catch (error) {
      return {
        success: false,
        message: 'Error al crear proveedor',
        error: error instanceof Error ? error.message : 'Error desconocido'
      }
    }
  },

  async update(data: Proveedor & { usuario_id: number }) {
    try {
      const connection = await getConnection()

      await connection.execute(
        `UPDATE proveedores SET
          nombre = ?, contacto = ?, telefono = ?, email = ?,
          direccion = ?, rfc = ?, dias_credito = ?, activo = ?
        WHERE id = ? AND eliminado_en IS NULL`,
        [
          data.nombre,
          data.contacto || null,
          data.telefono || null,
          data.email || null,
          data.direccion || null,
          data.rfc || null,
          data.dias_credito || 0,
          data.activo !== undefined ? data.activo : true,
          data.id
        ]
      )

      await connection.execute(
        'INSERT INTO logs (usuario_id, accion, modulo, descripcion) VALUES (?, ?, ?, ?)',
        [data.usuario_id, 'actualizar', 'proveedores', `Proveedor actualizado: ${data.nombre}`]
      )

      return { success: true, message: 'Proveedor actualizado correctamente' }
    } catch (error) {
      return {
        success: false,
        message: 'Error al actualizar proveedor',
        error: error instanceof Error ? error.message : 'Error desconocido'
      }
    }
  },

  async delete(data: { id: number; usuario_id: number }) {
    try {
      const connection = await getConnection()

      const [proveedor] = await connection.execute<RowDataPacket[]>(
        'SELECT nombre FROM proveedores WHERE id = ?',
        [data.id]
      )

      if (proveedor.length === 0) {
        return { success: false, message: 'Proveedor no encontrado' }
      }

      await connection.execute(
        'UPDATE proveedores SET eliminado_en = NOW() WHERE id = ?',
        [data.id]
      )

      await connection.execute(
        'INSERT INTO logs (usuario_id, accion, modulo, descripcion) VALUES (?, ?, ?, ?)',
        [data.usuario_id, 'eliminar', 'proveedores', `Proveedor eliminado: ${proveedor[0].nombre}`]
      )

      return { success: true, message: 'Proveedor eliminado correctamente' }
    } catch (error) {
      return {
        success: false,
        message: 'Error al eliminar proveedor',
        error: error instanceof Error ? error.message : 'Error desconocido'
      }
    }
  },

  async buscar(data: { termino: string }) {
    try {
      const connection = await getConnection()
      const termino = `%${data.termino}%`

      const [rows] = await connection.execute<RowDataPacket[]>(
        `SELECT * FROM proveedores 
         WHERE (nombre LIKE ? OR rfc LIKE ?) 
         AND activo = true 
         AND eliminado_en IS NULL
         ORDER BY nombre ASC
         LIMIT 20`,
        [termino, termino]
      )

      return { success: true, data: rows }
    } catch (error) {
      return {
        success: false,
        message: 'Error al buscar proveedor',
        error: error instanceof Error ? error.message : 'Error desconocido'
      }
    }
  }
}

