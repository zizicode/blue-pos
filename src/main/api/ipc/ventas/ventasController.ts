// src/main/api/ipc/ventas/ventasController.ts

import { RowDataPacket, ResultSetHeader } from 'mysql2'
import { getConnection } from '../../db/connection'

interface DetalleVenta {
  producto_id: number
  cantidad: number
  precio_unitario: number
  descuento_porcentaje?: number
  descuento_monto?: number
  subtotal: number
}

interface PagoVenta {
  metodo_pago_id: number
  monto: number
  referencia?: string
}

interface VentaData {
  cliente_id?: number
  almacen_id?: number
  usuario_id: number
  tipo_venta: 'contado' | 'credito'
  descuento?: number
  fecha_vencimiento?: string
  notas?: string
  detalles: DetalleVenta[]
  pagos: PagoVenta[]
}

export const ventasController = {
  /**
   * Crear nueva venta
   */
  async create(data: VentaData) {
    const pool = await getConnection()
    const connection = await pool.getConnection()
    
    try {

      // Calcular totales
      const subtotal = data.detalles.reduce((sum, item) => sum + item.subtotal, 0)
      const descuento = data.descuento || 0
      const total = subtotal - descuento

      // Validar que los pagos cubran el total en ventas de contado
      if (data.tipo_venta === 'contado') {
        const totalPagos = data.pagos.reduce((sum, pago) => sum + pago.monto, 0)
        if (totalPagos < total) {
          await connection.rollback()
          return {
            success: false,
            message: 'Los pagos no cubren el total de la venta'
          }
        }
      }

      // Generar folio único
      const [maxFolio] = await connection.execute<RowDataPacket[]>(
        "SELECT MAX(CAST(SUBSTRING(folio, 3) AS UNSIGNED)) as max_num FROM ventas WHERE folio LIKE 'V-%'"
      )
      const nextNum = (maxFolio[0]?.max_num || 0) + 1
      const folio = `V-${String(nextNum).padStart(6, '0')}`

      // Insertar venta
      const [ventaResult] = await connection.execute<ResultSetHeader>(
        `INSERT INTO ventas (
          folio, cliente_id, almacen_id, usuario_id, 
          subtotal, descuento, total, tipo_venta, notas
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          folio,
          data.cliente_id || null,
          data.almacen_id || null,
          data.usuario_id,
          subtotal,
          descuento,
          total,
          data.tipo_venta,
          data.notas || null
        ]
      )

      const ventaId = ventaResult.insertId

      // Insertar detalles de venta
      for (const detalle of data.detalles) {
        // Verificar stock disponible
        const [stockCheck] = await connection.execute<RowDataPacket[]>(
          'SELECT stock_actual, nombre FROM productos WHERE id = ?',
          [detalle.producto_id]
        )

        if (stockCheck.length === 0) {
          await connection.rollback()
          return {
            success: false,
            message: `Producto con ID ${detalle.producto_id} no encontrado`
          }
        }

        if (stockCheck[0].stock_actual < detalle.cantidad) {
          await connection.rollback()
          return {
            success: false,
            message: `Stock insuficiente para ${stockCheck[0].nombre}. Disponible: ${stockCheck[0].stock_actual}`
          }
        }

        // Insertar detalle
        await connection.execute(
          `INSERT INTO detalle_ventas (
            venta_id, producto_id, cantidad, precio_unitario,
            descuento_porcentaje, descuento_monto, subtotal
          ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            ventaId,
            detalle.producto_id,
            detalle.cantidad,
            detalle.precio_unitario,
            detalle.descuento_porcentaje || 0,
            detalle.descuento_monto || 0,
            detalle.subtotal
          ]
        )

        // Actualizar stock
        const stockAnterior = stockCheck[0].stock_actual
        const stockNuevo = stockAnterior - detalle.cantidad

        await connection.execute(
          'UPDATE productos SET stock_actual = ? WHERE id = ?',
          [stockNuevo, detalle.producto_id]
        )

        // Registrar movimiento de inventario
        await connection.execute(
          `INSERT INTO movimientos_inventario (
            producto_id, almacen_id, tipo, cantidad, 
            stock_anterior, stock_nuevo, referencia_tipo, 
            referencia_id, usuario_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            detalle.producto_id,
            data.almacen_id || null,
            'salida',
            detalle.cantidad,
            stockAnterior,
            stockNuevo,
            'venta',
            ventaId,
            data.usuario_id
          ]
        )
      }

      // Insertar pagos
      for (const pago of data.pagos) {
        await connection.execute(
          `INSERT INTO pagos_venta (
            venta_id, metodo_pago_id, monto, referencia
          ) VALUES (?, ?, ?, ?)`,
          [ventaId, pago.metodo_pago_id, pago.monto, pago.referencia || null]
        )

        // Registrar movimiento de caja si hay turno abierto
        const [turnoAbierto] = await connection.execute<RowDataPacket[]>(
          `SELECT id FROM turnos_caja 
           WHERE usuario_id = ? AND estado = 'abierto' 
           ORDER BY fecha_apertura DESC LIMIT 1`,
          [data.usuario_id]
        )

        if (turnoAbierto.length > 0) {
          await connection.execute(
            `INSERT INTO movimientos_caja (
              turno_id, tipo, monto, metodo_pago_id,
              referencia_tipo, referencia_id, concepto
            ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              turnoAbierto[0].id,
              'venta',
              pago.monto,
              pago.metodo_pago_id,
              'venta',
              ventaId,
              `Venta ${folio}`
            ]
          )
        }
      }

      // Si es venta a crédito, crear cuenta por cobrar
      if (data.tipo_venta === 'credito' && data.cliente_id) {
        const fechaVencimiento = data.fecha_vencimiento || null

        await connection.execute(
          `INSERT INTO cuentas_por_cobrar (
            cliente_id, venta_id, monto_total, 
            saldo_pendiente, fecha_vencimiento
          ) VALUES (?, ?, ?, ?, ?)`,
          [data.cliente_id, ventaId, total, total, fechaVencimiento]
        )

        // Actualizar saldo del cliente
        await connection.execute(
          'UPDATE clientes SET saldo_actual = saldo_actual + ? WHERE id = ?',
          [total, data.cliente_id]
        )
      }

      // Registrar en logs
      await connection.execute(
        `INSERT INTO logs (usuario_id, accion, modulo, descripcion) 
         VALUES (?, ?, ?, ?)`,
        [
          data.usuario_id,
          'crear',
          'ventas',
          `Venta registrada: ${folio} - Total: $${total.toFixed(2)}`
        ]
      )

      await connection.commit()

      return {
        success: true,
        message: 'Venta registrada correctamente',
        data: {
          id: ventaId,
          folio: folio,
          total: total
        }
      }

    } catch (error) {
      await connection.rollback()
      console.error('Error al crear venta:', error)
      return {
        success: false,
        message: 'Error al registrar venta',
        error: error instanceof Error ? error.message : 'Error desconocido'
      }
    }
  },

  /**
   * Obtener ventas con filtros
   */
  async getAll(filtros: {
    fecha_inicio?: string
    fecha_fin?: string
    cliente_id?: number
    usuario_id?: number
    tipo_venta?: string
    estado?: string
    page?: number
    limit?: number
  } = {}) {
    try {
      const connection = await getConnection()
      const {
        fecha_inicio,
        fecha_fin,
        cliente_id,
        usuario_id,
        tipo_venta,
        estado = 'completada',
        page = 1,
        limit = 50
      } = filtros

      const offset = (page - 1) * limit
      let whereConditions = ['v.estado = ?']
      const params: any[] = [estado]

      if (fecha_inicio) {
        whereConditions.push('DATE(v.fecha) >= ?')
        params.push(fecha_inicio)
      }

      if (fecha_fin) {
        whereConditions.push('DATE(v.fecha) <= ?')
        params.push(fecha_fin)
      }

      if (cliente_id) {
        whereConditions.push('v.cliente_id = ?')
        params.push(cliente_id)
      }

      if (usuario_id) {
        whereConditions.push('v.usuario_id = ?')
        params.push(usuario_id)
      }

      if (tipo_venta) {
        whereConditions.push('v.tipo_venta = ?')
        params.push(tipo_venta)
      }

      const whereClause = `WHERE ${whereConditions.join(' AND ')}`

      const query = `
        SELECT 
          v.*,
          c.nombre as cliente_nombre,
          u.nombre as usuario_nombre,
          a.nombre as almacen_nombre
        FROM ventas v
        LEFT JOIN clientes c ON v.cliente_id = c.id
        LEFT JOIN usuarios u ON v.usuario_id = u.id
        LEFT JOIN almacenes a ON v.almacen_id = a.id
        ${whereClause}
        ORDER BY v.fecha DESC
        LIMIT ? OFFSET ?
      `

      const countQuery = `
        SELECT COUNT(*) as total
        FROM ventas v
        ${whereClause}
      `

      const [ventas] = await connection.execute<RowDataPacket[]>(
        query,
        [...params, limit, offset]
      )

      const [countResult] = await connection.execute<RowDataPacket[]>(
        countQuery,
        params
      )

      return {
        success: true,
        data: ventas,
        pagination: {
          page,
          limit,
          total: countResult[0].total,
          totalPages: Math.ceil(countResult[0].total / limit)
        }
      }
    } catch (error) {
      console.error('Error al obtener ventas:', error)
      return {
        success: false,
        message: 'Error al obtener ventas',
        error: error instanceof Error ? error.message : 'Error desconocido'
      }
    }
  },

  /**
   * Obtener venta por ID con detalles completos
   */
  async getById(data: { id: number }) {
    try {
      const connection = await getConnection();
  
      // Obtener venta principal con cliente, usuario y almacén
      const [venta] = await connection.execute<RowDataPacket[]>(
        `SELECT 
           v.*,
           c.nombre AS cliente_nombre,
           c.telefono AS cliente_telefono,
           c.email AS cliente_email,
           u.nombre AS usuario_nombre,
           a.nombre AS almacen_nombre
         FROM ventas v
         LEFT JOIN clientes c ON v.cliente_id = c.id
         LEFT JOIN usuarios u ON v.usuario_id = u.id
         LEFT JOIN almacenes a ON v.almacen_id = a.id
         WHERE v.id = ?`,
        [data.id]
      );
  
      if (venta.length === 0) {
        return { success: false, message: 'Venta no encontrada' };
      }
  
      // Obtener detalles de la venta con datos del producto y unidad de medida
      const [detalles] = await connection.execute<RowDataPacket[]>(
        `SELECT 
           dv.*,
           p.codigo,
           p.nombre AS producto_nombre,
           p.codigo_barras,
           um.abreviatura AS unidad_medida
         FROM detalle_ventas dv
         INNER JOIN productos p ON dv.producto_id = p.id
         LEFT JOIN unidades_medida um ON p.unidad_medida_id = um.id
         WHERE dv.venta_id = ?
         ORDER BY dv.id`,
        [data.id]
      );
  
      // Obtener pagos asociados a la venta
      const [pagos] = await connection.execute<RowDataPacket[]>(
        `SELECT 
           pv.*,
           mp.nombre AS metodo_pago_nombre
         FROM pagos_venta pv
         INNER JOIN metodos_pago mp ON pv.metodo_pago_id = mp.id
         WHERE pv.venta_id = ?
         ORDER BY pv.fecha`,
        [data.id]
      );
  
      return {
        success: true,
        data: {
          ...venta[0],
          detalles,
          pagos,
        },
      };
    } catch (error) {
      console.error('Error al obtener venta:', error);
      return {
        success: false,
        message: 'Error al obtener venta',
        error: error instanceof Error ? error.message : 'Error desconocido',
      };
    }
  },  

  /**
   * Obtener venta por folio
   */
  async getByFolio(data: { folio: string }) {
    try {
      const connection = await getConnection()

      const [venta] = await connection.execute<RowDataPacket[]>(
        'SELECT id FROM ventas WHERE folio = ?',
        [data.folio]
      )

      if (venta.length === 0) {
        return {
          success: false,
          message: 'Venta no encontrada'
        }
      }

      return this.getById({ id: venta[0].id })
    } catch (error) {
      console.error('Error al obtener venta por folio:', error)
      return {
        success: false,
        message: 'Error al obtener venta',
        error: error instanceof Error ? error.message : 'Error desconocido'
      }
    }
  },

  /**
   * Cancelar venta
   */
  async cancelar(data: { id: number; usuario_id: number; motivo?: string }) {
    const connection = await getConnection()

    try {
      await connection.beginTransaction()

      // Obtener venta
      const [venta] = await connection.execute<RowDataPacket[]>(
        'SELECT * FROM ventas WHERE id = ? AND estado = "completada"',
        [data.id]
      )

      if (venta.length === 0) {
        await connection.rollback()
        return {
          success: false,
          message: 'Venta no encontrada o ya está cancelada'
        }
      }

      // Obtener detalles para devolver stock
      const [detalles] = await connection.execute<RowDataPacket[]>(
        'SELECT producto_id, cantidad FROM detalle_ventas WHERE venta_id = ?',
        [data.id]
      )

      // Devolver stock a productos
      for (const detalle of detalles) {
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
            producto_id, tipo, cantidad, stock_anterior, 
            stock_nuevo, referencia_tipo, referencia_id, 
            motivo, usuario_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            detalle.producto_id,
            'entrada',
            detalle.cantidad,
            stockAnterior,
            stockNuevo,
            'cancelacion_venta',
            data.id,
            data.motivo || 'Cancelación de venta',
            data.usuario_id
          ]
        )
      }

      // Si era venta a crédito, ajustar cuenta por cobrar
      if (venta[0].tipo_venta === 'credito' && venta[0].cliente_id) {
        await connection.execute(
          `UPDATE cuentas_por_cobrar 
           SET estado = 'cancelada' 
           WHERE venta_id = ?`,
          [data.id]
        )

        await connection.execute(
          'UPDATE clientes SET saldo_actual = saldo_actual - ? WHERE id = ?',
          [venta[0].total, venta[0].cliente_id]
        )
      }

      // Actualizar estado de venta
      await connection.execute(
        'UPDATE ventas SET estado = "cancelada", notas = CONCAT(COALESCE(notas, ""), "\n", ?) WHERE id = ?',
        [`Cancelada: ${data.motivo || 'Sin motivo especificado'}`, data.id]
      )

      // Registrar en logs
      await connection.execute(
        `INSERT INTO logs (usuario_id, accion, modulo, descripcion) 
         VALUES (?, ?, ?, ?)`,
        [
          data.usuario_id,
          'cancelar',
          'ventas',
          `Venta cancelada: ${venta[0].folio} - Motivo: ${data.motivo || 'No especificado'}`
        ]
      )

      await connection.commit()

      return {
        success: true,
        message: 'Venta cancelada correctamente'
      }

    } catch (error) {
      await connection.rollback()
      console.error('Error al cancelar venta:', error)
      return {
        success: false,
        message: 'Error al cancelar venta',
        error: error instanceof Error ? error.message : 'Error desconocido'
      }
    }
  },

  /**
   * Obtener resumen de ventas por periodo
   */
  async getResumen(data: {
    fecha_inicio: string
    fecha_fin: string
    usuario_id?: number
  }) {
    try {
      const connection = await getConnection()
      
      let whereClause = 'WHERE v.estado = "completada" AND DATE(v.fecha) BETWEEN ? AND ?'
      const params: any[] = [data.fecha_inicio, data.fecha_fin]

      if (data.usuario_id) {
        whereClause += ' AND v.usuario_id = ?'
        params.push(data.usuario_id)
      }

      const query = `
        SELECT 
          COUNT(*) as total_ventas,
          SUM(v.total) as monto_total,
          SUM(v.subtotal) as subtotal_total,
          SUM(v.descuento) as descuentos_total,
          AVG(v.total) as ticket_promedio,
          SUM(CASE WHEN v.tipo_venta = 'contado' THEN v.total ELSE 0 END) as ventas_contado,
          SUM(CASE WHEN v.tipo_venta = 'credito' THEN v.total ELSE 0 END) as ventas_credito
        FROM ventas v
        ${whereClause}
      `

      const [resumen] = await connection.execute<RowDataPacket[]>(query, params)

      return {
        success: true,
        data: resumen[0]
      }
    } catch (error) {
      console.error('Error al obtener resumen de ventas:', error)
      return {
        success: false,
        message: 'Error al obtener resumen',
        error: error instanceof Error ? error.message : 'Error desconocido'
      }
    }
  },
  /**
 * Obtener todas las ventas con sus productos anidados
 */

}