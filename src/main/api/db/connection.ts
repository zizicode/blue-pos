import mysql, { Pool, PoolOptions } from 'mysql2/promise'
import { getDefaultConfig, type DbConfig } from './dbConfigLoader'

let pool: Pool | null = null

// 🧪 Testear conexión rápida
export async function testConnection(
  config: DbConfig
): Promise<{ success: boolean; error?: string }> {
  try {
    const tempConn = await mysql.createConnection({
      host: config.host,
      user: config.user,
      password: config.password ?? '',
      database: config.database,
      port: config.port ?? 3306,
      connectTimeout: 5000,
    })
    await tempConn.end()
    return { success: true }
  } catch {
    return { success: false, error: 'Error al intentar conectar con la base de datos' }
  }
}

// 🔌 Crear o devolver el pool existente
export async function getConnection(config?: DbConfig): Promise<Pool> {
  const configDefault = config || await getDefaultConfig();
  if (!pool) {
    if (!config) throw new Error('No se proporcionó configuración de base de datos')

    // Testear conexión antes de crear el pool
    const result = await testConnection(configDefault)
    if (!result.success) {
      throw new Error(result.error ?? 'No se pudo establecer conexión con la base de datos')
    }

    const options: PoolOptions = {
      host: configDefault.host,
      user: configDefault.user,
      password: configDefault.password ?? '',
      database: configDefault.database,
      port: configDefault.port ?? 3306,
      waitForConnections: true,
      connectionLimit: configDefault.connectionLimit ?? 10,
      queueLimit: 0,
    }

    pool = mysql.createPool(options)
  }

  return pool
}

// 🔒 Cerrar conexión
export async function closeConnection(): Promise<void> {
  if (pool) {
    await pool.end()
    pool = null
  }
}
