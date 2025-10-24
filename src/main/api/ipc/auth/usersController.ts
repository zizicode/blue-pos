import { RowDataPacket, ResultSetHeader } from 'mysql2'
import { getConnection } from '../../db/connection'
import bcrypt from 'bcrypt'


// ============================================
// src/main/api/ipc/auth/usersController.ts
// ============================================

interface Usuario {
    id?: number
    nombre: string
    email?: string
    usuario: string
    password?: string
    rol_id: number
    activo?: boolean
  }
  
  export const usersController = {
    /**
     * Obtener todos los usuarios
     */
    async getAll(filtros: {
      busqueda?: string
      rol_id?: number
      activo?: boolean
      page?: number
      limit?: number
    } = {}) {
      try {
        const connection = await getConnection()
        const {
          busqueda = '',
          rol_id,
          activo = true,
          page = 1,
          limit = 50
        } = filtros
  
        const offset = (page - 1) * limit
        let whereConditions = ['u.eliminado_en IS NULL']
        const params: any[] = []
  
        if (activo !== undefined) {
          whereConditions.push('u.activo = ?')
          params.push(activo)
        }
  
        if (busqueda) {
          whereConditions.push('(u.nombre LIKE ? OR u.email LIKE ? OR u.usuario LIKE ?)')
          const searchTerm = `%${busqueda}%`
          params.push(searchTerm, searchTerm, searchTerm)
        }
  
        if (rol_id) {
          whereConditions.push('u.rol_id = ?')
          params.push(rol_id)
        }
  
        const whereClause = `WHERE ${whereConditions.join(' AND ')}`
  
        const query = `
          SELECT 
            u.id, u.nombre, u.email, u.usuario, u.rol_id, 
            u.activo, u.ultimo_acceso, u.creado_en,
            r.nombre as rol_nombre
          FROM usuarios u
          INNER JOIN roles r ON u.rol_id = r.id
          ${whereClause}
          ORDER BY u.nombre ASC
          LIMIT ? OFFSET ?
        `
  
        const countQuery = `
          SELECT COUNT(*) as total
          FROM usuarios u
          ${whereClause}
        `
  
        const [usuarios] = await connection.execute<RowDataPacket[]>(
          query,
          [...params, limit, offset]
        )
  
        const [countResult] = await connection.execute<RowDataPacket[]>(
          countQuery,
          params
        )
  
        return {
          success: true,
          data: usuarios,
          pagination: {
            page,
            limit,
            total: countResult[0].total,
            totalPages: Math.ceil(countResult[0].total / limit)
          }
        }
  
      } catch (error) {
        console.error('Error al obtener usuarios:', error)
        return {
          success: false,
          message: 'Error al obtener usuarios',
          error: error instanceof Error ? error.message : 'Error desconocido'
        }
      }
    },
  
    /**
     * Obtener usuario por ID
     */
    async getById(data: { id: number }) {
      try {
        const connection = await getConnection()
  
        const [rows] = await connection.execute<RowDataPacket[]>(
          `SELECT 
            u.id, u.nombre, u.email, u.usuario, u.rol_id, 
            u.activo, u.ultimo_acceso, u.creado_en,
            r.nombre as rol_nombre,
            r.descripcion as rol_descripcion
          FROM usuarios u
          INNER JOIN roles r ON u.rol_id = r.id
          WHERE u.id = ? AND u.eliminado_en IS NULL`,
          [data.id]
        )
  
        if (rows.length === 0) {
          return {
            success: false,
            message: 'Usuario no encontrado'
          }
        }
  
        return {
          success: true,
          data: rows[0]
        }
  
      } catch (error) {
        console.error('Error al obtener usuario:', error)
        return {
          success: false,
          message: 'Error al obtener usuario',
          error: error instanceof Error ? error.message : 'Error desconocido'
        }
      }
    },
  
    /**
     * Crear nuevo usuario
     */
    async create(data: Usuario & { usuario_creador_id: number }) {
      try {
        const connection = await getConnection()
  
        // Verificar si el usuario o email ya existen
        const [existing] = await connection.execute<RowDataPacket[]>(
          'SELECT id FROM usuarios WHERE (usuario = ? OR email = ?) AND eliminado_en IS NULL',
          [data.usuario, data.email || null]
        )
  
        if (existing.length > 0) {
          return {
            success: false,
            message: 'El usuario o email ya están registrados'
          }
        }
  
        // Hashear contraseña
        const hashedPassword = await bcrypt.hash(data.password || 'password123', 10)
  
        const [result] = await connection.execute<ResultSetHeader>(
          `INSERT INTO usuarios (
            nombre, email, usuario, password, rol_id, activo
          ) VALUES (?, ?, ?, ?, ?, ?)`,
          [
            data.nombre,
            data.email || null,
            data.usuario,
            hashedPassword,
            data.rol_id,
            data.activo !== undefined ? data.activo : true
          ]
        )
  
        // Registrar en logs
        await connection.execute(
          `INSERT INTO logs (usuario_id, accion, modulo, descripcion) 
           VALUES (?, ?, ?, ?)`,
          [
            data.usuario_creador_id,
            'crear',
            'usuarios',
            `Usuario creado: ${data.nombre} (${data.usuario})`
          ]
        )
  
        return {
          success: true,
          message: 'Usuario creado correctamente',
          data: { id: result.insertId }
        }
  
      } catch (error) {
        console.error('Error al crear usuario:', error)
        return {
          success: false,
          message: 'Error al crear usuario',
          error: error instanceof Error ? error.message : 'Error desconocido'
        }
      }
    },
  
    /**
     * Actualizar usuario
     */
    async update(data: Usuario & { usuario_actualizador_id: number }) {
      try {
        const connection = await getConnection()
  
        // Verificar si otro usuario tiene ese username o email
        const [existing] = await connection.execute<RowDataPacket[]>(
          'SELECT id FROM usuarios WHERE (usuario = ? OR email = ?) AND id != ? AND eliminado_en IS NULL',
          [data.usuario, data.email || null, data.id]
        )
  
        if (existing.length > 0) {
          return {
            success: false,
            message: 'El usuario o email ya están en uso por otro usuario'
          }
        }
  
        await connection.execute(
          `UPDATE usuarios SET
            nombre = ?,
            email = ?,
            usuario = ?,
            rol_id = ?,
            activo = ?
          WHERE id = ? AND eliminado_en IS NULL`,
          [
            data.nombre,
            data.email || null,
            data.usuario,
            data.rol_id,
            data.activo !== undefined ? data.activo : true,
            data.id
          ]
        )
  
        // Registrar en logs
        await connection.execute(
          `INSERT INTO logs (usuario_id, accion, modulo, descripcion) 
           VALUES (?, ?, ?, ?)`,
          [
            data.usuario_actualizador_id,
            'actualizar',
            'usuarios',
            `Usuario actualizado: ${data.nombre} (${data.usuario})`
          ]
        )
  
        return {
          success: true,
          message: 'Usuario actualizado correctamente'
        }
  
      } catch (error) {
        console.error('Error al actualizar usuario:', error)
        return {
          success: false,
          message: 'Error al actualizar usuario',
          error: error instanceof Error ? error.message : 'Error desconocido'
        }
      }
    },

    /**
 * Actualizar únicamente el rol de un usuario
 */
async updateRol(data: { id: number; nuevo_rol_id: number; usuario_actualizador_id: number }) {
  try {
    const connection = await getConnection()

    // Validar que el usuario exista
    const [usuario] = await connection.execute<RowDataPacket[]>(
      'SELECT nombre, usuario FROM usuarios WHERE id = ? AND eliminado_en IS NULL',
      [data.id]
    )

    if (usuario.length === 0) {
      return {
        success: false,
        message: 'Usuario no encontrado'
      }
    }

    // Actualizar rol
    await connection.execute(
      `UPDATE usuarios SET rol_id = ? WHERE id = ? AND eliminado_en IS NULL`,
      [data.nuevo_rol_id, data.id]
    )

    // Registrar en logs
    await connection.execute(
      `INSERT INTO logs (usuario_id, accion, modulo, descripcion) 
       VALUES (?, ?, ?, ?)`,
      [
        data.usuario_actualizador_id,
        'actualizar_rol',
        'usuarios',
        `Rol actualizado para: ${usuario[0].nombre} (${usuario[0].usuario})`
      ]
    )

    return {
      success: true,
      message: 'Rol actualizado correctamente'
    }

  } catch (error) {
    console.error('Error al actualizar rol del usuario:', error)
    return {
      success: false,
      message: 'Error al actualizar rol del usuario',
      error: error instanceof Error ? error.message : 'Error desconocido'
    }
  }
},
  
    /**
     * Eliminar usuario (soft delete)
     */
    async delete(data: { id: number; usuario_eliminador_id: number }) {
      try {
        const connection = await getConnection()
  
        // No permitir eliminar el propio usuario
        if (data.id === data.usuario_eliminador_id) {
          return {
            success: false,
            message: 'No puedes eliminar tu propio usuario'
          }
        }
  
        // Obtener info del usuario antes de eliminar
        const [usuario] = await connection.execute<RowDataPacket[]>(
          'SELECT nombre, usuario FROM usuarios WHERE id = ?',
          [data.id]
        )
  
        if (usuario.length === 0) {
          return {
            success: false,
            message: 'Usuario no encontrado'
          }
        }
  
        await connection.execute(
          'UPDATE usuarios SET eliminado_en = NOW(), activo = false WHERE id = ?',
          [data.id]
        )
  
        // Registrar en logs
        await connection.execute(
          `INSERT INTO logs (usuario_id, accion, modulo, descripcion) 
           VALUES (?, ?, ?, ?)`,
          [
            data.usuario_eliminador_id,
            'eliminar',
            'usuarios',
            `Usuario eliminado: ${usuario[0].nombre} (${usuario[0].usuario})`
          ]
        )
  
        return {
          success: true,
          message: 'Usuario eliminado correctamente'
        }
  
      } catch (error) {
        console.error('Error al eliminar usuario:', error)
        return {
          success: false,
          message: 'Error al eliminar usuario',
          error: error instanceof Error ? error.message : 'Error desconocido'
        }
      }
    },
  
    /**
     * Resetear contraseña de usuario
     */
    async resetPassword(data: {
      id: number
      nueva_password: string
      usuario_actualizador_id: number
    }) {
      try {
        const connection = await getConnection()
  
        // Obtener info del usuario
        const [usuario] = await connection.execute<RowDataPacket[]>(
          'SELECT nombre, usuario FROM usuarios WHERE id = ?',
          [data.id]
        )
  
        if (usuario.length === 0) {
          return {
            success: false,
            message: 'Usuario no encontrado'
          }
        }
  
        // Hashear nueva contraseña
        const hashedPassword = await bcrypt.hash(data.nueva_password, 10)
  
        await connection.execute(
          'UPDATE usuarios SET password = ? WHERE id = ?',
          [hashedPassword, data.id]
        )
  
        // Registrar en logs
        await connection.execute(
          `INSERT INTO logs (usuario_id, accion, modulo, descripcion) 
           VALUES (?, ?, ?, ?)`,
          [
            data.usuario_actualizador_id,
            'reset_password',
            'usuarios',
            `Contraseña reseteada para: ${usuario[0].nombre} (${usuario[0].usuario})`
          ]
        )
  
        return {
          success: true,
          message: 'Contraseña reseteada correctamente'
        }
  
      } catch (error) {
        console.error('Error al resetear contraseña:', error)
        return {
          success: false,
          message: 'Error al resetear contraseña',
          error: error instanceof Error ? error.message : 'Error desconocido'
        }
      }
    }
  }