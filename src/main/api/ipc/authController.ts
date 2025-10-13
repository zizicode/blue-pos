// src/main/api/ipc/authController.ts

import { getConnection } from '../db/connection'
import { RowDataPacket } from 'mysql2'

export interface AuthController {
  login: (data: { username: string; password: string }) => Promise<any>
  logout: () => Promise<any>
  verifyToken: (data: { token: string }) => Promise<any>
}

interface User extends RowDataPacket {
  id: number
  username: string
  password: string
  email: string
}

export const authController: AuthController = {
  async login({ username, password }) {
    try {
      const pool = await getConnection()
      const [rows] = await pool.query<User[]>(
        'SELECT * FROM users WHERE username = ? AND password = ?',
        [username, password]
      )

      if (rows.length === 0) {
        return {
          success: false,
          message: 'Credenciales incorrectas'
        }
      }

      const user = rows[0]
      return {
        success: true,
        message: 'Login exitoso',
        data: {
          id: user.id,
          username: user.username,
          email: user.email
        }
      }
    } catch (error) {
      console.error('Error en login:', error)
      return {
        success: false,
        message: 'Error en el servidor',
        error: error instanceof Error ? error.message : 'Error desconocido'
      }
    }
  },

  async logout() {
    try {
      // Aquí puedes agregar lógica de logout (limpiar sesiones, tokens, etc.)
      return {
        success: true,
        message: 'Logout exitoso'
      }
    } catch (error) {
      console.error('Error en logout:', error)
      return {
        success: false,
        message: 'Error al cerrar sesión'
      }
    }
  },

  async verifyToken({ token }) {
    try {
      // Aquí puedes agregar lógica de verificación de token
      return {
        success: true,
        message: 'Token válido',
        data: { valid: true }
      }
    } catch (error) {
      console.error('Error verificando token:', error)
      return {
        success: false,
        message: 'Token inválido'
      }
    }
  }
}