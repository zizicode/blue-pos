// src/main/api/ipc/caja/turnosCajaController.ts

import { RowDataPacket, ResultSetHeader } from 'mysql2'
import { getConnection } from '../../db/connection'

export const turnosCajaController = {
  /**
   * Abrir turno de caja
   */
  async abrirTurno(data: {
    caja_id: number
    usuario_id: number
    monto_inicial: number
    notas?: string
  }) {
    try {
      const connection = await getConnection()

      // Verificar si ya hay un turno abierto para este usuario
      const [turnoAbierto] = await connection.execute<RowDataPacket[]>(
        `SELECT id FROM turnos_caja 
         WHERE usuario_id = ? AND estado = 'abierto'`,
        [data.usuario_id]
      )

      if (turnoAbierto.length > 0) {
        return {
          success: false,
          message: 'Ya tienes un turno abierto. Debes cerrarlo antes de abrir uno nuevo.'
        }
      }

      // Verificar si la caja tiene un turno abierto
      const [cajaAbierta] = await connection.execute<RowDataPacket[]>(
        `SELECT id, usuario_id FROM turnos_caja 
         WHERE caja_id = ? AND estado = 'abierto'`,
        [data.caja_id]
      )

      if (cajaAbierta.length > 0) {
        return {
          success: false,
          message: 'Esta caja ya tiene un turno abierto por otro usuario.'
        }
      }

      // Crear turno
      const [result] = await connection.execute<ResultSetHeader>(
        `INSERT INTO turnos_caja (
          caja_id, usuario_id, monto_inicial, notas
        ) VALUES (?, ?, ?, ?)`,
        [data.caja_id, data.usuario_id, data.monto_inicial, data.notas || null]
      )

      // Registrar en logs
      await connection.execute(
        `INSERT INTO logs (usuario_id, accion, modulo, descripcion) 
         VALUES (?, ?, ?, ?)`,
        [
          data.usuario_id,
          'abrir_turno',
          'caja',
          `Turno de caja abierto - Monto inicial: $${data.monto_inicial.toFixed(2)}`
        ]
      )

      return {
        success: true,
        message: 'Turno abierto correctamente',
        data: { id: result.insertId }
      }
    } catch (error) {
      console.error('Error al abrir turno:', error)
      return {
        success: false,
        message: 'Error al abrir turno',
        error: error instanceof Error ? error.message : 'Error desconocido'
      }
    }
  },

  /**
   * Cerrar turno de caja
   */
  async cerrarTurno(data: {
    id: number
    usuario_id: number
    monto_final: number
    notas?: string
  }) {
    const pool = await getConnection()
    const connection = await pool.getConnection()

    try {
      // Obtener información del turno
      const [turno] = await connection.execute<RowDataPacket[]>(
        `SELECT * FROM turnos_caja 
         WHERE id = ? AND usuario_id = ? AND estado = 'abierto'`,
        [data.id, data.usuario_id]
      )

      if (turno.length === 0) {
        await connection.rollback()
        return {
          success: false,
          message: 'Turno no encontrado o ya está cerrado'
        }
      }

      // Calcular monto esperado (inicial + movimientos)
      const [movimientos] = await connection.execute<RowDataPacket[]>(
        `SELECT 
          SUM(CASE WHEN tipo IN ('entrada', 'venta', 'abono') THEN monto ELSE 0 END) as entradas,
          SUM(CASE WHEN tipo IN ('salida', 'devolucion') THEN monto ELSE 0 END) as salidas
        FROM movimientos_caja
        WHERE turno_id = ?`,
        [data.id]
      )

      const entradas = Number(movimientos[0]?.entradas) || 0
      const salidas = Number(movimientos[0]?.salidas) || 0
      const montoEsperado = Number(turno[0].monto_inicial) + entradas - salidas
      const diferencia = Number(data.monto_final) - montoEsperado

      // Cerrar turno
      await connection.execute(
        `UPDATE turnos_caja SET
          fecha_cierre = NOW(),
          monto_final = ?,
          monto_esperado = ?,
          diferencia = ?,
          estado = 'cerrado',
          notas = CONCAT(COALESCE(notas, ''), '\n', ?)
        WHERE id = ?`,
        [
          data.monto_final,
          montoEsperado,
          diferencia,
          data.notas || 'Cierre de turno',
          data.id
        ]
      )

      // Registrar en logs
      await connection.execute(
        `INSERT INTO logs (usuario_id, accion, modulo, descripcion) 
         VALUES (?, ?, ?, ?)`,
        [
          data.usuario_id,
          'cerrar_turno',
          'caja',
          `Turno cerrado - Final: ${data.monto_final.toFixed(2)}, Diferencia: ${diferencia.toFixed(2)}`
        ]
      )

      await connection.commit()

      return {
        success: true,
        message: 'Turno cerrado correctamente',
        data: {
          monto_esperado: montoEsperado,
          monto_final: data.monto_final,
          diferencia: diferencia
        }
      }
    } catch (error) {
      await connection.rollback()
      console.error('Error al cerrar turno:', error)
      return {
        success: false,
        message: 'Error al cerrar turno',
        error: error instanceof Error ? error.message : 'Error desconocido'
      }
    }
  },

  /**
   * Obtener turno activo del usuario
   */
  async getTurnoActivo(data: { usuario_id: number }) {
    try {
      const connection = await getConnection()

      const [turno] = await connection.execute<RowDataPacket[]>(
        `SELECT 
          tc.*,
          c.nombre as caja_nombre,
          a.nombre as almacen_nombre
        FROM turnos_caja tc
        INNER JOIN cajas c ON tc.caja_id = c.id
        LEFT JOIN almacenes a ON c.almacen_id = a.id
        WHERE tc.usuario_id = ? AND tc.estado = 'abierto'
        ORDER BY tc.fecha_apertura DESC
        LIMIT 1`,
        [data.usuario_id]
      )

      if (turno.length === 0) {
        return {
          success: false,
          message: 'No tienes un turno activo',
          data: null
        }
      }

      // Obtener movimientos del turno
      const [movimientos] = await connection.execute<RowDataPacket[]>(
        `SELECT 
          mc.*,
          mp.nombre as metodo_pago_nombre
        FROM movimientos_caja mc
        LEFT JOIN metodos_pago mp ON mc.metodo_pago_id = mp.id
        WHERE mc.turno_id = ?
        ORDER BY mc.fecha DESC`,
        [turno[0].id]
      )

      // Calcular totales
      const [totales] = await connection.execute<RowDataPacket[]>(
        `SELECT 
          SUM(CASE WHEN tipo IN ('entrada', 'venta', 'abono') THEN monto ELSE 0 END) as total_entradas,
          SUM(CASE WHEN tipo IN ('salida', 'devolucion') THEN monto ELSE 0 END) as total_salidas,
          COUNT(CASE WHEN tipo = 'venta' THEN 1 END) as total_ventas
        FROM movimientos_caja
        WHERE turno_id = ?`,
        [turno[0].id]
      )

      const montoActual = Number(turno[0].monto_inicial) + 
                         (Number(totales[0].total_entradas) || 0) - 
                         (Number(totales[0].total_salidas) || 0)

      return {
        success: true,
        data: {
          ...turno[0],
          movimientos,
          estadisticas: {
            ...totales[0],
            monto_actual: montoActual
          }
        }
      }
    } catch (error) {
      console.error('Error al obtener turno activo:', error)
      return {
        success: false,
        message: 'Error al obtener turno activo',
        error: error instanceof Error ? error.message : 'Error desconocido'
      }
    }
  },

  /**
   * Obtener historial de turnos
   */
  async getHistorial(filtros: {
    usuario_id?: number
    caja_id?: number
    fecha_inicio?: string
    fecha_fin?: string
    estado?: string
    page?: number
    limit?: number
  } = {}) {
    try {
      const connection = await getConnection()
      const {
        usuario_id,
        caja_id,
        fecha_inicio,
        fecha_fin,
        estado,
        page = 1,
        limit = 50
      } = filtros

      const offset = (page - 1) * limit
      let whereConditions: string[] = []
      const params: any[] = []

      if (usuario_id) {
        whereConditions.push('tc.usuario_id = ?')
        params.push(usuario_id)
      }

      if (caja_id) {
        whereConditions.push('tc.caja_id = ?')
        params.push(caja_id)
      }

      if (fecha_inicio) {
        whereConditions.push('DATE(tc.fecha_apertura) >= ?')
        params.push(fecha_inicio)
      }

      if (fecha_fin) {
        whereConditions.push('DATE(tc.fecha_apertura) <= ?')
        params.push(fecha_fin)
      }

      if (estado) {
        whereConditions.push('tc.estado = ?')
        params.push(estado)
      }

      const whereClause = whereConditions.length > 0 
        ? `WHERE ${whereConditions.join(' AND ')}` 
        : ''

      const query = `
        SELECT 
          tc.*,
          c.nombre as caja_nombre,
          u.nombre as usuario_nombre
        FROM turnos_caja tc
        INNER JOIN cajas c ON tc.caja_id = c.id
        INNER JOIN usuarios u ON tc.usuario_id = u.id
        ${whereClause}
        ORDER BY tc.fecha_apertura DESC
        LIMIT ? OFFSET ?
      `

      const countQuery = `
        SELECT COUNT(*) as total
        FROM turnos_caja tc
        ${whereClause}
      `

      const [turnos] = await connection.execute<RowDataPacket[]>(
        query,
        [...params, limit, offset]
      )

      const [countResult] = await connection.execute<RowDataPacket[]>(
        countQuery,
        params
      )

      return {
        success: true,
        data: turnos,
        pagination: {
          page,
          limit,
          total: countResult[0].total,
          totalPages: Math.ceil(countResult[0].total / limit)
        }
      }
    } catch (error) {
      console.error('Error al obtener historial de turnos:', error)
      return {
        success: false,
        message: 'Error al obtener historial',
        error: error instanceof Error ? error.message : 'Error desconocido'
      }
    }
  },

  /**
   * Obtener detalle de turno por ID
   */
  async getById(data: { id: number }) {
    try {
      const connection = await getConnection()

      const [turno] = await connection.execute<RowDataPacket[]>(
        `SELECT 
          tc.*,
          c.nombre as caja_nombre,
          u.nombre as usuario_nombre,
          a.nombre as almacen_nombre
        FROM turnos_caja tc
        INNER JOIN cajas c ON tc.caja_id = c.id
        INNER JOIN usuarios u ON tc.usuario_id = u.id
        LEFT JOIN almacenes a ON c.almacen_id = a.id
        WHERE tc.id = ?`,
        [data.id]
      )

      if (turno.length === 0) {
        return {
          success: false,
          message: 'Turno no encontrado'
        }
      }

      // Obtener movimientos detallados
      const [movimientos] = await connection.execute<RowDataPacket[]>(
        `SELECT 
          mc.*,
          mp.nombre as metodo_pago_nombre
        FROM movimientos_caja mc
        LEFT JOIN metodos_pago mp ON mc.metodo_pago_id = mp.id
        WHERE mc.turno_id = ?
        ORDER BY mc.fecha DESC`,
        [data.id]
      )

      // Obtener resumen por método de pago
      const [resumenMetodos] = await connection.execute<RowDataPacket[]>(
        `SELECT 
          mp.nombre as metodo_pago,
          SUM(CASE WHEN mc.tipo IN ('entrada', 'venta', 'abono') THEN mc.monto ELSE 0 END) as total_entradas,
          SUM(CASE WHEN mc.tipo IN ('salida', 'devolucion') THEN mc.monto ELSE 0 END) as total_salidas,
          COUNT(*) as cantidad_movimientos
        FROM movimientos_caja mc
        INNER JOIN metodos_pago mp ON mc.metodo_pago_id = mp.id
        WHERE mc.turno_id = ?
        GROUP BY mc.metodo_pago_id, mp.nombre`,
        [data.id]
      )

      return {
        success: true,
        data: {
          ...turno[0],
          movimientos,
          resumen_metodos: resumenMetodos
        }
      }
    } catch (error) {
      console.error('Error al obtener detalle de turno:', error)
      return {
        success: false,
        message: 'Error al obtener detalle de turno',
        error: error instanceof Error ? error.message : 'Error desconocido'
      }
    }
  },

  /**
   * Registrar entrada/salida de efectivo
   */
  async registrarMovimiento(data: {
    turno_id: number
    tipo: 'entrada' | 'salida'
    monto: number
    metodo_pago_id: number
    concepto: string
  }) {
    try {
      const connection = await getConnection()

      // Verificar que el turno esté abierto
      const [turno] = await connection.execute<RowDataPacket[]>(
        'SELECT id FROM turnos_caja WHERE id = ? AND estado = "abierto"',
        [data.turno_id]
      )

      if (turno.length === 0) {
        return {
          success: false,
          message: 'El turno no está abierto'
        }
      }

      // Registrar movimiento
      await connection.execute(
        `INSERT INTO movimientos_caja (
          turno_id, tipo, monto, metodo_pago_id, concepto
        ) VALUES (?, ?, ?, ?, ?)`,
        [
          data.turno_id,
          data.tipo,
          data.monto,
          data.metodo_pago_id,
          data.concepto
        ]
      )

      return {
        success: true,
        message: 'Movimiento registrado correctamente'
      }
    } catch (error) {
      console.error('Error al registrar movimiento:', error)
      return {
        success: false,
        message: 'Error al registrar movimiento',
        error: error instanceof Error ? error.message : 'Error desconocido'
      }
    }
  }
}