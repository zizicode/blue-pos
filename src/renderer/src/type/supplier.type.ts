// types/supplier.types.ts

export interface Proveedor {
    id: number;
    nombre: string;
    contacto: string | null;
    telefono: string | null;
    email: string | null;
    direccion: string | null;
    rfc: string | null;
    dias_credito: number;
    activo: boolean;
    creado_en: string;
    actualizado_en: string;
    eliminado_en: string | null;
  }
  
  // DTOs
  export interface CrearProveedorDTO {
    nombre: string;
    contacto?: string;
    telefono?: string;
    email?: string;
    direccion?: string;
    rfc?: string;
    dias_credito?: number;
    activo?: boolean;
  }
  
  export interface ActualizarProveedorDTO {
    nombre?: string;
    contacto?: string;
    telefono?: string;
    email?: string;
    direccion?: string;
    rfc?: string;
    dias_credito?: number;
    activo?: boolean;
  }