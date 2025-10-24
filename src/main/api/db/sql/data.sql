-- ============================================
-- DATOS INICIALES DEL SISTEMA
-- ============================================

-- Roles básicos
INSERT INTO roles (nombre, descripcion) VALUES 
('Administrador', 'Acceso total al sistema'),
('Gerente', 'Gestión de inventario, ventas y reportes'),
('Cajero', 'Realizar ventas y gestionar caja'),
('Almacenista', 'Gestión de inventario y compras');

-- Permisos del sistema
INSERT INTO permisos (modulo, accion, descripcion) VALUES 
-- Usuarios
('usuarios', 'crear', 'Crear nuevos usuarios'),
('usuarios', 'leer', 'Ver usuarios'),
('usuarios', 'actualizar', 'Editar usuarios'),
('usuarios', 'eliminar', 'Eliminar usuarios'),

-- Productos
('productos', 'crear', 'Crear productos'),
('productos', 'leer', 'Ver productos'),
('productos', 'actualizar', 'Editar productos'),
('productos', 'eliminar', 'Eliminar productos'),

-- Ventas
('ventas', 'crear', 'Realizar ventas'),
('ventas', 'leer', 'Ver ventas'),
('ventas', 'cancelar', 'Cancelar ventas'),
('ventas', 'aplicar_descuento', 'Aplicar descuentos'),

-- Compras
('compras', 'crear', 'Registrar compras'),
('compras', 'leer', 'Ver compras'),
('compras', 'cancelar', 'Cancelar compras'),

-- Inventario
('inventario', 'ajustar', 'Ajustar inventario'),
('inventario', 'transferir', 'Transferir entre almacenes'),
('inventario', 'leer', 'Ver inventario'),

-- Caja
('caja', 'abrir', 'Abrir turno de caja'),
('caja', 'cerrar', 'Cerrar turno de caja'),
('caja', 'movimientos', 'Registrar entradas/salidas'),

-- Clientes
('clientes', 'crear', 'Crear clientes'),
('clientes', 'leer', 'Ver clientes'),
('clientes', 'actualizar', 'Editar clientes'),
('clientes', 'credito', 'Gestionar créditos'),

-- Reportes
('reportes', 'ventas', 'Ver reportes de ventas'),
('reportes', 'inventario', 'Ver reportes de inventario'),
('reportes', 'financieros', 'Ver reportes financieros'),

-- Configuración
('configuracion', 'leer', 'Ver configuración'),
('configuracion', 'actualizar', 'Modificar configuración');

-- Asignar todos los permisos al Administrador
INSERT INTO roles_permisos (rol_id, permiso_id)
SELECT 1, id FROM permisos;

-- Asignar permisos al Gerente (todos excepto usuarios y configuración)
INSERT INTO roles_permisos (rol_id, permiso_id)
SELECT 2, id FROM permisos 
WHERE modulo NOT IN ('usuarios', 'configuracion');

-- Asignar permisos al Cajero (ventas, caja, clientes básico)
INSERT INTO roles_permisos (rol_id, permiso_id)
SELECT 3, id FROM permisos 
WHERE modulo IN ('ventas', 'caja', 'productos') AND accion IN ('crear', 'leer')
   OR modulo = 'clientes' AND accion IN ('crear', 'leer');

-- Asignar permisos al Almacenista (inventario, compras, productos)
INSERT INTO roles_permisos (rol_id, permiso_id)
SELECT 4, id FROM permisos 
WHERE modulo IN ('inventario', 'compras', 'productos');

-- Usuario administrador por defecto (password: admin123)
INSERT INTO usuarios (nombre, email, usuario, password, rol_id) VALUES 
('Administrador', 'admin@sistema.com', 'admin', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 1);

-- Unidades de medida
INSERT INTO unidades_medida (nombre, abreviatura) VALUES 
('Pieza', 'pz'),
('Kilogramo', 'kg'),
('Gramo', 'g'),
('Litro', 'lt'),
('Mililitro', 'ml'),
('Metro', 'm'),
('Centímetro', 'cm'),
('Caja', 'cja'),
('Paquete', 'paq'),
('Docena', 'dz');

-- Métodos de pago
INSERT INTO metodos_pago (nombre, requiere_referencia, orden) VALUES 
('Efectivo', FALSE, 1),
('Tarjeta de Débito', TRUE, 2),
('Tarjeta de Crédito', TRUE, 3),
('Transferencia', TRUE, 4),
('Cheque', TRUE, 5),
('Vales', TRUE, 6);

-- Categorías de ejemplo
INSERT INTO categorias (nombre, descripcion) VALUES 
('General', 'Productos sin categoría específica'),
('Abarrotes', 'Productos de abarrotes y despensa'),
('Bebidas', 'Bebidas y refrescos'),
('Lácteos', 'Productos lácteos'),
('Carnes', 'Carnes y embutidos'),
('Frutas y Verduras', 'Productos frescos'),
('Limpieza', 'Productos de limpieza'),
('Higiene Personal', 'Productos de cuidado personal');

-- Almacén principal
INSERT INTO almacenes (nombre, direccion, es_principal) VALUES 
('Almacén Principal', 'Dirección del almacén principal', TRUE);

-- Caja principal
INSERT INTO cajas (nombre, almacen_id) VALUES 
('Caja 1', 1);

-- Cliente genérico
INSERT INTO clientes (nombre, telefono, tipo) VALUES 
('Cliente General', '', 'general');

-- Configuración inicial del sistema
INSERT INTO configuracion (clave, valor, tipo, descripcion) VALUES 
('nombre_negocio', 'Mi Tienda', 'string', 'Nombre del negocio'),
('moneda', 'MXN', 'string', 'Moneda del sistema (MXN, USD, etc)'),
('simbolo_moneda', '$', 'string', 'Símbolo de la moneda'),
('decimales', '2', 'number', 'Decimales para precios'),
('stock_negativo', 'false', 'boolean', 'Permitir ventas con stock negativo'),
('alerta_stock_minimo', 'true', 'boolean', 'Alertar cuando stock < stock_minimo'),
('dias_credito_default', '30', 'number', 'Días de crédito por defecto'),
('formato_folio_venta', 'V-{YYYY}{MM}{DD}-{####}', 'string', 'Formato de folio de ventas'),
('formato_folio_compra', 'C-{YYYY}{MM}{DD}-{####}', 'string', 'Formato de folio de compras'),
('iva_incluido', 'true', 'boolean', 'Los precios ya incluyen impuestos'),
('requiere_cliente_venta', 'false', 'boolean', 'Requerir cliente en todas las ventas'),
('imprimir_ticket_automatico', 'true', 'boolean', 'Imprimir ticket automáticamente al completar venta');
