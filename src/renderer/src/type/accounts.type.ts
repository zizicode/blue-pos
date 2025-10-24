// types/accounts.types.ts

export interface CuentaPorCobrar {
    id: number;
    cliente_id: number;
    venta_id: number;
    monto_total: number;
    monto_pagado: number;
    saldo_pendiente: number;
    fecha_vencimiento: string | null;
    estado: 'pendiente' | 'pagada' | 'vencida' | 'parcial';
    creado_en: string;
    actualizado_en: string;
  }
  
  export interface AbonoCredito {
    id: number;
    cuenta_id: number;
    monto: number;
    metodo_pago_id: number;
    referencia: string | null;
    fecha: string;
    usuario_id: number;
  }
  
  // DTOs
  export interface CrearAbonoDTO {
    cuenta_id: number;
    monto: number;
    metodo_pago_id: number;
    referencia?: string;
  }
  
  export interface CuentaConDetalles extends CuentaPorCobrar {
    abonos: AbonoCredito[];
  }