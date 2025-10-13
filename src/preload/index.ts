// src/preload/index.ts

import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// 🔥 UNA SOLA FUNCIÓN GENÉRICA PARA TODO
const api = {
  /**
   * Invoca cualquier método de cualquier controlador
   * @param controller - Nombre del controlador (ej: 'auth', 'users', 'products')
   * @param method - Nombre del método (ej: 'login', 'getAll', 'create')
   * @param data - Datos a enviar (opcional)
   * @returns Promise con la respuesta del servidor
   * 
   * @example
   * // Login
   * await window.api.call('auth', 'login', { username: 'admin', password: '1234' })
   * 
   * // Obtener usuarios
   * await window.api.call('users', 'getAll')
   * 
   * // Crear producto
   * await window.api.call('products', 'create', { name: 'Laptop', price: 1000 })
   */
  call: async (controller: string, method: string, data?: any) => {
    return await ipcRenderer.invoke(`${controller}:${method}`, data)
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore
  window.electron = electronAPI
  // @ts-ignore
  window.api = api
}