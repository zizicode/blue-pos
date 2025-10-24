import { RowDataPacket, ResultSetHeader } from 'mysql2'
import { getConnection } from '../../db/connection'

// ============================================
// src/main/api/ipc/caja/cajasController.ts
// ============================================

export const cajasController = {
    async getAll() {
      try {
        const connection = await getConnection()
        const [rows] = await connection.execute<RowDataPacket[]>(
          `SELECT 
            c.*,
            a.nombre as almacen_nombre
          FROM cajas c
          LEFT JOIN almacenes a ON c.almacen_id = a.id
          WHERE c.activo = true
          ORDER BY c.nombre ASC`
        )
        return { success: true, data: rows }
      } catch (error) {
        return {
          success: false,
          message: 'Error al obtener cajas',
          error: error instanceof Error ? error.message : 'Error desconocido'
        }
      }
    },
  
    async create(data: {
      nombre: string
      almacen_id?: number
      usuario_id: number
    }) {
      try {
        const connection = await getConnection()
        const [result] = await connection.execute<ResultSetHeader>(
          'INSERT INTO cajas (nombre, almacen_id) VALUES (?, ?)',
          [data.nombre, data.almacen_id || null]
        )
  
        await connection.execute(
          'INSERT INTO logs (usuario_id, accion, modulo, descripcion) VALUES (?, ?, ?, ?)',
          [data.usuario_id, 'crear', 'cajas', `Caja creada: ${data.nombre}`]
        )
  
        return {
          success: true,
          message: 'Caja creada correctamente',
          data: { id: result.insertId }
        }
      } catch (error) {
        return {
          success: false,
          message: 'Error al crear caja',
          error: error instanceof Error ? error.message : 'Error desconocido'
        }
      }
    },
  
    async update(data: {
      id: number
      nombre: string
      almacen_id?: number
      activo?: boolean
      usuario_id: number
    }) {
      try {
        const connection = await getConnection()
        await connection.execute(
          'UPDATE cajas SET nombre = ?, almacen_id = ?, activo = ? WHERE id = ?',
          [data.nombre, data.almacen_id || null, data.activo !== undefined ? data.activo : true, data.id]
        )
  
        await connection.execute(
          'INSERT INTO logs (usuario_id, accion, modulo, descripcion) VALUES (?, ?, ?, ?)',
          [data.usuario_id, 'actualizar', 'cajas', `Caja actualizada: ${data.nombre}`]
        )
  
        return { success: true, message: 'Caja actualizada correctamente' }
      } catch (error) {
        return {
          success: false,
          message: 'Error al actualizar caja',
          error: error instanceof Error ? error.message : 'Error desconocido'
        }
      }
    }
  }
  