import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ============================================
// TIPOS DE DATOS
// ============================================

interface Producto {
  id: number
  codigo: string
  codigo_barras?: string
  nombre: string
  descripcion?: string
  categoria_id?: number
  categoria_nombre?: string
  unidad_medida_id?: number
  unidad_medida_nombre?: string
  unidad_medida_abreviatura?: string
  proveedor_id?: number
  proveedor_nombre?: string
  precio_compra: number
  precio_venta: number
  stock_minimo: number
  stock_actual: number
  imagen_url?: string
  activo: boolean
}

interface Categoria {
  id: number
  nombre: string
  descripcion?: string
  activo: boolean
}

interface UnidadMedida {
  id: number
  nombre: string
  abreviatura: string
  activo: boolean
}

interface MetodoPago {
  id: number
  nombre: string
  requiere_referencia: boolean
  activo: boolean
  orden: number
}

interface Proveedor {
  id: number
  nombre: string
  contacto?: string
  telefono?: string
  email?: string
  direccion?: string
  rfc?: string
  dias_credito: number
  activo: boolean
}

interface Cliente {
  id: number
  nombre: string
  telefono?: string
  email?: string
  direccion?: string
  rfc?: string
  limite_credito: number
  saldo_actual: number
  tipo: 'general' | 'mayorista' | 'vip'
  activo: boolean
}

export interface Almacen {
  id?: number
  nombre: string
  direccion?: string
  telefono?: string
  es_principal: boolean
  activo: boolean
  creado_en?: string
  actualizado_en?: string
}

interface Caja {
  id: number
  nombre: string
  almacen_id?: number
  almacen_nombre?: string
  activo: boolean
}

interface TurnoCaja {
  id: number
  caja_id: number
  caja_nombre?: string
  usuario_id: number
  usuario_nombre?: string
  fecha_apertura: string
  fecha_cierre?: string
  monto_inicial: number
  monto_final?: number
  monto_esperado?: number
  diferencia?: number
  estado: 'abierto' | 'cerrado'
  notas?: string
}

interface Venta {
  id: number
  folio: string
  fecha: string
  cliente_id?: number
  cliente_nombre?: string
  almacen_id?: number
  usuario_id: number
  usuario_nombre?: string
  subtotal: number
  descuento: number
  total: number
  tipo_venta: 'contado' | 'credito'
  estado: 'completada' | 'cancelada'
  notas?: string
}

interface CuentaPorCobrar {
  id: number
  cliente_id: number
  cliente_nombre?: string
  venta_id: number
  venta_folio?: string
  monto_total: number
  monto_pagado: number
  saldo_pendiente: number
  fecha_vencimiento?: string
  estado: 'pendiente' | 'pagada' | 'vencida'
}

interface Configuracion {
  [key: string]: string | number | boolean
}

interface Rol {
  id: number
  nombre: string
  descripcion?: string
  activo: boolean
}

interface Usuario {
  id: number
  nombre: string
  email?: string
  usuario: string
  rol_id: number
  rol_nombre?: string
  activo: boolean
  ultimo_acceso?: string
}

interface Compra {
  id: number
  folio: string
  proveedor_id: number
  proveedor_nombre?: string
  almacen_id?: number
  fecha: string
  total: number
  usuario_id: number
  estado: 'completada' | 'cancelada'
}

interface Devolucion {
  id: number
  folio: string
  venta_id: number
  venta_folio?: string
  fecha: string
  motivo?: string
  total: number
  usuario_id: number
  estado: string
}

// ============================================
// ESTADO DEL STORE
// ============================================

interface POSState {
  // ========== DATOS ==========
  productos: Producto[]
  categorias: Categoria[]
  unidadesMedida: UnidadMedida[]
  metodosPago: MetodoPago[]
  proveedores: Proveedor[]
  clientes: Cliente[]
  almacenes: Almacen[]
  cajas: Caja[]
  roles: Rol[]
  usuarios: Usuario[]
  ventas: Venta[]
  compras: Compra[]
  devoluciones: Devolucion[]
  cuentasPorCobrar: CuentaPorCobrar[]
  configuracion: Configuracion
  
