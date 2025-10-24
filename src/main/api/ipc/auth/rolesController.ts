// src/main/api/ipc/auth/rolesController.ts

import { RowDataPacket, ResultSetHeader } from 'mysql2'
import { getConnection } from '../../db/connection'

export const rolesController = {
  async getAll() {
    try {
      const connection = await getConnection()
      const [rows] = await connection.execute<RowDataPacket[]>(
        'SELECT * FROM roles WHERE activo = true ORDER BY nombre ASC'
      )
      return { success: true, data: rows }
    } catch (error) {
      return {
        success: false,
        message: 'Error al obtener roles',
        error: error instanceof Error ? error.message : 'Error desconocido'
      }
    }
  },

  async getById(data: { id: number }) {
    try {
      const connection = await getConnection()
      
      const [rol] = await connection.execute<RowDataPacket[]>(
        'SELECT * FROM roles WHERE id = ?',
        [data.id]
      )

      if (rol.length === 0) {
        return { success: false, message: 'Rol no encontrado' }
      }

      // Obtener permisos del rol
      const [permisos] = await connection.execute<RowDataPacket[]>(
        `SELECT p.* FROM permisos p
         INNER JOIN roles_permisos rp ON p.id = rp.permiso_id
         WHERE rp.rol_id = ?`,
        [data.id]
      )

      return {
        success: true,
        data: {
          ...rol[0],
          permisos
        }
      }
    } catch (error) {
      return {
        success: false,
        message: 'Error al obtener rol',
        error: error instanceof Error ? error.message : 'Error desconocido'
      }
    }
  },

  async create(data: {
    nombre: string
    descripcion?: string
    permisos?: number[]
    usuario_id: number
  }) {
    const connection = await getConnection()

    try {
      await connection.beginTransaction()

      const [result] = await connection.execute<ResultSetHeader>(
        'INSERT INTO roles (nombre, descripcion) VALUES (?, ?)',
        [data.nombre, data.descripcion || null]
      )

      const rolId = result.insertId

      // Asignar permisos
      if (data.permisos && data.permisos.length > 0) {
        for (const permisoId of data.permisos) {
          await connection.execute(
            'INSERT INTO roles_permisos (rol_id, permiso_id) VALUES (?, ?)',
            [rolId, permisoId]
          )
        }
      }

      await connection.execute(
        'INSERT INTO logs (usuario_id, accion, modulo, descripcion) VALUES (?, ?, ?, ?)',
        [data.usuario_id, 'crear', 'roles', `Rol creado: ${data.nombre}`]
      )

      await connection.commit()

      return {
        success: true,
        message: 'Rol creado correctamente',
        data: { id: rolId }
      }
    } catch (error) {
      await connection.rollback()
      return {
        success: false,
        message: 'Error al crear rol',
        error: error instanceof Error ? error.message : 'Error desconocido'
      }
    }
  },

  async update(data: {
    id: number
    nombre: string
    descripcion?: string
    permisos?: number[]
    activo?: boolean
    usuario_id: number
  }) {
    const pool = await getConnection();
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction()

      await connection.execute(
        'UPDATE roles SET nombre = ?, descripcion = ?, activo = ? WHERE id = ?',
        [data.nombre, data.descripcion || null, data.activo !== undefined ? data.activo : true, data.id]
      )

      // Actualizar permisos
      if (data.permisos) {
        await connection.execute('DELETE FROM roles_permisos WHERE rol_id = ?', [data.id])
        
        for (const permisoId of data.permisos) {
          await connection.execute(
            'INSERT INTO roles_permisos (rol_id, permiso_id) VALUES (?, ?)',
            [data.id, permisoId]
          )
        }
      }

      await connection.execute(
        'INSERT INTO logs (usuario_id, accion, modulo, descripcion) VALUES (?, ?, ?, ?)',
        [data.usuario_id, 'actualizar', 'roles', `Rol actualizado: ${data.nombre}`]
      )

      await connection.commit()

      return { success: true, message: 'Rol actualizado correctamente' }
    } catch (error) {
      await connection.rollback()
      return {
        success: false,
        message: 'Error al actualizar rol',
        error: error instanceof Error ? error.message : 'Error desconocido'
      }
    }
  }
}
