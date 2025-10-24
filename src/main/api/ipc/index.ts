// src/main/api/ipc/index.ts

import { ipcMain } from 'electron'

/**
 * 🔥 SISTEMA POS - AUTO-REGISTRO DE CONTROLADORES
 * 
 * Estructura modular completa para sistema POS
 */

// ============================================
// MÓDULO 1: AUTENTICACIÓN Y PERMISOS
// ============================================
import { authController } from './auth/authController'
import { usersController } from './auth/usersController'
import { rolesController } from './auth/rolesController'
import { permisosController } from './auth/permisosController'

// ============================================
// MÓDULO 2: CATÁLOGOS BÁSICOS
// ============================================
import { unidadesMedidaController } from './catalogos/unidadesMedidaController'
import { metodosPagoController } from './catalogos/metodosPagoController'
import { categoriasController } from './catalogos/categoriasController'

// ============================================
// MÓDULO 3: PROVEEDORES
// ============================================
import { proveedoresController } from './proveedores/proveedoresController'

// ============================================
// MÓDULO 4: INVENTARIO
// ============================================
import { productosController } from './inventario/productosController'
import { almacenesController } from './inventario/almacenesController'
import { stockController } from './inventario/stockController'
import { movimientosInventarioController } from './inventario/movimientosInventarioController'
import { transferenciasController } from './inventario/transferenciasController'

// ============================================
// MÓDULO 5: COMPRAS
// ============================================
import { comprasController } from './compras/comprasController'

// ============================================
// MÓDULO 6: CLIENTES
// ============================================
import { clientesController } from './clientes/clientesController'

// ============================================
// MÓDULO 7: VENTAS
// ============================================
import { ventasController } from './ventas/ventasController'
import { devolucionesController } from './ventas/devolucionesController'

// ============================================
// MÓDULO 8: CUENTAS POR COBRAR
// ============================================
import { cuentasPorCobrarController } from './cuentas/cuentasPorCobrarController'
import { abonosController } from './cuentas/abonosController'

// ============================================
// MÓDULO 9: CAJA
// ============================================
import { cajasController } from './caja/cajasController'
import { turnosCajaController } from './caja/turnosCajaController'
import { movimientosCajaController } from './caja/movimientosCajaController'

// ============================================
// MÓDULO 10: REPORTES Y CONFIGURACIÓN
// ============================================
import { reportesController } from './reportes/reportesController'
import { configuracionController } from './sistema/configuracionController'
import { logsController } from './sistema/logsController'
import { dashboardController } from './reportes/dashboardController'

// ============================================
// MÓDULO 11: UTILIDADES
// ============================================
import { dbConfigController } from './sistema/dbConfigController'
import { appController } from './sistema/appController'


// ============================================
// 👉 REGISTRO DE CONTROLADORES POR MÓDULO
// ============================================
const controllers = {
  // Autenticación y Permisos
  auth: authController,
  users: usersController,
  roles: rolesController,
  permisos: permisosController,

  // Catálogos
  unidadesMedida: unidadesMedidaController,
  metodosPago: metodosPagoController,
  categorias: categoriasController,

  // Proveedores
  proveedores: proveedoresController,

  // Inventario
  productos: productosController,
  almacenes: almacenesController,
  stock: stockController,
  movimientosInventario: movimientosInventarioController,
  transferencias: transferenciasController,

  // Compras
  compras: comprasController,

  // Clientes
  clientes: clientesController,

  // Ventas
  ventas: ventasController,
  devoluciones: devolucionesController,

  // Cuentas por Cobrar
  cuentasPorCobrar: cuentasPorCobrarController,
  abonos: abonosController,

  // Caja
  cajas: cajasController,
  turnosCaja: turnosCajaController,
  movimientosCaja: movimientosCajaController,

  // Reportes y Sistema
  reportes: reportesController,
  dashboard: dashboardController,
  configuracion: configuracionController,
  logs: logsController,
  dbConfig: dbConfigController,
  app: appController,
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
          console.log(`- ${channel}`, data || '{}')
          const result = await method(data)
          return result
        } catch (error) {
          console.error(`- ${channel}`, error)
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

  console.log(`- ${totalHandlers} handlers IPC registrados correctamente`)
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