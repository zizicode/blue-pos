import { RowDataPacket } from 'mysql2'
import { getConnection } from '../../db/connection'

// ============================================
// src/main/api/ipc/sistema/configuracionController.ts
// ============================================

export const configuracionController = {
  async getAll() {
    try {
      const connection = await getConnection()
      const [rows] = await connection.execute<RowDataPacket[]>(
        'SELECT * FROM configuracion ORDER BY clave ASC'
      )
      return { success: true, data: rows }
    } catch (error) {
      return {
        success: false,
        message: 'Error al obtener configuración',
        error: error instanceof Error ? error.message : 'Error desconocido'
      }
    }
  },

  async getPorClave(data: { clave: string }) {
    try {
      const connection = await getConnection()
      const [rows] = await connection.execute<RowDataPacket[]>(
        'SELECT * FROM configuracion WHERE clave = ?',
        [data.clave]
      )

      if (rows.length === 0) {
        return { success: false, message: 'Configuración no encontrada' }
      }

      return { success: true, data: rows[0] }
    } catch (error) {
      return {
        success: false,
        message: 'Error al obtener configuración',
        error: error instanceof Error ? error.message : 'Error desconocido'
      }
    }
  },

  async set(data: {
    clave: string
    valor: string
    tipo?: string
    descripcion?: string
    usuario_id: number
  }) {
    try {
      const connection = await getConnection()

      // Verificar si existe
      const [existing] = await connection.execute<RowDataPacket[]>(
        'SELECT id FROM configuracion WHERE clave = ?',
        [data.clave]
      )

      if (existing.length > 0) {
        // Actualizar
        await connection.execute(
          'UPDATE configuracion SET valor = ?, tipo = ?, descripcion = ? WHERE clave = ?',
          [data.valor, data.tipo || 'string', data.descripcion || null, data.clave]
        )
      } else {
        // Crear
        await connection.execute(
          'INSERT INTO configuracion (clave, valor, tipo, descripcion) VALUES (?, ?, ?, ?)',
          [data.clave, data.valor, data.tipo || 'string', data.descripcion || null]
        )
      }

      await connection.execute(
        'INSERT INTO logs (usuario_id, accion, modulo, descripcion) VALUES (?, ?, ?, ?)',
        [data.usuario_id, 'configuracion', 'sistema', `Configuración actualizada: ${data.clave}`]
      )

      return { success: true, message: 'Configuración guardada correctamente' }
    } catch (error) {
      return {
        success: false,
        message: 'Error al guardar configuración',
        error: error instanceof Error ? error.message : 'Error desconocido'
      }
    }
  },

  async updateMultiple(data: {
    configuraciones: Record<string, string | number | boolean>
    usuario_id: number
  }) {
    let connection: any // 👈 declaramos fuera del try

    try {
      const pool = await getConnection()
      connection = await pool.getConnection() // ✅ mantenemos la conexión activa

      const entries = Object.entries(data.configuraciones)

      if (entries.length === 0) {
        return { success: false, message: 'No se recibieron configuraciones para actualizar' }
      }

      // Iniciamos transacción
      await connection.beginTransaction()

      for (const [clave, valor] of entries) {
        let valorString: string
        let tipo: 'string' | 'number' | 'boolean' | 'json'

        const detectedType = typeof valor

        if (detectedType === 'object' && valor !== null) {
          tipo = 'json'
          valorString = JSON.stringify(valor)
        } else if (['number', 'boolean', 'string'].includes(detectedType)) {
          tipo = detectedType as any
          valorString = String(valor)
        } else {
          tipo = 'string'
          valorString = String(valor ?? '')
        }

        const [rows]: any = await connection.execute(
          'SELECT id FROM configuracion WHERE clave = ?',
          [clave]
        );

        const existing = rows as RowDataPacket[];

        if (existing.length > 0) {
          await connection.execute(
            'UPDATE configuracion SET valor = ?, tipo = ? WHERE clave = ?',
            [valorString, tipo, clave]
          )
        } else {
          await connection.execute(
            'INSERT INTO configuracion (clave, valor, tipo) VALUES (?, ?, ?)',
            [clave, valorString, tipo]
          )
        }
      }

      await connection.execute(
        'INSERT INTO logs (usuario_id, accion, modulo, descripcion) VALUES (?, ?, ?, ?)',
        [
          data.usuario_id,
          'configuracion',
          'sistema',
          `Actualización múltiple de configuraciones (${entries.length} campos)`
        ]
      )

      await connection.commit()
      connection.release()

      return { success: true, message: 'Configuraciones actualizadas correctamente' }

    } catch (error) {
      // ✅ rollback solo si existe la conexión
      if (connection) {
        try {
          await connection.rollback()
          connection.release()
        } catch {
          // ignoramos si falla el rollback
        }
      }

      return {
        success: false,
        message: 'Error al actualizar configuraciones',
        error: error instanceof Error ? error.message : 'Error desconocido'
      }
    }
  },

  async getMultiple(data: { claves: string[] }) {
    try {
      const connection = await getConnection()
      const placeholders = data.claves.map(() => '?').join(',')

      const [rows] = await connection.execute<RowDataPacket[]>(
        `SELECT * FROM configuracion WHERE clave IN (${placeholders})`,
        data.claves
      )

      // Convertir a objeto clave-valor
      const config: Record<string, any> = {}
      rows.forEach((row: any) => {
        let valor = row.valor

        // Parsear según tipo
        if (row.tipo === 'number') {
          valor = parseFloat(valor)
        } else if (row.tipo === 'boolean') {
          valor = valor === 'true' || valor === '1'
        } else if (row.tipo === 'json') {
          try {
            valor = JSON.parse(valor)
          } catch (e) {
            valor = null
          }
        }

        config[row.clave] = valor
      })

      return { success: true, data: config }
    } catch (error) {
      return {
        success: false,
        message: 'Error al obtener configuraciones',
        error: error instanceof Error ? error.message : 'Error desconocido'
      }
    }
  }
}
