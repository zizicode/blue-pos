// src/main/api/ipc/ventas/devolucionesController.ts
import { RowDataPacket, ResultSetHeader } from 'mysql2'
import { getConnection } from '../../db/connection'

interface DetalleDevolucion {
  producto_id: number
  cantidad: number
  precio_unitario: number
  subtotal: number
}

export const devolucionesController = {
  /**
   * Crear devolución
   */
  async create(data: {
    venta_id: number
    usuario_id: number
    motivo: string
    detalles: DetalleDevolucion[]
  }) {
    const connection = await getConnection()

    try {
      await connection.beginTransaction()

      // Verificar que la venta existe
      const [venta] = await connection.execute<RowDataPacket[]>(
        'SELECT * FROM ventas WHERE id = ? AND estado = "completada"',
        [data.venta_id]
      )

      if (venta.length === 0) {
        await connection.rollback()
        return {
          success: false,
          message: 'Venta no encontrada o ya está cancelada'
        }
      }

      // Calcular total de devolución
      const total = data.detalles.reduce((sum, item) => sum + item.subtotal, 0)

      // Generar folio
      const [maxFolio] = await connection.execute<RowDataPacket[]>(
        "SELECT MAX(CAST(SUBSTRING(folio, 4) AS UNSIGNED)) as max_num FROM devoluciones WHERE folio LIKE 'DEV-%'"
      )
      const nextNum = (maxFolio[0]?.max_num || 0) + 1
      const folio = `DEV-${String(nextNum).padStart(6, '0')}`

      // Crear devolución
      const [devResult] = await connection.execute<ResultSetHeader>(
        `INSERT INTO devoluciones (
          folio, venta_id, motivo, total, usuario_id
        ) VALUES (?, ?, ?, ?, ?)`,
        [folio, data.venta_id, data.motivo, total, data.usuario_id]
      )

      const devolucionId = devResult.insertId

      // Procesar detalles
      for (const detalle of data.detalles) {
        // Verificar que el producto esté en la venta original
        const [detalleVenta] = await connection.execute<RowDataPacket[]>(
          'SELECT cantidad FROM detalle_ventas WHERE venta_id = ? AND producto_id = ?',
          [data.venta_id, detalle.producto_id]
        )

        if (detalleVenta.length === 0) {
          await connection.rollback()
          return {
            success: false,
            message: `El producto ID ${detalle.producto_id} no está en la venta original`
          }
        }

        if (detalle.cantidad > detalleVenta[0].cantidad) {
          await connection.rollback()
          return {
            success: false,
            message: `La cantidad a devolver excede la cantidad vendida para producto ID ${detalle.producto_id}`
          }
        }

        // Insertar detalle de devolución
        await connection.execute(
          `INSERT INTO detalle_devoluciones (
            devolucion_id, producto_id, cantidad, precio_unitario, subtotal
          ) VALUES (?, ?, ?, ?, ?)`,
          [devolucionId, detalle.producto_id, detalle.cantidad, detalle.precio_unitario, detalle.subtotal]
        )

        // Devolver stock
        const [producto] = await connection.execute<RowDataPacket[]>(
          'SELECT stock_actual FROM productos WHERE id = ?',
          [detalle.producto_id]
        )

        const stockAnterior = producto[0].stock_actual
        const stockNuevo = stockAnterior + detalle.cantidad

        await connection.execute(
          'UPDATE productos SET stock_actual = ? WHERE id = ?',
          [stockNuevo, detalle.producto_id]
        )

        // Registrar movimiento de inventario
        await connection.execute(
          `INSERT INTO movimientos_inventario (
            producto_id, almacen_id, tipo, cantidad, 
            stock_anterior, stock_nuevo, referencia_tipo, 
            referencia_id, motivo, usuario_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            detalle.producto_id,
            venta[0].almacen_id,
            'entrada',
            detalle.cantidad,
            stockAnterior,
            stockNuevo,
            'devolucion',
            devolucionId,
            data.motivo,
            data.usuario_id
          ]
        )
      }

      // Registrar movimiento en caja si hay turno abierto
      const [turnoAbierto] = await connection.execute<RowDataPacket[]>(
        `SELECT id FROM turnos_caja 
         WHERE usuario_id = ? AND estado = 'abierto' 
         ORDER BY fecha_apertura DESC LIMIT 1`,
        [data.usuario_id]
      )

      if (turnoAbierto.length > 0) {
        await connection.execute(
          `INSERT INTO movimientos_caja (
            turno_id, tipo, monto, referencia_tipo, referencia_id, concepto
          ) VALUES (?, ?, ?, ?, ?, ?)`,
          [
            turnoAbierto[0].id,
            'devolucion',
            total,
            'devolucion',
            devolucionId,
            `Devolución ${folio} - ${venta[0].folio}`
          ]
        )
      }

      // Registrar en logs
      await connection.execute(
        'INSERT INTO logs (usuario_id, accion, modulo, descripcion) VALUES (?, ?, ?, ?)',
        [
          data.usuario_id,
          'crear',
          'devoluciones',
          `Devolución registrada: ${folio} - ${venta[0].folio} - $${total.toFixed(2)}`
        ]
      )

      await connection.commit()

      return {
        success: true,
        message: 'Devolución registrada correctamente',
        data: { id: devolucionId, folio, total }
      }

    } catch (error) {
      await connection.rollback()
      console.error('Error al crear devolución:', error)
      return {
        success: false,
        message: 'Error al registrar devolución',
        error: error instanceof Error ? error.message : 'Error desconocido'
      }
    }
  },

  /**
   * Obtener devoluciones con filtros
   */
  async getAll(filtros: {
    fecha_inicio?: string
    fecha_fin?: string
    usuario_id?: number
    page?: number
    limit?: number
  } = {}) {
    try {
      const connection = await getConnection()
      const {
        fecha_inicio,
        fecha_fin,
        usuario_id,
        page = 1,
        limit = 50
      } = filtros

      const offset = (page - 1) * limit
      let whereConditions: string[] = []
      const params: any[] = []

      if (fecha_inicio) {
        whereConditions.push('DATE(d.fecha) >= ?')
        params.push(fecha_inicio)
      }

      if (fecha_fin) {
        whereConditions.push('DATE(d.fecha) <= ?')
        params.push(fecha_fin)
      }

      if (usuario_id) {
        whereConditions.push('d.usuario_id = ?')
        params.push(usuario_id)
      }

      const whereClause = whereConditions.length > 0 
        ? `WHERE ${whereConditions.join(' AND ')}` 
        : ''

      const query = `
        SELECT 
          d.*,
          v.folio as venta_folio,
          u.nombre as usuario_nombre
        FROM devoluciones d
        INNER JOIN ventas v ON d.venta_id = v.id
        INNER JOIN usuarios u ON d.usuario_id = u.id
        ${whereClause}
        ORDER BY d.fecha DESC
        LIMIT ? OFFSET ?
      `

      const countQuery = `SELECT COUNT(*) as total FROM devoluciones d ${whereClause}`

      const [devoluciones] = await connection.execute<RowDataPacket[]>(
        query,
        [...params, limit, offset]
      )

      const [countResult] = await connection.execute<RowDataPacket[]>(countQuery, params)

      return {
        success: true,
        data: devoluciones,
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
        message: 'Error al obtener devoluciones',
        error: error instanceof Error ? error.message : 'Error desconocido'
      }
    }
  },

  /**
   * Obtener devolución por ID
   */
  async getById(data: { id: number }) {
    try {
      const connection = await getConnection()

      const [devolucion] = await connection.execute<RowDataPacket[]>(
        `SELECT 
          d.*,
          v.folio as venta_folio,
          v.fecha as fecha_venta,
          u.nombre as usuario_nombre
        FROM devoluciones d
        INNER JOIN ventas v ON d.venta_id = v.id
        INNER JOIN usuarios u ON d.usuario_id = u.id
        WHERE d.id = ?`,
        [data.id]
      )

      if (devolucion.length === 0) {
        return {
          success: false,
          message: 'Devolución no encontrada'
        }
      }

      const [detalles] = await connection.execute<RowDataPacket[]>(
        `SELECT 
          dd.*,
          p.codigo,
          p.nombre as producto_nombre
        FROM detalle_devoluciones dd
        INNER JOIN productos p ON dd.producto_id = p.id
        WHERE dd.devolucion_id = ?`,
        [data.id]
      )

      return {
        success: true,
        data: {
          ...devolucion[0],
          detalles
        }
      }
    } catch (error) {
      return {
        success: false,
        message: 'Error al obtener devolución',
        error: error instanceof Error ? error.message : 'Error desconocido'
      }
    }
  }
}


