// types/auth.types.ts

export type Modulo =
  | "ventas"
  | "productos"
  | "clientes"
  | "compras"
  | "inventario"
  | "categorias"
  | "caja"
  | "reportes"
  | "cuentas"
  | "usuarios"
  | "proveedores"
  | "configuracion"
  | "logs"

export type Accion =
  | "crear"
  | "editar"
  | "eliminar"
  | "ver"
  | "cancelar"
  | "ajustar"
  | "transferir"
  | "abrir"
  | "cerrar"
  | "movimientos"
  | "exportar"
  | "cobrar"

export interface Rol {
    id: number;
    nombre: string;
    descripcion: string | null;
    activo: boolean;
    creado_en: string;
    actualizado_en: string;
  }
  
  export interface Usuario {
    id?: number;
    nombre: string;
    email: string | null;
    usuario: string;
    password: string;
    rol_id: number;
    rol_nombre?: string;
    activo?: boolean;
    ultimo_acceso?: string | null;
    creado_en?: string;
    actualizado_en?: string;
    eliminado_en?: string | null;
  }
  
  export interface Permiso {
    id: number;
    modulo: Modulo;
    accion: Accion;
    descripcion: string | null;
  }
  
  export interface RolPermiso {
    rol_id: number;
    permiso_id: number;
  }
  
  // DTOs para formularios (sin campos auto-generados)
  export interface CrearUsuarioDTO {
    nombre: string;
    email?: string;
    usuario: string;
    password: string;
    rol_id: number;
    activo?: boolean;
  }
  
  export interface ActualizarUsuarioDTO {
    nombre?: string;
    email?: string;
    usuario?: string;
    password?: string;
    rol_id?: number;
    activo?: boolean;
  }
  
  export interface LoginDTO {
    usuario: string;
    password: string;
  }
  
  export interface AuthResponse {
    usuario: Usuario;
    rol: Rol;
    permisos: Permiso[];
    token?: string;
  }