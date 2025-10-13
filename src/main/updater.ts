// src/main/updater.ts

import { autoUpdater } from 'electron-updater'
import { dialog } from 'electron'
// Asegúrate de que tienes 'electron-log' instalado si lo estás usando
import log from 'electron-log' // o 'const log = require('electron-log')' si no usas imports de ES6

export function initAutoUpdater() {
  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  // Configuración de electron-log
  if (autoUpdater.logger) {
    autoUpdater.logger = log
    ;(autoUpdater.logger as typeof log).transports.file.level = 'info'
  }

  // --- Manejo de Eventos ---

  autoUpdater.on('checking-for-update', () => {
    console.log('🟡 Buscando actualizaciones...')
  })

  autoUpdater.on('update-available', () => {
    console.log('🟢 Nueva actualización disponible. Descargando...')
  })

  autoUpdater.on('update-not-available', () => {
    console.log('✅ La aplicación está actualizada.')
  })

  autoUpdater.on('error', (err) => {
    console.error('❌ Error al buscar actualizaciones:', err)
  })

  autoUpdater.on('update-downloaded', () => {
    console.log('📦 Actualización descargada. Preguntando al usuario...')
    dialog
      .showMessageBox({
        type: 'info',
        title: 'Actualización disponible',
        message: 'Se ha descargado una nueva versión. ¿Deseas reiniciar ahora para actualizar?',
        buttons: ['Reiniciar', 'Más tarde']
      })
      .then((result) => {
        if (result.response === 0) {
          autoUpdater.quitAndInstall()
        }
      })
  })

  // Iniciar la comprobación
  autoUpdater.checkForUpdates()
}