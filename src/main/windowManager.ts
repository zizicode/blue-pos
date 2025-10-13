// src/main/windowManager.ts

import { BrowserWindow, shell, app } from 'electron'
import { join } from 'path'
import { is, optimizer } from '@electron-toolkit/utils'
import icon from '../../resources/icon.ico?asset'

let mainWindow: BrowserWindow | null = null
let splashWindow: BrowserWindow | null = null

export function getMainWindow(): BrowserWindow | null {
    return mainWindow
}

export function createSplashWindow(): void {
    splashWindow = new BrowserWindow({
        width: 400,
        height: 300,
        transparent: true,
        frame: false,
        resizable: false,
        show: false,
    })

    const splashHtmlPath = join(__dirname, '../../resources/spash/splash.html')

    try {
        splashWindow.loadFile(splashHtmlPath)
    } catch (error) {
        console.error("Error al cargar splash.html:", error)
        splashWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent('<h1>Cargando...</h1>'))
    }

    splashWindow.on('ready-to-show', () => {
        splashWindow?.show()
    })
}

export function closeSplashWindow(): void {
    splashWindow?.close()
    splashWindow = null
}

export function createWindow(): void {
    mainWindow = new BrowserWindow({
        width: 900,
        height: 670,
        show: false,
        autoHideMenuBar: true,
        ...(process.platform === 'linux' ? { icon } : {}),
        icon: icon,
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

    // 🔧 Atajo F12 usando webContents directamente
    if (is.dev) {
        mainWindow.webContents.on('before-input-event', (event, input) => {
            if (input.key === 'F12' && input.type === 'keyDown') {
                if (mainWindow) {
                    if (mainWindow.webContents.isDevToolsOpened()) {
                        mainWindow.webContents.closeDevTools()
                    } else {
                        mainWindow.webContents.openDevTools({ mode: 'detach' })
                    }
                }
                event.preventDefault()
            }
        })

        // 🔧 Abrir DevTools automáticamente en desarrollo (opcional)
        // mainWindow.webContents.openDevTools({ mode: 'detach' })
    }

    // Cargar la app
    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
        mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
    } else {
        mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
    }

    // Opcional: Manejo de shortcuts de ventana
    app.on('browser-window-created', (_, window) => {
        optimizer.watchWindowShortcuts(window)
    })
}