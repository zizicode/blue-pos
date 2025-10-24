// types/sales.types.ts

export interface Venta {
    id: number;
    folio: string | null;
    fecha: string;
    cliente_id: number | null;
    almacen_id: number | null;
    usuario_id: number;
    subtotal: number;
    descuento: number;
    total: number;
    tipo_venta: 'contado' | 'credito';
    estado: 'completada' | 'cancelada' | 'pendiente';
    notas: string | null;
    creado_en: string;
  }
  
  export interface DetalleVenta {
    id: number;
    venta_id: number;
    producto_id: number;
    cantidad: number;
    precio_unitario: number;
    descuento_porcentaje: number;
    descuento_monto: number;
    subtotal: number;
  }
  
  export interface PagoVenta {
    id: number;
    venta_id: number;
    metodo_pago_id: number;
    monto: number;
    referencia: string | null;
    fecha: string;
  }
  
  export interface Devolucion {
    id: number;
    folio: string | null;
    venta_id: number;
    fecha: string;
    motivo: string | null;
    total: number;
    usuario_id: number;
    estado: 'completada' | 'cancelada';
  }
  
  export interface DetalleDevolucion {
    id: number;
    devolucion_id: number;
    producto_id: number;
    cantidad: number;
    precio_unitario: number;
    subtotal: number;
  }
  
  // DTOs
  export interface CrearVentaDTO {
    cliente_id?: number;
    almacen_id?: number;
    tipo_venta?: 'contado' | 'credito';
    notas?: string;
    detalles: {
      producto_id: number;
      cantidad: number;
      precio_unitario: number;
      descuento_porcentaje?: number;
      descuento_monto?: number;
    }[];
    pagos: {
      metodo_pago_id: number;
      monto: number;
      referencia?: string;
    }[];
  }
  
  export interface VentaConDetalles extends Venta {
    detalles: DetalleVenta[];
    pagos: PagoVenta[];
  }
  
  export interface CrearDevolucionDTO {
    venta_id: number;
    motivo?: string;
    detalles: {
      producto_id: number;
      cantidad: number;
      precio_unitario: number;
    }[];
  }
  
  export interface DevolucionConDetalles extends Devolucion {
    detalles: DetalleDevolucion[];
  }