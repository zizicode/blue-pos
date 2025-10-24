// src/renderer/hooks/useInitializePOSData.ts

import { useState, useCallback } from 'react'
import { usePOSStore } from '../store/usePOSStore'

interface LoadingStep {
  name: string
  description: string
  completed: boolean
}

export const useInitializePOSData = () => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [currentStep, setCurrentStep] = useState<string>('')
  const [loadingSteps, setLoadingSteps] = useState<LoadingStep[]>([])
  
  const initializeData = usePOSStore((state) => state.initializeData)
  const setProductos = usePOSStore((state) => state.setProductos)
  const setCategorias = usePOSStore((state) => state.setCategorias)
  const setUnidadesMedida = usePOSStore((state) => state.setUnidadesMedida)
  const setMetodosPago = usePOSStore((state) => state.setMetodosPago)
  const setProveedores = usePOSStore((state) => state.setProveedores)
  const setClientes = usePOSStore((state) => state.setClientes)
  const setAlmacenes = usePOSStore((state) => state.setAlmacenes)
  const setCajas = usePOSStore((state) => state.setCajas)
  const setRoles = usePOSStore((state) => state.setRoles)
  const setVentas = usePOSStore((state) => state.setVentas)
  const setUsuarios = usePOSStore((state) => state.setUsuarios)
  const setConfiguracion = usePOSStore((state) => state.setConfiguracion)
  const setTurnoActivo = usePOSStore((state) => state.setTurnoActivo)
  const setAlmacenSeleccionado = usePOSStore((state) => state.setAlmacenSeleccionado)

  const steps: LoadingStep[] = [
    { name: 'catalogos', description: 'Catálogos básicos', completed: false },
    { name: 'almacenes', description: 'Almacenes y cajas', completed: false },
    { name: 'entidades', description: 'Proveedores y clientes', completed: false },
    { name: 'productos', description: 'Productos', completed: false },
    { name: 'usuarios', description: 'Roles y usuarios', completed: false },
    { name: 'configuracion', description: 'Configuración del sistema', completed: false },
    { name: 'turno', description: 'Turno de caja', completed: false },
    { name: 'ventas', description: 'Facturas', completed: false },
    { name: 'finalizacion', description: 'Finalizando carga', completed: false }
  ]

  const updateStepProgress = (stepIndex: number, stepName: string) => {
    setCurrentStep(stepName)
    setLoadingSteps(prev => {
      const updated = [...prev]
      if (updated[stepIndex]) {
        updated[stepIndex].completed = true
      }
      return updated
    })
    const progressValue = Math.round(((stepIndex + 1) / steps.length) * 100)
    setProgress(progressValue)
  }

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

  const loadAllData = useCallback(async (usuarioId: number) => {
    setIsLoading(true)
    setError(null)
    setProgress(0)
    setCurrentStep('')
    setLoadingSteps(steps.map(s => ({ ...s, completed: false })))

    try {
      let stepIndex = 0

      // 1. Catálogos básicos
      setCurrentStep(steps[stepIndex].description)
      
      const [categorias, unidadesMedida, metodosPago] = await Promise.all([
        window.api.call('categorias', 'getAll'),
        window.api.call('unidadesMedida', 'getAll'),
        window.api.call('metodosPago', 'getAll')
      ])
      
      if (!categorias.success || !unidadesMedida.success || !metodosPago.success) {
        throw new Error('Error al cargar catálogos básicos')
      }

      setCategorias(categorias.data)
      setUnidadesMedida(unidadesMedida.data)
      setMetodosPago(metodosPago.data)
      
      await sleep(300) // Pequeña pausa para visualización
      updateStepProgress(stepIndex++, 'Catálogos cargados')

      // 2. Almacenes y Cajas
      setCurrentStep(steps[stepIndex].description)
      
      const [almacenes, cajas] = await Promise.all([
        window.api.call('almacenes', 'getAll'),
        window.api.call('cajas','getAll')
      ])
      
      if (!almacenes.success || !cajas.success) {
        throw new Error('Error al cargar almacenes y cajas')
      }

      setAlmacenes(almacenes.data)
      setCajas(cajas.data)
      
      const principal = almacenes.data.find((a: any) => a.es_principal)
      if (principal) setAlmacenSeleccionado(principal.id)
      
      await sleep(300)
      updateStepProgress(stepIndex++, 'Almacenes y cajas cargados')

      // 3. Proveedores y Clientes
      setCurrentStep(steps[stepIndex].description)
      
      const [proveedores, clientes] = await Promise.all([
        window.api.call('proveedores', 'getAll', { limit: 1000 }),
        window.api.call('clientes', 'getAll', { limit: 1000 })
      ])
      
      if (!proveedores.success || !clientes.success) {
        throw new Error('Error al cargar proveedores y clientes')
      }

      setProveedores(proveedores.data)
      setClientes(clientes.data)
      
      await sleep(300)
      updateStepProgress(stepIndex++, 'Proveedores y clientes cargados')

      // 4. Productos
      setCurrentStep(steps[stepIndex].description)
      
      const productos = await window.api.call('productos', 'getAll', { 
        limit: 5000,
        activo: true 
      })
      
      if (!productos.success) {
        throw new Error('Error al cargar productos')
      }

      setProductos(productos.data)
      
      await sleep(400) // Pausa más larga para productos
      updateStepProgress(stepIndex++, 'Productos cargados')

      // 5. Roles y Usuarios
      setCurrentStep(steps[stepIndex].description)
      
      try {
        const [roles, usuarios] = await Promise.all([
          window.api.call('roles', 'getAll'),
          window.api.call('users', 'getAll', { limit: 500 })
        ])
        
        if (roles.success) setRoles(roles.data)
        if (usuarios.success) setUsuarios(usuarios.data)
      } catch (err) {
        console.warn('No tiene permisos para ver usuarios')
      }
      
      await sleep(300)
      updateStepProgress(stepIndex++, 'Roles y usuarios cargados')

      // 6. Configuración
      setCurrentStep(steps[stepIndex].description)
      
      const configuracion = await window.api.call('configuracion', 'getMultiple', {
        claves: [
          "nombre_negocio", "rfc", "telefono", "email", "direccion",
          "ciudad", "estado", "codigo_postal", "moneda", "simbolo_moneda",
          "decimales", "iva_porcentaje", "aplicar_iva",
          "permitir_ventas_sin_stock", "alertar_stock_minimo",
          "dias_vencimiento_credito", "limite_descuento_porcentaje",
          "requiere_autorizacion_descuento", "formato_ticket",
          "imprimir_automaticamente", "mostrar_logo_ticket",
          "mensaje_ticket_footer", "prefijo_folio_venta",
          "prefijo_folio_compra", "prefijo_folio_devolucion"
        ]
      })
      
      if (!configuracion.success) {
        throw new Error('Error al cargar configuración')
      }

      setConfiguracion(configuracion.data)
      
      await sleep(300)
      updateStepProgress(stepIndex++, 'Configuracion cargada')
      // 7. Turno de caja
      setCurrentStep(steps[stepIndex].description)
      console.log('🏦 Verificando turno de caja...')
      
      const turnoActivo = await window.api.call('turnosCaja', 'getTurnoActivo', {
        usuario_id: usuarioId
      })
      
      setTurnoActivo(turnoActivo.success && turnoActivo.data ? turnoActivo.data : null)
      
      await sleep(300)
      updateStepProgress(stepIndex++, 'Turno verificado')

      // 8. Finalización
      setCurrentStep(steps[stepIndex].description)
      console.log('✅ Finalizando carga...')
      
      await sleep(500)
      updateStepProgress(stepIndex++, 'Carga completada')

      // 9. Ventas
      setCurrentStep(steps[stepIndex].description)
      
      try {
        const ventas: any = await Promise.all([
          window.api.call('ventas', 'getAll', { limit: 2000 }),
        ])
        
        setVentas( ventas[0].success && ventas[0].data ? ventas[0].data : null)
        
      } catch (err) {
        console.warn('No tiene permisos para ver ventas')
      }
      
      await sleep(300)
      updateStepProgress(stepIndex++, 'Facturas Cargadas')

      // Marcar como cargado
      initializeData({ isLoaded: true })
      
      console.log('🎉 Sistema POS inicializado correctamente')
      
      // Esperar 3 segundos adicionales antes de quitar el loading
      await sleep(1000)
      
      return true

    } catch (err) {
      console.error('❌ Error al inicializar datos:', err)
      setError(err instanceof Error ? err.message : 'Error desconocido al cargar datos')
      return false
    } finally {
      setIsLoading(false)
    }
  }, [])

  const loadAdditionalData = useCallback(async () => {
    try {
      console.log('📊 Cargando datos adicionales...')
      
      const hoy = new Date().toISOString().split('T')[0]
      
      const ventas = await window.api.call('ventas', 'getAll', {
        fecha_inicio: hoy,
        fecha_fin: hoy,
        estado: 'completada',
        limit: 100
      })
      
      return ventas.data || []
    } catch (err) {
      console.error('Error al cargar datos adicionales:', err)
      return []
    }
  }, [])

  const refreshModule = useCallback(async (module: string) => {
    try {
      switch (module) {
        case 'productos':
          const productos = await window.api.call('productos', 'getAll', { 
            limit: 5000, 
            activo: true 
          })
          if (productos.success) setProductos(productos.data)
          break

        case 'clientes':
          const clientes = await window.api.call('clientes', 'getAll', { limit: 1000 })
          if (clientes.success) setClientes(clientes.data)
          break

        case 'proveedores':
          const proveedores = await window.api.call('proveedores', 'getAll', { limit: 1000 })
          if (proveedores.success) setProveedores(proveedores.data)
          break

        case 'categorias':
          const categorias = await window.api.call('categorias', 'getAll')
          if (categorias.success) setCategorias(categorias.data)
          break

        case 'almacenes':
          const almacenes = await window.api.call('almacenes', 'getAll')
          if (almacenes.success) setAlmacenes(almacenes.data)
          break

        case 'cajas':
          const cajas = await window.api.call('cajas','getAll')
          if (cajas.success) setCajas(cajas.data)
          break

        case 'configuracion':
          const config = await window.api.call('configuracion','getAll')
          if (config.success) {
            const configObj = config.data.reduce((acc: any, item: any) => {
              acc[item.clave] = item.valor
              return acc
            }, {})
            setConfiguracion(configObj)
          }
          break

        default:
          console.warn(`Módulo ${module} no reconocido`)
      }
      
      return true
    } catch (err) {
      console.error(`Error al refrescar módulo ${module}:`, err)
      return false
    }
  }, [])

  const syncAllData = useCallback(async (usuarioId: number) => {
    console.log('🔄 Sincronizando todos los datos...')
    return loadAllData(usuarioId)
  }, [loadAllData])

  return {
    loadAllData,
    loadAdditionalData,
    refreshModule,
    syncAllData,
    isLoading,
    error,
    progress,
    currentStep,
    loadingSteps
  }
}