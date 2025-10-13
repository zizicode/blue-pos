// src/main/api/ipc/index.ts

import { ipcMain } from 'electron'

/**
 * 🔥 SISTEMA DE AUTO-REGISTRO DE CONTROLADORES
 * 
 * Solo necesitas importar tus controladores aquí y el sistema
 * registrará automáticamente todos sus métodos como handlers IPC.
 */

// 👉 IMPORTA TUS CONTROLADORES AQUÍ
import { authController } from './authController'
import { usersController } from './usersController'

// 👉 AGRÉGALOS AL OBJETO CONTROLLERS
const controllers = {
  auth: authController,
  users: usersController,
  // 👈 Agrega más aquí cuando los crees
}

/**
 * Registra automáticamente todos los métodos de todos los controladores
 */
export function registerIpcHandlers(): void {
  let totalHandlers = 0

  Object.entries(controllers).forEach(([controllerName, controller]) => {
    Object.entries(controller).forEach(([methodName, method]) => {
      if (typeof method !== 'function') return

      const channel = `${controllerName}:${methodName}`

      ipcMain.handle(channel, async (_, data) => {
        try {
          console.log(`📡 ${channel}`, data)
          const result = await method(data)
          return result
        } catch (error) {
          console.error(`❌ ${channel}`, error)
          return {
            success: false,
            message: 'Error en el servidor',
            error: error instanceof Error ? error.message : 'Error desconocido'
          }
        }
      })

      totalHandlers++
    })
  })

  console.log(`- ${totalHandlers} handlers registrados`)
}

export function unregisterIpcHandlers(): void {
  Object.entries(controllers).forEach(([controllerName, controller]) => {
    Object.keys(controller).forEach((methodName) => {
      const channel = `${controllerName}:${methodName}`
      ipcMain.removeHandler(channel)
    })
  })
  console.log('- Handlers IPC limpiados')
}