  // Estado de sesión
  turnoActivo: TurnoCaja | null
  almacenSeleccionado: number | null
  
  // Flags de carga
  isLoaded: boolean
  lastSync: string | null

  // ========== ACCIONES GENERALES ==========
  
  // Inicializar todos los datos
  initializeData: (data: Partial<POSState>) => void
  
  // Limpiar todo el store
  clearAll: () => void
  
  // Actualizar última sincronización
  updateLastSync: () => void

  // ========== PRODUCTOS ==========
  setProductos: (productos: Producto[]) => void
  addProducto: (producto: Producto) => void
  updateProducto: (id: number, producto: Partial<Producto>) => void
  deleteProducto: (id: number) => void
  getAllProductos: () => Producto[]
  getProductoById: (id: number) => Producto | undefined
  getProductoByCodigo: (codigo: string) => Producto | undefined
  getProductosByCategoria: (categoriaId: number) => Producto[]
  getProductosStockBajo: () => Producto[]
  updateStockProducto: (id: number, cantidad: number) => void

  // ========== CATEGORÍAS ==========
  setCategorias: (categorias: Categoria[]) => void
  addCategoria: (categoria: Categoria) => void
  updateCategoria: (id: number, categoria: Partial<Categoria>) => void
  deleteCategoria: (id: number) => void
  getCategoriaById: (id: number) => Categoria | undefined

  // ========== UNIDADES DE MEDIDA ==========
  setUnidadesMedida: (unidades: UnidadMedida[]) => void
  addUnidadMedida: (unidad: UnidadMedida) => void
  updateUnidadMedida: (id: number, unidad: Partial<UnidadMedida>) => void

  // ========== MÉTODOS DE PAGO ==========
  setMetodosPago: (metodos: MetodoPago[]) => void
  addMetodoPago: (metodo: MetodoPago) => void
  updateMetodoPago: (id: number, metodo: Partial<MetodoPago>) => void

  // ========== PROVEEDORES ==========
  setProveedores: (proveedores: Proveedor[]) => void
  addProveedor: (proveedor: Proveedor) => void
  updateProveedor: (id: number, proveedor: Partial<Proveedor>) => void
  deleteProveedor: (id: number) => void
  getProveedorById: (id: number) => Proveedor | undefined

  // ========== CLIENTES ==========
  setClientes: (clientes: Cliente[]) => void
  addCliente: (cliente: Cliente) => void
  updateCliente: (id: number, cliente: Partial<Cliente>) => void
  deleteCliente: (id: number) => void
  getClienteById: (id: number) => Cliente | undefined
  updateSaldoCliente: (id: number, nuevoSaldo: number) => void

  // ========== ALMACENES ==========
  setAlmacenes: (almacenes: Almacen[]) => void
  addAlmacen: (almacen: Almacen) => void
  updateAlmacen: (id: number, almacen: Partial<Almacen>) => void
  getAllAlmacenes: () => Almacen[]
  getAlmacenById: (id: number) => Almacen | undefined
  getAlmacenPrincipal: () => Almacen | undefined
  setAlmacenSeleccionado: (id: number) => void

  // ========== CAJAS ==========
  setCajas: (cajas: Caja[]) => void
  addCaja: (caja: Caja) => void
  updateCaja: (id: number, caja: Partial<Caja>) => void
  getCajaById: (id: number) => Caja | undefined

  // ========== TURNO DE CAJA ==========
  setTurnoActivo: (turno: TurnoCaja | null) => void
  cerrarTurnoActivo: () => void

  // ========== ROLES Y USUARIOS ==========
  setRoles: (roles: Rol[]) => void
  addRol: (rol: Rol) => void
  updateRol: (id: number, rol: Partial<Rol>) => void
  
  setUsuarios: (usuarios: Usuario[]) => void
  addUsuario: (usuario: Usuario) => void
  updateUsuario: (id: number, usuario: Partial<Usuario>) => void
  deleteUsuario: (id: number) => void

  // ========== VENTAS ==========
  setVentas: (ventas: Venta[]) => void
  addVenta: (venta: Venta) => void
  updateVenta: (id: number, venta: Partial<Venta>) => void
  getVentaById: (id: number) => Venta | undefined
  getVentaByFolio: (folio: string) => Venta | undefined

