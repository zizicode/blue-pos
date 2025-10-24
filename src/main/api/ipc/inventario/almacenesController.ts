import { RowDataPacket, ResultSetHeader } from 'mysql2'
import { getConnection } from '../../db/connection'

// ============================================
// src/main/api/ipc/inventario/almacenesController.ts
// ============================================

interface Almacen {
    id?: number
    nombre: string
    direccion?: string
    telefono?: string
    es_principal?: boolean
    activo?: boolean
  }
  
  export const almacenesController = {
    async getAll() {
      try {
        const connection = await getConnection()
        const [rows] = await connection.execute<RowDataPacket[]>(
          'SELECT * FROM almacenes WHERE activo = true ORDER BY es_principal DESC, nombre ASC'
        )
        return { success: true, data: rows }
      } catch (error) {
        return {
          success: false,
          message: 'Error al obtener almacenes',
          error: error instanceof Error ? error.message : 'Error desconocido'
        }
      }
    },
  
    async getById(data: { id: number }) {
      try {
        const connection = await getConnection()
        const [rows] = await connection.execute<RowDataPacket[]>(
          'SELECT * FROM almacenes WHERE id = ?',
          [data.id]
        )
  
        if (rows.length === 0) {
          return { success: false, message: 'Almacén no encontrado' }
        }
  
        return { success: true, data: rows[0] }
      } catch (error) {
        return {
          success: false,
          message: 'Error al obtener almacén',
          error: error instanceof Error ? error.message : 'Error desconocido'
        }
      }
    },
  
    async create(data: Almacen & { usuario_id: number }) {
      try {
        const connection = await getConnection()
  
        // Si es principal, quitar ese estado de los demás
        if (data.es_principal) {
          await connection.execute('UPDATE almacenes SET es_principal = false')
        }
  
        const [result] = await connection.execute<ResultSetHeader>(
          `INSERT INTO almacenes (nombre, direccion, telefono, es_principal, activo)
           VALUES (?, ?, ?, ?, ?)`,
          [
            data.nombre,
            data.direccion || null,
            data.telefono || null,
            data.es_principal || false,
            data.activo !== undefined ? data.activo : true
          ]
        )
  
        await connection.execute(
          'INSERT INTO logs (usuario_id, accion, modulo, descripcion) VALUES (?, ?, ?, ?)',
          [data.usuario_id, 'crear', 'almacenes', `Almacén creado: ${data.nombre}`]
        )
  
        return {
          success: true,
          message: 'Almacén creado correctamente',
          data: { id: result.insertId }
        }
      } catch (error) {
        return {
          success: false,
          message: 'Error al crear almacén',
          error: error instanceof Error ? error.message : 'Error desconocido'
        }
      }
    },
  
    async update(data: Almacen & { usuario_id: number }) {
      try {
        const connection = await getConnection()
  
        // Si es principal, quitar ese estado de los demás
        if (data.es_principal) {
          await connection.execute('UPDATE almacenes SET es_principal = false WHERE id != ?', [data.id])
        }
  
        await connection.execute(
          `UPDATE almacenes SET
            nombre = ?, direccion = ?, telefono = ?, es_principal = ?, activo = ?
          WHERE id = ?`,
          [
            data.nombre,
            data.direccion || null,
            data.telefono || null,
            data.es_principal || false,
            data.activo !== undefined ? data.activo : true,
            data.id
          ]
        )
  
        await connection.execute(
          'INSERT INTO logs (usuario_id, accion, modulo, descripcion) VALUES (?, ?, ?, ?)',
          [data.usuario_id, 'actualizar', 'almacenes', `Almacén actualizado: ${data.nombre}`]
        )
  
        return { success: true, message: 'Almacén actualizado correctamente' }
      } catch (error) {
        return {
          success: false,
          message: 'Error al actualizar almacén',
          error: error instanceof Error ? error.message : 'Error desconocido'
        }
      }
    },

    async delete(data: { id: number; usuario_id: number }) {
      try {
        const connection = await getConnection()
    
        // Primero obtenemos el almacén para validar que exista
        const [rows] = await connection.execute<RowDataPacket[]>(
          'SELECT * FROM almacenes WHERE id = ?',
          [data.id]
        )
    
        if (rows.length === 0) {
          return { success: false, message: 'Almacén no encontrado' }
        }
    
        const almacen = rows[0]
    
        // Soft delete => solo desactivar
        await connection.execute(
          'UPDATE almacenes SET activo = false WHERE id = ?',
          [data.id]
        )
    
        await connection.execute(
          'INSERT INTO logs (usuario_id, accion, modulo, descripcion) VALUES (?, ?, ?, ?)',
          [data.usuario_id, 'eliminar', 'almacenes', `Almacén eliminado: ${almacen.nombre}`]
        )
    
        return { success: true, message: 'Almacén eliminado correctamente' }
      } catch (error) {
        return {
          success: false,
          message: 'Error al eliminar almacén',
          error: error instanceof Error ? error.message : 'Error desconocido'
        }
      }
    }
    
  }