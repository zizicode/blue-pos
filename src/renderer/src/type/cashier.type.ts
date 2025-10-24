// types/cashier.types.ts

export interface Caja {
    id: number;
    nombre: string;
    almacen_id: number | null;
    activo: boolean;
  }
  
  export interface TurnoCaja {
    id: number;
    caja_id: number;
    usuario_id: number;
    fecha_apertura: string;
    fecha_cierre: string | null;
    monto_inicial: number;
    monto_final: number | null;
    monto_esperado: number | null;
    diferencia: number | null;
    estado: 'abierto' | 'cerrado';
    notas: string | null;
  }
  
  export interface MovimientoCaja {
    id: number;
    turno_id: number;
    tipo: 'entrada' | 'salida' | 'venta' | 'devolucion' | 'abono';
    monto: number;
    metodo_pago_id: number | null;
    referencia_tipo: string | null;
    referencia_id: number | null;
    concepto: string | null;
    fecha: string;
  }
  
  // DTOs
  export interface AbrirTurnoDTO {
    caja_id: number;
    monto_inicial: number;
  }
  
  export interface CerrarTurnoDTO {
    turno_id: number;
    monto_final: number;
    notas?: string;
  }
  
  export interface CrearMovimientoCajaDTO {
    turno_id: number;
    tipo: 'entrada' | 'salida';
    monto: number;
    metodo_pago_id?: number;
    concepto: string;
  }
  
  export interface TurnoConMovimientos extends TurnoCaja {
    movimientos: MovimientoCaja[];
  }