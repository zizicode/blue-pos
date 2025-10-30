import type { VentaConDetalles } from '@renderer/type/sales.type';
import BottomModal from '@renderer/components/BottomModal/BottomModal';
import { DataTable, DataTableProps, ActionButton } from '@renderer/components/DataTable/DataTable';
import { usePOSStore } from '@renderer/store/usePOSStore';
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useApi } from '@renderer/services/useApi';
import { formatNumber } from '@renderer/utils/formatNumber';
import { formatDate } from '@renderer/utils/formatDate';
import { ArrowLeftToLine, CircleOff, Download, FileText, ReceiptText } from 'lucide-react';
import { useAuthStore } from '@renderer/store/auth';
import FormInput, { InputConfig } from '@renderer/components/FormsInputs/FormsInputs';
import { formatPrice } from '@renderer/hooks/usePriceInput';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const VentasModal: React.FC<ModalProps> = ({ isOpen, onClose }) => {
  const { call } = useApi();
  const { user } = useAuthStore();
  const { usuarios } = usePOSStore();
  
  const [modeVenta, setModeVenta] = useState<'tabla' | 'detalle'>('tabla');
  const [ventasConDetalles, setVentasConDetalles] = useState<VentaConDetalles[]>([]);
  const [ventasSeleccionadas, setVentasSeleccionadas] = useState<VentaConDetalles[]>([]);
  const [ventaActual, setVentaActual] = useState<VentaConDetalles | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // ==================== CARGA DE DATOS ====================
  
  const cargarVentas = useCallback(async () => {
    if (!isOpen) return;
    
    setIsLoading(true);
    try {
      const resp = await call('ventas', 'getAll');
      const listaVentas = Array.isArray(resp?.data) ? resp.data : [];

      const detallesPromises = listaVentas.map((venta: any) =>
        call('ventas', 'getById', { id: venta.id })
      );

      const detallesDeVentas = await Promise.all(detallesPromises);
      setVentasConDetalles(detallesDeVentas.map((d) => d.data));
    } catch (error) {
      console.error('Error al cargar ventas:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isOpen]); // ✅ Solo depende de isOpen, no de call

  useEffect(() => {
    cargarVentas();
  }, [cargarVentas]);

  // ==================== HANDLERS ====================

  const handleCancelarFactura = useCallback(async () => {
    if (ventasSeleccionadas.length === 0) return;
    
    const confirmMsg = `¿Seguro que deseas anular ${ventasSeleccionadas.length} factura(s)?`;
    if (!confirm(confirmMsg)) return;

    try {
      await Promise.all(
        ventasSeleccionadas.map((venta) =>
          call('ventas', 'cancelar', {
            id: venta.id,
            usuario_id: user?.usuario.id,
            motivo: ''
          })
        )
      );

      console.log('✅ Facturas anuladas');
      await cargarVentas(); // Recargar lista
      setVentasSeleccionadas([]); // Limpiar selección
    } catch (error) {
      console.error('❌ Error al anular facturas:', error);
    }
  }, [ventasSeleccionadas, user, call, cargarVentas]);

  const handleVerDetalles = useCallback((ventas: VentaConDetalles[]) => {
    if (ventas.length === 0) return;
    setVentaActual(ventas[0]);
    setModeVenta('detalle');
  }, []);

  const handleVolverATabla = useCallback(() => {
    setModeVenta('tabla');
    setVentaActual(null);
  }, []);

  const handleDescargarPDF = useCallback((ventas: VentaConDetalles[]) => {
    console.log('Descargar PDF:', ventas);
    // TODO: Implementar descarga de PDF
  }, []);

  // ==================== CONFIGURACIÓN DE INPUTS ====================

  const detalleInputs: InputConfig[] = useMemo(() => {
    if (!ventaActual) return [];

    const cliente = usuarios.find((u) => u.id === ventaActual.cliente_id);
    const totalPagado = ventaActual.pagos?.reduce(
      (total, pago) => total + Number(pago.monto ?? 0),
      0
    ) ?? 0;

    return [
      {
        name: 'cliente',
        type: 'text',
        value: cliente?.nombre ?? '--',
        label: 'Nombre del cliente',
        disabled: true,
        col: 1,
      },
      {
        name: 'tipo_venta',
        type: 'text',
        value: ventaActual.tipo_venta ?? '--',
        label: 'Tipo de factura',
        disabled: true,
        col: 1,
      },
      {
        name: 'estado',
        type: 'text',
        value: ventaActual.estado ?? '--',
        label: 'Estado',
        disabled: true,
        col: 1,
      },
      {
        name: 'fecha',
        type: 'text',
        value: formatDate(ventaActual.creado_en ?? 0),
        label: 'Fecha de facturación',
        disabled: true,
        col: 1,
      },
      {
        name: 'subtotal',
        type: 'text',
        value: `$${formatNumber(ventaActual.subtotal ?? 0)}`,
        label: 'Subtotal',
        disabled: true,
        col: 1,
      },
      {
        name: 'total_pagado',
        type: 'text',
        value: totalPagado > 0 
          ? `$${formatPrice(totalPagado)}` 
          : 'Sin pagos registrados',
        label: 'Total pagado',
        disabled: true,
        col: 1,
      },
    ];
  }, [ventaActual, usuarios]);

  // ==================== CONFIGURACIÓN TABLA PRINCIPAL ====================

  const actionButtons: ActionButton[] = useMemo(() => [
    {
      label: 'Ver detalles',
      onClick: handleVerDetalles,
      variant: 'secondary',
      icon: <FileText size={14} />,
      showWhen: 'single',
    },
    {
      label: `Anular factura${ventasSeleccionadas.length > 1 ? 's' : ''}`,
      onClick: handleCancelarFactura,
      variant: 'danger',
      icon: <CircleOff size={14} />,
    },
    {
      label: 'Descargar PDF',
      onClick: handleDescargarPDF,
      icon: <Download size={14} />,
      variant: 'primary',
    },
  ], [ventasSeleccionadas.length, handleVerDetalles, handleCancelarFactura, handleDescargarPDF]);

  const configTablaVentas: DataTableProps = useMemo(() => ({
    title: 'Todas las Facturas',
    actionButtonsWithSelection: actionButtons,
    icon: <ReceiptText />,
    columns: [
      { label: 'Folio', key: 'folio' },
      { label: 'Cliente', key: 'cliente_nombre' },
      {
        label: 'Tipo',
        key: 'tipo_venta',
        render: (tipo) => (
          <span className={`badge badge-xs ${tipo === 'contado' ? 'success' : 'warning'}`}>
            {tipo}
          </span>
        ),
      },
      { 
        label: 'Productos', 
        key: 'detalles', 
        render: (detalles) => detalles?.length ?? 0 
      },
      { 
        label: '($) Total', 
        key: 'total', 
        render: (total) => `$${formatNumber(total ?? 0)}` 
      },
      {
        label: '($) Pagado',
        key: 'pagos',
        render: (pagos) => {
          const total = pagos?.reduce((sum, pago) => sum + Number(pago.monto ?? 0), 0) ?? 0;
          return `$${formatNumber(total)}`;
        },
      },
      { 
        label: 'Fecha', 
        key: 'creado_en', 
        render: (fecha) => formatDate(fecha) 
      },
    ],
    data: ventasConDetalles,
    showDateFilter: true,
    selectable: true,
    onSelectionChange: (seleccionadas) => setVentasSeleccionadas(seleccionadas as VentaConDetalles[]),
  }), [ventasConDetalles, actionButtons]);

  // ==================== CONFIGURACIÓN TABLA DETALLE ====================

  const configTablaDetalle: DataTableProps = useMemo(() => ({
    title: `Factura: ${ventaActual?.folio ?? '--'}`,
    data: ventaActual?.detalles ?? [],
    columns: [
      { label: 'Producto', key: 'producto_nombre' },
      { label: 'Cantidad', key: 'cantidad' },
      {
        label: 'Precio Unidad',
        key: 'precio_unitario',
        render: (precio) => `$${formatPrice(precio)}`,
      },
      {
        label: 'Descuento',
        key: 'descuento_monto',
        render: (descuento) => `$${formatPrice(descuento)}`,
      },
      {
        label: 'Subtotal',
        key: 'subtotal',
        render: (subtotal) => `$${formatPrice(subtotal)}`,
      },
    ],
  }), [ventaActual]);

  // ==================== RENDER ====================

  return (
    <BottomModal isOpen={isOpen} onClose={onClose} actions>
      {isLoading ? (
        <div className="loading-container">
          <p>Cargando ventas...</p>
        </div>
      ) : (
        <>
          {modeVenta === 'tabla' && (
            <>
              <DataTable {...configTablaVentas} />
              <button className="btn btn-ms btn-warning" onClick={onClose}>
                Cerrar
              </button>
            </>
          )}

          {modeVenta === 'detalle' && ventaActual && (
            <DataTable {...configTablaDetalle}>
              <button className="btn btn-ms btn-danger" onClick={handleVolverATabla}>
                <ArrowLeftToLine size={14} /> <span>Volver</span>
              </button>
              <br />
              <br />
              <FormInput 
                onChange={(datos) => console.log('Cambios en form:', datos)} 
                inputs={detalleInputs} 
              />
            </DataTable>
          )}
        </>
      )}
    </BottomModal>
  );
};

export default VentasModal;