  // ========== COMPRAS ==========
  setCompras: (compras: Compra[]) => void
  addCompra: (compra: Compra) => void
  updateCompra: (id: number, compra: Partial<Compra>) => void

  // ========== DEVOLUCIONES ==========
  setDevoluciones: (devoluciones: Devolucion[]) => void
  addDevolucion: (devolucion: Devolucion) => void


  // ========== CUENTAS POR COBRAR ==========
  setCuentasPorCobrar: (cuentas: CuentaPorCobrar[]) => void
  addCuentaPorCobrar: (cuenta: CuentaPorCobrar) => void
  updateCuentaPorCobrar: (id: number, cuenta: Partial<CuentaPorCobrar>) => void
  getCuentasPorCliente: (clienteId: number) => CuentaPorCobrar[]
  getCuentasVencidas: () => CuentaPorCobrar[]

  // ========== CONFIGURACIÓN ==========
  setConfiguracion: (config: Configuracion) => void
  updateConfiguracion: (key: string, value: string | number | boolean) => void
  getConfiguracion: (key: string, defaultValue?: any) => any
}

// ============================================
// STORE PRINCIPAL
// ============================================

export const usePOSStore = create<POSState>()(
  persist(
    (set, get) => ({
      // ========== ESTADO INICIAL ==========
      productos: [],
      categorias: [],
      unidadesMedida: [],
      metodosPago: [],
      proveedores: [],
      clientes: [],
      almacenes: [],
      cajas: [],
      roles: [],
      usuarios: [],
      ventas: [],
      compras: [],
      devoluciones: [],
      cuentasPorCobrar: [],
      configuracion: {},
      turnoActivo: null,
      almacenSeleccionado: null,
      isLoaded: false,
      lastSync: null,

      // ========== ACCIONES GENERALES ==========
      
      initializeData: (data) => {
        set({
          ...data,
          isLoaded: true,
          lastSync: new Date().toISOString()
        })
      },

      clearAll: () => {
        set({
          productos: [],
          categorias: [],
          unidadesMedida: [],
          metodosPago: [],
          proveedores: [],
          clientes: [],
          almacenes: [],
          cajas: [],
          roles: [],
          usuarios: [],
          ventas: [],
          compras: [],
          devoluciones: [],
          cuentasPorCobrar: [],
          configuracion: {},
          turnoActivo: null,
          almacenSeleccionado: null,
          isLoaded: false,
          lastSync: null
        })
      },

      updateLastSync: () => {
        set({ lastSync: new Date().toISOString() })
      },

      // ========== PRODUCTOS ==========
      
      setProductos: (productos) => set({ productos }),
      
      addProducto: (producto) => 
        set((state) => ({ productos: [...state.productos, producto] })),
      
      updateProducto: (id, producto) =>
        set((state) => ({
          productos: state.productos.map((p) =>
            p.id === id ? { ...p, ...producto } : p
          )
        })),
      
      deleteProducto: (id) =>
        set((state) => ({
          productos: state.productos.filter((p) => p.id !== id)
        })),

      getAllProductos: () => get().productos,
      
      getProductoById: (id) => get().productos.find((p) => p.id === id),
      
      getProductoByCodigo: (codigo) =>
        get().productos.find(
          (p) => p.codigo === codigo || p.codigo_barras === codigo
        ),
      
      getProductosByCategoria: (categoriaId) =>
        get().productos.filter((p) => p.categoria_id === categoriaId),
      
      getProductosStockBajo: () =>
        get().productos.filter((p) => p.stock_actual <= p.stock_minimo),
      
      updateStockProducto: (id, cantidad) =>
        set((state) => ({
          productos: state.productos.map((p) =>
            p.id === id ? { ...p, stock_actual: cantidad } : p
          )
        })),

      // ========== CATEGORÍAS ==========
      
      setCategorias: (categorias) => set({ categorias }),
      
      addCategoria: (categoria) =>
        set((state) => ({ categorias: [...state.categorias, categoria] })),
      
      updateCategoria: (id, categoria) =>
        set((state) => ({
          categorias: state.categorias.map((c) =>
            c.id === id ? { ...c, ...categoria } : c
          )
        })),
      
      deleteCategoria: (id) =>
        set((state) => ({
          categorias: state.categorias.filter((c) => c.id !== id)
        })),
      
      getCategoriaById: (id) => get().categorias.find((c) => c.id === id),

      // ========== UNIDADES DE MEDIDA ==========
      
      setUnidadesMedida: (unidades) => set({ unidadesMedida: unidades }),
      
      addUnidadMedida: (unidad) =>
        set((state) => ({ unidadesMedida: [...state.unidadesMedida, unidad] })),
      
      updateUnidadMedida: (id, unidad) =>
        set((state) => ({
          unidadesMedida: state.unidadesMedida.map((u) =>
            u.id === id ? { ...u, ...unidad } : u
          )
        })),

      // ========== MÉTODOS DE PAGO ==========
      
      setMetodosPago: (metodos) => set({ metodosPago: metodos }),
      
      addMetodoPago: (metodo) =>
        set((state) => ({ metodosPago: [...state.metodosPago, metodo] })),
      
      updateMetodoPago: (id, metodo) =>
        set((state) => ({
          metodosPago: state.metodosPago.map((m) =>
            m.id === id ? { ...m, ...metodo } : m
          )
        })),

      // ========== PROVEEDORES ==========
      
      setProveedores: (proveedores) => set({ proveedores }),
      
      addProveedor: (proveedor) =>
        set((state) => ({ proveedores: [...state.proveedores, proveedor] })),
      
      updateProveedor: (id, proveedor) =>
        set((state) => ({
          proveedores: state.proveedores.map((p) =>
            p.id === id ? { ...p, ...proveedor } : p
          )
        })),
      
      deleteProveedor: (id) =>
        set((state) => ({
          proveedores: state.proveedores.filter((p) => p.id !== id)
        })),
      
      getProveedorById: (id) => get().proveedores.find((p) => p.id === id),

      // ========== CLIENTES ==========
      
      setClientes: (clientes) => set({ clientes }),
      
      addCliente: (cliente) =>
        set((state) => ({ clientes: [...state.clientes, cliente] })),
      
      updateCliente: (id, cliente) =>
        set((state) => ({
          clientes: state.clientes.map((c) =>
            c.id === id ? { ...c, ...cliente } : c
          )
        })),
      
      deleteCliente: (id) =>
        set((state) => ({
          clientes: state.clientes.filter((c) => c.id !== id)
        })),
      
      getClienteById: (id) => get().clientes.find((c) => c.id === id),
      
      updateSaldoCliente: (id, nuevoSaldo) =>
        set((state) => ({
          clientes: state.clientes.map((c) =>
            c.id === id ? { ...c, saldo_actual: nuevoSaldo } : c
          )
        })),

      // ========== ALMACENES ==========
      
      setAlmacenes: (almacenes) => set({ almacenes }),
      
      addAlmacen: (almacen) =>
        set((state) => ({ almacenes: [...state.almacenes, almacen] })),
      
      updateAlmacen: (id, almacen) =>
        set((state) => ({
          almacenes: state.almacenes.map((a) =>
            a.id === id ? { ...a, ...almacen } : a
          )
        })),
      
      getAlmacenById: (id) => get().almacenes.find((a) => a.id === id),
      getAllAlmacenes: () => get().almacenes,
      getAlmacenPrincipal: () => get().almacenes.find((a) => a.es_principal),
      
      setAlmacenSeleccionado: (id) => set({ almacenSeleccionado: id }),

      // ========== CAJAS ==========
      
      setCajas: (cajas) => set({ cajas }),
      
      addCaja: (caja) =>
        set((state) => ({ cajas: [...state.cajas, caja] })),
      
      updateCaja: (id, caja) =>
        set((state) => ({
          cajas: state.cajas.map((c) =>
            c.id === id ? { ...c, ...caja } : c
          )
        })),
      
      getCajaById: (id) => get().cajas.find((c) => c.id === id),

      // ========== TURNO DE CAJA ==========
      
      setTurnoActivo: (turno) => set({ turnoActivo: turno }),
      
      cerrarTurnoActivo: () => set({ turnoActivo: null }),

      // ========== ROLES Y USUARIOS ==========
      
      setRoles: (roles) => set({ roles }),
      
      addRol: (rol) =>
        set((state) => ({ roles: [...state.roles, rol] })),
      
      updateRol: (id, rol) =>
        set((state) => ({
          roles: state.roles.map((r) =>
            r.id === id ? { ...r, ...rol } : r
          )
        })),
      
      setUsuarios: (usuarios) => set({ usuarios }),
      
      addUsuario: (usuario) =>
        set((state) => ({ usuarios: [...state.usuarios, usuario] })),
      
      updateUsuario: (id, usuario) =>
        set((state) => ({
          usuarios: state.usuarios.map((u) =>
            u.id === id ? { ...u, ...usuario } : u
          )
        })),
      
      deleteUsuario: (id) =>
        set((state) => ({
          usuarios: state.usuarios.filter((u) => u.id !== id)
        })),

      // ========== VENTAS ==========
      
      setVentas: (ventas) => set({ ventas }),
      
      addVenta: (venta) =>
        set((state) => ({ ventas: [venta, ...state.ventas] })),
      
      updateVenta: (id, venta) =>
        set((state) => ({
          ventas: state.ventas.map((v) =>
            v.id === id ? { ...v, ...venta } : v
          )
        })),
      
      getVentaById: (id) => get().ventas.find((v) => v.id === id),
      
      getVentaByFolio: (folio) => get().ventas.find((v) => v.folio === folio),

      // ========== COMPRAS ==========
      
      setCompras: (compras) => set({ compras }),
      
      addCompra: (compra) =>
        set((state) => ({ compras: [compra, ...state.compras] })),
      
      updateCompra: (id, compra) =>
        set((state) => ({
          compras: state.compras.map((c) =>
            c.id === id ? { ...c, ...compra } : c
          )
        })),

      // ========== DEVOLUCIONES ==========
      
      setDevoluciones: (devoluciones) => set({ devoluciones }),
      
      addDevolucion: (devolucion) =>
        set((state) => ({ devoluciones: [devolucion, ...state.devoluciones] })),

      // ========== CUENTAS POR COBRAR ==========
      
      setCuentasPorCobrar: (cuentas) => set({ cuentasPorCobrar: cuentas }),
      
      addCuentaPorCobrar: (cuenta) =>
        set((state) => ({ cuentasPorCobrar: [...state.cuentasPorCobrar, cuenta] })),
      
      updateCuentaPorCobrar: (id, cuenta) =>
        set((state) => ({
          cuentasPorCobrar: state.cuentasPorCobrar.map((c) =>
            c.id === id ? { ...c, ...cuenta } : c
          )
        })),
      
      getCuentasPorCliente: (clienteId) =>
        get().cuentasPorCobrar.filter((c) => c.cliente_id === clienteId),
      
      getCuentasVencidas: () =>
        get().cuentasPorCobrar.filter((c) => c.estado === 'vencida'),

      // ========== CONFIGURACIÓN ==========
      
      setConfiguracion: (config) => {
        set({ configuracion: config })
        set(() => ({ lastSync: new Date().toISOString() }))
      },
      
      updateConfiguracion: (key, value) =>
        set((state) => ({
          configuracion: { ...state.configuracion, [key]: value },
          lastSync: new Date().toISOString()
        })),
      
      getConfiguracion: (key, defaultValue = null) => {
        const config = get().configuracion
        return config[key] !== undefined ? config[key] : defaultValue
      }
    }),
    {
      name: 'pos-storage',
      partialize: (state) => ({
        productos: state.productos,
        categorias: state.categorias,
        unidadesMedida: state.unidadesMedida,
        metodosPago: state.metodosPago,
        proveedores: state.proveedores,
        clientes: state.clientes,
        almacenes: state.almacenes,
        cajas: state.cajas,
        roles: state.roles,
        usuarios: state.usuarios,
        configuracion: state.configuracion,
        turnoActivo: state.turnoActivo,
        almacenSeleccionado: state.almacenSeleccionado,
        lastSync: state.lastSync,
      })
    }
  )
)