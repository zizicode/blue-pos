-- ============================================
-- SISTEMA POS - INSTALACIÓN COMPLETA
-- Base de datos MySQL con estructura y datos iniciales
-- ============================================

-- Configuración inicial
SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

-- Crear base de datos si no existe
CREATE DATABASE IF NOT EXISTS pos_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE pos_system;

-- ============================================
-- MÓDULO 1: AUTENTICACIÓN Y PERMISOS
-- ============================================

DROP TABLE IF EXISTS roles;
CREATE TABLE roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    descripcion TEXT,
    activo BOOLEAN DEFAULT TRUE,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS usuarios;
CREATE TABLE usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE,
    usuario VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    rol_id INT NOT NULL,
    activo BOOLEAN DEFAULT TRUE,
    ultimo_acceso TIMESTAMP NULL,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    eliminado_en TIMESTAMP NULL,
    FOREIGN KEY (rol_id) REFERENCES roles(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS permisos;
CREATE TABLE permisos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    modulo VARCHAR(50) NOT NULL,
    accion VARCHAR(50) NOT NULL,
    descripcion TEXT,
    UNIQUE KEY unique_permiso (modulo, accion)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS roles_permisos;
CREATE TABLE roles_permisos (
    rol_id INT NOT NULL,
    permiso_id INT NOT NULL,
    PRIMARY KEY (rol_id, permiso_id),
    FOREIGN KEY (rol_id) REFERENCES roles(id) ON DELETE CASCADE,
    FOREIGN KEY (permiso_id) REFERENCES permisos(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- MÓDULO 2: CATÁLOGOS BÁSICOS
-- ============================================

DROP TABLE IF EXISTS unidades_medida;
CREATE TABLE unidades_medida (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL,
    abreviatura VARCHAR(10) NOT NULL,
    activo BOOLEAN DEFAULT TRUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS metodos_pago;
CREATE TABLE metodos_pago (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL,
    requiere_referencia BOOLEAN DEFAULT FALSE,
    activo BOOLEAN DEFAULT TRUE,
    orden INT DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS categorias;
CREATE TABLE categorias (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    activo BOOLEAN DEFAULT TRUE,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- MÓDULO 3: PROVEEDORES
-- ============================================

DROP TABLE IF EXISTS proveedores;
CREATE TABLE proveedores (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    contacto VARCHAR(100),
    telefono VARCHAR(20),
    email VARCHAR(100),
    direccion TEXT,
    rfc VARCHAR(20),
    dias_credito INT DEFAULT 0,
    activo BOOLEAN DEFAULT TRUE,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    eliminado_en TIMESTAMP NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- MÓDULO 4: INVENTARIO
-- ============================================

DROP TABLE IF EXISTS almacenes;
CREATE TABLE almacenes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    direccion TEXT,
    telefono VARCHAR(20),
    es_principal BOOLEAN DEFAULT FALSE,
    activo BOOLEAN DEFAULT TRUE,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS productos;
CREATE TABLE productos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    codigo VARCHAR(50) NOT NULL UNIQUE,
    codigo_barras VARCHAR(50),
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    categoria_id INT,
    unidad_medida_id INT,
    proveedor_id INT,
    precio_compra DECIMAL(10,2) DEFAULT 0,
    precio_venta DECIMAL(10,2) NOT NULL,
    stock_minimo INT DEFAULT 0,
    stock_actual INT DEFAULT 0,
    imagen_url TEXT,
    activo BOOLEAN DEFAULT TRUE,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    eliminado_en TIMESTAMP NULL,
    FOREIGN KEY (categoria_id) REFERENCES categorias(id),
    FOREIGN KEY (unidad_medida_id) REFERENCES unidades_medida(id),
    FOREIGN KEY (proveedor_id) REFERENCES proveedores(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS stock_almacen;
CREATE TABLE stock_almacen (
    id INT AUTO_INCREMENT PRIMARY KEY,
    producto_id INT NOT NULL,
    almacen_id INT NOT NULL,
    cantidad INT DEFAULT 0,
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_stock (producto_id, almacen_id),
    FOREIGN KEY (producto_id) REFERENCES productos(id),
    FOREIGN KEY (almacen_id) REFERENCES almacenes(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS movimientos_inventario;
CREATE TABLE movimientos_inventario (
    id INT AUTO_INCREMENT PRIMARY KEY,
    producto_id INT NOT NULL,
    almacen_id INT,
    tipo VARCHAR(20) NOT NULL,
    cantidad INT NOT NULL,
    stock_anterior INT,
    stock_nuevo INT,
    referencia_tipo VARCHAR(50),
    referencia_id INT,
    motivo TEXT,
    usuario_id INT,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (producto_id) REFERENCES productos(id),
    FOREIGN KEY (almacen_id) REFERENCES almacenes(id),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS transferencias;
CREATE TABLE transferencias (
    id INT AUTO_INCREMENT PRIMARY KEY,
    folio VARCHAR(50) UNIQUE,
    almacen_origen_id INT NOT NULL,
    almacen_destino_id INT NOT NULL,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    usuario_id INT NOT NULL,
    estado VARCHAR(20) DEFAULT 'pendiente',
    notas TEXT,
    FOREIGN KEY (almacen_origen_id) REFERENCES almacenes(id),
    FOREIGN KEY (almacen_destino_id) REFERENCES almacenes(id),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS detalle_transferencias;
CREATE TABLE detalle_transferencias (
    id INT AUTO_INCREMENT PRIMARY KEY,
    transferencia_id INT NOT NULL,
    producto_id INT NOT NULL,
    cantidad INT NOT NULL,
    FOREIGN KEY (transferencia_id) REFERENCES transferencias(id) ON DELETE CASCADE,
    FOREIGN KEY (producto_id) REFERENCES productos(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- MÓDULO 5: COMPRAS
-- ============================================

DROP TABLE IF EXISTS compras;
CREATE TABLE compras (
    id INT AUTO_INCREMENT PRIMARY KEY,
    folio VARCHAR(50) UNIQUE,
    proveedor_id INT NOT NULL,
    almacen_id INT,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    total DECIMAL(10,2) NOT NULL,
    usuario_id INT NOT NULL,
    estado VARCHAR(20) DEFAULT 'completada',
    notas TEXT,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (proveedor_id) REFERENCES proveedores(id),
    FOREIGN KEY (almacen_id) REFERENCES almacenes(id),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS detalle_compras;
CREATE TABLE detalle_compras (
    id INT AUTO_INCREMENT PRIMARY KEY,
    compra_id INT NOT NULL,
    producto_id INT NOT NULL,
    cantidad INT NOT NULL,
    precio_unitario DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (compra_id) REFERENCES compras(id) ON DELETE CASCADE,
    FOREIGN KEY (producto_id) REFERENCES productos(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- MÓDULO 6: CLIENTES
-- ============================================

DROP TABLE IF EXISTS clientes;
CREATE TABLE clientes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    telefono VARCHAR(20),
    email VARCHAR(100),
    direccion TEXT,
    rfc VARCHAR(20),
    limite_credito DECIMAL(10,2) DEFAULT 0,
    saldo_actual DECIMAL(10,2) DEFAULT 0,
    tipo VARCHAR(20) DEFAULT 'general',
    activo BOOLEAN DEFAULT TRUE,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    eliminado_en TIMESTAMP NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- MÓDULO 7: VENTAS
-- ============================================

DROP TABLE IF EXISTS ventas;
CREATE TABLE ventas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    folio VARCHAR(50) UNIQUE,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    cliente_id INT,
    almacen_id INT,
    usuario_id INT NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    descuento DECIMAL(10,2) DEFAULT 0,
    total DECIMAL(10,2) NOT NULL,
    tipo_venta VARCHAR(20) DEFAULT 'contado',
    estado VARCHAR(20) DEFAULT 'completada',
    notas TEXT,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cliente_id) REFERENCES clientes(id),
    FOREIGN KEY (almacen_id) REFERENCES almacenes(id),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS detalle_ventas;
CREATE TABLE detalle_ventas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    venta_id INT NOT NULL,
    producto_id INT NOT NULL,
    cantidad INT NOT NULL,
    precio_unitario DECIMAL(10,2) NOT NULL,
    descuento_porcentaje DECIMAL(5,2) DEFAULT 0,
    descuento_monto DECIMAL(10,2) DEFAULT 0,
    subtotal DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (venta_id) REFERENCES ventas(id) ON DELETE CASCADE,
    FOREIGN KEY (producto_id) REFERENCES productos(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS pagos_venta;
CREATE TABLE pagos_venta (
    id INT AUTO_INCREMENT PRIMARY KEY,
    venta_id INT NOT NULL,
    metodo_pago_id INT NOT NULL,
    monto DECIMAL(10,2) NOT NULL,
    referencia VARCHAR(100),
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (venta_id) REFERENCES ventas(id) ON DELETE CASCADE,
    FOREIGN KEY (metodo_pago_id) REFERENCES metodos_pago(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS devoluciones;
CREATE TABLE devoluciones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    folio VARCHAR(50) UNIQUE,
    venta_id INT NOT NULL,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    motivo TEXT,
    total DECIMAL(10,2) NOT NULL,
    usuario_id INT NOT NULL,
    estado VARCHAR(20) DEFAULT 'completada',
    FOREIGN KEY (venta_id) REFERENCES ventas(id),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS detalle_devoluciones;
CREATE TABLE detalle_devoluciones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    devolucion_id INT NOT NULL,
    producto_id INT NOT NULL,
    cantidad INT NOT NULL,
    precio_unitario DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (devolucion_id) REFERENCES devoluciones(id) ON DELETE CASCADE,
    FOREIGN KEY (producto_id) REFERENCES productos(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- MÓDULO 8: CUENTAS POR COBRAR
-- ============================================

DROP TABLE IF EXISTS cuentas_por_cobrar;
CREATE TABLE cuentas_por_cobrar (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cliente_id INT NOT NULL,
    venta_id INT NOT NULL,
    monto_total DECIMAL(10,2) NOT NULL,
    monto_pagado DECIMAL(10,2) DEFAULT 0,
    saldo_pendiente DECIMAL(10,2) NOT NULL,
    fecha_vencimiento DATE,
    estado VARCHAR(20) DEFAULT 'pendiente',
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (cliente_id) REFERENCES clientes(id),
    FOREIGN KEY (venta_id) REFERENCES ventas(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS abonos_credito;
CREATE TABLE abonos_credito (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cuenta_id INT NOT NULL,
    monto DECIMAL(10,2) NOT NULL,
    metodo_pago_id INT NOT NULL,
    referencia VARCHAR(100),
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    usuario_id INT NOT NULL,
    FOREIGN KEY (cuenta_id) REFERENCES cuentas_por_cobrar(id),
    FOREIGN KEY (metodo_pago_id) REFERENCES metodos_pago(id),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- MÓDULO 9: CAJA
-- ============================================

DROP TABLE IF EXISTS cajas;
CREATE TABLE cajas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    almacen_id INT,
    activo BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (almacen_id) REFERENCES almacenes(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS turnos_caja;
CREATE TABLE turnos_caja (
    id INT AUTO_INCREMENT PRIMARY KEY,
    caja_id INT NOT NULL,
    usuario_id INT NOT NULL,
    fecha_apertura TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_cierre TIMESTAMP NULL,
    monto_inicial DECIMAL(10,2) NOT NULL,
    monto_final DECIMAL(10,2),
    monto_esperado DECIMAL(10,2),
    diferencia DECIMAL(10,2),
    estado VARCHAR(20) DEFAULT 'abierto',
    notas TEXT,
    FOREIGN KEY (caja_id) REFERENCES cajas(id),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS movimientos_caja;
CREATE TABLE movimientos_caja (
    id INT AUTO_INCREMENT PRIMARY KEY,
    turno_id INT NOT NULL,
    tipo VARCHAR(20) NOT NULL,
    monto DECIMAL(10,2) NOT NULL,
    metodo_pago_id INT,
    referencia_tipo VARCHAR(50),
    referencia_id INT,
    concepto TEXT,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (turno_id) REFERENCES turnos_caja(id),
    FOREIGN KEY (metodo_pago_id) REFERENCES metodos_pago(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- MÓDULO 10: AUDITORÍA Y CONFIGURACIÓN
-- ============================================

DROP TABLE IF EXISTS logs;
CREATE TABLE logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT,
    accion VARCHAR(100) NOT NULL,
    modulo VARCHAR(50),
    descripcion TEXT,
    ip VARCHAR(45),
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS configuracion;
CREATE TABLE configuracion (
    id INT AUTO_INCREMENT PRIMARY KEY,
    clave VARCHAR(100) NOT NULL UNIQUE,
    valor TEXT,
    tipo VARCHAR(20) DEFAULT 'string',
    descripcion TEXT,
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- ÍNDICES PARA OPTIMIZACIÓN
-- ============================================

CREATE INDEX idx_productos_codigo ON productos(codigo);
CREATE INDEX idx_productos_codigo_barras ON productos(codigo_barras);
CREATE INDEX idx_productos_categoria ON productos(categoria_id);
CREATE INDEX idx_productos_activo ON productos(activo, eliminado_en);
CREATE INDEX idx_productos_nombre ON productos(nombre);

CREATE INDEX idx_ventas_fecha ON ventas(fecha);
CREATE INDEX idx_ventas_cliente ON ventas(cliente_id);
CREATE INDEX idx_ventas_usuario ON ventas(usuario_id);
CREATE INDEX idx_ventas_folio ON ventas(folio);
CREATE INDEX idx_ventas_estado ON ventas(estado);

CREATE INDEX idx_detalle_ventas_venta ON detalle_ventas(venta_id);
CREATE INDEX idx_detalle_ventas_producto ON detalle_ventas(producto_id);

CREATE INDEX idx_compras_fecha ON compras(fecha);
CREATE INDEX idx_compras_proveedor ON compras(proveedor_id);

CREATE INDEX idx_movimientos_producto ON movimientos_inventario(producto_id);
CREATE INDEX idx_movimientos_fecha ON movimientos_inventario(fecha);
CREATE INDEX idx_movimientos_tipo ON movimientos_inventario(tipo);

CREATE INDEX idx_clientes_nombre ON clientes(nombre);
CREATE INDEX idx_clientes_telefono ON clientes(telefono);
CREATE INDEX idx_clientes_activo ON clientes(activo, eliminado_en);

CREATE INDEX idx_cuentas_cliente ON cuentas_por_cobrar(cliente_id);
CREATE INDEX idx_cuentas_estado ON cuentas_por_cobrar(estado);
CREATE INDEX idx_cuentas_vencimiento ON cuentas_por_cobrar(fecha_vencimiento);

CREATE INDEX idx_logs_fecha ON logs(fecha);
CREATE INDEX idx_logs_usuario ON logs(usuario_id);
CREATE INDEX idx_logs_modulo ON logs(modulo);

-- ============================================
-- DATOS INICIALES
-- ============================================

-- Roles del sistema
INSERT INTO roles (nombre, descripcion) VALUES
('Administrador', 'Acceso completo al sistema'),
('Cajero', 'Operación de caja y ventas básicas'),
('Supervisor', 'Supervisión y reportes avanzados'),
('Almacenista', 'Gestión de inventario y compras');

-- Permisos del sistema
INSERT INTO permisos (modulo, accion, descripcion) VALUES
-- Ventas
('ventas', 'crear', 'Registrar nuevas ventas'),
('ventas', 'ver', 'Consultar ventas'),
('ventas', 'cancelar', 'Cancelar ventas'),
-- Productos
('productos', 'crear', 'Crear productos'),
('productos', 'editar', 'Editar productos'),
('productos', 'eliminar', 'Eliminar productos'),
('productos', 'ver', 'Ver productos'),
-- Clientes
('clientes', 'crear', 'Crear clientes'),
('clientes', 'editar', 'Editar clientes'),
('clientes', 'eliminar', 'Eliminar clientes'),
('clientes', 'ver', 'Ver clientes'),
-- Compras
('compras', 'crear', 'Registrar compras'),
('compras', 'ver', 'Ver compras'),
('compras', 'cancelar', 'Cancelar compras'),
-- Inventario
('inventario', 'ajustar', 'Ajustar stock manualmente'),
('inventario', 'transferir', 'Transferir entre almacenes'),
('inventario', 'ver', 'Ver inventario'),
-- Caja
('caja', 'abrir', 'Abrir turno de caja'),
('caja', 'cerrar', 'Cerrar turno de caja'),
('caja', 'movimientos', 'Registrar entradas/salidas'),
('caja', 'ver', 'Ver movimientos de caja'),
-- Reportes
('reportes', 'ver', 'Ver reportes'),
('reportes', 'exportar', 'Exportar reportes'),
-- Cuentas por cobrar
('cuentas', 'ver', 'Ver cuentas por cobrar'),
('cuentas', 'cobrar', 'Registrar abonos'),
-- Usuarios
('usuarios', 'crear', 'Crear usuarios'),
('usuarios', 'editar', 'Editar usuarios'),
('usuarios', 'eliminar', 'Eliminar usuarios'),
('usuarios', 'ver', 'Ver usuarios'),
-- Proveedores
('proveedores', 'crear', 'Crear proveedores'),
('proveedores', 'editar', 'Editar proveedores'),
('proveedores', 'eliminar', 'Eliminar proveedores'),
('proveedores', 'ver', 'Ver proveedores'),
-- Configuración
('configuracion', 'editar', 'Modificar configuración'),
('configuracion', 'ver', 'Ver configuración'),
-- Logs
('logs', 'ver', 'Ver logs del sistema');

-- Asignar TODOS los permisos al rol Administrador
INSERT INTO roles_permisos (rol_id, permiso_id)
SELECT 1, id FROM permisos;

-- Permisos para Cajero
INSERT INTO roles_permisos (rol_id, permiso_id)
SELECT 2, id FROM permisos WHERE 
    (modulo = 'ventas' AND accion IN ('crear', 'ver')) OR
    (modulo = 'productos' AND accion = 'ver') OR
    (modulo = 'clientes' AND accion IN ('crear', 'ver')) OR
    (modulo = 'caja' AND accion IN ('abrir', 'cerrar', 'movimientos', 'ver')) OR
    (modulo = 'cuentas' AND accion IN ('ver', 'cobrar'));

-- Usuario administrador
-- Password: admin123
INSERT INTO usuarios (nombre, email, usuario, password, rol_id, activo) VALUES
('Administrador del Sistema', 'admin@pos.com', 'admin', '$2b$10$rBV2VxXdYYxEZZWZxd.j4eK7fW9tqXvpqYf6xZQxGXLqZoXyHhMQO', 1, true);

-- Unidades de medida
INSERT INTO unidades_medida (nombre, abreviatura) VALUES
('Unidad', 'UND'),
('Kilogramo', 'KG'),
('Gramo', 'GR'),
('Litro', 'LT'),
('Mililitro', 'ML'),
('Metro', 'MT'),
('Pieza', 'PZ'),
('Caja', 'CJ'),
('Paquete', 'PQ'),
('Docena', 'DOC'),
('Par', 'PAR'),
('Rollo', 'RL');

-- Métodos de pago
INSERT INTO metodos_pago (nombre, requiere_referencia, orden) VALUES
('Efectivo', false, 1),
('Tarjeta de Débito', true, 2),
('Tarjeta de Crédito', true, 3),
('Transferencia Bancaria', true, 4),
('Cheque', true, 5),
('Vale', true, 6);

-- Categorías de productos
INSERT INTO categorias (nombre, descripcion) VALUES
('General', 'Productos sin categoría específica'),
('Alimentos', 'Productos alimenticios'),
('Bebidas', 'Bebidas en general'),
('Limpieza', 'Artículos de limpieza'),
('Cuidado Personal', 'Productos de higiene y cuidado personal'),
('Papelería', 'Artículos de oficina y papelería'),
('Ferretería', 'Herramientas y materiales'),
('Electrónica', 'Aparatos electrónicos'),
('Ropa', 'Vestimenta y calzado'),
('Hogar', 'Artículos para el hogar');

-- Almacén principal
INSERT INTO almacenes (nombre, direccion, telefono, es_principal, activo) VALUES
('Almacén Principal', 'Dirección del almacén principal', '', true, true);

-- Caja principal
INSERT INTO cajas (nombre, almacen_id, activo) VALUES
('Caja 1', 1, true);

-- Configuración del sistema
INSERT INTO configuracion (clave, valor, tipo, descripcion) VALUES
('nombre_empresa', 'Mi Negocio POS', 'string', 'Nombre de la empresa'),
('rfc_empresa', '', 'string', 'RFC de la empresa'),
('direccion_empresa', '', 'string', 'Dirección de la empresa'),
('telefono_empresa', '', 'string', 'Teléfono de contacto'),
('email_empresa', '', 'string', 'Email de contacto'),
('sitio_web', '', 'string', 'Sitio web de la empresa'),
('moneda', 'DOP', 'string', 'Código de moneda'),
('simbolo_moneda', '$', 'string', 'Símbolo de la moneda'),
('decimales', '2', 'number', 'Cantidad de decimales en precios'),
('ticket_mensaje_inicial', '¡Gracias por su compra!', 'string', 'Mensaje al inicio del ticket'),
('ticket_mensaje_final', 'Vuelva pronto', 'string', 'Mensaje al final del ticket'),
('permitir_ventas_stock_negativo', 'false', 'boolean', 'Permitir ventas sin stock'),
('dias_credito_predeterminado', '30', 'number', 'Días de crédito por defecto'),
('stock_minimo_predeterminado', '5', 'number', 'Stock mínimo por defecto'),
('impresora_tickets', '', 'string', 'Nombre de la impresora de tickets'),
('ancho_ticket', '80', 'number', 'Ancho del ticket en mm'),
('logo_empresa', '', 'string', 'URL del logo de la empresa');

-- Cliente genérico (público general)
INSERT INTO clientes (nombre, tipo, activo) VALUES
('Público General', 'general', true);

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================
-- VERIFICACIÓN DE INSTALACIÓN
-- ============================================

SELECT 'Base de datos instalada correctamente' as Mensaje;
SELECT COUNT(*) as 'Total de Tablas' FROM information_schema.tables WHERE table_schema = 'pos_system';
SELECT 'Usuario: admin | Password: admin123' as 'Credenciales Iniciales';