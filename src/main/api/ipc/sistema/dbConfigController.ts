import fs from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { app } from 'electron'
import { testConnection } from '../../db/connection'
import type { DbConfig } from '../../db/dbConfigLoader'


const filePath = path.join(app.getPath('userData'), 'dbConfig.json')

async function ensureFile() {
  if (!existsSync(filePath)) {
    await fs.mkdir(path.dirname(filePath), { recursive: true })
    await fs.writeFile(filePath, JSON.stringify([], null, 2), 'utf8')
  }
}

async function readFile(): Promise<DbConfig[]> {
  await ensureFile()
  try {
    const raw = await fs.readFile(filePath, 'utf8')
    const data = JSON.parse(raw)
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

async function writeFile(data: DbConfig[]) {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8')
}

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

export const dbConfigController = {
  async getAll() {
    const configs = await readFile()
    return { success: true, data: configs, message: 'Lista de configuraciones cargada' }
  },

  async getOne(id: string) {
    const configs = await readFile()
    const found = configs.find(c => c.id === id)
    return found
      ? { success: true, data: found, message: 'Configuración encontrada' }
      : { success: false, message: 'Configuración no encontrada' }
  },

  async create(newCfg: Omit<DbConfig, 'id'>) {
    const configs = await readFile()

    // 🚫 Validar duplicados
    const duplicate = configs.find(c => c.name === newCfg.name || c.host === newCfg.host)
    if (duplicate) {
      return {
        success: false,
        message: `Ya existe una configuración con el mismo ${
          duplicate.name === newCfg.name ? 'nombre' : 'host'
        }`
      }
    }

    try {
      const result = await testConnection(newCfg)
      if (!result.success) {
        return { success: false, message: result.error ?? 'Error al probar la conexión' }
      }

      // ✅ Marcar como predeterminada si aplica
      if (newCfg.isDefault) configs.forEach(c => (c.isDefault = false))

      const cfg = { ...newCfg, id: genId() }
      configs.push(cfg)
      await writeFile(configs)

      return { success: true, data: cfg, message: 'Configuración creada correctamente' }
    } catch (error: any) {
      return { success: false, message: error?.message ?? 'Error inesperado al crear configuración' }
    }
  },

  async update({ id, ...patch }: Partial<DbConfig> & { id: string }) {
    const configs = await readFile()
    const idx = configs.findIndex(c => c.id === id)
    if (idx === -1) return { success: false, message: 'Configuración no encontrada' }

    // 🚫 Evitar duplicados
    if (patch.name || patch.host) {
      const duplicate = configs.find(c => c.id !== id && (c.name === patch.name || c.host === patch.host))
      if (duplicate) {
        return {
          success: false,
          message: `Ya existe otra configuración con el mismo ${
            duplicate.name === patch.name ? 'nombre' : 'host'
          }`
        }
      }
    }

    // ✅ Si se marca como predeterminada, desactivar otras
    if (patch.isDefault) configs.forEach(c => (c.isDefault = false))

    configs[idx] = { ...configs[idx], ...patch }
    await writeFile(configs)

    return { success: true, data: configs[idx], message: 'Configuración actualizada correctamente' }
  },

  async remove(id: string) {
    const configs = await readFile()
    const exists = configs.some(c => c.id === id)
    if (!exists) return { success: false, message: 'Configuración no encontrada' }

    const filtered = configs.filter(c => c.id !== id)
    await writeFile(filtered)
    return { success: true, message: 'Configuración eliminada correctamente' }
  },

  async getDefault() {
    const configs = await readFile()
    const found = configs.find(c => c.isDefault)
    if (!found) {
      return { success: false, message: 'No hay base de datos marcada como predeterminada' }
    }

    // 🔍 Probar conexión antes de devolver
    const result = await testConnection(found)
    if (!result.success) {
      return { success: false, message: 'Error al conectar con la configuración predeterminada' }
    }

    return { success: true, data: found, message: 'Configuración por defecto obtenida y verificada' }
  },

  async testing(config: DbConfig) {
    try {
      const result = await testConnection(config)
      return result.success
        ? { success: true, message: 'Conexión exitosa', data: config }
        : { success: false, message: result.error ?? 'Error de conexión' }
    } catch (error: any) {
      return { success: false, message: error?.message ?? 'Error inesperado durante la prueba' }
    }
  }
}
