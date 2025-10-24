// src/main/api/ipc/catalogos/categoriasController.ts

import { RowDataPacket, ResultSetHeader } from 'mysql2'
import { getConnection } from '../../db/connection'

export const categoriasController = {
  async getAll() {
    try {
      const connection = await getConnection()
      const [rows] = await connection.execute<RowDataPacket[]>(
        'SELECT * FROM categorias WHERE activo = true ORDER BY nombre ASC'
      )
      return { success: true, data: rows }
    } catch (error) {
      return {
        success: false,
        message: 'Error al obtener categorías',
        error: error instanceof Error ? error.message : 'Error desconocido'
      }
    }
  },

  async create(data: { nombre: string; descripcion?: string; usuario_id: number }) {
    try {
      const connection = await getConnection()
      const [result] = await connection.execute<ResultSetHeader>(
        'INSERT INTO categorias (nombre, descripcion) VALUES (?, ?)',
        [data.nombre, data.descripcion || null]
      )

      await connection.execute(
        'INSERT INTO logs (usuario_id, accion, modulo, descripcion) VALUES (?, ?, ?, ?)',
        [data.usuario_id, 'crear', 'categorias', `Categoría creada: ${data.nombre}`]
      )

      return {
        success: true,
        message: 'Categoría creada correctamente',
        data: { id: result.insertId }
      }
    } catch (error) {
      return {
        success: false,
        message: 'Error al crear categoría',
        error: error instanceof Error ? error.message : 'Error desconocido'
      }
    }
  },

  async update(data: { id: number; nombre: string; descripcion?: string; activo?: boolean; usuario_id: number }) {
    try {
      const connection = await getConnection()
      await connection.execute(
        'UPDATE categorias SET nombre = ?, descripcion = ?, activo = ? WHERE id = ?',
        [data.nombre, data.descripcion || null, data.activo !== undefined ? data.activo : true, data.id]
      )

      await connection.execute(
        'INSERT INTO logs (usuario_id, accion, modulo, descripcion) VALUES (?, ?, ?, ?)',
        [data.usuario_id, 'actualizar', 'categorias', `Categoría actualizada: ${data.nombre}`]
      )

      return { success: true, message: 'Categoría actualizada correctamente' }
    } catch (error) {
      return {
        success: false,
        message: 'Error al actualizar categoría',
        error: error instanceof Error ? error.message : 'Error desconocido'
      }
    }
  },

  async delete(data: { id: number; usuario_id: number }) {
    try {
      const connection = await getConnection()
      
      // Verificar si tiene productos asociados
      const [productos] = await connection.execute<RowDataPacket[]>(
        'SELECT COUNT(*) as total FROM productos WHERE categoria_id = ? AND eliminado_en IS NULL',
        [data.id]
      )

      if (productos[0].total > 0) {
        return {
          success: false,
          message: 'No se puede eliminar una categoría con productos asociados'
        }
      }

      await connection.execute('UPDATE categorias SET activo = false WHERE id = ?', [data.id])

      await connection.execute(
        'INSERT INTO logs (usuario_id, accion, modulo, descripcion) VALUES (?, ?, ?, ?)',
        [data.usuario_id, 'eliminar', 'categorias', `Categoría desactivada: ID ${data.id}`]
      )

      return { success: true, message: 'Categoría eliminada correctamente' }
    } catch (error) {
      return {
        success: false,
        message: 'Error al eliminar categoría',
        error: error instanceof Error ? error.message : 'Error desconocido'
      }
    }
  }
}

