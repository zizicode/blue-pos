import React, { useEffect, useState, useCallback, useMemo } from 'react'
import './ventas.scss';
import { usePOSStore } from '@renderer/store/usePOSStore';
import SearchSelect from '@renderer/components/SearchSelectProps/SearchSelectProps';
import { Cliente, Producto } from '@renderer/type/pos.types';
import { formatDate } from '@renderer/utils/formatDate';
import { formatNumber } from '@renderer/utils/formatNumber';
import { ChevronLeft, ChevronRight, DollarSign, ReceiptText, Trash, Plus, Delete } from 'lucide-react';
import Toast from '@renderer/lib/toast';
import { PriceInput } from '@renderer/components/FormatNumberInput/InputNumber';
import { useAuthStore } from '@renderer/store/auth';
import VentasModal from '../Ventas/VentasModal/VentasModal';
import { useApi } from '@renderer/services/useApi';

// ==================== INTERFACES ====================
interface DetalleVenta {
    producto_id: number;
    cantidad: number;
    precio_unitario: number;
    descuento_porcentaje?: number;
    descuento_monto?: number;
    subtotal: number; // subtotal SIN descuento (precio_unitario * cantidad)
}

interface PagoVenta {
    metodo_pago_id: number;
    monto: number;
    referencia?: string;
}

interface VentaData {
    cliente_id?: number;
    almacen_id?: number;
    usuario_id: number;
    tipo_venta: 'contado' | 'credito';
    descuento?: number; // descuento global a nivel de venta
    fecha_vencimiento?: string;
    notas?: string;
    detalles: DetalleVenta[];
    pagos: PagoVenta[];
}

