import { RowDataPacket, ResultSetHeader } from 'mysql2'
import { getConnection } from '../../db/connection'

// ============================================
// src/main/api/ipc/catalogos/metodosPagoController.ts
// ============================================

export const metodosPagoController = {
    async getAll() {
      try {
        const connection = await getConnection()
        const [rows] = await connection.execute<RowDataPacket[]>(
          'SELECT * FROM metodos_pago WHERE activo = true ORDER BY orden ASC, nombre ASC'
        )
        return { success: true, data: rows }
      } catch (error) {
        return {
          success: false,
          message: 'Error al obtener métodos de pago',
          error: error instanceof Error ? error.message : 'Error desconocido'
        }
      }
    },
  
    async create(data: { nombre: string; requiere_referencia?: boolean; orden?: number; usuario_id: number }) {
      try {
        const connection = await getConnection()
        const [result] = await connection.execute<ResultSetHeader>(
          'INSERT INTO metodos_pago (nombre, requiere_referencia, orden) VALUES (?, ?, ?)',
          [data.nombre, data.requiere_referencia || false, data.orden || 0]
        )
  
        await connection.execute(
          'INSERT INTO logs (usuario_id, accion, modulo, descripcion) VALUES (?, ?, ?, ?)',
          [data.usuario_id, 'crear', 'metodos_pago', `Método de pago creado: ${data.nombre}`]
        )
  
        return {
          success: true,
          message: 'Método de pago creado correctamente',
          data: { id: result.insertId }
        }
      } catch (error) {
        return {
          success: false,
          message: 'Error al crear método de pago',
          error: error instanceof Error ? error.message : 'Error desconocido'
        }
      }
    },
  
    async update(data: { 
      id: number
      nombre: string
      requiere_referencia?: boolean
      orden?: number
      activo?: boolean
      usuario_id: number 
    }) {
      try {
        const connection = await getConnection()
        await connection.execute(
          'UPDATE metodos_pago SET nombre = ?, requiere_referencia = ?, orden = ?, activo = ? WHERE id = ?',
          [
            data.nombre,
            data.requiere_referencia || false,
            data.orden || 0,
            data.activo !== undefined ? data.activo : true,
            data.id
          ]
        )
  
        await connection.execute(
          'INSERT INTO logs (usuario_id, accion, modulo, descripcion) VALUES (?, ?, ?, ?)',
          [data.usuario_id, 'actualizar', 'metodos_pago', `Método de pago actualizado: ${data.nombre}`]
        )
  
        return { success: true, message: 'Método de pago actualizado correctamente' }
      } catch (error) {
        return {
          success: false,
          message: 'Error al actualizar método de pago',
          error: error instanceof Error ? error.message : 'Error desconocido'
        }
      }
    }
  }