import { RowDataPacket, ResultSetHeader } from 'mysql2'
import { getConnection } from '../../db/connection'

// ============================================
// src/main/api/ipc/catalogos/unidadesMedidaController.ts
// ============================================

export const unidadesMedidaController = {
    async getAll() {
      try {
        const connection = await getConnection()
        const [rows] = await connection.execute<RowDataPacket[]>(
          'SELECT * FROM unidades_medida WHERE activo = true ORDER BY nombre ASC'
        )
        return { success: true, data: rows }
      } catch (error) {
        return {
          success: false,
          message: 'Error al obtener unidades de medida',
          error: error instanceof Error ? error.message : 'Error desconocido'
        }
      }
    },
  
    async create(data: { nombre: string; abreviatura: string; usuario_id: number }) {
      try {
        const connection = await getConnection()
        const [result] = await connection.execute<ResultSetHeader>(
          'INSERT INTO unidades_medida (nombre, abreviatura) VALUES (?, ?)',
          [data.nombre, data.abreviatura]
        )
  
        await connection.execute(
          'INSERT INTO logs (usuario_id, accion, modulo, descripcion) VALUES (?, ?, ?, ?)',
          [data.usuario_id, 'crear', 'unidades_medida', `Unidad creada: ${data.nombre}`]
        )
  
        return {
          success: true,
          message: 'Unidad de medida creada correctamente',
          data: { id: result.insertId }
        }
      } catch (error) {
        return {
          success: false,
          message: 'Error al crear unidad de medida',
          error: error instanceof Error ? error.message : 'Error desconocido'
        }
      }
    },
  
    async update(data: { id: number; nombre: string; abreviatura: string; activo?: boolean; usuario_id: number }) {
      try {
        const connection = await getConnection()
        await connection.execute(
          'UPDATE unidades_medida SET nombre = ?, abreviatura = ?, activo = ? WHERE id = ?',
          [data.nombre, data.abreviatura, data.activo !== undefined ? data.activo : true, data.id]
        )
  
        await connection.execute(
          'INSERT INTO logs (usuario_id, accion, modulo, descripcion) VALUES (?, ?, ?, ?)',
          [data.usuario_id, 'actualizar', 'unidades_medida', `Unidad actualizada: ${data.nombre}`]
        )
  
        return { success: true, message: 'Unidad de medida actualizada correctamente' }
      } catch (error) {
        return {
          success: false,
          message: 'Error al actualizar unidad de medida',
          error: error instanceof Error ? error.message : 'Error desconocido'
        }
      }
    }
  }