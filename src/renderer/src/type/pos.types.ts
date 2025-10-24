// src/renderer/types/pos.types.ts

/**
 * TIPOS COMPLETOS PARA EL SISTEMA POS
 * Exporta estos tipos desde aquí para usarlos en toda la app
 */

// ============================================
// TIPOS BASE
// ============================================

export interface Producto {
    id?: number
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
    creado_en?: string
    actualizado_en?: string
  }
  
  export interface Categoria {
    id: number
    nombre: string
    descripcion?: string
    activo: boolean
    creado_en?: string
    actualizado_en?: string
  }
  
  export interface UnidadMedida {
    id: number
    nombre: string
    abreviatura: string
    activo: boolean
  }
  
  export interface MetodoPago {
    id: number
    nombre: string
    requiere_referencia: boolean
    activo: boolean
    orden: number
  }
  
  export interface Proveedor {
    id: number
    nombre: string
    contacto?: string
    telefono?: string
    email?: string
    direccion?: string
    rfc?: string
    dias_credito: number
    activo: boolean
    creado_en?: string
    actualizado_en?: string
  }
  
  export interface Cliente {
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
    creado_en?: string
    actualizado_en?: string
  }
  
  export interface Almacen {
    id: number
    nombre: string
    direccion?: string
    telefono?: string
    es_principal: boolean
    activo: boolean
    creado_en?: string
    actualizado_en?: string
  }
  
  export interface Caja {
    id: number
    nombre: string
    almacen_id?: number
    almacen_nombre?: string
    activo: boolean
  }
  
  export interface TurnoCaja {
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
  
  export interface Venta {
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
  
  export interface DetalleVenta {
    id: number
    venta_id: number
    producto_id: number
    producto_nombre?: string
    cantidad: number
    precio_unitario: number
    descuento_porcentaje: number
    descuento_monto: number
    subtotal: number
  }
  
  export interface PagoVenta {
    id: number
    venta_id: number
    metodo_pago_id: number
    metodo_pago_nombre?: string
    monto: number
    referencia?: string
    fecha: string
  }
  
  export interface CuentaPorCobrar {
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
    creado_en?: string
    actualizado_en?: string
  }
  
  export interface AbonoCredito {
    id: number
    cuenta_id: number
    monto: number
    metodo_pago_id: number
    metodo_pago_nombre?: string
    referencia?: string
    fecha: string
    usuario_id: number
    usuario_nombre?: string
  }
  
  export interface Compra {
    id: number
    folio: string
    proveedor_id: number
    proveedor_nombre?: string
    almacen_id?: number
    fecha: string
    total: number
    usuario_id: number
    estado: 'completada' | 'cancelada'
    notas?: string
    creado_en?: string
  }
  
  export interface DetalleCompra {
    id: number
    compra_id: number
    producto_id: number
    producto_nombre?: string
    cantidad: number
    precio_unitario: number
    subtotal: number
  }
  
  export interface Devolucion {
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
  
  export interface Rol {
    id: number
    nombre: string
    descripcion?: string
    activo: boolean
    creado_en?: string
    actualizado_en?: string
  }
  
  export interface Usuario {
    id: number
    nombre: string
    email?: string
    usuario: string
    rol_id: number
    rol_nombre?: string
    activo: boolean
    ultimo_acceso?: string
    creado_en?: string
    actualizado_en?: string
  }
  
  export interface Permiso {
    id: number
    modulo: string
    accion: string
    descripcion?: string
  }
  
  export interface MovimientoInventario {
    id: number
    producto_id: number
    producto_nombre?: string
    almacen_id?: number
    almacen_nombre?: string
    tipo: 'entrada' | 'salida' | 'ajuste' | 'transferencia'
    cantidad: number
    stock_anterior?: number
    stock_nuevo?: number
    referencia_tipo?: string
    referencia_id?: number
    motivo?: string
    usuario_id?: number
    usuario_nombre?: string
    fecha: string
  }
  
  export interface MovimientoCaja {
    id: number
    turno_id: number
    tipo: 'entrada' | 'salida' | 'venta' | 'devolucion' | 'abono'
    monto: number
    metodo_pago_id?: number
    metodo_pago_nombre?: string
    referencia_tipo?: string
    referencia_id?: number
    concepto?: string
    fecha: string
  }
  
  // ============================================
  // TIPOS PARA CONFIGURACIÓN
  // ============================================
  
  export interface ConfiguracionSistema {
    nombre_empresa: string
    rfc_empresa: string
    direccion_empresa: string
    telefono_empresa: string
    email_empresa: string
    sitio_web: string
    moneda: string
    simbolo_moneda: string
    decimales: number
    ticket_mensaje_inicial: string
    ticket_mensaje_final: string
    permitir_ventas_stock_negativo: boolean
    dias_credito_predeterminado: number
    stock_minimo_predeterminado: number
    impresora_tickets: string
    ancho_ticket: number
    logo_empresa: string
  }
  
  // ============================================
  // TIPOS PARA SELECTS/OPCIONES
  // ============================================
  
  export interface Option<T = any> {
    value: T
    label: string
    disabled?: boolean
  }
  
  export interface SelectOption extends Option<number | string> {}
  
  // ============================================
  // TIPOS PARA TABLAS
  // ============================================
  
  export interface ColumnDef<T> {
    key: keyof T | string
    header: string
    sortable?: boolean
    filterable?: boolean
    render?: (value: any, row: T) => React.ReactNode
    width?: string
  }
  
  export interface TableProps<T> {
    data: T[]
    columns: ColumnDef<T>[]
    onRowClick?: (row: T) => void
    loading?: boolean
    emptyMessage?: string
  }
  
  // ============================================
  // TIPOS PARA MODALES/DIALOGS
  // ============================================
  
  export interface ModalProps {
    open: boolean
    onClose: () => void
    title?: string
    children: React.ReactNode
  }
  
  export interface ConfirmDialogProps {
    open: boolean
    title: string
    message: string
    onConfirm: () => void
    onCancel: () => void
    variant?: 'default' | 'destructive'
  }
  
  // ============================================
  // TIPOS PARA HOOKS
  // ============================================
  
  export interface UseTableReturn<T> {
    data: T[]
    loading: boolean
    error: string | null
    page: number
    limit: number
    total: number
    totalPages: number
    setPage: (page: number) => void
    setLimit: (limit: number) => void
    refresh: () => Promise<void>
  }
  
  export interface UseFormReturn<T> {
    values: T
    errors: Record<keyof T, string>
    touched: Record<keyof T, boolean>
    handleChange: (field: keyof T, value: any) => void
    handleBlur: (field: keyof T) => void
    handleSubmit: (onSubmit: (values: T) => void) => (e: React.FormEvent) => void
    reset: () => void
    setValues: (values: Partial<T>) => void
  }
  
  // ============================================
  // TIPOS PARA ESTADOS DE UI
  // ============================================
  
  export interface LoadingState {
    isLoading: boolean
    message?: string
    progress?: number
  }
  
  export interface ErrorState {
    hasError: boolean
    message?: string
    details?: string
  }
  
  export interface ToastMessage {
    id?: string
    type: 'success' | 'error' | 'warning' | 'info'
    title?: string
    message: string
    duration?: number
  }
  
  // ============================================
  // TIPOS PARA PERMISOS
  // ============================================
  
  export interface PermisoUsuario {
    modulo: string
    acciones: string[]
  }
  
  export interface CheckPermisoParams {
    modulo: string
    accion: string
  }
  
  // ============================================
  // HELPERS DE TIPOS
  // ============================================
  
  // Hacer todos los campos opcionales excepto los especificados
  export type PartialExcept<T, K extends keyof T> = Partial<T> & Pick<T, K>
  
  // Hacer todos los campos requeridos excepto los especificados
  export type RequiredExcept<T, K extends keyof T> = Required<Omit<T, K>> & Pick<T, K>
  
  // Tipo para IDs
  export type ID = number
  
  // Tipo para fechas en formato ISO
  export type ISODate = string
  
  // Tipo para montos monetarios
  export type Money = number
  
  // ============================================
  // CONSTANTES DE TIPOS
  // ============================================
  
  export const TIPOS_VENTA = ['contado', 'credito'] as const
  export const TIPOS_CLIENTE = ['general', 'mayorista', 'vip'] as const
  export const ESTADOS_VENTA = ['completada', 'cancelada'] as const
  export const ESTADOS_CUENTA = ['pendiente', 'pagada', 'vencida'] as const
  export const ESTADOS_TURNO = ['abierto', 'cerrado'] as const
  export const TIPOS_MOVIMIENTO = ['entrada', 'salida', 'ajuste', 'transferencia'] as const
  
  // ============================================
  // GUARDS DE TIPOS (Type Guards)
  // ============================================
  
  export function isProducto(obj: any): obj is Producto {
    return (
      obj &&
      typeof obj.id === 'number' &&
      typeof obj.codigo === 'string' &&
      typeof obj.nombre === 'string' &&
      typeof obj.precio_venta === 'number'
    )
  }
  
  export function isCliente(obj: any): obj is Cliente {
    return (
      obj &&
      typeof obj.id === 'number' &&
      typeof obj.nombre === 'string'
    )
  }
  
  export function isVenta(obj: any): obj is Venta {
    return (
      obj &&
      typeof obj.id === 'number' &&
      typeof obj.folio === 'string' &&
      typeof obj.total === 'number'
    )
  }
  
  // ============================================
  // TIPOS PARA VALIDACIONES
  // ============================================
  
  export interface ValidationRule<T = any> {
    required?: boolean
    min?: number
    max?: number
    minLength?: number
    maxLength?: number
    pattern?: RegExp
    custom?: (value: T) => boolean | string
    message?: string
  }
  
  export type ValidationRules<T> = {
    [K in keyof T]?: ValidationRule<T[K]>
  }
  
  // ============================================
  // TIPOS PARA EVENTOS PERSONALIZADOS
  // ============================================
  
  export interface CustomEventMap {
    'producto:created': { producto: Producto }
    'producto:updated': { producto: Producto }
    'producto:deleted': { id: number }
    'venta:completed': { venta: Venta }
    'turno:opened': { turno: TurnoCaja }
    'turno:closed': { turno: TurnoCaja }
    'abono:registered': { abono: AbonoCredito }
  }
  
  export type CustomEventName = keyof CustomEventMap
  export type CustomEventData<T extends CustomEventName> = CustomEventMap[T]
  
  // ============================================
  // TIPOS PARA IMPRESIÓN
  // ============================================
  
  export interface TicketData {
    venta: Venta
    detalles: DetalleVenta[]
    pagos: PagoVenta[]
    empresa: {
      nombre: string
      rfc: string
      direccion: string
      telefono: string
    }
    mensajes: {
      inicial: string
      final: string
    }
  }
  
  export interface ReporteImprimir {
    titulo: string
    fecha: string
    usuario: string
    datos: any[]
    totales?: Record<string, any>
  }
  
  // ============================================
  // EXPORTACIÓN DE TIPOS ÚTILES
  // ============================================
  
  export type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
  }
  
  export type Nullable<T> = T | null
  
  export type Optional<T> = T | undefined
  
  export type ArrayElement<T> = T extends (infer U)[] ? U : never
  
  // ============================================
  // EJEMPLOS DE USO
  // ============================================
  
  /*
  
  // 1. Uso en componentes
  import { Producto, FiltrosProducto } from '@/types/pos.types'
  
  function ProductosList() {
    const [filtros, setFiltros] = useState<FiltrosProducto>({
      busqueda: '',
      activo: true,
      page: 1,
      limit: 50
    })
    
    const productos = usePOSStore((state) => state.productos)
    
    return <div>...</div>
  }
  
  // 2. Uso en formularios
  import { ProductoFormData } from '@/types/pos.types'
  
  function ProductoForm() {
    const [formData, setFormData] = useState<ProductoFormData>({
      codigo: '',
      nombre: '',
      precio_compra: 0,
      precio_venta: 0,
      stock_minimo: 0
    })
    
    return <form>...</form>
  }
  
  // 3. Uso en hooks personalizados
  import { ApiResponse, PaginatedResponse, Producto } from '@/types/pos.types'
  
  function useProductos() {
    const [productos, setProductos] = useState<Producto[]>([])
    
    const loadProductos = async (): Promise<ApiResponse<Producto[]>> => {
      const result = await window.ipc.invoke('productos:getAll')
      return result
    }
    
    return { productos, loadProductos }
  }
  
  // 4. Uso de Type Guards
  import { isProducto } from '@/types/pos.types'
  
  function procesarDato(dato: unknown) {
    if (isProducto(dato)) {
      // TypeScript sabe que dato es un Producto
      console.log(dato.nombre)
      console.log(dato.precio_venta)
    }
  }
  
  // 5. Uso de Validation Rules
  import { ValidationRules, ProductoFormData } from '@/types/pos.types'
  
  const productValidationRules: ValidationRules<ProductoFormData> = {
    codigo: {
      required: true,
      minLength: 3,
      message: 'El código debe tener al menos 3 caracteres'
    },
    nombre: {
      required: true,
      minLength: 3,
      message: 'El nombre es requerido'
    },
    precio_venta: {
      required: true,
      min: 0.01,
      message: 'El precio debe ser mayor a 0'
    }
  }
  
  // 6. Uso en Zustand Store (ya implementado)
  import { Producto, Cliente } from '@/types/pos.types'
  
  interface POSState {
    productos: Producto[]
    clientes: Cliente[]
    // ...
  }
  
  // 7. Uso en props de componentes
  import { Producto, ColumnDef } from '@/types/pos.types'
  
  interface ProductosTableProps {
    productos: Producto[]
    columns: ColumnDef<Producto>[]
    onEdit: (producto: Producto) => void
    onDelete: (id: number) => void
  }
  
  function ProductosTable({ productos, columns, onEdit, onDelete }: ProductosTableProps) {
    return <table>...</table>
  }
  
  // 8. Uso con Partial para updates
  import { Producto } from '@/types/pos.types'
  
  async function updateProducto(id: number, cambios: Partial<Producto>) {
    // Solo necesitas pasar los campos que quieres actualizar
    const result = await window.ipc.invoke('productos:update', {
      id,
      ...cambios
    })
  }
  
  // Ejemplo de llamada
  updateProducto(1, { 
    precio_venta: 150,
    stock_actual: 20 
  })
  
  // 9. Uso con Pick para crear tipos derivados
  import { Producto } from '@/types/pos.types'
  
  // Solo los campos necesarios para el listado
  type ProductoListItem = Pick<Producto, 'id' | 'codigo' | 'nombre' | 'precio_venta' | 'stock_actual'>
  
  // Solo los campos editables
  type ProductoEditable = Omit<Producto, 'id' | 'creado_en' | 'actualizado_en'>
  
  // 10. Uso con Record para mapeos
  import { Producto } from '@/types/pos.types'
  
  type ProductosMap = Record<number, Producto>
  
  const productosById: ProductosMap = {
    1: { id: 1, codigo: 'P001', nombre: 'Producto 1', ... },
    2: { id: 2, codigo: 'P002', nombre: 'Producto 2', ... }
  }
  
  */ // FORMULARIOS
  // ============================================
  
  export interface ProductoFormData {
    codigo: string
    codigo_barras?: string
    nombre: string
    descripcion?: string
    categoria_id?: number
    unidad_medida_id?: number
    proveedor_id?: number
    precio_compra: number
    precio_venta: number
    stock_minimo: number
    stock_actual?: number
    imagen_url?: string
    activo?: boolean
  }
  
  export interface ClienteFormData {
    nombre: string
    telefono?: string
    email?: string
    direccion?: string
    rfc?: string
    limite_credito?: number
    tipo?: 'general' | 'mayorista' | 'vip'
    activo?: boolean
  }
  
  export interface VentaFormData {
    cliente_id?: number
    almacen_id?: number
    usuario_id: number
    tipo_venta: 'contado' | 'credito'
    descuento?: number
    fecha_vencimiento?: string
    notas?: string
    detalles: Array<{
      producto_id: number
      cantidad: number
      precio_unitario: number
      descuento_porcentaje?: number
      descuento_monto?: number
      subtotal: number
    }>
    pagos: Array<{
      metodo_pago_id: number
      monto: number
      referencia?: string
    }>
  }
  
  export interface CompraFormData {
    proveedor_id: number
    almacen_id?: number
    usuario_id: number
    notas?: string
    detalles: Array<{
      producto_id: number
      cantidad: number
      precio_unitario: number
      subtotal: number
    }>
  }
  
  export interface AbonoFormData {
    cuenta_id: number
    monto: number
    metodo_pago_id: number
    referencia?: string
    usuario_id: number
  }
  
  // ============================================
  // TIPOS PARA FILTROS
  // ============================================
  
  export interface FiltrosProducto {
    busqueda?: string
    categoria_id?: number
    proveedor_id?: number
    activo?: boolean
    stock_bajo?: boolean
    page?: number
    limit?: number
  }
  
  export interface FiltrosVenta {
    fecha_inicio?: string
    fecha_fin?: string
    cliente_id?: number
    usuario_id?: number
    tipo_venta?: 'contado' | 'credito'
    estado?: 'completada' | 'cancelada'
    page?: number
    limit?: number
  }
  
  export interface FiltrosCliente {
    busqueda?: string
    tipo?: 'general' | 'mayorista' | 'vip'
    activo?: boolean
    con_saldo?: boolean
    page?: number
    limit?: number
  }
  
  export interface FiltrosCuentaPorCobrar {
    cliente_id?: number
    estado?: 'pendiente' | 'pagada' | 'vencida'
    vencidas?: boolean
    fecha_inicio?: string
    fecha_fin?: string
    page?: number
    limit?: number
  }
  
  // ============================================
  // TIPOS PARA RESPUESTAS API
  // ============================================
  
  export interface ApiResponse<T = any> {
    success: boolean
    message?: string
    data?: T
    error?: string
  }
  
  export interface PaginatedResponse<T> {
    success: boolean
    data: T[]
    pagination: {
      page: number
      limit: number
      total: number
      totalPages: number
    }
  }
  
  // ============================================
  // TIPOS PARA REPORTES
  // ============================================
  
  export interface EstadisticasVentas {
    total_ventas: number
    monto_total: number
    ticket_promedio: number
    ventas_contado: number
    ventas_credito: number
  }
  
  export interface ResumenCuentasPorCobrar {
    total_cuentas: number
    total_pendiente: number
    total_vencido: number
    total_vigente: number
    cuentas_vencidas: number
    cuentas_vigentes: number
  }
  
  export interface ProductoMasVendido {
    codigo: string
    nombre: string
    categoria?: string
    cantidad_vendida: number
    monto_total: number
    precio_promedio: number
  }
  
  export interface DashboardStats {
    ventas: EstadisticasVentas
    compras: {
      total_compras: number
      monto_total: number
    }
    cuentas_por_cobrar: ResumenCuentasPorCobrar
    stock_bajo: {
      total_productos: number
    }
    top_productos: ProductoMasVendido[]
    ventas_por_dia: Array<{
      fecha: string
      num_ventas: number
      monto_total: number
    }>
  }
  
  // ============================================
  // TIPOS PARA ITEMS DE CARRITO (POS)
  // ============================================
  
  export interface ItemCarrito {
    producto: Producto
    cantidad: number
    precio_unitario: number
    descuento_porcentaje: number
    descuento_monto: number
    subtotal: number
  }
  
  // ============================================
  // TIPOS UTILITARIOS
  // ============================================
  
  export type EstadoVenta = 'completada' | 'cancelada'
  export type TipoVenta = 'contado' | 'credito'
  export type TipoCliente = 'general' | 'mayorista' | 'vip'
  export type EstadoCuenta = 'pendiente' | 'pagada' | 'vencida'
  export type EstadoTurno = 'abierto' | 'cerrado'
  export type TipoMovimiento = 'entrada' | 'salida' | 'ajuste' | 'transferencia'
  export type TipoMovimientoCaja = 'entrada' | 'salida' | 'venta' | 'devolucion' | 'abono'
  
  // ============================================
  // TIPOS PARA