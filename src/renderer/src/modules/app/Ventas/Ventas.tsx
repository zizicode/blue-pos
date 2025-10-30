import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  ShoppingCart, Search, Trash2, DollarSign,
  User, CreditCard, Receipt, X, Keyboard, Banknote, AlertCircle,
  SquareDashed, Loader
} from "lucide-react";
import { useApi } from "@renderer/services/useApi";
import { useAuthStore } from "@renderer/store/auth";
import { usePOSStore } from "@renderer/store/usePOSStore";
import Toast from "@renderer/lib/toast";
import SearchSelect from "@renderer/components/SearchSelectProps/SearchSelectProps";
import { DataTable, DataTableColumn, ActionButton } from "@renderer/components/DataTable/DataTable";
import BottomModal from "@renderer/components/BottomModal/BottomModal";
import "./Ventas.scss";

// ==================== TIPOS ====================
interface Producto {
  id: number;
  nombre: string;
  codigo?: string;
  codigo_barras?: string;
  precio_venta: number;
  stock_actual?: number;
  aplica_iva?: boolean;
}

interface LineItem {
  producto_id: number;
  codigo?: string;
  nombre: string;
  precio_unitario: number;
  cantidad: number;
  descuento_porcentaje: number;
  descuento_monto: number;
  subtotal: number;
  aplica_iva: boolean;
  stock_disponible?: number;
}

interface ValidationError {
  field: string;
  message: string;
}

