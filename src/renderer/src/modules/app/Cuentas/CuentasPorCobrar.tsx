import React, { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, AlertCircle, CreditCard, Eye } from 'lucide-react';
import { useApi } from '@renderer/services/useApi';
import { useAuthStore } from '@renderer/store/auth';
import Head from '@renderer/components/Head/Head';
import StartCard, { Card } from '@renderer/components/StatCard/StartCard';
import { ActionButton, DataTable, DataTableColumn } from '@renderer/components/DataTable/DataTable';
import BottomModal from '@renderer/components/BottomModal/BottomModal';
import FormInput, { InputConfig } from '@renderer/components/FormsInputs/FormsInputs';
import './CuentasPorCobrar.scss';

// ==================== TIPOS ====================
interface CuentaPorCobrar {
  id: number;
  cliente_id: number;
  cliente_nombre: string;
  cliente_telefono: string;
  venta_id: number;
  venta_folio: string;
  fecha_venta: string;
  monto_total: number;
  monto_pagado: number;
  saldo_pendiente: number;
  fecha_vencimiento: string;
  estado: 'pendiente' | 'vencida' | 'pagada';
}

interface Abono {
  id: number;
  cuenta_id: number;
  monto: number;
  metodo_pago_id: number;
  metodo_pago_nombre: string;
  referencia?: string;
  fecha: string;
  usuario_nombre: string;
}

interface Resumen {
  total_cuentas: number;
  total_pendiente: number;
  total_vencido: number;
  total_vigente: number;
  cuentas_vencidas: number;
  cuentas_vigentes: number;
}

