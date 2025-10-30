import React, { useState, useEffect } from 'react';
import { Clock, DollarSign, TrendingUp, TrendingDown, XCircle, CheckCircle, AlertCircle, Ban, Eye } from 'lucide-react';
import { usePOSStore } from '@renderer/store/usePOSStore';
import { useApi } from '@renderer/services/useApi';
import { useAuthStore } from '@renderer/store/auth';
import Head from '@renderer/components/Head/Head';
import StartCard, { Card } from '@renderer/components/StatCard/StartCard';
import BottomModal from '@renderer/components/BottomModal/BottomModal';
import FormInput, { InputConfig } from '@renderer/components/FormsInputs/FormsInputs';
import { DataTable, DataTableColumn, ActionButton } from '@renderer/components/DataTable/DataTable';
import './TurnosCaja.scss';
import { formatNumber } from '@renderer/utils/formatNumber';
import Toast from '@renderer/lib/toast';
import { useVentasStats } from '@renderer/hooks/useVentasStats';

// ==================== TIPOS ====================
export interface TurnoActivo {
  id: number;
  caja_id: number;
  caja_nombre: string;
  almacen_nombre: string;
  fecha_apertura: string;
  monto_inicial: number;
  estadisticas: {
    total_entradas: number;
    total_salidas: number;
    total_ventas: number;
    monto_actual: number;
  };
  movimientos: Movimiento[];
}

interface Movimiento {
  id: number;
  turno_id: number;
  tipo: 'entrada' | 'salida' | 'venta' | 'abono' | 'devolucion';
  monto: number;
  metodo_pago_id: number;
  metodo_pago_nombre: string;
  concepto: string;
  fecha: string;
  venta_id?: number;
  caja_nombre?: string;
}

interface DetalleVenta {
  id: number;
  producto_id: number;
  producto_nombre: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
}

