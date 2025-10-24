import { RowDataPacket } from 'mysql2'
import { getConnection } from '../../db/connection'

// ============================================
// src/main/api/ipc/auth/permisosController.ts
// ============================================

export const permisosController = {
  async getAll() {
    try {
      const connection = await getConnection()
      const [rows] = await connection.execute<RowDataPacket[]>(
        `SELECT * FROM permisos
         ORDER BY FIELD(modulo,
          'Ventas',
          'Caja',
          'Productos',
          'Inventario',
          'Clientes',
          'Proveedores',
          'Compras',
          'Cuentas',
          'Reportes',
          'Usuarios',
          'Configuracion',
          'Logs'
         ), accion ASC`
      )
      return { success: true, data: rows }
    } catch (error) {
      return {
        success: false,
        message: 'Error al obtener permisos',
        error: error instanceof Error ? error.message : 'Error desconocido'
      }
    }
  },
  
  
    async getPorModulo() {
      try {
        const connection = await getConnection()
        const [rows] = await connection.execute<RowDataPacket[]>(
          'SELECT modulo, COUNT(*) as total FROM permisos GROUP BY modulo ORDER BY modulo ASC'
        )
        return { success: true, data: rows }
      } catch (error) {
        return {
          success: false,
          message: 'Error al obtener permisos por módulo',
          error: error instanceof Error ? error.message : 'Error desconocido'
        }
      }
    },
  
    async verificarPermiso(data: {
      usuario_id: number
      modulo: string
      accion: string
    }) {
      try {
        const connection = await getConnection()
        
        const [result] = await connection.execute<RowDataPacket[]>(
          `SELECT COUNT(*) as tiene_permiso
           FROM usuarios u
           INNER JOIN roles_permisos rp ON u.rol_id = rp.rol_id
           INNER JOIN permisos p ON rp.permiso_id = p.id
           WHERE u.id = ? AND p.modulo = ? AND p.accion = ?`,
          [data.usuario_id, data.modulo, data.accion]
        )
  
        return {
          success: true,
          data: {
            tiene_permiso: result[0].tiene_permiso > 0
          }
        }
      } catch (error) {
        return {
          success: false,
          message: 'Error al verificar permiso',
          error: error instanceof Error ? error.message : 'Error desconocido'
        }
      }
    }
  }
  