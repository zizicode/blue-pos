// types/catalogs.types.ts

export interface UnidadMedida {
    id: number;
    nombre: string;
    abreviatura: string;
    activo: boolean;
  }
  
  export interface MetodoPago {
    id: number;
    nombre: string;
    requiere_referencia: boolean;
    activo: boolean;
    orden: number;
  }
  
  export interface Categoria {
    id: number;
    nombre: string;
    descripcion: string | null;
    activo: boolean;
    creado_en: string;
    actualizado_en: string;
  }
  
  // DTOs
  export interface CrearCategoriaDTO {
    nombre: string;
    descripcion?: string;
    activo?: boolean;
  }
  
  export interface ActualizarCategoriaDTO {
    nombre?: string;
    descripcion?: string;
    activo?: boolean;
  }