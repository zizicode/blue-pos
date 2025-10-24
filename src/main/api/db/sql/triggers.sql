-- ============================================
-- TRIGGERS PARA AUTOMATIZACIÓN
-- ============================================

DELIMITER $$

-- ============================================
-- TRIGGER: Actualizar stock al registrar venta
-- ============================================
CREATE TRIGGER after_detalle_venta_insert
AFTER INSERT ON detalle_ventas
FOR EACH ROW
BEGIN
    DECLARE v_almacen_id INT;
    DECLARE v_stock_anterior INT;
    
    -- Obtener almacén de la venta
    SELECT almacen_id INTO v_almacen_id 
    FROM ventas 
    WHERE id = NEW.venta_id;
    
    -- Obtener stock anterior
    SELECT stock_actual INTO v_stock_anterior 
    FROM productos 
    WHERE id = NEW.producto_id;
    
    -- Actualizar stock del producto
    UPDATE productos 
    SET stock_actual = stock_actual - NEW.cantidad 
    WHERE id = NEW.producto_id;
    
    -- Si hay almacenes, actualizar stock por almacén
    IF v_almacen_id IS NOT NULL THEN
        UPDATE stock_almacen 
        SET cantidad = cantidad - NEW.cantidad 
        WHERE producto_id = NEW.producto_id 
        AND almacen_id = v_almacen_id;
    END IF;
    
    -- Registrar movimiento de inventario
    INSERT INTO movimientos_inventario 
    (producto_id, almacen_id, tipo, cantidad, stock_anterior, stock_nuevo, referencia_tipo, referencia_id)
    VALUES 
    (NEW.producto_id, v_almacen_id, 'salida', NEW.cantidad, v_stock_anterior, v_stock_anterior - NEW.cantidad, 'venta', NEW.venta_id);
END$$

-- ============================================
-- TRIGGER: Actualizar stock al registrar compra
-- ============================================
CREATE TRIGGER after_detalle_compra_insert
AFTER INSERT ON detalle_compras
FOR EACH ROW
BEGIN
    DECLARE v_almacen_id INT;
    DECLARE v_stock_anterior INT;
    
    -- Obtener almacén de la compra
    SELECT almacen_id INTO v_almacen_id 
    FROM compras 
    WHERE id = NEW.compra_id;
    
    -- Obtener stock anterior
    SELECT stock_actual INTO v_stock_anterior 
    FROM productos 
    WHERE id = NEW.producto_id;
    
    -- Actualizar stock del producto
    UPDATE productos 
    SET stock_actual = stock_actual + NEW.cantidad 
    WHERE id = NEW.producto_id;
    
    -- Si hay almacenes, actualizar stock por almacén
    IF v_almacen_id IS NOT NULL THEN
        INSERT INTO stock_almacen (producto_id, almacen_id, cantidad)
        VALUES (NEW.producto_id, v_almacen_id, NEW.cantidad)
        ON DUPLICATE KEY UPDATE cantidad = cantidad + NEW.cantidad;
    END IF;
    
    -- Registrar movimiento de inventario
    INSERT INTO movimientos_inventario 
    (producto_id, almacen_id, tipo, cantidad, stock_anterior, stock_nuevo, referencia_tipo, referencia_id)
    VALUES 
    (NEW.producto_id, v_almacen_id, 'entrada', NEW.cantidad, v_stock_anterior, v_stock_anterior + NEW.cantidad, 'compra', NEW.compra_id);
END$$