// ==================== COMPONENTE ====================
const TurnosCaja: React.FC = () => {
  const { cajas, metodosPago, ventas } = usePOSStore();
  const { user } = useAuthStore();
  const { call } = useApi();

  // Estados
  const [turnoActivo, setTurnoActivo] = useState<TurnoActivo | null>(null);
  const [loading, setLoading] = useState(true);
  const [openAbrirTurno, setOpenAbrirTurno] = useState(false);
  const [openCerrarTurno, setOpenCerrarTurno] = useState(false);
  const [openMovimiento, setOpenMovimiento] = useState(false);
  const [openAnularVenta, setOpenAnularVenta] = useState(false);
  const [openDetalleVenta, setOpenDetalleVenta] = useState(false);
  const [ventaSeleccionada, setVentaSeleccionada] = useState<any>(null);
  
  
  const ventas_estadisticas = useVentasStats(ventas, turnoActivo);

  // Formularios
  const [abrirTurnoData, setAbrirTurnoData] = useState({
    caja_id: null as number | null,
    monto_inicial: 0,
    notas: '',
  });

  const [cerrarTurnoData, setCerrarTurnoData] = useState({
    monto_final: 0,
    notas: '',
  });

  const [movimientoData, setMovimientoData] = useState({
    tipo: 'entrada' as 'entrada' | 'salida',
    monto: 0,
    metodo_pago_id: metodosPago?.[0]?.id || 1,
    concepto: '',
  });

  const [anularVentaData, setAnularVentaData] = useState({
    motivo: '',
  });

  // ==================== PERMISOS ====================
  const tienePermisoAnular = user?.permisos?.some(
    p => p.modulo === 'caja' && p.accion?.includes('crear')
  ) ?? false;

  // ==================== CARGAR DATOS ====================
  useEffect(() => {
    cargarTurnoActivo();
  }, [user]);

  const cargarTurnoActivo = async () => {
    if (!user?.usuario.id) return;

    setLoading(true);
    try {
      const result = await call('turnosCaja', 'getTurnoActivo', {
        usuario_id: user.usuario.id
      });

      if (result?.success && result.data) {
        setTurnoActivo({ ...result.data, estadisticas: { ...result.data.estadisticas, monto_actual: (Number(result.data.estadisticas.total_entradas) + Number(result.data.monto_inicial)) - Number(result.data.estadisticas.total_salidas) } })
      } else {
        setTurnoActivo(null);
      }
    } catch (error) {
      console.error('Error al cargar turno activo:', error);
    } finally {
      setLoading(false);
    }
  };

  const cargarDetalleVenta = async (movimiento: Movimiento) => {
    if (!movimiento.venta_id) {
      Toast.error('Este movimiento no tiene venta asociada');
      return;
    }

    try {
      const result = await call('ventas', 'getById', { id: movimiento.venta_id });

      if (result?.success && result.data) {
        setVentaSeleccionada({
          ...result.data,
          movimiento_id: movimiento.id
        });
        setOpenDetalleVenta(true);
      }
    } catch (error) {
      console.error('Error al cargar detalle de venta:', error);
      Toast.error('Error al cargar detalle de venta');
    }
  };

  // ==================== HANDLERS DE TURNO ====================
  const handleAbrirTurno = async () => {
    if (!user?.usuario.id || !abrirTurnoData.caja_id) {
      Toast.error('Selecciona una caja');
      return;
    }

    try {
      const result = await call('turnosCaja', 'abrirTurno', {
        ...abrirTurnoData,
        usuario_id: user.usuario.id
      });

      if (result?.success) {
        await cargarTurnoActivo();
        setOpenAbrirTurno(false);
        setAbrirTurnoData({ caja_id: null, monto_inicial: 0, notas: '' });
        Toast.success('Turno abierto exitosamente');
      } else {
        Toast.error(result?.message || 'Error al abrir turno');
      }
    } catch (error) {
      console.error('Error al abrir turno:', error);
      Toast.error('Error al abrir turno');
    }
  };

  const handleCerrarTurno = async () => {
    if (!turnoActivo || !user?.usuario.id) return;

    if (!cerrarTurnoData.monto_final) {
      Toast.error('Ingresa el monto final de caja');
      return;
    }

    if (!confirm('¿Estás seguro de cerrar el turno? Esta acción no se puede deshacer.')) return;

    try {
      const result = await call('turnosCaja', 'cerrarTurno', {
        id: turnoActivo.id,
        usuario_id: user.usuario.id,
        ...cerrarTurnoData
      });

      if (result?.success) {
        Toast.success(
          `Turno cerrado exitosamente\n\nEsperado: $${formatNumber(result.data.monto_esperado)}\nFinal: $${formatNumber(result.data.monto_final)}\nDiferencia: $${formatNumber(result.data.diferencia)}`,
          { duration: 8000 }
        );
        await cargarTurnoActivo();
        setOpenCerrarTurno(false);
        setCerrarTurnoData({ monto_final: 0, notas: '' });
      } else {
        Toast.error(result?.message || 'Error al cerrar turno');
      }
    } catch (error) {
      console.error('Error al cerrar turno:', error);
      Toast.error('Error al cerrar turno');
    }
  };

  const handleRegistrarMovimiento = async () => {
    if (!turnoActivo) return;

    if (!movimientoData.concepto.trim()) {
      Toast.error('Ingresa el concepto del movimiento');
      return;
    }

    if (movimientoData.monto <= 0) {
      Toast.error('El monto debe ser mayor a 0');
      return;
    }

    try {
      const result = await call('turnosCaja', 'registrarMovimiento', {
        turno_id: turnoActivo.id,
        ...movimientoData
      });

      if (result?.success) {
        await cargarTurnoActivo();
        setOpenMovimiento(false);
        setMovimientoData({
          tipo: 'entrada',
          monto: 0,
          metodo_pago_id: metodosPago?.[0]?.id || 1,
          concepto: ''
        });
        Toast.success('Movimiento registrado exitosamente');
      } else {
        Toast.error(result?.message || 'Error al registrar movimiento');
      }
    } catch (error) {
      console.error('Error al registrar movimiento:', error);
      Toast.error('Error al registrar movimiento');
    }
  };

  const handleAnularVenta = async () => {
    if (!ventaSeleccionada || !user?.usuario.id) return;

    if (!anularVentaData.motivo.trim()) {
      Toast.error('Debes especificar el motivo de la anulación');
      return;
    }

    if (!confirm(`¿Estás seguro de anular la venta ${ventaSeleccionada.folio}? Esta acción devolverá los productos al inventario y no se puede deshacer.`)) {
      return;
    }

    try {
      const result = await call('devoluciones', 'create', {
        venta_id: ventaSeleccionada.id,
        usuario_id: user.usuario.id,
        motivo: anularVentaData.motivo,
        detalles: ventaSeleccionada.detalles?.map((d: DetalleVenta) => ({
          producto_id: d.producto_id,
          cantidad: d.cantidad,
          precio_unitario: d.precio_unitario,
          subtotal: d.subtotal
        })) || []
      });

      if (result?.success) {
        Toast.success(`Venta ${ventaSeleccionada.folio} anulada exitosamente`);
        await cargarTurnoActivo();
        setOpenAnularVenta(false);
        setOpenDetalleVenta(false);
        setVentaSeleccionada(null);
        setAnularVentaData({ motivo: '' });
      } else {
        Toast.error(result?.message || 'Error al anular venta');
      }
    } catch (error) {
      console.error('Error al anular venta:', error);
      Toast.error('Error al anular venta');
    }
  };

  // ==================== CONFIGURACIÓN DE INPUTS ====================
  const inputsAbrirTurno: InputConfig[] = [
    {
      name: 'caja_id',
      label: 'Caja',
      type: 'select',
      value: abrirTurnoData.caja_id,
      placeholder: 'Selecciona una caja',
      required: true,
      icon: <DollarSign />,
      options: cajas.filter(c => c.activo).map(c => ({
        label: `${c.nombre} - ${c.almacen_nombre}`,
        value: c.id
      })),
      col: 4,
    },
    {
      name: 'monto_inicial',
      label: 'Monto inicial',
      type: 'number',
      value: abrirTurnoData.monto_inicial,
      placeholder: '0.00',
      required: true,
      icon: <DollarSign />,
      min: 0,
      step: 0.01,
      col: 4,
    },
    {
      name: 'notas',
      label: 'Notas (opcional)',
      type: 'textarea',
      value: abrirTurnoData.notas,
      placeholder: 'Observaciones del turno...',
      col: 4,
      rows: 3,
    },
  ];

  const inputsCerrarTurno: InputConfig[] = [
    {
      name: 'monto_final',
      label: 'Monto final en caja',
      type: 'number',
      value: cerrarTurnoData.monto_final,
      placeholder: '0.00',
      required: true,
      icon: <DollarSign />,
      min: 0,
      step: 0.01,
      col: 4,
      hint: `Monto total en caja: $${formatNumber(turnoActivo?.estadisticas.monto_actual || 0)} menos monto inicial $${formatNumber(turnoActivo?.monto_inicial || 0)} = $${formatNumber((turnoActivo?.estadisticas.monto_actual || 0) - (turnoActivo?.monto_inicial || 0))}`
    },
    {
      name: 'notas',
      label: 'Notas de cierre (opcional)',
      type: 'textarea',
      value: cerrarTurnoData.notas,
      placeholder: 'Observaciones del cierre...',
      col: 4,
      rows: 3,
    },
  ];

  const inputsMovimiento: InputConfig[] = [
    {
      name: 'tipo',
      label: 'Tipo de movimiento',
      type: 'select',
      value: movimientoData.tipo,
      required: true,
      options: [
        { label: 'Entrada de efectivo', value: 'entrada' },
        { label: 'Salida de efectivo', value: 'salida' },
      ],
      col: 2,
    },
    {
      name: 'monto',
      label: 'Monto',
      type: 'number',
      value: movimientoData.monto,
      required: true,
      icon: <DollarSign />,
      min: 0.01,
      step: 0.01,
      col: 2,
    },
    {
      name: 'metodo_pago_id',
      label: 'Método de pago',
      type: 'select',
      value: movimientoData.metodo_pago_id,
      required: true,
      options: metodosPago.filter(m => m.activo).map(m => ({
        label: m.nombre,
        value: m.id
      })),
      col: 2,
    },
    {
      name: 'concepto',
      label: 'Concepto',
      type: 'text',
      value: movimientoData.concepto,
      placeholder: 'Motivo del movimiento',
      required: true,
      col: 2,
    },
  ];

  const inputsAnularVenta: InputConfig[] = [
    {
      name: 'motivo',
      label: 'Motivo de la anulación',
      type: 'textarea',
      value: anularVentaData.motivo,
      placeholder: 'Explica por qué se está anulando esta venta...',
      required: true,
      icon: <Ban />,
      col: 4,
      rows: 4,
      hint: 'Este motivo quedará registrado permanentemente'
    },
  ];

  // ==================== COLUMNAS DE TABLA ====================
  const columnasMovimientos: DataTableColumn[] = [
    { key: 'id', label: '#' },
    {
      key: 'tipo',
      label: 'Tipo',
      render: (data) => {
        const tipos: Record<string, { label: string; color: string }> = {
          entrada: { label: 'Entrada', color: 'success' },
          salida: { label: 'Salida', color: 'error' },
          venta: { label: 'Venta', color: 'primary' },
          abono: { label: 'Abono', color: 'info' },
          devolucion: { label: 'Devolución', color: 'warning' },
        };
        const tipo = tipos[data] || { label: data, color: 'secondary' };
        return <span className={`badge badge-${tipo.color} badge-sm`}>{tipo.label}</span>;
      }
    },
    {
      key: 'monto',
      label: 'Monto',
      render: (data) => `$${formatNumber(Number(data) || 0)}`
    },
    { key: 'metodo_pago_nombre', label: 'Método' },
    { key: 'concepto', label: 'Concepto' },
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
  ];

  const accionesMovimientos: ActionButton[] = [
    {
      label: 'Ver Detalle',
      icon: <Eye size={14} />,
      onClick: (movimientos) => {
        const mov = movimientos[0] as Movimiento;
        if (mov.tipo === 'venta' && mov.venta_id) {
          cargarDetalleVenta(mov);
        } else {
          Toast.info('Este movimiento no tiene detalle de venta');
        }
      },
      variant: 'secondary',
      showWhen: 'single'
    },
    ...(tienePermisoAnular ? [{
      label: 'Anular Venta',
      icon: <Ban size={14} />,
      onClick: (movimientos: Movimiento[]) => {
        const mov = movimientos[0];
        if (mov.tipo === 'venta' && mov.venta_id) {
          cargarDetalleVenta(mov);
          setTimeout(() => setOpenAnularVenta(true), 500);
        } else {
          Toast.error('Solo se pueden anular ventas');
        }
      },
      variant: 'danger' as const,
      showWhen: 'single' as const
    }] : []),
  ];

  const columnasDetalles: DataTableColumn[] = [
    { key: 'producto_nombre', label: 'Producto' },
    { key: 'cantidad', label: 'Cantidad' },
    {
      key: 'precio_unitario',
      label: 'Precio Unit.',
      render: (data) => `$${formatNumber(Number(data) || 0)}`
    },
    {
      key: 'subtotal',
      label: 'Subtotal',
      render: (data) => `$${formatNumber(Number(data) || 0)}`
    },
  ];

  // ==================== CARDS ====================
  const cards: Card[] = turnoActivo ? [
    {
      title: 'Monto Inicial',
      value: `$${formatNumber(turnoActivo.monto_inicial || 0)}`,
      icon: <DollarSign />,
    },
    {
      title: 'Total en ventas',
      value: `$${formatNumber(ventas_estadisticas.totalTurno.totalVentasContado)}`,
      icon: <TrendingUp />,
      subValue: `${turnoActivo.estadisticas.total_ventas || 0} ventas`
    },
    {
      title: 'Total de abonos',
      value: `$${formatNumber(ventas_estadisticas.totalTurno.totalAbono)}`,
      icon: <TrendingUp />,
    },
    {
      title: 'Total Salidas',
      value: `$${formatNumber(ventas_estadisticas.totalTurno.totalSalida)}`,
      icon: <TrendingDown />,
    },
    {
      title: 'Monto en caja',
      value: `$${formatNumber(ventas_estadisticas.totalTurno.totalActualCaja)}`,
      icon: <DollarSign />,
    },
  ] : [];

  // ==================== RENDER ====================
  if (loading) {
    return (
      <div className="TurnosCaja__loading">
        <Clock className="spin" size={48} />
        <p>Cargando información del turno...</p>
      </div>
    );
  }

  if (!turnoActivo) {
    return (
      <div className="TurnosCaja">
        <Head
          title="Gestión de Caja"
          subtitle="No hay turno activo"
          buttons={[
            {
              label: 'Abrir Turno',
              icon: <CheckCircle size={16} />,
              className: 'btn btn-sm btn-success',
              onClick: () => setOpenAbrirTurno(true),
            },
          ]}
        />

        <div className="TurnosCaja__no-turno">
          <AlertCircle size={64} />
          <h2>No hay turno activo</h2>
          <p>Abre un turno para comenzar a operar la caja</p>
          <button
            className="btn btn-success btn-lg"
            onClick={() => setOpenAbrirTurno(true)}
          >
            <CheckCircle size={20} />
            Abrir Turno
          </button>
        </div>

        {/* Modal Abrir Turno */}
        <BottomModal
          isOpen={openAbrirTurno}
          onClose={() => setOpenAbrirTurno(false)}
          actions={
            <>
              <button className="btn btn-secondary" onClick={() => setOpenAbrirTurno(false)}>
                Cancelar
              </button>
              <button className="btn btn-success" onClick={handleAbrirTurno}>
                Abrir Turno
              </button>
            </>
          }
        >
          <div className="modal-content">
            <div className="modal-header">
              <CheckCircle size={24} />
              <h3>Abrir Turno de Caja</h3>
            </div>
            <FormInput
              inputs={inputsAbrirTurno}
              onChange={(name, value) => setAbrirTurnoData(prev => ({ ...prev, [name]: value }))}
              columns={4}
              gap="md"
            />
          </div>
        </BottomModal>
      </div>
    );
  }

  return (
    <div className="TurnosCaja">
      <Head
        title="Gestión de Caja"
        subtitle={`Turno activo - ${turnoActivo.caja_nombre}`}
        buttons={[
          {
            label: 'Entrada/Salida',
            icon: <TrendingUp size={16} />,
            className: 'btn btn-sm btn-primary',
            onClick: () => setOpenMovimiento(true),
          },
          {
            label: 'Cerrar Turno',
            icon: <XCircle size={16} />,
            className: 'btn btn-sm btn-danger',
            onClick: () => setOpenCerrarTurno(true),
          },
        ]}
      />

      <StartCard cards={cards} />

      {/* Tabla de Movimientos */}
      <DataTable
        title="Movimientos del turno"
        columns={columnasMovimientos}
        data={turnoActivo.movimientos}
        itemsPerPage={10}
        icon={<DollarSign />}
        selectable
        actionButtonsWithSelection={accionesMovimientos}
      />

      {/* Modal Movimiento */}
      <BottomModal
        isOpen={openMovimiento}
        onClose={() => setOpenMovimiento(false)}
        actions={
          <>
            <button className="btn btn-secondary" onClick={() => setOpenMovimiento(false)}>
              Cancelar
            </button>
            <button className="btn btn-primary" onClick={handleRegistrarMovimiento}>
              Registrar Movimiento
            </button>
          </>
        }
      >
        <div className="modal-content">
          <div className="modal-header">
            <TrendingUp size={24} />
            <h3>Registrar Entrada/Salida</h3>
          </div>
          <FormInput
            inputs={inputsMovimiento}
            onChange={(name, value) => setMovimientoData(prev => ({ ...prev, [name]: value }))}
            columns={4}
            gap="md"
          />
        </div>
      </BottomModal>

      {/* Modal Cerrar Turno */}
      <BottomModal
        isOpen={openCerrarTurno}
        onClose={() => setOpenCerrarTurno(false)}
        actions={
          <>
            <button className="btn btn-secondary" onClick={() => setOpenCerrarTurno(false)}>
              Cancelar
            </button>
            <button className="btn btn-danger" onClick={handleCerrarTurno}>
              Cerrar Turno
            </button>
          </>
        }
      >
        <div className="modal-content">
          <div className="modal-header">
            <XCircle size={24} />
            <h3>Cerrar Turno de Caja</h3>
          </div>
          <FormInput
            inputs={inputsCerrarTurno}
            onChange={(name, value) => setCerrarTurnoData(prev => ({ ...prev, [name]: value }))}
            columns={4}
            gap="md"
          />
        </div>
      </BottomModal>

      {/* Modal Detalle de Venta */}
      <BottomModal
        isOpen={openDetalleVenta}
        onClose={() => {
          setOpenDetalleVenta(false);
          setVentaSeleccionada(null);
        }}
        actions={
          <>
            <button
              className="btn btn-secondary"
              onClick={() => {
                setOpenDetalleVenta(false);
                setVentaSeleccionada(null);
              }}
            >
              Cerrar
            </button>
            {tienePermisoAnular && ventaSeleccionada?.estado === 'completada' && (
              <button
                className="btn btn-danger"
                onClick={() => setOpenAnularVenta(true)}
              >
                <Ban size={16} />
                Anular Venta
              </button>
            )}
          </>
        }
      >
        <div className="modal-content">
          <div className="modal-header">
            <Eye size={24} />
            <h3>Detalle de Venta - {ventaSeleccionada?.folio}</h3>
          </div>

          {ventaSeleccionada && (
            <>
              <div className="venta-info">
                <div className="info-row">
                  <span className="label">Cliente:</span>
                  <span className="value">{ventaSeleccionada.cliente_nombre || 'Cliente General'}</span>
                </div>
                <div className="info-row">
                  <span className="label">Fecha:</span>
                  <span className="value">
                    {new Date(ventaSeleccionada.fecha).toLocaleString('es-DO')}
                  </span>
                </div>
                <div className="info-row">
                  <span className="label">Total:</span>
                  <span className="value total">
                    ${formatNumber(Number(ventaSeleccionada.total) || 0)}
                  </span>
                </div>
                <div className="info-row">
                  <span className="label">Estado:</span>
                  <span className={`badge badge-${ventaSeleccionada.estado === 'completada' ? 'success' :
                      ventaSeleccionada.estado === 'anulada' ? 'error' : 'warning'
                    }`}>
                    {ventaSeleccionada.estado}
                  </span>
                </div>
              </div>

              <DataTable
                title="Productos"
                columns={columnasDetalles}
                data={ventaSeleccionada.detalles || []}
                itemsPerPage={10}
              />
            </>
          )}
        </div>
      </BottomModal>

      {/* Modal Anular Venta */}
      <BottomModal
        isOpen={openAnularVenta}
        onClose={() => {
          setOpenAnularVenta(false);
          setAnularVentaData({ motivo: '' });
        }}
        actions={
          <>
            <button
              className="btn btn-secondary"
              onClick={() => {
                setOpenAnularVenta(false);
                setAnularVentaData({ motivo: '' });
              }}
            >
              Cancelar
            </button>
            <button
              className="btn btn-danger"
              onClick={handleAnularVenta}
              disabled={!anularVentaData.motivo.trim()}
            >
              <Ban size={16} />
              Confirmar Anulación
            </button>
          </>
        }
      >
        <div className="modal-content anular-modal">
          <div className="modal-header">
            <Ban size={24} className="text-danger" />
            <h3>Anular Venta - {ventaSeleccionada?.folio}</h3>
          </div>

          <div className="alert alert-danger">
            <AlertCircle size={20} />
            <div>
              <strong>Advertencia:</strong> Esta acción anulará completamente la venta y
              devolverá los productos al inventario. Esta acción no se puede deshacer.
            </div>
          </div>

          {ventaSeleccionada && (
            <div className="venta-summary">
              <div className="summary-row">
                <span>Total a devolver:</span>
                <span className="amount">${formatNumber(Number(ventaSeleccionada.total) || 0)}</span>
              </div>
              <div className="summary-row">
                <span>Productos:</span>
                <span>{ventaSeleccionada.detalles?.length || 0} items</span>
              </div>
            </div>
          )}

          <FormInput
            inputs={inputsAnularVenta}
            onChange={(name, value) => setAnularVentaData(prev => ({ ...prev, [name]: value }))}
            columns={4}
            gap="md"
          />
        </div>
      </BottomModal>
    </div>
  );
};

export default TurnosCaja;