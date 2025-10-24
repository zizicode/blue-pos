import { app } from 'electron'
import fs from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { testConnection } from './connection'

export interface DbConfig {
  id?: string
  name: string
  host: string
  port: number
  user: string
  password?: string
  database: string
  isDefault: boolean
  connectionLimit?: number
}

const DbConfigDefault = {
  id:'',
  name:'',
  host:'localhost',
  port:3306,
  user:'root',
  password:'',
  database:'pos_system',
  isDefault:true,
  connectionLimit:10000
}

function getDbFilePath() {
  try {
    // Si estamos en el proceso principal
    return path.join(app.getPath('userData'), 'dbConfig.json')
  } catch {
    // Si se ejecuta fuera de main (por ejemplo desde preload o tests)
    return path.join(process.cwd(), 'dbConfig.json')
  }
}

const filePath = getDbFilePath()

// 🧩 Leer y obtener la config por defecto
export async function getDefaultConfig(): Promise<DbConfig> {
  try {
    if (!existsSync(filePath)) return DbConfigDefault
    const raw = await fs.readFile(filePath, 'utf8')
    const data: DbConfig[] = JSON.parse(raw)
    const defaultCfg = data.find((c) => c.isDefault)
    if (!defaultCfg) return DbConfigDefault

    const test = await testConnection(defaultCfg)
    if (!test.success) {
      console.error('Error al probar conexión:', test.error)
      return DbConfigDefault
    }

    return defaultCfg
  } catch (err) {
    console.error('Error al leer dbConfig.json:', err)
    return DbConfigDefault
  }
}
