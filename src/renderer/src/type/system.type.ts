// types/system.types.ts

export interface Log {
    id: number;
    usuario_id: number | null;
    accion: string;
    modulo: string | null;
    descripcion: string | null;
    ip: string | null;
    fecha: string;
  }
  
  export interface Configuracion {
    id: number;
    clave: string;
    valor: string | null;
    tipo: 'string' | 'number' | 'boolean' | 'json';
    descripcion: string | null;
    actualizado_en: string;
  }
  
  // DTOs
  export interface ActualizarConfiguracionDTO {
    clave: string;
    valor: string;
  }
  
  // Tipos para configuraciones específicas
  export interface ConfiguracionEmpresa {
    nombre_empresa: string;
    rfc_empresa: string;
    direccion_empresa: string;
    telefono_empresa: string;
    email_empresa: string;
    sitio_web: string;
    logo_empresa: string;
  }
  
  export interface ConfiguracionMoneda {
    moneda: string;
    simbolo_moneda: string;
    decimales: number;
  }
  
  export interface ConfiguracionTicket {
    ticket_mensaje_inicial: string;
    ticket_mensaje_final: string;
    impresora_tickets: string;
    ancho_ticket: number;
  }
  
  export interface ConfiguracionVentas {
    permitir_ventas_stock_negativo: boolean;
    dias_credito_predeterminado: number;
    stock_minimo_predeterminado: number;
  }