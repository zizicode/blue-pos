// types/inventory.types.ts

export interface Almacen {
    id: number;
    nombre: string;
    direccion: string | null;
    telefono: string | null;
    es_principal: boolean;
    activo: boolean;
    creado_en: string;
    actualizado_en: string;
  }
  
  export interface Producto {
    id: number;
    codigo: string;
    codigo_barras: string | null;
    nombre: string;
    descripcion: string | null;
    categoria_id: number | null;
    unidad_medida_id: number | null;
    proveedor_id: number | null;
    precio_compra: number;
    precio_venta: number;
    stock_minimo: number;
    stock_actual: number;
    imagen_url: string | null;
    activo: boolean;
    creado_en: string;
    actualizado_en: string;
    eliminado_en: string | null;
  }
  
  export interface StockAlmacen {
    id: number;
    producto_id: number;
    almacen_id: number;
    cantidad: number;
    actualizado_en: string;
  }
  
  export interface MovimientoInventario {
    id: number;
    producto_id: number;
    almacen_id: number | null;
    tipo: 'entrada' | 'salida' | 'ajuste' | 'transferencia';
    cantidad: number;
    stock_anterior: number | null;
    stock_nuevo: number | null;
    referencia_tipo: string | null;
    referencia_id: number | null;
    motivo: string | null;
    usuario_id: number | null;
    fecha: string;
  }
  
  export interface Transferencia {
    id: number;
    folio: string | null;
    almacen_origen_id: number;
    almacen_destino_id: number;
    fecha: string;
    usuario_id: number;
    estado: 'pendiente' | 'completada' | 'cancelada';
    notas: string | null;
  }
  
  export interface DetalleTransferencia {
    id: number;
    transferencia_id: number;
    producto_id: number;
    cantidad: number;
  }
  
  // DTOs
  export interface CrearProductoDTO {
    codigo: string;
    codigo_barras?: string;
    nombre: string;
    descripcion?: string;
    categoria_id?: number;
    unidad_medida_id?: number;
    proveedor_id?: number;
    precio_compra?: number;
    precio_venta: number;
    stock_minimo?: number;
    stock_actual?: number;
    imagen_url?: string;
    activo?: boolean;
  }
  
  export interface ActualizarProductoDTO {
    codigo?: string;
    codigo_barras?: string;
    nombre?: string;
    descripcion?: string;
    categoria_id?: number;
    unidad_medida_id?: number;
    proveedor_id?: number;
    precio_compra?: number;
    precio_venta?: number;
    stock_minimo?: number;
    imagen_url?: string;
    activo?: boolean;
  }
  
  export interface CrearTransferenciaDTO {
    almacen_origen_id: number;
    almacen_destino_id: number;
    notas?: string;
    detalles: {
      producto_id: number;
      cantidad: number;
    }[];
  }
  
  export interface AjustarStockDTO {
    producto_id: number;
    almacen_id: number;
    cantidad: number;
    motivo: string;
    tipo: 'entrada' | 'salida' | 'ajuste';
  }