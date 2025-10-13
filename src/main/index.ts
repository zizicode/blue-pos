import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { autoUpdater } from 'electron-updater'

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // Cargar la app
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  // Iniciar comprobación de actualizaciones
  initAutoUpdater()
}

// --- 🧠 CONFIGURAR AUTO-UPDATER ---
function initAutoUpdater() {
  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  // Evita el error de tipo con verificación segura
  const log = require('electron-log')
  if (autoUpdater.logger) {
    autoUpdater.logger = log
    ;(autoUpdater.logger as typeof log).transports.file.level = 'info'
  }

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

  autoUpdater.checkForUpdates()
}

// --- 🪟 INICIO DE APP ---
app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.electron')
  app.on('browser-window-created', (_, window) => optimizer.watchWindowShortcuts(window))

  ipcMain.on('ping', () => console.log('pong'))

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
