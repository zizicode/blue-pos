// types/customer.types.ts

export interface Cliente {
    id: number;
    nombre: string;
    telefono: string | null;
    email: string | null;
    direccion: string | null;
    rfc: string | null;
    limite_credito: number;
    saldo_actual: number;
    tipo: 'general' | 'frecuente' | 'mayorista' | 'credito';
    activo: boolean;
    creado_en: string;
    actualizado_en: string;
    eliminado_en: string | null;
  }
  
  // DTOs
  export interface CrearClienteDTO {
    nombre: string;
    telefono?: string;
    email?: string;
    direccion?: string;
    rfc?: string;
    limite_credito?: number;
    tipo?: 'general' | 'frecuente' | 'mayorista' | 'credito';
    activo?: boolean;
  }
  
  export interface ActualizarClienteDTO {
    nombre?: string;
    telefono?: string;
    email?: string;
    direccion?: string;
    rfc?: string;
    limite_credito?: number;
    tipo?: 'general' | 'frecuente' | 'mayorista' | 'credito';
    activo?: boolean;
  }