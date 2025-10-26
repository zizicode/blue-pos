import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  ShoppingCart, Search, Trash2, DollarSign,
  User, CreditCard, Receipt, X, Keyboard, Banknote, AlertCircle
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
  const clienteSeleccionado = clientes.find((c: any) => c.id === 1) ?? null;
  const [metodoPagoId, setMetodoPagoId] = useState<number>(metodosPago?.[0]?.id ?? 1);
  const [pagoReferencia, setPagoReferencia] = useState("");
  const [notas, setNotas] = useState("");
  const [barcodeInput, setBarcodeInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [historialVentas, setHistorialVentas] = useState<any[]>([]);

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

  // Verificar si el método de pago es efectivo
  const isMetodoEfectivo = useMemo(() => {
    const metodo = metodosPago.find((m: any) => m.id === metodoPagoId);
    return metodo?.nombre?.toLowerCase().includes('efectivo');
  }, [metodoPagoId, metodosPago]);

  // ==================== CARRITO ====================
  const addProductToCart = useCallback((producto: Producto, qty = 1) => {
    if (!producto) return;

    if (!configuracion.permitir_ventas_sin_stock && (producto.stock_actual ?? Infinity) < qty) {
      Toast.error(`Stock insuficiente para ${producto.nombre}`);
      return;
    }

    setItems((prev) => {
      const idx = prev.findIndex((i) => i.producto_id === producto.id);
      if (idx >= 0) {
        const copy = [...prev];
        const existing = { ...copy[idx] };
        existing.cantidad += qty;
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
          aplica_iva: !!producto.aplica_iva
        };
        return [...prev, line];
      }
    });

    Toast.success(`${producto.nombre} agregado`);
  }, [configuracion.permitir_ventas_sin_stock]);

  const removeItem = useCallback((producto_id: number) => {
    setItems((prev) => prev.filter((i) => i.producto_id !== producto_id));
  }, []);

  const updateQty = useCallback((producto_id: number, cantidad: number) => {
    if (cantidad <= 0) {
      removeItem(producto_id);
      return;
    }
    setItems((prev) =>
      prev.map((i) =>
        i.producto_id === producto_id
          ? (() => {
            const updated = { ...i, cantidad };
            updated.descuento_monto = round(
              (updated.descuento_porcentaje / 100) * updated.precio_unitario * updated.cantidad
            );
            updated.subtotal = round(
              updated.precio_unitario * updated.cantidad - updated.descuento_monto
            );
            return updated;
          })()
          : i
      )
    );
  }, []);

  const updateDiscountPct = useCallback((producto_id: number, pct: number) => {
    if (pct < 0) pct = 0;
    const limite = Number(configuracion.limite_descuento_porcentaje ?? 100);

    if (pct > limite) {
      if (configuracion.requiere_autorizacion_descuento) {
        Toast.error(`Descuento supera el límite de ${limite}%`);
        return;
      }
      pct = limite;
    }

    setItems((prev) =>
      prev.map((i) =>
        i.producto_id === producto_id
          ? (() => {
            const updated = { ...i, descuento_porcentaje: pct };
            updated.descuento_monto = round(
              (pct / 100) * updated.precio_unitario * updated.cantidad
            );
            updated.subtotal = round(
              updated.precio_unitario * updated.cantidad - updated.descuento_monto
            );
            return updated;
          })()
          : i
      )
    );
  }, [configuracion]);

  const clearCart = useCallback(() => {
    setItems([]);
    setNotas("");
    setPagoReferencia("");
    setMontoRecibido("");
    setCambioCalculado(0);
  }, []);

  // ==================== TOTALES ====================
  const totals = useMemo(() => {
    const subtotal = round(items.reduce((s, it) => s + it.subtotal, 0));
    const iva = round(
      items.reduce((s, it) => s + (it.aplica_iva ? (it.subtotal * IVA_PORC) / 100 : 0), 0)
    );
    const total = round(subtotal + iva);
    return { subtotal, iva, total };
  }, [items, IVA_PORC]);

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
    const recibido = Number(montoRecibido) || 0;

    if (recibido < totals.total) {
      Toast.error(`El monto recibido es insuficiente. Faltan ${SIMBOLO}${(totals.total - recibido).toFixed(DECIMALES)}`);
      return;
    }

    setShowCashModal(false);
    procesarVenta();
  };

  // ==================== CREAR VENTA ====================
  const handleCreateSale = async () => {
    if (!user?.usuario?.id) {
      Toast.error("Usuario no identificado");
      return;
    }

    const almacenSeleccionado = almacenes?.[0];
    if (!almacenSeleccionado) {
      Toast.error("Selecciona un almacén válido");
      return;
    }

    if (items.length === 0) {
      Toast.error("Agrega al menos un producto");
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
    const ventaPayload = {
      cliente_id: clienteSeleccionado?.id ?? null,
      almacen_id: almacenSeleccionado?.id ?? null,
      usuario_id: user.usuario.id,
      tipo_venta: "contado",
      descuento: 0,
      notas: notas || null,
      fecha_vencimiento: null,
      detalles: items.map((it) => ({
        producto_id: it.producto_id,
        cantidad: it.cantidad,
        precio_unitario: it.precio_unitario,
        descuento_porcentaje: it.descuento_porcentaje,
        descuento_monto: it.descuento_monto,
        subtotal: it.subtotal,
      })),
      pagos: [
        {
          metodo_pago_id: metodoPagoId,
          monto: totals.total,
          referencia: pagoReferencia || null,
        },
      ],
    };

    try {
      setIsSaving(true);
      const result = await call("ventas", "create", ventaPayload);


      if (result?.success) {
        // Mostrar cambio si fue efectivo
        const detalle = await call("ventas", "getById", { id: result.data.id });
        handleGeneratePDF([detalle.data])
        
        if (isMetodoEfectivo && cambioCalculado > 0) {
          Toast.success(
            `✅ Venta registrada. Cambio: ${SIMBOLO}${cambioCalculado.toFixed(DECIMALES)}`,
            { duration: 5000 }
          );
        } else {
          Toast.success("✅ Venta registrada correctamente");
        }
        
        clearCart();
        setTimeout(() => barcodeRef.current?.focus(), 100);
      } else {
        Toast.error(result?.message || "Error al registrar venta");
      }
    } catch (err) {
      console.error("Error crear venta:", err);
      Toast.error("Error al registrar venta");
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
      // No procesar si hay un modal abierto
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

  // ==================== ATAJOS EN MODAL DE EFECTIVO ====================
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
          result.data.map(async (venta) => {
            const detalle = await call("ventas", "getById", { id: venta.id });
            return detalle?.success ? detalle.data : null;
          })
        );
    
        // Filtramos nulls si hubo errores
        const ventasFiltradas = ventasConDetalles.filter(v => v !== null);
        setHistorialVentas(ventasFiltradas);
      }
    } catch (error) {
      console.error("Error al cargar historial:", error);
    }
}

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
    if(data.length === 0) alert("Necesitar seleccionar al menos una factura")

      if(data.length >= 0 && confirm(`Estas seguro que deseas guardar (${data.length}) facturas`)){
        const result = await call("pdf", "generarFacturas", {facturas: data, configuracion})
        if(result.success) Toast.success("Factra generada y guardada")
      }
  }

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
              <div className="col-discount">Desc%</div>
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
                        max={100}
                        value={item.descuento_porcentaje}
                        onChange={(e) => updateDiscountPct(item.producto_id, Number(e.target.value))}
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
            </div>
            <div className="client-info">
              <div className="client-name">{clienteSeleccionado?.nombre || "Cliente General"}</div>
              {clienteSeleccionado?.telefono && (
                <div className="client-phone">{clienteSeleccionado.telefono}</div>
              )}
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
              <span>{SIMBOLO}{totals.total.toFixed(DECIMALES)}</span>
            </div>
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
              <input
                placeholder="Referencia / Últimos 4 dígitos"
                value={pagoReferencia}
                onChange={(e) => setPagoReferencia(e.target.value)}
                className="payment-reference"
              />
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
              disabled={items.length === 0 || isSaving}
              title="Cobrar (F9)"
            >
              {isMetodoEfectivo ? <Banknote size={20} /> : <DollarSign size={20} />}
              Cobrar {SIMBOLO}{totals.total.toFixed(DECIMALES)}
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
              <label>Monto recibido:</label>
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
              <span className="label">Denominaciones:</span>
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
                        {cambioCalculado === 0 ? 'Pago exacto' : 'Cambio:'}
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
              >
                Cancelar (ESC)
              </button>
              <button
                className="btn btn-success btn-block"
                onClick={handleConfirmCash}
                disabled={Number(montoRecibido) < totals.total || !montoRecibido}
              >
                Confirmar Pago (Enter)
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
            actionButtonsWithSelection={[{label:'PDF', onClick: (data) => handleGeneratePDF(data)}] as ActionButton[]}
          />
        </div>
      </BottomModal>
    </div>
  ) : (
    <div className="alert alert-warning" style={{maxWidth:'max-content', maxHeight: '200px', margin: 'auto'}}>
      <p>Aun no cuentas con un turno activo</p>
      <span>Haz apertura de caja y luego podras facturar</span>

    </div>
  )
};

export default Ventas;