// ==================== COMPONENTE ====================
const Ventas: React.FC = () => {
  const { call } = useApi();
  const { user } = useAuthStore();
  const {
    clientes = [],
    productos = [],
    almacenes = [],
    metodosPago = [],
    configuracion = {},
    turnoActivo
  } = usePOSStore();

  // Configuración
  const IVA_PORC = Number(configuracion?.iva_porcentaje ?? 18);
  const DECIMALES = Number(configuracion?.decimales ?? 2);
  const SIMBOLO = configuracion?.simbolo_moneda ?? "$";

  // Estados
  const [items, setItems] = useState<LineItem[]>([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<any>(clientes.find((c: any) => c.id === 1) ?? null);
  const [metodoPagoId, setMetodoPagoId] = useState<number>(metodosPago?.[0]?.id ?? 1);
  const [pagoReferencia, setPagoReferencia] = useState("");
  const [notas, setNotas] = useState("");
  const [barcodeInput, setBarcodeInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [historialVentas, setHistorialVentas] = useState<any[]>([]);
  const [tipoVenta, setTipoVenta] = useState<"contado" | "credito">("contado");
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);

  // Estados para modal de efectivo
  const [showCashModal, setShowCashModal] = useState(false);
  const [montoRecibido, setMontoRecibido] = useState("");
  const [cambioCalculado, setCambioCalculado] = useState(0);

  // Refs
  const barcodeRef = useRef<HTMLInputElement>(null);
  const cashInputRef = useRef<HTMLInputElement>(null);

  // ==================== HELPERS ====================
  const round = (v: number) => Math.round(v * Math.pow(10, DECIMALES)) / Math.pow(10, DECIMALES);

  const findProductByCode = useCallback((code: string) =>
    productos.find((p: Producto) =>
      p.codigo === code || p.codigo_barras === code
    ), [productos]
  );

  // ==================== TOTALES ====================
  const totals = useMemo(() => {
    const subtotal = round(items.reduce((s, it) => s + it.subtotal, 0));
    const iva = round(
      items.reduce((s, it) => s + (it.aplica_iva ? (it.subtotal * IVA_PORC) / 100 : 0), 0)
    );
    const total = round(subtotal + iva);
    return { subtotal, iva, total };
  }, [items, IVA_PORC, round]);

  // Verificar si el método de pago es efectivo
  const isMetodoEfectivo = useMemo(() => {
    const metodo = metodosPago.find((m: any) => m.id === metodoPagoId);
    return metodo?.nombre?.toLowerCase().includes('efectivo');
  }, [metodoPagoId, metodosPago]);

  // ==================== VALIDACIONES ====================
  const validateSale = useCallback((): ValidationError[] => {
    const errors: ValidationError[] = [];

    // 1. Validar que haya productos en el carrito
    if (items.length === 0) {
      errors.push({ field: 'items', message: 'Debes agregar al menos un producto al carrito' });
    }

    // 2. Validar que todos los productos tengan cantidad válida
    items.forEach((item, index) => {
      if (item.cantidad <= 0) {
        errors.push({ 
          field: `item_${index}_cantidad`, 
          message: `${item.nombre}: La cantidad debe ser mayor a 0` 
        });
      }

      // Validar stock si la configuración lo requiere
      if (!configuracion.permitir_ventas_sin_stock && item.stock_disponible !== undefined) {
        if (item.cantidad > item.stock_disponible) {
          errors.push({ 
            field: `item_${index}_stock`, 
            message: `${item.nombre}: Stock insuficiente (Disponible: ${item.stock_disponible})` 
          });
        }
      }

      // Validar precio unitario
      if (item.precio_unitario <= 0) {
        errors.push({ 
          field: `item_${index}_precio`, 
          message: `${item.nombre}: El precio debe ser mayor a 0` 
        });
      }

      // Validar subtotal
      if (item.subtotal <= 0) {
        errors.push({ 
          field: `item_${index}_subtotal`, 
          message: `${item.nombre}: El subtotal debe ser mayor a 0` 
        });
      }
    });

    // 3. Validar total de la venta
    const total = totals.total;
    if (total <= 0) {
      errors.push({ field: 'total', message: 'El total de la venta debe ser mayor a 0' });
    }

    // 4. Validar método de pago
    if (!metodoPagoId) {
      errors.push({ field: 'metodo_pago', message: 'Debes seleccionar un método de pago' });
    }

    // 5. Validar referencia si el método de pago la requiere
    const metodoPago = metodosPago.find((m: any) => m.id === metodoPagoId);
    if (metodoPago?.requiere_referencia && !isMetodoEfectivo && !pagoReferencia.trim()) {
      errors.push({ 
        field: 'referencia', 
        message: `El método de pago ${metodoPago.nombre} requiere una referencia` 
      });
    }

    // 6. Validar cliente en ventas a crédito
    if (tipoVenta === 'credito' && !clienteSeleccionado?.id) {
      errors.push({ field: 'cliente', message: 'Las ventas a crédito requieren un cliente' });
    }

    // 7. Validar almacén
    if (!almacenes || almacenes.length === 0) {
      errors.push({ field: 'almacen', message: 'No hay almacenes disponibles' });
    }

    // 8. Validar usuario
    if (!user?.usuario?.id) {
      errors.push({ field: 'usuario', message: 'Usuario no identificado' });
    }

    // 9. Validar turno activo
    if (!turnoActivo || turnoActivo.estado !== 'abierto') {
      errors.push({ field: 'turno', message: 'No hay un turno de caja activo' });
    }

    return errors;
  }, [items, totals, metodoPagoId, metodosPago, pagoReferencia, isMetodoEfectivo, 
      tipoVenta, clienteSeleccionado, almacenes, user, turnoActivo, configuracion]);

  // Validar monto recibido en efectivo
  const validateCashPayment = useCallback((): boolean => {
    const recibido = Number(montoRecibido) || 0;

    if (recibido <= 0) {
      Toast.error('Debes ingresar un monto recibido');
      return false;
    }

    if (recibido < totals.total) {
      Toast.error(`El monto recibido es insuficiente. Faltan ${SIMBOLO}${(totals.total - recibido).toFixed(DECIMALES)}`);
      return false;
    }

    return true;
  }, [montoRecibido, totals.total, SIMBOLO, DECIMALES]);

  // ==================== CARRITO ====================
  const addProductToCart = useCallback((producto: Producto, qty = 1) => {
    if (!producto) {
      Toast.error("Producto no válido");
      return;
    }

    // Validar cantidad
    if (qty <= 0) {
      Toast.error("La cantidad debe ser mayor a 0");
      return;
    }

    // Validar precio
    if (producto.precio_venta <= 0) {
      Toast.error(`El producto ${producto.nombre} no tiene un precio válido`);
      return;
    }

    // Validar stock
    const stockDisponible = producto.stock_actual ?? Infinity;
    if (!configuracion.permitir_ventas_sin_stock && stockDisponible < qty) {
      Toast.error(`Stock insuficiente para ${producto.nombre}. Disponible: ${stockDisponible}`);
      return;
    }

    setItems((prev) => {
      const idx = prev.findIndex((i) => i.producto_id === producto.id);
      if (idx >= 0) {
        const copy = [...prev];
        const existing = { ...copy[idx] };
        const nuevaCantidad = existing.cantidad + qty;

        // Validar stock total después de sumar
        if (!configuracion.permitir_ventas_sin_stock && stockDisponible < nuevaCantidad) {
          Toast.error(`Stock insuficiente para ${producto.nombre}. Disponible: ${stockDisponible}`);
          return prev;
        }

        existing.cantidad = nuevaCantidad;
        existing.descuento_monto = round(
          (existing.descuento_porcentaje / 100) * existing.precio_unitario * existing.cantidad
        );
        existing.subtotal = round(
          existing.precio_unitario * existing.cantidad - existing.descuento_monto
        );
        copy[idx] = existing;
        return copy;
      } else {
        const line: LineItem = {
          producto_id: producto.id,
          codigo: producto.codigo || producto.codigo_barras,
          nombre: producto.nombre,
          precio_unitario: Number(producto.precio_venta) || 0,
          cantidad: qty,
          descuento_porcentaje: 0,
          descuento_monto: 0,
          subtotal: round((Number(producto.precio_venta) || 0) * qty),
          aplica_iva: !!producto.aplica_iva,
          stock_disponible: stockDisponible
        };
        return [...prev, line];
      }
    });

    Toast.success(`${producto.nombre} agregado`);
  }, [configuracion.permitir_ventas_sin_stock, round]);

  const removeItem = useCallback((producto_id: number) => {
    setItems((prev) => prev.filter((i) => i.producto_id !== producto_id));
    Toast.info("Producto eliminado del carrito");
  }, []);

  const updateQty = useCallback((producto_id: number, cantidad: number) => {
    if (cantidad <= 0) {
      removeItem(producto_id);
      return;
    }

    setItems((prev) =>
      prev.map((i) => {
        if (i.producto_id !== producto_id) return i;

        // Validar stock
        if (!configuracion.permitir_ventas_sin_stock && i.stock_disponible !== undefined) {
          if (cantidad > i.stock_disponible) {
            Toast.error(`Stock insuficiente. Disponible: ${i.stock_disponible}`);
            return i;
          }
        }

        const updated = { ...i, cantidad };
        updated.descuento_monto = round(
          (updated.descuento_porcentaje / 100) * updated.precio_unitario * updated.cantidad
        );
        updated.subtotal = round(
          updated.precio_unitario * updated.cantidad - updated.descuento_monto
        );
        return updated;
      })
    );
  }, [removeItem, configuracion.permitir_ventas_sin_stock, round]);

  const updateCustomPrice = useCallback((producto_id: number, valor: number) => {
    setItems((prev) =>
      prev.map((i) => {
        if (i.producto_id !== producto_id) return i;

        const productoOriginal = productos.find((p: Producto) => p.id === producto_id);
        const precioOriginal = productoOriginal?.precio_venta || i.precio_unitario;
        
        let final = Number(valor);

        // Validar precio
        if (final < 0) {
          Toast.info("El precio no puede ser negativo");
          final = 0;
        }

        if (final > precioOriginal) {
          Toast.info(`El precio no puede ser mayor al precio original (${SIMBOLO}${precioOriginal.toFixed(DECIMALES)})`);
          final = precioOriginal;
        }

        const updated = { ...i };
        updated.precio_unitario = final;
        updated.descuento_monto = round(
          (updated.descuento_porcentaje / 100) * updated.precio_unitario * updated.cantidad
        );
        updated.subtotal = round(final * updated.cantidad - updated.descuento_monto);
        return updated;
      })
    );
  }, [productos, round, SIMBOLO, DECIMALES]);

  const clearCart = useCallback(() => {
    setItems([]);
    setNotas("");
    setPagoReferencia("");
    setMontoRecibido("");
    setCambioCalculado(0);
    setValidationErrors([]);
    Toast.info("Carrito limpiado");
  }, []);

  // ==================== BARCODE ====================
  const handleBarcodeKey = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const code = barcodeInput.trim();
      if (!code) return;
      
      const p = findProductByCode(code);
      if (!p) {
        Toast.error("Producto no encontrado");
      } else {
        addProductToCart(p, 1);
        setBarcodeInput("");
      }
      barcodeRef.current?.focus();
    }
  }, [barcodeInput, findProductByCode, addProductToCart]);

  // ==================== MODAL DE EFECTIVO ====================
  const handleOpenCashModal = () => {
    setMontoRecibido("");
    setCambioCalculado(0);
    setShowCashModal(true);
  };

  useEffect(() => {
    if (showCashModal && cashInputRef.current) {
      cashInputRef.current.focus();
    }
  }, [showCashModal]);

  useEffect(() => {
    const recibido = Number(montoRecibido) || 0;
    const cambio = recibido - totals.total;
    setCambioCalculado(cambio >= 0 ? cambio : 0);
  }, [montoRecibido, totals.total]);

  const handleConfirmCash = () => {
    if (!validateCashPayment()) return;
    setShowCashModal(false);
    procesarVenta();
  };

  // ==================== CREAR VENTA ====================
  const handleCreateSale = async () => {
    // Limpiar errores previos
    setValidationErrors([]);

    // Validar venta
    const errors = validateSale();
    
    if (errors.length > 0) {
      setValidationErrors(errors);
      // Mostrar el primer error
      Toast.error(errors[0].message);
      
      // Mostrar alerta con todos los errores
      const errorList = errors.map((e, i) => `${i + 1}. ${e.message}`).join('\n');
      alert(`Se encontraron los siguientes errores:\n\n${errorList}`);
      return;
    }

    // Si es efectivo, abrir modal
    if (isMetodoEfectivo) {
      handleOpenCashModal();
      return;
    }

    // Si no es efectivo, procesar directamente
    await procesarVenta();
  };

  const procesarVenta = async () => {
    if (!user?.usuario?.id) return;

    const almacenSeleccionado = almacenes?.[0];
    
    // Validación final antes de enviar
    const errors = validateSale();
    if (errors.length > 0) {
      Toast.error("No se puede procesar la venta. Verifica los datos.");
      return;
    }

    const ventaPayload = {
      cliente_id: clienteSeleccionado?.id ?? null,
      almacen_id: almacenSeleccionado?.id ?? null,
      usuario_id: user.usuario.id,
      tipo_venta: tipoVenta,
      descuento: 0,
      notas: notas.trim() || null,
      fecha_vencimiento: null,
      detalles: items.map((it) => ({
        producto_id: it.producto_id,
        cantidad: it.cantidad,
        precio_unitario: round(it.precio_unitario),
        descuento_porcentaje: it.descuento_porcentaje,
        descuento_monto: round(it.descuento_monto),
        subtotal: round(it.subtotal),
      })),
      pagos: [
        {
          metodo_pago_id: metodoPagoId,
          monto: round(totals.total),
          referencia: pagoReferencia.trim() || null,
        },
      ],
    };

    try {
      setIsSaving(true);
      
      // Log para debugging
      console.log("Enviando venta:", ventaPayload);
      
      const result = await call("ventas", "create", ventaPayload);

      if (result?.success) {
        // Obtener detalles completos de la venta
        const detalle = await call("ventas", "getById", { id: result.data.id });
        
        if (detalle?.success) {
          await handleGeneratePDF([detalle.data]);
        }

        // Mostrar mensaje de éxito con cambio si aplica
        if (isMetodoEfectivo && cambioCalculado > 0) {
          Toast.success(
            `✅ Venta ${result.data.folio} registrada. Cambio: ${SIMBOLO}${cambioCalculado.toFixed(DECIMALES)}`,
            { duration: 5000 }
          );
        } else {
          Toast.success(`✅ Venta ${result.data.folio} registrada correctamente`);
        }

        clearCart();
        setTimeout(() => barcodeRef.current?.focus(), 100);
      } else {
        Toast.error(result?.message || "Error al registrar venta");
        console.error("Error del servidor:", result);
      }
    } catch (err) {
      console.error("Error crear venta:", err);
      Toast.error("Error de conexión al registrar venta");
    } finally {
      setIsSaving(false);
    }
  };

  // ==================== BOTONES RÁPIDOS DE DENOMINACIONES ====================
  const denominacionesComunes = [50, 100, 200, 500, 1000, 2000];

  const handleDenominacionClick = (valor: number) => {
    const actual = Number(montoRecibido) || 0;
    setMontoRecibido((actual + valor).toString());
  };

  const handleMontoExacto = () => {
    setMontoRecibido(totals.total.toFixed(DECIMALES));
  };

  // ==================== ATAJOS DE TECLADO ====================
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (showCashModal || showShortcuts || showHistory) return;

      if (e.key === "F1") {
        e.preventDefault();
        setShowShortcuts(true);
      }
      if (e.key === "F2") {
        e.preventDefault();
        clearCart();
      }
      if (e.key === "F3") {
        e.preventDefault();
        setShowHistory(true);
      }
      if (e.key === "F9") {
        e.preventDefault();
        if (items.length > 0) handleCreateSale();
      }
      if (e.key === "Escape") {
        barcodeRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [items, clearCart, handleCreateSale, showCashModal, showShortcuts, showHistory]);

  useEffect(() => {
    if (!showCashModal) return;

    const handleCashModalKeys = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleConfirmCash();
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setShowCashModal(false);
      }
    };

    window.addEventListener("keydown", handleCashModalKeys);
    return () => window.removeEventListener("keydown", handleCashModalKeys);
  }, [showCashModal, handleConfirmCash]);

  useEffect(() => {
    barcodeRef.current?.focus();
  }, []);

  // ==================== HISTORIAL ====================
  const cargarHistorial = async () => {
    try {
      const result = await call("ventas", "getAll");
      if (result?.success) {
        const ventasConDetalles = await Promise.all(
          result.data.map(async (venta: any) => {
            const detalle = await call("ventas", "getById", { id: venta.id });
            return detalle?.success ? detalle.data : null;
          })
        );

        const ventasFiltradas = ventasConDetalles.filter(v => v !== null);
        setHistorialVentas(ventasFiltradas);
      }
    } catch (error) {
      console.error("Error al cargar historial:", error);
      Toast.error("Error al cargar el historial");
    }
  };

  useEffect(() => {
    if (showHistory) {
      cargarHistorial();
    }
  }, [showHistory]);

  const columnasHistorial: DataTableColumn[] = [
    { key: 'folio', label: 'Folio' },
    {
      key: 'fecha',
      label: 'Fecha',
      render: (data) => new Date(data).toLocaleString('es-DO', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    },
    { key: 'cliente_nombre', label: 'Cliente' },
    {
      key: 'total',
      label: 'Total',
      render: (data) => `${SIMBOLO}${Number(data).toFixed(DECIMALES)}`
    },
    {
      key: 'estado',
      label: 'Estado',
      render: (data) => (
        <span className={`badge badge-${data === 'completada' ? 'success' : 'warning'} badge-xs`}>
          {data}
        </span>
      )
    },
  ];

  const handleGeneratePDF = async (data: any[]) => {
    if (data.length === 0) {
      Toast.info("Necesitas seleccionar al menos una factura");
      return;
    }

    try {
      const result = await call("pdf", "generarFacturas", { facturas: data, configuracion });
      if (result?.success) {
        Toast.success("Factura generada y guardada");
      } else {
        Toast.error("Error al generar la factura");
      }
    } catch (error) {
      console.error("Error al generar PDF:", error);
      Toast.error("Error al generar la factura");
    }
  };

  // ==================== RENDER ====================
  return turnoActivo && turnoActivo.estado === 'abierto' ? (
    <div className="Ventas">
      {/* Header */}
      <div className="Ventas__header">
        <div className="Ventas__title">
          <ShoppingCart size={24} />
          <h1>Punto de Venta</h1>
        </div>
        <div className="Ventas__header-actions">
          <button
            className="btn btn-sm btn-ghost"
            onClick={() => setShowShortcuts(true)}
            title="Atajos de teclado (F1)"
          >
            <Keyboard size={16} />
          </button>
          <button
            className="btn btn-sm btn-secondary"
            onClick={() => setShowHistory(true)}
            title="Historial (F3)"
          >
            <Receipt size={16} />
            Historial
          </button>
        </div>
      </div>

      {/* Mostrar errores de validación */}
      {validationErrors.length > 0 && (
        <div className="alert alert-error" style={{ margin: '1rem' }}>
          <AlertCircle size={20} />
          <div>
            <strong>Errores de validación:</strong>
            <ul style={{ marginTop: '0.5rem', paddingLeft: '1.5rem' }}>
              {validationErrors.map((err, idx) => (
                <li key={idx}>{err.message}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="Ventas__content">
        {/* Panel Izquierdo - Búsqueda y Carrito */}
        <div className="Ventas__left">
          {/* Búsqueda */}
          <div className="Ventas__search-panel">
            <div className="Ventas__barcode">
              <Search size={18} />
              <input
                ref={barcodeRef}
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                onKeyDown={handleBarcodeKey}
                placeholder="Escanea código de barras o busca producto (ESC para enfocar)"
                className="Ventas__barcode-input"
              />
            </div>

            <SearchSelect
              items={productos}
              displayKey="nombre"
              returnKey="id"
              placeholder="Buscar producto por nombre..."
              onSelect={(_, item) => addProductToCart(item as Producto, 1)}
              maxResults={8}
            />
          </div>

          {/* Carrito */}
          <div className="Ventas__cart">
            <div className="Ventas__cart-header">
              <div className="col-product">Producto</div>
              <div className="col-price">Precio</div>
              <div className="col-qty">Cant.</div>
              <div className="col-discount">Precio Adj.</div>
              <div className="col-subtotal">Subtotal</div>
              <div className="col-actions"></div>
            </div>

            <div className="Ventas__cart-body">
              {items.length === 0 ? (
                <div className="Ventas__empty">
                  <ShoppingCart size={48} />
                  <p>Carrito vacío</p>
                  <span>Escanea o busca productos para comenzar</span>
                </div>
              ) : (
                items.map((item) => (
                  <div key={item.producto_id} className="Ventas__cart-item">
                    <div className="col-product">
                      <div className="product-name">{item.nombre}</div>
                      {item.codigo && <div className="product-code">{item.codigo}</div>}
                      {!configuracion.permitir_ventas_sin_stock && item.stock_disponible !== undefined && (
                        <div className="product-stock" style={{ fontSize: '0.75rem', color: item.stock_disponible < 5 ? '#f59e0b' : '#10b981' }}>
                          Stock: {item.stock_disponible}
                        </div>
                      )}
                    </div>

                    <div className="col-price">
                      {SIMBOLO}{item.precio_unitario.toFixed(DECIMALES)}
                    </div>

                    <div className="col-qty">
                      <input
                        type="number"
                        min={1}
                        value={item.cantidad}
                        onChange={(e) => updateQty(item.producto_id, Number(e.target.value))}
                        className="qty-input"
                      />
                    </div>

                    <div className="col-discount">
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={item.precio_unitario}
                        onChange={(e) => updateCustomPrice(item.producto_id, Number(e.target.value))}
                        className="discount-input"
                      />
                    </div>

                    <div className="col-subtotal">
                      <strong>{SIMBOLO}{item.subtotal.toFixed(DECIMALES)}</strong>
                    </div>

                    <div className="col-actions">
                      <button
                        className="btn-icon btn-danger"
                        onClick={() => removeItem(item.producto_id)}
                        title="Eliminar"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {items.length > 0 && (
              <div className="Ventas__cart-footer">
                <textarea
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  placeholder="Notas adicionales (opcional)..."
                  rows={2}
                  className="notes-textarea"
                  maxLength={500}
                />
              </div>
            )}
          </div>
        </div>

        {/* Panel Derecho - Resumen y Pago */}
        <div className="Ventas__right">
          {/* Cliente */}
          <div className="Ventas__client-panel">
            <div className="panel-header">
              <User size={18} />
              <span>Cliente</span>
              {tipoVenta === 'credito' && <span className="badge badge-warning badge-xs">Requerido</span>}
            </div>
            <div className="client-info">
              <SearchSelect
                items={clientes}
                displayKey="nombre"
                returnKey="id"
                defaultValue={clienteSeleccionado?.id ?? 1}
                placeholder="Selecciona un cliente"
                onSelect={(id) => {
                  const cliente = clientes.find((c: any) => c.id === id);
                  setClienteSeleccionado(cliente);
                }}
              />
            </div>
          </div>

          {/* Totales */}
          <div className="Ventas__totals-panel">
            <div className="total-row">
              <span>Subtotal:</span>
              <span>{SIMBOLO}{totals.subtotal.toFixed(DECIMALES)}</span>
            </div>
            <div className="total-row">
              <span>ITBIS ({IVA_PORC}%):</span>
              <span>{SIMBOLO}{totals.iva.toFixed(DECIMALES)}</span>
            </div>
            <div className="total-row total-final">
              <span>TOTAL:</span>
              <span className={totals.total <= 0 ? 'text-error' : ''}>
                {SIMBOLO}{totals.total.toFixed(DECIMALES)}
              </span>
            </div>
            {totals.total <= 0 && items.length > 0 && (
              <div className="alert alert-error alert-sm" style={{ marginTop: '0.5rem' }}>
                <AlertCircle size={14} />
                <span style={{ fontSize: '0.75rem' }}>El total debe ser mayor a 0</span>
              </div>
            )}
          </div>

          {/* Tipo de Venta */}
          <div className="Ventas__payment-panel">
            <div className="panel-header">
              <SquareDashed size={18} />
              <span>Tipo de Venta</span>
            </div>
            <select 
              value={tipoVenta} 
              className="payment-select" 
              onChange={(e) => setTipoVenta(e.target.value as any)}
            >
              <option value="contado">Contado</option>
              <option value="credito">Crédito</option>
            </select>
            {tipoVenta === 'credito' && (
              <div className="alert alert-info alert-sm" style={{ marginTop: '0.5rem' }}>
                <AlertCircle size={14} />
                <span style={{ fontSize: '0.75rem' }}>Las ventas a crédito requieren un cliente seleccionado</span>
              </div>
            )}
          </div>

          {/* Método de Pago */}
          <div className="Ventas__payment-panel">
            <div className="panel-header">
              <CreditCard size={18} />
              <span>Método de Pago</span>
            </div>
            <select
              value={metodoPagoId}
              onChange={(e) => setMetodoPagoId(Number(e.target.value))}
              className="payment-select"
            >
              {metodosPago?.map((m: any) => (
                <option key={m.id} value={m.id}>{m.nombre}</option>
              ))}
            </select>

            {!isMetodoEfectivo && metodosPago?.find((m: any) => m.id === metodoPagoId && m.requiere_referencia) && (
              <div style={{ marginTop: '0.5rem' }}>
                <input
                  placeholder="Referencia / Últimos 4 dígitos *"
                  value={pagoReferencia}
                  onChange={(e) => setPagoReferencia(e.target.value)}
                  className="payment-reference"
                  maxLength={50}
                />
                {pagoReferencia.trim() === '' && (
                  <div className="alert alert-warning alert-sm" style={{ marginTop: '0.5rem' }}>
                    <AlertCircle size={14} />
                    <span style={{ fontSize: '0.75rem' }}>Este método requiere referencia</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Acciones */}
          <div className="Ventas__actions">
            <button
              className="btn btn-secondary btn-block"
              onClick={clearCart}
              disabled={items.length === 0 || isSaving}
              title="Limpiar (F2)"
            >
              <X size={18} />
              Limpiar
            </button>
            <button
              className="btn btn-success btn-block btn-lg"
              onClick={handleCreateSale}
              disabled={items.length === 0 || isSaving || totals.total <= 0}
              title="Cobrar (F9)"
            >
              {isSaving ? (
                <>
                  <Loader size={20} className="animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  {isMetodoEfectivo ? <Banknote size={20} /> : <DollarSign size={20} />}
                  Cobrar {SIMBOLO}{totals.total.toFixed(DECIMALES)}
                </>
              )}
            </button>
          </div>

          {/* Ayuda */}
          <div className="Ventas__help">
            <Keyboard size={14} />
            <span>Presiona F1 para ver atajos de teclado</span>
          </div>
        </div>
      </div>

      {/* Modal de Efectivo */}
      <BottomModal
        isOpen={showCashModal}
        onClose={() => setShowCashModal(false)}
      >
        <div className="cash-modal">
          <div className="modal-header">
            <Banknote size={28} />
            <h3>Pago en Efectivo</h3>
          </div>

          <div className="cash-modal-body">
            {/* Total a pagar */}
            <div className="total-section">
              <span className="label">Total a pagar:</span>
              <span className="amount">{SIMBOLO}{totals.total.toFixed(DECIMALES)}</span>
            </div>

            {/* Input de monto recibido */}
            <div className="input-section">
              <label>Monto recibido: *</label>
              <div className="input-wrapper">
                <span className="currency">{SIMBOLO}</span>
                <input
                  ref={cashInputRef}
                  type="number"
                  value={montoRecibido}
                  onChange={(e) => setMontoRecibido(e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  className="cash-input"
                />
              </div>
              <button
                className="btn btn-sm btn-secondary"
                onClick={handleMontoExacto}
              >
                Monto Exacto
              </button>
            </div>

            {/* Denominaciones rápidas */}
            <div className="denominaciones-section">
              <span className="label">Denominaciones rápidas:</span>
              <div className="denominaciones-grid">
                {denominacionesComunes.map((valor) => (
                  <button
                    key={valor}
                    className="btn btn-denominacion"
                    onClick={() => handleDenominacionClick(valor)}
                  >
                    {SIMBOLO}{valor}
                  </button>
                ))}
              </div>
            </div>

            {/* Cambio */}
            <div className="cambio-section">
              {Number(montoRecibido) > 0 && (
                <>
                  {Number(montoRecibido) < totals.total ? (
                    <div className="alert alert-error">
                      <AlertCircle size={20} />
                      <span>
                        Monto insuficiente. Faltan {SIMBOLO}
                        {(totals.total - Number(montoRecibido)).toFixed(DECIMALES)}
                      </span>
                    </div>
                  ) : (
                    <div className={`cambio-display ${cambioCalculado === 0 ? 'exacto' : 'cambio'}`}>
                      <span className="label">
                        {cambioCalculado === 0 ? 'Pago exacto ✓' : 'Cambio a devolver:'}
                      </span>
                      <span className="amount">
                        {SIMBOLO}{cambioCalculado.toFixed(DECIMALES)}
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Botones */}
            <div className="modal-actions">
              <button
                className="btn btn-secondary btn-block"
                onClick={() => setShowCashModal(false)}
                disabled={isSaving}
              >
                Cancelar (ESC)
              </button>
              <button
                className="btn btn-success btn-block"
                onClick={handleConfirmCash}
                disabled={Number(montoRecibido) < totals.total || !montoRecibido || isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader size={18} className="animate-spin" />
                    Procesando...
                  </>
                ) : (
                  'Confirmar Pago (Enter)'
                )}
              </button>
            </div>
          </div>
        </div>
      </BottomModal>

      {/* Modal de Atajos */}
      <BottomModal
        isOpen={showShortcuts}
        onClose={() => setShowShortcuts(false)}
      >
        <div className="shortcuts-modal">
          <h3>⌨️ Atajos de Teclado</h3>
          <div className="shortcuts-grid">
            <div className="shortcut-item">
              <kbd>F1</kbd>
              <span>Ver esta ayuda</span>
            </div>
            <div className="shortcut-item">
              <kbd>F2</kbd>
              <span>Limpiar carrito</span>
            </div>
            <div className="shortcut-item">
              <kbd>F3</kbd>
              <span>Ver historial</span>
            </div>
            <div className="shortcut-item">
              <kbd>F9</kbd>
              <span>Procesar venta</span>
            </div>
            <div className="shortcut-item">
              <kbd>ESC</kbd>
              <span>Enfocar búsqueda</span>
            </div>
            <div className="shortcut-item">
              <kbd>Enter</kbd>
              <span>Buscar por código</span>
            </div>
          </div>
        </div>
      </BottomModal>

      {/* Modal de Historial */}
      <BottomModal
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
      >
        <div className="history-modal">
          <div className="modal-header">
            <Receipt size={24} />
            <h3>Historial de Ventas</h3>
          </div>
          <DataTable
            columns={columnasHistorial}
            data={historialVentas}
            itemsPerPage={7}
            selectable
            actionButtonsWithSelection={[
              { 
                label: 'Generar PDF', 
                onClick: (data) => handleGeneratePDF(data) 
              }
            ] as ActionButton[]}
          />
        </div>
      </BottomModal>
    </div>
  ) : (
    <div className="alert alert-warning" style={{ maxWidth: 'max-content', maxHeight: '200px', margin: 'auto' }}>
      <AlertCircle size={24} />
      <div>
        <p><strong>No hay turno activo</strong></p>
        <span>Debes hacer apertura de caja antes de facturar</span>
      </div>
    </div>
  );
};

export default Ventas;