-- ============================================
-- TRIGGER: Actualizar stock al registrar devolución
-- ============================================
CREATE TRIGGER after_detalle_devolucion_insert
AFTER INSERT ON detalle_devoluciones
FOR EACH ROW
BEGIN
    DECLARE v_almacen_id INT;
    DECLARE v_venta_id INT;
    DECLARE v_stock_anterior INT;
    
    -- Obtener venta y almacén
    SELECT venta_id INTO v_venta_id 
    FROM devoluciones 
    WHERE id = NEW.devolucion_id;
    
    SELECT almacen_id INTO v_almacen_id 
    FROM ventas 
    WHERE id = v_venta_id;
    
    -- Obtener stock anterior
    SELECT stock_actual INTO v_stock_anterior 
    FROM productos 
    WHERE id = NEW.producto_id;
    
    -- Devolver stock al producto
    UPDATE productos 
    SET stock_actual = stock_actual + NEW.cantidad 
    WHERE id = NEW.producto_id;
    
    -- Si hay almacenes, actualizar stock por almacén
    IF v_almacen_id IS NOT NULL THEN
        UPDATE stock_almacen 
        SET cantidad = cantidad + NEW.cantidad 
        WHERE producto_id = NEW.producto_id 
        AND almacen_id = v_almacen_id;
    END IF;
    
    -- Registrar movimiento de inventario
    INSERT INTO movimientos_inventario 
    (producto_id, almacen_id, tipo, cantidad, stock_anterior, stock_nuevo, referencia_tipo, referencia_id)
    VALUES 
    (NEW.producto_id, v_almacen_id, 'entrada', NEW.cantidad, v_stock_anterior, v_stock_anterior + NEW.cantidad, 'devolucion', NEW.devolucion_id);
END$$

-- ============================================
-- TRIGGER: Actualizar saldo de cuenta por cobrar al registrar abono
-- ============================================
CREATE TRIGGER after_abono_credito_insert
AFTER INSERT ON abonos_credito
FOR EACH ROW
BEGIN
    DECLARE v_cliente_id INT;
    
    -- Actualizar cuenta por cobrar
    UPDATE cuentas_por_cobrar 
    SET monto_pagado = monto_pagado + NEW.monto,
        saldo_pendiente = monto_total - (monto_pagado + NEW.monto),
        estado = CASE 
            WHEN (monto_total - (monto_pagado + NEW.monto)) <= 0 THEN 'pagada'
            ELSE 'pendiente'
        END
    WHERE id = NEW.cuenta_id;
    
    -- Actualizar saldo del cliente
    SELECT cliente_id INTO v_cliente_id 
    FROM cuentas_por_cobrar 
    WHERE id = NEW.cuenta_id;
    
    UPDATE clientes 
    SET saldo_actual = saldo_actual - NEW.monto 
    WHERE id = v_cliente_id;
END$$

-- ============================================
-- TRIGGER: Registrar movimiento de caja al registrar venta
-- ============================================
CREATE TRIGGER after_pago_venta_insert
AFTER INSERT ON pagos_venta
FOR EACH ROW
BEGIN
    DECLARE v_turno_id INT;
    
    -- Obtener turno de caja activo del usuario que hizo la venta
    SELECT tc.id INTO v_turno_id
    FROM turnos_caja tc
    INNER JOIN ventas v ON v.usuario_id = tc.usuario_id
    WHERE v.id = NEW.venta_id
    AND tc.estado = 'abierto'
    ORDER BY tc.fecha_apertura DESC
    LIMIT 1;
    
    -- Si hay turno activo, registrar movimiento
    IF v_turno_id IS NOT NULL THEN
        INSERT INTO movimientos_caja 
        (turno_id, tipo, monto, metodo_pago_id, referencia_tipo, referencia_id, concepto)
        VALUES 
        (v_turno_id, 'venta', NEW.monto, NEW.metodo_pago_id, 'venta', NEW.venta_id, 'Pago de venta');
    END IF;
END$$

-- ============================================
-- TRIGGER: Crear cuenta por cobrar al registrar venta a crédito
-- ============================================
CREATE TRIGGER after_venta_credito_insert
AFTER INSERT ON ventas
FOR EACH ROW
BEGIN
    DECLARE v_dias_credito INT;
    
    IF NEW.tipo_venta = 'credito' AND NEW.cliente_id IS NOT NULL THEN
        -- Obtener días de crédito de configuración
        SELECT CAST(valor AS UNSIGNED) INTO v_dias_credito 
        FROM configuracion 
        WHERE clave = 'dias_credito_default';
        
        -- Crear cuenta por cobrar
        INSERT INTO cuentas_por_cobrar 
        (cliente_id, venta_id, monto_total, saldo_pendiente, fecha_vencimiento)
        VALUES 
        (NEW.cliente_id, NEW.id, NEW.total, NEW.total, DATE_ADD(NEW.fecha, INTERVAL v_dias_credito DAY));
        
        -- Actualizar saldo del cliente
        UPDATE clientes 
        SET saldo_actual = saldo_actual + NEW.total 
        WHERE id = NEW.cliente_id;
    END IF;
END$$

DELIMITER ;