// ==================== COMPONENTE PRINCIPAL ====================
const Ventas: React.FC = () => {
    // ==================== HOOKS Y STORE ====================
    const { clientes, productos, configuracion, metodosPago, almacenSeleccionado } = usePOSStore();
    const { user } = useAuthStore();
    const {call} = useApi();

    // ==================== ESTADOS ====================
    const [DetalleVenta, setDetalleVenta] = useState<DetalleVenta[]>([]);
    const [DetallePago, setDetallePago] = useState<PagoVenta[]>([]);
    const [pagoTemp, setPagoTemp] = useState<PagoVenta>({
        metodo_pago_id: metodosPago?.[0]?.id || 0,
        monto: 0,
        referencia: ''
    });
    const [tipoFactura, setTipoFactura] = useState<"contado" | "credito">("contado");
    const [ClienteSeleccionado, setClienteSeleccionado] = useState<Cliente>();
    const [, setProductosSeleccionados] = useState<Producto[]>([]);
    const [load, setLoad] = useState<boolean>(false);
    const [descuentoGlobal, setDescuentoGlobal] = useState<number>(0); // Nuevo: descuento global
    const [isModalOpen, setIsModalOpen] = useState(false);

    const abrirModal = () => setIsModalOpen(true);
    const cerrarModal = () => setIsModalOpen(false);

     // ==================== CÁLCULOS Y TOTALES ====================
     const { 
        sumaDescuentosItems, 
        subtotalSinDescuento,
        totalFinal, 
        totalItbs, 
        totalPagado, 
        saldoPendiente,
        cambio
    } = useMemo(() => {
        const iva = configuracion?.aplicar_iva ? Number(configuracion?.iva_porcentaje) || 0 : 0;

        // Calcular subtotales y descuentos a nivel de items
        const totales = DetalleVenta.reduce((acc, det) => {
            // subtotal = precio * cantidad (SIN descuento)
            const subtotalItem = det.precio_unitario * det.cantidad;
            const descuentoItem = det.descuento_monto ?? 0;

            acc.subtotalSinDescuento += subtotalItem;
            acc.sumaDescuentosItems += descuentoItem;

            return acc;
        }, {
            subtotalSinDescuento: 0,
            sumaDescuentosItems: 0
        });

        // Calcular total según lógica del backend:
        // 1. Sumar todos los subtotales (precio * cantidad)
        const subtotalTotal = totales.subtotalSinDescuento;
        
        // 2. Subtotal con descuentos de items aplicados
        const subtotalConDescItems = subtotalTotal - totales.sumaDescuentosItems;
        
        // 3. Restar descuento global
        const totalConDescuento = subtotalConDescItems - descuentoGlobal;
        
        // 4. Calcular ITBIS sobre (subtotal con desc. items - descuento global)
        const itbis = totalConDescuento * (iva / 100);
        
        // 5. Total final
        const totalFinalCalculado = totalConDescuento + itbis;

        // Calcular total pagado
        const pagado = DetallePago.reduce((sum, pago) => sum + (pago.monto || 0), 0);

        // Calcular saldo pendiente
        const pendiente = totalFinalCalculado - pagado;
        
        // Calcular cambio (si pagó de más)
        const cambioCalculado = pagado > totalFinalCalculado ? pagado - totalFinalCalculado : 0;

        return {
            subtotalSinDescuento: subtotalTotal,
            subtotalConDescuentoItems: subtotalConDescItems,
            sumaDescuentosItems: totales.sumaDescuentosItems,
            totalFinal: totalFinalCalculado,
            totalItbs: itbis,
            totalPagado: pagado,
            saldoPendiente: pendiente,
            cambio: cambioCalculado
        };
    }, [DetalleVenta, DetallePago, configuracion, descuentoGlobal]);

    // ==================== INICIALIZACIÓN ====================
    useEffect(() => {
        const clienteGeneric = clientes.find((i) => i.id === 1);
        if (clienteGeneric?.id) setClienteSeleccionado(clienteGeneric);
    }, [clientes]);

    useEffect(() => {
        // Inicializar método de pago por defecto
        if (metodosPago?.length > 0 && pagoTemp.metodo_pago_id === 0) {
            setPagoTemp(prev => ({ ...prev, metodo_pago_id: metodosPago[0].id }));
        }
    }, [metodosPago]);

    // ==================== MANEJO DE PRODUCTOS ====================
    const handleAddListProduct = useCallback((prod: Producto) => {
        // Validar stock
        if (!configuracion?.permitir_ventas_sin_stock && (prod.stock_actual || 0) <= 0) {
            Toast.error(`${prod.nombre} - Stock insuficiente`);
            return;
        }

        setDetalleVenta(prev => {
            const existe = prev.find(det => det.producto_id === prod.id);

            // Si ya existe -> incrementa cantidad
            if (existe) {
                return prev.map(det => {
                    if (det.producto_id !== prod.id) return det;

                    const nuevaCantidad = det.cantidad + 1;
                    const subtotal = det.precio_unitario * nuevaCantidad; // Sin descuento

                    return { 
                        ...det, 
                        cantidad: nuevaCantidad, 
                        subtotal // Backend espera subtotal sin descuento
                    };
                });
            }

            // Si no existe -> agrégalo
            const precioVenta = Number(prod.precio_venta) || 0;
            return [
                ...prev,
                {
                    producto_id: prod.id!,
                    cantidad: 1,
                    precio_unitario: precioVenta,
                    descuento_monto: 0,
                    descuento_porcentaje: 0,
                    subtotal: precioVenta // Backend espera precio * cantidad
                }
            ];
        });

        // Agregar a productos seleccionados si no existe
        setProductosSeleccionados(prev => {
            const yaExiste = prev.some(p => p.id === prod.id);
            return yaExiste ? prev : [...prev, prod];
        });

        Toast.success(`${prod.nombre} agregado`);
    }, [configuracion]);

    const updateDetalle = useCallback(
        (producto_id: number, campos: Partial<Omit<DetalleVenta, "producto_id">>) => {
            setDetalleVenta(prev => {
                return prev
                    .map(det => {
                        if (det.producto_id !== producto_id) return det;

                        const precio = det.precio_unitario;
                        const nuevaCantidad = campos.cantidad ?? det.cantidad;

                        // Si cantidad llega a 0, eliminar
                        if (nuevaCantidad <= 0) {
                            Toast.info("Producto eliminado del carrito");
                            return null as any;
                        }

                        // Subtotal = precio * cantidad (sin descuento, como espera backend)
                        const subtotal = precio * nuevaCantidad;

                        // Limite de descuento desde configuración
                        const limitePorcentaje = Number(configuracion?.limite_descuento_porcentaje ?? 20);
                        const maximoDescuento = (subtotal * limitePorcentaje) / 100;

                        // Si viene un descuento nuevo, usarlo; si no, mantener el proporcional a la nueva cantidad
                        let descuento_monto: number;
                        
                        if (campos.descuento_monto !== undefined) {
                            // Usuario está cambiando el descuento manualmente
                            descuento_monto = campos.descuento_monto;
                        } else if (campos.cantidad !== undefined && det.descuento_porcentaje) {
                            // Usuario cambió cantidad, mantener el mismo % de descuento
                            descuento_monto = (subtotal * det.descuento_porcentaje) / 100;
                        } else {
                            // Mantener el descuento actual
                            descuento_monto = det.descuento_monto ?? 0;
                        }

                        // Validar descuento
                        if (descuento_monto > maximoDescuento) {
                            descuento_monto = maximoDescuento;
                            Toast.info(`Descuento limitado al ${limitePorcentaje}%`);
                        }
                        if (descuento_monto > subtotal) {
                            descuento_monto = subtotal;
                            Toast.info("El descuento no puede ser mayor al subtotal");
                        }

                        // Calcular porcentaje de descuento basado en el subtotal total (precio * cantidad)
                        const descuento_porcentaje = subtotal > 0 ? (descuento_monto / subtotal) * 100 : 0;

                        return {
                            ...det,
                            cantidad: nuevaCantidad,
                            descuento_monto,
                            descuento_porcentaje,
                            subtotal // Backend espera subtotal sin descuento
                        };
                    })
                    .filter(Boolean);
            });
        },
        [configuracion]
    );

    const removeProducto = useCallback((producto_id: number) => {
        updateDetalle(producto_id, { cantidad: 0 });
        setProductosSeleccionados(prev => prev.filter(p => p.id !== producto_id));
    }, [updateDetalle]);

    // ==================== MANEJO DE PAGOS ====================
    const handleChangePago = useCallback((name: string, value: any) => {
        setPagoTemp((prev) => ({ ...prev, [name]: value }));
    }, []);

    const agregarPago = useCallback(() => {
        if (!pagoTemp.metodo_pago_id || pagoTemp.metodo_pago_id <= 0) {
            Toast.error("Selecciona un método de pago válido");
            return;
        }

        if (!pagoTemp.monto || pagoTemp.monto <= 0) {
            Toast.error("Ingresa un monto válido");
            return;
        }

        // Método requiere referencia
        const metodoSeleccionado = metodosPago?.find(m => m.id === pagoTemp.metodo_pago_id);
        if (metodoSeleccionado?.requiere_referencia && !pagoTemp.referencia?.trim()) {
            Toast.error(`El método ${metodoSeleccionado.nombre} requiere una referencia`);
            return;
        }

        // Agregar pago normalmente
        setDetallePago((prev) => [...prev, { ...pagoTemp }]);

        // Reset
        setPagoTemp({
            metodo_pago_id: metodosPago?.[0]?.id || 0,
            monto: 0,
            referencia: ''
        });

        Toast.success("Pago agregado");
    }, [pagoTemp, metodosPago]);


    const eliminarPago = useCallback((index: number) => {
        setDetallePago((prev) => prev.filter((_, i) => i !== index));
        Toast.info("Pago eliminado");
    }, []);


    // ==================== VALIDACIONES ====================
    const validarVenta = useCallback(() => {
        if (DetalleVenta.length === 0) {
            Toast.error("Debes agregar al menos un producto");
            return false;
        }

        if (totalFinal <= 0) {
            Toast.error("El total debe ser mayor a 0");
            return false;
        }

        if(tipoFactura === 'credito' && Number(ClienteSeleccionado?.limite_credito) === 0.00){
            Toast.error(`${ClienteSeleccionado?.nombre} no cuenta con limite credito aprobado`);
            return false;
        }

        if(tipoFactura === 'credito' && totalFinal > (Number(ClienteSeleccionado?.limite_credito) - Number(ClienteSeleccionado?.saldo_actual))){
            Toast.error(`No cuenta con credito suficiente`);
            return false;
        }

        if (tipoFactura === 'contado' && saldoPendiente > 0) {
            Toast.error("Las ventas al contado deben estar completamente pagadas");
            return false;
        }

        if (tipoFactura === 'credito' && !ClienteSeleccionado) {
            Toast.error("Las ventas a crédito requieren un cliente");
            return false;
        }

        if (tipoFactura === 'credito' && ClienteSeleccionado?.id === 1) {
            Toast.error("No puedes hacer ventas a crédito con el cliente genérico");
            return false;
        }

        return true;
    }, [DetalleVenta, totalFinal, tipoFactura, saldoPendiente, ClienteSeleccionado]);

    // ==================== PREPARAR PAYLOAD ====================
    const prepararPayload = useCallback((): VentaData => {
        const fechaVencimiento = tipoFactura === 'credito' 
            ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
            : undefined;

        return {
            cliente_id: ClienteSeleccionado?.id,
            almacen_id: almacenSeleccionado ?? undefined,
            usuario_id: user?.usuario.id as number,
            tipo_venta: tipoFactura,
            descuento: descuentoGlobal, // Descuento a nivel de venta
            fecha_vencimiento: fechaVencimiento,
            notas: undefined,
            detalles: DetalleVenta.map(det => ({
                producto_id: det.producto_id,
                cantidad: det.cantidad,
                precio_unitario: det.precio_unitario,
                descuento_porcentaje: det.descuento_porcentaje || 0,
                descuento_monto: det.descuento_monto || 0,
                subtotal: det.subtotal // Backend espera precio * cantidad
            })),
            pagos: tipoFactura === 'contado' ? DetallePago : [] // Crédito no lleva pagos
        };
    }, [
        ClienteSeleccionado, 
        almacenSeleccionado, 
        user, 
        tipoFactura, 
        descuentoGlobal, 
        DetalleVenta, 
        DetallePago
    ]);

    // Generar factura
    const handleGenerarVenta = useCallback(async () => {
        if (!validarVenta()) return;

        const payload = prepararPayload();
        
        setLoad(true);
        
        // Aquí iría tu llamada al backend:
        await call("ventas", "create", {...payload, configuracion});
        
        setTimeout(() => {
            setLoad(false);
            Toast.success(`Venta ${tipoFactura} registrada correctamente`);
            
            // Reset del formulario
            setDetalleVenta([]);
            setDetallePago([]);
            setDescuentoGlobal(0);
            setPagoTemp({
                metodo_pago_id: metodosPago?.[0]?.id || 0,
                monto: 0,
                referencia: ''
            });
        }, 1400);
    }, [validarVenta, prepararPayload, tipoFactura, metodosPago]);

    // ==================== RENDER ====================
    return (
        <div className='ventas-new'>
            {/* ==================== PANEL DE PRODUCTOS ==================== */}
            <div className="table_productos">
            <VentasModal  isOpen={isModalOpen} onClose={cerrarModal}/>
                <div className="head_sale">
                    <h2>Factura</h2>
                    <div className="tipo-venta">
                        <label>
                            <input
                                type="radio"
                                value="contado"
                                checked={tipoFactura === "contado"}
                                onChange={(e) => setTipoFactura(e.target.value as any)}
                            />
                            Al Contado
                        </label>
                        <label>
                            <input
                                type="radio"
                                value="credito"
                                checked={tipoFactura === "credito"}
                                onChange={(e) => setTipoFactura(e.target.value as any)}
                            />
                            A Crédito
                        </label>
                    </div>
                </div>

                <div className="options_search">
                <SearchSelect
                    items={productos}
                    displayKey='nombre'
                    maxResults={10}
                    label='Agrega un producto'
                    placeholder='Buscar producto...'
                    onSelect={handleAddListProduct}
                    onSelectClean={true}
                    
                />
                <button className='btn btn-sm' onClick={abrirModal}>Ver todas las facturas</button>
                </div>

                <table className='productos_sale'>
                    <thead>
                        <tr>
                            <th>PRODUCTO</th>
                            <th>PRECIO</th>
                            <th>UND</th>
                            <th>DESC.</th>
                            <th>SUB-TOTAL</th>
                            <th>TOTAL</th>
                            <th>REMOVER</th>
                        </tr>
                    </thead>
                    <tbody>
                        {DetalleVenta.length === 0 ? (
                            <tr>
                                <td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>
                                    <p>No hay productos en el carrito</p>
                                    <span style={{ fontSize: '0.875rem', opacity: 0.7 }}>
                                        Busca y agrega productos para comenzar
                                    </span>
                                </td>
                            </tr>
                        ) : (
                            DetalleVenta.map((det, idx) => {
                                const productoItem = productos.find((i) => i.id === det.producto_id);
                                const stockBajo = (productoItem?.stock_actual || 0) < 5;
                                const totalItem = det.subtotal - (det.descuento_monto ?? 0);

                                return (
                                    <tr key={`${det.producto_id}-${idx}`}>
                                        <td>
                                            <div className="prod_det">
                                                <span className="prod-nombre">{productoItem?.nombre || 'N/A'}</span>
                                                <span className="prod-codigo">{productoItem?.codigo ?? 'N/A'}</span>
                                                <span className={`prod-stock ${stockBajo ? 'stock-bajo' : ''}`}>
                                                    Stock: {productoItem?.stock_actual ?? 'N/A'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="precio">${formatNumber(det.precio_unitario)}</td>
                                        <td>
                                            <div className="change_cantidad">
                                                <button
                                                    onClick={() => updateDetalle(det.producto_id, { cantidad: det.cantidad - 1 })}
                                                    disabled={det.cantidad <= 1}
                                                >
                                                    <ChevronLeft size={17} />
                                                </button>
                                                <span className="cantidad">{det.cantidad}</span>
                                                <button
                                                    onClick={() => updateDetalle(det.producto_id, { cantidad: det.cantidad + 1 })}
                                                >
                                                    <ChevronRight size={17} />
                                                </button>
                                            </div>
                                        </td>
                                        <td>
                                            <PriceInput
                                                value={det.descuento_monto ?? 0}
                                                label=''
                                                onChange={(monto) => updateDetalle(det.producto_id, { descuento_monto: Number(monto) })}
                                            />
                                        </td>
                                        <td className="subtotal">${formatNumber(det.subtotal)}</td>
                                        <td className="total-item">${formatNumber(totalItem)}</td>
                                        <td>
                                            <button
                                                className="btn-remove"
                                                onClick={() => removeProducto(det.producto_id)}
                                                title="Eliminar producto"
                                            >
                                                <Trash size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* ==================== PANEL DE DETALLE DE VENTA ==================== */}
            <div className="detail_sale">
                {/* ==================== CLIENTE ==================== */}
                <div className="select_cliente">
                    <SearchSelect
                        displayKey='nombre'
                        items={clientes}
                        label='Selecciona un cliente'
                        placeholder='Buscar cliente...'
                        defaultValue={ClienteSeleccionado?.id ?? null}
                        required={tipoFactura === 'credito'}
                        onSelect={(cliente) => setClienteSeleccionado(cliente)}
                    /><br/>

                    {ClienteSeleccionado && (
                        <ul className="detail_cliente">
                            <li>
                                <span>Creado</span>
                                <span>{ClienteSeleccionado?.creado_en ? formatDate(ClienteSeleccionado.creado_en) : 'N/A'}</span>
                            </li>
                            <li>
                                <span>Crédito límite</span>
                                <span>${ClienteSeleccionado?.limite_credito ? formatNumber(ClienteSeleccionado.limite_credito) : '0.00'}</span>
                            </li>
                        </ul>
                    )}
                </div>

                {/* ==================== RESUMEN ==================== */}
                <div className="summary_payment">
                    <div className="resumen-section">
                        <h4><ReceiptText size={14} /> Resumen de pago</h4>
                        <ul className="resumen-list">
                            <li>
                                <span>Carrito</span>
                                <span>({DetalleVenta.length}) Productos</span>
                            </li>
                            <li>
                                <span>Sub-total</span>
                                <span>${formatNumber(subtotalSinDescuento)}</span>
                            </li>
                            {sumaDescuentosItems > 0 && (
                                <li>
                                    <span>Desc. items</span>
                                    <span className="descuento">- ${formatNumber(sumaDescuentosItems)}</span>
                                </li>
                            )}
                            <li>
                                <span>ITBIS ({configuracion?.iva_porcentaje || 18}%)</span>
                                <span>${formatNumber(totalItbs)}</span>
                            </li>
                        </ul>
                    </div>

                    {/* ==================== MÉTODOS DE PAGO ==================== */}
                    {tipoFactura === 'contado' && (
                        <div className="pagos-section">
                            <h4><DollarSign size={16} /> Métodos de pago</h4>

                            {/* Lista de pagos agregados */}
                            {DetallePago.length > 0 && (
                                <ul className="pagos-list">
                                    {DetallePago.map((pago, idx) => {
                                        const metodo = metodosPago?.find(m => m.id === pago.metodo_pago_id);
                                        return (
                                            <li key={idx} className="pago-item">
                                                <div className="pago-info">
                                                    <span className="metodo">{metodo?.nombre || 'N/A'}</span>
                                                    <span className="monto">${formatNumber(pago.monto)}</span>
                                                    {pago.referencia && (
                                                        <span className="referencia">Ref: {pago.referencia}</span>
                                                    )}
                                                </div>
                                                <span
                                                    onClick={() => eliminarPago(idx)}
                                                    className="btn-remove-pago"
                                                    title="Eliminar pago"
                                                >
                                                    <Delete size={14} />
                                                </span>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}

                            {/* Formulario para agregar pago */}
                            <div className="agregar-pago-form">
                                <div className="form-row">
                                    <div className="form-group">
                                        <select
                                            value={pagoTemp.metodo_pago_id}
                                            onChange={(e) => handleChangePago("metodo_pago_id", Number(e.target.value))}
                                            className="form-select"
                                        >
                                            <option value={0}>Seleccionar...</option>
                                            {metodosPago?.map((metodo) => (
                                                <option key={metodo.id} value={metodo.id}>
                                                    {metodo.nombre}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="form-group">
                                        {metodosPago?.find(m => m.id === pagoTemp.metodo_pago_id)?.requiere_referencia ? (
                                            <input
                                                type="text"
                                                value={pagoTemp.referencia || ''}
                                                onChange={(e) => handleChangePago("referencia", e.target.value)}
                                                placeholder="Últimos 4 dígitos..."
                                                className="form-input"
                                            />
                                        ) : null}
                                        <div className="input-group">
                                            <input
                                                type="number"
                                                value={pagoTemp.monto || ''}
                                                onChange={(e) => handleChangePago("monto", Number(e.target.value))}
                                                placeholder="0.00"
                                                step="0.01"
                                                min="0"
                                                className="form-input"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="form-actions">
                                    <button
                                        type="button"
                                        onClick={agregarPago}
                                        className="btn-agregar-pago btn btn-primary"
                                        disabled={!pagoTemp.metodo_pago_id || !pagoTemp.monto}
                                    >
                                        <Plus size={16} />
                                        Agregar pago
                                    </button>
                                </div>
                            </div>

                            {/* Resumen de pagos */}
                            <div className="pagos-resumen">
                                <div className="resumen-row total-row">
                                    <span className="label-total">Total a pagar:</span>
                                    <span className="amount amount-total">${formatNumber((subtotalSinDescuento - sumaDescuentosItems))}</span>
                                </div>
                                <div className="resumen-row pagado-row">
                                    <span>Total pagado:</span>
                                    <span className="amount pagado">${formatNumber(totalPagado)}</span>
                                </div>
                                {saldoPendiente > 0 && (
                                    <div className="resumen-row pendiente-row">
                                        <span className="label-pendiente">Saldo pendiente:</span>
                                        <span className="amount pendiente">${formatNumber(saldoPendiente)}</span>
                                    </div>
                                )}
                                {cambio > 0 && (
                                    <div className="resumen-row cambio-row">
                                        <span className="label-cambio">💵 Cambio a devolver:</span>
                                        <span className="amount cambio">${formatNumber(cambio)}</span>
                                    </div>
                                )}
                                
                                {/* Mensaje informativo del cambio */}
                                {cambio > 0 && (
                                    <div className="info-cambio">
                                        <small>
                                            ℹ️ El cliente debe recibir <strong>${formatNumber(cambio)}</strong> de cambio
                                        </small>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Resumen para crédito */}
                    {tipoFactura === 'credito' && (
                        <div className="pagos-resumen">
                            <div className="resumen-row total-credito">
                                <span>Total a crédito:</span>
                                <span className="amount">${formatNumber(totalFinal)}</span>
                            </div>
                            {ClienteSeleccionado && ClienteSeleccionado.id !== 1 && (
                                <div className="resumen-row disponible-credito">
                                    <span>Disponible:</span>
                                    <span className="amount">
                                        ${formatNumber(
                                            Number(ClienteSeleccionado.limite_credito || 0) - 
                                            Number(ClienteSeleccionado.saldo_actual || 0)
                                        )}
                                    </span>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* ==================== BOTÓN PROCESAR ==================== */}
                <div className="actions-section">
                    {tipoFactura === "credito" ? (
                        <button
                            className="btn-procesar btn btn-info"
                            disabled={!ClienteSeleccionado?.activo || ClienteSeleccionado?.id === 1 || load}
                            onClick={handleGenerarVenta}
                        >
                            {load ? "Procesando..." : "Registrar como Crédito"}
                        </button>
                    ) : (
                        <button
                            className={`btn-procesar btn ${
                                totalFinal < totalPagado 
                                    ? 'btn-warning' 
                                    : totalFinal === totalPagado 
                                    ? 'btn-success' 
                                    : 'btn-danger'
                            }`}
                            onClick={handleGenerarVenta}
                            disabled={DetalleVenta.length === 0 || load}
                        >
                            {load ? "Procesando..." : "Procesar Venta"}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Ventas;