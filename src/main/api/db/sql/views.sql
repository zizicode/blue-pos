-- ============================================
-- VISTAS PARA REPORTES Y CONSULTAS
-- ============================================

-- Vista: Productos con stock bajo
CREATE OR REPLACE VIEW v_productos_stock_bajo AS
SELECT 
    p.id,
    p.codigo,
    p.nombre,
    c.nombre AS categoria,
    p.stock_actual,
    p.stock_minimo,
    p.precio_venta,
    pr.nombre AS proveedor
FROM productos p
LEFT JOIN categorias c ON p.categoria_id = c.id
LEFT JOIN proveedores pr ON p.proveedor_id = pr.id
WHERE p.stock_actual <= p.stock_minimo
AND p.activo = TRUE
AND p.eliminado_en IS NULL
ORDER BY p.stock_actual ASC;

-- Vista: Ventas del día
CREATE OR REPLACE VIEW v_ventas_hoy AS
SELECT 
    v.id,
    v.folio,
    v.fecha,
    c.nombre AS cliente,
    u.nombre AS vendedor,
    v.subtotal,
    v.descuento,
    v.total,
    v.tipo_venta,
    v.estado
FROM ventas v
LEFT JOIN clientes c ON v.cliente_id = c.id
INNER JOIN usuarios u ON v.usuario_id = u.id
WHERE DATE(v.fecha) = CURDATE()
ORDER BY v.fecha DESC;

-- Vista: Productos más vendidos
CREATE OR REPLACE VIEW v_productos_mas_vendidos AS
SELECT 
    p.id,
    p.codigo,
    p.nombre,
    c.nombre AS categoria,
    SUM(dv.cantidad) AS total_vendido,
    SUM(dv.subtotal) AS total_ingresos,
    COUNT(DISTINCT dv.venta_id) AS num_ventas
FROM detalle_ventas dv
INNER JOIN productos p ON dv.producto_id = p.id
LEFT JOIN categorias c ON p.categoria_id = c.id
INNER JOIN ventas v ON dv.venta_id = v.id
WHERE v.estado = 'completada'
AND DATE(v.fecha) >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
GROUP BY p.id, p.codigo, p.nombre, c.nombre
ORDER BY total_vendido DESC
LIMIT 50;

-- Vista: Cuentas por cobrar vencidas
CREATE OR REPLACE VIEW v_cuentas_vencidas AS
SELECT 
    cpc.id,
    c.nombre AS cliente,
    c.telefono,
    v.folio AS folio_venta,
    cpc.monto_total,
    cpc.monto_pagado,
    cpc.saldo_pendiente,
    cpc.fecha_vencimiento,
    DATEDIFF(CURDATE(), cpc.fecha_vencimiento) AS dias_vencidos
FROM cuentas_por_cobrar cpc
INNER JOIN clientes c ON cpc.cliente_id = c.id
INNER JOIN ventas v ON cpc.venta_id = v.id
WHERE cpc.estado IN ('pendiente', 'vencida')
AND cpc.fecha_vencimiento < CURDATE()
ORDER BY dias_vencidos DESC;

-- Vista: Resumen de caja por turno
CREATE OR REPLACE VIEW v_resumen_turnos_caja AS
SELECT 
    tc.id,
    ca.nombre AS caja,
    u.nombre AS cajero,
    tc.fecha_apertura,
    tc.fecha_cierre,
    tc.monto_inicial,
    tc.monto_final,
    tc.monto_esperado,
    tc.diferencia,
    tc.estado,
    COALESCE(SUM(CASE WHEN mc.tipo = 'venta' THEN mc.monto ELSE 0 END), 0) AS total_ventas,
    COALESCE(SUM(CASE WHEN mc.tipo = 'entrada' THEN mc.monto ELSE 0 END), 0) AS total_entradas,
    COALESCE(SUM(CASE WHEN mc.tipo = 'salida' THEN mc.monto ELSE 0 END), 0) AS total_salidas
FROM turnos_caja tc
INNER JOIN cajas ca ON tc.caja_id = ca.id
INNER JOIN usuarios u ON tc.usuario_id = u.id
LEFT JOIN movimientos_caja mc ON tc.id = mc.turno_id
GROUP BY tc.id, ca.nombre, u.nombre, tc.fecha_apertura, tc.fecha_cierre, 
         tc.monto_inicial, tc.monto_final, tc.monto_esperado, tc.diferencia, tc.estado;

-- Vista: Inventario valorizado
CREATE OR REPLACE VIEW v_inventario_valorizado AS
SELECT 
    p.id,
    p.codigo,
    p.nombre,
    c.nombre AS categoria,
    p.stock_actual,
    p.precio_compra,
    p.precio_venta,
    (p.stock_actual * p.precio_compra) AS valor_compra,
    (p.stock_actual * p.precio_venta) AS valor_venta,
    ((p.precio_venta - p.precio_compra) * p.stock_actual) AS utilidad_potencial
FROM productos p
LEFT JOIN categorias c ON p.categoria_id = c.id
WHERE p.activo = TRUE
AND p.eliminado_en IS NULL
ORDER BY valor_venta DESC;

-- Vista: Clientes con mayor deuda
CREATE OR REPLACE VIEW v_clientes_mayor_deuda AS
SELECT 
    c.id,
    c.nombre,
    c.telefono,
    c.limite_credito,
    c.saldo_actual,
    (c.limite_credito - c.saldo_actual) AS credito_disponible,
    COUNT(cpc.id) AS num_cuentas_pendientes
FROM clientes c
LEFT JOIN cuentas_por_cobrar cpc ON c.id = cpc.cliente_id AND cpc.estado = 'pendiente'
WHERE c.saldo_actual > 0
GROUP BY c.id, c.nombre, c.telefono, c.limite_credito, c.saldo_actual
ORDER BY c.saldo_actual DESC;
