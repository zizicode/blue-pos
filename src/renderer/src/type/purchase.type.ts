// types/purchase.types.ts

export interface Compra {
    id: number;
    folio: string | null;
    proveedor_id: number;
    almacen_id: number | null;
    fecha: string;
    total: number;
    usuario_id: number;
    estado: 'completada' | 'cancelada' | 'pendiente';
    notas: string | null;
    creado_en: string;
  }
  
  export interface DetalleCompra {
    id: number;
    compra_id: number;
    producto_id: number;
    cantidad: number;
    precio_unitario: number;
    subtotal: number;
  }
  
  // DTOs
  export interface CrearCompraDTO {
    proveedor_id: number;
    almacen_id?: number;
    notas?: string;
    detalles: {
      producto_id: number;
      cantidad: number;
      precio_unitario: number;
    }[];
  }
  
  export interface CompraConDetalles extends Compra {
    detalles: DetalleCompra[];
  }