// ==================== COMPONENTE ====================
const CuentasPorCobrar: React.FC = () => {
  const { user } = useAuthStore();
  const { call } = useApi();

  // Estados
  const [cuentas, setCuentas] = useState<CuentaPorCobrar[]>([]);
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [openAbono, setOpenAbono] = useState(false);
  const [openDetalle, setOpenDetalle] = useState(false);
  const [cuentaSeleccionada, setCuentaSeleccionada] = useState<CuentaPorCobrar | null>(null);
  const [abonosDetalle, setAbonosDetalle] = useState<Abono[]>([]);


  // Filtros
  const [filtros, setFiltros] = useState({
    estado: '',
    vencidas: false,
  });

  // Formulario de abono
  const [abonoData, setAbonoData] = useState({
    monto: 0,
    metodo_pago_id: 1,
    referencia: '',
  });

  // ==================== CARGAR DATOS ====================
  useEffect(() => {
    cargarDatos();
  }, [filtros]);

  const cargarDatos = async () => {
    try {
      // Cargar cuentas
      const resultCuentas = await call('cuentasPorCobrar', 'getAll', filtros);
      if (resultCuentas?.success) {
        setCuentas(resultCuentas.data);
      }

      // Cargar resumen
      const resultResumen = await call('cuentasPorCobrar', 'getResumen');
      if (resultResumen?.success) {
        setResumen(resultResumen.data.resumen);
      }
    } catch (error) {
      console.error('Error al cargar datos:', error);
    } finally {
    }
  };

  // ==================== HANDLERS ====================
  const handleVerDetalle = async (rows: any[]) => {
    const cuenta = cuentas.find(c => c.id === rows[0]?.id);
    if (!cuenta) return;

    try {
      const result = await call('cuentasPorCobrar', 'getById', { id: cuenta.id });
      if (result?.success) {
        setCuentaSeleccionada(result.data);
        setAbonosDetalle(result.data.abonos || []);
        setOpenDetalle(true);
      }
    } catch (error) {
      console.error('Error al cargar detalle:', error);
    }
  };

  const handleAbrirAbono = (rows: any[]) => {
    const cuenta = cuentas.find(c => c.id === rows[0]?.id);
    if (!cuenta) return;

    if (cuenta.estado === 'pagada') {
      alert('Esta cuenta ya está pagada completamente');
      return;
    }

    setCuentaSeleccionada(cuenta);
    setAbonoData({
      monto: cuenta.saldo_pendiente,
      metodo_pago_id: 1,
      referencia: '',
    });
    setOpenAbono(true);
  };

  const handleRegistrarAbono = async () => {
    if (!cuentaSeleccionada || !user?.usuario.id) return;

    if (abonoData.monto <= 0) {
      alert('El monto debe ser mayor a 0');
      return;
    }

    if (abonoData.monto > cuentaSeleccionada.saldo_pendiente) {
      alert(`El monto no puede ser mayor al saldo pendiente ($${cuentaSeleccionada.saldo_pendiente})`);
      return;
    }

    try {
      const result = await call('abonos', 'create', {
        cuenta_id: cuentaSeleccionada.id,
        monto: abonoData.monto,
        metodo_pago_id: abonoData.metodo_pago_id,
        referencia: abonoData.referencia,
        usuario_id: user.usuario.id,
      });

      if (result?.success) {
        alert(`✅ Abono registrado\nNuevo saldo: $${result.data.nuevo_saldo}`);
        await cargarDatos();
        setOpenAbono(false);
        setCuentaSeleccionada(null);
        setAbonoData({ monto: 0, metodo_pago_id: 1, referencia: '' });
      } else {
        alert(`❌ ${result?.message || 'Error al registrar abono'}`);
      }
    } catch (error) {
      console.error('Error al registrar abono:', error);
      alert('❌ Error al registrar abono');
    }
  };

  // ==================== CONFIGURACIÓN ====================
  const cards: Card[] = resumen ? [
    {
      title: 'Total por Cobrar',
      value: `$${resumen.total_pendiente ?? 0}`,
      icon: <DollarSign />,
      subValue: `${resumen.total_cuentas} cuentas`,
    },
    {
      title: 'Vigente',
      value: `$${resumen.total_vigente ?? 0}`,
      icon: <TrendingUp />,
      subValue: `${resumen.cuentas_vigentes} cuentas`,
    },
    {
      title: 'Vencido',
      value: `$${resumen.total_vencido ?? 0}`,
      icon: <AlertCircle />,
      subValue: `${resumen.cuentas_vencidas} cuentas`,
    },
  ] : [];

  const columns: DataTableColumn[] = [
    { key: 'id', label: '#' },
    { key: 'venta_folio', label: 'Folio' },
    { key: 'cliente_nombre', label: 'Cliente' },
    {
      key: 'monto_total',
      label: 'Total',
      render: (data) => `$${Number(data)}`
    },
    {
      key: 'monto_pagado',
      label: 'Pagado',
      render: (data) => `$${Number(data)}`
    },
    {
      key: 'saldo_pendiente',
      label: 'Saldo',
      render: (data) => (
        <span className="badge badge-warning badge-sm">
          ${Number(data)}
        </span>
      )
    },
    {
      key: 'fecha_vencimiento',
      label: 'Vencimiento',
      render: (data) => new Date(data).toLocaleDateString('es-DO')
    },
    {
      key: 'estado',
      label: 'Estado',
      render: (data) => {
        const estados = {
          pendiente: { label: 'Pendiente', color: 'primary' },
          vencida: { label: 'Vencida', color: 'error' },
          pagada: { label: 'Pagada', color: 'success' },
        };
        const estado = estados[data as keyof typeof estados];
        return <span className={`badge badge-${estado.color} badge-xs`}>{estado.label}</span>;
      }
    },
  ];

  const actionButtons: ActionButton[] = [
    {
      label: 'Ver detalle',
      icon: <Eye size={15} />,
      variant: 'secondary',
      showWhen: 'single',
      onClick: handleVerDetalle,
    },
    {
      label: 'Registrar abono',
      icon: <DollarSign size={15} />,
      variant: 'success',
      showWhen: 'single',
      onClick: handleAbrirAbono,
    },
  ];

  const inputsAbono: InputConfig[] = [
    {
      name: 'monto',
      label: 'Monto del abono',
      type: 'number',
      value: abonoData.monto,
      placeholder: '0.00',
      required: true,
      icon: <DollarSign />,
      min: 0.01,
      step: 0.01,
      col: 2,
      hint: `Saldo pendiente: $${cuentaSeleccionada?.saldo_pendiente || '0.00'}`
    },
    {
      name: 'metodo_pago_id',
      label: 'Método de pago',
      type: 'select',
      value: abonoData.metodo_pago_id,
      required: true,
      icon: <CreditCard />,
      options: [
        { label: 'Efectivo', value: 1 },
        { label: 'Tarjeta', value: 2 },
        { label: 'Transferencia', value: 3 },
      ],
      col: 2,
    },
    {
      name: 'referencia',
      label: 'Referencia (opcional)',
      type: 'text',
      value: abonoData.referencia,
      placeholder: 'Número de transacción...',
      col: 4,
    },
  ];

  const columnasAbonos: DataTableColumn[] = [
    { key: 'id', label: '#' },
    {
      key: 'monto',
      label: 'Monto',
      render: (data) => `$${Number(data)}`
    },
    { key: 'metodo_pago_nombre', label: 'Método' },
    { key: 'referencia', label: 'Referencia' },
    {
      key: 'fecha',
      label: 'Fecha',
      render: (data) => new Date(data).toLocaleString('es-DO')
    },
    { key: 'usuario_nombre', label: 'Registrado por' },
  ];

  // ==================== RENDER ====================
  return (
    <div className="CuentasPorCobrar">
      <Head
        title="Cuentas por Cobrar"
        subtitle="Gestión de créditos y abonos"
        buttons={[
          {
            label: filtros.vencidas ? 'Ver todas' : 'Solo vencidas',
            icon: <AlertCircle size={16} />,
            className: `btn btn-sm ${filtros.vencidas ? 'btn-primary' : 'btn-warning'}`,
            onClick: () => setFiltros(prev => ({ ...prev, vencidas: !prev.vencidas })),
          },
        ]}
      />

      <StartCard cards={cards} />

      <DataTable
        title="Listado de cuentas por cobrar"
        columns={columns}
        data={cuentas}
        selectable
        actionButtonsWithSelection={actionButtons}
        itemsPerPage={15}
        icon={<DollarSign />}
      />

      {/* Modal Registrar Abono */}
      <BottomModal
        isOpen={openAbono}
        onClose={() => {
          setOpenAbono(false);
          setCuentaSeleccionada(null);
        }}
        actions={
          <>
            <button className="btn btn-secondary" onClick={() => setOpenAbono(false)}>
              Cancelar
            </button>
            <button className="btn btn-success" onClick={handleRegistrarAbono}>
              Registrar Abono
            </button>
          </>
        }
      >
        <div className="modal-content">
          <div className="modal-header">
            <DollarSign size={24} />
            <div>
              <h3>Registrar Abono</h3>
              {cuentaSeleccionada && (
                <p className="modal-subtitle">
                  Cliente: <strong>{cuentaSeleccionada.cliente_nombre}</strong> | 
                  Folio: <strong>{cuentaSeleccionada.venta_folio}</strong>
                </p>
              )}
            </div>
          </div>
          <FormInput
            inputs={inputsAbono}
            onChange={(name, value) => setAbonoData(prev => ({ ...prev, [name]: value }))}
            columns={4}
            gap="md"
          />
        </div>
      </BottomModal>

      {/* Modal Detalle */}
      <BottomModal
        isOpen={openDetalle}
        onClose={() => {
          setOpenDetalle(false);
          setCuentaSeleccionada(null);
          setAbonosDetalle([]);
        }}
      >
        <div className="modal-content">
          <div className="modal-header">
            <Eye size={24} />
            <div>
              <h3>Detalle de Cuenta</h3>
              {cuentaSeleccionada && (
                <p className="modal-subtitle">
                  {cuentaSeleccionada.cliente_nombre} - {cuentaSeleccionada.venta_folio}
                </p>
              )}
            </div>
          </div>

          {cuentaSeleccionada && (
            <div className="CuentasPorCobrar__detalle">
              <div className="info-grid">
                <div className="info-item">
                  <span className="label">Total:</span>
                  <span className="value">${cuentaSeleccionada.monto_total}</span>
                </div>
                <div className="info-item">
                  <span className="label">Pagado:</span>
                  <span className="value success">${cuentaSeleccionada.monto_pagado}</span>
                </div>
                <div className="info-item">
                  <span className="label">Saldo:</span>
                  <span className="value warning">${cuentaSeleccionada.saldo_pendiente}</span>
                </div>
                <div className="info-item">
                  <span className="label">Vencimiento:</span>
                  <span className="value">{new Date(cuentaSeleccionada.fecha_vencimiento).toLocaleDateString('es-DO')}</span>
                </div>
              </div>

              <h4>Historial de Abonos</h4>
              <DataTable
                columns={columnasAbonos}
                data={abonosDetalle}
                itemsPerPage={5}
              />
            </div>
          )}
        </div>
      </BottomModal>
    </div>
  );
};

export default CuentasPorCobrar;