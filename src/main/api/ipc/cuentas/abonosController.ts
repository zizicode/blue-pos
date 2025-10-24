import { RowDataPacket } from 'mysql2'
import { getConnection } from '../../db/connection'

// ============================================
// src/main/api/ipc/cuentas/abonosController.ts
// ============================================

export const abonosController = {
    /**
     * Registrar abono a cuenta
     */
    async create(data: {
      cuenta_id: number
      monto: number
      metodo_pago_id: number
      referencia?: string
      usuario_id: number
    }) {
      const connection = await getConnection()
  
      try {
        await connection.beginTransaction()
  
        // Obtener información de la cuenta
        const [cuenta] = await connection.execute<RowDataPacket[]>(
          `SELECT cpc.*, c.nombre as cliente_nombre, v.folio 
           FROM cuentas_por_cobrar cpc
           INNER JOIN clientes c ON cpc.cliente_id = c.id
           INNER JOIN ventas v ON cpc.venta_id = v.id
           WHERE cpc.id = ?`,
          [data.cuenta_id]
        )
  
        if (cuenta.length === 0) {
          await connection.rollback()
          return {
            success: false,
            message: 'Cuenta por cobrar no encontrada'
          }
        }
  
        if (cuenta[0].estado === 'pagada') {
          await connection.rollback()
          return {
            success: false,
            message: 'Esta cuenta ya está pagada completamente'
          }
        }
  
        if (data.monto > cuenta[0].saldo_pendiente) {
          await connection.rollback()
          return {
            success: false,
            message: `El monto del abono (${data.monto.toFixed(2)}) es mayor que el saldo pendiente (${cuenta[0].saldo_pendiente.toFixed(2)})`
          }
        }
  
        // Registrar abono
        await connection.execute(
          `INSERT INTO abonos_credito (
            cuenta_id, monto, metodo_pago_id, referencia, usuario_id
          ) VALUES (?, ?, ?, ?, ?)`,
          [
            data.cuenta_id,
            data.monto,
            data.metodo_pago_id,
            data.referencia || null,
            data.usuario_id
          ]
        )
  
        // Actualizar cuenta por cobrar
        const nuevoSaldo = cuenta[0].saldo_pendiente - data.monto
        const montoPagado = cuenta[0].monto_pagado + data.monto
        const nuevoEstado = nuevoSaldo <= 0 ? 'pagada' : cuenta[0].estado
  
        await connection.execute(
          `UPDATE cuentas_por_cobrar 
           SET monto_pagado = ?, saldo_pendiente = ?, estado = ?
           WHERE id = ?`,
          [montoPagado, nuevoSaldo, nuevoEstado, data.cuenta_id]
        )
  
        // Actualizar saldo del cliente
        await connection.execute(
          'UPDATE clientes SET saldo_actual = saldo_actual - ? WHERE id = ?',
          [data.monto, cuenta[0].cliente_id]
        )
  
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
              turno_id, tipo, monto, metodo_pago_id,
              referencia_tipo, referencia_id, concepto
            ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              turnoAbierto[0].id,
              'abono',
              data.monto,
              data.metodo_pago_id,
              'cuenta_por_cobrar',
              data.cuenta_id,
              `Abono de ${cuenta[0].cliente_nombre} - ${cuenta[0].folio}`
            ]
          )
        }
  
        // Registrar en logs
        await connection.execute(
          `INSERT INTO logs (usuario_id, accion, modulo, descripcion) 
           VALUES (?, ?, ?, ?)`,
          [
            data.usuario_id,
            'abono',
            'cuentas_por_cobrar',
            `Abono registrado: ${cuenta[0].cliente_nombre} - ${cuenta[0].folio} - ${data.monto.toFixed(2)}`
          ]
        )
  
        await connection.commit()
  
        return {
          success: true,
          message: 'Abono registrado correctamente',
          data: {
            nuevo_saldo: nuevoSaldo,
            estado: nuevoEstado
          }
        }
  
      } catch (error) {
        await connection.rollback()
        console.error('Error al registrar abono:', error)
        return {
          success: false,
          message: 'Error al registrar abono',
          error: error instanceof Error ? error.message : 'Error desconocido'
        }
      }
    },
  
    /**
     * Obtener historial de abonos
     */
    async getHistorial(filtros: {
      cliente_id?: number
      fecha_inicio?: string
      fecha_fin?: string
      usuario_id?: number
      page?: number
      limit?: number
    } = {}) {
      try {
        const connection = await getConnection()
        const {
          cliente_id,
          fecha_inicio,
          fecha_fin,
          usuario_id,
          page = 1,
          limit = 50
        } = filtros
  
        const offset = (page - 1) * limit
        let whereConditions: string[] = []
        const params: any[] = []
  
        if (cliente_id) {
          whereConditions.push('cpc.cliente_id = ?')
          params.push(cliente_id)
        }
  
        if (fecha_inicio) {
          whereConditions.push('DATE(ac.fecha) >= ?')
          params.push(fecha_inicio)
        }
  
        if (fecha_fin) {
          whereConditions.push('DATE(ac.fecha) <= ?')
          params.push(fecha_fin)
        }
  
        if (usuario_id) {
          whereConditions.push('ac.usuario_id = ?')
          params.push(usuario_id)
        }
  
        const whereClause = whereConditions.length > 0 
          ? `WHERE ${whereConditions.join(' AND ')}` 
          : ''
  
        const query = `
          SELECT 
            ac.*,
            cpc.monto_total,
            cpc.saldo_pendiente,
            c.nombre as cliente_nombre,
            v.folio as venta_folio,
            mp.nombre as metodo_pago_nombre,
            u.nombre as usuario_nombre
          FROM abonos_credito ac
          INNER JOIN cuentas_por_cobrar cpc ON ac.cuenta_id = cpc.id
          INNER JOIN clientes c ON cpc.cliente_id = c.id
          INNER JOIN ventas v ON cpc.venta_id = v.id
          INNER JOIN metodos_pago mp ON ac.metodo_pago_id = mp.id
          INNER JOIN usuarios u ON ac.usuario_id = u.id
          ${whereClause}
          ORDER BY ac.fecha DESC
          LIMIT ? OFFSET ?
        `
  
        const countQuery = `
          SELECT COUNT(*) as total
          FROM abonos_credito ac
          INNER JOIN cuentas_por_cobrar cpc ON ac.cuenta_id = cpc.id
          ${whereClause}
        `
  
        const [abonos] = await connection.execute<RowDataPacket[]>(
          query,
          [...params, limit, offset]
        )
  
        const [countResult] = await connection.execute<RowDataPacket[]>(
          countQuery,
          params
        )
  
        return {
          success: true,
          data: abonos,
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
          message: 'Error al obtener historial de abonos',
          error: error instanceof Error ? error.message : 'Error desconocido'
        }
      }
    },
  
    /**
     * Obtener resumen de abonos por periodo
     */
    async getResumenPeriodo(data: {
      fecha_inicio: string
      fecha_fin: string
      usuario_id?: number
    }) {
      try {
        const connection = await getConnection()
  
        let whereClause = 'WHERE DATE(ac.fecha) BETWEEN ? AND ?'
        const params: any[] = [data.fecha_inicio, data.fecha_fin]
  
        if (data.usuario_id) {
          whereClause += ' AND ac.usuario_id = ?'
          params.push(data.usuario_id)
        }
  
        const query = `
          SELECT 
            COUNT(*) as total_abonos,
            SUM(ac.monto) as monto_total,
            mp.nombre as metodo_pago,
            COUNT(DISTINCT cpc.cliente_id) as clientes_distintos
          FROM abonos_credito ac
          INNER JOIN cuentas_por_cobrar cpc ON ac.cuenta_id = cpc.id
          INNER JOIN metodos_pago mp ON ac.metodo_pago_id = mp.id
          ${whereClause}
          GROUP BY ac.metodo_pago_id, mp.nombre
        `
  
        const [resumen] = await connection.execute<RowDataPacket[]>(query, params)
  
        // Total general
        const [total] = await connection.execute<RowDataPacket[]>(
          `SELECT 
            COUNT(*) as total_abonos,
            SUM(monto) as monto_total
          FROM abonos_credito ac
          ${whereClause}`,
          params
        )
  
        return {
          success: true,
          data: {
            por_metodo: resumen,
            total: total[0]
          }
        }
      } catch (error) {
        return {
          success: false,
          message: 'Error al obtener resumen',
          error: error instanceof Error ? error.message : 'Error desconocido'
        }
      }
    }
  }