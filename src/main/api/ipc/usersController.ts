// src/main/api/ipc/usersController.ts

import { getConnection } from '../db/connection'
import { RowDataPacket } from 'mysql2'

export interface UsersController {
  getAll: () => Promise<any>
  getById: (data: { id: number }) => Promise<any>
  create: (data: { username: string; password: string; email: string }) => Promise<any>
}

interface User extends RowDataPacket {
  id: number
  username: string
  email: string
}

export const usersController: UsersController = {
  async getAll() {
    try {
      const pool = await getConnection()
      const [rows] = await pool.query<User[]>('SELECT id, username, email FROM users')

      return {
        success: true,
        data: rows
      }
    } catch (error) {
      console.error('Error obteniendo usuarios:', error)
      return {
        success: false,
        message: 'Error obteniendo usuarios',
        error: error instanceof Error ? error.message : 'Error desconocido'
      }
    }
  },

  async getById({ id }) {
    try {
      const pool = await getConnection()
      const [rows] = await pool.query<User[]>(
        'SELECT id, username, email FROM users WHERE id = ?',
        [id]
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
      console.error('Error obteniendo usuario:', error)
      return {
        success: false,
        message: 'Error obteniendo usuario',
        error: error instanceof Error ? error.message : 'Error desconocido'
      }
    }
  },

  async create({ username, password, email }) {
    try {
      const pool = await getConnection()
      const [result] = await pool.query(
        'INSERT INTO users (username, password, email) VALUES (?, ?, ?)',
        [username, password, email]
      )

      return {
        success: true,
        message: 'Usuario creado exitosamente',
        data: { id: (result as any).insertId }
      }
    } catch (error) {
      console.error('Error creando usuario:', error)
      return {
        success: false,
        message: 'Error creando usuario',
        error: error instanceof Error ? error.message : 'Error desconocido'
      }
    }
  }
}