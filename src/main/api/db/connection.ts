// src/main/api/db/connection.ts

import mysql from 'mysql2/promise'

let pool: mysql.Pool | null = null

export async function getConnection(): Promise<mysql.Pool> {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'mi_database',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    })
  }
  return pool
}

export async function closeConnection(): Promise<void> {
  if (pool) {
    await pool.end()
    pool = null
  }
}