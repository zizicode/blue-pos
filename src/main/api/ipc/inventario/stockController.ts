// src/main/api/ipc/inventario/stockController.ts

import { RowDataPacket } from 'mysql2'
import { getConnection } from '../../db/connection'

export const stockController = {
  /**
   * Obtener stock por almacén
   */
  async getPorAlmacen(data: { almacen_id: number; producto_id?: number }) {
    try {
      const connection = await getConnection()

      let whereConditions = ['sa.almacen_id = ?']
      const params: any[] = [data.almacen_id]

      if (data.producto_id) {
        whereConditions.push('sa.producto_id = ?')
        params.push(data.producto_id)
      }

      const whereClause = `WHERE ${whereConditions.join(' AND ')}`

      const query = `
        SELECT 
          sa.*,
          p.codigo,
          p.nombre as producto_nombre,
          p.stock_minimo,
          um.abreviatura as unidad
        FROM stock_almacen sa
        INNER JOIN productos p ON sa.producto_id = p.id
        LEFT JOIN unidades_medida um ON p.unidad_medida_id = um.id
        ${whereClause}
        ORDER BY p.nombre ASC
      `

      const [stock] = await connection.execute<RowDataPacket[]>(query, params)

      return {
        success: true,
        data: stock
      }
    } catch (error) {
      return {
        success: false,
        message: 'Error al obtener stock',
        error: error instanceof Error ? error.message : 'Error desconocido'
      }
    }
  },

  /**
   * Ajustar stock manualmente
   */
  async ajustar(data: {
    producto_id: number
    almacen_id?: number
    cantidad: number
    tipo: 'ajuste_positivo' | 'ajuste_negativo'
    motivo: string
    usuario_id: number
  }) {
    const pool = await getConnection();
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction()



      // Obtener stock actual
      const [producto] = await connection.execute<RowDataPacket[]>(
        'SELECT stock_actual, nombre FROM productos WHERE id = ?',
        [data.producto_id]
      )

      if (producto.length === 0) {
        await connection.rollback()
        return {
          success: false,
          message: 'Producto no encontrado'
        }
      }

      const stockAnterior = producto[0].stock_actual
      const cantidadAjuste = data.tipo === 'ajuste_positivo' ? data.cantidad : -data.cantidad
      const stockNuevo = stockAnterior + cantidadAjuste

      if (stockNuevo < 0) {
        await connection.rollback()
        return {
          success: false,
          message: 'El ajuste resultaría en stock negativo'
        }
      }

      // Actualizar stock del producto
      await connection.execute(
        'UPDATE productos SET stock_actual = ? WHERE id = ?',
        [stockNuevo, data.producto_id]
      )

      // Registrar movimiento de inventario
      await connection.execute(
        `INSERT INTO movimientos_inventario (
          producto_id, almacen_id, tipo, cantidad, 
          stock_anterior, stock_nuevo, referencia_tipo, 
          motivo, usuario_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          data.producto_id,
          data.almacen_id || null,
          data.tipo === 'ajuste_positivo' ? 'entrada' : 'salida',
          Math.abs(cantidadAjuste),
          stockAnterior,
          stockNuevo,
          'ajuste',
          data.motivo,
          data.usuario_id
        ]
      )

      // Actualizar stock por almacén si se especificó
      if (data.almacen_id) {
        const [stockAlmacen] = await connection.execute<RowDataPacket[]>(
          'SELECT cantidad FROM stock_almacen WHERE producto_id = ? AND almacen_id = ?',
          [data.producto_id, data.almacen_id]
        )

        if (stockAlmacen.length > 0) {
          await connection.execute(
            'UPDATE stock_almacen SET cantidad = cantidad + ? WHERE producto_id = ? AND almacen_id = ?',
            [cantidadAjuste, data.producto_id, data.almacen_id]
          )
        } else {
          await connection.execute(
            'INSERT INTO stock_almacen (producto_id, almacen_id, cantidad) VALUES (?, ?, ?)',
            [data.producto_id, data.almacen_id, Math.max(0, cantidadAjuste)]
          )
        }
      }

      // Registrar en logs
      await connection.execute(
        'INSERT INTO logs (usuario_id, accion, modulo, descripcion) VALUES (?, ?, ?, ?)',
        [
          data.usuario_id,
          'ajuste_stock',
          'inventario',
          `Ajuste de stock: ${producto[0].nombre} - ${data.motivo}`
        ]
      )

      await connection.commit()

      return {
        success: true,
        message: 'Stock ajustado correctamente',
        data: {
          stock_anterior: stockAnterior,
          stock_nuevo: stockNuevo
        }
      }
    } catch (error) {
      await connection.rollback();
      return { success: false, message: 'Error al ajustar stock', error: error instanceof Error ? error.message : 'Error desconocido' };
    } finally {
      connection.release();
    }
  }
}


