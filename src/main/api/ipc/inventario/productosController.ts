// src/main/api/ipc/inventario/productosController.ts

import { RowDataPacket, ResultSetHeader } from 'mysql2'
import { getConnection } from '../../db/connection'

interface Producto {
  id?: number
  codigo: string
  codigo_barras?: string
  nombre: string
  descripcion?: string
  categoria_id?: number
  unidad_medida_id?: number
  proveedor_id?: number
  precio_compra?: number
  precio_venta: number
  stock_minimo?: number
  stock_actual?: number
  imagen_url?: string
  activo?: boolean
}

interface FiltrosProducto {
  busqueda?: string
  categoria_id?: number
  proveedor_id?: number
  activo?: boolean
  stock_bajo?: boolean
  page?: number
  limit?: number
}

export const productosController = {
  /**
   * Obtener todos los productos con filtros y paginación
   */
  async getAll(filtros: FiltrosProducto = {}) {
    try {
      const connection = await getConnection()
      const {
        busqueda = '',
        categoria_id,
        proveedor_id,
        activo = true,
        stock_bajo = false,
        page = 1,
        limit = 50
      } = filtros

      const offset = (page - 1) * limit
      let whereConditions = ['p.eliminado_en IS NULL']
      const params: any[] = []

      if (activo !== undefined) {
        whereConditions.push('p.activo = ?')
        params.push(activo)
      }

      if (busqueda) {
        whereConditions.push('(p.codigo LIKE ? OR p.nombre LIKE ? OR p.codigo_barras LIKE ?)')
        const searchTerm = `%${busqueda}%`
        params.push(searchTerm, searchTerm, searchTerm)
      }

      if (categoria_id) {
        whereConditions.push('p.categoria_id = ?')
        params.push(categoria_id)
      }

      if (proveedor_id) {
        whereConditions.push('p.proveedor_id = ?')
        params.push(proveedor_id)
      }

      if (stock_bajo) {
        whereConditions.push('p.stock_actual <= p.stock_minimo')
      }

      const whereClause = whereConditions.length > 0 
        ? `WHERE ${whereConditions.join(' AND ')}` 
        : ''

      // Consulta principal
      const query = `
        SELECT 
          p.*,
          c.nombre as categoria_nombre,
          um.nombre as unidad_medida_nombre,
          um.abreviatura as unidad_medida_abreviatura,
          prov.nombre as proveedor_nombre
        FROM productos p
        LEFT JOIN categorias c ON p.categoria_id = c.id
        LEFT JOIN unidades_medida um ON p.unidad_medida_id = um.id
        LEFT JOIN proveedores prov ON p.proveedor_id = prov.id
        ${whereClause}
        ORDER BY p.nombre ASC
        LIMIT ? OFFSET ?
      `

      // Consulta de conteo
      const countQuery = `
        SELECT COUNT(*) as total
        FROM productos p
        ${whereClause}
      `

      const [productos] = await connection.execute<RowDataPacket[]>(
        query,
        [...params, limit, offset]
      )

      const [countResult] = await connection.execute<RowDataPacket[]>(
        countQuery,
        params
      )

      const total = countResult[0].total

      return {
        success: true,
        data: productos,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    } catch (error) {
      console.error('Error al obtener productos:', error)
      return {
        success: false,
        message: 'Error al obtener productos',
        error: error instanceof Error ? error.message : 'Error desconocido'
      }
    }
  },

  /**
   * Obtener producto por ID
   */
  async getById(data: { id: number }) {
    try {
      const connection = await getConnection()
      const query = `
        SELECT 
          p.*,
          c.nombre as categoria_nombre,
          um.nombre as unidad_medida_nombre,
          um.abreviatura as unidad_medida_abreviatura,
          prov.nombre as proveedor_nombre,
          prov.telefono as proveedor_telefono,
          prov.email as proveedor_email
        FROM productos p
        LEFT JOIN categorias c ON p.categoria_id = c.id
        LEFT JOIN unidades_medida um ON p.unidad_medida_id = um.id
        LEFT JOIN proveedores prov ON p.proveedor_id = prov.id
        WHERE p.id = ? AND p.eliminado_en IS NULL
      `

      const [rows] = await connection.execute<RowDataPacket[]>(query, [data.id])

      if (rows.length === 0) {
        return {
          success: false,
          message: 'Producto no encontrado'
        }
      }

      return {
        success: true,
        data: rows[0]
      }
    } catch (error) {
      console.error('Error al obtener producto:', error)
      return {
        success: false,
        message: 'Error al obtener producto',
        error: error instanceof Error ? error.message : 'Error desconocido'
      }
    }
  },

  /**
   * Buscar producto por código o código de barras
   */
  async buscarPorCodigo(data: { codigo: string }) {
    try {
      const connection = await getConnection()
      const query = `
        SELECT 
          p.*,
          c.nombre as categoria_nombre,
          um.nombre as unidad_medida_nombre,
          um.abreviatura as unidad_medida_abreviatura
        FROM productos p
        LEFT JOIN categorias c ON p.categoria_id = c.id
        LEFT JOIN unidades_medida um ON p.unidad_medida_id = um.id
        WHERE (p.codigo = ? OR p.codigo_barras = ?) 
          AND p.activo = true 
          AND p.eliminado_en IS NULL
      `

      const [rows] = await connection.execute<RowDataPacket[]>(
        query,
        [data.codigo, data.codigo]
      )

      if (rows.length === 0) {
        return {
          success: false,
          message: 'Producto no encontrado'
        }
      }

      return {
        success: true,
        data: rows[0]
      }
    } catch (error) {
      console.error('Error al buscar producto:', error)
      return {
        success: false,
        message: 'Error al buscar producto',
        error: error instanceof Error ? error.message : 'Error desconocido'
      }
    }
  },

  /**
   * Crear nuevo producto
   */
  async create(data: Producto & { usuario_id: number }) {
    try {
      const connection = await getConnection()

      // Verificar si el código ya existe
      const [existing] = await connection.execute<RowDataPacket[]>(
        'SELECT id FROM productos WHERE codigo = ? AND eliminado_en IS NULL',
        [data.codigo]
      )

      if (existing.length > 0) {
        return {
          success: false,
          message: 'Ya existe un producto con ese código'
        }
      }

      const query = `
        INSERT INTO productos (
          codigo, codigo_barras, nombre, descripcion,
          categoria_id, unidad_medida_id, proveedor_id,
          precio_compra, precio_venta, stock_minimo,
          stock_actual, imagen_url, activo
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `

      const [result] = await connection.execute<ResultSetHeader>(query, [
        data.codigo,
        data.codigo_barras || null,
        data.nombre,
        data.descripcion || null,
        data.categoria_id || null,
        data.unidad_medida_id || null,
        data.proveedor_id || null,
        data.precio_compra || 0,
        data.precio_venta,
        data.stock_minimo || 0,
        data.stock_actual || 0,
        data.imagen_url || null,
        data.activo !== undefined ? data.activo : true
      ])

      // Registrar en logs
      await connection.execute(
        `INSERT INTO logs (usuario_id, accion, modulo, descripcion) 
         VALUES (?, ?, ?, ?)`,
        [
          data.usuario_id,
          'crear',
          'productos',
          `Producto creado: ${data.nombre} (${data.codigo})`
        ]
      )

      return {
        success: true,
        message: 'Producto creado correctamente',
        data: { id: result.insertId }
      }
    } catch (error) {
      console.error('Error al crear producto:', error)
      return {
        success: false,
        message: 'Error al crear producto',
        error: error instanceof Error ? error.message : 'Error desconocido'
      }
    }
  },

  /**
   * Actualizar producto
   */
  async update(data: Producto & { usuario_id: number }) {
    try {
      const connection = await getConnection()

      // Verificar si el código ya existe en otro producto
      const [existing] = await connection.execute<RowDataPacket[]>(
        'SELECT id FROM productos WHERE codigo = ? AND id != ? AND eliminado_en IS NULL',
        [data.codigo, data.id]
      )

      if (existing.length > 0) {
        return {
          success: false,
          message: 'Ya existe otro producto con ese código'
        }
      }

      const query = `
        UPDATE productos SET
          codigo = ?,
          codigo_barras = ?,
          nombre = ?,
          descripcion = ?,
          categoria_id = ?,
          unidad_medida_id = ?,
          proveedor_id = ?,
          precio_compra = ?,
          precio_venta = ?,
          stock_minimo = ?,
          imagen_url = ?,
          activo = ?
        WHERE id = ? AND eliminado_en IS NULL
      `

      await connection.execute(query, [
        data.codigo,
        data.codigo_barras || null,
        data.nombre,
        data.descripcion || null,
        data.categoria_id || null,
        data.unidad_medida_id || null,
        data.proveedor_id || null,
        data.precio_compra || 0,
        data.precio_venta,
        data.stock_minimo || 0,
        data.imagen_url || null,
        data.activo !== undefined ? data.activo : true,
        data.id
      ])

      // Registrar en logs
      await connection.execute(
        `INSERT INTO logs (usuario_id, accion, modulo, descripcion) 
         VALUES (?, ?, ?, ?)`,
        [
          data.usuario_id,
          'actualizar',
          'productos',
          `Producto actualizado: ${data.nombre} (${data.codigo})`
        ]
      )

      return {
        success: true,
        message: 'Producto actualizado correctamente'
      }
    } catch (error) {
      console.error('Error al actualizar producto:', error)
      return {
        success: false,
        message: 'Error al actualizar producto',
        error: error instanceof Error ? error.message : 'Error desconocido'
      }
    }
  },

  /**
   * Eliminar producto (soft delete)
   */
  async delete(data: { id: number; usuario_id: number }) {
    try {
      const connection = await getConnection()

      // Obtener info del producto antes de eliminar
      const [producto] = await connection.execute<RowDataPacket[]>(
        'SELECT nombre, codigo FROM productos WHERE id = ?',
        [data.id]
      )

      if (producto.length === 0) {
        return {
          success: false,
          message: 'Producto no encontrado'
        }
      }

      await connection.execute(
        'UPDATE productos SET eliminado_en = NOW() WHERE id = ?',
        [data.id]
      )

      // Registrar en logs
      await connection.execute(
        `INSERT INTO logs (usuario_id, accion, modulo, descripcion) 
         VALUES (?, ?, ?, ?)`,
        [
          data.usuario_id,
          'eliminar',
          'productos',
          `Producto eliminado: ${producto[0].nombre} (${producto[0].codigo})`
        ]
      )

      return {
        success: true,
        message: 'Producto eliminado correctamente'
      }
    } catch (error) {
      console.error('Error al eliminar producto:', error)
      return {
        success: false,
        message: 'Error al eliminar producto',
        error: error instanceof Error ? error.message : 'Error desconocido'
      }
    }
  },

  /**
   * Obtener productos con stock bajo
   */
  async getStockBajo() {
    try {
      const connection = await getConnection()
      const query = `
        SELECT 
          p.*,
          c.nombre as categoria_nombre,
          um.abreviatura as unidad_medida
        FROM productos p
        LEFT JOIN categorias c ON p.categoria_id = c.id
        LEFT JOIN unidades_medida um ON p.unidad_medida_id = um.id
        WHERE p.stock_actual <= p.stock_minimo 
          AND p.activo = true 
          AND p.eliminado_en IS NULL
        ORDER BY (p.stock_minimo - p.stock_actual) DESC
      `

      const [rows] = await connection.execute<RowDataPacket[]>(query)

      return {
        success: true,
        data: rows,
        total: rows.length
      }
    } catch (error) {
      console.error('Error al obtener productos con stock bajo:', error)
      return {
        success: false,
        message: 'Error al obtener productos con stock bajo',
        error: error instanceof Error ? error.message : 'Error desconocido'
      }
    }
  }
}