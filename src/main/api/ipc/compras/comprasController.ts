// src/main/api/ipc/compras/comprasController.ts

import { RowDataPacket, ResultSetHeader } from 'mysql2'
import { getConnection } from '../../db/connection'

interface DetalleCompra {
  producto_id: number
  cantidad: number
  precio_unitario: number
  subtotal: number
}

interface CompraData {
  proveedor_id: number
  almacen_id?: number
  usuario_id: number
  notas?: string
  detalles: DetalleCompra[]
}

export const comprasController = {
  /**
   * Crear nueva compra
   */
  async create(data: CompraData) {
    const connection = await getConnection()

    try {
      await connection.beginTransaction()

      // Calcular total
      const total = data.detalles.reduce((sum, item) => sum + item.subtotal, 0)

      // Generar folio único
      const [maxFolio] = await connection.execute<RowDataPacket[]>(
        "SELECT MAX(CAST(SUBSTRING(folio, 3) AS UNSIGNED)) as max_num FROM compras WHERE folio LIKE 'C-%'"
      )
      const nextNum = (maxFolio[0]?.max_num || 0) + 1
      const folio = `C-${String(nextNum).padStart(6, '0')}`

      // Insertar compra
      const [compraResult] = await connection.execute<ResultSetHeader>(
        `INSERT INTO compras (
          folio, proveedor_id, almacen_id, usuario_id, total, notas
        ) VALUES (?, ?, ?, ?, ?, ?)`,
        [
          folio,
          data.proveedor_id,
          data.almacen_id || null,
          data.usuario_id,
          total,
          data.notas || null
        ]
      )

      const compraId = compraResult.insertId

      // Insertar detalles y actualizar inventario
      for (const detalle of data.detalles) {
        // Insertar detalle de compra
        await connection.execute(
          `INSERT INTO detalle_compras (
            compra_id, producto_id, cantidad, precio_unitario, subtotal
          ) VALUES (?, ?, ?, ?, ?)`,
          [
            compraId,
            detalle.producto_id,
            detalle.cantidad,
            detalle.precio_unitario,
            detalle.subtotal
          ]
        )

        // Obtener stock actual
        const [producto] = await connection.execute<RowDataPacket[]>(
          'SELECT stock_actual, precio_compra FROM productos WHERE id = ?',
          [detalle.producto_id]
        )

        if (producto.length === 0) {
          await connection.rollback()
          return {
            success: false,
            message: `Producto con ID ${detalle.producto_id} no encontrado`
          }
        }

        const stockAnterior = producto[0].stock_actual
        const stockNuevo = stockAnterior + detalle.cantidad

        // Actualizar stock y precio de compra del producto
        await connection.execute(
          'UPDATE productos SET stock_actual = ?, precio_compra = ? WHERE id = ?',
          [stockNuevo, detalle.precio_unitario, detalle.producto_id]
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
            'entrada',
            detalle.cantidad,
            stockAnterior,
            stockNuevo,
            'compra',
            compraId,
            data.usuario_id
          ]
        )

        // Actualizar stock por almacén si se especificó
        if (data.almacen_id) {
          const [stockAlmacen] = await connection.execute<RowDataPacket[]>(
            'SELECT cantidad FROM stock_almacen WHERE producto_id = ? AND almacen_id = ?',
            [detalle.producto_id, data.almacen_id]
          )

          if (stockAlmacen.length > 0) {
            await connection.execute(
              'UPDATE stock_almacen SET cantidad = cantidad + ? WHERE producto_id = ? AND almacen_id = ?',
              [detalle.cantidad, detalle.producto_id, data.almacen_id]
            )
          } else {
            await connection.execute(
              'INSERT INTO stock_almacen (producto_id, almacen_id, cantidad) VALUES (?, ?, ?)',
              [detalle.producto_id, data.almacen_id, detalle.cantidad]
            )
          }
        }
      }

      // Registrar en logs
      await connection.execute(
        `INSERT INTO logs (usuario_id, accion, modulo, descripcion) 
         VALUES (?, ?, ?, ?)`,
        [
          data.usuario_id,
          'crear',
          'compras',
          `Compra registrada: ${folio} - Total: $${total.toFixed(2)}`
        ]
      )

      await connection.commit()

      return {
        success: true,
        message: 'Compra registrada correctamente',
        data: {
          id: compraId,
          folio: folio,
          total: total
        }
      }

    } catch (error) {
      await connection.rollback()
      console.error('Error al crear compra:', error)
      return {
        success: false,
        message: 'Error al registrar compra',
        error: error instanceof Error ? error.message : 'Error desconocido'
      }
    }
  },

  /**
   * Obtener todas las compras con filtros
   */
  async getAll(filtros: {
    fecha_inicio?: string
    fecha_fin?: string
    proveedor_id?: number
    usuario_id?: number
    estado?: string
    page?: number
    limit?: number
  } = {}) {
    try {
      const connection = await getConnection()
      const {
        fecha_inicio,
        fecha_fin,
        proveedor_id,
        usuario_id,
        estado = 'completada',
        page = 1,
        limit = 50
      } = filtros

      const offset = (page - 1) * limit
      let whereConditions = ['c.estado = ?']
      const params: any[] = [estado]

      if (fecha_inicio) {
        whereConditions.push('DATE(c.fecha) >= ?')
        params.push(fecha_inicio)
      }

      if (fecha_fin) {
        whereConditions.push('DATE(c.fecha) <= ?')
        params.push(fecha_fin)
      }

      if (proveedor_id) {
        whereConditions.push('c.proveedor_id = ?')
        params.push(proveedor_id)
      }

      if (usuario_id) {
        whereConditions.push('c.usuario_id = ?')
        params.push(usuario_id)
      }

      const whereClause = `WHERE ${whereConditions.join(' AND ')}`

      const query = `
        SELECT 
          c.*,
          p.nombre as proveedor_nombre,
          u.nombre as usuario_nombre,
          a.nombre as almacen_nombre
        FROM compras c
        INNER JOIN proveedores p ON c.proveedor_id = p.id
        INNER JOIN usuarios u ON c.usuario_id = u.id
        LEFT JOIN almacenes a ON c.almacen_id = a.id
        ${whereClause}
        ORDER BY c.fecha DESC
        LIMIT ? OFFSET ?
      `

      const countQuery = `
        SELECT COUNT(*) as total
        FROM compras c
        ${whereClause}
      `

      const [compras] = await connection.execute<RowDataPacket[]>(
        query,
        [...params, limit, offset]
      )

      const [countResult] = await connection.execute<RowDataPacket[]>(
        countQuery,
        params
      )

      return {
        success: true,
        data: compras,
        pagination: {
          page,
          limit,
          total: countResult[0].total,
          totalPages: Math.ceil(countResult[0].total / limit)
        }
      }
    } catch (error) {
      console.error('Error al obtener compras:', error)
      return {
        success: false,
        message: 'Error al obtener compras',
        error: error instanceof Error ? error.message : 'Error desconocido'
      }
    }
  },

  /**
   * Obtener compra por ID con detalles
   */
  async getById(data: { id: number }) {
    try {
      const connection = await getConnection()

      // Obtener compra
      const [compra] = await connection.execute<RowDataPacket[]>(
        `SELECT 
          c.*,
          p.nombre as proveedor_nombre,
          p.telefono as proveedor_telefono,
          p.email as proveedor_email,
          u.nombre as usuario_nombre,
          a.nombre as almacen_nombre
        FROM compras c
        INNER JOIN proveedores p ON c.proveedor_id = p.id
        INNER JOIN usuarios u ON c.usuario_id = u.id
        LEFT JOIN almacenes a ON c.almacen_id = a.id
        WHERE c.id = ?`,
        [data.id]
      )

      if (compra.length === 0) {
        return {
          success: false,
          message: 'Compra no encontrada'
        }
      }

      // Obtener detalles
      const [detalles] = await connection.execute<RowDataPacket[]>(
        `SELECT 
          dc.*,
          p.codigo,
          p.nombre as producto_nombre,
          p.codigo_barras,
          um.abreviatura as unidad_medida
        FROM detalle_compras dc
        INNER JOIN productos p ON dc.producto_id = p.id
        LEFT JOIN unidades_medida um ON p.unidad_medida_id = um.id
        WHERE dc.compra_id = ?
        ORDER BY dc.id`,
        [data.id]
      )

      return {
        success: true,
        data: {
          ...compra[0],
          detalles
        }
      }
    } catch (error) {
      console.error('Error al obtener compra:', error)
      return {
        success: false,
        message: 'Error al obtener compra',
        error: error instanceof Error ? error.message : 'Error desconocido'
      }
    }
  },

  /**
   * Cancelar compra
   */
  async cancelar(data: { id: number; usuario_id: number; motivo?: string }) {
    const connection = await getConnection()

    try {
      await connection.beginTransaction()

      // Obtener compra
      const [compra] = await connection.execute<RowDataPacket[]>(
        'SELECT * FROM compras WHERE id = ? AND estado = "completada"',
        [data.id]
      )

      if (compra.length === 0) {
        await connection.rollback()
        return {
          success: false,
          message: 'Compra no encontrada o ya está cancelada'
        }
      }

      // Obtener detalles para devolver stock
      const [detalles] = await connection.execute<RowDataPacket[]>(
        'SELECT producto_id, cantidad FROM detalle_compras WHERE compra_id = ?',
        [data.id]
      )

      // Restar stock a productos
      for (const detalle of detalles) {
        const [producto] = await connection.execute<RowDataPacket[]>(
          'SELECT stock_actual FROM productos WHERE id = ?',
          [detalle.producto_id]
        )

        const stockAnterior = producto[0].stock_actual
        const stockNuevo = stockAnterior - detalle.cantidad

        if (stockNuevo < 0) {
          await connection.rollback()
          return {
            success: false,
            message: `No hay suficiente stock para cancelar la compra del producto ID ${detalle.producto_id}`
          }
        }

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
            'salida',
            detalle.cantidad,
            stockAnterior,
            stockNuevo,
            'cancelacion_compra',
            data.id,
            data.motivo || 'Cancelación de compra',
            data.usuario_id
          ]
        )
      }

      // Actualizar estado de compra
      await connection.execute(
        'UPDATE compras SET estado = "cancelada", notas = CONCAT(COALESCE(notas, ""), "\n", ?) WHERE id = ?',
        [`Cancelada: ${data.motivo || 'Sin motivo especificado'}`, data.id]
      )

      // Registrar en logs
      await connection.execute(
        `INSERT INTO logs (usuario_id, accion, modulo, descripcion) 
         VALUES (?, ?, ?, ?)`,
        [
          data.usuario_id,
          'cancelar',
          'compras',
          `Compra cancelada: ${compra[0].folio} - Motivo: ${data.motivo || 'No especificado'}`
        ]
      )

      await connection.commit()

      return {
        success: true,
        message: 'Compra cancelada correctamente'
      }

    } catch (error) {
      await connection.rollback()
      console.error('Error al cancelar compra:', error)
      return {
        success: false,
        message: 'Error al cancelar compra',
        error: error instanceof Error ? error.message : 'Error desconocido'
      }
    }
  }
}