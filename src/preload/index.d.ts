// src/preload/index.d.ts

import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      /**
       * Llama a cualquier método de cualquier controlador
       * @param controller - Nombre del controlador
       * @param method - Nombre del método
       * @param data - Datos opcionales
       * @returns Promise con { success: boolean, message?: string, data?: any, error?: string }
       */
      call: (controller: string, method: string, data?: any) => Promise<any>
    }
  }
}