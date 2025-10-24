import { RowDataPacket, ResultSetHeader } from 'mysql2'
import { getConnection } from '../../db/connection'

// ============================================
// src/main/api/ipc/inventario/transferenciasController.ts
// ============================================

interface DetalleTransferencia {
  producto_id: number
  cantidad: number
}

export const transferenciasController = {
  /**
   * Crear transferencia entre almacenes
   */
  async create(data: {
    almacen_origen_id: number
    almacen_destino_id: number
    usuario_id: number
    notas?: string
    detalles: DetalleTransferencia[]
  }) {
    const pool = await getConnection();
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction()

      if (data.almacen_origen_id === data.almacen_destino_id) {
        await connection.rollback()
        return {
          success: false,
          message: 'El almacén origen y destino no pueden ser el mismo'
        }
      }

      // Generar folio
      const [maxFolio] = await connection.execute<RowDataPacket[]>(
        "SELECT MAX(CAST(SUBSTRING(folio, 3) AS UNSIGNED)) as max_num FROM transferencias WHERE folio LIKE 'T-%'"
      )
      const nextNum = (maxFolio[0]?.max_num || 0) + 1
      const folio = `T-${String(nextNum).padStart(6, '0')}`

      // Crear transferencia
      const [result] = await connection.execute<ResultSetHeader>(
        `INSERT INTO transferencias (
            folio, almacen_origen_id, almacen_destino_id, usuario_id, notas
          ) VALUES (?, ?, ?, ?, ?)`,
        [
          folio,
          data.almacen_origen_id,
          data.almacen_destino_id,
          data.usuario_id,
          data.notas || null
        ]
      )

      const transferenciaId = result.insertId

      // Procesar detalles
      for (const detalle of data.detalles) {
        // Verificar stock en almacén origen
        const [stockOrigen] = await connection.execute<RowDataPacket[]>(
          'SELECT cantidad FROM stock_almacen WHERE producto_id = ? AND almacen_id = ?',
          [detalle.producto_id, data.almacen_origen_id]
        )

        if (stockOrigen.length === 0 || stockOrigen[0].cantidad < detalle.cantidad) {
          await connection.rollback()
          return {
            success: false,
            message: `Stock insuficiente en almacén origen para producto ID ${detalle.producto_id}`
          }
        }

        // Insertar detalle
        await connection.execute(
          'INSERT INTO detalle_transferencias (transferencia_id, producto_id, cantidad) VALUES (?, ?, ?)',
          [transferenciaId, detalle.producto_id, detalle.cantidad]
        )

        // Actualizar stock almacén origen (restar)
        await connection.execute(
          'UPDATE stock_almacen SET cantidad = cantidad - ? WHERE producto_id = ? AND almacen_id = ?',
          [detalle.cantidad, detalle.producto_id, data.almacen_origen_id]
        )

        // Actualizar o crear stock en almacén destino (sumar)
        const [stockDestino] = await connection.execute<RowDataPacket[]>(
          'SELECT id FROM stock_almacen WHERE producto_id = ? AND almacen_id = ?',
          [detalle.producto_id, data.almacen_destino_id]
        )

        if (stockDestino.length > 0) {
          await connection.execute(
            'UPDATE stock_almacen SET cantidad = cantidad + ? WHERE producto_id = ? AND almacen_id = ?',
            [detalle.cantidad, detalle.producto_id, data.almacen_destino_id]
          )
        } else {
          await connection.execute(
            'INSERT INTO stock_almacen (producto_id, almacen_id, cantidad) VALUES (?, ?, ?)',
            [detalle.producto_id, data.almacen_destino_id, detalle.cantidad]
          )
        }

        // Registrar movimientos de inventario
        await connection.execute(
          `INSERT INTO movimientos_inventario (
              producto_id, almacen_id, tipo, cantidad, 
              referencia_tipo, referencia_id, usuario_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            detalle.producto_id,
            data.almacen_origen_id,
            'salida',
            detalle.cantidad,
            'transferencia',
            transferenciaId,
            data.usuario_id
          ]
        )

        await connection.execute(
          `INSERT INTO movimientos_inventario (
              producto_id, almacen_id, tipo, cantidad, 
              referencia_tipo, referencia_id, usuario_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            detalle.producto_id,
            data.almacen_destino_id,
            'entrada',
            detalle.cantidad,
            'transferencia',
            transferenciaId,
            data.usuario_id
          ]
        )
      }

      // Actualizar estado a completada
      await connection.execute(
        'UPDATE transferencias SET estado = "completada" WHERE id = ?',
        [transferenciaId]
      )

      // Registrar en logs
      await connection.execute(
        'INSERT INTO logs (usuario_id, accion, modulo, descripcion) VALUES (?, ?, ?, ?)',
        [
          data.usuario_id,
          'crear',
          'transferencias',
          `Transferencia creada: ${folio}`
        ]
      )

      await connection.commit()

      return {
        success: true,
        message: 'Transferencia creada correctamente',
        data: { id: transferenciaId, folio }
      }
    } catch (error) {
      await connection.rollback()
      console.error('Error al crear transferencia:', error)
      return {
        success: false,
        message: 'Error al crear transferencia',
        error: error instanceof Error ? error.message : 'Error desconocido'
      }
    }
  },

  /**
   * Obtener transferencias
   */
  async getAll(filtros: {
    almacen_origen_id?: number
    almacen_destino_id?: number
    estado?: string
    fecha_inicio?: string
    fecha_fin?: string
    page?: number
    limit?: number
  } = {}) {
    try {
      const connection = await getConnection()
      const {
        almacen_origen_id,
        almacen_destino_id,
        estado,
        fecha_inicio,
        fecha_fin,
        page = 1,
        limit = 50
      } = filtros

      const offset = (page - 1) * limit
      let whereConditions: string[] = []
      const params: any[] = []

      if (almacen_origen_id) {
        whereConditions.push('t.almacen_origen_id = ?')
        params.push(almacen_origen_id)
      }

      if (almacen_destino_id) {
        whereConditions.push('t.almacen_destino_id = ?')
        params.push(almacen_destino_id)
      }

      if (estado) {
        whereConditions.push('t.estado = ?')
        params.push(estado)
      }

      if (fecha_inicio) {
        whereConditions.push('DATE(t.fecha) >= ?')
        params.push(fecha_inicio)
      }

      if (fecha_fin) {
        whereConditions.push('DATE(t.fecha) <= ?')
        params.push(fecha_fin)
      }

      const whereClause = whereConditions.length > 0
        ? `WHERE ${whereConditions.join(' AND ')}`
        : ''

      const query = `
          SELECT 
            t.*,
            ao.nombre as almacen_origen,
            ad.nombre as almacen_destino,
            u.nombre as usuario_nombre
          FROM transferencias t
          INNER JOIN almacenes ao ON t.almacen_origen_id = ao.id
          INNER JOIN almacenes ad ON t.almacen_destino_id = ad.id
          INNER JOIN usuarios u ON t.usuario_id = u.id
          ${whereClause}
          ORDER BY t.fecha DESC
          LIMIT ? OFFSET ?
        `

      const countQuery = `SELECT COUNT(*) as total FROM transferencias t ${whereClause}`

      const [transferencias] = await connection.execute<RowDataPacket[]>(
        query,
        [...params, limit, offset]
      )

      const [countResult] = await connection.execute<RowDataPacket[]>(countQuery, params)

      return {
        success: true,
        data: transferencias,
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
        message: 'Error al obtener transferencias',
        error: error instanceof Error ? error.message : 'Error desconocido'
      }
    }
  },

  /**
   * Obtener transferencia por ID con detalles
   */
  async getById(data: { id: number }) {
    try {
      const connection = await getConnection()

      const [transferencia] = await connection.execute<RowDataPacket[]>(
        `SELECT 
            t.*,
            ao.nombre as almacen_origen,
            ad.nombre as almacen_destino,
            u.nombre as usuario_nombre
          FROM transferencias t
          INNER JOIN almacenes ao ON t.almacen_origen_id = ao.id
          INNER JOIN almacenes ad ON t.almacen_destino_id = ad.id
          INNER JOIN usuarios u ON t.usuario_id = u.id
          WHERE t.id = ?`,
        [data.id]
      )

      if (transferencia.length === 0) {
        return {
          success: false,
          message: 'Transferencia no encontrada'
        }
      }

      const [detalles] = await connection.execute<RowDataPacket[]>(
        `SELECT 
            dt.*,
            p.codigo,
            p.nombre as producto_nombre
          FROM detalle_transferencias dt
          INNER JOIN productos p ON dt.producto_id = p.id
          WHERE dt.transferencia_id = ?`,
        [data.id]
      )

      return {
        success: true,
        data: {
          ...transferencia[0],
          detalles
        }
      }
    } catch (error) {
      return {
        success: false,
        message: 'Error al obtener transferencia',
        error: error instanceof Error ? error.message : 'Error desconocido'
      }
    }
  }
}