import { app, ipcMain, BrowserWindow } from 'electron'
import { electronApp } from '@electron-toolkit/utils'
// 🔄 Importa las nuevas funciones
import {
  createSplashWindow,
  createWindow,
  closeSplashWindow,
} from './windowManager'
import { registerIpcHandlers, unregisterIpcHandlers } from './api/ipc'
import { initAutoUpdater } from './updater'

// --- 🧠 SECUENCIA DE INICIO CON CARGA ---
function initAppSequence() {
  // 1. Mostrar la Splash Screen
  createSplashWindow()

  // 2. ⏳ Simular carga / Lógica de precarga
  // Aquí es donde iría la lógica asíncrona real (conexión a DB, etc.)
  setTimeout(() => {
    // 3. Cerrar la Splash Screen
    closeSplashWindow()

    // 4. Crear y mostrar la Ventana Principal
    createWindow()

    // 5. Iniciar comprobación de actualizaciones (u otras tareas de fondo)
    initAutoUpdater()
    registerIpcHandlers()
  }, 3000) // 👈 3000 ms = 3 segundos de simulación
}

// --- 🪟 INICIO DE APP ---
app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.electron.bluepost')
  app.setAppUserModelId('com.electron.bluepost') 

  ipcMain.on('ping', () => console.log('pong'))

  // 🛑 Llama a la secuencia de inicio
  initAppSequence()

  app.on('activate', function () {
    // Si la ventana principal se ha cerrado, la recreamos
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    unregisterIpcHandlers()
    app.quit()
  }
})